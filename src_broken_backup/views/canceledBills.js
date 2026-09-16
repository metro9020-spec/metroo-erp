import { state } from "../state.js";

export function showCanceledBillsReportModal(type = "sales", container = null) {
  const root = document.getElementById("modal-container-root");
  
  // Default dates (current date or range)
  const today = new Date().toISOString().split("T")[0];
  
  const isSales = type === "sales";
  const title = isSales ? "CANCELED SALES BILLS REPORT" : "CANCELED PURCHASE BILLS REPORT";
  const partyLabel = isSales ? "Customer" : "Vendor";

  const renderHTML = () => {
    root.innerHTML = `
      <div class="modal-overlay active" id="canceled-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000; position:fixed; top:0; left:0; width:100%; height:100%;">
        <div class="modal-container modal-lg" style="max-width:1050px; width: 95vw; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
          
          <!-- Header ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
            <div style="display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-ban"></i> ${title}</div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="can-close-x-btn">&times;</button>
          </div>

          <!-- Upper Filters Row -->
          <div style="display:flex; gap:15px; background:#b4c6e7; padding:8px 12px; border:1px solid #8faadc; border-radius:2px; align-items:center; justify-content:space-between;">
            
            <!-- Date Range Group -->
            <div style="display:flex; align-items:center; gap:8px; border:1px solid #8faadc; background:#d9e1f2; padding:4px 8px; border-radius:3px; position:relative;">
              <span style="position:absolute; top:-8px; left:8px; background:#cbd5e1; padding:0 4px; font-size:0.7rem; font-weight:bold; border:1px solid #8faadc; border-radius:3px; color:#1e3a8a;">Date Range</span>
              <label style="font-weight:bold; margin-top:4px;">From</label>
              <input type="date" id="can-date-from" class="form-control" style="background:white; color:black; padding:2px 4px; font-size:0.78rem; width:125px; margin-top:4px;" value="${today}">
              <label style="font-weight:bold; margin-top:4px;">To</label>
              <input type="date" id="can-date-to" class="form-control" style="background:white; color:black; padding:2px 4px; font-size:0.78rem; width:125px; margin-top:4px;" value="${today}">
            </div>

            <!-- Search Group -->
            <div style="display:flex; align-items:center; gap:8px; border:1px solid #8faadc; background:#d9e1f2; padding:4px 8px; border-radius:3px; position:relative; flex-grow:1; max-width:250px;">
              <span style="position:absolute; top:-8px; left:8px; background:#cbd5e1; padding:0 4px; font-size:0.7rem; font-weight:bold; border:1px solid #8faadc; border-radius:3px; color:#1e3a8a;">Search</span>
              <label style="font-weight:bold; margin-top:4px;">Bill No.</label>
              <input type="text" id="can-search-bill" class="form-control" style="background:white; color:black; padding:2px 4px; font-size:0.78rem; margin-top:4px;" placeholder="Search...">
            </div>

            <!-- Command Buttons -->
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn btn-primary" id="btn-can-view" style="background:#1e3b8b; color:white; font-weight:bold; padding:4px 15px; font-size:0.78rem; border-radius:3px; border:none; cursor:pointer;"><i class="fa-solid fa-eye"></i> View</button>
              <button type="button" class="btn btn-secondary" id="btn-can-preview" style="background:#475569; color:white; font-weight:bold; padding:4px 15px; font-size:0.78rem; border-radius:3px; border:none; cursor:pointer;"><i class="fa-solid fa-print"></i> Preview</button>
              <button type="button" class="btn btn-secondary" id="btn-can-close" style="padding:4px 15px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; font-size:0.78rem; border-radius:3px; cursor:pointer;">Close</button>
            </div>
          </div>

          <!-- Main Table Grid -->
          <div style="border: 1px solid #94a3b8; background-color: white; min-height:350px; max-height:450px; overflow-y:auto; border-radius:2px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.78rem; color:black;">
              <thead>
                <tr style="background-color:#b4c6e7; color:black; border-bottom: 2px solid #8faadc; font-weight:bold; position:sticky; top:0;">
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1; width: 140px;">Bill No</th>
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1; width: 100px;">Date</th>
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1;">${partyLabel}</th>
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1; text-align:right; width: 120px;">Amount</th>
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1; width: 120px;">User</th>
                  <th style="padding:6px 8px; text-align:center; width: 120px;">Action</th>
                </tr>
              </thead>
              <tbody id="can-report-tbody">
                <!-- Rows populated dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  };

  renderHTML();

  const overlay = document.getElementById("canceled-report-overlay");
  const tbody = document.getElementById("can-report-tbody");
  
  const close = () => {
    overlay.remove();
  };

  document.getElementById("can-close-x-btn").addEventListener("click", close);
  document.getElementById("btn-can-close").addEventListener("click", close);

  const renderData = () => {
    const fromDate = document.getElementById("can-date-from").value;
    const toDate = document.getElementById("can-date-to").value;
    const searchVal = document.getElementById("can-search-bill").value.toLowerCase();

    let itemsList = [];
    if (isSales) {
      itemsList = state.getInvoices().filter(i => i.isCancelled);
    } else {
      itemsList = state.getPurchases().filter(p => p.isCancelled);
    }

    // Filter by dates and search value
    const filtered = itemsList.filter(item => {
      const matchDate = (!fromDate || item.date >= fromDate) && (!toDate || item.date <= toDate);
      const billNo = (item.voucherNo || item.refNo || item.invoiceNo || "").toLowerCase();
      const matchSearch = !searchVal || billNo.includes(searchVal);
      return matchDate && matchSearch;
    });

    tbody.innerHTML = filtered.map(item => {
      const billNo = item.voucherNo || item.refNo || item.invoiceNo || "-";
      const totalAmt = (item.total || 0).toFixed(2);
      const partyName = item.contactName || (isSales ? "General Customer" : "General Vendor");
      const user = item.createdBy || "Admin";

      return `
        <tr style="border-bottom:1px solid #e2e8f0; cursor:pointer;" class="canceled-bill-row" data-id="${item.id}">
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${billNo}</td>
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1;">${item.date}</td>
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1;">${partyName}</td>
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1; text-align:right; font-weight:500;">₹${totalAmt}</td>
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1;">${user}</td>
          <td style="padding:4px 6px; text-align:center;">
            <button type="button" class="btn btn-secondary btn-restore" data-id="${item.id}" style="padding:2px 8px; font-size:0.72rem; background-color:#107c41; color:white; border:none; border-radius:3px; font-weight:bold; cursor:pointer;">Restore</button>
          </td>
        </tr>
      `;
    }).join("");

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:30px; color:#64748b; font-style:italic;">No canceled bills found for the selected range.</td>
        </tr>
      `;
    }

    // Attach row double-click to view the invoice details (read-only)
    tbody.querySelectorAll(".canceled-bill-row").forEach(row => {
      row.addEventListener("dblclick", (e) => {
        if (e.target.classList.contains("btn-restore")) return;
        const id = row.getAttribute("data-id");
        if (isSales) {
          import("./transactions.js").then(m => {
            const inv = state.getInvoices().find(i => i.id === id);
            m.showInvoiceBuilderModal(container, null, null, null, inv);
          });
        } else {
          import("./transactions.js").then(m => {
            const pur = state.getPurchases().find(p => p.id === id);
            m.showRecordPurchaseModal(container, pur, null);
          });
        }
      });
    });

    // Attach click listener for Restore button
    tbody.querySelectorAll(".btn-restore").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        const confirmMsg = isSales 
          ? "Are you sure you want to restore this canceled sales invoice? This will restore stock levels and recreate ledger entries."
          : "Are you sure you want to restore this canceled purchase bill? This will restore stock levels and recreate ledger entries.";
        
        if (confirm(confirmMsg)) {
          const pass = prompt("Enter Admin Password to restore this bill:");
          if (pass === null) return;
          if (pass !== state.getAdminPassword()) {
            alert("Incorrect password!");
            return;
          }

          const success = isSales ? state.restoreInvoice(id) : state.restorePurchase(id);
          if (success) {
            alert("Bill restored successfully!");
            renderData();
          } else {
            alert("Failed to restore bill.");
          }
        }
      });
    });
  };

  document.getElementById("btn-can-view").addEventListener("click", renderData);
  
  // Date range inputs change trigger automatic refresh
  document.getElementById("can-date-from").addEventListener("change", renderData);
  document.getElementById("can-date-to").addEventListener("change", renderData);
  document.getElementById("can-search-bill").addEventListener("input", renderData);

  // Initialize
  renderData();
}
