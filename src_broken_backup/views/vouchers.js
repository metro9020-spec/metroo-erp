import { state, ACCOUNTS } from "../state.js";

let activeVoucherTab = "contra"; // 'contra', 'receipt', 'payment', 'journal'
let showVoucherLauncher = true;
let showLogsPanel = false;

let showLogs = false;
let searchFromDate = "";
let searchToDate = "";
let searchTxt = "";

// Auto-reset launcher on navigation
window.addEventListener("hashchange", () => {
  if (window.location.hash === "#vouchers") {
    showVoucherLauncher = true;
    showLogs = false;
    showLogsPanel = false;
  }
});

// Setup sidebar and menu listener shortcuts
setTimeout(() => {
  const btnCust = document.getElementById("sidebar-btn-customer");
  if (btnCust) {
    btnCust.addEventListener("click", () => {
      window.location.hash = "#contacts";
    });
  }
  const btnVend = document.getElementById("sidebar-btn-vendor");
  if (btnVend) {
    btnVend.addEventListener("click", () => {
      window.location.hash = "#contacts";
    });
  }
  const btnEmp = document.getElementById("sidebar-btn-employee");
  if (btnEmp) {
    btnEmp.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Employee Registry: This module records attendance, salary allowances, and employee expense claims. Access key settings under Transaction ➔ Employee Expense Entry.");
    });
  }
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
  const menuAbout = document.getElementById("menu-about");
  if (menuAbout) {
    menuAbout.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Material Ledger ERP v1.0.4\nA classic, high-performance batch-wise building materials inventory system with GST compliance.");
    });
  }
}, 500);

function getSearchPanelHTML() {
  const todayStr = new Date().toISOString().split("T")[0];
  if (!searchFromDate) searchFromDate = todayStr;
  if (!searchToDate) searchToDate = todayStr;
  return `
    <div class="panel" style="margin-bottom: 1rem; padding: 10px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); font-family: var(--font-body); border-radius: 4px;">
      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; color: var(--text-primary);">
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-weight:700; color: var(--text-secondary); font-size:0.85rem; margin: 0;">From</label>
          <input type="date" id="search-from-date" class="form-control" style="width:135px; height:30px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);" value="${searchFromDate}">
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-weight:700; color: var(--text-secondary); font-size:0.85rem; margin: 0;">To</label>
          <input type="date" id="search-to-date" class="form-control" style="width:135px; height:30px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);" value="${searchToDate}">
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="text" id="search-txt" class="form-control" placeholder="Search VNo/Narration..." style="width:180px; height:30px; padding:2px 5px; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);" value="${searchTxt}">
        </div>
        <button class="btn btn-primary" id="btn-search-go" style="height:30px; padding: 0 15px; font-size:0.85rem; font-weight:700;">Search</button>
        <button class="btn btn-secondary" id="btn-search-reset" style="height:30px; padding: 0 15px; font-size:0.85rem; font-weight:700; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);">Reset</button>
      </div>
    </div>
    <style>
      .custom-voucher-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        background-color: var(--bg-secondary) !important;
        color: var(--text-primary) !important;
      }
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
}

function bindSearchEvents(container, refreshCallback) {
  const fromDate = document.getElementById("search-from-date");
  const toDate = document.getElementById("search-to-date");
  const txt = document.getElementById("search-txt");
  
  if (fromDate) fromDate.addEventListener("change", (e) => { searchFromDate = e.target.value; });
  if (toDate) toDate.addEventListener("change", (e) => { searchToDate = e.target.value; });
  if (txt) txt.addEventListener("input", (e) => { searchTxt = e.target.value; });

  const goBtn = document.getElementById("btn-search-go");
  if (goBtn) goBtn.addEventListener("click", () => {
    showLogs = true;
    refreshCallback();
  });

  const resetBtn = document.getElementById("btn-search-reset");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    const todayStr = new Date().toISOString().split("T")[0];
    searchFromDate = todayStr;
    searchToDate = todayStr;
    searchTxt = "";
    showLogs = false;
    refreshCallback();
  });
}

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

function getVoucherTableRowHTML(tx, deleteBtnClass, rowClass = "voucher-log-row") {
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
    <tr class="${rowClass} voucher-log-row" data-id="${tx.id}" style="cursor: pointer;" title="Double click to edit entry">
      <td style="color: var(--text-primary);">${tx.date}</td>
      <td><code class="highlight-text" style="font-weight: 700;">${displayVoucherNo}</code></td>
      <td style="color: var(--text-primary);">${debitNames}</td>
      <td style="text-align: right; font-weight: 600; color: var(--text-primary);">${debitAmounts}</td>
      <td style="color: var(--text-primary);">${creditNames}</td>
      <td style="text-align: right; font-weight: 600; color: var(--text-primary);">${creditAmounts}</td>
      <td style="text-align: center;">
        <button class="btn btn-danger btn-icon ${deleteBtnClass}" data-id="${tx.id}" style="background-color:#ef4444; color:white; border:none;"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    </tr>
  `;
}

function getPlaceholderHTML() {
  return `
    <div style="display:flex; justify-content:center; align-items:center; min-height:200px; border:2px dashed var(--border-color); border-radius:4px; background: var(--bg-secondary); color: var(--text-muted); font-weight:700;">
      Click "Search" to load the voucher logs list.
    </div>
  `;
}

function checkAdminPassword() {
  const pw = prompt("Enter Admin Password:");
  if (pw === "123") return true;
  alert("Incorrect Password!");
  return false;
}

