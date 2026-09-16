const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ERP_ROOT = 'G:\\sw m\\erp';
const SCRATCH_DIR = path.join(ERP_ROOT, 'scratch');
const DATA_FILE = path.join(ERP_ROOT, 'COMPANY DATA BASE', 'METRO AGENCIES', 'METRO AGENCIES - Current F.Y.json');
const ALT_DATA_FILE_1 = path.join(ERP_ROOT, 'COMPANY DATA BASE', 'company METRO AGENCIES', 'data.json');
const ALT_DATA_FILE_2 = path.join(ERP_ROOT, 'COMPANY DATA BASE', 'company 1', 'data.json');
const TEMP_JSON = path.join(SCRATCH_DIR, 'temp_extract.json');

console.log('=== STRICT CLEAN VOUCHER RE-FETCH PROCESS ===');

// 1. Re-extract fresh data from Tradeasy2.mdb
const extractVbs = path.join(ERP_ROOT, 'scripts', 'run_extract.vbs');
console.log('Extracting fresh table data from Tradeasy2.mdb...');
execSync(`C:\\Windows\\SysWOW64\\cscript.exe //nologo "${extractVbs}"`, { stdio: 'inherit' });

if (!fs.existsSync(TEMP_JSON)) {
  console.error('Error: temp_extract.json not found after extraction!');
  process.exit(1);
}

// Read UTF-16LE extract
let raw = fs.readFileSync(TEMP_JSON, 'utf16le');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const rawData = JSON.parse(raw);

console.log(`Extracted ${rawData.accountVouchers ? rawData.accountVouchers.length : 0} raw account voucher entries from MDB.`);

// 2. Read target company JSON
const mainData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Build lookup maps
const contactMap = new Map();
(mainData.contacts || []).forEach(c => {
  if (c.tradeasyLedgerId !== undefined && c.tradeasyLedgerId !== null) {
    contactMap.set(c.tradeasyLedgerId, c);
  }
});

const nonContactLedgerMap = new Map();
const allLedgerMap = new Map();
(mainData.ledgers || []).forEach(l => {
  if (l.tradeasyId !== undefined && l.tradeasyId !== null) {
    allLedgerMap.set(l.tradeasyId, l);
    if (l.groupName !== 'SUNDRY DEBTORS' && l.groupName !== 'SUNDRY CREDITORS' && !l.isCustomerSubLedger) {
      nonContactLedgerMap.set(l.tradeasyId, l);
    }
  }
});

// Static account IDs mapping for standard system ledgers
const staticMap = {
  1: 'L0001', // CASH
  2: 'L0002', // PROFIT & LOSS / BANK / CASH
  4: 'L0004', // LOCAL SALES
  5: 'L0005', // LOCAL PURCHASE
  6: 'L0006', // STOCK
  12: 'L0012', // ROUND OFF
  100: 'L0100' // FEDERARAL BANK
};

const resolveAccId = (lId) => {
  if (staticMap[lId]) return staticMap[lId];
  if (nonContactLedgerMap.has(lId)) return nonContactLedgerMap.get(lId).code;
  if (contactMap.has(lId)) return contactMap.get(lId).id;
  if (allLedgerMap.has(lId)) return allLedgerMap.get(lId).code;
  return `L${String(lId).padStart(4, '0')}`;
};

// 3. Strict filter: KEEP ONLY Sales and Purchase transactions, REMOVE all previous non-sales/purchase vouchers
const isSalesOrPurchase = (tx) => {
  if (!tx) return false;
  const vt = String(tx.voucherType || '').toUpperCase().trim();
  const idStr = String(tx.id || '').toUpperCase().trim();
  const refStr = String(tx.reference || '').toUpperCase().trim();
  const descStr = String(tx.description || '').toUpperCase().trim();

  // Explicit Sales or Purchase voucherType
  if (vt === 'SALE' || vt === 'SALES' || vt === 'PUR' || vt === 'PURCHASE') return true;

  // COGS accounting entries for sales invoices
  if (idStr.startsWith('TX-1') && (refStr.includes('COGS') || descStr.includes('COST OF GOODS SOLD'))) return true;

  // Sales invoice IDs or references
  if (idStr.startsWith('LSL-') || idStr.startsWith('INV-') || idStr.startsWith('B2B') || idStr.startsWith('SA-')) return true;
  if (refStr.startsWith('LSL-') || refStr.startsWith('INV-') || refStr.startsWith('B2B') || refStr.startsWith('SA-')) return true;

  return false;
};

