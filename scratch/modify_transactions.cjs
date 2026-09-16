const fs = require('fs');
let code = fs.readFileSync('G:/sw m/erp/src/views/transactions.js', 'utf8');

const oldStr = 'document.getElementById("create-invoice-form").addEventListener("submit", (e) => {';
const newStr = `document.getElementById("create-invoice-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-save-invoice");
    if(btn) { btn.disabled = true; btn.textContent = "Saving..."; }
    
    // Acquire Lock
    let locked = false;
    while(!locked) {
      try {
        const res = await fetch(\`http://\${window.location.hostname}:3001/api/lock\`);
        const data = await res.json();
        if (data.locked) locked = true;
        else await new Promise(r => setTimeout(r, 500));
      } catch(e) { break; } // fallback if server doesn't support lock
    }
    
    // Pull latest state to memory to prevent overwrite
    await state.pullLatestFromServer();
`;

const endStr = `
    const newInv = state.createInvoice(payload);
`;
const replaceEndStr = `
    const newInv = state.createInvoice(payload);
    
    // Release Lock
    try { await fetch(\`http://\${window.location.hostname}:3001/api/unlock\`); } catch(e) {}
    if(btn) { btn.disabled = false; btn.textContent = "Save Invoice"; }
`;

if(code.includes(oldStr)) {
  code = code.replace(oldStr + '\n      e.preventDefault();', newStr);
  code = code.replace(endStr, replaceEndStr);
  fs.writeFileSync('G:/sw m/erp/src/views/transactions.js', code);
  console.log('Modified transactions.js');
} else {
  console.log('Could not find string in transactions.js');
}
