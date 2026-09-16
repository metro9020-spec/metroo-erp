const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");

main = main.replace(
  `  } else {
    if (appContainer) appContainer.style.display = "block";
    welcomeContainer.style.display = "none";`,
  `  } else {
    const style = document.getElementById("hide-app-style");
    if (style) style.remove();
    if (appContainer) appContainer.style.display = "block";
    welcomeContainer.style.display = "none";`
);

fs.writeFileSync("src/main.js", main);
console.log("Fixed style hide");
