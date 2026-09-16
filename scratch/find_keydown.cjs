const fs = require("fs");
const path = require("path");
const brain = "C:/Users/91702/.gemini/antigravity/brain";
const dirs = fs.readdirSync(brain);
let found = false;
dirs.forEach(d => {
  const p = path.join(brain, d, ".system_generated/logs/transcript_full.jsonl");
  if(fs.existsSync(p)) {
    const lines = fs.readFileSync(p, "utf8").split("\n");
    lines.forEach(l => {
      try {
        const obj = JSON.parse(l);
        if(obj.type === "VIEW_FILE" && obj.content && obj.content.includes("window.addEventListener(\"keydown\"") && obj.content.includes("document.addEventListener(\"DOMContentLoaded\"") && !found) {
          const chunk = obj.content.substring(obj.content.indexOf("// Keyboard shortcuts handlers"), obj.content.indexOf("document.addEventListener(\"DOMContentLoaded\""));
          fs.writeFileSync("scratch/found_keydown.txt", chunk);
          found = true;
          console.log("Found it!");
        }
      } catch(e){}
    });
  }
});
