import { state } from "../state.js";

export function showOpeningStockEntryModal(container) {
  const root = document.getElementById("modal-container-root");
  
  function renderList() {
    const searchVal = document.getElementById("os-search-input")?.value?.toLowerCase() || "";
    const materials = state.getMaterials();
    
    const filtered = materials.filter(m => 
      String(m.name).toLowerCase().includes(searchVal) || 
      String(m.code).toLowerCase().includes(searchVal)
    );

    const tbody = document.getElementById("os-table-body");
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:20px; color:#64748b;">No products found matching "${searchVal}".</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(m => {
      const totalQty = (m.batches || []).reduce((sum, b) => sum + (parseFloat(b.openingStock) || 0), 0) || parseFloat(m.openingStock) || 0;
      
      let totalValue = 0;
      if (m.batches && m.batches.length > 0) {
        totalValue = m.batches.reduce((sum, b) => sum + ((parseFloat(b.openingStock) || 0) * (parseFloat(b.landingCost) || 0)), 0);
      } else {
        totalValue = totalQty * (parseFloat(m.landingCost) || 350);
      }

      return `
        <tr class="os-product-row" data-id="${m.id}" style="border-bottom:1px solid #cbd5e1; cursor:pointer;" title="Double click to view batch-wise details">
          <td style="padding:8px 12px;"><strong>${m.name}</strong></td>
          <td style="padding:8px 12px;"><code style="background-color:#e2e8f0; padding:2px 4px; font-weight:700;">${m.code || m.id}</code></td>
          <td style="padding:8px 12px; text-align:right; font-weight:700;">${totalQty.toFixed(2)} ${m.unit || 'Nos'}</td>
          <td style="padding:8px 12px; text-align:right; font-weight:700; color:#1e40af;">₹${totalValue.toFixed(2)}</td>
          <td style="padding:8px 12px; text-align:center;">
            <button class="btn-edit-os" data-id="${m.id}" style="background-color:#1e3b8b; color:white; border:none; padding:4px 8px; border-radius:3px; font-size:0.75rem; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-edit"></i> Edit Opening Stock</button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".os-product-row").forEach(row => {
      row.addEventListener("click", (evt) => {
        if (evt.target.closest(".btn-edit-os")) return;
        tbody.querySelectorAll(".os-product-row").forEach(r => r.style.backgroundColor = "");
        row.style.backgroundColor = "#cbd5e1";
      });
      row.addEventListener("dblclick", (e) => {
        if (e.target.closest(".btn-edit-os")) return;
        const matId = row.getAttribute("data-id");
        showBatchWiseDetailsModal(matId);
      });
    });

    tbody.querySelectorAll(".btn-edit-os").forEach(btn => {
      btn.addEventListener("click", () => {
        const matId = btn.getAttribute("data-id");
        showEnterOpeningStockModal(matId);
      });
    });
  }

  root.innerHTML = `
    <div class="modal-overlay active" id="os-entry-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:950px; width: 90vw; height:80vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-boxes-packing"></i> OPENING STOCK ENTRY</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="os-close-x-btn">&times;</button>
        </div>

        <!-- Toolbar / Search option -->
        <div style="background:#b4c6e7; padding:6px; border:1px solid #8faadc; border-radius:2px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:6px; flex-grow:1;">
            <span style="font-weight:bold; font-size:0.75rem;">Search Product / Code:</span>
            <input type="text" id="os-search-input" class="form-control" placeholder="Type here to search..." style="flex-grow:1; max-width:350px; padding:2px 6px; font-size:0.75rem; background:white; color:black; height:22px; border:1px solid #94a3b8; border-radius:2px;">
          </div>
          <button type="button" class="btn btn-secondary" id="btn-os-close" style="padding:1px 12px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:22px; font-size:0.72rem; box-shadow:1px 1px 2px white inset;">Close</button>
        </div>

        <!-- Table view -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
            <thead>
              <tr style="background-color:#1e293b; color:white; border-bottom: 2px solid #475569; position:sticky; top:0;">
                <th style="padding:8px 12px;">Product Name</th>
                <th style="padding:8px 12px;">Code/Model</th>
                <th style="padding:8px 12px; text-align:right;">Opening Stock Qty</th>
                <th style="padding:8px 12px; text-align:right;">Total Value</th>
                <th style="padding:8px 12px; text-align:center; width:150px;">Action</th>
              </tr>
            </thead>
            <tbody id="os-table-body">
              <!-- Rendered list of products -->
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("os-entry-overlay");
  const close = () => { overlay.remove(); };

  document.getElementById("os-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-os-close").addEventListener("click", close);
  document.getElementById("os-search-input").addEventListener("input", renderList);

  renderList();

  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", escHandler);
    }
  };
  window.addEventListener("keydown", escHandler);

  function showBatchWiseDetailsModal(matId) {
    const mat = state.getMaterials().find(m => m.id === matId);
    if (!mat) return;

    const subModal = document.createElement("div");
    subModal.className = "modal-overlay active";
    subModal.id = "os-batch-details-overlay";
    subModal.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(1px); z-index:2100; position:fixed; top:0; left:0; width:100%; height:100%;";
    
    const batches = mat.batches || [];
    let tbodyHTML = "";
    if (batches.length === 0) {
      tbodyHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding:15px; color:#64748b; font-style:italic;">No batch opening stocks entered yet.</td>
        </tr>
      `;
    } else {
      tbodyHTML = batches.map(b => {
        const qty = parseFloat(b.openingStock) || 0;
        const rate = parseFloat(b.landingCost) || 0;
        const val = qty * rate;
        return `
          <tr style="border-bottom:1px solid #e2e8f0; color:black;">
            <td style="padding:6px; font-weight:bold;">Batch ${b.batchNo}</td>
            <td style="padding:6px; text-align:right;">${qty.toFixed(2)} ${mat.unit || 'Nos'}</td>
            <td style="padding:6px; text-align:right;">₹${rate.toFixed(2)}</td>
            <td style="padding:6px; text-align:right; font-weight:700; color:#1e40af;">₹${val.toFixed(2)}</td>
          </tr>
        `;
      }).join("");
    }

    subModal.innerHTML = `
      <div class="modal-container modal-sm" style="max-width:550px; width: 90vw; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #1e3b8b; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size:0.78rem; display:flex; flex-direction:column; gap:8px;">
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div><i class="fa-solid fa-boxes-stacked"></i> Batch-Wise Opening Stock Details</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="os-sub-close-x-btn">&times;</button>
        </div>
        <div style="background:white; padding:10px; border:1px solid #94a3b8; border-radius:2px;">
          <div style="margin-bottom:8px; font-weight:bold; font-size:0.85rem; color:#1e3b8b;">Product: ${mat.name} [${mat.code || mat.id}]</div>
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem;">
            <thead>
              <tr style="background:#cbd5e1; font-weight:bold; border-bottom:1px solid #94a3b8;">
                <th style="padding:6px;">Batch Name</th>
                <th style="padding:6px; text-align:right;">Opening Stock Qty</th>
                <th style="padding:6px; text-align:right;">Rate</th>
                <th style="padding:6px; text-align:right;">Total Value</th>
              </tr>
            </thead>
            <tbody>
              ${tbodyHTML}
            </tbody>
          </table>
        </div>
        <div style="display:flex; justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="btn-os-sub-close" style="padding:1px 12px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:20px; font-size:0.72rem;">Close</button>
        </div>
      </div>
    `;

    document.getElementById("os-sub-close-x-btn").addEventListener("click", closeSub);
    document.getElementById("btn-os-sub-close").addEventListener("click", closeSub);
  }
}

export function showCreateBatchSubModal(mat, onCreated) {
  const subModal = document.createElement("div");
  subModal.className = "modal-overlay active";
  subModal.id = "os-create-batch-sub-overlay";
  subModal.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(1px); z-index:2200; position:fixed; top:0; left:0; width:100%; height:100%;";

  subModal.innerHTML = `
    <div class="modal-container modal-sm" style="max-width:380px; width: 90vw; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #107c41; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size:0.78rem; display:flex; flex-direction:column; gap:8px;">
      <div style="background: linear-gradient(180deg, #107c41 0%, #16a34a 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
        <div><i class="fa-solid fa-plus-circle"></i> Create New Batch</div>
        <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="os-new-batch-close-x-btn">&times;</button>
      </div>

      <form id="os-new-batch-form" style="display:flex; flex-direction:column; gap:10px; background:white; padding:12px; border:1px solid #94a3b8; border-radius:2px; color:black;">
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Landing Cost / Rate (Batch Name) *</label>
          <input type="number" id="os-new-batch-cost" class="form-control" style="background:white; color:black;" step="0.01" min="0.01" required value="${(mat.landingCost || 350).toFixed(2)}">
        </div>
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Selling Price *</label>
          <input type="number" id="os-new-batch-selling" class="form-control" style="background:white; color:black;" step="0.01" min="0" required value="${(mat.gstExclRate || mat.sellingPrice || 380).toFixed(2)}">
        </div>
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">MRP *</label>
          <input type="number" id="os-new-batch-mrp" class="form-control" style="background:white; color:black;" step="0.01" min="0" required value="${(mat.mrp || 400).toFixed(2)}">
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #94a3b8; padding-top:8px; margin-top:4px;">
          <button type="submit" class="btn btn-primary" style="background:#107c41; color:white; font-weight:bold; padding:4px 12px; font-size:0.75rem; border:none; border-radius:3px;">Create</button>
          <button type="button" class="btn btn-secondary" id="btn-os-new-batch-cancel" style="padding:4px 12px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; font-size:0.75rem; border-radius:3px;">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById("modal-container-root").appendChild(subModal);
  const closeSub = () => { subModal.remove(); };

  document.getElementById("os-new-batch-close-x-btn").addEventListener("click", closeSub);
  document.getElementById("btn-os-new-batch-cancel").addEventListener("click", closeSub);

  document.getElementById("os-new-batch-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const cost = parseFloat(document.getElementById("os-new-batch-cost").value) || 0;
    const selling = parseFloat(document.getElementById("os-new-batch-selling").value) || 0;
    const mrp = parseFloat(document.getElementById("os-new-batch-mrp").value) || 0;
    const bNo = String(cost);

    mat.batches = mat.batches || [];
    const exists = mat.batches.some(b => {
      const bStr = String(b.batchNo).trim().toLowerCase();
      const newStr = bNo.trim().toLowerCase();
      if (bStr === newStr) return true;
      const bNum = parseFloat(bStr);
      const newNum = parseFloat(newStr);
      if (!isNaN(bNum) && !isNaN(newNum) && bNum === newNum) return true;
      return false;
    });
    if (exists) {
      alert(`Warning: A batch named "${bNo}" (matching this landing cost) already exists for this product.`);
      return;
    }

    // Add new batch with 0 opening stock initially
    const newBatch = {
      batchNo: bNo,
      openingStock: 0,
      landingCost: cost,
      sellingPrice: selling,
      mrp: mrp,
      stock: 0
    };
    mat.batches.push(newBatch);
    state.recomputeAllStocks();
    state.saveState();

    closeSub();
    if (onCreated) onCreated(bNo);
  });
}

