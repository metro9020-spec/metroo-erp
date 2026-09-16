const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

js = js.replace(/} else if \(inv\.payMode === "Bank"\) \{\s*const bankL = this\.ledgers\.find\(l => l\.groupName === "BANK ACCOUNTS" \|\| l\.name\.toUpperCase\(\)\.includes\("BANK"\)\);\s*debitAccount = bankL \? bankL\.name : "BANK CURRENT ACCOUNT";\s*\}/g,
`} else if (inv.payMode === "Bank") {
        const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
        debitAccount = bankL ? bankL.name : "BANK CURRENT ACCOUNT";
      } else if (inv.payMode && inv.payMode !== "Credit" && inv.payMode !== "Cash") {
        debitAccount = inv.payMode;
      }`);

js = js.replace(/} else if \(invoiceData\.payMode === "Bank"\) \{\s*const bankL = this\.ledgers\.find\(l => l\.groupName === "BANK ACCOUNTS" \|\| l\.name\.toUpperCase\(\)\.includes\("BANK"\)\);\s*debitAccount = bankL \? bankL\.name : "BANK CURRENT ACCOUNT";\s*\}/g,
`} else if (invoiceData.payMode === "Bank") {
        const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
        debitAccount = bankL ? bankL.name : "BANK CURRENT ACCOUNT";
      } else if (invoiceData.payMode && invoiceData.payMode !== "Credit" && invoiceData.payMode !== "Cash") {
        debitAccount = invoiceData.payMode;
      }`);

fs.writeFileSync("src/state.js", js);
console.log("Patched");
