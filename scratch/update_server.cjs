const fs = require("fs");
let js = fs.readFileSync("server.js", "utf8");

// We need to modify the logic in server.js to use the subfolder.
const oldPathLogic = `  const companyId = req.params.companyId;
  const filePath = path.join(__dirname, "data_company_" + companyId + ".json");`;

const newPathLogic = `  const companyId = req.params.companyId;
  const dbFolder = path.join(__dirname, "COMPANY DATA BASE");
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }
  const filePath = path.join(dbFolder, "data_company_" + companyId + ".json");`;

js = js.split(oldPathLogic).join(newPathLogic);

fs.writeFileSync("server.js", js);
console.log("Updated server.js to use COMPANY DATA BASE folder");