function renderSelectVoucherLauncher(container) {
  container.innerHTML = `
    <div class="panel" style="max-width: 900px; margin: 0 auto; padding: 2rem; font-family: var(--font-body); color: var(--text-primary); background: var(--bg-secondary); border: 1px solid var(--border-color);">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #1e3b8b; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="font-weight: 800; font-size: 1.5rem; color: #1e3b8b; margin: 0;">Voucher Creation Menu</h2>
        <button class="btn btn-secondary" id="btn-close-launcher" style="background:#cbd5e1; border:1px solid #94a3b8; color:black; font-weight:700;">
          <i class="fa-solid fa-xmark"></i> Close
        </button>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
        <!-- Contra Card -->
        <div class="launcher-card" data-launch="contra" style="border: 2px solid var(--border-color); border-radius: 6px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: var(--bg-tertiary); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; color: #1e3b8b; margin-bottom: 10px;"><i class="fa-solid fa-right-left"></i></div>
          <h3 style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); margin: 0 0 5px 0;">Contra Voucher</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Transfer funds between Cash and Bank accounts.</p>
        </div>
        <!-- Receipt Card -->
        <div class="launcher-card" data-launch="receipt" style="border: 2px solid var(--border-color); border-radius: 6px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: var(--bg-tertiary); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; color: #10b981; margin-bottom: 10px;"><i class="fa-solid fa-arrow-down-long"></i></div>
          <h3 style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); margin: 0 0 5px 0;">Receipt Voucher</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Record money received from customers or general incomes.</p>
        </div>
        <!-- Payment Card -->
        <div class="launcher-card" data-launch="payment" style="border: 2px solid var(--border-color); border-radius: 6px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: var(--bg-tertiary); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; color: #ef4444; margin-bottom: 10px;"><i class="fa-solid fa-arrow-up-long"></i></div>
          <h3 style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); margin: 0 0 5px 0;">Payment Voucher</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Record money paid to vendors or general expenses.</p>
        </div>
        <!-- Journal Card -->
        <div class="launcher-card" data-launch="journal" style="border: 2px solid var(--border-color); border-radius: 6px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: var(--bg-tertiary); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 10px;"><i class="fa-solid fa-book"></i></div>
          <h3 style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); margin: 0 0 5px 0;">Journal Entry</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Post non-cash adjustment entries and double-entry splits.</p>
        </div>
        <!-- Debit Note -->
        <div class="launcher-card" data-launch="debit" style="border: 2px solid var(--border-color); border-radius: 6px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: var(--bg-tertiary); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; color: #6366f1; margin-bottom: 10px;"><i class="fa-solid fa-file-invoice-dollar"></i></div>
          <h3 style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); margin: 0 0 5px 0;">Debit Note</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Purchase returns or vendor rate discount adjustments.</p>
        </div>
        <!-- Credit Note -->
        <div class="launcher-card" data-launch="credit" style="border: 2px solid var(--border-color); border-radius: 6px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: var(--bg-tertiary); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; color: #ec4899; margin-bottom: 10px;"><i class="fa-solid fa-file-invoice-dollar"></i></div>
          <h3 style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); margin: 0 0 5px 0;">Credit Note</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Sales returns or customer rate discount adjustments.</p>
        </div>
      </div>
      
      <style>
        .launcher-card:hover {
          background-color: var(--border-color) !important;
          border-color: #1e3b8b !important;
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }
      </style>
    </div>
  `;

  document.getElementById("btn-close-launcher").addEventListener("click", () => {
    window.location.hash = "#home";
  });

  document.querySelectorAll(".launcher-card").forEach(card => {
    card.addEventListener("click", () => {
      const type = card.getAttribute("data-launch");
      if (type === "receipt" || type === "payment" || type === "journal" || type === "contra") {
        activeVoucherTab = type;
        showVoucherLauncher = false;
        showLogs = false;
        showLogsPanel = false;
        renderVouchers(container);
      } else if (type === "debit") {
        alert("Debit Note Adjustments:\nUse this module to adjust purchase returns or price reductions.\nTo post, click 'Journal' and post an adjustment split debiting Vendor and crediting Purchase Return.");
      } else if (type === "credit") {
        alert("Credit Note Adjustments:\nUse this module to adjust sales returns or rate discounts.\nTo post, click 'Journal' and post an adjustment split debiting Sales Return and crediting Customer.");
      }
    });
  });
}

export function renderVouchers(container) {
  const activeWin = document.getElementById("active-window");
  if (showVoucherLauncher) {
    if (activeWin) activeWin.classList.add("launcher-mode");
    renderSelectVoucherLauncher(container);
    return;
  } else {
    if (activeWin) activeWin.classList.remove("launcher-mode");
  }

  container.innerHTML = `
    <!-- Sub-tabs Navigation -->
    <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap; align-items: center;">
      <button class="btn btn-secondary" id="btn-back-to-launcher" style="background:#cbd5e1; border:1px solid #94a3b8; color:black; margin-right: 10px; font-weight:700;">
        <i class="fa-solid fa-house"></i> Voucher Menu
      </button>
      <button class="btn ${activeVoucherTab === 'contra' ? 'btn-primary' : 'btn-secondary'} vtab-btn" data-vtab="contra">
        <i class="fa-solid fa-right-left"></i> Contra Voucher
      </button>
      <button class="btn ${activeVoucherTab === 'receipt' ? 'btn-primary' : 'btn-secondary'} vtab-btn" data-vtab="receipt">
        <i class="fa-solid fa-arrow-down-long"></i> Receipt Voucher
      </button>
      <button class="btn ${activeVoucherTab === 'payment' ? 'btn-primary' : 'btn-secondary'} vtab-btn" data-vtab="payment">
        <i class="fa-solid fa-arrow-up-long"></i> Payment Voucher
      </button>
      <button class="btn ${activeVoucherTab === 'journal' ? 'btn-primary' : 'btn-secondary'} vtab-btn" data-vtab="journal">
        <i class="fa-solid fa-book"></i> Journal Entry
      </button>
      <button class="btn btn-secondary" id="btn-vouchers-toggle-logs" style="margin-left: auto; background:#cbd5e1; border:1px solid #94a3b8; color:black; font-weight:700;">
        <i class="fa-solid fa-search"></i> ${showLogsPanel ? "Hide Logs" : "Search & Open Logs"}
      </button>
    </div>
    
    <div style="display: flex; gap: 20px; margin-top: 1rem; align-items: stretch; height: calc(100vh - 160px); overflow: hidden;">
      <!-- Left Column: Form Container -->
      <div id="voucher-form-container" style="${showLogsPanel ? 'flex: 1.1; min-width: 450px;' : 'flex: 1; max-width: 800px; margin: 0 auto;'} overflow-y: auto; height: 100%;"></div>
      
      <!-- Right Column: Logs Container -->
      <div id="voucher-logs-container" style="flex: 1.4; display: ${showLogsPanel ? 'flex' : 'none'}; flex-direction: column; overflow-y: auto; height: 100%;"></div>
    </div>
  `;

  // Back to launcher button
  document.getElementById("btn-back-to-launcher").addEventListener("click", () => {
    showVoucherLauncher = true;
    renderVouchers(container);
  });

  // Toggle logs layout
  document.getElementById("btn-vouchers-toggle-logs").addEventListener("click", () => {
    showLogsPanel = !showLogsPanel;
    renderVouchers(container);
  });

  // Bind tab clicks
  document.querySelectorAll(".vtab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeVoucherTab = btn.getAttribute("data-vtab");
      showLogs = false;
      renderVouchers(container);
    });
  });

  const formEl = document.getElementById("voucher-form-container");
  const logsEl = document.getElementById("voucher-logs-container");

  // Render respective form and logs
  if (activeVoucherTab === "contra") {
    showContraModal(formEl, null, true, container);
    renderContraLogsInline(logsEl, state.getTransactions(), formEl, container);
  } else {
    showUnifiedSplitVoucherModal(formEl, null, activeVoucherTab, true, container);
    renderUnifiedLogsInline(logsEl, state.getTransactions(), activeVoucherTab, formEl, container);
  }
}

