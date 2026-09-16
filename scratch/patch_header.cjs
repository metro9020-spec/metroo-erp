const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const oldHeader = `      if (current) {
        label.textContent = current.name + " (" + state.getLoginDate() + ")";
      }`;

const newHeader = `      if (current) {
        let fyStr = "";
        const activeFyId = state.getActiveFyId();
        if (current.financialYears && activeFyId && activeFyId !== "default") {
           const fy = current.financialYears.find(f => f.id === activeFyId);
           if (fy) fyStr = " | " + fy.name;
        }
        label.innerHTML = current.name + " (" + state.getLoginDate() + ") <span style=\\"color:var(--warning-color); font-size:0.85rem;\\">" + fyStr + "</span>";
      }`;

js = js.replace(oldHeader, newHeader);
fs.writeFileSync("src/main.js", js);
console.log("Patched header to show FY");
