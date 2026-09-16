
import { state, ACCOUNTS, parseDateSafely } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";
import { getValidGstRate } from "../utils/gstValidator.js";
import { bringToFront } from "../utils/draggable.js";

let activeReportTab = "pl"; // 'pl', 'bs', 'tax', 'parties', 'ledger'
let lastSelectedPartyTab = null;
let lastSelectedPartyId = null;
let reportStartDate = "";
let reportEndDate = "";
let taxFromDate = "2026-04-01";
let taxToDate = new Date().toISOString().split("T")[0];

function getItemCess(item, itemAmt) {
  const options = state.getOptions();
  if (options.enableCess === false) return 0;
  if (item.cessAmount !== undefined) return parseFloat(item.cessAmount) || 0;
  if (item.cessPercent !== undefined) return itemAmt * (parseFloat(item.cessPercent) / 100);
  return 0;
}

function isPrimaryContactLedger(l, c) {
  if (!l || !c) return false;
  const lCode = String(l.code || "").trim().toUpperCase();
  const cCode = String(c.ledgerCode || "").trim().toUpperCase();
  const lName = String(l.name || "").trim().toUpperCase();
  const cName = String(c.name || "").trim().toUpperCase();
  if (lCode && cCode && lCode === cCode) return true;
  if (lCode && lCode === "L" + String(c.id).replace(/^(VEND|CUST)-/, "")) return true;
  if (lName && cName && lName === cName) return true;
  return false;
}

function findMatchingContactEntry(entries, contact, childLedgers = []) {
  if (!Array.isArray(entries) || !contact) return null;
  const cId = String(contact.id || "").trim();
  const cCode = String(contact.ledgerCode || "").trim();
  const cName = String(contact.name || "").trim().toUpperCase();
  const canonicalContact = state.getCanonicalAccountId(contact.id) || cId;
  const canonicalCode = contact.ledgerCode ? state.getCanonicalAccountId(contact.ledgerCode) : null;

  for (const e of entries) {
    if (!e || !e.accountId) continue;
    const accStr = String(e.accountId).trim();
    const accUpper = accStr.toUpperCase();
    const baseAcc = accStr.split("::")[0];
    const canonicalEntry = state.getCanonicalAccountId(e.accountId) || baseAcc;

    if (accStr === cId || accStr.startsWith(cId + "::")) return e;
    if (cCode && (accStr === cCode || accStr.startsWith(cCode + "::"))) return e;
    if (cName && (accUpper === cName || accUpper.startsWith(cName + "::"))) return e;
    if (canonicalEntry && (canonicalEntry === canonicalContact || (canonicalCode && canonicalEntry === canonicalCode))) return e;
    if (childLedgers.some(l => l.code === e.accountId || (canonicalEntry && state.getCanonicalAccountId(l.code) === canonicalEntry))) return e;
  }
  return null;
}

// Party report sub-states
let activePartySubTab = "customer"; // 'customer', 'vendor', 'debtors', 'creditors'
let partyCustomerTypeFilter = "all"; // 'all', 'single', 'multiple'
let selectedMultipleCustomerIds = []; // customer IDs checked for site summary

// New legacy-style filters
let filterBalType = "all"; // 'all', 'debit', 'credit', 'zero'
let filterSubMode = "all"; // 'all', 'age', 'dues', 'area'
let filterFromDate = "2026-04-01";
let filterToDate = new Date().toISOString().split("T")[0];
let filterSearchText = "";
let selectedPartyRowId = "";
let partyComboboxOpen = false;
let partyDropdownSearchQuery = ""; // Holds selected contact ID
let filterSiteType = "all"; // 'all', 'single', 'multiple'
let partySortField = "name"; // 'name', 'creditPeriod', 'opBalance', 'debit', 'credit', 'closingBalance'
let partySortOrder = "asc"; // 'asc', 'desc'

// Individual Ledger Tab States
let bsDetailed = false;
let bsSubGroups = false;
let groupDetailed = false;
let avoidNonTransaction = false;
let selectedGroupName = "CAPITAL ACCOUNT";
let selectedIndividualLedgerId = "";
let ledgerVoucherTypeFilter = "All";
let ledgerShowNarration = true;
let ledgerShowBalanceInPrint = true;
let ledgerSummaryFinalPageOnly = false;
let ledgerMonthly = false;
let ledgerMergeMultiple = false;
let ledgerIncludePdc = false;
let ledgerHideOp = false;
let ledgerEmployeeFilter = "All";
let plDetailed = false;
let ledgerFromDate = "2026-04-01";
let ledgerToDate = new Date().toISOString().split("T")[0];


export function setupLedgerCombobox(parentEl, onSelect) {
  const input = parentEl.querySelector("#il-ledger-search-input");
  const toggleBtn = parentEl.querySelector("#il-ledger-dropdown-toggle");
  const popup = parentEl.querySelector("#il-ledger-popup-list");
  const container = parentEl.querySelector("#il-ledger-items-container");
  if (!input || !popup || !container) return;

  const items = Array.from(container.querySelectorAll(".il-ledger-item"));

  // Ensure all items are always displayed in alphabetical order
  items.forEach(item => {
    item.style.display = "block";
  });

  const showPopup = () => {
    popup.style.display = "flex";
    scrollToActive();
  };

  const hidePopup = () => {
    popup.style.display = "none";
  };

  const scrollToActive = () => {
    const active = container.querySelector(".il-ledger-item.active");
    if (active) {
      // Scroll the container so the active item is positioned near the top of the visible list
      container.scrollTop = active.offsetTop - container.offsetTop;
    }
  };

  const highlightItem = (targetItem, scrollMode = "nearest") => {
    if (!targetItem) return;
    items.forEach(i => {
      i.classList.remove("active");
      i.style.background = "#fff";
      i.style.color = "#000";
      i.style.fontWeight = "normal";
    });
    targetItem.classList.add("active");
    targetItem.style.background = "#0066cc";
    targetItem.style.color = "#fff";
    targetItem.style.fontWeight = "bold";

    if (scrollMode === "top") {
      container.scrollTop = targetItem.offsetTop - container.offsetTop;
    } else {
      targetItem.scrollIntoView({ block: "nearest" });
    }
  };

  const jumpToMatch = (query, isTypingForward = false) => {
    const raw = query || "";
    if (!raw.trim()) {
      // If empty query, highlight current selected or first item
      const active = container.querySelector(".il-ledger-item.active") || items[0];
      highlightItem(active, "top");
      return;
    }

    const qLower = raw.toLowerCase();

    // 1. Find exact prefix match
    let matchedItem = items.find(i => (i.getAttribute("data-name") || "").toLowerCase().startsWith(qLower));

    // 2. If no prefix match, find closest alphabetical match
    if (!matchedItem) {
      matchedItem = items.find(i => (i.getAttribute("data-name") || "").toLowerCase().localeCompare(qLower) >= 0);
    }

    // 3. If still not matched, fallback to substring match
    if (!matchedItem) {
      matchedItem = items.find(i => (i.getAttribute("data-name") || "").toLowerCase().includes(qLower));
    }

    if (matchedItem) {
      highlightItem(matchedItem, "top");

      // Auto-complete remaining text in input box with range selection
      if (isTypingForward) {
        const fullText = matchedItem.getAttribute("data-name") || "";
        const cursorStart = raw.length;
        if (fullText.toLowerCase().startsWith(qLower)) {
          input.value = raw + fullText.slice(cursorStart);
          input.setSelectionRange(cursorStart, fullText.length);
        }
      }
    }
  };

  const selectItem = (item) => {
    if (!item) return;
    const id = item.getAttribute("data-id");
    const name = item.getAttribute("data-name");
    input.value = name;
    input.setAttribute("data-id", id);
    selectedIndividualLedgerId = id;
    hidePopup();
    if (onSelect) onSelect(id);
  };

  // Input Events
  input.addEventListener("focus", () => {
    showPopup();
    input.select();
  });

  input.addEventListener("click", () => {
    showPopup();
  });

  input.addEventListener("input", (e) => {
    showPopup();
    // Get typed text up to selection start to allow replacing auto-completed range
    const typedText = input.value.slice(0, input.selectionStart || input.value.length);
    const isTypingForward = !!(e.inputType && e.inputType.startsWith("insert"));
    jumpToMatch(typedText || input.value, isTypingForward);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      showPopup();
      const currentIndex = items.findIndex(i => i.classList.contains("active"));
      const nextIndex = (currentIndex >= 0 && currentIndex < items.length - 1) ? currentIndex + 1 : 0;
      highlightItem(items[nextIndex]);
      const nextName = items[nextIndex].getAttribute("data-name");
      input.value = nextName;
      input.select();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      showPopup();
      const currentIndex = items.findIndex(i => i.classList.contains("active"));
      const prevIndex = (currentIndex > 0) ? currentIndex - 1 : items.length - 1;
      highlightItem(items[prevIndex]);
      const prevName = items[prevIndex].getAttribute("data-name");
      input.value = prevName;
      input.select();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const active = container.querySelector(".il-ledger-item.active") || items[0];
      if (active) {
        selectItem(active);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      hidePopup();
    } else if (e.key === "Tab") {
      const active = container.querySelector(".il-ledger-item.active");
      if (active && popup.style.display !== "none") {
        selectItem(active);
      }
    }
  });

  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (popup.style.display === "none") {
        input.focus();
        showPopup();
      } else {
        hidePopup();
      }
    });
  }

  items.forEach(item => {
    item.addEventListener("mouseenter", () => {
      highlightItem(item);
    });
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      selectItem(item);
    });
  });

  // Global outside click closer
  const docClickHandler = (e) => {
    if (!parentEl.contains(e.target)) {
      hidePopup();
    }
  };
  document.addEventListener("click", docClickHandler);
}

export function getCompanyHeaderInfo() {
  const activeCompany = (state.getActiveCompany && state.getActiveCompany()) || 
                        (state.getCompanies && state.getCompanies()[0]) || 
                        { name: "", address: "", gstin: "", phone: "" };
  const companyName = (activeCompany.name || "").toUpperCase();
  const companyAddress = (activeCompany.address || "").replace(/\n/g, ", ");
  const companyPhone = activeCompany.phone || activeCompany.mobile || "";
  const companyGstin = activeCompany.gstin || "";
  return { activeCompany, companyName, companyAddress, companyPhone, companyGstin };
}

export function formatDateDisplay(dStr) {
  return formatDate(dStr);
}

export function renderPrintHeaderHtml(reportTitle, subHeaderLeft = "", subHeaderRight = "", extraLine = "", showGstin = false) {
  const { companyName, companyAddress, companyPhone, companyGstin } = getCompanyHeaderInfo();
  const printDateStr = formatDate(new Date());
  const printTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return `
    <div class="print-only report-print-header" style="margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 6px; text-align: center;">
      <div style="font-size: 18pt; font-weight: 800; color: #000; letter-spacing: 1px; text-transform: uppercase; font-family: Tahoma, Arial, sans-serif;">${companyName}</div>
      ${(companyAddress || companyPhone || (showGstin && companyGstin)) ? `
        <div style="font-size: 9pt; color: #222; margin-top: 2px;">
          ${companyAddress ? companyAddress : ''}
          ${companyPhone ? (companyAddress ? ' | ' : '') + 'Ph: ' + companyPhone : ''}
          ${(showGstin && companyGstin) ? ((companyAddress || companyPhone) ? ' | ' : '') + 'GSTIN: ' + companyGstin : ''}
        </div>
      ` : ''}
      ${reportTitle ? `
        <div style="font-size: 13pt; font-weight: 800; text-transform: uppercase; margin-top: 6px; color: #000; border-top: 1px solid #444; padding-top: 4px; letter-spacing: 0.5px;">
          ${reportTitle}
        </div>
      ` : ''}
      ${extraLine ? `<div style="font-size: 10pt; font-weight: bold; color: #111; margin-top: 3px;">${extraLine}</div>` : ''}
      <div style="display: flex; justify-content: space-between; font-size: 9pt; color: #000; margin-top: 5px; font-weight: 600; border-top: 1px dashed #777; padding-top: 4px;">
        <span>${subHeaderLeft}</span>
        <span>${subHeaderRight}</span>
        <span>Print Date: ${printDateStr} ${printTimeStr}</span>
      </div>
    </div>
  `;
}


export function setReportsActiveTab(tab) {
  activeReportTab = tab;
}

export function setPartyReportTab(subTab) {
  activeReportTab = "parties";
  if (subTab === "debtors") activePartySubTab = "customer";
  else if (subTab === "creditors") activePartySubTab = "vendor";
  else activePartySubTab = subTab || "customer";
}

function prepareReportContainer(container) {
  window.reportsContainer = container;

  if (!window.reportsEscListenerBound) {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && activeReportTab === "ledger" && lastSelectedPartyTab) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        activeReportTab = "parties";
        activePartySubTab = lastSelectedPartyTab;
        filterSearchText = (lastSelectedPartyId && lastSelectedPartyId.includes("::")) ? lastSelectedPartyId.split("::")[0] : (lastSelectedPartyId || "");
        lastSelectedPartyTab = null;
        if (window.reportsContainer) {
          renderPartiesReportView(window.reportsContainer);
        }
      }
    }, true);
    window.reportsEscListenerBound = true;
  }

  const activeFyStart = state.getActiveFinancialYearStartDate();
  const activeFyEnd = state.getActiveFinancialYearEndDate();
  
  let maxTxDate = new Date().toISOString().split("T")[0];
  state.getTransactions().forEach(t => {
    if (t.date && t.date > maxTxDate) {
      maxTxDate = t.date;
    }
  });

  if (!reportStartDate) {
    reportStartDate = activeFyStart || "2026-04-01";
  }
  if (!taxFromDate) taxFromDate = activeFyStart || "2026-04-01";
  if (!filterFromDate) filterFromDate = activeFyStart || "2026-04-01";
  if (!ledgerFromDate) ledgerFromDate = activeFyStart || "2026-04-01";
  
  const defaultToDate = activeFyEnd && activeFyEnd > maxTxDate ? activeFyEnd : maxTxDate;

  if (!reportEndDate) reportEndDate = defaultToDate;
  if (!taxToDate) taxToDate = defaultToDate;
  if (!filterToDate) filterToDate = defaultToDate;
  if (!ledgerToDate) ledgerToDate = defaultToDate;

  container.style.overflow = "hidden";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  container.style.boxSizing = "border-box";
  container.style.padding = "10px 15px";
}

function renderReportError(container, error) {
  container.innerHTML = `
    <div style="padding: 20px; color: red; background: #fee2e2; border: 1px solid #fca5a5; font-family: sans-serif; margin: 20px;">
      <h3 style="margin-top: 0;">Error Rendering Report</h3>
      <p><strong>Message:</strong> ${error.message}</p>
      <pre style="white-space: pre-wrap; font-size: 12px; margin-top: 10px; background: #fef2f2; padding: 10px; border: 1px solid #fecaca; border-radius: 4px;">${error.stack}</pre>
    </div>
  `;
  console.error("Report render error:", error);
}

export function renderProfitLossReport(container) {
  try {
    activeReportTab = "pl";
    prepareReportContainer(container);
    const pl = state.getProfitLoss(reportStartDate, reportEndDate);

    container.innerHTML = `
      <div class="filters-row no-print" style="display: flex; align-items: center; justify-content: space-between; width: 100%; background-color: #cfd8e7; padding: 6px 12px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <label style="display: flex; align-items: center; gap: 4px; font-weight: normal; cursor: pointer; color: #000; margin-bottom: 0;">
            <input type="checkbox" id="pl-chk-detailed" ${plDetailed ? 'checked' : ''}> Detailed
          </label>
          <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
            <span>From:</span>
            ${renderTallyDatePickerHtml({ id: "rep-start-date", value: reportStartDate || "2026-04-01", style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            <span>To:</span>
            ${renderTallyDatePickerHtml({ id: "rep-end-date", value: reportEndDate || new Date().toISOString().split('T')[0], style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn" id="btn-apply-report-dates" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">View</button>
          <button class="btn" id="btn-reset-report-dates" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">Clear</button>
        </div>
      </div>
      <div id="report-view-content" style="flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
        ${renderProfitLossHtml(pl)}
      </div>
    `;

    initTallyDatePickers(container);




    const btnApply = document.getElementById("btn-apply-report-dates");
    if (btnApply) {
      btnApply.addEventListener("click", () => {
        reportStartDate = document.getElementById("rep-start-date").value;
        reportEndDate = document.getElementById("rep-end-date").value;
        renderProfitLossReport(container);
      });
    }

    const repStartDateEl = document.getElementById("rep-start-date");
    const repEndDateEl = document.getElementById("rep-end-date");
    const handlePlDateChange = () => {
      const sVal = repStartDateEl ? repStartDateEl.value : "";
      const eVal = repEndDateEl ? repEndDateEl.value : "";
      if (sVal !== reportStartDate || eVal !== reportEndDate) {
        reportStartDate = sVal;
        reportEndDate = eVal;
        if ((!reportStartDate || reportStartDate.length === 10) && (!reportEndDate || reportEndDate.length === 10)) {
          renderProfitLossReport(container);
        }
      }
    };
    if (repStartDateEl) {
      repStartDateEl.addEventListener("change", handlePlDateChange);
    }
    if (repEndDateEl) {
      repEndDateEl.addEventListener("change", handlePlDateChange);
    }

    const plChkDetailed = document.getElementById("pl-chk-detailed");
    if (plChkDetailed) {
      plChkDetailed.addEventListener("change", (e) => {
        plDetailed = e.target.checked;
        renderProfitLossReport(container);
      });
    }

    const btnReset = document.getElementById("btn-reset-report-dates");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        reportStartDate = "";
        reportEndDate = "";
        renderProfitLossReport(container);
      });
    }

    const plTableContainer = container.querySelector("#report-view-content");
    if (plTableContainer) {
      plTableContainer.addEventListener("dblclick", (e) => {
        const row = e.target.closest(".pl-clickable-particular");
        if (!row) return;

        const type = row.getAttribute("data-type");
        const label = row.getAttribute("data-label");
        const isChild = row.getAttribute("data-is-child") === "true";
        const isParent = row.getAttribute("data-is-parent") === "true";
        const code = row.getAttribute("data-code");

        if (label === "Opening Stock") {
          import("./openingStock.js").then(m => {
            if (typeof m.showOpeningStockRegisterModal === "function") {
              m.showOpeningStockRegisterModal();
            } else {
              window.location.hash = "#opening-stock-register";
            }
          });
          return;
        }

        if (label === "Closing Stock") {
          import("./inventory.js").then(m => {
            m.showDetailedStockRegisterModal();
          });
          return;
        }

        if (["Gross Profit c/o", "Gross Profit b/d", "Gross Loss c/o", "Gross Loss b/d", "Net Profit", "Net Loss"].includes(label)) {
          return;
        }

        // If double-clicking on an individual child ledger item, open the Individual Ledger Report!
        if (isChild || (!isParent && code)) {
          const target = code || label;
          const led = state.getLedgers().find(l => String(l.code) === target || l.name === target);
          if (led) {
            showIndividualLedgerModal(led.code);
            return;
          }
          const staticEntry = Object.entries(ACCOUNTS).find(([accCode, acc]) => accCode === target || acc.name.toUpperCase() === target.toUpperCase());
          if (staticEntry) {
            showIndividualLedgerModal(staticEntry[0]);
            return;
          }
          const contact = state.getContacts().find(c => String(c.id) === target || c.name === target);
          if (contact) {
            showIndividualLedgerModal(contact.id);
            return;
          }
          showIndividualLedgerModal(target);
          return;
        }

        // Otherwise (group header or parent line), open Group Summary Report!
        if (label === "PURCHASE ACCOUNT" || type === "purchase") {
          handleGroupDoubleClick("PURCHASE ACCOUNT", container);
        } else if (label === "SALES ACCOUNT" || type === "sales") {
          handleGroupDoubleClick("SALES ACCOUNT", container);
        } else if (type === "pl-debit") {
          handleGroupDoubleClick(label || "INDIRECT EXPENSES", container);
        } else if (type === "pl-credit") {
          handleGroupDoubleClick(label || "INDIRECT INCOME", container);
        }
      });
    }
  } catch (error) {
    renderReportError(container, error);
  }
}

export function renderBalanceSheetReport(container) {
  try {
    if (activeReportTab === "obs") {
      return renderOpeningBalanceSheetReport(container);
    }
    activeReportTab = "bs";
    prepareReportContainer(container);
    const bs = state.getBalanceSheet(reportStartDate, reportEndDate);

    container.innerHTML = `
      <div class="no-print" style="display: flex; align-items: center; justify-content: space-between; background-color: #cfd8e7; padding: 6px 12px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <label style="display: flex; align-items: center; gap: 4px; font-weight: normal; cursor: pointer; color: #000; margin-bottom: 0;">
            <input type="checkbox" id="bs-chk-detailed" ${bsDetailed ? 'checked' : ''}> Detailed
          </label>
          <label style="display: flex; align-items: center; gap: 4px; font-weight: normal; cursor: pointer; color: #7f7f7f; margin-bottom: 0;">
            <input type="checkbox" id="bs-chk-subgroups" ${bsSubGroups ? 'checked' : ''}> With Ledgers Under Sub Groups
          </label>
          <label style="display: flex; align-items: center; gap: 4px; font-weight: bold; cursor: pointer; color: #1e3a8a; margin-bottom: 0; margin-left: 5px;">
            <input type="checkbox" id="bs-chk-opening"> Opening Balance Sheet
          </label>
          <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
            <span>From:</span>
            ${renderTallyDatePickerHtml({ id: "bs-start-date", value: reportStartDate || "2026-04-01", style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            <span>To:</span>
            ${renderTallyDatePickerHtml({ id: "bs-end-date", value: reportEndDate || new Date().toISOString().split('T')[0], style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn" id="btn-bs-view" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">View</button>
          <button class="btn" id="btn-bs-print" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">Print</button>
          <button class="btn" id="btn-bs-close" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">Close</button>
        </div>
      </div>
      <div id="report-view-content" style="flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
        ${renderBalanceSheetHtml(bs)}
      </div>
    `;

    initTallyDatePickers(container);

    const chkDetailed = document.getElementById("bs-chk-detailed");
    if (chkDetailed) {
      chkDetailed.addEventListener("change", (e) => {
        bsDetailed = e.target.checked;
        renderBalanceSheetReport(container);
      });
    }

    const chkSubGroups = document.getElementById("bs-chk-subgroups");
    if (chkSubGroups) {
      chkSubGroups.addEventListener("change", (e) => {
        bsSubGroups = e.target.checked;
        renderBalanceSheetReport(container);
      });
    }

    const chkOpening = document.getElementById("bs-chk-opening");
    if (chkOpening) {
      chkOpening.addEventListener("change", (e) => {
        if (e.target.checked) {
          renderOpeningBalanceSheetReport(container);
        }
      });
    }

    const btnBsView = document.getElementById("btn-bs-view");
    if (btnBsView) {
      btnBsView.addEventListener("click", () => {
        reportStartDate = document.getElementById("bs-start-date").value;
        reportEndDate = document.getElementById("bs-end-date").value;
        renderBalanceSheetReport(container);
      });
    }

    const bsStartDateEl = document.getElementById("bs-start-date");
    const bsEndDateEl = document.getElementById("bs-end-date");
    const handleBsDateChange = () => {
      const sVal = bsStartDateEl ? bsStartDateEl.value : "";
      const eVal = bsEndDateEl ? bsEndDateEl.value : "";
      if (sVal !== reportStartDate || eVal !== reportEndDate) {
        reportStartDate = sVal;
        reportEndDate = eVal;
        if ((!reportStartDate || reportStartDate.length === 10) && (!reportEndDate || reportEndDate.length === 10)) {
          renderBalanceSheetReport(container);
        }
      }
    };
    if (bsStartDateEl) {
      bsStartDateEl.addEventListener("change", handleBsDateChange);
    }
    if (bsEndDateEl) {
      bsEndDateEl.addEventListener("change", handleBsDateChange);
    }

    const btnBsPrint = document.getElementById("btn-bs-print");
    if (btnBsPrint) {
      btnBsPrint.addEventListener("click", () => {
        window.print();
      });
    }

    const btnBsClose = document.getElementById("btn-bs-close");
    if (btnBsClose) {
      btnBsClose.addEventListener("click", () => {
        const modalOverlay = container.closest(".modal-overlay");
        if (modalOverlay) {
          modalOverlay.remove();
        } else {
          window.location.hash = "";
        }
      });
    }

    const bsTableContainer = container.querySelector("#report-view-content");
    if (bsTableContainer) {
      bsTableContainer.addEventListener("dblclick", (e) => {
        const row = e.target.closest(".bs-clickable-row");
        if (!row) return;

        const type = row.getAttribute("data-type");
        const name = row.getAttribute("data-name");

        if (type === "pl-link") {
          showProfitLossModal();
          return;
        }

        if (name === "Stock on Hand" || name === "Stock-in-Hand") {
          import("./inventory.js").then(m => {
            m.showDetailedStockRegisterModal();
          });
          return;
        }

        if (type === "group") {
          handleGroupDoubleClick(name, container);
        } else if (type === "ledger") {
          if (name.includes("Sundry Debtors") || name.includes("Accounts Receivable")) {
            showGroupSummaryModal("SUNDRY DEBTORS");
          } else if (name.includes("Sundry Creditors") || name.includes("Accounts Payable")) {
            showGroupSummaryModal("SUNDRY CREDITORS");
          } else if (name.includes("GST/VAT Payable")) {
            showGroupSummaryModal("DUTIES & TAXES");
          } else {
            const led = state.getLedgers().find(l => l.name === name);
            if (led) {
              showIndividualLedgerModal(led.code);
            } else {
              const staticEntry = Object.entries(ACCOUNTS).find(([code, acc]) => acc.name.toUpperCase() === name.toUpperCase());
              if (staticEntry) {
                showIndividualLedgerModal(staticEntry[0]);
              } else {
                const contact = state.getContacts().find(c => c.name === name);
                if (contact) {
                  showIndividualLedgerModal(contact.id);
                }
              }
            }
          }
        }
      });
    }
  } catch (error) {
    renderReportError(container, error);
  }
}

export function renderOpeningBalanceSheetReport(container) {
  try {
    activeReportTab = "obs";
    prepareReportContainer(container);
    const bs = state.getOpeningBalanceSheet();

    container.innerHTML = `
      <div class="no-print" style="display: flex; align-items: center; justify-content: space-between; background-color: #cfd8e7; padding: 6px 12px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <label style="display: flex; align-items: center; gap: 4px; font-weight: normal; cursor: pointer; color: #000; margin-bottom: 0;">
            <input type="checkbox" id="obs-chk-detailed" ${bsDetailed ? 'checked' : ''}> Detailed
          </label>
          <label style="display: flex; align-items: center; gap: 4px; font-weight: bold; cursor: pointer; color: #1e3a8a; margin-bottom: 0; margin-left: 5px;">
            <input type="checkbox" id="obs-chk-opening" checked> Opening Balance Sheet
          </label>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn" id="btn-obs-print" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">Print</button>
          <button class="btn" id="btn-obs-close" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">Close</button>
        </div>
      </div>
      <div id="report-view-content" style="flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
        ${renderBalanceSheetHtml(bs)}
      </div>
    `;

    const chkDetailed = document.getElementById("obs-chk-detailed");
    if (chkDetailed) {
      chkDetailed.addEventListener("change", (e) => {
        bsDetailed = e.target.checked;
        renderOpeningBalanceSheetReport(container);
      });
    }

    const chkOpening = document.getElementById("obs-chk-opening");
    if (chkOpening) {
      chkOpening.addEventListener("change", (e) => {
        if (!e.target.checked) {
          activeReportTab = "bs";
          renderBalanceSheetReport(container);
        }
      });
    }

    const btnObsPrint = document.getElementById("btn-obs-print");
    if (btnObsPrint) {
      btnObsPrint.addEventListener("click", () => {
        window.print();
      });
    }

    const btnObsClose = document.getElementById("btn-obs-close");
    if (btnObsClose) {
      btnObsClose.addEventListener("click", () => {
        const modalOverlay = container.closest(".modal-overlay");
        if (modalOverlay) {
          modalOverlay.remove();
        } else {
          window.location.hash = "";
        }
      });
    }

    const bsTableContainer = container.querySelector("#report-view-content");
    if (bsTableContainer) {
      bsTableContainer.addEventListener("dblclick", (e) => {
        const row = e.target.closest(".bs-clickable-row");
        if (!row) return;

        const type = row.getAttribute("data-type");
        const name = row.getAttribute("data-name");

        if (name === "Stock on Hand" || name.includes("Stock on Hand")) {
          import("./inventory.js").then(m => {
            m.showDetailedStockRegisterModal();
          });
          return;
        }

        if (type === "group") {
          handleGroupDoubleClick(name, container);
        } else if (type === "ledger") {
          if (name.includes("Sundry Debtors")) {
            showGroupSummaryModal("SUNDRY DEBTORS");
          } else if (name.includes("Sundry Creditors")) {
            showGroupSummaryModal("SUNDRY CREDITORS");
          } else if (name.includes("GST/VAT Payable")) {
            showGroupSummaryModal("DUTIES & TAXES");
          }
        }
      });
    }
  } catch (error) {
    renderReportError(container, error);
  }
}

export function renderTrialBalanceReport(container) {
  try {
    activeReportTab = "trial";
    prepareReportContainer(container);

    container.innerHTML = `
      <div id="report-view-content" style="flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow-y: auto; overflow-x: auto;">
        ${renderTrialBalanceHtml()}
      </div>
    `;

    const tbTableContainer = container.querySelector("#report-view-content");
    if (tbTableContainer) {
      tbTableContainer.addEventListener("dblclick", (e) => {
        const row = e.target.closest(".tb-clickable-row");
        if (!row) return;

        const name = row.getAttribute("data-name");
        const code = row.getAttribute("data-code");
        const isGroup = row.getAttribute("data-is-group") === "true";
        const isStock = row.getAttribute("data-is-stock") === "true";

        if (isStock || name === "Opening Stock" || name === "Stock on Hand (Opening)") {
          import("./openingStock.js").then(m => {
            if (typeof m.showOpeningStockRegisterModal === "function") {
              m.showOpeningStockRegisterModal();
            } else {
              window.location.hash = "#opening-stock-register";
            }
          });
          return;
        }

        if (isGroup || name === "SUNDRY DEBTORS" || name === "SUNDRY CREDITORS") {
          if (name === "SUNDRY DEBTORS") {
            showPartiesReportModal("customer");
          } else if (name === "SUNDRY CREDITORS") {
            showPartiesReportModal("vendor");
          } else {
            handleGroupDoubleClick(name, container);
          }
          return;
        }

        if (code || name) {
          showIndividualLedgerModal(code || name);
        }
      });
    }
  } catch (error) {
    renderReportError(container, error);
  }
}

export function renderTaxSummaryReport(container) {
  try {
    activeReportTab = "tax";
    prepareReportContainer(container);

    container.innerHTML = `
      <div id="report-view-content" style="flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
        ${renderTaxSummaryHtml()}
      </div>
    `;

    initTallyDatePickers(container);



    const btnTaxView = document.getElementById("btn-tax-view");

    if (btnTaxView) {
      btnTaxView.addEventListener("click", () => {
        taxFromDate = document.getElementById("tax-from-date").value;
        taxToDate = document.getElementById("tax-to-date").value;
        renderTaxSummaryReport(container);
      });
    }

    const taxFromDateEl = document.getElementById("tax-from-date");
    const taxToDateEl = document.getElementById("tax-to-date");
    const handleTaxDateChange = () => {
      const fVal = taxFromDateEl ? taxFromDateEl.value : "";
      const tVal = taxToDateEl ? taxToDateEl.value : "";
      if ((!fVal || fVal.length === 10) && (!tVal || tVal.length === 10)) {
        if (fVal !== taxFromDate || tVal !== taxToDate) {
          taxFromDate = fVal;
          taxToDate = tVal;
          renderTaxSummaryReport(container);
        }
      }
    };
    if (taxFromDateEl) {
      taxFromDateEl.addEventListener("change", handleTaxDateChange);
    }
    if (taxToDateEl) {
      taxToDateEl.addEventListener("change", handleTaxDateChange);
    }
    const btnTaxPrint = document.getElementById("btn-tax-print");
    if (btnTaxPrint) {
      btnTaxPrint.addEventListener("click", () => {
        window.print();
      });
    }
    const btnTaxClose = document.getElementById("btn-tax-close");
    if (btnTaxClose) {
      btnTaxClose.addEventListener("click", () => {
        window.location.hash = "";
      });
    }
  } catch (error) {
    renderReportError(container, error);
  }
}

export function renderIndividualLedgerReport(container) {
  try {
    activeReportTab = "ledger";
    prepareReportContainer(container);

    container.innerHTML = `
      <div id="report-view-content" style="flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
        ${renderIndividualLedgerHtml()}
      </div>
    `;

    initTallyDatePickers(container);



    setupLedgerCombobox(container, (selectedId) => {

      selectedIndividualLedgerId = selectedId;
      renderIndividualLedgerReport(container);
    });

    const selectVType = document.getElementById("il-select-vtype");
    if (selectVType) {
      selectVType.addEventListener("change", (e) => {
        ledgerVoucherTypeFilter = e.target.value;
        renderIndividualLedgerReport(container);
      });
    }

    const fromDateInput = document.getElementById("il-from-date");
    if (fromDateInput) {
      const handleFromDate = (e) => {
        const val = e.target.value;
        if (!val || val.length === 10) {
          ledgerFromDate = val;
          renderIndividualLedgerReport(container);
        }
      };
      fromDateInput.addEventListener("change", handleFromDate);
    }

    const toDateInput = document.getElementById("il-to-date");
    if (toDateInput) {
      const handleToDate = (e) => {
        const val = e.target.value;
        if (!val || val.length === 10) {
          ledgerToDate = val;
          renderIndividualLedgerReport(container);
        }
      };
      toDateInput.addEventListener("change", handleToDate);
    }

    const chkPdc = document.getElementById("il-chk-pdc");
    if (chkPdc) {
      chkPdc.addEventListener("change", (e) => {
        ledgerIncludePdc = e.target.checked;
        renderIndividualLedgerReport(container);
      });
    }

    const chkMonthly = document.getElementById("il-chk-monthly");
    if (chkMonthly) {
      chkMonthly.addEventListener("change", (e) => {
        ledgerMonthly = e.target.checked;
        renderIndividualLedgerReport(container);
      });
    }
    const chkNarration = document.getElementById("il-chk-narration");
    if (chkNarration) {
      chkNarration.addEventListener("change", (e) => {
        ledgerShowNarration = e.target.checked;
        document.querySelectorAll(".ledger-narration-text").forEach(el => {
          el.style.display = ledgerShowNarration ? "block" : "none";
        });
      });
    }
    const chkBalPrint = document.getElementById("il-chk-balprint");
    if (chkBalPrint) {
      chkBalPrint.addEventListener("change", (e) => {
        ledgerShowBalanceInPrint = e.target.checked;
        renderIndividualLedgerReport(container);
      });
    }

    const chkSummaryFinalOnly = document.getElementById("il-chk-summary-final-only");
    if (chkSummaryFinalOnly) {
      chkSummaryFinalOnly.addEventListener("change", (e) => {
        ledgerSummaryFinalPageOnly = e.target.checked;
        renderIndividualLedgerReport(container);
      });
    }

    const chkHideOp = document.getElementById("il-chk-hide-op");
    if (chkHideOp) {
      chkHideOp.addEventListener("change", (e) => {
        ledgerHideOp = e.target.checked;
        renderIndividualLedgerReport(container);
      });
    }

    const btnIlView = document.getElementById("btn-il-view");
    if (btnIlView) {
      btnIlView.addEventListener("click", () => {
        renderIndividualLedgerReport(container);
      });
    }

    const btnIlPrint = document.getElementById("btn-il-print");
    if (btnIlPrint) {
      btnIlPrint.addEventListener("click", () => {
        window.print();
      });
    }

    const btnIlWhatsapp = document.getElementById("btn-il-whatsapp");
    if (btnIlWhatsapp) {
      btnIlWhatsapp.addEventListener("click", () => {
        const contacts = state.getContacts();
        const allAccounts = getAllIndividualLedgerAccounts();
        const selectedAcc = resolveIndividualLedgerAccount(selectedIndividualLedgerId, allAccounts);
        if (!selectedAcc) {
          alert("No ledger selected.");
          return;
        }
        
        const baseId = selectedAcc.id.includes("::") ? selectedAcc.id.split("::")[0] : selectedAcc.id;
        const contact = contacts.find(c => c.id === baseId);
        
        let waNumber = contact ? (contact.whatsApp || contact.mobile || contact.phone || "") : "";
        if (!waNumber.trim()) {
          const inputNum = prompt("Enter WhatsApp Number (with country code, e.g. 919876543210):");
          if (inputNum === null) return;
          waNumber = inputNum.trim();
        }
        if (!waNumber) {
          alert("WhatsApp number is required.");
          return;
        }
        
        const reportsMod = getLedgerEntries(selectedAcc.id, ledgerFromDate, ledgerToDate, ledgerVoucherTypeFilter, ledgerEmployeeFilter);
        const entries = reportsMod.entries || [];
        const opBal = reportsMod.openingBalance || 0;
        const opBalSuffix = reportsMod.openingBalanceSuffix || "Dr";
        
        let totalDr = 0;
        let totalCr = 0;
        entries.forEach(e => {
          totalDr += e.debit || 0;
          totalCr += e.credit || 0;
        });
        
        const lastEntry = entries[entries.length - 1];
        const clBal = lastEntry ? lastEntry.balance : opBal;
        const clBalSuffix = lastEntry ? lastEntry.balanceSuffix : opBalSuffix;
        
        const cleanNum = waNumber.replace(/\D/g, "");
        const msg = `Dear *${selectedAcc.name}*,\n\nHere is your *Account Statement* from *${formatDateDisplay(ledgerFromDate)}* to *${formatDateDisplay(ledgerToDate)}*.\n\n*Opening Balance*: \u20B9${opBal.toFixed(2)} ${opBalSuffix}\n*Total Debits*: \u20B9${totalDr.toFixed(2)}\n*Total Credits*: \u20B9${totalCr.toFixed(2)}\n*Closing Balance*: *\u20B9${clBal.toFixed(2)} ${clBalSuffix}*\n\nThank you!\n*Material Ledger ERP*`;
        const waUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank");
      });
    }

    const btnIlClose = document.getElementById("btn-il-close");
    if (btnIlClose) {
      btnIlClose.addEventListener("click", () => {
        if (lastSelectedPartyTab) {
          activeReportTab = "parties";
          activePartySubTab = lastSelectedPartyTab;
          filterSearchText = lastSelectedPartyId.includes("::") ? lastSelectedPartyId.split("::")[0] : lastSelectedPartyId;
          lastSelectedPartyTab = null;
          renderPartiesReportView(container);
        } else {
          window.location.hash = "";
        }
      });
    }

    document.querySelectorAll(".ledger-row-clickable").forEach(row => {
      row.addEventListener("click", () => {
        document.querySelectorAll(".ledger-row-clickable").forEach(r => {
          r.classList.remove("active-selected-row");
          r.style.backgroundColor = "";
          const pLink = r.querySelector(".ledger-particular-link");
          if (pLink) pLink.style.color = "#1e3b8b";
        });
        row.classList.add("active-selected-row");
        row.style.backgroundColor = "#dbeafe";
        const pLink = row.querySelector(".ledger-particular-link");
        if (pLink) pLink.style.color = "#1d4ed8";
      });

      row.addEventListener("dblclick", () => {
        document.querySelectorAll(".ledger-row-clickable").forEach(r => {
          r.classList.remove("active-selected-row");
          r.style.backgroundColor = "";
          const pLink = r.querySelector(".ledger-particular-link");
          if (pLink) pLink.style.color = "#1e3b8b";
        });
        row.classList.add("active-selected-row");
        row.style.backgroundColor = "#dbeafe";
        const pLink = row.querySelector(".ledger-particular-link");
        if (pLink) pLink.style.color = "#1d4ed8";

        const txId = row.getAttribute("data-tx-id");
        openVoucherOrInvoice(txId, container, () => renderIndividualLedgerReport(container));
      });
    });
  } catch (error) {
    renderReportError(container, error);
  }
}

export function renderGroupSummaryReport(container) {
  try {
    activeReportTab = "groupSummary";
    prepareReportContainer(container);

    container.innerHTML = `
      <div id="report-view-content" style="flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow-y: auto;">
        ${renderGroupSummaryHtml()}
      </div>
    `;

    initTallyDatePickers(container);



    const gsGroupSelect = document.getElementById("gs-group-select");

    if (gsGroupSelect) {
      gsGroupSelect.addEventListener("change", (e) => {
        selectedGroupName = e.target.value;
        renderGroupSummaryReport(container);
      });
    }

    const gsChkDetail = document.getElementById("gs-chk-detail");
    if (gsChkDetail) {
      gsChkDetail.addEventListener("change", (e) => {
        groupDetailed = e.target.checked;
        renderGroupSummaryReport(container);
      });
    }

    const gsChkAvoid = document.getElementById("gs-chk-avoidnon");
    if (gsChkAvoid) {
      gsChkAvoid.addEventListener("change", (e) => {
        avoidNonTransaction = e.target.checked;
        renderGroupSummaryReport(container);
      });
    }

    const gsBtnView = document.getElementById("gs-btn-view");
    if (gsBtnView) {
      gsBtnView.addEventListener("click", () => {
        const fromVal = document.getElementById("gs-from-date")?.value;
        const toVal = document.getElementById("gs-to-date")?.value;
        if (fromVal) reportStartDate = fromVal;
        if (toVal) reportEndDate = toVal;
        renderGroupSummaryReport(container);
      });
    }

    const gsFromDate = document.getElementById("gs-from-date");
    const gsToDate = document.getElementById("gs-to-date");
    const handleGsDateChange = () => {
      const fromVal = gsFromDate?.value || "";
      const toVal = gsToDate?.value || "";
      if ((!fromVal || fromVal.length === 10) && (!toVal || toVal.length === 10)) {
        let changed = false;
        if (fromVal && fromVal !== reportStartDate) {
          reportStartDate = fromVal;
          changed = true;
        }
        if (toVal && toVal !== reportEndDate) {
          reportEndDate = toVal;
          changed = true;
        }
        if (changed) {
          renderGroupSummaryReport(container);
        }
      }
    };
    if (gsFromDate) {
      gsFromDate.addEventListener("change", handleGsDateChange);
    }
    if (gsToDate) {
      gsToDate.addEventListener("change", handleGsDateChange);
    }

    const gsBtnPrint = document.getElementById("gs-btn-print");
    if (gsBtnPrint) {
      gsBtnPrint.addEventListener("click", () => {
        window.print();
      });
    }

    const gsBtnClose = document.getElementById("gs-btn-close");
    if (gsBtnClose) {
      gsBtnClose.addEventListener("click", () => {
        window.location.hash = "";
      });
    }

    const gsSummaryTable = document.getElementById("gs-summary-table");
    if (gsSummaryTable) {
      gsSummaryTable.addEventListener("dblclick", (e) => {
        const row = e.target.closest("tr[data-account-id], tr[data-party-tab]");
        if (!row) return;

        const partyTab = row.getAttribute("data-party-tab");
        const accountId = row.getAttribute("data-account-id");

        if (partyTab) {
          activePartySubTab = partyTab;
          activeReportTab = "parties";
          renderPartiesReportView(container, partyTab);
          return;
        }

        if (accountId) {
          selectedIndividualLedgerId = accountId;
          activeReportTab = "ledger";
          renderIndividualLedgerReport(container);
        }
      });
    }
  } catch (error) {
    renderReportError(container, error);
  }
}

export function renderPartiesReportView(container, subTab) {
  try {
    activeReportTab = "parties";
    if (subTab) {
      activePartySubTab = (subTab === "debtors" ? "customer" : (subTab === "creditors" ? "vendor" : subTab));
    }
    prepareReportContainer(container);

    container.innerHTML = `
      <div id="report-view-content" style="flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
        ${renderPartiesReportHtml()}
      </div>
    `;

    initTallyDatePickers(container);



    document.querySelectorAll(".party-subtab-btn").forEach(btn => {

      btn.addEventListener("click", () => {
        activePartySubTab = btn.getAttribute("data-subtab");
        filterSearchText = "";
        selectedPartyRowId = "";
        selectedMultipleCustomerIds = [];
        renderPartiesReportView(container);
      });
    });

    document.querySelectorAll("input[name='bal-filter']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        filterBalType = e.target.value;
        renderPartiesReportView(container);
      });
    });

    document.querySelectorAll("input[name='sub-mode-filter']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        filterSubMode = e.target.value;
        renderPartiesReportView(container);
      });
    });

    const handlePartyDateChange = () => {
      const elFrom = document.getElementById("filter-from-date");
      const elTo = document.getElementById("filter-to-date");
      const fVal = elFrom ? elFrom.value : "";
      const tVal = elTo ? elTo.value : "";
      if ((!fVal || fVal.length === 10) && (!tVal || tVal.length === 10)) {
        filterFromDate = fVal;
        filterToDate = tVal;
        renderPartiesReportView(container);
      }
    };

    const fFrom = document.getElementById("filter-from-date");
    if (fFrom) {
      fFrom.addEventListener("change", handlePartyDateChange);
    }
    const fTo = document.getElementById("filter-to-date");
    if (fTo) {
      fTo.addEventListener("change", handlePartyDateChange);
    }

    const comboboxTrigger = document.getElementById("party-combobox-trigger");
    if (comboboxTrigger) {
      comboboxTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        partyComboboxOpen = !partyComboboxOpen;
        renderPartiesReportView(container);
        if (partyComboboxOpen) {
          const inp = document.getElementById("party-combobox-search-input");
          if (inp) {
            inp.focus();
            inp.setSelectionRange(inp.value.length, inp.value.length);
          }
        }
      });
    }

    const comboboxSearchInput = document.getElementById("party-combobox-search-input");
    if (comboboxSearchInput) {
      comboboxSearchInput.addEventListener("click", (e) => { e.stopPropagation(); });
      comboboxSearchInput.addEventListener("input", (e) => {
        partyDropdownSearchQuery = e.target.value;
        renderPartiesReportView(container);
        const inp = document.getElementById("party-combobox-search-input");
        if (inp) {
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
        }
      });
      comboboxSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const firstItem = document.querySelector("#party-combobox-items-list .party-combobox-item:not([data-id=''])") ||
                            document.querySelector("#party-combobox-items-list .party-combobox-item");
          if (firstItem) {
            const selectedId = firstItem.getAttribute("data-id") || "";
            filterSearchText = selectedId;
            if (!selectedId) {
              selectedPartyRowId = "";
              selectedMultipleCustomerIds = [];
            } else {
              selectedPartyRowId = selectedId;
            }
            partyComboboxOpen = false;
            partyDropdownSearchQuery = "";
            renderPartiesReportView(container);
          }
        } else if (e.key === "Escape") {
          partyComboboxOpen = false;
          renderPartiesReportView(container);
        }
      });
    }

    const clearQueryBtn = document.getElementById("btn-clear-combobox-query");
    if (clearQueryBtn) {
      clearQueryBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        partyDropdownSearchQuery = "";
        renderPartiesReportView(container);
        const inp = document.getElementById("party-combobox-search-input");
        if (inp) inp.focus();
      });
    }

    document.querySelectorAll(".party-combobox-item").forEach(item => {
      item.addEventListener("mouseenter", () => {
        item.style.background = "#eff6ff";
      });
      item.addEventListener("mouseleave", () => {
        const isSelected = item.getAttribute("data-id") === filterSearchText;
        item.style.background = isSelected ? "#dbeafe" : "#fff";
      });
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const selectedId = item.getAttribute("data-id") || "";
        filterSearchText = selectedId;
        if (!selectedId) {
          selectedPartyRowId = "";
          selectedMultipleCustomerIds = [];
        } else {
          selectedPartyRowId = selectedId;
        }
        partyComboboxOpen = false;
        partyDropdownSearchQuery = "";
        renderPartiesReportView(container);
      });
    });

    if (!window._partyComboboxGlobalClickBound) {
      window.addEventListener("click", (e) => {
        if (partyComboboxOpen && !e.target.closest(".party-searchable-combobox")) {
          partyComboboxOpen = false;
          if (window.reportsContainer) {
            renderPartiesReportView(window.reportsContainer);
          }
        }
      });
      window._partyComboboxGlobalClickBound = true;
    }

    const filterSiteTypeSelect = document.getElementById("filter-site-type");
    if (filterSiteTypeSelect) {
      filterSiteTypeSelect.addEventListener("change", (e) => {
        filterSiteType = e.target.value;
        partyCustomerTypeFilter = e.target.value;
        selectedMultipleCustomerIds = [];
        renderPartiesReportView(container);
      });
    }

    // Bind Sort dropdown
    const sortSelect = document.getElementById("filter-sort-parties");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        const [field, order] = val.split("_");
        partySortField = field;
        partySortOrder = order;
        renderPartiesReportView(container);
      });
    }

    // Bind Column Header click sorting
    document.querySelectorAll(".sortable-party-th").forEach(th => {
      th.addEventListener("click", () => {
        const sortField = th.getAttribute("data-sort");
        if (partySortField === sortField) {
          partySortOrder = partySortOrder === "asc" ? "desc" : "asc";
        } else {
          partySortField = sortField;
          partySortOrder = (sortField === "name" || sortField === "creditPeriod") ? "asc" : "desc";
        }
        renderPartiesReportView(container);
      });
    });

    // View button recalculates
    const btnView = document.getElementById("btn-view-report");
    if (btnView) {
      btnView.addEventListener("click", () => {
        renderPartiesReportView(container);
      });
    }

    // Print button
    const printBtn = document.getElementById("btn-print-report");
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        window.print();
      });
    }

    // Close button clears out
    const btnClose = document.getElementById("btn-close-report");
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        filterSearchText = "";
        selectedPartyRowId = "";
        selectedMultipleCustomerIds = [];
        window.location.hash = "";
      });
    }

    // Bind Customer Checkboxes
    document.querySelectorAll(".customer-select-checkbox").forEach(chk => {
      chk.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      chk.addEventListener("change", (e) => {
        e.stopPropagation();
        const id = chk.getAttribute("data-id");
        if (chk.checked) {
          if (!selectedMultipleCustomerIds.includes(id)) {
            selectedMultipleCustomerIds.push(id);
          }
          selectedPartyRowId = id;
        } else {
          selectedMultipleCustomerIds = selectedMultipleCustomerIds.filter(x => x !== id);
          if (selectedPartyRowId === id) {
            selectedPartyRowId = selectedMultipleCustomerIds[0] || null;
          }
        }
        renderReports(container);
      });
    });

    // Row selection, keyboard letter seeking, and navigation
    let tableTypeSeekBuffer = "";
    let tableTypeSeekTimer = null;

    const highlightAndScrollToRow = (targetRow) => {
      if (!targetRow) return;
      document.querySelectorAll(".party-row-select").forEach(r => {
        r.style.background = "#fff";
        r.style.outline = "none";
      });

      selectedPartyRowId = targetRow.getAttribute("data-id");
      targetRow.style.background = "#bfdbfe";
      targetRow.style.outline = "2px solid #3b82f6";

      targetRow.focus({ preventScroll: true });
      targetRow.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    document.querySelectorAll(".party-row-select").forEach(row => {
      // Single click highlights and sets active focus
      row.addEventListener("click", () => {
        highlightAndScrollToRow(row);
      });

      // Keyboard seeking & arrow navigation when focused
      row.addEventListener("keydown", (e) => {
        // Type any letter (A-Z, 0-9) to jump to matching customer
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          clearTimeout(tableTypeSeekTimer);
          tableTypeSeekBuffer += e.key.toLowerCase();

          const allRows = Array.from(document.querySelectorAll(".party-row-select"));
          const matched = allRows.find(r => (r.getAttribute("data-name") || "").toLowerCase().startsWith(tableTypeSeekBuffer)) ||
                          allRows.find(r => (r.getAttribute("data-name") || "").toLowerCase().includes(tableTypeSeekBuffer));

          if (matched) {
            highlightAndScrollToRow(matched);
          }

          tableTypeSeekTimer = setTimeout(() => {
            tableTypeSeekBuffer = "";
          }, 1200);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextRow = row.nextElementSibling;
          if (nextRow && nextRow.classList.contains("party-row-select")) {
            highlightAndScrollToRow(nextRow);
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prevRow = row.previousElementSibling;
          if (prevRow && prevRow.classList.contains("party-row-select")) {
            highlightAndScrollToRow(prevRow);
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          lastSelectedPartyTab = activePartySubTab;
          lastSelectedPartyId = row.getAttribute("data-id");
          selectedIndividualLedgerId = lastSelectedPartyId;
          activeReportTab = "ledger";
          renderReports(container);
        }
      });

      // Double-click opens individual ledger
      row.addEventListener("dblclick", () => {
        lastSelectedPartyTab = activePartySubTab;
        lastSelectedPartyId = row.getAttribute("data-id");
        selectedIndividualLedgerId = lastSelectedPartyId;
        activeReportTab = "ledger";
        renderReports(container);
      });
    });

    // Support keyboard typing when the table container is active
    const tableContainerEl = document.querySelector("#parties-table-scroll-container");
    if (tableContainerEl) {
      tableContainerEl.setAttribute("tabindex", "0");
      tableContainerEl.addEventListener("keydown", (e) => {
        if (e.target === tableContainerEl && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          clearTimeout(tableTypeSeekTimer);
          tableTypeSeekBuffer += e.key.toLowerCase();

          const allRows = Array.from(document.querySelectorAll(".party-row-select"));
          const matched = allRows.find(r => (r.getAttribute("data-name") || "").toLowerCase().startsWith(tableTypeSeekBuffer)) ||
                          allRows.find(r => (r.getAttribute("data-name") || "").toLowerCase().includes(tableTypeSeekBuffer));

          if (matched) {
            highlightAndScrollToRow(matched);
          }

          tableTypeSeekTimer = setTimeout(() => {
            tableTypeSeekBuffer = "";
          }, 1200);
        }
      });
    }

    // Bind site row double click
    document.querySelectorAll(".site-row-select").forEach(row => {
      row.addEventListener("dblclick", () => {
        lastSelectedPartyTab = activePartySubTab;
        lastSelectedPartyId = row.getAttribute("data-id");
        selectedIndividualLedgerId = lastSelectedPartyId;
        activeReportTab = "ledger";
        renderIndividualLedgerReport(container);
      });
    });

    // Bind breakdown print button
    document.querySelectorAll(".btn-print-breakdown").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const contactId = btn.getAttribute("data-contact-id");
        printBreakdownReport(contactId);
      });
    });

    // Bind breakdown close button
    document.querySelectorAll(".btn-close-breakdown").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedPartyRowId = "";
        filterSearchText = "";
        selectedMultipleCustomerIds = [];
        renderPartiesReportView(container);
      });
    });
  } catch (error) {
    renderReportError(container, error);
  }
}

export function renderReports(container) {
  if (activeReportTab === "pl") return renderProfitLossReport(container);
  if (activeReportTab === "bs") return renderBalanceSheetReport(container);
  if (activeReportTab === "obs") return renderOpeningBalanceSheetReport(container);
  if (activeReportTab === "trial") return renderTrialBalanceReport(container);
  if (activeReportTab === "tax") return renderTaxSummaryReport(container);
  if (activeReportTab === "ledger") return renderIndividualLedgerReport(container);
  if (activeReportTab === "groupSummary") return renderGroupSummaryReport(container);
  return renderPartiesReportView(container);
}

function renderActiveReport(pl, bs, tax) {
  if (activeReportTab === "pl") {
    return renderProfitLossHtml(pl);
  } else if (activeReportTab === "bs") {
    return renderBalanceSheetHtml(bs);
  } else if (activeReportTab === "obs") {
    return renderBalanceSheetHtml(state.getOpeningBalanceSheet());
  } else if (activeReportTab === "trial") {
    return renderTrialBalanceHtml();
  } else if (activeReportTab === "tax") {
    return renderTaxSummaryHtml();
  } else if (activeReportTab === "ledger") {
    return renderIndividualLedgerHtml();
  } else if (activeReportTab === "groupSummary") {
    return renderGroupSummaryHtml();
  } else if (activeReportTab === "batches") {
    return renderBatchStockHtml();
  } else {
    return renderPartiesReportHtml();
  }
}

function renderTrialBalanceHtml() {
  const balances = state.getAccountBalances();
  const ledgers = state.getLedgers();
  const contacts = state.getContacts();

  const tbRows = [];

  // 1. SUNDRY DEBTORS (Grouped)
  let debtorsBal = balances["1100"] ? balances["1100"].balance : 0;
  if (debtorsBal === 0) {
    contacts.forEach(c => {
      const isCreditor = c.type === "supplier" || c.listInVendorList || c.groupName === "SUNDRY CREDITORS";
      if (!isCreditor) {
        if (c.siteType === "multiple") {
          (c.sites || []).forEach(site => {
            const key = `${c.id}::${site}`;
            const balData = balances[key];
            if (balData) debtorsBal += (balData.balance || 0);
          });
        } else {
          const balData = balances[c.id];
          if (balData) debtorsBal += (balData.balance || 0);
        }
      }
    });
  }
  if (debtorsBal !== 0) {
    tbRows.push({ name: "SUNDRY DEBTORS", group: "Account Group", balance: debtorsBal, isGroup: true });
  }

  // 2. SUNDRY CREDITORS (Grouped)
  let creditorsBal = balances["2100"] ? balances["2100"].balance : 0;
  if (creditorsBal === 0) {
    contacts.forEach(c => {
      const isCreditor = c.type === "supplier" || c.listInVendorList || c.groupName === "SUNDRY CREDITORS";
      if (isCreditor) {
        if (c.siteType === "multiple") {
          (c.sites || []).forEach(site => {
            const key = `${c.id}::${site}`;
            const balData = balances[key];
            if (balData) creditorsBal += (balData.balance || 0);
          });
        } else {
          const balData = balances[c.id];
          if (balData) creditorsBal += (balData.balance || 0);
        }
      }
    });
  }
  if (creditorsBal !== 0) {
    tbRows.push({ name: "SUNDRY CREDITORS", group: "Account Group", balance: creditorsBal, isGroup: true });
  }

  // 3. Individual Ledgers (non-contact)
  ledgers.forEach(l => {
    const balData = balances[l.code];
    const bal = balData ? balData.balance : 0;
    if (bal !== 0) {
      const parentCust = contacts.find(c => 
        (l.parentCustomerId && c.id === l.parentCustomerId) || 
        c.id === l.code || 
        (c.ledgerCode && c.ledgerCode === l.code) || 
        (c.name && l.name && String(c.name).trim().toUpperCase() === String(l.name).trim().toUpperCase()) ||
        String(c.name || '').trim().toUpperCase() === String(l.groupName || '').trim().toUpperCase()
      );
      if (parentCust || l.groupName === "SUNDRY DEBTORS" || l.groupName === "SUNDRY CREDITORS") {
        return; // Handled under SUNDRY DEBTORS / SUNDRY CREDITORS
      }
      tbRows.push({ name: l.name, group: l.groupName || "Ledger Account", balance: bal, code: l.code, isGroup: false });
    }
  });

  // 4. Core Accounts without custom ledgers
  const CORE_DESCRIPTIONS = {
    "1010": { name: "Cash in Hand", group: "CASH-IN-HAND" },
    "1020": { name: "Bank Current Account", group: "BANK ACCOUNTS" },
    "2200": { name: "GST/VAT Payable", group: "DUTIES & TAXES" },
    "3100": { name: "Capital Account", group: "CAPITAL ACCOUNT" },
    "4100": { name: "Sales Account", group: "SALES ACCOUNT" }
  };

  Object.entries(CORE_DESCRIPTIONS).forEach(([code, meta]) => {
    const coreBal = balances[code] ? balances[code].balance : 0;
    if (coreBal !== 0) {
      const isAlreadyCaptured = tbRows.some(r => r.code === code);
      if (!isAlreadyCaptured) {
        tbRows.push({ name: meta.name, group: meta.group, balance: coreBal, code: code, isGroup: false });
      }
    }
  });

  // 5. Opening Stock
  const openingStockVal = state.getOpeningStockValuation ? state.getOpeningStockValuation() : 0;
  if (openingStockVal !== 0) {
    tbRows.push({ name: "Stock on Hand (Opening)", group: "CURRENT ASSETS", balance: openingStockVal, isGroup: false, isStock: true });
  }

  let totalDebit = 0;
  let totalCredit = 0;

  const rowsHtml = tbRows.map(r => {
    let debit = 0;
    let credit = 0;
    if (r.balance > 0) {
      debit = r.balance;
      totalDebit += debit;
    } else if (r.balance < 0) {
      credit = -r.balance;
      totalCredit += credit;
    } else {
      return "";
    }

    const isOpeningStock = r.isStock || r.name === "Stock on Hand (Opening)";
    const isGroup = r.isGroup || r.name === "SUNDRY DEBTORS" || r.name === "SUNDRY CREDITORS";

    return `
      <tr class="tb-clickable-row" data-name="${r.name}" data-code="${r.code || ''}" data-is-group="${isGroup}" data-is-stock="${isOpeningStock}" style="border-bottom: 1px solid var(--border-color); cursor: pointer;" title="${isOpeningStock ? 'Double-click to view Opening Stock Register' : (isGroup ? 'Double-click to view group details' : 'Double-click to view ledger details')}">
        <td style="padding: 8px 12px; font-weight: ${isGroup ? 'bold' : '500'}; color: var(--text-primary);">${r.name}</td>
        <td style="padding: 8px 12px; color: var(--text-secondary);">${r.group || 'Ledger Account'}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: var(--text-primary);">${debit > 0 ? '\u20B9' + debit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: var(--text-primary);">${credit > 0 ? '\u20B9' + credit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
      </tr>
    `;
  }).filter(Boolean).join("");

  return `
    <div class="panel" style="overflow-y: auto; flex: 1 1 auto; max-height: 100%;">
      <!-- Official Company Letterhead Header for Print View -->
      ${renderPrintHeaderHtml(
        "TRIAL BALANCE SUMMARY",
        "As on: <strong>" + new Date().toLocaleDateString('en-IN') + "</strong>"
      )}

      <div class="no-print" style="text-align: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.8rem;">
        <h3 style="font-size: 1.5rem; font-family: var(--font-heading); color: var(--accent-color);">Trial Balance Summary</h3>
        <p style="font-size: 0.8rem; color: var(--text-secondary);">As of: ${new Date().toISOString().split("T")[0]}</p>
      </div>

      <div style="overflow-x: auto; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; color: var(--text-primary);">
          <thead>
            <tr style="background-color: var(--card-bg); border-bottom: 2px solid var(--border-color); font-weight: bold;">
              <th style="padding: 8px 12px; text-align: left; color: var(--text-primary);">Particulars / Ledger Account</th>
              <th style="padding: 8px 12px; text-align: left; color: var(--text-primary);">Group / Type</th>
              <th style="padding: 8px 12px; text-align: right; width: 150px; color: var(--text-primary);">Debit Balance</th>
              <th style="padding: 8px 12px; text-align: right; width: 150px; color: var(--text-primary);">Credit Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-secondary);">All account balances are zero.</td></tr>`}
            <tr style="border-top: 2px solid var(--border-color); background-color: var(--card-bg); font-weight: bold; font-size: 0.85rem;">
              <td colspan="2" style="padding: 10px 12px; text-align: left; color: var(--text-primary);">TOTALS</td>
              <td style="padding: 10px 12px; text-align: right; color: var(--accent-color);">\u20B9${totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 10px 12px; text-align: right; color: var(--accent-color);">\u20B9${totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProfitLossHtml(pl) {
  const displayDates = (reportStartDate || reportEndDate) ? 
    `Statement Period: <strong>${reportStartDate || 'Opening'}</strong> to <strong>${reportEndDate || 'Latest'}</strong>` : 
    `Statement Period: <strong>All-Time Cumulative</strong>`;

  const gp = pl.grossProfit || 0;
  const np = pl.netProfit || 0;

  // Trading Debit (Left)
  const tradingDebitRows = [
    { label: "Opening Stock", amount: pl.openingStock }
  ];
  if (plDetailed && pl.purchaseDetails && pl.purchaseDetails.length > 0) {
    tradingDebitRows.push({ label: "PURCHASE ACCOUNT", amount: pl.purchase, isParent: true });
    pl.purchaseDetails.forEach(d => {
      tradingDebitRows.push({ label: d.name, amount: d.amount, isChild: true, code: d.code || d.id });
    });
  } else {
    tradingDebitRows.push({ label: "PURCHASE ACCOUNT", amount: pl.purchase, isParent: true });
  }
  tradingDebitRows.filter(r => Math.abs(r.amount) > 0.001);
  
  if (gp >= 0) {
    tradingDebitRows.push({ label: "Gross Profit c/o", amount: gp, isProfit: true });
  }
  const tradingDebitTotal = pl.openingStock + pl.purchase + (gp >= 0 ? gp : 0);

  // Trading Credit (Right)
  const tradingCreditRows = [];
  if (plDetailed && pl.salesDetails && pl.salesDetails.length > 0) {
    tradingCreditRows.push({ label: "SALES ACCOUNT", amount: pl.sales, isParent: true });
    pl.salesDetails.forEach(d => {
      tradingCreditRows.push({ label: d.name, amount: d.amount, isChild: true, code: d.code || d.id });
    });
  } else {
    tradingCreditRows.push({ label: "SALES ACCOUNT", amount: pl.sales, isParent: true });
  }
  tradingCreditRows.push({ label: "Closing Stock", amount: pl.closingStock });
  tradingCreditRows.filter(r => Math.abs(r.amount) > 0.001);
  
  if (gp < 0) {
    tradingCreditRows.push({ label: "Gross Loss c/o", amount: Math.abs(gp), isLoss: true });
  }
  const tradingCreditTotal = pl.sales + pl.closingStock + (gp < 0 ? Math.abs(gp) : 0);

  // P&L Debit (Left)
  const plDebitRows = [];
  if (gp < 0) {
    plDebitRows.push({ label: "Gross Loss b/d", amount: Math.abs(gp) });
  }
  
  const indirectExpensesTotal = pl.otherExpenses.reduce((sum, e) => sum + e.amount, 0);
  if (plDetailed) {
    const expensesByGroup = {};
    pl.otherExpenses.forEach(e => {
      const g = e.groupName || "INDIRECT EXPENSES";
      if (!expensesByGroup[g]) expensesByGroup[g] = [];
      expensesByGroup[g].push(e);
    });
    Object.keys(expensesByGroup).forEach(g => {
      const gTotal = expensesByGroup[g].reduce((sum, e) => sum + e.amount, 0);
      plDebitRows.push({ label: g, amount: gTotal, isParent: true });
      expensesByGroup[g].forEach(e => {
        plDebitRows.push({ label: e.name, amount: e.amount, isChild: true, code: e.code || e.id });
      });
    });
  } else {
    plDebitRows.push({ label: "Indirect Expenses", amount: indirectExpensesTotal, isParent: true });
  }

  if (np >= 0) {
    plDebitRows.push({ label: "Net Profit", amount: np, isProfit: true });
  }
  const plDebitTotal = (gp < 0 ? Math.abs(gp) : 0) + indirectExpensesTotal + (np >= 0 ? np : 0);

  // P&L Credit (Right)
  const plCreditRows = [];
  if (gp >= 0) {
    plCreditRows.push({ label: "Gross Profit b/d", amount: gp });
  }

  const indirectIncomesTotal = pl.otherIncomes.reduce((sum, i) => sum + i.amount, 0);
  if (plDetailed) {
    const incomesByGroup = {};
    pl.otherIncomes.forEach(i => {
      const g = i.groupName || "INDIRECT INCOME";
      if (!incomesByGroup[g]) incomesByGroup[g] = [];
      incomesByGroup[g].push(i);
    });
    Object.keys(incomesByGroup).forEach(g => {
      const gTotal = incomesByGroup[g].reduce((sum, i) => sum + i.amount, 0);
      plCreditRows.push({ label: g, amount: gTotal, isParent: true });
      incomesByGroup[g].forEach(i => {
        plCreditRows.push({ label: i.name, amount: i.amount, isChild: true, code: i.code || i.id });
      });
    });
  } else {
    if (indirectIncomesTotal > 0) {
      plCreditRows.push({ label: "Indirect Income", amount: indirectIncomesTotal, isParent: true });
    }
  }
  if (np < 0) {
    plCreditRows.push({ label: "Net Loss", amount: Math.abs(np), isLoss: true });
  }

  const plCreditTotal = (gp >= 0 ? gp : 0) + indirectIncomesTotal + (np < 0 ? Math.abs(np) : 0);

  return `
    <div class="panel" style="padding: 0; background: none; box-shadow: none; border: none; font-family: Tahoma, sans-serif;">
      <!-- Official Company Letterhead Header for Print View -->
      ${renderPrintHeaderHtml(
        "TRADING AND PROFIT & LOSS ACCOUNT",
        "Period: <strong>" + (reportStartDate ? formatDateDisplay(reportStartDate) : "Beginning") + " to " + (reportEndDate ? formatDateDisplay(reportEndDate) : "Latest") + "</strong>"
      )}

      <div class="no-print" style="text-align: center; margin-bottom: 1.5rem; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1rem;">
        <h3 style="font-size: 1.3rem; margin: 0; color: #1e3a8a; font-weight: bold;">Trading and Profit & Loss Account</h3>
        <p style="font-size: 0.8rem; color: #475569; margin: 4px 0 0 0;">${displayDates}</p>
      </div>

      <div style="display: flex; border: 1px solid #707070; background-color: #ffffff; font-size: 13px; color: #000; min-height: 480px; flex-wrap: wrap;">
        <!-- Left Column: Trading & P&L Debits -->
        <div style="flex: 1; min-width: 300px; border-right: 1px solid #707070; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; flex-direction: column; height: 100%;">
            <!-- Trading Account (Debit) -->
            <div style="flex: 1; padding: 8px 8px 16px 8px; border-bottom: 1px solid #707070;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1.5px solid #000; font-weight: bold; background-color: #e2e2e2; font-size: 13px; height: 26px;">
                    <th style="padding: 4px 8px; text-align: left; font-weight: bold; color: #000; text-decoration: underline;">Particulars (Trading / Debit)</th>
                    <th style="padding: 4px 8px; text-align: right; font-weight: bold; color: #000; text-decoration: underline; width: 110px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${tradingDebitRows.map(r => `
                    <tr class="pl-clickable-particular" data-type="trading-debit" data-label="${r.label.replace(/"/g, '&quot;')}" data-is-child="${r.isChild ? 'true' : 'false'}" data-is-parent="${r.isParent ? 'true' : 'false'}" data-code="${r.code || ''}" style="border-bottom: 1px solid #e2e2e2; display: table-row; cursor: pointer; ${r.isProfit ? 'font-weight: bold; color: #000;' : ''} ${r.isParent ? 'font-weight: bold;' : ''}">
                      <td style="padding: 5px 8px; border-right: 1px solid #e2e2e2; ${r.isChild ? 'padding-left: 20px; font-style: italic; color: #475569;' : ''}">${r.label}</td>
                      <td style="padding: 5px 8px; text-align: right; ${r.isChild ? 'font-style: italic; color: #475569;' : ''}">\u20B9${r.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- Trading Debit Total -->
            <div style="border-bottom: 1px solid #707070; background-color: #e2e2e2; font-weight: bold; padding: 6px 8px; display: flex; justify-content: space-between; font-size: 13px; border-top: 1px solid #000;">
              <span>Total Trading Debits</span>
              <span>\u20B9${tradingDebitTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <!-- Profit & Loss Account (Debit) -->
            <div style="flex: 1; padding: 16px 8px 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1.5px solid #000; font-weight: bold; background-color: #e2e2e2; font-size: 13px; height: 26px;">
                    <th style="padding: 4px 8px; text-align: left; font-weight: bold; color: #000; text-decoration: underline;">Particulars (P&L / Debit)</th>
                    <th style="padding: 4px 8px; text-align: right; font-weight: bold; color: #000; text-decoration: underline; width: 110px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${plDebitRows.map(r => `
                    <tr class="pl-clickable-particular" data-type="pl-debit" data-label="${r.label.replace(/"/g, '&quot;')}" data-is-child="${r.isChild ? 'true' : 'false'}" data-is-parent="${r.isParent ? 'true' : 'false'}" data-code="${r.code || ''}" style="border-bottom: 1px solid #e2e2e2; display: table-row; cursor: pointer; ${r.isProfit ? 'font-weight: bold; background-color: #f0fdf4; color: #15803d;' : ''} ${r.isParent ? 'font-weight: bold;' : ''}">
                      <td style="padding: 5px 8px; border-right: 1px solid #e2e2e2; ${r.isChild ? 'padding-left: 20px; font-style: italic; color: #475569;' : ''}">${r.label}</td>
                      <td style="padding: 5px 8px; text-align: right; ${r.isChild ? 'font-style: italic; color: #475569;' : ''}">\u20B9${r.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- P&L Debit Total -->
            <div style="background-color: #e2e2e2; font-weight: bold; padding: 6px 8px; display: flex; justify-content: space-between; font-size: 13px; border-top: 1.5px solid #000;">
              <span>Total P&L Debits</span>
              <span>\u20B9${plDebitTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <!-- Right Column: Trading & P&L Credits -->
        <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; flex-direction: column; height: 100%;">
            <!-- Trading Account (Credit) -->
            <div style="flex: 1; padding: 8px 8px 16px 8px; border-bottom: 1px solid #707070;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1.5px solid #000; font-weight: bold; background-color: #e2e2e2; font-size: 13px; height: 26px;">
                    <th style="padding: 4px 8px; text-align: left; font-weight: bold; color: #000; text-decoration: underline;">Particulars (Trading / Credit)</th>
                    <th style="padding: 4px 8px; text-align: right; font-weight: bold; color: #000; text-decoration: underline; width: 110px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${tradingCreditRows.map(r => `
                    <tr class="pl-clickable-particular" data-type="trading-credit" data-label="${r.label.replace(/"/g, '&quot;')}" data-is-child="${r.isChild ? 'true' : 'false'}" data-is-parent="${r.isParent ? 'true' : 'false'}" data-code="${r.code || ''}" style="border-bottom: 1px solid #e2e2e2; display: table-row; cursor: pointer; ${r.isLoss ? 'font-weight: bold; color: #000;' : ''} ${r.isParent ? 'font-weight: bold;' : ''}">
                      <td style="padding: 5px 8px; border-right: 1px solid #e2e2e2; ${r.isChild ? 'padding-left: 20px; font-style: italic; color: #475569;' : ''}">${r.label}</td>
                      <td style="padding: 5px 8px; text-align: right; ${r.isChild ? 'font-style: italic; color: #475569;' : ''}">\u20B9${r.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- Trading Credit Total -->
            <div style="border-bottom: 1px solid #707070; background-color: #e2e2e2; font-weight: bold; padding: 6px 8px; display: flex; justify-content: space-between; font-size: 13px; border-top: 1px solid #000;">
              <span>Total Trading Credits</span>
              <span>\u20B9${tradingCreditTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <!-- Profit & Loss Account (Credit) -->
            <div style="flex: 1; padding: 16px 8px 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1.5px solid #000; font-weight: bold; background-color: #e2e2e2; font-size: 13px; height: 26px;">
                    <th style="padding: 4px 8px; text-align: left; font-weight: bold; color: #000; text-decoration: underline;">Particulars (P&L / Credit)</th>
                    <th style="padding: 4px 8px; text-align: right; font-weight: bold; color: #000; text-decoration: underline; width: 110px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${plCreditRows.map(r => `
                    <tr class="pl-clickable-particular" data-type="pl-credit" data-label="${r.label.replace(/"/g, '&quot;')}" data-is-child="${r.isChild ? 'true' : 'false'}" data-is-parent="${r.isParent ? 'true' : 'false'}" data-code="${r.code || ''}" style="border-bottom: 1px solid #e2e2e2; display: table-row; cursor: pointer; ${r.isLoss ? 'font-weight: bold; background-color: #fef2f2; color: #b91c1c;' : ''} ${r.isParent ? 'font-weight: bold;' : ''}">
                      <td style="padding: 5px 8px; border-right: 1px solid #e2e2e2; ${r.isChild ? 'padding-left: 20px; font-style: italic; color: #475569;' : ''}">${r.label}</td>
                      <td style="padding: 5px 8px; text-align: right; ${r.isChild ? 'font-style: italic; color: #475569;' : ''}">\u20B9${r.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- P&L Credit Total -->
            <div style="background-color: #e2e2e2; font-weight: bold; padding: 6px 8px; display: flex; justify-content: space-between; font-size: 13px; border-top: 1.5px solid #000;">
              <span>Total P&L Credits</span>
              <span>\u20B9${plCreditTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBalanceSheetHtml(bs) {
  const renderDetailsList = (details, mainGroupName) => {
    if (!bsDetailed) return '';
    let html = '';
    
    const mapControlAccountGroup = (name) => {
      if (name.includes("Sundry Creditors")) return "Sundry Creditors (Accounts Payable)";
      if (name.includes("GST/VAT Payable")) return "Duties & Taxes";
      if (name.includes("Cash in Hand")) return "Cash-in-Hand";
      if (name.includes("Bank Current Account")) return "Bank Accounts";
      if (name.includes("Sundry Debtors")) return "Sundry Debtors (Accounts Receivable)";
      if (name.includes("Stock on Hand")) return "Stock-in-Hand";
      return null;
    };

    const grouped = {};
    const directLedgers = [];
    
    details.forEach(d => {
      let g = (d.group || "").trim();
      let isControlAccount = false;
      const ctrlGroup = mapControlAccountGroup(d.name);
      if (ctrlGroup) {
         g = ctrlGroup;
         isControlAccount = true;
      }
      
      const gUpper = g.toUpperCase();
      const mainUpper = mainGroupName.toUpperCase();
      
      if (!g || gUpper === mainUpper || gUpper === "OTHER") {
         directLedgers.push(d);
      } else {
         if (!grouped[g]) grouped[g] = { total: 0, items: [], controlTotal: 0 };
         if (isControlAccount) {
            grouped[g].controlTotal += d.balance;
         } else {
            grouped[g].items.push(d);
         }
         grouped[g].total += d.balance;
      }
    });

    for (const [subGroupName, data] of Object.entries(grouped)) {
      html += `
        <tr style="border-bottom: 1px dashed #e0e0e0; font-size: 12px; color: #333; cursor: pointer;" class="bs-clickable-row" data-type="group" data-name="${subGroupName}">
          <td style="padding: 4px 8px 4px 16px; border-right: 1px solid #707070; font-style: italic;">${subGroupName}</td>
          <td style="padding: 4px 8px; text-align: right;">${data.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
      if (bsSubGroups) {
        data.items.forEach(d => {
          html += `
            <tr class="bs-clickable-row" data-type="ledger" data-name="${d.name}" style="border-bottom: 1px dashed #e0e0e0; font-size: 11px; color: #555; cursor: pointer;" title="Double-click to view statement">
              <td style="padding: 4px 8px 4px 28px; border-right: 1px solid #707070; font-style: italic;">${d.name}</td>
              <td style="padding: 4px 8px; text-align: right;">${d.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        });
      }
    }

    directLedgers.forEach(d => {
       html += `
        <tr class="bs-clickable-row" data-type="ledger" data-name="${d.name}" style="border-bottom: 1px dashed #e0e0e0; font-size: 12px; color: #333; cursor: pointer;" title="Double-click to view statement">
          <td style="padding: 4px 8px 4px 16px; border-right: 1px solid #707070; font-style: italic;">${d.name}</td>
          <td style="padding: 4px 8px; text-align: right;">${d.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });
    
    return html;
  };

  return `
    <div class="panel" style="padding: 0; background: none; box-shadow: none; border: none; font-family: Tahoma, sans-serif;">
      <!-- Official Company Letterhead Header for Print View -->
      ${renderPrintHeaderHtml(
        bs.isOpening ? "OPENING BALANCE SHEET" : "BALANCE SHEET",
        bs.isOpening ? "Opening Balances Statement" : ("As on: <strong>" + (reportEndDate ? formatDateDisplay(reportEndDate) : new Date().toLocaleDateString('en-IN')) + "</strong>")
      )}

      <div style="display: flex; border: 1px solid #707070; background-color: #ffffff; font-size: 13px; color: #000; min-height: 450px; flex-wrap: wrap;">
        <!-- Liabilities Column -->
        <div style="flex: 1; min-width: 300px; border-right: 1px solid #707070; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="flex-grow: 1; padding-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1.5px solid #000; font-weight: bold; background-color: #e2e2e2; font-size: 13px; height: 26px;">
                  <th style="padding: 4px 8px; text-align: left; border-right: 1px solid #707070; font-weight: bold; color: #000; text-decoration: underline;">Liabilities</th>
                  <th style="padding: 4px 8px; text-align: right; width: 140px; font-weight: bold; color: #000; text-decoration: underline;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <!-- CAPITAL ACCOUNT -->
                <tr class="bs-clickable-row" data-type="group" data-name="CAPITAL ACCOUNT" style="font-weight: bold; border-bottom: 1px solid #ccc; cursor: pointer;" title="Double-click to view group details">
                  <td style="padding: 6px 8px; border-right: 1px solid #707070; text-transform: uppercase;">CAPITAL ACCOUNT</td>
                  <td style="padding: 6px 8px; text-align: right;">${bs.liabilities.capitalVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ${renderDetailsList(bs.liabilities.capitalDetails, "CAPITAL ACCOUNT")}

                <!-- CURRENT LIABILITIES -->
                <tr class="bs-clickable-row" data-type="group" data-name="CURRENT LIABILITIES" style="font-weight: bold; border-bottom: 1px solid #ccc; cursor: pointer;" title="Double-click to view group details">
                  <td style="padding: 6px 8px; border-right: 1px solid #707070; text-transform: uppercase;">CURRENT LIABILITIES</td>
                  <td style="padding: 6px 8px; text-align: right;">${bs.liabilities.currentLiabilitiesVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ${renderDetailsList(bs.liabilities.currentLiabilitiesDetails, "CURRENT LIABILITIES")}

                <!-- Difference due to opening balance -->
                ${bs.liabilities.diffLiab > 0 ? `
                  <tr style="border-bottom: 1px solid #ccc;">
                    <td style="padding: 6px 8px; border-right: 1px solid #707070;">Difference due to opening balance</td>
                    <td style="padding: 6px 8px; text-align: right;">${bs.liabilities.diffLiab.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}

                <!-- Profit & Loss A/c. -->
                ${!bs.isOpening ? `
                <tr class="bs-clickable-row" data-type="pl-link" data-name="Profit & Loss A/c." style="font-weight: bold; border-bottom: 1px solid #ccc; margin-top: 10px; display: table-row; cursor: pointer;" title="Double-click to open Profit & Loss statement">
                  <td style="padding: 6px 8px; border-right: 1px solid #707070;">Profit & Loss A/c.</td>
                  <td style="padding: 6px 8px; text-align: right;">${bs.liabilities.retainedEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          
          <!-- Totals Liability -->
          <div style="border-top: 1.5px solid #000; padding: 6px 8px; display: flex; justify-content: space-between; font-weight: bold; background-color: #fff; font-size: 14px; align-items: center;">
            <span>Total:</span>
            <div style="text-align: right; min-width: 140px;">
              <span style="border-bottom: 3px double #000; padding-bottom: 2px; padding-right: 4px; display: inline-block;">${bs.liabilities.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <!-- Assets Column -->
        <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="flex-grow: 1; padding-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1.5px solid #000; font-weight: bold; background-color: #e2e2e2; font-size: 13px; height: 26px;">
                  <th style="padding: 4px 8px; text-align: left; border-right: 1px solid #707070; font-weight: bold; color: #000; text-decoration: underline;">Assets</th>
                  <th style="padding: 4px 8px; text-align: right; width: 140px; font-weight: bold; color: #000; text-decoration: underline;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <!-- FIXED ASSETS -->
                <tr class="bs-clickable-row" data-type="group" data-name="FIXED ASSETS" style="font-weight: bold; border-bottom: 1px solid #ccc; cursor: pointer;" title="Double-click to view group details">
                  <td style="padding: 6px 8px; border-right: 1px solid #707070; text-transform: uppercase;">FIXED ASSETS</td>
                  <td style="padding: 6px 8px; text-align: right;">${bs.assets.fixedAssetsVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ${renderDetailsList(bs.assets.fixedAssetsDetails, "FIXED ASSETS")}

                <!-- CURRENT ASSETS -->
                <tr class="bs-clickable-row" data-type="group" data-name="CURRENT ASSETS" style="font-weight: bold; border-bottom: 1px solid #ccc; cursor: pointer;" title="Double-click to view group details">
                  <td style="padding: 6px 8px; border-right: 1px solid #707070; text-transform: uppercase;">CURRENT ASSETS</td>
                  <td style="padding: 6px 8px; text-align: right;">${bs.assets.currentAssetsVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ${renderDetailsList(bs.assets.currentAssetsDetails, "CURRENT ASSETS")}
                
                <!-- Difference due to opening balance -->
                ${bs.assets.diffAsset > 0 ? `
                  <tr style="border-bottom: 1px solid #ccc;">
                    <td style="padding: 6px 8px; border-right: 1px solid #707070;">Difference due to opening balance</td>
                    <td style="padding: 6px 8px; text-align: right;">${bs.assets.diffAsset.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          
          <!-- Totals Assets -->
          <div style="border-top: 1.5px solid #000; padding: 6px 8px; display: flex; justify-content: space-between; font-weight: bold; background-color: #fff; font-size: 14px; align-items: center;">
            <span>Total:</span>
            <div style="text-align: right; min-width: 140px;">
              <span style="border-bottom: 3px double #000; padding-bottom: 2px; padding-right: 4px; display: inline-block;">${bs.assets.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getGstSummaryData(fromDate, toDate) {
  const transactions = state.getTransactions();
  const ledgers = state.getLedgers();

  let totalInputSGST = 0;
  let totalInputCGST = 0;
  let totalInputIGST = 0;

  let totalOutputSGST = 0;
  let totalOutputCGST = 0;
  let totalOutputIGST = 0;

  let totalCess = 0;

  const monthlyData = {};

  const gstGroups = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];

  transactions.forEach(tx => {
    if (tx.date < fromDate || tx.date > toDate) return;

    const txDate = new Date(tx.date);
    const monthYear = txDate.toLocaleString("default", { month: "long", year: "numeric" });

    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = {
        month: monthYear,
        inputSgst: 0, inputCgst: 0, inputIgst: 0,
        outputSgst: 0, outputCgst: 0, outputIgst: 0,
        cess: 0
      };
    }

    let txInputSgst = 0;
    let txInputCgst = 0;
    let txInputIgst = 0;
    let txOutputSgst = 0;
    let txOutputCgst = 0;
    let txOutputIgst = 0;
    let txCess = 0;

    tx.entries.forEach(entry => {
      const ledger = ledgers.find(l => l.code === entry.accountId);
      if (!ledger) return;

      const groupName = (ledger.groupName || "").toUpperCase();
      const name = (ledger.name || "").toUpperCase();

      const matchedGstGroup = gstGroups.find(g => groupName === g || name.includes(g));

      if (matchedGstGroup) {
        if (matchedGstGroup.includes("INPUT")) {
          const val = entry.debit - entry.credit;
          if (matchedGstGroup.includes("SGST")) txInputSgst += val;
          else if (matchedGstGroup.includes("CGST")) txInputCgst += val;
          else if (matchedGstGroup.includes("IGST")) txInputIgst += val;
        } else {
          const val = entry.credit - entry.debit;
          if (matchedGstGroup.includes("SGST")) txOutputSgst += val;
          else if (matchedGstGroup.includes("CGST")) txOutputCgst += val;
          else if (matchedGstGroup.includes("IGST")) txOutputIgst += val;
        }
      } else if (groupName === "DUTIES & TAXES" || name.includes("CESS") || entry.accountId === "2200") {
        txCess += (entry.credit - entry.debit);
      }
    });

    totalInputSGST += txInputSgst;
    totalInputCGST += txInputCgst;
    totalInputIGST += txInputIgst;

    totalOutputSGST += txOutputSgst;
    totalOutputCGST += txOutputCgst;
    totalOutputIGST += txOutputIgst;
    totalCess += txCess;

    monthlyData[monthYear].inputSgst += txInputSgst;
    monthlyData[monthYear].inputCgst += txInputCgst;
    monthlyData[monthYear].inputIgst += txInputIgst;
    monthlyData[monthYear].outputSgst += txOutputSgst;
    monthlyData[monthYear].outputCgst += txOutputCgst;
    monthlyData[monthYear].outputIgst += txOutputIgst;
    monthlyData[monthYear].cess += txCess;
  });

  const monthsList = Object.values(monthlyData);
  monthsList.sort((a, b) => new Date(a.month) - new Date(b.month));

  return {
    input: { sgst: totalInputSGST, cgst: totalInputCGST, igst: totalInputIGST, total: totalInputSGST + totalInputCGST + totalInputIGST },
    output: { sgst: totalOutputSGST, cgst: totalOutputCGST, igst: totalOutputIGST, total: totalOutputSGST + totalOutputCGST + totalOutputIGST },
    cess: totalCess,
    months: monthsList
  };
}

function renderTaxSummaryHtml() {
  const data = getGstSummaryData(taxFromDate, taxToDate);
  const netPayable = data.output.total - data.input.total;

  return `
    <div style="background: #e4edf8; padding: 15px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; color: #000; display: flex; flex-direction: column; gap: 10px;">
      
      <!-- Official Company Letterhead Header for Print View -->
      ${renderPrintHeaderHtml(
        "GST/VAT TAX OBLIGATION SUMMARY",
        "Period: <strong>" + formatDateDisplay(taxFromDate) + " to " + formatDateDisplay(taxToDate) + "</strong>"
      )}

      <!-- Title Bar -->
      <div class="no-print" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: white; padding: 6px 12px; font-weight: bold; border-radius: 3px; font-size: 14px;">
        GST/VAT TAX OBLIGATION SUMMARY (INCLUDING VOUCHER TRANSACTIONS)
      </div>

      <!-- Classic ERP Input Filter Panel -->
      <div class="no-print" style="background: #cfd8e7; padding: 12px; border: 1px solid #a5c3e5; display: flex; justify-content: space-between; align-items: center; border-radius: 3px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: bold; color: black;">Date Filter:</span>
          <span>From</span>
          ${renderTallyDatePickerHtml({ id: "tax-from-date", value: taxFromDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
          <span>To</span>
          ${renderTallyDatePickerHtml({ id: "tax-to-date", value: taxToDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}


        </div>

        <div style="display: flex; gap: 6px;">
          <button id="btn-tax-view" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold; font-size: 12px;">View</button>
          <button id="btn-tax-print" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold; font-size: 12px;">Print</button>
          <button id="btn-tax-close" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold; font-size: 12px;">Close</button>
        </div>
      </div>

      <!-- Metrics Cards Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 5px;">
        <!-- Card 1: Tax Collected -->
        <div style="background: #f8fafc; border: 1px solid #a5c3e5; padding: 12px; border-radius: 3px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 0.72rem; color: #475569; display: block; font-weight: bold; text-transform: uppercase;">TAX COLLECTED (OUTPUT LIABILITY)</span>
          <strong style="font-size: 1.4rem; display: block; margin-top: 6px; color: #b91c1c;">\u20B9${data.output.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          <div style="border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 6px; font-size: 0.75rem; color: #334155; line-height: 1.4;">
            Output SGST: \u20B9${data.output.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br>
            Output CGST: \u20B9${data.output.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br>
            Output IGST: \u20B9${data.output.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <!-- Card 2: Tax Paid -->
        <div style="background: #f8fafc; border: 1px solid #a5c3e5; padding: 12px; border-radius: 3px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 0.72rem; color: #475569; display: block; font-weight: bold; text-transform: uppercase;">INPUT TAX CREDIT (ITC / PAID)</span>
          <strong style="font-size: 1.4rem; display: block; margin-top: 6px; color: #0f766e;">\u20B9${data.input.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          <div style="border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 6px; font-size: 0.75rem; color: #334155; line-height: 1.4;">
            Input SGST: \u20B9${data.input.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br>
            Input CGST: \u20B9${data.input.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br>
            Input IGST: \u20B9${data.input.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <!-- Card 3: Net Payable -->
        <div style="background: #f8fafc; border: 1px solid #a5c3e5; padding: 12px; border-radius: 3px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 0.72rem; color: #475569; display: block; font-weight: bold; text-transform: uppercase;">NET TAX PAYABLE</span>
          <strong style="font-size: 1.4rem; display: block; margin-top: 6px; color: ${netPayable >= 0 ? '#b91c1c' : '#0f766e'};">
            \u20B9${Math.abs(netPayable).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${netPayable >= 0 ? 'Payable' : 'Credit / Refund'}
          </strong>
          <div style="border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 6px; font-size: 0.75rem; color: #334155;">
            Total Cess: \u20B9${Math.abs(data.cess).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${data.cess >= 0 ? 'Cr' : 'Dr'}<br>
            <span style="font-style: italic; color: #64748b; font-size: 0.72rem; margin-top: 4px; display: block;">
              ${netPayable >= 0 ? 'Tax liability due for settlement.' : 'Tax credit carried forward.'}
            </span>
          </div>
        </div>
      </div>

      <!-- Monthly Summary Header -->
      <div style="font-weight: bold; color: #1e3b8b; margin-top: 10px; font-size: 13px;">
        MONTH-WISE GST SUMMARY TABLE
      </div>

      <!-- Month Summary Grid Table -->
      <div style="background: white; border: 1px solid #a5c3e5; max-height: 250px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; color: black;">
          <thead>
            <tr style="background: #e4edf8; border-bottom: 1.5px solid #a5c3e5; font-weight: bold;">
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; width: 140px;">Month</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;">Output SGST</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;">Output CGST</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;">Output IGST</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;">Input SGST</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;">Input CGST</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;">Input IGST</th>
              <th style="padding: 6px; text-align: right;">Net Payable</th>
            </tr>
          </thead>
          <tbody>
            ${data.months.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">No transactions found in this date range.</td>
              </tr>
            ` : data.months.map(m => {
              const outTotal = m.outputSgst + m.outputCgst + m.outputIgst;
              const inTotal = m.inputSgst + m.inputCgst + m.inputIgst;
              const netM = outTotal - inTotal + m.cess;
              return `
                <tr style="border-bottom: 1px dashed #cbd5e1;">
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; font-weight: bold;">${m.month}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">\u20B9${m.outputSgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">\u20B9${m.outputCgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">\u20B9${m.outputIgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #0f766e;">\u20B9${m.inputSgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #0f766e;">\u20B9${m.inputCgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #0f766e;">\u20B9${m.inputIgst.toFixed(2)}</td>
                  <td style="padding: 6px; text-align: right; font-weight: bold; color: ${netM >= 0 ? '#b91c1c' : '#0f766e'};">
                    \u20B9${Math.abs(netM).toFixed(2)} ${netM >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

    </div>
  `;
}

function renderGroupSummaryHtml() {
  const groups = state.getAccountGroups ? state.getAccountGroups() : [];
  const groupNames = Array.from(new Set(groups.map(g => g.name))).sort();

  const fromDate = reportStartDate || "2026-04-01";
  const toDate = reportEndDate || new Date().toISOString().split("T")[0];

  const items = state.getGroupSummary(selectedGroupName, fromDate, toDate);

  // Static system account IDs that are never contacts
  const STATIC_IDS = ["1010", "1020", "1100", "1200", "2100", "2200", "3100"];

  const fmt = (n) => {
    const abs = Math.abs(n);
    const str = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `${str} Cr` : (n > 0 ? `${str} Dr` : "0.00");
  };

  let rows = "";
  let totalOp = 0, totalDr = 0, totalCr = 0, totalCl = 0;

  // Identify which item.accountIds are "contact" entries (customer/supplier)
  // For Summary mode: aggregate all contacts under same groupName into one sub-group row
  // For Detail mode: show each account individually

  if (groupDetailed) {
    // Detail mode: show every individual account as a separate row
    items.forEach(item => {
      if (Math.abs(item.closing) < 0.001) return;
      if (avoidNonTransaction && item.debit === 0 && item.credit === 0) return;
      totalOp += item.opening;
      totalDr += item.debit;
      totalCr += item.credit;
      totalCl += item.closing;
      rows += `
        <tr data-account-id="${item.accountId}" title="Double-click to open ledger" style="border-bottom: 1px solid #d0d0d0; font-size: 12px; cursor: pointer;">
          <td style="padding: 4px 8px; border-right: 1px solid #bbb; padding-left: 20px;">${item.name}</td>
          <td style="padding: 4px 8px; text-align: right; border-right: 1px solid #bbb; white-space: nowrap;">${fmt(item.opening)}</td>
          <td style="padding: 4px 8px; text-align: right; border-right: 1px solid #bbb;">${item.debit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 4px 8px; text-align: right; border-right: 1px solid #bbb;">${item.credit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 4px 8px; text-align: right; white-space: nowrap;">${fmt(item.closing)}</td>
        </tr>
      `;
    });
  } else {
    // Summary mode: group contacts under their sub-group name, show named ledgers individually
    // Step 1: separate contact accounts from named ledgers
    const contactGroupTotals = {};   // groupName -> { opening, debit, credit, closing }
    const namedLedgerRows = [];      // individual ledger rows

    items.forEach(item => {
      const isContact = item.accountId && !STATIC_IDS.includes(item.accountId) &&
        (item.accountId.includes("::") ||
          (state.contacts && state.contacts.some(c => c.id === item.accountId)));

      if (isContact && selectedGroupName.toUpperCase() !== "SUNDRY CREDITORS" && selectedGroupName.toUpperCase() !== "SUNDRY DEBTORS") {
        // Aggregate contacts by their group name (e.g. SUNDRY DEBTORS, SUNDRY CREDITORS)
        const gn = item.groupName;
        if (!contactGroupTotals[gn]) contactGroupTotals[gn] = { opening: 0, debit: 0, credit: 0, closing: 0 };
        contactGroupTotals[gn].opening += item.opening;
        contactGroupTotals[gn].debit   += item.debit;
        contactGroupTotals[gn].credit  += item.credit;
        contactGroupTotals[gn].closing += item.closing;
      } else {
        // Named static accounts and dynamic ledgers — show individually
        namedLedgerRows.push(item);
      }
    });

    // Output named ledger rows first
    namedLedgerRows.forEach(item => {
      if (Math.abs(item.closing) < 0.001) return;
      if (avoidNonTransaction && item.debit === 0 && item.credit === 0) return;
      totalOp += item.opening;
      totalDr += item.debit;
      totalCr += item.credit;
      totalCl += item.closing;
      rows += `
        <tr data-account-id="${item.accountId}" title="Double-click to open ledger" style="border-bottom: 1px solid #d0d0d0; font-size: 12px; cursor: pointer;">
          <td style="padding: 5px 8px; border-right: 1px solid #bbb; font-weight: bold;">${item.name}</td>
          <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb; white-space: nowrap;">${fmt(item.opening)}</td>
          <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb;">${item.debit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb;">${item.credit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px 8px; text-align: right; white-space: nowrap;">${fmt(item.closing)}</td>
        </tr>
      `;
    });

    // Output aggregated contact group rows (e.g. SUNDRY DEBTORS total)
    Object.entries(contactGroupTotals).forEach(([gn, g]) => {
      if (Math.abs(g.closing) < 0.001) return;
      if (avoidNonTransaction && g.debit === 0 && g.credit === 0) return;
      totalOp += g.opening;
      totalDr += g.debit;
      totalCr += g.credit;
      totalCl += g.closing;
      const partyTab = gn === "SUNDRY CREDITORS" ? "creditors" : "debtors";
      rows += `
        <tr data-party-tab="${partyTab}" title="Double-click to open ${gn} report" style="border-bottom: 1px solid #d0d0d0; font-size: 12px; cursor: pointer;">
          <td style="padding: 5px 8px; border-right: 1px solid #bbb; font-weight: bold;">${gn}</td>
          <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb; white-space: nowrap;">${fmt(g.opening)}</td>
          <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb;">${g.debit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb;">${g.credit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 5px 8px; text-align: right; white-space: nowrap;">${fmt(g.closing)}</td>
        </tr>
      `;
    });
  }


  const groupOptions = groupNames.map(g =>
    `<option value="${g}" ${g === selectedGroupName ? "selected" : ""}>${g}</option>`
  ).join("");

  return `
    <div class="panel" style="padding: 0; background: none; box-shadow: none; border: none; font-family: Tahoma, sans-serif; display: flex; flex-direction: column; flex: 1 1 auto; height: 100%; min-height: 0; overflow-y: auto;">
      <!-- Official Company Letterhead Header for Print View -->
      ${renderPrintHeaderHtml(
        "LEDGER GROUP SUMMARY : " + (selectedGroupName || "").toUpperCase(),
        "Group: <strong>" + selectedGroupName + "</strong>",
        "Period: <strong>" + formatDateDisplay(fromDate) + " to " + formatDateDisplay(toDate) + "</strong>"
      )}

      <!-- Toolbar -->
      <div class="no-print" style="background: #cfd8e7; border: 1px solid #a5c3e5; padding: 6px 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 13px; color: #000; margin-bottom: 6px; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <label style="font-weight: bold; margin-bottom: 0;">Select Group:</label>
          <select id="gs-group-select" style="padding: 2px 4px; border: 1px solid #7f9db9; font-size: 12px; background: #fff;">
            ${groupOptions}
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; margin-left: 10px;">
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; margin-bottom: 0;">
            <input type="checkbox" id="gs-chk-detail" ${groupDetailed ? "checked" : ""}> Detail
          </label>
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #555; margin-bottom: 0;">
            <input type="checkbox" id="gs-chk-avoidnon" ${avoidNonTransaction ? "checked" : ""}> Avoid Non-Transaction Ledgers in Print
          </label>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; margin-left: 10px;">
          <span>From:</span>
          ${renderTallyDatePickerHtml({ id: "gs-from-date", value: fromDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
          <span>To:</span>
          ${renderTallyDatePickerHtml({ id: "gs-to-date", value: toDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
        </div>


        <div style="display: flex; gap: 5px; margin-left: auto;">
          <button id="gs-btn-view" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">View</button>
          <button id="gs-btn-print" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">Print</button>
          <button id="gs-btn-close" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">Close</button>
        </div>
      </div>

      <!-- Summary Table -->
      <div style="border: 1px solid #a5c3e5; background: #fff; font-size: 13px; flex: 1 1 auto; min-height: 0; overflow-y: auto; max-height: calc(100vh - 170px);">
        <div style="text-align: center; font-weight: bold; padding: 8px; background: #e8edf5; border-bottom: 1px solid #a5c3e5; font-size: 13px; position: sticky; top: 0; z-index: 6;">
          Group Summary of &nbsp;<span style="text-transform: uppercase;">${selectedGroupName}</span>
        </div>
        <table id="gs-summary-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead style="position: sticky; top: 32px; z-index: 5; background: #fff;">
            <tr style="border-bottom: 1.5px solid #000; background: #fff;">
              <th style="padding: 5px 8px; text-align: left; border-right: 1px solid #bbb; text-decoration: underline; font-weight: bold;">Particulars</th>
              <th style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb; text-decoration: underline; font-weight: bold; width: 160px;">Opening Balance</th>
              <th style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb; text-decoration: underline; font-weight: bold; width: 120px;">Debit</th>
              <th style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb; text-decoration: underline; font-weight: bold; width: 120px;">Credit</th>
              <th style="padding: 5px 8px; text-align: right; text-decoration: underline; font-weight: bold; width: 160px;">Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #888;">No data found for this group.</td></tr>`}
            <tr style="font-size: 11px; color: #555;">
              <td colspan="5" style="padding: 3px 8px; border-top: 1px solid #bbb;"></td>
            </tr>
          </tbody>
          <tfoot style="position: sticky; bottom: 0; z-index: 5; background: #e8edf5;">
            <tr style="background: #e8edf5; font-weight: bold; border-top: 1.5px solid #000; font-size: 12px;">
              <td style="padding: 5px 8px; border-right: 1px solid #bbb;">Grand Total</td>
              <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb; white-space: nowrap;">${fmt(totalOp)}</td>
              <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb;">${totalDr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #bbb;">${totalCr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 5px 8px; text-align: right; white-space: nowrap;">${fmt(totalCl)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

let cachedReportContext = null;
let lastReportStateTxLength = -1;

export function invalidateReportCache() {
  cachedReportContext = null;
  lastReportStateTxLength = -1;
}

export function buildReportContext(forceRefresh = false) {
  state.cleanDuplicateTransactions();
  const txs = state.getTransactions() || [];
  const invs = state.getInvoices() || [];
  const purs = state.getPurchases() || [];
  const currLen = txs.length + invs.length + purs.length;
  
  if (!forceRefresh && cachedReportContext && lastReportStateTxLength === currLen) {
    return cachedReportContext;
  }
  lastReportStateTxLength = currLen;

  const invoicesByRef = new Map();
  invs.forEach(i => {
    if (!i) return;
    if (i.voucherNo) invoicesByRef.set(String(i.voucherNo).trim(), i);
    if (i.id) invoicesByRef.set(String(i.id).trim(), i);
    if (i.refNo) invoicesByRef.set(String(i.refNo).trim(), i);
  });

  const purchasesByRef = new Map();
  purs.forEach(p => {
    if (!p) return;
    if (p.voucherNo) purchasesByRef.set(String(p.voucherNo).trim(), p);
    if (p.invoiceNo) purchasesByRef.set(String(p.invoiceNo).trim(), p);
    if (p.id) purchasesByRef.set(String(p.id).trim(), p);
    if (p.refNo) purchasesByRef.set(String(p.refNo).trim(), p);
  });

  const salesRetByRef = new Map();
  (state.getSalesReturns() || []).forEach(sr => {
    if (!sr) return;
    if (sr.id) salesRetByRef.set(String(sr.id).trim(), sr);
    if (sr.voucherNo) salesRetByRef.set(String(sr.voucherNo).trim(), sr);
  });

  const purRetByRef = new Map();
  (state.getPurchaseReturns() || []).forEach(pr => {
    if (!pr) return;
    if (pr.id) purRetByRef.set(String(pr.id).trim(), pr);
    if (pr.voucherNo) purRetByRef.set(String(pr.voucherNo).trim(), pr);
  });

  const invoicesByContactId = new Map();
  const invoicesByContactName = new Map();
  invs.forEach(inv => {
    if (!inv || inv.isCancelled) return;
    const invContactId = (inv.contactId || "").split("::")[0];
    if (invContactId) {
      if (!invoicesByContactId.has(invContactId)) invoicesByContactId.set(invContactId, []);
      invoicesByContactId.get(invContactId).push(inv);
      const canId = state.getCanonicalAccountId(invContactId);
      if (canId && canId !== invContactId) {
        if (!invoicesByContactId.has(canId)) invoicesByContactId.set(canId, []);
        invoicesByContactId.get(canId).push(inv);
      }
    }
    if (inv.contactName) {
      const cName = inv.contactName.trim().toUpperCase();
      if (!invoicesByContactName.has(cName)) invoicesByContactName.set(cName, []);
      invoicesByContactName.get(cName).push(inv);
    }
  });

  const purchasesByContactId = new Map();
  const purchasesByContactName = new Map();
  purs.forEach(pur => {
    if (!pur || pur.isCancelled) return;
    const purContactId = (pur.supplierId || pur.contactId || "").split("::")[0];
    if (purContactId) {
      if (!purchasesByContactId.has(purContactId)) purchasesByContactId.set(purContactId, []);
      purchasesByContactId.get(purContactId).push(pur);
      const canId = state.getCanonicalAccountId(purContactId);
      if (canId && canId !== purContactId) {
        if (!purchasesByContactId.has(canId)) purchasesByContactId.set(canId, []);
        purchasesByContactId.get(canId).push(pur);
      }
    }
    const pName = (pur.supplierName || pur.contactName || "").trim().toUpperCase();
    if (pName) {
      if (!purchasesByContactName.has(pName)) purchasesByContactName.set(pName, []);
      purchasesByContactName.get(pName).push(pur);
    }
  });

  const transactionsByAccountId = new Map();
  const transactionsByContactId = new Map();
  const transactionsByRef = new Map();
  txs.forEach(tx => {
    if (!tx || !tx.id) return;
    if (tx.reference) {
      const refKey = String(tx.reference).trim();
      if (!transactionsByRef.has(refKey)) transactionsByRef.set(refKey, []);
      transactionsByRef.get(refKey).push(tx);
    }
    if (tx.contactId) {
      const cid = tx.contactId;
      if (!transactionsByContactId.has(cid)) transactionsByContactId.set(cid, []);
      transactionsByContactId.get(cid).push(tx);
      const canCid = state.getCanonicalAccountId(cid);
      if (canCid && canCid !== cid) {
        if (!transactionsByContactId.has(canCid)) transactionsByContactId.set(canCid, []);
        transactionsByContactId.get(canCid).push(tx);
      }
    }
    (tx.entries || []).forEach(e => {
      if (!e || !e.accountId) return;
      const accId = e.accountId;
      const addToAccMap = (key) => {
        if (!key) return;
        if (!transactionsByAccountId.has(key)) transactionsByAccountId.set(key, []);
        transactionsByAccountId.get(key).push(tx);
      };

      addToAccMap(accId);
      const canAccId = state.getCanonicalAccountId(accId);
      if (canAccId && canAccId !== accId) addToAccMap(canAccId);

      if (accId.includes("::")) {
        const baseAccId = accId.split("::")[0];
        addToAccMap(baseAccId);
        const canBaseAccId = state.getCanonicalAccountId(baseAccId);
        if (canBaseAccId && canBaseAccId !== baseAccId) addToAccMap(canBaseAccId);
      }
    });
  });

  const contactsByCanonicalId = new Map();
  (state.getContacts() || []).forEach(c => {
    const cid = state.getCanonicalAccountId(c.id);
    if (cid) contactsByCanonicalId.set(cid, c);
  });

  const ledgersByCanonicalCode = new Map();
  (state.getLedgers() || []).forEach(l => {
    const lid = state.getCanonicalAccountId(l.code);
    if (lid) ledgersByCanonicalCode.set(lid, l);
  });

  cachedReportContext = {
    invoicesByRef,
    purchasesByRef,
    salesReturnsByRef: salesRetByRef,
    purchaseReturnsByRef: purRetByRef,
    contactsByCanonicalId,
    ledgersByCanonicalCode,
    invoicesByContactId,
    invoicesByContactName,
    purchasesByContactId,
    purchasesByContactName,
    transactionsByAccountId,
    transactionsByContactId,
    transactionsByRef
  };
  lastReportStateTxLength = currLen;
  return cachedReportContext;
}

function renderPartiesReportHtml() {
  const contacts = state.getContacts();

  // Determine subtab-based filtered list
  let filteredList = [];
  let searchLabel = "Customer Name:";
  if (activePartySubTab === "customer") {
    filteredList = contacts.filter(c => c.type === "customer" || c.listInCustomerList === true);
    searchLabel = "Customer Name:";
  } else if (activePartySubTab === "vendor") {
    filteredList = contacts.filter(c => c.type === "supplier" || c.listInSupplierList === true);
    searchLabel = "Vendor Name:";
  } else if (activePartySubTab === "debtors") {
    filteredList = contacts.filter(c => c.type === "customer" || c.listInCustomerList === true);
    searchLabel = "Debtor Name:";
  } else if (activePartySubTab === "creditors") {
    filteredList = contacts.filter(c => c.type === "supplier" || c.listInSupplierList === true);
    searchLabel = "Creditor Name:";
  }

  // Pre-index ledgers by parentCustomerId and groupName to avoid N*M filtering
  const ledgersByParentId = new Map();
  const ledgersByGroupName = new Map();
  const allLedgers = state.getLedgers() || [];
  allLedgers.forEach(l => {
    if (!l) return;
    if (l.parentCustomerId) {
      if (!ledgersByParentId.has(l.parentCustomerId)) ledgersByParentId.set(l.parentCustomerId, []);
      ledgersByParentId.get(l.parentCustomerId).push(l);
    }
    if (l.groupName) {
      const key = String(l.groupName).trim().toUpperCase();
      if (!ledgersByGroupName.has(key)) ledgersByGroupName.set(key, []);
      ledgersByGroupName.get(key).push(l);
    }
  });

  const getChildLedgersForContact = (c) => {
    if (!c) return [];
    const pList = ledgersByParentId.get(c.id) || [];
    const gList = c.name ? (ledgersByGroupName.get(String(c.name).trim().toUpperCase()) || []) : [];
    const combined = [...pList, ...gList];
    const unique = [];
    const seen = new Set();
    combined.forEach(l => {
      if (l && !seen.has(l.code || l.id)) {
        seen.add(l.code || l.id);
        if (!isPrimaryContactLedger(l, c)) unique.push(l);
      }
    });
    return unique;
  };

  // Fast O(1) contact lookup Map
  const contactLookup = new Map();
  contacts.forEach(c => {
    if (!c) return;
    if (c.id) {
      contactLookup.set(String(c.id).trim().toUpperCase(), c);
      const canId = state.getCanonicalAccountId(c.id);
      if (canId) contactLookup.set(String(canId).trim().toUpperCase(), c);
    }
    if (c.ledgerCode) {
      contactLookup.set(String(c.ledgerCode).trim().toUpperCase(), c);
      const canCode = state.getCanonicalAccountId(c.ledgerCode);
      if (canCode) contactLookup.set(String(canCode).trim().toUpperCase(), c);
    }
    if (c.name) {
      contactLookup.set(String(c.name).trim().toUpperCase(), c);
    }
  });

  allLedgers.forEach(l => {
    if (l && l.parentCustomerId) {
      const parentC = contacts.find(c => c.id === l.parentCustomerId);
      if (parentC && !isPrimaryContactLedger(l, parentC)) {
        contactLookup.set(String(l.code).trim().toUpperCase(), parentC);
        const canL = state.getCanonicalAccountId(l.code);
        if (canL) contactLookup.set(String(canL).trim().toUpperCase(), parentC);
      }
    }
  });

  const prebuiltContext = buildReportContext();

  // Apply Search Filter first to prune list before calculating ledger entries
  if (filterSearchText) {
    const q = filterSearchText.trim().toLowerCase();
    filteredList = filteredList.filter(c => 
      c.id === filterSearchText || 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.mobile && c.mobile.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }

  // Apply customer/vendor site/branch type filter first
  if (activePartySubTab === "customer" || activePartySubTab === "vendor") {
    if (filterSiteType === "single") {
      filteredList = filteredList.filter(c => c.siteType === "single");
    } else if (filterSiteType === "multiple") {
      filteredList = filteredList.filter(c => c.siteType === "multiple");
    }
  }

  // Fast O(T) single-pass aggregation map for all contacts
  const totalsMap = new Map();
  filteredList.forEach(c => {
    let rawOp = parseFloat(c.openingBalance) || 0;
    const isSupplier = c.type === "supplier" || c.listInVendorList === true || c.groupName === "SUNDRY CREDITORS";
    let cBType = c.balanceType || (isSupplier ? "Credit" : "Debit");
    let initialOp = cBType === "Debit" ? rawOp : -rawOp;
    totalsMap.set(c.id, { op: initialOp, dr: 0, cr: 0 });

    const canId = state.getCanonicalAccountId(c.id);
    if (canId && canId !== c.id) totalsMap.set(canId, totalsMap.get(c.id));
    if (c.ledgerCode) {
      totalsMap.set(c.ledgerCode, totalsMap.get(c.id));
      const canCode = state.getCanonicalAccountId(c.ledgerCode);
      if (canCode && canCode !== c.ledgerCode) totalsMap.set(canCode, totalsMap.get(c.id));
    }
  });

  const seenTxIds = new Set();

  (state.getTransactions() || []).forEach(tx => {
    if (!tx || !tx.id || seenTxIds.has(tx.id) || tx.isCancelled) return;
    seenTxIds.add(tx.id);
    const txDateStr = tx.date ? String(tx.date).substring(0, 10) : "";

    (tx.entries || []).forEach(e => {
      if (!e || !e.accountId) return;
      const accId = e.accountId;
      const baseAccId = accId.includes("::") ? accId.split("::")[0] : accId;

      const tot = totalsMap.get(baseAccId) || totalsMap.get(accId);
      if (tot) {
        const dr = parseFloat(e.debit) || 0;
        const cr = parseFloat(e.credit) || 0;
        if (filterFromDate && txDateStr < filterFromDate) {
          tot.op += (dr - cr);
        } else if ((!filterFromDate || txDateStr >= filterFromDate) && (!filterToDate || txDateStr <= filterToDate)) {
          tot.dr += dr;
          tot.cr += cr;
        }
      }
    });
  });

  (state.getInvoices() || []).forEach(inv => {
    if (!inv || inv.isCancelled) return;
    const isCreditInv = inv.payMode === "Credit" || (!inv.payMode && inv.contactId && inv.contactId !== "__CASH__");
    if (!isCreditInv) return;
    const invContactId = (inv.contactId || "").split("::")[0];
    const tot = totalsMap.get(invContactId);
    if (tot) {
      const vNo = inv.voucherNo || inv.id || "";
      const docSig = `Sales::${vNo}`;
      if (!prebuiltContext.transactionsByRef.has(vNo) && !prebuiltContext.transactionsByRef.has(docSig)) {
        const invDateStr = inv.date ? String(inv.date).substring(0, 10) : "";
        const amt = parseFloat(inv.total) || 0;
        if (filterFromDate && invDateStr < filterFromDate) {
          tot.op += amt;
        } else if ((!filterFromDate || invDateStr >= filterFromDate) && (!filterToDate || invDateStr <= filterToDate)) {
          tot.dr += amt;
        }
      }
    }
  });

  (state.getPurchases() || []).forEach(pur => {
    if (!pur || pur.isCancelled) return;
    const isCreditPur = pur.payMode === "Credit" || (!pur.payMode && (pur.supplierId || pur.contactId) !== "__CASH__");
    if (!isCreditPur) return;
    const purContactId = (pur.supplierId || pur.contactId || "").split("::")[0];
    const tot = totalsMap.get(purContactId);
    if (tot) {
      const vNo = pur.voucherNo || pur.id || pur.invoiceNo || "";
      const docSig = `Purchase::${vNo}`;
      if (!prebuiltContext.transactionsByRef.has(vNo) && !prebuiltContext.transactionsByRef.has(docSig)) {
        const purDateStr = pur.date ? String(pur.date).substring(0, 10) : "";
        const amt = parseFloat(pur.total) || 0;
        if (filterFromDate && purDateStr < filterFromDate) {
          tot.op -= amt;
        } else if ((!filterFromDate || purDateStr >= filterFromDate) && (!filterToDate || purDateStr <= filterToDate)) {
          tot.cr += amt;
        }
      }
    }
  });

  let calculatedContacts = filteredList.map(c => {
    const tot = totalsMap.get(c.id) || { op: 0, dr: 0, cr: 0 };
    const opBalance = tot.op;
    const debit = tot.dr;
    const credit = tot.cr;
    const closingBalance = opBalance + debit - credit;

    return {
      ...c,
      opBalance,
      debit,
      credit,
      closingBalance
    };
  });



  // Apply Balance Radio filter
  if (filterBalType === "debit") {
    calculatedContacts = calculatedContacts.filter(c => c.closingBalance > 0.009);
  } else if (filterBalType === "credit") {
    calculatedContacts = calculatedContacts.filter(c => c.closingBalance < -0.009);
  } else if (filterBalType === "zero") {
    calculatedContacts = calculatedContacts.filter(c => Math.abs(c.closingBalance) < 0.01);
  }

  // Apply Sorting
  calculatedContacts.sort((a, b) => {
    let valA = a[partySortField];
    let valB = b[partySortField];

    if (partySortField === "name") {
      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();
      return partySortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    if (partySortField === "creditPeriod") {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    } else {
      valA = typeof valA === "number" ? valA : (parseFloat(valA) || 0);
      valB = typeof valB === "number" ? valB : (parseFloat(valB) || 0);
    }

    if (valA < valB) return partySortOrder === "asc" ? -1 : 1;
    if (valA > valB) return partySortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Auto-calculated selected customer/vendor site/branch breakdown
  let selectedCustomerSiteBreakdown = "";

  const targetContactIds = new Set();
  if (selectedMultipleCustomerIds && selectedMultipleCustomerIds.length > 0) {
    selectedMultipleCustomerIds.forEach(id => targetContactIds.add(id));
  } else if (filterSearchText) {
    targetContactIds.add(filterSearchText);
  } else if (selectedPartyRowId) {
    targetContactIds.add(selectedPartyRowId);
  }

  const targetContacts = contacts.filter(c => targetContactIds.has(c.id));

  targetContacts.forEach(selectedContact => {
    const childLedgers = getChildLedgersForContact(selectedContact);
    
    // Extract any sites from contact.sites or transactions
    const cNameLower = (selectedContact.name || "").trim().toLowerCase();
    const contactSites = Array.from(new Set([
      ...(Array.isArray(selectedContact.sites) ? selectedContact.sites : []),
      ...(state.transactions || [])
        .filter(tx => (tx.entries || []).some(e => e.accountId.startsWith(selectedContact.id + "::")) || ((tx.contactId === selectedContact.id || (cNameLower !== "" && (tx.description || "").toLowerCase().includes(cNameLower))) && tx.siteName))
        .map(tx => {
          const entry = (tx.entries || []).find(e => e.accountId.startsWith(selectedContact.id + "::"));
          if (entry) return entry.accountId.split("::")[1];
          return tx.siteName;
        })
        .filter(Boolean)
    ]));

    const isCustomer = selectedContact.type === "customer" || selectedContact.listInCustomerList === true || selectedContact.groupName === "SUNDRY DEBTORS" || activePartySubTab === "customer" || activePartySubTab === "debtors";
    const isSupplier = selectedContact.type === "supplier" || selectedContact.listInVendorList === true || selectedContact.listInSupplierList === true || selectedContact.groupName === "SUNDRY CREDITORS" || activePartySubTab === "vendor" || activePartySubTab === "creditors";

    if (selectedContact && (isCustomer || isSupplier)) {
      let siteRows = [];
      const headerLabel = isCustomer ? "Site / Sub-Ledger Name" : "Branch / Sub-Ledger Name";
      const reportTitle = isCustomer ? "Site & Sub-Ledger Breakdown" : "Branch & Sub-Ledger Breakdown";

      let sumSiteOp = 0;
      let sumSiteDr = 0;
      let sumSiteCr = 0;

      contactSites.forEach(site => {
        const siteLedgerId = `${selectedContact.id}::${site}`;
        const siteReportData = getLedgerEntries(siteLedgerId, filterFromDate, filterToDate, "All", "All", prebuiltContext);

        let siteOp = siteReportData.openingBalance || 0;
        if (siteReportData.openingBalanceSuffix === (isCustomer ? "Cr" : "Dr")) {
          siteOp = -siteOp;
        }

        let siteDr = 0;
        let siteCr = 0;
        (siteReportData.entries || []).forEach(e => {
          siteDr += parseFloat(e.debit) || 0;
          siteCr += parseFloat(e.credit) || 0;
        });

        const lastEntry = (siteReportData.entries || []).length > 0 ? siteReportData.entries[siteReportData.entries.length - 1] : null;
        let siteClosingVal = lastEntry ? lastEntry.balance : (siteReportData.openingBalance || 0);
        const siteClosingSuffix = lastEntry ? lastEntry.balanceSuffix : (siteReportData.openingBalanceSuffix || "Dr");

        let siteClosing = siteClosingVal;
        if (siteClosingSuffix === (isCustomer ? "Cr" : "Dr")) {
          siteClosing = -siteClosingVal;
        }
          
        const opSuffix = siteOp >= 0 ? "Dr" : "Cr";
        const closingSuffix = siteClosing >= 0 ? "Dr" : "Cr";

        sumSiteOp += siteOp;
        sumSiteDr += siteDr;
        sumSiteCr += siteCr;

        siteRows.push(`
          <tr class="site-row-select" data-id="${selectedContact.id}::${site}" style="border-bottom: 1px dashed #cbd5e1; cursor: pointer;" title="Double click to view site ledger report">
            <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; font-weight: bold; color: #111;">
              <i class="fa-solid fa-location-dot" style="margin-right: 6px; color: #0284c7;"></i>${site}
            </td>
            <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right; font-weight: 500;">₹${Math.abs(siteOp).toFixed(2)} ${opSuffix}</td>
            <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e; font-weight: 500;">₹${siteDr.toFixed(2)}</td>
            <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right; color: #b91c1c; font-weight: 500;">₹${siteCr.toFixed(2)}</td>
            <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: ${siteClosing >= 0 ? '#15803d' : '#b91c1c'};">₹${Math.abs(siteClosing).toFixed(2)} ${closingSuffix}</td>
          </tr>
        `);
      });

      // Child sub-ledgers created under this customer group
      childLedgers.forEach(l => {
        const lReportData = getLedgerEntries(l.code, filterFromDate, filterToDate, "All", "All", prebuiltContext);
        let lOp = lReportData.openingBalance || 0;
        if (lReportData.openingBalanceSuffix === (isCustomer ? "Cr" : "Dr")) {
          lOp = -lOp;
        }

        let lDr = 0;
        let lCr = 0;
        (lReportData.entries || []).forEach(e => {
          lDr += parseFloat(e.debit) || 0;
          lCr += parseFloat(e.credit) || 0;
        });

        const lastEntry = (lReportData.entries || []).length > 0 ? lReportData.entries[lReportData.entries.length - 1] : null;
        let lClosingVal = lastEntry ? lastEntry.balance : (lReportData.openingBalance || 0);
        const lClosingSuffix = lastEntry ? lastEntry.balanceSuffix : (lReportData.openingBalanceSuffix || "Dr");

        let lClosing = lClosingVal;
        if (lClosingSuffix === (isCustomer ? "Cr" : "Dr")) {
          lClosing = -lClosingVal;
        }

        const opSuffix = lOp >= 0 ? "Dr" : "Cr";
        const closingSuffix = lClosing >= 0 ? "Dr" : "Cr";

        sumSiteOp += lOp;
        sumSiteDr += lDr;
        sumSiteCr += lCr;

        siteRows.push(`
          <tr class="site-row-select" data-id="${l.code}" style="border-bottom: 1px dashed #cbd5e1; cursor: pointer; background: #f8fafc;" title="Double click to view ledger report">
            <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; font-weight: bold; color: #1e3a8a;">
              <i class="fa-solid fa-folder-tree" style="margin-right: 6px; color: #2563eb;"></i>${l.name}
            </td>
            <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right; font-weight: 500;">₹${Math.abs(lOp).toFixed(2)} ${opSuffix}</td>
            <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e; font-weight: 500;">₹${lDr.toFixed(2)}</td>
            <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right; color: #b91c1c; font-weight: 500;">₹${lCr.toFixed(2)}</td>
            <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: ${lClosing >= 0 ? '#15803d' : '#b91c1c'};">₹${Math.abs(lClosing).toFixed(2)} ${closingSuffix}</td>
          </tr>
        `);
      });

      if (siteRows.length === 0) {
        siteRows.push(`
          <tr>
            <td colspan="5" style="text-align: center; padding: 16px; color: #64748b; font-style: italic;">
              No specific site or sub-ledger entries registered for ${selectedContact.name}.
            </td>
          </tr>
        `);
      }

      const sumClosing = isCustomer ?
        (sumSiteOp + sumSiteDr - sumSiteCr) :
        (sumSiteOp + sumSiteCr - sumSiteDr);
      const totalClSuffix = isCustomer ? (sumClosing >= 0 ? "Dr" : "Cr") : (sumClosing >= 0 ? "Cr" : "Dr");
      const totalOpSuffix = isCustomer ? (sumSiteOp >= 0 ? "Dr" : "Cr") : (sumSiteOp >= 0 ? "Cr" : "Dr");

      selectedCustomerSiteBreakdown += `
        <div style="margin-top: 6px; background: #e4edf8; border: 1.5px solid #7f9db9; padding: 8px 10px; border-radius: 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); flex-shrink: 0;">
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <h4 style="margin: 0; color: #0f172a; font-family: Tahoma, sans-serif; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-layer-group" style="color: #2563eb;"></i> ${reportTitle}: <span style="color: #1e3b8b;">${selectedContact.name}</span>
              </h4>
              <button type="button" class="btn-print-breakdown" data-contact-id="${selectedContact.id}" style="padding: 2px 14px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 5px; box-shadow: 1px 1px 2px #fff inset;" title="Print Site & Sub-Ledger Breakdown">
                <i class="fa-solid fa-print"></i> Print
              </button>
              <button type="button" class="btn-close-breakdown" style="padding: 2px 10px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 5px; box-shadow: 1px 1px 2px #fff inset;" title="Close Breakdown">
                <i class="fa-solid fa-xmark"></i> Close
              </button>
            </div>
            <span style="font-size: 11px; color: #64748b; font-style: italic;">(Double-click any row to view individual ledger)</span>
          </div>
          <div style="background: white; border: 1px solid #a5c3e5; max-height: 180px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead style="position: sticky; top: 0; z-index: 10; background: #cfd8e7;">
                <tr style="background: #cfd8e7; border-bottom: 1.5px solid #a5c3e5; font-weight: bold;">
                  <th style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline;">${headerLabel}</th>
                  <th style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; width: 130px;">Op.Balance</th>
                  <th style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; width: 110px;">Debit</th>
                  <th style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; width: 110px;">Credit</th>
                  <th style="padding: 6px 8px; text-decoration: underline; text-align: right; width: 140px;">Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                ${siteRows.join("")}
              </tbody>
              ${(contactSites.length > 0 || childLedgers.length > 0) ? `
                <tfoot style="position: sticky; bottom: 0; z-index: 10; background: #e4edf8; border-top: 2px solid #1e88e5; font-weight: bold;">
                  <tr>
                    <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5;">TOTAL</td>
                    <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right;">₹${Math.abs(sumSiteOp).toFixed(2)} ${totalOpSuffix}</td>
                    <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e;">₹${sumSiteDr.toFixed(2)}</td>
                    <td style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-align: right; color: #b91c1c;">₹${sumSiteCr.toFixed(2)}</td>
                    <td style="padding: 6px 8px; text-align: right; color: ${sumClosing >= 0 ? '#15803d' : '#b91c1c'};">₹${Math.abs(sumClosing).toFixed(2)} ${totalClSuffix}</td>
                  </tr>
                </tfoot>
              ` : ""}
            </table>
          </div>
        </div>
      `;
    }
  });

  // Calculate grand totals across all filtered contacts
  const sumOp = calculatedContacts.reduce((sum, c) => sum + (c.opBalance || 0), 0);
  const sumDr = calculatedContacts.reduce((sum, c) => sum + (c.debit || 0), 0);
  const sumCr = calculatedContacts.reduce((sum, c) => sum + (c.credit || 0), 0);
  const sumCl = calculatedContacts.reduce((sum, c) => sum + (c.closingBalance || 0), 0);

  const totalOpSuffix = sumOp >= 0 ? 'Dr' : 'Cr';
  const totalClSuffix = sumCl >= 0 ? 'Dr' : 'Cr';

  const totalOpFormatted = `\u20B9${Math.abs(sumOp).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${totalOpSuffix}`;
  const totalClFormatted = `\u20B9${Math.abs(sumCl).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${totalClSuffix}`;

  const sortInd = (col) => partySortField === col ? (partySortOrder === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  return `
    <div style="background: #e4edf8; padding: 10px 12px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; color: #000; display: flex; flex-direction: column; gap: 8px; flex: 1 1 0; min-height: 0; height: 100%; box-sizing: border-box; overflow-y: auto;">
      
      <!-- Official Company Letterhead Header for Print View -->
      ${renderPrintHeaderHtml(
        activePartySubTab === "customer" ? "CUSTOMER LEDGER SUMMARY" :
        activePartySubTab === "vendor" ? "VENDOR LEDGER SUMMARY" : "CUSTOMER LEDGER SUMMARY",
        "Period: <strong>" + formatDateDisplay(filterFromDate) + " to " + formatDateDisplay(filterToDate) + "</strong>",
        filterSearchText ? "Filtered: <strong>" + (contacts.find(c => c.id === filterSearchText)?.name || filterSearchText) + "</strong>" : "All Accounts"
      )}

      <!-- TOP CONTROLS (Sub-tabs + Filter Ribbon Pinned) -->
      <div class="no-print" style="background: #e4edf8; z-index: 50; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; border-bottom: 1px solid #a5c3e5; padding-bottom: 4px;">
        <!-- Sub-Tabs Selection (Clean Classic ERP Styling) -->
      <div style="display: flex; gap: 4px; border-bottom: 2px solid #1e88e5; padding-bottom: 2px;">
        <button class="party-subtab-btn" data-subtab="customer" style="padding: 6px 16px; font-weight: bold; border: 1px solid #a5c3e5; border-bottom: none; background: ${activePartySubTab === 'customer' ? '#fff' : '#f1f5f9'}; cursor: pointer;">Customers</button>
        <button class="party-subtab-btn" data-subtab="vendor" style="padding: 6px 16px; font-weight: bold; border: 1px solid #a5c3e5; border-bottom: none; background: ${activePartySubTab === 'vendor' ? '#fff' : '#f1f5f9'}; cursor: pointer;">Vendors</button>
      </div>

      <!-- LEGACY FILTERS RIBBON PANEL -->
      <div style="background: #cfd8e7; padding: 12px; border: 1px solid #a5c3e5; display: grid; grid-template-columns: 1fr 1.1fr 2fr; gap: 12px;">
        
        <!-- Left radio balance filters -->
        <div style="border: 1px solid #a5c3e5; background: #e4edf8; padding: 8px; display: flex; flex-direction: column; gap: 4px; border-radius: 3px;">
          <label style="display: flex; align-items: center; gap: 6px; font-weight: bold;"><input type="radio" name="bal-filter" value="all" ${filterBalType === 'all' ? 'checked' : ''}> All</label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: bold;"><input type="radio" name="bal-filter" value="debit" ${filterBalType === 'debit' ? 'checked' : ''}> With Debit Balance</label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: bold;"><input type="radio" name="bal-filter" value="credit" ${filterBalType === 'credit' ? 'checked' : ''}> With Credit Balance</label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: bold;"><input type="radio" name="bal-filter" value="zero" ${filterBalType === 'zero' ? 'checked' : ''}> With Zero Balance</label>
        </div>

        <!-- Middle radio mode filters -->
        <div style="border: 1px solid #a5c3e5; background: #e4edf8; padding: 8px; display: flex; flex-direction: column; gap: 4px; border-radius: 3px;">
          <label style="display: flex; align-items: center; gap: 6px; font-weight: bold;"><input type="radio" name="sub-mode-filter" value="all" ${filterSubMode === 'all' ? 'checked' : ''}> All</label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: bold;"><input type="radio" name="sub-mode-filter" value="age" ${filterSubMode === 'age' ? 'checked' : ''}> Age Wise</label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: bold;"><input type="radio" name="sub-mode-filter" value="dues" ${filterSubMode === 'dues' ? 'checked' : ''}> Dues</label>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: bold;"><input type="radio" name="sub-mode-filter" value="area" ${filterSubMode === 'area' ? 'checked' : ''}> Area Wise</label>
        </div>

        <!-- Right date & controls inputs -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          
          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold;">From:</span>
              ${renderTallyDatePickerHtml({ id: "filter-from-date", value: filterFromDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold;">To:</span>
              ${renderTallyDatePickerHtml({ id: "filter-to-date", value: filterToDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
          </div>




          <div style="display: flex; justify-content: flex-end; gap: 4px;">
            <button id="btn-view-report" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">View</button>
            <button id="btn-print-report" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">Print</button>
            <button id="btn-close-report" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">Close</button>
          </div>

          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
            <span style="font-weight: bold;">${searchLabel}</span>
            <div class="party-searchable-combobox" style="position: relative; width: 200px; font-size: 11px;">
              
              <!-- Trigger Dropdown Box -->
              <div id="party-combobox-trigger" style="background: #fff; border: 1px solid #a5c3e5; padding: 3px 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: 2px; font-weight: bold; color: #111; user-select: none;" title="Click to select or search account">
                <span id="party-combobox-label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">
                  ${(() => {
                    const m = contacts.find(c => c.id === filterSearchText);
                    return m ? m.name : '-- All --';
                  })()}
                </span>
                <span style="font-size: 8px; color: #475569; margin-left: 4px;">${partyComboboxOpen ? '▲' : '▼'}</span>
              </div>

              <!-- Dropdown Menu Pinned with Top Search Bar -->
              <div id="party-combobox-menu" style="display: ${partyComboboxOpen ? 'flex' : 'none'}; position: absolute; top: 100%; right: 0; width: 280px; background: #fff; border: 1px solid #7f9db9; box-shadow: 0 6px 16px rgba(0,0,0,0.25); z-index: 9999; border-radius: 2px; flex-direction: column;">
                
                <!-- TOP SEARCH BAR INSIDE DROPDOWN -->
                <div style="padding: 5px; background: #e4edf8; border-bottom: 1px solid #a5c3e5; display: flex; gap: 4px; align-items: center;">
                  <input type="text" 
                         id="party-combobox-search-input" 
                         placeholder="Type here to search (e.g. 'Si')..." 
                         value="${partyDropdownSearchQuery}" 
                         autocomplete="off" 
                         style="width: 100%; border: 1px solid #7f9db9; padding: 3px 6px; font-size: 11px; background: #fff; border-radius: 2px; outline: none; font-weight: bold; color: #000;">
                  ${partyDropdownSearchQuery ? `<span id="btn-clear-combobox-query" style="cursor: pointer; color: #dc2626; font-weight: bold; font-size: 11px; padding: 0 4px;" title="Clear">✕</span>` : ''}
                </div>

                <!-- Dropdown Items List -->
                <div id="party-combobox-items-list" style="overflow-y: auto; max-height: 220px;">
                  <div class="party-combobox-item ${!filterSearchText ? 'selected' : ''}" data-id="" style="padding: 4px 8px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-weight: bold; background: ${!filterSearchText ? '#dbeafe' : '#fff'}; color: #1e3b8b;">
                    -- All --
                  </div>
                  ${(() => {
                    let list = filteredList;
                    if (partyDropdownSearchQuery) {
                      const q = partyDropdownSearchQuery.trim().toLowerCase();
                      list = list.filter(c => (c.name || "").toLowerCase().includes(q));
                    }
                    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
                    return list.map(c => `
                      <div class="party-combobox-item ${filterSearchText === c.id ? 'selected' : ''}" data-id="${c.id}" style="padding: 4px 8px; cursor: pointer; border-bottom: 1px solid #f8fafc; background: ${filterSearchText === c.id ? '#dbeafe' : '#fff'}; color: #111; font-weight: ${filterSearchText === c.id ? 'bold' : 'normal'};">
                        ${c.name}
                      </div>
                    `).join("");
                  })()}
                </div>

              </div>

            </div>
          </div>

          ${activePartySubTab === "customer" ? `
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
              <span style="font-weight: bold;">Site Type:</span>
              <select id="filter-site-type" style="width: 180px; border: 1px solid #a5c3e5; padding: 3px; font-size: 11px;">
                <option value="all" ${filterSiteType === 'all' ? 'selected' : ''}>All</option>
                <option value="single" ${filterSiteType === 'single' ? 'selected' : ''}>Single Site</option>
                <option value="multiple" ${filterSiteType === 'multiple' ? 'selected' : ''}>Multiple Sites</option>
              </select>
            </div>
          ` : activePartySubTab === "vendor" ? `
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
              <span style="font-weight: bold;">Branch Type:</span>
              <select id="filter-site-type" style="width: 180px; border: 1px solid #a5c3e5; padding: 3px; font-size: 11px;">
                <option value="all" ${filterSiteType === 'all' ? 'selected' : ''}>All</option>
                <option value="single" ${filterSiteType === 'single' ? 'selected' : ''}>Single Branch</option>
                <option value="multiple" ${filterSiteType === 'multiple' ? 'selected' : ''}>Multiple Branches</option>
              </select>
            </div>
          ` : ""}

        </div>

      </div>

      </div>

      <!-- MAIN RESULTS TABLE CONTAINER (Sticky thead & scrollable body) -->
      <div id="parties-table-scroll-container" style="background: white; border: 1px solid #a5c3e5; overflow-x: auto; overflow-y: auto; flex: ${selectedCustomerSiteBreakdown ? '0 1 auto' : '1 1 0'}; min-height: 120px; max-height: ${selectedCustomerSiteBreakdown ? '260px' : 'none'}; border-radius: 2px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead style="position: sticky; top: 0; z-index: 30; background: #e4edf8; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <tr style="background: #e4edf8; border-bottom: 1.5px solid #a5c3e5; font-weight: bold;">
              ${(activePartySubTab === "customer" || activePartySubTab === "vendor") && filterSiteType === "multiple" ? `
                <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: center; width: 45px; position: sticky; top: 0; background: #e4edf8;">Select</th>
              ` : ""}
              <th class="sortable-party-th" data-sort="name" style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline; cursor: pointer; position: sticky; top: 0; background: #e4edf8;" title="Click to sort by Name">Account Head${sortInd('name')}</th>
              <th class="sortable-party-th" data-sort="creditPeriod" style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline; cursor: pointer; position: sticky; top: 0; background: #e4edf8;" title="Click to sort by Credit Period">Cr.Period${sortInd('creditPeriod')}</th>
              <th class="sortable-party-th" data-sort="opBalance" style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; cursor: pointer; position: sticky; top: 0; background: #e4edf8;" title="Click to sort by Opening Balance">Op.Balance${sortInd('opBalance')}</th>
              <th class="sortable-party-th" data-sort="debit" style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; cursor: pointer; position: sticky; top: 0; background: #e4edf8;" title="Click to sort by Debit">Debit${sortInd('debit')}</th>
              <th class="sortable-party-th" data-sort="credit" style="padding: 6px 8px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; cursor: pointer; position: sticky; top: 0; background: #e4edf8;" title="Click to sort by Credit">Credit${sortInd('credit')}</th>
              <th class="sortable-party-th" data-sort="closingBalance" style="padding: 6px 8px; text-decoration: underline; text-align: right; cursor: pointer; position: sticky; top: 0; background: #e4edf8;" title="Click to sort by Closing Balance">Closing Balance${sortInd('closingBalance')}</th>
            </tr>
          </thead>
          <tbody>
            ${calculatedContacts.map(c => {
              const hasCheck = (activePartySubTab === "customer" || activePartySubTab === "vendor") && filterSiteType === "multiple";
              const isChecked = selectedMultipleCustomerIds.includes(c.id);
              
              const opSuffix = c.opBalance >= 0 ? 'Dr' : 'Cr';
              const clSuffix = c.closingBalance >= 0 ? 'Dr' : 'Cr';

              const opFormatted = `\u20B9${Math.abs(c.opBalance).toFixed(2)} ${opSuffix}`;
              const clFormatted = `\u20B9${Math.abs(c.closingBalance).toFixed(2)} ${clSuffix}`;

              const isRowSelected = selectedPartyRowId === c.id;
              return `
                <tr class="party-row-select" 
                    data-id="${c.id}" 
                    data-name="${(c.name || '').replace(/"/g, '&quot;')}" 
                    tabindex="0" 
                    style="border-bottom: 1px dashed #cbd5e1; cursor: pointer; outline: none; background: ${isRowSelected ? '#bfdbfe' : '#fff'};" 
                    title="Click row and type any letter to jump. Double-click to view ledger">
                  ${hasCheck ? `
                    <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: center;">
                      <input type="checkbox" class="customer-select-checkbox" data-id="${c.id}" ${isChecked ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer;">
                    </td>
                  ` : ""}
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; font-weight: bold; color: #111;">${c.name}</td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5;">${c.creditPeriod || "-"}</td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; font-weight: 500;">${opFormatted}</td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e; font-weight: 500;">${c.debit > 0 ? c.debit.toFixed(2) : "0.00"}</td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #b91c1c; font-weight: 500;">${c.credit > 0 ? c.credit.toFixed(2) : "0.00"}</td>
                  <td style="padding: 6px; text-align: right; font-weight: bold; color: ${c.closingBalance >= 0 ? '#15803d' : '#b91c1c'};">${clFormatted}</td>
                </tr>
              `;
            }).join("")}
            ${calculatedContacts.length === 0 ? `
              <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #777; font-style: italic;">No contact profiles match selected filters.</td>
              </tr>
            ` : ""}
          </tbody>
          <tfoot style="position: sticky; bottom: 0; z-index: 30; background: #e4edf8; border-top: 2px solid #1e88e5; font-weight: bold; box-shadow: 0 -1px 3px rgba(0,0,0,0.1);">
            <tr>
              ${(activePartySubTab === "customer" || activePartySubTab === "vendor") && filterSiteType === "multiple" ? `
                <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: center;">-</td>
              ` : ""}
              <td style="padding: 6px; border-right: 1px solid #a5c3e5;">TOTAL</td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5;">-</td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;">${totalOpFormatted}</td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e;">\u20B9${sumDr.toFixed(2)}</td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #b91c1c;">\u20B9${sumCr.toFixed(2)}</td>
              <td style="padding: 6px; text-align: right; color: ${sumCl >= 0 ? '#15803d' : '#b91c1c'};">${totalClFormatted}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- selected customer site summary ledger inside main container -->
      ${selectedCustomerSiteBreakdown}

    </div>


  `;
}

export function getAllIndividualLedgerAccounts() {
  const ledgers = state.getLedgers() || [];
  const contacts = state.getContacts() || [];

  const allAccounts = [];
  const seenNames = new Set();

  // 1. Add Contacts first (Customers & Vendors) so they retain contact metadata and IDs
  contacts.forEach(c => {
    const normName = String(c.name || "").trim().toUpperCase();
    if (normName && !seenNames.has(normName)) {
      seenNames.add(normName);
      allAccounts.push({
        id: c.id,
        name: c.name,
        type: c.type || "customer",
        ledgerCode: c.ledgerCode || null
      });
    }
    if (c.siteType === "multiple" && Array.isArray(c.sites) && c.sites.length > 0) {
      c.sites.forEach(site => {
        const siteKey = `${normName} - ${String(site).trim().toUpperCase()}`;
        if (!seenNames.has(siteKey)) {
          seenNames.add(siteKey);
          allAccounts.push({
            id: `${c.id}::${site}`,
            name: `${c.name} - ${site}`,
            type: c.type || "customer",
            ledgerCode: c.ledgerCode || null
          });
        }
      });
    }
  });

  // 2. Add General Ledgers (excluding those that are already added as customers/vendors)
  ledgers.forEach(l => {
    const normName = String(l.name || "").trim().toUpperCase();
    if (normName && !seenNames.has(normName)) {
      seenNames.add(normName);
      allAccounts.push({
        id: l.code,
        name: l.name,
        type: "ledger",
        ledgerCode: l.code
      });
    }
  });

  // 3. Add Core System ACCOUNTS if not already in list
  const hasCustomCash = ledgers.some(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
  const INTERNAL_SYSTEM_ACCOUNTS = new Set(["1100", "2100", "1200", "5100", "4110", "5110", "4300", "5500"]);
  if (hasCustomCash) {
    INTERNAL_SYSTEM_ACCOUNTS.add("1010");
  }

  for (const [code, acc] of Object.entries(ACCOUNTS)) {
    const normName = String(acc.name || "").trim().toUpperCase();
    if (!seenNames.has(normName) && !INTERNAL_SYSTEM_ACCOUNTS.has(code)) {
      seenNames.add(normName);
      allAccounts.push({ id: code, name: acc.name.toUpperCase(), type: "ledger", ledgerCode: code });
    }
  }

  allAccounts.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  return allAccounts;
}

export function resolveIndividualLedgerAccount(id, allAccounts) {
  if (!Array.isArray(allAccounts) || allAccounts.length === 0) return null;
  if (!id) return allAccounts[0];

  // 1. Direct match by id or ledgerCode
  let matched = allAccounts.find(a => a.id === id || (a.ledgerCode && a.ledgerCode === id));
  if (matched) return matched;

  // 2. Canonical account ID match
  const canonicalId = state.getCanonicalAccountId ? state.getCanonicalAccountId(id) : null;
  if (canonicalId) {
    matched = allAccounts.find(a => a.id === canonicalId || (a.ledgerCode && a.ledgerCode === canonicalId));
    if (matched) return matched;
  }

  // 3. Match contact by ledgerCode or id or name
  const contacts = state.getContacts ? (state.getContacts() || []) : [];
  const contactByCode = contacts.find(c => c && (c.ledgerCode === id || c.id === id || (state.getCanonicalAccountId && state.getCanonicalAccountId(c.id) === state.getCanonicalAccountId(id))));
  if (contactByCode) {
    const normName = String(contactByCode.name || "").trim().toUpperCase();
    matched = allAccounts.find(a => a.id === contactByCode.id || a.ledgerCode === contactByCode.ledgerCode || (a.name || "").trim().toUpperCase() === normName);
    if (matched) return matched;
  }

  // 4. Match ledger by code or name
  const ledgers = state.getLedgers ? (state.getLedgers() || []) : [];
  const ledgerByCode = ledgers.find(l => l && (l.code === id || (state.getCanonicalAccountId && state.getCanonicalAccountId(l.code) === state.getCanonicalAccountId(id))));
  if (ledgerByCode) {
    const normName = String(ledgerByCode.name || "").trim().toUpperCase();
    matched = allAccounts.find(a => a.id === ledgerByCode.code || a.ledgerCode === ledgerByCode.code || (a.name || "").trim().toUpperCase() === normName);
    if (matched) return matched;
  }

  return allAccounts[0];
}

function renderIndividualLedgerHtml() {
  const allAccounts = getAllIndividualLedgerAccounts();

  const selectedAcc = resolveIndividualLedgerAccount(selectedIndividualLedgerId, allAccounts);
  if (selectedAcc && selectedAcc.id) {
    selectedIndividualLedgerId = selectedAcc.id;
  }

  // Fetch entries
  const reportData = selectedAcc ? 
    getLedgerEntries(selectedAcc.id, ledgerFromDate, ledgerToDate, ledgerVoucherTypeFilter, "All") :
    { openingBalance: 0, openingBalanceSuffix: "Dr", entries: [], balanceType: "Debit" };

  let totalDebit = 0;
  let totalCredit = 0;
  (reportData.entries || []).forEach(e => {
    totalDebit += parseFloat(e.debit) || 0;
    totalCredit += parseFloat(e.credit) || 0;
  });

  const lastEntry = (reportData.entries || []).length > 0 ? reportData.entries[reportData.entries.length - 1] : null;
  const closingBalance = lastEntry ? lastEntry.balance : reportData.openingBalance;
  const closingSuffix = lastEntry ? lastEntry.balanceSuffix : reportData.openingBalanceSuffix;

  const opDebitText = reportData.openingBalance > 0 && reportData.openingBalanceSuffix === "Dr" ? `₹${reportData.openingBalance.toFixed(2)}` : "";
  const opCreditText = reportData.openingBalance > 0 && reportData.openingBalanceSuffix === "Cr" ? `₹${reportData.openingBalance.toFixed(2)}` : "";

  const opDebitVal = reportData.openingBalanceSuffix === "Dr" ? reportData.openingBalance : 0;
  const opCreditVal = reportData.openingBalanceSuffix === "Cr" ? reportData.openingBalance : 0;

  const displayTotalDebit = ledgerHideOp ? (totalDebit + opDebitVal) : totalDebit;
  const displayTotalCredit = ledgerHideOp ? (totalCredit + opCreditVal) : totalCredit;
  const totalLabel = ledgerHideOp ? "TOTAL:" : "TOTAL PERIOD TRANSACTIONS:";

  // Prepare table rows (Monthly summary vs Detailed entries)
  let rowsHtml = "";
  if (ledgerMonthly) {
    const monthlyGroups = [];
    const map = new Map();

    let netBal = reportData.openingBalanceSuffix === "Dr" ? reportData.openingBalance : -reportData.openingBalance;

    (reportData.entries || []).forEach(e => {
      const d = parseDateSafely(e.date);
      const year = d ? d.getFullYear() : 2026;
      const month = d ? d.getMonth() : 0;
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      if (!map.has(key)) {
        const monthName = d ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : key;
        const item = { key, monthName, year, month, debit: 0, credit: 0 };
        map.set(key, item);
        monthlyGroups.push(item);
      }
      const item = map.get(key);
      item.debit += parseFloat(e.debit) || 0;
      item.credit += parseFloat(e.credit) || 0;
    });

    if (monthlyGroups.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="${ledgerShowBalanceInPrint ? 7 : 6}" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">No ledger entries found in date range.</td>
        </tr>
      `;
    } else {
      rowsHtml = monthlyGroups.map(m => {
        netBal += (m.debit - m.credit);
        const balAbs = Math.abs(netBal);
        const balSuff = netBal >= 0 ? "Dr" : "Cr";
        const debitText = m.debit > 0 ? `₹${m.debit.toFixed(2)}` : "";
        const creditText = m.credit > 0 ? `₹${m.credit.toFixed(2)}` : "";
        const balanceText = `₹${balAbs.toFixed(2)} ${balSuff}`;

        return `
          <tr style="border-bottom: 1px solid #cbd5e1; background: #fff; font-weight: bold;">
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">${m.monthName}</td>
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">
              <div style="font-weight: bold; color: #1e3b8b;">Monthly Summary</div>
            </td>
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">-</td>
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top; font-weight: 500;">-</td>
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; vertical-align: top; color: #0f766e; font-weight: bold;">${debitText}</td>
            <td style="padding: 6px; ${ledgerShowBalanceInPrint ? 'border-right: 1px solid #a5c3e5;' : ''} text-align: right; vertical-align: top; color: #b91c1c; font-weight: bold;">${creditText}</td>
            ${ledgerShowBalanceInPrint ? `<td style="padding: 6px; text-align: right; vertical-align: top; font-weight: bold; color: ${balSuff === 'Dr' ? '#15803d' : '#b91c1c'};">${balanceText}</td>` : ""}
          </tr>
        `;
      }).join("");
    }
  } else {
    rowsHtml = (reportData.entries || []).map(e => {
      const debitText = e.debit > 0 ? `₹${e.debit.toFixed(2)}` : "";
      const creditText = e.credit > 0 ? `₹${e.credit.toFixed(2)}` : "";
      const balanceText = `₹${e.balance.toFixed(2)} ${e.balanceSuffix}`;
      return `
        <tr class="ledger-row-clickable" data-tx-id="${e.txId}" style="border-bottom: 1px dashed #cbd5e1; cursor: pointer;" title="Double click to edit entry">
          <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">${formatDateDisplay(e.date)}</td>
          <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top; font-weight: 500;">${e.vNo}</td>
          <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">
            <div class="ledger-particular-link" style="font-weight: bold; color: #1e3b8b; text-decoration: underline;">${e.particulars}</div>
            ${e.narration ? `<div class="ledger-narration-text" style="display: ${ledgerShowNarration ? "block" : "none"}; font-size: 11px; color: #475569; margin-top: 3px; font-style: italic;">${e.narration}</div>` : ""}
          </td>
          <td class="no-print-col" style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">${e.vType}</td>
          <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; vertical-align: top; color: #0f766e; font-weight: 500;">${debitText}</td>
          <td style="padding: 6px; ${ledgerShowBalanceInPrint ? 'border-right: 1px solid #a5c3e5;' : ''} text-align: right; vertical-align: top; color: #b91c1c; font-weight: 500;">${creditText}</td>
          ${ledgerShowBalanceInPrint ? `<td style="padding: 6px; text-align: right; vertical-align: top; font-weight: bold; color: ${e.balanceSuffix === 'Dr' ? '#15803d' : '#b91c1c'};">${balanceText}</td>` : ""}
        </tr>
      `;
    }).join("");

    if ((reportData.entries || []).length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="${ledgerShowBalanceInPrint ? 7 : 6}" class="no-print" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">No ledger entries found in date range.</td>
          <td colspan="${ledgerShowBalanceInPrint ? 6 : 5}" class="print-only-cell" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">No ledger entries found in date range.</td>
        </tr>
      `;
    }
  }

  return `
    <div class="no-print-border" style="background: #e4edf8; padding: 15px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; color: #000; display: flex; flex-direction: column; gap: 10px; flex: 1 1 auto; height: 100%; min-height: 0;">
      
      <!-- Official Company Letterhead Header for Print View -->
      ${renderPrintHeaderHtml(
        "",
        "Account: <strong>" + (selectedAcc ? selectedAcc.name : "") + "</strong>",
        "Period: <strong>" + formatDateDisplay(ledgerFromDate) + " to " + formatDateDisplay(ledgerToDate) + "</strong>"
      )}

      <!-- Title Bar -->
      <div class="no-print" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: white; padding: 6px 12px; font-weight: bold; border-radius: 3px; font-size: 14px; flex-shrink: 0;">
        LEDGER
      </div>

      <!-- Classic ERP Input ribbon panel -->
      <div class="no-print" style="background: #cfd8e7; padding: 12px; border: 1px solid #a5c3e5; display: grid; grid-template-columns: 2fr 1fr 1.5fr; gap: 15px; flex-shrink: 0;">
        
        <!-- Left Column: Dropdowns & Dates -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 5px; position: relative;">
            <span style="font-weight: bold; min-width: 100px;">Select <u>L</u>edger:</span>
            <div class="il-ledger-combobox" style="position: relative; flex-grow: 1;">
              <div style="display: flex; align-items: center; border: 1px solid #7f9db9; background: #fff; border-radius: 2px;">
                <input type="text" 
                       id="il-ledger-search-input" 
                       value="${(selectedAcc ? selectedAcc.name : '').replace(/"/g, '&quot;')}" 
                       data-id="${selectedAcc ? selectedAcc.id : ''}"
                       autocomplete="off" 
                       spellcheck="false"
                       placeholder="Type or select ledger..." 
                       style="flex-grow: 1; border: none; padding: 3px 6px; font-size: 12px; font-weight: bold; color: #000; outline: none; background: transparent; text-transform: uppercase;">
                <button type="button" 
                        id="il-ledger-dropdown-toggle" 
                        tabindex="-1"
                        style="border: none; border-left: 1px solid #cbd5e1; background: #f1f5f9; padding: 2px 6px; cursor: pointer; color: #334155; font-size: 10px; height: 100%; display: flex; align-items: center; justify-content: center;">
                  ▼
                </button>
              </div>

              <!-- Popup List Box -->
              <div id="il-ledger-popup-list" 
                   style="display: none; position: absolute; top: 100%; left: 0; width: 100%; min-width: 320px; max-height: 280px; background: #fff; border: 1px solid #475569; box-shadow: 0 6px 20px rgba(0,0,0,0.3); z-index: 9999; border-radius: 2px; flex-direction: column; overflow: hidden; font-family: Tahoma, Arial, sans-serif;">
                
                <!-- Ledgers Title Header -->
                <div style="background: #e2e8f0; border-bottom: 1px solid #94a3b8; text-align: center; font-weight: bold; font-size: 11px; color: #000; padding: 3px 6px; letter-spacing: 0.5px;">
                  Ledgers
                </div>

                <!-- Items Container -->
                <div id="il-ledger-items-container" style="overflow-y: auto; max-height: 250px; flex-grow: 1; background: #fff;">
                  ${allAccounts.map((a) => `
                    <div class="il-ledger-item ${selectedAcc && selectedAcc.id === a.id ? 'active' : ''}" 
                         data-id="${a.id}" 
                         data-name="${(a.name || '').replace(/"/g, '&quot;')}"
                         style="padding: 3px 8px; cursor: pointer; font-size: 12px; color: #000; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: ${selectedAcc && selectedAcc.id === a.id ? '#0066cc' : '#fff'}; color: ${selectedAcc && selectedAcc.id === a.id ? '#fff' : '#000'}; font-weight: ${selectedAcc && selectedAcc.id === a.id ? 'bold' : 'normal'};">
                      ${a.name}
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 15px; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold;">From:</span>
              ${renderTallyDatePickerHtml({ id: "il-from-date", value: ledgerFromDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold;">To:</span>
              ${renderTallyDatePickerHtml({ id: "il-to-date", value: ledgerToDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>

            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold; font-size: 11px; margin-bottom: 0;">
              <input type="checkbox" id="il-chk-pdc" ${ledgerIncludePdc ? 'checked' : ''}> Include Manual PDC
            </label>
          </div>

        </div>

        <!-- Middle Column: Voucher types -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="font-weight: bold; min-width: 120px;">Select Voucher Type</span>
            <select id="il-select-vtype" style="flex-grow: 1; border: 1px solid #a5c3e5; padding: 3px; font-size: 12px;">
              <option value="All" ${ledgerVoucherTypeFilter === 'All' ? 'selected' : ''}>All</option>
              <option value="Receipt" ${ledgerVoucherTypeFilter === 'Receipt' ? 'selected' : ''}>Receipt</option>
              <option value="Payment" ${ledgerVoucherTypeFilter === 'Payment' ? 'selected' : ''}>Payment</option>
              <option value="Journal" ${ledgerVoucherTypeFilter === 'Journal' ? 'selected' : ''}>Journal</option>
              <option value="Purchase" ${ledgerVoucherTypeFilter === 'Purchase' ? 'selected' : ''}>Purchase</option>
              <option value="Sales" ${ledgerVoucherTypeFilter === 'Sales' ? 'selected' : ''}>Sales</option>
              <option value="Contra" ${ledgerVoucherTypeFilter === 'Contra' ? 'selected' : ''}>Contra</option>
            </select>
          </div>
        </div>

        <!-- Right Column: Checkboxes & Controls -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-monthly" ${ledgerMonthly ? 'checked' : ''}> Monthly</label>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-narration" ${ledgerShowNarration ? 'checked' : ''}> Show Narration</label>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-balprint" ${ledgerShowBalanceInPrint ? 'checked' : ''}> Show Balance in Print</label>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-summary-final-only" ${ledgerSummaryFinalPageOnly ? 'checked' : ''}> Show Summary in Final Page Only</label>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-hide-op" ${ledgerHideOp ? 'checked' : ''}> Hide Opening Balance</label>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 5px; margin-top: 8px;">
            <button id="btn-il-view" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">View</button>
            <button id="btn-il-print" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">Print</button>
            <button id="btn-il-whatsapp" style="padding: 4px 16px; background: #25d366; border: 1px solid #20ba5a; color: white; cursor: pointer; font-weight: bold;">WhatsApp Statement</button>
            <button id="btn-il-close" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">Close</button>
          </div>
        </div>

      </div>

      <!-- Results Grid Table -->
      <div class="no-print-border" style="background: white; border: 1px solid #a5c3e5; flex: 1 1 auto; min-height: 350px; overflow-y: auto;">
        <table id="il-ledger-table" style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; color: black;">
          <thead style="position: sticky; top: 0; z-index: 10; background: #e4edf8; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <tr style="background: #e4edf8; border-bottom: 1.5px solid #a5c3e5; font-weight: bold;">
              <th style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; width: 80px; background: #e4edf8;">Date</th>
              <th style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; width: 60px; background: #e4edf8;">V.No.</th>
              <th style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; background: #e4edf8;">Particulars</th>
              <th class="no-print-col" style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; width: 70px; background: #e4edf8;">V.Type</th>
              <th style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; width: 90px; background: #e4edf8;">Debit</th>
              <th style="padding: 8px 6px; ${ledgerShowBalanceInPrint ? 'border-right: 1px solid #a5c3e5;' : ''} text-decoration: underline; text-align: right; width: 90px; background: #e4edf8;">Credit</th>
              ${ledgerShowBalanceInPrint ? `<th style="padding: 8px 6px; text-decoration: underline; text-align: right; width: 105px; background: #e4edf8;">Balance</th>` : ""}
            </tr>
          </thead>
          <tbody>
            <!-- Opening Balance Row -->
            <tr style="border-bottom: 1px dashed #cbd5e1; background: #f8fafc; font-style: italic;">
              <td style="padding: 6px; border-right: 1px solid #a5c3e5;">${formatDateDisplay(ledgerFromDate)}</td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5;"></td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5; font-weight: bold;">Opening Balance</td>
              <td class="no-print-col" style="padding: 6px; border-right: 1px solid #a5c3e5;"></td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e; font-weight: bold;">${opDebitText}</td>
              <td style="padding: 6px; ${ledgerShowBalanceInPrint ? 'border-right: 1px solid #a5c3e5;' : ''} text-align: right; color: #b91c1c; font-weight: bold;">${opCreditText}</td>
              ${ledgerShowBalanceInPrint ? `<td style="padding: 6px; text-align: right; font-weight: bold; color: ${reportData.openingBalanceSuffix === 'Dr' ? '#15803d' : '#b91c1c'};">₹${reportData.openingBalance.toFixed(2)} ${reportData.openingBalanceSuffix}</td>` : ""}
            </tr>

            <!-- Rows (Monthly Summary or Detailed Transactions) -->
            ${rowsHtml}
          </tbody>
          <tfoot class="${ledgerSummaryFinalPageOnly ? 'tfoot-final-page-only' : ''}" style="position: sticky; bottom: 0; z-index: 10; background: #e2e8f0; border-top: 2px solid #000; box-shadow: 0 -2px 6px rgba(0,0,0,0.15);">
            <tr style="border-top: 2px solid #000; background-color: #f1f5f9; font-weight: bold;">
              <td colspan="4" class="no-print" style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-align: right; text-transform: uppercase; background-color: #f1f5f9;">${totalLabel}</td>
              <td colspan="3" class="print-only-cell" style="padding: 8px 6px; text-align: right; text-transform: uppercase; background-color: #f1f5f9;">${totalLabel}</td>
              <td style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e; font-weight: bold; background-color: #f1f5f9;">₹${displayTotalDebit.toFixed(2)}</td>
              <td style="padding: 8px 6px; ${ledgerShowBalanceInPrint ? 'border-right: 1px solid #a5c3e5;' : ''} text-align: right; color: #b91c1c; font-weight: bold; background-color: #f1f5f9;">₹${displayTotalCredit.toFixed(2)}</td>
              ${ledgerShowBalanceInPrint ? `<td style="padding: 8px 6px; text-align: right; font-weight: bold; color: #64748b; background-color: #f1f5f9;">-</td>` : ""}
            </tr>
            ${!ledgerHideOp ? `
              <tr style="border-top: 1px solid #cbd5e1; background-color: #f8fafc; font-weight: bold; font-style: italic;">
                <td colspan="4" class="no-print" style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-align: right; text-transform: uppercase; background-color: #f8fafc;">Opening Balance:</td>
                <td colspan="3" class="print-only-cell" style="padding: 8px 6px; text-align: right; text-transform: uppercase; background-color: #f8fafc;">Opening Balance:</td>
                <td style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e; font-weight: bold; background-color: #f8fafc;">${opDebitText}</td>
                <td style="padding: 8px 6px; ${ledgerShowBalanceInPrint ? 'border-right: 1px solid #a5c3e5;' : ''} text-align: right; color: #b91c1c; font-weight: bold; background-color: #f8fafc;">${opCreditText}</td>
                ${ledgerShowBalanceInPrint ? `<td style="padding: 8px 6px; text-align: right; font-weight: bold; color: #64748b; background-color: #f8fafc;">-</td>` : ""}
              </tr>
            ` : ""}
            <tr style="border-top: 1px solid #a5c3e5; border-bottom: 2px solid #000; background-color: #e2e8f0; font-weight: bold; font-size: 13px;">
              <td colspan="${ledgerShowBalanceInPrint ? 6 : 4}" class="no-print" style="padding: 8px 6px; border-right: 1px solid #a5c3e5; text-align: right; text-transform: uppercase; background-color: #e2e8f0;">Closing Balance:</td>
              <td colspan="${ledgerShowBalanceInPrint ? 5 : 3}" class="print-only-cell" style="padding: 8px 6px; text-align: right; text-transform: uppercase; background-color: #e2e8f0;">Closing Balance:</td>
              <td ${ledgerShowBalanceInPrint ? '' : 'colspan="2"'} style="padding: 8px 6px; text-align: right; font-weight: 800; color: ${closingSuffix === 'Dr' ? '#15803d' : '#b91c1c'}; background-color: #e2e8f0;">₹${closingBalance.toFixed(2)} ${closingSuffix}</td>
            </tr>
          </tfoot>
        </table>
      </div>

  `;
}

export function getLedgerEntries(ledgerId, fromDate, toDate, voucherTypeFilter, employeeFilter, context = null) {
  if (!context) {
    context = buildReportContext(true);
  }
  const activeFyStartDate = state.getActiveFinancialYearStartDate();
  if (activeFyStartDate) {
    const activeFyStartD = parseDateSafely(activeFyStartDate);
    const fromD = fromDate ? parseDateSafely(fromDate) : null;
    const toD = toDate ? parseDateSafely(toDate) : null;
    if (!fromDate || (fromD && fromD < activeFyStartD)) {
      fromDate = activeFyStartDate;
    }
    if (toDate && toD && toD < activeFyStartD) {
      toDate = activeFyStartDate;
    }
  }
  const transactions = state.getTransactions();
  const contacts = state.getContacts();
  const ledgers = state.getLedgers();

  let baseId = ledgerId.includes("::") ? ledgerId.split("::")[0] : ledgerId;
  let siteName = ledgerId.includes("::") ? ledgerId.split("::")[1] : null;

  let contact = contacts.find(c => c.id === baseId);
  let ledger = ledgers.find(l => l.code === baseId);
  if (!contact && ledger) {
    contact = contacts.find(c => (ledger.tradeasyId && c.tradeasyLedgerId === ledger.tradeasyId) || (c.name && c.name.toUpperCase() === ledger.name.toUpperCase()));
  }
  if (!ledger && contact) {
    ledger = ledgers.find(l => (contact.tradeasyLedgerId && l.tradeasyId === contact.tradeasyLedgerId) || (l.name && l.name.toUpperCase() === contact.name.toUpperCase()));
  }
  if (!ledger && ACCOUNTS[baseId]) {
    const acc = ACCOUNTS[baseId];
    ledger = {
      code: baseId,
      name: acc.name,
      balanceType: acc.type === "asset" || acc.type === "expense" ? "Debit" : "Credit",
      openingBalance: 0
    };
  }

  let isSupplier = false;
  let isCustomer = false;
  let balanceType = "Debit";
  let opBalance = 0;

  const childLedgers = contact ? (ledgers || []).filter(l => {
    if (!l || isPrimaryContactLedger(l, contact)) return false;
    return l.parentCustomerId === contact.id || String(l.groupName || "").toUpperCase() === String(contact.name || "").toUpperCase();
  }) : [];

  if (contact) {
    isSupplier = contact.type === "supplier" || contact.listInVendorList === true || contact.groupName === "SUNDRY CREDITORS";
    isCustomer = contact.type === "customer" || contact.listInCustomerList === true || contact.groupName === "SUNDRY DEBTORS";
    balanceType = isSupplier ? "Credit" : "Debit";
    
    let cBType = contact.balanceType || (isSupplier ? "Credit" : "Debit");
    let rawOp = 0;

    if (siteName) {
      if (contact.openingBalances && contact.openingBalances[siteName] !== undefined) {
        rawOp = parseFloat(contact.openingBalances[siteName]) || 0;
      } else if (!contact.sites || contact.sites[0] === siteName) {
        rawOp = parseFloat(contact.openingBalance) || 0;
      }
    } else if (contact.siteType === "multiple" && Array.isArray(contact.sites) && contact.sites.length > 0) {
      contact.sites.forEach(s => {
        if (contact.openingBalances && contact.openingBalances[s] !== undefined) {
          rawOp += parseFloat(contact.openingBalances[s]) || 0;
        }
      });
      if (rawOp === 0) rawOp = parseFloat(contact.openingBalance) || 0;
    } else {
      rawOp = parseFloat(contact.openingBalance) || 0;
    }

    opBalance = (cBType === balanceType) ? Math.abs(rawOp) : -Math.abs(rawOp);

    if (!siteName && childLedgers.length > 0) {
      childLedgers.forEach(l => {
        const lRaw = parseFloat(l.openingBalance) || 0;
        if (l.balanceType === balanceType) {
          opBalance += Math.abs(lRaw);
        } else {
          opBalance -= Math.abs(lRaw);
        }
      });
    }
  } else if (ledger) {
    balanceType = ledger.balanceType || "Debit";
    opBalance = parseFloat(ledger.openingBalance) || 0;
  }

  let startBal = balanceType === "Debit" ? opBalance : -opBalance;

  const startLimit = fromDate ? parseDateSafely(fromDate) : null;
  const endLimit = toDate ? parseDateSafely(toDate) : null;
  if (startLimit) startLimit.setHours(0, 0, 0, 0);
  if (endLimit) endLimit.setHours(23, 59, 59, 999);

  const entriesList = [];
  const seenTxIds = new Set();
  const seenVoucherSignatures = new Set();

  // Pre-build lookup maps or reuse prebuilt context to avoid O(n²) nested creation
  const invoicesByRef = context?.invoicesByRef || (() => {
    const map = new Map();
    state.getInvoices().forEach(i => {
      if (!i) return;
      if (i.voucherNo) map.set(i.voucherNo, i);
      if (i.id) map.set(i.id, i);
      if (i.refNo) map.set(i.refNo, i);
    });
    return map;
  })();

  const purchasesByRef = context?.purchasesByRef || (() => {
    const map = new Map();
    state.getPurchases().forEach(p => {
      if (!p) return;
      if (p.voucherNo) map.set(p.voucherNo, p);
      if (p.id) map.set(p.id, p);
      if (p.invoiceNo) map.set(p.invoiceNo, p);
      if (p.refNo) map.set(p.refNo, p);
    });
    return map;
  })();

  const salesReturnsByRef = context?.salesReturnsByRef || (() => {
    const map = new Map();
    (state.getSalesReturns() || []).forEach(sr => {
      if (!sr) return;
      if (sr.id) map.set(sr.id, sr);
      if (sr.voucherNo) map.set(sr.voucherNo, sr);
    });
    return map;
  })();

  const purchaseReturnsByRef = context?.purchaseReturnsByRef || (() => {
    const map = new Map();
    (state.getPurchaseReturns() || []).forEach(pr => {
      if (!pr) return;
      if (pr.id) map.set(pr.id, pr);
      if (pr.voucherNo) map.set(pr.voucherNo, pr);
    });
    return map;
  })();

  const contactsByCanonicalId = context?.contactsByCanonicalId || (() => {
    const map = new Map();
    contacts.forEach(c => {
      const cid = state.getCanonicalAccountId(c.id);
      if (cid) map.set(cid, c);
    });
    return map;
  })();

  const ledgersByCanonicalCode = context?.ledgersByCanonicalCode || (() => {
    const map = new Map();
    ledgers.forEach(l => {
      const lid = state.getCanonicalAccountId(l.code);
      if (lid) map.set(lid, l);
    });
    return map;
  })();

  let transactionsToScan = transactions;
  if (context && context.transactionsByAccountId) {
    const candidateSet = new Set();
    const addList = (list) => { if (list) list.forEach(t => candidateSet.add(t)); };

    const baseCanId = state.getCanonicalAccountId(baseId);
    if (baseCanId) addList(context.transactionsByAccountId.get(baseCanId));
    addList(context.transactionsByAccountId.get(baseId));

    if (contact) {
      const canCid = state.getCanonicalAccountId(contact.id);
      if (canCid) {
        addList(context.transactionsByAccountId.get(canCid));
        addList(context.transactionsByContactId?.get(canCid));
      }
      addList(context.transactionsByAccountId.get(contact.id));
      addList(context.transactionsByContactId?.get(contact.id));

      if (contact.ledgerCode) {
        const canCode = state.getCanonicalAccountId(contact.ledgerCode);
        if (canCode) addList(context.transactionsByAccountId.get(canCode));
        addList(context.transactionsByAccountId.get(contact.ledgerCode));
      }

      childLedgers.forEach(cl => {
        const canCl = state.getCanonicalAccountId(cl.code);
        if (canCl) addList(context.transactionsByAccountId.get(canCl));
        addList(context.transactionsByAccountId.get(cl.code));
      });

      addList(context.transactionsByAccountId.get("1100"));
      addList(context.transactionsByAccountId.get("2100"));
    }

    if (ledger) {
      const canL = state.getCanonicalAccountId(ledger.code);
      if (canL) addList(context.transactionsByAccountId.get(canL));
      addList(context.transactionsByAccountId.get(ledger.code));

      const gstGroupNames = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
      const ledgerNameUpper = String(ledger.name || "").toUpperCase().trim();
      const ledgerCodeUpper = String(ledger.code || "").toUpperCase().trim();
      const isTopLevelGstGroup = gstGroupNames.includes(ledgerNameUpper) ||
                                 (ledgerCodeUpper >= "23" && ledgerCodeUpper <= "28");
      const matchedGstGroup = isTopLevelGstGroup ? gstGroupNames.find(g => 
        ledgerNameUpper === g || 
        (ledgerCodeUpper === "23" && g === "INPUT SGST") ||
        (ledgerCodeUpper === "24" && g === "INPUT CGST") ||
        (ledgerCodeUpper === "25" && g === "INPUT IGST") ||
        (ledgerCodeUpper === "26" && g === "OUTPUT SGST") ||
        (ledgerCodeUpper === "27" && g === "OUTPUT CGST") ||
        (ledgerCodeUpper === "28" && g === "OUTPUT IGST")
      ) : null;

      if (matchedGstGroup) {
        (ledgers || []).forEach(l => {
          if (!l || !l.code) return;
          const gName = String(l.groupName || "").toUpperCase();
          const lName = String(l.name || "").toUpperCase();
          if (gName === matchedGstGroup || lName.includes(matchedGstGroup)) {
            const canSubL = state.getCanonicalAccountId(l.code);
            if (canSubL) addList(context.transactionsByAccountId.get(canSubL));
            addList(context.transactionsByAccountId.get(l.code));
          }
        });
      }
    }

    if (siteName) {
      const siteCanId = state.getCanonicalAccountId(ledgerId);
      if (siteCanId) addList(context.transactionsByAccountId.get(siteCanId));
      addList(context.transactionsByAccountId.get(ledgerId));
    }

    if (baseId === "1100" || baseId === "2100") {
      addList(context.transactionsByAccountId.get("1100"));
      addList(context.transactionsByAccountId.get("2100"));
    }

    if (context.invoicesByContactId && contact) {
      const invs = context.invoicesByContactId.get(contact.id);
      if (invs && context.transactionsByRef) {
        invs.forEach(inv => {
          const vNo = inv.voucherNo || inv.id || inv.refNo;
          if (vNo) addList(context.transactionsByRef.get(String(vNo).trim()));
        });
      }
    }

    transactionsToScan = Array.from(candidateSet);
  }

  transactionsToScan.forEach(tx => {
    if (!tx || !tx.id || seenTxIds.has(tx.id)) return;
    const txRef = (tx.reference || "").trim();
    const globalMatchedInv = invoicesByRef.get(txRef);
    const globalMatchedPur = purchasesByRef.get(txRef);

    if ((globalMatchedInv && globalMatchedInv.isCancelled) || (globalMatchedPur && globalMatchedPur.isCancelled)) {
      return;
    }

    let isTxMatch = false;
    let targetEntry = null;
    let matchedChildLedger = null;

    if (contact) {
      // Find exact invoice/purchase/return matching the transaction reference via ID/refNo/invoiceNo
      const txRef = (tx.reference || "");
      let matchedInv = invoicesByRef.get(txRef) || null;
      if (matchedInv && (matchedInv.contactId || "").split("::")[0] !== contact.id) matchedInv = null;
      let matchedPur = purchasesByRef.get(txRef) || null;
      if (matchedPur && (matchedPur.contactId || "").split("::")[0] !== contact.id) matchedPur = null;
      let matchedSalesRet = salesReturnsByRef.get(txRef) || null;
      if (matchedSalesRet && (matchedSalesRet.contactId || "").split("::")[0] !== contact.id) matchedSalesRet = null;
      let matchedPurRet = purchaseReturnsByRef.get(txRef) || null;
      if (matchedPurRet && (matchedPurRet.contactId || "").split("::")[0] !== contact.id) matchedPurRet = null;

      const txSite = tx.siteName || "";
      const matchedTxSite = txSite || (matchedInv ? matchedInv.siteName : (matchedPur ? matchedPur.siteName : (matchedSalesRet ? matchedSalesRet.siteName : (matchedPurRet ? matchedPurRet.siteName : ""))));

      

      if (siteName) {
        // If it's a specific site/branch ledger
        targetEntry = tx.entries.find(e => {
          if (!e || !e.accountId) return false;
          const canonicalEntryAcc = String(state.getCanonicalAccountId(e.accountId) || "");
          const canonicalLedgerAcc = String(state.getCanonicalAccountId(ledgerId) || "");
          return canonicalEntryAcc === canonicalLedgerAcc;
        });
        
        if (!targetEntry) {
          const isDocMatch = !!matchedInv || !!matchedPur || !!matchedSalesRet || !!matchedPurRet;
          if (isDocMatch && matchedTxSite && matchedTxSite.toLowerCase() === siteName.toLowerCase()) {
            targetEntry = tx.entries.find(e => {
              if (!e || !e.accountId) return false;
              const canonicalEntryAcc = String(state.getCanonicalAccountId(e.accountId) || "");
              const canonicalContactAcc = String(state.getCanonicalAccountId(contact.id) || "");
              const [entryBase, entrySite] = canonicalEntryAcc ? canonicalEntryAcc.split("::") : ["", ""];
              return entryBase === canonicalContactAcc && entrySite && entrySite.toLowerCase() === siteName.toLowerCase();
            });
          } else {
            const isCustomer = contact.type === "customer" || contact.listInCustomerList === true;
            const refStr = String(tx.reference || "");
            const txDescLower = (tx.description || "").toLowerCase();
            const contactNameLower = (contact.name || "").trim().toLowerCase();
            const nameMatch = contactNameLower !== "" && (txDescLower.includes(contactNameLower) || refStr.toLowerCase().includes(contactNameLower));
            if (nameMatch) {
              const isPurOrPay = refStr.toLowerCase().includes("purchase") || refStr.startsWith("DN-") || txDescLower.includes("payment to supplier") || txDescLower.includes("purchase of building");
              const isInvOrRec = refStr.toLowerCase().includes("invoice") || refStr.startsWith("CN-") || txDescLower.includes("receipt from customer") || txDescLower.includes("sales invoice to");
              if ((isCustomer && !isPurOrPay) || (!isCustomer && !isInvOrRec)) {
                if (matchedTxSite && matchedTxSite.toLowerCase() === siteName.toLowerCase()) {
                  targetEntry = tx.entries.find(e => {
                    if (!e || !e.accountId) return false;
                    const canonicalEntryAcc = String(state.getCanonicalAccountId(e.accountId) || "");
                    const canonicalContactAcc = String(state.getCanonicalAccountId(contact.id) || "");
                    const [entryBase, entrySite] = canonicalEntryAcc ? canonicalEntryAcc.split("::") : ["", ""];
                    return entryBase === canonicalContactAcc && entrySite && entrySite.toLowerCase() === siteName.toLowerCase();
                  });
                }
              }
            }
          }
        }
      } else {
        // General contact ID without site name
        targetEntry = tx.entries.find(e => {
          if (!e || !e.accountId) return false;
          if (e.accountId === contact.id || e.accountId.startsWith(contact.id + "::")) return true;
          if (contact.ledgerCode && (e.accountId === contact.ledgerCode || e.accountId.startsWith(contact.ledgerCode + "::"))) return true;
          if (ledger && (e.accountId === ledger.code || e.accountId.startsWith(ledger.code + "::"))) return true;
          const canonicalEntryAcc = String(state.getCanonicalAccountId(e.accountId) || "");
          const canonicalContactAcc = String(state.getCanonicalAccountId(contact.id) || "");
          const canonicalLedgerCode = contact.ledgerCode ? String(state.getCanonicalAccountId(contact.ledgerCode) || "") : "";
          const [entryBase] = canonicalEntryAcc ? canonicalEntryAcc.split("::") : [""];
          return entryBase === canonicalContactAcc || 
                 (canonicalLedgerCode && entryBase === canonicalLedgerCode) || 
                 (ledger && entryBase === state.getCanonicalAccountId(ledger.code));
        });
        if (!targetEntry && childLedgers.length > 0) {
          targetEntry = tx.entries.find(e => {
            if (!e || !e.accountId) return false;
            const canonicalEntryAcc = String(state.getCanonicalAccountId(e.accountId) || "");
            const cl = childLedgers.find(l => state.getCanonicalAccountId(l.code) === canonicalEntryAcc);
            if (cl) {
              matchedChildLedger = cl;
              return true;
            }
            return false;
          });
        }
        if (!targetEntry && globalMatchedInv) {
          if (globalMatchedInv.payMode === "Credit" || (!globalMatchedInv.payMode && globalMatchedInv.contactId !== "__CASH__")) {
            const invContactId = (globalMatchedInv.contactId || "").split("::")[0];
            const isSameId = invContactId === contact.id || state.getCanonicalAccountId(invContactId) === state.getCanonicalAccountId(contact.id);
            const isSameName = contact.name && globalMatchedInv.contactName && globalMatchedInv.contactName.trim().toUpperCase() === contact.name.trim().toUpperCase();
            if (isSameId || isSameName) {
              targetEntry = tx.entries.find(e => e.debit > 0) || tx.entries[0];
            }
          }
        }
        if (!targetEntry && globalMatchedPur) {
          if (globalMatchedPur.payMode === "Credit" || (!globalMatchedPur.payMode && globalMatchedPur.contactId !== "__CASH__")) {
            const purContactId = (globalMatchedPur.supplierId || globalMatchedPur.contactId || "").split("::")[0];
            const isSameId = purContactId === contact.id || state.getCanonicalAccountId(purContactId) === state.getCanonicalAccountId(contact.id);
            const isSameName = contact.name && (globalMatchedPur.supplierName || globalMatchedPur.contactName) && (globalMatchedPur.supplierName || globalMatchedPur.contactName).trim().toUpperCase() === contact.name.trim().toUpperCase();
            if (isSameId || isSameName) {
              targetEntry = tx.entries.find(e => e.credit > 0) || tx.entries[0];
            }
          }
        }

        if (!targetEntry && (tx.description || tx.reference)) {
          const descLower = (tx.description || "").toLowerCase();
          const refLower = (tx.reference || "").toLowerCase();
          const contactNameLower = (contact.name || "").trim().toLowerCase();
          const contactIdLower = (contact.id || "").trim().toLowerCase();
          const contactCodeLower = (contact.ledgerCode || "").trim().toLowerCase();

          const nameMatch = (contactNameLower && (descLower.includes(contactNameLower) || refLower.includes(contactNameLower))) ||
                            (contactIdLower && (descLower.includes(contactIdLower) || refLower.includes(contactIdLower))) ||
                            (contactCodeLower && (descLower.includes(contactCodeLower) || refLower.includes(contactCodeLower)));

          if (nameMatch) {
            targetEntry = tx.entries.find(e => {
              if (!e || !e.accountId) return false;
              const canonicalEntryAcc = String(state.getCanonicalAccountId(e.accountId) || "");
              return canonicalEntryAcc === "1100" || canonicalEntryAcc === "2100" || canonicalEntryAcc === contact.id || (contact.ledgerCode && canonicalEntryAcc === contact.ledgerCode);
            });
          }
        }
        if (!targetEntry && contact.id === "__CASH__" && globalMatchedInv) {
          // Resolve targetEntry to the Cash/Bank or Sales entry of the transaction so Cash Sales Ledger displays it
          targetEntry = tx.entries.find(e => e.accountId === "1010" || e.accountId === "1020" || e.accountId === "L0001") || tx.entries[0];
        }
      }
    } else if (ledger) {
      
      const isSalesL = String(ledger.code).toUpperCase() === "4100" || String(ledger.code).toUpperCase() === "L022" || String(ledger.code).toUpperCase() === "L024" || String(ledger.code).toUpperCase() === "L025" || (ledger.groupName && (ledger.groupName.toUpperCase() === "SALES ACCOUNTS" || ledger.groupName.toUpperCase() === "SALES ACCOUNT"));
      const isPurL = String(ledger.code).toUpperCase() === "1200" || String(ledger.code).toUpperCase() === "L018" || String(ledger.code).toUpperCase() === "L020" || String(ledger.code).toUpperCase() === "L021" || (ledger.groupName && (ledger.groupName.toUpperCase() === "PURCHASE ACCOUNTS" || ledger.groupName.toUpperCase() === "PURCHASE ACCOUNT"));
      const isCashL = String(ledger.code).toUpperCase() === "1010" || String(ledger.code).toUpperCase() === "L0001" || String(ledger.groupName || "").toUpperCase() === "CASH-IN-HAND" || String(ledger.name || "").toUpperCase() === "CASH";
      const isBankL = String(ledger.code).toUpperCase() === "1020" || String(ledger.groupName || "").toUpperCase() === "BANK ACCOUNTS" || (ledger.name && String(ledger.name).toUpperCase().includes("BANK"));
      
      const refUpper = (tx.reference || "").toUpperCase();
      const descLower = (tx.description || "").toLowerCase();
      
      const isCogs = refUpper.includes("COGS") || descLower.includes("cogs") || descLower.includes("cost of goods");
      const isStockAdj = refUpper.startsWith("STOCK ADJ") || descLower.includes("stock adjustment");
      const isConversion = refUpper.startsWith("CONVERSION") || descLower.includes("stock conversion");

      if (isPurL && (isCogs || isStockAdj || isConversion)) return;
      if (isSalesL && (isCogs || isStockAdj || isConversion)) return;

      const gstGroupNames = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
      const ledgerNameUpper = String(ledger.name || "").toUpperCase().trim();
      const ledgerCodeUpper = String(ledger.code || "").toUpperCase().trim();
      const isTopLevelGstGroup = gstGroupNames.includes(ledgerNameUpper) ||
                                 (ledgerCodeUpper >= "23" && ledgerCodeUpper <= "28");
      const matchedGstGroup = isTopLevelGstGroup ? gstGroupNames.find(g => 
        ledgerNameUpper === g || 
        (ledgerCodeUpper === "23" && g === "INPUT SGST") ||
        (ledgerCodeUpper === "24" && g === "INPUT CGST") ||
        (ledgerCodeUpper === "25" && g === "INPUT IGST") ||
        (ledgerCodeUpper === "26" && g === "OUTPUT SGST") ||
        (ledgerCodeUpper === "27" && g === "OUTPUT CGST") ||
        (ledgerCodeUpper === "28" && g === "OUTPUT IGST")
      ) : null;

      // Find exact code match first to avoid matching core Sales/Purchase entries for adjustment accounts
      targetEntry = tx.entries.find(e => {
        if (!e || !e.accountId) return false;
        const canonicalEntryAcc = state.getCanonicalAccountId(e.accountId);
        const canonicalLedgerAcc = state.getCanonicalAccountId(ledger.code);
        if (canonicalEntryAcc === canonicalLedgerAcc) return true;
        if (isCashL && (canonicalEntryAcc === "1010" || canonicalEntryAcc === "L0001" || e.accountId === "1010" || e.accountId === "L0001")) return true;
        if (isBankL && (canonicalEntryAcc === "1020" || e.accountId === "1020" || e.accountId === ledger.code)) return true;

        if (matchedGstGroup) {
          const entryLedger = ledgers.find(l => l.code === e.accountId || state.getCanonicalAccountId(l.code) === canonicalEntryAcc);
          const eGroup = entryLedger ? String(entryLedger.groupName || "").toUpperCase() : "";
          const eName = entryLedger ? String(entryLedger.name || "").toUpperCase() : String(e.accountId).toUpperCase();
          if (eGroup === matchedGstGroup || eName.includes(matchedGstGroup)) return true;
        }
        return false;
      });
      if (!targetEntry) {
        targetEntry = tx.entries.find(e => {
          if (!e || !e.accountId) return false;
          const canonicalEntryAcc = state.getCanonicalAccountId(e.accountId);
          if (isSalesL) return ["4100", "L022", "L024", "L025"].includes(canonicalEntryAcc);
          if (isPurL) return ["1200", "L018", "L020", "L021"].includes(canonicalEntryAcc);
          return false;
        });
      }
    }

    if (ledger) {
      
    }

    if (targetEntry) {
      const txDate = parseDateSafely(tx.date);
      
      // Determine debit/credit side based on transaction type for cash/bank entries
      let dr = targetEntry.debit || 0;
      let cr = targetEntry.credit || 0;

      const computedVType = (() => {
        const vTypeRaw = String(tx.voucherType || "").trim();
        const vTypeUpper = vTypeRaw.toUpperCase();
        if (["RECEIPT", "PAYMENT", "JOURNAL", "CONTRA", "REC", "PAY", "CON", "JV"].includes(vTypeUpper)) {
          if (vTypeUpper === "REC" || vTypeUpper === "RECEIPT") return "Receipt";
          if (vTypeUpper === "PAY" || vTypeUpper === "PAYMENT") return "Payment";
          if (vTypeUpper === "CON" || vTypeUpper === "CONTRA") return "Contra";
          if (vTypeUpper === "JV" || vTypeUpper === "JOURNAL") return "Journal";
        }
        const refUpper = String(tx.reference || "").toUpperCase();
        if (refUpper.startsWith("RC-") || refUpper.startsWith("RCPT")) return "Receipt";
        if (refUpper.startsWith("PAY-") || refUpper.startsWith("PM-") || refUpper.startsWith("PY-")) return "Payment";
        if (refUpper.startsWith("CNTR-")) return "Contra";
        if (refUpper.startsWith("JV-") || refUpper.startsWith("JV")) return "Journal";
        if (refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("SALES RETURN") || refUpper.startsWith("SR-")) return "Sales Return";
        if (refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("PURCHASE RETURN") || refUpper.startsWith("DN-")) return "Purchase Return";
        if (refUpper.startsWith("B2B") || refUpper.startsWith("LSL") || refUpper.startsWith("ISL") || refUpper.startsWith("NSL") || refUpper.startsWith("SA-")) return "Sales";
        if (refUpper.startsWith("LPR") || refUpper.startsWith("IPR") || refUpper.startsWith("NPR") || refUpper.startsWith("LP-")) return "Purchase";
        if (refUpper.startsWith("CN-")) return "Contra";

        const refLower = (tx.reference || "").toLowerCase();
        const descLower = (tx.description || "").toLowerCase();
        if (refLower.includes("credit note") || refLower.includes("sales return") || refLower.startsWith("sr-")) return "Sales Return";
        if (refLower.includes("debit note") || refLower.includes("purchase return") || refLower.startsWith("dn-")) return "Purchase Return";
        if (refLower.includes("receipt") || refLower.includes("rcpt")) return "Receipt";
        if (refLower.includes("payment") || refLower.includes("pay")) return "Payment";
        if (refLower.includes("contra") || refLower.includes("cntr")) return "Contra";
        if (refLower.includes("purchase") || refLower.includes("bill")) return "Purchase";
        if (refLower.includes("sales") || refLower.includes("invoice")) return "Sales";
        return "Journal";
      })();

      // Record transaction voucher signatures to prevent fallback duplicate synthetic additions
      const vNoRef = tx.reference || tx.voucherNo || tx.id || "";
      const docSig = (computedVType === "Purchase" || computedVType === "Sales" || computedVType === "Purchase Return" || computedVType === "Sales Return") ?
        `${computedVType}::${vNoRef}::${tx.date}::${dr.toFixed(2)}::${cr.toFixed(2)}` :
        null;
      const altDocSig = (computedVType === "Purchase" || computedVType === "Sales" || computedVType === "Purchase Return" || computedVType === "Sales Return") ?
        `${computedVType}::${tx.id}::${tx.date}::${dr.toFixed(2)}::${cr.toFixed(2)}` :
        null;

      if (docSig) seenVoucherSignatures.add(docSig);
      if (altDocSig) seenVoucherSignatures.add(altDocSig);

      if (startLimit && txDate < startLimit) {
        let entryNet = 0;
        if (balanceType === "Debit") {
          entryNet = dr - cr;
        } else {
          entryNet = cr - dr;
        }
        startBal += entryNet;
      } else if ((!startLimit || txDate >= startLimit) && (!endLimit || txDate <= endLimit)) {
        let matchesVoucherType = true;
        if (voucherTypeFilter && voucherTypeFilter !== "All") {
          matchesVoucherType = computedVType.toLowerCase() === voucherTypeFilter.toLowerCase();
        }

        let matchesEmployee = true;
        if (employeeFilter && employeeFilter !== "All") {
          const inv = invoicesByRef.get(tx.reference) || null;
          if (inv) {
            matchesEmployee = inv.employee === employeeFilter;
          } else {
            matchesEmployee = tx.description.toLowerCase().includes(employeeFilter.toLowerCase());
          }
        }

        if (matchesVoucherType && matchesEmployee) {
          // Resolve main party name for purchase/sales documents
          let partyName = "";
          const txRef = tx.reference || "";
          if (globalMatchedInv) {
            partyName = globalMatchedInv.contactName;
          } else if (globalMatchedPur) {
            partyName = globalMatchedPur.contactName;
          } else {
            const cleanId = txRef.replace(/^(Credit Note|Debit Note|Sales Return|Purchase Return)\s+/i, "");
            const salesRet = salesReturnsByRef.get(txRef) || salesReturnsByRef.get(cleanId) || null;
            const purRet = purchaseReturnsByRef.get(txRef) || purchaseReturnsByRef.get(cleanId) || null;
            if (salesRet) partyName = salesRet.contactName;
            else if (purRet) partyName = purRet.contactName;
          }

          // If no specific voucher found but there's a contact or Cash/Bank account in the counterpart entries, resolve it as the primary party
          if (!partyName) {
            const partyEntry = tx.entries.find(e => {
              const accountIdStr = e.accountId || "";
              const baseId = accountIdStr.split("::")[0];
              const canonicalBaseId = state.getCanonicalAccountId(baseId);
              const matchingC = contactsByCanonicalId.get(canonicalBaseId);
              return !!matchingC || canonicalBaseId === "1010" || canonicalBaseId === "1020";
            });
            if (partyEntry) {
              const accountIdStr = partyEntry.accountId || "";
              const baseId = accountIdStr.split("::")[0];
              const sitePart = accountIdStr.split("::")[1];
              const canonicalBaseId = state.getCanonicalAccountId(baseId);
              const matchingC = contactsByCanonicalId.get(canonicalBaseId);
              if (matchingC) {
                partyName = sitePart ? `${matchingC.name} - ${sitePart}` : matchingC.name;
              } else if (canonicalBaseId === "1010") {
                partyName = "Cash";
              } else if (canonicalBaseId === "1020") {
                partyName = "Bank Current Account";
              }
            }
          }

          const counterparts = tx.entries
            .filter(e => e !== targetEntry)
            .map(e => {
              // 1. Resolve base and site branch
              const accountIdStr = e.accountId || "";
              const baseId = accountIdStr.split("::")[0];
              const sitePart = accountIdStr.split("::")[1];
              const canonicalBaseId = state.getCanonicalAccountId(baseId);
              
              // 2. Resolve AR/AP control accounts to contactName if invoice/purchase matches
              if (canonicalBaseId === "1100" || canonicalBaseId === "2100") {
                if (globalMatchedInv) return globalMatchedInv.contactName;
                if (globalMatchedPur) return globalMatchedPur.contactName;
                
                // Fallback parsing from description
                const desc = (tx.description || "");
                if (desc.includes("Receipt from Customer:")) {
                  return desc.replace("Receipt from Customer:", "").split("(")[0].trim();
                }
                if (desc.includes("Receipt from Supplier:")) {
                  return desc.replace("Receipt from Supplier:", "").split("(")[0].trim();
                }
                if (desc.includes("Payment to Supplier:")) {
                  return desc.replace("Payment to Supplier:", "").split("(")[0].trim();
                }
              }

              // 3. Resolve to contact
              const matchingC = contactsByCanonicalId.get(canonicalBaseId);
              if (matchingC) {
                return sitePart ? `${matchingC.name} - ${sitePart}` : matchingC.name;
              }

              // 4. Resolve ledgers
              const matchingL = ledgersByCanonicalCode.get(canonicalBaseId);
              if (matchingL) return matchingL.name;
              
              // 5. Fallback check for static accounts
              if (ACCOUNTS[canonicalBaseId]) return ACCOUNTS[canonicalBaseId].name;
              
              return accountIdStr;
            });
          
          let counterpartNames = "";
          let resolvedCounterpartName = "";
          if (contact) {
            if (globalMatchedInv) {
              const seriesId = globalMatchedInv.seriesId;
              const series = state.getSeriesMaster().find(s => s.id === seriesId);
              const seriesType = series ? series.seriesType : "LOCAL";
              if (seriesType === "LOCAL") resolvedCounterpartName = "Local Sales";
              else if (seriesType === "INTERSTATE") resolvedCounterpartName = "IGST Sales";
              else if (seriesType === "NONTAXABLE") resolvedCounterpartName = "Non Taxable Sales";
            } else if (globalMatchedPur) {
              const seriesId = globalMatchedPur.seriesId;
              const series = state.getSeriesMaster().find(s => s.id === seriesId);
              const seriesType = series ? series.seriesType : "LOCAL";
              if (seriesType === "LOCAL") resolvedCounterpartName = "Local Purchase";
              else if (seriesType === "INTERSTATE") resolvedCounterpartName = "IGST Purchase";
              else if (seriesType === "NONTAXABLE") resolvedCounterpartName = "Non Taxable Purchase";
            } else {
              const desc = (tx.description || "").toLowerCase();
              const ref = (tx.reference || "").toLowerCase();
              if (desc.includes("sales return") || desc.includes("credit note") || ref.startsWith("sr-") || ref.startsWith("cn-")) {
                resolvedCounterpartName = "Sales Return";
              } else if (desc.includes("purchase return") || desc.includes("debit note") || ref.startsWith("pr-") || ref.startsWith("dn-")) {
                resolvedCounterpartName = "Purchase Return";
              }
            }
          }

          if (contact && resolvedCounterpartName) {
            counterpartNames = resolvedCounterpartName;
          } else {
            counterpartNames = counterparts.map(cName => {
              // Translate core accounts to their names if needed
              if (ACCOUNTS[cName]) return ACCOUNTS[cName].name;
              return cName;
            }).join(", ") || "Self / Offset";
          }

          if (!contact && ledger && partyName) {
            counterpartNames = partyName;
          }
          
          let particulars = counterpartNames;

          if (matchedChildLedger) {
            particulars += ` (${matchedChildLedger.name})`;
          }

          let narration = tx.description || "";
          if (matchedChildLedger) {
            const childPrefix = `[${matchedChildLedger.name}]`;
            if (!narration.includes(childPrefix)) {
              narration = narration ? `${childPrefix} ${narration}` : childPrefix;
            }
          }

          entriesList.push({
            txId: tx.id,
            date: tx.date,
            particulars: particulars,
            narration: narration,
            vType: computedVType,
            vNo: tx.reference,
            debit: dr,
            credit: cr,
            timestamp: txDate.getTime()
          });
        }
      }
    }
  });

  // Fallback scan for any sales invoices or purchases belonging to contact/ledger missing from transaction log
  if (contact) {
    let invoicesToScan = state.getInvoices() || [];
    if (context && context.invoicesByContactId) {
      const invSet = new Set();
      const canCid = state.getCanonicalAccountId(contact.id);
      if (canCid && context.invoicesByContactId.has(canCid)) {
        context.invoicesByContactId.get(canCid).forEach(i => invSet.add(i));
      }
      if (context.invoicesByContactId.has(contact.id)) {
        context.invoicesByContactId.get(contact.id).forEach(i => invSet.add(i));
      }
      if (contact.name) {
        const upperName = contact.name.trim().toUpperCase();
        if (context.invoicesByContactName?.has(upperName)) {
          context.invoicesByContactName.get(upperName).forEach(i => invSet.add(i));
        }
      }
      invoicesToScan = Array.from(invSet);
    }

    invoicesToScan.forEach(inv => {
      if (!inv || inv.isCancelled) return;
      const isCreditInv = inv.payMode === "Credit" || (!inv.payMode && inv.contactId && inv.contactId !== "__CASH__");
      if (!isCreditInv) return;
      const invContactId = (inv.contactId || "").split("::")[0];
      const isSameId = invContactId === contact.id || state.getCanonicalAccountId(invContactId) === state.getCanonicalAccountId(contact.id);
      const isSameName = contact.name && inv.contactName && inv.contactName.trim().toUpperCase() === contact.name.trim().toUpperCase();
      
      if (isSameId || isSameName) {
        const vNo = inv.voucherNo || inv.id || "";
        const docSig = `Sales::${vNo}::${inv.date}::${(inv.total || 0).toFixed(2)}::0.00`;
        const altDocSig = `Sales::${vNo}`;
        
        const alreadyInLedger = entriesList.some(e => e.vNo === vNo || (e.txId && String(e.txId) === String(inv.id)));
        if (!alreadyInLedger && !seenVoucherSignatures.has(docSig) && !seenVoucherSignatures.has(altDocSig)) {
          seenVoucherSignatures.add(docSig);
          seenVoucherSignatures.add(altDocSig);
          
          const txDate = parseDateSafely(inv.date);
          const dr = parseFloat(inv.total) || 0;
          const cr = 0;
          
          if (startLimit && txDate < startLimit) {
            startBal += (dr - cr);
          } else if ((!startLimit || txDate >= startLimit) && (!endLimit || txDate <= endLimit)) {
            let matchesVoucherType = true;
            if (voucherTypeFilter && voucherTypeFilter !== "All") {
              matchesVoucherType = voucherTypeFilter.toLowerCase() === "sales";
            }
            let matchesEmployee = true;
            if (employeeFilter && employeeFilter !== "All") {
              matchesEmployee = inv.employee === employeeFilter;
            }
            
            if (matchesVoucherType && matchesEmployee) {
              const series = inv.seriesId ? state.getSeriesMaster().find(s => s.id === inv.seriesId) : null;
              const seriesType = series ? series.seriesType : "LOCAL";
              let salesTypeName = "Local Sales";
              if (seriesType === "INTERSTATE") salesTypeName = "IGST Sales";
              else if (seriesType === "NONTAXABLE") salesTypeName = "Non Taxable Sales";
              
              entriesList.push({
                txId: inv.id,
                date: inv.date,
                particulars: salesTypeName,
                narration: inv.narration || "",
                vType: "Sales",
                vNo: inv.voucherNo || inv.id,
                debit: dr,
                credit: cr,
                timestamp: txDate.getTime()
              });
            }
          }
        }
      }
    });

    let purchasesToScan = state.getPurchases() || [];
    if (context && context.purchasesByContactId) {
      const purSet = new Set();
      const canCid = state.getCanonicalAccountId(contact.id);
      if (canCid && context.purchasesByContactId.has(canCid)) {
        context.purchasesByContactId.get(canCid).forEach(p => purSet.add(p));
      }
      if (context.purchasesByContactId.has(contact.id)) {
        context.purchasesByContactId.get(contact.id).forEach(p => purSet.add(p));
      }
      if (contact.name) {
        const upperName = contact.name.trim().toUpperCase();
        if (context.purchasesByContactName?.has(upperName)) {
          context.purchasesByContactName.get(upperName).forEach(p => purSet.add(p));
        }
      }
      purchasesToScan = Array.from(purSet);
    }

    purchasesToScan.forEach(pur => {
      if (!pur || pur.isCancelled) return;
      const isCreditPur = pur.payMode === "Credit" || (!pur.payMode && (pur.supplierId || pur.contactId) !== "__CASH__");
      if (!isCreditPur) return;
      const purContactId = (pur.supplierId || pur.contactId || "").split("::")[0];
      const isSameId = purContactId === contact.id || state.getCanonicalAccountId(purContactId) === state.getCanonicalAccountId(contact.id);
      const isSameName = contact.name && (pur.supplierName || pur.contactName) && (pur.supplierName || pur.contactName).trim().toUpperCase() === contact.name.trim().toUpperCase();
      
      if (isSameId || isSameName) {
        const vNo = pur.voucherNo || pur.id || pur.invoiceNo || "";
        const docSig = `Purchase::${vNo}::${pur.date}::0.00::${(pur.total || 0).toFixed(2)}`;
        const altDocSig = `Purchase::${vNo}`;
        
        const alreadyInLedger = entriesList.some(e => e.vNo === vNo || (e.txId && String(e.txId) === String(pur.id)));
        if (!alreadyInLedger && !seenVoucherSignatures.has(docSig) && !seenVoucherSignatures.has(altDocSig)) {
          seenVoucherSignatures.add(docSig);
          seenVoucherSignatures.add(altDocSig);
          
          const txDate = parseDateSafely(pur.date);
          const dr = 0;
          const cr = parseFloat(pur.total) || 0;
          
          if (startLimit && txDate < startLimit) {
            startBal += (dr - cr);
          } else if ((!startLimit || txDate >= startLimit) && (!endLimit || txDate <= endLimit)) {
            let matchesVoucherType = true;
            if (voucherTypeFilter && voucherTypeFilter !== "All") {
              matchesVoucherType = voucherTypeFilter.toLowerCase() === "purchase";
            }
            
            if (matchesVoucherType) {
              const series = pur.seriesId ? state.getSeriesMaster().find(s => s.id === pur.seriesId) : null;
              const seriesType = series ? series.seriesType : "LOCAL";
              let purTypeName = "Local Purchase";
              if (seriesType === "INTERSTATE") purTypeName = "IGST Purchase";
              else if (seriesType === "NONTAXABLE") purTypeName = "Non Taxable Purchase";
              
              entriesList.push({
                txId: pur.id,
                date: pur.date,
                particulars: purTypeName,
                narration: pur.narration || "",
                vType: "Purchase",
                vNo: vNo,
                debit: dr,
                credit: cr,
                timestamp: txDate.getTime()
              });
            }
          }
        }
      }
    });
  }

  

  const getVTypePriority = (vType) => {
    switch (vType) {
      case "Sales":
      case "Purchase":
        return 1;
      case "Sales Return":
      case "Purchase Return":
        return 2;
      case "Receipt":
      case "Payment":
        return 3;
      case "Contra":
        return 4;
      case "Journal":
        return 5;
      default:
        return 99;
    }
  };

  entriesList.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    
    const priorityA = getVTypePriority(a.vType);
    const priorityB = getVTypePriority(b.vType);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const vNoA = String(a.vNo || "");
    const vNoB = String(b.vNo || "");
    return vNoA.localeCompare(vNoB, undefined, { numeric: true, sensitivity: 'base' });
  });

  let running = startBal;
  const resultEntries = entriesList.map(e => {
    running += (e.debit - e.credit);
    
    let displayBal = Math.abs(running);
    let suffix = running >= 0 ? "Dr" : "Cr";
    if (balanceType === "Credit") {
      suffix = running <= 0 ? "Cr" : "Dr";
    }

    return {
      ...e,
      balance: displayBal,
      balanceSuffix: suffix
    };
  });

  let openingBalanceFormatted = Math.abs(startBal);
  let opSuffix = startBal >= 0 ? "Dr" : "Cr";
  if (balanceType === "Credit") {
    opSuffix = startBal <= 0 ? "Cr" : "Dr";
  }

  return {
    openingBalance: openingBalanceFormatted,
    openingBalanceSuffix: opSuffix,
    entries: resultEntries,
    balanceType
  };
}

function getBatchStockRecords(dateFrom = "", dateTo = "") {
  const materials = state.getMaterials();
  const purchases = state.getPurchases();
  const salesReturns = state.getSalesReturns();
  const stockAdjustments = state.getStockAdjustments() || [];
  const invoices = state.getInvoices();
  const purchaseReturns = state.getPurchaseReturns();

  const records = [];

  materials.forEach(m => {
    let batches = [...(m.batches || [])];
    if (batches.length === 0) {
      const opQty = (m.openingStock !== undefined && m.openingStock !== null && !isNaN(parseFloat(m.openingStock)))
        ? parseFloat(m.openingStock)
        : (parseFloat(m.stock) || 0);
      batches.push({
        batchNo: String(m.landingCost || 350),
        landingCost: m.landingCost || 350,
        openingStock: opQty
      });
    }
    batches.forEach(b => {
      let openingStock = parseFloat(b.openingStock) || 0;
      let receiptStock = 0;
      let issuedStock = 0;

      // 1. Purchases
      purchases.forEach(pur => {
        if (pur.isCancelled) return;
        (pur.items || []).forEach(item => {
          if (item.materialId === m.id && String(item.batchNo || item.price || m.landingCost || 350) === String(b.batchNo)) {
            const qty = parseFloat(item.quantity) || 0;
            if (dateFrom && pur.date && pur.date < dateFrom) {
              openingStock += qty;
            } else if ((!dateFrom || (pur.date && pur.date >= dateFrom)) && (!dateTo || (pur.date && pur.date <= dateTo))) {
              receiptStock += qty;
            }
          }
        });
      });

      // 2. Sales Returns
      salesReturns.forEach(sr => {
        (sr.items || []).forEach(item => {
          if (item.materialId === m.id && String(item.batchNo || m.batches[0]?.batchNo || m.landingCost || 350) === String(b.batchNo)) {
            const qty = parseFloat(item.quantity) || 0;
            if (dateFrom && sr.date && sr.date < dateFrom) {
              openingStock += qty;
            } else if ((!dateFrom || (sr.date && sr.date >= dateFrom)) && (!dateTo || (sr.date && sr.date <= dateTo))) {
              receiptStock += qty;
            }
          }
        });
      });

      // 3. Invoices (Sales)
      invoices.forEach(inv => {
        if (inv.isCancelled) return;
        (inv.items || []).forEach(item => {
          if (item.materialId === m.id && String(item.batchNo || m.batches[0]?.batchNo || m.landingCost || 350) === String(b.batchNo)) {
            const qty = parseFloat(item.quantity) || 0;
            if (dateFrom && inv.date && inv.date < dateFrom) {
              openingStock -= qty;
            } else if ((!dateFrom || (inv.date && inv.date >= dateFrom)) && (!dateTo || (inv.date && inv.date <= dateTo))) {
              issuedStock += qty;
            }
          }
        });
      });

      // 4. Purchase Returns
      purchaseReturns.forEach(pr => {
        (pr.items || []).forEach(item => {
          if (item.materialId === m.id && String(item.batchNo || m.batches[0]?.batchNo || m.landingCost || 350) === String(b.batchNo)) {
            const qty = parseFloat(item.quantity) || 0;
            if (dateFrom && pr.date && pr.date < dateFrom) {
              openingStock -= qty;
            } else if ((!dateFrom || (pr.date && pr.date >= dateFrom)) && (!dateTo || (pr.date && pr.date <= dateTo))) {
              issuedStock += qty;
            }
          }
        });
      });

      // 5. Stock Adjustments
      stockAdjustments.forEach(adj => {
        if (adj.isCancelled) return;
        (adj.items || []).forEach(item => {
          if (item.materialId === m.id) {
            const bNo = String(item.batchNo || m.batches[0]?.batchNo || m.landingCost || 350);
            if (bNo === String(b.batchNo)) {
              const qty = parseFloat(item.qty) || 0;
              const isAdd = item.stockAffect === "Add (+)";
              const adjDate = adj.date || adj.createdAt;
              if (dateFrom && adjDate && adjDate < dateFrom) {
                if (isAdd) openingStock += qty;
                else openingStock -= qty;
              } else if ((!dateFrom || (adjDate && adjDate >= dateFrom)) && (!dateTo || (adjDate && adjDate <= dateTo))) {
                if (isAdd) receiptStock += qty;
                else issuedStock += qty;
              }
            }
          }
        });
      });

      const closingStock = openingStock + receiptStock - issuedStock;
      const cost = parseFloat(b.landingCost) || 0;
      const val = closingStock * cost;

      records.push({
        materialId: m.id,
        name: m.name || "",
        code: m.code || "",
        batchNo: String(b.batchNo || ""),
        unit: m.unit || "Bags",
        openingStock,
        receiptStock,
        issuedStock,
        closingStock,
        cost,
        val
      });
    });
  });

  return records;
}

function sortBatchRecords(records, col, dir) {
  return [...records].sort((a, b) => {
    let cmp = 0;
    if (col === "name") {
      cmp = (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });
      if (cmp === 0) cmp = (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: "base" });
      if (cmp === 0) cmp = (a.batchNo || "").localeCompare(b.batchNo || "", undefined, { numeric: true, sensitivity: "base" });
    } else if (col === "code") {
      cmp = (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: "base" });
      if (cmp === 0) cmp = (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });
    } else if (col === "batch") {
      cmp = (a.batchNo || "").localeCompare(b.batchNo || "", undefined, { numeric: true, sensitivity: "base" });
    } else if (col === "opening") {
      cmp = a.openingStock - b.openingStock;
    } else if (col === "receipt") {
      cmp = a.receiptStock - b.receiptStock;
    } else if (col === "issued") {
      cmp = a.issuedStock - b.issuedStock;
    } else if (col === "closing") {
      cmp = a.closingStock - b.closingStock;
    } else if (col === "cost") {
      cmp = a.cost - b.cost;
    } else if (col === "val") {
      cmp = a.val - b.val;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function renderBatchStockHtml() {
  const records = getBatchStockRecords();
  const sortedRecords = sortBatchRecords(records, "name", "asc");

  let grandTotalOpening = 0;
  let grandTotalReceipt = 0;
  let grandTotalIssued = 0;
  let grandTotalClosing = 0;
  let grandTotalVal = 0;

  sortedRecords.forEach(r => {
    grandTotalOpening += r.openingStock;
    grandTotalReceipt += r.receiptStock;
    grandTotalIssued += r.issuedStock;
    grandTotalClosing += r.closingStock;
    grandTotalVal += r.val;
  });

  return `
    <div style="background-color: var(--card-bg); padding: 0.5rem; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.5rem; height: 100%; box-sizing: border-box; flex: 1 1 0; min-height: 0; overflow: hidden;">
      <!-- Toolbar: Title, Live Search Input & Actions -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; background:#f8fafc; padding:6px 10px; border:1px solid #e2e8f0; border-radius:4px; flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <h3 style="margin:0; font-family: var(--font-header); font-weight:700; color:#1e3b8b; font-size:1.05rem; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-boxes-stacked" style="color:#2563eb;"></i> Batch-Wise Stock Register
          </h3>
          <!-- Search Bar -->
          <div style="position:relative; display:flex; align-items:center;">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:8px; color:#94a3b8; font-size:0.75rem; pointer-events:none;"></i>
            <input type="text" id="batch-stock-search-input" placeholder="Search product, code, or batch..." 
              style="padding:4px 24px 4px 24px; font-size:0.78rem; border:1px solid #94a3b8; border-radius:4px; width:220px; outline:none; background:white;" />
            <button type="button" id="batch-stock-search-clear" title="Clear Search" 
              style="position:absolute; right:6px; background:none; border:none; color:#94a3b8; cursor:pointer; font-size:0.85rem; display:none; padding:2px;">&times;</button>
          </div>

          <!-- Date Range Filter -->
          <div style="background:#e2e8f0; font-weight:bold; padding:2px 8px; border:1px solid #cbd5e1; border-radius:4px; display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#0f172a;">
            <span>Period:</span>
            <span>From</span>
            <input type="date" id="batch-date-from" style="padding:1px 3px; font-size:0.75rem; background:white; color:black; width:120px; border:1px solid #94a3b8; border-radius:2px; height:20px;" value="${state.getActiveFinancialYearStartDate() || '2026-04-01'}">
            <span>To</span>
            <input type="date" id="batch-date-to" style="padding:1px 3px; font-size:0.75rem; background:white; color:black; width:120px; border:1px solid #94a3b8; border-radius:2px; height:20px;" value="${new Date().toISOString().split('T')[0]}">
          </div>

          <span id="batch-stock-count-badge" style="font-size:0.75rem; color:#475569; font-weight:600; background:#e2e8f0; padding:3px 8px; border-radius:12px;">
            Showing ${sortedRecords.length} of ${records.length} batches
          </span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button class="btn btn-primary" id="btn-batch-stock-merge" style="font-size:0.78rem; padding: 4px 10px; font-weight:600; background:#2563eb; color:white; border:none; border-radius:3px; cursor:pointer;"><i class="fa-solid fa-code-merge"></i> Merge Batches</button>
          <button class="btn btn-secondary" onclick="window.print()" style="font-size:0.78rem; padding: 4px 10px; font-weight:600;"><i class="fa-solid fa-print"></i> Print Report</button>
        </div>
      </div>
      
      <!-- Stock Status Filter Ribbon -->
      <div style="display:flex; gap:12px; font-weight:600; font-size:0.78rem; background:#d9e1f2; padding:5px 8px; border:1px solid #8faadc; border-radius:4px; flex-wrap:wrap; align-items:center; color:#0f172a; flex-shrink:0;">
        <span style="font-weight:700; color:#1e3b8b;">Stock Status Filter:</span>
        <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="batch-chk-available"> Show Available Stock only</label>
        <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="batch-chk-unavailable"> Show Unavailable Stock only</label>
        <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="batch-chk-negative"> Show Negative Stock only</label>
        <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="batch-chk-non-zero"> Show Available & Negative Stock (Excluding Zero)</label>
      </div>
      
      <div style="flex: 1 1 0; min-height: 0; overflow: auto; border: 1px solid #cbd5e1; border-radius: 4px;">
        <table id="batch-stock-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:0.78rem; color:black;">
          <thead style="position:sticky; top:0; z-index:10;">
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569; user-select:none;">
              <th class="batch-sort-th" data-col="name" style="padding:6px 8px; cursor:pointer; white-space:nowrap;">Product Name <span class="sort-icon" style="font-size:0.7rem; color:#93c5fd;">▲</span></th>
              <th class="batch-sort-th" data-col="code" style="padding:6px 8px; cursor:pointer; white-space:nowrap; width:90px;">Code/Model <span class="sort-icon" style="font-size:0.7rem; color:#64748b;">⇅</span></th>
              <th class="batch-sort-th" data-col="batch" style="padding:6px 8px; cursor:pointer; white-space:nowrap; width:100px;">Batch Name <span class="sort-icon" style="font-size:0.7rem; color:#64748b;">⇅</span></th>
              <th class="batch-sort-th" data-col="opening" style="padding:6px 8px; text-align:right; cursor:pointer; white-space:nowrap; width:90px;" title="Opening Stock">Opening <span class="sort-icon" style="font-size:0.7rem; color:#64748b;">⇅</span></th>
              <th class="batch-sort-th" data-col="receipt" style="padding:6px 8px; text-align:right; cursor:pointer; white-space:nowrap; width:95px;" title="Receipt Stock (Purchase, Sales Return, Stock Adjustment)">Receipt <span class="sort-icon" style="font-size:0.7rem; color:#64748b;">⇅</span></th>
              <th class="batch-sort-th" data-col="issued" style="padding:6px 8px; text-align:right; cursor:pointer; white-space:nowrap; width:95px;" title="Issued Stock (Sales, Purchase Return, Stock Adjustment)">Issued <span class="sort-icon" style="font-size:0.7rem; color:#64748b;">⇅</span></th>
              <th class="batch-sort-th" data-col="closing" style="padding:6px 8px; text-align:right; cursor:pointer; white-space:nowrap; width:95px;">Closing Stock <span class="sort-icon" style="font-size:0.7rem; color:#64748b;">⇅</span></th>
              <th class="batch-sort-th" data-col="cost" style="padding:6px 8px; text-align:right; cursor:pointer; white-space:nowrap; width:90px;">Landing Cost <span class="sort-icon" style="font-size:0.7rem; color:#64748b;">⇅</span></th>
              <th class="batch-sort-th" data-col="val" style="padding:6px 8px; text-align:right; cursor:pointer; white-space:nowrap; width:95px;">Value <span class="sort-icon" style="font-size:0.7rem; color:#64748b;">⇅</span></th>
            </tr>
          </thead>
          <tbody id="batch-stock-tbody">
            ${renderBatchStockRowsHtml(sortedRecords)}
          </tbody>
          <tfoot id="batch-stock-tfoot" style="position:sticky; bottom:0; z-index:10; background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; box-shadow: 0 -2px 5px rgba(0,0,0,0.05);">
            <tr>
              <td colspan="3" style="padding:6px 8px; text-align:right; font-weight:800; color:#0f172a;">GRAND TOTAL</td>
              <td id="batch-total-opening" style="padding:6px 8px; text-align:right; font-weight:800; color:#0f172a;">${grandTotalOpening.toFixed(2)}</td>
              <td id="batch-total-receipt" style="padding:6px 8px; text-align:right; font-weight:800; color:#16a34a;">${grandTotalReceipt.toFixed(2)}</td>
              <td id="batch-total-issued" style="padding:6px 8px; text-align:right; font-weight:800; color:#ef4444;">${grandTotalIssued.toFixed(2)}</td>
              <td id="batch-total-closing" style="padding:6px 8px; text-align:right; font-weight:800; color:#0f172a;">${grandTotalClosing.toFixed(2)}</td>
              <td></td>
              <td id="batch-total-val" style="padding:6px 8px; text-align:right; font-weight:800; color:#1e40af;">\u20B9${grandTotalVal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="font-size:0.72rem; color:#64748b; font-style:italic; flex-shrink:0;">
        <i class="fa-solid fa-circle-info"></i> Tip: Double-click or press Enter on any row to open the Item Wise Stock Register drill-down. Click any column header to sort.
      </div>
    </div>
  `;
}

function renderBatchStockRowsHtml(records) {
  if (!records || records.length === 0) {
    return `
      <tr>
        <td colspan="9" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">
          No matching batch stock inventory records found.
        </td>
      </tr>
    `;
  }

  return records.map((r, idx) => {
    const isNegOpening = r.openingStock < 0;
    const isNegClosing = r.closingStock < 0;
    return `
    <tr class="batch-stock-row-clickable" data-name="${r.name}" data-code="${r.code}" data-batch="${r.batchNo}" 
      style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; cursor: pointer; outline:none;" 
      tabindex="0" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}'">
      <td style="padding:4px 8px;"><strong>${r.name}</strong></td>
      <td style="padding:4px 8px;"><code style="background-color:#e2e8f0; padding:1px 4px; font-weight:700; border-radius:2px; font-size:0.75rem;">${r.code}</code></td>
      <td style="padding:4px 8px; font-weight:bold; color:#1e3b8b;">Batch ${r.batchNo}</td>
      <td style="padding:4px 8px; text-align:right; ${isNegOpening ? 'color:#dc2626; font-weight:bold;' : ''}">${r.openingStock.toFixed(2)}</td>
      <td style="padding:4px 8px; text-align:right; color:#16a34a; font-weight:600;">${r.receiptStock.toFixed(2)}</td>
      <td style="padding:4px 8px; text-align:right; color:#ef4444; font-weight:600;">${r.issuedStock.toFixed(2)}</td>
      <td style="padding:4px 8px; text-align:right; font-weight:700; color:${isNegClosing ? '#dc2626' : '#0f172a'};">${r.closingStock.toFixed(2)} ${r.unit}</td>
      <td style="padding:4px 8px; text-align:right;">\u20B9${r.cost.toFixed(2)}</td>
      <td style="padding:4px 8px; text-align:right; font-weight:700; color:#1e40af;">\u20B9${r.val.toFixed(2)}</td>
    </tr>
  `;
  }).join("");
}

export function showBatchStockRegisterModal(container) {
  const root = document.getElementById("modal-container-root");
  const allRecords = getBatchStockRecords();
  let currentSortCol = "name";
  let currentSortDir = "asc";
  let currentSearchQuery = "";

  const reportHTML = renderBatchStockHtml();

  root.innerHTML = `
    <div class="modal-overlay active" id="batch-stock-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1300px; width: 95vw; height:88vh; background-color:#cbd5e1; color:#0f172a; padding:8px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:6px; overflow:hidden;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:6px 10px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:8px; font-size:0.9rem;"><i class="fa-solid fa-boxes-stacked"></i> STOCK REGISTER (BATCH WISE)</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.3rem; cursor:pointer; line-height:1;" id="batch-stock-close-x-btn">&times;</button>
        </div>

        <!-- Content Area -->
        <div style="flex:1 1 0; min-height:0; background:white; border:1px solid #94a3b8; border-radius:2px; padding: 6px; display:flex; flex-direction:column; overflow:hidden;">
          ${reportHTML}
        </div>

        <!-- Footer Buttons -->
        <div style="display:flex; justify-content:flex-end; gap:8px; background:#b4c6e7; padding:4px 8px; border:1px solid #8faadc; border-radius:2px; flex-shrink:0;">
          <button type="button" class="btn btn-secondary" onclick="window.print()" style="font-weight:bold; height:24px; font-size:0.75rem; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 12px;">Print</button>
          <button type="button" class="btn btn-secondary" id="btn-batch-stock-close" style="font-weight:bold; height:24px; font-size:0.75rem; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 12px;">Close</button>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("batch-stock-overlay");
  const close = () => {
    if (overlay) overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("batch-stock-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-batch-stock-close").addEventListener("click", close);

  const searchInput = document.getElementById("batch-stock-search-input");
  const searchClearBtn = document.getElementById("batch-stock-search-clear");
  const countBadge = document.getElementById("batch-stock-count-badge");
  const tbody = document.getElementById("batch-stock-tbody");

  const btnMergeBatch = document.getElementById("btn-batch-stock-merge");
  if (btnMergeBatch) {
    btnMergeBatch.addEventListener("click", () => {
      import("./inventory.js").then(m => {
        m.showMergeBatchesModal(null, null, () => {
          updateTableDisplay();
        });
      });
    });
  }

  const bindRowEvents = () => {
    overlay.querySelectorAll(".batch-stock-row-clickable").forEach(row => {
      const handleOpen = () => {
        const name = row.getAttribute("data-name");
        const code = row.getAttribute("data-code");
        const batch = row.getAttribute("data-batch");
        import("./inventory.js").then(m => {
          m.showItemWiseStockRegisterModal(container, name, code, batch);
        });
      };
      row.addEventListener("dblclick", handleOpen);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleOpen();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = row.nextElementSibling;
          if (next && next.classList.contains("batch-stock-row-clickable")) next.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = row.previousElementSibling;
          if (prev && prev.classList.contains("batch-stock-row-clickable")) {
            prev.focus();
          } else if (searchInput) {
            searchInput.focus();
          }
        }
      });
    });
  };

  const updateTableDisplay = () => {
    const dFrom = document.getElementById("batch-date-from")?.value || "";
    const dTo = document.getElementById("batch-date-to")?.value || "";

    // 1. Recalculate records for date range
    const rangeRecords = getBatchStockRecords(dFrom, dTo);

    // 2. Sort records
    const sorted = sortBatchRecords(rangeRecords, currentSortCol, currentSortDir);

    // 3. Filter records
    const showAvailable = document.getElementById("batch-chk-available")?.checked || false;
    const showUnavailable = document.getElementById("batch-chk-unavailable")?.checked || false;
    const showNegative = document.getElementById("batch-chk-negative")?.checked || false;
    const showNonZero = document.getElementById("batch-chk-non-zero")?.checked || false;

    const q = (currentSearchQuery || "").trim().toLowerCase();
    const filtered = sorted.filter(r => {
      const closing = r.closingStock;

      if (showAvailable && closing <= 0) return false;
      if (showUnavailable && closing !== 0) return false;
      if (showNegative && closing >= 0) return false;
      if (showNonZero && closing === 0) return false;

      if (!q) return true;
      const nameMatch = (r.name || "").toLowerCase().includes(q);
      const codeMatch = (r.code || "").toLowerCase().includes(q);
      const batchMatch = (r.batchNo || "").toLowerCase().includes(q) || ("batch " + (r.batchNo || "")).toLowerCase().includes(q);
      return nameMatch || codeMatch || batchMatch;
    });

    // 4. Render tbody
    tbody.innerHTML = renderBatchStockRowsHtml(filtered);

    // 5. Calculate and render Totals
    let totOp = 0, totRec = 0, totIss = 0, totClo = 0, totVal = 0;
    filtered.forEach(r => {
      totOp += r.openingStock;
      totRec += r.receiptStock;
      totIss += r.issuedStock;
      totClo += r.closingStock;
      totVal += r.val;
    });

    const elOp = document.getElementById("batch-total-opening");
    const elRec = document.getElementById("batch-total-receipt");
    const elIss = document.getElementById("batch-total-issued");
    const elClo = document.getElementById("batch-total-closing");
    const elVal = document.getElementById("batch-total-val");

    if (elOp) {
      elOp.textContent = totOp.toFixed(2);
      elOp.style.color = totOp < 0 ? '#dc2626' : '#0f172a';
    }
    if (elRec) elRec.textContent = totRec.toFixed(2);
    if (elIss) elIss.textContent = totIss.toFixed(2);
    if (elClo) {
      elClo.textContent = totClo.toFixed(2);
      elClo.style.color = totClo < 0 ? '#dc2626' : '#0f172a';
    }
    if (elVal) elVal.textContent = `\u20B9${totVal.toFixed(2)}`;

    // 6. Update badge
    if (countBadge) {
      countBadge.textContent = `Showing ${filtered.length} of ${rangeRecords.length} batches`;
    }

    // 6. Update sort column headers
    overlay.querySelectorAll(".batch-sort-th").forEach(th => {
      const col = th.getAttribute("data-col");
      const icon = th.querySelector(".sort-icon");
      if (icon) {
        if (col === currentSortCol) {
          icon.textContent = currentSortDir === "asc" ? "▲" : "▼";
          icon.style.color = "#93c5fd";
        } else {
          icon.textContent = "⇅";
          icon.style.color = "#64748b";
        }
      }
    });

    // 7. Show/Hide search clear button
    if (searchClearBtn) {
      searchClearBtn.style.display = q ? "inline-block" : "none";
    }

    // 8. Re-bind row events
    bindRowEvents();
  };

  // Initial event binding for initial rows
  bindRowEvents();

  // Search input events
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value;
      updateTableDisplay();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const firstRow = tbody.querySelector(".batch-stock-row-clickable");
        if (firstRow) firstRow.focus();
      } else if (e.key === "Escape") {
        if (searchInput.value) {
          e.stopPropagation();
          searchInput.value = "";
          currentSearchQuery = "";
          updateTableDisplay();
        }
      }
    });

    // Auto-focus search input
    setTimeout(() => {
      searchInput.focus();
    }, 80);
  }

  // Clear search button
  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      currentSearchQuery = "";
      updateTableDisplay();
    });
  }

  // Batch Stock Status Checkbox events
  const chkBatchAvail = document.getElementById("batch-chk-available");
  const chkBatchUnavail = document.getElementById("batch-chk-unavailable");
  const chkBatchNeg = document.getElementById("batch-chk-negative");
  const chkBatchNonZero = document.getElementById("batch-chk-non-zero");

  if (chkBatchAvail) {
    chkBatchAvail.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (chkBatchUnavail) chkBatchUnavail.checked = false;
        if (chkBatchNeg) chkBatchNeg.checked = false;
        if (chkBatchNonZero) chkBatchNonZero.checked = false;
      }
      updateTableDisplay();
    });
  }

  if (chkBatchUnavail) {
    chkBatchUnavail.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (chkBatchAvail) chkBatchAvail.checked = false;
        if (chkBatchNeg) chkBatchNeg.checked = false;
        if (chkBatchNonZero) chkBatchNonZero.checked = false;
      }
      updateTableDisplay();
    });
  }

  if (chkBatchNeg) {
    chkBatchNeg.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (chkBatchAvail) chkBatchAvail.checked = false;
        if (chkBatchUnavail) chkBatchUnavail.checked = false;
        if (chkBatchNonZero) chkBatchNonZero.checked = false;
      }
      updateTableDisplay();
    });
  }

  if (chkBatchNonZero) {
    chkBatchNonZero.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (chkBatchAvail) chkBatchAvail.checked = false;
        if (chkBatchUnavail) chkBatchUnavail.checked = false;
        if (chkBatchNeg) chkBatchNeg.checked = false;
      }
      updateTableDisplay();
    });
  }

  // Date Range Filter events
  const dateFromEl = document.getElementById("batch-date-from");
  const dateToEl = document.getElementById("batch-date-to");

  if (dateFromEl) {
    dateFromEl.addEventListener("change", updateTableDisplay);
    dateFromEl.addEventListener("input", updateTableDisplay);
  }
  if (dateToEl) {
    dateToEl.addEventListener("change", updateTableDisplay);
    dateToEl.addEventListener("input", updateTableDisplay);
  }

  // Column header sort click events
  overlay.querySelectorAll(".batch-sort-th").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-col");
      if (currentSortCol === col) {
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortCol = col;
        currentSortDir = "asc";
      }
      updateTableDisplay();
    });
  });

  const escHandler = (e) => {
    if (e.key === "Escape") {
      if (document.activeElement === searchInput && searchInput.value) {
        searchInput.value = "";
        currentSearchQuery = "";
        updateTableDisplay();
        return;
      }
      close();
      window.removeEventListener("keydown", escHandler);
    } else if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }
  };
  window.addEventListener("keydown", escHandler);
}

export function openVoucherOrInvoice(refOrId, container, onSaveCallback = null) {
  if (!refOrId) return;
  const refClean = String(refOrId).trim();
  const tx = state.getTransactions().find(t => 
    String(t.id).toLowerCase() === refClean.toLowerCase() || 
    String(t.reference).toLowerCase() === refClean.toLowerCase()
  );

  if (!tx) {
    // If not found in transactions list, try finding directly by document ID in various lists
    const inv = state.getInvoices().find(i => 
      String(i.id).toLowerCase() === refClean.toLowerCase() || 
      (i.voucherNo && String(i.voucherNo).toLowerCase() === refClean.toLowerCase())
    );
    if (inv) {
      import("./transactions.js").then(m => {
        m.showInvoiceBuilderModal(container, state.getContacts().filter(c => c.type === 'customer' || c.listInCustomerList === true), state.getMaterials(), () => {
          if (onSaveCallback) onSaveCallback();
        }, inv);
      });
      return;
    }

    const pur = state.getPurchases().find(p => 
      String(p.id).toLowerCase() === refClean.toLowerCase() ||
      (p.invoiceNo && String(p.invoiceNo).toLowerCase() === refClean.toLowerCase()) ||
      (p.voucherNo && String(p.voucherNo).toLowerCase() === refClean.toLowerCase())
    );
    if (pur) {
      import("./transactions.js").then(m => {
        m.showRecordPurchaseModal(container, pur, () => {
          if (onSaveCallback) onSaveCallback();
        });
      });
      return;
    }

    const pr = state.getPurchaseReturns().find(p => 
      String(p.id).toLowerCase() === refClean.toLowerCase() ||
      (p.voucherNo && String(p.voucherNo).toLowerCase() === refClean.toLowerCase())
    );
    if (pr) {
      import("./transactions.js").then(m => {
        m.showPurchaseReturnModal(container, pr, () => {
          if (onSaveCallback) onSaveCallback();
        });
      });
      return;
    }

    const sr = state.getSalesReturns().find(s => 
      String(s.id).toLowerCase() === refClean.toLowerCase() ||
      (s.voucherNo && String(s.voucherNo).toLowerCase() === refClean.toLowerCase())
    );
    if (sr) {
      import("./transactions.js").then(m => {
        m.showSalesReturnModal(container, sr, () => {
          if (onSaveCallback) onSaveCallback();
        });
      });
      return;
    }
    return;
  }

  const ref = tx.reference || "";
  const refLower = ref.toLowerCase();

  if (refLower.startsWith("stock adj")) {
    const refNum = refLower.replace("stock adj:", "").trim();
    import("./transactions.js").then(m => {
      m.showStockAdjustWizard(container, refNum);
    });
    return;
  }
  
  const extractNum = (str) => {
    if (!str) return null;
    const m = String(str).match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  };
  const targetNum = extractNum(tx.reference || tx.id);

  // Search Collections by exact key/reference or number fallback
  let matchType = null;
  let matchDoc = null;

  // EXACT Match first to prevent fuzzy collisions (e.g., IPR matching PR)
  const exactPR = state.getPurchaseReturns().find(p => String(p.id).toLowerCase() === refLower || (p.voucherNo && String(p.voucherNo).toLowerCase() === refLower) || refLower === `debit note ${String(p.id).toLowerCase()}` || refLower === `purchase return ${String(p.id).toLowerCase()}` || refLower === `debit note ${String(p.voucherNo).toLowerCase()}` || refLower === `purchase return ${String(p.voucherNo).toLowerCase()}`);
  if (exactPR) { matchType = "purchase-return"; matchDoc = exactPR; }

  if (!matchDoc) {
    const exactSR = state.getSalesReturns().find(s => String(s.id).toLowerCase() === refLower || (s.voucherNo && String(s.voucherNo).toLowerCase() === refLower) || refLower === `credit note ${String(s.id).toLowerCase()}` || refLower === `sales return ${String(s.id).toLowerCase()}` || refLower === `credit note ${String(s.voucherNo).toLowerCase()}` || refLower === `sales return ${String(s.voucherNo).toLowerCase()}`);
    if (exactSR) { matchType = "sales-return"; matchDoc = exactSR; }
  }

  if (!matchDoc) {
    const exactPur = state.getPurchases().find(p => String(p.id).toLowerCase() === refLower || (p.voucherNo && String(p.voucherNo).toLowerCase() === refLower) || (p.invoiceNo && String(p.invoiceNo).toLowerCase() === refLower));
    if (exactPur) { matchType = "purchase"; matchDoc = exactPur; }
  }

  if (!matchDoc) {
    const exactInv = state.getInvoices().find(i => String(i.id).toLowerCase() === refLower || (i.voucherNo && String(i.voucherNo).toLowerCase() === refLower));
    if (exactInv) { matchType = "invoice"; matchDoc = exactInv; }
  }

  if (!matchDoc) {
    // 1. Check Purchase Return
  const prMatch = state.getPurchaseReturns().find(p => 
    String(p.id).toLowerCase() === String(tx.id).toLowerCase() || 
    (p.voucherNo && String(p.voucherNo).toLowerCase() === String(tx.reference).toLowerCase()) ||
    (p.id && String(tx.reference).toLowerCase().includes(String(p.id).toLowerCase())) ||
    (targetNum !== null && (extractNum(p.id) === targetNum || extractNum(p.voucherNo) === targetNum))
  );
  if (prMatch && (refLower.includes("return") || refLower.includes("debit") || refLower.includes("pr") || refLower.includes("dn"))) {
    matchType = "purchase-return";
    matchDoc = prMatch;
  }

  // 2. Check Sales Return
  if (!matchDoc) {
    const srMatch = state.getSalesReturns().find(s => 
      String(s.id).toLowerCase() === String(tx.id).toLowerCase() || 
      (s.voucherNo && String(s.voucherNo).toLowerCase() === String(tx.reference).toLowerCase()) ||
      (s.id && String(tx.reference).toLowerCase().includes(String(s.id).toLowerCase())) ||
      (targetNum !== null && (extractNum(s.id) === targetNum || extractNum(s.voucherNo) === targetNum))
    );
    if (srMatch && (refLower.includes("return") || refLower.includes("credit") || refLower.includes("sr") || refLower.includes("cn"))) {
      matchType = "sales-return";
      matchDoc = srMatch;
    }
  }

  // 3. Check Purchase
  if (!matchDoc) {
    const purMatch = state.getPurchases().find(p => 
      String(p.id).toLowerCase() === String(tx.id).toLowerCase() || 
      (p.voucherNo && String(p.voucherNo).toLowerCase() === String(tx.reference).toLowerCase()) ||
      (p.refNo && String(p.refNo).toLowerCase() === String(tx.reference).toLowerCase()) ||
      (p.invoiceNo && String(p.invoiceNo).toLowerCase() === String(tx.reference).toLowerCase()) ||
      (targetNum !== null && (extractNum(p.id) === targetNum || extractNum(p.voucherNo) === targetNum || extractNum(p.refNo) === targetNum || extractNum(p.invoiceNo) === targetNum))
    );
    if (purMatch && (refLower.includes("purchase") || refLower.includes("bill") || refLower.includes("pur") || (refLower.startsWith("p") && !refLower.startsWith("pm") && !refLower.startsWith("pay") && !refLower.startsWith("pr")))) {
      matchType = "purchase";
      matchDoc = purMatch;
    }
  }

  // 4. Check Sales Invoice
  if (!matchDoc) {
    const invMatch = state.getInvoices().find(i => 
      String(i.id).toLowerCase() === String(tx.id).toLowerCase() || 
      (i.voucherNo && String(i.voucherNo).toLowerCase() === String(tx.reference).toLowerCase()) ||
      (i.refNo && String(i.refNo).toLowerCase() === String(tx.reference).toLowerCase()) ||
      (targetNum !== null && (extractNum(i.id) === targetNum || extractNum(i.voucherNo) === targetNum || extractNum(i.refNo) === targetNum))
    );
    if (invMatch && (refLower.includes("sales") || refLower.includes("invoice") || refLower.includes("inv") || refLower.includes("sls") || refLower.startsWith("sa"))) {
      matchType = "invoice";
      matchDoc = invMatch;
    }
  }

  // Absolute fallback: search all collections matching targetNum without prefix restrictions
  if (!matchDoc && targetNum !== null) {
    // If voucher type matches standard returns
    if (refLower.includes("return") || refLower.includes("debit") || refLower.includes("pr") || refLower.includes("dn")) {
      const p = state.getPurchaseReturns().find(prDoc => extractNum(prDoc.id) === targetNum || extractNum(prDoc.voucherNo) === targetNum);
      if (p) { matchType = "purchase-return"; matchDoc = p; }
    }
    if (!matchDoc && (refLower.includes("return") || refLower.includes("credit") || refLower.includes("sr") || refLower.includes("cn"))) {
      const s = state.getSalesReturns().find(srDoc => extractNum(srDoc.id) === targetNum || extractNum(srDoc.voucherNo) === targetNum);
      if (s) { matchType = "sales-return"; matchDoc = s; }
    }
    if (!matchDoc && (refLower.includes("purchase") || refLower.includes("bill") || refLower.includes("pur") || (refLower.startsWith("p") && !refLower.startsWith("pm") && !refLower.startsWith("pay") && !refLower.startsWith("pr")))) {
      const p = state.getPurchases().find(purDoc => extractNum(purDoc.id) === targetNum || extractNum(purDoc.voucherNo) === targetNum || extractNum(purDoc.refNo) === targetNum || extractNum(purDoc.invoiceNo) === targetNum);
      if (p) { matchType = "purchase"; matchDoc = p; }
    }
    if (!matchDoc && (refLower.includes("sales") || refLower.includes("invoice") || refLower.includes("inv") || refLower.includes("sls") || refLower.startsWith("sa"))) {
      const i = state.getInvoices().find(invDoc => extractNum(invDoc.id) === targetNum || extractNum(invDoc.voucherNo) === targetNum || extractNum(invDoc.refNo) === targetNum);
      if (i) { matchType = "invoice"; matchDoc = i; }
    }
  }

  }

  // If still not matched, do final search by exact matches
  if (!matchDoc) {
    const pr = state.getPurchaseReturns().find(p => String(p.id).toLowerCase() === refLower || (p.voucherNo && String(p.voucherNo).toLowerCase() === refLower));
    if (pr) { matchType = "purchase-return"; matchDoc = pr; }
  }
  if (!matchDoc) {
    const sr = state.getSalesReturns().find(s => String(s.id).toLowerCase() === refLower || (s.voucherNo && String(s.voucherNo).toLowerCase() === refLower));
    if (sr) { matchType = "sales-return"; matchDoc = sr; }
  }
  if (!matchDoc) {
    const pur = state.getPurchases().find(p => String(p.id).toLowerCase() === refLower || (p.voucherNo && String(p.voucherNo).toLowerCase() === refLower) || (p.invoiceNo && String(p.invoiceNo).toLowerCase() === refLower));
    if (pur) { matchType = "purchase"; matchDoc = pur; }
  }
  if (!matchDoc) {
    const inv = state.getInvoices().find(i => String(i.id).toLowerCase() === refLower || (i.voucherNo && String(i.voucherNo).toLowerCase() === refLower));
    if (inv) { matchType = "invoice"; matchDoc = inv; }
  }

  // Launch Modals if document matches
  if (matchDoc) {
    if (matchType === "purchase-return") {
      import("./transactions.js").then(m => {
        m.showPurchaseReturnModal(container, matchDoc, () => {
          if (onSaveCallback) onSaveCallback();
        });
      });
      return;
    } else if (matchType === "sales-return") {
      import("./transactions.js").then(m => {
        m.showSalesReturnModal(container, matchDoc, () => {
          if (onSaveCallback) onSaveCallback();
        });
      });
      return;
    } else if (matchType === "purchase") {
      import("./transactions.js").then(m => {
        m.showRecordPurchaseModal(container, matchDoc, () => {
          if (onSaveCallback) onSaveCallback();
        });
      });
      return;
    } else if (matchType === "invoice") {
      import("./transactions.js").then(m => {
        m.showInvoiceBuilderModal(
          container,
          state.getContacts().filter(c => c.type === 'customer' || c.listInCustomerList === true),
          state.getMaterials(),
          () => { if (onSaveCallback) onSaveCallback(); },
          matchDoc
        );
      });
      return;
    }
  }

  // Fallback to Voucher entries
  if (refLower.startsWith("rc-") || refLower.includes("receipt") || refLower.includes("rcpt") || refLower.startsWith("r")) {
    import("./vouchers.js").then(m => {
      m.showUnifiedSplitVoucherModal(container, tx, "receipt");
    });
  } else if ((refLower.startsWith("pay-") || refLower.includes("payment") || refLower.startsWith("p")) && !refLower.startsWith("pr")) {
    import("./vouchers.js").then(m => {
      m.showUnifiedSplitVoucherModal(container, tx, "payment");
    });
  } else if (refLower.includes("contra") || refLower.startsWith("cntr-") || refLower.startsWith("co-") || (refLower.startsWith("c") && !refLower.includes("credit") && !refLower.startsWith("cn-") && !refLower.startsWith("sr-"))) {
    import("./vouchers.js").then(m => {
      m.showContraModal(container, tx);
    });
  } else {
    import("./vouchers.js").then(m => {
      m.showUnifiedSplitVoucherModal(container, tx, "journal");
    });
  }
}

export function showInputGstReportModal(container) {
  const root = document.getElementById("modal-container-root");
  
  window.igstMonthDblClick = (row) => {
    try {
      const month = parseInt(row.getAttribute("data-month"));
      const year = parseInt(row.getAttribute("data-year"));
      
      const startOfChosenMonth = new Date(year, month, 1);
      const endOfChosenMonth = new Date(year, month + 1, 0);

      const formatDateToLocalInput = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const fromEl = document.getElementById("igst-from-date");
      const toEl = document.getElementById("igst-to-date");
      const monthlyChk = document.getElementById("igst-monthly-chk");
      const partyChk = document.getElementById("igst-party-chk");

      if (fromEl) fromEl.value = formatDateToLocalInput(startOfChosenMonth);
      if (toEl) toEl.value = formatDateToLocalInput(endOfChosenMonth);
      if (monthlyChk) monthlyChk.checked = false;
      if (partyChk) partyChk.checked = false;
      const itemQtyLbl = document.getElementById("igst-item-qty-lbl");
      if (itemQtyLbl) itemQtyLbl.style.display = "flex";

      renderReportTable();
    } catch (err) {
      console.error("Error in igstMonthDblClick:", err);
      alert("Error: " + err.message);
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const fiscalStartYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
  const defaultFrom = `${fiscalStartYear}-04-01`;
  const defaultTo = now.toISOString().split("T")[0];

  const existing = document.getElementById("input-gst-overlay");
  if (existing) {
    existing.remove();
  }

  const modalEl = document.createElement("div");
  modalEl.id = "input-gst-overlay";
  modalEl.className = "modal-overlay active";
  modalEl.style.position = "fixed";
  modalEl.style.top = "0";
  modalEl.style.left = "0";
  modalEl.style.width = "100%";
  modalEl.style.height = "100%";
  modalEl.style.display = "flex";
  modalEl.style.justifyContent = "center";
  modalEl.style.alignItems = "center";
  modalEl.style.background = "rgba(15,23,42,0.35)";
  modalEl.style.backdropFilter = "blur(1px)";
  modalEl.style.zIndex = String(2000 + (root.children ? root.children.length : 0) * 10);

  modalEl.innerHTML = `
      <div class="modal-container modal-lg" style="max-width:1400px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice-dollar"></i> INPUT GST REPORT</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="input-gst-close-x-btn">&times;</button>
        </div>

        <!-- Filter Bar -->
        <div style="background-color:#cbd5e1; padding:6px; border:1px solid #94a3b8; border-radius:2px; display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) 120px 80px; gap:8px; align-items:end;">
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">From:</label>
            <input type="date" id="igst-from-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${defaultFrom}">
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">To:</label>
            <input type="date" id="igst-to-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${defaultTo}">
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">GST %</label>
            <select id="igst-gst-rate" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Bill Series</label>
            <select id="igst-bill-series" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">State</label>
            <select id="igst-state" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="KERALA">KERALA</option>
              <option value="OUTSTATE">OUTSIDE STATE</option>
            </select>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="igst-monthly-chk" checked> Monthly
            </label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="igst-party-chk"> Party Wise
            </label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="igst-purchase-return-chk" checked> Purchase Return
            </label>
            <label id="igst-item-qty-lbl" style="display:none; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="igst-item-qty-chk"> Show Item And Qty
            </label>
          </div>
          <div id="igst-party-select-wrapper" style="display:none;">
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Select Vendor</label>
            <select id="igst-party-select" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              ${Array.from(new Set(state.getContacts().filter(c => c.type === "supplier" || c.listInVendorList === true).map(c => c.name))).sort().map(name => `<option value="${name}">${name}</option>`).join("")}
            </select>
          </div>
          
          <div style="display:flex; gap:4px;">
            <button type="button" class="btn btn-secondary" id="btn-igst-view" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-igst-back" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px; display:none;">Back</button>
            <button type="button" class="btn btn-secondary" id="btn-igst-close" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">Close</button>
          </div>
        </div>

        <!-- Content Area / Table Container -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 10px;" id="igst-table-container">
        </div>

      </div>
  `;

  root.appendChild(modalEl);

  const close = () => {
    modalEl.remove();
  };

  document.getElementById("input-gst-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-igst-close").addEventListener("click", close);

  function renderReportTable() {
    const fromDateVal = document.getElementById("igst-from-date").value;
    const toDateVal = document.getElementById("igst-to-date").value;
    const gstRateFilter = document.getElementById("igst-gst-rate").value;
    const stateFilter = document.getElementById("igst-state").value;
    const isMonthly = document.getElementById("igst-monthly-chk").checked;
    
    const backBtn = document.getElementById("btn-igst-back");
    if (backBtn) {
      backBtn.style.display = isMonthly ? "none" : "inline-block";
    }

    const parseLocal = (dStr) => {
      if (!dStr) return new Date();
      const p = dStr.split("-");
      if (p.length === 3) {
        return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      }
      return new Date(dStr);
    };
    
    const startLimit = fromDateVal ? parseLocal(fromDateVal) : null;
    const endLimit = toDateVal ? parseLocal(toDateVal) : null;
    if (startLimit) startLimit.setHours(0,0,0,0);
    if (endLimit) endLimit.setHours(23,59,59,999);

    const matchingPurchases = state.getPurchases().filter(pur => {
      if (pur.isCancelled) return false;
      const purDate = parseLocal(pur.date);
      if (startLimit && purDate < startLimit) return false;
      if (endLimit && purDate > endLimit) return false;
      
      if (stateFilter !== "All") {
        const supplier = state.getContacts().find(c => c.id === (pur.supplierId || pur.contactId));
        const isKerala = !state.isInterstatePurchase(pur, supplier);
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    });

    const showPurchaseReturn = document.getElementById("igst-purchase-return-chk") ? document.getElementById("igst-purchase-return-chk").checked : true;
    const matchingReturns = showPurchaseReturn ? state.getPurchaseReturns().filter(ret => {
      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;
      
      if (stateFilter !== "All") {
        const supplier = state.getContacts().find(c => c.id === (ret.supplierId || ret.contactId));
        const isKerala = !state.isInterstatePurchaseReturn(ret, supplier);
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    }) : [];

    const formatDateStr = (dStr) => formatDate(dStr);

    const containerEl = document.getElementById("igst-table-container");

    if (isMonthly) {
      const monthlyGroups = {};

      const addEntry = (dateStr, val, cgst, sgst, igst, cess) => {
        const d = parseLocal(dateStr);
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        const sortKey = d.getFullYear() * 100 + d.getMonth();

        if (!monthlyGroups[key]) {
          monthlyGroups[key] = { key, sortKey, assessable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, cess: 0, net: 0, monthNum: d.getMonth(), yearNum: d.getFullYear() };
        }
        monthlyGroups[key].assessable += val;
        monthlyGroups[key].cgst += cgst;
        monthlyGroups[key].sgst += sgst;
        monthlyGroups[key].igst += igst;
        monthlyGroups[key].totalGst += (cgst + sgst + igst);
        monthlyGroups[key].cess += cess;
        monthlyGroups[key].net += (val + cgst + sgst + igst + cess);
      };

      matchingPurchases.forEach(pur => {
        let purAssessable = 0;
        let purGst = 0;
        let purCess = 0;

        (pur.items || []).forEach(item => {
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          const itemTaxRate = getValidGstRate(item, mat, 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
          purAssessable += itemAmt;
          purGst += itemAmt * (itemTaxRate / 100);
          purCess += getItemCess(item, itemAmt);
        });

        const supplier = state.getContacts().find(c => c.id === (pur.supplierId || pur.contactId));
        const isKerala = !state.isInterstatePurchase(pur, supplier);
        const cgst = isKerala ? purGst / 2 : 0;
        const sgst = isKerala ? purGst / 2 : 0;
        const igst = isKerala ? 0 : purGst;

        addEntry(pur.date, purAssessable, cgst, sgst, igst, purCess);
      });

      matchingReturns.forEach(ret => {
        let retAssessable = 0;
        let retGst = 0;
        let retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          const itemTaxRate = mat ? parseFloat(mat.taxRate || 18) : 18;
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (itemTaxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        const supplier = state.getContacts().find(c => c.id === (ret.supplierId || ret.contactId));
        const isKerala = !state.isInterstatePurchaseReturn(ret, supplier);
        const cgst = isKerala ? retGst / 2 : 0;
        const sgst = isKerala ? retGst / 2 : 0;
        const igst = isKerala ? 0 : retGst;

        addEntry(ret.date, -retAssessable, -cgst, -sgst, -igst, -retCess);
      });

      const sortedRows = Object.values(monthlyGroups).sort((a, b) => a.sortKey - b.sortKey);

      let totalAssessable = 0;
      let totalSgst = 0;
      let totalCgst = 0;
      let totalIgst = 0;
      let totalGstAmt = 0;
      let totalCess = 0;
      let totalNet = 0;

      sortedRows.forEach(row => {
        totalAssessable += row.assessable;
        totalSgst += row.sgst;
        totalCgst += row.cgst;
        totalIgst += row.igst;
        totalGstAmt += row.totalGst;
        totalCess += row.cess;
        totalNet += row.net;
      });

      containerEl.innerHTML = `
        <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
          INPUT GST Report from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)} GST ${gstRateFilter === 'All' ? 'All %' : gstRateFilter + '%'} Series All
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; color:black;">
          <thead>
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Month</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">Assessable Value</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">SGST</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">CGST</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">IGST</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">GST TOTAL</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">Cess</th>
              <th style="padding:6px; text-align:right;">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRows.map(row => `
              <tr class="monthly-gst-row" data-month="${row.monthNum}" data-year="${row.yearNum}" style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'" ondblclick="window.igstMonthDblClick(this)">
                <td style="padding:6px; border-right:1px solid #cbd5e1; font-weight:bold;">${row.key}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.sgst.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.cgst.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${row.igst.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${row.totalGst.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">${row.cess.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; font-weight:bold; color:#1e293b;">${row.net.toFixed(2)}</td>
              </tr>
            `).join("")}
            ${sortedRows.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No records found.</td>
              </tr>
            ` : ""}
            <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
              <td style="padding:6px; border-right:1px solid #cbd5e1;">Total:</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${totalAssessable.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${totalSgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${totalCgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#b91c1c;">${totalIgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#1e3b8b;">${totalGstAmt.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${totalCess.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; font-weight:800; color:#b91c1c;">${totalNet.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;



    } else {
      let totalAssessable = 0;
      let totalSgst = 0;
      let totalCgst = 0;
      let totalIgst = 0;
      let totalGstAmt = 0;
      let totalCess = 0;
      let totalNet = 0;

      let detailedRows = [];
      let tableHeaderHtml = "";

      const showItemQty = document.getElementById("igst-item-qty-chk") ? document.getElementById("igst-item-qty-chk").checked : false;

      matchingPurchases.forEach(pur => {
        const vendor = state.getContacts().find(c => c.id === (pur.supplierId || pur.contactId));
        const isKerala = !state.isInterstatePurchase(pur, vendor);
        const formattedInvNo = pur.voucherNo || pur.refNo || pur.invoiceNo || pur.id;

        if (showItemQty) {
          (pur.items || []).forEach(item => {
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const itemTaxRate = getValidGstRate(item, mat, 18);
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
            const itemGst = parseFloat(item.gstAmount !== undefined && item.gstAmount !== null ? item.gstAmount : (itemAmt * (itemTaxRate / 100))) || 0;
            const itemCess = getItemCess(item, itemAmt);

            const cgst = isKerala ? itemGst / 2 : 0;
            const sgst = isKerala ? itemGst / 2 : 0;
            const igst = isKerala ? 0 : itemGst;

            detailedRows.push({
              id: pur.id,
              type: "purchase",
              date: pur.date,
              partyName: pur.contactName || (vendor ? vendor.name : "Unknown Vendor"),
              gstin: vendor ? (vendor.gstin || "Unspecified") : "",
              invNo: formattedInvNo,
              assessable: itemAmt,
              product: item.name || (mat ? mat.name : "Unknown Product"),
              hsn: item.hsnCode || (mat ? mat.hsnCode : ""),
              qty: `${item.quantity || 0} ${item.unit || (mat ? mat.unit : "Nos")}`,
              rate: parseFloat(item.price) || 0,
              cgst: cgst,
              sgst: sgst,
              igst: igst,
              totalGst: itemGst,
              cess: itemCess,
              net: itemAmt + itemGst + itemCess,
              timestamp: new Date(pur.date).getTime()
            });
          });
        } else {
          let purAssessable = 0;
          let purGst = 0;
          let purCess = 0;

          (pur.items || []).forEach(item => {
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const itemTaxRate = getValidGstRate(item, mat, 18);
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
            purAssessable += itemAmt;
            purGst += itemAmt * (itemTaxRate / 100);
            purCess += getItemCess(item, itemAmt);
          });

          if (purAssessable > 0) {
            const cgst = isKerala ? purGst / 2 : 0;
            const sgst = isKerala ? purGst / 2 : 0;
            const igst = isKerala ? 0 : purGst;

            detailedRows.push({
              id: pur.id,
              type: "purchase",
              date: pur.date,
              partyName: pur.contactName || (vendor ? vendor.name : "Unknown Vendor"),
              gstin: vendor ? (vendor.gstin || "Unspecified") : "",
              invNo: formattedInvNo,
              assessable: purAssessable,
              cgst: cgst,
              sgst: sgst,
              igst: igst,
              totalGst: purGst,
              cess: purCess,
              net: purAssessable + purGst + purCess,
              timestamp: new Date(pur.date).getTime()
            });
          }
        }
      });

      matchingReturns.forEach(ret => {
        const vendor = state.getContacts().find(c => c.id === (ret.supplierId || ret.contactId));
        const isKerala = !state.isInterstatePurchaseReturn(ret, vendor);
        const formattedRetNo = ret.voucherNo || ret.refNo || ret.id;

        if (showItemQty) {
          (ret.items || []).forEach(item => {
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const itemTaxRate = mat ? parseFloat(mat.taxRate || 18) : 18;
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            const itemGst = itemAmt * (itemTaxRate / 100);
            const itemCess = getItemCess(item, itemAmt);

            const cgst = isKerala ? itemGst / 2 : 0;
            const sgst = isKerala ? itemGst / 2 : 0;
            const igst = isKerala ? 0 : itemGst;

            detailedRows.push({
              id: ret.id,
              type: "purchase-return",
              date: ret.date,
              partyName: (ret.contactName || (vendor ? vendor.name : "Unknown Vendor")) + " (Return)",
              gstin: vendor ? (vendor.gstin || "Unspecified") : "",
              invNo: formattedRetNo,
              assessable: -itemAmt,
              product: item.name || (mat ? mat.name : "Unknown Product"),
              hsn: item.hsnCode || (mat ? mat.hsnCode : ""),
              qty: `${item.quantity || 0} ${item.unit || (mat ? mat.unit : "Nos")}`,
              rate: parseFloat(item.price) || 0,
              cgst: -cgst,
              sgst: -sgst,
              igst: -igst,
              totalGst: -itemGst,
              cess: -itemCess,
              net: -(itemAmt + itemGst + itemCess),
              timestamp: new Date(ret.date).getTime()
            });
          });
        } else {
          let retAssessable = 0;
          let retGst = 0;
          let retCess = 0;

          (ret.items || []).forEach(item => {
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const itemTaxRate = mat ? parseFloat(mat.taxRate || 18) : 18;
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            retAssessable += itemAmt;
            retGst += itemAmt * (itemTaxRate / 100);
            retCess += getItemCess(item, itemAmt);
          });

          if (retAssessable > 0) {
            const cgst = isKerala ? retGst / 2 : 0;
            const sgst = isKerala ? retGst / 2 : 0;
            const igst = isKerala ? 0 : retGst;

            detailedRows.push({
              id: ret.id,
              type: "purchase-return",
              date: ret.date,
              partyName: (ret.contactName || (vendor ? vendor.name : "Unknown Vendor")) + " (Return)",
              gstin: vendor ? (vendor.gstin || "Unspecified") : "",
              invNo: formattedRetNo,
              assessable: -retAssessable,
              cgst: -cgst,
              sgst: -sgst,
              igst: -igst,
              totalGst: -retGst,
              cess: -retCess,
              net: -(retAssessable + retGst + retCess),
              timestamp: new Date(ret.date).getTime()
            });
          }
        }
      });

      const isPartyWise = document.getElementById("igst-party-chk").checked;
      const selectedParty = document.getElementById("igst-party-select") ? document.getElementById("igst-party-select").value : "All";

      if (isPartyWise && selectedParty !== "All") {
        detailedRows = detailedRows.filter(row => {
          const cleanPartyName = row.partyName.replace(" (Return)", "").trim();
          return cleanPartyName === selectedParty;
        });
      }

      if (isPartyWise) {
        detailedRows.sort((a, b) => {
          const nameA = String(a.partyName).toUpperCase();
          const nameB = String(b.partyName).toUpperCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          if (a.id !== b.id) return String(a.id).localeCompare(String(b.id));
          return a.timestamp - b.timestamp;
        });
      } else {
        detailedRows.sort((a, b) => {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
          return String(a.id).localeCompare(String(b.id));
        });
      }

      let totalAdjustments = 0;
      let totalRoundOff = 0;
      let seenBillIds = new Set();

      detailedRows.forEach(row => {
        totalAssessable += row.assessable;
        totalSgst += row.sgst;
        totalCgst += row.cgst;
        totalIgst += row.igst;
        totalGstAmt += row.totalGst;
        totalCess += row.cess;
        totalNet += row.net;

        if (!seenBillIds.has(row.id)) {
          seenBillIds.add(row.id);
          const bill = row.type === "purchase" ? state.getPurchases().find(p => p.id === row.id) :
                       row.type === "invoice" ? state.getInvoices().find(i => i.id === row.id) :
                       row.type === "purchase-return" ? state.getPurchaseReturns().find(r => r.id === row.id) :
                       row.type === "sales-return" ? state.getSalesReturns().find(s => s.id === row.id) : null;
          if (bill) {
            totalAdjustments += parseFloat(bill.adjustments || 0);
            totalRoundOff += parseFloat(bill.roundOff || 0);
          }
        }
      });

      let tableRowsHtml = "";
      let currentParty = null;
      let partyAssessable = 0;
      let partySgst = 0;
      let partyCgst = 0;
      let partyIgst = 0;
      let partyTotalGst = 0;
      let partyCess = 0;
      let partyNet = 0;

      const appendPartyTotalRow = (partyName) => {
        return `
          <tr style="background-color:#e2e8f0; font-weight:bold; border-top:1px solid #94a3b8; border-bottom:1px solid #94a3b8;">
            <td colspan="4" style="padding:4px; border-right:1px solid #cbd5e1; padding-left:12px; color:#1e3b8b;">Total for ${partyName}:</td>
            ${showItemQty ? `
              <td colspan="4" style="border-right:1px solid #cbd5e1;"></td>
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${partyAssessable.toFixed(2)}</td>
            ` : `
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${partyAssessable.toFixed(2)}</td>
            `}
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${partySgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${partyCgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${partyIgst.toFixed(2)}</td>
            ${!showItemQty ? `
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${partyTotalGst.toFixed(2)}</td>
            ` : ""}
            <td style="padding:4px; text-align:right; font-weight:bold; color:#1e293b;">${partyNet.toFixed(2)}</td>
          </tr>
        `;
      };

      let currentBillId = null;
      let billAssessable = 0;
      let billSgst = 0;
      let billCgst = 0;
      let billIgst = 0;
      let billTotalGst = 0;
      let billCess = 0;
      let billNet = 0;

      detailedRows.forEach((row, index) => {
        if (isPartyWise) {
          if (currentParty !== null && currentParty !== row.partyName) {
            tableRowsHtml += appendPartyTotalRow(currentParty);
            partyAssessable = 0;
            partySgst = 0;
            partyCgst = 0;
            partyIgst = 0;
            partyTotalGst = 0;
            partyCess = 0;
            partyNet = 0;
          }
          currentParty = row.partyName;
          
          partyAssessable += row.assessable;
          partySgst += row.sgst;
          partyCgst += row.cgst;
          partyIgst += row.igst;
          partyTotalGst += row.totalGst;
          partyCess += row.cess;
          partyNet += row.net;
        }

        let isFirstRowOfBill = false;
        if (row.id !== currentBillId) {
          currentBillId = row.id;
          isFirstRowOfBill = true;
          billAssessable = 0;
          billSgst = 0;
          billCgst = 0;
          billIgst = 0;
          billTotalGst = 0;
          billCess = 0;
          billNet = 0;
        }

        billAssessable += row.assessable;
        billSgst += row.sgst;
        billCgst += row.cgst;
        billIgst += row.igst;
        billTotalGst += row.totalGst;
        billCess += row.cess;
        billNet += row.net;

        tableRowsHtml += `
          <tr class="detailed-gst-row" data-id="${row.id}" data-type="${row.type}" style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'">
            <td style="padding:4px; border-right:1px solid #cbd5e1;">${isFirstRowOfBill ? formatDateStr(row.date) : ""}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-weight:600;">${isFirstRowOfBill ? row.partyName : ""}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-family:monospace;">${isFirstRowOfBill ? row.gstin : ""}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-weight:500;">${isFirstRowOfBill ? row.invNo : ""}</td>
            ${showItemQty ? `
              <td style="padding:4px; border-right:1px solid #cbd5e1;">${row.product || ""}</td>
              <td style="padding:4px; border-right:1px solid #cbd5e1; font-family:monospace;">${row.hsn || ""}</td>
              <td style="padding:4px; border-right:1px solid #cbd5e1;">${row.qty || ""}</td>
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${(row.rate || 0).toFixed(2)}</td>
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
            ` : `
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
            `}
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.sgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.cgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${row.igst.toFixed(2)}</td>
            ${!showItemQty ? `
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${row.totalGst.toFixed(2)}</td>
            ` : ""}
            <td style="padding:4px; text-align:right; font-weight:bold;">${row.net.toFixed(2)}</td>
          </tr>
        `;

        const isLastItemOfBill = (index === detailedRows.length - 1) || (detailedRows[index + 1].id !== row.id);
        const bill = row.type === "purchase" ? state.getPurchases().find(p => p.id === row.id) :
                     row.type === "invoice" ? state.getInvoices().find(i => i.id === row.id) :
                     row.type === "purchase-return" ? state.getPurchaseReturns().find(r => r.id === row.id) :
                     row.type === "sales-return" ? state.getSalesReturns().find(s => s.id === row.id) : null;

        if (showItemQty && isLastItemOfBill) {
          if (bill) {
            const hasMultipleItems = (bill.items || []).length > 1;
            const adj = parseFloat(bill.adjustments || 0);
            const ro = parseFloat(bill.roundOff || 0);
            const hasAdjOrRo = adj !== 0 || ro !== 0;

            if (hasMultipleItems || hasAdjOrRo) {
              if (hasMultipleItems) {
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-weight:bold; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; font-size:0.7rem;">
                    <td colspan="4" style="padding:4px; border-right:1px solid #cbd5e1; text-align:right; color:#475569;">Subtotal (Bill ${row.invNo}):</td>
                    <td colspan="4" style="border-right:1px solid #cbd5e1;"></td>
                    <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${billAssessable.toFixed(2)}</td>
                    <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${billSgst.toFixed(2)}</td>
                    <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${billCgst.toFixed(2)}</td>
                    <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${billIgst.toFixed(2)}</td>
                    <td style="padding:4px; text-align:right; color:#1e293b;">${billNet.toFixed(2)}</td>
                  </tr>
                `;
              }

              // Detailed Adjustments
              let hasRenderedAdjList = false;
              if (bill.adjustmentsList && bill.adjustmentsList.length > 0) {
                bill.adjustmentsList.forEach(a => {
                  const amt = parseFloat(a.amount || 0);
                  if (amt !== 0) {
                    hasRenderedAdjList = true;
                    const cleanAmt = a.type === "Less" ? -amt : amt;
                    tableRowsHtml += `
                      <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                        <td colspan="12" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">${a.name || "Adjustment"}:</td>
                        <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${cleanAmt.toFixed(2)}</td>
                      </tr>
                    `;
                  }
                });
              }

              if (!hasRenderedAdjList && adj !== 0) {
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                    <td colspan="12" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Adjustments (Shipping/Other Charges):</td>
                    <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${adj.toFixed(2)}</td>
                  </tr>
                `;
              }

              if (ro !== 0) {
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                    <td colspan="12" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Round Off:</td>
                    <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${ro.toFixed(2)}</td>
                  </tr>
                `;
              }
              const grandTotal = billNet + adj + ro;
              tableRowsHtml += `
                <tr style="background-color:#f1f5f9; font-weight:bold; border-bottom:1px solid #94a3b8; font-size:0.7rem;">
                  <td colspan="12" style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#1e3b8b;">Grand Total (Bill ${row.invNo}):</td>
                  <td style="padding:4px; text-align:right; color:#b91c1c; font-weight:800;">${grandTotal.toFixed(2)}</td>
                </tr>
              `;
            }
          }
        } else if (!showItemQty) {
          // Standard layout 2 adjustments
          if (bill) {
            const adj = parseFloat(bill.adjustments || 0);
            const ro = parseFloat(bill.roundOff || 0);
            const hasAdjOrRo = adj !== 0 || ro !== 0;

            if (hasAdjOrRo) {
              let hasRenderedAdjList = false;
              if (bill.adjustmentsList && bill.adjustmentsList.length > 0) {
                bill.adjustmentsList.forEach(a => {
                  const amt = parseFloat(a.amount || 0);
                  if (amt !== 0) {
                    hasRenderedAdjList = true;
                    const cleanAmt = a.type === "Less" ? -amt : amt;
                    tableRowsHtml += `
                      <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                        <td colspan="9" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">${a.name || "Adjustment"}:</td>
                        <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${cleanAmt.toFixed(2)}</td>
                      </tr>
                    `;
                  }
                });
              }

              if (!hasRenderedAdjList && adj !== 0) {
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                    <td colspan="9" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Adjustments (Shipping/Other Charges):</td>
                    <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${adj.toFixed(2)}</td>
                  </tr>
                `;
              }

              if (ro !== 0) {
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                    <td colspan="9" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Round Off:</td>
                    <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${ro.toFixed(2)}</td>
                  </tr>
                `;
              }

              const grandTotal = row.net + adj + ro;
              tableRowsHtml += `
                <tr style="background-color:#f1f5f9; font-weight:bold; border-bottom:1px solid #94a3b8; font-size:0.7rem;">
                  <td colspan="9" style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#1e3b8b;">Grand Total (Bill ${row.invNo}):</td>
                  <td style="padding:4px; text-align:right; color:#b91c1c; font-weight:800;">${grandTotal.toFixed(2)}</td>
                </tr>
              `;
            }
          }
        }

        if (isPartyWise && index === detailedRows.length - 1) {
          tableRowsHtml += appendPartyTotalRow(row.partyName);
        }
      });

        tableHeaderHtml = `
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:4px; border-right:1px solid #cbd5e1;">Inv.Date</th>
              <th style="padding:4px; border-right:1px solid #cbd5e1;">Party</th>
              <th style="padding:4px; border-right:1px solid #cbd5e1;">GSTIN</th>
              <th style="padding:4px; border-right:1px solid #cbd5e1;">Inv.No</th>
              ${showItemQty ? `
                <th style="padding:4px; border-right:1px solid #cbd5e1;">Product</th>
                <th style="padding:4px; border-right:1px solid #cbd5e1;">HSN/S</th>
                <th style="padding:4px; border-right:1px solid #cbd5e1;">Qty</th>
                <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">Rate</th>
                <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">Value</th>
              ` : `
                <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">Value</th>
              `}
              <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">SGST Amt</th>
              <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">CGST Amt</th>
              <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">IGST Amt</th>
              ${!showItemQty ? `
                <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">GST TOTAL</th>
              ` : ""}
              <th style="padding:4px; text-align:right;">Net Amount</th>
            </tr>
        `;

      containerEl.innerHTML = `
        <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
          INPUT GST Report from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)} GST ${gstRateFilter === 'All' ? 'All %' : gstRateFilter + '%'} Series All
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left; color:black;">
          <thead>
            ${tableHeaderHtml}
          </thead>
          <tbody>
            ${tableRowsHtml}
            ${detailedRows.length === 0 ? `
              <tr>
                <td colspan="${showItemQty ? 13 : 10}" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No detailed input GST records found in matching range.</td>
              </tr>
            ` : ""}
            <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
              <td colspan="4" style="padding:6px; border-right:1px solid #cbd5e1;">Total:</td>
              ${showItemQty ? `
                <td colspan="4" style="border-right:1px solid #cbd5e1;"></td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${totalAssessable.toFixed(2)}</td>
              ` : `
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${totalAssessable.toFixed(2)}</td>
              `}
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${totalSgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${totalCgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#b91c1c;">${totalIgst.toFixed(2)}</td>
              ${!showItemQty ? `
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#1e3b8b;">${totalGstAmt.toFixed(2)}</td>
              ` : ""}
              <td style="padding:6px; text-align:right; font-weight:800; color:#b91c1c;">${totalNet.toFixed(2)}</td>
            </tr>
            ${showItemQty && (totalAdjustments !== 0 || totalRoundOff !== 0) ? `
              <tr style="background-color:#e2e8f0; font-style:italic; font-weight:bold; border-top:1px solid #cbd5e1;">
                <td colspan="12" style="padding:4px 6px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Total Adjustments (Shipping/Other):</td>
                <td style="padding:4px 6px; text-align:right; font-weight:800; color:black;">${totalAdjustments.toFixed(2)}</td>
              </tr>
              <tr style="background-color:#e2e8f0; font-style:italic; font-weight:bold; border-top:1px solid #cbd5e1;">
                <td colspan="12" style="padding:4px 6px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Total Round Off:</td>
                <td style="padding:4px 6px; text-align:right; font-weight:800; color:black;">${totalRoundOff.toFixed(2)}</td>
              </tr>
              <tr style="background-color:#cbd5e1; font-weight:bold; border-top:1px solid #94a3b8; border-bottom: 3px double #1e293b;">
                <td colspan="12" style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#1e3b8b; font-size:0.8rem;">Grand Total:</td>
                <td style="padding:6px; text-align:right; font-weight:900; color:#b91c1c; font-size:0.8rem;">${(totalNet + totalAdjustments + totalRoundOff).toFixed(2)}</td>
              </tr>
            ` : ""}
          </tbody>
        </table>
      `;

      containerEl.querySelectorAll(".detailed-gst-row").forEach(row => {
        row.addEventListener("dblclick", () => {
          const id = row.getAttribute("data-id");
          const type = row.getAttribute("data-type");

          if (type === "purchase") {
            const pur = state.getPurchases().find(p => String(p.id) === String(id));
            if (pur) {
              import("./transactions.js").then(m => {
                m.showRecordPurchaseModal(document.getElementById("modal-container-root"), pur, () => {
                  renderReportTable();
                });
              });
            }
          } else if (type === "purchase-return") {
            const ret = state.getPurchaseReturns().find(r => String(r.id) === String(id));
            if (ret) {
              import("./transactions.js").then(m => {
                m.showPurchaseReturnModal(document.getElementById("modal-container-root"), ret, () => {
                  renderReportTable();
                });
              });
            }
          }
        });
      });
    }
  }

  const igstPartySelectWrapper = document.getElementById("igst-party-select-wrapper");
  const igstItemQtyLbl = document.getElementById("igst-item-qty-lbl");
  document.getElementById("btn-igst-view").addEventListener("click", renderReportTable);
  document.getElementById("btn-igst-back").addEventListener("click", () => {
    document.getElementById("igst-monthly-chk").checked = true;
    igstPartySelectWrapper.style.display = "none";
    igstItemQtyLbl.style.display = "none";
    renderReportTable();
  });
  document.getElementById("igst-monthly-chk").addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("igst-party-chk").checked = false;
      igstPartySelectWrapper.style.display = "none";
      igstItemQtyLbl.style.display = "none";
    } else {
      igstItemQtyLbl.style.display = "flex";
    }
    renderReportTable();
  });
  document.getElementById("igst-party-chk").addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("igst-monthly-chk").checked = false;
      igstPartySelectWrapper.style.display = "block";
      igstItemQtyLbl.style.display = "flex";
    } else {
      igstPartySelectWrapper.style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("igst-party-select").addEventListener("change", renderReportTable);
  document.getElementById("igst-item-qty-chk").addEventListener("change", renderReportTable);
  document.getElementById("igst-gst-rate").addEventListener("change", renderReportTable);
  document.getElementById("igst-state").addEventListener("change", renderReportTable);
  document.getElementById("igst-purchase-return-chk").addEventListener("change", renderReportTable);

  const igstFromDate = document.getElementById("igst-from-date");
  const igstToDate = document.getElementById("igst-to-date");
  if (igstFromDate) {
    igstFromDate.addEventListener("change", renderReportTable);
    igstFromDate.addEventListener("input", renderReportTable);
  }
  if (igstToDate) {
    igstToDate.addEventListener("change", renderReportTable);
    igstToDate.addEventListener("input", renderReportTable);
  }

  renderReportTable();
}

export function showOutputGstReportModal(container) {
  const root = document.getElementById("modal-container-root");
  
  window.ogstMonthDblClick = (row) => {
    try {
      const month = parseInt(row.getAttribute("data-month"));
      const year = parseInt(row.getAttribute("data-year"));
      
      const startOfChosenMonth = new Date(year, month, 1);
      const endOfChosenMonth = new Date(year, month + 1, 0);

      const formatDateToLocalInput = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const fromEl = document.getElementById("ogst-from-date");
      const toEl = document.getElementById("ogst-to-date");
      const monthlyChk = document.getElementById("ogst-monthly-chk");
      const partyChk = document.getElementById("ogst-party-chk");

      if (fromEl) fromEl.value = formatDateToLocalInput(startOfChosenMonth);
      if (toEl) toEl.value = formatDateToLocalInput(endOfChosenMonth);
      if (monthlyChk) monthlyChk.checked = false;
      if (partyChk) partyChk.checked = false;
      const itemQtyLbl = document.getElementById("ogst-item-qty-lbl");
      if (itemQtyLbl) itemQtyLbl.style.display = "flex";

      renderReportTable();
    } catch (err) {
      console.error("Error in ogstMonthDblClick:", err);
      alert("Error: " + err.message);
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const fiscalStartYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
  const defaultFrom = `${fiscalStartYear}-04-01`;
  const defaultTo = now.toISOString().split("T")[0];

  const existing = document.getElementById("output-gst-overlay");
  if (existing) {
    existing.remove();
  }

  const modalEl = document.createElement("div");
  modalEl.id = "output-gst-overlay";
  modalEl.className = "modal-overlay active";
  modalEl.style.position = "fixed";
  modalEl.style.top = "0";
  modalEl.style.left = "0";
  modalEl.style.width = "100%";
  modalEl.style.height = "100%";
  modalEl.style.display = "flex";
  modalEl.style.justifyContent = "center";
  modalEl.style.alignItems = "center";
  modalEl.style.background = "rgba(15,23,42,0.35)";
  modalEl.style.backdropFilter = "blur(1px)";
  modalEl.style.zIndex = String(2000 + (root.children ? root.children.length : 0) * 10);

  modalEl.innerHTML = `
      <div class="modal-container modal-lg" style="max-width:1400px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice-dollar"></i> OUTPUT GST REPORT</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="output-gst-close-x-btn">&times;</button>
        </div>

        <!-- Filter Bar -->
        <div style="background-color:#cbd5e1; padding:6px; border:1px solid #94a3b8; border-radius:2px; display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) 120px 80px; gap:8px; align-items:end;">
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">From:</label>
            <input type="date" id="ogst-from-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${defaultFrom}">
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">To:</label>
            <input type="date" id="ogst-to-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${defaultTo}">
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">GST %</label>
            <select id="ogst-gst-rate" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Bill Series</label>
            <select id="ogst-bill-series" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">State</label>
            <select id="ogst-state" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="KERALA">KERALA</option>
              <option value="OUTSTATE">OUTSIDE STATE</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">GSTIN Filter</label>
            <select id="ogst-gstin-filter" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="With">With GSTIN</option>
              <option value="Without">Without GSTIN</option>
            </select>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="ogst-monthly-chk" checked> Monthly
            </label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="ogst-party-chk"> Party Wise
            </label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="ogst-show-returns-chk" checked> Sales Return
            </label>
          </div>
          <div id="ogst-party-select-wrapper" style="display:none;">
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Select Customer</label>
            <select id="ogst-party-select" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              ${Array.from(new Set(state.getContacts().filter(c => c.type === "customer" || c.listInCustomerList === true).map(c => c.name))).sort().map(name => `<option value="${name}">${name}</option>`).join("")}
            </select>
          </div>
          
          <div style="display:flex; gap:4px;">
            <button type="button" class="btn btn-secondary" id="btn-ogst-view" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-ogst-back" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px; display:none;">Back</button>
            <button type="button" class="btn btn-secondary" id="btn-ogst-close" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">Close</button>
          </div>
        </div>

        <!-- Content Area / Table Container -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 10px;" id="ogst-table-container">
        </div>

      </div>
  `;

  root.appendChild(modalEl);

  const close = () => {
    modalEl.remove();
  };

  document.getElementById("output-gst-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-ogst-close").addEventListener("click", close);

  function renderReportTable() {
    const fromDateVal = document.getElementById("ogst-from-date").value;
    const toDateVal = document.getElementById("ogst-to-date").value;
    const gstRateFilter = document.getElementById("ogst-gst-rate").value;
    const stateFilter = document.getElementById("ogst-state").value;
    const isMonthly = document.getElementById("ogst-monthly-chk").checked;
    const showReturns = document.getElementById("ogst-show-returns-chk") ? document.getElementById("ogst-show-returns-chk").checked : true;
    
    const backBtn = document.getElementById("btn-ogst-back");
    if (backBtn) {
      backBtn.style.display = isMonthly ? "none" : "inline-block";
    }

    const parseLocal = (dStr) => {
      if (!dStr) return new Date();
      const p = dStr.split("-");
      if (p.length === 3) {
        return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      }
      return new Date(dStr);
    };
    
    const gstinFilter = document.getElementById("ogst-gstin-filter").value;
    
    const startLimit = fromDateVal ? parseLocal(fromDateVal) : null;
    const endLimit = toDateVal ? parseLocal(toDateVal) : null;
    if (startLimit) startLimit.setHours(0,0,0,0);
    if (endLimit) endLimit.setHours(23,59,59,999);

    const contacts = state.getContacts() || [];
    const contactMap = new Map(contacts.map(c => [c.id, c]));
    const materials = state.getMaterials() || [];
    const materialMap = new Map(materials.map(m => [m.id, m]));

    const matchingInvoices = state.getInvoices().filter(inv => {
      if (inv.isCancelled) return false;
      const invDate = parseLocal(inv.date);
      if (startLimit && invDate < startLimit) return false;
      if (endLimit && invDate > endLimit) return false;
      
      const customer = contactMap.get(inv.contactId);
      const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
      if (gstinFilter === "With" && !hasGstin) return false;
      if (gstinFilter === "Without" && hasGstin) return false;

      if (stateFilter !== "All") {
        const customer = contactMap.get(inv.contactId);
        const isKerala = !state.isInterstateSale(inv, customer);
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    });

    const matchingReturns = showReturns ? state.getSalesReturns().filter(ret => {
      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;
      
      const customer = contactMap.get(ret.contactId);
      const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
      if (gstinFilter === "With" && !hasGstin) return false;
      if (gstinFilter === "Without" && hasGstin) return false;

      if (stateFilter !== "All") {
        const isKerala = !state.isInterstateSalesReturn(ret, customer);
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    }) : [];

    const formatDateStr = (dStr) => formatDate(dStr);

    const containerEl = document.getElementById("ogst-table-container");

    if (isMonthly) {
      const monthlyGroups = {};

      const addEntry = (dateStr, val, cgst, sgst, igst, cess) => {
        const d = parseLocal(dateStr);
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        const sortKey = d.getFullYear() * 100 + d.getMonth();

        if (!monthlyGroups[key]) {
          monthlyGroups[key] = { key, sortKey, assessable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, cess: 0, net: 0, monthNum: d.getMonth(), yearNum: d.getFullYear() };
        }
        monthlyGroups[key].assessable += val;
        monthlyGroups[key].cgst += cgst;
        monthlyGroups[key].sgst += sgst;
        monthlyGroups[key].igst += igst;
        monthlyGroups[key].totalGst += (cgst + sgst + igst);
        monthlyGroups[key].cess += cess;
        monthlyGroups[key].net += (val + cgst + sgst + igst + cess);
      };

      matchingInvoices.forEach(inv => {
        let invAssessable = 0;
        let invGst = 0;
        let invCess = 0;

        (inv.items || []).forEach(item => {
          const mat = materialMap.get(item.materialId);
          const itemTaxRate = getValidGstRate(item, mat, 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
          invAssessable += itemAmt;
          invGst += parseFloat(item.gstAmount !== undefined && item.gstAmount !== null ? item.gstAmount : (itemAmt * (itemTaxRate / 100))) || 0;
          invCess += getItemCess(item, itemAmt);
        });

        const customer = contactMap.get(inv.contactId);
        const isKerala = !state.isInterstateSale(inv, customer);

        const cgst = isKerala ? invGst / 2 : 0;
        const sgst = isKerala ? invGst / 2 : 0;
        const igst = isKerala ? 0 : invGst;

        addEntry(inv.date, invAssessable, cgst, sgst, igst, invCess);
      });

      matchingReturns.forEach(ret => {
        let retAssessable = 0;
        let retGst = 0;
        let retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = materialMap.get(item.materialId);
          const itemTaxRate = mat ? parseFloat(mat.taxRate || 18) : 18;
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (itemTaxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        const customer = contactMap.get(ret.contactId);
        const isKerala = !state.isInterstateSalesReturn(ret, customer);
        const cgst = isKerala ? retGst / 2 : 0;
        const sgst = isKerala ? retGst / 2 : 0;
        const igst = isKerala ? 0 : retGst;

        addEntry(ret.date, -retAssessable, -cgst, -sgst, -igst, -retCess);
      });

      const sortedRows = Object.values(monthlyGroups).sort((a, b) => a.sortKey - b.sortKey);

      let totalAssessable = 0;
      let totalSgst = 0;
      let totalCgst = 0;
      let totalIgst = 0;
      let totalGstAmt = 0;
      let totalCess = 0;
      let totalNet = 0;

      sortedRows.forEach(row => {
        totalAssessable += row.assessable;
        totalSgst += row.sgst;
        totalCgst += row.cgst;
        totalIgst += row.igst;
        totalGstAmt += row.totalGst;
        totalCess += row.cess;
        totalNet += row.net;
      });

      containerEl.innerHTML = `
        <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
          OUTPUT GST Report from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)} GST ${gstRateFilter === 'All' ? 'All %' : gstRateFilter + '%'} Series All
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; color:black;">
          <thead>
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Month</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">Assessable Value</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">SGST</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">CGST</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">IGST</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">GST TOTAL</th>
              <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">Cess</th>
              <th style="padding:6px; text-align:right;">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRows.map(row => `
              <tr class="monthly-gst-row" data-month="${row.monthNum}" data-year="${row.yearNum}" style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'" ondblclick="window.ogstMonthDblClick(this)">
                <td style="padding:6px; border-right:1px solid #cbd5e1; font-weight:bold;">${row.key}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.sgst.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.cgst.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${row.igst.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${row.totalGst.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">${row.cess.toFixed(2)}</td>
                <td style="padding:6px; text-align:right; font-weight:bold; color:#1e293b;">${row.net.toFixed(2)}</td>
              </tr>
            `).join("")}
            ${sortedRows.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No records found.</td>
              </tr>
            ` : ""}
            <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
              <td style="padding:6px; border-right:1px solid #cbd5e1;">Total:</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${totalAssessable.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${totalSgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${totalCgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#b91c1c;">${totalIgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#1e3b8b;">${totalGstAmt.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${totalCess.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; font-weight:800; color:#b91c1c;">${totalNet.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;

    } else {
      let totalAssessable = 0;
      let totalSgst = 0;
      let totalCgst = 0;
      let totalIgst = 0;
      let totalGstAmt = 0;
      let totalCess = 0;
      let totalNet = 0;

      let detailedRows = [];
      let tableHeaderHtml = "";

      const showItemQty = false;

      matchingInvoices.forEach(inv => {
        const customer = contactMap.get(inv.contactId);
        const isKerala = !state.isInterstateSale(inv, customer);
        const formattedInvNo = inv.voucherNo || inv.refNo || inv.invoiceNo || inv.id;

        if (showItemQty) {
          (inv.items || []).forEach(item => {
            const mat = materialMap.get(item.materialId);
            const itemTaxRate = getValidGstRate(item, mat, 18);
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
            const itemGst = parseFloat(item.gstAmount !== undefined && item.gstAmount !== null ? item.gstAmount : (itemAmt * (itemTaxRate / 100))) || 0;
            const itemCess = getItemCess(item, itemAmt);

            const cgst = isKerala ? itemGst / 2 : 0;
            const sgst = isKerala ? itemGst / 2 : 0;
            const igst = isKerala ? 0 : itemGst;

            detailedRows.push({
              id: inv.id,
              type: "invoice",
              date: inv.date,
              partyName: inv.contactName || (customer ? customer.name : "Unknown Customer"),
              gstin: customer ? (customer.gstin || "Unspecified") : "",
              invNo: formattedInvNo,
              assessable: itemAmt,
              product: item.name || (mat ? mat.name : "Unknown Product"),
              hsn: item.hsnCode || (mat ? mat.hsnCode : ""),
              qty: `${item.quantity || 0} ${item.unit || (mat ? mat.unit : "Nos")}`,
              rate: parseFloat(item.price) || 0,
              cgst: cgst,
              sgst: sgst,
              igst: igst,
              totalGst: itemGst,
              cess: itemCess,
              net: itemAmt + itemGst + itemCess,
              timestamp: parseLocal(inv.date).getTime()
            });
          });
        } else {
          let invAssessable = 0;
          let invGst = 0;
          let invCess = 0;

          (inv.items || []).forEach(item => {
            const mat = materialMap.get(item.materialId);
            const itemTaxRate = getValidGstRate(item, mat, 18);
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
            invAssessable += itemAmt;
            invGst += parseFloat(item.gstAmount !== undefined && item.gstAmount !== null ? item.gstAmount : (itemAmt * (itemTaxRate / 100))) || 0;
            invCess += getItemCess(item, itemAmt);
          });

          if (invAssessable > 0) {
            const cgst = isKerala ? invGst / 2 : 0;
            const sgst = isKerala ? invGst / 2 : 0;
            const igst = isKerala ? 0 : invGst;

            detailedRows.push({
              id: inv.id,
              type: "invoice",
              date: inv.date,
              partyName: inv.contactName || (customer ? customer.name : "Unknown Customer"),
              gstin: customer ? (customer.gstin || "Unspecified") : "",
              invNo: formattedInvNo,
              assessable: invAssessable,
              cgst: cgst,
              sgst: sgst,
              igst: igst,
              totalGst: invGst,
              cess: invCess,
              net: invAssessable + invGst + invCess,
              timestamp: parseLocal(inv.date).getTime()
            });
          }
        }
      });

      matchingReturns.forEach(ret => {
        const customer = contactMap.get(ret.contactId);
        const isKerala = !state.isInterstateSalesReturn(ret, customer);
        const formattedRetNo = ret.voucherNo || ret.refNo || ret.id;

        if (showItemQty) {
          (ret.items || []).forEach(item => {
            const mat = materialMap.get(item.materialId);
            const itemTaxRate = mat ? parseFloat(mat.taxRate || 18) : 18;
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            const itemGst = itemAmt * (itemTaxRate / 100);
            const itemCess = getItemCess(item, itemAmt);

            const cgst = isKerala ? itemGst / 2 : 0;
            const sgst = isKerala ? itemGst / 2 : 0;
            const igst = isKerala ? 0 : itemGst;

            detailedRows.push({
              id: ret.id,
              type: "sales-return",
              date: ret.date,
              partyName: (ret.contactName || (customer ? customer.name : "Unknown Customer")) + " (Return)",
              gstin: customer ? (customer.gstin || "Unspecified") : "",
              invNo: formattedRetNo,
              assessable: -itemAmt,
              product: item.name || (mat ? mat.name : "Unknown Product"),
              hsn: item.hsnCode || (mat ? mat.hsnCode : ""),
              qty: `${item.quantity || 0} ${item.unit || (mat ? mat.unit : "Nos")}`,
              rate: parseFloat(item.price) || 0,
              cgst: -cgst,
              sgst: -sgst,
              igst: -igst,
              totalGst: -itemGst,
              cess: -itemCess,
              net: -(itemAmt + itemGst + itemCess),
              timestamp: parseLocal(ret.date).getTime()
            });
          });
        } else {
          let retAssessable = 0;
          let retGst = 0;
          let retCess = 0;

          (ret.items || []).forEach(item => {
            const mat = materialMap.get(item.materialId);
            const itemTaxRate = mat ? parseFloat(mat.taxRate || 18) : 18;
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            retAssessable += itemAmt;
            retGst += itemAmt * (itemTaxRate / 100);
            retCess += getItemCess(item, itemAmt);
          });

          if (retAssessable > 0) {
            const cgst = isKerala ? retGst / 2 : 0;
            const sgst = isKerala ? retGst / 2 : 0;
            const igst = isKerala ? 0 : retGst;

            detailedRows.push({
              id: ret.id,
              type: "sales-return",
              date: ret.date,
              partyName: (ret.contactName || (customer ? customer.name : "Unknown Customer")) + " (Return)",
              gstin: customer ? (customer.gstin || "Unspecified") : "",
              invNo: formattedRetNo,
              assessable: -retAssessable,
              cgst: -cgst,
              sgst: -sgst,
              igst: -igst,
              totalGst: -retGst,
              cess: -retCess,
              net: -(retAssessable + retGst + retCess),
              timestamp: parseLocal(ret.date).getTime()
            });
          }
        }
      });

      const isPartyWise = document.getElementById("ogst-party-chk").checked;
      const selectedParty = document.getElementById("ogst-party-select") ? document.getElementById("ogst-party-select").value : "All";

      if (isPartyWise && selectedParty !== "All") {
        detailedRows = detailedRows.filter(row => {
          const cleanPartyName = row.partyName.replace(" (Return)", "").trim();
          return cleanPartyName === selectedParty;
        });
      }

      if (isPartyWise) {
        detailedRows.sort((a, b) => {
          const nameA = String(a.partyName).toUpperCase();
          const nameB = String(b.partyName).toUpperCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          if (a.id !== b.id) return String(a.id).localeCompare(String(b.id));
          return a.timestamp - b.timestamp;
        });
      } else {
        detailedRows.sort((a, b) => {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
          return String(a.id).localeCompare(String(b.id));
        });
      }

      let totalAdjustments = 0;
      let totalRoundOff = 0;
      let seenBillIds = new Set();

      detailedRows.forEach(row => {
        totalAssessable += row.assessable;
        totalSgst += row.sgst;
        totalCgst += row.cgst;
        totalIgst += row.igst;
        totalGstAmt += row.totalGst;
        totalCess += row.cess;
        totalNet += row.net;

        if (!seenBillIds.has(row.id)) {
          seenBillIds.add(row.id);
          const bill = row.type === "purchase" ? state.getPurchases().find(p => p.id === row.id) :
                       row.type === "invoice" ? state.getInvoices().find(i => i.id === row.id) :
                       row.type === "purchase-return" ? state.getPurchaseReturns().find(r => r.id === row.id) :
                       row.type === "sales-return" ? state.getSalesReturns().find(s => s.id === row.id) : null;
          if (bill) {
            totalAdjustments += parseFloat(bill.adjustments || 0);
            totalRoundOff += parseFloat(bill.roundOff || 0);
          }
        }
      });

      let tableRowsHtml = "";
      let currentParty = null;
      let partyAssessable = 0;
      let partySgst = 0;
      let partyCgst = 0;
      let partyIgst = 0;
      let partyTotalGst = 0;
      let partyCess = 0;
      let partyNet = 0;

      const appendPartyTotalRow = (partyName) => {
        return `
          <tr style="background-color:#e2e8f0; font-weight:bold; border-top:1px solid #94a3b8; border-bottom:1px solid #94a3b8;">
            <td colspan="4" style="padding:4px; border-right:1px solid #cbd5e1; padding-left:12px; color:#1e3b8b;">Total for ${partyName}:</td>
            ${showItemQty ? `
              <td colspan="4" style="border-right:1px solid #cbd5e1;"></td>
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${partyAssessable.toFixed(2)}</td>
            ` : `
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${partyAssessable.toFixed(2)}</td>
            `}
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${partySgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${partyCgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${partyIgst.toFixed(2)}</td>
            ${!showItemQty ? `
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${partyTotalGst.toFixed(2)}</td>
            ` : ""}
            <td style="padding:4px; text-align:right; font-weight:bold; color:#1e293b;">${partyNet.toFixed(2)}</td>
          </tr>
        `;
      };

      let currentBillId = null;
      let billAssessable = 0;
      let billSgst = 0;
      let billCgst = 0;
      let billIgst = 0;
      let billTotalGst = 0;
      let billCess = 0;
      let billNet = 0;

      detailedRows.forEach((row, index) => {
        if (isPartyWise) {
          if (currentParty !== null && currentParty !== row.partyName) {
            tableRowsHtml += appendPartyTotalRow(currentParty);
            partyAssessable = 0;
            partySgst = 0;
            partyCgst = 0;
            partyIgst = 0;
            partyTotalGst = 0;
            partyCess = 0;
            partyNet = 0;
          }
          currentParty = row.partyName;
          
          partyAssessable += row.assessable;
          partySgst += row.sgst;
          partyCgst += row.cgst;
          partyIgst += row.igst;
          partyTotalGst += row.totalGst;
          partyCess += row.cess;
          partyNet += row.net;
        }

        let isFirstRowOfBill = false;
        if (row.id !== currentBillId) {
          currentBillId = row.id;
          isFirstRowOfBill = true;
          billAssessable = 0;
          billSgst = 0;
          billCgst = 0;
          billIgst = 0;
          billTotalGst = 0;
          billCess = 0;
          billNet = 0;
        }

        billAssessable += row.assessable;
        billSgst += row.sgst;
        billCgst += row.cgst;
        billIgst += row.igst;
        billTotalGst += row.totalGst;
        billCess += row.cess;
        billNet += row.net;

        tableRowsHtml += `
          <tr class="detailed-gst-row" data-id="${row.id}" data-type="${row.type}" style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'">
            <td style="padding:4px; border-right:1px solid #cbd5e1;">${isFirstRowOfBill ? formatDateStr(row.date) : ""}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-weight:600;">${isFirstRowOfBill ? row.partyName : ""}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-family:monospace;">${isFirstRowOfBill ? row.gstin : ""}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-weight:500;">${isFirstRowOfBill ? row.invNo : ""}</td>
            ${showItemQty ? `
              <td style="padding:4px; border-right:1px solid #cbd5e1;">${row.product || ""}</td>
              <td style="padding:4px; border-right:1px solid #cbd5e1; font-family:monospace;">${row.hsn || ""}</td>
              <td style="padding:4px; border-right:1px solid #cbd5e1;">${row.qty || ""}</td>
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${(row.rate || 0).toFixed(2)}</td>
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
            ` : `
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
            `}
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.sgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.cgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${row.igst.toFixed(2)}</td>
            ${!showItemQty ? `
              <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${row.totalGst.toFixed(2)}</td>
            ` : ""}
            <td style="padding:4px; text-align:right; font-weight:bold;">${row.net.toFixed(2)}</td>
          </tr>
        `;

        const isLastItemOfBill = (index === detailedRows.length - 1) || (detailedRows[index + 1].id !== row.id);
        const bill = row.type === "purchase" ? state.getPurchases().find(p => p.id === row.id) :
                     row.type === "invoice" ? state.getInvoices().find(i => i.id === row.id) :
                     row.type === "purchase-return" ? state.getPurchaseReturns().find(r => r.id === row.id) :
                     row.type === "sales-return" ? state.getSalesReturns().find(s => s.id === row.id) : null;

        if (showItemQty && isLastItemOfBill) {
          if (bill) {
            const hasMultipleItems = (bill.items || []).length > 1;
            const adj = parseFloat(bill.adjustments || 0);
            const ro = parseFloat(bill.roundOff || 0);
            const hasAdjOrRo = adj !== 0 || ro !== 0;

            if (hasMultipleItems || hasAdjOrRo) {
              if (hasMultipleItems) {
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-weight:bold; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; font-size:0.7rem;">
                    <td colspan="4" style="padding:4px; border-right:1px solid #cbd5e1; text-align:right; color:#475569;">Subtotal (Bill ${row.invNo}):</td>
                    <td colspan="4" style="border-right:1px solid #cbd5e1;"></td>
                    <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${billAssessable.toFixed(2)}</td>
                    <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${billSgst.toFixed(2)}</td>
                    <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${billCgst.toFixed(2)}</td>
                    <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${billIgst.toFixed(2)}</td>
                    <td style="padding:4px; text-align:right; color:#1e293b;">${billNet.toFixed(2)}</td>
                  </tr>
                `;
              }

              // Detailed Adjustments
              let hasRenderedAdjList = false;
              if (bill.adjustmentsList && bill.adjustmentsList.length > 0) {
                bill.adjustmentsList.forEach(a => {
                  const amt = parseFloat(a.amount || 0);
                  if (amt !== 0) {
                    hasRenderedAdjList = true;
                    const cleanAmt = a.type === "Less" ? -amt : amt;
                    tableRowsHtml += `
                      <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                        <td colspan="12" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">${a.name || "Adjustment"}:</td>
                        <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${cleanAmt.toFixed(2)}</td>
                      </tr>
                    `;
                  }
                });
              }

              if (!hasRenderedAdjList && adj !== 0) {
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                    <td colspan="12" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Adjustments (Shipping/Other Charges):</td>
                    <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${adj.toFixed(2)}</td>
                  </tr>
                `;
              }

              if (ro !== 0) {
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                    <td colspan="12" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Round Off:</td>
                    <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${ro.toFixed(2)}</td>
                  </tr>
                `;
              }
              const grandTotal = billNet + adj + ro;
              tableRowsHtml += `
                <tr style="background-color:#f1f5f9; font-weight:bold; border-bottom:1px solid #94a3b8; font-size:0.7rem;">
                  <td colspan="12" style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#1e3b8b;">Grand Total (Bill ${row.invNo}):</td>
                  <td style="padding:4px; text-align:right; color:#b91c1c; font-weight:800;">${grandTotal.toFixed(2)}</td>
                </tr>
              `;
            }
          }
        }

        if (isPartyWise && index === detailedRows.length - 1) {
          tableRowsHtml += appendPartyTotalRow(row.partyName);
        }
      });

        tableHeaderHtml = `
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:4px; border-right:1px solid #cbd5e1;">Inv.Date</th>
              <th style="padding:4px; border-right:1px solid #cbd5e1;">Party</th>
              <th style="padding:4px; border-right:1px solid #cbd5e1;">GSTIN</th>
              <th style="padding:4px; border-right:1px solid #cbd5e1;">Inv.No</th>
              ${showItemQty ? `
                <th style="padding:4px; border-right:1px solid #cbd5e1;">Product</th>
                <th style="padding:4px; border-right:1px solid #cbd5e1;">HSN/S</th>
                <th style="padding:4px; border-right:1px solid #cbd5e1;">Qty</th>
                <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">Rate</th>
                <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">Value</th>
              ` : `
                <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">Value</th>
              `}
              <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">SGST Amt</th>
              <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">CGST Amt</th>
              <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">IGST Amt</th>
              ${!showItemQty ? `
                <th style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">GST TOTAL</th>
              ` : ""}
              <th style="padding:4px; text-align:right;">Net Amount</th>
            </tr>
        `;

      containerEl.innerHTML = `
        <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
          OUTPUT GST Report from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)} GST ${gstRateFilter === 'All' ? 'All %' : gstRateFilter + '%'} Series All
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left; color:black;">
          <thead>
            ${tableHeaderHtml}
          </thead>
          <tbody>
            ${tableRowsHtml}
            ${detailedRows.length === 0 ? `
              <tr>
                <td colspan="${showItemQty ? 13 : 10}" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No detailed output GST records found in matching range.</td>
              </tr>
            ` : ""}
            <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
              <td colspan="4" style="padding:6px; border-right:1px solid #cbd5e1;">Total:</td>
              ${showItemQty ? `
                <td colspan="4" style="border-right:1px solid #cbd5e1;"></td>
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${totalAssessable.toFixed(2)}</td>
              ` : `
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${totalAssessable.toFixed(2)}</td>
              `}
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${totalSgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${totalCgst.toFixed(2)}</td>
              <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#b91c1c;">${totalIgst.toFixed(2)}</td>
              ${!showItemQty ? `
                <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#1e3b8b;">${totalGstAmt.toFixed(2)}</td>
              ` : ""}
              <td style="padding:6px; text-align:right; font-weight:800; color:#b91c1c;">${totalNet.toFixed(2)}</td>
            </tr>
            ${showItemQty && (totalAdjustments !== 0 || totalRoundOff !== 0) ? `
              <tr style="background-color:#e2e8f0; font-style:italic; font-weight:bold; border-top:1px solid #cbd5e1;">
                <td colspan="12" style="padding:4px 6px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Total Adjustments (Shipping/Other):</td>
                <td style="padding:4px 6px; text-align:right; font-weight:800; color:black;">${totalAdjustments.toFixed(2)}</td>
              </tr>
              <tr style="background-color:#e2e8f0; font-style:italic; font-weight:bold; border-top:1px solid #cbd5e1;">
                <td colspan="12" style="padding:4px 6px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Total Round Off:</td>
                <td style="padding:4px 6px; text-align:right; font-weight:800; color:black;">${totalRoundOff.toFixed(2)}</td>
              </tr>
              <tr style="background-color:#cbd5e1; font-weight:bold; border-top:1px solid #94a3b8; border-bottom: 3px double #1e293b;">
                <td colspan="12" style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#1e3b8b; font-size:0.8rem;">Grand Total:</td>
                <td style="padding:6px; text-align:right; font-weight:900; color:#b91c1c; font-size:0.8rem;">${(totalNet + totalAdjustments + totalRoundOff).toFixed(2)}</td>
              </tr>
            ` : ""}
          </tbody>
        </table>
      `;

      containerEl.querySelectorAll(".detailed-gst-row").forEach(row => {
        row.addEventListener("dblclick", () => {
          const id = row.getAttribute("data-id");
          const type = row.getAttribute("data-type");

          if (type === "invoice") {
            const inv = state.getInvoices().find(i => String(i.id) === String(id));
            if (inv) {
              import("./transactions.js").then(m => {
                m.showInvoiceBuilderModal(
                  document.getElementById("modal-container-root"),
                  state.getContacts().filter(c => c.type === 'customer' || c.listInCustomerList === true),
                  state.getMaterials(),
                  () => { renderReportTable(); },
                  inv
                );
              });
            }
          } else if (type === "sales-return") {
            const ret = state.getSalesReturns().find(r => String(r.id) === String(id));
            if (ret) {
              import("./transactions.js").then(m => {
                m.showSalesReturnModal(document.getElementById("modal-container-root"), ret, () => {
                  renderReportTable();
                });
              });
            }
          }
        });
      });
    }
  }

  const ogstPartySelectWrapper = document.getElementById("ogst-party-select-wrapper");
  document.getElementById("btn-ogst-view").addEventListener("click", renderReportTable);
  document.getElementById("btn-ogst-back").addEventListener("click", () => {
    document.getElementById("ogst-monthly-chk").checked = true;
    ogstPartySelectWrapper.style.display = "none";
    renderReportTable();
  });
  document.getElementById("ogst-monthly-chk").addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("ogst-party-chk").checked = false;
      ogstPartySelectWrapper.style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("ogst-party-chk").addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("ogst-monthly-chk").checked = false;
      ogstPartySelectWrapper.style.display = "block";
    } else {
      ogstPartySelectWrapper.style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("ogst-party-select").addEventListener("change", renderReportTable);
  document.getElementById("ogst-show-returns-chk").addEventListener("change", renderReportTable);
  document.getElementById("ogst-gst-rate").addEventListener("change", renderReportTable);
  document.getElementById("ogst-gstin-filter").addEventListener("change", renderReportTable);
  document.getElementById("ogst-state").addEventListener("change", renderReportTable);

  const ogstFromDate = document.getElementById("ogst-from-date");
  const ogstToDate = document.getElementById("ogst-to-date");
  if (ogstFromDate) {
    ogstFromDate.addEventListener("change", renderReportTable);
    ogstFromDate.addEventListener("input", renderReportTable);
  }
  if (ogstToDate) {
    ogstToDate.addEventListener("change", renderReportTable);
    ogstToDate.addEventListener("input", renderReportTable);
  }

  renderReportTable();
}

function showGroupsModal(mainGroupName, groups, container) {
  const root = document.getElementById("modal-container-root") || container;
  const overlayId = `pl-groups-modal-overlay-${mainGroupName.replace(/\s+/g, "-")}`;
  const existing = document.getElementById(overlayId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }
  const overlay = document.createElement("div");
  overlay.id = overlayId;
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontFamily = "Tahoma, sans-serif";

  const balances = state.getAccountBalances(reportEndDate);
  const groupBalances = {};

  function getRecursiveGroupBalance(groupName) {
    if (state.getGroupSummary) {
      const summaryItems = state.getGroupSummary(groupName, reportStartDate, reportEndDate);
      if (summaryItems && summaryItems.length > 0) {
        let totalGroupBal = 0;
        summaryItems.forEach(item => {
          totalGroupBal += (item.closing || 0);
        });
        return totalGroupBal;
      }
    }
    return 0;
  }

  groups.forEach(g => {
    groupBalances[g] = getRecursiveGroupBalance(g);
  });

  const filteredGroups = groups.filter(g => Math.abs(groupBalances[g] || 0) >= 0.001);

  const displayRows = [];

  // 1. Add subgroups
  filteredGroups.forEach(g => {
    const rawVal = groupBalances[g] || 0;
    const absVal = Math.abs(rawVal);
    const balanceType = rawVal >= 0 ? "Dr" : "Cr";
    displayRows.push({
      name: g,
      type: "group",
      balanceStr: `\u20B9${absVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balanceType}`
    });
  });

  const allGroups = state.getAccountGroups ? state.getAccountGroups() : [];

  // 2. Add direct dynamic ledgers under this mainGroupName
  state.getLedgers().forEach(l => {
    const gnUpper = (l.groupName || "").toUpperCase();
    let isDirect = gnUpper === mainGroupName.toUpperCase();
    if (mainGroupName.toUpperCase() === "CURRENT ASSETS") {
      let current = gnUpper;
      let isCurrentAsset = false;
      for (let i = 0; i < 15; i++) {
        if (current === "FIXED ASSETS") {
          isCurrentAsset = false;
          break;
        }
        if (current === "CURRENT ASSETS" || current === "ASSETS" || ["BANK ACCOUNTS", "CASH-IN-HAND", "SUNDRY DEBTORS", "LOANS & ADVANCES(ASSET)", "DEPOSITS", "ADAVANCE TO SUPPLIER"].includes(current)) {
          isCurrentAsset = true;
          break;
        }
        const parent = allGroups.find(g => String(g.name || "").toUpperCase() === current);
        if (parent && parent.under) {
          current = String(parent.under || "").toUpperCase();
        } else {
          break;
        }
      }

      const belongsToSubgroup = filteredGroups.some(sub => {
        let cur = gnUpper;
        for (let i = 0; i < 10; i++) {
          if (cur === sub) return true;
          const parent = allGroups.find(g => String(g.name || "").toUpperCase() === cur);
          if (parent && parent.under) cur = String(parent.under || "").toUpperCase();
          else break;
        }
        return false;
      });

      if (isCurrentAsset && !belongsToSubgroup) {
        isDirect = true;
      }
    } else if (mainGroupName.toUpperCase() === "CURRENT LIABILITIES") {
      let current = gnUpper;
      let isCurrentLiab = false;
      for (let i = 0; i < 15; i++) {
        if (current === "CURRENT LIABILITIES" || current === "LIABILITIES" || ["SUNDRY CREDITORS", "DUTIES & TAXES", "BANK OD A/C", "PROVISIONS"].includes(current)) {
          isCurrentLiab = true;
          break;
        }
        const parent = allGroups.find(g => String(g.name || "").toUpperCase() === current);
        if (parent && parent.under) {
          current = String(parent.under || "").toUpperCase();
        } else {
          break;
        }
      }

      const belongsToSubgroup = filteredGroups.some(sub => {
        let cur = gnUpper;
        for (let i = 0; i < 10; i++) {
          if (cur === sub) return true;
          const parent = allGroups.find(g => String(g.name || "").toUpperCase() === cur);
          if (parent && parent.under) cur = String(parent.under || "").toUpperCase();
          else break;
        }
        return false;
      });

      if (isCurrentLiab && !belongsToSubgroup) {
        isDirect = true;
      }
    }

    if (isDirect) {
      const rawVal = balances[l.code] ? balances[l.code].balance : 0;
      if (Math.abs(rawVal) < 0.001) return;
      const absVal = Math.abs(rawVal);
      const balanceType = rawVal >= 0 ? "Dr" : "Cr";
      displayRows.push({
        name: l.name,
        type: "ledger",
        code: l.code,
        balanceStr: `\u20B9${absVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balanceType}`
      });
    }
  });

  // 3. Add closing stock if this is CURRENT ASSETS
  if (mainGroupName.toUpperCase() === "CURRENT ASSETS") {
    const closingStockVal = state.getStockValuationAtDate ? state.getStockValuationAtDate(reportEndDate) : 0;
    if (Math.abs(closingStockVal) >= 0.001) {
      displayRows.push({
        name: "Stock on Hand",
        type: "stock",
        balanceStr: `\u20B9${closingStockVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dr`
      });
    }
  }

  const rowsHtml = displayRows.map(r => {
    if (r.type === "group") {
      return `
        <tr class="pl-group-row-clickable" data-type="group" data-name="${r.name}" style="border-bottom: 1px solid #cbd5e1; cursor: pointer;" title="Double-click to view sub groups or ledgers">
          <td style="padding: 8px 12px; font-weight: bold; color: #1e3a8a; text-decoration: underline;">${r.name}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: bold;">${r.balanceStr}</td>
        </tr>
      `;
    } else if (r.type === "stock") {
      return `
        <tr class="pl-group-row-clickable" data-type="stock" style="border-bottom: 1px solid #cbd5e1; cursor: pointer;" title="Double-click to view detailed stock register">
          <td style="padding: 8px 12px; font-weight: bold; color: #1e3a8a; text-decoration: underline;">${r.name}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #334155;">${r.balanceStr}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="pl-group-row-clickable" data-type="ledger" data-code="${r.code}" style="border-bottom: 1px solid #cbd5e1; cursor: pointer;" title="Double-click to view ledger statement">
          <td style="padding: 8px 12px; font-weight: normal; color: #334155;">${r.name}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #334155;">${r.balanceStr}</td>
        </tr>
      `;
    }
  }).join("");

  overlay.innerHTML = `
    <div style="background: #fff; border: 2px solid #1e3a8a; border-radius: 4px; width: 450px; max-width: 90%; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: flex; flex-direction: column;">
      <div style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 10px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
        <span>Groups & Accounts under ${mainGroupName}</span>
        <button id="pl-groups-modal-close" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div style="padding: 15px; max-height: 350px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid #000; background-color: #f1f5f9; height: 28px;">
              <th style="padding: 6px 12px; text-align: left; font-weight: bold;">Name</th>
              <th style="padding: 6px 12px; text-align: right; font-weight: bold; width: 150px;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="2" style="padding: 20px; text-align: center; color: #888;">No subgroups or accounts with balances found.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div style="background: #f8fafc; padding: 8px 14px; text-align: right; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        Double-click any item to view its details
      </div>
    </div>
  `;

  root.appendChild(overlay);

  overlay.querySelector("#pl-groups-modal-close").addEventListener("click", () => {
    overlay.remove();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.addEventListener("dblclick", (e) => {
    const row = e.target.closest(".pl-group-row-clickable");
    if (!row) return;

    const rType = row.getAttribute("data-type");
    if (rType === "group") {
      const gName = row.getAttribute("data-name");
      handleGroupDoubleClick(gName, container);
    } else if (rType === "stock") {
      import("./inventory.js").then(m => {
        m.showDetailedStockRegisterModal();
      });
    } else {
      const code = row.getAttribute("data-code");
      if (code === "1200") {
        import("./inventory.js").then(m => {
          m.showDetailedStockRegisterModal();
        });
      } else {
        showIndividualLedgerModal(code);
      }
    }
  });
}

export function handleGroupDoubleClick(name, container) {
  let cleanName = name.toUpperCase();
  if (cleanName.includes("SUNDRY DEBTORS") || cleanName.includes("ACCOUNTS RECEIVABLE")) {
    name = "SUNDRY DEBTORS";
  } else if (cleanName.includes("SUNDRY CREDITORS") || cleanName.includes("ACCOUNTS PAYABLE")) {
    name = "SUNDRY CREDITORS";
  } else if (cleanName.includes("DUTIES & TAXES") || cleanName.includes("GST/VAT PAYABLE")) {
    name = "DUTIES & TAXES";
  }

  const allGroups = state.getAccountGroups ? state.getAccountGroups() : [];
  const subNames = allGroups.filter(g => (g.under || "").toUpperCase() === name.toUpperCase()).map(g => String(g.name || "").toUpperCase());
  
  if (name.toUpperCase() === "CURRENT LIABILITIES") {
    if (!subNames.includes("SUNDRY CREDITORS")) subNames.push("SUNDRY CREDITORS");
    if (!subNames.includes("DUTIES & TAXES")) subNames.push("DUTIES & TAXES");
    allGroups.forEach(g => {
      if ((g.under || "").toUpperCase() === "LIABILITIES") {
        const uName = String(g.name || "").toUpperCase();
        if (uName !== "CURRENT LIABILITIES" && !subNames.includes(uName)) {
          subNames.push(uName);
        }
      }
    });
  } else if (name.toUpperCase() === "CURRENT ASSETS") {
    if (!subNames.includes("SUNDRY DEBTORS")) subNames.push("SUNDRY DEBTORS");
    // Add any other group under ASSETS that is not FIXED ASSETS or CURRENT ASSETS
    allGroups.forEach(g => {
      if ((g.under || "").toUpperCase() === "ASSETS") {
        const uName = String(g.name || "").toUpperCase();
        if (uName !== "FIXED ASSETS" && uName !== "CURRENT ASSETS" && !subNames.includes(uName)) {
          subNames.push(uName);
        }
      }
    });
  }

  if (cleanName.includes("SUNDRY CREDITORS") || cleanName.includes("SUNDRY DEBTORS") || cleanName.includes("DUTIES & TAXES")) {
    showGroupSummaryModal(name);
    return;
  }

  if (subNames.length > 0) {
    showGroupsModal(name, subNames, container);
  } else {
    showGroupSummaryModal(name);
  }
}


export function showGroupSummaryModal(gName) {
  const safeGName = gName || "CAPITAL ACCOUNT";
  selectedGroupName = safeGName;
  const root = document.getElementById("modal-container-root") || document.body;
  if (!root) return;

  const modalId = `modal-group-summary-${safeGName.replace(/\s+/g, "-")}`;
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;

  const renderContent = () => {
    const html = renderGroupSummaryHtml();
    modalEl.innerHTML = `
      <div class="modal-content window-container" style="width: 1100px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; font-family: Tahoma, sans-serif;">
        <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 10px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
          <span>Group Summary: ${safeGName}</span>
          <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 15px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9;">
          ${html}
        </div>
      </div>
    `;
    applyReportModalContainerStyles(modalEl, modalEl.querySelector(".modal-content"));

    const closeBtn = modalEl.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());

    const groupSelect = modalEl.querySelector("#gs-group-select");
    if (groupSelect) {
      groupSelect.addEventListener("change", (e) => {
        selectedGroupName = e.target.value;
        renderContent();
      });
    }

    const chkDetail = modalEl.querySelector("#gs-chk-detail");
    if (chkDetail) {
      chkDetail.addEventListener("change", (e) => {
        groupDetailed = e.target.checked;
        renderContent();
      });
    }

    const chkAvoid = modalEl.querySelector("#gs-chk-avoidnon");
    if (chkAvoid) {
      chkAvoid.addEventListener("change", (e) => {
        avoidNonTransaction = e.target.checked;
        renderContent();
      });
    }

    const btnView = modalEl.querySelector("#gs-btn-view");
    if (btnView) {
      btnView.addEventListener("click", () => {
        const fromVal = modalEl.querySelector("#gs-from-date")?.value;
        const toVal = modalEl.querySelector("#gs-to-date")?.value;
        if (fromVal) reportStartDate = fromVal;
        if (toVal) reportEndDate = toVal;
        renderContent();
      });
    }

    const gsModalFromDate = modalEl.querySelector("#gs-from-date");
    const gsModalToDate = modalEl.querySelector("#gs-to-date");
    const handleGsModalDateChange = () => {
      const fromVal = gsModalFromDate?.value || "";
      const toVal = gsModalToDate?.value || "";
      if ((!fromVal || fromVal.length === 10) && (!toVal || toVal.length === 10)) {
        let changed = false;
        if (fromVal && fromVal !== reportStartDate) {
          reportStartDate = fromVal;
          changed = true;
        }
        if (toVal && toVal !== reportEndDate) {
          reportEndDate = toVal;
          changed = true;
        }
        if (changed) {
          renderContent();
        }
      }
    };
    if (gsModalFromDate) {
      gsModalFromDate.addEventListener("change", handleGsModalDateChange);
    }
    if (gsModalToDate) {
      gsModalToDate.addEventListener("change", handleGsModalDateChange);
    }

    const btnPrint = modalEl.querySelector("#gs-btn-print");
    if (btnPrint) {
      btnPrint.addEventListener("click", () => {
        window.print();
      });
    }

    const btnClose = modalEl.querySelector("#gs-btn-close");
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        modalEl.remove();
      });
    }

    const summaryTable = modalEl.querySelector("#gs-summary-table");
    if (summaryTable) {
      summaryTable.addEventListener("dblclick", (e) => {
        const row = e.target.closest("tr[data-account-id], tr[data-party-tab]");
        if (!row) return;

        const partyTab = row.getAttribute("data-party-tab");
        const accountId = row.getAttribute("data-account-id");

        if (partyTab) {
          activePartySubTab = partyTab;
          activeReportTab = "parties";
          modalEl.remove();
          if (window.reportsContainer) renderReports(window.reportsContainer);
          return;
        }

        if (accountId) {
          if (accountId === "1200") {
            import("./inventory.js").then(m => {
              m.showDetailedStockRegisterModal();
            });
          } else {
            showIndividualLedgerModal(accountId);
          }
        }
      });
    }
  };

  renderContent();
  root.appendChild(modalEl);
}

export function showIndividualLedgerModal(ledgerId) {
  const allAccounts = getAllIndividualLedgerAccounts();
  if (!ledgerId && allAccounts.length > 0) {
    ledgerId = allAccounts[0].id;
  }
  const resolvedAcc = resolveIndividualLedgerAccount(ledgerId, allAccounts);
  selectedIndividualLedgerId = resolvedAcc ? resolvedAcc.id : ledgerId;
  const root = document.getElementById("modal-container-root") || document.body;
  if (!root) return;
  const strLedgerId = String(ledgerId || "main");
  const modalId = `modal-individual-ledger-${strLedgerId.replace(/[\s:]+/g, "-")}`;
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;

  const renderContent = () => {
    const html = renderIndividualLedgerHtml();
    modalEl.innerHTML = `
      <div class="modal-content window-container" style="width: 96vw; max-width: 1600px; height: 92vh; max-height: 95vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; font-family: Tahoma, sans-serif;">
        <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 10px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a; flex-shrink: 0;">
          <span>Ledger Statement</span>
          <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 12px; overflow: hidden; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; background-color: #f1f5f9;">
          ${html}
        </div>
      </div>
    `;
    applyReportModalContainerStyles(modalEl, modalEl.querySelector(".modal-content"));

    const closeBtn = modalEl.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());

    setupLedgerCombobox(modalEl, (selectedId) => {
      selectedIndividualLedgerId = selectedId;
      renderContent();
    });

    const selectVType = modalEl.querySelector("#il-select-vtype");
    if (selectVType) {
      selectVType.addEventListener("change", (e) => {
        ledgerVoucherTypeFilter = e.target.value;
        renderContent();
      });
    }

    const chkPdc = modalEl.querySelector("#il-chk-pdc");
    if (chkPdc) {
      chkPdc.addEventListener("change", (e) => {
        ledgerIncludePdc = e.target.checked;
        renderContent();
      });
    }

    const chkMonthly = modalEl.querySelector("#il-chk-monthly");
    if (chkMonthly) {
      chkMonthly.addEventListener("change", (e) => {
        ledgerMonthly = e.target.checked;
        renderContent();
      });
    }

    const chkNarration = modalEl.querySelector("#il-chk-narration");
    if (chkNarration) {
      chkNarration.addEventListener("change", (e) => {
        ledgerShowNarration = e.target.checked;
        modalEl.querySelectorAll(".ledger-narration-text").forEach(el => {
          el.style.display = ledgerShowNarration ? "block" : "none";
        });
      });
    }

    const chkBalPrint = modalEl.querySelector("#il-chk-balprint");
    if (chkBalPrint) {
      chkBalPrint.addEventListener("change", (e) => {
        ledgerShowBalanceInPrint = e.target.checked;
        renderContent();
      });
    }

    const chkSummaryFinalOnly = modalEl.querySelector("#il-chk-summary-final-only");
    if (chkSummaryFinalOnly) {
      chkSummaryFinalOnly.addEventListener("change", (e) => {
        ledgerSummaryFinalPageOnly = e.target.checked;
        renderContent();
      });
    }

    const chkHideOp = modalEl.querySelector("#il-chk-hide-op");
    if (chkHideOp) {
      chkHideOp.addEventListener("change", (e) => {
        ledgerHideOp = e.target.checked;
        renderContent();
      });
    }

    const chkMerge = modalEl.querySelector("#il-chk-merge");
    if (chkMerge) {
      chkMerge.addEventListener("change", (e) => {
        ledgerMergeMultiple = e.target.checked;
        renderContent();
      });
    }

    const btnView = modalEl.querySelector("#il-btn-view");
    if (btnView) {
      btnView.addEventListener("click", () => {
        const fromVal = modalEl.querySelector("#il-from-date")?.value;
        const toVal = modalEl.querySelector("#il-to-date")?.value;
        if (fromVal) ledgerFromDate = fromVal;
        if (toVal) ledgerToDate = toVal;
        renderContent();
      });
    }

    const btnPrint = modalEl.querySelector("#il-btn-print");
    if (btnPrint) {
      btnPrint.addEventListener("click", () => {
        window.print();
      });
    }

    const btnClose = modalEl.querySelector("#il-btn-close");
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        modalEl.remove();
      });
    }

    const ledgerTable = modalEl.querySelector("#il-ledger-table");
    if (ledgerTable) {
      ledgerTable.addEventListener("dblclick", (e) => {
        const row = e.target.closest(".ledger-row-clickable");
        if (!row) return;

        const txId = row.getAttribute("data-tx-id");
        if (txId) {
          openVoucherOrInvoice(txId, modalEl, () => {
            renderContent();
          });
        }
      });
    }
  };

  renderContent();
  root.appendChild(modalEl);
}

export function showGstSalesReportHsnModal() {
  const root = document.getElementById("modal-container-root");
  
  // Date setup
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  // Unique HSN Codes
  const allHsnCodes = new Set();
  state.getMaterials().forEach(m => { if (m.hsnCode && m.hsnCode.trim() !== "") allHsnCodes.add(m.hsnCode.trim()); });
  state.getInvoices().forEach(inv => { (inv.items || []).forEach(item => { if (item.hsnCode && item.hsnCode.trim() !== "") allHsnCodes.add(item.hsnCode.trim()); }); });
  state.getSalesReturns().forEach(ret => { (ret.items || []).forEach(item => { if (item.hsnCode && item.hsnCode.trim() !== "") allHsnCodes.add(item.hsnCode.trim()); }); });
  const sortedHsn = Array.from(allHsnCodes).sort();

  const modalEl = document.createElement("div");
  modalEl.className = "modal-overlay active";
  modalEl.id = "gst-sales-hsn-overlay";
  modalEl.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000; position: fixed; top: 0; left: 0; right: 0; bottom: 0;";

  modalEl.innerHTML = `
    <div class="modal-container modal-lg" style="max-width:1300px; width: 96vw; height:88vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
      
      <!-- Header Ribbon -->
      <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
        <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice-dollar"></i> GST SALES REPORT [HSN/SAC CODE WISE]</div>
        <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="gsh-close-x-btn">&times;</button>
      </div>

      <!-- Filter Ribbon with fieldsets matching screenshot -->
      <div style="display: flex; gap: 10px; align-items: center; background: #cbd5e1; padding: 5px; border-radius: 4px;">
        <fieldset style="border: 1px solid #94a3b8; padding: 5px 10px; border-radius: 3px; display: flex; gap: 5px; align-items: center; margin: 0;">
          <legend style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b; padding: 0 5px; margin: 0; width: auto; border: none;">Date Range</legend>
          <span style="font-size: 0.75rem; font-weight: bold;">From</span>
          <input type="date" id="gsh-from-date" class="form-control" style="width:120px; padding:2px; font-size:0.75rem; height: 22px; border: 1px solid #94a3b8; background: white; color: black;" value="${firstDay}">
          <span style="font-size: 0.75rem; font-weight: bold;">To</span>
          <input type="date" id="gsh-to-date" class="form-control" style="width:120px; padding:2px; font-size:0.75rem; height: 22px; border: 1px solid #94a3b8; background: white; color: black;" value="${lastDay}">
        </fieldset>

        <fieldset style="border: 1px solid #94a3b8; padding: 5px 10px; border-radius: 3px; display: flex; flex-grow: 1; align-items: center; margin: 0;">
          <legend style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b; padding: 0 5px; margin: 0; width: auto; border: none;">HSN / SAC Code</legend>
          <select id="gsh-hsn-select" class="form-control" style="width:100%; padding:2px; font-size:0.75rem; height: 22px; border: 1px solid #94a3b8; background: white; color: black;">
            <option value="All">(All)</option>
            ${sortedHsn.map(h => `<option value="${h}">${h}</option>`).join("")}
          </select>
        </fieldset>

        <fieldset style="border: 1px solid #94a3b8; padding: 5px 10px; border-radius: 3px; display: flex; align-items: center; width: 180px; margin: 0;">
          <legend style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b; padding: 0 5px; margin: 0; width: auto; border: none;">Bill Type</legend>
          <select id="gsh-bill-type" class="form-control" style="width:100%; padding:2px; font-size:0.75rem; height: 22px; border: 1px solid #94a3b8; background: white; color: black;">
            <option value="All">All</option>
            <option value="With">With GSTIN</option>
            <option value="Without">Without GSTIN</option>
          </select>
        </fieldset>

        <div style="display: flex; gap: 5px; align-items: center; margin-left: auto;">
          <button type="button" id="gsh-btn-view" style="font-weight: bold; padding: 4px 18px; border: 1px solid #707070; background: #e1e1e1; color: black; border-radius: 3px; cursor: pointer; box-shadow: 1px 1px 1px white inset; font-size: 0.8rem; height: 26px;">View</button>
          <button type="button" id="gsh-btn-preview" style="font-weight: bold; padding: 4px 18px; border: 1px solid #707070; background: #e1e1e1; color: black; border-radius: 3px; cursor: pointer; box-shadow: 1px 1px 1px white inset; font-size: 0.8rem; height: 26px;">Preview</button>
          <button type="button" id="gsh-btn-close" style="font-weight: bold; padding: 4px 18px; border: 1px solid #707070; background: #e1e1e1; color: black; border-radius: 3px; cursor: pointer; box-shadow: 1px 1px 1px white inset; font-size: 0.8rem; height: 26px;">Close</button>
        </div>
      </div>

      <!-- Table Container -->
      <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 2px; display: flex; flex-direction: column;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
          <thead style="background: #1e3b8b; color: white; position: sticky; top:0; z-index: 10;">
            <tr>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">HSN/SAC Code</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 70px;">GST%</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 80px;">Qty</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 120px;">Taxable Value</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 110px;">SGST Amount</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 110px;">CGST Amount</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 110px;">IGST Amount</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 120px;">GST Amount</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 110px;">Cess Amount</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 130px;">Net Amount</th>
            </tr>
          </thead>
          <tbody id="gsh-table-body">
            <!-- Rows populated dynamically -->
          </tbody>
          <tfoot style="position: sticky; bottom: 0; background: #e2e8f0; font-weight: bold; z-index: 10;">
            <tr style="border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Total</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;"></td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;" id="gsh-total-qty">0</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;" id="gsh-total-taxable">0.00</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color:#0f766e;" id="gsh-total-sgst">0.00</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color:#0f766e;" id="gsh-total-cgst">0.00</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color:#b91c1c;" id="gsh-total-igst">0.00</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color:#1e3b8b;" id="gsh-total-gst">0.00</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;" id="gsh-total-cess">0.00</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color:#b91c1c;" id="gsh-total-net">0.00</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  `;

  const renderReportTable = () => {
    const fromDateVal = modalEl.querySelector("#gsh-from-date").value;
    const toDateVal = modalEl.querySelector("#gsh-to-date").value;
    const hsnFilter = modalEl.querySelector("#gsh-hsn-select").value;
    const billTypeFilter = modalEl.querySelector("#gsh-bill-type").value;

    const parseLocal = (dStr) => {
      if (!dStr) return new Date();
      const [y, m, d] = dStr.split("-");
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    };

    const startLimit = fromDateVal ? parseLocal(fromDateVal) : null;
    const endLimit = toDateVal ? parseLocal(toDateVal) : null;
    if (startLimit) startLimit.setHours(0,0,0,0);
    if (endLimit) endLimit.setHours(23,59,59,999);

    // Filter invoices
    const matchingInvoices = state.getInvoices().filter(inv => {
      if (inv.isCancelled) return false;
      const invDate = parseLocal(inv.date);
      if (startLimit && invDate < startLimit) return false;
      if (endLimit && invDate > endLimit) return false;

      const customer = state.getContacts().find(c => c.id === inv.contactId);
      const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
      if (billTypeFilter === "With" && !hasGstin) return false;
      if (billTypeFilter === "Without" && hasGstin) return false;

      return true;
    });

    // Filter returns
    const matchingReturns = state.getSalesReturns().filter(ret => {
      if (ret.isCancelled) return false;
      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;

      const customer = state.getContacts().find(c => c.id === ret.contactId);
      const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
      if (billTypeFilter === "With" && !hasGstin) return false;
      if (billTypeFilter === "Without" && hasGstin) return false;

      return true;
    });

    const grouped = {};

    const addGroupedItem = (item, isKerala, sign) => {
      const mat = state.getMaterials().find(m => m.id === item.materialId);
      const hsn = (item.hsnCode || (mat ? mat.hsnCode : "") || "").trim();
      
      if (hsnFilter !== "All" && hsn !== hsnFilter) return;

      const gstRate = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
      const qty = parseFloat(item.quantity) || 0;
      
      const itemAmt = sign > 0 
        ? (parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (qty * (parseFloat(item.price) || 0)))) || 0)
        : (qty * (parseFloat(item.price) || 0));

      const gstAmt = sign > 0
        ? (parseFloat(item.gstAmount || (itemAmt * (gstRate / 100))) || 0)
        : (itemAmt * (gstRate / 100));

      const cessAmt = getItemCess(item, itemAmt);

      const sgst = isKerala ? gstAmt / 2 : 0;
      const cgst = isKerala ? gstAmt / 2 : 0;
      const igst = isKerala ? 0 : gstAmt;

      const key = `${hsn}_${gstRate}`;
      if (!grouped[key]) {
        grouped[key] = {
          hsn,
          gstRate,
          qty: 0,
          taxableValue: 0,
          sgst: 0,
          cgst: 0,
          igst: 0,
          gstAmount: 0,
          cessAmount: 0,
          netAmount: 0
        };
      }

      grouped[key].qty += qty * sign;
      grouped[key].taxableValue += itemAmt * sign;
      grouped[key].sgst += sgst * sign;
      grouped[key].cgst += cgst * sign;
      grouped[key].igst += igst * sign;
      grouped[key].gstAmount += gstAmt * sign;
      grouped[key].cessAmount += cessAmt * sign;
      grouped[key].netAmount += (itemAmt + gstAmt + cessAmt) * sign;
    };

    matchingInvoices.forEach(inv => {
      const customer = state.getContacts().find(c => c.id === inv.contactId);
      const isKerala = !state.isInterstateSale(inv, customer);
      (inv.items || []).forEach(item => {
        addGroupedItem(item, isKerala, 1);
      });
    });

    matchingReturns.forEach(ret => {
      const customer = state.getContacts().find(c => c.id === ret.contactId);
      const isKerala = !state.isInterstateSalesReturn(ret, customer);
      (ret.items || []).forEach(item => {
        addGroupedItem(item, isKerala, -1);
      });
    });

    const rows = Object.values(grouped).sort((a, b) => {
      if (a.hsn !== b.hsn) return a.hsn.localeCompare(b.hsn);
      return a.gstRate - b.gstRate;
    });

    let totalQty = 0;
    let totalTaxable = 0;
    let totalSgst = 0;
    let totalCgst = 0;
    let totalIgst = 0;
    let totalGst = 0;
    let totalCess = 0;
    let totalNet = 0;

    const tbody = modalEl.querySelector("#gsh-table-body");
    tbody.innerHTML = rows.map(r => {
      totalQty += r.qty;
      totalTaxable += r.taxableValue;
      totalSgst += r.sgst;
      totalCgst += r.cgst;
      totalIgst += r.igst;
      totalGst += r.gstAmount;
      totalCess += r.cessAmount;
      totalNet += r.netAmount;

      return `
        <tr style="border-bottom: 1px solid #cbd5e1; cursor: pointer;" class="gsh-clickable-row" data-hsn="${r.hsn}" data-gst="${r.gstRate}">
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; font-family: monospace;">${r.hsn || "-"}</td>
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.gstRate}%</td>
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.qty}</td>
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.taxableValue.toFixed(2)}</td>
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color:#0f766e;">${r.sgst.toFixed(2)}</td>
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color:#0f766e;">${r.cgst.toFixed(2)}</td>
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color:#b91c1c;">${r.igst.toFixed(2)}</td>
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; font-weight: bold; color:#1e3b8b;">${r.gstAmount.toFixed(2)}</td>
          <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.cessAmount.toFixed(2)}</td>
          <td style="padding: 6px; text-align: right; font-weight: bold; color:#1e293b;">${r.netAmount.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 20px; font-style: italic; color: #64748b;">No records found for the selected period/filters.</td>
        </tr>
      `;
    }

    modalEl.querySelector("#gsh-total-qty").textContent = totalQty;
    modalEl.querySelector("#gsh-total-taxable").textContent = totalTaxable.toFixed(2);
    modalEl.querySelector("#gsh-total-sgst").textContent = totalSgst.toFixed(2);
    modalEl.querySelector("#gsh-total-cgst").textContent = totalCgst.toFixed(2);
    modalEl.querySelector("#gsh-total-igst").textContent = totalIgst.toFixed(2);
    modalEl.querySelector("#gsh-total-gst").textContent = totalGst.toFixed(2);
    modalEl.querySelector("#gsh-total-cess").textContent = totalCess.toFixed(2);
    modalEl.querySelector("#gsh-total-net").textContent = totalNet.toFixed(2);
  };

  const close = () => { modalEl.remove(); };
  modalEl.querySelector("#gsh-close-x-btn").addEventListener("click", close);
  modalEl.querySelector("#gsh-btn-close").addEventListener("click", close);

  const viewBtn = modalEl.querySelector("#gsh-btn-view");
  viewBtn.addEventListener("click", renderReportTable);

  const previewBtn = modalEl.querySelector("#gsh-btn-preview");
  previewBtn.addEventListener("click", () => {
    window.print();
  });

  // Attach automatic update change listeners
  modalEl.querySelector("#gsh-from-date").addEventListener("change", renderReportTable);
  modalEl.querySelector("#gsh-to-date").addEventListener("change", renderReportTable);
  modalEl.querySelector("#gsh-hsn-select").addEventListener("change", renderReportTable);
  modalEl.querySelector("#gsh-bill-type").addEventListener("change", renderReportTable);

  // Attach double-click listener on tbody
  const tbody = modalEl.querySelector("#gsh-table-body");
  tbody.addEventListener("dblclick", (e) => {
    const row = e.target.closest(".gsh-clickable-row");
    if (!row) return;
    const hsn = row.getAttribute("data-hsn") || "";
    const gst = parseFloat(row.getAttribute("data-gst")) || 0;
    
    const fromDateVal = modalEl.querySelector("#gsh-from-date").value;
    const toDateVal = modalEl.querySelector("#gsh-to-date").value;
    const billTypeFilter = modalEl.querySelector("#gsh-bill-type").value;
    
    showGstSalesReportHsnDetailModal(hsn, gst, fromDateVal, toDateVal, billTypeFilter);
  });

  renderReportTable();

  root.appendChild(modalEl);
}

export function showGstSalesReportHsnDetailModal(hsn, gst, fromDateVal, toDateVal, billTypeFilter) {
  const root = document.getElementById("modal-container-root");

  const parseLocal = (dStr) => {
    if (!dStr) return new Date();
    const [y, m, d] = dStr.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  };

  const startLimit = fromDateVal ? parseLocal(fromDateVal) : null;
  const endLimit = toDateVal ? parseLocal(toDateVal) : null;
  if (startLimit) startLimit.setHours(0,0,0,0);
  if (endLimit) endLimit.setHours(23,59,59,999);

  const getItemCess = (item, itemAmt) => {
    const options = state.getOptions();
    if (options.enableCess === false) return 0;
    if (item.cessAmount !== undefined) return parseFloat(item.cessAmount) || 0;
    if (item.cessPercent !== undefined) return itemAmt * (parseFloat(item.cessPercent) / 100);
    return 0;
  };

  // Filter invoices
  const invoices = state.getInvoices().filter(inv => {
    if (inv.isCancelled) return false;
    const invDate = parseLocal(inv.date);
    if (startLimit && invDate < startLimit) return false;
    if (endLimit && invDate > endLimit) return false;

    const customer = state.getContacts().find(c => c.id === inv.contactId);
    const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
    if (billTypeFilter === "With" && !hasGstin) return false;
    if (billTypeFilter === "Without" && hasGstin) return false;

    return true;
  });

  // Filter returns
  const returns = state.getSalesReturns().filter(ret => {
    if (ret.isCancelled) return false;
    const retDate = parseLocal(ret.date);
    if (startLimit && retDate < startLimit) return false;
    if (endLimit && retDate > endLimit) return false;

    const customer = state.getContacts().find(c => c.id === ret.contactId);
    const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
    if (billTypeFilter === "With" && !hasGstin) return false;
    if (billTypeFilter === "Without" && hasGstin) return false;

    return true;
  });

  const detailRows = [];

  // Filter items in invoices
  invoices.forEach(inv => {
    const customer = state.getContacts().find(c => c.id === inv.contactId);
    const isKerala = !state.isInterstateSale(inv, customer);
    (inv.items || []).forEach(item => {
      const mat = state.getMaterials().find(m => m.id === item.materialId);
      const itemHsn = (item.hsnCode || (mat ? mat.hsnCode : "") || "").trim();
      const itemGst = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
      
      if (itemHsn === hsn && itemGst === gst) {
        const qty = parseFloat(item.quantity) || 0;
        const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (qty * (parseFloat(item.price) || 0)))) || 0;
        const gstAmt = parseFloat(item.gstAmount || (itemAmt * (itemGst / 100))) || 0;
        const cessAmt = getItemCess(item, itemAmt);
        
        const sgst = isKerala ? gstAmt / 2 : 0;
        const cgst = isKerala ? gstAmt / 2 : 0;
        const igst = isKerala ? 0 : gstAmt;

        detailRows.push({
          id: inv.id,
          date: inv.date,
          type: "Invoice",
          voucherNo: inv.invoiceNo || inv.id,
          partyName: inv.contactName || (customer ? customer.name : "Unknown Customer"),
          qty,
          taxableValue: itemAmt,
          sgst,
          cgst,
          igst,
          cess: cessAmt,
          net: itemAmt + gstAmt + cessAmt
        });
      }
    });
  });

  // Filter items in returns
  returns.forEach(ret => {
    const customer = state.getContacts().find(c => c.id === ret.contactId);
    const isKerala = !state.isInterstateSalesReturn(ret, customer);
    (ret.items || []).forEach(item => {
      const mat = state.getMaterials().find(m => m.id === item.materialId);
      const itemHsn = (item.hsnCode || (mat ? mat.hsnCode : "") || "").trim();
      const itemGst = mat ? parseFloat(mat.taxRate || 18) : 18;
      
      if (itemHsn === hsn && itemGst === gst) {
        const qty = parseFloat(item.quantity) || 0;
        const itemAmt = qty * (parseFloat(item.price) || 0);
        const gstAmt = itemAmt * (itemGst / 100);
        const cessAmt = getItemCess(item, itemAmt);
        
        const sgst = isKerala ? gstAmt / 2 : 0;
        const cgst = isKerala ? gstAmt / 2 : 0;
        const igst = isKerala ? 0 : gstAmt;

        detailRows.push({
          id: ret.id,
          date: ret.date,
          type: "Sales Return",
          voucherNo: ret.voucherNo || ret.id,
          partyName: ret.contactName || (customer ? customer.name : "Unknown Customer"),
          qty: -qty,
          taxableValue: -itemAmt,
          sgst: -sgst,
          cgst: -cgst,
          igst: -igst,
          cess: -cessAmt,
          net: -(itemAmt + gstAmt + cessAmt)
        });
      }
    });
  });

  // Sort by date
  detailRows.sort((a, b) => a.date.localeCompare(b.date));

  const detailModalEl = document.createElement("div");
  detailModalEl.className = "modal-overlay active";
  detailModalEl.id = "gst-sales-hsn-detail-overlay";
  detailModalEl.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:3000; position: fixed; top: 0; left: 0; right: 0; bottom: 0;";

  const formatDateStr = (dStr) => formatDate(dStr);

  let totalQty = 0;
  let totalTaxable = 0;
  let totalSgst = 0;
  let totalCgst = 0;
  let totalIgst = 0;
  let totalCess = 0;
  let totalNet = 0;

  detailModalEl.innerHTML = `
    <div class="modal-container modal-lg" style="max-width:1200px; width: 92vw; height:80vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #3b82f6; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
      
      <!-- Header Ribbon -->
      <div style="background: linear-gradient(180deg, #1e3b8b 0%, #2563eb 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
        <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-list"></i> GST SALES DETAILS - HSN/SAC: ${hsn || "Unspecified"} (${gst}%)</div>
        <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="gshd-close-x-btn">&times;</button>
      </div>

      <!-- Info bar -->
      <div style="background: #e2e8f0; padding: 4px 10px; border-radius: 2px; font-weight: bold; color: #1e3b8b; display: flex; gap: 20px;">
        <span>Period: ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)}</span>
        <span>Bill Type: ${billTypeFilter === "All" ? "All Bills" : (billTypeFilter === "With" ? "With GSTIN" : "Without GSTIN")}</span>
        <span style="margin-left: auto; font-size: 0.75rem; font-style: italic; color: #475569;">* Double-click any row to open the original voucher</span>
      </div>

      <!-- Detail Table Container -->
      <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 2px;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="gshd-table">
          <thead style="background: #1e3b8b; color: white; position: sticky; top:0; z-index: 10;">
            <tr>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left; width: 100px;">Date</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left; width: 100px;">Type</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left; width: 100px;">Voucher No</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Party Name</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 70px;">Qty</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 110px;">Taxable Value</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 90px;">SGST</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 90px;">CGST</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 90px;">IGST</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 90px;">Cess</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 110px;">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${detailRows.map(r => {
              totalQty += r.qty;
              totalTaxable += r.taxableValue;
              totalSgst += r.sgst;
              totalCgst += r.cgst;
              totalIgst += r.igst;
              totalCess += r.cess;
              totalNet += r.net;

              const rowStyle = r.type === "Sales Return" ? "color: #b91c1c; font-style: italic; background-color: #fef2f2;" : "";
              return `
                <tr style="border-bottom: 1px solid #cbd5e1; cursor: pointer; ${rowStyle}" class="gshd-row-clickable" data-tx-id="${r.id}">
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1;">${formatDateStr(r.date)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; font-weight: 600;">${r.type}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; font-family: monospace;">${r.voucherNo}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1;">${r.partyName}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.qty}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.taxableValue.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.sgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.cgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.igst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right;">${r.cess.toFixed(2)}</td>
                  <td style="padding: 6px; text-align: right; font-weight: bold;">${r.net.toFixed(2)}</td>
                </tr>
              `;
            }).join("")}
            ${detailRows.length === 0 ? `
              <tr>
                <td colspan="11" style="text-align: center; padding: 20px; font-style: italic; color: #64748b;">No individual transactions found for this HSN/SAC Code.</td>
              </tr>
            ` : ""}
          </tbody>
          <tfoot style="position: sticky; bottom: 0; background: #e2e8f0; font-weight: bold; z-index: 10;">
            <tr style="border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
              <td colspan="4" style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Total</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${totalQty}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${totalTaxable.toFixed(2)}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${totalSgst.toFixed(2)}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${totalCgst.toFixed(2)}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${totalIgst.toFixed(2)}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${totalCess.toFixed(2)}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${totalNet.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Action buttons -->
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" id="gshd-btn-close" style="font-weight: bold; padding: 6px 20px; border: 1px solid #707070; background: #e1e1e1; color: black; border-radius: 3px; cursor: pointer; box-shadow: 1px 1px 1px white inset;">Close</button>
      </div>

    </div>
  `;

  const closeDetail = () => { detailModalEl.remove(); };
  detailModalEl.querySelector("#gshd-close-x-btn").addEventListener("click", closeDetail);
  detailModalEl.querySelector("#gshd-btn-close").addEventListener("click", closeDetail);

  // Double click details row to edit voucher
  const detailTable = detailModalEl.querySelector("#gshd-table");
  detailTable.addEventListener("dblclick", (e) => {
    const row = e.target.closest(".gshd-row-clickable");
    if (!row) return;
    const txId = row.getAttribute("data-tx-id");
    if (txId) {
      openVoucherOrInvoice(txId, detailModalEl, () => {
        // Refresh detail list after edit
        detailModalEl.remove();
        showGstSalesReportHsnDetailModal(hsn, gst, fromDateVal, toDateVal, billTypeFilter);
      });
    }
  });

  root.appendChild(detailModalEl);
}

export function showGstSalesReturnReportModal() {
  const root = document.getElementById("modal-container-root");
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const fiscalStartYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
  const defaultFrom = `${fiscalStartYear}-04-01`;
  const defaultTo = now.toISOString().split("T")[0];

  let fromDateVal = defaultFrom;
  let toDateVal = defaultTo;
  let gstRateFilter = "All";
  let billSeriesFilter = "All";
  let stateFilter = "All";
  let isMonthly = true;
  let isPartyWise = false;
  let billTypeFilter = "All";
  let showCustomerAddress = false;

  function render() {
    const contacts = state.getContacts();
    const salesReturns = state.getSalesReturns();
    const materials = state.getMaterials();

    const parseLocal = (dStr) => {
      if (!dStr) return new Date();
      const p = dStr.split("-");
      if (p.length === 3) return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      return new Date(dStr);
    };

    const formatRupees = (val) => {
      if (val < 0) return `-₹${Math.abs(val).toFixed(2)}`;
      return `₹${val.toFixed(2)}`;
    };

    const formatDateStr = (dStr) => formatDate(dStr);

    const startLimit = fromDateVal ? parseLocal(fromDateVal) : null;
    const endLimit = toDateVal ? parseLocal(toDateVal) : null;
    if (startLimit) startLimit.setHours(0,0,0,0);
    if (endLimit) endLimit.setHours(23,59,59,999);

    const filteredReturns = salesReturns.filter(ret => {
      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;

      const customer = contacts.find(c => c.id === ret.contactId);
      if (stateFilter !== "All") {
        const isKerala = !state.isInterstateSalesReturn(ret, customer);
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }

      if (billSeriesFilter !== "All" && ret.series !== billSeriesFilter) return false;

      if (billTypeFilter !== "All") {
        const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
        if (billTypeFilter === "B2B" && !hasGstin) return false;
        if (billTypeFilter === "B2C" && hasGstin) return false;
      }

      return true;
    });

    let rows = [];
    let grandAssessable = 0;
    let grandSgst = 0;
    let grandCgst = 0;
    let grandIgst = 0;
    let grandGst = 0;
    let grandCess = 0;
    let grandNet = 0;

    if (isMonthly) {
      const groups = {};
      filteredReturns.forEach(ret => {
        let retAssessable = 0;
        let retGst = 0;
        let retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = materials.find(m => m.id === item.materialId);
          const taxRate = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== taxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (taxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        if (retAssessable > 0) {
          const d = parseLocal(ret.date);
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          const sortKey = d.getFullYear() * 100 + d.getMonth();

          if (!groups[key]) {
            groups[key] = { key, sortKey, assessable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, cess: 0, net: 0 };
          }

          const customer = contacts.find(c => c.id === ret.contactId);
          const isKerala = !state.isInterstateSalesReturn(ret, customer);
          const cgst = isKerala ? retGst / 2 : 0;
          const sgst = isKerala ? retGst / 2 : 0;
          const igst = isKerala ? 0 : retGst;

          groups[key].assessable += retAssessable;
          groups[key].cgst += cgst;
          groups[key].sgst += sgst;
          groups[key].igst += igst;
          groups[key].gst += retGst;
          groups[key].cess += retCess;
          groups[key].net += (retAssessable + retGst + retCess);
        }
      });
      rows = Object.values(groups).sort((a,b) => a.sortKey - b.sortKey);
    } else if (isPartyWise) {
      const groups = {};
      filteredReturns.forEach(ret => {
        let retAssessable = 0;
        let retGst = 0;
        let retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = materials.find(m => m.id === item.materialId);
          const taxRate = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== taxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (taxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        if (retAssessable > 0) {
          const key = ret.contactName || "Unknown Customer";
          if (!groups[key]) {
            groups[key] = { key, assessable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, cess: 0, net: 0 };
          }

          const customer = contacts.find(c => c.id === ret.contactId);
          const isKerala = !state.isInterstateSalesReturn(ret, customer);
          const cgst = isKerala ? retGst / 2 : 0;
          const sgst = isKerala ? retGst / 2 : 0;
          const igst = isKerala ? 0 : retGst;

          groups[key].assessable += retAssessable;
          groups[key].cgst += cgst;
          groups[key].sgst += sgst;
          groups[key].igst += igst;
          groups[key].gst += retGst;
          groups[key].cess += retCess;
          groups[key].net += (retAssessable + retGst + retCess);
        }
      });
      rows = Object.values(groups).sort((a,b) => a.key.localeCompare(b.key));
    } else {
      filteredReturns.forEach(ret => {
        let retAssessable = 0;
        let retGst = 0;
        let retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = materials.find(m => m.id === item.materialId);
          const taxRate = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== taxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (taxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        if (retAssessable > 0) {
          const customer = contacts.find(c => c.id === ret.contactId);
          const isKerala = !state.isInterstateSalesReturn(ret, customer);
          const cgst = isKerala ? retGst / 2 : 0;
          const sgst = isKerala ? retGst / 2 : 0;
          const igst = isKerala ? 0 : retGst;

          rows.push({
            id: ret.id,
            ret: ret,
            key: `${formatDateStr(ret.date)} - ${ret.id}`,
            assessable: retAssessable,
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            gst: retGst,
            cess: retCess,
            net: (retAssessable + retGst + retCess)
          });
        }
      });
      rows.sort((a,b) => a.key.localeCompare(b.key));
    }

    rows.forEach(r => {
      grandAssessable += r.assessable;
      grandSgst += r.sgst;
      grandCgst += r.cgst;
      grandIgst += r.igst;
      grandGst += r.gst;
      grandCess += r.cess;
      grandNet += r.net;
    });

    const titleCol = isMonthly ? "Month" : (isPartyWise ? "Party" : "Voucher Details");

    root.innerHTML = `
      <div class="modal-overlay active" id="gst-sales-return-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
        <div class="modal-container modal-lg" style="max-width:1400px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
          
          <!-- Header Ribbon -->
          <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
            <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice-dollar"></i> SALES RETURN GST REPORT</div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="sret-close-x-btn">&times;</button>
          </div>

          <!-- Filter Bar -->
          <div style="background-color:#cbd5e1; padding:6px; border:1px solid #94a3b8; border-radius:2px; display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) 120px 80px; gap:8px; align-items:end;">
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">From:</label>
              <input type="date" id="sret-from-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${fromDateVal}">
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">To:</label>
              <input type="date" id="sret-to-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${toDateVal}">
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">GST %</label>
              <select id="sret-gst-rate" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
                <option value="All" ${gstRateFilter === 'All' ? 'selected' : ''}>All</option>
                <option value="5" ${gstRateFilter === '5' ? 'selected' : ''}>5%</option>
                <option value="12" ${gstRateFilter === '12' ? 'selected' : ''}>12%</option>
                <option value="18" ${gstRateFilter === '18' ? 'selected' : ''}>18%</option>
                <option value="28" ${gstRateFilter === '28' ? 'selected' : ''}>28%</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Bill Series</label>
              <select id="sret-bill-series" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
                <option value="All" ${billSeriesFilter === 'All' ? 'selected' : ''}>All</option>
                ${Array.from(new Set(salesReturns.map(sr => sr.series).filter(Boolean))).map(s => `<option value="${s}" ${billSeriesFilter === s ? 'selected' : ''}>${s}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">State</label>
              <select id="sret-state" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
                <option value="All" ${stateFilter === 'All' ? 'selected' : ''}>All</option>
                <option value="KERALA" ${stateFilter === 'KERALA' ? 'selected' : ''}>KERALA</option>
                <option value="OUTSTATE" ${stateFilter === 'OUTSTATE' ? 'selected' : ''}>OUTSIDE STATE</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Bill Type</label>
              <select id="sret-bill-type" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
                <option value="All" ${billTypeFilter === 'All' ? 'selected' : ''}>All</option>
                <option value="B2B" ${billTypeFilter === 'B2B' ? 'selected' : ''}>B2B</option>
                <option value="B2C" ${billTypeFilter === 'B2C' ? 'selected' : ''}>B2C</option>
              </select>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
                <input type="checkbox" id="sret-monthly-chk" ${isMonthly ? 'checked' : ''}> Monthly
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
                <input type="checkbox" id="sret-party-chk" ${isPartyWise ? 'checked' : ''}> Party Wise
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
                <input type="checkbox" id="sret-addr-chk" ${showCustomerAddress ? 'checked' : ''}> Show Customer Address
              </label>
            </div>
            
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn btn-secondary" id="btn-sret-view" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">View</button>
              <button type="button" class="btn btn-secondary" id="btn-sret-close" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">Close</button>
            </div>
          </div>

          <!-- Content Area / Table Container -->
          <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 10px;">
            <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
              Sales Return GST Report from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)} GST ${gstRateFilter === 'All' ? 'All %' : gstRateFilter + '%'} Series ${billSeriesFilter}
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; color:black;">
              <thead>
                <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
                  <th style="padding:6px; border-right:1px solid #cbd5e1;">${titleCol}</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">Return Value</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">SGST</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">CGST</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">IGST</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">GST TOTAL</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">Cess</th>
                  <th style="padding:6px; text-align:right;">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr class="sret-row" data-id="${row.id || ''}" style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'">
                    <td style="padding:6px; border-right:1px solid #cbd5e1; font-weight:bold;">${row.key}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.sgst.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.cgst.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${row.igst.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${row.gst.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">${row.cess.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; font-weight:bold; color:#1e293b;">${row.net.toFixed(2)}</td>
                  </tr>
                `).join("")}
                ${rows.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No records found.</td>
                  </tr>
                ` : ""}
                <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
                  <td style="padding:6px; border-right:1px solid #cbd5e1;">Total:</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${grandAssessable.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${grandSgst.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${grandCgst.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#b91c1c;">${grandIgst.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#1e3b8b;">${grandGst.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${grandCess.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; font-weight:800; color:#1e293b;">${grandNet.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    `;

    const overlay = document.getElementById("gst-sales-return-overlay");
    const close = () => {
      if (overlay) overlay.classList.remove("active");
      root.innerHTML = "";
    };

    document.getElementById("sret-close-x-btn").addEventListener("click", close);
    document.getElementById("btn-sret-close").addEventListener("click", close);

    document.getElementById("btn-sret-view").addEventListener("click", () => {
      fromDateVal = document.getElementById("sret-from-date").value;
      toDateVal = document.getElementById("sret-to-date").value;
      gstRateFilter = document.getElementById("sret-gst-rate").value;
      billSeriesFilter = document.getElementById("sret-bill-series").value;
      stateFilter = document.getElementById("sret-state").value;
      billTypeFilter = document.getElementById("sret-bill-type").value;
      isMonthly = document.getElementById("sret-monthly-chk").checked;
      isPartyWise = document.getElementById("sret-party-chk").checked;
      showCustomerAddress = document.getElementById("sret-addr-chk").checked;

      render();
    });

    document.getElementById("sret-monthly-chk").addEventListener("change", (e) => {
      if (e.target.checked) document.getElementById("sret-party-chk").checked = false;
    });
    document.getElementById("sret-party-chk").addEventListener("change", (e) => {
      if (e.target.checked) document.getElementById("sret-monthly-chk").checked = false;
    });

    root.querySelectorAll(".sret-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const id = row.getAttribute("data-id");
        if (id) {
          const ret = salesReturns.find(r => r.id === id);
          if (ret) {
            close();
            import("./transactions.js").then(m => {
              m.showSalesReturnModal(document.getElementById("window-content-area"), ret, () => showGstSalesReturnReportModal());
            });
          }
        } else {
          const key = row.querySelector("td").innerText;
          if (isMonthly) {
            const parts = key.split(" ");
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthIdx = monthNames.indexOf(parts[0]);
            if (monthIdx !== -1) {
              const year = parseInt(parts[1]);
              const end = new Date(year, monthIdx + 1, 0);
              fromDateVal = `${year}-${String(monthIdx+1).padStart(2,'0')}-01`;
              toDateVal = `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
              isMonthly = false;
              isPartyWise = false;
              render();
            }
          } else if (isPartyWise) {
            isMonthly = false;
            isPartyWise = false;
            render();
          }
        }
      });
    });
  }

  render();
}

export function showGstPurchaseReturnReportModal() {
  const root = document.getElementById("modal-container-root");
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const fiscalStartYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
  const defaultFrom = `${fiscalStartYear}-04-01`;
  const defaultTo = now.toISOString().split("T")[0];

  let fromDateVal = defaultFrom;
  let toDateVal = defaultTo;
  let gstRateFilter = "All";
  let billSeriesFilter = "All";
  let stateFilter = "All";
  let isMonthly = true;
  let isPartyWise = false;
  let showVendorAddress = false;

  function render() {
    const contacts = state.getContacts();
    const purchaseReturns = state.getPurchaseReturns();
    const materials = state.getMaterials();

    const parseLocal = (dStr) => {
      if (!dStr) return new Date();
      const p = dStr.split("-");
      if (p.length === 3) return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      return new Date(dStr);
    };

    const formatRupees = (val) => {
      if (val < 0) return `-₹${Math.abs(val).toFixed(2)}`;
      return `₹${val.toFixed(2)}`;
    };

    const formatDateStr = (dStr) => formatDate(dStr);

    const startLimit = fromDateVal ? parseLocal(fromDateVal) : null;
    const endLimit = toDateVal ? parseLocal(toDateVal) : null;
    if (startLimit) startLimit.setHours(0,0,0,0);
    if (endLimit) endLimit.setHours(23,59,59,999);

    const filteredReturns = purchaseReturns.filter(ret => {
      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;

      if (stateFilter !== "All") {
        const vendor = contacts.find(c => c.id === (ret.supplierId || ret.contactId));
        const isKerala = !state.isInterstatePurchaseReturn(ret, vendor);
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }

      if (billSeriesFilter !== "All" && ret.series !== billSeriesFilter) return false;

      return true;
    });

    let rows = [];
    let grandAssessable = 0;
    let grandSgst = 0;
    let grandCgst = 0;
    let grandIgst = 0;
    let grandGst = 0;
    let grandCess = 0;
    let grandNet = 0;

    if (isMonthly) {
      const groups = {};
      filteredReturns.forEach(ret => {
        let retAssessable = 0;
        let retGst = 0;
        let retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = materials.find(m => m.id === item.materialId);
          const taxRate = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== taxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (taxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        if (retAssessable > 0) {
          const d = parseLocal(ret.date);
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          const sortKey = d.getFullYear() * 100 + d.getMonth();

          if (!groups[key]) {
            groups[key] = { key, sortKey, assessable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, cess: 0, net: 0 };
          }

          const vendor = contacts.find(c => c.id === (ret.supplierId || ret.contactId));
          const isKerala = !state.isInterstatePurchaseReturn(ret, vendor);
          const cgst = isKerala ? retGst / 2 : 0;
          const sgst = isKerala ? retGst / 2 : 0;
          const igst = isKerala ? 0 : retGst;

          groups[key].assessable += retAssessable;
          groups[key].cgst += cgst;
          groups[key].sgst += sgst;
          groups[key].igst += igst;
          groups[key].gst += retGst;
          groups[key].cess += retCess;
          groups[key].net += (retAssessable + retGst + retCess);
        }
      });
      rows = Object.values(groups).sort((a,b) => a.sortKey - b.sortKey);
    } else if (isPartyWise) {
      const groups = {};
      filteredReturns.forEach(ret => {
        let retAssessable = 0;
        let retGst = 0;
        let retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = materials.find(m => m.id === item.materialId);
          const taxRate = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== taxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (taxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        if (retAssessable > 0) {
          const key = ret.contactName || "Unknown Vendor";
          if (!groups[key]) {
            groups[key] = { key, assessable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, cess: 0, net: 0 };
          }

          const vendor = contacts.find(c => c.id === (ret.supplierId || ret.contactId));
          const isKerala = !state.isInterstatePurchaseReturn(ret, vendor);
          const cgst = isKerala ? retGst / 2 : 0;
          const sgst = isKerala ? retGst / 2 : 0;
          const igst = isKerala ? 0 : retGst;

          groups[key].assessable += retAssessable;
          groups[key].cgst += cgst;
          groups[key].sgst += sgst;
          groups[key].igst += igst;
          groups[key].gst += retGst;
          groups[key].cess += retCess;
          groups[key].net += (retAssessable + retGst + retCess);
        }
      });
      rows = Object.values(groups).sort((a,b) => a.key.localeCompare(b.key));
    } else {
      filteredReturns.forEach(ret => {
        let retAssessable = 0;
        let retGst = 0;
        let retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = materials.find(m => m.id === item.materialId);
          const taxRate = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== taxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (taxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        if (retAssessable > 0) {
          const vendor = contacts.find(c => c.id === (ret.supplierId || ret.contactId));
          const isKerala = !state.isInterstatePurchaseReturn(ret, vendor);
          const cgst = isKerala ? retGst / 2 : 0;
          const sgst = isKerala ? retGst / 2 : 0;
          const igst = isKerala ? 0 : retGst;

          rows.push({
            id: ret.id,
            ret: ret,
            key: `${formatDateStr(ret.date)} - ${ret.id}`,
            assessable: retAssessable,
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            gst: retGst,
            cess: retCess,
            net: (retAssessable + retGst + retCess)
          });
        }
      });
      rows.sort((a,b) => a.key.localeCompare(b.key));
    }

    rows.forEach(r => {
      grandAssessable += r.assessable;
      grandSgst += r.sgst;
      grandCgst += r.cgst;
      grandIgst += r.igst;
      grandGst += r.gst;
      grandCess += r.cess;
      grandNet += r.net;
    });

    const titleCol = isMonthly ? "Month" : (isPartyWise ? "Party" : "Voucher Details");

    root.innerHTML = `
      <div class="modal-overlay active" id="gst-purchase-return-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
        <div class="modal-container modal-lg" style="max-width:1400px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
          
          <!-- Header Ribbon -->
          <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
            <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice-dollar"></i> PURCHASE RETURN GST REPORT</div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="pret-close-x-btn">&times;</button>
          </div>

          <!-- Filter Bar -->
          <div style="background-color:#cbd5e1; padding:6px; border:1px solid #94a3b8; border-radius:2px; display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) 120px 80px; gap:8px; align-items:end;">
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">From:</label>
              <input type="date" id="pret-from-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${fromDateVal}">
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">To:</label>
              <input type="date" id="pret-to-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${toDateVal}">
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">GST %</label>
              <select id="pret-gst-rate" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
                <option value="All" ${gstRateFilter === 'All' ? 'selected' : ''}>All</option>
                <option value="5" ${gstRateFilter === '5' ? 'selected' : ''}>5%</option>
                <option value="12" ${gstRateFilter === '12' ? 'selected' : ''}>12%</option>
                <option value="18" ${gstRateFilter === '18' ? 'selected' : ''}>18%</option>
                <option value="28" ${gstRateFilter === '28' ? 'selected' : ''}>28%</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Bill Series</label>
              <select id="pret-bill-series" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
                <option value="All" ${billSeriesFilter === 'All' ? 'selected' : ''}>All</option>
                ${Array.from(new Set(purchaseReturns.map(pr => pr.series).filter(Boolean))).map(s => `<option value="${s}" ${billSeriesFilter === s ? 'selected' : ''}>${s}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">State</label>
              <select id="pret-state" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
                <option value="All" ${stateFilter === 'All' ? 'selected' : ''}>All</option>
                <option value="KERALA" ${stateFilter === 'KERALA' ? 'selected' : ''}>KERALA</option>
                <option value="OUTSTATE" ${stateFilter === 'OUTSTATE' ? 'selected' : ''}>OUTSIDE STATE</option>
              </select>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
                <input type="checkbox" id="pret-monthly-chk" ${isMonthly ? 'checked' : ''}> Monthly
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
                <input type="checkbox" id="pret-party-chk" ${isPartyWise ? 'checked' : ''}> Party Wise
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
                <input type="checkbox" id="pret-addr-chk" ${showVendorAddress ? 'checked' : ''}> Show Vendor Address
              </label>
            </div>
            
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn btn-secondary" id="btn-pret-view" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">View</button>
              <button type="button" class="btn btn-secondary" id="btn-pret-close" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">Close</button>
            </div>
          </div>

          <!-- Content Area / Table Container -->
          <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 10px;">
            <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
              Purchase Return GST Report from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)} GST ${gstRateFilter === 'All' ? 'All %' : gstRateFilter + '%'} Series ${billSeriesFilter}
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; color:black;">
              <thead>
                <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
                  <th style="padding:6px; border-right:1px solid #cbd5e1;">${titleCol}</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">Assessable Value</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">SGST</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">CGST</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">IGST</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">GST TOTAL</th>
                  <th style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">Cess</th>
                  <th style="padding:6px; text-align:right;">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr class="pret-row" data-id="${row.id || ''}" style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'">
                    <td style="padding:6px; border-right:1px solid #cbd5e1; font-weight:bold;">${row.key}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.sgst.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.cgst.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${row.igst.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${row.gst.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1;">${row.cess.toFixed(2)}</td>
                    <td style="padding:6px; text-align:right; font-weight:bold; color:#1e293b;">${row.net.toFixed(2)}</td>
                  </tr>
                `).join("")}
                ${rows.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No records found.</td>
                  </tr>
                ` : ""}
                <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
                  <td style="padding:6px; border-right:1px solid #cbd5e1;">Total:</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${grandAssessable.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${grandSgst.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#0f766e;">${grandCgst.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#b91c1c;">${grandIgst.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800; color:#1e3b8b;">${grandGst.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; border-right:1px solid #cbd5e1; font-weight:800;">${grandCess.toFixed(2)}</td>
                  <td style="padding:6px; text-align:right; font-weight:800; color:#1e293b;">${grandNet.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    `;

    const overlay = document.getElementById("gst-purchase-return-overlay");
    const close = () => {
      if (overlay) overlay.classList.remove("active");
      root.innerHTML = "";
    };

    document.getElementById("pret-close-x-btn").addEventListener("click", close);
    document.getElementById("btn-pret-close").addEventListener("click", close);

    document.getElementById("btn-pret-view").addEventListener("click", () => {
      fromDateVal = document.getElementById("pret-from-date").value;
      toDateVal = document.getElementById("pret-to-date").value;
      gstRateFilter = document.getElementById("pret-gst-rate").value;
      billSeriesFilter = document.getElementById("pret-bill-series").value;
      stateFilter = document.getElementById("pret-state").value;
      isMonthly = document.getElementById("pret-monthly-chk").checked;
      isPartyWise = document.getElementById("pret-party-chk").checked;
      showVendorAddress = document.getElementById("pret-addr-chk").checked;

      render();
    });

    document.getElementById("pret-monthly-chk").addEventListener("change", (e) => {
      if (e.target.checked) document.getElementById("pret-party-chk").checked = false;
    });
    document.getElementById("pret-party-chk").addEventListener("change", (e) => {
      if (e.target.checked) document.getElementById("pret-monthly-chk").checked = false;
    });

    root.querySelectorAll(".pret-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const id = row.getAttribute("data-id");
        if (id) {
          const ret = purchaseReturns.find(r => r.id === id);
          if (ret) {
            close();
            import("./transactions.js").then(m => {
              m.showPurchaseReturnModal(document.getElementById("window-content-area"), ret, () => showGstPurchaseReturnReportModal());
            });
          }
        } else {
          const key = row.querySelector("td").innerText;
          if (isMonthly) {
            const parts = key.split(" ");
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthIdx = monthNames.indexOf(parts[0]);
            if (monthIdx !== -1) {
              const year = parseInt(parts[1]);
              const end = new Date(year, monthIdx + 1, 0);
              fromDateVal = `${year}-${String(monthIdx+1).padStart(2,'0')}-01`;
              toDateVal = `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
              isMonthly = false;
              isPartyWise = false;
              render();
            }
          } else if (isPartyWise) {
            isMonthly = false;
            isPartyWise = false;
            render();
          }
        }
      });
    });
  }

  render();
}


export function printBreakdownReport(contactId) {
  const contacts = state.getContacts();
  const selectedContact = contacts.find(c => c.id === contactId);
  if (!selectedContact) {
    alert("Customer/Vendor profile not found.");
    return;
  }

  const activeCompany = (state.getRegisteredCompanies && state.getRegisteredCompanies().find(c => c.id === state.getActiveCompanyId())) || { name: "", address: "", gstin: "", phone: "" };
  const companyName = (activeCompany.name || "").toUpperCase();

  const isCustomer = selectedContact.type === "customer" || selectedContact.listInCustomerList === true || selectedContact.groupName === "SUNDRY DEBTORS" || activePartySubTab === "customer" || activePartySubTab === "debtors";
  const headerLabel = isCustomer ? "Site / Sub-Ledger Name" : "Branch / Sub-Ledger Name";
  const reportTitle = isCustomer ? "Site & Sub-Ledger Breakdown Statement" : "Branch & Sub-Ledger Breakdown Statement";

  const childLedgers = (state.getLedgers() || []).filter(l => {
    if (!l || isPrimaryContactLedger(l, selectedContact)) return false;
    return l.parentCustomerId === selectedContact.id || String(l.groupName || "").toUpperCase() === String(selectedContact.name || "").toUpperCase();
  });
  
  const contactSites = Array.from(new Set([
    ...(Array.isArray(selectedContact.sites) ? selectedContact.sites : []),
    ...(state.transactions || [])
      .filter(tx => (tx.entries || []).some(e => e.accountId.startsWith(selectedContact.id + "::")) || ((tx.contactId === selectedContact.id || (tx.description || "").includes(selectedContact.name)) && tx.siteName))
      .map(tx => {
        const entry = (tx.entries || []).find(e => e.accountId.startsWith(selectedContact.id + "::"));
        if (entry) return entry.accountId.split("::")[1];
        return tx.siteName;
      })
      .filter(Boolean)
  ]));

  let sumSiteOp = 0;
  let sumSiteDr = 0;
  let sumSiteCr = 0;
  let rowsHtml = "";

  contactSites.forEach(site => {
    let siteOp = 0;
    let siteDr = 0;
    let siteCr = 0;

    const siteLedgerId = `${selectedContact.id}::${site}`;
    const seenSiteTxSignatures = new Set();
    const seenSiteTxIds = new Set();

    (state.transactions || []).forEach(tx => {
      if (!tx || !tx.id || seenSiteTxIds.has(tx.id)) return;
      let targetEntry = (tx.entries || []).find(e => e.accountId === siteLedgerId);

      if (!targetEntry) {
        const txRef = (tx.reference || "");
        const matchedInv = state.getInvoices().find(i => {
          const base = (i.contactId || "").split("::")[0];
          return base === selectedContact.id && txRef && (txRef === i.voucherNo || txRef === i.id || (i.refNo && txRef === i.refNo));
        });
        const matchedPur = state.getPurchases().find(p => {
          const base = (p.contactId || "").split("::")[0];
          return base === selectedContact.id && txRef && (txRef === p.voucherNo || (p.invoiceNo && txRef === p.invoiceNo) || (p.refNo && txRef === p.refNo));
        });
        const matchedSalesRet = state.getSalesReturns().find(sr => {
          const base = (sr.contactId || "").split("::")[0];
          return base === selectedContact.id && txRef && (txRef === sr.id || txRef === sr.voucherNo);
        });
        const matchedPurRet = state.getPurchaseReturns().find(pr => {
          const base = (pr.contactId || "").split("::")[0];
          return base === selectedContact.id && txRef && (txRef === pr.id || txRef === pr.voucherNo);
        });

        const txSite = tx.siteName || "";
        const matchedTxSite = txSite || (matchedInv ? matchedInv.siteName : (matchedPur ? matchedPur.siteName : (matchedSalesRet ? matchedSalesRet.siteName : (matchedPurRet ? matchedPurRet.siteName : ""))));

        const isDocMatch = !!matchedInv || !!matchedPur || !!matchedSalesRet || !!matchedPurRet;
        let isMatch = false;

        if (isDocMatch && matchedTxSite && matchedTxSite.toLowerCase() === site.toLowerCase()) {
          isMatch = true;
        } else {
          const isCust = selectedContact.type === "customer" || selectedContact.listInCustomerList === true;
          const refStr = String(tx.reference || "");
          const txDescLower = (tx.description || "").toLowerCase();
          const selContactNameLower = (selectedContact.name || "").trim().toLowerCase();
          const nameMatch = selContactNameLower !== "" && (txDescLower.includes(selContactNameLower) || refStr.toLowerCase().includes(selContactNameLower));
          if (nameMatch) {
            const isPurOrPay = refStr.toLowerCase().includes("purchase") || refStr.startsWith("DN-") || txDescLower.includes("payment to supplier") || txDescLower.includes("purchase of building");
            const isInvOrRec = refStr.toLowerCase().includes("invoice") || refStr.startsWith("CN-") || txDescLower.includes("receipt from customer") || txDescLower.includes("sales invoice to");
            if ((isCust && !isPurOrPay) || (!isCust && !isInvOrRec)) {
              if (matchedTxSite && matchedTxSite.toLowerCase() === site.toLowerCase()) {
                isMatch = true;
              }
            }
          }
        }

        if (isMatch) {
          targetEntry = findMatchingContactEntry(tx.entries, selectedContact, childLedgers);
        }
      }

      if (targetEntry) {
        seenSiteTxIds.add(tx.id);

        const txDate = new Date(tx.date);
        const start = filterFromDate ? new Date(filterFromDate) : null;
        const end = filterToDate ? new Date(filterToDate) : null;

        if (start && txDate < start) {
          if (isCustomer) {
            siteOp += (targetEntry.debit - targetEntry.credit);
          } else {
            siteOp += (targetEntry.credit - targetEntry.debit);
          }
        } else if ((!start || txDate >= start) && (!end || txDate <= end)) {
          siteDr += targetEntry.debit;
          siteCr += targetEntry.credit;
        }
      }
    });

    const siteClosing = isCustomer ? (siteOp + siteDr - siteCr) : (siteOp + siteCr - siteDr);
    const opSuffix = isCustomer ? (siteOp >= 0 ? "Dr" : "Cr") : (siteOp >= 0 ? "Cr" : "Dr");
    const closingSuffix = isCustomer ? (siteClosing >= 0 ? "Dr" : "Cr") : (siteClosing >= 0 ? "Cr" : "Dr");

    sumSiteOp += siteOp;
    sumSiteDr += siteDr;
    sumSiteCr += siteCr;

    rowsHtml += `
      <tr>
        <td style="padding: 6px 10px; border: 1px solid #777; font-weight: bold;">${site}</td>
        <td style="padding: 6px 10px; border: 1px solid #777; text-align: right;">₹${Math.abs(siteOp).toFixed(2)} ${opSuffix}</td>
        <td style="padding: 6px 10px; border: 1px solid #777; text-align: right; color: #0f766e;">₹${siteDr.toFixed(2)}</td>
        <td style="padding: 6px 10px; border: 1px solid #777; text-align: right; color: #b91c1c;">₹${siteCr.toFixed(2)}</td>
        <td style="padding: 6px 10px; border: 1px solid #777; text-align: right; font-weight: bold; color: ${siteClosing >= 0 ? '#15803d' : '#b91c1c'};">₹${Math.abs(siteClosing).toFixed(2)} ${closingSuffix}</td>
      </tr>
    `;
  });

  childLedgers.forEach(l => {
    const rawOp = parseFloat(l.openingBalance) || 0;
    let lOp = l.balanceType === "Debit" ? rawOp : -rawOp;
    let lDr = 0;
    let lCr = 0;
    const seenChildTxIds = new Set();

    (state.transactions || []).forEach(tx => {
      if (!tx || !tx.id || seenChildTxIds.has(tx.id)) return;
      const targetEntry = (tx.entries || []).find(e => e.accountId === l.code);
      if (targetEntry) {
        seenChildTxIds.add(tx.id);

        const txDate = new Date(tx.date);
        const start = filterFromDate ? new Date(filterFromDate) : null;
        const end = filterToDate ? new Date(filterToDate) : null;

        if (start && txDate < start) {
          lOp += (targetEntry.debit - targetEntry.credit);
        } else if ((!start || txDate >= start) && (!end || txDate <= end)) {
          lDr += targetEntry.debit;
          lCr += targetEntry.credit;
        }
      }
    });

    const lClosing = lOp + lDr - lCr;
    const opSuffix = lOp >= 0 ? "Dr" : "Cr";
    const closingSuffix = lClosing >= 0 ? "Dr" : "Cr";

    sumSiteOp += lOp;
    sumSiteDr += lDr;
    sumSiteCr += lCr;

    rowsHtml += `
      <tr>
        <td style="padding: 6px 10px; border: 1px solid #777; font-weight: bold;">${l.name} (Sub-Ledger)</td>
        <td style="padding: 6px 10px; border: 1px solid #777; text-align: right;">₹${Math.abs(lOp).toFixed(2)} ${opSuffix}</td>
        <td style="padding: 6px 10px; border: 1px solid #777; text-align: right; color: #0f766e;">₹${lDr.toFixed(2)}</td>
        <td style="padding: 6px 10px; border: 1px solid #777; text-align: right; color: #b91c1c;">₹${lCr.toFixed(2)}</td>
        <td style="padding: 6px 10px; border: 1px solid #777; text-align: right; font-weight: bold; color: ${lClosing >= 0 ? '#15803d' : '#b91c1c'};">₹${Math.abs(lClosing).toFixed(2)} ${closingSuffix}</td>
      </tr>
    `;
  });

  const sumClosing = isCustomer ? (sumSiteOp + sumSiteDr - sumSiteCr) : (sumSiteOp + sumSiteCr - sumSiteDr);
  const totalClSuffix = isCustomer ? (sumClosing >= 0 ? "Dr" : "Cr") : (sumClosing >= 0 ? "Cr" : "Dr");
  const totalOpSuffix = isCustomer ? (sumSiteOp >= 0 ? "Dr" : "Cr") : (sumSiteOp >= 0 ? "Cr" : "Dr");

  const printDateStr = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const dateRangeStr = (filterFromDate && filterToDate) ? `Period: ${formatDateDisplay(filterFromDate)} to ${formatDateDisplay(filterToDate)}` : `Period: All-Time Cumulative`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print the breakdown statement.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle} - ${selectedContact.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            color: #111;
            margin: 0;
            padding: 10px;
          }
          .header-box {
            text-align: center;
            border-bottom: 2px solid #1e3b8b;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1e3b8b;
            letter-spacing: 1px;
            margin: 0 0 4px 0;
          }
          .report-title {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
            margin: 4px 0;
          }
          .sub-header {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 12px;
            background: #f8fafc;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 15px;
          }
          th {
            background-color: #e2e8f0 !important;
            border: 1px solid #64748b;
            padding: 8px;
            font-weight: bold;
            text-align: left;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          td {
            border: 1px solid #94a3b8;
            padding: 6px 8px;
          }
          .total-row td {
            background-color: #f1f5f9 !important;
            font-weight: bold;
            border-top: 2px solid #1e3b8b;
            border-bottom: 2px solid #1e3b8b;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .footer-note {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="company-name">${companyName}</div>
          ${activeCompany.address ? `<div style="font-size: 12px; color: #475569;">${activeCompany.address}</div>` : ""}
          <div class="report-title">${reportTitle}</div>
        </div>

        <div class="sub-header">
          <div>
            <strong>Party Name:</strong> ${selectedContact.name}<br>
            ${selectedContact.phone ? `<strong>Phone:</strong> ${selectedContact.phone}<br>` : ""}
            ${selectedContact.gstin ? `<strong>GSTIN:</strong> ${selectedContact.gstin}` : ""}
          </div>
          <div style="text-align: right;">
            <strong>${dateRangeStr}</strong><br>
            <strong>Generated on:</strong> ${printDateStr}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${headerLabel}</th>
              <th style="text-align: right; width: 140px;">Op. Balance</th>
              <th style="text-align: right; width: 120px;">Debit (₹)</th>
              <th style="text-align: right; width: 120px;">Credit (₹)</th>
              <th style="text-align: right; width: 140px;">Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding: 15px;">No breakdown entries found.</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td>TOTAL</td>
              <td style="text-align: right;">₹${Math.abs(sumSiteOp).toFixed(2)} ${totalOpSuffix}</td>
              <td style="text-align: right; color: #0f766e;">₹${sumSiteDr.toFixed(2)}</td>
              <td style="text-align: right; color: #b91c1c;">₹${sumSiteCr.toFixed(2)}</td>
              <td style="text-align: right; font-weight: bold; color: ${sumClosing >= 0 ? '#15803d' : '#b91c1c'};">₹${Math.abs(sumClosing).toFixed(2)} ${totalClSuffix}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-note">
          <span>Software: Material Ledger ERP</span>
          <span>Printed By: User</span>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function applyReportModalContainerStyles(modalEl, modalContent) {
  modalEl.className = "modal-overlay active non-blocking-overlay";
  modalEl.style.position = "fixed";
  modalEl.style.top = "32px";
  modalEl.style.left = "0";
  modalEl.style.width = "100%";
  modalEl.style.height = "calc(100% - 32px)";
  modalEl.style.backgroundColor = "transparent";
  modalEl.style.pointerEvents = "none";
  modalEl.style.display = "flex";
  modalEl.style.alignItems = "center";
  modalEl.style.justifyContent = "center";

  if (modalContent) {
    modalContent.style.pointerEvents = "auto";
    modalContent.style.boxShadow = "0 8px 30px rgba(0,0,0,0.35)";
    const openModals = document.querySelectorAll(".modal-overlay.active");
    const count = openModals.length;
    if (count > 0) {
      const offsetPx = (count % 6) * 30;
      modalContent.style.marginTop = `${offsetPx}px`;
      modalContent.style.marginLeft = `${offsetPx}px`;
    }
  }
}

export function showProfitLossModal() {
  const root = document.getElementById("modal-container-root") || document.body;
  if (!root) return;

  const modalId = "modal-profit-loss-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.innerHTML = `
    <div class="modal-content window-container" style="width: 1250px; max-width: 96%; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; font-family: Tahoma, sans-serif;">
      <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 8px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
        <span><i class="fa-solid fa-chart-line" style="margin-right: 6px;"></i> Profit & Loss Statement</span>
        <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div class="modal-body-container" style="padding: 10px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9; display: flex; flex-direction: column;">
      </div>
    </div>
  `;

  applyReportModalContainerStyles(modalEl, modalEl.querySelector(".modal-content"));
  root.appendChild(modalEl);
  bringToFront(modalEl);
  const bodyContainer = modalEl.querySelector(".modal-body-container");
  renderProfitLossReport(bodyContainer);

  const closeBtn = modalEl.querySelector(".modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());
}

export function showBalanceSheetModal() {
  const root = document.getElementById("modal-container-root") || document.body;
  if (!root) return;

  const modalId = "modal-balance-sheet-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.innerHTML = `
    <div class="modal-content window-container" style="width: 1250px; max-width: 96%; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; font-family: Tahoma, sans-serif;">
      <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 8px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
        <span><i class="fa-solid fa-scale-balanced" style="margin-right: 6px;"></i> Balance Sheet Report</span>
        <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div class="modal-body-container" style="padding: 10px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9; display: flex; flex-direction: column;">
      </div>
    </div>
  `;

  applyReportModalContainerStyles(modalEl, modalEl.querySelector(".modal-content"));
  root.appendChild(modalEl);
  bringToFront(modalEl);
  const bodyContainer = modalEl.querySelector(".modal-body-container");
  renderBalanceSheetReport(bodyContainer);

  const closeBtn = modalEl.querySelector(".modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());
}

export function showOpeningBalanceSheetModal() {
  const root = document.getElementById("modal-container-root") || document.body;
  if (!root) return;

  const modalId = "modal-opening-balance-sheet-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.innerHTML = `
    <div class="modal-content window-container" style="width: 1250px; max-width: 96%; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; font-family: Tahoma, sans-serif;">
      <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 8px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
        <span><i class="fa-solid fa-scale-balanced" style="margin-right: 6px;"></i> Opening Balance Sheet Report</span>
        <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div class="modal-body-container" style="padding: 10px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9; display: flex; flex-direction: column;">
      </div>
    </div>
  `;

  applyReportModalContainerStyles(modalEl, modalEl.querySelector(".modal-content"));
  root.appendChild(modalEl);
  bringToFront(modalEl);
  const bodyContainer = modalEl.querySelector(".modal-body-container");
  renderOpeningBalanceSheetReport(bodyContainer);

  const closeBtn = modalEl.querySelector(".modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());
}

export function showTrialBalanceModal() {
  const root = document.getElementById("modal-container-root") || document.body;
  if (!root) return;

  const modalId = "modal-trial-balance-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.innerHTML = `
    <div class="modal-content window-container" style="width: 1250px; max-width: 96%; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; font-family: Tahoma, sans-serif;">
      <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 8px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
        <span><i class="fa-solid fa-list-check" style="margin-right: 6px;"></i> Trial Balance Report</span>
        <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div class="modal-body-container" style="padding: 10px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9; display: flex; flex-direction: column;">
      </div>
    </div>
  `;

  applyReportModalContainerStyles(modalEl, modalEl.querySelector(".modal-content"));
  root.appendChild(modalEl);
  bringToFront(modalEl);
  const bodyContainer = modalEl.querySelector(".modal-body-container");
  renderTrialBalanceReport(bodyContainer);

  const closeBtn = modalEl.querySelector(".modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());
}

export function showTaxSummaryReportModal() {
  const root = document.getElementById("modal-container-root") || document.body;
  if (!root) return;

  const modalId = "modal-tax-summary-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.innerHTML = `
    <div class="modal-content window-container" style="width: 1250px; max-width: 96%; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; font-family: Tahoma, sans-serif;">
      <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 8px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
        <span><i class="fa-solid fa-receipt" style="margin-right: 6px;"></i> GST & Tax Summary Report</span>
        <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div class="modal-body-container" style="padding: 10px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9; display: flex; flex-direction: column;">
      </div>
    </div>
  `;

  applyReportModalContainerStyles(modalEl, modalEl.querySelector(".modal-content"));
  root.appendChild(modalEl);
  bringToFront(modalEl);
  const bodyContainer = modalEl.querySelector(".modal-body-container");
  renderTaxSummaryReport(bodyContainer);

  const closeBtn = modalEl.querySelector(".modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());
}

export function showPartiesReportModal(viewType = "customer") {
  filterSearchText = "";
  selectedPartyRowId = "";
  selectedMultipleCustomerIds = [];

  const root = document.getElementById("modal-container-root") || document.body;
  if (!root) return;

  const modalId = `modal-parties-report-${viewType}-overlay`;
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    bringToFront(existing);
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;

  const titleMap = {
    customer: "Customer Report",
    vendor: "Vendor Report",
    debtors: "Sundry Debtors Report",
    creditors: "Sundry Creditors Report"
  };

  modalEl.innerHTML = `
    <div class="modal-content window-container" style="width: 1250px; max-width: 96%; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; font-family: Tahoma, sans-serif;">
      <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 8px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
        <span><i class="fa-solid fa-users-rectangle" style="margin-right: 6px;"></i> ${titleMap[viewType] || "Parties & Ledger Report"}</span>
        <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div class="modal-body-container" style="padding: 10px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9; display: flex; flex-direction: column;">
      </div>
    </div>
  `;

  applyReportModalContainerStyles(modalEl, modalEl.querySelector(".modal-content"));
  root.appendChild(modalEl);
  bringToFront(modalEl);
  const bodyContainer = modalEl.querySelector(".modal-body-container");
  renderPartiesReportView(bodyContainer, viewType);

  const closeBtn = modalEl.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      filterSearchText = "";
      selectedPartyRowId = "";
      selectedMultipleCustomerIds = [];
      modalEl.remove();
    });
  }
}
