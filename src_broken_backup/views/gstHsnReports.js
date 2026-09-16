import { state } from "../state.js";

function getUniqueHsnCodes() {
  const materials = state.getMaterials() || [];
  const hsns = new Set();
  materials.forEach(m => {
    if (m.hsnCode) hsns.add(String(m.hsnCode).trim());
  });
  return Array.from(hsns).filter(Boolean).sort();
}

function getCustomerById(id) {
  const contacts = state.getContacts() || [];
  return contacts.find(c => c.id === id);
}

function isDocInterState(doc) {
  const companyState = (state.getCompanyState() || "").toUpperCase();
  const docState = (doc.state || "").toUpperCase();
  return docState && docState !== companyState;
}

export function showGstPurchaseHsnModal() {
  const root = document.getElementById("modal-container-root");
  const uniqueHsns = getUniqueHsnCodes();
  const today = new Date().toISOString().split("T")[0];
  
  root.innerHTML = `
    <div class="modal-overlay active" id="gst-purchase-hsn-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container" style="max-width: 1400px; width: 98%; background-color: #e2e8f0; color: #0f172a; padding: 4px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto;">
        
        <div style="background: linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%); color: black; display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-weight: 700; font-size: 0.8rem; border-bottom: 1px solid #2563eb; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <i class="fa-brands fa-edge"></i> GST PURCHASE REPORT [HSN/SAC CODE WISE]
          </div>
          <button style="background:none; border:none; color:black; font-size:1.1rem; cursor:pointer; line-height: 1; border: 1px solid #dc2626; background: #ef4444; color: white; padding: 0 4px; border-radius: 2px;" id="purchase-hsn-close-btn-header">&times;</button>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 10px; padding: 0 4px;">
          <fieldset style="border: 1px solid #94a3b8; padding: 6px; margin: 0; display: flex; gap: 10px; align-items: center; flex: 1;">
            <legend style="color: #047857; font-weight: bold; font-size: 0.75rem; padding: 0 4px;">Date Range</legend>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold; font-size: 0.8rem;">From</span>
              <input type="date" id="purchase-hsn-from" value="${today}" style="border: 1px solid #94a3b8; padding: 2px; font-size: 0.8rem;">
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold; font-size: 0.8rem;">To</span>
              <input type="date" id="purchase-hsn-to" value="${today}" style="border: 1px solid #94a3b8; padding: 2px; font-size: 0.8rem;">
            </div>
          </fieldset>

          <fieldset style="border: 1px solid #94a3b8; padding: 6px; margin: 0; flex: 1;">
            <legend style="color: #047857; font-weight: bold; font-size: 0.75rem; padding: 0 4px;">HSN / SAC Code</legend>
            <select id="purchase-hsn-select" style="width: 100%; border: 1px solid #94a3b8; padding: 2px; font-size: 0.8rem;">
              <option value="All">(All)</option>
              ${uniqueHsns.map(h => `<option value="${h}">${h}</option>`).join('')}
            </select>
          </fieldset>

          <div style="display: flex; gap: 6px; align-items: center; margin-left: auto;">
            <button class="classic-btn" id="purchase-hsn-view-btn" style="background: #e2e8f0; border: 2px solid #94a3b8; border-top-color: white; border-left-color: white; padding: 4px 16px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">View</button>
            <button class="classic-btn" style="background: #e2e8f0; border: 2px solid #94a3b8; border-top-color: white; border-left-color: white; padding: 4px 16px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">Preview</button>
            <button class="classic-btn" id="purchase-hsn-close-btn" style="background: #e2e8f0; border: 2px solid #94a3b8; border-top-color: white; border-left-color: white; padding: 4px 16px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">Close</button>
          </div>
        </div>

        <div style="border: 1px solid #94a3b8; background-color: white; overflow-y: auto; height: 65vh; max-height: 600px; min-height: 350px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            <thead style="background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
              <tr>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">HSN/SAC Code</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">Qty</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Taxable Value</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">SGST Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">CGST Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">IGST Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">GST Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Cess Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Net Amount</th>
              </tr>
            </thead>
            <tbody id="purchase-hsn-tbody">
            </tbody>
            <tfoot>
              <tr style="background-color: white; font-weight: bold;" id="purchase-hsn-tfoot">
                <td colspan="2" style="padding: 4px; border: 1px solid #94a3b8; text-align: right; font-size: 0.9rem;">Total</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;

  const close = () => root.innerHTML = "";
  document.getElementById("purchase-hsn-close-btn-header").addEventListener("click", close);
  document.getElementById("purchase-hsn-close-btn").addEventListener("click", close);

  const tbody = document.getElementById("purchase-hsn-tbody");
  tbody.addEventListener("dblclick", (e) => {
    const row = e.target.closest("tr.hsn-row");
    if (row) {
      const hsn = row.getAttribute("data-hsn");
      const fDate = document.getElementById("purchase-hsn-from").value;
      const tDate = document.getElementById("purchase-hsn-to").value;
      showGstPurchaseHsnDetailedModal(hsn, fDate, tDate);
    }
  });

  const viewBtn = document.getElementById("purchase-hsn-view-btn");
  viewBtn.addEventListener("click", () => {
    const fromDate = document.getElementById("purchase-hsn-from").value;
    const toDate = document.getElementById("purchase-hsn-to").value;
    const hsnFilter = document.getElementById("purchase-hsn-select").value;

    const purchases = state.getPurchases() || [];
    
    // Group by HSN
    const hsnMap = {};
    let totalTaxable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0, totalGst = 0, totalCess = 0, totalNet = 0;

    purchases.forEach(p => {
      if (p.isCancelled) return;
      if (p.date < fromDate || p.date > toDate) return;

      const isInterState = isDocInterState(p);
      
      (p.items || []).forEach(item => {
        let hsn = item.hsnCode;
        if (!hsn) {
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          hsn = mat ? mat.hsnCode : "";
        }
        hsn = String(hsn || "").trim();
        
        if (hsnFilter !== "All" && hsn !== hsnFilter) return;
        if (!hsn) hsn = "Uncategorized";

        if (!hsnMap[hsn]) {
          hsnMap[hsn] = { qty: 0, taxable: 0, sgst: 0, cgst: 0, igst: 0, gst: 0, cess: 0, net: 0 };
        }

        const qty = parseFloat(item.quantity) || 0;
        const taxable = parseFloat(item.netValue) || 0;
        const gstPercent = parseFloat(item.gstPercent) || 0;
        const gstAmount = parseFloat(item.gstAmount) || 0;
        const cess = parseFloat(item.cessAmount) || 0;
        
        let sgst = 0, cgst = 0, igst = 0;
        if (isInterState) {
          igst = gstAmount;
        } else {
          sgst = gstAmount / 2;
          cgst = gstAmount / 2;
        }
        
        const net = parseFloat(item.netAmount) || (taxable + gstAmount);

        hsnMap[hsn].qty += qty;
        hsnMap[hsn].taxable += taxable;
        hsnMap[hsn].sgst += sgst;
        hsnMap[hsn].cgst += cgst;
        hsnMap[hsn].igst += igst;
        hsnMap[hsn].gst += gstAmount;
        hsnMap[hsn].cess += cess;
        hsnMap[hsn].net += net;

        totalTaxable += taxable;
        totalSgst += sgst;
        totalCgst += cgst;
        totalIgst += igst;
        totalGst += gstAmount;
        totalCess += cess;
        totalNet += net;
      });
    });

    const purchaseReturns = state.getPurchaseReturns() || [];
    purchaseReturns.forEach(p => {
      if (p.date < fromDate || p.date > toDate) return;

      const isInterState = isDocInterState(p);
      
      (p.items || []).forEach(item => {
        let hsn = item.hsnCode;
        if (!hsn) {
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          hsn = mat ? mat.hsnCode : "";
        }
        hsn = String(hsn || "").trim();
        
        if (hsnFilter !== "All" && hsn !== hsnFilter) return;
        if (!hsn) hsn = "Uncategorized";

        if (!hsnMap[hsn]) {
          hsnMap[hsn] = { qty: 0, taxable: 0, sgst: 0, cgst: 0, igst: 0, gst: 0, cess: 0, net: 0 };
        }

        const qty = parseFloat(item.quantity) || 0;
        const taxable = parseFloat(item.netValue) || parseFloat(item.amount) || 0;
        const gstPercent = parseFloat(item.gstPercent) || 0;
        let gstAmount = parseFloat(item.gstAmount) || 0;
        if (gstAmount === 0 && taxable > 0) gstAmount = taxable * (gstPercent/100);
        const cess = parseFloat(item.cessAmount) || 0;
        
        let sgst = 0, cgst = 0, igst = 0;
        if (isInterState) {
          igst = gstAmount;
        } else {
          sgst = gstAmount / 2;
          cgst = gstAmount / 2;
        }
        
        const net = parseFloat(item.netAmount) || (taxable + gstAmount);

        hsnMap[hsn].qty -= qty;
        hsnMap[hsn].taxable -= taxable;
        hsnMap[hsn].sgst -= sgst;
        hsnMap[hsn].cgst -= cgst;
        hsnMap[hsn].igst -= igst;
        hsnMap[hsn].gst -= gstAmount;
        hsnMap[hsn].cess -= cess;
        hsnMap[hsn].net -= net;

        totalTaxable -= taxable;
        totalSgst -= sgst;
        totalCgst -= cgst;
        totalIgst -= igst;
        totalGst -= gstAmount;
        totalCess -= cess;
        totalNet -= net;
      });
    });

    const tfoot = document.getElementById("purchase-hsn-tfoot");
    
    let html = "";
    Object.keys(hsnMap).sort().forEach(hsn => {
      const d = hsnMap[hsn];
      html += `
        <tr class="hsn-row" data-hsn="${hsn}" style="cursor: pointer;">
          <td style="padding: 4px; border: 1px solid #e2e8f0;">${hsn}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.qty.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.taxable.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.sgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.cgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.igst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.gst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.cess.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.net.toFixed(2)}</td>
        </tr>
      `;
    });

    const minRows = 15;
    const currentRows = Object.keys(hsnMap).length;
    for(let i = currentRows; i < minRows; i++) {
      html += `
        <tr>
          <td style="padding: 4px; border: 1px solid #e2e8f0; height: 20px;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
        </tr>
      `;
    }

    tbody.innerHTML = html;

    tfoot.innerHTML = `
      <td colspan="2" style="padding: 4px; border: 1px solid #94a3b8; text-align: right; font-size: 0.9rem;">Total</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalTaxable.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalSgst.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalCgst.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalIgst.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalGst.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalCess.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalNet.toFixed(2)}</td>
    `;
  });

  // Auto trigger view
  viewBtn.click();
}

export function showGstSalesHsnModal() {
  const root = document.getElementById("modal-container-root");
  const uniqueHsns = getUniqueHsnCodes();
  const today = new Date().toISOString().split("T")[0];
  
  root.innerHTML = `
    <div class="modal-overlay active" id="gst-sales-hsn-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container" style="max-width: 1400px; width: 98%; background-color: #e2e8f0; color: #0f172a; padding: 4px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto;">
        
        <div style="background: linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%); color: black; display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-weight: 700; font-size: 0.8rem; border-bottom: 1px solid #2563eb; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <i class="fa-brands fa-edge"></i> GST SALES REPORT [HSN/SAC CODE WISE]
          </div>
          <button style="background:none; border:none; color:black; font-size:1.1rem; cursor:pointer; line-height: 1; border: 1px solid #dc2626; background: #ef4444; color: white; padding: 0 4px; border-radius: 2px;" id="sales-hsn-close-btn-header">&times;</button>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 10px; padding: 0 4px;">
          <fieldset style="border: 1px solid #94a3b8; padding: 6px; margin: 0; display: flex; gap: 10px; align-items: center; flex: 1.5;">
            <legend style="color: #047857; font-weight: bold; font-size: 0.75rem; padding: 0 4px;">Date Range</legend>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold; font-size: 0.8rem;">From</span>
              <input type="date" id="sales-hsn-from" value="${today}" style="border: 1px solid #94a3b8; padding: 2px; font-size: 0.8rem;">
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold; font-size: 0.8rem;">To</span>
              <input type="date" id="sales-hsn-to" value="${today}" style="border: 1px solid #94a3b8; padding: 2px; font-size: 0.8rem;">
            </div>
          </fieldset>

          <fieldset style="border: 1px solid #94a3b8; padding: 6px; margin: 0; flex: 1;">
            <legend style="color: #047857; font-weight: bold; font-size: 0.75rem; padding: 0 4px;">HSN / SAC Code</legend>
            <select id="sales-hsn-select" style="width: 100%; border: 1px solid #94a3b8; padding: 2px; font-size: 0.8rem;">
              <option value="All">(All)</option>
              ${uniqueHsns.map(h => `<option value="${h}">${h}</option>`).join('')}
            </select>
          </fieldset>

          <fieldset style="border: 1px solid #94a3b8; padding: 6px; margin: 0; flex: 1;">
            <legend style="color: #047857; font-weight: bold; font-size: 0.75rem; padding: 0 4px;">Bill Type</legend>
            <select id="sales-bill-type-select" style="width: 100%; border: 1px solid #94a3b8; padding: 2px; font-size: 0.8rem;">
              <option value="All">All</option>
              <option value="With GST">With GST</option>
              <option value="Without GST">Without GST</option>
            </select>
          </fieldset>

          <div style="display: flex; gap: 6px; align-items: center; margin-left: auto;">
            <button class="classic-btn" id="sales-hsn-view-btn" style="background: #e2e8f0; border: 2px solid #94a3b8; border-top-color: white; border-left-color: white; padding: 4px 16px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">View</button>
            <button class="classic-btn" style="background: #e2e8f0; border: 2px solid #94a3b8; border-top-color: white; border-left-color: white; padding: 4px 16px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">Preview</button>
            <button class="classic-btn" id="sales-hsn-close-btn" style="background: #e2e8f0; border: 2px solid #94a3b8; border-top-color: white; border-left-color: white; padding: 4px 16px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">Close</button>
          </div>
        </div>

        <div style="border: 1px solid #94a3b8; background-color: white; overflow-y: auto; height: 65vh; max-height: 600px; min-height: 350px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            <thead style="background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
              <tr>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">HSN/SAC Code</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: center; position: sticky; top: 0; background: #1d4ed8;">GST%</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Qty</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Taxable Value</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">SGST Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">CGST Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">IGST Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">GST Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Cess Amount</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Net Amount</th>
              </tr>
            </thead>
            <tbody id="sales-hsn-tbody">
            </tbody>
            <tfoot>
              <tr style="background-color: white; font-weight: bold;" id="sales-hsn-tfoot">
                <td colspan="3" style="padding: 4px; border: 1px solid #94a3b8; text-align: right; font-size: 0.9rem;">Total</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">0.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;

  const close = () => root.innerHTML = "";
  document.getElementById("sales-hsn-close-btn-header").addEventListener("click", close);
  document.getElementById("sales-hsn-close-btn").addEventListener("click", close);

  const tbody = document.getElementById("sales-hsn-tbody");
  tbody.addEventListener("dblclick", (e) => {
    const row = e.target.closest("tr.hsn-row");
    if (row) {
      const hsn = row.getAttribute("data-hsn");
      const gst = row.getAttribute("data-gst");
      const fDate = document.getElementById("sales-hsn-from").value;
      const tDate = document.getElementById("sales-hsn-to").value;
      const billType = document.getElementById("sales-bill-type-select").value;
      showGstSalesHsnDetailedModal(hsn, gst, fDate, tDate, billType);
    }
  });

  const viewBtn = document.getElementById("sales-hsn-view-btn");
  viewBtn.addEventListener("click", () => {
    const fromDate = document.getElementById("sales-hsn-from").value;
    const toDate = document.getElementById("sales-hsn-to").value;
    const hsnFilter = document.getElementById("sales-hsn-select").value;
    const billTypeFilter = document.getElementById("sales-bill-type-select").value;

    const invoices = state.getInvoices() || [];
    
    // Group by HSN + GST%
    const hsnMap = {};
    let totalTaxable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0, totalGst = 0, totalCess = 0, totalNet = 0;

    invoices.forEach(inv => {
      if (inv.isCancelled) return;
      if (inv.date < fromDate || inv.date > toDate) return;

      const customer = getCustomerById(inv.customerId);
      const hasGst = customer && customer.gstin && customer.gstin.trim().length > 0;
      
      if (billTypeFilter === "With GST" && !hasGst) return;
      if (billTypeFilter === "Without GST" && hasGst) return;

      const isInterState = isDocInterState(inv);
      
      (inv.items || []).forEach(item => {
        let hsn = item.hsnCode;
        if (!hsn) {
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          hsn = mat ? mat.hsnCode : "";
        }
        hsn = String(hsn || "").trim();
        
        if (hsnFilter !== "All" && hsn !== hsnFilter) return;
        if (!hsn) hsn = "Uncategorized";

        const gstPercent = parseFloat(item.gstPercent) || 0;
        const key = `${hsn}_${gstPercent}`;

        if (!hsnMap[key]) {
          hsnMap[key] = { hsn, gstPercent, qty: 0, taxable: 0, sgst: 0, cgst: 0, igst: 0, gst: 0, cess: 0, net: 0, unit: item.unit || '' };
        }

        const qty = parseFloat(item.quantity) || 0;
        const taxable = parseFloat(item.netValue) || 0;
        const gstAmount = parseFloat(item.gstAmount) || 0;
        const cess = parseFloat(item.cessAmount) || 0;
        
        let sgst = 0, cgst = 0, igst = 0;
        if (isInterState) {
          igst = gstAmount;
        } else {
          sgst = gstAmount / 2;
          cgst = gstAmount / 2;
        }
        
        const net = parseFloat(item.netAmount) || (taxable + gstAmount);

        hsnMap[key].qty += qty;
        hsnMap[key].taxable += taxable;
        hsnMap[key].sgst += sgst;
        hsnMap[key].cgst += cgst;
        hsnMap[key].igst += igst;
        hsnMap[key].gst += gstAmount;
        hsnMap[key].cess += cess;
        hsnMap[key].net += net;
        if (item.unit && !hsnMap[key].unit.includes(item.unit)) {
          // just taking last unit for display simplicity
          hsnMap[key].unit = item.unit; 
        }

        totalTaxable += taxable;
        totalSgst += sgst;
        totalCgst += cgst;
        totalIgst += igst;
        totalGst += gstAmount;
        totalCess += cess;
        totalNet += net;
      });
    });

    const salesReturns = state.getSalesReturns() || [];
    salesReturns.forEach(inv => {
      if (inv.date < fromDate || inv.date > toDate) return;

      const customer = getCustomerById(inv.contactId);
      const hasGst = customer && customer.gstin && customer.gstin.trim().length > 0;
      
      if (billTypeFilter === "With GST" && !hasGst) return;
      if (billTypeFilter === "Without GST" && hasGst) return;

      const isInterState = isDocInterState(inv);
      
      (inv.items || []).forEach(item => {
        let hsn = item.hsnCode;
        if (!hsn) {
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          hsn = mat ? mat.hsnCode : "";
        }
        hsn = String(hsn || "").trim();
        
        if (hsnFilter !== "All" && hsn !== hsnFilter) return;
        if (!hsn) hsn = "Uncategorized";

        const gstPercent = parseFloat(item.gstPercent) || 0;
        const key = `${hsn}_${gstPercent}`;

        if (!hsnMap[key]) {
          hsnMap[key] = { hsn, gstPercent, qty: 0, taxable: 0, sgst: 0, cgst: 0, igst: 0, gst: 0, cess: 0, net: 0, unit: item.unit || '' };
        }

        const qty = parseFloat(item.quantity) || 0;
        const taxable = parseFloat(item.netValue) || parseFloat(item.amount) || 0;
        let gstAmount = parseFloat(item.gstAmount) || 0;
        if (gstAmount === 0 && taxable > 0) gstAmount = taxable * (gstPercent/100);
        const cess = parseFloat(item.cessAmount) || 0;
        
        let sgst = 0, cgst = 0, igst = 0;
        if (isInterState) {
          igst = gstAmount;
        } else {
          sgst = gstAmount / 2;
          cgst = gstAmount / 2;
        }
        
        const net = parseFloat(item.netAmount) || (taxable + gstAmount);

        hsnMap[key].qty -= qty;
        hsnMap[key].taxable -= taxable;
        hsnMap[key].sgst -= sgst;
        hsnMap[key].cgst -= cgst;
        hsnMap[key].igst -= igst;
        hsnMap[key].gst -= gstAmount;
        hsnMap[key].cess -= cess;
        hsnMap[key].net -= net;
        if (item.unit && !hsnMap[key].unit.includes(item.unit)) {
          hsnMap[key].unit = item.unit; 
        }

        totalTaxable -= taxable;
        totalSgst -= sgst;
        totalCgst -= cgst;
        totalIgst -= igst;
        totalGst -= gstAmount;
        totalCess -= cess;
        totalNet -= net;
      });
    });

    const tfoot = document.getElementById("sales-hsn-tfoot");
    
    let html = "";
    Object.keys(hsnMap).sort().forEach(key => {
      const d = hsnMap[key];
      html += `
        <tr class="hsn-row" data-hsn="${d.hsn}" data-gst="${d.gstPercent}" style="cursor: pointer;">
          <td style="padding: 4px; border: 1px solid #e2e8f0;">${d.hsn}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: center;">${d.gstPercent}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.qty.toFixed(2)} ${d.unit}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.taxable.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.sgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.cgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.igst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.gst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.cess.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${d.net.toFixed(2)}</td>
        </tr>
      `;
    });

    const minRows = 15;
    const currentRows = Object.keys(hsnMap).length;
    for(let i = currentRows; i < minRows; i++) {
      html += `
        <tr>
          <td style="padding: 4px; border: 1px solid #e2e8f0; height: 20px;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;"></td>
        </tr>
      `;
    }

    tbody.innerHTML = html;

    tfoot.innerHTML = `
      <td colspan="3" style="padding: 4px; border: 1px solid #94a3b8; text-align: right; font-size: 0.9rem;">Total</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalTaxable.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalSgst.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalCgst.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalIgst.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalGst.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalCess.toFixed(2)}</td>
      <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalNet.toFixed(2)}</td>
    `;
  });

  // Auto trigger view
  viewBtn.click();
}


