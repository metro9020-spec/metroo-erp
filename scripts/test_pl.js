import { Client, Databases, Query } from 'appwrite';
import fs from 'fs';

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('6abbaed6002fd9bf3d58');

const db = new Databases(client);

async function testPL() {
  const fetchAllDocs = async (collectionId) => {
    let all = [];
    let offset = 0;
    while (true) {
      const res = await db.listDocuments('metro_erp_db', collectionId, [
        Query.equal('company_id', '1'),
        Query.limit(100),
        Query.offset(offset)
      ]);
      if (!res.documents || res.documents.length === 0) break;
      all = all.concat(res.documents);
      if (res.documents.length < 100) break;
      offset += 100;
    }
    return all;
  };

  const [settings, ledgers, txs] = await Promise.all([
    fetchAllDocs('company_settings'),
    fetchAllDocs('ledgers'),
    fetchAllDocs('transactions')
  ]);

  console.log('Settings count from Appwrite:', settings.length);
  settings.forEach(s => {
    console.log('Setting key in DB:', s.setting_key);
  });

  const ag = settings.find(s => s.setting_key === 'accountGroups');
  console.log('accountGroups present?', Boolean(ag), ag ? JSON.parse(ag.setting_value).length : 0);

  console.log('Ledgers from Appwrite:', ledgers.length);
  const sampleSalary = ledgers.filter(l => l.name && (l.name.includes('SALARY') || l.name.includes('RAMCO')));
  console.log('Sample special ledgers in Appwrite:', sampleSalary.map(l => ({ name: l.name, group: l.account_group })));
}

testPL();
