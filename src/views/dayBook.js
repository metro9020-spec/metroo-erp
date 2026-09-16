import { state } from "../state.js";
import { renderPrintHeaderHtml, formatDateDisplay } from "./reports.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";

export function showDayBookModal(container) {
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const modalId = "day-book-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    existing.style.zIndex = String(2000 + root.children.length * 10);
    return;
  }

  const activeFyStart = state.getActiveFinancialYearStartDate() || "2026-04-01";
  const activeFyEnd = state.getActiveFinancialYearEndDate();
  let maxTxDate = new Date().toISOString().split("T")[0];
  state.getTransactions().forEach(t => {
    if (t.date && t.date > maxTxDate) {
      maxTxDate = t.date;
    }
  });
  const defaultToDate = activeFyEnd && activeFyEnd > maxTxDate ? activeFyEnd : maxTxDate;

  // Helper to format date like 'DD/MM/YYYY'
  function formatDateShort(dateStr) {
    return formatDateDisplay(dateStr);
  }

  // Get voucher type from transaction reference
  function getVoucherType(ref) {
    const refStr = String(ref || "");
    const r = refStr.toLowerCase();
    
    // Direct match against database records to support custom prefixes
    if (state.getPurchases().some(p => p && (p.voucherNo === refStr || p.refNo === refStr || p.id === refStr))) return "Purchases";
    if (state.getInvoices().some(i => i && (i.voucherNo === refStr || i.refNo === refStr || i.id === refStr))) return "Sales";
    if (state.getSalesReturns().some(sr => sr && (sr.id === refStr || `Credit Note ${sr.id}` === refStr || `Sales Return ${sr.id}` === refStr || sr.billNo === refStr))) return "Sales Return";
    if (state.getPurchaseReturns().some(pr => pr && (pr.id === refStr || `Debit Note ${pr.id}` === refStr || `Purchase Return ${pr.id}` === refStr || pr.billNo === refStr))) return "Purchase Return";

    if (r.startsWith("pm-") || r.startsWith("pay-") || r.includes("payment")) return "Payments";
    if (r.startsWith("rc-") || r.includes("receipt") || r.includes("rcpt")) return "Receipts";
    if (r.startsWith("co-") || r.startsWith("cntr-") || r.includes("contra")) return "Contra";
    if (r.startsWith("jv-") || r.includes("journal") || r.startsWith("jv")) return "Journal";
    if (r.startsWith("lpr") || r.startsWith("ipr") || r.startsWith("npr") || r.startsWith("pur-") || r.includes("purchase") || r.includes("bill")) return "Purchases";
    if (r.startsWith("b2b") || r.startsWith("lsl") || r.startsWith("isl") || r.startsWith("nsl") || r.startsWith("inv-") || r.includes("sales") || r.includes("sale")) {
      if (r.includes("return")) return "Sales Return";
      return "Sales";
    }
    if (r.includes("sales return") || r.startsWith("sr-")) return "Sales Return";
    if (r.includes("purchase return") || r.startsWith("pr-")) return "Purchase Return";
    if (r.includes("credit note") || r.startsWith("crn-")) return "Credit Note";
    if (r.includes("debit note") || r.startsWith("dbn-")) return "Debit Note";
    if (r.includes("expense") || r.startsWith("exp-")) return "Emp Expense";
    return "Journal";
  }

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.className = "modal-overlay active";
  modalEl.style.display = "flex";
  modalEl.style.justifyContent = "center";
  modalEl.style.alignItems = "center";
  modalEl.style.background = "rgba(15,23,42,0.35)";
  modalEl.style.backdropFilter = "blur(1px)";
  modalEl.style.zIndex = String(2000 + root.children.length * 10);

  modalEl.innerHTML = `
      <div class="modal-container modal-lg" style="max-width:1150px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Official Print Header -->
        ${renderPrintHeaderHtml("DAY BOOK REPORT", "Period: " + formatDateDisplay(activeFyStart) + " to " + formatDateDisplay(defaultToDate))}

        <!-- Header Ribbon -->
        <div class="no-print" style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-book"></i> Day Book</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="db-close-x-btn">&times;</button>
        </div>
        <!-- Filters Bar -->
        <div class="no-print" style="background:#cbd5e1; padding:8px; border:1px solid #94a3b8; border-radius:2px; display:grid; grid-template-columns: 2fr 1.2fr 1fr; gap:15px; align-items:center; color:black;">
          
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="font-weight:bold; width:85px;">Show Book</div>
            <select id="db-book-type" class="form-control" style="flex-grow:1; background:white; color:black; padding:3px; height:26px; border:1px solid #7f99c2;">
              <option value="All">All Transactions / Vouchers Log</option>
              <option value="Cash">Cash Book Only</option>
              <option value="Bank">Bank Book Only</option>
            </select>
          </div>

          <div style="border: 1px solid #94a3b8; padding:4px 8px; border-radius:3px; background:#d9e1f2; display:flex; align-items:center; gap:8px;">
            <span style="font-weight:bold; font-size:0.75rem;">From:</span>
            ${renderTallyDatePickerHtml({ id: "db-from-date", value: activeFyStart, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            <span style="font-weight:bold; font-size:0.75rem;">To:</span>
            ${renderTallyDatePickerHtml({ id: "db-to-date", value: defaultToDate, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
          </div>




          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-secondary" id="btn-db-view" style="font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; padding:3px 12px; font-size:0.75rem;">View</button>
            <button type="button" class="btn btn-secondary" onclick="window.print()" style="font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; padding:3px 12px; font-size:0.75rem;">Print</button>
            <button type="button" class="btn btn-secondary" id="btn-db-close" style="font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; padding:3px 12px; font-size:0.75rem;">Close</button>
          </div>

        </div>

        <!-- Document Header Label -->
        <div style="text-align:center; font-weight:bold; font-size:0.95rem; margin-top:2px;" id="db-report-heading">
          Day Book from 01-Apr-2026 to 25-Jul-2026
        </div>

        <!-- Table Content View -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
            <thead>
              <tr style="background-color:#f1f5f9; border-bottom: 2px solid #cbd5e1; position:sticky; top:0; font-weight:bold;">
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1; width:150px;">Date</th>
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1; text-align:right;">Opening balance</th>
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1; text-align:right;" id="db-col-debit">Debit/Receipt</th>
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1; text-align:right;" id="db-col-credit">Credit/Payment</th>
                <th style="padding:8px 12px; text-align:right;">Closing Balance</th>
              </tr>
            </thead>
            <tbody id="db-table-body">
              <!-- Rendered list -->
            </tbody>
          </table>
        </div>

      </div>
  `;



  root.appendChild(modalEl);
  initTallyDatePickers(modalEl);

  const close = () => { modalEl.remove(); };

  modalEl.querySelector("#db-close-x-btn")?.addEventListener("click", close);
  modalEl.querySelector("#btn-db-close")?.addEventListener("click", close);

  const fromInput = document.getElementById("db-from-date");
  const toInput = document.getElementById("db-to-date");
  const voucherSelect = document.getElementById("db-voucher-select");
  const monthlyCheck = document.getElementById("db-monthly");
  const dailyCheck = document.getElementById("db-daily");
  const mergeCheck = document.getElementById("db-merge");
  const narrationCheck = document.getElementById("db-narration");

  // Setup mutual exclusion for Daily / Monthly checkboxes
  monthlyCheck.addEventListener("change", () => {
    if (monthlyCheck.checked) dailyCheck.checked = false;
  });
  dailyCheck.addEventListener("change", () => {
    if (dailyCheck.checked) monthlyCheck.checked = false;
  });

  function renderData() {
    const fromVal = fromInput.value;
    const toVal = toInput.value;
    const vType = voucherSelect.value;
    const isDaily = dailyCheck.checked;
    const isMonthly = monthlyCheck.checked;
    const isMerge = mergeCheck.checked;
    const showNarr = narrationCheck.checked;

    document.getElementById("db-report-heading").innerText = `Day Book from ${formatDateShort(fromVal)} to ${formatDateShort(toVal)}`;

    // Identify Cash and Bank ledger accounts
    const cashBankLedgers = state.getLedgers().filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS");
    const cbCodes = cashBankLedgers.map(l => l.code);
    
    // Initial opening balance (sum of CASH & DISTRICT BANK opening)
    const initialOpeningBalance = cashBankLedgers.reduce((sum, l) => sum + (parseFloat(l.openingBalance) || 0), 0);

    const transactions = [...state.getTransactions()].filter(tx => {
      const txRef = tx.reference || "";
      const cleanRef = txRef.split(" ")[0];
      const inv = state.getInvoices().find(i => cleanRef && (cleanRef === i.voucherNo || cleanRef === i.id));
      const pur = state.getPurchases().find(p => cleanRef && (cleanRef === p.voucherNo || cleanRef === p.invoiceNo));
      if ((inv && inv.isCancelled) || (pur && pur.isCancelled)) return false;
      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Step 1: Pre-calculate running balance of Cash/Bank chronologically up to the "From" date
    let runningBal = initialOpeningBalance;
    const preTx = transactions.filter(t => new Date(t.date) < new Date(fromVal));
    preTx.forEach(t => {
      t.entries.forEach(e => {
        if (cbCodes.includes(e.accountId)) {
          runningBal += (parseFloat(e.debit) || 0);
          runningBal -= (parseFloat(e.credit) || 0);
        }
      });
    });

    // Step 2: Gather target date range transactions
    const rangeTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= new Date(fromVal) && d <= new Date(toVal);
    });

    const tbody = document.getElementById("db-table-body");
    tbody.innerHTML = "";

    // Header label for Opening Balance
    tbody.innerHTML += `
      <tr style="background:#f8fafc; font-weight:bold;">
        <td style="padding:6px 12px; border-right:1px solid #cbd5e1;">Opening Balance :</td>
        <td colspan="4" style="padding:6px 12px; font-weight:bold; color:#1e40af;">\u20B9${runningBal.toFixed(2)} Dr.</td>
      </tr>
    `;

    let html = "";
    
    if (isDaily) {
      // Group range transactions by date
      const daysMap = {};
      
      // Seed all dates in the range to ensure we list everyday sequentially like the screenshot
      let curr = new Date(fromVal);
      const end = new Date(toVal);
      while (curr <= end) {
        const dateStr = curr.toISOString().split("T")[0];
        daysMap[dateStr] = [];
        curr.setDate(curr.getDate() + 1);
      }

      // Distribute transactions
      rangeTx.forEach(t => {
        if (daysMap[t.date]) {
          daysMap[t.date].push(t);
        }
      });

      const sortedDates = Object.keys(daysMap).sort();
      let dayOpening = runningBal;

      sortedDates.forEach(dateStr => {
        const dayTxs = daysMap[dateStr];
        
        let debitTotal = 0;
        let creditTotal = 0;
        let dayRowsHtml = "";

        dayTxs.forEach(t => {
          const type = getVoucherType(t.reference);
          if (vType !== "All" && type !== vType) return;

          // Sum cash bank postings
          t.entries.forEach(e => {
            if (cbCodes.includes(e.accountId)) {
              debitTotal += (parseFloat(e.debit) || 0);
              creditTotal += (parseFloat(e.credit) || 0);
            }
          });

          if (!isMerge) {
            // Render individual vouchers if not merged
            const part = t.description || t.reference;
            dayRowsHtml += `
              <tr class="db-voucher-row" data-ref="${t.reference}" style="border-bottom:1px dashed #cbd5e1; cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding:4px 20px; color:#475569; font-size:0.75rem; border-right:1px solid #cbd5e1;">&nbsp;&nbsp;&bull; ${t.reference}</td>
                <td style="border-right:1px solid #cbd5e1;"></td>
                <td style="padding:4px 12px; text-align:right; border-right:1px solid #cbd5e1;">\u20B9${(t.entries.filter(e => cbCodes.includes(e.accountId)).reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0)).toFixed(2)}</td>
                <td style="padding:4px 12px; text-align:right; border-right:1px solid #cbd5e1;">\u20B9${(t.entries.filter(e => cbCodes.includes(e.accountId)).reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0)).toFixed(2)}</td>
                <td></td>
              </tr>
            `;
          }
        });

        const dayClosing = dayOpening + debitTotal - creditTotal;

        // Daily summary row (double-click opens detailed layout for this day)
        html += `
          <tr class="db-day-row" data-date="${dateStr}" style="border-bottom: 1px solid #cbd5e1; font-weight:500; cursor:pointer;" title="Double-click to view all transactions for ${formatDateShort(dateStr)}">
            <td style="padding:6px 12px; border-right:1px solid #cbd5e1; font-weight:700;">${formatDateShort(dateStr)}</td>
            <td style="padding:6px 12px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">\u20B9${dayOpening.toFixed(2)} Dr.</td>
            <td style="padding:6px 12px; text-align:right; border-right:1px solid #cbd5e1; color:#16a34a; font-weight:bold;">${debitTotal > 0 ? "\u20B9" + debitTotal.toFixed(2) : ""}</td>
            <td style="padding:6px 12px; text-align:right; border-right:1px solid #cbd5e1; color:#ef4444; font-weight:bold;">${creditTotal > 0 ? "\u20B9" + creditTotal.toFixed(2) : ""}</td>
            <td style="padding:6px 12px; text-align:right; font-weight:bold; color:#1e40af;">\u20B9${dayClosing.toFixed(2)} Dr.</td>
          </tr>
        `;

        if (!isMerge && dayRowsHtml) {
          html += dayRowsHtml;
        }

        dayOpening = dayClosing;
      });

    } else if (isMonthly) {
      // Group by month
      const monthsMap = {};
      rangeTx.forEach(t => {
        const monthKey = t.date.substring(0, 7); // YYYY-MM
        if (!monthsMap[monthKey]) monthsMap[monthKey] = [];
        monthsMap[monthKey].push(t);
      });

      const sortedMonths = Object.keys(monthsMap).sort();
      let monthOpening = runningBal;

      sortedMonths.forEach(mKey => {
        const monthTxs = monthsMap[mKey];
        let debitTotal = 0;
        let creditTotal = 0;

        monthTxs.forEach(t => {
          const type = getVoucherType(t.reference);
          if (vType !== "All" && type !== vType) return;

          t.entries.forEach(e => {
            if (cbCodes.includes(e.accountId)) {
              debitTotal += (parseFloat(e.debit) || 0);
              creditTotal += (parseFloat(e.credit) || 0);
            }
          });
        });

        const monthClosing = monthOpening + debitTotal - creditTotal;
        const [year, month] = mKey.split("-");
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

        html += `
          <tr class="db-month-row" data-month="${mKey}" style="border-bottom: 1px solid #cbd5e1; font-weight:500; cursor:pointer;" title="Double-click to view daily breakdown for ${monthName}">
            <td style="padding:8px 12px; border-right:1px solid #cbd5e1; font-weight:bold;">${monthName} ${year}</td>
            <td style="padding:8px 12px; text-align:right; border-right:1px solid #cbd5e1; color:#475569;">\u20B9${monthOpening.toFixed(2)} Dr.</td>
            <td style="padding:8px 12px; text-align:right; border-right:1px solid #cbd5e1; color:#16a34a; font-weight:bold;">\u20B9${debitTotal.toFixed(2)}</td>
            <td style="padding:8px 12px; text-align:right; border-right:1px solid #cbd5e1; color:#ef4444; font-weight:bold;">\u20B9${creditTotal.toFixed(2)}</td>
            <td style="padding:8px 12px; text-align:right; font-weight:bold; color:#1e40af;">\u20B9${monthClosing.toFixed(2)} Dr.</td>
          </tr>
        `;
        monthOpening = monthClosing;
      });
    }

    tbody.innerHTML += html;

    // Bind double click to open corresponding vouchers
    tbody.querySelectorAll(".db-voucher-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const ref = row.getAttribute("data-ref");
        import("./reports.js").then(m => {
          m.openVoucherOrInvoice(ref, container);
        });
      });
    });

    // Double-click Month row → open Daily Day Book view for that month
    tbody.querySelectorAll(".db-month-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const mKey = row.getAttribute("data-month");
        if (!mKey) return;
        const [y, m] = mKey.split("-");
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        fromInput.value = `${mKey}-01`;
        toInput.value = `${mKey}-${String(lastDay).padStart(2, '0')}`;
        dailyCheck.checked = true;
        monthlyCheck.checked = false;
        renderData();
      });
    });

    // Double-click Day row → open second layout showing all transactions for that specific day
    tbody.querySelectorAll(".db-day-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const dateStr = row.getAttribute("data-date");
        if (!dateStr) return;
        showDayTransactionsLayout(dateStr);
      });
    });
  }

  // Second Layout: Detailed Transactions for a Single Day
  function showDayTransactionsLayout(dateStr) {
    const dayTxList = state.getTransactions().filter(t => t.date === dateStr);
    const tbody = document.getElementById("db-table-body");
    if (!tbody) return;
    
    tbody.innerHTML = `
      <tr style="background:#1e3b8b; color:white; font-weight:bold;">
        <td colspan="5" style="padding:8px 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Transactions for ${formatDateShort(dateStr)} (${dayTxList.length} Entries)</span>
            <button type="button" id="btn-back-to-daybook" style="background:#cbd5e1; border:none; color:black; font-weight:bold; padding:2px 10px; border-radius:3px; cursor:pointer;">&larr; Back to Day Book</button>
          </div>
        </td>
      </tr>
      <tr style="background:#f1f5f9; font-weight:bold; border-bottom:2px solid #cbd5e1;">
        <td style="padding:6px 12px; border-right:1px solid #cbd5e1;">Voucher No / Ref</td>
        <td style="padding:6px 12px; border-right:1px solid #cbd5e1;">Type</td>
        <td style="padding:6px 12px; border-right:1px solid #cbd5e1;">Particulars / Description</td>
        <td style="padding:6px 12px; border-right:1px solid #cbd5e1; text-align:right;">Debit (\u20B9)</td>
        <td style="padding:6px 12px; text-align:right;">Credit (\u20B9)</td>
      </tr>
      ${dayTxList.length === 0 ? `
        <tr><td colspan="5" style="padding:20px; text-align:center; color:#888;">No transactions found for this day.</td></tr>
      ` : dayTxList.map(t => {
        const vType = getVoucherType(t.reference);
        let totDr = 0, totCr = 0;
        t.entries.forEach(e => {
          totDr += parseFloat(e.debit) || 0;
          totCr += parseFloat(e.credit) || 0;
        });
        return `
          <tr class="db-day-tx-item" data-ref="${t.reference}" style="border-bottom:1px solid #cbd5e1; cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
            <td style="padding:6px 12px; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${t.reference}</td>
            <td style="padding:6px 12px; border-right:1px solid #cbd5e1;">${vType}</td>
            <td style="padding:6px 12px; border-right:1px solid #cbd5e1;">${t.description || t.reference}</td>
            <td style="padding:6px 12px; border-right:1px solid #cbd5e1; text-align:right; font-weight:600; color:#16a34a;">${totDr > 0 ? '\u20B9' + totDr.toFixed(2) : '-'}</td>
            <td style="padding:6px 12px; text-align:right; font-weight:600; color:#ef4444;">${totCr > 0 ? '\u20B9' + totCr.toFixed(2) : '-'}</td>
          </tr>
        `;
      }).join("")}
    `;

    document.getElementById("btn-back-to-daybook")?.addEventListener("click", () => {
      renderData();
    });

    tbody.querySelectorAll(".db-day-tx-item").forEach(itemRow => {
      itemRow.addEventListener("dblclick", () => {
        const ref = itemRow.getAttribute("data-ref");
        import("./reports.js").then(m => {
          m.openVoucherOrInvoice(ref, container);
        });
      });
    });
  }

  document.getElementById("btn-db-view")?.addEventListener("click", renderData);

  if (fromInput) {
    fromInput.addEventListener("change", renderData);
    fromInput.addEventListener("input", renderData);
  }
  if (toInput) {
    toInput.addEventListener("change", renderData);
    toInput.addEventListener("input", renderData);
  }
  if (voucherSelect) voucherSelect.addEventListener("change", renderData);
  if (monthlyCheck) monthlyCheck.addEventListener("change", renderData);
  if (dailyCheck) dailyCheck.addEventListener("change", renderData);
  if (mergeCheck) mergeCheck.addEventListener("change", renderData);
  if (narrationCheck) narrationCheck.addEventListener("change", renderData);

  renderData();

  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", escHandler);
    }
  };
  window.addEventListener("keydown", escHandler);
}
