const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
let maxLen = 0;
let best = "";
for (let l of lines) {
  try {
    const obj = JSON.parse(l);
    if (obj.content && obj.content.includes("import { state } from") && obj.content.includes("routes = {")) {
      if (obj.content.length > maxLen) {
        maxLen = obj.content.length;
        best = obj.content;
      }
    }
  } catch(e) {}
}
fs.writeFileSync("scratch/best_main.js", best);
console.log("Length:", maxLen);
