const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const oldHeader = `label.innerHTML = current.name + " (" + state.getLoginDate() + ") <span style=\\"color:var(--warning-color); font-size:0.85rem;\\">" + fyStr + "</span>";`;

const newHeader = `label.innerHTML = current.name + " (" + state.getLoginDate() + ") <span style=\\"color:var(--warning-color); font-size:0.85rem; cursor:pointer; text-decoration:underline;\\" onclick=\\"window.showSelectFinancialYearModal()\\">" + (fyStr || " | Select Book") + "</span>";`;

js = js.replace(oldHeader, newHeader);

// Expose modal globally
js = js.replace(/function showSelectFinancialYearModal\(\)/g, "window.showSelectFinancialYearModal = function()");

fs.writeFileSync("src/main.js", js);
console.log("Patched header to add clickable FY button");
