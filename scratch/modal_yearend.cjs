const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const yearEndModalCode = `
window.showYearEndModal = function() {
  const activeCompanyId = state.getActiveCompanyId();
  if (!activeCompanyId) return;

  let html = \`
    <div class="modal-overlay" id="yearend-modal-overlay" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999;">
      <div class="modal-content" style="background:var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 8px; width: 600px; max-width: 90vw; padding:0; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        <div style="background:var(--primary-color); color:white; padding: 12px 15px; font-weight:bold; font-size: 1.1rem; display:flex; justify-content:space-between; align-items:center;">
          <span>ACCOUNTING PERIOD ENDING</span>
          <span id="yearend-modal-close" style="cursor:pointer; font-size: 1.3rem;">&times;</span>
        </div>
        <div style="padding: 20px; color:var(--text-primary); font-size:0.9rem; line-height: 1.5;">
          <p style="margin-bottom: 10px;">Accounting Period Ending is the process of closing all transactions of the current Accounting Period and starting a new Accounting Period.</p>
          <p style="margin-bottom: 10px;">Closing balance of the Ledgers and Stock will be automatically transferred to the new Accounting Period as its opening balance. Note: Income and Expense ledgers will be reset to 0, and their Net Profit/Loss will be transferred to PROFIT & LOSS A/C.</p>
          
          <div style="margin: 20px 0; padding: 15px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 5px;">
            <label style="font-weight: bold; display: block; margin-bottom: 8px;">Select End Date of Current Financial Year:</label>
            <input type="date" id="yearend-end-date" class="form-control" style="width: 100%; padding: 8px; font-size: 1rem;" required />
          </div>

          <div style="font-weight: bold; margin-bottom: 5px;">Following are the Activities Performed while ending an Accounting Period:</div>
          <div style="border: 1px solid var(--border-color); background: white; color: black; max-height: 150px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background: #1e40af; color: white;">
                  <th style="padding: 5px; text-align: left; border: 1px solid #ccc;">Activity</th>
                  <th style="padding: 5px; text-align: left; border: 1px solid #ccc; width: 80px;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="padding: 4px; border: 1px solid #eee;">Calculation of Net Profit / Net Loss of the Current Accounting Period</td><td style="padding: 4px; border: 1px solid #eee;">Pending</td></tr>
                <tr><td style="padding: 4px; border: 1px solid #eee;">Transfering of Net Profit / Net Loss to the New Accounting Period</td><td style="padding: 4px; border: 1px solid #eee;">Pending</td></tr>
                <tr><td style="padding: 4px; border: 1px solid #eee;">Calculation of Closing Balance of All Ledgers</td><td style="padding: 4px; border: 1px solid #eee;">Pending</td></tr>
                <tr><td style="padding: 4px; border: 1px solid #eee;">Calculation of Closing Stock</td><td style="padding: 4px; border: 1px solid #eee;">Pending</td></tr>
                <tr><td style="padding: 4px; border: 1px solid #eee;">Transfering of Closing Stock to new Accounting Period as Opening Stock</td><td style="padding: 4px; border: 1px solid #eee;">Pending</td></tr>
                <tr><td style="padding: 4px; border: 1px solid #eee;">Resetting Voucher Numbers</td><td style="padding: 4px; border: 1px solid #eee;">Pending</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style="padding: 15px; border-top: 1px solid var(--border-color); display:flex; justify-content:center; gap: 15px; background: var(--bg-tertiary);">
          <button id="yearend-btn-start" style="padding: 8px 25px; font-weight:bold; cursor:pointer; background: #22c55e; color: white; border: 1px solid #16a34a; border-radius: 4px;">Start</button>
          <button id="yearend-btn-close" style="padding: 8px 25px; font-weight:bold; cursor:pointer; background: #ef4444; color: white; border: 1px solid #dc2626; border-radius: 4px;">Close</button>
        </div>
      </div>
    </div>
  \`;

  let root = document.getElementById("sub-modal-container-root");
  if(!root) {
    root = document.createElement("div");
    root.id = "sub-modal-container-root";
    document.body.appendChild(root);
  }
  root.innerHTML = html;

  const closeFn = () => { root.innerHTML = ""; };
  document.getElementById("yearend-modal-close").addEventListener("click", closeFn);
  document.getElementById("yearend-btn-close").addEventListener("click", closeFn);

  document.getElementById("yearend-btn-start").addEventListener("click", () => {
    const endDate = document.getElementById("yearend-end-date").value;
    if (!endDate) {
      alert("Please select the End Date of the Financial Year!");
      return;
    }
    
    // Formatting date string nicely
    const d = new Date(endDate);
    const formattedDate = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);
    const startStr = nextDay.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    
    const nextYear = new Date(nextDay);
    nextYear.setFullYear(nextDay.getFullYear() + 1);
    nextYear.setDate(nextYear.getDate() - 1);
    const endStr = nextYear.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const fyName = \`\${startStr} to \${endStr}\`;

    if (confirm(\`Are you sure you want to end the period on \${formattedDate}?\\nThis will automatically create a new Financial Year: "\\\${fyName}" and switch you to it.\`)) {
      document.querySelectorAll("#yearend-modal-overlay td:nth-child(2)").forEach(td => {
        td.textContent = "Done";
        td.style.color = "green";
        td.style.fontWeight = "bold";
      });
      
      const newFyId = "FY" + Date.now();
      const success = state.runYearEndProcess(newFyId, fyName);
      if (success) {
        setTimeout(() => {
          alert("Year Ending Process completed successfully! You are now in the new Financial Year.");
          window.location.reload();
        }, 800);
      } else {
        alert("Failed to run year-ending process.");
      }
    }
  });
}
`;

js = js.replace(/window\.showSelectFinancialYearModal = function\(\) \{/, `${yearEndModalCode}\nwindow.showSelectFinancialYearModal = function() {`);

// Now replace the menu-year-ending click listener
const oldMenuListener = `const yearEndBtn = document.getElementById("menu-year-ending");
    if (yearEndBtn) {
      yearEndBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const fyName = prompt("Enter the name for the new Financial Year (e.g., 01-Apr-2027 to 31-Mar-2028):\\nThis will close the current year and generate opening balances.");
        if (fyName && fyName.trim().length > 0) {
          if (confirm("Are you sure? This will create a new Financial Year and switch you to it immediately.")) {
            const newFyId = "FY" + Date.now();
            const success = state.runYearEndProcess(newFyId, fyName.trim());
            if (success) {
              alert("Year Ending Process completed successfully! You are now in the new Financial Year.");
              setTimeout(() => window.location.reload(), 1000);
            } else {
              alert("Failed to run year-ending process.");
            }
          }
        }
      });
    }`;

const newMenuListener = `const yearEndBtn = document.getElementById("menu-year-ending");
    if (yearEndBtn) {
      yearEndBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.showYearEndModal();
      });
    }`;

js = js.replace(oldMenuListener, newMenuListener);

fs.writeFileSync("src/main.js", js);
console.log("Patched main.js with year end modal");
