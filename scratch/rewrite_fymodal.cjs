const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const regex = /window\.showSelectFinancialYearModal = function\(\) \{[\s\S]*?(?=window\.addEventListener\("keydown", \(e\) => \{)/;
const newCode = `window.showSelectFinancialYearModal = function() {
  try {
    const activeCompanyId = state.getActiveCompanyId();
    if (!activeCompanyId) { alert("NO ACTIVE COMPANY ID"); return; }
    const companies = state.getRegisteredCompanies();
    const comp = companies.find(c => c.id === activeCompanyId);
    if (!comp) return;

    const fyears = comp.financialYears || [{ id: "default", name: "Current Year", isCurrent: true }];
    const activeFyId = state.getActiveFyId();

    let root = document.getElementById("sub-modal-container-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "sub-modal-container-root";
      root.style.position = "fixed";
      root.style.top = "0";
      root.style.left = "0";
      root.style.zIndex = "999999999"; 
      root.style.pointerEvents = "none";
      document.body.appendChild(root);
    }

    let html = \`
      <div class="modal-overlay" id="fy-modal-overlay" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999999; pointer-events:auto;">
        <div class="modal-content" style="background:var(--bg-secondary, white); border: 2px solid var(--border-color, #ccc); border-radius: 8px; width: 500px; max-width: 90vw; padding:0;">
          <div style="background:var(--primary-color, #1e3b8b); color:white; padding: 10px 15px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
            <span>SELECT ACCOUNTING PERIOD</span>
            <span id="fy-modal-close" style="cursor:pointer; font-size: 1.2rem;">&times;</span>
          </div>
          <div style="padding: 20px; display:flex; flex-wrap:wrap; gap: 15px; max-height: 400px; overflow-y:auto; justify-content: center;">
    \`;

    fyears.forEach(fy => {
      const isSelected = fy.id === activeFyId;
      const borderStyle = isSelected ? "border: 2px solid var(--success-color, green);" : "border: 1px solid var(--border-color, #ccc);";
      const bgStyle = isSelected ? "background: #f0fdf4;" : "background: var(--bg-tertiary, #f0f0f0);";
      html += \`
        <div class="fy-card" data-id="\${fy.id}" style="padding: 15px; border-radius: 6px; cursor: pointer; text-align: center; width: 200px; \${borderStyle} \${bgStyle} box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 5px; color: var(--text-primary, black);">\${fy.name}</div>
          \${isSelected ? \`<div style="font-size: 0.8rem; color: var(--success-color, green); font-weight: bold;"><i class="fa-solid fa-check"></i> Active</div>\` : ""}
        </div>
      \`;
    });

    html += \`
          </div>
        </div>
      </div>
    \`;

    root.innerHTML = html;

    const closeBtn = document.getElementById("fy-modal-close");
    if (closeBtn) {
      closeBtn.onclick = function() { root.innerHTML = ""; };
    }

    const cards = document.querySelectorAll(".fy-card");
    for (let i = 0; i < cards.length; i++) {
      cards[i].onclick = function() {
        const id = this.getAttribute("data-id");
        state.setActiveFyId(id);
        window.location.reload();
      };
    }
  } catch(e) {
    alert("Error inside showSelectFinancialYearModal: " + e.message);
  }
};
`;

js = js.replace(regex, newCode);
fs.writeFileSync("src/main.js", js);
console.log("Rewrote showSelectFinancialYearModal safely");

