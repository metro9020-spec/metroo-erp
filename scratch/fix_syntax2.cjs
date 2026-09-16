const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");
main = main.replace(
  /const selectFyBtn = document\.getElementById\("menu-select-fy"\);\s*document\.addEventListener\("DOMContentLoaded", \(\) => \{/,
  `});\n\ndocument.addEventListener("DOMContentLoaded", () => {`
);
fs.writeFileSync("src/main.js", main);
console.log("Fixed main.js syntax exactly");
