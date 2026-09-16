const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const fyModalCode = `
window.showSelectFinancialYearModal = function() {
  const activeCompanyId = state.getActiveCompanyId();
  if (!activeCompanyId) return;
  const companies = state.getRegisteredCompanies();
  const comp = companies.find(c => c.id === activeCompanyId);
  if (!comp) return;

  const fyears = comp.financialYears || [{ id: "default", name: "Current Year", isCurrent: true }];
  const activeFyId = state.getActiveFyId();

  let html = \`
    <div class="modal-overlay" id="fy-modal-overlay" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999;">
      <div class="modal-content" style="background:var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 8px; width: 500px; max-width: 90vw; padding:0;">
        <div style="background:var(--primary-color); color:white; padding: 10px 15px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
          <span>SELECT ACCOUNTING PERIOD</span>
          <span id="fy-modal-close" style="cursor:pointer; font-size: 1.2rem;">&times;</span>
        </div>
        <div style="padding: 20px; display:flex; flex-wrap:wrap; gap: 15px; max-height: 400px; overflow-y:auto; justify-content: center;">
  \`;

  fyears.forEach(fy => {
    const isSelected = fy.id === activeFyId;
    const bg = isSelected ? "var(--primary-color)" : "transparent";
    const color = isSelected ? "white" : "var(--text-primary)";
    const border = isSelected ? "2px solid var(--accent-color)" : "1px solid var(--border-color)";
    
    html += \`
      <div class="fy-card" data-id="\${fy.id}" style="width: 120px; padding: 15px 5px; text-align: center; border: \${border}; background: \${bg}; color: \${color}; cursor: pointer; border-radius: 5px; transition: 0.2s;">
        <i class="fa-solid fa-book" style="font-size: 2.5rem; color: \${isSelected ? "white" : "var(--danger-color)"}; margin-bottom: 10px;"></i>
        <div style="font-size: 0.75rem; word-wrap: break-word; font-weight: \${isSelected ? "bold" : "normal"};">
          \${fy.name}
        </div>
      </div>
    \`;
  });

  html += \`
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

  document.getElementById("fy-modal-close").addEventListener("click", () => {
    root.innerHTML = "";
  });

  document.querySelectorAll(".fy-card").forEach(card => {
    card.addEventListener("click", async (e) => {
      const selectedFy = e.currentTarget.getAttribute("data-id");
      if (selectedFy !== activeFyId) {
        state.setActiveFyId(selectedFy);
        
        await state.syncFromServer();
        state.loadState(false);
        
        root.innerHTML = "";
        window.location.reload();
      } else {
        root.innerHTML = "";
      }
    });
  });
}
`;

js = js.replace(/window\.addEventListener\("keydown", \(e\) => \{/, `${fyModalCode}\nwindow.addEventListener("keydown", (e) => {`);

const keyBindStr = `
    if (e.key === "F3" && e.ctrlKey) {
      e.preventDefault();
      window.showSelectFinancialYearModal();
      return;
    }
`;

js = js.replace(/window\.addEventListener\("keydown", \(e\) => \{/, `window.addEventListener("keydown", (e) => {${keyBindStr}`);

fs.writeFileSync("src/main.js", js);
console.log("Added FY modal code and hotkey FOR REAL");
