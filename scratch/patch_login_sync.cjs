const fs = require("fs");
let js = fs.readFileSync("src/views/login.js", "utf8");

js = js.replace(
  `state.setActiveCompanyId(compId);
      state.setLoginDate(new Date().toISOString().split("T")[0]);
      await state.loadState();`,
  `state.setActiveCompanyId(compId);
      state.setLoginDate(new Date().toISOString().split("T")[0]);
      await state.syncFromServer();
      await state.loadState();`
);

js = js.replace(
  `state.setActiveCompanyId(newCompany.id);
    state.setLoginDate(new Date().toISOString().split("T")[0]);
    await state.loadState();`,
  `state.setActiveCompanyId(newCompany.id);
    state.setLoginDate(new Date().toISOString().split("T")[0]);
    await state.syncFromServer();
    await state.loadState();`
);

fs.writeFileSync("src/views/login.js", js);
console.log("Patched login.js to trigger sync on login");
