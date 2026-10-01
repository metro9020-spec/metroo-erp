import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = "https://svmxlwjsnpgflshzbmxd.supabase.co";
const sbHeaders = {
  "apikey": "sb_publishable_bt2brQhItcT3Y8JAFgBMUQ_SC52Eo2F",
  "Authorization": "Bearer sb_publishable_bt2brQhItcT3Y8JAFgBMUQ_SC52Eo2F",
  "Content-Type": "application/json",
  "Prefer": "resolution=merge-duplicates"
};

async function postChunk(table, items) {
  if (!items || items.length === 0) return 0;
  const chunkSize = 100;
  let pushed = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify(chunk)
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Error uploading to ${table} (chunk ${i}):`, res.status, text);
      } else {
        pushed += chunk.length;
      }
    } catch (e) {
      console.error(`Exception uploading to ${table}:`, e.message);
    }
  }
  return pushed;
}

async function main() {
  console.log("=== RE-SYNCING & VERIFYING MASTER DATABASE TO SUPABASE CLOUD ===");
  const masterPath = path.join(__dirname, "../COMPANY DATA BASE/METRO AGENCIES/METRO AGENCIES - Current F.Y.json");
  const masterData = JSON.parse(fs.readFileSync(masterPath, "utf8"));

  const companyId = "1";
  const fyId = "default";

  // 1. Map Ledgers
  const ledgersPayload = (masterData.ledgers || []).map(l => ({
    id: String(l.code || l.id),
    company_id: companyId,
    fy_id: fyId,
    name: l.name || "Ledger",
    account_group: l.groupName || l.accountGroup || l.under || "",
    opening_balance: l.openingBalance || 0,
    current_balance: l.currentBalance || 0,
    raw_data: {
      ...l,
      groupName: l.groupName || l.accountGroup || l.under || ""
    }
  }));

  // 2. Map Contacts
  const contactsPayload = (masterData.contacts || []).map(c => ({
    id: String(c.id),
    company_id: companyId,
    fy_id: fyId,
    name: c.name || "Contact",
    type: c.type || "Customer",
    phone: c.phone || "",
    mobile: c.mobile || "",
    email: c.email || "",
    address: c.address || "",
    gstin: c.gstin || "",
    opening_balance: c.openingBalance || 0,
    current_balance: c.currentBalance || 0,
    raw_data: c
  }));

  // 3. Map Invoices
  const invoicesPayload = (masterData.invoices || []).map(inv => ({
    id: String(inv.id),
    company_id: companyId,
    fy_id: fyId,
    invoice_no: String(inv.invoiceNo || inv.voucherNo || inv.id || ""),
    invoice_type: inv.type || "sales",
    date: inv.date || null,
    party_id: String(inv.contactId || inv.partyId || ""),
    party_name: inv.contactName || inv.partyName || "",
    party_gstin: inv.partyGstin || inv.gstin || "",
    subtotal: inv.subtotal || 0,
    cgst_total: inv.cgstTotal || 0,
    sgst_total: inv.sgstTotal || 0,
    igst_total: inv.igstTotal || 0,
    grand_total: inv.total || inv.grandTotal || 0,
    payment_status: inv.status || inv.paymentStatus || "Unpaid",
    items: inv.items || [],
    raw_data: inv
  }));

  // 4. Map Transactions
  const transactionsPayload = (masterData.transactions || []).map(t => ({
    id: String(t.id),
    company_id: companyId,
    fy_id: fyId,
    voucher_no: String(t.voucherNo || t.reference || t.id || ""),
    voucher_type: t.voucherType || t.type || "Journal",
    date: t.date || null,
    party_id: String(t.partyId || t.contactId || ""),
    party_name: t.partyName || t.contactName || "",
    amount: t.amount || t.total || 0,
    narration: t.narration || "",
    raw_data: t
  }));

  // 5. Map Materials
  const materialsPayload = (masterData.materials || []).map(m => ({
    id: String(m.id),
    company_id: companyId,
    fy_id: fyId,
    name: m.name || "Material",
    code: m.code || "",
    category: m.category || "",
    sub_category: m.subCategory || "",
    product_group: m.productGroup || "",
    company_name: m.company || "",
    unit: m.unit || "Pcs",
    hsn_code: m.hsnCode || "",
    cgst: m.cgst || 0,
    sgst: m.sgst || 0,
    igst: m.igst || 0,
    cess: m.cess || 0,
    opening_stock: m.openingStock || 0,
    stock: m.stock || 0,
    cost_price: m.costPrice || 0,
    selling_price: m.sellingPrice || 0,
    mrp: m.mrp || 0,
    raw_data: m
  }));

  // 6. Map Purchases
  const purchasesPayload = (masterData.purchases || []).map(p => ({
    id: String(p.id),
    company_id: companyId,
    fy_id: fyId,
    invoice_no: String(p.invoiceNo || p.refNo || ""),
    purchase_no: String(p.purchaseNo || p.voucherNo || p.id || ""),
    date: p.date || p.invoiceDate || null,
    supplier_id: String(p.supplierId || p.contactId || ""),
    supplier_name: p.supplierName || p.contactName || "",
    grand_total: p.total || p.grandTotal || p.subtotal || 0,
    raw_data: p
  }));

  // Push to Supabase Cloud
  console.log(`Pushing ${ledgersPayload.length} ledgers...`);
  const pushedLedgers = await postChunk("ledgers", ledgersPayload);

  console.log(`Pushing ${contactsPayload.length} contacts...`);
  const pushedContacts = await postChunk("contacts", contactsPayload);

  console.log(`Pushing ${invoicesPayload.length} invoices...`);
  const pushedInvoices = await postChunk("invoices", invoicesPayload);

  console.log(`Pushing ${transactionsPayload.length} transactions...`);
  const pushedTx = await postChunk("transactions", transactionsPayload);

  console.log(`Pushing ${materialsPayload.length} materials...`);
  const pushedMat = await postChunk("materials", materialsPayload);

  console.log(`Pushing ${purchasesPayload.length} purchases...`);
  const pushedPur = await postChunk("purchases", purchasesPayload);

  console.log("\n=== SUPABASE RE-SYNC SUMMARY ===");
  console.log(`✓ Ledgers Pushed: ${pushedLedgers} / ${ledgersPayload.length}`);
  console.log(`✓ Contacts Pushed: ${pushedContacts} / ${contactsPayload.length}`);
  console.log(`✓ Invoices Pushed: ${pushedInvoices} / ${invoicesPayload.length}`);
  console.log(`✓ Transactions Pushed: ${pushedTx} / ${transactionsPayload.length}`);
  console.log(`✓ Materials Pushed: ${pushedMat} / ${materialsPayload.length}`);
  console.log(`✓ Purchases Pushed: ${pushedPur} / ${purchasesPayload.length}`);

  // Also write to public/data/1_default.json
  const publicPath = path.join(__dirname, "../public/data/1_default.json");
  fs.writeFileSync(publicPath, JSON.stringify(masterData, null, 2), "utf8");
  console.log("✓ Updated public/data/1_default.json");
}

main().catch(console.error);
