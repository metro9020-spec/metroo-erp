import { state } from "../state.js";
import { renderPrintHeaderHtml, formatDateDisplay } from "./reports.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";

export function showPurchaseReportModal(container) {
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const modalId = "purchase-report-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    existing.style.zIndex = String(2000 + root.children.length * 10);
    return;
  }

  const materials = state.getMaterials();
  const purchases = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);

  // Derive unique brands and categories for filter dropdowns
  const companies = [...new Set(materials.map(m => m.company).filter(Boolean))];
  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];
  const subCategories = [...new Set(materials.map(m => m.subCategory || "All").filter(Boolean))];

  // Default dates (current month)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

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
      <div class="modal-container modal-lg" style="max-width:1400px; width: 96vw; height:90vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Official Print Header -->
        ${renderPrintHeaderHtml("PURCHASE REGISTER / REPORT", "Period: " + formatDateDisplay(firstDay) + " to " + formatDateDisplay(lastDay))}

        <!-- Header ribbon -->
        <div class="no-print" style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice"></i> PURCHASE REPORT</div>
          <div style="display:flex; gap:4px;">
            <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="rep-close-btn">&times;</button>
          </div>
        </div>

        <!-- Upper Control Dashboard Grid -->
        <div class="no-print" style="display:grid; grid-template-columns: 340px 1fr 280px; gap:10px; background:#b4c6e7; padding:10px; border:1px solid #8faadc; border-radius:2px; align-items:start;">
          
          <!-- Radio Options Group (Left Panel) -->
          <div style="background:#d9e1f2; border:1px solid #8faadc; padding:6px; border-radius:2px; display:grid; grid-template-columns: 1fr 1.2fr 1fr; gap:6px 4px;">
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="all" checked> All</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="group"> Product Group</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="employee"> Employee</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="company"> Company</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="product"> Product Name</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="serial"> Serial NO</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="category"> Category</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="code"> Code/Model</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="billseries"> Bill Series</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="billno"> Bill No</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="billamount"> Bill Amount</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="vendor"> Vendor</label>
            </div>

          <!-- Dynamic Middle Filters (Populated contextually based on Radio selection) -->
          <div id="dynamic-filters-box" style="display:flex; flex-wrap:wrap; gap:8px; align-content:start;">
            <!-- Rendered contextually -->
          </div>

          <!-- Extra Checkboxes and Print actions (Right Panel) -->
          <div style="display:flex; flex-direction:column; gap:8px; align-items:end;">
            <div style="display:flex; flex-direction:column; gap:4px; align-self:start;">
              <label style="display:flex; align-items:center; gap:6px; font-weight:bold; cursor:pointer;"><input type="checkbox" id="chk-daywise"> Daywise</label>
              <label style="display:flex; align-items:center; gap:6px; font-weight:bold; cursor:pointer;"><input type="checkbox" id="chk-include-return"> Include Purchase Return</label>
              <label style="display:flex; align-items:center; gap:6px; font-weight:bold; cursor:pointer;"><input type="checkbox" id="chk-show-paymode"> Show Payment Mode</label>
            </div>
            
            <div style="display:flex; gap:6px; margin-top:auto;">
              <button type="button" class="btn btn-secondary" id="btn-rep-view" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">View</button>
              <button type="button" class="btn btn-secondary" id="btn-rep-print" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print</button>
              <button type="button" class="btn btn-secondary" id="btn-rep-print-bill" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print as Bill</button>
              <button type="button" class="btn btn-secondary" id="btn-rep-close" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Close</button>
            </div>
          </div>
        </div>

        <!-- Date limits toolbar -->
        <div class="no-print" style="background:#cbd5e1; border:1px solid #94a3b8; padding:4px 8px; display:flex; gap:15px; align-items:center; font-weight:bold;">
          <div>
            From: ${renderTallyDatePickerHtml({ id: "rep-date-from", value: firstDay, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
          </div>
          <div>
            To: ${renderTallyDatePickerHtml({ id: "rep-date-to", value: lastDay, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
          </div>
        </div>

        <!-- Table Grid view -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="purchase-report-table">
            <!-- Headers and rows rendered dynamically -->
          </table>
        </div>

      </div>
  `;






  root.appendChild(modalEl);
  initTallyDatePickers(modalEl);
  const close = () => { modalEl.remove(); };

  modalEl.querySelector("#rep-close-btn")?.addEventListener("click", close);
  modalEl.querySelector("#btn-rep-close")?.addEventListener("click", close);
  modalEl.querySelector("#btn-rep-print")?.addEventListener("click", () => window.print());
  modalEl.querySelector("#btn-rep-print-bill")?.addEventListener("click", () => window.print());

  const dynamicBox = document.getElementById("dynamic-filters-box");
  const dateFromEl = document.getElementById("rep-date-from");
  const dateToEl = document.getElementById("rep-date-to");
  const tableEl = document.getElementById("purchase-report-table");

  // Render sub-filters middle layout contextually
  function updateMiddleFilters(mode) {
    if (mode === "company") {
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Company</legend>
          <select id="filt-company" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:200px;">
            <option value="All">All</option>
            ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else if (mode === "category") {
      dynamicBox.innerHTML = `
        <div style="display:flex; gap:8px;">
          <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
            <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Company</legend>
            <select id="filt-company" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:140px;">
              <option value="All">All</option>
              ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </fieldset>
          <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
            <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Sub Category</legend>
            <select id="filt-subcategory" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:140px;">
              <option value="All">All</option>
              ${subCategories.map(sc => `<option value="${sc}">${sc}</option>`).join("")}
            </select>
          </fieldset>
          <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
            <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Category</legend>
            <select id="filt-category" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:140px;">
              <option value="All">All</option>
              ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join("")}
            </select>
          </fieldset>
        </div>
      `;
    } else if (mode === "billno") {
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Filter By Bill No</legend>
          <div style="display:flex; align-items:center; gap:8px;">
            <select id="filt-billno-criteria" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:110px;">
              <option value="all">Show All</option>
              <option value="equal">Equal To</option>
              <option value="less">Less Than</option>
              <option value="greater">Greater Than</option>
              <option value="between">In Between</option>
            </select>
            <input type="text" id="filt-billno-val1" class="form-control" placeholder="Val 1" style="padding:2px; width:70px; display:inline-block; font-size:0.75rem; background:white; color:black;">
            <span id="filt-billno-val2-container" style="display:none; align-items:center; gap:4px;">
              and <input type="text" id="filt-billno-val2" class="form-control" placeholder="Val 2" style="padding:2px; width:70px; display:inline-block; font-size:0.75rem; background:white; color:black;">
            </span>
          </div>
        </fieldset>
      `;
      const criteriaSelect = document.getElementById("filt-billno-criteria");
      criteriaSelect.addEventListener("change", (e) => {
        const v2 = document.getElementById("filt-billno-val2-container");
        if (v2) v2.style.display = e.target.value === "between" ? "inline-flex" : "none";
      });
    } else if (mode === "vendor") {
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Vendor</legend>
          <select id="filt-vendor" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:220px;">
            <option value="All">All</option>
            ${vendors.map(cust => `<option value="${cust.id}">${cust.name}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else if (mode === "product") {
      const uniqueProducts = [...new Set(materials.map(m => m.name).filter(Boolean))];
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Product</legend>
          <select id="filt-product-select" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:220px;">
            <option value="All">All</option>
            ${uniqueProducts.map(p => `<option value="${p}">${p}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else if (mode === "group") {
      const uniqueGroups = [...new Set(materials.map(m => m.productGroup).filter(Boolean))];
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Product Group</legend>
          <select id="filt-group-select" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:200px;">
            <option value="All">All</option>
            ${uniqueGroups.map(g => `<option value="${g}">${g}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else if (mode === "code") {
      const uniqueCodes = [...new Set(materials.map(m => m.code).filter(Boolean))];
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Code/Model</legend>
          <select id="filt-code-select" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:200px;">
            <option value="All">All</option>
            ${uniqueCodes.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else {
      // Default placeholder
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Filter Options</legend>
          <select id="filt-default" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:200px;" disabled>
            <option value="All">All Records</option>
          </select>
        </fieldset>
      `;
    }
  }

  // Generate date format (DD/MM/YYYY)
  function formatDate(dStr) {
    return formatDateDisplay(dStr);
  }

  // Core Render Report logic
  function renderReportGrid() {
    const fromDate = dateFromEl.value;
    const toDate = dateToEl.value;
    const mode = document.querySelector("input[name='rep-mode']:checked").value;
    const daywise = document.getElementById("chk-daywise").checked;
    const includeReturns = document.getElementById("chk-include-return").checked;
    
    // Filter purchases by Date Range
    let filteredInvoices = purchases.filter(inv => {
      let ok = true;
      if (fromDate) ok = ok && (inv.date >= fromDate);
      if (toDate) ok = ok && (inv.date <= toDate);
      return ok;
    });

    // Sub-filters context check
    if (mode === "vendor") {
      const custId = document.getElementById("filt-vendor")?.value || "All";
      if (custId !== "All") {
        filteredInvoices = filteredInvoices.filter(inv => inv.contactId === custId);
      }
    } else if (mode === "billno") {
      const criteria = document.getElementById("filt-billno-criteria")?.value || "all";
      const val1 = document.getElementById("filt-billno-val1")?.value.trim().toLowerCase() || "";
      const val2 = document.getElementById("filt-billno-val2")?.value.trim().toLowerCase() || "";

      if (criteria !== "all" && val1 !== "") {
        filteredInvoices = filteredInvoices.filter(inv => {
          const invIdStr = String(inv.id).toLowerCase();
          const invIdNum = parseFloat(invIdStr.replace(/[^0-9.]/g, "")) || 0;
          const v1Num = parseFloat(val1) || 0;
          const v2Num = parseFloat(val2) || 0;

          if (criteria === "equal") {
            return invIdStr === val1 || invIdNum === v1Num;
          } else if (criteria === "less") {
            return invIdNum < v1Num;
          } else if (criteria === "greater") {
            return invIdNum > v1Num;
          } else if (criteria === "between") {
            return invIdNum >= v1Num && invIdNum <= v2Num;
          }
          return true;
        });
      }
    }

    if (mode === "company") {
      const compBrand = document.getElementById("filt-company")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const brand = (mat && mat.company) ? mat.company : "UNAVAILABLE";
          if (compBrand === "All" || brand === compBrand) {
            const key = brand + "|" + item.name + "|" + item.code;
            if (!groupMap[key]) {
                groupMap[key] = {
                  companyName: brand,
                  productName: item.name,
                  codeModel: item.code,
                  qty: 0,
                  amount: 0
                };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(groupMap);

      const totalQty = rows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">CompanyName</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">ProductName</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Code/Model</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.companyName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.codeModel}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="3" style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "category") {
      const selectedCat = document.getElementById("filt-category-select")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const cat = (mat && mat.category) ? mat.category : "UNAVAILABLE";

          if (selectedCat === "All" || cat === selectedCat) {
            const key = cat;
            if (!groupMap[key]) {
              groupMap[key] = {
                category: cat,
                qty: 0,
                amount: 0
              };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let groupedRows = Object.values(groupMap);

      const totalQty = groupedRows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = groupedRows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Category</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${groupedRows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.category}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty.toFixed(2)}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "product") {
      const selectedProdName = document.getElementById("filt-product-select")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const comp = (mat && mat.company) ? mat.company : "UNAVAILABLE";
          const cat = (mat && mat.category) ? mat.category : "UNAVAILABLE";

          if (selectedProdName === "All" || item.name === selectedProdName) {
            const key = item.name + "|" + item.code + "|" + comp + "|" + cat;
            if (!groupMap[key]) {
              groupMap[key] = {
                productName: item.name,
                codeModel: item.code,
                company: comp,
                category: cat,
                qty: 0,
                amount: 0
              };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(groupMap);

      const totalQty = rows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Product Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Code/Model</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Company</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Category</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.codeModel}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.company}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.category}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="4" style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "group") {
      const selGroup = document.getElementById("filt-group")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const grp = (mat && mat.productGroup) ? mat.productGroup : "UNAVAILABLE";
          if (selGroup === "All" || grp === selGroup) {
            const key = grp + "|" + item.name + "|" + item.code;
            if (!groupMap[key]) {
              groupMap[key] = {
                groupName: grp,
                productName: item.name,
                codeModel: item.code,
                qty: 0,
                amount: 0
              };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(groupMap);

      const totalQty = rows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Group Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Product Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.groupName}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="2" style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "code") {
      const selectedCode = document.getElementById("filt-code-select")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const comp = (mat && mat.company) ? mat.company : "UNAVAILABLE";

          if (selectedCode === "All" || item.code === selectedCode) {
            const key = item.code + "|" + item.name + "|" + comp;
            if (!groupMap[key]) {
              groupMap[key] = {
                codeModel: item.code,
                productName: item.name,
                companyName: comp,
                qty: 0,
                amount: 0
              };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(groupMap);

      const totalQty = rows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Code/Model</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Product Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Company Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.codeModel}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.companyName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="3" style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "billno") {
      let rows = filteredInvoices.map((inv, idx) => ({
        slNo: idx + 1,
        billNo: inv.id,
        billDate: formatDate(inv.date),
        vendorName: inv.contactName,
        billAmount: inv.total || 0
      }));

      const totalAmt = rows.reduce((s, r) => s + r.billAmount, 0);
      const avgAmt = rows.length > 0 ? (totalAmt / rows.length) : 0;

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Sl.No</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Bill No</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Bill Date</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Vendor Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Bill Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.slNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${r.billNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.vendorName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.billAmount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="4" style="padding:6px; border:1px solid #cbd5e1;">Total</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
          <tr style="background:#f1f5f9; font-weight:bold;">
            <td colspan="4" style="padding:6px; border:1px solid #cbd5e1;">Average</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${avgAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "vendor") {
      let rows = filteredInvoices.map(inv => ({
        vendorName: inv.contactName,
        billDate: formatDate(inv.date),
        billNo: inv.id,
        amount: inv.total || 0
      }));

      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Vendor Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">BillDate</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">BillNo</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.vendorName}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="3" style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Total Purchase:</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    // Default "All" Layout
    let rows = filteredInvoices.map(inv => ({
      billDate: formatDate(inv.date),
      billNo: inv.id,
      refNo: inv.refNo || "",
      vendorName: inv.contactName,
      purchaseAmount: inv.total || 0
    }));

    const totalAmt = rows.reduce((s, r) => s + r.purchaseAmount, 0);

    tableEl.innerHTML = `
      <thead>
        <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
          <th style="padding:6px; border:1px solid #cbd5e1;">Bill Date</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Bill No.</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Ref No</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Vendor Name</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Purchase Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr style="border-bottom:1px solid #cbd5e1;">
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${r.billNo}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.refNo}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.vendorName}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.purchaseAmount.toFixed(2)}</td>
          </tr>
        `).join("")}
        <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
          <td colspan="4" style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Total Purchase:</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
        </tr>
      </tbody>
    `;
  }

  // Bind radio events
  document.querySelectorAll("input[name='rep-mode']").forEach(radio => {
    radio.addEventListener("change", (e) => {
      updateMiddleFilters(e.target.value);
      renderReportGrid();
    });
  });

  // Bind view click
  document.getElementById("btn-rep-view").addEventListener("click", renderReportGrid);

  // Auto-reload on input changes
  const inputs = [dateFromEl, dateToEl];
  inputs.forEach(inp => {
    if (inp) {
      inp.addEventListener("change", renderReportGrid);
      inp.addEventListener("input", renderReportGrid);
    }
  });
  dynamicBox.addEventListener("change", renderReportGrid);
  dynamicBox.addEventListener("input", renderReportGrid);

  // Initialize
  updateMiddleFilters("all");
  renderReportGrid();
}

export function showBillwiseMarginReportModal(container) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();
  const purchases = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);

  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="margin-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1050px; width: 94vw; height:82vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div id="margin-rep-title">Purchase Wise Margin Report</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="margin-close-x-btn">&times;</button>
        </div>

        <!-- Upper Control Panel -->
        <div style="background:#b4c6e7; padding:6px; border:1px solid #8faadc; border-radius:2px; display:flex; flex-direction:column; gap:6px;">
          <!-- First row: selectors -->
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
            <fieldset style="border: 1px solid #8faadc; padding: 2px 6px; background:#d9e1f2; margin:0;">
              <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Type</legend>
              <div style="display:flex; gap:6px;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:2px;"><input type="radio" name="margin-type" value="all" checked> All</label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:2px;"><input type="radio" name="margin-type" value="cash"> Cash</label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:2px;"><input type="radio" name="margin-type" value="credit"> Credit</label>
              </div>
            </fieldset>

            <fieldset style="border: 1px solid #8faadc; padding: 2px 6px; background:#d9e1f2; margin:0;">
              <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Period</legend>
              <div style="display:flex; gap:4px; align-items:center;">
                From <input type="date" id="margin-date-from" class="form-control" style="width:115px; padding:1px 3px; font-size:0.72rem; height:20px; background:white; color:black;" value="${firstDay}">
                To <input type="date" id="margin-date-to" class="form-control" style="width:115px; padding:1px 3px; font-size:0.72rem; height:20px; background:white; color:black;" value="${lastDay}">
              </div>
            </fieldset>

            <div style="display:flex; align-items:center; gap:4px; flex-grow:1; min-width:240px;">
              <span style="font-weight:bold; font-size:0.75rem; white-space:nowrap;">Vendor Name:</span>
              <select id="margin-vendor-select" class="form-control" style="padding:2px; font-size:0.72rem; background:white; color:black; height:22px; width:100%; max-width:260px;">
                <option value="All">All</option>
                ${vendors.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
              </select>
            </div>
          </div>

          <!-- Second row: options and button actions -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px solid #cbd5e1; padding-top:4px;">
            <div style="display:flex; gap:12px; font-size:0.72rem;">
              <label style="cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:3px;"><input type="radio" name="margin-calc" value="costing" checked> Calculate Margin Percentage based on Costing Method</label>
              <label style="cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:3px;"><input type="radio" name="margin-calc" value="bill"> Calculate Margin Percentage based on Bill Amount</label>
            </div>
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn btn-secondary" id="btn-margin-show" style="padding:1px 12px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:20px; font-size:0.72rem; box-shadow:1px 1px 2px white inset;">Show</button>
              <button type="button" class="btn btn-secondary" id="btn-margin-preview" style="padding:1px 12px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:20px; font-size:0.72rem; box-shadow:1px 1px 2px white inset;">Preview</button>
              <button type="button" class="btn btn-secondary" id="btn-margin-close" style="padding:1px 12px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:20px; font-size:0.72rem; box-shadow:1px 1px 2px white inset;">Close</button>
            </div>
          </div>
        </div>

        <div style="color:#c00000; font-weight:bold; font-size:0.72rem;">
          Note: Margin will be zero if Purchase price is not mentioned for any item in the bill.<br>
          Margin is Calculated based on the Costing Method (Average/Last Purchase Price) set in Options.
        </div>

        <!-- Table view -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="margin-report-table">
            <!-- Table content -->
          </table>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("margin-report-overlay");
  const close = () => { overlay.remove(); };

  document.getElementById("margin-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-margin-close").addEventListener("click", close);
  document.getElementById("btn-margin-preview").addEventListener("click", () => window.print());

  const dateFromEl = document.getElementById("margin-date-from");
  const dateToEl = document.getElementById("margin-date-to");
  const tableEl = document.getElementById("margin-report-table");

  // Date formatter (DD/MM/YYYY)
  function formatDate(dStr) {
    return formatDateDisplay(dStr);
  }

  function renderMarginGrid() {
    const fromDate = dateFromEl.value;
    const toDate = dateToEl.value;
    const type = document.querySelector("input[name='margin-type']:checked").value;
    const calcMethod = document.querySelector("input[name='margin-calc']:checked").value;
    const selectedCust = document.getElementById("margin-vendor-select").value;

    // Filter purchases
    let filtered = purchases.filter(inv => {
      if (inv.isCancelled) return false;
      let ok = true;
      if (fromDate) ok = ok && (inv.date >= fromDate);
      if (toDate) ok = ok && (inv.date <= toDate);
      if (selectedCust !== "All") ok = ok && (inv.contactId === selectedCust);
      
      // cash vs credit check
      if (type === "cash") {
        ok = ok && (inv.paidAmount > 0 || String(inv.status).toLowerCase() === "paid");
      } else if (type === "credit") {
        ok = ok && (inv.paidAmount === 0 || String(inv.status).toLowerCase() === "unpaid");
      }
      return ok;
    });

    // Update title dates dynamically
    document.getElementById("margin-rep-title").textContent = `Purchase Wise Margin Report (${formatDate(fromDate)} To ${formatDate(toDate)})`;

    let rows = [];
    filtered.forEach((inv, idx) => {
      let billMargin = 0;
      let costSum = 0;
      
      inv.items.forEach(item => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : 0;
        
        // Selling Price (without adjustment or GST) after discount:
        const basePrice = parseFloat(item.amount) || (item.quantity * item.price);
        const itemDiscount = parseFloat(item.discountAmount) || 0;
        const sellingPrice = parseFloat(item.netValue) || (basePrice - itemDiscount);
        const itemCost = purchaseCost * item.quantity;
        const itemMargin = sellingPrice - itemCost;
        
        billMargin += itemMargin;
        costSum += itemCost;
      });

      const billAmt = inv.total || 0;
      
      // Calculate Margin% based on radio setting
      let marginPct = 0;
      if (calcMethod === "costing") {
        marginPct = costSum > 0 ? (billMargin / costSum * 100) : 0;
      } else {
        marginPct = billAmt > 0 ? (billMargin / billAmt * 100) : 0;
      }

      rows.push({
        date: formatDate(inv.date),
        slNo: idx + 1,
        billNo: inv.id,
        vendorName: inv.contactName,
        billAmt: billAmt,
        margin: billMargin,
        marginPct: marginPct,
        costSum: costSum
      });
    });

    const totalBillAmt = rows.reduce((s, r) => s + r.billAmt, 0);
    const totalMargin = rows.reduce((s, r) => s + r.margin, 0);
    const totalCost = rows.reduce((s, r) => s + r.costSum, 0);

    let totalMarginPct = 0;
    if (calcMethod === "costing") {
      totalMarginPct = totalCost > 0 ? (totalMargin / totalCost * 100) : 0;
    } else {
      totalMarginPct = totalBillAmt > 0 ? (totalMargin / totalBillAmt * 100) : 0;
    }

    tableEl.innerHTML = `
      <thead>
        <tr style="background-color:#507255; color:white; font-weight:bold; position:sticky; top:0;">
          <th style="padding:6px; border:1px solid #cbd5e1; width: 120px;">Date</th>
          <th style="padding:6px; border:1px solid #cbd5e1; width: 60px;">Sl.No</th>
          <th style="padding:6px; border:1px solid #cbd5e1; width: 100px;">Bill No</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Vendor Name</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width: 150px;">Bill Amt</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width: 150px;">Margin</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width: 120px;">Margin%</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr tabindex="0" data-bill-no="${r.billNo || ''}" data-cust-name="${r.vendorName}" data-date="${r.date}" style="border-bottom:1px solid #cbd5e1; cursor:pointer; transition: background-color 0.1s; outline:none;">
            <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:bold;">${r.date}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:center;">${r.slNo}</td>
            <td class="td-bill-no" style="padding:4px 6px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; color:#1e3b8b;">${r.billNo || ''}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.vendorName}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.billAmt.toFixed(2)}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.margin.toFixed(2)}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.marginPct.toFixed(2)}</td>
          </tr>
        `).join("")}
        <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
          <td colspan="4" style="padding:6px; border:1px solid #cbd5e1; text-align:center;">Total</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalBillAmt.toFixed(2)}</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalMargin.toFixed(2)}</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalMarginPct.toFixed(2)} %</td>
        </tr>
      </tbody>
    `;

    // Bind row interactive clicks and keyboard controls
    const tbody = tableEl.querySelector("tbody");
    if (tbody) {
      tbody.querySelectorAll("tr[data-date]").forEach(tr => {
        const handleSelect = () => {
          tbody.querySelectorAll("tr[data-date]").forEach(r => {
            r.style.backgroundColor = "";
            r.style.color = "";
            const tdBill = r.querySelector(".td-bill-no");
            if (tdBill) tdBill.style.color = "#1e3b8b";
          });
          tr.style.backgroundColor = "#1e3b8b";
          tr.style.color = "white";
          const tdBill = tr.querySelector(".td-bill-no");
          if (tdBill) tdBill.style.color = "white";
          tr.focus();
        };

        const handleOpen = () => {
          const billNo = tr.getAttribute("data-bill-no");
          const custName = tr.getAttribute("data-cust-name");
          const date = tr.getAttribute("data-date");
          showInvoiceDetailPopup(billNo, custName, date);
        };

        tr.addEventListener("click", handleSelect);
        tr.addEventListener("dblclick", handleOpen);
        tr.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSelect();
            handleOpen();
          }
        });
      });
    }
  }

  document.getElementById("btn-margin-show")?.addEventListener("click", renderMarginGrid);

  const marginFrom = document.getElementById("margin-date-from");
  const marginTo = document.getElementById("margin-date-to");
  if (marginFrom) {
    marginFrom.addEventListener("change", renderMarginGrid);
    marginFrom.addEventListener("input", renderMarginGrid);
  }
  if (marginTo) {
    marginTo.addEventListener("change", renderMarginGrid);
    marginTo.addEventListener("input", renderMarginGrid);
  }
  renderMarginGrid();
}

export function showProductwiseMarginReportModal(container) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();
  const purchases = state.getPurchases();

  const uniqueProducts = [...new Set(materials.map(m => m.name).filter(Boolean))];

  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="prod-margin-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1150px; width: 95vw; height:85vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #2e593a 0%, #4c8a5a 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div id="prod-margin-rep-title" style="letter-spacing:0.02em;">PRODUCTWISE MARGIN</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="prod-margin-close-x-btn">&times;</button>
        </div>

        <!-- Upper Control Panel -->
        <div style="background:#b4c6e7; padding:6px; border:1px solid #8faadc; border-radius:2px; display:flex; flex-direction:column; gap:6px;">
          <!-- First row: selectors -->
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
            <fieldset style="border: 1px solid #8faadc; padding: 2px 6px; background:#d9e1f2; margin:0;">
              <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Date Range</legend>
              <div style="display:flex; gap:4px; align-items:center;">
                From <input type="date" id="prod-margin-date-from" class="form-control" style="width:115px; padding:1px 3px; font-size:0.72rem; height:20px; background:white; color:black;" value="${firstDay}">
                To <input type="date" id="prod-margin-date-to" class="form-control" style="width:115px; padding:1px 3px; font-size:0.72rem; height:20px; background:white; color:black;" value="${lastDay}">
              </div>
            </fieldset>

            <div style="display:flex; align-items:center; gap:6px; flex-grow:1; min-width:240px;">
              <span style="font-weight:bold; font-size:0.75rem; white-space:nowrap;">Select Product:</span>
              <select id="prod-margin-product-select" class="form-control" style="padding:2px; font-size:0.72rem; background:white; color:black; height:22px; width:100%; max-width:280px;">
                <option value="All">All</option>
                ${uniqueProducts.map(p => `<option value="${p}">${p}</option>`).join("")}
              </select>
            </div>
          </div>

          <!-- Second row: options and button actions -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px solid #cbd5e1; padding-top:4px;">
            <div style="display:flex; gap:12px; font-size:0.72rem;">
              <label style="cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:3px;"><input type="radio" name="prod-margin-calc" value="costing" checked> Calculate Margin Percentage based on Costing Method</label>
              <label style="cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:3px;"><input type="radio" name="prod-margin-calc" value="amount"> Calculate Margin Percentage based on Amount</label>
            </div>
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn btn-secondary" id="btn-prod-margin-view" style="padding:1px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:20px; font-size:0.72rem; box-shadow:1px 1px 2px white inset;">View</button>
              <button type="button" class="btn btn-secondary" id="btn-prod-margin-print" style="padding:1px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:20px; font-size:0.72rem; box-shadow:1px 1px 2px white inset;">Print</button>
              <button type="button" class="btn btn-secondary" id="btn-prod-margin-close" style="padding:1px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:20px; font-size:0.72rem; box-shadow:1px 1px 2px white inset;">Close</button>
            </div>
          </div>
        </div>

        <!-- Table view -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="prod-margin-report-table">
            <!-- Table content -->
          </table>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("prod-margin-report-overlay");
  const close = () => { overlay.remove(); };

  document.getElementById("prod-margin-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-prod-margin-close").addEventListener("click", close);
  document.getElementById("btn-prod-margin-print").addEventListener("click", () => window.print());

  const dateFromEl = document.getElementById("prod-margin-date-from");
  const dateToEl = document.getElementById("prod-margin-date-to");
  const tableEl = document.getElementById("prod-margin-report-table");

  function renderProdMarginGrid() {
    const fromDate = dateFromEl.value;
    const toDate = dateToEl.value;
    const calcMethod = document.querySelector("input[name='prod-margin-calc']:checked").value;
    const selectedProd = document.getElementById("prod-margin-product-select").value;

    // Filter purchases by Date Range
    let filteredInvoices = purchases.filter(inv => {
      let ok = true;
      if (fromDate) ok = ok && (inv.date >= fromDate);
      if (toDate) ok = ok && (inv.date <= toDate);
      return ok;
    });

    // We map every line item in the filtered purchases matching the selected product name
    let itemsMap = {};
    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (selectedProd !== "All" && item.name !== selectedProd) return;

        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        const comp = (mat && mat.company) ? mat.company : "UNAVAILABLE";
        const cat = (mat && mat.category) ? mat.category : "UNAVAILABLE";
        const subcat = (mat && mat.subCategory) ? mat.subCategory : "UNAVAILABLE";
        const unit = (mat && mat.unit) ? mat.unit : "Nos";

        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : 0;
        
        const basePrice = parseFloat(item.amount) || (item.quantity * item.price);
        const itemDiscount = parseFloat(item.discountAmount) || 0;
        const sellingPrice = parseFloat(item.netValue) || (basePrice - itemDiscount);
        const itemCost = purchaseCost * item.quantity;
        const itemMargin = sellingPrice - itemCost;

        const key = `${item.name}-${item.code}-${comp}`;
        if (!itemsMap[key]) {
          itemsMap[key] = {
            productName: item.name,
            code: item.code,
            company: comp,
            category: cat,
            subCategory: subcat,
            unit: unit,
            qty: 0,
            amount: 0,
            marginAmt: 0,
            costSum: 0
          };
        }

        itemsMap[key].qty += item.quantity;
        itemsMap[key].amount += sellingPrice;
        itemsMap[key].marginAmt += itemMargin;
        itemsMap[key].costSum += itemCost;
      });
    });

    const rows = Object.values(itemsMap);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
    const totalMargin = rows.reduce((s, r) => s + r.marginAmt, 0);
    const totalCost = rows.reduce((s, r) => s + r.costSum, 0);

    let totalMarginPct = 0;
    if (calcMethod === "costing") {
      totalMarginPct = totalCost > 0 ? (totalMargin / totalCost * 100) : 0;
    } else {
      totalMarginPct = totalAmount > 0 ? (totalMargin / totalAmount * 100) : 0;
    }

    tableEl.innerHTML = `
      <thead>
        <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
          <th style="padding:6px; border:1px solid #cbd5e1;">Product Name</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Company</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Category</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Sub Category</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width:90px;">Qty</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width:130px;">Amount</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width:130px;">Margin Amt</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width:110px;">Margin %</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          let marginPct = 0;
          if (calcMethod === "costing") {
            marginPct = r.costSum > 0 ? (r.marginAmt / r.costSum * 100) : 0;
          } else {
            marginPct = r.amount > 0 ? (r.marginAmt / r.amount * 100) : 0;
          }
          return `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:500;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.company}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.category}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.subCategory}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty} ${r.unit}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.marginAmt.toFixed(2)}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${marginPct.toFixed(2)}</td>
            </tr>
          `;
        }).join("")}
        <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
          <td colspan="5" style="padding:6px; border:1px solid #cbd5e1;">TOTAL</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmount.toFixed(2)}</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalMargin.toFixed(2)}</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalMarginPct.toFixed(2)}</td>
        </tr>
      </tbody>
    `;
  }

  document.getElementById("btn-prod-margin-view")?.addEventListener("click", renderProdMarginGrid);

  const prodMarginFrom = document.getElementById("prod-margin-date-from");
  const prodMarginTo = document.getElementById("prod-margin-date-to");
  if (prodMarginFrom) {
    prodMarginFrom.addEventListener("change", renderProdMarginGrid);
    prodMarginFrom.addEventListener("input", renderProdMarginGrid);
  }
  if (prodMarginTo) {
    prodMarginTo.addEventListener("change", renderProdMarginGrid);
    prodMarginTo.addEventListener("input", renderProdMarginGrid);
  }
  renderProdMarginGrid();
}

