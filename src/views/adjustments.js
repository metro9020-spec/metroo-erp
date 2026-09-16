import { state } from "../state.js";

let activeTab = "sales"; // 'sales' or 'purchase'
let selectedAdjustment = null;
let highlightedName = null;

export function renderAdjustments(container) {
  const ledgers = state.getLedgers();

  function renderView() {
    const list = activeTab === "sales" ? state.getSalesAdjustments() : state.getPurchaseAdjustments();

    container.innerHTML = `
      <div style="font-family: sans-serif; font-size: 0.85rem; color: black; background-color: #cbd5e1; padding: 15px; border-radius: 4px; border: 1px solid #94a3b8; display: flex; flex-direction: column; gap: 15px;">
        
        <!-- Tabs -->
        <div style="display: flex; gap: 4px; border-bottom: 2px solid #94a3b8; padding-bottom: 2px;">
          <button class="tab-btn" id="tab-sales" style="background-color: ${activeTab === 'sales' ? '#f1f5f9' : '#cbd5e1'}; font-weight: bold; border: 1px solid #94a3b8; border-bottom: none; border-radius: 4px 4px 0 0; padding: 6px 20px; cursor: pointer; color: black;">Sales</button>
          <button class="tab-btn" id="tab-purchase" style="background-color: ${activeTab === 'purchase' ? '#f1f5f9' : '#cbd5e1'}; font-weight: bold; border: 1px solid #94a3b8; border-bottom: none; border-radius: 4px 4px 0 0; padding: 6px 20px; cursor: pointer; color: black;">Purchase</button>
        </div>

        <!-- Form fields -->
        <div style="background-color: #e2e8f0; padding: 15px; border: 1px solid #94a3b8; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-weight: bold; color: black;">Adjustment Caption</label>
            <input type="text" id="adj-caption" class="form-control" style="background-color: white; color: black;" value="${selectedAdjustment ? selectedAdjustment.name : ''}">
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-weight: bold; color: black;">Affecting Ledger</label>
            <select id="adj-ledger" class="form-control" style="background-color: white; color: black;">
              <option value="">-- Select Ledger --</option>
              ${ledgers.map(l => `<option value="${l.code}" ${selectedAdjustment && selectedAdjustment.ledgerCode === l.code ? 'selected' : ''}>${l.name}</option>`).join("")}
            </select>
          </div>
        </div>

        <!-- Grid of Adjustments -->
        <div style="background-color: white; border: 1px solid #94a3b8; border-radius: 4px; height: 300px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: black;">
            <thead>
              <tr style="background-color: #e2e8f0; border-bottom: 2px solid #cbd5e1; font-weight: bold;">
                <th style="padding: 8px; border-right: 1px solid #cbd5e1; color: black;">Adjustment Caption</th>
                <th style="padding: 8px; color: black;">Affecting Ledger Name</th>
              </tr>
            </thead>
            <tbody>
              ${list.length === 0 ? `
                <tr><td colspan="2" style="padding: 20px; text-align: center; color: #777; font-style: italic;">No adjustments defined.</td></tr>
              ` : list.map(item => {
                const ledger = ledgers.find(l => l.code === item.ledgerCode);
                const isHighlighted = highlightedName === item.name || (selectedAdjustment && selectedAdjustment.name === item.name);
                return `
                  <tr class="adj-row-select" data-name="${item.name}" style="border-bottom: 1px solid #e2e8f0; cursor: pointer; background-color: ${isHighlighted ? '#bae6fd' : 'white'};">
                    <td style="padding: 8px; font-weight: bold; border-right: 1px solid #e2e8f0; color: black;">${item.name}</td>
                    <td style="padding: 8px; color: black;">${ledger ? ledger.name : item.ledgerCode}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>

        <!-- Footer Buttons -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #cbd5e1; padding-top: 12px;">
          <button type="button" id="btn-adj-new" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">New</button>
          <button type="button" id="btn-adj-save" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">Save</button>
          <button type="button" id="btn-adj-delete" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;" ${selectedAdjustment ? '' : 'disabled'}>Delete</button>
          <button type="button" id="btn-adj-close" style="background: #e2e8f0; border: 1px solid #475569; padding: 6px 20px; font-weight: bold; cursor: pointer; color: black; box-shadow: 1px 1px 2px white inset;">Close</button>
        </div>

      </div>
    `;

    // Bind tab clicks
    container.querySelector("#tab-sales").addEventListener("click", () => {
      activeTab = "sales";
      selectedAdjustment = null;
      highlightedName = null;
      renderView();
    });
    container.querySelector("#tab-purchase").addEventListener("click", () => {
      activeTab = "purchase";
      selectedAdjustment = null;
      highlightedName = null;
      renderView();
    });

    // Row selection
    container.querySelectorAll(".adj-row-select").forEach(row => {
      row.addEventListener("click", () => {
        highlightedName = row.getAttribute("data-name");
        container.querySelectorAll(".adj-row-select").forEach(r => {
          r.style.backgroundColor = r.getAttribute("data-name") === highlightedName ? "#bae6fd" : "white";
        });
      });

      row.addEventListener("dblclick", () => {
        const name = row.getAttribute("data-name");
        selectedAdjustment = list.find(x => x.name === name);
        renderView();
      });
    });

    // New button
    container.querySelector("#btn-adj-new").addEventListener("click", () => {
      selectedAdjustment = null;
      highlightedName = null;
      renderView();
    });

    // Close button
    container.querySelector("#btn-adj-close").addEventListener("click", () => {
      window.location.hash = "";
    });

    // Delete button
    container.querySelector("#btn-adj-delete").addEventListener("click", () => {
      if (selectedAdjustment) {
        const pass = prompt("Enter Admin Password to delete adjustment:");
        if (pass === null) return;
        if (pass !== state.getAdminPassword()) {
          alert("Incorrect password!");
          return;
        }

        const filtered = list.filter(x => x.name !== selectedAdjustment.name);
        if (activeTab === "sales") {
          state.saveSalesAdjustments(filtered);
        } else {
          state.savePurchaseAdjustments(filtered);
        }
        alert("Adjustment deleted.");
        selectedAdjustment = null;
        highlightedName = null;
        renderView();
      }
    });

    // Save button
    container.querySelector("#btn-adj-save").addEventListener("click", () => {
      const name = container.querySelector("#adj-caption").value.trim().toUpperCase();
      const ledgerCode = container.querySelector("#adj-ledger").value;

      if (!name || !ledgerCode) {
        alert("Please enter Caption and select Affected Ledger.");
        return;
      }

      const pass = prompt("Enter Admin Password to save adjustments:");
      if (pass === null) return;
      if (pass !== state.getAdminPassword()) {
        alert("Incorrect password!");
        return;
      }

      let updatedList = [...list];
      if (selectedAdjustment) {
        // Edit mode: find existing and update
        const idx = updatedList.findIndex(x => x.name === selectedAdjustment.name);
        if (idx !== -1) {
          updatedList[idx] = { name, ledgerCode };
        }
      } else {
        // Add mode: verify uniqueness
        if (updatedList.some(x => x.name === name)) {
          alert("Adjustment with this name already exists.");
          return;
        }
        updatedList.push({ name, ledgerCode });
      }

      if (activeTab === "sales") {
        state.saveSalesAdjustments(updatedList);
      } else {
        state.savePurchaseAdjustments(updatedList);
      }

      alert("Adjustment saved successfully.");
      selectedAdjustment = null;
      highlightedName = null;
      renderView();
    });
  }

  renderView();
}
