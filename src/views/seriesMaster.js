import { state } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";

export function showSeriesMasterModal(container) {
  const root = document.getElementById("modal-container-root") || container;
  if (!root) return;

  const TX_TYPES = ["Purchase", "Sales", "Sales Return", "Purchase Return"];

  let selectedTxType = "Purchase";
  let editingSeries = null;
  let formBgColor = "#c8d8ee";

  function getLedgerOptions(selectedCode) {
    const ledgers = state.getLedgers() || [];
    const isPurchase = selectedTxType.toLowerCase().includes("purchase");
    
    let filtered = [];
    if (isPurchase) {
      filtered = ledgers.filter(l => (l.groupName || "").toUpperCase() === "PURCHASE ACCOUNT");
    } else {
      filtered = ledgers.filter(l => (l.groupName || "").toUpperCase() === "SALES ACCOUNT");
    }
    
    return filtered.map(l => `<option value="${l.code}" ${l.code === selectedCode ? 'selected' : ''}>${l.name}</option>`).join("");
  }

  function getSeriesForType() {
    return state.getSeriesMaster().filter(s => s.txType === selectedTxType);
  }

  function render() {
    const seriesList = getSeriesForType();

    root.innerHTML = `
      <div class="modal-overlay active" id="series-master-modal" style="display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.55); position:fixed; inset:0; z-index:9999;">
        <div style="background:#b0c4de; border:2px solid #3b629b; border-radius:4px; width:720px; max-width:98vw; max-height:95vh; display:flex; flex-direction:column; font-family:Tahoma,sans-serif; font-size:12px; box-shadow:0 8px 32px rgba(0,0,0,0.4); color:#000;">
          
          <!-- Classic Windows Title Bar -->
          <div style="background:linear-gradient(180deg,#1d4a88 0%, #366cb5 100%); color:#fff; font-weight:bold; font-size:12px; padding:4px 8px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #102a50;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-style:italic; font-family:serif; font-weight:900; font-size:14px; background:#fff; color:#1d4a88; border-radius:50%; width:16px; height:16px; display:inline-flex; justify-content:center; align-items:center;">e</span>
              SERIES MASTER
            </div>
            <div style="display:flex; gap:2px;">
              <button type="button" id="sm-win-min" style="width:18px; height:16px; background:#c0c0c0; border:1px solid #fff; border-right-color:#808080; border-bottom-color:#808080; font-size:9px; cursor:pointer; line-height:1;">_</button>
              <button type="button" id="sm-win-max" style="width:18px; height:16px; background:#c0c0c0; border:1px solid #fff; border-right-color:#808080; border-bottom-color:#808080; font-size:9px; cursor:pointer; line-height:1;">□</button>
              <button type="button" id="sm-win-close" style="width:18px; height:16px; background:#c0c0c0; border:1px solid #fff; border-right-color:#808080; border-bottom-color:#808080; font-size:9px; cursor:pointer; font-weight:bold; color:red; line-height:1;">✕</button>
            </div>
          </div>

          <!-- Body Container -->
          <div style="display:flex; flex:1; overflow:hidden; padding:10px; gap:10px; background:#c8d8ee;">
            
            <!-- Left Field Panel -->
            <div id="sm-left-panel" style="flex:0 0 330px; background:${formBgColor}; border:1px solid #8ca6c8; border-radius:3px; padding:12px; display:flex; flex-direction:column; gap:8px;">
              <div>
                <label style="font-weight:bold; display:block; margin-bottom:2px;">Transaction Type</label>
                <select id="sm-tx-type" style="width:100%; padding:3px; border:1px solid #7a95b8; background:#fff; font-size:12px;">
                  ${TX_TYPES.map(t => `<option value="${t}" ${t === selectedTxType ? "selected" : ""}>${t}</option>`).join("")}
                </select>
              </div>

              <div>
                <label style="font-weight:bold; display:block; margin-bottom:2px;">${selectedTxType} Type</label>
                <select id="sm-series-type" style="width:100%; padding:3px; border:1px solid #7a95b8; background:#fff; font-size:12px;">
                  <option value="LOCAL" ${editingSeries?.seriesType === "LOCAL" ? "selected" : ""}>LOCAL ${selectedTxType.toUpperCase()} (CGST+SGST)</option>
                  <option value="INTERSTATE" ${editingSeries?.seriesType === "INTERSTATE" ? "selected" : ""}>INTERSTATE/IGST</option>
                  <option value="NONTAXABLE" ${editingSeries?.seriesType === "NONTAXABLE" ? "selected" : ""}>NON TAXABLE</option>
                </select>
              </div>

              <div>
                <label style="font-weight:bold; display:block; margin-bottom:2px;">Series Name</label>
                <input type="text" id="sm-name" value="${editingSeries?.name || ""}" style="width:100%; padding:3px; border:1px solid #7a95b8; background:#fff; font-size:12px; box-sizing:border-box;">
              </div>

              <div style="display:flex; gap:8px;">
                <div style="flex:1;">
                  <label style="font-weight:bold; display:block; margin-bottom:2px;">Series Prefix</label>
                  <input type="text" id="sm-prefix" value="${editingSeries?.prefix || ""}" style="width:100%; padding:3px; border:1px solid #7a95b8; background:#fff; font-size:12px; box-sizing:border-box;">
                </div>
                <div style="width:90px;">
                  <label style="font-weight:bold; display:block; margin-bottom:2px;">No. of Digits</label>
                  <input type="number" id="sm-digits" value="${editingSeries?.digits ?? 4}" min="1" max="8" style="width:100%; padding:3px; border:1px solid #7a95b8; background:#fff; font-size:12px; box-sizing:border-box;">
                </div>
              </div>

              <div>
                <label style="font-weight:bold; display:block; margin-bottom:2px;">Series Starting Number</label>
                <input type="number" id="sm-start" value="${editingSeries?.startingNumber ?? 1}" min="1" style="width:100%; padding:3px; border:1px solid #7a95b8; background:#fff; font-size:12px; box-sizing:border-box;">
              </div>

              <div>
                <label style="font-weight:bold; display:block; margin-bottom:2px;">Posting Ledger</label>
                <select id="sm-ledger" style="width:100%; padding:3px; border:1px solid #7a95b8; background:#fff; font-size:12px;">
                  <option value="">-- Auto Create --</option>
                  ${getLedgerOptions(editingSeries?.ledgerCode)}
                </select>
              </div>

              <div style="margin-top:20px;">
                <label style="font-weight:bold; display:block; margin-bottom:2px;">Form Background Colour</label>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="text" id="sm-bgcolor-text" value="${formBgColor}" style="flex:1; padding:3px; border:1px solid #7a95b8; background:#e0e8f5; font-size:11px; box-sizing:border-box;" readonly>
                  <input type="color" id="sm-bgcolor-picker" value="${formBgColor}" style="width:26px; height:24px; border:1px solid #7a95b8; cursor:pointer; padding:0;">
                  <a href="#" id="sm-default-color" style="color:#0000ee; text-decoration:underline; font-weight:bold; font-size:11px; margin-left:4px;">Default Colour</a>
                </div>
              </div>
            </div>

            <!-- Right Series List Panel -->
            <div style="flex:1; display:flex; flex-direction:column; background:#fff; border:1px solid #8ca6c8; border-radius:2px;">
              <div style="background:linear-gradient(180deg,#2b5993 0%, #4477b9 100%); color:#fff; font-weight:bold; text-align:center; padding:4px; font-size:12px; letter-spacing:0.5px;">
                Series List
              </div>
              <div id="sm-series-list" style="flex:1; overflow-y:auto; padding:4px;">
                ${seriesList.length === 0
                  ? `<div style="padding:15px; color:#777; font-style:italic;">No series defined</div>`
                  : seriesList.map(s => `
                    <div data-series-id="${s.id}" class="sm-series-row" style="padding:4px 8px; font-weight:bold; font-size:12px; cursor:pointer; background:${editingSeries?.id === s.id ? "#0284c7" : "transparent"}; color:${editingSeries?.id === s.id ? "#fff" : "#000"};">
                      ${s.name}
                    </div>
                  `).join("")
                }
              </div>
            </div>

          </div>

          <!-- Bottom Action Buttons Ribbon -->
          <div style="display:flex; justify-content:flex-end; gap:4px; padding:6px 10px; background:#b4c6e0; border-top:1px solid #8ca6c8; align-items:center;">
            <button type="button" id="sm-btn-resequence" style="min-width:140px; padding:4px 12px; font-weight:bold; background:#e0f2fe; border:1px solid #0284c7; color:#0369a1; border-radius:2px; cursor:pointer;" title="Re-adjust and fill skipped numbers sequentially for all series">Fill Skipped Numbers</button>
            <button type="button" id="sm-btn-new" style="min-width:75px; padding:4px 12px; font-weight:bold; background:#dce6f2; border:1px solid #6b8cb6; border-radius:2px; cursor:pointer;"><u>N</u>ew</button>
            <button type="button" id="sm-btn-save" style="min-width:75px; padding:4px 12px; font-weight:bold; background:#dce6f2; border:1px solid #6b8cb6; border-radius:2px; cursor:pointer;"><u>S</u>ave</button>
            <button type="button" id="sm-btn-delete" style="min-width:75px; padding:4px 12px; font-weight:bold; background:#dce6f2; border:1px solid #6b8cb6; border-radius:2px; cursor:pointer;"><u>D</u>elete</button>
            <button type="button" id="sm-btn-close" style="min-width:75px; padding:4px 12px; font-weight:bold; background:#dce6f2; border:1px solid #6b8cb6; border-radius:2px; cursor:pointer;"><u>C</u>lose</button>
          </div>

        </div>
      </div>
    `;

    bindEvents();
    const winBox = root.querySelector("#series-master-modal > div");
    const headerBar = winBox ? winBox.firstElementChild : null;
    if (winBox && headerBar) makeDraggable(winBox, headerBar);
  }

  function bindEvents() {
    const close = () => { root.innerHTML = ""; };

    document.getElementById("sm-win-close")?.addEventListener("click", close);
    document.getElementById("sm-btn-close")?.addEventListener("click", close);

    // Transaction Type Change
    document.getElementById("sm-tx-type")?.addEventListener("change", e => {
      selectedTxType = e.target.value;
      editingSeries = null;
      render();
    });

    // Subtype Change auto-fills Series Name & auto-selects matching Posting Ledger
    document.getElementById("sm-series-type")?.addEventListener("change", e => {
      const typeVal = e.target.value;
      const nameInput = document.getElementById("sm-name");
      const ledgerSelect = null;
      const isPurchase = selectedTxType.toLowerCase().includes("purchase");
      
      if (nameInput) {
        if (typeVal === "INTERSTATE") nameInput.value = isPurchase ? "INTERSTATE/IGST PURCHASE" : "IGST SALES";
        else if (typeVal === "NONTAXABLE") nameInput.value = isPurchase ? "NON TAXABLE PURCHASE" : "NON TAXABLE SALES";
        else nameInput.value = isPurchase ? "LOCAL PURCHASE (CGST+SGST)" : "LOCAL SALES (CGST+SGST)";
      }

      
    });

    // New Button
    document.getElementById("sm-btn-new")?.addEventListener("click", () => {
      editingSeries = null;
      render();
    });

    // Save Button
    document.getElementById("sm-btn-save")?.addEventListener("click", () => {
      const seriesType = document.getElementById("sm-series-type")?.value || "LOCAL";
      const name = document.getElementById("sm-name")?.value.trim() || (seriesType === "INTERSTATE" ? "INTERSTATE/IGST" : (seriesType === "NONTAXABLE" ? "NON TAXABLE" : `LOCAL ${selectedTxType.toUpperCase()} (CGST+SGST)`));
      const prefix = document.getElementById("sm-prefix")?.value.trim();
      const digits = parseInt(document.getElementById("sm-digits")?.value) || 4;
      const startingNumber = parseInt(document.getElementById("sm-start")?.value) || 1;
      const ledgerCode = document.getElementById("sm-ledger")?.value || "";

      const allSeries = state.getSeriesMaster() || [];
      const cleanPrefix = (prefix || "").trim().toUpperCase();
      if (cleanPrefix) {
        const prefixConflict = allSeries.find(s => 
          String(s.prefix || "").trim().toUpperCase() === cleanPrefix && 
          s.id !== (editingSeries?.id || null)
        );
        
        if (prefixConflict) {
          alert(`A series with the prefix "${prefix}" already exists for ${prefixConflict.txType} ("${prefixConflict.name}")! Voucher prefixes must be unique across all series.`);
          return;
        }
      }

      const obj = {
        id: editingSeries?.id || null,
        txType: selectedTxType,
        seriesType,
        name,
        prefix,
        digits,
        startingNumber,
        currentNumber: editingSeries?.currentNumber || startingNumber,
        ledgerCode,
        bgColor: formBgColor
      };

      editingSeries = state.saveSeries(obj);
      render();
    });

    // Delete Button
    document.getElementById("sm-btn-delete")?.addEventListener("click", () => {
      const targetSeriesId = editingSeries?.id;
      if (targetSeriesId) {
        const invoices = state.getInvoices() || [];
        const purchases = state.getPurchases() || [];
        const hasTransactionsForThisSeries = invoices.some(i => i.seriesId === targetSeriesId) ||
                                             purchases.some(p => p.seriesId === targetSeriesId);
        if (hasTransactionsForThisSeries) {
          alert("Error: You cannot delete this Series Master configuration because transactions have already been recorded using this series!");
          return;
        }
      }
      if (!editingSeries) {
        alert("Please select a series from the list to delete.");
        return;
      }
      if (confirm(`Are you sure you want to delete series "${editingSeries.name}"?`)) {
        state.deleteSeries(editingSeries.id);
        editingSeries = null;
        render();
      }
    });

    // Fill Skipped Numbers / Resequence Button
    document.getElementById("sm-btn-resequence")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to re-adjust all series numbers chronologically to fill skipped numbers?\n\nThis will re-sequence invoices continuously (e.g. LSL-0001, LSL-0002... B2B001, B2B002...) without any gaps.")) {
        state.resequenceSeriesVoucherNumbers(true);
        alert("Series numbers have been successfully re-adjusted without any skipped numbers!");
        render();
      }
    });

    // Series List Item Selection
    document.querySelectorAll(".sm-series-row").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-series-id");
        editingSeries = state.getSeriesMaster().find(s => s.id === id) || null;
        if (editingSeries && editingSeries.bgColor) {
          formBgColor = editingSeries.bgColor;
        }
        render();
      });
    });

    // Color picker
    const picker = document.getElementById("sm-bgcolor-picker");
    const textVal = document.getElementById("sm-bgcolor-text");
    const panel = document.getElementById("sm-left-panel");

    picker?.addEventListener("input", e => {
      formBgColor = e.target.value;
      if (textVal) textVal.value = formBgColor;
      if (panel) panel.style.background = formBgColor;
    });

    document.getElementById("sm-default-color")?.addEventListener("click", (e) => {
      e.preventDefault();
      formBgColor = "#c8d8ee";
      if (textVal) textVal.value = formBgColor;
      if (picker) picker.value = formBgColor;
      if (panel) panel.style.background = formBgColor;
    });
  }

  render();
}
