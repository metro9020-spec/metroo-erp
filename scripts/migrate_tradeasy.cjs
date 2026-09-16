const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ERP_ROOT = 'G:\\sw m\\erp';
const DATA_DIR = path.join(ERP_ROOT, 'COMPANY DATA BASE');
const METRO_DIR = path.join(DATA_DIR, 'METRO AGENCIES');
const SCRATCH_DIR = 'C:\\Users\\91702\\.gemini\\antigravity\\brain\\7a19c2ca-006d-4ff9-978d-2bc20a6a651b\\scratch';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(METRO_DIR)) fs.mkdirSync(METRO_DIR, { recursive: true });

console.log('--- RUNNING TRADEASY DATA EXTRACTION ---');

const extractVbs = path.join(SCRATCH_DIR, 'run_extract.vbs');
const tmpJson = path.join(SCRATCH_DIR, 'temp_extract.json');

const vbsOut = execSync(`C:\\Windows\\SysWOW64\\cscript.exe //nologo "${extractVbs}"`, {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024
});
console.log('VBS Output:', vbsOut.trim());

// Read UTF-16LE / UTF-8 safely
let raw = fs.readFileSync(tmpJson, 'utf16le');
if (raw.charCodeAt(0) === 0xFEFF) {
  raw = raw.slice(1);
}

const rawData = JSON.parse(raw);

console.log(`Extracted raw tables:
- Products: ${rawData.products.length}
- OpeningStocks: ${rawData.openingStocks.length}
- Customers: ${rawData.customers.length}
- Vendors: ${rawData.vendors.length}
- Ledgers: ${rawData.ledgers.length}
- AccountGroups: ${rawData.accountGroups.length}
- SalesMaster: ${rawData.salesMaster.length}
- SalesDetails: ${rawData.salesDetails.length}
- PurchaseMaster: ${rawData.purchaseMaster.length}
- PurchaseDetails: ${rawData.purchaseDetails.length}
- VoucherMaster: ${rawData.voucherMaster.length}
- AccountVoucher: ${rawData.accountVouchers.length}
`);

// Build Lookup Dictionaries
const categoryMap = new Map(rawData.categories.map(c => [c.CategoryID, c.CategoryName]));
const subCategoryMap = new Map(rawData.subCategories.map(s => [s.SubCategoryID || s.SubCategoryId, s.SubCategoryName]));
const productGroupMap = new Map(rawData.productGroups.map(g => [g.ProdgroupId, g.ProdgroupName]));
const brandMap = new Map(rawData.brands.map(b => [b.CompanyID, b.CompanyName]));
const unitMap = new Map(rawData.units.map(u => [u.UnitID, u.Symbol || u.Unit]));

const accountGroupMap = new Map(rawData.accountGroups.map(g => [g.GroupID, g.GroupName]));
const ledgerMap = new Map(rawData.ledgers.map(l => [l.LedgerID, l]));
const allProductsMap = new Map(rawData.products.map(p => [p.ProductID, p]));

const openingStockByProdId = new Map();
for (const os of rawData.openingStocks) {
  const pid = os.PRODUCTID;
  const current = openingStockByProdId.get(pid) || 0;
  openingStockByProdId.set(pid, current + (parseFloat(os.QTY) || 0));
}

// Transform Products & Merge Batches
console.log('Transforming products and merging batches...');

const parentProducts = [];
const childBatchesByParentId = new Map();

for (const prod of rawData.products) {
  const parentId = prod.parentid;
  if (parentId && parentId !== 0 && allProductsMap.has(parentId)) {
    if (!childBatchesByParentId.has(parentId)) {
      childBatchesByParentId.set(parentId, []);
    }
    childBatchesByParentId.get(parentId).push(prod);
  } else {
    parentProducts.push(prod);
  }
}

console.log(`Main parent products: ${parentProducts.length}, Child batch products: ${rawData.products.length - parentProducts.length}`);

const productToMaterialMap = new Map();
const materials = [];

