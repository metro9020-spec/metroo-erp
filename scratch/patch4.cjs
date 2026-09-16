const fs = require("fs");
let js = fs.readFileSync("src/views/reports.js", "utf8");
js = js.replace(/targetEntry = tx\.entries\.find\(e => String\(e\.accountId\) === String\(ledger\.code\) \|\| String\(e\.accountId\) === String\(ledger\.name\)\);/g, `targetEntry = tx.entries.find(e => String(e.accountId).toUpperCase() === String(ledger.code).toUpperCase() || String(e.accountId).toUpperCase() === String(ledger.name).toUpperCase());`);
fs.writeFileSync("src/views/reports.js", js);
console.log("Patched 4");
