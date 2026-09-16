import { state } from "../state.js";

export function showGstr1OfflineModal() {
  const root = document.getElementById("modal-container-root");
  
  // Set default month to previous month or current month
  const now = new Date();
  let defaultYear = now.getFullYear();
  let defaultMonth = now.getMonth() + 1; // 1-12

  // Default export folder
  let exportFolderPath = "C:\\GSTR1_Offline_Export";

  function renderContent() {
    root.innerHTML = `
      <div class="modal-overlay active" id="gstr1-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(2px); z-index:2000;">
        <div class="modal-container" style="max-width: 680px; width: 95%; background-color: #cbd5e1; color: #0f172a; padding: 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #3b82f6; border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); margin: auto;">
          
          <!-- Header Ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #2563eb 100%); color: white; display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; font-weight: 700; font-size: 0.95rem; border-radius: 4px 4px 0 0; border-bottom: 1px solid #1d4ed8; margin: -15px -15px 15px -15px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-file-csv" style="color: #60a5fa; font-size: 1.1rem;"></i> GSTR-1 OFFLINE EXPORT UTILITY
            </div>
            <button style="background:none; border:none; color:white; font-size:1.3rem; cursor:pointer; line-height: 1;" id="gstr1-close-header">&times;</button>
          </div>

          <div style="background: #f8fafc; padding: 16px; border: 1px solid #94a3b8; border-radius: 4px; display: flex; flex-direction: column; gap: 16px;">
            
            <!-- Information Callout -->
            <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 10px 12px; border-radius: 2px; font-size: 0.82rem; color: #1e40af; line-height: 1.4;">
              <strong>GST Portal Offline Tool Utility:</strong><br>
              Select the return period (month & year) and destination folder. Clicking <strong>Export CSV Files</strong> will generate all official GST Offline Tool compatible CSV files (b2b.csv, b2cs.csv, hsn.csv, cdnr.csv, docs.csv, etc.) ready for upload into the GSTR-1 Offline Tool.
            </div>

            <!-- Month Selector -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 0.83rem; font-weight: bold; color: #1e293b;">Return Period (Month):</label>
              <select id="gstr1-month-select" style="padding: 6px 10px; border: 1px solid #64748b; border-radius: 3px; font-size: 0.85rem; background: white; color: black; font-weight: 600; width: 100%;"></select>
            </div>

            <!-- Folder Selector -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 0.83rem; font-weight: bold; color: #1e293b;">Choose Export Folder Path:</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="gstr1-folder-path" value="${exportFolderPath}" style="flex: 1; padding: 6px 10px; border: 1px solid #64748b; border-radius: 3px; font-size: 0.85rem; font-family: monospace; background: white; color: black;" placeholder="e.g. C:\GSTR1_Offline_Export">
                <input type="file" id="gstr1-folder-picker" webkitdirectory directory style="display: none;">
                <button type="button" id="gstr1-btn-browse" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 14px; font-weight: bold; cursor: pointer; font-size: 0.8rem; border-radius: 3px; color: black; display: flex; align-items: center; gap: 5px;">
                  <i class="fa-solid fa-folder-open" style="color: #d97706;"></i> Browse...
                </button>
              </div>
            </div>

            <!-- Folder Browser Modal Section -->
            <div id="gstr1-browser-container" style="display: none; background: #e2e8f0; border: 1px solid #94a3b8; border-radius: 3px; padding: 10px; max-height: 200px; overflow-y: auto;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-weight: bold; font-size: 0.8rem; color: #1e293b;">
                <span id="gstr1-current-dir-label">Select Directory:</span>
                <button id="gstr1-btn-up-dir" style="padding: 2px 8px; font-size: 0.75rem; background: #cbd5e1; border: 1px solid #64748b; border-radius: 2px; cursor: pointer;">&uarr; Up / Drives</button>
              </div>
              <div id="gstr1-dir-list" style="display: flex; flex-direction: column; gap: 2px;"></div>
            </div>

            <!-- List of files to be generated summary -->
            <div style="background: white; border: 1px solid #cbd5e1; padding: 10px; border-radius: 3px;">
              <div style="font-weight: bold; font-size: 0.78rem; color: #334155; margin-bottom: 6px; text-transform: uppercase;">CSV Files Generated for GSTR-1 Tool:</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.78rem; color: #475569;">
                <div><i class="fa-solid fa-check-circle" style="color: #16a34a;"></i> <strong>b2b.csv</strong> (B2B Invoices)</div>
                <div><i class="fa-solid fa-check-circle" style="color: #16a34a;"></i> <strong>b2cs.csv</strong> (B2C Small Sales)</div>
                <div><i class="fa-solid fa-check-circle" style="color: #16a34a;"></i> <strong>b2b_hsn.csv</strong> (B2B HSN Summary)</div>
                <div><i class="fa-solid fa-check-circle" style="color: #16a34a;"></i> <strong>b2c_hsn.csv</strong> (B2C HSN Summary)</div>
                <div><i class="fa-solid fa-check-circle" style="color: #16a34a;"></i> <strong>hsn.csv</strong> (Total HSN Summary)</div>
                <div><i class="fa-solid fa-check-circle" style="color: #16a34a;"></i> <strong>cdnr.csv</strong> (Credit / Debit Notes)</div>
                <div><i class="fa-solid fa-check-circle" style="color: #16a34a;"></i> <strong>docs.csv</strong> (Document Summary)</div>
                <div><i class="fa-solid fa-check-circle" style="color: #16a34a;"></i> <strong>nil.csv</strong> (Nil Rated / Exempt)</div>
              </div>
            </div>

          </div>

          <!-- Bottom Action Buttons -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; padding-top: 10px; border-top: 1px solid #cbd5e1;">
            <button type="button" id="gstr1-btn-export" style="background: linear-gradient(180deg, #16a34a 0%, #15803d 100%); border: 1px solid #166534; padding: 8px 24px; color: white; font-size: 0.88rem; cursor: pointer; font-weight: bold; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-file-export"></i> Export
            </button>
            <button type="button" id="gstr1-btn-close" style="background: #e2e8f0; border: 1px solid #475569; padding: 8px 20px; color: black; font-size: 0.85rem; cursor: pointer; font-weight: bold; border-radius: 4px;">Close</button>
          </div>

        </div>
      </div>
    `;

    // Populate months in Financial Year order (April to March), showing only months with active sales transactions
    const updateActiveMonthOptions = () => {
      const monthSelect = document.getElementById("gstr1-month-select");
      if (!monthSelect) return;

      const invoices = state.getInvoices ? state.getInvoices() : [];
      const salesReturns = state.getSalesReturns ? state.getSalesReturns() : [];

      const activeMonthsSet = new Set();

      invoices.forEach(inv => {
        if (inv.isCanceled || inv.status === "canceled") return;
        const d = inv.date || inv.invoiceDate;
        if (d && typeof d === "string") {
          const parts = d.split("-");
          if (parts.length >= 2) {
            const m = parseInt(parts[1], 10);
            if (!isNaN(m)) activeMonthsSet.add(m);
          }
        }
      });

      salesReturns.forEach(sr => {
        if (sr.isCanceled) return;
        const d = sr.date || sr.returnDate;
        if (d && typeof d === "string") {
          const parts = d.split("-");
          if (parts.length >= 2) {
            const m = parseInt(parts[1], 10);
            if (!isNaN(m)) activeMonthsSet.add(m);
          }
        }
      });

      const monthNames = {
        4: "April", 5: "May", 6: "June", 7: "July", 8: "August", 9: "September",
        10: "October", 11: "November", 12: "December", 1: "January", 2: "February", 3: "March"
      };

      // Financial Year order: April (4) to March (3)
      const fyMonthOrder = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
      let displayMonths = fyMonthOrder.filter(m => activeMonthsSet.has(m));

      // Fallback if no invoices exist in database
      if (displayMonths.length === 0) {
        displayMonths = fyMonthOrder;
      }

      monthSelect.innerHTML = "";

      displayMonths.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = monthNames[m];
        if (m === defaultMonth) {
          opt.selected = true;
        }
        monthSelect.appendChild(opt);
      });

      if (!monthSelect.value && monthSelect.options.length > 0) {
        monthSelect.options[0].selected = true;
      }
    };

    updateActiveMonthOptions();

    // Hook Close Buttons
    const closeOverlay = () => {
      const overlay = document.getElementById("gstr1-modal-overlay");
      if (overlay) overlay.classList.remove("active");
      root.innerHTML = "";
    };
    document.getElementById("gstr1-close-header").addEventListener("click", closeOverlay);
    document.getElementById("gstr1-btn-close").addEventListener("click", closeOverlay);

    async function fetchFromBackend(endpoint, options) {
      const host = window.location.hostname || "localhost";
      const targetUrl = `http://${host}:3001${endpoint}`;
      
      try {
        const res = await fetch(targetUrl, options);
        if (res.ok) {
          return res;
        } else {
          const txt = await res.text();
          return { _error: new Error(`HTTP ${res.status} from ${targetUrl}: ${txt.substring(0, 150)}`) };
        }
      } catch (e) {
        if (host !== "localhost" && host !== "127.0.0.1") {
          try {
            const fallbackUrl = `http://localhost:3001${endpoint}`;
            const fallbackRes = await fetch(fallbackUrl, options);
            if (fallbackRes.ok) return fallbackRes;
          } catch (fbErr) {}
        }
        return { _error: new Error(`Could not connect to ${targetUrl}: ${e.message}`) };
      }
    }

    // Folder Browser Logic
    const browseBtn = document.getElementById("gstr1-btn-browse");
    const folderPicker = document.getElementById("gstr1-folder-picker");
    const browserContainer = document.getElementById("gstr1-browser-container");
    const folderInput = document.getElementById("gstr1-folder-path");
    const dirListEl = document.getElementById("gstr1-dir-list");
    const currentDirLabel = document.getElementById("gstr1-current-dir-label");
    const upDirBtn = document.getElementById("gstr1-btn-up-dir");

    let currentBrowsePath = "";

    async function loadDirectory(dirPath) {
      if (!browserContainer) return;
      browserContainer.style.display = "block";
      dirListEl.innerHTML = `<div style="font-size: 0.78rem; color: #1e3a8a; font-weight: bold; padding: 6px;"><i class="fa-solid fa-spinner fa-spin"></i> Reading drives & folders...</div>`;

      try {
        const res = await fetchFromBackend("/api/filesystem/browse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dir: dirPath || "" })
        });

        if (res && !res._error) {
          const data = await res.json();
          currentBrowsePath = data.currentDir || "";
          currentDirLabel.textContent = currentBrowsePath ? `Location: ${currentBrowsePath}` : "Select Drive / Folder:";
          
          if (currentBrowsePath) {
            folderInput.value = currentBrowsePath;
          }

          dirListEl.innerHTML = "";

          // Confirm Folder Button Header
          if (currentBrowsePath) {
            const confirmRow = document.createElement("div");
            confirmRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#dbeafe; border:1px solid #93c5fd; padding:6px 10px; margin-bottom:6px; border-radius:3px;";
            confirmRow.innerHTML = `
              <span style="font-size:0.78rem; color:#1e40af; font-weight:bold;"><i class="fa-solid fa-folder-open"></i> ${currentBrowsePath}</span>
              <button type="button" class="btn-select-this" style="background:#2563eb; color:white; border:none; padding:4px 12px; font-size:0.75rem; font-weight:bold; border-radius:3px; cursor:pointer;">
                <i class="fa-solid fa-check"></i> Select This Folder
              </button>
            `;
            confirmRow.querySelector(".btn-select-this").addEventListener("click", (ev) => {
              ev.preventDefault();
              folderInput.value = currentBrowsePath;
              browserContainer.style.display = "none";
            });
            dirListEl.appendChild(confirmRow);
          }

          if (data.subdirs && data.subdirs.length > 0) {
            data.subdirs.forEach(sDir => {
              const name = sDir.split("\\").filter(Boolean).pop() || sDir;
              const btn = document.createElement("button");
              btn.type = "button";
              btn.style.cssText = "text-align:left; padding:5px 8px; font-size:0.78rem; background:white; border:1px solid #cbd5e1; cursor:pointer; border-radius:3px; display:flex; align-items:center; gap:6px; margin-bottom:3px; width:100%; color:#0f172a;";
              btn.innerHTML = `<i class="fa-solid fa-folder" style="color:#d97706;"></i> <span style="font-weight:600;">${name}</span> <span style="font-size:0.7rem; color:#64748b; margin-left:auto;">${sDir}</span>`;
              btn.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                folderInput.value = sDir;
                loadDirectory(sDir);
              });
              dirListEl.appendChild(btn);
            });
          } else if (currentBrowsePath) {
            const emptyNotice = document.createElement("div");
            emptyNotice.style.cssText = "font-size:0.78rem; color:#16a34a; padding:6px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:3px; font-weight:bold; text-align:center;";
            emptyNotice.innerHTML = `<i class="fa-solid fa-check-circle"></i> Folder ready: ${currentBrowsePath}`;
            dirListEl.appendChild(emptyNotice);
          }
          return;
        }
      } catch (err) {
        console.error("Directory browse error:", err);
      }

      dirListEl.innerHTML = `<div style="font-size:0.78rem; color:#475569; padding:6px;">Type desired folder path above or choose a drive.</div>`;
    }

    // Browse Button toggle
    browseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isVisible = browserContainer.style.display !== "none";
      if (isVisible) {
        browserContainer.style.display = "none";
      } else {
        loadDirectory(folderInput.value.trim());
      }
    });

    if (upDirBtn) {
      upDirBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!currentBrowsePath) {
          loadDirectory("");
          return;
        }
        const clean = currentBrowsePath.replace(/\\+$/, "");
        const idx = clean.lastIndexOf("\\");
        if (idx !== -1) {
          const parent = clean.substring(0, idx);
          loadDirectory(parent.endsWith(":") ? parent + "\\" : parent);
        } else {
          loadDirectory("");
        }
      });
    }

    // 1. Native Windows Folder Picker trigger fallback
    if (folderPicker) {
      folderPicker.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const firstFile = e.target.files[0];
          let folderName = "";

          if (firstFile.path) {
            const fullPath = firstFile.path;
            const lastSep = Math.max(fullPath.lastIndexOf("/"), fullPath.lastIndexOf("\\"));
            folderName = lastSep !== -1 ? fullPath.substring(0, lastSep) : fullPath;
          } else if (firstFile.webkitRelativePath) {
            folderName = firstFile.webkitRelativePath.split("/")[0];
          }

          if (folderName) {
            const cleanFolder = folderName.includes(":") ? folderName : `G:\\${folderName}`;
            folderInput.value = cleanFolder;
          }
        }
      });
    }

    // Handle Main Export Button Click
    document.getElementById("gstr1-btn-export").addEventListener("click", async () => {
      try {
        const month = parseInt(document.getElementById("gstr1-month-select").value);
        const year = parseInt(document.getElementById("gstr1-year-select").value);
        let folderPath = document.getElementById("gstr1-folder-path").value.trim();

        while (/^[a-zA-Z]:[\\/][a-zA-Z]:/i.test(folderPath) || /^[a-zA-Z]:[a-zA-Z]:/i.test(folderPath)) {
          folderPath = folderPath.replace(/^[a-zA-Z]:[\\/]?/i, "");
        }
        document.getElementById("gstr1-folder-path").value = folderPath;

        if (!folderPath) {
          alert("Please enter or select a destination folder path (e.g. C:\\GSTR1_Offline_Export or G:\\GSTR1).");
          return;
        }

        const csvData = generateGstr1CsvData(month, year);

        // Save CSV files directly to target directory via server API
        const res = await fetchFromBackend("/api/gstr1/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderPath, csvFiles: csvData.files })
        });

        if (res && !res._error) {
          const result = await res.json();
          if (result.success) {
            alert(`EXPORT SUCCESSFUL!\n\nAll 6 CSV files written directly into folder:\n\n📁 ${folderPath}\n\nProcessed ${csvData.b2bCount} B2B Invoices, ${csvData.b2csCount} B2C Small Entries, ${csvData.hsnCount} HSN Summaries, and ${csvData.cdnrCount} Credit/Debit Notes.`);
            closeOverlay();
            return;
          } else {
            alert(`SERVER DIRECT WRITE FAILED:\n\n${result.error || 'Unknown error'}`);
            return;
          }
        }

        const errDetails = res && res._error ? res._error.message : "Backend unreachable on port 3001";
        alert(`DIRECT FOLDER WRITE ERROR:\n\nCould not write directly to folder "${folderPath}".\n\nReason: ${errDetails}\n\nPlease verify node server.js is running.`);
      } catch (err) {
        console.error("Export process error:", err);
        alert(`EXPORT PROCESS ERROR:\n\n${err.message}`);
      }
    });
  }

  renderContent();
}

