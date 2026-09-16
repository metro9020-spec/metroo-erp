const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
let match = "";
for (let l of lines) {
  if (l.includes("Top Horizontal Menu Bar") && l.includes("menu-products-list") && !l.includes("extract_nav")) {
    try {
      const obj = JSON.parse(l);
      if (obj.source !== "MODEL") {
        const startIdx = obj.content.indexOf("Top Horizontal Menu Bar");
        const endIdx = obj.content.indexOf("Left Vertical Sidebar", startIdx);
        if (startIdx !== -1 && endIdx !== -1) {
          match = obj.content.substring(startIdx, endIdx);
          fs.writeFileSync("scratch/original_nav.txt", match);
          console.log("Found real nav!");
          break;
        }
      }
    } catch(e) {}
  }
}
