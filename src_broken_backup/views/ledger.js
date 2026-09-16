import { state } from "../state.js";

// 1. ACCOUNT GROUP MASTER
export function renderGroups(container) {
  const groups = state.getAccountGroups();
  let selectedGroup = null;
  let highlightedGroupId = null;
  let searchQuery = "";

  function renderView() {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-family: sans-serif; font-size: 0.85rem; color: black; background-color: #cbd5e1; padding: 15px; border-radius: 4px; border: 1px solid #94a3b8;">
        
        <!-- Left Side: Form and Table -->
        <div style="display: flex; flex-direction: column; gap: 15px; color: black;">
          <!-- Form Panel -->
          <div style="background-color: #e2e8f0; padding: 15px; border: 1px solid #94a3b8; border-radius: 4px; display: flex; flex-direction: column; gap: 8px; color: black;">
            <div style="display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 8px; color: black;">
              <label style="font-weight: bold; color: black;">ID</label>
              <input type="text" id="grp-id" class="form-control" style="background-color: #f1f5f9; width: 150px; font-weight: bold; color: black;" readonly value="${selectedGroup ? selectedGroup.id : String(groups.length + 46)}">
            </div>
            
            <div style="display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 8px; color: black;">
              <label style="font-weight: bold; color: black;">Name</label>
              <input type="text" id="grp-name" class="form-control" style="background-color: white; color: black;" value="${selectedGroup ? selectedGroup.name : ''}" required>
            </div>
            
            <div style="display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 8px; color: black;">
              <label style="font-weight: bold; color: black;">Default</label>
              <input type="checkbox" id="grp-default" ${selectedGroup && selectedGroup.isDefault ? 'checked' : ''}>
            </div>
            
            <div style="display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 8px; color: black;">
              <label style="font-weight: bold; color: black;">Under</label>
              <select id="grp-under" class="form-control" style="background-color: white; color: black;">
                <option value="ASSETS" ${selectedGroup && selectedGroup.under === 'ASSETS' ? 'selected' : ''}>ASSETS</option>
                <option value="LIABILITIES" ${selectedGroup && selectedGroup.under === 'LIABILITIES' ? 'selected' : ''}>LIABILITIES</option>
                <option value="INCOME" ${selectedGroup && selectedGroup.under === 'INCOME' ? 'selected' : ''}>INCOME</option>
                <option value="EXPENSE" ${selectedGroup && selectedGroup.under === 'EXPENSE' ? 'selected' : ''}>EXPENSE</option>
                ${groups.map(g => `<option value="${g.name}" ${selectedGroup && selectedGroup.under === g.name ? 'selected' : ''}>${g.name}</option>`).join("")}
              </select>
            </div>
          </div>

          <!-- Left Search Bar -->
          <div style="display: flex; gap: 6px; align-items: center; background-color: #e2e8f0; padding: 6px; border: 1px solid #94a3b8; border-radius: 4px;">
            <i class="fa-solid fa-magnifying-glass" style="color: black; margin-left: 4px;"></i>
            <input type="text" id="grp-search" class="form-control" style="background-color: white; color: black; padding: 4px 8px; font-size: 0.8rem; flex-grow: 1;" placeholder="Search Account Groups..." value="${searchQuery}">
          </div>

          <!-- Groups Table -->
          <div style="background-color: white; border: 1px solid #94a3b8; border-radius: 4px; height: 280px; overflow-y: auto; color: black;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: black;">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: black;">
                  <th style="padding: 8px; border-right: 1px solid #cbd5e1; color: black;">Name</th>
                  <th style="padding: 8px; color: black;">Under</th>
                </tr>
              </thead>
              <tbody id="grp-table-body">
                ${groups.map(g => {
                  const matches = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.under.toLowerCase().includes(searchQuery.toLowerCase());
                  const isHighlighted = highlightedGroupId === g.id || (selectedGroup && selectedGroup.id === g.id);
                  return `
                    <tr class="grp-row-select" data-id="${g.id}" style="border-bottom: 1px solid #e2e8f0; cursor: pointer; color: black; display: ${matches ? 'table-row' : 'none'}; background-color: ${isHighlighted ? '#bae6fd' : 'white'};" onmouseover="if(!this.style.background.includes('bae6fd')) this.style.background='#f1f5f9'" onmouseout="if(!this.style.background.includes('bae6fd')) this.style.background='white'">
                      <td style="padding: 8px; font-weight: bold; border-right: 1px solid #e2e8f0; color: black;">${g.name}</td>
                      <td style="padding: 8px; color: black;">${g.under}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Side: Account Group Tree -->
        <div style="background-color: white; padding: 15px; border: 1px solid #94a3b8; border-radius: 4px; display: flex; flex-direction: column; gap: 8px; height: 535px; overflow-y: auto; color: black;">
          <div style="font-weight: bold; font-size: 0.9rem; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px; color: black;">
            ACCOUNT GROUP TREE
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-family: monospace; font-size: 0.85rem; color: black;">
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

        <!-- Footer Buttons -->
        <div style="grid-column: span 2; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 10px;">
          <button type="button" id="btn-grp-new" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">New</button>
          <button type="button" id="btn-grp-save" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">Save</button>
          <button type="button" id="btn-grp-delete" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;" ${selectedGroup ? '' : 'disabled'}>Delete</button>
          <button type="button" id="btn-grp-close" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">Close</button>
        </div>
      </div>
    `;

    const searchInput = container.querySelector("#grp-search");
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      const q = searchQuery.toLowerCase();
      container.querySelectorAll("#grp-table-body tr").forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? "table-row" : "none";
      });
    });

    // Bind row selection (single-click highlights, double-click edits)
    container.querySelectorAll(".grp-row-select").forEach(row => {
      row.addEventListener("click", () => {
        highlightedGroupId = row.getAttribute("data-id");
        container.querySelectorAll(".grp-row-select").forEach(r => {
          r.style.backgroundColor = r.getAttribute("data-id") === highlightedGroupId ? "#bae6fd" : "white";
        });
      });

      row.addEventListener("dblclick", () => {
        const id = row.getAttribute("data-id");
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
      selectedGroup = null;
      highlightedGroupId = null;
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
        selectedGroup = null;
        highlightedGroupId = null;
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
          selectedGroup = null;
          highlightedGroupId = null;
          renderGroups(container);
        }
      }
    });
  }

  renderView();
}

