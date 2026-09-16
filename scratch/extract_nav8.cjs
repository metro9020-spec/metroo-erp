const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (let l of lines) {
  if (l.includes("erp-menu-bar")) {
    const start = l.indexOf("erp-menu-bar") - 13;
    const end = l.indexOf("nav>", start) + 4;
    if (end > start) {
      let raw = l.substring(start, end);
      raw = raw.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
      fs.writeFileSync("scratch/original_nav.txt", raw);
      console.log("Raw extraction!");
      break;
    }
  }
}
