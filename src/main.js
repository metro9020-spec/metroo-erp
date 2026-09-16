import { state } from "./state.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderInventory, showProductMasterModal } from "./views/inventory.js";
import { renderTransactions, showInvoiceBuilderModal, showRecordPurchaseModal, showPurchaseReturnModal, showSalesReturnModal, setTransactionsActiveTab } from "./views/transactions.js";
import { showSelectBillSeriesModal } from "./views/selectSeriesModal.js";
import { renderVouchers } from "./views/vouchers.js";
import { renderContacts, showAddContactModal, setContactTypeFilter } from "./views/contacts.js";
import { 
  renderReports, 
  setReportsActiveTab, 
  setPartyReportTab,
  renderProfitLossReport,
  renderBalanceSheetReport,
  renderOpeningBalanceSheetReport,
  renderTrialBalanceReport,
  renderTaxSummaryReport,
  renderIndividualLedgerReport,
  renderGroupSummaryReport,
  renderPartiesReportView,
  showProfitLossModal,
  showBalanceSheetModal,
  showOpeningBalanceSheetModal,
  showTrialBalanceModal,
  showTaxSummaryReportModal,
  showPartiesReportModal,
  showIndividualLedgerModal,
  showGroupSummaryModal
} from "./views/reports.js";
import { renderAdmin } from "./views/admin.js";
import { renderGroups, renderLedger } from "./views/ledger.js";
import { renderAdjustments } from "./views/adjustments.js";
import { renderPresetLoading } from "./views/presetLoading.js";
import { renderHeadloaderReport } from "./views/headloaderReport.js";
import { renderSearchVouchers } from "./views/searchVouchers.js";
import { showWelcomeScreen, showEditCompanyModal } from "./views/login.js";
import { showGstr1OfflineModal } from "./views/gstr1OfflineModal.js";
import { renderOpeningStockRegisterReport } from "./views/openingStock.js";
import { initGlobalWindowManager } from "./utils/draggable.js";

window._getApiUrl = function(endpoint) {
  // If loaded directly from server.js (e.g. port 3001), always use relative endpoint to avoid IP mismatch
  if (window.location.port === "3001") {
    return endpoint;
  }

  try {
    const activeCompId = (typeof state !== "undefined" && state.activeCompanyId) 
      ? state.activeCompanyId 
      : localStorage.getItem("erp_active_company_id");
      
    const rawComps = localStorage.getItem("erp_companies");
    const companies = (typeof state !== "undefined" && state.companies && state.companies.length > 0) 
      ? state.companies 
      : (rawComps ? JSON.parse(rawComps) : []);
      
    if (Array.isArray(companies) && companies.length > 0) {
      let targetCo = companies.find(c => String(c.id) === String(activeCompId));
      if (!targetCo) targetCo = companies[0];
      
      if (targetCo && targetCo.serverUrl) {
        const cleanBase = String(targetCo.serverUrl).trim().replace(/\/+$/, "");
        if (cleanBase && !cleanBase.includes(window.location.host)) {
          return `${cleanBase}${endpoint}`;
        }
      }
    }
  } catch (e) {}

  // If running locally in Vite dev server (e.g. port 5173, 5174), target backend on port 3001
  if (window.location.port === "5173" || window.location.port === "5174") {
    return `${window.location.protocol}//${window.location.hostname}:3001${endpoint}`;
  }
  return endpoint;
};

// DOM Elements helper
export function getWindowContentEl() {
  return document.getElementById("window-content-area") || document.getElementById("window-content");
}

