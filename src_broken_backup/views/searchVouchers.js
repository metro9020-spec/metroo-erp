import { state, ACCOUNTS } from "../state.js";
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

// Session-level search state persistence
let searchFromDate = new Date().toISOString().split("T")[0];
let searchToDate = new Date().toISOString().split("T")[0];
let searchTxt = "";
let searchVoucherType = "All";
let hasSearched = false;

function getAccountNameForLog(accountId, tx) {
  if ((accountId === "1100" || accountId === "2100") && tx && tx.description) {
    const contact = state.getContacts().find(c => tx.description.includes(c.name));
    if (contact) return contact.name;
  }
  const baseContactId = accountId.includes("::") ? accountId.split("::")[0] : accountId;
  const site = accountId.includes("::") ? accountId.split("::")[1] : null;

  const ledger = state.getLedgers().find(l => l.code === baseContactId);
  if (ledger) return site ? `${ledger.name} (${site})` : ledger.name;
  if (ACCOUNTS[baseContactId]) return site ? `${ACCOUNTS[baseContactId].name} (${site})` : ACCOUNTS[baseContactId].name;
  const contact = state.getContacts().find(c => c.id === baseContactId);
  if (contact) return site ? `${contact.name} (${site})` : contact.name;
  return accountId;
}

function getTransactionType(tx) {
  const refClean = (tx.reference || "").trim();
  const refUpper = refClean.toUpperCase();
  const refLower = refClean.toLowerCase();
  const descLower = (tx.description || "").toLowerCase();
  const idUpper = String(tx.id || "").toUpperCase();
  
  // 1. Check if it's an Invoice
  const inv = state.getInvoices().find(i => i && (String(i.id).toUpperCase() === idUpper || String(i.voucherNo).toUpperCase() === refUpper || String(i.refNo).toUpperCase() === refUpper));
  if (inv) return { type: "Sales", doc: inv };

  // 2. Check if it's a Purchase
  const pur = state.getPurchases().find(p => p && (String(p.id).toUpperCase() === idUpper || String(p.voucherNo).toUpperCase() === refUpper || String(p.refNo).toUpperCase() === refUpper));
  if (pur) return { type: "Purchase", doc: pur };

  // 3. Check if it's a Sales Return
  const sr = state.getSalesReturns().find(s => s && (String(s.id).toUpperCase() === idUpper || String(s.id).toUpperCase() === refUpper || `CREDIT NOTE ${s.id}`.toUpperCase() === refUpper));
  if (sr) return { type: "Sales Return", doc: sr };

  // 4. Check if it's a Purchase Return
  const pr = state.getPurchaseReturns().find(p => p && (String(p.id).toUpperCase() === idUpper || String(p.id).toUpperCase() === refUpper || `DEBIT NOTE ${p.id}`.toUpperCase() === refUpper));
  if (pr) return { type: "Purchase Return", doc: pr };

  if (refUpper.includes("COGS")) return { type: "COGS" };

  // 5. Check if it's a Contra, Receipt, Payment, or Journal
  const cashBankIds = new Set(
    state.getLedgers()
      .filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS")
      .map(l => l.code)
  );
  cashBankIds.add("1010");
  cashBankIds.add("1020");

  const isContraRef = refLower.includes("contra") || refLower.includes("cn-") || (refUpper.startsWith("C") && !refUpper.startsWith("COGS"));
  const debitsCashBank = tx.entries.some(e => cashBankIds.has(e.accountId) && e.debit > 0);
  const creditsCashBank = tx.entries.some(e => cashBankIds.has(e.accountId) && e.credit > 0);
  const onlyCashBank = tx.entries.every(e => cashBankIds.has(e.accountId));
  if ((isContraRef && debitsCashBank && creditsCashBank) || (onlyCashBank && debitsCashBank && creditsCashBank && tx.entries.length === 2)) {
    return { type: "Contra" };
  }

  const isReceiptRef = refUpper.startsWith("RC-") || refUpper.startsWith("RC") || refLower.includes("receipt") || refLower.includes("rcpt") || (refUpper.startsWith("R") && !refUpper.startsWith("RC-") && !refUpper.startsWith("RCPT") && !refUpper.startsWith("RECEIPT") && /^[R]\d+$/.test(refUpper));
  const debitsCashBankReceipt = tx.entries.some(e => cashBankIds.has(e.accountId) && e.debit > 0);
  const creditsNonCashBankReceipt = tx.entries.some(e => !cashBankIds.has(e.accountId) && e.credit > 0);
  if (isReceiptRef && debitsCashBankReceipt && creditsNonCashBankReceipt) {
    return { type: "Receipt" };
  }

  const isPaymentRef = (refUpper.startsWith("PM-") || refUpper.startsWith("PM") || refLower.includes("payment") || refLower.includes("pay") || (refUpper.startsWith("P") && !refUpper.startsWith("PR") && !refUpper.startsWith("PM") && /^[P]\d+$/.test(refUpper))) && !refUpper.startsWith("PR");
  const creditsCashBankPayment = tx.entries.some(e => cashBankIds.has(e.accountId) && e.credit > 0);
  const debitsNonCashBankPayment = tx.entries.some(e => !debitAccountMatchesCashBank(e.accountId, cashBankIds));
  function debitAccountMatchesCashBank(accId, set) {
    return set.has(accId);
  }
  if (isPaymentRef && creditsCashBankPayment && debitsNonCashBankPayment) {
    return { type: "Payment" };
  }

  return { type: "Journal" };
}

