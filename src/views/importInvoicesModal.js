import { state } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";

let modalContainerEl = null;

/**
 * Downloads a sample CSV import template for Sales or Purchase invoices.
 */
export function downloadImportTemplate(txType = "Sales") {
  const isSales = txType === "Sales";
  let csvContent = "";

  if (isSales) {
    csvContent = [
      "InvoiceNo,Date,CustomerName,Phone,GSTIN,State,ItemCode,ItemName,BatchNo,LandingCost,Quantity,Rate,DiscountPercent,GSTPercent,PayMode,Narration",
      "INV-1001,2026-09-26,ABC Construction,9876543210,32AAAAA0000A1Z5,KERALA,OPC-53,OPC 53 Grade Cement,BAT-2026-01,315.00,10,380.00,0,18,Credit,Imported sales order item 1",
      "INV-1001,2026-09-26,ABC Construction,9876543210,32AAAAA0000A1Z5,KERALA,TMT-12,TMT Steel Bars 12mm,BAT-2026-02,540.00,5,650.00,2,18,Credit,Imported sales order item 2",
      "INV-1002,2026-09-26,XYZ Builders,9123456789,,KERALA,SAND-RIV,Fine River Sand,BAT-2026-03,2.10,50,2.50,0,18,Cash,Direct cash sale"
    ].join("\n");
  } else {
    csvContent = [
      "InvoiceNo,Date,VendorName,Phone,GSTIN,State,ItemCode,ItemName,BatchNo,LandingCost,Quantity,Rate,DiscountPercent,GSTPercent,PayMode,Narration",
      "PUR-501,2026-09-26,Ultratech Cement Ltd,9988776655,32BBBBA1111B1Z2,KERALA,OPC-53,OPC 53 Grade Cement,BAT-2026-01,310.00,100,320.00,0,18,Credit,Bulk cement purchase",
      "PUR-501,2026-09-26,Ultratech Cement Ltd,9988776655,32BBBBA1111B1Z2,KERALA,TMT-12,TMT Steel Bars 12mm,BAT-2026-02,540.00,50,580.00,1,18,Credit,Bulk steel purchase",
      "PUR-502,2026-09-26,Jindal Steel & Power,9876123450,32CCCCA2222C1Z8,KERALA,TMT-12,TMT Steel Bars 12mm,BAT-2026-02,535.00,200,570.00,0,18,Credit,Rebar supply stock"
    ].join("\n");
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", isSales ? "sales_invoice_import_template.csv" : "purchase_invoice_import_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV parser that correctly handles quoted values containing commas.
 */
function parseCsvContent(text) {
  const lines = [];
  let currentLine = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentLine.push(currentVal.trim());
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentLine.push(currentVal.trim());
      if (currentLine.some(cell => cell.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentLine.length > 0) {
    currentLine.push(currentVal.trim());
    if (currentLine.some(cell => cell.length > 0)) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Interactive Batch Finder Modal for selecting stock batch & landing cost
 */
export function showBatchFinderModal(materialId, currentBatchNo, onSelectBatch) {
  const mat = state.getMaterials().find(m => m.id === materialId);
  const batches = state.getMaterialBatches(materialId) || [];

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay active blocking-modal";
  overlay.style.cssText = "display:flex; justify-content:center; align-items:center; background:rgba(15,23,42,0.55); backdrop-filter:blur(3px); z-index:1000600; position:fixed; inset:0; pointer-events:auto;";

  overlay.innerHTML = `
    <div class="modal-container window-container" style="background:#ffffff; border:2px solid #0284c7; border-radius:8px; width:680px; max-width:94vw; box-shadow:0 20px 50px rgba(0,0,0,0.45); font-family:sans-serif; font-size:12px; overflow:hidden; pointer-events:auto;">
      <div class="window-header modal-header" style="background:linear-gradient(180deg,#0284c7 0%,#0369a1 100%); color:white; font-weight:bold; padding:10px 16px; font-size:13px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-magnifying-glass-chart" style="color:#7dd3fc;"></i>
          <span>Batch Finder — Select Inventory Batch & Landing Cost</span>
        </div>
        <button type="button" class="btn-close-batch-finder" style="background:none; border:none; color:white; font-size:1.4rem; cursor:pointer; line-height:1;">&times;</button>
      </div>

      <div style="padding:16px; display:flex; flex-direction:column; gap:12px; background:#f8fafc;">
        <!-- Product Header Info Bar -->
        <div style="background:#e0f2fe; border:1px solid #bae6fd; border-radius:6px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700; color:#0369a1; font-size:13px;">Product: ${mat ? mat.name : 'Unknown Item'}</div>
            <div style="font-size:11px; color:#334155; margin-top:2px;">
              Item Code: <strong>${mat ? mat.code : 'N/A'}</strong> | Standard Landing Cost: <strong style="color:#16a34a;">₹${(mat?.landingCost || 0).toFixed(2)}</strong> | Selling Rate: <strong>₹${(mat?.gstExclRate || mat?.price || 0).toFixed(2)}</strong>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; color:#0369a1; font-weight:700;">Total Inventory Batches: ${batches.length}</div>
          </div>
        </div>

        <!-- Search Filter -->
        <div style="display:flex; gap:8px; align-items:center;">
          <i class="fa-solid fa-filter" style="color:#0284c7;"></i>
          <input type="text" id="batch-finder-search" placeholder="Search batch number..." style="flex:1; padding:7px 10px; border:1px solid #94a3b8; border-radius:4px; font-weight:600; font-size:12px;" value="${currentBatchNo || ''}">
        </div>

        <!-- Available Batches Table -->
        <div style="max-height:220px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:4px; background:white;">
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <thead>
              <tr style="background:#f1f5f9; color:#1e293b; border-bottom:1px solid #cbd5e1; text-align:left; position:sticky; top:0; z-index:5;">
                <th style="padding:6px 10px;">Batch Number</th>
                <th style="padding:6px 10px; text-align:right;">Current Stock</th>
                <th style="padding:6px 10px; text-align:right;">Landing Cost (₹)</th>
                <th style="padding:6px 10px; text-align:right;">Selling Rate (₹)</th>
                <th style="padding:6px 10px; text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody id="batch-finder-tbody">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>

        <!-- Custom Batch Assignment -->
        <div style="background:#ffffff; border:1px solid #94a3b8; border-radius:6px; padding:10px 14px;">
          <div style="font-weight:700; color:#1e293b; font-size:11px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-plus-circle" style="color:#0284c7;"></i>
            <span>Or Enter / Assign New Batch Number & Landing Cost:</span>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr auto; gap:10px; align-items:end;">
            <div>
              <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Custom Batch No</label>
              <input type="text" id="inp-custom-batch-no" value="${currentBatchNo || ''}" placeholder="e.g. BAT-2026-99" style="width:100%; padding:5px 8px; border:1px solid #94a3b8; border-radius:4px; font-weight:700; color:#0369a1;">
            </div>
            <div>
              <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Landing Cost (₹)</label>
              <input type="number" id="inp-custom-landing-cost" step="0.01" value="${(mat?.landingCost || 0)}" placeholder="0.00" style="width:100%; padding:5px 8px; border:1px solid #94a3b8; border-radius:4px; font-weight:700; color:#15803d;">
            </div>
            <button type="button" id="btn-use-custom-batch" style="padding:6px 14px; background:#0284c7; color:white; border:none; border-radius:4px; font-weight:700; font-size:11px; cursor:pointer;">
              Apply Batch
            </button>
          </div>
        </div>

      </div>

      <div style="background:#f1f5f9; border-top:1px solid #cbd5e1; padding:10px 16px; text-align:right;">
        <button type="button" class="btn-close-batch-finder" style="padding:6px 16px; background:#64748b; color:white; border:none; border-radius:4px; font-weight:700; cursor:pointer; font-size:11px;">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const searchInput = overlay.querySelector("#batch-finder-search");
  const tbody = overlay.querySelector("#batch-finder-tbody");

  function renderBatchList(filter = "") {
    const cleanFilter = filter.trim().toUpperCase();
    const filtered = batches.filter(b => !cleanFilter || String(b.batchNo || "").toUpperCase().includes(cleanFilter));

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:16px; color:#64748b; font-style:italic;">
            ${batches.length === 0 ? "No existing inventory batches found for this product." : "No batches match search query."}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(b => {
      const isSelected = b.batchNo === currentBatchNo;
      const lCost = parseFloat(b.landingCost || mat?.landingCost || 0);
      const sPrice = parseFloat(b.sellingPrice || mat?.gstExclRate || 0);
      return `
        <tr style="border-bottom:1px solid #e2e8f0; background:${isSelected ? '#e0f2fe' : '#ffffff'};">
          <td style="padding:6px 10px; font-weight:700; color:#0369a1;">
            <code style="background:#f1f5f9; padding:2px 6px; border-radius:3px;">${b.batchNo}</code>
            ${isSelected ? '<span style="font-size:9px; background:#0284c7; color:white; padding:1px 5px; border-radius:8px; margin-left:4px;">Current</span>' : ''}
          </td>
          <td style="padding:6px 10px; text-align:right; font-weight:700; color:${(b.stock || 0) > 0 ? '#16a34a' : '#dc2626'};">
            ${(b.stock || 0).toFixed(2)}
          </td>
          <td style="padding:6px 10px; text-align:right; font-weight:700; color:#15803d;">₹${lCost.toFixed(2)}</td>
          <td style="padding:6px 10px; text-align:right; color:#475569;">₹${sPrice.toFixed(2)}</td>
          <td style="padding:6px 10px; text-align:center;">
            <button type="button" class="btn-select-this-batch" data-bno="${b.batchNo}" data-lcost="${lCost}" style="padding:3px 10px; background:#16a34a; color:white; border:none; border-radius:3px; font-weight:700; font-size:10px; cursor:pointer;">
              Select Batch
            </button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".btn-select-this-batch").forEach(btn => {
      btn.onclick = (e) => {
        const bNo = e.currentTarget.getAttribute("data-bno");
        const lCost = parseFloat(e.currentTarget.getAttribute("data-lcost")) || 0;
        onSelectBatch(bNo, lCost);
        overlay.remove();
      };
    });
  }

  renderBatchList(searchInput.value);

  searchInput.oninput = (e) => renderBatchList(e.target.value);

  overlay.querySelectorAll(".btn-close-batch-finder").forEach(btn => btn.onclick = () => overlay.remove());

  overlay.querySelector("#btn-use-custom-batch").onclick = () => {
    const customBNo = overlay.querySelector("#inp-custom-batch-no").value.trim();
    const customLCost = parseFloat(overlay.querySelector("#inp-custom-landing-cost").value) || 0;
    if (!customBNo) {
      alert("Please enter a custom Batch Number.");
      return;
    }
    onSelectBatch(customBNo, customLCost);
    overlay.remove();
  };
}

export function showImportInvoicesModal(onSuccess = null) {
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  // Active Tab state: 'import' or 'history'
  let activeTab = "import";

  // State for the new import session
  let currentTxType = "Sales"; // "Sales" or "Purchase"
  let seriesList = state.getSeriesMaster().filter(s => s.txType === currentTxType);
  let selectedSeriesId = seriesList[0]?.id || "";
  let importMode = "group"; // "group" or "single"
  let numberingOption = "auto"; // "auto" or "file"
  let customStartingNo = "";
  let rawParsedRows = [];
  let processedInvoices = [];
  let missingContacts = [];
  let missingItems = [];
  let expandedInvoices = new Set(); // indices of expanded invoice detail drawers in import preview

  // State for imported history viewer tab
  let expandedHistInvoices = new Set(); // IDs of expanded history invoice drawers

  // Remove existing modal if any
  const oldModal = document.getElementById("import-invoices-admin-overlay");
  if (oldModal) oldModal.remove();

  modalContainerEl = document.createElement("div");
  modalContainerEl.id = "import-invoices-admin-overlay";
  modalContainerEl.className = "modal-overlay active blocking-modal";
  modalContainerEl.style.cssText = "display:flex; justify-content:center; align-items:center; background:rgba(15,23,42,0.45); backdrop-filter:blur(2px); z-index:1000500; position:fixed; inset:0; pointer-events:auto;";

  modalContainerEl.innerHTML = `
    <div class="modal-container window-container" style="background:#cbd5e1; border:2px solid #0284c7; border-radius:6px; width:1180px; max-width:96vw; max-height:92vh; box-shadow:0 12px 40px rgba(0,0,0,0.4); font-family:sans-serif; font-size:12px; display:flex; flex-direction:column; overflow:hidden; pointer-events:auto;">
      
      <!-- Window Header Bar -->
      <div class="window-header modal-header" style="background:linear-gradient(180deg,#0284c7 0%,#0369a1 100%); color:white; font-weight:bold; padding:8px 14px; font-size:13px; cursor:move; user-select:none; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-file-import" style="color:#7dd3fc;"></i>
          <span>Import Sales & Purchase Invoices (Batch & Landing Cost Engine)</span>
        </div>
        <button type="button" id="btn-close-import-modal" style="background:none; border:none; color:white; font-size:1.4rem; cursor:pointer; line-height:1;">&times;</button>
      </div>

      <!-- Navigation Tabs Bar -->
      <div style="background:#0f172a; padding:6px 14px 0 14px; display:flex; gap:6px; border-bottom:2px solid #0284c7;">
        <button type="button" id="tab-btn-new-import" style="padding:8px 18px; font-weight:700; font-size:12px; border:none; border-radius:6px 6px 0 0; cursor:pointer; background:#f8fafc; color:#0369a1; display:flex; align-items:center; gap:6px;">
          <i class="fa-solid fa-file-csv"></i> 1. Import New CSV File
        </button>
        <button type="button" id="tab-btn-imported-history" style="padding:8px 18px; font-weight:700; font-size:12px; border:none; border-radius:6px 6px 0 0; cursor:pointer; background:#334155; color:#94a3b8; display:flex; align-items:center; gap:6px;">
          <i class="fa-solid fa-layer-group"></i> 2. View & Manage Imported Invoices
        </button>
      </div>

      <!-- Main Body Container -->
      <div style="padding:14px; background:#f8fafc; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
        
        <!-- ================= TAB 1: NEW CSV IMPORT SECTION ================= -->
        <div id="import-section-new" style="display:flex; flex-direction:column; gap:12px; flex:1;">
          
          <!-- Top Toolbar: Type & Series Configuration -->
          <div style="background:#ffffff; border:1px solid #94a3b8; border-radius:6px; padding:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:12px; align-items:end; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            
            <!-- 1. Transaction Type -->
            <div>
              <label style="font-weight:700; color:#1e293b; display:block; margin-bottom:4px;">1. Import Category</label>
              <select id="import-tx-type" style="width:100%; padding:6px 10px; font-weight:700; border:1px solid #64748b; border-radius:4px; background:#f1f5f9; color:#0f172a; cursor:pointer;">
                <option value="Sales" ${currentTxType === "Sales" ? "selected" : ""}>Sales Invoices (Customers)</option>
                <option value="Purchase" ${currentTxType === "Purchase" ? "selected" : ""}>Purchase Invoices (Vendors)</option>
              </select>
            </div>

            <!-- 2. Target Series Selection -->
            <div>
              <label style="font-weight:700; color:#1e293b; display:block; margin-bottom:4px;">2. Target Voucher Series</label>
              <select id="import-series-select" style="width:100%; padding:6px 10px; font-weight:700; border:1px solid #64748b; border-radius:4px; background:#ffffff; color:#0369a1; cursor:pointer;">
                <!-- Dynamically populated -->
              </select>
            </div>

            <!-- 3. Import Grouping Mode -->
            <div>
              <label style="font-weight:700; color:#1e293b; display:block; margin-bottom:4px;">3. Invoice Structure Mode</label>
              <select id="import-mode-select" style="width:100%; padding:6px 10px; font-weight:600; border:1px solid #64748b; border-radius:4px; background:#ffffff; color:#0f172a; cursor:pointer;">
                <option value="group" ${importMode === "group" ? "selected" : ""}>Group Invoices (Merge rows with same Invoice No)</option>
                <option value="single" ${importMode === "single" ? "selected" : ""}>Single Invoice (1 row per invoice)</option>
              </select>
            </div>

            <!-- 4. Voucher Numbering Strategy -->
            <div>
              <label style="font-weight:700; color:#1e293b; display:block; margin-bottom:4px;">4. Invoice Numbering Option</label>
              <select id="import-numbering-select" style="width:100%; padding:6px 10px; font-weight:600; border:1px solid #64748b; border-radius:4px; background:#ffffff; color:#0f172a; cursor:pointer;">
                <option value="auto" ${numberingOption === "auto" ? "selected" : ""}>Auto-generate from Selected Series</option>
                <option value="file" ${numberingOption === "file" ? "selected" : ""}>Use Invoice / Voucher Numbers from File</option>
              </select>
            </div>

            <!-- 5. Starting Number Override -->
            <div id="starting-no-container">
              <label style="font-weight:700; color:#1e293b; display:block; margin-bottom:4px;">5. Starting Invoice Number</label>
              <input type="number" id="import-starting-no" placeholder="Auto (Series Current)" style="width:100%; padding:6px 10px; font-weight:600; border:1px solid #64748b; border-radius:4px; background:#ffffff; color:#0f172a;" min="1" value="${customStartingNo}">
            </div>

          </div>

          <!-- CSV File Upload & Download Templates Bar -->
          <div style="background:#e0f2fe; border:1px dashed #0284c7; border-radius:6px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-weight:700; color:#0369a1; font-size:13px;">
                <i class="fa-solid fa-file-csv"></i> Select CSV Data File to Import
              </div>
              <div style="font-size:11px; color:#334155; margin-top:2px;">
                Supported CSV Columns: InvoiceNo, Date, Party Name, Phone, GSTIN, State, ItemCode, ItemName, <strong>BatchNo</strong>, <strong>LandingCost</strong>, Quantity, Rate, DiscountPercent, GSTPercent, PayMode, Narration
              </div>
            </div>

            <div style="display:flex; gap:8px; align-items:center;">
              <button type="button" id="btn-download-sales-tpl" class="btn" style="background:#0284c7; color:white; border:none; padding:6px 12px; font-weight:700; font-size:11px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                <i class="fa-solid fa-download"></i> Download Sales CSV Template
              </button>
              <button type="button" id="btn-download-pur-tpl" class="btn" style="background:#0369a1; color:white; border:none; padding:6px 12px; font-weight:700; font-size:11px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                <i class="fa-solid fa-download"></i> Download Purchase CSV Template
              </button>
              <input type="file" id="import-csv-file" accept=".csv,.txt" style="display:none;">
              <button type="button" id="btn-browse-file" class="btn" style="background:#16a34a; color:white; border:none; padding:7px 16px; font-weight:700; font-size:12px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.15);">
                <i class="fa-solid fa-folder-open"></i> Browse & Upload CSV File
              </button>
            </div>
          </div>

          <!-- Section 1: Missing Customer / Vendor Alert -->
          <div id="missing-contacts-panel" style="display:none; background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div style="font-weight:700; color:#991b1b; font-size:13px; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-user-plus" style="color:#dc2626;"></i>
                <span>NEW CUSTOMER / VENDOR CREATION REQUIRED</span>
                <span id="missing-contact-badge" style="background:#dc2626; color:white; font-size:10px; padding:2px 8px; border-radius:10px; margin-left:6px;">0 Missing</span>
              </div>
              <button type="button" id="btn-create-all-contacts" class="btn" style="background:#dc2626; color:white; border:none; padding:5px 12px; font-weight:700; font-size:11px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                <i class="fa-solid fa-user-plus"></i> Create All Missing Contacts Now
              </button>
            </div>

            <div style="font-size:11px; color:#7f1d1d; margin-bottom:10px; font-weight:600;">
              The system detected new customer/vendor names in your import file that do not exist in the database. Please review details below and click <strong>Create</strong> to add them before proceeding.
            </div>

            <div style="max-height:180px; overflow-y:auto; border:1px solid #f87171; border-radius:4px; background:white;">
              <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead>
                  <tr style="background:#fee2e2; color:#991b1b; border-bottom:1px solid #fca5a5; text-align:left;">
                    <th style="padding:5px 8px;">Party Name</th>
                    <th style="padding:5px 8px;">Type</th>
                    <th style="padding:5px 8px;">Phone</th>
                    <th style="padding:5px 8px;">GSTIN</th>
                    <th style="padding:5px 8px;">State</th>
                    <th style="padding:5px 8px; text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody id="missing-contacts-tbody">
                  <!-- Row items -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 2: Missing Items Panel -->
          <div id="missing-items-panel" style="display:none; background:#fffbeb; border:1px solid #fcd34d; border-radius:6px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div style="font-weight:700; color:#92400e; font-size:13px; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-box-open" style="color:#d97706;"></i>
                <span>NEW ITEM / PRODUCT CREATION REQUIRED</span>
                <span id="missing-items-badge" style="background:#d97706; color:white; font-size:10px; padding:2px 8px; border-radius:10px; margin-left:6px;">0 Missing</span>
              </div>
              <button type="button" id="btn-create-all-items" class="btn" style="background:#d97706; color:white; border:none; padding:5px 12px; font-weight:700; font-size:11px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                <i class="fa-solid fa-box-open"></i> Create All Missing Items Now
              </button>
            </div>

            <div style="max-height:150px; overflow-y:auto; border:1px solid #fde68a; border-radius:4px; background:white;">
              <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead>
                  <tr style="background:#fef3c7; color:#92400e; border-bottom:1px solid #fcd34d; text-align:left;">
                    <th style="padding:5px 8px;">Item Code</th>
                    <th style="padding:5px 8px;">Item Name</th>
                    <th style="padding:5px 8px;">Default Unit</th>
                    <th style="padding:5px 8px;">GST %</th>
                    <th style="padding:5px 8px; text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody id="missing-items-tbody">
                  <!-- Row items -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 3: Parsed Invoices Preview Grid -->
          <div style="flex:1; display:flex; flex-direction:column; background:white; border:1px solid #94a3b8; border-radius:6px; overflow:hidden;">
            
            <div style="background:#f1f5f9; border-bottom:1px solid #cbd5e1; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:700; color:#1e3a8a; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-list-check"></i>
                <span>Import Summary & Invoice Preview</span>
              </div>
              <div id="preview-kpi-bar" style="display:flex; gap:14px; font-weight:700; font-size:11px; color:#475569; align-items:center;">
                <span>Total Bills: <strong id="kpi-total-bills" style="color:#0284c7;">0</strong></span>
                <span>Total Line Items: <strong id="kpi-total-items" style="color:#0369a1;">0</strong></span>
                <span>Total Amount: <strong id="kpi-total-amount" style="color:#16a34a;">₹0.00</strong></span>
                <button type="button" id="btn-force-import-all" style="display:none; background:#d97706; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.1);"><i class="fa-solid fa-bolt"></i> Force Import All</button>
              </div>
            </div>

            <div style="flex:1; overflow-y:auto; max-height:350px;">
              <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead>
                  <tr style="background:#e2e8f0; color:#1e293b; border-bottom:1px solid #cbd5e1; text-align:left; position:sticky; top:0; z-index:10;">
                    <th style="padding:6px 8px;">#</th>
                    <th style="padding:6px 8px;">Voucher / Series No (Editable)</th>
                    <th style="padding:6px 8px;">Date</th>
                    <th style="padding:6px 8px;">Customer / Vendor</th>
                    <th style="padding:6px 8px; text-align:center;">Line Items</th>
                    <th style="padding:6px 8px; text-align:right;">Subtotal</th>
                    <th style="padding:6px 8px; text-align:right;">GST Tax</th>
                    <th style="padding:6px 8px; text-align:right;">Grand Total</th>
                    <th style="padding:6px 8px; text-align:center;">Validation Status</th>
                  </tr>
                </thead>
                <tbody id="import-preview-tbody">
                  <tr>
                    <td colspan="9" style="text-align:center; padding:30px; color:#64748b; font-style:italic;">
                      No CSV file uploaded yet. Click "Browse & Upload CSV File" above to load sales or purchase invoices.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

        <!-- ================= TAB 2: VIEW & MANAGE IMPORTED INVOICES SECTION ================= -->
        <div id="import-section-history" style="display:none; flex-direction:column; gap:12px; flex:1;">
          
          <!-- History Controls & Action Toolbar -->
          <div style="background:#ffffff; border:1px solid #94a3b8; border-radius:6px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; flex:1;">
              
              <!-- Filter Category -->
              <div>
                <label style="font-weight:700; color:#475569; font-size:11px; display:block; margin-bottom:2px;">Category</label>
                <select id="hist-tx-type-filter" style="padding:5px 8px; border:1px solid #94a3b8; border-radius:4px; font-weight:700; color:#0369a1; font-size:11px;">
                  <option value="All">All Invoices (Sales & Purchase)</option>
                  <option value="Sales">Sales Invoices Only</option>
                  <option value="Purchase">Purchase Invoices Only</option>
                </select>
              </div>

              <!-- Filter Search -->
              <div style="flex:1; min-width:200px;">
                <label style="font-weight:700; color:#475569; font-size:11px; display:block; margin-bottom:2px;">Search Invoices</label>
                <input type="text" id="hist-search-input" placeholder="Search by Voucher No, Party Name, Date..." style="width:100%; padding:5px 8px; border:1px solid #94a3b8; border-radius:4px; font-size:11px; font-weight:600;">
              </div>

            </div>

            <!-- Duplicate Cleanup Action Button -->
            <div>
              <button type="button" id="btn-modal-cleanup-duplicates" class="btn" style="background:#dc2626; color:white; border:none; padding:7px 16px; font-weight:700; font-size:12px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.15);">
                <i class="fa-solid fa-broom"></i> Remove Duplicate Invoices
              </button>
            </div>
          </div>

          <!-- History KPI Statistics Bar -->
          <div style="background:#e0f2fe; border:1px solid #bae6fd; border-radius:6px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:18px; font-weight:700; font-size:12px; color:#1e293b;">
              <span>Total Active Invoices: <strong id="hist-kpi-count" style="color:#0284c7;">0</strong></span>
              <span>Total Sales: <strong id="hist-kpi-sales" style="color:#16a34a;">₹0.00</strong></span>
              <span>Total Purchases: <strong id="hist-kpi-purchases" style="color:#0369a1;">₹0.00</strong></span>
            </div>
            <div id="hist-kpi-duplicates-badge" style="display:none; background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:4px 10px; border-radius:12px; font-weight:700; font-size:11px;">
              <i class="fa-solid fa-triangle-exclamation"></i> <span id="hist-kpi-dup-text">0 Duplicates Detected</span>
            </div>
          </div>

          <!-- Imported History Grid Table -->
          <div style="flex:1; display:flex; flex-direction:column; background:white; border:1px solid #94a3b8; border-radius:6px; overflow:hidden;">
            <div style="flex:1; overflow-y:auto; max-height:400px;">
              <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead>
                  <tr style="background:#f1f5f9; color:#1e293b; border-bottom:1px solid #cbd5e1; text-align:left; position:sticky; top:0; z-index:10;">
                    <th style="padding:7px 10px;">#</th>
                    <th style="padding:7px 10px;">Voucher No</th>
                    <th style="padding:7px 10px;">Date</th>
                    <th style="padding:7px 10px;">Type</th>
                    <th style="padding:7px 10px;">Customer / Vendor Party</th>
                    <th style="padding:7px 10px; text-align:center;">Items Breakdown</th>
                    <th style="padding:7px 10px; text-align:right;">Subtotal</th>
                    <th style="padding:7px 10px; text-align:right;">GST Tax</th>
                    <th style="padding:7px 10px; text-align:right;">Grand Total</th>
                    <th style="padding:7px 10px; text-align:center;">Action</th>
                  </tr>
                </thead>
                <tbody id="hist-table-tbody">
                  <!-- Dynamically rendered -->
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      <!-- Footer Buttons Bar -->
      <div style="background:#cbd5e1; border-top:1px solid #94a3b8; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:11px; color:#475569; font-weight:600;">
          <i class="fa-solid fa-shield-halved" style="color:#0284c7;"></i> Automatic double-entry accounting entries, batch inventory, & customer balances will be updated.
        </div>
        <div style="display:flex; gap:10px;">
          <button type="button" id="btn-cancel-import" style="padding:6px 16px; font-weight:bold; background:#e2e8f0; border:1px solid #475569; border-radius:4px; cursor:pointer;">Close</button>
          <button type="button" id="btn-execute-import" disabled style="padding:6px 20px; font-weight:bold; background:#94a3b8; color:white; border:none; border-radius:4px; cursor:not-allowed; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-file-import"></i> Proceed & Import Invoices Now
          </button>
        </div>
      </div>

    </div>
  `;

  root.appendChild(modalContainerEl);

  // Make modal window draggable
  const winContainer = modalContainerEl.querySelector(".window-container");
  const winHeader = modalContainerEl.querySelector(".window-header");
  if (winContainer && winHeader) makeDraggable(winContainer, winHeader);

  // Switch between Tab 1 (Import New) and Tab 2 (View History)
  const tabBtnImport = modalContainerEl.querySelector("#tab-btn-new-import");
  const tabBtnHistory = modalContainerEl.querySelector("#tab-btn-imported-history");
  const sectionImport = modalContainerEl.querySelector("#import-section-new");
  const sectionHistory = modalContainerEl.querySelector("#import-section-history");
  const executeBtn = modalContainerEl.querySelector("#btn-execute-import");

  function switchTab(tab) {
    activeTab = tab;
    if (tab === "import") {
      tabBtnImport.style.background = "#f8fafc";
      tabBtnImport.style.color = "#0369a1";
      tabBtnHistory.style.background = "#334155";
      tabBtnHistory.style.color = "#94a3b8";
      sectionImport.style.display = "flex";
      sectionHistory.style.display = "none";
      if (executeBtn) executeBtn.style.display = "flex";
    } else {
      tabBtnHistory.style.background = "#f8fafc";
      tabBtnHistory.style.color = "#0369a1";
      tabBtnImport.style.background = "#334155";
      tabBtnImport.style.color = "#94a3b8";
      sectionHistory.style.display = "flex";
      sectionImport.style.display = "none";
      if (executeBtn) executeBtn.style.display = "none";
      renderImportedHistoryData();
    }
  }

  tabBtnImport?.addEventListener("click", () => switchTab("import"));
  tabBtnHistory?.addEventListener("click", () => switchTab("history"));

  // Populates the Series dropdown for the active currentTxType
  function renderSeriesOptions() {
    const selectEl = modalContainerEl.querySelector("#import-series-select");
    if (!selectEl) return;

    seriesList = state.getSeriesMaster().filter(s => s.txType === currentTxType);
    if (seriesList.length === 0) {
      selectEl.innerHTML = `<option value="">No Series found for ${currentTxType}</option>`;
      selectedSeriesId = "";
    } else {
      selectEl.innerHTML = seriesList.map(s => `
        <option value="${s.id}" ${s.id === selectedSeriesId ? "selected" : ""}>
          ${s.name} (${s.prefix || "No Prefix"}${s.suffix || ""}) - Current: ${s.currentNumber || s.startingNumber || 1}
        </option>
      `).join("");
      if (!seriesList.some(s => s.id === selectedSeriesId)) {
        selectedSeriesId = seriesList[0].id;
      }
    }
  }

  renderSeriesOptions();

  // Attach Event Listeners for Tab 1
  modalContainerEl.querySelector("#btn-close-import-modal")?.addEventListener("click", closeModal);
  modalContainerEl.querySelector("#btn-cancel-import")?.addEventListener("click", closeModal);

  modalContainerEl.querySelector("#btn-download-sales-tpl")?.addEventListener("click", () => downloadImportTemplate("Sales"));
  modalContainerEl.querySelector("#btn-download-pur-tpl")?.addEventListener("click", () => downloadImportTemplate("Purchase"));

  modalContainerEl.querySelector("#import-tx-type")?.addEventListener("change", (e) => {
    currentTxType = e.target.value;
    renderSeriesOptions();
    if (rawParsedRows.length > 0) {
      processParsedRows();
    }
  });

  modalContainerEl.querySelector("#import-series-select")?.addEventListener("change", (e) => {
    selectedSeriesId = e.target.value;
    if (rawParsedRows.length > 0) {
      processParsedRows();
    }
  });

  modalContainerEl.querySelector("#import-mode-select")?.addEventListener("change", (e) => {
    importMode = e.target.value;
    if (rawParsedRows.length > 0) {
      processParsedRows();
    }
  });

  modalContainerEl.querySelector("#import-numbering-select")?.addEventListener("change", (e) => {
    numberingOption = e.target.value;
    if (rawParsedRows.length > 0) {
      processParsedRows();
    }
  });

  modalContainerEl.querySelector("#import-starting-no")?.addEventListener("input", (e) => {
    customStartingNo = e.target.value.trim();
    if (rawParsedRows.length > 0) {
      processParsedRows();
    }
  });

  modalContainerEl.querySelector("#btn-browse-file")?.addEventListener("click", () => {
    modalContainerEl.querySelector("#import-csv-file")?.click();
  });

  modalContainerEl.querySelector("#import-csv-file")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      rawParsedRows = parseCsvContent(text);
      if (rawParsedRows.length < 2) {
        alert("The uploaded CSV file is empty or missing data rows.");
        return;
      }
      processParsedRows();
    };
    reader.readAsText(file);
  });

  // Main Processing & Grouping Engine for Tab 1
  function processParsedRows() {
    if (rawParsedRows.length < 2) return;

    const headers = rawParsedRows[0].map(h => h.trim().toLowerCase());

    const findCol = (names) => headers.findIndex(h => names.some(n => h.includes(n.toLowerCase())));

    const idxInvNo = findCol(["invoiceno", "billno", "voucherno", "invno", "refno"]);
    const idxDate = findCol(["date", "invoicedate", "billdate", "txdate"]);
    const idxContact = findCol(["customername", "customer", "partyname", "vendorname", "vendor", "suppliername", "supplier"]);
    const idxPhone = findCol(["phone", "mobile", "contactno"]);
    const idxGstin = findCol(["gstin", "gstno", "gst"]);
    const idxState = findCol(["state", "placeofsupply"]);
    const idxItemCode = findCol(["itemcode", "materialcode", "code", "productcode", "sku"]);
    const idxItemName = findCol(["itemname", "materialname", "item", "productname", "description"]);
    const idxBatchNo = findCol(["batchno", "batch", "batchnumber", "lotno"]);
    const idxLandingCost = findCol(["landingcost", "landcost", "costprice", "purrate", "cost", "landing_cost"]);
    const idxQty = findCol(["quantity", "qty", "pcs", "bags"]);
    const idxRate = findCol(["rate", "price", "unitprice"]);
    const idxDisc = findCol(["discountpercent", "discount%", "discount", "disc%"]);
    const idxGst = findCol(["gstpercent", "gst%", "taxpercent", "tax%"]);
    const idxPayMode = findCol(["paymode", "paymentmode", "mode"]);
    const idxNarration = findCol(["narration", "remarks", "notes"]);

    const rows = rawParsedRows.slice(1);
    const invoiceMap = new Map();
    let rowSequenceCounter = 1;

    rows.forEach(r => {
      const rawInvNo = idxInvNo >= 0 ? (r[idxInvNo] || "").trim() : "";
      const rawDate = idxDate >= 0 ? (r[idxDate] || "").trim() : new Date().toISOString().split("T")[0];
      const rawContact = idxContact >= 0 ? (r[idxContact] || "").trim() : "Walk-in Customer";
      const rawPhone = idxPhone >= 0 ? (r[idxPhone] || "").trim() : "";
      const rawGstin = idxGstin >= 0 ? (r[idxGstin] || "").trim() : "";
      const rawState = idxState >= 0 ? (r[idxState] || "").trim() : "KERALA";
      const rawItemCode = idxItemCode >= 0 ? (r[idxItemCode] || "").trim() : "";
      const rawItemName = idxItemName >= 0 ? (r[idxItemName] || "").trim() : "General Material";
      const rawBatchNo = idxBatchNo >= 0 ? (r[idxBatchNo] || "").trim() : "";
      const rawLandingCost = idxLandingCost >= 0 && r[idxLandingCost] !== "" && r[idxLandingCost] !== undefined ? parseFloat(r[idxLandingCost]) : null;
      const rawQty = idxQty >= 0 ? parseFloat(r[idxQty]) || 1 : 1;
      const rawRate = idxRate >= 0 ? parseFloat(r[idxRate]) || 0 : 0;
      const rawDisc = idxDisc >= 0 ? parseFloat(r[idxDisc]) || 0 : 0;
      const rawGst = idxGst >= 0 ? parseFloat(r[idxGst]) || 18 : 18;
      const rawPayMode = idxPayMode >= 0 ? (r[idxPayMode] || "").trim() : "Credit";
      const rawNarration = idxNarration >= 0 ? (r[idxNarration] || "").trim() : "Imported via Admin";

      let groupKey = "";
      if (importMode === "group") {
        groupKey = rawInvNo ? rawInvNo.toUpperCase() : `${rawContact.toUpperCase()}::${rawDate}`;
      } else {
        groupKey = `ROW-${rowSequenceCounter++}`;
      }

      if (!invoiceMap.has(groupKey)) {
        invoiceMap.set(groupKey, {
          rawInvNo: rawInvNo,
          date: rawDate,
          contactName: rawContact,
          phone: rawPhone,
          gstin: rawGstin,
          state: rawState,
          payMode: rawPayMode,
          narration: rawNarration,
          items: []
        });
      }

      invoiceMap.get(groupKey).items.push({
        code: rawItemCode,
        name: rawItemName,
        batchNo: rawBatchNo,
        landingCost: rawLandingCost,
        quantity: rawQty,
        price: rawRate,
        discountPercent: rawDisc,
        gstPercent: rawGst
      });
    });

    const allContacts = state.getContacts();
    const allMaterials = state.getMaterials();
    const isSales = currentTxType === "Sales";

    const seriesObj = state.getSeriesMaster().find(s => s.id === selectedSeriesId);
    let seriesNextNum = customStartingNo ? parseInt(customStartingNo, 10) : (seriesObj ? (seriesObj.currentNumber || seriesObj.startingNumber || 1) : 1);
    if (isNaN(seriesNextNum) || seriesNextNum < 1) seriesNextNum = 1;

    missingContacts = [];
    missingItems = [];
    const missingContactSet = new Set();
    const missingItemSet = new Set();

    processedInvoices = [];
    let invoiceCounter = 0;

    // Fetch active non-cancelled database records to detect already imported invoices
    const activeDbList = isSales ? (state.getInvoices() || []) : (state.getPurchases() || []);

    invoiceMap.forEach((inv, key) => {
      invoiceCounter++;

      let cleanContactName = inv.contactName.trim().toUpperCase();
      let matchedContact = allContacts.find(c =>
        c.name.trim().toUpperCase() === cleanContactName &&
        (isSales ? (c.type === "customer" || c.listInCustomerList || c.type !== "supplier") : (c.type === "supplier" || c.listInVendorList || c.type !== "customer"))
      );

      const isCashPayMode = String(inv.payMode || "").trim().toUpperCase().includes("CASH");

      if (!matchedContact && isSales && isCashPayMode) {
        inv.contactName = "CASH SALES";
        cleanContactName = "CASH SALES";
        matchedContact = allContacts.find(c =>
          c.name.trim().toUpperCase() === "CASH SALES" || c.id === "__CASH__"
        ) || { id: "__CASH__", name: "CASH SALES", type: "customer", phone: "", gstin: "", state: "KERALA" };
      } else if (!matchedContact && !missingContactSet.has(cleanContactName)) {
        missingContactSet.add(cleanContactName);
        missingContacts.push({
          name: inv.contactName.trim(),
          type: isSales ? "customer" : "supplier",
          phone: inv.phone,
          gstin: inv.gstin,
          state: inv.state || "KERALA"
        });
      }

      let subtotal = 0;
      let totalGst = 0;
      let grandTotal = 0;

      const processedItems = inv.items.map(item => {
        const cleanCode = item.code.trim().toUpperCase();
        const cleanName = item.name.trim().toUpperCase();

        let mat = allMaterials.find(m =>
          cleanCode && cleanName && (m.code || '').trim().toUpperCase() === cleanCode && (m.name || '').trim().toUpperCase() === cleanName
        ) || allMaterials.find(m =>
          cleanCode && cleanName && (m.code || '').trim().toUpperCase() === cleanName && (m.name || '').trim().toUpperCase() === cleanCode
        ) || allMaterials.find(m =>
          ((m.code || '') + ' ' + (m.name || '')).trim().toUpperCase() === (cleanCode + ' ' + cleanName) ||
          ((m.name || '') + ' ' + (m.code || '')).trim().toUpperCase() === (cleanCode + ' ' + cleanName)
        ) || allMaterials.find(m => {
          const mCode = (m.code || '').trim().toUpperCase();
          const mName = (m.name || '').trim().toUpperCase();
          return (cleanCode && mCode === cleanCode && (mName.includes(cleanName) || cleanName.includes(mName))) ||
                 (cleanName && mName === cleanName && (mCode.includes(cleanCode) || cleanCode.includes(mCode)));
        }) || allMaterials.find(m =>
          (cleanCode && (m.code || '').trim().toUpperCase() === cleanCode) ||
          (cleanName && (m.name || '').trim().toUpperCase() === cleanName)
        );

        if (!mat && !missingItemSet.has(cleanName)) {
          missingItemSet.add(cleanName);
          missingItems.push({
            code: item.code || `MAT-${allMaterials.length + missingItems.length + 1}`,
            name: item.name,
            unit: "Bags",
            gstPercent: item.gstPercent || 18
          });
        }

        let batchNo = item.batchNo || "";
        let landingCost = item.landingCost;

        if (mat) {
          const batches = state.getMaterialBatches(mat.id) || [];
          let matchedBatch = batches.find(b => b.batchNo && b.batchNo.trim().toUpperCase() === batchNo.trim().toUpperCase());
          if (!matchedBatch && batches.length > 0) {
            if (!batchNo) {
              matchedBatch = batches[0];
              batchNo = matchedBatch.batchNo;
            }
          }
          if (landingCost === null || isNaN(landingCost)) {
            landingCost = matchedBatch ? (matchedBatch.landingCost || mat.landingCost || 0) : (mat.landingCost || 0);
          }
        } else {
          if (landingCost === null || isNaN(landingCost)) {
            landingCost = 0;
          }
        }

        const qty = item.quantity;
        const rate = item.price;
        const discPct = item.discountPercent;
        const gstPct = item.gstPercent;

        const lineAmt = qty * rate;
        const discAmt = lineAmt * (discPct / 100);
        const taxable = lineAmt - discAmt;
        const gstAmt = taxable * (gstPct / 100);
        const lineTotal = taxable + gstAmt;

        subtotal += lineAmt;
        totalGst += gstAmt;
        grandTotal += lineTotal;

        return {
          materialId: mat ? mat.id : "",
          name: item.name,
          code: item.code,
          batchNo: batchNo,
          landingCost: parseFloat(landingCost) || 0,
          quantity: qty,
          price: rate,
          discountPercent: discPct,
          gstPercent: gstPct
        };
      });

      // Check if this invoice is already imported in active database records
      const itemsSig = processedItems.map(i => `${i.materialId}:${i.quantity}:${i.price}`).sort().join("|");
      const matchedExisting = activeDbList.find(existing => {
        if (!existing || existing.isCancelled || existing.isCanceled || String(existing.status).toUpperCase() === "CANCELLED") return false;

        const rawUpper = inv.rawInvNo ? inv.rawInvNo.trim().toUpperCase() : "";
        const exVNo = String(existing.voucherNo || existing.refNo || existing.id || "").trim().toUpperCase();
        if (rawUpper && exVNo && (exVNo === rawUpper || exVNo.endsWith("-" + rawUpper) || exVNo.endsWith(rawUpper))) {
          return true;
        }

        const partyMatch = (matchedContact && (existing.contactId === matchedContact.id || existing.supplierId === matchedContact.id)) ||
                           (String(existing.contactName || "").trim().toUpperCase() === cleanContactName);
        const dateMatch = String(existing.date || "").trim() === String(inv.date || "").trim();
        const totMatch = Math.abs(parseFloat(existing.total || existing.grandTotal || 0) - grandTotal) < 0.10;

        const exItemsSig = (existing.items || []).map(i => `${i.materialId}:${i.quantity}:${i.price}`).sort().join("|");
        const itemsMatch = itemsSig && exItemsSig && itemsSig === exItemsSig;

        return partyMatch && dateMatch && (totMatch || itemsMatch);
      });

      let voucherNo = "";
      let isAlreadyImported = false;

      if (matchedExisting) {
        voucherNo = matchedExisting.voucherNo || matchedExisting.refNo || matchedExisting.id;
        isAlreadyImported = true;
      } else {
        if (numberingOption === "file" && inv.rawInvNo) {
          const raw = inv.rawInvNo.trim();
          if (seriesObj && seriesObj.prefix) {
            const prefix = seriesObj.prefix;
            const suffix = seriesObj.suffix || "";
            const digits = parseInt(seriesObj.digits) || 4;
            const prefixUpper = prefix.toUpperCase();
            
            if (/^\d+$/.test(raw)) {
              const num = parseInt(raw, 10);
              voucherNo = `${prefix}${String(num).padStart(digits, "0")}${suffix}`;
            } else if (raw.toUpperCase().startsWith(prefixUpper)) {
              const numPart = raw.substring(prefix.length);
              const num = parseInt(numPart, 10);
              if (!isNaN(num)) {
                voucherNo = `${prefix}${String(num).padStart(digits, "0")}${suffix}`;
              } else {
                voucherNo = raw;
              }
            } else {
              voucherNo = raw;
            }
          } else {
            voucherNo = raw;
          }
        } else {
          if (seriesObj) {
            const prefix = seriesObj.prefix || "";
            const suffix = seriesObj.suffix || "";
            const digits = parseInt(seriesObj.digits) || 4;
            voucherNo = `${prefix}${String(seriesNextNum).padStart(digits, "0")}${suffix}`;
            seriesNextNum++;
          } else {
            voucherNo = `${isSales ? "INV-" : "PUR-"}${1000 + invoiceCounter}`;
          }
        }
      }

      processedInvoices.push({
        voucherNo: voucherNo,
        date: inv.date,
        contactName: inv.contactName,
        matchedContactId: matchedContact ? matchedContact.id : "",
        phone: inv.phone,
        gstin: inv.gstin,
        state: inv.state,
        payMode: inv.payMode,
        narration: inv.narration,
        items: processedItems,
        subtotal: subtotal,
        totalGst: totalGst,
        grandTotal: grandTotal,
        isValid: !!matchedContact,
        isAlreadyImported: isAlreadyImported
      });
    });

    renderPanels();
  }

  // Render Section Panels & Table Grid for Tab 1
  function renderPanels() {
    const missingContactsPanel = modalContainerEl.querySelector("#missing-contacts-panel");
    const missingContactsTbody = modalContainerEl.querySelector("#missing-contacts-tbody");
    const missingContactBadge = modalContainerEl.querySelector("#missing-contact-badge");

    const missingItemsPanel = modalContainerEl.querySelector("#missing-items-panel");
    const missingItemsTbody = modalContainerEl.querySelector("#missing-items-tbody");
    const missingItemsBadge = modalContainerEl.querySelector("#missing-items-badge");

    const previewTbody = modalContainerEl.querySelector("#import-preview-tbody");

    if (missingContacts.length > 0) {
      missingContactsPanel.style.display = "block";
      missingContactBadge.innerText = `${missingContacts.length} Missing`;

      missingContactsTbody.innerHTML = missingContacts.map((c, idx) => `
        <tr style="border-bottom:1px solid #fee2e2;">
          <td style="padding:4px 8px; font-weight:700; color:#0f172a;">${c.name}</td>
          <td style="padding:4px 8px; text-transform:capitalize;">${c.type}</td>
          <td style="padding:4px 8px;"><input type="text" class="inp-c-phone" data-idx="${idx}" value="${c.phone || ''}" placeholder="Phone" style="width:90px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:2px; font-size:11px;"></td>
          <td style="padding:4px 8px;"><input type="text" class="inp-c-gstin" data-idx="${idx}" value="${c.gstin || ''}" placeholder="GSTIN" style="width:120px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:2px; font-size:11px;"></td>
          <td style="padding:4px 8px;"><input type="text" class="inp-c-state" data-idx="${idx}" value="${c.state || 'KERALA'}" style="width:80px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:2px; font-size:11px;"></td>
          <td style="padding:4px 8px; text-align:right;">
            <button type="button" class="btn-create-single-contact" data-idx="${idx}" style="background:#dc2626; color:white; border:none; padding:3px 8px; font-weight:700; font-size:10px; border-radius:2px; cursor:pointer;">
              <i class="fa-solid fa-plus"></i> Create
            </button>
          </td>
        </tr>
      `).join("");

      modalContainerEl.querySelectorAll(".btn-create-single-contact").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.getAttribute("data-idx"));
          createSingleContact(idx);
        });
      });

      modalContainerEl.querySelector("#btn-create-all-contacts").onclick = () => createAllMissingContacts();
    } else {
      missingContactsPanel.style.display = "none";
    }

    if (missingItems.length > 0) {
      missingItemsPanel.style.display = "block";
      missingItemsBadge.innerText = `${missingItems.length} Missing`;

      missingItemsTbody.innerHTML = missingItems.map((item, idx) => `
        <tr style="border-bottom:1px solid #fef3c7;">
          <td style="padding:4px 8px; font-weight:700; color:#0f172a;">${item.code}</td>
          <td style="padding:4px 8px; font-weight:600;">${item.name}</td>
          <td style="padding:4px 8px;">${item.unit}</td>
          <td style="padding:4px 8px;">${item.gstPercent}%</td>
          <td style="padding:4px 8px; text-align:right;">
            <button type="button" class="btn-create-single-item" data-idx="${idx}" style="background:#d97706; color:white; border:none; padding:3px 8px; font-weight:700; font-size:10px; border-radius:2px; cursor:pointer;">
              <i class="fa-solid fa-plus"></i> Create Item
            </button>
          </td>
        </tr>
      `).join("");

      modalContainerEl.querySelectorAll(".btn-create-single-item").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.getAttribute("data-idx"));
          createSingleItem(idx);
        });
      });

      modalContainerEl.querySelector("#btn-create-all-items").onclick = () => createAllMissingItems();
    } else {
      missingItemsPanel.style.display = "none";
    }

    let grandTotalAmount = 0;
    let grandTotalItemsCount = 0;

    processedInvoices.forEach(inv => {
      grandTotalAmount += inv.grandTotal;
      grandTotalItemsCount += inv.items.length;
    });

    modalContainerEl.querySelector("#kpi-total-bills").innerText = processedInvoices.length;
    modalContainerEl.querySelector("#kpi-total-items").innerText = grandTotalItemsCount;
    modalContainerEl.querySelector("#kpi-total-amount").innerText = `₹${grandTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const forceAllBtn = modalContainerEl.querySelector("#btn-force-import-all");
    const hasImportedDuplicates = processedInvoices.some(inv => inv.isAlreadyImported);
    if (forceAllBtn) {
      forceAllBtn.style.display = hasImportedDuplicates ? "inline-block" : "none";
      const allForced = processedInvoices.every(inv => !inv.isAlreadyImported || inv.forceImport);
      forceAllBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> ${allForced ? 'Reset Duplicates' : 'Force Import All'}`;
      forceAllBtn.onclick = () => {
        const toggleVal = !allForced;
        processedInvoices.forEach(inv => {
          if (inv.isAlreadyImported) inv.forceImport = toggleVal;
        });
        renderPanels();
      };
    }

    if (processedInvoices.length === 0) {
      previewTbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:30px; color:#64748b; font-style:italic;">
            No CSV file uploaded yet. Click "Browse & Upload CSV File" above to load sales or purchase invoices.
          </td>
        </tr>
      `;
      executeBtn.disabled = true;
      executeBtn.style.background = "#94a3b8";
      executeBtn.style.cursor = "not-allowed";
      return;
    }

    let tbodyRowsHtml = "";
    processedInvoices.forEach((inv, idx) => {
      const isExpanded = expandedInvoices.has(idx);
      tbodyRowsHtml += `
        <tr style="border-bottom:1px solid #cbd5e1; background:${!inv.isValid ? '#fef2f2' : inv.forceImport ? '#f0f9ff' : inv.isAlreadyImported ? '#fffbeb' : '#ffffff'};">
          <td style="padding:6px 8px; color:#64748b;">${idx + 1}</td>
          <td style="padding:6px 8px;">
            <input type="text" class="inp-edit-vno" data-idx="${idx}" value="${inv.voucherNo}" style="padding:3px 6px; font-weight:700; color:#0369a1; border:1px solid #94a3b8; border-radius:3px; font-size:11px; width:130px;">
          </td>
          <td style="padding:6px 8px;">${inv.date}</td>
          <td style="padding:6px 8px; font-weight:700; color:${inv.isValid ? '#0f172a' : '#dc2626'};">
            ${inv.contactName} ${inv.isValid ? '' : '<span style="font-size:10px; color:#dc2626; font-style:italic;">(New)</span>'}
          </td>
          <td style="padding:6px 8px; text-align:center;">
            <button type="button" class="btn-toggle-items" data-idx="${idx}" style="background:${isExpanded ? '#0284c7' : '#e0f2fe'}; color:${isExpanded ? '#ffffff' : '#0369a1'}; border:1px solid #0284c7; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <i class="fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}"></i> Items (${inv.items.length})
            </button>
          </td>
          <td style="padding:6px 8px; text-align:right;">₹${inv.subtotal.toFixed(2)}</td>
          <td style="padding:6px 8px; text-align:right; color:#0284c7;">₹${inv.totalGst.toFixed(2)}</td>
          <td style="padding:6px 8px; text-align:right; font-weight:700; color:#16a34a;">₹${inv.grandTotal.toFixed(2)}</td>
          <td style="padding:6px 8px; text-align:center;">
            ${!inv.isValid ? `
              <span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:10px; font-weight:700; font-size:10px; display:inline-flex; align-items:center; gap:4px;">
                <i class="fa-solid fa-triangle-exclamation"></i> Create Contact
              </span>
            ` : inv.forceImport ? `
              <span class="btn-toggle-override" data-idx="${idx}" style="background:#0284c7; color:#ffffff; padding:2px 8px; border-radius:10px; font-weight:700; font-size:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Click to skip duplicate import">
                <i class="fa-solid fa-bolt"></i> Ready (Force Import)
              </span>
            ` : inv.isAlreadyImported ? `
              <span class="btn-toggle-override" data-idx="${idx}" style="background:#fffbeb; color:#b45309; border:1px solid #fcd34d; padding:2px 8px; border-radius:10px; font-weight:700; font-size:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Click to force import this invoice anyway">
                <i class="fa-solid fa-copy"></i> Already Imported <i class="fa-solid fa-hand-pointer" style="font-size:9px;"></i>
              </span>
            ` : `
              <span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:10px; font-weight:700; font-size:10px; display:inline-flex; align-items:center; gap:4px;">
                <i class="fa-solid fa-check-circle"></i> Ready
              </span>
            `}
          </td>
        </tr>
      `;

      if (isExpanded) {
        tbodyRowsHtml += `
          <tr style="background:#f8fafc; border-bottom:2px solid #0284c7;">
            <td colspan="9" style="padding:8px 12px;">
              <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; box-shadow:inset 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-weight:700; color:#0369a1; font-size:11px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                  <span><i class="fa-solid fa-boxes-stacked"></i> Line Items, Batch & Landing Cost Configuration for ${inv.voucherNo}</span>
                  <span style="font-size:10px; color:#64748b;">Click <strong>Batch Finder</strong> to choose or auto-populate inventory batch</span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:11px;">
                  <thead>
                    <tr style="background:#e0f2fe; color:#0369a1; border-bottom:1px solid #bae6fd; text-align:left;">
                      <th style="padding:4px 6px;">#</th>
                      <th style="padding:4px 6px;">Product / Material Name</th>
                      <th style="padding:4px 6px;">Batch Number</th>
                      <th style="padding:4px 6px; text-align:right;">Landing Cost (₹)</th>
                      <th style="padding:4px 6px; text-align:center;">Batch Finder</th>
                      <th style="padding:4px 6px; text-align:right;">Qty</th>
                      <th style="padding:4px 6px; text-align:right;">Rate (₹)</th>
                      <th style="padding:4px 6px; text-align:right;">GST %</th>
                      <th style="padding:4px 6px; text-align:right;">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inv.items.map((item, itemIdx) => {
                      const lineTaxable = (item.quantity * item.price) * (1 - (item.discountPercent / 100));
                      const lineGst = lineTaxable * (item.gstPercent / 100);
                      const lineTot = lineTaxable + lineGst;
                      return `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                          <td style="padding:4px 6px; color:#64748b;">${itemIdx + 1}</td>
                          <td style="padding:4px 6px; font-weight:700; color:#0f172a;">
                            ${item.name} <code style="font-size:10px; color:#64748b;">(${item.code || 'N/A'})</code>
                          </td>
                          <td style="padding:4px 6px;">
                            <input type="text" class="inp-item-batch" data-inv-idx="${idx}" data-item-idx="${itemIdx}" value="${item.batchNo || ''}" placeholder="Batch No" style="width:110px; padding:3px 6px; font-weight:700; color:#0369a1; border:1px solid #94a3b8; border-radius:3px; font-size:11px;">
                          </td>
                          <td style="padding:4px 6px; text-align:right;">
                            <input type="number" step="0.01" class="inp-item-lcost" data-inv-idx="${idx}" data-item-idx="${itemIdx}" value="${item.landingCost || 0}" placeholder="0.00" style="width:85px; padding:3px 6px; text-align:right; font-weight:700; color:#15803d; border:1px solid #94a3b8; border-radius:3px; font-size:11px;">
                          </td>
                          <td style="padding:4px 6px; text-align:center;">
                            <button type="button" class="btn-open-batch-finder" data-inv-idx="${idx}" data-item-idx="${itemIdx}" style="background:#0284c7; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:10px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                              <i class="fa-solid fa-magnifying-glass-chart"></i> Batch Finder
                            </button>
                          </td>
                          <td style="padding:4px 6px; text-align:right; font-weight:600;">${item.quantity}</td>
                          <td style="padding:4px 6px; text-align:right;">₹${item.price.toFixed(2)}</td>
                          <td style="padding:4px 6px; text-align:right;">${item.gstPercent}%</td>
                          <td style="padding:4px 6px; text-align:right; font-weight:700; color:#0f172a;">₹${lineTot.toFixed(2)}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        `;
      }
    });

    previewTbody.innerHTML = tbodyRowsHtml;

    modalContainerEl.querySelectorAll(".btn-toggle-items").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const invIdx = parseInt(e.currentTarget.getAttribute("data-idx"));
        if (expandedInvoices.has(invIdx)) {
          expandedInvoices.delete(invIdx);
        } else {
          expandedInvoices.add(invIdx);
        }
        renderPanels();
      });
    });

    modalContainerEl.querySelectorAll(".btn-toggle-override").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const invIdx = parseInt(e.currentTarget.getAttribute("data-idx"));
        processedInvoices[invIdx].forceImport = !processedInvoices[invIdx].forceImport;
        renderPanels();
      });
    });

    modalContainerEl.querySelectorAll(".inp-edit-vno").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-idx"));
        processedInvoices[idx].voucherNo = e.currentTarget.value.trim();
      });
    });

    modalContainerEl.querySelectorAll(".inp-item-batch").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const invIdx = parseInt(e.currentTarget.getAttribute("data-inv-idx"));
        const itemIdx = parseInt(e.currentTarget.getAttribute("data-item-idx"));
        processedInvoices[invIdx].items[itemIdx].batchNo = e.currentTarget.value.trim();
      });
    });

    modalContainerEl.querySelectorAll(".inp-item-lcost").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const invIdx = parseInt(e.currentTarget.getAttribute("data-inv-idx"));
        const itemIdx = parseInt(e.currentTarget.getAttribute("data-item-idx"));
        processedInvoices[invIdx].items[itemIdx].landingCost = parseFloat(e.currentTarget.value) || 0;
      });
    });

    modalContainerEl.querySelectorAll(".btn-open-batch-finder").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const invIdx = parseInt(e.currentTarget.getAttribute("data-inv-idx"));
        const itemIdx = parseInt(e.currentTarget.getAttribute("data-item-idx"));
        const targetItem = processedInvoices[invIdx]?.items[itemIdx];
        if (!targetItem) return;

        showBatchFinderModal(targetItem.materialId, targetItem.batchNo, (newBatchNo, newLandingCost) => {
          targetItem.batchNo = newBatchNo;
          targetItem.landingCost = newLandingCost;
          renderPanels();
        });
      });
    });

    const hasUnresolvedContacts = missingContacts.length > 0 || processedInvoices.some(inv => !inv.isValid);
    if (hasUnresolvedContacts) {
      executeBtn.disabled = true;
      executeBtn.style.background = "#94a3b8";
      executeBtn.style.cursor = "not-allowed";
      executeBtn.title = "Please create missing customers/vendors above before importing.";
    } else {
      executeBtn.disabled = false;
      executeBtn.style.background = "#16a34a";
      executeBtn.style.cursor = "pointer";
      executeBtn.title = "Click to import all invoices";
    }

    executeBtn.onclick = () => executeImportInvoices();
  }

  // Create single missing contact
  function createSingleContact(idx) {
    const c = missingContacts[idx];
    if (!c) return;

    const rowPhone = modalContainerEl.querySelector(`.inp-c-phone[data-idx="${idx}"]`)?.value || c.phone;
    const rowGstin = modalContainerEl.querySelector(`.inp-c-gstin[data-idx="${idx}"]`)?.value || c.gstin;
    const rowState = modalContainerEl.querySelector(`.inp-c-state[data-idx="${idx}"]`)?.value || c.state;

    try {
      state.addContact({
        name: c.name,
        type: c.type,
        phone: rowPhone,
        gstin: rowGstin,
        state: rowState || "KERALA",
        listInCustomerList: c.type === "customer",
        listInVendorList: c.type === "supplier"
      });
      processParsedRows();
    } catch (err) {
      alert(`Error creating contact "${c.name}": ${err.message}`);
    }
  }

  // Create all missing contacts at once
  function createAllMissingContacts() {
    let createdCount = 0;
    missingContacts.forEach((c, idx) => {
      const rowPhone = modalContainerEl.querySelector(`.inp-c-phone[data-idx="${idx}"]`)?.value || c.phone;
      const rowGstin = modalContainerEl.querySelector(`.inp-c-gstin[data-idx="${idx}"]`)?.value || c.gstin;
      const rowState = modalContainerEl.querySelector(`.inp-c-state[data-idx="${idx}"]`)?.value || c.state;

      try {
        state.addContact({
          name: c.name,
          type: c.type,
          phone: rowPhone,
          gstin: rowGstin,
          state: rowState || "KERALA",
          listInCustomerList: c.type === "customer",
          listInVendorList: c.type === "supplier"
        });
        createdCount++;
      } catch (err) {
        console.warn(`Could not auto-create contact "${c.name}":`, err.message);
      }
    });

    if (createdCount > 0) {
      processParsedRows();
    }
  }

  // Create single missing item
  function createSingleItem(idx) {
    const item = missingItems[idx];
    if (!item) return;

    try {
      state.addMaterial({
        name: item.name,
        code: item.code,
        category: "General",
        unit: item.unit || "Bags",
        igst: item.gstPercent || 18,
        cgst: (item.gstPercent || 18) / 2,
        sgst: (item.gstPercent || 18) / 2
      });
      processParsedRows();
    } catch (err) {
      alert(`Error creating item "${item.name}": ${err.message}`);
    }
  }

  // Create all missing items at once
  function createAllMissingItems() {
    let createdCount = 0;
    missingItems.forEach(item => {
      try {
        state.addMaterial({
          name: item.name,
          code: item.code,
          category: "General",
          unit: item.unit || "Bags",
          igst: item.gstPercent || 18,
          cgst: (item.gstPercent || 18) / 2,
          sgst: (item.gstPercent || 18) / 2
        });
        createdCount++;
      } catch (err) {
        console.warn(`Could not auto-create item "${item.name}":`, err.message);
      }
    });

    if (createdCount > 0) {
      processParsedRows();
    }
  }

  // ================= TAB 2: VIEW & MANAGE IMPORTED HISTORY FUNCTIONS =================
  function renderImportedHistoryData() {
    const filterCategory = modalContainerEl.querySelector("#hist-tx-type-filter")?.value || "All";
    const filterQuery = (modalContainerEl.querySelector("#hist-search-input")?.value || "").trim().toUpperCase();

    const allContacts = state.getContacts() || [];
    const allMaterials = state.getMaterials() || [];

    // Retrieve active non-cancelled invoices & purchases
    const rawSales = (state.getInvoices() || [])
      .filter(i => !i.isCancelled && !i.isCanceled && String(i.status).toUpperCase() !== "CANCELLED")
      .map(i => ({ ...i, txType: "Sales" }));

    const rawPurchases = (state.getPurchases() || [])
      .filter(p => !p.isCancelled && !p.isCanceled && String(p.status).toUpperCase() !== "CANCELLED")
      .map(p => ({ ...p, txType: "Purchase" }));

    let combinedList = [];
    if (filterCategory === "Sales") {
      combinedList = rawSales;
    } else if (filterCategory === "Purchase") {
      combinedList = rawPurchases;
    } else {
      combinedList = [...rawSales, ...rawPurchases];
    }

    // Sort by Date descending then Voucher No
    combinedList.sort((a, b) => {
      const dA = String(a.date || "");
      const dB = String(b.date || "");
      if (dA !== dB) return dB.localeCompare(dA);
      return String(b.voucherNo || b.refNo || b.id).localeCompare(String(a.voucherNo || a.refNo || a.id));
    });

    // Filter by search query
    if (filterQuery) {
      combinedList = combinedList.filter(inv => {
        const vNo = String(inv.voucherNo || inv.refNo || inv.id || "").toUpperCase();
        const contact = allContacts.find(c => c.id === (inv.contactId || inv.supplierId));
        const cName = String(inv.contactName || contact?.name || "").toUpperCase();
        const dateStr = String(inv.date || "").toUpperCase();
        return vNo.includes(filterQuery) || cName.includes(filterQuery) || dateStr.includes(filterQuery);
      });
    }

    // Calculate KPI Totals
    let totalSalesAmt = 0;
    let totalPurAmt = 0;

    rawSales.forEach(s => totalSalesAmt += parseFloat(s.total || s.grandTotal || 0));
    rawPurchases.forEach(p => totalPurAmt += parseFloat(p.total || p.grandTotal || 0));

    modalContainerEl.querySelector("#hist-kpi-count").innerText = combinedList.length;
    modalContainerEl.querySelector("#hist-kpi-sales").innerText = `₹${totalSalesAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    modalContainerEl.querySelector("#hist-kpi-purchases").innerText = `₹${totalPurAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Detect duplicate groups for KPI badge
    const duplicateMap = new Map();
    let duplicateCount = 0;
    const allActive = [...rawSales, ...rawPurchases];
    allActive.forEach(doc => {
      const partyId = String(doc.contactId || doc.supplierId || doc.contactName || "").trim().toUpperCase();
      const date = String(doc.date || "").trim();
      const total = parseFloat(doc.total || doc.grandTotal || 0).toFixed(2);
      const itemsSig = (doc.items || []).map(i => `${i.materialId}:${i.quantity}:${i.price}`).sort().join("|");
      const key = `${partyId}::${date}::${total}::${itemsSig}`;
      duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
    });

    duplicateMap.forEach(count => {
      if (count > 1) duplicateCount += (count - 1);
    });

    const dupBadgeEl = modalContainerEl.querySelector("#hist-kpi-duplicates-badge");
    const dupTextEl = modalContainerEl.querySelector("#hist-kpi-dup-text");
    if (duplicateCount > 0) {
      dupBadgeEl.style.display = "inline-flex";
      dupTextEl.innerText = `${duplicateCount} Duplicate Invoices Found`;
    } else {
      dupBadgeEl.style.display = "none";
    }

    const histTbody = modalContainerEl.querySelector("#hist-table-tbody");
    if (!histTbody) return;

    if (combinedList.length === 0) {
      histTbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:35px; color:#64748b; font-style:italic;">
            No imported or active invoices match the current filters.
          </td>
        </tr>
      `;
      return;
    }

    let tbodyHtml = "";
    combinedList.forEach((inv, idx) => {
      const isSales = inv.txType === "Sales";
      const contactObj = allContacts.find(c => c.id === (inv.contactId || inv.supplierId));
      const partyName = inv.contactName || contactObj?.name || (isSales ? "Customer" : "Vendor");
      const vNo = inv.voucherNo || inv.refNo || inv.id;
      const itemsList = inv.items || [];
      const isExpanded = expandedHistInvoices.has(inv.id);

      const subtotal = parseFloat(inv.subtotal || 0) || (parseFloat(inv.total || inv.grandTotal || 0) / 1.18);
      const grandTotal = parseFloat(inv.total || inv.grandTotal || 0);
      const totalGst = parseFloat(inv.tax || inv.totalGst || 0) || (grandTotal - subtotal);

      tbodyHtml += `
        <tr style="border-bottom:1px solid #cbd5e1; background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:6px 10px; color:#64748b;">${idx + 1}</td>
          <td style="padding:6px 10px; font-weight:700; color:#0369a1;">${vNo}</td>
          <td style="padding:6px 10px;">${inv.date}</td>
          <td style="padding:6px 10px;">
            <span style="background:${isSales ? '#e0f2fe' : '#fef3c7'}; color:${isSales ? '#0369a1' : '#92400e'}; padding:2px 8px; border-radius:10px; font-weight:700; font-size:10px;">
              ${isSales ? 'Sales' : 'Purchase'}
            </span>
          </td>
          <td style="padding:6px 10px; font-weight:700; color:#0f172a;">${partyName}</td>
          <td style="padding:6px 10px; text-align:center;">
            <button type="button" class="btn-toggle-hist-items" data-id="${inv.id}" style="background:${isExpanded ? '#0284c7' : '#f1f5f9'}; color:${isExpanded ? '#ffffff' : '#334155'}; border:1px solid #94a3b8; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <i class="fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}"></i> Items (${itemsList.length})
            </button>
          </td>
          <td style="padding:6px 10px; text-align:right; color:#475569;">₹${subtotal.toFixed(2)}</td>
          <td style="padding:6px 10px; text-align:right; color:#0284c7;">₹${totalGst.toFixed(2)}</td>
          <td style="padding:6px 10px; text-align:right; font-weight:700; color:#16a34a;">₹${grandTotal.toFixed(2)}</td>
          <td style="padding:6px 10px; text-align:center;">
            <button type="button" class="btn-delete-hist-inv" data-id="${inv.id}" data-vno="${vNo}" data-txtype="${inv.txType}" style="background:#dc2626; color:white; border:none; padding:4px 10px; font-weight:700; font-size:10px; border-radius:3px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <i class="fa-solid fa-trash-can"></i> Remove & Adjust
            </button>
          </td>
        </tr>
      `;

      if (isExpanded) {
        tbodyHtml += `
          <tr style="background:#f1f5f9; border-bottom:2px solid #0284c7;">
            <td colspan="10" style="padding:8px 12px;">
              <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px;">
                <div style="font-weight:700; color:#0369a1; font-size:11px; margin-bottom:6px;">
                  <i class="fa-solid fa-boxes-stacked"></i> Line Item Details for Invoice ${vNo}
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:11px;">
                  <thead>
                    <tr style="background:#e2e8f0; color:#1e293b; text-align:left;">
                      <th style="padding:4px 6px;">#</th>
                      <th style="padding:4px 6px;">Material Code & Name</th>
                      <th style="padding:4px 6px;">Batch Number</th>
                      <th style="padding:4px 6px; text-align:right;">Landing Cost (₹)</th>
                      <th style="padding:4px 6px; text-align:right;">Quantity</th>
                      <th style="padding:4px 6px; text-align:right;">Rate (₹)</th>
                      <th style="padding:4px 6px; text-align:right;">GST %</th>
                      <th style="padding:4px 6px; text-align:right;">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList.map((item, iIdx) => {
                      const mat = allMaterials.find(m => m.id === item.materialId);
                      const matName = mat ? mat.name : (item.name || "Item");
                      const matCode = mat ? mat.code : (item.code || "N/A");
                      const q = parseFloat(item.quantity || 0);
                      const r = parseFloat(item.price || item.rate || 0);
                      const disc = parseFloat(item.discountPercent || 0);
                      const gst = parseFloat(item.gstPercent || 18);

                      const lineTaxable = (q * r) * (1 - (disc / 100));
                      const lineTot = lineTaxable * (1 + (gst / 100));
                      return `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                          <td style="padding:4px 6px; color:#64748b;">${iIdx + 1}</td>
                          <td style="padding:4px 6px; font-weight:700; color:#0f172a;">${matName} <code style="font-size:10px; color:#64748b;">(${matCode})</code></td>
                          <td style="padding:4px 6px; font-weight:700; color:#0369a1;">${item.batchNo || 'N/A'}</td>
                          <td style="padding:4px 6px; text-align:right; color:#15803d; font-weight:600;">₹${parseFloat(item.landingCost || 0).toFixed(2)}</td>
                          <td style="padding:4px 6px; text-align:right; font-weight:700;">${q}</td>
                          <td style="padding:4px 6px; text-align:right;">₹${r.toFixed(2)}</td>
                          <td style="padding:4px 6px; text-align:right;">${gst}%</td>
                          <td style="padding:4px 6px; text-align:right; font-weight:700; color:#16a34a;">₹${lineTot.toFixed(2)}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        `;
      }
    });

    histTbody.innerHTML = tbodyHtml;

    // Toggle History Drawer
    modalContainerEl.querySelectorAll(".btn-toggle-hist-items").forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        if (expandedHistInvoices.has(id)) {
          expandedHistInvoices.delete(id);
        } else {
          expandedHistInvoices.add(id);
        }
        renderImportedHistoryData();
      };
    });

    // Single Invoice Delete & Resequence Action
    modalContainerEl.querySelectorAll(".btn-delete-hist-inv").forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const vNo = e.currentTarget.getAttribute("data-vno");
        const txType = e.currentTarget.getAttribute("data-txtype");

        if (!confirm(`Are you sure you want to remove Invoice ${vNo}?\n\nThis will purge accounting vouchers, adjust party balance, reverse stock, and realign series numbers.`)) {
          return;
        }

        const isSales = txType === "Sales";
        const removed = state.removeCancelledBill(id, isSales ? "sales" : "purchase", true);
        if (removed) {
          alert(`Invoice ${vNo} was successfully deleted and series numbers realigned.`);
          renderImportedHistoryData();
          if (onSuccess && typeof onSuccess === "function") {
            onSuccess();
          }
        } else {
          alert(`Could not delete invoice ${vNo}. Please try again.`);
        }
      };
    });
  }

  // Bind History Filters & Cleanup Duplicates Button
  modalContainerEl.querySelector("#hist-tx-type-filter")?.addEventListener("change", renderImportedHistoryData);
  modalContainerEl.querySelector("#hist-search-input")?.addEventListener("input", renderImportedHistoryData);

  modalContainerEl.querySelector("#btn-modal-cleanup-duplicates")?.addEventListener("click", () => {
    if (!confirm("Are you sure you want to scan for and remove duplicate invoices?\n\nThis will retain the original invoice numbers, delete duplicate copies, purge accounting transactions, reverse inventory, and realign series numbers.")) {
      return;
    }

    const sRemoved = state.removeDuplicateInvoices("sales");
    const pRemoved = state.removeDuplicateInvoices("purchase");
    const totalRemoved = sRemoved + pRemoved;

    if (totalRemoved > 0) {
      alert(`🎉 CLEANUP COMPLETED!\n\nSuccessfully removed ${totalRemoved} duplicate invoice(s) and realigned series voucher numbers.`);
      renderImportedHistoryData();
      if (onSuccess && typeof onSuccess === "function") {
        onSuccess();
      }
    } else {
      alert("No duplicate invoices were found in the database.");
    }
  });

  // Final Execution of Invoice Import
  function executeImportInvoices() {
    if (processedInvoices.length === 0) return;

    const executeBtn = modalContainerEl.querySelector("#btn-execute-import");
    if (executeBtn) {
      if (executeBtn.disabled && executeBtn.dataset.submitting === "true") return;
      executeBtn.disabled = true;
      executeBtn.dataset.submitting = "true";
      executeBtn.style.background = "#94a3b8";
      executeBtn.style.cursor = "not-allowed";
      executeBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Importing Invoices... Please Wait`;
    }

    const isSales = currentTxType === "Sales";
    let importedCount = 0;
    let skippedDuplicateCount = 0;
    let errorCount = 0;

    const contactsList = state.getContacts();
    const materialsList = state.getMaterials();

    processedInvoices.forEach((inv, idx) => {
      // Read the EXACT voucher number string currently in the layout text input
      const vInput = modalContainerEl.querySelector(`.inp-edit-vno[data-idx="${idx}"]`);
      const targetVoucherNo = vInput ? vInput.value.trim() : inv.voucherNo;

      let cleanContactName = inv.contactName.trim().toUpperCase();
      let contactObj = contactsList.find(c =>
        c.name.trim().toUpperCase() === cleanContactName &&
        (isSales ? (c.type === "customer" || c.listInCustomerList || c.type !== "supplier") : (c.type === "supplier" || c.listInVendorList || c.type !== "customer"))
      );

      if (!contactObj && isSales && String(inv.payMode || "").trim().toUpperCase().includes("CASH")) {
        contactObj = contactsList.find(c => c.name.trim().toUpperCase() === "CASH SALES" || c.id === "__CASH__") || { id: "__CASH__", name: "CASH SALES", type: "customer" };
      }

      if (!contactObj) {
        errorCount++;
        return;
      }

      // Query dynamic active invoices from database
      const activeDbList = isSales ? (state.getInvoices() || []) : (state.getPurchases() || []);

      const isDuplicate = activeDbList.some(existing => {
        if (!existing || existing.isCancelled || existing.isCanceled || String(existing.status).toUpperCase() === "CANCELLED") return false;

        const exVNo = String(existing.voucherNo || existing.refNo || existing.id || "").trim().toUpperCase();
        if (targetVoucherNo && exVNo && exVNo === targetVoucherNo.toUpperCase()) {
          return true;
        }

        const partyMatch = (existing.contactId === contactObj.id || existing.supplierId === contactObj.id || String(existing.contactName || "").trim().toUpperCase() === cleanContactName);
        const dateMatch = String(existing.date || "").trim() === String(inv.date || "").trim();
        const existingTot = parseFloat(existing.total || existing.grandTotal || 0);
        const invTot = parseFloat(inv.grandTotal || 0);
        const totalMatch = Math.abs(existingTot - invTot) < 0.10;

        const itemsSig = inv.items.map(i => `${i.materialId}:${i.quantity}:${i.price}`).sort().join("|");
        const exItemsSig = (existing.items || []).map(i => `${i.materialId}:${i.quantity}:${i.price}`).sort().join("|");
        const itemsMatch = itemsSig && exItemsSig && itemsSig === exItemsSig;

        return partyMatch && dateMatch && (totalMatch || itemsMatch);
      });

      if ((isDuplicate || inv.isAlreadyImported) && !inv.forceImport) {
        skippedDuplicateCount++;
        return;
      }

      const targetUpper = targetVoucherNo.trim().toUpperCase();
      if (isSales) {
        state.invoices = (state.invoices || []).filter(i => String(i.voucherNo || i.id || "").trim().toUpperCase() !== targetUpper);
      } else {
        state.purchases = (state.purchases || []).filter(p => String(p.voucherNo || p.id || "").trim().toUpperCase() !== targetUpper);
      }

      state.transactions = (state.transactions || []).filter(tx => {
        const tvno = String(tx.voucherNo || "").trim().toUpperCase();
        const tref = String(tx.reference || "").trim().toUpperCase();
        const tvid = String(tx.voucherId || "").trim().toUpperCase();
        return tvno !== targetUpper && tref !== targetUpper && tvid !== targetUpper && !tref.startsWith(targetUpper + " ");
      });

      const mappedItems = inv.items.map(item => {
        let mat = materialsList.find(m => m.id === item.materialId);
        if (!mat) {
          const cleanCode = item.code ? item.code.trim().toUpperCase() : "";
          const cleanName = item.name ? item.name.trim().toUpperCase() : "";
          mat = materialsList.find(m =>
            cleanCode && cleanName && (m.code || '').trim().toUpperCase() === cleanCode && (m.name || '').trim().toUpperCase() === cleanName
          ) || materialsList.find(m =>
            cleanCode && cleanName && (m.code || '').trim().toUpperCase() === cleanName && (m.name || '').trim().toUpperCase() === cleanCode
          ) || materialsList.find(m =>
            ((m.code || '') + ' ' + (m.name || '')).trim().toUpperCase() === (cleanCode + ' ' + cleanName) ||
            ((m.name || '') + ' ' + (m.code || '')).trim().toUpperCase() === (cleanCode + ' ' + cleanName)
          ) || materialsList.find(m => {
            const mCode = (m.code || '').trim().toUpperCase();
            const mName = (m.name || '').trim().toUpperCase();
            return (cleanCode && mCode === cleanCode && (mName.includes(cleanName) || cleanName.includes(mName))) ||
                   (cleanName && mName === cleanName && (mCode.includes(cleanCode) || cleanCode.includes(mCode)));
          }) || materialsList.find(m =>
            (cleanCode && (m.code || '').trim().toUpperCase() === cleanCode) ||
            (cleanName && (m.name || '').trim().toUpperCase() === cleanName)
          ) || materialsList[0];
        }

        if (mat && item.batchNo) {
          state.addOrUpdateMaterialBatch(mat.id, {
            batchNo: item.batchNo,
            landingCost: item.landingCost !== undefined ? item.landingCost : (mat.landingCost || 0)
          });
        }

        return {
          materialId: mat ? mat.id : materialsList[0]?.id || "MAT-001",
          batchNo: item.batchNo || "",
          landingCost: item.landingCost !== undefined ? item.landingCost : 0,
          quantity: item.quantity,
          price: item.price,
          discountPercent: item.discountPercent || 0,
          gstPercent: item.gstPercent || 18
        };
      });

      try {
        if (isSales) {
          state.createInvoice({
            seriesId: selectedSeriesId,
            voucherNo: targetVoucherNo,
            date: inv.date,
            contactId: contactObj.id,
            siteName: "",
            state: inv.state || contactObj.state || "KERALA",
            payMode: inv.payMode || "Credit",
            narration: inv.narration || "Imported via Admin",
            items: mappedItems
          });
        } else {
          state.recordPurchase({
            seriesId: selectedSeriesId,
            voucherNo: targetVoucherNo,
            refNo: targetVoucherNo,
            invoiceNo: targetVoucherNo,
            date: inv.date,
            supplierId: contactObj.id,
            siteName: "",
            state: inv.state || contactObj.state || "KERALA",
            payMode: inv.payMode || "Credit",
            narration: inv.narration || "Imported via Admin",
            items: mappedItems
          });
        }
        importedCount++;
      } catch (err) {
        console.error("Error creating imported invoice:", err);
        errorCount++;
      }
    });

    state.realignSeriesCurrentNumbers();
    state.saveState();

    let msg = `🎉 IMPORT COMPLETED!\n\nSuccessfully imported: ${importedCount} ${currentTxType} Invoice(s)`;
    if (skippedDuplicateCount > 0) {
      msg += `\nSkipped Duplicates / Already Imported: ${skippedDuplicateCount} (Already present in database)`;
    }
    if (errorCount > 0) {
      msg += `\nFailed / Errors: ${errorCount}`;
    }
    msg += `\n\nDouble-entry vouchers, inventory batches, and series numbers have been updated.`;

    alert(msg);

    if (onSuccess && typeof onSuccess === "function") {
      onSuccess();
    }

    // Switch to history tab so user sees all imported invoices immediately!
    switchTab("history");
  }

  function closeModal() {
    if (modalContainerEl) {
      modalContainerEl.remove();
      modalContainerEl = null;
    }
  }
}
