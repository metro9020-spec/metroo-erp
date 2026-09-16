const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (let l of lines) {
  if (l.includes("<nav class=\\\"erp-menu-bar\\\">")) {
    const startIdx = l.indexOf("<nav class=\\\"erp-menu-bar\\\">");
    const endIdx = l.indexOf("<\\/nav>", startIdx);
    if (endIdx !== -1) {
      let match = l.substring(startIdx, endIdx + 7);
      match = match.replace(/\\r\\n/g, "\n").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
      fs.writeFileSync("scratch/original_nav.txt", match);
      console.log("Found real nav!");
      break;
    }
  }
}
