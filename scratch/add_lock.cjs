const fs = require('fs');
let code = fs.readFileSync('G:/sw m/erp/server.js', 'utf8');

const lockCode = `
let isLocked = false;
app.get('/api/lock', (req, res) => {
  if (isLocked) {
    res.json({ locked: false });
  } else {
    isLocked = true;
    setTimeout(() => { isLocked = false; }, 10000);
    res.json({ locked: true });
  }
});
app.get('/api/unlock', (req, res) => {
  isLocked = false;
  res.json({ success: true });
});
`;

if (!code.includes('/api/lock')) {
  code = code.replace('app.post("/api/log",', lockCode + '\napp.post("/api/log",');
  fs.writeFileSync('G:/sw m/erp/server.js', code);
  console.log('Added lock endpoints');
} else {
  console.log('Already added');
}
