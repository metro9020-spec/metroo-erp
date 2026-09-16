const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

js = js.replace(/} else if \(pur\.payMode === "Bank"\) \{\s*const bankL = this\.ledgers\.find\(l => l\.groupName === "BANK ACCOUNTS" \|\| l\.name\.toUpperCase\(\)\.includes\("BANK"\)\);\s*creditAccount = bankL \? bankL\.name : "BANK CURRENT ACCOUNT";\s*\}/g,
`} else if (pur.payMode === "Bank") {
        const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
        creditAccount = bankL ? bankL.name : "BANK CURRENT ACCOUNT";
      } else if (pur.payMode && pur.payMode !== "Credit" && pur.payMode !== "Cash") {
        creditAccount = pur.payMode;
      }`);

js = js.replace(/} else if \(purchaseData\.payMode === "Bank"\) \{\s*const bankL = this\.ledgers\.find\(l => l\.groupName === "BANK ACCOUNTS" \|\| l\.name\.toUpperCase\(\)\.includes\("BANK"\)\);\s*creditAccount = bankL \? bankL\.name : "BANK CURRENT ACCOUNT";\s*\}/g,
`} else if (purchaseData.payMode === "Bank") {
        const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
        creditAccount = bankL ? bankL.name : "BANK CURRENT ACCOUNT";
      } else if (purchaseData.payMode && purchaseData.payMode !== "Credit" && purchaseData.payMode !== "Cash") {
        creditAccount = purchaseData.payMode;
      }`);

fs.writeFileSync("src/state.js", js);
console.log("Patched 2");
