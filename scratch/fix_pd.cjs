const fs = require('fs');
let code = fs.readFileSync('G:/sw m/erp/src/views/transactions.js', 'utf8');

code = code.replace(
`document.getElementById("create-invoice-form").addEventListener("submit", async (e) => {
    const btn = document.querySelector("#create-invoice-form button[type=\\"submit\\"]");`,
`document.getElementById("create-invoice-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.querySelector("#create-invoice-form button[type=\\"submit\\"]");`
);

code = code.replace(`
    await state.pullLatestFromServer();

    e.preventDefault();`, `
    await state.pullLatestFromServer();`);

fs.writeFileSync('G:/sw m/erp/src/views/transactions.js', code);
console.log('Fixed preventDefault location');
