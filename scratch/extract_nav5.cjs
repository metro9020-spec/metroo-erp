const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (let l of lines) {
  if (l.includes("erp-menu-bar")) {
    console.log("Found line with erp-menu-bar");
    const idx = l.indexOf("erp-menu-bar");
    console.log(l.substring(idx - 20, idx + 200));
    break;
  }
}
