const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

// Add sync function call in constructor
js = js.replace(
  `this.forceAlignTransactionUnits();\r\n  }`,
  `this.forceAlignTransactionUnits();\r\n    this.syncFromServer();\r\n  }`
);

// Add the syncFromServer method
const syncFromServerCode = `
  async syncFromServer() {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return;
    try {
      const res = await fetch("http://localhost:3001/api/data/" + activeId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.ledgers) {
          localStorage.setItem("erp_company_data_" + activeId, JSON.stringify(data));
          this.loadState(); // Reload from local storage memory
          this.notifyListeners();
          console.log("State synced from local backend.");
        }
      }
    } catch(err) {
      console.log("No local backend found or error syncing:", err);
    }
  }
`;

js = js.replace(`  getRegisteredCompanies() {`, syncFromServerCode + `\r\n  getRegisteredCompanies() {`);

// Modify saveState to also post to backend
const saveStateOriginal = `    try {
      const activeId = this.getActiveCompanyId();
      if (!activeId) return;

      const stateToSave = {
        materials: this.materials,`;

const saveStateNew = `    try {
      const activeId = this.getActiveCompanyId();
      if (!activeId) return;

      const stateToSave = {
        materials: this.materials,`;

const saveStateEndOriginal = `      localStorage.setItem(\`erp_company_data_\${activeId}\`, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }`;

const saveStateEndNew = `      const dataStr = JSON.stringify(stateToSave);
      localStorage.setItem(\`erp_company_data_\${activeId}\`, dataStr);
      
      // Async save to backend
      fetch("http://localhost:3001/api/data/" + activeId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: dataStr
      }).catch(err => console.log("Backend offline, data saved locally only."));
      
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }`;

js = js.replace(saveStateEndOriginal, saveStateEndNew);

fs.writeFileSync("src/state.js", js);
console.log("Patched state.js for backend sync");
