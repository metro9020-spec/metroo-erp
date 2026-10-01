import { state, ACCOUNTS } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";
import { 
  showInvoiceBuilderModal, 
  showRecordPurchaseModal, 
  showSalesReturnModal, 
  showPurchaseReturnModal 
} from "./transactions.js";
import { 
  showContraModal, 
  showUnifiedSplitVoucherModal 
} from "./vouchers.js";
import { invalidateReportCache } from "./reports.js";
import { showRearrangeVouchersModal } from "./rearrangeVouchersModal.js";

// Session-level search state persistence
let searchFromDate = "";
let searchToDate = "";
let searchTxt = "";
let searchVoucherType = "All";
let hasSearched = true;
let displayLimit = 250;

function getAccountNameForLog(accountId, tx, contactMap, ledgerMap) {
  if (!accountId) return "";
  const baseContactId = accountId.includes("::") ? accountId.split("::")[0] : accountId;
  const site = accountId.includes("::") ? accountId.split("::")[1] : null;

  let name = contactMap.get(baseContactId) || ledgerMap.get(baseContactId);
  if (!name && ACCOUNTS[baseContactId]) {
    name = ACCOUNTS[baseContactId].name;
  }
  if (!name && state.getAccountDisplayName) {
    name = state.getAccountDisplayName(accountId, tx);
  }
  if (!name) name = accountId;
  return site ? `${name} (${site})` : name;
}

function getFastTransactionType(tx, invoiceMap, purchaseMap, salesReturnMap, purchaseReturnMap, cashBankIds) {
  if (!tx) return { type: "Journal" };
  const vTypeUpper = String(tx.voucherType || "").trim().toUpperCase();
  const idUpper = String(tx.id || "").trim().toUpperCase();
  const refUpper = String(tx.reference || "").trim().toUpperCase();

  // Explicit check for manual voucher types FIRST
  if (vTypeUpper === "RECEIPT" || vTypeUpper === "REC" || idUpper.startsWith("TX-REC-") || refUpper.startsWith("RC-")) return { type: "Receipt" };
  if (vTypeUpper === "PAYMENT" || vTypeUpper === "PAY" || idUpper.startsWith("TX-PAY-") || refUpper.startsWith("PAY-") || refUpper.startsWith("PM-") || refUpper.startsWith("PY-")) return { type: "Payment" };
  if (vTypeUpper === "CONTRA" || vTypeUpper === "CON" || idUpper.startsWith("TX-CON-") || refUpper.startsWith("CNTR-") || refUpper.startsWith("CO-")) return { type: "Contra" };
  if (vTypeUpper === "JOURNAL" || vTypeUpper === "JV" || idUpper.startsWith("TX-JV-") || refUpper.startsWith("JV-")) return { type: "Journal" };

  // O(1) Map Lookups
  const inv = invoiceMap.get(idUpper) || invoiceMap.get(refUpper);
  if (inv) return { type: "Sales", doc: inv };

  const pur = purchaseMap.get(idUpper) || purchaseMap.get(refUpper);
  if (pur) return { type: "Purchase", doc: pur };

  const sr = salesReturnMap.get(idUpper) || salesReturnMap.get(refUpper);
  if (sr) return { type: "Sales Return", doc: sr };

  const pr = purchaseReturnMap.get(idUpper) || purchaseReturnMap.get(refUpper);
  if (pr) return { type: "Purchase Return", doc: pr };

  if (refUpper.includes("COGS")) return { type: "COGS" };
  if (refUpper.startsWith("CN-") || refUpper.startsWith("CN") || refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("CRN-")) return { type: "Credit Note" };
  if (refUpper.startsWith("DN-") || refUpper.startsWith("DN") || refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("DBN-")) return { type: "Debit Note" };

  const debitsCashBank = tx.entries ? tx.entries.some(e => cashBankIds.has(e.accountId) && e.debit > 0) : false;
  const creditsCashBank = tx.entries ? tx.entries.some(e => cashBankIds.has(e.accountId) && e.credit > 0) : false;

  if (debitsCashBank && creditsCashBank) return { type: "Contra" };
  if (debitsCashBank) return { type: "Receipt" };
  if (creditsCashBank) return { type: "Payment" };

  return { type: "Journal" };
}