function downloadCsvBlob(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── GST Offline Tool CSV Generator Function ──────────────────────────────────
function generateGstr1CsvData(month, year) {
  const invoices = state.getInvoices();
  const contacts = state.getContacts();
  const salesReturns = state.getSalesReturns ? state.getSalesReturns() : [];

  // Filter Sales Invoices within month
  const monthInvoices = invoices.filter(inv => {
    if (inv.isCanceled || inv.status === "canceled") return false;
    const date = inv.date || inv.invoiceDate;
    if (!date || typeof date !== "string") return false;
    const parts = date.split("-");
    if (parts.length < 2) return false;
    const m = parseInt(parts[1], 10);
    if (year) {
      const y = parseInt(parts[0], 10);
      return m === month && y === parseInt(year, 10);
    }
    return m === month;
  });

  // Filter Sales Returns within month
  const monthSalesReturns = salesReturns.filter(sr => {
    if (sr.isCanceled) return false;
    const date = sr.date || sr.returnDate;
    if (!date || typeof date !== "string") return false;
    const parts = date.split("-");
    if (parts.length < 2) return false;
    const m = parseInt(parts[1], 10);
    if (year) {
      const y = parseInt(parts[0], 10);
      return m === month && y === parseInt(year, 10);
    }
    return m === month;
  });

  // Helper: Format date to official GST format (e.g., 14-Jul-17 or 14-Jul-2026)
  const formatGstDate = (dateStr) => {
    if (!dateStr) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const monthIdx = parseInt(parts[1], 10) - 1;
        return `${parts[2]}-${months[monthIdx] || parts[1]}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        const monthIdx = parseInt(parts[1], 10) - 1;
        return `${parts[0]}-${months[monthIdx] || parts[1]}-${parts[2]}`;
      }
    }
    return dateStr;
  };

  // Data structures for GSTR-1 sections
  const b2bRows = [];
  const b2csSummaryMap = {}; // Grouped B2CS map by (Type, POS, Rate, ApplicableRate, EcomGstin)
  const cdnrRows = [];
  const hsnSummaryMap = {}; // Combined HSN map
  const b2bHsnMap = {};     // B2B specific HSN map
  const b2cHsnMap = {};     // B2C specific HSN map

  let totalDocsCount = monthInvoices.length;
  let firstDocNo = "";
  let lastDocNo = "";

  if (monthInvoices.length > 0) {
    firstDocNo = monthInvoices[0].voucherNo || monthInvoices[0].id;
    lastDocNo = monthInvoices[monthInvoices.length - 1].voucherNo || monthInvoices[monthInvoices.length - 1].id;
  }

  monthInvoices.forEach(inv => {
    const contact = contacts.find(c => c.id === inv.contactId || c.name === inv.contactName) || {};
    const gstin = (contact.gstin || inv.customerGstin || "").trim().toUpperCase();
    const receiverName = contact.name || inv.customerName || "Customer";
    const isB2B = gstin && gstin.length >= 15;
    const invNo = inv.voucherNo || inv.id;
    const formattedDate = formatGstDate(inv.date || inv.invoiceDate || "");

    const rawState = contact.state || (typeof state.getCompanyState === "function" ? state.getCompanyState() : "") || "33-Tamil Nadu";
    const pos = rawState.trim();
    const totalVal = parseFloat(inv.total || 0).toFixed(2);
    const supplyType = (inv.isInterstate || inv.taxType === "igst") ? "Interstate" : "Intrastate";

  // Helper: Map any unit string to official GST UQC (e.g., NOS -> NOS-NUMBERS, KG -> KGS-KILOGRAMS)
  const gstUqcMapping = {
    "BAGS": "BAG-BAGS", "BAG": "BAG-BAGS", "BAG-BAGS": "BAG-BAGS",
    "BALE": "BAL-BALE", "BAL-BALE": "BAL-BALE",
    "BUNDLES": "BDL-BUNDLES", "BDL": "BDL-BUNDLES", "BDL-BUNDLES": "BDL-BUNDLES",
    "BUCKLES": "BKL-BUCKLES", "BKL-BUCKLES": "BKL-BUCKLES",
    "BOX": "BOX-BOX", "BOX-BOX": "BOX-BOX",
    "BOTTLES": "BTL-BOTTLES", "BTL-BOTTLES": "BTL-BOTTLES",
    "BUNCHES": "BUN-BUNCHES", "BUN-BUNCHES": "BUN-BUNCHES",
    "CANS": "CAN-CANS", "CAN": "CAN-CANS", "CAN-CANS": "CAN-CANS",
    "CUBIC METERS": "CBM-CUBIC METERS", "CBM-CUBIC METERS": "CBM-CUBIC METERS",
    "CUBIC CENTIMETERS": "CCM-CUBIC CENTIMETERS", "CCM-CUBIC CENTIMETERS": "CCM-CUBIC CENTIMETERS",
    "CENTIMETRES": "CMS-CENTIMETERS", "CENTIMETRE": "CMS-CENTIMETERS", "CENTIMETERS": "CMS-CENTIMETERS", "CENTIMETER": "CMS-CENTIMETERS", "CM": "CMS-CENTIMETERS", "CMS": "CMS-CENTIMETERS", "CMS-CENTIMETERS": "CMS-CENTIMETERS",
    "CARTONS": "CTN-CARTONS", "CARTON": "CTN-CARTONS", "CTN": "CTN-CARTONS", "CTN-CARTONS": "CTN-CARTONS",
    "DOZENS": "DOZ-DOZENS", "DOZEN": "DOZ-DOZENS", "DOZ": "DOZ-DOZENS", "DZN": "DOZ-DOZENS", "DOZ-DOZENS": "DOZ-DOZENS",
    "DRUMS": "DRM-DRUMS", "DRM": "DRM-DRUMS", "DRM-DRUMS": "DRM-DRUMS",
    "GREAT GROSS": "GGR-GREAT GROSS", "GGR-GREAT GROSS": "GGR-GREAT GROSS",
    "GRAMMES": "GMS-GRAMMES", "GRAMS": "GMS-GRAMMES", "GRAM": "GMS-GRAMMES", "G": "GMS-GRAMMES", "GM": "GMS-GRAMMES", "GMS": "GMS-GRAMMES", "GMS-GRAMMES": "GMS-GRAMMES",
    "GROSS": "GSR-GROSS", "GSR-GROSS": "GSR-GROSS",
    "GROSS YARDS": "GYD-GROSS YARDS", "GYD-GROSS YARDS": "GYD-GROSS YARDS",
    "KILOGRAMS": "KGS-KILOGRAMS", "KILOGRAM": "KGS-KILOGRAMS", "KG": "KGS-KILOGRAMS", "KGS": "KGS-KILOGRAMS", "KGS-KILOGRAMS": "KGS-KILOGRAMS",
    "KILOLITRE": "KLR-KILOLITRE", "KLR-KILOLITRE": "KLR-KILOLITRE",
    "KILOMETRE": "KME-KILOMETRE", "KME-KILOMETRE": "KME-KILOMETRE",
    "LITRE": "MLT-MILILITRE", "LITRES": "MLT-MILILITRE", "L": "MLT-MILILITRE", "MILLILITRE": "MLT-MILILITRE", "ML": "MLT-MILILITRE", "MLT": "MLT-MILILITRE", "MLT-MILILITRE": "MLT-MILILITRE",
    "METERS": "MTR-METERS", "METER": "MTR-METERS", "METRES": "MTR-METERS", "METRE": "MTR-METERS", "MTR": "MTR-METERS", "MTR-METERS": "MTR-METERS",
    "METRIC TON": "MTS-METRIC TON", "TONS": "MTS-METRIC TON", "TON": "MTS-METRIC TON", "TONNES": "TON-TONNES", "MTS-METRIC TON": "MTS-METRIC TON", "TON-TONNES": "TON-TONNES",
    "NUMBERS": "NOS-NUMBERS", "NUMBER": "NOS-NUMBERS", "NOS": "NOS-NUMBERS", "NO": "NOS-NUMBERS", "NOS-NUMBERS": "NOS-NUMBERS",
    "PACKETS": "PAC-PACKETS", "PACKET": "PAC-PACKETS", "PACK": "PAC-PACKETS", "PAK": "PAC-PACKETS", "PAC-PACKETS": "PAC-PACKETS",
    "PIECES": "PCS-PIECES", "PIECE": "PCS-PIECES", "PCS": "PCS-PIECES", "PCS-PIECES": "PCS-PIECES",
    "PAIRS": "PRS-PAIRS", "PRS-PAIRS": "PRS-PAIRS",
    "QUINTAL": "QTL-QUINTAL", "QTL": "QTL-QUINTAL", "QUTL": "QTL-QUINTAL", "QTL-QUINTAL": "QTL-QUINTAL",
    "ROLLS": "ROL-ROLLS", "ROLL": "ROL-ROLLS", "ROL-ROLLS": "ROL-ROLLS",
    "SETS": "SET-SETS", "SET": "SET-SETS", "SET-SETS": "SET-SETS",
    "SQUARE FEET": "SQF-SQUARE FEET", "SQ.FEET": "SQF-SQUARE FEET", "SQ.FT": "SQF-SQUARE FEET", "SQF": "SQF-SQUARE FEET", "SQF-SQUARE FEET": "SQF-SQUARE FEET",
    "SQUARE METERS": "SQM-SQUARE METERS", "SQ.METRE": "SQM-SQUARE METERS", "SQ.M": "SQM-SQUARE METERS", "SQM": "SQM-SQUARE METERS", "SQM-SQUARE METERS": "SQM-SQUARE METERS",
    "SQUARE YARDS": "SQY-SQUARE YARDS", "SQY-SQUARE YARDS": "SQY-SQUARE YARDS",
    "TABLETS": "TBS-TABLETS", "TBS-TABLETS": "TBS-TABLETS",
    "TEN GROSS": "TGM-TEN GROSS", "TGM-TEN GROSS": "TGM-TEN GROSS",
    "THOUSANDS": "THD-THOUSANDS", "THD-THOUSANDS": "THD-THOUSANDS",
    "TUBES": "TUB-TUBES", "TUB-TUBES": "TUB-TUBES",
    "US GALLONS": "UGS-US GALLONS", "UGS-US GALLONS": "UGS-US GALLONS",
    "UNITS": "UNT-UNITS", "UNT-UNITS": "UNT-UNITS",
    "YARDS": "YDS-YARDS", "YDS-YARDS": "YDS-YARDS",
    "OTHERS": "OTH-OTHERS", "OTH": "OTH-OTHERS", "OTH-OTHERS": "OTH-OTHERS"
  };

  const toGstUqc = (unitStr) => {
    if (!unitStr) return "OTH-OTHERS";
    const clean = String(unitStr).trim().toUpperCase();
    if (gstUqcMapping[clean]) return gstUqcMapping[clean];
    if (clean.includes("-")) return clean;
    return "OTH-OTHERS";
  };

  const items = inv.items || [];
  items.forEach(item => {
    const taxable = parseFloat(item.amount || (item.quantity * item.rate) || 0);
    const taxRate = parseFloat(item.gstPercent || item.taxPercent || 0);
    const hsn = (item.hsnCode || item.hsn || "9999").trim();
    const uqc = toGstUqc(item.unit);
    const qty = parseFloat(item.quantity || 0);
    const desc = item.description || (typeof state.getHsnDescription === "function" ? state.getHsnDescription(hsn) : "") || item.materialName || "Goods";

    let igstAmt = 0, cgstAmt = 0, sgstAmt = 0;
    if (supplyType === "Interstate") {
      igstAmt = taxable * (taxRate / 100);
    } else {
      cgstAmt = taxable * (taxRate / 2 / 100);
      sgstAmt = taxable * (taxRate / 2 / 100);
    }
    const itemTotalVal = taxable + igstAmt + cgstAmt + sgstAmt;

    // Helper to accumulate into an HSN map
    const addToHsnMap = (mapObj) => {
      const hsnKey = `${hsn}_${taxRate}_${uqc}`;
      if (!mapObj[hsnKey]) {
        mapObj[hsnKey] = {
          hsn: hsn,
          desc: desc,
          uqc: uqc,
          qty: 0,
          val: 0,
          taxable: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
          rate: taxRate
        };
      }
      mapObj[hsnKey].qty += qty;
      mapObj[hsnKey].val += itemTotalVal;
      mapObj[hsnKey].taxable += taxable;
      mapObj[hsnKey].igst += igstAmt;
      mapObj[hsnKey].cgst += cgstAmt;
      mapObj[hsnKey].sgst += sgstAmt;
    };

      // 1. Total HSN Map
      addToHsnMap(hsnSummaryMap);

      // 2. Specific B2B vs B2C HSN Map & Rows
      if (isB2B) {
        addToHsnMap(b2bHsnMap);
        // B2B Entry matching official 13-column format:
        // GSTIN/UIN of Recipient, Receiver Name, Invoice Number, Invoice date, Invoice Value, Place Of Supply, Reverse Charge, Applicable % of Tax Rate, Invoice Type, E-Commerce GSTIN, Rate, Taxable Value, Cess Amount
        b2bRows.push([
          gstin,
          receiverName,
          invNo,
          formattedDate,
          totalVal,
          pos,
          "N", // Reverse Charge
          "",  // Applicable % of Tax Rate
          "Regular B2B", // Invoice Type
          "",  // E-Commerce GSTIN
          taxRate.toFixed(2),
          taxable.toFixed(2),
          "0.00" // Cess Amount
        ]);
      } else {
        addToHsnMap(b2cHsnMap);

        // Group B2C Small entries by (Type, Place Of Supply, Rate, Applicable % of Tax Rate, E-Commerce GSTIN)
        const b2cType = inv.ecommerceGstin ? "E" : "OE";
        const ecomGstin = inv.ecommerceGstin || "";
        const rateFormatted = taxRate.toFixed(2);
        const applicableTaxRate = "";

        const b2csKey = `${b2cType}_${pos}_${rateFormatted}_${applicableTaxRate}_${ecomGstin}`;

        if (!b2csSummaryMap[b2csKey]) {
          b2csSummaryMap[b2csKey] = {
            type: b2cType,
            pos: pos,
            rate: rateFormatted,
            applicableTaxRate: applicableTaxRate,
            taxableValue: 0,
            cessAmount: 0,
            ecomGstin: ecomGstin
          };
        }
        b2csSummaryMap[b2csKey].taxableValue += taxable;
      }
    });
  });

  // Credit / Debit Notes (Sales Returns) matching official 13-column format:
  // GSTIN/UIN of Recipient, Receiver Name, Note Number, Note Date, Note Type, Place Of Supply, Reverse Charge, Note Supply Type, Note Value, Applicable % of Tax Rate, Rate, Taxable Value, Cess Amount
  monthSalesReturns.forEach(sr => {
    const contact = contacts.find(c => c.id === sr.contactId || c.name === sr.contactName) || {};
    const gstin = (contact.gstin || "").trim().toUpperCase();
    const receiverName = contact.name || sr.contactName || "Customer";
    const noteNo = sr.voucherNo || sr.id;
    const formattedDate = formatGstDate(sr.date || sr.returnDate || "");
    const noteType = "C"; // Credit Note
    const rawState = contact.state || "33-Tamil Nadu";
    const pos = rawState.trim();
    const totalVal = parseFloat(sr.total || 0).toFixed(2);
    const taxRate = parseFloat(sr.gstPercent || 18).toFixed(2);
    const taxable = parseFloat(sr.subtotal || sr.total || 0).toFixed(2);

    if (gstin && gstin.length >= 15) {
      cdnrRows.push([
        gstin,
        receiverName,
        noteNo,
        formattedDate,
        noteType,
        pos,
        "N",
        "Regular B2B",
        totalVal,
        "",  // Applicable % of Tax Rate
        taxRate,
        taxable,
        "0.00"
      ]);
    } else {
      // Unregistered B2C Sales Return reduces taxable value for corresponding B2CS group
      const b2cType = sr.ecommerceGstin ? "E" : "OE";
      const ecomGstin = sr.ecommerceGstin || "";
      const rateFormatted = parseFloat(sr.gstPercent || 18).toFixed(2);
      const applicableTaxRate = "";
      const b2csKey = `${b2cType}_${pos}_${rateFormatted}_${applicableTaxRate}_${ecomGstin}`;

      if (!b2csSummaryMap[b2csKey]) {
        b2csSummaryMap[b2csKey] = {
          type: b2cType,
          pos: pos,
          rate: rateFormatted,
          applicableTaxRate: applicableTaxRate,
          taxableValue: 0,
          cessAmount: 0,
          ecomGstin: ecomGstin
        };
      }
      b2csSummaryMap[b2csKey].taxableValue -= parseFloat(taxable);
    }
  });

  // Build aggregated b2csRows matching official 7-column format:
  // Type, Place Of Supply, Rate, Applicable % of Tax Rate, Taxable Value, Cess Amount, E-Commerce GSTIN
  const b2csRows = Object.values(b2csSummaryMap).map(b => [
    b.type,
    b.pos,
    b.rate,
    b.applicableTaxRate,
    b.taxableValue.toFixed(2),
    b.cessAmount.toFixed(2),
    b.ecomGstin
  ]);

  // Helper to serialize array of arrays to CSV content string
  const toCsvContent = (header, rows) => {
    return header + rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  };

  // 1. Generate b2b.csv (13 Columns)
  const b2bHeader = "GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice date,Invoice Value,Place Of Supply,Reverse Charge,Applicable % of Tax Rate,Invoice Type,E-Commerce GSTIN,Rate,Taxable Value,Cess Amount\n";
  const b2bContent = toCsvContent(b2bHeader, b2bRows);

  // 2. Generate b2ba.csv (15 Columns)
  const b2baHeader = "GSTIN/UIN of Recipient,Receiver Name,Original Invoice Number,Original Invoice date,Revised Invoice Number,Revised Invoice date,Invoice Value,Place Of Supply,Reverse Charge,Applicable % of Tax Rate,Invoice Type,E-Commerce GSTIN,Rate,Taxable Value,Cess Amount\n";
  const b2baContent = b2baHeader;

  // 3. Generate b2cs.csv (7 Columns)
  const b2csHeader = "Type,Place Of Supply,Rate,Applicable % of Tax Rate,Taxable Value,Cess Amount,E-Commerce GSTIN\n";
  const b2csContent = toCsvContent(b2csHeader, b2csRows);

  // 4. Generate cdnr.csv (13 Columns)
  const cdnrHeader = "GSTIN/UIN of Recipient,Receiver Name,Note Number,Note Date,Note Type,Place Of Supply,Reverse Charge,Note Supply Type,Note Value,Applicable % of Tax Rate,Rate,Taxable Value,Cess Amount\n";
  const cdnrContent = toCsvContent(cdnrHeader, cdnrRows);

  // Helper for HSN CSV rows (11 Columns)
  // HSN,Description,UQC,Total Quantity,Total Value,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount,Rate
  const formatHsnRows = (mapObj) => Object.values(mapObj).map(h => [
    h.hsn,
    h.desc,
    h.uqc,
    h.qty.toFixed(2),
    h.val.toFixed(2),
    h.taxable.toFixed(2),
    h.igst.toFixed(2),
    h.cgst.toFixed(2),
    h.sgst.toFixed(2),
    h.cess.toFixed(2),
    h.rate.toFixed(2)
  ]);

  const hsnHeader = "HSN,Description,UQC,Total Quantity,Total Value,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount,Rate\n";

  // 5a. Total combined hsn.csv
  const hsnRows = formatHsnRows(hsnSummaryMap);
  const hsnContent = toCsvContent(hsnHeader, hsnRows);

  // 5b. B2B HSN: b2b_hsn.csv / hsn(b2b).csv
  const b2bHsnRows = formatHsnRows(b2bHsnMap);
  const b2bHsnContent = toCsvContent(hsnHeader, b2bHsnRows);

  // 5c. B2C HSN: b2c_hsn.csv / hsn(b2c).csv
  const b2cHsnRows = formatHsnRows(b2cHsnMap);
  const b2cHsnContent = toCsvContent(hsnHeader, b2cHsnRows);

  // 6. Generate docs.csv (5 Columns)
  const docsHeader = "Nature of Document,Sr. No. From,Sr. No. To,Total Number,Cancelled\n";
  const docsContent = docsHeader + `"${"Invoices for outward supply"}","${firstDocNo}","${lastDocNo}","${totalDocsCount}","0"\n`;

  // 7. Generate exemp.csv / nil.csv (4 Columns)
  const exempHeader = "Description,Nil Rated Supplies,Exempted(other than nil rated/non GST supply),Non-GST Supplies\n";
  const exempContent = exempHeader + `"Inter-State supplies to registered persons","0.00","0.00","0.00"\n` +
                                     `"Intra-State supplies to registered persons","0.00","0.00","0.00"\n` +
                                     `"Inter-State supplies to unregistered persons","0.00","0.00","0.00"\n` +
                                     `"Intra-State supplies to unregistered persons","0.00","0.00","0.00"\n`;

  return {
    b2bCount: b2bRows.length,
    b2csCount: b2csRows.length,
    hsnCount: hsnRows.length,
    b2bHsnCount: b2bHsnRows.length,
    b2cHsnCount: b2cHsnRows.length,
    cdnrCount: cdnrRows.length,
    files: {
      "b2b.csv": b2bContent,
      "b2ba.csv": b2baContent,
      "b2cs.csv": b2csContent,
      "hsn.csv": hsnContent,
      "hsn(b2b).csv": b2bHsnContent,
      "hsn(b2c).csv": b2cHsnContent,
      "b2b_hsn.csv": b2bHsnContent,
      "b2c_hsn.csv": b2cHsnContent,
      "cdnr.csv": cdnrContent,
      "docs.csv": docsContent,
      "exemp.csv": exempContent,
      "nil.csv": exempContent
    }
  };
}
