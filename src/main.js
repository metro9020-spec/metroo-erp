import { state } from "./state.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderInventory, showProductMasterModal } from "./views/inventory.js";
import { renderTransactions, showInvoiceBuilderModal, showRecordPurchaseModal, showPurchaseReturnModal, showSalesReturnModal, setTransactionsActiveTab } from "./views/transactions.js";
import { showSelectBillSeriesModal } from "./views/selectSeriesModal.js";
import { renderVouchers, setActiveVoucherTab, isVoucherLauncherActive, resetVoucherLauncher } from "./views/vouchers.js";
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
import { openRestoreCompanyModal } from "./views/restoreCompanyModal.js";
import { openMissingDoubleEntryModal } from "./views/missingDoubleEntryModal.js";
import { showClearDatabaseModal } from "./views/clearDatabaseModal.js";
import { renderUserManagementModal } from "./views/userManagement.js";
import { renderOpeningStockRegisterReport } from "./views/openingStock.js";
import { renderSalesOrders } from "./views/salesOrders.js";
import { showRearrangeBillsModal } from "./views/rearrangeBillsModal.js";
import { showRearrangeVouchersModal } from "./views/rearrangeVouchersModal.js";
import { initGlobalWindowManager } from "./utils/draggable.js";

window.showRearrangeBillsModal = showRearrangeBillsModal;
window.showRearrangeVouchersModal = showRearrangeVouchersModal;

window._getApiUrl = function(endpoint) {
  if (typeof state !== "undefined" && typeof state.getBackendApiUrl === "function") {
    return state.getBackendApiUrl(endpoint);
  }
  return null;
};

// DOM Elements helper
export function getWindowContentEl() {
  return document.getElementById("window-content-area") || document.getElementById("window-content");
}

export function closeAllOpenLayouts() {
  if (window.location.hash !== "") {
    window.location.hash = "";
  }

  const activeWin = document.getElementById("active-window");
  if (activeWin) {
    activeWin.classList.add("hidden");
    activeWin.classList.remove("launcher-mode", "maximized");
    activeWin.style.maxWidth = "";
    activeWin.style.width = "";
    activeWin.style.position = "";
    activeWin.style.left = "";
    activeWin.style.top = "";
    activeWin.style.margin = "";
  }

  const windowContentEl = getWindowContentEl();
  if (windowContentEl) {
    windowContentEl.innerHTML = "";
  }

  const modalRoot = document.getElementById("modal-container-root");
  if (modalRoot) {
    modalRoot.innerHTML = "";
  }
  const subModalRoot = document.getElementById("sub-modal-container-root");
  if (subModalRoot) {
    subModalRoot.innerHTML = "";
  }

  document.querySelectorAll(".modal-overlay, .modal, .modal-backdrop, .erp-modal-overlay, .custom-modal").forEach(el => {
    if (el && el.parentElement && el.id !== "modal-container-root" && el.id !== "sub-modal-container-root" && el.id !== "app" && el.id !== "welcome-login-root") {
      el.remove();
    }
  });

  try {
    resetVoucherLauncher();
  } catch (e) {}
}

window.addEventListener("financialYearChanged", () => {
  closeAllOpenLayouts();
  updateCompanyHeaderIndicator();
  updateSidebarDate();
});

