const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const oldMenuListenerRegex = /const yearEndBtn = document\.getElementById\("menu-year-ending"\);[\s\S]*?\}\);[\s\S]*?\}/;

const newMenuListener = `const yearEndBtn = document.getElementById("menu-year-ending");
    if (yearEndBtn) {
      yearEndBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.showYearEndModal();
      });
    }`;

js = js.replace(oldMenuListenerRegex, newMenuListener);

fs.writeFileSync("src/main.js", js);
console.log("Patched main.js with year end modal listener");
