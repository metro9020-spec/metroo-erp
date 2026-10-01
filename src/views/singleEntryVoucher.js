import { state } from "../state.js";
import { invalidateReportCache } from "./reports.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";

let lastSelectedBankAccountId = null;

function checkAdminPassword() {
  const pw = prompt("Enter Admin Password:");
  if (pw === "123") return true;
  alert("Incorrect Password!");
  return false;
}

/**
 * Clean, spacious Single-Entry Voucher Modal / Inline Form.
 * - Supports Option 1: "Save as Separate Vouchers (Auto-numbered per line)" or "Combined Voucher".
 * - Table contains: #, Particulars (wide), Amount (₹), Ref/Cheque/UTR No, and Delete.
 * - Automatic popup when selecting multi-site/multi-branch parties.
 */
export function showSingleEntryVoucherModal(container, tx = null, voucherType = "receipt", isInline = false, mainContainer = null, onSwitchMode = null) {
  const root = isInline ? container : document.getElementById("modal-container-root");
  if (!root) return;

  const ledgers = state.getLedgers() || [];
  const contacts = state.getContacts() || [];
  
  let balancesMap = null;
  const getBalancesMap = () => {
    if (!balancesMap) {
      balancesMap = state.getAccountBalances ? state.getAccountBalances() : {};
    }
    return balancesMap;
  };

  // Get Cash & Bank ledgers for the header account
  const cashBankLedgers = ledgers.filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS");
  const cashBankCodes = new Set(cashBankLedgers.map(l => String(l.code)));
  cashBankCodes.add("1010");
  cashBankCodes.add("1020");

  // Determine initial Header Account (Bank or Cash)
  let initialHeaderAcc = "";
  if (tx && tx.entries) {
    if (voucherType === "receipt") {
      const drBank = tx.entries.find(e => (cashBankCodes.has(String(e.accountId)) || (ledgers.find(l => l.code === e.accountId && (l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS")))) && e.debit > 0);
      if (drBank) initialHeaderAcc = drBank.accountId;
    } else {
      const crBank = tx.entries.find(e => (cashBankCodes.has(String(e.accountId)) || (ledgers.find(l => l.code === e.accountId && (l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS")))) && e.credit > 0);
      if (crBank) initialHeaderAcc = crBank.accountId;
    }
  }

  if (!initialHeaderAcc) {
    if (lastSelectedBankAccountId && cashBankLedgers.some(l => l.code === lastSelectedBankAccountId)) {
      initialHeaderAcc = lastSelectedBankAccountId;
    } else {
      const firstBank = cashBankLedgers.find(l => l.groupName === "BANK ACCOUNTS") || cashBankLedgers[0];
      initialHeaderAcc = firstBank ? firstBank.code : "1020";
    }
  }

  // Determine initial Particulars Rows
  let rows = [];
  if (tx && tx.entries) {
    const targetEntries = voucherType === "receipt" 
      ? tx.entries.filter(e => e.credit > 0 && String(e.accountId) !== String(initialHeaderAcc))
      : tx.entries.filter(e => e.debit > 0 && String(e.accountId) !== String(initialHeaderAcc));

    targetEntries.forEach(e => {
      const baseCode = e.accountId.includes("::") ? e.accountId.split("::")[0] : e.accountId;
      const site = e.accountId.includes("::") ? e.accountId.split("::")[1] : (e.siteBranch || "");
      const ledger = ledgers.find(l => String(l.code) === String(baseCode));
      const contact = contacts.find(c => String(c.id) === String(baseCode) || String(c.ledgerCode) === String(baseCode) || String(c.code) === String(baseCode));
      const name = ledger ? ledger.name : (contact ? contact.name : baseCode);
      const amt = (voucherType === "receipt" ? e.credit : e.debit) || 0;

      rows.push({
        id: "row_" + Math.random().toString(36).substring(2, 9),
        accountCode: e.accountId,
        accountName: name,
        siteBranch: site,
        amount: amt,
        refNo: e.instrumentNo || "",
        narration: e.narration || ""
      });
    });
  }

  if (rows.length === 0) {
    rows.push({
      id: "row_" + Math.random().toString(36).substring(2, 9),
      accountCode: "",
      accountName: "",
      siteBranch: "",
      amount: 0,
      refNo: "",
      narration: ""
    });
  }

  const dateVal = tx ? tx.date : (state.getLoginDate() || new Date().toISOString().split("T")[0]);
  const refVal = tx ? tx.reference : state.generateNextVoucherNo(voucherType);
  let masterNarrationVal = tx ? (tx.description || "") : "";
  const savedPostMode = localStorage.getItem("erp_voucher_posting_mode") || "separate";

  const isReceipt = voucherType === "receipt";
  const titleText = isReceipt ? "Receipt Voucher (Single Entry)" : "Payment Voucher (Single Entry)";
  const modeBadgeText = isReceipt ? "Bank / Cash Inflow" : "Bank / Cash Outflow";
  const headerAccLabel = isReceipt ? "Account (Received In):" : "Account (Paid From):";
  const particularsHeaderLabel = isReceipt ? "Particulars (Received From)" : "Particulars (Paid To)";

  const formatBalanceText = (accCode) => {
    if (!accCode) return "—";
    const balances = getBalancesMap();
    const baseCode = accCode.includes("::") ? accCode.split("::")[0] : accCode;

    if (balances && balances[accCode]) {
      const b = balances[accCode];
      return `\u20B9${Math.abs(b.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${b.balance >= 0 ? "Dr" : "Cr"}`;
    }
    if (balances && balances[baseCode]) {
      const b = balances[baseCode];
      return `\u20B9${Math.abs(b.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${b.balance >= 0 ? "Dr" : "Cr"}`;
    }
    const contact = contacts.find(c => String(c.id) === String(baseCode) || String(c.ledgerCode) === String(baseCode) || String(c.code) === String(baseCode));
    if (contact) {
      const bal = contact.balance || 0;
      return `\u20B9${Math.abs(bal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${bal >= 0 ? "Dr" : "Cr"}`;
    }
    const ledger = ledgers.find(l => String(l.code) === String(baseCode));
    if (ledger) {
      const bal = parseFloat(ledger.openingBalance) || 0;
      return `\u20B9${Math.abs(bal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${bal >= 0 ? "Dr" : "Cr"}`;
    }
    return "\u20B90.00";
  };

  const formContent = `
    <div style="display:flex; flex-direction:column; gap:10px; color: var(--text-primary); font-family:var(--font-body); width:100%;">
      
      <!-- Top Title Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-tertiary); padding:6px 12px; border:1px solid var(--border-color); border-radius:4px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:800; font-size:1rem; color: ${isReceipt ? '#10b981' : '#ef4444'}; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid ${isReceipt ? 'fa-arrow-down-long' : 'fa-arrow-up-long'}"></i>
            ${titleText}
          </span>
          <span style="font-size:0.72rem; font-weight:700; background:${isReceipt ? '#dcfce7' : '#fee2e2'}; color:${isReceipt ? '#166534' : '#991b1b'}; padding:2px 8px; border-radius:10px; border:1px solid ${isReceipt ? '#86efac' : '#fca5a5'};">
            ⚡ ${modeBadgeText}
          </span>
        </div>

        <div>
          <button type="button" class="btn btn-secondary" id="btn-switch-voucher-mode" style="padding:3px 10px; font-size:0.75rem; font-weight:700; background:#ffffff; color:#0f172a; border:1px solid #94a3b8; display:flex; align-items:center; gap:5px; cursor:pointer;" title="Switch to Double-Entry (Split Dr/Cr) Mode (Ctrl+H)">
            <i class="fa-solid fa-arrows-split-up-and-left" style="color:#0284c7;"></i> Switch to Split Mode
          </button>
        </div>
      </div>

      <!-- Header Information: Voucher No, Date & Bank Account -->
      <div style="display:grid; grid-template-columns: 130px 160px 1fr; gap:12px; align-items:flex-end; background: var(--bg-secondary); padding:10px 12px; border:1px solid var(--border-color); border-radius:4px;">
        <div>
          <label style="font-weight:700; font-size:0.75rem; color: var(--text-secondary); display:block; margin-bottom:3px;">Voucher No</label>
          <input type="text" id="se-voucherno" class="form-control" style="height:28px; font-size:0.82rem; font-weight:bold; background-color: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-color);" value="${refVal}" readonly required>
        </div>

        <div>
          <label style="font-weight:700; font-size:0.75rem; color: var(--text-secondary); display:block; margin-bottom:3px;">Date</label>
          ${renderTallyDatePickerHtml({ id: "se-date", value: dateVal, style: "height:28px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px; background:white;", width: "100%" })}
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <label style="font-weight:700; font-size:0.75rem; color: #1e3b8b;">${headerAccLabel}</label>
            <span id="se-header-balance-badge" style="font-size:0.72rem; font-weight:bold; color:#1e40af; background:#e0f2fe; padding:1px 6px; border-radius:3px; border:1px solid #bae6fd;">
              Closing Bal: ${formatBalanceText(initialHeaderAcc)}
            </span>
          </div>
          <select id="se-header-account" class="form-control" style="height:28px; padding:2px 8px; font-size:0.82rem; font-weight:bold; background:white; color:#0f172a; border:1.5px solid #1e3b8b; width:100%;">
            ${cashBankLedgers.map(l => `<option value="${l.code}" ${String(initialHeaderAcc) === String(l.code) ? 'selected' : ''}>${l.name} (${l.groupName})</option>`).join("")}
          </select>
        </div>
      </div>

      <!-- Table-Based Particulars Grid (Extra Wide Particulars Column) -->
      <div style="border:1px solid var(--border-color); border-radius:4px; overflow:hidden; background:white; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:0.8rem;">
          <thead>
            <tr style="background-color:#1e3b8b; color:white;">
              <th style="width:36px; padding:6px 4px; text-align:center; font-weight:700; border-right:1px solid #2d4ea3;">#</th>
              <th style="padding:6px 10px; text-align:left; font-weight:700; border-right:1px solid #2d4ea3;">${particularsHeaderLabel}</th>
              <th style="width:140px; padding:6px 8px; text-align:right; font-weight:700; border-right:1px solid #2d4ea3;">Amount (₹)</th>
              <th style="width:180px; padding:6px 8px; text-align:left; font-weight:700; border-right:1px solid #2d4ea3;">Ref / Cheque / UTR No.</th>
              <th style="width:36px; padding:6px 4px; text-align:center;"></th>
            </tr>
          </thead>
          <tbody id="se-table-tbody">
            <!-- Dynamic Rows -->
          </tbody>
        </table>

        <!-- Table Sub-Bar (Add Line + Option 1 Posting Mode Toggle + Total) -->
        <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-tertiary); padding:6px 12px; border-top:1px solid var(--border-color); flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <button type="button" class="btn btn-secondary" id="btn-se-add-row" style="padding:3px 12px; font-size:0.75rem; font-weight:700; display:flex; align-items:center; gap:5px; background:white; border:1px solid #94a3b8; color:#0f172a; cursor:pointer;">
              <i class="fa-solid fa-plus" style="color:#10b981;"></i> Add Line (Enter / Insert)
            </button>

            <!-- Option 1: Save Mode Selector -->
            <div style="display:flex; align-items:center; gap:10px; background:white; padding:3px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.75rem;">
              <span style="font-weight:700; color:#1e3b8b;">Posting Mode:</span>
              <label style="display:flex; align-items:center; gap:4px; font-weight:700; cursor:pointer; color:#0f172a; margin:0;" title="Creates an individual voucher for each row with unique sequential voucher numbers">
                <input type="radio" name="se-post-mode" value="separate" ${savedPostMode !== 'combined' ? 'checked' : ''}>
                ⚡ Separate Vouchers <span style="font-weight:normal; color:#64748b; font-size:0.7rem;">(Auto-numbered)</span>
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-weight:700; cursor:pointer; color:#0f172a; margin:0;" title="Creates 1 combined voucher containing all rows">
                <input type="radio" name="se-post-mode" value="combined" ${savedPostMode === 'combined' ? 'checked' : ''}>
                Combined <span style="font-weight:normal; color:#64748b; font-size:0.7rem;">(1 VNo)</span>
              </label>
            </div>
          </div>
          
          <div style="display:flex; align-items:center; gap:10px; font-size:0.85rem; font-weight:800;">
            <span style="color:var(--text-secondary);">Total Amount:</span>
            <span id="se-total-amount-display" style="font-size:1.05rem; color:${isReceipt ? '#15803d' : '#b91c1c'}; background:white; padding:2px 10px; border:1.5px solid ${isReceipt ? '#86efac' : '#fca5a5'}; border-radius:4px; min-width:110px; text-align:right;">
              \u20B90.00
            </span>
          </div>
        </div>
      </div>

      <!-- Master Narration & Action Footer -->
      <div style="display:flex; flex-direction:column; gap:8px; background: var(--bg-tertiary); padding:8px 12px; border:1px solid var(--border-color); border-radius:4px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-weight:700; font-size:0.8rem; color: var(--text-secondary); width:80px;">Narration:</label>
          <input type="text" id="se-master-narration" class="form-control" style="background-color: white; color: black; flex-grow:1; height:28px; padding:2px 8px; font-size:0.82rem; border:1px solid #94a3b8;" value="${masterNarrationVal}" placeholder="Enter voucher remarks or bank statement description...">
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:8px; margin-top:2px;">
          <div style="font-size:0.75rem; color:#64748b; font-style:italic;">
            <i class="fa-solid fa-keyboard"></i> <strong>Enter</strong>: Move next &nbsp;|&nbsp; <strong>Insert</strong>: New Ledger &nbsp;|&nbsp; <strong>Ctrl+Enter</strong>: Save
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-secondary" id="btn-se-reset" style="padding:5px 14px; font-weight:700; font-size:0.8rem; background:#f1f5f9; color:#0f172a; border:1px solid #94a3b8; cursor:pointer;">
              <i class="fa-solid fa-rotate-left"></i> ${isInline ? "New" : "Cancel"}
            </button>
            <button type="button" class="btn btn-primary" id="btn-se-save" style="padding:5px 22px; font-weight:800; font-size:0.85rem; background:#1e3b8b; color:white; border:none; border-radius:4px; display:flex; align-items:center; gap:6px; cursor:pointer;">
              <i class="fa-solid fa-check"></i> ${tx ? "Update Voucher" : "Save Voucher"}
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  const close = () => {
    if (isInline) {
      showSingleEntryVoucherModal(container, null, voucherType, true, mainContainer, onSwitchMode);
    } else {
      root.innerHTML = "";
    }
  };

  if (isInline) {
    root.innerHTML = `
      <div class="panel no-scrollbar" style="padding:10px; color: var(--text-primary); font-size:0.8rem; position:relative; box-sizing:border-box; height:fit-content; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-secondary); box-shadow:var(--shadow-sm);">
        ${formContent}
      </div>
    `;
  } else {
    root.innerHTML = `
      <div class="modal-overlay active" id="modal-overlay" style="display:flex; justify-content:center; align-items:center; color:black; z-index:9999;">
        <div class="modal-container modal-lg" style="max-width:1050px; width:94%; background-color:#cbd5e1; color:#0f172a; padding:12px; font-family:var(--font-body); border:2px solid #1e3b8b; font-size:0.8rem; position:relative; z-index:10000; border-radius:6px; box-shadow:0 10px 40px rgba(0,0,0,0.45);">
          <div style="background-color:#1e3b8b; color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius:4px 4px 0 0; margin-bottom:10px;">
            <div>${titleText}</div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="se-close-btn-header">&times;</button>
          </div>
          ${formContent}
        </div>
      </div>
    `;
    document.getElementById("se-close-btn-header")?.addEventListener("click", close);
  }

  initTallyDatePickers(root);

  // References
  const headerAccSelect = document.getElementById("se-header-account");
  const headerBalBadge = document.getElementById("se-header-balance-badge");
  const tbodyEl = document.getElementById("se-table-tbody");
  const totalAmountDisplay = document.getElementById("se-total-amount-display");
  const masterNarrationInput = document.getElementById("se-master-narration");
  const btnAddRow = document.getElementById("btn-se-add-row");
  const btnSave = document.getElementById("btn-se-save");
  const btnReset = document.getElementById("btn-se-reset");
  const btnSwitchMode = document.getElementById("btn-switch-voucher-mode");

  // Save posting mode preference when changed
  root.querySelectorAll('input[name="se-post-mode"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      localStorage.setItem("erp_voucher_posting_mode", e.target.value);
    });
  });

  // Switch to Double Entry / Split Mode handler
  btnSwitchMode?.addEventListener("click", () => {
    localStorage.setItem("erp_voucher_entry_mode", "double");
    if (typeof onSwitchMode === "function") {
      onSwitchMode();
    }
  });

  // Header Account change
  headerAccSelect?.addEventListener("change", (e) => {
    lastSelectedBankAccountId = e.target.value;
    if (headerBalBadge) {
      headerBalBadge.textContent = `Closing Bal: ${formatBalanceText(e.target.value)}`;
    }
  });

  // Build List of Available Party Accounts
  const getPartyAccounts = () => {
    const balances = getBalancesMap();
    const seenNames = new Set();
    const seenCodes = new Set();

    const contactItems = contacts.map(c => {
      const codeVal = String(c.id || c.ledgerCode || c.code || "");
      const normName = String(c.name || "").trim().toUpperCase();
      if (normName) seenNames.add(normName);
      if (codeVal) seenCodes.add(codeVal);

      const phoneStr = (c.mobile || c.phone) ? ` • 📞 ${c.mobile || c.phone}` : "";
      const gstinStr = c.gstin ? ` • GSTIN: ${c.gstin}` : "";

      return {
        code: codeVal,
        name: c.name || "",
        typeLabel: (c.type || "PARTY").toUpperCase(),
        subInfo: `${codeVal} • ${(c.type || 'PARTY').toUpperCase()}${phoneStr}${gstinStr}`,
        balance: c.balance || 0,
        isContact: true,
        contact: c
      };
    });

    const ledgerItems = ledgers
      .filter(l => {
        const codeVal = String(l.code || "");
        const normName = String(l.name || "").trim().toUpperCase();
        if (cashBankCodes.has(codeVal) || l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS") return false;
        if (seenCodes.has(codeVal) || seenNames.has(normName)) return false;
        return true;
      })
      .map(l => {
        const codeVal = String(l.code || "");
        const balObj = balances ? (balances[codeVal] || balances[l.code]) : null;
        const balVal = balObj ? balObj.balance : (l.openingBalance || 0);
        return {
          code: codeVal,
          name: l.name || "",
          typeLabel: l.groupName || "LEDGER",
          subInfo: `${codeVal} • ${l.groupName || 'Ledger'}`,
          balance: balVal,
          isContact: false
        };
      });

    return [...contactItems, ...ledgerItems].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  };

  const computeTotal = () => {
    let sum = 0;
    rows.forEach(r => {
      sum += (parseFloat(r.amount) || 0);
    });
    if (totalAmountDisplay) {
      totalAmountDisplay.innerText = `\u20B9${sum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return sum;
  };

  const focusRowAmount = (rowId) => {
    setTimeout(() => {
      const targetRow = tbodyEl.querySelector(`.se-row-item[data-row-id="${rowId}"]`);
      if (targetRow) {
        const amtInp = targetRow.querySelector(".se-amount-input");
        if (amtInp) {
          amtInp.focus();
          amtInp.select();
        }
      }
    }, 50);
  };

  // Render Table Rows Function
  const renderRows = () => {
    if (!tbodyEl) return;

    tbodyEl.innerHTML = rows.map((row, idx) => {
      const baseCode = row.accountCode.includes("::") ? row.accountCode.split("::")[0] : row.accountCode;
      const contact = contacts.find(c => String(c.id) === String(baseCode) || String(c.ledgerCode) === String(baseCode) || String(c.code) === String(baseCode));
      const hasSites = contact && contact.siteType === "multiple" && Array.isArray(contact.sites) && contact.sites.length > 0;

      return `
        <tr class="se-row-item" data-row-id="${row.id}" style="border-bottom:1px solid #e2e8f0; background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <!-- # Index -->
          <td style="padding:4px; text-align:center; font-weight:bold; font-size:0.75rem; color:#64748b; border-right:1px solid #e2e8f0;">
            ${idx + 1}
          </td>

          <!-- Particulars Searchable Combobox -->
          <td style="padding:4px 6px; border-right:1px solid #e2e8f0; position:relative;">
            <div style="display:flex; align-items:center; gap:6px; width:100%;">
              <div style="position:relative; flex:1;" class="se-acc-combobox-wrapper">
                <input type="text" class="form-control se-acc-search-input" data-row-id="${row.id}" autocomplete="off" spellcheck="false" placeholder="Type or select Party / Ledger..." style="background-color:white; color:black; padding:3px 20px 3px 6px; font-size:0.8rem; font-weight:600; width:100%; border:1px solid #94a3b8; height:26px; box-sizing:border-box;" value="${row.accountName || ''}">
                <span class="se-acc-toggle" data-row-id="${row.id}" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); cursor:pointer; color:#64748b; font-size:0.68rem; user-select:none;">▼</span>
                <input type="hidden" class="se-acc-code-hidden" data-row-id="${row.id}" value="${row.accountCode || ''}">
                <div class="se-acc-dropdown" data-row-id="${row.id}" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:220px; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.3); z-index:100010; border-radius:0 0 4px 4px; overflow-y:auto; margin-top:1px;">
                  <div class="se-acc-list" data-row-id="${row.id}"></div>
                </div>
              </div>

              ${(hasSites && row.siteBranch) ? `
                <span class="se-site-badge" data-row-id="${row.id}" style="font-size:0.72rem; font-weight:700; color:#0369a1; background:#e0f2fe; border:1px solid #bae6fd; padding:2px 8px; border-radius:4px; white-space:nowrap; cursor:pointer;" title="Click to change Site/Branch">
                  📍 ${row.siteBranch} <i class="fa-solid fa-pen" style="font-size:0.6rem; margin-left:3px;"></i>
                </span>
              ` : ''}
            </div>
          </td>

          <!-- Amount (₹) Input -->
          <td style="padding:4px 6px; border-right:1px solid #e2e8f0;">
            <input type="number" step="0.01" class="form-control se-amount-input" data-row-id="${row.id}" style="height:26px; padding:2px 6px; font-size:0.82rem; font-weight:bold; text-align:right; background:white; color:black; border:1.5px solid ${isReceipt ? '#10b981' : '#ef4444'}; width:100%; box-sizing:border-box;" placeholder="0.00" value="${row.amount > 0 ? row.amount : ''}">
          </td>

          <!-- Ref No / Line Narration -->
          <td style="padding:4px 6px; border-right:1px solid #e2e8f0;">
            <input type="text" class="form-control se-ref-input" data-row-id="${row.id}" style="height:26px; padding:2px 6px; font-size:0.75rem; background:white; color:black; border:1px solid #cbd5e1; width:100%; box-sizing:border-box;" placeholder="UTR/Cheque/Remarks" value="${row.refNo || row.narration || ''}">
          </td>

          <!-- Delete Row Button -->
          <td style="padding:4px; text-align:center;">
            <button type="button" class="btn btn-danger se-btn-delete-row" data-row-id="${row.id}" style="height:22px; width:22px; padding:0; background:#ef4444; color:white; border:none; border-radius:3px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;" title="Delete Line" ${rows.length === 1 ? 'disabled' : ''}>
              <i class="fa-solid fa-trash-can" style="font-size:0.65rem;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    bindRowEvents();
    computeTotal();
  };

  // Bind Autocomplete and Row Event Listeners
  const bindRowEvents = () => {
    const allPartyAccounts = getPartyAccounts();

    rows.forEach(row => {
      const rowItem = tbodyEl.querySelector(`.se-row-item[data-row-id="${row.id}"]`);
      if (!rowItem) return;

      const searchInput = rowItem.querySelector(".se-acc-search-input");
      const codeHidden = rowItem.querySelector(".se-acc-code-hidden");
      const dropdownEl = rowItem.querySelector(".se-acc-dropdown");
      const listEl = rowItem.querySelector(".se-acc-list");
      const toggleBtn = rowItem.querySelector(".se-acc-toggle");
      const siteBadge = rowItem.querySelector(".se-site-badge");
      const amountInput = rowItem.querySelector(".se-amount-input");
      const refInput = rowItem.querySelector(".se-ref-input");
      const delBtn = rowItem.querySelector(".se-btn-delete-row");

      let filteredAccounts = [];
      let activeIndex = 0;

      const renderDropdown = (query = "") => {
        const q = (query || "").trim().toLowerCase();
        if (!q) {
          filteredAccounts = allPartyAccounts;
        } else {
          filteredAccounts = allPartyAccounts.filter(acc => 
            (acc.name || "").toLowerCase().includes(q) ||
            (acc.code || "").toLowerCase().includes(q) ||
            (acc.subInfo || "").toLowerCase().includes(q)
          );
        }

        if (filteredAccounts.length === 0) {
          listEl.innerHTML = `<div style="padding:6px 8px; font-size:0.72rem; color:#64748b; font-style:italic;">No matching accounts found</div>`;
          return;
        }

        if (activeIndex < 0 || activeIndex >= filteredAccounts.length) activeIndex = 0;

        listEl.innerHTML = filteredAccounts.map((acc, idx) => {
          const isSelected = idx === activeIndex;
          const balStr = `Bal: \u20B9${Math.abs(acc.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${(acc.balance || 0) >= 0 ? 'Dr' : 'Cr'}`;
          const balColor = (acc.balance || 0) >= 0 ? "#b45309" : "#15803d";

          return `
            <div class="se-acc-item" data-idx="${idx}" style="padding:5px 8px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background-color:${isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')}; color:${isSelected ? '#ffffff' : '#0f172a'};">
              <div style="display:flex; flex-direction:column; gap:1px; flex:1; min-width:0;">
                <strong style="font-size:0.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${acc.name}</strong>
                <span style="font-size:0.65rem; color:${isSelected ? '#e0f2fe' : '#64748b'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${acc.subInfo}</span>
              </div>
              <span style="font-size:0.7rem; font-weight:bold; color:${isSelected ? '#ffffff' : balColor}; margin-left:6px; white-space:nowrap; background:${isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9'}; padding:1px 5px; border-radius:3px;">${balStr}</span>
            </div>
          `;
        }).join("");

        listEl.querySelectorAll(".se-acc-item").forEach(item => {
          item.addEventListener("mousemove", () => {
            const idx = parseInt(item.getAttribute("data-idx"));
            if (activeIndex !== idx) {
              activeIndex = idx;
              updateHighlight();
            }
          });
          item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const idx = parseInt(item.getAttribute("data-idx"));
            if (!isNaN(idx) && filteredAccounts[idx]) {
              selectAccount(filteredAccounts[idx]);
            }
          });
        });
      };

      const updateHighlight = () => {
        const items = listEl.querySelectorAll(".se-acc-item");
        items.forEach((item, idx) => {
          const isSelected = idx === activeIndex;
          const acc = filteredAccounts[idx];
          const balColor = acc && (acc.balance || 0) >= 0 ? "#b45309" : "#15803d";
          item.style.backgroundColor = isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');
          item.style.color = isSelected ? '#ffffff' : '#0f172a';
          const sub = item.querySelector("span");
          if (sub) sub.style.color = isSelected ? '#e0f2fe' : '#64748b';
          const badge = item.querySelectorAll("span")[1];
          if (badge) {
            badge.style.color = isSelected ? '#ffffff' : balColor;
            badge.style.background = isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9';
          }
        });
        if (items[activeIndex]) {
          items[activeIndex].scrollIntoView({ block: "nearest" });
        }
      };

      const selectAccount = (acc) => {
        row.accountCode = acc.code;
        row.accountName = acc.name;
        codeHidden.value = acc.code;
        searchInput.value = acc.name;
        dropdownEl.style.display = "none";

        const contact = acc.isContact ? acc.contact : contacts.find(c => String(c.id) === String(acc.code) || String(c.ledgerCode) === String(acc.code));
        
        // Multi-Site / Branch Popup check
        if (contact && contact.siteType === "multiple" && Array.isArray(contact.sites) && contact.sites.length > 0) {
          showSiteSelectionModal(root, contact, row.siteBranch || contact.sites[0], (selectedSite) => {
            row.siteBranch = selectedSite;
            row.accountCode = selectedSite ? `${acc.code}::${selectedSite}` : acc.code;
            renderRows();
            focusRowAmount(row.id);
          });
        } else {
          row.siteBranch = "";
          row.accountCode = acc.code;
          renderRows();
          focusRowAmount(row.id);
        }
      };

      // Click on Site Badge to re-open site selection popup
      siteBadge?.addEventListener("click", () => {
        const baseCode = row.accountCode.includes("::") ? row.accountCode.split("::")[0] : row.accountCode;
        const contact = contacts.find(c => String(c.id) === String(baseCode) || String(c.ledgerCode) === String(baseCode));
        if (contact && contact.siteType === "multiple" && Array.isArray(contact.sites) && contact.sites.length > 0) {
          showSiteSelectionModal(root, contact, row.siteBranch || contact.sites[0], (selectedSite) => {
            row.siteBranch = selectedSite;
            row.accountCode = selectedSite ? `${baseCode}::${selectedSite}` : baseCode;
            renderRows();
            focusRowAmount(row.id);
          });
        }
      });

      searchInput?.addEventListener("focus", () => {
        activeIndex = 0;
        renderDropdown(searchInput.value);
        dropdownEl.style.display = "block";
        searchInput.select();
      });

      searchInput?.addEventListener("input", () => {
        activeIndex = 0;
        renderDropdown(searchInput.value);
        dropdownEl.style.display = "block";
        const typed = searchInput.value.trim().toLowerCase();
        const exact = allPartyAccounts.find(a => a.name.toLowerCase() === typed || String(a.code).toLowerCase() === typed);
        if (exact) {
          row.accountCode = exact.code;
          row.accountName = exact.name;
          codeHidden.value = exact.code;
        } else {
          row.accountCode = "";
          row.accountName = searchInput.value;
          codeHidden.value = "";
        }
      });

      toggleBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dropdownEl.style.display === "block") {
          dropdownEl.style.display = "none";
        } else {
          searchInput.focus();
          renderDropdown(searchInput.value);
          dropdownEl.style.display = "block";
        }
      });

      searchInput?.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (dropdownEl.style.display !== "block") {
            renderDropdown(searchInput.value);
            dropdownEl.style.display = "block";
            return;
          }
          if (filteredAccounts.length > 0) {
            activeIndex = (activeIndex + 1) % filteredAccounts.length;
            updateHighlight();
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (dropdownEl.style.display !== "block") {
            renderDropdown(searchInput.value);
            dropdownEl.style.display = "block";
            return;
          }
          if (filteredAccounts.length > 0) {
            activeIndex = (activeIndex - 1 + filteredAccounts.length) % filteredAccounts.length;
            updateHighlight();
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (dropdownEl.style.display === "block" && filteredAccounts.length > 0 && activeIndex >= 0) {
            selectAccount(filteredAccounts[activeIndex]);
          } else if (row.accountCode) {
            focusRowAmount(row.id);
          } else {
            const query = searchInput.value.trim().toLowerCase();
            const matched = allPartyAccounts.find(a => a.name.toLowerCase() === query || String(a.code).toLowerCase() === query) ||
                            allPartyAccounts.find(a => a.name.toLowerCase().startsWith(query)) ||
                            allPartyAccounts.find(a => a.name.toLowerCase().includes(query));
            if (matched) {
              selectAccount(matched);
            } else {
              alert("Party/Ledger not found. Press Insert to create a new Ledger or select from list.");
            }
          }
        } else if (e.key === "Escape") {
          if (dropdownEl.style.display === "block") {
            e.preventDefault();
            e.stopPropagation();
            dropdownEl.style.display = "none";
          }
        }
      });

      // Quick Ledger on Insert key
      searchInput?.addEventListener("keydown", (e) => {
        if (e.key === "Insert") {
          e.preventDefault();
          openQuickLedgerModal(root, (newLedger) => {
            selectAccount({
              code: newLedger.code,
              name: newLedger.name,
              typeLabel: newLedger.groupName || "LEDGER",
              subInfo: `${newLedger.code} • ${newLedger.groupName}`,
              balance: newLedger.openingBalance || 0,
              isContact: false
            });
          });
        }
      });

      amountInput?.addEventListener("input", (e) => {
        row.amount = parseFloat(e.target.value) || 0;
        computeTotal();
      });

      amountInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (refInput) { refInput.focus(); refInput.select(); }
        }
      });

      refInput?.addEventListener("input", (e) => {
        row.refNo = e.target.value;
        row.narration = e.target.value;
      });

      refInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const curIndex = rows.findIndex(r => r.id === row.id);
          if (curIndex === rows.length - 1) {
            // Last row -> Add new line automatically for fast typing
            addNewRow(true);
          } else {
            const nextRow = tbodyEl.querySelectorAll(".se-acc-search-input")[curIndex + 1];
            if (nextRow) nextRow.focus();
          }
        }
      });

      delBtn?.addEventListener("click", () => {
        if (rows.length > 1) {
          const rIndex = rows.findIndex(r => r.id === row.id);
          if (rIndex >= 0) {
            rows.splice(rIndex, 1);
            renderRows();
          }
        }
      });
    });
  };

  const addNewRow = (focusNew = true) => {
    const newId = "row_" + Math.random().toString(36).substring(2, 9);
    rows.push({
      id: newId,
      accountCode: "",
      accountName: "",
      siteBranch: "",
      amount: 0,
      refNo: "",
      narration: ""
    });
    renderRows();

    if (focusNew) {
      setTimeout(() => {
        const lastSearchInput = tbodyEl.querySelector(`.se-row-item[data-row-id="${newId}"] .se-acc-search-input`);
        if (lastSearchInput) {
          lastSearchInput.focus();
          lastSearchInput.select();
        }
      }, 50);
    }
  };

  btnAddRow?.addEventListener("click", () => addNewRow(true));

  // Global Outside Click to close dropdowns
  const handleOutsideClick = (e) => {
    if (!e.target.closest(".se-acc-combobox-wrapper")) {
      document.querySelectorAll(".se-acc-dropdown").forEach(dd => dd.style.display = "none");
    }
  };
  document.addEventListener("click", handleOutsideClick);

  // Master Narration
  masterNarrationInput?.addEventListener("input", (e) => {
    masterNarrationVal = e.target.value;
  });

  // Reset / New button
  btnReset?.addEventListener("click", () => {
    if (isInline) {
      showSingleEntryVoucherModal(container, null, voucherType, true, mainContainer, onSwitchMode);
    } else {
      close();
    }
  });

  // Save / Post Voucher
  let isSubmitting = false;
  const handleSaveVoucher = async () => {
    if (isSubmitting) return;

    const dateInput = root.querySelector("#se-date") || document.getElementById("se-date");
    const dateValFinal = dateInput ? dateInput.value : (state.getLoginDate() || new Date().toISOString().split("T")[0]);

    const fyCheck = state.isPreviousFyLocked(dateValFinal);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return;
    }

    const headerAcc = headerAccSelect ? headerAccSelect.value : initialHeaderAcc;
    if (!headerAcc) {
      alert("Please select a Bank or Cash account in the header.");
      headerAccSelect?.focus();
      return;
    }

    // Validate rows
    const validRows = rows.filter(r => r.accountCode && parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      alert("Please enter at least one valid Party/Ledger with an Amount greater than zero.");
      const firstSearch = tbodyEl.querySelector(".se-acc-search-input");
      if (firstSearch) firstSearch.focus();
      return;
    }

    if (tx) {
      if (!checkAdminPassword()) {
        return;
      }
    }

    const postMode = root.querySelector('input[name="se-post-mode"]:checked')?.value || "separate";

    isSubmitting = true;
    btnSave.disabled = true;
    btnSave.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    try {
      if (tx) {
        const fyCheckOld = state.isPreviousFyLocked(tx.date);
        if (fyCheckOld.locked) {
          alert(fyCheckOld.reason);
          isSubmitting = false;
          btnSave.disabled = false;
          btnSave.innerHTML = `<i class="fa-solid fa-check"></i> ${tx ? "Update Voucher" : "Save Voucher"}`;
          return;
        }
        const delOk = state.deleteTransaction(tx.id);
        if (!delOk) {
          isSubmitting = false;
          btnSave.disabled = false;
          btnSave.innerHTML = `<i class="fa-solid fa-check"></i> ${tx ? "Update Voucher" : "Save Voucher"}`;
          return;
        }
      }

      const voucherNoEl = root.querySelector("#se-voucherno");
      const saveRef = voucherNoEl ? voucherNoEl.value : refVal;

      // Option 1 Logic: Separate Vouchers Mode vs Combined Voucher Mode
      if (postMode === "separate" && !tx && validRows.length > 1) {
        let successCount = 0;

        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          const rowAmt = parseFloat(r.amount) || 0;
          const finalCode = (r.siteBranch && !r.accountCode.includes("::")) ? `${r.accountCode}::${r.siteBranch}` : r.accountCode;
          
          let vNo = "";
          if (i === 0 && saveRef) {
            vNo = saveRef;
          } else {
            vNo = state.generateNextVoucherNo(voucherType);
          }

          const rowEntries = isReceipt ? [
            { accountId: headerAcc, debit: rowAmt, credit: 0, siteBranch: "" },
            { accountId: finalCode, debit: 0, credit: rowAmt, siteBranch: r.siteBranch || "", instrumentNo: r.refNo || "", narration: r.narration || "" }
          ] : [
            { accountId: finalCode, debit: rowAmt, credit: 0, siteBranch: r.siteBranch || "", instrumentNo: r.refNo || "", narration: r.narration || "" },
            { accountId: headerAcc, debit: 0, credit: rowAmt, siteBranch: "" }
          ];

          let rowDesc = r.narration || r.refNo || "";
          if (!rowDesc) {
            rowDesc = masterNarrationVal ? `${masterNarrationVal} - ${r.accountName}` : (isReceipt ? `Bank Receipt - ${r.accountName}` : `Bank Payment - ${r.accountName}`);
          }

          const addOk = state.addTransaction({
            date: dateValFinal,
            reference: vNo,
            description: rowDesc,
            entries: rowEntries
          });

          if (addOk) successCount++;
        }

        invalidateReportCache();
        alert(`Successfully posted ${successCount} separate ${voucherType} vouchers.`);
      } else {
        // Combined Voucher mode (or editing single transaction or only 1 row)
        const totalAmount = validRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const entries = [];

        if (isReceipt) {
          // Debit Bank Account
          entries.push({
            accountId: headerAcc,
            debit: totalAmount,
            credit: 0,
            siteBranch: ""
          });

          // Credit each Party
          validRows.forEach(r => {
            const finalCode = (r.siteBranch && !r.accountCode.includes("::")) ? `${r.accountCode}::${r.siteBranch}` : r.accountCode;
            entries.push({
              accountId: finalCode,
              debit: 0,
              credit: parseFloat(r.amount) || 0,
              siteBranch: r.siteBranch || "",
              instrumentNo: r.refNo || "",
              narration: r.narration || ""
            });
          });
        } else {
          // Debit each Party
          validRows.forEach(r => {
            const finalCode = (r.siteBranch && !r.accountCode.includes("::")) ? `${r.accountCode}::${r.siteBranch}` : r.accountCode;
            entries.push({
              accountId: finalCode,
              debit: parseFloat(r.amount) || 0,
              credit: 0,
              siteBranch: r.siteBranch || "",
              instrumentNo: r.refNo || "",
              narration: r.narration || ""
            });
          });

          // Credit Bank Account
          entries.push({
            accountId: headerAcc,
            debit: 0,
            credit: totalAmount,
            siteBranch: ""
          });
        }

        const saveDesc = masterNarrationVal || (isReceipt ? `Bank Receipt - ${validRows.map(r => r.accountName).join(", ")}` : `Bank Payment - ${validRows.map(r => r.accountName).join(", ")}`);

        const addOk = state.addTransaction({
          id: tx ? tx.id : undefined,
          date: dateValFinal,
          reference: saveRef,
          description: saveDesc,
          entries: entries
        });

        if (!addOk) {
          isSubmitting = false;
          btnSave.disabled = false;
          btnSave.innerHTML = `<i class="fa-solid fa-check"></i> ${tx ? "Update Voucher" : "Save Voucher"}`;
          return;
        }

        invalidateReportCache();
        alert(tx ? "Voucher updated successfully." : "Voucher posted successfully.");
      }

      if (isInline) {
        // Refresh form ready for immediate next bank statement entry
        showSingleEntryVoucherModal(container, null, voucherType, true, mainContainer, onSwitchMode);
        
        // Refresh logs panel if visible
        const logsEl = document.getElementById("voucher-logs-container");
        if (logsEl && window.refreshVoucherLogsOnly) {
          window.refreshVoucherLogsOnly();
        }
      } else {
        close();
        if (mainContainer) {
          if (window.renderVouchers) window.renderVouchers(mainContainer);
        }
      }
    } catch (err) {
      alert("Error saving voucher: " + err.message);
    } finally {
      isSubmitting = false;
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = `<i class="fa-solid fa-check"></i> ${tx ? "Update Voucher" : "Save Voucher"}`;
      }
    }
  };

  btnSave?.addEventListener("click", handleSaveVoucher);

  // Keyboard Shortcuts (Ctrl+Enter to Save, Ctrl+H to Switch Mode)
  root.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveVoucher();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "h" || e.key === "H")) {
      e.preventDefault();
      btnSwitchMode?.click();
    }
  });

  // Initial render of rows
  renderRows();
}

/**
 * Site / Branch Selection Modal - Only pops up when a party has multiple sites/branches.
 */
function showSiteSelectionModal(parentEl, contact, currentSite, onSelected) {
  if (document.getElementById("site-selection-modal")) return;

  const modal = document.createElement("div");
  modal.id = "site-selection-modal";
  modal.style.position = "absolute";
  modal.style.top = "20%";
  modal.style.left = "30%";
  modal.style.width = "420px";
  modal.style.maxWidth = "92vw";
  modal.style.backgroundColor = "#cbd5e1";
  modal.style.border = "2px solid #1e3b8b";
  modal.style.padding = "12px";
  modal.style.fontFamily = "var(--font-body, sans-serif)";
  modal.style.fontSize = "0.85rem";
  modal.style.color = "black";
  modal.style.boxShadow = "0 10px 40px rgba(0,0,0,0.5)";
  modal.style.zIndex = "100020";
  modal.style.borderRadius = "6px";

  const isCustomer = (contact.type || "").toLowerCase() === "customer";
  const label = isCustomer ? "Select Site Name" : "Select Branch Name";

  modal.innerHTML = `
    <div style="background-color: #1e3b8b; color: white; padding: 6px 10px; font-weight: bold; margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center; border-radius:3px;">
      <span><i class="fa-solid fa-location-dot"></i> ${label}</span>
      <button type="button" id="site-modal-close-x" style="background:none; border:none; color:white; font-size:1.1rem; cursor:pointer;">&times;</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:8px; padding:4px 0;">
      <div style="font-weight:700; color:#0f172a; font-size:0.85rem;">Party: <span style="color:#1e40af;">${contact.name}</span></div>
      <div style="display:flex; flex-direction:column; gap:4px;">
        <label style="font-weight:600; font-size:0.75rem; color:#475569;">${label}:</label>
        <select id="site-modal-select" class="form-control" style="background:white; color:black; font-weight:bold; height:32px; padding:3px 8px; font-size:0.85rem; border:1.5px solid #1e3b8b; border-radius:4px; width:100%;">
          ${(contact.sites || []).map(s => `<option value="${s}" ${s === currentSite ? 'selected' : ''}>${s}</option>`).join("")}
        </select>
      </div>
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; border-top: 1px solid #94a3b8; padding-top: 8px;">
      <button type="button" id="site-modal-ok-btn" style="background: #1e3b8b; color:white; border:none; padding: 5px 20px; font-weight: bold; cursor: pointer; border-radius:3px;">OK (Enter)</button>
      <button type="button" id="site-modal-cancel-btn" style="background: #e2e8f0; border: 1px solid #475569; padding: 5px 14px; font-weight: bold; cursor: pointer; color: black; border-radius:3px;">Skip</button>
    </div>
  `;

  parentEl.appendChild(modal);
  const selectEl = modal.querySelector("#site-modal-select");
  selectEl?.focus();

  const handleDone = (siteVal) => {
    modal.remove();
    if (typeof onSelected === "function") {
      onSelected(siteVal);
    }
  };

  modal.querySelector("#site-modal-close-x")?.addEventListener("click", () => handleDone(selectEl.value || ""));
  modal.querySelector("#site-modal-cancel-btn")?.addEventListener("click", () => handleDone(""));
  modal.querySelector("#site-modal-ok-btn")?.addEventListener("click", () => handleDone(selectEl.value || ""));

  selectEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleDone(selectEl.value || "");
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleDone("");
    }
  });
}

/**
 * Quick Ledger Creation Modal triggered by Insert key
 */
function openQuickLedgerModal(parentEl, onCreated) {
  if (document.getElementById("quick-ledger-modal")) return;

  const ledgerModal = document.createElement("div");
  ledgerModal.id = "quick-ledger-modal";
  ledgerModal.style.position = "absolute";
  ledgerModal.style.top = "15%";
  ledgerModal.style.left = "25%";
  ledgerModal.style.width = "460px";
  ledgerModal.style.backgroundColor = "#cbd5e1";
  ledgerModal.style.border = "2px solid #1e3b8b";
  ledgerModal.style.padding = "12px";
  ledgerModal.style.fontFamily = "sans-serif";
  ledgerModal.style.fontSize = "0.85rem";
  ledgerModal.style.color = "black";
  ledgerModal.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
  ledgerModal.style.zIndex = "100010";
  ledgerModal.style.borderRadius = "4px";

  const nextLedgerNum = state.getLedgers().length + 1;
  const defaultCode = "L" + String(nextLedgerNum).padStart(3, '0');
  const groups = state.getAccountGroups();

  ledgerModal.innerHTML = `
    <div style="background-color: #1e3b8b; color: white; padding: 4px 8px; font-weight: bold; margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center; border-radius:2px;">
      <span>NEW LEDGER ACCOUNT</span>
      <button type="button" id="quick-ld-close-btn" style="background:none; border:none; color:white; font-size:1.1rem; cursor:pointer;">&times;</button>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: none; grid-template-columns: 120px 1fr; align-items: center; gap: 8px;">
        <label style="font-weight: bold; color: black;">Ledger Code:</label>
        <input type="text" id="quick-ld-code" class="form-control" style="background-color: white; color: black; padding: 2px;" value="${defaultCode}">
      </div>
      <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 8px;">
        <label style="font-weight: bold; color: black;">Ledger Name:</label>
        <input type="text" id="quick-ld-name" class="form-control" style="background-color: white; color: black; padding: 3px; font-weight:bold;">
      </div>
      <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 8px;">
        <label style="font-weight: bold; color: black;">Under Group:</label>
        <select id="quick-ld-group" class="form-control" style="background-color: white; color: black; padding: 3px;">
          ${groups.map(g => `<option value="${g.name}">${g.name}</option>`).join("")}
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 8px;">
        <label style="font-weight: bold; color: black;">Opening Balance:</label>
        <input type="number" step="0.01" id="quick-ld-balance" class="form-control" style="background-color: white; color: black; padding: 3px;" value="0.00">
      </div>
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; border-top: 1px solid #94a3b8; padding-top: 10px;">
      <button type="button" id="quick-ld-save" style="background: #1e3b8b; color:white; border:none; padding: 4px 18px; font-weight: bold; cursor: pointer; border-radius:3px;">Save</button>
      <button type="button" id="quick-ld-close" style="background: #e2e8f0; border: 1px solid #475569; padding: 4px 14px; font-weight: bold; cursor: pointer; color: black; border-radius:3px;">Close</button>
    </div>
  `;

  parentEl.appendChild(ledgerModal);
  const nameInput = document.getElementById("quick-ld-name");
  nameInput?.focus();

  const closeQuickLedger = () => {
    ledgerModal.remove();
  };

  document.getElementById("quick-ld-close-btn")?.addEventListener("click", closeQuickLedger);
  document.getElementById("quick-ld-close")?.addEventListener("click", closeQuickLedger);

  document.getElementById("quick-ld-save")?.addEventListener("click", () => {
    const code = document.getElementById("quick-ld-code").value.trim();
    const name = document.getElementById("quick-ld-name").value.trim().toUpperCase();
    const groupName = document.getElementById("quick-ld-group").value;
    const openingBalance = parseFloat(document.getElementById("quick-ld-balance").value) || 0;

    if (!code || !name) {
      alert("Please enter Ledger Name.");
      return;
    }

    try {
      const grp = groups.find(g => g.name === groupName);
      const balanceType = (grp && (grp.under === "ASSETS" || grp.under === "EXPENSE")) ? "Debit" : "Credit";

      state.addLedger({ code, name, groupName, openingBalance, balanceType });
      alert("Ledger created successfully.");

      closeQuickLedger();
      if (typeof onCreated === "function") {
        onCreated({ code, name, groupName, openingBalance });
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  });

  document.getElementById("quick-ld-name")?.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      document.getElementById("quick-ld-group")?.focus();
    }
  });
  document.getElementById("quick-ld-group")?.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      document.getElementById("quick-ld-balance")?.focus();
    }
  });
  document.getElementById("quick-ld-balance")?.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      document.getElementById("quick-ld-save").click();
    }
  });
}