export function showInvoiceDetailPopup(billNo, fallbackCustName, fallbackDate) {
  const purchases = state.getPurchases();
  let inv = null;

  if (billNo) {
    // Try exact match
    inv = purchases.find(i => 
      String(i.id).toLowerCase() === String(billNo).toLowerCase() ||
      (i.voucherNo && String(i.voucherNo).toLowerCase() === String(billNo).toLowerCase())
    );

    // Fallback to substring matching
    if (!inv) {
      inv = purchases.find(i => 
        String(i.id).toLowerCase().includes(String(billNo).toLowerCase()) ||
        String(billNo).toLowerCase().includes(String(i.id).toLowerCase())
      );
    }
  }

  // Fallback match using vendor name and date if billNo search fails
  if (!inv && fallbackCustName && fallbackDate) {
    let parsedDate = fallbackDate;
    const monthsMap = {
      "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
      "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
    };
    const parts = fallbackDate.split("-");
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = monthsMap[parts[1].toLowerCase()] || "01";
      const y = parts[2];
      parsedDate = `${y}-${m}-${d}`;
    }

    inv = purchases.find(i => 
      String(i.contactName).toLowerCase() === String(fallbackCustName).toLowerCase() &&
      String(i.date) === String(parsedDate)
    );
  }

  if (!inv) {
    alert(`Bill details not found!`);
    return;
  }

  // Load the actual purchase bill window modal
  import("./transactions.js").then(m => {
    const vendors = state.getContacts().filter(c => c.type === "supplier" || c.listInVendorList === true);
    const materials = state.getMaterials();
    const windowContentEl = document.getElementById("window-content-area") || document.body;
    
    m.showRecordPurchaseModal(windowContentEl, invoice, () => {
      // Re-trigger show on the margin report grid to sync updated figures
      const btnShow = document.getElementById("btn-margin-show");
      if (btnShow) btnShow.click();
    }, inv);
  }).catch(err => {
    console.error("Failed to load invoice editor modal", err);
  });
}













