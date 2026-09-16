const fs = require("fs");
let state = fs.readFileSync("src/state.js", "utf8");
state = state.replace("export { state, ACCOUNTS };", "export { state };");
fs.writeFileSync("src/state.js", state);
console.log("Fixed exports 2");
