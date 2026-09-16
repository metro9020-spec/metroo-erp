const fs = require("fs");
let js = fs.readFileSync("src/views/admin.js", "utf8");

const oldAdminListenerRegex = /const btnYearEnd = document\.getElementById\("btn-run-yearend"\);[\s\S]*?\}\);[\s\S]*?\}/;

const newAdminListener = `const btnYearEnd = document.getElementById("btn-run-yearend");
  if (btnYearEnd) {
    btnYearEnd.addEventListener("click", () => {
      if (window.showYearEndModal) window.showYearEndModal();
    });
  }`;

js = js.replace(oldAdminListenerRegex, newAdminListener);

fs.writeFileSync("src/views/admin.js", js);
console.log("Patched admin.js with year end modal listener");
