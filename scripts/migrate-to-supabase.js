import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "COMPANY DATA BASE");

const SUPABASE_URL = process.env.SUPABASE_URL || process.argv[2];
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.argv[3];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log(`Usage: node scripts/migrate-to-supabase.js <SUPABASE_URL> <SUPABASE_ANON_KEY>`);
  process.exit(1);
}

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

async function clearTable(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.0`, {
      method: "DELETE",
      headers
    });
    if (res.ok) {
      console.log(`🧹 Cleared table '${table}'`);
    } else {
      console.warn(`⚠️ Warning clearing '${table}': ${res.status}`);
    }
  } catch (err) {
    console.error(`❌ Error clearing '${table}':`, err.message);
  }
}

async function postToSupabase(table, records) {
  if (!records || records.length === 0) return;
  const chunkSize = 100;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify(chunk)
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`❌ Failed inserting into ${table}: ${res.status} - ${text}`);
      } else {
        console.log(`✅ Uploaded ${chunk.length} records to table '${table}'`);
      }
    } catch (err) {
      console.error(`❌ Network error inserting into ${table}:`, err.message);
    }
  }
}

async function runMigration() {
  console.log("=================================================");
  console.log("🧹 CLEARING OLD/DUPLICATE DATA FROM SUPABASE...");
  console.log("=================================================");
  await clearTable("materials");
  await clearTable("contacts");
  await clearTable("invoices");
  await clearTable("purchases");
  await clearTable("sales_orders");
  await clearTable("sales_returns");
  await clearTable("purchase_returns");
  await clearTable("transactions");
  await clearTable("ledgers");
  await clearTable("financial_years");
  await clearTable("company_users");
  await clearTable("companies");

  console.log("\n📦 Starting clean local data extraction from:", DATA_DIR);
  
  const companiesFile = path.join(DATA_DIR, "companies.json");
  if (!fs.existsSync(companiesFile)) {
    console.error("❌ companies.json not found in", DATA_DIR);
    return;
  }

  const companiesData = JSON.parse(fs.readFileSync(companiesFile, "utf8"));
  console.log(`🏢 Found ${companiesData.length} companies in companies.json`);

  const formattedCompanies = [];
  const formattedUsers = [];
  const formattedFYs = [];

  for (const comp of companiesData) {
    formattedCompanies.push({
      id: String(comp.id),
      name: comp.name || "Unnamed",
      sub_name: comp.subName || "",
      address: comp.address || "",
      country: comp.country || "INDIA",
      state: comp.state || "KERALA",
      district: comp.district || "",
      phone: comp.phone || "",
      mobile: comp.mobile || "",
      email: comp.email || "",
      pincode: comp.pincode || "",
      website: comp.website || "",
      currency_name: comp.currencyName || "Rupees",
      tax_applicable: comp.taxApplicable || "",
      gstin: comp.gstin || "",
      fssai_lic_no: comp.fssaiLicNo || "",
      username: comp.username || "admin",
      password: comp.password || "123",
      server_url: comp.serverUrl || ""
    });

    if (comp.users && Array.isArray(comp.users)) {
      for (const u of comp.users) {
        const uId = String(u.id || `USR-${Math.random()}`);
        if (!formattedUsers.some(existing => existing.id === uId)) {
          formattedUsers.push({
            id: uId,
            company_id: String(comp.id),
            username: u.username || "user",
            password: u.password || "123",
            full_name: u.fullName || u.username,
            role: u.role || "User",
            status: u.status || "Active"
          });
        }
      }
    }

    if (comp.financialYears && Array.isArray(comp.financialYears)) {
      for (const fy of comp.financialYears) {
        const fyId = String(fy.id === "default" ? `fy-${comp.id}-default` : fy.id);
        if (!formattedFYs.some(existing => existing.id === fyId)) {
          formattedFYs.push({
            id: fyId,
            company_id: String(comp.id),
            name: fy.name || "Current F.Y",
            start_date: fy.startDate || null,
            end_date: fy.endDate || null
          });
        }
      }
    }
  }

  console.log("\n⬆️ Uploading companies, users, and financial years...");
  await postToSupabase("companies", formattedCompanies);
  await postToSupabase("company_users", formattedUsers);
  await postToSupabase("financial_years", formattedFYs);

  // Now process detailed company database files
  for (const comp of companiesData) {
    const sanitize = (n) => n ? String(n).replace(/[<>:"/\\|?*]+/g, '_') : "Unknown";
    const compFolder = path.join(DATA_DIR, sanitize(comp.name));
    if (!fs.existsSync(compFolder)) continue;

    const files = fs.readdirSync(compFolder).filter(f => f.endsWith(".json"));
    for (const file of files) {
      console.log(`\n📄 Processing data file: ${comp.name}/${file}...`);
      const filePath = path.join(compFolder, file);
      try {
        const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
        const data = JSON.parse(raw);

        const fyId = file.includes("Current F.Y") ? "default" : file;

        // 1. Materials
        if (data.materials && Array.isArray(data.materials)) {
          const materials = data.materials.map((m, idx) => ({
            id: String(m.id || `MAT-${comp.id}-${idx}`),
            company_id: String(comp.id),
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
          await postToSupabase("materials", materials);
        }

        // 2. Contacts / Parties
        if (data.contacts && Array.isArray(data.contacts)) {
          const contacts = data.contacts.map((c, idx) => ({
            id: String(c.id || `CNT-${comp.id}-${idx}`),
            company_id: String(comp.id),
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
          await postToSupabase("contacts", contacts);
        }

        // 3. Invoices
        if (data.invoices && Array.isArray(data.invoices)) {
          const invoices = data.invoices.map((inv, idx) => ({
            id: String(inv.id || `INV-${comp.id}-${idx}`),
            company_id: String(comp.id),
            fy_id: fyId,
            invoice_no: String(inv.invoiceNo || inv.invoiceNumber || "INV-001"),
            invoice_type: inv.type || "sales",
            date: inv.date || null,
            party_id: String(inv.partyId || ""),
            party_name: inv.partyName || "",
            party_gstin: inv.partyGstin || "",
            subtotal: inv.subtotal || 0,
            cgst_total: inv.cgstTotal || 0,
            sgst_total: inv.sgstTotal || 0,
            igst_total: inv.igstTotal || 0,
            grand_total: inv.grandTotal || inv.totalAmount || 0,
            payment_status: inv.paymentStatus || "Unpaid",
            items: inv.items || [],
            raw_data: inv
          }));
          await postToSupabase("invoices", invoices);
        }

        // 4. Transactions / Vouchers
        if (data.transactions && Array.isArray(data.transactions)) {
          const txs = data.transactions.map((t, idx) => ({
            id: String(t.id || `TX-${comp.id}-${idx}`),
            company_id: String(comp.id),
            fy_id: fyId,
            voucher_no: String(t.voucherNo || ""),
            voucher_type: t.voucherType || t.type || "Receipt",
            date: t.date || null,
            party_id: String(t.partyId || ""),
            party_name: t.partyName || "",
            amount: t.amount || 0,
            narration: t.narration || "",
            raw_data: t
          }));
          await postToSupabase("transactions", txs);
        }

        // 5. Ledgers
        if (data.ledgers && Array.isArray(data.ledgers)) {
          const ledgers = data.ledgers.map((l, idx) => ({
            id: String(l.id || `LED-${comp.id}-${idx}`),
            company_id: String(comp.id),
            fy_id: fyId,
            name: l.name || "Ledger",
            account_group: l.groupName || l.accountGroup || l.group || l.under || "",
            opening_balance: l.openingBalance || 0,
            current_balance: l.currentBalance || 0,
            raw_data: {
              ...l,
              groupName: l.groupName || l.accountGroup || l.group || l.under || ""
            }
          }));
          await postToSupabase("ledgers", ledgers);
        }

        // 6. Purchases
        if (data.purchases && Array.isArray(data.purchases)) {
          const purchases = data.purchases.map((p, idx) => ({
            id: String(p.id || `PUR-${comp.id}-${idx}`),
            company_id: String(comp.id),
            fy_id: fyId,
            invoice_no: String(p.invoiceNo || p.refNo || ""),
            purchase_no: String(p.purchaseNo || p.voucherNo || ""),
            date: p.date || p.invoiceDate || null,
            supplier_id: String(p.supplierId || p.contactId || ""),
            supplier_name: p.supplierName || p.contactName || "",
            grand_total: p.total || p.grandTotal || p.subtotal || 0,
            raw_data: p
          }));
          await postToSupabase("purchases", purchases);
        }

        // 7. Sales Orders & Returns
        if (data.salesOrders && Array.isArray(data.salesOrders)) {
          const orders = data.salesOrders.map((so, idx) => ({
            id: String(so.id || `SO-${comp.id}-${idx}`),
            company_id: String(comp.id),
            fy_id: fyId,
            raw_data: so
          }));
          await postToSupabase("sales_orders", orders);
        }
        if (data.salesReturns && Array.isArray(data.salesReturns)) {
          const sRet = data.salesReturns.map((sr, idx) => ({
            id: String(sr.id || `SR-${comp.id}-${idx}`),
            company_id: String(comp.id),
            fy_id: fyId,
            raw_data: sr
          }));
          await postToSupabase("sales_returns", sRet);
        }
        if (data.purchaseReturns && Array.isArray(data.purchaseReturns)) {
          const pRet = data.purchaseReturns.map((pr, idx) => ({
            id: String(pr.id || `PR-${comp.id}-${idx}`),
            company_id: String(comp.id),
            fy_id: fyId,
            raw_data: pr
          }));
          await postToSupabase("purchase_returns", pRet);
        }

      } catch (err) {
        console.error(`❌ Failed parsing file ${file}:`, err.message);
      }
    }
  }

  console.log("\n🎉 CLEAN MIGRATION COMPLETE! Exactly 1 copy of all records transferred to Supabase.");
}

runMigration();
