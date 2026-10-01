import { Client, Databases, Query } from 'appwrite';

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('6abbaed6002fd9bf3d58');

const db = new Databases(client);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function purgeFromAppwriteCollection() {
  const isClone = (doc) => {
    let raw = {};
    if (doc.raw_data) {
      try { raw = JSON.parse(doc.raw_data); } catch (e) {}
    }
    const tid = String(raw.id || doc.tx_id || doc['$id'] || '').trim();
    const ref = String(raw.reference || doc.reference || '').trim();
    const date = String(raw.date || doc.date || '');
    
    if (date === '2026-09-30' || date === '30-09-2026' || date === '30/09/2026') {
      if (tid === '399' || tid === '400' || tid === 'LSL-0399' || tid === 'LSL-0400' || tid === 'LSL-0370' || tid === 'LSL-0401-COGS' || tid === 'LSL-0400-COGS' || tid === 'TX-1856' || tid === 'TX-1857' || tid === 'TX-1847' || tid === 'TX-1848') {
        return true;
      }
      if (/^LSL-03[7-9]\d(-COGS)?$/i.test(tid) || /^LSL-040\d(-COGS)?$/i.test(tid)) {
        return true;
      }
      if (/^TX-18[5-9]\d$/i.test(tid)) {
        return true;
      }
      if (ref.toUpperCase().startsWith('LSL-') && !ref.toUpperCase().startsWith('LSL-0367') && !ref.toUpperCase().startsWith('LSL-0368') && !ref.toUpperCase().startsWith('LSL-0369')) {
        return true;
      }
    }
    return false;
  };

  let offset = 0;
  const limit = 100;
  let deletedCount = 0;

  while (true) {
    try {
      const res = await db.listDocuments('metro_erp_db', 'transactions', [
        Query.limit(limit),
        Query.offset(offset)
      ]);
      if (!res || !res.documents || res.documents.length === 0) break;

      for (const doc of res.documents) {
        if (isClone(doc)) {
          let success = false;
          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              await db.deleteDocument('metro_erp_db', 'transactions', doc['$id']);
              console.log('Deleted clone doc from Appwrite DB:', doc['$id']);
              deletedCount++;
              success = true;
              await sleep(150);
              break;
            } catch (delErr) {
              await sleep(1000 * (attempt + 1));
            }
          }
        }
      }

      if (res.documents.length < limit) break;
      offset += limit;
      await sleep(200);
    } catch (err) {
      console.error('Error fetching documents:', err.message);
      break;
    }
  }

  console.log(`Finished purging from Appwrite DB transactions collection: ${deletedCount} documents deleted.`);
}

purgeFromAppwriteCollection();