export function renderCurrentView() {
  const windowContentEl = getWindowContentEl();
  let rawHash = window.location.hash || "";
  let hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;

  const activeWin = document.getElementById("active-window");

  // If no route hash is specified, hide window and clear content (prevent unwanted popups)
  if (!hash || hash === "") {
    if (activeWin) {
      activeWin.classList.add("hidden");
      activeWin.classList.remove("launcher-mode");
    }
    if (windowContentEl) {
      windowContentEl.innerHTML = "";
    }
    return;
  }

  // If user is on welcome / login screen, do not force-render views
  const welcomeContainer = document.getElementById("welcome-login-root");
  if (welcomeContainer && welcomeContainer.style.display !== "none" && welcomeContainer.children.length > 0) {
    if (activeWin) activeWin.classList.add("hidden");
    return;
  }

  if (activeWin && hash !== "vouchers") {
    activeWin.classList.remove("launcher-mode");
    activeWin.style.maxWidth = "";
    activeWin.style.width = "";
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
      home: "DASHBOARD",
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
      "search-vouchers": "VOUCHER LOGS REGISTRY",
      "voucher-logs": "VOUCHER LOGS REGISTRY",
      "opening-stock-register": "OPENING STOCK REGISTER & ENTRY",
      "opening-stock": "OPENING STOCK REGISTER & ENTRY",
      "sales-orders": "FIELD SALES ORDERS (MOBILE & TABLET)",
      "field-orders": "FIELD SALES ORDERS (MOBILE & TABLET)"
    };
    titleTextEl.textContent = titleMap[hash] || hash.toUpperCase();
  }

  // Bind Desktop Window Header Controls
  const closeBtn = document.getElementById("win-btn-close");
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.addEventListener("click", () => {
      if (activeWin) {
        activeWin.classList.add("hidden");
        activeWin.classList.remove("launcher-mode");
      }
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

  try {
    switch (hash) {
      case "login":
        break;
      case "home":
      case "dashboard":
        renderDashboard(windowContentEl);
        break;
      case "sales-orders":
      case "field-orders":
        renderSalesOrders(windowContentEl);
        break;
      case "inventory":
      case "products":
      case "product":
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
        setContactTypeFilter("all");
        renderContacts(windowContentEl);
        break;
      case "customers":
      case "customer":
      case "customers-list":
      case "customer-list":
        setContactTypeFilter("customer");
        renderContacts(windowContentEl);
        break;
      case "vendors":
      case "vendor":
      case "vendors-list":
      case "vendor-list":
      case "suppliers":
      case "supplier-list":
        setContactTypeFilter("supplier");
        renderContacts(windowContentEl);
        break;
      case "profit-loss":
      case "pnl":
        setReportsActiveTab("pl");
        renderProfitLossReport(windowContentEl);
        break;
      case "balance-sheet":
        setReportsActiveTab("bs");
        renderBalanceSheetReport(windowContentEl);
        break;
      case "opening-balance-sheet":
      case "obs":
        setReportsActiveTab("obs");
        renderOpeningBalanceSheetReport(windowContentEl);
        break;
      case "trial-balance":
        setReportsActiveTab("trial");
        renderTrialBalanceReport(windowContentEl);
        break;
      case "tax-summary":
      case "gst-summary":
        setReportsActiveTab("tax");
        renderTaxSummaryReport(windowContentEl);
        break;
      case "individual-ledger":
        renderIndividualLedgerReport(windowContentEl);
        break;
      case "ledger-group-summary":
      case "group-summary":
        setReportsActiveTab("groupSummary");
        renderGroupSummaryReport(windowContentEl);
        break;
      case "opening-stock-register":
      case "opening-stock":
        renderOpeningStockRegisterReport(windowContentEl);
        break;
      case "customer-report":
        setPartyReportTab("customer");
        renderPartiesReportView(windowContentEl);
        break;
      case "vendor-report":
        setPartyReportTab("vendor");
        renderPartiesReportView(windowContentEl);
        break;
      case "debtors-report":
        setPartyReportTab("debtors");
        renderPartiesReportView(windowContentEl);
        break;
      case "creditors-report":
        setPartyReportTab("creditors");
        renderPartiesReportView(windowContentEl);
        break;
      case "parties-report":
        renderPartiesReportView(windowContentEl);
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
      case "voucher-logs":
      case "voucherLogs":
        renderSearchVouchers(windowContentEl);
        break;
      default:
        if (hash === "dashboard" || hash === "home") {
          renderDashboard(windowContentEl);
        } else {
          console.warn("[renderCurrentView] Unrecognized route hash:", hash);
        }
        break;
    }
  } catch (err) {
    console.error("[renderCurrentView Error]", err);
    if (windowContentEl) {
      windowContentEl.innerHTML = `
        <div style="padding: 20px; color: #dc2626; font-family: sans-serif;">
          <h3 style="margin-top: 0;"><i class="fa-solid fa-triangle-exclamation"></i> Error Loading View</h3>
          <p>${err.message || err}</p>
          <button class="btn" onclick="window.location.hash='#dashboard'" style="padding: 6px 14px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px;">Return to Dashboard</button>
        </div>
      `;
    }
  }
}

window.addEventListener("hashchange", renderCurrentView);
window.addEventListener("erp:data-refreshed", () => {
  // If user is not logged in or no company selected, do not force-render
  if (!state.getCurrentUser() || !state.getActiveCompanyId()) return;

  const welcomeContainer = document.getElementById("welcome-login-root");
  if (welcomeContainer && welcomeContainer.style.display !== "none" && welcomeContainer.children.length > 0) return;

  const activeWin = document.getElementById("active-window");
  // If desktop window is currently closed / hidden, do not force it open
  if (!activeWin || activeWin.classList.contains("hidden")) return;

  const rawHash = window.location.hash || "";
  const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  if (!hash || hash === "") return;

  if (hash === "vouchers") {
    // DO NOT wipe out active voucher form on background auto-sync poll!
    import("./views/vouchers.js").then(m => {
      m.refreshVoucherLogsOnly();
    });
    return;
  }

  // Don't re-render current view if user is actively interacting with a modal, popup, or form field
  const modalRoot = document.getElementById("modal-container-root");
  if (modalRoot && modalRoot.children.length > 0) return;

  const popup = document.getElementById("jv-input-popup");
  if (popup && popup.style.display !== "none") return;

  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "SELECT" || activeEl.tagName === "TEXTAREA")) return;

  renderCurrentView();
});





