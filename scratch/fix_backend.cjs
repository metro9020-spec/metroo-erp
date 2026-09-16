const fs = require("fs");
let state = fs.readFileSync("src/state.js", "utf8");

// Remove firebase imports if any
state = state.replace(/import\s*{[^}]*}\s*from\s*"firebase\/firestore";?/g, "");

// Add syncFromServer
const syncFrom = `
  async syncFromServer() {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return;
    try {
      const res = await fetch(\`http://\${window.location.hostname}:3001/api/data/\${activeId}\`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.ledgers) {
          localStorage.setItem("erp_company_data_" + activeId, JSON.stringify(data));
          this.loadState(); // Reload from local storage memory
          this.notifyListeners();
        }
      }
    } catch(e) {
      console.error(e);
    }
  }
`;

// Wait, state.js is a class. Let`s insert it after saveState
const insertIndex = state.indexOf("  saveState(skipNotify");
state = state.slice(0, insertIndex) + syncFrom + "\n" + state.slice(insertIndex);

// Replace firebase sync inside saveState
const firebaseStr = `setDoc(doc(db, "company_data", activeId), stateToSave).catch(e => {
        console.error("Firebase save failed:", e);
      });`;
      
const localSyncStr = `fetch(\`http://\${window.location.hostname}:3001/api/data/\${activeId}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stateToSave)
      }).catch(e => {
        console.error("Local node server save failed:", e);
      });`;

state = state.replace(firebaseStr, localSyncStr);

fs.writeFileSync("src/state.js", state);
console.log("Fixed backend syncing");