export function renderCurrentView() {
  const windowContentEl = getWindowContentEl();
  const hash = window.location.hash.slice(1);

  const activeWin = document.getElementById("active-window");
  if (!hash) {
    if (activeWin) activeWin.classList.add("hidden");
    if (windowContentEl) windowContentEl.innerHTML = "";
    return;
  }

  // Show active desktop window if element exists
  if (activeWin) {
    activeWin.classList.remove("hidden");
  }

  // Update Window Title Header
  const titleTextEl = document.getElementById("window-title-text");
  if (titleTextEl) {
    const titleMap = {
      dashboard: "DASHBOARD",
      inventory: "INVENTORY MASTER & STOCK REGISTER",
      transactions: "TRANSACTIONS & INVOICE MANAGEMENT",
      vouchers: "VOUCHER ENTRY & ACCOUNT LOGS",
      contacts: "CONTACTS DIRECTORY (CUSTOMERS & VENDORS)",
      reports: "FINANCIAL & TAXATION REPORTS",
      "profit-loss": "PROFIT & LOSS STATEMENT",
      "pnl": "PROFIT & LOSS STATEMENT",
      "balance-sheet": "BALANCE SHEET REPORT",
      "opening-balance-sheet": "OPENING BALANCE SHEET REPORT",
      "obs": "OPENING BALANCE SHEET REPORT",
      "trial-balance": "TRIAL BALANCE REPORT",
      "tax-summary": "GST & TAX SUMMARY REPORT",
      "gst-summary": "GST & TAX SUMMARY REPORT",
      "individual-ledger": "INDIVIDUAL LEDGER STATEMENT",
      "ledger-group-summary": "LEDGER GROUP SUMMARY REPORT",
      "group-summary": "LEDGER GROUP SUMMARY REPORT",
      "customer-report": "CUSTOMER REPORT",
      "vendor-report": "VENDOR REPORT",
      "debtors-report": "SUNDRY DEBTORS REPORT",
      "creditors-report": "SUNDRY CREDITORS REPORT",
      "parties-report": "PARTIES & LEDGER REPORT",
      admin: "ADMIN SETTINGS & SECURITY CONFIGURATION",
      ledger: "LEDGER CREATION & CHART OF ACCOUNTS",
      groups: "ACCOUNT GROUPS CREATION",
      adjustments: "SALE / PURCHASE ADJUSTMENTS MASTER",
      "preset-loading": "PRESET LOADING CONFIGURATION",
      "headloader-report": "HEADLOADER (LOADING & UNLOADING) REPORT",
      "loading-unloading-report": "HEADLOADER (LOADING & UNLOADING) REPORT",
      "search-vouchers": "VOUCHER SEARCH REGISTRY",
      "opening-stock-register": "OPENING STOCK REGISTER & ENTRY",
      "opening-stock": "OPENING STOCK REGISTER & ENTRY"
    };
    titleTextEl.textContent = titleMap[hash] || hash.toUpperCase();
  }

  // Bind Desktop Window Header Controls
  const closeBtn = document.getElementById("win-btn-close");
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.addEventListener("click", () => {
      if (activeWin) activeWin.classList.add("hidden");
      window.location.hash = "";
    });
    closeBtn.dataset.bound = "true";
  }

  const minBtn = document.getElementById("win-btn-minimize");
  if (minBtn && !minBtn.dataset.bound) {
    minBtn.addEventListener("click", () => {
      if (activeWin) activeWin.classList.toggle("hidden");
    });
    minBtn.dataset.bound = "true";
  }

  const maxBtn = document.getElementById("win-btn-maximize");
  if (maxBtn && !maxBtn.dataset.bound) {
    maxBtn.addEventListener("click", () => {
      if (activeWin) {
        activeWin.classList.toggle("maximized");
      }
    });
    maxBtn.dataset.bound = "true";
  }

  if (windowContentEl) {
    windowContentEl.innerHTML = "";
  } else {
    console.warn("Window content element not found.");
    return;
  }

  switch (hash) {
    case "login":
      break;
    case "dashboard":
      renderDashboard(windowContentEl);
      break;
    case "inventory":
    case "products-list":
    case "stock-register":
    case "stock-register-detailed":
    case "stock-quick-view":
      renderInventory(windowContentEl);
      break;
    case "transactions":
    case "transaction-log":
      renderTransactions(windowContentEl);
      break;
    case "vouchers":
      renderVouchers(windowContentEl);
      break;
    case "contacts":
    case "contacts-directory":
      renderContacts(windowContentEl);
      break;
    case "profit-loss":
    case "pnl":
      setReportsActiveTab("pl");
      showProfitLossModal();
      break;
    case "balance-sheet":
      setReportsActiveTab("bs");
      showBalanceSheetModal();
      break;
    case "opening-balance-sheet":
    case "obs":
      setReportsActiveTab("obs");
      showOpeningBalanceSheetModal();
      break;
    case "trial-balance":
      setReportsActiveTab("trial");
      showTrialBalanceModal();
      break;
    case "tax-summary":
    case "gst-summary":
      setReportsActiveTab("tax");
      showTaxSummaryReportModal();
      break;
    case "individual-ledger":
      setReportsActiveTab("ledger");
      showIndividualLedgerModal();
      break;
    case "ledger-group-summary":
    case "group-summary":
      setReportsActiveTab("groupSummary");
      showGroupSummaryModal();
      break;
    case "opening-stock-register":
    case "opening-stock":
      renderOpeningStockRegisterReport(windowContentEl);
      break;
    case "customer-report":
      setPartyReportTab("customer");
      showPartiesReportModal("customer");
      break;
    case "vendor-report":
      setPartyReportTab("vendor");
      showPartiesReportModal("vendor");
      break;
    case "debtors-report":
      setPartyReportTab("debtors");
      showPartiesReportModal("debtors");
      break;
    case "creditors-report":
      setPartyReportTab("creditors");
      showPartiesReportModal("creditors");
      break;
    case "parties-report":
      showPartiesReportModal();
      break;
    case "reports":
      renderReports(windowContentEl);
      break;
    case "admin":
      {
        const currentUser = state.getCurrentUser();
        if (!currentUser || currentUser.role !== "Admin") {
          alert("Access Restricted! Only Admin users can view Admin settings.");
          window.location.hash = "#dashboard";
        } else {
          renderAdmin(windowContentEl);
        }
      }
      break;
    case "ledger":
    case "ledgers":
      renderLedger(windowContentEl);
      break;
    case "groups":
      renderGroups(windowContentEl);
      break;
    case "adjustments":
      renderAdjustments(windowContentEl);
      break;
    case "preset-loading":
    case "presetLoading":
      renderPresetLoading(windowContentEl);
      break;
    case "headloader-report":
    case "headloaderReport":
    case "loading-unloading-report":
      if (state.getOptions().enableHeadloader === false) {
        alert("Headloader (Loading & Unloading) Report is disabled in Options.");
        window.location.hash = "#dashboard";
        break;
      }
      renderHeadloaderReport(windowContentEl);
      break;
    case "search-vouchers":
    case "searchVouchers":
      renderSearchVouchers(windowContentEl);
      break;
    default:
      renderDashboard(windowContentEl);
      break;
  }
}

window.addEventListener("hashchange", renderCurrentView);
window.addEventListener("erp:data-refreshed", renderCurrentView);





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
    showProductMasterModal(getWindowContentEl(), null, null);
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

const menuUserManagement = document.getElementById("menu-user-management");
if (menuUserManagement) {
  menuUserManagement.addEventListener("click", (e) => {
    e.preventDefault();
    const currentUser = state.getCurrentUser();
    if (!currentUser || currentUser.role !== "Admin") {
      alert("Access Restricted! Only Admin users can access User Management.");
      return;
    }
    import("./views/userManagement.js").then(m => {
      m.renderUserManagementModal();
    });
  });
}

