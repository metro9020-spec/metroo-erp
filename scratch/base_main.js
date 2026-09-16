import { state } from "./state.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderInventory, showProductMasterModal } from "./views/inventory.js";
import { renderTransactions } from "./views/transactions.js";
import { renderVouchers } from "./views/vouchers.js";
import { renderContacts, showAddContactModal, setContactTypeFilter } from "./views/contacts.js";
import { renderReports, setReportsActiveTab, setPartyReportTab } from "./views/reports.js";
import { renderAdmin } from "./views/admin.js";
import { renderGroups, renderLedger } from "./views/ledger.js";
import { renderAdjustments } from "./views/adjustments.js";
import { renderPresetLoading } from "./views/presetLoading.js";
import { renderSearchVouchers } from "./views/searchVouchers.js";
import { showWelcomeScreen, showEditCompanyModal } from "./views/login.js";

// Stackable Modal System polyfill
const modalRoot = document.getElementById("modal-container-root");
if (modalRoot) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  
  Object.defineProperty(modalRoot, "innerHTML", {
    get() {
      return originalDescriptor.get.call(modalRoot);
    },
    set(value) {
      if (value === "") {
        // Close/remove the topmost modal
        if (modalRoot.lastElementChild) {
          modalRoot.lastElementChild.remove();
        }
        return;
      }

      // Parse the incoming HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = value;

      // Extract all top-level elements (usually a div.modal-overlay)
      const children = Array.from(tempDiv.children);
      children.forEach((child) => {
        if (child.id) {
          // Remove existing modal with the same ID to prevent duplicates
          const existing = modalRoot.querySelector(`#${child.id}`);
          if (existing) {
            existing.remove();
          }
        }
        
        // Increase z-index of the stacked modal to ensure it lays on top
        if (child.classList.contains("modal-overlay")) {
          const currentCount = modalRoot.children.length;
          child.style.zIndex = String(2000 + currentCount * 10);
        }
        
        modalRoot.appendChild(child);
      });
    }
  });
}

// Routes Mapping
const routes = {
  dashboard: { title: "Dashboard Overview", render: renderDashboard },
  inventory: { title: "Inventory Stock Ledger", render: renderInventory },
  transactions: { title: "Transactions Log", render: renderTransactions },
  vouchers: { title: "Vouchers Ledger", render: renderVouchers },
  contacts: { title: "Contacts Directory", render: renderContacts },
  reports: { title: "Accounting Financial Statements", render: renderReports },
  admin: { title: "Admin Panel & Security Settings", render: renderAdmin },
  groups: { title: "Account Group Master", render: renderGroups },
  ledgers: { title: "Ledger Creation", render: renderLedger },
  adjustments: { title: "Sale/Purchase Adjustment Master", render: renderAdjustments },
  "preset-loading": { title: "Preset Loading Charges Configuration", render: renderPresetLoading },
  "search-vouchers": { title: "Search Vouchers", render: renderSearchVouchers }
};

const windowContainerEl = document.getElementById("active-window");
const windowTitleEl = document.getElementById("window-title-text");
const windowContentEl = document.getElementById("window-content-area");

// Route renderer
export function renderCurrentView() {
  const activeCompanyId = state.getActiveCompanyId();
  if (!activeCompanyId) {
    if (windowContainerEl) {
      windowContainerEl.classList.add("hidden");
    }
    return;
  }

  const hash = window.location.hash.substring(1) || "";
  
  if (!hash || hash === "home") {
    if (windowContainerEl) {
      windowContainerEl.classList.add("hidden");
    }
    return;
  }

  const route = routes[hash];
  if (!route) {
    if (windowContainerEl) {
      windowContainerEl.classList.add("hidden");
    }
    return;
  }

  if (windowContainerEl) {
    windowContainerEl.classList.remove("hidden");
  }
  if (windowTitleEl) {
    windowTitleEl.innerText = route.title;
  }

  // Render view template inside window body
  if (windowContentEl) {
    route.render(windowContentEl);
  }
}

// Router Event Listeners
window.addEventListener("hashchange", renderCurrentView);

state.subscribe(() => {
  const hasModal = document.getElementById("modal-container-root")?.children.length > 0;
  if (!hasModal) {
    renderCurrentView();
  }
});

