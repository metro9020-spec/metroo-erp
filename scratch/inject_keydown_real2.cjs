const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");
let keydown = fs.readFileSync("scratch/found_keydown.txt", "utf8");

// replace the comment with the full block
js = js.replace(/\/\/ Keyboard shortcuts handlers[\s\S]*?(?=document\.addEventListener\("DOMContentLoaded")/, keydown + "\n\n");

fs.writeFileSync("src/main.js", js);
console.log("Injected properly!");
