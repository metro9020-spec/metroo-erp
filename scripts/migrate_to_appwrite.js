import { Client, Databases, Permission, Role, ID, Query } from 'node-appwrite';
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

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

const COLLECTIONS_SCHEMA = {
  companies: {
    name: 'Companies',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'sub_name', type: 'string', size: 255, required: false },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'mobile', type: 'string', size: 50, required: false },
      { key: 'gstin', type: 'string', size: 50, required: false },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  financial_years: {
    name: 'Financial Years',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'start_date', type: 'string', size: 50, required: false },
      { key: 'end_date', type: 'string', size: 50, required: false }
    ]
  },
  materials: {
    name: 'Materials / Products',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'code', type: 'string', size: 100, required: false },
      { key: 'category', type: 'string', size: 100, required: false },
      { key: 'unit', type: 'string', size: 50, required: false },
      { key: 'hsn_code', type: 'string', size: 50, required: false },
      { key: 'stock', type: 'float', required: false },
      { key: 'selling_price', type: 'float', required: false },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  contacts: {
    name: 'Contacts / Parties',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'type', type: 'string', size: 50, required: false },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'mobile', type: 'string', size: 50, required: false },
      { key: 'gstin', type: 'string', size: 50, required: false },
      { key: 'opening_balance', type: 'float', required: false },
      { key: 'current_balance', type: 'float', required: false },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  invoices: {
    name: 'Sales Invoices',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'invoice_no', type: 'string', size: 100, required: true },
      { key: 'invoice_type', type: 'string', size: 50, required: false },
      { key: 'date', type: 'string', size: 50, required: false },
      { key: 'party_id', type: 'string', size: 100, required: false },
      { key: 'party_name', type: 'string', size: 255, required: false },
      { key: 'grand_total', type: 'float', required: false },
      { key: 'payment_status', type: 'string', size: 50, required: false },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  purchases: {
    name: 'Purchases',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'invoice_no', type: 'string', size: 100, required: false },
      { key: 'purchase_no', type: 'string', size: 100, required: false },
      { key: 'date', type: 'string', size: 50, required: false },
      { key: 'supplier_id', type: 'string', size: 100, required: false },
      { key: 'supplier_name', type: 'string', size: 255, required: false },
      { key: 'grand_total', type: 'float', required: false },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  transactions: {
    name: 'Transactions / Vouchers',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'voucher_no', type: 'string', size: 100, required: false },
      { key: 'voucher_type', type: 'string', size: 50, required: false },
      { key: 'date', type: 'string', size: 50, required: false },
      { key: 'party_id', type: 'string', size: 100, required: false },
      { key: 'party_name', type: 'string', size: 255, required: false },
      { key: 'amount', type: 'float', required: false },
      { key: 'narration', type: 'string', size: 500, required: false },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  ledgers: {
    name: 'Ledgers',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'account_group', type: 'string', size: 100, required: false },
      { key: 'opening_balance', type: 'float', required: false },
      { key: 'current_balance', type: 'float', required: false },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  sales_orders: {
    name: 'Sales Orders',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  sales_returns: {
    name: 'Sales Returns',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  purchase_returns: {
    name: 'Purchase Returns',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'raw_data', type: 'string', size: 65535, required: false }
    ]
  },
  company_settings: {
    name: 'Company Settings & Masters',
    attributes: [
      { key: 'company_id', type: 'string', size: 100, required: true },
      { key: 'fy_id', type: 'string', size: 100, required: true },
      { key: 'setting_key', type: 'string', size: 100, required: true },
      { key: 'setting_value', type: 'string', size: 65535, required: false }
    ]
  }
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureDatabase() {
  try {
    await databases.get(DATABASE_ID);
    console.log(`✅ Database "${DATABASE_ID}" exists.`);
  } catch (e) {
    console.log(`Creating database "${DATABASE_ID}"...`);
    await databases.create(DATABASE_ID, 'Metro ERP Database');
    console.log(`✅ Database "${DATABASE_ID}" created.`);
  }
}

async function ensureCollections() {
  const existingCols = await databases.listCollections(DATABASE_ID);
  const existingMap = new Map(existingCols.collections.map(c => [c.$id, c]));

  for (const [colId, config] of Object.entries(COLLECTIONS_SCHEMA)) {
    let col = existingMap.get(colId);
    if (!col) {
      console.log(`Creating collection "${colId}" (${config.name})...`);
      col = await databases.createCollection(
        DATABASE_ID,
        colId,
        config.name,
        [
          Permission.read(Role.any()),
          Permission.write(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
      console.log(`✅ Collection "${colId}" created.`);
    } else {
      console.log(`Collection "${colId}" already exists.`);
    }

    // Check & create attributes
    const attrList = await databases.listAttributes(DATABASE_ID, colId);
    const attrKeys = new Set(attrList.attributes.map(a => a.key));

    for (const attr of config.attributes) {
      if (!attrKeys.has(attr.key)) {
        console.log(`  Adding attribute "${attr.key}" (${attr.type}) to "${colId}"...`);
        try {
          if (attr.type === 'string') {
            await databases.createStringAttribute(
              DATABASE_ID,
              colId,
              attr.key,
              attr.size || 255,
              attr.required || false
            );
          } else if (attr.type === 'float') {
            await databases.createFloatAttribute(
              DATABASE_ID,
              colId,
              attr.key,
              attr.required || false
            );
          }
        } catch (err) {
          console.warn(`  Warning adding attribute ${attr.key}:`, err.message);
        }
      }
    }
  }

  // Wait for all attributes to become 'available'
  console.log('Waiting for collection attributes to process...');
  let allReady = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    allReady = true;
    for (const colId of Object.keys(COLLECTIONS_SCHEMA)) {
      const attrs = await databases.listAttributes(DATABASE_ID, colId);
      for (const a of attrs.attributes) {
        if (a.status !== 'available') {
          allReady = false;
          break;
        }
      }
      if (!allReady) break;
    }
    if (allReady) {
      console.log('✅ All attributes are ready and available!');
      break;
    }
    await sleep(1000);
  }
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
        await databases.createDocument(DATABASE_ID, collectionId, docId, data);
        count++;
      } catch (err) {
        // If document already exists, update it
        if (err.code === 409 && doc.$id) {
          try {
            const data = { ...doc };
            delete data.$id;
            await databases.updateDocument(DATABASE_ID, collectionId, doc.$id, data);
            count++;
          } catch (updateErr) {
            console.warn(`Error updating doc in ${collectionId}:`, updateErr.message);
          }
        } else {
          console.warn(`Error inserting into ${collectionId}:`, err.message);
        }
      }
    }));
    process.stdout.write(`\r  Importing ${collectionId}: ${Math.min(i + batchSize, documents.length)} / ${documents.length}`);
  }
  console.log(`\n  ✅ Migrated ${count} records into "${collectionId}".`);
  return count;
}

