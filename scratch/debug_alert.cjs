const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

js = js.replace(/window\.showYearEndModal = function\(\) \{ alert\("Year end modal function called"\);/, `window.showYearEndModal = function() {
  alert("Year end modal function called!");`);

js = js.replace(/if \(\!activeCompanyId\) return;/, `if (!activeCompanyId) { alert("NO ACTIVE COMPANY ID"); return; }`);

fs.writeFileSync("src/main.js", js);
console.log("Patched debug alerts");
