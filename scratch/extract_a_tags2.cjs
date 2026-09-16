const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
const s = new Set();
for (let l of lines) {
  let idx = 0;
  while ((idx = l.indexOf("id=\\\"menu-", idx)) !== -1) {
    const start = l.lastIndexOf("<a ", idx);
    let end = l.indexOf("&lt;/a&gt;", idx);
    if (end === -1) end = l.indexOf("</a>", idx);
    if (start !== -1 && end !== -1 && end > start && (end - start) < 300) {
      let tag = l.substring(start, end + 10);
      tag = tag.replace(/\\\\"/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\\"/g, "\"");
      // clean up tail
      const cleanEnd = tag.indexOf("</a>");
      if (cleanEnd !== -1) tag = tag.substring(0, cleanEnd + 4);
      s.add(tag);
    }
    idx += 10;
  }
}
fs.writeFileSync("scratch/all_a_tags.txt", Array.from(s).join("\n"));
console.log("Wrote a tags");
