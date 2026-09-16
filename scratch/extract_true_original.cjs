const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
let maxLen = 0;
let bestHtml = "";
for (let l of lines) {
  try {
    const obj = JSON.parse(l);
    if (obj.type === "TOOL_RESPONSE" && obj.content && obj.content.includes("<!doctype html>") && obj.content.includes("erp-menu-bar")) {
      const match = obj.content.match(/<!doctype html>[\s\S]*/i);
      if (match) {
        if (match[0].length > maxLen) {
          maxLen = match[0].length;
          bestHtml = match[0];
        }
      }
    }
  } catch(e) {}
}
if (bestHtml) {
  fs.writeFileSync("scratch/best_html.html", bestHtml);
  console.log("Found best html, len:", bestHtml.length);
} else {
  console.log("Not found.");
}
