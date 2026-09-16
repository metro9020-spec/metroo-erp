const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

js = js.replace(
  `const btnEmp = document.getElementById("sidebar-btn-employee");
if (btnEmp) {
  btnEmp.addEventListener("click", () => {
    import("./views/contacts.js").then(m => m.showContactsModal("employee"));
  });
}`,
  `const btnSales = document.getElementById("sidebar-btn-sales");
if (btnSales) {
  btnSales.addEventListener("click", () => {
    import("./views/transactions.js").then(m => m.showInvoiceBuilderModal());
  });
}
const btnPurchase = document.getElementById("sidebar-btn-purchase");
if (btnPurchase) {
  btnPurchase.addEventListener("click", () => {
    import("./views/transactions.js").then(m => m.showPurchaseBuilderModal());
  });
}`
);

fs.writeFileSync("src/main.js", js);
console.log("Patched main.js");
