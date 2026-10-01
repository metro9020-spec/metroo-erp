import { Client, Databases } from 'node-appwrite';

const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '6abbaed6002fd9bf3d58';
const API_KEY = 'standard_7838a375517b76a8c4ffaa61761767194ce2b223926bfd2b03d35b9fedb025813bdff2d32a5379356d40edd54b11db36010cd602d546953cca65de4a86ac7692b63d47a6ad3b3b63d25807e9e24dc583d0d986726b7af770907a1dad97929892a4fcfb12c5b62d2bdc416c2c94e198abe7574b35bec6dbdbac1098e0c1a84236';
const DATABASE_ID = 'metro_erp_db';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);

async function run() {
  const list = await db.listCollections(DATABASE_ID);
  for (const c of list.collections) {
    const docs = await db.listDocuments(DATABASE_ID, c.$id);
    console.log(`${c.$id} (${c.name}) -> Total Docs: ${docs.total}`);
  }
}

run().catch(console.error);
