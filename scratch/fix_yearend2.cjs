const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

const yearEndMethod = `
  runYearEndProcess(newFyId, fyName) {
    try {
      const activeId = this.getActiveCompanyId();
      const companies = this.getRegisteredCompanies();
      const compIdx = companies.findIndex(c => c.id === activeId);
      if (compIdx === -1) return false;

      const comp = companies[compIdx];
      if (!comp.financialYears) {
        comp.financialYears = [{ id: "default", name: "Current Year", isCurrent: false }];
      }
      comp.financialYears.forEach(fy => fy.isCurrent = false);
      comp.financialYears.push({ id: newFyId, name: fyName, isCurrent: true });

      // Save updated company list
      this.saveRegisteredCompanies(companies);

      // Calculate Opening Balances for ledgers
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
      });

      // Restart Series Numbers
      const newSeries = JSON.parse(JSON.stringify(this.seriesMaster || []));
      newSeries.forEach(s => {
        s.currentNumber = s.startingNumber || 1;
      });

      // Construct New FY State
      const newState = {
        materials: JSON.parse(JSON.stringify(this.materials || [])),
        contacts: JSON.parse(JSON.stringify(this.contacts || [])),
        invoices: [],
        transactions: [],
        purchases: [],
        salesReturns: [],
        purchaseReturns: [],
        conversions: [],
        stockAdjustments: [],
        productGroups: this.productGroups,
        companies: this.companies,
        categories: this.categories,
        subCategories: this.subCategories,
        productNames: this.productNames,
        adminPassword: this.adminPassword || "123",
        accountGroups: this.accountGroups,
        ledgers: newLedgers,
        units: this.units,
        options: this.options,
        influencers: this.influencers,
        hsnCodes: this.hsnCodes,
        seriesMaster: newSeries,
        gstMaster: this.gstMaster
      };

      // Save new FY State locally
      localStorage.setItem("erp_company_data_" + activeId + "_" + newFyId, JSON.stringify(newState));

      // Switch active FY
      this.setActiveFyId(newFyId);
      
      // Load it into memory
      this.loadState(true);

      // Force push new state to backend
      this.saveState(true);

      return true;
    } catch(e) {
      console.error(e);
      return false;
    }
  }
`;

js = js.replace(`  async syncFromServer() {`, `${yearEndMethod}\n  async syncFromServer() {`);

fs.writeFileSync("src/state.js", js);
console.log("Added runYearEndProcess successfully");
