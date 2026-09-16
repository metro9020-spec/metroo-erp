const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(
  `<a href="#admin" id="menu-admin">Admin Settings</a>`,
  `<a href="#admin" id="menu-admin">Admin Settings</a>\n              <a href="#" id="menu-select-fy" style="color:var(--accent-color); font-weight:bold;">Select Accounting Period (Ctrl+F3)</a>`
);

fs.writeFileSync("index.html", html);
console.log("Patched index.html Utilities menu");
