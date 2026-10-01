import { state, parseDateSafely } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";

export function showRearrangeBillsModal(initialSeriesId = null, container = null) {
  const root = document.getElementById("sub-modal-container-root") || document.getElementById("modal-container-root") || container || document.body;
  
  let selectedTxType = "Sales";
  let selectedSeriesId = initialSeriesId || "ALL";
  let excludeCancelled = true;

  // If initialSeriesId provided, find matching series to pre-select txType
  if (initialSeriesId && initialSeriesId !== "ALL") {
    const sObj = (state.getSeriesMaster() || []).find(s => String(s.id) === String(initialSeriesId));
    if (sObj) {
      selectedTxType = sObj.txType || "Sales";
    }
  }

  function render() {
    const allSeries = state.getSeriesMaster() || [];
    const filteredSeries = allSeries.filter(s => (s.txType || "").toLowerCase() === selectedTxType.toLowerCase());

    // Calculate current status stats
    let totalBillsCount = 0;
    let cancelledCount = 0;
    let seriesInfoText = "";

    let targetDocs = [];
    if (selectedTxType === "Purchase") targetDocs = state.getPurchases() || [];
    else if (selectedTxType === "Sales Return") targetDocs = state.getSalesReturns() || [];
    else if (selectedTxType === "Purchase Return") targetDocs = state.getPurchaseReturns() || [];
    else targetDocs = state.getInvoices() || [];

    if (selectedSeriesId !== "ALL") {
      const curSeries = allSeries.find(s => String(s.id) === String(selectedSeriesId));
      if (curSeries) {
        const prefixUpper = (curSeries.prefix || "").toUpperCase();
        targetDocs = targetDocs.filter(d => {
          if (d.seriesId && String(d.seriesId) === String(curSeries.id)) return true;
          if (!d.seriesId && prefixUpper) {
            const vno = String(d.voucherNo || d.refNo || d.id || "").toUpperCase();
            if (vno.startsWith(prefixUpper)) return true;
          }
          return false;
        });
        seriesInfoText = `Prefix: "${curSeries.prefix || ''}" | Starting No: ${curSeries.startingNumber || 1} | Digits: ${curSeries.digits || 4}`;
      } else {
        selectedSeriesId = "ALL";
        seriesInfoText = `All ${selectedTxType} Series combined`;
      }
    } else {
      seriesInfoText = `All ${selectedTxType} Series combined`;
    }

    totalBillsCount = targetDocs.length;
    cancelledCount = targetDocs.filter(d => d.isCancelled || d.isCanceled || String(d.status).toUpperCase() === "CANCELLED").length;

    root.innerHTML = `
      <div class="modal-overlay active blocking-modal" id="rearrange-bills-modal-overlay" style="display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,0.55); position:fixed; inset:0; z-index:2000000; pointer-events:auto;">
        <div class="modal-container window-container" style="background:#cbd5e1; border:2px solid #1e3a8a; border-radius:4px; width:640px; max-width:95vw; display:flex; flex-direction:column; font-family:'Segoe UI', Tahoma, sans-serif; font-size:12px; box-shadow:0 10px 40px rgba(0,0,0,0.4); color:#0f172a; pointer-events:auto; position:relative; z-index:2000001;">
          
          <!-- Windows Title Bar -->
          <div class="window-header modal-header" style="background:linear-gradient(180deg,#1e3a8a 0%, #3b82f6 100%); color:#fff; font-weight:bold; font-size:13px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1d4ed8; border-radius:2px 2px 0 0; cursor:move; user-select:none;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-arrow-down-1-9" style="color:#fde047;"></i>
              REARRANGE & RENUMBER BILLS IN ASCENDING ORDER
            </div>
            <button type="button" id="rb-win-close" style="background:none; border:none; color:white; font-size:16px; cursor:pointer; font-weight:bold; line-height:1; pointer-events:auto;">&times;</button>
          </div>

          <!-- Body Container -->
          <div style="padding:15px; display:flex; flex-direction:column; gap:12px; background:#cbd5e1; pointer-events:auto;">
            
            <div style="background:#eff6ff; border:1px solid #93c5fd; border-radius:4px; padding:10px; color:#1e3a8a; font-size:11.5px; line-height:1.4;">
              <i class="fa-solid fa-circle-info" style="color:#2563eb; margin-right:4px;"></i>
              <strong>Feature Info:</strong> Sorts all Sales & Purchase bills chronologically in <strong>Ascending Order</strong> by Date and re-assigns consecutive bill numbers <strong>without skipping any series numbers</strong> in any situation. Accounting double-entry transactions & stock ledgers will be automatically updated.
            </div>

            <fieldset style="border:1px solid #94a3b8; border-radius:4px; padding:12px; background:#f8fafc; display:flex; flex-direction:column; gap:10px;">
              <legend style="font-weight:bold; color:#1e3a8a; padding:0 6px; font-size:12px;">Series Selection</legend>
              
              <div style="display:flex; gap:10px;">
                <div style="flex:1;">
                  <label style="font-weight:bold; display:block; margin-bottom:4px;">Transaction Type:</label>
                  <select id="rb-tx-type" style="width:100%; padding:5px; border:1px solid #94a3b8; border-radius:3px; background:#fff; font-size:12px; font-weight:600; cursor:pointer;">
                    <option value="Sales" ${selectedTxType === "Sales" ? "selected" : ""}>Sales Bills (Invoices)</option>
                    <option value="Purchase" ${selectedTxType === "Purchase" ? "selected" : ""}>Purchase Bills</option>
                    <option value="Sales Return" ${selectedTxType === "Sales Return" ? "selected" : ""}>Sales Returns</option>
                    <option value="Purchase Return" ${selectedTxType === "Purchase Return" ? "selected" : ""}>Purchase Returns</option>
                  </select>
                </div>

                <div style="flex:1.5;">
                  <label style="font-weight:bold; display:block; margin-bottom:4px;">Select Series:</label>
                  <select id="rb-series" style="width:100%; padding:5px; border:1px solid #94a3b8; border-radius:3px; background:#fff; font-size:12px; font-weight:600; cursor:pointer;">
                    <option value="ALL" ${selectedSeriesId === "ALL" ? "selected" : ""}>-- ALL SERIES FOR ${selectedTxType.toUpperCase()} --</option>
                    ${filteredSeries.map(s => `
                      <option value="${s.id}" ${String(s.id) === String(selectedSeriesId) ? "selected" : ""}>
                        ${s.name} (Prefix: "${s.prefix || ''}")
                      </option>
                    `).join("")}
                  </select>
                </div>
              </div>

              <div style="font-size:11px; color:#475569; font-style:italic; margin-top:-2px;">
                ${seriesInfoText}
              </div>
            </fieldset>

            <fieldset style="border:1px solid #94a3b8; border-radius:4px; padding:12px; background:#f8fafc; display:flex; flex-direction:column; gap:8px;">
              <legend style="font-weight:bold; color:#1e3a8a; padding:0 6px; font-size:12px;">Rearrange & Sequence Rules</legend>
              
              <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
                <input type="checkbox" id="rb-sort-asc" checked disabled style="cursor:pointer;">
                <span>Sort all bills in Ascending Order by Date (Chronological sequence)</span>
              </label>

              <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
                <input type="checkbox" id="rb-renumber-no-skip" checked disabled style="cursor:pointer;">
                <span>Renumber bills consecutively starting from Series Start Number (No skipped numbers)</span>
              </label>

              <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer; color:#b91c1c;">
                <input type="checkbox" id="rb-exclude-cancelled" ${excludeCancelled ? 'checked' : ''} style="cursor:pointer;">
                <span>Purge/Remove Cancelled Bills to eliminate dead number gaps</span>
              </label>
            </fieldset>

            <!-- Live Status Box -->
            <div style="background:#e2e8f0; border:1px solid #cbd5e1; border-radius:4px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-weight:bold; display:block; color:#1e293b;">Bills Found in Series:</span>
                <span style="font-size:14px; font-weight:bold; color:#0369a1;">${totalBillsCount} Bill(s)</span>
                ${cancelledCount > 0 ? `<span style="color:#dc2626; font-weight:bold; font-size:11px; margin-left:8px;">(${cancelledCount} Cancelled)</span>` : ''}
              </div>

              <div style="text-align:right;">
                <span style="font-weight:bold; display:block; color:#1e293b;">Ascending Ordering:</span>
                <span style="font-size:13px; font-weight:bold; color:#15803d;">
                  Active & Sequential
                </span>
              </div>
            </div>

          </div>

          <!-- Bottom Action Buttons Ribbon -->
          <div style="display:flex; justify-content:flex-end; gap:8px; padding:10px 15px; background:#b4c6e0; border-top:1px solid #94a3b8; border-radius:0 0 2px 2px; pointer-events:auto;">
            <button type="button" id="rb-btn-execute" style="padding:6px 18px; font-weight:bold; background:#1e3a8a; color:#fff; border:1px solid #1e3a8a; border-radius:3px; cursor:pointer; display:flex; align-items:center; gap:6px; pointer-events:auto;">
              <i class="fa-solid fa-arrows-rotate"></i> Rearrange & Renumber Now
            </button>
            <button type="button" id="rb-btn-close" style="padding:6px 16px; font-weight:bold; background:#f1f5f9; color:#0f172a; border:1px solid #64748b; border-radius:3px; cursor:pointer; pointer-events:auto;">
              Cancel
            </button>
          </div>

        </div>
      </div>
    `;

    bindEvents();
    const winBox = root.querySelector("#rearrange-bills-modal-overlay > div");
    const headerBar = winBox ? winBox.firstElementChild : null;
    if (winBox && headerBar) makeDraggable(winBox, headerBar);
  }

  function bindEvents() {
    const close = () => { root.innerHTML = ""; };

    document.getElementById("rb-win-close")?.addEventListener("click", close);
    document.getElementById("rb-btn-close")?.addEventListener("click", close);

    document.getElementById("rb-tx-type")?.addEventListener("change", e => {
      selectedTxType = e.target.value;
      selectedSeriesId = "ALL";
      render();
    });

    document.getElementById("rb-series")?.addEventListener("change", e => {
      selectedSeriesId = e.target.value;
      render();
    });

    document.getElementById("rb-exclude-cancelled")?.addEventListener("change", e => {
      excludeCancelled = e.target.checked;
      render();
    });

    document.getElementById("rb-btn-execute")?.addEventListener("click", () => {
      const confirmMsg = `Are you sure you want to rearrange all ${selectedTxType} bills in ascending order for ${selectedSeriesId === "ALL" ? "all series" : "the selected series"}?\n\nBill numbers will be re-assigned sequentially without skipping any numbers.`;
      
      if (!confirm(confirmMsg)) return;

      const res = state.rearrangeBillsInSeries(selectedSeriesId === "ALL" ? "ALL" : selectedSeriesId, {
        excludeCancelled,
        txType: selectedTxType
      });

      if (res && res.success) {
        alert(`SUCCESS!\n\n${res.message}\n\nDetails:\n` + (res.details ? res.details.join("\n") : ""));
        close();
      } else {
        alert(`ERROR: ${res ? res.message : "Failed to rearrange bills."}`);
      }
    });
  }

  render();
}
