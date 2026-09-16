const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
let outputFound = false;
for (let l of lines) {
  try {
    const obj = JSON.parse(l);
    if (obj.step_index === 426 || obj.step_index === 427 || (obj.step_index > 425 && obj.type === "TOOL_RESPONSE")) {
      if (obj.content && obj.content.includes("<!doctype html>")) {
        // extract just the file content
        const match = obj.content.match(/<!doctype html>[\s\S]*/i);
        if (match) {
          fs.writeFileSync("scratch/original_index.html", match[0]);
          console.log("Extracted original index.html!");
          outputFound = true;
          break;
        }
      }
    }
  } catch(e) {}
}

