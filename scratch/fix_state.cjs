const fs = require("fs");
let content = fs.readFileSync("src/state.js", "utf8");

// We want to replace fetch(/\`http:\/\/\${window.location.hostname}:3001\/api\/data\/\${activeId}\/default\`/)
// with fetch(\`http://\${window.location.hostname}:3001/api/data/\${activeId}/default\`)

content = content.replace(/fetch\(\/\\`http:\\\/\\\/\\$\\{window\.location\.hostname\\}:3001\\\/api\\\/data\\\/\\$\\{activeId\\}\\\/default\\`\//g, 'fetch(`http://${window.location.hostname}:3001/api/data/${activeId}/default`');

// There might be another one:
content = content.replace(/fetch\(\/\\`http:\\\/\\\/\\$\\{window\.location\.hostname\\}:3001\\\/api\\\/data\\\/\\$\\{activeId\\}\\\/default\\`\/, {/g, 'fetch(`http://${window.location.hostname}:3001/api/data/${activeId}/default`, {');

// Just to be safe, let's fix any occurrences of /\\`http:\/\/\${window.location.hostname}:3001...
content = content.replace(/\/\`http:\\\/\\\/(\$\{[^\}]+\}):3001([^\`]*)\`\//g, '`http://$1:3001$2`');

fs.writeFileSync("src/state.js", content);
console.log("Fixed state.js fetch regex");