export function showCategoryWisePurchaseReportModal(container) {
  const root = document.getElementById("modal-container-root") || container;
  const materials = state.getMaterials();
  const invoices = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);

  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];
  const subCategories = [...new Set(materials.map(m => m.subCategory || "All").filter(Boolean))];
  
  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = `
    <div class="modal-overlay active" id="category-wise-purchase-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <style>
        .cat-pur-rep-hide-gst .col-gst { display: none !important; }
        .cat-pur-rep-hide-margin .col-margin { display: none !important; }
      </style>
      <div class="modal-container modal-lg" style="width: 80vw; height:80vh; max-width:1400px; background-color:#dbeafe; color:#0f172a; padding:8px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-chart-bar"></i> CATEGORY WISE PURCHASE REPORT</div>
          <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="cat-pur-rep-close-icon">&times;</button>
        </div>

        <!-- Toolbar area -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; background:#b4c6e7; padding:8px; border:1px solid #8faadc; border-radius:2px;">
          
          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">From:</label>
            <input type="date" id="cat-pur-rep-date-from" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${firstDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">To:</label>
            <input type="date" id="cat-pur-rep-date-to" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${lastDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Category Name:</label>
            <select id="cat-pur-rep-cat" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Sub Category Name:</label>
            <select id="cat-pur-rep-subcat" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${subCategories.map(sc => `<option value="${sc}">${sc}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Tax:</label>
            <select id="cat-pur-rep-tax" class="form-control" style="width:80px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Vendor Name:</label>
            <select id="cat-pur-rep-cust" class="form-control" style="width:180px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${vendors.map(c => `<option value="${c.name}">${c.name}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; margin-left:10px; justify-content:center; padding-bottom: 2px;">
            <label style="font-size:0.75rem; font-weight:bold; display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="cat-pur-rep-hide-gst"> Hide GST Column
            </label>
            <label style="font-size:0.75rem; font-weight:bold; display:none; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="cat-pur-rep-hide-margin"> Hide Margin Column
            </label>
          </div>

          <div style="font-weight:bold; font-size:1rem; color:blue; margin-left:auto; margin-bottom:4px;" id="cat-pur-rep-total-amt">
            Total Amt: 0.00
          </div>

          <div style="display:flex; gap:6px; margin-bottom:2px;">
            <button type="button" class="btn btn-secondary" id="btn-cat-pur-rep-view" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-cat-pur-rep-print" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print</button>
            <button type="button" class="btn btn-secondary" id="btn-cat-pur-rep-close" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Close</button>
          </div>
        </div>

        <!-- Table View -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; overflow-x:auto; border-radius:2px;" id="print-area-cat-rep">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black; white-space:nowrap;" id="cat-pur-rep-table">
            <thead>
              <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill No</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill Date</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Vendor</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Product</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Discount</th>
                <th class="col-gst" style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">GST</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Total</th>
                
              </tr>
            </thead>
            <tbody id="cat-pur-rep-tbody">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;
  const overlayEl = tempDiv.firstElementChild;
  root.appendChild(overlayEl);

  const overlay = document.getElementById("category-wise-purchase-report-overlay");
  const close = () => { overlay.remove(); };

  overlayEl.querySelector("#cat-pur-rep-close-icon").addEventListener("click", close);
  overlayEl.querySelector("#btn-cat-pur-rep-close").addEventListener("click", close);

  // Toggle column visibility
  overlayEl.querySelector("#cat-pur-rep-hide-gst").addEventListener("change", (e) => {
    const tbl = overlayEl.querySelector("#cat-pur-rep-table");
    if (e.target.checked) tbl.classList.add("cat-pur-rep-hide-gst");
    else tbl.classList.remove("cat-pur-rep-hide-gst");
  });
  
  overlayEl.querySelector("#cat-pur-rep-hide-margin").addEventListener("change", (e) => {
    const tbl = overlayEl.querySelector("#cat-pur-rep-table");
    if (e.target.checked) tbl.classList.add("cat-pur-rep-hide-margin");
    else tbl.classList.remove("cat-pur-rep-hide-margin");
  });

  overlayEl.querySelector("#btn-cat-pur-rep-print").addEventListener("click", () => {
    const printContent = overlayEl.querySelector("#print-area-cat-rep").innerHTML;
    const hideGst = overlayEl.querySelector("#cat-pur-rep-hide-gst").checked;
    const hideMargin = overlayEl.querySelector("#cat-pur-rep-hide-margin").checked;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>CATEGORY WISE PURCHASE REPORT</title>
          <style>
            body { font-family: sans-serif; font-size: 0.8rem; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background-color: #f0f0f0; }
            ${hideGst ? '.col-gst { display: none !important; }' : ''}
            ${hideMargin ? '.col-margin { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <h2>Category Wise Purchase Report</h2>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });

  const btnView = overlayEl.querySelector("#btn-cat-pur-rep-view");
  const tbody = overlayEl.querySelector("#cat-pur-rep-tbody");
  const lblTotalAmt = overlayEl.querySelector("#cat-pur-rep-total-amt");

  btnView.addEventListener("click", () => {
    const fFrom = overlayEl.querySelector("#cat-pur-rep-date-from").value;
    const fTo = overlayEl.querySelector("#cat-pur-rep-date-to").value;
    const fCat = overlayEl.querySelector("#cat-pur-rep-cat").value;
    const fSubCat = overlayEl.querySelector("#cat-pur-rep-subcat").value;
    const fTax = overlayEl.querySelector("#cat-pur-rep-tax").value;
    const fCust = overlayEl.querySelector("#cat-pur-rep-cust").value;

    // Filter invoices by date
    const filteredInvoices = invoices.filter(inv => {
      let ok = true;
      if (fFrom) ok = ok && (inv.date >= fFrom);
      if (fTo) ok = ok && (inv.date <= fTo);
      return ok;
    });

    let groupedData = {};
    let gTotalTax = 0;
    let gTotalAdj = 0;
    let gTotalAmount = 0;
    let gTotalMargin = 0;

    filteredInvoices.forEach(inv => {
      // Check vendor filter
      if (fCust !== "All" && inv.contactName !== fCust) return;
      
      let billAdj = parseFloat(inv.adjustments) || 0;
      if (inv.adjustmentsList && inv.adjustmentsList.length > 0) {
          billAdj = inv.adjustmentsList.reduce((acc, a) => acc + (a.type === "Add" ? parseFloat(a.amount) : -parseFloat(a.amount)), 0);
      }
      // If we don't have adjustmentsList or adjustments, check shipping (some users call this adjustment)
      if (billAdj === 0) billAdj = parseFloat(inv.shipping) || 0;

      inv.items.forEach((item, index) => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        if (!mat) return;

        if (fCat !== "All" && mat.category !== fCat) return;
        if (fSubCat !== "All" && mat.subCategory !== fSubCat) return;
        
        let itemTaxPercent = parseFloat(item.gstPercent || item.taxPercent || mat.taxPercent || inv.taxRate || 0);
        
        if (fTax !== "All" && itemTaxPercent !== parseFloat(fTax)) return;

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const discountVal = parseFloat(item.discountAmount || 0);
        
        // Exclusive purchase amount (after discount, before tax)
        let exclusiveAmt = parseFloat(item.netValue || item.amount || ((qty * rate) - discountVal));
        
        // GST Calculation
        let taxVal = parseFloat(item.gstAmount || item.taxAmount || 0);
        if (taxVal === 0 && itemTaxPercent > 0) {
            taxVal = exclusiveAmt * (itemTaxPercent / 100);
        }
        
        // Inclusive Total Amount
        let inclusiveAmt = parseFloat(item.netAmount || (exclusiveAmt + taxVal));
        
        const finalItemTotal = inclusiveAmt;

        // Margin Calculation: Exactly matching showBillwiseMarginReportModal
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : (parseFloat(mat?.purchaseRate) || 0);

        const basePrice = parseFloat(item.amount) || (qty * rate);
        const itemDiscount = parseFloat(item.discountAmount) || 0;
        const sellingPrice = parseFloat(item.netValue) || (basePrice - itemDiscount);
        
        const itemCost = purchaseCost * qty;
        let margin = sellingPrice - itemCost;

        if (!groupedData[inv.id]) {
          groupedData[inv.id] = {
            billNo: inv.id,
            billDate: inv.date,
            vendor: inv.contactName,
            items: [],
            totalTax: 0,
            totalAmt: 0,
            totalMargin: 0
          };
        }

        groupedData[inv.id].items.push({
          product: item.name,
          qty: `${qty} ${mat.unit || ''}`.trim(),
          rate: rate.toFixed(2),
          discount: discountVal.toFixed(2),
          tax: taxVal.toFixed(2),
          total: finalItemTotal.toFixed(2),
          margin: margin.toFixed(2)
        });

        groupedData[inv.id].totalTax += taxVal;
        groupedData[inv.id].totalAmt += finalItemTotal;
        groupedData[inv.id].totalMargin += margin;

        gTotalTax += taxVal;
        gTotalAmount += finalItemTotal;
        gTotalMargin += margin;
      });
    });

    let html = "";
    Object.values(groupedData).forEach((group, idx) => {
        const bg = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
        group.items.forEach((it, i) => {
            html += `
            <tr style="background:${bg}; cursor:pointer;" class="cat-pur-rep-row" data-billno="${group.billNo}">
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billNo : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billDate : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.vendor : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.product}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.qty}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.rate}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.discount}</td>
              <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.tax}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.total}</td>
            </tr>
            `;
        });
    });

    // Grand Total
    html += `
    <tr style="background:#cbd5e1; font-weight:bold; font-size:0.9rem;">
      <td colspan="7" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right;">G.Total</td>
      <td class="col-gst" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#166534;">${gTotalTax.toFixed(2)}</td>
      <td style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#1e3b8b;">${gTotalAmount.toFixed(2)}</td>
    </tr>
    `;

    tbody.innerHTML = html;
    lblTotalAmt.textContent = `Total Amt: ${gTotalAmount.toFixed(2)}`;

    // Attach double click to open invoice
    overlayEl.querySelectorAll(".cat-pur-rep-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const bNo = row.getAttribute("data-billno");
        const invoice = invoices.find(inv => String(inv.id) === String(bNo));
        if (invoice) {
           import("./transactions.js").then(m => {
             m.showRecordPurchaseModal(container, invoice);
           });
        }
      });
    });
  });

  // Auto-reload on dropdown/input changes
  overlayEl.querySelectorAll(".form-control, select, input").forEach(input => {
    input.addEventListener("change", () => btnView.click());
    input.addEventListener("input", () => btnView.click());
  });

  // trigger view initially
  btnView.click();
}

