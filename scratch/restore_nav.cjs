const fs = require("fs");
const originalNavRaw = fs.readFileSync("scratch/original_nav.txt", "utf8");
// originalNavRaw contains "Top Horizontal Menu Bar -->\n      <nav class="erp-menu-bar">..."
const navStart = originalNavRaw.indexOf("<nav class=\"erp-menu-bar\">");
const navEnd = originalNavRaw.indexOf("</nav>");
let originalNav = originalNavRaw.substring(navStart, navEnd + 6);

// Inject into Admin
const adminRegex = /(<span class="menu-title">Admin<\/span>\s*<div class="dropdown-content">\s*<a href="#" id="menu-edit-company">Edit Company Information<\/a>\s*<a href="#" id="menu-delete-company" style="color: #ef4444;">Delete Company<\/a>\s*<div class="dropdown-divider"><\/div>)/;
const injection = `\n              <a href="#" id="menu-select-fy" onclick="window.showSelectFinancialYearModal(); event.preventDefault();" style="color:var(--accent-color); font-weight:bold;">Select Accounting Period (Ctrl+F3)</a>\n              <a href="#" id="menu-year-ending" onclick="window.showYearEndModal(); event.preventDefault();" style="color:var(--warning-color); font-weight:bold;">Accounting Period Ending</a>\n              <div class="dropdown-divider"></div>`;

originalNav = originalNav.replace(adminRegex, "$1" + injection);

// Replace in index.html
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/<nav class="erp-menu-bar">[\s\S]*?<\/nav>/, originalNav);

// Ensure the sub-modal container is safely outside main-content
html = html.replace(/<div id="modal-container-root"><\/div>\s*<div id="sub-modal-container-root"><\/div>\s*<\/main>/, `</main>\n      <div id="modal-container-root"></div>\n      <div id="sub-modal-container-root"></div>`);

fs.writeFileSync("index.html", html);
console.log("Restored nav and fixed modal container location!");
