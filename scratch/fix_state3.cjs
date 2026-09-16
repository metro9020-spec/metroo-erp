const fs = require("fs");
let content = fs.readFileSync("src/state.js", "utf8");

const badString = "fetch(/\\`http:\\/\\/\\${window.location.hostname}:3001\\/api\\/data\\/\\${activeId}\\/default\\`/)";
const goodString = "fetch(`http://${window.location.hostname}:3001/api/data/${activeId}/default`)";

content = content.replace(badString, goodString);
content = content.replace(badString.replace(")", ", {"), goodString.replace(")", ", {"));

fs.writeFileSync("src/state.js", content);
console.log(content.includes(badString) ? "STILL THERE" : "FIXED");
