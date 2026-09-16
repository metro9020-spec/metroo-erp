const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

js = js.replace(
  `const btnSales = document.getElementById("sidebar-btn-sales");\r\nif (btnSales) {\r\n  btnSales.addEventListener("click", () => {\r\n    import("./views/transactions.js").then(m => m.showInvoiceBuilderModal());\r\n  });\r\n}\r\nconst btnPurchase = document.getElementById("sidebar-btn-purchase");\r\nif (btnPurchase) {\r\n  btnPurchase.addEventListener("click", () => {\r\n    import("./views/transactions.js").then(m => m.showPurchaseBuilderModal());\r\n  });\r\n}`,
  `const btnSales = document.getElementById("sidebar-btn-sales");
if (btnSales) {
  btnSales.addEventListener("click", () => {
    import("./views/selectSeriesModal.js").then(sm => {
      sm.showSelectBillSeriesModal("Sales", (selectedSeries) => {
        import("./views/transactions.js").then(m => m.showInvoiceBuilderModal(document.getElementById("modal-container-root"), null, null, null, null, selectedSeries));
      });
    });
  });
}
const btnPurchase = document.getElementById("sidebar-btn-purchase");
if (btnPurchase) {
  btnPurchase.addEventListener("click", () => {
    import("./views/selectSeriesModal.js").then(sm => {
      sm.showSelectBillSeriesModal("Purchase", (selectedSeries) => {
        import("./views/transactions.js").then(m => m.showRecordPurchaseModal(document.getElementById("modal-container-root"), null, null, selectedSeries));
      });
    });
  });
}`
);

const f3Search = `  // F3: Purchase Bill
  if (e.key === "F3") {
    e.preventDefault();
    import("./views/transactions.js").then(m => {
      m.setTransactionsActiveTab("purchase");
      
      const checkAndClick = () => {
        const btn = document.getElementById("btn-add-purchase");
        if (btn) {
          btn.click();
        } else {
          setTimeout(checkAndClick, 50);
        }
      };

      if (window.location.hash !== "#transactions") {
        window.location.hash = "#transactions";
        setTimeout(checkAndClick, 100);
      } else {
        checkAndClick();
      }
    });
  }`;

const f3Replace = `  // F3: Purchase Bill
  if (e.key === "F3") {
    e.preventDefault();
    import("./views/selectSeriesModal.js").then(sm => {
      sm.showSelectBillSeriesModal("Purchase", (selectedSeries) => {
        import("./views/transactions.js").then(m => {
          m.showRecordPurchaseModal(document.getElementById("modal-container-root"), null, null, selectedSeries);
        });
      });
    });
  }`;

js = js.replace(f3Search, f3Replace);

fs.writeFileSync("src/main.js", js);
console.log("Patched main.js 2");
