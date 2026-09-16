const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const brokenPart = `// F4: Sales Invoice
if (e.key === "F4") {
e.preventDefault();
import("./views/transactions.js").then(m => {



document.addEventListener("DOMContentLoaded", () => {`;

const fixedPart = `// F4: Sales Invoice
  if (e.key === "F4") {
    e.preventDefault();
    import("./views/transactions.js").then(m => {
      m.setTransactionsActiveTab("sales");
      window.location.hash = "#transactions";
      setTimeout(() => {
        const btn = document.getElementById("btn-add-sales");
        if (btn) btn.click();
      }, 50);
    });
  }

  // F10: Product List
  if (e.key === "F10") {
    e.preventDefault();
    window.location.hash = "#inventory";
  }

  // Escape: Close modals
  if (e.key === "Escape") {
    const root = document.getElementById("modal-container-root");
    if (root && root.children.length > 0) {
      root.lastElementChild.remove();
    } else {
      window.location.hash = "";
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {`;

js = js.replace(brokenPart, fixedPart);
fs.writeFileSync("src/main.js", js);
console.log("Fixed truncated keydown block!");
