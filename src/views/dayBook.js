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

  function formatDateShort(dateStr) {
    return formatDateDisplay(dateStr);
  }

  function getVoucherType(ref) {
    const refStr = String(ref || "");
    const r = refStr.toLowerCase();
    
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
    if (r.includes("credit note") || r.startsWith("crn-") || r.startsWith("cn-")) return "Credit Note";
    if (r.includes("debit note") || r.startsWith("dbn-") || r.startsWith("dn-")) return "Debit Note";
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
        <div class="no-print" style="background:#cbd5e1; padding:8px; border:1px solid #94a3b8; border-radius:2px; display:flex; justify-content:space-between; align-items:center; gap:15px; color:black;">
          
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="font-weight:bold; white-space:nowrap;">Show Book:</div>
            <select id="db-book-type" class="form-control" style="background:white; color:black; padding:3px; height:26px; border:1px solid #7f99c2; font-size:0.8rem;">
              <option value="All">All Transactions / Vouchers</option>
              <option value="Cash">Cash Book Only</option>
              <option value="Bank">Bank Book Only</option>
              <option value="Sales">Sales Only</option>
              <option value="Purchases">Purchases Only</option>
              <option value="Payments">Payments Only</option>
              <option value="Receipts">Receipts Only</option>
              <option value="Journal">Journal Only</option>
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
          Day Book from ${formatDateShort(activeFyStart)} to ${formatDateShort(defaultToDate)}
        </div>

        <!-- Table Content View -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
            <thead>
              <tr style="background-color:#f1f5f9; border-bottom: 2px solid #cbd5e1; position:sticky; top:0; font-weight:bold; z-index:5;">
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1; width:110px;">Date</th>
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1;">Particulars / Description</th>
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1; width:130px;">Voucher Type</th>
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1; width:150px;">Voucher No / Ref</th>
                <th style="padding:8px 12px; border-right:1px solid #cbd5e1; text-align:right; width:130px;">Debit (₹)</th>
                <th style="padding:8px 12px; text-align:right; width:130px;">Credit (₹)</th>
              </tr>
            </thead>
            <tbody id="db-table-body">
              <!-- Rendered list -->
            </tbody>
            <tfoot id="db-table-foot" style="position:sticky; bottom:0; background:#e2e8f0; font-weight:bold; border-top:2px solid #cbd5e1;">
            </tfoot>
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
  const bookTypeSelect = document.getElementById("db-book-type");

  function renderData() {
    const fromVal = fromInput ? fromInput.value : activeFyStart;
    const toVal = toInput ? toInput.value : defaultToDate;
    const bType = bookTypeSelect ? bookTypeSelect.value : "All";

    const headingEl = document.getElementById("db-report-heading");
    if (headingEl) {
      headingEl.innerText = `Day Book from ${formatDateShort(fromVal)} to ${formatDateShort(toVal)}`;
    }

    // Identify Cash and Bank ledger accounts
    const cashLedgers = state.getLedgers().filter(l => l.groupName === "CASH-IN-HAND").map(l => l.code);
    const bankLedgers = state.getLedgers().filter(l => l.groupName === "BANK ACCOUNTS").map(l => l.code);

    const transactions = [...state.getTransactions()].filter(tx => {
      if (!tx || !tx.date) return false;
      const txRef = String(tx.reference || "");
      const txDesc = String(tx.description || "");

      // Filter out auto-generated background COGS entries (e.g., "LSL-0005 COGS", "Cost of Goods Sold...")
      if (txRef.toUpperCase().includes("COGS") || txDesc.toUpperCase().includes("COST OF GOODS SOLD")) {
        return false;
      }

      const cleanRef = txRef.split(" ")[0];
      const inv = state.getInvoices().find(i => cleanRef && (cleanRef === i.voucherNo || cleanRef === i.id));
      const pur = state.getPurchases().find(p => cleanRef && (cleanRef === p.voucherNo || cleanRef === p.invoiceNo));
      if ((inv && inv.isCancelled) || (pur && pur.isCancelled)) return false;
      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Filter date range
    const rangeTx = transactions.filter(t => {
      const d = t.date;
      return d >= fromVal && d <= toVal;
    });

    // Filter by book type
    const filteredTx = rangeTx.filter(t => {
      const vType = getVoucherType(t.reference);
      if (bType === "All") return true;
      if (bType === "Cash") {
        return (t.entries || []).some(e => cashLedgers.includes(e.accountId) || e.accountId === "1010" || e.accountId === "L0001");
      }
      if (bType === "Bank") {
        return (t.entries || []).some(e => bankLedgers.includes(e.accountId) || e.accountId === "1020");
      }
      if (bType === "Sales") return vType === "Sales" || vType === "Sales Return";
      if (bType === "Purchases") return vType === "Purchases" || vType === "Purchase Return";
      if (bType === "Payments") return vType === "Payments";
      if (bType === "Receipts") return vType === "Receipts";
      if (bType === "Journal") return vType === "Journal" || vType === "Contra" || vType === "Credit Note" || vType === "Debit Note";
      return true;
    });

    const tbody = document.getElementById("db-table-body");
    const tfoot = document.getElementById("db-table-foot");
    if (!tbody) return;

    if (filteredTx.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding:24px; text-align:center; color:#64748b; font-style:italic;">
            No transactions found for the selected period.
          </td>
        </tr>
      `;
      if (tfoot) tfoot.innerHTML = "";
      return;
    }

    let grandDr = 0;
    let grandCr = 0;

    const rowsHtml = filteredTx.map(t => {
      const vType = getVoucherType(t.reference);
      let totDr = 0;
      let totCr = 0;

      (t.entries || []).forEach(e => {
        totDr += parseFloat(e.debit) || 0;
        totCr += parseFloat(e.credit) || 0;
      });

      grandDr += totDr;
      grandCr += totCr;

      let partyNames = [];
      if (t.entries && Array.isArray(t.entries)) {
        t.entries.forEach(e => {
          if (!e || !e.accountId) return;
          const name = state.getAccountDisplayName ? state.getAccountDisplayName(e.accountId, t) : e.accountId;
          if (name && !["1010", "1020", "L0001", "Cash", "Bank Current Account"].includes(name) && !partyNames.includes(name)) {
            partyNames.push(name);
          }
        });
      }
      let desc = t.description || "";
      if (!desc && partyNames.length > 0) {
        desc = partyNames.join(", ");
      } else if (desc && partyNames.length > 0) {
        partyNames.forEach(pName => {
          if (!desc.includes(pName)) {
            desc += ` (${pName})`;
          }
        });
      }
      if (!desc) desc = t.reference || "Voucher Transaction";

      return `
        <tr class="db-voucher-row" data-ref="${t.reference}" style="border-bottom:1px solid #e2e8f0; cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
          <td style="padding:6px 12px; border-right:1px solid #cbd5e1; font-weight:600;">${formatDateShort(t.date)}</td>
          <td style="padding:6px 12px; border-right:1px solid #cbd5e1;">${desc}</td>
          <td style="padding:6px 12px; border-right:1px solid #cbd5e1; font-weight:600; color:#475569;">${vType}</td>
          <td style="padding:6px 12px; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${t.reference || '-'}</td>
          <td style="padding:6px 12px; border-right:1px solid #cbd5e1; text-align:right; font-weight:600; color:#16a34a;">${totDr > 0 ? '₹' + totDr.toFixed(2) : '-'}</td>
          <td style="padding:6px 12px; text-align:right; font-weight:600; color:#ef4444;">${totCr > 0 ? '₹' + totCr.toFixed(2) : '-'}</td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = rowsHtml;

    if (tfoot) {
      tfoot.innerHTML = `
        <tr>
          <td colspan="4" style="padding:8px 12px; text-align:right; font-weight:bold;">Total:</td>
          <td style="padding:8px 12px; text-align:right; font-weight:bold; color:#16a34a;">₹${grandDr.toFixed(2)}</td>
          <td style="padding:8px 12px; text-align:right; font-weight:bold; color:#ef4444;">₹${grandCr.toFixed(2)}</td>
        </tr>
      `;
    }

    // Double-click row → open voucher/invoice detail
    tbody.querySelectorAll(".db-voucher-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const ref = row.getAttribute("data-ref");
        if (ref) {
          import("./reports.js").then(m => {
            m.openVoucherOrInvoice(ref, container);
          });
        }
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
  if (bookTypeSelect) {
    bookTypeSelect.addEventListener("change", renderData);
  }

  renderData();

  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", escHandler);
    }
  };
  window.addEventListener("keydown", escHandler);
}
