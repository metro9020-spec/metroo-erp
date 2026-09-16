const fs = require("fs");
const code = fs.readFileSync("src/main.js", "utf8");
let depth = 0;
let inString = false;
let stringChar = '';
const lines = code.split('\n');
for(let i=0; i<lines.length; i++) {
  let l = lines[i];
  let inLineComment = false;
  for(let j=0; j<l.length; j++) {
    const c = l[j];
    if(inString) {
      if(c === '\\') j++;
      else if(c === stringChar) inString = false;
    } else {
      if(c === '/' && l[j+1] === '/') {
        break; // skip rest of line
      }
      if(c === '"' || c === "'" || c === '`') {
        inString = true;
        stringChar = c;
      }
      if(c === '{') depth++;
      if(c === '}') depth--;
    }
  }
  if (depth < 0) console.log('Negative depth at line', i+1);
}
console.log('Final depth:', depth);
