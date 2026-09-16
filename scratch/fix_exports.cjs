const fs = require("fs");
let state = fs.readFileSync("src/state.js", "utf8");
state = state.replace("module.exports = { StateManager, ACCOUNTS };", "export { state, ACCOUNTS };");
state = state.replace("const ACCOUNTS = {", "export const ACCOUNTS = {");
// wait, if I export ACCOUNTS at the end, I don`t need `export const ACCOUNTS` at the top.
// let`s just do export { state, ACCOUNTS };
fs.writeFileSync("src/state.js", state);
console.log("Fixed exports");
