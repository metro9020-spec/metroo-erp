const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const navRegex = /<nav class="erp-menu-bar">[\s\S]*?<\/nav>/;

const newNav = `<nav class="erp-menu-bar">
  <div class="menu-item">
    <span class="menu-title">Masters</span>
    <div class="dropdown-content">
      <a href="#groups" id="menu-groups">Group Creation</a>
      <a href="#ledgers" id="menu-ledgers">Ledger Creation</a>
      <a href="#adjustments" id="menu-adjustments">Sale/Purchase Adjustment Master</a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-product-master">Product Master <span class="shortcut">F2</span></a>
      <a href="#inventory" id="menu-products-list">Products List <span class="shortcut">F10</span></a>
      <a href="#" id="menu-unit-settings">Unit Settings</a>
      <a href="#" id="menu-opening-stock-register">Opening Stock Entry</a>
      <a href="#" id="menu-pricelist">Pricelist <span class="shortcut">Ctrl+P</span></a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-customer">Customer <span class="shortcut">Ctrl+U</span></a>
      <a href="#" id="menu-vendor">Vendor <span class="shortcut">Ctrl+O</span></a>
      <a href="#contacts" id="menu-contacts-directory">Contacts Directory</a>
      <a href="#" id="menu-employee">Employee <span class="shortcut">Ctrl+M</span></a>
      <a href="#" id="menu-influencers">Influencer Master</a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-series-master">Invoice Series Setting</a>
      <a href="#" id="menu-exit">Exit <span class="shortcut">Ctrl+X</span></a>
    </div>
  </div>
  <div class="menu-item">
    <span class="menu-title">Accounts</span>
    <div class="dropdown-content">
      <a href="#reports" id="menu-day-book">Day Book</a>
      <a href="#reports" id="menu-cash-book">Cash Book</a>
      <a href="#reports" id="menu-bank-book">Bank Book</a>
      <a href="#reports" id="menu-journal-register">Journal Register</a>
      <a href="#reports" id="menu-individual-ledger">Individual Ledger</a>
      <a href="#reports" id="menu-ledger-group-summary">Ledger Group Summary</a>
    </div>
  </div>
  <div class="menu-item">
    <span class="menu-title">Transaction</span>
    <div class="dropdown-content">
      <a href="#transactions" id="menu-sales">Sales</a>
      <a href="#transactions" id="menu-purchase">Purchase</a>
      <a href="#transactions" id="menu-payment">Payment</a>
      <a href="#transactions" id="menu-receipt">Receipt</a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-canceled-sales-bills">Sales Bills</a>
      <a href="#" id="menu-canceled-purchase-bills">Purchase Bills</a>
    </div>
  </div>
  <div class="menu-item">
    <span class="menu-title">Inventory Reports</span>
    <div class="dropdown-content">
      <a href="#inventory" id="menu-stock-quick-view">Stock [Quick View] <span class="shortcut">Ctrl+F</span></a>
      <a href="#inventory" id="menu-stock-register">Stock Register <span class="shortcut">Ctrl+F1</span></a>
      <a href="#inventory" id="menu-stock-register-detailed">Stock Register Detailed <span class="shortcut">Ctrl+F2</span></a>
      <a href="#reports" id="menu-stock-register-batch">Stock Register [Batch Wise]</a>
      <a href="#" id="menu-item-wise-stock">Item wise Stock Register</a>
      <a href="#" id="menu-location-wise-stock">Location Wise Stock</a>
      <a href="#" id="menu-stock-register-rack">Stock Register [Rack wise]</a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-external-stock-transfer">External Stock Transfer</a>
      <a href="#" id="menu-stock-adjustment-report">Stock Adjustment Report</a>
      <a href="#" id="menu-external-stock-receipt">External Stock Receipt Report</a>
      <a href="#" id="menu-internal-stock-transfer">Internal Stock Transfer Report</a>
      <a href="#" id="menu-product-loosening-report">Product Loosening Report</a>
      <a href="#" id="menu-product-bundling-report">Product Bundling Report</a>
      <a href="#" id="menu-serial-no-status">Serial No Status</a>
      <a href="#" id="menu-quotation-report">Quotation Report</a>
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
      <a href="#reports" id="menu-balance-sheet">Balance Sheet</a>
      <a href="#reports" id="menu-pl">Profit & Loss</a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-emp-bill-analysis">Employee Wise Bill Analysis</a>
      <a href="#" id="menu-emp-product-analysis">Employee Wise Product Analysis</a>
      <a href="#" id="menu-emp-pending-bills">Employee Wise Pending Bills</a>
      <a href="#" id="menu-emp-collection">Employee Wise Collection</a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-cust-bill-analysis">Customer Wise Bill Analysis</a>
      <a href="#" id="menu-cust-product-analysis">Customer Wise Product Analysis</a>
      <a href="#" id="menu-cust-pending-bills">Customer Wise Pending Bills</a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-product-wise-analysis">Product Wise Analysis</a>
      <a href="#" id="menu-product-analysis-loc">Product Analysis Location Wise</a>
      <a href="#" id="menu-performance-sub">Performance ></a>
      <a href="#" id="menu-employee-attendance">Employee Attendance</a>
      <a href="#" id="menu-deactivated-items">Deactivated Items</a>
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
      <a href="#" id="menu-backup">Backup Database</a>
      <a href="#" id="menu-restore">Restore Database</a>
      <div class="dropdown-divider"></div>
      <a href="#" id="menu-logout">Logout</a>
    </div>
  </div>
  <div class="menu-item">
    <span class="menu-title">Help</span>
    <div class="dropdown-content">
      <a href="#" id="menu-about">About Material Ledger</a>
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
// cache bust
html = html.replace(/src="\/src\/main\.js\?v=[0-9]+"/g, `src="/src/main.js?v=${Date.now()}"`);

fs.writeFileSync("index.html", html);
console.log("Reconstructed exhaustive nav!");
