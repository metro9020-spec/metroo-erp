import { state } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";
import { showInvoicePrintPreview } from "./invoices.js";
import {
  showInvoiceBuilderModal,
  showRecordPurchaseModal,
  showSalesReturnModal,
  showPurchaseReturnModal
} from "./transactions.js";
import { showRearrangeBillsModal } from "./rearrangeBillsModal.js";

export function showCanceledBillsReportModal(type = "sales", container = null) {
  const root = document.getElementById("modal-container-root") || container || document.body;
  
  // Default dates (current date or range)
  const today = new Date().toISOString().split("T")[0];
  let currentDocType = type || "sales";
  let selectedCanceledId = null;

  const getTitle = (docType) => {
    switch(docType) {
      case "purchase":
        return "CANCELED PURCHASE BILLS REPORT & SERIES ADJUSTER";
      case "sales_return":
        return "CANCELED SALES RETURN REPORT & SERIES ADJUSTER";
      case "purchase_return":
        return "CANCELED PURCHASE RETURN REPORT & SERIES ADJUSTER";
      case "sales":
      default:
        return "CANCELED SALES BILLS REPORT & SERIES ADJUSTER";
    }
  };

  const renderHTML = () => {
    root.innerHTML = `
      <div class="modal-overlay active" id="canceled-report-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.35); backdrop-filter: blur(1px); z-index:2000; position:fixed; top:0; left:0; width:100%; height:100%;">
        <div class="modal-container modal-lg" style="max-width:1100px; width: 95vw; background-color:#cbd5e1; color:#0f172a; padding:10px; font-family: sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); font-size:0.8rem; display:flex; flex-direction:column; gap:8px;">
          
          <!-- Header ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:4px 8px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-ban" style="color:#f87171;"></i>
              <span id="can-report-title" style="font-size:0.85rem;">${getTitle(currentDocType)}</span>
            </div>
            <button id="can-close-x-btn" style="background:none; border:none; color:white; font-size:1.1rem; cursor:pointer; padding:0 4px;">&times;</button>
          </div>

          <!-- Filter & Action section bar -->
          <div style="background-color: #e2e8f0; border: 1px solid #94a3b8; padding: 6px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 8px;">
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              <div>
                <label style="font-weight:bold;">Voucher Type:</label>
                <select id="can-doc-type" class="form-control" style="background:white; color:black; padding:2px 4px; font-size:0.78rem; font-weight:bold; border:1px solid #94a3b8; border-radius:3px;">
                  <option value="sales" ${currentDocType === 'sales' ? 'selected' : ''}>Sales Bills</option>
                  <option value="purchase" ${currentDocType === 'purchase' ? 'selected' : ''}>Purchase Bills</option>
                  <option value="sales_return" ${currentDocType === 'sales_return' ? 'selected' : ''}>Sales Return</option>
                  <option value="purchase_return" ${currentDocType === 'purchase_return' ? 'selected' : ''}>Purchase Return</option>
                </select>
              </div>
              <div>
                <label style="font-weight:bold;">From Date:</label>
                <input type="date" id="can-date-from" value="${today}" class="form-control" style="background:white; color:black; padding:2px 4px; font-size:0.78rem;">
              </div>
              <div>
                <label style="font-weight:bold;">To Date:</label>
                <input type="date" id="can-date-to" value="${today}" class="form-control" style="background:white; color:black; padding:2px 4px; font-size:0.78rem;">
              </div>
            </div>

            <div>
              <label style="font-weight:bold; margin-top:4px;">Bill No.</label>
              <input type="text" id="can-search-bill" class="form-control" style="background:white; color:black; padding:2px 4px; font-size:0.78rem; margin-top:4px;" placeholder="Search...">
            </div>

            <!-- Command Buttons -->
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-primary" id="btn-can-view" style="background:#1e3b8b; color:white; font-weight:bold; padding:4px 12px; font-size:0.78rem; border-radius:3px; border:none; cursor:pointer;"><i class="fa-solid fa-eye"></i> View</button>
              <button type="button" class="btn btn-secondary" id="btn-can-preview" style="background:#475569; color:white; font-weight:bold; padding:4px 12px; font-size:0.78rem; border-radius:3px; border:none; cursor:pointer;"><i class="fa-solid fa-print"></i> Preview</button>
              <button type="button" class="btn btn-primary" id="btn-can-rearrange" style="background:#2563eb; color:white; font-weight:bold; padding:4px 12px; font-size:0.78rem; border-radius:3px; border:none; cursor:pointer;" title="Rearrange all bills in series in ascending order without skipping"><i class="fa-solid fa-arrow-down-1-9"></i> Rearrange Series</button>
              <button type="button" class="btn btn-danger" id="btn-can-remove" style="background:#dc2626; color:white; font-weight:bold; padding:4px 12px; font-size:0.78rem; border-radius:3px; border:none; cursor:pointer;" title="Remove selected cancelled record and re-adjust series sequence"><i class="fa-solid fa-trash-can"></i> Remove & Adjust Series</button>
              <button type="button" class="btn btn-danger" id="btn-can-remove-all" style="background:#991b1b; color:white; font-weight:bold; padding:4px 12px; font-size:0.78rem; border-radius:3px; border:none; cursor:pointer;" title="Remove all filtered cancelled records and re-adjust series sequence"><i class="fa-solid fa-dumpster-fire"></i> Remove All & Adjust</button>
              <button type="button" class="btn btn-secondary" id="btn-can-close" style="padding:4px 12px; font-weight:bold; background-color:#e2e8f0; border:1px solid #475569; color:black; font-size:0.78rem; border-radius:3px; cursor:pointer;">Close</button>
            </div>
          </div>

          <!-- Main Table Grid -->
          <div style="border: 1px solid #94a3b8; background-color: white; min-height:350px; max-height:450px; overflow-y:auto; border-radius:2px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.78rem; color:black;">
              <thead>
                <tr style="background-color:#b4c6e7; color:black; border-bottom: 2px solid #8faadc; font-weight:bold; position:sticky; top:0;">
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1; width: 140px;">Bill / Voucher No</th>
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1; width: 100px;">Date</th>
                  <th id="can-table-party-label" style="padding:6px 8px; border-right:1px solid #cbd5e1;">Party</th>
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1; text-align:right; width: 120px;">Amount</th>
                  <th style="padding:6px 8px; border-right:1px solid #cbd5e1; width: 120px;">User</th>
                  <th style="padding:6px 8px; text-align:center; width: 180px;">Action</th>
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

  const openLayoutForBill = (id) => {
    if (!id) return;
    const subContainer = document.getElementById("sub-modal-container-root") || document.body;
    if (currentDocType === "sales") {
      const inv = (state.getInvoices() || []).find(i => i.id === id);
      if (inv) {
        showInvoiceBuilderModal(subContainer, null, null, null, inv);
      }
    } else if (currentDocType === "purchase") {
      const pur = (state.getPurchases() || []).find(p => p.id === id);
      if (pur) {
        showRecordPurchaseModal(subContainer, pur, null);
      }
    } else if (currentDocType === "sales_return") {
      const ret = (state.getSalesReturns() || []).find(r => r.id === id);
      if (ret) {
        showSalesReturnModal(subContainer, ret, null);
      }
    } else if (currentDocType === "purchase_return") {
      const ret = (state.getPurchaseReturns() || []).find(r => r.id === id);
      if (ret) {
        showPurchaseReturnModal(subContainer, ret, null);
      }
    }
  };

  const renderData = () => {
    const docTypeSelect = document.getElementById("can-doc-type");
    if (docTypeSelect) {
      currentDocType = docTypeSelect.value;
    }
    const titleSpan = document.getElementById("can-report-title");
    if (titleSpan) {
      titleSpan.textContent = getTitle(currentDocType);
    }

    const isSalesType = currentDocType === "sales";
    const isPurchaseType = currentDocType === "purchase";
    const isSalesReturnType = currentDocType === "sales_return";
    const isPurchaseReturnType = currentDocType === "purchase_return";

    const partyLabel = (isSalesType || isSalesReturnType) ? "Customer" : "Vendor";
    const partyHeaderEl = document.getElementById("can-table-party-label");
    if (partyHeaderEl) partyHeaderEl.textContent = partyLabel;

    const fromDate = document.getElementById("can-date-from").value;
    const toDate = document.getElementById("can-date-to").value;
    const searchVal = document.getElementById("can-search-bill").value.toLowerCase();

    let itemsList = [];
    if (isSalesType) {
      itemsList = (state.getInvoices() || []).filter(i => i.isCancelled);
    } else if (isPurchaseType) {
      itemsList = (state.getPurchases() || []).filter(p => p.isCancelled);
    } else if (isSalesReturnType) {
      itemsList = (state.getSalesReturns() || []).filter(r => r.isCancelled);
    } else if (isPurchaseReturnType) {
      itemsList = (state.getPurchaseReturns() || []).filter(r => r.isCancelled);
    }

    // Filter by dates and search value
    const filtered = itemsList.filter(item => {
      const matchDate = (!fromDate || item.date >= fromDate) && (!toDate || item.date <= toDate);
      const billNo = (item.voucherNo || item.refNo || item.invoiceNo || item.id || "").toLowerCase();
      const matchSearch = !searchVal || billNo.includes(searchVal);
      return matchDate && matchSearch;
    });

    tbody.innerHTML = filtered.map(item => {
      const billNo = item.voucherNo || item.refNo || item.invoiceNo || item.id || "-";
      const totalAmt = (item.total || 0).toFixed(2);
      const defaultParty = (isSalesType || isSalesReturnType) ? "General Customer" : "General Vendor";
      const partyName = item.contactName || defaultParty;
      const user = item.createdBy || "Admin";

      return `
        <tr style="border-bottom:1px solid #e2e8f0; cursor:pointer;" class="canceled-bill-row" data-id="${item.id}">
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1; font-weight:bold; color:#1e3b8b;">${billNo}</td>
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1;">${formatDate(item.date)}</td>
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1;">${partyName}</td>
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1; text-align:right; font-weight:500;">\u20B9${totalAmt}</td>
          <td style="padding:6px 8px; border-right:1px solid #cbd5e1;">${user}</td>
          <td style="padding:4px 6px; text-align:center; display:flex; gap:4px; justify-content:center;">
            <button type="button" class="btn btn-secondary btn-restore" data-id="${item.id}" style="padding:2px 6px; font-size:0.72rem; background-color:#107c41; color:white; border:none; border-radius:3px; font-weight:bold; cursor:pointer;" title="Restore canceled bill">Restore</button>
            <button type="button" class="btn btn-danger btn-remove-adjust" data-id="${item.id}" style="padding:2px 6px; font-size:0.72rem; background-color:#dc2626; color:white; border:none; border-radius:3px; font-weight:bold; cursor:pointer;" title="Permanently remove bill and re-adjust series like it didn't exist"><i class="fa-solid fa-trash-can"></i> Remove & Adjust</button>
          </td>
        </tr>
      `;
    }).join("");

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:30px; color:#64748b; font-style:italic;">No canceled records found for the selected type and range.</td>
        </tr>
      `;
    }

    // Attach row selection and double-click handlers
    tbody.querySelectorAll(".canceled-bill-row").forEach(row => {
      row.addEventListener("click", () => {
        tbody.querySelectorAll(".canceled-bill-row").forEach(r => r.style.background = "");
        row.style.background = "#dbeafe";
        selectedCanceledId = row.getAttribute("data-id");
      });
      row.addEventListener("dblclick", (e) => {
        if (e.target.classList.contains("btn-restore") || e.target.classList.contains("btn-remove-adjust")) return;
        const id = row.getAttribute("data-id");
        openLayoutForBill(id);
      });
    });

    // Attach click listener for Restore button
    tbody.querySelectorAll(".btn-restore").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");

        let docTypeName = "sales invoice";
        if (currentDocType === "purchase") docTypeName = "purchase bill";
        else if (currentDocType === "sales_return") docTypeName = "sales return";
        else if (currentDocType === "purchase_return") docTypeName = "purchase return";

        const confirmMsg = `Are you sure you want to restore this canceled ${docTypeName}? This will restore stock levels and recreate ledger entries.`;
        
        if (confirm(confirmMsg)) {
          const pass = prompt(`Enter Admin Password to restore this ${docTypeName}:`);
          if (pass === null) return;
          if (pass !== state.getAdminPassword()) {
            alert("Incorrect password!");
            return;
          }

          let success = false;
          if (currentDocType === "sales") success = state.restoreInvoice(id);
          else if (currentDocType === "purchase") success = state.restorePurchase(id);
          else if (currentDocType === "sales_return") success = state.restoreSalesReturn(id);
          else if (currentDocType === "purchase_return") success = state.restorePurchaseReturn(id);

          if (success) {
            alert(`${docTypeName.toUpperCase()} restored successfully!`);
            selectedCanceledId = null;
            renderData();
          } else {
            alert(`Failed to restore ${docTypeName}.`);
          }
        }
      });
    });

    // Attach click listener for Remove & Adjust Series button on table row
    tbody.querySelectorAll(".btn-remove-adjust").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        let item = null;
        if (currentDocType === "sales") item = (state.getInvoices() || []).find(i => i.id === id);
        else if (currentDocType === "purchase") item = (state.getPurchases() || []).find(p => p.id === id);
        else if (currentDocType === "sales_return") item = (state.getSalesReturns() || []).find(r => r.id === id);
        else if (currentDocType === "purchase_return") item = (state.getPurchaseReturns() || []).find(r => r.id === id);

        const billNo = item ? (item.voucherNo || item.refNo || item.invoiceNo || item.id || id) : id;

        let docTypeName = "sales invoice";
        if (currentDocType === "purchase") docTypeName = "purchase bill";
        else if (currentDocType === "sales_return") docTypeName = "sales return";
        else if (currentDocType === "purchase_return") docTypeName = "purchase return";

        const confirmMsg = `Are you sure you want to PERMANENTLY REMOVE canceled ${docTypeName} ${billNo}?\n\nThis will completely delete the record and re-adjust series numbers like it never existed.`;
        
        if (confirm(confirmMsg)) {
          const pass = prompt(`Enter Admin Password to remove this canceled ${docTypeName} and re-adjust series:`);
          if (pass === null) return;
          if (pass !== state.getAdminPassword()) {
            alert("Incorrect password! Access denied.");
            return;
          }

          let success = false;
          if (currentDocType === "sales" || currentDocType === "purchase") {
            success = state.removeCancelledBill(id, currentDocType, true);
          } else if (currentDocType === "sales_return") {
            success = state.deleteSalesReturn(id);
          } else if (currentDocType === "purchase_return") {
            success = state.deletePurchaseReturn(id);
          }

          if (success) {
            alert(`Canceled ${docTypeName} ${billNo} permanently removed and sequence re-adjusted successfully!`);
            selectedCanceledId = null;
            renderData();
          } else {
            alert("Failed to remove canceled record.");
          }
        }
      });
    });
  };

  document.getElementById("btn-can-view").addEventListener("click", () => {
    if (selectedCanceledId) {
      openLayoutForBill(selectedCanceledId);
    } else {
      const fromDate = document.getElementById("can-date-from").value;
      const toDate = document.getElementById("can-date-to").value;
      const searchVal = document.getElementById("can-search-bill").value.toLowerCase();
      
      let itemsList = [];
      if (currentDocType === "sales") itemsList = (state.getInvoices() || []).filter(i => i.isCancelled);
      else if (currentDocType === "purchase") itemsList = (state.getPurchases() || []).filter(p => p.isCancelled);
      else if (currentDocType === "sales_return") itemsList = (state.getSalesReturns() || []).filter(r => r.isCancelled);
      else if (currentDocType === "purchase_return") itemsList = (state.getPurchaseReturns() || []).filter(r => r.isCancelled);

      const filtered = itemsList.filter(item => {
        const matchDate = (!fromDate || item.date >= fromDate) && (!toDate || item.date <= toDate);
        const billNo = (item.voucherNo || item.refNo || item.invoiceNo || item.id || "").toLowerCase();
        const matchSearch = !searchVal || billNo.includes(searchVal);
        return matchDate && matchSearch;
      });

      if (filtered.length > 0) {
        openLayoutForBill(filtered[0].id);
      } else {
        alert("No canceled records available to view.");
      }
    }
  });

  document.getElementById("btn-can-preview").addEventListener("click", () => {
    if (selectedCanceledId && currentDocType === "sales") {
      showInvoicePrintPreview(document.body, selectedCanceledId);
    } else if (currentDocType === "sales") {
      const canceledInvoices = (state.getInvoices() || []).filter(i => i.isCancelled);
      if (canceledInvoices.length > 0) {
        showInvoicePrintPreview(document.body, canceledInvoices[0].id);
      } else {
        alert("No canceled sales invoice selected.");
      }
    } else {
      if (selectedCanceledId) {
        openLayoutForBill(selectedCanceledId);
      } else {
        alert("Please select a canceled record from the list to preview.");
      }
    }
  });

  // Action toolbar Remove & Adjust button handler
  document.getElementById("btn-can-remove")?.addEventListener("click", () => {
    if (!selectedCanceledId) {
      alert("Please select a canceled record from the table first.");
      return;
    }
    let item = null;
    if (currentDocType === "sales") item = (state.getInvoices() || []).find(i => i.id === selectedCanceledId);
    else if (currentDocType === "purchase") item = (state.getPurchases() || []).find(p => p.id === selectedCanceledId);
    else if (currentDocType === "sales_return") item = (state.getSalesReturns() || []).find(r => r.id === selectedCanceledId);
    else if (currentDocType === "purchase_return") item = (state.getPurchaseReturns() || []).find(r => r.id === selectedCanceledId);

    const billNo = item ? (item.voucherNo || item.refNo || item.invoiceNo || item.id || selectedCanceledId) : selectedCanceledId;

    let docTypeName = "sales invoice";
    if (currentDocType === "purchase") docTypeName = "purchase bill";
    else if (currentDocType === "sales_return") docTypeName = "sales return";
    else if (currentDocType === "purchase_return") docTypeName = "purchase return";

    const confirmMsg = `Are you sure you want to PERMANENTLY REMOVE selected canceled ${docTypeName} ${billNo}?\n\nThis will delete the record and re-adjust series numbers like it never existed.`;
    if (confirm(confirmMsg)) {
      const pass = prompt(`Enter Admin Password to remove this canceled ${docTypeName} and re-adjust series:`);
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password! Access denied.");
        return;
      }

      let success = false;
      if (currentDocType === "sales" || currentDocType === "purchase") {
        success = state.removeCancelledBill(selectedCanceledId, currentDocType, true);
      } else if (currentDocType === "sales_return") {
        success = state.deleteSalesReturn(selectedCanceledId);
      } else if (currentDocType === "purchase_return") {
        success = state.deletePurchaseReturn(selectedCanceledId);
      }

      if (success) {
        alert(`Canceled ${docTypeName} ${billNo} permanently removed and sequence re-adjusted successfully!`);
        selectedCanceledId = null;
        renderData();
      } else {
        alert("Failed to remove canceled record.");
      }
    }
  });

  // Action toolbar Remove All & Adjust button handler
  document.getElementById("btn-can-remove-all")?.addEventListener("click", () => {
    const fromDate = document.getElementById("can-date-from").value;
    const toDate = document.getElementById("can-date-to").value;
    const searchVal = document.getElementById("can-search-bill").value.toLowerCase();

    let itemsList = [];
    if (currentDocType === "sales") itemsList = (state.getInvoices() || []).filter(i => i.isCancelled);
    else if (currentDocType === "purchase") itemsList = (state.getPurchases() || []).filter(p => p.isCancelled);
    else if (currentDocType === "sales_return") itemsList = (state.getSalesReturns() || []).filter(r => r.isCancelled);
    else if (currentDocType === "purchase_return") itemsList = (state.getPurchaseReturns() || []).filter(r => r.isCancelled);

    const filtered = itemsList.filter(item => {
      const matchDate = (!fromDate || item.date >= fromDate) && (!toDate || item.date <= toDate);
      const billNo = (item.voucherNo || item.refNo || item.invoiceNo || item.id || "").toLowerCase();
      const matchSearch = !searchVal || billNo.includes(searchVal);
      return matchDate && matchSearch;
    });

    if (filtered.length === 0) {
      alert("No canceled records found in current range to remove.");
      return;
    }

    let docTypeName = "sales invoice";
    if (currentDocType === "purchase") docTypeName = "purchase bill";
    else if (currentDocType === "sales_return") docTypeName = "sales return";
    else if (currentDocType === "purchase_return") docTypeName = "purchase return";

    const confirmMsg = `WARNING: Are you sure you want to PERMANENTLY REMOVE ALL ${filtered.length} canceled ${docTypeName}(s) in this list?\n\nThis action cannot be undone. All listed canceled records will be deleted and series sequence re-adjusted.`;
    if (confirm(confirmMsg)) {
      const pass = prompt(`Enter Admin Password to remove all listed canceled ${docTypeName}(s):`);
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password! Access denied.");
        return;
      }

      let count = 0;
      filtered.forEach(item => {
        let ok = false;
        if (currentDocType === "sales" || currentDocType === "purchase") {
          ok = state.removeCancelledBill(item.id, currentDocType, false);
        } else if (currentDocType === "sales_return") {
          ok = state.deleteSalesReturn(item.id);
        } else if (currentDocType === "purchase_return") {
          ok = state.deletePurchaseReturn(item.id);
        }
        if (ok) count++;
      });

      if (count > 0) {
        state.realignSeriesCurrentNumbers();
        state.recomputeAllStocks();
        state.saveState();
        state.notifyListeners();
        alert(`Successfully removed ${count} canceled ${docTypeName}(s) and re-adjusted series sequence!`);
        selectedCanceledId = null;
        renderData();
      } else {
        alert("Failed to remove canceled records.");
      }
    }
  });

  // Document type change dropdown trigger refresh
  document.getElementById("can-doc-type").addEventListener("change", () => {
    selectedCanceledId = null;
    renderData();
  });
  
  // Date range inputs change trigger automatic refresh
  document.getElementById("can-date-from").addEventListener("change", renderData);
  document.getElementById("can-date-to").addEventListener("change", renderData);
  document.getElementById("can-search-bill").addEventListener("input", renderData);

  document.getElementById("btn-can-rearrange")?.addEventListener("click", () => {
    let txType = "Sales";
    if (currentDocType === "purchase") txType = "Purchase";
    else if (currentDocType === "sales_return") txType = "Sales Return";
    else if (currentDocType === "purchase_return") txType = "Purchase Return";
    showRearrangeBillsModal("ALL");
  });

  // Initialize
  renderData();
}
