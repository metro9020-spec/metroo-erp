const fs = require("fs");
const text = fs.readFileSync("src/main.js", "utf8");
const idx = text.indexOf("document.addEventListener(\"DOMContentLoaded\"");
console.log(text.substring(idx - 100, idx + 200));
