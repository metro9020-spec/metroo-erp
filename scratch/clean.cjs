const fs = require("fs");
let txt = fs.readFileSync("scratch/found_keydown.txt", "utf8");
const cleaned = txt.split("\n").map(l => l.replace(/^\d+\s*[\|:]\s*/, "")).join("\n");
fs.writeFileSync("scratch/found_keydown_clean.txt", cleaned);

let js = fs.readFileSync("src/main.js", "utf8");
js = js.replace(/\/\/ Keyboard shortcuts handlers[\s\S]*?(?=document\.addEventListener\("DOMContentLoaded")/, cleaned + "\n\n");
fs.writeFileSync("src/main.js", js);
console.log("Fixed main.js!");
