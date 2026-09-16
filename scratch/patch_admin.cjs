const fs = require("fs");
let js = fs.readFileSync("src/views/admin.js", "utf8");

const yearEndHtml = `
      <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 1.5rem;">
        <h3 style="font-size: 1.1rem; font-family: var(--font-heading); color: var(--accent-color); margin-bottom: 10px;">Accounting Period Ending</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Process year-end, calculate closing balances, and automatically generate opening balances for a new Financial Year.</p>
        <button type="button" id="btn-run-yearend" class="btn btn-primary" style="background-color: var(--warning-color); border: none;">
          <i class="fa-solid fa-calendar-check"></i> Run Accounting Period Ending
        </button>
      </div>
`;

js = js.replace(`</form>`, `</form>\n${yearEndHtml}`);

const jsLogic = `
  const btnYearEnd = document.getElementById("btn-run-yearend");
  if (btnYearEnd) {
    btnYearEnd.addEventListener("click", () => {
      const activeCompanyId = state.getActiveCompanyId();
      const companies = state.getRegisteredCompanies();
      const comp = companies.find(c => c.id === activeCompanyId);
      if (!comp) return;

      const fyName = prompt("Enter the name for the new Financial Year (e.g., 01-Apr-2027 to 31-Mar-2028):\\nThis will close the current year and generate opening balances.");
      if (fyName && fyName.trim().length > 0) {
        if (confirm("Are you sure? This will create a new Financial Year and switch you to it immediately.")) {
          const newFyId = "FY" + Date.now();
          const success = state.runYearEndProcess(newFyId, fyName.trim());
          if (success) {
            alert("Year Ending Process completed successfully! You are now in the new Financial Year.");
            window.location.reload();
          } else {
            alert("Failed to run year-ending process.");
          }
        }
      }
    });
  }
`;

js = js.replace(`  document.getElementById("admin-password-form").addEventListener("submit",`, `${jsLogic}\n  document.getElementById("admin-password-form").addEventListener("submit",`);

fs.writeFileSync("src/views/admin.js", js);
console.log("Patched admin.js with year ending UI");
