import { state } from "../state.js";
import { showInvoiceBuilderModal } from "./transactions.js";
import { formatDate } from "../utils/dateUtils.js";

let searchInvoiceFilter = "";

export function renderInvoices(container) {
  const invoices = state.getInvoices();
  const contacts = state.getContacts().filter(c => c.type === "customer" || c.listInCustomerList === true);
  const materials = state.getMaterials();

  // Metrics calculations
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const unpaidSales = invoices.reduce((sum, inv) => sum + (inv.status !== "paid" ? (inv.total - inv.paidAmount) : 0), 0);
  const paidSales = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const overdueCount = invoices.filter(inv => inv.status !== "paid" && new Date(inv.dueDate) < new Date()).length;

  const filteredInvoices = invoices.filter(inv => {
    return (inv.voucherNo || inv.id).toLowerCase().includes(searchInvoiceFilter.toLowerCase()) ||
           inv.contactName.toLowerCase().includes(searchInvoiceFilter.toLowerCase());
  }).sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const noA = String(a.voucherNo || a.id || "");
    const noB = String(b.voucherNo || b.id || "");
    return noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
  });

  container.innerHTML = `
    <!-- Top Stats Row -->
    <div class="metrics-grid">
      <div class="metric-card sales">
        <div class="metric-icon"><i class="fa-solid fa-file-invoice"></i></div>
        <div class="metric-details">
          <span class="metric-label">Total Invoiced Sales</span>
          <span class="metric-value">\u20B9${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="metric-card receivables">
        <div class="metric-icon"><i class="fa-solid fa-clock"></i></div>
        <div class="metric-details">
          <span class="metric-label">Outstanding Receivables</span>
          <span class="metric-value">\u20B9${unpaidSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="metric-card cash">
        <div class="metric-icon"><i class="fa-solid fa-wallet"></i></div>
        <div class="metric-details">
          <span class="metric-label">Total Cash Collected</span>
          <span class="metric-value">\u20B9${paidSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="metric-card expenses">
        <div class="metric-icon"><i class="fa-solid fa-calendar-times"></i></div>
        <div class="metric-details">
          <span class="metric-label">Overdue Invoices</span>
          <span class="metric-value ${overdueCount > 0 ? 'text-danger' : 'text-success'}">${overdueCount}</span>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="action-header">
      <div class="filters-row">
        <div class="form-group" style="margin-bottom: 0;">
          <input type="text" id="search-invoice" class="form-control" placeholder="Search by Invoice # or Customer..." value="${searchInvoiceFilter}" style="width: 300px;">
        </div>
      </div>
      <button class="btn btn-primary" id="btn-add-invoice"><i class="fa-solid fa-plus"></i> Create Sales Invoice</button>
    </div>

    <!-- Invoices Table -->
    <div class="panel" style="padding-top: 0.5rem;">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Customer</th>
              <th style="text-align: right;">Subtotal</th>
              <th style="text-align: right;">Tax</th>
              <th style="text-align: right;">Total</th>
              <th style="text-align: right;">Paid</th>
              <th style="text-align: right;">Balance Due</th>
              <th style="text-align: center;">Status</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices.length === 0 ? `
              <tr>
                <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 3rem;">No invoices found.</td>
              </tr>
            ` : filteredInvoices.map(inv => {
              const subtotalVal = parseFloat(inv.subtotal ?? inv.amount ?? 0) || 0;
              const taxAmtVal = parseFloat(inv.totalGst ?? inv.taxAmount ?? 0) || 0;
              const totalVal = parseFloat(inv.total ?? 0) || 0;
              const paidAmtVal = parseFloat(inv.paidAmount ?? 0) || 0;
              const bal = totalVal - paidAmtVal;
              let statusBadge = "";
              if (inv.status === "paid") {
                statusBadge = '<span class="badge success">Paid</span>';
              } else if (inv.status === "partially paid") {
                statusBadge = '<span class="badge warning">Partial</span>';
              } else {
                const isOverdue = new Date(inv.dueDate) < new Date();
                statusBadge = isOverdue ? 
                  '<span class="badge danger" title="Overdue">Overdue</span>' : 
                  '<span class="badge info">Unpaid</span>';
              }
              return `
                <tr>
                  <td><code class="highlight-text" style="font-weight: 700;">${inv.voucherNo || inv.id}</code></td>
                  <td>${formatDate(inv.date)}</td>
                  <td>${formatDate(inv.dueDate)}</td>
                  <td><strong>${inv.contactName || "Cash / Customer"}</strong></td>
                  <td style="text-align: right;">\u20B9${subtotalVal.toFixed(2)}</td>
                  <td style="text-align: right;">\u20B9${taxAmtVal.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600;">\u20B9${totalVal.toFixed(2)}</td>
                  <td style="text-align: right; color: var(--success); font-weight: 500;">\u20B9${paidAmtVal.toFixed(2)}</td>
                  <td style="text-align: right; color: ${bal > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-weight: 600;">\u20B9${bal.toFixed(2)}</td>
                  <td style="text-align: center;">${statusBadge}</td>
                  <td style="text-align: center;">
                    <button class="btn btn-secondary btn-icon view-invoice-btn" data-id="${inv.id}" title="View & Print Invoice"><i class="fa-solid fa-print"></i> View</button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind Events
  const searchInput = document.getElementById("search-invoice");
  searchInput.addEventListener("input", (e) => {
    searchInvoiceFilter = e.target.value;
    renderInvoices(container);
    document.getElementById("search-invoice").focus();
  });

  document.getElementById("btn-add-invoice").addEventListener("click", () => {
    showCreateInvoiceModal(container, contacts, materials);
  });

  document.querySelectorAll(".view-invoice-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showInvoicePrintPreview(container, btn.getAttribute("data-id"));
    });
  });
}

