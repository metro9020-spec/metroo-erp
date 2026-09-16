const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
const s = new Set();
for (let l of lines) {
  const m1 = l.match(/<a href=[^\s]+ id=\\\"menu-[a-zA-Z0-9-]+\\\".*?&lt;\/a&gt;/g);
  if (m1) m1.forEach(x => s.add(x.replace(/\\\\"/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">")));
  
  const m2 = l.match(/<a href=[^\s]+ id="menu-[a-zA-Z0-9-]+".*?<\/a>/g);
  if (m2) m2.forEach(x => s.add(x));
  
  const m3 = l.match(/<a href=\\"[^"]+\\" id=\\"menu-[a-zA-Z0-9-]+\\".*?&lt;\/a&gt;/g);
  if (m3) m3.forEach(x => s.add(x.replace(/\\\\"/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">")));
  
  const m4 = l.match(/<a href="[^"]+" id="menu-[a-zA-Z0-9-]+".*?<\/a>/g);
  if (m4) m4.forEach(x => s.add(x));
}
console.log(Array.from(s).join("\n"));