function renderContraLogsInline(container, txs, formContainer, mainContainer) {
  const cashBankIds = new Set(
    state.getLedgers()
      .filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS")
      .map(l => l.code)
  );
  cashBankIds.add("1010");
  cashBankIds.add("1020");

  let contras = txs.filter(tx => {
    const refUpper = (tx.reference || "").toUpperCase();
    const refLower = (tx.reference || "").toLowerCase();
    const isContraRef = refLower.includes("contra") || refLower.includes("cn-") || (refUpper.startsWith("C") && !refUpper.startsWith("COGS"));
    const debitsCashBank = tx.entries.some(e => cashBankIds.has(e.accountId) && e.debit > 0);
    const creditsCashBank = tx.entries.some(e => cashBankIds.has(e.accountId) && e.credit > 0);
    const onlyCashBank = tx.entries.every(e => cashBankIds.has(e.accountId));
    return (isContraRef && debitsCashBank && creditsCashBank) || (onlyCashBank && debitsCashBank && creditsCashBank && tx.entries.length === 2);
  });

  if (showLogs) {
    if (searchFromDate) contras = contras.filter(tx => tx.date >= searchFromDate);
    if (searchToDate) contras = contras.filter(tx => tx.date <= searchToDate);
    if (searchTxt) {
      contras = contras.filter(tx => 
        tx.id.toLowerCase().includes(searchTxt.toLowerCase()) || 
        tx.reference.toLowerCase().includes(searchTxt.toLowerCase()) || 
        tx.description.toLowerCase().includes(searchTxt.toLowerCase())
      );
    }
  }

  contras.sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = `
    ${getSearchPanelHTML()}
    <div class="panel" style="padding: 1rem; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; height: 100%;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--text-primary);">Contra Logs</div>
      <div class="table-responsive" style="flex-grow: 1; overflow-y: auto;">
        <table class="custom-voucher-table" style="margin-top: 0;">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher No</th>
              <th>Debit</th>
              <th style="text-align: right;">Debit Amount</th>
              <th>Credit</th>
              <th style="text-align: right;">Credit Amount</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${contras.length === 0 ? `
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No contra vouchers found.</td></tr>
            ` : contras.map(tx => getVoucherTableRowHTML(tx, "delete-contra-btn", "contra-log-row")).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  bindSearchEvents(container, () => renderContraLogsInline(container, txs, formContainer, mainContainer));

  container.querySelectorAll(".delete-contra-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      if (checkAdminPassword()) {
        state.deleteTransaction(id);
        renderContraLogsInline(container, state.getTransactions(), formContainer, mainContainer);
        showContraModal(formContainer, null, true, mainContainer);
      }
    });
  });

  container.querySelectorAll(".contra-log-row").forEach(row => {
    row.addEventListener("dblclick", () => {
      const id = row.getAttribute("data-id");
      const tx = state.getTransactions().find(t => t.id === id);
      showContraModal(formContainer, tx, true, mainContainer);
    });
  });
}

function renderUnifiedLogsInline(container, txs, voucherType, formContainer, mainContainer) {
  const cashBankIds = new Set(
    state.getLedgers()
      .filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS")
      .map(l => l.code)
  );
  cashBankIds.add("1010");
  cashBankIds.add("1020");

  let filteredTxs = txs.filter(tx => {
    const refClean = tx.reference || "";
    const refUpper = refClean.toUpperCase();
    const refLower = refClean.toLowerCase();
    const descLower = (tx.description || "").toLowerCase();
    
    // Explicitly exclude invoice, purchase and return transactions from the manual voucher log list
    const isDoc = state.getPurchases().some(p => p && (p.voucherNo === refClean || p.refNo === refClean || p.id === refClean)) ||
                  state.getInvoices().some(i => i && (i.voucherNo === refClean || i.refNo === refClean || i.id === refClean)) ||
                  state.getSalesReturns().some(sr => sr && (sr.id === refClean || `Credit Note ${sr.id}` === refClean || sr.billNo === refClean)) ||
                  state.getPurchaseReturns().some(pr => pr && (pr.id === refClean || `Debit Note ${pr.id}` === refClean || pr.billNo === refClean)) ||
                  refUpper.includes("COGS");
    
    if (isDoc) return false;
    
    if (voucherType === "receipt") {
      const isReceiptRef = refUpper.startsWith("RC-") || refUpper.startsWith("RC") || refLower.includes("receipt") || refLower.includes("rcpt") || (refUpper.startsWith("R") && !refUpper.startsWith("RC-") && !refUpper.startsWith("RCPT") && !refUpper.startsWith("RECEIPT") && /^[R]\d+$/.test(refUpper));
      const debitsCashBank = tx.entries.some(e => cashBankIds.has(e.accountId) && e.debit > 0);
      const creditsNonCashBank = tx.entries.some(e => !cashBankIds.has(e.accountId) && e.credit > 0);
      return isReceiptRef && debitsCashBank && creditsNonCashBank;
    } else if (voucherType === "payment") {
      const isPaymentRef = (refUpper.startsWith("PM-") || refUpper.startsWith("PM") || refLower.includes("payment") || refLower.includes("pay") || (refUpper.startsWith("P") && !refUpper.startsWith("PR") && !refUpper.startsWith("PM") && /^[P]\d+$/.test(refUpper))) && !refUpper.startsWith("PR");
      const creditsCashBank = tx.entries.some(e => cashBankIds.has(e.accountId) && e.credit > 0);
      const debitsNonCashBank = tx.entries.some(e => !cashBankIds.has(e.accountId) && e.debit > 0);
      return isPaymentRef && creditsCashBank && debitsNonCashBank;
    } else {
      // Show ONLY true journal entries (starting with J or containing JV/journal)
      const isJv = (refUpper.startsWith("JV-") || refUpper.startsWith("JV") || refLower.includes("journal") || descLower.includes("journal") || (refUpper.startsWith("J") && /^[J]\d+$/.test(refUpper))) &&
                   !refUpper.startsWith("RC") && !refUpper.startsWith("PM") && !refUpper.startsWith("CO") && !refUpper.startsWith("PR") && !refUpper.startsWith("SA");
      return isJv;
    }
  });

  if (showLogs) {
    if (searchFromDate) filteredTxs = filteredTxs.filter(tx => tx.date >= searchFromDate);
    if (searchToDate) filteredTxs = filteredTxs.filter(tx => tx.date <= searchToDate);
    if (searchTxt) {
      filteredTxs = filteredTxs.filter(tx => 
        tx.id.toLowerCase().includes(searchTxt.toLowerCase()) || 
        tx.reference.toLowerCase().includes(searchTxt.toLowerCase()) || 
        tx.description.toLowerCase().includes(searchTxt.toLowerCase())
      );
    }
  }

  filteredTxs.sort((a, b) => new Date(b.date) - new Date(a.date));

  const deleteBtnClass = `delete-${voucherType}-btn`;
  const rowClass = `${voucherType}-log-row`;
  const title = voucherType.charAt(0).toUpperCase() + voucherType.slice(1) + " Logs";

  container.innerHTML = `
    ${getSearchPanelHTML()}
    <div class="panel" style="padding: 1rem; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; height: 100%;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--text-primary);">${title}</div>
      <div class="table-responsive" style="flex-grow: 1; overflow-y: auto;">
        <table class="custom-voucher-table" style="margin-top: 0;">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher No</th>
              <th>Debit</th>
              <th style="text-align: right;">Debit Amount</th>
              <th>Credit</th>
              <th style="text-align: right;">Credit Amount</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTxs.length === 0 ? `
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No logs found.</td></tr>
            ` : filteredTxs.map(tx => getVoucherTableRowHTML(tx, deleteBtnClass, rowClass)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  bindSearchEvents(container, () => renderUnifiedLogsInline(container, txs, voucherType, formContainer, mainContainer));

  container.querySelectorAll(`.${deleteBtnClass}`).forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      if (checkAdminPassword()) {
        state.deleteTransaction(id);
        renderUnifiedLogsInline(container, state.getTransactions(), voucherType, formContainer, mainContainer);
        showUnifiedSplitVoucherModal(formContainer, null, voucherType, true, mainContainer);
      }
    });
  });

  container.querySelectorAll(`.${rowClass}`).forEach(row => {
    row.addEventListener("dblclick", () => {
      const id = row.getAttribute("data-id");
      const tx = state.getTransactions().find(t => t.id === id);
      showUnifiedSplitVoucherModal(formContainer, tx, voucherType, true, mainContainer);
    });
  });
}

