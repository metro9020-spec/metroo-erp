import { state } from "../state.js";
import { renderPrintHeaderHtml, formatDateDisplay } from "./reports.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";
import { showInvoicePrintPreview } from "./invoices.js";

export function showSalesReportModal(container) {
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const modalId = "sales-report-overlay";
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    existing.style.zIndex = String(2000 + root.children.length * 10);
    return;
  }

  const materials = state.getMaterials();
  const invoices = state.getInvoices();
  const contacts = state.getContacts();
  const customers = contacts
    .filter(c => c.type === "customer" || c.listInCustomerList === true)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

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
        ${renderPrintHeaderHtml("SALES REGISTER / REPORT", "Period: " + formatDateDisplay(firstDay) + " to " + formatDateDisplay(lastDay))}

        <!-- Header ribbon -->
        <div class="no-print" style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-folder-open"></i> SALES REPORT & REGISTER</div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="rep-close-btn">&times;</button>
        </div>

        <!-- Upper Control Dashboard Grid -->
        <div class="no-print" style="display:grid; grid-template-columns: 340px 1fr 280px; gap:10px; background:#b4c6e7; padding:10px; border:1px solid #8faadc; border-radius:2px; align-items:start;">
          
          <!-- Radio Options Group (Left Panel) -->
          <div style="background:#d9e1f2; border:1px solid #8faadc; padding:6px; border-radius:2px; display:grid; grid-template-columns: 1fr 1fr; gap:6px 4px;">
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="all" checked> All</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="billseries"> Bill Series</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="billno"> Bill No</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="billamount"> Bill Amount</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="user"> User</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="customer"> Customer</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="area"> Area</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="company"> Company</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="product"> Product</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="group"> Product Group</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="code"> Code/Model</label>
            <label style="display:flex; align-items:center; gap:4px; font-weight:bold; cursor:pointer;"><input type="radio" name="rep-mode" value="category"> Category</label>
          </div>

          <!-- Dynamic Middle Filters (Populated contextually based on Radio selection) -->
          <div id="dynamic-filters-box" style="display:flex; flex-wrap:wrap; gap:8px; align-content:start;">
            <!-- Rendered contextually -->
          </div>

          <!-- Extra Checkboxes and Print actions (Right Panel) -->
          <div style="display:flex; flex-direction:column; gap:8px; align-items:end;">
            <div style="display:flex; flex-direction:column; gap:4px; align-self:start;">
              <label style="display:flex; align-items:center; gap:6px; font-weight:bold; cursor:pointer;"><input type="checkbox" id="chk-daywise"> Daywise</label>
              <label style="display:flex; align-items:center; gap:6px; font-weight:bold; cursor:pointer;"><input type="checkbox" id="chk-include-return"> Include Sales Return</label>
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
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="sales-report-table">
            <!-- Headers and rows rendered dynamically -->
          </table>
        </div>

      </div>
    </div>
  `;

  root.appendChild(modalEl);
  const overlay = modalEl;
  initTallyDatePickers(overlay);

  let selectedInvoiceId = null;

  const close = () => { overlay.remove(); };

  modalEl.querySelector("#rep-close-btn")?.addEventListener("click", close);
  modalEl.querySelector("#btn-rep-close")?.addEventListener("click", close);
  modalEl.querySelector("#btn-rep-print")?.addEventListener("click", () => window.print());
  modalEl.querySelector("#btn-rep-print-bill")?.addEventListener("click", () => {
    if (selectedInvoiceId) {
      showInvoicePrintPreview(document.body, selectedInvoiceId);
    } else {
      const invs = state.getInvoices();
      if (invs && invs.length > 0) {
        showInvoicePrintPreview(document.body, invs[invs.length - 1].id);
      } else {
        alert("No invoice selected to print.");
      }
    }
  });



  const dynamicBox = document.getElementById("dynamic-filters-box");
  const dateFromEl = document.getElementById("rep-date-from");
  const dateToEl = document.getElementById("rep-date-to");
  const tableEl = document.getElementById("sales-report-table");

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
    } else if (mode === "customer") {
      dynamicBox.innerHTML = `
        <fieldset style="border: 1px solid #8faadc; padding: 4px 10px; border-radius: 2px; background:#d9e1f2;">
          <legend style="font-weight:bold; font-size:0.72rem; color:#1e3b8b;">Select Customer</legend>
          <select id="filt-customer" class="form-control" style="padding:2px; font-size:0.75rem; background:white; color:black; width:220px;">
            <option value="All">All</option>
            <option value="__CASH__">CASH SALES</option>
            ${customers.map(cust => `<option value="${cust.id}">${cust.name}</option>`).join("")}
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
    
    // Filter invoices by Date Range
    let filteredInvoices = invoices.filter(inv => {
      let ok = true;
      if (fromDate) ok = ok && (inv.date >= fromDate);
      if (toDate) ok = ok && (inv.date <= toDate);
      return ok;
    });

    // Sub-filters context check
    if (mode === "customer") {
      const custId = document.getElementById("filt-customer")?.value || "All";
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
      
      // We map line items and group them
      let grouped = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const brand = (mat && mat.company) ? mat.company : "UNAVAILABLE";
          if (compBrand === "All" || brand === compBrand) {
            const key = `${brand}_${item.name}_${item.code}`;
            if (!grouped[key]) {
              grouped[key] = {
                companyName: brand,
                productName: item.name,
                codeModel: item.code,
                qty: 0,
                amount: 0
              };
            }
            grouped[key].qty += parseFloat(item.quantity) || 0;
            grouped[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });

      let rows = Object.values(grouped);

      // Sum totals
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
      const selectedCompany = document.getElementById("filt-company")?.value || "All";
      const selectedSubCategory = document.getElementById("filt-subcategory")?.value || "All";
      const selectedCategory = document.getElementById("filt-category")?.value || "All";

      let rows = [];
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const comp = (mat && mat.company) ? mat.company : "UNAVAILABLE";
          const cat = (mat && mat.category) ? mat.category : "UNAVAILABLE";
          const subcat = (mat && mat.subCategory) ? mat.subCategory : "All";

          if (selectedCompany !== "All" && comp !== selectedCompany) return;
          if (selectedSubCategory !== "All" && subcat !== selectedSubCategory) return;
          if (selectedCategory !== "All" && cat !== selectedCategory) return;

          rows.push({
            category: cat,
            qty: parseFloat(item.quantity) || 0,
            amount: parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0
          });
        });
      });

      // Group rows by category
      const grouped = {};
      rows.forEach(r => {
        if (!grouped[r.category]) {
          grouped[r.category] = { category: r.category, qty: 0, amount: 0 };
        }
        grouped[r.category].qty += r.qty;
        grouped[r.category].amount += r.amount;
      });

      const groupedRows = Object.values(grouped);
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
      
      let grouped = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const comp = (mat && mat.company) ? mat.company : "UNAVAILABLE";
          const cat = (mat && mat.category) ? mat.category : "UNAVAILABLE";

          if (selectedProdName === "All" || item.name === selectedProdName) {
            const key = `${item.name}_${item.code}_${comp}_${cat}`;
            if (!grouped[key]) {
              grouped[key] = {
                productName: item.name,
                codeModel: item.code,
                company: comp,
                category: cat,
                qty: 0,
                amount: 0
              };
            }
            grouped[key].qty += parseFloat(item.quantity) || 0;
            grouped[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });

      let rows = Object.values(grouped);

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
      const selectedGroup = document.getElementById("filt-group-select")?.value || "All";
      
      let grouped = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const group = (mat && mat.productGroup) ? mat.productGroup : "UNAVAILABLE";

          if (selectedGroup === "All" || group === selectedGroup) {
            const key = `${group}_${item.name}`;
            if (!grouped[key]) {
              grouped[key] = {
                groupName: group,
                productName: item.name,
                qty: 0,
                amount: 0
              };
            }
            grouped[key].qty += parseFloat(item.quantity) || 0;
            grouped[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });
      let rows = Object.values(grouped);

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
      
      let grouped = {};
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
          const comp = (mat && mat.company) ? mat.company : "UNAVAILABLE";

          if (selectedCode === "All" || item.code === selectedCode) {
            const key = `${item.code}_${item.name}_${comp}`;
            if (!grouped[key]) {
              grouped[key] = {
                codeModel: item.code,
                productName: item.name,
                companyName: comp,
                qty: 0,
                amount: 0
              };
            }
            grouped[key].qty += parseFloat(item.quantity) || 0;
            grouped[key].amount += parseFloat(item.netAmount || item.netValue || (item.quantity * item.price)) || 0;
          }
        });
      });

      let rows = Object.values(grouped);

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
        customerName: inv.contactName,
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
            <th style="padding:6px; border:1px solid #cbd5e1;">Customer Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Bill Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1; cursor:pointer;" class="sales-rep-row" data-inv-id="${r.billNo}">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.slNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${r.billNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.customerName}</td>
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
      bindRowEvents();
      return;
    }

    if (mode === "customer") {
      let rows = filteredInvoices.map(inv => ({
        customerName: inv.contactName,
        billDate: formatDate(inv.date),
        billNo: inv.id,
        amount: inv.total || 0
      }));

      const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

      tableEl.innerHTML = `
        <thead>
          <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Customer Name</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">BillDate</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">BillNo</th>
            <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #cbd5e1; cursor:pointer;" class="sales-rep-row" data-inv-id="${r.billNo}">
              <td style="padding:4px 6px; border:1px solid #cbd5e1;"><strong>${r.customerName}</strong></td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billNo}</td>
              <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.amount.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
            <td colspan="3" style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Total Sales:</td>
            <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
          </tr>
        </tbody>
      `;
      bindRowEvents();
      return;
    }

    // Default "All" Layout
    let rows = filteredInvoices.map(inv => ({
      billDate: formatDate(inv.date),
      billNo: inv.id,
      refNo: inv.refNo || "",
      customerName: inv.contactName,
      salesAmount: inv.total || 0
    }));

    const totalAmt = rows.reduce((s, r) => s + r.salesAmount, 0);

    tableEl.innerHTML = `
      <thead>
        <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
          <th style="padding:6px; border:1px solid #cbd5e1;">Bill Date</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Bill No.</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Ref No</th>
          <th style="padding:6px; border:1px solid #cbd5e1;">Customer Name</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Sales Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr style="border-bottom:1px solid #cbd5e1; cursor:pointer;" class="sales-rep-row" data-inv-id="${r.billNo}">
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.billDate}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${r.billNo}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.refNo}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.customerName}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:right;">${r.salesAmount.toFixed(2)}</td>
          </tr>
        `).join("")}
        <tr style="background:#e2e8f0; font-weight:bold; border-top: 2px solid #475569;">
          <td colspan="4" style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Total Sales:</td>
          <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${totalAmt.toFixed(2)}</td>
        </tr>
      </tbody>
    `;
    bindRowEvents();

    function bindRowEvents() {
      tableEl.querySelectorAll(".sales-rep-row").forEach(row => {
        row.addEventListener("click", () => {
          tableEl.querySelectorAll(".sales-rep-row").forEach(r => r.style.background = "");
          row.style.background = "#dbeafe";
          selectedInvoiceId = row.getAttribute("data-inv-id");
        });
        row.addEventListener("dblclick", () => {
          const invId = row.getAttribute("data-inv-id");
          if (invId) showInvoicePrintPreview(document.body, invId);
        });
      });
    }
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
  const invoices = state.getInvoices();
  const contacts = state.getContacts();
  const customers = contacts
    .filter(c => c.type === "customer" || c.listInCustomerList === true)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

  // Default dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="margin-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1050px; width: 94vw; height:82vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div id="margin-rep-title">Sales Wise Margin Report</div>
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
              <span style="font-weight:bold; font-size:0.75rem; white-space:nowrap;">Customer Name:</span>
              <select id="margin-customer-select" class="form-control" style="padding:2px; font-size:0.72rem; background:white; color:black; height:22px; width:100%; max-width:200px;">
                <option value="All">All</option>
                <option value="__CASH__">CASH SALES</option>
                ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
              </select>
            </div>
            
            <div style="display:flex; align-items:center; gap:4px; flex-grow:1; min-width:180px;">
              <span style="font-weight:bold; font-size:0.75rem; white-space:nowrap;">Paymode:</span>
              <select id="margin-paymode-select" class="form-control" style="padding:2px; font-size:0.72rem; background:white; color:black; height:22px; width:100%; max-width:150px;">
                <option value="All">All</option>
                <option value="Credit">Credit</option>
                ${state.getLedgers().filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS").map(l => `<option value="${l.name}">${l.name}</option>`).join("")}
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
    const selectedCust = document.getElementById("margin-customer-select").value;
    const selectedPaymode = document.getElementById("margin-paymode-select").value;

    // Filter invoices
    let filtered = invoices.filter(inv => {
      if (inv.isCancelled) return false;
      let ok = true;
      if (fromDate) ok = ok && (inv.date >= fromDate);
      if (toDate) ok = ok && (inv.date <= toDate);
      if (selectedCust !== "All") ok = ok && (inv.contactId === selectedCust);
      if (selectedPaymode !== "All") {
        ok = ok && ((inv.payMode || "Credit") === selectedPaymode);
      }
      
      // cash vs credit check
      if (type === "cash") {
        ok = ok && (inv.paidAmount > 0 || String(inv.status).toLowerCase() === "paid");
      } else if (type === "credit") {
        ok = ok && (inv.paidAmount === 0 || String(inv.status).toLowerCase() === "unpaid");
      }
      return ok;
    });

    // Update title dates dynamically
    document.getElementById("margin-rep-title").textContent = `Sales Wise Margin Report (${formatDate(fromDate)} To ${formatDate(toDate)})`;

    let rows = [];
    filtered.forEach((inv, idx) => {
      let billMargin = 0;
      let costSum = 0;
      
      inv.items.forEach(item => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : 0;
        
        // Selling Price (without adjustment or GST) after discount:
        const sellingPrice = parseFloat(item.amount) || (item.quantity * item.price);
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
        customerName: inv.contactName,
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
          <th style="padding:6px; border:1px solid #cbd5e1;">Customer Name</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width: 150px;">Bill Amt</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width: 150px;">Margin</th>
          <th style="padding:6px; border:1px solid #cbd5e1; text-align:right; width: 120px;">Margin%</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr tabindex="0" data-bill-no="${r.billNo || ''}" data-cust-name="${r.customerName}" data-date="${r.date}" style="border-bottom:1px solid #cbd5e1; cursor:pointer; transition: background-color 0.1s; outline:none;">
            <td style="padding:4px 6px; border:1px solid #cbd5e1; font-weight:bold;">${r.date}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1; text-align:center;">${r.slNo}</td>
            <td class="td-bill-no" style="padding:4px 6px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; color:#1e3b8b;">${r.billNo || ''}</td>
            <td style="padding:4px 6px; border:1px solid #cbd5e1;">${r.customerName}</td>
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

  if (dateFromEl) {
    dateFromEl.addEventListener("change", renderMarginGrid);
    dateFromEl.addEventListener("input", renderMarginGrid);
  }
  if (dateToEl) {
    dateToEl.addEventListener("change", renderMarginGrid);
    dateToEl.addEventListener("input", renderMarginGrid);
  }
  renderMarginGrid();
}

export function showProductwiseMarginReportModal(container) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();
  const invoices = state.getInvoices();

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

    // Filter invoices by Date Range
    let filteredInvoices = invoices.filter(inv => {
      let ok = true;
      if (fromDate) ok = ok && (inv.date >= fromDate);
      if (toDate) ok = ok && (inv.date <= toDate);
      return ok;
    });

    // We map every line item in the filtered invoices matching the selected product name
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
        
        const sellingPrice = parseFloat(item.amount) || (item.quantity * item.price);
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
  const invoices = state.getInvoices();
  let inv = null;

  if (billNo) {
    // Try exact match
    inv = invoices.find(i => 
      String(i.id).toLowerCase() === String(billNo).toLowerCase() ||
      (i.voucherNo && String(i.voucherNo).toLowerCase() === String(billNo).toLowerCase())
    );

    // Fallback to substring matching
    if (!inv) {
      inv = invoices.find(i => 
        String(i.id).toLowerCase().includes(String(billNo).toLowerCase()) ||
        String(billNo).toLowerCase().includes(String(i.id).toLowerCase())
      );
    }
  }

  // Fallback match using customer name and date if billNo search fails
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

    inv = invoices.find(i => 
      String(i.contactName).toLowerCase() === String(fallbackCustName).toLowerCase() &&
      String(i.date) === String(parsedDate)
    );
  }

  if (!inv) {
    alert(`Bill details not found!`);
    return;
  }

  // Load the actual sales bill window modal
  import("./transactions.js").then(m => {
    const customers = state.getContacts().filter(c => c.type === "customer" || c.listInCustomerList === true);
    const materials = state.getMaterials();
    const windowContentEl = document.getElementById("window-content-area") || document.body;
    
    m.showInvoiceBuilderModal(windowContentEl, customers, materials, () => {
      // Re-trigger show on the margin report grid to sync updated figures
      const btnShow = document.getElementById("btn-margin-show");
      if (btnShow) btnShow.click();
    }, inv);
  }).catch(err => {
    console.error("Failed to load invoice editor modal", err);
  });
}
