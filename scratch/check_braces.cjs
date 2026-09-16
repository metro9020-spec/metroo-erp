const fs = require("fs");
const lines = fs.readFileSync("src/main.js", "utf8").split("\n");
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === "{") depth++;
    if (line[j] === "}") depth--;
  }
}
console.log("Final depth:", depth);
if (depth > 0) {
  console.log("Missing }");
}
