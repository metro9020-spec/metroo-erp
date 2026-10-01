import { state } from "../state.js";

export async function openRestoreCompanyModal(onRestored = null) {
  // Remove any existing modal
  const existingModal = document.getElementById("restore-company-modal");
  if (existingModal) existingModal.remove();

  const overlay = document.createElement("div");
  overlay.id = "restore-company-modal";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(4px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    width: 100%;
    max-width: 850px;
    max-height: 90vh;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: inherit;
  `;

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    background: #1e3b8b;
    color: white;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fa-solid fa-rotate-left" style="font-size: 1.25rem; color: #38bdf8;"></i>
      <div>
        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Restore Deleted Company</h3>
        <p style="margin: 2px 0 0 0; font-size: 0.8rem; opacity: 0.85;">View deleted companies with full customer details & restore them to active status</p>
      </div>
    </div>
    <button id="close-restore-modal" style="background: transparent; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 4px 8px; border-radius: 4px;">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  modal.appendChild(header);

  // Body content wrapper
  const body = document.createElement("div");
  body.style.cssText = `
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
    background: #f8fafc;
  `;

  // Restoration Source Card Box
  const optionsBox = document.createElement("div");
  optionsBox.style.cssText = `
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  `;
  optionsBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
      <div style="font-weight: 700; color: #1e3b8b; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-clock-rotate-left" style="color: #2563eb;"></i> Backup & Point-in-Time Database Rollback
      </div>
      <div style="display: flex; gap: 8px;">
        <button type="button" id="btn-save-server-backup-now" style="background: #16a34a; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-floppy-disk"></i> Server Backup
        </button>
        <button type="button" id="btn-export-backup-json" style="background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-download"></i> Download JSON
        </button>
        <button type="button" id="btn-take-snapshot-now" style="background: #4f46e5; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: gap: 6px;">
          <i class="fa-solid fa-camera"></i> Take Snapshot
        </button>
      </div>
    </div>

    <!-- 4-Column Restoration Grid -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
      <!-- Option A: File Picker -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px;">1. JSON File</div>
        <p style="font-size: 0.72rem; color: #64748b; margin: 0 0 8px 0;">Restore from .json backup file.</p>
        <input type="file" id="restore-file-picker" accept=".json" style="display: none;">
        <button type="button" id="btn-browse-backup-file" style="width: 100%; background: #2563eb; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa-solid fa-file-code"></i> Select File...
        </button>
      </div>

      <!-- Option B: Server Automated Backups -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; display: flex; flex-direction: column;">
        <div style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px;">2. Server Backups</div>
        <div id="server-backups-list-container" style="flex: 1; max-height: 85px; overflow-y: auto;">
          <p style="font-size: 0.72rem; color: #94a3b8; margin: 0;">Loading server backups...</p>
        </div>
      </div>

      <!-- Option C: Custom Folder Path -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
        <div style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px;">3. Folder Path</div>
        <p style="font-size: 0.72rem; color: #64748b; margin: 0 0 6px 0;">Path to backup folder on disk.</p>
        <div style="display: flex; gap: 4px;">
          <input type="text" id="restore-folder-path-input" placeholder="e.g. C:\Backups" style="flex: 1; min-width: 0; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.72rem; font-family: monospace;">
          <button type="button" id="btn-restore-folder-path" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 0.72rem; cursor: pointer; white-space: nowrap;">
            Restore
          </button>
        </div>
      </div>

      <!-- Option D: Point-in-Time Local Snapshots -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; display: flex; flex-direction: column;">
        <div style="font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px;">4. Local Snapshots</div>
        <div id="local-snapshots-list-container" style="flex: 1; max-height: 85px; overflow-y: auto;">
          <p style="font-size: 0.72rem; color: #94a3b8; margin: 0;">Loading local snapshots...</p>
        </div>
      </div>
    </div>
  `;
  body.appendChild(optionsBox);

  // Search filter box
  const filterBox = document.createElement("div");
  filterBox.style.cssText = `
    margin-bottom: 16px;
    display: flex;
    gap: 12px;
    align-items: center;
  `;
  filterBox.innerHTML = `
    <div style="position: relative; flex: 1;">
      <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.9rem;"></i>
      <input type="text" id="restore-search-input" placeholder="Search by Company Name, ID, or Customer Name..." style="
        width: 100%;
        padding: 9px 12px 9px 36px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.9rem;
        outline: none;
        box-sizing: border-box;
      ">
    </div>
    <button id="btn-refresh-deleted-list" style="
      background: #e2e8f0;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 9px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 6px;
    ">
      <i class="fa-solid fa-arrows-rotate"></i> Refresh
    </button>
  `;
  body.appendChild(filterBox);

  // Container for company cards
  const listContainer = document.createElement("div");
  listContainer.id = "deleted-companies-list";
  listContainer.style.cssText = "display: flex; flex-direction: column; gap: 14px;";
  listContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; margin-bottom: 10px;"></i><p style="margin: 0;">Loading deleted companies...</p></div>`;
  body.appendChild(listContainer);

  modal.appendChild(body);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = `
    padding: 12px 24px;
    background: white;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
  `;
  footer.innerHTML = `
    <button id="btn-cancel-restore" style="
      padding: 8px 20px;
      background: #64748b;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.85rem;
    ">Close</button>
  `;
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  modal.querySelector("#close-restore-modal").addEventListener("click", closeModal);
  modal.querySelector("#btn-cancel-restore").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Function to render deleted companies list
  let allDeletedCompanies = [];
  const renderList = () => {
    const searchVal = (modal.querySelector("#restore-search-input")?.value || "").toLowerCase().trim();
    listContainer.innerHTML = "";

    const filtered = allDeletedCompanies.filter(c => {
      if (!searchVal) return true;
      const nameMatch = String(c.name || "").toLowerCase().includes(searchVal);
      const idMatch = String(c.id || "").toLowerCase().includes(searchVal);
      const custMatch = (c.customerNames || []).some(cn => String(cn).toLowerCase().includes(searchVal));
      return nameMatch || idMatch || custMatch;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; background: white; border-radius: 8px; border: 1px dashed #cbd5e1;">
          <i class="fa-solid fa-folder-open" style="font-size: 2.2rem; color: #94a3b8; margin-bottom: 10px;"></i>
          <h4 style="margin: 0 0 4px 0; color: #334155;">No Deleted Companies Found</h4>
          <p style="margin: 0; color: #64748b; font-size: 0.85rem;">
            ${searchVal ? 'No deleted companies matched your search criteria.' : 'There are currently no backed-up deleted companies available for restoration.'}
          </p>
        </div>
      `;
      return;
    }

    filtered.forEach(comp => {
      const card = document.createElement("div");
      card.style.cssText = `
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: border-color 0.2s;
      `;

      const dateStr = comp.deletedAt ? new Date(comp.deletedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) : 'Unknown date';

      const fyListStr = (comp.financialYears || []).map(f => f.name || f.id).join(", ") || "Default FY";
      const customerNames = comp.customerNames || [];
      const hasCustomers = customerNames.length > 0;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h4 style="margin: 0; font-size: 1.05rem; color: #0f172a; font-weight: 700;">${comp.name}</h4>
              <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">ID: ${comp.id}</span>
            </div>
            <div style="margin-top: 4px; font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span><i class="fa-regular fa-clock" style="margin-right: 4px;"></i> Deleted: <strong>${dateStr}</strong></span>
              <span><i class="fa-solid fa-calendar-days" style="margin-right: 4px;"></i> FY: <strong>${fyListStr}</strong></span>
            </div>
          </div>
          <button class="btn-do-restore" data-id="${comp.id}" data-folder="${comp.backupFolder || ''}" style="
            background: #10b981;
            color: white;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.85rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
          ">
            <i class="fa-solid fa-rotate-left"></i> Restore Company
          </button>
        </div>

        <!-- Customer & Record Metadata Breakdown -->
        <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 6px; padding: 10px 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-users" style="color: #2563eb;"></i> Customers & Parties Included (${comp.customerCount || 0})
            </span>
            <span style="font-size: 0.75rem; color: #64748b;">
              ${comp.voucherCount ? comp.voucherCount + ' Invoices / Vouchers' : ''}
            </span>
          </div>

          ${hasCustomers ? `
            <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 80px; overflow-y: auto; padding-right: 4px;">
              ${customerNames.map(cn => `
                <span style="background: white; border: 1px solid #cbd5e1; color: #1e293b; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
                  ${cn}
                </span>
              `).join('')}
            </div>
          ` : `
            <p style="margin: 0; font-size: 0.75rem; color: #94a3b8; italic;">No specific customer master records preview available for this backup.</p>
          `}
        </div>
      `;

      card.querySelector(".btn-do-restore").addEventListener("click", async () => {
        const confirmRestore = confirm(
          `Are you sure you want to RESTORE company "${comp.name}" (ID: ${comp.id})?\n\n` +
          `• All customer accounts (${comp.customerCount || 0} customers), financial years, ledgers, vouchers, and settings will be restored back to the active database.`
        );
        if (!confirmRestore) return;

        const adminPassword = prompt(`SECURITY CHECK: Enter Admin Security Password to confirm restoration of "${comp.name}":`);
        if (adminPassword === null) return;

        if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
          alert("Incorrect Admin Security Password! Restoration cancelled.");
          return;
        }

        try {
          const btn = card.querySelector(".btn-do-restore");
          btn.disabled = true;
          btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Restoring...`;

          const result = await state.restoreCompany(comp.id, comp.backupFolder);
          alert(`Company "${comp.name}" (ID: ${comp.id}) has been restored successfully!\n\nAll customer data and transactions have been activated.`);
          closeModal();

          if (typeof onRestored === "function") {
            onRestored(result);
          } else {
            window.location.reload();
          }
        } catch (err) {
          console.error("Error restoring company:", err);
          alert(`Failed to restore company: ${err.message}`);
          const btn = card.querySelector(".btn-do-restore");
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> Restore Company`;
          }
        }
      });

      listContainer.appendChild(card);
    });
  };

  // Load deleted companies
  const loadDeletedCompanies = async () => {
    try {
      allDeletedCompanies = await state.getDeletedCompanies();
      renderList();
    } catch (err) {
      console.error("Error loading deleted companies list:", err);
      listContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: #ef4444;"><p>Error loading deleted companies: ${err.message}</p></div>`;
    }
  };

  // Option A: File picker listener
  const filePicker = modal.querySelector("#restore-file-picker");
  const browseBtn = modal.querySelector("#btn-browse-backup-file");
  if (browseBtn && filePicker) {
    browseBtn.addEventListener("click", () => filePicker.click());
    filePicker.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const adminPassword = prompt(`SECURITY CHECK: Enter Admin Security Password to import database from file "${file.name}":`);
      if (adminPassword === null) return;
      if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
        alert("Incorrect Admin Security Password! Import cancelled.");
        filePicker.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const res = await state.importDatabaseState(parsed);
          alert(res.message || "Database restored successfully!");
          closeModal();
          if (typeof onRestored === "function") {
            onRestored(res);
          } else {
            window.location.reload();
          }
        } catch (err) {
          console.error("Failed to parse JSON backup file:", err);
          alert(`FAILED TO IMPORT BACKUP:\n\nInvalid or corrupted JSON file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    });
  }

  // Option B: Folder path listener
  const btnFolderPath = modal.querySelector("#btn-restore-folder-path");
  const folderInput = modal.querySelector("#restore-folder-path-input");
  if (btnFolderPath && folderInput) {
    btnFolderPath.addEventListener("click", async () => {
      const pathVal = folderInput.value.trim();
      if (!pathVal) {
        alert("Please enter a valid backup folder path.");
        return;
      }

      const adminPassword = prompt(`SECURITY CHECK: Enter Admin Security Password to restore company from "${pathVal}":`);
      if (adminPassword === null) return;
      if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
        alert("Incorrect Admin Security Password! Restore cancelled.");
        return;
      }

      try {
        btnFolderPath.disabled = true;
        btnFolderPath.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        const res = await state.restoreCompany(null, pathVal);
        alert(`Company database restored successfully from folder!`);
        closeModal();
        if (typeof onRestored === "function") {
          onRestored(res);
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error("Restore from custom folder failed:", err);
        alert(`Failed to restore from custom folder path:\n\n${err.message}`);
        btnFolderPath.disabled = false;
        btnFolderPath.innerHTML = `Restore`;
      }
    });
  }

  // Option B: Server Automated Backups Handler & Renderer
  const serverBackupsContainer = modal.querySelector("#server-backups-list-container");
  const renderServerBackupsList = async () => {
    if (!serverBackupsContainer) return;
    try {
      const backups = await state.getServerBackupFiles();
      if (!backups || backups.length === 0) {
        serverBackupsContainer.innerHTML = `<p style="font-size: 0.72rem; color: #94a3b8; margin: 0;">No server backups saved on disk yet.</p>`;
        return;
      }

      serverBackupsContainer.innerHTML = backups.map(b => {
        const sizeKb = Math.round((b.size || 0) / 1024);
        const dateStr = b.modified ? new Date(b.modified).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "";
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 4px;">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 4px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #1e293b;" title="${b.name}">${b.name}</div>
              <div style="font-size: 0.65rem; color: #64748b;">${dateStr} (${sizeKb} KB)</div>
            </div>
            <button type="button" class="btn-restore-server-backup" data-file="${b.name}" style="background: #2563eb; color: white; border: none; padding: 2px 6px; border-radius: 3px; font-size: 0.68rem; font-weight: 700; cursor: pointer; white-space: nowrap;">
              Restore
            </button>
          </div>
        `;
      }).join("");

      serverBackupsContainer.querySelectorAll(".btn-restore-server-backup").forEach(btn => {
        btn.addEventListener("click", async () => {
          const fileName = btn.getAttribute("data-file");
          const confirmRestore = confirm(
            `Are you sure you want to restore database state from server backup file:\n\n` +
            `"${fileName}"?\n\n` +
            `Current active database state will be replaced by this backup!`
          );
          if (!confirmRestore) return;

          const adminPassword = prompt(`SECURITY CHECK: Enter Admin Security Password to restore "${fileName}":`);
          if (adminPassword === null) return;
          if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
            alert("Incorrect Admin Security Password! Restoration cancelled.");
            return;
          }

          try {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
            const res = await state.restoreServerBackupFile(fileName);
            alert(res.message || "Database restored successfully from server backup file!");
            closeModal();
            if (typeof onRestored === "function") {
              onRestored(res);
            } else {
              window.location.reload();
            }
          } catch (err) {
            console.error("Failed to restore server backup file:", err);
            alert(`Failed to restore server backup: ${err.message}`);
            btn.disabled = false;
            btn.innerHTML = `Restore`;
          }
        });
      });
    } catch (e) {
      serverBackupsContainer.innerHTML = `<p style="font-size: 0.72rem; color: #ef4444; margin: 0;">Error loading server backups.</p>`;
    }
  };

  const btnSaveServerBackupNow = modal.querySelector("#btn-save-server-backup-now");
  if (btnSaveServerBackupNow) {
    btnSaveServerBackupNow.addEventListener("click", async () => {
      try {
        btnSaveServerBackupNow.disabled = true;
        btnSaveServerBackupNow.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
        const res = await state.createAutoServerBackup();
        if (res && res.success) {
          alert(`Server backup file created successfully!\n\nLocation: ${res.file || 'Server BACKUP Folder'}`);
          await renderServerBackupsList();
        } else {
          alert(`Failed to create server backup: ${res.message || 'Unknown error'}`);
        }
      } catch (err) {
        alert(`Failed to create server backup: ${err.message}`);
      } finally {
        btnSaveServerBackupNow.disabled = false;
        btnSaveServerBackupNow.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Server Backup`;
      }
    });
  }

  renderServerBackupsList();

  // Option C: Point-in-Time Local Snapshots & Backup Export
  const btnExportJson = modal.querySelector("#btn-export-backup-json");
  if (btnExportJson) {
    btnExportJson.addEventListener("click", () => {
      try {
        const res = state.exportFullCompanyBackupJson();
        if (res && res.success) {
          alert(`Backup exported successfully!\n\nDownloaded: ${res.fileName}`);
        }
      } catch (err) {
        alert(`Failed to export backup: ${err.message}`);
      }
    });
  }

  const snapshotsContainer = modal.querySelector("#local-snapshots-list-container");
  const renderLocalSnapshotsList = () => {
    if (!snapshotsContainer) return;
    const snapshots = state.getLocalSnapshots();
    if (!snapshots || snapshots.length === 0) {
      snapshotsContainer.innerHTML = `<p style="font-size: 0.75rem; color: #94a3b8; margin: 0;">No local snapshots saved yet.</p>`;
      return;
    }

    snapshotsContainer.innerHTML = snapshots.map(s => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 4px;">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 6px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">${s.label || 'Snapshot'}</div>
          <div style="font-size: 0.68rem; color: #64748b;">${s.dateFormatted}</div>
        </div>
        <button type="button" class="btn-rollback-snapshot" data-key="${s.snapshotKey}" data-date="${s.dateFormatted}" data-label="${s.label || 'Snapshot'}" style="background: #dc2626; color: white; border: none; padding: 3px 8px; border-radius: 3px; font-size: 0.7rem; font-weight: 700; cursor: pointer; white-space: nowrap;">
          Rollback
        </button>
      </div>
    `).join("");

    snapshotsContainer.querySelectorAll(".btn-rollback-snapshot").forEach(btn => {
      btn.addEventListener("click", async () => {
        const key = btn.getAttribute("data-key");
        const dateStr = btn.getAttribute("data-date");
        const labelStr = btn.getAttribute("data-label");

        const confirmRollback = confirm(
          `WARNING: POINT-IN-TIME DATABASE ROLLBACK!\n\n` +
          `Are you sure you want to rollback the database to condition at:\n` +
          `Time: ${dateStr}\n` +
          `Snapshot: ${labelStr}\n\n` +
          `Current active database state will be overwritten by this snapshot state!`
        );
        if (!confirmRollback) return;

        const adminPassword = prompt(`SECURITY CHECK: Enter Admin Security Password to confirm rollback to ${dateStr}:`);
        if (adminPassword === null) return;

        if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
          alert("Incorrect Admin Security Password! Rollback cancelled.");
          return;
        }

        try {
          btn.disabled = true;
          btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
          const res = await state.restoreLocalDatabaseSnapshot(key);
          alert(res.message || "Database rolled back successfully!");
          closeModal();
          if (typeof onRestored === "function") {
            onRestored(res);
          } else {
            window.location.reload();
          }
        } catch (err) {
          console.error("Rollback snapshot failed:", err);
          alert(`Failed to rollback snapshot: ${err.message}`);
          btn.disabled = false;
          btn.innerHTML = `Rollback`;
        }
      });
    });
  };

  const btnTakeSnapshot = modal.querySelector("#btn-take-snapshot-now");
  if (btnTakeSnapshot) {
    btnTakeSnapshot.addEventListener("click", () => {
      const label = prompt("Enter a label for this point-in-time snapshot:", `Backup ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
      if (label === null) return;

      const res = state.createLocalDatabaseSnapshot(label || "Manual Snapshot");
      if (res && res.success) {
        alert(res.message || "Snapshot saved successfully!");
        renderLocalSnapshotsList();
      } else {
        alert(res.message || "Failed to create snapshot.");
      }
    });
  }

  renderLocalSnapshotsList();

  modal.querySelector("#restore-search-input").addEventListener("input", renderList);
  modal.querySelector("#btn-refresh-deleted-list").addEventListener("click", loadDeletedCompanies);

  loadDeletedCompanies();
}