// Modal: Create Sales Invoice (Batch-Wise)
function showCreateInvoiceModal(container, customers, materials) {
  showInvoiceBuilderModal(container, customers, materials, () => {
    renderInvoices(container);
  });
}
/**
 * Amount to Indian Words Converter
 */
export function getAmountInWords(amount) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function numToWords(num) {
    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
  }
  const integerPart = Math.floor(amount || 0);
  const words = numToWords(integerPart);
  return (words ? words + ' Rupees Only' : 'Zero Rupees Only');
}

/**
 * Builds standalone HTML for an invoice
 */
export function generateInvoiceHtml(inv, printMode = 'standard') {
  if (!inv) return "";
  
  const contact = state.getContacts().find(c => c.id === inv.contactId);
  const series = inv.seriesId ? state.getSeriesMaster().find(s => s.id === inv.seriesId) : null;
  const isUnregistered = state.isCompanyUnregistered ? state.isCompanyUnregistered() : false;
  const isNontaxable = (series && series.seriesType === "NONTAXABLE") || inv.postingLedger === "L022" || (inv.totalGst === 0 && (inv.items || []).every(item => parseFloat(item.gstPercent) === 0)) || isUnregistered;

  const watermarkHTML = inv.isCancelled ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 6rem; font-weight: 900; color: rgba(239, 68, 68, 0.18); pointer-events: none; white-space: nowrap; user-select: none; z-index: 9999;">
      CANCELLED
    </div>
  ` : "";

  const activeCompanyId = state.getActiveCompanyId ? state.getActiveCompanyId() : null;
  const activeCompany = activeCompanyId ? state.getRegisteredCompanies().find(c => c.id === activeCompanyId) : null;

  const companyName = activeCompany?.name || "";
  const companyAddress = activeCompany?.address || "";
  const companyEmail = activeCompany?.email || "";
  const companyGstin = activeCompany?.gstin || "";
  const companyPhone = activeCompany?.phone || "";
  const companyMobile = activeCompany?.mobile || "";
  const companyState = activeCompany?.state || "KERALA";
  const companyStateCode = activeCompany?.stateCode || "32";

  const invSubtotal = parseFloat(inv.subtotal ?? inv.taxableTotal ?? inv.amount ?? 0) || 0;
  const invTotalGst = parseFloat(inv.totalGst ?? inv.taxAmount ?? inv.totalTax ?? 0) || 0;
  const invTotal = parseFloat(inv.total ?? inv.grandTotal ?? inv.amount ?? 0) || 0;
  const invPaidAmount = parseFloat(inv.paidAmount ?? 0) || 0;
  const invRoundOff = parseFloat(inv.roundOff ?? 0) || 0;
  const invAdjustments = parseFloat(inv.adjustments ?? 0) || 0;

  const isSingleItem = (inv.items || []).length === 1;
  const activeAdjustments = (inv.adjustmentsList && inv.adjustmentsList.length > 0)
    ? inv.adjustmentsList.filter(a => parseFloat(a.amount || 0) !== 0)
    : (invAdjustments !== 0 ? [{ name: "Adjustments", amount: invAdjustments, type: invAdjustments >= 0 ? "Add" : "Deduct" }] : []);
  
  const shouldInlineAdjustments = isSingleItem && activeAdjustments.length > 0;
  
  const totalAdjustments = activeAdjustments.reduce((sum, a) => {
    const amt = parseFloat(a.amount || 0);
    return sum + (a.type === "Deduct" ? -Math.abs(amt) : Math.abs(amt));
  }, 0);

  const combinedRows = [...(inv.items || [])];
  if (shouldInlineAdjustments) {
    activeAdjustments.forEach(adj => {
      const signedAmt = adj.type === "Deduct" ? -Math.abs(parseFloat(adj.amount || 0)) : Math.abs(parseFloat(adj.amount || 0));
      combinedRows.push({
        isAdjustment: true,
        name: adj.name || "Adjustments",
        code: "",
        hsnCode: "",
        quantity: "",
        unit: "",
        price: signedAmt,
        taxableValue: signedAmt,
        amount: signedAmt,
        netValue: signedAmt,
        netAmount: signedAmt,
        gstPercent: 0,
        gstAmount: 0
      });
    });
  }

  const displayItems = [...combinedRows];
  while (displayItems.length < 8) {
    displayItems.push({
      isPlaceholder: true,
      name: "",
      code: "",
      quantity: "",
      unit: "",
      price: 0,
      gstPercent: 0,
      gstAmount: 0,
      amount: 0,
      netAmount: 0
    });
  }

  const isNoTax = printMode === 'notax';

  return `
    <div class="print-invoice-sheet" style="position: relative; background: #fff; border: 1.5px solid #000; padding: 1.25rem; width: 100%; box-sizing: border-box; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000;">
      ${watermarkHTML}
      
      <!-- Company Header (Standard & A5) -->
      <div class="company-header-print" style="${isNoTax ? 'display: none;' : 'display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #000; padding-bottom: 0.5rem; margin-bottom: 0.5rem; color: #000; font-size: 0.8rem; line-height: 1.3;'}">
        <div>
          <h1 style="font-size: 1.45rem; font-weight: bold; margin: 0 0 0.25rem 0; color: #000; letter-spacing: 0.5px;">${companyName}</h1>
          <p style="margin: 0;">${companyAddress}</p>
          <p style="margin: 2px 0 0 0;">Email : ${companyEmail}</p>
          ${companyGstin && !isUnregistered ? `<p style="margin: 2px 0 0 0;">GSTIN : <strong style="font-size: 0.85rem;">${companyGstin}</strong></p>` : ''}
        </div>
        <div style="text-align: right; min-width: 170px;">
          <table style="border-collapse: collapse; margin-left: auto; text-align: left; font-size: 0.75rem; color: #000; line-height: 1.2;">
            <tr><td style="padding: 1px 4px; color: #555;">Phone</td><td style="padding: 1px 4px;">: ${companyPhone}</td></tr>
            <tr><td style="padding: 1px 4px; color: #555;">Mobile</td><td style="padding: 1px 4px;">: ${companyMobile}</td></tr>
            <tr><td style="padding: 1px 4px; color: #555;">State</td><td style="padding: 1px 4px;">: ${companyState}</td></tr>
            <tr><td style="padding: 1px 4px; color: #555;">State Code</td><td style="padding: 1px 4px;">: ${companyStateCode}</td></tr>
          </table>
        </div>
      </div>

      <!-- Reverse Charge & Invoice Metas (Standard Print) -->
      <div class="standard-meta-block" style="${isNoTax ? 'display: none;' : 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; font-size: 0.8rem; color: #000; line-height: 1.3;'}">
        <div>
          <p class="reverse-charge-meta" style="margin: 0;">Tax is payable on Reverse Charge : (Yes / No)</p>
          <p style="margin: 2px 0 0 0;"><strong>Invoice No. &nbsp;&nbsp;&nbsp;&nbsp;: ${inv.voucherNo || inv.id}</strong></p>
          <p style="margin: 2px 0 0 0;"><strong>Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${formatDate(inv.date)}</strong></p>
        </div>
      </div>

      <!-- Invoice Metas (No Tax Print) -->
      <div class="notax-meta-block" style="${isNoTax ? 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; font-size: 0.8rem; color: #000; line-height: 1.3;' : 'display: none;'}">
        <div>
          <strong>Invoice No. &nbsp;&nbsp;&nbsp;&nbsp;: ${inv.voucherNo || inv.id}</strong>
        </div>
        <div style="text-align: right;">
          <strong>Date &nbsp;&nbsp;&nbsp;&nbsp;: ${formatDate(inv.date)}</strong>
        </div>
      </div>

      <!-- Retail Invoice banner -->
      <div class="retail-invoice-banner" style="${isNoTax ? 'display: none;' : 'display: grid; grid-template-columns: 1.2fr 0.8fr; border: 1.5px solid #000; border-bottom: none; color: #000; font-size: 0.8rem;'}">
        <div style="text-align: center; border-right: 1.5px solid #000; padding: 0.25rem; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <strong style="font-size: 0.95rem; letter-spacing: 0.5px;">${isNontaxable ? "RETAIL INVOICE (NON-TAXABLE)" : "RETAIL INVOICE"}</strong>
          <span style="font-size: 0.75rem; color: #333;">${isNontaxable ? "BILL OF SUPPLY" : "GSTINV-1"}</span>
          <strong style="font-size: 0.85rem; margin-top: 2px;">CASH BILL</strong>
        </div>
        <div style="padding: 0.35rem 0.5rem; display: flex; flex-direction: column; justify-content: center; gap: 3px; font-size: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" checked disabled style="margin: 0; pointer-events: none;"> Original for Recipient</div>
          <div style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" disabled style="margin: 0; pointer-events: none;"> Duplicate for Supplier / Transport</div>
          <div style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" disabled style="margin: 0; pointer-events: none;"> Triplicate for Supplier</div>
        </div>
      </div>

      <!-- Billing and Shipping Addresses (Standard Format) -->
      <div class="standard-address-block" style="${isNoTax ? 'display: none;' : 'display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #000; border-bottom: none; color: #000; font-size: 0.8rem; min-height: 85px;'}">
        <div style="border-right: 1.5px solid #000; padding: 0.4rem; display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 0.7rem; color: #555;">M/s.</span>
          <strong style="font-size: 0.9rem; margin-bottom: 2px;">${inv.contactName}</strong>
          ${contact && contact.address ? `<p style="margin: 0; line-height: 1.3; font-size: 0.75rem;">${contact.address.replace(/\n/g, "<br>")}</p>` : ""}
          <div style="margin-top: auto; display: grid; grid-template-columns: 1.2fr 1fr; gap: 2px; font-size: 0.7rem; border-top: 1px dashed #ccc; padding-top: 3px;">
            <div>STATE : ${inv.state || "KERALA"}</div>
            <div>STATE CODE : ${inv.stateCode || "32"}</div>
            <div>Phone : ${contact?.phone || ""}</div>
            <div>Mob : ${contact?.mobile || contact?.whatsApp || ""}</div>
          </div>
        </div>
        <div class="shipping-address-box" style="padding: 0.4rem; display: flex; flex-direction: column; gap: 2px;">
          ${(inv.contactId === "__CASH__" && !(inv.shippingAddress && (inv.shippingAddress.name || inv.shippingAddress.addr1))) ? "" : `
          <strong style="font-size: 0.75rem; text-decoration: underline; text-transform: uppercase; margin-bottom: 2px;">SHIPPING ADDRESS</strong>
          ${(inv.shippingAddress && (inv.shippingAddress.name || inv.shippingAddress.addr1)) ? `<p style="margin: 0; line-height: 1.3; font-size: 0.75rem;"><strong>${inv.shippingAddress.name}</strong><br>${inv.shippingAddress.addr1}<br>${inv.shippingAddress.city} ${inv.shippingAddress.pin}</p>` : (contact && contact.shippingAddress ? `<p style="margin: 0; line-height: 1.3; font-size: 0.75rem;">${contact.shippingAddress.replace(/\n/g, "<br>")}</p>` : (contact && contact.address ? `<p style="margin: 0; line-height: 1.3; font-size: 0.75rem;">${contact.address.replace(/\n/g, "<br>")}</p>` : ""))}
          <div style="margin-top: auto; display: grid; grid-template-columns: 1.2fr 1fr; gap: 2px; font-size: 0.7rem; border-top: 1px dashed #ccc; padding-top: 3px;">
            <div>STATE : ${inv.shippingAddress?.state || inv.state || "KERALA"}</div>
            <div>STATE CODE : ${inv.stateCode || "32"}</div>
            <div>Phone : ${inv.shippingAddress?.phone || contact?.phone || ""}</div>
            <div>Mob : ${contact?.mobile || contact?.whatsApp || ""}</div>
          </div>
          `}
        </div>
      </div>

      <!-- No Tax Address Block -->
      <div class="notax-address-block" style="${isNoTax ? 'display: block; border: 1.5px solid #000; border-bottom: none; color: #000; font-size: 0.8rem; padding: 0.4rem; min-height: 70px;' : 'display: none;'}">
        <span style="font-size: 0.7rem; color: #555;">M/s.</span>
        <strong style="font-size: 0.9rem; margin-bottom: 2px;">${inv.contactName}</strong>
        ${contact && contact.address ? `<p style="margin: 0; line-height: 1.3; font-size: 0.75rem;">${contact.address.replace(/\n/g, "<br>")}</p>` : ""}
        <div style="margin-top: 6px; display: flex; gap: 20px; font-size: 0.75rem; border-top: 1px dashed #ccc; padding-top: 3px;">
          <div>Phone: ${contact?.phone || ""}</div>
          <div>Mob: ${contact?.mobile || contact?.whatsApp || ""}</div>
        </div>
      </div>

      <!-- Items Grid Table (Standard & Nontaxable) -->
      <table class="standard-print-table" style="${isNoTax ? 'display: none;' : 'width: 100%; border-collapse: collapse; color: #000; font-size: 0.75rem; border: 1.5px solid #000; margin: 0;'}">
        ${isNontaxable ? `
        <thead>
          <tr style="background: #f8fafc; text-align: center; font-weight: bold; border-bottom: 1px solid #000;">
            <th style="padding: 0.35rem 0.2rem; width: 30px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem;">Sl.<br>No</th>
            <th style="padding: 0.35rem 0.2rem; width: 85px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem;">HSN/<br>SAC</th>
            <th style="padding: 0.35rem 0.4rem; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: left;">Commodity / Item</th>
            <th style="padding: 0.35rem 0.2rem; width: 80px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right;">Qty.</th>
            <th style="padding: 0.35rem 0.2rem; width: 95px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right;">Unit Price</th>
            <th style="padding: 0.35rem 0.2rem; width: 110px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${displayItems.map((item, index) => {
            if (item.isPlaceholder) {
              return `
                <tr style="height: 22px;">
                  <td style="padding: 0.2rem; border: 1px solid #000; text-align: center;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                </tr>
              `;
            }
            if (item.isAdjustment) {
              const itemTotal = parseFloat(item.netAmount || item.amount || 0) || 0;
              return `
                <tr>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center;">${index + 1}</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center;"></td>
                  <td style="padding: 0.25rem 0.4rem; border: 1px solid #000; font-weight: bold; text-transform: uppercase;">${item.name}</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;"></td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B9${itemTotal.toFixed(2)}</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${itemTotal.toFixed(2)}</td>
                </tr>
              `;
            }
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const itemTotal = parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const hsn = (mat ? mat.hsnCode : "") || item.hsnCode || item.code || "";
            return `
              <tr>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center;">${index + 1}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center; font-family: monospace;">${hsn}</td>
                <td style="padding: 0.25rem 0.4rem; border: 1px solid #000; font-weight: bold;">${item.name}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">${qty} ${item.unit || "pcs"}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B9${price.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${itemTotal.toFixed(2)}</td>
              </tr>
            `;
          }).join("")}
          <tr style="background: #f8fafc; font-weight: bold; border-top: 1.5px solid #000;">
            <td colspan="5" style="padding: 0.35rem 0.4rem; border: 1px solid #000; text-align: right; font-weight: bold;">Total</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${(inv.subtotal + (shouldInlineAdjustments ? totalAdjustments : 0)).toFixed(2)}</td>
          </tr>
        </tbody>
        ` : `
        <thead>
          <tr style="background: #f8fafc; text-align: center; font-weight: bold; border-bottom: 1px solid #000;">
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 30px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; vertical-align: middle;">Sl.<br>No</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 65px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; vertical-align: middle;">HSN/<br>SAC</th>
            <th rowspan="2" style="padding: 0.35rem 0.4rem; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: left; vertical-align: middle;">Commodity / Item</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 60px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">Qty.</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 65px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">Unit<br>Price</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 80px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">Taxable<br>Value</th>
            <th colspan="2" style="padding: 0.2rem; border: 1px solid #000; font-weight: bold; font-size: 0.7rem;">CGST</th>
            <th colspan="2" style="padding: 0.2rem; border: 1px solid #000; font-weight: bold; font-size: 0.7rem;">SGST</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 90px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">Total</th>
          </tr>
          <tr style="background: #f8fafc; text-align: center; font-weight: bold; border-bottom: 1px solid #000;">
            <th style="padding: 0.15rem; width: 30px; border: 1px solid #000; font-weight: bold; font-size: 0.65rem;">%</th>
            <th style="padding: 0.15rem; width: 55px; border: 1px solid #000; font-weight: bold; font-size: 0.65rem;">Amt</th>
            <th style="padding: 0.15rem; width: 30px; border: 1px solid #000; font-weight: bold; font-size: 0.65rem;">%</th>
            <th style="padding: 0.15rem; width: 55px; border: 1px solid #000; font-weight: bold; font-size: 0.65rem;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${displayItems.map((item, index) => {
            if (item.isPlaceholder) {
              return `
                <tr style="height: 22px;">
                  <td style="padding: 0.2rem; border: 1px solid #000; text-align: center;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.20rem; border: 1px solid #000;"></td>
                </tr>
              `;
            }
            if (item.isAdjustment) {
              const itemTotal = parseFloat(item.netAmount || item.amount || 0) || 0;
              return `
                <tr>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center;">${index + 1}</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center;"></td>
                  <td style="padding: 0.25rem 0.4rem; border: 1px solid #000; font-weight: bold; text-transform: uppercase;">${item.name}</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;"></td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B9${itemTotal.toFixed(2)}</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B9${itemTotal.toFixed(2)}</td>
                  <td style="padding: 0.25rem 0.15rem; border: 1px solid #000; text-align: center;">-</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B90.00</td>
                  <td style="padding: 0.25rem 0.15rem; border: 1px solid #000; text-align: center;">-</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B90.00</td>
                  <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${itemTotal.toFixed(2)}</td>
                </tr>
              `;
            }
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const taxableValue = (item.netValue !== undefined && item.netValue !== null) ? parseFloat(item.netValue) : (qty * price - (parseFloat(item.discountAmount) || 0));
            const gstPercent = parseFloat(item.gstPercent) || 0;
            const cgstRate = gstPercent / 2;
            const sgstRate = gstPercent / 2;
            const cgstAmt = (parseFloat(item.gstAmount) || 0) / 2;
            const sgstAmt = (parseFloat(item.gstAmount) || 0) / 2;
            const itemTotal = parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const hsn = (mat ? mat.hsnCode : "") || item.hsnCode || item.code || "";
            return `
              <tr>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center;">${index + 1}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center; font-family: monospace;">${hsn}</td>
                <td style="padding: 0.25rem 0.4rem; border: 1px solid #000; font-weight: bold;">${item.name}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">${qty} ${item.unit || "pcs"}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B9${price.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B9${taxableValue.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.15rem; border: 1px solid #000; text-align: center;">${cgstRate}%</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B9${cgstAmt.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.15rem; border: 1px solid #000; text-align: center;">${sgstRate}%</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">\u20B9${sgstAmt.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${itemTotal.toFixed(2)}</td>
              </tr>
            `;
          }).join("")}
          <tr style="background: #f8fafc; font-weight: bold; border-top: 1.5px solid #000;">
            <td colspan="5" style="padding: 0.35rem 0.4rem; border: 1px solid #000; text-align: right; font-weight: bold;">Total</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${(invSubtotal + (shouldInlineAdjustments ? totalAdjustments : 0)).toFixed(2)}</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000;"></td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${(invTotalGst / 2).toFixed(2)}</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000;"></td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${(invTotalGst / 2).toFixed(2)}</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${(invSubtotal + invTotalGst + (shouldInlineAdjustments ? totalAdjustments : 0)).toFixed(2)}</td>
          </tr>
        </tbody>
        `}
      </table>

      <!-- Items Grid Table (No Tax Print Mode) -->
      <table class="notax-print-table" style="${isNoTax ? 'display: table; width: 100%; border-collapse: collapse; color: #000; font-size: 0.75rem; border: 1.5px solid #000; margin: 0;' : 'display: none;'}">
        <thead>
          <tr style="background: #f8fafc; text-align: center; font-weight: bold; border-bottom: 1px solid #000;">
            <th style="padding: 0.35rem 0.2rem; width: 40px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem;">Sl.<br>No</th>
            <th style="padding: 0.35rem 0.4rem; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: left;">Commodity / Item</th>
            <th style="padding: 0.35rem 0.2rem; width: 85px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem;">Code/Model</th>
            <th style="padding: 0.35rem 0.2rem; width: 90px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right;">Qty.</th>
            <th style="padding: 0.35rem 0.2rem; width: 70px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right;">Unit Price<br>(Incl.)</th>
            <th style="padding: 0.35rem 0.2rem; width: 100px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right;">Total (Gross)</th>
            <th style="padding: 0.35rem 0.2rem; width: 70px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right;">Discount</th>
            <th style="padding: 0.35rem 0.2rem; width: 100px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(combinedRows || []).map((item, index) => {
            if (item.isAdjustment) {
              const itemTotal = parseFloat(item.netAmount || item.amount || 0) || 0;
              return `
                <tr>
                  <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: center;">${index + 1}</td>
                  <td style="padding: 0.25rem 0.4rem; border-left: 1px solid #000; border-right: 1px solid #000; font-weight: bold; text-transform: uppercase;">${item.name}</td>
                  <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: center;"></td>
                  <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right;"></td>
                  <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right;">\u20B9${itemTotal.toFixed(2)}</td>
                  <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right;">\u20B9${itemTotal.toFixed(2)}</td>
                  <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right;">\u20B90.00</td>
                  <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${itemTotal.toFixed(2)}</td>
                </tr>
              `;
            }
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const gstPercent = parseFloat(item.gstPercent) || 0;
            const inclUnitPrice = price * (1 + gstPercent / 100);
            const inclGrossTotal = qty * inclUnitPrice;
            const itemTotal = parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
            const inclRowDisAmt = Math.max(0, inclGrossTotal - itemTotal);
            const mat = state.getMaterials().find(m => m.id === item.materialId);
            const modelCode = item.code || (mat ? mat.code : "");
            return `
              <tr>
                <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: center;">${index + 1}</td>
                <td style="padding: 0.25rem 0.4rem; border-left: 1px solid #000; border-right: 1px solid #000; font-weight: bold;">${item.name}</td>
                <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: center; font-family: monospace;">${modelCode}</td>
                <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right;">${qty} ${item.unit || "pcs"}</td>
                <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right;">\u20B9${inclUnitPrice.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right;">\u20B9${inclGrossTotal.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right;">\u20B9${inclRowDisAmt.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border-left: 1px solid #000; border-right: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${itemTotal.toFixed(2)}</td>
              </tr>
            `;
          }).join("")}
          <tr class="notax-empty-row" style="height: ${Math.max(60, 360 - ((combinedRows ? combinedRows.length : 0) * 26))}px;">
            <td style="border-left: 1px solid #000; border-right: 1px solid #000;"></td>
            <td style="border-left: 1px solid #000; border-right: 1px solid #000;"></td>
            <td style="border-left: 1px solid #000; border-right: 1px solid #000;"></td>
            <td style="border-left: 1px solid #000; border-right: 1px solid #000;"></td>
            <td style="border-left: 1px solid #000; border-right: 1px solid #000;"></td>
            <td style="border-left: 1px solid #000; border-right: 1px solid #000;"></td>
            <td style="border-left: 1px solid #000; border-right: 1px solid #000;"></td>
            <td style="border-left: 1px solid #000; border-right: 1px solid #000;"></td>
          </tr>
          <tr style="background: #f8fafc; font-weight: bold; border-top: 1.5px solid #000;">
            <td colspan="7" style="padding: 0.35rem 0.4rem; border: 1px solid #000; text-align: right; font-weight: bold;">Total</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">\u20B9${invTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Standard Bottom Summary -->
      <div class="standard-summary-box" style="${isNoTax ? 'display: none;' : 'display: grid; grid-template-columns: 1.3fr 0.7fr; border: 1.5px solid #000; border-top: none; color: #000; font-size: 0.75rem;'}">
        <div style="padding: 0.4rem; display: flex; flex-direction: column; gap: 8px; justify-content: space-between; border-right: 1.5px solid #000;">
          ${isNontaxable ? `
            <div>
              <span style="font-size: 0.7rem; color: #555; display: block; margin-bottom: 2px;">Grand Total in words :</span>
              <strong style="font-size: 0.75rem; text-transform: uppercase;">${getAmountInWords(invTotal)}</strong>
            </div>
          ` : `
            <div style="font-size: 0.7rem; font-weight: bold; background-color: #f8fafc; padding: 3px 5px; border: 1px solid #cbd5e1; border-radius: 2px;">
              [GST Summary : 18% of ${invSubtotal.toFixed(2)} = ${invTotalGst.toFixed(2)}]
            </div>
            <div>
              <span style="font-size: 0.7rem; color: #555; display: block; margin-bottom: 2px;">Grand Total in words :</span>
              <strong style="font-size: 0.75rem; text-transform: uppercase;">${getAmountInWords(invTotal)}</strong>
            </div>
          `}
        </div>
        <div style="padding: 0.4rem; display: flex; flex-direction: column; gap: 3px; justify-content: flex-end;">
          ${!shouldInlineAdjustments ? ((inv.adjustmentsList && inv.adjustmentsList.length > 0) ? inv.adjustmentsList.map(adj => `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>${adj.name}</span>
              <span>: \u20B9${parseFloat(adj.amount || 0).toFixed(2)}</span>
            </div>
          `).join("") : (invAdjustments !== 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>Adjustments</span>
              <span>: \u20B9${invAdjustments.toFixed(2)}</span>
            </div>
          ` : "")) : ""}
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
            <span>Round Off</span>
            <span>: \u20B9${invRoundOff.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; border-top: 1px solid #000; padding-top: 3px; margin-top: 1px;">
            <span style="border: 1px solid #000; padding: 1px 4px; font-weight: bold; background-color: #f8fafc; font-size: 0.75rem;">Grand Total</span>
            <span style="font-size: 0.9rem; font-weight: bold;">\u20B9${invTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- No Tax Bottom Summary -->
      <div class="notax-summary-box" style="${isNoTax ? 'display: grid; grid-template-columns: 1.3fr 0.7fr; border: 1.5px solid #000; border-top: none; color: #000; font-size: 0.75rem;' : 'display: none;'}">
        <div style="padding: 0.4rem;"></div>
        <div style="padding: 0.4rem; display: flex; flex-direction: column; gap: 3px; justify-content: flex-end;">
          ${!shouldInlineAdjustments ? ((inv.adjustmentsList && inv.adjustmentsList.length > 0) ? inv.adjustmentsList.map(adj => `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>${adj.name}</span>
              <span>: \u20B9${parseFloat(adj.amount || 0).toFixed(2)}</span>
            </div>
          `).join("") : (invAdjustments !== 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>Adjustments</span>
              <span>: \u20B9${invAdjustments.toFixed(2)}</span>
            </div>
          ` : "")) : ""}
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; border-top: 1px solid #000; padding-top: 3px; margin-top: 1px;">
            <span style="border: 1px solid #000; padding: 1px 4px; font-weight: bold; background-color: #f8fafc; font-size: 0.75rem;">Net Value</span>
            <span style="font-size: 0.9rem; font-weight: bold;">\u20B9${invTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Direct Instant Printing via Dedicated Attached Iframe
 */
export function executeInstantPrint(invoiceOrId, printMode = 'standard') {
  let inv = null;
  if (typeof invoiceOrId === 'object' && invoiceOrId !== null) {
    inv = invoiceOrId;
  } else {
    inv = state.getInvoices().find(i => String(i.id) === String(invoiceOrId) || String(i.voucherNo) === String(invoiceOrId));
  }

  if (!inv) {
    if (invoiceOrId && invoiceOrId.querySelector) {
      const sheet = invoiceOrId.querySelector(".print-invoice-sheet") || invoiceOrId;
      printHtmlDocument(sheet.outerHTML, printMode);
      return;
    }
    console.error("Invoice not found for printing:", invoiceOrId);
    return;
  }

  const invoiceHtml = generateInvoiceHtml(inv, printMode);
  printHtmlDocument(invoiceHtml, printMode);
}

function printHtmlDocument(bodyContent, printMode = 'standard') {
  const oldFrame = document.getElementById("erp-bill-print-frame");
  if (oldFrame) oldFrame.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "erp-bill-print-frame";
  iframe.style.cssText = "position:absolute; top:-9999px; left:-9999px; width:800px; height:1000px; border:none; opacity:0; pointer-events:none;";
  document.body.appendChild(iframe);

  let pageMargin = "6mm";
  let pageSize = "A4 portrait";
  let zoomLevel = "100%";

  if (printMode === 'a5') {
    pageSize = "A5 portrait";
    pageMargin = "4mm";
    zoomLevel = "78%";
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice Print</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page {
            size: ${pageSize};
            margin: ${pageMargin};
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #000;
            background: #fff;
            zoom: ${zoomLevel};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-invoice-sheet {
            border: 1.5px solid #000 !important;
            padding: 1rem !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn("Iframe print fallback:", e);
      window.print();
    }
  };

  setTimeout(triggerPrint, 250);
}

/**
 * Show Dedicated Non-Destructive Invoice Print Preview Modal
 */
export function showInvoicePrintPreview(container, invoiceId, printMode = 'standard') {
  const inv = (typeof invoiceId === 'object' && invoiceId !== null)
    ? invoiceId
    : state.getInvoices().find(i => String(i.id) === String(invoiceId) || String(i.voucherNo) === String(invoiceId));

  if (!inv) {
    alert("Invoice not found.");
    return;
  }

  const existingOverlay = document.getElementById("invoice-preview-modal-overlay");
  if (existingOverlay) existingOverlay.remove();

  let activeMode = printMode;

  const overlay = document.createElement("div");
  overlay.id = "invoice-preview-modal-overlay";
  overlay.className = "modal-overlay active blocking-modal";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(2px);
    z-index: 100050;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow-y: auto;
    padding: 20px 10px;
    box-sizing: border-box;
    pointer-events: auto !important;
  `;

  function renderPreview() {
    overlay.innerHTML = `
      <div style="width: 100%; max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; pointer-events: auto;">
        
        <!-- Action Header Bar -->
        <div class="no-print" style="background: #1e293b; border-radius: 6px; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); flex-wrap: wrap; gap: 8px; pointer-events: auto;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn btn-secondary" id="btn-preview-close" style="padding: 6px 14px; font-weight: 700; background: #475569; border: none; color: white; cursor: pointer; border-radius: 4px;">
              <i class="fa-solid fa-arrow-left"></i> Close (Esc)
            </button>
            <span style="color: #94a3b8; font-size: 0.85rem; font-weight: 600;">Invoice: <strong style="color: #fff;">${inv.voucherNo || inv.id}</strong></span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn" id="btn-preview-print-a4" style="padding: 6px 14px; font-weight: 700; background: ${activeMode === 'standard' ? '#2563eb' : '#334155'}; border: none; color: white; cursor: pointer; border-radius: 4px;">
              <i class="fa-solid fa-print"></i> Print (A4)
            </button>
            <button type="button" class="btn" id="btn-preview-print-a5" style="padding: 6px 14px; font-weight: 700; background: ${activeMode === 'a5' ? '#0284c7' : '#334155'}; border: none; color: white; cursor: pointer; border-radius: 4px;">
              <i class="fa-solid fa-print"></i> Print A5
            </button>
            <button type="button" class="btn" id="btn-preview-print-notax" style="padding: 6px 14px; font-weight: 700; background: ${activeMode === 'notax' ? '#16a34a' : '#334155'}; border: none; color: white; cursor: pointer; border-radius: 4px;">
              <i class="fa-solid fa-file-lines"></i> No Tax Print
            </button>
            <button type="button" class="btn" id="btn-preview-whatsapp" style="padding: 6px 14px; font-weight: 700; background: #22c55e; border: none; color: white; cursor: pointer; border-radius: 4px;">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </button>
          </div>
        </div>

        <!-- Printable Invoice Container Sheet -->
        <div id="invoice-sheet-container" style="background: white; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); overflow: hidden; pointer-events: auto;">
          ${generateInvoiceHtml(inv, activeMode)}
        </div>

      </div>
    `;

    bindPreviewEvents();
  }

  function closePreview() {
    window.removeEventListener("keydown", handleKeydown);
    overlay.remove();
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePreview();
    }
  }

  function bindPreviewEvents() {
    overlay.querySelector("#btn-preview-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      closePreview();
    });
    
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePreview();
    });

    overlay.querySelector("#btn-preview-print-a4")?.addEventListener("click", (e) => {
      e.stopPropagation();
      activeMode = 'standard';
      renderPreview();
      executeInstantPrint(inv, 'standard');
    });

    overlay.querySelector("#btn-preview-print-a5")?.addEventListener("click", (e) => {
      e.stopPropagation();
      activeMode = 'a5';
      renderPreview();
      executeInstantPrint(inv, 'a5');
    });

    overlay.querySelector("#btn-preview-print-notax")?.addEventListener("click", (e) => {
      e.stopPropagation();
      activeMode = 'notax';
      renderPreview();
      executeInstantPrint(inv, 'notax');
    });

    overlay.querySelector("#btn-preview-whatsapp")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleWhatsAppShare(inv);
    });
  }

  window.addEventListener("keydown", handleKeydown);
  document.body.appendChild(overlay);
  renderPreview();
}

/**
 * Clean WhatsApp Sharing
 */
function handleWhatsAppShare(inv) {
  const contact = state.getContacts().find(c => c.id === inv.contactId);
  let waNumber = contact ? (contact.whatsApp || contact.mobile || contact.phone || "") : "";
  if (!waNumber.trim()) {
    const inputNum = prompt("Enter WhatsApp Number (e.g. 919876543210):");
    if (inputNum === null) return;
    waNumber = inputNum.trim();
  }
  if (!waNumber) {
    alert("WhatsApp number is required.");
    return;
  }
  
  const cleanNum = waNumber.replace(/\D/g, "");
  const itemsList = (inv.items || []).map(item => {
    const itemTotal = parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
    return `- ${item.name} (${item.quantity} ${item.unit || 'pcs'}): \u20B9${itemTotal.toFixed(2)}`;
  }).join("\n");
  
  const invTotal = parseFloat(inv.total ?? inv.grandTotal ?? inv.amount ?? 0) || 0;
  const msg = `Dear *${inv.contactName || "Customer"}*,\n\nHere is your *Invoice ${inv.voucherNo || inv.id}* dated *${formatDate(inv.date)}*.\n\n*Items Summary*:\n${itemsList}\n\n*Total Net*: *\u20B9${invTotal.toFixed(2)}*\n\n*Material Ledger ERP*`;
  
  const waUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, "_blank");
}