export function showContraModal(container, tx = null, isInline = false, mainContainer = null) {
  const root = isInline ? container : document.getElementById("modal-container-root");
  
  const cashBankLedgers = state.getLedgers().filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS");
  const defaultFrom = cashBankLedgers.find(l => l.groupName === "BANK ACCOUNTS")?.code || "L015";
  const defaultTo = cashBankLedgers.find(l => l.groupName === "CASH-IN-HAND")?.code || "L009";

  const dateVal = tx ? tx.date : new Date().toISOString().split("T")[0];
  const refVal = tx ? tx.reference : state.generateNextVoucherNo("contra");
  const descVal = tx ? tx.description : "";
  
  let fromAccVal = tx ? (tx.entries.find(e => e.credit > 0)?.accountId) : defaultFrom;
  const fallbackCashL = state.getLedgers().find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
  const fallbackBankL = state.getLedgers().find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
  if (fromAccVal === "1010" && fallbackCashL) fromAccVal = fallbackCashL.code;
  if (fromAccVal === "1020" && fallbackBankL) fromAccVal = fallbackBankL.code;

  let toAccVal = tx ? (tx.entries.find(e => e.debit > 0)?.accountId) : defaultTo;
  if (toAccVal === "1010" && fallbackCashL) toAccVal = fallbackCashL.code;
  if (toAccVal === "1020" && fallbackBankL) toAccVal = fallbackBankL.code;

  const amountVal = tx ? (tx.entries.find(e => e.debit > 0)?.debit || 0) : "";

  const formContent = `
    <form id="contra-form" style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
      <div style="display:grid; grid-template-columns:120px 1fr; align-items:center; gap:8px;">
        <label style="font-weight:bold;">Voucher No:</label>
        <input type="text" id="contra-ref" class="form-control" style="background-color: var(--bg-tertiary); color: var(--text-muted);" value="${refVal}" readonly required>
      </div>
      <div style="display:grid; grid-template-columns:120px 1fr; align-items:center; gap:8px;">
        <label style="font-weight:bold;">Date:</label>
        <input type="date" id="contra-date" class="form-control" style="background: var(--bg-tertiary); color: var(--text-primary);" value="${dateVal}" required>
      </div>
      <div style="display:grid; grid-template-columns:120px 1fr; align-items:center; gap:8px;">
        <label style="font-weight:bold;">Source (From):</label>
        <select id="contra-from" class="form-control" style="background: var(--bg-tertiary); color: var(--text-primary);" required>
          ${cashBankLedgers.map(l => `<option value="${l.code}" ${fromAccVal === l.code ? 'selected' : ''}>${l.name}</option>`).join("")}
        </select>
      </div>
      <div style="display:grid; grid-template-columns:120px 1fr; align-items:center; gap:8px;">
        <label style="font-weight:bold;">Destination (To):</label>
        <select id="contra-to" class="form-control" style="background: var(--bg-tertiary); color: var(--text-primary);" required>
          ${cashBankLedgers.map(l => `<option value="${l.code}" ${toAccVal === l.code ? 'selected' : ''}>${l.name}</option>`).join("")}
        </select>
      </div>
      <div style="display:grid; grid-template-columns:120px 1fr; align-items:center; gap:8px;">
        <label style="font-weight:bold;">Amount (₹):</label>
        <input type="number" step="0.01" id="contra-amount" class="form-control" style="background: var(--bg-tertiary); color: var(--text-primary);" value="${amountVal}" placeholder="0.00" required>
      </div>
      <div style="display:grid; grid-template-columns:120px 1fr; align-items:center; gap:8px;">
        <label style="font-weight:bold;">Narration:</label>
        <input type="text" id="contra-desc" class="form-control" style="background: var(--bg-tertiary); color: var(--text-primary);" value="${descVal || 'Cash/Bank Transfer'}" required>
      </div>
      
      <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--border-color); padding-top:10px; margin-top:5px;">
        <button type="button" class="btn btn-secondary" id="btn-contra-cancel">${isInline ? "Clear/New" : "Cancel"}</button>
        <button type="submit" class="btn btn-primary" style="background:#1e3b8b; color:white; border:none;">Submit</button>
      </div>
    </form>
  `;

  const close = () => { root.innerHTML = ""; };

  if (isInline) {
    root.innerHTML = `
      <div class="panel" style="padding:15px; color: var(--text-primary); font-size:0.85rem; height: 100%;">
        <div style="font-weight:700; color: var(--text-primary); border-bottom: 2px solid var(--accent-color); padding-bottom: 6px;">
          <div>${tx ? "Edit Contra Voucher" : "Post Contra Voucher"}</div>
        </div>
        ${formContent}
      </div>
    `;
  } else {
    root.innerHTML = `
      <div class="modal-overlay active" id="modal-overlay" style="display:flex; justify-content:center; align-items:center; color:black; z-index:9999;">
        <div class="modal-container" style="background-color:#cbd5e1; color:#0f172a; padding:15px; font-family:var(--font-body); border:2px solid #64748b; font-size:0.85rem; width:450px;">
          <div style="background-color:#1e3b8b; color:white; padding:6px 10px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
            <div>${tx ? "Edit Contra Voucher" : "Post Contra Voucher"}</div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="contra-close-header">&times;</button>
          </div>
          ${formContent}
        </div>
      </div>
    `;
    document.getElementById("contra-close-header").addEventListener("click", close);
  }

  document.getElementById("btn-contra-cancel").addEventListener("click", () => {
    if (isInline) {
      showContraModal(container, null, true, mainContainer);
    } else {
      close();
    }
  });

  document.getElementById("contra-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fromAcc = document.getElementById("contra-from").value;
    const toAcc = document.getElementById("contra-to").value;
    const amt = parseFloat(document.getElementById("contra-amount").value) || 0;
    const ref = document.getElementById("contra-ref").value;
    const desc = document.getElementById("contra-desc").value;
    const date = document.getElementById("contra-date").value;

    if (fromAcc === toAcc) {
      alert("Source and Destination accounts must be different.");
      return;
    }
    if (amt <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    if (tx) {
      if (!checkAdminPassword()) return;
      state.deleteTransaction(tx.id);
    }

    try {
      state.addTransaction({
        date: date,
        reference: ref,
        description: desc,
        entries: [
          { accountId: fromAcc, debit: 0, credit: amt },
          { accountId: toAcc, debit: amt, credit: 0 }
        ]
      });
      alert(tx ? "Contra Voucher updated successfully." : "Contra Voucher posted successfully.");
      
      if (isInline) {
        showContraModal(container, null, true, mainContainer);
        const logsEl = document.getElementById("voucher-logs-container");
        if (logsEl) {
          renderContraLogsInline(logsEl, state.getTransactions(), container, mainContainer);
        }
      } else {
        close();
        if (mainContainer) {
          renderVouchers(mainContainer);
        } else {
          const mainContent = document.getElementById("main-content");
          if (window.location.hash.startsWith("#reports") && mainContent) {
            import("./reports.js").then(m => {
              m.renderReports(mainContent);
            });
          }
        }
      }
    } catch (err) {
      alert("Error posting contra: " + err.message);
    }
  });
}

