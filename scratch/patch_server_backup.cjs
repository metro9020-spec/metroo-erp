const fs = require("fs");
let js = fs.readFileSync("server.js", "utf8");

const backupRoute = `
app.post("/api/backup/:companyId", (req, res) => {
  const companyId = req.params.companyId;
  const dbFolder = path.join(__dirname, "COMPANY DATA BASE");
  const backupFolder = path.join(__dirname, "BACKUP");
  
  const sourceFile = path.join(dbFolder, "data_company_" + companyId + ".json");
  if (!fs.existsSync(sourceFile)) {
    return res.status(404).json({ error: "No data exists to backup yet." });
  }

  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/:/g, "-").split(".")[0];
  const targetFile = path.join(backupFolder, "erp_backup_" + companyId + "_" + dateStr + ".json");

  try {
    fs.copyFileSync(sourceFile, targetFile);
    res.json({ success: true, message: "Backup saved to BACKUP folder." });
  } catch (err) {
    console.error("Error creating backup:", err);
    res.status(500).json({ error: "Failed to create backup." });
  }
});

app.listen(PORT`;

js = js.replace(`app.listen(PORT`, backupRoute);
fs.writeFileSync("server.js", js);
console.log("Patched server.js with backup route");