// Check role permissions and restrict non-admin users from accessing Admin menus
export function enforceUserRolePermissions() {
  try {
    const currentUser = state.getCurrentUser();
    const isAdmin = currentUser && currentUser.role === "Admin";

    // Hide or disable Admin menu options for non-admins safely without :has
    const adminMenuLink = document.getElementById("menu-admin-dashboard");
    const adminMenuTitle = adminMenuLink ? adminMenuLink.closest(".menu-item") : null;
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
  } catch (e) {}
}

// Update header displaying current user and company
export function updateHeaderUserTag() {
  try {
    const headerCompanyTag = document.getElementById("header-company-name");
    if (headerCompanyTag) {
      const activeCompanyId = state.getActiveCompanyId();
      const company = (state.getRegisteredCompanies() || []).find(c => String(c.id) === String(activeCompanyId));
      const currentUser = state.getCurrentUser();
      const cName = company ? company.name : "Company";
      const cIdStr = company ? ` [ID: ${company.id}]` : "";
      const uName = currentUser ? `${currentUser.fullName || currentUser.username} (${currentUser.role || "Admin"})` : "Admin";
      headerCompanyTag.textContent = `${uName} - ${cName}${cIdStr}`;
    }
    enforceUserRolePermissions();
  } catch (e) {}
}
state.subscribe(updateHeaderUserTag);

export function updateDynamicMenuVisibility() {
  try {
    const options = state.getOptions() || {};
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
  } catch (e) {}
}
state.subscribe(updateDynamicMenuVisibility);

