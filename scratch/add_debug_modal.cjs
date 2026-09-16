const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

js = js.replace(/window\.showYearEndModal = function\(\) \{/, `window.showYearEndModal = function() {
  alert("Inside showYearEndModal!");`);

js = js.replace(/if \(\!activeCompanyId\) return;/, `if (!activeCompanyId) { alert("NO COMPANY ID!"); return; }`);

fs.writeFileSync("src/main.js", js);
console.log("Added debug inside modal");