// Initialize Theme Toggle
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

function initTheme() {
  document.documentElement.setAttribute("data-theme", "light");
  localStorage.setItem("erp_theme", "light");
  updateThemeIcon("light");
}

function updateThemeIcon(theme) {
  if (themeIcon) {
    if (theme === "light") {
      themeIcon.className = "fa-solid fa-moon";
      themeToggleBtn.setAttribute("title", "Switch to Dark Mode");
    } else {
      themeIcon.className = "fa-solid fa-sun";
      themeToggleBtn.setAttribute("title", "Switch to Light Mode");
    }
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("erp_theme", "light");
    updateThemeIcon("light");
  });
}

// Window controls click actions
const closeBtn = document.getElementById("win-btn-close");
const minimizeBtn = document.getElementById("win-btn-minimize");
const maximizeBtn = document.getElementById("win-btn-maximize");

if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    window.location.hash = "";
  });
}
if (minimizeBtn) {
  minimizeBtn.addEventListener("click", () => {
    if (windowContainerEl) {
      windowContainerEl.classList.add("hidden");
    }
  });
}
if (maximizeBtn) {
  maximizeBtn.addEventListener("click", () => {
    if (windowContainerEl) {
      windowContainerEl.classList.toggle("maximized");
    }
  });
}

// Left master sidebar buttons clicks
const btnProd = document.getElementById("sidebar-btn-product");
if (btnProd) {
  btnProd.addEventListener("click", () => {
    showProductMasterModal(windowContentEl, null, null);
  });
}

const btnCust = document.getElementById("sidebar-btn-customer");
if (btnCust) {
  btnCust.addEventListener("click", () => {
    showAddContactModal(document.getElementById("modal-container-root"), null, "customer");
  });
}

const btnVend = document.getElementById("sidebar-btn-vendor");
if (btnVend) {
  btnVend.addEventListener("click", () => {
    showAddContactModal(document.getElementById("modal-container-root"), null, "supplier");
  });
}

const btnEmp = document.getElementById("sidebar-btn-employee");
if (btnEmp) {
  btnEmp.addEventListener("click", () => {
    alert("Employee Registry: This module records attendance, salary allowances, and employee expense claims. Access key settings under Transaction ➔ Employee Expense Entry.");
  });
}

const btnCashbook = document.getElementById("sidebar-btn-cashbook");
if (btnCashbook) {
  btnCashbook.addEventListener("click", () => {
    import("./views/cashBankBook.js").then(m => {
      m.showCashBookModal(windowContentEl);
    });
  });
}

const btnBankbook = document.getElementById("sidebar-btn-bankbook");
if (btnBankbook) {
  btnBankbook.addEventListener("click", () => {
    import("./views/cashBankBook.js").then(m => {
      m.showBankBookModal(windowContentEl);
    });
  });
}

// Menu shortcuts
const menuResetDb = document.getElementById("menu-reset-db");
if (menuResetDb) {
  menuResetDb.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Are you sure you want to reset all database records to sample data?")) {
      state.resetToDefault();
      state.saveState();
      window.location.hash = "";
      alert("Database reset successfully.");
    }
  });
}

const menuClearDb = document.getElementById("menu-clear-db");
if (menuClearDb) {
  menuClearDb.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Are you sure you want to clear the database? All transactions, products, and contacts will be permanently deleted.")) {
      state.clearDatabase();
      window.location.hash = "";
      alert("Database cleared successfully.");
    }
  });
}

const menuAbout = document.getElementById("menu-about");
if (menuAbout) {
  menuAbout.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Material Ledger ERP v1.0.4\nA classic, high-performance batch-wise building materials inventory system with GST compliance.");
  });
}

const menuExit = document.getElementById("menu-exit");
if (menuExit) {
  menuExit.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = "";
  });
}

const menuProductMaster = document.getElementById("menu-product-master");
if (menuProductMaster) {
  menuProductMaster.addEventListener("click", (e) => {
    e.preventDefault();
    showProductMasterModal(windowContentEl, null, null);
  });
}

const menuUnitSettings = document.getElementById("menu-unit-settings");
if (menuUnitSettings) {
  menuUnitSettings.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/units.js").then(m => {
      m.showUnitSettingsModal(document.getElementById("modal-container-root"), null, null);
    });
  });
}