for (const parent of parentProducts) {
  const matId = `MAT-${String(parent.ProductID).padStart(4, '0')}`;
  const children = childBatchesByParentId.get(parent.ProductID) || [];
  
  const categoryName = categoryMap.get(parent.CategoryID) || 'General';
  const subCatName = subCategoryMap.get(parent.SubCategoryId) || '';
  const prodGroupName = productGroupMap.get(parent.ProdgroupId) || categoryName;
  const companyName = brandMap.get(parent.CompanyID) || 'Other';
  const unitName = unitMap.get(parent.UnitID) || 'Nos';
  
  const hsn = String(parent.DUMMY1 || parent.HSN || '').trim();
  const cgst = parseFloat(parent.CGST) || 0;
  const sgst = parseFloat(parent.SGST) || 0;
  const igst = parseFloat(parent.IGST) || 0;
  const cess = parseFloat(parent.CESSPER) || 0;
  
  const batches = [];
  let totalOpeningStock = 0;
  
  const parentOpStock = openingStockByProdId.get(parent.ProductID) || parseFloat(parent.Opstock) || 0;
  totalOpeningStock += parentOpStock;
  
  const parentLdgCost = parseFloat(parent.PCost) || parseFloat(parent.LdgCost) || parseFloat(parent.LASTCOST) || 0;
  const parentSellingPrice = parseFloat(parent.SellRateIn) || parseFloat(parent.MRP) || 0;
  const parentMrp = parseFloat(parent.MRP) || parentSellingPrice;
  
  const parentBatchNo = parentLdgCost > 0 ? String(parentLdgCost) : (parent.batchno ? String(parent.batchno) : "Standard");
  
  batches.push({
    batchNo: parentBatchNo,
    landingCost: parentLdgCost,
    openingStock: parentOpStock,
    stock: parentOpStock,
    marginPercent: parseFloat(parent.MarginP) || 0,
    marginAmount: parseFloat(parent.MarginAMT) || 0,
    gstExclRate: parentLdgCost,
    gstInclRate: parentSellingPrice,
    mrp: parentMrp,
    sellingPrice: parentSellingPrice,
    costPrice: parentLdgCost
  });
  
  productToMaterialMap.set(parent.ProductID, {
    materialId: matId,
    materialName: parent.ProductName || 'Unnamed Product',
    materialCode: parent.ProductCode || `CODE-${parent.ProductID}`,
    batchNo: parentBatchNo,
    unit: unitName,
    hsn: hsn
  });
  
  for (const child of children) {
    const childOpStock = openingStockByProdId.get(child.ProductID) || parseFloat(child.Opstock) || 0;
    totalOpeningStock += childOpStock;
    
    const childLdgCost = parseFloat(child.PCost) || parseFloat(child.LdgCost) || parseFloat(child.LASTCOST) || parentLdgCost;
    const childSellingPrice = parseFloat(child.SellRateIn) || parseFloat(child.MRP) || parentSellingPrice;
    const childMrp = parseFloat(child.MRP) || childSellingPrice;
    
    const childBatchNo = childLdgCost > 0 ? String(childLdgCost) : (child.batchno ? String(child.batchno) : `Batch-${child.ProductID}`);
    
    let existingBatch = batches.find(b => b.batchNo === childBatchNo);
    if (!existingBatch) {
      batches.push({
        batchNo: childBatchNo,
        landingCost: childLdgCost,
        openingStock: childOpStock,
        stock: childOpStock,
        marginPercent: parseFloat(child.MarginP) || 0,
        marginAmount: parseFloat(child.MarginAMT) || 0,
        gstExclRate: childLdgCost,
        gstInclRate: childSellingPrice,
        mrp: childMrp,
        sellingPrice: childSellingPrice,
        costPrice: childLdgCost
      });
    } else {
      existingBatch.openingStock += childOpStock;
      existingBatch.stock += childOpStock;
    }
    
    productToMaterialMap.set(child.ProductID, {
      materialId: matId,
      materialName: parent.ProductName || 'Unnamed Product',
      materialCode: child.ProductCode || parent.ProductCode || `CODE-${parent.ProductID}`,
      batchNo: childBatchNo,
      unit: unitName,
      hsn: hsn
    });
  }
  
  materials.push({
    id: matId,
    name: parent.ProductName || 'Unnamed Product',
    code: parent.ProductCode || `CODE-${parent.ProductID}`,
    category: categoryName,
    subCategory: subCatName,
    productGroup: prodGroupName,
    company: companyName,
    unit: unitName,
    reorderLevel: parseFloat(parent.ReorderLevel) || 0,
    barcode: parent.BARCODE || '',
    eanCode: parent.EAN || '',
    hsnCode: hsn,
    description: parent.DESCRIPTION || '',
    productType: parent.GTYPE === 'S' ? 'Services' : 'Goods',
    rackNo: parent.Rack || '',
    defaultDiscount: 0,
    cgst: cgst,
    sgst: sgst,
    igst: igst,
    cess: cess,
    addlCess: 0,
    cessOn: 'NetValue',
    alternateUnits: [],
    loadingChargeEnabled: false,
    loadingCharge: 0,
    openingStock: totalOpeningStock,
    stock: totalOpeningStock,
    landingCost: batches[0]?.landingCost || 0,
    costPrice: batches[0]?.costPrice || 0,
    sellingPrice: batches[0]?.sellingPrice || 0,
    gstExclRate: batches[0]?.gstExclRate || 0,
    gstInclRate: batches[0]?.gstInclRate || 0,
    mrp: batches[0]?.mrp || 0,
    marginPercent: batches[0]?.marginPercent || 0,
    marginAmount: batches[0]?.marginAmount || 0,
    batches: batches
  });
}

