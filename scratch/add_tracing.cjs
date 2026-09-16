const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const regex = /window\.showYearEndModal = function\(\) \{[\s\S]*?(?=window\.showSelectFinancialYearModal = function\(\))/;
const newCode = `window.showYearEndModal = function() {
  try {
    alert("1");
    const activeCompanyId = state.getActiveCompanyId();
    if (!activeCompanyId) { alert("NO ACTIVE COMPANY ID"); return; }
    
    alert("2");
    let root = document.getElementById("sub-modal-container-root");
    if (!root) {
      alert("3 - creating root");
      root = document.createElement("div");
      root.id = "sub-modal-container-root";
      root.style.position = "fixed";
      root.style.top = "0";
      root.style.left = "0";
      root.style.zIndex = "999999999"; // Ultra high z-index
      root.style.pointerEvents = "none";
      document.body.appendChild(root);
    } else {
      alert("3 - existing root found");
      root.style.position = "fixed";
      root.style.top = "0";
      root.style.left = "0";
      root.style.zIndex = "999999999"; // Ultra high z-index
    }
    
    alert("4");
    // Check if the html string is causing parsing issues
    let html = \`
      <div class="modal-overlay" id="yearend-modal-overlay" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999999; pointer-events:auto;">
        <div class="modal-content" style="background:var(--bg-secondary, white); border: 2px solid var(--border-color, #ccc); border-radius: 8px; width: 600px; max-width: 90vw; padding:0; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <div style="background:var(--primary-color, #1e3b8b); color:white; padding: 12px 15px; font-weight:bold; font-size: 1.1rem; display:flex; justify-content:space-between; align-items:center;">
            <span>ACCOUNTING PERIOD ENDING</span>
            <span id="yearend-modal-close" style="cursor:pointer; font-size: 1.3rem;">&times;</span>
          </div>
          <div style="padding: 20px; color:var(--text-primary, black); font-size:0.9rem; line-height: 1.5;">
            <p style="margin-bottom: 10px;">Accounting Period Ending is the process of closing all transactions of the current Accounting Period and starting a new Accounting Period.</p>
            <p style="margin-bottom: 10px;">Closing balance of the Ledgers and Stock will be automatically transferred to the new Accounting Period as its opening balance. Note: Income and Expense ledgers will be reset to 0, and their Net Profit/Loss will be transferred to PROFIT & LOSS A/C.</p>
            
            <div style="margin: 20px 0; padding: 15px; background: var(--bg-tertiary, #f0f0f0); border: 1px solid var(--border-color, #ccc); border-radius: 5px;">
              <label style="font-weight: bold; display: block; margin-bottom: 8px;">Select End Date of Current Financial Year:</label>
              <input type="date" id="yearend-end-date" class="form-control" style="width: 100%; padding: 8px; font-size: 1rem;" required />
            </div>

            <div style="font-weight: bold; margin-bottom: 5px;">Following are the Activities Performed while ending an Accounting Period:</div>
            <div style="border: 1px solid var(--border-color, #ccc); background: white; color: black; max-height: 150px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                  <tr style="background: #1e40af; color: white;">
                    <th style="padding: 5px; text-align: left; border: 1px solid #ccc;">Activity</th>
                    <th style="padding: 5px; text-align: center; border: 1px solid #ccc; width: 100px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style="padding: 5px; border: 1px solid #ccc;">Calculation of Net Profit</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center; color: gray;">Pending</td></tr>
                  <tr><td style="padding: 5px; border: 1px solid #ccc;">Transferring Net Profit/Loss to Profit & Loss A/C</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center; color: gray;">Pending</td></tr>
                  <tr><td style="padding: 5px; border: 1px solid #ccc;">Calculation of Closing Balance of Ledgers</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center; color: gray;">Pending</td></tr>
                  <tr><td style="padding: 5px; border: 1px solid #ccc;">Calculation of Closing Stock of Products</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center; color: gray;">Pending</td></tr>
                  <tr><td style="padding: 5px; border: 1px solid #ccc;">Transferring Closing Stock of Products</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center; color: gray;">Pending</td></tr>
                  <tr><td style="padding: 5px; border: 1px solid #ccc;">Resetting Voucher Numbers</td><td style="padding: 5px; border: 1px solid #ccc; text-align: center; color: gray;">Pending</td></tr>
                </tbody>
              </table>
            </div>
            
            <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
              <button id="yearend-btn-start" style="background: var(--warning-color, #f59e0b); color: white; border: none; padding: 8px 20px; font-weight: bold; border-radius: 4px; cursor: pointer;">Start</button>
              <button id="yearend-btn-close" style="background: #ef4444; color: white; border: none; padding: 8px 20px; font-weight: bold; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
          </div>
        </div>
      </div>
    \`;

    root.innerHTML = html;
    alert("5 - appended to root");

    // VERY SAFE EVENT BINDING
    const closeBtn = document.getElementById("yearend-modal-close");
    if (closeBtn) {
      closeBtn.onclick = function() { root.innerHTML = ""; };
    }
    const closeBtn2 = document.getElementById("yearend-btn-close");
    if (closeBtn2) {
      closeBtn2.onclick = function() { root.innerHTML = ""; };
    }
    
    // Pre-fill end date
    const ed = document.getElementById("yearend-end-date");
    if (ed) {
      const today = new Date();
      ed.value = today.toISOString().split("T")[0];
    }
    
    const startBtn = document.getElementById("yearend-btn-start");
    if (startBtn) {
      startBtn.onclick = function() {
        const edVal = document.getElementById("yearend-end-date").value;
        if (!edVal) { alert("Please select an end date."); return; }
        const endDate = new Date(edVal);
        const startStr = edVal.split("-").reverse().join("-");
        const nextYear = new Date(endDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const endStr = nextYear.toISOString().split("T")[0].split("-").reverse().join("-");
        const fyName = startStr + " to " + endStr;
        
        if (confirm("Are you sure you want to end the period?\\nThis creates FY: " + fyName)) {
          const tds = document.querySelectorAll("#yearend-modal-overlay td:nth-child(2)");
          for (let i = 0; i < tds.length; i++) {
            tds[i].textContent = "Done";
            tds[i].style.color = "green";
          }
          
          setTimeout(() => {
            const newFyId = "fy_" + Date.now();
            const success = state.runYearEndProcess(newFyId, fyName);
            if (success) {
              alert("Accounting Period Ending completed successfully!\\nSwitched to " + fyName);
              window.location.reload();
            } else {
              alert("Failed to run period ending process.");
            }
          }, 1000);
        }
      };
    }
  } catch(e) {
    alert("Error inside showYearEndModal: " + e.message);
  }
};
`;

js = js.replace(regex, newCode);
fs.writeFileSync("src/main.js", js);
console.log("Added tracing to showYearEndModal");

