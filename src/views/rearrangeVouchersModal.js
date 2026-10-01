import { state, toIsoDateStr } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";
import { formatDateDisplay } from "../utils/dateUtils.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";

export function showRearrangeVouchersModal(initialVoucherType = "receipt", container = null) {
  const root = document.getElementById("sub-modal-container-root") || document.getElementById("modal-container-root") || container || document.body;

  let selectedVoucherType = initialVoucherType || "receipt";
  let selectedDateScope = "current_fy";
  let customFromDate = state.getActiveFinancialYearStartDate ? state.getActiveFinancialYearStartDate() : "2026-04-01";
  let customToDate = state.getActiveFinancialYearEndDate ? state.getActiveFinancialYearEndDate() : "2027-03-31";
  
  const DEFAULT_PREFIXES = {
    receipt: "RC-",
    payment: "PM-",
    contra: "CO-",
    journal: "JV-",
    debit: "DN-",
    credit: "CN-",
    ALL: "AUTO"
  };

  let customPrefix = DEFAULT_PREFIXES[selectedVoucherType] || "RC-";
  let customStartingNumber = 1;
  let customDigits = 3;
  let hasUserChangedPrefix = false;
  let hasUserChangedDigits = false;

  function autoDetectSettingsForType(type) {
    if (type === "ALL") {
      return { prefix: "", digits: 3, start: 1 };
    }
    const defPrefix = DEFAULT_PREFIXES[type] || "V-";
    const preview = state.getVouchersForRearrange({
      voucherType: type,
      dateScope: selectedDateScope,
      fromDate: customFromDate,
      toDate: customToDate
    });

    if (preview && preview.length > 0) {
      const firstOld = preview[0].oldVoucherNo || "";
      const match = firstOld.match(/^([A-Za-z\-_]+)(\d+)$/);
      if (match) {
        return {
          prefix: match[1],
          digits: Math.max(match[2].length, 3),
          start: 1
        };
      }
    }
    return { prefix: defPrefix, digits: 3, start: 1 };
  }

  // Initial detection
  const detected = autoDetectSettingsForType(selectedVoucherType);
  customPrefix = detected.prefix;
  customDigits = detected.digits;
  customStartingNumber = detected.start;

  function render() {
    const activeFyStart = state.getActiveFinancialYearStartDate ? state.getActiveFinancialYearStartDate() : "2026-04-01";
    const activeFyEnd = state.getActiveFinancialYearEndDate ? state.getActiveFinancialYearEndDate() : "2027-03-31";
    const activeFyLabel = `${formatDateDisplay(activeFyStart)} to ${formatDateDisplay(activeFyEnd)}`;

    const previewList = state.getVouchersForRearrange({
      voucherType: selectedVoucherType,
      prefix: selectedVoucherType === "ALL" ? null : customPrefix,
      startingNumber: customStartingNumber,
      digits: customDigits,
      dateScope: selectedDateScope,
      fromDate: customFromDate,
      toDate: customToDate
    }) || [];

    const totalVouchersCount = previewList.length;

    let rangeInfo = "None";
    if (previewList.length > 0) {
      const first = previewList[0];
      const last = previewList[previewList.length - 1];
      rangeInfo = `${first.newVoucherNo} ➔ ${last.newVoucherNo}`;
    }

    root.innerHTML = `
      <div class="modal-overlay active blocking-modal" id="rearrange-vouchers-modal-overlay" style="display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,0.55); position:fixed; inset:0; z-index:2000000; pointer-events:auto;">
        <div class="modal-container window-container" style="background:#cbd5e1; border:2px solid #1e3a8a; border-radius:4px; width:720px; max-width:96vw; max-height:92vh; display:flex; flex-direction:column; font-family:'Segoe UI', Tahoma, sans-serif; font-size:12px; box-shadow:0 10px 40px rgba(0,0,0,0.4); color:#0f172a; pointer-events:auto; position:relative; z-index:2000001;">
          
          <!-- Windows Title Bar -->
          <div class="window-header modal-header" style="background:linear-gradient(180deg,#1e3a8a 0%, #3b82f6 100%); color:#fff; font-weight:bold; font-size:13px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1d4ed8; border-radius:2px 2px 0 0; cursor:move; user-select:none;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-arrow-down-1-9" style="color:#fde047;"></i>
              RESET / REARRANGE VOUCHER NUMBERS IN DATE ORDER
            </div>
            <button type="button" id="rv-win-close" style="background:none; border:none; color:white; font-size:16px; cursor:pointer; font-weight:bold; line-height:1; pointer-events:auto;">&times;</button>
          </div>

          <!-- Body Container -->
          <div style="padding:12px; display:flex; flex-direction:column; gap:10px; background:#cbd5e1; overflow-y:auto; max-height:calc(92vh - 95px); pointer-events:auto;">
            
            <div style="background:#eff6ff; border:1px solid #93c5fd; border-radius:4px; padding:8px 10px; color:#1e3a8a; font-size:11.5px; line-height:1.4;">
              <i class="fa-solid fa-circle-info" style="color:#2563eb; margin-right:4px;"></i>
              <strong>Feature Info:</strong> Chronologically sorts vouchers in <strong>Ascending Order by Date</strong> and re-assigns consecutive voucher numbers (e.g. 01/04/2026 gets <strong>RC-001</strong> and 02/04/2026 gets <strong>RC-002</strong>) without skipping numbers.
            </div>

            <!-- Configuration Grid -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              
              <!-- Left: Voucher Type & Scope -->
              <fieldset style="border:1px solid #94a3b8; border-radius:4px; padding:10px; background:#f8fafc; display:flex; flex-direction:column; gap:8px;">
                <legend style="font-weight:bold; color:#1e3a8a; padding:0 6px; font-size:12px;">Voucher Selection</legend>
                
                <div>
                  <label style="font-weight:bold; display:block; margin-bottom:3px;">Voucher Type:</label>
                  <select id="rv-voucher-type" style="width:100%; padding:4px; border:1px solid #94a3b8; border-radius:3px; background:#fff; font-size:12px; font-weight:600; cursor:pointer;">
                    <option value="receipt" ${selectedVoucherType === "receipt" ? "selected" : ""}>Receipt Vouchers (RC-)</option>
                    <option value="payment" ${selectedVoucherType === "payment" ? "selected" : ""}>Payment Vouchers (PM-)</option>
                    <option value="contra" ${selectedVoucherType === "contra" ? "selected" : ""}>Contra Vouchers (CO-)</option>
                    <option value="journal" ${selectedVoucherType === "journal" ? "selected" : ""}>Journal Entries (JV-)</option>
                    <option value="debit" ${selectedVoucherType === "debit" ? "selected" : ""}>Debit Notes (DN-)</option>
                    <option value="credit" ${selectedVoucherType === "credit" ? "selected" : ""}>Credit Notes (CN-)</option>
                    <option value="ALL" ${selectedVoucherType === "ALL" ? "selected" : ""}>-- ALL VOUCHER TYPES --</option>
                  </select>
                </div>

                <div>
                  <label style="font-weight:bold; display:block; margin-bottom:3px;">Date Scope:</label>
                  <select id="rv-date-scope" style="width:100%; padding:4px; border:1px solid #94a3b8; border-radius:3px; background:#fff; font-size:12px; font-weight:600; cursor:pointer;">
                    <option value="current_fy" ${selectedDateScope === "current_fy" ? "selected" : ""}>Active Financial Year (${activeFyLabel})</option>
                    <option value="all" ${selectedDateScope === "all" ? "selected" : ""}>All Dates & Years</option>
                    <option value="custom" ${selectedDateScope === "custom" ? "selected" : ""}>Custom Date Range</option>
                  </select>
                </div>

                ${selectedDateScope === "custom" ? `
                  <div style="display:flex; gap:8px; align-items:center; margin-top:2px;">
                    <div style="flex:1;">
                      <label style="font-weight:600; font-size:11px; display:block;">From Date:</label>
                      ${renderTallyDatePickerHtml({ id: "rv-from-date", value: customFromDate, style: "height:24px; padding:2px; font-size:0.8rem;", width: "100%" })}
                    </div>
                    <div style="flex:1;">
                      <label style="font-weight:600; font-size:11px; display:block;">To Date:</label>
                      ${renderTallyDatePickerHtml({ id: "rv-to-date", value: customToDate, style: "height:24px; padding:2px; font-size:0.8rem;", width: "100%" })}
                    </div>
                  </div>
                ` : ''}
              </fieldset>

              <!-- Right: Numbering Format -->
              <fieldset style="border:1px solid #94a3b8; border-radius:4px; padding:10px; background:#f8fafc; display:flex; flex-direction:column; gap:8px;">
                <legend style="font-weight:bold; color:#1e3a8a; padding:0 6px; font-size:12px;">Numbering Format</legend>
                
                <div>
                  <label style="font-weight:bold; display:block; margin-bottom:3px;">Voucher Prefix:</label>
                  <input type="text" id="rv-prefix" value="${customPrefix}" ${selectedVoucherType === "ALL" ? "disabled placeholder='Auto by Type'" : ""} style="width:100%; padding:4px; border:1px solid #94a3b8; border-radius:3px; background:#fff; font-size:12px; box-sizing:border-box;">
                </div>

                <div style="display:flex; gap:8px;">
                  <div style="flex:1;">
                    <label style="font-weight:bold; display:block; margin-bottom:3px;">Starting No:</label>
                    <input type="number" id="rv-start-num" min="1" value="${customStartingNumber}" style="width:100%; padding:4px; border:1px solid #94a3b8; border-radius:3px; background:#fff; font-size:12px; box-sizing:border-box;">
                  </div>
                  <div style="flex:1;">
                    <label style="font-weight:bold; display:block; margin-bottom:3px;">Digits (Padding):</label>
                    <input type="number" id="rv-digits" min="1" max="8" value="${customDigits}" style="width:100%; padding:4px; border:1px solid #94a3b8; border-radius:3px; background:#fff; font-size:12px; box-sizing:border-box;">
                  </div>
                </div>

                <div style="font-size:11px; color:#475569; font-style:italic; margin-top:2px;">
                  Example sequence: <strong>${(selectedVoucherType === "ALL" ? "RC-" : customPrefix) + String(customStartingNumber).padStart(customDigits, '0')}</strong>, <strong>${(selectedVoucherType === "ALL" ? "RC-" : customPrefix) + String(customStartingNumber + 1).padStart(customDigits, '0')}</strong>...
                </div>
              </fieldset>

            </div>

            <!-- Live Status Ribbon -->
            <div style="background:#e2e8f0; border:1px solid #cbd5e1; border-radius:4px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-weight:bold; display:block; color:#1e293b;">Vouchers Found:</span>
                <span style="font-size:13px; font-weight:bold; color:#0369a1;">${totalVouchersCount} Voucher(s)</span>
              </div>

              <div>
                <span style="font-weight:bold; display:block; color:#1e293b;">New Numbering Range:</span>
                <span style="font-size:12px; font-weight:bold; color:#15803d;">${rangeInfo}</span>
              </div>

              <div style="text-align:right;">
                <span style="font-weight:bold; display:block; color:#1e293b;">Sorting Order:</span>
                <span style="font-size:12px; font-weight:bold; color:#1e3a8a;">
                  <i class="fa-solid fa-arrow-down-short-wide"></i> Date (Ascending)
                </span>
              </div>
            </div>

            <!-- Live Preview Table -->
            <fieldset style="border:1px solid #94a3b8; border-radius:4px; padding:8px; background:#fff; display:flex; flex-direction:column; gap:4px;">
              <legend style="font-weight:bold; color:#1e3a8a; padding:0 6px; font-size:12px;">Live Rearrange Preview (Chronological Order)</legend>
              
              <div style="max-height:180px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:2px;">
                <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:left;">
                  <thead style="background:#1e3a8a; color:#fff; position:sticky; top:0; z-index:2;">
                    <tr>
                      <th style="padding:4px 6px; border:1px solid #3b82f6; width:35px; text-align:center;">#</th>
                      <th style="padding:4px 6px; border:1px solid #3b82f6; width:85px;">Date</th>
                      <th style="padding:4px 6px; border:1px solid #3b82f6; width:110px;">Current VNo</th>
                      <th style="padding:4px 6px; border:1px solid #3b82f6; width:110px; background:#15803d;">New VNo</th>
                      <th style="padding:4px 6px; border:1px solid #3b82f6;">Particulars / Description</th>
                      <th style="padding:4px 6px; border:1px solid #3b82f6; width:80px; text-align:right;">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${previewList.length === 0 ? `
                      <tr>
                        <td colspan="6" style="padding:16px; text-align:center; color:#64748b; font-style:italic;">
                          No vouchers found matching the selected type and date scope.
                        </td>
                      </tr>
                    ` : previewList.map((item, idx) => {
                      let amt = 0;
                      (item.entries || []).forEach(e => {
                        if (e.debit > amt) amt = e.debit;
                      });
                      const isChanged = item.oldVoucherNo !== item.newVoucherNo;
                      return `
                        <tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'}; border-bottom:1px solid #e2e8f0;">
                          <td style="padding:3px 6px; text-align:center; color:#64748b; font-weight:600;">${idx + 1}</td>
                          <td style="padding:3px 6px; font-weight:600; color:#1e293b;">${formatDateDisplay(item.date)}</td>
                          <td style="padding:3px 6px;">
                            <span style="background:#f1f5f9; color:#475569; padding:1px 5px; border-radius:3px; font-family:monospace; border:1px solid #cbd5e1;">${item.oldVoucherNo}</span>
                          </td>
                          <td style="padding:3px 6px;">
                            <span style="background:${isChanged ? '#dcfce7' : '#f1f5f9'}; color:${isChanged ? '#15803d' : '#475569'}; font-weight:bold; padding:1px 5px; border-radius:3px; font-family:monospace; border:1px solid ${isChanged ? '#86efac' : '#cbd5e1'};">
                              ${item.newVoucherNo} ${isChanged ? '✦' : ''}
                            </span>
                          </td>
                          <td style="padding:3px 6px; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;" title="${item.description || ''}">
                            ${item.description || item.type.toUpperCase()}
                          </td>
                          <td style="padding:3px 6px; text-align:right; font-weight:600; color:#0f172a;">${amt ? amt.toFixed(2) : '-'}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              </div>
            </fieldset>

          </div>

          <!-- Bottom Action Buttons Ribbon -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#b4c6e0; border-top:1px solid #94a3b8; border-radius:0 0 2px 2px; pointer-events:auto;">
            <div style="font-size:11px; color:#1e293b; font-weight:600;">
              ${totalVouchersCount > 0 ? `<i class="fa-solid fa-circle-check" style="color:#15803d;"></i> Ready to renumber ${totalVouchersCount} voucher(s)` : ''}
            </div>
            
            <div style="display:flex; gap:8px;">
              <button type="button" id="rv-btn-execute" ${totalVouchersCount === 0 ? "disabled" : ""} style="padding:6px 18px; font-weight:bold; background:${totalVouchersCount === 0 ? '#94a3b8' : '#1e3a8a'}; color:#fff; border:1px solid #1e3a8a; border-radius:3px; cursor:${totalVouchersCount === 0 ? 'not-allowed' : 'pointer'}; display:flex; align-items:center; gap:6px; pointer-events:auto;">
                <i class="fa-solid fa-arrows-rotate"></i> Reset Voucher Numbers Now
              </button>
              <button type="button" id="rv-btn-close" style="padding:6px 16px; font-weight:bold; background:#f1f5f9; color:#0f172a; border:1px solid #64748b; border-radius:3px; cursor:pointer; pointer-events:auto;">
                Cancel
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    bindEvents();
    const winBox = root.querySelector("#rearrange-vouchers-modal-overlay > div");
    const headerBar = winBox ? winBox.firstElementChild : null;
    if (winBox && headerBar) makeDraggable(winBox, headerBar);
  }

  function bindEvents() {
    const close = () => { root.innerHTML = ""; };

    document.getElementById("rv-win-close")?.addEventListener("click", close);
    document.getElementById("rv-btn-close")?.addEventListener("click", close);

    document.getElementById("rv-voucher-type")?.addEventListener("change", e => {
      selectedVoucherType = e.target.value;
      if (!hasUserChangedPrefix || selectedVoucherType === "ALL") {
        const det = autoDetectSettingsForType(selectedVoucherType);
        customPrefix = det.prefix;
        if (!hasUserChangedDigits) customDigits = det.digits;
        customStartingNumber = det.start;
      }
      render();
    });

    document.getElementById("rv-date-scope")?.addEventListener("change", e => {
      selectedDateScope = e.target.value;
      render();
    });

    document.getElementById("rv-from-date")?.addEventListener("change", e => {
      customFromDate = e.target.value;
      render();
    });

    document.getElementById("rv-to-date")?.addEventListener("change", e => {
      customToDate = e.target.value;
      render();
    });

    document.getElementById("rv-prefix")?.addEventListener("input", e => {
      hasUserChangedPrefix = true;
      customPrefix = e.target.value;
      render();
    });

    document.getElementById("rv-start-num")?.addEventListener("input", e => {
      customStartingNumber = parseInt(e.target.value) || 1;
      render();
    });

    document.getElementById("rv-digits")?.addEventListener("input", e => {
      hasUserChangedDigits = true;
      customDigits = parseInt(e.target.value) || 3;
      render();
    });

    initTallyDatePickers(root);

    document.getElementById("rv-btn-execute")?.addEventListener("click", () => {
      const typeLabel = selectedVoucherType === "ALL" ? "ALL voucher types" : `${selectedVoucherType.toUpperCase()} vouchers`;
      const confirmMsg = `Are you sure you want to reset and renumber ${typeLabel} in ascending chronological date order?\n\nVoucher numbers will be re-assigned sequentially without skipping any numbers.`;
      
      if (!confirm(confirmMsg)) return;

      const res = state.rearrangeVouchersByDate({
        voucherType: selectedVoucherType,
        prefix: selectedVoucherType === "ALL" ? null : customPrefix,
        startingNumber: customStartingNumber,
        digits: customDigits,
        dateScope: selectedDateScope,
        fromDate: customFromDate,
        toDate: customToDate
      });

      if (res && res.success) {
        alert(`SUCCESS!\n\n${res.message}\n\nDetails:\n` + (res.details ? res.details.join("\n") : ""));
        close();
        
        // Refresh active views if open
        const mainContent = document.getElementById("main-content") || document.getElementById("active-window");
        const activeHash = window.location.hash;
        if (activeHash === "#vouchers" && mainContent) {
          import("./vouchers.js").then(m => {
            if (m.refreshVoucherLogsOnly) m.refreshVoucherLogsOnly();
            else if (m.renderVouchers) m.renderVouchers(mainContent);
          });
        } else if (activeHash === "#search-vouchers" && mainContent) {
          import("./searchVouchers.js").then(m => {
            if (m.renderSearchVouchers) m.renderSearchVouchers(mainContent);
          });
        }
      } else {
        alert(`ERROR: ${res ? res.message : "Failed to reset voucher numbers."}`);
      }
    });
  }

  render();
}