console.log(`Generated ${materials.length} merged materials.`);

// Transform Customers & Vendors
console.log('Transforming Customers & Vendors...');

const contacts = [];
const contactIdByLedgerId = new Map();

for (const cust of rawData.customers) {
  const cid = `CUST-${String(cust.LedgerID).padStart(4, '0')}`;
  contactIdByLedgerId.set(cust.LedgerID, cid);
  
  const opnDr = parseFloat(cust.OpnDebit) || 0;
  const opnCr = parseFloat(cust.OpnCredit) || 0;
  
  let balance = 0;
  let balanceType = 'Debit';
  if (opnDr > 0) {
    balance = opnDr;
    balanceType = 'Debit';
  } else if (opnCr > 0) {
    balance = opnCr;
    balanceType = 'Credit';
  }
  
  contacts.push({
    id: cid,
    name: cust.CustomerName || 'Unnamed Customer',
    printName: cust.PrintName || cust.CustomerName || '',
    type: 'customer',
    contactPerson: cust.Contact || cust.CPName || cust.CustomerName || '',
    phone: cust.Phone || cust.Mobile || '',
    mobile: cust.Mobile || '',
    email: cust.EMail || '',
    address: cust.Address || '',
    shippingAddress: cust.SAddress || '',
    gstin: cust.GSTIN || '',
    creditLimit: parseFloat(cust.CreditLimit) || 0,
    creditPeriod: parseFloat(cust.CreditPeriod) || 0,
    balance: balance,
    openingBalance: balance,
    balanceType: balanceType,
    tradeasyLedgerId: cust.LedgerID
  });
}

for (const vend of rawData.vendors) {
  const vid = `VEND-${String(vend.LedgerID).padStart(4, '0')}`;
  contactIdByLedgerId.set(vend.LedgerID, vid);
  
  const opnDr = parseFloat(vend.OpnDebit) || 0;
  const opnCr = parseFloat(vend.OpnCredit) || 0;
  
  let balance = 0;
  let balanceType = 'Credit';
  if (opnCr > 0) {
    balance = opnCr;
    balanceType = 'Credit';
  } else if (opnDr > 0) {
    balance = opnDr;
    balanceType = 'Debit';
  }
  
  contacts.push({
    id: vid,
    name: vend.VendorName || 'Unnamed Vendor',
    printName: vend.VendorName || '',
    type: 'supplier',
    contactPerson: vend.Contact || vend.CPName || vend.VendorName || '',
    phone: vend.Phone || vend.Mobile || '',
    mobile: vend.Mobile || '',
    email: vend.EMail || '',
    address: vend.Address || '',
    gstin: vend.GSTIN || '',
    creditLimit: parseFloat(vend.CreditLimit) || 0,
    creditPeriod: parseFloat(vend.CreditPeriod) || 0,
    balance: balance,
    openingBalance: balance,
    balanceType: balanceType,
    bankName: vend.BankName || '',
    acNo: vend.AcNo || '',
    ifsc: vend.IFSC || '',
    tradeasyLedgerId: vend.LedgerID
  });
}

console.log(`Generated ${contacts.length} contacts.`);

// Transform AccountGroups and Ledgers
console.log('Transforming Account Groups and Ledgers...');

const accountGroups = rawData.accountGroups.map(g => {
  let under = 'ASSETS';
  const gName = g.GroupName.toUpperCase();
  if (gName.includes('LIABILIT') || gName.includes('CREDITOR') || gName.includes('CAPITAL') || gName.includes('DUTIES') || gName.includes('TAXES') || gName.includes('PROVISION') || gName.includes('LOANS(LIAB') || gName.includes('BRANCH') || gName.includes('BANK OD') || gName.includes('ADJUSTMENTS') || gName.includes('OUTSTANDING')) {
    under = 'LIABILITIES';
  } else if (gName.includes('INCOME') || gName.includes('SALES')) {
    under = 'INCOME';
  } else if (gName.includes('EXPENSE') || gName.includes('PURCHASE') || gName.includes('DEPRECIATION') || gName.includes('SALARY') || gName.includes('EMPLOYEE')) {
    under = 'EXPENSE';
  } else {
    under = 'ASSETS';
  }
  
  return {
    id: String(g.GroupID),
    name: g.GroupName,
    under: under,
    isDefault: true
  };
});