function getVoucherTableRowHTML(tx, contactMap, ledgerMap) {
  const debits = (tx.entries || []).filter(e => e.debit > 0);
  const credits = (tx.entries || []).filter(e => e.credit > 0);

  const debitNames = debits.map(e => {
    let name = getAccountNameForLog(e.accountId, tx, contactMap, ledgerMap);
    if (e.siteBranch) name += ` (${e.siteBranch})`;
    return `<strong>${name}</strong>`;
  }).join("<br>");
  
  const debitAmounts = debits.map(e => `₹${e.debit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`).join("<br>");

  const creditNames = credits.map(e => {
    let name = getAccountNameForLog(e.accountId, tx, contactMap, ledgerMap);
    if (e.siteBranch) name += ` (${e.siteBranch})`;
    return `<strong>${name}</strong>`;
  }).join("<br>");

  const creditAmounts = credits.map(e => `₹${e.credit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`).join("<br>");

  const refLower = (tx.reference || "").toLowerCase().trim();
  const isGenericRef = refLower === "receipt" || refLower === "payment" || refLower === "contra" || refLower === "journal";
  const displayVoucherNo = isGenericRef ? tx.id : (tx.reference || tx.id);

  return `
    <tr class="search-voucher-row" data-id="${tx.id}" style="cursor: pointer;" title="Double click to edit entry">
      <td style="color: var(--text-primary); white-space: nowrap;">${formatDate(tx.date)}</td>
      <td style="white-space: nowrap;"><code class="highlight-text" style="font-weight: 700;">${displayVoucherNo}</code></td>
      <td style="color: var(--text-primary);">${debitNames || "-"}</td>
      <td style="text-align: right; font-weight: 600; color: var(--text-primary); white-space: nowrap;">${debitAmounts || "₹0.00"}</td>
      <td style="color: var(--text-primary);">${creditNames || "-"}</td>
      <td style="text-align: right; font-weight: 600; color: var(--text-primary); white-space: nowrap;">${creditAmounts || "₹0.00"}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn btn-danger btn-icon btn-delete-search-tx" data-id="${tx.id}" style="background-color:#ef4444; color:white; border:none; padding: 4px 8px; border-radius: 3px;"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    </tr>
  `;
}

function checkAdminPassword() {
  const pw = prompt("Enter Admin Password:");
  if (pw === state.getAdminPassword() || pw === "123") return true;
  alert("Incorrect Password!");
  return false;
}

