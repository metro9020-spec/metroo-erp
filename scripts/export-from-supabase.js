import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, "..", "BACKUP_FROM_SUPABASE");

const SUPABASE_URL = "https://svmxlwjsnpgflshzbmxd.supabase.co";
const SUPABASE_KEY = "sb_publishable_bt2brQhItcT3Y8JAFgBMUQ_SC52Eo2F";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`
};

async function fetchAllPaginated(table) {
  let all = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        ...headers,
        "Range": `${from}-${from + step - 1}`
      }
    });
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < step) break;
    from += step;
  }
  return all;
}

async function exportDatabase() {
  console.log("=================================================");
  console.log("📥 EXPORTING FULL SUPABASE DATABASE TO JSON FILES");
  console.log("=================================================");

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 1. Fetch Companies
  const companies = await fetchAllPaginated("companies");
  console.log(`🏢 Downloaded ${companies.length} companies`);

  const formattedCompanies = companies.map(c => c.raw_data || c);
  fs.writeFileSync(path.join(BACKUP_DIR, "companies.json"), JSON.stringify(formattedCompanies, null, 2), "utf8");

  // 2. Fetch all collections per company
  for (const company of companies) {
    const compId = company.id;
    const compName = company.name || `Company_${compId}`;
    const compFolder = path.join(BACKUP_DIR, compName);
    if (!fs.existsSync(compFolder)) {
      fs.mkdirSync(compFolder, { recursive: true });
    }

    console.log(`\n📄 Exporting data for company: ${compName} (ID: ${compId})...`);

    const fetchCompanyTable = async (table) => {
      let all = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?company_id=eq.${compId}&select=*`, {
          headers: {
            ...headers,
            "Range": `${from}-${from + step - 1}`
          }
        });
        if (!res.ok) break;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        all = all.concat(data);
        if (data.length < step) break;
        from += step;
      }
      return all.map(r => r.raw_data || r);
    };

    const [materials, contacts, invoices, purchases, salesOrders, salesReturns, purchaseReturns, transactions, ledgers] = await Promise.all([
      fetchCompanyTable("materials"),
      fetchCompanyTable("contacts"),
      fetchCompanyTable("invoices"),
      fetchCompanyTable("purchases"),
      fetchCompanyTable("sales_orders"),
      fetchCompanyTable("sales_returns"),
      fetchCompanyTable("purchase_returns"),
      fetchCompanyTable("transactions"),
      fetchCompanyTable("ledgers")
    ]);

    const companyDataObj = {
      _lastSaved: Date.now(),
      company: company.raw_data || company,
      materials,
      contacts,
      invoices,
      purchases,
      salesOrders,
      salesReturns,
      purchaseReturns,
      transactions,
      ledgers
    };

    const targetJsonFile = path.join(compFolder, `${compName} - Current F.Y.json`);
    fs.writeFileSync(targetJsonFile, JSON.stringify(companyDataObj, null, 2), "utf8");

    console.log(`✅ Saved ${compName} data file with:`);
    console.log(`   - ${materials.length} Materials`);
    console.log(`   - ${contacts.length} Contacts`);
    console.log(`   - ${invoices.length} Invoices`);
    console.log(`   - ${purchases.length} Purchases`);
    console.log(`   - ${transactions.length} Transactions`);
    console.log(`   - ${ledgers.length} Ledgers`);
  }

  console.log("\n🎉 EXPORT COMPLETE! All JSON files downloaded to:");
  console.log(`📁 ${BACKUP_DIR}`);
}

exportDatabase().catch(err => {
  console.error("❌ Export failed:", err);
});