const ledgerCodeByTradeasyId = new Map();
const ledgers = [];

for (const ld of rawData.ledgers) {
  const code = `L${String(ld.LedgerID).padStart(4, '0')}`;
  ledgerCodeByTradeasyId.set(ld.LedgerID, code);
  
  const grpName = accountGroupMap.get(ld.GroupID) || 'CURRENT ASSETS';
  const opnDr = parseFloat(ld.OpnDebit) || 0;
  const opnCr = parseFloat(ld.OpnCredit) || 0;
  
  let balance = 0;
  let balanceType = 'Debit';
  if (opnDr > 0) {
    balance = opnDr;
    balanceType = 'Debit';
  } else if (opnCr > 0) {
    balance = opnCr;
    balanceType = 'Credit';
  } else {
    const gUpper = grpName.toUpperCase();
    if (gUpper.includes('LIABILIT') || gUpper.includes('CREDITOR') || gUpper.includes('CAPITAL') || gUpper.includes('DUTIES') || gUpper.includes('INCOME') || gUpper.includes('SALES')) {
      balanceType = 'Credit';
    } else {
      balanceType = 'Debit';
    }
  }
  
  ledgers.push({
    code: code,
    tradeasyId: ld.LedgerID,
    name: ld.LedgerName,
    groupName: grpName,
    openingBalance: balance,
    balanceType: balanceType
  });
}

console.log(`Generated ${accountGroups.length} account groups and ${ledgers.length} ledgers.`);

// Transform Sales and Purchases
console.log('Transforming Sales Invoices and Purchases...');

const salesDetailsByBill = new Map();
for (const sd of rawData.salesDetails) {
  const bno = sd.BillNo;
  if (!salesDetailsByBill.has(bno)) salesDetailsByBill.set(bno, []);
  salesDetailsByBill.get(bno).push(sd);
}

const invoices = [];
const invoiceByBillNo = new Map();
let b2cIndex = 1;
let b2bIndex = 1;

