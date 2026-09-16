import { state } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";

export function showYearEndingModal() {
  let root = document.getElementById("modal-container-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "modal-container-root";
    document.body.appendChild(root);
  }

  const activeCompanyId = state.getActiveCompanyId();
  if (!activeCompanyId) {
    alert("Please log in and select a company first.");
    return;
  }

  const companies = state.getRegisteredCompanies();
  const company = companies.find(c => String(c.id) === String(activeCompanyId));
  if (!company) {
    alert("Company not found.");
    return;
  }

  const activeFyId = state.getActiveFyId();
  const currentFy = (company.financialYears || []).find(fy => String(fy.id) === String(activeFyId)) || {
    name: "Current F.Y",
    startDate: company.financialYearStarts || "2026-04-01",
    endDate: company.financialYearEnds || "2027-03-31"
  };

  // Calculate default dates for the ending of current financial year and start of next financial year
  let defaultCurrentEnd = currentFy.endDate && currentFy.endDate !== "N/A" ? currentFy.endDate : new Date().toISOString().split("T")[0];
  
  const getNextYearDates = (endVal) => {
    try {
      const parts = endVal.split("-").map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      dateObj.setDate(dateObj.getDate() + 1);
      
      const startYear = dateObj.getFullYear();
      const startMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const startDate = String(dateObj.getDate()).padStart(2, '0');
      const nextStart = `${startYear}-${startMonth}-${startDate}`;
      
      const currEndObj = new Date(parts[0], parts[1] - 1, parts[2]);
      currEndObj.setFullYear(currEndObj.getFullYear() + 1);
      const endYear = currEndObj.getFullYear();
      const endMonth = String(currEndObj.getMonth() + 1).padStart(2, '0');
      const endDateNum = String(currEndObj.getDate()).padStart(2, '0');
      const nextEnd = `${endYear}-${endMonth}-${endDateNum}`;
      const nextName = "Current F.Y";
      return { nextStart, nextEnd, nextName };
    } catch {
      return { nextStart: "2027-04-01", nextEnd: "2028-03-31", nextName: "Current F.Y" };
    }
  };

  const defaults = getNextYearDates(defaultCurrentEnd);
  let defaultNextStart = defaults.nextStart;
  let defaultNextEnd = defaults.nextEnd;
  let defaultNextName = defaults.nextName;

  const fysList = company.financialYears || [];
  const currentIndex = fysList.findIndex(fy => String(fy.id) === String(activeFyId));
  const isLatestYear = currentIndex === -1 || currentIndex === fysList.length - 1;
  const isNotFirstYear = currentIndex > 0;

  root.innerHTML = `
    <div class="modal-overlay active" id="ye-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container" style="max-width:500px; width: 90%; background-color:#f8fafc; color:#0f172a; padding: 20px; border:2px solid #1e3a8a; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:8px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 4px; margin-bottom: 15px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-calendar-check"></i> YEAR ENDING PROCESS & MANAGEMENT
          </div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.4rem; cursor:pointer;" id="ye-close-btn-header">&times;</button>
        </div>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 10px 12px; margin-bottom: 15px; font-size: 0.85rem;">
          <strong>Active Financial Year:</strong> ${currentFy.name} (${formatDate(currentFy.startDate)} to ${formatDate(currentFy.endDate)})
        </div>

        <!-- Case 1: Active year is a previous (already ended) financial year -->
        ${!isLatestYear ? `
          <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; background-color: #fff; margin-bottom: 15px;">
            <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 0.9rem; font-weight: 700; display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-share-from-square"></i> Update Closing Balances to Next FY
            </h4>
            <p style="font-size: 0.75rem; color: #475569; margin: 0 0 10px 0;">
              Since this financial year has ended, edits here will not automatically transfer. Click below to push and update the next financial year's opening balances and stocks with the current closing figures.
            </p>
            <button type="button" id="ye-btn-update-next-balances" style="background:#10b981; border:none; color:white; padding:6px 12px; font-weight:bold; font-size:0.8rem; border-radius:4px; cursor:pointer; width:100%;">
              Update Closing Balances to Next FY
            </button>
          </div>
        ` : ''}

        <!-- Case 2: Active year is the current/latest financial year -->
        ${isLatestYear ? `
          <!-- Section 1: Update Opening Balances from Last Year (if not first year) -->
          ${isNotFirstYear ? `
            <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; background-color: #fff; margin-bottom: 15px;">
              <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 0.9rem; font-weight: 700; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-sync"></i> Re-sync Opening Balances
              </h4>
              <p style="font-size: 0.75rem; color: #475569; margin: 0 0 10px 0;">
                If you modified voucher entries in the previous year, click the button below to update the current year's opening ledger balances and material stock levels.
              </p>
              <button type="button" id="ye-btn-update-balances" style="background:#3b82f6; border:none; color:white; padding:6px 12px; font-weight:bold; font-size:0.8rem; border-radius:4px; cursor:pointer; width:100%;">
                Update Opening Balances from Last Year
              </button>
            </div>
          ` : ''}

          <!-- Section 2: Create New Financial Year -->
          <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; background-color: #fff;">
            <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 0.9rem; font-weight: 700; display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-plus-circle"></i> Create New Financial Year
            </h4>
            <p style="font-size: 0.75rem; color: #475569; margin: 0 0 10px 0;">
              This will create a new separate database for the next year. All material master items, ledger configurations, and contacts will carry forward with their closing stocks/balances as opening stock/balances.
            </p>

            <form id="ye-create-form" style="display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; flex-direction:column; gap:4px;">
                <label style="font-size: 0.75rem; font-weight: 600; color: #334155;">Ending Date of Current Financial Year *</label>
                <input type="date" id="ye-current-end" value="${defaultCurrentEnd}" required style="padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; width:100%; box-sizing:border-box;">
              </div>

              <div style="display:flex; flex-direction:column; gap:4px;">
                <label style="font-size: 0.75rem; font-weight: 600; color: #334155;">New Financial Year Name</label>
                <input type="text" id="ye-next-name" value="${defaultNextName}" required placeholder="e.g. FY 2027-28" style="padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; width:100%; box-sizing:border-box;">
              </div>

              <div style="display:flex; gap:10px;">
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size: 0.75rem; font-weight: 600; color: #334155;">New FY Starts On</label>
                  <input type="date" id="ye-next-start" value="${defaultNextStart}" readonly required style="padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; width:100%; box-sizing:border-box; background-color: #f1f5f9; color: #64748b;">
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size: 0.75rem; font-weight: 600; color: #334155;">New FY Ends On</label>
                  <input type="date" id="ye-next-end" value="${defaultNextEnd}" required style="padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; width:100%; box-sizing:border-box;">
                </div>
              </div>

              <button type="submit" style="background:#10b981; border:none; color:white; padding:6px 12px; font-weight:bold; font-size:0.8rem; border-radius:4px; cursor:pointer; width:100%; margin-top:5px;">
                End Current Year & Create New Year
              </button>
            </form>
          </div>
        ` : ''}

        <div style="display:flex; justify-content:flex-end; margin-top:15px;">
          <button type="button" id="ye-btn-close" style="background:#e2e8f0; border:1px solid #94a3b8; padding:5px 15px; color:#1e293b; font-size:0.8rem; font-weight:600; border-radius:4px; cursor:pointer;">Close</button>
        </div>
      </div>
    </div>
  `;

  const overlay = document.getElementById("ye-modal-overlay");
  const close = () => {
    overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("ye-close-btn-header").addEventListener("click", close);
  document.getElementById("ye-btn-close").addEventListener("click", close);

  if (!isLatestYear) {
    const updateNextBtn = document.getElementById("ye-btn-update-next-balances");
    if (updateNextBtn) {
      updateNextBtn.addEventListener("click", () => {
        const confirmUpdate = confirm("Are you sure you want to update the next financial year's opening balances and stocks with this year's closing values?");
        if (confirmUpdate) {
          const result = state.updateClosingBalancesToNextYear();
          if (result.success) {
            alert("Next financial year's opening balances and opening stocks successfully updated.");
            close();
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          } else {
            alert("Failed to update balances: " + result.message);
          }
        }
      });
    }
  }

  if (isLatestYear && isNotFirstYear) {
    document.getElementById("ye-btn-update-balances").addEventListener("click", () => {
      const confirmUpdate = confirm("Are you sure you want to sync/update opening balances and stocks from the previous financial year? This will overwrite the opening values of the current year.");
      if (confirmUpdate) {
        const result = state.updateOpeningBalancesFromPreviousYear();
        if (result.success) {
          alert("Opening balances and opening stocks successfully updated from the previous year.");
          close();
          // Force active view reload to display new opening values
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        } else {
          alert("Failed to update balances: " + result.message);
        }
      }
    });
  }

  if (isLatestYear) {
    const currentEndInput = document.getElementById("ye-current-end");
    const nextStartInput = document.getElementById("ye-next-start");
    const nextEndInput = document.getElementById("ye-next-end");
    const nextNameInput = document.getElementById("ye-next-name");

    if (currentEndInput) {
      const updateNextDates = () => {
        const endVal = currentEndInput.value;
        if (!endVal) return;
        
        const parts = endVal.split("-").map(Number);
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        dateObj.setDate(dateObj.getDate() + 1);
        
        const startYear = dateObj.getFullYear();
        const startMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const startDate = String(dateObj.getDate()).padStart(2, '0');
        const startStr = `${startYear}-${startMonth}-${startDate}`;
        nextStartInput.value = startStr;
        
        const currEndObj = new Date(parts[0], parts[1] - 1, parts[2]);
        currEndObj.setFullYear(currEndObj.getFullYear() + 1);
        const endYear = currEndObj.getFullYear();
        const endMonth = String(currEndObj.getMonth() + 1).padStart(2, '0');
        const endDateNum = String(currEndObj.getDate()).padStart(2, '0');
        nextEndInput.value = `${endYear}-${endMonth}-${endDateNum}`;
        nextNameInput.value = "Current F.Y";
      };

      currentEndInput.addEventListener("change", updateNextDates);
      currentEndInput.addEventListener("input", updateNextDates);
    }

    document.getElementById("ye-create-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("ye-next-name").value.trim();
      const start = document.getElementById("ye-next-start").value;
      const end = document.getElementById("ye-next-end").value;

      const confirmCreate = confirm(`Are you sure you want to end the current financial year and create a new financial year '${name}'?\nClosing stocks and ledger balances will be carried forward as opening values.`);
      if (confirmCreate) {
        const result = state.createNewFinancialYear(name, start, end);
        if (result.success) {
          alert(`Financial Year '${name}' created successfully. Switching database to the new year.`);
          state.setActiveFyId(result.newFy.id);
          state.loadState();
          close();
          
          // Update header indicator and reload current view
          const headerFys = document.getElementById("header-fy-select");
          if (headerFys) {
            // Re-render select options
            const companiesList = state.getRegisteredCompanies();
            const currCompany = companiesList.find(c => c.id === activeCompanyId);
            if (currCompany) {
              headerFys.innerHTML = "";
              (currCompany.financialYears || []).forEach(fy => {
                const opt = document.createElement("option");
                opt.value = fy.id;
                opt.textContent = state.getFyDisplayLabel(fy);
                if (fy.id === result.newFy.id) {
                  opt.selected = true;
                }
                headerFys.appendChild(opt);
              });
            }
          }
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        } else {
          alert("Failed to create new year: " + result.message);
        }
      }
    });
  }
}
