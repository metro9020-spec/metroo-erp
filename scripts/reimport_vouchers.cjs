const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ERP_ROOT = 'G:\\sw m\\erp';
const SCRATCH_DIR = path.join(ERP_ROOT, 'scratch');
const DATA_FILE = path.join(ERP_ROOT, 'COMPANY DATA BASE', 'METRO AGENCIES', 'METRO AGENCIES - Current F.Y.json');
const TEMP_JSON = path.join(SCRATCH_DIR, 'temp_extract.json');

console.log('=== VOUCHER RE-IMPORT PROCESS ===');

// 1. Run run_extract.vbs if temp_extract.json does not exist or needs update
const extractVbs = path.join(ERP_ROOT, 'scripts', 'run_extract.vbs');
console.log('Extracting tables from Tradeasy2.mdb...');
execSync(`C:\\Windows\\SysWOW64\\cscript.exe //nologo "${extractVbs}"`, { stdio: 'inherit' });

if (!fs.existsSync(TEMP_JSON)) {
  console.error('Error: temp_extract.json not found after VBS extraction!');
  process.exit(1);
}

// 2. Read UTF-16LE extract
let raw = fs.readFileSync(TEMP_JSON, 'utf16le');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const rawData = JSON.parse(raw);

console.log(`Extracted ${rawData.accountVouchers.length} raw account voucher entries from MDB.`);

// 3. Read target company JSON
const mainData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Build lookup maps
const contactMap = new Map();
(mainData.contacts || []).forEach(c => {
  if (c.tradeasyLedgerId) contactMap.set(c.tradeasyLedgerId, c);
});

const ledgerMap = new Map();
(mainData.ledgers || []).forEach(l => {
  if (l.tradeasyId) ledgerMap.set(l.tradeasyId, l);
});

// Static account IDs mapping from Tradeasy system ledger IDs
const staticMap = {
  1: '1010', // CASH
  2: '1020', // BANK
  3: '1020', // BANK
  4: '4100', // SALES
  5: '1200', // PURCHASE / STOCK
  6: '1100', // SUNDRY DEBTORS
  7: '2100'  // SUNDRY CREDITORS
};

// 4. Group vouchers by VoucherID and filter by Financial Year (2026-04-01 to 2027-03-31) and VoucherType
const voucherTypes = ['REC', 'PAY', 'CON', 'JV', 'R', 'P', 'J', 'C'];
const vouchersById = new Map();

for (const av of rawData.accountVouchers) {
  if (!av) continue;
  const vType = String(av.VoucherType || '').toUpperCase().trim();
  if (!voucherTypes.includes(vType)) continue;

  const vDate = av.VoucherDate;
  if (!vDate || vDate < '2026-04-01' || vDate > '2027-03-31') continue;

  const isCanceled = av.CancelFlag === true || av.CancelFlag === -1 || av.CancelFlag === 1;
  if (isCanceled) continue;

  const vid = av.VoucherID;
  if (!vouchersById.has(vid)) vouchersById.set(vid, []);
  vouchersById.get(vid).push(av);
}

console.log(`Found ${vouchersById.size} unique FY voucher transactions (REC, PAY, CON, JV).`);

const importedVouchers = [];

for (const [vid, entries] of vouchersById.entries()) {
  if (!entries || entries.length === 0) continue;

  const first = entries[0];
  const rawType = String(first.VoucherType || 'JV').toUpperCase().trim();
  const vNo = first.VoucherNo || String(vid);
  const vDate = first.VoucherDate;

  let normType = 'Journal';
  let refPrefix = 'JV-';
  if (rawType === 'REC' || rawType === 'R') {
    normType = 'Receipt';
    refPrefix = 'RC-';
  } else if (rawType === 'PAY' || rawType === 'P') {
    normType = 'Payment';
    refPrefix = 'PAY-';
  } else if (rawType === 'CON' || rawType === 'C') {
    normType = 'Contra';
    refPrefix = 'CNTR-';
  }

  const reference = `${refPrefix}${vNo}`;
  let primaryContact = null;

  const txEntries = entries.map(e => {
    const lId = e.LedgerID;
    const contact = contactMap.get(lId);
    const ledger = ledgerMap.get(lId);

    let accId = contact ? contact.id : (ledger ? ledger.code : (staticMap[lId] || `L${String(lId).padStart(4, '0')}`));
    
    if (contact && !primaryContact) {
      primaryContact = contact;
    }

    return {
      accountId: accId,
      debit: parseFloat(e.Debit) || 0,
      credit: parseFloat(e.Credit) || 0,
      narration: e.Narration || ''
    };
  });

  let description = first.Narration || '';
  if (!description) {
    if (normType === 'Receipt' && primaryContact) {
      const partyRole = (primaryContact.type === 'supplier' || primaryContact.listInVendorList) ? 'Supplier' : 'Customer';
      description = `Receipt from ${partyRole}: ${primaryContact.name} (${reference})`;
    } else if (normType === 'Payment' && primaryContact) {
      const partyRole = (primaryContact.type === 'customer' || primaryContact.listInCustomerList) ? 'Customer' : 'Supplier';
      description = `Payment to ${partyRole}: ${primaryContact.name} (${reference})`;
    } else if (normType === 'Contra') {
      description = `Contra Voucher ${vNo}`;
    } else {
      description = `${normType} Voucher ${vNo}`;
    }
  }

  importedVouchers.push({
    id: `TX-VOUCHER-${vid}`,
    voucherId: String(vid),
    voucherNo: String(vNo),
    voucherType: normType,
    date: vDate,
    reference: reference,
    description: description,
    contactId: primaryContact ? primaryContact.id : '',
    siteName: '',
    entries: txEntries
  });
}

console.log(`Successfully converted ${importedVouchers.length} voucher transactions.`);

// 5. Remove any previously imported TX-VOUCHER- entries from mainData.transactions to prevent duplicates
const existingTxs = (mainData.transactions || []).filter(tx => !String(tx.id || '').startsWith('TX-VOUCHER-'));
console.log(`Existing non-voucher transactions: ${existingTxs.length}`);

// Merge existing transactions with newly imported FY voucher transactions
mainData.transactions = [...existingTxs, ...importedVouchers];
console.log(`Total merged transactions count: ${mainData.transactions.length}`);

// 6. Write back updated METRO AGENCIES JSON
fs.writeFileSync(DATA_FILE, JSON.stringify(mainData, null, 2), 'utf8');
console.log(`Saved ${DATA_FILE} successfully.`);

console.log('=== VOUCHER RE-IMPORT COMPLETE ===');
