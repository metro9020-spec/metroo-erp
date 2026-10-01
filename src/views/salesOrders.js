import { state } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";
import { showInvoiceBuilderModal } from "./transactions.js";
import { showSelectBillSeriesModal } from "./selectSeriesModal.js";

let statusFilter = "ALL";
let execFilter = "ALL";
let searchQuery = "";

export async function renderSalesOrders(container) {
  const allOrders = state.salesOrders || [];
  const customers = state.getContacts().filter(c => !c.type || c.type.toLowerCase() === "customer" || c.type.toLowerCase() === "both");
  const materials = state.getMaterials();

  const coId = state.activeCompany ? String(state.activeCompany.id) : "1";
  const fyId = state.activeFY ? String(state.activeFY.id) : "default";

  // Fetch Assigned Pre-Take Orders from server
  let preTakeOrders = [];
  const ptoUrl = state.getBackendApiUrl ? state.getBackendApiUrl(`/api/pre-take-orders/${coId}/${fyId}?t=${Date.now()}`) : null;
  if (ptoUrl) {
    try {
      const res = await fetch(ptoUrl);
      if (res.ok) {
        preTakeOrders = await res.json();
      }
    } catch (e) {
      console.warn("Failed to fetch pre-take orders in Main ERP:", e);
    }
  }

  const ptoTotal = preTakeOrders.length;
  const ptoSeen = preTakeOrders.filter(o => o.seen).length;
  const ptoUnseen = ptoTotal - ptoSeen;

  // Metrics
  const totalCount = allOrders.length;
  const pendingCount = allOrders.filter(o => (o.status || "Pending") === "Pending").length;
  const approvedCount = allOrders.filter(o => o.status === "Approved").length;
  const totalAmount = allOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);

  // Sales Exec Names for filter
  const salesExecs = ["ALL", ...new Set(allOrders.map(o => o.salesExec).filter(Boolean))];

  // Filtered list
  const filteredOrders = allOrders.filter(o => {
    const matchesStatus = statusFilter === "ALL" || (o.status || "Pending") === statusFilter;
    const matchesExec = execFilter === "ALL" || o.salesExec === execFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.salesExec && o.salesExec.toLowerCase().includes(q));
    return matchesStatus && matchesExec && matchesQuery;
  });

  container.innerHTML = `
    <div style="padding: 1rem;">
      <!-- Action Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            <i class="fa-solid fa-mobile-screen-button" style="color: #2563eb;"></i> Field Sales Orders (Mobile / Tablet)
          </h2>
          <p style="font-size: 0.85rem; color: #64748b;">Review orders logged by sales executives on the field and convert them into Sales Invoices with 1-click.</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-assign-pre-take" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-weight: 600; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">
            <i class="fa-solid fa-file-import"></i> Assign Pre-Take Order to Executive
          </button>
          <a href="/sales-app.html" target="_blank" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-weight: 600; text-decoration: none; border: 1px solid #2563eb; color: #2563eb; border-radius: 6px;">
            <i class="fa-solid fa-up-right-from-square"></i> Open Mobile Sales Portal (/sales-app.html)
          </a>
          <button id="btn-refresh-orders" class="btn btn-secondary" style="padding: 6px 14px; font-weight: 600;">
            <i class="fa-solid fa-rotate"></i> Refresh
          </button>
        </div>
      </div>

      <!-- KPI Metrics Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 1.25rem;">
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; border-left: 4px solid #2563eb;">
          <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">TOTAL FIELD ORDERS</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #1e293b;">${totalCount}</div>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; border-left: 4px solid #eab308;">
          <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">PENDING APPROVAL</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #854d0e;">${pendingCount}</div>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; border-left: 4px solid #16a34a;">
          <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">APPROVED / PROCESSED</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #166534;">${approvedCount}</div>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; border-left: 4px solid #0284c7;">
          <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">ASSIGNED PRE-TAKE ORDERS</div>
          <div style="font-size: 1.2rem; font-weight: 800; color: #0369a1;">${ptoTotal} Assigned</div>
          <div style="font-size: 0.75rem; font-weight: 700; margin-top: 2px;">
            <span style="color: #16a34a;">👁️ ${ptoSeen} SEEN</span> | <span style="color: #d97706;">👁️‍🗨️ ${ptoUnseen} NOT SEEN</span>
          </div>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
        <div style="flex: 1; min-width: 200px;">
          <input type="text" id="so-search" class="form-control" placeholder="🔍 Search Order ID, Customer Name..." value="${searchQuery}" style="width: 100%; padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 0.8rem; font-weight: 600; color: #475569;">Status:</label>
          <select id="so-status-filter" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600;">
            <option value="ALL" ${statusFilter === "ALL" ? "selected" : ""}>All Statuses</option>
            <option value="Pending" ${statusFilter === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Approved" ${statusFilter === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Invoiced" ${statusFilter === "Invoiced" ? "selected" : ""}>Invoiced</option>
            <option value="Cancelled" ${statusFilter === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>
        </div>
        <div>
          <label style="font-size: 0.8rem; font-weight: 600; color: #475569;">Sales Exec:</label>
          <select id="so-exec-filter" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 600;">
            ${salesExecs.map(e => `<option value="${e}" ${execFilter === e ? "selected" : ""}>${e}</option>`).join("")}
          </select>
        </div>
      </div>

      <!-- Orders Data Table -->
      <div class="panel" style="overflow-x: auto; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
              <th style="padding: 10px;">Order Ref</th>
              <th style="padding: 10px;">Date</th>
              <th style="padding: 10px;">Sales Executive</th>
              <th style="padding: 10px;">Customer / Party</th>
              <th style="padding: 10px; text-align: center;">Total Items</th>
              <th style="padding: 10px; text-align: right;">Total Amount</th>
              <th style="padding: 10px; text-align: center;">Status</th>
              <th style="padding: 10px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOrders.length === 0 ? `
              <tr><td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">No field sales orders found.</td></tr>
            ` : filteredOrders.map(o => {
              const st = o.status || "Pending";
              let badgeColor = "#fef08a; color: #854d0e;";
              if (st === "Approved") badgeColor = "#bbf7d0; color: #166534;";
              if (st === "Invoiced") badgeColor = "#bfdbfe; color: #1e40af;";
              if (st === "Cancelled") badgeColor = "#fecaca; color: #991b1b;";

              return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-weight: 700; color: #2563eb;"><code>${o.id || 'SO-001'}</code></td>
                  <td style="padding: 10px;">${formatDate(o.date)}</td>
                  <td style="padding: 10px; font-weight: 600; color: #334155;">👤 ${o.salesExec || 'Field Staff'}</td>
                  <td style="padding: 10px;">
                    <strong>${o.customerName}</strong>
                    ${o.customerCity ? `<br><small style="color:#64748b;">City: ${o.customerCity}</small>` : ''}
                  </td>
                  <td style="padding: 10px; text-align: center; font-weight: 600;">${o.totalItems || o.items?.length || 0} items (${o.totalQty || 0} Qty)</td>
                  <td style="padding: 10px; text-align: right; font-weight: 700; color: #0f172a;">\u20B9 ${(o.totalAmount || 0).toFixed(2)}</td>
                  <td style="padding: 10px; text-align: center;">
                    <span style="padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: ${badgeColor}">${st}</span>
                  </td>
                  <td style="padding: 10px; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                      <button class="btn btn-sm btn-convert-inv" data-id="${o.id}" title="Convert to Sales Invoice" style="background: #2563eb; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                        <i class="fa-solid fa-file-invoice"></i> Create Bill
                      </button>
                      <button class="btn btn-sm btn-print-order" data-id="${o.id}" title="Print Order Slip" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                        <i class="fa-solid fa-print"></i>
                      </button>
                      <button class="btn btn-sm btn-del-order" data-id="${o.id}" title="Delete Order" style="background: #fee2e2; color: #b91c1c; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- Assigned Pre-Take Orders Panel (Main ERP to Executive) -->
      <div style="margin-top: 1.5rem; background: white; border: 1px solid #7dd3fc; border-radius: 8px; overflow: hidden;">
        <div style="background: #f0f9ff; padding: 12px 16px; border-bottom: 1px solid #7dd3fc; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-file-import" style="color: #0284c7; font-size: 1.1rem;"></i>
            <h3 style="font-size: 1rem; font-weight: 700; color: #0369a1; margin: 0;">
              Assigned Pre-Take Orders (Pushed to Mobile App)
            </h3>
            <span style="font-size: 0.75rem; background: #0284c7; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 700;">
              ${ptoTotal} Assigned (${ptoSeen} SEEN, ${ptoUnseen} NOT SEEN)
            </span>
          </div>
          <button id="btn-assign-pre-take-2" class="btn btn-sm" style="background: #0284c7; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-plus"></i> Assign Pre-Take Order
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 10px;">Pre-Take Ref</th>
                <th style="padding: 10px;">Assigned Date</th>
                <th style="padding: 10px;">Customer / Party</th>
                <th style="padding: 10px; text-align: center;">Items Qty</th>
                <th style="padding: 10px;">Executive Remarks</th>
                <th style="padding: 10px; text-align: center;">Executive Seen Status</th>
                <th style="padding: 10px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${preTakeOrders.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: #64748b;">No pre-take orders currently assigned. Click 'Assign Pre-Take Order' above to send items to sales executives.</td></tr>
              ` : preTakeOrders.map(pto => {
                const isSeen = !!pto.seen;
                const seenBadge = isSeen ? 
                  `<span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;" title="Seen at ${pto.seenAt || 'App sync'}"><i class="fa-solid fa-eye"></i> SEEN ${pto.seenAt ? '<small style="margin-left: 2px; opacity: 0.9;">(' + pto.seenAt + ')</small>' : ''}</span>` :
                  `<span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;" title="Executive has not opened app since assignment"><i class="fa-solid fa-eye-slash"></i> NOT SEEN YET</span>`;
                
                const itemsCount = Array.isArray(pto.items) ? pto.items.length : 0;

                return `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-weight: 700; color: #0284c7;"><code>${pto.id}</code></td>
                    <td style="padding: 10px; color: #475569;">${pto.date || 'N/A'}</td>
                    <td style="padding: 10px; font-weight: 700; color: #0f172a;">${pto.customerName || 'Cash Sale'}</td>
                    <td style="padding: 10px; text-align: center; font-weight: 700;">${itemsCount} Items</td>
                    <td style="padding: 10px; color: #64748b; font-size: 0.8rem;">${pto.remarks || '-'}</td>
                    <td style="padding: 10px; text-align: center;">${seenBadge}</td>
                    <td style="padding: 10px; text-align: center;">
                      <button class="btn-edit-pto" data-id="${pto.id}" style="background: #e0f2fe; color: #0284c7; border: 1px solid #7dd3fc; padding: 4px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600; cursor: pointer; margin-right: 4px;">
                        <i class="fa-solid fa-pen"></i> Edit
                      </button>
                      <button class="btn-clear-pto" data-id="${pto.id}" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 4px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600; cursor: pointer;">
                        <i class="fa-solid fa-trash"></i> Cancel
                      </button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Bind Listeners
  const openAssignModalHandler = () => showAssignPreTakeModal(container, customers, materials);

  const btnAssign1 = container.querySelector("#btn-assign-pre-take");
  if (btnAssign1) btnAssign1.addEventListener("click", openAssignModalHandler);

  const btnAssign2 = container.querySelector("#btn-assign-pre-take-2");
  if (btnAssign2) btnAssign2.addEventListener("click", openAssignModalHandler);

  const searchEl = container.querySelector("#so-search");
  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderSalesOrders(container);
    });
  }

  const statusFilterEl = container.querySelector("#so-status-filter");
  if (statusFilterEl) {
    statusFilterEl.addEventListener("change", (e) => {
      statusFilter = e.target.value;
      renderSalesOrders(container);
    });
  }

  const execFilterEl = container.querySelector("#so-exec-filter");
  if (execFilterEl) {
    execFilterEl.addEventListener("change", (e) => {
      execFilter = e.target.value;
      renderSalesOrders(container);
    });
  }

  const btnRefresh = container.querySelector("#btn-refresh-orders");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      state.syncFromServer().then(() => renderSalesOrders(container));
    });
  }

  container.querySelectorAll(".btn-edit-pto").forEach(btn => {
    btn.onclick = () => {
      const ptoId = btn.getAttribute("data-id");
      const pto = preTakeOrders.find(o => String(o.id) === String(ptoId));
      if (pto) {
        showAssignPreTakeModal(container, customers, materials, pto);
      }
    };
  });

  container.querySelectorAll(".btn-clear-pto").forEach(btn => {
    btn.onclick = async () => {
      const ptoId = btn.getAttribute("data-id");
      if (confirm(`Are you sure you want to cancel Assigned Pre-Take Order ${ptoId}?`)) {
        const deleteUrl = state.getBackendApiUrl ? state.getBackendApiUrl(`/api/pre-take-orders/${coId}/${fyId}/${ptoId}`) : null;
        if (!deleteUrl) {
          alert("Server is not reachable in static cloud mode.");
          return;
        }
        try {
          const res = await fetch(deleteUrl, { method: "DELETE" });
          if (res.ok) {
            renderSalesOrders(container);
          } else {
            alert("Failed to cancel pre-take order.");
          }
        } catch (e) {
          alert("Error: " + e.message);
        }
      }
    };
  });

  // Convert to Sales Invoice handler
  container.querySelectorAll(".btn-convert-inv").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.getAttribute("data-id");
      const order = state.salesOrders.find(o => String(o.id) === String(orderId));
      if (!order) return;

      showSelectBillSeriesModal("Sales", (selectedSeries) => {
        // Pre-fill invoice data structure from Sales Order
        const draftInvoiceData = {
          isDraft: true,
          date: new Date().toISOString().split('T')[0],
          contactId: order.customerId || "__CASH__",
          contactName: order.customerName || "Cash Sale",
          salesExec: order.salesExec,
          seriesId: selectedSeries ? selectedSeries.id : null,
          seriesPrefix: selectedSeries ? selectedSeries.prefix : "INV-",
          remarks: `Order Ref: ${order.id} | ${order.remarks || ''}`,
          items: (order.items || []).map(item => {
            const mat = materials.find(m => m.id === item.materialId || m.name === item.materialName || m.name === item.name);
            const defaultBatch = mat && mat.batches && mat.batches.length > 0 ? mat.batches[0] : null;
            const batchNo = item.batchNo || item.batch || (defaultBatch ? defaultBatch.batchNo : "");
            const nameVal = item.materialName || item.name || (mat ? mat.name : "Item");
            const codeVal = item.code || item.codeModel || (mat ? mat.code : "");
            const qtyVal = parseFloat(item.quantity || item.actualQty || item.preTakeQty) || 1;
            const rateVal = parseFloat(item.rate || item.price || (mat ? mat.sellingPrice : 0)) || 0;
            return {
              materialId: mat ? mat.id : item.materialId,
              name: nameVal,
              materialName: nameVal,
              code: codeVal,
              codeModel: codeVal,
              batchNo: batchNo,
              quantity: qtyVal,
              price: rateVal,
              rate: rateVal,
              gstRate: mat ? mat.taxRate || 18 : 18,
              unit: item.unit || (mat ? mat.unit : "Pcs")
            };
          })
        };

        // Mark order as Approved / Processing
        order.status = "Approved";
        state.saveState();

        // Open Invoice Builder pre-filled!
        showInvoiceBuilderModal(container, customers, materials, () => renderSalesOrders(container), draftInvoiceData, selectedSeries);
      });
    });
  });

  // Print Order Slip handler
  container.querySelectorAll(".btn-print-order").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.getAttribute("data-id");
      const order = state.salesOrders.find(o => String(o.id) === String(orderId));
      if (order) printOrderSlip(order);
    });
  });

  // Delete Order handler
  container.querySelectorAll(".btn-del-order").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.getAttribute("data-id");
      if (confirm(`Are you sure you want to delete Field Order ${orderId}?`)) {
        state.salesOrders = state.salesOrders.filter(o => String(o.id) !== String(orderId));
        state.saveState();
        renderSalesOrders(container);
      }
    });
  });
}

function printOrderSlip(order) {
  const win = window.open("", "_blank", "width=650,height=800");
  const itemsHtml = (order.items || []).map((i, idx) => `
    <tr>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;"><strong>${i.materialName}</strong> (${i.unit || 'Pcs'})</td>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;"><strong>${i.quantity}</strong></td>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: right;">\u20B9 ${(i.rate || 0).toFixed(2)}</td>
      <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">\u20B9 ${(i.amount || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Field Sales Order - ${order.id}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; color: #0f172a; }
        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 0.9rem; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem; }
        th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
        .total { text-align: right; font-size: 1.1rem; font-weight: bold; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>FIELD SALES ORDER SLIP</h2>
        <div style="font-size: 0.9rem; font-weight: bold; color: #2563eb;">ORDER REF: ${order.id}</div>
      </div>
      <div class="meta">
        <div>
          <div><strong>Customer / Party:</strong> ${order.customerName}</div>
          <div><strong>Mobile:</strong> ${order.customerMobile || 'N/A'}</div>
          <div><strong>City:</strong> ${order.customerCity || 'N/A'}</div>
        </div>
        <div style="text-align: right;">
          <div><strong>Order Date:</strong> ${order.date}</div>
          <div><strong>Sales Executive:</strong> ${order.salesExec || 'Field Rep'}</div>
          <div><strong>Status:</strong> ${order.status || 'Pending'}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div class="total">
        Grand Total: \u20B9 ${(order.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
      </div>
      ${order.remarks ? `<div style="margin-top: 20px; font-size: 0.85rem; background: #f8fafc; padding: 10px; border-radius: 4px;"><strong>Remarks:</strong> ${order.remarks}</div>` : ''}
      <script>
        setTimeout(function() {
          try { window.focus(); window.print(); } catch (e) {}
        }, 300);
      </script>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => {
    try { win.focus(); win.print(); } catch (e) {}
  }, 350);
}

function showAssignPreTakeModal(container, customers, materials, existingOrder = null) {
  const isEditing = !!existingOrder;
  let modalItems = isEditing && Array.isArray(existingOrder.items) ? JSON.parse(JSON.stringify(existingOrder.items)) : [];

  const backdrop = document.createElement("div");
  backdrop.style.cssText = "position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;";

  backdrop.innerHTML = `
    <div style="background: white; width: 100%; max-width: 650px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh;">
      <div style="background: ${isEditing ? '#0284c7' : '#0284c7'}; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid ${isEditing ? 'fa-pen-to-square' : 'fa-file-import'}"></i> ${isEditing ? `Edit Pre-Take Order #${existingOrder.id}` : 'Assign Pre-Take Order to Sales Executive'}
        </h3>
        <button id="close-assign-modal" style="background: none; border: none; color: white; font-size: 1.4rem; cursor: pointer;">&times;</button>
      </div>

      <div style="padding: 20px; overflow-y: auto; flex: 1;">
        <div style="margin-bottom: 14px;">
          <label style="font-size: 0.85rem; font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">
            1. Select Customer / Party <span style="font-size: 0.75rem; color: #64748b; font-weight: normal;">(Optional - Defaults to Cash Sale)</span>:
          </label>
          <select id="pto-cust-select" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600;">
            <option value="CASH">💵 Cash Sale (General Customer)</option>
            ${customers.map(c => `<option value="${c.id}">${c.name} ${c.city ? '(' + c.city + ')' : ''}</option>`).join('')}
          </select>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <label style="font-size: 0.85rem; font-weight: 700; color: #0284c7; display: block; margin-bottom: 10px;">
            <i class="fa-solid fa-cart-plus"></i> 2. Select & Add Product(s):
          </label>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">
                <i class="fa-solid fa-tag" style="color: #0284c7;"></i> Select Product Name:
              </label>
              <select id="pto-name-select" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
                <option value="">-- Select Product Name --</option>
              </select>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 160px;">
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">
                  <i class="fa-solid fa-barcode" style="color: #0284c7;"></i> Select Code / Model:
                </label>
                <select id="pto-code-select" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
                  <option value="">-- Select Code / Model --</option>
                </select>
              </div>

              <div style="flex: 1; min-width: 160px;">
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">
                  <i class="fa-solid fa-layer-group" style="color: #0284c7;"></i> Select Available Batch:
                </label>
                <select id="pto-batch-select" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
                  <option value="">-- Select Batch --</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-top: 4px;">
              <label style="font-size: 0.8rem; font-weight: 700; color: #475569;">Pre Qty:</label>
              <input type="number" id="pto-qty-input" placeholder="Qty" min="1" value="1" style="width: 90px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-weight: bold;">
              <button id="pto-add-item-btn" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-plus"></i> Add Item
              </button>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: #e0f2fe; color: #0369a1;">
                <th style="padding: 8px; text-align: left;">Product Name</th>
                <th style="padding: 8px; text-align: left;">Code / Model</th>
                <th style="padding: 8px; text-align: left;">Batch</th>
                <th style="padding: 8px; text-align: center;">Pre Qty</th>
                <th style="padding: 8px; text-align: right;">Rate</th>
                <th style="padding: 8px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody id="pto-items-body">
              <tr><td colspan="6" style="text-align: center; padding: 16px; color: #94a3b8;">No items added yet. Select product details above.</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Executive Instructions / Remarks:</label>
          <input type="text" id="pto-remarks" placeholder="e.g. Deliver before 2 PM, call customer on arrival..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem;">
        </div>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: flex-end; gap: 8px;">
        <button id="cancel-assign-btn" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; font-weight: 600; cursor: pointer; color: #475569;">Cancel</button>
        <button id="submit-assign-btn" style="padding: 8px 18px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          ${isEditing ? '💾 Save Changes & Alert Executive' : '🚀 Assign Order to Mobile Executive'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); };
  backdrop.querySelector("#close-assign-modal").onclick = close;
  backdrop.querySelector("#cancel-assign-btn").onclick = close;

  if (isEditing) {
    if (existingOrder.customerId) {
      const custSelect = backdrop.querySelector("#pto-cust-select");
      if (custSelect) custSelect.value = existingOrder.customerId;
    }
    if (existingOrder.remarks) {
      const remarksInput = backdrop.querySelector("#pto-remarks");
      if (remarksInput) remarksInput.value = existingOrder.remarks;
    }
  }

  // Cascading dropdown population
  const nameSelect = backdrop.querySelector("#pto-name-select");
  const codeSelect = backdrop.querySelector("#pto-code-select");
  const batchSelect = backdrop.querySelector("#pto-batch-select");

  const renderProductNameOptions = () => {
    const uniqueNames = [...new Set(materials.map(m => m.name).filter(Boolean))].sort();
    nameSelect.innerHTML = '<option value="">-- Select Product Name --</option>' +
      uniqueNames.map(name => `<option value="${name}">${name}</option>`).join('');
  };

  const renderCodeAndBatchOptions = () => {
    const nameVal = nameSelect.value;
    if (!nameVal) {
      codeSelect.innerHTML = '<option value="">-- Select Code / Model --</option>';
      batchSelect.innerHTML = '<option value="">-- Select Batch --</option>';
      return;
    }

    const matchingMaterials = materials.filter(m => m.name === nameVal);
    codeSelect.innerHTML = '<option value="">-- Select Code / Model --</option>' +
      matchingMaterials.map(m => `<option value="${m.id}">${m.code || m.name}</option>`).join('');

    if (matchingMaterials.length === 1) {
      codeSelect.value = matchingMaterials[0].id;
      renderBatchOptions(matchingMaterials[0].id);
    } else {
      batchSelect.innerHTML = '<option value="">-- Select Batch --</option>';
    }
  };

  const renderBatchOptions = (matId) => {
    if (!matId) {
      batchSelect.innerHTML = '<option value="">-- Select Batch --</option>';
      return;
    }
    const mat = materials.find(m => m.id === matId);
    if (!mat) {
      batchSelect.innerHTML = '<option value="">-- Select Batch --</option>';
      return;
    }

    let availableBatches = [];
    if (Array.isArray(mat.batches)) {
      availableBatches = mat.batches.filter(b => parseFloat(b.stock) > 0);
    }

    if (availableBatches.length > 0) {
      batchSelect.innerHTML = availableBatches.map(b => {
        const bName = b.batchNo || b.name || "DEFAULT";
        return `<option value="${bName}">${bName} (Available Stock: ${b.stock})</option>`;
      }).join('');
    } else {
      const totStk = parseFloat(mat.stock) || 0;
      if (totStk > 0) {
        batchSelect.innerHTML = `<option value="DEFAULT">DEFAULT (Available Stock: ${totStk})</option>`;
      } else {
        batchSelect.innerHTML = '<option value="DEFAULT">DEFAULT (Stock: 0)</option>';
      }
    }
  };

  renderProductNameOptions();

  nameSelect.onchange = renderCodeAndBatchOptions;
  codeSelect.onchange = (e) => renderBatchOptions(e.target.value);

  const renderItemsTable = () => {
    const tbody = backdrop.querySelector("#pto-items-body");
    if (modalItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 16px; color: #94a3b8;">No items added yet. Select product details above.</td></tr>';
      return;
    }
    tbody.innerHTML = modalItems.map((item, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px; font-weight: 700; color: #0f172a;">${item.materialName}</td>
        <td style="padding: 8px; color: #2563eb; font-weight: 600;"><code>${item.code || 'N/A'}</code></td>
        <td style="padding: 8px; color: #475569; font-weight: 600;">${item.batch}</td>
        <td style="padding: 8px; text-align: center; font-weight: 800; color: #0284c7;">${item.preTakeQty}</td>
        <td style="padding: 8px; text-align: right; font-weight: 700;">₹ ${(item.rate || 0).toFixed(2)}</td>
        <td style="padding: 8px; text-align: center;">
          <button class="btn-del-pto-item" data-idx="${idx}" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 4px; padding: 3px 8px; font-size: 0.75rem; cursor: pointer;">Remove</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll(".btn-del-pto-item").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute("data-idx"));
        modalItems.splice(idx, 1);
        renderItemsTable();
      };
    });
  };

  renderItemsTable();

  backdrop.querySelector("#pto-add-item-btn").onclick = () => {
    const matId = codeSelect.value;
    const batchName = batchSelect.value;
    const qty = parseFloat(backdrop.querySelector("#pto-qty-input").value) || 1;

    if (!matId) {
      alert("Please select Product Name & Code/Model.");
      return;
    }
    const mat = materials.find(m => m.id === matId);
    if (!mat) return;

    modalItems.push({
      materialId: mat.id,
      materialName: mat.name,
      code: mat.code || mat.name,
      batch: batchName || "DEFAULT",
      preTakeQty: qty,
      rate: mat.rate || mat.sellingPrice || 0
    });

    nameSelect.value = "";
    renderCodeAndBatchOptions();
    backdrop.querySelector("#pto-qty-input").value = "1";
    renderItemsTable();
  };

  backdrop.querySelector("#submit-assign-btn").onclick = async () => {
    const custId = backdrop.querySelector("#pto-cust-select").value || "CASH";
    const cust = customers.find(c => String(c.id) === String(custId));
    const customerName = cust ? cust.name : "Cash Sale";
    const remarks = backdrop.querySelector("#pto-remarks").value;

    if (modalItems.length === 0) {
      alert("Please add at least one product item.");
      return;
    }

    const coId = state.activeCompany ? state.activeCompany.id : "1";
    const fyId = state.activeFY ? state.activeFY.id : "default";

    const payload = {
      customerId: cust ? cust.id : "CASH",
      customerName: customerName,
      items: modalItems,
      remarks: remarks,
      status: "Assigned",
      date: new Date().toISOString().split('T')[0]
    };

    const endpoint = isEditing ? `/api/pre-take-orders/${coId}/${fyId}/${existingOrder.id}` : `/api/pre-take-orders/${coId}/${fyId}`;
    const url = state.getBackendApiUrl ? state.getBackendApiUrl(endpoint) : null;
    if (!url) {
      alert("Server is not reachable in static cloud mode. Pre-take orders require a live server or tunnel connection.");
      return;
    }

    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        const actionStr = isEditing ? "updated & executive alerted" : "assigned";
        alert(`✅ Pre-Take Order #${result.order?.id || 'PTO-OK'} ${actionStr} successfully!\n\nCustomer: ${customerName}\nItems: ${modalItems.length}\n\nThe mobile sales executive will receive a live alert on their app.`);
        close();
        renderSalesOrders(container);
      } else {
        alert("Failed to save pre-take order.");
      }
    } catch (e) {
      alert("Error connecting to server: " + e.message);
    }
  };
}
