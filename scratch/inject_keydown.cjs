const fs = require("fs");

const base = fs.readFileSync("scratch/base_main.js", "utf8");
const startIdx = base.indexOf("// Keyboard shortcuts handlers");
const endIdx = base.lastIndexOf("document.addEventListener"); // actually base_main doesn't have DOMContentLoaded, so it ends early?
// wait, we can just extract from startIdx to the end of base_main.js!
let chunk = base.substring(startIdx);

let js = fs.readFileSync("src/main.js", "utf8");

// replace F3 mapping if it exists
js = js.replace(/  \/\/ F3: Purchase Bill\r?\n  if \(e\.key === "F3"\) \{[\s\S]*?\}\r?\n    \}\);\r?\n  \}/, "");

// find where to insert
const insertTarget = 'document.addEventListener("DOMContentLoaded",';
if(js.includes('// Keyboard shortcuts handlers')) {
  console.log("Already has it?");
} else {
  js = js.replace(insertTarget, chunk + "\n\n" + insertTarget);
  fs.writeFileSync("src/main.js", js);
  console.log("Injected keydown!");
}