// Check role permissions and restrict non-admin users from accessing Admin menus
function enforceUserRolePermissions() {
  const currentUser = state.getCurrentUser();
  const isAdmin = currentUser && currentUser.role === "Admin";

  // Hide or disable Admin menu options for non-admins
  const adminMenuTitle = document.querySelector(".menu-item:has(#menu-user-management), .menu-item:has(#menu-edit-company)");
  if (adminMenuTitle) {
    adminMenuTitle.style.display = isAdmin ? "" : "none";
  }

  const menuChangePasswordLink = document.getElementById("menu-change-password");
  if (menuChangePasswordLink) {
    menuChangePasswordLink.style.display = isAdmin ? "none" : "";
  }

  const menuClearDbLink = document.getElementById("menu-clear-db");
  if (menuClearDbLink) {
    menuClearDbLink.style.display = isAdmin ? "" : "none";
  }
}

// Update header displaying current user and company
function updateHeaderUserTag() {
  const headerCompanyTag = document.getElementById("header-company-name");
  if (headerCompanyTag) {
    const activeCompanyId = state.getActiveCompanyId();
    const company = state.getRegisteredCompanies().find(c => String(c.id) === String(activeCompanyId));
    const currentUser = state.getCurrentUser();
    const cName = company ? company.name : "Company";
    const uName = currentUser ? `${currentUser.fullName || currentUser.username} (${currentUser.role || "Admin"})` : "Admin";
    headerCompanyTag.textContent = `${uName} - ${cName}`;
  }
  enforceUserRolePermissions();
}
updateHeaderUserTag();
state.subscribe(updateHeaderUserTag);

export function updateDynamicMenuVisibility() {
  const options = state.getOptions();
  const isUnregistered = state.isCompanyUnregistered && state.isCompanyUnregistered();

  const menuHeadloader = document.getElementById("menu-headloader-utility");
  if (menuHeadloader) {
    menuHeadloader.style.display = options.enableHeadloader !== false ? "" : "none";
  }

  // Hide Tax Reports top navigation menu if company is unregistered
  const menuItems = document.querySelectorAll(".erp-menu-bar .menu-item");
  menuItems.forEach(item => {
    const title = item.querySelector(".menu-title");
    if (title && title.textContent.trim() === "Tax Reports") {
      item.style.display = isUnregistered ? "none" : "";
    }
  });

  // Hide GST specific sub-menus if company is unregistered
  const gstMenuItems = [
    "menu-gst-purchase-product",
    "menu-gst-sales-product",
    "menu-gst-purchase-hsn",
    "menu-gst-sales-hsn",
    "menu-gst-master"
  ];
  gstMenuItems.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isUnregistered ? "none" : "";
  });
}
updateDynamicMenuVisibility();
state.subscribe(updateDynamicMenuVisibility);

const menuOptions = document.getElementById("menu-options");
if (menuOptions) {
  menuOptions.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/options.js").then(m => {
      m.showOptionsModal();
    });
  });
}

const menuChangePassword = document.getElementById("menu-change-password");
if (menuChangePassword) {
  menuChangePassword.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/options.js").then(m => {
      m.showChangePasswordModal();
    });
  });
}

const menuClearDb = document.getElementById("menu-clear-db");
if (menuClearDb) {
  menuClearDb.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/clearDatabaseModal.js").then(m => {
      m.showClearDatabaseModal();
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

const menuYearEnding = document.getElementById("menu-year-ending");
if (menuYearEnding) {
  menuYearEnding.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/yearEnding.js").then(m => {
      m.showYearEndingModal();
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

const menuLoyaltyPrograms = document.getElementById("menu-loyalty-programs");
if (menuLoyaltyPrograms) {
  menuLoyaltyPrograms.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/loyaltyMaster.js").then(m => {
      m.showLoyaltyMasterModal();
    });
  });
}

const menuLoyaltyReport = document.getElementById("menu-loyalty-report");
if (menuLoyaltyReport) {
  menuLoyaltyReport.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/loyaltyReport.js").then(m => {
      m.showLoyaltyReportModal();
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
    showSelectBillSeriesModal("Purchase", (selectedSeries) => {
      showRecordPurchaseModal(getWindowContentEl(), null, null, selectedSeries);
    });
  });
}

const menuSales = document.getElementById("menu-sales");
if (menuSales) {
  menuSales.addEventListener("click", (e) => {
    e.preventDefault();
    showSelectBillSeriesModal("Sales", (selectedSeries) => {
      showInvoiceBuilderModal(getWindowContentEl(), null, null, null, null, selectedSeries);
    });
  });
}

const menuPurchaseReturn = document.getElementById("menu-purchase-return");
if (menuPurchaseReturn) {
  menuPurchaseReturn.addEventListener("click", (e) => {
    e.preventDefault();
    setTransactionsActiveTab("purchase-return");
    window.location.hash = "#transactions";
    showPurchaseReturnModal(getWindowContentEl());
  });
}

const menuSalesReturn = document.getElementById("menu-sales-return");
if (menuSalesReturn) {
  menuSalesReturn.addEventListener("click", (e) => {
    e.preventDefault();
    setTransactionsActiveTab("sales-return");
    window.location.hash = "#transactions";
    showSalesReturnModal(getWindowContentEl());
  });
}

const menuSeriesMaster = document.getElementById("menu-series-master");
if (menuSeriesMaster) {
  menuSeriesMaster.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/seriesMaster.js").then(m => {
      m.showSeriesMasterModal(getWindowContentEl());
    });
  });
}

const menuResequenceEngine = document.getElementById("menu-resequence-engine");
if (menuResequenceEngine) {
  menuResequenceEngine.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Execute Series Resequencing Engine?\n\nThis will re-adjust all invoice and purchase numbers chronologically per series continuously (1, 2, 3...) to fill skipped numbers and eliminate gaps.")) {
      state.resequenceSeriesVoucherNumbers(true);
      state.realignSeriesCurrentNumbers();
      alert("Resequencing Engine finished successfully!\n\nAll bill series numbers are now 100% continuous with zero skipped numbers.");
      window.location.hash = "#admin";
    }
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

