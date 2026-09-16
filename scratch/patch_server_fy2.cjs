const fs = require("fs");
let js = fs.readFileSync("server.js", "utf8");

js = js.replace(
  /app\.get\("\/api\/data\/:companyId",\s*\(req, res\) => {/g,
  `app.get("/api/data/:companyId/:fyId?", (req, res) => {\n  const fyId = req.params.fyId || "default";`
);
js = js.replace(
  /app\.post\("\/api\/data\/:companyId",\s*\(req, res\) => {/g,
  `app.post("/api/data/:companyId/:fyId?", (req, res) => {\n  const fyId = req.params.fyId || "default";`
);
js = js.replace(
  /app\.post\("\/api\/backup\/:companyId",\s*\(req, res\) => {/g,
  `app.post("/api/backup/:companyId/:fyId?", (req, res) => {\n  const fyId = req.params.fyId || "default";`
);

js = js.replace(
  /const filePath = path\.join\(dbFolder, "data_company_" \+ companyId \+ "\.json"\);/g,
  `const filePath = path.join(dbFolder, "data_company_" + companyId + (fyId === "default" ? "" : "_" + fyId) + ".json");`
);

js = js.replace(
  /const sourceFile = path\.join\(dbFolder, "data_company_" \+ companyId \+ "\.json"\);/g,
  `const sourceFile = path.join(dbFolder, "data_company_" + companyId + (fyId === "default" ? "" : "_" + fyId) + ".json");`
);

fs.writeFileSync("server.js", js);
console.log("Patched server.js routes to support FY");
