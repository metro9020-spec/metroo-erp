import { state } from "../state.js";
import { renderPrintHeaderHtml, formatDateDisplay } from "./reports.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";

// Compute balance summary for a single ledger code in a date range
function getLedgerPeriodSummary(accId, fromDate, toDate) {
  const transactions = state.getTransactions() || [];
  const ledgers = state.getLedgers() || [];

  let openingDr = 0;
  let openingCr = 0;

  // 1. Initial Opening Balance
  const ledger = ledgers.find(l => l.code === accId);
  if (ledger) {
    const op = parseFloat(ledger.openingBalance) || 0;
    if (ledger.balanceType === "Debit") {
      openingDr += op;
    } else {
      openingCr += op;
    }
  }

  const isCashLedger = String(accId) === "L0001" || String(accId) === "1010" || (ledger && String(ledger.groupName || "").toUpperCase() === "CASH-IN-HAND");
  const isBankLedger = String(accId) === "1020" || (ledger && String(ledger.groupName || "").toUpperCase() === "BANK ACCOUNTS");

  function matchesAccount(entryAccountId) {
    if (!entryAccountId) return false;
    if (String(entryAccountId) === String(accId)) return true;
    const canonicalEntry = String(state.getCanonicalAccountId(entryAccountId) || "");
    const canonicalAcc = String(state.getCanonicalAccountId(accId) || "");
    if (canonicalEntry === canonicalAcc) return true;
    if (isCashLedger && (canonicalEntry === "1010" || canonicalEntry === "L0001" || entryAccountId === "1010" || entryAccountId === "L0001")) return true;
    if (isBankLedger && (canonicalEntry === "1020" || entryAccountId === "1020")) return true;
    return false;
  }

  // 2. Transactions before fromDate
  transactions.forEach(tx => {
    if (fromDate && tx.date < fromDate) {
      (tx.entries || []).forEach(e => {
        if (matchesAccount(e.accountId)) {
          openingDr += parseFloat(e.debit) || 0;
          openingCr += parseFloat(e.credit) || 0;
        }
      });
    }
  });

  let openingBalance = 0;
  let openingBalanceSuffix = "Dr";
  if (openingDr >= openingCr) {
    openingBalance = openingDr - openingCr;
    openingBalanceSuffix = "Dr";
  } else {
    openingBalance = openingCr - openingDr;
    openingBalanceSuffix = "Cr";
  }

  // 3. Transactions inside period
  let debit = 0;
  let credit = 0;
  transactions.forEach(tx => {
    if ((!fromDate || tx.date >= fromDate) && (!toDate || tx.date <= toDate)) {
      (tx.entries || []).forEach(e => {
        if (matchesAccount(e.accountId)) {
          debit += parseFloat(e.debit) || 0;
          credit += parseFloat(e.credit) || 0;
        }
      });
    }
  });

  // 4. Closing Balance
  const finalDr = openingDr + debit;
  const finalCr = openingCr + credit;
  let closingBalance = 0;
  let closingBalanceSuffix = "Dr";
  if (finalDr >= finalCr) {
    closingBalance = finalDr - finalCr;
    closingBalanceSuffix = "Dr";
  } else {
    closingBalance = finalCr - finalDr;
    closingBalanceSuffix = "Cr";
  }

  return {
    openingBalance,
    openingBalanceSuffix,
    openingDr,
    openingCr,
    debit,
    credit,
    closingBalance,
    closingBalanceSuffix,
    finalDr,
    finalCr
  };
}

