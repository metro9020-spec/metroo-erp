const fs = require("fs");
const lines = fs.readFileSync("C:/Users/91702/.gemini/antigravity/brain/4eb30e9b-6266-456f-9693-9635f6d8fe70/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (let i = 0; i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.tool_calls) {
      for (const tc of obj.tool_calls) {
        if (tc.function.name === "default_api:view_file") {
          console.log("Step " + obj.step_index + ": view_file " + tc.function.arguments);
        } else if (tc.function.name === "default_api:run_command" && tc.function.arguments.includes("cat ")) {
          console.log("Step " + obj.step_index + ": run_command cat " + tc.function.arguments);
        }
      }
    }
  } catch(e) {}
}
