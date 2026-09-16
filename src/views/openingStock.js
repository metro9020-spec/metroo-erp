import { state } from "../state.js";
import { renderPrintHeaderHtml } from "./reports.js";

export function sortBatches(batches) {
  if (!batches || !Array.isArray(batches)) return [];
  return [...batches].sort((a, b) => {
    const numA = parseFloat(a.batchNo);
    const numB = parseFloat(b.batchNo);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return String(a.batchNo || "").localeCompare(String(b.batchNo || ""), undefined, { numeric: true, sensitivity: 'base' });
  });
}

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
      const sorted = sortBatches(m.batches || []);
      const totalQty = (sorted).reduce((sum, b) => sum + (parseFloat(b.openingStock) || 0), 0) || parseFloat(m.openingStock) || 0;
      
      let totalValue = 0;
      if (sorted.length > 0) {
        totalValue = sorted.reduce((sum, b) => sum + ((parseFloat(b.openingStock) || 0) * (parseFloat(b.landingCost) || 0)), 0);
      } else {
        totalValue = totalQty * (parseFloat(m.landingCost) || 350);
      }

      return `
        <tr class="os-product-row" data-id="${m.id}" style="border-bottom:1px solid #cbd5e1; cursor:pointer;" title="Double click to view batch-wise details">
          <td style="padding:8px 12px;"><strong>${m.name}</strong></td>
          <td style="padding:8px 12px;"><code style="background-color:#e2e8f0; padding:2px 4px; font-weight:700;">${m.code || m.id}</code></td>
          <td style="padding:8px 12px; text-align:right; font-weight:700;">${totalQty.toFixed(2)} ${m.unit || 'Nos'}</td>
          <td style="padding:8px 12px; text-align:right; font-weight:700; color:#1e40af;">\u20B9${totalValue.toFixed(2)}</td>
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
    
    const batches = sortBatches(mat.batches || []);
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
            <td style="padding:6px; text-align:right;">\u20B9${rate.toFixed(2)}</td>
            <td style="padding:6px; text-align:right; font-weight:700; color:#1e40af;">\u20B9${val.toFixed(2)}</td>
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

  let existingBatches = sortBatches(mat.batches || []);

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
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Batch Name (Landing Cost) * <span style="font-weight:normal; font-size:0.7rem; color:#475569;">(Sorted & Typable)</span></label>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="position:relative; flex-grow:1;">
              <input type="text" id="os-edit-batch-input" class="form-control" placeholder="Type or select batch number..." style="background:white; color:black; font-weight:bold; width:100%; padding-right:24px; font-size:0.8rem;" autocomplete="off" required>
              <span id="os-edit-batch-arrow" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); pointer-events:none; color:#64748b; font-size:0.75rem;"><i class="fa-solid fa-chevron-down"></i></span>
              
              <div id="os-edit-batch-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:200px; overflow-y:auto; background:white; border:1px solid #1e3b8b; border-radius:3px; box-shadow:0 6px 16px rgba(0,0,0,0.3); z-index:2500; font-size:0.8rem;"></div>
            </div>
            <button type="button" id="btn-os-add-batch" style="background:#107c41; color:white; border:none; padding:4px 10px; border-radius:3px; font-weight:bold; cursor:pointer; font-size:1.1rem; height:26px; line-height:16px;" title="Create New Batch">+</button>
          </div>
        </div>
        
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Opening Quantity *</label>
          <input type="number" id="os-edit-qty" class="form-control" style="background:white; color:black;" step="0.01" min="0" required value="0.00">
        </div>
        
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px;">Landing Cost / Purchase Rate * <span style="font-weight:normal; font-size:0.7rem; color:#1e3b8b;">(Editable)</span></label>
          <input type="number" id="os-edit-cost" class="form-control" style="background:white; color:black; font-weight:bold;" step="0.001" min="0.001" required value="0.00">
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
    const batchInput = document.getElementById("os-edit-batch-input");
    const batchDropdown = document.getElementById("os-edit-batch-dropdown");
    const qtyInput = document.getElementById("os-edit-qty");
    const costInput = document.getElementById("os-edit-cost");
    const sellingInput = document.getElementById("os-edit-selling");
    const mrpInput = document.getElementById("os-edit-mrp");

    let selectedBatchName = "";

    function renderDropdownList(filterText = "") {
      const search = filterText.toLowerCase().trim();
      const filtered = existingBatches.filter(b => 
        String(b.batchNo).toLowerCase().includes(search)
      );

      if (filtered.length === 0) {
        batchDropdown.innerHTML = `<div style="padding:8px 10px; color:#64748b; font-style:italic;">No matching batch found</div>`;
      } else {
        batchDropdown.innerHTML = filtered.map(b => {
          const cost = (parseFloat(b.landingCost) || 0).toFixed(2);
          const stock = (parseFloat(b.openingStock) || 0).toFixed(2);
          return `
            <div class="os-batch-item" data-value="${b.batchNo}" style="padding:6px 10px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; color:black;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='white'">
              <strong style="color:#1e3b8b;">${b.batchNo}</strong>
              <span style="font-size:0.72rem; color:#475569; margin-left:auto;">Rate: ₹${cost} | Qty: ${stock}</span>
            </div>
          `;
        }).join("");

        batchDropdown.querySelectorAll(".os-batch-item").forEach(item => {
          item.addEventListener("mousedown", (evt) => {
            evt.preventDefault();
            const val = item.getAttribute("data-value");
            selectBatch(val);
          });
        });
      }
    }

    function selectBatch(bNo) {
      batchInput.value = bNo;
      selectedBatchName = bNo;
      batchDropdown.style.display = "none";

      const bObj = existingBatches.find(b => String(b.batchNo).trim() === String(bNo).trim());
      if (bObj) {
        qtyInput.value = (parseFloat(bObj.openingStock) || 0).toFixed(2);
        costInput.value = (parseFloat(bObj.landingCost) || 0).toFixed(3);
        sellingInput.value = (parseFloat(bObj.sellingPrice) || 0).toFixed(2);
        mrpInput.value = (parseFloat(bObj.mrp) || 0).toFixed(2);
      } else {
        qtyInput.value = "0.00";
        costInput.value = "0.00";
        sellingInput.value = "0.00";
        mrpInput.value = "0.00";
      }
    }

    batchInput.addEventListener("focus", () => {
      renderDropdownList(batchInput.value);
      batchDropdown.style.display = "block";
    });

    batchInput.addEventListener("click", () => {
      renderDropdownList(batchInput.value);
      batchDropdown.style.display = "block";
    });

    batchInput.addEventListener("input", () => {
      selectedBatchName = batchInput.value;
      renderDropdownList(batchInput.value);
      batchDropdown.style.display = "block";

      const matched = existingBatches.find(b => String(b.batchNo).trim() === batchInput.value.trim());
      if (matched) {
        qtyInput.value = (parseFloat(matched.openingStock) || 0).toFixed(2);
        costInput.value = (parseFloat(matched.landingCost) || 0).toFixed(3);
        sellingInput.value = (parseFloat(matched.sellingPrice) || 0).toFixed(2);
        mrpInput.value = (parseFloat(matched.mrp) || 0).toFixed(2);
      }
    });

    costInput.addEventListener("input", () => {
      const cVal = costInput.value.trim();
      if (cVal && !isNaN(parseFloat(cVal))) {
        batchInput.value = cVal;
      }
    });

    batchInput.addEventListener("blur", () => {
      setTimeout(() => {
        batchDropdown.style.display = "none";
      }, 200);
    });

    document.getElementById("os-edit-close-x-btn").addEventListener("click", () => entryModal.remove());
    document.getElementById("btn-os-edit-cancel").addEventListener("click", () => entryModal.remove());

    document.getElementById("btn-os-add-batch").addEventListener("click", () => {
      showCreateBatchSubModal(mat, (newBNo) => {
        existingBatches = sortBatches(mat.batches || []);
        entryModal.innerHTML = getFormHTML();
        initFormEvents();
        selectBatch(newBNo);
      });
    });

    document.getElementById("os-edit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const enteredQty = parseFloat(qtyInput.value) || 0;
      const editedCost = parseFloat(costInput.value) || 0;
      const selling = parseFloat(sellingInput.value) || 0;
      const mrp = parseFloat(mrpInput.value) || 0;
      const rawBatchNo = batchInput.value.trim();

      if (editedCost <= 0) {
        alert("Please enter a valid Landing Cost / Purchase Rate.");
        return;
      }

      const targetBatchNo = rawBatchNo || String(editedCost);
      mat.batches = mat.batches || [];

      // Check if batch with this landing cost or name already exists
      let existingBatch = mat.batches.find(b => {
        const bCost = parseFloat(b.landingCost) || 0;
        const bName = String(b.batchNo).trim().toLowerCase();
        return Math.abs(bCost - editedCost) < 0.0001 || bName === targetBatchNo.toLowerCase() || bName === String(editedCost).toLowerCase();
      });

      let selectedBatch = mat.batches.find(b => String(b.batchNo).trim().toLowerCase() === selectedBatchName.toLowerCase());

      if (existingBatch) {
        // If editing a different batch and changing rate to match existingBatch, clear old batch stock
        if (selectedBatch && selectedBatch !== existingBatch) {
          selectedBatch.openingStock = 0;
        }

        // Merge: Add entered quantity to existing batch
        if (selectedBatch === existingBatch) {
          existingBatch.openingStock = enteredQty;
        } else {
          existingBatch.openingStock = (parseFloat(existingBatch.openingStock) || 0) + enteredQty;
        }
        existingBatch.landingCost = editedCost;
        existingBatch.sellingPrice = selling;
        existingBatch.mrp = mrp;
      } else {
        // Create new batch automatically with landing cost
        if (selectedBatch && String(selectedBatch.batchNo).trim() !== targetBatchNo) {
          selectedBatch.openingStock = 0;
        }

        const newBatch = {
          batchNo: targetBatchNo,
          openingStock: enteredQty,
          landingCost: editedCost,
          sellingPrice: selling,
          mrp: mrp,
          stock: 0
        };
        mat.batches.push(newBatch);
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

export function renderOpeningStockRegisterReport(container) {
  try {
    let sortCol = "name";
    let sortDir = "asc";

    const materials = state.getMaterials();

    const categoriesSet = new Set(state.getCategories());
    const companiesSet = new Set(state.getCompanies());
    const groupsSet = new Set(state.getProductGroups());

    materials.forEach(m => {
      if (m.category) categoriesSet.add(m.category);
      if (m.company) companiesSet.add(m.company);
      if (m.productGroup) groupsSet.add(m.productGroup);
    });

    const categories = Array.from(categoriesSet).filter(Boolean).sort();
    const companies = Array.from(companiesSet).filter(Boolean).sort();
    const groups = Array.from(groupsSet).filter(Boolean).sort();

    container.innerHTML = `
      <div class="panel" style="padding: 0; background: none; box-shadow: none; border: none; font-family: Tahoma, sans-serif; display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        
        <!-- Official Letterhead Header for Print -->
        ${renderPrintHeaderHtml(
          "OPENING STOCK REGISTER",
          "Statement Period: <strong>Financial Year Opening</strong>",
          "Valuation Method: <strong>Landing Cost / Purchase Rate</strong>"
        )}

        <!-- Toolbar / Action Bar & Advanced Filters -->
        <div class="no-print" style="background: #cfd8e7; border: 1px solid #a5c3e5; padding: 6px 12px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; margin-bottom: 6px; border-radius: 3px;">
          
          <!-- Row 1: Search, Sort, Action Controls -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px; flex-grow: 1;">
              <label style="font-weight: bold; white-space: nowrap;"><i class="fa-solid fa-magnifying-glass"></i> Search:</label>
              <input type="text" id="os-rep-search" class="form-control" placeholder="Search product, code, or batch..." style="max-width: 250px; padding: 3px 8px; font-size: 12px; height: 26px; border: 1px solid #7f9db9; background: white; color: black;">
              
              <label style="font-weight: bold; white-space: nowrap; margin-left: 8px;"><i class="fa-solid fa-sort"></i> Sort By:</label>
              <select id="os-rep-sort" class="form-control" style="max-width: 210px; padding: 2px 6px; font-size: 12px; height: 26px; border: 1px solid #7f9db9; background: white; color: black; font-weight: bold;">
                <option value="nameAsc">Product Name (A to Z)</option>
                <option value="nameDesc">Product Name (Z to A)</option>
                <option value="codeAsc">Product Code (Ascending)</option>
                <option value="rateAsc">Landing Rate (Low to High)</option>
                <option value="rateDesc">Landing Rate (High to Low)</option>
                <option value="qtyDesc">Opening Qty (High to Low)</option>
                <option value="qtyAsc">Opening Qty (Low to High)</option>
                <option value="valDesc">Opening Value (High to Low)</option>
                <option value="valAsc">Opening Value (Low to High)</option>
              </select>
            </div>

            <div style="display: flex; gap: 6px; align-items: center;">
              <button id="btn-os-rep-reset-filters" style="padding: 3px 10px; background: #ffffff; color: #1e293b; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;" title="Reset all filters">
                <i class="fa-solid fa-rotate-left"></i> Reset
              </button>
              <button id="btn-os-rep-edit" style="padding: 3px 12px; background: #1e3b8b; color: white; border: 1px solid #102a6b; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">
                <i class="fa-solid fa-edit"></i> Edit Opening Stock
              </button>
              <button id="btn-os-rep-print" style="padding: 3px 12px; background: #e2e2e2; color: black; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">
                <i class="fa-solid fa-print"></i> Print
              </button>
              <button id="btn-os-rep-close" style="padding: 3px 12px; background: #e2e2e2; color: black; border: 1px solid #707070; border-radius: 2px; font-size: 12px; font-weight: bold; cursor: pointer;">
                Close
              </button>
            </div>
          </div>

          <!-- Row 2: Category, Brand/Company, Product Group, and Stock Status Filter Ribbon -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; border-top: 1px solid #b4c6e7; padding-top: 5px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <label style="font-weight: bold; font-size: 11px; white-space: nowrap; color: #1e3b8b;"><i class="fa-solid fa-filter"></i> Category:</label>
              <select id="os-rep-cat" class="form-control" style="width: 140px; padding: 2px 4px; font-size: 11px; height: 24px; border: 1px solid #7f9db9; background: white; color: black;">
                <option value="">-- All Categories --</option>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
              <label style="font-weight: bold; font-size: 11px; white-space: nowrap; color: #1e3b8b;">Brand/Company:</label>
              <select id="os-rep-comp" class="form-control" style="width: 140px; padding: 2px 4px; font-size: 11px; height: 24px; border: 1px solid #7f9db9; background: white; color: black;">
                <option value="">-- All Companies --</option>
                ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
              <label style="font-weight: bold; font-size: 11px; white-space: nowrap; color: #1e3b8b;">Product Group:</label>
              <select id="os-rep-group" class="form-control" style="width: 140px; padding: 2px 4px; font-size: 11px; height: 24px; border: 1px solid #7f9db9; background: white; color: black;">
                <option value="">-- All Groups --</option>
                ${groups.map(g => `<option value="${g}">${g}</option>`).join("")}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
              <label style="font-weight: bold; font-size: 11px; white-space: nowrap; color: #1e3b8b;">Stock Status:</label>
              <select id="os-rep-stock-filter" class="form-control" style="width: 155px; padding: 2px 4px; font-size: 11px; height: 24px; border: 1px solid #7f9db9; background: white; color: black;">
                <option value="all">All Opening Stock</option>
                <option value="nonZero">Non-Zero Stock Only (Qty > 0)</option>
                <option value="zero">Zero Stock Only (Qty = 0)</option>
              </select>
            </div>

            <span id="os-rep-filter-badge" style="font-size: 11px; font-weight: bold; color: #1e3b8b; margin-left: auto;"></span>
          </div>

        </div>

        <!-- KPI Summary Cards -->
        <div class="no-print" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px;">
          <div style="background: #e8edf5; border: 1px solid #a5c3e5; border-radius: 3px; padding: 8px 12px;">
            <div style="font-size: 11px; color: #475569; font-weight: bold; text-transform: uppercase;">Total Opening Stock Valuation</div>
            <div style="font-size: 16px; font-weight: bold; color: #1e3b8b;" id="os-rep-card-val">₹0.00</div>
            <div style="font-size: 10px; color: #64748b;">Mapped directly to P&L and Trial Balance</div>
          </div>
          <div style="background: #e8edf5; border: 1px solid #a5c3e5; border-radius: 3px; padding: 8px 12px;">
            <div style="font-size: 11px; color: #475569; font-weight: bold; text-transform: uppercase;">Total Opening Quantity</div>
            <div style="font-size: 16px; font-weight: bold; color: #047857;" id="os-rep-card-qty">0.00 Units</div>
            <div style="font-size: 10px; color: #64748b;">Combined total items in opening inventory</div>
          </div>
          <div style="background: #e8edf5; border: 1px solid #a5c3e5; border-radius: 3px; padding: 8px 12px;">
            <div style="font-size: 11px; color: #475569; font-weight: bold; text-transform: uppercase;">Total Stock Items</div>
            <div style="font-size: 16px; font-weight: bold; color: #b91c1c;" id="os-rep-card-count">0 Items</div>
            <div style="font-size: 10px; color: #64748b;">Active items with opening balances</div>
          </div>
        </div>

        <!-- Table Container -->
        <div style="flex: 1 1 0; min-height: 0; background: white; border: 1px solid #a5c3e5; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #1e293b; color: white; border-bottom: 2px solid #475569; position: sticky; top: 0; z-index: 10;">
                <th class="os-th-sort" data-col="slNo" style="padding: 6px 8px; text-align: center; width: 50px; cursor: pointer; user-select: none;" title="Click to sort by Sl No">Sl No <span class="os-sort-icon" data-col="slNo"></span></th>
                <th class="os-th-sort" data-col="name" style="padding: 6px 8px; text-align: left; cursor: pointer; user-select: none;" title="Click to sort by Product Name">Product Name <span class="os-sort-icon" data-col="name"></span></th>
                <th class="os-th-sort" data-col="code" style="padding: 6px 8px; text-align: left; cursor: pointer; user-select: none;" title="Click to sort by Code / Model">Code / Model <span class="os-sort-icon" data-col="code"></span></th>
                <th class="os-th-sort" data-col="batch" style="padding: 6px 8px; text-align: left; cursor: pointer; user-select: none;" title="Click to sort by Batch Name">Batch Name <span class="os-sort-icon" data-col="batch"></span></th>
                <th class="os-th-sort" data-col="unit" style="padding: 6px 8px; text-align: center; width: 70px; cursor: pointer; user-select: none;" title="Click to sort by Unit">Unit <span class="os-sort-icon" data-col="unit"></span></th>
                <th class="os-th-sort" data-col="qty" style="padding: 6px 8px; text-align: right; width: 130px; cursor: pointer; user-select: none;" title="Click to sort by Opening Qty">Opening Qty <span class="os-sort-icon" data-col="qty"></span></th>
                <th class="os-th-sort" data-col="rate" style="padding: 6px 8px; text-align: right; width: 120px; cursor: pointer; user-select: none;" title="Click to sort by Landing Cost">Landing Cost <span class="os-sort-icon" data-col="rate"></span></th>
                <th class="os-th-sort" data-col="val" style="padding: 6px 8px; text-align: right; width: 150px; cursor: pointer; user-select: none;" title="Click to sort by Opening Stock Value">Opening Stock Value <span class="os-sort-icon" data-col="val"></span></th>
              </tr>
            </thead>
            <tbody id="os-rep-tbody">
              <!-- Rendered items -->
            </tbody>
            <tfoot>
              <tr style="background: #e8edf5; font-weight: bold; border-top: 2px solid #000; font-size: 12px; position: sticky; bottom: 0;">
                <td colspan="5" style="padding: 6px 8px; text-align: right; border-right: 1px solid #bbb;">Total Opening Stock:</td>
                <td style="padding: 6px 8px; text-align: right; border-right: 1px solid #bbb;" id="os-rep-foot-qty">0.00</td>
                <td style="padding: 6px 8px; text-align: right; border-right: 1px solid #bbb;">-</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #1e3b8b;" id="os-rep-foot-val">₹0.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    function updateHeaderIcons() {
      container.querySelectorAll(".os-sort-icon").forEach(span => {
        const col = span.getAttribute("data-col");
        if (col === sortCol) {
          span.innerHTML = sortDir === "asc"
            ? `<i class="fa-solid fa-sort-up" style="color: #60a5fa; margin-left: 4px; font-size: 11px;"></i>`
            : `<i class="fa-solid fa-sort-down" style="color: #60a5fa; margin-left: 4px; font-size: 11px;"></i>`;
        } else {
          span.innerHTML = `<i class="fa-solid fa-sort" style="opacity: 0.35; margin-left: 4px; font-size: 10px;"></i>`;
        }
      });
    }

    function refreshRegister() {
      const search = document.getElementById("os-rep-search")?.value?.toLowerCase().trim() || "";
      const catVal = document.getElementById("os-rep-cat")?.value || "";
      const compVal = document.getElementById("os-rep-comp")?.value || "";
      const groupVal = document.getElementById("os-rep-group")?.value || "";
      const stockVal = document.getElementById("os-rep-stock-filter")?.value || "all";

      const currentMaterials = state.getMaterials();
      const allRows = [];
      let itemIndex = 0;
      let totalBatchesFound = 0;

      currentMaterials.forEach(m => {
        const mName = String(m.name || "").trim();
        const mCode = String(m.code || m.id || "").trim();
        const mCat = String(m.category || "").trim();
        const mComp = String(m.company || "").trim();
        const mGroup = String(m.productGroup || "").trim();

        // Dropdown Filter Checks
        if (catVal && mCat.toLowerCase() !== catVal.toLowerCase()) return;
        if (compVal && mComp.toLowerCase() !== compVal.toLowerCase()) return;
        if (groupVal && mGroup.toLowerCase() !== groupVal.toLowerCase()) return;

        const batches = (m.batches && m.batches.length > 0) ? sortBatches(m.batches) : [{
          batchNo: mCode || "DEFAULT",
          openingStock: parseFloat(m.openingStock) || parseFloat(m.stock) || 0,
          landingCost: parseFloat(m.landingCost) || parseFloat(m.purchasePrice) || parseFloat(m.cost) || 0
        }];

        batches.forEach(b => {
          const bNo = String(b.batchNo || "DEFAULT").trim();
          const qty = parseFloat(b.openingStock) || 0;
          const rate = parseFloat(b.landingCost) || parseFloat(b.cost) || parseFloat(m.landingCost) || parseFloat(m.purchasePrice) || 0;
          const val = qty * rate;

          totalBatchesFound++;

          // Stock Status Filter Check
          if (stockVal === "nonZero" && qty <= 0) return;
          if (stockVal === "zero" && qty !== 0) return;
          if (stockVal === "all" && qty === 0 && val === 0 && !search && !catVal && !compVal && !groupVal) return;

          // Search Filter Check
          if (search) {
            const match = mName.toLowerCase().includes(search) || 
                          mCode.toLowerCase().includes(search) || 
                          bNo.toLowerCase().includes(search) ||
                          mCat.toLowerCase().includes(search) ||
                          mComp.toLowerCase().includes(search) ||
                          mGroup.toLowerCase().includes(search);
            if (!match) return;
          }

          itemIndex++;
          allRows.push({
            origIndex: itemIndex,
            matId: m.id,
            mName,
            mCode,
            bNo,
            unit: m.unit || 'Nos',
            qty,
            rate,
            val
          });
        });
      });

      // Update Filter Badge Status
      const badgeEl = document.getElementById("os-rep-filter-badge");
      if (badgeEl) {
        const hasFilter = search || catVal || compVal || groupVal || stockVal !== "all";
        if (hasFilter) {
          badgeEl.innerHTML = `<span style="background: #1e3b8b; color: white; padding: 2px 8px; border-radius: 10px;"><i class="fa-solid fa-filter"></i> Filtered: ${allRows.length} items</span>`;
        } else {
          badgeEl.textContent = `Showing all ${allRows.length} items`;
        }
      }

      // Sort rows based on sortCol and sortDir
      allRows.sort((a, b) => {
        let diff = 0;
        switch (sortCol) {
          case "slNo":
            diff = a.origIndex - b.origIndex;
            break;
          case "name":
            diff = a.mName.localeCompare(b.mName, undefined, { numeric: true, sensitivity: 'base' });
            break;
          case "code":
            diff = a.mCode.localeCompare(b.mCode, undefined, { numeric: true, sensitivity: 'base' });
            break;
          case "batch":
            const numA = parseFloat(a.bNo);
            const numB = parseFloat(b.bNo);
            if (!isNaN(numA) && !isNaN(numB)) {
              diff = numA - numB;
            } else {
              diff = a.bNo.localeCompare(b.bNo, undefined, { numeric: true, sensitivity: 'base' });
            }
            break;
          case "unit":
            diff = a.unit.localeCompare(b.unit);
            break;
          case "qty":
            diff = a.qty - b.qty;
            break;
          case "rate":
            diff = a.rate - b.rate;
            break;
          case "val":
            diff = a.val - b.val;
            break;
          default:
            diff = a.mName.localeCompare(b.mName, undefined, { numeric: true, sensitivity: 'base' });
            break;
        }

        if (diff === 0) {
          diff = a.mName.localeCompare(b.mName, undefined, { numeric: true, sensitivity: 'base' });
        }

        return sortDir === "asc" ? diff : -diff;
      });

      let totalQty = 0;
      let totalVal = 0;
      let totalCount = allRows.length;
      let slNo = 0;
      let rowsHtml = "";

      allRows.forEach(item => {
        slNo++;
        totalQty += item.qty;
        totalVal += item.val;

        rowsHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; font-size: 12px; cursor: pointer; ${item.qty < 0 ? 'color: #dc2626; font-weight: bold;' : ''}" title="Double-click to edit opening stock" data-id="${item.matId}">
            <td style="padding: 5px 8px; text-align: center; border-right: 1px solid #e2e8f0; color: #64748b;">${slNo}</td>
            <td style="padding: 5px 8px; border-right: 1px solid #e2e8f0; font-weight: bold; ${item.qty < 0 ? 'color: #dc2626;' : 'color: #1e293b;'}">${item.mName}</td>
            <td style="padding: 5px 8px; border-right: 1px solid #e2e8f0;"><code style="background: #e2e8f0; padding: 2px 4px; font-size: 11px;">${item.mCode}</code></td>
            <td style="padding: 5px 8px; border-right: 1px solid #e2e8f0; color: #475569;">Batch ${item.bNo}</td>
            <td style="padding: 5px 8px; text-align: center; border-right: 1px solid #e2e8f0;">${item.unit}</td>
            <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #e2e8f0; font-weight: bold; ${item.qty < 0 ? 'color: #dc2626;' : ''}">${item.qty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 5px 8px; text-align: right; border-right: 1px solid #e2e8f0;">₹${item.rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 5px 8px; text-align: right; font-weight: bold; color: #1e3b8b;">₹${item.val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      });

      if (!rowsHtml) {
        rowsHtml = `<tr><td colspan="8" style="padding: 20px; text-align: center; color: #888;">No opening stock items found matching active filters.</td></tr>`;
      }

      const tbody = document.getElementById("os-rep-tbody");
      if (tbody) tbody.innerHTML = rowsHtml;

      const fmtVal = "₹" + totalVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const fmtQty = totalQty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      if (document.getElementById("os-rep-card-val")) document.getElementById("os-rep-card-val").textContent = fmtVal;
      if (document.getElementById("os-rep-card-qty")) document.getElementById("os-rep-card-qty").textContent = fmtQty + " Units";
      if (document.getElementById("os-rep-card-count")) document.getElementById("os-rep-card-count").textContent = totalCount + " Items";

      if (document.getElementById("os-rep-foot-qty")) document.getElementById("os-rep-foot-qty").textContent = fmtQty;
      if (document.getElementById("os-rep-foot-val")) document.getElementById("os-rep-foot-val").textContent = fmtVal;

      updateHeaderIcons();

      tbody?.querySelectorAll("tr[data-id]").forEach(tr => {
        tr.addEventListener("dblclick", () => {
          const matId = tr.getAttribute("data-id");
          showEnterOpeningStockModal(matId, refreshRegister);
        });
      });
    }

    // Attach Header Click Sort Event Listeners
    container.querySelectorAll(".os-th-sort").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.getAttribute("data-col");
        if (sortCol === col) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortCol = col;
          sortDir = (col === "qty" || col === "rate" || col === "val") ? "desc" : "asc";
        }

        // Keep Toolbar Dropdown in sync
        const mapKey = sortCol + (sortDir === "asc" ? "Asc" : "Desc");
        const dropdown = document.getElementById("os-rep-sort");
        if (dropdown && dropdown.querySelector(`option[value="${mapKey}"]`)) {
          dropdown.value = mapKey;
        }

        refreshRegister();
      });
    });

    // Attach Filter Control Change Event Listeners
    document.getElementById("os-rep-search")?.addEventListener("input", refreshRegister);
    document.getElementById("os-rep-cat")?.addEventListener("change", refreshRegister);
    document.getElementById("os-rep-comp")?.addEventListener("change", refreshRegister);
    document.getElementById("os-rep-group")?.addEventListener("change", refreshRegister);
    document.getElementById("os-rep-stock-filter")?.addEventListener("change", refreshRegister);
    
    document.getElementById("os-rep-sort")?.addEventListener("change", (e) => {
      const v = e.target.value;
      if (v.endsWith("Asc")) {
        sortCol = v.replace("Asc", "");
        sortDir = "asc";
      } else if (v.endsWith("Desc")) {
        sortCol = v.replace("Desc", "");
        sortDir = "desc";
      }
      refreshRegister();
    });

    // Reset Filters Listener
    document.getElementById("btn-os-rep-reset-filters")?.addEventListener("click", () => {
      if (document.getElementById("os-rep-search")) document.getElementById("os-rep-search").value = "";
      if (document.getElementById("os-rep-cat")) document.getElementById("os-rep-cat").value = "";
      if (document.getElementById("os-rep-comp")) document.getElementById("os-rep-comp").value = "";
      if (document.getElementById("os-rep-group")) document.getElementById("os-rep-group").value = "";
      if (document.getElementById("os-rep-stock-filter")) document.getElementById("os-rep-stock-filter").value = "all";
      if (document.getElementById("os-rep-sort")) document.getElementById("os-rep-sort").value = "nameAsc";
      sortCol = "name";
      sortDir = "asc";
      refreshRegister();
    });

    document.getElementById("btn-os-rep-edit")?.addEventListener("click", () => {
      showOpeningStockEntryModal(container);
    });

    document.getElementById("btn-os-rep-print")?.addEventListener("click", () => {
      window.print();
    });

    document.getElementById("btn-os-rep-close")?.addEventListener("click", () => {
      const modalOverlay = container.closest(".modal-overlay");
      if (modalOverlay) {
        modalOverlay.remove();
      } else {
        window.location.hash = "";
      }
    });

    refreshRegister();
  } catch (err) {
    console.error("Error rendering Opening Stock Register:", err);
  }
}

