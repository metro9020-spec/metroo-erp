const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (let l of lines) {
  const startIdx = l.indexOf("Top Horizontal Menu Bar");
  if (startIdx !== -1) {
    const endIdx = l.indexOf("Left Vertical Sidebar", startIdx);
    if (endIdx !== -1) {
      let snippet = l.substring(startIdx, endIdx);
      snippet = snippet.replace(/\\r\\n/g, "\n").replace(/\\"/g, "\"");
      fs.writeFileSync("scratch/original_nav.txt", snippet);
      console.log("Found and wrote original_nav.txt");
      break;
    }
  }
}