for (const sm of rawData.salesMaster) {
  const billNo = sm.BillNo;
  const details = salesDetailsByBill.get(billNo) || [];
  
  const isB2B = sm.BTYPE === 'B2B' || sm.SERIESID === 4;
  let seriesId = 'SER-LOCAL-SALES';
  let voucherNo = '';
  
  if (isB2B) {
    seriesId = 'SER-B2B-SALES';
    voucherNo = `B2B00${b2bIndex++}`;
  } else {
    seriesId = 'SER-LOCAL-SALES';
    voucherNo = `LSL-${String(b2cIndex++).padStart(4, '0')}`;
  }

  const custContactId = contactIdByLedgerId.get(sm.LedgerID) || `CUST-${String(sm.LedgerID).padStart(4, '0')}`;
  
  const items = details.map(d => {
    const matInfo = productToMaterialMap.get(d.ProductID) || {
      materialId: `MAT-${String(d.ProductID).padStart(4, '0')}`,
      materialName: `Product ${d.ProductID}`,
      materialCode: '',
      batchNo: 'Standard',
      unit: d.UNIT || 'Nos',
      hsn: d.HSN || ''
    };
    const prodRec = allProductsMap.get(d.ProductID);
    const itemCode = matInfo.materialCode || (prodRec ? prodRec.ProductCode : '') || '';
    
    const qty = parseFloat(d.Qty) || 0;
    const rate = parseFloat(d.UP) || (qty > 0 ? parseFloat(d.Rate) / qty : 0);
    const amount = parseFloat(d.Rate) || (qty * rate);
    const taxPer = parseFloat(d.TaxPer) || (parseFloat(d.CGSTPER || 0) + parseFloat(d.SGSTPER || 0) + parseFloat(d.IGSTPER || 0));
    
    const cgstAmt = parseFloat(d.CGST) || 0;
    const sgstAmt = parseFloat(d.SGST) || 0;
    const igstAmt = parseFloat(d.IGST) || 0;
    const totGstAmt = cgstAmt + sgstAmt + igstAmt;

    return {
      materialId: matInfo.materialId,
      name: matInfo.materialName,
      code: itemCode,
      model: itemCode,
      batchNo: matInfo.batchNo,
      quantity: qty,
      unit: d.UNIT || matInfo.unit,
      price: rate,
      amount: amount,
      netValue: amount,
      taxRate: taxPer,
      gstPercent: taxPer,
      gstAmount: totGstAmt,
      cessPercent: parseFloat(d.CESSPER) || 0,
      netAmount: amount + totGstAmt,
      hsn: d.HSN || matInfo.hsn,
      cgst: cgstAmt,
      sgst: sgstAmt,
      igst: igstAmt
    };
  });
  
  const netAmt = parseFloat(sm.NetAmt) || 0;
  const taxAmt = parseFloat(sm.TaxAmt) || (parseFloat(sm.CGST || 0) + parseFloat(sm.SGST || 0) + parseFloat(sm.IGST || 0));
  const itemsSubtotal = items.reduce((sum, it) => sum + it.amount, 0);
  const discountAmt = parseFloat(sm.DiscountAmt) || 0;
  const freight = parseFloat(sm.Freight) || 0;
  const subTotal = itemsSubtotal > 0 ? itemsSubtotal : (netAmt - taxAmt);
  const roundOff = netAmt - (subTotal + taxAmt + freight - discountAmt);
  const balance = parseFloat(sm.BALANCE) || 0;
  
  const isPaid = (balance <= 0.01 && sm.PENDING === 'N');
  
  const invObj = {
    id: String(billNo),
    billNo: billNo,
    voucherNo: voucherNo,
    seriesId: seriesId,
    refNo: String(sm.REFNO || billNo),
    date: sm.BillDate,
    dueDate: sm.BillDate,
    contactId: custContactId,
    customerId: custContactId,
    contactName: sm.RefName || `Customer ${sm.LedgerID}`,
    customerName: sm.RefName || `Customer ${sm.LedgerID}`,
    ledgerId: sm.LedgerID,
    items: items,
    subtotal: subTotal,
    taxRate: items.length > 0 ? items[0].taxRate : 18,
    taxAmount: taxAmt,
    cgst: parseFloat(sm.CGST) || 0,
    sgst: parseFloat(sm.SGST) || 0,
    igst: parseFloat(sm.IGST) || 0,
    shipping: freight,
    discount: discountAmt,
    roundOff: roundOff,
    total: netAmt,
    paidAmount: isPaid ? netAmt : (netAmt - balance),
    status: isPaid ? 'paid' : (balance < netAmt && balance > 0 ? 'partial' : 'unpaid'),
    cancelFlag: sm.CancelFlag === true || sm.CancelFlag === -1,
    payMode: sm.Paymode || 'Credit',
    paymode: sm.Paymode || 'Credit'
  };
  invoices.push(invObj);
  invoiceByBillNo.set(billNo, invObj);
}

const purchaseDetailsByPur = new Map();
for (const pd of rawData.purchaseDetails) {
  const pno = pd.PurchaseNo;
  if (!purchaseDetailsByPur.has(pno)) purchaseDetailsByPur.set(pno, []);
  purchaseDetailsByPur.get(pno).push(pd);
}

const purchases = [];
const purchaseByPurNo = new Map();

