const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

js = js.replace(/window\.showYearEndModal = function\(\) \{\s*alert\("Year end modal function called!"\);\s*/, "window.showYearEndModal = function() {\n  ");
js = js.replace(/window\.showSelectFinancialYearModal = function\(\) \{ alert\("Select FY modal function called"\);\s*/, "window.showSelectFinancialYearModal = function() {\n  ");
js = js.replace(/if \(\!activeCompanyId\) \{ alert\("NO ACTIVE COMPANY ID"\); return; \}/, "if (!activeCompanyId) return;");

fs.writeFileSync("src/main.js", js);
console.log("Removed debug alerts");
