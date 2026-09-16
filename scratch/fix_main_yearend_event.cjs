const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const bindMenuCode = `
  const yearEndBtn = document.getElementById("menu-year-ending");
  if (yearEndBtn) {
    yearEndBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const fyName = prompt("Enter the name for the new Financial Year (e.g., 01-Apr-2027 to 31-Mar-2028):\\nThis will close the current year and generate opening balances.");
      if (fyName && fyName.trim().length > 0) {
        if (confirm("Are you sure? This will create a new Financial Year and switch you to it immediately.")) {
          const newFyId = "FY" + Date.now();
          const success = state.runYearEndProcess(newFyId, fyName.trim());
          if (success) {
            alert("Year Ending Process completed successfully! You are now in the new Financial Year.");
            setTimeout(() => window.location.reload(), 1000);
          } else {
            alert("Failed to run year-ending process.");
          }
        }
      }
    });
  }
`;

js = js.replace(`  const backupBtn = document.getElementById("menu-backup");`, `${bindMenuCode}\n  const backupBtn = document.getElementById("menu-backup");`);

fs.writeFileSync("src/main.js", js);
console.log("Patched main.js with menu binding properly");