const menuCustomer = document.getElementById("menu-customer");
if (menuCustomer) {
  menuCustomer.addEventListener("click", (e) => {
    e.preventDefault();
    showAddContactModal(document.getElementById("modal-container-root"), null, "customer");
  });
}

const menuVendor = document.getElementById("menu-vendor");
if (menuVendor) {
  menuVendor.addEventListener("click", (e) => {
    e.preventDefault();
    showAddContactModal(document.getElementById("modal-container-root"), null, "supplier");
  });
}

const menuOptions = document.getElementById("menu-options");
if (menuOptions) {
  menuOptions.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/options.js").then(m => {
      m.showOptionsModal();
    });
  });
}

const menuGstMaster = document.getElementById("menu-gst-master");
if (menuGstMaster) {
  menuGstMaster.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/gstMaster.js").then(m => {
      m.showGstMasterModal();
    });
  });
}

const menuInfluencers = document.getElementById("menu-influencers");
if (menuInfluencers) {
  menuInfluencers.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/influencer.js").then(m => {
      m.showInfluencerMasterModal();
    });
  });
}

const menuContactsDirectory = document.getElementById("menu-contacts-directory");
if (menuContactsDirectory) {
  menuContactsDirectory.addEventListener("click", () => {
    setContactTypeFilter("all");
    window.location.hash = "#contacts";
  });
}

// Bind Purchase and Sales Menu Clicks to open transactional modals directly
const menuPurchase = document.getElementById("menu-purchase");
if (menuPurchase) {
  menuPurchase.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/selectSeriesModal.js").then(sm => {
      sm.showSelectBillSeriesModal("Purchase", (selectedSeries) => {
        import("./views/transactions.js").then(m => {
          m.showRecordPurchaseModal(windowContentEl, null, null, selectedSeries);
        });
      });
    });
  });
}

const menuSales = document.getElementById("menu-sales");
if (menuSales) {
  menuSales.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/selectSeriesModal.js").then(sm => {
      sm.showSelectBillSeriesModal("Sales", (selectedSeries) => {
        import("./views/transactions.js").then(m => {
          m.showInvoiceBuilderModal(windowContentEl, null, null, null, null, selectedSeries);
        });
      });
    });
  });
}

const menuPurchaseReturn = document.getElementById("menu-purchase-return");
if (menuPurchaseReturn) {
  menuPurchaseReturn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/transactions.js").then(m => {
      m.setTransactionsActiveTab("purchase-return");
      window.location.hash = "#transactions";
      m.showPurchaseReturnModal(windowContentEl);
    });
  });
}

const menuSalesReturn = document.getElementById("menu-sales-return");
if (menuSalesReturn) {
  menuSalesReturn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/transactions.js").then(m => {
      m.setTransactionsActiveTab("sales-return");
      window.location.hash = "#transactions";
      m.showSalesReturnModal(windowContentEl);
    });
  });
}

const menuSeriesMaster = document.getElementById("menu-series-master");
if (menuSeriesMaster) {
  menuSeriesMaster.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/seriesMaster.js").then(m => {
      m.showSeriesMasterModal(windowContentEl);
    });
  });
}

const menuStockAdjust = document.getElementById("menu-stock-adjust");
if (menuStockAdjust) {
  menuStockAdjust.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/transactions.js").then(m => {
      m.setTransactionsActiveTab("stock-adjust");
      window.location.hash = "#transactions";
      setTimeout(() => {
        const btn = document.getElementById("btn-stock-adjust-form");
        if (btn) btn.click();
      }, 50);
    });
  });
}

const menuProductLoosening = document.getElementById("menu-product-loosening");
if (menuProductLoosening) {
  menuProductLoosening.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/transactions.js").then(m => {
      m.setTransactionsActiveTab("stock-conversion");
      window.location.hash = "#transactions";
      setTimeout(() => {
        const btn = document.getElementById("btn-add-conversion");
        if (btn) btn.click();
      }, 50);
    });
  });
}
// Reports Menu Handlers
const bindReportMenuClick = (id, action) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", () => {
      action();
      // If we are already on #reports, renderCurrentView won't trigger automatically because hash hasn't changed.
      // So we force a reload.
      if (window.location.hash === "#reports") {
        renderCurrentView();
      }
    });
  }
};

