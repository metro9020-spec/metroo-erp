const fs = require("fs");
let stateJs = fs.readFileSync("src/state.js", "utf8");
stateJs = stateJs.replace(/http:\/\/localhost:3001/g, "http://" + window.location.hostname + ":3001");
fs.writeFileSync("src/state.js", stateJs);

let mainJs = fs.readFileSync("src/main.js", "utf8");
mainJs = mainJs.replace(/http:\/\/localhost:3001/g, "http://" + window.location.hostname + ":3001");
fs.writeFileSync("src/main.js", mainJs);

console.log("Fixed hostnames");