for (const pm of rawData.purchaseMaster) {
  const purNo = pm.PurchaseNo;
  const details = purchaseDetailsByPur.get(purNo) || [];
  
  const supplierContactId = contactIdByLedgerId.get(pm.LedgerID) || `VEND-${String(pm.LedgerID).padStart(4, '0')}`;
  
  const items = details.map(d => {
    const matInfo = productToMaterialMap.get(d.ProductID) || {
      materialId: `MAT-${String(d.ProductID).padStart(4, '0')}`,
      materialName: `Product ${d.ProductID}`,
      materialCode: '',
      batchNo: 'Standard',
      unit: d.Unit || 'Nos',
      hsn: ''
    };
    const prodRec = allProductsMap.get(d.ProductID);
    const itemCode = matInfo.materialCode || (prodRec ? prodRec.ProductCode : '') || '';
    
    const qty = parseFloat(d.Qty) || 0;
    const rate = parseFloat(d.UPEX) || (qty > 0 ? parseFloat(d.Rate) / qty : 0);
    const amount = parseFloat(d.Rate) || (qty * rate);
    const taxPer = parseFloat(d.TaxPer) || (parseFloat(d.CGSTPER || 0) + parseFloat(d.SGSTPER || 0) + parseFloat(d.IGSTPER || 0));
    
    const cgstAmt = parseFloat(d.CGST) || 0;
    const sgstAmt = parseFloat(d.SGST) || 0;
    const igstAmt = parseFloat(d.IGST) || 0;
    const totGstAmt = cgstAmt + sgstAmt + igstAmt;

    return {
      materialId: matInfo.materialId,
      name: matInfo.materialName,
      code: itemCode,
      model: itemCode,
      batchNo: matInfo.batchNo,
      quantity: qty,
      unit: d.Unit || matInfo.unit,
      price: rate,
      landingCost: parseFloat(d.LandingCost) || rate,
      amount: amount,
      netValue: amount,
      taxRate: taxPer,
      gstPercent: taxPer,
      gstAmount: totGstAmt,
      cessPercent: parseFloat(d.CESSPER) || 0,
      netAmount: amount + totGstAmt,
      cgst: cgstAmt,
      sgst: sgstAmt,
      igst: igstAmt
    };
  });
  
  const netAmt = parseFloat(pm.NetAmt) || 0;
  const taxAmt = parseFloat(pm.TaxAmt) || (parseFloat(pm.CGST || 0) + parseFloat(pm.SGST || 0) + parseFloat(pm.IGST || 0));
  const itemsSubtotal = items.reduce((sum, it) => sum + it.amount, 0);
  const discountAmt = parseFloat(pm.DiscountAmt) || 0;
  const freight = parseFloat(pm.Freight) || 0;
  const subTotal = itemsSubtotal > 0 ? itemsSubtotal : (netAmt - taxAmt);
  const roundOff = netAmt - (subTotal + taxAmt + freight - discountAmt);
  const balance = parseFloat(pm.BALANCE) || 0;
  const isPaid = (balance <= 0.01 && pm.PENDING === 'N');
  
  const purObj = {
    id: String(purNo),
    purchaseNo: purNo,
    voucherNo: `LPR-${String(purNo).padStart(4, '0')}`,
    seriesId: 'SER-LOCAL-PURCHASE',
    refNo: String(pm.InvoiceNo || pm.REF_NO || purNo),
    invoiceNo: pm.InvoiceNo || '',
    invoiceDate: pm.InvoiceDate || pm.PurchaseDate,
    date: pm.PurchaseDate,
    supplierId: supplierContactId,
    contactId: supplierContactId,
    supplierName: pm.RefName || `Supplier ${pm.LedgerID}`,
    contactName: pm.RefName || `Supplier ${pm.LedgerID}`,
    ledgerId: pm.LedgerID,
    items: items,
    subtotal: subTotal,
    taxRate: items.length > 0 ? items[0].taxRate : 18,
    taxAmount: taxAmt,
    cgst: parseFloat(pm.CGST) || 0,
    sgst: parseFloat(pm.SGST) || 0,
    igst: parseFloat(pm.IGST) || 0,
    shipping: freight,
    discount: discountAmt,
    roundOff: roundOff,
    total: netAmt,
    paidAmount: isPaid ? netAmt : (netAmt - balance),
    status: isPaid ? 'paid' : 'unpaid',
    cancelFlag: pm.CancelFlag === true || pm.CancelFlag === -1,
    payMode: pm.PayMode || 'Credit',
    paymode: pm.PayMode || 'Credit',
    narration: pm.NARRATION || ''
  };
  purchases.push(purObj);
  purchaseByPurNo.set(purNo, purObj);
}

console.log(`Generated ${invoices.length} Invoices (${b2bIndex - 1} B2B, ${b2cIndex - 1} B2C) and ${purchases.length} Purchases.`);

// Transform Accounting Vouchers into Transactions
console.log('Transforming Vouchers into transactions...');

const vouchersById = new Map();
for (const av of rawData.accountVouchers) {
  const vid = av.VoucherID;
  if (!vouchersById.has(vid)) vouchersById.set(vid, []);
  vouchersById.get(vid).push(av);
}

const transactions = [];
let txSeq = 1;

