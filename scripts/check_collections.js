import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('6abbaed6002fd9bf3d58')
  .setKey('standard_7838a375517b76a8c4ffaa61761767194ce2b223926bfd2b03d35b9fedb025813bdff2d32a5379356d40edd54b11db36010cd602d546953cca65de4a86ac7692b63d47a6ad3b3b63d25807e9e24dc583d0d986726b7af770907a1dad97929892a4fcfb12c5b62d2bdc416c2c94e198abe7574b35bec6dbdbac1098e0c1a84236');

const db = new Databases(client);

async function check() {
  const cols = await db.listCollections('metro_erp_db');
  for (const c of cols.collections) {
    console.log(c.$id, '--> Permissions:', c.$permissions);
  }
}
check();
