const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const navRegex = /<nav class="erp-menu-bar">[\s\S]*?<\/nav>/;

const newNav = `<nav class="erp-menu-bar">
          <div class="menu-item">
            <span class="menu-title">Masters</span>
            <div class="dropdown-content">
              <a href="#groups" id="menu-groups">Account Group Master</a>
              <a href="#ledgers" id="menu-ledgers">Account Ledger Creation</a>
              <a href="#adjustments" id="menu-adjustments">Sale/Purchase Adjustment Master</a>
              <a href="#inventory" id="menu-product-master">Product Master</a>
            </div>
          </div>
          <div class="menu-item">
            <span class="menu-title">Accounts</span>
            <div class="dropdown-content">
              <a href="#reports" id="menu-bank-book">Bank Book</a>
              <a href="#reports" id="menu-cash-book">Cash Book</a>
              <a href="#reports" id="menu-day-book">Day Book</a>
              <a href="#reports" id="menu-journal-register">Journal Register</a>
            </div>
          </div>
          <div class="menu-item">
            <span class="menu-title">Transaction</span>
            <div class="dropdown-content">
              <a href="#transactions" id="menu-sales">Sales</a>
              <a href="#transactions" id="menu-purchase">Purchase</a>
              <a href="#transactions" id="menu-payment">Payment</a>
              <a href="#transactions" id="menu-receipt">Receipt</a>
            </div>
          </div>
          <div class="menu-item">
            <span class="menu-title">Inventory Reports</span>
            <div class="dropdown-content">
              <a href="#reports" id="menu-stock-register-batch">Stock Register [Batch Wise]</a>
              <a href="#" id="menu-item-wise-stock">Item wise Stock Register</a>
              <a href="#inventory" id="menu-stock-quick-view">Stock [Quick View] <span class="shortcut">Ctrl+F</span></a>
            </div>
          </div>
          <div class="menu-item">
            <span class="menu-title">Tax Reports</span>
            <div class="dropdown-content">
              <a href="#reports" id="menu-gstr1">GSTR-1</a>
              <a href="#reports" id="menu-gstr2">GSTR-2</a>
              <a href="#reports" id="menu-gstr3b">GSTR-3B</a>
            </div>
          </div>
          <div class="menu-item">
            <span class="menu-title">Account Reports</span>
            <div class="dropdown-content">
              <a href="#reports" id="menu-trial-balance">Trial Balance</a>
              <a href="#reports" id="menu-pl">Profit & Loss</a>
              <a href="#reports" id="menu-bs">Balance Sheet</a>
            </div>
          </div>
          <div class="menu-item">
            <span class="menu-title">Utilities</span>
            <div class="dropdown-content">
              <a href="#admin" id="menu-admin">Admin Settings</a>
              <a href="#preset-loading" id="menu-preset-loading">Preset Loading</a>
              <a href="#" id="menu-options">Options</a>
              <a href="#" id="menu-gst-master">GST Master</a>
              <div class="dropdown-divider"></div>
              <a href="#" id="menu-reset-db">Reset Database</a>
              <a href="#" id="menu-clear-db">CLEAR DATAT BASE</a>
            </div>
          </div>
          <div class="menu-item">
            <span class="menu-title">Admin</span>
            <div class="dropdown-content">
              <a href="#" id="menu-edit-company">Edit Company Information</a>
              <a href="#" id="menu-delete-company" style="color: #ef4444;">Delete Company</a>
              <div class="dropdown-divider"></div>
              <a href="#" id="menu-select-fy" onclick="window.showSelectFinancialYearModal(); event.preventDefault();" style="color:var(--accent-color); font-weight:bold;">Select Accounting Period (Ctrl+F3)</a>
              <a href="#" id="menu-year-ending" onclick="window.showYearEndModal(); event.preventDefault();" style="color:var(--warning-color); font-weight:bold;">Accounting Period Ending</a>
              <div class="dropdown-divider"></div>
              <a href="#" id="menu-backup">Backup Database</a>
              <a href="#" id="menu-restore">Restore Database</a>
              <div class="dropdown-divider"></div>
              <a href="#" id="menu-logout">Logout</a>
            </div>
          </div>
          <div class="menu-item">
            <span class="menu-title">Help</span>
            <div class="dropdown-content">
              <a href="#" id="menu-about">About ERP</a>
              <a href="#" id="menu-license">License Info</a>
            </div>
          </div>

          <div style="flex: 1;"></div>
          
          <div style="display: flex; align-items: center; gap: 15px; margin-right: 15px;">
            <button id="theme-toggle" class="theme-toggle" title="Toggle Theme" style="display: none; background: none; border: none; color: inherit; cursor: pointer; padding: 2px 6px; font-size: 0.8rem;">
              <i class="fa-solid fa-sun" id="theme-icon"></i>
            </button>
            <span id="header-company-name" style="font-size: 0.75rem; font-weight: 600; color: #1e3b8b; background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Admin (Accounts Manager)</span>
            <button id="header-logout-btn" style="background: #ef4444; color: white; border: none; padding: 2px 8px; font-size: 0.7rem; border-radius: 4px; font-weight: bold; cursor: pointer;">Logout</button>
          </div>
        </nav>`;

html = html.replace(navRegex, newNav);
fs.writeFileSync("index.html", html);
console.log("Rebuilt full nav");
