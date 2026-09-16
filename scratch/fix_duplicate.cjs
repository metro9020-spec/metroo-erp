const fs = require("fs");
let lines = fs.readFileSync("src/main.js", "utf8").split("\n");
const lastIdx = lines.findLastIndex(l => l.includes("export function renderCurrentView()"));
if (lastIdx > 100) {
  lines = lines.slice(0, lastIdx);
  fs.writeFileSync("src/main.js", lines.join("\n"));
  console.log("Removed duplicate at end");
}