export function showOpeningStockRegisterModal() {
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const modalId = "modal-opening-stock-register-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    existing.style.zIndex = String(2000 + root.children.length * 10);
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
  modalEl.style.zIndex = String(2000 + root.children.length * 10);
  modalEl.style.display = "flex";
  modalEl.style.alignItems = "center";
  modalEl.style.justifyContent = "center";

  modalEl.innerHTML = `
    <div class="modal-content" style="width: 1250px; max-width: 96%; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); overflow: hidden; font-family: Tahoma, sans-serif;">
      <div class="modal-header" style="background: linear-gradient(to right, #1e3b8b, #3b82f6); color: #fff; padding: 8px 14px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a;">
        <span><i class="fa-solid fa-boxes-stacked" style="margin-right: 6px;"></i> Opening Stock Register</span>
        <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; font-weight: bold;">&times;</button>
      </div>
      <div class="modal-body-container" style="padding: 10px; overflow-y: auto; flex-grow: 1; background-color: #f1f5f9; display: flex; flex-direction: column;">
      </div>
    </div>
  `;

  root.appendChild(modalEl);
  const bodyContainer = modalEl.querySelector(".modal-body-container");
  renderOpeningStockRegisterReport(bodyContainer);

  const closeBtn = modalEl.querySelector(".modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => modalEl.remove());
}

