import { state, ACCOUNTS } from "../state.js";

let activeReportTab = "pl"; // 'trial', 'tax', 'parties', 'ledger'
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

// Party report sub-states
let activePartySubTab = "customer"; // 'customer', 'vendor', 'debtors', 'creditors'
let partyCustomerTypeFilter = "all"; // 'all', 'single', 'multiple'
let selectedMultipleCustomerIds = []; // customer IDs checked for site summary

// New legacy-style filters
let filterBalType = "all"; // 'all', 'debit', 'credit', 'zero'
let filterSubMode = "all"; // 'all', 'age', 'dues', 'area'
let filterFromDate = "2026-04-01";
let filterToDate = new Date().toISOString().split("T")[0];
let filterSearchText = ""; // Holds selected contact ID
let filterSiteType = "all"; // 'all', 'single', 'multiple'

// Individual Ledger Tab States
let bsDetailed = false;
let bsSubGroups = false;
let plDetailed = false;
let groupDetailed = false;
let avoidNonTransaction = false;
let selectedGroupName = "CAPITAL ACCOUNT";
let selectedIndividualLedgerId = "";
let ledgerVoucherTypeFilter = "All";
let ledgerShowNarration = true;
let ledgerShowBalanceInPrint = true;
let ledgerMonthly = false;
let ledgerMergeMultiple = false;
let ledgerIncludePdc = false;
let ledgerEmployeeFilter = "All";
let ledgerFromDate = "2026-04-01";
let ledgerToDate = new Date().toISOString().split("T")[0];

export function setReportsActiveTab(tab) {
  activeReportTab = tab;
}

export function setPartyReportTab(subTab) {
  activeReportTab = "parties";
  activePartySubTab = subTab;
}

export function renderReports(container) {
  window.reportsContainer = container;

  if (!window.reportsEscListenerBound) {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && activeReportTab === "ledger" && lastSelectedPartyTab) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        activeReportTab = "parties";
        activePartySubTab = lastSelectedPartyTab;
        filterSearchText = lastSelectedPartyId.includes("::") ? lastSelectedPartyId.split("::")[0] : lastSelectedPartyId;
        lastSelectedPartyTab = null;
        if (window.reportsContainer) {
          renderReports(window.reportsContainer);
        }
      }
    }, true);
    window.reportsEscListenerBound = true;
  }

  let pl = { expenses: [], incomes: [], grossProfit: 0, netProfit: 0, directExpenses: [], directIncomes: [] };
  try { pl = state.getProfitLoss(reportStartDate, reportEndDate); } catch (e) { console.error(e); }
  window.lastPlData = pl;
  
  let bs = { assets: [], liabilities: [], totalAssets: 0, totalLiabilities: 0, diff: 0 };
  try { bs = state.getBalanceSheet(); } catch (e) { console.error(e); }
  
  let tax = { salesValue: 0, salesCgst: 0, salesSgst: 0, salesIgst: 0, salesCess: 0, purchaseValue: 0, purchaseCgst: 0, purchaseSgst: 0, purchaseIgst: 0, purchaseCess: 0 };
  try { tax = state.getTaxSummary(); } catch (e) { console.error(e); }

  container.innerHTML = `
    <!-- Tab Controls Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button class="btn ${activeReportTab === 'pl' ? 'btn-primary' : 'btn-secondary'} tab-btn" data-tab="pl"><i class="fa-solid fa-scale-balanced"></i> Profit & Loss</button>
        <button class="btn ${activeReportTab === 'bs' ? 'btn-primary' : 'btn-secondary'} tab-btn" data-tab="bs"><i class="fa-solid fa-wallet"></i> Balance Sheet</button>
        <button class="btn ${activeReportTab === 'trial' ? 'btn-primary' : 'btn-secondary'} tab-btn" data-tab="trial">
          <i class="fa-solid fa-list-check"></i> Trial Balance
        </button>
        <button class="btn ${activeReportTab === 'tax' ? 'btn-primary' : 'btn-secondary'} tab-btn" data-tab="tax">
          <i class="fa-solid fa-percent"></i> Tax Summary Ledger
        </button>
        <button class="btn ${activeReportTab === 'parties' ? 'btn-primary' : 'btn-secondary'} tab-btn" data-tab="parties">
          <i class="fa-solid fa-address-book"></i> Ledger & Parties Report
        </button>
        <button class="btn ${activeReportTab === 'groupSummary' ? 'btn-primary' : 'btn-secondary'} tab-btn" data-tab="groupSummary">
          <i class="fa-solid fa-folder-open"></i> Ledger Group Summary
        </button>
      </div>
      
      <!-- Date Filter Toolbar (only shown for P&L and Trial Balance tab) -->
      ${(activeReportTab === 'pl' || activeReportTab === 'trial') ? `
        <div class="filters-row" style="align-items: end;">
          ${activeReportTab === 'pl' ? `
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 0.75rem; color: var(--text-secondary);">Start Date</label>
            <input type="date" id="rep-start-date" class="form-control" value="${reportStartDate}" style="padding: 0.4rem 0.6rem; font-size: 0.8rem;">
          </div>
          ` : ""}
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 0.75rem; color: var(--text-secondary);">${activeReportTab === 'trial' ? 'As On Date' : 'End Date'}</label>
            <input type="date" id="rep-end-date" class="form-control" value="${reportEndDate}" style="padding: 0.4rem 0.6rem; font-size: 0.8rem;">
          </div>
          <button class="btn btn-secondary" id="btn-apply-report-dates" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;"><i class="fa-solid fa-filter"></i> Apply</button>
          <button class="btn btn-secondary btn-icon" id="btn-reset-report-dates" title="Clear Filters" style="padding: 0.4rem;"><i class="fa-solid fa-xmark"></i></button>
        </div>
      ` : ""}

      <!-- Balance Sheet Filter and Action Toolbar -->
      ${activeReportTab === 'bs' ? `
        <div style="display: flex; align-items: center; justify-content: space-between; background-color: #cfd8e7; padding: 6px 12px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; margin-top: 0.5rem; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <label style="display: flex; align-items: center; gap: 4px; font-weight: normal; cursor: pointer; color: #000; margin-bottom: 0;">
              <input type="checkbox" id="bs-chk-detailed" ${bsDetailed ? 'checked' : ''}> Detailed
            </label>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: normal; cursor: pointer; color: #7f7f7f; margin-bottom: 0;">
              <input type="checkbox" id="bs-chk-subgroups" ${bsSubGroups ? 'checked' : ''}> With Ledgers Under Sub Groups
            </label>
            <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
              <span>From:</span>
              <input type="date" id="bs-start-date" value="${reportStartDate || '2026-04-01'}" style="padding: 2px 4px; border: 1px solid #7f9db9; font-size: 12px;">
              <span>To:</span>
              <input type="date" id="bs-end-date" value="${reportEndDate || new Date().toISOString().split('T')[0]}" style="padding: 2px 4px; border: 1px solid #7f9db9; font-size: 12px;">
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn" id="btn-bs-view" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">View</button>
            <button class="btn" id="btn-bs-print" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">Print</button>
            <button class="btn" id="btn-bs-close" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; color: #000; font-weight: bold; cursor: pointer; font-size: 12px; height: auto; min-width: auto; line-height: normal;">Close</button>
          </div>
        </div>
      ` : ""}
    </div>

    <!-- Active Report Body Rendering -->
    <div id="report-view-content" style="margin-top: 1rem;">
      ${renderActiveReport(pl, bs, tax)}
    </div>
  `;

  // Bind Events
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeReportTab = btn.getAttribute("data-tab");
      renderReports(container);
    });
  });

  if (activeReportTab === "pl") {
    document.getElementById("btn-apply-report-dates")?.addEventListener("click", () => {
      reportStartDate = document.getElementById("rep-start-date").value;
      reportEndDate = document.getElementById("rep-end-date").value;
      renderReports(container);
    });

    document.getElementById("btn-reset-report-dates")?.addEventListener("click", () => {
      reportStartDate = "";
      reportEndDate = "";
      renderReports(container);
    });
    
    document.getElementById("pl-chk-detailed")?.addEventListener("change", (e) => {
      plDetailed = e.target.checked;
      renderReports(container);
    });

    const plTableContainer = container.querySelector("#report-view-content");
    if (plTableContainer) {
      plTableContainer.addEventListener("dblclick", (e) => {
        const row = e.target.closest(".pl-clickable-particular");
        if (!row) return;

        const groupName = row.getAttribute("data-group-name");
        const accountId = row.getAttribute("data-account-id");

        if (groupName === "Closing Stock" || groupName === "Opening Stock") {
          import("./inventory.js").then(m => {
            m.showDetailedStockRegisterModal();
          });
          return;
        }

        if (accountId) {
          showIndividualLedgerModal(accountId);
        } else if (groupName) {
          showGroupSummaryModal(groupName);
        }
      });
    }
  }

  if (activeReportTab === "trial") {
    const trialTableContainer = container.querySelector("#report-view-content") || container;
    if (trialTableContainer) {
      trialTableContainer.addEventListener("dblclick", (e) => {
        const row = e.target.closest(".trial-row-clickable");
        if (!row) return;

        const isGroup = row.getAttribute("data-is-group") === "true";
        const accountId = row.getAttribute("data-account-id");
        
        if (accountId) {
          if (isGroup) {
            handleGroupDoubleClick(accountId, container);
          } else {
            showIndividualLedgerModal(accountId);
          }
        }
      });
    }
  }

  if (activeReportTab === "bs") {
    const chkDetailed = document.getElementById("bs-chk-detailed");
    if (chkDetailed) {
      chkDetailed.addEventListener("change", (e) => {
        bsDetailed = e.target.checked;
        renderReports(container);
      });
    }

    const chkSubGroups = document.getElementById("bs-chk-subgroups");
    if (chkSubGroups) {
      chkSubGroups.addEventListener("change", (e) => {
        bsSubGroups = e.target.checked;
        renderReports(container);
      });
    }

    const btnBsView = document.getElementById("btn-bs-view");
    if (btnBsView) {
      btnBsView.addEventListener("click", () => {
        reportStartDate = document.getElementById("bs-start-date").value;
        reportEndDate = document.getElementById("bs-end-date").value;
        renderReports(container);
      });
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
        window.location.hash = "";
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
          activeReportTab = "pl";
          renderReports(container);
          return;
        }

        if (name === "Stock on Hand" || name === "Stock-in-Hand" || name === "Closing Stock") {
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
  }

  if (activeReportTab === "groupSummary") {
    const gsGroupSelect = document.getElementById("gs-group-select");
    if (gsGroupSelect) {
      gsGroupSelect.addEventListener("change", (e) => {
        selectedGroupName = e.target.value;
        renderReports(container);
      });
    }

    const gsChkDetail = document.getElementById("gs-chk-detail");
    if (gsChkDetail) {
      gsChkDetail.addEventListener("change", (e) => {
        groupDetailed = e.target.checked;
        renderReports(container);
      });
    }

    const gsChkAvoid = document.getElementById("gs-chk-avoidnon");
    if (gsChkAvoid) {
      gsChkAvoid.addEventListener("change", (e) => {
        avoidNonTransaction = e.target.checked;
        renderReports(container);
      });
    }

    const gsBtnView = document.getElementById("gs-btn-view");
    if (gsBtnView) {
      gsBtnView.addEventListener("click", () => {
        const fromVal = document.getElementById("gs-from-date")?.value;
        const toVal = document.getElementById("gs-to-date")?.value;
        if (fromVal) reportStartDate = fromVal;
        if (toVal) reportEndDate = toVal;
        renderReports(container);
      });
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

    // Double-click on a row → open Individual Ledger for that account
    const gsSummaryTable = document.getElementById("gs-summary-table");
    if (gsSummaryTable) {
      gsSummaryTable.addEventListener("dblclick", (e) => {
        const row = e.target.closest("tr[data-account-id], tr[data-party-tab]");
        if (!row) return;

        const partyTab = row.getAttribute("data-party-tab");
        const accountId = row.getAttribute("data-account-id");

        if (partyTab) {
          // Debtors / Creditors — open Party report
          activePartySubTab = partyTab;
          activeReportTab = "parties";
          renderReports(container);
          return;
        }

        if (accountId) {
          showIndividualLedgerModal(accountId);
        }
      });
    }
  }

  if (activeReportTab === "ledger") {
    // Bind dropdowns, checkboxes, dates, and buttons
    const selectLedger = document.getElementById("il-select-ledger");
    if (selectLedger) {
      selectLedger.addEventListener("change", (e) => {
        selectedIndividualLedgerId = e.target.value;
        renderReports(container);
      });
    }

    const selectVType = document.getElementById("il-select-vtype");
    if (selectVType) {
      selectVType.addEventListener("change", (e) => {
        ledgerVoucherTypeFilter = e.target.value;
        renderReports(container);
      });
    }

    const fromDateInput = document.getElementById("il-from-date");
    if (fromDateInput) {
      fromDateInput.addEventListener("change", (e) => {
        ledgerFromDate = e.target.value;
      });
    }

    const toDateInput = document.getElementById("il-to-date");
    if (toDateInput) {
      toDateInput.addEventListener("change", (e) => {
        ledgerToDate = e.target.value;
      });
    }

    const selectEmp = document.getElementById("il-select-employee");
    if (selectEmp) {
      selectEmp.addEventListener("change", (e) => {
        ledgerEmployeeFilter = e.target.value;
      });
    }

    // Checkboxes
    const chkMonthly = document.getElementById("il-chk-monthly");
    if (chkMonthly) {
      chkMonthly.addEventListener("change", (e) => { ledgerMonthly = e.target.checked; });
    }
    const chkNarration = document.getElementById("il-chk-narration");
    if (chkNarration) {
      chkNarration.addEventListener("change", (e) => { ledgerShowNarration = e.target.checked; renderReports(container); });
    }
    const chkBalPrint = document.getElementById("il-chk-balprint");
    if (chkBalPrint) {
      chkBalPrint.addEventListener("change", (e) => { ledgerShowBalanceInPrint = e.target.checked; });
    }
    const chkMerge = document.getElementById("il-chk-merge");
    if (chkMerge) {
      chkMerge.addEventListener("change", (e) => { ledgerMergeMultiple = e.target.checked; });
    }

    // Buttons
    document.getElementById("btn-il-view")?.addEventListener("click", () => {
      renderReports(container);
    });

    document.getElementById("btn-il-print")?.addEventListener("click", () => {
      window.print();
    });
    const btnIlWhatsapp = document.getElementById("btn-il-whatsapp");
    if (btnIlWhatsapp) {
      btnIlWhatsapp.addEventListener("click", () => {
        const contacts = state.getContacts();
        const ledgers = state.getLedgers();
        
        // Build allAccounts exactly like in renderIndividualLedgerHtml to resolve selectedAccount
        const allAccounts = [
          ...ledgers.map(l => ({ id: l.code, name: l.name, type: "ledger" }))
        ];
        const hasCustomCash = ledgers.some(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
        
        for (const [code, acc] of Object.entries(ACCOUNTS)) {
          if (!allAccounts.some(a => a.id === code)) {
            if (code !== "1100" && code !== "2100") {
              if (code === "1010" && hasCustomCash) continue;
              allAccounts.push({ id: code, name: acc.name.toUpperCase() + " (" + code + ")", type: "ledger" });
            }
          }
        }
        contacts.forEach(c => {
          allAccounts.push({ id: c.id, name: c.name, type: c.type });
          if (c.siteType === "multiple" && Array.isArray(c.sites) && c.sites.length > 0) {
            c.sites.forEach(site => {
              allAccounts.push({ id: `${c.id}::${site}`, name: `${c.name} - ${site}`, type: c.type });
            });
          }
        });
        
        const selectedAcc = allAccounts.find(a => a.id === selectedIndividualLedgerId);
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
        const msg = `Dear *${selectedAcc.name}*,\n\nHere is your *Account Statement* from *${ledgerFromDate}* to *${ledgerToDate}*.\n\n*Opening Balance*: ₹${opBal.toFixed(2)} ${opBalSuffix}\n*Total Debits*: ₹${totalDr.toFixed(2)}\n*Total Credits*: ₹${totalCr.toFixed(2)}\n*Closing Balance*: *₹${clBal.toFixed(2)} ${clBalSuffix}*\n\nThank you!\n*Material Ledger ERP*`;
        const waUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank");
      });
    }

    document.getElementById("btn-il-close")?.addEventListener("click", () => {
      if (lastSelectedPartyTab) {
        activeReportTab = "parties";
        activePartySubTab = lastSelectedPartyTab;
        filterSearchText = lastSelectedPartyId.includes("::") ? lastSelectedPartyId.split("::")[0] : lastSelectedPartyId;
        lastSelectedPartyTab = null;
        renderReports(container);
      } else {
        window.location.hash = "";
      }
    });

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
        // Enforce selection of this row
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
        openVoucherOrInvoice(txId, container, () => renderReports(container));
      });
    });
  }

  if (activeReportTab === "parties") {
    // Bind Sub-tabs
    document.querySelectorAll(".party-subtab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activePartySubTab = btn.getAttribute("data-subtab");
        filterSearchText = ""; // Clear selection when subtab changes
        selectedMultipleCustomerIds = [];
        renderReports(container);
      });
    });

    // Bind Radio Filters (Balance Type)
    document.querySelectorAll("input[name='bal-filter']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        filterBalType = e.target.value;
        renderReports(container);
      });
    });

    // Bind Radio Filters (Sub Modes)
    document.querySelectorAll("input[name='sub-mode-filter']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        filterSubMode = e.target.value;
        renderReports(container);
      });
    });

    // Bind Date Inputs
    document.getElementById("filter-from-date")?.addEventListener("change", (e) => {
      filterFromDate = e.target.value;
    });
    document.getElementById("filter-to-date")?.addEventListener("change", (e) => {
      filterToDate = e.target.value;
    });

    // Bind Search dropdown selector
    document.getElementById("filter-search-debtor")?.addEventListener("change", (e) => {
      filterSearchText = e.target.value;
      renderReports(container);
    });

    // Bind Type dropdown
    const filterSiteTypeSelect = document.getElementById("filter-site-type");
    if (filterSiteTypeSelect) {
      filterSiteTypeSelect.addEventListener("change", (e) => {
        filterSiteType = e.target.value;
        partyCustomerTypeFilter = e.target.value;
        selectedMultipleCustomerIds = [];
        renderReports(container);
      });
    }

    // View button recalculates
    document.getElementById("btn-view-report")?.addEventListener("click", () => {
      renderReports(container);
    });

    // Close button clears out
    document.getElementById("btn-close-report")?.addEventListener("click", () => {
      window.location.hash = "";
    });

    // Bind Customer Checkboxes
    document.querySelectorAll(".customer-select-checkbox").forEach(chk => {
      chk.addEventListener("change", () => {
        const id = chk.getAttribute("data-id");
        if (chk.checked) {
          if (!selectedMultipleCustomerIds.includes(id)) {
            selectedMultipleCustomerIds.push(id);
          }
        } else {
          selectedMultipleCustomerIds = selectedMultipleCustomerIds.filter(x => x !== id);
        }
        renderReports(container);
      });
    });

    // Bind row double click
    document.querySelectorAll(".party-row-select").forEach(row => {
      row.addEventListener("dblclick", () => {
        lastSelectedPartyTab = activePartySubTab;
        lastSelectedPartyId = row.getAttribute("data-id");
        showIndividualLedgerModal(lastSelectedPartyId);
      });
    });

    // Bind site row double click
    document.querySelectorAll(".site-row-select").forEach(row => {
      row.addEventListener("dblclick", () => {
        lastSelectedPartyTab = activePartySubTab;
        lastSelectedPartyId = row.getAttribute("data-id");
        showIndividualLedgerModal(lastSelectedPartyId);
      });
    });
  }

  if (activeReportTab === "tax") {
    const btnTaxView = document.getElementById("btn-tax-view");
    if (btnTaxView) {
      btnTaxView.addEventListener("click", () => {
        taxFromDate = document.getElementById("tax-from-date").value;
        taxToDate = document.getElementById("tax-to-date").value;
        renderReports(container);
      });
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
  }
}