// --- Detailed Modals ---

function showGstPurchaseHsnDetailedModal(hsnFilter, fromDate, toDate) {
  // Ensure we have a div for this second modal layer
  let detailedRoot = document.getElementById("modal-container-detailed-root");
  if (!detailedRoot) {
    detailedRoot = document.createElement("div");
    detailedRoot.id = "modal-container-detailed-root";
    document.body.appendChild(detailedRoot);
  }

  const purchases = state.getPurchases() || [];
  let htmlRows = "";
  let totalQty = 0, totalTaxable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0, totalGst = 0, totalCess = 0, totalNet = 0;

  purchases.forEach(p => {
    if (p.isCancelled) return;
    if (p.date < fromDate || p.date > toDate) return;

    const isInterState = isDocInterState(p);
    const party = getCustomerById(p.vendorId);
    const partyName = party ? party.name : (p.partyName || "CASH");
    const vno = p.voucherNo || p.refNo || p.id;
    
    (p.items || []).forEach(item => {
      let hsn = item.hsnCode;
      if (!hsn) {
        const mat = state.getMaterials().find(m => m.id === item.materialId);
        hsn = mat ? mat.hsnCode : "";
      }
      hsn = String(hsn || "").trim();
      if (!hsn) hsn = "Uncategorized";

      if (hsn !== hsnFilter) return;

      const qty = parseFloat(item.quantity) || 0;
      const taxable = parseFloat(item.netValue) || 0;
      const gstPercent = parseFloat(item.gstPercent) || 0;
      const gstAmount = parseFloat(item.gstAmount) || 0;
      const cess = parseFloat(item.cessAmount) || 0;
      
      let sgst = 0, cgst = 0, igst = 0;
      if (isInterState) {
        igst = gstAmount;
      } else {
        sgst = gstAmount / 2;
        cgst = gstAmount / 2;
      }
      
      const net = parseFloat(item.netAmount) || (taxable + gstAmount);

      htmlRows += `
        <tr>
          <td style="padding: 4px; border: 1px solid #e2e8f0;">${p.date}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;">${vno}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;">${partyName}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${qty.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${taxable.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${sgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${cgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${igst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${gstAmount.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${cess.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${net.toFixed(2)}</td>
        </tr>
      `;

      totalQty += qty;
      totalTaxable += taxable;
      totalSgst += sgst;
      totalCgst += cgst;
      totalIgst += igst;
      totalGst += gstAmount;
      totalCess += cess;
      totalNet += net;
    });
  });

  const purchaseReturns = state.getPurchaseReturns() || [];
  purchaseReturns.forEach(p => {
    if (p.date < fromDate || p.date > toDate) return;

    const isInterState = isDocInterState(p);
    const party = getCustomerById(p.contactId);
    const partyName = party ? party.name : (p.partyName || "CASH");
    const vno = p.id || p.billNo || "PR-RET";
    
    (p.items || []).forEach(item => {
      let hsn = item.hsnCode;
      if (!hsn) {
        const mat = state.getMaterials().find(m => m.id === item.materialId);
        hsn = mat ? mat.hsnCode : "";
      }
      hsn = String(hsn || "").trim();
      if (!hsn) hsn = "Uncategorized";

      if (hsn !== hsnFilter) return;

      const qty = parseFloat(item.quantity) || 0;
      const taxable = parseFloat(item.netValue) || parseFloat(item.amount) || 0;
      const gstPercent = parseFloat(item.gstPercent) || 0;
      let gstAmount = parseFloat(item.gstAmount) || 0;
      if (gstAmount === 0 && taxable > 0) gstAmount = taxable * (gstPercent/100);
      const cess = parseFloat(item.cessAmount) || 0;
      
      let sgst = 0, cgst = 0, igst = 0;
      if (isInterState) {
        igst = gstAmount;
      } else {
        sgst = gstAmount / 2;
        cgst = gstAmount / 2;
      }
      
      const net = parseFloat(item.netAmount) || (taxable + gstAmount);

      htmlRows += `
        <tr>
          <td style="padding: 4px; border: 1px solid #e2e8f0; color: #dc2626;">${p.date}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; color: #dc2626;">${vno} (Return)</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; color: #dc2626;">${partyName}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${qty.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${taxable.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${sgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${cgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${igst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${gstAmount.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${cess.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${net.toFixed(2)}</td>
        </tr>
      `;

      totalQty -= qty;
      totalTaxable -= taxable;
      totalSgst -= sgst;
      totalCgst -= cgst;
      totalIgst -= igst;
      totalGst -= gstAmount;
      totalCess -= cess;
      totalNet -= net;
    });
  });

  detailedRoot.innerHTML = `
    <div class="modal-overlay active" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.5); z-index:2010;">
      <div class="modal-container" style="max-width: 1400px; width: 98%; background-color: #e2e8f0; color: #0f172a; padding: 4px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto;">
        
        <div style="background: linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%); color: black; display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-weight: 700; font-size: 0.8rem; border-bottom: 1px solid #2563eb; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <i class="fa-brands fa-edge"></i> DETAILED PURCHASE REPORT FOR HSN: ${hsnFilter}
          </div>
          <button style="background:none; border:none; color:black; font-size:1.1rem; cursor:pointer; line-height: 1; border: 1px solid #dc2626; background: #ef4444; color: white; padding: 0 4px; border-radius: 2px;" id="pur-det-hsn-close-btn">&times;</button>
        </div>

        <div style="border: 1px solid #94a3b8; background-color: white; overflow-y: auto; height: 65vh; max-height: 600px; min-height: 350px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            <thead style="background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
              <tr>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">Date</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">Vch No</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">Party</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Qty</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Taxable Value</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">SGST</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">CGST</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">IGST</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">GST Amt</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Cess</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows}
            </tbody>
            <tfoot>
              <tr style="background-color: white; font-weight: bold;">
                <td colspan="3" style="padding: 4px; border: 1px solid #94a3b8; text-align: right; font-size: 0.9rem;">Total</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalQty.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalTaxable.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalSgst.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalCgst.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalIgst.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalGst.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalCess.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalNet.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById("pur-det-hsn-close-btn").addEventListener("click", () => {
    detailedRoot.innerHTML = "";
  });
}

function showGstSalesHsnDetailedModal(hsnFilter, gstFilter, fromDate, toDate, billTypeFilter) {
  let detailedRoot = document.getElementById("modal-container-detailed-root");
  if (!detailedRoot) {
    detailedRoot = document.createElement("div");
    detailedRoot.id = "modal-container-detailed-root";
    document.body.appendChild(detailedRoot);
  }

  const invoices = state.getInvoices() || [];
  let htmlRows = "";
  let totalQty = 0, totalTaxable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0, totalGst = 0, totalCess = 0, totalNet = 0;

  invoices.forEach(inv => {
    if (inv.isCancelled) return;
    if (inv.date < fromDate || inv.date > toDate) return;

    const party = getCustomerById(inv.customerId);
    const hasGst = party && party.gstin && party.gstin.trim().length > 0;
    
    if (billTypeFilter === "With GST" && !hasGst) return;
    if (billTypeFilter === "Without GST" && hasGst) return;

    const isInterState = isDocInterState(inv);
    const partyName = party ? party.name : (inv.partyName || "CASH");
    const vno = inv.voucherNo || inv.refNo || inv.id;
    
    (inv.items || []).forEach(item => {
      let hsn = item.hsnCode;
      if (!hsn) {
        const mat = state.getMaterials().find(m => m.id === item.materialId);
        hsn = mat ? mat.hsnCode : "";
      }
      hsn = String(hsn || "").trim();
      if (!hsn) hsn = "Uncategorized";

      const gstPercent = parseFloat(item.gstPercent) || 0;

      if (hsn !== hsnFilter || gstPercent !== parseFloat(gstFilter)) return;

      const qty = parseFloat(item.quantity) || 0;
      const taxable = parseFloat(item.netValue) || 0;
      const gstAmount = parseFloat(item.gstAmount) || 0;
      const cess = parseFloat(item.cessAmount) || 0;
      
      let sgst = 0, cgst = 0, igst = 0;
      if (isInterState) {
        igst = gstAmount;
      } else {
        sgst = gstAmount / 2;
        cgst = gstAmount / 2;
      }
      
      const net = parseFloat(item.netAmount) || (taxable + gstAmount);

      htmlRows += `
        <tr>
          <td style="padding: 4px; border: 1px solid #e2e8f0;">${inv.date}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;">${vno}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0;">${partyName}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${qty.toFixed(2)} ${item.unit || ''}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${taxable.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${sgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${cgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${igst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${gstAmount.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${cess.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right;">${net.toFixed(2)}</td>
        </tr>
      `;

      totalQty += qty;
      totalTaxable += taxable;
      totalSgst += sgst;
      totalCgst += cgst;
      totalIgst += igst;
      totalGst += gstAmount;
      totalCess += cess;
      totalNet += net;
    });
  });

  const salesReturns = state.getSalesReturns() || [];
  salesReturns.forEach(inv => {
    if (inv.date < fromDate || inv.date > toDate) return;

    const party = getCustomerById(inv.contactId);
    const hasGst = party && party.gstin && party.gstin.trim().length > 0;
    
    if (billTypeFilter === "With GST" && !hasGst) return;
    if (billTypeFilter === "Without GST" && hasGst) return;

    const isInterState = isDocInterState(inv);
    const partyName = party ? party.name : (inv.partyName || "CASH");
    const vno = inv.id || inv.billNo || "SR-RET";
    
    (inv.items || []).forEach(item => {
      let hsn = item.hsnCode;
      if (!hsn) {
        const mat = state.getMaterials().find(m => m.id === item.materialId);
        hsn = mat ? mat.hsnCode : "";
      }
      hsn = String(hsn || "").trim();
      if (!hsn) hsn = "Uncategorized";

      const gstPercent = parseFloat(item.gstPercent) || 0;

      if (hsn !== hsnFilter || gstPercent !== parseFloat(gstFilter)) return;

      const qty = parseFloat(item.quantity) || 0;
      const taxable = parseFloat(item.netValue) || parseFloat(item.amount) || 0;
      let gstAmount = parseFloat(item.gstAmount) || 0;
      if (gstAmount === 0 && taxable > 0) gstAmount = taxable * (gstPercent/100);
      const cess = parseFloat(item.cessAmount) || 0;
      
      let sgst = 0, cgst = 0, igst = 0;
      if (isInterState) {
        igst = gstAmount;
      } else {
        sgst = gstAmount / 2;
        cgst = gstAmount / 2;
      }
      
      const net = parseFloat(item.netAmount) || (taxable + gstAmount);

      htmlRows += `
        <tr>
          <td style="padding: 4px; border: 1px solid #e2e8f0; color: #dc2626;">${inv.date}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; color: #dc2626;">${vno} (Return)</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; color: #dc2626;">${partyName}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${qty.toFixed(2)} ${item.unit || ''}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${taxable.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${sgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${cgst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${igst.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${gstAmount.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${cess.toFixed(2)}</td>
          <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${net.toFixed(2)}</td>
        </tr>
      `;

      totalQty -= qty;
      totalTaxable -= taxable;
      totalSgst -= sgst;
      totalCgst -= cgst;
      totalIgst -= igst;
      totalGst -= gstAmount;
      totalCess -= cess;
      totalNet -= net;
    });
  });

  detailedRoot.innerHTML = `
    <div class="modal-overlay active" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.5); z-index:2010;">
      <div class="modal-container" style="max-width: 1400px; width: 98%; background-color: #e2e8f0; color: #0f172a; padding: 4px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto;">
        
        <div style="background: linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%); color: black; display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-weight: 700; font-size: 0.8rem; border-bottom: 1px solid #2563eb; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <i class="fa-brands fa-edge"></i> DETAILED SALES REPORT FOR HSN: ${hsnFilter} (GST: ${gstFilter}%)
          </div>
          <button style="background:none; border:none; color:black; font-size:1.1rem; cursor:pointer; line-height: 1; border: 1px solid #dc2626; background: #ef4444; color: white; padding: 0 4px; border-radius: 2px;" id="sal-det-hsn-close-btn">&times;</button>
        </div>

        <div style="border: 1px solid #94a3b8; background-color: white; overflow-y: auto; height: 65vh; max-height: 600px; min-height: 350px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            <thead style="background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
              <tr>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">Date</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">Vch No</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: left; position: sticky; top: 0; background: #1d4ed8;">Party</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Qty</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Taxable Value</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">SGST</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">CGST</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">IGST</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">GST Amt</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Cess</th>
                <th style="padding: 4px; border: 1px solid #94a3b8; text-align: right; position: sticky; top: 0; background: #1d4ed8;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows}
            </tbody>
            <tfoot>
              <tr style="background-color: white; font-weight: bold;">
                <td colspan="3" style="padding: 4px; border: 1px solid #94a3b8; text-align: right; font-size: 0.9rem;">Total</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalQty.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalTaxable.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalSgst.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalCgst.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalIgst.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalGst.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalCess.toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #94a3b8; text-align: right;">${totalNet.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById("sal-det-hsn-close-btn").addEventListener("click", () => {
    detailedRoot.innerHTML = "";
  });
}
