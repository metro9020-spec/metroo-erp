import { state } from "../state.js";
import { showInvoiceDetailPopup } from "./salesReport.js";
import { formatDate } from "../utils/dateUtils.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";

export function showProductWiseSalesReportActualModal(container) {
  const root = document.getElementById("modal-container-root");
  const materials = state.getMaterials();
  const invoices = state.getInvoices();

  const productNames = [...new Set(materials.map(m => m.name).filter(Boolean))].sort();
  const productModels = [...new Set(materials.map(m => m.code || m.id).filter(Boolean))].sort();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];

  root.innerHTML = `
    <div class="modal-overlay active" id="prodwise-actual-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container modal-lg" style="max-width:1400px; width: 98vw; height:92vh; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
        
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-file-invoice"></i> PRODUCT WISE SALES REPORT</div>
          <button type="button" class="win-btn" style="background:none; border:none; color:white; font-size:1rem; cursor:pointer;" id="prodwise-act-close-x">&times;</button>
        </div>

        <div style="background:#b4c6e7; padding:6px 10px; border:1px solid #8faadc; border-radius:2px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; flex-wrap:wrap; gap:15px; align-items:center;">
            <div style="display:flex; gap:6px; align-items:center;">
              <strong>From:</strong> ${renderTallyDatePickerHtml({ id: "pwa-date-from", value: firstDay, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <strong>To:</strong> ${renderTallyDatePickerHtml({ id: "pwa-date-to", value: lastDay, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>



          </div>
          
          <div style="display:flex; flex-wrap:wrap; gap:15px; align-items:center;">
            <div style="display:flex; gap:6px; align-items:center; flex-grow:1; max-width:300px;">
              <strong>Product Name:</strong>
              <select id="pwa-product-name" class="form-control" style="padding:2px; font-size:0.75rem; width:100%;">
                <option value="All">All</option>
                ${productNames.map(name => `<option value="${name}">${name}</option>`).join("")}
              </select>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-grow:1; max-width:300px;">
              <strong>Product Model:</strong>
              <select id="pwa-product-model" class="form-control" style="padding:2px; font-size:0.75rem; width:100%;" disabled>
                <option value="All">All</option>
              </select>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="checkbox" id="pwa-chk-margin" checked> <label for="pwa-chk-margin" style="font-weight:bold; margin:0;">Margin</label>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="checkbox" id="pwa-chk-inclusive"> <label for="pwa-chk-inclusive" style="font-weight:bold; margin:0;">Inclusive Tax</label>
            </div>
            <div style="color:blue; font-weight:bold; font-size:1.1rem; margin-left:10px;">
              Total Amt: <span id="pwa-total-amt">0.00</span>
            </div>
            <div style="display:flex; gap:6px; margin-left:auto;">
              <button type="button" class="btn btn-secondary" id="btn-pwa-view" style="padding:4px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; box-shadow:1px 1px 2px white inset;">View</button>
              <button type="button" class="btn btn-secondary" id="btn-pwa-print" style="padding:4px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; box-shadow:1px 1px 2px white inset;">Print</button>
              <button type="button" class="btn btn-secondary" id="btn-pwa-close" style="padding:4px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; box-shadow:1px 1px 2px white inset;">Close</button>
            </div>
          </div>
        </div>

        <div style="flex-grow:1; background:white; border:1px solid #94a3b8; overflow-y:auto; border-radius:2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;" id="pwa-report-table">
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



  const overlay = document.getElementById("prodwise-actual-report-overlay");
  initTallyDatePickers(overlay);

  const close = () => { overlay.remove(); };
  document.getElementById("prodwise-act-close-x").addEventListener("click", close);
  document.getElementById("btn-pwa-close").addEventListener("click", close);
  document.getElementById("btn-pwa-print").addEventListener("click", () => window.print());
  document.getElementById("pwa-chk-margin").addEventListener("change", renderGrid);
  document.getElementById("pwa-chk-inclusive").addEventListener("change", renderGrid);

  const prodNameSelect = document.getElementById("pwa-product-name");
  const prodModelSelect = document.getElementById("pwa-product-model");

  prodNameSelect.addEventListener("change", () => {
    const selectedName = prodNameSelect.value;
    if (selectedName === "All") {
      prodModelSelect.value = "All";
      prodModelSelect.disabled = true;
      prodModelSelect.innerHTML = `<option value="All">All</option>`;
    } else {
      prodModelSelect.disabled = false;
      const matchingMaterials = materials.filter(m => m.name === selectedName);
      const models = [...new Set(matchingMaterials.map(m => m.code || m.id).filter(Boolean))].sort();
      prodModelSelect.innerHTML = `
        <option value="All">All</option>
        ${models.map(model => `<option value="${model}">${model}</option>`).join("")}
      `;
    }
    renderGrid();
  });

  prodModelSelect.addEventListener("change", renderGrid);


  function renderGrid() {
    const fromDate = document.getElementById("pwa-date-from").value;
    const toDate = document.getElementById("pwa-date-to").value;
    const prodNameFilter = document.getElementById("pwa-product-name").value;
    const prodModelFilter = document.getElementById("pwa-product-model").value;
    const showMargin = document.getElementById("pwa-chk-margin").checked;
    const inclusiveTax = document.getElementById("pwa-chk-inclusive").checked;

    document.getElementById("pwa-report-table").querySelector("thead").innerHTML = `
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
      return ok;
    });

    let html = "";
    let grandTotalTaxable = 0;
    let grandTotalTax = 0;
    let grandTotalTotal = 0;
    let grandTotalMargin = 0;

    filtered.forEach(inv => {
      let billHasMatchingItems = false;
      let billTaxable = 0;
      let billTax = 0;
      let billTotal = 0;
      let billMargin = 0;
      let billRowsHtml = "";
      let hasRenderedBillHeader = false;

      inv.items.forEach((item, index) => {
        const mat = materials.find(m => m.id === item.materialId || m.code === item.code);
        const pName = mat?.name || item.name || "";
        const pModel = mat?.code || item.code || "";

        if (prodNameFilter !== "All" && pName.toUpperCase() !== prodNameFilter.toUpperCase()) return;
        if (prodModelFilter !== "All" && pModel.toUpperCase() !== prodModelFilter.toUpperCase()) return;

        billHasMatchingItems = true;

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const disc = parseFloat(item.discountAmount) || 0;
        const taxAmt = parseFloat(item.gstAmount) || ((parseFloat(item.cgstAmount) || 0) + (parseFloat(item.sgstAmount) || 0) + (parseFloat(item.igstAmount) || 0));
        
        const rowTotal = parseFloat(item.netAmount) || parseFloat(item.amount) || ((qty * rate) - disc);
        const sellingPriceExcl = parseFloat(item.netValue) || (rowTotal - taxAmt);
        
        const batch = mat?.batches?.find(b => b.batchNo === item.batchNo) || mat?.batches?.[0];
        const purchaseCost = batch ? (parseFloat(batch.landingCost) || 0) : 0;
        const itemCost = purchaseCost * qty;
        const itemMargin = sellingPriceExcl - itemCost;

        billTaxable += sellingPriceExcl;
        billTax += taxAmt;
        billTotal += rowTotal;
        billMargin += itemMargin;
        
        const displayedRate = inclusiveTax ? (qty !== 0 ? rate + (taxAmt / qty) : rate) : rate;

        const isFirstMatching = !hasRenderedBillHeader;
        if (isFirstMatching) hasRenderedBillHeader = true;

        billRowsHtml += `
          <tr tabindex="0" data-bill-no="${inv.id || ''}" data-cust-name="${inv.contactName}" data-date="${inv.date}" style="border-bottom:1px solid #e2e8f0; background:white; cursor:pointer; outline:none;" class="pwd-act-item-row">
            <td style="padding:4px 6px;" class="td-bill-no">${isFirstMatching ? inv.id : ''}</td>
            <td style="padding:4px 6px;">${isFirstMatching ? formatDate(inv.date) : ''}</td>
            <td style="padding:4px 6px;">${isFirstMatching ? inv.contactName : ''}</td>
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
         
         grandTotalTaxable += billTaxable;
         grandTotalTax += billTax;
         grandTotalTotal += billTotal;
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

    document.getElementById("pwa-report-table").querySelector("tbody").innerHTML = html;
    document.getElementById("pwa-total-amt").innerText = grandTotalTotal.toFixed(2);

    const tbody = document.getElementById("pwa-report-table").querySelector("tbody");
    if (tbody) {
      tbody.querySelectorAll("tr.pwd-act-item-row").forEach(tr => {
        const handleSelect = () => {
          tbody.querySelectorAll("tr.pwd-act-item-row").forEach(r => {
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

  document.getElementById("btn-pwa-view")?.addEventListener("click", renderGrid);

  const pwaFromDate = document.getElementById("pwa-date-from");
  const pwaToDate = document.getElementById("pwa-date-to");
  const pwaCust = document.getElementById("pwa-customer");
  const pwaMargin = document.getElementById("pwa-chk-margin");
  const pwaInclusive = document.getElementById("pwa-chk-inclusive");

  if (pwaFromDate) {
    pwaFromDate.addEventListener("change", renderGrid);
    pwaFromDate.addEventListener("input", renderGrid);
  }
  if (pwaToDate) {
    pwaToDate.addEventListener("change", renderGrid);
    pwaToDate.addEventListener("input", renderGrid);
  }
  if (pwaCust) pwaCust.addEventListener("change", renderGrid);
  if (pwaMargin) pwaMargin.addEventListener("change", renderGrid);
  if (pwaInclusive) pwaInclusive.addEventListener("change", renderGrid);

  renderGrid();
}
