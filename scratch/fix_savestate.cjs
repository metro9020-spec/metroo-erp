const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

js = js.replace(
  /localStorage\.setItem\(\`erp_company_data_\$\{activeId\}\`, dataStr\);/g,
  `localStorage.setItem(\`erp_company_data_\${activeId}_\${this.getActiveFyId()}\`, dataStr);`
);

fs.writeFileSync("src/state.js", js);
console.log("Fixed saveState to use fyId");