export function showEnterOpeningStockModal(matId, onSaved = null) {
  const mat = state.getMaterials().find(m => m.id === matId);
  if (!mat) return;

  const entryModal = document.createElement("div");
  entryModal.className = "modal-overlay active";
  entryModal.id = "os-entry-dialog-overlay";
  entryModal.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(1px); z-index:2100; position:fixed; top:0; left:0; width:100%; height:100%;";

  let existingBatches = mat.batches || [];

  function getFormHTML() {
    return `
    <div class="modal-container modal-sm" style="max-width:450px; width: 90vw; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #1e3b8b; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size:0.78rem; display:flex; flex-direction:column; gap:8px;">
      <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
        <div><i class="fa-solid fa-edit"></i> Enter/Edit Opening Stock</div>
        <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="os-edit-close-x-btn">&times;</button>
      </div>
      
      <form id="os-edit-form" style="display:flex; flex-direction:column; gap:10px; background:white; padding:12px; border:1px solid #94a3b8; border-radius:2px; color:black;">
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Product Name</label>
          <input type="text" class="form-control" style="background:#cbd5e1; color:black; font-weight:bold;" value="${mat.name}" readonly>
        </div>
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Code/Model</label>
          <input type="text" class="form-control" style="background:#cbd5e1; color:black; font-weight:bold;" value="${mat.code || mat.id}" readonly>
        </div>
        
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Batch Name (Landing Cost) *</label>
          <div style="display:flex; align-items:center; gap:6px;">
            <select id="os-edit-batch-select" class="form-control" style="background:white; color:black; flex-grow:1;" required>
              <option value="">-- Select Batch --</option>
              ${existingBatches.map(b => `<option value="${b.batchNo}">${b.batchNo}</option>`).join("")}
            </select>
            <button type="button" id="btn-os-add-batch" style="background:#107c41; color:white; border:none; padding:4px 10px; border-radius:3px; font-weight:bold; cursor:pointer; font-size:1.1rem; height:26px; line-height:16px;" title="Create New Batch">+</button>
          </div>
        </div>
        
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Opening Quantity *</label>
          <input type="number" id="os-edit-qty" class="form-control" style="background:white; color:black;" step="0.01" min="0" required value="0.00">
        </div>
        
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Landing Cost / Purchase Rate (Read-Only)</label>
          <input type="number" id="os-edit-cost" class="form-control" style="background:#cbd5e1; color:black; font-weight:bold;" step="0.01" min="0" readonly value="0.00">
        </div>
        
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Selling Price *</label>
          <input type="number" id="os-edit-selling" class="form-control" style="background:white; color:black;" step="0.01" min="0" required value="0.00">
        </div>
        
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">MRP *</label>
          <input type="number" id="os-edit-mrp" class="form-control" style="background:white; color:black;" step="0.01" min="0" required value="0.00">
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #94a3b8; padding-top:8px; margin-top:4px;">
          <button type="submit" class="btn btn-primary" style="background:#1e3b8b; color:white; font-weight:bold; padding:4px 12px; font-size:0.75rem; border:none; border-radius:3px;">Save</button>
          <button type="button" class="btn btn-secondary" id="btn-os-edit-cancel" style="padding:4px 12px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; font-size:0.75rem; border-radius:3px;">Cancel</button>
        </div>
      </form>
    </div>
    `;
  }

  function initFormEvents() {
    const batchSelect = document.getElementById("os-edit-batch-select");
    const qtyInput = document.getElementById("os-edit-qty");
    const costInput = document.getElementById("os-edit-cost");
    const sellingInput = document.getElementById("os-edit-selling");
    const mrpInput = document.getElementById("os-edit-mrp");

    batchSelect.addEventListener("change", () => {
      const bNo = batchSelect.value;
      if (bNo) {
        const bObj = existingBatches.find(b => b.batchNo === bNo);
        qtyInput.value = (parseFloat(bObj.openingStock) || 0).toFixed(2);
        costInput.value = (parseFloat(bObj.landingCost) || 0).toFixed(2);
        sellingInput.value = (parseFloat(bObj.sellingPrice) || 0).toFixed(2);
        mrpInput.value = (parseFloat(bObj.mrp) || 0).toFixed(2);
      } else {
        qtyInput.value = "0.00";
        costInput.value = "0.00";
        sellingInput.value = "0.00";
        mrpInput.value = "0.00";
      }
    });

    document.getElementById("os-edit-close-x-btn").addEventListener("click", () => entryModal.remove());
    document.getElementById("btn-os-edit-cancel").addEventListener("click", () => entryModal.remove());

    document.getElementById("btn-os-add-batch").addEventListener("click", () => {
      showCreateBatchSubModal(mat, (newBNo) => {
        existingBatches = mat.batches || [];
        entryModal.innerHTML = getFormHTML();
        initFormEvents();
        const newSelect = document.getElementById("os-edit-batch-select");
        newSelect.value = newBNo;
        newSelect.dispatchEvent(new Event("change"));
      });
    });

    document.getElementById("os-edit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const bNo = batchSelect.value;
      if (!bNo) {
        alert("Please select a batch or create a new one using the + button.");
        return;
      }

      const qty = parseFloat(qtyInput.value) || 0;
      const selling = parseFloat(sellingInput.value) || 0;
      const mrp = parseFloat(mrpInput.value) || 0;

      let targetB = mat.batches.find(b => b.batchNo === bNo);
      if (targetB) {
        targetB.openingStock = qty;
        targetB.sellingPrice = selling;
        targetB.mrp = mrp;
      }

      state.recomputeAllStocks();
      state.saveState();
      
      entryModal.remove();
      if (onSaved) onSaved();
    });
  }

  entryModal.innerHTML = getFormHTML();
  document.getElementById("modal-container-root").appendChild(entryModal);
  initFormEvents();
}
