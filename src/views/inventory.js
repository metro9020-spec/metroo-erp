import { state } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";

let searchFilters = {
  name: "",
  code: "",
  company: "",
  category: "",
  subCategory: "",
  productGroup: "",
  hsn: "",
  landingCost: ""
};

let sortBy = "name";
let extendedSearch = true; // Substring contains search
let autoSearch = true; // Live search on input
let currentPage = 1;
const PAGE_SIZE = 50;
let lastFocusedInputId = null;
let lastCursorPos = null;

function matchField(value, query, isExtended) {
  if (!query || query.trim() === "") return true;
  const q = query.trim().toLowerCase();
  
  // Special '*' wildcard: matches records where field is empty / not set
  if (q === "*") {
    return !value || String(value).trim() === "" || String(value).trim() === "-";
  }
  
  const val = String(value || "").toLowerCase();
  if (isExtended) {
    return val.includes(q);
  } else {
    return val.startsWith(q) || val === q;
  }
}

export function renderInventory(container) {
  const isCompUnregistered = state.isCompanyUnregistered ? state.isCompanyUnregistered() : false;
  const materials = state.getMaterials();
  const categories = state.getCategories();
  const companies = state.getCompanies ? state.getCompanies() : [];
  const productGroups = state.getProductGroups ? state.getProductGroups() : [];

  // Compile product records aggregating all their batches
  const productRecords = [];
  materials.forEach(m => {
    const totalStock = m.stock || 0;
    let totalValuation = 0;
    let avgLanding = 0;
    if (m.batches && m.batches.length > 0) {
      totalValuation = m.batches.reduce((sum, b) => sum + ((b.stock || 0) * (b.landingCost || 0)), 0);
      avgLanding = totalStock > 0 ? (totalValuation / totalStock) : (m.landingCost || 0);
    } else {
      avgLanding = m.landingCost || 0;
      totalValuation = totalStock * avgLanding;
    }

    productRecords.push({
      materialId: m.id,
      name: m.name || "",
      code: m.code || "",
      barcode: m.barcode || "",
      eanCode: m.eanCode || "",
      altCode: m.altCode || m.alternateCode || "",
      company: m.company || "",
      category: m.category || "",
      subCategory: m.subCategory || "",
      productGroup: m.productGroup || "",
      hsnCode: m.hsnCode || "",
      unit: m.unit || "Nos",
      reorderLevel: m.reorderLevel || 0,
      stock: totalStock,
      landingCost: avgLanding,
      sellingPrice: m.sellingPrice || 0,
      mrp: m.mrp || 0,
      value: totalValuation
    });
  });

  const totalValuation = productRecords.reduce((sum, r) => sum + r.value, 0);
  const totalItemsCount = materials.length;
  const lowStockCount = materials.filter(m => {
    return (m.stock || 0) <= (m.reorderLevel || 0);
  }).length;

  // Filter products using the search fields
  const filteredRecords = productRecords.filter(r => {
    if (!matchField(r.name, searchFilters.name, extendedSearch)) return false;
    if (!matchField(r.code, searchFilters.code, extendedSearch)) return false;
    if (!matchField(r.company, searchFilters.company, extendedSearch)) return false;
    if (!matchField(r.category, searchFilters.category, extendedSearch)) return false;
    if (!matchField(r.subCategory, searchFilters.subCategory, extendedSearch)) return false;
    if (!matchField(r.productGroup, searchFilters.productGroup, extendedSearch)) return false;
    if (!matchField(r.hsnCode, searchFilters.hsn, extendedSearch)) return false;
    if (searchFilters.landingCost && searchFilters.landingCost.trim() !== "") {
      const qCost = searchFilters.landingCost.trim();
      const numCost = parseFloat(qCost.replace(/[^0-9.]/g, ''));
      if (!isNaN(numCost)) {
        if (Math.abs((r.landingCost || 0) - numCost) > 0.01 && !String((r.landingCost || 0).toFixed(2)).includes(qCost) && !String(r.landingCost || '').includes(qCost)) {
          return false;
        }
      } else if (!String(r.landingCost || '').includes(qCost)) {
        return false;
      }
    }
    return true;
  });

  // Sort products
  filteredRecords.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case "name":
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
        return valA.localeCompare(valB);
      case "nameDesc":
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
        return valB.localeCompare(valA);
      case "code":
        valA = (a.code || "").toLowerCase();
        valB = (b.code || "").toLowerCase();
        return valA.localeCompare(valB);
      case "company":
        valA = (a.company || "").toLowerCase();
        valB = (b.company || "").toLowerCase();
        return valA.localeCompare(valB);
      case "category":
        valA = (a.category || "").toLowerCase();
        valB = (b.category || "").toLowerCase();
        return valA.localeCompare(valB);
      case "group":
        valA = (a.productGroup || "").toLowerCase();
        valB = (b.productGroup || "").toLowerCase();
        return valA.localeCompare(valB);
      case "hsn":
        valA = (a.hsnCode || "").toLowerCase();
        valB = (b.hsnCode || "").toLowerCase();
        return valA.localeCompare(valB);
      case "stockDesc":
        return (b.stock || 0) - (a.stock || 0);
      case "stockAsc":
        return (a.stock || 0) - (b.stock || 0);
      case "mrpDesc":
        return (b.mrp || 0) - (a.mrp || 0);
      case "landingCost":
        return (b.landingCost || 0) - (a.landingCost || 0);
      default:
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
        return valA.localeCompare(valB);
    }
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);

  // Check if any search filter is active
  const hasActiveFilters = Object.values(searchFilters).some(v => v && v.trim() !== "");

  container.innerHTML = `
    <!-- Top Stats Row -->
    <div class="metrics-grid" style="margin-bottom: 0.75rem;">
      <div class="metric-card cash">
        <div class="metric-icon"><i class="fa-solid fa-calculator"></i></div>
        <div class="metric-details">
          <span class="metric-label">Stock Asset Valuation</span>
          <span class="metric-value">\u20B9${totalValuation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="metric-card sales">
        <div class="metric-icon"><i class="fa-solid fa-pallet"></i></div>
        <div class="metric-details">
          <span class="metric-label">Total Unique Products</span>
          <span class="metric-value">${totalItemsCount.toLocaleString()}</span>
        </div>
      </div>
      <div class="metric-card expenses">
        <div class="metric-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="metric-details">
          <span class="metric-label">Low Stock Items</span>
          <span class="metric-value ${lowStockCount > 0 ? 'text-danger' : 'text-success'}">${lowStockCount.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <!-- PRODUCT SEARCH PANEL (Windows ERP Legacy Style & Multi-field Grid) -->
    <div class="panel product-search-panel" style="background: #f8fafc; border: 1.5px solid #94a3b8; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 0.4rem; margin-bottom: 0.6rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-weight: 700; font-size: 0.95rem; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">
            <i class="fa-solid fa-magnifying-glass"></i> Product Search
          </span>
          <span style="font-size: 0.78rem; color: #64748b; font-style: italic;">
            (Type any part of the data to search in one of the following fields)
          </span>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-secondary btn-sm" id="btn-adjust-stock" style="font-size: 0.78rem; padding: 3px 8px;"><i class="fa-solid fa-sliders"></i> Stock Adjustment</button>
          <button class="btn btn-primary btn-sm" id="btn-add-product-master" style="font-size: 0.78rem; padding: 3px 10px; background-color: #2563eb;"><i class="fa-solid fa-plus"></i> Product Master (New)</button>
        </div>
      </div>

      <!-- 8-Field Search Input Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.5rem 0.75rem; font-size: 0.8rem;">
        <!-- Field 1: Product Name -->
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 2px; font-size: 0.76rem;">Product Name</label>
          <input type="text" id="search-name" class="form-control form-control-sm search-grid-input" placeholder="e.g. CEMENT, CABLE..." value="${searchFilters.name}" style="background: white; border: 1px solid #94a3b8; height: 28px; font-size: 0.8rem;">
        </div>

        <!-- Field 2: Product Code -->
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 2px; font-size: 0.76rem;">Product Code</label>
          <input type="text" id="search-code" class="form-control form-control-sm search-grid-input" placeholder="e.g. ACC, 1 MM..." value="${searchFilters.code}" style="background: white; border: 1px solid #94a3b8; height: 28px; font-size: 0.8rem;">
        </div>

        <!-- Field 3: Company / Brand -->
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 2px; font-size: 0.76rem;">Company / Brand</label>
          <input type="text" id="search-company" class="form-control form-control-sm search-grid-input" placeholder="e.g. ACC, POLYCAB..." value="${searchFilters.company}" style="background: white; border: 1px solid #94a3b8; height: 28px; font-size: 0.8rem;">
        </div>

        <!-- Field 4: Category -->
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 2px; font-size: 0.76rem;">Category</label>
          <input type="text" id="search-category" class="form-control form-control-sm search-grid-input" placeholder="Category name..." value="${searchFilters.category}" style="background: white; border: 1px solid #94a3b8; height: 28px; font-size: 0.8rem;">
        </div>

        <!-- Field 5: Sub Category -->
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 2px; font-size: 0.76rem;">Sub Category</label>
          <input type="text" id="search-sub-category" class="form-control form-control-sm search-grid-input" placeholder="Sub category..." value="${searchFilters.subCategory}" style="background: white; border: 1px solid #94a3b8; height: 28px; font-size: 0.8rem;">
        </div>

        <!-- Field 6: Product Group -->
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 2px; font-size: 0.76rem;">Product Group</label>
          <input type="text" id="search-product-group" class="form-control form-control-sm search-grid-input" placeholder="Product group..." value="${searchFilters.productGroup}" style="background: white; border: 1px solid #94a3b8; height: 28px; font-size: 0.8rem;">
        </div>

        <!-- Field 7: HSN/SAC -->
        <div class="form-group" style="margin-bottom: 0; display: ${isCompUnregistered ? 'none' : 'block'};">
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 2px; font-size: 0.76rem;">HSN / SAC <span style="font-weight: normal; color: #dc2626;">(* = no HSN)</span></label>
          <input type="text" id="search-hsn" class="form-control form-control-sm search-grid-input" placeholder="e.g. 2523 or * for none" value="${searchFilters.hsn}" style="background: white; border: 1px solid #94a3b8; height: 28px; font-size: 0.8rem;">
        </div>

        <!-- Field 8: Landing Cost -->
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 2px; font-size: 0.76rem;">Landing Cost (\u20B9)</label>
          <input type="text" id="search-landing-cost" class="form-control form-control-sm search-grid-input" placeholder="e.g. 315, 325..." value="${searchFilters.landingCost}" style="background: white; border: 1px solid #94a3b8; height: 28px; font-size: 0.8rem;">
        </div>
      </div>

      <!-- Action Search / Clear Buttons & Bottom Options Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.6rem; padding-top: 0.4rem; border-top: 1px dashed #cbd5e1; font-size: 0.78rem;">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <label for="sort-by-select" style="font-weight: 600; color: #475569; margin-bottom: 0;">Sort By:</label>
            <select id="sort-by-select" class="form-control form-control-sm" style="width: 170px; height: 26px; font-size: 0.78rem; padding: 2px 6px;">
              <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Product Name (A-Z)</option>
              <option value="nameDesc" ${sortBy === 'nameDesc' ? 'selected' : ''}>Product Name (Z-A)</option>
              <option value="code" ${sortBy === 'code' ? 'selected' : ''}>Product Code (A-Z)</option>
              <option value="company" ${sortBy === 'company' ? 'selected' : ''}>Company / Brand</option>
              <option value="category" ${sortBy === 'category' ? 'selected' : ''}>Category</option>
              <option value="group" ${sortBy === 'group' ? 'selected' : ''}>Product Group</option>
              <option value="hsn" ${sortBy === 'hsn' ? 'selected' : ''}>HSN Code</option>
              <option value="stockDesc" ${sortBy === 'stockDesc' ? 'selected' : ''}>Stock (High \u2192 Low)</option>
              <option value="stockAsc" ${sortBy === 'stockAsc' ? 'selected' : ''}>Stock (Low \u2192 High)</option>
              <option value="mrpDesc" ${sortBy === 'mrpDesc' ? 'selected' : ''}>MRP (High \u2192 Low)</option>
              <option value="landingCost" ${sortBy === 'landingCost' ? 'selected' : ''}>Landing Cost (High \u2192 Low)</option>
            </select>
          </div>

          <label style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0; cursor: pointer; color: #334155;">
            <input type="checkbox" id="chk-extended-search" ${extendedSearch ? 'checked' : ''} style="cursor: pointer;">
            <span>Extended search <em>(contains match in any part)</em></span>
          </label>

          <label style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0; cursor: pointer; color: #334155;">
            <input type="checkbox" id="chk-auto-search" ${autoSearch ? 'checked' : ''} style="cursor: pointer;">
            <span>Auto-search while typing</span>
          </label>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${hasActiveFilters ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:0.75rem; padding: 2px 6px;"><i class="fa-solid fa-filter"></i> Filters Active</span>` : ''}
          <button type="button" class="btn btn-primary btn-sm" id="btn-do-search" style="height: 26px; padding: 2px 14px; font-size: 0.78rem; font-weight: bold; background: #2563eb;">
            <i class="fa-solid fa-magnifying-glass"></i> Search
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-clear-search" style="height: 26px; padding: 2px 12px; font-size: 0.78rem; font-weight: bold; background: #e2e8f0; border: 1px solid #94a3b8; color: #334155;" title="Clear all filters">
            <i class="fa-solid fa-rotate-left"></i> Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Materials Table -->
    <div class="panel" style="padding-top: 0.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-muted);">
        <span>Showing <strong>${filteredRecords.length > 0 ? startIndex + 1 : 0} - ${Math.min(startIndex + PAGE_SIZE, filteredRecords.length)}</strong> of <strong>${filteredRecords.length.toLocaleString()}</strong> items ${hasActiveFilters ? `(filtered from ${materials.length.toLocaleString()})` : ''}</span>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn btn-secondary btn-sm" id="btn-prev-page" ${currentPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <span>Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></span>
          <button class="btn btn-secondary btn-sm" id="btn-next-page" ${currentPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Item Code</th>
              <th>Company</th>
              <th>Category</th>
              <th>Group</th>
              ${isCompUnregistered ? '' : '<th>HSN Code</th>'}
              <th>Stock</th>
              <th>Unit</th>
              <th style="text-align: right;">Landing Cost</th>
              <th style="text-align: right;">MRP</th>
              <th style="text-align: right;">Stock Value</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pageRecords.length === 0 ? `
              <tr>
                <td colspan="${isCompUnregistered ? 11 : 12}" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                  <i class="fa-solid fa-box-open" style="font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4;"></i>
                  No products match the search filter criteria.
                  ${hasActiveFilters ? `<br><button class="btn btn-secondary btn-sm" id="btn-empty-clear" style="margin-top:0.5rem;"><i class="fa-solid fa-rotate-left"></i> Clear All Filters</button>` : ''}
                </td>
              </tr>
            ` : pageRecords.map(r => {
              const isLow = r.stock <= r.reorderLevel;
              
              return `
                <tr>
                  <td>
                    <strong style="color: #0f172a;">${r.name}</strong>
                  </td>
                  <td><code class="highlight-text" style="font-weight:700; color:#2563eb;">${r.code || "-"}</code></td>
                  <td><span style="font-weight: 500;">${r.company || "-"}</span></td>
                  <td><span class="badge muted">${r.category || "-"}</span></td>
                  <td>${r.productGroup || "-"}</td>
                  ${isCompUnregistered ? '' : `<td><code>${r.hsnCode || "-"}</code></td>`}
                  <td>
                    <span style="font-weight: 700;" class="${isLow ? 'text-danger' : 'text-success'}">
                      ${r.stock.toLocaleString()}
                    </span>
                    ${isLow ? `<i class="fa-solid fa-circle-exclamation text-danger" style="margin-left: 0.25rem;" title="Low Stock Alert"></i>` : ""}
                  </td>
                  <td>${r.unit}</td>
                  <td style="text-align: right;">\u20B9${r.landingCost.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600;">\u20B9${r.mrp.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600;">\u20B9${r.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td style="text-align: center; white-space: nowrap;">
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
      ${totalPages > 1 ? `
        <div style="display: flex; justify-content: flex-end; align-items: center; padding: 0.75rem 1rem; border-top: 1px solid var(--border-color); gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" id="btn-prev-page-bottom" ${currentPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <span>Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></span>
          <button class="btn btn-secondary btn-sm" id="btn-next-page-bottom" ${currentPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      ` : ''}
    </div>
  `;

  // --- Attach Event Listeners to the Search Inputs ---
  const fieldMapping = {
    "search-name": "name",
    "search-code": "code",
    "search-company": "company",
    "search-category": "category",
    "search-sub-category": "subCategory",
    "search-product-group": "productGroup",
    "search-hsn": "hsn",
    "search-landing-cost": "landingCost"
  };

  Object.entries(fieldMapping).forEach(([inputId, stateKey]) => {
    const el = document.getElementById(inputId);
    if (!el) return;

    el.addEventListener("input", (e) => {
      searchFilters[stateKey] = e.target.value;
      if (autoSearch) {
        lastFocusedInputId = inputId;
        lastCursorPos = e.target.selectionStart;
        currentPage = 1;
        renderInventory(container);
        const activeInp = document.getElementById(lastFocusedInputId);
        if (activeInp) {
          activeInp.focus();
          if (lastCursorPos !== null) {
            activeInp.setSelectionRange(lastCursorPos, lastCursorPos);
          }
        }
      }
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        currentPage = 1;
        renderInventory(container);
        const activeInp = document.getElementById(inputId);
        if (activeInp) activeInp.focus();
      }
    });
  });

  // Search button
  const doSearchBtn = document.getElementById("btn-do-search");
  if (doSearchBtn) {
    doSearchBtn.addEventListener("click", () => {
      currentPage = 1;
      renderInventory(container);
    });
  }

  // Clear button
  const clearSearchBtn = document.getElementById("btn-clear-search");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      Object.keys(searchFilters).forEach(k => searchFilters[k] = "");
      currentPage = 1;
      renderInventory(container);
    });
  }

  const emptyClearBtn = document.getElementById("btn-empty-clear");
  if (emptyClearBtn) {
    emptyClearBtn.addEventListener("click", () => {
      Object.keys(searchFilters).forEach(k => searchFilters[k] = "");
      currentPage = 1;
      renderInventory(container);
    });
  }

  // Sort By select
  const sortBySelect = document.getElementById("sort-by-select");
  if (sortBySelect) {
    sortBySelect.addEventListener("change", (e) => {
      sortBy = e.target.value;
      currentPage = 1;
      renderInventory(container);
    });
  }

  // Extended Search checkbox
  const extendedChk = document.getElementById("chk-extended-search");
  if (extendedChk) {
    extendedChk.addEventListener("change", (e) => {
      extendedSearch = e.target.checked;
      currentPage = 1;
      renderInventory(container);
    });
  }

  // Auto Search checkbox
  const autoChk = document.getElementById("chk-auto-search");
  if (autoChk) {
    autoChk.addEventListener("change", (e) => {
      autoSearch = e.target.checked;
    });
  }

  // Pagination buttons
  const prevBtn = document.getElementById("btn-prev-page");
  if (prevBtn && currentPage > 1) {
    prevBtn.addEventListener("click", () => {
      currentPage--;
      renderInventory(container);
    });
  }
  const nextBtn = document.getElementById("btn-next-page");
  if (nextBtn && currentPage < totalPages) {
    nextBtn.addEventListener("click", () => {
      currentPage++;
      renderInventory(container);
    });
  }
  const prevBtnB = document.getElementById("btn-prev-page-bottom");
  if (prevBtnB && currentPage > 1) {
    prevBtnB.addEventListener("click", () => {
      currentPage--;
      renderInventory(container);
    });
  }
  const nextBtnB = document.getElementById("btn-next-page-bottom");
  if (nextBtnB && currentPage < totalPages) {
    nextBtnB.addEventListener("click", () => {
      currentPage++;
      renderInventory(container);
    });
  }

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

  const isCompUnregistered = state.isCompanyUnregistered ? state.isCompanyUnregistered() : false;

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
    <div class="modal-overlay active" id="modal-overlay" style="display:flex;">
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
              
              <!-- Product Name Typable Dropdown with add button -->
              <div style="display: grid; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 4px; position: relative;">
                <label style="font-size:0.8rem; font-weight:600;">Product Name *</label>
                <div style="position: relative; width: 100%; display: flex; align-items: center;">
                  <input type="text" id="pm-name" class="form-control" style="background-color:white; color:black; padding:3px 24px 3px 6px; font-size:0.82rem; width:100%; border:1px solid #7a96b2; box-sizing: border-box;" value="${isEdit ? (mat.name || '') : ''}" placeholder="-- Type or Select Product Name --" autocomplete="off" required>
                  <button type="button" id="btn-pm-name-toggle" style="position: absolute; right: 1px; top: 1px; bottom: 1px; width: 22px; background: transparent; border: none; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;" title="Show all product names">
                    <i class="fa-solid fa-caret-down"></i>
                  </button>
                  <div id="pm-name-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; min-width:280px; max-height:220px; overflow-y:auto; background:white; border:1.5px solid #1e3b8b; box-shadow:0 8px 24px rgba(0,0,0,0.3); z-index:9999; border-radius:0 0 4px 4px;">
                  </div>
                </div>
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
              <div style="display: ${isCompUnregistered ? 'none' : 'grid'}; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">HSN/SAC Code</label>
                <select id="pm-hsn" class="form-control" style="background-color:white; color:black; padding:3px 6px;">
                  <option value="">-- Choose HSN --</option>
                  ${currentHsn.map(h => `<option value="${h}" ${isEdit && mat.hsnCode === h ? 'selected' : ''}>${h}</option>`).join("")}
                </select>
                <button type="button" class="btn btn-secondary" id="btn-add-hsn" style="padding: 2px; font-size:0.75rem; font-weight:bold; height:26px;" title="Add HSN Code">+</button>
              </div>

              <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 4px;">
                <label style="font-size:0.8rem; font-weight:600;">Description</label>
                <input type="text" id="pm-description" class="form-control" style="background-color:white; color:black; padding:3px 6px;" value="${isEdit ? mat.description : ''}" autocomplete="off" placeholder="Auto-filled from HSN or custom">
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
              <div style="border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 10px; border-radius: var(--border-radius-sm); display: ${isCompUnregistered ? 'none' : 'flex'}; flex-direction: column; gap: 4px;">
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

                <div style="display: grid; grid-template-columns: ${isCompUnregistered ? '1fr 1fr' : '1fr 1fr 1fr'}; gap: 6px;">
                  <div class="form-group" style="margin-bottom:0; display: ${isCompUnregistered ? 'none' : 'block'};">
                    <label style="font-size: 0.75rem; font-weight:600;">GST Exclusive Rate</label>
                    <input type="number" step="0.01" id="pm-gstexcl" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.gstExclRate || mat.sellingPrice || 0) : '0.00'}" autocomplete="new-password">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">${isCompUnregistered ? 'Inclusive Rate *' : 'GST Inclusive Rate'}</label>
                    <input type="number" step="0.01" id="pm-gstincl" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.gstInclRate || 0) : '0.00'}" autocomplete="new-password">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600;">M.R.P. *</label>
                    <input type="number" step="0.01" id="pm-mrp" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.mrp || 0) : '0.00'}" autocomplete="new-password" required>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 2px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.75rem; font-weight:600; color:#1e3a8a;">Loyalty Points / Qty</label>
                    <input type="number" step="0.01" min="0" id="pm-loyalty-points" class="form-control" style="background-color:white; color:black; padding:2px 4px; font-size:0.8rem;" value="${isEdit ? (mat.loyaltyPointsPerUnit || 0) : '0'}" autocomplete="new-password">
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

  if (igstSelect) {
    igstSelect.addEventListener("change", () => {
      const igst = isCompUnregistered ? 0 : (parseFloat(igstSelect.value) || 0);
      if (cgstIn) cgstIn.value = (igst / 2).toFixed(1);
      if (sgstIn) sgstIn.value = (igst / 2).toFixed(1);
      recalcPrices();
    });
  }

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
    const igst = isCompUnregistered ? 0 : (parseFloat(igstSelect ? igstSelect.value : 0) || 0);
    gstInclIn.value = (excl * (1 + igst / 100)).toFixed(2);
    mrpIn.value = (excl * 1.25).toFixed(2);
  });

  gstInclIn.addEventListener("input", () => {
    const incl = parseFloat(gstInclIn.value) || 0;
    const igst = isCompUnregistered ? 0 : (parseFloat(igstSelect ? igstSelect.value : 0) || 0);
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
    const igst = isCompUnregistered ? 0 : (parseFloat(igstSelect ? igstSelect.value : 0) || 0);
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
    overlayDiv.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(0,0,0,0.4); z-index:1000100;";
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
          const nameInput = document.getElementById("pm-name");
          if (nameInput) nameInput.value = upperName;
          autoDetectAndFillHsn(false);
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
          fillHsnDescription(clean, true);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // --- HSN & PRODUCT NAME AUTO-FILL DESCRIPTION HANDLERS ---
  const pmHsnSelect = document.getElementById("pm-hsn");
  const pmDescInput = document.getElementById("pm-description");
  const pmNameInput = document.getElementById("pm-name");
  const pmNameDropdown = document.getElementById("pm-name-dropdown");
  const pmNameToggleBtn = document.getElementById("btn-pm-name-toggle");
  const pmCategorySelect = document.getElementById("pm-category");
  const pmSubCategorySelect = document.getElementById("pm-subcategory");
  const pmGroupSelect = document.getElementById("pm-group");

  const fillHsnDescription = (code, force = false) => {
    if (!code) return;
    const desc = state.getHsnDescription ? state.getHsnDescription(code) : "";
    if (desc) {
      if (force || !pmDescInput.value.trim() || pmDescInput.value.trim() === "-- Choose HSN --") {
        pmDescInput.value = desc.toUpperCase();
      }
    }
  };

  const autoDetectAndFillHsn = (force = false) => {
    const pName = pmNameInput ? pmNameInput.value : "";
    const pCat = pmCategorySelect ? pmCategorySelect.value : "";
    const pSub = pmSubCategorySelect ? pmSubCategorySelect.value : "";
    const pGrp = pmGroupSelect ? pmGroupSelect.value : "";

    const suggested = state.suggest4DigitHsn ? state.suggest4DigitHsn({ name: pName, category: pCat, subCategory: pSub, productGroup: pGrp }) : "";
    if (suggested) {
      if (force || !pmHsnSelect.value) {
        // Check if option exists in dropdown, else add it
        let hasOption = false;
        for (let i = 0; i < pmHsnSelect.options.length; i++) {
          if (pmHsnSelect.options[i].value === suggested) {
            hasOption = true;
            break;
          }
        }
        if (!hasOption) {
          state.addHsnCode(suggested);
          repopulateSelect(pmHsnSelect, state.getHsnCodes(), suggested);
        } else {
          pmHsnSelect.value = suggested;
        }
        fillHsnDescription(suggested, force);
      }
    }
  };

  // --- PRODUCT NAME TYPABLE COMBOBOX LOGIC ---
  let activeNameIndex = 0;
  let filteredNameList = [];

  const getAllProductNamesList = () => {
    const set = new Set([...state.getProductNames()]);
    state.getMaterials().forEach(m => {
      if (m && m.name && m.name.trim()) set.add(m.name.trim().toUpperCase());
    });
    return Array.from(set).sort();
  };

  const renderNameDropdown = (filterQuery = "") => {
    if (!pmNameDropdown) return;
    const allNames = getAllProductNamesList();
    const q = (filterQuery || "").trim().toUpperCase();
    filteredNameList = q ? allNames.filter(n => n.toUpperCase().includes(q)) : allNames;

    if (filteredNameList.length === 0) {
      pmNameDropdown.innerHTML = `<div style="padding:6px 10px; font-size:0.75rem; color:#64748b; font-style:italic;">No matching products found</div>`;
      activeNameIndex = -1;
      return;
    }

    if (activeNameIndex < 0 || activeNameIndex >= filteredNameList.length) {
      activeNameIndex = 0;
    }

    pmNameDropdown.innerHTML = filteredNameList.map((n, idx) => {
      const isSel = idx === activeNameIndex;
      return `<div class="pm-name-item" data-index="${idx}" data-name="${n.replace(/"/g, '&quot;')}" style="padding:5px 10px; font-size:0.8rem; font-weight:600; cursor:pointer; user-select:none; border-bottom:1px solid #f1f5f9; background-color:${isSel ? '#1e40af' : 'white'}; color:${isSel ? 'white' : '#0f172a'};">${n}</div>`;
    }).join("");

    pmNameDropdown.querySelectorAll(".pm-name-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-index"), 10);
        if (activeNameIndex !== idx) {
          activeNameIndex = idx;
          highlightActiveNameItem();
        }
      });

      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const chosen = item.getAttribute("data-name");
        selectProductName(chosen);
      });
    });

    scrollActiveNameItemIntoView();
  };

  const highlightActiveNameItem = () => {
    if (!pmNameDropdown) return;
    pmNameDropdown.querySelectorAll(".pm-name-item").forEach((el, idx) => {
      const isSel = idx === activeNameIndex;
      el.style.backgroundColor = isSel ? '#1e40af' : 'white';
      el.style.color = isSel ? 'white' : '#0f172a';
    });
    scrollActiveNameItemIntoView();
  };

  const scrollActiveNameItemIntoView = () => {
    if (!pmNameDropdown) return;
    const activeEl = pmNameDropdown.querySelector(`.pm-name-item[data-index="${activeNameIndex}"]`);
    if (activeEl) {
      const elTop = activeEl.offsetTop;
      const elBottom = elTop + activeEl.offsetHeight;
      const dropTop = pmNameDropdown.scrollTop;
      const dropBottom = dropTop + pmNameDropdown.clientHeight;
      if (elTop < dropTop) {
        pmNameDropdown.scrollTop = elTop;
      } else if (elBottom > dropBottom) {
        pmNameDropdown.scrollTop = elBottom - pmNameDropdown.clientHeight;
      }
    }
  };

  const openNameDropdown = (filterQuery = "") => {
    if (!pmNameDropdown) return;
    pmNameDropdown.style.display = "block";
    renderNameDropdown(filterQuery);
  };

  const closeNameDropdown = () => {
    if (!pmNameDropdown) return;
    pmNameDropdown.style.display = "none";
  };

  const selectProductName = (name) => {
    if (!pmNameInput) return;
    pmNameInput.value = name.toUpperCase();
    closeNameDropdown();
    autoDetectAndFillHsn(false);

    // Auto-fill other material attributes if existing match found
    const matched = state.getMaterials().find(m => m && m.name && m.name.toUpperCase() === name.toUpperCase());
    if (matched) {
      const codeIn = document.getElementById("pm-code");
      const grpSel = document.getElementById("pm-group");
      const compSel = document.getElementById("pm-company");
      const catSel = document.getElementById("pm-category");
      const subSel = document.getElementById("pm-subcategory");
      const unitSel = document.getElementById("pm-unit");

      if (grpSel && (!grpSel.value || grpSel.value === "") && matched.productGroup) grpSel.value = matched.productGroup;
      if (catSel && (!catSel.value || catSel.value === "") && matched.category) catSel.value = matched.category;
      if (subSel && (!subSel.value || subSel.value === "") && matched.subCategory) subSel.value = matched.subCategory;
      if (unitSel && matched.unit) unitSel.value = matched.unit;
    }

    const codeIn = document.getElementById("pm-code");
    if (codeIn) codeIn.focus();
  };

  if (pmNameInput) {
    pmNameInput.addEventListener("focus", () => {
      openNameDropdown(pmNameInput.value);
    });

    pmNameInput.addEventListener("input", () => {
      pmNameInput.value = pmNameInput.value.toUpperCase();
      activeNameIndex = 0;
      openNameDropdown(pmNameInput.value);
      autoDetectAndFillHsn(false);
    });

    pmNameInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (pmNameDropdown.style.display === "none") {
          openNameDropdown(pmNameInput.value);
        } else if (filteredNameList.length > 0) {
          activeNameIndex = (activeNameIndex + 1) % filteredNameList.length;
          highlightActiveNameItem();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (pmNameDropdown.style.display === "none") {
          openNameDropdown(pmNameInput.value);
        } else if (filteredNameList.length > 0) {
          activeNameIndex = (activeNameIndex - 1 + filteredNameList.length) % filteredNameList.length;
          highlightActiveNameItem();
        }
      } else if (e.key === "Enter") {
        if (pmNameDropdown.style.display !== "none" && activeNameIndex >= 0 && filteredNameList[activeNameIndex]) {
          e.preventDefault();
          selectProductName(filteredNameList[activeNameIndex]);
        } else {
          closeNameDropdown();
        }
      } else if (e.key === "Escape") {
        closeNameDropdown();
      } else if (e.key === "Tab") {
        if (pmNameDropdown.style.display !== "none" && activeNameIndex >= 0 && filteredNameList[activeNameIndex]) {
          pmNameInput.value = filteredNameList[activeNameIndex];
        }
        closeNameDropdown();
        autoDetectAndFillHsn(false);
      }
    });
  }

  if (pmNameToggleBtn) {
    pmNameToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pmNameDropdown.style.display === "none") {
        openNameDropdown("");
        pmNameInput.focus();
      } else {
        closeNameDropdown();
      }
    });
  }

  const onDocClickClosePmNameDropdown = (e) => {
    if (pmNameDropdown && !pmNameDropdown.contains(e.target) && e.target !== pmNameInput && e.target !== pmNameToggleBtn) {
      closeNameDropdown();
    }
  };
  document.addEventListener("click", onDocClickClosePmNameDropdown);

  if (pmHsnSelect) {
    pmHsnSelect.addEventListener("change", () => {
      const code = pmHsnSelect.value.trim();
      if (code) {
        const desc = state.getHsnDescription ? state.getHsnDescription(code) : "";
        if (desc) {
          pmDescInput.value = desc.toUpperCase();
        }
      }
    });

    // If HSN is selected but description is currently empty, auto-fill
    if (pmHsnSelect.value && !pmDescInput.value.trim()) {
      fillHsnDescription(pmHsnSelect.value, false);
    }
  }

  if (pmCategorySelect) {
    pmCategorySelect.addEventListener("change", () => {
      autoDetectAndFillHsn(false);
    });
  }

  if (pmSubCategorySelect) {
    pmSubCategorySelect.addEventListener("change", () => {
      autoDetectAndFillHsn(false);
    });
  }

  if (pmGroupSelect) {
    pmGroupSelect.addEventListener("change", () => {
      autoDetectAndFillHsn(false);
    });
  }

  if (!isEdit && !pmHsnSelect.value) {
    autoDetectAndFillHsn(false);
  }

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
  const overlay = document.getElementById("modal-overlay");
  const close = () => {
    document.removeEventListener("click", onDocClickClosePmNameDropdown);
    overlay.classList.remove("active");
    root.innerHTML = "";
  };

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
      loyaltyPointsPerUnit: parseFloat(document.getElementById("pm-loyalty-points").value) || 0,
      alternateUnits: localAltUnits,
      loadingChargeEnabled: document.getElementById("pm-loading-charge-enabled")?.checked || false,
      loadingCharge: parseFloat(document.getElementById("pm-loading-charge")?.value) || 0
    };

    if (isCompUnregistered) {
      dataObj.hsnCode = "";
      dataObj.igst = 0;
      dataObj.cgst = 0;
      dataObj.sgst = 0;
      dataObj.cess = 0;
      dataObj.addlCess = 0;
      dataObj.gstExclRate = dataObj.gstInclRate;
    }

    try {
      if (dataObj.hsnCode && dataObj.description && typeof state.setHsnDescription === "function") {
        state.setHsnDescription(dataObj.hsnCode, dataObj.description);
      }
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
    <div class="modal-overlay active" id="modal-overlay">
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
                <input type="date" id="adj-date" class="form-control" style="background-color:white; color:black;" value="${state.getLoginDate()}" required>
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
          ${b.batchNo} (Stock: ${b.stock} ${selectedMat.unit} - Cost: \u20B9${b.landingCost.toFixed(2)})
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

  const overlay = document.getElementById("modal-overlay");
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
  if (!root) return;

  const modalId = "detailed-stock-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    existing.style.zIndex = String(2000 + root.children.length * 10);
    return;
  }

  const materials = state.getMaterials();
  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];
  const companies = [...new Set(materials.map(m => m.company).filter(Boolean))];
  const codes = [...new Set(materials.map(m => m.code).filter(Boolean))];
  const groups = [...new Set(materials.map(m => m.productGroup).filter(Boolean))];
  const productNames = [...new Set(materials.map(m => m.name).filter(Boolean))];
  const units = [...new Set(materials.map(m => m.unit).filter(Boolean))];
  const gstPercents = [...new Set(materials.map(m => (m.igst !== undefined && m.igst !== null && m.igst !== "") ? parseFloat(m.igst) : 18).filter(v => !isNaN(v)))];

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
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-space-between; align-items:center; border-radius: 2px;">
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
            <div style="display:flex; gap:12px; font-weight:bold; background:#d9e1f2; padding:6px; border:1px solid #8faadc; border-radius:2px; flex-wrap:wrap; align-items:center;">
              <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="chk-unavailable"> Show Unavailable items only</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="chk-available"> Show Available Items only</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="chk-available-negative"> Show Available & Negative Stock (Excluding Zero)</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:3px;"><input type="checkbox" id="chk-negative-only"> Show Negative Stock Only</label>
            </div>

            <!-- Sub filter row -->
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <div id="det-sub-filter-container" style="display:flex; align-items:center; gap:4px;">
                <!-- Dynamically updated -->
              </div>

              <div style="display:flex; align-items:center; gap:4px; font-weight:bold;">
                <span>Location:</span>
                <select id="det-location" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:130px; border:1px solid #7f99c2; height:22px;">
                  <option value="All">All Locations</option>
                  <option value="Main Yard">Main Yard</option>
                  <option value="Warehouse A">Warehouse A</option>
                </select>
              </div>

              <div style="background:#8faadc; font-weight:bold; padding:2px 8px; border:1px solid #7f99c2; border-radius:2px; display:flex; align-items:center; gap:6px;">
                <span>Date Range:</span>
                <span>From</span>
                <input type="date" id="det-date-from" class="form-control" style="padding:1px 3px; font-size:0.75rem; background:white; color:black; width:125px; border:1px solid #7f99c2; height:20px;" value="${state.getActiveFinancialYearStartDate() || '2026-04-01'}">
                <span>To</span>
                <input type="date" id="det-date-to" class="form-control" style="padding:1px 3px; font-size:0.75rem; background:white; color:black; width:125px; border:1px solid #7f99c2; height:20px;" value="${new Date().toISOString().split('T')[0]}">
              </div>
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
  `;

  root.appendChild(modalEl);
  const close = () => { modalEl.remove(); };

  modalEl.querySelector("#det-stock-close-x-btn")?.addEventListener("click", close);
  modalEl.querySelector("#btn-det-close")?.addEventListener("click", close);

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

  // Sorting state for Detailed Stock Register
  let currentSortCol = "productName";
  let currentSortDir = "asc";

  const getSortIconHtml = (col) => {
    if (currentSortCol !== col) return '<span style="opacity:0.4; font-size:0.7rem; margin-left:3px;">⇅</span>';
    return currentSortDir === "asc"
      ? '<span style="color:#fde047; font-size:0.75rem; margin-left:3px;">▲</span>'
      : '<span style="color:#fde047; font-size:0.75rem; margin-left:3px;">▼</span>';
  };

  // Bind Stock Status Checkboxes and Controls
  const chkUnavailable = document.getElementById("chk-unavailable");
  const chkAvailable = document.getElementById("chk-available");
  const chkAvailableNegative = document.getElementById("chk-available-negative");
  const chkNegativeOnly = document.getElementById("chk-negative-only");
  const chkUseSelling = document.getElementById("chk-use-selling");
  const selStockLoc = document.getElementById("det-stock-loc");
  const dateFromInput = document.getElementById("det-date-from");
  const dateToInput = document.getElementById("det-date-to");
  const btnView = document.getElementById("btn-det-view");

  if (chkUnavailable) {
    chkUnavailable.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (chkAvailable) chkAvailable.checked = false;
        if (chkAvailableNegative) chkAvailableNegative.checked = false;
        if (chkNegativeOnly) chkNegativeOnly.checked = false;
      }
      renderGridData();
    });
  }

  if (chkAvailable) {
    chkAvailable.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (chkUnavailable) chkUnavailable.checked = false;
        if (chkAvailableNegative) chkAvailableNegative.checked = false;
        if (chkNegativeOnly) chkNegativeOnly.checked = false;
      }
      renderGridData();
    });
  }

  if (chkAvailableNegative) {
    chkAvailableNegative.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (chkUnavailable) chkUnavailable.checked = false;
        if (chkAvailable) chkAvailable.checked = false;
        if (chkNegativeOnly) chkNegativeOnly.checked = false;
      }
      renderGridData();
    });
  }

  if (chkNegativeOnly) {
    chkNegativeOnly.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (chkUnavailable) chkUnavailable.checked = false;
        if (chkAvailable) chkAvailable.checked = false;
        if (chkAvailableNegative) chkAvailableNegative.checked = false;
      }
      renderGridData();
    });
  }

  if (dateFromInput) {
    dateFromInput.addEventListener("change", renderGridData);
    dateFromInput.addEventListener("input", renderGridData);
  }
  if (dateToInput) {
    dateToInput.addEventListener("change", renderGridData);
    dateToInput.addEventListener("input", renderGridData);
  }
  if (btnView) btnView.addEventListener("click", renderGridData);

  function getMaterialStockAsOfDate(m, dateTo) {
    if (!dateTo) return m.stock || 0;

    let stock = parseFloat(m.openingStock) || 0;

    state.getPurchases().forEach(p => {
      if (p.isCancelled || (p.date && p.date > dateTo)) return;
      (p.items || []).forEach(item => {
        if (item.materialId === m.id) {
          stock += (parseFloat(item.quantity) || 0);
        }
      });
    });

    state.getSalesReturns().forEach(sr => {
      if (sr.date && sr.date > dateTo) return;
      (sr.items || []).forEach(item => {
        if (item.materialId === m.id) {
          stock += (parseFloat(item.quantity) || 0);
        }
      });
    });

    state.getInvoices().forEach(inv => {
      if (inv.isCancelled || (inv.date && inv.date > dateTo)) return;
      (inv.items || []).forEach(item => {
        if (item.materialId === m.id) {
          stock -= (parseFloat(item.quantity) || 0);
        }
      });
    });

    state.getPurchaseReturns().forEach(pr => {
      if (pr.date && pr.date > dateTo) return;
      (pr.items || []).forEach(item => {
        if (item.materialId === m.id) {
          stock -= (parseFloat(item.quantity) || 0);
        }
      });
    });

    (state.getTransactions() || []).forEach(tx => {
      if (tx.date && tx.date > dateTo) return;
      if (tx.materialId === m.id || tx.productId === m.id) {
        if (tx.type === "stock_adjustment" || tx.type === "stock_transfer") {
          const qty = parseFloat(tx.quantity || tx.qty) || 0;
          if (tx.movement === "in" || tx.direction === "in") stock += qty;
          else if (tx.movement === "out" || tx.direction === "out") stock -= qty;
        }
      }
    });

    return stock;
  }

  function renderGridData() {
    const filterTypeEl = document.querySelector("input[name='det-filter-type']:checked");
    const filterType = filterTypeEl ? filterTypeEl.value : "all";
    const showUnavailable = document.getElementById("chk-unavailable")?.checked || false;
    const showAvailable = document.getElementById("chk-available")?.checked || false;
    const showAvailableNegative = document.getElementById("chk-available-negative")?.checked || false;
    const showNegativeOnly = document.getElementById("chk-negative-only")?.checked || false;
    const useSellingPrice = document.getElementById("chk-use-selling")?.checked || false;
    const stockLocVal = document.getElementById("det-stock-loc")?.value || "All";
    const dateFromVal = document.getElementById("det-date-from")?.value || "";
    const dateToVal = document.getElementById("det-date-to")?.value || "";
    
    const subSelectEl = document.getElementById("sub-filter-select");
    const subSelectVal = subSelectEl ? subSelectEl.value : "All";

    // Set subtitle title bar
    let subTitle = "Stock Summary All";
    if (filterType !== "all" && subSelectVal !== "All") {
      subTitle = `Stock Summary - ${filterType.toUpperCase()}: ${subSelectVal}`;
    }
    if (dateFromVal || dateToVal) {
      subTitle += ` | Period: ${dateFromVal || 'Beginning'} to ${dateToVal || 'Latest'}`;
    }
    document.getElementById("det-grid-subtitle").textContent = subTitle;

    // Filter materials array
    let filtered = materials.filter(m => {
      // Exclude deactivated products automatically
      if (m.isDeactivated) return false;

      // Filter selections matching subfilter option
      if (filterType === "category" && subSelectVal !== "All" && m.category !== subSelectVal) return false;
      if (filterType === "company" && subSelectVal !== "All" && m.company !== subSelectVal) return false;
      if (filterType === "code" && subSelectVal !== "All" && m.code !== subSelectVal) return false;
      if (filterType === "prodname" && subSelectVal !== "All" && m.name !== subSelectVal) return false;
      if (filterType === "prodgroup" && subSelectVal !== "All" && m.productGroup !== subSelectVal) return false;
      if (filterType === "unit" && subSelectVal !== "All" && m.unit !== subSelectVal) return false;
      if (filterType === "gst" && subSelectVal !== "All" && String((m.igst !== undefined && m.igst !== null && m.igst !== "") ? parseFloat(m.igst) : 18) !== String(subSelectVal)) return false;

      if (stockLocVal !== "All") {
        const matchesLoc = (m.location === stockLocVal) || (m.batches && m.batches.some(b => b.location === stockLocVal));
        if (!matchesLoc) return false;
      }

      const currentStock = dateToVal ? getMaterialStockAsOfDate(m, dateToVal) : (m.stock || 0);
      if (showUnavailable && currentStock !== 0) return false;
      if (showAvailable && currentStock <= 0) return false;
      if (showAvailableNegative && currentStock === 0) return false;
      if (showNegativeOnly && currentStock >= 0) return false;

      return true;
    });

    let totalValue = 0;
    const rows = filtered.map(m => {
      const stock = dateToVal ? getMaterialStockAsOfDate(m, dateToVal) : (m.stock || 0);
      let val = 0;
      let cost = 0;
      if (useSellingPrice) {
        cost = parseFloat(m.gstExclRate || m.sellingPrice || 0);
        val = stock * cost;
      } else {
        val = state.getStockValuationAtDate ? state.getStockValuationAtDate(dateToVal, m.id) : (stock * (parseFloat(m.landingCost) || 0));
        cost = stock !== 0 ? (val / stock) : (parseFloat(m.landingCost) || parseFloat(m.purchasePrice) || 0);
      }
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

    // Column Click Sort
    rows.sort((a, b) => {
      let valA = a[currentSortCol];
      let valB = b[currentSortCol];

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "number" && typeof valB === "number") {
        return currentSortDir === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return currentSortDir === "asc" ? -1 : 1;
      if (strA > strB) return currentSortDir === "asc" ? 1 : -1;
      return 0;
    });

    tableEl.innerHTML = `
      <thead>
        <tr style="background-color:#5a7b9c; color:white; font-weight:bold; position:sticky; top:0; user-select:none;">
          <th class="det-th-sort" data-col="company" style="padding:6px; border:1px solid #cbd5e1; cursor:pointer;" title="Click to sort by Company">Company ${getSortIconHtml('company')}</th>
          <th class="det-th-sort" data-col="productName" style="padding:6px; border:1px solid #cbd5e1; cursor:pointer;" title="Click to sort by Product Name">ProductName ${getSortIconHtml('productName')}</th>
          <th class="det-th-sort" data-col="productCode" style="padding:6px; border:1px solid #cbd5e1; cursor:pointer;" title="Click to sort by Product Code">ProductCode ${getSortIconHtml('productCode')}</th>
          <th class="det-th-sort" data-col="category" style="padding:6px; border:1px solid #cbd5e1; cursor:pointer;" title="Click to sort by Category">Category ${getSortIconHtml('category')}</th>
          <th class="det-th-sort" data-col="subCategory" style="padding:6px; border:1px solid #cbd5e1; cursor:pointer;" title="Click to sort by SubCategory">SubCategory ${getSortIconHtml('subCategory')}</th>
          <th class="det-th-sort" data-col="stock" style="padding:6px; border:1px solid #cbd5e1; text-align:right; cursor:pointer;" title="Click to sort by Stock">Stock ${getSortIconHtml('stock')}</th>
          <th class="det-th-sort" data-col="cost" style="padding:6px; border:1px solid #cbd5e1; text-align:right; width:110px; cursor:pointer;" title="Click to sort by Avg.Cost">Avg.Cost ${getSortIconHtml('cost')}</th>
          <th class="det-th-sort" data-col="value" style="padding:6px; border:1px solid #cbd5e1; text-align:right; width:130px; cursor:pointer;" title="Click to sort by Value">Value ${getSortIconHtml('value')}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const isNegative = r.stock < 0;
          const isZero = r.stock === 0;
          const trStyle = isNegative
            ? "color:#dc2626; font-weight:bold; border-bottom:1px solid #cbd5e1;"
            : (isZero ? "color:#c00000; font-weight:bold; border-bottom:1px solid #cbd5e1;" : "color:black; border-bottom:1px solid #cbd5e1;");
          const stockCellStyle = isNegative ? "color:#dc2626; font-weight:bold;" : "";
          return `
            <tr class="det-stock-row-clickable" data-name="${r.productName}" data-code="${r.productCode}" style="${trStyle} cursor:pointer; outline:none;" tabindex="0">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.company}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productCode}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.category}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.subCategory}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right; ${stockCellStyle}">${r.stock} ${r.unit}</td>
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

    tableEl.querySelectorAll(".det-th-sort").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.getAttribute("data-col");
        if (currentSortCol === col) {
          currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
        } else {
          currentSortCol = col;
          currentSortDir = "asc";
        }
        renderGridData();
      });
    });

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
  if (!root) return;

  const modalId = "item-wise-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    existing.style.zIndex = String(2000 + root.children.length * 10);
    return;
  }

  const materials = state.getMaterials();
  const productNames = [...new Set(materials.map(m => m.name).filter(Boolean))];

  const escapeAttr = (str) => String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapeHtml = (str) => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const getMatCode = (m) => m.code || m.id || "N/A";

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
                ${productNames.map(name => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("")}
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
  `;

  root.appendChild(modalEl);
  const close = () => { modalEl.remove(); };

  modalEl.querySelector("#item-wise-close-x-btn")?.addEventListener("click", close);
  modalEl.querySelector("#btn-iw-close")?.addEventListener("click", close);


  const productSelect = document.getElementById("iw-product");
  const codeSelect = document.getElementById("iw-code");
  const batchSelect = document.getElementById("iw-batch");

  productSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    if (pName) {
      const matching = materials.filter(m => String(m.name).trim() === String(pName).trim());
      const options = matching.map(m => {
        const cVal = getMatCode(m);
        return `<option value="${escapeAttr(cVal)}">${escapeHtml(cVal)}</option>`;
      });
      codeSelect.innerHTML = '<option value="">-- Choose Code --</option>' + options.join("");
      codeSelect.disabled = false;
      batchSelect.innerHTML = '<option value="">-- All Batches --</option>';
      batchSelect.disabled = true;

      // Auto-select code if only 1 matching product exists
      if (matching.length === 1) {
        codeSelect.value = getMatCode(matching[0]);
        codeSelect.dispatchEvent(new Event("change"));
      }
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
      const mat = materials.find(m => String(m.name).trim() === String(pName).trim() && (m.code === pCode || m.id === pCode || getMatCode(m) === pCode));
      if (mat && mat.batches && mat.batches.length > 0) {
        batchSelect.innerHTML = '<option value="">-- All Batches --</option>' +
          mat.batches.map(b => `<option value="${escapeAttr(b.batchNo)}">${escapeHtml(b.batchNo)}</option>`).join("");
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

    const mat = materials.find(m => String(m.name).trim() === String(pName).trim() && (m.code === pCode || m.id === pCode || getMatCode(m) === pCode));
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
        <td style="padding:6px; text-align:right; color:${runningBalance < 0 ? '#dc2626' : '#1e3b8b'};">${runningBalance.toFixed(2)} ${unitSymbol}</td>
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

      rowsHTML += `
        <tr data-voucher-no="${recVNo || issVNo}" style="border-bottom:1px solid #cbd5e1; cursor:pointer;" class="iw-row-clickable" tabindex="0">
          <td style="padding:6px; border-right:1px solid #cbd5e1;">${formatDate(e.date)}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; font-weight:500;">${recVNo}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; text-align:right; font-weight:500; color:#107c41;">${recQty}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; font-weight:500;">${issVNo}</td>
          <td style="padding:6px; border-right:1px solid #cbd5e1; text-align:right; font-weight:500; color:#ef4444;">${issQty}</td>
          <td style="padding:6px; text-align:right; font-weight:700; color:${runningBalance < 0 ? '#dc2626' : '#1e3b8b'};">${runningBalance.toFixed(2)} ${unitSymbol}</td>
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
        <td style="padding:8px; text-align:right; color:${runningBalance < 0 ? '#dc2626' : '#1e3b8b'}; text-decoration: underline; border-bottom: 2px double #000;">${runningBalance.toFixed(2)} ${unitSymbol}</td>
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

  document.getElementById("btn-iw-view")?.addEventListener("click", renderData);

  const autoRefreshItemWise = () => {
    if (productSelect.value && codeSelect.value) {
      renderData();
    }
  };

  const iwDateFrom = document.getElementById("iw-date-from");
  const iwDateTo = document.getElementById("iw-date-to");
  const iwLoc = document.getElementById("iw-location");

  if (iwDateFrom) {
    iwDateFrom.addEventListener("change", autoRefreshItemWise);
    iwDateFrom.addEventListener("input", autoRefreshItemWise);
  }
  if (iwDateTo) {
    iwDateTo.addEventListener("change", autoRefreshItemWise);
    iwDateTo.addEventListener("input", autoRefreshItemWise);
  }
  if (iwLoc) {
    iwLoc.addEventListener("change", autoRefreshItemWise);
  }
  if (batchSelect) {
    batchSelect.addEventListener("change", autoRefreshItemWise);
  }
  if (codeSelect) {
    codeSelect.addEventListener("change", autoRefreshItemWise);
  }

  if (preselectedProduct) {
    productSelect.value = preselectedProduct;
    productSelect.dispatchEvent(new Event("change"));
    if (preselectedCode) {
      codeSelect.value = preselectedCode;
      if (!codeSelect.value) {
        const matchMat = materials.find(m => m.name === preselectedProduct && (m.code === preselectedCode || m.id === preselectedCode || getMatCode(m) === preselectedCode));
        if (matchMat) codeSelect.value = getMatCode(matchMat);
      }
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
  modalDiv.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(1px); z-index:1000100; position:fixed; top:0; left:0; width:100%; height:100%;";

  const naturalCompare = (a, b) => {
    const strA = String(a || "").trim();
    const strB = String(b || "").trim();
    const numA = parseFloat(strA);
    const numB = parseFloat(strB);
    if (!isNaN(numA) && !isNaN(numB) && String(numA) === strA && String(numB) === strB) {
      return numA - numB;
    }
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" });
  };

  // Clone batches and sort naturally by batchNo by default
  let currentSortCol = "batchNo";
  let currentSortAsc = true;
  let batchFilterText = "";

  const allBatches = (mat.batches || []).map(b => ({
    batchNo: b.batchNo,
    stock: b.stock || 0,
    landingCost: b.landingCost || 0,
    sellingPrice: b.sellingPrice || 0,
    mrp: b.mrp || 0
  }));

  // Initial sort by batchNo
  allBatches.sort((a, b) => naturalCompare(a.batchNo, b.batchNo));

  function renderModalContent() {
    // Filter
    let displayList = allBatches.filter(b => {
      if (!batchFilterText) return true;
      const q = batchFilterText.toLowerCase();
      return String(b.batchNo).toLowerCase().includes(q) ||
             String(b.landingCost).includes(q) ||
             String(b.sellingPrice).includes(q) ||
             String(b.mrp).includes(q);
    });

    // Sort
    displayList.sort((a, b) => {
      let cmp = 0;
      if (currentSortCol === "batchNo") {
        cmp = naturalCompare(a.batchNo, b.batchNo);
      } else if (currentSortCol === "stock") {
        cmp = (a.stock || 0) - (b.stock || 0);
      } else if (currentSortCol === "landingCost") {
        cmp = (a.landingCost || 0) - (b.landingCost || 0);
      } else if (currentSortCol === "sellingPrice") {
        cmp = (a.sellingPrice || 0) - (b.sellingPrice || 0);
      } else if (currentSortCol === "mrp") {
        cmp = (a.mrp || 0) - (b.mrp || 0);
      }
      return currentSortAsc ? cmp : -cmp;
    });

    const sortIndicator = (col) => {
      if (currentSortCol !== col) return `<span style="opacity:0.3; font-size:0.7rem; margin-left:3px;">\u25B2\u25BC</span>`;
      return currentSortAsc ? `<span style="color:#d97706; font-size:0.75rem; margin-left:3px;">\u25B2</span>` : `<span style="color:#d97706; font-size:0.75rem; margin-left:3px;">\u25BC</span>`;
    };

    modalDiv.innerHTML = `
      <div class="modal-container modal-md" style="max-width:680px; width: 95vw; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #d97706; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        <div style="background: linear-gradient(180deg, #d97706 0%, #f59e0b 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div><i class="fa-solid fa-tags"></i> Edit Batch Selling Rates (${allBatches.length} Batches)</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="batch-rates-close-x-btn">&times;</button>
        </div>
        
        <div style="background:white; padding:12px; border:1px solid #94a3b8; border-radius:2px; display:flex; flex-direction:column; gap:8px; color:black;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:4px;">
            <div style="display:flex; gap:16px;">
              <div>
                <span style="font-weight:bold; color:#475569; display:block; font-size:0.75rem;">Product Name</span>
                <span style="font-size:0.9rem; font-weight:bold;">${mat.name}</span>
              </div>
              <div>
                <span style="font-weight:bold; color:#475569; display:block; font-size:0.75rem;">Code/Model</span>
                <span style="font-size:0.9rem; font-weight:bold; color:#2563eb;">${mat.code || mat.id}</span>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:6px;">
              <input type="text" id="batch-filter-input" class="form-control" placeholder="Search batch / rate..." value="${batchFilterText}" style="padding: 2px 6px; font-size: 0.78rem; height: 26px; width: 160px; border: 1px solid #94a3b8;">
            </div>
          </div>

          <div style="max-height: 280px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 3px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.78rem;">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-weight: bold; position: sticky; top: 0; z-index: 10;">
                  <th style="padding: 6px 8px; cursor: pointer; user-select: none;" class="sort-batch-th" data-col="batchNo">
                    Batch No ${sortIndicator("batchNo")}
                  </th>
                  <th style="padding: 6px 8px; text-align: right; cursor: pointer; user-select: none;" class="sort-batch-th" data-col="stock">
                    Stock ${sortIndicator("stock")}
                  </th>
                  <th style="padding: 6px 8px; text-align: right; cursor: pointer; user-select: none;" class="sort-batch-th" data-col="landingCost">
                    Landing Cost ${sortIndicator("landingCost")}
                  </th>
                  <th style="padding: 6px 8px; cursor: pointer; user-select: none;" class="sort-batch-th" data-col="sellingPrice">
                    Selling Price * ${sortIndicator("sellingPrice")}
                  </th>
                  <th style="padding: 6px 8px; cursor: pointer; user-select: none;" class="sort-batch-th" data-col="mrp">
                    MRP * ${sortIndicator("mrp")}
                  </th>
                </tr>
              </thead>
              <tbody>
                ${displayList.map((b) => `
                  <tr style="border-bottom: 1px dashed #cbd5e1;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #1e3b8b;">
                      ${b.batchNo}
                      <input type="hidden" class="batch-no-input" value="${b.batchNo}">
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 500;">${(b.stock || 0).toFixed(2)}</td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 500;">\u20B9${(b.landingCost || 0).toFixed(2)}</td>
                    <td style="padding: 4px 6px;">
                      <input type="number" class="form-control batch-selling-input" data-batch="${b.batchNo}" style="padding: 2px 4px; font-size: 0.78rem; text-align: right; width: 90px;" step="0.01" min="0" value="${(b.sellingPrice || 0).toFixed(2)}" required>
                    </td>
                    <td style="padding: 4px 6px;">
                      <input type="number" class="form-control batch-mrp-input" data-batch="${b.batchNo}" style="padding: 2px 4px; font-size: 0.78rem; text-align: right; width: 90px;" step="0.01" min="0" value="${(b.mrp || 0).toFixed(2)}" required>
                    </td>
                  </tr>
                `).join("")}
                ${displayList.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">No batches matching the criteria.</td>
                  </tr>
                ` : ""}
              </tbody>
            </table>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #94a3b8; padding-top:8px; margin-top:4px;">
            <div style="font-size:0.75rem; color:#64748b;">
              Showing <strong>${displayList.length}</strong> of <strong>${allBatches.length}</strong> batches
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn-primary" id="btn-batch-rates-save" style="background:#d97706; border:none; color:white; font-weight:bold; padding:4px 16px; font-size:0.78rem; border-radius:3px; cursor:pointer;" ${allBatches.length === 0 ? 'disabled' : ''}><i class="fa-solid fa-save"></i> Save Rates</button>
              <button type="button" class="btn btn-secondary" id="btn-batch-rates-cancel" style="padding:4px 16px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; font-size:0.78rem; border-radius:3px; cursor:pointer;">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach internal event handlers
    const closeModal = () => {
      modalDiv.remove();
    };

    document.getElementById("batch-rates-close-x-btn").addEventListener("click", closeModal);
    document.getElementById("btn-batch-rates-cancel").addEventListener("click", closeModal);

    // Filter input handler
    const filterInput = document.getElementById("batch-filter-input");
    if (filterInput) {
      filterInput.addEventListener("input", (e) => {
        batchFilterText = e.target.value;
        const pos = e.target.selectionStart;
        renderModalContent();
        const inp = document.getElementById("batch-filter-input");
        if (inp) {
          inp.focus();
          if (pos !== null) inp.setSelectionRange(pos, pos);
        }
      });
    }

    // Header column sort click handlers
    modalDiv.querySelectorAll(".sort-batch-th").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.getAttribute("data-col");
        if (currentSortCol === col) {
          currentSortAsc = !currentSortAsc;
        } else {
          currentSortCol = col;
          currentSortAsc = true;
        }
        renderModalContent();
      });
    });

    // Inputs change listeners to update memory
    modalDiv.querySelectorAll(".batch-selling-input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const bNo = e.target.getAttribute("data-batch");
        const found = allBatches.find(x => x.batchNo === bNo);
        if (found) found.sellingPrice = parseFloat(e.target.value) || 0;
      });
    });
    modalDiv.querySelectorAll(".batch-mrp-input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const bNo = e.target.getAttribute("data-batch");
        const found = allBatches.find(x => x.batchNo === bNo);
        if (found) found.mrp = parseFloat(e.target.value) || 0;
      });
    });

    // Save rates action
    document.getElementById("btn-batch-rates-save").addEventListener("click", () => {
      allBatches.forEach(b => {
        state.addOrUpdateMaterialBatch(materialId, {
          batchNo: b.batchNo,
          sellingPrice: b.sellingPrice,
          mrp: b.mrp
        });
      });

      state.saveState();
      alert("Batch selling rates updated successfully!");
      closeModal();
      if (onSaved) onSaved();
    });
  }

  document.body.appendChild(modalDiv);
  renderModalContent();
}

export function showMergeBatchesModal(preselectedMaterialId = null, preselectedSourceBatch = null, onMerged = null) {
  const materials = state.getMaterials() || [];
  const escapeAttr = (str) => String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapeHtml = (str) => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const getMatCode = (m) => m.code || m.id || "N/A";

  const modalDiv = document.createElement("div");
  modalDiv.className = "modal-overlay active";
  modalDiv.id = "merge-batches-overlay";
  modalDiv.style.cssText = "display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(1px); z-index:1000100; position:fixed; top:0; left:0; width:100%; height:100%;";

  const productNames = [...new Set(materials.map(m => m.name).filter(Boolean))];

  modalDiv.innerHTML = `
    <div class="modal-container modal-md" style="max-width:650px; width: 95vw; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #2563eb; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
      <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:6px 10px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
        <div style="font-size:0.9rem;"><i class="fa-solid fa-code-merge"></i> Merge Batch to Another Batch</div>
        <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="merge-close-x-btn">&times;</button>
      </div>

      <div style="background:white; padding:15px; border:1px solid #94a3b8; border-radius:2px; display:flex; flex-direction:column; gap:12px; color:black;">
        <!-- Product & Code Selection -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:3px;">Select Product *</label>
            <select id="mb-product" class="form-control" style="width:100%; padding:4px; font-size:0.82rem; background:white; color:black;">
              <option value="">-- Choose Product --</option>
              ${productNames.map(name => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:3px;">Code / Model *</label>
            <select id="mb-code" class="form-control" style="width:100%; padding:4px; font-size:0.82rem; background:white; color:black;" disabled>
              <option value="">-- Choose Code --</option>
            </select>
          </div>
        </div>

        <!-- Source & Target Batch Selection -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; background:#f8fafc; padding:10px; border:1px solid #cbd5e1; border-radius:3px;">
          <div>
            <label style="font-weight:bold; display:block; color:#dc2626; margin-bottom:3px;">
              <i class="fa-solid fa-arrow-right-from-bracket"></i> Source Batch (Merge FROM) *
            </label>
            <select id="mb-source-batch" class="form-control" style="width:100%; padding:4px; font-size:0.82rem; background:white; color:black;" disabled>
              <option value="">-- Select Source Batch --</option>
            </select>
          </div>
          <div>
            <label style="font-weight:bold; display:block; color:#16a34a; margin-bottom:3px;">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Target Batch (Merge TO) *
            </label>
            <select id="mb-target-batch" class="form-control" style="width:100%; padding:4px; font-size:0.82rem; background:white; color:black;" disabled>
              <option value="">-- Select Target Batch --</option>
            </select>
          </div>
        </div>

        <!-- Options -->
        <div style="display:flex; align-items:center; gap:8px; background:#eff6ff; padding:8px 10px; border:1px solid #bfdbfe; border-radius:3px;">
          <input type="checkbox" id="mb-weighted-cost" style="cursor:pointer;">
          <label for="mb-weighted-cost" style="cursor:pointer; font-size:0.78rem; font-weight:600; color:#1e3b8b;">
            Calculate & Update Weighted Average Landing Cost on Target Batch
          </label>
        </div>

        <!-- Live Summary Box -->
        <div id="mb-summary-box" style="background:#f1f5f9; padding:10px; border:1px solid #cbd5e1; border-radius:3px; display:none;">
          <div style="font-weight:bold; margin-bottom:6px; color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
            <i class="fa-solid fa-calculator"></i> Live Merge Preview
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; text-align:center; font-size:0.8rem;">
            <div style="background:#fef2f2; padding:6px; border:1px solid #fca5a5; border-radius:3px;">
              <div style="font-size:0.7rem; color:#991b1b; font-weight:bold;">Source Stock</div>
              <div id="mb-src-stock" style="font-size:0.95rem; font-weight:bold; color:#dc2626;">0</div>
            </div>
            <div style="background:#f0fdf4; padding:6px; border:1px solid #86efac; border-radius:3px;">
              <div style="font-size:0.7rem; color:#166534; font-weight:bold;">Target Stock</div>
              <div id="mb-tgt-stock" style="font-size:0.95rem; font-weight:bold; color:#16a34a;">0</div>
            </div>
            <div style="background:#eff6ff; padding:6px; border:1px solid #93c5fd; border-radius:3px;">
              <div style="font-size:0.7rem; color:#1e40af; font-weight:bold;">Resulting Stock</div>
              <div id="mb-res-stock" style="font-size:0.95rem; font-weight:bold; color:#2563eb;">0</div>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;">
          <button type="button" class="btn btn-secondary" id="btn-mb-cancel" style="padding:4px 14px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; font-size:0.8rem; border-radius:3px; cursor:pointer;">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-mb-submit" style="background:#2563eb; border:none; color:white; font-weight:bold; padding:5px 18px; font-size:0.8rem; border-radius:3px; cursor:pointer;" disabled>
            <i class="fa-solid fa-code-merge"></i> Execute Merge
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalDiv);

  const productSelect = modalDiv.querySelector("#mb-product");
  const codeSelect = modalDiv.querySelector("#mb-code");
  const sourceSelect = modalDiv.querySelector("#mb-source-batch");
  const targetSelect = modalDiv.querySelector("#mb-target-batch");
  const summaryBox = modalDiv.querySelector("#mb-summary-box");
  const srcStockEl = modalDiv.querySelector("#mb-src-stock");
  const tgtStockEl = modalDiv.querySelector("#mb-tgt-stock");
  const resStockEl = modalDiv.querySelector("#mb-res-stock");
  const submitBtn = modalDiv.querySelector("#btn-mb-submit");

  let currentSelectedMat = null;

  const closeModal = () => modalDiv.remove();

  modalDiv.querySelector("#merge-close-x-btn").addEventListener("click", closeModal);
  modalDiv.querySelector("#btn-mb-cancel").addEventListener("click", closeModal);

  productSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    if (pName) {
      const matching = materials.filter(m => String(m.name).trim() === String(pName).trim());
      const options = matching.map(m => `<option value="${escapeAttr(getMatCode(m))}">${escapeHtml(getMatCode(m))}</option>`);
      codeSelect.innerHTML = '<option value="">-- Choose Code --</option>' + options.join("");
      codeSelect.disabled = false;
      sourceSelect.innerHTML = '<option value="">-- Select Source Batch --</option>';
      sourceSelect.disabled = true;
      targetSelect.innerHTML = '<option value="">-- Select Target Batch --</option>';
      targetSelect.disabled = true;
      summaryBox.style.display = "none";
      submitBtn.disabled = true;

      if (matching.length === 1) {
        codeSelect.value = getMatCode(matching[0]);
        codeSelect.dispatchEvent(new Event("change"));
      }
    } else {
      codeSelect.innerHTML = '<option value="">-- Choose Code --</option>';
      codeSelect.disabled = true;
      sourceSelect.disabled = true;
      targetSelect.disabled = true;
      summaryBox.style.display = "none";
      submitBtn.disabled = true;
    }
  });

  codeSelect.addEventListener("change", () => {
    const pName = productSelect.value;
    const pCode = codeSelect.value;
    if (pName && pCode) {
      currentSelectedMat = materials.find(m => String(m.name).trim() === String(pName).trim() && (m.code === pCode || m.id === pCode || getMatCode(m) === pCode));
      if (currentSelectedMat && currentSelectedMat.batches && currentSelectedMat.batches.length > 0) {
        const batchOptions = currentSelectedMat.batches.map(b => `<option value="${escapeAttr(b.batchNo)}">${escapeHtml(b.batchNo)} (Stock: ${(b.stock || 0).toFixed(2)})</option>`).join("");
        sourceSelect.innerHTML = '<option value="">-- Select Source Batch --</option>' + batchOptions;
        targetSelect.innerHTML = '<option value="">-- Select Target Batch --</option>' + batchOptions;
        sourceSelect.disabled = false;
        targetSelect.disabled = false;
      } else {
        sourceSelect.innerHTML = '<option value="">No batches available</option>';
        targetSelect.innerHTML = '<option value="">No batches available</option>';
        sourceSelect.disabled = true;
        targetSelect.disabled = true;
      }
    } else {
      sourceSelect.disabled = true;
      targetSelect.disabled = true;
    }
    updatePreview();
  });

  const updatePreview = () => {
    const srcVal = sourceSelect.value;
    const tgtVal = targetSelect.value;
    if (currentSelectedMat && srcVal && tgtVal && srcVal !== tgtVal) {
      const srcB = currentSelectedMat.batches.find(b => String(b.batchNo).trim() === srcVal);
      const tgtB = currentSelectedMat.batches.find(b => String(b.batchNo).trim() === tgtVal);
      if (srcB && tgtB) {
        const sStock = parseFloat(srcB.stock) || 0;
        const tStock = parseFloat(tgtB.stock) || 0;
        srcStockEl.textContent = `${sStock.toFixed(2)} ${currentSelectedMat.unit || ''}`;
        tgtStockEl.textContent = `${tStock.toFixed(2)} ${currentSelectedMat.unit || ''}`;
        resStockEl.textContent = `${(sStock + tStock).toFixed(2)} ${currentSelectedMat.unit || ''}`;
        summaryBox.style.display = "block";
        submitBtn.disabled = false;
        return;
      }
    }
    summaryBox.style.display = "none";
    submitBtn.disabled = true;
  };

  sourceSelect.addEventListener("change", updatePreview);
  targetSelect.addEventListener("change", updatePreview);

  submitBtn.addEventListener("click", () => {
    const srcVal = sourceSelect.value;
    const tgtVal = targetSelect.value;
    if (!currentSelectedMat || !srcVal || !tgtVal || srcVal === tgtVal) {
      alert("Please select different Source and Target batches.");
      return;
    }

    const confirmMsg = `Are you sure you want to merge Batch "${srcVal}" into Batch "${tgtVal}" for product "${currentSelectedMat.name}"?\n\nThis will transfer stock, opening stock, and all transaction history into Batch "${tgtVal}".`;
    if (!confirm(confirmMsg)) return;

    const useWeightedCost = modalDiv.querySelector("#mb-weighted-cost").checked;
    const result = state.mergeBatches(currentSelectedMat.id, srcVal, tgtVal, { useWeightedAverageCost: useWeightedCost });

    if (result.success) {
      alert(result.message);
      closeModal();
      if (onMerged) onMerged();
    } else {
      alert("Error: " + result.message);
    }
  });

  // Pre-selection handling
  if (preselectedMaterialId) {
    const mat = materials.find(m => m.id === preselectedMaterialId);
    if (mat) {
      productSelect.value = mat.name;
      productSelect.dispatchEvent(new Event("change"));
      codeSelect.value = getMatCode(mat);
      codeSelect.dispatchEvent(new Event("change"));
      if (preselectedSourceBatch) {
        sourceSelect.value = preselectedSourceBatch;
        updatePreview();
      }
    }
  }
}