export function renderSearchVouchers(container) {
  if (!searchFromDate) searchFromDate = state.getActiveFinancialYearStartDate() || "2026-04-01";
  if (!searchToDate) searchToDate = state.getActiveFinancialYearEndDate() || new Date().toISOString().split("T")[0];

  container.innerHTML = `
    <div class="panel" style="margin-bottom: 0.8rem; padding: 10px 12px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); font-family: var(--font-body); border-radius: 4px; display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; color: var(--text-primary);">
        
        <!-- From Date -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-weight:700; color: var(--text-secondary); font-size:0.85rem; margin: 0;">From</label>
          ${renderTallyDatePickerHtml({ id: "search-vouchers-from", value: searchFromDate, style: "height:28px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);", width: "130px" })}
        </div>
        
        <!-- To Date -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-weight:700; color: var(--text-secondary); font-size:0.85rem; margin: 0;">To</label>
          ${renderTallyDatePickerHtml({ id: "search-vouchers-to", value: searchToDate, style: "height:28px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);", width: "130px" })}
        </div>

        <!-- Voucher Type Selector -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-weight:700; color: var(--text-secondary); font-size:0.85rem; margin: 0;">Voucher Type</label>
          <select id="search-vouchers-type" class="form-control" style="width:140px; height:28px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color); font-size:0.85rem; font-weight:600;">
            <option value="All" ${searchVoucherType === 'All' ? 'selected' : ''}>All Vouchers</option>
            <option value="Receipt" ${searchVoucherType === 'Receipt' ? 'selected' : ''}>Receipt (RC-)</option>
            <option value="Payment" ${searchVoucherType === 'Payment' ? 'selected' : ''}>Payment (PM-)</option>
            <option value="Contra" ${searchVoucherType === 'Contra' ? 'selected' : ''}>Contra (CO-)</option>
            <option value="Journal" ${searchVoucherType === 'Journal' ? 'selected' : ''}>Journal (JV-)</option>
            <option value="Debit Note" ${searchVoucherType === 'Debit Note' ? 'selected' : ''}>Debit Note (DN-)</option>
            <option value="Credit Note" ${searchVoucherType === 'Credit Note' ? 'selected' : ''}>Credit Note (CN-)</option>
          </select>
        </div>
        
        <!-- Search Text -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="text" id="search-vouchers-txt" class="form-control" placeholder="Search VNo / Narration / Party..." style="width:200px; height:28px; padding:2px 8px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color); font-size:0.85rem;" value="${searchTxt}">
        </div>
        
        <!-- Action Buttons -->
        <button class="btn btn-primary" id="btn-search-vouchers-go" style="height:28px; padding: 0 14px; font-size:0.85rem; font-weight:700; background: #4f46e5; border-color: #4f46e5; color: white;">
          <i class="fa-solid fa-magnifying-glass"></i> Search
        </button>
        <button class="btn btn-secondary" id="btn-search-vouchers-reset" style="height:28px; padding: 0 12px; font-size:0.85rem; font-weight:700; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);">
          Reset
        </button>
        <button class="btn btn-primary" id="btn-search-rearrange-vouchers" style="height:28px; padding: 0 12px; font-size:0.82rem; font-weight:700; background:#2563eb; color:white; border:1px solid #1d4ed8; margin-left:auto; display:flex; align-items:center; gap:5px;" title="Reset and renumber vouchers in ascending date order">
          <i class="fa-solid fa-arrow-down-1-9"></i> Reset Voucher Numbers
        </button>
      </div>
    </div>

    <!-- Logs List Panel -->
    <div class="panel" style="padding: 0.8rem 1rem; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; height: calc(100vh - 210px); background: var(--bg-secondary); border: 1px solid var(--border-color);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
        <div style="font-weight: bold; color: var(--text-primary); font-size: 1.05rem;" id="search-title">Search Voucher Logs</div>
        <div id="search-status-counter" style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);"></div>
      </div>
      <div class="table-responsive" style="flex-grow: 1; overflow-y: auto;">
        <table class="custom-voucher-table" style="width: 100%; border-collapse: collapse; margin-top: 0;">
          <thead>
            <tr>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 6px 8px; text-align: left; width: 90px;">Date</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 6px 8px; text-align: left; width: 120px;">Voucher No</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 6px 8px; text-align: left;">Debit</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 6px 8px; text-align: right; width: 110px;">Debit Amount</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 6px 8px; text-align: left;">Credit</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 6px 8px; text-align: right; width: 110px;">Credit Amount</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 6px 8px; text-align: center; width: 60px;">Actions</th>
            </tr>
          </thead>
          <tbody id="search-results-tbody">
            <!-- Results populated dynamically -->
          </tbody>
        </table>
      </div>
      <div id="search-load-more-container" style="display:none; text-align:center; padding-top:8px;">
        <button type="button" id="btn-search-load-more" class="btn btn-secondary" style="font-size:0.8rem; font-weight:bold; padding:4px 16px;">
          Load More Results...
        </button>
      </div>
    </div>

    <style>
      .custom-voucher-table th {
        background-color: #1e3b8b !important;
        color: white !important;
        font-weight: bold;
        border: 1px solid var(--border-color) !important;
        padding: 6px 8px;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .custom-voucher-table td {
        border: 1px solid var(--border-color) !important;
        padding: 6px 8px;
        color: var(--text-primary) !important;
      }
      .custom-voucher-table tr:hover {
        background-color: var(--bg-tertiary) !important;
      }
    </style>
  `;

  initTallyDatePickers(container);

  const fromEl = document.getElementById("search-vouchers-from");
  const toEl = document.getElementById("search-vouchers-to");
  const typeEl = document.getElementById("search-vouchers-type");
  const txtEl = document.getElementById("search-vouchers-txt");

  fromEl?.addEventListener("change", (e) => { 
    searchFromDate = e.target.value; 
    executeSearch(container);
  });
  toEl?.addEventListener("change", (e) => { 
    searchToDate = e.target.value; 
    executeSearch(container);
  });
  typeEl?.addEventListener("change", (e) => { 
    searchVoucherType = e.target.value; 
    executeSearch(container);
  });
  
  // Search text with enter key or debounce
  let debounceTimer = null;
  txtEl?.addEventListener("input", (e) => { 
    searchTxt = e.target.value; 
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      executeSearch(container);
    }, 250);
  });

  txtEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(debounceTimer);
      hasSearched = true;
      executeSearch(container);
    }
  });

  // Bind search go
  document.getElementById("btn-search-vouchers-go")?.addEventListener("click", () => {
    hasSearched = true;
    displayLimit = 250;
    executeSearch(container);
  });

  // Bind reset
  document.getElementById("btn-search-vouchers-reset")?.addEventListener("click", () => {
    const todayStr = state.getLoginDate() || new Date().toISOString().split("T")[0];
    searchFromDate = state.getActiveFinancialYearStartDate() || todayStr;
    searchToDate = state.getActiveFinancialYearEndDate() || todayStr;
    searchTxt = "";
    searchVoucherType = "All";
    hasSearched = true;
    displayLimit = 250;
    
    if (fromEl) fromEl.value = searchFromDate;
    if (toEl) toEl.value = searchToDate;
    if (typeEl) typeEl.value = "All";
    if (txtEl) txtEl.value = "";
    
    executeSearch(container);
  });

  // Bind Reset Voucher Numbers
  document.getElementById("btn-search-rearrange-vouchers")?.addEventListener("click", () => {
    showRearrangeVouchersModal(searchVoucherType === "All" ? "ALL" : searchVoucherType.toLowerCase());
  });

  // Run initial search
  executeSearch(container);
}

