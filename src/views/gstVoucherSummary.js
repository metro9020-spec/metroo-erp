import { state } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";
import { renderTallyDatePickerHtml, initTallyDatePickers } from "../utils/datePicker.js";
import { showContraModal, showUnifiedSplitVoucherModal } from "./vouchers.js";

export function showGstVoucherSummaryModal() {
  const root = document.getElementById("modal-container-root");
  
  let fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 3); // Default to last 3 months
  let fromDateStr = fromDate.toISOString().split("T")[0];
  let toDateStr = new Date().toISOString().split("T")[0];
  let selectedVType = "All";

  function renderContent() {
    const transactions = state.getTransactions();
    const ledgers = state.getLedgers();
    
    const gstGroups = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
    const cashBankGroups = ["BANK ACCOUNTS", "CASH-IN-HAND", "BANK OD A/C"];

    const formatRupees = (val) => {
      if (val < 0) return `-₹${Math.abs(val).toFixed(2)}`;
      return `₹${val.toFixed(2)}`;
    };

    // Build sets of all Invoice, Purchase, Sales Return, and Purchase Return keys
    const invoices = state.getInvoices() || [];
    const purchases = state.getPurchases() || [];
    const salesReturns = state.getSalesReturns() || [];
    const purchaseReturns = state.getPurchaseReturns() || [];

    const invoiceKeys = new Set();
    invoices.forEach(inv => {
      if (inv.id) invoiceKeys.add(String(inv.id).toUpperCase());
      if (inv.voucherNo) invoiceKeys.add(String(inv.voucherNo).toUpperCase());
      if (inv.refNo) invoiceKeys.add(String(inv.refNo).toUpperCase());
      if (inv.billNo) invoiceKeys.add(String(inv.billNo).toUpperCase());
      if (inv.invoiceNo) invoiceKeys.add(String(inv.invoiceNo).toUpperCase());
    });

    const purchaseKeys = new Set();
    purchases.forEach(pur => {
      if (pur.id) purchaseKeys.add(String(pur.id).toUpperCase());
      if (pur.voucherNo) purchaseKeys.add(String(pur.voucherNo).toUpperCase());
      if (pur.refNo) purchaseKeys.add(String(pur.refNo).toUpperCase());
      if (pur.invoiceNo) purchaseKeys.add(String(pur.invoiceNo).toUpperCase());
      if (pur.billNo) purchaseKeys.add(String(pur.billNo).toUpperCase());
    });

    const salesReturnKeys = new Set();
    salesReturns.forEach(sr => {
      if (sr.id) salesReturnKeys.add(String(sr.id).toUpperCase());
      if (sr.voucherNo) salesReturnKeys.add(String(sr.voucherNo).toUpperCase());
      if (sr.refNo) salesReturnKeys.add(String(sr.refNo).toUpperCase());
    });

    const purchaseReturnKeys = new Set();
    purchaseReturns.forEach(pr => {
      if (pr.id) purchaseReturnKeys.add(String(pr.id).toUpperCase());
      if (pr.voucherNo) purchaseReturnKeys.add(String(pr.voucherNo).toUpperCase());
      if (pr.refNo) purchaseReturnKeys.add(String(pr.refNo).toUpperCase());
    });

    const seriesMaster = state.getSeriesMaster() || [];
    const salesPrefixes = seriesMaster.filter(s => s.txType === "Sales").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
    const purchasePrefixes = seriesMaster.filter(s => s.txType === "Purchase").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);

    // Filter transactions
    const filteredList = [];
    transactions.forEach(tx => {
      // Date filter
      if (tx.date < fromDateStr || tx.date > toDateStr) return;

      const idUpper = String(tx.id || "").toUpperCase();
      const refUpper = String(tx.reference || "").toUpperCase();
      const vnoUpper = String(tx.voucherNo || "").toUpperCase();
      const descUpper = String(tx.description || "").toUpperCase();
      const vTypeUpper = String(tx.voucherType || "").toUpperCase();

      // 1. Exclude Sales, Purchase, Sales Return, Purchase Return by explicit voucherType
      if (["SALE", "SALES", "PURCHASE", "SALES_RETURN", "PURCHASE_RETURN", "CREDIT_NOTE", "DEBIT_NOTE"].includes(vTypeUpper)) {
        return;
      }

      // 2. Exclude transactions linked to actual Invoices, Purchases, or Returns in state
      if (invoiceKeys.has(idUpper) || invoiceKeys.has(refUpper) || invoiceKeys.has(vnoUpper)) return;
      if (purchaseKeys.has(idUpper) || purchaseKeys.has(refUpper) || purchaseKeys.has(vnoUpper)) return;
      if (salesReturnKeys.has(idUpper) || salesReturnKeys.has(refUpper) || salesReturnKeys.has(vnoUpper)) return;
      if (purchaseReturnKeys.has(idUpper) || purchaseReturnKeys.has(refUpper) || purchaseReturnKeys.has(vnoUpper)) return;

      // 3. Identify manual voucher type
      let isPayment = vTypeUpper === "PAYMENT" || refUpper.startsWith("PM-") || refUpper.startsWith("PAY") || descUpper.includes("PAYMENT VOUCHER");
      let isReceipt = vTypeUpper === "RECEIPT" || refUpper.startsWith("RC-") || refUpper.startsWith("RCPT") || descUpper.includes("RECEIPT VOUCHER");
      let isContra = vTypeUpper === "CONTRA" || refUpper.startsWith("CO-") || refUpper.startsWith("CONTRA") || descUpper.includes("CONTRA VOUCHER");
      let isJournal = vTypeUpper === "JOURNAL" || refUpper.startsWith("JV-") || refUpper.startsWith("JOU") || descUpper.includes("JOURNAL VOUCHER");

      let isManualVoucher = isPayment || isReceipt || isContra || isJournal;

      // If NOT explicitly a manual voucher, check if it looks like a sales or purchase invoice by text/prefix
      if (!isManualVoucher) {
        const isSalesReturn = refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("SALES RETURN") || refUpper.startsWith("SR-") || refUpper.startsWith("CN-") || descUpper.includes("SALES RETURN");
        if (isSalesReturn) return;

        const isPurchaseReturn = refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("PURCHASE RETURN") || refUpper.startsWith("DN-") || descUpper.includes("PURCHASE RETURN");
        if (isPurchaseReturn) return;

        const isSales = refUpper.startsWith("LSL") || refUpper.startsWith("ISL") || refUpper.startsWith("NSL") || refUpper.startsWith("SA-") || refUpper.startsWith("SALES") || descUpper.startsWith("SALES INVOICE");
        if (isSales) return;

        const isPurchase = refUpper.startsWith("LPR") || refUpper.startsWith("IPR") || refUpper.startsWith("NPR") || refUpper.startsWith("PR-") || descUpper.startsWith("PURCHASE INVOICE");
        if (isPurchase) return;
      }
      
      // Determine voucher type for manual Vouchers
      let vType = "Journal";
      if (isReceipt) vType = "Receipt";
      else if (isPayment) vType = "Payment";
      else if (isContra) vType = "Contra";
      
      // Voucher Type filter
      if (selectedVType !== "All" && selectedVType !== vType) return;

      // Detect GST entries
      let hasGst = false;
      let sgstAmt = 0;
      let cgstAmt = 0;
      let igstAmt = 0;
      let cessAmt = 0;
      let netAmt = 0;
      let particularsName = "";

      // Find the main expense/asset ledger name to show as Particulars
      let mainEntry = null;

      tx.entries.forEach(entry => {
        const ledger = ledgers.find(l => 
          String(l.code).toUpperCase() === String(entry.accountId).toUpperCase() || 
          String(l.id).toUpperCase() === String(entry.accountId).toUpperCase() || 
          String(l.name).toUpperCase() === String(entry.accountId).toUpperCase()
        );
        const group = ledger ? (ledger.groupName || "").toUpperCase() : "";
        const name = ledger ? (ledger.name || "").toUpperCase() : String(entry.accountId || "").toUpperCase();

        // Check if entry is GST
        const isSgst = name.includes("SGST") || group.includes("SGST");
        const isCgst = name.includes("CGST") || group.includes("CGST");
        const isIgst = name.includes("IGST") || group.includes("IGST");
        const isGst = isSgst || isCgst || isIgst;

        const isCess = name.includes("CESS") || group.includes("CESS") || entry.accountId === "2200";

        if (isGst) {
          hasGst = true;
          const val = Math.abs(entry.debit - entry.credit);
          if (isSgst) sgstAmt += val;
          else if (isCgst) cgstAmt += val;
          else if (isIgst) igstAmt += val;
        } else if (isCess) {
          cessAmt += Math.abs(entry.debit - entry.credit);
        } else {
          // If not cash/bank group, treat as the primary Particulars account head
          const isCashBank = cashBankGroups.some(g => group === g || name.includes(g)) || ["1010", "1020", "1200", "1300"].includes(String(entry.accountId));
          if (!isCashBank) {
            if (!mainEntry || Math.abs(entry.debit - entry.credit) > Math.abs(mainEntry.debit - mainEntry.credit)) {
              mainEntry = entry;
            }
          }
        }
      });

      if (hasGst) {
        let taxableVal = 0;
        tx.entries.forEach(entry => {
          const ledger = ledgers.find(l => 
            String(l.code).toUpperCase() === String(entry.accountId).toUpperCase() || 
            String(l.id).toUpperCase() === String(entry.accountId).toUpperCase() || 
            String(l.name).toUpperCase() === String(entry.accountId).toUpperCase()
          );
          const group = ledger ? (ledger.groupName || "").toUpperCase() : "";
          const name = ledger ? (ledger.name || "").toUpperCase() : String(entry.accountId || "").toUpperCase();

          const isGst = name.includes("SGST") || name.includes("CGST") || name.includes("IGST") || group.includes("SGST") || group.includes("CGST") || group.includes("IGST");
          const isCess = name.includes("CESS") || group.includes("CESS") || entry.accountId === "2200";
          const isCashBank = cashBankGroups.some(g => group === g || name.includes(g)) || ["1010", "1020", "1200", "1300"].includes(String(entry.accountId));

          if (!isGst && !isCess && !isCashBank) {
            taxableVal += Math.abs(entry.debit - entry.credit);
          }
        });

        const gstAmt = sgstAmt + cgstAmt + igstAmt;
        netAmt = taxableVal + gstAmt + cessAmt;

        if (mainEntry) {
          const mainLedger = ledgers.find(l => 
            String(l.code).toUpperCase() === String(mainEntry.accountId).toUpperCase() || 
            String(l.id).toUpperCase() === String(mainEntry.accountId).toUpperCase() || 
            String(l.name).toUpperCase() === String(mainEntry.accountId).toUpperCase()
          );
          particularsName = mainLedger ? mainLedger.name.toUpperCase() : String(mainEntry.accountId).toUpperCase();
        } else {
          particularsName = tx.description || "Offset Entry";
        }

        filteredList.push({
          tx: tx,
          vType: vType,
          date: formatDate(tx.date),
          rawDate: tx.date,
          vNo: tx.reference || tx.id,
          particulars: particularsName,
          taxable: taxableVal,
          sgst: sgstAmt,
          cgst: cgstAmt,
          igst: igstAmt,
          gst: gstAmt,
          cess: cessAmt,
          net: netAmt
        });
      }
    });

    // Sort by date
    filteredList.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Calculate totals
    let totalTaxable = 0;
    let totalSgst = 0;
    let totalCgst = 0;
    let totalIgst = 0;
    let totalGst = 0;
    let totalCess = 0;
    let totalNet = 0;

    filteredList.forEach(item => {
      totalTaxable += item.taxable;
      totalSgst += item.sgst;
      totalCgst += item.cgst;
      totalIgst += item.igst;
      totalGst += item.gst;
      totalCess += item.cess;
      totalNet += item.net;
    });

    root.innerHTML = `
      <div class="modal-overlay active" id="gst-voucher-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
        <div class="modal-container" style="max-width: 950px; width: 95%; background-color: #cbd5e1; color: #0f172a; padding: 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto;">
          
          <!-- Header ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color: white; display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; font-weight: 700; font-size: 0.85rem; border-radius: 2px 2px 0 0; border-bottom: 1px solid #1d4ed8; margin:-15px -15px 12px -15px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-file-invoice"></i> GST VOUCHER SUMMARY
            </div>
            <button style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer; line-height: 1;" id="gv-close-btn-header">&times;</button>
          </div>

          <!-- Filters ribbon -->
          <div style="background: #e2e8f0; padding: 10px; border: 1px solid #94a3b8; display: grid; grid-template-columns: 2fr 2fr 1.5fr; gap: 15px; margin-bottom: 10px; border-radius: 3px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; font-size: 0.8rem; color: black;">Date Range:</span>
              <span style="font-size: 0.8rem; color: black;">From</span>
              ${renderTallyDatePickerHtml({ id: "gv-from-date", value: fromDateStr, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
              <span style="font-size: 0.8rem; color: black;">To</span>
              ${renderTallyDatePickerHtml({ id: "gv-to-date", value: toDateStr, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; font-size: 0.8rem; color: black;">VOUCHER TYPE:</span>
              <select id="gv-vtype" style="border: 1px solid #7a96b2; padding: 2px; font-size: 0.8rem; background: white; color: black; flex: 1;">
                <option value="All" ${selectedVType === 'All' ? 'selected' : ''}>(All)</option>
                <option value="Journal" ${selectedVType === 'Journal' ? 'selected' : ''}>Journal</option>
                <option value="Payment" ${selectedVType === 'Payment' ? 'selected' : ''}>Payment</option>
                <option value="Receipt" ${selectedVType === 'Receipt' ? 'selected' : ''}>Receipt</option>
                <option value="Contra" ${selectedVType === 'Contra' ? 'selected' : ''}>Contra</option>
              </select>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 6px; align-items: center;">
              <button id="gv-btn-view" style="background: #e2e8f0; border: 1px solid #475569; padding: 3px 18px; font-weight: bold; cursor: pointer; font-size: 0.8rem; color: black; border-radius: 2px; box-shadow: 1px 1px 2px white inset;">View</button>
              <button id="gv-btn-preview" style="background: #e2e8f0; border: 1px solid #475569; padding: 3px 18px; font-weight: bold; cursor: pointer; font-size: 0.8rem; color: black; border-radius: 2px; box-shadow: 1px 1px 2px white inset;">Preview</button>
              <button id="gv-btn-close" style="background: #e2e8f0; border: 1px solid #475569; padding: 3px 18px; font-weight: bold; cursor: pointer; font-size: 0.8rem; color: black; border-radius: 2px; box-shadow: 1px 1px 2px white inset;">Close</button>
            </div>
          </div>

          <!-- Table Grid -->
          <div style="border: 1px solid #94a3b8; background-color: white; border-radius: 2px; max-height: 350px; overflow-y: auto; margin-bottom: 5px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: black;">
              <thead>
                <tr style="background-color: #1e3a8a; color: white; border-bottom: 2px solid #475569; font-size: 0.8rem;">
                  <th style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">Voucher Date</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">Voucher No</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">Particulars</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">Taxable Value</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">SGST Amount</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">CGST Amount</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">IGST Amount</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">GST Amount</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">Cess Amount</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                ${filteredList.length === 0 ? `
                  <tr>
                    <td colspan="10" style="text-align: center; color: #64748b; padding: 25px; font-style: italic; font-weight: bold;">NO GST VOUCHERS FOUND IN THIS DATE RANGE.</td>
                  </tr>
                ` : filteredList.map(item => `
                  <tr class="gst-summary-row" data-id="${item.tx.id}" style="border-bottom: 1px solid #cbd5e1; font-size: 0.78rem; cursor: pointer;" title="Double click to edit/view voucher">
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: 500;">${item.date}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: 600; color: #1e3a8a;">${item.vNo}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #000;">${item.particulars}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">${formatRupees(item.taxable)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; color: #0f766e;">${formatRupees(item.sgst)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; color: #0f766e;">${formatRupees(item.cgst)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; color: #1e3a8a;">${formatRupees(item.igst)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatRupees(item.gst)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">${formatRupees(item.cess)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; background-color: #f1f5f9;">${formatRupees(item.net)}</td>
                  </tr>
                `).join("")}
              </tbody>
              <tfoot>
                <tr style="background-color: #cbd5e1; font-weight: bold; border-top: 2px solid #475569; font-size: 0.8rem;">
                  <td style="padding: 6px; border: 1px solid #cbd5e1;">TOTAL</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;"></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;"></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${formatRupees(totalTaxable)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #0f766e;">${formatRupees(totalSgst)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #0f766e;">${formatRupees(totalCgst)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #1e3a8a;">${formatRupees(totalIgst)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatRupees(totalGst)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">${formatRupees(totalCess)}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; background-color: #94a3b8;">${formatRupees(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      </div>
    `;

    initTallyDatePickers(root);



    // Hook filters and actions

    const closeOverlay = () => {
      const overlay = document.getElementById("gst-voucher-modal-overlay");
      if (overlay) overlay.classList.remove("active");
      root.innerHTML = "";
    };
    document.getElementById("gv-close-btn-header").addEventListener("click", closeOverlay);
    document.getElementById("gv-btn-close").addEventListener("click", closeOverlay);

    const handleGvFilterChange = () => {
      fromDateStr = document.getElementById("gv-from-date").value;
      toDateStr = document.getElementById("gv-to-date").value;
      selectedVType = document.getElementById("gv-vtype").value;
      renderContent();
    };

    document.getElementById("gv-btn-view")?.addEventListener("click", handleGvFilterChange);

    const gvFromDate = document.getElementById("gv-from-date");
    const gvToDate = document.getElementById("gv-to-date");
    const gvVtype = document.getElementById("gv-vtype");

    if (gvFromDate) {
      gvFromDate.addEventListener("change", handleGvFilterChange);
      gvFromDate.addEventListener("input", handleGvFilterChange);
    }
    if (gvToDate) {
      gvToDate.addEventListener("change", handleGvFilterChange);
      gvToDate.addEventListener("input", handleGvFilterChange);
    }
    if (gvVtype) {
      gvVtype.addEventListener("change", handleGvFilterChange);
    }

    document.getElementById("gv-btn-preview").addEventListener("click", () => {
      window.print();
    });

    root.querySelectorAll(".gst-summary-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const txId = row.getAttribute("data-id");
        const item = filteredList.find(i => i.tx.id === txId);
        if (item) {
          closeOverlay();
          const windowArea = document.getElementById("window-content-area");
          if (item.vType === "Contra") {
            showContraModal(windowArea, item.tx, true);
          } else if (item.vType === "Receipt") {
            showUnifiedSplitVoucherModal(windowArea, item.tx, "receipt", true);
          } else if (item.vType === "Payment") {
            showUnifiedSplitVoucherModal(windowArea, item.tx, "payment", true);
          } else if (item.vType === "Journal") {
            showUnifiedSplitVoucherModal(windowArea, item.tx, "journal", true);
          }
        }
      });
    });
  }

  renderContent();
}
