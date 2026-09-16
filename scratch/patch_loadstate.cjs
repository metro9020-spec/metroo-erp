const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

const oldLoadState = `      let parsed = {};
      const stored = localStorage.getItem(\`erp_company_data_\${activeId}\`);
      if (stored) {
        parsed = JSON.parse(stored);
      }`;

const newLoadState = `      let parsed = {};
      const stored = localStorage.getItem(\`erp_company_data_\${activeId}\`);
      if (!stored) {
        console.warn("No local data found for company. Waiting for syncFromServer...");
        return;
      }
      if (stored) {
        parsed = JSON.parse(stored);
      }`;

js = js.replace(oldLoadState, newLoadState);
fs.writeFileSync("src/state.js", js);
console.log("Patched state.js loadState early return correctly");
