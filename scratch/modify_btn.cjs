const fs = require('fs');
let code = fs.readFileSync('G:/sw m/erp/src/views/transactions.js', 'utf8');

const oldStr = 'const btn = document.getElementById("btn-save-invoice");';
const newStr = 'const btn = document.querySelector("#create-invoice-form button[type=\\"submit\\"]");';

if(code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync('G:/sw m/erp/src/views/transactions.js', code);
  console.log('Modified button selector in transactions.js');
} else {
  console.log('Could not find btn string');
}
