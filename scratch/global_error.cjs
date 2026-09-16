const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const errorHandler = `
<script>
window.onerror = function(message, source, lineno, colno, error) {
  alert("Global Error: " + message + " at " + source + ":" + lineno);
};
window.addEventListener("unhandledrejection", function(event) {
  alert("Unhandled Promise Rejection: " + event.reason);
});
</script>
`;

if (!html.includes("window.onerror = function")) {
  html = html.replace("<head>", "<head>" + errorHandler);
  fs.writeFileSync("index.html", html);
  console.log("Injected global error handler");
} else {
  console.log("Global error handler already present");
}
