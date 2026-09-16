const fs = require('fs');
let code = fs.readFileSync('G:/sw m/erp/src/views/transactions.js', 'utf8');

const regex = /document\.getElementById\("create-invoice-form"\)\.addEventListener\("submit",\s*\(e\)\s*=>\s*\{/g;

code = code.replace(regex, `document.getElementById("create-invoice-form").addEventListener("submit", async (e) => {
    const btn = document.querySelector("#create-invoice-form button[type=\\"submit\\"]");
    if(btn) { btn.disabled = true; btn.textContent = "Saving..."; }
    
    let locked = false;
    while(!locked) {
      try {
        const res = await fetch(\`http://\${window.location.hostname}:3001/api/lock\`);
        const data = await res.json();
        if (data.locked) locked = true;
        else await new Promise(r => setTimeout(r, 500));
      } catch(e) { break; } 
    }
    await state.pullLatestFromServer();
`);

fs.writeFileSync('G:/sw m/erp/src/views/transactions.js', code);
console.log('Fixed async');
