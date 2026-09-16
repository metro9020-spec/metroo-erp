const fs = require("fs");
let state = fs.readFileSync("src/state.js", "utf8");

// Fix syncFromServer fetch
state = state.replace(
  /\`http:\/\/\${window\.location\.hostname}:3001\/api\/data\/\${activeId}\`/g,
  /\`http:\/\/\${window.location.hostname}:3001\/api\/data\/\${activeId}\/default\`/
);

fs.writeFileSync("src/state.js", state);
console.log("Fixed fyId in fetch");
