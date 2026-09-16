const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
const nav = fs.readFileSync("scratch/rebuild_nav.cjs", "utf8").match(/const newNav = `([\s\S]*?)`;/)[1];
html = html.replace(/<div id="app">(\s*<!-- Top Horizontal Menu Bar -->\s*)?/, `<div id="app">\n      <!-- Top Horizontal Menu Bar -->\n      ` + nav + `\n`);
fs.writeFileSync("index.html", html);
console.log("Forced insertion of nav");
