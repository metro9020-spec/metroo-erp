const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

js = js.replace(/const fyId = state\.getActiveFyId\(\);\\n        const res = await fetch/g, 
"const fyId = state.getActiveFyId();\n        const res = await fetch");

fs.writeFileSync("src/main.js", js);
console.log("Fixed main.js syntax error properly");
