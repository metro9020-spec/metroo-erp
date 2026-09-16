const fs = require("fs");
let js = fs.readFileSync("src/views/cashBankBook.js", "utf8");

const replacement = `const accName = ledger ? ledger.name : null;
        if (String(e.accountId).toUpperCase() === String(accId).toUpperCase() || (accName && String(e.accountId).toUpperCase() === accName.toUpperCase())) {`;

js = js.replace(/if \(String\(e\.accountId\) === String\(accId\)\) \{/g, replacement);
fs.writeFileSync("src/views/cashBankBook.js", js);
console.log("Patched 3");