export function bindMenuBarControls() {
  const menuAbout = document.getElementById("menu-about");
  if (menuAbout && !menuAbout.dataset.bound) {
    menuAbout.dataset.bound = "true";
    menuAbout.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Material Ledger ERP v1.0.4\nA classic, high-performance batch-wise building materials inventory system with GST compliance.");
    });
  }

  const menuExit = document.getElementById("menu-exit");
  if (menuExit && !menuExit.dataset.bound) {
    menuExit.dataset.bound = "true";
    menuExit.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.hash = "";
    });
  }

  const menuProductMaster = document.getElementById("menu-product-master");
  if (menuProductMaster && !menuProductMaster.dataset.bound) {
    menuProductMaster.dataset.bound = "true";
    menuProductMaster.addEventListener("click", (e) => {
      e.preventDefault();
      showProductMasterModal(getWindowContentEl(), null, null);
    });
  }

  const menuUnitSettings = document.getElementById("menu-unit-settings");
  if (menuUnitSettings && !menuUnitSettings.dataset.bound) {
    menuUnitSettings.dataset.bound = "true";
    menuUnitSettings.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/units.js").then(m => {
        m.showUnitSettingsModal(document.getElementById("modal-container-root"), null, null);
      });
    });
  }

  const menuCustomersList = document.getElementById("menu-customers-list");
  if (menuCustomersList && !menuCustomersList.dataset.bound) {
    menuCustomersList.dataset.bound = "true";
    menuCustomersList.addEventListener("click", (e) => {
      e.preventDefault();
      setContactTypeFilter("customer");
      window.location.hash = "#customers";
      renderCurrentView();
    });
  }

  const menuVendorsList = document.getElementById("menu-vendors-list");
  if (menuVendorsList && !menuVendorsList.dataset.bound) {
    menuVendorsList.dataset.bound = "true";
    menuVendorsList.addEventListener("click", (e) => {
      e.preventDefault();
      setContactTypeFilter("supplier");
      window.location.hash = "#vendors";
      renderCurrentView();
    });
  }

  const menuCustomer = document.getElementById("menu-customer");
  if (menuCustomer && !menuCustomer.dataset.bound) {
    menuCustomer.dataset.bound = "true";
    menuCustomer.addEventListener("click", (e) => {
      e.preventDefault();
      showAddContactModal(document.getElementById("modal-container-root"), null, "customer");
    });
  }

  const menuVendor = document.getElementById("menu-vendor");
  if (menuVendor && !menuVendor.dataset.bound) {
    menuVendor.dataset.bound = "true";
    menuVendor.addEventListener("click", (e) => {
      e.preventDefault();
      showAddContactModal(document.getElementById("modal-container-root"), null, "supplier");
    });
  }

  const menuUserManagement = document.getElementById("menu-user-management");
  if (menuUserManagement && !menuUserManagement.dataset.bound) {
    menuUserManagement.dataset.bound = "true";
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

  const menuResetVouchers = document.getElementById("menu-reset-vouchers");
  if (menuResetVouchers && !menuResetVouchers.dataset.bound) {
    menuResetVouchers.dataset.bound = "true";
    menuResetVouchers.addEventListener("click", (e) => {
      e.preventDefault();
      showRearrangeVouchersModal("ALL");
    });
  }

  const menuResetVouchersUtil = document.getElementById("menu-reset-vouchers-util");
  if (menuResetVouchersUtil && !menuResetVouchersUtil.dataset.bound) {
    menuResetVouchersUtil.dataset.bound = "true";
    menuResetVouchersUtil.addEventListener("click", (e) => {
      e.preventDefault();
      showRearrangeVouchersModal("ALL");
    });
  }

  const menuOptions = document.getElementById("menu-options");
  if (menuOptions && !menuOptions.dataset.bound) {
    menuOptions.dataset.bound = "true";
    menuOptions.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/options.js").then(m => {
        m.showOptionsModal();
      });
    });
  }

  const menuChangePassword = document.getElementById("menu-change-password");
  if (menuChangePassword && !menuChangePassword.dataset.bound) {
    menuChangePassword.dataset.bound = "true";
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
  menuContactsDirectory.addEventListener("click", (e) => {
    e.preventDefault();
    setContactTypeFilter("all");
    window.location.hash = "#contacts";
    renderCurrentView();
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

const menuDebitNote = document.getElementById("menu-debit-note");
if (menuDebitNote) {
  menuDebitNote.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveVoucherTab("debit");
    window.location.hash = "#vouchers";
    renderVouchers(getWindowContentEl());
  });
}

const menuCreditNote = document.getElementById("menu-credit-note");
if (menuCreditNote) {
  menuCreditNote.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveVoucherTab("credit");
    window.location.hash = "#vouchers";
    renderVouchers(getWindowContentEl());
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

bindReportMenuClick("menu-profit-loss", () => { setReportsActiveTab("pl"); window.location.hash = "#profit-loss"; renderCurrentView(); });
bindReportMenuClick("menu-balance-sheet", () => { setReportsActiveTab("bs"); window.location.hash = "#balance-sheet"; renderCurrentView(); });
bindReportMenuClick("menu-opening-balance-sheet", () => { setReportsActiveTab("obs"); window.location.hash = "#opening-balance-sheet"; renderCurrentView(); });
bindReportMenuClick("menu-trial-balance", () => { setReportsActiveTab("trial"); window.location.hash = "#trial-balance"; renderCurrentView(); });
bindReportMenuClick("menu-individual-ledger", () => { window.location.hash = "#individual-ledger"; renderCurrentView(); });
bindReportMenuClick("menu-ledger-group-summary", () => { setReportsActiveTab("groupSummary"); window.location.hash = "#ledger-group-summary"; renderCurrentView(); });
bindReportMenuClick("menu-tax-summary", () => { setReportsActiveTab("tax"); window.location.hash = "#tax-summary"; renderCurrentView(); });
bindReportMenuClick("menu-customer-report", () => { setPartyReportTab("customer"); window.location.hash = "#customer-report"; renderCurrentView(); });
bindReportMenuClick("menu-vendor-report", () => { setPartyReportTab("vendor"); window.location.hash = "#vendor-report"; renderCurrentView(); });
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
const bindCanceledMenu = (id, type) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/canceledBills.js").then(m => {
        m.showCanceledBillsReportModal(type, getWindowContentEl());
      });
    });
  }
};
bindCanceledMenu("menu-canceled-bills", "sales");
bindCanceledMenu("menu-canceled-sales-bills", "sales");
bindCanceledMenu("menu-canceled-purchase-bills", "purchase");
bindCanceledMenu("menu-canceled-sales-returns", "sales_return");
bindCanceledMenu("menu-canceled-purchase-returns", "purchase_return");

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
}

