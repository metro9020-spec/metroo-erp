const fs = require("fs");
let js = fs.readFileSync("src/state.js", "utf8");

const getFyMethod = `
  getActiveFyId() {
    return localStorage.getItem("erp_active_fy_id") || "default";
  }

  setActiveFyId(fyId) {
    if (fyId) {
      localStorage.setItem("erp_active_fy_id", fyId);
    } else {
      localStorage.removeItem("erp_active_fy_id");
    }
  }
`;

js = js.replace(`  getActiveCompanyId() {`, `${getFyMethod}\n  getActiveCompanyId() {`);

fs.writeFileSync("src/state.js", js);
console.log("Fixed getActiveFyId missing method");