// Render Book HTML (Shared between Cash and Bank books)
function renderBookHtml(title, groupName, fromDate, toDate) {
  const ledgers = state.getLedgers() || [];
  const groupLedgers = ledgers.filter(l => (l.groupName || "").toUpperCase() === groupName.toUpperCase());

  // Aggregate stats
  let totalOpeningDr = 0;
  let totalOpeningCr = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let totalClosingDr = 0;
  let totalClosingCr = 0;

  const rows = groupLedgers.map((l, index) => {
    const summary = getLedgerPeriodSummary(l.code, fromDate, toDate);
    totalOpeningDr += summary.openingDr;
    totalOpeningCr += summary.openingCr;
    totalDebit += summary.debit;
    totalCredit += summary.credit;
    totalClosingDr += summary.finalDr;
    totalClosingCr += summary.finalCr;

    return `
      <tr class="ledger-row-clickable" data-code="${l.code}" style="border-bottom: 1px dashed #cbd5e1; font-style: italic; background-color: white; cursor: pointer;">
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; color: black; font-weight: 500;">
          ${index + 1}) <i>${l.name}</i>
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${summary.openingBalance.toFixed(2)} ${summary.openingBalanceSuffix}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${summary.debit.toFixed(2)}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${summary.credit.toFixed(2)}
        </td>
        <td style="padding: 6px 12px; text-align: right; color: black; font-weight: 600;">
          ${summary.closingBalance.toFixed(2)} ${summary.closingBalanceSuffix}
        </td>
      </tr>
    `;
  }).join("");

  // Group Totals
  let groupOpeningBalance = 0;
  let groupOpeningSuffix = "Dr";
  if (totalOpeningDr >= totalOpeningCr) {
    groupOpeningBalance = totalOpeningDr - totalOpeningCr;
    groupOpeningSuffix = "Dr";
  } else {
    groupOpeningBalance = totalOpeningCr - totalOpeningDr;
    groupOpeningSuffix = "Cr";
  }

  let groupClosingBalance = 0;
  let groupClosingSuffix = "Dr";
  if (totalClosingDr >= totalClosingCr) {
    groupClosingBalance = totalClosingDr - totalClosingCr;
    groupClosingSuffix = "Dr";
  } else {
    groupClosingBalance = totalClosingCr - totalClosingDr;
    groupClosingSuffix = "Cr";
  }

  const tableBodyHTML = `
    <!-- Group Header Row in Bold -->
    <tr style="font-weight: bold; background-color: #f1f5f9; border-bottom: 1px solid #94a3b8;">
      <td style="padding: 8px 12px; border-right: 1px solid #94a3b8; color: black;">${groupName.toUpperCase()}</td>
      <td style="padding: 8px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
        ${groupOpeningBalance.toFixed(2)} ${groupOpeningSuffix}
      </td>
      <td style="padding: 8px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
        ${totalDebit.toFixed(2)}
      </td>
      <td style="padding: 8px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
        ${totalCredit.toFixed(2)}
      </td>
      <td style="padding: 8px 12px; text-align: right; color: black;">
        ${groupClosingBalance.toFixed(2)} ${groupClosingSuffix}
      </td>
    </tr>
    <!-- Nested ledger records -->
    ${rows.length > 0 ? rows : `
      <tr style="background-color: white;"><td colspan="5" style="padding: 20px; text-align: center; color: #64748b;">No ledgers found in this group.</td></tr>
    `}
    <!-- Bottom Total Row with Double Underline -->
    <tr style="font-weight: bold; background-color: #e2e8f0; border-top: 2px solid #475569;">
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; color: black;">Total:</td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${groupOpeningBalance.toFixed(2)} ${groupOpeningSuffix}
      </td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${totalDebit.toFixed(2)}
      </td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${totalCredit.toFixed(2)}
      </td>
      <td style="padding: 10px 12px; text-align: right; color: black; border-bottom: 3px double #000;">
        ${groupClosingBalance.toFixed(2)} ${groupClosingSuffix}
      </td>
    </tr>
  `;

  return tableBodyHTML;
}