bindReportMenuClick("menu-profit-loss", () => setReportsActiveTab("pl"));
bindReportMenuClick("menu-balance-sheet", () => setReportsActiveTab("bs"));
bindReportMenuClick("menu-trial-balance", () => setReportsActiveTab("trial"));
bindReportMenuClick("menu-individual-ledger", () => setReportsActiveTab("ledger"));
bindReportMenuClick("menu-ledger-group-summary", () => setReportsActiveTab("groupSummary"));
bindReportMenuClick("menu-tax-summary", () => setReportsActiveTab("tax"));
bindReportMenuClick("menu-customer-report", () => setPartyReportTab("customer"));
bindReportMenuClick("menu-vendor-report", () => setPartyReportTab("vendor"));
bindReportMenuClick("menu-debtors-report", () => setPartyReportTab("debtors"));
bindReportMenuClick("menu-creditors-report", () => setPartyReportTab("creditors"));
const menuStockRegisterBatch = document.getElementById("menu-stock-register-batch");
if (menuStockRegisterBatch) {
  menuStockRegisterBatch.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showBatchStockRegisterModal(windowContentEl);
    });
  });
}
const menuDayBook = document.getElementById("menu-day-book");
if (menuDayBook) {
  menuDayBook.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/dayBook.js").then(m => {
      m.showDayBookModal(windowContentEl);
    });
  });
}
const salesRepEl = document.getElementById("menu-sales-report-main");
if (salesRepEl) {
  salesRepEl.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/salesReport.js").then(m => {
      m.showSalesReportModal(windowContentEl);
    });
  });
}

const salesReturnRepEl = document.getElementById("menu-sales-return-report");
if (salesReturnRepEl) {
  salesReturnRepEl.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/transactions.js").then(m => {
      m.setTransactionsActiveTab("sales-return");
      window.location.hash = "#transactions";
    });
  });
}

const salesRepBillwiseMarginEl = document.getElementById("menu-sales-billwise-margin");
if (salesRepBillwiseMarginEl) {
  salesRepBillwiseMarginEl.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/salesReport.js").then(m => {
      m.showBillwiseMarginReportModal(windowContentEl);
    });
  });
}

const salesRepProductwiseMarginEl = document.getElementById("menu-sales-product-margin");
if (salesRepProductwiseMarginEl) {
  salesRepProductwiseMarginEl.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/salesReport.js").then(m => {
      m.showProductwiseMarginReportModal(windowContentEl);
    });
  });
}

const salesReportsSubmenuLinks = [
  { id: "menu-sales-free-items", title: "Sales Report [Free Items only]" },
  { id: "menu-sales-paymode", title: "Sales Report [Payment Mode wise]" },
  { id: "menu-sales-monthwise", title: "Month-wise Sales Report" },
  { id: "menu-sales-calendar", title: "Monthly Sales Calendar" },
  { id: "menu-sales-prod-analysis", title: "Product-wise Sales Analysis" },
  { id: "menu-sales-cust-analysis", title: "Customer-wise Sales Analysis" },
  { id: "menu-sales-adjust-rep", title: "Sales Adjustment Report" },
  { id: "menu-sales-company", title: "Company-wise Sales Report" },
  { id: "menu-sales-product", title: "Product-wise Sales Report" },
  { id: "menu-sales-category", title: "Category-wise Sales Report" },
  { id: "menu-sales-employee", title: "Employee-wise Sales Report" },
  { id: "menu-sales-cust-summary", title: "Customer-wise Sales Summary" },
  { id: "menu-sales-group-wise", title: "Product Group-wise Sales Report" },
  { id: "menu-sales-vendor-wise", title: "Vendor-wise Sales Report" },
  { id: "menu-sales-cust-prod-summary", title: "Customer-wise Product Sales Summary" }
];

salesReportsSubmenuLinks.forEach(link => {
  const el = document.getElementById(link.id);
  if (el) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      alert(`${link.title}: Generates detailed sales analytics. Enter Sales Invoice data to view these summaries.`);
    });
  }
});

