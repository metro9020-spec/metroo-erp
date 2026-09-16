const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

const oldSync = `  async syncCompanies() {
    try {
      const res = await fetch(\`http://\${window.location.hostname}:3001/api/companies\`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const currentStr = localStorage.getItem("erp_companies");
          const current = currentStr ? JSON.parse(currentStr) : [];
          localStorage.setItem("erp_companies", JSON.stringify(data));
          if (current.length === 0) {
            window.location.reload();
          }
        }
      }
    } catch(e) {}
  }`;

const newSync = `  async syncCompanies() {
    try {
      const res = await fetch(\`http://\${window.location.hostname}:3001/api/companies\`);
      if (res.ok) {
        const data = await res.json();
        const currentStr = localStorage.getItem("erp_companies");
        const current = currentStr ? JSON.parse(currentStr) : [];
        
        // If backend has companies, sync to local
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem("erp_companies", JSON.stringify(data));
          if (current.length === 0) {
            window.location.reload();
          }
        } 
        // If backend is empty but local has companies, push to backend (migration)
        else if (current.length > 0) {
          this.saveRegisteredCompanies(current);
        }
      }
    } catch(e) {}
  }`;

js = js.replace(oldSync, newSync);
fs.writeFileSync("src/state.js", js);
console.log("Patched state.js with bidirectional companies sync");
