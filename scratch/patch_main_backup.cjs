const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

js = js.replace(
  /fetch\(\`http\:\/\/\$\{window\.location\.hostname\}\:3001\/api\/backup\/\$\{activeId\}\`,/g,
  `const fyId = state.getActiveFyId();\n      fetch(\`http://\${window.location.hostname}:3001/api/backup/\${activeId}/\${fyId}\`,`
);

fs.writeFileSync("src/main.js", js);
console.log("Patched main.js backup path");