// Automatically detect when printing from an open modal to isolate modal content
window.addEventListener("beforeprint", () => {
  const activeModal = document.querySelector(
    ".modal-overlay:not([style*='display: none']):not([style*='display:none']), " +
    "div[id^='modal-']:not([style*='display: none']):not([style*='display:none']), " +
    "div[id$='-overlay']:not([style*='display: none']):not([style*='display:none']), " +
    "#invoice-preview-modal-overlay"
  );
  if (activeModal) {
    document.body.classList.add("modal-printing");
  }
});

window.addEventListener("afterprint", () => {
  document.body.classList.remove("modal-printing");
});

// Prevent default browser menu bar activation on F10 keyup
window.addEventListener("keyup", (e) => {
  if (e.key === "F10" || e.code === "F10" || e.keyCode === 121) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);

// Universal anchor navigation listener: Ensures layout opens even if hash was already set
document.addEventListener("click", (e) => {
  const anchor = e.target.closest("a");
  if (!anchor) return;
  const href = anchor.getAttribute("href");
  if (href && href.startsWith("#") && href.length > 1) {
    const targetHash = href.slice(1);
    const activeWin = document.getElementById("active-window");
    if (activeWin) {
      activeWin.classList.remove("hidden");
    }
    if (window.location.hash === "#" + targetHash) {
      renderCurrentView();
    }
  }
});

// Keyboard shortcuts handlers (registered in capture phase for maximum responsiveness)
window.addEventListener("keydown", (e) => {
  const k = (e.key || "").toUpperCase();
  const c = (e.code || "").toUpperCase();
  const isF2 = k === "F2" || c === "F2" || e.keyCode === 113 || k === "F9" || c === "F9" || e.keyCode === 120;
  const isF10 = k === "F10" || c === "F10" || e.keyCode === 121;

  // F2 or F9: Product Master
  if (isF2 && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const purOverlay = document.getElementById("modal-overlay-tx");
      if (purOverlay && (purOverlay.classList.contains("active") || purOverlay.offsetParent !== null)) {
        const newProdBtn = document.getElementById("ribbon-new-product") || document.getElementById("ribbon-new-product-sale");
        if (newProdBtn) {
          newProdBtn.click();
          return;
        }
      }
      let modalRoot = document.getElementById("modal-container-root");
      if (!modalRoot) {
        modalRoot = document.createElement("div");
        modalRoot.id = "modal-container-root";
        document.body.appendChild(modalRoot);
      }
      showProductMasterModal(modalRoot, null, null);
    } catch (err) {
      console.error("[F2 Shortcut Error]", err);
      alert("Product Master Error: " + err.message);
    }
    return;
  }

  // F10: Products List
  if (isF10 && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    e.stopPropagation();
    const root = document.getElementById("modal-container-root");
    if (root) root.innerHTML = "";
    const subRoot = document.getElementById("sub-modal-container-root");
    if (subRoot) subRoot.innerHTML = "";
    document.querySelectorAll(".modal-overlay.active").forEach(el => el.classList.remove("active"));
    const winEl = getWindowContentEl();
    if (window.location.hash === "#inventory") {
      renderInventory(winEl);
    } else {
      window.location.hash = "#inventory";
    }
    return;
  }

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

  // ESC key: close modal, voucher layout, or active window
  if (e.key === "Escape") {
    const subPopup = document.querySelector("#btn-close-search-popup");
    if (subPopup) return;

    const jvPopup = document.getElementById("jv-input-popup");
    if (jvPopup && jvPopup.style.display !== "none") {
      const popDropdown = document.getElementById("pop-account-dropdown");
      if (popDropdown && popDropdown.style.display === "block") {
        popDropdown.style.display = "none";
      } else {
        jvPopup.style.display = "none";
      }
      return;
    }

    const openDatePicker = document.querySelector(".tally-datepicker-popover");
    if (openDatePicker) {
      openDatePicker.remove();
      return;
    }

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
      return;
    }

    // Check if we are in vouchers view or voucher window is open
    const isVouchersActive = window.location.hash.includes("vouchers") || Boolean(document.getElementById("voucher-form-container")) || Boolean(document.querySelector(".launcher-card"));
    if (isVouchersActive) {
      if (isVoucherLauncherActive && isVoucherLauncherActive()) {
        // If on Voucher Creation Menu -> close the launcher window completely
        const activeWin = document.getElementById("active-window");
        if (activeWin) {
          activeWin.classList.add("hidden");
          activeWin.classList.remove("launcher-mode");
          activeWin.style.position = "";
          activeWin.style.left = "";
          activeWin.style.top = "";
          activeWin.style.margin = "";
        }
        window.location.hash = "";
      } else {
        // If in a Voucher Entry Layout -> close current layout and return to Voucher Creation Menu
        const windowContentEl = getWindowContentEl();
        resetVoucherLauncher();
        renderVouchers(windowContentEl);
      }
      return;
    }

    // Close any other active desktop window
    const activeWin = document.getElementById("active-window");
    if (activeWin && !activeWin.classList.contains("hidden")) {
      activeWin.classList.add("hidden");
      activeWin.classList.remove("launcher-mode");
      activeWin.style.position = "";
      activeWin.style.left = "";
      activeWin.style.top = "";
      activeWin.style.margin = "";
      window.location.hash = "";
    }
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
    const btn = document.getElementById("menu-stock-register");
    if (btn) {
      btn.click();
    } else {
      import("./views/inventory.js").then(m => {
        m.showDetailedStockRegisterModal();
      });
    }
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
    window.location.hash = "#individual-ledger";
    if (window.location.hash === "#individual-ledger") {
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
}, true);

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
  const fyEnd = state.getActiveFinancialYearEndDate() || "";

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
          <input type="date" id="change-date-input" value="${currentDate}" ${fyStart ? `min="${fyStart}"` : ''} ${fyEnd ? `max="${fyEnd}"` : ''}
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
    if (fyEnd && newDate > fyEnd) {
      alert(`Date cannot be after the end of the current financial year (${fyEnd.split('-').reverse().join('/')}).`);
      dateInput.value = fyEnd;
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
    const current = companies.find(c => String(c.id) === String(activeId));
    if (current) {
      label.textContent = current.name;
      
      if (fySelect) {
        fySelect.style.display = "inline-block";
        fySelect.innerHTML = "";
        const years = current.financialYears || [];
        const activeFy = state.getActiveFyId();
        years.forEach(fy => {
          const opt = document.createElement("option");
          opt.value = fy.id;
          opt.textContent = state.getFyDisplayLabel(fy);
          if (String(fy.id) === String(activeFy)) {
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
      window.location.hash = "#dashboard";
      renderCurrentView();
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

// Bind sidebar buttons, menu bar and logout buttons
export function bindSidebarAndHeaderControls() {
  bindMenuBarControls();
  updateDynamicMenuVisibility();
  updateHeaderUserTag();

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

  const btnReceipt = document.getElementById("sidebar-btn-receipt");
  if (btnReceipt && !btnReceipt.dataset.bound) {
    btnReceipt.dataset.bound = "true";
    btnReceipt.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/vouchers.js").then(m => {
        m.setActiveVoucherTab("receipt");
        window.location.hash = "#vouchers";
        renderCurrentView();
      });
    });
  }

  const btnPayment = document.getElementById("sidebar-btn-payment");
  if (btnPayment && !btnPayment.dataset.bound) {
    btnPayment.dataset.bound = "true";
    btnPayment.addEventListener("click", (e) => {
      e.preventDefault();
      import("./views/vouchers.js").then(m => {
        m.setActiveVoucherTab("payment");
        window.location.hash = "#vouchers";
        renderCurrentView();
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
        `Are you sure you want to delete the company "${company.name}" (Company ID: ${company.id})?\n\n` +
        `• A full backup of all financial years and data will automatically be saved to the BACKUP folder.\n` +
        `• All active transactional data, ledger accounts, and settings for this company will then be permanently deleted from the active database.\n\n` +
        `Click OK to backup and delete "${company.name}" (Company ID: ${company.id}).`
      );

      if (confirmDelete) {
        const adminPassword = prompt(`SECURITY CHECK: Enter Admin Security Password to confirm deletion of "${company.name}" (Company ID: ${company.id}):`);
        if (adminPassword === null) return;
        if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
          alert("Incorrect Admin Security Password! Company deletion aborted.");
          return;
        }

        try {
          const result = await state.deleteCompany(activeId);
          alert(`Company "${company.name}" (Company ID: ${company.id}) has been deleted.\n\nBackup saved successfully to:\n${result.backupLocation || 'BACKUP folder'}`);
          performLogout();
        } catch (delErr) {
          console.error("Error deleting company:", delErr);
          alert(`Failed to delete company: ${delErr.message}`);
        }
      }
    });
  }

  const restoreCompanyBtn = document.getElementById("menu-restore-deleted-company");
  if (restoreCompanyBtn && !restoreCompanyBtn.dataset.bound) {
    restoreCompanyBtn.dataset.bound = "true";
    restoreCompanyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openRestoreCompanyModal();
    });
  }

  const menuAdminDash = document.getElementById("menu-admin-dashboard");
  if (menuAdminDash && !menuAdminDash.dataset.bound) {
    menuAdminDash.dataset.bound = "true";
    menuAdminDash.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.hash = "#admin";
    });
  }

  const menuDoubleEntry = document.getElementById("menu-double-entry-audit");
  if (menuDoubleEntry && !menuDoubleEntry.dataset.bound) {
    menuDoubleEntry.dataset.bound = "true";
    menuDoubleEntry.addEventListener("click", (e) => {
      e.preventDefault();
      openMissingDoubleEntryModal();
    });
  }

  const menuUserMgmt = document.getElementById("menu-user-management");
  if (menuUserMgmt && !menuUserMgmt.dataset.bound) {
    menuUserMgmt.dataset.bound = "true";
    menuUserMgmt.addEventListener("click", (e) => {
      e.preventDefault();
      renderUserManagementModal();
    });
  }

  const menuClearDb = document.getElementById("menu-clear-db");
  if (menuClearDb && !menuClearDb.dataset.bound) {
    menuClearDb.dataset.bound = "true";
    menuClearDb.addEventListener("click", (e) => {
      e.preventDefault();
      showClearDatabaseModal();
    });
  }

  const sidebarAdminBtn = document.getElementById("sidebar-btn-admin");
  if (sidebarAdminBtn && !sidebarAdminBtn.dataset.bound) {
    sidebarAdminBtn.dataset.bound = "true";
    sidebarAdminBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.hash = "#admin";
    });
  }

  const fySelect = document.getElementById("header-fy-select");
  if (fySelect && !fySelect.dataset.bound) {
    fySelect.dataset.bound = "true";
    fySelect.addEventListener("change", async (e) => {
      const selectedFyId = e.target.value;
      await showFyLoadingOverlay(async () => {
        closeAllOpenLayouts();
        state.setActiveFyId(selectedFyId);
        await state.initFromServer();
        updateCompanyHeaderIndicator();
        updateSidebarDate();
        renderCurrentView();
      }, 700);
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

/**
 * Displays a loading screen overlay for milliseconds when switching financial year.
 * @param {Function|Promise} [asyncTask] Work to perform while showing loading screen
 * @param {number} [minMs=700] Minimum duration in milliseconds to keep loading screen visible
 */
export async function showFyLoadingOverlay(asyncTask, minMs = 700) {
  let overlay = document.getElementById("fy-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "fy-loading-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      color: #ffffff;
      font-family: var(--font-body, system-ui, -apple-system, sans-serif);
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
    `;
    overlay.innerHTML = `
      <div style="
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.1));
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid rgba(59, 130, 246, 0.4);
        box-shadow: 0 0 25px rgba(59, 130, 246, 0.3);
      ">
        <i class="fa-solid fa-arrows-rotate fa-spin" style="font-size: 2rem; color: #60a5fa;"></i>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 1.15rem; font-weight: 700; letter-spacing: 0.06em; color: #f8fafc; text-transform: uppercase;">Switching Financial Year...</div>
        <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px; font-weight: 500;">Loading financial year database & records</div>
      </div>
      <div style="
        width: 140px;
        height: 3px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 4px;
      ">
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          animation: fyLoadingProgress 0.8s infinite ease-in-out;
        "></div>
      </div>
    `;

    if (!document.getElementById("fy-loading-style")) {
      const style = document.createElement("style");
      style.id = "fy-loading-style";
      style.textContent = `
        @keyframes fyLoadingProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
    overlay.getBoundingClientRect(); // trigger reflow
    overlay.style.opacity = "1";
  }

  const startTime = Date.now();
  try {
    const taskPromise = (typeof asyncTask === "function")
      ? asyncTask()
      : (asyncTask && typeof asyncTask.then === "function" ? asyncTask : Promise.resolve());
    await Promise.race([
      taskPromise,
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
  } catch (err) {
    console.error("[showFyLoadingOverlay] Error during FY switch:", err);
  } finally {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minMs - elapsed);
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
    overlay.style.opacity = "0";
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, 200);
  }
}

if (typeof window !== "undefined") {
  window.showFyLoadingOverlay = showFyLoadingOverlay;
  window.updateCompanyHeaderIndicator = updateCompanyHeaderIndicator;
  window.updateSidebarDate = updateSidebarDate;
  window.renderCurrentView = renderCurrentView;
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

  // Reset user session on refresh so login page is always required
  state.setCurrentUser(null);

  // Always reset to current financial year on page refresh or launch
  if (state.getActiveCompanyId()) {
    state.resetToCurrentFinancialYear();
  }

  // Pre-fetch fresh database snapshot from server/cloud/static before rendering
  try {
    await state.initFromServer();
  } catch (e) {
    console.warn("[startApp] initFromServer warning:", e);
  }

  checkLoginAndRender();
  bindSidebarAndHeaderControls();
  initGlobalWindowManager();

  if (!window.location.hash || window.location.hash === "#") {
    window.location.hash = "#dashboard";
  }
}

// Guard flag prevents double-run (DOMContentLoaded + readyState both may fire)
let _appStarted = false;
const _guardedStart = () => { if (!_appStarted) { _appStarted = true; startApp(); } };
document.addEventListener("DOMContentLoaded", _guardedStart);
if (document.readyState === "complete" || document.readyState === "interactive") {
  _guardedStart();
}

