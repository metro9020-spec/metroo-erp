const fs = require("fs");
let js = fs.readFileSync("server.js", "utf8");

// Change /api/data/:companyId/:fyId? to /api/data/:companyId/:fyId
js = js.replace(/"\/api\/data\/:companyId\/:fyId\?"/g, `"/api/data/:companyId/:fyId"`);
js = js.replace(/"\/api\/backup\/:companyId\/:fyId\?"/g, `"/api/backup/:companyId/:fyId"`);

fs.writeFileSync("server.js", js);
console.log("Patched server.js express paths");