function getVoucherTableRowHTML(tx) {
  const debits = tx.entries.filter(e => e.debit > 0);
  const credits = tx.entries.filter(e => e.credit > 0);

  const debitNames = debits.map(e => {
    let name = getAccountNameForLog(e.accountId, tx);
    if (e.siteBranch) name += ` (${e.siteBranch})`;
    return `<strong>${name}</strong>`;
  }).join("<br>");
  
  const debitAmounts = debits.map(e => `₹${e.debit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`).join("<br>");

  const creditNames = credits.map(e => {
    let name = getAccountNameForLog(e.accountId, tx);
    if (e.siteBranch) name += ` (${e.siteBranch})`;
    return `<strong>${name}</strong>`;
  }).join("<br>");

  const creditAmounts = credits.map(e => `₹${e.credit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`).join("<br>");

  const refLower = (tx.reference || "").toLowerCase().trim();
  const isGenericRef = refLower === "receipt" || refLower === "payment" || refLower === "contra" || refLower === "journal";
  const displayVoucherNo = isGenericRef ? tx.id : (tx.reference || tx.id);

  return `
    <tr class="search-voucher-row" data-id="${tx.id}" style="cursor: pointer;" title="Double click to edit entry">
      <td style="color: var(--text-primary);">${tx.date}</td>
      <td><code class="highlight-text" style="font-weight: 700;">${displayVoucherNo}</code></td>
      <td style="color: var(--text-primary);">${debitNames}</td>
      <td style="text-align: right; font-weight: 600; color: var(--text-primary);">${debitAmounts}</td>
      <td style="color: var(--text-primary);">${creditNames}</td>
      <td style="text-align: right; font-weight: 600; color: var(--text-primary);">${creditAmounts}</td>
      <td style="text-align: center;">
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
  // Base HTML Layout matching the exact style in the user's reference image
  container.innerHTML = `
    <div class="panel" style="margin-bottom: 1rem; padding: 12px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); font-family: var(--font-body); border-radius: 4px; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; color: var(--text-primary);">
        
        <!-- From Date -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-weight:700; color: var(--text-secondary); font-size:0.85rem; margin: 0;">From</label>
          <input type="date" id="search-vouchers-from" class="form-control" style="width:135px; height:30px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);" value="${searchFromDate}">
        </div>
        
        <!-- To Date -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-weight:700; color: var(--text-secondary); font-size:0.85rem; margin: 0;">To</label>
          <input type="date" id="search-vouchers-to" class="form-control" style="width:135px; height:30px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);" value="${searchToDate}">
        </div>

        <!-- Voucher Type Selector -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-weight:700; color: var(--text-secondary); font-size:0.85rem; margin: 0;">Voucher Type</label>
          <select id="search-vouchers-type" class="form-control" style="width:150px; height:30px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color); font-size:0.85rem;">
            <option value="All" ${searchVoucherType === 'All' ? 'selected' : ''}>All Vouchers</option>
            <option value="Receipt" ${searchVoucherType === 'Receipt' ? 'selected' : ''}>Receipt</option>
            <option value="Payment" ${searchVoucherType === 'Payment' ? 'selected' : ''}>Payment</option>
            <option value="Contra" ${searchVoucherType === 'Contra' ? 'selected' : ''}>Contra</option>
            <option value="Journal" ${searchVoucherType === 'Journal' ? 'selected' : ''}>Journal</option>
          </select>
        </div>
        
        <!-- Search Text -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="text" id="search-vouchers-txt" class="form-control" placeholder="Search VNo/Narration..." style="width:200px; height:30px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);" value="${searchTxt}">
        </div>
        
        <!-- Action Buttons -->
        <button class="btn btn-primary" id="btn-search-vouchers-go" style="height:30px; padding: 0 15px; font-size:0.85rem; font-weight:700; background: #4f46e5; border-color: #4f46e5; color: white;">Search</button>
        <button class="btn btn-secondary" id="btn-search-vouchers-reset" style="height:30px; padding: 0 15px; font-size:0.85rem; font-weight:700; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);">Reset</button>
      </div>
    </div>

    <!-- Logs List Panel -->
    <div class="panel" style="padding: 1rem; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; height: calc(100vh - 220px); background: var(--bg-secondary); border: 1px solid var(--border-color);">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--text-primary); font-size: 1.1rem;" id="search-title">Search Voucher Logs</div>
      <div class="table-responsive" style="flex-grow: 1; overflow-y: auto;">
        <table class="custom-voucher-table" style="width: 100%; border-collapse: collapse; margin-top: 0;">
          <thead>
            <tr>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 8px; text-align: left;">Date</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 8px; text-align: left;">Voucher No</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 8px; text-align: left;">Debit</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 8px; text-align: right;">Debit Amount</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 8px; text-align: left;">Credit</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 8px; text-align: right;">Credit Amount</th>
              <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid var(--border-color); padding: 8px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody id="search-results-tbody">
            <!-- Results populated dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <style>
      .custom-voucher-table th {
        background-color: #1e3b8b !important;
        color: white !important;
        font-weight: bold;
        border: 1px solid var(--border-color) !important;
        padding: 8px;
      }
      .custom-voucher-table td {
        border: 1px solid var(--border-color) !important;
        padding: 8px;
        color: var(--text-primary) !important;
      }
      .custom-voucher-table tr:hover {
        background-color: var(--bg-tertiary) !important;
      }
    </style>
  `;

  // Bind inputs to variables
  const fromEl = document.getElementById("search-vouchers-from");
  const toEl = document.getElementById("search-vouchers-to");
  const typeEl = document.getElementById("search-vouchers-type");
  const txtEl = document.getElementById("search-vouchers-txt");

  fromEl.addEventListener("change", (e) => { searchFromDate = e.target.value; });
  toEl.addEventListener("change", (e) => { searchToDate = e.target.value; });
  typeEl.addEventListener("change", (e) => { searchVoucherType = e.target.value; });
  txtEl.addEventListener("input", (e) => { searchTxt = e.target.value; });

  // Bind search go
  document.getElementById("btn-search-vouchers-go").addEventListener("click", () => {
    hasSearched = true;
    executeSearch(container);
  });

  // Bind reset
  document.getElementById("btn-search-vouchers-reset").addEventListener("click", () => {
    const todayStr = new Date().toISOString().split("T")[0];
    searchFromDate = todayStr;
    searchToDate = todayStr;
    searchTxt = "";
    searchVoucherType = "All";
    hasSearched = false;
    
    fromEl.value = todayStr;
    toEl.value = todayStr;
    typeEl.value = "All";
    txtEl.value = "";
    
    executeSearch(container);
  });

  // Run initial load search if hasSearched is true
  executeSearch(container);
}

function executeSearch(container) {
  const tbody = document.getElementById("search-results-tbody");
  if (!tbody) return;

  if (!hasSearched) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No logs found. Click Search to load.</td></tr>`;
    document.getElementById("search-title").innerText = "Search Voucher Logs";
    return;
  }

  // Update title based on selected type
  document.getElementById("search-title").innerText = `${searchVoucherType} Logs`;

  let transactions = state.getTransactions() || [];

  // Filter by Date
  if (searchFromDate) transactions = transactions.filter(t => t.date >= searchFromDate);
  if (searchToDate) transactions = transactions.filter(t => t.date <= searchToDate);

  // Filter by Search Text
  if (searchTxt) {
    const term = searchTxt.toLowerCase();
    transactions = transactions.filter(t => 
      String(t.id).toLowerCase().includes(term) || 
      String(t.reference || "").toLowerCase().includes(term) || 
      String(t.description || "").toLowerCase().includes(term)
    );
  }

  // Map each transaction to its type
  let results = transactions.map(t => {
    const res = getTransactionType(t);
    return { tx: t, classification: res };
  });

  // Filter out non-manual vouchers (Sales, Purchase, Returns, COGS)
  const excludedTypes = ["Sales", "Purchase", "Sales Return", "Purchase Return", "COGS"];
  results = results.filter(r => !excludedTypes.includes(r.classification.type));

  // Filter by selected Voucher Type
  if (searchVoucherType !== "All") {
    results = results.filter(r => r.classification.type.toLowerCase() === searchVoucherType.toLowerCase());
  }

  // Sort by date descending
  results.sort((a, b) => new Date(b.tx.date) - new Date(a.tx.date));

  if (results.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No logs found.</td></tr>`;
    return;
  }

  tbody.innerHTML = results.map(r => getVoucherTableRowHTML(r.tx)).join("");

  // Bind double click to open modal
  tbody.querySelectorAll(".search-voucher-row").forEach(row => {
    row.addEventListener("dblclick", () => {
      const id = row.getAttribute("data-id");
      const r = results.find(item => item.tx.id === id);
      if (r) {
        handleRowDoubleClick(r.tx, r.classification, container);
      }
    });
  });

  // Bind delete button click
  tbody.querySelectorAll(".btn-delete-search-tx").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      const r = results.find(item => item.tx.id === id);
      if (r) {
        handleRowDelete(r.tx, r.classification, container);
      }
    });
  });
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
  }
}

function handleRowDelete(tx, classification, container) {
  if (confirm(`Are you sure you want to delete this ${classification.type} transaction?`)) {
    if (checkAdminPassword()) {
      if (classification.type === "Sales" && classification.doc) {
        state.cancelInvoice(classification.doc.id);
      } else if (classification.type === "Purchase" && classification.doc) {
        state.cancelPurchase(classification.doc.id);
      } else if (classification.type === "Sales Return" && classification.doc) {
        state.deleteSalesReturn(classification.doc.id);
      } else if (classification.type === "Purchase Return" && classification.doc) {
        state.deletePurchaseReturn(classification.doc.id);
      } else {
        state.deleteTransaction(tx.id);
      }
      executeSearch(container);
    }
  }
}
