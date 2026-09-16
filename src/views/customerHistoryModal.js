import { state } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";
import { formatDateDisplay } from "../utils/dateUtils.js";
import { showInvoicePrintPreview } from "./invoices.js";

/**
 * Displays the Customer Sales History modal popup
 * @param {Object} customer - The selected customer object ({ id, name, ... })
 * @param {Function} [onSelectInvoice] - Optional callback when an invoice is picked/viewed
 */
export function showCustomerSalesHistoryModal(customer, onSelectInvoice = null) {
  if (!customer) {
    alert("Please select a customer first to view sales history.");
    return;
  }

  const root = document.getElementById("sub-modal-container-root") || document.getElementById("modal-container-root") || document.body;
  
  const customerId = customer.id;
  const customerName = customer.name || "Customer";

  // Fetch all invoices for this customer
  const allInvoices = state.getInvoices() || [];
  const rawCustomerInvoices = allInvoices.filter(inv => {
    if (inv.isCancelled) return false;
    if (customerId === "__CASH__") {
      return inv.contactId === "__CASH__" || (inv.contactName && inv.contactName.toUpperCase().includes("CASH"));
    }
    return inv.contactId === customerId || (inv.contactName && customerName && inv.contactName.trim().toLowerCase() === customerName.trim().toLowerCase());
  });

  // Sort chronologically by date, then id
  rawCustomerInvoices.sort((a, b) => {
    if (a.date !== b.date) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    }
    return String(a.voucherNo || a.id || "").localeCompare(String(b.voucherNo || b.id || ""));
  });

  let selectedIndex = 0;
  let billNoFilter = "";
  let unselectedOnly = false;

  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay active";
  modalOverlay.id = "cust-history-modal-overlay";
  modalOverlay.style.zIndex = "100000";
  modalOverlay.style.display = "flex";
  modalOverlay.style.justifyContent = "center";
  modalOverlay.style.alignItems = "center";
  modalOverlay.style.background = "rgba(15,23,42,0.35)";
  modalOverlay.style.backdropFilter = "blur(1px)";
  modalOverlay.tabIndex = -1;

  function getFilteredInvoices() {
    return rawCustomerInvoices.filter(inv => {
      const vNo = String(inv.voucherNo || inv.id || "").toLowerCase();
      if (billNoFilter && !vNo.includes(billNoFilter.toLowerCase())) {
        return false;
      }
      if (unselectedOnly) {
        const isCash = (inv.payMode || "").toUpperCase() === "CASH";
        const paid = isCash ? (inv.paidAmount !== undefined ? inv.paidAmount : inv.total) : (parseFloat(inv.paidAmount) || 0);
        const bal = isCash ? 0 : ((parseFloat(inv.total) || 0) - paid);
        if (bal <= 0.001) return false;
      }
      return true;
    });
  }

  function renderModal() {
    const list = getFilteredInvoices();

    let totalBillAmt = 0;
    let totalReceivedAmt = 0;
    let totalBalanceAmt = 0;

    const rowsHtml = list.map((inv, idx) => {
      const isCash = (inv.payMode || "").toUpperCase() === "CASH";
      const billAmt = parseFloat(inv.total) || 0;
      const recAmt = isCash ? (inv.paidAmount !== undefined ? parseFloat(inv.paidAmount) || 0 : billAmt) : (parseFloat(inv.paidAmount) || 0);
      const balAmt = isCash ? 0 : Math.max(0, billAmt - recAmt);

      totalBillAmt += billAmt;
      totalReceivedAmt += recAmt;
      totalBalanceAmt += balAmt;

      const isSelected = idx === selectedIndex;
      const vNo = inv.voucherNo || inv.id || "";
      const dateStr = formatDateDisplay(inv.date);
      const billType = inv.payMode || "Credit";
      const soldBy = inv.employee || inv.doctor || "-";

      return `
        <tr class="cust-hist-row" data-index="${idx}" data-invid="${inv.id}" style="cursor:pointer; user-select:none; border-bottom:1px solid #cbd5e1; background-color:${isSelected ? '#0078d7' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')}; color:${isSelected ? '#ffffff' : '#0f172a'}; font-size:0.8rem;">
          <td style="padding:4px 6px; text-align:center; border-right:1px solid #cbd5e1; font-weight:600;">${idx + 1}</td>
          <td style="padding:4px 8px; text-align:left; border-right:1px solid #cbd5e1; font-weight:700;">${vNo}</td>
          <td style="padding:4px 6px; text-align:center; border-right:1px solid #cbd5e1;">${dateStr}</td>
          <td style="padding:4px 8px; text-align:right; border-right:1px solid #cbd5e1; font-weight:600;">${billAmt.toFixed(2)}</td>
          <td style="padding:4px 8px; text-align:right; border-right:1px solid #cbd5e1;">${recAmt.toFixed(2)}</td>
          <td style="padding:4px 8px; text-align:right; border-right:1px solid #cbd5e1; font-weight:700; color:${isSelected ? '#ffffff' : (balAmt > 0 ? '#b91c1c' : '#0f172a')};">${balAmt.toFixed(2)}</td>
          <td style="padding:4px 6px; text-align:center; border-right:1px solid #cbd5e1;">${billType}</td>
          <td style="padding:4px 6px; text-align:center;">${soldBy}</td>
        </tr>
      `;
    }).join("");

    modalOverlay.innerHTML = `
      <div class="modal-container" style="position:relative; width:920px; max-width:96vw; background-color:#cbd5e1; border:2px solid #5a7b9c; border-radius:4px; box-shadow:0 10px 40px rgba(0,0,0,0.35); font-family:var(--font-body, Tahoma, sans-serif); overflow:hidden; display:flex; flex-direction:column;">
        
        <!-- Header Ribbon -->
        <div id="cust-hist-header" style="background:linear-gradient(180deg, #1e4a8c 0%, #3a6dba 100%); color:white; padding:5px 12px; font-weight:700; font-size:0.9rem; display:flex; justify-content:space-between; align-items:center; cursor:move; user-select:none; border-bottom:1px solid #1e3a8a;">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span>Sales History of ${customerName}</span>
          </div>
          <button type="button" id="btn-cust-hist-close-header" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer; line-height:1;" title="Close (Esc)">&times;</button>
        </div>

        <!-- Table Container -->
        <div style="padding:10px 12px 6px 12px; background-color:#cbd5e1; flex:1; display:flex; flex-direction:column; gap:8px;">
          <div style="background:white; border:1.5px solid #64748b; border-radius:2px; max-height:340px; min-height:200px; overflow-y:auto; overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem;">
              <thead style="position:sticky; top:0; z-index:2;">
                <tr style="background:linear-gradient(180deg, #1e4a8c 0%, #2b6cb0 100%); color:white; font-weight:700; text-align:center; font-size:0.78rem;">
                  <th style="padding:5px 4px; border:1px solid #475569; width:50px;">Sl No.</th>
                  <th style="padding:5px 6px; border:1px solid #475569; width:90px; text-align:left;">Bill No</th>
                  <th style="padding:5px 6px; border:1px solid #475569; width:100px;">Bill Date</th>
                  <th style="padding:5px 8px; border:1px solid #475569; width:110px; text-align:right;">Bill Amount</th>
                  <th style="padding:5px 8px; border:1px solid #475569; width:110px; text-align:right;">Received Amount</th>
                  <th style="padding:5px 8px; border:1px solid #475569; width:110px; text-align:right;">Balance Amount</th>
                  <th style="padding:5px 6px; border:1px solid #475569; width:80px;">Bill Type</th>
                  <th style="padding:5px 6px; border:1px solid #475569; width:80px;">Sold By</th>
                </tr>
              </thead>
              <tbody id="cust-hist-tbody">
                ${list.length > 0 ? rowsHtml : `
                  <tr>
                    <td colspan="8" style="text-align:center; padding:30px 10px; color:#64748b; font-weight:bold; font-style:italic;">
                      No sales history records found for this customer.
                    </td>
                  </tr>
                `}
              </tbody>
              ${list.length > 0 ? `
                <tfoot style="position:sticky; bottom:0; z-index:2; background:#dbeafe; font-weight:bold; border-top:2px solid #1e4a8c; color:#0f172a; font-size:0.82rem;">
                  <tr>
                    <td colspan="3" style="padding:5px 8px; text-align:center; border:1px solid #94a3b8; font-weight:800; text-transform:uppercase;">Total</td>
                    <td style="padding:5px 8px; text-align:right; border:1px solid #94a3b8; font-weight:800; color:#1e3a8a;">${totalBillAmt.toFixed(2)}</td>
                    <td style="padding:5px 8px; text-align:right; border:1px solid #94a3b8; font-weight:800; color:#047857;">${totalReceivedAmt.toFixed(2)}</td>
                    <td style="padding:5px 8px; text-align:right; border:1px solid #94a3b8; font-weight:800; color:#b91c1c;">${totalBalanceAmt.toFixed(2)}</td>
                    <td style="padding:5px 6px; border:1px solid #94a3b8;"></td>
                    <td style="padding:5px 6px; border:1px solid #94a3b8;"></td>
                  </tr>
                </tfoot>
              ` : ''}
            </table>
          </div>

          <!-- Bottom Footer Toolbar -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:4px 0;">
            <div style="display:flex; align-items:center; gap:15px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <label for="cust-hist-billno-input" style="font-weight:700; font-size:0.78rem; color:#0f172a;">Bill No</label>
                <input type="text" id="cust-hist-billno-input" value="${billNoFilter}" class="form-control" autocomplete="off" placeholder="Search Bill No" style="width:140px; padding:3px 6px; font-size:0.78rem; background:white; color:black; border:1px solid #64748b; border-radius:2px;">
              </div>
              <label style="display:inline-flex; align-items:center; gap:5px; font-weight:700; font-size:0.78rem; color:#0f172a; cursor:pointer;">
                <input type="checkbox" id="cust-hist-unselected-chk" ${unselectedOnly ? 'checked' : ''}>
                <span>Selected Record (Pending only)</span>
              </label>
            </div>

            <div style="display:flex; align-items:center; gap:15px;">
              <span style="font-size:0.74rem; font-weight:600; color:#1e3a8a; font-style:italic;">
                Double-click row to view bill
              </span>
              <button type="button" id="btn-cust-hist-close" style="min-width:75px; padding:3px 18px; font-weight:700; font-size:0.8rem; background:#e2e8f0; border:1px solid #475569; border-radius:3px; cursor:pointer; color:#0f172a; box-shadow:1px 1px 2px white inset;">Close</button>
            </div>
          </div>
        </div>

      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const headerEl = modalOverlay.querySelector("#cust-hist-header");
    const containerBox = modalOverlay.querySelector(".modal-container");
    if (headerEl && containerBox) {
      makeDraggable(containerBox, headerEl);
    }

    const close = () => {
      window.removeEventListener("keydown", handleKeydown);
      modalOverlay.remove();
    };

    modalOverlay.querySelector("#btn-cust-hist-close-header")?.addEventListener("click", close);
    modalOverlay.querySelector("#btn-cust-hist-close")?.addEventListener("click", close);

    const billInput = modalOverlay.querySelector("#cust-hist-billno-input");
    if (billInput) {
      billInput.addEventListener("input", (e) => {
        billNoFilter = e.target.value.trim();
        selectedIndex = 0;
        renderModal();
        const freshInput = modalOverlay.querySelector("#cust-hist-billno-input");
        if (freshInput) {
          freshInput.focus();
          freshInput.selectionStart = freshInput.selectionEnd = freshInput.value.length;
        }
      });
    }

    const unselectedChk = modalOverlay.querySelector("#cust-hist-unselected-chk");
    if (unselectedChk) {
      unselectedChk.addEventListener("change", (e) => {
        unselectedOnly = e.target.checked;
        selectedIndex = 0;
        renderModal();
      });
    }

    const rows = modalOverlay.querySelectorAll(".cust-hist-row");
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const idx = parseInt(row.getAttribute("data-index"));
        updateRowSelection(idx);
      });
      row.addEventListener("dblclick", () => {
        const invId = row.getAttribute("data-invid");
        if (invId) {
          close();
          if (onSelectInvoice) {
            onSelectInvoice(invId);
          } else {
            const inv = state.getInvoices().find(i => String(i.id) === String(invId));
            if (inv) {
              import("./transactions.js").then(m => {
                m.showInvoiceBuilderModal(document.getElementById("modal-container-root"), null, null, null, inv);
              });
            }
          }
        }
      });
    });
  }

  function updateRowSelection(newIndex) {
    const list = getFilteredInvoices();
    if (newIndex < 0 || newIndex >= list.length) return;
    selectedIndex = newIndex;
    const rows = modalOverlay.querySelectorAll(".cust-hist-row");
    rows.forEach((row, idx) => {
      const isSelected = idx === selectedIndex;
      const balCell = row.children[5];
      if (isSelected) {
        row.style.backgroundColor = "#0078d7";
        row.style.color = "#ffffff";
        if (balCell) balCell.style.color = "#ffffff";
        row.scrollIntoView({ block: "nearest" });
      } else {
        row.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        row.style.color = "#0f172a";
        if (balCell) {
          const inv = list[idx];
          const isCash = (inv.payMode || "").toUpperCase() === "CASH";
          const billAmt = parseFloat(inv.total) || 0;
          const recAmt = isCash ? (inv.paidAmount !== undefined ? parseFloat(inv.paidAmount) || 0 : billAmt) : (parseFloat(inv.paidAmount) || 0);
          const balAmt = isCash ? 0 : Math.max(0, billAmt - recAmt);
          balCell.style.color = balAmt > 0 ? "#b91c1c" : "#0f172a";
        }
      }
    });
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      window.removeEventListener("keydown", handleKeydown);
      modalOverlay.remove();
      return;
    }

    const list = getFilteredInvoices();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (selectedIndex < list.length - 1) {
        updateRowSelection(selectedIndex + 1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (selectedIndex > 0) {
        updateRowSelection(selectedIndex - 1);
      }
    } else if (e.key === "Enter" && document.activeElement !== modalOverlay.querySelector("#cust-hist-billno-input")) {
      const list = getFilteredInvoices();
      if (list[selectedIndex]) {
        e.preventDefault();
        const invId = list[selectedIndex].id;
        window.removeEventListener("keydown", handleKeydown);
        modalOverlay.remove();
        if (onSelectInvoice) {
          onSelectInvoice(invId);
        } else {
          const inv = state.getInvoices().find(i => String(i.id) === String(invId));
          if (inv) {
            import("./transactions.js").then(m => {
              m.showInvoiceBuilderModal(document.getElementById("modal-container-root"), null, null, null, inv);
            });
          }
        }
      }
    }
  }

  window.addEventListener("keydown", handleKeydown);
  root.appendChild(modalOverlay);
  renderModal();
}