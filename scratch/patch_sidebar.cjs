const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(
  `          <button class="sidebar-btn" id="sidebar-btn-employee" title="Employee Registry (Ctrl+M)">\r\n            <div class="btn-icon-wrapper"><i class="fa-solid fa-id-card" style="color: #ec4899;"></i></div>\r\n            <span class="btn-text">Employee</span>\r\n          </button>\r\n`,
  ``
);

html = html.replace(
  `          <button class="sidebar-btn" id="sidebar-btn-bankbook" title="Bank Book">\r\n            <div class="btn-icon-wrapper"><i class="fa-solid fa-building-columns" style="color: #8b5cf6;"></i></div>\r\n            <span class="btn-text">Bank Book</span>\r\n          </button>\r\n        </div>`,
  `          <button class="sidebar-btn" id="sidebar-btn-bankbook" title="Bank Book">\r\n            <div class="btn-icon-wrapper"><i class="fa-solid fa-building-columns" style="color: #8b5cf6;"></i></div>\r\n            <span class="btn-text">Bank Book</span>\r\n          </button>\r\n          <button class="sidebar-btn" id="sidebar-btn-sales" title="Sales (F4)">\r\n            <div class="btn-icon-wrapper"><i class="fa-solid fa-cart-shopping" style="color: #22c55e;"></i></div>\r\n            <span class="btn-text">Sales</span>\r\n          </button>\r\n          <button class="sidebar-btn" id="sidebar-btn-purchase" title="Purchase (F3)">\r\n            <div class="btn-icon-wrapper"><i class="fa-solid fa-bag-shopping" style="color: #f97316;"></i></div>\r\n            <span class="btn-text">Purchase</span>\r\n          </button>\r\n        </div>`
);

fs.writeFileSync("index.html", html);
console.log("Patched index.html");