const inventoryReportLinks = [
  { id: "menu-purchase-reports-sub", title: "Purchase Reports Analysis" },
  { id: "menu-canceled-bills", title: "Canceled Bills Registry" },
  { id: "menu-location-wise-stock", title: "Location Wise Stock Registry" },
  { id: "menu-stock-register-rack", title: "Rack-Wise Stock Register" },
  { id: "menu-external-stock-transfer", title: "External Stock Transfer Logs" },
  { id: "menu-stock-adjustment-report", title: "Stock Adjustment Summaries" },
  { id: "menu-external-stock-receipt", title: "External Stock Receipt Logs" },
  { id: "menu-internal-stock-transfer", title: "Internal Stock Transfer Logs" },
  { id: "menu-product-loosening-report", title: "Product Loosening Conversions" },
  { id: "menu-product-bundling-report", title: "Product Bundling / Packaging" },
  { id: "menu-serial-no-status", title: "Serial Number Traceability Status" },
  { id: "menu-quotation-report", title: "Sales Quotation Summaries" },
  { id: "menu-pricelist", title: "Standard Pricelist View" },
  { id: "menu-emp-bill-analysis", title: "Employee-Wise Bill Generation Analysis" },
  { id: "menu-emp-product-analysis", title: "Employee-Wise Product Item Sales Analysis" },
  { id: "menu-emp-pending-bills", title: "Employee-Wise Outstanding Dues & Pending Bills" },
  { id: "menu-emp-collection", title: "Employee-Wise Collection Sheets" },
  { id: "menu-cust-bill-analysis", title: "Customer-Wise Bill Analysis" },
  { id: "menu-cust-product-analysis", title: "Customer-Wise Product Sales breakdown" },
  { id: "menu-cust-pending-bills", title: "Customer-Wise Pending Invoices" },
  { id: "menu-product-wise-analysis", title: "Product-Wise Sales & Profitability Analysis" },
  { id: "menu-product-analysis-loc", title: "Location-Wise Product Stock & Sales Analysis" },
  { id: "menu-performance-sub", title: "Executive Sales Performance Reports" },
  { id: "menu-employee-attendance", title: "Employee Attendance Roll & Shift Register" },
  { id: "menu-deactivated-items", title: "Deactivated / Discontinued Product Master Registry" }
];

inventoryReportLinks.forEach(link => {
  const el = document.getElementById(link.id);
  if (el) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      alert(`${link.title}: This module compiles live summaries of transactions. Start generating logs under Transaction to populate data.`);
    });
  }
});

// Canceled bills submenu bindings
const mCanceledSales = document.getElementById("menu-canceled-sales-bills");
if (mCanceledSales) {
  mCanceledSales.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/canceledBills.js").then(m => {
      m.showCanceledBillsReportModal("sales", windowContentEl);
    });
  });
}
const mCanceledPurchase = document.getElementById("menu-canceled-purchase-bills");
if (mCanceledPurchase) {
  mCanceledPurchase.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/canceledBills.js").then(m => {
      m.showCanceledBillsReportModal("purchase", windowContentEl);
    });
  });
}

const taxReportLinks = [
  { id: "menu-input-gst-detailed", title: "Detailed Input GST Report" },
  { id: "menu-gst-purchase-product", title: "GST Purchase Report [Product Wise]" },
  { id: "menu-purchase-list", title: "Purchase List Report" },
  { id: "menu-output-gst-detailed", title: "Detailed Output GST Report" },
  { id: "menu-gst-sales-product", title: "GST Sales Report [Product Wise]" },
  { id: "menu-gst-sales-detailed", title: "GST Sales Report [Detailed]" },
  { id: "menu-sales-list", title: "Sales List Report" },
  { id: "menu-category-wise-gst", title: "Category Wise GST Report" },
  { id: "menu-consolidated-gst-sales", title: "Consolidated GST Sales Report" }
];

taxReportLinks.forEach(link => {
  const el = document.getElementById(link.id);
  if (el) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      alert(`${link.title}: Generates comprehensive GST taxation summaries. Start recording transactions to see logs.`);
    });
  }
});

const menuGstPurchaseHsn = document.getElementById("menu-gst-purchase-hsn");
if (menuGstPurchaseHsn) {
  menuGstPurchaseHsn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/gstHsnReports.js").then(m => {
      m.showGstPurchaseHsnModal();
    });
  });
}

