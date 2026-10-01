import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '6abbaed6002fd9bf3d58';
const API_KEY = 'standard_7838a375517b76a8c4ffaa61761767194ce2b223926bfd2b03d35b9fedb025813bdff2d32a5379356d40edd54b11db36010cd602d546953cca65de4a86ac7692b63d47a6ad3b3b63d25807e9e24dc583d0d986726b7af770907a1dad97929892a4fcfb12c5b62d2bdc416c2c94e198abe7574b35bec6dbdbac1098e0c1a84236';
const BUCKET_ID = 'erp_databases';

const headers = {
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY
};

async function uploadFile(fileId, dataObj) {
  // 1. Delete if exists
  await fetch(`${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}`, {
    method: 'DELETE',
    headers
  }).catch(() => {});

  // 2. Upload clean JSON
  const jsonStr = JSON.stringify(dataObj);
  const formData = new FormData();
  formData.append('fileId', fileId);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  formData.append('file', blob, `${fileId}.json`);
  formData.append('permissions[]', 'read("any")');
  formData.append('permissions[]', 'write("any")');
  formData.append('permissions[]', 'update("any")');
  formData.append('permissions[]', 'delete("any")');

  const res = await fetch(`${ENDPOINT}/storage/buckets/${BUCKET_ID}/files`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (res.ok) {
    const json = await res.json();
    console.log(`✅ Uploaded ${fileId} (${json.sizeOriginal} bytes)`);
  } else {
    const txt = await res.text();
    console.error(`❌ Error uploading ${fileId}:`, res.status, txt);
  }
}

async function run() {
  console.log('Uploading clean storage snapshots...');

  // Metro Agencies
  const metroFile = path.join(rootDir, 'COMPANY DATA BASE', 'METRO AGENCIES', 'METRO AGENCIES - Current F.Y.json');
  const metroData = JSON.parse(fs.readFileSync(metroFile, 'utf8'));
  console.log(`Metro Agencies local tx count: ${metroData.transactions.length}`);

  for (const t of ['db_1_default', 'db_1_Current_F_Y', 'db_1_fy_bkp']) {
    await uploadFile(t, metroData);
  }

  // company 2
  const c2File = path.join(rootDir, 'COMPANY DATA BASE', 'company 2', 'company 2 - Current F.Y.json');
  if (fs.existsSync(c2File)) {
    const c2Data = JSON.parse(fs.readFileSync(c2File, 'utf8'));
    for (const t of ['db_1790417602021_default', 'db_1790417602021_Current_F_Y']) {
      await uploadFile(t, c2Data);
    }
  }

  // SAMPLE
  const sFile = path.join(rootDir, 'COMPANY DATA BASE', 'SAMPLE', 'SAMPLE - Current F.Y.json');
  if (fs.existsSync(sFile)) {
    const sData = JSON.parse(fs.readFileSync(sFile, 'utf8'));
    for (const t of ['db_1790155614129_default', 'db_1790155614129_Current_F_Y']) {
      await uploadFile(t, sData);
    }
  }

  console.log('\n🎉 All storage snapshots verified and uploaded!');
}

run().catch(console.error);
