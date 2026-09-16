import { state } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";
import { formatDate } from "../utils/dateUtils.js";
import { showCustomerSalesHistoryModal } from "./customerHistoryModal.js";
import { showInvoicePrintPreview } from "./invoices.js";
import { showSelectBillSeriesModal } from "./selectSeriesModal.js";

let activeSubTab = "sales";
let searchTxFilter = "";

export function showBatchSelectionModal(materialId, currentPrice, onSelect) {
  const root = document.getElementById("modal-container-root");
  const mat = state.getMaterials().find(m => m.id === materialId);
  if (!mat) return;
  
  const modalDiv = document.createElement("div");
  modalDiv.id = "batch-selection-modal-overlay";
  modalDiv.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); display:flex; justify-content:center; align-items:center; z-index:3000;";
  
  const batches = mat.batches || [];
  
  modalDiv.innerHTML = `
    <div style="background-color:#cbd5e1; color:#0f172a; padding:15px; border:2px solid #1e3b8b; border-radius:6px; width:450px; box-shadow:0 10px 30px rgba(0,0,0,0.5); font-family:sans-serif;">
      <div style="background-color:#1e3b8b; color:white; padding:6px 12px; font-weight:bold; border-radius:4px 4px 0 0; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span>Select Batch for ${mat.name}</span>
        <button type="button" id="btn-close-batch-modal" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
      </div>
      <div style="margin-bottom:10px;">
        <p style="font-size:0.8rem; font-weight:600; margin-bottom:6px;">Existing Batches:</p>
        <div style="max-height:150px; overflow-y:auto; border:1px solid #94a3b8; background:white; border-radius:3px;">
          <table style="width:100%; font-size:0.8rem; text-align:left; border-collapse:collapse;">
            <thead>
              <tr style="background:#e2e8f0; border-bottom:1px solid #cbd5e1;">
                <th style="padding:4px;">Batch No</th>
                <th style="padding:4px;">Cost</th>
                <th style="padding:4px;">Selling Rate</th>
                <th style="padding:4px;">MRP</th>
                <th style="padding:4px;">Stock</th>
                <th style="padding:4px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${batches.length === 0 ? '<tr><td colspan="6" style="padding:8px; text-align:center; color:#64748b;">No batches exist. Please create one.</td></tr>' : 
                batches.map(b => `
                <tr style="border-bottom:1px solid #cbd5e1;">
                  <td style="padding:4px; font-weight:bold; color:#1e3b8b;">${b.batchNo}</td>
                  <td style="padding:4px; font-weight:bold;">\u20B9${b.landingCost}</td>
                  <td style="padding:4px;">\u20B9${b.sellingPrice}</td>
                  <td style="padding:4px;">\u20B9${b.mrp}</td>
                  <td style="padding:4px; font-weight:bold; color:${b.stock > 0 ? '#16a34a' : '#ef4444'};">${b.stock}</td>
                  <td style="padding:4px;">
                    <button type="button" class="btn-select-batch-row" data-batch="${b.batchNo}" style="background:#1e3b8b; color:white; border:none; padding:2px 6px; font-size:0.75rem; cursor:pointer; border-radius:2px;">Select</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div style="border-top:1px solid #94a3b8; padding-top:10px; display:flex; flex-direction:column; gap:6px;">
        <span style="font-size:0.8rem; font-weight:bold; color:#1e3b8b;">Or Create New Batch:</span>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <div>
            <label style="font-size:0.75rem; font-weight:600; display:block;">Landing/Purchase Cost</label>
            <input type="number" id="new-batch-cost" style="width:100%; background:white; color:black; border:1px solid #94a3b8; padding:2px 4px; font-size:0.8rem;" value="${currentPrice || ''}">
          </div>
          <div>
            <label style="font-size:0.75rem; font-weight:600; display:block;">Selling Price (Excl. Tax)</label>
            <input type="number" id="new-batch-selling" style="width:100%; background:white; color:black; border:1px solid #94a3b8; padding:2px 4px; font-size:0.8rem;" value="${mat.gstExclRate || ''}">
          </div>
          <div>
            <label style="font-size:0.75rem; font-weight:600; display:block;">M.R.P</label>
            <input type="number" id="new-batch-mrp" style="width:100%; background:white; color:black; border:1px solid #94a3b8; padding:2px 4px; font-size:0.8rem;" value="${mat.mrp || ''}">
          </div>
          <div style="display:flex; align-items:flex-end;">
            <button type="button" id="btn-create-batch-submit" style="width:100%; height:26px; background:#16a34a; color:white; font-weight:bold; border:none; cursor:pointer; border-radius:2px; font-size:0.75rem;">Create Batch</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalDiv);
  
  const closeModal = () => {
    document.body.removeChild(modalDiv);
  };
  
  modalDiv.querySelector("#btn-close-batch-modal").addEventListener("click", closeModal);
  
  modalDiv.querySelectorAll(".btn-select-batch-row").forEach(btn => {
    btn.addEventListener("click", () => {
      const bNo = btn.getAttribute("data-batch");
      const matched = batches.find(b => b.batchNo === bNo);
      closeModal();
      onSelect(matched);
    });
  });
  
  modalDiv.querySelector("#btn-create-batch-submit").addEventListener("click", () => {
    const cost = parseFloat(modalDiv.querySelector("#new-batch-cost").value) || 0;
    const sell = parseFloat(modalDiv.querySelector("#new-batch-selling").value) || 0;
    const mrp = parseFloat(modalDiv.querySelector("#new-batch-mrp").value) || 0;
    
    if (cost <= 0 || sell <= 0) {
      alert("Please enter valid cost and selling price.");
      return;
    }
    
    const bNo = String(cost);
    state.addOrUpdateMaterialBatch(materialId, {
      batchNo: bNo,
      landingCost: cost,
      sellingPrice: sell,
      mrp: mrp
    });
    
    closeModal();
    const newlyCreated = state.getMaterialBatches(materialId).find(b => b.batchNo === bNo);
    onSelect(newlyCreated);
  });
}

function showAdjustmentsModal(billType, initialBillAmount, adjustmentsList, onSave) {
  const root = document.getElementById("modal-container-root");
  
  // Get predefined adjustments from state
  const masterAdjustments = billType === "sales" ? state.getSalesAdjustments() : state.getPurchaseAdjustments();

  // Create active list of adjustments for this modal (clone the passed list)
  let list = JSON.parse(JSON.stringify(adjustmentsList || []));

  // We want to pre-populate list with any adjustments from master that aren't already in the list
  masterAdjustments.forEach(ma => {
    if (!list.some(item => item.name === ma.name)) {
      // Check if this adjustment was previously in the original list with a zero/override
      // (passed list may have been zeroed-out via CLEAR or manual override)
      const existing = adjustmentsList ? adjustmentsList.find(a => a.name === ma.name) : null;
      if (existing) {
        // Already in the original list \u20B9‚¬â€ preserve its state (including isOverridden)
        list.push({ ...existing });
      } else {
        list.push({ type: "Add", name: ma.name, amount: 0, ledgerCode: ma.ledgerCode });
      }
    }
  });

  const modal = document.createElement("div");
  modal.className = "modal-overlay active";
  modal.style.zIndex = "100000";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";

  function renderModalContent() {
    let adjTotal = 0;
    list.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      if (item.type === "Add") {
        adjTotal += amt;
      } else {
        adjTotal -= amt;
      }
    });

    const netAmount = initialBillAmount + adjTotal;

    modal.innerHTML = `
      <div class="modal-container" style="width: 550px; background-color: #cbd5e1; border: 2px solid #1e3b8b; padding: 10px; font-family: sans-serif; font-size: 0.85rem; color: black; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <div style="background-color: #1e3b8b; color: white; padding: 4px 8px; font-weight: bold; margin-bottom: 10px;">
          ${billType === 'sales' ? 'Sales Adjustments' : 'Purchase Adjustments'}
        </div>
        
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 10px;">
          <span style="font-weight: bold; color: black;">BILL AMOUNT</span>
          <input type="text" value="${initialBillAmount.toFixed(2)}" readonly style="width: 120px; background-color: white; color: black; font-weight: bold; text-align: right; border: 1px solid #94a3b8; padding: 3px;">
        </div>

        <div style="background-color: white; border: 1px solid #94a3b8; max-height: 250px; overflow-y: auto; margin-bottom: 10px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: black;">
            <thead>
              <tr style="background-color: #e2e8f0; border-bottom: 2px solid #cbd5e1; font-weight: bold;">
                <th style="padding: 6px; border-right: 1px solid #cbd5e1; color: black;">Adjustment Name</th>
                <th style="padding: 6px; text-align: right; width: 150px; color: black;">Adj.% / Amount</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((item, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px; border-right: 1px solid #e2e8f0; display: flex; align-items: center; gap: 6px; color: black;">
                    <select class="adj-type-select" data-index="${idx}" style="background-color: white; color: black; border: 1px solid #cbd5e1; padding: 2px;">
                      <option value="Add" ${item.type === 'Add' ? 'selected' : ''}>Add</option>
                      <option value="Less" ${item.type === 'Less' ? 'selected' : ''}>Less</option>
                    </select>
                    <span style="font-weight: bold; color: black;">${item.name}</span>
                  </td>
                  <td style="padding: 6px; text-align: right;">
                    <input type="number" step="0.01" class="adj-amount-input" data-index="${idx}" value="${item.amount || ''}" placeholder="0.00" style="width: 100px; text-align: right; background-color: white; color: black; border: 1px solid #cbd5e1; padding: 2px;">
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #cbd5e1; padding-top: 8px;">
          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
            <span style="font-weight: bold; color: black;">Adjustment Total</span>
            <input type="text" value="${adjTotal.toFixed(2)}" readonly style="width: 120px; background-color: white; color: black; font-weight: bold; text-align: right; border: 1px solid #94a3b8; padding: 3px;">
          </div>
          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 4px;">
            <span style="font-weight: bold; color: red;">NET AMOUNT</span>
            <input type="text" value="${netAmount.toFixed(2)}" readonly style="width: 120px; background-color: white; color: red; font-weight: bold; text-align: right; border: 1px solid #94a3b8; padding: 3px; font-size: 1.1rem;">
          </div>
        </div>

        <div style="font-size: 0.72rem; color: #475569; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
          To Create new Adjustments goto-> Accounts and Select Sales/Purchase Adjustment Master
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
          <button type="button" id="btn-adj-ok" style="background: #e2e8f0; border: 1px solid #475569; padding: 4px 16px; font-weight: bold; cursor: pointer; color: black;">OK</button>
          <button type="button" id="btn-adj-cancel" style="background: #e2e8f0; border: 1px solid #475569; padding: 4px 16px; font-weight: bold; cursor: pointer; color: black;">Cancel</button>
        </div>
      </div>
    `;

    // Bind inputs changes
    modal.querySelectorAll(".adj-type-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const idx = parseInt(sel.getAttribute("data-index"));
        list[idx].type = sel.value;
        updateTotalsAndValues();
      });
    });

    modal.querySelectorAll(".adj-amount-input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.getAttribute("data-index"));
        const val = parseFloat(inp.value) || 0;
        if (list[idx].name === "LOADING CHARGES" && list[idx].amount !== val) {
          list[idx].isOverridden = true;
        }
        list[idx].amount = val;
        updateTotalsAndValues();
      });
    });

    function updateTotalsAndValues() {
      let tempTotal = 0;
      modal.querySelectorAll(".adj-amount-input").forEach(inp2 => {
        const idx2 = parseInt(inp2.getAttribute("data-index"));
        const type = modal.querySelector(`.adj-type-select[data-index="${idx2}"]`).value;
        const val = parseFloat(inp2.value) || 0;
        if (list[idx2].name === "LOADING CHARGES" && (list[idx2].amount !== val || list[idx2].type !== type)) {
          list[idx2].isOverridden = true;
        }
        list[idx2].type = type;
        list[idx2].amount = val;
        if (type === "Add") tempTotal += val;
        else tempTotal -= val;
      });
      modal.querySelectorAll("input[readonly]")[1].value = tempTotal.toFixed(2);
      modal.querySelectorAll("input[readonly]")[2].value = (initialBillAmount + tempTotal).toFixed(2);
    }

    const closeModal = () => {
      window.removeEventListener("keydown", handleKeydown, true);
      modal.remove();
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeydown, true);

    // OK button: save list back. Keep zero-amount entries only if isOverridden (e.g. user
    // explicitly zeroed LOADING CHARGES — keep it so renderGridAndRecalc won't auto-refill it).
    modal.querySelector("#btn-adj-ok").onclick = () => {
      const savedList = list.filter(item => {
        const amt = parseFloat(item.amount) || 0;
        // Keep non-zero entries, AND keep zero entries that are explicitly overridden
        return amt > 0 || item.isOverridden === true;
      });
      onSave(savedList);
      closeModal();
    };

    modal.querySelector("#btn-adj-cancel").onclick = () => {
      closeModal();
    };
  }

  root.appendChild(modal);
  renderModalContent();
}

export function setTransactionsActiveTab(tab) {
  if (tab === "sales") {
    const allSeries = state.getSeriesMaster() || [];
    const salesSeries = allSeries.filter(s => s.txType === "Sales");
    if (salesSeries.length > 0) tab = "sales_" + salesSeries[0].id;
  } else if (tab === "purchase") {
    const allSeries = state.getSeriesMaster() || [];
    const purchaseSeries = allSeries.filter(s => s.txType === "Purchase");
    if (purchaseSeries.length > 0) tab = "purchase_" + purchaseSeries[0].id;
  }
  activeSubTab = tab;
}

export function renderTransactions(container) {
  // Render outer shell with sub-tabs
  
    const allSeries = state.getSeriesMaster() || [];
    const salesSeries = allSeries.filter(s => s.txType === "Sales");
    const purchaseSeries = allSeries.filter(s => s.txType === "Purchase");
    const srSeries = allSeries.filter(s => s.txType === "Sales Return");
    const prSeries = allSeries.filter(s => s.txType === "Purchase Return");

    let subTabsHtml = '<div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap;">';

    if (salesSeries.length === 0) {
      subTabsHtml += `
      <button class="btn ${activeSubTab === 'sales' ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="sales">
        <i class="fa-solid fa-file-invoice"></i> Sales (Invoices)
      </button>`;
    } else {
      salesSeries.forEach(s => {
        subTabsHtml += `
        <button class="btn ${activeSubTab === 'sales_' + s.id ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="sales_${s.id}">
          <i class="fa-solid fa-file-invoice"></i> Sales - ${s.name}
        </button>`;
      });
    }

    if (srSeries.length === 0) {
      subTabsHtml += `
      <button class="btn ${activeSubTab === 'sales-return' ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="sales-return">
        <i class="fa-solid fa-reply"></i> Sales Returns
      </button>`;
    } else {
      srSeries.forEach(s => {
        subTabsHtml += `
        <button class="btn ${activeSubTab === 'sales-return_' + s.id ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="sales-return_${s.id}">
          <i class="fa-solid fa-reply"></i> SR - ${s.name}
        </button>`;
      });
    }

    if (purchaseSeries.length === 0) {
      subTabsHtml += `
      <button class="btn ${activeSubTab === 'purchase' ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="purchase">
        <i class="fa-solid fa-cart-shopping"></i> Purchase (Bills)
      </button>`;
    } else {
      purchaseSeries.forEach(s => {
        subTabsHtml += `
        <button class="btn ${activeSubTab === 'purchase_' + s.id ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="purchase_${s.id}">
          <i class="fa-solid fa-cart-shopping"></i> Pur - ${s.name}
        </button>`;
      });
    }
    
    if (prSeries.length === 0) {
      subTabsHtml += `
      <button class="btn ${activeSubTab === 'purchase-return' ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="purchase-return">
        <i class="fa-solid fa-reply-all"></i> Purchase Returns
      </button>`;
    } else {
      prSeries.forEach(s => {
        subTabsHtml += `
        <button class="btn ${activeSubTab === 'purchase-return_' + s.id ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="purchase-return_${s.id}">
          <i class="fa-solid fa-reply-all"></i> PR - ${s.name}
        </button>`;
      });
    }

    subTabsHtml += `
      <button class="btn ${activeSubTab === 'stock-adjust' ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="stock-adjust">
        <i class="fa-solid fa-sliders"></i> Stock Adjustments
      </button>
      <button class="btn ${activeSubTab === 'stock-conversion' ? 'btn-primary' : 'btn-secondary'} subtab-btn" data-subtab="stock-conversion">
        <i class="fa-solid fa-boxes-stacked"></i> Product Loosening
      </button>
    </div>`;

  container.innerHTML = subTabsHtml + '<div id="transactions-content" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;"></div>';

  const subtabContentEl = container.querySelector("#transactions-content");
  renderActiveSubTab(subtabContentEl);

  // Bind sub-tabs buttons
  container.querySelectorAll(".subtab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeSubTab = btn.getAttribute("data-subtab");
      renderTransactions(container);
    });
  });
}

function renderActiveSubTab(container) {
  if (!container) return;
  if (activeSubTab.startsWith("sales-return")) {
    renderSalesReturnSubTab(container);
  } else if (activeSubTab.startsWith("sales")) {
    renderSalesSubTab(container);
  } else if (activeSubTab.startsWith("purchase-return")) {
    renderPurchaseReturnSubTab(container);
  } else if (activeSubTab.startsWith("purchase")) {
    renderPurchaseSubTab(container);
  } else if (activeSubTab === "stock-adjust") {
    renderStockAdjustSubTab(container);
  } else {
    renderStockConversionSubTab(container);
  }
}

// -------------------------------------------------------------
// 1. SALES SUB-TAB
// -------------------------------------------------------------
let salesSearchFrom = "";
let salesSearchTo = "";
let salesSearchCustomerId = "";

function renderSalesSubTab(container) {
  const invoices = state.getInvoices().filter(i => i !== null && i !== undefined);
  const customers = state.getContacts()
    .filter(c => c !== null && c !== undefined && (c.type === "customer" || c.listInCustomerList === true))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  const materials = state.getMaterials();

  // Apply search/date/customer filters
  let filtered = invoices;

  if (activeSubTab.startsWith("sales_")) {
    const sId = activeSubTab.split("_")[1];
    const sObj = (state.getSeriesMaster() || []).find(x => x.id === sId);
    filtered = filtered.filter(s => s.seriesId === sId || (sObj && ((s.voucherNo && s.voucherNo.startsWith(sObj.prefix)) || (s.id && s.id.startsWith(sObj.prefix)))));
  }
  
  if (salesSearchFrom) {
    filtered = filtered.filter(inv => inv.date >= salesSearchFrom);
  }
  if (salesSearchTo) {
    filtered = filtered.filter(inv => inv.date <= salesSearchTo);
  }

  if (salesSearchCustomerId) {
    filtered = filtered.filter(inv => inv.contactId === salesSearchCustomerId);
  }

  filtered.sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const noA = String(a.voucherNo || a.id || "");
    const noB = String(b.voucherNo || b.id || "");
    return noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
  });

  container.innerHTML = `
    <!-- Search Bar Ribbon -->
    <div class="action-header" style="margin-bottom: 1rem; background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
      <div style="display: flex; align-items: center; gap: 5px;">
        <span style="font-weight: bold; font-size: 0.8rem; color: #334155;">From:</span>
        <input type="date" id="sales-search-from" class="form-control" style="width: 130px; padding: 2px 6px; font-size: 0.8rem;" value="${salesSearchFrom}">
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <span style="font-weight: bold; font-size: 0.8rem; color: #334155;">To:</span>
        <input type="date" id="sales-search-to" class="form-control" style="width: 130px; padding: 2px 6px; font-size: 0.8rem;" value="${salesSearchTo}">
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <span style="font-weight: bold; font-size: 0.8rem; color: #334155;">Customer:</span>
        <select id="sales-search-customer" class="form-control" style="width: 180px; padding: 2px 6px; font-size: 0.8rem;">
          <option value="">-- All Customers --</option>
          ${customers.map(c => `<option value="${c.id}" ${salesSearchCustomerId === c.id ? 'selected' : ''}>${c.name}</option>`).join("")}
        </select>
      </div>
      <button class="btn btn-secondary" id="btn-sales-search" style="padding: 4px 12px; font-size: 0.8rem;"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
      <button class="btn btn-primary" id="btn-add-invoice" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;"><i class="fa-solid fa-plus"></i> Create Sales Invoice</button>
    </div>
    
    <div class="panel" style="padding-top: 0.5rem;">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Customer</th>
              <th style="text-align: right;">Total</th>
              <th style="text-align: right;">Paid</th>
              <th style="text-align: right;">Balance</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No sales invoices found.</td></tr>
            ` : filtered.map(inv => {
              const bal = inv.total - inv.paidAmount;
              let badge = "";
              if (inv.isCancelled) {
                badge = `<span class="badge secondary" style="background-color:#94a3b8; color:#fff;">CANCELLED</span>`;
              } else {
                badge = `<span class="badge ${inv.status === 'paid' ? 'success' : (inv.status === 'partially paid' ? 'warning' : 'danger')}">&nbsp;${inv.status}</span>`;
              }
              
              const rowStyle = inv.isCancelled ? `style="text-decoration: line-through; opacity: 0.6; cursor: pointer;"` : `style="cursor: pointer;"`;
              return `
                <tr ${rowStyle} class="sales-invoice-row" data-id="${inv.id}" tabindex="0" title="Double click or press Enter to edit/cancel this bill">
                  <td><code class="highlight-text" style="font-weight: 700;">${inv.voucherNo || inv.id}</code></td>
                  <td>${formatDate(inv.date)}</td>
                  <td>${formatDate(inv.dueDate)}</td>
                  <td><strong>${inv.contactName}</strong></td>
                  <td style="text-align: right; font-weight: 600;">\u20B9${parseFloat(inv.total || 0).toFixed(2)}</td>
                  <td style="text-align: right; color: var(--success); font-weight: 500;">\u20B9${parseFloat(inv.paidAmount || 0).toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600;">\u20B9${parseFloat(bal || 0).toFixed(2)}</td>
                  <td style="text-align: center;">${badge}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  container.querySelector("#btn-sales-search").addEventListener("click", () => {
    salesSearchFrom = container.querySelector("#sales-search-from").value;
    salesSearchTo = container.querySelector("#sales-search-to").value;
    salesSearchCustomerId = container.querySelector("#sales-search-customer").value;
    renderSalesSubTab(container);
  });

  container.querySelector("#btn-add-invoice").addEventListener("click", () => {
    let currentSeries = null;
    if (activeSubTab.startsWith("sales_")) {
      const sId = activeSubTab.split("_")[1];
      currentSeries = (state.getSeriesMaster() || []).find(x => x.id === sId);
    }

    if (currentSeries) {
      showInvoiceBuilderModal(container, customers, materials, null, null, currentSeries);
    } else {
      showSelectBillSeriesModal("Sales", (selectedSeries) => {
        showInvoiceBuilderModal(container, customers, materials, null, null, selectedSeries);
      });
    }
  });

  // Row double-click and keydown Enter handlers to open builder modal
  const openInvoiceRow = (row) => {
    const id = row.getAttribute("data-id");
    const inv = state.getInvoices().find(i => i.id === id);
    if (inv) {
      showInvoiceBuilderModal(container, customers, materials, () => renderSalesSubTab(container), inv);
    }
  };

  container.querySelectorAll(".sales-invoice-row").forEach(row => {
    row.addEventListener("dblclick", () => openInvoiceRow(row));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        openInvoiceRow(row);
      }
    });
  });
}

// -------------------------------------------------------------
// 2. SALES RETURN (CREDIT NOTE) SUB-TAB
// -------------------------------------------------------------
function renderSalesReturnSubTab(container) {
  const returns = state.getSalesReturns().slice().sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const noA = String(a.voucherNo || a.id || "");
    const noB = String(b.voucherNo || b.id || "");
    return noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
  });
  
  container.innerHTML = `
    <div class="action-header" style="margin-bottom: 1rem;">
      <h3 style="font-size: 1.15rem;">Sales Returns</h3>
      <button class="btn btn-primary" id="btn-add-sales-return"><i class="fa-solid fa-plus"></i> Record Sales Return</button>
    </div>

    <div class="panel" style="padding-top: 0.5rem;">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Sales Return #</th>
              <th>Date</th>
              <th>Customer</th>
              <th style="text-align: right;">Subtotal</th>
              <th style="text-align: right;">Tax Refunded</th>
              <th style="text-align: right;">Total Refund</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${returns.length === 0 ? `
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No sales returns recorded.</td></tr>
            ` : returns.map(ret => `
              <tr class="sales-return-row" data-id="${ret.id}" style="cursor: pointer;" title="Double click to edit this sales return">
                <td><code class="highlight-text" style="font-weight: 700;">${ret.id}</code></td>
                <td>${formatDate(ret.date)}</td>
                <td><strong>${ret.contactName}</strong></td>
                <td style="text-align: right;">₹${parseFloat(ret.subtotal || 0).toFixed(2)}</td>
                <td style="text-align: right;">₹${parseFloat(ret.taxAmount || 0).toFixed(2)}</td>
                <td style="text-align: right; font-weight: 600; color: var(--danger);">₹${parseFloat(ret.total || 0).toFixed(2)}</td>
                <td style="text-align: center;">
                  <button class="btn btn-secondary btn-icon view-return-btn" data-id="${ret.id}" title="View Sales Return Details"><i class="fa-solid fa-eye"></i> View</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btn-add-sales-return").addEventListener("click", () => {
    showSalesReturnModal(container);
  });

  document.querySelectorAll(".view-return-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showCreditNoteView(container, btn.getAttribute("data-id"));
    });
  });

  const openSalesReturnRow = (row) => {
    const id = row.getAttribute("data-id");
    const ret = state.getSalesReturns().find(r => r.id === id);
    if (ret) {
      showSalesReturnModal(container, ret, () => renderSalesReturnSubTab(container));
    }
  };

  document.querySelectorAll(".sales-return-row").forEach(row => {
    row.addEventListener("dblclick", () => openSalesReturnRow(row));
  });
}

// -------------------------------------------------------------
// 3. PURCHASE SUB-TAB
// -------------------------------------------------------------
let purchaseSearchFrom = "";
let purchaseSearchTo = "";
let purchaseSearchSupplierId = "";

function renderPurchaseSubTab(container) {
  const purchases = state.getPurchases().filter(p => p !== null && p !== undefined);
  let filteredPurchases = purchases;
  if (activeSubTab.startsWith("purchase_")) {
    const sId = activeSubTab.split("_")[1];
    const sObj = (state.getSeriesMaster() || []).find(x => x.id === sId);
    filteredPurchases = purchases.filter(s => s.seriesId === sId || (sObj && ((s.voucherNo && s.voucherNo.startsWith(sObj.prefix)) || (s.id && s.id.startsWith(sObj.prefix)))));
  }

  const suppliers = state.getContacts().filter(c => c !== null && c !== undefined && (c.type === "supplier" || c.listInVendorList === true));

  // Apply filters
  let filtered = filteredPurchases;
  if (purchaseSearchFrom) {
    filtered = filtered.filter(pur => pur.date >= purchaseSearchFrom);
  }
  if (purchaseSearchTo) {
    filtered = filtered.filter(pur => pur.date <= purchaseSearchTo);
  }
  if (purchaseSearchSupplierId) {
    filtered = filtered.filter(pur => pur.contactId === purchaseSearchSupplierId);
  }

  filtered.sort((a, b) => {
    const noA = String(a.voucherNo || a.id || a.refNo || "");
    const noB = String(b.voucherNo || b.id || b.refNo || "");
    const cmp = noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    const dateA = a.date || "";
    const dateB = b.date || "";
    return dateA.localeCompare(dateB);
  });

  container.innerHTML = `
    <!-- Search Bar Ribbon -->
    <div class="action-header" style="margin-bottom: 1rem; background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
      <div style="display: flex; align-items: center; gap: 5px;">
        <span style="font-weight: bold; font-size: 0.8rem; color: #334155;">From:</span>
        <input type="date" id="purchase-search-from" class="form-control" style="width: 130px; padding: 2px 6px; font-size: 0.8rem;" value="${purchaseSearchFrom}">
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <span style="font-weight: bold; font-size: 0.8rem; color: #334155;">To:</span>
        <input type="date" id="purchase-search-to" class="form-control" style="width: 130px; padding: 2px 6px; font-size: 0.8rem;" value="${purchaseSearchTo}">
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <span style="font-weight: bold; font-size: 0.8rem; color: #334155;">Vendor:</span>
        <select id="purchase-search-supplier" class="form-control" style="width: 180px; padding: 2px 6px; font-size: 0.8rem;">
          <option value="">-- All Suppliers --</option>
          ${suppliers.map(s => `<option value="${s.id}" ${purchaseSearchSupplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join("")}
        </select>
      </div>
      <button class="btn btn-secondary" id="btn-purchase-search" style="padding: 4px 12px; font-size: 0.8rem;"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
      <button class="btn btn-primary" id="btn-add-purchase" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;"><i class="fa-solid fa-plus"></i> Record Supplier Bill</button>
    </div>

    <div class="panel" style="padding-top: 0.5rem;">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Date</th>
              <th>Supplier</th>
              <th style="text-align: right;">Subtotal</th>
              <th style="text-align: right;">Tax Paid</th>
              <th style="text-align: right;">Adjustments</th>
              <th style="text-align: right;">Total Amount</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No purchases bills recorded.</td></tr>
            ` : filtered.map(pur => {
              let badge = "";
              if (pur.isCancelled) {
                badge = `<span class="badge secondary" style="background-color:#94a3b8; color:#fff;">CANCELLED</span>`;
              } else {
                badge = `<span class="badge success">Active</span>`;
              }

              const rowStyle = pur.isCancelled ? `style="text-decoration: line-through; opacity: 0.6; cursor: pointer;"` : `style="cursor: pointer;"`;

              let adjVal = pur.adjustments || pur.shipping || 0;
              if (Array.isArray(adjVal)) {
                adjVal = adjVal.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
              } else {
                adjVal = parseFloat(adjVal) || 0;
              }

              return `
                <tr ${rowStyle} class="purchase-bill-row" data-id="${pur.id}" tabindex="0" title="Double click or press Enter to edit/cancel this bill">
                  <td><code class="highlight-text" style="font-weight: 700;">${pur.voucherNo || pur.id}</code></td>
                  <td>${formatDate(pur.date)}</td>
                  <td><strong>${pur.contactName}</strong></td>
                  <td style="text-align: right;">\u20B9${parseFloat(pur.subtotal || 0).toFixed(2)}</td>
                  <td style="text-align: right;">\u20B9${parseFloat(pur.totalGst || pur.taxAmount || 0).toFixed(2)}</td>
                  <td style="text-align: right;">\u20B9${parseFloat(adjVal || 0).toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600; color: var(--success);">\u20B9${parseFloat(pur.total || 0).toFixed(2)}</td>
                  <td style="text-align: center;">${badge}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind Search Button and Inputs
  container.querySelector("#btn-purchase-search").addEventListener("click", () => {
    purchaseSearchFrom = container.querySelector("#purchase-search-from").value;
    purchaseSearchTo = container.querySelector("#purchase-search-to").value;
    purchaseSearchSupplierId = container.querySelector("#purchase-search-supplier").value;
    renderPurchaseSubTab(container);
  });

  container.querySelector("#btn-add-purchase").addEventListener("click", () => {
    let currentSeries = null;
    if (activeSubTab.startsWith("purchase_")) {
      const sId = activeSubTab.split("_")[1];
      currentSeries = (state.getSeriesMaster() || []).find(x => x.id === sId);
    }

    if (currentSeries) {
      showRecordPurchaseModal(container, null, null, currentSeries);
    } else {
      showSelectBillSeriesModal("Purchase", (selectedSeries) => {
        showRecordPurchaseModal(container, null, null, selectedSeries);
      });
    }
  });

  // Row double-click and keydown Enter handlers to open record purchase modal
  const openPurchaseRow = (row) => {
    const id = row.getAttribute("data-id");
    const pur = state.getPurchases().find(p => p.id === id);
    if (pur) {
      showRecordPurchaseModal(container, pur, () => renderPurchaseSubTab(container));
    }
  };

  container.querySelectorAll(".purchase-bill-row").forEach(row => {
    row.addEventListener("dblclick", () => openPurchaseRow(row));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        openPurchaseRow(row);
      }
    });
  });
}

// -------------------------------------------------------------
// 4. PURCHASE RETURN (DEBIT NOTE) SUB-TAB
// -------------------------------------------------------------
function renderPurchaseReturnSubTab(container) {
  const returns = state.getPurchaseReturns().slice().sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const noA = String(a.voucherNo || a.id || "");
    const noB = String(b.voucherNo || b.id || "");
    return noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
  });

  container.innerHTML = `
    <div class="action-header" style="margin-bottom: 1rem;">
      <h3 style="font-size: 1.15rem;">Purchase Returns (Debit Notes)</h3>
      <button class="btn btn-primary" id="btn-add-purchase-return"><i class="fa-solid fa-plus"></i> Record Debit Note</button>
    </div>

    <div class="panel" style="padding-top: 0.5rem;">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Debit Note #</th>
              <th>Date</th>
              <th>Supplier</th>
              <th style="text-align: right;">Subtotal</th>
              <th style="text-align: right;">Tax Reversed</th>
              <th style="text-align: right;">Total Debit</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${returns.length === 0 ? `
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No debit notes recorded.</td></tr>
            ` : returns.map(ret => `
              <tr class="purchase-return-row" data-id="${ret.id}" style="cursor: pointer;" title="Double click to edit this debit note">
                <td><code class="highlight-text" style="font-weight: 700;">${ret.id}</code></td>
                <td>${formatDate(ret.date)}</td>
                <td><strong>${ret.contactName}</strong></td>
                <td style="text-align: right;">\u20B9${parseFloat(ret.subtotal || 0).toFixed(2)}</td>
                <td style="text-align: right;">\u20B9${parseFloat(ret.taxAmount || 0).toFixed(2)}</td>
                <td style="text-align: right; font-weight: 600; color: var(--info);">\u20B9${parseFloat(ret.total || 0).toFixed(2)}</td>
                <td style="text-align: center;">
                  <button class="btn btn-secondary btn-icon view-dn-btn" data-id="${ret.id}"><i class="fa-solid fa-eye"></i> View</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btn-add-purchase-return").addEventListener("click", () => {
    showPurchaseReturnModal(container);
  });

  document.querySelectorAll(".view-dn-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showDebitNoteView(container, btn.getAttribute("data-id"));
    });
  });

  const openPurchaseReturnRow = (row) => {
    const id = row.getAttribute("data-id");
    const ret = state.getPurchaseReturns().find(r => r.id === id);
    if (ret) {
      showPurchaseReturnModal(container, ret, () => renderPurchaseReturnSubTab(container));
    }
  };

  document.querySelectorAll(".purchase-return-row").forEach(row => {
    row.addEventListener("dblclick", () => openPurchaseReturnRow(row));
  });
}

// -------------------------------------------------------------
// 5. STOCK ADJUSTMENTS SUB-TAB
// -------------------------------------------------------------
function renderStockAdjustSubTab(container) {
  const txs = state.getTransactions();
  const adjustments = txs
    .filter(tx => tx.reference.startsWith("Stock Adj:"))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = `
    <div class="action-header" style="margin-bottom: 1rem;">
      <h3 style="font-size: 1.15rem;">Inventory Audit Adjustments</h3>
      <button class="btn btn-primary" id="btn-stock-adjust-form"><i class="fa-solid fa-sliders"></i> Adjust Stock Level</button>
    </div>

    <div class="panel" style="padding-top: 0.5rem;">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher Code</th>
              <th>Description / Memo</th>
              <th style="text-align: right;">Asset Adjustment</th>
            </tr>
          </thead>
          <tbody>
            ${adjustments.length === 0 ? `
              <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">No manual adjustments posted yet.</td></tr>
            ` : adjustments.map(tx => {
              const invEntries = tx.entries.filter(e => e.accountId === "1200");
              let totalDebit = invEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
              let totalCredit = invEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
              let amtText = "";
              if (totalDebit > totalCredit) {
                amtText = `<span class="text-success" style="font-weight: 600;">+ \u20B9${(totalDebit - totalCredit).toLocaleString("en-US", { minimumFractionDigits: 2 })} (Gain)</span>`;
              } else if (totalCredit > totalDebit) {
                amtText = `<span class="text-danger" style="font-weight: 600;">- \u20B9${(totalCredit - totalDebit).toLocaleString("en-US", { minimumFractionDigits: 2 })} (Loss)</span>`;
              } else {
                amtText = "\u20B90.00";
              }
              const refNo = tx.reference.replace("Stock Adj: ", "");
              return `
                <tr class="stock-adjust-row" data-ref="${refNo}" style="cursor: pointer;" title="Double click to edit">
                  <td>${formatDate(tx.date)}</td>
                  <td><code class="highlight-text" style="font-weight: 700;">${tx.id}</code></td>
                  <td style="white-space: normal; max-width: 350px;">${tx.description}</td>
                  <td style="text-align: right;">${amtText}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btn-stock-adjust-form").addEventListener("click", () => {
    showStockAdjustWizard(container);
  });

  container.querySelectorAll(".stock-adjust-row").forEach(row => {
    row.addEventListener("dblclick", () => {
      const ref = row.getAttribute("data-ref");
      showStockAdjustWizard(container, ref);
    });
  });
}

// -------------------------------------------------------------
// 6. STOCK LOOSENING (CONVERSION) SUB-TAB
// -------------------------------------------------------------
function renderStockConversionSubTab(container) {
  const conversions = state.getConversions();

  container.innerHTML = `
    <div class="action-header" style="margin-bottom: 1rem;">
      <h3 style="font-size: 1.15rem;">Material Stock Loosening & Conversions</h3>
      <button class="btn btn-primary" id="btn-add-conversion"><i class="fa-solid fa-boxes-packing"></i> Convert / Loose Material</button>
    </div>

    <div class="panel" style="padding-top: 0.5rem;">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Voucher #</th>
              <th>Date</th>
              <th>Source Product (Qty)</th>
              <th>Converted Target (Qty)</th>
              <th style="text-align: right;">Conversion Cost Value</th>
            </tr>
          </thead>
          <tbody>
            ${conversions.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No conversion logs found.</td></tr>
            ` : conversions.map(c => `
              <tr>
                <td><code class="highlight-text">${c.id}</code></td>
                <td>${formatDate(c.date)}</td>
                <td><strong>${c.sourceName}</strong> (${c.sourceQty} ${c.sourceUnit}) <span class="badge secondary" style="font-size: 0.65rem;">Batch: ${c.sourceBatch || 'N/A'}</span></td>
                <td><i class="fa-solid fa-arrow-right-long text-muted" style="margin-right: 0.5rem;"></i> <strong>${c.targetName}</strong> (${c.targetQty} ${c.targetUnit}) <span class="badge secondary" style="font-size: 0.65rem;">Batch: ${c.targetBatch || 'N/A'}</span></td>
                <td style="text-align: right; font-weight: 600;">\u20B9${c.value.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btn-add-conversion").addEventListener("click", () => {
    showStockConversionModal(container);
  });
}

function getUnitOptionsHTML(selectedUnit) {
  const units = state.getUnits().map(u => u.symbol);
  if (selectedUnit && !units.includes(selectedUnit)) {
    units.push(selectedUnit);
  }
  return units.map(u => `<option value="${u}" ${u === selectedUnit ? 'selected' : ''}>${u}</option>`).join("");
}

function updateRibbonUnitSelect(selectElement, targetUnit) {
  if (!selectElement) return;
  const units = state.getUnits().map(u => u.symbol);
  if (targetUnit && !units.includes(targetUnit)) {
    units.push(targetUnit);
  }
  selectElement.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join("");
  if (targetUnit) {
    selectElement.value = targetUnit;
  }
}

export function showInvoiceBuilderModal(container, customers = null, materials = null, onSuccess = null, editInvoice = null, selectedSeries = null) {
  let defaultInvNo;
  let activeSeries = typeof selectedSeries !== "undefined" ? selectedSeries : null;
  let options;
  let root;
  try {
    state.recomputeAllStocks();
    root = document.getElementById("modal-container-root") || container;
    if (!customers) customers = state.getContacts().filter(c => c.type === "customer" || c.listInCustomerList === true);
    customers.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    materials = state.getMaterials();
    options = state.getOptions();
    
    defaultInvNo = 'INV-2026-' + String(state.getInvoices().length + 1).padStart(3, '0');
    activeSeries = selectedSeries;
    if (editInvoice) {
      if (editInvoice.seriesId) {
        activeSeries = state.getSeriesMaster().find(s => s.id === editInvoice.seriesId);
      } else if (editInvoice.voucherNo || editInvoice.id) {
        const vNo = String(editInvoice.voucherNo || editInvoice.id || '');
        activeSeries = state.getSeriesMaster().find(s => s.txType === "Sales" && s.prefix && vNo.startsWith(s.prefix));
      }
    }
    if (!activeSeries && !editInvoice) {
      activeSeries = state.getSeriesMaster().find(s => s.txType === "Sales" && s.seriesType === "LOCAL" && s.id !== "SER-B2B-SALES") || state.getSeriesMaster().find(s => s.txType === "Sales" && s.seriesType === "LOCAL");
    }
    if (activeSeries) {
      const live = state.getSeriesMaster().find(s => s.id === activeSeries.id);
      if (live) activeSeries = live;
    }
    if (activeSeries) {
      const num = (activeSeries.currentNumber || activeSeries.startingNumber || 1);
      const digits = parseInt(activeSeries.digits) || 4;
      defaultInvNo = (activeSeries.prefix || '') + String(num).padStart(digits, '0');
    }
  } catch(err) {
    alert("Error initializing modal: " + err.message);
    console.error(err);
    return;
  }

  const activeCompanyId = state.getActiveCompanyId();
  const activeCompany = state.getRegisteredCompanies().find(c => c.id === activeCompanyId);
  const isCompUnregistered = state.isCompanyUnregistered ? state.isCompanyUnregistered() : false;
  const companyState = activeCompany ? (activeCompany.state || "KERALA").toUpperCase() : "KERALA";
  const isLocalSeries = activeSeries && activeSeries.seriesType === "LOCAL";
  const isIgstSeries = activeSeries && (activeSeries.seriesType === "INTERSTATE" || activeSeries.seriesType === "IGST" || activeSeries.seriesType === "OUTSTATE");
  
  const allStates = ["KERALA", "TAMIL NADU", "KARNATAKA", "MAHARASHTRA", "DELHI", "ANDHRA PRADESH", "OUTSTATE"];
  let stateOptionsHtml = "";
  if (isLocalSeries) {
    stateOptionsHtml = `<option value="${companyState}" selected>${companyState}</option>`;
  } else if (isIgstSeries) {
    stateOptionsHtml = allStates.filter(s => s !== companyState).map(s => `<option value="${s}">${s}</option>`).join("");
  } else {
    stateOptionsHtml = allStates.map(s => `<option value="${s}" ${s === companyState ? 'selected' : ''}>${s}</option>`).join("");
  }

  // Helper to calculate dynamic top row grid template
  const getTopRowGridTemplate = (isSiteVisible = false) => {
    let cols = ["110px", "2.4fr"]; // S.No, Customer
    if (isSiteVisible) cols.push("1.1fr");
    if (options.enableEmployeeSales) cols.push("1fr");
    if (options.enableInfluencerSales) cols.push("1.2fr");
    cols.push("0.9fr", "1fr", "1fr"); // State, Inv Date, Due Date
    return cols.join(" ");
  };

  const initialTopRowGrid = getTopRowGridTemplate(false);

  const existingOverlay = document.getElementById("sales-bill-modal-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }
  document.querySelectorAll("#select-series-modal").forEach(el => {
    let p = el.parentElement;
    if (p && p.id !== "modal-container-root" && p !== document.body) p.remove();
    else el.remove();
  });

  const modalEl = document.createElement("div");
  modalEl.id = "sales-bill-modal-overlay";
  modalEl.className = "modal-overlay active";
  modalEl.style.position = "fixed";
  modalEl.style.top = "0";
  modalEl.style.left = "0";
  modalEl.style.width = "100%";
  modalEl.style.height = "100%";
  modalEl.style.display = "flex";
  modalEl.style.justifyContent = "center";
  modalEl.style.alignItems = "center";
  modalEl.style.background = "rgba(15,23,42,0.3)";
  modalEl.style.backdropFilter = "blur(1px)";
  modalEl.style.zIndex = String(2000 + (root.children ? root.children.length : 0) * 10);

  modalEl.innerHTML = `
      <div class="modal-container modal-lg" style="position: relative; max-width:1600px; width: 98vw; background-color:#cbd5e1; color:#0f172a; padding:15px; font-family: var(--font-body); border: 2px solid #5a7b9c; border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); font-size:0.85rem;">
        ${editInvoice && editInvoice.isCancelled ? `
          <div class="cancelled-watermark" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 8rem; font-weight: 900; color: rgba(220, 38, 38, 0.15); pointer-events: none; white-space: nowrap; z-index: 1000; text-transform: uppercase; letter-spacing: 10px; font-family: sans-serif; border: 15px solid rgba(220, 38, 38, 0.15); padding: 10px 30px; border-radius: 20px;">CANCELLED</div>
        ` : ''}
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 4px 4px 0 0; border-bottom: 1px solid #1d4ed8;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div style="font-size:1.15rem; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${activeCompany ? activeCompany.name : 'ERP SYSTEM'}</div>
            <div style="font-size:0.7rem; color:#e0f2fe; font-weight:500; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-cart-shopping"></i> SALES ENTRY [Bill Series: &lt;${activeSeries ? activeSeries.name : 'DEFAULT'}&gt;]</div>
          </div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.3rem; cursor:pointer;" id="inv-close-btn-header">&times;</button>
        </div>

        <form id="create-invoice-form" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          <!-- Top Row metadata inputs -->
          <div id="inv-top-row" style="background-color:#f1f5f9; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; display:grid; grid-template-columns: ${initialTopRowGrid}; gap:8px; align-items:start;">
            <div>
              <div style="height:15px; margin-bottom:3px; text-align:center;">
                <label style="font-weight:700; font-size:0.72rem; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.3px; display:block; white-space:nowrap;">S. No.</label>
              </div>
              <input type="text" id="inv-refno" class="form-control" style="background-color:#e0e7ff; color:#1e3a8a; font-weight:800; text-align:center; height:28px; font-size:0.85rem; width:100%; border:1px solid #93c5fd; border-radius:4px; box-sizing:border-box; letter-spacing:0.5px;" value="${editInvoice ? (editInvoice.voucherNo || editInvoice.id) : defaultInvNo}" readonly tabindex="-1">
            </div>

            <div style="position:relative;" id="inv-customer-combobox-wrapper">
              <div style="display:flex; justify-content:space-between; align-items:center; height:15px; margin-bottom:3px;">
                <label style="font-weight:700; font-size:0.72rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.3px; white-space:nowrap;">Customer Name <span style="color:#ef4444;">*</span></label>
                <span style="font-size:0.68rem; color:#64748b; font-weight:600;">(Search / F8)</span>
              </div>
              <div style="display:flex; align-items:center; gap:3px;">
                <button type="button" id="btn-inv-add-customer" title="Add New Customer (F4)" style="background:#10b981; border:none; color:white; font-weight:700; font-size:0.95rem; height:28px; width:28px; border-radius:4px; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:0;">+</button>
                <div style="position:relative; flex:1; min-width:0;">
                  <input type="text" id="inv-customer-search" class="form-control" autocomplete="off" spellcheck="false" placeholder="-- Type to Search Customer / CASH --" style="background-color:#ffffff; color:#0f172a; height:28px; padding:2px 22px 2px 8px; font-size:0.8rem; width:100%; font-weight:700; border:1px solid #94a3b8; border-radius:4px; box-sizing:border-box;" required>
                  <span id="btn-inv-customer-dropdown-toggle" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); cursor:pointer; color:#64748b; font-size:0.7rem; user-select:none; line-height:1;" title="Click to view all customers">▼</span>
                </div>
                <select id="inv-customer" class="form-control" style="display:none;" required>
                  <option value="">-- Choose Customer --</option>
                  <option value="__CASH__">-- CASH SALES --</option>
                  ${customers.map(c => `<option value="${c.id}" data-sitetype="${c.siteType || 'single'}" data-sites="${(c.sites || []).join(',')}">${c.name} (Bal: \u20B9${c.balance.toFixed(2)})</option>`).join("")}
                </select>
                <button type="button" id="btn-inv-customer-history" title="View Customer Sales History (F8)" style="background:#0284c7; border:none; color:white; font-weight:700; font-size:0.72rem; height:28px; padding:0 6px; border-radius:4px; cursor:pointer; flex-shrink:0; display:flex; align-items:center; gap:3px; white-space:nowrap;">
                  <i class="fa-solid fa-clock-rotate-left"></i> F8
                </button>
              </div>
              <div id="inv-customer-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; min-width:360px; max-width:500px; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:99999; border-radius:0 0 5px 5px; overflow:hidden; margin-top:2px;">
                <div id="inv-customer-list" style="max-height:220px; overflow-y:auto; background:white;"></div>
                <div style="background:linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%); border-top:1px solid #93c5fd; padding:3px 8px; display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; font-weight:700; color:#1e3b8b; user-select:none;">
                  <span>↑↓ to navigate, Enter to select</span>
                  <span>Search by Name, Phone, GSTIN</span>
                </div>
              </div>
            </div>

            <div id="inv-site-container" style="display: none;">
              <div style="height:15px; margin-bottom:3px;">
                <label style="font-weight:700; font-size:0.72rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.3px; white-space:nowrap; display:block;">Site Name <span style="color:#ef4444;">*</span></label>
              </div>
              <select id="inv-site" class="form-control" style="background-color:white; color:black; height:28px; padding:2px 6px; font-size:0.8rem; border:1px solid #94a3b8; border-radius:4px; width:100%; box-sizing:border-box;">
                <option value="">-- Select Site --</option>
              </select>
            </div>

            <div style="display: ${options.enableEmployeeSales ? 'block' : 'none'};">
              <div style="height:15px; margin-bottom:3px;">
                <label style="font-weight:700; font-size:0.72rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.3px; white-space:nowrap; display:block;">Employee</label>
              </div>
              <input type="text" id="inv-employee" class="form-control" style="background-color:white; color:black; height:28px; padding:2px 6px; font-size:0.8rem; border:1px solid #94a3b8; border-radius:4px; width:100%; box-sizing:border-box;" value="${editInvoice ? editInvoice.employee || editInvoice.doctor || '' : ''}" placeholder="Employee Name">
            </div>

            <div style="display: ${options.enableInfluencerSales ? 'block' : 'none'};">
              <div style="height:15px; margin-bottom:3px;">
                <label style="font-weight:700; font-size:0.72rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.3px; white-space:nowrap; display:block;">Influencer</label>
              </div>
              <div style="display:flex; align-items:center; gap:3px;">
                <select id="inv-influencer" class="form-control" style="background-color:white; color:black; height:28px; padding:2px 6px; font-size:0.8rem; border:1px solid #94a3b8; border-radius:4px; flex-grow:1; min-width:0; box-sizing:border-box;">
                  <option value="">-- Choose Influencer --</option>
                  ${state.getInfluencers().map(inf => `<option value="${inf.name}" ${editInvoice && editInvoice.influencer === inf.name ? 'selected' : ''}>${inf.name}</option>`).join("")}
                </select>
                <button type="button" id="btn-inv-add-influencer" title="Add New Influencer" style="background:#10b981; border:none; color:white; font-weight:700; font-size:0.95rem; height:28px; width:28px; border-radius:4px; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:0;">+</button>
              </div>
            </div>

            <div>
              <div style="height:15px; margin-bottom:3px;">
                <label style="font-weight:700; font-size:0.72rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.3px; white-space:nowrap; display:block;">State</label>
              </div>
              <select id="inv-state" class="form-control" style="background-color:white; color:black; height:28px; padding:2px 6px; font-size:0.8rem; border:1px solid #94a3b8; border-radius:4px; width:100%; box-sizing:border-box;">
                ${stateOptionsHtml}
              </select>
            </div>

            <div>
              <div style="height:15px; margin-bottom:3px;">
                <label style="font-weight:700; font-size:0.72rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.3px; white-space:nowrap; display:block;">Invoice Date <span style="color:#ef4444;">*</span></label>
              </div>
              <input type="date" id="inv-date" class="form-control" style="background-color:white; color:black; height:28px; padding:2px 6px; font-size:0.8rem; border:1px solid #94a3b8; border-radius:4px; width:100%; box-sizing:border-box;" value="${editInvoice ? editInvoice.date : state.getLoginDate()}" required>
            </div>

            <div>
              <div style="height:15px; margin-bottom:3px;">
                <label style="font-weight:700; font-size:0.72rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.3px; white-space:nowrap; display:block;">Due Date <span style="color:#ef4444;">*</span></label>
              </div>
              <input type="date" id="inv-duedate" class="form-control" style="background-color:white; color:black; height:28px; padding:2px 6px; font-size:0.8rem; border:1px solid #94a3b8; border-radius:4px; width:100%; box-sizing:border-box;" value="${editInvoice ? editInvoice.dueDate : state.getLoginDate()}" min="${editInvoice ? (editInvoice.date || state.getLoginDate()) : state.getLoginDate()}" required>
            </div>
          </div>

          <!-- Product Ribbon bar -->
          <div style="background-color:#94a3b8; padding:8px; border:1px solid #475569; border-radius:var(--border-radius-sm); display:grid; grid-template-columns: 1.8fr 1.2fr 1fr 0.6fr 0.6fr 0.8fr 0.8fr 0.6fr 0.6fr 80px; gap:4px; align-items:end;">
            <div style="position: relative;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <label style="font-weight:700; font-size:0.75rem; color:black;">Product Name (F10)</label>
                <a href="#" id="ribbon-new-product-sale" style="font-size:0.7rem; font-weight:700; color:#1e3b8b; text-decoration:underline;">New Product [F9]</a>
              </div>
              <div style="position:relative; display:flex; align-items:center;">
                <input type="text" id="ribbon-sale-product" class="form-control" autocomplete="off" spellcheck="false" placeholder="-- Choose/Type Product --" style="background-color:white; color:black; padding:2px 22px 2px 5px; font-size:0.75rem; width:100%; border:1px solid #64748b; border-radius:2px;">
                <span id="btn-ribbon-sale-product-toggle" style="position:absolute; right:6px; cursor:pointer; color:#64748b; font-size:0.7rem; user-select:none; line-height:1;" title="Click to view all products">▼</span>
              </div>
              <div id="ribbon-sale-product-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; min-width:280px; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:9999; border-radius:0 0 6px 6px; overflow:hidden;">
                <div id="ribbon-sale-product-list" style="max-height:180px; overflow-y:auto; background:white;"></div>
                <div style="background:linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%); border-top:1px solid #93c5fd; padding:3px 6px; text-align:center; font-size:0.72rem; font-weight:700; color:#1e3b8b; user-select:none; border-radius:0 0 5px 5px;">
                  Double click or Press Enter to select
                </div>
              </div>
            </div>
            <div style="position:relative;">
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Code/Barcode</label>
              <div style="position:relative; display:flex; align-items:center;">
                <input type="text" id="ribbon-sale-code-search" class="form-control" autocomplete="off" spellcheck="false" placeholder="-- Code/Model --" style="background-color:white; color:black; padding:2px 20px 2px 5px; font-size:0.75rem; width:100%; border:1px solid #64748b; border-radius:2px;" disabled>
                <span id="btn-ribbon-sale-code-toggle" style="position:absolute; right:5px; cursor:pointer; color:#64748b; font-size:0.7rem; user-select:none; line-height:1;" title="Click to view codes">▼</span>
              </div>
              <select id="ribbon-sale-code" class="form-control" style="display:none;" disabled>
                <option value="">-- Code/Model --</option>
              </select>
              <div id="ribbon-sale-code-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; min-width:200px; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:9999; border-radius:0 0 6px 6px; overflow:hidden;">
                <div id="ribbon-sale-code-list" style="max-height:160px; overflow-y:auto; background:white;"></div>
                <div style="background:linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%); border-top:1px solid #93c5fd; padding:3px 6px; text-align:center; font-size:0.72rem; font-weight:700; color:#1e3b8b; user-select:none; border-radius:0 0 5px 5px;">
                  Double click or Press Enter to select
                </div>
              </div>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Batch</label>
              <select id="ribbon-sale-batch" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" disabled>
                <option value="">-- Batch --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Qty</label>
              <input type="number" step="0.01" id="ribbon-sale-qty" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Unit</label>
              <select id="ribbon-sale-unit" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;">
                ${getUnitOptionsHTML()}
              </select>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Rate [Excl]</label>
              <input type="number" step="0.01" id="ribbon-sale-rate" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0.00">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">MRP</label>
              <input type="number" step="0.01" id="ribbon-sale-mrp" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0.00">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Dis%</label>
              <input type="number" step="0.1" id="ribbon-sale-dispercent" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" value="0">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Dis Amt</label>
              <input type="number" step="0.01" id="ribbon-sale-disamt" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" value="0.00">
            </div>
            <button type="button" class="btn btn-primary" id="btn-ribbon-sale-add" style="padding:4px; font-size:0.75rem; font-weight:bold; height:28px; width:100%; background-color:#1e3b8b; border:none; color:white;">Add</button>
          </div>

          <!-- Stock feedback label -->
          <div style="background-color:#cbd5e1; border:1px solid #94a3b8; padding:3px 8px; font-weight:700; font-size:0.75rem; color:#1e293b;" id="sale-stock-feedback">
            STOCK: <span id="lbl-sale-availstock">0.00</span>
          </div>

          <!-- Main Grid -->
          <div style="border: 1px solid #94a3b8; background-color: white; min-height:180px; max-height:280px; overflow-y:auto; border-radius: var(--border-radius-sm);">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem; color:black;">
              <thead>
                <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
                  <th style="padding:4px 6px;">Product Name</th>
                  <th style="padding:4px 6px;">Code/Model</th>
                  <th style="padding:4px 6px;">Batch</th>
                  <th style="padding:4px 6px; text-align:right;">Qty</th>
                  <th style="padding:4px 6px; text-align:right;">Rate</th>
                  <th style="padding:4px 6px; text-align:right;">Amount</th>
                  <th style="padding:4px 6px; text-align:right;">Dis Amt</th>
                  <th style="padding:4px 6px; text-align:right;">Net Value</th>
                  <th style="padding:4px 6px; text-align:right; display:${isCompUnregistered ? 'none' : ''};">GST %</th>
                  <th style="padding:4px 6px; text-align:right; display:${isCompUnregistered ? 'none' : ''};">GST AMT</th>
                  <th style="padding:4px 6px; text-align:right; font-weight:600; color:#1e40af;">Net Amount</th>
                  <th style="padding:4px 6px; text-align:center; width:40px;">Remove</th>
                </tr>
              </thead>
              <tbody id="sales-grid-body">
                <!-- Rows populated dynamically -->
              </tbody>
            </table>
          </div>

          <!-- Bottom panel calculations -->
          <div style="display:grid; grid-template-columns: ${isCompUnregistered ? '1.2fr 1.2fr 1.2fr' : '1.2fr 1fr 1fr 1.2fr'}; gap:10px; background-color:#cbd5e1; padding:8px; border:1px solid #94a3b8; border-radius:var(--border-radius-sm);">
            
            <!-- General discount and Pay mode -->
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                <div>
                  <label style="font-weight:600; font-size:0.75rem;">Disc %</label>
                  <input type="number" step="0.1" id="inv-discount-percent" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;" value="0">
                </div>
                <div>
                  <label style="font-weight:600; font-size:0.75rem;">Discount Amount</label>
                  <input type="number" step="0.01" id="inv-discount-amt" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;" value="0.00">
                </div>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:4px; align-items:center;">
                <label style="font-weight:600; font-size:0.75rem;">Pay Mode</label>
                <select id="inv-paymode" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;">
                  <option value="Credit" selected>Credit</option>
                  <option value="Cash">Cash</option>
                  ${state.getLedgers().filter(l => l.groupName === 'CASH-IN-HAND' || l.groupName === 'BANK ACCOUNTS').filter(l => (l.name || '').toUpperCase() !== 'CASH').map(l => `<option value="${l.name}">${l.name}</option>`).join('')}
                </select>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:4px; align-items:center;">
                <label style="font-weight:600; font-size:0.75rem;">Crdt. Period (Days)</label>
                <input type="number" id="inv-crperiod" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;" value="0">
              </div>
            </div>

            <!-- Tax splits -->
            <div style="border: 1px solid #94a3b8; background-color:#f1f5f9; padding:6px; border-radius:var(--border-radius-sm); display:${isCompUnregistered ? 'none' : 'flex'}; flex-direction:column; gap:2px;">
              <div style="background-color:#1e3b8b; color:white; font-size:0.7rem; font-weight:600; padding:1px 6px; text-align:center;">TAX BREAKDOWN</div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                <div>
                  <label style="font-size:0.68rem; font-weight:600;">CGST</label>
                  <input type="text" id="inv-cgst" class="form-control" style="background-color:#e2e8f0; color:black; padding:1px 4px; font-size:0.75rem;" value="0.00" readonly>
                </div>
                <div>
                  <label style="font-size:0.68rem; font-weight:600;">SGST</label>
                  <input type="text" id="inv-sgst" class="form-control" style="background-color:#e2e8f0; color:black; padding:1px 4px; font-size:0.75rem;" value="0.00" readonly>
                </div>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                <div>
                  <label style="font-size:0.68rem; font-weight:600;">IGST</label>
                  <input type="text" id="inv-igst" class="form-control" style="background-color:#e2e8f0; color:black; padding:1px 4px; font-size:0.75rem;" value="0.00" readonly>
                </div>
                <div>
                  <label style="font-size:0.68rem; font-weight:600;">CESS</label>
                  <input type="text" id="inv-cess" class="form-control" style="background-color:#e2e8f0; color:black; padding:1px 4px; font-size:0.75rem;" value="0.00" readonly>
                </div>
              </div>
            </div>

            <!-- Adjustments/Narrations -->
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:grid; grid-template-columns: 110px 1fr auto; gap:4px; align-items:center;">
                <label style="font-weight:600; font-size:0.75rem;">Adjustments</label>
                <input type="number" step="0.01" id="inv-adjustments" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;" value="0.00">
                <button type="button" id="btn-clear-sales-adjustments" title="Clear All Adjustments" style="padding:1px 5px; font-size:0.7rem; background:#ef4444; color:white; border:none; border-radius:3px; cursor:pointer;">Clear</button>
              </div>
              <div style="display:${options.enableCessInSalesBill ? 'grid' : 'none'}; grid-template-columns: 110px 1fr; gap:4px; align-items:center;">
                <label style="font-weight:600; font-size:0.75rem;">Addl. Cess</label>
                <input type="number" step="0.01" id="inv-addlcess" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;" value="0.00">
              </div>
              <div style="display:grid; grid-template-columns: 110px 1fr; gap:4px; align-items:center;">
                <label style="font-weight:600; font-size:0.75rem;">Round Off</label>
                <input type="number" step="0.01" id="inv-roundoff" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;" value="0.00">
              </div>
            </div>

            <!-- Net Total Box -->
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; background-color:#1e293b; color:#10b981; border-radius:var(--border-radius-sm); padding:6px; border:2px solid #475569;">
              <span style="font-size:0.7rem; font-weight:700; color:#94a3b8; text-transform:uppercase;">Grand Net Total</span>
              <strong id="inv-nettotal-box" style="font-size:1.6rem; font-weight:900;">\u20B90.00</strong>
            </div>

          </div>

          <!-- Customer Closing Balance Bar (Bottom of Sales Window) -->
          <div id="inv-customer-balance-bar" style="background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%); color: white; padding: 6px 14px; border-radius: 4px; border: 1.5px solid #475569; display: ${options.enablePartyClosingBalanceBottom !== false ? 'flex' : 'none'}; justify-content: space-between; align-items: center; font-size: 0.82rem; box-shadow: 0 2px 4px rgba(0,0,0,0.15); margin-top: 2px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #94a3b8; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-scale-balanced" style="color:#38bdf8;"></i> Customer Closing Balance:</span>
              <span id="inv-cust-balance-name" style="font-weight: 700; color: #f8fafc;">-- NO CUSTOMER SELECTED --</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #cbd5e1; font-size: 0.75rem; font-weight: 600;">Closing Balance (Up to Date):</span>
              <span id="inv-cust-balance-val" style="font-size: 1.05rem; font-weight: 800; color: #fbbf24; background: rgba(0,0,0,0.4); padding: 2px 10px; border-radius: 3px; border: 1px solid #475569;">
                ₹0.00
              </span>
            </div>
          </div>

          <!-- Narrations & Footer buttons -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:4px;">
            <div style="display:flex; align-items:center; gap:8px; flex-grow:1;">
              <label style="font-weight:700; font-size:0.75rem;">Narration:</label>
              <input type="text" id="inv-narration" class="form-control" style="background-color:white; color:black; padding:4px 8px; font-size:0.8rem; flex-grow:1; max-width:350px;" placeholder="Enter invoice details or remarks...">
              <label style="font-weight:700; font-size:0.75rem; margin-left:10px;">Vehicle No:</label>
              <input type="text" id="inv-vehicle-no" class="form-control" style="background-color:white; color:black; padding:4px 8px; font-size:0.8rem; width:110px;" placeholder="Vehicle No" value="${editInvoice ? (editInvoice.vehicleNo || '') : ''}">
              <div id="inv-headloader-container" style="display: ${options.enableHeadloader !== false ? 'flex' : 'none'}; align-items: center; gap: 4px;">
                <label style="font-weight:700; font-size:0.75rem; margin-left:8px;" title="Loading / Vehicle Type">Load Type:</label>
                <select id="inv-headloader-type" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem; width:150px; height:28px;">
                  <option value="none" ${editInvoice && (editInvoice.headloaderType === 'none' || editInvoice.headloaderType === 'no_charge' || editInvoice.headloaderType === 'No Loading Charge') ? 'selected' : ''}>🚫 No Loading Charge</option>
                  ${(state.getHeadloaderTypes ? state.getHeadloaderTypes('loading') : [{id:'std', name:'Standard'}]).map(t => {
                    const selVal = editInvoice ? (editInvoice.headloaderType || editInvoice.handlingType || editInvoice.loadingType || '') : '';
                    const isSelected = selVal ? (selVal === t.id || selVal === t.name) : t.isDefault;
                    return `<option value="${t.id}" ${isSelected ? 'selected' : ''}>${t.name}</option>`;
                  }).join('')}
                </select>
              </div>
              <button type="button" id="btn-inv-shipping-address" title="Shipping Address" style="background:#f97316; border:none; color:white; font-weight:700; font-size:0.75rem; height:28px; padding:0 8px; border-radius:4px; cursor:pointer; flex-shrink:0; margin-left:8px;">Ship Address</button>
              ${editInvoice ? `
                <button type="button" class="btn btn-danger" id="btn-inv-void" style="background-color:#ef4444; border:none; color:white; padding:4px 12px; font-weight:700; margin-left:8px;"><i class="fa-solid fa-ban"></i> Cancel Bill</button>
              ` : ''}
            </div>
            
            <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:6px; margin:0; padding:0; flex-shrink:0;">
              <button type="button" class="btn btn-secondary" id="btn-inv-search" style="padding:4px 12px; font-weight:700; background-color: #0284c7; border: none; color: white;"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
              <button type="button" class="btn btn-secondary" id="btn-inv-prev" style="padding:4px 12px; font-weight:700; background-color: #475569; border: none; color: white;">&lt;</button>
              <button type="button" class="btn btn-secondary" id="btn-inv-next" style="padding:4px 12px; font-weight:700; background-color: #475569; border: none; color: white;">&gt;</button>
              <button type="button" class="btn btn-secondary" id="btn-inv-print" style="padding:4px 12px; font-weight:700; background-color: #64748b; border: none; color: white;" ${editInvoice ? '' : 'disabled'}><i class="fa-solid fa-print"></i> Print</button>
              <button type="button" class="btn btn-secondary" id="btn-inv-new" style="padding:4px 12px; font-weight:700; background-color: #0d9488; border: none; color: white;">New</button>
              <button type="button" class="btn btn-secondary" id="btn-inv-cancel" style="padding:4px 12px; font-weight:700;">Close</button>
              <button type="submit" class="btn btn-primary" style="padding:4px 16px; font-weight:700;">Save Invoice</button>
            </div>
          </div>
        </form>
      </div>
  `;

  root.appendChild(modalEl);

  const overlay = modalEl;
  const winBox = overlay ? overlay.firstElementChild : null;
  const headerBar = winBox ? winBox.firstElementChild : null;
  if (winBox && headerBar) makeDraggable(winBox, headerBar);

  let onDocClickCloseProductDropdown = null;
  let onDocClickCloseSaleCodeDropdown = null;

  const openCustomerSalesHistory = () => {
    const custSelect = document.getElementById("inv-customer");
    const custId = custSelect ? custSelect.value : "";
    if (!custId) {
      alert("Please select a customer first to view history (F8).");
      if (custSelect) custSelect.focus();
      return;
    }
    let custObj = null;
    if (custId === "__CASH__") {
      custObj = { id: "__CASH__", name: "CASH SALES" };
    } else {
      custObj = state.getContacts().find(c => c.id === custId) || { id: custId, name: "Customer" };
    }
    showCustomerSalesHistoryModal(custObj, (selectedInvId) => {
      const invToEdit = state.getInvoices().find(i => String(i.id) === String(selectedInvId));
      if (invToEdit) {
        close();
        showInvoiceBuilderModal(container, customers, materials, onSuccess, invToEdit);
      }
    });
  };

  const handleGlobalKeydown = (e) => {
    const modalForm = document.getElementById("create-invoice-form");
    if (!modalForm) {
      window.removeEventListener("keydown", handleGlobalKeydown);
      if (onDocClickCloseProductDropdown) {
        document.removeEventListener("click", onDocClickCloseProductDropdown);
      }
      if (onDocClickCloseSaleCodeDropdown) {
        document.removeEventListener("click", onDocClickCloseSaleCodeDropdown);
      }
      return;
    }
    if (e.key === "F8") {
      e.preventDefault();
      openCustomerSalesHistory();
    }
    if (e.key === "PageUp") {
      e.preventDefault();
      document.getElementById("btn-inv-prev")?.click();
    }
    if (e.key === "PageDown") {
      e.preventDefault();
      document.getElementById("btn-inv-next")?.click();
    }
    if (e.key === "F10") {
      e.preventDefault();
      const pInput = document.getElementById("ribbon-sale-product");
      const pDrop = document.getElementById("ribbon-sale-product-dropdown");
      if (pInput) {
        pInput.focus();
        pInput.select();
        if (pDrop) pDrop.style.display = "block";
      }
    }
  };
  window.addEventListener("keydown", handleGlobalKeydown);

  const close = () => { 
    window.removeEventListener("keydown", handleGlobalKeydown);
    if (onDocClickCloseProductDropdown) {
      document.removeEventListener("click", onDocClickCloseProductDropdown);
    }
    if (onDocClickCloseSaleCodeDropdown) {
      document.removeEventListener("click", onDocClickCloseSaleCodeDropdown);
    }
    modalEl.remove();
  };

  document.getElementById("inv-close-btn-header")?.addEventListener("click", close);
  document.getElementById("btn-inv-cancel")?.addEventListener("click", close);
  document.getElementById("btn-inv-new").addEventListener("click", () => {
    close();
    showInvoiceBuilderModal(container, customers, materials, onSuccess, null, activeSeries);
  });

  // Bind Previous and Next buttons
  const allInvoices = (state.getInvoices() || []).filter(i => i && !i.isCancelled);
  let seriesInvoices = allInvoices.filter(inv => {
    if (!activeSeries) return true;
    if (inv.seriesId && inv.seriesId === activeSeries.id) return true;
    if (activeSeries.prefix) {
      if (inv.voucherNo && String(inv.voucherNo).startsWith(activeSeries.prefix)) return true;
      if (inv.id && String(inv.id).startsWith(activeSeries.prefix)) return true;
    }
    if (!inv.seriesId && activeSeries.id === 'SER-LOCAL-SALES' && !String(inv.voucherNo || '').startsWith('B2B00')) return true;
    return false;
  });
  if (seriesInvoices.length === 0) {
    seriesInvoices = allInvoices;
  }
  seriesInvoices.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    const aNum = String(a.voucherNo || a.id || '');
    const bNum = String(b.voucherNo || b.id || '');
    return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
  });
  
  let curIdx = editInvoice ? seriesInvoices.findIndex(inv => String(inv.id) === String(editInvoice.id) || (inv.voucherNo && String(inv.voucherNo) === String(editInvoice.voucherNo))) : -1;
  if (curIdx === -1 && editInvoice) {
    curIdx = allInvoices.findIndex(inv => String(inv.id) === String(editInvoice.id) || (inv.voucherNo && String(inv.voucherNo) === String(editInvoice.voucherNo)));
    if (curIdx !== -1) {
      seriesInvoices = allInvoices;
    }
  }

  document.getElementById("btn-inv-prev")?.addEventListener("click", () => {
    if (curIdx > 0) {
      close();
      showInvoiceBuilderModal(container, customers, materials, onSuccess, seriesInvoices[curIdx - 1], activeSeries);
    } else if (curIdx === -1 && seriesInvoices.length > 0) {
      close();
      showInvoiceBuilderModal(container, customers, materials, onSuccess, seriesInvoices[seriesInvoices.length - 1], activeSeries);
    }
  });

  document.getElementById("btn-inv-next")?.addEventListener("click", () => {
    if (curIdx >= 0 && curIdx < seriesInvoices.length - 1) {
      close();
      showInvoiceBuilderModal(container, customers, materials, onSuccess, seriesInvoices[curIdx + 1], activeSeries);
    } else if (curIdx === seriesInvoices.length - 1) {
      close();
      showInvoiceBuilderModal(container, customers, materials, onSuccess, null, activeSeries);
    }
  });

  // Bind Search Button to Open Custom Styled Search Window
  document.getElementById("btn-inv-search").addEventListener("click", () => {
    const searchOverlay = document.createElement("div");
    searchOverlay.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100000;";
    
    // Default from and to date is current system date
    const systemDate = new Date().toISOString().split("T")[0];
    
    searchOverlay.innerHTML = `
      <div style="background: #cbd5e1; border: 2px solid #1e3b8b; border-radius: 4px; width: 900px; padding: 8px; font-family: sans-serif; font-size: 0.8rem; color: black; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        <!-- Title bar -->
        <div style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: white; padding: 4px 8px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border-radius: 2px;">
          <span>Search</span>
          <button type="button" id="btn-close-search-popup" style="background: none; border: none; color: white; font-weight: bold; cursor: pointer; font-size: 1.2rem;">&times;</button>
        </div>
        
        <!-- Dates row -->
        <div style="display: flex; gap: 15px; align-items: center; background: #e2e8f0; padding: 6px; border: 1px solid #94a3b8; border-radius: 2px;">
          <div>
            <label style="font-weight: bold;">From </label>
            <input type="date" id="search-log-from" class="form-control" style="width: 130px; display: inline-block; padding: 2px; font-size: 0.8rem;" value="${systemDate}">
          </div>
          <div>
            <label style="font-weight: bold;">To </label>
            <input type="date" id="search-log-to" class="form-control" style="width: 130px; display: inline-block; padding: 2px; font-size: 0.8rem;" value="${systemDate}">
          </div>
          <div style="margin-left: auto; display: flex; gap: 6px;">
            <button type="button" id="btn-search-display" style="background: #cbd5e1; border: 1px solid #475569; padding: 2px 12px; font-weight: bold; cursor: pointer; box-shadow: 1px 1px 2px white inset;">Display</button>
            <button type="button" id="btn-search-close" style="background: #cbd5e1; border: 1px solid #475569; padding: 2px 12px; font-weight: bold; cursor: pointer; box-shadow: 1px 1px 2px white inset;">Close</button>
          </div>
        </div>
        
        <!-- Search textboxes grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background: #e2e8f0; padding: 6px; border: 1px solid #94a3b8; border-radius: 2px;">
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Bill No</label>
            <input type="text" id="filter-billno" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Customer</label>
            <input type="text" id="filter-customer" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Employee</label>
            <input type="text" id="filter-employee" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;" placeholder="All Employees">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Pay Mode</label>
            <input type="text" id="filter-paymode" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Net Amount</label>
            <input type="text" id="filter-netamt" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;">
          </div>
        </div>
        
        <!-- Checkboxes row -->
        <div style="display: flex; gap: 20px; align-items: center; padding-left: 4px;">
          <label style="font-weight: bold; font-size: 0.75rem;"><input type="checkbox" id="chk-extended-search"> Extended Search <span style="color: #991b1b; font-weight: normal; font-size: 0.7rem;">(Will display all details containing the search text in any part of the field)</span></label>
          <label style="font-weight: bold; font-size: 0.75rem;"><input type="checkbox" id="chk-auto-search" checked> Auto Search while typing in text box</label>
        </div>
        
        <!-- Grid container -->
        <div style="background: white; border: 1px solid #94a3b8; height: 300px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.75rem; color: black;">
            <thead>
              <tr style="background: #1e3b8b; color: white; font-weight: bold; position: sticky; top: 0; z-index: 10;">
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Bill No</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Bill Date</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Customer</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Employee</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Paymode</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: right;">Net Amount</th>
              </tr>
            </thead>
            <tbody id="search-log-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    document.body.appendChild(searchOverlay);
    
    const closeSearch = () => {
      window.removeEventListener("keydown", handleSearchKeydown, true);
      searchOverlay.remove();
    };

    const handleSearchKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeSearch();
      }
    };
    window.addEventListener("keydown", handleSearchKeydown, true);
    
    searchOverlay.querySelector("#btn-close-search-popup").addEventListener("click", closeSearch);
    searchOverlay.querySelector("#btn-search-close").addEventListener("click", closeSearch);
    
    const runSearch = () => {
      const fromDate = searchOverlay.querySelector("#search-log-from").value;
      const toDate = searchOverlay.querySelector("#search-log-to").value;
      
      const billNoFilter = searchOverlay.querySelector("#filter-billno").value.toLowerCase();
      const customerFilter = searchOverlay.querySelector("#filter-customer").value.toLowerCase();
      const paymodeFilter = searchOverlay.querySelector("#filter-paymode").value.toLowerCase();
      const netamtFilter = searchOverlay.querySelector("#filter-netamt").value;
      
      const extended = searchOverlay.querySelector("#chk-extended-search").checked;
      
      const currentInvoices = state.getInvoices() || [];
      let filtered = currentInvoices.filter(x => activeSeries && (x.seriesId === activeSeries.id || (x.voucherNo && x.voucherNo.startsWith(activeSeries.prefix)) || (x.id && x.id.startsWith(activeSeries.prefix))));
      
      // Filter by Date Range
      if (fromDate) {
        filtered = filtered.filter(x => x.date >= fromDate);
      }
      if (toDate) {
        filtered = filtered.filter(x => x.date <= toDate);
      }
      
      // Filter by input boxes
      filtered = filtered.filter(x => {
        const matchesBillNo = extended ? 
          ((x.voucherNo || '').toLowerCase().includes(billNoFilter) || x.id.toLowerCase().includes(billNoFilter)) : 
          ((x.voucherNo || '').toLowerCase().startsWith(billNoFilter) || x.id.toLowerCase().startsWith(billNoFilter));
        const matchesCustomer = extended ? (x.contactName || '').toLowerCase().includes(customerFilter) : (x.contactName || '').toLowerCase().startsWith(customerFilter);
        const matchesPaymode = extended ? (x.payMode || '').toLowerCase().includes(paymodeFilter) : (x.payMode || '').toLowerCase().startsWith(paymodeFilter);
        
        let matchesNetAmt = true;
        if (netamtFilter) {
          matchesNetAmt = String(x.total).includes(netamtFilter);
        }
        
        return matchesBillNo && matchesCustomer && matchesPaymode && matchesNetAmt;
      });
      
      filtered.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        const aNum = a.voucherNo || a.id || '';
        const bNum = b.voucherNo || b.id || '';
        return aNum.localeCompare(bNum);
      });
      
      const tbody = searchOverlay.querySelector("#search-log-tbody");
      tbody.innerHTML = filtered.length === 0 ? `
        <tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">No matching transactions found.</td></tr>
      ` : filtered.map(item => `
        <tr class="log-row-item" data-id="${item.id}" style="border-bottom: 1px solid #e2e8f0; cursor: pointer; user-select: none;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
          <td style="padding: 6px; font-weight: bold; color: #1e3b8b;">${item.voucherNo || item.id}</td>
          <td style="padding: 6px;">${formatDate(item.date)}</td>
          <td style="padding: 6px;"><strong>${item.contactName || ''}</strong></td>
          <td style="padding: 6px; color: #64748b;">Admin</td>
          <td style="padding: 6px;">${item.payMode || ''}</td>
          <td style="padding: 6px; text-align: right; font-weight: bold; color: #1e40af;">\u20B9${Number(item.total || 0).toFixed(2)}</td>
        </tr>
      `).join("");
      
      tbody.querySelectorAll(".log-row-item").forEach(row => {
        row.addEventListener("dblclick", () => {
          const id = row.getAttribute("data-id");
          const found = (state.getInvoices() || []).find(x => x.id === id);
          if (found) {
            closeSearch();
            close(); // Close builder modal
            showInvoiceBuilderModal(container, customers, materials, onSuccess, found);
          }
        });
      });
    };
    
    // Bind Display button
    searchOverlay.querySelector("#btn-search-display").addEventListener("click", runSearch);
    
    // Typing listener for auto search
    const textInputs = ["#filter-billno", "#filter-customer", "#filter-paymode", "#filter-netamt"];
    textInputs.forEach(selector => {
      searchOverlay.querySelector(selector).addEventListener("input", () => {
        if (searchOverlay.querySelector("#chk-auto-search").checked) {
          runSearch();
        }
      });
    });
    
    // Initial search execution
    runSearch();
  });

  // Bind Print Button
  if (editInvoice) {
    document.getElementById("btn-inv-print").addEventListener("click", () => {
      showInvoicePrintPreview(document.getElementById("modal-container-root"), editInvoice.id);
    });
  }

  if (editInvoice && document.getElementById("btn-inv-void")) {
    document.getElementById("btn-inv-void").addEventListener("click", () => {
      const validateAdminPassword = () => {
        const pass = prompt("Enter Admin Password:");
        if (pass === null) return false;
        if (pass !== state.getAdminPassword()) {
          alert("Incorrect password!");
          return false;
        }
        return true;
      };
      if (confirm(`Are you sure you want to cancel Invoice ${editInvoice.voucherNo || editInvoice.id}?`) && validateAdminPassword()) {
        state.cancelInvoice(editInvoice.id);
        close();
        if (onSuccess) onSuccess();
      }
    });
  }

  // DOM element references
  const invDateEl = document.getElementById("inv-date");
  const invDueDateEl = document.getElementById("inv-duedate");
  const invCrPeriodEl = document.getElementById("inv-crperiod");
  const invPaymodeSelect = document.getElementById("inv-paymode");
  const invCustomerSelect = document.getElementById("inv-customer");
  const invCustomerSearch = document.getElementById("inv-customer-search");
  const invCustomerDropdown = document.getElementById("inv-customer-dropdown");
  const invCustomerListEl = document.getElementById("inv-customer-list");
  const invCustomerToggle = document.getElementById("btn-inv-customer-dropdown-toggle");
  const invSiteContainer = document.getElementById("inv-site-container");
  const invSiteSelect = document.getElementById("inv-site");
  const productSelect = document.getElementById("ribbon-sale-product");
  const productDropdown = document.getElementById("ribbon-sale-product-dropdown");
  const productListEl = document.getElementById("ribbon-sale-product-list");
  const productToggle = document.getElementById("btn-ribbon-sale-product-toggle");
  const codeSelect = document.getElementById("ribbon-sale-code");
  const codeSearch = document.getElementById("ribbon-sale-code-search");
  const codeDropdown = document.getElementById("ribbon-sale-code-dropdown");
  const codeListEl = document.getElementById("ribbon-sale-code-list");
  const codeToggle = document.getElementById("btn-ribbon-sale-code-toggle");
  const ribbonBatchSelect = document.getElementById("ribbon-sale-batch");
  const qtyInput = document.getElementById("ribbon-sale-qty");
  const unitSelect = document.getElementById("ribbon-sale-unit");
  const rateInput = document.getElementById("ribbon-sale-rate");
  const mrpInput = document.getElementById("ribbon-sale-mrp");
  const disPercentInput = document.getElementById("ribbon-sale-dispercent");
  const disAmtInput = document.getElementById("ribbon-sale-disamt");
  const addRowBtn = document.getElementById("btn-ribbon-sale-add");
  const availStockSpan = document.getElementById("lbl-sale-availstock");

  // Date helper utilities
  const addDaysToDateString = (dateStr, days) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-").map(p => parseInt(p, 10));
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return "";
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + (parseInt(days, 10) || 0));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const calculateDaysBetweenDates = (fromDateStr, toDateStr) => {
    if (!fromDateStr || !toDateStr) return 0;
    const fromParts = fromDateStr.split("-").map(p => parseInt(p, 10));
    const toParts = toDateStr.split("-").map(p => parseInt(p, 10));
    if (fromParts.length !== 3 || toParts.length !== 3) return 0;
    const fromDate = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
    const toDate = new Date(toParts[0], toParts[1] - 1, toParts[2]);
    const diffTime = toDate.getTime() - fromDate.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Cash sales lock/unlock controller for Pay Mode, Due Date, and Credit Period
  function setCashSalesLockState(isCash) {
    const paymodeSelect = document.getElementById("inv-paymode");
    const crPeriodEl = document.getElementById("inv-crperiod");
    const dueDateEl = document.getElementById("inv-duedate");
    const invDateVal = invDateEl ? invDateEl.value : state.getLoginDate();

    if (isCash) {
      if (paymodeSelect) {
        paymodeSelect.value = "Cash";
        paymodeSelect.disabled = true;
        paymodeSelect.style.backgroundColor = "#e2e8f0";
        paymodeSelect.style.cursor = "not-allowed";
      }
      if (crPeriodEl) {
        crPeriodEl.value = "0";
        crPeriodEl.readOnly = true;
        crPeriodEl.style.backgroundColor = "#e2e8f0";
        crPeriodEl.style.cursor = "not-allowed";
      }
      if (dueDateEl) {
        dueDateEl.value = invDateVal;
        dueDateEl.readOnly = true;
        dueDateEl.style.backgroundColor = "#e2e8f0";
        dueDateEl.style.cursor = "not-allowed";
      }
    } else {
      if (paymodeSelect) {
        paymodeSelect.disabled = false;
        paymodeSelect.style.backgroundColor = "#ffffff";
        paymodeSelect.style.cursor = "default";
        if (typeof editInvoice === 'undefined' || !editInvoice) {
          paymodeSelect.value = "Credit";
        }
      }
      if (crPeriodEl) {
        crPeriodEl.readOnly = false;
        crPeriodEl.style.backgroundColor = "#ffffff";
        crPeriodEl.style.cursor = "text";
      }
      if (dueDateEl) {
        dueDateEl.readOnly = false;
        dueDateEl.style.backgroundColor = "#ffffff";
        dueDateEl.style.cursor = "default";
      }
    }
  }

  // Initial cash lock state check
  if (editInvoice && editInvoice.contactId === "__CASH__") {
    setCashSalesLockState(true);
  }
  
  let activeCustomerIndex = 0;
  let currentFilteredCustomers = [];
  let onDocClickCloseCustomerDropdown = null;

  const getCustomerSearchList = () => {
    const freshCustomers = state.getContacts()
      .filter(c => c.type === "customer" || c.listInCustomerList === true)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    return [
      { id: "__CASH__", name: "-- CASH SALES --", balance: 0, isCash: true, contactPerson: "Cash Sales", mobile: "", gstin: "" },
      ...freshCustomers
    ];
  };

  const renderCustomerDropdownList = (filterText = "") => {
    if (!invCustomerListEl) return;
    const allList = getCustomerSearchList();
    const query = (filterText || "").trim().toLowerCase();

    if (!query) {
      currentFilteredCustomers = allList;
    } else {
      currentFilteredCustomers = allList.filter(c => {
        if (c.id === "__CASH__") {
          return "cash sales".includes(query) || "-- cash sales --".includes(query);
        }
        const nameMatch = (c.name || "").toLowerCase().includes(query);
        const personMatch = (c.contactPerson || "").toLowerCase().includes(query);
        const phoneMatch = (c.mobile || c.phone || "").toLowerCase().includes(query);
        const gstinMatch = (c.gstin || "").toLowerCase().includes(query);
        const areaMatch = (c.area || c.billingAddress || "").toLowerCase().includes(query);
        return nameMatch || personMatch || phoneMatch || gstinMatch || areaMatch;
      });
    }

    if (currentFilteredCustomers.length === 0) {
      invCustomerListEl.innerHTML = `<div style="padding:8px 10px; font-size:0.75rem; color:#64748b; font-style:italic; user-select:none;">No matching customers found</div>`;
      activeCustomerIndex = -1;
      return;
    }

    if (activeCustomerIndex < 0 || activeCustomerIndex >= currentFilteredCustomers.length) {
      activeCustomerIndex = 0;
    }

    invCustomerListEl.innerHTML = currentFilteredCustomers.map((c, idx) => {
      const isSelected = idx === activeCustomerIndex;
      const isCash = c.id === "__CASH__";
      const displayName = c.name || "Customer";
      const personStr = c.contactPerson && c.contactPerson !== "Cash Sales" ? ` • ${c.contactPerson}` : "";
      const phoneStr = c.mobile || c.phone ? ` • 📞 ${c.mobile || c.phone}` : "";
      const gstinStr = c.gstin ? ` • GSTIN: ${c.gstin}` : "";
      const subInfo = `${c.id}${personStr}${phoneStr}${gstinStr}`;
      const balStr = isCash ? "Cash Sale" : `Bal: \u20B9${Math.abs(c.balance || 0).toFixed(2)} ${c.balance >= 0 ? 'Dr' : 'Cr'}`;
      const balColor = isCash ? "#0284c7" : (c.balance >= 0 ? "#b45309" : "#15803d");

      return `
        <div class="inv-cust-item" data-index="${idx}" data-id="${c.id}" data-name="${displayName.replace(/"/g, '&quot;')}" style="padding:6px 10px; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background-color:${isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')}; color:${isSelected ? '#ffffff' : '#0f172a'};">
          <div style="display:flex; flex-direction:column; gap:1px; flex:1; min-width:0;">
            <strong style="font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${displayName}</strong>
            <span style="font-size:0.68rem; color:${isSelected ? '#e0f2fe' : '#64748b'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${subInfo}</span>
          </div>
          <span style="font-size:0.72rem; font-weight:bold; color:${isSelected ? '#ffffff' : balColor}; margin-left:8px; white-space:nowrap; background:${isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9'}; padding:2px 6px; border-radius:3px;">${balStr}</span>
        </div>
      `;
    }).join("");

    invCustomerListEl.querySelectorAll(".inv-cust-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-index"));
        if (activeCustomerIndex !== idx) {
          activeCustomerIndex = idx;
          updateCustomerListHighlight();
        }
      });

      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selId = item.getAttribute("data-id");
        selectCustomerAndAdvance(selId);
      };

      item.addEventListener("click", handleSelect);
      item.addEventListener("dblclick", handleSelect);
    });

    scrollActiveCustomerIntoView();
  };

  const updateCustomerListHighlight = () => {
    if (!invCustomerListEl) return;
    const items = invCustomerListEl.querySelectorAll(".inv-cust-item");
    items.forEach((item, idx) => {
      const isSelected = idx === activeCustomerIndex;
      item.style.backgroundColor = isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');
      item.style.color = isSelected ? '#ffffff' : '#0f172a';
      const subSpan = item.querySelector("span");
      if (subSpan) subSpan.style.color = isSelected ? '#e0f2fe' : '#64748b';
    });
    scrollActiveCustomerIntoView();
  };

  const scrollActiveCustomerIntoView = () => {
    if (!invCustomerListEl) return;
    const activeItem = invCustomerListEl.querySelector(`.inv-cust-item[data-index="${activeCustomerIndex}"]`);
    if (activeItem) {
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = invCustomerListEl.scrollTop;
      const containerBottom = containerTop + invCustomerListEl.clientHeight;
      if (itemTop < containerTop) {
        invCustomerListEl.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        invCustomerListEl.scrollTop = itemBottom - invCustomerListEl.clientHeight;
      }
    }
  };

  const openCustomerDropdown = () => {
    if (!invCustomerDropdown) return;
    invCustomerDropdown.style.display = "block";
    renderCustomerDropdownList(invCustomerSearch ? invCustomerSearch.value : "");
  };

  const closeCustomerDropdown = () => {
    if (!invCustomerDropdown) return;
    invCustomerDropdown.style.display = "none";
  };

  const selectCustomerAndAdvance = (customerId) => {
    if (!invCustomerSelect || !invCustomerSearch) return;
    invCustomerSelect.value = customerId;
    const matched = getCustomerSearchList().find(c => c.id === customerId);
    if (matched) {
      invCustomerSearch.value = matched.id === "__CASH__" ? "-- CASH SALES --" : matched.name;
    } else {
      invCustomerSearch.value = "";
    }
    closeCustomerDropdown();
    invCustomerSelect.dispatchEvent(new Event("change"));

    setTimeout(() => {
      if (invSiteContainer && invSiteContainer.style.display !== "none" && invSiteSelect) {
        invSiteSelect.focus();
      } else if (productSelect) {
        productSelect.focus();
      }
    }, 10);
  };

  if (invCustomerSearch) {
    invCustomerSearch.addEventListener("focus", () => {
      openCustomerDropdown();
      invCustomerSearch.select();
    });

    invCustomerSearch.addEventListener("click", () => {
      openCustomerDropdown();
    });

    invCustomerSearch.addEventListener("input", () => {
      activeCustomerIndex = 0;
      openCustomerDropdown();
    });

    invCustomerSearch.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (invCustomerDropdown && invCustomerDropdown.style.display === "none") {
          openCustomerDropdown();
        } else if (currentFilteredCustomers.length > 0) {
          activeCustomerIndex = (activeCustomerIndex + 1) % currentFilteredCustomers.length;
          updateCustomerListHighlight();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (invCustomerDropdown && invCustomerDropdown.style.display === "none") {
          openCustomerDropdown();
        } else if (currentFilteredCustomers.length > 0) {
          activeCustomerIndex = (activeCustomerIndex - 1 + currentFilteredCustomers.length) % currentFilteredCustomers.length;
          updateCustomerListHighlight();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (invCustomerDropdown && invCustomerDropdown.style.display !== "none" && activeCustomerIndex >= 0 && activeCustomerIndex < currentFilteredCustomers.length) {
          selectCustomerAndAdvance(currentFilteredCustomers[activeCustomerIndex].id);
        } else {
          const val = (invCustomerSearch.value || "").trim().toLowerCase();
          const all = getCustomerSearchList();
          const exact = all.find(c => (c.name || "").toLowerCase() === val || (c.id === "__CASH__" && val.includes("cash")));
          const partial = all.find(c => (c.name || "").toLowerCase().startsWith(val)) || all.find(c => (c.name || "").toLowerCase().includes(val));
          const matched = exact || partial;
          if (matched) {
            selectCustomerAndAdvance(matched.id);
          } else {
            closeCustomerDropdown();
            if (productSelect) productSelect.focus();
          }
        }
      } else if (e.key === "Tab") {
        if (invCustomerDropdown && invCustomerDropdown.style.display !== "none" && activeCustomerIndex >= 0 && activeCustomerIndex < currentFilteredCustomers.length) {
          const matched = currentFilteredCustomers[activeCustomerIndex];
          invCustomerSelect.value = matched.id;
          invCustomerSearch.value = matched.id === "__CASH__" ? "-- CASH SALES --" : matched.name;
          invCustomerSelect.dispatchEvent(new Event("change"));
        }
        closeCustomerDropdown();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeCustomerDropdown();
      }
    });
  }

  if (invCustomerToggle) {
    invCustomerToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (invCustomerDropdown && invCustomerDropdown.style.display === "none") {
        if (invCustomerSearch) invCustomerSearch.focus();
        openCustomerDropdown();
      } else {
        closeCustomerDropdown();
      }
    });
  }

  onDocClickCloseCustomerDropdown = (e) => {
    const wrapper = document.getElementById("inv-customer-combobox-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      closeCustomerDropdown();
    }
  };
  document.addEventListener("click", onDocClickCloseCustomerDropdown);
  
  function updateTopRowGrid() {
    const topRow = document.getElementById("inv-top-row");
    if (!topRow) return;
    const isSiteVisible = invSiteContainer && invSiteContainer.style.display !== "none";
    topRow.style.gridTemplateColumns = getTopRowGridTemplate(isSiteVisible);
  }

  const updateCustomerClosingBalanceDisplay = () => {
    const custSelect = document.getElementById("inv-customer");
    const siteSelect = document.getElementById("inv-site");
    const siteCont = document.getElementById("inv-site-container");
    const dateInput = document.getElementById("inv-date");

    const custId = custSelect ? custSelect.value : "";
    const siteVal = siteSelect && siteCont && siteCont.style.display !== "none" ? siteSelect.value : "";
    const invDateVal = dateInput ? dateInput.value : null;

    const nameEl = document.getElementById("inv-cust-balance-name");
    const valEl = document.getElementById("inv-cust-balance-val");
    const barEl = document.getElementById("inv-customer-balance-bar");

    if (!nameEl || !valEl) return;

    if (!custId) {
      nameEl.innerHTML = `<span style="color:#94a3b8; font-weight:normal;">-- Choose a Customer to view closing balance --</span>`;
      valEl.innerHTML = `<span style="color:#94a3b8;">\u20B90.00</span>`;
      if (barEl) barEl.style.borderColor = "#475569";
      return;
    }

    if (custId === "__CASH__") {
      nameEl.innerHTML = `<span style="color:#38bdf8; font-weight:bold;"><i class="fa-solid fa-money-bill-wave"></i> CASH SALES</span>`;
      valEl.innerHTML = `<span style="color:#38bdf8; font-weight:bold;">\u20B90.00 (Cash Sale)</span>`;
      if (barEl) barEl.style.borderColor = "#0284c7";
      return;
    }

    const info = state.getContactClosingBalance(custId, siteVal || null, invDateVal);
    const matchedCust = customers.find(c => c.id === custId);
    const displayName = (matchedCust ? matchedCust.name : info.name || "Customer").toUpperCase();
    const siteSuffix = siteVal ? ` <span style="background:#334155; padding:1px 6px; border-radius:3px; font-size:0.75rem; color:#93c5fd; border:1px solid #64748b;">SITE: ${siteVal.toUpperCase()}</span>` : "";

    nameEl.innerHTML = `<strong style="color:#ffffff; font-size:0.85rem;">${displayName}</strong>${siteSuffix}`;

    if (info.absBalance < 0.001) {
      valEl.innerHTML = `<span style="color:#94a3b8; font-weight:700;">\u20B90.00 (NIL BALANCE)</span>`;
      if (barEl) barEl.style.borderColor = "#475569";
    } else if (info.isDebit) {
      // Debit balance = Receivable / Outstanding payment due from customer
      valEl.innerHTML = `<span style="color:#fbbf24; font-weight:900;">${info.balanceFormatted}</span> <small style="color:#fde68a; font-size:0.72rem; font-weight:700; margin-left:3px;">(RECEIVABLE / DR)</small>`;
      if (barEl) barEl.style.borderColor = "#f59e0b";
    } else {
      // Credit balance = Advance / Credit with company
      valEl.innerHTML = `<span style="color:#34d399; font-weight:900;">${info.balanceFormatted}</span> <small style="color:#a7f3d0; font-size:0.72rem; font-weight:700; margin-left:3px;">(ADVANCE / CR)</small>`;
      if (barEl) barEl.style.borderColor = "#10b981";
    }
  };

  invCustomerSelect.addEventListener("change", () => {
    // Keep search text input in sync with select value
    const currentCustId = invCustomerSelect.value;
    const currentMatch = getCustomerSearchList().find(c => c.id === currentCustId);
    if (invCustomerSearch) {
      if (currentMatch) {
        invCustomerSearch.value = currentMatch.id === "__CASH__" ? "-- CASH SALES --" : currentMatch.name;
      } else if (!currentCustId) {
        invCustomerSearch.value = "";
      }
    }

    if (isLocalSeries) {
      const selectedCustId = invCustomerSelect.value;
      if (selectedCustId && selectedCustId !== "__CASH__") {
        const matchedCustomer = customers.find(c => c.id === selectedCustId);
        if (matchedCustomer) {
          const custState = (matchedCustomer.state || "KERALA").toUpperCase();
          if (custState !== companyState) {
            alert(`Error: Customer's registered state (${custState}) does not match the company's state (${companyState}) for local sales transactions!`);
            invCustomerSelect.value = "";
            invCustomerSelect.dispatchEvent(new Event("change"));
            return;
          }
        }
      }
    } else if (isIgstSeries) {
      const selectedCustId = invCustomerSelect.value;
      if (selectedCustId && selectedCustId !== "__CASH__") {
        const matchedCustomer = customers.find(c => c.id === selectedCustId);
        if (matchedCustomer) {
          const custState = (matchedCustomer.state || "KERALA").toUpperCase();
          if (custState === companyState) {
            alert(`Error: Customer's registered state is ${custState}. For IGST/Outstate sales, the customer must be registered in a state other than ${companyState}!`);
            invCustomerSelect.value = "";
            invCustomerSelect.dispatchEvent(new Event("change"));
            return;
          } else {
            const invStateSel = document.getElementById("inv-state");
            if (invStateSel) {
              const matchOpt = Array.from(invStateSel.options).find(opt => opt.value === custState);
              if (matchOpt) {
                invStateSel.value = custState;
              } else {
                invStateSel.value = "OUTSTATE";
              }
              invStateSel.disabled = true;
              invStateSel.dispatchEvent(new Event("change"));
            }
          }
        }
      } else {
        const invStateSel = document.getElementById("inv-state");
        if (invStateSel) {
          invStateSel.disabled = false;
        }
      }
    }
    const isCashSales = invCustomerSelect.value === "__CASH__";
    setCashSalesLockState(isCashSales);

    if (isCashSales) {
      invSiteContainer.style.display = "none";
      invSiteSelect.innerHTML = '<option value="">-- Select Site --</option>';
      invSiteSelect.required = false;
      updateTopRowGrid();
      updateCustomerClosingBalanceDisplay();
      return;
    }

    const opt = invCustomerSelect.selectedOptions[0];
    if (!opt) {
      updateTopRowGrid();
      updateCustomerClosingBalanceDisplay();
      return;
    }

    // Auto-populate customer default credit period and calculate due date if creating new invoice
    if (typeof editInvoice === 'undefined' || !editInvoice) {
      const matchedCustomer = customers.find(c => c.id === invCustomerSelect.value);
      const custCrDays = matchedCustomer && matchedCustomer.creditPeriod ? (parseInt(matchedCustomer.creditPeriod, 10) || 0) : 0;
      const crPeriodEl = document.getElementById("inv-crperiod");
      const dueDateEl = document.getElementById("inv-duedate");
      const invDateVal = invDateEl ? invDateEl.value : state.getLoginDate();
      if (crPeriodEl) crPeriodEl.value = String(custCrDays);
      if (dueDateEl) dueDateEl.value = addDaysToDateString(invDateVal, custCrDays);
    }

    const siteType = opt.getAttribute("data-sitetype") || "single";
    const sitesStr = opt.getAttribute("data-sites") || "";

    if (siteType === "multiple") {
      invSiteContainer.style.display = "block";
      const sites = sitesStr.split(",").filter(Boolean);
      invSiteSelect.innerHTML = '<option value="">-- Select Site --</option>' + 
        sites.map(s => `<option value="${s}">${s}</option>`).join("");
      invSiteSelect.required = true;
    } else {
      invSiteContainer.style.display = "none";
      invSiteSelect.innerHTML = '<option value="">-- Select Site --</option>';
      invSiteSelect.required = false;
    }
    updateTopRowGrid();
    updateCustomerClosingBalanceDisplay();
  });

  invSiteSelect.addEventListener("change", () => {
    updateCustomerClosingBalanceDisplay();
  });

  // When Credit Period (Days) is changed -> Auto-calculate Due Date
  if (invCrPeriodEl) {
    const syncDueDateFromCrPeriod = () => {
      const invDateVal = invDateEl ? invDateEl.value : "";
      if (invCustomerSelect && invCustomerSelect.value === "__CASH__") {
        invCrPeriodEl.value = "0";
        if (invDueDateEl && invDateEl) {
          invDueDateEl.value = invDateEl.value;
          invDueDateEl.min = invDateEl.value;
        }
        return;
      }
      let crDays = parseInt(invCrPeriodEl.value, 10);
      if (isNaN(crDays) || crDays < 0) {
        crDays = 0;
        invCrPeriodEl.value = "0";
      }
      if (invDateVal && invDueDateEl) {
        invDueDateEl.min = invDateVal;
        invDueDateEl.value = addDaysToDateString(invDateVal, crDays);
      }
    };
    invCrPeriodEl.addEventListener("input", syncDueDateFromCrPeriod);
    invCrPeriodEl.addEventListener("change", syncDueDateFromCrPeriod);
  }

  // When Due Date is changed -> Auto-calculate Credit Period (Days)
  if (invDueDateEl) {
    const syncCrPeriodFromDueDate = () => {
      const invDateVal = invDateEl ? invDateEl.value : "";
      if (invCustomerSelect && invCustomerSelect.value === "__CASH__") {
        if (invDateEl) {
          invDueDateEl.value = invDateEl.value;
          invDueDateEl.min = invDateEl.value;
        }
        if (invCrPeriodEl) invCrPeriodEl.value = "0";
        return;
      }
      let dueDateVal = invDueDateEl.value;
      if (invDateVal && dueDateVal) {
        // Enforce due date should not be less than invoice date
        if (dueDateVal < invDateVal) {
          invDueDateEl.value = invDateVal;
          dueDateVal = invDateVal;
        }
        invDueDateEl.min = invDateVal;
        if (invCrPeriodEl) {
          const days = calculateDaysBetweenDates(invDateVal, dueDateVal);
          invCrPeriodEl.value = String(Math.max(0, days));
        }
      }
    };
    invDueDateEl.addEventListener("input", syncCrPeriodFromDueDate);
    invDueDateEl.addEventListener("change", syncCrPeriodFromDueDate);
  }

  // When Invoice Date is changed -> Maintain credit period and update Due Date
  if (invDateEl) {
    invDateEl.addEventListener("change", () => {
      const invDateVal = invDateEl.value;
      if (invDueDateEl) {
        invDueDateEl.min = invDateVal;
      }
      if (invCustomerSelect && invCustomerSelect.value === "__CASH__") {
        if (invDueDateEl) invDueDateEl.value = invDateVal;
        if (invCrPeriodEl) invCrPeriodEl.value = "0";
      } else if (invDateVal && invCrPeriodEl && invDueDateEl) {
        const crDays = Math.max(0, parseInt(invCrPeriodEl.value, 10) || 0);
        invDueDateEl.value = addDaysToDateString(invDateVal, crDays);
      }
      updateCustomerClosingBalanceDisplay();
    });
  }

  // Clear Adjustments button \u20B9‚¬â€ zeros all adjustments including Loading Charge
  document.getElementById("btn-clear-sales-adjustments")?.addEventListener("click", () => {
    // Build a zeroed-out list: keep Loading Charges entry but mark as overridden so
    // renderGridAndRecalc() respects the zero and doesn't auto-calculate it again.
    const masterAdjustments = state.getSalesAdjustments ? state.getSalesAdjustments() : [];
    const masterLoading = masterAdjustments.find(a => a.name === "LOADING CHARGES" || a.name === "LOADING CHARGE");
    const ledgerCode = masterLoading ? masterLoading.ledgerCode : "L032";
    adjustmentsList = [
      { type: "Add", name: "LOADING CHARGES", amount: 0, ledgerCode, isOverridden: true }
    ];
    renderGridAndRecalc();
  });

  // Add Influencer button inline
  document.getElementById("btn-inv-add-influencer")?.addEventListener("click", () => {
    import("./influencer.js").then(m => {
      m.showInfluencerMasterModal(container, () => {
        showInvoiceBuilderModal(container, customers, materials, onSuccess, editInvoice, activeSeries);
      });
    });
  });

  // + Add Customer button \u20B9€ â€™ opens full Customer Creation window, returns to sales invoice with new customer selected
  document.getElementById("btn-inv-add-customer").addEventListener("click", () => {
    import("./contacts.js").then(m => {
      m.showAddContactModal(document.getElementById("sub-modal-container-root"), (newCustomer) => {
        if (newCustomer && newCustomer.id) {
          const freshCustomers = state.getContacts()
            .filter(c => c.type === "customer" || c.listInCustomerList === true)
            .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
          const customerSelect = document.getElementById("inv-customer");
          if (customerSelect) {
            customerSelect.innerHTML = `<option value="">-- Choose Customer --</option>` +
              `<option value="__CASH__">-- CASH SALES --</option>` +
              freshCustomers.map(c => `<option value="${c.id}" data-sitetype="${c.siteType || 'single'}" data-sites="${(c.sites || []).join(',')}">${c.name} (Bal: \u20B9${c.balance.toFixed(2)})</option>`).join("");
            customerSelect.value = newCustomer.id;
            customerSelect.dispatchEvent(new Event("change"));
          }
        }
      }, "customer");
    });
  });

  document.getElementById("btn-inv-customer-history")?.addEventListener("click", (e) => {
    e.preventDefault();
    openCustomerSalesHistory();
  });

  const getSortedProductNames = () => {
    const freshMaterials = state.getMaterials() || materials || [];
    return [...new Set(freshMaterials.map(m => m.name).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  };

  const repopulateSalesProducts = () => {
    if (typeof renderProductDropdownList === "function") {
      renderProductDropdownList(productSelect ? productSelect.value : "");
    }
  };

  const openProductMasterFromSales = () => {
    import("./inventory.js").then(m => {
      m.showProductMasterModal(container, null, null, () => {
        showInvoiceBuilderModal(container, customers, materials, onSuccess, editInvoice, activeSeries);
        setTimeout(() => {
          repopulateSalesProducts();
        }, 50);
      });
    });
  };

  document.getElementById("ribbon-new-product-sale").addEventListener("click", (e) => {
    e.preventDefault();
    openProductMasterFromSales();
  });

  document.getElementById("create-invoice-form").addEventListener("keydown", (e) => {
    if (e.key === "F8") {
      e.preventDefault();
      openCustomerSalesHistory();
    }
    if (e.key === "F9") {
      e.preventDefault();
      openProductMasterFromSales();
    }
    if (e.key === "F10") {
      e.preventDefault();
      if (productSelect) {
        productSelect.focus();
        productSelect.select();
        openProductDropdown();
      }
    }
    if (e.key === "Insert") {
      e.preventDefault();
      const totNetVal = gridItems.reduce((acc, item) => acc + item.netValue, 0);
      const totGst = gridItems.reduce((acc, item) => acc + item.gstAmount, 0);
      const totCess = gridItems.reduce((acc, item) => acc + (item.netValue * (item.cessPercent / 100)), 0);
      const disPct = parseFloat(generalDisPercentInput.value) || 0;
      let invoiceDiscount = parseFloat(generalDisAmtInput.value) || 0;
      if (disPct > 0) {
        invoiceDiscount = totNetVal * (disPct / 100);
      }
      const discountedNetVal = totNetVal - invoiceDiscount;
      const addlCess = parseFloat(document.getElementById("inv-addlcess").value) || 0;
      const roundOff = parseFloat(document.getElementById("inv-roundoff").value) || 0;
      
      const initialBillAmount = discountedNetVal + totGst + totCess + addlCess + roundOff;
      
      showAdjustmentsModal("sales", initialBillAmount, adjustmentsList, (savedList) => {
        adjustmentsList = savedList;
        renderGridAndRecalc();
      });
    }
  });

  // General form inputs Enter key to next field navigation
  document.getElementById("create-invoice-form").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.type !== "submit" && !e.target.id.startsWith("ribbon-sale-")) {
      e.preventDefault();
      const focusables = Array.from(document.getElementById("create-invoice-form").querySelectorAll("input, select, button:not([type='button'])"));
      const idx = focusables.indexOf(e.target);
      if (idx > -1 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
      }
    }
  });

  let activeProductIndex = 0;
  let currentFilteredProducts = [];
  let currentMatchingCodes = [];
  let currentFilteredCodes = [];
  let activeSaleCodeIndex = 0;

  function renderProductDropdownList(filterText = "") {
    if (!productListEl) return;
    const allProducts = getSortedProductNames();
    const query = (filterText || "").trim().toLowerCase();
    currentFilteredProducts = query
      ? allProducts.filter(name => name.toLowerCase().includes(query))
      : allProducts;

    if (currentFilteredProducts.length === 0) {
      productListEl.innerHTML = `<div style="padding:6px 8px; font-size:0.75rem; color:#64748b; font-style:italic; user-select:none;">No matching products</div>`;
      activeProductIndex = -1;
      return;
    }

    if (activeProductIndex < 0 || activeProductIndex >= currentFilteredProducts.length) {
      activeProductIndex = 0;
    }

    productListEl.innerHTML = currentFilteredProducts.map((name, idx) => {
      const isSelected = idx === activeProductIndex;
      return `<div class="ribbon-product-item" data-index="${idx}" data-name="${name.replace(/"/g, '&quot;')}" style="padding:4px 8px; font-size:0.78rem; font-weight:700; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; background-color:${isSelected ? '#0078d7' : 'white'}; color:${isSelected ? 'white' : '#0f172a'};">${name}</div>`;
    }).join("");

    productListEl.querySelectorAll(".ribbon-product-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-index"));
        if (activeProductIndex !== idx) {
          activeProductIndex = idx;
          updateProductListHighlight();
        }
      });

      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedName = item.getAttribute("data-name");
        selectProductAndAdvance(selectedName);
      };

      item.addEventListener("mousedown", handleSelect);
      item.addEventListener("click", handleSelect);
      item.addEventListener("dblclick", handleSelect);
    });

    scrollActiveProductIntoView();
  }

  function updateProductListHighlight() {
    if (!productListEl) return;
    const items = productListEl.querySelectorAll(".ribbon-product-item");
    items.forEach((item, idx) => {
      const isSelected = idx === activeProductIndex;
      item.style.backgroundColor = isSelected ? '#0078d7' : 'white';
      item.style.color = isSelected ? 'white' : '#0f172a';
    });
    scrollActiveProductIntoView();
  }

  function scrollActiveProductIntoView() {
    if (!productListEl) return;
    const activeItem = productListEl.querySelector(`.ribbon-product-item[data-index="${activeProductIndex}"]`);
    if (activeItem) {
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = productListEl.scrollTop;
      const containerBottom = containerTop + productListEl.clientHeight;
      if (itemTop < containerTop) {
        productListEl.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        productListEl.scrollTop = itemBottom - productListEl.clientHeight;
      }
    }
  }

  function openProductDropdown(forceAll = false) {
    if (!productDropdown) return;
    productDropdown.style.display = "block";
    const filter = forceAll ? "" : (productSelect ? productSelect.value : "");
    renderProductDropdownList(filter);
  }

  function closeProductDropdown() {
    if (!productDropdown) return;
    productDropdown.style.display = "none";
  }

  function selectProductAndAdvance(name) {
    if (!productSelect) return;
    productSelect.value = name;
    closeProductDropdown();
    productSelect.dispatchEvent(new Event("change"));
    
    setTimeout(() => {
      if (codeSearch && !codeSearch.disabled && currentMatchingCodes.length > 1) {
        codeSearch.focus();
        openSaleCodeDropdown();
      } else if (ribbonBatchSelect && !ribbonBatchSelect.disabled && ribbonBatchSelect.options.length > 2) {
        ribbonBatchSelect.focus();
      } else {
        qtyInput.focus();
      }
    }, 20);
  }

  function renderSaleCodeDropdownList(filterText = "") {
    if (!codeListEl) return;
    const query = (filterText || "").trim().toLowerCase();
    currentFilteredCodes = query
      ? currentMatchingCodes.filter(c => (c || "").toLowerCase().includes(query))
      : currentMatchingCodes;

    if (currentFilteredCodes.length === 0) {
      codeListEl.innerHTML = `<div style="padding:6px 8px; font-size:0.75rem; color:#64748b; font-style:italic; user-select:none;">No matching codes</div>`;
      activeSaleCodeIndex = -1;
      return;
    }

    if (activeSaleCodeIndex < 0 || activeSaleCodeIndex >= currentFilteredCodes.length) {
      activeSaleCodeIndex = 0;
    }

    codeListEl.innerHTML = currentFilteredCodes.map((code, idx) => {
      const isSelected = idx === activeSaleCodeIndex;
      return `<div class="ribbon-sale-code-item" data-index="${idx}" data-code="${code.replace(/"/g, '&quot;')}" style="padding:4px 8px; font-size:0.78rem; font-weight:700; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; background-color:${isSelected ? '#0078d7' : 'white'}; color:${isSelected ? 'white' : '#0f172a'};">${code}</div>`;
    }).join("");

    codeListEl.querySelectorAll(".ribbon-sale-code-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-index"));
        if (activeSaleCodeIndex !== idx) {
          activeSaleCodeIndex = idx;
          updateSaleCodeListHighlight();
        }
      });

      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selCode = item.getAttribute("data-code");
        selectSaleCodeAndAdvance(selCode);
      };

      item.addEventListener("mousedown", handleSelect);
      item.addEventListener("click", handleSelect);
      item.addEventListener("dblclick", handleSelect);
    });

    scrollActiveSaleCodeIntoView();
  }

  function updateSaleCodeListHighlight() {
    if (!codeListEl) return;
    const items = codeListEl.querySelectorAll(".ribbon-sale-code-item");
    items.forEach((item, idx) => {
      const isSelected = idx === activeSaleCodeIndex;
      item.style.backgroundColor = isSelected ? '#0078d7' : 'white';
      item.style.color = isSelected ? 'white' : '#0f172a';
    });
    scrollActiveSaleCodeIntoView();
  }

  function scrollActiveSaleCodeIntoView() {
    if (!codeListEl) return;
    const activeItem = codeListEl.querySelector(`.ribbon-sale-code-item[data-index="${activeSaleCodeIndex}"]`);
    if (activeItem) {
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = codeListEl.scrollTop;
      const containerBottom = containerTop + codeListEl.clientHeight;
      if (itemTop < containerTop) {
        codeListEl.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        codeListEl.scrollTop = itemBottom - codeListEl.clientHeight;
      }
    }
  }

  function openSaleCodeDropdown(forceAll = false) {
    if (!codeDropdown || !codeSearch || codeSearch.disabled) return;
    codeDropdown.style.display = "block";
    const filter = forceAll ? "" : (codeSearch.value || "");
    renderSaleCodeDropdownList(filter);
  }

  function closeSaleCodeDropdown() {
    if (!codeDropdown) return;
    codeDropdown.style.display = "none";
  }

  function selectSaleCodeAndAdvance(code) {
    if (!codeSelect || !codeSearch) return;
    codeSelect.value = code;
    codeSearch.value = code;
    closeSaleCodeDropdown();
    codeSelect.dispatchEvent(new Event("change"));

    setTimeout(() => {
      if (ribbonBatchSelect && !ribbonBatchSelect.disabled && ribbonBatchSelect.options.length > 2) {
        ribbonBatchSelect.focus();
      } else {
        qtyInput.focus();
      }
    }, 10);
  }

  if (productToggle) {
    productToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (productDropdown && productDropdown.style.display !== "none") {
        closeProductDropdown();
      } else {
        if (productSelect) productSelect.focus();
        openProductDropdown(true);
      }
    });
  }

  if (productSelect) {
    productSelect.addEventListener("focus", () => {
      productSelect.select();
      openProductDropdown();
    });

    productSelect.addEventListener("click", () => {
      openProductDropdown();
    });

    productSelect.addEventListener("input", () => {
      activeProductIndex = 0;
      openProductDropdown();
    });

    productSelect.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (productDropdown.style.display === "none") {
          openProductDropdown();
        } else if (currentFilteredProducts.length > 0) {
          activeProductIndex = (activeProductIndex + 1) % currentFilteredProducts.length;
          updateProductListHighlight();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (productDropdown.style.display === "none") {
          openProductDropdown();
        } else if (currentFilteredProducts.length > 0) {
          activeProductIndex = (activeProductIndex - 1 + currentFilteredProducts.length) % currentFilteredProducts.length;
          updateProductListHighlight();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (productDropdown.style.display !== "none" && activeProductIndex >= 0 && activeProductIndex < currentFilteredProducts.length) {
          selectProductAndAdvance(currentFilteredProducts[activeProductIndex]);
        } else {
          const val = (productSelect.value || "").trim().toLowerCase();
          const all = getSortedProductNames();
          const exactMatch = all.find(p => p.toLowerCase() === val);
          const partialMatch = all.find(p => p.toLowerCase().startsWith(val)) || all.find(p => p.toLowerCase().includes(val));
          const matched = exactMatch || partialMatch;
          if (matched) {
            selectProductAndAdvance(matched);
          } else {
            closeProductDropdown();
            if (codeSearch && !codeSearch.disabled && currentMatchingCodes.length > 1) {
              codeSearch.focus();
              openSaleCodeDropdown();
            } else if (ribbonBatchSelect && !ribbonBatchSelect.disabled && ribbonBatchSelect.options.length > 2) {
              ribbonBatchSelect.focus();
            } else {
              qtyInput.focus();
            }
          }
        }
      } else if (e.key === "Tab") {
        if (productDropdown.style.display !== "none" && activeProductIndex >= 0 && activeProductIndex < currentFilteredProducts.length) {
          productSelect.value = currentFilteredProducts[activeProductIndex];
          productSelect.dispatchEvent(new Event("change"));
        }
        closeProductDropdown();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeProductDropdown();
      }
    });
  }

  if (codeToggle) {
    codeToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (codeDropdown && codeDropdown.style.display !== "none") {
        closeSaleCodeDropdown();
      } else {
        if (codeSearch && !codeSearch.disabled) {
          codeSearch.focus();
          openSaleCodeDropdown(true);
        }
      }
    });
  }

  if (codeSearch) {
    codeSearch.addEventListener("focus", () => {
      codeSearch.select();
      openSaleCodeDropdown();
    });

    codeSearch.addEventListener("click", () => {
      openSaleCodeDropdown();
    });

    codeSearch.addEventListener("input", () => {
      activeSaleCodeIndex = 0;
      openSaleCodeDropdown();
    });

    codeSearch.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        if (codeDropdown && codeDropdown.style.display === "none") {
          openSaleCodeDropdown();
        } else if (currentFilteredCodes.length > 0) {
          activeSaleCodeIndex = (activeSaleCodeIndex + 1) % currentFilteredCodes.length;
          updateSaleCodeListHighlight();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        if (codeDropdown && codeDropdown.style.display === "none") {
          openSaleCodeDropdown();
        } else if (currentFilteredCodes.length > 0) {
          activeSaleCodeIndex = (activeSaleCodeIndex - 1 + currentFilteredCodes.length) % currentFilteredCodes.length;
          updateSaleCodeListHighlight();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (codeDropdown && codeDropdown.style.display !== "none" && activeSaleCodeIndex >= 0 && activeSaleCodeIndex < currentFilteredCodes.length) {
          selectSaleCodeAndAdvance(currentFilteredCodes[activeSaleCodeIndex]);
        } else {
          const val = (codeSearch.value || "").trim().toLowerCase();
          const exactMatch = currentMatchingCodes.find(c => (c || "").toLowerCase() === val);
          const partialMatch = currentMatchingCodes.find(c => (c || "").toLowerCase().startsWith(val)) || currentMatchingCodes.find(c => (c || "").toLowerCase().includes(val));
          const matched = exactMatch || partialMatch;
          if (matched) {
            selectSaleCodeAndAdvance(matched);
          } else {
            closeSaleCodeDropdown();
            if (ribbonBatchSelect && !ribbonBatchSelect.disabled && ribbonBatchSelect.options.length > 2) {
              ribbonBatchSelect.focus();
            } else {
              qtyInput.focus();
            }
          }
        }
      } else if (e.key === "Tab") {
        if (codeDropdown && codeDropdown.style.display !== "none" && activeSaleCodeIndex >= 0 && activeSaleCodeIndex < currentFilteredCodes.length) {
          codeSelect.value = currentFilteredCodes[activeSaleCodeIndex];
          codeSearch.value = currentFilteredCodes[activeSaleCodeIndex];
          codeSelect.dispatchEvent(new Event("change"));
        }
        closeSaleCodeDropdown();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeSaleCodeDropdown();
      }
    });
  }

  onDocClickCloseProductDropdown = (e) => {
    const toggleBtn = document.getElementById("btn-ribbon-sale-product-toggle");
    if (productSelect && productDropdown && !productSelect.contains(e.target) && !productDropdown.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
      closeProductDropdown();
    }
  };
  document.addEventListener("click", onDocClickCloseProductDropdown);

  onDocClickCloseSaleCodeDropdown = (e) => {
    const toggleBtn = document.getElementById("btn-ribbon-sale-code-toggle");
    if (codeSearch && codeDropdown && !codeSearch.contains(e.target) && !codeDropdown.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
      closeSaleCodeDropdown();
    }
  };
  document.addEventListener("click", onDocClickCloseSaleCodeDropdown);

  // Specific ribbon field Enter key navigation and submit logic
  const ribbonSaleFields = [
    "ribbon-sale-product",
    "ribbon-sale-code-search",
    "ribbon-sale-batch",
    "ribbon-sale-qty",
    "ribbon-sale-unit",
    "ribbon-sale-rate",
    "ribbon-sale-mrp",
    "ribbon-sale-dispercent",
    "ribbon-sale-disamt"
  ];
  ribbonSaleFields.forEach((id, idx) => {
    if (id === "ribbon-sale-product" || id === "ribbon-sale-code-search") return;
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (id === "ribbon-sale-disamt") {
            addRowBtn.click();
            if (productSelect) {
              productSelect.focus();
              openProductDropdown();
            }
          } else {
            const nextEl = document.getElementById(ribbonSaleFields[idx + 1]);
            if (nextEl) nextEl.focus();
          }
        }
      });
    }
  });

  let gridItems = editInvoice ? editInvoice.items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const disP = parseFloat(item.discountPercent) || 0;
    const disA = parseFloat(item.discountAmount) || 0;
    const netVal = item.netValue !== undefined ? parseFloat(item.netValue) : (item.amount !== undefined ? parseFloat(item.amount) : ((qty * price) - disA));
    const gstPct = item.gstPercent !== undefined && item.gstPercent !== null && !isNaN(item.gstPercent) && Number(item.gstPercent) > 0 ? parseFloat(item.gstPercent) : (item.taxRate !== undefined ? parseFloat(item.taxRate) : 0);
    const existingGstAmt = (parseFloat(item.cgst) || 0) + (parseFloat(item.sgst) || 0) + (parseFloat(item.igst) || 0);
    const gstAmt = item.gstAmount !== undefined && item.gstAmount !== null && !isNaN(item.gstAmount) && Number(item.gstAmount) > 0 ? parseFloat(item.gstAmount) : (existingGstAmt > 0 ? existingGstAmt : (netVal * (gstPct / 100)));
    const cessPct = parseFloat(item.cessPercent) || 0;
    const netAmt = item.netAmount !== undefined ? parseFloat(item.netAmount) : (netVal + gstAmt);

    return {
      materialId: item.materialId,
      name: item.name,
      code: item.code || item.model || "",
      batchNo: item.batchNo || "",
      quantity: qty,
      unit: item.unit || "Bags",
      price: price,
      mrp: parseFloat(item.mrp) || (price * 1.25),
      discountPercent: disP,
      discountAmount: disA,
      netValue: netVal,
      gstPercent: gstPct,
      gstAmount: gstAmt,
      cessPercent: cessPct,
      netAmount: netAmt
    };
  }) : [];

  let adjustmentsList = editInvoice ? (editInvoice.adjustmentsList || []) : [];
  let isSalesManualRoundOff = false;

  // Pre-fill existing metadata if editing
  if (editInvoice) {
    document.getElementById("inv-customer").value = editInvoice.contactId;
    document.getElementById("inv-customer").dispatchEvent(new Event("change"));
    if (editInvoice.siteName) {
      document.getElementById("inv-site").value = editInvoice.siteName;
    }
    document.getElementById("inv-employee").value = editInvoice.employee || editInvoice.doctor || "";
    document.getElementById("inv-state").value = editInvoice.state || "KERALA";
    const invPaymodeEl = document.getElementById("inv-paymode");
    const targetInvPaymode = String(editInvoice.payMode || editInvoice.paymode || "Credit").trim();
    if (invPaymodeEl) {
      let matched = false;
      for (let opt of invPaymodeEl.options) {
        if (opt.value.toUpperCase() === targetInvPaymode.toUpperCase() || opt.text.toUpperCase() === targetInvPaymode.toUpperCase()) {
          invPaymodeEl.value = opt.value;
          matched = true;
          break;
        }
      }
      if (!matched && targetInvPaymode.toUpperCase().includes("CASH")) {
        for (let opt of invPaymodeEl.options) {
          if (opt.value.toUpperCase().includes("CASH")) {
            invPaymodeEl.value = opt.value;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        invPaymodeEl.value = targetInvPaymode;
      }
    }
    document.getElementById("inv-crperiod").value = editInvoice.creditPeriod || "0";
    document.getElementById("inv-adjustments").value = editInvoice.adjustments || "0.00";
    document.getElementById("inv-addlcess").value = editInvoice.additionalCess || "0.00";
    document.getElementById("inv-roundoff").value = editInvoice.roundOff || "0.00";
    document.getElementById("inv-narration").value = editInvoice.narration || "";
    if (document.getElementById("inv-vehicle-no")) {
      document.getElementById("inv-vehicle-no").value = editInvoice.vehicleNo || "";
    }
  }

  const shippingBtn = document.getElementById("btn-inv-shipping-address");
  let shippingAddressVal = editInvoice ? (editInvoice.shippingAddress || null) : null;
  if (shippingBtn) {
    if (shippingAddressVal) {
      shippingBtn.innerText = "Ship Addr Ã¢Å“â€œ";
      shippingBtn.style.background = "#22c55e";
    }
    shippingBtn.addEventListener("click", () => {
      let shipName = "";
      let shipAddr = "";
      let shipMob = "";
      let shipGstin = "";
      let shipStateName = "";
      let shipStateCode = "";
      if (shippingAddressVal) {
        if (typeof shippingAddressVal === "string") {
          try {
            const parsed = JSON.parse(shippingAddressVal);
            shipName = parsed.name || "";
            shipAddr = parsed.address || "";
            shipMob = parsed.mobile || "";
            shipGstin = parsed.gstin || "";
            shipStateName = parsed.state || "";
            shipStateCode = parsed.stateCode || "";
          } catch(e) {
            shipAddr = shippingAddressVal;
          }
        } else {
          shipName = shippingAddressVal.name || "";
          shipAddr = shippingAddressVal.address || "";
          shipMob = shippingAddressVal.mobile || "";
          shipGstin = shippingAddressVal.gstin || "";
          shipStateName = shippingAddressVal.state || "";
          shipStateCode = shippingAddressVal.stateCode || "";
        }
      }

      const overlay = document.createElement("div");
      overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:100000;";
      overlay.innerHTML = `
        <div style="background:white; border:2px solid #1e3a8a; border-radius:6px; width:500px; padding:15px; box-shadow:0 10px 25px rgba(0,0,0,0.3); color:black; font-size:0.8rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:12px;">
            <strong style="font-size:0.95rem; color:#1e3a8a;">Shipping Address Details (Consignee)</strong>
            <button type="button" class="close-ship" style="background:none; border:none; font-size:1.2rem; cursor:pointer; font-weight:bold;">&times;</button>
          </div>
          
          <div style="margin-bottom:12px; display:flex; align-items:center; gap:6px;">
            <input type="checkbox" id="chk-same-as-billing" style="cursor:pointer;">
            <label for="chk-same-as-billing" style="font-weight:bold; cursor:pointer; color:#1e3a8a;">Same as Billing Address</label>
          </div>
          
          <div style="display:grid; grid-template-columns:110px 1fr; gap:8px; align-items:center;">
            <label style="font-weight:600;">Consignee Name:</label>
            <input type="text" id="ship-name" style="padding:4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:3px;" value="${shipName}">
            
            <label style="font-weight:600; align-self:flex-start; margin-top:4px;">Address:</label>
            <textarea id="ship-addr" style="height:60px; padding:4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:3px; font-family:inherit; resize:none;">${shipAddr}</textarea>
            
            <label style="font-weight:600;">Mob Number:</label>
            <input type="text" id="ship-mob" style="padding:4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:3px;" value="${shipMob}">
            
            <label style="font-weight:600;">GSTIN:</label>
            <input type="text" id="ship-gstin" style="padding:4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:3px;" value="${shipGstin}">
            
            <label style="font-weight:600;">State Name:</label>
            <input type="text" id="ship-state" style="padding:4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:3px;" value="${shipStateName}">
            
            <label style="font-weight:600;">State Code:</label>
            <input type="text" id="ship-code" style="padding:4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:3px;" value="${shipStateCode}">
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:15px; border-top:1px solid #e2e8f0; padding-top:10px;">
            <button type="button" class="btn-ship-cancel" style="padding:4px 12px; font-size:0.75rem; border:1px solid #cbd5e1; background:#f1f5f9; border-radius:4px; cursor:pointer;">Cancel</button>
            <button type="button" class="btn-ship-save" style="padding:4px 16px; font-size:0.75rem; border:none; background:#1e3a8a; color:white; border-radius:4px; cursor:pointer; font-weight:bold;">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const firstInput = overlay.querySelector("#ship-name");
      if (firstInput) firstInput.focus();

      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          e.preventDefault();
          overlay.remove();
        }
      });

      const chkSame = overlay.querySelector("#chk-same-as-billing");
      chkSame.addEventListener("change", () => {
        if (chkSame.checked) {
          const customerId = document.getElementById("inv-customer").value;
          const activeContact = customers.find(c => c.id === customerId);
          if (activeContact) {
            overlay.querySelector("#ship-name").value = activeContact.name || "";
            overlay.querySelector("#ship-addr").value = activeContact.billingAddress || "";
            overlay.querySelector("#ship-mob").value = activeContact.mobile || activeContact.phone || "";
            overlay.querySelector("#ship-gstin").value = activeContact.gstin || "";
            overlay.querySelector("#ship-state").value = activeContact.state || "KERALA";
            overlay.querySelector("#ship-code").value = activeContact.stateCode || "32";
          } else if (customerId === "__CASH__") {
            overlay.querySelector("#ship-name").value = "CASH SALES";
            overlay.querySelector("#ship-addr").value = "";
            overlay.querySelector("#ship-mob").value = "";
            overlay.querySelector("#ship-gstin").value = "";
            overlay.querySelector("#ship-state").value = "KERALA";
            overlay.querySelector("#ship-code").value = "32";
          }
        }
      });

      overlay.querySelector(".close-ship").addEventListener("click", () => overlay.remove());
      overlay.querySelector(".btn-ship-cancel").addEventListener("click", () => overlay.remove());
      overlay.querySelector(".btn-ship-save").addEventListener("click", () => {
        shippingAddressVal = {
          name: overlay.querySelector("#ship-name").value.trim(),
          address: overlay.querySelector("#ship-addr").value.trim(),
          mobile: overlay.querySelector("#ship-mob").value.trim(),
          gstin: overlay.querySelector("#ship-gstin").value.trim(),
          state: overlay.querySelector("#ship-state").value.trim(),
          stateCode: overlay.querySelector("#ship-code").value.trim()
        };
        const hasContent = shippingAddressVal.name || shippingAddressVal.address || shippingAddressVal.mobile || shippingAddressVal.gstin || shippingAddressVal.state;
        if (hasContent) {
          shippingBtn.innerText = "Ship Addr Ã¢Å“â€œ";
          shippingBtn.style.background = "#22c55e";
        } else {
          shippingBtn.innerText = "Ship Address";
          shippingBtn.style.background = "#f97316";
          shippingAddressVal = null;
        }
        overlay.remove();
      });
    });
  }

  const stateBox = document.getElementById("inv-state");
  if (stateBox) {
    if (isLocalSeries) {
      stateBox.value = companyState;
      stateBox.disabled = true;
    } else if (!editInvoice) {
      stateBox.value = companyState;
    }
  }

  // Product Ribbon Event Listeners
  productSelect.addEventListener("change", () => {
    const pName = (productSelect.value || "").trim();
    if (pName) {
      const currentMaterials = state.getMaterials() || materials || [];
      const matchingMaterials = currentMaterials
        .filter(m => m.name.toLowerCase() === pName.toLowerCase())
        .sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));

      if (matchingMaterials.length > 0) {
        currentMatchingCodes = matchingMaterials.map(m => m.code).filter(Boolean);
        codeSelect.innerHTML = '<option value="">-- Code/Model --</option>' + 
          matchingMaterials.map(m => `<option value="${m.code}">${m.code}</option>`).join("");
        codeSelect.disabled = false;
        if (codeSearch) {
          codeSearch.disabled = false;
          codeSearch.value = "";
        }
        updateRibbonUnitSelect(unitSelect, matchingMaterials[0].unit);

        if (matchingMaterials.length === 1) {
          codeSelect.value = matchingMaterials[0].code;
          if (codeSearch) codeSearch.value = matchingMaterials[0].code;
          codeSelect.dispatchEvent(new Event("change"));
        } else if (matchingMaterials.length > 1) {
          if (codeSearch) codeSearch.value = "";
        }
      } else {
        currentMatchingCodes = [];
        codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
        codeSelect.disabled = true;
        if (codeSearch) {
          codeSearch.value = "";
          codeSearch.disabled = true;
        }
        if (typeof ribbonBatchSelect !== 'undefined' && ribbonBatchSelect) {
          ribbonBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
          ribbonBatchSelect.disabled = true;
        }
        availStockSpan.innerText = "0.00";
      }
    } else {
      currentMatchingCodes = [];
      codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
      codeSelect.disabled = true;
      if (codeSearch) {
        codeSearch.value = "";
        codeSearch.disabled = true;
      }
      if (typeof ribbonBatchSelect !== 'undefined' && ribbonBatchSelect) {
        ribbonBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
        ribbonBatchSelect.disabled = true;
      }
      availStockSpan.innerText = "0.00";
    }
  });

  codeSelect.addEventListener("change", () => {
    const pName = (productSelect.value || "").trim();
    const pCode = codeSelect.value;
    if (codeSearch && codeSearch.value !== pCode) {
      codeSearch.value = pCode || "";
    }
    if (pName && pCode) {
      const currentMaterials = state.getMaterials() || materials || [];
      const mat = currentMaterials.find(m => m.name.toLowerCase() === pName.toLowerCase() && m.code === pCode);
      if (mat) {
        rateInput.value = mat.sellingPrice ? mat.sellingPrice.toFixed(2) : "";
        mrpInput.value = mat.mrp ? mat.mrp.toFixed(2) : "";
        updateRibbonUnitSelect(unitSelect, mat.unit);
        qtyInput.value = "1";
        disPercentInput.value = "0";
        disAmtInput.value = "0.00";
        availStockSpan.innerText = (mat.stock || 0).toFixed(2);
        
        if (typeof ribbonBatchSelect !== 'undefined' && ribbonBatchSelect) {
          const batches = state.getMaterialBatches(mat.id);
          const availableBatches = (batches || [])
            .filter(b => (parseFloat(b.stock) || 0) > 0)
            .sort((a, b) => {
              const numA = parseFloat(a.batchNo);
              const numB = parseFloat(b.batchNo);
              if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                return numA - numB;
              }
              const strCompare = String(a.batchNo || "").localeCompare(String(b.batchNo || ""), undefined, { numeric: true, sensitivity: 'base' });
              if (strCompare !== 0) return strCompare;
              return (parseFloat(a.stock) || 0) - (parseFloat(b.stock) || 0);
            });

          if (availableBatches && availableBatches.length > 0) {
            ribbonBatchSelect.innerHTML = '<option value="">-- Batch --</option>' +
              availableBatches.map(b => `<option value="${b.batchNo}">${b.batchNo} (Qty: ${b.stock})</option>`).join("");
            ribbonBatchSelect.disabled = false;
            ribbonBatchSelect.value = availableBatches[0].batchNo;
            ribbonBatchSelect.dispatchEvent(new Event("change"));
          } else {
            ribbonBatchSelect.innerHTML = '<option value="">-- No Stock --</option>';
            ribbonBatchSelect.disabled = true;
          }
        }
        if (typeof recalcRibbonRowDiscount === "function") recalcRibbonRowDiscount();
      }
    } else {
      availStockSpan.innerText = "0.00";
      if (typeof ribbonBatchSelect !== 'undefined' && ribbonBatchSelect) {
        ribbonBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
        ribbonBatchSelect.disabled = true;
      }
    }
  });

  if (typeof ribbonBatchSelect !== 'undefined' && ribbonBatchSelect) {
    ribbonBatchSelect.addEventListener("change", () => {
      const pName = (productSelect.value || "").trim();
      const pCode = codeSelect.value;
      if (pName && pCode) {
        const currentMaterials = state.getMaterials() || materials || [];
        const mat = currentMaterials.find(m => m.name.toLowerCase() === pName.toLowerCase() && m.code === pCode);
        if (mat) {
          const batches = state.getMaterialBatches(mat.id);
          const selectedBatch = (batches || []).find(b => b.batchNo === ribbonBatchSelect.value);
          if (selectedBatch) {
            rateInput.value = selectedBatch.sellingPrice ? selectedBatch.sellingPrice.toFixed(2) : (mat.sellingPrice ? mat.sellingPrice.toFixed(2) : "");
            mrpInput.value = selectedBatch.mrp ? selectedBatch.mrp.toFixed(2) : (mat.mrp ? mat.mrp.toFixed(2) : "");
            availStockSpan.innerText = (parseFloat(selectedBatch.stock) || 0).toFixed(2);
            if (typeof recalcRibbonRowDiscount === "function") recalcRibbonRowDiscount();
          } else {
            availStockSpan.innerText = (mat.stock || 0).toFixed(2);
          }
        }
      }
    });
  }

  // Ribbon discount auto-calculations
  qtyInput.addEventListener("input", recalcRibbonRowDiscount);
  rateInput.addEventListener("input", recalcRibbonRowDiscount);
  disPercentInput.addEventListener("input", () => {
    const q = parseFloat(qtyInput.value) || 0;
    const r = parseFloat(rateInput.value) || 0;
    const dp = parseFloat(disPercentInput.value) || 0;
    disAmtInput.value = (q * r * (dp / 100)).toFixed(2);
  });
  disAmtInput.addEventListener("input", () => {
    const q = parseFloat(qtyInput.value) || 0;
    const r = parseFloat(rateInput.value) || 0;
    const da = parseFloat(disAmtInput.value) || 0;
    const gross = q * r;
    disPercentInput.value = gross > 0 ? ((da / gross) * 100).toFixed(1) : "0";
  });

  function recalcRibbonRowDiscount() {
    const q = parseFloat(qtyInput.value) || 0;
    const r = parseFloat(rateInput.value) || 0;
    const dp = parseFloat(disPercentInput.value) || 0;
    disAmtInput.value = (q * r * (dp / 100)).toFixed(2);
  }

  let editingItemIndex = -1;
  addRowBtn.addEventListener("click", () => {
    const pName = (productSelect.value || "").trim();
    const pCode = codeSelect.value;
    const qty = parseFloat(qtyInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const mrp = parseFloat(mrpInput.value) || rate * 1.25;
    const disP = parseFloat(disPercentInput.value) || 0;
    const disA = parseFloat(disAmtInput.value) || 0;
    const selectedBatchNo = (typeof ribbonBatchSelect !== 'undefined' && ribbonBatchSelect) ? ribbonBatchSelect.value : "";
    if (!pName || !pCode || qty <= 0 || rate <= 0) {
      alert("Missing product details! Choose Product, Code, and enter positive Qty & Rate.");
      return;
    }

    if (!selectedBatchNo) {
      alert("Please choose a batch to sell from first.");
      return;
    }

    const currentMaterials = state.getMaterials() || materials || [];
    const mat = currentMaterials.find(m => m.name.toLowerCase() === pName.toLowerCase() && m.code === pCode);
    if (!mat) return;

    // Check availability in selected batch
    let originalQty = 0;
    if (editInvoice) {
      originalQty = editInvoice.items.filter(i => (i.materialId === mat.id || i.code === mat.code) && i.batchNo === selectedBatchNo).reduce((sum, i) => sum + i.quantity, 0);
    }
    const matchedBatch = mat.batches.find(b => b.batchNo === selectedBatchNo);
    const batchLimit = (matchedBatch ? matchedBatch.stock : 0) + originalQty;
    if (qty > batchLimit) {
      alert(`Insufficient stock in selected Batch! Available in batch: ${batchLimit} ${mat.unit}`);
      return;
    }

    const grossVal = qty * rate; // exclusive gross
    const netVal = grossVal - disA; // exclusive taxable value after row discount
    const seriesType = activeSeries ? activeSeries.seriesType : "LOCAL";
    const gstPercent = seriesType === "NONTAXABLE" ? 0 : ((mat.igst !== undefined && mat.igst !== null && mat.igst !== "") ? parseFloat(mat.igst) : 18);
    const gstAmt = seriesType === "NONTAXABLE" ? 0 : (netVal * (gstPercent / 100));
    const netAmount = netVal + gstAmt;

    if (editingItemIndex !== -1) {
      gridItems[editingItemIndex] = {

      materialId: mat.id,
      name: mat.name,
      code: mat.code,
      batchNo: selectedBatchNo,
      quantity: qty,
      unit: unitSelect.value,
      price: rate,
      mrp: mrp,
      discountPercent: disP,
      discountAmount: disA,
      netValue: netVal,
      gstPercent: gstPercent,
      gstAmount: gstAmt,
      cessPercent: mat.cess || 0,
      netAmount: netAmount
      };
      editingItemIndex = -1;
      addRowBtn.innerText = "Add Item";
    } else {
      gridItems.push({

      materialId: mat.id,
      name: mat.name,
      code: mat.code,
      batchNo: selectedBatchNo,
      quantity: qty,
      unit: unitSelect.value,
      price: rate,
      mrp: mrp,
      discountPercent: disP,
      discountAmount: disA,
      netValue: netVal,
      gstPercent: gstPercent,
      gstAmount: gstAmt,
      cessPercent: mat.cess || 0,
      netAmount: netAmount
      });
    }

    productSelect.value = "";
    productSelect.dispatchEvent(new Event("change"));
    qtyInput.value = "";
    rateInput.value = "";
    disPercentInput.value = "0";
    disAmtInput.value = "0.00";
    renderGridAndRecalc();
  });

  // Adjustments changes trigger recalculations
  document.getElementById("inv-adjustments").addEventListener("input", () => {
    isSalesManualRoundOff = false;
    renderGridAndRecalc();
  });
  document.getElementById("inv-addlcess").addEventListener("input", renderGridAndRecalc);
  document.getElementById("inv-roundoff").addEventListener("input", () => {
    isSalesManualRoundOff = true;
    renderGridAndRecalc();
  });
  document.getElementById("inv-roundoff").addEventListener("focus", (e) => e.target.select());
  document.getElementById("inv-state").addEventListener("change", renderGridAndRecalc);
  
  const generalDisPercentInput = document.getElementById("inv-discount-percent");
  const generalDisAmtInput = document.getElementById("inv-discount-amt");

  generalDisPercentInput.addEventListener("input", () => {
    generalDisAmtInput.value = "0.00";
    renderGridAndRecalc();
  });

  generalDisAmtInput.addEventListener("input", () => {
    generalDisPercentInput.value = "0";
    renderGridAndRecalc();
  });

  if (editInvoice) {
    const disPctVal = parseFloat(editInvoice.discountPercent) || 0;
    const disAmtVal = parseFloat(editInvoice.discountAmount) || 0;
    if (disPctVal > 0) {
      generalDisPercentInput.value = editInvoice.discountPercent;
      generalDisAmtInput.value = "0.00";
    } else if (disAmtVal > 0) {
      generalDisAmtInput.value = editInvoice.discountAmount;
      generalDisPercentInput.value = "0";
    } else {
      generalDisPercentInput.value = "0";
      generalDisAmtInput.value = "0.00";
    }
  }

  function renderGridAndRecalc() {
    const tbody = document.getElementById("sales-grid-body");

    // First, calculate total taxable value before general discount
    let totNetValBeforeGen = 0;
    gridItems.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const disP = parseFloat(item.discountPercent) || 0;
      const rowDisAmt = (qty * price) * (disP / 100);
      item.discountAmount = rowDisAmt;
      item.netValue = (qty * price) - rowDisAmt; // taxable value before general discount
      totNetValBeforeGen += item.netValue;
    });

    const disPct = parseFloat(generalDisPercentInput.value) || 0;
    let invoiceDiscount = parseFloat(generalDisAmtInput.value) || 0;
    if (totNetValBeforeGen > 0) {
      if (disPct > 0 && invoiceDiscount === 0) {
        invoiceDiscount = totNetValBeforeGen * (disPct / 100);
      }
    }
    const generalDiscountPercent = (totNetValBeforeGen > 0 && invoiceDiscount > 0) ? (invoiceDiscount / totNetValBeforeGen) * 100 : disPct;

    let totNetVal = 0;
    let totGst = 0;
    let totCess = 0;
    const renderedRows = gridItems.map((item, index) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const disP = parseFloat(item.discountPercent) || 0;
      const rowDisAmt = (qty * price) * (disP / 100);
      const taxableBeforeGeneral = (qty * price) - rowDisAmt;

      const gstPercent = parseFloat(item.gstPercent) || 0;
      const genDisAmt = (taxableBeforeGeneral * (generalDiscountPercent / 100)) / (1 + (gstPercent / 100));
      const finalNetValue = taxableBeforeGeneral - genDisAmt;
      const finalGstAmount = finalNetValue * (gstPercent / 100);
      const finalNetAmount = finalNetValue + finalGstAmount;

      // Update item properties so form submission gets the exact distributed state
      item.discountAmount = rowDisAmt + genDisAmt;
      item.netValue = finalNetValue;
      item.gstAmount = finalGstAmount;
      item.netAmount = finalNetAmount;

      totNetVal += finalNetValue;
      totGst += finalGstAmount;
      if (options.enableCess !== false) {
        totCess += (finalNetValue * ((parseFloat(item.cessPercent) || 0) / 100));
      }

      const totalDisPercent = (qty * price) > 0 ? (((rowDisAmt + genDisAmt) / (qty * price)) * 100).toFixed(1) : "0.0";

      return `
        <tr class="sales-grid-row" data-index="${index}" title="Double click to edit item" style="border-bottom: 1px solid #cbd5e1; background-color:${index % 2 === 0 ? '#f8fafc' : 'white'}; cursor: pointer;">
          <td style="padding:4px 6px;"><strong>${item.name}</strong></td>
          <td style="padding:4px 6px;"><code style="background-color:#f1f5f9; padding:2px; font-weight:700;">${item.code}</code></td>
          <td style="padding:4px 6px; font-weight:bold; color:#1e3b8b;">${item.batchNo || ''}</td>
          <td style="padding:4px 6px; text-align:right;">${item.quantity} ${item.unit}</td>
          <td style="padding:4px 6px; text-align:right;">\u20B9${item.price.toFixed(2)}</td>
          <td style="padding:4px 6px; text-align:right;">\u20B9${(qty * price).toFixed(2)}</td>
          <td style="padding:4px 6px; text-align:right; color:#ef4444;">\u20B9${(rowDisAmt + genDisAmt).toFixed(2)} (${totalDisPercent}%)</td>
          <td style="padding:4px 6px; text-align:right; font-weight:600;">\u20B9${finalNetValue.toFixed(2)}</td>
          <td style="padding:4px 6px; text-align:right; display:${isCompUnregistered ? 'none' : ''};">${item.gstPercent}%</td>
          <td style="padding:4px 6px; text-align:right; display:${isCompUnregistered ? 'none' : ''};">\u20B9${finalGstAmount.toFixed(2)}</td>
          <td style="padding:4px 6px; text-align:right; font-weight:600; color:#1e40af;">\u20B9${finalNetAmount.toFixed(2)}</td>
          <td style="padding:4px 6px; text-align:center;">
            <button type="button" class="btn-remove-grid-row" data-index="${index}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:1.1rem;">&times;</button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = gridItems.length === 0 ? `
      <tr><td colspan="12" style="text-align:center; padding:20px; color:#64748b;">No items added to the sales invoice.</td></tr>
    ` : renderedRows;

    tbody.querySelectorAll(".btn-remove-grid-row").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        gridItems.splice(idx, 1);
        renderGridAndRecalc();
      });
    });

    tbody.querySelectorAll(".sales-grid-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const idx = parseInt(row.getAttribute("data-index"));
        const item = gridItems[idx];
        if (!item) return;

        productSelect.value = item.name;
        productSelect.dispatchEvent(new Event("change"));
        codeSelect.value = item.code;
        if (codeSearch) codeSearch.value = item.code || "";
        codeSelect.dispatchEvent(new Event("change"));
        
        if (typeof ribbonBatchSelect !== 'undefined' && ribbonBatchSelect) {
          ribbonBatchSelect.value = String(item.batchNo || "");
        }
qtyInput.value = item.quantity;
unitSelect.value = item.unit;
rateInput.value = item.price;
mrpInput.value = item.mrp;
disPercentInput.value = item.discountPercent;
disAmtInput.value = item.discountAmount;

editingItemIndex = idx;
addRowBtn.innerText = "Modify";
      });
    });

    const discountedNetVal = totNetVal;
    const selectedState = document.getElementById("inv-state").value;
    const cgstInput = document.getElementById("inv-cgst");
    const sgstInput = document.getElementById("inv-sgst");
    const igstInput = document.getElementById("inv-igst");
    const cessInput = document.getElementById("inv-cess");

    const activeCompanyId = state.getActiveCompanyId();
    const activeCompany = state.getRegisteredCompanies().find(c => c.id === activeCompanyId);
    const companyState = activeCompany ? (activeCompany.state || "KERALA").toUpperCase() : "KERALA";

    if (selectedState === companyState) {
      cgstInput.value = (totGst / 2).toFixed(2);
      sgstInput.value = (totGst / 2).toFixed(2);
      igstInput.value = "0.00";
    } else {
      cgstInput.value = "0.00";
      sgstInput.value = "0.00";
      igstInput.value = totGst.toFixed(2);
    }
    cessInput.value = totCess.toFixed(2);

    // Calculate preset loading charges dynamically
    let totalLoadingCharge = 0;
    gridItems.forEach(item => {
      const mat = materials.find(m => m.id === item.materialId || (m.name === item.name && m.code === item.code));
      const loadingChargeRate = mat && mat.loadingCharge !== undefined ? parseFloat(mat.loadingCharge) : 0;
      totalLoadingCharge += (parseFloat(item.quantity) || 0) * loadingChargeRate;
    });

    // Update or insert "LOADING CHARGES" in adjustmentsList (if not overridden by user)
    let loadingAdj = adjustmentsList.find(a => a.name === "LOADING CHARGES");
    if (loadingAdj) {
      if (loadingAdj.isOverridden !== true) {
        loadingAdj.amount = totalLoadingCharge;
      }
    } else if (totalLoadingCharge > 0) {
      // Only auto-insert LOADING CHARGES when items actually have a preset loading rate
      const masterAdjustments = state.getSalesAdjustments();
      const masterLoading = masterAdjustments.find(a => a.name === "LOADING CHARGES" || a.name === "LOADING CHARGE");
      const ledgerCode = masterLoading ? masterLoading.ledgerCode : "L032";
      adjustmentsList.push({ type: "Add", name: "LOADING CHARGES", amount: totalLoadingCharge, ledgerCode });
    }

    let adj = 0;
    adjustmentsList.forEach(a => {
      if (a.type === "Add") adj += parseFloat(a.amount) || 0;
      else adj -= parseFloat(a.amount) || 0;
    });
    document.getElementById("inv-adjustments").value = adj.toFixed(2);

    const addlCess = parseFloat(document.getElementById("inv-addlcess").value) || 0;
    
    // Auto round-off total silently to nearest whole rupee unless user manually edited it
    const rawTotal = discountedNetVal + totGst + totCess + adj + addlCess;
    let roundOff = 0;
    let netFinal = 0;

    if (!isSalesManualRoundOff) {
      const roundedTotal = Math.round(rawTotal);
      roundOff = roundedTotal - rawTotal;
      const roundOffEl = document.getElementById("inv-roundoff");
      if (roundOffEl) {
        roundOffEl.value = roundOff.toFixed(2);
      }
      netFinal = roundedTotal;
    } else {
      roundOff = parseFloat(document.getElementById("inv-roundoff")?.value) || 0;
      netFinal = rawTotal + roundOff;
    }

    document.getElementById("inv-nettotal-box").innerText = `\u20B9${netFinal.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  }
  let isInvoiceSubmitting = false;
  document.getElementById("create-invoice-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (isInvoiceSubmitting) return;

    if (gridItems.length === 0) {
      alert("The invoice item grid is empty! Please add at least one product.");
      return;
    }
    
    const siteContainer = document.getElementById("inv-site-container");
    const siteSelect = document.getElementById("inv-site");
    if (siteContainer.style.display !== "none" && !siteSelect.value) {
      alert("Please select a Site for this multiple-site customer.");
      return;
    }

    const invDateVal = document.getElementById("inv-date").value;
    const invDueDateVal = document.getElementById("inv-duedate").value;
    if (invDueDateVal && invDateVal && invDueDateVal < invDateVal) {
      alert("Due Date cannot be less than Invoice Date!");
      return;
    }

    isInvoiceSubmitting = true;
    const saveBtn = document.getElementById("btn-inv-save");
    if (saveBtn) saveBtn.disabled = true;

    try {
      const payload = {
        id: editInvoice ? editInvoice.id : undefined,
        voucherNo: editInvoice ? editInvoice.voucherNo : undefined,
        seriesId: activeSeries ? activeSeries.id : undefined,
        postingLedger: activeSeries ? activeSeries.ledgerCode : undefined,
        contactId: document.getElementById("inv-customer").value,
        siteName: siteContainer.style.display !== "none" ? siteSelect.value : "",
        refNo: document.getElementById("inv-refno").value,
        employee: options.enableEmployeeSales ? document.getElementById("inv-employee").value.trim() : "",
        influencer: options.enableInfluencerSales ? document.getElementById("inv-influencer").value.trim() : "",
        date: document.getElementById("inv-date").value,
        dueDate: document.getElementById("inv-duedate").value,
        state: document.getElementById("inv-state").value,
        payMode: document.getElementById("inv-paymode").value,
        creditPeriod: document.getElementById("inv-crperiod").value,
        narration: document.getElementById("inv-narration").value,
        vehicleNo: document.getElementById("inv-vehicle-no") ? document.getElementById("inv-vehicle-no").value.trim() : "",
        headloaderType: document.getElementById("inv-headloader-type") ? document.getElementById("inv-headloader-type").value : "std",
        shippingAddress: shippingAddressVal,
        discountPercent: generalDisPercentInput.value,
        discountAmount: generalDisAmtInput.value,
        adjustments: document.getElementById("inv-adjustments").value,
        adjustmentsList: adjustmentsList,
        additionalCess: document.getElementById("inv-addlcess").value,
        roundOff: document.getElementById("inv-roundoff").value,
        items: gridItems
      };

      if (editInvoice) {
        const pass = prompt("Enter Admin Password to update this invoice:");
        if (pass === null) {
          isInvoiceSubmitting = false;
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        if (pass !== state.getAdminPassword()) {
          alert("Incorrect password!");
          isInvoiceSubmitting = false;
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        state.cancelInvoice(editInvoice.id);
        const idx = state.invoices.findIndex(i => i.id === editInvoice.id);
        if (idx !== -1) {
          state.invoices.splice(idx, 1);
        }
      }

      const newInv = state.createInvoice(payload);
      if (newInv) {
        const wantPrint = confirm("INVOICE SAVED SUCCESSFULLY.\n\nDo you want to print this invoice?");
        
        // Refresh background transaction log list
        if (onSuccess) onSuccess();

        // Clean up global keydown listener before re-opening modal
        window.removeEventListener("keydown", handleGlobalKeydown);

        // Reset form/window for next invoice entry (New Bill) of the same series
        showInvoiceBuilderModal(container, customers, materials, onSuccess, null, activeSeries);

        if (wantPrint) {
          showInvoicePrintPreview(document.getElementById("modal-container-root"), newInv);
        }
      } else {
        alert("Failed to save invoice. Ensure stock levels are not exceeded.");
        isInvoiceSubmitting = false;
        if (saveBtn) saveBtn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      isInvoiceSubmitting = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  if (editInvoice && editInvoice.isCancelled) {
    setTimeout(() => {
      const modalOverlay = document.getElementById("modal-overlay");
      if (modalOverlay) {
        modalOverlay.querySelectorAll("input, select, textarea, button").forEach(el => {
          const allowedIds = ["inv-close-btn", "inv-close-btn-header", "btn-inv-search", "btn-inv-prev", "btn-inv-next", "btn-inv-print", "btn-inv-new", "btn-inv-cancel", "btn-print"];
          if (!allowedIds.includes(el.id) && !el.classList.contains("win-btn") && el.innerText !== "Close") {
            el.disabled = true;
            el.style.opacity = "0.75";
            el.style.cursor = "not-allowed";
          }
        });
      }
    }, 50);
  }

  renderGridAndRecalc();
  updateCustomerClosingBalanceDisplay();
}

// Sales Return Modal (Credit Note - High-Fidelity ERP Style)
export function showSalesReturnModal(container, editReturn = null, onSuccess = null, selectedSeries = null) {
  const root = document.getElementById("modal-container-root");
  const customers = state.getContacts()
    .filter(c => c.type === "customer" || c.listInCustomerList === true)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  const materials = state.getMaterials();
  const salesExecutivesList = ["Mr. Suresh Kumar", "Mr. Rajesh P.", "Mr. Anil Nair", "Mrs. Bindu V."];

  const activeCompanyId = state.getActiveCompanyId();
  const currentCompany = state.getRegisteredCompanies().find(c => c.id === activeCompanyId);
  const financialYears = currentCompany ? (currentCompany.financialYears || []) : [];
  const activeFyId = state.getActiveFyId();

  const getInvoicesForFy = (fyId) => {
    if (fyId === state.getActiveFyId()) {
      return state.getInvoices();
    }
    const stored = localStorage.getItem(`erp_company_data_${activeCompanyId}${fyId === 'default' ? '' : '_' + fyId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.invoices || [];
      } catch (e) {
        console.error("Error parsing data for FY " + fyId, e);
      }
    }
    return [];
  };

  let selectedFyIdForEdit = activeFyId;
  if (editReturn) {
    let originalBillNo = editReturn.billNo || "";
    if (!originalBillNo && editReturn.contactId) {
      for (const fy of financialYears) {
        const stored = localStorage.getItem(`erp_company_data_${activeCompanyId}${fy.id === 'default' ? '' : '_' + fy.id}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const fyInvoices = parsed.invoices || [];
            const customerInvoices = fyInvoices.filter(inv => inv.contactId === editReturn.contactId);
            for (const inv of customerInvoices) {
              const invoiceItemIds = (inv.items || []).map(item => item.materialId);
              const allReturnItemsMatch = editReturn.items.every(retItem => invoiceItemIds.includes(retItem.materialId));
              if (allReturnItemsMatch) {
                originalBillNo = inv.id;
                selectedFyIdForEdit = fy.id;
                break;
              }
            }
          } catch(e) {}
        }
        if (originalBillNo) break;
      }
    } else if (originalBillNo) {
      for (const fy of financialYears) {
        const stored = localStorage.getItem(`erp_company_data_${activeCompanyId}${fy.id === 'default' ? '' : '_' + fy.id}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const fyInvoices = parsed.invoices || [];
            if (fyInvoices.some(inv => String(inv.id) === String(originalBillNo))) {
              selectedFyIdForEdit = fy.id;
              break;
            }
          } catch(e) {}
        }
      }
    }
  }

  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-tx" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1600px; width: 98vw; background-color:#cbd5e1; color:#0f172a; padding:15px; font-family: var(--font-body); border: 2px solid #5a7b9c; border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); font-size:0.85rem;">
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 4px 4px 0 0; border-bottom: 1px solid #1d4ed8;">
          <div><i class="fa-solid fa-arrow-rotate-left"></i> SALES RETURN [Bill Series: &lt;DEFAULT&gt;] ${editReturn ? '(EDITING SR)' : ''} Press Alt+F5 to change Bill Series</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.3rem; cursor:pointer;" id="pm-close-btn-header">&times;</button>
        </div>

        <form id="create-sales-return-form" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          
          <!-- Top Row banner & metadata inputs -->
          <div style="display: grid; grid-template-columns: 100px 1fr 140px; gap: 10px; align-items: center; background-color: #cbd5e1; padding: 4px 0;">
            <div style="background-color: #f1f5f9; border: 1px solid #94a3b8; text-align: center; padding: 4px; border-radius: 2px;">
              <span style="font-weight: 700; font-size: 0.72rem; display: block; color: #1e3b8b;">ReturnNo</span>
              <input type="text" id="ret-inv-refno" style="width: 100%; border: none; background: transparent; text-align: center; font-weight: bold; font-size: 0.85rem;" value="${editReturn ? editReturn.id : 'SR-' + String(state.getSalesReturns().length + 1).padStart(3, '0')}" readonly>
            </div>
            
            <div style="text-align: center; background: #e2e8f0; border: 1px solid #94a3b8; padding: 6px; font-weight: bold; font-size: 1.1rem; letter-spacing: 2px; color: #1e3b8b;">
              ${(state.getRegisteredCompanies().find(c => String(c.id) === String(activeCompanyId))?.name || '').toUpperCase()}
            </div>

            <div style="background-color: #f1f5f9; border: 1px solid #94a3b8; text-align: center; padding: 4px; border-radius: 2px;">
              <span style="font-weight: 700; font-size: 0.72rem; display: block; color: #1e3b8b;">Date</span>
              <input type="date" id="ret-inv-date" style="width: 100%; border: none; background: transparent; text-align: center; font-size: 0.8rem;" value="${editReturn ? editReturn.date : state.getLoginDate()}" required>
            </div>
          </div>

          <!-- Metadata row -->
          <div style="background-color:#f1f5f9; padding:10px; border:1px solid #94a3b8; border-radius:4px; display:grid; grid-template-columns: 0.8fr 1fr 1.8fr 1.2fr 1.2fr 1fr 1fr 1fr; gap:8px; align-items:center;">
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">F.Y.</label>
              <select id="ret-fy-select" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;">
                ${financialYears.map(fy => {
    const isSelected = fy.id === (editReturn ? selectedFyIdForEdit : activeFyId);
    const label = state.getFyDisplayLabel(fy);
    return `<option value="${fy.id}" ${isSelected ? 'selected' : ''}>${label}</option>`;
}).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">BillNo</label>
              <select id="ret-billno-select" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;" disabled>
                <option value="">-- Choose BillNo --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Customer *</label>
              <select id="ret-customer" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;" required>
                <option value="">-- Choose Customer --</option>
                ${customers.map(c => `<option value="${c.id}">${c.name} (Bal: \u20B9${c.balance.toFixed(2)})</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Site Name</label>
              <select id="ret-site" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;">
                <option value="">-- Main Site --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Salesman/Executive Name</label>
              <select id="ret-salesman" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;">
                <option value="">-- Choose Name --</option>
                ${salesExecutivesList.map(se => `<option value="${se}">${se}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">State</label>
              <select id="ret-state" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;">
                <option value="KERALA" selected>KERALA</option>
                <option value="KARNATAKA">KARNATAKA</option>
                <option value="TAMIL NADU">TAMIL NADU</option>
                <option value="OUTSTATE">OUTSIDE STATE</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Currency</label>
              <select id="ret-currency" class="form-control" style="background-color:#e2e8f0; color:black; padding:2px 6px; font-size:0.8rem;" disabled>
                <option value="INR" selected>Rs.</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Stock Location</label>
              <select id="ret-location" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;">
                <option value="Main" selected>&lt;Main&gt;</option>
              </select>
            </div>
          </div>

          <!-- Product Ribbon bar -->
          <div style="background-color:#94a3b8; padding:8px; border:1px solid #475569; border-radius:var(--border-radius-sm); display:grid; grid-template-columns: 1.8fr 1.2fr 1fr 0.6fr 0.6fr 0.8fr 0.8fr 80px; gap:6px; align-items:end;">
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Product Name</label>
              <select id="ret-ribbon-product" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" disabled>
                <option value="">-- Choose Product Name --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Code/Model/Size</label>
              <select id="ret-ribbon-code" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" disabled>
                <option value="">-- Code/Model --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Batch</label>
              <select id="ret-ribbon-batch" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" disabled>
                <option value="">-- Batch --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Qty</label>
              <input type="number" step="0.01" id="ret-ribbon-qty" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Unit</label>
              <select id="ret-ribbon-unit" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;">
                ${getUnitOptionsHTML()}
              </select>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Rate [Excl]</label>
              <input type="number" step="0.01" id="ret-ribbon-rate" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0.00">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">M.R.P</label>
              <input type="number" step="0.01" id="ret-ribbon-mrp" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0.00">
            </div>
            <button type="button" class="btn btn-primary" id="btn-ret-ribbon-add" style="padding:4px; font-size:0.75rem; font-weight:bold; height:28px; width:100%; background-color:#1e3b8b; border:none; color:white;">Add</button>
          </div>

          <!-- Stock feedback label -->
          <div style="background-color:#cbd5e1; border:1px solid #94a3b8; padding:3px 8px; font-weight:700; font-size:0.75rem; color:#1e293b;" id="ret-stock-feedback">
            Stock : <span id="lbl-ret-availstock">0.00</span>
          </div>

          <!-- Main Grid -->
          <div style="border: 1px solid #94a3b8; background-color: white; min-height:220px; max-height:280px; overflow-y:auto; border-radius: var(--border-radius-sm);">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem; color:black;">
              <thead>
                <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
                  <th style="padding:6px;">Product Name</th>
                  <th style="padding:6px;">Code/Model</th>
                  <th style="padding:6px; font-weight:bold; color:#1e3b8b;">Batch</th>
                  <th style="padding:6px; text-align:right;">Qty</th>
                  <th style="padding:6px; text-align:right;">Rate</th>
                  <th style="padding:6px; text-align:right;">Amount</th>
                  <th style="padding:6px; text-align:right;">GST%</th>
                  <th style="padding:6px; text-align:right;">GST AMT</th>
                  <th style="padding:6px; text-align:right; font-weight:600; color:#1e40af;">Net Amount</th>
                  <th style="padding:6px; text-align:center; width:40px;">Remove</th>
                </tr>
              </thead>
              <tbody id="ret-sales-grid-body">
                <!-- Grid Rows -->
              </tbody>
            </table>
          </div>

          <!-- Bottom calculations and splits -->
          <div style="display:grid; grid-template-columns: 1.2fr 1fr 1.2fr; gap:15px; background-color:#cbd5e1; padding:8px; border:1px solid #94a3b8; border-radius:var(--border-radius-sm);">
            <!-- Bottom Left Fields -->
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <label style="font-weight:600; font-size:0.75rem;">Pay Mode</label>
                <select id="ret-paymode" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem; height:24px;">
                  <option value="Credit" selected>Credit</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <label style="font-weight:600; font-size:0.75rem;">Narration</label>
                <input type="text" id="ret-narration" class="form-control" style="background-color:white; color:black; padding:4px 6px; font-size:0.75rem;" placeholder="Reason for return">
              </div>
              <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                <input type="checkbox" id="ret-gst-on-mrp" style="cursor:pointer;">
                <label for="ret-gst-on-mrp" style="font-size:0.75rem; font-weight:600; cursor:pointer;">GST on MRP</label>
              </div>
            </div>

            <!-- Tax splits exactly as screenshot -->
            <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #1e3a8a; margin-bottom: 2px;">TAX BREAKDOWN</span>
              <div style="display: flex; gap: 4px; background: #cbd5e1; border: 1px solid #94a3b8; padding: 4px; border-radius: 4px; width: 100%;">
                <div style="flex:1; text-align:center;">
                  <span style="font-weight:700; font-size:0.68rem; display:block; background:#1e3b8b; color:white; padding:1px 2px;">CGST</span>
                  <input type="text" id="ret-tax-cgst" readonly style="width:100%; border:1px solid #94a3b8; background:white; text-align:center; padding:2px; font-size:0.75rem; font-weight:bold; color:black;" value="0.00">
                </div>
                <div style="flex:1; text-align:center;">
                  <span style="font-weight:700; font-size:0.68rem; display:block; background:#1e3b8b; color:white; padding:1px 2px;">SGST</span>
                  <input type="text" id="ret-tax-sgst" readonly style="width:100%; border:1px solid #94a3b8; background:white; text-align:center; padding:2px; font-size:0.75rem; font-weight:bold; color:black;" value="0.00">
                </div>
                <div style="flex:1; text-align:center;">
                  <span style="font-weight:700; font-size:0.68rem; display:block; background:#1e3b8b; color:white; padding:1px 2px;">IGST</span>
                  <input type="text" id="ret-tax-igst" readonly style="width:100%; border:1px solid #94a3b8; background:white; text-align:center; padding:2px; font-size:0.75rem; font-weight:bold; color:black;" value="0.00">
                </div>
                <div style="flex:1; text-align:center; display:none;">
                  <span style="font-weight:700; font-size:0.68rem; display:block; background:#1e3b8b; color:white; padding:1px 2px;">CESS</span>
                  <input type="text" id="ret-tax-cess" readonly style="width:100%; border:1px solid #94a3b8; background:white; text-align:center; padding:2px; font-size:0.75rem; font-weight:bold; color:black;" value="0.00">
                </div>
              </div>
            </div>

            <!-- Bottom Right totals block -->
            <div style="display:flex; flex-direction:column; gap:4px; font-weight:700; font-size:0.8rem; justify-content:flex-end;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Adjustments:</span>
                <input type="number" step="0.01" id="ret-adjustments" class="form-control" style="width:120px; background-color:#e2e8f0; color:black; text-align:right; padding:2px;" value="0.00" readonly>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Round Off:</span>
                <input type="number" step="0.01" id="ret-roundoff" class="form-control" style="width:120px; background-color:white; color:black; text-align:right; padding:2px;" value="0.00">
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid #94a3b8; padding-top:6px;">
                <span style="font-size: 1.1rem; color: #1e3b8b;">NET AMOUNT</span>
                <input type="text" id="lbl-ret-nettotal" readonly style="width:160px; background-color:white; color:red; font-weight:900; text-align:right; padding:4px 8px; border:1px solid #94a3b8; font-size:1.25rem;" value="0.00">
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons exactly matching screenshot -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; background-color:#b4c6e7; padding:8px; border:1px solid #94a3b8; border-radius:4px;">
            <div style="display:flex; gap:10px;">
              <button type="button" class="btn" id="btn-ret-remove-kfc" style="background:#f1f5f9; border:1px solid #475569; padding:4px 10px; font-weight:bold; color:black;">Remove KFC</button>
              <button type="button" class="btn" id="btn-ret-print" style="background:#e2e8f0; border:1px solid #1e3b8b; padding:4px 14px; font-weight:bold; color:black;"><i class="fa-solid fa-print"></i> Print</button>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn" id="btn-ret-new" style="background:#e2e8f0; border:1px solid #475569; padding:4px 14px; font-weight:bold; color:black;">New</button>
              <button type="submit" class="btn" style="background:#e2e8f0; border:1px solid #1e3b8b; padding:4px 14px; font-weight:bold; color:black;">Save</button>
              <button type="button" class="btn btn-secondary" id="btn-ret-cancel" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black;">Cancel</button>
              <button type="button" class="btn" id="btn-ret-search" style="background:#e2e8f0; border:1px solid #475569; padding:4px 14px; color:black;">Search</button>
              <button type="button" class="btn" id="btn-ret-salesearch" style="background:#e2e8f0; border:1px solid #475569; padding:4px 14px; color:black;">Sale Search</button>
              <button type="button" class="btn" id="btn-ret-prev" style="background:#e2e8f0; border:1px solid #475569; width:28px; color:black;">&lt;</button>
              <button type="button" class="btn" id="btn-ret-next" style="background:#e2e8f0; border:1px solid #475569; width:28px; color:black;">&gt;</button>
            </div>
          </div>

        </form>
      </div>
    </div>
  `;

  const overlay = document.getElementById("modal-overlay-tx");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };

  document.getElementById("pm-close-btn-header").addEventListener("click", close);
  document.getElementById("btn-ret-cancel").addEventListener("click", close);
  document.getElementById("btn-ret-new").addEventListener("click", () => {
    showSalesReturnModal(container, null, onSuccess);
  });
  document.getElementById("btn-ret-search").addEventListener("click", () => {
    close();
    setTransactionsActiveTab("sales-return");
    window.location.hash = "#transactions";
  });
  document.getElementById("btn-ret-salesearch").addEventListener("click", () => {
    close();
    setTransactionsActiveTab("sales");
    window.location.hash = "#transactions";
  });
  document.getElementById("btn-ret-print").addEventListener("click", () => {
    window.print();
  });
  document.getElementById("btn-ret-remove-kfc").addEventListener("click", () => {
    alert("KFC Removed successfully.");
  });

  // Bind Previous and Next buttons
  const allReturns = state.getSalesReturns();
  const curIdx = editReturn ? allReturns.findIndex(ret => ret.id === editReturn.id) : -1;

  document.getElementById("btn-ret-prev").addEventListener("click", () => {
    if (curIdx > 0) {
      close();
      showSalesReturnModal(container, allReturns[curIdx - 1], onSuccess);
    } else if (curIdx === -1 && allReturns.length > 0) {
      close();
      showSalesReturnModal(container, allReturns[allReturns.length - 1], onSuccess);
    }
  });

  document.getElementById("btn-ret-next").addEventListener("click", () => {
    if (editReturn && curIdx !== -1 && curIdx < allReturns.length - 1) {
      close();
      showSalesReturnModal(container, allReturns[curIdx + 1], onSuccess);
    }
  });

  const productSelect = document.getElementById("ret-ribbon-product");
  const codeSelect = document.getElementById("ret-ribbon-code");
  const qtyInput = document.getElementById("ret-ribbon-qty");
  const unitSelect = document.getElementById("ret-ribbon-unit");
  const rateInput = document.getElementById("ret-ribbon-rate");
  const mrpInput = document.getElementById("ret-ribbon-mrp");
  const addRowBtn = document.getElementById("btn-ret-ribbon-add");
  const availStockSpan = document.getElementById("lbl-ret-availstock");

  let gridItems = editReturn ? editReturn.items.map(item => {
    const mat = materials.find(m => m.id === item.materialId || m.name === item.name);
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.price) || 0;
    const amount = qty * rate;
    const gstPercent = mat ? ((mat.igst !== undefined && mat.igst !== null && mat.igst !== "") ? parseFloat(mat.igst) : 18) : 18;
    const gstAmount = amount * (gstPercent / 100);
    return {
      materialId: item.materialId,
      name: item.name || (mat ? mat.name : ""),
      code: mat ? mat.code : "",
      quantity: qty,
      unit: item.unit || (mat ? mat.unit : "Bags"),
      price: rate,
      mrp: item.mrp || (mat ? mat.mrp : rate * 1.25),
      batchNo: item.batchNo || "",
      amount: amount,
      gstPercent: gstPercent,
      gstAmount: gstAmount,
      netAmount: amount + gstAmount
    };
  }) : [];

  const fySelect = document.getElementById("ret-fy-select");
  const customerSelect = document.getElementById("ret-customer");
  const siteSelect = document.getElementById("ret-site");
  const billnoSelect = document.getElementById("ret-billno-select");
  let adjustmentsList = editReturn ? (editReturn.adjustmentsList || []) : [];

  const populateSites = (contactId, selectedSite = null) => {
    const cust = customers.find(c => c.id === contactId);
    if (cust && cust.sites && cust.sites.length > 0) {
      siteSelect.innerHTML = '<option value="">-- Main Site --</option>' +
        cust.sites.map(site => `<option value="${site}" ${selectedSite === site ? 'selected' : ''}>${site}</option>`).join("");
      siteSelect.disabled = false;
    } else {
      siteSelect.innerHTML = '<option value="">-- Main Site --</option>';
      siteSelect.disabled = true;
    }
  };

  const populateCustomerInvoices = (customerId, selectedInvoice = null) => {
    if (!customerId) {
      billnoSelect.innerHTML = '<option value="">-- Choose BillNo --</option>';
      billnoSelect.disabled = true;
      productSelect.innerHTML = '<option value="">-- Choose Product Name --</option>';
      productSelect.disabled = true;
      return;
    }
    const selectedFyId = fySelect.value;
    const customerInvoices = getInvoicesForFy(selectedFyId).filter(inv => inv.contactId === customerId);
    billnoSelect.innerHTML = '<option value="">-- Choose BillNo --</option>' +
      customerInvoices.map(inv => `<option value="${inv.id}" ${selectedInvoice === inv.id ? 'selected' : ''}>${inv.id}</option>`).join("");
    billnoSelect.disabled = false;
  };

  fySelect.addEventListener("change", () => {
    populateCustomerInvoices(customerSelect.value);
  });

  customerSelect.addEventListener("change", () => {
    populateSites(customerSelect.value);
    populateCustomerInvoices(customerSelect.value);
  });

  billnoSelect.addEventListener("change", () => {
    const billNo = billnoSelect.value;
    if (billNo) {
      const selectedFyId = fySelect.value;
      const invoice = getInvoicesForFy(selectedFyId).find(inv => String(inv.id) === String(billNo));
      if (invoice) {
        populateSites(invoice.contactId, invoice.siteName);
        document.getElementById("ret-state").value = invoice.state || "KERALA";
        if (invoice.salesmanName) {
          document.getElementById("ret-salesman").value = invoice.salesmanName;
        }
        const invoiceItems = invoice.items || [];
        const uniqueProductNames = [...new Set(invoiceItems.map(item => item.name || item.materialName).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        productSelect.innerHTML = '<option value="">-- Choose Product Name --</option>' +
          uniqueProductNames.map(name => `<option value="${name}">${name}</option>`).join("");
        productSelect.disabled = false;
      }
    } else {
      productSelect.innerHTML = '<option value="">-- Choose Product Name --</option>';
      productSelect.disabled = true;
    }
    codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
    codeSelect.disabled = true;
    ribbonRetBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
    ribbonRetBatchSelect.disabled = true;
    qtyInput.value = "";
    rateInput.value = "";
    mrpInput.value = "";
    availStockSpan.innerText = "0.00";
  });

  if (editReturn) {
    customerSelect.value = editReturn.contactId;
    customerSelect.disabled = true;
    populateSites(editReturn.contactId, editReturn.siteName);

    let originalBillNo = editReturn.billNo || "";
    if (!originalBillNo && editReturn.contactId) {
      const selectedFyId = fySelect.value;
      const customerInvoices = getInvoicesForFy(selectedFyId).filter(inv => inv.contactId === editReturn.contactId);
      for (const inv of customerInvoices) {
        const invoiceItemIds = (inv.items || []).map(item => item.materialId);
        const allReturnItemsMatch = editReturn.items.every(retItem => invoiceItemIds.includes(retItem.materialId));
        if (allReturnItemsMatch) {
          originalBillNo = inv.id;
          break;
        }
      }
    }

    populateCustomerInvoices(editReturn.contactId, originalBillNo);
    billnoSelect.value = originalBillNo;
    billnoSelect.disabled = true;
    
    const selectedFyId = fySelect.value;
    const invoice = getInvoicesForFy(selectedFyId).find(inv => String(inv.id) === String(originalBillNo));
    if (invoice) {
      const invoiceItems = invoice.items || [];
      const uniqueProductNames = [...new Set(invoiceItems.map(item => item.name || item.materialName).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      productSelect.innerHTML = '<option value="">-- Choose Product Name --</option>' +
        uniqueProductNames.map(name => `<option value="${name}">${name}</option>`).join("");
      productSelect.disabled = false;
    }

    document.getElementById("ret-narration").value = editReturn.narration || "";
    document.getElementById("ret-paymode").value = editReturn.payMode || "Credit";
    document.getElementById("ret-roundoff").value = editReturn.roundOff || "0.00";
  }

  const ribbonRetBatchSelect = document.getElementById("ret-ribbon-batch");

  // When product changes
  productSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    const billNo = billnoSelect.value;
    if (pName && billNo) {
      const selectedFyId = fySelect.value;
      const invoice = getInvoicesForFy(selectedFyId).find(inv => String(inv.id) === String(billNo));
      const invoiceItems = invoice ? (invoice.items || []) : [];
      const matchingItems = invoiceItems
        .filter(item => (item.name || item.materialName) === pName)
        .sort((a, b) => {
          const matA = materials.find(m => m.id === a.materialId);
          const matB = materials.find(m => m.id === b.materialId);
          const codeA = matA ? matA.code : (a.code || "");
          const codeB = matB ? matB.code : (b.code || "");
          return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });

      codeSelect.innerHTML = '<option value="">-- Code/Model --</option>' + 
        matchingItems.map(item => {
          const mat = materials.find(m => m.id === item.materialId);
          const code = mat ? mat.code : (item.code || "");
          return `<option value="${code}" data-item-id="${item.materialId}">${code}</option>`;
        }).join("");
      codeSelect.disabled = false;
      availStockSpan.innerText = "0.00";
    } else {
      codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
      codeSelect.disabled = true;
      ribbonRetBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
      ribbonRetBatchSelect.disabled = true;
      availStockSpan.innerText = "0.00";
    }
  });

  // When code changes
  codeSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    const pCode = codeSelect.value;
    const billNo = billnoSelect.value;
    if (pName && pCode && billNo) {
      const selectedFyId = fySelect.value;
      const invoice = getInvoicesForFy(selectedFyId).find(inv => String(inv.id) === String(billNo));
      const selectedOption = codeSelect.options[codeSelect.selectedIndex];
      const matId = selectedOption.getAttribute("data-item-id");
      const invoiceItem = invoice ? invoice.items.find(item => item.materialId === matId) : null;

      if (invoiceItem) {
        const mat = materials.find(m => m.id === matId);
        rateInput.value = invoiceItem.price ? parseFloat(invoiceItem.price).toFixed(2) : "";
        mrpInput.value = invoiceItem.mrp ? parseFloat(invoiceItem.mrp).toFixed(2) : (parseFloat(invoiceItem.price) * 1.25).toFixed(2);
        qtyInput.value = invoiceItem.quantity || "";
        updateRibbonUnitSelect(unitSelect, invoiceItem.unit || (mat ? mat.unit : "Bags"));

        const bNo = invoiceItem.batchNo || String(invoiceItem.price);
        ribbonRetBatchSelect.innerHTML = `<option value="${bNo}">${bNo}</option>`;
        ribbonRetBatchSelect.value = bNo;
        ribbonRetBatchSelect.disabled = false;

        const batchObj = mat ? mat.batches.find(b => b.batchNo === bNo) : null;
        availStockSpan.innerText = batchObj ? (batchObj.stock || 0).toFixed(2) : "0.00";
      }
    } else {
      ribbonRetBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
      ribbonRetBatchSelect.disabled = true;
      qtyInput.value = "";
      rateInput.value = "";
      mrpInput.value = "";
      availStockSpan.innerText = "0.00";
    }
  });

  function renderGridAndRecalc() {
    const tbody = document.getElementById("ret-sales-grid-body");
    tbody.innerHTML = gridItems.map((item, idx) => `
      <tr style="border-bottom:1px solid #cbd5e1;">
        <td style="padding:6px;"><strong>${item.name}</strong></td>
        <td style="padding:6px;">${item.code}</td>
        <td style="padding:6px; font-weight:bold; color:#1e3b8b;">${item.batchNo || ''}</td>
        <td style="padding:6px; text-align:right;">${item.quantity.toFixed(2)}</td>
        <td style="padding:6px; text-align:right;">\u20B9${item.price.toFixed(2)}</td>
        <td style="padding:6px; text-align:right;">\u20B9${item.amount.toFixed(2)}</td>
        <td style="padding:6px; text-align:right;">${item.gstPercent}%</td>
        <td style="padding:6px; text-align:right;">\u20B9${item.gstAmount.toFixed(2)}</td>
        <td style="padding:6px; text-align:right; font-weight:600; color:#1e40af;">\u20B9${item.netAmount.toFixed(2)}</td>
        <td style="padding:6px; text-align:center;">
          <button type="button" class="btn btn-danger btn-icon btn-remove-grid-row" data-index="${idx}" style="padding: 2px 6px;"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-remove-grid-row").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        gridItems.splice(idx, 1);
        renderGridAndRecalc();
      });
    });

    // Totals calculations
    let subtotal = 0;
    let totalGst = 0;
    gridItems.forEach(item => {
      subtotal += item.amount;
      totalGst += item.gstAmount;
    });

    const isKerala = document.getElementById("ret-state").value === "KERALA";
    let cgst = 0, sgst = 0, igst = 0;
    if (isKerala) {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    } else {
      igst = totalGst;
    }

    const cess = 0;
    const roundOff = parseFloat(document.getElementById("ret-roundoff").value) || 0;
    let adjTotal = 0;
    adjustmentsList.forEach(a => {
      const amt = parseFloat(a.amount) || 0;
      if (a.type === "Add") {
        adjTotal += amt;
      } else {
        adjTotal -= amt;
      }
    });
    const netTotal = subtotal + totalGst + cess + roundOff + adjTotal;

    document.getElementById("ret-tax-cgst").value = cgst.toFixed(2);
    document.getElementById("ret-tax-sgst").value = sgst.toFixed(2);
    document.getElementById("ret-tax-igst").value = igst.toFixed(2);
    document.getElementById("ret-tax-cess").value = cess.toFixed(2);
    document.getElementById("ret-adjustments").value = adjTotal.toFixed(2);
    document.getElementById("lbl-ret-nettotal").value = netTotal.toFixed(2);
  }

  document.getElementById("ret-state").addEventListener("change", renderGridAndRecalc);
  document.getElementById("ret-roundoff").addEventListener("input", renderGridAndRecalc);

  // Add item from ribbon
  addRowBtn.addEventListener("click", () => {
    const pName = productSelect.value;
    const pCode = codeSelect.value;
    const qty = parseFloat(qtyInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const mrp = parseFloat(mrpInput.value) || 0;
    const unit = unitSelect.value;
    const selectedBatchNo = ribbonRetBatchSelect.value;

    if (!pName || !pCode || qty <= 0 || rate <= 0) {
      alert("Please choose product name, code/model, and enter valid Qty/Rate.");
      return;
    }

    if (!selectedBatchNo) {
      alert("Please choose a batch first.");
      return;
    }

    const mat = materials.find(m => m.name === pName && m.code === pCode);
    if (!mat) return;

    const amount = qty * rate;
    const gstPercent = (mat.igst !== undefined && mat.igst !== null && mat.igst !== "") ? parseFloat(mat.igst) : 18;
    const gstAmount = amount * (gstPercent / 100);
    const netAmount = amount + gstAmount;

    gridItems.push({
      materialId: mat.id,
      name: mat.name,
      code: mat.code,
      batchNo: selectedBatchNo,
      quantity: qty,
      unit: unit,
      price: rate,
      mrp: mrp,
      amount: amount,
      gstPercent: gstPercent,
      gstAmount: gstAmount,
      netAmount: netAmount
    });

    // Reset ribbon fields
    productSelect.value = "";
    codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
    codeSelect.disabled = true;
    ribbonRetBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
    ribbonRetBatchSelect.disabled = true;
    qtyInput.value = "";
    rateInput.value = "";
    mrpInput.value = "";
    availStockSpan.innerText = "0.00";

    renderGridAndRecalc();
  });



  // Submit Sales Return
  document.getElementById("create-sales-return-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (gridItems.length === 0) {
      alert("Please add at least one product to the return grid.");
      return;
    }

    const items = gridItems.map(item => ({
      materialId: item.materialId,
      batchNo: item.batchNo,
      quantity: item.quantity,
      price: item.price,
      gstPercent: item.gstPercent  // required for correct CGST/SGST/IGST ledger posting
    }));

    if (editReturn) {
      const pass = prompt("Enter Admin Password to update this Sales Return:");
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password!");
        return;
      }
      state.deleteSalesReturn(editReturn.id);
    }

    const success = state.createSalesReturn({
      id: editReturn ? editReturn.id : undefined,
      contactId: customerSelect.value,
      billNo: billnoSelect.value,
      date: document.getElementById("ret-inv-date").value,
      state: document.getElementById("ret-state").value,
      taxRate: 18,
      siteName: siteSelect.value,
      items: items,
      adjustmentsList: adjustmentsList,
      roundOff: parseFloat(document.getElementById("ret-roundoff").value) || 0
    });

    if (success) {
      alert("Sales Return successfully saved");
      close();
      if (onSuccess) onSuccess();
      if (!editReturn) {
        showSalesReturnModal(container, null, onSuccess);
      } else {
        const tc = document.getElementById("transactions-content");
        if (tc) {
          renderSalesReturnSubTab(tc);
        } else {
          renderSalesReturnSubTab(container);
        }
      }
    } else {
      alert("Failed to save Sales Return. Please try again.");
    }
  });

  document.getElementById("create-sales-return-form").addEventListener("keydown", (e) => {
    if (e.key === "Insert") {
      e.preventDefault();
      let subtotal = 0;
      let totalGst = 0;
      gridItems.forEach(item => {
        subtotal += item.amount;
        totalGst += item.gstAmount;
      });
      const cess = 0;
      const roundOff = parseFloat(document.getElementById("ret-roundoff").value) || 0;
      const initialBillAmount = subtotal + totalGst + cess + roundOff;

      showAdjustmentsModal("sales", initialBillAmount, adjustmentsList, (savedList) => {
        adjustmentsList = savedList;
        renderGridAndRecalc();
      });
    }
  });

  renderGridAndRecalc();
}

// Supplier Purchase Bill Modal (Incoming Batch-Wise Costing - ERP Style)
export function showRecordPurchaseModal(container, editPurchase = null, onSuccess = null, selectedSeries = null) {
  const root = document.getElementById("modal-container-root");
  const suppliers = state.getContacts().filter(c => c.type === "supplier" || c.listInVendorList === true);
  const materials = state.getMaterials();
  const options = state.getOptions();

  let defaultPurRefNo = 'PUR-' + String((state.getPurchases() ? state.getPurchases().length + 1 : 1)).padStart(4, '0');
  let activeSeries = selectedSeries;
  if (editPurchase && editPurchase.seriesId) {
    activeSeries = state.getSeriesMaster().find(s => s.id === editPurchase.seriesId);
  }
  if (!activeSeries && !editPurchase) {
    activeSeries = state.getSeriesMaster().find(s => s.txType === "Purchase" && s.seriesType === "LOCAL");
  }
  if (activeSeries) {
    const live = state.getSeriesMaster().find(s => s.id === activeSeries.id);
    if (live) activeSeries = live;
  }
  if (activeSeries) {
    const num = (activeSeries.currentNumber || activeSeries.startingNumber || 1);
    const digits = parseInt(activeSeries.digits) || 4;
    defaultPurRefNo = (activeSeries.prefix || '') + String(num).padStart(digits, '0');
  }

  const activeCompanyId = state.getActiveCompanyId();
  const activeCompany = state.getRegisteredCompanies().find(c => c.id === activeCompanyId);
  const companyState = activeCompany ? (activeCompany.state || "KERALA").toUpperCase() : "KERALA";
  const isLocalSeries = activeSeries && activeSeries.seriesType === "LOCAL";
  const isIgstSeries = activeSeries && (activeSeries.seriesType === "INTERSTATE" || activeSeries.seriesType === "IGST" || activeSeries.seriesType === "OUTSTATE");
  
  const allStates = ["KERALA", "TAMIL NADU", "KARNATAKA", "MAHARASHTRA", "DELHI", "ANDHRA PRADESH", "OUTSTATE"];
  let stateOptionsHtml = "";
  if (isLocalSeries) {
    stateOptionsHtml = `<option value="${companyState}" selected>${companyState}</option>`;
  } else if (isIgstSeries) {
    stateOptionsHtml = allStates.filter(s => s !== companyState).map(s => `<option value="${s}">${s}</option>`).join("");
  } else {
    stateOptionsHtml = allStates.map(s => `<option value="${s}" ${s === companyState ? 'selected' : ''}>${s}</option>`).join("");
  }

  document.querySelectorAll("#select-series-modal").forEach(el => {
    let p = el.parentElement;
    if (p && p.id !== "modal-container-root" && p !== document.body) p.remove();
    else el.remove();
  });

  // Create UI overlay replicating the screenshot theme
  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-tx" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="position: relative; max-width:1600px; width: 98vw; background-color:#cbd5e1; color:#0f172a; padding:15px; font-family: var(--font-body); border: 2px solid #5a7b9c; border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); font-size:0.85rem;">
        ${editPurchase && editPurchase.isCancelled ? `
          <div class="cancelled-watermark" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 8rem; font-weight: 900; color: rgba(220, 38, 38, 0.15); pointer-events: none; white-space: nowrap; z-index: 1000; text-transform: uppercase; letter-spacing: 10px; font-family: sans-serif; border: 15px solid rgba(220, 38, 38, 0.15); padding: 10px 30px; border-radius: 20px;">CANCELLED</div>
        ` : ''}
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 4px 4px 0 0; border-bottom: 1px solid #1d4ed8;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div style="font-size:1.15rem; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${activeCompany ? activeCompany.name : 'ERP SYSTEM'}</div>
            <div style="font-size:0.7rem; color:#e0f2fe; font-weight:500; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-cart-shopping"></i> PURCHASE ENTRY [Bill Series: &lt;${activeSeries ? activeSeries.name : 'DEFAULT'}&gt;]</div>
          </div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.3rem; cursor:pointer;" id="pm-close-btn-header">&times;</button>
        </div>

        <form id="purchase-bill-form" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          <!-- Top Row metadata inputs -->
          <div style="background-color:#f1f5f9; padding:10px; border:1px solid #94a3b8; border-radius:4px; display:grid; grid-template-columns: 1fr 1fr 1fr 1.5fr 1fr 1fr 0.8fr; gap:10px; align-items:center;">
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div style="background:linear-gradient(180deg, #1e4a8c, #3a6dba); color:white; font-weight:bold; font-size:12px; width:100%; text-align:center; padding:2px 0; border-radius:3px 3px 0 0; border:1px solid #1e4a8c;">
                P. No.
              </div>
              <input type="text" id="pur-refno" class="form-control" style="background-color:#f1f5f9; color:#1e4a8c; font-weight:bold; text-align:center; padding:3px; font-size:0.9rem; width:100%; border:1px solid #94a3b8; border-top:none; border-radius:0 0 3px 3px;" value="${editPurchase ? (editPurchase.voucherNo || editPurchase.id) : defaultPurRefNo}" readonly tabindex="-1">
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Invoice No *</label>
              <input type="text" id="pur-invoiceno" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;" placeholder="Invoice No" required value="${editPurchase ? editPurchase.invoiceNo || '' : ''}">
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Invoice Date *</label>
              <input type="date" id="pur-date" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;" value="${editPurchase ? editPurchase.date : state.getLoginDate()}" required>
            </div>
            <div>
              <div style="display:flex; align-items:flex-end; gap:4px;">
                <button type="button" id="btn-add-vendor-purchase" title="Add New Vendor" style="background:#10b981; border:none; color:white; font-weight:700; font-size:1rem; height:28px; width:28px; border-radius:4px; cursor:pointer; flex-shrink:0;">+</button>
                <div style="flex:1; position:relative;" id="pur-supplier-combobox-wrapper">
                  <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Vendor Name * (Type to Search)</label>
                  <div style="display:flex; align-items:center; position:relative;">
                    <input type="text" id="pur-supplier-search" class="form-control" autocomplete="off" spellcheck="false" placeholder="-- Type to Search Vendor --" style="background-color:white; color:black; padding:3px 22px 3px 6px; font-size:0.8rem; width:100%; font-weight:700; border:1px solid #7a96b2; border-radius:3px;" required>
                    <span id="btn-pur-supplier-dropdown-toggle" style="position:absolute; right:6px; cursor:pointer; color:#64748b; font-size:0.75rem; user-select:none;" title="Click to view all vendors">▼</span>
                  </div>
                  <select id="pur-supplier" class="form-control" style="display:none;" required>
                    <option value="">-- Choose Supplier --</option>
                    ${suppliers.map(s => `<option value="${s.id}" data-branchtype="${s.siteType || 'single'}" data-branches="${(s.sites || []).join(',')}">${s.name}</option>`).join("")}
                  </select>
                  <div id="pur-supplier-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; min-width:340px; max-width:480px; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:99999; border-radius:0 0 5px 5px; overflow:hidden;">
                    <div id="pur-supplier-list" style="max-height:220px; overflow-y:auto; background:white;"></div>
                    <div style="background:linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%); border-top:1px solid #93c5fd; padding:3px 8px; display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; font-weight:700; color:#1e3b8b; user-select:none;">
                      <span>↑↓ to navigate, Enter to select</span>
                      <span>Search by Name, Phone, GSTIN</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="pur-branch-container" style="display: none;">
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Branch Name *</label>
              <select id="pur-branch" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;">
                <option value="">-- Select Branch --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">State</label>
              <select id="pur-state" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem;">
                ${stateOptionsHtml}
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:block; margin-bottom:2px; font-size:0.75rem;">Currency</label>
              <select id="pur-currency" class="form-control" style="background-color:#e2e8f0; color:black; padding:2px 6px; font-size:0.8rem;" disabled>
                <option value="INR" selected>INR (Rs.)</option>
              </select>
            </div>
          </div>

          <!-- Product Ribbon bar -->
          <div style="background-color:#94a3b8; padding:8px; border:1px solid #475569; border-radius:var(--border-radius-sm); display:grid; grid-template-columns: 1.8fr 1.2fr 1fr 0.6fr 0.6fr 0.8fr 0.8fr 0.6fr 0.6fr 80px; gap:4px; align-items:end;">
            <div style="position: relative;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <label style="font-weight:700; font-size:0.75rem; color:black;">Product Name (F10)</label>
                <a href="#" id="ribbon-new-product" style="font-size:0.7rem; font-weight:700; color:#1e3b8b; text-decoration:underline;">New Product [F9]</a>
              </div>
              <input type="text" id="ribbon-product" class="form-control" autocomplete="off" placeholder="-- Choose/Type Product --" style="background-color:white; color:black; padding:2px 5px; font-size:0.75rem; width:100%; border:1px solid #64748b; border-radius:2px;">
              <div id="ribbon-product-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; min-width:280px; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:9999; border-radius:0 0 6px 6px; overflow:hidden;">
                <div id="ribbon-product-list" style="max-height:180px; overflow-y:auto; background:white;"></div>
                <div style="background:linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%); border-top:1px solid #93c5fd; padding:3px 6px; text-align:center; font-size:0.72rem; font-weight:700; color:#1e3b8b; user-select:none; border-radius:0 0 5px 5px;">
                  Double click or Press Enter to select
                </div>
              </div>
            </div>
            <div style="position:relative;">
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Code/Barcode</label>
              <input type="text" id="ribbon-code-search" class="form-control" autocomplete="off" spellcheck="false" placeholder="-- Code/Model --" style="background-color:white; color:black; padding:2px 5px; font-size:0.75rem; width:100%; border:1px solid #64748b; border-radius:2px;" disabled>
              <select id="ribbon-code" class="form-control" style="display:none;" disabled>
                <option value="">-- Code/Model --</option>
              </select>
              <div id="ribbon-code-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; min-width:200px; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:9999; border-radius:0 0 6px 6px; overflow:hidden;">
                <div id="ribbon-code-list" style="max-height:160px; overflow-y:auto; background:white;"></div>
                <div style="background:linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%); border-top:1px solid #93c5fd; padding:3px 6px; text-align:center; font-size:0.72rem; font-weight:700; color:#1e3b8b; user-select:none; border-radius:0 0 5px 5px;">
                  Double click or Press Enter to select
                </div>
              </div>
            </div>
            <div style="position:relative;">
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Batch</label>
              <div style="display:flex; gap:2px; position:relative;">
                <input type="text" id="ribbon-batch-search" class="form-control" autocomplete="off" spellcheck="false" placeholder="-- Batch --" style="background-color:white; color:black; padding:2px 5px; font-size:0.75rem; width:100%; border:1px solid #64748b; border-radius:2px;" disabled>
                <select id="ribbon-batch" class="form-control" style="display:none;" disabled>
                  <option value="">-- Batch --</option>
                </select>
                <button type="button" id="btn-ribbon-select-batch" style="padding:2px 6px; font-weight:bold; font-size:0.75rem; background-color:#1e3b8b; border:none; color:white; cursor:pointer; border-radius:2px; flex-shrink:0;" title="Choose/Create Batch" disabled>...</button>
              </div>
              <div id="ribbon-batch-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; min-width:240px; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:9999; border-radius:0 0 6px 6px; overflow:hidden;">
                <div id="ribbon-batch-list" style="max-height:160px; overflow-y:auto; background:white;"></div>
                <div style="background:linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%); border-top:1px solid #93c5fd; padding:3px 6px; text-align:center; font-size:0.72rem; font-weight:700; color:#1e3b8b; user-select:none; border-radius:0 0 5px 5px;">
                  Double click or Press Enter to select
                </div>
              </div>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Qty</label>
              <input type="number" step="0.01" id="ribbon-qty" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Unit</label>
              <select id="ribbon-unit" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;">
                ${getUnitOptionsHTML()}
              </select>
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Rate [Excl]</label>
              <input type="number" step="0.01" id="ribbon-rate" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0.00">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">MRP</label>
              <input type="number" step="0.01" id="ribbon-mrp" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" placeholder="0.00">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Dis%</label>
              <input type="number" step="0.1" id="ribbon-dispercent" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" value="0">
            </div>
            <div>
              <label style="font-weight:700; font-size:0.75rem; color:black; display:block; margin-bottom:2px;">Dis Amt</label>
              <input type="number" step="0.01" id="ribbon-disamt" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem;" value="0.00">
            </div>
            <button type="button" class="btn btn-primary" id="btn-ribbon-add" style="padding:4px; font-size:0.75rem; font-weight:bold; height:28px; width:100%; background-color:#1e3b8b; border:none; color:white;">Add</button>
          </div>

          <!-- Main Grid -->
          <div style="border: 1px solid #94a3b8; background-color: white; min-height:180px; max-height:280px; overflow-y:auto; border-radius: var(--border-radius-sm);">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem; color:black;">
              <thead>
                <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569;">
                  <th style="padding:4px 6px;">Product Name</th>
                  <th style="padding:4px 6px;">Code/Model</th>
                  <th style="padding:4px 6px;">Batch</th>
                  <th style="padding:4px 6px; text-align:right;">Qty</th>
                  <th style="padding:4px 6px; text-align:right;">Rate</th>
                  <th style="padding:4px 6px; text-align:right;">Amount</th>
                  <th style="padding:4px 6px; text-align:right;">Dis Amt</th>
                  <th style="padding:4px 6px; text-align:right;">Net Value</th>
                  <th style="padding:4px 6px; text-align:right;">GST %</th>
                  <th style="padding:4px 6px; text-align:right;">GST AMT</th>
                  <th style="padding:4px 6px; text-align:right; font-weight:600; color:#1e40af;">Net Amount</th>
                  <th style="padding:4px 6px; text-align:center; width:40px;">Remove</th>
                </tr>
              </thead>
              <tbody id="purchase-grid-body">
                <!-- Rows populated dynamically -->
              </tbody>
            </table>
          </div>

          <!-- Bottom panel calculations -->
          <div style="display:grid; grid-template-columns: 1.2fr 1fr 1fr 1.2fr; gap:10px; background-color:#cbd5e1; padding:8px; border:1px solid #94a3b8; border-radius:var(--border-radius-sm);">
            
            <!-- Grid Totals -->
            <div style="font-size:0.75rem; display:flex; flex-direction:column; gap:2px; font-weight:700;">
              <div>Qty Total: <span id="tot-qty" style="color:blue;">0.00</span></div>
              <div>Amt Total: \u20B9<span id="tot-amount">0.00</span></div>
              <div>Disc Total: \u20B9<span id="tot-discount" style="color:red;">0.00</span></div>
              <div>Net Value: \u20B9<span id="tot-netvalue">0.00</span></div>
              <div>GST Total: \u20B9<span id="tot-gst">0.00</span></div>
              <div style="font-size:0.8rem; border-top:1px solid #94a3b8; padding-top:2px;">Grid Total: \u20B9<span id="tot-nettotal" style="color:green;">0.00</span></div>
            </div>

            <!-- Tax splits -->
            <div style="border: 1px solid #94a3b8; background-color:#f1f5f9; padding:6px; border-radius:var(--border-radius-sm); display:flex; flex-direction:column; gap:2px;">
              <div style="background-color:#1e3b8b; color:white; font-size:0.7rem; font-weight:600; padding:1px 6px; text-align:center;">TAX SPLITS</div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                <div>
                  <label style="font-size:0.68rem; font-weight:600;">CGST</label>
                  <input type="text" id="pur-cgst" class="form-control" style="background-color:#e2e8f0; color:black; padding:1px 4px; font-size:0.75rem;" value="0.00" readonly>
                </div>
                <div>
                  <label style="font-size:0.68rem; font-weight:600;">SGST</label>
                  <input type="text" id="pur-sgst" class="form-control" style="background-color:#e2e8f0; color:black; padding:1px 4px; font-size:0.75rem;" value="0.00" readonly>
                </div>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                <div>
                  <label style="font-size:0.68rem; font-weight:600;">IGST</label>
                  <input type="text" id="pur-igst" class="form-control" style="background-color:#e2e8f0; color:black; padding:1px 4px; font-size:0.75rem;" value="0.00" readonly>
                </div>
                <div>
                  <label style="font-size:0.68rem; font-weight:600;">CESS</label>
                  <input type="text" id="pur-cess" class="form-control" style="background-color:#e2e8f0; color:black; padding:1px 4px; font-size:0.75rem;" value="0.00" readonly>
                </div>
              </div>
            </div>

            <!-- Adjustments/Narrations -->
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:grid; grid-template-columns: 110px 1fr auto; gap:4px; align-items:center;">
                <label id="lbl-pur-adjustments" style="font-weight:600; font-size:0.75rem; cursor:pointer;" title="Click or press Insert to configure Adjustments">Adjustments</label>
                <input type="number" step="0.01" id="pur-adjustments" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;" value="0.00" title="Press Insert or double click to configure Adjustments">
                <button type="button" id="btn-clear-purchase-adjustments" title="Clear All Adjustments" style="padding:1px 5px; font-size:0.7rem; background:#ef4444; color:white; border:none; border-radius:3px; cursor:pointer;">Clear</button>
              </div>
              <input type="hidden" id="pur-addlcess" value="0.00">
              <div style="display:grid; grid-template-columns: 110px 1fr; gap:4px; align-items:center;">
                <label style="font-weight:600; font-size:0.75rem;">Round Off</label>
                <input type="number" step="0.01" id="pur-roundoff" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;" value="0.00">
              </div>
            </div>

            <!-- Big Net Amount summary -->
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; background-color:#1e293b; color:#10b981; border-radius:var(--border-radius-sm); padding:6px; border:2px solid #475569;">
              <span style="font-size:0.7rem; font-weight:700; color:#94a3b8; text-transform:uppercase;">Grand Net Total</span>
              <strong id="pur-nettotal-box" style="font-size:1.6rem; font-weight:900;">\u20B90.00</strong>
            </div>

          </div>

          <!-- Vendor Closing Balance Bar (Bottom of Purchase Window) -->
          <div id="pur-vendor-balance-bar" style="background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%); color: white; padding: 6px 14px; border-radius: 4px; border: 1.5px solid #475569; display: ${options.enablePartyClosingBalanceBottom !== false ? 'flex' : 'none'}; justify-content: space-between; align-items: center; font-size: 0.82rem; box-shadow: 0 2px 4px rgba(0,0,0,0.15); margin-top: 2px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #94a3b8; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-scale-balanced" style="color:#38bdf8;"></i> Vendor Closing Balance:</span>
              <span id="pur-vendor-balance-name" style="font-weight: 700; color: #f8fafc;">-- NO VENDOR SELECTED --</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #cbd5e1; font-size: 0.75rem; font-weight: 600;">Closing Balance (Up to Date):</span>
              <span id="pur-vendor-balance-val" style="font-size: 1.05rem; font-weight: 800; color: #fbbf24; background: rgba(0,0,0,0.4); padding: 2px 10px; border-radius: 3px; border: 1px solid #475569;">
                ₹0.00
              </span>
            </div>
          </div>

          <!-- Bottom Action Buttons Ribbon -->
          <div style="display:grid; grid-template-columns: 2.2fr 1fr; gap:10px; align-items:center; margin-top:4px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-weight:700; font-size:0.75rem;">Narration:</label>
              <input type="text" id="pur-narration" class="form-control" style="background-color:white; color:black; padding:4px 8px; font-size:0.8rem; flex-grow:1; max-width:320px;" placeholder="Enter purchase details or remarks..." value="${editPurchase ? editPurchase.narration || '' : ''}">
              <div id="pur-headloader-container" style="display: ${options.enableHeadloader !== false ? 'flex' : 'none'}; align-items: center; gap: 4px;">
                <label style="font-weight:700; font-size:0.75rem; margin-left:6px;" title="Unloading / Vehicle Type">Unload Type:</label>
                <select id="pur-headloader-type" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem; width:150px; height:28px;">
                  <option value="none" ${editPurchase && (editPurchase.headloaderType === 'none' || editPurchase.headloaderType === 'no_charge' || editPurchase.headloaderType === 'No Loading Charge' || editPurchase.headloaderType === 'No Unloading Charge') ? 'selected' : ''}>🚫 No Unloading Charge</option>
                  ${(state.getHeadloaderTypes ? state.getHeadloaderTypes('unloading') : [{id:'std', name:'Standard'}]).map(t => {
                    const selVal = editPurchase ? (editPurchase.headloaderType || editPurchase.handlingType || editPurchase.unloadingType || '') : '';
                    const isSelected = selVal ? (selVal === t.id || selVal === t.name) : t.isDefault;
                    return `<option value="${t.id}" ${isSelected ? 'selected' : ''}>${t.name}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:6px; align-items:center;">
              <div style="display:flex; align-items:center; gap:4px; margin-right:10px;">
                <label style="font-weight:700; font-size:0.75rem;">Pay Mode</label>
                <select id="pur-paymode" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.75rem;">
                  <option value="Credit" selected>Credit</option>
                  <option value="Cash">Cash</option>
                  ${state.getLedgers().filter(l => l.groupName === 'CASH-IN-HAND' || l.groupName === 'BANK ACCOUNTS').filter(l => (l.name || '').toUpperCase() !== 'CASH').map(l => `<option value="${l.name}">${l.name}</option>`).join('')}
                </select>
              </div>
              <div style="display:none; align-items:center; gap:4px; margin-right:10px;" id="pur-crperiod-container">
                <label style="font-weight:700; font-size:0.75rem;">Days</label>
                <input type="number" id="pur-crperiod" class="form-control" style="background-color:white; color:black; padding:2px; font-size:0.75rem; width:50px;" value="0">
              </div>

              <button type="button" id="btn-pur-new" style="height:30px; padding:4px 12px; font-size:0.8rem; font-weight:700; background-color: #0d9488; border: none; color: white; border-radius:4px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" title="New Bill">New</button>
              <button type="submit" id="btn-pur-save" style="height:30px; padding:4px 16px; font-size:0.8rem; font-weight:700; background-color: #2563eb; border: none; color: white; border-radius:4px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" title="Save Bill">Save Bill</button>
              <button type="button" id="btn-pur-print" style="height:30px; padding:4px 12px; font-size:0.8rem; font-weight:700; background-color: #64748b; border: none; color: white; border-radius:4px; display:inline-flex; align-items:center; gap:5px; ${editPurchase ? 'cursor:pointer;' : 'opacity:0.5; cursor:not-allowed;'}" ${editPurchase ? '' : 'disabled'} title="Print Bill"><i class="fa-solid fa-print"></i> Print</button>
              <button type="button" id="btn-pur-void" style="height:30px; padding:4px 12px; font-size:0.8rem; font-weight:700; background-color: #ef4444; border: none; color: white; border-radius:4px; display:inline-flex; align-items:center; gap:5px; ${editPurchase ? 'cursor:pointer;' : 'opacity:0.5; cursor:not-allowed;'}" ${editPurchase ? '' : 'disabled'} title="Cancel Bill"><i class="fa-solid fa-ban"></i> Cancel Bill</button>
              <button type="button" id="btn-pur-search" style="height:30px; padding:4px 12px; font-size:0.8rem; font-weight:700; background-color: #0284c7; border: none; color: white; border-radius:4px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" title="Search Bills"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
              <button type="button" id="btn-pur-prev" style="height:30px; padding:4px 12px; font-size:0.8rem; font-weight:700; background-color: #475569; border: none; color: white; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;" title="Previous Bill">&lt;</button>
              <button type="button" id="btn-pur-next" style="height:30px; padding:4px 12px; font-size:0.8rem; font-weight:700; background-color: #475569; border: none; color: white; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;" title="Next Bill">&gt;</button>
              <button type="button" id="btn-pur-cancel" style="height:30px; padding:4px 12px; font-size:0.8rem; font-weight:700; background-color: #64748b; border: none; color: white; border-radius:4px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" title="Close Modal">Close</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = document.getElementById("modal-overlay-tx");
  const winBox = overlay ? overlay.firstElementChild : null;
  const headerBar = winBox ? winBox.firstElementChild : null;
  if (winBox && headerBar) makeDraggable(winBox, headerBar);

  let onDocClickClosePurProductDropdown = null;
  let onDocClickClosePurSupplierDropdown = null;
  let onDocClickClosePurBatchDropdown = null;
  let onDocClickClosePurCodeDropdown = null;
  const close = () => { 
    if (onDocClickClosePurProductDropdown) {
      document.removeEventListener("click", onDocClickClosePurProductDropdown);
    }
    if (onDocClickClosePurSupplierDropdown) {
      document.removeEventListener("click", onDocClickClosePurSupplierDropdown);
    }
    if (onDocClickClosePurBatchDropdown) {
      document.removeEventListener("click", onDocClickClosePurBatchDropdown);
    }
    if (onDocClickClosePurCodeDropdown) {
      document.removeEventListener("click", onDocClickClosePurCodeDropdown);
    }
    overlay.classList.remove("active"); 
    root.innerHTML = ""; 
  };

  document.getElementById("pm-close-btn-header").addEventListener("click", close);
  document.getElementById("btn-pur-cancel").addEventListener("click", close);
  document.getElementById("btn-pur-new").addEventListener("click", () => {
    close();
    showRecordPurchaseModal(container, null, onSuccess, activeSeries);
  });

  // Bind Previous and Next buttons
  const allPurchases = (state.getPurchases() || []).filter(p => p && !p.isCancelled);
  let seriesPurchases = allPurchases.filter(pur => {
    if (!activeSeries) return true;
    if (pur.seriesId && pur.seriesId === activeSeries.id) return true;
    if (activeSeries.prefix) {
      if (pur.voucherNo && String(pur.voucherNo).startsWith(activeSeries.prefix)) return true;
      if (pur.refNo && String(pur.refNo).startsWith(activeSeries.prefix)) return true;
      if (pur.id && String(pur.id).startsWith(activeSeries.prefix)) return true;
    }
    return false;
  });
  if (seriesPurchases.length === 0) {
    seriesPurchases = allPurchases;
  }
  seriesPurchases.sort((a, b) => {
    const aNum = String(a.voucherNo || a.id || a.refNo || '');
    const bNum = String(b.voucherNo || b.id || b.refNo || '');
    const cmp = aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return (a.date || '').localeCompare(b.date || '');
  });

  let curIdx = editPurchase ? seriesPurchases.findIndex(p => String(p.id) === String(editPurchase.id) || (p.refNo && p.refNo === editPurchase.refNo) || (p.voucherNo && p.voucherNo === editPurchase.voucherNo)) : -1;
  if (curIdx === -1 && editPurchase) {
    curIdx = allPurchases.findIndex(p => String(p.id) === String(editPurchase.id) || (p.refNo && p.refNo === editPurchase.refNo) || (p.voucherNo && p.voucherNo === editPurchase.voucherNo));
    if (curIdx !== -1) {
      seriesPurchases = allPurchases;
    }
  }

  document.getElementById("btn-pur-prev")?.addEventListener("click", () => {
    if (curIdx > 0) {
      close();
      showRecordPurchaseModal(container, seriesPurchases[curIdx - 1], onSuccess, activeSeries);
    } else if (curIdx === -1 && seriesPurchases.length > 0) {
      close();
      showRecordPurchaseModal(container, seriesPurchases[seriesPurchases.length - 1], onSuccess, activeSeries);
    }
  });

  document.getElementById("btn-pur-next")?.addEventListener("click", () => {
    if (curIdx >= 0 && curIdx < seriesPurchases.length - 1) {
      close();
      showRecordPurchaseModal(container, seriesPurchases[curIdx + 1], onSuccess, activeSeries);
    } else if (curIdx === seriesPurchases.length - 1) {
      close();
      showRecordPurchaseModal(container, null, onSuccess, activeSeries);
    }
  });

  // Bind Search Button to Open Custom Styled Search Window
  document.getElementById("btn-pur-search").addEventListener("click", () => {
    const searchOverlay = document.createElement("div");
    searchOverlay.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100000;";
    
    // Default from and to date is current system date
    const systemDate = new Date().toISOString().split("T")[0];
    
    searchOverlay.innerHTML = `
      <div style="background: #cbd5e1; border: 2px solid #1e3b8b; border-radius: 4px; width: 900px; padding: 8px; font-family: sans-serif; font-size: 0.8rem; color: black; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        <!-- Title bar -->
        <div style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: white; padding: 4px 8px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border-radius: 2px;">
          <span>Search</span>
          <button type="button" id="btn-close-search-popup" style="background: none; border: none; color: white; font-weight: bold; cursor: pointer; font-size: 1.2rem;">&times;</button>
        </div>
        
        <!-- Dates row -->
        <div style="display: flex; gap: 15px; align-items: center; background: #e2e8f0; padding: 6px; border: 1px solid #94a3b8; border-radius: 2px;">
          <div>
            <label style="font-weight: bold;">From </label>
            <input type="date" id="search-log-from" class="form-control" style="width: 130px; display: inline-block; padding: 2px; font-size: 0.8rem;" value="${systemDate}">
          </div>
          <div>
            <label style="font-weight: bold;">To </label>
            <input type="date" id="search-log-to" class="form-control" style="width: 130px; display: inline-block; padding: 2px; font-size: 0.8rem;" value="${systemDate}">
          </div>
          <div style="margin-left: auto; display: flex; gap: 6px;">
            <button type="button" id="btn-search-display" style="background: #cbd5e1; border: 1px solid #475569; padding: 2px 12px; font-weight: bold; cursor: pointer; box-shadow: 1px 1px 2px white inset;">Display</button>
            <button type="button" id="btn-search-close" style="background: #cbd5e1; border: 1px solid #475569; padding: 2px 12px; font-weight: bold; cursor: pointer; box-shadow: 1px 1px 2px white inset;">Close</button>
          </div>
        </div>
        
        <!-- Search textboxes grid -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; background: #e2e8f0; padding: 6px; border: 1px solid #94a3b8; border-radius: 2px;">
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Bill No</label>
            <input type="text" id="filter-billno" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Supplier</label>
            <input type="text" id="filter-customer" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Employee</label>
            <input type="text" id="filter-employee" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;" placeholder="All Employees">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Pay Mode</label>
            <input type="text" id="filter-paymode" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 2px;">Net Amount</label>
            <input type="text" id="filter-netamt" class="form-control" style="padding: 2px; font-size: 0.8rem; width: 100%;">
          </div>
        </div>
        
        <!-- Checkboxes row -->
        <div style="display: flex; gap: 20px; align-items: center; padding-left: 4px;">
          <label style="font-weight: bold; font-size: 0.75rem;"><input type="checkbox" id="chk-extended-search"> Extended Search <span style="color: #991b1b; font-weight: normal; font-size: 0.7rem;">(Will display all details containing the search text in any part of the field)</span></label>
          <label style="font-weight: bold; font-size: 0.75rem;"><input type="checkbox" id="chk-auto-search" checked> Auto Search while typing in text box</label>
        </div>
        
        <!-- Grid container -->
        <div style="background: white; border: 1px solid #94a3b8; height: 300px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.75rem; color: black;">
            <thead>
              <tr style="background: #1e3b8b; color: white; font-weight: bold; position: sticky; top: 0; z-index: 10;">
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Bill No</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Bill Date</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Supplier</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Employee</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Paymode</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: right;">Net Amount</th>
              </tr>
            </thead>
            <tbody id="search-log-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    document.body.appendChild(searchOverlay);
    
    const closeSearch = () => {
      window.removeEventListener("keydown", handleSearchKeydown, true);
      searchOverlay.remove();
    };

    const handleSearchKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeSearch();
      }
    };
    window.addEventListener("keydown", handleSearchKeydown, true);
    
    searchOverlay.querySelector("#btn-close-search-popup").addEventListener("click", closeSearch);
    searchOverlay.querySelector("#btn-search-close").addEventListener("click", closeSearch);
    
    const runSearch = () => {
      const fromDate = searchOverlay.querySelector("#search-log-from").value;
      const toDate = searchOverlay.querySelector("#search-log-to").value;
      
      const billNoFilter = searchOverlay.querySelector("#filter-billno").value.toLowerCase();
      const customerFilter = searchOverlay.querySelector("#filter-customer").value.toLowerCase();
      const paymodeFilter = searchOverlay.querySelector("#filter-paymode").value.toLowerCase();
      const netamtFilter = searchOverlay.querySelector("#filter-netamt").value;
      
      const extended = searchOverlay.querySelector("#chk-extended-search").checked;
      
      const currentPurchases = state.getPurchases() || [];
      let filtered = currentPurchases;
      
      // Filter by Date Range
      if (fromDate) {
        filtered = filtered.filter(x => x.date >= fromDate);
      }
      if (toDate) {
        filtered = filtered.filter(x => x.date <= toDate);
      }
      
      // Filter by input boxes
      filtered = filtered.filter(x => {
        const matchesBillNo = extended ? (x.voucherNo || x.id || '').toLowerCase().includes(billNoFilter) : (x.voucherNo || x.id || '').toLowerCase().startsWith(billNoFilter);
        const matchesCustomer = extended ? (x.contactName || '').toLowerCase().includes(customerFilter) : (x.contactName || '').toLowerCase().startsWith(customerFilter);
        const matchesPaymode = extended ? (x.payMode || '').toLowerCase().includes(paymodeFilter) : (x.payMode || '').toLowerCase().startsWith(paymodeFilter);
        
        let matchesNetAmt = true;
        if (netamtFilter) {
          matchesNetAmt = String(x.total).includes(netamtFilter);
        }
        
        return matchesBillNo && matchesCustomer && matchesPaymode && matchesNetAmt;
      });
      
      const tbody = searchOverlay.querySelector("#search-log-tbody");
      tbody.innerHTML = filtered.length === 0 ? `
        <tr><td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">No matching transactions found.</td></tr>
      ` : filtered.map(item => `
        <tr class="log-row-item" data-id="${item.id}" style="border-bottom: 1px solid #e2e8f0; cursor: pointer; user-select: none;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
          <td style="padding: 6px; font-weight: bold; color: #1e3b8b;">${item.voucherNo || item.id}</td>
          <td style="padding: 6px;">${formatDate(item.date)}</td>
          <td style="padding: 6px;"><strong>${item.contactName || ''}</strong></td>
          <td style="padding: 6px; color: #64748b;">Admin</td>
          <td style="padding: 6px;">${item.payMode || ''}</td>
          <td style="padding: 6px; text-align: right; font-weight: bold; color: #1e40af;">\u20B9${Number(item.total || 0).toFixed(2)}</td>
        </tr>
      `).join("");
      
      tbody.querySelectorAll(".log-row-item").forEach(row => {
        row.addEventListener("dblclick", () => {
          const id = row.getAttribute("data-id");
          const found = (state.getPurchases() || []).find(x => x.id === id);
          if (found) {
            closeSearch();
            close(); // Close builder modal
            showRecordPurchaseModal(container, found, onSuccess);
          }
        });
      });
    };
    
    // Bind Display button
    searchOverlay.querySelector("#btn-search-display").addEventListener("click", runSearch);
    
    // Typing listener for auto search
    const textInputs = ["#filter-billno", "#filter-customer", "#filter-paymode", "#filter-netamt"];
    textInputs.forEach(selector => {
      searchOverlay.querySelector(selector).addEventListener("input", () => {
        if (searchOverlay.querySelector("#chk-auto-search").checked) {
          runSearch();
        }
      });
    });
    
    // Initial search execution
    runSearch();
  });

  // Bind Print Button
  if (editPurchase) {
    document.getElementById("btn-pur-print").addEventListener("click", () => {
      window.print();
    });
  }

  if (editPurchase && document.getElementById("btn-pur-void")) {
    document.getElementById("btn-pur-void").addEventListener("click", () => {
      const validateAdminPassword = () => {
        const pass = prompt("Enter Admin Password:");
        if (pass === null) return false;
        if (pass !== state.getAdminPassword()) {
          alert("Incorrect password!");
          return false;
        }
        return true;
      };
      if (confirm(`Are you sure you want to cancel Purchase Bill ${editPurchase.id}?`) && validateAdminPassword()) {
        state.cancelPurchase(editPurchase.id);
        close();
        if (onSuccess) onSuccess();
      }
    });
  }

  // Handle Paymode change
  const paymodeSelect = document.getElementById("pur-paymode");
  const crperiodContainer = document.getElementById("pur-crperiod-container");
  paymodeSelect.addEventListener("change", () => {
    crperiodContainer.style.display = paymodeSelect.value === "Credit" ? "flex" : "none";
  });

  // Bind Supplier search combobox & closing balance
  const supplierSelect = document.getElementById("pur-supplier");
  const supplierSearch = document.getElementById("pur-supplier-search");
  const supplierDropdown = document.getElementById("pur-supplier-dropdown");
  const supplierListEl = document.getElementById("pur-supplier-list");
  const supplierToggle = document.getElementById("btn-pur-supplier-dropdown-toggle");
  const branchContainer = document.getElementById("pur-branch-container");
  const branchSelect = document.getElementById("pur-branch");
  const purDateInput = document.getElementById("pur-date");

  let activeSupplierIndex = 0;
  let currentFilteredSuppliers = [];
  let cachedSuppliersList = null;
  let cachedBalancesMap = new Map();
  let cachedDate = null;

  const getSupplierSearchList = (forceRefresh = false) => {
    if (!cachedSuppliersList || forceRefresh) {
      cachedSuppliersList = state.getContacts()
        .filter(c => c.type === "supplier" || c.listInVendorList === true)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    }
    return cachedSuppliersList;
  };

  const refreshSupplierBalancesCache = () => {
    const list = getSupplierSearchList(true);
    const curDate = purDateInput ? purDateInput.value : "";
    cachedDate = curDate;
    let acctBalances = {};
    try {
      acctBalances = state.getAccountBalances(curDate) || {};
    } catch (e) {
      acctBalances = {};
    }

    cachedBalancesMap.clear();
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      let rawBal = 0;
      if (s.siteType === "multiple" && Array.isArray(s.sites) && s.sites.length > 0) {
        rawBal = s.sites.reduce((sum, site) => {
          const key = `${s.id}::${site}`;
          return sum + (acctBalances[key] ? acctBalances[key].balance : 0);
        }, 0);
      } else if (acctBalances[s.id] !== undefined) {
        rawBal = acctBalances[s.id].balance;
      } else {
        rawBal = s.balance || 0;
      }
      const absVal = Math.abs(rawBal);
      const suffix = rawBal <= 0 ? "Cr" : "Dr";
      const balStr = absVal < 0.005 ? "₹0.00" : `₹${absVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}`;
      const balColor = absVal < 0.005 ? "#64748b" : (rawBal <= 0 ? "#b45309" : "#15803d");
      cachedBalancesMap.set(s.id, { balStr, balColor });
    }
  };

  const renderSupplierDropdownList = (filterText = "") => {
    if (!supplierListEl) return;
    const curDate = purDateInput ? purDateInput.value : "";
    if (cachedDate !== curDate || cachedBalancesMap.size === 0) {
      refreshSupplierBalancesCache();
    }
    const allList = getSupplierSearchList();
    const query = (filterText || "").trim().toLowerCase();

    if (!query) {
      currentFilteredSuppliers = allList;
    } else {
      currentFilteredSuppliers = allList.filter(s => {
        const nameMatch = (s.name || "").toLowerCase().includes(query);
        const personMatch = (s.contactPerson || "").toLowerCase().includes(query);
        const phoneMatch = (s.mobile || s.phone || "").toLowerCase().includes(query);
        const gstinMatch = (s.gstin || "").toLowerCase().includes(query);
        const areaMatch = (s.area || s.billingAddress || "").toLowerCase().includes(query);
        return nameMatch || personMatch || phoneMatch || gstinMatch || areaMatch;
      });
    }

    if (currentFilteredSuppliers.length === 0) {
      supplierListEl.innerHTML = `<div style="padding:8px 10px; font-size:0.75rem; color:#64748b; font-style:italic; user-select:none;">No matching vendors found</div>`;
      activeSupplierIndex = -1;
      return;
    }

    if (activeSupplierIndex < 0 || activeSupplierIndex >= currentFilteredSuppliers.length) {
      activeSupplierIndex = 0;
    }

    const displayList = currentFilteredSuppliers.slice(0, 80);

    supplierListEl.innerHTML = displayList.map((s, idx) => {
      const isSelected = idx === activeSupplierIndex;
      const displayName = s.name || "Vendor";
      const personStr = s.contactPerson ? ` • ${s.contactPerson}` : "";
      const phoneStr = s.mobile || s.phone ? ` • 📞 ${s.mobile || s.phone}` : "";
      const gstinStr = s.gstin ? ` • GSTIN: ${s.gstin}` : "";
      const subInfo = `${s.id}${personStr}${phoneStr}${gstinStr}`;

      const balInfo = cachedBalancesMap.get(s.id) || { balStr: "₹0.00", balColor: "#64748b" };

      return `
        <div class="pur-sup-item" data-index="${idx}" data-id="${s.id}" data-name="${displayName.replace(/"/g, '&quot;')}" style="padding:6px 10px; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background-color:${isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')}; color:${isSelected ? '#ffffff' : '#0f172a'};">
          <div style="display:flex; flex-direction:column; gap:1px; flex:1; min-width:0;">
            <strong style="font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${displayName}</strong>
            <span style="font-size:0.68rem; color:${isSelected ? '#e0f2fe' : '#64748b'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${subInfo}</span>
          </div>
          <span style="font-size:0.72rem; font-weight:bold; color:${isSelected ? '#ffffff' : balInfo.balColor}; margin-left:8px; white-space:nowrap; background:${isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9'}; padding:2px 6px; border-radius:3px;">Bal: ${balInfo.balStr}</span>
        </div>
      `;
    }).join("") + (currentFilteredSuppliers.length > 80 ? `<div style="padding:4px 8px; font-size:0.7rem; color:#64748b; background:#f8fafc; text-align:center; border-top:1px solid #e2e8f0;">Showing 80 of ${currentFilteredSuppliers.length} vendors. Type to filter...</div>` : "");

    supplierListEl.querySelectorAll(".pur-sup-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-index"));
        if (activeSupplierIndex !== idx) {
          activeSupplierIndex = idx;
          updateSupplierListHighlight();
        }
      });

      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selId = item.getAttribute("data-id");
        selectSupplierAndAdvance(selId);
      };

      item.addEventListener("click", handleSelect);
      item.addEventListener("dblclick", handleSelect);
    });

    scrollActiveSupplierIntoView();
  };

  const updateSupplierListHighlight = () => {
    if (!supplierListEl) return;
    const items = supplierListEl.querySelectorAll(".pur-sup-item");
    items.forEach((item, idx) => {
      const isSelected = idx === activeSupplierIndex;
      item.style.backgroundColor = isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');
      item.style.color = isSelected ? '#ffffff' : '#0f172a';
      const subSpan = item.querySelector("span");
      if (subSpan) subSpan.style.color = isSelected ? '#e0f2fe' : '#64748b';
    });
    scrollActiveSupplierIntoView();
  };

  const scrollActiveSupplierIntoView = () => {
    if (!supplierListEl) return;
    const activeItem = supplierListEl.querySelector(`.pur-sup-item[data-index="${activeSupplierIndex}"]`);
    if (activeItem) {
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = supplierListEl.scrollTop;
      const containerBottom = containerTop + supplierListEl.clientHeight;
      if (itemTop < containerTop) {
        supplierListEl.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        supplierListEl.scrollTop = itemBottom - supplierListEl.clientHeight;
      }
    }
  };

  const openSupplierDropdown = () => {
    if (!supplierDropdown) return;
    supplierDropdown.style.display = "block";
    renderSupplierDropdownList(supplierSearch ? supplierSearch.value : "");
  };

  const closeSupplierDropdown = () => {
    if (!supplierDropdown) return;
    supplierDropdown.style.display = "none";
  };

  const selectSupplierAndAdvance = (supplierId) => {
    if (!supplierSelect || !supplierSearch) return;
    supplierSelect.value = supplierId;
    const matched = getSupplierSearchList().find(s => s.id === supplierId);
    if (matched) {
      supplierSearch.value = matched.name;
    } else {
      supplierSearch.value = "";
    }
    closeSupplierDropdown();
    supplierSelect.dispatchEvent(new Event("change"));

    setTimeout(() => {
      if (branchContainer && branchContainer.style.display !== "none" && branchSelect) {
        branchSelect.focus();
      } else {
        const pInput = document.getElementById("ribbon-product");
        if (pInput) pInput.focus();
      }
    }, 10);
  };

  if (supplierSearch) {
    supplierSearch.addEventListener("focus", () => {
      openSupplierDropdown();
      supplierSearch.select();
    });

    supplierSearch.addEventListener("click", () => {
      openSupplierDropdown();
    });

    supplierSearch.addEventListener("input", () => {
      activeSupplierIndex = 0;
      openSupplierDropdown();
    });

    supplierSearch.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        if (supplierDropdown && supplierDropdown.style.display === "none") {
          openSupplierDropdown();
        } else if (currentFilteredSuppliers.length > 0) {
          activeSupplierIndex = (activeSupplierIndex + 1) % currentFilteredSuppliers.length;
          updateSupplierListHighlight();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        if (supplierDropdown && supplierDropdown.style.display === "none") {
          openSupplierDropdown();
        } else if (currentFilteredSuppliers.length > 0) {
          activeSupplierIndex = (activeSupplierIndex - 1 + currentFilteredSuppliers.length) % currentFilteredSuppliers.length;
          updateSupplierListHighlight();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (supplierDropdown && supplierDropdown.style.display !== "none" && activeSupplierIndex >= 0 && activeSupplierIndex < currentFilteredSuppliers.length) {
          selectSupplierAndAdvance(currentFilteredSuppliers[activeSupplierIndex].id);
        } else {
          const val = (supplierSearch.value || "").trim().toLowerCase();
          const all = getSupplierSearchList();
          const exact = all.find(s => (s.name || "").toLowerCase() === val);
          const partial = all.find(s => (s.name || "").toLowerCase().startsWith(val)) || all.find(s => (s.name || "").toLowerCase().includes(val));
          const matched = exact || partial;
          if (matched) {
            selectSupplierAndAdvance(matched.id);
          } else {
            closeSupplierDropdown();
            const pInput = document.getElementById("ribbon-product");
            if (pInput) pInput.focus();
          }
        }
      } else if (e.key === "Tab") {
        if (supplierDropdown && supplierDropdown.style.display !== "none" && activeSupplierIndex >= 0 && activeSupplierIndex < currentFilteredSuppliers.length) {
          const matched = currentFilteredSuppliers[activeSupplierIndex];
          supplierSelect.value = matched.id;
          supplierSearch.value = matched.name;
          supplierSelect.dispatchEvent(new Event("change"));
        }
        closeSupplierDropdown();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeSupplierDropdown();
      }
    });
  }

  if (supplierToggle) {
    supplierToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (supplierDropdown && supplierDropdown.style.display === "none") {
        if (supplierSearch) supplierSearch.focus();
        openSupplierDropdown();
      } else {
        closeSupplierDropdown();
      }
    });
  }

  onDocClickClosePurSupplierDropdown = (e) => {
    const wrapper = document.getElementById("pur-supplier-combobox-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      closeSupplierDropdown();
    }
  };
  document.addEventListener("click", onDocClickClosePurSupplierDropdown);

  const updateVendorClosingBalanceDisplay = () => {
    const supSelect = document.getElementById("pur-supplier");
    const branchSel = document.getElementById("pur-branch");
    const branchCont = document.getElementById("pur-branch-container");
    const dateInput = document.getElementById("pur-date");

    const supId = supSelect ? supSelect.value : "";
    const branchVal = branchSel && branchCont && branchCont.style.display !== "none" ? branchSel.value : "";
    const purDateVal = dateInput ? dateInput.value : null;

    const nameEl = document.getElementById("pur-vendor-balance-name");
    const valEl = document.getElementById("pur-vendor-balance-val");
    const barEl = document.getElementById("pur-vendor-balance-bar");

    if (!nameEl || !valEl) return;

    if (!supId) {
      nameEl.innerHTML = `<span style="color:#94a3b8; font-weight:normal;">-- Choose a Vendor to view closing balance --</span>`;
      valEl.innerHTML = `<span style="color:#94a3b8;">\u20B90.00</span>`;
      if (barEl) barEl.style.borderColor = "#475569";
      return;
    }

    const info = state.getContactClosingBalance(supId, branchVal || null, purDateVal);
    const freshSuppliers = getSupplierSearchList();
    const matchedSup = freshSuppliers.find(s => s.id === supId);
    const displayName = (matchedSup ? matchedSup.name : info.name || "Vendor").toUpperCase();
    const branchSuffix = branchVal ? ` <span style="background:#334155; padding:1px 6px; border-radius:3px; font-size:0.75rem; color:#93c5fd; border:1px solid #64748b;">BRANCH: ${branchVal.toUpperCase()}</span>` : "";

    nameEl.innerHTML = `<strong style="color:#ffffff; font-size:0.85rem;">${displayName}</strong>${branchSuffix}`;

    if (info.absBalance < 0.001) {
      valEl.innerHTML = `<span style="color:#94a3b8; font-weight:700;">\u20B90.00 (NIL BALANCE)</span>`;
      if (barEl) barEl.style.borderColor = "#475569";
    } else if (!info.isDebit) {
      valEl.innerHTML = `<span style="color:#fbbf24; font-weight:900;">${info.balanceFormatted}</span> <small style="color:#fde68a; font-size:0.72rem; font-weight:700; margin-left:3px;">(PAYABLE / CR)</small>`;
      if (barEl) barEl.style.borderColor = "#f59e0b";
    } else {
      valEl.innerHTML = `<span style="color:#34d399; font-weight:900;">${info.balanceFormatted}</span> <small style="color:#a7f3d0; font-size:0.72rem; font-weight:700; margin-left:3px;">(ADVANCE / DR)</small>`;
      if (barEl) barEl.style.borderColor = "#10b981";
    }
  };

  supplierSelect.addEventListener("change", () => {
    const currentSupId = supplierSelect.value;
    const currentMatch = getSupplierSearchList().find(s => s.id === currentSupId);
    if (supplierSearch) {
      if (currentMatch) {
        supplierSearch.value = currentMatch.name;
      } else if (!currentSupId) {
        supplierSearch.value = "";
      }
    }

    const getSupplierState = (sup) => {
      if (!sup) return "KERALA";
      let st = (sup.state || "").toUpperCase();
      if (!st && sup.gstin) {
        const code = state.getStateCodeFromNameOrGstin ? state.getStateCodeFromNameOrGstin(sup.gstin) : "";
        if (code && code !== "32") st = "OUTSTATE";
        else if (code === "32") st = "KERALA";
      }
      return st || "KERALA";
    };

    if (isLocalSeries) {
      const selectedSupId = supplierSelect.value;
      if (selectedSupId) {
        const matchedSupplier = getSupplierSearchList().find(s => s.id === selectedSupId);
        if (matchedSupplier) {
          const supState = getSupplierState(matchedSupplier);
          if (supState !== companyState && supState !== "KERALA") {
            alert(`Error: Supplier's registered state (${supState}) does not match the company's state (${companyState}) for local purchase transactions!`);
            supplierSelect.value = "";
            supplierSelect.dispatchEvent(new Event("change"));
            return;
          }
        }
      }
    } else if (isIgstSeries) {
      const selectedSupId = supplierSelect.value;
      if (selectedSupId) {
        const matchedSupplier = getSupplierSearchList().find(s => s.id === selectedSupId);
        if (matchedSupplier) {
          const supState = getSupplierState(matchedSupplier);
          if (supState === companyState) {
            alert(`Error: Supplier's registered state is ${supState}. For IGST/Outstate purchases, the supplier must be registered in a state other than ${companyState}!`);
            supplierSelect.value = "";
            supplierSelect.dispatchEvent(new Event("change"));
            return;
          } else {
            const purStateSel = document.getElementById("pur-state");
            if (purStateSel) {
              const matchOpt = Array.from(purStateSel.options).find(opt => opt.value === supState);
              if (matchOpt) {
                purStateSel.value = supState;
              } else {
                purStateSel.value = "OUTSTATE";
              }
              purStateSel.disabled = true;
              purStateSel.dispatchEvent(new Event("change"));
            }
          }
        }
      } else {
        const purStateSel = document.getElementById("pur-state");
        if (purStateSel) {
          purStateSel.disabled = false;
        }
      }
    }
    const opt = supplierSelect.selectedOptions[0];
    if (!opt) {
      updateVendorClosingBalanceDisplay();
      return;
    }
    const branchType = opt.getAttribute("data-branchtype") || "single";
    const branchesStr = opt.getAttribute("data-branches") || "";

    if (branchType === "multiple") {
      branchContainer.style.display = "block";
      const branches = branchesStr.split(",").filter(Boolean);
      branchSelect.innerHTML = '<option value="">-- Select Branch --</option>' +
        branches.map(b => `<option value="${b}">${b}</option>`).join("");
      branchSelect.required = true;
    } else {
      branchContainer.style.display = "none";
      branchSelect.innerHTML = '<option value="">-- Select Branch --</option>';
      branchSelect.required = false;
    }

    updateVendorClosingBalanceDisplay();
  });

  if (branchSelect) {
    branchSelect.addEventListener("change", updateVendorClosingBalanceDisplay);
  }
  if (purDateInput) {
    purDateInput.addEventListener("change", () => {
      updateVendorClosingBalanceDisplay();
      if (supplierDropdown && supplierDropdown.style.display !== "none") {
        renderSupplierDropdownList(supplierSearch ? supplierSearch.value : "");
      }
    });
  }

  const getSortedPurProductNames = () => {
    const freshMaterials = state.getMaterials() || materials || [];
    return [...new Set(freshMaterials.map(m => m.name).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  };

  // Helper to repopulate products dropdown
  const repopulateProducts = () => {
    if (typeof renderPurProductDropdownList === "function") {
      renderPurProductDropdownList(productSelect ? productSelect.value : "");
    }
  };

  const openProductMasterFromPurchase = () => {
    import("./inventory.js").then(m => {
      m.showProductMasterModal(container, null, null, () => {
        showRecordPurchaseModal(container, editPurchase, onSuccess, activeSeries);
        setTimeout(() => {
          repopulateProducts();
        }, 50);
      });
    });
  };

  // Click on "New Product [F9]"
  document.getElementById("ribbon-new-product").addEventListener("click", (e) => {
    e.preventDefault();
    openProductMasterFromPurchase();
  });

  // F9 / F10 keydown inside form
  document.getElementById("purchase-bill-form").addEventListener("keydown", (e) => {
    if (e.key === "F9") {
      e.preventDefault();
      openProductMasterFromPurchase();
    }
    if (e.key === "F10") {
      e.preventDefault();
      if (productSelect) {
        productSelect.focus();
        productSelect.select();
        openPurProductDropdown();
      }
    }
    const openPurchaseAdjustmentsModal = () => {
      const totNetVal = gridItems.reduce((acc, item) => acc + item.netValue, 0);
      const totGst = gridItems.reduce((acc, item) => acc + item.gstAmount, 0);
      const totCess = gridItems.reduce((acc, item) => acc + (item.netValue * (item.cessPercent / 100)), 0);
      const addlCess = parseFloat(document.getElementById("pur-addlcess")?.value) || 0;
      const roundOff = parseFloat(document.getElementById("pur-roundoff")?.value) || 0;
      
      const initialBillAmount = totNetVal + totGst + totCess + addlCess + roundOff;
      
      showAdjustmentsModal("purchase", initialBillAmount, adjustmentsList, (savedList) => {
        adjustmentsList = savedList;
        renderGridAndRecalc();
      });
    };

    if (e.key === "Insert") {
      e.preventDefault();
      openPurchaseAdjustmentsModal();
    }
  });

  document.getElementById("lbl-pur-adjustments")?.addEventListener("click", () => {
    const totNetVal = gridItems.reduce((acc, item) => acc + item.netValue, 0);
    const totGst = gridItems.reduce((acc, item) => acc + item.gstAmount, 0);
    const totCess = gridItems.reduce((acc, item) => acc + (item.netValue * (item.cessPercent / 100)), 0);
    const addlCess = parseFloat(document.getElementById("pur-addlcess")?.value) || 0;
    const roundOff = parseFloat(document.getElementById("pur-roundoff")?.value) || 0;
    const initialBillAmount = totNetVal + totGst + totCess + addlCess + roundOff;
    showAdjustmentsModal("purchase", initialBillAmount, adjustmentsList, (savedList) => {
      adjustmentsList = savedList;
      renderGridAndRecalc();
    });
  });

  document.getElementById("pur-adjustments")?.addEventListener("dblclick", () => {
    const totNetVal = gridItems.reduce((acc, item) => acc + item.netValue, 0);
    const totGst = gridItems.reduce((acc, item) => acc + item.gstAmount, 0);
    const totCess = gridItems.reduce((acc, item) => acc + (item.netValue * (item.cessPercent / 100)), 0);
    const addlCess = parseFloat(document.getElementById("pur-addlcess")?.value) || 0;
    const roundOff = parseFloat(document.getElementById("pur-roundoff")?.value) || 0;
    const initialBillAmount = totNetVal + totGst + totCess + addlCess + roundOff;
    showAdjustmentsModal("purchase", initialBillAmount, adjustmentsList, (savedList) => {
      adjustmentsList = savedList;
      renderGridAndRecalc();
    });
  });

  document.getElementById("btn-clear-purchase-adjustments")?.addEventListener("click", () => {
    adjustmentsList = [];
    const adjBox = document.getElementById("pur-adjustments");
    if (adjBox) adjBox.value = "0.00";
    renderGridAndRecalc();
  });
  // Click on "+" next to Vendor select
  document.getElementById("btn-add-vendor-purchase").addEventListener("click", () => {
    import("./contacts.js").then(m => {
      m.showAddContactModal(document.getElementById("sub-modal-container-root"), (newVendor) => {
        if (newVendor && newVendor.id) {
          const freshSuppliers = getSupplierSearchList(true);
          refreshSupplierBalancesCache();
          const vendorSelect = document.getElementById("pur-supplier");
          if (vendorSelect) {
            vendorSelect.innerHTML = `<option value="">-- Choose Supplier --</option>` +
              freshSuppliers.map(s => `<option value="${s.id}" data-branchtype="${s.siteType || 'single'}" data-branches="${(s.sites || []).join(',')}">${s.name}</option>`).join("");
            vendorSelect.value = newVendor.id;
            vendorSelect.dispatchEvent(new Event("change"));
          }
          if (supplierSearch) {
            supplierSearch.value = newVendor.name || "";
          }
          updateVendorClosingBalanceDisplay();
        }
      }, "supplier");
    });
  });

  document.getElementById("purchase-bill-form").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.type !== "submit" && !e.target.id.startsWith("ribbon-") && e.target.id !== "pur-supplier-search") {
      e.preventDefault();
      const focusables = Array.from(document.getElementById("purchase-bill-form").querySelectorAll("input, select, button:not([type='button'])"));
      const idx = focusables.indexOf(e.target);
      if (idx > -1 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
      }
    }
  });

  // Ribbon field selections
  const productSelect = document.getElementById("ribbon-product");
  const productDropdown = document.getElementById("ribbon-product-dropdown");
  const productListEl = document.getElementById("ribbon-product-list");
  const codeSelect = document.getElementById("ribbon-code");
  const codeSearch = document.getElementById("ribbon-code-search");
  const codeDropdown = document.getElementById("ribbon-code-dropdown");
  const codeListEl = document.getElementById("ribbon-code-list");
  const batchSelect = null; // batch removed

  const qtyInput = document.getElementById("ribbon-qty");
  const unitSelect = document.getElementById("ribbon-unit");
  const rateInput = document.getElementById("ribbon-rate");
  const mrpInput = document.getElementById("ribbon-mrp");
  const disPercentInput = document.getElementById("ribbon-dispercent");
  const disAmtInput = document.getElementById("ribbon-disamt");
  const addRowBtn = document.getElementById("btn-ribbon-add");

  let activePurProductIndex = 0;
  let currentFilteredPurProducts = [];

  let currentMatchingCodes = [];
  let currentFilteredCodes = [];
  let activePurCodeIndex = 0;

  function renderPurProductDropdownList(filterText = "") {
    if (!productListEl) return;
    const allProducts = getSortedPurProductNames();
    const query = (filterText || "").trim().toLowerCase();
    currentFilteredPurProducts = query
      ? allProducts.filter(name => name.toLowerCase().includes(query))
      : allProducts;

    if (currentFilteredPurProducts.length === 0) {
      productListEl.innerHTML = `<div style="padding:6px 8px; font-size:0.75rem; color:#64748b; font-style:italic; user-select:none;">No matching products</div>`;
      activePurProductIndex = -1;
      return;
    }

    if (activePurProductIndex < 0 || activePurProductIndex >= currentFilteredPurProducts.length) {
      activePurProductIndex = 0;
    }

    productListEl.innerHTML = currentFilteredPurProducts.map((name, idx) => {
      const isSelected = idx === activePurProductIndex;
      return `<div class="ribbon-product-item" data-index="${idx}" data-name="${name.replace(/"/g, '&quot;')}" style="padding:4px 8px; font-size:0.78rem; font-weight:700; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; background-color:${isSelected ? '#0078d7' : 'white'}; color:${isSelected ? 'white' : '#0f172a'};">${name}</div>`;
    }).join("");

    productListEl.querySelectorAll(".ribbon-product-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-index"));
        if (activePurProductIndex !== idx) {
          activePurProductIndex = idx;
          updatePurProductListHighlight();
        }
      });

      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedName = item.getAttribute("data-name");
        selectPurProductAndAdvance(selectedName);
      };

      item.addEventListener("click", handleSelect);
      item.addEventListener("dblclick", handleSelect);
    });

    scrollActivePurProductIntoView();
  }

  function updatePurProductListHighlight() {
    if (!productListEl) return;
    const items = productListEl.querySelectorAll(".ribbon-product-item");
    items.forEach((item, idx) => {
      const isSelected = idx === activePurProductIndex;
      item.style.backgroundColor = isSelected ? '#0078d7' : 'white';
      item.style.color = isSelected ? 'white' : '#0f172a';
    });
    scrollActivePurProductIntoView();
  }

  function scrollActivePurProductIntoView() {
    if (!productListEl) return;
    const activeItem = productListEl.querySelector(`.ribbon-product-item[data-index="${activePurProductIndex}"]`);
    if (activeItem) {
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = productListEl.scrollTop;
      const containerBottom = containerTop + productListEl.clientHeight;
      if (itemTop < containerTop) {
        productListEl.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        productListEl.scrollTop = itemBottom - productListEl.clientHeight;
      }
    }
  }

  function openPurProductDropdown() {
    if (!productDropdown) return;
    productDropdown.style.display = "block";
    renderPurProductDropdownList(productSelect ? productSelect.value : "");
  }

  function closePurProductDropdown() {
    if (!productDropdown) return;
    productDropdown.style.display = "none";
  }

  function renderPurCodeDropdownList(filterText = "") {
    if (!codeListEl) return;
    const query = (filterText || "").trim().toLowerCase();
    currentFilteredCodes = query
      ? currentMatchingCodes.filter(c => (c || "").toLowerCase().includes(query))
      : currentMatchingCodes;

    if (currentFilteredCodes.length === 0) {
      codeListEl.innerHTML = `<div style="padding:6px 8px; font-size:0.75rem; color:#64748b; font-style:italic; user-select:none;">No matching codes</div>`;
      activePurCodeIndex = -1;
      return;
    }

    if (activePurCodeIndex < 0 || activePurCodeIndex >= currentFilteredCodes.length) {
      activePurCodeIndex = 0;
    }

    codeListEl.innerHTML = currentFilteredCodes.map((code, idx) => {
      const isSelected = idx === activePurCodeIndex;
      return `<div class="ribbon-code-item" data-index="${idx}" data-code="${code.replace(/"/g, '&quot;')}" style="padding:4px 8px; font-size:0.78rem; font-weight:700; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; background-color:${isSelected ? '#0078d7' : 'white'}; color:${isSelected ? 'white' : '#0f172a'};">${code}</div>`;
    }).join("");

    codeListEl.querySelectorAll(".ribbon-code-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-index"));
        if (activePurCodeIndex !== idx) {
          activePurCodeIndex = idx;
          updatePurCodeListHighlight();
        }
      });

      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selCode = item.getAttribute("data-code");
        selectPurCodeAndAdvance(selCode);
      };

      item.addEventListener("click", handleSelect);
      item.addEventListener("dblclick", handleSelect);
    });

    scrollActivePurCodeIntoView();
  }

  function updatePurCodeListHighlight() {
    if (!codeListEl) return;
    const items = codeListEl.querySelectorAll(".ribbon-code-item");
    items.forEach((item, idx) => {
      const isSelected = idx === activePurCodeIndex;
      item.style.backgroundColor = isSelected ? '#0078d7' : 'white';
      item.style.color = isSelected ? 'white' : '#0f172a';
    });
    scrollActivePurCodeIntoView();
  }

  function scrollActivePurCodeIntoView() {
    if (!codeListEl) return;
    const activeItem = codeListEl.querySelector(`.ribbon-code-item[data-index="${activePurCodeIndex}"]`);
    if (activeItem) {
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = codeListEl.scrollTop;
      const containerBottom = containerTop + codeListEl.clientHeight;
      if (itemTop < containerTop) {
        codeListEl.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        codeListEl.scrollTop = itemBottom - codeListEl.clientHeight;
      }
    }
  }

  function openPurCodeDropdown() {
    if (!codeDropdown || !codeSearch || codeSearch.disabled) return;
    codeDropdown.style.display = "block";
    renderPurCodeDropdownList(codeSearch.value || "");
  }

  function closePurCodeDropdown() {
    if (!codeDropdown) return;
    codeDropdown.style.display = "none";
  }

  function selectPurCodeAndAdvance(code) {
    if (!codeSelect || !codeSearch) return;
    codeSelect.value = code;
    codeSearch.value = code;
    closePurCodeDropdown();
    codeSelect.dispatchEvent(new Event("change"));

    setTimeout(() => {
      if (ribbonBatchSearch && !ribbonBatchSearch.disabled) {
        ribbonBatchSearch.focus();
      } else {
        qtyInput.focus();
      }
    }, 10);
  }

  function selectPurProductAndAdvance(name) {
    if (!productSelect) return;
    productSelect.value = name;
    closePurProductDropdown();
    productSelect.dispatchEvent(new Event("change"));
    
    setTimeout(() => {
      if (codeSearch && !codeSearch.disabled && currentMatchingCodes.length > 1) {
        codeSearch.focus();
        openPurCodeDropdown();
      } else if (ribbonBatchSearch && !ribbonBatchSearch.disabled) {
        ribbonBatchSearch.focus();
      } else {
        qtyInput.focus();
      }
    }, 20);
  }

  if (productSelect) {
    productSelect.addEventListener("focus", () => {
      productSelect.select();
      openPurProductDropdown();
    });

    productSelect.addEventListener("click", () => {
      openPurProductDropdown();
    });

    productSelect.addEventListener("input", () => {
      activePurProductIndex = 0;
      openPurProductDropdown();
    });

    productSelect.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (productDropdown.style.display === "none") {
          openPurProductDropdown();
        } else if (currentFilteredPurProducts.length > 0) {
          activePurProductIndex = (activePurProductIndex + 1) % currentFilteredPurProducts.length;
          updatePurProductListHighlight();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (productDropdown.style.display === "none") {
          openPurProductDropdown();
        } else if (currentFilteredPurProducts.length > 0) {
          activePurProductIndex = (activePurProductIndex - 1 + currentFilteredPurProducts.length) % currentFilteredPurProducts.length;
          updatePurProductListHighlight();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (productDropdown.style.display !== "none" && activePurProductIndex >= 0 && activePurProductIndex < currentFilteredPurProducts.length) {
          selectPurProductAndAdvance(currentFilteredPurProducts[activePurProductIndex]);
        } else {
          const val = (productSelect.value || "").trim().toLowerCase();
          const all = getSortedPurProductNames();
          const exactMatch = all.find(p => p.toLowerCase() === val);
          const partialMatch = all.find(p => p.toLowerCase().startsWith(val)) || all.find(p => p.toLowerCase().includes(val));
          const matched = exactMatch || partialMatch;
          if (matched) {
            selectPurProductAndAdvance(matched);
          } else {
            closePurProductDropdown();
            if (codeSearch && !codeSearch.disabled && currentMatchingCodes.length > 1) {
              codeSearch.focus();
              openPurCodeDropdown();
            } else if (ribbonBatchSearch && !ribbonBatchSearch.disabled) {
              ribbonBatchSearch.focus();
            } else {
              qtyInput.focus();
            }
          }
        }
      } else if (e.key === "Tab") {
        if (productDropdown.style.display !== "none" && activePurProductIndex >= 0 && activePurProductIndex < currentFilteredPurProducts.length) {
          productSelect.value = currentFilteredPurProducts[activePurProductIndex];
          productSelect.dispatchEvent(new Event("change"));
        }
        closePurProductDropdown();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closePurProductDropdown();
      }
    });
  }

  onDocClickClosePurProductDropdown = (e) => {
    if (productSelect && productDropdown && !productSelect.contains(e.target) && !productDropdown.contains(e.target)) {
      closePurProductDropdown();
    }
  };
  document.addEventListener("click", onDocClickClosePurProductDropdown);

  if (codeSearch) {
    codeSearch.addEventListener("focus", () => {
      codeSearch.select();
      openPurCodeDropdown();
    });

    codeSearch.addEventListener("click", () => {
      openPurCodeDropdown();
    });

    codeSearch.addEventListener("input", () => {
      activePurCodeIndex = 0;
      openPurCodeDropdown();
    });

    codeSearch.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        if (codeDropdown && codeDropdown.style.display === "none") {
          openPurCodeDropdown();
        } else if (currentFilteredCodes.length > 0) {
          activePurCodeIndex = (activePurCodeIndex + 1) % currentFilteredCodes.length;
          updatePurCodeListHighlight();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        if (codeDropdown && codeDropdown.style.display === "none") {
          openPurCodeDropdown();
        } else if (currentFilteredCodes.length > 0) {
          activePurCodeIndex = (activePurCodeIndex - 1 + currentFilteredCodes.length) % currentFilteredCodes.length;
          updatePurCodeListHighlight();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (codeDropdown && codeDropdown.style.display !== "none" && activePurCodeIndex >= 0 && activePurCodeIndex < currentFilteredCodes.length) {
          selectPurCodeAndAdvance(currentFilteredCodes[activePurCodeIndex]);
        } else {
          const val = (codeSearch.value || "").trim().toLowerCase();
          const exactMatch = currentMatchingCodes.find(c => (c || "").toLowerCase() === val);
          const partialMatch = currentMatchingCodes.find(c => (c || "").toLowerCase().startsWith(val)) || currentMatchingCodes.find(c => (c || "").toLowerCase().includes(val));
          const matched = exactMatch || partialMatch;
          if (matched) {
            selectPurCodeAndAdvance(matched);
          } else {
            closePurCodeDropdown();
            if (ribbonBatchSearch && !ribbonBatchSearch.disabled) ribbonBatchSearch.focus();
            else qtyInput.focus();
          }
        }
      } else if (e.key === "Tab") {
        if (codeDropdown && codeDropdown.style.display !== "none" && activePurCodeIndex >= 0 && activePurCodeIndex < currentFilteredCodes.length) {
          codeSelect.value = currentFilteredCodes[activePurCodeIndex];
          codeSearch.value = currentFilteredCodes[activePurCodeIndex];
          codeSelect.dispatchEvent(new Event("change"));
        }
        closePurCodeDropdown();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closePurCodeDropdown();
      }
    });
  }

  onDocClickClosePurCodeDropdown = (e) => {
    if (codeSearch && codeDropdown && !codeSearch.contains(e.target) && !codeDropdown.contains(e.target)) {
      closePurCodeDropdown();
    }
  };
  document.addEventListener("click", onDocClickClosePurCodeDropdown);

  // Ribbon fields Enter navigation and auto-add
  const ribbonPurFields = [
    "ribbon-product",
    "ribbon-code-search",
    "ribbon-batch-search",
    "ribbon-qty",
    "ribbon-unit",
    "ribbon-rate",
    "ribbon-mrp",
    "ribbon-dispercent",
    "ribbon-disamt"
  ];
  ribbonPurFields.forEach((id, idx) => {
    if (id === "ribbon-product") return;
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (id === "ribbon-disamt") {
            addRowBtn.click();
            if (productSelect) {
              productSelect.focus();
              openPurProductDropdown();
            }
          } else {
            const nextEl = document.getElementById(ribbonPurFields[idx + 1]);
            if (nextEl) nextEl.focus();
          }
        }
      });
    }
  });

  let gridItems = editPurchase ? editPurchase.items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const disP = parseFloat(item.discountPercent) || 0;
    const disA = parseFloat(item.discountAmount) || 0;
    const netVal = item.netValue !== undefined ? parseFloat(item.netValue) : (item.amount !== undefined ? parseFloat(item.amount) : ((qty * price) - disA));
    const gstPct = item.gstPercent !== undefined && item.gstPercent !== null && !isNaN(item.gstPercent) && Number(item.gstPercent) > 0 ? parseFloat(item.gstPercent) : (item.taxRate !== undefined ? parseFloat(item.taxRate) : 0);
    const existingGstAmt = (parseFloat(item.cgst) || 0) + (parseFloat(item.sgst) || 0) + (parseFloat(item.igst) || 0);
    const gstAmt = item.gstAmount !== undefined && item.gstAmount !== null && !isNaN(item.gstAmount) && Number(item.gstAmount) > 0 ? parseFloat(item.gstAmount) : (existingGstAmt > 0 ? existingGstAmt : (netVal * (gstPct / 100)));
    const cessPct = parseFloat(item.cessPercent) || 0;
    const netAmt = item.netAmount !== undefined ? parseFloat(item.netAmount) : (netVal + gstAmt);

    return {
      materialId: item.materialId,
      name: item.name,
      code: item.code || item.model || "",
      batchNo: item.batchNo || "",
      quantity: qty,
      unit: item.unit || "Bags",
      price: price,
      landingCost: parseFloat(item.landingCost) || price,
      mrp: parseFloat(item.mrp) || (price * 1.25),
      discountPercent: disP,
      discountAmount: disA,
      netValue: netVal,
      gstPercent: gstPct,
      gstAmount: gstAmt,
      cessPercent: cessPct,
      netAmount: netAmt
    };
  }) : [];

  let adjustmentsList = editPurchase ? (editPurchase.adjustmentsList || []) : [];
  let isManualRoundOff = false;

  // Pre-fill existing metadata if editing
  if (editPurchase) {
    document.getElementById("pur-supplier").value = editPurchase.contactId;
    document.getElementById("pur-supplier").dispatchEvent(new Event("change"));
    const matchSup = getSupplierSearchList().find(s => s.id === editPurchase.contactId);
    if (matchSup && supplierSearch) {
      supplierSearch.value = matchSup.name;
    }
    if (editPurchase.siteName) {
      document.getElementById("pur-branch").value = editPurchase.siteName;
    }
    let targetPurState = editPurchase.state;
    if (!targetPurState || targetPurState === "KERALA") {
      if (state.isInterstatePurchase(editPurchase)) {
        targetPurState = (matchSup && matchSup.state && matchSup.state !== "KERALA") ? matchSup.state : "OUTSTATE";
      }
    }
    document.getElementById("pur-state").value = targetPurState || "KERALA";
    const purPaymodeEl = document.getElementById("pur-paymode");
    const targetPurPaymode = String(editPurchase.payMode || editPurchase.paymode || "Credit").trim();
    if (purPaymodeEl) {
      let matched = false;
      for (let opt of purPaymodeEl.options) {
        if (opt.value.toUpperCase() === targetPurPaymode.toUpperCase() || opt.text.toUpperCase() === targetPurPaymode.toUpperCase()) {
          purPaymodeEl.value = opt.value;
          matched = true;
          break;
        }
      }
      if (!matched && targetPurPaymode.toUpperCase().includes("CASH")) {
        for (let opt of purPaymodeEl.options) {
          if (opt.value.toUpperCase().includes("CASH")) {
            purPaymodeEl.value = opt.value;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        purPaymodeEl.value = targetPurPaymode;
      }
      purPaymodeEl.dispatchEvent(new Event("change"));
    }
    document.getElementById("pur-crperiod").value = editPurchase.creditPeriod || "0";
    document.getElementById("pur-adjustments").value = editPurchase.adjustments || "0.00";
    document.getElementById("pur-addlcess").value = editPurchase.additionalCess || "0.00";
    document.getElementById("pur-roundoff").value = editPurchase.roundOff || "0.00";
  }
  updateVendorClosingBalanceDisplay();

  const purStateBox = document.getElementById("pur-state");
  if (purStateBox) {
    if (isLocalSeries) {
      purStateBox.value = companyState;
      purStateBox.disabled = true;
    } else if (!editPurchase) {
      purStateBox.value = companyState;
    }
  }

  const ribbonBatchSelect = document.getElementById("ribbon-batch");
  const ribbonBatchSearch = document.getElementById("ribbon-batch-search");
  const ribbonBatchDropdown = document.getElementById("ribbon-batch-dropdown");
  const ribbonBatchListEl = document.getElementById("ribbon-batch-list");
  const ribbonSelectBatchBtn = document.getElementById("btn-ribbon-select-batch");

  let currentBatchesList = [];
  let currentFilteredBatches = [];
  let activePurBatchIndex = 0;

  const renderPurBatchDropdownList = (filterText = "") => {
    if (!ribbonBatchListEl) return;
    const query = (filterText || "").trim().toLowerCase();

    if (!query) {
      currentFilteredBatches = currentBatchesList;
    } else {
      currentFilteredBatches = currentBatchesList.filter(b => (b.batchNo || "").toLowerCase().includes(query));
    }

    if (currentFilteredBatches.length === 0) {
      ribbonBatchListEl.innerHTML = `<div style="padding:6px 8px; font-size:0.75rem; color:#64748b; font-style:italic; user-select:none;">No batches found. Click "..." to create one</div>`;
      activePurBatchIndex = -1;
      return;
    }

    if (activePurBatchIndex < 0 || activePurBatchIndex >= currentFilteredBatches.length) {
      activePurBatchIndex = 0;
    }

    ribbonBatchListEl.innerHTML = currentFilteredBatches.map((b, idx) => {
      const isSelected = idx === activePurBatchIndex;
      return `
        <div class="ribbon-pur-batch-item" data-index="${idx}" data-batch="${b.batchNo}" style="padding:5px 8px; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background-color:${isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')}; color:${isSelected ? '#ffffff' : '#0f172a'}; font-size:0.75rem;">
          <span style="font-weight:700;">${b.batchNo}</span>
          <span style="font-weight:600; font-size:0.7rem; color:${isSelected ? '#e0f2fe' : (b.stock > 0 ? '#16a34a' : '#ef4444')};">Qty: ${b.stock}</span>
        </div>
      `;
    }).join("");

    ribbonBatchListEl.querySelectorAll(".ribbon-pur-batch-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-index"));
        if (activePurBatchIndex !== idx) {
          activePurBatchIndex = idx;
          updatePurBatchListHighlight();
        }
      });

      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selBatch = item.getAttribute("data-batch");
        selectPurBatch(selBatch);
      };

      item.addEventListener("click", handleSelect);
      item.addEventListener("dblclick", handleSelect);
    });

    scrollActivePurBatchIntoView();
  };

  const updatePurBatchListHighlight = () => {
    if (!ribbonBatchListEl) return;
    const items = ribbonBatchListEl.querySelectorAll(".ribbon-pur-batch-item");
    items.forEach((item, idx) => {
      const isSelected = idx === activePurBatchIndex;
      item.style.backgroundColor = isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');
      item.style.color = isSelected ? '#ffffff' : '#0f172a';
    });
    scrollActivePurBatchIntoView();
  };

  const scrollActivePurBatchIntoView = () => {
    if (!ribbonBatchListEl) return;
    const activeItem = ribbonBatchListEl.querySelector(`.ribbon-pur-batch-item[data-index="${activePurBatchIndex}"]`);
    if (activeItem) {
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = ribbonBatchListEl.scrollTop;
      const containerBottom = containerTop + ribbonBatchListEl.clientHeight;
      if (itemTop < containerTop) {
        ribbonBatchListEl.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        ribbonBatchListEl.scrollTop = itemBottom - ribbonBatchListEl.clientHeight;
      }
    }
  };

  const openPurBatchDropdown = () => {
    if (!ribbonBatchDropdown || !ribbonBatchSearch || ribbonBatchSearch.disabled) return;
    ribbonBatchDropdown.style.display = "block";
    renderPurBatchDropdownList(ribbonBatchSearch.value || "");
  };

  const closePurBatchDropdown = () => {
    if (!ribbonBatchDropdown) return;
    ribbonBatchDropdown.style.display = "none";
  };

  const selectPurBatch = (batchNo) => {
    if (!ribbonBatchSelect || !ribbonBatchSearch) return;
    ribbonBatchSelect.value = batchNo;
    ribbonBatchSearch.value = batchNo;
    const matched = currentBatchesList.find(b => b.batchNo === batchNo);
    if (matched) {
      rateInput.value = matched.landingCost ? matched.landingCost.toFixed(2) : rateInput.value;
      mrpInput.value = matched.mrp ? matched.mrp.toFixed(2) : mrpInput.value;
      recalcRibbonRowDiscount();
    }
    closePurBatchDropdown();
    setTimeout(() => {
      if (qtyInput) qtyInput.focus();
    }, 10);
  };

  if (ribbonBatchSearch) {
    ribbonBatchSearch.addEventListener("focus", () => {
      openPurBatchDropdown();
      ribbonBatchSearch.select();
    });
    ribbonBatchSearch.addEventListener("click", () => {
      openPurBatchDropdown();
    });
    ribbonBatchSearch.addEventListener("input", () => {
      activePurBatchIndex = 0;
      openPurBatchDropdown();
    });
    ribbonBatchSearch.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        if (ribbonBatchDropdown && ribbonBatchDropdown.style.display === "none") {
          openPurBatchDropdown();
        } else if (currentFilteredBatches.length > 0) {
          activePurBatchIndex = (activePurBatchIndex + 1) % currentFilteredBatches.length;
          updatePurBatchListHighlight();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        if (ribbonBatchDropdown && ribbonBatchDropdown.style.display === "none") {
          openPurBatchDropdown();
        } else if (currentFilteredBatches.length > 0) {
          activePurBatchIndex = (activePurBatchIndex - 1 + currentFilteredBatches.length) % currentFilteredBatches.length;
          updatePurBatchListHighlight();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (ribbonBatchDropdown && ribbonBatchDropdown.style.display !== "none" && activePurBatchIndex >= 0 && activePurBatchIndex < currentFilteredBatches.length) {
          selectPurBatch(currentFilteredBatches[activePurBatchIndex].batchNo);
        } else {
          const val = (ribbonBatchSearch.value || "").trim().toLowerCase();
          const exact = currentBatchesList.find(b => (b.batchNo || "").toLowerCase() === val);
          const partial = currentBatchesList.find(b => (b.batchNo || "").toLowerCase().startsWith(val)) || currentBatchesList.find(b => (b.batchNo || "").toLowerCase().includes(val));
          const matched = exact || partial;
          if (matched) {
            selectPurBatch(matched.batchNo);
          } else if (currentBatchesList.length === 0) {
            openBatchModal();
          } else {
            closePurBatchDropdown();
            if (qtyInput) qtyInput.focus();
          }
        }
      } else if (e.key === "Tab") {
        if (ribbonBatchDropdown && ribbonBatchDropdown.style.display !== "none" && activePurBatchIndex >= 0 && activePurBatchIndex < currentFilteredBatches.length) {
          selectPurBatch(currentFilteredBatches[activePurBatchIndex].batchNo);
        }
        closePurBatchDropdown();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closePurBatchDropdown();
      } else if (e.key === "F4") {
        e.preventDefault();
        e.stopPropagation();
        openBatchModal();
      }
    });
  }

  onDocClickClosePurBatchDropdown = (e) => {
    if (ribbonBatchSearch && ribbonBatchDropdown && !ribbonBatchSearch.contains(e.target) && !ribbonBatchDropdown.contains(e.target) && (!ribbonSelectBatchBtn || !ribbonSelectBatchBtn.contains(e.target))) {
      closePurBatchDropdown();
    }
  };
  document.addEventListener("click", onDocClickClosePurBatchDropdown);

  const populateRibbonBatches = (materialId, selectedBatchNo = null) => {
    const batches = state.getMaterialBatches(materialId) || [];
    currentBatchesList = batches;
    ribbonBatchSelect.innerHTML = '<option value="">-- Batch --</option>' +
      batches.map(b => `<option value="${b.batchNo}" ${selectedBatchNo === b.batchNo ? 'selected' : ''}>${b.batchNo} (Qty: ${b.stock})</option>`).join("");
    ribbonBatchSelect.disabled = false;
    ribbonBatchSearch.disabled = false;
    ribbonSelectBatchBtn.disabled = false;

    if (selectedBatchNo) {
      ribbonBatchSelect.value = selectedBatchNo;
      ribbonBatchSearch.value = selectedBatchNo;
      const matched = batches.find(b => b.batchNo === selectedBatchNo);
      if (matched) {
        rateInput.value = matched.landingCost ? matched.landingCost.toFixed(2) : rateInput.value;
        mrpInput.value = matched.mrp ? matched.mrp.toFixed(2) : mrpInput.value;
        recalcRibbonRowDiscount();
      }
    } else if (batches.length === 1) {
      const b = batches[0];
      ribbonBatchSelect.value = b.batchNo;
      ribbonBatchSearch.value = b.batchNo;
      rateInput.value = b.landingCost ? b.landingCost.toFixed(2) : rateInput.value;
      mrpInput.value = b.mrp ? b.mrp.toFixed(2) : mrpInput.value;
      recalcRibbonRowDiscount();
    } else {
      ribbonBatchSelect.value = "";
      ribbonBatchSearch.value = "";
    }
  };

  // When product changes in ribbon: populate Code/Model dropdown in ascending order
  productSelect.addEventListener("change", () => {
    const pName = (productSelect.value || "").trim();
    if (pName) {
      const currentMaterials = state.getMaterials() || materials || [];
      const matchingMaterials = currentMaterials
        .filter(m => m.name.toLowerCase() === pName.toLowerCase())
        .sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true, sensitivity: 'base' }));

      if (matchingMaterials.length > 0) {
        currentMatchingCodes = matchingMaterials.map(m => m.code).filter(Boolean);
        codeSelect.innerHTML = '<option value="">-- Code/Model --</option>' + 
          matchingMaterials.map(m => `<option value="${m.code}">${m.code}</option>`).join("");
        codeSelect.disabled = false;
        if (codeSearch) {
          codeSearch.disabled = false;
        }
        updateRibbonUnitSelect(unitSelect, matchingMaterials[0].unit);

        if (matchingMaterials.length === 1) {
          codeSelect.value = matchingMaterials[0].code;
          if (codeSearch) codeSearch.value = matchingMaterials[0].code;
          codeSelect.dispatchEvent(new Event("change"));
        } else {
          codeSelect.value = "";
          if (codeSearch) codeSearch.value = "";
        }
      } else {
        currentMatchingCodes = [];
        codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
        codeSelect.disabled = true;
        if (codeSearch) {
          codeSearch.value = "";
          codeSearch.disabled = true;
        }
        ribbonBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
        ribbonBatchSelect.disabled = true;
        if (ribbonBatchSearch) {
          ribbonBatchSearch.value = "";
          ribbonBatchSearch.disabled = true;
        }
        ribbonSelectBatchBtn.disabled = true;
        currentBatchesList = [];
      }
    } else {
      currentMatchingCodes = [];
      codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
      codeSelect.disabled = true;
      if (codeSearch) {
        codeSearch.value = "";
        codeSearch.disabled = true;
      }
      ribbonBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
      ribbonBatchSelect.disabled = true;
      if (ribbonBatchSearch) {
        ribbonBatchSearch.value = "";
        ribbonBatchSearch.disabled = true;
      }
      ribbonSelectBatchBtn.disabled = true;
      currentBatchesList = [];
    }
  });

  const openBatchModal = () => {
    const pName = (productSelect.value || "").trim();
    const pCode = codeSelect.value;
    if (pName && pCode) {
      const currentMaterials = state.getMaterials() || materials || [];
      const mat = currentMaterials.find(m => m.name.toLowerCase() === pName.toLowerCase() && m.code === pCode);
      if (mat) {
        showBatchSelectionModal(mat.id, parseFloat(rateInput.value) || 0, (selectedBatch) => {
          if (selectedBatch) {
            populateRibbonBatches(mat.id, selectedBatch.batchNo);
            selectPurBatch(selectedBatch.batchNo);
          }
        });
      }
    }
  };

  // When Code/Model changes: autofill rate from product master & populate batches (do not popup batch modal yet)
  codeSelect.addEventListener("change", () => {
    const pName = (productSelect.value || "").trim();
    const pCode = codeSelect.value;
    if (codeSearch && codeSearch.value !== pCode) {
      codeSearch.value = pCode || "";
    }
    if (pName && pCode) {
      const currentMaterials = state.getMaterials() || materials || [];
      const mat = currentMaterials.find(m => m.name.toLowerCase() === pName.toLowerCase() && m.code === pCode);
      if (mat) {
        rateInput.value = mat.landingCost ? mat.landingCost.toFixed(2) : "";
        mrpInput.value = mat.mrp ? mat.mrp.toFixed(2) : "";
        updateRibbonUnitSelect(unitSelect, mat.unit);
        qtyInput.value = "100";
        disPercentInput.value = "0";
        disAmtInput.value = "0.00";
        populateRibbonBatches(mat.id);
        recalcRibbonRowDiscount();
      }
    }
  });

  ribbonSelectBatchBtn.addEventListener("click", openBatchModal);

  ribbonBatchSelect.addEventListener("change", () => {
    const pName = (productSelect.value || "").trim();
    const pCode = codeSelect.value;
    if (pName && pCode) {
      const currentMaterials = state.getMaterials() || materials || [];
      const mat = currentMaterials.find(m => m.name.toLowerCase() === pName.toLowerCase() && m.code === pCode);
      if (mat) {
        const selectedBatch = mat.batches.find(b => b.batchNo === ribbonBatchSelect.value);
        if (selectedBatch) {
          if (ribbonBatchSearch) ribbonBatchSearch.value = selectedBatch.batchNo;
          rateInput.value = selectedBatch.landingCost ? selectedBatch.landingCost.toFixed(2) : rateInput.value;
          mrpInput.value = selectedBatch.mrp ? selectedBatch.mrp.toFixed(2) : mrpInput.value;
          recalcRibbonRowDiscount();
        }
      }
    }
  });

  // Ribbon discounts auto-calculations
  qtyInput.addEventListener("input", recalcRibbonRowDiscount);
  rateInput.addEventListener("input", recalcRibbonRowDiscount);
  disPercentInput.addEventListener("input", () => {
    const q = parseFloat(qtyInput.value) || 0;
    const r = parseFloat(rateInput.value) || 0;
    const dp = parseFloat(disPercentInput.value) || 0;
    disAmtInput.value = (q * r * (dp / 100)).toFixed(2);
  });
  disAmtInput.addEventListener("input", () => {
    const q = parseFloat(qtyInput.value) || 0;
    const r = parseFloat(rateInput.value) || 0;
    const da = parseFloat(disAmtInput.value) || 0;
    const gross = q * r;
    disPercentInput.value = gross > 0 ? ((da / gross) * 100).toFixed(1) : "0";
  });

  function recalcRibbonRowDiscount() {
    const q = parseFloat(qtyInput.value) || 0;
    const r = parseFloat(rateInput.value) || 0;
    const dp = parseFloat(disPercentInput.value) || 0;
    disAmtInput.value = (q * r * (dp / 100)).toFixed(2);
  }

  // Add Ribbon row to grid
  addRowBtn.addEventListener("click", () => {
    const pName = (productSelect.value || "").trim();
    const pCode = codeSelect.value;
    const qty = parseFloat(qtyInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const mrp = parseFloat(mrpInput.value) || rate * 1.5;
    const disP = parseFloat(disPercentInput.value) || 0;
    const disA = parseFloat(disAmtInput.value) || 0;
    const selectedBatchNo = ribbonBatchSelect.value;

    if (!pName || !pCode || qty <= 0 || rate <= 0) {
      alert("Missing product details! Select Product, Code, and enter Qty/Rate.");
      return;
    }

    if (!selectedBatchNo) {
      alert("Please select or create a Batch first.");
      return;
    }

    const currentMaterials = state.getMaterials() || materials || [];
    const mat = currentMaterials.find(m => m.name.toLowerCase() === pName.toLowerCase() && m.code === pCode);
    if (!mat) return;

    // Validate if entered rate matches selected batch cost
    const matchedBatch = mat.batches.find(b => b.batchNo === selectedBatchNo);
    if (matchedBatch && parseFloat(matchedBatch.landingCost) !== rate) {
      alert("The entered rate does not match the landing cost of the selected batch. Please choose an existing batch that matches or create a new batch.");
      showBatchSelectionModal(mat.id, rate, (selectedBatch) => {
        if (selectedBatch) {
          populateRibbonBatches(mat.id, selectedBatch.batchNo);
          rateInput.value = selectedBatch.landingCost.toFixed(2);
          mrpInput.value = selectedBatch.mrp.toFixed(2);
          recalcRibbonRowDiscount();
        }
      });
      return;
    }

    const netVal = (qty * rate) - disA;
    const seriesType = activeSeries ? activeSeries.seriesType : "LOCAL";
    const gstPercent = seriesType === "NONTAXABLE" ? 0 : ((mat.igst !== undefined && mat.igst !== null && mat.igst !== "") ? parseFloat(mat.igst) : 18);
    const gstAmt = seriesType === "NONTAXABLE" ? 0 : (netVal * (gstPercent / 100));

    gridItems.push({
      materialId: mat.id,
      name: mat.name,
      code: pCode,
      batchNo: selectedBatchNo,
      quantity: qty,
      unit: unitSelect.value,
      price: rate,
      mrp: mrp,
      discountPercent: disP,
      discountAmount: disA,
      netValue: netVal,
      gstPercent: gstPercent,
      gstAmount: gstAmt,
      cessPercent: mat.cess || 0,
      netAmount: netVal + gstAmt
    });

    productSelect.value = "";
    productSelect.dispatchEvent(new Event("change"));
    qtyInput.value = "";
    rateInput.value = "";
    disPercentInput.value = "0";
    disAmtInput.value = "0.00";

    renderGridAndRecalc();
    if (productSelect) {
      productSelect.focus();
      openPurProductDropdown();
    }
  });

  // Adjustments changes trigger recalculations
  document.getElementById("pur-adjustments").addEventListener("input", () => {
    isManualRoundOff = false;
    renderGridAndRecalc();
  });
  document.getElementById("pur-addlcess").addEventListener("input", renderGridAndRecalc);
  document.getElementById("pur-roundoff").addEventListener("input", () => {
    isManualRoundOff = true;
    renderGridAndRecalc();
  });
  document.getElementById("pur-roundoff").addEventListener("focus", (e) => e.target.select());
  document.getElementById("pur-state").addEventListener("change", renderGridAndRecalc);

  function renderGridAndRecalc() {
    const tbody = document.getElementById("purchase-grid-body");
    tbody.innerHTML = gridItems.length === 0 ? `
      <tr><td colspan="12" style="text-align:center; padding:20px; color:#64748b;">No items added to the purchase grid.</td></tr>
    ` : gridItems.map((item, index) => `
      <tr class="purchase-grid-row" data-index="${index}" title="Double click to edit item" style="border-bottom: 1px solid #cbd5e1; background-color:${index % 2 === 0 ? '#f8fafc' : 'white'}; cursor: pointer;">
        <td style="padding:4px 6px;"><strong>${item.name}</strong></td>
        <td style="padding:4px 6px;"><code style="background-color:#f1f5f9; padding:2px; font-weight:700;">${item.code}</code></td>
        <td style="padding:4px 6px; font-weight:bold; color:#1e3b8b;">${item.batchNo || ''}</td>
        <td style="padding:4px 6px; text-align:right;">${item.quantity} ${item.unit}</td>
        <td style="padding:4px 6px; text-align:right;">\u20B9${item.price.toFixed(2)}</td>
        <td style="padding:4px 6px; text-align:right;">\u20B9${(item.quantity * item.price).toFixed(2)}</td>
        <td style="padding:4px 6px; text-align:right; color:#ef4444;">\u20B9${item.discountAmount.toFixed(2)} (${item.discountPercent}%)</td>
        <td style="padding:4px 6px; text-align:right; font-weight:600;">\u20B9${item.netValue.toFixed(2)}</td>
        <td style="padding:4px 6px; text-align:right;">${item.gstPercent}%</td>
        <td style="padding:4px 6px; text-align:right;">\u20B9${item.gstAmount.toFixed(2)}</td>
        <td style="padding:4px 6px; text-align:right; font-weight:600; color:#1e40af;">\u20B9${item.netAmount.toFixed(2)}</td>
        <td style="padding:4px 6px; text-align:center;">
          <button type="button" class="btn-remove-grid-row" data-index="${index}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:1.1rem;">&times;</button>
        </td>
      </tr>
    `).join("");

    // Bind remove buttons
    tbody.querySelectorAll(".btn-remove-grid-row").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        gridItems.splice(idx, 1);
        renderGridAndRecalc();
      });
    });

    tbody.querySelectorAll(".purchase-grid-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const idx = parseInt(row.getAttribute("data-index"));
        const item = gridItems[idx];
        if (!item) return;

        productSelect.value = item.name;
        productSelect.dispatchEvent(new Event("change"));
        codeSelect.value = item.code;
        codeSelect.dispatchEvent(new Event("change"));
        
        populateRibbonBatches(item.materialId, item.batchNo);
        qtyInput.value = item.quantity;
        unitSelect.value = item.unit;
        rateInput.value = item.price;
        mrpInput.value = item.mrp;
        disPercentInput.value = item.discountPercent;
        disAmtInput.value = item.discountAmount;

        gridItems.splice(idx, 1);
        renderGridAndRecalc();
      });
    });

    // Run aggregations
    let totQty = 0;
    let totAmt = 0;
    let totDis = 0;
    let totNetVal = 0;
    let totGst = 0;
    let totCess = 0;

    gridItems.forEach(item => {
      totQty += item.quantity;
      totAmt += (item.quantity * item.price);
      totDis += item.discountAmount;
      totNetVal += item.netValue;
      totGst += item.gstAmount;
      const options = state.getOptions();
      if (options.enableCess !== false) {
        totCess += (item.netValue * (item.cessPercent / 100));
      }
    });

    document.getElementById("tot-qty").innerText = totQty.toFixed(2);
    document.getElementById("tot-amount").innerText = totAmt.toFixed(2);
    document.getElementById("tot-discount").innerText = totDis.toFixed(2);
    document.getElementById("tot-netvalue").innerText = totNetVal.toFixed(2);
    document.getElementById("tot-gst").innerText = totGst.toFixed(2);
    document.getElementById("tot-nettotal").innerText = (totNetVal + totGst + totCess).toFixed(2);

    // Enforce State-wise IGST or CGST/SGST splitting
    const selectedState = document.getElementById("pur-state").value;
    const cgstInput = document.getElementById("pur-cgst");
    const sgstInput = document.getElementById("pur-sgst");
    const igstInput = document.getElementById("pur-igst");
    const cessInput = document.getElementById("pur-cess");

    const activeCompanyId = state.getActiveCompanyId();
    const activeCompany = state.getRegisteredCompanies().find(c => c.id === activeCompanyId);
    const companyState = activeCompany ? (activeCompany.state || "KERALA").toUpperCase() : "KERALA";

    if (selectedState === companyState) {
      cgstInput.value = (totGst / 2).toFixed(2);
      sgstInput.value = (totGst / 2).toFixed(2);
      igstInput.value = "0.00";
    } else {
      cgstInput.value = "0.00";
      sgstInput.value = "0.00";
      igstInput.value = totGst.toFixed(2);
    }
    cessInput.value = totCess.toFixed(2);

    // Apply adjustments footer inputs
    let adj = 0;
    adjustmentsList.forEach(a => {
      if (a.type === "Add") adj += parseFloat(a.amount) || 0;
      else adj -= parseFloat(a.amount) || 0;
    });
    document.getElementById("pur-adjustments").value = adj.toFixed(2);

    const addlCess = parseFloat(document.getElementById("pur-addlcess")?.value) || 0;

    // Auto round-off total silently to nearest whole rupee (nearest 1) unless manually edited
    const rawTotal = totNetVal + totGst + totCess + adj + addlCess;
    let roundOff = 0;
    let netFinal = 0;

    if (!isManualRoundOff) {
      const roundedTotal = Math.round(rawTotal);
      roundOff = roundedTotal - rawTotal;
      const roundOffEl = document.getElementById("pur-roundoff");
      if (roundOffEl) {
        roundOffEl.value = roundOff.toFixed(2);
      }
      netFinal = roundedTotal;
    } else {
      roundOff = parseFloat(document.getElementById("pur-roundoff")?.value) || 0;
      netFinal = rawTotal + roundOff;
    }

    document.getElementById("pur-nettotal-box").innerText = `\u20B9${netFinal.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  }



  // Bind Submit (SAVE)
  let isPurchaseSubmitting = false;
  document.getElementById("purchase-bill-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (isPurchaseSubmitting) return;

    if (gridItems.length === 0) {
      alert("The purchase bill grid is empty! Please add at least one product using the ribbon.");
      return;
    }

    const supplierId = document.getElementById("pur-supplier").value;
    const invoiceNo = document.getElementById("pur-invoiceno").value.trim();

    // Check duplicate Invoice No for same vendor
    if (invoiceNo && supplierId) {
      const existingPurchases = state.getPurchases() || [];
      const isDuplicate = existingPurchases.some(p => {
        if (editPurchase && p.id === editPurchase.id) return false;
        return p.contactId === supplierId && p.invoiceNo && p.invoiceNo.trim().toLowerCase() === invoiceNo.toLowerCase();
      });
      if (isDuplicate) {
        alert(`Invoice No. "${invoiceNo}" is already entered for this vendor.`);
        return;
      }
    }

    // ── Series / State mismatch validation ───────────────────────────────────
    if (activeSeries) {
      const purState = (document.getElementById("pur-state")?.value || "").toUpperCase().trim();
      const activeCompany = state.getRegisteredCompanies().find(c => String(c.id) === String(state.getActiveCompanyId()));
      const companyState = (activeCompany?.state || "KERALA").toUpperCase();
      const isOutstate = purState && purState !== companyState;
      const seriesType = activeSeries.seriesType || "LOCAL";
      const isLocalSeries = seriesType === "LOCAL" || seriesType === "NONTAXABLE";
      const isIgstSeries = seriesType === "INTERSTATE" || seriesType === "IGST" || seriesType === "OUTSTATE";

      if (isLocalSeries && isOutstate) {
        alert(
          `❌ SERIES MISMATCH!\n\n` +
          `The vendor's state is "${purState}" (out-of-state).\n` +
          `Out-of-state purchases are IGST transactions and cannot be entered in the Local Purchase series.\n\n` +
          `Please switch to the "IGST Purchase" series and try again.`
        );
        return;
      }
      if (isIgstSeries && !isOutstate) {
        alert(
          `❌ SERIES MISMATCH!\n\n` +
          `The vendor's state is "${purState}" (same state — ${companyState}).\n` +
          `Same-state purchases use CGST+SGST and cannot be entered in the IGST Purchase series.\n\n` +
          `Please switch to the "Local Purchase" series and try again.`
        );
        return;
      }
    }

    const saveBtn = document.getElementById("btn-pur-save");
    if (saveBtn) saveBtn.disabled = true;

    try {
      const payload = {
        id: editPurchase ? editPurchase.id : undefined,
        voucherNo: editPurchase ? editPurchase.voucherNo : undefined,
        seriesId: activeSeries ? activeSeries.id : undefined,
        postingLedger: activeSeries ? activeSeries.ledgerCode : undefined,
        supplierId: supplierId,
        siteName: document.getElementById("pur-branch")?.value || "",
        refNo: document.getElementById("pur-refno").value,
        invoiceNo: invoiceNo,
        date: document.getElementById("pur-date").value,
        state: document.getElementById("pur-state").value,
        payMode: document.getElementById("pur-paymode").value,
        creditPeriod: document.getElementById("pur-crperiod").value,
        narration: document.getElementById("pur-narration").value,
        headloaderType: document.getElementById("pur-headloader-type") ? document.getElementById("pur-headloader-type").value : "std",
        adjustments: document.getElementById("pur-adjustments").value,
        adjustmentsList: adjustmentsList,
        additionalCess: document.getElementById("pur-addlcess").value,
        roundOff: document.getElementById("pur-roundoff").value,
        
        items: gridItems
      };

      if (editPurchase) {
        const pass = prompt("Enter Admin Password to update this purchase bill:");
        if (pass === null) {
          isPurchaseSubmitting = false;
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        if (pass !== state.getAdminPassword()) {
          alert("Incorrect password!");
          isPurchaseSubmitting = false;
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        state.cancelPurchase(editPurchase.id);
        const idx = state.purchases.findIndex(p => p.id === editPurchase.id);
        if (idx !== -1) {
          state.purchases.splice(idx, 1);
        }
      }

      const success = state.recordPurchase(payload);
      if (success) {
        alert("PURCHASE BILL SAVED SUCCESSFULLY.");
        if (onSuccess) onSuccess();
        showRecordPurchaseModal(container, null, onSuccess, activeSeries);
      } else {
        alert("Failed to save purchase bill. Please verify supplier details.");
        isPurchaseSubmitting = false;
        if (saveBtn) saveBtn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      isPurchaseSubmitting = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  if (editPurchase && editPurchase.isCancelled) {
    setTimeout(() => {
      const modalOverlay = document.getElementById("modal-overlay-tx");
      if (modalOverlay) {
        modalOverlay.querySelectorAll("input, select, textarea, button").forEach(el => {
          const allowedIds = ["pm-close-btn", "pm-close-btn-header", "btn-pur-search", "btn-pur-prev", "btn-pur-next", "btn-pur-print", "btn-pur-new", "btn-pur-cancel", "btn-print"];
          if (!allowedIds.includes(el.id) && !el.classList.contains("win-btn") && el.innerText !== "Close") {
            el.disabled = true;
            el.style.opacity = "0.75";
            el.style.cursor = "not-allowed";
          }
        });
      }
    }, 50);
  }

  renderGridAndRecalc();
}

// Purchase Return Modal (Debit Note - High-Fidelity ERP Style)
export function showPurchaseReturnModal(container, editReturn = null, onSuccess = null, selectedSeries = null) {
  const root = document.getElementById("modal-container-root");
  const suppliers = state.getContacts().filter(c => c.type === "supplier" || c.listInVendorList === true);
  const materials = state.getMaterials();
  const salesExecutivesList = ["Mr. Suresh Kumar", "Mr. Rajesh P.", "Mr. Anil Nair", "Mrs. Bindu V."];

  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-tx" style="display:flex; justify-content:center; align-items:center; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); z-index:2000; padding: 20px;">
      <div class="modal-container" style="max-width:1400px; width: 100%; background-color:#ffffff; color:#1e293b; font-family: 'Inter', system-ui, sans-serif; border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05); font-size:0.875rem; display: flex; flex-direction: column; max-height: 95vh; overflow: hidden;">
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); color:white; padding:16px 24px; font-weight:600; display:flex; justify-content:space-between; align-items:center; border-radius: 16px 16px 0 0;">
          <div style="display:flex; align-items:center; gap:12px; letter-spacing:0.5px;">
            <div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-arrow-rotate-left" style="color:#e0e7ff; font-size: 1.1rem;"></i>
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 1.1rem; font-weight: 700;">Purchase Return</span>
              <span style="font-size:0.75rem; color:#c7d2fe; font-weight:400; margin-top: 2px;">Bill Series: &lt;DEFAULT&gt; ${editReturn ? '<span style="color:#fbbf24; font-weight:600; margin-left: 4px;">(EDITING PR)</span>' : ''} <span style="margin-left: 10px; opacity: 0.8;">[Press Alt+F5 to change]</span></span>
            </div>
          </div>
          <button type="button" style="background: rgba(255,255,255,0.1); border:none; color:#e0e7ff; width: 36px; height: 36px; border-radius: 50%; font-size:1.25rem; cursor:pointer; transition:all 0.2s; display: flex; align-items: center; justify-content: center;" id="pm-close-btn-header" onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.color='white'; this.style.transform='rotate(90deg)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#e0e7ff'; this.style.transform='rotate(0deg)'"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <form id="create-purchase-return-form" style="display:flex; flex-direction:column; flex: 1; overflow-y: auto; padding: 24px; gap: 20px; background-color: #f8fafc;">
          
          <!-- Top Row banner & metadata inputs -->
          <div style="display: grid; grid-template-columns: 160px 1fr 180px; gap: 20px; align-items: center;">
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <span style="font-weight: 600; font-size: 0.7rem; display: block; color: #64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Return No</span>
              <input type="text" id="ret-pur-refno" style="width: 100%; border: none; background: transparent; font-weight: 700; font-size: 1.1rem; color:#1e293b; outline:none;" value="${editReturn ? editReturn.id : 'PR-' + String(state.getPurchaseReturns().length + 1).padStart(3, '0')}" readonly>
            </div>
            
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
              <span style="background: linear-gradient(90deg, #4f46e5 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; font-size: 1.5rem; letter-spacing: 4px; text-transform: uppercase;">
                ${(state.getRegisteredCompanies().find(c => String(c.id) === String(state.getActiveCompanyId()))?.name || '').toUpperCase()}
              </span>
              <span style="font-size: 0.75rem; color: #64748b; letter-spacing: 1px; margin-top: 4px; font-weight: 500;">PURCHASE RETURN VOUCHER</span>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <span style="font-weight: 600; font-size: 0.7rem; display: block; color: #64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Return Date</span>
              <input type="date" id="ret-pur-date" style="width: 100%; border: none; background: transparent; font-size: 1rem; color:#1e293b; font-weight:600; outline:none;" value="${editReturn ? editReturn.date : state.getLoginDate()}" required>
            </div>
          </div>

          <!-- Metadata card -->
          <div style="background-color:#ffffff; padding:20px; border:1px solid #e2e8f0; border-radius:12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px;">
            <div>
              <label style="font-weight:600; display:flex; align-items: center; gap: 6px; margin-bottom:6px; font-size:0.75rem; color:#475569;"><i class="fa-solid fa-building-user" style="color:#818cf8;"></i> Vendor *</label>
              <select id="ret-pur-supplier" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; transition: all 0.2s; outline:none;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'" required>
                <option value="">-- Choose Vendor --</option>
                ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:flex; align-items: center; gap: 6px; margin-bottom:6px; font-size:0.75rem; color:#475569;"><i class="fa-solid fa-file-invoice" style="color:#818cf8;"></i> Purchase Bill No *</label>
              <select id="ret-pur-billno-select" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; transition: all 0.2s; outline:none;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'" required disabled>
                <option value="">-- Choose Bill No --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:flex; align-items: center; gap: 6px; margin-bottom:6px; font-size:0.75rem; color:#475569;"><i class="fa-solid fa-code-branch" style="color:#818cf8;"></i> Branch Name</label>
              <select id="ret-pur-site" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; transition: all 0.2s; outline:none;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
                <option value="">-- Main Branch --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:flex; align-items: center; gap: 6px; margin-bottom:6px; font-size:0.75rem; color:#475569;"><i class="fa-solid fa-user-tag" style="color:#818cf8;"></i> Executive Name</label>
              <select id="ret-pur-salesman" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; transition: all 0.2s; outline:none;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
                <option value="">-- Choose Name --</option>
                ${salesExecutivesList.map(se => `<option value="${se}">${se}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:flex; align-items: center; gap: 6px; margin-bottom:6px; font-size:0.75rem; color:#475569;"><i class="fa-solid fa-map-pin" style="color:#818cf8;"></i> Place of Supply</label>
              <select id="ret-pur-state" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; transition: all 0.2s; outline:none;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
                <option value="KERALA" selected>KERALA</option>
                <option value="KARNATAKA">KARNATAKA</option>
                <option value="TAMIL NADU">TAMIL NADU</option>
                <option value="OUTSTATE">OUTSIDE STATE</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; display:flex; align-items: center; gap: 6px; margin-bottom:6px; font-size:0.75rem; color:#475569;"><i class="fa-solid fa-warehouse" style="color:#818cf8;"></i> Stock Location</label>
              <select id="ret-pur-location" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; transition: all 0.2s; outline:none;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
                <option value="Main" selected>&lt;Main&gt;</option>
              </select>
            </div>
          </div>

          <!-- Product Add Ribbon -->
          <div style="background-color:#ffffff; padding:16px; border:1px solid #e2e8f0; border-radius:12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display:grid; grid-template-columns: 2fr 1.5fr 1.2fr 0.8fr 0.8fr 1fr 1fr 100px; gap:12px; align-items:end; position: relative; overflow: visible;">
            <div>
              <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;">Product Name</label>
              <select id="ret-pur-ribbon-product" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; outline:none; transition: all 0.2s;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
                <option value="">-- Choose Product --</option>
                ${[...new Set(materials.map(m => m.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(name => `<option value="${name}">${name}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;">Code/Model</label>
              <select id="ret-pur-ribbon-code" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f1f5f9; font-size:0.875rem; color:#64748b; outline:none;" disabled>
                <option value="">-- Code/Model --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;">Batch</label>
              <select id="ret-pur-ribbon-batch" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f1f5f9; font-size:0.875rem; color:#64748b; outline:none;" disabled>
                <option value="">-- Batch --</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;">Qty</label>
              <input type="number" step="0.01" id="ret-pur-ribbon-qty" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; outline:none; transition: all 0.2s;" placeholder="0" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
            </div>
            <div>
              <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;">Unit</label>
              <select id="ret-pur-ribbon-unit" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; outline:none; transition: all 0.2s;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
                ${getUnitOptionsHTML()}
              </select>
            </div>
            <div>
              <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;">Rate [Excl]</label>
              <input type="number" step="0.01" id="ret-pur-ribbon-rate" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; outline:none; transition: all 0.2s;" placeholder="0.00" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
            </div>
            <div>
              <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;">M.R.P</label>
              <input type="number" step="0.01" id="ret-pur-ribbon-mrp" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; outline:none; transition: all 0.2s;" placeholder="0.00" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
            </div>
            <button type="button" id="btn-ret-pur-ribbon-add" style="width:100%; padding:8px; border-radius:6px; font-size:0.875rem; font-weight:600; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); border:none; color:white; cursor:pointer; height: 38px; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3), 0 2px 4px -1px rgba(79, 70, 229, 0.06);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 15px -3px rgba(79, 70, 229, 0.4), 0 4px 6px -2px rgba(79, 70, 229, 0.05)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(79, 70, 229, 0.3), 0 2px 4px -1px rgba(79, 70, 229, 0.06)'">
              <i class="fa-solid fa-plus" style="margin-right:4px;"></i> Add
            </button>
            
            <!-- Stock feedback label floating -->
            <div style="position: absolute; top: -14px; right: 16px; background-color:#eff6ff; border:1px solid #bfdbfe; padding:4px 10px; font-weight:600; font-size:0.7rem; color:#1e40af; border-radius:12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" id="ret-pur-stock-feedback">
              <i class="fa-solid fa-box" style="margin-right:4px;"></i> Available Stock : <span id="lbl-ret-pur-availstock" style="font-weight: 800;">0.00</span>
            </div>
          </div>

          <!-- Main Grid -->
          <div style="border: 1px solid #e2e8f0; background-color: #ffffff; min-height:200px; max-height:250px; overflow-y:auto; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.875rem;">
              <thead style="position:sticky; top:0; z-index:10; background-color:#f8fafc; box-shadow: 0 1px 0 #e2e8f0;">
                <tr>
                  <th style="padding:12px 16px; font-weight:600; color:#475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px;">Product Name</th>
                  <th style="padding:12px 16px; font-weight:600; color:#475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px;">Code/Model</th>
                  <th style="padding:12px 16px; font-weight:600; color:#475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px;">Batch</th>
                  <th style="padding:12px 16px; font-weight:600; color:#475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; text-align:right;">Qty</th>
                  <th style="padding:12px 16px; font-weight:600; color:#475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; text-align:right;">Rate</th>
                  <th style="padding:12px 16px; font-weight:600; color:#475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; text-align:right;">Amount</th>
                  <th style="padding:12px 16px; font-weight:600; color:#475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; text-align:right;">GST%</th>
                  <th style="padding:12px 16px; font-weight:600; color:#475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; text-align:right;">GST AMT</th>
                  <th style="padding:12px 16px; font-weight:600; color:#4f46e5; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; text-align:right;">Net Amount</th>
                  <th style="padding:12px 16px; text-align:center; width:60px;"></th>
                </tr>
              </thead>
              <tbody id="ret-pur-grid-body" style="color: #1e293b;">
                <!-- Grid Rows -->
              </tbody>
            </table>
          </div>

          <!-- Bottom calculations and splits -->
          <div style="display:grid; grid-template-columns: 1fr 1.5fr 1fr; gap:24px; background-color:#ffffff; padding:20px; border:1px solid #e2e8f0; border-radius:12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); align-items: stretch;">
            <!-- Bottom Left Fields -->
            <div style="display:flex; flex-direction:column; gap:16px;">
              <div>
                <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;"><i class="fa-solid fa-wallet" style="color:#64748b; margin-right:4px;"></i> Pay Mode</label>
                <select id="ret-pur-paymode" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; outline:none; transition: all 0.2s;" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
                  <option value="Credit" selected>Credit</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
              <div>
                <label style="font-weight:600; font-size:0.75rem; color:#475569; display:block; margin-bottom:6px;"><i class="fa-regular fa-comment" style="color:#64748b; margin-right:4px;"></i> Narration / Remarks</label>
                <input type="text" id="ret-pur-narration" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background-color:#f8fafc; font-size:0.875rem; color:#0f172a; outline:none; transition: all 0.2s;" placeholder="Reason for return..." onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
              </div>
            </div>

            <!-- Tax splits as modern widgets -->
            <div style="display:flex; flex-direction:column; align-items:center; justify-content: center;">
              <span style="font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom: 12px;">Tax Breakdown</span>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                  <span style="font-weight:700; font-size:0.7rem; text-align:center; background:#f1f5f9; color:#475569; padding:6px; border-bottom: 1px solid #e2e8f0;">CGST</span>
                  <input type="text" id="ret-pur-tax-cgst" readonly style="width:100%; border:none; background:transparent; text-align:center; padding:10px; font-size:0.9rem; font-weight:700; color:#1e293b; outline: none;" value="0.00">
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                  <span style="font-weight:700; font-size:0.7rem; text-align:center; background:#f1f5f9; color:#475569; padding:6px; border-bottom: 1px solid #e2e8f0;">SGST</span>
                  <input type="text" id="ret-pur-tax-sgst" readonly style="width:100%; border:none; background:transparent; text-align:center; padding:10px; font-size:0.9rem; font-weight:700; color:#1e293b; outline: none;" value="0.00">
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                  <span style="font-weight:700; font-size:0.7rem; text-align:center; background:#f1f5f9; color:#475569; padding:6px; border-bottom: 1px solid #e2e8f0;">IGST</span>
                  <input type="text" id="ret-pur-tax-igst" readonly style="width:100%; border:none; background:transparent; text-align:center; padding:10px; font-size:0.9rem; font-weight:700; color:#1e293b; outline: none;" value="0.00">
                </div>
                <!-- Hidden CESS -->
                <input type="text" id="ret-pur-tax-cess" style="display:none;" value="0.00">
              </div>
            </div>

            <!-- Bottom Right totals block -->
            <div style="display:flex; flex-direction:column; gap:10px; font-size:0.875rem; justify-content:flex-end;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#64748b; font-weight: 500;">Adjustments</span>
                <input type="number" step="0.01" id="ret-pur-adjustments" style="width:130px; background-color:#f1f5f9; color:#475569; text-align:right; padding:6px 10px; border-radius:6px; border:1px solid #cbd5e1; outline: none;" value="0.00" readonly>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#64748b; font-weight: 500;">Round Off</span>
                <input type="number" step="0.01" id="ret-pur-roundoff" style="width:130px; background-color:#f8fafc; color:#0f172a; text-align:right; padding:6px 10px; border-radius:6px; border:1px solid #cbd5e1; outline: none; transition: all 0.2s;" value="0.00" onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 0 3px rgba(129, 140, 248, 0.2)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='none'">
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding-top:12px; border-top:1px dashed #cbd5e1;">
                <span style="font-size: 1rem; color: #4338ca; font-weight:800; text-transform: uppercase;">Net Amount</span>
                <input type="text" id="lbl-ret-pur-nettotal" readonly style="width:160px; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); color:#312e81; font-weight:900; text-align:right; padding:8px 12px; border:1px solid #a5b4fc; font-size:1.4rem; border-radius:8px; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5);" value="0.00">
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 4px;">
            <div style="display:flex; gap:12px;">
              <button type="button" id="btn-ret-pur-remove-kfc" style="background:#ffffff; border:1px solid #cbd5e1; padding:8px 16px; font-size: 0.875rem; font-weight:600; color:#64748b; border-radius:8px; cursor:pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.background='#ffffff'; this.style.color='#64748b';">Remove KFC</button>
              <button type="button" id="btn-ret-pur-print" style="background:#ffffff; border:1px solid #cbd5e1; padding:8px 16px; font-size: 0.875rem; font-weight:600; color:#64748b; border-radius:8px; cursor:pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.background='#ffffff'; this.style.color='#64748b';"><i class="fa-solid fa-print" style="margin-right: 6px;"></i> Print</button>
            </div>
            
            <div style="display:flex; gap:12px;">
              <div style="display:flex; gap: 4px; margin-right: 8px;">
                <button type="button" id="btn-ret-pur-prev" style="background:#ffffff; border:1px solid #cbd5e1; width:38px; height:38px; color:#64748b; border-radius:8px; cursor:pointer; font-weight:bold; transition: all 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.background='#ffffff'; this.style.color='#64748b';"><i class="fa-solid fa-chevron-left"></i></button>
                <button type="button" id="btn-ret-pur-next" style="background:#ffffff; border:1px solid #cbd5e1; width:38px; height:38px; color:#64748b; border-radius:8px; cursor:pointer; font-weight:bold; transition: all 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.background='#ffffff'; this.style.color='#64748b';"><i class="fa-solid fa-chevron-right"></i></button>
              </div>
              
              <button type="button" id="btn-ret-pur-search" style="background:#ffffff; border:1px solid #cbd5e1; padding:8px 16px; font-size: 0.875rem; font-weight:600; color:#64748b; border-radius:8px; cursor:pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.background='#ffffff'; this.style.color='#64748b';">Search</button>
              <button type="button" id="btn-ret-pur-salesearch" style="background:#ffffff; border:1px solid #cbd5e1; padding:8px 16px; font-size: 0.875rem; font-weight:600; color:#64748b; border-radius:8px; cursor:pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.background='#ffffff'; this.style.color='#64748b';">Sale Search</button>
              <button type="button" id="btn-ret-pur-new" style="background:#ffffff; border:1px solid #cbd5e1; padding:8px 20px; font-size: 0.875rem; font-weight:600; color:#64748b; border-radius:8px; cursor:pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.background='#ffffff'; this.style.color='#64748b';">New</button>
              <button type="button" id="btn-ret-pur-cancel" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:8px 20px; font-size: 0.875rem; font-weight:600; color:#64748b; border-radius:8px; cursor:pointer; transition: all 0.2s;" onmouseover="this.style.background='#e2e8f0';" onmouseout="this.style.background='#f1f5f9';">Cancel</button>
              
              <button type="submit" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border:none; padding:8px 28px; font-size: 0.875rem; font-weight:700; color:white; border-radius:8px; cursor:pointer; transition:all 0.2s; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3), 0 2px 4px -1px rgba(16, 185, 129, 0.06);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 15px -3px rgba(16, 185, 129, 0.4), 0 4px 6px -2px rgba(16, 185, 129, 0.05)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(16, 185, 129, 0.3), 0 2px 4px -1px rgba(16, 185, 129, 0.06)'">
                <i class="fa-solid fa-check" style="margin-right: 6px;"></i> Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = document.getElementById("modal-overlay-tx");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };

  document.getElementById("pm-close-btn-header").addEventListener("click", close);
  document.getElementById("btn-ret-pur-cancel").addEventListener("click", close);
  document.getElementById("btn-ret-pur-new").addEventListener("click", () => {
    showPurchaseReturnModal(container, null, onSuccess);
  });
  document.getElementById("btn-ret-pur-search").addEventListener("click", () => {
    close();
    setTransactionsActiveTab("purchase-return");
    window.location.hash = "#transactions";
  });
  document.getElementById("btn-ret-pur-salesearch").addEventListener("click", () => {
    close();
    setTransactionsActiveTab("purchase");
    window.location.hash = "#transactions";
  });
  document.getElementById("btn-ret-pur-print").addEventListener("click", () => {
    window.print();
  });
  document.getElementById("btn-ret-pur-remove-kfc").addEventListener("click", () => {
    alert("KFC Removed successfully.");
  });

  // Bind Previous and Next buttons
  const allPurReturns = state.getPurchaseReturns();
  const curPurIdx = editReturn ? allPurReturns.findIndex(ret => ret.id === editReturn.id) : -1;

  document.getElementById("btn-ret-pur-prev").addEventListener("click", () => {
    if (curPurIdx > 0) {
      close();
      showPurchaseReturnModal(container, allPurReturns[curPurIdx - 1], onSuccess);
    } else if (curPurIdx === -1 && allPurReturns.length > 0) {
      close();
      showPurchaseReturnModal(container, allPurReturns[allPurReturns.length - 1], onSuccess);
    }
  });

  document.getElementById("btn-ret-pur-next").addEventListener("click", () => {
    if (editReturn && curPurIdx !== -1 && curPurIdx < allPurReturns.length - 1) {
      close();
      showPurchaseReturnModal(container, allPurReturns[curPurIdx + 1], onSuccess);
    }
  });

  const productSelect = document.getElementById("ret-pur-ribbon-product");
  const codeSelect = document.getElementById("ret-pur-ribbon-code");
  const qtyInput = document.getElementById("ret-pur-ribbon-qty");
  const unitSelect = document.getElementById("ret-pur-ribbon-unit");
  const rateInput = document.getElementById("ret-pur-ribbon-rate");
  const mrpInput = document.getElementById("ret-pur-ribbon-mrp");
  const addRowBtn = document.getElementById("btn-ret-pur-ribbon-add");
  const availStockSpan = document.getElementById("lbl-ret-pur-availstock");

  let gridItems = editReturn ? editReturn.items.map(item => {
    const mat = materials.find(m => m.id === item.materialId || m.name === item.name);
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.price) || 0;
    const amount = qty * rate;
    const gstPercent = mat ? ((mat.igst !== undefined && mat.igst !== null && mat.igst !== "") ? parseFloat(mat.igst) : 18) : 18;
    const gstAmount = amount * (gstPercent / 100);
    return {
      materialId: item.materialId,
      name: item.name || (mat ? mat.name : ""),
      code: mat ? mat.code : "",
      quantity: qty,
      unit: item.unit || (mat ? mat.unit : "Bags"),
      price: rate,
      mrp: item.mrp || (mat ? mat.mrp : rate * 1.25),
      batchNo: item.batchNo || "",
      amount: amount,
      gstPercent: gstPercent,
      gstAmount: gstAmount,
      netAmount: amount + gstAmount
    };
  }) : [];

  const supplierSelect = document.getElementById("ret-pur-supplier");
  const branchSelect = document.getElementById("ret-pur-site");
  const billnoSelect = document.getElementById("ret-pur-billno-select");
  const ribbonRetPurBatchSelect = document.getElementById("ret-pur-ribbon-batch");
  let adjustmentsList = editReturn ? (editReturn.adjustmentsList || []) : [];

  const populateBranches = (contactId, selectedBranch = null) => {
    const supp = suppliers.find(s => s.id === contactId);
    if (supp && supp.sites && supp.sites.length > 0) {
      branchSelect.innerHTML = '<option value="">-- Main Branch --</option>' +
        supp.sites.map(site => `<option value="${site}" ${selectedBranch === site ? 'selected' : ''}>${site}</option>`).join("");
      branchSelect.disabled = false;
    } else {
      branchSelect.innerHTML = '<option value="">-- Main Branch --</option>';
      branchSelect.disabled = true;
    }
  };

  const populateVendorBills = (vendorId, selectedBill = null) => {
    if (!vendorId) {
      billnoSelect.innerHTML = '<option value="">-- Choose BillNo --</option>';
      billnoSelect.disabled = true;
      productSelect.innerHTML = '<option value="">-- Choose Product Name --</option>';
      productSelect.disabled = true;
      return;
    }
    const vendorPurchases = state.getPurchases().filter(pur => pur.contactId === vendorId);
    billnoSelect.innerHTML = '<option value="">-- Choose BillNo --</option>' +
      vendorPurchases.map(pur => `<option value="${pur.invoiceNo}" ${selectedBill === pur.invoiceNo ? 'selected' : ''}>${pur.invoiceNo}</option>`).join("");
    billnoSelect.disabled = false;
  };

  supplierSelect.addEventListener("change", () => {
    populateBranches(supplierSelect.value);
    populateVendorBills(supplierSelect.value);
  });

  billnoSelect.addEventListener("change", () => {
    const billNo = billnoSelect.value;
    if (billNo) {
      const purchase = state.getPurchases().find(pur => String(pur.invoiceNo) === String(billNo));
      if (purchase) {
        populateBranches(purchase.contactId, purchase.siteName);
        document.getElementById("ret-pur-state").value = purchase.state || "KERALA";
        if (purchase.salesmanName) {
          document.getElementById("ret-pur-salesman").value = purchase.salesmanName;
        }
        const purchaseItems = purchase.items || [];
        const uniqueProductNames = [...new Set(purchaseItems.map(item => item.name || item.materialName))];
        productSelect.innerHTML = '<option value="">-- Choose Product Name --</option>' +
          uniqueProductNames.map(name => `<option value="${name}">${name}</option>`).join("");
        productSelect.disabled = false;
      }
    } else {
      productSelect.innerHTML = '<option value="">-- Choose Product Name --</option>';
      productSelect.disabled = true;
    }
    codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
    codeSelect.disabled = true;
    ribbonRetPurBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
    ribbonRetPurBatchSelect.disabled = true;
    qtyInput.value = "";
    rateInput.value = "";
    mrpInput.value = "";
    availStockSpan.innerText = "0.00";
  });

  if (editReturn) {
    supplierSelect.value = editReturn.contactId;
    supplierSelect.disabled = true;
    populateBranches(editReturn.contactId, editReturn.siteName);

    let originalBillNo = editReturn.billNo || "";
    if (!originalBillNo && editReturn.contactId) {
      const vendorPurchases = state.getPurchases().filter(pur => pur.contactId === editReturn.contactId);
      for (const pur of vendorPurchases) {
        const purchaseItemIds = (pur.items || []).map(item => item.materialId);
        const allReturnItemsMatch = editReturn.items.every(retItem => purchaseItemIds.includes(retItem.materialId));
        if (allReturnItemsMatch) {
          originalBillNo = pur.invoiceNo;
          break;
        }
      }
    }

    populateVendorBills(editReturn.contactId, originalBillNo);
    billnoSelect.value = originalBillNo;
    billnoSelect.disabled = true;
    
    // Trigger products load for selected bill
    const purchase = state.getPurchases().find(pur => String(pur.invoiceNo) === String(originalBillNo));
    if (purchase) {
      const purchaseItems = purchase.items || [];
      const uniqueProductNames = [...new Set(purchaseItems.map(item => item.name || item.materialName))];
      productSelect.innerHTML = '<option value="">-- Choose Product Name --</option>' +
        uniqueProductNames.map(name => `<option value="${name}">${name}</option>`).join("");
      productSelect.disabled = false;
    }

    document.getElementById("ret-pur-narration").value = editReturn.narration || "";
    document.getElementById("ret-pur-paymode").value = editReturn.payMode || "Credit";
    document.getElementById("ret-pur-roundoff").value = editReturn.roundOff || "0.00";
  }

  // When product changes
  productSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    const billNo = billnoSelect.value;
    if (pName && billNo) {
      const purchase = state.getPurchases().find(pur => String(pur.invoiceNo) === String(billNo));
      const purchaseItems = purchase ? (purchase.items || []) : [];
      const matchingItems = purchaseItems
        .filter(item => (item.name || item.materialName) === pName)
        .sort((a, b) => {
          const matA = materials.find(m => m.id === a.materialId);
          const matB = materials.find(m => m.id === b.materialId);
          const codeA = matA ? matA.code : (a.code || "");
          const codeB = matB ? matB.code : (b.code || "");
          return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });

      codeSelect.innerHTML = '<option value="">-- Code/Model --</option>' + 
        matchingItems.map(item => {
          const mat = materials.find(m => m.id === item.materialId);
          const code = mat ? mat.code : (item.code || "");
          return `<option value="${code}" data-item-id="${item.materialId}">${code}</option>`;
        }).join("");
      codeSelect.disabled = false;
      availStockSpan.innerText = "0.00";
    } else {
      codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
      codeSelect.disabled = true;
      ribbonRetPurBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
      ribbonRetPurBatchSelect.disabled = true;
      availStockSpan.innerText = "0.00";
    }
  });

  // When code changes
  codeSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    const pCode = codeSelect.value;
    const billNo = billnoSelect.value;
    if (pName && pCode && billNo) {
      const purchase = state.getPurchases().find(pur => String(pur.invoiceNo) === String(billNo));
      const selectedOption = codeSelect.options[codeSelect.selectedIndex];
      const matId = selectedOption.getAttribute("data-item-id");
      const invoiceItem = purchase ? purchase.items.find(item => item.materialId === matId) : null;

      if (invoiceItem) {
        const mat = materials.find(m => m.id === matId);
        rateInput.value = invoiceItem.price ? parseFloat(invoiceItem.price).toFixed(2) : "";
        mrpInput.value = invoiceItem.mrp ? parseFloat(invoiceItem.mrp).toFixed(2) : (parseFloat(invoiceItem.price) * 1.25).toFixed(2);
        qtyInput.value = invoiceItem.quantity || "";
        updateRibbonUnitSelect(unitSelect, invoiceItem.unit || (mat ? mat.unit : "Bags"));

        const bNo = invoiceItem.batchNo || String(invoiceItem.price);
        ribbonRetPurBatchSelect.innerHTML = `<option value="${bNo}">${bNo}</option>`;
        ribbonRetPurBatchSelect.value = bNo;
        ribbonRetPurBatchSelect.disabled = false;

        const batchObj = mat ? mat.batches.find(b => b.batchNo === bNo) : null;
        availStockSpan.innerText = batchObj ? (batchObj.stock || 0).toFixed(2) : "0.00";
      }
    } else {
      ribbonRetPurBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
      ribbonRetPurBatchSelect.disabled = true;
      qtyInput.value = "";
      rateInput.value = "";
      mrpInput.value = "";
      availStockSpan.innerText = "0.00";
    }
  });

  document.getElementById("create-purchase-return-form").addEventListener("keydown", (e) => {
    if (e.key === "Insert") {
      e.preventDefault();
      let subtotal = 0;
      let totalGst = 0;
      gridItems.forEach(item => {
        subtotal += item.amount;
        totalGst += item.gstAmount;
      });
      const cess = 0;
      const roundOff = parseFloat(document.getElementById("ret-pur-roundoff").value) || 0;
      const initialBillAmount = subtotal + totalGst + cess + roundOff;

      showAdjustmentsModal("purchase", initialBillAmount, adjustmentsList, (savedList) => {
        adjustmentsList = savedList;
        renderGridAndRecalc();
      });
    }
  });

  function renderGridAndRecalc() {
    const tbody = document.getElementById("ret-pur-grid-body");
    tbody.innerHTML = gridItems.map((item, idx) => `
      <tr style="border-bottom:1px solid #cbd5e1;">
        <td style="padding:6px;"><strong>${item.name}</strong></td>
        <td style="padding:6px;">${item.code}</td>
        <td style="padding:6px; font-weight:bold; color:#1e3b8b;">${item.batchNo || ''}</td>
        <td style="padding:6px; text-align:right;">${item.quantity.toFixed(2)}</td>
        <td style="padding:6px; text-align:right;">\u20B9${item.price.toFixed(2)}</td>
        <td style="padding:6px; text-align:right;">\u20B9${item.amount.toFixed(2)}</td>
        <td style="padding:6px; text-align:right;">${item.gstPercent}%</td>
        <td style="padding:6px; text-align:right;">\u20B9${item.gstAmount.toFixed(2)}</td>
        <td style="padding:6px; text-align:right; font-weight:600; color:#1e40af;">\u20B9${item.netAmount.toFixed(2)}</td>
        <td style="padding:6px; text-align:center;">
          <button type="button" class="btn btn-danger btn-icon btn-remove-grid-row" data-index="${idx}" style="padding: 2px 6px;"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-remove-grid-row").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        gridItems.splice(idx, 1);
        renderGridAndRecalc();
      });
    });

    // Totals calculations
    let subtotal = 0;
    let totalGst = 0;
    gridItems.forEach(item => {
      subtotal += item.amount;
      totalGst += item.gstAmount;
    });

    const isKerala = document.getElementById("ret-pur-state").value === "KERALA";
    let cgst = 0, sgst = 0, igst = 0;
    if (isKerala) {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    } else {
      igst = totalGst;
    }

    const cess = 0;
    const roundOff = parseFloat(document.getElementById("ret-pur-roundoff").value) || 0;
    let adjTotal = 0;
    adjustmentsList.forEach(a => {
      const amt = parseFloat(a.amount) || 0;
      if (a.type === "Add") {
        adjTotal += amt;
      } else {
        adjTotal -= amt;
      }
    });
    const netTotal = subtotal + totalGst + cess + roundOff + adjTotal;

    document.getElementById("ret-pur-tax-cgst").value = cgst.toFixed(2);
    document.getElementById("ret-pur-tax-sgst").value = sgst.toFixed(2);
    document.getElementById("ret-pur-tax-igst").value = igst.toFixed(2);
    document.getElementById("ret-pur-tax-cess").value = cess.toFixed(2);
    document.getElementById("ret-pur-adjustments").value = adjTotal.toFixed(2);
    document.getElementById("lbl-ret-pur-nettotal").value = netTotal.toFixed(2);
  }

  document.getElementById("ret-pur-state").addEventListener("change", renderGridAndRecalc);
  document.getElementById("ret-pur-roundoff").addEventListener("input", renderGridAndRecalc);

  // Add item from ribbon
  addRowBtn.addEventListener("click", () => {
    const pName = productSelect.value;
    const pCode = codeSelect.value;
    const qty = parseFloat(qtyInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const mrp = parseFloat(mrpInput.value) || 0;
    const unit = unitSelect.value;
    const selectedBatchNo = ribbonRetPurBatchSelect.value;

    if (!pName || !pCode || qty <= 0 || rate <= 0) {
      alert("Please choose product name, code/model, and enter valid Qty/Rate.");
      return;
    }

    if (!selectedBatchNo) {
      alert("Please choose a batch first.");
      return;
    }

    const mat = materials.find(m => m.name === pName && m.code === pCode);
    if (!mat) return;

    // Optional stock warning
    const matchedBatch = mat.batches.find(b => b.batchNo === selectedBatchNo);
    const batchLimit = matchedBatch ? matchedBatch.stock : 0;
    if (qty > batchLimit) {
      alert(`Warning: Returning more than current batch stock level (${batchLimit} available).`);
    }

    const amount = qty * rate;
    const gstPercent = (mat.igst !== undefined && mat.igst !== null && mat.igst !== "") ? parseFloat(mat.igst) : 18;
    const gstAmount = amount * (gstPercent / 100);
    const netAmount = amount + gstAmount;

    gridItems.push({
      materialId: mat.id,
      name: mat.name,
      code: mat.code,
      batchNo: selectedBatchNo,
      quantity: qty,
      unit: unit,
      price: rate,
      mrp: mrp,
      amount: amount,
      gstPercent: gstPercent,
      gstAmount: gstAmount,
      netAmount: netAmount
    });

    // Reset ribbon fields
    productSelect.value = "";
    codeSelect.innerHTML = '<option value="">-- Code/Model --</option>';
    codeSelect.disabled = true;
    ribbonRetPurBatchSelect.innerHTML = '<option value="">-- Batch --</option>';
    ribbonRetPurBatchSelect.disabled = true;
    qtyInput.value = "";
    rateInput.value = "";
    mrpInput.value = "";
    availStockSpan.innerText = "0.00";

    renderGridAndRecalc();
  });



  // Submit Purchase Return
  document.getElementById("create-purchase-return-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (gridItems.length === 0) {
      alert("Please add at least one product to the return grid.");
      return;
    }

    const items = gridItems.map(item => ({
      materialId: item.materialId,
      batchNo: item.batchNo,
      quantity: item.quantity,
      price: item.price,
      gstPercent: item.gstPercent  // required for correct CGST/SGST/IGST ledger posting
    }));

    if (editReturn) {
      const pass = prompt("Enter Admin Password to update this Purchase Return:");
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password!");
        return;
      }
      state.deletePurchaseReturn(editReturn.id);
    }

    const success = state.createPurchaseReturn({
      id: editReturn ? editReturn.id : undefined,
      contactId: supplierSelect.value,
      billNo: billnoSelect.value,
      date: document.getElementById("ret-pur-date").value,
      state: document.getElementById("ret-pur-state").value,
      taxRate: 18,
      siteName: branchSelect.value,
      items: items,
      adjustmentsList: adjustmentsList,
      roundOff: parseFloat(document.getElementById("ret-pur-roundoff").value) || 0
    });

    if (success) {
      alert("Purchase Return successfully saved");
      close();
      if (onSuccess) onSuccess();
      if (!editReturn) {
        showPurchaseReturnModal(container, null, onSuccess);
      } else {
        const tc = document.getElementById("transactions-content");
        if (tc) {
          renderPurchaseReturnSubTab(tc);
        } else {
          renderPurchaseReturnSubTab(container);
        }
      }
    } else {
      alert("Error: Failed to save Purchase Return. Please verify that you have sufficient stock for all returned items.");
    }
  });

  renderGridAndRecalc();
}

// Localized Stock Adjust Form (Wizards)
// Localized Stock Adjust Form (Wizards)
export function showStockAdjustWizard(container, searchRef = null) {
  const materials = state.getMaterials();
  const root = document.getElementById("modal-container-root");
  
  const invoices = state.getInvoices() || [];
  const employees = Array.from(new Set(invoices.map(i => i.employee).filter(Boolean)));
  if (!employees.includes("ADMIN")) employees.unshift("ADMIN");

  const activeCompany = state.getRegisteredCompanies().find(c => c.id === state.getActiveCompanyId()) || { name: "" };
  const companyName = (activeCompany.name || "").toUpperCase();

  const stockAdjustments = state.getStockAdjustments();
  let currentIndex = -1; // -1 means NEW mode
  let tempItems = [];

  function loadAdjustment(adj) {
    if (!adj) return;
    tempItems = JSON.parse(JSON.stringify(adj.items || []));
    
    document.getElementById("adj-ref-no").innerText = adj.refNo;
    document.getElementById("adj-date").value = adj.date;
    document.getElementById("adj-desc").value = adj.description || "";
    
    const empSelect = document.getElementById("adj-employee");
    const empText = document.getElementById("adj-employee-text");
    if (employees.includes(adj.employee)) {
      empSelect.value = adj.employee;
      empSelect.style.display = "block";
      empText.style.display = "none";
    } else {
      empSelect.value = "NEW_EMPLOYEE";
      empSelect.style.display = "none";
      empText.value = adj.employee || "";
      empText.style.display = "block";
    }
    
    document.getElementById("adj-depot").value = adj.depot || "Main";
    renderGrid();
  }

  function switchToNewMode() {
    currentIndex = -1;
    tempItems = [];
    const nextRef = state.generateNextVoucherNo("stock-adjust");
    document.getElementById("adj-ref-no").innerText = nextRef;
    document.getElementById("adj-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("adj-desc").value = "";
    document.getElementById("adj-employee").value = employees[0] || "ADMIN";
    document.getElementById("adj-employee").style.display = "block";
    document.getElementById("adj-employee-text").style.display = "none";
    document.getElementById("adj-employee-text").value = "";
    document.getElementById("adj-depot").value = "Main";
    renderGrid();
  }

  function getActiveEmployeeName() {
    const empSelect = document.getElementById("adj-employee");
    if (empSelect.value === "NEW_EMPLOYEE") {
      return document.getElementById("adj-employee-text").value.trim();
    }
    return empSelect.value;
  }

  function renderGrid() {
    const tbody = document.getElementById("grid-tbody");
    if (!tbody) return;

    if (tempItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">No items added to adjustment.</td></tr>`;
      document.getElementById("adj-total").value = "0.00";
      return;
    }

    let totalAmt = 0;
    tbody.innerHTML = tempItems.map((item, idx) => {
      totalAmt += item.amount;
      const affectColor = item.stockAffect === "Add (+)" ? "text-success" : "text-danger";
      return `
        <tr>
          <td style="padding: 5px; font-size: 0.8rem;">${item.name}</td>
          <td style="padding: 5px; font-size: 0.8rem;">${item.code}</td>
          <td style="padding: 5px; font-size: 0.8rem; font-weight: bold; color: #1e3b8b;">${item.batchNo || ""}</td>
          <td style="padding: 5px; font-size: 0.8rem; text-align: right;">${item.qty} ${item.unit}</td>
          <td style="padding: 5px; font-size: 0.8rem; text-align: right;">\u20B9${item.rate.toFixed(2)}</td>
          <td style="padding: 5px; font-size: 0.8rem; text-align: right; font-weight: bold;">\u20B9${item.amount.toFixed(2)}</td>
          <td style="padding: 5px; font-size: 0.8rem;"><span class="${affectColor}" style="font-weight:bold;">${item.type} (${item.stockAffect === 'Add (+)' ? '+' : '-'})</span></td>
          <td style="padding: 5px; font-size: 0.8rem; white-space: normal; max-width: 150px;">${item.comments || ""}</td>
          <td style="padding: 5px; text-align: center;">
            <button type="button" class="btn-grid-delete" data-index="${idx}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.9rem;"><i class="fa-solid fa-trash-can"></i></button>
          </td>
        </tr>
      `;
    }).join("");

    document.getElementById("adj-total").value = totalAmt.toFixed(2);

    // Bind delete grid row
    tbody.querySelectorAll(".btn-grid-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        tempItems.splice(idx, 1);
        renderGrid();
      });
    });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-tx">
      <div class="modal-container" style="max-width: 1050px; width: 97%; max-height: 95vh; overflow-y: auto; background-color: #cbd5e1; color: #0f172a; padding: 12px; border: 3px solid #1e3b8b; font-family: var(--font-body); border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        
        <!-- Title bar -->
        <div class="modal-header" style="background: linear-gradient(90deg, #1e3b8b, #4f46e5); color: white; padding: 6px 12px; border-radius: var(--border-radius-sm) var(--border-radius-sm) 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3b8b;">
          <span style="font-weight: bold; font-size: 0.9rem; letter-spacing: 0.5px;">STOCK ADJUSTMENT</span>
          <button class="btn btn-secondary btn-icon" id="btn-close-modal" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
        </div>

        <!-- Window body -->
        <div style="background-color: #b4cbe6; padding: 10px; border: 1px solid #94a3b8; display: flex; flex-direction: column; gap: 8px;">
          
          <!-- Top header row: Ref, Company Name, Date -->
          <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
            <!-- REF NO -->
            <div style="display: flex; flex-direction: column; border: 1px solid #1e3b8b; border-radius: 3px; overflow: hidden; min-width: 90px; text-align: center; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background-color: #1e3b8b; color: white; font-size: 0.75rem; font-weight: bold; padding: 2px 4px; letter-spacing: 0.5px;">REF.NO</div>
              <div id="adj-ref-no" style="font-size: 1.1rem; font-weight: bold; padding: 4px; color: #1e3b8b;">1</div>
            </div>

            <!-- Company Name Header -->
            <div style="flex-grow: 1; border: 1px solid #1e3b8b; background-color: white; padding: 6px; text-align: center; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 id="company-title" style="margin: 0; font-size: 1.3rem; font-weight: bold; color: #1e3b8b; letter-spacing: 1.5px;">${companyName}</h2>
            </div>

            <!-- Date Picker -->
            <div style="display: flex; flex-direction: column; border: 1px solid #1e3b8b; border-radius: 3px; overflow: hidden; min-width: 130px; text-align: center; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background-color: #1e3b8b; color: white; font-size: 0.75rem; font-weight: bold; padding: 2px 4px; letter-spacing: 0.5px;">Date</div>
              <input type="date" id="adj-date" style="border: none; outline: none; padding: 4px; text-align: center; font-weight: bold; color: #1e3b8b; width: 100%; font-size: 0.85rem;" value="${todayStr}">
            </div>
          </div>

          <!-- Second Section: Employee, Depot, Description -->
          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; background: #c5d7ed; padding: 10px; border-radius: 4px; border: 1px solid #a5c3e5;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Employee -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <label style="font-weight: bold; min-width: 70px; font-size: 0.8rem; color: #1e3b8b; text-align: right;">Employee</label>
                <select id="adj-employee" class="form-control" style="background-color: white; color: black; height: 28px; padding: 2px 5px; flex-grow: 1; font-size: 0.8rem; border: 1px solid #a5c3e5;">
                  ${employees.map(e => `<option value="${e}">${e}</option>`).join("")}
                  <option value="NEW_EMPLOYEE">+ Add New Employee</option>
                </select>
                <input type="text" id="adj-employee-text" class="form-control" style="display: none; background-color: white; color: black; height: 28px; padding: 2px 5px; flex-grow: 1; font-size: 0.8rem; border: 1px solid #a5c3e5;" placeholder="Enter Employee Name">
              </div>
              <!-- Depot -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <label style="font-weight: bold; min-width: 70px; font-size: 0.8rem; color: #1e3b8b; text-align: right;">Depot</label>
                <select id="adj-depot" class="form-control" style="background-color: white; color: black; height: 28px; padding: 2px 5px; flex-grow: 1; font-size: 0.8rem; border: 1px solid #a5c3e5;">
                  <option value="Main">&lt;Main&gt;</option>
                  <option value="Branch">Branch Office</option>
                  <option value="Warehouse">Warehouse 1</option>
                </select>
              </div>
            </div>

            <!-- Description / Narration -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: bold; font-size: 0.8rem; color: #1e3b8b; margin-bottom: 2px;">Description</label>
              <textarea id="adj-desc" style="flex-grow: 1; min-height: 58px; resize: none; border: 1px solid #a5c3e5; padding: 5px; font-size: 0.8rem; border-radius: 3px; font-family: inherit;" placeholder="Reason or description..."></textarea>
            </div>
          </div>

          <!-- Third Section: Product Entry Ribbon (2-Row Design to Prevent Horizontal Overflow) -->
          <div style="background: #dbebfa; padding: 8px; border-radius: 4px; border: 1px solid #b4cbe6; display: flex; flex-direction: column; gap: 8px;">
            <!-- Row 1: Product Selection -->
            <div style="display: grid; grid-template-columns: 2fr 1.2fr 1.2fr 0.8fr; gap: 8px; align-items: center;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b;">Product Name</label>
                <select id="ribbon-product" class="form-control" style="height: 28px; padding: 2px 5px; font-size: 0.8rem; background-color: white; color: black; border: 1px solid #b4cbe6; width: 100%;">
                  <option value="">-- Select Product --</option>
                  ${materials.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}
                </select>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b;">Code/Model/Size</label>
                <input type="text" id="ribbon-code" class="form-control" style="height: 28px; padding: 2px 5px; font-size: 0.8rem; background-color: #e2e8f0; color: black; border: 1px solid #b4cbe6; width: 100%;" readonly>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b;">Batch No</label>
                <select id="ribbon-batch" class="form-control" style="height: 28px; padding: 2px 5px; font-size: 0.8rem; background-color: white; color: black; border: 1px solid #b4cbe6; width: 100%;">
                  <option value="">-- Batch --</option>
                </select>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b;">Unit</label>
                <input type="text" id="ribbon-unit" class="form-control" style="height: 28px; padding: 2px 5px; font-size: 0.8rem; background-color: #e2e8f0; color: black; border: 1px solid #b4cbe6; width: 100%;" readonly>
              </div>
            </div>

            <!-- Row 2: Adjustment Details & Add Button -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr 1.2fr 90px; gap: 8px; align-items: center; border-top: 1px dashed #b4cbe6; padding-top: 8px;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b;">Qty</label>
                <input type="number" step="0.01" id="ribbon-qty" class="form-control" style="height: 28px; padding: 2px 5px; font-size: 0.8rem; background-color: white; color: black; border: 1px solid #b4cbe6; width: 100%;" placeholder="0">
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b;">Rate</label>
                <input type="number" step="0.01" id="ribbon-rate" class="form-control" style="height: 28px; padding: 2px 5px; font-size: 0.8rem; background-color: white; color: black; border: 1px solid #b4cbe6; width: 100%;" placeholder="0.00">
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b;">Type</label>
                <select id="ribbon-type" class="form-control" style="height: 28px; padding: 2px 5px; font-size: 0.8rem; background-color: white; color: black; border: 1px solid #b4cbe6; width: 100%;">
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                  <option value="DAMAGE">DAMAGE</option>
                  <option value="THEFT">THEFT</option>
                  <option value="EXCESS">EXCESS</option>
                  <option value="SHORTAGE">SHORTAGE</option>
                </select>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-weight: bold; font-size: 0.75rem; color: #1e3b8b;">Stock Affect</label>
                <select id="ribbon-affect" class="form-control" style="height: 28px; padding: 2px 5px; font-size: 0.8rem; background-color: white; color: black; border: 1px solid #b4cbe6; width: 100%;">
                  <option value="Add (+)">Add (+)</option>
                  <option value="Deduct (-)">Deduct (-)</option>
                </select>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="height: 14px;"></label> <!-- Alignment spacer -->
                <button type="button" class="btn btn-primary" id="btn-ribbon-add" style="height: 28px; font-weight: bold; background-color: #1e3b8b; border: none; font-size: 0.85rem; color: white; width: 100%; cursor: pointer;">Add</button>
              </div>
            </div>

            <div style="font-size: 0.72rem; color: #d97706; margin-top: 2px; font-style: italic; font-weight: 600;">
              (Press Insert key to create new Adjustment type)
            </div>
          </div>

          <!-- Fourth Section: Grid (Table) -->
          <div style="background-color: white; border: 1.5px solid #1e3b8b; height: 200px; overflow-y: auto; border-radius: 3px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.08);">
            <table class="custom-voucher-table" style="width: 100%; border-collapse: collapse; margin-top: 0;">
              <thead>
                <tr>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: left; font-size: 0.8rem; width: 25%;">Product Name</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: left; font-size: 0.8rem; width: 12%;">Code/Model</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: left; font-size: 0.8rem; width: 12%;">Batch</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: right; font-size: 0.8rem; width: 8%;">Qty</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: right; font-size: 0.8rem; width: 10%;">Rate</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: right; font-size: 0.8rem; width: 10%;">Amount</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: left; font-size: 0.8rem; width: 10%;">Type</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: left; font-size: 0.8rem; width: 10%;">Comments</th>
                  <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; text-align: center; width: 3%;"></th>
                </tr>
              </thead>
              <tbody id="grid-tbody">
                <!-- Grid rows populated dynamically -->
              </tbody>
            </table>
          </div>

          <!-- Fifth Section: Stock, Total, Checkbox -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: #c5d7ed; padding: 8px 12px; border-radius: 4px; border: 1px solid #a5c3e5;">
            <div style="font-weight: bold; color: #1e3b8b; font-size: 0.9rem; background: white; padding: 3px 10px; border-radius: 3px; border: 1px solid #a5c3e5;" id="stock-info">
              Stock : 0.00
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: bold; color: #1e3b8b; font-size: 1rem; letter-spacing: 2px;">T O T A L</span>
              <input type="text" id="adj-total" style="width: 140px; height: 30px; text-align: right; font-weight: bold; border: 1px solid #1e3b8b; background-color: white; color: #1e3b8b; font-size: 1rem; padding-right: 5px; border-radius: 3px;" readonly value="0.00">
            </div>
          </div>

          <!-- Bottom controls and checkboxes -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; padding: 2px 5px;">
            <label style="display: flex; align-items: center; gap: 5px; font-weight: bold; color: #1e3b8b; cursor: pointer;">
              <input type="checkbox" id="chk-ask-comments" style="cursor: pointer;">
              Ask for Comments while Entry (Shift+A)
            </label>
          </div>

          <!-- Footer navigation and action buttons -->
          <div style="display: flex; justify-content: center; gap: 8px; border-top: 1px solid #94a3b8; padding-top: 10px; margin-top: 5px;">
            <button class="btn btn-secondary foot-btn" id="btn-adj-prev" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 4px 15px; cursor: pointer;">&lt;&lt;</button>
            <button class="btn btn-secondary foot-btn" id="btn-adj-new" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 4px 15px; cursor: pointer;"><u>N</u>EW</button>
            <button class="btn btn-secondary foot-btn" id="btn-adj-save" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 4px 15px; cursor: pointer;"><u>S</u>AVE</button>
            <button class="btn btn-secondary foot-btn" id="btn-adj-delete" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 4px 15px; cursor: pointer;"><u>D</u>ELETE</button>
            <button class="btn btn-secondary foot-btn" id="btn-adj-search" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 4px 15px; cursor: pointer;">Sea<u>r</u>ch</button>
            <button class="btn btn-secondary foot-btn" id="btn-adj-close" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 4px 15px; cursor: pointer;"><u>C</u>lose</button>
            <button class="btn btn-secondary foot-btn" id="btn-adj-next" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 4px 15px; cursor: pointer;">&gt;&gt;</button>
          </div>

        </div>
      </div>
    </div>
    
    <style>
      .custom-voucher-table th {
        background-color: #1e3b8b !important;
        color: white !important;
        border: 1px solid #cbd5e1 !important;
        font-weight: bold;
      }
      .custom-voucher-table td {
        border: 1px solid #cbd5e1 !important;
        color: black !important;
        background-color: white !important;
      }
      .custom-voucher-table tr:hover td {
        background-color: #f1f5f9 !important;
      }
      .foot-btn:hover {
        background-color: #94a3b8 !important;
        border-color: #475569 !important;
      }
    </style>
  `;

  // Bind Ribbon Dropdown select
  const productSelect = document.getElementById("ribbon-product");
  const codeInput = document.getElementById("ribbon-code");
  const batchSelect = document.getElementById("ribbon-batch");
  const qtyInput = document.getElementById("ribbon-qty");
  const unitInput = document.getElementById("ribbon-unit");
  const rateInput = document.getElementById("ribbon-rate");
  const typeSelect = document.getElementById("ribbon-type");
  const affectSelect = document.getElementById("ribbon-affect");
  const stockInfo = document.getElementById("stock-info");

  const populateRibbonBatches = (materialId, selectedBatchNo = null) => {
    if (!batchSelect) return;
    const batches = state.getMaterialBatches(materialId);
    batchSelect.innerHTML = `<option value="">-- Batch --</option>` +
      batches.map(b => `<option value="${b.batchNo}" ${selectedBatchNo === b.batchNo ? 'selected' : ''}>${b.batchNo} (Stock: ${b.stock})</option>`).join("");
  };

  productSelect.addEventListener("change", () => {
    const mat = materials.find(m => m.id === productSelect.value);
    if (mat) {
      codeInput.value = mat.code || "";
      unitInput.value = mat.unit || "Pcs";
      populateRibbonBatches(mat.id);
      
      // Auto-select first batch if exists
      const batches = state.getMaterialBatches(mat.id);
      if (batches.length > 0) {
        batchSelect.value = batches[0].batchNo;
        rateInput.value = (batches[0].landingCost || mat.landingCost || 0).toFixed(2);
        stockInfo.innerText = `Stock : ${batches[0].stock.toFixed(2)}`;
      } else {
        rateInput.value = (mat.landingCost || 0).toFixed(2);
        stockInfo.innerText = `Stock : ${mat.stock.toFixed(2)}`;
      }
    } else {
      codeInput.value = "";
      unitInput.value = "";
      batchSelect.innerHTML = '<option value="">-- Batch --</option>';
      rateInput.value = "";
      stockInfo.innerText = "Stock : 0.00";
    }
  });

  batchSelect.addEventListener("change", () => {
    const mat = materials.find(m => m.id === productSelect.value);
    if (mat) {
      const bNo = batchSelect.value;
      const batch = mat.batches.find(b => b.batchNo === bNo);
      if (batch) {
        rateInput.value = (batch.landingCost || mat.landingCost || 0).toFixed(2);
        stockInfo.innerText = `Stock : ${batch.stock.toFixed(2)}`;
      } else {
        rateInput.value = (mat.landingCost || 0).toFixed(2);
        stockInfo.innerText = `Stock : ${mat.stock.toFixed(2)}`;
      }
    }
  });

  // Bind Ribbon Add button
  document.getElementById("btn-ribbon-add").addEventListener("click", () => {
    const matId = productSelect.value;
    const mat = materials.find(m => m.id === matId);
    if (!mat) {
      alert("Please select a product first.");
      return;
    }

    const qty = parseFloat(qtyInput.value);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity greater than 0.");
      return;
    }

    const rate = parseFloat(rateInput.value) || 0;
    const type = typeSelect.value;
    const stockAffect = affectSelect.value;
    const batchNo = batchSelect.value;

    if (!batchNo && mat.batches && mat.batches.length > 0) {
      alert("Please select a batch.");
      return;
    }

    let comments = "";
    const chkAskComments = document.getElementById("chk-ask-comments");
    if (chkAskComments && chkAskComments.checked) {
      comments = prompt("Enter comments for this item:", "Audit");
      if (comments === null) return; // cancel
    }

    tempItems.push({
      materialId: mat.id,
      name: mat.name,
      code: mat.code || "",
      batchNo: batchNo,
      qty: qty,
      unit: mat.unit || "Pcs",
      rate: rate,
      amount: qty * rate,
      type: type,
      stockAffect: stockAffect,
      comments: comments
    });

    renderGrid();

    // Clear inputs
    productSelect.value = "";
    codeInput.value = "";
    batchSelect.innerHTML = '<option value="">-- Batch --</option>';
    qtyInput.value = "";
    unitInput.value = "";
    rateInput.value = "";
    productSelect.focus();
  });



  // Bind Employee Select change
  const empSelect = document.getElementById("adj-employee");
  const empText = document.getElementById("adj-employee-text");
  empSelect.addEventListener("change", () => {
    if (empSelect.value === "NEW_EMPLOYEE") {
      empSelect.style.display = "none";
      empText.style.display = "block";
      empText.focus();
    }
  });

  // Hotkey Shift+A to toggle ask comments
  const docKeydown = (e) => {
    if (e.shiftKey && e.key === "A") {
      e.preventDefault();
      const chk = document.getElementById("chk-ask-comments");
      if (chk) chk.checked = !chk.checked;
    }
    if (e.key === "Insert") {
      // Create new adjustment type
      const newType = prompt("Enter new Adjustment Type:");
      if (newType) {
        const typeEl = document.getElementById("ribbon-type");
        if (typeEl) {
          const opt = document.createElement("option");
          opt.value = newType.toUpperCase();
          opt.innerText = newType.toUpperCase();
          opt.selected = true;
          typeEl.appendChild(opt);
        }
      }
    }
  };
  document.addEventListener("keydown", docKeydown);

  // Close helper
  const overlay = document.getElementById("modal-overlay-tx");
  const close = () => {
    document.removeEventListener("keydown", docKeydown);
    overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("btn-close-modal").addEventListener("click", close);
  document.getElementById("btn-adj-close").addEventListener("click", close);

  // Action NEW
  document.getElementById("btn-adj-new").addEventListener("click", () => {
    switchToNewMode();
  });

  // Action SAVE
  document.getElementById("btn-adj-save").addEventListener("click", () => {
    if (tempItems.length === 0) {
      alert("Cannot save an empty stock adjustment. Add at least one item.");
      return;
    }

    const employee = getActiveEmployeeName();
    if (!employee) {
      alert("Please enter or select an Employee.");
      return;
    }

    const doc = {
      id: currentIndex >= 0 ? stockAdjustments[currentIndex].id : "ADJ-" + Date.now(),
      refNo: document.getElementById("adj-ref-no").innerText,
      date: document.getElementById("adj-date").value,
      employee: employee,
      depot: document.getElementById("adj-depot").value,
      description: document.getElementById("adj-desc").value.trim(),
      items: tempItems,
      total: parseFloat(document.getElementById("adj-total").value) || 0
    };

    state.saveStockAdjustment(doc);
    alert("Stock Adjustment saved successfully!");
    close();
    renderStockAdjustSubTab(container);
  });

  // Action DELETE
  document.getElementById("btn-adj-delete").addEventListener("click", () => {
    if (currentIndex < 0) {
      alert("No adjustment loaded to delete.");
      return;
    }
    if (confirm("Are you sure you want to delete this stock adjustment?")) {
      const pw = prompt("Enter Admin Password:");
      if (pw === state.getAdminPassword() || pw === "123") {
        state.deleteStockAdjustment(stockAdjustments[currentIndex].id);
        alert("Stock Adjustment deleted.");
        close();
        renderStockAdjustSubTab(container);
      } else {
        alert("Incorrect password!");
      }
    }
  });

  // Action SEARCH
  document.getElementById("btn-adj-search").addEventListener("click", () => {
    const searchId = prompt("Enter REF.NO to search:");
    if (searchId) {
      const idx = stockAdjustments.findIndex(a => a.refNo === searchId);
      if (idx >= 0) {
        currentIndex = idx;
        loadAdjustment(stockAdjustments[idx]);
      } else {
        alert("No stock adjustment found with REF.NO: " + searchId);
      }
    }
  });

  // Navigation: Prev <<
  document.getElementById("btn-adj-prev").addEventListener("click", () => {
    if (stockAdjustments.length === 0) return;
    if (currentIndex < 0) {
      currentIndex = stockAdjustments.length - 1;
    } else if (currentIndex > 0) {
      currentIndex--;
    } else {
      alert("You are at the first stock adjustment.");
      return;
    }
    loadAdjustment(stockAdjustments[currentIndex]);
  });

  // Navigation: Next >>
  document.getElementById("btn-adj-next").addEventListener("click", () => {
    if (stockAdjustments.length === 0) return;
    if (currentIndex < 0) {
      alert("Click << to navigate from the end, or SEARCH to load one.");
      return;
    } else if (currentIndex < stockAdjustments.length - 1) {
      currentIndex++;
      loadAdjustment(stockAdjustments[currentIndex]);
    } else {
      alert("You are at the last stock adjustment.");
    }
  });

  // Initialize
  if (searchRef) {
    const idx = stockAdjustments.findIndex(a => a.refNo === String(searchRef));
    if (idx >= 0) {
      currentIndex = idx;
      loadAdjustment(stockAdjustments[idx]);
    } else {
      switchToNewMode();
    }
  } else {
    switchToNewMode();
  }
}

function showStockConversionModal(container) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();

  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-tx">
      <div class="modal-container" style="max-width: 600px;">
        <div class="modal-header">
          <h3>Material Stock Conversion / Loosening</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="stock-conversion-form">
          <div class="modal-body">
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">
              Convert bulk units or composite items into smaller, loose quantities. The asset cost transfers proportionally.
            </p>
            
            <div style="border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--border-radius-sm); margin-bottom: 1rem; background-color: var(--bg-tertiary);">
              <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--danger);">FROM SOURCE MATERIAL</h4>
              <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0.5rem;">
                <div class="form-group" style="margin-bottom:0;">
                  <label>Source Item *</label>
                  <select id="conv-src" class="form-control" required style="font-size: 0.8rem;">
                    <option value="">-- Choose --</option>
                    ${materials.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label>Qty to Convert *</label>
                  <input type="number" step="0.01" id="conv-src-qty" class="form-control" placeholder="0.00" required min="0.01" style="font-size: 0.8rem;">
                  <span id="src-unit-label" style="font-size: 0.65rem; color: var(--text-muted); display:block; margin-top:2px;"></span>
                </div>
              </div>
            </div>

            <div style="border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--border-radius-sm); margin-bottom: 1rem; background-color: var(--bg-tertiary);">
              <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--success);">TO TARGET MATERIAL</h4>
              <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0.5rem;">
                <div class="form-group" style="margin-bottom:0;">
                  <label>Target Item *</label>
                  <select id="conv-tgt" class="form-control" required style="font-size: 0.8rem;">
                    <option value="">-- Choose --</option>
                    ${materials.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label>Qty Received *</label>
                  <input type="number" step="0.01" id="conv-tgt-qty" class="form-control" placeholder="0.00" required min="0.01" style="font-size: 0.8rem;">
                  <span id="tgt-unit-label" style="font-size: 0.65rem; color: var(--text-muted); display:block; margin-top:2px;"></span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="conv-date">Conversion Date *</label>
              <input type="date" id="conv-date" class="form-control" value="${state.getLoginDate()}" required style="font-size: 0.8rem;">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Process Conversion</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = document.getElementById("modal-overlay-tx");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };

  document.getElementById("btn-close-modal").addEventListener("click", close);
  document.getElementById("btn-cancel-modal").addEventListener("click", close);

  const srcSelect = document.getElementById("conv-src");
  const tgtSelect = document.getElementById("conv-tgt");
  const srcLabel = document.getElementById("src-unit-label");
  const tgtLabel = document.getElementById("tgt-unit-label");

  srcSelect.addEventListener("change", () => {
    const selectedMat = materials.find(m => m.id === srcSelect.value);
    if (selectedMat) {
      srcLabel.innerText = `Unit: ${selectedMat.unit} | Stock: ${(selectedMat.stock||0).toFixed(2)}`;
      document.getElementById("conv-src-qty").max = selectedMat.stock || 0;
    } else {
      srcLabel.innerText = "";
    }
  });

  tgtSelect.addEventListener("change", () => {
    const selectedMat = materials.find(m => m.id === tgtSelect.value);
    if (selectedMat) {
      tgtLabel.innerText = `Unit: ${selectedMat.unit}`;
    } else {
      tgtLabel.innerText = "";
    }
  });



  document.getElementById("stock-conversion-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const srcId = srcSelect.value;
    const tgtId = tgtSelect.value;
    const sQty = parseFloat(document.getElementById("conv-src-qty").value);
    const tQty = parseFloat(document.getElementById("conv-tgt-qty").value);
    const date = document.getElementById("conv-date").value;

    if (srcId === tgtId) {
      alert("Source and Target material cannot be the same product!");
      return;
    }

    const srcMat = materials.find(m => m.id === srcId);
    const stock = srcMat ? (srcMat.stock || 0) : 0;
    if (sQty > stock) {
      alert(`Insufficient stock. Only ${stock} units available.`);
      return;
    }

    const success = state.createStockConversion({
      sourceMaterialId: srcId,
      sourceQty: sQty,
      targetMaterialId: tgtId,
      targetQty: tQty,
      date: date
    });

    if (success) {
      close();
      renderStockConversionSubTab(container);
    } else {
      alert("Failed to complete conversion. Check inputs.");
    }
  });
}

// Visual popup for returns details
function showCreditNoteView(container, cnId) {
  const cn = state.getSalesReturns().find(c => c.id === cnId);
  if (!cn) return;

  const root = document.getElementById("modal-container-root");
  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-tx">
      <div class="modal-container modal-lg">
        <div class="modal-header">
          <h3>Credit Note Voucher: ${cn.id}</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body" style="background-color: var(--bg-secondary); color: var(--text-primary); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 2rem;">
            <div>
              <h1 style="color: var(--danger); font-size: 1.8rem;">CREDIT NOTE</h1>
              <strong>Voucher No: ${cn.id}</strong><br>
              <span>Date: ${formatDate(cn.date)}</span>
            </div>
            <div style="text-align: right;">
              <strong>Material Ledger ERP</strong>
            </div>
          </div>
          
          <div style="border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 1rem 0; margin-bottom: 1.5rem;">
            <span>Client/Customer:</span><br>
            <strong>${cn.contactName}</strong>
          </div>

          <table style="width:100%; font-size: 0.875rem; border-collapse: collapse; margin-bottom: 1.5rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                <th>Returned Item</th>
                <th>Batch No</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Sales Rate</th>
                <th style="text-align: right;">Amount Refund</th>
              </tr>
            </thead>
            <tbody>
              ${cn.items.map(item => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.5rem 0;">${item.name}</td>
                  <td style="padding: 0.5rem 0;">${item.batchNo}</td>
                  <td style="padding: 0.5rem 0; text-align: right;">${item.quantity} ${item.unit}</td>
                  <td style="padding: 0.5rem 0; text-align: right;">\u20B9${item.price.toFixed(2)}</td>
                  <td style="padding: 0.5rem 0; text-align: right; font-weight:600;">\u20B9${item.amount.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <table class="invoice-summary-table" style="width: 250px;">
              <tr><td>Subtotal</td><td>\u20B9${cn.subtotal.toFixed(2)}</td></tr>
              <tr><td>Tax Returned (${cn.taxRate || 18}%)</td><td>\u20B9${cn.taxAmount.toFixed(2)}</td></tr>
              <tr class="total-row"><td>Total Refund Credit</td><td>\u20B9${cn.total.toFixed(2)}</td></tr>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-close-view-cn">Close</button>
        </div>
      </div>
    </div>
  `;

  const overlay = document.getElementById("modal-overlay-tx");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };
  document.getElementById("btn-close-modal").addEventListener("click", close);
  document.getElementById("btn-close-view-cn").addEventListener("click", close);
}

// Visual popup for debit note details
function showDebitNoteView(container, dnId) {
  const dn = state.getPurchaseReturns().find(d => d.id === dnId);
  if (!dn) return;

  const root = document.getElementById("modal-container-root");
  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-tx">
      <div class="modal-container modal-lg">
        <div class="modal-header">
          <h3>Debit Note Voucher: ${dn.id}</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body" style="background-color: var(--bg-secondary); color: var(--text-primary); padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 2rem;">
            <div>
              <h1 style="color: var(--info); font-size: 1.8rem;">DEBIT NOTE</h1>
              <strong>Voucher No: ${dn.id}</strong><br>
              <span>Date: ${formatDate(dn.date)}</span>
            </div>
            <div style="text-align: right;">
              <strong>Material Ledger ERP</strong>
            </div>
          </div>
          
          <div style="border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 1rem 0; margin-bottom: 1.5rem;">
            <span>Supplier / Vendor:</span><br>
            <strong>${dn.contactName}</strong>
          </div>

          <table style="width:100%; font-size: 0.875rem; border-collapse: collapse; margin-bottom: 1.5rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                <th>Returned Item</th>
                <th>Batch No</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Cost Rate</th>
                <th style="text-align: right;">Amount Debit</th>
              </tr>
            </thead>
            <tbody>
              ${dn.items.map(item => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.5rem 0;">${item.name}</td>
                  <td style="padding: 0.5rem 0;">${item.batchNo}</td>
                  <td style="padding: 0.5rem 0; text-align: right;">${item.quantity} ${item.unit}</td>
                  <td style="padding: 0.5rem 0; text-align: right;">\u20B9${item.price.toFixed(2)}</td>
                  <td style="padding: 0.5rem 0; text-align: right; font-weight:600;">\u20B9${item.amount.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <table class="invoice-summary-table" style="width: 250px;">
              <tr><td>Subtotal</td><td>\u20B9${dn.subtotal.toFixed(2)}</td></tr>
              <tr><td>Tax Reversed (${dn.taxRate || 18}%)</td><td>\u20B9${dn.taxAmount.toFixed(2)}</td></tr>
              <tr class="total-row"><td>Total Debit Note Value</td><td>\u20B9${dn.total.toFixed(2)}</td></tr>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-close-view-dn">Close</button>
        </div>
      </div>
    </div>
  `;

  const overlay = document.getElementById("modal-overlay-tx");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };
  document.getElementById("btn-close-modal").addEventListener("click", close);
  document.getElementById("btn-close-view-dn").addEventListener("click", close);
}
