const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const backupRestoreLogic = `
  const backupBtn = document.getElementById("menu-backup");
  if (backupBtn) {
    backupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const activeId = state.getActiveCompanyId();
      if (!activeId) return alert("No active company.");
      const dataStr = localStorage.getItem("erp_company_data_" + activeId);
      if (!dataStr) return alert("No data to backup.");
      
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = "erp_backup_" + activeId + "_" + dateStr + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  const restoreBtn = document.getElementById("menu-restore");
  if (restoreBtn) {
    restoreBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const activeId = state.getActiveCompanyId();
      if (!activeId) return alert("No active company.");
      
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (data && data.ledgers && data.transactions) {
              if (confirm("Are you sure you want to restore? This will OVERWRITE your current company data!")) {
                localStorage.setItem("erp_company_data_" + activeId, JSON.stringify(data));
                alert("Restore successful! Reloading application...");
                window.location.reload();
              }
            } else {
              alert("Invalid backup file format.");
            }
          } catch(err) {
            alert("Error parsing backup file.");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }
`;

js = js.replace(
  `const deleteCompanyBtn = document.getElementById("menu-delete-company");`,
  backupRestoreLogic + `\r\n  const deleteCompanyBtn = document.getElementById("menu-delete-company");`
);

fs.writeFileSync("src/main.js", js);
console.log("Patched main.js with backup logic");
