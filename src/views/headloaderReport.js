import { state } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";

// Global filter state for Headloader Report
let hlFromDate = "";
let hlToDate = "";
let hlTxType = "all"; // 'purchases' (unloading), 'sales' (loading), 'all'
let hlProductFilter = "all";
let hlGroupBy = "group"; // 'group' (merged by product group e.g. CEMENT), 'product' (by product name)
let hlViewMode = "daily"; // 'daily' (default), 'summary', 'detailed'
let hlSearchQuery = "";
let hlSelectedProductIds = new Set();
let hlInitializedSelection = false;
let hlEditingDays = new Set();

// Helper to format day name
function getDayName(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch (e) {
    return "";
  }
}

// Helper to get friendly Type name
function getHeadloaderTypeName(typeId) {
  if (!typeId || typeId === "std" || typeId === "Standard") return "Standard";
  const types = state.getHeadloaderTypes ? state.getHeadloaderTypes() : [];
  const found = types.find(t => t.id === typeId || t.name === typeId);
  return found ? found.name : typeId;
}

// Helper to determine the Product Group name for a material / line item
function getProductGroupName(mat, rawName) {
  if (mat) {
    if (mat.category && mat.category.trim() && mat.category.trim().toLowerCase() !== "general" && mat.category.trim().toLowerCase() !== "uncategorized") {
      return mat.category.trim().toUpperCase();
    }
    if (mat.productGroup && mat.productGroup.trim()) {
      return mat.productGroup.trim().toUpperCase();
    }
  }
  
  const name = ((mat && mat.name) || rawName || "").trim().toUpperCase();
  if (!name) return "OTHER";

  // Check known standard material groupings keywords in construction / hardware / trading ERP
  const knownGroups = [
    "CEMENT", "STEEL", "TMT", "SAND", "GRAVEL", "BRICK", "BRICKS", 
    "TILE", "TILES", "PAINT", "PAINTS", "PIPE", "PIPES", "ROOFING", 
    "SHEET", "SHEETS", "PLYWOOD", "BLOCK", "BLOCKS", "LIME", "PUTTY", 
    "AGGREGATE", "AGGREGATES", "GRANITE", "MARBLE", "WOOD", "TIMBER",
    "DOOR", "DOORS", "WIRE", "WIRES", "GLASS", "HARDWARE", "CHEMICAL"
  ];

  for (const group of knownGroups) {
    const regex = new RegExp(`\\b${group}\\b`, "i");
    if (regex.test(name)) {
      if (group === "TILES" || group === "TILE") return "TILES";
      if (group === "BRICKS" || group === "BRICK") return "BRICK";
      if (group === "BLOCKS" || group === "BLOCK") return "BLOCKS";
      if (group === "PIPES" || group === "PIPE") return "PIPES";
      if (group === "SHEETS" || group === "SHEET") return "SHEETS";
      if (group === "PAINTS" || group === "PAINT") return "PAINT";
      if (group === "WIRES" || group === "WIRE") return "WIRES";
      if (group === "DOORS" || group === "DOOR") return "DOORS";
      if (group === "AGGREGATES" || group === "AGGREGATE") return "AGGREGATES";
      return group;
    }
  }

  // Fallback: take first word if multi-word, else full name
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    return words[0];
  }
  return name;
}

// Clean brand name by removing the group name prefix/suffix
function cleanBrandName(prodName, groupName) {
  if (!prodName) return "";
  if (!groupName) return prodName;
  let brand = prodName.replace(new RegExp(`\\b${groupName}\\b`, "gi"), "").trim();
  brand = brand.replace(/^[-–—:\s()]+|[-–—:\s()]+$/g, "").trim();
  return brand || prodName;
}

// Helper to format grouped codes/models
function formatGroupCodes(codesSet, prodName, materials) {
  const codes = Array.from(codesSet).filter(Boolean);
  if (codes.length === 0) return "ALL";
  const mats = materials || (state.getMaterials ? state.getMaterials() : []);
  const allModelsOfProduct = mats.filter(m => m.name === prodName);
  if (allModelsOfProduct.length > 1 && codes.length >= allModelsOfProduct.length) {
    return "ALL (All Models)";
  }
  if (codes.length <= 3) {
    return codes.join(", ");
  }
  return `${codes.slice(0, 2).join(", ")} (+${codes.length - 2} more)`;
}

// Helper to format grouped display name and code/model column
function formatGroupDisplay(item, groupByMode, materials) {
  if (groupByMode === "product") {
    return {
      displayName: item.productName,
      displayCode: formatGroupCodes(item.codesSet, item.productName, materials)
    };
  }

  const groupName = item.groupName;
  const prodNames = Array.from(item.productNamesSet || []).filter(Boolean);
  const codes = Array.from(item.codesSet || []).filter(Boolean);

  // If multiple products under this group are merged with same charge
  if (prodNames.length > 1) {
    const brandList = prodNames.map(p => cleanBrandName(p, groupName)).filter(Boolean);
    return {
      displayName: groupName,
      displayCode: brandList.length > 0 ? brandList.join(", ") : "ALL"
    };
  }

  // Single product name under this group
  if (prodNames.length === 1) {
    const p = prodNames[0];
    const brand = cleanBrandName(p, groupName);
    const codeStr = formatGroupCodes(item.codesSet, p, materials);

    // If product name was just the group name itself (e.g. "CEMENT")
    if (!brand || brand.toUpperCase() === groupName.toUpperCase()) {
      return {
        displayName: groupName,
        displayCode: codeStr !== "ALL" ? codeStr : "ALL"
      };
    }

    return {
      displayName: `${groupName} (${brand})`,
      displayCode: codeStr !== "ALL" ? codeStr : brand
    };
  }

  return {
    displayName: groupName || "ALL",
    displayCode: codes.join(", ") || "ALL"
  };
}

// Helper to load persisted selected product IDs
function loadPersistedSelectedProductIds() {
  const activeId = state.getActiveCompanyId ? state.getActiveCompanyId() : "1";
  let savedIds = [];
  
  // 1. From state
  if (typeof state.getHeadloaderProductIds === "function") {
    savedIds = state.getHeadloaderProductIds() || [];
  }
  
  // 2. Fallback from localStorage
  if ((!savedIds || savedIds.length === 0) && typeof localStorage !== "undefined") {
    try {
      const ls = localStorage.getItem(`erp_headloader_products_${activeId}`);
      if (ls) savedIds = JSON.parse(ls) || [];
    } catch (e) {}
  }

  hlSelectedProductIds = new Set(savedIds || []);

  // 3. Also auto-include any materials that already have rates configured
  const materials = state.getMaterials() || [];
  materials.forEach(m => {
    const hasRate = (parseFloat(m.loadingCharge) > 0) || 
                    (parseFloat(m.unloadingCharge) > 0) || 
                    (m.loadingChargeEnabled === true) || 
                    (m.unloadingChargeEnabled === true);
    if (hasRate) {
      hlSelectedProductIds.add(m.id);
    }
  });

  // Sync back to state to keep it permanent
  if (typeof state.setHeadloaderProductIds === "function" && hlSelectedProductIds.size > 0) {
    state.setHeadloaderProductIds(Array.from(hlSelectedProductIds));
  }
}

