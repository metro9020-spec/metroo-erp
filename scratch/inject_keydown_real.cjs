const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");
let keydown = fs.readFileSync("scratch/found_keydown.txt", "utf8");

// Remove F3 mapping if it exists
js = js.replace(/  \/\/ F3: Purchase Bill\r?\n  if \(e\.key === "F3"\) \{[\s\S]*?\}\r?\n    \}\);\r?\n  \}/, "");

const insertTarget = 'document.addEventListener("DOMContentLoaded",';
if (js.includes('// Keyboard shortcuts handlers')) {
  console.log("Already has it?");
} else {
  js = js.replace(insertTarget, keydown + "\n\n" + insertTarget);
  fs.writeFileSync("src/main.js", js);
  console.log("Injected keydown block!");
}
