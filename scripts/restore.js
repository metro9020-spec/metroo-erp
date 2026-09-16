/**
 * Restore script for a SQL/NoSQL database.
 * Restores the most recent backup from the configured location.
 */
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3 } = require('aws-sdk');

const config = require('../config/backup-config.json');

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

async function restore() {
  let backupFile;
  if (config.useS3) {
    const s3 = new S3({
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      region: config.s3.region,
    });
    const list = await s3.listObjectsV2({ Bucket: config.s3.bucket }).promise();
    const latest = list.Contents.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))[0];
    const downloadPath = path.join(config.localDir, latest.Key);
    const data = await s3.getObject({ Bucket: config.s3.bucket, Key: latest.Key }).promise();
    fs.writeFileSync(downloadPath, data.Body);
    backupFile = downloadPath;
  } else {
    const files = fs.readdirSync(config.localDir)
      .filter(f => f.endsWith('.sql') || f.endsWith('.gz'))
      .sort((a, b) => fs.statSync(path.join(config.localDir, b)).mtime - fs.statSync(path.join(config.localDir, a)).mtime);
    backupFile = path.join(config.localDir, files[0]);
  }

  console.log('Restoring from', backupFile);
  const restoreCmd = config.restoreCommand.replace('{input}', `"${backupFile}"`);
  await runCommand(restoreCmd);
  console.log('Restore completed');
}

restore().catch(err => console.error('Restore failed:', err));
