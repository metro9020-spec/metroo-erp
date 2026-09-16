const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(
  `<a href="#" id="menu-backup">Backup Database</a>`,
  `<a href="#" id="menu-year-ending" style="color:var(--warning-color); font-weight:bold;">Accounting Period Ending</a>\n              <a href="#" id="menu-backup">Backup Database</a>`
);

fs.writeFileSync("index.html", html);
console.log("Patched index.html with menu");
