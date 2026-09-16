const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

const oldCode = `      // Calculate Opening Balances for ledgers
      const newLedgers = JSON.parse(JSON.stringify(this.ledgers || []));
      newLedgers.forEach(l => {
        let closingBal = parseFloat(l.openingBalance) || 0;
        this.transactions.forEach(tx => {
          if (tx.entries) {
            tx.entries.forEach(e => {
              if (e.accountId === l.code) {
                closingBal += (parseFloat(e.debit) || 0) - (parseFloat(e.credit) || 0);
              }
            });
          }
        });
        l.openingBalance = closingBal;
      });`;

const newCode = `      // Calculate Opening Balances for ledgers
      const getPrimaryGroup = (groupName) => {
        let current = this.accountGroups.find(g => g.name === groupName);
        let visited = new Set();
        while (current && current.under) {
          if (visited.has(current.name)) break;
          visited.add(current.name);
          if (["ASSETS", "LIABILITIES", "EQUITY", "EXPENSE", "INCOME"].includes(current.under)) {
            return current.under;
          }
          current = this.accountGroups.find(g => g.name === current.under);
        }
        return "UNKNOWN";
      };

      const newLedgers = JSON.parse(JSON.stringify(this.ledgers || []));
      let netProfit = 0; // Income (Credit) - Expense (Debit)

      newLedgers.forEach(l => {
        let closingBal = parseFloat(l.openingBalance) || 0; // positive is Debit, negative is Credit
        if (l.balanceType === "Credit") closingBal = -closingBal;

        this.transactions.forEach(tx => {
          if (tx.entries) {
            tx.entries.forEach(e => {
              if (e.accountId === l.code) {
                closingBal += (parseFloat(e.debit) || 0) - (parseFloat(e.credit) || 0);
              }
            });
          }
        });

        const primaryGroup = getPrimaryGroup(l.groupName);
        
        if (primaryGroup === "INCOME" || primaryGroup === "EXPENSE") {
           // Accumulate to Net Profit (Credit balance is profit, so we negate closingBal because closingBal is Debit)
           netProfit += -closingBal;
           l.openingBalance = 0;
        } else {
           l.openingBalance = Math.abs(closingBal);
           l.balanceType = closingBal < 0 ? "Credit" : "Debit";
        }
      });

      // Transfer Net Profit to Profit & Loss A/C
      let pnlLedger = newLedgers.find(l => l.name === "PROFIT & LOSS A/C");
      if (!pnlLedger) {
        pnlLedger = {
          code: "L" + Date.now(),
          name: "PROFIT & LOSS A/C",
          groupName: "CAPITAL ACCOUNT",
          openingBalance: 0,
          balanceType: "Credit"
        };
        newLedgers.push(pnlLedger);
      }
      
      let pnlBal = parseFloat(pnlLedger.openingBalance) || 0;
      if (pnlLedger.balanceType === "Credit") pnlBal = -pnlBal;
      pnlBal -= netProfit; // netProfit is Credit, so subtract from Debit balance

      pnlLedger.openingBalance = Math.abs(pnlBal);
      pnlLedger.balanceType = pnlBal < 0 ? "Credit" : "Debit";
`;

js = js.replace(oldCode, newCode);
fs.writeFileSync("src/state.js", js);
console.log("Patched runYearEndProcess");
