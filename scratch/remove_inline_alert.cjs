const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(/alert\('Button clicked!'\); /g, "");

fs.writeFileSync("index.html", html);
console.log("Removed inline alerts from index.html");