const bindMergeBatchesClick = (id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/inventory.js").then(m => {
        m.showMergeBatchesModal(null, null, () => {
          renderCurrentView();
        });
      });
    });
  }
};
bindMergeBatchesClick("menu-merge-batches");
bindMergeBatchesClick("menu-merge-batches-inv");

const menuVouchers = document.getElementById("menu-vouchers");
if (menuVouchers) {
  menuVouchers.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/vouchers.js").then(m => {
      m.resetVoucherLauncher();
      window.location.hash = "#vouchers";
      renderCurrentView();
    });
  });
}
function isReportOrLayoutOpen() {
  const activeWin = document.getElementById("active-window");
  const hasActiveHash = window.location.hash && window.location.hash !== "#dashboard" && window.location.hash !== "#login";
  const isWinVisible = activeWin && !activeWin.classList.contains("hidden");
  const hasActiveModal = Boolean(document.querySelector(".modal-overlay.active"));
  return Boolean((hasActiveHash && isWinVisible) || hasActiveModal);
}

// Reports Menu Handlers
const bindReportMenuClick = (id, action) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      action();
    });
  }
};

bindReportMenuClick("menu-profit-loss", () => { setReportsActiveTab("pl"); showProfitLossModal(); });
bindReportMenuClick("menu-balance-sheet", () => { setReportsActiveTab("bs"); showBalanceSheetModal(); });
bindReportMenuClick("menu-opening-balance-sheet", () => { setReportsActiveTab("obs"); showOpeningBalanceSheetModal(); });
bindReportMenuClick("menu-trial-balance", () => { setReportsActiveTab("trial"); showTrialBalanceModal(); });
bindReportMenuClick("menu-individual-ledger", () => { setReportsActiveTab("ledger"); showIndividualLedgerModal(); });
bindReportMenuClick("menu-ledger-group-summary", () => { setReportsActiveTab("groupSummary"); showGroupSummaryModal(); });
bindReportMenuClick("menu-tax-summary", () => { setReportsActiveTab("tax"); showTaxSummaryReportModal(); });
bindReportMenuClick("menu-customer-report", () => { setPartyReportTab("customer"); showPartiesReportModal("customer"); });
bindReportMenuClick("menu-vendor-report", () => { setPartyReportTab("vendor"); showPartiesReportModal("vendor"); });
const menuStockRegisterBatch = document.getElementById("menu-stock-register-batch");
if (menuStockRegisterBatch) {
  menuStockRegisterBatch.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showBatchStockRegisterModal(getWindowContentEl());
    });
  });
}
const menuDayBook = document.getElementById("menu-day-book");
if (menuDayBook) {
  menuDayBook.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/dayBook.js").then(m => {
      m.showDayBookModal(getWindowContentEl());
    });
  });
}
const salesRepEl = document.getElementById("menu-sales-report-main");
if (salesRepEl) {
  salesRepEl.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/salesReport.js").then(m => {
      m.showSalesReportModal(getWindowContentEl());
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
      m.showBillwiseMarginReportModal(getWindowContentEl());
    });
  });
}

const salesRepProductwiseMarginEl = document.getElementById("menu-sales-product-margin");
if (salesRepProductwiseMarginEl) {
  salesRepProductwiseMarginEl.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/salesReport.js").then(m => {
      m.showProductwiseMarginReportModal(getWindowContentEl());
    });
  });
}

  const salesProductReportEl = document.getElementById("menu-sales-product");
  if (salesProductReportEl) {
    salesProductReportEl.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/productWiseSalesReport.js").then(m => {
        m.showProductWiseDetailedReportModal(getWindowContentEl());
      }).catch(err => {
        console.error("Failed to load product wise sales report", err);
      });
    });
  }

  const salesCategoryReportEl = document.getElementById("menu-sales-category");
  if (salesCategoryReportEl) {
    salesCategoryReportEl.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/productWiseSalesReportActual.js").then(m => {
        m.showProductWiseSalesReportActualModal(getWindowContentEl());
      }).catch(err => {
        console.error("Failed to load product wise sales report", err);
      });
    });
  }

  const purchaseRepEl = document.getElementById("menu-purchase-report-main");
  if (purchaseRepEl) {
    purchaseRepEl.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/purchaseReport.js").then(m => {
        m.showPurchaseReportModal(getWindowContentEl());
      });
    });
  }

  const purchaseReturnRepEl = document.getElementById("menu-purchase-return-report");
  if (purchaseReturnRepEl) {
    purchaseReturnRepEl.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/reports.js").then(m => {
        m.showGstPurchaseReturnReportModal(getWindowContentEl());
      });
    });
  }

  const vendorWisePurchaseRepEl = document.getElementById("menu-vendor-wise-purchase-analysis");
  if (vendorWisePurchaseRepEl) {
    vendorWisePurchaseRepEl.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/purchaseReport.js").then(m => {
        m.showVendorWisePurchaseAnalysisModal(getWindowContentEl());
      });
    });
  }

  const productWisePurchaseRepEl = document.getElementById("menu-product-wise-purchase-report");
  if (productWisePurchaseRepEl) {
    productWisePurchaseRepEl.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/purchaseReport.js").then(m => {
        m.showProductWisePurchaseReportModal(getWindowContentEl());
      });
    });
  }

  const categoryWisePurchaseRepEl = document.getElementById("menu-category-wise-purchase-report");
  if (categoryWisePurchaseRepEl) {
    categoryWisePurchaseRepEl.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/purchaseReport.js").then(m => {
        m.showCategoryWisePurchaseReportModal(getWindowContentEl());
      });
    });
  }

  const companyWisePurchaseRepEl = document.getElementById("menu-company-wise-purchase-report");
  if (companyWisePurchaseRepEl) {
    companyWisePurchaseRepEl.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/purchaseReport.js").then(m => {
        m.showCompanyWisePurchaseReportModal(getWindowContentEl());
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
  { id: "menu-cust-pending-bills", title: "Customer-Wise Pending Invoices" }
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
      m.showCanceledBillsReportModal("sales", getWindowContentEl());
    });
  });
}
const mCanceledPurchase = document.getElementById("menu-canceled-purchase-bills");
if (mCanceledPurchase) {
  mCanceledPurchase.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/canceledBills.js").then(m => {
      m.showCanceledBillsReportModal("purchase", getWindowContentEl());
    });
  });
}

