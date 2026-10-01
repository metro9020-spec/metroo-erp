import { state } from "../state.js";

export function openMissingDoubleEntryModal(onClosed = null) {
  const existingModal = document.getElementById("missing-double-entry-modal");
  if (existingModal) existingModal.remove();

  let currentOnlyFy = true;
  let currentFilter = "ALL"; // ALL, UNBALANCED, MISSING_DOUBLE_ENTRY, EMPTY_ENTRIES, SINGLE_ENTRY, UNKNOWN_LEDGER
  let currentSearch = "";

  const overlay = document.createElement("div");
  overlay.id = "missing-double-entry-modal";
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
    background: #f8fafc;
    width: 100%;
    max-width: 1100px;
    height: 90vh;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font-body, system-ui, sans-serif);
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
    flex-shrink: 0;
  `;
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="background: rgba(255,255,255,0.15); width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
        <i class="fa-solid fa-scale-unbalanced-flip" style="font-size: 1.3rem; color: #38bdf8;"></i>
      </div>
      <div>
        <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          Missing & Unbalanced Double Entry Finder
          <span style="font-size: 0.75rem; background: #38bdf8; color: #0f172a; padding: 2px 8px; border-radius: 12px; font-weight: 800;">ADMIN AUDIT</span>
        </h3>
        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #cbd5e1;">Audit sales, purchases, returns & journal vouchers for missing or unbalanced double-entry accounting records.</p>
      </div>
    </div>
    <button id="close-audit-modal" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; width: 36px; height: 36px; border-radius: 6px; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  // Content Container
  const content = document.createElement("div");
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `;

  modal.appendChild(header);
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
    if (typeof onClosed === "function") onClosed();
  };

  header.querySelector("#close-audit-modal").addEventListener("click", closeModal);

  function renderModalBody() {
    const findings = state.findMissingAndUnbalancedDoubleEntries({ onlyCurrentFy: currentOnlyFy });

    // Stats
    const totalCount = findings.length;
    const unbalancedCount = findings.filter(f => f.issueType === "UNBALANCED").length;
    const missingCount = findings.filter(f => f.issueType === "MISSING_DOUBLE_ENTRY").length;
    const emptyCount = findings.filter(f => f.issueType === "EMPTY_ENTRIES" || f.issueType === "SINGLE_ENTRY").length;
    const badAccCount = findings.filter(f => f.issueType === "UNKNOWN_LEDGER").length;

    // Health Score
    let healthColor = "#10b981";
    let healthLabel = "PERFECT 100%";
    if (totalCount > 10) {
      healthColor = "#ef4444";
      healthLabel = "CRITICAL ACTION REQUIRED";
    } else if (totalCount > 0) {
      healthColor = "#f59e0b";
      healthLabel = "DISCREPANCIES DETECTED";
    }

    // Filter Findings
    const filtered = findings.filter(f => {
      if (currentFilter !== "ALL" && f.issueType !== currentFilter) return false;
      if (currentSearch) {
        const q = currentSearch.toLowerCase();
        const vNo = String(f.voucherNo || "").toLowerCase();
        const pName = String(f.partyName || "").toLowerCase();
        const desc = String(f.description || "").toLowerCase();
        const vType = String(f.voucherType || "").toLowerCase();
        return vNo.includes(q) || pName.includes(q) || desc.includes(q) || vType.includes(q);
      }
      return true;
    });

    content.innerHTML = `
      <!-- Stats Overview Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Double Entry Health</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: ${healthColor}; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid ${totalCount === 0 ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> ${healthLabel}
          </div>
        </div>

        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Total Discrepancies</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${totalCount > 0 ? '#1e293b' : '#10b981'}; margin-top: 2px;">
            ${totalCount} <span style="font-size: 0.8rem; font-weight: 600; color: #64748b;">issues</span>
          </div>
        </div>

        <div style="background: white; border: 1px solid ${missingCount > 0 ? '#fca5a5' : '#cbd5e1'}; border-radius: 8px; padding: 12px 16px; background: ${missingCount > 0 ? '#fef2f2' : 'white'};">
          <div style="font-size: 0.75rem; color: ${missingCount > 0 ? '#991b1b' : '#64748b'}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Missing Entries</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${missingCount > 0 ? '#dc2626' : '#64748b'}; margin-top: 2px;">
            ${missingCount}
          </div>
        </div>

        <div style="background: white; border: 1px solid ${unbalancedCount > 0 ? '#fdba74' : '#cbd5e1'}; border-radius: 8px; padding: 12px 16px; background: ${unbalancedCount > 0 ? '#fff7ed' : 'white'};">
          <div style="font-size: 0.75rem; color: ${unbalancedCount > 0 ? '#9a3412' : '#64748b'}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Unbalanced Entries</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${unbalancedCount > 0 ? '#ea580c' : '#64748b'}; margin-top: 2px;">
            ${unbalancedCount}
          </div>
        </div>

        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px;">
          <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Corrupted / Single Side</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: ${emptyCount + badAccCount > 0 ? '#d97706' : '#64748b'}; margin-top: 2px;">
            ${emptyCount + badAccCount}
          </div>
        </div>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <label style="font-size: 0.82rem; font-weight: 700; color: #334155;">Filter Category:</label>
          <select id="audit-filter-category" class="form-control" style="width: auto; font-size: 0.82rem; font-weight: 600; padding: 4px 10px; height: 32px; background: #f8fafc;">
            <option value="ALL" ${currentFilter === "ALL" ? "selected" : ""}>All Issues (${totalCount})</option>
            <option value="MISSING_DOUBLE_ENTRY" ${currentFilter === "MISSING_DOUBLE_ENTRY" ? "selected" : ""}>Missing Double Entries (${missingCount})</option>
            <option value="UNBALANCED" ${currentFilter === "UNBALANCED" ? "selected" : ""}>Unbalanced Entries (${unbalancedCount})</option>
            <option value="SINGLE_ENTRY" ${currentFilter === "SINGLE_ENTRY" ? "selected" : ""}>Single-Entry Vouchers</option>
            <option value="EMPTY_ENTRIES" ${currentFilter === "EMPTY_ENTRIES" ? "selected" : ""}>Empty 0-Entry Records</option>
            <option value="UNKNOWN_LEDGER" ${currentFilter === "UNKNOWN_LEDGER" ? "selected" : ""}>Unresolved Ledger Accounts</option>
          </select>

          <label style="font-size: 0.82rem; font-weight: 700; color: #334155; margin-left: 8px;">Scope:</label>
          <select id="audit-filter-fy" class="form-control" style="width: auto; font-size: 0.82rem; font-weight: 600; padding: 4px 10px; height: 32px; background: #f8fafc;">
            <option value="CURRENT_FY" ${currentOnlyFy ? "selected" : ""}>Active Financial Year</option>
            <option value="ALL_FY" ${!currentOnlyFy ? "selected" : ""}>All Financial Years</option>
          </select>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="position: relative;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 9px; font-size: 0.8rem; color: #94a3b8;"></i>
            <input type="text" id="audit-search-input" value="${currentSearch}" placeholder="Search voucher #, party..." style="padding: 5px 10px 5px 28px; font-size: 0.82rem; border: 1px solid #cbd5e1; border-radius: 6px; width: 220px;">
          </div>
          <button type="button" id="btn-run-auto-fix-all" class="btn btn-primary" style="padding: 6px 16px; font-size: 0.82rem; font-weight: 700; background: #059669; border-color: #047857; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Fix All Issues
          </button>
        </div>
      </div>

      <!-- Findings Table -->
      <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; flex: 1; overflow: hidden; display: flex; flex-direction: column;">
        <div style="overflow-x: auto; overflow-y: auto; flex: 1;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.83rem; text-align: left;">
            <thead>
              <tr style="background: #1e293b; color: white; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; position: sticky; top: 0; z-index: 10;">
                <th style="padding: 10px 14px;">Voucher / Doc #</th>
                <th style="padding: 10px 14px;">Type</th>
                <th style="padding: 10px 14px;">Date</th>
                <th style="padding: 10px 14px;">Party / Description</th>
                <th style="padding: 10px 14px;">Issue & Discrepancy Detail</th>
                <th style="padding: 10px 14px; text-align: right;">Amount</th>
                <th style="padding: 10px 14px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 40px 20px; color: #059669;">
                    <div style="font-size: 2.5rem; margin-bottom: 8px;"><i class="fa-solid fa-circle-check"></i></div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #065f46;">Zero Discrepancies Found!</div>
                    <div style="font-size: 0.83rem; color: #64748b; margin-top: 4px;">All invoices, purchases, and vouchers have balanced double-entry accounting records.</div>
                  </td>
                </tr>
              ` : filtered.map(item => {
                let badgeBg = "#fef2f2";
                let badgeColor = "#991b1b";
                let badgeText = "MISSING ENTRY";

                if (item.issueType === "UNBALANCED") {
                  badgeBg = "#fff7ed";
                  badgeColor = "#c2410c";
                  badgeText = "UNBALANCED";
                } else if (item.issueType === "SINGLE_ENTRY") {
                  badgeBg = "#fef3c7";
                  badgeColor = "#b45309";
                  badgeText = "SINGLE SIDE";
                } else if (item.issueType === "EMPTY_ENTRIES") {
                  badgeBg = "#f3f4f6";
                  badgeColor = "#4b5563";
                  badgeText = "CORRUPTED (0 ENTRIES)";
                } else if (item.issueType === "UNKNOWN_LEDGER") {
                  badgeBg = "#f0f9ff";
                  badgeColor = "#0369a1";
                  badgeText = "MISSING ACCOUNT ID";
                }

                const displayAmt = item.difference > 0 ? item.difference : Math.max(item.debitTotal, item.creditTotal);

                return `
                  <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <td style="padding: 10px 14px; font-weight: 700; color: #1e3b8b;">
                      ${item.voucherNo}
                    </td>
                    <td style="padding: 10px 14px;">
                      <span style="font-size: 0.72rem; font-weight: 700; background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 4px;">${item.voucherType}</span>
                    </td>
                    <td style="padding: 10px 14px; color: #475569; white-space: nowrap;">${item.date}</td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #1e293b; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${item.partyName}
                    </td>
                    <td style="padding: 10px 14px;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-size: 0.7rem; font-weight: 800; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${badgeColor}33;">${badgeText}</span>
                        <span style="font-size: 0.78rem; color: #334155;">${item.description}</span>
                      </div>
                    </td>
                    <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #0f172a; white-space: nowrap;">
                      ₹${displayAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style="padding: 10px 14px; text-align: center; white-space: nowrap;">
                      <div style="display: flex; gap: 6px; justify-content: center;">
                        <button type="button" class="btn-fix-single-issue btn btn-success" data-id="${item.id}" style="padding: 3px 10px; font-size: 0.75rem; background: #10b981; border: none; font-weight: 700; cursor: pointer;" title="Auto-fix accounting entries for this document">
                          <i class="fa-solid fa-wrench"></i> Fix
                        </button>
                        <button type="button" class="btn-inspect-issue btn btn-secondary" data-id="${item.id}" style="padding: 3px 8px; font-size: 0.75rem; background: #64748b; border: none; color: white; cursor: pointer;" title="Inspect raw JSON entries">
                          <i class="fa-solid fa-code"></i> Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>

        <!-- Table Footer Summary -->
        <div style="background: #f1f5f9; padding: 10px 16px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600; color: #475569;">
          <div>Showing ${filtered.length} of ${totalCount} audit findings</div>
          <div style="display: flex; gap: 12px;">
            <button type="button" id="btn-export-audit-csv" style="background: transparent; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; cursor: pointer; color: #1e293b; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-file-csv text-success"></i> Export Audit Report (CSV)
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach Event Listeners
    content.querySelector("#audit-filter-category").addEventListener("change", (e) => {
      currentFilter = e.target.value;
      renderModalBody();
    });

    content.querySelector("#audit-filter-fy").addEventListener("change", (e) => {
      currentOnlyFy = (e.target.value === "CURRENT_FY");
      renderModalBody();
    });

    content.querySelector("#audit-search-input").addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderModalBody();
    });

    content.querySelector("#btn-run-auto-fix-all").addEventListener("click", () => {
      if (confirm(`Run Auto-Fix & Re-Generate Engine?\n\nThis will scan all ${totalCount} discrepancy records, re-build double-entry accounting transactions for unlinked sales/purchases/returns, and auto-balance unbalanced entries.`)) {
        const result = state.autoFixAllDoubleEntryIssues({ onlyCurrentFy: currentOnlyFy });
        alert(result.message);
        renderModalBody();
      }
    });

    content.querySelectorAll(".btn-fix-single-issue").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const finding = findings.find(f => f.id === id);
        if (finding) {
          const result = state.autoFixDoubleEntryIssue(finding);
          alert(result.message);
          renderModalBody();
        }
      });
    });

    content.querySelectorAll(".btn-inspect-issue").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const finding = findings.find(f => f.id === id);
        if (finding) {
          showInspectModal(finding);
        }
      });
    });

    content.querySelector("#btn-export-audit-csv")?.addEventListener("click", () => {
      exportAuditCsv(findings);
    });
  }

  renderModalBody();
}

function showInspectModal(finding) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); z-index: 100000;
    display: flex; align-items: center; justify-content: center; padding: 20px;
  `;
  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white; border-radius: 8px; width: 100%; max-width: 650px; max-height: 80vh;
    display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
  `;
  modal.innerHTML = `
    <div style="background: #0f172a; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-weight: 700; font-size: 0.95rem;">Audit Inspection: ${finding.voucherNo} (${finding.voucherType})</div>
      <button id="close-inspect" style="background: transparent; border: none; color: white; font-size: 1.1rem; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div style="padding: 16px; flex: 1; overflow-y: auto; font-family: monospace; font-size: 0.8rem; background: #f8fafc; color: #1e293b;">
      <pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(finding, null, 2)}</pre>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector("#close-inspect").addEventListener("click", () => overlay.remove());
}

function exportAuditCsv(findings) {
  if (!findings || findings.length === 0) {
    alert("No audit records to export.");
    return;
  }
  const headers = ["Voucher No", "Voucher Type", "Date", "Party Name", "Issue Type", "Description", "Debit Total", "Credit Total", "Discrepancy"];
  const rows = findings.map(f => [
    `"${f.voucherNo || ''}"`,
    `"${f.voucherType || ''}"`,
    `"${f.date || ''}"`,
    `"${(f.partyName || '').replace(/"/g, '""')}"`,
    `"${f.issueType || ''}"`,
    `"${(f.description || '').replace(/"/g, '""')}"`,
    f.debitTotal || 0,
    f.creditTotal || 0,
    f.difference || 0
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Double_Entry_Audit_Report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
