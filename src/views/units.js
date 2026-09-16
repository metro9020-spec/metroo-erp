import { state } from "../state.js";

export function showUnitSettingsModal(container, selectedUnitId = null, onSelect = null) {
  const isSubModal = container.id === "sub-modal-container-root";
  const root = container;
  
  let unitsList = state.getUnits();
  let selectedUnit = selectedUnitId ? unitsList.find(u => String(u.id) === String(selectedUnitId)) : null;
  let activeSearch = "";
  
  function renderContent() {
    unitsList = state.getUnits();
    const filteredUnits = unitsList.filter(u => {
      const q = activeSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.symbol.toLowerCase().includes(q) || u.category.toLowerCase().includes(q);
    });

    // Generate alternate units option elements (excluding selected unit to avoid circular conversions)
    const otherUnits = unitsList.filter(u => !selectedUnit || String(u.id) !== String(selectedUnit.id));

    root.innerHTML = `
      <div class="modal-overlay active" id="units-modal-overlay" style="display:flex; z-index: ${isSubModal ? 1000100 : 999900};">
        <div class="modal-container" style="max-width: 900px; width: 90%; background-color: #b0c4de; color: #000; padding: 6px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto;">
          
          <!-- Window Header Ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color: white; display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-weight: 700; font-size: 0.85rem; border-radius: 2px 2px 0 0; border-bottom: 1px solid #1d4ed8;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-ruler-combined"></i> UNIT SETTINGS
            </div>
            <button style="background:none; border:none; color:white; font-size:1.1rem; cursor:pointer; line-height: 1;" id="units-close-btn-header">&times;</button>
          </div>

          <!-- Main Layout Split -->
          <div style="display: flex; gap: 8px; margin-top: 6px; padding: 4px;">
            
            <!-- Left Side Inputs Form -->
            <div style="flex: 1.2; display: flex; flex-direction: column; gap: 10px; background-color: #b0c4de; padding-right: 6px;">
              
              <!-- Category select -->
              <div style="display: grid; grid-template-columns: 140px 1fr; align-items: center;">
                <label style="font-size:0.8rem; font-weight:600;"><span style="text-decoration: underline;">U</span>nit Category</label>
                <select id="unit-category" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 2px 4px; font-size: 0.8rem; height: 22px;">
                  <option value="AREA" ${selectedUnit && selectedUnit.category === "AREA" ? "selected" : ""}>AREA</option>
                  <option value="WEIGHT" ${selectedUnit && selectedUnit.category === "WEIGHT" ? "selected" : ""}>WEIGHT</option>
                  <option value="VOLUME" ${selectedUnit && selectedUnit.category === "VOLUME" ? "selected" : ""}>VOLUME</option>
                  <option value="LENGTH" ${selectedUnit && selectedUnit.category === "LENGTH" ? "selected" : ""}>LENGTH</option>
                  <option value="COUNT" ${selectedUnit && selectedUnit.category === "COUNT" ? "selected" : ""}>COUNT</option>
                </select>
              </div>

              <!-- Unit Name -->
              <div style="display: grid; grid-template-columns: 140px 1fr; align-items: center;">
                <label style="font-size:0.8rem; font-weight:600;">Unit Na<span style="text-decoration: underline;">m</span>e</label>
                <input type="text" id="unit-name" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 2px 4px; font-size: 0.8rem; height: 18px;" value="${selectedUnit ? selectedUnit.name : ""}">
              </div>

              <!-- Unit Symbols -->
              <div style="display: grid; grid-template-columns: 140px 1fr; align-items: center;">
                <label style="font-size:0.8rem; font-weight:600;">Unit S<span style="text-decoration: underline;">y</span>mbols</label>
                <input type="text" id="unit-symbol" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 2px 4px; font-size: 0.8rem; height: 18px;" value="${selectedUnit ? selectedUnit.symbol : ""}">
              </div>

              <!-- Alternate Unit Name in Bill -->
              <div style="display: grid; grid-template-columns: 140px 1fr; align-items: center;">
                <label style="font-size:0.8rem; font-weight:600; line-height: 1.1;">Alternate Unit<br>Name in Bill</label>
                <input type="text" id="unit-altname" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 2px 4px; font-size: 0.8rem; height: 18px;" value="${selectedUnit ? selectedUnit.altNameInBill : ""}">
              </div>

              <!-- One Unit Equals conversion box -->
              <fieldset style="border: 1px dashed #7a96b2; padding: 8px 10px; margin-top: 4px; border-radius: 2px; position:relative;">
                <legend style="font-size: 0.75rem; font-weight: 700; background-color: #b0c4de; padding: 0 4px; color: #1e3a8a;">One Unit Equals</legend>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <input type="number" step="0.00001" id="unit-convval" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 2px 4px; font-size: 0.8rem; width: 80px; height: 18px;" value="${selectedUnit ? selectedUnit.conversionValue : "1"}">
                  <select id="unit-convunit" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 2px 4px; font-size: 0.8rem; flex: 1; height: 22px;">
                    <option value="">-- Same Unit --</option>
                    ${otherUnits.map(u => `<option value="${u.name}" ${selectedUnit && selectedUnit.conversionUnit === u.name ? "selected" : ""}>${u.name}</option>`).join("")}
                  </select>
                </div>
              </fieldset>

              <!-- Print Checkbox -->
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 15px;">
                <input type="checkbox" id="unit-printname" ${selectedUnit && selectedUnit.printNameInsteadOfSymbol ? "checked" : ""}>
                <label for="unit-printname" style="font-size:0.75rem; font-weight:600; cursor: pointer;">Print Unit name in Sales Bill Print instead of Unit symbol</label>
              </div>

            </div>

            <!-- Right Side Grid list with search -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; border: 1px solid #7a96b2; background-color: #f8fafc; padding: 4px; border-radius: 2px;">
              <fieldset style="border: 1px solid #94a3b8; padding: 4px 6px; border-radius: 2px; display: flex; flex-direction: column; gap: 2px; margin-bottom: 2px;">
                <legend style="font-size: 0.7rem; font-weight: 700; color: #1e3a8a; background-color: #f8fafc; padding: 0 4px;">Search (Ctrl+H)</legend>
                <input type="text" id="units-search" style="background-color: white; color: black; border: 1px solid #94a3b8; padding: 2px 4px; font-size: 0.8rem; width: 100%; height: 18px;" value="${activeSearch}">
              </fieldset>

              <!-- List Grid -->
              <div style="flex: 1; min-height: 200px; max-height: 250px; overflow-y: auto; border: 1px solid #cbd5e1; background-color: white;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
                  <thead>
                    <tr style="background-color: #cbd5e1; color: black; border-bottom: 1px solid #94a3b8;">
                      <th style="padding: 3px 6px; border-right: 1px solid #cbd5e1; width: 40px; font-weight: 700;">ID</th>
                      <th style="padding: 3px 6px; font-weight: 700;">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredUnits.map(u => `
                      <tr class="unit-row-item ${selectedUnit && String(selectedUnit.id) === String(u.id) ? "selected-unit-row" : ""}" data-id="${u.id}" style="cursor: pointer; border-bottom: 1px solid #e2e8f0; background-color: ${selectedUnit && String(selectedUnit.id) === String(u.id) ? "#3b82f6" : "transparent"}; color: ${selectedUnit && String(selectedUnit.id) === String(u.id) ? "white" : "black"};">
                        <td style="padding: 3px 6px; border-right: 1px solid #e2e8f0;">${u.id}</td>
                        <td style="padding: 3px 6px;">${u.name}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- Bottom Actions Ribbon (exactly matching design style buttons) -->
          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; border-top: 1px solid #94a3b8; margin-top: 8px; padding-top: 6px; background-color: #b0c4de;">
            <button type="button" class="d-btn" id="btn-unit-new" style="padding: 3px 15px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: #e2e8f0; border: 1px solid #475569; color: black; min-width: 75px;"><span style="text-decoration: underline;">N</span>ew</button>
            <button type="button" class="d-btn" id="btn-unit-save" style="padding: 3px 15px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: #e2e8f0; border: 1px solid #475569; color: black; min-width: 75px;"><span style="text-decoration: underline;">S</span>ave</button>
            <button type="button" class="d-btn" id="btn-unit-delete" style="padding: 3px 15px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: #e2e8f0; border: 1px solid #475569; color: black; min-width: 75px;" ${!selectedUnit ? "disabled" : ""}><span style="text-decoration: underline;">D</span>elete</button>
            <button type="button" class="d-btn" id="btn-unit-close" style="padding: 3px 15px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: #e2e8f0; border: 1px solid #475569; color: black; min-width: 75px;"><span style="text-decoration: underline;">C</span>lose</button>
          </div>

        </div>
      </div>
    `;

    // Scoped CSS rules
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      .unit-row-item:hover {
        background-color: #cbd5e1 !important;
        color: black !important;
      }
      .unit-row-item.selected-unit-row {
        background-color: #1e3a8a !important;
        color: white !important;
      }
      .d-btn {
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.15);
      }
      .d-btn:hover {
        background-color: #cbd5e1 !important;
      }
      .d-btn:active {
        background-color: #94a3b8 !important;
      }
      .d-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    root.appendChild(styleEl);

    // --- Add Event Listeners ---
    
    const closeOverlay = () => {
      root.innerHTML = "";
    };

    document.getElementById("units-close-btn-header").addEventListener("click", closeOverlay);
    document.getElementById("btn-unit-close").addEventListener("click", closeOverlay);

    // Search input handler
    const searchInput = document.getElementById("units-search");
    searchInput.addEventListener("input", (e) => {
      activeSearch = e.target.value;
      renderContent();
      const updatedSearch = document.getElementById("units-search");
      updatedSearch.focus();
      updatedSearch.setSelectionRange(updatedSearch.value.length, updatedSearch.value.length);
    });

    // Keyboard focus search shortcut Ctrl+H
    root.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        document.getElementById("units-search").focus();
      }
    });

    // Grid row item click trigger
    root.querySelectorAll(".unit-row-item").forEach(row => {
      row.addEventListener("click", () => {
        const uId = row.getAttribute("data-id");
        selectedUnit = unitsList.find(u => String(u.id) === String(uId));
        renderContent();
      });
    });

    // New Unit
    document.getElementById("btn-unit-new").addEventListener("click", () => {
      selectedUnit = null;
      renderContent();
      document.getElementById("unit-name").focus();
    });

    // Delete Unit
    const deleteBtn = document.getElementById("btn-unit-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (selectedUnit) {
          if (confirm(`Are you sure you want to delete unit "${selectedUnit.name}"?`)) {
            state.deleteUnit(selectedUnit.id);
            selectedUnit = null;
            renderContent();
          }
        }
      });
    }

    // Save Unit
    document.getElementById("btn-unit-save").addEventListener("click", () => {
      const cat = document.getElementById("unit-category").value;
      const name = document.getElementById("unit-name").value.trim();
      const symbol = document.getElementById("unit-symbol").value.trim();
      const altName = document.getElementById("unit-altname").value.trim();
      const convVal = parseFloat(document.getElementById("unit-convval").value) || 1;
      const convUnit = document.getElementById("unit-convunit").value;
      const printName = document.getElementById("unit-printname").checked;

      if (!name || !symbol) {
        alert("Please specify a valid Unit Name and Symbol.");
        return;
      }

      const unitPayload = {
        category: cat,
        name: name,
        symbol: symbol,
        altNameInBill: altName || name,
        conversionValue: convVal,
        conversionUnit: convUnit || symbol,
        printNameInsteadOfSymbol: printName
      };

      if (selectedUnit) {
        state.updateUnit(selectedUnit.id, unitPayload);
        alert("Unit updated successfully.");
      } else {
        const newUnit = state.addUnit(unitPayload);
        selectedUnit = newUnit;
        alert("Unit created successfully.");
      }

      if (onSelect) {
        onSelect(symbol);
      }

      renderContent();
    });
  }

  renderContent();
}
