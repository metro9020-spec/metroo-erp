const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");
main = main.replace(/window\.showYearEndModal[\s\S]*?(?=\/\/\s*Initialize App|document\.addEventListener)/, "");
main = main.replace(/window\.showSelectFinancialYearModal[\s\S]*?(?=\/\/\s*Initialize App|document\.addEventListener)/, "");
fs.writeFileSync("src/main.js", main);

let state = fs.readFileSync("src/state.js", "utf8");
state = state.replace(/runYearEndProcess[\s\S]*?(?=class StateManager)/, "");
state = state.replace(/getActiveFyId[\s\S]*?(?=\})/, "");
state = state.replace(/setActiveFyId[\s\S]*?(?=\})/, "");
fs.writeFileSync("src/state.js", state);

console.log("Rolled back main.js and state.js");
