const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
let match = "";
for (let l of lines) {
  if (l.includes("Top Horizontal Menu Bar") && l.includes("erp-menu-bar")) {
    const startIdx = l.indexOf("Top Horizontal Menu Bar");
    const endIdx = l.indexOf("Left Vertical Sidebar", startIdx);
    if (endIdx !== -1) {
      match = l.substring(startIdx, endIdx);
      match = match.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
      fs.writeFileSync("scratch/original_nav.txt", match);
      console.log("Found real nav!");
      break;
    }
  }
}
