const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const replaceStr = `const btnEmp = document.getElementById("sidebar-btn-employee");
if (btnEmp) {
  btnEmp.addEventListener("click", () => {
    import("./views/contacts.js").then(m => m.showContactsModal("employee"));
  });
}`;

js = js.replace(/const btnSales = document\.getElementById\("sidebar-btn-sales"\);[\s\S]*?const btnPurchase = document\.getElementById\("sidebar-btn-purchase"\);[\s\S]*?\}\s*\}/, replaceStr);

fs.writeFileSync("src/main.js", js);
console.log("Patched!");
