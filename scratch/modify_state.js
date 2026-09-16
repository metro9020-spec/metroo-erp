import fs from 'fs';

let stateCode = fs.readFileSync('G:/sw m/erp/src/state.js', 'utf8');

const pullLatestFn = `
  async pullLatestFromServer() {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return;
    const fyId = this.getActiveFyId();
    const host = window.location.hostname || "localhost";
    try {
      const res = await fetch(\`http://\${host}:3001/api/data/\${activeId}/\${fyId}\`, { cache: "no-store" });
      if (!res.ok) return;
      const serverData = await res.json();
      if (!serverData || typeof serverData !== "object") return;
      
      const lsKey = \`erp_company_data_\${activeId}\${fyId === "default" ? "" : "_" + fyId}\`;
      localStorage.setItem(lsKey, JSON.stringify(serverData));
      this.loadState();
    } catch (e) {
      console.warn("Could not pull latest state:", e);
    }
  }
`;

if (!stateCode.includes('pullLatestFromServer()')) {
  stateCode = stateCode.replace('  startAutoSync(intervalMs = 30000) {', pullLatestFn + '\n  startAutoSync(intervalMs = 30000) {');
  fs.writeFileSync('G:/sw m/erp/src/state.js', stateCode);
  console.log('Added pullLatestFromServer to state.js');
} else {
  console.log('pullLatestFromServer already exists');
}