// 2. LEDGER CREATION
export function renderLedger(container) {
  const ledgers = state.getLedgers();
  const groups = state.getAccountGroups();
  let selectedLedger = null;
  let highlightedLedgerCode = null;
  let searchQuery = "";

  function renderView() {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 15px; font-family: sans-serif; font-size: 0.85rem; color: black; background-color: #cbd5e1; padding: 15px; border-radius: 4px; border: 1px solid #94a3b8;">
        
        <!-- Header Form Fields -->
        <div style="background-color: #e2e8f0; padding: 15px; border: 1px solid #94a3b8; border-radius: 4px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; color: black;">

          <div style="display: grid; grid-template-columns: 100px 1fr; align-items: center; gap: 8px; color: black;">
            <label style="font-weight: bold; color: black;">Ledger Name:</label>
            <input type="text" id="ld-name" class="form-control" style="background-color: white; color: black;" value="${selectedLedger ? selectedLedger.name : ''}">
          </div>
          <div style="display: grid; grid-template-columns: 100px 1fr; align-items: center; gap: 8px; color: black;">
            <label style="font-weight: bold; color: black;">Group of:</label>
            <select id="ld-group" class="form-control" style="background-color: white; color: black;">
              ${groups.map(g => `<option value="${g.name}" ${selectedLedger && selectedLedger.groupName === g.name ? 'selected' : ''}>${g.name}</option>`).join("")}
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 100px 1fr; align-items: center; gap: 8px; color: black;">
            <label style="font-weight: bold; color: black;">Opening Balance:</label>
            <div style="display: flex; gap: 6px;">
              <input type="number" step="0.01" id="ld-balance" class="form-control" style="background-color: white; color: black; flex-grow:1;" value="${selectedLedger ? selectedLedger.openingBalance : '0.00'}">
              <select id="ld-baltype" class="form-control" style="background-color: white; color: black; width: 80px;">
                <option value="Debit" ${selectedLedger && selectedLedger.balanceType === 'Debit' ? 'selected' : ''}>Debit</option>
                <option value="Credit" ${selectedLedger && selectedLedger.balanceType === 'Credit' ? 'selected' : ''}>Credit</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Left Search Bar -->
        <div style="display: flex; gap: 6px; align-items: center; background-color: #e2e8f0; padding: 6px; border: 1px solid #94a3b8; border-radius: 4px;">
          <i class="fa-solid fa-magnifying-glass" style="color: black; margin-left: 4px;"></i>
          <input type="text" id="ld-search" class="form-control" style="background-color: white; color: black; padding: 4px 8px; font-size: 0.8rem; flex-grow: 1;" placeholder="Search Ledgers..." value="${searchQuery}">
        </div>

        <!-- Buttons Row -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px;">
          <button type="button" id="btn-ld-new" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">NEW</button>
          <button type="button" id="btn-ld-save" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">SAVE</button>
          <button type="button" id="btn-ld-edit" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;" ${selectedLedger ? '' : 'disabled'}>EDIT</button>
          <button type="button" id="btn-ld-delete" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;" ${selectedLedger ? '' : 'disabled'}>DELETE</button>
          <button type="button" id="btn-ld-exit" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">EXIT</button>
        </div>

        <!-- Ledgers Table -->
        <div style="background-color: white; border: 1px solid #94a3b8; border-radius: 4px; height: 350px; overflow-y: auto; color: black;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: black;">
            <thead>
              <tr style="background-color: #e2e8f0; color: black; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 8px; border-right: 1px solid #cbd5e1; color: black;">Account Head</th>
                <th style="padding: 8px; border-right: 1px solid #cbd5e1; color: black;">Under</th>
                <th style="padding: 8px; text-align: right; border-right: 1px solid #cbd5e1; color: black;">Op.Bal</th>
                <th style="padding: 8px; color: black;">Debit/Credit</th>
              </tr>
            </thead>
            <tbody id="ld-table-body">
              ${ledgers.map(l => {
                const matches = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.groupName.toLowerCase().includes(searchQuery.toLowerCase());
                const isHighlighted = highlightedLedgerCode === l.code || (selectedLedger && selectedLedger.code === l.code);
                return `
                  <tr class="ledger-row-select" data-code="${l.code}" style="border-bottom: 1px solid #e2e8f0; cursor: pointer; color: black; display: ${matches ? 'table-row' : 'none'}; background-color: ${isHighlighted ? '#bae6fd' : 'white'};" onmouseover="if(!this.style.background.includes('bae6fd')) this.style.background='#f1f5f9'" onmouseout="if(!this.style.background.includes('bae6fd')) this.style.background='white'">
                    <td style="padding: 8px; font-weight: bold; border-right: 1px solid #e2e8f0; color: black;">${l.name}</td>
                    <td style="padding: 8px; border-right: 1px solid #cbd5e1; color: black;">${l.groupName}</td>
                    <td style="padding: 8px; text-align: right; border-right: 1px solid #cbd5e1; font-weight: 600; color: black;">${l.openingBalance.toFixed(2)}</td>
                    <td style="padding: 8px; font-weight: 500; color: black;">${l.balanceType}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const searchInput = container.querySelector("#ld-search");
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      const q = searchQuery.toLowerCase();
      container.querySelectorAll("#ld-table-body tr").forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? "table-row" : "none";
      });
    });

    // Row Select (single-click highlights, double-click edits)
    container.querySelectorAll(".ledger-row-select").forEach(row => {
      row.addEventListener("click", () => {
        highlightedLedgerCode = row.getAttribute("data-code");
        container.querySelectorAll(".ledger-row-select").forEach(r => {
          r.style.backgroundColor = r.getAttribute("data-code") === highlightedLedgerCode ? "#bae6fd" : "white";
        });
      });

      row.addEventListener("dblclick", () => {
        const code = row.getAttribute("data-code");
        selectedLedger = ledgers.find(l => l.code === code);
        renderView();
      });
    });

    // Exit
    container.querySelector("#btn-ld-exit").addEventListener("click", () => {
      window.location.hash = "";
    });

    // New
    container.querySelector("#btn-ld-new").addEventListener("click", () => {
      selectedLedger = null;
      highlightedLedgerCode = null;
      renderView();
    });

    // Save
    container.querySelector("#btn-ld-save").addEventListener("click", () => {
      const name = container.querySelector("#ld-name").value.trim();
      const code = name.toUpperCase();
      const groupName = container.querySelector("#ld-group").value;
      const openingBalance = parseFloat(container.querySelector("#ld-balance").value) || 0;
      const balanceType = container.querySelector("#ld-baltype").value;

      if (!name) {
        alert("Please enter a Ledger Name.");
        return;
      }

      // Ask security password
      const pass = prompt("Enter Admin Security Password to make changes to Ledgers:");
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password!");
        return;
      }

      try {
        if (selectedLedger) {
          state.updateLedger(selectedLedger.code, { name, groupName, openingBalance, balanceType });
          alert("Ledger updated successfully.");
        } else {
          state.addLedger({ code, name, groupName, openingBalance, balanceType });
          alert("Ledger created successfully.");
        }
        selectedLedger = null;
        highlightedLedgerCode = null;
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
            selectedLedger = null;
            highlightedLedgerCode = null;
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
