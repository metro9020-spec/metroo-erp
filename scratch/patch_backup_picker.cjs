const fs = require("fs");
let js = fs.readFileSync("src/main.js", "utf8");

const oldLogic = `  const backupBtn = document.getElementById("menu-backup");
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
  }`;

const newLogic = `  const backupBtn = document.getElementById("menu-backup");
  if (backupBtn) {
    backupBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const activeId = state.getActiveCompanyId();
      if (!activeId) return alert("No active company.");
      const dataStr = localStorage.getItem("erp_company_data_" + activeId);
      if (!dataStr) return alert("No data to backup.");
      
      const dateStr = new Date().toISOString().split("T")[0];
      const defaultFilename = "erp_backup_" + activeId + "_" + dateStr + ".json";
      
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [{
              description: "JSON Backup File",
              accept: {"application/json": [".json"]}
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(dataStr);
          await writable.close();
          alert("Backup saved successfully!");
        } catch (err) {
          if (err.name !== "AbortError") {
            console.error(err);
            alert("Error saving backup: " + err.message);
          }
        }
      } else {
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = defaultFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  }`;

js = js.replace(oldLogic, newLogic);
fs.writeFileSync("src/main.js", js);
console.log("Patched main.js with FileSystem picker API");