const taxReportLinks = [
  { id: "menu-input-gst-detailed", title: "Detailed Input GST Report" },
  { id: "menu-gst-purchase-hsn", title: "GST Purchase Report [HSN/SAC Code]" },
  { id: "menu-gst-purchase-product", title: "GST Purchase Report [Product Wise]" },
  { id: "menu-purchase-list", title: "Purchase List Report" },
  { id: "menu-output-gst-detailed", title: "Detailed Output GST Report" },
  { id: "menu-gst-sales-product", title: "GST Sales Report [Product Wise]" },
  { id: "menu-gst-sales-detailed", title: "GST Sales Report [Detailed]" },
  { id: "menu-sales-list", title: "Sales List Report" },
  { id: "menu-category-wise-gst", title: "Category Wise GST Report" },
  { id: "menu-gst-sales-return-report", title: "GST Sales Return Report" },
  { id: "menu-gst-purchase-return-report", title: "GST Purchase Return Report" },
  { id: "menu-consolidated-gst-sales", title: "Consolidated GST Sales Report" }
];

taxReportLinks.forEach(link => {
  if (link.id === "menu-gst-sales-return-report" || link.id === "menu-gst-purchase-return-report") return;
  const el = document.getElementById(link.id);
  if (el) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      alert(`${link.title}: Generates comprehensive GST taxation summaries. Start recording transactions to see logs.`);
    });
  }
});

const menuGstSalesReturn = document.getElementById("menu-gst-sales-return-report");
if (menuGstSalesReturn) {
  menuGstSalesReturn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showGstSalesReturnReportModal();
    });
  });
}

const menuGstPurchaseReturn = document.getElementById("menu-gst-purchase-return-report");
if (menuGstPurchaseReturn) {
  menuGstPurchaseReturn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showGstPurchaseReturnReportModal();
    });
  });
}

const menuGstr1Offline = document.getElementById("menu-gstr1-offline");
if (menuGstr1Offline) {
  menuGstr1Offline.addEventListener("click", (e) => {
    e.preventDefault();
    showGstr1OfflineModal();
  });
}

const menuGstSalesHsn = document.getElementById("menu-gst-sales-hsn");
if (menuGstSalesHsn) {
  menuGstSalesHsn.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showGstSalesReportHsnModal();
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
      m.showInputGstReportModal(getWindowContentEl());
    });
  });
}

const menuOutputGst = document.getElementById("menu-output-gst");
if (menuOutputGst) {
  menuOutputGst.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/reports.js").then(m => {
      m.showOutputGstReportModal(getWindowContentEl());
    });
  });
}

const menuStockRegisterDetailed = document.getElementById("menu-stock-register-detailed");
if (menuStockRegisterDetailed) {
  menuStockRegisterDetailed.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/inventory.js").then(m => {
      m.showDetailedStockRegisterModal(getWindowContentEl());
    });
  });
}

const menuItemWiseStock = document.getElementById("menu-item-wise-stock");
if (menuItemWiseStock) {
  menuItemWiseStock.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/inventory.js").then(m => {
      m.showItemWiseStockRegisterModal(getWindowContentEl());
    });
  });
}

const menuStockRegister = document.getElementById("menu-stock-register");
if (menuStockRegister) {
  menuStockRegister.addEventListener("click", (e) => {
    e.preventDefault();
    import("./views/inventory.js").then(m => {
      m.showDetailedStockRegisterModal(getWindowContentEl());
    });
  });
}

