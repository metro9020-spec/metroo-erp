import { Client, Databases, Storage, Permission, Role, ID, Query } from 'node-appwrite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '6abbaed6002fd9bf3d58';
const API_KEY = 'standard_7838a375517b76a8c4ffaa61761767194ce2b223926bfd2b03d35b9fedb025813bdff2d32a5379356d40edd54b11db36010cd602d546953cca65de4a86ac7692b63d47a6ad3b3b63d25807e9e24dc583d0d986726b7af770907a1dad97929892a4fcfb12c5b62d2bdc416c2c94e198abe7574b35bec6dbdbac1098e0c1a84236';
const DATABASE_ID = 'metro_erp_db';
const STORAGE_BUCKET = 'erp_databases';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);
const storage = new Storage(client);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sanitizeId(str) {
  if (!str) return ID.unique();
  const clean = String(str).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
  return clean || ID.unique();
}

const ALL_COLLECTIONS = [
  'companies',
  'financial_years',
  'materials',
  'contacts',
  'invoices',
  'purchases',
  'transactions',
  'ledgers',
  'sales_orders',
  'sales_returns',
  'purchase_returns',
  'company_settings'
];

async function purgeCollection(colId) {
  console.log(`\n🧹 Purging collection "${colId}"...`);
  let totalDeleted = 0;
  let consecutiveFailures = 0;
  while (true) {
    try {
      const res = await db.listDocuments(DATABASE_ID, colId, [Query.limit(50)]);
      if (!res || !res.documents || res.documents.length === 0) break;

      let deletedInBatch = 0;
      for (const d of res.documents) {
        try {
          await db.deleteDocument(DATABASE_ID, colId, d.$id);
          deletedInBatch++;
          totalDeleted++;
          await sleep(50);
        } catch (e) {
          if (e.code === 404) {
            deletedInBatch++;
          } else if (e.code === 429) {
            await sleep(1500);
          } else {
            console.warn(`  Warning deleting ${d.$id}: ${e.message}`);
          }
        }
      }

      process.stdout.write(`\r  Purged: ${totalDeleted} documents from ${colId}`);
      if (deletedInBatch === 0) {
        consecutiveFailures++;
        if (consecutiveFailures > 3) break;
        await sleep(1000);
      } else {
        consecutiveFailures = 0;
      }
      await sleep(100);
    } catch (err) {
      console.error(`\n  Error querying ${colId}:`, err.message);
      consecutiveFailures++;
      if (consecutiveFailures > 3) break;
      await sleep(1500);
    }
  }
  console.log(`\n  ✅ Done purging ${colId} (Total removed: ${totalDeleted})`);
}

async function bulkInsert(collectionId, documents) {
  if (!documents || documents.length === 0) return 0;
  let count = 0;
  const batchSize = 10;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await Promise.all(batch.map(async doc => {
      try {
        const docId = doc.$id || ID.unique();
        const data = { ...doc };
        delete data.$id;
        await db.createDocument(DATABASE_ID, collectionId, docId, data);
        count++;
      } catch (err) {
        if (err.code === 409 && doc.$id) {
          try {
            const data = { ...doc };
            delete data.$id;
            await db.updateDocument(DATABASE_ID, collectionId, doc.$id, data);
            count++;
          } catch (updateErr) {
            console.warn(`  Update error in ${collectionId}:`, updateErr.message);
          }
        } else {
          console.warn(`  Insert error in ${collectionId} (doc: ${doc.$id}):`, err.message);
        }
      }
    }));
    process.stdout.write(`\r  Inserting ${collectionId}: ${Math.min(i + batchSize, documents.length)} / ${documents.length}`);
    await sleep(80);
  }
  console.log(`\n  ✅ Migrated ${count} records into "${collectionId}".`);
  return count;
}

