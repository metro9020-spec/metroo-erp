const fs = require("fs");
let content = fs.readFileSync("src/state.js", "utf8");

content = content.replace(/fetch\(\/\`http:\\\/\\\/\\\$([^:]+):3001\\\/api\\\/data\\\/\\\$([^\/]+)\\\/default\`\//g, 'fetch(`http://${$1}:3001/api/data/${$2}/default`');

fs.writeFileSync("src/state.js", content);