export function showVendorWisePurchaseReportModal(container) {
  const root = document.getElementById("modal-container-root") || container;
  const materials = state.getMaterials();
  const invoices = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);


  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = `
    <div class="modal-overlay active" id="vendor-wise-purchase-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <style>
        .ven-pur-rep-hide-gst .col-gst { display: none !important; }
        .ven-pur-rep-hide-margin .col-margin { display: none !important; }
      </style>
      <div class="modal-container modal-lg" style="width: 80vw; height:80vh; max-width:1400px; background-color:#dbeafe; color:#0f172a; padding:8px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-chart-bar"></i> VENDOR WISE PURCHASE REPORT</div>
          <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="ven-pur-rep-close-icon">&times;</button>
        </div>

        <!-- Toolbar area -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; background:#b4c6e7; padding:8px; border:1px solid #8faadc; border-radius:2px;">
          
          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">From:</label>
            <input type="date" id="ven-pur-rep-date-from" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${firstDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">To:</label>
            <input type="date" id="ven-pur-rep-date-to" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${lastDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Vendor Name:</label>
            <select id="ven-pur-rep-cust" class="form-control" style="width:180px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${vendors.map(c => `<option value="${c.name}">${c.name}</option>`).join("")}
            </select>
          </div>



          <div style="font-weight:bold; font-size:1rem; color:blue; margin-left:auto; margin-bottom:4px;" id="ven-pur-rep-total-amt">
            Total Amt: 0.00
          </div>

          <div style="display:flex; gap:6px; margin-bottom:2px;">
            <button type="button" class="btn btn-secondary" id="btn-ven-pur-rep-view" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-ven-pur-rep-print" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print</button>
            <button type="button" class="btn btn-secondary" id="btn-ven-pur-rep-close" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Close</button>
          </div>
        </div>

        <!-- Table View -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; overflow-x:auto; border-radius:2px;" id="print-area-cust-rep">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black; white-space:nowrap;" id="ven-pur-rep-table">
            <thead>
              <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill No</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill Date</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Vendor</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Product</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Model</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Discount</th>
                <th class="col-gst" style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">GST</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Total</th>

              </tr>
            </thead>
            <tbody id="ven-pur-rep-tbody">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>

        <!-- Product Summary (visible only when a vendor is selected) -->
        <div id="ven-pur-rep-product-summary" style="display:none; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px; max-height:200px; padding:4px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="ven-pur-rep-summary-table">
            <thead>
              <tr style="background-color:#1e3a8a; color:white; font-weight:bold; position:sticky; top:0;">
                <th style="padding:4px 6px; border:1px solid #cbd5e1;">Product Name</th>
                <th style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">Total Qty</th>
                <th style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">Total Amount</th>
              </tr>
            </thead>
            <tbody id="ven-pur-rep-summary-tbody"></tbody>
          </table>
        </div>

      </div>
    </div>
  `;
  const overlayEl = tempDiv.firstElementChild;
  root.appendChild(overlayEl);

  const overlay = document.getElementById("vendor-wise-purchase-report-overlay");
  const close = () => { overlay.remove(); };

  overlayEl.querySelector("#ven-pur-rep-close-icon").addEventListener("click", close);
  overlayEl.querySelector("#btn-ven-pur-rep-close").addEventListener("click", close);



  overlayEl.querySelector("#btn-ven-pur-rep-print").addEventListener("click", () => {
    const printContent = overlayEl.querySelector("#print-area-cust-rep").innerHTML;
    const hideGst = false;
    const hideMargin = false;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>VENDOR WISE PURCHASE REPORT</title>
          <style>
            body { font-family: sans-serif; font-size: 0.8rem; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background-color: #f0f0f0; }
            ${hideGst ? '.col-gst { display: none !important; }' : ''}
            ${hideMargin ? '.col-margin { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <h2>Vendor Wise Purchase Report</h2>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });

  const btnView = overlayEl.querySelector("#btn-ven-pur-rep-view");
  const tbody = overlayEl.querySelector("#ven-pur-rep-tbody");
  const lblTotalAmt = overlayEl.querySelector("#ven-pur-rep-total-amt");

  btnView.addEventListener("click", () => {
    const fFrom = overlayEl.querySelector("#ven-pur-rep-date-from").value;
    const fTo = overlayEl.querySelector("#ven-pur-rep-date-to").value;
    const fCust = overlayEl.querySelector("#ven-pur-rep-cust").value;


    // Filter invoices by date
    const filteredInvoices = invoices.filter(inv => {
      let ok = true;
      if (fFrom) ok = ok && (inv.date >= fFrom);
      if (fTo) ok = ok && (inv.date <= fTo);
      return ok;
    });

    let groupedData = {};
    let gTotalTax = 0;
    let gTotalAmount = 0;
    let gTotalMargin = 0;

    filteredInvoices.forEach(inv => {
      // Check vendor filter
      if (fCust !== "All" && inv.contactName !== fCust) return;

      
      inv.items.forEach((item, index) => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        if (!mat) return;
        
        let itemTaxPercent = parseFloat(item.gstPercent || item.taxPercent || mat.taxPercent || inv.taxRate || 0);

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const discountVal = parseFloat(item.discountAmount || 0);
        
        // Exclusive purchase amount
        let exclusiveAmt = parseFloat(item.netValue || item.amount || ((qty * rate) - discountVal));
        
        // GST Calculation
        let taxVal = parseFloat(item.gstAmount || item.taxAmount || 0);
        if (taxVal === 0 && itemTaxPercent > 0) {
            taxVal = exclusiveAmt * (itemTaxPercent / 100);
        }
        
        let inclusiveAmt = parseFloat(item.netAmount || (exclusiveAmt + taxVal));
        
        const finalItemTotal = inclusiveAmt;

        // Margin
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : (parseFloat(mat?.purchaseRate) || 0);

        const basePrice = parseFloat(item.amount) || (qty * rate);
        const itemDiscount = parseFloat(item.discountAmount) || 0;
        const sellingPrice = parseFloat(item.netValue) || (basePrice - itemDiscount);
        
        const itemCost = purchaseCost * qty;
        let margin = sellingPrice - itemCost;

        if (!groupedData[inv.id]) {
          groupedData[inv.id] = {
            billNo: inv.id,
            billDate: inv.date,
            vendor: inv.contactName,
            purchaseMan: inv.purchaseMan || '',
            items: [],
            totalTax: 0,
            totalAmt: 0,
            totalMargin: 0
          };
        }

        groupedData[inv.id].items.push({
          product: item.name,
          model: mat.code || mat.model || "",
          qty: `${qty} ${mat.unit || ''}`.trim(),
          rate: rate.toFixed(2),
          discount: discountVal.toFixed(2),
          tax: taxVal.toFixed(2),
          total: finalItemTotal.toFixed(2),
          margin: margin.toFixed(2)
        });

        groupedData[inv.id].totalTax += taxVal;
        groupedData[inv.id].totalAmt += finalItemTotal;
        groupedData[inv.id].totalMargin += margin;

        gTotalTax += taxVal;
        gTotalAmount += finalItemTotal;
        gTotalMargin += margin;
      });
      


    });

    let html = "";
    Object.values(groupedData).forEach((group, idx) => {
        const bg = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
        group.items.forEach((it, i) => {
            html += `
            <tr style="background:${bg}; cursor:pointer;" class="ven-pur-rep-row" data-billno="${group.billNo}">
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billNo : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billDate : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.vendor : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.product}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.model}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.qty}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.rate}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.discount}</td>
              <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.tax}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.total}</td>

            </tr>
            `;
        });
        
        // Bill Total Row
        html += `
        <tr style="background:#e2e8f0; font-weight:bold;">
          <td colspan="8" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">Total</td>
          <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right; color:#166534;">${group.totalTax.toFixed(2)}</td>
          <td style="padding:4px; border:1px solid #cbd5e1; text-align:right; color:#1e3b8b;">${group.totalAmt.toFixed(2)}</td>

        </tr>
        `;
    });

    // Grand Total
    html += `
    <tr style="background:#cbd5e1; font-weight:bold; font-size:0.9rem;">
      <td colspan="8" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right;">G.Total</td>
      <td class="col-gst" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#166534;">${gTotalTax.toFixed(2)}</td>
      <td style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#1e3b8b;">${gTotalAmount.toFixed(2)}</td>

    </tr>
    `;

    tbody.innerHTML = html;
    lblTotalAmt.textContent = `Total Amt: ${gTotalAmount.toFixed(2)}`;

    // Product summary (only when a specific vendor is selected)
    const summaryDiv = overlayEl.querySelector("#ven-pur-rep-product-summary");
    const summaryTbody = overlayEl.querySelector("#ven-pur-rep-summary-tbody");
    if (fCust !== "All") {
      const productMap = {};
      filteredInvoices.forEach(inv => {
        if (inv.contactName !== fCust) return;
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          if (!mat) return;
          const pName = item.name || mat.name || "Unknown";
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.price) || 0;
          const discountVal = parseFloat(item.discountAmount || 0);
          let exclusiveAmt = parseFloat(item.netValue || item.amount || ((qty * rate) - discountVal));
          let taxVal = parseFloat(item.gstAmount || item.taxAmount || 0);
          let itemTaxPercent = parseFloat(item.gstPercent || item.taxPercent || mat.taxPercent || inv.taxRate || 0);
          if (taxVal === 0 && itemTaxPercent > 0) taxVal = exclusiveAmt * (itemTaxPercent / 100);
          let total = parseFloat(item.netAmount || (exclusiveAmt + taxVal));
          if (!productMap[pName]) productMap[pName] = { qty: 0, amount: 0 };
          productMap[pName].qty += qty;
          productMap[pName].amount += total;
        });
      });
      let sHtml = "";
      Object.entries(productMap).forEach(([name, data], idx) => {
        const bg = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
        sHtml += `<tr style="background:${bg}"><td style="padding:4px 6px; border:1px solid #cbd5e1;">${name}</td><td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${data.qty}</td><td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${data.amount.toFixed(2)}</td></tr>`;
      });
      summaryTbody.innerHTML = sHtml;
      summaryDiv.style.display = "block";
    } else {
      summaryDiv.style.display = "none";
      summaryTbody.innerHTML = "";
    }

    // Attach double click to open invoice
    overlayEl.querySelectorAll(".ven-pur-rep-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const bNo = row.getAttribute("data-billno");
        const invoice = invoices.find(inv => String(inv.id) === String(bNo));
        if (invoice) {
           import("./transactions.js").then(m => {
             m.showRecordPurchaseModal(container, invoice);
           });
        }
      });
    });
  });

  // Auto-reload on dropdown/input changes
  overlayEl.querySelectorAll(".form-control, select, input").forEach(input => {
    input.addEventListener("change", () => btnView.click());
    input.addEventListener("input", () => btnView.click());
  });

  // trigger view initially
  btnView.click();
}
export function showProductGroupWisePurchaseReportModal(container) {
  const root = document.getElementById("modal-container-root") || container;
  const materials = state.getMaterials();
  const invoices = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);
  const groups = [...new Set(materials.map(m => m.productGroup).filter(Boolean))];
  const purchaseMen = [...new Set(invoices.map(i => i.purchaseMan).filter(Boolean))];

  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = `
    <div class="modal-overlay active" id="product-group-wise-purchase-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <style>
        .grp-pur-rep-hide-gst .col-gst { display: none !important; }
        .grp-pur-rep-hide-margin .col-margin { display: none !important; }
      </style>
      <div class="modal-container modal-lg" style="width: 80vw; height:80vh; max-width:1400px; background-color:#dbeafe; color:#0f172a; padding:8px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-chart-bar"></i> PRODUCT GROUP WISE PURCHASE REPORT</div>
          <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="grp-pur-rep-close-icon">&times;</button>
        </div>

        <!-- Toolbar area -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; background:#b4c6e7; padding:8px; border:1px solid #8faadc; border-radius:2px;">
          
          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">From:</label>
            <input type="date" id="grp-pur-rep-date-from" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${firstDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">To:</label>
            <input type="date" id="grp-pur-rep-date-to" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${lastDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Product Group:</label>
            <select id="grp-pur-rep-group" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${groups.map(g => `<option value="${g}">${g}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Vendor Name:</label>
            <select id="grp-pur-rep-cust" class="form-control" style="width:180px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${vendors.map(c => `<option value="${c.name}">${c.name}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Purchase Man:</label>
            <select id="grp-pur-rep-purchaseman" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${purchaseMen.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; margin-left:10px; justify-content:center; padding-bottom: 2px;">
            <label style="font-size:0.75rem; font-weight:bold; display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="grp-pur-rep-hide-gst"> Hide GST Column
            </label>
            <label style="font-size:0.75rem; font-weight:bold; display:none; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="grp-pur-rep-hide-margin"> Hide Margin Column
            </label>
          </div>

          <div style="font-weight:bold; font-size:1rem; color:blue; margin-left:auto; margin-bottom:4px;" id="grp-pur-rep-total-amt">
            Total Amt: 0.00
          </div>

          <div style="display:flex; gap:6px; margin-bottom:2px;">
            <button type="button" class="btn btn-secondary" id="btn-grp-pur-rep-view" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-grp-pur-rep-print" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print</button>
            <button type="button" class="btn btn-secondary" id="btn-grp-pur-rep-close" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Close</button>
          </div>
        </div>

        <!-- Table View -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; overflow-x:auto; border-radius:2px;" id="print-area-cust-rep">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black; white-space:nowrap;" id="grp-pur-rep-table">
            <thead>
              <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill No</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill Date</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Vendor</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Product</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Model</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Discount</th>
                <th class="col-gst" style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">GST</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Total</th>
                
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Purchase Man</th>
              </tr>
            </thead>
            <tbody id="grp-pur-rep-tbody">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;
  const overlayEl = tempDiv.firstElementChild;
  root.appendChild(overlayEl);

  const overlay = document.getElementById("product-group-wise-purchase-report-overlay");
  const close = () => { overlay.remove(); };

  overlayEl.querySelector("#grp-pur-rep-close-icon").addEventListener("click", close);
  overlayEl.querySelector("#btn-grp-pur-rep-close").addEventListener("click", close);

  // Toggle column visibility
  overlayEl.querySelector("#grp-pur-rep-hide-gst").addEventListener("change", (e) => {
    const tbl = overlayEl.querySelector("#grp-pur-rep-table");
    if (e.target.checked) tbl.classList.add("grp-pur-rep-hide-gst");
    else tbl.classList.remove("grp-pur-rep-hide-gst");
  });
  
  overlayEl.querySelector("#grp-pur-rep-hide-margin").addEventListener("change", (e) => {
    const tbl = overlayEl.querySelector("#grp-pur-rep-table");
    if (e.target.checked) tbl.classList.add("grp-pur-rep-hide-margin");
    else tbl.classList.remove("grp-pur-rep-hide-margin");
  });

  overlayEl.querySelector("#btn-grp-pur-rep-print").addEventListener("click", () => {
    const printContent = overlayEl.querySelector("#print-area-cust-rep").innerHTML;
    const hideGst = overlayEl.querySelector("#grp-pur-rep-hide-gst").checked;
    const hideMargin = overlayEl.querySelector("#grp-pur-rep-hide-margin").checked;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>PRODUCT GROUP WISE PURCHASE REPORT</title>
          <style>
            body { font-family: sans-serif; font-size: 0.8rem; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background-color: #f0f0f0; }
            ${hideGst ? '.col-gst { display: none !important; }' : ''}
            ${hideMargin ? '.col-margin { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <h2>Product Group Wise Purchase Report</h2>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });

  const btnView = overlayEl.querySelector("#btn-grp-pur-rep-view");
  const tbody = overlayEl.querySelector("#grp-pur-rep-tbody");
  const lblTotalAmt = overlayEl.querySelector("#grp-pur-rep-total-amt");

  btnView.addEventListener("click", () => {
    const fFrom = overlayEl.querySelector("#grp-pur-rep-date-from").value;
    const fTo = overlayEl.querySelector("#grp-pur-rep-date-to").value;
    const fCust = overlayEl.querySelector("#grp-pur-rep-cust").value;
    const fPurchaseman = overlayEl.querySelector("#grp-pur-rep-purchaseman").value;
    const fGroup = overlayEl.querySelector("#grp-pur-rep-group").value;

    // Filter invoices by date
    const filteredInvoices = invoices.filter(inv => {
      let ok = true;
      if (fFrom) ok = ok && (inv.date >= fFrom);
      if (fTo) ok = ok && (inv.date <= fTo);
      return ok;
    });

    let groupedData = {};
    let gTotalTax = 0;
    let gTotalAmount = 0;
    let gTotalMargin = 0;

    filteredInvoices.forEach(inv => {
      // Check vendor filter
      if (fCust !== "All" && inv.contactName !== fCust) return;
      if (fPurchaseman !== "All" && inv.purchaseMan !== fPurchaseman) return;
      
      inv.items.forEach((item, index) => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        if (!mat) return;
        
        if (fGroup !== "All" && mat.productGroup !== fGroup) return;
        
        let itemTaxPercent = parseFloat(item.gstPercent || item.taxPercent || mat.taxPercent || inv.taxRate || 0);

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const discountVal = parseFloat(item.discountAmount || 0);
        
        // Exclusive purchase amount
        let exclusiveAmt = parseFloat(item.netValue || item.amount || ((qty * rate) - discountVal));
        
        // GST Calculation
        let taxVal = parseFloat(item.gstAmount || item.taxAmount || 0);
        if (taxVal === 0 && itemTaxPercent > 0) {
            taxVal = exclusiveAmt * (itemTaxPercent / 100);
        }
        
        let inclusiveAmt = parseFloat(item.netAmount || (exclusiveAmt + taxVal));
        
        const finalItemTotal = inclusiveAmt;

        // Margin
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : (parseFloat(mat?.purchaseRate) || 0);

        const basePrice = parseFloat(item.amount) || (qty * rate);
        const itemDiscount = parseFloat(item.discountAmount) || 0;
        const sellingPrice = parseFloat(item.netValue) || (basePrice - itemDiscount);
        
        const itemCost = purchaseCost * qty;
        let margin = sellingPrice - itemCost;

        if (!groupedData[inv.id]) {
          groupedData[inv.id] = {
            billNo: inv.id,
            billDate: inv.date,
            vendor: inv.contactName,
            purchaseMan: inv.purchaseMan || '',
            items: [],
            totalTax: 0,
            totalAmt: 0,
            totalMargin: 0
          };
        }

        groupedData[inv.id].items.push({
          product: item.name,
          model: mat.code || mat.model || "",
          qty: `${qty} ${mat.unit || ''}`.trim(),
          rate: rate.toFixed(2),
          discount: discountVal.toFixed(2),
          tax: taxVal.toFixed(2),
          total: finalItemTotal.toFixed(2),
          margin: margin.toFixed(2)
        });

        groupedData[inv.id].totalTax += taxVal;
        groupedData[inv.id].totalAmt += finalItemTotal;
        groupedData[inv.id].totalMargin += margin;

        gTotalTax += taxVal;
        gTotalAmount += finalItemTotal;
        gTotalMargin += margin;
      });

    });

    let html = "";
    Object.values(groupedData).forEach((group, idx) => {
        const bg = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
        group.items.forEach((it, i) => {
            html += `
            <tr style="background:${bg}; cursor:pointer;" class="grp-pur-rep-row" data-billno="${group.billNo}">
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billNo : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billDate : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.vendor : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.product}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.model}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.qty}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.rate}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.discount}</td>
              <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.tax}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.total}</td>
              
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.purchaseMan : ''}</td>
            </tr>
            `;
        });
        
        // Bill Total Row
        html += `
        <tr style="background:#e2e8f0; font-weight:bold;">
          <td colspan="8" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">Total</td>
          <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right; color:#166534;">${group.totalTax.toFixed(2)}</td>
          <td style="padding:4px; border:1px solid #cbd5e1; text-align:right; color:#1e3b8b;">${group.totalAmt.toFixed(2)}</td>
          
          <td style="padding:4px; border:1px solid #cbd5e1;"></td>
        </tr>
        `;
    });

    // Grand Total
    html += `
    <tr style="background:#cbd5e1; font-weight:bold; font-size:0.9rem;">
      <td colspan="8" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right;">G.Total</td>
      <td class="col-gst" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#166534;">${gTotalTax.toFixed(2)}</td>
      <td style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#1e3b8b;">${gTotalAmount.toFixed(2)}</td>
      
      <td style="padding:6px 4px; border:1px solid #94a3b8;"></td>
    </tr>
    `;

    tbody.innerHTML = html;
    lblTotalAmt.textContent = `Total Amt: ${gTotalAmount.toFixed(2)}`;

    // Attach double click to open invoice
    overlayEl.querySelectorAll(".grp-pur-rep-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const bNo = row.getAttribute("data-billno");
        const invoice = invoices.find(inv => String(inv.id) === String(bNo));
        if (invoice) {
           import("./transactions.js").then(m => {
             m.showRecordPurchaseModal(container, invoice);
           });
        }
      });
    });
  });

  // trigger view initially
  btnView.click();
}




