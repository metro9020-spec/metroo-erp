const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
const s = new Set();
for (let l of lines) {
  const matches = l.match(/id=\\"menu-[a-zA-Z0-9-]+\\"&gt;(.*?)&lt;\/a&gt;/g);
  if (matches) matches.forEach(x => s.add(x));
  
  const matches2 = l.match(/id=\\"menu-[a-zA-Z0-9-]+\\">(.*?)<\/a>/g);
  if (matches2) matches2.forEach(x => s.add(x));

  const matches3 = l.match(/id="menu-[a-zA-Z0-9-]+">(.*?)<\/a>/g);
  if (matches3) matches3.forEach(x => s.add(x));
}
console.log(Array.from(s).join("\n"));
