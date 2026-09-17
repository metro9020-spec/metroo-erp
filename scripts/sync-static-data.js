import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "COMPANY DATA BASE");
const publicDataDir = path.join(rootDir, "public", "data");

if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}

const companiesFile = path.join(dataDir, "companies.json");
if (fs.existsSync(companiesFile)) {
  try {
    const companies = JSON.parse(fs.readFileSync(companiesFile, "utf8"));
    const cleanCompanies = companies.map(c => ({ ...c, serverUrl: "" }));
    fs.writeFileSync(path.join(publicDataDir, "companies.json"), JSON.stringify(cleanCompanies, null, 2), "utf8");
    console.log(" [Sync] Bundled companies.json into public/data/");

    for (const company of cleanCompanies) {
      const companyFolder = path.join(dataDir, company.name);
      const fys = company.financialYears || [{ id: "default", name: "Current F.Y" }];
      for (const fy of fys) {
        const fyName = fy.name || "Current F.Y";
        const primaryFileName = `${company.name} - ${fyName}.json`;
        let srcFile = path.join(companyFolder, primaryFileName);

        if (!fs.existsSync(srcFile)) {
          const legacyName = `data${fy.id === 'default' ? '' : '_' + fy.id}.json`;
          const altFolder = path.join(dataDir, 'company ' + company.id);
          if (fs.existsSync(path.join(companyFolder, legacyName))) {
            srcFile = path.join(companyFolder, legacyName);
          } else if (fs.existsSync(path.join(altFolder, legacyName))) {
            srcFile = path.join(altFolder, legacyName);
          }
        }

        if (fs.existsSync(srcFile)) {
          const targetIdFile = path.join(publicDataDir, `${company.id}_${fy.id}.json`);
          fs.copyFileSync(srcFile, targetIdFile);

          if (fy.id === "default") {
            fs.copyFileSync(srcFile, path.join(publicDataDir, `${company.id}.json`));
          }
          console.log(` [Sync] Bundled ${company.name} (${fyName}) -> public/data/${company.id}_${fy.id}.json`);
        } else {
          console.warn(` [Sync] Warning: Data file not found for ${company.name} (${fyName})`);
        }
      }
    }
  } catch (err) {
    console.error(" [Sync] Error syncing static data:", err.message);
  }
} else {
  console.warn(" [Sync] No COMPANY DATA BASE/companies.json found.");
}
