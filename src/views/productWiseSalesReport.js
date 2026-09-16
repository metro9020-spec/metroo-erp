import { state } from "../state.js";
import { showInvoiceDetailPopup } from "./salesReport.js";
import { formatDate } from "../utils/dateUtils.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";

export function showProductWiseDetailedReportModal(container) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();
  const invoices = state.getInvoices();
  const contacts = state.getContacts();
  const customers = contacts.filter(c => c.type === "customer" || c.listInCustomerList === true);

  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];
  const subCategories = [...new Set(materials.map(m => m.subCategory || "All").filter(Boolean))];

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="prodwise-detail-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1400px; width: 98vw; height:92vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice"></i> CUSTOMER WISE SALES REPORT</div>
          <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="prodwise-det-close-x">&times;</button>
        </div>

        <div style="background:#b4c6e7; padding:6px 10px; border:1px solid #8faadc; border-radius:2px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; flex-wrap:wrap; gap:15px; align-items:center;">
            <div style="display:flex; gap:6px; align-items:center;">
              <strong>From:</strong> ${renderTallyDatePickerHtml({ id: "pwd-date-from", value: firstDay, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <strong>To:</strong> ${renderTallyDatePickerHtml({ id: "pwd-date-to", value: lastDay, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>



          </div>
          
          <div style="display:flex; flex-wrap:wrap; gap:15px; align-items:center;">
            <div style="display:flex; gap:6px; align-items:center; flex-grow:1; max-width:400px;">
              <strong>Customer Name:</strong>
              <select id="pwd-customer" class="form-control" style="padding:2px; font-size:0.75rem; width:100%;">
                <option value="All">All</option>
                <option value="__CASH__">CASH SALES</option>
                ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="checkbox" id="pwd-chk-margin" checked> <label for="pwd-chk-margin" style="font-weight:bold; margin:0;">Margin</label>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="checkbox" id="pwd-chk-inclusive"> <label for="pwd-chk-inclusive" style="font-weight:bold; margin:0;">Inclusive Tax</label>
            </div>
            <div style="color:blue; font-weight:bold; font-size:1.1rem; margin-left:10px;">
              Total Amt: <span id="pwd-total-amt">0.00</span>
            </div>
            <div style="display:flex; gap:6px; margin-left:auto;">
              <button type="button" class="btn btn-secondary" id="btn-pwd-view" style="padding:4px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; box-shadow:1px 1px 2px white inset;">View</button>
              <button type="button" class="btn btn-secondary" id="btn-pwd-print" style="padding:4px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; box-shadow:1px 1px 2px white inset;">Print</button>
              <button type="button" class="btn btn-secondary" id="btn-pwd-close" style="padding:4px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; box-shadow:1px 1px 2px white inset;">Close</button>
            </div>
          </div>
        </div>

        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="pwd-report-table">
            <thead>
              <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
                <th style="padding:6px; border:1px solid #cbd5e1; width:50px;">Bill No</th>
                <th style="padding:6px; border:1px solid #cbd5e1; width:80px;">Bill Date</th>
                <th style="padding:6px; border:1px solid #cbd5e1;">Customer</th>
                <th style="padding:6px; border:1px solid #cbd5e1;">Product</th>
                <th style="padding:6px; border:1px solid #cbd5e1;">Code/Model</th>
                <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
                <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
                <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Discount</th>
                <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Taxable</th>
                <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">GST</th>
                <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Total</th>
                <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Margin</th>
              </tr>
            </thead>
            <tbody>
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `;



  const overlay = document.getElementById("prodwise-detail-report-overlay");
  initTallyDatePickers(overlay);

  const close = () => { overlay.remove(); };
  document.getElementById("prodwise-det-close-x").addEventListener("click", close);
  document.getElementById("btn-pwd-close").addEventListener("click", close);
  document.getElementById("btn-pwd-print").addEventListener("click", () => window.print());
  document.getElementById("pwd-chk-margin").addEventListener("change", renderGrid);
  document.getElementById("pwd-chk-inclusive").addEventListener("change", renderGrid);

  // Generate date format (DD/MM/YYYY)

  function renderGrid() {
    const fromDate = document.getElementById("pwd-date-from").value;
    const toDate = document.getElementById("pwd-date-to").value;
    const cat = document.getElementById("pwd-category")?.value || "All";
    const subcat = document.getElementById("pwd-subcategory")?.value || "All";
    const cust = document.getElementById("pwd-customer").value;
    const showMargin = document.getElementById("pwd-chk-margin").checked;
    const inclusiveTax = document.getElementById("pwd-chk-inclusive").checked;

    document.getElementById("pwd-report-table").querySelector("thead").innerHTML = `
      <tr style="background-color:#1e3b8b; color:white; font-weight:bold; position:sticky; top:0;">
        <th style="padding:6px; border:1px solid #cbd5e1; width:50px;">Bill No</th>
        <th style="padding:6px; border:1px solid #cbd5e1; width:80px;">Bill Date</th>
        <th style="padding:6px; border:1px solid #cbd5e1;">Customer</th>
        <th style="padding:6px; border:1px solid #cbd5e1;">Product</th>
        <th style="padding:6px; border:1px solid #cbd5e1;">Code/Model</th>
        <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Qty</th>
        <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
        <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Discount</th>
        ${!inclusiveTax ? '<th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Taxable</th>' : ''}
        ${!inclusiveTax ? '<th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">GST</th>' : ''}
        <th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Total</th>
        ${showMargin ? '<th style="padding:6px; border:1px solid #cbd5e1; text-align:right;">Margin</th>' : ''}
      </tr>
    `;

    let filtered = invoices.filter(inv => {
      if (inv.isCancelled) return false;
      let ok = true;
      if (fromDate) ok = ok && (inv.date >= fromDate);
      if (toDate) ok = ok && (inv.date <= toDate);
      if (cust !== "All") ok = ok && (inv.contactId === cust);
      return ok;
    });

    let html = "";
    let grandTotalTaxable = 0;
    let grandTotalTax = 0;
    let grandTotalTotal = 0;
    let grandTotalMargin = 0;

    filtered.forEach(inv => {
      let invAdjAmount = 0;
      if (inv.adjustmentsList && Array.isArray(inv.adjustmentsList)) {
         invAdjAmount = inv.adjustmentsList.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
      }

      let billHasMatchingItems = false;
      let billTaxable = 0;
      let billTax = 0;
      let billTotal = 0;
      let billMargin = 0;
      let billRowsHtml = "";

      inv.items.forEach((item, index) => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        const itemCat = mat?.category || "UNAVAILABLE";
        const itemSub = mat?.subCategory || "All";

        if (cat !== "All" && itemCat !== cat) return;
        if (subcat !== "All" && itemSub !== subcat) return;

        billHasMatchingItems = true;

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const disc = parseFloat(item.discountAmount) || 0;
        const taxAmt = parseFloat(item.gstAmount) || ((parseFloat(item.cgstAmount) || 0) + (parseFloat(item.sgstAmount) || 0) + (parseFloat(item.igstAmount) || 0));
        
        const rowTotal = parseFloat(item.netAmount) || parseFloat(item.amount) || ((qty * rate) - disc); // Total includes GST
        const sellingPriceExcl = parseFloat(item.netValue) || (rowTotal - taxAmt); // Excludes GST
        
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : 0;
        const itemCost = purchaseCost * qty;
        const itemMargin = sellingPriceExcl - itemCost;

        billTaxable += sellingPriceExcl;
        billTax += taxAmt;
        billTotal += rowTotal;
        billMargin += itemMargin;
        
        const displayedRate = inclusiveTax ? (qty !== 0 ? rate + (taxAmt / qty) : rate) : rate;

        billRowsHtml += `
          <tr tabindex="0" data-bill-no="${inv.id || ''}" data-cust-name="${inv.contactName}" data-date="${inv.date}" style="border-bottom:1px solid #e2e8f0; background:white; cursor:pointer; outline:none;" class="pwd-item-row">
            <td style="padding:4px 6px;" class="td-bill-no">${index === 0 ? inv.id : ''}</td>
            <td style="padding:4px 6px;">${index === 0 ? formatDate(inv.date) : ''}</td>
            <td style="padding:4px 6px;">${index === 0 ? inv.contactName : ''}</td>
            <td style="padding:4px 6px;">${item.name}</td>
            <td style="padding:4px 6px;">${item.code || ''}</td>
            <td style="padding:4px 6px; text-align:right;">${qty} ${mat?.unit || 'Nos'}</td>
            <td style="padding:4px 6px; text-align:right;">${displayedRate.toFixed(2)}</td>
            <td style="padding:4px 6px; text-align:right;">${disc.toFixed(2)}</td>
            ${!inclusiveTax ? `<td style="padding:4px 6px; text-align:right;">${sellingPriceExcl.toFixed(2)}</td>` : ''}
            ${!inclusiveTax ? `<td style="padding:4px 6px; text-align:right;">${taxAmt.toFixed(2)}</td>` : ''}
            <td style="padding:4px 6px; text-align:right; font-weight:bold;">${rowTotal.toFixed(2)}</td>
            ${showMargin ? `<td style="padding:4px 6px; text-align:right; color:#166534;">${itemMargin.toFixed(2)}</td>` : ''}
          </tr>
        `;
      });

      if (billHasMatchingItems) {
         html += billRowsHtml;
         
         // Add adjustment rows if any
         if (inv.adjustmentsList && Array.isArray(inv.adjustmentsList)) {
           inv.adjustmentsList.forEach(adj => {
             const adjAmt = parseFloat(adj.amount) || 0;
             if (adjAmt !== 0) {
               html += `
                <tr tabindex="0" data-bill-no="${inv.id || ''}" data-cust-name="${inv.contactName}" data-date="${inv.date}" style="border-bottom:1px solid #e2e8f0; background:#f8fafc; cursor:pointer; outline:none;" class="pwd-item-row">
                  <td style="padding:4px 6px;"></td>
                  <td style="padding:4px 6px;"></td>
                  <td style="padding:4px 6px;"></td>
                  <td style="padding:4px 6px; font-style:italic; color:#475569;">${adj.name}</td>
                  <td style="padding:4px 6px;"></td>
                  <td style="padding:4px 6px; text-align:right;"></td>
                  <td style="padding:4px 6px; text-align:right;"></td>
                  <td style="padding:4px 6px; text-align:right;"></td>
                  ${!inclusiveTax ? '<td style="padding:4px 6px; text-align:right;"></td>' : ''}
                  ${!inclusiveTax ? '<td style="padding:4px 6px; text-align:right;"></td>' : ''}
                  <td style="padding:4px 6px; text-align:right; font-weight:bold; color:#475569;">${adjAmt.toFixed(2)}</td>
                  ${showMargin ? '<td style="padding:4px 6px; text-align:right;"></td>' : ''}
                </tr>
               `;
             }
           });
         }

         const colSpanTotal = 8;
         html += `
          <tr style="background:#dcfce7; font-weight:bold; border-bottom:2px solid #cbd5e1;">
            <td colspan="${colSpanTotal}" style="padding:4px 6px; text-align:right;">Total</td>
            ${!inclusiveTax ? `<td style="padding:4px 6px; text-align:right;">${billTaxable.toFixed(2)}</td>` : ''}
            ${!inclusiveTax ? `<td style="padding:4px 6px; text-align:right;">${billTax.toFixed(2)}</td>` : ''}
            <td style="padding:4px 6px; text-align:right;">${(billTotal + invAdjAmount).toFixed(2)}</td>
            ${showMargin ? `<td style="padding:4px 6px; text-align:right;">${billMargin.toFixed(2)}</td>` : ''}
          </tr>
         `;
         
         grandTotalTaxable += billTaxable;
         grandTotalTax += billTax;
         grandTotalTotal += (billTotal + invAdjAmount);
         grandTotalMargin += billMargin;
      }
    });

    const colSpanGTotal = 8;
    html += `
      <tr style="background:#e2e8f0; font-weight:bold; border-top:2px solid #475569; font-size:0.9rem;">
        <td colspan="${colSpanGTotal}" style="padding:6px; text-align:right;">G.Total</td>
        ${!inclusiveTax ? `<td style="padding:6px; text-align:right;">${grandTotalTaxable.toFixed(2)}</td>` : ''}
        ${!inclusiveTax ? `<td style="padding:6px; text-align:right;">${grandTotalTax.toFixed(2)}</td>` : ''}
        <td style="padding:6px; text-align:right;">${grandTotalTotal.toFixed(2)}</td>
        ${showMargin ? `<td style="padding:6px; text-align:right; color:#166534;">${grandTotalMargin.toFixed(2)}</td>` : ''}
      </tr>
    `;

    document.getElementById("pwd-report-table").querySelector("tbody").innerHTML = html;
    document.getElementById("pwd-total-amt").innerText = grandTotalTotal.toFixed(2);

    const tbody = document.getElementById("pwd-report-table").querySelector("tbody");
    if (tbody) {
      tbody.querySelectorAll("tr.pwd-item-row").forEach(tr => {
        const handleSelect = () => {
          tbody.querySelectorAll("tr.pwd-item-row").forEach(r => {
            r.style.backgroundColor = "";
            r.style.color = "";
            r.querySelectorAll("td").forEach(td => {
              td.style.color = "";
            });
          });
          tr.style.backgroundColor = "#1e3b8b";
          tr.style.color = "white";
          tr.querySelectorAll("td").forEach(td => {
            td.style.color = "white";
          });
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

  document.getElementById("btn-pwd-view")?.addEventListener("click", renderGrid);

  const pwdFromDate = document.getElementById("pwd-date-from");
  const pwdToDate = document.getElementById("pwd-date-to");
  const pwdCust = document.getElementById("pwd-customer");
  const pwdMargin = document.getElementById("pwd-chk-margin");
  const pwdInclusive = document.getElementById("pwd-chk-inclusive");

  if (pwdFromDate) {
    pwdFromDate.addEventListener("change", renderGrid);
    pwdFromDate.addEventListener("input", renderGrid);
  }
  if (pwdToDate) {
    pwdToDate.addEventListener("change", renderGrid);
    pwdToDate.addEventListener("input", renderGrid);
  }
  if (pwdCust) pwdCust.addEventListener("change", renderGrid);
  if (pwdMargin) pwdMargin.addEventListener("change", renderGrid);
  if (pwdInclusive) pwdInclusive.addEventListener("change", renderGrid);

  renderGrid();
}
