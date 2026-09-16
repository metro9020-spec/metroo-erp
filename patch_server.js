import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverFilePath = path.join(__dirname, "server.js");

let content = fs.readFileSync(serverFilePath, "utf8");

const newHelpers = `// ── Helper: resolve the folder and file names ──────────────────────────────────
function getCompanies() {
  const filePath = path.join(__dirname, "COMPANY DATA BASE", "companies.json");
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (e) {
      return [];
    }
  }
  return [];
}

const sanitize = (name) => name ? String(name).replace(/[<>:"/\\\\|?*]+/g, '_') : "Unknown";

function getCompanyDetails(companyId, fyId) {
  const companies = getCompanies();
  const company = companies.find(c => String(c.id) === String(companyId));
  if (!company) {
    return { folderName: 'company ' + companyId, fileName: 'data' + (!fyId || fyId === 'default' ? '' : '_' + fyId) + '.json' };
  }
  
  const companyName = sanitize(company.name);
  let fyName = "Current F.Y";
  
  if (company.financialYears) {
    const fy = company.financialYears.find(f => String(f.id) === String(fyId));
    if (fy && fy.name) {
      fyName = sanitize(fy.name);
    } else if (fyId === "default") {
      const defFy = company.financialYears.find(f => String(f.id) === "default");
      if (defFy && defFy.name) fyName = sanitize(defFy.name);
    }
  }
  
  return { folderName: companyName, fileName: companyName + ' - ' + fyName + '.json' };
}

function companyFolder(companyId) {
  const { folderName } = getCompanyDetails(companyId, null);
  const base = path.join(__dirname, "COMPANY DATA BASE", folderName);
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

function dataFilePath(companyId, fyId) {
  const { folderName, fileName } = getCompanyDetails(companyId, fyId);
  const base = path.join(__dirname, "COMPANY DATA BASE", folderName);
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return path.join(base, fileName);
}

// Migration to rename old folders and files
function runMigration() {
  const companies = getCompanies();
  for (const company of companies) {
    const oldFolder = path.join(__dirname, "COMPANY DATA BASE", 'company ' + company.id);
    const newFolder = path.join(__dirname, "COMPANY DATA BASE", sanitize(company.name));
    
    if (fs.existsSync(oldFolder) && oldFolder !== newFolder) {
      if (!fs.existsSync(newFolder)) {
        fs.renameSync(oldFolder, newFolder);
      }
    }
    
    if (fs.existsSync(newFolder)) {
      const fys = company.financialYears || [{id: "default", name: "Current F.Y"}];
      for (const fy of fys) {
        const oldFileSuffix = fy.id === "default" ? "" : '_' + fy.id;
        const oldFilePath = path.join(newFolder, 'data' + oldFileSuffix + '.json');
        const newFilePath = path.join(newFolder, sanitize(company.name) + ' - ' + sanitize(fy.name) + '.json');
        
        if (fs.existsSync(oldFilePath) && !fs.existsSync(newFilePath)) {
          fs.renameSync(oldFilePath, newFilePath);
        }
      }
    }
  }
}
runMigration();`;

// Replace the old helper functions in server.js
content = content.replace(/\/\/ ── Helper: resolve the folder[\s\S]*?function dataFilePath[\s\S]*?return path.join\(folder, `data\$\{suffix\}\.json`\);\n}/, newHelpers);

// Update the backup endpoint to use the new file name format
content = content.replace(
  /const dateStr = new Date\(\)\.toISOString\(\)\.replace\(\/:\\\/g, "-"\)\.split\("\."\)\[0\];\s*const suffix  = \(!fyId \|\| fyId === "default"\) \? "" : `_\$\{fyId\}`;\s*const targetFile = path\.join\(backupDir, `erp_backup\$\{suffix\}_\$\{dateStr\}\.json`\);/,
  "const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];\n  const { fileName } = getCompanyDetails(companyId, fyId);\n  const baseName = fileName.replace('.json', '');\n  const targetFile = path.join(backupDir, baseName + '_backup_' + dateStr + '.json');"
);

fs.writeFileSync(serverFilePath, content);
console.log("server.js patched successfully.");