// ADDITIONAL GENERATED //

export function showCompanyWisePurchaseReportModal(container) {
  const root = document.getElementById("modal-container-root") || container;
  const materials = state.getMaterials();
  const invoices = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);
  const companies = [...new Set(materials.map(m => m.company).filter(Boolean))];
  const purchaseMen = [...new Set(invoices.map(i => i.purchaseMan).filter(Boolean))];

  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = `
    <div class="modal-overlay active" id="company-wise-purchase-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <style>
        .comp-pur-rep-hide-gst .col-gst { display: none !important; }
        .comp-pur-rep-hide-margin .col-margin { display: none !important; }
      </style>
      <div class="modal-container modal-lg" style="width: 80vw; height:80vh; max-width:1400px; background-color:#dbeafe; color:#0f172a; padding:8px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-chart-bar"></i> COMPANY WISE PURCHASE REPORT</div>
          <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="comp-pur-rep-close-icon">&times;</button>
        </div>

        <!-- Toolbar area -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; background:#b4c6e7; padding:8px; border:1px solid #8faadc; border-radius:2px;">
          
          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">From:</label>
            <input type="date" id="comp-pur-rep-date-from" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${firstDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">To:</label>
            <input type="date" id="comp-pur-rep-date-to" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${lastDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Company:</label>
            <select id="comp-pur-rep-comp" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Vendor Name:</label>
            <select id="comp-pur-rep-cust" class="form-control" style="width:180px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${vendors.map(c => `<option value="${c.name}">${c.name}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Purchase Man:</label>
            <select id="comp-pur-rep-purchaseman" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${purchaseMen.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>

          <div style="display:none; flex-direction:column; gap:4px; margin-left:10px; justify-content:center; padding-bottom: 2px;">
            <label style="font-size:0.75rem; font-weight:bold; display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="comp-pur-rep-hide-gst"> Hide GST Column
            </label>
            <label style="font-size:0.75rem; font-weight:bold; display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="comp-pur-rep-hide-margin"> Hide Margin Column
            </label>
          </div>

          <div style="font-weight:bold; font-size:1rem; color:blue; margin-left:auto; margin-bottom:4px;" id="comp-pur-rep-total-amt">
            Total Amt: 0.00
          </div>

          <div style="display:flex; gap:6px; margin-bottom:2px;">
            <button type="button" class="btn btn-secondary" id="btn-comp-pur-rep-view" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-comp-pur-rep-print" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print</button>
            <button type="button" class="btn btn-secondary" id="btn-comp-pur-rep-close" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Close</button>
          </div>
        </div>

        <!-- Table View -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; overflow-x:auto; border-radius:2px;" id="print-area-cust-rep">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black; white-space:nowrap;" id="comp-pur-rep-table">
            <thead>
              <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill No</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill Date</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Vendor</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Product</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Model</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Discount</th>
                <th class="col-gst" style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">GST</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Total</th>
                
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Purchase Man</th>
              </tr>
            </thead>
            <tbody id="comp-pur-rep-tbody">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;
  const overlayEl = tempDiv.firstElementChild;
  root.appendChild(overlayEl);

  const overlay = document.getElementById("company-wise-purchase-report-overlay");
  const close = () => { overlay.remove(); };

  overlayEl.querySelector("#comp-pur-rep-close-icon").addEventListener("click", close);
  overlayEl.querySelector("#btn-comp-pur-rep-close").addEventListener("click", close);

  // Toggle column visibility
  overlayEl.querySelector("#comp-pur-rep-hide-gst").addEventListener("change", (e) => {
    const tbl = overlayEl.querySelector("#comp-pur-rep-table");
    if (e.target.checked) tbl.classList.add("comp-pur-rep-hide-gst");
    else tbl.classList.remove("comp-pur-rep-hide-gst");
  });
  
  overlayEl.querySelector("#comp-pur-rep-hide-margin").addEventListener("change", (e) => {
    const tbl = overlayEl.querySelector("#comp-pur-rep-table");
    if (e.target.checked) tbl.classList.add("comp-pur-rep-hide-margin");
    else tbl.classList.remove("comp-pur-rep-hide-margin");
  });

  overlayEl.querySelector("#btn-comp-pur-rep-print").addEventListener("click", () => {
    const printContent = overlayEl.querySelector("#print-area-cust-rep").innerHTML;
    const hideGst = overlayEl.querySelector("#comp-pur-rep-hide-gst").checked;
    const hideMargin = overlayEl.querySelector("#comp-pur-rep-hide-margin").checked;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>COMPANY WISE PURCHASE REPORT</title>
          <style>
            body { font-family: sans-serif; font-size: 0.8rem; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background-color: #f0f0f0; }
            ${hideGst ? '.col-gst { display: none !important; }' : ''}
            ${hideMargin ? '.col-margin { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <h2>Product Group Wise Purchase Report</h2>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });

  const btnView = overlayEl.querySelector("#btn-comp-pur-rep-view");
  const tbody = overlayEl.querySelector("#comp-pur-rep-tbody");
  const lblTotalAmt = overlayEl.querySelector("#comp-pur-rep-total-amt");

  btnView.addEventListener("click", () => {
    const fFrom = overlayEl.querySelector("#comp-pur-rep-date-from").value;
    const fTo = overlayEl.querySelector("#comp-pur-rep-date-to").value;
    const fCust = overlayEl.querySelector("#comp-pur-rep-cust").value;
    const fPurchaseman = overlayEl.querySelector("#comp-pur-rep-purchaseman").value;
    const fGroup = overlayEl.querySelector("#comp-pur-rep-comp").value;

    // Filter invoices by date
    const filteredInvoices = invoices.filter(inv => {
      let ok = true;
      if (fFrom) ok = ok && (inv.date >= fFrom);
      if (fTo) ok = ok && (inv.date <= fTo);
      return ok;
    });

    let groupedData = {};
    let gTotalTax = 0;
    let gTotalAmount = 0;
    let gTotalMargin = 0;

    filteredInvoices.forEach(inv => {
      // Check vendor filter
      if (fCust !== "All" && inv.contactName !== fCust) return;
      if (fPurchaseman !== "All" && inv.purchaseMan !== fPurchaseman) return;
      
      inv.items.forEach((item, index) => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        if (!mat) return;
        
        if (fGroup !== "All" && mat.productGroup !== fGroup) return;
        
        let itemTaxPercent = parseFloat(item.gstPercent || item.taxPercent || mat.taxPercent || inv.taxRate || 0);

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const discountVal = parseFloat(item.discountAmount || 0);
        
        // Exclusive purchase amount
        let exclusiveAmt = parseFloat(item.netValue || item.amount || ((qty * rate) - discountVal));
        
        // GST Calculation
        let taxVal = parseFloat(item.gstAmount || item.taxAmount || 0);
        if (taxVal === 0 && itemTaxPercent > 0) {
            taxVal = exclusiveAmt * (itemTaxPercent / 100);
        }
        
        let inclusiveAmt = parseFloat(item.netAmount || (exclusiveAmt + taxVal));
        
        const finalItemTotal = inclusiveAmt;

        // Margin
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : (parseFloat(mat?.purchaseRate) || 0);

        const basePrice = parseFloat(item.amount) || (qty * rate);
        const itemDiscount = parseFloat(item.discountAmount) || 0;
        const sellingPrice = parseFloat(item.netValue) || (basePrice - itemDiscount);
        
        const itemCost = purchaseCost * qty;
        let margin = sellingPrice - itemCost;

        if (!groupedData[inv.id]) {
          groupedData[inv.id] = {
            billNo: inv.id,
            billDate: inv.date,
            vendor: inv.contactName,
            purchaseMan: inv.purchaseMan || '',
            items: [],
            totalTax: 0,
            totalAmt: 0,
            totalMargin: 0
          };
        }

        groupedData[inv.id].items.push({
          product: item.name,
          model: mat.code || mat.model || "",
          qty: `${qty} ${mat.unit || ''}`.trim(),
          rate: rate.toFixed(2),
          discount: discountVal.toFixed(2),
          tax: taxVal.toFixed(2),
          total: finalItemTotal.toFixed(2),
          margin: margin.toFixed(2)
        });

        groupedData[inv.id].totalTax += taxVal;
        groupedData[inv.id].totalAmt += finalItemTotal;
        groupedData[inv.id].totalMargin += margin;

        gTotalTax += taxVal;
        gTotalAmount += finalItemTotal;
        gTotalMargin += margin;
      });


    });

    let html = "";
    Object.values(groupedData).forEach((group, idx) => {
        const bg = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
        group.items.forEach((it, i) => {
            html += `
            <tr style="background:${bg}; cursor:pointer;" class="comp-pur-rep-row" data-billno="${group.billNo}">
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billNo : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billDate : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.vendor : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.product}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.model}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.qty}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.rate}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.discount}</td>
              <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.tax}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.total}</td>
              
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.purchaseMan : ''}</td>
            </tr>
            `;
        });
    });

    // Grand Total
    html += `
    <tr style="background:#cbd5e1; font-weight:bold; font-size:0.9rem;">
      <td colspan="8" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right;">G.Total</td>
      <td class="col-gst" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#166534;">${gTotalTax.toFixed(2)}</td>
      <td style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#1e3b8b;">${gTotalAmount.toFixed(2)}</td>
      
      <td style="padding:6px 4px; border:1px solid #94a3b8;"></td>
    </tr>
    `;

    tbody.innerHTML = html;
    lblTotalAmt.textContent = `Total Amt: ${gTotalAmount.toFixed(2)}`;

    // Attach double click to open invoice
    overlayEl.querySelectorAll(".comp-pur-rep-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const bNo = row.getAttribute("data-billno");
        const invoice = invoices.find(inv => String(inv.id) === String(bNo));
        if (invoice) {
           import("./transactions.js").then(m => {
             m.showRecordPurchaseModal(container, invoice);
           });
        }
      });
    });
  });

  // Auto-reload on dropdown/input changes
  overlayEl.querySelectorAll(".form-control, select, input").forEach(input => {
    input.addEventListener("change", () => btnView.click());
    input.addEventListener("input", () => btnView.click());
  });

  // trigger view initially
  btnView.click();
}




