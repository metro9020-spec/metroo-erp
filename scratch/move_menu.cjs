const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(/<a href="#" id="menu-select-fy".*?<\/a>/s, "");

html = html.replace(
  /<a href="#" id="menu-year-ending".*?<\/a>/s,
  `<a href="#" id="menu-select-fy" style="color:var(--accent-color); font-weight:bold;">Select Accounting Period (Ctrl+F3)</a>\n              <a href="#" id="menu-year-ending" style="color:var(--warning-color); font-weight:bold;">Accounting Period Ending</a>`
);

fs.writeFileSync("index.html", html);
console.log("Patched index.html correctly");
