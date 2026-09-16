const fs = require("fs");
let js = fs.readFileSync("server.js", "utf8");

// GET /api/data/:companyId/:fyId?
js = js.replace(`app.get("/api/data/:companyId", (req, res) => {`, `app.get("/api/data/:companyId/:fyId?", (req, res) => {\r\n  const fyId = req.params.fyId || "default";`);
js = js.replace(`const filePath = path.join(dbFolder, "data_company_" + companyId + ".json");`, `const filePath = path.join(dbFolder, "data_company_" + companyId + (fyId === "default" ? "" : "_" + fyId) + ".json");`);

// POST /api/data/:companyId/:fyId?
js = js.replace(`app.post("/api/data/:companyId", (req, res) => {`, `app.post("/api/data/:companyId/:fyId?", (req, res) => {\r\n  const fyId = req.params.fyId || "default";`);
// It replaces the first occurrence, which is in GET, wait, I already replaced the first occurrence!
// Let me use a better replace approach.

