const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MDB_PATH = 'G:\\c\\Tradeasy GST\\Database\\Datas\\0002\\Tradeasy2.mdb';
const DB_PASSWORD = 'WILLS';
const ERP_ROOT = 'G:\\sw m\\erp';
const ERP_JSON = path.join(ERP_ROOT, 'COMPANY DATA BASE', 'METRO AGENCIES', 'METRO AGENCIES - Current F.Y.json');
const SCRATCH_DIR = 'C:\\Users\\91702\\.gemini\\antigravity\\brain\\7a19c2ca-006d-4ff9-978d-2bc20a6a651b\\scratch';

console.log('--- RUNNING LEDGER CLOSING BALANCES RECONCILIATION ---');

// Step 1: Calculate ledger closing balances directly in Tradeasy2.mdb via ADODB
const vbsQuery = `
Dim conn, rs, fso, out
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${MDB_PATH.replace(/\\/g, '\\\\')};Jet OLEDB:Database Password=${DB_PASSWORD};"

Set fso = CreateObject("Scripting.FileSystemObject")
Set out = fso.CreateTextFile("${path.join(SCRATCH_DIR, 'tradeasy_balances.json').replace(/\\/g, '\\\\')}", True, True)

' Query: Get opening balance + all debit / credit transactions per Ledger
Dim sql
sql = "SELECT l.LedgerID, l.LedgerName, l.GroupID, l.OpnDebit, l.OpnCredit, " & _
      "  (SELECT SUM(av.Debit) FROM AccountVoucher av WHERE av.LedgerID = l.LedgerID AND (av.CancelFlag = False OR av.CancelFlag = 0 OR av.CancelFlag IS NULL)) AS TotDebit, " & _
      "  (SELECT SUM(av.Credit) FROM AccountVoucher av WHERE av.LedgerID = l.LedgerID AND (av.CancelFlag = False OR av.CancelFlag = 0 OR av.CancelFlag IS NULL)) AS TotCredit " & _
      "FROM Ledgers l " & _
      "ORDER BY l.LedgerID"

Set rs = conn.Execute(sql)

out.Write "["
Dim first
first = True
Do Until rs.EOF
    If Not first Then out.Write ","
    first = False
    
    Dim opDr, opCr, tDr, tCr
    opDr = 0
    opCr = 0
    tDr = 0
    tCr = 0
    
    If Not IsNull(rs("OpnDebit")) Then opDr = CDbl(rs("OpnDebit"))
    If Not IsNull(rs("OpnCredit")) Then opCr = CDbl(rs("OpnCredit"))
    If Not IsNull(rs("TotDebit")) Then tDr = CDbl(rs("TotDebit"))
    If Not IsNull(rs("TotCredit")) Then tCr = CDbl(rs("TotCredit"))
    
    Dim netBal
    netBal = (opDr - opCr) + (tDr - tCr)
    
    out.Write "{"
    out.Write """ledgerId"":" & rs("LedgerID") & ","
    out.Write """ledgerName"":""" & Replace(Replace(CStr(rs("LedgerName")), "\", "\\"), """", "\""") & ""","
    out.Write """opnDebit"":" & opDr & ","
    out.Write """opnCredit"":" & opCr & ","
    out.Write """totDebit"":" & tDr & ","
    out.Write """totCredit"":" & tCr & ","
    out.Write """netClosingBalance"":" & netBal
    out.Write "}"
    
    rs.MoveNext
Loop
out.Write "]"
out.Close
rs.Close
conn.Close
`;

const vbsPath = path.join(SCRATCH_DIR, 'calc_tradeasy_balances.vbs');
fs.writeFileSync(vbsPath, vbsQuery);

console.log('Calculating Tradeasy closing balances via SQL...');
execSync(`C:\\Windows\\SysWOW64\\cscript.exe //nologo "${vbsPath}"`, {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024
});

let rawT = fs.readFileSync(path.join(SCRATCH_DIR, 'tradeasy_balances.json'), 'utf16le');
if (rawT.charCodeAt(0) === 0xFEFF) rawT = rawT.slice(1);
const tradeasyBalances = JSON.parse(rawT);
console.log(`Loaded ${tradeasyBalances.length} ledger balances from Tradeasy.`);

// Step 2: Calculate closing balances in ERP dataset
const erpData = JSON.parse(fs.readFileSync(ERP_JSON, 'utf8'));

// Build ERP ledger code to balance map
const erpLedgerTotals = new Map();

for (const ld of erpData.ledgers) {
  const code = ld.code;
  const opBal = ld.openingBalance || 0;
  const isDr = ld.balanceType === 'Debit';
  erpLedgerTotals.set(code, {
    code: code,
    tradeasyId: ld.tradeasyId,
    name: ld.name,
    groupName: ld.groupName,
    opnDebit: isDr ? opBal : 0,
    opnCredit: !isDr ? opBal : 0,
    totDebit: 0,
    totCredit: 0
  });
}

for (const tx of erpData.transactions) {
  for (const entry of (tx.entries || [])) {
    const accId = entry.accountId;
    if (erpLedgerTotals.has(accId)) {
      const rec = erpLedgerTotals.get(accId);
      rec.totDebit += (parseFloat(entry.debit) || 0);
      rec.totCredit += (parseFloat(entry.credit) || 0);
    }
  }
}

// Step 3: Compare each ledger
console.log('\n--- RECONCILIATION COMPARISON ---');
let matchCount = 0;
let diffCount = 0;
const differences = [];

for (const tRec of tradeasyBalances) {
  const code = `L${String(tRec.ledgerId).padStart(4, '0')}`;
  const erpRec = erpLedgerTotals.get(code);
  
  if (!erpRec) {
    diffCount++;
    differences.push({
      ledgerId: tRec.ledgerId,
      name: tRec.ledgerName,
      issue: 'Missing in ERP'
    });
    continue;
  }
  
  const tNet = Math.round((tRec.netClosingBalance) * 100) / 100;
  const erpNet = Math.round(((erpRec.opnDebit - erpRec.opnCredit) + (erpRec.totDebit - erpRec.totCredit)) * 100) / 100;
  
  const diff = Math.abs(tNet - erpNet);
  if (diff < 0.01) {
    matchCount++;
  } else {
    diffCount++;
    differences.push({
      ledgerId: tRec.ledgerId,
      code: code,
      name: tRec.ledgerName,
      tradeasyNet: tNet,
      erpNet: erpNet,
      diff: diff,
      tOpDr: tRec.opnDebit,
      tOpCr: tRec.opnCredit,
      tTotDr: tRec.totDebit,
      tTotCr: tRec.totCredit,
      eTotDr: erpRec.totDebit,
      eTotCr: erpRec.totCredit
    });
  }
}

console.log(`Total Ledgers: ${tradeasyBalances.length}`);
console.log(`Matched Perfectly: ${matchCount} / ${tradeasyBalances.length} (${((matchCount / tradeasyBalances.length) * 100).toFixed(2)}%)`);
console.log(`Differences: ${diffCount}`);

if (differences.length > 0) {
  console.log('\nDiscrepancies found:');
  console.log(JSON.stringify(differences.slice(0, 20), null, 2));
} else {
  console.log('\n>>> 100% PERFECT MATCH! ALL 1306 LEDGER CLOSING BALANCES RECONCILED EXACTLY! <<<');
}
