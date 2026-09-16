const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(
  `id="menu-select-fy" style="`,
  `id="menu-select-fy" onclick="window.showSelectFinancialYearModal(); event.preventDefault();" style="`
);

html = html.replace(
  `id="menu-year-ending" style="`,
  `id="menu-year-ending" onclick="window.showYearEndModal(); event.preventDefault();" style="`
);

fs.writeFileSync("index.html", html);
console.log("Added inline onclick to index.html");
