const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

// Inject syncCompanies into constructor
js = js.replace(
  `this.syncFromServer();`,
  `this.syncFromServer();\r\n    this.syncCompanies();`
);

const syncCompaniesCode = `  async syncCompanies() {
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

js = js.replace(`  async syncFromServer() {`, syncCompaniesCode + `\r\n\r\n  async syncFromServer() {`);

const oldSaveCompanies = `  saveRegisteredCompanies(companies) {
    localStorage.setItem("erp_companies", JSON.stringify(companies));
  }`;

const newSaveCompanies = `  saveRegisteredCompanies(companies) {
    localStorage.setItem("erp_companies", JSON.stringify(companies));
    fetch(\`http://\${window.location.hostname}:3001/api/companies\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(companies)
    }).catch(err => console.log("Backend offline, companies saved locally"));
  }`;

js = js.replace(oldSaveCompanies, newSaveCompanies);
fs.writeFileSync("src/state.js", js);
console.log("Patched state.js with companies sync");
