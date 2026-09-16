import { state } from "../state.js";

let activeCategoryFilter = "all";
let searchFilter = "";

export function renderInventory(container) {
  const materials = state.getMaterials();
  const categories = state.getCategories();

  // Compile product records aggregating all their batches
  const productRecords = [];
  materials.forEach(m => {
    const totalStock = m.stock || 0;
    const avgLanding = m.landingCost || 0;
    const totalValuation = totalStock * avgLanding;

    productRecords.push({
      materialId: m.id,
      name: m.name,
      code: m.code,
      category: m.category,
      productGroup: m.productGroup,
      hsnCode: m.hsnCode,
      unit: m.unit,
      reorderLevel: m.reorderLevel,
      stock: totalStock,
      landingCost: avgLanding,
      mrp: m.mrp || 0,
      value: totalValuation
    });
  });

  const totalValuation = productRecords.reduce((sum, r) => sum + r.value, 0);
  const totalItemsCount = materials.length;
  const lowStockCount = materials.filter(m => {
    return (m.stock || 0) <= (m.reorderLevel || 0);
  }).length;

  const filteredRecords = productRecords.filter(r => {
    const matchesCategory = activeCategoryFilter === "all" || r.category === activeCategoryFilter;
    const matchesSearch = r.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          r.code.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  container.innerHTML = `
    <!-- Top Stats Row -->
    <div class="metrics-grid">
      <div class="metric-card cash">
        <div class="metric-icon"><i class="fa-solid fa-calculator"></i></div>
        <div class="metric-details">
          <span class="metric-label">Stock Asset Valuation</span>
          <span class="metric-value">₹${totalValuation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="metric-card sales">
        <div class="metric-icon"><i class="fa-solid fa-pallet"></i></div>
        <div class="metric-details">
          <span class="metric-label">Total Unique Products</span>
          <span class="metric-value">${totalItemsCount}</span>
        </div>
      </div>
      <div class="metric-card expenses">
        <div class="metric-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="metric-details">
          <span class="metric-label">Low Stock Items</span>
          <span class="metric-value ${lowStockCount > 0 ? 'text-danger' : 'text-success'}">${lowStockCount}</span>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="action-header">
      <div class="filters-row">
        <div class="form-group" style="margin-bottom: 0;">
          <input type="text" id="search-material" class="form-control" placeholder="Search by name/code..." value="${searchFilter}" style="width: 250px;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <select id="filter-category" class="form-control" style="width: 180px;">
            <option value="all" ${activeCategoryFilter === "all" ? "selected" : ""}>All Categories</option>
            ${categories.map(cat => `
              <option value="${cat}" ${activeCategoryFilter === cat ? "selected" : ""}>${cat}</option>
            `).join("")}
          </select>
        </div>
      </div>
      <div class="filters-row">
        <button class="btn btn-secondary btn-adjust-stock" id="btn-adjust-stock"><i class="fa-solid fa-sliders"></i> Stock Adjustment</button>
        <button class="btn btn-primary" id="btn-add-product-master"><i class="fa-solid fa-plus"></i> Product Master (New)</button>
      </div>
    </div>

    <!-- Materials Table -->
    <div class="panel" style="padding-top: 0.5rem;">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Material Name</th>
              <th>Category</th>
              <th>Group</th>
              <th>HSN Code</th>
              <th>Stock</th>
              <th>Unit</th>
              <th style="text-align: right;">Landing Cost</th>
              <th style="text-align: right;">MRP</th>
              <th style="text-align: right;">Stock Value</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.length === 0 ? `
              <tr>
                <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 3rem;">No materials match the filter criteria.</td>
              </tr>
            ` : filteredRecords.map(r => {
              const isLow = r.stock <= r.reorderLevel;
              
              return `
                <tr>
                  <td><code class="highlight-text" style="font-weight:700;">${r.code}</code></td>
                  <td>
                    <strong>${r.name}</strong>
                  </td>
                  <td><span class="badge muted">${r.category}</span></td>
                  <td>${r.productGroup || "-"}</td>
                  <td><code>${r.hsnCode || "-"}</code></td>
                  <td>
                    <span style="font-weight: 700;" class="${isLow ? 'text-danger' : 'text-success'}">
                      ${r.stock.toLocaleString()}
                    </span>
                    ${isLow ? `<i class="fa-solid fa-circle-exclamation text-danger" style="margin-left: 0.25rem;" title="Low Stock Alert"></i>` : ""}
                  </td>
                  <td>${r.unit}</td>
                  <td style="text-align: right;">₹${r.landingCost.toFixed(2)}</td>
                  <td style="text-align: right;">₹${r.mrp.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600;">₹${r.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td style="text-align: center;">
                    <button class="btn btn-secondary btn-icon edit-pm-btn" data-id="${r.materialId}" title="Open Product Master"><i class="fa-solid fa-pen-to-square"></i> Master</button>
                    <button class="btn btn-secondary btn-icon adjust-single-btn" data-id="${r.materialId}" title="Adjust stock"><i class="fa-solid fa-sliders"></i></button>
                    <button class="btn btn-danger btn-icon delete-pm-btn" data-id="${r.materialId}" style="background-color:#ef4444; color:white; border:none;" title="Delete product"><i class="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // --- Attach Event Listeners ---
  const searchInput = document.getElementById("search-material");
  searchInput.addEventListener("input", (e) => {
    searchFilter = e.target.value;
    renderInventory(container);
    document.getElementById("search-material").focus();
  });

  const categoryFilter = document.getElementById("filter-category");
  categoryFilter.addEventListener("change", (e) => {
    activeCategoryFilter = e.target.value;
    renderInventory(container);
  });

  document.getElementById("btn-add-product-master").addEventListener("click", () => {
    showProductMasterModal(container, null, null);
  });

  document.querySelectorAll(".edit-pm-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showProductMasterModal(container, btn.getAttribute("data-id"), btn.getAttribute("data-batch"));
    });
  });

  document.getElementById("btn-adjust-stock").addEventListener("click", () => {
    import("./transactions.js").then(m => {
      m.showStockAdjustWizard(container);
    });
  });

  document.querySelectorAll(".adjust-single-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      import("./transactions.js").then(m => {
        m.showStockAdjustWizard(container);
      });
    });
  });

  document.querySelectorAll(".delete-pm-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const mat = state.getMaterials().find(m => m.id === id);
      if (mat && confirm(`Are you sure you want to delete product "${mat.name}"?`)) {
        try {
          state.deleteMaterial(id);
          renderInventory(container);
        } catch (e) {
          alert(e.message);
        }
      }
    });
  });
}