const bindOpeningStockMenuClick = (id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/openingStock.js").then(m => {
        if (isReportOrLayoutOpen() && typeof m.showOpeningStockRegisterModal === "function") {
          m.showOpeningStockRegisterModal();
        } else {
          window.location.hash = "#opening-stock-register";
        }
      });
    });
  }
};
bindOpeningStockMenuClick("menu-opening-stock-register");
bindOpeningStockMenuClick("menu-opening-stock-report");

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
  if (e.key === "Enter" && !e.target.closest("#select-series-modal") && e.target.tagName !== "TEXTAREA" && e.target.type !== "submit" && e.target.type !== "button" && !e.target.id.startsWith("ribbon-sale-") && !e.target.id.startsWith("ret-ribbon-")) {
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
    const subPopup = document.querySelector("#btn-close-search-popup");
    if (subPopup) return;

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

  // F2: Product Master
  if (e.key === "F2") {
    e.preventDefault();
    showProductMasterModal(getWindowContentEl(), null, null);
  }

  // F10: Products List
  if (e.key === "F10") {
    e.preventDefault();
    const modalActive = document.querySelector(".modal-overlay.active");
    if (modalActive) {
      modalActive.classList.remove("active");
      const root = document.getElementById("modal-container-root");
      if (root) root.innerHTML = "";
    }
    window.location.hash = "#inventory";
  }

  // F3: Purchase Bill
  if (e.key === "F3") {
    e.preventDefault();
    setTransactionsActiveTab("purchase");
    showSelectBillSeriesModal("Purchase", (selectedSeries) => {
      showRecordPurchaseModal(getWindowContentEl(), null, null, selectedSeries);
    });
  }

  // F4: Sales Invoice
  if (e.key === "F4") {
    e.preventDefault();
    setTransactionsActiveTab("sales");
    showSelectBillSeriesModal("Sales", (selectedSeries) => {
      showInvoiceBuilderModal(getWindowContentEl(), state.getContacts().filter(c => c && (c.type === "customer" || c.listInCustomerList === true)), state.getMaterials(), null, null, selectedSeries);
    });
  }

  // F5: Voucher Entry
  if (e.key === "F5") {
    e.preventDefault();
    import("./views/vouchers.js").then(m => {
      m.resetVoucherLauncher();
      window.location.hash = "#vouchers";
      renderCurrentView();
    });
  }

  // Ctrl + U: Customers
  if (e.ctrlKey && e.key.toLowerCase() === "u") {
    e.preventDefault();
    showAddContactModal(document.getElementById("modal-container-root"), null, "customer");
  }

  // Ctrl + O: Vendors
  if (e.ctrlKey && e.key.toLowerCase() === "o") {
    e.preventDefault();
    showAddContactModal(document.getElementById("modal-container-root"), null, "supplier");
  }

  // Ctrl + M: Employees
  if (e.ctrlKey && e.key.toLowerCase() === "m") {
    e.preventDefault();
    const btn = document.getElementById("sidebar-btn-employee");
    if (btn) {
      btn.click();
    } else {
      alert("Employee Registry: This module records attendance, salary allowances, and employee expense claims. Access key settings under Transaction ➔ Employee Expense Entry.");
    }
  }

  // Ctrl + F1: Stock Register
  if (e.ctrlKey && e.key === "F1") {
    e.preventDefault();
    window.location.hash = "#inventory";
  }

  // Ctrl + F2: Stock Register Detailed
  if (e.ctrlKey && e.key === "F2") {
    e.preventDefault();
    const btn = document.getElementById("menu-stock-register-detailed");
    if (btn) btn.click();
  }

  // Ctrl + F: Stock Quick View
  if (e.ctrlKey && e.key.toLowerCase() === "f") {
    e.preventDefault();
    const btn = document.getElementById("menu-stock-quick-view");
    if (btn) btn.click();
  }

  // Ctrl + P: Pricelist View
  if (e.ctrlKey && e.key.toLowerCase() === "p") {
    e.preventDefault();
    const btn = document.getElementById("menu-pricelist");
    if (btn) btn.click();
  }

  // Ctrl + L: Individual Ledger Report
  if (e.ctrlKey && e.key.toLowerCase() === "l") {
    e.preventDefault();
    setReportsActiveTab("ledger");
    window.location.hash = "#reports";
    if (window.location.hash === "#reports") {
      renderCurrentView();
    }
  }

  // Ctrl + T: Financial Reports
  if (e.ctrlKey && e.key.toLowerCase() === "t") {
    e.preventDefault();
    window.location.hash = "#reports";
  }
  // F7: Change Date
  if (e.key === "F7") {
    e.preventDefault();
    showChangeDateModal();
  }
});

// Update sidebar current date display
function updateSidebarDate() {
  const el = document.getElementById("sidebar-date-value");
  if (!el) return;
  const dateStr = state.getLoginDate();
  if (!dateStr) { el.textContent = ""; return; }
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  el.textContent = `${day}-${months[d.getMonth()]}-${d.getFullYear()}  ${days[d.getDay()]}`;
}

// Clicking on the sidebar date also opens Change Date
document.getElementById("sidebar-current-date")?.addEventListener("click", () => showChangeDateModal());

// Change Date modal (F7)
function showChangeDateModal() {
  if (!state.getActiveCompanyId()) return;

  // Remove existing modal if open
  const existing = document.getElementById("change-date-modal-overlay");
  if (existing) existing.remove();

  const currentDate = state.getLoginDate();
  const fyStart = state.getActiveFinancialYearStartDate() || "";

  const overlay = document.createElement("div");
  overlay.id = "change-date-modal-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15,23,42,0.35); backdrop-filter: blur(1px);
    display: flex; justify-content: center; align-items: center;
    z-index: 9999;
  `;

  overlay.innerHTML = `
    <div style="width: 420px; background: #cbd5e1; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); font-family: var(--font-body); font-size: 0.85rem;">
      <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 6px 12px; font-weight: 700; font-size: 0.9rem; border-radius: 2px 2px 0 0;">
        <i class="fa-solid fa-calendar-days"></i> CHANGE DATE
      </div>
      <div style="padding: 20px; background: #e2e8f0; margin: 8px; border: 1px solid #94a3b8; border-radius: 3px;">
        <div style="display: flex; align-items: center; gap: 12px; justify-content: center;">
          <label style="font-weight: 700; color: #1e3b8b; font-size: 0.85rem;">Date</label>
          <input type="date" id="change-date-input" value="${currentDate}" ${fyStart ? `min="${fyStart}"` : ''}
            style="padding: 5px 10px; border: 1px solid #94a3b8; border-radius: 3px; font-size: 0.9rem; background: white; font-weight: 600;">
        </div>
      </div>
      <div style="display: flex; justify-content: center; gap: 12px; padding: 8px 12px 12px;">
        <button id="change-date-ok" style="padding: 5px 28px; background: #1e3b8b; color: white; border: 1px solid #1d4ed8; border-radius: 3px; font-weight: 700; cursor: pointer; font-size: 0.85rem;">OK</button>
        <button id="change-date-cancel" style="padding: 5px 20px; background: #cbd5e1; color: #334155; border: 1px solid #94a3b8; border-radius: 3px; font-weight: 700; cursor: pointer; font-size: 0.85rem;">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const dateInput = document.getElementById("change-date-input");
  const okBtn = document.getElementById("change-date-ok");
  const cancelBtn = document.getElementById("change-date-cancel");

  dateInput.focus();

  okBtn.addEventListener("click", () => {
    const newDate = dateInput.value;
    if (!newDate) { alert("Please select a date."); return; }
    if (fyStart && newDate < fyStart) {
      alert(`Date cannot be before the start of the current financial year (${fyStart.split('-').reverse().join('/')}).`);
      dateInput.value = fyStart;
      return;
    }
    state.setLoginDate(newDate);
    updateSidebarDate();
    overlay.remove();
  });

  cancelBtn.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  // Enter = OK, Escape = Cancel
  dateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); okBtn.click(); }
    if (e.key === "Escape") { e.preventDefault(); cancelBtn.click(); }
  });
}
function updateCompanyHeaderIndicator() {
  const label = document.getElementById("header-company-name");
  const fySelect = document.getElementById("header-fy-select");
  const activeId = state.getActiveCompanyId();
  if (label && activeId) {
    const companies = state.getRegisteredCompanies();
    const current = companies.find(c => c.id === activeId);
    if (current) {
      label.textContent = current.name;
      
      if (fySelect) {
        fySelect.style.display = "inline-block";
        fySelect.innerHTML = "";
        const years = current.financialYears || [];
        years.forEach(fy => {
          const opt = document.createElement("option");
          opt.value = fy.id;
          opt.textContent = state.getFyDisplayLabel(fy);
          if (fy.id === state.getActiveFyId()) {
            opt.selected = true;
          }
          fySelect.appendChild(opt);
        });
      }
    }
  } else {
    if (fySelect) {
      fySelect.style.display = "none";
    }
  }
}