export function showUnifiedSplitVoucherModal(container, tx, voucherType, isInline = false, mainContainer = null) {
  const root = isInline ? container : document.getElementById("modal-container-root");
  
  const ledgers = state.getLedgers();
  const contacts = state.getContacts();
  const balances = state.getAccountBalances();

  const cashBankLedgers = ledgers.filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS");
  const cashBankCodes = new Set(cashBankLedgers.map(l => l.code));
  cashBankCodes.add("1010");
  cashBankCodes.add("1020");
  const otherLedgers = ledgers.filter(l => !cashBankCodes.has(l.code));

  let journalRows = [];
  let selectedRowIndex = -1;
  let narrationVal = tx ? tx.description : "";
  let b2bExpense = false;
  let reverseCharge = "No";

  if (tx && tx.entries) {
    tx.entries.forEach(e => {
      const baseContactId = e.accountId.includes("::") ? e.accountId.split("::")[0] : e.accountId;
      const site = e.accountId.includes("::") ? e.accountId.split("::")[1] : null;

      const ledger = ledgers.find(l => l.code === baseContactId);
      let name = ledger ? ledger.name : e.accountId;
      if (!ledger) {
        const contact = contacts.find(c => c.id === baseContactId);
        if (contact) {
          name = contact.name;
        }
      }
      const finalName = site ? `${name}::${site}` : name;
      const finalSiteBranch = site || e.siteBranch || "";

      if (e.debit > 0) {
        journalRows.push({ drCr: "Dr", accountCode: e.accountId, accountName: finalName, amount: e.debit, siteBranch: finalSiteBranch });
      } else if (e.credit > 0) {
        journalRows.push({ drCr: "Cr", accountCode: e.accountId, accountName: finalName, amount: e.credit, siteBranch: finalSiteBranch });
      }
    });
  }

  const dateVal = tx ? tx.date : new Date().toISOString().split("T")[0];
  const refVal = tx ? tx.reference : state.generateNextVoucherNo(voucherType);

  let modalTitle = "Journal Entry";
  if (voucherType === "receipt") modalTitle = "Receipt Voucher Entry";
  if (voucherType === "payment") modalTitle = "Payment Voucher Entry";

  const formContent = `
    <div style="display:flex; flex-direction:column; gap:8px; color: var(--text-primary);">
      <!-- Top Metadata -->
      <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-tertiary); padding:6px; border:1px solid var(--border-color); border-radius:2px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-weight:bold; color: var(--text-secondary);">Voucher No:</label>
          <input type="text" id="jv-voucherno" class="form-control" style="width:100px; padding:2px; font-size:0.8rem; background-color: var(--bg-secondary); color: var(--text-muted);" value="${refVal}" readonly required>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-weight:bold; color: var(--text-secondary);">Date:</label>
          <input type="date" id="jv-date" class="form-control" style="width:150px; padding:2px; font-size:0.8rem; background-color: var(--bg-secondary); color: var(--text-primary);" value="${dateVal}" required>
        </div>
      </div>

      <!-- Main Journal Grid Table -->
      <div style="background-color: var(--bg-secondary); border:1px solid var(--border-color); border-radius:2px; min-height:160px; max-height:200px; overflow-y:auto;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color: var(--text-primary);">
          <thead>
            <tr style="background-color:#1e3b8b; color:white;">
              <th style="padding:6px; width:80px; border-right:1px solid var(--border-color);">Dr/Cr</th>
              <th style="padding:6px; border-right:1px solid var(--border-color);">Particulars</th>
              <th style="padding:6px; text-align:right; width:100px; border-right:1px solid var(--border-color);">Debit</th>
              <th style="padding:6px; text-align:right; width:100px;">Credit</th>
            </tr>
          </thead>
          <tbody id="jv-grid-body"></tbody>
        </table>
      </div>

      <!-- Tally Status Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; background-color: var(--bg-tertiary); padding:4px 8px; border:1px solid var(--border-color); font-size:0.75rem; color: var(--text-primary);">
        <span id="jv-status-msg" style="font-weight:bold;"></span>
        <div style="display:flex; gap:15px; font-weight:bold;">
          <div>Total Dr: <span id="jv-total-dr" style="color:blue;">₹0.00</span></div>
          <div>Total Cr: <span id="jv-total-cr" style="color:green;">₹0.00</span></div>
        </div>
      </div>

      <!-- Bottom Narration & Settings -->
      <div style="display:grid; grid-template-columns:1fr; gap:6px; background: var(--bg-tertiary); padding:8px; border:1px solid var(--border-color); border-radius:2px;">
        <div style="align-items:center; gap:8px; display: ${voucherType === 'journal' ? 'flex' : 'none'};">
          <input type="checkbox" id="jv-b2b" ${b2bExpense ? 'checked' : ''}>
          <label for="jv-b2b" style="font-weight:bold; color: var(--text-secondary);">B2B Expense</label>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-weight:bold; color: var(--text-secondary); width:80px;">Narration:</label>
          <input type="text" id="jv-narration" class="form-control" style="background-color: var(--bg-secondary); color: var(--text-primary); flex-grow:1; padding:4px;" value="${narrationVal}" placeholder="Enter Narration...">
        </div>
      </div>

      <!-- Action Buttons Ribbon -->
      <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--border-color); padding-top:8px;">
        <button type="button" class="btn btn-secondary" id="btn-jv-add" style="padding:4px 16px; font-weight:bold;">Add</button>
        <button type="button" class="btn btn-secondary" id="btn-jv-edit" style="padding:4px 16px; font-weight:bold;" disabled>Edit</button>
        <button type="button" class="btn btn-secondary" id="btn-jv-delete" style="padding:4px 16px; font-weight:bold;" disabled>Delete</button>
        <button type="button" class="btn btn-primary" id="btn-jv-submit" style="padding:4px 20px; font-weight:bold; background-color:#1e3b8b;" disabled>Submit</button>
        <button type="button" class="btn btn-secondary" id="btn-jv-close" style="padding:4px 16px; font-weight:bold;">${isInline ? "Clear" : "Close"}</button>
      </div>
    </div>

    <!-- Dynamic popup panel for Add/Edit input strip (tan/cream layout) -->
    <div id="jv-input-popup" style="display:none; position:absolute; top:35%; left:10%; right:10%; background-color:#f5eedc; border:2px solid #a89f8d; border-radius:4px; padding:15px; box-shadow:0 4px 25px rgba(0,0,0,0.5); z-index:100001;">
      <div style="display:flex; flex-direction:column; gap:10px; color:black;">
        <div style="display:grid; grid-template-columns:100px 1fr; align-items:center; gap:8px;">
          <label style="font-weight:bold; color:black;">Debit/Credit:</label>
          <select id="pop-drcr" class="form-control" style="background-color:white; color:black; width:80px; padding:2px;">
            <option value="Dr">Dr</option>
            <option value="Cr">Cr</option>
          </select>
        </div>

        <div style="display:grid; grid-template-columns:100px 1fr; align-items:center; gap:8px;">
          <label style="font-weight:bold; color:black;">Account:</label>
          <div style="display:flex; flex-direction:column; gap:2px; flex-grow:1;">
            <select id="pop-account" class="form-control" style="background-color:white; color:black; padding:2px;"></select>
            <span id="pop-bal-feedback" style="font-size:0.75rem; font-weight:bold; color:#1e40af; margin-top:2px;">Closing Balance: 0.00 Dr</span>
          </div>
        </div>

        <!-- Site/Branch Multi Dropdown -->
        <div id="pop-site-branch-row" style="display:none; grid-template-columns:100px 1fr; align-items:center; gap:8px;">
          <label id="pop-site-branch-label" style="font-weight:bold; color:black;">Site Name:</label>
          <select id="pop-site-branch" class="form-control" style="background-color:white; color:black; padding:2px;"></select>
        </div>

        <div style="display:grid; grid-template-columns:100px 1fr; align-items:center; gap:8px;">
          <label style="font-weight:bold; color:black;">Amount:</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="number" step="0.01" id="pop-amount" class="form-control" style="background-color:white; color:black; width:150px; padding:2px;" placeholder="0.00" value="0.00">
            <button type="button" id="pop-btn-ok" style="background:#cbd5e1; border:1px solid #475569; padding:4px 16px; font-weight:bold; cursor:pointer;">OK</button>
            <button type="button" id="pop-btn-cancel" style="background:#cbd5e1; border:1px solid #475569; padding:4px 16px; font-weight:bold; cursor:pointer;">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const close = () => {
    if (isInline) {
      showUnifiedSplitVoucherModal(container, null, voucherType, true, mainContainer);
    } else {
      root.innerHTML = "";
    }
  };

  if (isInline) {
    root.innerHTML = `
      <div class="panel" style="padding:15px; color: var(--text-primary); font-size:0.8rem; position:relative; height: 100%;">
        <div style="font-weight:700; border-bottom: 2px solid var(--accent-color); padding-bottom: 6px; margin-bottom: 10px; color: var(--text-primary);">
          ${modalTitle}
        </div>
        ${formContent}
      </div>
    `;
  } else {
    root.innerHTML = `
      <div class="modal-overlay active" id="modal-overlay" style="display:flex; justify-content:center; align-items:center; color:black; z-index:9999;">
        <div class="modal-container modal-lg" style="max-width:900px; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family:var(--font-body); border:2px solid #64748b; font-size:0.8rem; position:relative; z-index:10000;">
          <div style="background-color:#1e3b8b; color:white; padding:4px 10px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius:var(--border-radius-sm) var(--border-radius-sm) 0 0;">
            <div>${modalTitle}</div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="jv-close-btn-header">&times;</button>
          </div>
          ${formContent}
        </div>
      </div>
    `;
    document.getElementById("jv-close-btn-header").addEventListener("click", close);
  }

  // Get persistent element references
  const gridBody = document.getElementById("jv-grid-body");
  const statusMsg = document.getElementById("jv-status-msg");
  const totalDrSpan = document.getElementById("jv-total-dr");
  const totalCrSpan = document.getElementById("jv-total-cr");
  
  const btnEdit = document.getElementById("btn-jv-edit");
  const btnDelete = document.getElementById("btn-jv-delete");
  const btnSubmit = document.getElementById("btn-jv-submit");
  
  const popup = document.getElementById("jv-input-popup");
  const popDrCr = document.getElementById("pop-drcr");
  const popAccount = document.getElementById("pop-account");
  const popBalFeedback = document.getElementById("pop-bal-feedback");
  const popAmount = document.getElementById("pop-amount");

  document.getElementById("btn-jv-close").addEventListener("click", close);

  // Update narration, B2B, RCA values dynamically
  const narrInput = document.getElementById("jv-narration");
  narrInput.addEventListener("input", () => { narrationVal = narrInput.value; });
  const b2bInput = document.getElementById("jv-b2b");
  if (b2bInput) b2bInput.addEventListener("change", () => { b2bExpense = b2bInput.checked; });
  const rcaInput = document.getElementById("jv-rca");
  if (rcaInput) rcaInput.addEventListener("change", () => { reverseCharge = rcaInput.value; });

  const updatePopAccountOptions = () => {
    const isDr = popDrCr.value === "Dr";
    let allowedLedgers = [];
    let allowedContacts = [];
    if (voucherType === "receipt") {
      if (isDr) {
        allowedLedgers = cashBankLedgers;
      } else {
        allowedLedgers = otherLedgers;
        allowedContacts = contacts;
      }
    } else if (voucherType === "payment") {
      if (isDr) {
        allowedLedgers = otherLedgers;
        allowedContacts = contacts;
      } else {
        allowedLedgers = cashBankLedgers;
      }
    } else {
      allowedLedgers = ledgers;
      allowedContacts = contacts;
    }

    const currentVal = popAccount.value;
    const sortedLedgers = [...allowedLedgers].sort((a, b) => a.name.localeCompare(b.name));
    const sortedContacts = [...allowedContacts].sort((a, b) => a.name.localeCompare(b.name));

    popAccount.innerHTML = `
      <option value="">-- Choose Account --</option>
      ${sortedLedgers.map(l => `<option value="${l.code}">${l.name}</option>`).join("")}
      ${sortedContacts.map(c => `<option value="${c.id}">${c.name} (${c.type.toUpperCase()})</option>`).join("")}
    `;
    popAccount.value = currentVal || "";
    updatePopupBalance();
  };
  popDrCr.addEventListener("change", updatePopAccountOptions);

  function updateGrid() {
    let totalDebit = 0;
    let totalCredit = 0;
    
    journalRows.forEach(r => {
      if (r.drCr === "Dr") totalDebit += r.amount;
      else totalCredit += r.amount;
    });

    const isTally = Math.abs(totalDebit - totalCredit) < 0.009 && totalDebit > 0;
    const diff = Math.abs(totalDebit - totalCredit);

    let isValid = isTally;
    let validationErrorMsg = "";

    if (voucherType === "receipt") {
      const hasCashBankDr = journalRows.some(r => r.drCr === "Dr" && cashBankCodes.has(r.accountCode));
      if (isTally && !hasCashBankDr) {
        isValid = false;
        validationErrorMsg = "At least one Debit (Dr) account must be a Cash or Bank account.";
      }
    } else if (voucherType === "payment") {
      const hasCashBankCr = journalRows.some(r => r.drCr === "Cr" && cashBankCodes.has(r.accountCode));
      if (isTally && !hasCashBankCr) {
        isValid = false;
        validationErrorMsg = "At least one Credit (Cr) account must be a Cash or Bank account.";
      }
    }

    if (journalRows.length === 0) {
      gridBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:#64748b;">No entry lines added. Click "Add" to enter splits.</td></tr>`;
    } else {
      gridBody.innerHTML = journalRows.map((row, idx) => `
        <tr class="jv-row-item" data-index="${idx}" style="border-bottom:1px solid #cbd5e1; cursor:pointer; background-color:${selectedRowIndex === idx ? '#bae6fd' : 'white'};">
          <td style="padding:6px; font-weight:bold; border-right:1px solid #cbd5e1; color:black;">${row.drCr}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; color:black;">
            <strong>${row.accountName}</strong>${row.siteBranch ? ` <span style="color:#64748b; font-weight:bold;">(${row.siteBranch})</span>` : ''}
          </td>
          <td style="padding:6px; text-align:right; font-weight:600; border-right:1px solid #cbd5e1; color:black;">${row.drCr === 'Dr' ? '₹' + row.amount.toFixed(2) : ''}</td>
          <td style="padding:6px; text-align:right; font-weight:600; color:black;">${row.drCr === 'Cr' ? '₹' + row.amount.toFixed(2) : ''}</td>
        </tr>
      `).join("");

      gridBody.querySelectorAll(".jv-row-item").forEach(row => {
        row.addEventListener("click", () => {
          const idx = parseInt(row.getAttribute("data-index"));
          selectedRowIndex = selectedRowIndex === idx ? -1 : idx;
          updateGrid();
        });
        row.addEventListener("dblclick", () => {
          const idx = parseInt(row.getAttribute("data-index"));
          selectedRowIndex = idx;
          const rowData = journalRows[idx];
          popDrCr.value = rowData.drCr;
          updatePopAccountOptions();
          popAccount.value = rowData.accountCode;
          popAmount.value = rowData.amount;
          updatePopupBalance(rowData.siteBranch || "");
          popup.style.display = "block";
          setTimeout(() => popAccount.focus(), 50);
        });
      });
    }

    totalDrSpan.innerText = `₹${totalDebit.toFixed(2)}`;
    totalCrSpan.innerText = `₹${totalCredit.toFixed(2)}`;

    if (isValid) {
      statusMsg.style.color = "green";
      statusMsg.innerHTML = '<i class="fa-solid fa-circle-check"></i> Balanced';
      btnSubmit.removeAttribute("disabled");
    } else {
      statusMsg.style.color = "red";
      if (validationErrorMsg) {
        statusMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${validationErrorMsg}`;
      } else {
        statusMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Out of Balance by ₹${diff.toFixed(2)}`;
      }
      btnSubmit.setAttribute("disabled", "true");
    }

    if (selectedRowIndex >= 0) {
      btnEdit.removeAttribute("disabled");
      btnDelete.removeAttribute("disabled");
    } else {
      btnEdit.setAttribute("disabled", "true");
      btnDelete.setAttribute("disabled", "true");
    }
  }

  const updatePopupBalance = (preselectedSiteBranch = "") => {
    let code = popAccount.value;
    let baseContactId = code.includes("::") ? code.split("::")[0] : code;
    let siteFromCode = code.includes("::") ? code.split("::")[1] : "";

    let balanceKey = code;
    if (balances[balanceKey]) {
      const balObj = balances[balanceKey];
      popBalFeedback.innerText = `Closing Balance: ${Math.abs(balObj.balance).toFixed(2)} ${balObj.balance >= 0 ? 'Dr' : 'Cr'}`;
    } else {
      const contact = contacts.find(c => c.id === baseContactId);
      if (contact) {
        popBalFeedback.innerText = `Closing Balance: ${Math.abs(contact.balance).toFixed(2)} ${contact.balance >= 0 ? 'Dr' : 'Cr'}`;
      } else {
        popBalFeedback.innerText = "Closing Balance: 0.00 Dr";
      }
    }

    const siteBranchRow = document.getElementById("pop-site-branch-row");
    const siteBranchLabel = document.getElementById("pop-site-branch-label");
    const siteBranchSelect = document.getElementById("pop-site-branch");

    const ledger = ledgers.find(l => l.code === baseContactId);
    let contact = null;
    if (ledger) {
      contact = contacts.find(c => c.name.toLowerCase().trim() === ledger.name.toLowerCase().trim());
    } else {
      contact = contacts.find(c => c.id === baseContactId);
    }

    if (contact && contact.siteType === "multiple" && contact.sites && contact.sites.length > 0) {
      siteBranchLabel.innerText = contact.type === "customer" ? "Site Name:" : "Branch Name:";
      siteBranchSelect.innerHTML = contact.sites.map(s => `<option value="${s}">${s}</option>`).join("");
      const siteToSelect = siteFromCode || preselectedSiteBranch || contact.sites[0];
      siteBranchSelect.value = siteToSelect;
      siteBranchRow.style.display = "grid";
    } else {
      siteBranchRow.style.display = "none";
      siteBranchSelect.innerHTML = "";
    }
  };
  popAccount.addEventListener("change", () => updatePopupBalance());

  document.getElementById("btn-jv-add").addEventListener("click", () => {
    selectedRowIndex = -1;
    popDrCr.value = (voucherType === "receipt") ? "Cr" : "Dr";
    updatePopAccountOptions();
    popAccount.value = "";
    popAmount.value = "0.00";
    updatePopupBalance();
    popup.style.display = "block";
    popAccount.focus();
  });

  btnEdit.addEventListener("click", () => {
    if (selectedRowIndex >= 0) {
      const rowData = journalRows[selectedRowIndex];
      popDrCr.value = rowData.drCr;
      updatePopAccountOptions();
      popAccount.value = rowData.accountCode;
      popAmount.value = rowData.amount;
      updatePopupBalance(rowData.siteBranch || "");
      popup.style.display = "block";
      popAccount.focus();
    }
  });

  btnDelete.addEventListener("click", () => {
    if (selectedRowIndex >= 0) {
      journalRows.splice(selectedRowIndex, 1);
      selectedRowIndex = -1;
      updateGrid();
    }
  });

  document.getElementById("pop-btn-cancel").addEventListener("click", () => {
    popup.style.display = "none";
  });

  document.getElementById("pop-btn-ok").addEventListener("click", () => {
    const drCr = popDrCr.value;
    const rawCode = popAccount.value;
    const amt = parseFloat(popAmount.value) || 0;

    if (!rawCode) {
      alert("Please select an Account.");
      return;
    }
    if (amt <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    let baseContactId = rawCode.includes("::") ? rawCode.split("::")[0] : rawCode;
    let siteBranchVal = rawCode.includes("::") ? rawCode.split("::")[1] : "";

    const ledger = ledgers.find(l => l.code === baseContactId);
    let name = baseContactId;
    let contact = contacts.find(c => c.id === baseContactId);

    const siteBranchRow = document.getElementById("pop-site-branch-row");
    if (siteBranchRow.style.display !== "none") {
      siteBranchVal = document.getElementById("pop-site-branch").value;
    }

    if (ledger) {
      name = ledger.name;
    } else if (contact) {
      if (contact.siteType === "multiple" && siteBranchVal) {
        name = `${contact.name} - ${siteBranchVal}`;
      } else {
        name = contact.name;
      }
    }

    const finalCode = (contact && contact.siteType === "multiple" && siteBranchVal) ?
      `${baseContactId}::${siteBranchVal}` :
      baseContactId;

    if (selectedRowIndex >= 0) {
      journalRows[selectedRowIndex] = { drCr, accountCode: finalCode, accountName: name, amount: amt, siteBranch: siteBranchVal };
    } else {
      journalRows.push({ drCr, accountCode: finalCode, accountName: name, amount: amt, siteBranch: siteBranchVal });
    }

    popup.style.display = "none";
    selectedRowIndex = -1;
    updateGrid();

    let nextTotalDebit = 0;
    let nextTotalCredit = 0;
    journalRows.forEach(r => {
      if (r.drCr === "Dr") nextTotalDebit += r.amount;
      else nextTotalCredit += r.amount;
    });

    const diffVal = Math.abs(nextTotalDebit - nextTotalCredit);
    if (diffVal > 0.009) {
      selectedRowIndex = -1;
      popDrCr.value = nextTotalDebit > nextTotalCredit ? "Cr" : "Dr";
      updatePopAccountOptions();
      popAccount.value = "";
      popAmount.value = diffVal.toFixed(2);
      updatePopupBalance();
      popup.style.display = "block";
      setTimeout(() => popAccount.focus(), 50);
    }
  });

  popDrCr.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      popAccount.focus();
    }
  });
  popAccount.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const siteBranchRow = document.getElementById("pop-site-branch-row");
      if (siteBranchRow.style.display !== "none") {
        document.getElementById("pop-site-branch").focus();
      } else {
        popAmount.focus();
        popAmount.select();
      }
    }
  });
  const siteBranchSelect = document.getElementById("pop-site-branch");
  if (siteBranchSelect) {
    siteBranchSelect.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        popAmount.focus();
        popAmount.select();
      }
    });
  }
  popAmount.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("pop-btn-ok").click();
    }
  });

  document.getElementById("jv-voucherno").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("jv-date").focus();
    }
  });
  document.getElementById("jv-date").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("jv-narration").focus();
    }
  });
  document.getElementById("jv-narration").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!btnSubmit.disabled) {
        btnSubmit.focus();
      }
    }
  });

  popup.addEventListener("keydown", (e) => {
    if (e.key === "Insert") {
      e.preventDefault();
      if (document.getElementById("quick-ledger-modal")) return;

      const ledgerModal = document.createElement("div");
      ledgerModal.id = "quick-ledger-modal";
      ledgerModal.style.position = "absolute";
      ledgerModal.style.top = "20%";
      ledgerModal.style.left = "25%";
      ledgerModal.style.width = "480px";
      ledgerModal.style.backgroundColor = "#cbd5e1";
      ledgerModal.style.border = "2px solid #1e3b8b";
      ledgerModal.style.padding = "10px";
      ledgerModal.style.fontFamily = "sans-serif";
      ledgerModal.style.fontSize = "0.85rem";
      ledgerModal.style.color = "black";
      ledgerModal.style.boxShadow = "0 4px 30px rgba(0,0,0,0.5)";
      ledgerModal.style.zIndex = "100005";
      
      const nextLedgerNum = state.getLedgers().length + 1;
      const defaultCode = "L" + String(nextLedgerNum).padStart(3, '0');
      const groups = state.getAccountGroups();

      ledgerModal.innerHTML = `
        <div style="background-color: #1e3b8b; color: white; padding: 4px 8px; font-weight: bold; margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
          <span>NEW LEDGER</span>
          <button type="button" id="quick-ld-close-btn" style="background:none; border:none; color:white; font-size:1.1rem; cursor:pointer;">&times;</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 8px;">
            <label style="font-weight: bold; color: black;">Ledger Code:</label>
            <input type="text" id="quick-ld-code" class="form-control" style="background-color: white; color: black; padding: 2px;" value="${defaultCode}">
          </div>
          <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 8px;">
            <label style="font-weight: bold; color: black;">Ledger Name:</label>
            <input type="text" id="quick-ld-name" class="form-control" style="background-color: white; color: black; padding: 2px;">
          </div>
          <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 8px;">
            <label style="font-weight: bold; color: black;">Under:</label>
            <select id="quick-ld-group" class="form-control" style="background-color: white; color: black; padding: 2px;">
              ${groups.map(g => `<option value="${g.name}">${g.name}</option>`).join("")}
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 8px;">
            <label style="font-weight: bold; color: black;">Opening Balance:</label>
            <input type="number" step="0.01" id="quick-ld-balance" class="form-control" style="background-color: white; color: black; padding: 2px;" value="0.00">
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; border-top: 1px solid #94a3b8; padding-top: 10px;">
          <button type="button" id="quick-ld-save" style="background: #e2e8f0; border: 1px solid #475569; padding: 4px 16px; font-weight: bold; cursor: pointer; color: black;">Save</button>
          <button type="button" id="quick-ld-close" style="background: #e2e8f0; border: 1px solid #475569; padding: 4px 16px; font-weight: bold; cursor: pointer; color: black;">Close</button>
        </div>
      `;

      popup.appendChild(ledgerModal);
      document.getElementById("quick-ld-name").focus();

      const closeQuickLedger = () => {
        ledgerModal.remove();
        popAccount.focus();
      };

      document.getElementById("quick-ld-close-btn").addEventListener("click", closeQuickLedger);
      document.getElementById("quick-ld-close").addEventListener("click", closeQuickLedger);

      document.getElementById("quick-ld-save").addEventListener("click", () => {
        const code = document.getElementById("quick-ld-code").value.trim();
        const name = document.getElementById("quick-ld-name").value.trim().toUpperCase();
        const groupName = document.getElementById("quick-ld-group").value;
        const openingBalance = parseFloat(document.getElementById("quick-ld-balance").value) || 0;

        if (!code || !name) {
          alert("Please enter both Ledger Code and Name.");
          return;
        }

        try {
          const grp = groups.find(g => g.name === groupName);
          const balanceType = (grp && (grp.under === "ASSETS" || grp.under === "EXPENSE")) ? "Debit" : "Credit";

          state.addLedger({ code, name, groupName, openingBalance, balanceType });
          alert("Ledger created successfully.");

          updatePopAccountOptions();
          popAccount.value = code;
          updatePopupBalance();
          
          closeQuickLedger();
        } catch (err) {
          alert("Error: " + err.message);
        }
      });

      document.getElementById("quick-ld-code").addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          document.getElementById("quick-ld-name").focus();
        }
      });
      document.getElementById("quick-ld-name").addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          document.getElementById("quick-ld-group").focus();
        }
      });
      document.getElementById("quick-ld-group").addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          document.getElementById("quick-ld-balance").focus();
        }
      });
      document.getElementById("quick-ld-balance").addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          document.getElementById("quick-ld-save").click();
        }
      });
    }
  });

  btnSubmit.addEventListener("click", () => {
    let totalDebit = 0;
    let totalCredit = 0;
    journalRows.forEach(r => {
      if (r.drCr === "Dr") totalDebit += r.amount;
      else totalCredit += r.amount;
    });
    if (Math.abs(totalDebit - totalCredit) > 0.009 || totalDebit <= 0) return;

    if (tx) {
      if (!checkAdminPassword()) {
        return;
      }
      state.deleteTransaction(tx.id);
    }

    const entries = journalRows.map(row => ({
      accountId: row.accountCode,
      debit: row.drCr === "Dr" ? row.amount : 0,
      credit: row.drCr === "Cr" ? row.amount : 0,
      siteBranch: row.siteBranch || ""
    }));

    let saveRef = document.getElementById("jv-voucherno").value;
    let saveDesc = narrationVal;
    
    if (voucherType === "receipt") {
      if (!saveDesc) {
        const contactRow = journalRows.find(r => r.drCr === "Cr" && contacts.some(c => c.id === r.accountCode));
        if (contactRow) {
          saveDesc = `Receipt from Customer: ${contactRow.accountName} (${saveRef})`;
        } else {
          saveDesc = `Receipt Voucher`;
        }
      }
    } else if (voucherType === "payment") {
      if (!saveDesc) {
        const contactRow = journalRows.find(r => r.drCr === "Dr" && contacts.some(c => c.id === r.accountCode));
        if (contactRow) {
          saveDesc = `Payment to Supplier: ${contactRow.accountName} (${saveRef})`;
        } else {
          saveDesc = `Payment Voucher`;
        }
      }
    } else {
      if (!saveDesc) {
        saveDesc = "General Journal Voucher";
      }
    }

    try {
      state.addTransaction({
        id: tx ? tx.id : undefined,
        date: document.getElementById("jv-date").value,
        reference: saveRef,
        description: saveDesc,
        entries: entries
      });
      alert(tx ? "Voucher updated successfully." : "Voucher posted successfully.");
      
      if (isInline) {
        showUnifiedSplitVoucherModal(container, null, voucherType, true, mainContainer);
        const logsEl = document.getElementById("voucher-logs-container");
        if (logsEl) {
          renderUnifiedLogsInline(logsEl, state.getTransactions(), voucherType, container, mainContainer);
        }
      } else {
        close();
        if (mainContainer) {
          renderVouchers(mainContainer);
        } else {
          const mainContent = document.getElementById("main-content");
          if (window.location.hash.startsWith("#reports") && mainContent) {
            import("./reports.js").then(m => {
              m.renderReports(mainContent);
            });
          }
        }
      }
    } catch (err) {
      alert("Error posting voucher: " + err.message);
    }
  });

  updateGrid();
}