function sanitizeId(str) {
  if (!str) return ID.unique();
  // Appwrite document IDs can contain max 36 chars, a-z, A-Z, 0-9, periods, hyphens, and underscores
  const clean = String(str).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
  return clean || ID.unique();
}

async function migrateData() {
  const dataDir = path.join(rootDir, 'COMPANY DATA BASE');
  const companiesPath = path.join(dataDir, 'companies.json');
  
  if (!fs.existsSync(companiesPath)) {
    console.error('companies.json not found!');
    return;
  }

  const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8').replace(/^\uFEFF/, ''));
  console.log(`Found ${companies.length} companies in local database.`);

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

    if (Array.isArray(c.financialYears)) {
      for (const fy of c.financialYears) {
        fyDocs.push({
          $id: sanitizeId(`fy_${compId}_${fy.id || 'default'}`),
          company_id: compId,
          name: fy.name || 'Current F.Y',
          start_date: fy.startDate || '',
          end_date: fy.endDate || ''
        });
      }
    }
  }

  await bulkInsert('companies', companyDocs);
  await bulkInsert('financial_years', fyDocs);

  // Now process each company's financial year JSON files
  for (const c of companies) {
    const compId = String(c.id);
    const compName = c.name;
    console.log(`\n======================================================`);
    console.log(`Processing company: "${compName}" (ID: ${compId})`);
    console.log(`======================================================`);

    const folderName = compName.replace(/[<>:"/\\|?*]+/g, '_');
    const compDir = path.join(dataDir, folderName);
    
    // Also fallback to 'company <id>'
    const altDir = path.join(dataDir, `company ${compId}`);
    const targetDir = fs.existsSync(compDir) ? compDir : (fs.existsSync(altDir) ? altDir : null);

    if (!targetDir) {
      console.log(`No data folder found for "${compName}". Skipping transaction files.`);
      continue;
    }

    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      console.log(`\nReading file: ${file}`);
      const filePath = path.join(targetDir, file);
      const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
      let data = {};
      try {
        data = JSON.parse(content);
      } catch (err) {
        console.error(`Error parsing ${file}:`, err.message);
        continue;
      }

      let fyId = 'default';
      if (file.includes(' - ')) {
        const parts = file.replace('.json', '').split(' - ');
        const fyName = parts.slice(1).join(' - ');
        if (c.financialYears) {
          const found = c.financialYears.find(f => f.name === fyName);
          if (found) fyId = String(found.id);
        }
      }

      console.log(`Mapped to Financial Year ID: "${fyId}"`);

      // 1. Materials
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

      // 2. Contacts
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

      // 3. Invoices
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

      // 4. Purchases
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

      // 5. Transactions / Vouchers
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        const txDocs = data.transactions.map(tx => ({
          $id: sanitizeId(`tx_${compId}_${fyId}_${tx.id || tx.voucherNo || Math.random().toString(36).substring(2, 8)}`),
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

      // 6. Ledgers
      if (Array.isArray(data.ledgers) && data.ledgers.length > 0) {
        const ledDocs = data.ledgers.map(l => ({
          $id: sanitizeId(`led_${compId}_${fyId}_${l.id || l.name}`),
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

      // 7. Settings & Masters bundle
      const settingsKeys = [
        'accountGroups', 'productGroups', 'categories', 'subCategories',
        'productNames', 'units', 'options', 'influencers', 'influencerRedemptions',
        'loyaltyPrograms', 'hsnCodes', 'hsnDescriptions', 'seriesMaster',
        'headloaderProductIds', 'headloaderTypes', 'gstMaster', 'salesAdjustments',
        'purchaseAdjustments'
      ];

      const settingDocs = [];
      for (const key of settingsKeys) {
        if (data[key] !== undefined) {
          settingDocs.push({
            $id: sanitizeId(`set_${compId}_${fyId}_${key}`),
            company_id: compId,
            fy_id: fyId,
            setting_key: key,
            setting_value: JSON.stringify(data[key])
          });
        }
      }
      if (settingDocs.length > 0) {
        await bulkInsert('company_settings', settingDocs);
      }
    }
  }

  console.log('\n======================================================');
  console.log('🎉 APPWRITE MIGRATION FINISHED SUCCESSFULLY!');
  console.log('======================================================');
}

async function main() {
  try {
    await ensureDatabase();
    await ensureCollections();
    await migrateData();
  } catch (err) {
    console.error('Fatal Migration Error:', err);
  }
}

main();
