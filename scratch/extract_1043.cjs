const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (let l of lines) {
  if (l.includes("\"step_index\":1043,")) {
    try {
      const obj = JSON.parse(l);
      fs.writeFileSync("scratch/step1043.txt", obj.content);
      console.log("Wrote step1043.txt");
    } catch(e) {}
    break;
  }
}
