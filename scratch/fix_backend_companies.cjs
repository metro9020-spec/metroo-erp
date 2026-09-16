const fs = require("fs");
let state = fs.readFileSync("src/state.js", "utf8");

const syncComp = `
  async syncCompanies() {
    try {
      const res = await fetch(\`http://\${window.location.hostname}:3001/api/companies\`);
      if (res.ok) {
        const data = await res.json();
        const currentStr = localStorage.getItem("erp_companies");
        const current = currentStr ? JSON.parse(currentStr) : [];
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem("erp_companies", JSON.stringify(data));
          if (current.length === 0) {
            window.location.reload();
          }
        } else if (current.length > 0) {
          this.saveRegisteredCompanies(current);
        }
      }
    } catch(e) {}
  }
`;

const insertIndex = state.indexOf("  saveState(skipNotify");
state = state.slice(0, insertIndex) + syncComp + "\n" + state.slice(insertIndex);

const replaceTo = `saveRegisteredCompanies(companies) {
    localStorage.setItem("erp_companies", JSON.stringify(companies));
    try {
      fetch("http://" + window.location.hostname + ":3001/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companies)
      });
    } catch (e) {}
  }`;

state = state.replace(/saveRegisteredCompanies\(companies\) \{\s*localStorage\.setItem\("erp_companies", JSON\.stringify\(companies\)\);\s*\}/, replaceTo);

fs.writeFileSync("src/state.js", state);
console.log("Fixed syncCompanies");