export function showPurchaseReturnReportModal(container) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();
  const purchases = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);

  // Derive unique brands and categories for filter dropdowns
  const companies = [...new Set(materials.map(m => m.company).filter(Boolean))];
  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];
  const subCategories = [...new Set(materials.map(m => m.subCategory || "All").filter(Boolean))];

  // Default dates (current month)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="purchase-return-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1400px; width: 96vw; height:90vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice"></i> PURCHASE RETURN REPORT</div>
          <div style="display:flex; gap:4px;">
            <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="rep-close-btn">&times;</button>
          </div>
        </div>

        <!-- Upper Control Dashboard Grid -->
        <div style="display:grid; grid-template-columns: 340px 1fr 280px; gap:10px; background:#b4c6e7; padding:10px; border:1px solid #8faadc; border-radius:2px; align-items:start;">
          
          <!-- Radio Options Group (Left Panel) -->
          <div style="background:#d9e1f2; border:1px solid #8faadc; padding:6px; border-radius:2px; display:grid; grid-template-columns: 1fr 1.2fr 1fr; gap:6px 4px;">
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="all" checked> All</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="group"> Product Group</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="company"> Company</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="product"> Product Name</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="category"> Category</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="code"> Code/Model</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="billno"> Bill No</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="billamount"> Bill Amount</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="vendor"> Vendor</label>
            </div>

          <!-- Dynamic Middle Filters (Populated contextually based on Radio selection) -->
          <div id="dynamic-filters-box" style="display:flex; flex-wrap:wrap; gap:8px; align-content:start;">
            <!-- Rendered contextually -->
          </div>

          <!-- Extra Checkboxes and Print actions (Right Panel) -->
          <div style="display:flex; flex-direction:column; gap:8px; align-items:end;">
            <div style="display:flex; flex-direction:column; gap:4px; align-self:start;">
              <label style="display:flex; align-items:center; gap:6px; font-weight:bold; cursor:pointer;"><input type="checkbox" id="chk-daywise"> Daywise</label>
              <label style="display:flex; align-items:center; gap:6px; font-weight:bold; cursor:pointer;"><input type="checkbox" id="chk-include-return" checked style="display:none;"> </label>
              <label style="display:flex; align-items:center; gap:6px; font-weight:bold; cursor:pointer;"><input type="checkbox" id="chk-show-paymode"> Show Payment Mode</label>
            </div>
            
            <div style="display:flex; gap:6px; margin-top:auto;">
              <button type="button" class="btn btn-secondary" id="btn-rep-view" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">View</button>
              <button type="button" class="btn btn-secondary" id="btn-rep-print" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print</button>
              <button type="button" class="btn btn-secondary" id="btn-rep-print-bill" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print as Bill</button>
              <button type="button" class="btn btn-secondary" id="btn-rep-close" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Close</button>
            </div>
          </div>
        </div>

        <!-- Date limits toolbar -->
        <div style="background:#cbd5e1; border:1px solid #94a3b8; padding:4px 8px; display:flex; gap:15px; align-items:center; font-weight:bold;">
          <div>
            From: <input type="date" id="rep-date-from" class="form-control" style="width:130px; display:inline-block; padding:2px; font-size:0.78rem;" value="${firstDay}">
          </div>
          <div>
            To: <input type="date" id="rep-date-to" class="form-control" style="width:130px; display:inline-block; padding:2px; font-size:0.78rem;" value="${lastDay}">
          </div>
        </div>

        <!-- Table Grid view -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="purchase-report-table">
            <!-- Headers and rows rendered dynamically -->
          </table>
        </div>

      </div>
    </div>
  `;

  const overlay = document.getElementById("purchase-return-report-overlay");
  const close = () => { overlay.remove(); };

  document.getElementById("rep-close-btn").addEventListener("click", close);
  document.getElementById("btn-rep-close").addEventListener("click", close);
  document.getElementById("btn-rep-print").addEventListener("click", () => window.print());
  document.getElementById("btn-rep-print-bill").addEventListener("click", () => window.print());

  const dynamicBox = document.getElementById("dynamic-filters-box");
  const dateFromEl = document.getElementById("rep-date-from");
  const dateToEl = document.getElementById("rep-date-to");
  const tableEl = document.getElementById("purchase-report-table");

  // Render sub-filters middle layout contextually
  function updateMiddleFilters(mode) {
    if (mode === "company") {
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Company</legend>
          <select id="filt-company" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:200px;">
            <option value="All">All</option>
            ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else if (mode === "category") {
      dynamicBox.innerHTML = `
        <div style="display:flex; gap:8px;">
          <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
            <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Company</legend>
            <select id="filt-company" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:140px;">
              <option value="All">All</option>
              ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </fieldset>
          <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
            <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Sub Category</legend>
            <select id="filt-subcategory" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:140px;">
              <option value="All">All</option>
              ${subCategories.map(sc => `<option value="${sc}">${sc}</option>`).join("")}
            </select>
          </fieldset>
          <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
            <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Category</legend>
            <select id="filt-category" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:140px;">
              <option value="All">All</option>
              ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join("")}
            </select>
          </fieldset>
        </div>
      `;
    } else if (mode === "billno") {
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Filter By Bill No</legend>
          <div style="display:flex; align-items:center; gap:8px;">
            <select id="filt-billno-criteria" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:110px;">
              <option value="all">Show All</option>
              <option value="equal">Equal To</option>
              <option value="less">Less Than</option>
              <option value="greater">Greater Than</option>
              <option value="between">In Between</option>
            </select>
            <input type="text" id="filt-billno-val1" class="form-control" placeholder="Val 1" style="padding:2px; width:70px; display:inline-block; font-size:0.75rem; background:white; color:black;">
            <span id="filt-billno-val2-container" style="display:none; align-items:center; gap:4px;">
              and <input type="text" id="filt-billno-val2" class="form-control" placeholder="Val 2" style="padding:2px; width:70px; display:inline-block; font-size:0.75rem; background:white; color:black;">
            </span>
          </div>
        </fieldset>
      `;
      const criteriaSelect = document.getElementById("filt-billno-criteria");
      criteriaSelect.addEventListener("change", (e) => {
        const v2 = document.getElementById("filt-billno-val2-container");
        if (v2) v2.style.display = e.target.value === "between" ? "inline-flex" : "none";
      });
    } else if (mode === "vendor") {
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Vendor</legend>
          <select id="filt-vendor" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:220px;">
            <option value="All">All</option>
            ${vendors.map(cust => `<option value="${cust.id}">${cust.name}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else if (mode === "product") {
      const uniqueProducts = [...new Set(materials.map(m => m.name).filter(Boolean))];
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Product</legend>
          <select id="filt-product-select" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:220px;">
            <option value="All">All</option>
            ${uniqueProducts.map(p => `<option value="${p}">${p}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else if (mode === "group") {
      const uniqueGroups = [...new Set(materials.map(m => m.productGroup).filter(Boolean))];
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Product Group</legend>
          <select id="filt-group-select" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:200px;">
            <option value="All">All</option>
            ${uniqueGroups.map(g => `<option value="${g}">${g}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else if (mode === "code") {
      const uniqueCodes = [...new Set(materials.map(m => m.code).filter(Boolean))];
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Code/Model</legend>
          <select id="filt-code-select" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:200px;">
            <option value="All">All</option>
            ${uniqueCodes.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </fieldset>
      `;
    } else {
      // Default placeholder
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Filter Options</legend>
          <select id="filt-default" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:200px;" disabled>
            <option value="All">All Records</option>
          </select>
        </fieldset>
      `;
    }
  }

  // Generate date format (DD/MM/YYYY)
  function formatDate(dStr) {
    return formatDateDisplay(dStr);
  }

  // Core Render Report logic
  function renderReportGrid() {
    const fromDate = dateFromEl.value;
    const toDate = dateToEl.value;
    const mode = document.querySelector("input[name='rep-mode']:checked").value;
    const daywise = document.getElementById("chk-daywise").checked;
    const includeReturns = document.getElementById("chk-include-return").checked;
    
    // Filter purchases by Date Range
    let filteredInvoices = purchases.filter(inv => {
      let ok = true;
      if (fromDate) ok = ok && (inv.date >= fromDate);
      if (toDate) ok = ok && (inv.date <= toDate);
      return ok;
    });

    // Sub-filters context check
    if (mode === "vendor") {
      const custId = document.getElementById("filt-vendor")?.value || "All";
      if (custId !== "All") {
        filteredInvoices = filteredInvoices.filter(inv => inv.contactId === custId);
      }
    } else if (mode === "billno") {
      const criteria = document.getElementById("filt-billno-criteria")?.value || "all";
      const val1 = document.getElementById("filt-billno-val1")?.value.trim().toLowerCase() || "";
      const val2 = document.getElementById("filt-billno-val2")?.value.trim().toLowerCase() || "";

      if (criteria !== "all" && val1 !== "") {
        filteredInvoices = filteredInvoices.filter(inv => {
          const invIdStr = String(inv.id).toLowerCase();
          const invIdNum = parseFloat(invIdStr.replace(/[^0-9.]/g, "")) || 0;
          const v1Num = parseFloat(val1) || 0;
          const v2Num = parseFloat(val2) || 0;

          if (criteria === "equal") {
            return invIdStr === val1 || invIdNum === v1Num;
          } else if (criteria === "less") {
            return invIdNum < v1Num;
          } else if (criteria === "greater") {
            return invIdNum > v1Num;
          } else if (criteria === "between") {
            return invIdNum >= v1Num && invIdNum <= v2Num;
          }
          return true;
        });
      }
    }

    if (mode === "company") {
      const compBrand = document.getElementById("filt-company")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const brand = (mat && mat.company) ? mat.company : "UNAVAILABLE";
          if (compBrand === "All" || brand === compBrand) {
            const key = brand + "|" + item.name + "|" + item.code;
            if (!groupMap[key]) {
                groupMap[key] = {
                  companyName: brand,
                  productName: item.name,
                  codeModel: item.code,
                  qty: 0,
                  amount: 0
                };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(groupMap);

      const totalQty = rows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">CompanyName</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">ProductName</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Code/Model</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.companyName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.codeModel}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="3" style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "category") {
      const selectedCat = document.getElementById("filt-category-select")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const cat = (mat && mat.category) ? mat.category : "UNAVAILABLE";

          if (selectedCat === "All" || cat === selectedCat) {
            const key = cat;
            if (!groupMap[key]) {
              groupMap[key] = {
                category: cat,
                qty: 0,
                amount: 0
              };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let groupedRows = Object.values(groupMap);

      const totalQty = groupedRows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = groupedRows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Category</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${groupedRows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.category}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty.toFixed(2)}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "product") {
      const selectedProdName = document.getElementById("filt-product-select")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const comp = (mat && mat.company) ? mat.company : "UNAVAILABLE";
          const cat = (mat && mat.category) ? mat.category : "UNAVAILABLE";

          if (selectedProdName === "All" || item.name === selectedProdName) {
            const key = item.name + "|" + item.code + "|" + comp + "|" + cat;
            if (!groupMap[key]) {
              groupMap[key] = {
                productName: item.name,
                codeModel: item.code,
                company: comp,
                category: cat,
                qty: 0,
                amount: 0
              };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(groupMap);

      const totalQty = rows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Product Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Code/Model</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Company</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Category</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.codeModel}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.company}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.category}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="4" style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "group") {
      const selGroup = document.getElementById("filt-group")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const grp = (mat && mat.productGroup) ? mat.productGroup : "UNAVAILABLE";
          if (selGroup === "All" || grp === selGroup) {
            const key = grp + "|" + item.name + "|" + item.code;
            if (!groupMap[key]) {
              groupMap[key] = {
                groupName: grp,
                productName: item.name,
                codeModel: item.code,
                qty: 0,
                amount: 0
              };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(groupMap);

      const totalQty = rows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Group Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Product Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.groupName}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="2" style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "code") {
      const selectedCode = document.getElementById("filt-code-select")?.value || "All";
      
      let groupMap = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const comp = (mat && mat.company) ? mat.company : "UNAVAILABLE";

          if (selectedCode === "All" || item.code === selectedCode) {
            const key = item.code + "|" + item.name + "|" + comp;
            if (!groupMap[key]) {
              groupMap[key] = {
                codeModel: item.code,
                productName: item.name,
                companyName: comp,
                qty: 0,
                amount: 0
              };
            }
            groupMap[key].qty += parseFloat(item.quantity) || 0;
            groupMap[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(groupMap);

      const totalQty = rows.reduce((s, r) => s + r.qty, 0);
      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Code/Model</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Product Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Company Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.codeModel}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.productName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.companyName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.qty}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="3" style="padding:6px; border:1px solid #cbd5e1;">Total :</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalQty.toFixed(2)}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "billno") {
      let rows = filteredInvoices.map((inv, idx) => ({
        slNo: idx + 1,
        billNo: inv.id,
        billDate: formatDate(inv.date),
        vendorName: inv.contactName,
        billAmount: inv.total || 0
      }));

      const totalAmt = rows.reduce((s, r) => s + r.billAmount, 0);
      const avgAmt = rows.length > 0 ? (totalAmt / rows.length) : 0;

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Sl.No</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Bill No</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Bill Date</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Vendor Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Bill Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.slNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${r.billNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.vendorName}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.billAmount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="4" style="padding:6px; border:1px solid #cbd5e1;">Total</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
          <tr style="background:#f1f5f9; font-weight:bold;">
            <td colspan="4" style="padding:6px; border:1px solid #cbd5e1;">Average</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${avgAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    if (mode === "vendor") {
      let rows = filteredInvoices.map(inv => ({
        vendorName: inv.contactName,
        billDate: formatDate(inv.date),
        billNo: inv.id,
        amount: inv.total || 0
      }));

      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Vendor Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">BillDate</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">BillNo</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1;">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.vendorName}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="3" style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Total Purchase:</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      return;
    }

    // Default "All" Layout
    let rows = filteredInvoices.map(inv => ({
      billDate: formatDate(inv.date),
      billNo: inv.id,
      refNo: inv.refNo || "",
      vendorName: inv.contactName,
      purchaseAmount: inv.total || 0
    }));

    const totalAmt = rows.reduce((s, r) => s + r.purchaseAmount, 0);

    tableEl.innerHTML = `
      <thead>
        <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
          <th style="padding:6px; border:1px solid #cbd5e1;">Bill Date</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Bill No.</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Ref No</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Vendor Name</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Purchase Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr style="border-bottom:1px solid #cbd5e1;">
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${r.billNo}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.refNo}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.vendorName}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.purchaseAmount.toFixed(2)}</td>
          </tr>
        `).join("")}
        <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
          <td colspan="4" style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Total Purchase:</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
        </tr>
      </tbody>
    `;
  }

  // Bind radio events
  document.querySelectorAll("input[name='rep-mode']").forEach(radio => {
    radio.addEventListener("change", (e) => {
      updateMiddleFilters(e.target.value);
      renderReportGrid();
    });
  });

  // Bind view click
  document.getElementById("btn-rep-view").addEventListener("click", renderReportGrid);

  // Auto-reload on input changes
  const inputs = [dateFromEl, dateToEl];
  inputs.forEach(inp => {
    if (inp) {
      inp.addEventListener("change", renderReportGrid);
      inp.addEventListener("input", renderReportGrid);
    }
  });
  dynamicBox.addEventListener("change", renderReportGrid);
  dynamicBox.addEventListener("input", renderReportGrid);

  // Initialize
  updateMiddleFilters("all");
  renderReportGrid();
}



export function showProductWisePurchaseReportModal(container) {
  const root = document.getElementById("modal-container-root") || container;
  const materials = state.getMaterials();
  const invoices = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);
  const products = [...new Set(materials.map(m => m.name).filter(Boolean))];
  const productGroups = [...new Set(materials.map(m => m.productGroup).filter(Boolean))];
  const purchaseMen = [...new Set(invoices.map(i => i.purchaseMan).filter(Boolean))];

  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = `
    <div class="modal-overlay active" id="product-wise-purchase-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <style>
        .prod-pur-rep-hide-gst .col-gst { display: none !important; }
        .prod-pur-rep-hide-margin .col-margin { display: none !important; }
      </style>
      <div class="modal-container modal-lg" style="width: 80vw; height:80vh; max-width:1400px; background-color:#dbeafe; color:#0f172a; padding:8px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-chart-bar"></i> PRODUCT WISE PURCHASE REPORT</div>
          <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="prod-pur-rep-close-icon">&times;</button>
        </div>

        <!-- Toolbar area -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; background:#b4c6e7; padding:8px; border:1px solid #8faadc; border-radius:2px;">
          
          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">From:</label>
            <input type="date" id="prod-pur-rep-date-from" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${firstDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">To:</label>
            <input type="date" id="prod-pur-rep-date-to" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${lastDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Product Group:</label>
            <select id="prod-pur-rep-group" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${productGroups.map(g => `<option value="${g}">${g}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Product Name:</label>
            <select id="prod-pur-rep-prod" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${products.map(p => `<option value="${p}">${p}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Product Model:</label>
            <select id="prod-pur-rep-model" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;" disabled>
              <option value="All">All</option>
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Vendor Name:</label>
            <select id="prod-pur-rep-cust" class="form-control" style="width:180px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${vendors.map(c => `<option value="${c.name}">${c.name}</option>`).join("")}
            </select>
          </div>

          <div style="display:none; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Purchase Man:</label>
            <select id="prod-pur-rep-purchaseman" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${purchaseMen.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px; margin-left:10px; justify-content:center; padding-bottom: 2px;">
            <label style="font-size:0.75rem; font-weight:bold; display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="prod-pur-rep-hide-gst"> Hide GST Column
            </label>
            <label style="font-size:0.75rem; font-weight:bold; display:none; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="prod-pur-rep-hide-margin"> Hide Margin Column
            </label>
          </div>

          <div style="font-weight:bold; font-size:1rem; color:blue; margin-left:auto; margin-bottom:4px;" id="prod-pur-rep-total-amt">
            Total Amt: 0.00
          </div>

          <div style="display:flex; gap:6px; margin-bottom:2px;">
            <button type="button" class="btn btn-secondary" id="btn-prod-pur-rep-view" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-prod-pur-rep-print" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print</button>
            <button type="button" class="btn btn-secondary" id="btn-prod-pur-rep-close" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Close</button>
          </div>
        </div>

        <!-- Table View -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; overflow-x:auto; border-radius:2px;" id="print-area-cust-rep">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black; white-space:nowrap;" id="prod-pur-rep-table">
            <thead>
              <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill No</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill Date</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Vendor</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Product</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Model</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Discount</th>
                <th class="col-gst" style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">GST</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody id="prod-pur-rep-tbody">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>
        <!-- Product Summary Footer Panel -->
        <div id="prod-pur-rep-summary-box" style="background:#b4c6e7; border:1px solid #8faadc; padding:8px; border-radius:2px; font-weight:bold; color:black; display:flex; flex-wrap:wrap; gap:15px; align-items:center; min-height: 24px; font-size: 0.85rem;">
        </div>
      </div>
    </div>
  `;
  const overlayEl = tempDiv.firstElementChild;
  root.appendChild(overlayEl);

  const overlay = document.getElementById("product-wise-purchase-report-overlay");
  const close = () => { overlay.remove(); };

  overlayEl.querySelector("#prod-pur-rep-close-icon").addEventListener("click", close);
  overlayEl.querySelector("#btn-prod-pur-rep-close").addEventListener("click", close);

  const prodNameSelect = overlayEl.querySelector("#prod-pur-rep-prod");
  const prodModelSelect = overlayEl.querySelector("#prod-pur-rep-model");

  prodNameSelect.addEventListener("change", (e) => {
    const selectedName = e.target.value;
    if (selectedName === "All") {
      prodModelSelect.innerHTML = `<option value="All">All</option>`;
      prodModelSelect.disabled = true;
      prodModelSelect.value = "All";
    } else {
      const filteredModels = [...new Set(materials.filter(m => m.name === selectedName).map(m => m.code || m.id).filter(Boolean))];
      prodModelSelect.innerHTML = `<option value="All">All</option>` + filteredModels.map(m => `<option value="${m}">${m}</option>`).join("");
      prodModelSelect.disabled = false;
      prodModelSelect.value = "All";
    }
  });

  // Toggle column visibility
  overlayEl.querySelector("#prod-pur-rep-hide-gst").addEventListener("change", (e) => {
    const tbl = overlayEl.querySelector("#prod-pur-rep-table");
    if (e.target.checked) tbl.classList.add("prod-pur-rep-hide-gst");
    else tbl.classList.remove("prod-pur-rep-hide-gst");
  });
  
  overlayEl.querySelector("#prod-pur-rep-hide-margin").addEventListener("change", (e) => {
    const tbl = overlayEl.querySelector("#prod-pur-rep-table");
    if (e.target.checked) tbl.classList.add("prod-pur-rep-hide-margin");
    else tbl.classList.remove("prod-pur-rep-hide-margin");
  });

  overlayEl.querySelector("#btn-prod-pur-rep-print").addEventListener("click", () => {
    const printContent = overlayEl.querySelector("#print-area-cust-rep").innerHTML;
    const hideGst = overlayEl.querySelector("#prod-pur-rep-hide-gst").checked;
    const hideMargin = overlayEl.querySelector("#prod-pur-rep-hide-margin").checked;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>PRODUCT WISE PURCHASE REPORT</title>
          <style>
            body { font-family: sans-serif; font-size: 0.8rem; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background-color: #f0f0f0; }
            ${hideGst ? '.col-gst { display: none !important; }' : ''}
            ${hideMargin ? '.col-margin { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <h2>Product Group Wise Purchase Report</h2>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });

  const btnView = overlayEl.querySelector("#btn-prod-pur-rep-view");
  const tbody = overlayEl.querySelector("#prod-pur-rep-tbody");
  const lblTotalAmt = overlayEl.querySelector("#prod-pur-rep-total-amt");

  btnView.addEventListener("click", () => {
    const fFrom = overlayEl.querySelector("#prod-pur-rep-date-from").value;
    const fTo = overlayEl.querySelector("#prod-pur-rep-date-to").value;
    const fCust = overlayEl.querySelector("#prod-pur-rep-cust").value;
    const fGroup = overlayEl.querySelector("#prod-pur-rep-group").value;
    const fProdName = overlayEl.querySelector("#prod-pur-rep-prod").value;
    const fProdModel = overlayEl.querySelector("#prod-pur-rep-model").value;

    // Filter invoices by date
    const filteredInvoices = invoices.filter(inv => {
      let ok = true;
      if (fFrom) ok = ok && (inv.date >= fFrom);
      if (fTo) ok = ok && (inv.date <= fTo);
      return ok;
    });

    let groupedData = {};
    let gTotalTax = 0;
    let gTotalAmount = 0;
    let gTotalMargin = 0;
    let productQtyTotals = {};

    filteredInvoices.forEach(inv => {
      // Check vendor filter
      if (fCust !== "All" && inv.contactName !== fCust) return;
      
      inv.items.forEach((item, index) => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        if (!mat) return;
        
        if (fGroup !== "All" && mat.productGroup !== fGroup) return;
        if (fProdName !== "All" && item.name !== fProdName) return;
        if (fProdModel !== "All" && (mat.code || mat.model || mat.id) !== fProdModel) return;
        
        const unit = mat.unit || "";
        const key = item.name + (unit ? ` (${unit})` : "");
        if (!productQtyTotals[key]) {
          productQtyTotals[key] = { qty: 0, unit: unit, name: item.name };
        }
        productQtyTotals[key].qty += parseFloat(item.quantity) || 0;
        
        let itemTaxPercent = parseFloat(item.gstPercent || item.taxPercent || mat.taxPercent || inv.taxRate || 0);

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const discountVal = parseFloat(item.discountAmount || 0);
        
        // Exclusive purchase amount
        let exclusiveAmt = parseFloat(item.netValue || item.amount || ((qty * rate) - discountVal));
        
        // GST Calculation
        let taxVal = parseFloat(item.gstAmount || item.taxAmount || 0);
        if (taxVal === 0 && itemTaxPercent > 0) {
            taxVal = exclusiveAmt * (itemTaxPercent / 100);
        }
        
        let inclusiveAmt = parseFloat(item.netAmount || (exclusiveAmt + taxVal));
        
        const finalItemTotal = inclusiveAmt;

        // Margin
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : (parseFloat(mat?.purchaseRate) || 0);

        const basePrice = parseFloat(item.amount) || (qty * rate);
        const itemDiscount = parseFloat(item.discountAmount) || 0;
        const sellingPrice = parseFloat(item.netValue) || (basePrice - itemDiscount);
        
        const itemCost = purchaseCost * qty;
        let margin = sellingPrice - itemCost;

        if (!groupedData[inv.id]) {
          groupedData[inv.id] = {
            billNo: inv.id,
            billDate: inv.date,
            vendor: inv.contactName,
            purchaseMan: inv.purchaseMan || '',
            items: [],
            totalTax: 0,
            totalAmt: 0,
            totalMargin: 0
          };
        }

        groupedData[inv.id].items.push({
          product: item.name,
          model: mat.code || mat.model || "",
          qty: `${qty} ${mat.unit || ''}`.trim(),
          rate: rate.toFixed(2),
          discount: discountVal.toFixed(2),
          tax: taxVal.toFixed(2),
          total: finalItemTotal.toFixed(2),
          margin: margin.toFixed(2)
        });

        groupedData[inv.id].totalTax += taxVal;
        groupedData[inv.id].totalAmt += finalItemTotal;
        groupedData[inv.id].totalMargin += margin;

        gTotalTax += taxVal;
        gTotalAmount += finalItemTotal;
        gTotalMargin += margin;
      });


    });

    let html = "";
    Object.values(groupedData).forEach((group, idx) => {
        const bg = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
        group.items.forEach((it, i) => {
            html += `
            <tr style="background:${bg}; cursor:pointer;" class="prod-pur-rep-row" data-billno="${group.billNo}">
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billNo : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billDate : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.vendor : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.product}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.model}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.qty}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.rate}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.discount}</td>
              <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.tax}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.total}</td>
            </tr>
            `;
        });
    });

    // Grand Total
    html += `
    <tr style="background:#cbd5e1; font-weight:bold; font-size:0.9rem;">
      <td colspan="8" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right;">G.Total</td>
      <td class="col-gst" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#166534;">${gTotalTax.toFixed(2)}</td>
      <td style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#1e3b8b;">${gTotalAmount.toFixed(2)}</td>
    </tr>
    `;

    tbody.innerHTML = html;
    lblTotalAmt.textContent = `Total Amt: ${gTotalAmount.toFixed(2)}`;

    const summaryBox = overlayEl.querySelector("#prod-pur-rep-summary-box");
    if (summaryBox) {
      const summaryHTML = Object.entries(productQtyTotals)
        .map(([key, info]) => `<span>${info.name} - <span style="color:#1e3b8b;">${info.qty.toFixed(2).replace(/\.00$/, '')} ${info.unit}</span></span>`)
        .join("<span style='color:#94a3b8; font-weight:normal; margin: 0 4px;'>|</span>");
      summaryBox.innerHTML = summaryHTML || "No product records found.";
    }

    // Attach double click to open invoice
    overlayEl.querySelectorAll(".prod-pur-rep-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const bNo = row.getAttribute("data-billno");
        const invoice = invoices.find(inv => String(inv.id) === String(bNo));
        if (invoice) {
           import("./transactions.js").then(m => {
             m.showRecordPurchaseModal(container, invoice);
           });
        }
      });
    });
  });

  // Auto-reload on dropdown/input changes
  overlayEl.querySelectorAll(".form-control, select, input").forEach(input => {
    input.addEventListener("change", () => btnView.click());
    input.addEventListener("input", () => btnView.click());
  });

  // trigger view initially
  btnView.click();
}




export function showItemWisePurchaseAnalysisModal(container) {
  const root = document.getElementById("modal-container-root") || container;
  const materials = state.getMaterials();
  const invoices = state.getPurchases();
  const contacts = state.getContacts();
  const vendors = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);
  const products = [...new Set(materials.map(m => m.name).filter(Boolean))];
  const models = [...new Set(materials.map(m => m.code || m.model).filter(Boolean))];
  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];
  const productGroups = [...new Set(materials.map(m => m.productGroup).filter(Boolean))];
  const companies = [...new Set(materials.map(m => m.company).filter(Boolean))];

  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = `
    <div class="modal-overlay active" id="item-wise-purchase-analysis-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <style>
        .item-pur-rep-hide-gst .col-gst { display: none !important; }
        .item-pur-rep-hide-margin .col-margin { display: none !important; }
      </style>
      <div class="modal-container modal-lg" style="width: 80vw; height:80vh; max-width:1400px; background-color:#dbeafe; color:#0f172a; padding:8px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header Ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-chart-bar"></i> ITEM WISE PURCHASE ANALYSIS</div>
          <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="item-pur-rep-close-icon">&times;</button>
        </div>

        <!-- Toolbar area -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; background:#b4c6e7; padding:8px; border:1px solid #8faadc; border-radius:2px;">
          
          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">From:</label>
            <input type="date" id="item-pur-rep-date-from" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${firstDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">To:</label>
            <input type="date" id="item-pur-rep-date-to" class="form-control" style="width:125px; padding:2px; font-size:0.75rem;" value="${lastDay}">
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Product Name:</label>
            <select id="item-pur-rep-prod" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${products.map(p => `<option value="${p}">${p}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Model:</label>
            <select id="item-pur-rep-model" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${models.map(m => `<option value="${m}">${m}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Product Group:</label>
            <select id="item-pur-rep-group" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${productGroups.map(g => `<option value="${g}">${g}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Category:</label>
            <select id="item-pur-rep-category" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Company:</label>
            <select id="item-pur-rep-company" class="form-control" style="width:140px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:2px;">
            <label style="font-weight:bold; font-size:0.75rem;">Vendor Name:</label>
            <select id="item-pur-rep-cust" class="form-control" style="width:180px; padding:2px; font-size:0.75rem;">
              <option value="All">All</option>
              ${vendors.map(c => `<option value="${c.name}">${c.name}</option>`).join("")}
            </select>
          </div>

          <div style="font-weight:bold; font-size:1rem; color:blue; margin-left:auto; margin-bottom:4px;" id="item-pur-rep-total-amt">
            Total Amt: 0.00
          </div>

          <div style="display:flex; gap:6px; margin-bottom:2px;">
            <button type="button" class="btn btn-secondary" id="btn-item-pur-rep-view" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">View</button>
            <button type="button" class="btn btn-secondary" id="btn-item-pur-rep-print" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Print</button>
            <button type="button" class="btn btn-secondary" id="btn-item-pur-rep-close" style="padding:2px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; height:24px; box-shadow:1px 1px 2px white inset;">Close</button>
          </div>
        </div>

        <!-- Table View -->
        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; overflow-x:auto; border-radius:2px;" id="print-area-cust-rep">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black; white-space:nowrap;" id="item-pur-rep-table">
            <thead>
              <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill No</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Bill Date</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Vendor</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Product</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1;">Model</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Discount</th>
                <th class="col-gst" style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">GST</th>
                <th style="padding:6px 4px; border:1px solid #cbd5e1; text-align:right;">Total</th>

              </tr>
            </thead>
            <tbody id="item-pur-rep-tbody">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;
  const overlayEl = tempDiv.firstElementChild;
  root.appendChild(overlayEl);

  const overlay = document.getElementById("item-wise-purchase-analysis-overlay");
  const close = () => { overlay.remove(); };

  overlayEl.querySelector("#item-pur-rep-close-icon").addEventListener("click", close);
  overlayEl.querySelector("#btn-item-pur-rep-close").addEventListener("click", close);

  // Dynamic cascading filters
  const prodSelect = overlayEl.querySelector("#item-pur-rep-prod");
  const modelSelect = overlayEl.querySelector("#item-pur-rep-model");
  const groupSelect = overlayEl.querySelector("#item-pur-rep-group");
  const categorySelect = overlayEl.querySelector("#item-pur-rep-category");
  const companySelect = overlayEl.querySelector("#item-pur-rep-company");
  const vendorSelect = overlayEl.querySelector("#item-pur-rep-cust");

  const updateCascadingDropdowns = () => {
    const selectedProd = prodSelect.value;
    const selectedModel = modelSelect.value;
    const isFiltered = selectedProd !== "All" || selectedModel !== "All";

    // Update Models
    if (selectedProd !== "All" && selectedModel === "All") {
      const filteredModels = [...new Set(materials.filter(m => m.name === selectedProd).map(m => m.code || m.model).filter(Boolean))];
      modelSelect.innerHTML = '<option value="All">All</option>' + filteredModels.map(m => '<option value="' + m + '">' + m + '</option>').join("");
    } else if (selectedProd === "All" && selectedModel === "All") {
      modelSelect.innerHTML = '<option value="All">All</option>' + models.map(m => '<option value="' + m + '">' + m + '</option>').join("");
    }

    if (isFiltered) {
      // Find matching materials
      const matchedMats = materials.filter(m => {
        let match = true;
        if (selectedProd !== "All" && m.name !== selectedProd) match = false;
        if (selectedModel !== "All" && (m.code || m.model) !== selectedModel) match = false;
        return match;
      });

      // Update Group/Category/Company
      const fg = [...new Set(matchedMats.map(m => m.productGroup).filter(Boolean))];
      const fc = [...new Set(matchedMats.map(m => m.category).filter(Boolean))];
      const fco = [...new Set(matchedMats.map(m => m.company).filter(Boolean))];

      // Keep current value if still valid, otherwise reset to All
      const currG = groupSelect.value, currC = categorySelect.value, currCo = companySelect.value;
      groupSelect.innerHTML = '<option value="All">All</option>' + fg.map(x => '<option value="' + x + '">' + x + '</option>').join("");
      if (fg.includes(currG)) groupSelect.value = currG;
      categorySelect.innerHTML = '<option value="All">All</option>' + fc.map(x => '<option value="' + x + '">' + x + '</option>').join("");
      if (fc.includes(currC)) categorySelect.value = currC;
      companySelect.innerHTML = '<option value="All">All</option>' + fco.map(x => '<option value="' + x + '">' + x + '</option>').join("");
      if (fco.includes(currCo)) companySelect.value = currCo;

      // Update Vendors based on purchases
      const validMatIds = new Set(matchedMats.map(m => m.id));
      const validMatCodes = new Set(matchedMats.map(m => m.code).filter(Boolean));
      const validVendors = new Set();

      invoices.forEach(inv => {
        const hasMat = inv.items.some(it => validMatIds.has(it.materialId) || validMatCodes.has(it.code));
        if (hasMat && inv.contactName) validVendors.add(inv.contactName);
      });

      const currV = vendorSelect.value;
      vendorSelect.innerHTML = '<option value="All">All</option>' + Array.from(validVendors).map(x => '<option value="' + x + '">' + x + '</option>').join("");
      if (validVendors.has(currV)) vendorSelect.value = currV;

    } else {
      // Reset everything to original arrays
      const currG = groupSelect.value, currC = categorySelect.value, currCo = companySelect.value, currV = vendorSelect.value;
      groupSelect.innerHTML = '<option value="All">All</option>' + productGroups.map(x => '<option value="' + x + '">' + x + '</option>').join("");
      if (productGroups.includes(currG)) groupSelect.value = currG;
      categorySelect.innerHTML = '<option value="All">All</option>' + categories.map(x => '<option value="' + x + '">' + x + '</option>').join("");
      if (categories.includes(currC)) categorySelect.value = currC;
      companySelect.innerHTML = '<option value="All">All</option>' + companies.map(x => '<option value="' + x + '">' + x + '</option>').join("");
      if (companies.includes(currCo)) companySelect.value = currCo;
      vendorSelect.innerHTML = '<option value="All">All</option>' + vendors.map(c => '<option value="' + c.name + '">' + c.name + '</option>').join("");
      if (vendors.some(v => v.name === currV)) vendorSelect.value = currV;
    }
  };

  prodSelect.addEventListener("change", () => {
    modelSelect.value = "All"; // Reset model when product changes
    updateCascadingDropdowns();
  });
  modelSelect.addEventListener("change", updateCascadingDropdowns);

  overlayEl.querySelector("#btn-item-pur-rep-print").addEventListener("click", () => {
    const printContent = overlayEl.querySelector("#print-area-cust-rep").innerHTML;
    const hideGst = false;
    const hideMargin = false;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>ITEM WISE PURCHASE ANALYSIS</title>
          <style>
            body { font-family: sans-serif; font-size: 0.8rem; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background-color: #f0f0f0; }
            ${hideGst ? '.col-gst { display: none !important; }' : ''}
            ${hideMargin ? '.col-margin { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <h2>Product Group Wise Purchase Report</h2>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });

  const btnView = overlayEl.querySelector("#btn-item-pur-rep-view");
  const tbody = overlayEl.querySelector("#item-pur-rep-tbody");
  const lblTotalAmt = overlayEl.querySelector("#item-pur-rep-total-amt");

  btnView.addEventListener("click", () => {
    const fFrom = overlayEl.querySelector("#item-pur-rep-date-from").value;
    const fTo = overlayEl.querySelector("#item-pur-rep-date-to").value;
    const fCust = overlayEl.querySelector("#item-pur-rep-cust").value;
    const fGroup = overlayEl.querySelector("#item-pur-rep-group").value;
    const fProduct = overlayEl.querySelector("#item-pur-rep-prod").value;
    const fModel = overlayEl.querySelector("#item-pur-rep-model").value;
    const fCategory = overlayEl.querySelector("#item-pur-rep-category").value;
    const fCompany = overlayEl.querySelector("#item-pur-rep-company").value;

    // Filter invoices by date
    const filteredInvoices = invoices.filter(inv => {
      let ok = true;
      if (fFrom) ok = ok && (inv.date >= fFrom);
      if (fTo) ok = ok && (inv.date <= fTo);
      return ok;
    });

    let groupedData = {};
    let gTotalTax = 0;
    let gTotalAmount = 0;
    let gTotalMargin = 0;

    filteredInvoices.forEach(inv => {
      // Check vendor filter
      if (fCust !== "All" && inv.contactName !== fCust) return;
      
      inv.items.forEach((item, index) => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        if (!mat) return;
        
        if (fGroup !== "All" && mat.productGroup !== fGroup) return;
        if (fProduct !== "All" && mat.name !== fProduct) return;
        if (fModel !== "All" && (mat.code || mat.model) !== fModel) return;
        if (fCategory !== "All" && mat.category !== fCategory) return;
        if (fCompany !== "All" && mat.company !== fCompany) return;
        
        let itemTaxPercent = parseFloat(item.gstPercent || item.taxPercent || mat.taxPercent || inv.taxRate || 0);

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const discountVal = parseFloat(item.discountAmount || 0);
        
        // Exclusive purchase amount
        let exclusiveAmt = parseFloat(item.netValue || item.amount || ((qty * rate) - discountVal));
        
        // GST Calculation
        let taxVal = parseFloat(item.gstAmount || item.taxAmount || 0);
        if (taxVal === 0 && itemTaxPercent > 0) {
            taxVal = exclusiveAmt * (itemTaxPercent / 100);
        }
        
        let inclusiveAmt = parseFloat(item.netAmount || (exclusiveAmt + taxVal));
        
        const finalItemTotal = inclusiveAmt;

        // Margin
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : (parseFloat(mat?.purchaseRate) || 0);

        const basePrice = parseFloat(item.amount) || (qty * rate);
        const itemDiscount = parseFloat(item.discountAmount) || 0;
        const sellingPrice = parseFloat(item.netValue) || (basePrice - itemDiscount);
        
        const itemCost = purchaseCost * qty;
        let margin = sellingPrice - itemCost;

        if (!groupedData[inv.id]) {
          groupedData[inv.id] = {
            billNo: inv.id,
            billDate: inv.date,
            vendor: inv.contactName,
            purchaseMan: inv.purchaseMan || '',
            items: [],
            totalTax: 0,
            totalAmt: 0,
            totalMargin: 0
          };
        }

        groupedData[inv.id].items.push({
          product: item.name,
          model: mat.code || mat.model || "",
          qty: `${qty} ${mat.unit || ''}`.trim(),
          rate: rate.toFixed(2),
          discount: discountVal.toFixed(2),
          tax: taxVal.toFixed(2),
          total: finalItemTotal.toFixed(2),
          margin: margin.toFixed(2)
        });

        groupedData[inv.id].totalTax += taxVal;
        groupedData[inv.id].totalAmt += finalItemTotal;
        groupedData[inv.id].totalMargin += margin;

        gTotalTax += taxVal;
        gTotalAmount += finalItemTotal;
        gTotalMargin += margin;
      });
      
    });

    let html = "";
    Object.values(groupedData).forEach((group, idx) => {
        const bg = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
        group.items.forEach((it, i) => {
            html += `
            <tr style="background:${bg}; cursor:pointer;" class="item-pur-rep-row" data-billno="${group.billNo}">
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billNo : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.billDate : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${i === 0 ? group.vendor : ''}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.product}</td>
              <td style="padding:4px; border:1px solid #cbd5e1;">${it.model}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.qty}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.rate}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.discount}</td>
              <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.tax}</td>
              <td style="padding:4px; border:1px solid #cbd5e1; text-align:right;">${it.total}</td>
            </tr>
            `;
        });
        
        // Bill Total Row
        html += `
        <tr style="background:#e2e8f0; font-weight:bold;">
          <td colspan="8" style="padding:4px; border:1px solid #cbd5e1; text-align:right;">Total</td>
          <td class="col-gst" style="padding:4px; border:1px solid #cbd5e1; text-align:right; color:#166534;">${group.totalTax.toFixed(2)}</td>
          <td style="padding:4px; border:1px solid #cbd5e1; text-align:right; color:#1e3b8b;">${group.totalAmt.toFixed(2)}</td>
        </tr>
        `;
    });

    // Grand Total
    html += `
    <tr style="background:#cbd5e1; font-weight:bold; font-size:0.9rem;">
      <td colspan="8" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right;">G.Total</td>
      <td class="col-gst" style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#166534;">${gTotalTax.toFixed(2)}</td>
      <td style="padding:6px 4px; border:1px solid #94a3b8; text-align:right; color:#1e3b8b;">${gTotalAmount.toFixed(2)}</td>
    </tr>
    `;

    tbody.innerHTML = html;
    lblTotalAmt.textContent = `Total Amt: ${gTotalAmount.toFixed(2)}`;

    // Attach double click to open invoice
    overlayEl.querySelectorAll(".item-pur-rep-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const bNo = row.getAttribute("data-billno");
        const invoice = invoices.find(inv => String(inv.id) === String(bNo));
        if (invoice) {
           import("./transactions.js").then(m => {
             m.showRecordPurchaseModal(container, invoice);
           });
        }
      });
    });
  });

  // trigger view initially
  btnView.click();
}


