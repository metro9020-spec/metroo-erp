const fs = require("fs");
let state = fs.readFileSync("src/state.js", "utf8");

// Remove syncFromFirebase method entirely
state = state.replace(/async syncFromFirebase\(activeId\) \{[\s\S]*?\}\s*\}\s*catch \(e\) \{\s*console\.error\("Firebase background sync failed:", e\);\s*\}\s*\}/, "");
// Remove the call in loadState
state = state.replace(/this\.syncFromFirebase\(activeId\);/g, "");

fs.writeFileSync("src/state.js", state);
console.log("Removed firebase sync");
