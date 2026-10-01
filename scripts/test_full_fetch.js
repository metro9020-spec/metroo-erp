import { Client, Databases, Query } from 'appwrite';

const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6abbaed6002fd9bf3d58";
const APPWRITE_DATABASE_ID = "metro_erp_db";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const appwriteDatabases = new Databases(client);

async function testFetch(activeId, targetFyId) {
  console.log(`Testing fetch for activeId: "${activeId}", fyId: "${targetFyId}"`);

  const fetchAllDocs = async (collectionId) => {
    let all = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      try {
        const res = await appwriteDatabases.listDocuments(
          APPWRITE_DATABASE_ID,
          collectionId,
          [
            Query.equal("company_id", String(activeId)),
            Query.limit(limit),
            Query.offset(offset)
          ]
        );
        if (!res || !Array.isArray(res.documents) || res.documents.length === 0) break;
        all = all.concat(res.documents);
        if (res.documents.length < limit) break;
        offset += limit;
      } catch (e) {
        console.error(`Error in ${collectionId}:`, e.message);
        break;
      }
    }
    return all;
  };

  const [materials, contacts, invoices, purchases, transactions, ledgers] = await Promise.all([
    fetchAllDocs("materials"),
    fetchAllDocs("contacts"),
    fetchAllDocs("invoices"),
    fetchAllDocs("purchases"),
    fetchAllDocs("transactions"),
    fetchAllDocs("ledgers")
  ]);

  console.log('Results:');
  console.log('Materials:', materials.length);
  console.log('Contacts:', contacts.length);
  console.log('Invoices:', invoices.length);
  console.log('Purchases:', purchases.length);
  console.log('Transactions:', transactions.length);
  console.log('Ledgers:', ledgers.length);
}

testFetch('1', 'default');
