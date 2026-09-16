const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const bindSelectFyCode = `
  const selectFyBtn = document.getElementById("menu-select-fy");
  if (selectFyBtn) {
    selectFyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.showSelectFinancialYearModal) {
        window.showSelectFinancialYearModal();
      }
    });
  }
`;

js = js.replace(`  const backupBtn = document.getElementById("menu-backup");`, `${bindSelectFyCode}\n  const backupBtn = document.getElementById("menu-backup");`);

fs.writeFileSync("src/main.js", js);
console.log("Patched main.js with Utilities menu binding");
