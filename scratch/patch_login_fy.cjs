const fs = require("fs");
let js = fs.readFileSync("src/views/login.js", "utf8");

const loginCodeOld = `          state.setActiveCompanyId(companyId);
          // NEW: Ensure we fetch latest from server BEFORE loading state
          await state.syncFromServer();`;

const loginCodeNew = `          state.setActiveCompanyId(companyId);
          const comp = companies.find(c => c.id == companyId);
          if (comp && comp.financialYears) {
            const currentFy = comp.financialYears.find(fy => fy.isCurrent);
            if (currentFy) state.setActiveFyId(currentFy.id);
            else state.setActiveFyId(comp.financialYears[0].id);
          } else {
            state.setActiveFyId("default");
          }
          // NEW: Ensure we fetch latest from server BEFORE loading state
          await state.syncFromServer();`;

js = js.replace(loginCodeOld, loginCodeNew);
fs.writeFileSync("src/views/login.js", js);
console.log("Patched login.js to set active FY on login");
