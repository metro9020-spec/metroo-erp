const fs = require('fs');
let code = fs.readFileSync('G:/sw m/erp/server.js', 'utf8');
code = code.replace(
  'console.log("BROWSER LOG:", req.body);',
  'fs.appendFileSync("browser_errors.log", JSON.stringify(req.body) + "\\n"); console.log("BROWSER LOG:", req.body);'
);
fs.writeFileSync('G:/sw m/erp/server.js', code);