function renderActiveReport(pl, bs, tax) {
  if (activeReportTab === "pl") {
    return renderProfitLossHtml(pl);
  } else if (activeReportTab === "bs") {
    return renderBalanceSheetHtml(bs);
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
  const balances = state.getAccountBalances(reportEndDate);
  const ledgers = state.getLedgers();
  const contacts = state.getContacts();

  const CORE_GROUPS = {
    "CASH-IN-HAND": "CASH-IN-HAND",
    "BANK CURRENT ACCOUNT": "BANK ACCOUNTS",
    "SUNDRY DEBTORS": "CURRENT ASSETS",
    "SUNDRY CREDITORS": "CURRENT LIABILITIES",
    "STOCK-IN-HAND": "CURRENT ASSETS",
    "DUTIES & TAXES": "DUTIES & TAXES",
    "CAPITAL / OWNER EQUITY": "CAPITAL ACCOUNT",
    "RETAINED EARNINGS": "CAPITAL ACCOUNT",
    "SALES A/C": "SALES REVENUE",
    "SALES RETURNS": "SALES REVENUE",
    "SHIPPING REVENUE": "INDIRECT INCOME",
    "INVENTORY ADJUSTMENT GAIN": "INDIRECT INCOME",
    "COST OF GOODS SOLD (COGS)": "DIRECT EXPENSES",
    "PURCHASE RETURNS": "DIRECT EXPENSES",
    "TRANSPORT & DELIVERY EXPENSE": "INDIRECT EXPENSES",
    "RENT & UTILITIES": "INDIRECT EXPENSES",
    "SALARIES & WAGES": "INDIRECT EXPENSES",
    "INVENTORY WRITE-OFF / LOSS": "INDIRECT EXPENSES",
    "OFFICE EXPENSES": "INDIRECT EXPENSES"
  };

  const allGroups = state.getAccountGroups() || [];
  const getRootGroup = (gName) => {
    if (!gName) return "OTHER";
    let current = gName.toUpperCase();
    const targetRoots = [
      "CURRENT ASSETS", "FIXED ASSETS", "ASSETS", "LOANS & ADVANCES(ASSET)",
      "CURRENT LIABILITIES", "LIABILITIES", "CAPITAL ACCOUNT", "EQUITY",
      "DIRECT INCOME", "INDIRECT INCOME", "INCOME", "SALES ACCOUNT",
      "DIRECT EXPENSES", "INDIRECT EXPENSES", "EXPENSE", "PURCHASE ACCOUNT"
    ];
    let safety = 0;
    while (safety < 20) {
      if (targetRoots.includes(current)) {
        if (current === "SALES ACCOUNT") return "DIRECT INCOME";
        if (current === "PURCHASE ACCOUNT") return "DIRECT EXPENSES";
        if (current === "LOANS & ADVANCES(ASSET)") return "CURRENT ASSETS";
        if (current === "ASSETS") return "CURRENT ASSETS";
        if (current === "LIABILITIES") return "CURRENT LIABILITIES";
        if (current === "EQUITY") return "CAPITAL ACCOUNT";
        if (current === "INCOME") return "INDIRECT INCOME";
        if (current === "EXPENSE") return "INDIRECT EXPENSES";
        return current;
      }
      const grp = allGroups.find(x => x.name.toUpperCase() === current);
      if (!grp || !grp.under || grp.under.toUpperCase() === "PRIMARY" || grp.under.toUpperCase() === current) break;
      current = grp.under.toUpperCase();
      safety++;
    }
    return gName;
  };

  const individualBalancesMap = new Map();

  const addBalance = (name, groupName, bal, id = name) => {
    if (bal === 0) return;
    const key = name.toUpperCase();
    if (individualBalancesMap.has(key)) {
      individualBalancesMap.get(key).balance += bal;
    } else {
      individualBalancesMap.set(key, { id, name, groupName, balance: bal });
    }
  };

  // Iterate over all balances to ensure NOTHING is missed
  for (const [accId, balData] of Object.entries(balances)) {
    if (accId === "COST OF GOODS SOLD (COGS)" || accId === "STOCK-IN-HAND") continue;
    const bal = balData ? balData.balance : 0;
    if (bal === 0) continue;

    // Is it a contact? (Check by ID or ID::Site)
    const baseId = accId.includes("::") ? accId.split("::")[0] : accId;
    const contact = contacts.find(c => c.id === baseId);
    if (contact) {
      // Skip individual contacts in Trial Balance main view; they are already rolled into SUNDRY CREDITORS/DEBTORS control accounts
      continue;
    }

    // Is it in CORE_GROUPS?
    if (CORE_GROUPS[accId]) {
      addBalance(accId, CORE_GROUPS[accId], bal, accId);
      continue;
    }

    // Is it in ledgers array?
    const ledger = ledgers.find(l => l.code === accId || l.name === accId);
    if (ledger) {
      addBalance(ledger.name, ledger.groupName || "OTHER", bal, ledger.code);
      continue;
    }

    // Default fallback
    addBalance(accId, "OTHER", bal, accId);
  }

  let totalDebit = 0;
  let totalCredit = 0;

  const rows = Array.from(individualBalancesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name, groupName, balance }) => {
      let debit = 0;
      let credit = 0;
      if (balance > 0) {
        debit = balance;
        totalDebit += debit;
      } else if (balance < 0) {
        credit = -balance;
        totalCredit += credit;
      } else {
        return "";
      }

      const isGroup = ["SUNDRY CREDITORS", "SUNDRY DEBTORS", "DUTIES & TAXES", "CASH-IN-HAND", "BANK ACCOUNTS", "CURRENT ASSETS", "CAPITAL ACCOUNT"].includes(name.toUpperCase());
      return `
        <tr class="trial-row-clickable" data-account-id="${id}" data-is-group="${isGroup}" style="border-bottom: 1px solid var(--border-color); cursor: pointer;" onmouseover="this.style.backgroundColor='rgba(59,130,246,0.05)'" onmouseout="this.style.backgroundColor='transparent'">
          <td style="padding: 10px 12px; font-weight: bold; color: var(--text-primary);">${name}</td>
          <td style="padding: 10px 12px; color: var(--text-secondary);">${groupName}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--text-primary);">${debit > 0 ? '₹' + debit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--text-primary);">${credit > 0 ? '₹' + credit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
        </tr>
      `;
    })
    .filter(Boolean)
    .join("");

  return `
    <div class="panel">
      <div style="text-align: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.8rem;">
        <h3 style="font-size: 1.5rem; font-family: var(--font-heading); color: var(--accent-color);">Trial Balance (Individual Ledgers)</h3>
        <p style="font-size: 0.8rem; color: var(--text-secondary);">As On: ${reportEndDate || new Date().toISOString().split("T")[0]}</p>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; color: var(--text-primary);">
          <thead>
            <tr style="background-color: var(--card-bg); border-bottom: 2px solid var(--border-color); font-weight: bold;">
              <th style="padding: 8px 12px; text-align: left; color: var(--text-primary);">Ledger Name</th>
              <th style="padding: 8px 12px; text-align: left; color: var(--text-primary);">Group</th>
              <th style="padding: 8px 12px; text-align: right; width: 150px; color: var(--text-primary);">Debit Balance</th>
              <th style="padding: 8px 12px; text-align: right; width: 150px; color: var(--text-primary);">Credit Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-secondary);">All account balances are zero.</td></tr>`}
            <tr style="border-top: 2px solid var(--border-color); background-color: var(--card-bg); font-weight: bold; font-size: 0.85rem;">
              <td colspan="2" style="padding: 10px 12px; text-align: left; color: var(--text-primary);">TOTALS</td>
              <td style="padding: 10px 12px; text-align: right; color: var(--accent-color);">₹${totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 10px 12px; text-align: right; color: var(--accent-color);">₹${totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

  const tradingDebitRows = [];
  if (Math.abs(pl.openingStock) > 0.001) {
    tradingDebitRows.push({ label: "Opening Stock", amount: pl.openingStock, isGroup: true, gn: "Opening Stock" });
  }
  if (Math.abs(pl.purchase) > 0.001) {
    tradingDebitRows.push({ label: "PURCHASE ACCOUNT", amount: pl.purchase, isGroup: true, gn: "PURCHASE ACCOUNT" });
    if (typeof plDetailed !== 'undefined' && plDetailed && pl.purchaseItems) {
      pl.purchaseItems.forEach(item => {
        tradingDebitRows.push({ label: item.name, amount: item.amount, isDetail: true, accountId: item.accountId });
      });
    }
  }
  if (gp > 0) tradingDebitRows.push({ label: "Gross Profit c/o", amount: gp, bold: true, noClick: true });

  const tradingCreditRows = [];
  if (Math.abs(pl.sales) > 0.001) {
    tradingCreditRows.push({ label: "SALES ACCOUNT", amount: pl.sales, isGroup: true, gn: "SALES ACCOUNT" });
    if (typeof plDetailed !== 'undefined' && plDetailed && pl.salesItems) {
      pl.salesItems.forEach(item => {
        tradingCreditRows.push({ label: item.name, amount: item.amount, isDetail: true, accountId: item.accountId });
      });
    }
  }
  if (Math.abs(pl.closingStock) > 0.001) {
    tradingCreditRows.push({ label: "Closing Stock", amount: pl.closingStock, isGroup: true, gn: "Closing Stock" });
  }
  if (gp < 0) tradingCreditRows.push({ label: "Gross Loss c/o", amount: Math.abs(gp), bold: true, noClick: true });

  const groupExpenses = {};
  if (pl.otherExpenses) {
    pl.otherExpenses.forEach(e => {
      const gn = e.groupName || "INDIRECT EXPENSES";
      if (!groupExpenses[gn]) groupExpenses[gn] = { total: 0, items: [] };
      groupExpenses[gn].total += e.amount;
      groupExpenses[gn].items.push(e);
    });
  }

  const groupIncomes = {};
  if (pl.otherIncomes) {
    pl.otherIncomes.forEach(i => {
      const gn = i.groupName || "INDIRECT INCOME";
      if (!groupIncomes[gn]) groupIncomes[gn] = { total: 0, items: [] };
      groupIncomes[gn].total += i.amount;
      groupIncomes[gn].items.push(i);
    });
  }

  const plDebitRows = [];
  if (gp < 0) plDebitRows.push({ label: "Gross Loss b/d", amount: Math.abs(gp), noClick: true });
  Object.keys(groupExpenses).forEach(gn => {
    plDebitRows.push({ label: gn, amount: groupExpenses[gn].total, isGroup: true, gn: gn });
    if (typeof plDetailed !== 'undefined' && plDetailed) {
      groupExpenses[gn].items.forEach(item => {
        plDebitRows.push({ label: item.name, amount: item.amount, isDetail: true, accountId: item.accountId });
      });
    }
  });
  if (np > 0) plDebitRows.push({ label: "Net Profit", amount: np, bold: true, noClick: true });

  const plCreditRows = [];
  if (gp > 0) plCreditRows.push({ label: "Gross Profit b/d", amount: gp, noClick: true });
  Object.keys(groupIncomes).forEach(gn => {
    plCreditRows.push({ label: gn, amount: groupIncomes[gn].total, isGroup: true, gn: gn });
    if (typeof plDetailed !== 'undefined' && plDetailed) {
      groupIncomes[gn].items.forEach(item => {
        plCreditRows.push({ label: item.name, amount: item.amount, isDetail: true, accountId: item.accountId });
      });
    }
  });
  if (np < 0) plCreditRows.push({ label: "Net Loss", amount: Math.abs(np), bold: true, noClick: true });

  const formatMoney = (val) => "₹" + val.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2});

  const renderRow = (r) => {
    const rowClass = r.noClick ? "" : "pl-clickable-particular";
    const cursor = r.noClick ? "" : "cursor: pointer;";
    const dataGn = r.gn ? `data-group-name="${r.gn}"` : "";
    const dataAcc = r.accountId ? `data-account-id="${r.accountId}"` : "";
    
    let labelStyle = "padding: 4px 6px;";
    if (r.bold) labelStyle += " font-weight: bold;";
    if (r.isDetail) labelStyle += " padding-left: 20px; font-style: italic;";

    let hoverStyle = r.noClick ? "" : "onmouseover=\"this.style.backgroundColor='#f0f0f0'\" onmouseout=\"this.style.backgroundColor='transparent'\"";

    return `
      <tr class="${rowClass}" ${dataGn} ${dataAcc} style="${cursor}" ${hoverStyle}>
        <td style="${labelStyle}">${r.label}</td>
        <td style="padding: 4px 6px; text-align: right; ${r.bold ? 'font-weight: bold;' : ''}">${formatMoney(r.amount)}</td>
      </tr>
    `;
  };

  return `
    <div class="panel" style="padding: 0; background: none; box-shadow: none; border: none; font-family: Tahoma, sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div style="text-align: center; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1rem; flex: 1; margin-right: 1rem;">
          <h3 style="font-size: 1.3rem; margin: 0; color: #1e3a8a; font-weight: bold;">Trading and Profit & Loss Account</h3>
          <p style="font-size: 0.8rem; color: #475569; margin: 4px 0 0 0;">${displayDates}</p>
        </div>
        <div style="background-color: #cfd8e7; padding: 10px 15px; border: 1px solid #a5c3e5; border-radius: 4px;">
          <label style="display: flex; align-items: center; gap: 4px; font-weight: bold; cursor: pointer; color: #000; margin-bottom: 0;">
            <input type="checkbox" id="pl-chk-detailed" ${typeof plDetailed !== 'undefined' && plDetailed ? 'checked' : ''}> Detailed
          </label>
        </div>
      </div>
      <div style="display: flex; border: 1px solid #000; background-color: #fff; font-size: 13px; color: #000; min-height: 480px;">
        <!-- Left Column -->
        <div style="flex: 1; border-right: 1px solid #000; display: flex; flex-direction: column;">
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #000; font-weight: bold; background-color: #e2f0d9;">
                  <th style="padding: 6px; text-align: left;">Particulars</th>
                  <th style="padding: 6px; text-align: right; width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tradingDebitRows.map(renderRow).join("")}
              </tbody>
            </table>
          </div>
          <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; padding: 6px; display: flex; justify-content: space-between;">
            <span>Total</span>
            <span>${formatMoney(pl.tradingDebitTotal)}</span>
          </div>
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${plDebitRows.map(renderRow).join("")}
              </tbody>
            </table>
          </div>
          <div style="border-top: 2px solid #000; border-bottom: 4px double #000; font-weight: bold; padding: 6px; display: flex; justify-content: space-between;">
            <span>Total</span>
            <span>${formatMoney(pl.plDebitTotal)}</span>
          </div>
        </div>
        <!-- Right Column -->
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #000; font-weight: bold; background-color: #e2f0d9;">
                  <th style="padding: 6px; text-align: left;">Particulars</th>
                  <th style="padding: 6px; text-align: right; width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tradingCreditRows.map(renderRow).join("")}
              </tbody>
            </table>
          </div>
          <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; padding: 6px; display: flex; justify-content: space-between;">
            <span>Total</span>
            <span>${formatMoney(pl.tradingCreditTotal)}</span>
          </div>
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${plCreditRows.map(renderRow).join("")}
              </tbody>
            </table>
          </div>
          <div style="border-top: 2px solid #000; border-bottom: 4px double #000; font-weight: bold; padding: 6px; display: flex; justify-content: space-between;">
            <span>Total</span>
            <span>${formatMoney(pl.plCreditTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBalanceSheetHtml(bs) {
  const formatMoney = (val) => "₹" + val.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2});

  const renderGroup = (name, val, details) => {
    if (val === 0 && (!details || details.length === 0)) return "";
    const hoverStyle = `onmouseover="this.style.backgroundColor='#f0f0f0'" onmouseout="this.style.backgroundColor='transparent'"`;
    let html = `
      <tr class="bs-clickable-row" data-type="group" data-name="${name}" style="font-weight: bold; cursor: pointer;" ${hoverStyle}>
        <td style="padding: 6px;">${name}</td>
        <td style="padding: 6px; text-align: right;">${formatMoney(val)}</td>
      </tr>
    `;
    if (typeof bsDetailed !== 'undefined' && bsDetailed && details) {
      details.forEach(d => {
        html += `
          <tr class="bs-clickable-row" data-type="ledger" data-name="${d.name}" style="cursor: pointer;" ${hoverStyle}>
            <td style="padding: 2px 6px 2px 20px; font-style: italic;">${d.name}</td>
            <td style="padding: 2px 6px; text-align: right;">${formatMoney(d.balance)}</td>
          </tr>
        `;
      });
    }
    return html;
  };

  return `
    <div class="panel" style="padding: 0; background: none; box-shadow: none; border: none; font-family: Tahoma, sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.3rem; margin: 0; color: #1e3a8a; font-weight: bold;">Balance Sheet</h3>
        <div>
          <input type="checkbox" id="bsDetailedCheck" onchange="bsDetailed = this.checked; if(document.getElementById('reportOutput')) document.getElementById('reportOutput').innerHTML = renderBalanceSheetHtml(window.lastBsData);" ${typeof bsDetailed !== 'undefined' && bsDetailed ? 'checked' : ''}>
          <label for="bsDetailedCheck">Detailed</label>
        </div>
      </div>
      <div style="display: flex; border: 1px solid #000; background-color: #fff; font-size: 13px; color: #000; min-height: 450px;">
        <!-- Liabilities Column -->
        <div style="flex: 1; border-right: 1px solid #000; display: flex; flex-direction: column;">
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #000; font-weight: bold; background-color: #e2f0d9;">
                  <th style="padding: 6px; text-align: left;">Liabilities</th>
                  <th style="padding: 6px; text-align: right; width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${renderGroup("Capital Account", bs.liabilities.capitalVal, bs.liabilities.capitalDetails)}
                ${renderGroup("Current Liabilities", bs.liabilities.currentLiabilitiesVal, bs.liabilities.currentLiabilitiesDetails)}
                ${bs.diffInOpening < 0 ? `
                  <tr style="font-weight: bold;">
                    <td style="padding: 6px;">Difference in Opening Balance</td>
                    <td style="padding: 6px; text-align: right;">${formatMoney(Math.abs(bs.diffInOpening))}</td>
                  </tr>
                ` : ''}
                ${bs.netProfit > 0 ? `
                  <tr style="font-weight: bold;">
                    <td style="padding: 6px;">Profit & Loss A/c</td>
                    <td style="padding: 6px; text-align: right;">${formatMoney(bs.netProfit)}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          <div style="border-top: 2px solid #000; border-bottom: 4px double #000; font-weight: bold; padding: 6px; display: flex; justify-content: space-between;">
            <span>Total</span>
            <span>${formatMoney(bs.liabilities.total)}</span>
          </div>
        </div>
        <!-- Assets Column -->
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #000; font-weight: bold; background-color: #e2f0d9;">
                  <th style="padding: 6px; text-align: left;">Assets</th>
                  <th style="padding: 6px; text-align: right; width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${renderGroup("Fixed Assets", bs.assets.fixedAssetsVal, bs.assets.fixedAssetsDetails)}
                ${renderGroup("Current Assets", bs.assets.currentAssetsVal, bs.assets.currentAssetsDetails)}
                ${renderGroup("Other Current Assets", bs.assets.otherCurrentAssetsVal, bs.assets.otherCurrentAssetsDetails)}
                ${bs.diffInOpening > 0 ? `
                  <tr style="font-weight: bold;">
                    <td style="padding: 6px;">Difference in Opening Balance</td>
                    <td style="padding: 6px; text-align: right;">${formatMoney(bs.diffInOpening)}</td>
                  </tr>
                ` : ''}
                ${bs.netProfit < 0 ? `
                  <tr style="font-weight: bold;">
                    <td style="padding: 6px;">Profit & Loss A/c</td>
                    <td style="padding: 6px; text-align: right;">${formatMoney(Math.abs(bs.netProfit))}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          <div style="border-top: 2px solid #000; border-bottom: 4px double #000; font-weight: bold; padding: 6px; display: flex; justify-content: space-between;">
            <span>Total</span>
            <span>${formatMoney(bs.assets.total)}</span>
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
      const ledger = ledgers.find(l => l.code === entry.accountId || (typeof entry.accountId === 'string' && l.code === entry.accountId.toUpperCase()));
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
      
      <!-- Title Bar -->
      <div style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: white; padding: 6px 12px; font-weight: bold; border-radius: 3px; font-size: 14px;">
        GST/VAT TAX OBLIGATION SUMMARY (INCLUDING VOUCHER TRANSACTIONS)
      </div>

      <!-- Classic ERP Input Filter Panel -->
      <div style="background: #cfd8e7; padding: 12px; border: 1px solid #a5c3e5; display: flex; justify-content: space-between; align-items: center; border-radius: 3px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: bold; color: black;">Date Filter:</span>
          <span>From</span>
          <input type="date" id="tax-from-date" value="${taxFromDate}" style="border: 1px solid #a5c3e5; padding: 3px; font-size: 12px;">
          <span>To</span>
          <input type="date" id="tax-to-date" value="${taxToDate}" style="border: 1px solid #a5c3e5; padding: 3px; font-size: 12px;">
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
          <strong style="font-size: 1.4rem; display: block; margin-top: 6px; color: #b91c1c;">₹${data.output.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          <div style="border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 6px; font-size: 0.75rem; color: #334155; line-height: 1.4;">
            Output SGST: ₹${data.output.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br>
            Output CGST: ₹${data.output.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br>
            Output IGST: ₹${data.output.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <!-- Card 2: Tax Paid -->
        <div style="background: #f8fafc; border: 1px solid #a5c3e5; padding: 12px; border-radius: 3px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 0.72rem; color: #475569; display: block; font-weight: bold; text-transform: uppercase;">INPUT TAX CREDIT (ITC / PAID)</span>
          <strong style="font-size: 1.4rem; display: block; margin-top: 6px; color: #0f766e;">₹${data.input.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          <div style="border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 6px; font-size: 0.75rem; color: #334155; line-height: 1.4;">
            Input SGST: ₹${data.input.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br>
            Input CGST: ₹${data.input.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br>
            Input IGST: ₹${data.input.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <!-- Card 3: Net Payable -->
        <div style="background: #f8fafc; border: 1px solid #a5c3e5; padding: 12px; border-radius: 3px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 0.72rem; color: #475569; display: block; font-weight: bold; text-transform: uppercase;">NET TAX PAYABLE</span>
          <strong style="font-size: 1.4rem; display: block; margin-top: 6px; color: ${netPayable >= 0 ? '#b91c1c' : '#0f766e'};">
            ₹${Math.abs(netPayable).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${netPayable >= 0 ? 'Payable' : 'Credit / Refund'}
          </strong>
          <div style="border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 6px; font-size: 0.75rem; color: #334155;">
            Total Cess: ₹${Math.abs(data.cess).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${data.cess >= 0 ? 'Cr' : 'Dr'}<br>
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
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">₹${m.outputSgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">₹${m.outputCgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">₹${m.outputIgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #0f766e;">₹${m.inputSgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #0f766e;">₹${m.inputCgst.toFixed(2)}</td>
                  <td style="padding: 6px; border-right: 1px solid #cbd5e1; text-align: right; color: #0f766e;">₹${m.inputIgst.toFixed(2)}</td>
                  <td style="padding: 6px; text-align: right; font-weight: bold; color: ${netM >= 0 ? '#b91c1c' : '#0f766e'};">
                    ₹${Math.abs(netM).toFixed(2)} ${netM >= 0 ? 'Dr' : 'Cr'}
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
    <div class="panel" style="padding: 0; background: none; box-shadow: none; border: none; font-family: Tahoma, sans-serif;">
      <!-- Toolbar -->
      <div style="background: #cfd8e7; border: 1px solid #a5c3e5; padding: 6px 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 13px; color: #000; margin-bottom: 6px;">
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
          <input type="date" id="gs-from-date" value="${fromDate}" style="padding: 2px 4px; border: 1px solid #7f9db9; font-size: 12px;">
          <span>To:</span>
          <input type="date" id="gs-to-date" value="${toDate}" style="padding: 2px 4px; border: 1px solid #7f9db9; font-size: 12px;">
        </div>
        <div style="display: flex; gap: 5px; margin-left: auto;">
          <button id="gs-btn-view" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">View</button>
          <button id="gs-btn-print" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">Print</button>
          <button id="gs-btn-close" style="padding: 2px 12px; background: #e2e2e2; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">Close</button>
        </div>
      </div>

      <!-- Summary Table -->
      <div style="border: 1px solid #a5c3e5; background: #fff; font-size: 13px;">
        <div style="text-align: center; font-weight: bold; padding: 8px; background: #e8edf5; border-bottom: 1px solid #a5c3e5; font-size: 13px;">
          Group Summary of &nbsp;<span style="text-transform: uppercase;">${selectedGroupName}</span>
        </div>
        <table id="gs-summary-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
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
          <tfoot>
            <tr style="font-weight: bold; border-top: 1.5px solid #000; font-size: 13px;">
              <td style="padding: 6px 8px; border-right: 1px solid #bbb;">Total:</td>
              <td style="padding: 6px 8px; text-align: right; border-right: 1px solid #bbb; border-bottom: 3px double #000; white-space: nowrap;">${fmt(totalOp)}</td>
              <td style="padding: 6px 8px; text-align: right; border-right: 1px solid #bbb; border-bottom: 3px double #000;">${totalDr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 6px 8px; text-align: right; border-right: 1px solid #bbb; border-bottom: 3px double #000;">${totalCr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 6px 8px; text-align: right; border-bottom: 3px double #000; white-space: nowrap;">${fmt(totalCl)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

function calculateContactFinancials(c, startDate, endDate) {
  let opBalance = c.openingBalance || 0;
  let debit = 0;
  let credit = 0;

  state.transactions.forEach(tx => {
    const directEntry = tx.entries.find(e => e.accountId === c.id || e.accountId.startsWith(c.id + "::"));
    let isMatch = false;
    if (directEntry) {
      isMatch = true;
    } else {
      const matchedInv = state.getInvoices().find(inv => inv.contactId === c.id && tx.reference && (tx.reference === inv.voucherNo || tx.reference === inv.id));
      const matchedPur = state.getPurchases().find(p => p.contactId === c.id && tx.reference && (tx.reference === p.voucherNo || tx.reference === p.invoiceNo || tx.reference === p.refNo));
      const matchedSalesRet = state.getSalesReturns().find(sr => sr.contactId === c.id && tx.reference && (tx.reference === sr.id || tx.reference === sr.voucherNo));
      const matchedPurRet = state.getPurchaseReturns().find(pr => pr.contactId === c.id && tx.reference && (tx.reference === pr.id || tx.reference === pr.voucherNo));
      
      if (matchedInv || matchedPur || matchedSalesRet || matchedPurRet) {
        isMatch = true;
      } else {
        const isCustomer = c.type === "customer" || c.listInCustomerList === true;
        const nameMatch = tx.description.toLowerCase().includes(c.name.toLowerCase()) || (tx.reference && tx.reference.toLowerCase().includes(c.name.toLowerCase()));
        if (nameMatch) {
          const isPurOrPay = tx.reference.toLowerCase().includes("purchase") || tx.reference.startsWith("DN-") || tx.description.toLowerCase().includes("payment to supplier") || tx.description.toLowerCase().includes("purchase of building");
          const isInvOrRec = tx.reference.toLowerCase().includes("invoice") || tx.reference.startsWith("CN-") || tx.description.toLowerCase().includes("receipt from customer") || tx.description.toLowerCase().includes("sales invoice to");
          if ((isCustomer && !isPurOrPay) || (!isCustomer && !isInvOrRec)) {
            isMatch = true;
          }
        }
      }
    }
                    
    if (isMatch) {
      tx.entries.forEach(e => {
        if (e.accountId === c.id || e.accountId.startsWith(c.id + "::")) {
          const txDate = new Date(tx.date);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && txDate < start) {
            if (c.type === "customer") {
              opBalance += (e.debit - e.credit);
            } else {
              opBalance += (e.credit - e.debit);
            }
          } else if ((!start || txDate >= start) && (!end || txDate <= end)) {
            debit += e.debit;
            credit += e.credit;
          }
        }
      });
    }
  });

  let closingBalance = 0;
  if (c.type === "customer") {
    closingBalance = opBalance + (debit - credit);
  } else {
    closingBalance = opBalance + (credit - debit);
  }

  return {
    opBalance,
    debit,
    credit,
    closingBalance
  };
}

function renderPartiesReportHtml() {
  const contacts = state.getContacts();

  // Filter based on sub-tab
  let filteredList = [];
  let title = "";
  let searchLabel = "Search Debtor";

  if (activePartySubTab === "customer") {
    title = "Customer Ledger Directory";
    filteredList = contacts.filter(c => c.type === "customer" || c.listInCustomerList === true);
    searchLabel = "Search Debtor:";
  } else if (activePartySubTab === "vendor") {
    title = "Vendor Ledger Directory";
    filteredList = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);
    searchLabel = "Search Creditor:";
  } else if (activePartySubTab === "debtors") {
    title = "Sundry Debtors Directory (All Debtor Accounts)";
    filteredList = contacts.filter(c => c.type === "customer" || c.listInCustomerList === true || c.groupName === "SUNDRY DEBTORS");
    searchLabel = "Search Debtor:";
  } else if (activePartySubTab === "creditors") {
    title = "Sundry Creditors Directory (All Creditor Accounts)";
    filteredList = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true || c.groupName === "SUNDRY CREDITORS");
    searchLabel = "Search Creditor:";
  }

  // Pre-calculate dynamic financial columns based on the From/To dates
  let calculatedContacts = filteredList.map(c => {
    const financials = calculateContactFinancials(c, filterFromDate, filterToDate);
    return {
      ...c,
      ...financials
    };
  });

  // Apply Selected dropdown Contact ID filter
  if (filterSearchText) {
    calculatedContacts = calculatedContacts.filter(c => c.id === filterSearchText);
  }

  // Apply customer/vendor site/branch type filter
  if (activePartySubTab === "customer" || activePartySubTab === "vendor") {
    if (filterSiteType === "single") {
      calculatedContacts = calculatedContacts.filter(c => c.siteType === "single");
    } else if (filterSiteType === "multiple") {
      calculatedContacts = calculatedContacts.filter(c => c.siteType === "multiple");
    }
  }

  // Apply Balance Radio filter
  if (filterBalType === "debit") {
    calculatedContacts = calculatedContacts.filter(c => c.closingBalance > 0.009);
  } else if (filterBalType === "credit") {
    if (activePartySubTab === "customer" || activePartySubTab === "debtors") {
      calculatedContacts = calculatedContacts.filter(c => c.closingBalance < -0.009);
    } else {
      calculatedContacts = calculatedContacts.filter(c => c.closingBalance > 0.009);
    }
  } else if (filterBalType === "zero") {
    calculatedContacts = calculatedContacts.filter(c => Math.abs(c.closingBalance) < 0.01);
  }

  // Auto-calculated selected customer/vendor site/branch breakdown
  let selectedCustomerSiteBreakdown = "";
  if (filterSearchText) {
    const selectedContact = contacts.find(c => c.id === filterSearchText);
    if (selectedContact && (selectedContact.type === "customer" || selectedContact.type === "supplier") && selectedContact.siteType === "multiple") {
      let siteRows = [];
      const invoices = selectedContact.type === "customer" ?
        state.invoices.filter(inv => inv.contactId === selectedContact.id) :
        state.purchases.filter(pur => pur.contactId === selectedContact.id);

      const headerLabel = selectedContact.type === "customer" ? "Site Name" : "Branch Name";
      const reportTitle = selectedContact.type === "customer" ? "Site Account Ledger Summary" : "Branch Account Ledger Summary";

      let sumSiteOp = 0;
      let sumSiteDr = 0;
      let sumSiteCr = 0;

      (selectedContact.sites || []).forEach(site => {
        let siteOp = 0;
        let siteDr = 0;
        let siteCr = 0;

        // Sum transactions matching this site/branch name using the exact matching rules
        const siteLedgerId = `${selectedContact.id}::${site}`;
        state.transactions.forEach(tx => {
          let targetEntry = tx.entries.find(e => e.accountId === siteLedgerId);

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
              const isCustomer = selectedContact.type === "customer" || selectedContact.listInCustomerList === true;
              const nameMatch = tx.description.toLowerCase().includes(selectedContact.name.toLowerCase()) || (tx.reference && tx.reference.toLowerCase().includes(selectedContact.name.toLowerCase()));
              if (nameMatch) {
                const isPurOrPay = tx.reference.toLowerCase().includes("purchase") || tx.reference.startsWith("DN-") || tx.description.toLowerCase().includes("payment to supplier") || tx.description.toLowerCase().includes("purchase of building");
                const isInvOrRec = tx.reference.toLowerCase().includes("invoice") || tx.reference.startsWith("CN-") || tx.description.toLowerCase().includes("receipt from customer") || tx.description.toLowerCase().includes("sales invoice to");
                if ((isCustomer && !isPurOrPay) || (!isCustomer && !isInvOrRec)) {
                  if (matchedTxSite && matchedTxSite.toLowerCase() === site.toLowerCase()) {
                    isMatch = true;
                  }
                }
              }
            }

            if (isMatch) {
              targetEntry = tx.entries.find(e => e.accountId === selectedContact.id || e.accountId.startsWith(selectedContact.id + "::"));
            }
          }

          if (targetEntry) {
            const txDate = new Date(tx.date);
            const start = filterFromDate ? new Date(filterFromDate) : null;
            const end = filterToDate ? new Date(filterToDate) : null;

            if (start && txDate < start) {
              if (selectedContact.type === "customer") {
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

        const siteClosing = selectedContact.type === "customer" ?
          (siteOp + siteDr - siteCr) :
          (siteOp + siteCr - siteDr);
          
        const opSuffix = selectedContact.type === "customer" ? "Dr" : "Cr";
        const closingSuffix = selectedContact.type === "customer" ? "Dr" : "Cr";

        sumSiteOp += siteOp;
        sumSiteDr += siteDr;
        sumSiteCr += siteCr;

        siteRows.push(`
          <tr class="site-row-select" data-id="${selectedContact.id}::${site}" style="border-bottom: 1px dashed #cbd5e1; cursor: pointer;" title="Double click to view site ledger report">
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; font-weight: bold; color: #111;">${site}</td>
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; font-weight: 500;">₹${siteOp.toFixed(2)} ${opSuffix}</td>
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #0f766e; font-weight: 500;">₹${siteDr.toFixed(2)}</td>
            <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; color: #b91c1c; font-weight: 500;">₹${siteCr.toFixed(2)}</td>
            <td style="padding: 6px; text-align: right; font-weight: bold; color: ${siteClosing >= 0 ? '#15803d' : '#b91c1c'};">₹${Math.abs(siteClosing).toFixed(2)} ${closingSuffix}</td>
          </tr>
        `);
      });

      selectedCustomerSiteBreakdown = `
        <div style="margin-top: 15px; background: #e4edf8; border: 1px solid #a5c3e5; padding: 10px;">
          <h4 style="margin: 0 0 8px 0; color: #000; font-family: Tahoma, sans-serif; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
            <i class="fa-solid fa-map-location-dot"></i> ${reportTitle} for ${selectedContact.name}
          </h4>
          <div style="background: white; border: 1px solid #a5c3e5;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background: #cfd8e7; border-bottom: 1.5px solid #a5c3e5; font-weight: bold;">
                  <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline;">${headerLabel}</th>
                  <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right;">Op.Balance</th>
                  <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right;">Debit</th>
                  <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right;">Credit</th>
                  <th style="padding: 6px; text-decoration: underline; text-align: right;">Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                ${siteRows.join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  }

  // Checkbox based Multiple Customers/Vendors summary
  let siteSummarySection = "";
  if ((activePartySubTab === "customer" || activePartySubTab === "vendor") && filterSiteType === "multiple" && selectedMultipleCustomerIds.length > 0) {
    let summaryRows = [];
    const isCustomerReport = activePartySubTab === "customer";
    
    selectedMultipleCustomerIds.forEach(custId => {
      const cust = contacts.find(c => c.id === custId);
      if (!cust) return;

      const invoices = isCustomerReport ?
        state.invoices.filter(inv => inv.contactId === custId) :
        state.purchases.filter(pur => pur.contactId === custId);

      const siteTotals = {};

      (cust.sites || []).forEach(site => {
        siteTotals[site] = 0;
      });

      invoices.forEach(inv => {
        const site = inv.siteName || "General / Unassigned";
        if (siteTotals[site] === undefined) {
          siteTotals[site] = 0;
        }
        siteTotals[site] += inv.total;
      });

      Object.entries(siteTotals).forEach(([siteName, sales]) => {
        summaryRows.push(`
          <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 0.6rem; color: #1e293b; font-weight: 600;">${cust.name}</td>
            <td style="padding: 0.6rem; color: #475569;">${siteName}</td>
            <td style="padding: 0.6rem; text-align: right; font-weight: 700; color: #4f46e5;">₹${sales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `);
      });
    });

    const breakdownTitle = isCustomerReport ? "Checked Customers Site-wise Sales Breakdown" : "Checked Vendors Branch-wise Purchase Breakdown";
    const headerNameLabel = isCustomerReport ? "Customer Name" : "Vendor Name";
    const headerSiteBranchLabel = isCustomerReport ? "Site Name" : "Branch Name";
    const headerAmountLabel = isCustomerReport ? "Total Sales Value" : "Total Purchase Value";

    siteSummarySection = `
      <div style="margin-top: 1.5rem; background: white; border: 1px solid #a5c3e5; border-radius: 8px; padding: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
        <h4 style="margin: 0 0 1rem 0; color: #1e293b; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem;">
          <i class="fa-solid fa-chart-pie" style="color: #6366f1;"></i> ${breakdownTitle}
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 0.6rem; text-align: left; font-weight: 600; color: #475569;">${headerNameLabel}</th>
              <th style="padding: 0.6rem; text-align: left; font-weight: 600; color: #475569;">${headerSiteBranchLabel}</th>
              <th style="padding: 0.6rem; text-align: right; font-weight: 600; color: #475569;">${headerAmountLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows.length > 0 ? summaryRows.join("") : `<tr><td colspan="3" style="text-align: center; padding: 1.5rem; color: #94a3b8;">No transaction data recorded.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <div style="background: #e4edf8; padding: 15px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; color: #000; display: flex; flex-direction: column; gap: 10px;">
      
      <!-- Sub-Tabs Selection (Clean Classic ERP Styling) -->
      <div style="display: flex; gap: 4px; border-bottom: 2px solid #1e88e5; padding-bottom: 2px;">
        <button class="party-subtab-btn" data-subtab="customer" style="padding: 6px 16px; font-weight: bold; border: 1px solid #a5c3e5; border-bottom: none; background: ${activePartySubTab === 'customer' ? '#fff' : '#f1f5f9'}; cursor: pointer;">Customers</button>
        <button class="party-subtab-btn" data-subtab="vendor" style="padding: 6px 16px; font-weight: bold; border: 1px solid #a5c3e5; border-bottom: none; background: ${activePartySubTab === 'vendor' ? '#fff' : '#f1f5f9'}; cursor: pointer;">Vendors</button>
        <button class="party-subtab-btn" data-subtab="debtors" style="padding: 6px 16px; font-weight: bold; border: 1px solid #a5c3e5; border-bottom: none; background: ${activePartySubTab === 'debtors' ? '#fff' : '#f1f5f9'}; cursor: pointer;">Sundry Debtors</button>
        <button class="party-subtab-btn" data-subtab="creditors" style="padding: 6px 16px; font-weight: bold; border: 1px solid #a5c3e5; border-bottom: none; background: ${activePartySubTab === 'creditors' ? '#fff' : '#f1f5f9'}; cursor: pointer;">Sundry Creditors</button>
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
              <input type="date" id="filter-from-date" value="${filterFromDate}" style="border: 1px solid #a5c3e5; padding: 3px; font-size: 11px;">
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold;">To:</span>
              <input type="date" id="filter-to-date" value="${filterToDate}" style="border: 1px solid #a5c3e5; padding: 3px; font-size: 11px;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 4px;">
            <button id="btn-view-report" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">View</button>
            <button id="btn-print-report" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">Print</button>
            <button id="btn-close-report" style="padding: 4px 16px; background: #e0e0e0; border: 1px solid #999; cursor: pointer; font-weight: bold;">Close</button>
          </div>

          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
            <span style="font-weight: bold;">${searchLabel}</span>
            <select id="filter-search-debtor" style="width: 180px; border: 1px solid #a5c3e5; padding: 3px; font-size: 11px;">
              <option value="">-- All --</option>
              ${filteredList.map(c => `<option value="${c.id}" ${filterSearchText === c.id ? 'selected' : ''}>${c.name}</option>`).join("")}
            </select>
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

      <!-- MAIN RESULTS TABLE -->
      <div style="background: white; border: 1px solid #a5c3e5; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="background: #e4edf8; border-bottom: 1.5px solid #a5c3e5; font-weight: bold;">
              ${(activePartySubTab === "customer" || activePartySubTab === "vendor") && filterSiteType === "multiple" ? `
                <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: center; width: 45px;">Select</th>
              ` : ""}
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline;">Account Head</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline;">Cr.Period</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right;">Op.Balance</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right;">Debit</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right;">Credit</th>
              <th style="padding: 6px; text-decoration: underline; text-align: right;">Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            ${calculatedContacts.map(c => {
              const hasCheck = (activePartySubTab === "customer" || activePartySubTab === "vendor") && filterSiteType === "multiple";
              const isChecked = selectedMultipleCustomerIds.includes(c.id);
              
              const isDebtor = activePartySubTab === "customer" || activePartySubTab === "debtors";
              const opSuffix = isDebtor ? (c.opBalance >= 0 ? 'Dr' : 'Cr') : (c.opBalance >= 0 ? 'Cr' : 'Dr');
              const clSuffix = isDebtor ? (c.closingBalance >= 0 ? 'Dr' : 'Cr') : (c.closingBalance >= 0 ? 'Cr' : 'Dr');

              const opFormatted = `₹${Math.abs(c.opBalance).toFixed(2)} ${opSuffix}`;
              const clFormatted = `₹${Math.abs(c.closingBalance).toFixed(2)} ${clSuffix}`;

              return `
                <tr class="party-row-select" data-id="${c.id}" style="border-bottom: 1px dashed #cbd5e1; cursor: pointer;" title="Double click to view individual ledger report">
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
        </table>
      </div>

    </div>

    <!-- selected customer site summary ledger -->
    ${selectedCustomerSiteBreakdown}

    <!-- Checked multiple Customers summary -->
    ${siteSummarySection}
  `;
}

function renderIndividualLedgerHtml() {
  const ledgers = state.getLedgers();
  const contacts = state.getContacts();

  // Combine and sort alphabetically
  const allAccounts = [
    ...ledgers.map(l => ({ id: l.code, name: l.name, type: "ledger" }))
  ];

  // Add core system accounts (Sales, Purchase, Taxes, etc.) if not already in ledgers list
  // Exclude: AR/AP control accounts (1100, 2100) — represented by individual contacts
  // Exclude: purely internal/automated accounts that users shouldn't query directly:
  //   1200 = Stock-in-Hand (use Stock Register instead)
  //   5100 = COGS (auto-posted, no user entries)
  //   4110 = Sales Returns contra (tracked via sales returns module)
  //   5110 = Purchase Returns contra (tracked via purchase returns module)
  //   4300 = Inventory Adjustment Gain (system-only)
  //   5500 = Inventory Write-Off/Loss (system-only)
  const hasCustomCash = ledgers.some(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
  const INTERNAL_SYSTEM_ACCOUNTS = new Set(["1100", "2100", "1200", "5100", "4110", "5110", "4300", "5500"]);
  if (hasCustomCash) {
    INTERNAL_SYSTEM_ACCOUNTS.add("1010");
  }
  
  for (const [code, acc] of Object.entries(ACCOUNTS)) {
    if (!allAccounts.some(a => a.id === code) && !INTERNAL_SYSTEM_ACCOUNTS.has(code)) {
      allAccounts.push({ id: code, name: acc.name.toUpperCase() + " (" + code + ")", type: "ledger" });
    }
  }
  
  contacts.forEach(c => {
    allAccounts.push({
      id: c.id,
      name: c.name,
      type: c.type
    });
    if (c.siteType === "multiple" && Array.isArray(c.sites) && c.sites.length > 0) {
      c.sites.forEach(site => {
        allAccounts.push({
          id: `${c.id}::${site}`,
          name: `${c.name} - ${site}`,
          type: c.type
        });
      });
    }
  });

  allAccounts.sort((a, b) => a.name.localeCompare(b.name));

  if (!selectedIndividualLedgerId && allAccounts.length > 0) {
    selectedIndividualLedgerId = allAccounts[0].id;
  }

  const employees = Array.from(new Set(state.getInvoices().map(i => i.employee).filter(Boolean)));

  const selectedAcc = allAccounts.find(a => a.id === selectedIndividualLedgerId) || allAccounts[0];

  // Fetch entries
  const reportData = selectedAcc ? 
    getLedgerEntries(selectedAcc.id, ledgerFromDate, ledgerToDate, ledgerVoucherTypeFilter, ledgerEmployeeFilter) :
    { openingBalance: 0, openingBalanceSuffix: "Dr", entries: [], balanceType: "Debit" };

  return `
    <div style="background: #e4edf8; padding: 15px; border: 1px solid #a5c3e5; font-family: Tahoma, sans-serif; font-size: 13px; color: #000; display: flex; flex-direction: column; gap: 10px;">
      
      <!-- Title Bar -->
      <div style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: white; padding: 6px 12px; font-weight: bold; border-radius: 3px; font-size: 14px;">
        LEDGER
      </div>

      <!-- Classic ERP Input ribbon panel -->
      <div style="background: #cfd8e7; padding: 12px; border: 1px solid #a5c3e5; display: grid; grid-template-columns: 2fr 1.5fr 1fr; gap: 15px;">
        
        <!-- Left Column: Dropdowns & Dates -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="font-weight: bold; min-width: 100px;">Select Ledger:</span>
            <select id="il-select-ledger" style="flex-grow: 1; border: 1px solid #a5c3e5; padding: 3px; font-size: 12px;">
              ${allAccounts.map(a => `<option value="${a.id}" ${selectedIndividualLedgerId === a.id ? 'selected' : ''}>${a.name}</option>`).join("")}
            </select>
          </div>
          
          <div style="display: flex; align-items: center; gap: 15px; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold;">From:</span>
              <input type="date" id="il-from-date" value="${ledgerFromDate}" style="border: 1px solid #a5c3e5; padding: 3px; font-size: 11px;">
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold;">To:</span>
              <input type="date" id="il-to-date" value="${ledgerToDate}" style="border: 1px solid #a5c3e5; padding: 3px; font-size: 11px;">
            </div>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold; font-size: 11px; margin-bottom: 0;">
              <input type="checkbox" id="il-chk-pdc" ${ledgerIncludePdc ? 'checked' : ''}> Include Manual PDC
            </label>
          </div>
        </div>

        <!-- Middle Column: Voucher types, Employee, Checkboxes -->
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

          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="font-weight: bold; min-width: 120px;">Employee</span>
            <select id="il-select-employee" style="flex-grow: 1; border: 1px solid #a5c3e5; padding: 3px; font-size: 12px;">
              <option value="All" ${ledgerEmployeeFilter === 'All' ? 'selected' : ''}>All</option>
              ${employees.map(e => `<option value="${e}" ${ledgerEmployeeFilter === e ? 'selected' : ''}>${e}</option>`).join("")}
            </select>
          </div>
        </div>

        <!-- Right Column: Checkboxes & Controls -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-monthly" ${ledgerMonthly ? 'checked' : ''}> Monthly</label>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-narration" ${ledgerShowNarration ? 'checked' : ''}> Show Narration</label>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-balprint" ${ledgerShowBalanceInPrint ? 'checked' : ''}> Show Balance in Print</label>
            <label style="display: flex; align-items: center; gap: 4px; font-weight: bold;"><input type="checkbox" id="il-chk-merge" ${ledgerMergeMultiple ? 'checked' : ''}> Merge Multiple Entries</label>
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
      <div style="background: white; border: 1px solid #a5c3e5; max-height: 400px; overflow-y: auto;">
        <table id="il-ledger-table" style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; color: black;">
          <thead>
            <tr style="background: #e4edf8; border-bottom: 1.5px solid #a5c3e5; font-weight: bold;">
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; width: 90px;">Date</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline;">Particulars</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; width: 80px;">V.Type</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; width: 100px;">V.No.</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; width: 100px;">Debit</th>
              <th style="padding: 6px; border-right: 1px solid #a5c3e5; text-decoration: underline; text-align: right; width: 100px;">Credit</th>
              <th style="padding: 6px; text-decoration: underline; text-align: right; width: 130px;">Balance</th>
            </tr>
          </thead>
          <tbody>
            <!-- Opening Balance Row -->
            <tr style="border-bottom: 1px dashed #cbd5e1; background: #f8fafc; font-style: italic;">
              <td style="padding: 6px; border-right: 1px solid #a5c3e5;">${ledgerFromDate}</td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5; font-weight: bold;">Opening Balance</td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5;"></td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5;"></td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;"></td>
              <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right;"></td>
              <td style="padding: 6px; text-align: right; font-weight: bold;">₹${reportData.openingBalance.toFixed(2)} ${reportData.openingBalanceSuffix}</td>
            </tr>

            <!-- Transaction rows -->
            ${reportData.entries.map(e => {
              const debitText = e.debit > 0 ? `₹${e.debit.toFixed(2)}` : "";
              const creditText = e.credit > 0 ? `₹${e.credit.toFixed(2)}` : "";
              const balanceText = `₹${e.balance.toFixed(2)} ${e.balanceSuffix}`;
              return `
                <tr class="ledger-row-clickable" data-tx-id="${e.txId}" style="border-bottom: 1px dashed #cbd5e1; cursor: pointer;" title="Double click to edit entry">
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">${e.date}</td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">
                    <div class="ledger-particular-link" style="font-weight: bold; color: #1e3b8b; text-decoration: underline;">${e.particulars}</div>
                    ${ledgerShowNarration && e.narration ? `<div style="font-size: 11px; color: #475569; margin-top: 3px; font-style: italic;">${e.narration}</div>` : ""}
                  </td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top;">${e.vType}</td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; vertical-align: top; font-weight: 500;">${e.vNo}</td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; vertical-align: top; color: #0f766e; font-weight: 500;">${debitText}</td>
                  <td style="padding: 6px; border-right: 1px solid #a5c3e5; text-align: right; vertical-align: top; color: #b91c1c; font-weight: 500;">${creditText}</td>
                  <td style="padding: 6px; text-align: right; vertical-align: top; font-weight: bold; color: ${e.balanceSuffix === 'Dr' ? '#15803d' : '#b91c1c'};">${balanceText}</td>
                </tr>
              `;
            }).join("")}

            ${reportData.entries.length === 0 ? `
              <tr>
                <td colspan="7" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">No ledger entries found in date range.</td>
              </tr>
            ` : ""}
          </tbody>
        </table>
      </div>

    </div>
  `;
}

function getLedgerEntries(ledgerId, fromDate, toDate, voucherTypeFilter, employeeFilter) {
  const transactions = state.getTransactions();
  const contacts = state.getContacts();
  const ledgers = state.getLedgers();

  let baseId = ledgerId.includes("::") ? ledgerId.split("::")[0] : ledgerId;
  let siteName = ledgerId.includes("::") ? ledgerId.split("::")[1] : null;

  const contact = contacts.find(c => c.id === baseId);
  let ledger = ledgers.find(l => l.code === baseId || (typeof baseId === 'string' && l.code === baseId.toUpperCase()) || l.name === baseId);
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

  if (contact) {
    isSupplier = contact.type === "supplier" || contact.listInVendorList === true || contact.groupName === "SUNDRY CREDITORS";
    isCustomer = contact.type === "customer" || contact.listInCustomerList === true || contact.groupName === "SUNDRY DEBTORS";
    balanceType = isSupplier ? "Credit" : "Debit";
    
    // Assign opening balance to the first site or if no siteName is selected
    if (!siteName || (contact.sites && contact.sites[0] === siteName)) {
      opBalance = parseFloat(contact.openingBalance) || 0;
    } else {
      opBalance = 0;
    }
  } else if (ledger) {
    balanceType = ledger.balanceType || "Debit";
    opBalance = parseFloat(ledger.openingBalance) || 0;
  }

  let startBal = balanceType === "Debit" ? opBalance : -opBalance;

  const startLimit = fromDate ? new Date(fromDate) : null;
  const endLimit = toDate ? new Date(toDate) : null;
  if (startLimit) startLimit.setHours(0, 0, 0, 0);
  if (endLimit) endLimit.setHours(23, 59, 59, 999);

  console.log("All purchases in database:", state.getPurchases());
  console.log("All transactions in database:", transactions.map(t => ({ id: t.id, ref: t.reference, desc: t.description })));

  console.log("getLedgerEntries Run Details:", {
    ledgerId,
    baseId,
    siteName,
    ledger,
    contact,
    fromDate,
    toDate,
    startLimit: startLimit ? String(startLimit) : null,
    endLimit: endLimit ? String(endLimit) : null,
    totalTransactions: transactions.length
  });

  const entriesList = [];

  transactions.forEach(tx => {
    const txRef = (tx.reference || "").trim();
    const globalMatchedInv = state.getInvoices().find(i => txRef && (txRef === i.voucherNo || txRef === i.id || txRef === i.refNo));
    const globalMatchedPur = state.getPurchases().find(p => txRef && (txRef === p.voucherNo || txRef === p.id || txRef === p.invoiceNo || txRef === p.refNo));

    if ((globalMatchedInv && globalMatchedInv.isCancelled) || (globalMatchedPur && globalMatchedPur.isCancelled)) {
      return;
    }

    let isTxMatch = false;
    let targetEntry = null;

    if (contact) {
      // Find exact invoice/purchase/return matching the transaction reference via ID/refNo/invoiceNo
      const txRef = (tx.reference || "");
      const matchedInv = state.getInvoices().find(i => {
        const base = (i.contactId || "").split("::")[0];
        return base === contact.id && txRef && (txRef === i.voucherNo || txRef === i.id || (i.refNo && txRef === i.refNo));
      });
      const matchedPur = state.getPurchases().find(p => {
        const base = (p.contactId || "").split("::")[0];
        return base === contact.id && txRef && (txRef === p.voucherNo || (p.invoiceNo && txRef === p.invoiceNo) || (p.refNo && txRef === p.refNo));
      });
      const matchedSalesRet = state.getSalesReturns().find(sr => {
        const base = (sr.contactId || "").split("::")[0];
        return base === contact.id && txRef && (txRef === sr.id || txRef === sr.voucherNo);
      });
      const matchedPurRet = state.getPurchaseReturns().find(pr => {
        const base = (pr.contactId || "").split("::")[0];
        return base === contact.id && txRef && (txRef === pr.id || txRef === pr.voucherNo);
      });

      const txSite = tx.siteName || "";
      const matchedTxSite = txSite || (matchedInv ? matchedInv.siteName : (matchedPur ? matchedPur.siteName : (matchedSalesRet ? matchedSalesRet.siteName : (matchedPurRet ? matchedPurRet.siteName : ""))));

      console.log("getLedgerEntries Match Check:", {
        txId: tx.id,
        txRef,
        txDesc: tx.description,
        txSite,
        contactId: contact.id,
        matchedInv: matchedInv ? { id: matchedInv.id, siteName: matchedInv.siteName } : null,
        matchedTxSite,
        siteName
      });

      if (siteName) {
        // If it's a specific site/branch ledger
        targetEntry = tx.entries.find(e => String(e.accountId) === String(ledgerId));
        
        if (!targetEntry) {
          const isDocMatch = !!matchedInv || !!matchedPur || !!matchedSalesRet || !!matchedPurRet;
          if (isDocMatch && matchedTxSite && matchedTxSite.toLowerCase() === siteName.toLowerCase()) {
            targetEntry = tx.entries.find(e => String(e.accountId) === String(contact.id) || String(e.accountId).startsWith(contact.id + "::"));
          } else {
            const isCustomer = contact.type === "customer" || contact.listInCustomerList === true;
            const nameMatch = tx.description.toLowerCase().includes(contact.name.toLowerCase()) || (tx.reference && tx.reference.toLowerCase().includes(contact.name.toLowerCase()));
            if (nameMatch) {
              const isPurOrPay = tx.reference.toLowerCase().includes("purchase") || tx.reference.startsWith("DN-") || tx.description.toLowerCase().includes("payment to supplier") || tx.description.toLowerCase().includes("purchase of building");
              const isInvOrRec = tx.reference.toLowerCase().includes("invoice") || tx.reference.startsWith("CN-") || tx.description.toLowerCase().includes("receipt from customer") || tx.description.toLowerCase().includes("sales invoice to");
              if ((isCustomer && !isPurOrPay) || (!isCustomer && !isInvOrRec)) {
                if (matchedTxSite && matchedTxSite.toLowerCase() === siteName.toLowerCase()) {
                  targetEntry = tx.entries.find(e => String(e.accountId) === String(contact.id) || String(e.accountId).startsWith(contact.id + "::"));
                }
              }
            }
          }
        }
      } else {
        // General contact ID without site name
        targetEntry = tx.entries.find(e => String(e.accountId) === String(contact.id) || String(e.accountId).startsWith(contact.id + "::"));
      }
    } else if (ledger) {
      console.log("ALL PURCHASE RETURNS:", state.getPurchaseReturns());
      const isSalesL = String(ledger.code).toUpperCase() === "4100" || (ledger.groupName && ledger.groupName.toUpperCase() === "SALES ACCOUNTS");
      const isPurL = String(ledger.code).toUpperCase() === "1200" || (ledger.groupName && ledger.groupName.toUpperCase() === "PURCHASE ACCOUNTS");
      
      const refUpper = (tx.reference || "").toUpperCase();
      const descLower = (tx.description || "").toLowerCase();
      
      const isCogs = refUpper.includes("COGS") || descLower.includes("cogs") || descLower.includes("cost of goods");
      const isStockAdj = refUpper.startsWith("STOCK ADJ") || descLower.includes("stock adjustment");
      const isConversion = refUpper.startsWith("CONVERSION") || descLower.includes("stock conversion");

      if (isPurL && (isCogs || isStockAdj || isConversion)) return;
      if (isSalesL && (isCogs || isStockAdj || isConversion)) return;

      // Find exact code match first to avoid matching core Sales/Purchase entries for adjustment accounts
      targetEntry = tx.entries.find(e => String(e.accountId).toUpperCase() === String(ledger.code).toUpperCase() || String(e.accountId).toUpperCase() === String(ledger.name).toUpperCase());
      if (!targetEntry) {
        targetEntry = tx.entries.find(e => {
          const entryId = String(e.accountId);
          if (isSalesL) return entryId === "4100";
          if (isPurL) return entryId === "1200";
          return false;
        });
      }
    }

    if (ledger) {
      console.log(`getLedgerEntries Loop Match: txId=${tx.id} ref="${tx.reference}" targetEntry=${targetEntry ? JSON.stringify(targetEntry) : "null"} ledgerCode=${ledger.code}`, tx.entries);
    }

    if (targetEntry) {
      const txDate = new Date(tx.date);
      
      if (startLimit && txDate < startLimit) {
        startBal += (targetEntry.debit - targetEntry.credit);
      } else if ((!startLimit || txDate >= startLimit) && (!endLimit || txDate <= endLimit)) {
        let matchesVoucherType = true;
        if (voucherTypeFilter && voucherTypeFilter !== "All") {
          const refClean = tx.reference || "";
          const refLower = refClean.toLowerCase();
          const descLower = tx.description.toLowerCase();
          const typeLower = voucherTypeFilter.toLowerCase();
          if (typeLower === "receipt") {
            matchesVoucherType = refLower.includes("receipt") || refLower.includes("rcpt") || refLower.startsWith("r");
          } else if (typeLower === "payment") {
            matchesVoucherType = (refLower.includes("payment") || refLower.includes("pay") || refLower.startsWith("p")) && !refLower.startsWith("pr");
          } else if (typeLower === "journal") {
            matchesVoucherType = refLower.includes("jv") || descLower.includes("journal") || refLower.startsWith("j");
          } else if (typeLower === "purchase") {
            matchesVoucherType = refLower.includes("purchase") || refLower.includes("bill") || refLower.startsWith("pr") ||
                                 state.getPurchases().some(p => p && (p.voucherNo === refClean || p.refNo === refClean || p.id === refClean));
          } else if (typeLower === "sales") {
            matchesVoucherType = refLower.includes("invoice") || refLower.includes("sale") || refLower.startsWith("sa") ||
                                 state.getInvoices().some(i => i && (i.voucherNo === refClean || i.refNo === refClean || i.id === refClean));
          } else if (typeLower === "contra") {
            matchesVoucherType = (refLower.includes("contra") || refLower.startsWith("c")) && !refLower.includes("credit") && !refLower.startsWith("cn-") && !refLower.startsWith("sr-");
          }
        }

        let matchesEmployee = true;
        if (employeeFilter && employeeFilter !== "All") {
          const inv = state.invoices.find(i => tx.reference && tx.reference.includes(i.id));
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
            const cleanId = txRef.replace(/^(Credit Note|Debit Note)\s+/i, "");
            const salesRet = state.getSalesReturns().find(sr => txRef && (txRef === sr.id || txRef === sr.voucherNo || cleanId === sr.id || cleanId === sr.voucherNo));
            const purRet = state.getPurchaseReturns().find(pr => txRef && (txRef === pr.id || txRef === pr.voucherNo || cleanId === pr.id || cleanId === pr.voucherNo));
            if (salesRet) partyName = salesRet.contactName;
            else if (purRet) partyName = purRet.contactName;
          }

          // If no specific voucher found but there's a contact or Cash/Bank account in the counterpart entries, resolve it as the primary party
          if (!partyName) {
            const partyEntry = tx.entries.find(e => {
              const accountIdStr = e.accountId || "";
              const baseId = accountIdStr.split("::")[0];
              const matchingC = contacts.find(c => c.id === baseId);
              return !!matchingC || baseId === "1010" || baseId === "1020";
            });
            if (partyEntry) {
              const accountIdStr = partyEntry.accountId || "";
              const baseId = accountIdStr.split("::")[0];
              const sitePart = accountIdStr.split("::")[1];
              const matchingC = contacts.find(c => c.id === baseId);
              if (matchingC) {
                partyName = sitePart ? `${matchingC.name} - ${sitePart}` : matchingC.name;
              } else if (baseId === "1010") {
                partyName = "Cash";
              } else if (baseId === "1020") {
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
              
              // 2. Resolve AR/AP control accounts to contactName if invoice/purchase matches
              if (accountIdStr === "1100" || accountIdStr === "2100") {
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
              const matchingC = contacts.find(c => c.id === baseId);
              if (matchingC) {
                return sitePart ? `${matchingC.name} - ${sitePart}` : matchingC.name;
              }

              // 4. Resolve ledgers
              const matchingL = ledgers.find(l => l.code === baseId || (typeof baseId === 'string' && l.code === baseId.toUpperCase()) || l.name === baseId);
              if (matchingL) return matchingL.name;
              
              return accountIdStr;
            });
          
          // Determine debit/credit side based on transaction type for cash/bank entries
          let dr = targetEntry.debit;
          let cr = targetEntry.credit;
          const refLower = tx.reference.toLowerCase();
          if (targetEntry.accountId === "1010" || targetEntry.accountId === "1020") {
            const amt = targetEntry.debit || targetEntry.credit;
            if (refLower.includes("purchase") || refLower.startsWith("pur-") || refLower.startsWith("pr") || refLower.includes("debit note")) {
              cr = amt;
              dr = 0;
            } else {
              dr = amt;
              cr = 0;
            }
          }
          
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

          if (ledger && partyName) {
            counterpartNames = partyName;
          }
          
          let particulars = "";
          if (dr > 0) {
            particulars = "To " + counterpartNames;
          } else {
            particulars = "By " + counterpartNames;
          }
          
          entriesList.push({
            txId: tx.id,
            date: tx.date,
            particulars: particulars,
            narration: tx.description,
            vType: (() => {
              const refUpper = tx.reference.toUpperCase();
              if (refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("SR-") || refUpper.startsWith("CN-")) return "Sales Return";
              if (refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("DN-")) return "Purchase Return";
              if (refUpper.startsWith("LSL") || refUpper.startsWith("ISL") || refUpper.startsWith("NSL") || refUpper.startsWith("SA-") || refUpper.startsWith("SA")) return "Sales";
              if (refUpper.startsWith("LPR") || refUpper.startsWith("IPR") || refUpper.startsWith("NPR") || refUpper.startsWith("PR-") || refUpper.startsWith("LP-")) return "Purchase";
              if (refUpper.startsWith("SA-") || refUpper.startsWith("SA")) return "Sales";
              if (refUpper.startsWith("RC-") || refUpper.startsWith("RCPT") || refUpper.startsWith("R")) return "Receipt";
              if (refUpper.startsWith("PM-") || refUpper.startsWith("PAY") || refUpper.startsWith("P")) return "Payment";
              if (refUpper.startsWith("JV-") || refUpper.startsWith("JV") || refUpper.startsWith("J")) return "Journal";
              if (refUpper.startsWith("CO-") || refUpper.startsWith("CONTRA") || (refUpper.startsWith("C") && !refUpper.startsWith("CREDIT") && !refUpper.startsWith("CN-") && !refUpper.startsWith("SR-"))) return "Contra";
              
              // Fallback checking the text
              const refLower = tx.reference.toLowerCase();
              if (refLower.includes("credit note") || refLower.startsWith("sr-") || refLower.startsWith("cn-")) return "Sales Return";
              if (refLower.includes("debit note") || refLower.startsWith("dn-") || refLower.startsWith("pr-")) return "Purchase Return";
              if (refLower.includes("receipt") || refLower.includes("rcpt")) return "Receipt";
              if (refLower.includes("payment") || refLower.includes("pay")) return "Payment";
              if (refLower.includes("contra") || refLower.includes("cntr")) return "Contra";
              if (refLower.includes("purchase") || refLower.includes("bill") || refLower.startsWith("pr-")) return "Purchase";
              if (refLower.includes("sales") || refLower.includes("invoice") || refLower.startsWith("inv-") || refLower.startsWith("sa-")) return "Sales";
              return "Journal";
            })(),
            vNo: tx.reference,
            debit: dr,
            credit: cr,
            timestamp: txDate.getTime()
          });
        }
      }
    }
  });

  console.log("getLedgerEntries Result Details:", {
    entriesCount: entriesList.length,
    entries: entriesList
  });

  entriesList.sort((a, b) => a.timestamp - b.timestamp);

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

function renderBatchStockHtml() {
  const materials = state.getMaterials();
  let html = `
    <div style="background-color: var(--card-bg); padding: 1.5rem; border-radius: var(--border-radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3 style="margin:0; font-family: var(--font-header); font-weight:700; color:var(--text-primary);">Batch-Wise Stock Register</h3>
        <button class="btn btn-secondary" onclick="window.print()" style="font-size:0.8rem; padding: 4px 10px;"><i class="fa-solid fa-print"></i> Print Report</button>
      </div>
      
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
          <thead>
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:10px 12px;">Product Name</th>
              <th style="padding:10px 12px;">Code/Model</th>
              <th style="padding:10px 12px;">Batch Name</th>
              <th style="padding:10px 12px; text-align:right;">Opening Stock</th>
              <th style="padding:10px 12px; text-align:right;">Receipt Stock (Purchase, Sales Return, Stock Adj)</th>
              <th style="padding:10px 12px; text-align:right;">Issued Stock (Sales, Purchase Return, Stock Adj)</th>
              <th style="padding:10px 12px; text-align:right;">Closing Stock</th>
              <th style="padding:10px 12px; text-align:right;">Landing Cost</th>
              <th style="padding:10px 12px; text-align:right;">Value</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  let grandTotalOpening = 0;
  let grandTotalReceipt = 0;
  let grandTotalIssued = 0;
  let grandTotalClosing = 0;
  let grandTotalVal = 0;
  let recordsCount = 0;
  
  materials.forEach(m => {
    const batches = m.batches || [];
    batches.forEach(b => {
      recordsCount++;
      const isFirstBatch = m.batches.indexOf(b) === 0;
      
      // 1. Opening stock calculation
      const openingStock = parseFloat(b.openingStock) || 0;
      
      // 2. Receipt Stock (Purchase, Sales Return, Stock Adjustment [Receipt])
      let receiptPurchase = 0;
      state.getPurchases().forEach(pur => {
        if (pur.isCancelled) return;
        (pur.items || []).forEach(item => {
          if (item.materialId === m.id && String(item.batchNo || item.price || m.landingCost || 350) === b.batchNo) {
            receiptPurchase += parseFloat(item.quantity) || 0;
          }
        });
      });
      
      let receiptSalesReturn = 0;
      state.getSalesReturns().forEach(sr => {
        (sr.items || []).forEach(item => {
          if (item.materialId === m.id && String(item.batchNo || m.batches[0]?.batchNo || m.landingCost || 350) === b.batchNo) {
            receiptSalesReturn += parseFloat(item.quantity) || 0;
          }
        });
      });
      
      let receiptStockAdj = 0;
      let issuedStockAdj = 0;
      (state.getStockAdjustments() || []).forEach(adj => {
        if (adj.isCancelled) return;
        (adj.items || []).forEach(item => {
          if (item.materialId === m.id) {
            const bNo = String(item.batchNo || m.batches[0]?.batchNo || m.landingCost || 350);
            if (bNo === b.batchNo) {
              const qty = parseFloat(item.qty) || 0;
              if (item.stockAffect === "Add (+)") {
                receiptStockAdj += qty;
              } else {
                issuedStockAdj += qty;
              }
            }
          }
        });
      });

      const receiptStock = receiptPurchase + receiptSalesReturn + receiptStockAdj;
      
      // 3. Issued Stock (Sales, Purchase Return, Stock Adjustment [Issue])
      let issuedSales = 0;
      state.getInvoices().forEach(inv => {
        if (inv.isCancelled) return;
        (inv.items || []).forEach(item => {
          if (item.materialId === m.id && String(item.batchNo || m.batches[0]?.batchNo || m.landingCost || 350) === b.batchNo) {
            issuedSales += parseFloat(item.quantity) || 0;
          }
        });
      });
      
      let issuedPurchaseReturn = 0;
      state.getPurchaseReturns().forEach(pr => {
        (pr.items || []).forEach(item => {
          if (item.materialId === m.id && String(item.batchNo || m.batches[0]?.batchNo || m.landingCost || 350) === b.batchNo) {
            issuedPurchaseReturn += parseFloat(item.quantity) || 0;
          }
        });
      });

      const issuedStock = issuedSales + issuedPurchaseReturn + issuedStockAdj;
      
      const closingStock = parseFloat(b.stock) || 0;
      const cost = parseFloat(b.landingCost) || 0;
      const val = closingStock * cost;
      
      grandTotalOpening += openingStock;
      grandTotalReceipt += receiptStock;
      grandTotalIssued += issuedStock;
      grandTotalClosing += closingStock;
      grandTotalVal += val;
      
      html += `
        <tr class="batch-stock-row-clickable" data-name="${m.name}" data-code="${m.code}" data-batch="${b.batchNo}" style="border-bottom: 1px solid #cbd5e1; background-color: #f8fafc; cursor: pointer; outline:none;" tabindex="0" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
          <td style="padding:8px 12px;"><strong>${m.name}</strong></td>
          <td style="padding:8px 12px;"><code style="background-color:#e2e8f0; padding:2px 4px; font-weight:700;">${m.code}</code></td>
          <td style="padding:8px 12px; font-weight:bold; color:#1e3b8b;">Batch ${b.batchNo}</td>
          <td style="padding:8px 12px; text-align:right;">${openingStock.toFixed(2)}</td>
          <td style="padding:8px 12px; text-align:right; color:#16a34a;">${receiptStock.toFixed(2)}</td>
          <td style="padding:8px 12px; text-align:right; color:#ef4444;">${issuedStock.toFixed(2)}</td>
          <td style="padding:8px 12px; text-align:right; font-weight:700;">${closingStock.toFixed(2)} ${m.unit || 'Bags'}</td>
          <td style="padding:8px 12px; text-align:right;">₹${cost.toFixed(2)}</td>
          <td style="padding:8px 12px; text-align:right; font-weight:700; color:#1e40af;">₹${val.toFixed(2)}</td>
        </tr>
      `;
    });
  });
  
  if (recordsCount === 0) {
    html += `
      <tr>
        <td colspan="9" style="text-align:center; padding:30px; color:#64748b;">No batch stock inventory records found.</td>
      </tr>
    `;
  } else {
    html += `
      <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8;">
        <td colspan="3" style="padding:10px 12px; text-align:right;">GRAND TOTAL</td>
        <td style="padding:10px 12px; text-align:right; font-weight:800; color:#0f172a;">${grandTotalOpening.toFixed(2)}</td>
        <td style="padding:10px 12px; text-align:right; font-weight:800; color:#16a34a;">${grandTotalReceipt.toFixed(2)}</td>
        <td style="padding:10px 12px; text-align:right; font-weight:800; color:#ef4444;">${grandTotalIssued.toFixed(2)}</td>
        <td style="padding:10px 12px; text-align:right; font-weight:800; color:#0f172a;">${grandTotalClosing.toFixed(2)}</td>
        <td></td>
        <td style="padding:10px 12px; text-align:right; font-weight:800; color:#1e40af;">₹${grandTotalVal.toFixed(2)}</td>
      </tr>
    `;
  }
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  return html;
}

export function showBatchStockRegisterModal(container) {
  const root = document.getElementById("modal-container-root");
  const reportHTML = renderBatchStockHtml();

  root.innerHTML = `
    <div class="modal-overlay active" id="batch-stock-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1300px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-boxes-stacked"></i> STOCK REGISTER (BATCH WISE)</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="batch-stock-close-x-btn">&times;</button>
        </div>

        <!-- Content Area -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 10px;">
          ${reportHTML}
        </div>

        <!-- Footer Buttons -->
        <div style="display:flex; justify-content:flex-end; gap:8px; background:#b4c6e7; padding:6px; border:1px solid #8faadc; border-radius:2px;">
          <button type="button" class="btn btn-secondary" onclick="window.print()" style="font-weight:bold; height:24px; font-size:0.75rem; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px;">Print</button>
          <button type="button" class="btn btn-secondary" id="btn-batch-stock-close" style="font-weight:bold; height:24px; font-size:0.75rem; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px;">Close</button>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("batch-stock-overlay");
  const close = () => {
    if (overlay) overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("batch-stock-close-x-btn")?.addEventListener("click", close);
  document.getElementById("btn-batch-stock-close")?.addEventListener("click", close);

  // Bind double click to open Item Wise Stock Register
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
      }
    });
  });

  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", escHandler);
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
    if (purMatch && (refLower.includes("purchase") || refLower.includes("bill") || refLower.includes("pur") || refLower.startsWith("p"))) {
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
    if (!matchDoc && (refLower.includes("purchase") || refLower.includes("bill") || refLower.includes("pur") || refLower.startsWith("p"))) {
      const p = state.getPurchases().find(purDoc => extractNum(purDoc.id) === targetNum || extractNum(purDoc.voucherNo) === targetNum || extractNum(purDoc.refNo) === targetNum || extractNum(purDoc.invoiceNo) === targetNum);
      if (p) { matchType = "purchase"; matchDoc = p; }
    }
    if (!matchDoc && (refLower.includes("sales") || refLower.includes("invoice") || refLower.includes("inv") || refLower.includes("sls") || refLower.startsWith("sa"))) {
      const i = state.getInvoices().find(invDoc => extractNum(invDoc.id) === targetNum || extractNum(invDoc.voucherNo) === targetNum || extractNum(invDoc.refNo) === targetNum);
      if (i) { matchType = "invoice"; matchDoc = i; }
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

  root.innerHTML = `
    <div class="modal-overlay active" id="input-gst-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
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
            <label id="igst-item-qty-lbl" style="display:none; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="igst-item-qty-chk"> Show Item And Qty
            </label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="igst-purchase-return-chk" checked> Purchase Return
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
    </div>
  `;

  const overlay = document.getElementById("input-gst-overlay");
  const close = () => {
    if (overlay) overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("input-gst-close-x-btn")?.addEventListener("click", close);
  document.getElementById("btn-igst-close")?.addEventListener("click", close);

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
        const isKerala = (pur.state || "KERALA") === "KERALA";
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    });

    const matchingReturns = state.getPurchaseReturns().filter(ret => {
      const showReturns = document.getElementById("igst-purchase-return-chk") ? document.getElementById("igst-purchase-return-chk").checked : true;
      if (!showReturns) return false;

      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;
      
      if (stateFilter !== "All") {
        const isKerala = (ret.state || "KERALA") === "KERALA";
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    });

    const formatDateStr = (dStr) => {
      if (!dStr) return "";
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = parts[0];
        const monthIdx = parseInt(parts[1]) - 1;
        const day = parts[2];
        return `${day.padStart(2, '0')}-${months[monthIdx]}-${year}`;
      }
      return dStr;
    };

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
          const itemTaxRate = parseFloat(item.gstPercent || 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
          purAssessable += itemAmt;
          purGst += itemAmt * (itemTaxRate / 100);
          purCess += getItemCess(item, itemAmt);
        });

        const isKerala = !state.isDocInterState(pur);
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
          const itemTaxRate = parseFloat(item.gstPercent || (mat ? (mat.igst || mat.taxRate || 18) : 18));
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (itemTaxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        const isKerala = !state.isDocInterState(ret);
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
        const isKerala = !state.isDocInterState(pur);
        const vendor = state.getContacts().find(c => c.id === pur.contactId || c.id === pur.supplierId);

        if (showItemQty) {
          (pur.items || []).forEach(item => {
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const itemTaxRate = parseFloat(item.gstPercent || (mat ? (mat.igst || mat.taxRate || 18) : 18));
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
            const itemGst = parseFloat(item.gstAmount || (itemAmt * (itemTaxRate / 100))) || 0;
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
              invNo: pur.invoiceNo || pur.id,
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
            const itemTaxRate = parseFloat(item.gstPercent || (mat ? (mat.igst || mat.taxRate || 18) : 18));
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
            purAssessable += itemAmt;
            purGst += parseFloat(item.gstAmount || (itemAmt * (itemTaxRate / 100))) || 0;
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
              invNo: pur.invoiceNo || pur.id,
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
        const isKerala = !state.isDocInterState(ret);
        const vendor = state.getContacts().find(c => c.id === ret.contactId || c.id === ret.supplierId);

        if (showItemQty) {
          (ret.items || []).forEach(item => {
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const itemTaxRate = parseFloat(item.gstPercent || (mat ? (mat.igst || mat.taxRate || 18) : 18));
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            const itemGst = parseFloat(item.gstAmount || (itemAmt * (itemTaxRate / 100))) || 0;
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
              invNo: ret.id,
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
            const itemTaxRate = parseFloat(item.gstPercent || (mat ? (mat.igst || mat.taxRate || 18) : 18));
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            retAssessable += itemAmt;
            retGst += parseFloat(item.gstAmount || (itemAmt * (itemTaxRate / 100))) || 0;
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
              invNo: ret.id,
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
            let bAdj = parseFloat(bill.adjustments || 0);
            const bRo = parseFloat(bill.roundOff || 0);
            
            let sign = row.type.includes("return") ? -1 : 1;
            totalAdjustments += (bAdj * sign);
            totalRoundOff += (bRo * sign);
            
            if (!showItemQty) {
              totalNet += (bAdj * sign) + (bRo * sign);
            }
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
        let isFirstRowOfBill = false;
        let bAdj = 0;
        let bRo = 0;

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
          
          const bill = row.type === "purchase" ? state.getPurchases().find(p => p.id === row.id) :
                       row.type === "invoice" ? state.getInvoices().find(i => i.id === row.id) :
                       row.type === "purchase-return" ? state.getPurchaseReturns().find(r => r.id === row.id) :
                       row.type === "sales-return" ? state.getSalesReturns().find(s => s.id === row.id) : null;
          if (bill) {
            let adj = parseFloat(bill.adjustments || 0);
            let ro = parseFloat(bill.roundOff || 0);
            let sign = row.type.includes("return") ? -1 : 1;
            bAdj = adj * sign;
            bRo = ro * sign;
          }
        }

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
          
          if (isFirstRowOfBill) {
            partyNet += (bAdj + bRo);
          }
        }

        billAssessable += row.assessable;
        billSgst += row.sgst;
        billCgst += row.cgst;
        billIgst += row.igst;
        billTotalGst += row.totalGst;
        billCess += row.cess;
        billNet += row.net;
        
        if (isFirstRowOfBill && !showItemQty) {
           billNet += (bAdj + bRo);
        }

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
            let adj = parseFloat(bill.adjustments || 0);
            if (row.type.includes("return")) adj = -adj;
            let ro = parseFloat(bill.roundOff || 0);
            if (row.type.includes("return")) ro = -ro;
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

              let hasRenderedAdjList = false;
              if (bill.adjustmentsList && bill.adjustmentsList.length > 0) {
                bill.adjustmentsList.forEach(a => {
                  const amt = parseFloat(a.amount || 0);
                  if (amt !== 0) {
                    hasRenderedAdjList = true;
                    let cleanAmt = a.type === "Less" ? -amt : amt;
                    if (row.type.includes("return")) cleanAmt = -cleanAmt;
                    tableRowsHtml += `
                      <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                        <td colspan="12" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">${a.name || "Adjustment"}:</td>
                        <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${cleanAmt.toFixed(2)}</td>
                      </tr>
                    `;
                  }
                });
              }

              const baseAdj = parseFloat(bill.adjustments || 0);
              if (!hasRenderedAdjList && baseAdj !== 0) {
                let printAdj = baseAdj;
                if (row.type.includes("return")) printAdj = -printAdj;
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                    <td colspan="12" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Adjustments (Shipping/Other Charges):</td>
                    <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${printAdj.toFixed(2)}</td>
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
            let adj = parseFloat(bill.adjustments || 0);
            if (row.type.includes("return")) adj = -adj;
            let ro = parseFloat(bill.roundOff || 0);
            if (row.type.includes("return")) ro = -ro;
            const hasAdjOrRo = adj !== 0 || ro !== 0;

            if (hasAdjOrRo) {
              let hasRenderedAdjList = false;
              if (bill.adjustmentsList && bill.adjustmentsList.length > 0) {
                bill.adjustmentsList.forEach(a => {
                  const amt = parseFloat(a.amount || 0);
                  if (amt !== 0) {
                    hasRenderedAdjList = true;
                    let cleanAmt = a.type === "Less" ? -amt : amt;
                    if (row.type.includes("return")) cleanAmt = -cleanAmt;
                    tableRowsHtml += `
                      <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                        <td colspan="9" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">${a.name || "Adjustment"}:</td>
                        <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${cleanAmt.toFixed(2)}</td>
                      </tr>
                    `;
                  }
                });
              }

              const baseAdj = parseFloat(bill.adjustments || 0);
              if (!hasRenderedAdjList && baseAdj !== 0) {
                let printAdj = baseAdj;
                if (row.type.includes("return")) printAdj = -printAdj;
                tableRowsHtml += `
                  <tr style="background-color:#f8fafc; font-style:italic; font-size:0.7rem;">
                    <td colspan="9" style="padding:2px 4px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">Adjustments (Shipping/Other Charges):</td>
                    <td style="padding:2px 4px; text-align:right; font-weight:600; color:black;">${printAdj.toFixed(2)}</td>
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

              const grandTotal = billNet;
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
                m.showRecordPurchaseModal(container, pur, () => {
                  renderReportTable();
                });
              });
            }
          } else if (type === "purchase-return") {
            const ret = state.getPurchaseReturns().find(r => String(r.id) === String(id));
            if (ret) {
              import("./transactions.js").then(m => {
                m.showPurchaseReturnModal(container, ret, () => {
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
  document.getElementById("btn-igst-view")?.addEventListener("click", renderReportTable);
  document.getElementById("btn-igst-back")?.addEventListener("click", () => {
    document.getElementById("igst-monthly-chk").checked = true;
    igstPartySelectWrapper.style.display = "none";
    igstItemQtyLbl.style.display = "none";
    renderReportTable();
  });
  document.getElementById("igst-monthly-chk")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("igst-party-chk").checked = false;
      igstPartySelectWrapper.style.display = "none";
      igstItemQtyLbl.style.display = "none";
    } else {
      igstItemQtyLbl.style.display = "flex";
    }
    renderReportTable();
  });
  document.getElementById("igst-party-chk")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("igst-monthly-chk").checked = false;
      igstPartySelectWrapper.style.display = "block";
      igstItemQtyLbl.style.display = "flex";
    } else {
      igstPartySelectWrapper.style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("igst-party-select")?.addEventListener("change", renderReportTable);
  document.getElementById("igst-item-qty-chk")?.addEventListener("change", renderReportTable);
  document.getElementById("igst-purchase-return-chk")?.addEventListener("change", renderReportTable);
  document.getElementById("igst-gst-rate")?.addEventListener("change", renderReportTable);
  document.getElementById("igst-state")?.addEventListener("change", renderReportTable);

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

  root.innerHTML = `
    <div class="modal-overlay active" id="output-gst-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
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
            <label id="ogst-item-qty-lbl" style="display:none; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="ogst-item-qty-chk"> Show Item And Qty
            </label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="ogst-sales-return-chk" checked> Sales Return
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
    </div>
  `;

  const overlay = document.getElementById("output-gst-overlay");
  const close = () => {
    if (overlay) overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("output-gst-close-x-btn")?.addEventListener("click", close);
  document.getElementById("btn-ogst-close")?.addEventListener("click", close);

  function renderReportTable() {
    const fromDateVal = document.getElementById("ogst-from-date").value;
    const toDateVal = document.getElementById("ogst-to-date").value;
    const gstRateFilter = document.getElementById("ogst-gst-rate").value;
    const stateFilter = document.getElementById("ogst-state").value;
    const isMonthly = document.getElementById("ogst-monthly-chk").checked;
    
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

    const matchingInvoices = state.getInvoices().filter(inv => {
      if (inv.isCancelled) return false;
      const invDate = parseLocal(inv.date);
      if (startLimit && invDate < startLimit) return false;
      if (endLimit && invDate > endLimit) return false;
      
      const customer = state.getContacts().find(c => c.id === inv.contactId);
      const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
      if (gstinFilter === "With" && !hasGstin) return false;
      if (gstinFilter === "Without" && hasGstin) return false;

      if (stateFilter !== "All") {
        const isKerala = (inv.state || "KERALA") === "KERALA";
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    });

    const matchingReturns = state.getSalesReturns().filter(ret => {
      const showReturns = document.getElementById("ogst-sales-return-chk") ? document.getElementById("ogst-sales-return-chk").checked : true;
      if (!showReturns) return false;

      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;
      
      const customer = state.getContacts().find(c => c.id === ret.contactId);
      const hasGstin = customer && customer.gstin && customer.gstin.trim() !== "" && customer.gstin.toUpperCase() !== "UNSPECIFIED";
      if (gstinFilter === "With" && !hasGstin) return false;
      if (gstinFilter === "Without" && hasGstin) return false;

      if (stateFilter !== "All") {
        const isKerala = (ret.state || "KERALA") === "KERALA";
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    });

    const formatDateStr = (dStr) => {
      if (!dStr) return "";
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = parts[0];
        const monthIdx = parseInt(parts[1]) - 1;
        const day = parts[2];
        return `${day.padStart(2, '0')}-${months[monthIdx]}-${year}`;
      }
      return dStr;
    };

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
          const itemTaxRate = parseFloat(item.gstPercent || 18);
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
          invAssessable += itemAmt;
          invGst += parseFloat(item.gstAmount || (itemAmt * (itemTaxRate / 100))) || 0;
          invCess += getItemCess(item, itemAmt);
        });

        const isKerala = (inv.state || "KERALA") === "KERALA";
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
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          const itemTaxRate = mat ? parseFloat(mat.taxRate || 18) : 18;
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (itemTaxRate / 100);
          retCess += getItemCess(item, itemAmt);
        });

        const isKerala = (ret.state || "KERALA") === "KERALA";
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

      const showItemQty = document.getElementById("ogst-item-qty-chk") ? document.getElementById("ogst-item-qty-chk").checked : false;

      matchingInvoices.forEach(inv => {
        const isKerala = (inv.state || "KERALA") === "KERALA";
        const customer = state.getContacts().find(c => c.id === inv.contactId);

        if (showItemQty) {
          (inv.items || []).forEach(item => {
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const itemTaxRate = parseFloat(item.gstPercent || (mat ? mat.taxRate : 18) || 18);
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
            const itemGst = parseFloat(item.gstAmount || (itemAmt * (itemTaxRate / 100))) || 0;
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
              invNo: inv.invoiceNo || inv.id,
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
            const itemTaxRate = parseFloat(item.gstPercent || 18);
            if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

            const itemAmt = parseFloat(item.netValue !== undefined ? item.netValue : (item.amount !== undefined ? item.amount : (item.quantity * item.price))) || 0;
            invAssessable += itemAmt;
            invGst += parseFloat(item.gstAmount || (itemAmt * (itemTaxRate / 100))) || 0;
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
              invNo: inv.invoiceNo || inv.id,
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
        const isKerala = (ret.state || "KERALA") === "KERALA";
        const customer = state.getContacts().find(c => c.id === ret.contactId);

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
              type: "sales-return",
              date: ret.date,
              partyName: (ret.contactName || (customer ? customer.name : "Unknown Customer")) + " (Return)",
              gstin: customer ? (customer.gstin || "Unspecified") : "",
              invNo: ret.id,
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
              type: "sales-return",
              date: ret.date,
              partyName: (ret.contactName || (customer ? customer.name : "Unknown Customer")) + " (Return)",
              gstin: customer ? (customer.gstin || "Unspecified") : "",
              invNo: ret.id,
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
                  container,
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
                m.showSalesReturnModal(container, ret, () => {
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
  const ogstItemQtyLbl = document.getElementById("ogst-item-qty-lbl");
  document.getElementById("btn-ogst-view")?.addEventListener("click", renderReportTable);
  document.getElementById("btn-ogst-back")?.addEventListener("click", () => {
    document.getElementById("ogst-monthly-chk").checked = true;
    ogstPartySelectWrapper.style.display = "none";
    ogstItemQtyLbl.style.display = "none";
    renderReportTable();
  });
  document.getElementById("ogst-monthly-chk")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("ogst-party-chk").checked = false;
      ogstPartySelectWrapper.style.display = "none";
      ogstItemQtyLbl.style.display = "none";
    } else {
      ogstItemQtyLbl.style.display = "flex";
    }
    renderReportTable();
  });
  document.getElementById("ogst-party-chk")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("ogst-monthly-chk").checked = false;
      ogstPartySelectWrapper.style.display = "block";
      ogstItemQtyLbl.style.display = "flex";
    } else {
      ogstPartySelectWrapper.style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("ogst-party-select")?.addEventListener("change", renderReportTable);
  document.getElementById("ogst-item-qty-chk")?.addEventListener("change", renderReportTable);
  document.getElementById("ogst-sales-return-chk")?.addEventListener("change", renderReportTable);
  document.getElementById("ogst-gst-rate")?.addEventListener("change", renderReportTable);
  document.getElementById("ogst-gstin-filter")?.addEventListener("change", renderReportTable);
  document.getElementById("ogst-state")?.addEventListener("change", renderReportTable);

  renderReportTable();
}

function showGroupsModal(mainGroupName, groups, container) {
  const root = document.getElementById("modal-container-root") || container;
  const overlayId = `pl-groups-modal-overlay-${mainGroupName.replace(/\s+/g, "-")}`;
  const existing = document.getElementById(overlayId);
  if (existing) {
    root.appendChild(existing);
    if (window.bringToFront) { window.bringToFront(existing); } else { existing.style.zIndex = "2000"; }
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
  if (window.bringToFront) { window.bringToFront(overlay); }
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontFamily = "Tahoma, sans-serif";

  const balances = state.getAccountBalances(reportEndDate);
  const groupBalances = {};

  function getRecursiveGroupBalance(groupName) {
    let sum = 0;
    const CORE_GROUPS = {
      "1010": "CASH-IN-HAND", "1020": "BANK ACCOUNTS", "1200": "CURRENT ASSETS", "2200": "DUTIES & TAXES",
      "3100": "CAPITAL ACCOUNT", "3200": "CAPITAL ACCOUNT", "4100": "SALES ACCOUNT", "4110": "SALES ACCOUNT",
      "4200": "INDIRECT INCOME", "4300": "INDIRECT INCOME", "5100": "DIRECT EXPENSES", "5110": "DIRECT EXPENSES",
      "5200": "INDIRECT EXPENSES", "5300": "INDIRECT EXPENSES", "5400": "INDIRECT EXPENSES", "5500": "INDIRECT EXPENSES",
      "5600": "INDIRECT EXPENSES"
    };

    for (const [code, acc] of Object.entries(ACCOUNTS)) {
      const g = CORE_GROUPS[code];
      if (g && g.toUpperCase() === groupName.toUpperCase()) {
        sum += balances[code] ? balances[code].balance : 0;
      }
    }

    state.getLedgers().forEach(l => {
      if ((l.groupName || "").toUpperCase() === groupName.toUpperCase()) {
        sum += balances[l.code] ? balances[l.code].balance : 0;
      }
    });

    const allGroups = state.getAccountGroups ? state.getAccountGroups() : [];
    const children = allGroups.filter(g => (g.under || "").toUpperCase() === groupName.toUpperCase());
    children.forEach(child => {
      sum += getRecursiveGroupBalance(child.name);
    });

    if (groupName.toUpperCase() === "SUNDRY CREDITORS") {
      state.getContacts().filter(c => c.type === "supplier").forEach(c => {
        sum += balances[c.id] ? balances[c.id].balance : 0;
      });
    } else if (groupName.toUpperCase() === "SUNDRY DEBTORS") {
      state.getContacts().filter(c => c.type === "customer").forEach(c => {
        sum += balances[c.id] ? balances[c.id].balance : 0;
      });
    }

    return sum;
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
      balanceStr: `₹${absVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balanceType}`
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
        const parent = allGroups.find(g => g.name.toUpperCase() === current);
        if (parent && parent.under) {
          current = parent.under.toUpperCase();
        } else {
          break;
        }
      }

      const belongsToSubgroup = filteredGroups.some(sub => {
        let cur = gnUpper;
        for (let i = 0; i < 10; i++) {
          if (cur === sub) return true;
          const parent = allGroups.find(g => g.name.toUpperCase() === cur);
          if (parent && parent.under) cur = parent.under.toUpperCase();
          else break;
        }
        return false;
      });

      if (isCurrentAsset && !belongsToSubgroup) {
        isDirect = true;
      }
    }

    if (isDirect) {
      if (l.name.toUpperCase() === "COST OF GOODS SOLD (COGS)" || l.name.toUpperCase() === "STOCK-IN-HAND") return;
      const rawVal = balances[l.code] ? balances[l.code].balance : 0;
      if (Math.abs(rawVal) < 0.001) return;
      const absVal = Math.abs(rawVal);
      const balanceType = rawVal >= 0 ? "Dr" : "Cr";
      displayRows.push({
        name: l.name,
        type: "ledger",
        code: l.code,
        balanceStr: `₹${absVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balanceType}`
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
        balanceStr: `₹${closingStockVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dr`
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
  const allGroups = state.getAccountGroups ? state.getAccountGroups() : [];
  const subNames = allGroups.filter(g => (g.under || "").toUpperCase() === name.toUpperCase()).map(g => g.name.toUpperCase());
  
  if (name.toUpperCase() === "CURRENT LIABILITIES") {
    if (!subNames.includes("SUNDRY CREDITORS")) subNames.push("SUNDRY CREDITORS");
  } else if (name.toUpperCase() === "CURRENT ASSETS") {
    if (!subNames.includes("SUNDRY DEBTORS")) subNames.push("SUNDRY DEBTORS");
    // Add any other group under ASSETS that is not FIXED ASSETS or CURRENT ASSETS
    allGroups.forEach(g => {
      if ((g.under || "").toUpperCase() === "ASSETS") {
        const uName = g.name.toUpperCase();
        if (uName !== "FIXED ASSETS" && uName !== "CURRENT ASSETS" && !subNames.includes(uName)) {
          subNames.push(uName);
        }
      }
    });
  }

  if (subNames.length > 0) {
    showGroupsModal(name, subNames, container);
  } else {
    showGroupSummaryModal(name);
  }
}


export function showGroupSummaryModal(gName) {
  selectedGroupName = gName;
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const modalId = `modal-group-summary-${gName.replace(/\s+/g, "-")}`;
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    if (window.bringToFront) { window.bringToFront(existing); } else { existing.style.zIndex = "2000"; }
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.className = "modal-overlay active";
  modalEl.style.position = "fixed";
  modalEl.style.top = "0";
  modalEl.style.left = "0";
  modalEl.style.width = "100%";
  modalEl.style.height = "100%";
  modalEl.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
  if (window.bringToFront) { window.bringToFront(modalEl); }
  modalEl.style.display = "flex";
  modalEl.style.alignItems = "center";
  modalEl.style.justifyContent = "center";

  const renderContent = () => {
    const html = renderGroupSummaryHtml();
    modalEl.innerHTML = `
      <div class="modal-content" style="pointer-events: auto; width: 1100px; max-width: 95%; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); overflow: hidden; font-family: Tahoma, sans-serif;">
        <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 10px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
          <span>Group Summary: ${gName}</span>
          <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 15px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9;">
          ${html}
        </div>
      </div>
    `;

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
  selectedIndividualLedgerId = ledgerId;
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const safeLedgerId = (ledgerId || "new").replace(/\s+/g, "-");
  const modalId = `window-individual-ledger-${safeLedgerId}`;
  const existing = document.getElementById(modalId);
  if (existing) {
    if (window.bringToFront) { window.bringToFront(existing); }
    return;
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.className = "erp-window";
  modalEl.style.position = "absolute";
  const offset = Math.floor(Math.random() * 50);
  modalEl.style.top = (50 + offset) + "px";
  modalEl.style.left = (50 + offset) + "px";
  modalEl.style.width = "85vw";
  modalEl.style.height = "85vh";
  modalEl.style.backgroundColor = "#fff";
  modalEl.style.borderRadius = "4px";
  modalEl.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
  modalEl.style.display = "flex";
  modalEl.style.flexDirection = "column";
  modalEl.style.overflow = "hidden";
  modalEl.style.fontFamily = "Tahoma, sans-serif";

  if (window.bringToFront) { window.bringToFront(modalEl); }

  const renderContent = () => {
    const html = renderIndividualLedgerHtml();
    modalEl.innerHTML = `
      <div class="window-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 10px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3b8a; cursor: move; flex-shrink: 0;">
        <span>Ledger Statement</span>
        <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 15px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9;">
        ${html}
      </div>
    `;

    const closeBtn = modalEl.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());

    const selectLedger = modalEl.querySelector("#il-select-ledger");
    if (selectLedger) {
      selectLedger.addEventListener("change", (e) => {
        selectedIndividualLedgerId = e.target.value;
        renderContent();
      });
    }

    const selectVType = modalEl.querySelector("#il-select-vtype");
    if (selectVType) {
      selectVType.addEventListener("change", (e) => {
        ledgerVoucherTypeFilter = e.target.value;
        renderContent();
      });
    }

    const selectEmployee = modalEl.querySelector("#il-select-employee");
    if (selectEmployee) {
      selectEmployee.addEventListener("change", (e) => {
        ledgerEmployeeFilter = e.target.value;
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
        renderContent();
      });
    }

    const chkBalPrint = modalEl.querySelector("#il-chk-balprint");
    if (chkBalPrint) {
      chkBalPrint.addEventListener("change", (e) => {
        ledgerShowBalanceInPrint = e.target.checked;
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

export function showSalesReturnGstReportModal(container) {
  const root = document.getElementById("modal-container-root");
  
  window.srgstMonthDblClick = (row) => {
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

      const fromEl = document.getElementById("srgst-from-date");
      const toEl = document.getElementById("srgst-to-date");
      const monthlyChk = document.getElementById("srgst-monthly-chk");
      const partyChk = document.getElementById("srgst-party-chk");

      if (fromEl) fromEl.value = formatDateToLocalInput(startOfChosenMonth);
      if (toEl) toEl.value = formatDateToLocalInput(endOfChosenMonth);
      if (monthlyChk) monthlyChk.checked = false;
      if (partyChk) partyChk.checked = false;

      renderReportTable();
    } catch (err) {
      console.error("Error in srgstMonthDblClick:", err);
      alert("Error: " + err.message);
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const fiscalStartYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
  const defaultFrom = `${fiscalStartYear}-04-01`;
  const defaultTo = now.toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="srgst-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1400px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice-dollar"></i> SALES RETURN GST REPORT</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="srgst-close-x-btn">&times;</button>
        </div>

        <div style="background-color:#cbd5e1; padding:6px; border:1px solid #94a3b8; border-radius:2px; display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) 120px 80px; gap:8px; align-items:end;">
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">From:</label>
            <input type="date" id="srgst-from-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${defaultFrom}">
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">To:</label>
            <input type="date" id="srgst-to-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${defaultTo}">
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">GST %</label>
            <select id="srgst-gst-rate" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Bill Series</label>
            <select id="srgst-bill-series" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">State</label>
            <select id="srgst-state" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="KERALA">KERALA</option>
              <option value="OUTSTATE">OUTSIDE STATE</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Bill Type</label>
            <select id="srgst-bill-type" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
            </select>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="srgst-monthly-chk" checked> Monthly
            </label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="srgst-party-chk"> Party Wise
            </label>
          </div>
          
          <div style="display:flex; gap:4px;">
            <button type="button" class="btn btn-secondary" id="btn-srgst-view" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-srgst-back" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px; display:none;">Back</button>
            <button type="button" class="btn btn-secondary" id="btn-srgst-close" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">Close</button>
          </div>
        </div>
        
        <div id="srgst-party-select-wrapper" style="display:none; background-color:#cbd5e1; padding:0 6px 6px 6px;">
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Select Customer</label>
            <select id="srgst-party-select" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:200px; border:1px solid #94a3b8;">
              <option value="All">All</option>
              ${Array.from(new Set(state.getContacts().filter(c => c.type === "customer" || c.listInCustomerList === true).map(c => c.name))).sort().map(name => `<option value="${name}">${name}</option>`).join("")}
            </select>
        </div>

        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 10px;" id="srgst-table-container">
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("srgst-overlay");
  const close = () => {
    if (overlay) overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("srgst-close-x-btn")?.addEventListener("click", close);
  document.getElementById("btn-srgst-close")?.addEventListener("click", close);

  function renderReportTable() {
    const fromDateVal = document.getElementById("srgst-from-date").value;
    const toDateVal = document.getElementById("srgst-to-date").value;
    const gstRateFilter = document.getElementById("srgst-gst-rate").value;
    const stateFilter = document.getElementById("srgst-state").value;
    const isMonthly = document.getElementById("srgst-monthly-chk").checked;
    const isPartyWise = document.getElementById("srgst-party-chk").checked;
    const selectedParty = document.getElementById("srgst-party-select") ? document.getElementById("srgst-party-select").value : "All";
    
    const backBtn = document.getElementById("btn-srgst-back");
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

    const matchingReturns = state.getSalesReturns().filter(ret => {
      if (ret.isCancelled) return false;
      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;
      
      if (stateFilter !== "All") {
        const isKerala = !state.isDocInterState(ret);
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    });

    const formatDateStr = (dStr) => {
      if (!dStr) return "";
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = parts[0];
        const monthIdx = parseInt(parts[1]) - 1;
        const day = parts[2];
        return `${day.padStart(2, '0')}-${months[monthIdx]}-${year}`;
      }
      return dStr;
    };

    const containerEl = document.getElementById("srgst-table-container");

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
          
          let cAmt = 0;
          if (item.cessAmount !== undefined && item.cessAmount !== "") {
              cAmt = parseFloat(item.cessAmount) || 0;
          } else if (item.cessPercent) {
              cAmt = itemAmt * (parseFloat(item.cessPercent) / 100);
          } else if (mat && mat.cessPercent) {
              cAmt = itemAmt * (parseFloat(mat.cessPercent) / 100);
          }
          retCess += cAmt;
        });

        const isKerala = !state.isDocInterState(ret);
        const cgst = isKerala ? retGst / 2 : 0;
        const sgst = isKerala ? retGst / 2 : 0;
        const igst = isKerala ? 0 : retGst;

        addEntry(ret.date, retAssessable, cgst, sgst, igst, retCess);
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
          SALES RETURN GST REPORT from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)}
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; color:black;">
          <thead>
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Month</th>
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
            ${sortedRows.map(row => `
              <tr data-month="${row.monthNum}" data-year="${row.yearNum}" style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'" ondblclick="window.srgstMonthDblClick(this)">
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
      let detailedRows = [];

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
          let cAmt = 0;
          if (item.cessAmount !== undefined && item.cessAmount !== "") {
              cAmt = parseFloat(item.cessAmount) || 0;
          } else if (item.cessPercent) {
              cAmt = itemAmt * (parseFloat(item.cessPercent) / 100);
          } else if (mat && mat.cessPercent) {
              cAmt = itemAmt * (parseFloat(mat.cessPercent) / 100);
          }
          retCess += cAmt;
        });

        if (retAssessable > 0) {
          const isKerala = !state.isDocInterState(ret);
          const cgst = isKerala ? retGst / 2 : 0;
          const sgst = isKerala ? retGst / 2 : 0;
          const igst = isKerala ? 0 : retGst;
          const customer = state.getContacts().find(c => c.id === ret.contactId);

          detailedRows.push({
            id: ret.id,
            date: ret.date,
            partyName: (ret.contactName || (customer ? customer.name : "Unknown Customer")),
            gstin: customer ? (customer.gstin || "Unspecified") : "",
            invNo: ret.id,
            assessable: retAssessable,
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            totalGst: retGst,
            cess: retCess,
            net: retAssessable + retGst + retCess,
            timestamp: parseLocal(ret.date).getTime()
          });
        }
      });

      if (isPartyWise && selectedParty !== "All") {
        detailedRows = detailedRows.filter(row => row.partyName.trim() === selectedParty.trim());
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

      let totalAssessable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0, totalGstAmt = 0, totalCess = 0, totalNet = 0;
      let tableRowsHtml = "";
      
      let currentParty = null;
      let partyAssessable = 0, partySgst = 0, partyCgst = 0, partyIgst = 0, partyTotalGst = 0, partyCess = 0, partyNet = 0;

      const appendPartyTotalRow = (partyName) => {
        return `
          <tr style="background-color:#e2e8f0; font-weight:bold; border-top:1px solid #94a3b8; border-bottom:1px solid #94a3b8;">
            <td colspan="4" style="padding:4px; border-right:1px solid #cbd5e1; padding-left:12px; color:#1e3b8b;">Total for ${partyName}:</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${partyAssessable.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${partySgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${partyCgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${partyIgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${partyTotalGst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${partyCess.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; font-weight:bold; color:#1e293b;">${partyNet.toFixed(2)}</td>
          </tr>
        `;
      };

      detailedRows.forEach((row, index) => {
        if (isPartyWise) {
          if (currentParty !== null && currentParty !== row.partyName) {
            tableRowsHtml += appendPartyTotalRow(currentParty);
            partyAssessable = partySgst = partyCgst = partyIgst = partyTotalGst = partyCess = partyNet = 0;
          }
          currentParty = row.partyName;
          partyAssessable += row.assessable; partySgst += row.sgst; partyCgst += row.cgst; partyIgst += row.igst;
          partyTotalGst += row.totalGst; partyCess += row.cess; partyNet += row.net;
        }

        totalAssessable += row.assessable; totalSgst += row.sgst; totalCgst += row.cgst; totalIgst += row.igst;
        totalGstAmt += row.totalGst; totalCess += row.cess; totalNet += row.net;

        tableRowsHtml += `
          <tr style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc;">
            <td style="padding:4px; border-right:1px solid #cbd5e1;">${formatDateStr(row.date)}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-weight:600;">${row.partyName}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-family:monospace;">${row.gstin}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-weight:500;">${row.invNo}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.sgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.cgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${row.igst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${row.totalGst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${row.cess.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; font-weight:bold;">${row.net.toFixed(2)}</td>
          </tr>
        `;

        if (isPartyWise && index === detailedRows.length - 1) {
          tableRowsHtml += appendPartyTotalRow(currentParty);
        }
      });

      containerEl.innerHTML = `
        <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
          SALES RETURN GST REPORT from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)}
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; color:black;">
          <thead>
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Date</th>
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Party Name</th>
              <th style="padding:6px; border-right:1px solid #cbd5e1;">GSTIN</th>
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Return No</th>
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
            ${tableRowsHtml}
            ${detailedRows.length === 0 ? `
              <tr>
                <td colspan="11" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No detailed records found.</td>
              </tr>
            ` : ""}
            <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
              <td colspan="4" style="padding:6px; border-right:1px solid #cbd5e1;">Grand Total:</td>
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
    }
  }

  document.getElementById("btn-srgst-view")?.addEventListener("click", renderReportTable);
  document.getElementById("btn-srgst-back")?.addEventListener("click", () => {
    document.getElementById("srgst-monthly-chk").checked = true;
    document.getElementById("srgst-party-select-wrapper").style.display = "none";
    renderReportTable();
  });
  document.getElementById("srgst-monthly-chk")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("srgst-party-chk").checked = false;
      document.getElementById("srgst-party-select-wrapper").style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("srgst-party-chk")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("srgst-monthly-chk").checked = false;
      document.getElementById("srgst-party-select-wrapper").style.display = "block";
    } else {
      document.getElementById("srgst-party-select-wrapper").style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("srgst-party-select")?.addEventListener("change", renderReportTable);
  document.getElementById("srgst-gst-rate")?.addEventListener("change", renderReportTable);
  document.getElementById("srgst-state")?.addEventListener("change", renderReportTable);

  renderReportTable();
}

export function showPurchaseReturnGstReportModal(container) {
  const root = document.getElementById("modal-container-root");
  
  window.prgstMonthDblClick = (row) => {
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

      const fromEl = document.getElementById("prgst-from-date");
      const toEl = document.getElementById("prgst-to-date");
      const monthlyChk = document.getElementById("prgst-monthly-chk");
      const partyChk = document.getElementById("prgst-party-chk");

      if (fromEl) fromEl.value = formatDateToLocalInput(startOfChosenMonth);
      if (toEl) toEl.value = formatDateToLocalInput(endOfChosenMonth);
      if (monthlyChk) monthlyChk.checked = false;
      if (partyChk) partyChk.checked = false;

      renderReportTable();
    } catch (err) {
      console.error("Error in prgstMonthDblClick:", err);
      alert("Error: " + err.message);
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const fiscalStartYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
  const defaultFrom = `${fiscalStartYear}-04-01`;
  const defaultTo = now.toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="prgst-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1400px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice-dollar"></i> PURCHASE RETURN GST REPORT</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="prgst-close-x-btn">&times;</button>
        </div>

        <div style="background-color:#cbd5e1; padding:6px; border:1px solid #94a3b8; border-radius:2px; display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) 120px 80px; gap:8px; align-items:end;">
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">From:</label>
            <input type="date" id="prgst-from-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${defaultFrom}">
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">To:</label>
            <input type="date" id="prgst-to-date" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;" value="${defaultTo}">
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">GST %</label>
            <select id="prgst-gst-rate" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Bill Series</label>
            <select id="prgst-bill-series" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">State</label>
            <select id="prgst-state" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:100%; border:1px solid #94a3b8;">
              <option value="All">All</option>
              <option value="KERALA">KERALA</option>
              <option value="OUTSTATE">OUTSIDE STATE</option>
            </select>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="prgst-monthly-chk" checked> Monthly
            </label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.75rem; color:black; cursor:pointer;">
              <input type="checkbox" id="prgst-party-chk"> Party Wise
            </label>
          </div>
          
          <div style="display:flex; gap:4px;">
            <button type="button" class="btn btn-secondary" id="btn-prgst-view" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-prgst-back" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px; display:none;">Back</button>
            <button type="button" class="btn btn-secondary" id="btn-prgst-close" style="font-weight:bold; background:#e2e8f0; color:black; border:1px solid #475569; padding: 2px 10px; width:100%; font-size:0.75rem; height:24px;">Close</button>
          </div>
        </div>
        
        <div id="prgst-party-select-wrapper" style="display:none; background-color:#cbd5e1; padding:0 6px 6px 6px;">
            <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Select Vendor</label>
            <select id="prgst-party-select" class="form-control" style="background:white; color:black; padding:2px; font-size:0.8rem; width:200px; border:1px solid #94a3b8;">
              <option value="All">All</option>
              ${Array.from(new Set(state.getContacts().filter(c => c.type === "supplier" || c.listInVendorList === true).map(c => c.name))).sort().map(name => `<option value="${name}">${name}</option>`).join("")}
            </select>
        </div>

        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding: 10px;" id="prgst-table-container">
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("prgst-overlay");
  const close = () => {
    if (overlay) overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("prgst-close-x-btn")?.addEventListener("click", close);
  document.getElementById("btn-prgst-close")?.addEventListener("click", close);

  function renderReportTable() {
    const fromDateVal = document.getElementById("prgst-from-date").value;
    const toDateVal = document.getElementById("prgst-to-date").value;
    const gstRateFilter = document.getElementById("prgst-gst-rate").value;
    const stateFilter = document.getElementById("prgst-state").value;
    const isMonthly = document.getElementById("prgst-monthly-chk").checked;
    const isPartyWise = document.getElementById("prgst-party-chk").checked;
    const selectedParty = document.getElementById("prgst-party-select") ? document.getElementById("prgst-party-select").value : "All";
    
    const backBtn = document.getElementById("btn-prgst-back");
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

    const matchingReturns = state.getPurchaseReturns().filter(ret => {
      if (ret.isCancelled) return false;
      const retDate = parseLocal(ret.date);
      if (startLimit && retDate < startLimit) return false;
      if (endLimit && retDate > endLimit) return false;
      
      if (stateFilter !== "All") {
        const isKerala = !state.isDocInterState(ret);
        if (stateFilter === "KERALA" && !isKerala) return false;
        if (stateFilter === "OUTSTATE" && isKerala) return false;
      }
      return true;
    });

    const formatDateStr = (dStr) => {
      if (!dStr) return "";
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = parts[0];
        const monthIdx = parseInt(parts[1]) - 1;
        const day = parts[2];
        return `${day.padStart(2, '0')}-${months[monthIdx]}-${year}`;
      }
      return dStr;
    };

    const containerEl = document.getElementById("prgst-table-container");

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
          
          let cAmt = 0;
          if (item.cessAmount !== undefined && item.cessAmount !== "") {
              cAmt = parseFloat(item.cessAmount) || 0;
          } else if (item.cessPercent) {
              cAmt = itemAmt * (parseFloat(item.cessPercent) / 100);
          } else if (mat && mat.cessPercent) {
              cAmt = itemAmt * (parseFloat(mat.cessPercent) / 100);
          }
          retCess += cAmt;
        });

        const isKerala = !state.isDocInterState(ret);
        const cgst = isKerala ? retGst / 2 : 0;
        const sgst = isKerala ? retGst / 2 : 0;
        const igst = isKerala ? 0 : retGst;

        addEntry(ret.date, retAssessable, cgst, sgst, igst, retCess);
      });

      const sortedRows = Object.values(monthlyGroups).sort((a, b) => a.sortKey - b.sortKey);

      let totalAssessable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0, totalGstAmt = 0, totalCess = 0, totalNet = 0;

      sortedRows.forEach(row => {
        totalAssessable += row.assessable; totalSgst += row.sgst; totalCgst += row.cgst; totalIgst += row.igst;
        totalGstAmt += row.totalGst; totalCess += row.cess; totalNet += row.net;
      });

      containerEl.innerHTML = `
        <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
          PURCHASE RETURN GST REPORT from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)}
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; color:black;">
          <thead>
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Month</th>
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
            ${sortedRows.map(row => `
              <tr data-month="${row.monthNum}" data-year="${row.yearNum}" style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'" ondblclick="window.prgstMonthDblClick(this)">
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
      let detailedRows = [];

      matchingReturns.forEach(ret => {
        let retAssessable = 0, retGst = 0, retCess = 0;

        (ret.items || []).forEach(item => {
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          const itemTaxRate = mat ? parseFloat(mat.taxRate || 18) : 18;
          if (gstRateFilter !== "All" && parseFloat(gstRateFilter) !== itemTaxRate) return;

          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          retAssessable += itemAmt;
          retGst += itemAmt * (itemTaxRate / 100);
          let cAmt = 0;
          if (item.cessAmount !== undefined && item.cessAmount !== "") {
              cAmt = parseFloat(item.cessAmount) || 0;
          } else if (item.cessPercent) {
              cAmt = itemAmt * (parseFloat(item.cessPercent) / 100);
          } else if (mat && mat.cessPercent) {
              cAmt = itemAmt * (parseFloat(mat.cessPercent) / 100);
          }
          retCess += cAmt;
        });

        if (retAssessable > 0) {
          const isKerala = !state.isDocInterState(ret);
          const cgst = isKerala ? retGst / 2 : 0;
          const sgst = isKerala ? retGst / 2 : 0;
          const igst = isKerala ? 0 : retGst;
          const customer = state.getContacts().find(c => c.id === ret.contactId);

          detailedRows.push({
            id: ret.id,
            date: ret.date,
            partyName: (ret.contactName || (customer ? customer.name : "Unknown Vendor")),
            gstin: customer ? (customer.gstin || "Unspecified") : "",
            invNo: ret.id,
            assessable: retAssessable,
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            totalGst: retGst,
            cess: retCess,
            net: retAssessable + retGst + retCess,
            timestamp: parseLocal(ret.date).getTime()
          });
        }
      });

      if (isPartyWise && selectedParty !== "All") {
        detailedRows = detailedRows.filter(row => row.partyName.trim() === selectedParty.trim());
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

      let totalAssessable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0, totalGstAmt = 0, totalCess = 0, totalNet = 0;
      let tableRowsHtml = "";
      
      let currentParty = null;
      let partyAssessable = 0, partySgst = 0, partyCgst = 0, partyIgst = 0, partyTotalGst = 0, partyCess = 0, partyNet = 0;

      const appendPartyTotalRow = (partyName) => {
        return `
          <tr style="background-color:#e2e8f0; font-weight:bold; border-top:1px solid #94a3b8; border-bottom:1px solid #94a3b8;">
            <td colspan="4" style="padding:4px; border-right:1px solid #cbd5e1; padding-left:12px; color:#1e3b8b;">Total for ${partyName}:</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${partyAssessable.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${partySgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${partyCgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${partyIgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${partyTotalGst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${partyCess.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; font-weight:bold; color:#1e293b;">${partyNet.toFixed(2)}</td>
          </tr>
        `;
      };

      detailedRows.forEach((row, index) => {
        if (isPartyWise) {
          if (currentParty !== null && currentParty !== row.partyName) {
            tableRowsHtml += appendPartyTotalRow(currentParty);
            partyAssessable = partySgst = partyCgst = partyIgst = partyTotalGst = partyCess = partyNet = 0;
          }
          currentParty = row.partyName;
          partyAssessable += row.assessable; partySgst += row.sgst; partyCgst += row.cgst; partyIgst += row.igst;
          partyTotalGst += row.totalGst; partyCess += row.cess; partyNet += row.net;
        }

        totalAssessable += row.assessable; totalSgst += row.sgst; totalCgst += row.cgst; totalIgst += row.igst;
        totalGstAmt += row.totalGst; totalCess += row.cess; totalNet += row.net;

        tableRowsHtml += `
          <tr style="border-bottom:1px solid #cbd5e1; background-color:#f8fafc;">
            <td style="padding:4px; border-right:1px solid #cbd5e1;">${formatDateStr(row.date)}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-weight:600;">${row.partyName}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-family:monospace;">${row.gstin}</td>
            <td style="padding:4px; border-right:1px solid #cbd5e1; font-weight:500;">${row.invNo}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${row.assessable.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.sgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#0f766e;">${row.cgst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; color:#b91c1c;">${row.igst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${row.totalGst.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; border-right:1px solid #cbd5e1;">${row.cess.toFixed(2)}</td>
            <td style="padding:4px; text-align:right; font-weight:bold;">${row.net.toFixed(2)}</td>
          </tr>
        `;

        if (isPartyWise && index === detailedRows.length - 1) {
          tableRowsHtml += appendPartyTotalRow(currentParty);
        }
      });

      containerEl.innerHTML = `
        <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-bottom:8px; color:#1e3b8b;">
          PURCHASE RETURN GST REPORT from ${formatDateStr(fromDateVal)} to ${formatDateStr(toDateVal)}
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; color:black;">
          <thead>
            <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Date</th>
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Party Name</th>
              <th style="padding:6px; border-right:1px solid #cbd5e1;">GSTIN</th>
              <th style="padding:6px; border-right:1px solid #cbd5e1;">Return No</th>
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
            ${tableRowsHtml}
            ${detailedRows.length === 0 ? `
              <tr>
                <td colspan="11" style="text-align:center; padding:20px; color:#64748b; font-style:italic;">No detailed records found.</td>
              </tr>
            ` : ""}
            <tr style="background-color:#e2e8f0; font-weight:bold; border-top:2px solid #94a3b8; border-bottom: 3px double #1e293b;">
              <td colspan="4" style="padding:6px; border-right:1px solid #cbd5e1;">Grand Total:</td>
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
    }
  }

  document.getElementById("btn-prgst-view")?.addEventListener("click", renderReportTable);
  document.getElementById("btn-prgst-back")?.addEventListener("click", () => {
    document.getElementById("prgst-monthly-chk").checked = true;
    document.getElementById("prgst-party-select-wrapper").style.display = "none";
    renderReportTable();
  });
  document.getElementById("prgst-monthly-chk")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("prgst-party-chk").checked = false;
      document.getElementById("prgst-party-select-wrapper").style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("prgst-party-chk")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("prgst-monthly-chk").checked = false;
      document.getElementById("prgst-party-select-wrapper").style.display = "block";
    } else {
      document.getElementById("prgst-party-select-wrapper").style.display = "none";
    }
    renderReportTable();
  });
  document.getElementById("prgst-party-select")?.addEventListener("change", renderReportTable);
  document.getElementById("prgst-gst-rate")?.addEventListener("change", renderReportTable);
  document.getElementById("prgst-state")?.addEventListener("change", renderReportTable);

  renderReportTable();
}









