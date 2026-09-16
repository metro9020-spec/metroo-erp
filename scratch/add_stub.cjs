const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const stub = `
<script>
window.showYearEndModal = function() {
  alert("Please wait, the application is still loading...");
};
window.showSelectFinancialYearModal = function() {
  alert("Please wait, the application is still loading...");
};
</script>
`;

if (!html.includes("Please wait, the application is still loading")) {
  html = html.replace("</head>", stub + "</head>");
  fs.writeFileSync("index.html", html);
  console.log("Added stubs to index.html");
}
