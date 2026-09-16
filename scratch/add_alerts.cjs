const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

js = js.replace(/window\.showYearEndModal = function\(\) \{/, `window.showYearEndModal = function() { alert("Year end modal function called");`);
js = js.replace(/window\.showSelectFinancialYearModal = function\(\) \{/, `window.showSelectFinancialYearModal = function() { alert("Select FY modal function called");`);

fs.writeFileSync("src/main.js", js);
console.log("Added alerts to modals");
