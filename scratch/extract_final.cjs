const fs = require("fs");
const content = fs.readFileSync("scratch/step628.txt", "utf8");
const start = content.indexOf("<nav class=\"erp-menu-bar\">");
const end = content.indexOf("</nav>", start);
if (start !== -1 && end !== -1) {
  let nav = content.substring(start, end + 6);
  // Inject Admin stuff
  const adminRegex = /(<span class="menu-title">Admin<\/span>[\s\S]*?<div class="dropdown-content">[\s\S]*?<a href="#" id="menu-edit-company">Edit Company Information<\/a>\s*<a href="#" id="menu-delete-company" style="color: #ef4444;">Delete Company<\/a>\s*<div class="dropdown-divider"><\/div>)/;
  const injection = `\n              <a href="#" id="menu-select-fy" onclick="window.showSelectFinancialYearModal(); event.preventDefault();" style="color:var(--accent-color); font-weight:bold;">Select Accounting Period (Ctrl+F3)</a>\n              <a href="#" id="menu-year-ending" onclick="window.showYearEndModal(); event.preventDefault();" style="color:var(--warning-color); font-weight:bold;">Accounting Period Ending</a>\n              <div class="dropdown-divider"></div>`;
  nav = nav.replace(adminRegex, "$1" + injection);
  
  let html = fs.readFileSync("index.html", "utf8");
  html = html.replace(/<nav class="erp-menu-bar">[\s\S]*?<\/nav>/, nav);
  
  // Also Cache Bust
  html = html.replace(/src="\/src\/main\.js\?v=[0-9]+"/g, `src="/src/main.js?v=${Date.now()}"`);
  
  fs.writeFileSync("index.html", html);
  console.log("RESTORED EXACT ORIGINAL NAV!");
} else {
  console.log("NOT FOUND in step628!");
}
