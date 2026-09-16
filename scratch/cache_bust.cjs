const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/src="\/src\/main\.js\?v=[0-9]+"/g, `src="/src/main.js?v=${Date.now()}"`);
fs.writeFileSync("index.html", html);
console.log("Updated cache bust");
