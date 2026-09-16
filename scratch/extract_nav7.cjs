const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (let l of lines) {
  if (l.includes("erp-menu-bar")) {
    // parse as JSON if possible to decode automatically!
    try {
      const obj = JSON.parse(l);
      if (obj.content && obj.content.includes("erp-menu-bar")) {
        const c = obj.content;
        const start = c.indexOf("<nav class=\"erp-menu-bar\">");
        const end = c.indexOf("</nav>", start);
        if (start !== -1 && end !== -1) {
          fs.writeFileSync("scratch/original_nav.txt", c.substring(start, end + 6));
          console.log("Extracted via JSON parse!");
          break;
        }
      }
    } catch(e) {}
  }
}
