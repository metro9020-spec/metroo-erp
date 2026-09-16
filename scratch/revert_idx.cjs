const fs = require('fs');
let code = fs.readFileSync('G:/sw m/erp/src/views/transactions.js', 'utf8');

const startStr = 'document.getElementById("create-invoice-form").addEventListener("submit", async (e) => {';
const endStr = 'const newInv = state.createInvoice(payload);';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const originalBlock = `document.getElementById("create-invoice-form").addEventListener("submit", (e) => {
    e.preventDefault();

    if (gridItems.length === 0) {
      alert("The invoice item grid is empty! Please add at least one product.");
      return;
    }
    
    const siteContainer = document.getElementById("inv-site-container");
    const siteSelect = document.getElementById("inv-site");
    if (siteContainer.style.display !== "none" && !siteSelect.value) {
      alert("Please select a Site for this multiple-site customer.");
      return;
    }

    const payload = {
      id: editInvoice ? editInvoice.id : undefined,
      voucherNo: editInvoice ? editInvoice.voucherNo : undefined,
      seriesId: activeSeries ? activeSeries.id : undefined,
      postingLedger: activeSeries ? activeSeries.ledgerCode : undefined,
      contactId: document.getElementById("inv-customer").value,
      siteName: siteContainer.style.display !== "none" ? siteSelect.value : "",
      refNo: document.getElementById("inv-refno").value,
      employee: options.enableEmployeeSales ? document.getElementById("inv-employee").value.trim() : "",
      influencer: options.enableInfluencerSales ? document.getElementById("inv-influencer").value.trim() : "",
      date: document.getElementById("inv-date").value,
      dueDate: document.getElementById("inv-duedate").value,
      state: document.getElementById("inv-state").value,
      payMode: document.getElementById("inv-paymode").value,
      creditPeriod: document.getElementById("inv-crperiod").value,
      narration: document.getElementById("inv-narration").value,
      vehicleNo: document.getElementById("inv-vehicle-no") ? document.getElementById("inv-vehicle-no").value.trim() : "",
      shippingAddress: shippingAddressVal,
      discountPercent: generalDisPercentInput.value,
      discountAmount: generalDisAmtInput.value,
      adjustments: document.getElementById("inv-adjustments").value,
      adjustmentsList: adjustmentsList,
      additionalCess: document.getElementById("inv-addlcess").value,
      roundOff: document.getElementById("inv-roundoff").value,
      items: gridItems
    };

    if (editInvoice) {
      const pass = prompt("Enter Admin Password to update this invoice:");
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password!");
        return;
      }
      state.cancelInvoice(editInvoice.id);
      const idx = state.invoices.findIndex(i => i.id === editInvoice.id);
      if (idx !== -1) {
        state.invoices.splice(idx, 1);
      }
    }

    const newInv = state.createInvoice(payload);`;

    const unlockStr = `
      // Release Lock
      try { await fetch(\`http://\${window.location.hostname}:3001/api/unlock\`); } catch(e) {}
      if(btn) { btn.disabled = false; btn.textContent = "Save Invoice"; }`;

    code = code.substring(0, startIndex) + originalBlock + code.substring(endIndex + endStr.length);
    code = code.replace(unlockStr, "");
    
    fs.writeFileSync('G:/sw m/erp/src/views/transactions.js', code);
    console.log("Reverted successfully");
} else {
    console.log("Could not find start or end index");
}