export function renderHeadloaderReport(container) {
  loadPersistedSelectedProductIds();
  const materials = state.getMaterials();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  // Default to TODAY for daily operational labor reporting
  if (!hlFromDate) {
    hlFromDate = todayStr;
  }
  if (!hlToDate) {
    hlToDate = todayStr;
  }

  // Filter materials to currently selected list for the product dropdown
  const selectedMaterials = materials.filter(m => hlSelectedProductIds.has(m.id));
  const selectedProductNames = [...new Set(selectedMaterials.map(m => m.name).filter(Boolean))].sort();

  container.innerHTML = `
    <div style="padding: 1rem; display: flex; flex-direction: column; gap: 1rem; height: 100%; box-sizing: border-box; overflow-y: auto;">
      
      <!-- Top Title Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 0.5rem; flex-wrap: wrap; gap: 8px;">
        <div>
          <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: #1e3a8a; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-people-carry-box" style="color: #ea580c;"></i>
            Daily Headloader Charges Report (Loading & Unloading)
          </h2>
          <span style="font-size: 0.78rem; color: #64748b; font-weight: 500;">
            Daily actual labor handling payable to headloaders based on purchases & sales volumes.
            <strong style="color: #059669;">(Non-accounting operational report)</strong>
          </span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" id="btn-hl-open-config" style="padding: 6px 14px; font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; gap: 6px; background: #0284c7; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <i class="fa-solid fa-sliders"></i> Select Products & Set Charges
            <span id="hl-top-count-badge" style="background: #0369a1; color: #fff; font-size: 0.72rem; padding: 1px 6px; border-radius: 10px; margin-left: 4px;">
              ${hlSelectedProductIds.size}
            </span>
          </button>
          <button type="button" class="btn btn-secondary" id="btn-hl-export-csv" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #94a3b8;">
            <i class="fa-solid fa-file-csv" style="color: #059669;"></i> Export CSV
          </button>
          <button type="button" class="btn btn-primary" id="btn-hl-print" style="padding: 6px 14px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; background: #1e40af; border: none;">
            <i class="fa-solid fa-print"></i> Print Daily Payout Slip
          </button>
        </div>
      </div>

      <!-- Filters & Control Bar -->
      <div class="panel" style="padding: 0.75rem 1rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <div style="display: flex; flex-direction: column; gap: 10px;">
          
          <!-- Quick Date Shortcut Chips + Main Date Controls -->
          <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; justify-content: space-between;">
            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end;">
              
              <!-- Quick Date Preset Buttons -->
              <div>
                <label style="font-size: 0.73rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">Quick Date</label>
                <div style="display: flex; gap: 4px;">
                  <button type="button" id="btn-hl-preset-today" class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.74rem; font-weight: 700;">Today</button>
                  <button type="button" id="btn-hl-preset-yesterday" class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.74rem; font-weight: 700;">Yesterday</button>
                  <button type="button" id="btn-hl-preset-week" class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.74rem; font-weight: 700;">This Week</button>
                  <button type="button" id="btn-hl-preset-month" class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.74rem; font-weight: 700;">This Month</button>
                </div>
              </div>

              <!-- From Date -->
              <div>
                <label style="font-size: 0.73rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">From Date</label>
                <input type="date" id="hl-date-from" class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: 130px;" value="${hlFromDate}">
              </div>

              <!-- To Date -->
              <div>
                <label style="font-size: 0.73rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">To Date</label>
                <input type="date" id="hl-date-to" class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: 130px;" value="${hlToDate}">
              </div>

              <!-- Transaction / Handling Type -->
              <div>
                <label style="font-size: 0.73rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Operation Scope</label>
                <select id="hl-tx-type" class="form-control" style="padding: 4px 8px; font-size: 0.8rem; min-width: 170px;">
                  <option value="all" ${hlTxType === 'all' ? 'selected' : ''}>All (Loading + Unloading)</option>
                  <option value="purchases" ${hlTxType === 'purchases' ? 'selected' : ''}>Unloading Only</option>
                  <option value="sales" ${hlTxType === 'sales' ? 'selected' : ''}>Loading Only</option>
                </select>
              </div>

              <!-- Grouping Mode Selector -->
              <div>
                <label style="font-size: 0.73rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Group By</label>
                <select id="hl-group-by" class="form-control" style="padding: 4px 8px; font-size: 0.8rem; min-width: 175px; font-weight: 600; color: #1e3a8a; background: #f0f9ff; border: 1px solid #7dd3fc;">
                  <option value="group" ${hlGroupBy === 'group' ? 'selected' : ''}>📦 Product Group (e.g. CEMENT)</option>
                  <option value="product" ${hlGroupBy === 'product' ? 'selected' : ''}>🏷️ Product Name (Individual)</option>
                </select>
              </div>

              <!-- Specific Product Filter -->
              <div style="min-width: 180px; max-width: 240px;">
                <label style="font-size: 0.73rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Filter Applicable Product</label>
                <select id="hl-product-filter" class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: 100%;">
                  <option value="all" ${hlProductFilter === 'all' ? 'selected' : ''}>-- All Products (${hlSelectedProductIds.size}) --</option>
                  ${selectedProductNames.map(name => `<option value="${name}" ${hlProductFilter === name ? 'selected' : ''}>${name}</option>`).join("")}
                </select>
              </div>

              <!-- Search filter -->
              <div style="min-width: 170px; max-width: 220px;">
                <label style="font-size: 0.73rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Search In Table</label>
                <div style="position: relative;">
                  <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 8px; top: 8px; font-size: 0.75rem; color: #94a3b8;"></i>
                  <input type="text" id="hl-search-input" class="form-control" style="padding: 4px 8px 4px 26px; font-size: 0.8rem; width: 100%; box-sizing: border-box;" placeholder="Filter items..." value="${hlSearchQuery}">
                </div>
              </div>
            </div>

            <!-- View Mode Toggle -->
            <div style="display: flex; gap: 4px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #fff;">
              <button type="button" class="btn ${hlViewMode === 'daily' ? 'btn-primary' : 'btn-secondary'}" id="btn-hl-mode-daily" style="padding: 5px 12px; font-size: 0.78rem; font-weight: 700; border: none;">
                <i class="fa-solid fa-calendar-day"></i> Daily View
              </button>
              <button type="button" class="btn ${hlViewMode === 'summary' ? 'btn-primary' : 'btn-secondary'}" id="btn-hl-mode-summary" style="padding: 5px 12px; font-size: 0.78rem; font-weight: 600; border: none;">
                <i class="fa-solid fa-boxes-stacked"></i> Product Summary
              </button>
              <button type="button" class="btn ${hlViewMode === 'detailed' ? 'btn-primary' : 'btn-secondary'}" id="btn-hl-mode-detailed" style="padding: 5px 12px; font-size: 0.78rem; font-weight: 600; border: none;">
                <i class="fa-solid fa-receipt"></i> Detailed Bills
              </button>
            </div>

          </div>
        </div>
      </div>

      <!-- KPI Summary Cards Banner -->
      <div id="hl-kpi-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <!-- Injected dynamically -->
      </div>

      <!-- Main Data Table Container -->
      <div class="panel" style="flex-grow: 1; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <div id="hl-table-container" style="overflow: auto; flex-grow: 1; max-height: 580px;">
          <!-- Table rendered dynamically -->
        </div>
      </div>

    </div>
  `;

  // Calculate Headloader Data strictly for SELECTED products
  function calculateHeadloaderData() {
    const from = hlFromDate;
    const to = hlToDate;
    const mode = hlTxType; // 'all', 'purchases', 'sales'
    const productSel = hlProductFilter;
    const q = hlSearchQuery.trim().toLowerCase();

    const materialsMap = new Map();
    materials.forEach(m => {
      materialsMap.set(m.id, m);
      materialsMap.set(`${m.name}_${m.code}`, m);
    });

    const rawPurchases = state.getPurchases() || [];
    const rawInvoices = state.getInvoices() || [];

    const detailedRows = [];

    // If no products are selected in config, flag empty selection
    if (hlSelectedProductIds.size === 0) {
      return { detailedRows: [], summaryRows: [], dailyGroups: [], noSelection: true };
    }

    // Process Purchases (Unloading)
    if (mode === "all" || mode === "purchases") {
      rawPurchases.forEach(pur => {
        if (pur.isCancelled) return;
        const purDate = pur.date || pur.billDate || "";
        if (from && purDate < from) return;
        if (to && purDate > to) return;

        (pur.items || []).forEach(item => {
          const mat = materialsMap.get(item.materialId) || materialsMap.get(`${item.name}_${item.code}`);
          if (!mat || !hlSelectedProductIds.has(mat.id)) return; // ONLY selected products

          const prodName = item.name || mat.name || "Unknown";
          if (productSel !== "all" && prodName !== productSel) return;

          const hType = pur.headloaderType || pur.handlingType || pur.unloadingType || "std";
          if (hType === "none" || hType === "no_charge" || hType === "No Loading Charge" || hType === "No Unloading Charge") return;

          const hTypeName = getHeadloaderTypeName(hType);
          let unloadingRate = 0;
          if (mat.unloadingChargesByType && mat.unloadingChargesByType[hType] !== undefined && mat.unloadingChargesByType[hType] !== null && mat.unloadingChargesByType[hType] !== "") {
            unloadingRate = parseFloat(mat.unloadingChargesByType[hType]) || 0;
          } else {
            unloadingRate = (mat.unloadingCharge !== undefined && mat.unloadingCharge !== null) 
              ? parseFloat(mat.unloadingCharge) 
              : (parseFloat(mat.loadingCharge) || 0);
          }

          const qty = parseFloat(item.quantity) || 0;
          if (qty <= 0) return;

          const prodCode = item.code || mat.code || "";
          const totalCharge = qty * unloadingRate;
          const billNo = pur.voucherNo || pur.invoiceNo || pur.id || "";
          const partyName = pur.contactName || "Supplier";
          const groupName = getProductGroupName(mat, prodName);

          detailedRows.push({
            date: purDate,
            billNo: billNo,
            type: "Purchase (Unloading)",
            operation: "Unloading",
            typeId: hType,
            typeName: hTypeName,
            partyName: partyName,
            materialId: mat.id,
            groupName: groupName,
            productName: prodName,
            productCode: prodCode,
            unit: item.unit || mat.unit || "Bags",
            qty: qty,
            rate: unloadingRate,
            total: totalCharge
          });
        });
      });
    }

    // Process Sales (Loading)
    if (mode === "all" || mode === "sales") {
      rawInvoices.forEach(inv => {
        if (inv.isCancelled) return;
        const invDate = inv.date || inv.invoiceDate || "";
        if (from && invDate < from) return;
        if (to && invDate > to) return;

        (inv.items || []).forEach(item => {
          const mat = materialsMap.get(item.materialId) || materialsMap.get(`${item.name}_${item.code}`);
          if (!mat || !hlSelectedProductIds.has(mat.id)) return; // ONLY selected products

          const prodName = item.name || mat.name || "Unknown";
          if (productSel !== "all" && prodName !== productSel) return;

          const hType = inv.headloaderType || inv.handlingType || inv.loadingType || "std";
          if (hType === "none" || hType === "no_charge" || hType === "No Loading Charge" || hType === "No Unloading Charge") return;

          const hTypeName = getHeadloaderTypeName(hType);
          let loadingRate = 0;
          if (mat.loadingChargesByType && mat.loadingChargesByType[hType] !== undefined && mat.loadingChargesByType[hType] !== null && mat.loadingChargesByType[hType] !== "") {
            loadingRate = parseFloat(mat.loadingChargesByType[hType]) || 0;
          } else {
            loadingRate = (mat.loadingCharge !== undefined && mat.loadingCharge !== null) 
              ? parseFloat(mat.loadingCharge) 
              : 0;
          }

          const qty = parseFloat(item.quantity) || 0;
          if (qty <= 0) return;

          const prodCode = item.code || mat.code || "";
          const totalCharge = qty * loadingRate;
          const billNo = inv.invoiceNo || inv.id || "";
          const partyName = inv.customerName || inv.contactName || "Customer";
          const groupName = getProductGroupName(mat, prodName);

          detailedRows.push({
            date: invDate,
            billNo: billNo,
            type: "Sale (Loading)",
            operation: "Loading",
            typeId: hType,
            typeName: hTypeName,
            partyName: partyName,
            materialId: mat.id,
            groupName: groupName,
            productName: prodName,
            productCode: prodCode,
            unit: item.unit || mat.unit || "Bags",
            qty: qty,
            rate: loadingRate,
            total: totalCharge
          });
        });
      });
    }

    // Filter detailed rows by search query
    let filteredDetailed = detailedRows;
    if (q) {
      filteredDetailed = detailedRows.filter(r => 
        r.productName.toLowerCase().includes(q) ||
        r.groupName.toLowerCase().includes(q) ||
        (r.typeName && r.typeName.toLowerCase().includes(q)) ||
        r.productCode.toLowerCase().includes(q) ||
        r.billNo.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        r.date.includes(q)
      );
    }
    filteredDetailed.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    // 1. Group by Date for Daily View
    const dateMap = new Map();
    filteredDetailed.forEach(r => {
      const d = r.date || "No Date";
      if (!dateMap.has(d)) {
        dateMap.set(d, {
          date: d,
          dayOfWeek: getDayName(d),
          itemsMap: new Map(),
          dayTotalQty: 0,
          dayTotalUnloading: 0,
          dayTotalLoading: 0,
          dayTotalPayable: 0
        });
      }
      const group = dateMap.get(d);
      const rateKey = r.rate.toFixed(4);
      const primaryTitle = (hlGroupBy === "group") ? r.groupName : r.productName;
      const itemKey = `${primaryTitle}___${r.operation}___${r.typeId || 'std'}___${r.unit}___${rateKey}`;

      if (!group.itemsMap.has(itemKey)) {
        group.itemsMap.set(itemKey, {
          itemKey: itemKey,
          materialId: r.materialId,
          matIdsSet: new Set(),
          groupName: r.groupName,
          productName: r.productName,
          productNamesSet: new Set(),
          codesSet: new Set(),
          operation: r.operation,
          typeId: r.typeId,
          typeName: r.typeName || "Standard",
          unit: r.unit,
          qty: 0,
          rate: r.rate,
          total: 0,
          billsCount: 0
        });
      }
      const itemAgg = group.itemsMap.get(itemKey);
      if (r.materialId) itemAgg.matIdsSet.add(r.materialId);
      if (r.productName) itemAgg.productNamesSet.add(r.productName);
      if (r.productCode) itemAgg.codesSet.add(r.productCode);
      itemAgg.qty += r.qty;
      itemAgg.total += r.total;
      itemAgg.billsCount += 1;
    });

    const dayOverrides = state.getHeadloaderDayOverrides ? state.getHeadloaderDayOverrides() : {};

    // Apply day overrides to daily groups
    dateMap.forEach((group, d) => {
      const dayMap = dayOverrides[d] || {};
      let dQty = 0;
      let dUnloading = 0;
      let dLoading = 0;
      let dPayable = 0;

      group.itemsMap.forEach((itemAgg) => {
        const itemOverrideKey = `${(hlGroupBy === "group") ? itemAgg.groupName : itemAgg.productName}___${itemAgg.operation}___${itemAgg.typeId || 'std'}___${itemAgg.unit}`;
        itemAgg.overrideKey = itemOverrideKey;
        const ov = dayMap[itemOverrideKey] || dayMap[itemAgg.itemKey];
        if (ov) {
          if (ov.qty !== undefined && ov.qty !== null && !isNaN(ov.qty)) {
            itemAgg.qty = parseFloat(ov.qty);
            itemAgg.isQtyOverridden = true;
          }
          if (ov.rate !== undefined && ov.rate !== null && !isNaN(ov.rate)) {
            itemAgg.rate = parseFloat(ov.rate);
            itemAgg.isRateOverridden = true;
          }
        }
        itemAgg.total = itemAgg.qty * itemAgg.rate;

        dQty += itemAgg.qty;
        if (itemAgg.operation === "Unloading") {
          dUnloading += itemAgg.total;
        } else {
          dLoading += itemAgg.total;
        }
        dPayable += itemAgg.total;
      });

      group.dayTotalQty = dQty;
      group.dayTotalUnloading = dUnloading;
      group.dayTotalLoading = dLoading;
      group.dayTotalPayable = dPayable;
    });

    const dailyGroups = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(g => ({
        date: g.date,
        dayOfWeek: g.dayOfWeek,
        dayTotalQty: g.dayTotalQty,
        dayTotalUnloading: g.dayTotalUnloading,
        dayTotalLoading: g.dayTotalLoading,
        dayTotalPayable: g.dayTotalPayable,
        items: Array.from(g.itemsMap.values()).map(item => {
          const display = formatGroupDisplay(item, hlGroupBy, materials);
          return {
            ...item,
            productName: display.displayName,
            productCode: display.displayCode
          };
        }).sort((a, b) => {
          if (a.productName === b.productName) {
            if (a.operation === b.operation) {
              return (a.typeName || "").localeCompare(b.typeName || "");
            }
            return a.operation.localeCompare(b.operation);
          }
          return a.productName.localeCompare(b.productName);
        })
      }));

    // 2. Aggregate into Period-wide Summary (from daily groups so day overrides are reflected)
    const summaryMap = new Map();
    dailyGroups.forEach(g => {
      g.items.forEach(item => {
        const rateKey = item.rate.toFixed(4);
        const primaryTitle = (hlGroupBy === "group") ? item.groupName : item.productName;
        const key = `${primaryTitle}___${item.operation}___${item.typeId || 'std'}___${item.unit}___${rateKey}`;

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            materialId: item.materialId,
            matIdsSet: new Set(item.matIdsSet || []),
            groupName: item.groupName,
            productName: item.productName,
            productNamesSet: new Set(item.productNamesSet || []),
            codesSet: new Set(item.codesSet || []),
            operation: item.operation,
            typeId: item.typeId,
            typeName: item.typeName || "Standard",
            unit: item.unit,
            qty: 0,
            rate: item.rate,
            total: 0,
            billsCount: item.billsCount || 1
          });
        }
        const agg = summaryMap.get(key);
        if (item.materialId) agg.matIdsSet.add(item.materialId);
        if (item.productName) agg.productNamesSet.add(item.productName);
        if (item.productCode) agg.codesSet.add(item.productCode);
        agg.qty += item.qty;
        agg.total += item.total;
      });
    });

    const summaryRows = Array.from(summaryMap.values()).map(item => {
      const display = formatGroupDisplay(item, hlGroupBy, materials);
      return {
        ...item,
        productName: display.displayName,
        productCode: display.displayCode
      };
    }).sort((a, b) => {
      if (a.productName === b.productName) {
        if (a.operation === b.operation) {
          return (a.typeName || "").localeCompare(b.typeName || "");
        }
        return a.operation.localeCompare(b.operation);
      }
      return a.productName.localeCompare(b.productName);
    });

    return { detailedRows: filteredDetailed, summaryRows, dailyGroups, noSelection: false };
  }

  // Render Grid Function
  function renderReportGrid() {
    const { detailedRows, summaryRows, dailyGroups, noSelection } = calculateHeadloaderData();

    // Compute Totals directly from daily groups to accurately reflect any day overrides
    let totalQty = 0;
    let totalUnloadingAmt = 0;
    let totalLoadingAmt = 0;
    let grandTotalAmt = 0;

    dailyGroups.forEach(g => {
      totalQty += g.dayTotalQty;
      totalUnloadingAmt += g.dayTotalUnloading;
      totalLoadingAmt += g.dayTotalLoading;
      grandTotalAmt += g.dayTotalPayable;
    });

    // Update KPI cards
    const kpiEl = container.querySelector("#hl-kpi-container");
    if (kpiEl) {
      kpiEl.innerHTML = `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 0.72rem; color: #1e40af; font-weight: 700; text-transform: uppercase;">Total Handled Qty</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #1e3a8a; margin-top: 2px;">
            ${totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style="font-size: 0.78rem; font-weight: 600; color: #64748b;">Units/Bags</span>
          </div>
        </div>

        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 0.72rem; color: #c2410c; font-weight: 700; text-transform: uppercase;">Unloading Payable</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #9a3412; margin-top: 2px;">
            ₹${totalUnloadingAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 0.72rem; color: #15803d; font-weight: 700; text-transform: uppercase;">Loading Payable</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #166534; margin-top: 2px;">
            ₹${totalLoadingAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: #fff; border-radius: 6px; padding: 10px 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="font-size: 0.72rem; color: #93c5fd; font-weight: 700; text-transform: uppercase;">Grand Total Labor Payable</div>
          <div style="font-size: 1.45rem; font-weight: 800; color: #fbbf24; margin-top: 2px;">
            ₹${grandTotalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      `;
    }

    const tableContainer = container.querySelector("#hl-table-container");
    if (!tableContainer) return;

    if (noSelection) {
      tableContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; color: #64748b;">
          <i class="fa-solid fa-people-carry-box" style="font-size: 2.8rem; color: #0284c7; margin-bottom: 14px;"></i>
          <h3 style="margin: 0 0 8px 0; font-size: 1.2rem; font-weight: 700; color: #1e3a8a;">No Applicable Products Added Yet</h3>
          <p style="margin: 0 0 16px 0; font-size: 0.88rem; max-width: 480px; color: #64748b;">
            Click the button below to type/choose Product Name & Code/Model and set their loading & unloading charges.
          </p>
          <button type="button" class="btn btn-primary" id="btn-hl-empty-config" style="padding: 8px 20px; font-size: 0.9rem; font-weight: 700; background: #0284c7; border: none; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-sliders"></i> Select Products & Set Charges
          </button>
        </div>
      `;
      const emptyBtn = tableContainer.querySelector("#btn-hl-empty-config");
      if (emptyBtn) {
        emptyBtn.addEventListener("click", () => {
          showSelectAndSetChargesLayout(() => {
            renderHeadloaderReport(container);
          });
        });
      }
      return;
    }

    if (hlViewMode === "daily") {
      // -------------------------------------------------------------
      // DAILY DATE-WISE REPORT (PRIMARY & DEFAULT)
      // -------------------------------------------------------------
      if (dailyGroups.length === 0) {
        tableContainer.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem; color: #64748b;">
            <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; color: #94a3b8; display: block; margin-bottom: 10px;"></i>
            <div style="font-weight: 700; font-size: 1rem; color: #1e293b;">No handling records found for this date range</div>
            <div style="font-size: 0.82rem; margin-top: 4px;">Make sure applicable products have inward/outward transactions on the selected dates.</div>
          </div>
        `;
        return;
      }

      let dailyHtml = `
        <div style="display: flex; flex-direction: column; gap: 14px; padding: 10px;">
      `;

      dailyGroups.forEach(group => {
        const isEditingThisDay = hlEditingDays.has(group.date);
        dailyHtml += `
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <!-- Date Banner Header (Total shown at bottom of the day, with Edit Button on right side) -->
            <div style="background: linear-gradient(90deg, #1e3a8a 0%, #0284c7 100%); color: white; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-calendar-day" style="color: #fbbf24; font-size: 1.1rem;"></i>
                <div>
                  <span style="font-weight: 800; font-size: 0.95rem;">${formatDate(group.date)}</span>
                  <span style="font-size: 0.82rem; color: #e0f2fe; margin-left: 6px;">(${group.dayOfWeek})</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: rgba(255,255,255,0.2); font-size: 0.72rem; padding: 3px 10px; border-radius: 10px; font-weight: 600;">
                  ${group.items.length} Item(s)
                </span>
                ${isEditingThisDay ? `
                  <button type="button" class="btn-hl-save-day" data-date="${group.date}" style="background: #16a34a; color: white; border: none; padding: 3px 10px; border-radius: 4px; font-size: 0.76rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.2);" title="Save changes for ${formatDate(group.date)}">
                    <i class="fa-solid fa-check"></i> Done
                  </button>
                  <button type="button" class="btn-hl-reset-day" data-date="${group.date}" style="background: rgba(239,68,68,0.25); color: #fee2e2; border: 1px solid rgba(239,68,68,0.5); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Reset back to system calculated transaction amounts">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                  </button>
                ` : `
                  <button type="button" class="btn-hl-edit-day" data-date="${group.date}" style="background: rgba(255,255,255,0.2); color: #ffffff; border: 1px solid rgba(255,255,255,0.4); padding: 3px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s;" title="Edit Charge & Quantity for ${formatDate(group.date)}">
                    <i class="fa-solid fa-pen-to-square" style="color: #fbbf24; font-size: 0.8rem;"></i> Edit
                  </button>
                `}
              </div>
            </div>

            <!-- Table of Products on this Day (4 Columns: Product Name, Operation & Type, Quantity, Charge / Unit, Total Payable) -->
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.84rem;">
              <thead>
                <tr style="background: #f8fafc; color: #334155; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 8px 12px; text-align: left;">Product Name, Operation &amp; Type</th>
                  <th style="padding: 8px 12px; text-align: right; width: 150px;">Quantity</th>
                  <th style="padding: 8px 12px; text-align: right; width: 140px;">Charge / Unit</th>
                  <th style="padding: 8px 12px; text-align: right; width: 150px;">Total Payable</th>
                </tr>
              </thead>
              <tbody>
                ${group.items.map((item, i) => `
                  <tr style="border-bottom: 1px solid #f1f5f9; background: ${isEditingThisDay ? '#f0f9ff' : (i % 2 === 0 ? '#ffffff' : '#fafafa')};">
                    <td style="padding: 8px 12px; text-align: left;">
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="font-weight: 700; color: #0f172a; font-size: 0.88rem;">${item.productName}</span>
                        ${item.operation === 'Unloading' 
                          ? `<span style="background: #ffedd5; color: #c2410c; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-arrow-down" style="font-size: 0.65rem;"></i> Unloading</span>`
                          : `<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-arrow-up" style="font-size: 0.65rem;"></i> Loading</span>`
                        }
                        <span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Handling / Vehicle Type">
                          <i class="fa-solid fa-truck-ramp-box" style="font-size: 0.65rem; color: #0284c7;"></i> ${item.typeName || 'Standard'}
                        </span>
                        ${(item.isQtyOverridden || item.isRateOverridden) ? `
                          <span style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 1px 5px; border-radius: 3px; font-size: 0.68rem; font-weight: 700;">
                            <i class="fa-solid fa-pencil" style="font-size: 0.6rem;"></i> Edited
                          </span>
                        ` : ''}
                      </div>
                    </td>
                    <td style="padding: 6px 12px; text-align: right;">
                      ${isEditingThisDay ? `
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                          <input type="number" step="any" min="0" 
                            class="form-control hl-day-qty-input" 
                            data-date="${group.date}" 
                            data-key="${item.overrideKey}"
                            value="${item.qty}" 
                            style="width: 85px; padding: 3px 6px; font-size: 0.85rem; font-weight: 700; text-align: right; border: 1.5px solid #0284c7; border-radius: 4px; background: #ffffff; color: #0f172a;"
                          >
                          <span style="font-size: 0.72rem; font-weight: 600; color: #64748b;">${item.unit}</span>
                        </div>
                      ` : `
                        <span style="font-weight: 700; color: #1e293b; font-size: 0.86rem;">
                          ${item.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style="font-size: 0.75rem; font-weight: 600; color: #64748b;">${item.unit}</span>
                        </span>
                      `}
                    </td>
                    <td style="padding: 6px 12px; text-align: right;">
                      ${isEditingThisDay ? `
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                          <span style="font-weight: 700; color: #0284c7; font-size: 0.8rem;">₹</span>
                          <input type="number" step="0.01" min="0" 
                            class="form-control hl-day-rate-input" 
                            data-date="${group.date}" 
                            data-key="${item.overrideKey}"
                            value="${item.rate.toFixed(2)}" 
                            style="width: 75px; padding: 3px 6px; font-size: 0.85rem; font-weight: 700; text-align: right; border: 1.5px solid #0284c7; border-radius: 4px; background: #ffffff; color: #0f172a;"
                          >
                        </div>
                      ` : `
                        <span style="color: #475569; font-weight: 600;">
                          ₹${item.rate.toFixed(2)}
                        </span>
                      `}
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #15803d; font-size: 0.9rem;">
                      ₹${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: 700; border-top: 1px solid #cbd5e1;">
                  <td style="padding: 8px 12px; text-align: right; color: #475569; font-size: 0.84rem;">Daily Total (${formatDate(group.date)}):</td>
                  <td style="padding: 8px 12px; text-align: right; color: #94a3b8;">—</td>
                  <td style="padding: 8px 12px; text-align: right; color: #94a3b8;">—</td>
                  <td style="padding: 8px 12px; text-align: right; font-size: 0.95rem; color: #1e3a8a; font-weight: 800;">₹${group.dayTotalPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `;
      });

      // Sticky Grand Total Footer Banner
      dailyHtml += `
          <div style="background: #1e293b; color: white; padding: 12px 18px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-calculator" style="color: #fbbf24;"></i>
              <span>PERIOD GRAND TOTAL (${dailyGroups.length} Days):</span>
            </div>
            <div style="display: flex; align-items: center; gap: 20px;">
              <span style="font-size: 0.9rem; color: #94a3b8;">Total Qty: <strong style="color: #fff;">${totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
              <span style="font-size: 1.25rem; font-weight: 800; color: #fbbf24;">₹${grandTotalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      `;

      tableContainer.innerHTML = dailyHtml;

    } else if (hlViewMode === "summary") {
      tableContainer.innerHTML = `
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="position: sticky; top: 0; background: #1e3b8b; color: white; z-index: 2;">
              <th style="padding: 8px 12px; text-align: left; border: 1px solid #3b82f6;">Product Name, Operation &amp; Type</th>
              <th style="padding: 8px 12px; text-align: right; border: 1px solid #3b82f6; width: 140px;">Total Quantity</th>
              <th style="padding: 8px 12px; text-align: right; border: 1px solid #3b82f6; width: 140px;">Charge / Unit</th>
              <th style="padding: 8px 12px; text-align: right; border: 1px solid #3b82f6; width: 160px;">Total Payable</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows.length === 0 ? `
              <tr>
                <td colspan="4" style="text-align: center; padding: 2.5rem; color: #64748b; font-weight: 500;">
                  <i class="fa-solid fa-circle-info" style="font-size: 1.5rem; color: #94a3b8; display: block; margin-bottom: 8px;"></i>
                  No transaction records found for the applicable products in this date range.
                </td>
              </tr>
            ` : summaryRows.map((row, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 8px 12px; text-align: left;">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-weight: 700; color: #1e293b; font-size: 0.88rem;">${row.productName}</span>
                    ${row.operation === 'Unloading' 
                      ? `<span style="background: #ffedd5; color: #c2410c; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-arrow-down" style="font-size: 0.65rem;"></i> Unloading</span>`
                      : `<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-arrow-up" style="font-size: 0.65rem;"></i> Loading</span>`
                    }
                    <span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Handling / Vehicle Type">
                      <i class="fa-solid fa-truck-ramp-box" style="font-size: 0.65rem; color: #0284c7;"></i> ${row.typeName || 'Standard'}
                    </span>
                  </div>
                </td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #0f172a;">
                  ${row.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style="font-size: 0.75rem; font-weight: 600; color: #64748b;">${row.unit}</span>
                </td>
                <td style="padding: 6px 12px; text-align: right;">
                  <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                    <span style="font-weight: 700; color: #475569; font-size: 0.8rem;">₹</span>
                    <input type="number" step="0.01" min="0" 
                      class="form-control hl-inline-rate-input" 
                      data-matids="${Array.from(row.matIdsSet || [row.materialId]).join(',')}" 
                      data-op="${row.operation}" 
                      data-typeid="${row.typeId || 'std'}"
                      value="${row.rate.toFixed(2)}" 
                      style="width: 80px; padding: 2px 6px; font-size: 0.85rem; font-weight: 700; text-align: right; border: 1px solid #cbd5e1; border-radius: 4px;"
                      title="Edit rate to recalculate live"
                    >
                  </div>
                </td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-size: 0.95rem; color: #16a34a;">
                  ₹${row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            `).join("")}
          </tbody>
          ${summaryRows.length > 0 ? `
            <tfoot>
              <tr style="position: sticky; bottom: 0; background: #e2e8f0; font-weight: 800; border-top: 2px solid #94a3b8; z-index: 1;">
                <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-size: 0.9rem;">TOTALS:</td>
                <td style="padding: 10px 12px; text-align: right; font-size: 0.95rem; color: #0f172a;">${totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td style="padding: 10px 12px; text-align: right; color: #64748b;">—</td>
                <td style="padding: 10px 12px; text-align: right; font-size: 1.05rem; color: #1e3a8a;">₹${grandTotalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      `;
    } else {
      // Detailed Bill-wise Table
      tableContainer.innerHTML = `
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="position: sticky; top: 0; background: #1e3b8b; color: white; z-index: 2;">
              <th style="padding: 8px 12px; text-align: left; border: 1px solid #3b82f6;">Date</th>
              <th style="padding: 8px 12px; text-align: left; border: 1px solid #3b82f6;">Bill / Voucher No</th>
              <th style="padding: 8px 12px; text-align: left; border: 1px solid #3b82f6; width: 130px;">Operation</th>
              <th style="padding: 8px 12px; text-align: left; border: 1px solid #3b82f6; width: 140px;">Handling Type</th>
              <th style="padding: 8px 12px; text-align: left; border: 1px solid #3b82f6;">Product Name</th>
              <th style="padding: 8px 12px; text-align: left; border: 1px solid #3b82f6;">Party Name</th>
              <th style="padding: 8px 12px; text-align: right; border: 1px solid #3b82f6;">Qty</th>
              <th style="padding: 8px 12px; text-align: right; border: 1px solid #3b82f6;">Rate</th>
              <th style="padding: 8px 12px; text-align: right; border: 1px solid #3b82f6;">Total Payable</th>
            </tr>
          </thead>
          <tbody>
            ${detailedRows.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align: center; padding: 2.5rem; color: #64748b; font-weight: 500;">
                  <i class="fa-solid fa-circle-info" style="font-size: 1.5rem; color: #94a3b8; display: block; margin-bottom: 8px;"></i>
                  No transaction records found for the applicable products in this date range.
                </td>
              </tr>
            ` : detailedRows.map((row, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 8px 12px; white-space: nowrap; color: #334155;">${formatDate(row.date)}</td>
                <td style="padding: 8px 12px; font-weight: 700; color: #1e3a8a;">${row.billNo}</td>
                <td style="padding: 8px 12px; text-align: left;">
                  ${row.operation === 'Unloading' 
                    ? `<span style="background: #ffedd5; color: #c2410c; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Unloading</span>`
                    : `<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Loading</span>`
                  }
                </td>
                <td style="padding: 8px 12px; text-align: left;">
                  <span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                    <i class="fa-solid fa-truck-ramp-box" style="font-size: 0.65rem; color: #0284c7;"></i> ${row.typeName || 'Standard'}
                  </span>
                </td>
                <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${row.productName}</td>
                <td style="padding: 8px 12px; color: #334155;">${row.partyName}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 700;">${row.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${row.unit}</td>
                <td style="padding: 8px 12px; text-align: right; color: #475569;">₹${row.rate.toFixed(2)}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #16a34a;">₹${row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join("")}
          </tbody>
          ${detailedRows.length > 0 ? `
            <tfoot>
              <tr style="position: sticky; bottom: 0; background: #e2e8f0; font-weight: 800; border-top: 2px solid #94a3b8; z-index: 1;">
                <td colspan="6" style="padding: 10px 12px; text-align: right; color: #1e293b; font-size: 0.9rem;">GRAND TOTAL:</td>
                <td style="padding: 10px 12px; text-align: right; font-size: 0.95rem; color: #0f172a;">${totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td style="padding: 10px 12px; text-align: right; color: #64748b;">—</td>
                <td style="padding: 10px 12px; text-align: right; font-size: 1.05rem; color: #1e3a8a;">₹${grandTotalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      `;
    }

    // Attach daily edit action listeners
    container.querySelectorAll(".btn-hl-edit-day").forEach(btn => {
      btn.addEventListener("click", () => {
        const d = btn.getAttribute("data-date");
        if (d) {
          hlEditingDays.add(d);
          renderReportGrid();
        }
      });
    });

    container.querySelectorAll(".btn-hl-save-day").forEach(btn => {
      btn.addEventListener("click", () => {
        const d = btn.getAttribute("data-date");
        if (d) {
          hlEditingDays.delete(d);
          renderReportGrid();
        }
      });
    });

    container.querySelectorAll(".btn-hl-reset-day").forEach(btn => {
      btn.addEventListener("click", () => {
        const d = btn.getAttribute("data-date");
        if (d) {
          if (confirm(`Reset manual edits for ${formatDate(d)} back to original transaction values?`)) {
            if (state.clearHeadloaderDayOverrides) state.clearHeadloaderDayOverrides(d);
            hlEditingDays.delete(d);
            renderReportGrid();
          }
        }
      });
    });

    // Attach daily quantity inputs
    container.querySelectorAll(".hl-day-qty-input").forEach(input => {
      input.addEventListener("input", () => {
        const d = input.getAttribute("data-date");
        const key = input.getAttribute("data-key");
        const val = parseFloat(input.value);
        if (d && key && !isNaN(val) && state.setHeadloaderDayOverride) {
          state.setHeadloaderDayOverride(d, key, { qty: val });
        }
      });
      input.addEventListener("change", () => {
        renderReportGrid();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          renderReportGrid();
        }
      });
    });

    // Attach daily rate inputs
    container.querySelectorAll(".hl-day-rate-input").forEach(input => {
      input.addEventListener("input", () => {
        const d = input.getAttribute("data-date");
        const key = input.getAttribute("data-key");
        const val = parseFloat(input.value);
        if (d && key && !isNaN(val) && state.setHeadloaderDayOverride) {
          state.setHeadloaderDayOverride(d, key, { rate: val });
        }
      });
      input.addEventListener("change", () => {
        renderReportGrid();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          renderReportGrid();
        }
      });
    });

    // Attach inline rate edit listeners in table
    container.querySelectorAll(".hl-inline-rate-input").forEach(input => {
      input.addEventListener("change", () => {
        const matIdsStr = input.getAttribute("data-matids") || input.getAttribute("data-matid") || "";
        const matIds = matIdsStr.split(",").filter(Boolean);
        const op = input.getAttribute("data-op");
        const typeId = input.getAttribute("data-typeid") || "std";
        const val = parseFloat(input.value) || 0;
        
        matIds.forEach(mId => {
          const mat = state.getMaterials().find(m => m.id === mId);
          if (mat) {
            if (op === "Unloading") {
              mat.unloadingChargesByType = mat.unloadingChargesByType || {};
              mat.unloadingChargesByType[typeId] = val;
              if (typeId === "std" || typeId === "Standard") {
                mat.unloadingCharge = val;
                mat.unloadingChargeEnabled = val > 0;
              }
            } else {
              mat.loadingChargesByType = mat.loadingChargesByType || {};
              mat.loadingChargesByType[typeId] = val;
              if (typeId === "std" || typeId === "Standard") {
                mat.loadingCharge = val;
                mat.loadingChargeEnabled = val > 0;
              }
            }
          }
        });
        state.saveState();
        renderReportGrid();
      });
    });
  }

  // Bind Open Separate Selection & Rate Setup Layout
  container.querySelector("#btn-hl-open-config").addEventListener("click", () => {
    showSelectAndSetChargesLayout(() => {
      renderHeadloaderReport(container);
    });
  });

  // Bind Filter Events
  container.querySelector("#hl-date-from").addEventListener("change", (e) => {
    hlFromDate = e.target.value;
    renderReportGrid();
  });
  container.querySelector("#hl-date-to").addEventListener("change", (e) => {
    hlToDate = e.target.value;
    renderReportGrid();
  });
  container.querySelector("#hl-tx-type").addEventListener("change", (e) => {
    hlTxType = e.target.value;
    renderReportGrid();
  });
  container.querySelector("#hl-group-by").addEventListener("change", (e) => {
    hlGroupBy = e.target.value;
    renderReportGrid();
  });
  container.querySelector("#hl-product-filter").addEventListener("change", (e) => {
    hlProductFilter = e.target.value;
    renderReportGrid();
  });
  container.querySelector("#hl-search-input").addEventListener("input", (e) => {
    hlSearchQuery = e.target.value;
    renderReportGrid();
  });

  // Quick Date Shortcut Listeners
  const dateFromInput = container.querySelector("#hl-date-from");
  const dateToInput = container.querySelector("#hl-date-to");

  container.querySelector("#btn-hl-preset-today").addEventListener("click", () => {
    const curToday = new Date().toISOString().split("T")[0];
    hlFromDate = curToday;
    hlToDate = curToday;
    dateFromInput.value = curToday;
    dateToInput.value = curToday;
    renderReportGrid();
  });

  container.querySelector("#btn-hl-preset-yesterday").addEventListener("click", () => {
    const yest = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    hlFromDate = yest;
    hlToDate = yest;
    dateFromInput.value = yest;
    dateToInput.value = yest;
    renderReportGrid();
  });

  container.querySelector("#btn-hl-preset-week").addEventListener("click", () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff)).toISOString().split("T")[0];
    const curToday = new Date().toISOString().split("T")[0];
    hlFromDate = monday;
    hlToDate = curToday;
    dateFromInput.value = monday;
    dateToInput.value = curToday;
    renderReportGrid();
  });

  container.querySelector("#btn-hl-preset-month").addEventListener("click", () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const curToday = now.toISOString().split("T")[0];
    hlFromDate = firstDay;
    hlToDate = curToday;
    dateFromInput.value = firstDay;
    dateToInput.value = curToday;
    renderReportGrid();
  });

  // Mode Toggles
  const btnDaily = container.querySelector("#btn-hl-mode-daily");
  const btnSummary = container.querySelector("#btn-hl-mode-summary");
  const btnDetailed = container.querySelector("#btn-hl-mode-detailed");

  btnDaily.addEventListener("click", () => {
    hlViewMode = "daily";
    btnDaily.className = "btn btn-primary";
    btnSummary.className = "btn btn-secondary";
    btnDetailed.className = "btn btn-secondary";
    renderReportGrid();
  });

  btnSummary.addEventListener("click", () => {
    hlViewMode = "summary";
    btnSummary.className = "btn btn-primary";
    btnDaily.className = "btn btn-secondary";
    btnDetailed.className = "btn btn-secondary";
    renderReportGrid();
  });

  btnDetailed.addEventListener("click", () => {
    hlViewMode = "detailed";
    btnDetailed.className = "btn btn-primary";
    btnDaily.className = "btn btn-secondary";
    btnSummary.className = "btn btn-secondary";
    renderReportGrid();
  });

  // Export CSV
  container.querySelector("#btn-hl-export-csv").addEventListener("click", () => {
    exportHeadloaderReportToCSV();
  });

  // Print Payout Slip
  container.querySelector("#btn-hl-print").addEventListener("click", () => {
    printHeadloaderPayoutSlip();
  });

  // Initial Grid Render
  renderReportGrid();
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// MANAGE HANDLING / VEHICLE TYPES MODAL
// -------------------------------------------------------------
export function showManageHeadloaderTypesModal(onUpdatedCallback = null) {
  const root = document.getElementById("modal-container-root");
  const modalId = "hl-manage-types-overlay";
  
  const overlayEl = document.createElement("div");
  overlayEl.className = "modal-overlay active";
  overlayEl.id = modalId;
  overlayEl.style.cssText = "display: flex; justify-content: center; align-items: center; background: rgba(15,23,42,0.6); backdrop-filter: blur(2px); z-index: 2800;";

  function renderTypesModalContent() {
    const types = state.getHeadloaderTypes ? state.getHeadloaderTypes() : [{ id: "std", name: "Standard", category: "both", isDefault: true }];

    overlayEl.innerHTML = `
      <div class="modal-container" style="max-width: 580px; width: 92vw; background: #ffffff; border-radius: 8px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); overflow: hidden; border: 1px solid #cbd5e1; display: flex; flex-direction: column;">
        
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.95rem;">
            <i class="fa-solid fa-truck-ramp-box" style="color: #fbbf24;"></i>
            <span>Manage Loading & Unloading Types</span>
          </div>
          <button type="button" id="btn-close-hl-types" style="background: none; border: none; color: white; font-size: 1.25rem; cursor: pointer;">&times;</button>
        </div>

        <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc;">
          <div style="font-size: 0.78rem; color: #475569;">
            Create handling types for vehicles or operations. Select <strong>Loading</strong> (shows in Sales window), <strong>Unloading</strong> (shows in Purchase window), or <strong>Both</strong>.
          </div>

          <!-- Add Type Input + Operation Type Selector -->
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <input type="text" id="hl-new-type-name" class="form-control" placeholder="Type name (e.g. Small Vehicle, Trailer)..." style="flex: 1; min-width: 170px; padding: 6px 10px; font-size: 0.82rem; font-weight: 600; border: 1.5px solid #cbd5e1; border-radius: 4px;">
            <select id="hl-new-type-category" class="form-control" style="width: 175px; padding: 6px 8px; font-size: 0.8rem; font-weight: 600; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <option value="both">Both (Load & Unload)</option>
              <option value="loading">Loading (Sales Window)</option>
              <option value="unloading">Unloading (Purchase Window)</option>
            </select>
            <button type="button" id="btn-add-hl-type" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.82rem; font-weight: 700; background: #0284c7; border: none; white-space: nowrap; cursor: pointer;">
              <i class="fa-solid fa-plus"></i> Add Type
            </button>
          </div>

          <!-- Types List Table -->
          <div style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; max-height: 250px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
              <thead>
                <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; color: #334155;">
                  <th style="padding: 6px 10px; text-align: left; width: 35px;">#</th>
                  <th style="padding: 6px 10px; text-align: left;">Type Name</th>
                  <th style="padding: 6px 10px; text-align: center; width: 150px;">Applies To</th>
                  <th style="padding: 6px 10px; text-align: center; width: 60px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${types.map((t, idx) => {
                  const cat = t.category || "both";
                  let catBadge = `<span style="background: #dbeafe; color: #1e40af; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Both (Sales & Pur)</span>`;
                  if (cat === "loading") {
                    catBadge = `<span style="background: #dcfce7; color: #15803d; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;"><i class="fa-solid fa-arrow-up"></i> Loading (Sales)</span>`;
                  } else if (cat === "unloading") {
                    catBadge = `<span style="background: #ffedd5; color: #c2410c; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;"><i class="fa-solid fa-arrow-down"></i> Unloading (Pur)</span>`;
                  }

                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">${idx + 1}</td>
                      <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${t.name}</td>
                      <td style="padding: 6px 10px; text-align: center;">${catBadge}</td>
                      <td style="padding: 6px 10px; text-align: center;">
                        ${(t.id === 'std' || t.isDefault) 
                          ? `<span style="color: #cbd5e1; font-size: 0.75rem;">—</span>`
                          : `<button type="button" class="btn-del-hl-type" data-id="${t.id}" style="background: none; border: none; color: #ef4444; font-size: 0.9rem; cursor: pointer;" title="Delete this type"><i class="fa-solid fa-trash-can"></i></button>`
                        }
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div style="padding: 8px 16px; background: #e2e8f0; display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" id="btn-done-hl-types" class="btn btn-secondary" style="padding: 5px 16px; font-size: 0.8rem; font-weight: 700;">Done</button>
        </div>

      </div>
    `;

    // Bind Close
    const close = () => {
      overlayEl.remove();
      if (onUpdatedCallback) onUpdatedCallback();
    };
    overlayEl.querySelector("#btn-close-hl-types")?.addEventListener("click", close);
    overlayEl.querySelector("#btn-done-hl-types")?.addEventListener("click", close);

    // Bind Add Type
    const addInput = overlayEl.querySelector("#hl-new-type-name");
    const addCatSelect = overlayEl.querySelector("#hl-new-type-category");
    const addBtn = overlayEl.querySelector("#btn-add-hl-type");
    const doAdd = () => {
      const val = (addInput ? addInput.value : "").trim();
      const cat = addCatSelect ? addCatSelect.value : "both";
      if (!val) {
        alert("Please enter a Type name.");
        if (addInput) addInput.focus();
        return;
      }
      if (typeof state.addHeadloaderType === "function") {
        state.addHeadloaderType(val, cat);
      }
      renderTypesModalContent();
    };
    addBtn?.addEventListener("click", doAdd);
    addInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doAdd();
      }
    });

    // Bind Delete Type
    overlayEl.querySelectorAll(".btn-del-hl-type").forEach(btn => {
      btn.addEventListener("click", () => {
        const tId = btn.getAttribute("data-id");
        if (confirm("Delete this handling/vehicle type?")) {
          if (typeof state.deleteHeadloaderType === "function") {
            state.deleteHeadloaderType(tId);
          }
          renderTypesModalContent();
        }
      });
    });
  }

  renderTypesModalContent();
  root.appendChild(overlayEl);
}

// -------------------------------------------------------------
// SEPARATE DEDICATED LAYOUT TO SELECT PRODUCTS AND SET CHARGES
// (Features Typable Search + Dropdown with "ALL" Code/Model option + Dynamic Type Columns)
// -------------------------------------------------------------
export function showSelectAndSetChargesLayout(onSavedCallback = null) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();

  // Helper to get types
  const getTypes = () => (state.getHeadloaderTypes ? state.getHeadloaderTypes() : [{ id: "std", name: "Standard", category: "both", isDefault: true }]);

  root.innerHTML = `
    <div class="modal-overlay active" id="hl-select-layout-overlay" style="display: flex; justify-content: center; align-items: center; background: rgba(15,23,42,0.5); backdrop-filter: blur(2px); z-index: 2500;">
      <div class="modal-container" style="max-width: 1080px; width: 96vw; height: 88vh; background: #ffffff; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #cbd5e1;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); color: white; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-sliders" style="color: #fbbf24; font-size: 1.25rem;"></i>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Select & Set Products with Headloader Charges</h3>
              <div style="font-size: 0.74rem; color: #e0f2fe; margin-top: 1px;">
                Set loading & unloading charges per product across customizable Handling / Vehicle Types.
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn" id="btn-hl-manage-types" style="background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 5px 12px; font-size: 0.8rem; font-weight: 700; border-radius: 4px; display: flex; align-items: center; gap: 6px; cursor: pointer;" title="Create or delete custom handling/vehicle types">
              <i class="fa-solid fa-truck-ramp-box"></i> Manage Types / Vehicles
            </button>
            <button type="button" class="win-btn" id="btn-hl-layout-close-x" style="background: none; border: none; color: white; font-size: 1.3rem; cursor: pointer;">&times;</button>
          </div>
        </div>

        <!-- TOP ADD PANEL: TYPABLE PRODUCT NAME + CODE/MODEL DROPDOWN WITH 'ALL' + TYPE SELECTOR + RATES -->
        <div style="background: #f8fafc; padding: 12px 18px; border-bottom: 2px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.03em;">
            <i class="fa-solid fa-plus-circle" style="color: #0284c7;"></i> Add Product to Applicable List & Set Rates
          </div>
          
          <div style="display: grid; grid-template-columns: 2fr 1.3fr 1.3fr 1fr 1fr auto; gap: 10px; align-items: flex-end;">
            
            <!-- 1. Typable Product Name Input with Full Scrollable Custom Dropdown -->
            <div style="position: relative;">
              <label for="hl-add-prod-name-input" style="font-size: 0.75rem; font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">
                1. Product Name *
              </label>
              <div style="display: flex; position: relative;">
                <input type="text" id="hl-add-prod-name-input" class="form-control" placeholder="Type or click to search products..." autocomplete="off" style="width: 100%; padding: 5px 28px 5px 8px; font-size: 0.82rem; font-weight: 600; box-sizing: border-box;">
                <button type="button" id="hl-prod-dropdown-toggle-btn" title="Show all products" style="position: absolute; right: 0; top: 0; bottom: 0; width: 28px; background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; outline: none;">
                  <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem;"></i>
                </button>
              </div>

              <!-- Custom Dropdown Popup -->
              <div id="hl-prod-custom-dropdown" style="display: none; position: absolute; top: calc(100% + 2px); left: 0; width: 100%; min-width: 320px; background: white; border: 1.5px solid #0284c7; box-shadow: 0 10px 25px rgba(0,0,0,0.25); z-index: 9999; border-radius: 4px; overflow: hidden;">
                <div id="hl-prod-custom-list" style="max-height: 240px; overflow-y: auto; background: white;"></div>
                <div style="background: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #64748b; user-select: none;">
                  <span>Showing <strong id="hl-prod-custom-count" style="color: #0284c7;">0</strong> product names</span>
                  <span style="font-style: italic;">↑ ↓ keys & Enter to select</span>
                </div>
              </div>
            </div>

            <!-- 2. Code / Model Dropdown -->
            <div>
              <label for="hl-add-prod-code-select" style="font-size: 0.75rem; font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">
                2. Code / Model *
              </label>
              <select id="hl-add-prod-code-select" class="form-control" style="width: 100%; padding: 5px 8px; font-size: 0.82rem; font-weight: 600;">
                <option value="ALL">ALL (All Codes/Models)</option>
              </select>
            </div>

            <!-- 3. Handling Type / Vehicle Dropdown -->
            <div>
              <label for="hl-add-target-type-select" style="font-size: 0.75rem; font-weight: 700; color: #1e3a8a; display: block; margin-bottom: 4px;">
                3. Target Type
              </label>
              <select id="hl-add-target-type-select" class="form-control" style="width: 100%; padding: 5px 8px; font-size: 0.82rem; font-weight: 600;">
                <option value="__ALL_TYPES__" data-category="both">All Types (Uniform)</option>
                ${getTypes().map(t => {
                  const label = t.name + (t.category === 'loading' ? ' [Loading/Sale]' : (t.category === 'unloading' ? ' [Unloading/Pur]' : ' [Both]'));
                  return `<option value="${t.id}" data-category="${t.category || 'both'}">${label}</option>`;
                }).join('')}
              </select>
            </div>

            <!-- Unloading Charge (Purchases) -->
            <div>
              <label for="hl-add-unrate" id="lbl-hl-add-unrate" style="font-size: 0.75rem; font-weight: 700; color: #c2410c; display: block; margin-bottom: 4px;">
                Unload ₹ (Pur)
              </label>
              <input type="number" step="0.01" min="0" id="hl-add-unrate" class="form-control" placeholder="0.00" style="width: 100%; padding: 5px 8px; font-size: 0.82rem; font-weight: 700; text-align: right; box-sizing: border-box;">
            </div>

            <!-- Loading Charge (Sales) -->
            <div>
              <label for="hl-add-ldrate" id="lbl-hl-add-ldrate" style="font-size: 0.75rem; font-weight: 700; color: #15803d; display: block; margin-bottom: 4px;">
                Load ₹ (Sale)
              </label>
              <input type="number" step="0.01" min="0" id="hl-add-ldrate" class="form-control" placeholder="0.00" style="width: 100%; padding: 5px 8px; font-size: 0.82rem; font-weight: 700; text-align: right; box-sizing: border-box;">
            </div>

            <!-- Add / Update Button -->
            <div>
              <button type="button" id="btn-hl-add-product" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.82rem; font-weight: 700; background: #0284c7; border: none; white-space: nowrap; height: 32px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <i class="fa-solid fa-plus"></i> Add Product
              </button>
            </div>

          </div>
        </div>

        <!-- TABLE OF ONLY APPLICABLE / ADDED PRODUCTS -->
        <div style="padding: 8px 18px 4px 18px; background: #ffffff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; font-size: 0.85rem; color: #1e293b; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-clipboard-list" style="color: #0284c7;"></i>
            <span>Applicable Products List (<span id="hl-modal-count-number">${hlSelectedProductIds.size}</span> products configured)</span>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" id="btn-hl-modal-clear-all" class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.72rem; color: #ef4444; border: 1px solid #fca5a5; background: #fff; cursor: pointer;">
              <i class="fa-solid fa-trash-can"></i> Clear All
            </button>
          </div>
        </div>

        <div style="flex-grow: 1; overflow-y: auto; padding: 0;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.83rem;" id="hl-applicable-table">
            <thead id="hl-applicable-table-head">
              <!-- Rendered via JS dynamically with Type columns -->
            </thead>
            <tbody id="hl-applicable-table-body">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>

        <!-- Modal Footer -->
        <div style="background: #f8fafc; padding: 10px 18px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.75rem; color: #64748b;">
            <i class="fa-solid fa-circle-check" style="color: #059669;"></i> <strong>Loading Types</strong> apply to Sales window, <strong>Unloading Types</strong> apply to Purchase window.
          </span>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary" id="btn-hl-layout-cancel" style="padding: 6px 16px; font-size: 0.85rem;">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-hl-layout-save" style="padding: 6px 20px; font-size: 0.85rem; font-weight: 700; background: #0284c7; border: none; cursor: pointer;">
              <i class="fa-solid fa-check"></i> Apply & Generate Report
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("hl-select-layout-overlay");
  const closeModal = () => { 
    document.removeEventListener("click", onDocClickOutside);
    overlay.remove(); 
  };

  document.getElementById("btn-hl-layout-close-x").addEventListener("click", closeModal);
  document.getElementById("btn-hl-layout-cancel").addEventListener("click", closeModal);

  // Form Elements
  const prodNameInput = document.getElementById("hl-add-prod-name-input");
  const prodToggleBtn = document.getElementById("hl-prod-dropdown-toggle-btn");
  const customDropdown = document.getElementById("hl-prod-custom-dropdown");
  const customListEl = document.getElementById("hl-prod-custom-list");
  const customCountEl = document.getElementById("hl-prod-custom-count");
  const prodCodeSelect = document.getElementById("hl-add-prod-code-select");
  const targetTypeSelect = document.getElementById("hl-add-target-type-select");
  const unRateInput = document.getElementById("hl-add-unrate");
  const ldRateInput = document.getElementById("hl-add-ldrate");
  const addBtn = document.getElementById("btn-hl-add-product");

  // Sorted unique product names
  const allUniqueProductNames = [...new Set(materials.map(m => (m.name || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  let activeHighlightIdx = 0;
  let currentFilteredNames = [];

  // Function to render custom dropdown list
  function renderDropdownItems(filterText = "") {
    const q = (filterText || "").trim().toLowerCase();
    currentFilteredNames = q
      ? allUniqueProductNames.filter(name => name.toLowerCase().includes(q))
      : allUniqueProductNames;

    if (customCountEl) customCountEl.textContent = currentFilteredNames.length;

    if (currentFilteredNames.length === 0) {
      customListEl.innerHTML = `<div style="padding: 10px 12px; font-size: 0.8rem; color: #94a3b8; font-style: italic; text-align: center;">No matching products found</div>`;
      activeHighlightIdx = -1;
      return;
    }

    if (activeHighlightIdx < 0 || activeHighlightIdx >= currentFilteredNames.length) {
      activeHighlightIdx = 0;
    }

    customListEl.innerHTML = currentFilteredNames.map((name, idx) => {
      const isSelected = idx === activeHighlightIdx;
      return `
        <div class="hl-prod-item" data-idx="${idx}" data-name="${name.replace(/"/g, '&quot;')}" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 600; cursor: pointer; user-select: none; border-bottom: 1px solid #f1f5f9; background: ${isSelected ? '#0284c7' : '#ffffff'}; color: ${isSelected ? '#ffffff' : '#0f172a'}; display: flex; justify-content: space-between; align-items: center;">
          <span>${name}</span>
          <i class="fa-solid fa-arrow-right" style="font-size: 0.7rem; opacity: ${isSelected ? '0.9' : '0'};"></i>
        </div>
      `;
    }).join("");

    customListEl.querySelectorAll(".hl-prod-item").forEach(item => {
      item.addEventListener("mousemove", () => {
        const idx = parseInt(item.getAttribute("data-idx"));
        if (activeHighlightIdx !== idx) {
          activeHighlightIdx = idx;
          updateHighlightStyle();
        }
      });

      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedName = item.getAttribute("data-name");
        selectProductName(selectedName);
      });
    });

    scrollHighlightIntoView();
  }

  function updateHighlightStyle() {
    const items = customListEl.querySelectorAll(".hl-prod-item");
    items.forEach((item, idx) => {
      const isSelected = idx === activeHighlightIdx;
      item.style.background = isSelected ? '#0284c7' : '#ffffff';
      item.style.color = isSelected ? '#ffffff' : '#0f172a';
      const arrow = item.querySelector("i");
      if (arrow) arrow.style.opacity = isSelected ? '0.9' : '0';
    });
    scrollHighlightIntoView();
  }

  function scrollHighlightIntoView() {
    const activeItem = customListEl.querySelector(`.hl-prod-item[data-idx="${activeHighlightIdx}"]`);
    if (activeItem) {
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = customListEl.scrollTop;
      const containerBottom = containerTop + customListEl.clientHeight;
      if (itemTop < containerTop) {
        customListEl.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        customListEl.scrollTop = itemBottom - customListEl.clientHeight;
      }
    }
  }

  function openDropdown() {
    customDropdown.style.display = "block";
    renderDropdownItems(prodNameInput.value);
  }

  function closeDropdown() {
    customDropdown.style.display = "none";
  }

  function selectProductName(name) {
    prodNameInput.value = name;
    closeDropdown();
    updateCodeDropdown();
    setTimeout(() => {
      if (prodCodeSelect && prodCodeSelect.options.length > 2) {
        prodCodeSelect.focus();
      } else if (!unRateInput.disabled) {
        unRateInput.focus();
        unRateInput.select();
      } else if (!ldRateInput.disabled) {
        ldRateInput.focus();
        ldRateInput.select();
      }
    }, 20);
  }

  // Click outside to close dropdown
  function onDocClickOutside(e) {
    if (!overlay.contains(e.target)) return;
    if (!prodNameInput.contains(e.target) && !prodToggleBtn.contains(e.target) && !customDropdown.contains(e.target)) {
      closeDropdown();
    }
  }
  document.addEventListener("click", onDocClickOutside);

  // Input & Toggle Events
  prodNameInput.addEventListener("focus", openDropdown);
  prodNameInput.addEventListener("click", openDropdown);
  prodToggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (customDropdown.style.display === "block") {
      closeDropdown();
    } else {
      prodNameInput.focus();
      openDropdown();
    }
  });

  prodNameInput.addEventListener("input", () => {
    activeHighlightIdx = 0;
    openDropdown();
    updateCodeDropdown();
  });

  prodNameInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (customDropdown.style.display === "none") {
        openDropdown();
      } else if (currentFilteredNames.length > 0) {
        activeHighlightIdx = (activeHighlightIdx + 1) % currentFilteredNames.length;
        updateHighlightStyle();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (customDropdown.style.display === "none") {
        openDropdown();
      } else if (currentFilteredNames.length > 0) {
        activeHighlightIdx = (activeHighlightIdx - 1 + currentFilteredNames.length) % currentFilteredNames.length;
        updateHighlightStyle();
      }
    } else if (e.key === "Enter") {
      if (customDropdown.style.display !== "none" && activeHighlightIdx >= 0 && activeHighlightIdx < currentFilteredNames.length) {
        e.preventDefault();
        selectProductName(currentFilteredNames[activeHighlightIdx]);
      } else {
        const val = (prodNameInput.value || "").trim().toLowerCase();
        const matched = allUniqueProductNames.find(p => p.toLowerCase() === val) || 
                        allUniqueProductNames.find(p => p.toLowerCase().startsWith(val)) ||
                        allUniqueProductNames.find(p => p.toLowerCase().includes(val));
        if (matched) {
          e.preventDefault();
          selectProductName(matched);
        }
      }
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  });

  // Function to refresh Code/Model dropdown when Product Name is selected or typed
  function updateCodeDropdown() {
    const inputVal = (prodNameInput.value || "").trim();
    prodCodeSelect.innerHTML = '<option value="ALL">ALL (All Codes/Models)</option>';

    if (!inputVal) return;

    const matchedMats = materials.filter(m => m.name && m.name.toLowerCase() === inputVal.toLowerCase());
    matchedMats.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.innerText = `${m.code || 'Default'} (${m.unit || 'Bags'})`;
      prodCodeSelect.appendChild(opt);
    });

    // Auto-fill existing rates if any
    if (matchedMats.length > 0) {
      const sample = matchedMats[0];
      const targetType = targetTypeSelect ? targetTypeSelect.value : "__ALL_TYPES__";
      let unVal = 0;
      let ldVal = 0;
      if (targetType !== "__ALL_TYPES__" && sample.unloadingChargesByType && sample.unloadingChargesByType[targetType] !== undefined) {
        unVal = parseFloat(sample.unloadingChargesByType[targetType]) || 0;
      } else {
        unVal = (sample.unloadingCharge !== undefined && sample.unloadingCharge !== null) ? parseFloat(sample.unloadingCharge) : (parseFloat(sample.loadingCharge) || 0);
      }
      if (targetType !== "__ALL_TYPES__" && sample.loadingChargesByType && sample.loadingChargesByType[targetType] !== undefined) {
        ldVal = parseFloat(sample.loadingChargesByType[targetType]) || 0;
      } else {
        ldVal = parseFloat(sample.loadingCharge) || 0;
      }

      if (!unRateInput.disabled && unVal > 0) {
        unRateInput.value = unVal.toFixed(2);
      }
      if (!ldRateInput.disabled && ldVal > 0) {
        ldRateInput.value = ldVal.toFixed(2);
      }
    }
  }

  function handleTargetTypeChange() {
    const opt = targetTypeSelect.selectedOptions[0];
    const cat = opt ? opt.getAttribute("data-category") : "both";

    if (cat === "unloading") {
      unRateInput.disabled = false;
      unRateInput.style.backgroundColor = "white";
      ldRateInput.disabled = true;
      ldRateInput.value = "";
      ldRateInput.style.backgroundColor = "#f1f5f9";
    } else if (cat === "loading") {
      unRateInput.disabled = true;
      unRateInput.value = "";
      unRateInput.style.backgroundColor = "#f1f5f9";
      ldRateInput.disabled = false;
      ldRateInput.style.backgroundColor = "white";
    } else {
      unRateInput.disabled = false;
      unRateInput.style.backgroundColor = "white";
      ldRateInput.disabled = false;
      ldRateInput.style.backgroundColor = "white";
    }

    updateCodeDropdown();
  }

  // When Code/Model or Target Type selection changes, autofill rates
  prodCodeSelect.addEventListener("change", () => {
    const selectedVal = prodCodeSelect.value;
    if (selectedVal && selectedVal !== "ALL") {
      const mat = materials.find(m => m.id === selectedVal);
      if (mat) {
        const targetType = targetTypeSelect ? targetTypeSelect.value : "__ALL_TYPES__";
        let unVal = (targetType !== "__ALL_TYPES__" && mat.unloadingChargesByType && mat.unloadingChargesByType[targetType] !== undefined)
          ? parseFloat(mat.unloadingChargesByType[targetType]) || 0
          : (parseFloat(mat.unloadingCharge) || parseFloat(mat.loadingCharge) || 0);
        let ldVal = (targetType !== "__ALL_TYPES__" && mat.loadingChargesByType && mat.loadingChargesByType[targetType] !== undefined)
          ? parseFloat(mat.loadingChargesByType[targetType]) || 0
          : (parseFloat(mat.loadingCharge) || 0);
        if (!unRateInput.disabled) unRateInput.value = unVal > 0 ? unVal.toFixed(2) : "";
        if (!ldRateInput.disabled) ldRateInput.value = ldVal > 0 ? ldVal.toFixed(2) : "";
      }
    }
  });

  targetTypeSelect.addEventListener("change", handleTargetTypeChange);

  // Bind Manage Types Button
  document.getElementById("btn-hl-manage-types").addEventListener("click", () => {
    showManageHeadloaderTypesModal(() => {
      // Refresh target type dropdown in add panel
      const types = getTypes();
      const curSelected = targetTypeSelect.value;
      targetTypeSelect.innerHTML = `<option value="__ALL_TYPES__" data-category="both">All Types (Uniform)</option>` + 
        types.map(t => {
          const label = t.name + (t.category === 'loading' ? ' [Loading/Sale]' : (t.category === 'unloading' ? ' [Unloading/Pur]' : ' [Both]'));
          return `<option value="${t.id}" data-category="${t.category || 'both'}" ${t.id === curSelected ? 'selected' : ''}>${label}</option>`;
        }).join('');
      handleTargetTypeChange();
      renderApplicableTable();
    });
  });

  // Render Table of Added / Applicable Products with Dynamic Type Columns
  function renderApplicableTable() {
    const thead = document.getElementById("hl-applicable-table-head");
    const tbody = document.getElementById("hl-applicable-table-body");
    const countEl = document.getElementById("hl-modal-count-number");
    if (!tbody || !thead) return;

    const types = getTypes();
    const applicableList = materials.filter(m => hlSelectedProductIds.has(m.id));
    if (countEl) countEl.textContent = applicableList.length;

    // Build the 2-row table header based on each type's category
    const hasAnyBoth = types.some(t => !t.category || t.category === "both");

    let row1Cols = `
      <th ${hasAnyBoth ? 'rowspan="2"' : ''} style="padding: 6px 8px; text-align: left; width: 35px; border-bottom: 2px solid #cbd5e1;">#</th>
      <th ${hasAnyBoth ? 'rowspan="2"' : ''} style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Product Name</th>
      <th ${hasAnyBoth ? 'rowspan="2"' : ''} style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #cbd5e1; width: 100px;">Code / Model</th>
      <th ${hasAnyBoth ? 'rowspan="2"' : ''} style="padding: 6px 8px; text-align: center; border-bottom: 2px solid #cbd5e1; width: 60px;">Unit</th>
    `;

    let row2Cols = "";

    types.forEach(t => {
      const cat = t.category || "both";
      if (cat === "unloading") {
        row1Cols += `
          <th ${hasAnyBoth ? 'rowspan="2"' : ''} style="padding: 5px 6px; text-align: right; border-left: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; background: #fff7ed; color: #c2410c; min-width: 90px;">
            <div style="font-size: 0.82rem; font-weight: 700;">${t.name}</div>
            <small style="font-size: 0.7rem; color: #c2410c; font-weight: 600;">Unload ₹ (Pur)</small>
          </th>
        `;
      } else if (cat === "loading") {
        row1Cols += `
          <th ${hasAnyBoth ? 'rowspan="2"' : ''} style="padding: 5px 6px; text-align: right; border-left: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; background: #f0fdf4; color: #15803d; min-width: 90px;">
            <div style="font-size: 0.82rem; font-weight: 700;">${t.name}</div>
            <small style="font-size: 0.7rem; color: #15803d; font-weight: 600;">Load ₹ (Sale)</small>
          </th>
        `;
      } else {
        // Both
        row1Cols += `
          <th colspan="2" style="padding: 4px 6px; text-align: center; border-left: 2px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background: #f1f5f9; color: #1e3a8a; font-weight: 700;">
            <div style="font-size: 0.82rem;">${t.name}</div>
          </th>
        `;
        row2Cols += `
          <th style="padding: 3px 6px; text-align: right; border-left: 2px solid #cbd5e1; color: #c2410c; font-size: 0.72rem; font-weight: 700; background: #fff7ed; width: 85px;">
            Unload ₹
          </th>
          <th style="padding: 3px 6px; text-align: right; color: #15803d; font-size: 0.72rem; font-weight: 700; background: #f0fdf4; width: 85px;">
            Load ₹
          </th>
        `;
      }
    });

    row1Cols += `<th ${hasAnyBoth ? 'rowspan="2"' : ''} style="padding: 6px 8px; text-align: center; width: 50px; border-bottom: 2px solid #cbd5e1;">Action</th>`;

    thead.innerHTML = `
      <tr style="background: #f8fafc; color: #1e293b; position: sticky; top: 0; z-index: 2; border-bottom: 2px solid #cbd5e1;">
        ${row1Cols}
      </tr>
      ${hasAnyBoth ? `
        <tr style="background: #f8fafc; color: #1e293b; position: sticky; top: 26px; z-index: 2; border-bottom: 2px solid #cbd5e1;">
          ${row2Cols}
        </tr>
      ` : ''}
    `;

    let totalColsCount = 5;
    types.forEach(t => {
      totalColsCount += ((t.category || "both") === "both" ? 2 : 1);
    });

    if (applicableList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${totalColsCount}" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
            <i class="fa-solid fa-box-open" style="font-size: 1.8rem; color: #cbd5e1; display: block; margin-bottom: 6px;"></i>
            No products configured yet. Type a Product Name, choose Code/Model and click <strong>Add Product</strong>.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = applicableList.map((m, idx) => {
      let cellsHtml = "";

      types.forEach(t => {
        const cat = t.category || "both";
        let unVal = 0;
        if (m.unloadingChargesByType && m.unloadingChargesByType[t.id] !== undefined && m.unloadingChargesByType[t.id] !== null && m.unloadingChargesByType[t.id] !== '') {
          unVal = parseFloat(m.unloadingChargesByType[t.id]) || 0;
        } else if (t.id === 'std' || t.isDefault) {
          unVal = (m.unloadingCharge !== undefined && m.unloadingCharge !== null) ? parseFloat(m.unloadingCharge) : (parseFloat(m.loadingCharge) || 0);
        }

        let ldVal = 0;
        if (m.loadingChargesByType && m.loadingChargesByType[t.id] !== undefined && m.loadingChargesByType[t.id] !== null && m.loadingChargesByType[t.id] !== '') {
          ldVal = parseFloat(m.loadingChargesByType[t.id]) || 0;
        } else if (t.id === 'std' || t.isDefault) {
          ldVal = (m.loadingCharge !== undefined && m.loadingCharge !== null) ? parseFloat(m.loadingCharge) : 0;
        }

        if (cat === "unloading") {
          cellsHtml += `
            <td style="padding: 4px 6px; text-align: right; border-left: 2px solid #e2e8f0; background: #fffcf8;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
                <span style="font-weight: 700; color: #c2410c; font-size: 0.72rem;">₹</span>
                <input type="number" step="0.01" min="0" class="form-control hl-app-type-unrate" data-matid="${m.id}" data-typeid="${t.id}" value="${unVal > 0 ? unVal.toFixed(2) : ''}" placeholder="0.00" style="width: 65px; padding: 2px 4px; font-size: 0.78rem; text-align: right; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;">
              </div>
            </td>
          `;
        } else if (cat === "loading") {
          cellsHtml += `
            <td style="padding: 4px 6px; text-align: right; border-left: 2px solid #e2e8f0; background: #f6fef9;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
                <span style="font-weight: 700; color: #15803d; font-size: 0.72rem;">₹</span>
                <input type="number" step="0.01" min="0" class="form-control hl-app-type-ldrate" data-matid="${m.id}" data-typeid="${t.id}" value="${ldVal > 0 ? ldVal.toFixed(2) : ''}" placeholder="0.00" style="width: 65px; padding: 2px 4px; font-size: 0.78rem; text-align: right; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;">
              </div>
            </td>
          `;
        } else {
          cellsHtml += `
            <td style="padding: 4px 6px; text-align: right; border-left: 2px solid #e2e8f0; background: #fffcf8;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
                <span style="font-weight: 700; color: #c2410c; font-size: 0.72rem;">₹</span>
                <input type="number" step="0.01" min="0" class="form-control hl-app-type-unrate" data-matid="${m.id}" data-typeid="${t.id}" value="${unVal > 0 ? unVal.toFixed(2) : ''}" placeholder="0.00" style="width: 62px; padding: 2px 4px; font-size: 0.78rem; text-align: right; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;">
              </div>
            </td>
            <td style="padding: 4px 6px; text-align: right; background: #f6fef9;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
                <span style="font-weight: 700; color: #15803d; font-size: 0.72rem;">₹</span>
                <input type="number" step="0.01" min="0" class="form-control hl-app-type-ldrate" data-matid="${m.id}" data-typeid="${t.id}" value="${ldVal > 0 ? ldVal.toFixed(2) : ''}" placeholder="0.00" style="width: 62px; padding: 2px 4px; font-size: 0.78rem; text-align: right; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;">
              </div>
            </td>
          `;
        }
      });

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 6px 8px; color: #64748b; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">${m.name}</td>
          <td style="padding: 6px 8px;"><code style="font-weight: 700; color: #2563eb;">${m.code || '-'}</code></td>
          <td style="padding: 6px 8px; text-align: center; color: #475569;">${m.unit || 'Bags'}</td>
          ${cellsHtml}
          <td style="padding: 6px 8px; text-align: center;">
            <button type="button" class="btn btn-secondary btn-icon hl-btn-remove-prod" data-matid="${m.id}" style="padding: 2px 6px; font-size: 0.75rem; color: #ef4444; border: 1px solid #fca5a5; background: white; cursor: pointer;" title="Remove product">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    // Bind remove button
    tbody.querySelectorAll(".hl-btn-remove-prod").forEach(btn => {
      btn.addEventListener("click", () => {
        const matId = btn.getAttribute("data-matid");
        hlSelectedProductIds.delete(matId);
        if (typeof state.setHeadloaderProductIds === "function") {
          state.setHeadloaderProductIds(Array.from(hlSelectedProductIds));
        }
        renderApplicableTable();
      });
    });

    // Bind inline rate changes in modal table
    tbody.querySelectorAll(".hl-app-type-unrate").forEach(input => {
      input.addEventListener("change", () => {
        const matId = input.getAttribute("data-matid");
        const typeId = input.getAttribute("data-typeid");
        const val = parseFloat(input.value) || 0;
        const mat = materials.find(m => m.id === matId);
        if (mat) {
          mat.unloadingChargesByType = mat.unloadingChargesByType || {};
          mat.unloadingChargesByType[typeId] = val;
          if (typeId === "std" || typeId === "Standard") {
            mat.unloadingCharge = val;
            mat.unloadingChargeEnabled = val > 0;
          }
          state.saveState();
        }
      });
    });

    tbody.querySelectorAll(".hl-app-type-ldrate").forEach(input => {
      input.addEventListener("change", () => {
        const matId = input.getAttribute("data-matid");
        const typeId = input.getAttribute("data-typeid");
        const val = parseFloat(input.value) || 0;
        const mat = materials.find(m => m.id === matId);
        if (mat) {
          mat.loadingChargesByType = mat.loadingChargesByType || {};
          mat.loadingChargesByType[typeId] = val;
          if (typeId === "std" || typeId === "Standard") {
            mat.loadingCharge = val;
            mat.loadingChargeEnabled = val > 0;
          }
          state.saveState();
        }
      });
    });
  }

  // Handle Add Product Click
  function handleAddProduct() {
    const typedName = (prodNameInput.value || "").trim();
    const selectedCodeVal = prodCodeSelect.value;
    const targetType = targetTypeSelect ? targetTypeSelect.value : "__ALL_TYPES__";
    const opt = targetTypeSelect.selectedOptions[0];
    const cat = opt ? opt.getAttribute("data-category") : "both";
    const unRate = parseFloat(unRateInput.value) || 0;
    const ldRate = parseFloat(ldRateInput.value) || 0;

    if (!typedName) {
      alert("Please type or select a Product Name.");
      prodNameInput.focus();
      return;
    }

    const matched = materials.filter(m => m.name && (m.name.toLowerCase() === typedName.toLowerCase() || m.name.toLowerCase().includes(typedName.toLowerCase())));
    if (matched.length === 0) {
      alert(`No product found in master matching "${typedName}". Please check the product name.`);
      return;
    }

    const applyRatesToMat = (m) => {
      m.unloadingChargesByType = m.unloadingChargesByType || {};
      m.loadingChargesByType = m.loadingChargesByType || {};

      if (targetType === "__ALL_TYPES__") {
        const types = getTypes();
        types.forEach(t => {
          if (!t.category || t.category === "both" || t.category === "unloading") {
            m.unloadingChargesByType[t.id] = unRate;
          }
          if (!t.category || t.category === "both" || t.category === "loading") {
            m.loadingChargesByType[t.id] = ldRate;
          }
        });
        m.unloadingCharge = unRate;
        m.unloadingChargeEnabled = unRate > 0;
        m.loadingCharge = ldRate;
        m.loadingChargeEnabled = ldRate > 0;
      } else {
        if (cat === "unloading" || cat === "both") {
          m.unloadingChargesByType[targetType] = unRate;
          if (targetType === "std") {
            m.unloadingCharge = unRate;
            m.unloadingChargeEnabled = unRate > 0;
          }
        }
        if (cat === "loading" || cat === "both") {
          m.loadingChargesByType[targetType] = ldRate;
          if (targetType === "std") {
            m.loadingCharge = ldRate;
            m.loadingChargeEnabled = ldRate > 0;
          }
        }
      }
      hlSelectedProductIds.add(m.id);
    };

    if (selectedCodeVal === "ALL" || !selectedCodeVal) {
      matched.forEach(m => applyRatesToMat(m));
    } else {
      const mat = materials.find(m => m.id === selectedCodeVal);
      if (mat) applyRatesToMat(mat);
    }

    if (typeof state.setHeadloaderProductIds === "function") {
      state.setHeadloaderProductIds(Array.from(hlSelectedProductIds));
    }
    state.saveState();

    prodNameInput.value = "";
    prodCodeSelect.innerHTML = '<option value="ALL">ALL (All Codes/Models)</option>';
    unRateInput.value = "";
    ldRateInput.value = "";
    prodNameInput.focus();

    renderApplicableTable();
  }

  addBtn.addEventListener("click", handleAddProduct);

  [unRateInput, ldRateInput].forEach(inp => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddProduct();
      }
    });
  });

  // Handle Clear All
  document.getElementById("btn-hl-modal-clear-all").addEventListener("click", () => {
    if (confirm("Clear all products from applicable list?")) {
      hlSelectedProductIds.clear();
      if (typeof state.setHeadloaderProductIds === "function") {
        state.setHeadloaderProductIds([]);
      }
      state.saveState();
      renderApplicableTable();
    }
  });

  // Handle Save & Apply
  document.getElementById("btn-hl-layout-save").addEventListener("click", () => {
    // Read any edited rates from table
    document.querySelectorAll(".hl-app-type-unrate").forEach(input => {
      const matId = input.getAttribute("data-matid");
      const typeId = input.getAttribute("data-typeid");
      const unVal = parseFloat(input.value) || 0;
      const mat = materials.find(m => m.id === matId);
      if (mat) {
        mat.unloadingChargesByType = mat.unloadingChargesByType || {};
        mat.unloadingChargesByType[typeId] = unVal;
        if (typeId === "std") {
          mat.unloadingCharge = unVal;
          mat.unloadingChargeEnabled = unVal > 0;
        }
      }
    });

    document.querySelectorAll(".hl-app-type-ldrate").forEach(input => {
      const matId = input.getAttribute("data-matid");
      const typeId = input.getAttribute("data-typeid");
      const ldVal = parseFloat(input.value) || 0;
      const mat = materials.find(m => m.id === matId);
      if (mat) {
        mat.loadingChargesByType = mat.loadingChargesByType || {};
        mat.loadingChargesByType[typeId] = ldVal;
        if (typeId === "std") {
          mat.loadingCharge = ldVal;
          mat.loadingChargeEnabled = ldVal > 0;
        }
      }
    });

    if (typeof state.setHeadloaderProductIds === "function") {
      state.setHeadloaderProductIds(Array.from(hlSelectedProductIds));
    }
    state.saveState();
    closeModal();
    if (onSavedCallback) onSavedCallback();
  });

  // Initial render of table & setup
  handleTargetTypeChange();
  renderApplicableTable();
  setTimeout(() => prodNameInput.focus(), 100);
}

// -------------------------------------------------------------
// CSV EXPORT HELPER (Supports Daily, Summary & Detailed)
// -------------------------------------------------------------
function exportHeadloaderReportToCSV() {
  const from = hlFromDate;
  const to = hlToDate;
  const mode = hlTxType;

  const { detailedRows, summaryRows, dailyGroups } = getCalculatedDataForPrint();

  const rows = [];
  rows.push(["Headloader Loading & Unloading Charges Payable Report"]);
  rows.push([`Period: ${formatDate(from) || 'Beginning'} to ${formatDate(to) || 'Present'}`]);
  rows.push([`Operation Scope: ${mode.toUpperCase()}`]);
  rows.push([`Report Mode: ${hlViewMode.toUpperCase()}`]);
  rows.push([]);

  if (hlViewMode === "daily") {
    rows.push(["Date", "Product Name, Operation & Type", "Quantity", "Unit", "Rate (INR)", "Total Payable (INR)"]);
    
    let grandSumQty = 0;
    let grandSumAmt = 0;

    dailyGroups.forEach(group => {
      group.items.forEach((item) => {
        rows.push([
          `"${formatDate(group.date)} (${group.dayOfWeek})"`,
          `"${item.productName} [${item.operation} - ${item.typeName || 'Standard'}]"`,
          item.qty,
          item.unit,
          item.rate.toFixed(2),
          item.total.toFixed(2)
        ]);
      });
      rows.push([
        `"Daily Total (${formatDate(group.date)})"`,
        "",
        group.dayTotalQty,
        "",
        "",
        group.dayTotalPayable.toFixed(2)
      ]);
      rows.push([]);
      grandSumQty += group.dayTotalQty;
      grandSumAmt += group.dayTotalPayable;
    });

    rows.push(["GRAND TOTAL", "", grandSumQty, "", "", grandSumAmt.toFixed(2)]);

  } else if (hlViewMode === "summary") {
    rows.push(["Product Name, Operation & Type", "Quantity", "Unit", "Charge Rate (INR)", "Total Payable (INR)"]);

    let sumQty = 0;
    let sumAmt = 0;
    summaryRows.forEach((item) => {
      rows.push([`"${item.productName} [${item.operation} - ${item.typeName || 'Standard'}]"`, item.qty, item.unit, item.rate.toFixed(2), item.total.toFixed(2)]);
      sumQty += item.qty;
      sumAmt += item.total;
    });
    rows.push([]);
    rows.push(["TOTALS", sumQty, "", "", sumAmt.toFixed(2)]);
  } else {
    rows.push(["Date", "Bill No", "Operation", "Handling Type", "Product Name", "Party Name", "Quantity", "Unit", "Rate (INR)", "Total Payable (INR)"]);
    detailedRows.forEach(r => {
      rows.push([r.date, `"${r.billNo}"`, `"${r.operation}"`, `"${r.typeName || 'Standard'}"`, `"${r.productName}"`, `"${r.partyName}"`, r.qty, r.unit, r.rate.toFixed(2), r.total.toFixed(2)]);
    });
  }

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Daily_Headloader_Report_${hlFromDate}_to_${hlToDate}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// -------------------------------------------------------------
// PRINT PROFESSIONAL HEADLOADER PAYOUT SLIP
// -------------------------------------------------------------
function printHeadloaderPayoutSlip() {
  const company = state.getCompanyInfo ? state.getCompanyInfo() : {};
  const { detailedRows, summaryRows, dailyGroups } = getCalculatedDataForPrint();

  let totalQty = 0;
  let totalUnloadingAmt = 0;
  let totalLoadingAmt = 0;
  let grandTotalAmt = 0;

  detailedRows.forEach(r => {
    totalQty += r.qty;
    if (r.operation === "Unloading") totalUnloadingAmt += r.total;
    else totalLoadingAmt += r.total;
    grandTotalAmt += r.total;
  });

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print the report.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Daily Headloader Labor Payout Statement</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
          .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
          .report-title { font-size: 14px; font-weight: bold; color: #1e3a8a; margin-top: 5px; }
          .meta-bar { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 6px 8px; font-weight: bold; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 5px 8px; }
          .num { text-align: right; }
          .center { text-align: center; }
          .date-header { background: #e2e8f0; font-weight: bold; font-size: 12px; color: #0f172a; }
          .day-subtotal { background: #f8fafc; font-weight: bold; border-top: 1px solid #94a3b8; }
          .total-row { background: #e2e8f0; font-weight: bold; border-top: 2px solid #0f172a; }
          .signatures { display: flex; justify-content: space-between; margin-top: 45px; padding-top: 10px; }
          .sig-box { width: 200px; text-align: center; border-top: 1px solid #475569; padding-top: 5px; font-size: 11px; font-weight: 600; }
          @media print {
            button { display: none !important; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${company.companyName || company.name || 'MATERIAL LEDGER ERP'}</div>
          <div>${company.address || ''} ${company.city ? ', ' + company.city : ''} ${company.gstin ? ' | GSTIN: ' + company.gstin : ''}</div>
          <div class="report-title">DAILY HEADLOADER CHARGES PAYABLE STATEMENT</div>
        </div>

        <div class="meta-bar">
          <div><strong>Date / Period:</strong> ${formatDate(hlFromDate)} ${hlFromDate !== hlToDate ? ' to ' + formatDate(hlToDate) : ''}</div>
          <div><strong>Operation Scope:</strong> ${hlTxType === 'purchases' ? 'UNLOADING ONLY' : hlTxType === 'sales' ? 'LOADING ONLY' : 'ALL (LOADING + UNLOADING)'}</div>
          <div><strong>Printed On:</strong> ${new Date().toLocaleString()}</div>
        </div>

        ${hlViewMode === "daily" ? `
          <table>
            <thead>
              <tr>
                <th>Product Name &amp; Operation</th>
                <th class="num" style="width: 130px;">Quantity</th>
                <th class="num" style="width: 110px;">Rate / Unit</th>
                <th class="num" style="width: 130px;">Daily Payable (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${dailyGroups.length === 0 ? `
                <tr><td colspan="4" class="center">No handling records found for applicable products in this period.</td></tr>
              ` : dailyGroups.map(group => `
                <tr class="date-header">
                  <td colspan="4">📅 ${formatDate(group.date)} (${group.dayOfWeek})</td>
                </tr>
                ${group.items.map((item) => `
                  <tr>
                    <td>
                      <strong>${item.productName}</strong>
                      <span style="font-size: 10px; color: ${item.operation === 'Unloading' ? '#c2410c' : '#15803d'}; font-weight: bold; margin-left: 6px;">
                        [${item.operation}]
                      </span>
                    </td>
                    <td class="num"><strong>${item.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> <span style="font-size: 10px; color: #64748b;">${item.unit}</span></td>
                    <td class="num">₹${item.rate.toFixed(2)}</td>
                    <td class="num" style="font-weight: bold;">₹${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join("")}
                <tr class="day-subtotal">
                  <td style="text-align: right;"><strong>Daily Total (${formatDate(group.date)}):</strong></td>
                  <td class="num">—</td>
                  <td class="num">—</td>
                  <td class="num" style="font-weight: bold; color: #1e3a8a;">₹${group.dayTotalPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td style="text-align: right;">GRAND TOTAL:</td>
                <td class="num">${totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td class="num">—</td>
                <td class="num" style="font-size: 13px; color: #1e3a8a;">₹${grandTotalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        ` : `
          <table>
            <thead>
              <tr>
                <th>Product Name &amp; Operation</th>
                <th class="num" style="width: 130px;">Total Qty</th>
                <th class="num" style="width: 110px;">Rate / Unit</th>
                <th class="num" style="width: 130px;">Total Payable (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRows.length === 0 ? `
                <tr><td colspan="4" class="center">No transactions found for applicable products.</td></tr>
              ` : summaryRows.map((r) => `
                <tr>
                  <td>
                    <strong>${r.productName}</strong>
                    <span style="font-size: 10px; color: ${r.operation === 'Unloading' ? '#c2410c' : '#15803d'}; font-weight: bold; margin-left: 6px;">
                      [${r.operation}]
                    </span>
                  </td>
                  <td class="num"><strong>${r.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> <span style="font-size: 10px; color: #64748b;">${r.unit}</span></td>
                  <td class="num">₹${r.rate.toFixed(2)}</td>
                  <td class="num" style="font-weight: bold;">₹${r.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td style="text-align: right;">GRAND TOTAL:</td>
                <td class="num">${totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td class="num">—</td>
                <td class="num" style="font-size: 13px; color: #1e3a8a;">₹${grandTotalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        `}

        <div style="background: #f8fafc; border: 1px dashed #94a3b8; padding: 10px 14px; margin-bottom: 20px; font-size: 11px;">
          <strong>Labor Summary:</strong> Unloading: ₹${totalUnloadingAmt.toFixed(2)} | Loading: ₹${totalLoadingAmt.toFixed(2)} | Net Total Labor Payable: <strong>₹${grandTotalAmt.toFixed(2)}</strong>
        </div>

        <div class="signatures">
          <div class="sig-box">Prepared / Checked By</div>
          <div class="sig-box">Headloader / Gang Leader Signature</div>
          <div class="sig-box">Approved / Paid By (Manager)</div>
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <button onclick="window.print()" style="padding: 8px 20px; font-weight: bold; background: #1e3a8a; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print Statement
          </button>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function getCalculatedDataForPrint() {
  const materials = state.getMaterials();
  const from = hlFromDate;
  const to = hlToDate;
  const mode = hlTxType;
  const productSel = hlProductFilter;
  const q = hlSearchQuery.trim().toLowerCase();

  const materialsMap = new Map();
  materials.forEach(m => {
    materialsMap.set(m.id, m);
    materialsMap.set(`${m.name}_${m.code}`, m);
  });

  const rawPurchases = state.getPurchases() || [];
  const rawInvoices = state.getInvoices() || [];

  const detailedRows = [];

  if (hlSelectedProductIds.size === 0) {
    return { detailedRows: [], summaryRows: [], dailyGroups: [] };
  }

  if (mode === "all" || mode === "purchases") {
    rawPurchases.forEach(pur => {
      if (pur.isCancelled) return;
      const d = pur.date || pur.billDate || "";
      if (from && d < from) return;
      if (to && d > to) return;
      (pur.items || []).forEach(item => {
        const mat = materialsMap.get(item.materialId) || materialsMap.get(`${item.name}_${item.code}`);
        if (!mat || !hlSelectedProductIds.has(mat.id)) return;

        const prodName = item.name || mat.name || "Unknown";
        if (productSel !== "all" && prodName !== productSel) return;
        if (q && !prodName.toLowerCase().includes(q)) return;

        const hType = pur.headloaderType || pur.handlingType || pur.unloadingType || "std";
        if (hType === "none" || hType === "no_charge" || hType === "No Loading Charge" || hType === "No Unloading Charge") return;

        const hTypeName = getHeadloaderTypeName(hType);
        let unRate = 0;
        if (mat.unloadingChargesByType && mat.unloadingChargesByType[hType] !== undefined && mat.unloadingChargesByType[hType] !== null && mat.unloadingChargesByType[hType] !== "") {
          unRate = parseFloat(mat.unloadingChargesByType[hType]) || 0;
        } else {
          unRate = (mat.unloadingCharge !== undefined && mat.unloadingCharge !== null) ? parseFloat(mat.unloadingCharge) : (parseFloat(mat.loadingCharge) || 0);
        }
        
        const qty = parseFloat(item.quantity) || 0;
        if (qty <= 0) return;

        const groupName = getProductGroupName(mat, prodName);
        detailedRows.push({
          date: d,
          billNo: pur.voucherNo || pur.invoiceNo || pur.id || "",
          type: "Purchase",
          operation: "Unloading",
          typeId: hType,
          typeName: hTypeName,
          partyName: pur.contactName || "Supplier",
          materialId: mat.id,
          groupName: groupName,
          productName: prodName,
          productCode: item.code || mat.code || "",
          unit: item.unit || mat.unit || "Bags",
          qty: qty,
          rate: unRate,
          total: qty * unRate
        });
      });
    });
  }

  if (mode === "all" || mode === "sales") {
    rawInvoices.forEach(inv => {
      if (inv.isCancelled) return;
      const d = inv.date || inv.invoiceDate || "";
      if (from && d < from) return;
      if (to && d > to) return;
      (inv.items || []).forEach(item => {
        const mat = materialsMap.get(item.materialId) || materialsMap.get(`${item.name}_${item.code}`);
        if (!mat || !hlSelectedProductIds.has(mat.id)) return;

        const prodName = item.name || mat.name || "Unknown";
        if (productSel !== "all" && prodName !== productSel) return;
        if (q && !prodName.toLowerCase().includes(q)) return;

        const hType = inv.headloaderType || inv.handlingType || inv.loadingType || "std";
        if (hType === "none" || hType === "no_charge" || hType === "No Loading Charge" || hType === "No Unloading Charge") return;

        const hTypeName = getHeadloaderTypeName(hType);
        let ldRate = 0;
        if (mat.loadingChargesByType && mat.loadingChargesByType[hType] !== undefined && mat.loadingChargesByType[hType] !== null && mat.loadingChargesByType[hType] !== "") {
          ldRate = parseFloat(mat.loadingChargesByType[hType]) || 0;
        } else {
          ldRate = (mat.loadingCharge !== undefined && mat.loadingCharge !== null) ? parseFloat(mat.loadingCharge) : 0;
        }

        const qty = parseFloat(item.quantity) || 0;
        if (qty <= 0) return;

        const groupName = getProductGroupName(mat, prodName);
        detailedRows.push({
          date: d,
          billNo: inv.invoiceNo || inv.id || "",
          type: "Sale",
          operation: "Loading",
          typeId: hType,
          typeName: hTypeName,
          partyName: inv.customerName || inv.contactName || "Customer",
          materialId: mat.id,
          groupName: groupName,
          productName: prodName,
          productCode: item.code || mat.code || "",
          unit: item.unit || mat.unit || "Bags",
          qty: qty,
          rate: ldRate,
          total: qty * ldRate
        });
      });
    });
  }

  detailedRows.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  // Group by Date for Daily Groups
  const dateMap = new Map();
  detailedRows.forEach(r => {
    const d = r.date || "No Date";
    if (!dateMap.has(d)) {
      dateMap.set(d, {
        date: d,
        dayOfWeek: getDayName(d),
        itemsMap: new Map(),
        dayTotalQty: 0,
        dayTotalUnloading: 0,
        dayTotalLoading: 0,
        dayTotalPayable: 0
      });
    }
    const group = dateMap.get(d);
    const rateKey = r.rate.toFixed(4);
    const primaryTitle = (hlGroupBy === "group") ? r.groupName : r.productName;
    const itemKey = `${primaryTitle}___${r.operation}___${r.typeId || 'std'}___${r.unit}___${rateKey}`;

    if (!group.itemsMap.has(itemKey)) {
      group.itemsMap.set(itemKey, {
        itemKey: itemKey,
        materialId: r.materialId,
        matIdsSet: new Set(),
        groupName: r.groupName,
        productName: r.productName,
        productNamesSet: new Set(),
        codesSet: new Set(),
        operation: r.operation,
        typeId: r.typeId,
        typeName: r.typeName || "Standard",
        unit: r.unit,
        qty: 0,
        rate: r.rate,
        total: 0
      });
    }
    const itemAgg = group.itemsMap.get(itemKey);
    if (r.materialId) itemAgg.matIdsSet.add(r.materialId);
    if (r.productName) itemAgg.productNamesSet.add(r.productName);
    if (r.productCode) itemAgg.codesSet.add(r.productCode);
    itemAgg.qty += r.qty;
    itemAgg.total += r.total;
  });

  const dayOverrides = state.getHeadloaderDayOverrides ? state.getHeadloaderDayOverrides() : {};

  // Apply day overrides to daily print groups
  dateMap.forEach((group, d) => {
    const dayMap = dayOverrides[d] || {};
    let dQty = 0;
    let dUnloading = 0;
    let dLoading = 0;
    let dPayable = 0;

    group.itemsMap.forEach((itemAgg) => {
      const itemOverrideKey = `${(hlGroupBy === "group") ? itemAgg.groupName : itemAgg.productName}___${itemAgg.operation}___${itemAgg.typeId || 'std'}___${itemAgg.unit}`;
      itemAgg.overrideKey = itemOverrideKey;
      const ov = dayMap[itemOverrideKey] || dayMap[itemAgg.itemKey];
      if (ov) {
        if (ov.qty !== undefined && ov.qty !== null && !isNaN(ov.qty)) {
          itemAgg.qty = parseFloat(ov.qty);
        }
        if (ov.rate !== undefined && ov.rate !== null && !isNaN(ov.rate)) {
          itemAgg.rate = parseFloat(ov.rate);
        }
      }
      itemAgg.total = itemAgg.qty * itemAgg.rate;

      dQty += itemAgg.qty;
      if (itemAgg.operation === "Unloading") {
        dUnloading += itemAgg.total;
      } else {
        dLoading += itemAgg.total;
      }
      dPayable += itemAgg.total;
    });

    group.dayTotalQty = dQty;
    group.dayTotalUnloading = dUnloading;
    group.dayTotalLoading = dLoading;
    group.dayTotalPayable = dPayable;
  });

  const dailyGroups = Array.from(dateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(g => ({
      date: g.date,
      dayOfWeek: g.dayOfWeek,
      dayTotalQty: g.dayTotalQty,
      dayTotalUnloading: g.dayTotalUnloading,
      dayTotalLoading: g.dayTotalLoading,
      dayTotalPayable: g.dayTotalPayable,
      items: Array.from(g.itemsMap.values()).map(item => {
        const display = formatGroupDisplay(item, hlGroupBy, materials);
        return {
          ...item,
          productName: display.displayName,
          productCode: display.displayCode
        };
      }).sort((a, b) => {
        if (a.productName === b.productName) {
          if (a.operation === b.operation) {
            return (a.typeName || "").localeCompare(b.typeName || "");
          }
          return a.operation.localeCompare(b.operation);
        }
        return a.productName.localeCompare(b.productName);
      })
    }));

  const summaryMap = new Map();
  dailyGroups.forEach(g => {
    g.items.forEach(item => {
      const rateKey = item.rate.toFixed(4);
      const primaryTitle = (hlGroupBy === "group") ? item.groupName : item.productName;
      const key = `${primaryTitle}___${item.operation}___${item.typeId || 'std'}___${item.unit}___${rateKey}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          materialId: item.materialId,
          matIdsSet: new Set(item.matIdsSet || []),
          groupName: item.groupName,
          productName: item.productName,
          productNamesSet: new Set(item.productNamesSet || []),
          codesSet: new Set(item.codesSet || []),
          operation: item.operation,
          typeId: item.typeId,
          typeName: item.typeName || "Standard",
          unit: item.unit,
          qty: 0,
          rate: item.rate,
          total: 0
        });
      }
      const agg = summaryMap.get(key);
      if (item.materialId) agg.matIdsSet.add(item.materialId);
      if (item.productName) agg.productNamesSet.add(item.productName);
      if (item.productCode) agg.codesSet.add(item.productCode);
      agg.qty += item.qty;
      agg.total += item.total;
    });
  });

  const summaryRows = Array.from(summaryMap.values()).map(item => {
    const display = formatGroupDisplay(item, hlGroupBy, materials);
    return {
      ...item,
      productName: display.displayName,
      productCode: display.displayCode
    };
  }).sort((a, b) => {
    if (a.productName === b.productName) {
      if (a.operation === b.operation) {
        return (a.typeName || "").localeCompare(b.typeName || "");
      }
      return a.operation.localeCompare(b.operation);
    }
    return a.productName.localeCompare(b.productName);
  });

  return { detailedRows, summaryRows, dailyGroups };
}