const keptSalesAndPurchaseTxs = (mainData.transactions || []).filter(isSalesOrPurchase);
const removedVoucherTxs = (mainData.transactions || []).filter(tx => !isSalesOrPurchase(tx));

console.log(`Kept ${keptSalesAndPurchaseTxs.length} sales and purchase transactions.`);
console.log(`Removed ${removedVoucherTxs.length} previous non-sales/purchase voucher entries.`);

// 4. Group account vouchers by VoucherID for FY 2026-04-01 to 2027-03-31
const voucherTypes = ['REC', 'PAY', 'CON', 'JV', 'R', 'P', 'J', 'C'];
const vouchersById = new Map();

for (const av of (rawData.accountVouchers || [])) {
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

console.log(`Found ${vouchersById.size} unique FY account vouchers (REC, PAY, CON, JV) in Tradeasy2.mdb.`);

// 5. Convert MDB vouchers into clean ERP transaction objects
const newlyFetchedVouchers = [];

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
    const accId = resolveAccId(lId);
    
    if (contactMap.has(lId) && !primaryContact) {
      primaryContact = contactMap.get(lId);
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

  newlyFetchedVouchers.push({
    id: `TX-${rawType}-${vid}`,
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

console.log(`Converted ${newlyFetchedVouchers.length} voucher transactions.`);

// 6. Merge kept sales/purchase transactions with newly refetched vouchers
mainData.transactions = [...keptSalesAndPurchaseTxs, ...newlyFetchedVouchers];

// Sort transactions by date ascending
mainData.transactions.sort((a, b) => {
  if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
  return (a.id || '').localeCompare(b.id || '');
});

console.log(`Total transactions in ERP after strict clean re-fetch: ${mainData.transactions.length}`);

// 7. Audit verification for Federal Bank (L0100) up to 20/Aug/2026
let fedDr = 0, fedCr = 0, fedCount = 0;
mainData.transactions.forEach(tx => {
  if (!tx.entries || (tx.date && tx.date > '2026-08-20')) return;
  let hasFed = false;
  tx.entries.forEach(e => {
    if (e.accountId === 'L0100') {
      hasFed = true;
      fedDr += parseFloat(e.debit) || 0;
      fedCr += parseFloat(e.credit) || 0;
    }
  });
  if (hasFed) fedCount++;
});

const fedOpening = 20725.90;
const fedClosing = fedOpening + fedDr - fedCr;

console.log('\n--- AUDIT VERIFICATION: FEDERAL BANK (L0100) UP TO 20/AUG/2026 ---');
console.log(`Opening Balance:  ₹${fedOpening.toFixed(2)} Dr`);
console.log(`Total Debits:     ₹${fedDr.toFixed(2)} (Target: ₹5051289.94)`);
console.log(`Total Credits:    ₹${fedCr.toFixed(2)} (Target: ₹5030027.00)`);
console.log(`Closing Balance:  ₹${fedClosing.toFixed(2)} Dr (Target: ₹41988.84 Dr)`);
console.log(`Transactions Count: ${fedCount} (Target: 383)`);

if (Math.abs(fedDr - 5051289.94) < 0.05 && Math.abs(fedCr - 5030027.00) < 0.05) {
  console.log('>>> VERIFICATION PASSED PERFECTLY! <<<');
} else {
  console.warn('>>> WARNING: AUDIT TOTALS DIFFER FROM BENCHMARK! <<<');
}

// Create backup before writing
const backupPath = `${DATA_FILE}.bak_strict_clean_${Date.now()}`;
fs.copyFileSync(DATA_FILE, backupPath);
console.log(`\nCreated backup at ${backupPath}`);

// Write updated data files
fs.writeFileSync(DATA_FILE, JSON.stringify(mainData, null, 2), 'utf8');
console.log(`Saved ${DATA_FILE} successfully.`);

if (fs.existsSync(path.dirname(ALT_DATA_FILE_1))) {
  fs.writeFileSync(ALT_DATA_FILE_1, JSON.stringify(mainData, null, 2), 'utf8');
  console.log(`Synced ${ALT_DATA_FILE_1} successfully.`);
}

if (fs.existsSync(path.dirname(ALT_DATA_FILE_2))) {
  fs.writeFileSync(ALT_DATA_FILE_2, JSON.stringify(mainData, null, 2), 'utf8');
  console.log(`Synced ${ALT_DATA_FILE_2} successfully.`);
}

console.log('=== STRICT CLEAN VOUCHER RE-FETCH COMPLETE ===');
