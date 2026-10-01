import { Client, Storage, Permission, Role, ID } from 'node-appwrite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('6abbaed6002fd9bf3d58')
  .setKey('standard_7838a375517b76a8c4ffaa61761767194ce2b223926bfd2b03d35b9fedb025813bdff2d32a5379356d40edd54b11db36010cd602d546953cca65de4a86ac7692b63d47a6ad3b3b63d25807e9e24dc583d0d986726b7af770907a1dad97929892a4fcfb12c5b62d2bdc416c2c94e198abe7574b35bec6dbdbac1098e0c1a84236');

const storage = new Storage(client);
const BUCKET_ID = 'erp_databases';

async function setupBucketAndUpload() {
  try {
    await storage.getBucket(BUCKET_ID);
    console.log(`Bucket "${BUCKET_ID}" exists.`);
  } catch (e) {
    console.log(`Creating bucket "${BUCKET_ID}"...`);
    await storage.createBucket(
      BUCKET_ID,
      'ERP Company Databases',
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ],
      false, // fileSecurity = false (public read)
      true,  // enabled = true
      30 * 1024 * 1024 // max 30 MB
    );
    console.log(`✅ Bucket "${BUCKET_ID}" created.`);
  }

  // Upload METRO AGENCIES JSON
  const filePath = path.join(rootDir, 'COMPANY DATA BASE', 'METRO AGENCIES', 'METRO AGENCIES - Current F.Y.json');
  const fileId = 'db_1_default';
  
  try {
    await storage.deleteFile(BUCKET_ID, fileId);
  } catch (e) {}

  console.log('Uploading database bundle to Appwrite Storage...');
  const res = await storage.createFile(
    BUCKET_ID,
    fileId,
    new File([fs.readFileSync(filePath)], '1_default.json', { type: 'application/json' })
  );

  console.log('✅ File uploaded successfully:', res.$id, 'Size:', res.sizeOriginal);
}

setupBucketAndUpload();