for (const [vid, entries] of vouchersById.entries()) {
  if (!entries || entries.length === 0) continue;
  
  const first = entries[0];
  const vType = first.VoucherType || 'JV';
  const vNo = first.VoucherNo || String(vid);
  const vDate = first.VoucherDate;
  const isCanceled = first.CancelFlag === true || first.CancelFlag === -1;
  
  if (isCanceled) continue;
  
  let reference = '';
  let description = first.Narration || `${vType} Voucher ${vNo}`;

  if (vType === 'SALE') {
    const matchingInv = invoiceByBillNo.get(Number(vNo));
    reference = matchingInv ? matchingInv.voucherNo : `LSL-${String(vNo).padStart(4, '0')}`;
    if (matchingInv && matchingInv.contactName) {
      description = `Sales Invoice ${reference} to ${matchingInv.contactName}`;
    }
  } else if (vType === 'PUR') {
    const matchingPur = purchaseByPurNo.get(Number(vNo));
    reference = matchingPur ? matchingPur.voucherNo : `LPR-${String(vNo).padStart(4, '0')}`;
    if (matchingPur && matchingPur.supplierName) {
      description = `Purchase Invoice ${reference} from ${matchingPur.supplierName}`;
    }
  } else if (vType === 'REC') {
    reference = `RC-${vNo}`;
  } else if (vType === 'PAY') {
    reference = `PAY-${vNo}`;
  } else if (vType === 'CON') {
    reference = `CNTR-${vNo}`;
  } else {
    reference = `JV-${vNo}`;
  }
  
  const txEntries = entries.map(e => {
    const lCode = ledgerCodeByTradeasyId.get(e.LedgerID) || `L${String(e.LedgerID).padStart(4, '0')}`;
    return {
      accountId: lCode,
      ledgerId: e.LedgerID,
      debit: parseFloat(e.Debit) || 0,
      credit: parseFloat(e.Credit) || 0,
      narration: e.Narration || ''
    };
  });
  
  transactions.push({
    id: `TX-${String(txSeq++).padStart(5, '0')}`,
    voucherId: vid,
    voucherNo: vNo,
    voucherType: vType,
    date: vDate,
    reference: reference,
    description: description,
    entries: txEntries
  });
}

console.log(`Generated ${transactions.length} journal transactions.`);

// Step 8: Build complete company JSON payload
const companyDataPayload = {
  materials: materials,
  contacts: contacts,
  invoices: invoices,
  purchases: purchases,
  transactions: transactions,
  salesReturns: [],
  purchaseReturns: [],
  conversions: [],
  stockAdjustments: [],
  productGroups: rawData.productGroups.map(g => g.ProdgroupName),
  companies: rawData.brands.map(b => b.CompanyName),
  categories: rawData.categories.map(c => c.CategoryName),
  subCategories: rawData.subCategories.map(s => s.SubCategoryName),
  productNames: Array.from(new Set(materials.map(m => m.name))),
  adminPassword: "123",
  accountGroups: accountGroups,
  ledgers: ledgers,
  salesAdjustments: [
    { name: "FREIGHT", ledgerCode: "L0030" },
    { name: "LOADING CHARGE", ledgerCode: "L0032" },
    { name: "UNLOADING CHARGE AT SITE", ledgerCode: "L0033" }
  ],
  purchaseAdjustments: [
    { name: "FREIGHT", ledgerCode: "L0031" },
    { name: "UNLOADING CHARGE", ledgerCode: "L0033" }
  ],
  units: rawData.units.map(u => ({
    id: String(u.UnitID),
    category: "COUNT",
    name: u.Unit || u.Symbol,
    symbol: u.Symbol || u.Unit,
    altNameInBill: u.Unit || u.Symbol,
    conversionValue: 1,
    conversionUnit: u.Symbol || u.Unit,
    printNameInsteadOfSymbol: false
  })),
  options: {
    enableEmployeeSales: true,
    enableInfluencerSales: true,
    enableCess: true,
    enable4DigitHsn: true,
    enableCessInSalesBill: false,
    influencerLoyaltyRate: 1
  },
  influencers: [],
  influencerRedemptions: [],
  loyaltyPrograms: [],
  hsnCodes: Array.from(new Set(materials.map(m => m.hsnCode).filter(Boolean))),
  hsnDescriptions: {},
  seriesMaster: [
    {
      id: "SER-LOCAL-SALES",
      txType: "Sales",
      seriesType: "LOCAL",
      name: "Local Sales (B2C)",
      prefix: "LSL-",
      digits: 4,
      startingNumber: 1,
      currentNumber: b2cIndex,
      ledgerCode: "L0004",
      isActive: true
    },
    {
      id: "SER-B2B-SALES",
      txType: "Sales",
      seriesType: "LOCAL",
      name: "Local Sales (B2B)",
      prefix: "B2B00",
      digits: 1,
      startingNumber: 1,
      currentNumber: b2bIndex,
      ledgerCode: "L0004",
      isActive: true
    },
    {
      id: "SER-IGST-SALES",
      txType: "Sales",
      seriesType: "INTERSTATE",
      name: "IGST Sales",
      prefix: "ISL-",
      digits: 4,
      startingNumber: 1,
      currentNumber: 1,
      ledgerCode: "L0004",
      isActive: false
    },
    {
      id: "SER-NONTAXABLE-SALES",
      txType: "Sales",
      seriesType: "NONTAXABLE",
      name: "Non Taxable Sales",
      prefix: "NSL-",
      digits: 4,
      startingNumber: 1,
      currentNumber: 1,
      ledgerCode: "L0004",
      isActive: false
    },
    {
      id: "SER-LOCAL-PURCHASE",
      txType: "Purchase",
      seriesType: "LOCAL",
      name: "Local Purchase (CGST+SGST)",
      prefix: "LPR-",
      digits: 4,
      startingNumber: 1,
      currentNumber: purchases.length + 1,
      ledgerCode: "L0005",
      isActive: true
    },
    {
      id: "SER-IGST-PURCHASE",
      txType: "Purchase",
      seriesType: "INTERSTATE",
      name: "IGST Purchase",
      prefix: "IPR-",
      digits: 4,
      startingNumber: 1,
      currentNumber: 1,
      ledgerCode: "L0005",
      isActive: false
    },
    {
      id: "SER-NONTAXABLE-PURCHASE",
      txType: "Purchase",
      seriesType: "NONTAXABLE",
      name: "Non Taxable Purchase",
      prefix: "NPR-",
      digits: 4,
      startingNumber: 1,
      currentNumber: 1,
      ledgerCode: "L0005",
      isActive: false
    }
  ],
  gstMaster: []
};

