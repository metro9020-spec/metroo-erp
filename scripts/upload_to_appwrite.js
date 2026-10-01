import fs from 'fs';
import { Client, Storage, Databases, Permission, Role, ID } from 'appwrite';

const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6abbaed6002fd9bf3d58";
const APPWRITE_DATABASE_ID = "metro_erp_db";
const APPWRITE_STORAGE_BUCKET = "erp_databases";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const storage = new Storage(client);
const databases = new Databases(client);

async function uploadFullDataToAppwrite() {
  let rawData = null;
  const paths = [
    './COMPANY DATA BASE/METRO AGENCIES/METRO AGENCIES - Current F.Y.json',
    './public/data/1.json'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        rawData = JSON.parse(fs.readFileSync(p, 'utf8'));
        console.log(`Loaded dataset from ${p} with ${rawData.invoices?.length || 0} invoices and ${rawData.transactions?.length || 0} transactions.`);
        break;
      } catch (e) {}
    }
  }

  if (!rawData) {
    console.error('No valid dataset file found.');
    return;
  }

  rawData._lastSaved = Date.now();

  const targets = ['db_1_default', 'db_1_Current_F_Y', 'db_1_fy_bkp'];

  const permissions = [
    Permission.read(Role.any()),
    Permission.write(Role.any()),
    Permission.update(Role.any()),
    Permission.delete(Role.any())
  ];

  for (const fileId of targets) {
    try {
      try {
        await storage.deleteFile(APPWRITE_STORAGE_BUCKET, fileId);
        console.log(`Deleted existing file ${fileId} from storage.`);
      } catch (delErr) {}

      const blob = new Blob([JSON.stringify(rawData)], { type: 'application/json' });
      const fileObj = new File([blob], `${fileId}.json`, { type: 'application/json' });
      await storage.createFile(APPWRITE_STORAGE_BUCKET, fileId, fileObj, permissions);
      console.log(`✅ Successfully uploaded ${fileId} to Appwrite Storage.`);
    } catch (e) {
      console.error(`Error uploading ${fileId}:`, e.message);
    }
  }

  console.log('Appwrite storage snapshots updated successfully with newest data!');
}

uploadFullDataToAppwrite();