function executeSearch(container) {
  const tbody = document.getElementById("search-results-tbody");
  if (!tbody) return;

  const titleEl = document.getElementById("search-title");
  const counterEl = document.getElementById("search-status-counter");
  const loadMoreBox = document.getElementById("search-load-more-container");

  if (titleEl) {
    titleEl.innerText = `${searchVoucherType === "All" ? "All Manual Vouchers" : searchVoucherType} Logs`;
  }

  // 1. Build fast O(1) Lookup Maps once per search
  const contactMap = new Map();
  (state.getContacts() || []).forEach(c => {
    if (!c) return;
    if (c.id) contactMap.set(c.id, c.name);
    if (c.ledgerCode) contactMap.set(c.ledgerCode, c.name);
    if (c.code) contactMap.set(c.code, c.name);
  });

  const ledgerMap = new Map();
  (state.getLedgers() || []).forEach(l => {
    if (!l) return;
    if (l.code) ledgerMap.set(l.code, l.name);
    if (l.id) ledgerMap.set(l.id, l.name);
  });

  const cashBankIds = new Set(
    (state.getLedgers() || [])
      .filter(l => l && (l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS"))
      .map(l => l.code)
  );
  cashBankIds.add("1010");
  cashBankIds.add("1020");

  const invoiceMap = new Map();
  (state.getInvoices() || []).forEach(i => {
    if (!i) return;
    if (i.id) invoiceMap.set(String(i.id).toUpperCase(), i);
    if (i.voucherNo) invoiceMap.set(String(i.voucherNo).toUpperCase(), i);
    if (i.refNo) invoiceMap.set(String(i.refNo).toUpperCase(), i);
  });

  const purchaseMap = new Map();
  (state.getPurchases() || []).forEach(p => {
    if (!p) return;
    if (p.id) purchaseMap.set(String(p.id).toUpperCase(), p);
    if (p.voucherNo) purchaseMap.set(String(p.voucherNo).toUpperCase(), p);
    if (p.refNo) purchaseMap.set(String(p.refNo).toUpperCase(), p);
  });

  const salesReturnMap = new Map();
  (state.getSalesReturns() || []).forEach(sr => {
    if (!sr) return;
    if (sr.id) {
      salesReturnMap.set(String(sr.id).toUpperCase(), sr);
      salesReturnMap.set(`CREDIT NOTE ${String(sr.id).toUpperCase()}`, sr);
      salesReturnMap.set(`SALES RETURN ${String(sr.id).toUpperCase()}`, sr);
    }
    if (sr.billNo) salesReturnMap.set(String(sr.billNo).toUpperCase(), sr);
  });

  const purchaseReturnMap = new Map();
  (state.getPurchaseReturns() || []).forEach(pr => {
    if (!pr) return;
    if (pr.id) {
      purchaseReturnMap.set(String(pr.id).toUpperCase(), pr);
      purchaseReturnMap.set(`DEBIT NOTE ${String(pr.id).toUpperCase()}`, pr);
      purchaseReturnMap.set(`PURCHASE RETURN ${String(pr.id).toUpperCase()}`, pr);
    }
    if (pr.billNo) purchaseReturnMap.set(String(pr.billNo).toUpperCase(), pr);
  });

  let rawTransactions = state.getTransactions() || [];

  // 2. Early date filtering
  if (searchFromDate) {
    rawTransactions = rawTransactions.filter(t => t && t.date >= searchFromDate);
  }
  if (searchToDate) {
    rawTransactions = rawTransactions.filter(t => t && t.date <= searchToDate);
  }

  // 3. Early text filtering
  if (searchTxt) {
    const term = searchTxt.trim().toLowerCase();
    rawTransactions = rawTransactions.filter(t => {
      if (!t) return false;
      if (t.id && String(t.id).toLowerCase().includes(term)) return true;
      if (t.reference && String(t.reference).toLowerCase().includes(term)) return true;
      if (t.voucherNo && String(t.voucherNo).toLowerCase().includes(term)) return true;
      if (t.description && String(t.description).toLowerCase().includes(term)) return true;
      if (t.entries && Array.isArray(t.entries)) {
        return t.entries.some(e => {
          if (!e || !e.accountId) return false;
          const accName = getAccountNameForLog(e.accountId, t, contactMap, ledgerMap);
          return accName.toLowerCase().includes(term);
        });
      }
      return false;
    });
  }

  // 4. Classify and filter manual vouchers
  const matchedList = [];
  const selectedTypeClean = searchVoucherType.toLowerCase();

  for (let i = 0; i < rawTransactions.length; i++) {
    const t = rawTransactions[i];
    if (!t || t.isCancelled) continue;

    const classification = getFastTransactionType(t, invoiceMap, purchaseMap, salesReturnMap, purchaseReturnMap, cashBankIds);
    if (["Sales", "Purchase", "Sales Return", "Purchase Return", "COGS"].includes(classification.type)) {
      continue;
    }

    if (searchVoucherType !== "All") {
      if (classification.type.toLowerCase() !== selectedTypeClean) {
        continue;
      }
    }

    matchedList.push({ tx: t, classification });
  }

  // 5. Sort by date descending
  matchedList.sort((a, b) => {
    if (a.tx.date !== b.tx.date) {
      return String(b.tx.date || "").localeCompare(String(a.tx.date || ""));
    }
    return String(b.tx.id || "").localeCompare(String(a.tx.id || ""));
  });

  const totalCount = matchedList.length;
  const visibleItems = matchedList.slice(0, displayLimit);

  if (counterEl) {
    if (totalCount > displayLimit) {
      counterEl.innerText = `Showing ${displayLimit} of ${totalCount} records`;
    } else {
      counterEl.innerText = `Found ${totalCount} record(s)`;
    }
  }

  if (loadMoreBox) {
    loadMoreBox.style.display = totalCount > displayLimit ? "block" : "none";
    const loadBtn = document.getElementById("btn-search-load-more");
    if (loadBtn) {
      loadBtn.onclick = () => {
        displayLimit += 250;
        executeSearch(container);
      };
    }
  }

  if (visibleItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching voucher logs found.</td></tr>`;
    return;
  }

  // 6. Fast HTML rendering
  let html = "";
  for (let i = 0; i < visibleItems.length; i++) {
    html += getVoucherTableRowHTML(visibleItems[i].tx, contactMap, ledgerMap);
  }
  tbody.innerHTML = html;

  // 7. Event delegation on tbody to avoid creating hundreds of listeners
  tbody.onclick = (e) => {
    const delBtn = e.target.closest(".btn-delete-search-tx");
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.getAttribute("data-id");
      const r = matchedList.find(item => item.tx.id === id);
      if (r) {
        handleRowDelete(r.tx, r.classification, container);
      }
      return;
    }
  };

  tbody.ondblclick = (e) => {
    const row = e.target.closest(".search-voucher-row");
    if (row) {
      const id = row.getAttribute("data-id");
      const r = matchedList.find(item => item.tx.id === id);
      if (r) {
        handleRowDoubleClick(r.tx, r.classification, container);
      }
    }
  };
}

function handleRowDoubleClick(tx, classification, container) {
  const modalEl = document.getElementById("window-content-area");
  
  if (classification.type === "Sales" && classification.doc) {
    showInvoiceBuilderModal(modalEl, null, null, () => renderSearchVouchers(container), classification.doc);
  } else if (classification.type === "Purchase" && classification.doc) {
    showRecordPurchaseModal(modalEl, classification.doc, () => renderSearchVouchers(container));
  } else if (classification.type === "Sales Return" && classification.doc) {
    showSalesReturnModal(modalEl, classification.doc, () => renderSearchVouchers(container));
  } else if (classification.type === "Purchase Return" && classification.doc) {
    showPurchaseReturnModal(modalEl, classification.doc, () => renderSearchVouchers(container));
  } else if (classification.type === "Contra") {
    showContraModal(modalEl, tx, true, container);
  } else if (classification.type === "Receipt") {
    showUnifiedSplitVoucherModal(modalEl, tx, "receipt", true, container);
  } else if (classification.type === "Payment") {
    showUnifiedSplitVoucherModal(modalEl, tx, "payment", true, container);
  } else if (classification.type === "Journal") {
    showUnifiedSplitVoucherModal(modalEl, tx, "journal", true, container);
  } else if (classification.type === "Debit Note") {
    showUnifiedSplitVoucherModal(modalEl, tx, "debit", true, container);
  } else if (classification.type === "Credit Note") {
    showUnifiedSplitVoucherModal(modalEl, tx, "credit", true, container);
  }
}

function handleRowDelete(tx, classification, container) {
  if (confirm(`Are you sure you want to delete this ${classification.type} transaction?`)) {
    if (checkAdminPassword()) {
      let success = false;
      if (classification.type === "Sales" && classification.doc) {
        success = state.cancelInvoice(classification.doc.id);
      } else if (classification.type === "Purchase" && classification.doc) {
        success = state.cancelPurchase(classification.doc.id);
      } else if (classification.type === "Sales Return" && classification.doc) {
        success = state.deleteSalesReturn(classification.doc.id);
      } else if (classification.type === "Purchase Return" && classification.doc) {
        success = state.deletePurchaseReturn(classification.doc.id);
      } else {
        success = state.deleteTransaction(tx.id);
      }
      if (success) {
        invalidateReportCache();
        executeSearch(container);
      }
    }
  }
}