const targetDataFile = path.join(METRO_DIR, 'METRO AGENCIES - Current F.Y.json');
fs.writeFileSync(targetDataFile, JSON.stringify(companyDataPayload, null, 2), 'utf8');
console.log(`Successfully wrote ${targetDataFile} (Size: ${(fs.statSync(targetDataFile).size / 1024 / 1024).toFixed(2)} MB)`);

// Step 9: Update companies.json
const companiesJsonPath = path.join(DATA_DIR, 'companies.json');
let companiesList = [];
if (fs.existsSync(companiesJsonPath)) {
  try {
    companiesList = JSON.parse(fs.readFileSync(companiesJsonPath, 'utf8'));
  } catch (e) {
    companiesList = [];
  }
}

const cInfo = rawData.companyInfo[0] || {};
const metroCompanyObj = {
  id: "1",
  name: "METRO AGENCIES",
  subName: cInfo.SubName || "",
  address: cInfo.Address || "POKKUNDU\nKURUMATHUR\nKANNUR - 670142",
  country: cInfo.Country || "INDIA",
  state: "KERALA",
  phone: cInfo.Phone || "",
  mobile: cInfo.Phone2 || "9020877748",
  email: cInfo.Email || "",
  dlNo: cInfo.DL1 || "",
  pincode: cInfo.Pin || "670142",
  website: cInfo.Web || "http://",
  currencyName: cInfo.Currency || "Rupees",
  financialYearStarts: "2026-04-01",
  financialYearEnds: "2027-03-31",
  maintain: "Inventory with Accounts",
  taxApplicable: cInfo.TAXTYPE || "GST(Goods and Service TAX)",
  gstin: cInfo.GSTIN || "32AFUPH3623R1ZX",
  fssaiLicNo: cInfo.FSSAI || "",
  username: "admin",
  password: "123",
  users: [
    {
      id: "USR-1",
      username: "admin",
      password: "123",
      fullName: "Administrator",
      role: "Admin",
      status: "Active"
    }
  ],
  financialYears: [
    {
      id: "default",
      name: "Current F.Y",
      startDate: "2026-04-01",
      endDate: "2027-03-31"
    }
  ],
  district: "Kannur"
};

const existingIndex = companiesList.findIndex(c => c.name === "METRO AGENCIES" || c.id === "1");
if (existingIndex !== -1) {
  companiesList[existingIndex] = metroCompanyObj;
} else {
  companiesList.push(metroCompanyObj);
}

fs.writeFileSync(companiesJsonPath, JSON.stringify(companiesList, null, 2), 'utf8');
console.log(`Successfully updated ${companiesJsonPath}`);

console.log('--- DATA MIGRATION COMPLETE ---');