export function checkLoginAndRender() {
  const currentUser = state.getCurrentUser();
  const activeCompanyId = state.getActiveCompanyId();
  const appContainer = document.getElementById("app");
  
  let welcomeContainer = document.getElementById("welcome-login-root");
  if (!welcomeContainer) {
    welcomeContainer = document.createElement("div");
    welcomeContainer.id = "welcome-login-root";
    document.body.appendChild(welcomeContainer);
  }

  const registeredCompanies = state.getRegisteredCompanies();
  const activeCompany = registeredCompanies.find(c => String(c.id) === String(activeCompanyId));

  if (!currentUser || !activeCompanyId || !activeCompany) {
    if (appContainer) appContainer.style.display = "none";
    welcomeContainer.style.display = "block";
    
    // Add style guard if missing
    if (!document.getElementById("hide-app-style")) {
      const style = document.createElement("style");
      style.id = "hide-app-style";
      style.innerHTML = "#app { display: none !important; }";
      document.head.appendChild(style);
    }
    
    showWelcomeScreen(welcomeContainer, () => {
      checkLoginAndRender();
      window.location.hash = "";
      const activeWin = document.getElementById("active-window");
      if (activeWin) activeWin.classList.add("hidden");
      updateSidebarDate();
    });
  } else {
    // Remove style guard when logged in
    const style = document.getElementById("hide-app-style");
    if (style) style.remove();

    if (appContainer) appContainer.style.display = "grid";
    welcomeContainer.style.display = "none";
    welcomeContainer.innerHTML = "";
    
    updateCompanyHeaderIndicator();
    updateSidebarDate();
  }
}

