import { state } from "../state.js";

export function showClearDatabaseModal() {
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const activeCompanyId = state.getActiveCompanyId();
  if (!activeCompanyId) {
    alert("No active company found. Please log in first.");
    return;
  }

  const companies = state.getRegisteredCompanies();
  const company = companies.find(c => c.id === activeCompanyId);
  const companyName = company ? company.name : "CURRENT COMPANY";
  const fysList = company ? (company.financialYears || []) : [];
  const activeFyId = state.getActiveFyId();

  root.innerHTML = `
    <div class="modal-overlay active" id="clear-db-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(2px); z-index:2000;">
      <div class="modal-container" style="max-width:620px; width: 95%; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #b91c1c; border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #991b1b 0%, #dc2626 100%); color:white; padding:8px 14px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 4px 4px 0 0; border-bottom: 1px solid #7f1d1d;">
          <div style="display:flex; align-items:center; gap:8px; font-size:1rem;">
            <i class="fa-solid fa-trash-can"></i> CLEAR DATABASE & DATA PURGE - ${companyName}
          </div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.3rem; cursor:pointer;" id="clear-db-close-header">&times;</button>
        </div>

        <div style="padding:12px; background-color:#f8fafc; border:1px solid #94a3b8; border-top:none; border-radius:0 0 4px 4px;">
          <div style="background-color:#fee2e2; border-left:4px solid #ef4444; padding:8px 12px; font-size:0.8rem; color:#991b1b; font-weight:600; margin-bottom:12px;">
            <i class="fa-solid fa-triangle-exclamation"></i> Select the data categories or financial year you wish to permanently delete for <strong>${companyName}</strong>. This operation cannot be undone!
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:0 4px;">
            <label style="font-weight:700; font-size:0.8rem; color:#1e293b; display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" id="clear-db-select-all" style="cursor:pointer;"> SELECT ALL DATA CATEGORIES
            </label>
            <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Custom Data Purge Tool</span>
          </div>

          <form id="clear-db-form" style="display:flex; flex-direction:column; gap:8px; font-size:0.82rem;">
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              
              <!-- Column 1 -->
              <div style="background:#f1f5f9; padding:10px; border:1px solid #cbd5e1; border-radius:4px; display:flex; flex-direction:column; gap:8px;">
                <div style="font-weight:700; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; font-size:0.8rem;">
                  <i class="fa-solid fa-receipt"></i> TRANSACTIONS & VOUCHERS
                </div>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="sales" checked style="cursor:pointer;">
                  <span>Sales Invoices & Quotations</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="purchases" checked style="cursor:pointer;">
                  <span>Purchase Bills & Vouchers</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="returns" checked style="cursor:pointer;">
                  <span>Sales & Purchase Returns</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="vouchers" checked style="cursor:pointer;">
                  <span>Voucher Logs (Payment/Receipt/Journal)</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="stockAdjustments" checked style="cursor:pointer;">
                  <span>Stock Adjustments & Conversions</span>
                </label>
              </div>

              <!-- Column 2 -->
              <div style="background:#f1f5f9; padding:10px; border:1px solid #cbd5e1; border-radius:4px; display:flex; flex-direction:column; gap:8px;">
                <div style="font-weight:700; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; font-size:0.8rem;">
                  <i class="fa-solid fa-boxes-stacked"></i> MASTERS & REGISTRIES
                </div>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="products" style="cursor:pointer;">
                  <span>Product Master (Materials List)</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="contacts" style="cursor:pointer;">
                  <span>Customer & Vendor Profiles</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="openingBalances" style="cursor:pointer;">
                  <span style="font-weight:600; color:#1e3a8a;"><i class="fa-solid fa-scale-balanced text-primary"></i> Clear All Opening Balances (Ledgers, Customers & Vendors)</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="openingStock" style="cursor:pointer;">
                  <span style="font-weight:600; color:#059669;"><i class="fa-solid fa-boxes-packing text-success"></i> Clear Opening Stock (Product Stock & Batches)</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="influencers" style="cursor:pointer;">
                  <span>Influencers & Loyalty Redemptions</span>
                </label>

                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" class="clear-cb" value="series" style="cursor:pointer;">
                  <span>Invoice Series Counter Reset</span>
                </label>
              </div>

              <!-- Full Width Row: Financial Year Deletion -->
              <div style="grid-column: span 2; background:#fff1f2; padding:10px 12px; border:1px solid #fecdd3; border-radius:4px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700; color:#991b1b; font-size:0.82rem;">
                    <input type="checkbox" id="clear-cb-delete-fy" value="deleteFinancialYear" style="cursor:pointer; width:15px; height:15px; accent-color:#dc2626;">
                    <span><i class="fa-solid fa-calendar-xmark text-danger"></i> DELETE A FINANCIAL YEAR</span>
                  </label>
                  <span style="font-size:0.75rem; color:#b91c1c; font-weight:600;">
                    ${fysList.length > 1 ? `${fysList.length} Financial Years Available` : '1 Financial Year (Cannot be deleted)'}
                  </span>
                </div>

                <div id="clear-fy-select-container" style="display:none; flex-direction:column; gap:6px; padding:8px 10px; background:white; border:1px solid #fca5a5; border-radius:4px; margin-top:2px;">
                  <label for="clear-db-fy-select" style="font-size:0.75rem; color:#7f1d1d; font-weight:700;">
                    Select Financial Year to permanently delete:
                  </label>
                  <select id="clear-db-fy-select" style="padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82rem; width:100%; font-weight:600; color:#1e293b; background:#f8fafc;">
                    ${fysList.map(fy => `
                      <option value="${fy.id}" ${fy.id === activeFyId ? 'selected' : ''}>
                        ${state.getFyDisplayLabel(fy)} (${fy.startDate ? fy.startDate.split('-').reverse().join('/') : 'N/A'} to ${fy.endDate ? fy.endDate.split('-').reverse().join('/') : 'N/A'})${fy.id === activeFyId ? ' — [ACTIVE YEAR]' : ''}
                      </option>
                    `).join('')}
                  </select>
                  <div style="font-size:0.72rem; color:#b91c1c; font-weight:600;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Deleting this financial year will permanently erase its database file and remove it from the Financial Year list.
                  </div>
                </div>
              </div>

            </div>

            <!-- Warning notice footer -->
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #cbd5e1; padding-top:10px; margin-top:6px;">
              <span style="font-size:0.75rem; color:#475569; font-weight:600;">
                <i class="fa-solid fa-shield-halved text-primary"></i> Base System Ledgers & Account Groups will be preserved.
              </span>

              <div style="display:flex; gap:8px;">
                <button type="button" class="btn" id="btn-clear-db-cancel" style="background:#e2e8f0; border:1px solid #64748b; padding:5px 16px; font-weight:bold; color:#0f172a; cursor:pointer; font-size:0.8rem; border-radius:3px;">Cancel</button>
                <button type="submit" class="btn" style="background:#dc2626; border:1px solid #991b1b; padding:5px 18px; font-weight:bold; color:white; cursor:pointer; font-size:0.8rem; border-radius:3px;">PURGE SELECTED DATA</button>
              </div>
            </div>

          </form>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("clear-db-modal-overlay");
  const close = () => {
    if (overlay) overlay.remove();
  };

  document.getElementById("clear-db-close-header").addEventListener("click", close);
  document.getElementById("btn-clear-db-cancel").addEventListener("click", close);

  // Financial Year checkbox & toggle
  const deleteFyCb = document.getElementById("clear-cb-delete-fy");
  const fySelectContainer = document.getElementById("clear-fy-select-container");
  const fySelectEl = document.getElementById("clear-db-fy-select");

  if (deleteFyCb) {
    deleteFyCb.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (fysList.length <= 1) {
          alert("Cannot delete the only financial year! A company must have at least one financial year. If you wish to wipe its transactional data, select the transaction categories above instead.");
          e.target.checked = false;
          return;
        }
        if (fySelectContainer) fySelectContainer.style.display = "flex";
      } else {
        if (fySelectContainer) fySelectContainer.style.display = "none";
      }
    });
  }

  // Select all checkbox handler for category checkboxes
  const selectAllCb = document.getElementById("clear-db-select-all");
  const categoryCheckboxes = Array.from(document.querySelectorAll(".clear-cb"));

  if (selectAllCb) {
    selectAllCb.addEventListener("change", (e) => {
      categoryCheckboxes.forEach(cb => {
        cb.checked = e.target.checked;
      });
    });
  }

  // Update Select All state when individual checkboxes are clicked
  categoryCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      selectAllCb.checked = categoryCheckboxes.every(c => c.checked);
    });
  });

  // Form submit handler
  document.getElementById("clear-db-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const isDeleteFyChecked = deleteFyCb && deleteFyCb.checked;
    const selectedFyId = fySelectEl ? fySelectEl.value : null;
    const selectedFyObj = fysList.find(f => String(f.id) === String(selectedFyId));

    const selectedKeys = categoryCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

    if (selectedKeys.length === 0 && !isDeleteFyChecked) {
      alert("Please select at least one data category or a financial year to delete.");
      return;
    }

    // Confirmation for Financial Year Deletion
    if (isDeleteFyChecked) {
      if (fysList.length <= 1) {
        alert("Cannot delete the only financial year! A company must have at least one financial year.");
        return;
      }
      if (!selectedFyObj) {
        alert("Please select a valid financial year to delete.");
        return;
      }

      const fyLabel = state.getFyDisplayLabel(selectedFyObj);
      const confirmFyMsg = `CRITICAL CONFIRMATION:\n\nAre you sure you want to PERMANENTLY DELETE the Financial Year "${fyLabel}" (${selectedFyObj.startDate} to ${selectedFyObj.endDate}) for "${companyName.toUpperCase()}"?\n\nThis will completely remove this financial year and its database file from the system!`;
      
      if (!confirm(confirmFyMsg)) {
        return;
      }
    }

    // Confirmation for Category Purge
    if (selectedKeys.length > 0) {
      const confirmMsg = `ARE YOU SURE YOU WANT TO PERMANENTLY PURGE THE SELECTED DATA CATEGORIES (${selectedKeys.length} CATEGORIES) FOR "${companyName.toUpperCase()}"?\n\nTHIS ACTION CANNOT BE UNDONE!`;
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    try {
      if (selectedKeys.length > 0) {
        state.clearSelectedCompanyData(selectedKeys);
      }

      if (isDeleteFyChecked && selectedFyId) {
        const fyRes = state.deleteFinancialYear(activeCompanyId, selectedFyId);
        if (!fyRes.success) {
          alert(`Failed to delete Financial Year: ${fyRes.message}`);
          return;
        }
      }

      alert(`Operation completed successfully for ${companyName}.`);
      close();
      window.location.hash = "";
      window.location.reload();
    } catch (err) {
      alert(`Error clearing database: ${err.message}`);
    }
  });
}
