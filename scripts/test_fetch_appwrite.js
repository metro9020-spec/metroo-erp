import { Client, Databases, Query } from 'appwrite';

async function test() {
  const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('6abbaed6002fd9bf3d58');

  const databases = new Databases(client);

  const res = await databases.listDocuments(
    'metro_erp_db',
    'invoices',
    [
      Query.equal('company_id', '1'),
      Query.limit(5)
    ]
  );

  console.log('Total invoices in Appwrite:', res.total);
  console.log('Fetched count:', res.documents.length);
  if (res.documents.length > 0) {
    console.log('Sample Invoice No:', res.documents[0].invoice_no, '| Party:', res.documents[0].party_name, '| Total: ₹', res.documents[0].grand_total);
  }
}

test();
