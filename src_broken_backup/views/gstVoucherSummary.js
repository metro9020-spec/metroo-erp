import { state } from "../state.js";

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

    // Filter transactions
    const filteredList = [];
    transactions.forEach(tx => {
      // Date filter
      if (tx.date < fromDateStr || tx.date > toDateStr) return;

      // Determine voucher type (excluding Sales and Purchase)
      const refUpper = (tx.reference || "").toUpperCase();
      let vType = "Journal";
      if (refUpper.startsWith("LSL") || refUpper.startsWith("ISL") || refUpper.startsWith("NSL") || refUpper.startsWith("SA")) {
        return; // Exclude Sales
      }
      if (refUpper.startsWith("LPR") || refUpper.startsWith("IPR") || refUpper.startsWith("NPR") || refUpper.startsWith("PR")) {
        return; // Exclude Purchase
      }
      
      // Determine type
      if (refUpper.startsWith("RC-") || refUpper.startsWith("RCPT") || refUpper.startsWith("R")) vType = "Receipt";
      else if (refUpper.startsWith("PM-") || refUpper.startsWith("PAY") || refUpper.startsWith("P")) vType = "Payment";
      else if (refUpper.startsWith("CO-") || refUpper.startsWith("CONTRA") || refUpper.startsWith("C")) vType = "Contra";
      else if (refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("SR-") || refUpper.startsWith("CN-")) return; // Exclude Sales Return
      else if (refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("PR-") || refUpper.startsWith("DN-")) return; // Exclude Purchase Return
      
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
        const ledger = ledgers.find(l => l.code === entry.accountId);
        const group = ledger ? ledger.groupName.toUpperCase() : "";
        const name = ledger ? ledger.name.toUpperCase() : "";

        // Check if GST group
        const matchedGstGroup = gstGroups.find(g => group === g || name.includes(g));
        if (matchedGstGroup) {
          hasGst = true;
          const val = Math.abs(entry.debit - entry.credit);
          if (matchedGstGroup.includes("SGST")) sgstAmt += val;
          else if (matchedGstGroup.includes("CGST")) cgstAmt += val;
          else if (matchedGstGroup.includes("IGST")) igstAmt += val;
        } else if (group.includes("CESS") || name.includes("CESS") || entry.accountId === "2200") {
          cessAmt += Math.abs(entry.debit - entry.credit);
        } else {
          // If not cash/bank group, treat as the primary Particulars account head
          const isCashBank = cashBankGroups.some(g => group === g || name.includes(g)) || ["1200", "1300"].includes(entry.accountId);
          if (!isCashBank) {
            if (!mainEntry || Math.abs(entry.debit - entry.credit) > Math.abs(mainEntry.debit - mainEntry.credit)) {
              mainEntry = entry;
            }
          }
        }
      });

      if (hasGst) {
        // Calculate Net Amount as sum of debits (which equals sum of credits)
        netAmt = tx.entries.reduce((sum, e) => sum + e.debit, 0);
        const gstAmt = sgstAmt + cgstAmt + igstAmt;
        const taxableVal = netAmt - gstAmt - cessAmt;

        if (mainEntry) {
          const mainLedger = ledgers.find(l => l.code === mainEntry.accountId);
          particularsName = mainLedger ? mainLedger.name.toUpperCase() : "";
        } else {
          particularsName = tx.description || "Offset Entry";
        }

        // Standard Indian Date formatting (dd-mm-yyyy)
        const dateParts = tx.date.split("-");
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : tx.date;

        filteredList.push({
          date: formattedDate,
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
              <input type="date" id="gv-from-date" value="${fromDateStr}" style="border: 1px solid #7a96b2; padding: 2px; font-size: 0.8rem; background: white; color: black;">
              <span style="font-size: 0.8rem; color: black;">To</span>
              <input type="date" id="gv-to-date" value="${toDateStr}" style="border: 1px solid #7a96b2; padding: 2px; font-size: 0.8rem; background: white; color: black;">
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
                  <tr style="border-bottom: 1px solid #cbd5e1; font-size: 0.78rem;">
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: 500;">${item.date}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: 600; color: #1e3a8a;">${item.vNo}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #000;">${item.particulars}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">₹${item.taxable.toFixed(2)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; color: #0f766e;">₹${item.sgst.toFixed(2)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; color: #0f766e;">₹${item.cgst.toFixed(2)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; color: #1e3a8a;">₹${item.igst.toFixed(2)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹${item.gst.toFixed(2)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">₹${item.cess.toFixed(2)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; background-color: #f1f5f9;">₹${item.net.toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    `;

    // Hook filters and actions
    const closeOverlay = () => {
      const overlay = document.getElementById("gst-voucher-modal-overlay");
      if (overlay) overlay.classList.remove("active");
      root.innerHTML = "";
    };
    document.getElementById("gv-close-btn-header").addEventListener("click", closeOverlay);
    document.getElementById("gv-btn-close").addEventListener("click", closeOverlay);

    document.getElementById("gv-btn-view").addEventListener("click", () => {
      fromDateStr = document.getElementById("gv-from-date").value;
      toDateStr = document.getElementById("gv-to-date").value;
      selectedVType = document.getElementById("gv-vtype").value;
      renderContent();
    });

    document.getElementById("gv-btn-preview").addEventListener("click", () => {
      window.print();
    });
  }

  renderContent();
}
