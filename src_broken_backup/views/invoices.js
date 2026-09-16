import { state } from "../state.js";
import { showInvoiceBuilderModal } from "./transactions.js";

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
  });

  container.innerHTML = `
    <!-- Top Stats Row -->
    <div class="metrics-grid">
      <div class="metric-card sales">
        <div class="metric-icon"><i class="fa-solid fa-file-invoice"></i></div>
        <div class="metric-details">
          <span class="metric-label">Total Invoiced Sales</span>
          <span class="metric-value">$${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="metric-card receivables">
        <div class="metric-icon"><i class="fa-solid fa-clock"></i></div>
        <div class="metric-details">
          <span class="metric-label">Outstanding Receivables</span>
          <span class="metric-value">$${unpaidSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="metric-card cash">
        <div class="metric-icon"><i class="fa-solid fa-wallet"></i></div>
        <div class="metric-details">
          <span class="metric-label">Total Cash Collected</span>
          <span class="metric-value">$${paidSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
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
              const bal = inv.total - inv.paidAmount;
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
                  <td>${inv.date}</td>
                  <td>${inv.dueDate}</td>
                  <td><strong>${inv.contactName}</strong></td>
                  <td style="text-align: right;">$${inv.subtotal.toFixed(2)}</td>
                  <td style="text-align: right;">$${inv.taxAmount.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600;">$${inv.total.toFixed(2)}</td>
                  <td style="text-align: right; color: var(--success); font-weight: 500;">$${inv.paidAmount.toFixed(2)}</td>
                  <td style="text-align: right; color: ${bal > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-weight: 600;">$${bal.toFixed(2)}</td>
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
export function showInvoicePrintPreview(container, invoiceId, onClosePreview = null) {
  if (!window.html2canvas) {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    document.head.appendChild(script);
  }

  const inv = state.getInvoices().find(i => i.id === invoiceId);
  if (!inv) return;
  const contact = state.getContacts().find(c => c.id === inv.contactId);

  const watermarkHTML = inv.isCancelled ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 6rem; font-weight: 900; color: rgba(239, 68, 68, 0.18); pointer-events: none; white-space: nowrap; user-select: none; z-index: 9999;">
      CANCELLED
    </div>
  ` : "";

  const activeCompanyId = state.getActiveCompanyId ? state.getActiveCompanyId() : null;
  const activeCompany = activeCompanyId ? state.getRegisteredCompanies().find(c => c.id === activeCompanyId) : null;

  const companyName = activeCompany?.name || "METRO AGENCIES";
  const companyAddress = activeCompany?.address || "POKKUNDU, KURUMATHUR, KANNUR - 670142";
  const companyEmail = activeCompany?.email || "";
  const companyGstin = activeCompany?.gstin || "32AFUPH3623R1ZX";
  const companyPhone = activeCompany?.phone || "04602224904";
  const companyMobile = activeCompany?.mobile || "9020877748";
  const companyState = activeCompany?.state || "KERALA";
  const companyStateCode = activeCompany?.stateCode || "32";

  function getAmountInWords(amount) {
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
    const integerPart = Math.floor(amount);
    const words = numToWords(integerPart);
    return (words ? words + ' Rupees Only' : 'Zero Rupees Only');
  }

  const displayItems = [...(inv.items || [])];
  while (displayItems.length < 14) {
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

  const backBtnText = container.id === "modal-container-root" ? "Close Preview" : "Back to Listing";

  const actionBarHtml = `
    <div class="action-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem; max-width: 850px; margin-left: auto; margin-right: auto; display: flex; gap: 8px; flex-wrap: wrap;">
      <button class="btn btn-secondary" id="btn-back-invoices"><i class="fa-solid fa-arrow-left"></i> ${backBtnText}</button>
      <button class="btn btn-primary" id="btn-trigger-print"><i class="fa-solid fa-print"></i> Print Invoice (PDF)</button>
      <button class="btn btn-primary" id="btn-trigger-print-a5" style="background:#0284c7; border:none;"><i class="fa-solid fa-print"></i> Print A5</button>
      <button class="btn btn-primary" id="btn-trigger-print-notax" style="background:#f59e0b; border:none;"><i class="fa-solid fa-print"></i> NO TAX PRINT</button>
      <button class="btn btn-success" id="btn-send-whatsapp" style="background-color:#25d366; border:none; color:white;"><i class="fa-brands fa-whatsapp"></i> Send WhatsApp</button>
      ${!inv.isCancelled ? `
        <button class="btn btn-danger" id="btn-cancel-invoice-preview" style="background-color: #ef4444; border: none; color: white;"><i class="fa-solid fa-ban"></i> Cancel Invoice</button>
      ` : `
        <button class="btn btn-success" id="btn-restore-invoice-preview" style="background-color: #10b981; border: none; color: white;"><i class="fa-solid fa-rotate-left"></i> Restore Invoice</button>
      `}
    </div>
  `;

  const innerHTML = `
    <div class="print-invoice-container" style="position: relative; background: #fff; border: 1.5px solid #000; padding: 1.5rem; max-width: 850px; margin: 0 auto; box-shadow: var(--shadow-lg); overflow: hidden; font-family: sans-serif;">
      ${watermarkHTML}

      <!-- Invoice Title Header -->
      <div class="tax-only" style="text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 10px;">
        <h2 style="font-size: 1.15rem; font-weight: bold; margin: 0; letter-spacing: 1.5px; color: #000;">TAX INVOICE</h2>
      </div>

      <!-- Company header -->
      <div class="tax-only" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #000; padding-bottom: 0.5rem; margin-bottom: 0.5rem; color: #000; font-size: 0.8rem; line-height: 1.3;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: bold; margin: 0 0 0.25rem 0; color: #000; letter-spacing: 0.5px;">${companyName}</h1>
          <p style="margin: 0;">${companyAddress}</p>
          <p style="margin: 2px 0 0 0;">Email : ${companyEmail}</p>
          <p style="margin: 2px 0 0 0;">GSTIN : <strong style="font-size: 0.85rem;">${companyGstin}</strong></p>
        </div>
        <div style="text-align: right; min-width: 180px;">
          <table style="border-collapse: collapse; margin-left: auto; text-align: left; font-size: 0.75rem; color: #000; line-height: 1.2;">
            <tr><td style="padding: 1px 4px; color: #555;">Phone</td><td style="padding: 1px 4px;">: ${companyPhone}</td></tr>
            <tr><td style="padding: 1px 4px; color: #555;">Mobile</td><td style="padding: 1px 4px;">: ${companyMobile}</td></tr>
            <tr><td style="padding: 1px 4px; color: #555;">State</td><td style="padding: 1px 4px;">: ${companyState}</td></tr>
            <tr><td style="padding: 1px 4px; color: #555;">State Code</td><td style="padding: 1px 4px;">: ${companyStateCode}</td></tr>
          </table>
        </div>
      </div>

      <!-- Reverse Charge & Invoice Metas -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.5rem; font-size: 0.8rem; color: #000; line-height: 1.3;">
        <div>
          <p class="tax-only" style="margin: 0;">Tax is payable on Reverse Charge : (Yes / No)</p>
          <p style="margin: 2px 0 0 0;"><strong>Invoice No. &nbsp;&nbsp;&nbsp;&nbsp;: ${inv.voucherNo || inv.id}</strong></p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0;"><strong>Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${inv.date}</strong></p>
          ${inv.vehicleNo ? `<p style="margin: 2px 0 0 0;"><strong>Vehicle No. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${inv.vehicleNo}</strong></p>` : ""}
        </div>
      </div>

      <!-- Billing & Shipping Addresses -->
      <div style="border: 1.5px solid #000; border-bottom: none; color: #000; font-size: 0.8rem; min-height: 90px; display: flex; margin: 0;">
        <!-- Left: Billing Address -->
        <div style="flex: 1; padding: 0.4rem; display: flex; flex-direction: column; gap: 2px; ${inv.shippingAddress ? 'border-right: 1.5px solid #000;' : ''}">
          <span style="font-size: 0.7rem; color: #555;">Billing Address (M/s.)</span>
          <strong style="font-size: 0.95rem; margin-bottom: 2px;">${inv.contactName}</strong>
          ${contact && contact.billingAddress ? `<p style="margin: 0; line-height: 1.3; font-size: 0.75rem;">${contact.billingAddress.replace(/\n/g, "<br>")}</p>` : ""}
          <div style="margin-top: auto; display: flex; gap: 25px; font-size: 0.7rem; border-top: 1px dashed #ccc; padding-top: 3px; flex-wrap: wrap;">
            <div>STATE : ${inv.state || "KERALA"}</div>
            <div>STATE CODE : ${inv.stateCode || "32"}</div>
            <div>Phone : ${contact?.phone || ""}</div>
            <div>Mob : ${contact?.mobile || contact?.whatsApp || ""}</div>
          </div>
        </div>
        <!-- Right: Shipping Address -->
        ${(() => {
          if (!inv.shippingAddress) return "";
          let ship = null;
          if (typeof inv.shippingAddress === "string") {
            try {
              ship = JSON.parse(inv.shippingAddress);
            } catch(e) {
              return `
                <div style="flex: 1; padding: 0.4rem; display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 0.7rem; color: #555;">Shipping Address</span>
                  <p style="margin: 0; line-height: 1.3; font-size: 0.75rem; font-weight: bold;">${inv.shippingAddress.replace(/\n/g, "<br>")}</p>
                </div>
              `;
            }
          } else {
            ship = inv.shippingAddress;
          }
          if (!ship || (!ship.name && !ship.address && !ship.mobile && !ship.gstin && !ship.state)) return "";
          return `
            <div style="flex: 1; padding: 0.4rem; display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 0.7rem; color: #555;">Shipping Address (Consignee)</span>
              ${ship.name ? `<strong style="font-size: 0.95rem; margin-bottom: 2px;">${ship.name}</strong>` : ""}
              ${ship.address ? `<p style="margin: 0; line-height: 1.3; font-size: 0.75rem;">${ship.address.replace(/\n/g, "<br>")}</p>` : ""}
              <div style="margin-top: auto; display: flex; gap: 15px; font-size: 0.7rem; border-top: 1px dashed #ccc; padding-top: 3px; flex-wrap: wrap;">
                ${ship.state ? `<div>STATE : ${ship.state}</div>` : ""}
                ${ship.stateCode ? `<div>STATE CODE : ${ship.stateCode}</div>` : ""}
                ${ship.gstin ? `<div>GSTIN : ${ship.gstin}</div>` : ""}
                ${ship.mobile ? `<div>Mob : ${ship.mobile}</div>` : ""}
              </div>
            </div>
          `;
        })()}
      </div>

      <!-- Items Grid Table -->
      <table class="tax-only" style="width: 100%; border-collapse: collapse; color: #000; font-size: 0.75rem; border: 1.5px solid #000; margin: 0;">
        <thead>
          <tr style="background: #f8fafc; text-align: center; font-weight: bold; border-bottom: 1px solid #000;">
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 30px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; vertical-align: middle;">Sl.<br>No</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 65px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; vertical-align: middle;">HSN/<br>SAC</th>
            <th rowspan="2" style="padding: 0.35rem 0.4rem; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: left; vertical-align: middle;">Commodity / Item</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 60px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">Qty.</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 65px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">Unit<br>Price</th>
            <th rowspan="2" style="padding: 0.35rem 0.2rem; width: 90px; border: 1px solid #000; font-weight: bold; font-size: 0.65rem; text-align: right; vertical-align: middle;">Net Taxable<br>Value<br>(after discount)</th>
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
                <tr class="placeholder-row placeholder-${index + 1}" style="height: 22px;">
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
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const taxableValue = parseFloat(item.netValue) !== undefined && item.netValue !== null ? parseFloat(item.netValue) : (qty * price);
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
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">₹${price.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">₹${taxableValue.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.15rem; border: 1px solid #000; text-align: center;">${cgstRate}%</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">₹${cgstAmt.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.15rem; border: 1px solid #000; text-align: center;">${sgstRate}%</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">₹${sgstAmt.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">₹${itemTotal.toFixed(2)}</td>
              </tr>
            `;
          }).join("")}
          <!-- Totals Row -->
          <tr style="background: #f8fafc; font-weight: bold; border-top: 1.5px solid #000;">
            <td colspan="5" style="padding: 0.35rem 0.4rem; border: 1px solid #000; text-align: right; font-weight: bold;">Total</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">₹${(inv.subtotal - inv.totalDiscount).toFixed(2)}</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000;"></td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">₹${(inv.totalGst / 2).toFixed(2)}</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000;"></td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">₹${(inv.totalGst / 2).toFixed(2)}</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">₹${(inv.subtotal - inv.totalDiscount + inv.totalGst).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Items Grid Table (NO TAX) -->
      <table class="no-tax-only" style="display: none; width: 100%; border-collapse: collapse; color: #000; font-size: 0.75rem; border: 1.5px solid #000; margin: 0;">
        <thead>
          <tr style="background: #f8fafc; text-align: center; font-weight: bold; border-bottom: 1px solid #000;">
            <th style="padding: 0.35rem 0.2rem; width: 40px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; vertical-align: middle;">SL NO</th>
            <th style="padding: 0.35rem 0.4rem; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: left; vertical-align: middle;">PRODUCT NAME</th>
            <th style="padding: 0.35rem 0.2rem; width: 120px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: left; vertical-align: middle;">PRODUCT MODEL</th>
            <th style="padding: 0.35rem 0.2rem; width: 70px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">QTY</th>
            <th style="padding: 0.35rem 0.2rem; width: 100px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">UNIT PRICE<br>(INCLUSIVE TAX)</th>
            <th style="padding: 0.35rem 0.2rem; width: 90px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">AMOUNT</th>
            <th style="padding: 0.35rem 0.2rem; width: 80px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">DISCOUNT</th>
            <th style="padding: 0.35rem 0.2rem; width: 100px; border: 1px solid #000; font-weight: bold; font-size: 0.7rem; text-align: right; vertical-align: middle;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${displayItems.map((item, index) => {
            if (item.isPlaceholder) {
              return `
                <tr class="placeholder-row placeholder-${index + 1}" style="height: 22px;">
                  <td style="padding: 0.2rem; border: 1px solid #000; text-align: center;"></td>
                  <td style="padding: 0.2rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.2rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.2rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.2rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.2rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.2rem; border: 1px solid #000;"></td>
                  <td style="padding: 0.2rem; border: 1px solid #000;"></td>
                </tr>
              `;
            }
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const gstPercent = parseFloat(item.gstPercent) || 0;
            const inclusivePrice = price * (1 + gstPercent / 100);
            const grossInclAmount = qty * inclusivePrice;
            const itemTotal = parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
            const inclDiscount = grossInclAmount - itemTotal;
            const model = item.code || "";
            return `
              <tr>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: center;">${index + 1}</td>
                <td style="padding: 0.25rem 0.4rem; border: 1px solid #000; font-weight: bold;">${item.name}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; font-family: monospace;">${model}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">${qty} ${item.unit || "pcs"}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">₹${inclusivePrice.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right;">₹${grossInclAmount.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right; color: #ef4444;">₹${inclDiscount.toFixed(2)}</td>
                <td style="padding: 0.25rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">₹${itemTotal.toFixed(2)}</td>
              </tr>
            `;
          }).join("")}
          <!-- Totals Row (NO TAX) -->
          <tr style="background: #f8fafc; font-weight: bold; border-top: 1.5px solid #000;">
            <td colspan="5" style="padding: 0.35rem 0.4rem; border: 1px solid #000; text-align: right; font-weight: bold;">Total</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">₹${(() => {
              let totalGross = 0;
              displayItems.forEach(item => {
                if (!item.isPlaceholder) {
                  const qty = parseFloat(item.quantity) || 0;
                  const price = parseFloat(item.price) || 0;
                  const gstPercent = parseFloat(item.gstPercent) || 0;
                  totalGross += qty * price * (1 + gstPercent / 100);
                }
              });
              return totalGross.toFixed(2);
            })()}</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; color: #ef4444; font-weight: bold;">₹${(() => {
              let totalDis = 0;
              displayItems.forEach(item => {
                if (!item.isPlaceholder) {
                  const qty = parseFloat(item.quantity) || 0;
                  const price = parseFloat(item.price) || 0;
                  const gstPercent = parseFloat(item.gstPercent) || 0;
                  const itemTotal = parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
                  totalDis += (qty * price * (1 + gstPercent / 100)) - itemTotal;
                }
              });
              return totalDis.toFixed(2);
            })()}</td>
            <td style="padding: 0.35rem 0.2rem; border: 1px solid #000; text-align: right; font-weight: bold;">₹${(() => {
              let grandTot = 0;
              displayItems.forEach(item => {
                if (!item.isPlaceholder) {
                  grandTot += parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
                }
              });
              return grandTot.toFixed(2);
            })()}</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; border: 1.5px solid #000; border-top: none; min-height: 80px; color: #000;">
        <!-- Left Side: GST Summary & Word conversion -->
        <div style="padding: 0.4rem; display: flex; flex-direction: column; gap: 8px; justify-content: space-between; border-right: 1.5px solid #000; width: 100%; max-width: 480px;">
          <div>
            <div class="tax-only" style="font-size: 0.7rem; font-weight: bold; background-color: #f8fafc; padding: 3px 5px; border: 1px solid #cbd5e1; border-radius: 2px;">
              [GST Summary : 18% of ${(inv.subtotal - inv.totalDiscount).toFixed(2)} = ${inv.totalGst.toFixed(2)}]
            </div>
            ${(inv.totalDiscount || 0) > 0 ? `
              <div class="tax-only" style="font-size: 0.75rem; color: #ef4444; font-weight: bold; margin-top: 4px;">
                Total Discount: ₹${(inv.totalDiscount || 0).toFixed(2)}
              </div>
            ` : ""}
          </div>
          <div class="no-tax-only" style="display: none; height: 10px;"></div>
          <div>
            <span style="font-size: 0.7rem; color: #555; display: block; margin-bottom: 2px;">Grand Total in words :</span>
            <strong style="font-size: 0.75rem; text-transform: uppercase;">${getAmountInWords(inv.total)}</strong>
          </div>
        </div>
        <!-- Right Side: Round Off, Grand Total -->
        <!-- Tax summary -->
        <div class="tax-only" style="padding: 0.4rem; display: flex; flex-direction: column; gap: 3px; justify-content: flex-end; width: 100%;">
          ${(inv.totalCess || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>Cess</span>
              <span>: ₹${(inv.totalCess || 0).toFixed(2)}</span>
            </div>
          ` : ""}
          ${(inv.adjustmentsList || []).map(a => `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>${a.name}</span>
              <span>: ${a.type === "Deduct" ? "-" : ""}₹${(parseFloat(a.amount) || 0).toFixed(2)}</span>
            </div>
          `).join("")}
          ${(!inv.adjustmentsList || inv.adjustmentsList.length === 0) && inv.adjustments ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>Adjustment</span>
              <span>: ₹${(inv.adjustments || 0).toFixed(2)}</span>
            </div>
          ` : ""}
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
            <span>Round Off</span>
            <span>: ₹${(inv.roundOff || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; border-top: 1px solid #000; padding-top: 3px; margin-top: 1px;">
            <span style="border: 1px solid #000; padding: 1px 4px; font-weight: bold; background-color: #f8fafc; font-size: 0.75rem;">Grand Total</span>
            <span style="font-size: 0.9rem; font-weight: bold;">₹${inv.total.toFixed(2)}</span>
          </div>
        </div>
        <!-- No-Tax summary -->
        <div class="no-tax-only" style="display: none; padding: 0.4rem; flex-direction: column; gap: 3px; justify-content: flex-end; width: 100%;">
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
            <span>Subtotal</span>
            <span>: ₹${(() => {
              let totalGross = 0;
              displayItems.forEach(item => {
                if (!item.isPlaceholder) {
                  const qty = parseFloat(item.quantity) || 0;
                  const price = parseFloat(item.price) || 0;
                  const gstPercent = parseFloat(item.gstPercent) || 0;
                  totalGross += qty * price * (1 + gstPercent / 100);
                }
              });
              return totalGross.toFixed(2);
            })()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #ef4444;">
            <span>Discount</span>
            <span>: -₹${(() => {
              let totalDis = 0;
              displayItems.forEach(item => {
                if (!item.isPlaceholder) {
                  const qty = parseFloat(item.quantity) || 0;
                  const price = parseFloat(item.price) || 0;
                  const gstPercent = parseFloat(item.gstPercent) || 0;
                  const itemTotal = parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
                  totalDis += (qty * price * (1 + gstPercent / 100)) - itemTotal;
                }
              });
              return totalDis.toFixed(2);
            })()}</span>
          </div>
          ${(inv.adjustmentsList || []).map(a => `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>${a.name}</span>
              <span>: ${a.type === "Deduct" ? "-" : ""}₹${(parseFloat(a.amount) || 0).toFixed(2)}</span>
            </div>
          `).join("")}
          ${(!inv.adjustmentsList || inv.adjustmentsList.length === 0) && inv.adjustments ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>Adjustment</span>
              <span>: ₹${(inv.adjustments || 0).toFixed(2)}</span>
            </div>
          ` : ""}
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
            <span>Round Off</span>
            <span>: ₹${(inv.roundOff || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; border-top: 1px solid #000; padding-top: 3px; margin-top: 1px;">
            <span style="border: 1px solid #000; padding: 1px 4px; font-weight: bold; background-color: #f8fafc; font-size: 0.75rem;">Grand Total</span>
            <span style="font-size: 0.9rem; font-weight: bold;">₹${inv.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Terms & Signature block -->
      <div class="tax-only" style="display: flex; border: 1.5px solid #000; border-top: none; color: #000; font-size: 0.7rem; min-height: 80px;">
        <!-- Left: Declaration / Terms -->
        <div style="flex: 1.2; padding: 0.4rem; border-right: 1.5px solid #000; display: flex; flex-direction: column; gap: 4px; justify-content: space-between;">
          <div>
            <strong style="font-size: 0.75rem; text-transform: uppercase;">Declaration:</strong>
            <p style="margin: 2px 0 0 0; line-height: 1.3; color: #333;">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
          </div>
        </div>
        <!-- Right: Authorised Signatory -->
        <div style="flex: 0.8; padding: 0.4rem; display: flex; flex-direction: column; justify-content: space-between; text-align: center;">
          <strong style="font-size: 0.75rem; text-transform: uppercase;">For ${companyName}</strong>
          <div style="height: 35px;"></div>
          <span style="font-weight: bold; border-top: 1px dashed #000; display: inline-block; padding-top: 3px; width: 80%; margin: 0 auto;">Authorised Signatory</span>
        </div>
      </div>
    </div>
  `;

  if (container.id === "modal-container-root") {
    container.innerHTML = `
      <div id="print-preview-overlay" class="modal-overlay active" style="display:flex; justify-content:center; align-items:flex-start; background: rgba(15,23,42,0.4); backdrop-filter: blur(1.5px); z-index:99999; overflow-y:auto; padding: 40px 0;">
        <div class="modal-container" style="background: transparent; border: none; box-shadow: none; padding: 0; width:100%; max-width:850px; margin: 0 auto; display:flex; flex-direction:column; gap:0;">
          ${actionBarHtml}
          ${innerHTML}
        </div>
      </div>
    `;
  } else {
    container.innerHTML = actionBarHtml + innerHTML;
  }

  document.getElementById("btn-back-invoices").addEventListener("click", () => {
    const styleEl = document.getElementById("invoice-print-style");
    if (styleEl) styleEl.remove();
    const a5StyleEl = document.getElementById("a5-print-style");
    if (a5StyleEl) a5StyleEl.remove();

    if (onClosePreview) {
      onClosePreview();
      return;
    }

    if (container.id === "modal-container-root") {
      container.innerHTML = "";
    } else {
      renderInvoices(container);
    }
  });

  const printCss = `
    #print-preview-overlay { pointer-events: auto !important; }
    @page {
      size: auto;
      margin: 0mm;
    }
    body.no-tax-mode .tax-only {
      display: none !important;
    }
    body.no-tax-mode .no-tax-only {
      display: block !important;
    }
    body.no-tax-mode table.no-tax-only {
      display: table !important;
    }
    body.no-tax-mode div.no-tax-only {
      display: flex !important;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      body {
        padding-top: 0mm !important;
        padding-bottom: 0mm !important;
        padding-left: 5mm !important;
        padding-right: 5mm !important;
      }
      /* Hide all interface elements and input/edit modal frames */
      .erp-menu-bar, .erp-sidebar, .window-header, .sidebar-panel, .sidebar, .sidebar-nav, .action-header, button, .action-header *, #modal-overlay, .modal-container:not(:has(.print-invoice-container)) {
        display: none !important;
      }
      
      /* Hide main app if printing from modal container */
      body:has(#modal-container-root .print-invoice-container) #app {
        display: none !important;
      }
      
      /* Hide any modal roots or sub-modals that do NOT contain the active print container */
      #modal-container-root:not(:has(.print-invoice-container)),
      #sub-modal-container-root:not(:has(.print-invoice-container)) {
        display: none !important;
      }
      .modal-overlay:not(:has(.print-invoice-container)) {
        display: none !important;
      }
      
      /* If printing from within app workspace (non-modal) */
      body:not(:has(#modal-container-root .print-invoice-container)) #app > *:not(#erp-workspace) {
        display: none !important;
      }
      body:not(:has(#modal-container-root .print-invoice-container)) #erp-workspace > *:not(#active-window) {
        display: none !important;
      }
      body:not(:has(#modal-container-root .print-invoice-container)) #active-window > *:not(#window-content-area) {
        display: none !important;
      }
      body:not(:has(#modal-container-root .print-invoice-container)) #window-content-area > *:not(.print-invoice-container) {
        display: none !important;
      }

      *::-webkit-scrollbar {
        display: none !important;
      }
      /* Clean modal wrappers and containers layout for print */
      html, body, #app, #erp-workspace, #active-window, #window-content-area, .modal-overlay, .modal-container, #modal-container-root, #print-preview-overlay {
        background: none !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
        position: static !important;
        top: 0 !important;
        left: 0 !important;
        transform: none !important;
        display: block !important;
        overflow: visible !important;
      }

      .print-invoice-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
        color: black !important;
        width: 100% !important;
      }
    }
  `;

  // Inject style immediately so Ctrl+P also works
  const existingStyle = document.getElementById("invoice-print-style");
  if (existingStyle) existingStyle.remove();
  const styleEl = document.createElement("style");
  styleEl.id = "invoice-print-style";
  styleEl.innerHTML = printCss;
  document.head.appendChild(styleEl);

  document.getElementById("btn-trigger-print").addEventListener("click", () => {
    window.print();
  });
  const btnWhatsapp = document.getElementById("btn-send-whatsapp");
  if (btnWhatsapp) {
    btnWhatsapp.addEventListener("click", () => {
      let waNumber = contact ? (contact.whatsApp || contact.mobile || contact.phone || "") : "";
      if (!waNumber.trim()) {
        const inputNum = prompt("Enter WhatsApp Number (with country code, e.g. 919876543210):");
        if (inputNum === null) return;
        waNumber = inputNum.trim();
      }
      if (!waNumber) {
        alert("WhatsApp number is required.");
        return;
      }
      
      const cleanNum = waNumber.replace(/\D/g, "");
      const itemsList = inv.items.map(item => {
        const itemTotal = parseFloat(item.netAmount || item.amount || item.netValue || 0) || 0;
        return `- ${item.name} (${item.quantity} ${item.unit || 'pcs'}): ₹${itemTotal.toFixed(2)}`;
      }).join("\n");
      const msg = `Dear *${inv.contactName}*,\n\nHere is your *Invoice ${inv.voucherNo || inv.id}* dated *${inv.date}*. (Please press Ctrl+V to paste the invoice image in chat)\n\n*Items Summary*:\n${itemsList}\n\n*Total Net*: *₹${inv.total.toFixed(2)}*\n\n*Material Ledger ERP*`;

      // Visual indicator that rendering has started
      const originalText = btnWhatsapp.innerHTML;
      btnWhatsapp.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Copying Image...';
      btnWhatsapp.disabled = true;

      const performCopyAndOpen = () => {
        // Temporarily hide action header to prevent rendering buttons in image
        const actHeader = document.querySelector(".action-header");
        if (actHeader) actHeader.style.display = "none";

        const containerCard = document.querySelector(".print-invoice-container");
        window.html2canvas(containerCard, {
          useCORS: true,
          scale: 2,
          backgroundColor: "#ffffff"
        }).then(canvas => {
          if (actHeader) actHeader.style.display = "flex";
          
          canvas.toBlob(blob => {
            if (!blob) {
              alert("Failed to render invoice image.");
              btnWhatsapp.innerHTML = originalText;
              btnWhatsapp.disabled = false;
              return;
            }
            
            const clipboardItem = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([clipboardItem]).then(() => {
              btnWhatsapp.innerHTML = originalText;
              btnWhatsapp.disabled = false;
              alert("Invoice Bill Image copied to clipboard successfully!\n\nClick OK to open WhatsApp. Once opened, simply press Ctrl+V (or right-click and Paste) to send the bill image.");
              const waUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
              window.open(waUrl, "_blank");
            }).catch(err => {
              console.error("Clipboard copy failed:", err);
              btnWhatsapp.innerHTML = originalText;
              btnWhatsapp.disabled = false;
              alert("Clipboard access was blocked or failed. Opening WhatsApp chat with details text...");
              const waUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
              window.open(waUrl, "_blank");
            });
          }, "image/png");
        }).catch(err => {
          console.error("html2canvas render failed:", err);
          if (actHeader) actHeader.style.display = "flex";
          btnWhatsapp.innerHTML = originalText;
          btnWhatsapp.disabled = false;
          alert("Rendering image failed. Opening WhatsApp chat with details text...");
          const waUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
          window.open(waUrl, "_blank");
        });
      };

      if (window.html2canvas) {
        performCopyAndOpen();
      } else {
        // Fallback wait for library load
        setTimeout(() => {
          if (window.html2canvas) {
            performCopyAndOpen();
          } else {
            btnWhatsapp.innerHTML = originalText;
            btnWhatsapp.disabled = false;
            alert("Copy tool is loading. Please click the button again in 2 seconds.");
          }
        }, 1500);
      }
    });
  }
  document.getElementById("btn-trigger-print-a5").addEventListener("click", () => {
    const mainStyle = document.getElementById("invoice-print-style");
    if (mainStyle) mainStyle.remove();

    const style = document.createElement("style");
    style.id = "a5-print-style";
    style.innerHTML = printCss + "\n@media print { @page { size: A5 portrait; margin: 5mm; } body { zoom: 80%; } .placeholder-row.placeholder-11, .placeholder-row.placeholder-12, .placeholder-row.placeholder-13, .placeholder-row.placeholder-14 { display: none !important; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => { 
      style.remove(); 
      if (mainStyle) document.head.appendChild(mainStyle);
    }, 1000);
  });

  document.getElementById("btn-trigger-print-notax").addEventListener("click", () => {
    document.body.classList.add("no-tax-mode");

    const mainStyle = document.getElementById("invoice-print-style");
    if (mainStyle) mainStyle.remove();

    const style = document.createElement("style");
    style.id = "a5-print-style";
    style.innerHTML = printCss + "\n@media print { @page { size: A5 portrait; margin: 5mm; } body { zoom: 80%; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => { 
      style.remove(); 
      if (mainStyle) document.head.appendChild(mainStyle);
      document.body.classList.remove("no-tax-mode");
    }, 1000);
  });

  const validatePassword = () => {
    const pass = prompt("Enter Admin Password:");
    if (pass === null) return false;
    if (pass !== state.getAdminPassword()) {
      alert("Incorrect password!");
      return false;
    }
    return true;
  };

  const btnCancel = document.getElementById("btn-cancel-invoice-preview");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      if (confirm(`Are you sure you want to cancel Invoice ${inv.voucherNo || inv.id}?`) && validatePassword()) {
        state.cancelInvoice(inv.id);
        showInvoicePrintPreview(container, inv.id);
      }
    });
  }

  const btnRestore = document.getElementById("btn-restore-invoice-preview");
  if (btnRestore) {
    btnRestore.addEventListener("click", () => {
      if (confirm(`Are you sure you want to restore Invoice ${inv.voucherNo || inv.id}?`) && validatePassword()) {
        state.restoreInvoice(inv.id);
        showInvoicePrintPreview(container, inv.id);
      }
    });
  }
}