// -------------------------------------------------------------
// COMPREHENSIVE PRODUCT MASTER FORM DIALOG WORKSPACE
// -------------------------------------------------------------
export function showProductMasterModal(container, materialId, batchNo, onSuccess = null) {
  const root = document.getElementById("modal-container-root");
  const isEdit = !!materialId;
  const mat = isEdit ? state.getMaterials().find(m => m.id === materialId) : null;
  // Backward compat: if preset loading set a charge but flag wasn't written, still show as enabled
  const loadingEnabled = isEdit && (mat.loadingChargeEnabled === true || (mat.loadingChargeEnabled === undefined && (mat.loadingCharge || 0) > 0));

  // Retrieve metadata lists
  const currentGroups = [...state.getProductGroups()];
  const currentCompanies = [...state.getCompanies()];
  const currentCategories = [...state.getCategories()];
  const currentSubCategories = [...state.getSubCategories()];
  const currentNames = [...state.getProductNames()];
  const currentHsn = [...state.getHsnCodes()];

  if (isEdit && mat) {
    if (mat.name && !currentNames.includes(mat.name)) currentNames.push(mat.name);
    if (mat.productGroup && !currentGroups.includes(mat.productGroup)) currentGroups.push(mat.productGroup);
    if (mat.company && !currentCompanies.includes(mat.company)) currentCompanies.push(mat.company);
    if (mat.category && !currentCategories.includes(mat.category)) currentCategories.push(mat.category);
    if (mat.subCategory && !currentSubCategories.includes(mat.subCategory)) currentSubCategories.push(mat.subCategory);
    if (mat.hsnCode && !currentHsn.includes(mat.hsnCode)) currentHsn.push(mat.hsnCode);
  }

  // Render a Desktop-like double-column Product Master Overlay
  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-inv" style="display:flex;">
      <div class="modal-container modal-lg" style="max-width:1150px; background-color: #cbd5e1; color: #0f172a; padding: 10px; font-family: var(--font-body); border: 2px solid #64748b;">
        
        <!-- Header Ribbon -->
        <div style="background-color: #3b82f6; color: white; display: flex; justify-content: space-between; align-items: center; padding: 4px 10px; font-weight: 700; font-size: 0.9rem; border-radius: var(--border-radius-sm) var(--border-radius-sm) 0 0;">
          <div><i class="fa-solid fa-cube"></i> PRODUCT MASTER ${isEdit ? `[Edit: ${mat.name}]` : '[New Product Details]'}</div>
          <button style="background:none; border:none; color:white; font-size:1.1rem; cursor:pointer;" id="pm-close-btn-header">&times;</button>
        </div>

        <form id="pm-form" style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
          <!-- Top Grid Panels (Left Details, Right GST/Costs) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            
            <!-- LEFT PANEL: Product Details -->
            <div style="border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 10px; border-radius: var(--border-radius-sm); display: flex; flex-direction: column; gap: 6px;">
              <div style="background-color: #3b82f6; color: white; padding: 2px 8px; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display:inline-block; max-width:120px;">Product Details</div>
              
              <!-- Product Name Dropdown List with add button -->
              <div style="display: grid; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Product Name *</label>
                <select id="pm-name" class="form-control" style="background-color:white; color:black; padding:3px 6px;" required>
                  <option value="">-- Select Product Name --</option>
                  ${currentNames.map(n => `<option value="${n}" ${isEdit && mat.name === n ? 'selected' : ''}>${n}</option>`).join("")}
                </select>
                <button type="button" class="btn btn-secondary" id="btn-add-name" style="padding: 2px; font-size:0.75rem; font-weight:bold; height:26px;" title="Add Product Name">+</button>
              </div>

              <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Code/Model *</label>
                <input type="text" id="pm-code" class="form-control" style="background-color:white; color:black; padding:3px 6px;" value="${isEdit ? mat.code : ''}" autocomplete="new-password" required placeholder="e.g. ACC, TMT-12">
              </div>



              <!-- Product Group (+ addition) -->
              <div style="display: grid; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Product Group</label>
                <select id="pm-group" class="form-control" style="background-color:white; color:black; padding:3px 6px;">
                  <option value="">-- Choose Group --</option>
                  ${currentGroups.map(g => `<option value="${g}" ${isEdit && mat.productGroup === g ? 'selected' : ''}>${g}</option>`).join("")}
                </select>
                <button type="button" class="btn btn-secondary" id="btn-add-group" style="padding: 2px; font-size:0.75rem; font-weight:bold; height:26px;" title="Add Product Group">+</button>
              </div>

              <!-- Company (+ addition) -->
              <div style="display: grid; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Company</label>
                <select id="pm-company" class="form-control" style="background-color:white; color:black; padding:3px 6px;">
                  <option value="">-- Choose Brand/Company --</option>
                  ${currentCompanies.map(c => `<option value="${c}" ${isEdit && mat.company === c ? 'selected' : ''}>${c}</option>`).join("")}
                </select>
                <button type="button" class="btn btn-secondary" id="btn-add-company" style="padding: 2px; font-size:0.75rem; font-weight:bold; height:26px;" title="Add Company">+</button>
              </div>

              <!-- Category (+ addition) -->
              <div style="display: grid; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Category</label>
                <select id="pm-category" class="form-control" style="background-color:white; color:black; padding:3px 6px;">
                  <option value="">-- Choose Category --</option>
                  ${currentCategories.map(c => `<option value="${c}" ${isEdit && mat.category === c ? 'selected' : ''}>${c}</option>`).join("")}
                </select>
                <button type="button" class="btn btn-secondary" id="btn-add-category" style="padding: 2px; font-size:0.75rem; font-weight:bold; height:26px;" title="Add Category">+</button>
              </div>

              <!-- Sub Category (+ addition) -->
              <div style="display: grid; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Sub Category</label>
                <select id="pm-subcategory" class="form-control" style="background-color:white; color:black; padding:3px 6px;">
                  <option value="">-- Choose Subcategory --</option>
                  ${currentSubCategories.map(s => `<option value="${s}" ${isEdit && mat.subCategory === s ? 'selected' : ''}>${s}</option>`).join("")}
                </select>
                <button type="button" class="btn btn-secondary" id="btn-add-subcategory" style="padding: 2px; font-size:0.75rem; font-weight:bold; height:26px;" title="Add Sub Category">+</button>
              </div>

              <!-- HSN/SAC Code dropdown (+ addition) -->
              <div style="display: grid; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">HSN/SAC Code</label>
                <select id="pm-hsn" class="form-control" style="background-color:white; color:black; padding:3px 6px;">
                  <option value="">-- Choose HSN --</option>
                  ${currentHsn.map(h => `<option value="${h}" ${isEdit && mat.hsnCode === h ? 'selected' : ''}>${h}</option>`).join("")}
                </select>
                <button type="button" class="btn btn-secondary" id="btn-add-hsn" style="padding: 2px; font-size:0.75rem; font-weight:bold; height:26px;" title="Add HSN Code">+</button>
              </div>

              <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Description</label>
                <input type="text" id="pm-description" class="form-control" style="background-color:white; color:black; padding:3px 6px;" value="${isEdit ? mat.description : ''}" autocomplete="new-password">
              </div>

              <div style="display: grid; grid-template-columns: 120px 1fr 100px; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Base Unit *</label>
                <select id="pm-unit" class="form-control" style="background-color:white; color:black; padding:3px 6px;" required>
                  ${state.getUnits().map(u => `
                    <option value="${u.symbol}" ${isEdit && mat.unit === u.symbol ? 'selected' : ''}>${u.name} (${u.symbol})</option>
                  `).join("")}
                </select>
                <button type="button" id="btn-pm-create-unit" class="btn btn-secondary" style="padding: 2px 4px; font-size:0.75rem;">Create New Unit</button>
              </div>

              <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Product Type</label>
                <select id="pm-type" class="form-control" style="background-color:white; color:black; padding:3px 6px;">
                  <option value="Goods" ${isEdit && mat.productType === 'Goods' ? 'selected' : ''}>Goods</option>
                  <option value="Services" ${isEdit && mat.productType === 'Services' ? 'selected' : ''}>Services</option>
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 4px;">
                  <label style="font-size:0.8rem; font-weight:700;">Batch</label>
                  <input type="text" id="pm-batch" class="form-control" style="background-color:#cbd5e1; color:black; padding:3px 6px;" value="${isEdit ? (mat.landingCost || 0).toFixed(2) : '0.00'}" readonly>
                </div>
                <div style="display: grid; grid-template-columns: 75px 1fr; align-items: center; gap: 4px;">
                  <label style="font-size:0.8rem; font-weight:600;">Expiry Date</label>
                  <input type="date" id="pm-expiry" class="form-control" style="background-color:white; color:black; padding:3px 6px;" value="">
                </div>
              </div>


            </div>

            <!-- RIGHT PANEL: Tax Settings & Costs -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              
              <!-- TAX SETTINGS PANEL -->
              <div style="border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 10px; border-radius: var(--border-radius-sm); display: flex; flex-direction: column; gap: 4px;">
                <div style="background-color: #3b82f6; color: white; padding: 2px 8px; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display:inline-block; max-width:120px;">Tax Settings</div>
                


                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">IGST %</label>
                    <select id="pm-igst" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;">
                      <option value="18" ${isEdit && mat.igst === 18 ? 'selected' : ''}>18 %</option>
                      <option value="28" ${isEdit && mat.igst === 28 ? 'selected' : ''}>28 %</option>
                      <option value="12" ${isEdit && mat.igst === 12 ? 'selected' : ''}>12 %</option>
                      <option value="5" ${isEdit && mat.igst === 5 ? 'selected' : ''}>5 %</option>
                      <option value="0" ${isEdit && mat.igst === 0 ? 'selected' : ''}>0 %</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">CGST %</label>
                    <input type="number" step="0.1" id="pm-cgst" class="form-control" style="background-color:#e2e8f0; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? mat.cgst : '9'}" readonly>
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">SGST %</label>
                    <input type="number" step="0.1" id="pm-sgst" class="form-control" style="background-color:#e2e8f0; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? mat.sgst : '9'}" readonly>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 6px; margin-top: 4px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">Cess %</label>
                    <input type="number" step="0.1" id="pm-cess" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? mat.cess : '0'}">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">Addl. Cess Amount</label>
                    <input type="number" step="0.01" id="pm-addlcess" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? mat.addlCess : '0'}">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">Cess On</label>
                    <select id="pm-cesson" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;">
                      <option value="NetValue" ${isEdit && mat.cessOn === 'NetValue' ? 'selected' : ''}>NetValue</option>
                      <option value="Qty" ${isEdit && mat.cessOn === 'Qty' ? 'selected' : ''}>Quantity</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- COSTING & PRICING PANEL -->
              <div style="border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 10px; border-radius: var(--border-radius-sm); display: flex; flex-direction: column; gap: 6px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">Landing Cost *</label>
                    <input type="number" step="0.01" id="pm-landingcost" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.landingCost || 0) : '0.00'}" autocomplete="new-password" required>
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">Margin %</label>
                    <input type="number" step="0.1" id="pm-marginpercent" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.marginPercent || 30) : '30'}" autocomplete="new-password">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">Margin Amount</label>
                    <input type="number" step="0.01" id="pm-marginamount" class="form-control" style="background-color:#e2e8f0; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.marginAmount || 0) : '0.00'}" autocomplete="new-password" readonly>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">GST Exclusive Rate</label>
                    <input type="number" step="0.01" id="pm-gstexcl" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.gstExclRate || mat.sellingPrice || 0) : '0.00'}" autocomplete="new-password">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">GST Inclusive Rate</label>
                    <input type="number" step="0.01" id="pm-gstincl" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.gstInclRate || 0) : '0.00'}" autocomplete="new-password">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">M.R.P. *</label>
                    <input type="number" step="0.01" id="pm-mrp" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.mrp || 0) : '0.00'}" autocomplete="new-password" required>
                  </div>
                </div>

                <!-- LOADING CHARGE ROW -->
                <div style="display:grid; grid-template-columns: auto 1fr 120px; align-items:center; gap:8px; background-color:#fef9c3; border:1px solid #fcd34d; border-radius:3px; padding:6px 8px; margin-top:2px;">
                  <label style="display:flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:700; color:#92400e; white-space:nowrap; cursor:pointer;">
                    <input type="checkbox" id="pm-loading-charge-enabled" style="width:14px; height:14px; accent-color:#d97706; cursor:pointer;" ${loadingEnabled ? 'checked' : ''}>
                    Loading Charge
                  </label>
                  <span style="font-size:0.7rem; color:#78350f;">Preset amount added per sale line</span>
                  <input type="number" step="0.01" min="0" id="pm-loading-charge" class="form-control" style="background-color:white; color:black; padding:2px 6px; font-size:0.8rem; border:1px solid #f59e0b;" value="${isEdit ? (mat.loadingCharge || 0).toFixed(2) : '0.00'}" autocomplete="new-password" ${!loadingEnabled ? 'disabled' : ''}>
                </div>
              </div>
            </div>
          </div>



          <!-- BOTTOM ACTION LAYOUT PANELS -->
          <div style="display:flex; justify-content:space-between; align-items:center; background-color:#cbd5e1; border-top: 1px solid #94a3b8; padding-top: 8px;">
            <div style="display:flex; gap: 4px;">
              ${isEdit ? `<button type="button" id="btn-pm-opening-stock" class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; background-color:#1e3b8b; border:1px solid #1e3b8b; color:white;"><i class="fa-solid fa-boxes-packing"></i> Opening Stock</button>` : ''}
              ${isEdit ? `<button type="button" id="btn-pm-edit-batch-rates" class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; background-color:#d97706; border:1px solid #d97706; color:white;"><i class="fa-solid fa-tags"></i> Batch Selling Rate</button>` : ''}
              <button type="button" class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; background-color:#94a3b8; border:1px solid #475569; color:black;">Import</button>
              <button type="button" class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; background-color:#94a3b8; border:1px solid #475569; color:black;">Export</button>
            </div>
            
            <div style="display:flex; gap: 6px;">
              <button type="button" class="btn btn-secondary" id="btn-pm-search" style="padding:5px 12px; font-size:0.8rem; background-color:#e2e8f0; border:1px solid #475569; color:black;"><i class="fa-solid fa-magnifying-glass"></i> Search [F10]</button>
              <button type="button" class="btn btn-secondary" id="btn-pm-new" style="padding:5px 12px; font-size:0.8rem; background-color:#f1f5f9; border:1px solid #475569; color:black;"><i class="fa-solid fa-file-plus"></i> New</button>
              <button type="submit" class="btn btn-primary" style="padding:5px 15px; font-size:0.8rem; background-color:#1e40af; border:none; color:white;"><i class="fa-solid fa-save"></i> Save</button>
              ${isEdit ? `
                <button type="button" class="btn btn-danger" id="btn-pm-delete" style="padding:5px 12px; font-size:0.8rem; border:none; color:white;"><i class="fa-solid fa-trash"></i> Delete</button>
              ` : ''}
              <button type="button" class="btn btn-secondary" id="btn-pm-close" style="padding:5px 12px; font-size:0.8rem; background-color:#f1f5f9; border:1px solid #475569; color:black;">Close</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  // --- ALTERNATE UNITS MANAGEMENT STATE ---
  let localAltUnits = isEdit ? [...mat.alternateUnits] : [];

  // Enforce uppercase on all text inputs/textareas typed in product master form
  const pmFormEl = document.getElementById("pm-form");
  if (pmFormEl) {
    pmFormEl.querySelectorAll("input[type='text'], textarea").forEach(input => {
      input.addEventListener("input", () => {
        input.value = input.value.toUpperCase();
      });
    });
  }

  // --- CALCULATION HELPERS FOR GST MARGIN ---
  const landingCostIn = document.getElementById("pm-landingcost");
  const marginPercentIn = document.getElementById("pm-marginpercent");
  const marginAmountIn = document.getElementById("pm-marginamount");
  const gstExclIn = document.getElementById("pm-gstexcl");
  const gstInclIn = document.getElementById("pm-gstincl");
  const mrpIn = document.getElementById("pm-mrp");
  const igstSelect = document.getElementById("pm-igst");
  const cgstIn = document.getElementById("pm-cgst");
  const sgstIn = document.getElementById("pm-sgst");

  igstSelect.addEventListener("change", () => {
    const igst = parseFloat(igstSelect.value) || 0;
    cgstIn.value = (igst / 2).toFixed(1);
    sgstIn.value = (igst / 2).toFixed(1);
    recalcPrices();
  });

  landingCostIn.addEventListener("input", recalcPrices);
  marginPercentIn.addEventListener("input", recalcPrices);
  gstExclIn.addEventListener("input", () => {
    const lc = parseFloat(landingCostIn.value) || 0;
    const excl = parseFloat(gstExclIn.value) || 0;
    const diff = excl - lc;
    marginAmountIn.value = diff.toFixed(2);
    if (lc > 0) {
      marginPercentIn.value = ((diff / lc) * 100).toFixed(1);
    }
    const igst = parseFloat(igstSelect.value) || 0;
    gstInclIn.value = (excl * (1 + igst / 100)).toFixed(2);
    mrpIn.value = (excl * 1.25).toFixed(2);
  });

  gstInclIn.addEventListener("input", () => {
    const incl = parseFloat(gstInclIn.value) || 0;
    const igst = parseFloat(igstSelect.value) || 0;
    const excl = incl / (1 + igst / 100);
    gstExclIn.value = excl.toFixed(2);
    
    const lc = parseFloat(landingCostIn.value) || 0;
    const diff = excl - lc;
    marginAmountIn.value = diff.toFixed(2);
    if (lc > 0) {
      marginPercentIn.value = ((diff / lc) * 100).toFixed(1);
    }
    mrpIn.value = (excl * 1.25).toFixed(2);
  });

  function recalcPrices() {
    const lc = parseFloat(landingCostIn.value) || 0;
    document.getElementById("pm-batch").value = lc.toFixed(2);
    const margP = parseFloat(marginPercentIn.value) || 0;
    const margA = lc * (margP / 100);
    marginAmountIn.value = margA.toFixed(2);
    const excl = lc + margA;
    gstExclIn.value = excl.toFixed(2);
    const igst = parseFloat(igstSelect.value) || 0;
    const incl = excl * (1 + igst / 100);
    gstInclIn.value = incl.toFixed(2);
    mrpIn.value = (excl * 1.25).toFixed(2);
  }

  // --- LOADING CHARGE CHECKBOX TOGGLE ---
  const loadingChkEl = document.getElementById("pm-loading-charge-enabled");
  const loadingAmtEl = document.getElementById("pm-loading-charge");
  if (loadingChkEl && loadingAmtEl) {
    const applyLoadingState = () => {
      if (loadingChkEl.checked) {
        loadingAmtEl.disabled = false;
        loadingAmtEl.style.backgroundColor = "white";
        loadingAmtEl.style.color = "black";
      } else {
        loadingAmtEl.disabled = true;
        loadingAmtEl.style.backgroundColor = "#e2e8f0";
        loadingAmtEl.style.color = "#94a3b8";
        loadingAmtEl.value = "0.00";
      }
    };
    applyLoadingState(); // set initial state on open
    loadingChkEl.addEventListener("change", applyLoadingState);
  }

  // --- ATTACH EVENT HANDLERS FOR THE (+) BUTTONS ---
  
  // --- HELPER FUNCTION FOR DYNAMIC MODAL PROMPTS ---
  const showCustomPrompt = (title, labelText, placeholder, onSubmit) => {
    const pRoot = document.getElementById("sub-modal-container-root") || document.getElementById("modal-container-root");
    const overlayDiv = document.createElement("div");
    overlayDiv.className = "modal-overlay active";
    overlayDiv.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(0,0,0,0.4); z-index:3000;";
    overlayDiv.innerHTML = `
      <div class="modal-container" style="max-width:400px; width:90%; background-color:#cbd5e1; color:#0f172a; padding:15px; border:2px solid #5a7b9c; border-radius:4px; font-family:'Segoe UI', sans-serif;">
        <div style="background-color:#1e3a8a; color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius:2px;">
          <span>${title}</span>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" class="btn-close-prompt">&times;</button>
        </div>
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
          <label style="font-weight:600; font-size:0.8rem;">${labelText}</label>
          <input type="text" id="prompt-input-val" style="background-color:white; color:black; border:1px solid #7a96b2; padding:5px; font-size:0.85rem;" placeholder="${placeholder}" autocomplete="new-password">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:12px; border-top:1px solid #94a3b8; padding-top:10px;">
          <button type="button" class="btn btn-primary btn-submit-prompt" style="background-color:#1e3b8b; color:white; border:none; padding:4px 14px; font-weight:bold; font-size:0.8rem;">OK</button>
          <button type="button" class="btn btn-secondary btn-close-prompt" style="background-color:#f1f5f9; color:black; border:1px solid #475569; padding:4px 14px; font-size:0.8rem;">CANCEL</button>
        </div>
      </div>
    `;
    pRoot.appendChild(overlayDiv);

    const inputVal = overlayDiv.querySelector("#prompt-input-val");
    inputVal.focus();

    // Force uppercase typed value
    inputVal.addEventListener("input", () => {
      inputVal.value = inputVal.value.toUpperCase();
    });

    const destroy = () => {
      overlayDiv.remove();
    };

    overlayDiv.querySelectorAll(".btn-close-prompt").forEach(btn => {
      btn.addEventListener("click", destroy);
    });

    overlayDiv.querySelector(".btn-submit-prompt").addEventListener("click", () => {
      const val = inputVal.value.trim().toUpperCase();
      destroy();
      if (val) onSubmit(val);
    });

    inputVal.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = inputVal.value.trim().toUpperCase();
        destroy();
        if (val) onSubmit(val);
      }
    });
  };

  // 1. Add Product Name
  document.getElementById("btn-add-name").addEventListener("click", () => {
    showCustomPrompt("ADD PRODUCT NAME", "Enter new Product Name Class:", "e.g. CEMENT, STEEL", (upperName) => {
      try {
        const added = state.addProductName(upperName);
        if (added) {
          const select = document.getElementById("pm-name");
          repopulateSelect(select, state.getProductNames(), upperName);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // 2. Add Group
  document.getElementById("btn-add-group").addEventListener("click", () => {
    showCustomPrompt("ADD PRODUCT GROUP", "Enter new Product Group:", "e.g. STRUCTURAL SUPPLY", (upperName) => {
      try {
        const added = state.addProductGroup(upperName);
        if (added) {
          const select = document.getElementById("pm-group");
          repopulateSelect(select, state.getProductGroups(), upperName);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // 3. Add Company
  document.getElementById("btn-add-company").addEventListener("click", () => {
    showCustomPrompt("ADD COMPANY / BRAND", "Enter new Company / Brand:", "e.g. ULTRATECH", (upperName) => {
      try {
        const added = state.addCompany(upperName);
        if (added) {
          const select = document.getElementById("pm-company");
          repopulateSelect(select, state.getCompanies(), upperName);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // 4. Add Category
  document.getElementById("btn-add-category").addEventListener("click", () => {
    showCustomPrompt("ADD CATEGORY", "Enter new Category:", "e.g. CEMENT", (upperName) => {
      try {
        const added = state.addCategory(upperName);
        if (added) {
          const select = document.getElementById("pm-category");
          repopulateSelect(select, state.getCategories(), upperName);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // 5. Add Subcategory
  document.getElementById("btn-add-subcategory").addEventListener("click", () => {
    showCustomPrompt("ADD SUBCATEGORY", "Enter new Sub Category:", "e.g. OPC 53", (upperName) => {
      try {
        const added = state.addSubCategory(upperName);
        if (added) {
          const select = document.getElementById("pm-subcategory");
          repopulateSelect(select, state.getSubCategories(), upperName);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // Add HSN Code
  document.getElementById("btn-add-hsn").addEventListener("click", () => {
    const is4Digit = state.getOptions().enable4DigitHsn !== false;
    const digitCount = is4Digit ? 4 : 8;
    showCustomPrompt("ADD HSN CODE", `Enter new ${digitCount}-digit HSN Code:`, `e.g. ${is4Digit ? "2523" : "25230000" }`, (clean) => {
      const regex = is4Digit ? /^\d{4}$/ : /^\d{8}$/;
      if (!regex.test(clean)) {
        alert(`ERROR: HSN CODE MUST BE EXACTLY ${digitCount} DIGITS.`);
        return;
      }
      try {
        const added = state.addHsnCode(clean);
        if (added) {
          const select = document.getElementById("pm-hsn");
          repopulateSelect(select, state.getHsnCodes(), clean);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // 6. Create New Unit
  document.getElementById("btn-pm-create-unit").addEventListener("click", () => {
    import("./units.js").then(m => {
      m.showUnitSettingsModal(document.getElementById("sub-modal-container-root"), null, (newUnitSymbol) => {
        const pmUnitSelect = document.getElementById("pm-unit");
        const altUnitSelect = document.getElementById("alt-unit");
        
        const units = state.getUnits();
        
        pmUnitSelect.innerHTML = units.map(u => `
          <option value="${u.symbol}" ${u.symbol === newUnitSymbol ? 'selected' : ''}>${u.name} (${u.symbol})</option>
        `).join("");
        pmUnitSelect.value = newUnitSymbol;

        if (altUnitSelect) {
          altUnitSelect.innerHTML = units.map(u => `
            <option value="${u.symbol}">${u.symbol}</option>
          `).join("");
        }
      });
    });
  });

  function repopulateSelect(selectElement, array, selectedValue) {
    const placeholderText = selectElement.options[0].text;
    selectElement.innerHTML = `<option value="">${placeholderText}</option>` + 
      array.map(val => `<option value="${val}" ${val === selectedValue ? 'selected' : ''}>${val}</option>`).join("");
  }

  // --- ACTIONS AT BOTTOM LAYOUT ---
  const overlay = document.getElementById("modal-overlay-inv");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };

  document.getElementById("pm-close-btn-header").addEventListener("click", close);
  document.getElementById("btn-pm-close").addEventListener("click", close);

  let localRack = isEdit ? mat.rackNo : "";
  let localReorder = isEdit ? mat.reorderLevel : 50;
  let localDiscount = isEdit ? mat.defaultDiscount : 0;



  document.getElementById("btn-pm-search").addEventListener("click", () => {
    close();
    window.location.hash = "#inventory";
  });

  document.getElementById("btn-pm-new").addEventListener("click", () => {
    showProductMasterModal(container, null, null);
  });

  if (isEdit) {
    const btnOs = document.getElementById("btn-pm-opening-stock");
    if (btnOs) {
      btnOs.addEventListener("click", () => {
        import("./openingStock.js").then(m => {
          m.showEnterOpeningStockModal(materialId, () => {
            const updatedMat = state.getMaterials().find(x => x.id === materialId);
            if (updatedMat) {
              const batchIn = document.getElementById("pm-batch");
              if (batchIn) batchIn.value = (updatedMat.landingCost || 0).toFixed(2);
              const landingCostIn = document.getElementById("pm-landingcost");
              if (landingCostIn) landingCostIn.value = (updatedMat.landingCost || 0).toFixed(2);
              if (typeof recalcPrices === "function") recalcPrices();
            }
          });
        });
      });
    }
    
    const btnBatchRates = document.getElementById("btn-pm-edit-batch-rates");
    if (btnBatchRates) {
      btnBatchRates.addEventListener("click", () => {
        showBatchSellingRateModal(materialId, () => {
          // Re-populate pricing inputs with the latest batch values if needed
          const updatedMat = state.getMaterials().find(x => x.id === materialId);
          if (updatedMat) {
            const landingCostIn = document.getElementById("pm-landingcost");
            if (landingCostIn) landingCostIn.value = (updatedMat.landingCost || 0).toFixed(2);
            const gstExclIn = document.getElementById("pm-gstexcl");
            if (gstExclIn) gstExclIn.value = (updatedMat.gstExclRate || 0).toFixed(2);
            if (typeof recalcPrices === "function") recalcPrices();
          }
        });
      });
    }

    document.getElementById("btn-pm-delete").addEventListener("click", () => {
      if (confirm(`Are you sure you want to permanently delete product ${mat.name}?`)) {
        try {
          state.deleteMaterial(mat.id);
          close();
          renderInventory(container);
        } catch (e) {
          alert(e.message);
        }
      }
    });
  }

  // Keyboard Navigation & Save
  const pmForm = document.getElementById("pm-form");
  pmForm.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // If it's a textarea or button, let default behavior happen
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") {
        return;
      }
      e.preventDefault();
      
      // Find all focusable elements inside the form
      const focusable = Array.from(pmForm.querySelectorAll("input:not([disabled]):not([readonly]), select, textarea, button:not([type='button'])"));
      const index = focusable.indexOf(e.target);
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus();
      }
    } else if (e.key.toLowerCase() === "a" && e.ctrlKey) {
      e.preventDefault();
      if (pmForm.checkValidity()) {
        if (typeof pmForm.requestSubmit === "function") {
          pmForm.requestSubmit();
        } else {
          const submitEvent = new Event("submit", { cancelable: true });
          pmForm.dispatchEvent(submitEvent);
        }
      } else {
        pmForm.reportValidity();
      }
    }
  });

  // Form submit (SAVE)
  document.getElementById("pm-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const dataObj = {
      name: document.getElementById("pm-name").value,
      code: document.getElementById("pm-code").value,
      barcode: document.getElementById("pm-barcode") ? document.getElementById("pm-barcode").value : "",
      eanCode: document.getElementById("pm-ean") ? document.getElementById("pm-ean").value : "",
      productGroup: document.getElementById("pm-group").value,
      company: document.getElementById("pm-company").value,
      category: document.getElementById("pm-category").value,
      subCategory: document.getElementById("pm-subcategory").value,
      hsnCode: document.getElementById("pm-hsn").value,
      description: document.getElementById("pm-description").value,
      unit: document.getElementById("pm-unit").value,
      productType: document.getElementById("pm-type").value,
      
      batchNo: document.getElementById("pm-batch").value,
      expiryDate: document.getElementById("pm-expiry").value,
      stock: parseFloat(document.getElementById("pm-stock")?.value || 0),

      reorderLevel: localReorder,
      rackNo: localRack,
      defaultDiscount: localDiscount,

      igst: document.getElementById("pm-igst").value,
      cgst: cgstIn.value,
      sgst: sgstIn.value,
      cess: document.getElementById("pm-cess").value,
      addlCess: document.getElementById("pm-addlcess").value,
      cessOn: document.getElementById("pm-cesson").value,

      landingCost: landingCostIn.value,
      marginPercent: marginPercentIn.value,
      marginAmount: marginAmountIn.value,
      gstExclRate: gstExclIn.value,
      gstInclRate: gstInclIn.value,
      mrp: mrpIn.value,
      alternateUnits: localAltUnits,
      loadingChargeEnabled: document.getElementById("pm-loading-charge-enabled")?.checked || false,
      loadingCharge: parseFloat(document.getElementById("pm-loading-charge")?.value) || 0
    };

    try {
      let savedMat = null;
      if (isEdit) {
        savedMat = state.updateMaterial(materialId, dataObj);
      } else {
        savedMat = state.addMaterial(dataObj);
      }
      
      if (onSuccess) {
        close();
        onSuccess();
      } else {
        alert("PRODUCT SAVED SUCCESSFULLY.");
        renderInventory(container);
        // Reset form for next entry if it was a new creation
        if (!isEdit) {
          showProductMasterModal(container, null, null);
        }
      }

      if (savedMat && confirm('DO YOU WANT TO ENTER OPENING STOCK DETAILS FOR THIS PRODUCT?')) {
        import("./openingStock.js").then(m => {
          m.showEnterOpeningStockModal(savedMat.id, () => {
            renderInventory(container);
          });
        });
      }
    } catch (err) {
      alert(err.message);
    }
  });
}

// -------------------------------------------------------------
// STOCK ADJUSTMENT MODAL DIALOG
// -------------------------------------------------------------
function showAdjustStockModal(container, preselectedMaterialId, preselectedBatchNo) {
  const materials = state.getMaterials();
  const root = document.getElementById("modal-container-root");

  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-inv">
      <div class="modal-container" style="max-width:550px; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #64748b;">
        <div class="modal-header" style="background-color:#1e3b8b; color:white; padding:4px 8px; border-radius: var(--border-radius-sm);">
          <h3>Record Stock Adjustment</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-modal" style="background:none; border:none; color:white; font-size:1.1rem; cursor:pointer;">&times;</button>
        </div>
        <form id="adjust-stock-form" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          <div class="modal-body">
            <div class="form-group">
              <label style="font-size:0.8rem; font-weight:600;">Select Material *</label>
              <select id="adj-material" class="form-control" style="background-color:white; color:black;" required>
                <option value="">-- Choose Building Material --</option>
                ${materials.map(m => `
                  <option value="${m.id}" ${m.id === preselectedMaterialId ? "selected" : ""}>
                    ${m.name} (${m.code})
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="form-group" style="margin-top:8px;">
              <label style="font-size:0.8rem; font-weight:600;">Select Batch *</label>
              <select id="adj-batch" class="form-control" style="background-color:white; color:black;" required>
                <option value="">-- Select Batch --</option>
              </select>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top:8px;">
              <div class="form-group">
                <label style="font-size:0.8rem; font-weight:600;">Adjustment Qty (+ or -) *</label>
                <input type="number" step="0.01" id="adj-qty" class="form-control" style="background-color:white; color:black;" placeholder="e.g. -10 or 25" required>
                <span style="font-size: 0.65rem; color: #475569;">Use negative for losses, positive for gains.</span>
              </div>
              <div class="form-group">
                <label style="font-size:0.8rem; font-weight:600;">Transaction Date *</label>
                <input type="date" id="adj-date" class="form-control" style="background-color:white; color:black;" value="${new Date().toISOString().split("T")[0]}" required>
              </div>
            </div>

            <div class="form-group" style="margin-top:8px;">
              <label style="font-size:0.8rem; font-weight:600;">Reason for Adjustment *</label>
              <select id="adj-reason" class="form-control" style="background-color:white; color:black;" required>
                <option value="Audit Variance">Audit Variance / Physical Count Check</option>
                <option value="Moisture Damage">Moisture Damage / Scrap</option>
                <option value="Theft or Loss">Theft or Loss</option>
                <option value="Defective Materials Returned">Defective / Returns</option>
                <option value="Promotional / Self Use">Promotional / Self-Consumption</option>
              </select>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:6px; border-top:1px solid #94a3b8; padding-top:8px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal" style="background-color:#f1f5f9; color:black;">Cancel</button>
            <button type="submit" class="btn btn-primary" style="background-color:#1e3b8b; color:white; border:none;">Post Adjustment</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const materialSelect = document.getElementById("adj-material");
  const batchSelect = document.getElementById("adj-batch");

  function updateBatchDropdown() {
    const matId = materialSelect.value;
    const selectedMat = materials.find(m => m.id === matId);
    if (selectedMat) {
      batchSelect.innerHTML = selectedMat.batches.map(b => `
        <option value="${b.batchNo}" ${b.batchNo === preselectedBatchNo ? "selected" : ""}>
          ${b.batchNo} (Stock: ${b.stock} ${selectedMat.unit} - Cost: ₹${b.landingCost.toFixed(2)})
        </option>
      `).join("");
    } else {
      batchSelect.innerHTML = `<option value="">-- Select Batch --</option>`;
    }
  }

  materialSelect.addEventListener("change", updateBatchDropdown);
  if (preselectedMaterialId) {
    updateBatchDropdown();
  }

  const overlay = document.getElementById("modal-overlay-inv");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };

  document.getElementById("btn-close-modal").addEventListener("click", close);
  document.getElementById("btn-cancel-modal").addEventListener("click", close);

  document.getElementById("adjust-stock-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const materialId = materialSelect.value;
    const batchNo = batchSelect.value;
    const qty = document.getElementById("adj-qty").value;
    const reason = document.getElementById("adj-reason").value;
    const date = document.getElementById("adj-date").value;

    const success = state.adjustStock(materialId, qty, batchNo, reason, date);
    if (success) {
      close();
      renderInventory(container);
    } else {
      alert("Failed to adjust stock. Ensure the final batch stock level is not negative.");
    }
  });
}

export function showDetailedStockRegisterModal(container) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();
  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];
  const companies = [...new Set(materials.map(m => m.company).filter(Boolean))];
  const codes = [...new Set(materials.map(m => m.code).filter(Boolean))];
  const groups = [...new Set(materials.map(m => m.productGroup).filter(Boolean))];
  const productNames = [...new Set(materials.map(m => m.name).filter(Boolean))];
  const units = [...new Set(materials.map(m => m.unit).filter(Boolean))];
  const gstPercents = [...new Set(materials.map(m => (m.igst !== undefined && m.igst !== null && m.igst !== "") ? parseFloat(m.igst) : 18).filter(v => !isNaN(v)))];

  root.innerHTML = `
    <div class="modal-overlay active" id="detailed-stock-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1150px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-folder-open"></i> STOCK REGISTER</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="det-stock-close-x-btn">&times;</button>
        </div>

        <!-- Filters Section -->
        <div style="background:#b4c6e7; padding:8px; border:1px solid #8faadc; border-radius:2px; display:grid; grid-template-columns: 180px 1fr 200px; gap:10px; align-items:start;">
          
          <!-- Radio List Left Column -->
          <div style="display:flex; flex-direction:column; gap:2px; font-weight:bold; background:#d9e1f2; padding:4px; border:1px solid #8faadc; border-radius:2px;">
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="all" checked> All</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="category"> Category</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="company"> Company</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="code"> Code/Model</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="serial"> Serial NO</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="gst"> GST %</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="unit"> Unit</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="prodname"> Product Name</label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" name="det-filter-type" value="prodgroup"> Product Group</label>
          </div>

          <!-- Middle Controls Area -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; gap:12px; font-weight:bold; background:#d9e1f2; padding:6px; border:1px solid #8faadc; border-radius:2px;">
              <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="chk-unavailable"> Show Unavailable items only</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="chk-available"> Show Available Items only</label>
            </div>

            <div style="display:flex; align-items:center; gap:10px; font-weight:bold;">
              <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="chk-deactivated" checked> Include Deactivated Products</label>
            </div>

            <!-- Dynamic Dropdowns Container -->
            <div id="det-sub-filter-container" style="background:#e2e8f0; padding:4px 8px; border:1px solid #94a3b8; border-radius:2px; font-weight:bold; min-height:30px; display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.75rem; color:#475569;">No sub-filter needed.</span>
            </div>

            <div style="display:flex; align-items:center; gap:10px; margin-top:2px;">
              <div style="background:#8faadc; font-weight:bold; padding:2px 8px; border:1px solid #7f99c2; border-radius:2px; display:flex; align-items:center; gap:4px;">
                <span>Stock Location</span>
                <select id="det-stock-loc" class="form-control" style="padding:1px 3px; font-size:0.75rem; background:white; color:black; width:150px; border:1px solid #7f99c2; height:20px;">
                  <option value="All">All Locations</option>
                  <option value="Main Yard">Main Yard</option>
                  <option value="Warehouse A">Warehouse A</option>
                </select>
              </div>

              <label style="cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:3px;"><input type="radio" name="det-prodtype" value="all" checked> Product Type</label>
            </div>

            <div style="margin-top:2px;">
              <label style="cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="chk-use-selling"> Show Stock Value based on Selling Price</label>
            </div>
          </div>

          <!-- Buttons and Actions -->
          <div style="display:flex; flex-direction:column; gap:10px; align-items:flex-end;">
            <!-- Excel Export Graphic Icon -->
            <div style="cursor:pointer; border:1px solid #94a3b8; background:white; padding:4px 8px; border-radius:4px; display:flex; flex-direction:column; align-items:center; gap:2px; width:65px; box-shadow:0 2px 5px rgba(0,0,0,0.15);" id="btn-det-export" title="Export to Excel">
              <i class="fa-solid fa-file-excel" style="color:#107c41; font-size:1.6rem;"></i>
              <span style="font-size:0.6rem; font-weight:bold; color:#475569;">Export</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px; width:100%;">
              <button type="button" class="btn btn-secondary" id="btn-det-view" style="width:100%; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:22px; font-size:0.75rem; box-shadow:1px 1px 2px white inset;">View</button>
              <button type="button" class="btn btn-secondary" id="btn-det-preview" style="width:100%; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:22px; font-size:0.75rem; box-shadow:1px 1px 2px white inset;">Preview</button>
              <button type="button" class="btn btn-secondary" id="btn-det-close" style="width:100%; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:22px; font-size:0.75rem; box-shadow:1px 1px 2px white inset;">Close</button>
            </div>
          </div>

        </div>

        <!-- Header Ribbon Grid Title -->
        <div style="background:#b4c6e7; text-align:center; font-weight:bold; font-size:0.85rem; color:#1e3b8b; padding:2px; border:1px solid #8faadc;" id="det-grid-subtitle">
          Stock Summary All
        </div>

        <!-- Table view -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="det-stock-table">
            <!-- Table content -->
          </table>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("detailed-stock-overlay");
  const close = () => { overlay.remove(); };

  document.getElementById("det-stock-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-det-close").addEventListener("click", close);
  document.getElementById("btn-det-preview").addEventListener("click", () => window.print());
  document.getElementById("btn-det-export").addEventListener("click", () => alert("Stock report exported to Excel successfully."));

  const subFilterContainer = document.getElementById("det-sub-filter-container");
  const tableEl = document.getElementById("det-stock-table");

  function updateSubFilterUI(filterValue) {
    if (filterValue === "all" || filterValue === "serial") {
      subFilterContainer.innerHTML = `<span style="font-size:0.75rem; color:#475569;">No sub-filter needed.</span>`;
      return;
    }

    let selectHTML = "";
    if (filterValue === "category") {
      selectHTML = `
        <span>Category:</span>
        <select id="sub-filter-select" class="form-control" style="padding:2px; font-size:0.72rem; height:22px; width:200px; background:white; color:black;">
          <option value="All">All Categories</option>
          ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
      `;
    } else if (filterValue === "company") {
      selectHTML = `
        <span>Company/Brand:</span>
        <select id="sub-filter-select" class="form-control" style="padding:2px; font-size:0.72rem; height:22px; width:200px; background:white; color:black;">
          <option value="All">All Companies</option>
          ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
      `;
    } else if (filterValue === "code") {
      selectHTML = `
        <span>Code/Model:</span>
        <select id="sub-filter-select" class="form-control" style="padding:2px; font-size:0.72rem; height:22px; width:200px; background:white; color:black;">
          <option value="All">All Codes</option>
          ${codes.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
      `;
    } else if (filterValue === "gst") {
      selectHTML = `
        <span>GST % Rate:</span>
        <select id="sub-filter-select" class="form-control" style="padding:2px; font-size:0.72rem; height:22px; width:200px; background:white; color:black;">
          <option value="All">All GST Rates</option>
          ${gstPercents.map(g => `<option value="${g}">${g} %</option>`).join("")}
        </select>
      `;
    } else if (filterValue === "unit") {
      selectHTML = `
        <span>Measurement Unit:</span>
        <select id="sub-filter-select" class="form-control" style="padding:2px; font-size:0.72rem; height:22px; width:200px; background:white; color:black;">
          <option value="All">All Units</option>
          ${units.map(u => `<option value="${u}">${u}</option>`).join("")}
        </select>
      `;
    } else if (filterValue === "prodname") {
      selectHTML = `
        <span>Product Name:</span>
        <select id="sub-filter-select" class="form-control" style="padding:2px; font-size:0.72rem; height:22px; width:200px; background:white; color:black;">
          <option value="All">All Products</option>
          ${productNames.map(p => `<option value="${p}">${p}</option>`).join("")}
        </select>
      `;
    } else if (filterValue === "prodgroup") {
      selectHTML = `
        <span>Product Group:</span>
        <select id="sub-filter-select" class="form-control" style="padding:2px; font-size:0.72rem; height:22px; width:200px; background:white; color:black;">
          <option value="All">All Groups</option>
          ${groups.map(g => `<option value="${g}">${g}</option>`).join("")}
        </select>
      `;
    }

    subFilterContainer.innerHTML = selectHTML;

    // Bind dynamic sub-select triggers
    const subSel = document.getElementById("sub-filter-select");
    if (subSel) {
      subSel.addEventListener("change", renderGridData);
    }
  }

  // Handle Left Radio updates
  document.querySelectorAll("input[name='det-filter-type']").forEach(r => {
    r.addEventListener("change", (e) => {
      updateSubFilterUI(e.target.value);
      renderGridData();
    });
  });

  function renderGridData() {
    const filterType = document.querySelector("input[name='det-filter-type']:checked").value;
    const showUnavailable = document.getElementById("chk-unavailable").checked;
    const showAvailable = document.getElementById("chk-available").checked;
    const includeDeactivated = document.getElementById("chk-deactivated").checked;
    const useSellingPrice = document.getElementById("chk-use-selling").checked;
    
    const subSelectEl = document.getElementById("sub-filter-select");
    const subSelectVal = subSelectEl ? subSelectEl.value : "All";

    // Set subtitle title bar
    let subTitle = "Stock Summary All";
    if (filterType !== "all" && subSelectVal !== "All") {
      subTitle = `Stock Summary - ${filterType.toUpperCase()}: ${subSelectVal}`;
    }
    document.getElementById("det-grid-subtitle").textContent = subTitle;

    // Filter materials array
    let filtered = materials.filter(m => {
      // Deactivated items check
      if (!includeDeactivated && m.isDeactivated) return false;

      // Filter selections matching subfilter option
      if (filterType === "category" && subSelectVal !== "All" && m.category !== subSelectVal) return false;
      if (filterType === "company" && subSelectVal !== "All" && m.company !== subSelectVal) return false;
      if (filterType === "code" && subSelectVal !== "All" && m.code !== subSelectVal) return false;
      if (filterType === "prodname" && subSelectVal !== "All" && m.name !== subSelectVal) return false;
      if (filterType === "prodgroup" && subSelectVal !== "All" && m.productGroup !== subSelectVal) return false;
      if (filterType === "unit" && subSelectVal !== "All" && m.unit !== subSelectVal) return false;
      if (filterType === "gst" && subSelectVal !== "All" && String((m.igst !== undefined && m.igst !== null && m.igst !== "") ? parseFloat(m.igst) : 18) !== String(subSelectVal)) return false;

      const currentStock = m.stock || 0;
      if (showUnavailable && currentStock > 0) return false;
      if (showAvailable && currentStock === 0) return false;

      return true;
    });

    let totalValue = 0;
    const rows = filtered.map(m => {
      const stock = m.stock || 0;
      // If useSellingPrice is active, we compute value based on GST Exclusive Selling Rate,
      // otherwise we use landingCost (purchase cost).
      const cost = useSellingPrice ? (m.gstExclRate || m.sellingPrice || 0) : (m.landingCost || 0);
      const val = stock * cost;
      totalValue += val;

      return {
        company: m.company || "UNAVAILABLE",
        productName: m.name,
        productCode: m.code || m.id,
        category: m.category || "UNAVAILABLE",
        subCategory: m.subCategory || "UNAVAILABLE",
        stock: stock,
        unit: m.unit || "Nos",
        cost: cost,
        value: val
      };
    });

    tableEl.innerHTML = `
      <thead>
        <tr style="background-color:#5a7b9c; color:white; font-weight:bold; position:sticky; top:0;">
          <th style="padding:6px; border:1px solid #cbd5e1;">Company</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">ProductName</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">ProductCode</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Category</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">SubCategory</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Stock</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width:110px;">Avg.Cost</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width:130px;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const isZero = r.stock === 0;
          const trStyle = isZero ? "color:#c00000; font-weight:bold; border-bottom:1px solid #cbd5e1;" : "color:black; border-bottom:1px solid #cbd5e1;";
          return `
            <tr class="det-stock-row-clickable" data-name="${r.productName}" data-code="${r.productCode}" style="${trStyle} cursor:pointer; outline:none;" tabindex="0">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.company}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productCode}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.category}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.subCategory}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.stock} ${r.unit}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.cost.toFixed(3)}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right; font-weight:600;">${r.value.toFixed(2)}</td>
            </tr>
          `;
        }).join("")}
        <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
          <td colspan="5" style="padding:6px; border:1px solid #cbd5e1;">Total:</td>
          <td colspan="2" style="padding:6px; border:1px solid #cbd5e1;"></td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-size:0.85rem; color:#1e3b8b;">${totalValue.toFixed(2)}</td>
        </tr>
      </tbody>
    `;

    tableEl.querySelectorAll(".det-stock-row-clickable").forEach(row => {
      const handleRowOpen = () => {
        const name = row.getAttribute("data-name");
        const code = row.getAttribute("data-code");
        showItemWiseStockRegisterModal(container, name, code);
      };

      row.addEventListener("dblclick", handleRowOpen);
      row.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          handleRowOpen();
        }
      });
    });
  }

  // Initialize
  updateSubFilterUI("all");
  renderGridData();
}

export function showItemWiseStockRegisterModal(container, preselectedProduct = null, preselectedCode = null, preselectedBatch = null) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();
  const productNames = [...new Set(materials.map(m => m.name).filter(Boolean))];

  root.innerHTML = `
    <div class="modal-overlay active" id="item-wise-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1150px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-folder-open"></i> ITEM WISE STOCK REGISTER</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="item-wise-close-x-btn">&times;</button>
        </div>

        <!-- Filters Section -->
        <div style="background:#cbd5e1; padding:8px; border:1px solid #94a3b8; border-radius:2px; display:grid; grid-template-columns: 2fr 1.5fr 1fr; gap:15px; align-items:start; color:black;">
          <!-- Dropdowns -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:bold; min-width:110px;">Product Name *</span>
              <select id="iw-product" class="form-control" style="flex-grow:1; background:white; color:black; padding:2px;">
                <option value="">-- Choose Product --</option>
                ${productNames.map(name => `<option value="${name}">${name}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:bold; min-width:110px;">Code/Model *</span>
              <select id="iw-code" class="form-control" style="flex-grow:1; background:white; color:black; padding:2px;" disabled>
                <option value="">-- Choose Code --</option>
              </select>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:bold; min-width:110px;">Batch</span>
              <select id="iw-batch" class="form-control" style="flex-grow:1; background:white; color:black; padding:2px;" disabled>
                <option value="">-- All Batches --</option>
              </select>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:bold; min-width:110px;">Stock Location</span>
              <select id="iw-location" class="form-control" style="flex-grow:1; background:white; color:black; padding:2px;">
                <option value="All">All Locations</option>
                <option value="Main Yard">Main Yard</option>
                <option value="Warehouse A">Warehouse A</option>
              </select>
            </div>
          </div>

          <!-- Date Range -->
          <div style="border: 1px solid #94a3b8; padding:8px; border-radius:3px; background:#d9e1f2; display:flex; flex-direction:column; gap:6px;">
            <div style="font-weight:bold; text-align:center; margin-bottom:2px; font-size:0.75rem; color:#1e3b8b;">Date Range</div>
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-weight:bold;">From:</span>
              <input type="date" id="iw-date-from" class="form-control" style="background:white; color:black; padding:2px;" value="2026-04-01">
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-weight:bold;">To:</span>
              <input type="date" id="iw-date-to" class="form-control" style="background:white; color:black; padding:2px;" value="${new Date().toISOString().split("T")[0]}">
            </div>
          </div>

          <!-- Buttons -->
          <div style="display:flex; flex-direction:column; gap:6px; justify-content:center; height:100%;">
            <button type="button" class="btn btn-secondary" id="btn-iw-view" style="font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; padding:4px;">View</button>
            <button type="button" class="btn btn-secondary" onclick="window.print()" style="font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; padding:4px;">Preview</button>
            <button type="button" class="btn btn-secondary" id="btn-iw-close" style="font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; padding:4px;">Close</button>
          </div>
        </div>

        <!-- Table view -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; padding:10px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
            <thead>
              <tr style="background-color:#1e3b8b; color:white; border: 1px solid #94a3b8;">
                <th rowspan="2" style="padding:6px; border:1px solid #94a3b8; vertical-align:middle; width:90px;">Date</th>
                <th colspan="2" style="padding:4px; border:1px solid #94a3b8; text-align:center;">RECEIPTS</th>
                <th colspan="2" style="padding:4px; border:1px solid #94a3b8; text-align:center;">ISSUES</th>
                <th rowspan="2" style="padding:6px; border:1px solid #94a3b8; text-align:right; vertical-align:middle; width:120px;">Balance Stock</th>
              </tr>
              <tr style="background-color:#1e3b8b; color:white; border: 1px solid #94a3b8;">
                <th style="padding:4px; border:1px solid #94a3b8;">Voucher No</th>
                <th style="padding:4px; border:1px solid #94a3b8; text-align:right; width:90px;">Quantity</th>
                <th style="padding:4px; border:1px solid #94a3b8;">Voucher No</th>
                <th style="padding:4px; border:1px solid #94a3b8; text-align:right; width:90px;">Quantity</th>
              </tr>
            </thead>
            <tbody id="iw-stock-tbody">
              <tr>
                <td colspan="6" style="text-align:center; padding:30px; color:#64748b; font-style:italic;">Please select Product Name and Code, then click View.</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("item-wise-overlay");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };

  document.getElementById("item-wise-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-iw-close").addEventListener("click", close);

  const productSelect = document.getElementById("iw-product");
  const codeSelect = document.getElementById("iw-code");
  const batchSelect = document.getElementById("iw-batch");

  productSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    if (pName) {
      const matching = materials.filter(m => m.name === pName);
      codeSelect.innerHTML = '<option value="">-- Choose Code --</option>' +
        matching.map(m => `<option value="${m.code}">${m.code}</option>`).join("");
      codeSelect.disabled = false;
      batchSelect.innerHTML = '<option value="">-- All Batches --</option>';
      batchSelect.disabled = true;
    } else {
      codeSelect.innerHTML = '<option value="">-- Choose Code --</option>';
      codeSelect.disabled = true;
      batchSelect.innerHTML = '<option value="">-- All Batches --</option>';
      batchSelect.disabled = true;
    }
  });

  codeSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    const pCode = codeSelect.value;
    if (pName && pCode) {
      const mat = materials.find(m => m.name === pName && m.code === pCode);
      if (mat && mat.batches) {
        batchSelect.innerHTML = '<option value="">-- All Batches --</option>' +
          mat.batches.map(b => `<option value="${b.batchNo}">${b.batchNo}</option>`).join("");
        batchSelect.disabled = false;
      } else {
        batchSelect.innerHTML = '<option value="">-- All Batches --</option>';
        batchSelect.disabled = true;
      }
    } else {
      batchSelect.innerHTML = '<option value="">-- All Batches --</option>';
      batchSelect.disabled = true;
    }
  });

  const renderData = () => {
    const pName = productSelect.value;
    const pCode = codeSelect.value;
    const selectedBatch = batchSelect.value;
    const selectedLoc = document.getElementById("iw-location").value;
    const dateFrom = document.getElementById("iw-date-from").value;
    const dateTo = document.getElementById("iw-date-to").value;

    if (!pName || !pCode) {
      alert("Please select Product Name and Code.");
      return;
    }

    const mat = materials.find(m => m.name === pName && m.code === pCode);
    if (!mat) return;

    const entries = [];

    const matchLoc = (itemLoc) => {
      if (selectedLoc === "All") return true;
      return String(itemLoc || "").toLowerCase() === selectedLoc.toLowerCase();
    };

    let baseOpening = 0;
    if (!selectedBatch) {
      baseOpening = parseFloat(mat.openingStock) || 0;
    } else {
      const bObj = mat.batches.find(b => b.batchNo === selectedBatch);
      baseOpening = bObj ? (parseFloat(bObj.openingStock) || 0) : 0;
    }

    // 2. Purchases
    state.getPurchases().forEach(p => {
      if (p.isCancelled) return;
      if (selectedLoc !== "All" && !matchLoc(p.siteName)) return;

      (p.items || []).forEach(item => {
        if (item.materialId === mat.id) {
          const itemBNo = String(item.batchNo || item.price || mat.landingCost || 350);
          if (!selectedBatch || selectedBatch === itemBNo) {
            entries.push({
              date: p.date,
              type: "Receipt",
              voucherNo: p.invoiceNo || p.id,
              quantity: parseFloat(item.quantity) || 0
            });
          }
        }
      });
    });

    // 3. Invoices (Sales)
    state.getInvoices().forEach(inv => {
      if (inv.isCancelled) return;
      if (selectedLoc !== "All" && !matchLoc(inv.siteName)) return;

      (inv.items || []).forEach(item => {
        if (item.materialId === mat.id) {
          const itemBNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          if (!selectedBatch || selectedBatch === itemBNo) {
            entries.push({
              date: inv.date,
              type: "Issue",
              voucherNo: inv.id || inv.voucherNo,
              quantity: parseFloat(item.quantity) || 0
            });
          }
        }
      });
    });

    // 4. Sales Returns
    state.getSalesReturns().forEach(sr => {
      if (selectedLoc !== "All" && !matchLoc(sr.siteName)) return;

      (sr.items || []).forEach(item => {
        if (item.materialId === mat.id) {
          const itemBNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          if (!selectedBatch || selectedBatch === itemBNo) {
            entries.push({
              date: sr.date,
              type: "Receipt",
              voucherNo: sr.id || sr.voucherNo,
              quantity: parseFloat(item.quantity) || 0
            });
          }
        }
      });
    });

    // 5. Purchase Returns
    state.getPurchaseReturns().forEach(pr => {
      if (selectedLoc !== "All" && !matchLoc(pr.siteName)) return;

      (pr.items || []).forEach(item => {
        if (item.materialId === mat.id) {
          const itemBNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          if (!selectedBatch || selectedBatch === itemBNo) {
            entries.push({
              date: pr.date,
              type: "Issue",
              voucherNo: pr.id || pr.voucherNo,
              quantity: parseFloat(item.quantity) || 0
            });
          }
        }
      });
    });

    // 6. Stock Adjustments (Manual entries in transactions list)
    state.getStockAdjustments().forEach(adj => {
      if (adj.isCancelled) return;
      (adj.items || []).forEach(item => {
        if (item.materialId === mat.id) {
          const itemBNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          if (!selectedBatch || selectedBatch === itemBNo) {
            const qty = parseFloat(item.qty) || 0;
            const type = item.stockAffect === "Add (+)" ? "Receipt" : "Issue";
            entries.push({
              date: adj.date,
              type: type,
              voucherNo: "Adj: " + adj.refNo,
              quantity: qty
            });
          }
        }
      });
    });

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = baseOpening;
    const beforeFrom = entries.filter(e => e.date < dateFrom);
    beforeFrom.forEach(e => {
      if (e.type === "Receipt") {
        runningBalance += e.quantity;
      } else {
        runningBalance -= e.quantity;
      }
    });

    const activeEntries = entries.filter(e => e.date >= dateFrom && e.date <= dateTo);

    const tbody = document.getElementById("iw-stock-tbody");
    const unitSymbol = mat.unit || "Nos";

    let rowsHTML = `
      <tr style="background:#f8fafc; font-style:italic; font-weight:bold; border-bottom:1px dashed #cbd5e1;">
        <td style="padding:6px; border-right:1px solid #cbd5e1;">Opening Stock</td>
        <td style="padding:6px; border-right:1px solid #cbd5e1;"></td>
        <td style="padding:6px; border-right:1px solid #cbd5e1; text-align:right;"></td>
        <td style="padding:6px; border-right:1px solid #cbd5e1;"></td>
        <td style="padding:6px; border-right:1px solid #cbd5e1; text-align:right;"></td>
        <td style="padding:6px; text-align:right; color:#1e3b8b;">${runningBalance.toFixed(2)} ${unitSymbol}</td>
      </tr>
    `;

    let totalReceipts = 0;
    let totalIssues = 0;

    activeEntries.forEach(e => {
      let recVNo = "";
      let recQty = "";
      let issVNo = "";
      let issQty = "";

      if (e.type === "Receipt") {
        recVNo = e.voucherNo;
        recQty = `${e.quantity.toFixed(2)} ${unitSymbol}`;
        runningBalance += e.quantity;
        totalReceipts += e.quantity;
      } else {
        issVNo = e.voucherNo;
        issQty = `${e.quantity.toFixed(2)} ${unitSymbol}`;
        runningBalance -= e.quantity;
        totalIssues += e.quantity;
      }

      const dateParts = e.date.split("-");
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : e.date;

      rowsHTML += `
        <tr data-voucher-no="${recVNo || issVNo}" style="border-bottom:1px solid #cbd5e1; cursor:pointer;" class="iw-row-clickable" tabindex="0">
          <td style="padding:6px; border-right:1px solid #cbd5e1;">${formattedDate}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; font-weight:500;">${recVNo}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; text-align:right; font-weight:500; color:#107c41;">${recQty}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; font-weight:500;">${issVNo}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; text-align:right; font-weight:500; color:#ef4444;">${issQty}</td>
          <td style="padding:6px; text-align:right; font-weight:700; color:#1e3b8b;">${runningBalance.toFixed(2)} ${unitSymbol}</td>
        </tr>
      `;
    });

    rowsHTML += `
      <tr style="background:#e2e8f0; font-weight:bold; border-top:2px solid #475569;">
        <td style="padding:8px; border-right:1px solid #cbd5e1;">Total</td>
        <td style="padding:8px; border-right:1px solid #cbd5e1;"></td>
        <td style="padding:8px; border-right:1px solid #cbd5e1; text-align:right; color:#107c41; text-decoration: underline; border-bottom: 2px double #000;">${totalReceipts.toFixed(2)} ${unitSymbol}</td>
        <td style="padding:8px; border-right:1px solid #cbd5e1;"></td>
        <td style="padding:8px; border-right:1px solid #cbd5e1; text-align:right; color:#ef4444; text-decoration: underline; border-bottom: 2px double #000;">${totalIssues.toFixed(2)} ${unitSymbol}</td>
        <td style="padding:8px; text-align:right; color:#1e3b8b; text-decoration: underline; border-bottom: 2px double #000;">${runningBalance.toFixed(2)} ${unitSymbol}</td>
      </tr>
    `;

    tbody.innerHTML = rowsHTML;

    // Bind double click to open the corresponding voucher or invoice
    tbody.querySelectorAll(".iw-row-clickable").forEach(row => {
      const handleRowOpen = () => {
        const vNo = row.getAttribute("data-voucher-no");
        if (vNo) {
          if (vNo.startsWith("Adj: ")) {
            const ref = vNo.replace("Adj: ", "");
            import("./transactions.js").then(m => {
              m.showStockAdjustWizard(container, ref);
            });
          } else {
            import("./reports.js").then(rep => {
              rep.openVoucherOrInvoice(vNo, container);
            });
          }
        }
      };

      row.addEventListener("dblclick", handleRowOpen);
      row.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          handleRowOpen();
        }
      });
    });
  };

  document.getElementById("btn-iw-view").addEventListener("click", renderData);

  if (preselectedProduct) {
    productSelect.value = preselectedProduct;
    productSelect.dispatchEvent(new Event("change"));
    if (preselectedCode) {
      codeSelect.value = preselectedCode;
      codeSelect.dispatchEvent(new Event("change"));
      if (preselectedBatch) {
        batchSelect.value = preselectedBatch;
      }
    }
    renderData();
  }

  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", escHandler);
    }
  };
  window.addEventListener("keydown", escHandler);
}

export function showBatchSellingRateModal(materialId, onSaved = null) {
  const mat = state.getMaterials().find(m => m.id === materialId);
  if (!mat) return;

  const modalDiv = document.createElement("div");
  modalDiv.className = "modal-overlay active";
  modalDiv.id = "batch-selling-rate-overlay";
  modalDiv.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(1px); z-index:2100; position:fixed; top:0; left:0; width:100%; height:100%;";

  const batches = mat.batches || [];

  modalDiv.innerHTML = `
    <div class="modal-container modal-md" style="max-width:650px; width: 95vw; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #d97706; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
      <div style="background: linear-gradient(180deg, #d97706 0%, #f59e0b 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
        <div><i class="fa-solid fa-tags"></i> Edit Batch Selling Rates</div>
        <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="batch-rates-close-x-btn">&times;</button>
      </div>
      
      <div style="background:white; padding:12px; border:1px solid #94a3b8; border-radius:2px; display:flex; flex-direction:column; gap:8px; color:black;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:4px;">
          <div>
            <span style="font-weight:bold; color:#475569; display:block;">Product Name</span>
            <span style="font-size:0.9rem; font-weight:bold;">${mat.name}</span>
          </div>
          <div>
            <span style="font-weight:bold; color:#475569; display:block;">Code/Model</span>
            <span style="font-size:0.9rem; font-weight:bold;">${mat.code || mat.id}</span>
          </div>
        </div>

        <div style="max-height: 250px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 3px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.78rem;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-weight: bold; position: sticky; top: 0;">
                <th style="padding: 6px 8px;">Batch No</th>
                <th style="padding: 6px 8px; text-align: right;">Stock</th>
                <th style="padding: 6px 8px; text-align: right;">Landing Cost</th>
                <th style="padding: 6px 8px;">Selling Price *</th>
                <th style="padding: 6px 8px;">MRP *</th>
              </tr>
            </thead>
            <tbody>
              ${batches.map((b, idx) => `
                <tr style="border-bottom: 1px dashed #cbd5e1;">
                  <td style="padding: 6px 8px; font-weight: bold; color: #1e3b8b;">
                    ${b.batchNo}
                    <input type="hidden" class="batch-no-input" value="${b.batchNo}">
                  </td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 500;">${(b.stock || 0).toFixed(2)}</td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 500;">₹${(b.landingCost || 0).toFixed(2)}</td>
                  <td style="padding: 4px 6px;">
                    <input type="number" class="form-control batch-selling-input" style="padding: 2px 4px; font-size: 0.78rem; text-align: right; width: 90px;" step="0.01" min="0" value="${(b.sellingPrice || 0).toFixed(2)}" required>
                  </td>
                  <td style="padding: 4px 6px;">
                    <input type="number" class="form-control batch-mrp-input" style="padding: 2px 4px; font-size: 0.78rem; text-align: right; width: 90px;" step="0.01" min="0" value="${(b.mrp || 0).toFixed(2)}" required>
                  </td>
                </tr>
              `).join("")}
              ${batches.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">No batches found for this product.</td>
                </tr>
              ` : ""}
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #94a3b8; padding-top:8px; margin-top:4px;">
          <button type="button" class="btn btn-primary" id="btn-batch-rates-save" style="background:#d97706; border:none; color:white; font-weight:bold; padding:4px 16px; font-size:0.78rem; border-radius:3px; cursor:pointer;" ${batches.length === 0 ? 'disabled' : ''}><i class="fa-solid fa-save"></i> Save Rates</button>
          <button type="button" class="btn btn-secondary" id="btn-batch-rates-cancel" style="padding:4px 16px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; font-size:0.78rem; border-radius:3px; cursor:pointer;">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalDiv);

  // Close actions
  const closeModal = () => {
    modalDiv.remove();
  };

  document.getElementById("batch-rates-close-x-btn").addEventListener("click", closeModal);
  document.getElementById("btn-batch-rates-cancel").addEventListener("click", closeModal);

  // Save rates action
  document.getElementById("btn-batch-rates-save").addEventListener("click", () => {
    const rowElms = modalDiv.querySelectorAll("tbody tr");
    rowElms.forEach(row => {
      const batchNoEl = row.querySelector(".batch-no-input");
      if (!batchNoEl) return;
      const batchNo = batchNoEl.value;
      const sellingPrice = parseFloat(row.querySelector(".batch-selling-input").value) || 0;
      const mrp = parseFloat(row.querySelector(".batch-mrp-input").value) || 0;

      // Update in state manager
      state.addOrUpdateMaterialBatch(materialId, {
        batchNo: batchNo,
        sellingPrice: sellingPrice,
        mrp: mrp
      });
    });

    state.saveState();
    alert("Batch selling rates updated successfully!");
    closeModal();
    if (onSaved) onSaved();
  });
}
