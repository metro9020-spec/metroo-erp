import { state } from "../state.js";

// Persistent state across automatic server data refreshes (AutoSync)
let grpSortCol = "name";
let grpSortDir = "asc";
let grpSearchQuery = "";
let grpSelectedGroupId = null;
let grpHighlightedGroupId = null;

let ldSortCol = "code";
let ldSortDir = "asc";
let ldSearchQuery = "";
let ldSelectedLedgerCode = null;
let ldHighlightedLedgerCode = null;

// 1. ACCOUNT GROUP MASTER
export function renderGroups(container) {
  const groups = state.getAccountGroups();
  let selectedGroup = grpSelectedGroupId ? groups.find(g => g.id === grpSelectedGroupId) || null : null;

  function renderView() {
    const sortedGroups = [...groups].sort((a, b) => {
      let valA = String(a[grpSortCol] || "").toLowerCase();
      let valB = String(b[grpSortCol] || "").toLowerCase();
      if (valA < valB) return grpSortDir === "asc" ? -1 : 1;
      if (valA > valB) return grpSortDir === "asc" ? 1 : -1;
      return 0;
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; flex-grow: 1; height: 100%; min-height: 560px; box-sizing: border-box; gap: 12px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 0.85rem; color: black; background-color: #cbd5e1; padding: 15px; border-radius: 4px; border: 1px solid #94a3b8;">
        
        <!-- Main Content 2-Column Split -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; flex-grow: 1; min-height: 0;">
          
          <!-- Left Side: Form and Table -->
          <div style="display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 0; color: black;">
            <!-- Form Panel -->
            <div style="background-color: #e2e8f0; padding: 14px 16px; border: 1px solid #94a3b8; border-radius: 4px; display: flex; flex-direction: column; gap: 10px; color: black; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="font-weight: 700; font-size: 0.85rem; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-folder-plus"></i> ${selectedGroup ? 'EDIT ACCOUNT GROUP' : 'CREATE ACCOUNT GROUP'}
              </div>

              <div style="display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: 8px; color: black;">
                <label style="font-weight: bold; color: black;">Group ID</label>
                <input type="text" id="grp-id" class="form-control" style="background-color: #f1f5f9; width: 140px; font-weight: bold; color: #1e3a8a; border: 1px solid #94a3b8; padding: 4px 8px; font-size: 0.8rem;" readonly value="${selectedGroup ? selectedGroup.id : String(groups.length + 46)}">
              </div>
              
              <div style="display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: 8px; color: black;">
                <label style="font-weight: bold; color: black;">Group Name</label>
                <input type="text" id="grp-name" class="form-control" style="background-color: white; color: black; border: 1px solid #94a3b8; padding: 4px 8px; font-size: 0.85rem; font-weight: 600;" value="${selectedGroup ? selectedGroup.name : ''}" placeholder="Enter Group Name..." required>
              </div>
              
              <div style="display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: 8px; color: black;">
                <label style="font-weight: bold; color: black;">Under</label>
                <select id="grp-under" class="form-control" style="background-color: white; color: black; border: 1px solid #94a3b8; padding: 4px 8px; font-size: 0.85rem;">
                  <option value="ASSETS" ${selectedGroup && selectedGroup.under === 'ASSETS' ? 'selected' : ''}>ASSETS</option>
                  <option value="LIABILITIES" ${selectedGroup && selectedGroup.under === 'LIABILITIES' ? 'selected' : ''}>LIABILITIES</option>
                  <option value="INCOME" ${selectedGroup && selectedGroup.under === 'INCOME' ? 'selected' : ''}>INCOME</option>
                  <option value="EXPENSE" ${selectedGroup && selectedGroup.under === 'EXPENSE' ? 'selected' : ''}>EXPENSE</option>
                  ${groups.map(g => `<option value="${g.name}" ${selectedGroup && selectedGroup.under === g.name ? 'selected' : ''}>${g.name}</option>`).join("")}
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: 8px; color: black;">
                <label style="font-weight: bold; color: black;">Default</label>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="grp-default" style="cursor: pointer;" ${selectedGroup && selectedGroup.isDefault ? 'checked' : ''}>
                  <span style="font-size: 0.75rem; color: #475569;">System Default Group</span>
                </div>
              </div>
            </div>

            <!-- Search Bar -->
            <div style="display: flex; gap: 8px; align-items: center; background-color: #e2e8f0; padding: 6px 10px; border: 1px solid #94a3b8; border-radius: 4px;">
              <i class="fa-solid fa-magnifying-glass" style="color: #475569; margin-left: 4px;"></i>
              <input type="text" id="grp-search" class="form-control" style="background-color: white; color: black; padding: 4px 8px; font-size: 0.8rem; flex-grow: 1; border: 1px solid #94a3b8; border-radius: 3px;" placeholder="Search Account Groups..." value="${grpSearchQuery}">
            </div>

            <!-- Groups Table -->
            <div style="background-color: white; border: 1px solid #94a3b8; border-radius: 4px; flex: 1 1 0; min-height: 0; overflow-y: auto; color: black; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: black;">
                <thead style="position: sticky; top: 0; z-index: 1;">
                  <tr style="background-color: #cbd5e1; border-bottom: 2px solid #94a3b8; color: black;">
                    <th class="sortable-grp-th" data-sort="name" style="padding: 7px 10px; border-right: 1px solid #94a3b8; color: black; font-weight: 700; cursor: pointer; user-select: none;" title="Click to sort by Group Name">
                      Group Name ${grpSortCol === 'name' ? (grpSortDir === 'asc' ? '▲' : '▼') : '<span style="opacity:0.35;">↕</span>'}
                    </th>
                    <th class="sortable-grp-th" data-sort="under" style="padding: 7px 10px; color: black; font-weight: 700; cursor: pointer; user-select: none;" title="Click to sort by Parent Category">
                      Under ${grpSortCol === 'under' ? (grpSortDir === 'asc' ? '▲' : '▼') : '<span style="opacity:0.35;">↕</span>'}
                    </th>
                  </tr>
                </thead>
                <tbody id="grp-table-body">
                  ${sortedGroups.map(g => {
                    const matches = g.name.toLowerCase().includes(grpSearchQuery.toLowerCase()) || g.under.toLowerCase().includes(grpSearchQuery.toLowerCase());
                    const isHighlighted = grpHighlightedGroupId === g.id || (selectedGroup && selectedGroup.id === g.id);
                    return `
                      <tr class="grp-row-select" data-id="${g.id}" style="border-bottom: 1px solid #e2e8f0; cursor: pointer; color: black; display: ${matches ? 'table-row' : 'none'}; background-color: ${isHighlighted ? '#bae6fd' : 'white'};" onmouseover="if(!this.style.background.includes('bae6fd')) this.style.background='#f1f5f9'" onmouseout="if(!this.style.background.includes('bae6fd')) this.style.background='white'">
                        <td style="padding: 7px 10px; font-weight: bold; border-right: 1px solid #e2e8f0; color: black;">${g.name}</td>
                        <td style="padding: 7px 10px; color: black;">${g.under}</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Side: Account Group Tree -->
          <div style="background-color: white; padding: 14px 16px; border: 1px solid #94a3b8; border-radius: 4px; display: flex; flex-direction: column; gap: 10px; height: 100%; min-height: 0; overflow-y: auto; color: black; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-weight: 700; font-size: 0.85rem; color: #1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
              <span><i class="fa-solid fa-sitemap" style="margin-right: 6px;"></i> ACCOUNT GROUP TREE</span>
              <span style="font-size: 0.72rem; color: #64748b; font-weight: normal;">Hierarchical View</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; font-family: monospace; font-size: 0.85rem; color: black; flex-grow: 1; overflow-y: auto;">
              ${["ASSETS", "LIABILITIES", "INCOME", "EXPENSE"].map(rootCat => {
                const rootGroups = groups.filter(g => g.under === rootCat);
                return `
                  <div style="color: black;">
                    <div style="font-weight: bold; color: black;"><i class="fa-solid fa-folder-open" style="margin-right: 6px; color: #eab308;"></i>${rootCat}</div>
                    <div style="margin-left: 20px; border-left: 1px dashed #cbd5e1; padding-left: 10px; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; color: black;">
                      ${rootGroups.map(rg => {
                        const subGroups = groups.filter(g => g.under === rg.name);
                        return `
                          <div style="color: black;">
                            <div style="font-weight: 600; color: black;"><i class="fa-solid fa-folder" style="margin-right: 4px; color: #38bdf8;"></i>${rg.name}</div>
                            ${subGroups.length > 0 ? `
                              <div style="margin-left: 15px; border-left: 1px dashed #e2e8f0; padding-left: 8px; display: flex; flex-direction: column; gap: 2px; margin-top: 2px; color: black;">
                                ${subGroups.map(sg => `<div style="color: black;"><i class="fa-solid fa-file-invoice" style="margin-right: 4px; color: #94a3b8;"></i>${sg.name}</div>`).join("")}
                              </div>
                            ` : ''}
                          </div>
                        `;
                      }).join("")}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <!-- Footer Buttons -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 2px solid #cbd5e1; padding-top: 10px; margin-top: 4px;">
          <button type="button" id="btn-grp-new" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 22px; font-weight: bold; cursor: pointer; color: black; border-radius: 3px; box-shadow: 1px 1px 2px white inset;">New</button>
          <button type="button" id="btn-grp-save" style="background: #0284c7; color: white; border: 1px solid #0369a1; padding: 6px 24px; font-weight: bold; cursor: pointer; border-radius: 3px; box-shadow: 1px 1px 2px rgba(255,255,255,0.3) inset;">Save</button>
          <button type="button" id="btn-grp-delete" style="background: #ef4444; color: white; border: 1px solid #b91c1c; padding: 6px 20px; font-weight: bold; cursor: pointer; border-radius: 3px;" ${selectedGroup ? '' : 'disabled'}>Delete</button>
          <button type="button" id="btn-grp-close" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; border-radius: 3px;">Close</button>
        </div>
      </div>
    `;

    // Bind Column Header Sorting
    container.querySelectorAll(".sortable-grp-th").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.getAttribute("data-sort");
        if (grpSortCol === col) {
          grpSortDir = grpSortDir === "asc" ? "desc" : "asc";
        } else {
          grpSortCol = col;
          grpSortDir = "asc";
        }
        renderView();
      });
    });

    const searchInput = container.querySelector("#grp-search");
    searchInput.addEventListener("input", () => {
      grpSearchQuery = searchInput.value;
      const q = grpSearchQuery.toLowerCase();
      container.querySelectorAll("#grp-table-body tr").forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? "table-row" : "none";
      });
    });

    // Bind row selection (single-click highlights, double-click edits)
    container.querySelectorAll(".grp-row-select").forEach(row => {
      row.addEventListener("click", () => {
        grpHighlightedGroupId = row.getAttribute("data-id");
        container.querySelectorAll(".grp-row-select").forEach(r => {
          r.style.backgroundColor = r.getAttribute("data-id") === grpHighlightedGroupId ? "#bae6fd" : "white";
        });
      });

      row.addEventListener("dblclick", () => {
        const id = row.getAttribute("data-id");
        grpSelectedGroupId = id;
        selectedGroup = groups.find(g => g.id === id);
        renderView();
      });
    });

    // Bind Close
    container.querySelector("#btn-grp-close").addEventListener("click", () => {
      window.location.hash = "";
    });

    // Bind New
    container.querySelector("#btn-grp-new").addEventListener("click", () => {
      grpSelectedGroupId = null;
      grpHighlightedGroupId = null;
      selectedGroup = null;
      renderView();
    });

    // Bind Save
    container.querySelector("#btn-grp-save").addEventListener("click", () => {
      const name = container.querySelector("#grp-name").value.trim();
      const under = container.querySelector("#grp-under").value;
      const isDefault = container.querySelector("#grp-default").checked;
      
      if (!name) {
        alert("Please enter a Group Name.");
        return;
      }

      // Ask security password
      const pass = prompt("Enter Admin Security Password to make changes to Account Groups:");
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password!");
        return;
      }

      try {
        if (selectedGroup) {
          // Update
          selectedGroup.name = name;
          selectedGroup.under = under;
          selectedGroup.isDefault = isDefault;
          state.saveState();
          alert("Account Group updated successfully.");
        } else {
          // Create
          state.addAccountGroup({ name, under });
          alert("Account Group created successfully.");
        }
        grpSelectedGroupId = null;
        grpHighlightedGroupId = null;
        selectedGroup = null;
        renderGroups(container);
      } catch (err) {
        alert("Error: " + err.message);
      }
    });

    // Bind Delete
    container.querySelector("#btn-grp-delete").addEventListener("click", () => {
      if (selectedGroup) {
        if (selectedGroup.isDefault) {
          alert("Cannot delete a system default Account Group.");
          return;
        }

        // Ask security password
        const pass = prompt("Enter Admin Security Password to delete Account Group:");
        if (pass === null) return;
        if (pass !== state.getAdminPassword()) {
          alert("Incorrect password!");
          return;
        }

        if (confirm(`Are you sure you want to delete Account Group "${selectedGroup.name}"?`)) {
          state.deleteAccountGroup(selectedGroup.id);
          alert("Account Group deleted.");
          grpSelectedGroupId = null;
          grpHighlightedGroupId = null;
          selectedGroup = null;
          renderGroups(container);
        }
      }
    });
  }

  renderView();
}

// 2. LEDGER CREATION
export function renderLedger(container) {
  state.purgeContactLedgers();
  const rawLedgers = state.getLedgers();
  const groups = state.getAccountGroups();
  const contacts = state.getContacts();
  const contactNamesSet = new Set(contacts.map(c => (c.name || "").trim().toUpperCase()));

  const ledgers = rawLedgers.filter(l => {
    const cleanName = String(l.name || "").trim().toUpperCase();
    const gName = String(l.groupName || "").trim().toUpperCase();
    if (contactNamesSet.has(cleanName)) return false;
    if (gName === "SUNDRY CREDITORS" || gName === "SUNDRY DEBTORS") return false;
    return true;
  });

  const parentCustomers = contacts.filter(c => (c.type === "customer" || c.listInCustomerList) && c.hasOtherLedgers === true);
  let selectedLedger = ldSelectedLedgerCode ? ledgers.find(l => l.code === ldSelectedLedgerCode) || null : null;

  function renderView() {
    const sortedLedgers = [...ledgers].sort((a, b) => {
      let valA = a[ldSortCol];
      let valB = b[ldSortCol];
      if (ldSortCol === "openingBalance") {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
        return ldSortDir === "asc" ? valA - valB : valB - valA;
      } else {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return ldSortDir === "asc" ? cmp : -cmp;
      }
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; flex-grow: 1; height: 100%; min-height: 560px; box-sizing: border-box; gap: 12px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 0.85rem; color: black; background-color: #cbd5e1; padding: 15px; border-radius: 4px; border: 1px solid #94a3b8;">
        
        <!-- Header Form Fields -->
        <div style="background-color: #e2e8f0; padding: 14px 16px; border: 1px solid #94a3b8; border-radius: 4px; display: flex; flex-direction: column; gap: 10px; color: black; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-weight: 700; font-size: 0.85rem; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-book-bookmark"></i> ${selectedLedger ? 'EDIT LEDGER ACCOUNT' : 'CREATE LEDGER ACCOUNT'}
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; color: black;">
            <div style="display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 8px; color: black;">
              <label style="font-weight: bold; color: black;">Ledger Code:</label>
              <input type="text" id="ld-code" class="form-control" style="background-color: #f1f5f9; font-weight: bold; color: #1e3a8a; border: 1px solid #94a3b8; padding: 4px 8px; font-size: 0.85rem;" value="${selectedLedger ? selectedLedger.code : state.generateNextLedgerCode()}" readonly>
            </div>
            <div style="display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 8px; color: black;">
              <label style="font-weight: bold; color: black;">Ledger Name:</label>
              <input type="text" id="ld-name" class="form-control" style="background-color: white; color: black; border: 1px solid #94a3b8; padding: 4px 8px; font-size: 0.85rem; font-weight: 600;" value="${selectedLedger ? selectedLedger.name : ''}" placeholder="Enter Ledger Name..." required>
            </div>
            <div style="display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 8px; color: black;">
              <label style="font-weight: bold; color: black;">Group of:</label>
              <select id="ld-group" class="form-control" style="background-color: white; color: black; border: 1px solid #94a3b8; padding: 4px 8px; font-size: 0.85rem;">
                ${groups.map(g => `<option value="${g.name}" ${selectedLedger && selectedLedger.groupName === g.name ? 'selected' : ''}>${g.name}</option>`).join("")}
                ${parentCustomers.filter(c => !groups.some(g => g.name.toUpperCase() === c.name.toUpperCase())).map(c => `<option value="${c.name}" ${selectedLedger && selectedLedger.groupName === c.name ? 'selected' : ''}>${c.name}</option>`).join("")}
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 8px; color: black;">
              <label style="font-weight: bold; color: black;">Opening Balance:</label>
              <div style="display: flex; gap: 6px;">
                <input type="number" step="0.01" id="ld-balance" class="form-control" style="background-color: white; color: black; border: 1px solid #94a3b8; padding: 4px 8px; font-size: 0.85rem; flex-grow:1; text-align: right; font-weight: 600;" value="${selectedLedger ? selectedLedger.openingBalance : '0.00'}">
                <select id="ld-baltype" class="form-control" style="background-color: white; color: black; border: 1px solid #94a3b8; padding: 4px 8px; font-size: 0.85rem; width: 85px; font-weight: 600;">
                  <option value="Debit" ${selectedLedger && selectedLedger.balanceType === 'Debit' ? 'selected' : ''}>Debit</option>
                  <option value="Credit" ${selectedLedger && selectedLedger.balanceType === 'Credit' ? 'selected' : ''}>Credit</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls Toolbar: Search & Action Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <!-- Search Bar -->
          <div style="display: flex; gap: 8px; align-items: center; background-color: #e2e8f0; padding: 6px 12px; border: 1px solid #94a3b8; border-radius: 4px; flex-grow: 1; max-width: 450px;">
            <i class="fa-solid fa-magnifying-glass" style="color: #475569;"></i>
            <input type="text" id="ld-search" class="form-control" style="background-color: white; color: black; padding: 4px 8px; font-size: 0.8rem; flex-grow: 1; border: 1px solid #94a3b8; border-radius: 3px;" placeholder="Search Ledgers by Name, Code or Group..." value="${ldSearchQuery}">
          </div>

          <!-- Buttons Row -->
          <div style="display: flex; gap: 8px;">
            <button type="button" id="btn-ld-new" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; border-radius: 3px; box-shadow: 1px 1px 2px white inset;">NEW</button>
            <button type="button" id="btn-ld-save" style="background: #0284c7; color: white; border: 1px solid #0369a1; padding: 6px 24px; font-weight: bold; cursor: pointer; border-radius: 3px; box-shadow: 1px 1px 2px rgba(255,255,255,0.3) inset;">SAVE</button>
            <button type="button" id="btn-ld-edit" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; border-radius: 3px;" ${selectedLedger ? '' : 'disabled'}>EDIT</button>
            <button type="button" id="btn-ld-delete" style="background: #ef4444; color: white; border: 1px solid #b91c1c; padding: 6px 18px; font-weight: bold; cursor: pointer; border-radius: 3px;" ${selectedLedger ? '' : 'disabled'}>DELETE</button>
            <button type="button" id="btn-ld-exit" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; border-radius: 3px;">EXIT</button>
          </div>
        </div>

        <!-- Ledgers Table -->
        <div style="background-color: white; border: 1px solid #94a3b8; border-radius: 4px; flex: 1 1 0; min-height: 0; overflow-y: auto; color: black; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: black;">
            <thead style="position: sticky; top: 0; z-index: 1;">
              <tr style="background-color: #cbd5e1; color: black; border-bottom: 2px solid #94a3b8;">
                <th class="sortable-ld-th" data-sort="code" style="padding: 7px 10px; width: 120px; border-right: 1px solid #94a3b8; color: black; font-weight: 700; cursor: pointer; user-select: none;" title="Click to sort by Ledger Code">
                  Ledger Code ${ldSortCol === 'code' ? (ldSortDir === 'asc' ? '▲' : '▼') : '<span style="opacity:0.35;">↕</span>'}
                </th>
                <th class="sortable-ld-th" data-sort="name" style="padding: 7px 10px; border-right: 1px solid #94a3b8; color: black; font-weight: 700; cursor: pointer; user-select: none;" title="Click to sort by Account Head">
                  Account Head ${ldSortCol === 'name' ? (ldSortDir === 'asc' ? '▲' : '▼') : '<span style="opacity:0.35;">↕</span>'}
                </th>
                <th class="sortable-ld-th" data-sort="groupName" style="padding: 7px 10px; border-right: 1px solid #94a3b8; color: black; font-weight: 700; cursor: pointer; user-select: none;" title="Click to sort by Under Group">
                  Under Group ${ldSortCol === 'groupName' ? (ldSortDir === 'asc' ? '▲' : '▼') : '<span style="opacity:0.35;">↕</span>'}
                </th>
                <th class="sortable-ld-th" data-sort="openingBalance" style="padding: 7px 10px; text-align: right; width: 140px; border-right: 1px solid #94a3b8; color: black; font-weight: 700; cursor: pointer; user-select: none;" title="Click to sort by Opening Balance">
                  Op. Balance ${ldSortCol === 'openingBalance' ? (ldSortDir === 'asc' ? '▲' : '▼') : '<span style="opacity:0.35;">↕</span>'}
                </th>
                <th class="sortable-ld-th" data-sort="balanceType" style="padding: 7px 10px; width: 100px; color: black; font-weight: 700; cursor: pointer; user-select: none;" title="Click to sort by Balance Type">
                  Type ${ldSortCol === 'balanceType' ? (ldSortDir === 'asc' ? '▲' : '▼') : '<span style="opacity:0.35;">↕</span>'}
                </th>
              </tr>
            </thead>
            <tbody id="ld-table-body">
              ${sortedLedgers.map(l => {
                const matches = !ldSearchQuery || l.name.toLowerCase().includes(ldSearchQuery.toLowerCase()) || l.groupName.toLowerCase().includes(ldSearchQuery.toLowerCase()) || l.code.toLowerCase().includes(ldSearchQuery.toLowerCase());
                const isHighlighted = ldHighlightedLedgerCode === l.code || (selectedLedger && selectedLedger.code === l.code);
                return `
                  <tr class="ledger-row-select" data-code="${l.code}" style="border-bottom: 1px solid #e2e8f0; cursor: pointer; color: black; display: ${matches ? 'table-row' : 'none'}; background-color: ${isHighlighted ? '#bae6fd' : 'white'};" onmouseover="if(!this.style.background.includes('bae6fd')) this.style.background='#f1f5f9'" onmouseout="if(!this.style.background.includes('bae6fd')) this.style.background='white'">
                    <td style="padding: 7px 10px; font-weight: bold; border-right: 1px solid #e2e8f0; color: #1e3a8a;">${l.code}</td>
                    <td style="padding: 7px 10px; font-weight: bold; border-right: 1px solid #e2e8f0; color: black;">${l.name}</td>
                    <td style="padding: 7px 10px; border-right: 1px solid #cbd5e1; color: black;">${l.groupName}</td>
                    <td style="padding: 7px 10px; text-align: right; border-right: 1px solid #cbd5e1; font-weight: 600; color: black;">${(l.openingBalance || 0).toFixed(2)}</td>
                    <td style="padding: 7px 10px; font-weight: 500; color: black;">${l.balanceType || 'Debit'}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind Column Header Sorting
    container.querySelectorAll(".sortable-ld-th").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.getAttribute("data-sort");
        if (ldSortCol === col) {
          ldSortDir = ldSortDir === "asc" ? "desc" : "asc";
        } else {
          ldSortCol = col;
          ldSortDir = "asc";
        }
        renderView();
      });
    });

    const searchInput = container.querySelector("#ld-search");
    searchInput.addEventListener("input", () => {
      ldSearchQuery = searchInput.value;
      const q = ldSearchQuery.toLowerCase();
      container.querySelectorAll("#ld-table-body tr").forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = (!q || text.includes(q)) ? "table-row" : "none";
      });
    });

    // Delegated Row Select
    const tableBody = container.querySelector("#ld-table-body");
    tableBody.addEventListener("click", (e) => {
      const row = e.target.closest(".ledger-row-select");
      if (!row) return;
      ldHighlightedLedgerCode = row.getAttribute("data-code");
      tableBody.querySelectorAll(".ledger-row-select").forEach(r => {
        r.style.backgroundColor = r.getAttribute("data-code") === ldHighlightedLedgerCode ? "#bae6fd" : "white";
      });
    });

    tableBody.addEventListener("dblclick", (e) => {
      const row = e.target.closest(".ledger-row-select");
      if (!row) return;
      const code = row.getAttribute("data-code");
      ldSelectedLedgerCode = code;
      selectedLedger = ledgers.find(l => l.code === code);
      renderView();
    });

    // Exit
    container.querySelector("#btn-ld-exit").addEventListener("click", () => {
      window.location.hash = "";
    });

    // New
    container.querySelector("#btn-ld-new").addEventListener("click", () => {
      ldSelectedLedgerCode = null;
      ldHighlightedLedgerCode = null;
      selectedLedger = null;
      renderView();
    });

    // Save
    container.querySelector("#btn-ld-save").addEventListener("click", () => {
      const code = container.querySelector("#ld-code").value.trim();
      const name = container.querySelector("#ld-name").value.trim();
      const groupName = container.querySelector("#ld-group").value;
      const openingBalance = parseFloat(container.querySelector("#ld-balance").value) || 0;
      const balanceType = container.querySelector("#ld-baltype").value;

      if (!code || !name) {
        alert("Please enter both Ledger Code and Name.");
        return;
      }

      // Ask security password
      const pass = prompt("Enter Admin Security Password to make changes to Ledgers:");
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password!");
        return;
      }

      const parentCust = parentCustomers.find(c => c.name.toUpperCase() === groupName.toUpperCase());
      const parentCustomerId = parentCust ? parentCust.id : null;
      const isCustomerSubLedger = !!parentCust;

      try {
        if (selectedLedger) {
          state.updateLedger(selectedLedger.code, { name, groupName, openingBalance, balanceType, parentCustomerId, isCustomerSubLedger });
          alert("Ledger updated successfully.");
        } else {
          state.addLedger({ code, name, groupName, openingBalance, balanceType, parentCustomerId, isCustomerSubLedger });
          alert("Ledger created successfully.");
        }
        ldSelectedLedgerCode = null;
        ldHighlightedLedgerCode = null;
        selectedLedger = null;
        renderLedger(container);
      } catch (err) {
        alert("Error: " + err.message);
      }
    });

    // Edit (focuses name input)
    container.querySelector("#btn-ld-edit").addEventListener("click", () => {
      container.querySelector("#ld-name").focus();
    });

    // Delete
    container.querySelector("#btn-ld-delete").addEventListener("click", () => {
      if (selectedLedger) {
        // Ask security password
        const pass = prompt("Enter Admin Security Password to delete Ledger:");
        if (pass === null) return;
        if (pass !== state.getAdminPassword()) {
          alert("Incorrect password!");
          return;
        }

        if (confirm(`Are you sure you want to delete Ledger "${selectedLedger.name}"?`)) {
          try {
            state.deleteLedger(selectedLedger.code);
            alert("Ledger deleted.");
            ldSelectedLedgerCode = null;
            ldHighlightedLedgerCode = null;
            selectedLedger = null;
            renderLedger(container);
          } catch (err) {
            alert(err.message);
          }
        }
      }
    });
  }

  renderView();
}