// Bind sidebar buttons and logout buttons
function bindSidebarAndHeaderControls() {
  // 1. Sidebar Buttons Setup
  const btnProduct = document.getElementById("sidebar-btn-product");
  if (btnProduct && !btnProduct.dataset.bound) {
    btnProduct.dataset.bound = "true";
    btnProduct.addEventListener("click", (e) => {
      e.preventDefault();
      showProductMasterModal(document.getElementById("modal-container-root"), null, null);
    });
  }

  const btnPurchase = document.getElementById("sidebar-btn-purchase");
  if (btnPurchase && !btnPurchase.dataset.bound) {
    btnPurchase.dataset.bound = "true";
    btnPurchase.addEventListener("click", (e) => {
      e.preventDefault();
      setTransactionsActiveTab("purchase");
      showSelectBillSeriesModal("Purchase", (selectedSeries) => {
        showRecordPurchaseModal(getWindowContentEl(), null, null, selectedSeries);
      });
    });
  }

  const btnSales = document.getElementById("sidebar-btn-sales");
  if (btnSales && !btnSales.dataset.bound) {
    btnSales.dataset.bound = "true";
    btnSales.addEventListener("click", (e) => {
      e.preventDefault();
      setTransactionsActiveTab("sales");
      showSelectBillSeriesModal("Sales", (selectedSeries) => {
        showInvoiceBuilderModal(getWindowContentEl(), state.getContacts().filter(c => c && (c.type === "customer" || c.listInCustomerList === true)), state.getMaterials(), null, null, selectedSeries);
      });
    });
  }

  const btnCust = document.getElementById("sidebar-btn-customer");
  if (btnCust && !btnCust.dataset.bound) {
    btnCust.dataset.bound = "true";
    btnCust.addEventListener("click", (e) => {
      e.preventDefault();
      showAddContactModal(document.getElementById("modal-container-root"), null, "customer");
    });
  }

  const btnVend = document.getElementById("sidebar-btn-vendor");
  if (btnVend && !btnVend.dataset.bound) {
    btnVend.dataset.bound = "true";
    btnVend.addEventListener("click", (e) => {
      e.preventDefault();
      showAddContactModal(document.getElementById("modal-container-root"), null, "supplier");
    });
  }

  const btnEmp = document.getElementById("sidebar-btn-employee");
  if (btnEmp && !btnEmp.dataset.bound) {
    btnEmp.dataset.bound = "true";
    btnEmp.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Employee Registry: This module records attendance, salary allowances, and employee expense claims. Access key settings under Transaction ➔ Employee Expense Entry.");
    });
  }

  const btnCashBook = document.getElementById("sidebar-btn-cashbook");
  if (btnCashBook && !btnCashBook.dataset.bound) {
    btnCashBook.dataset.bound = "true";
    btnCashBook.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/cashBankBook.js").then(m => {
        m.showCashBookModal(getWindowContentEl());
      });
    });
  }

  const btnBankBook = document.getElementById("sidebar-btn-bankbook");
  if (btnBankBook && !btnBankBook.dataset.bound) {
    btnBankBook.dataset.bound = "true";
    btnBankBook.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/cashBankBook.js").then(m => {
        m.showBankBookModal(getWindowContentEl());
      });
    });
  }

  const logoutBtn = document.getElementById("header-logout-btn");
  const menuLogoutBtn = document.getElementById("menu-logout");
  const editCompanyBtn = document.getElementById("menu-edit-company");

  const performLogout = () => {
    state.setCurrentUser(null);
    state.setActiveCompanyId(null);
    state.loadState();
    window.location.hash = "";
    checkLoginAndRender();
  };

  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", performLogout);
  }
  if (menuLogoutBtn && !menuLogoutBtn.dataset.bound) {
    menuLogoutBtn.dataset.bound = "true";
    menuLogoutBtn.addEventListener("click", performLogout);
  }

  if (editCompanyBtn && !editCompanyBtn.dataset.bound) {
    editCompanyBtn.dataset.bound = "true";
    editCompanyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showEditCompanyModal(document.getElementById("modal-container-root"), () => {
        updateCompanyHeaderIndicator();
      });
    });
  }

  const deleteCompanyBtn = document.getElementById("menu-delete-company");
  if (deleteCompanyBtn && !deleteCompanyBtn.dataset.bound) {
    deleteCompanyBtn.dataset.bound = "true";
    deleteCompanyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const activeId = state.getActiveCompanyId();
      if (!activeId) return;

      const companies = state.getRegisteredCompanies();
      const company = companies.find(c => c.id === activeId);
      if (!company) return;

      const confirmDelete = confirm(
        `Are you sure you want to delete the company "${company.name}"?\n\n` +
        `• A full backup of all financial years and data will automatically be saved to the BACKUP folder.\n` +
        `• All active transactional data, ledger accounts, and settings for this company will then be permanently deleted from the active database.\n\n` +
        `Click OK to backup and delete "${company.name}".`
      );

      if (confirmDelete) {
        try {
          const result = await state.deleteCompany(activeId);
          alert(`Company "${company.name}" has been deleted.\n\nBackup saved successfully to:\n${result.backupLocation || 'BACKUP folder'}`);
          performLogout();
        } catch (delErr) {
          console.error("Error deleting company:", delErr);
          alert(`Failed to delete company: ${delErr.message}`);
        }
      }
    });
  }

  const fySelect = document.getElementById("header-fy-select");
  if (fySelect && !fySelect.dataset.bound) {
    fySelect.dataset.bound = "true";
    fySelect.addEventListener("change", async (e) => {
      state.setActiveFyId(e.target.value);
      await state.initFromServer();
      renderCurrentView();
    });
  }

  const yearEndingBtn = document.getElementById("menu-year-ending");
  if (yearEndingBtn && !yearEndingBtn.dataset.bound) {
    yearEndingBtn.dataset.bound = "true";
    yearEndingBtn.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/yearEnding.js").then(m => {
        m.showYearEndingModal();
      });
    });
  }
}

bindSidebarAndHeaderControls();
document.addEventListener("DOMContentLoaded", bindSidebarAndHeaderControls);





// Apply saved theme preference (light/dark) to the document root
function initTheme() {
  const saved = localStorage.getItem("erp_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  const icon = document.getElementById("theme-icon");
  if (icon) {
    icon.className = saved === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }
}

// App Entry Start
async function startApp() {
  initTheme();

  const currentUser = state.getCurrentUser();
  const activeId = state.getActiveCompanyId();

  // If logged in, fetch fresh data from server
  if (currentUser && activeId) {
    const loadingOverlay = document.createElement("div");
    loadingOverlay.id = "erp-loading-overlay";
    loadingOverlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: var(--bg-primary, #0f172a);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 14px; font-family: var(--font-body, sans-serif);
    `;
    loadingOverlay.innerHTML = `
      <div style="color:#3b82f6; font-size:2rem;"><i class="fa-solid fa-database fa-spin"></i></div>
      <div style="color:#94a3b8; font-size:0.9rem; font-weight:600; letter-spacing:0.05em;">LOADING DATA FROM SERVER...</div>
    `;
    document.body.appendChild(loadingOverlay);

    try {
      await state.initFromServer();
    } catch (e) {
      console.error("[startApp] initFromServer failed:", e);
    } finally {
      loadingOverlay.remove();
    }
  }

  checkLoginAndRender();
  initGlobalWindowManager();

  if (!window.location.hash || window.location.hash === "#") {
    window.location.hash = "#dashboard";
  }
  renderCurrentView();

  // Start auto-sync: keeps this browser refreshed every 30s from server if logged in
  if (state.getCurrentUser() && state.getActiveCompanyId()) {
    state.startAutoSync(30000);
  }
}

// Guard flag prevents double-run (DOMContentLoaded + readyState both may fire)
let _appStarted = false;
const _guardedStart = () => { if (!_appStarted) { _appStarted = true; startApp(); } };
document.addEventListener("DOMContentLoaded", _guardedStart);
if (document.readyState === "complete" || document.readyState === "interactive") {
  _guardedStart();
}