async function runMasterCleanSync() {
  console.log("==================================================================");
  console.log("🚀 STARTING COMPLETE APPWRITE & CLOUDFLARE CLEAN RESYNC");
  console.log("==================================================================");

  // 1. Purge all Appwrite DB collections to remove any corrupt / duplicate records
  for (const colId of ALL_COLLECTIONS) {
    await purgeCollection(colId);
  }

  // 2. Read authoritative local data
  const dataDir = path.join(rootDir, 'COMPANY DATA BASE');
  const companiesPath = path.join(dataDir, 'companies.json');
  if (!fs.existsSync(companiesPath)) {
    throw new Error('COMPANY DATA BASE/companies.json does not exist!');
  }

  const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8').replace(/^\uFEFF/, ''));
  console.log(`\nFound ${companies.length} companies to migrate.`);

  // 3. Migrate Companies and FYs
  const companyDocs = [];
  const fyDocs = [];

  for (const c of companies) {
    const compId = String(c.id);
    companyDocs.push({
      $id: sanitizeId(`comp_${compId}`),
      company_id: compId,
      name: c.name || 'Unnamed Company',
      sub_name: c.subName || '',
      phone: c.phone || '',
      mobile: c.mobile || '',
      gstin: c.gstin || '',
      raw_data: JSON.stringify(c)
    });

    const fys = c.financialYears || [{ id: 'default', name: 'Current F.Y' }];
    for (const fy of fys) {
      fyDocs.push({
        $id: sanitizeId(`fy_${compId}_${fy.id || 'default'}`),
        company_id: compId,
        name: fy.name || 'Current F.Y',
        start_date: fy.startDate || '',
        end_date: fy.endDate || ''
      });
    }
  }

  await bulkInsert('companies', companyDocs);
  await bulkInsert('financial_years', fyDocs);

  // 4. Process each company's dataset
  const publicDataDir = path.join(rootDir, 'public', 'data');
  if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });

  const cleanCompaniesForPublic = companies.map(c => ({ ...c, serverUrl: '' }));
  fs.writeFileSync(path.join(publicDataDir, 'companies.json'), JSON.stringify(cleanCompaniesForPublic, null, 2), 'utf8');

  for (const c of companies) {
    const compId = String(c.id);
    const compName = c.name;
    console.log(`\n======================================================`);
    console.log(`Processing Company: "${compName}" (ID: ${compId})`);
    console.log(`======================================================`);

    const folderName = compName.replace(/[<>:"/\\|?*]+/g, '_');
    const compDir = path.join(dataDir, folderName);
    const altDir = path.join(dataDir, `company ${compId}`);
    const targetDir = fs.existsSync(compDir) ? compDir : (fs.existsSync(altDir) ? altDir : null);

    if (!targetDir) {
      console.warn(`No folder found for company ${compName}. Skipping.`);
      continue;
    }

    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json') && !f.includes('.bak'));
    for (const file of files) {
      console.log(`\nReading dataset file: ${file}`);
      const filePath = path.join(targetDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
      let data = {};
      try {
        data = JSON.parse(fileContent);
      } catch (err) {
        console.error(`Failed to parse ${file}:`, err.message);
        continue;
      }

      let fyId = 'default';
      let fyName = 'Current F.Y';
      if (file.includes(' - ')) {
        const parts = file.replace('.json', '').split(' - ');
        fyName = parts.slice(1).join(' - ');
        if (c.financialYears) {
          const found = c.financialYears.find(f => f.name === fyName);
          if (found) fyId = String(found.id);
        }
      }

      const nowTimestamp = Date.now();
      data._lastSaved = nowTimestamp;

      // Also persist timestamp back to local file so it stays authoritative
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      // Update public/data files
      const targetPublicFile = path.join(publicDataDir, `${compId}_${fyId}.json`);
      fs.writeFileSync(targetPublicFile, JSON.stringify(data), 'utf8');
      if (fyId === 'default') {
        fs.writeFileSync(path.join(publicDataDir, `${compId}.json`), JSON.stringify(data), 'utf8');
        fs.writeFileSync(path.join(publicDataDir, `${compId}_Current_F_Y.json`), JSON.stringify(data), 'utf8');
      }

      console.log(`Data Stats for ${compName} (${fyName}):`);
      console.log(`  • Materials:    ${data.materials?.length || 0}`);
      console.log(`  • Contacts:     ${data.contacts?.length || 0}`);
      console.log(`  • Invoices:     ${data.invoices?.length || 0}`);
      console.log(`  • Purchases:    ${data.purchases?.length || 0}`);
      console.log(`  • Transactions: ${data.transactions?.length || 0}`);
      console.log(`  • Ledgers:      ${data.ledgers?.length || 0}`);

      // 4a. Upload to Appwrite Storage Snapshots
      const storageTargets = [
        sanitizeId(`db_${compId}_${fyId}`),
        sanitizeId(`db_${compId}_default`),
        sanitizeId(`db_${compId}_Current_F_Y`),
        sanitizeId(`db_${compId}_fy_bkp`)
      ];

      const permissions = [
        Permission.read(Role.any()),
        Permission.write(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ];

      for (const fileId of storageTargets) {
        try {
          try {
            await storage.deleteFile(STORAGE_BUCKET, fileId);
          } catch (delErr) {}

          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          const fileObj = new File([blob], `${fileId}.json`, { type: 'application/json' });
          await storage.createFile(STORAGE_BUCKET, fileId, fileObj, permissions);
          console.log(`  ✅ Synced Storage Snapshot: ${fileId}`);
        } catch (e) {
          console.error(`  ❌ Failed storage snapshot for ${fileId}:`, e.message);
        }
      }

      // 4b. Upload Materials
      if (Array.isArray(data.materials) && data.materials.length > 0) {
        const matDocs = data.materials.map(m => ({
          $id: sanitizeId(`mat_${compId}_${fyId}_${m.id || m.code || m.name}`),
          company_id: compId,
          fy_id: fyId,
          name: m.name || '',
          code: m.code || '',
          category: m.category || '',
          unit: m.unit || 'Pcs',
          hsn_code: m.hsnCode || m.hsn || '',
          stock: Number(m.stock || m.openingStock || 0),
          selling_price: Number(m.sellingPrice || m.salesRate || 0),
          raw_data: JSON.stringify(m)
        }));
        await bulkInsert('materials', matDocs);
      }

      // 4c. Upload Contacts
      if (Array.isArray(data.contacts) && data.contacts.length > 0) {
        const contDocs = data.contacts.map(ct => ({
          $id: sanitizeId(`ct_${compId}_${fyId}_${ct.id || ct.name}`),
          company_id: compId,
          fy_id: fyId,
          name: ct.name || '',
          type: ct.type || '',
          phone: ct.phone || '',
          mobile: ct.mobile || '',
          gstin: ct.gstin || '',
          opening_balance: Number(ct.openingBalance || 0),
          current_balance: Number(ct.currentBalance || ct.balance || 0),
          raw_data: JSON.stringify(ct)
        }));
        await bulkInsert('contacts', contDocs);
      }

      // 4d. Upload Invoices
      if (Array.isArray(data.invoices) && data.invoices.length > 0) {
        const invDocs = data.invoices.map(inv => ({
          $id: sanitizeId(`inv_${compId}_${fyId}_${inv.id || inv.invoiceNo}`),
          company_id: compId,
          fy_id: fyId,
          invoice_no: String(inv.invoiceNo || inv.billNo || ''),
          invoice_type: inv.invoiceType || inv.type || 'SALES',
          date: inv.date || '',
          party_id: String(inv.partyId || inv.customerId || ''),
          party_name: inv.partyName || inv.customerName || '',
          grand_total: Number(inv.grandTotal || inv.totalAmount || inv.total || 0),
          payment_status: inv.paymentStatus || 'Unpaid',
          raw_data: JSON.stringify(inv)
        }));
        await bulkInsert('invoices', invDocs);
      }

      // 4e. Upload Purchases
      if (Array.isArray(data.purchases) && data.purchases.length > 0) {
        const purDocs = data.purchases.map(p => ({
          $id: sanitizeId(`pur_${compId}_${fyId}_${p.id || p.invoiceNo || p.purchaseNo}`),
          company_id: compId,
          fy_id: fyId,
          invoice_no: String(p.invoiceNo || p.billNo || ''),
          purchase_no: String(p.purchaseNo || ''),
          date: p.date || '',
          supplier_id: String(p.supplierId || p.partyId || ''),
          supplier_name: p.supplierName || p.partyName || '',
          grand_total: Number(p.grandTotal || p.totalAmount || 0),
          raw_data: JSON.stringify(p)
        }));
        await bulkInsert('purchases', purDocs);
      }

      // 4f. Upload Transactions / Vouchers
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        const txDocs = data.transactions.map((tx, idx) => ({
          $id: sanitizeId(`tx_${compId}_${fyId}_${tx.id || tx.voucherNo || idx}`),
          company_id: compId,
          fy_id: fyId,
          voucher_no: String(tx.voucherNo || tx.reference || ''),
          voucher_type: tx.voucherType || tx.type || '',
          date: tx.date || '',
          party_id: String(tx.partyId || ''),
          party_name: tx.partyName || '',
          amount: Number(tx.amount || 0),
          narration: String(tx.narration || tx.description || '').substring(0, 490),
          raw_data: JSON.stringify(tx)
        }));
        await bulkInsert('transactions', txDocs);
      }

      // 4g. Upload Ledgers
      if (Array.isArray(data.ledgers) && data.ledgers.length > 0) {
        const ledDocs = data.ledgers.map(l => ({
          $id: sanitizeId(`led_${compId}_${fyId}_${l.id || l.code || l.name}`),
          company_id: compId,
          fy_id: fyId,
          name: l.name || '',
          account_group: l.groupName || l.accountGroup || '',
          opening_balance: Number(l.openingBalance || 0),
          current_balance: Number(l.currentBalance || 0),
          raw_data: JSON.stringify(l)
        }));
        await bulkInsert('ledgers', ledDocs);
      }

      // 4h. Upload Settings & Masters
      const settingsKeys = [
        'accountGroups', 'productGroups', 'categories', 'subCategories',
        'productNames', 'units', 'options', 'influencers', 'influencerRedemptions',
        'loyaltyPrograms', 'hsnCodes', 'hsnDescriptions', 'seriesMaster',
        'headloaderProductIds', 'headloaderTypes', 'gstMaster', 'salesAdjustments',
        'purchaseAdjustments'
      ];

      const settingsDocs = [];
      for (const k of settingsKeys) {
        if (data[k] !== undefined) {
          settingsDocs.push({
            $id: sanitizeId(`set_${compId}_${fyId}_${k}`),
            company_id: compId,
            fy_id: fyId,
            setting_key: k,
            setting_value: JSON.stringify(data[k])
          });
        }
      }
      if (settingsDocs.length > 0) {
        await bulkInsert('company_settings', settingsDocs);
      }
    }
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL APPWRITE CLOUD DATA & STORAGE SNAPSHOTS FULLY SYNCHRONIZED!");
  console.log("==================================================================");
}

runMasterCleanSync().catch(err => {
  console.error("FATAL ERROR in runMasterCleanSync:", err);
  process.exit(1);
});
