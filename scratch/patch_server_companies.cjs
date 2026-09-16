const fs = require("fs");
let js = fs.readFileSync("server.js", "utf8");

const companiesRoute = `
app.get("/api/companies", (req, res) => {
  const dbFolder = path.join(__dirname, "COMPANY DATA BASE");
  const filePath = path.join(dbFolder, "companies.json");
  if (fs.existsSync(filePath)) {
    try {
      res.json(JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch (err) {
      res.status(500).json({ error: "Failed to read companies." });
    }
  } else {
    res.json([]);
  }
});

app.post("/api/companies", (req, res) => {
  const dbFolder = path.join(__dirname, "COMPANY DATA BASE");
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }
  const filePath = path.join(dbFolder, "companies.json");
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body), "utf8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save companies." });
  }
});

app.listen(PORT`;

js = js.replace(`app.listen(PORT`, companiesRoute);
fs.writeFileSync("server.js", js);
console.log("Patched server.js with companies route");