// General function to show the book modal
function showBookModal(title, groupName, container) {
  const root = document.getElementById("modal-container-root");
  if (!root) return;
  
  const modalId = `book-modal-overlay-${groupName.replace(/\s+/g, "-")}`;
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    existing.style.zIndex = String(2000 + root.children.length * 10);
    return;
  }

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const defaultFrom = firstDayOfMonth.toISOString().split("T")[0];
  const defaultTo = today.toISOString().split("T")[0];

  let keyListener;

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.className = "modal-overlay active";
  modalEl.style.display = "flex";
  modalEl.style.justifyContent = "center";
  modalEl.style.alignItems = "center";
  modalEl.style.background = "rgba(15,23,42,0.35)";
  modalEl.style.backdropFilter = "blur(1px)";
  modalEl.style.zIndex = String(2000 + root.children.length * 10);

  const close = () => {
    modalEl.remove();
    document.removeEventListener("keydown", keyListener);
  };

  modalEl.innerHTML = `
      <div class="modal-container" style="max-width: 1000px; width: 95%; background-color: #cbd5e1; color: #0f172a; padding: 12px; border: 3px solid #1e3b8b; font-family: var(--font-body); border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        
        <!-- Official Print Header -->
        ${renderPrintHeaderHtml(title.toUpperCase(), "Book: " + title, "Period: " + formatDateDisplay(defaultFrom) + " to " + formatDateDisplay(defaultTo))}

        <!-- Classic title bar -->
        <div class="modal-header no-print" style="background: linear-gradient(90deg, #1e3b8b, #4f46e5); color: white; padding: 6px 12px; border-radius: var(--border-radius-sm) var(--border-radius-sm) 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3b8b;">
          <span style="font-weight: bold; font-size: 0.9rem; letter-spacing: 0.5px;">${title.toUpperCase()}</span>
          <button class="btn btn-secondary btn-icon" id="btn-close-book-x" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
        </div>

        <!-- Date select & controls panel -->
        <div class="no-print" style="background-color: #b4cbe6; padding: 10px; border: 1px solid #94a3b8; display: flex; flex-direction: column; gap: 10px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; background: #c5d7ed; padding: 8px 12px; border-radius: 4px; border: 1px solid #a5c3e5; gap: 15px; flex-wrap: wrap;">
            
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-weight: bold; color: #1e3b8b; font-size: 0.85rem;">From:</label>
                ${renderTallyDatePickerHtml({ id: "book-date-from", value: defaultFrom, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
              </div>
              
              <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-weight: bold; color: #1e3b8b; font-size: 0.85rem;">To:</label>
                ${renderTallyDatePickerHtml({ id: "book-date-to", value: defaultTo, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
              </div>
            </div>




            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary foot-btn" id="btn-book-view" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 3px 15px; cursor: pointer; font-size: 0.85rem;"><u>V</u>iew</button>
              <button class="btn btn-secondary foot-btn" id="btn-book-print" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 3px 15px; cursor: pointer; font-size: 0.85rem;"><u>P</u>rint</button>
              <button class="btn btn-secondary foot-btn" id="btn-book-close" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 3px 15px; cursor: pointer; font-size: 0.85rem;"><u>C</u>lose</button>
            </div>
          </div>

          <!-- Report table -->
          <div style="background-color: white; border: 1.5px solid #1e3b8b; max-height: 400px; overflow-y: auto; border-radius: 3px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.08);">
            <table style="width: 100%; border-collapse: collapse; margin-top: 0;">
              <thead>
                <tr style="border-bottom: 2px solid #1e3b8b;">
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: left; font-size: 0.85rem; width: 35%;">Particulars</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 18%;">Opening Balance</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 15%;">Debit</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 15%;">Credit</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 17%;">Closing Balance</th>
                </tr>
              </thead>
              <tbody id="book-tbody">
                <!-- Populated dynamically -->
              </tbody>
            </table>
          </div>

        </div>
      </div>
      <style>
        .foot-btn:hover {
          background-color: #94a3b8 !important;
          border-color: #475569 !important;
        }
        #book-tbody tr:hover td {
          background-color: #f8fafc !important;
        }
      </style>
    </div>
  `;



  root.appendChild(modalEl);
  initTallyDatePickers(modalEl);


  const tbody = modalEl.querySelector("#book-tbody");
  const dateFromEl = modalEl.querySelector("#book-date-from");
  const dateToEl = modalEl.querySelector("#book-date-to");

  function refresh() {
    if (tbody && dateFromEl && dateToEl) {
      tbody.innerHTML = renderBookHtml(title, groupName, dateFromEl.value, dateToEl.value);
    }
  }

  // Bind controls
  modalEl.querySelector("#btn-book-view")?.addEventListener("click", refresh);
  
  const bookDateFrom = modalEl.querySelector("#book-date-from");
  const bookDateTo = modalEl.querySelector("#book-date-to");
  if (bookDateFrom) {
    bookDateFrom.addEventListener("change", refresh);
    bookDateFrom.addEventListener("input", refresh);
  }
  if (bookDateTo) {
    bookDateTo.addEventListener("change", refresh);
    bookDateTo.addEventListener("input", refresh);
  }
  
  // Double-click row delegation to open individual ledger modal
  tbody?.addEventListener("dblclick", (e) => {
    const row = e.target.closest(".ledger-row-clickable");
    if (row) {
      const code = row.getAttribute("data-code");
      if (code) {
        import("./reports.js").then(m => {
          m.showIndividualLedgerModal(code);
        });
      }
    }
  });
  modalEl.querySelector("#btn-close-book-x")?.addEventListener("click", close);
  modalEl.querySelector("#btn-book-close")?.addEventListener("click", close);

  document.getElementById("btn-book-print").addEventListener("click", () => {
    window.print();
  });

  // Hotkey Close on Escape
  keyListener = (e) => {
    if (e.key === "Escape") {
      close();
    }
  };
  document.addEventListener("keydown", keyListener);

  // Initialize
  refresh();
}

// Exports
export function showCashBookModal(container) {
  showBookModal("CASH BOOK", "CASH-IN-HAND", container);
}

export function showBankBookModal(container) {
  showBookModal("BANK BOOK", "BANK ACCOUNTS", container);
}