const menuGstSalesHsn = document.getElementById("menu-gst-sales-hsn");
if (menuGstSalesHsn) {
  menuGstSalesHsn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/gstHsnReports.js").then(m => {
      m.showGstSalesHsnModal();
    });
  });
}

const menuGstVoucherSummary = document.getElementById("menu-gst-voucher-summary");
if (menuGstVoucherSummary) {
  menuGstVoucherSummary.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/gstVoucherSummary.js").then(m => {
      m.showGstVoucherSummaryModal();
    });
  });
}

const menuInputGst = document.getElementById("menu-input-gst");
if (menuInputGst) {
  menuInputGst.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showInputGstReportModal(windowContentEl);
    });
  });
}

const menuOutputGst = document.getElementById("menu-output-gst");
if (menuOutputGst) {
  menuOutputGst.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showOutputGstReportModal(windowContentEl);
    });
  });
}

const menuGstSalesReturn = document.getElementById("menu-gst-sales-return-report");
if (menuGstSalesReturn) {
  menuGstSalesReturn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showSalesReturnGstReportModal(windowContentEl);
    });
  });
}

const menuGstPurchaseReturn = document.getElementById("menu-gst-purchase-return-report");
if (menuGstPurchaseReturn) {
  menuGstPurchaseReturn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showPurchaseReturnGstReportModal(windowContentEl);
    });
  });
}

const menuStockRegisterDetailed = document.getElementById("menu-stock-register-detailed");
if (menuStockRegisterDetailed) {
  menuStockRegisterDetailed.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/inventory.js").then(m => {
      m.showDetailedStockRegisterModal(windowContentEl);
    });
  });
}

const menuItemWiseStock = document.getElementById("menu-item-wise-stock");
if (menuItemWiseStock) {
  menuItemWiseStock.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/inventory.js").then(m => {
      m.showItemWiseStockRegisterModal(windowContentEl);
    });
  });
}

const menuOpeningStockRegister = document.getElementById("menu-opening-stock-register");
if (menuOpeningStockRegister) {
  menuOpeningStockRegister.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/openingStock.js").then(m => {
      m.showOpeningStockEntryModal(windowContentEl);
    });
  });
}

const menuStockQuickView = document.getElementById("menu-stock-quick-view");
if (menuStockQuickView) {
  menuStockQuickView.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = "#inventory";
    setTimeout(() => {
      const searchInput = document.querySelector("#inv-search-input");
      if (searchInput) searchInput.focus();
    }, 50);
  });
}

// Keyboard shortcuts handlers
window.addEventListener("keydown", (e) => {
  // Enter key navigates to next form field
  if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.type !== "submit" && e.target.type !== "button" && !e.target.id.startsWith("ribbon-sale-") && !e.target.id.startsWith("ret-ribbon-")) {
    const form = e.target.closest("form");
    if (form) {
      e.preventDefault();
      const focusables = Array.from(form.querySelectorAll("input:not([disabled]):not([readonly]), select, textarea, button:not([type='button'])"));
      const idx = focusables.indexOf(e.target);
      if (idx > -1 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
      }
    }
  }

  // Ctrl+A saves the active form immediately if all mandatory fields are valid
  if (e.ctrlKey && e.key.toLowerCase() === "a") {
    let form = e.target.closest("form");
    if (!form) {
      const activeOverlay = document.querySelector(".modal-overlay.active");
      if (activeOverlay) {
        form = activeOverlay.querySelector("form");
      }
    }
    if (!form) {
      form = document.querySelector("form");
    }

    if (form) {
      e.preventDefault();
      if (form.checkValidity()) {
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          const submitEvent = new Event("submit", { cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      } else {
        form.reportValidity();
      }
    }
  }

  // ESC key: close modal or active window
  if (e.key === "Escape") {
    const root = document.getElementById("modal-container-root");
    const activeModals = root ? Array.from(root.children) : [];
    if (activeModals.length > 0) {
      const topmostModal = activeModals[activeModals.length - 1];
      const closeBtn = topmostModal.querySelector(".btn-secondary, button[id$='close-btn-header'], .modal-close-btn, #pl-groups-modal-close");
      if (closeBtn) {
        closeBtn.click();
      } else {
        topmostModal.remove();
      }
    } else {
      window.location.hash = "";
    }
  }
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
