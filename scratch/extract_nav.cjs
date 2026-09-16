const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
let found = false;
for (let l of lines) {
  const idx = l.indexOf("<nav class=\\\"erp-menu-bar\\\">");
  if (idx !== -1) {
    const endIdx = l.indexOf("<\\/nav>", idx);
    if (endIdx !== -1) {
      let nav = l.substring(idx, endIdx + 7);
      nav = nav.replace(/\\n/g, "\n").replace(/\\"/g, "\"");
      fs.writeFileSync("scratch/original_nav.txt", nav);
      console.log("Found it!");
      found = true;
      break;
    }
  }
}
if(!found) console.log("Not found!");

