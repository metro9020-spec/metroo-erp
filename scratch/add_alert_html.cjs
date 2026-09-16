const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(
  /onclick="window\.showYearEndModal\(\); event\.preventDefault\(\);"/g,
  `onclick="alert('Button clicked!'); window.showYearEndModal(); event.preventDefault();"`
);

html = html.replace(
  /onclick="window\.showSelectFinancialYearModal\(\); event\.preventDefault\(\);"/g,
  `onclick="alert('Button clicked!'); window.showSelectFinancialYearModal(); event.preventDefault();"`
);

fs.writeFileSync("index.html", html);
console.log("Added inline alert to index.html");
