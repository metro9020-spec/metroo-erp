const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

// Add getActiveFyId and setActiveFyId
const activeCompanyCode = `  getActiveCompanyId() {
    return localStorage.getItem("erp_active_company_id");
  }

  setActiveCompanyId(companyId) {
    if (companyId) {
      localStorage.setItem("erp_active_company_id", companyId);
    } else {
      localStorage.removeItem("erp_active_company_id");
    }
  }`;

const newActiveCode = `  getActiveCompanyId() {
    return localStorage.getItem("erp_active_company_id");
  }

  setActiveCompanyId(companyId) {
    if (companyId) {
      localStorage.setItem("erp_active_company_id", companyId);
    } else {
      localStorage.removeItem("erp_active_company_id");
    }
  }

  getActiveFyId() {
    return localStorage.getItem("erp_active_fy_id") || "default";
  }

  setActiveFyId(fyId) {
    if (fyId) {
      localStorage.setItem("erp_active_fy_id", fyId);
    } else {
      localStorage.removeItem("erp_active_fy_id");
    }
  }`;
js = js.replace(activeCompanyCode, newActiveCode);

// Update syncFromServer
js = js.replace(
  `const res = await fetch(\`http://\${window.location.hostname}:3001/api/data/\${activeId}\`);`,
  `const fyId = this.getActiveFyId();\n      const res = await fetch(\`http://\${window.location.hostname}:3001/api/data/\${activeId}/\${fyId}\`);`
);

// Update saveState fetch
js = js.replace(
  `fetch(\`http://\${window.location.hostname}:3001/api/data/\${activeId}\``,
  `const fyId = this.getActiveFyId();\n      fetch(\`http://\${window.location.hostname}:3001/api/data/\${activeId}/\${fyId}\``
);

// Update localStorage keys
js = js.replace(
  /localStorage\.setItem\("erp_company_data_" \+ activeId,/g,
  `localStorage.setItem("erp_company_data_" + activeId + "_" + this.getActiveFyId(),`
);
js = js.replace(
  /const stored = localStorage\.getItem\(\`erp_company_data_\$\{activeId\}\`\);/g,
  `const stored = localStorage.getItem(\`erp_company_data_\${activeId}_\${this.getActiveFyId()}\`);`
);

// Add year ending process method
const yearEndMethod = `
  runYearEndProcess(newFyId, newFyName) {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return false;
    
    // 1. Get current company
    const companies = this.getRegisteredCompanies();
    const compIdx = companies.findIndex(c => c.id === activeId);
    if (compIdx === -1) return false;
    
    const company = companies[compIdx];
    if (!company.financialYears) {
      company.financialYears = [{ id: "default", name: "Current Year", isCurrent: false }];
    } else {
      company.financialYears.forEach(fy => fy.isCurrent = false);
    }
    
    // 2. Add new FY
    company.financialYears.push({ id: newFyId, name: newFyName, isCurrent: true });
    
    // 3. Process data
    // Copy current state to new state
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
      productGroups: this.productGroups || [],
      companies: this.companies || [],
      categories: this.categories || [],
      subCategories: this.subCategories || [],
      productNames: this.productNames || [],
      adminPassword: this.adminPassword || "123",
      accountGroups: this.accountGroups || [],
      ledgers: JSON.parse(JSON.stringify(this.ledgers || [])),
      salesAdjustments: this.salesAdjustments || [],
      purchaseAdjustments: this.purchaseAdjustments || [],
      units: this.units || [],
      options: this.options || {},
      influencers: this.influencers || [],
      hsnCodes: this.hsnCodes || [],
      seriesMaster: JSON.parse(JSON.stringify(this.seriesMaster || [])),
      gstMaster: this.gstMaster || []
    };
    
    // Reset series numbers
    if (newState.seriesMaster) {
      newState.seriesMaster.forEach(s => {
        s.currentNumber = s.startingNumber || 1;
      });
    }
    
    // Calculate closing balances for ledgers and set as opening
    if (newState.ledgers && this.transactions) {
      newState.ledgers.forEach(l => {
        let closingBal = parseFloat(l.openingBalance) || 0;
        let isDebit = l.openingBalanceType === "Dr";
        if (!isDebit && closingBal > 0) closingBal = -closingBal;
        
        this.transactions.forEach(tx => {
          if (tx.entries) {
            tx.entries.forEach(e => {
              if (e.accountId === l.code) {
                closingBal += (parseFloat(e.debit) || 0) - (parseFloat(e.credit) || 0);
              }
            });
          }
        });
        
        l.openingBalance = Math.abs(closingBal);
        l.openingBalanceType = closingBal >= 0 ? "Dr" : "Cr";
      });
    }
    
    // Calculate closing balances for contacts and set as opening
    if (newState.contacts) {
      newState.contacts.forEach(c => {
        // Just take their current balance as opening balance
        c.openingBalance = Math.abs(c.balance || 0);
        c.balanceType = (c.balance || 0) >= 0 ? "Dr" : "Cr";
      });
    }
    
    // Calculate closing stock for materials and set as opening
    if (newState.materials) {
      newState.materials.forEach(m => {
        m.openingStock = m.currentStock || 0;
        m.currentStock = m.openingStock;
      });
    }
    
    // Save to local storage for new FY
    localStorage.setItem("erp_company_data_" + activeId + "_" + newFyId, JSON.stringify(newState));
    
    // Save updated company list
    this.saveRegisteredCompanies(companies);
    
    // Switch to new FY
    this.setActiveFyId(newFyId);
    
    // Force sync of new state to server
    this.loadState(true);
    this.saveState(true);
    
    return true;
  }
`;

js = js.replace(`runBackup() {`, yearEndMethod + `\n  runBackup() {`);

fs.writeFileSync("src/state.js", js);
console.log("Patched state.js for FY logic");
