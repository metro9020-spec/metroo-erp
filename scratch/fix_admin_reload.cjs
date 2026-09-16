const fs = require("fs");
let js = fs.readFileSync("src/views/admin.js", "utf8");

js = js.replace(
  /alert\("Year Ending Process completed successfully! You are now in the new Financial Year\."\);\s*window\.location\.reload\(\);/g,
  `alert("Year Ending Process completed successfully! You are now in the new Financial Year.");\n            setTimeout(() => window.location.reload(), 1000);`
);

fs.writeFileSync("src/views/admin.js", js);
console.log("Fixed admin.js reload race condition");
