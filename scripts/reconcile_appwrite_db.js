import fs from 'fs';
import { Client, Databases, Query } from 'appwrite';

const APPWRITE_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6abbaed6002fd9bf3d58';
const APPWRITE_DATABASE_ID = 'metro_erp_db';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const db = new Databases(client);

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function reconcileDatabase() {
  const cleanData = JSON.parse(fs.readFileSync('./COMPANY DATA BASE/METRO AGENCIES/METRO AGENCIES - Current F.Y.json', 'utf8'));
  const validIds = new Set(cleanData.transactions.map(t => String(t.id)));
  console.log(`Clean transactions target count: ${validIds.size}`);

  let offset = 0;
  const limit = 100;
  let deleted = 0;

  while (true) {
    try {
      const res = await db.listDocuments(APPWRITE_DATABASE_ID, 'transactions', [
        Query.limit(limit),
        Query.offset(offset)
      ]);
      if (!res || !res.documents || res.documents.length === 0) break;

      for (const doc of res.documents) {
        let raw = {};
        try { raw = JSON.parse(doc.raw_data || '{}'); } catch (e) {}
        const id = String(raw.id || doc.tx_id || doc['$id'] || '');
        if (!validIds.has(id)) {
          try {
            await db.deleteDocument(APPWRITE_DATABASE_ID, 'transactions', doc['$id']);
            console.log(`Deleted obsolete doc ${doc['$id']} (id: ${id})`);
            deleted++;
            await sleep(100);
          } catch (delErr) {
            console.warn(`Failed to delete ${doc['$id']}:`, delErr.message);
          }
        }
      }

      if (res.documents.length < limit) break;
      offset += limit;
      await sleep(100);
    } catch (err) {
      console.error('Error querying documents:', err.message);
      break;
    }
  }

  console.log(`Reconciliation finished! Deleted ${deleted} obsolete documents from Appwrite DB collection.`);
}

reconcileDatabase();
