import { state } from "../state.js";

export function showLoyaltyMasterModal() {
  const root = document.getElementById("modal-container-root");
  let programs = state.getLoyaltyPrograms();
  const influencers = state.getInfluencers();
  const materials = state.getMaterials();

  let selectedInfluencers = []; // array of influencer names
  let selectedProducts = []; // array of { materialId, points, tempName }

  const renderModalContent = () => {
    programs = state.getLoyaltyPrograms();
    root.innerHTML = `
      <div class="modal-overlay active" id="loyalty-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
        <div class="modal-container" style="max-width:1150px; width: 95%; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          
          <!-- Header ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px; border-bottom: 1px solid #1d4ed8;">
            <div style="display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-trophy"></i> MASTERS - LOYALTY PROGRAM REGISTRY MASTER
            </div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="loyalty-close-btn-header">&times;</button>
          </div>

          <!-- Master form panels -->
          <div style="display:grid; grid-template-columns: 1fr 1.3fr; gap:12px; margin-top:12px;">
            
            <!-- Left Panel: Program Details & Influencers Selection -->
            <div style="display:flex; flex-direction:column; gap:10px; background-color:#f1f5f9; padding:10px; border:1px solid #94a3b8; border-radius:3px;">
              <form id="loyalty-entry-form" style="display:flex; flex-direction:column; gap:8px;">
                <input type="hidden" id="prog-id-hidden" value="">
                <div>
                  <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">PROGRAM NAME *</label>
                  <input type="text" id="prog-name" style="width:100%; border:1px solid #7a96b2; padding:4px; font-size:0.8rem; background-color:white; color:black;" required>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                  <div>
                    <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">START DATE *</label>
                    <input type="date" id="prog-start" style="width:100%; border:1px solid #7a96b2; padding:4px; font-size:0.8rem; background-color:white; color:black;" required>
                  </div>
                  <div>
                    <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">END DATE *</label>
                    <input type="date" id="prog-end" style="width:100%; border:1px solid #7a96b2; padding:4px; font-size:0.8rem; background-color:white; color:black;" required>
                  </div>
                </div>
              </form>
              
              <!-- Dynamic Influencers Selection -->
              <div>
                <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">PARTICIPATING INFLUENCERS *</label>
                <div style="display:flex; gap:6px; margin-bottom:6px;">
                  <select id="prog-influencer-select" style="flex:1; padding:3px; font-size:0.8rem; background:white; color:black; border:1px solid #cbd5e1;">
                    <option value="">-- Choose Influencer --</option>
                    ${influencers.map(inf => `<option value="${inf.name}">${inf.name.toUpperCase()}</option>`).join("")}
                  </select>
                  <button type="button" id="btn-prog-add-influencer" style="background-color:#1e3b8b; color:white; border:none; padding:4px 10px; font-size:0.8rem; font-weight:bold; cursor:pointer; border-radius:2px;">Add</button>
                </div>
                <div style="border:1px solid #7a96b2; background-color:white; max-height:120px; overflow-y:auto; border-radius:2px;">
                  <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left;">
                    <thead>
                      <tr style="background-color:#e2e8f0; color:#1e3b8b; font-weight:bold; border-bottom:1px solid #94a3b8;">
                        <th style="padding:4px;">INFLUENCER NAME</th>
                        <th style="padding:4px; width:60px; text-align:center;">ACTION</th>
                      </tr>
                    </thead>
                    <tbody id="prog-influencers-tbody">
                      <!-- Dynamic participating influencers here -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Right Panel: Products and Points -->
            <div style="display:flex; flex-direction:column; gap:10px; background-color:#f1f5f9; padding:10px; border:1px solid #94a3b8; border-radius:3px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-weight:600; font-size:0.75rem;">PRODUCTS & REWARD POINTS CONFIGURATION</label>
                <button type="button" id="btn-prog-add-product" style="background-color:#1e3b8b; color:white; border:none; padding:2px 8px; font-size:0.75rem; font-weight:bold; cursor:pointer; border-radius:2px;">+ Add Product Rule</button>
              </div>
              
              <div style="border:1px solid #94a3b8; background-color:white; flex-grow:1; max-height:220px; overflow-y:auto; border-radius:2px;">
                <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left;" id="prog-products-table">
                  <thead>
                    <tr style="background-color:#e2e8f0; color:#1e3b8b; font-weight:bold; border-bottom:1px solid #94a3b8;">
                      <th style="padding:4px;">PRODUCT NAME</th>
                      <th style="padding:4px;">PRODUCT CODE</th>
                      <th style="padding:4px; width:90px; text-align:right;">POINTS / QTY</th>
                      <th style="padding:4px; width:50px; text-align:center;">ACTION</th>
                    </tr>
                  </thead>
                  <tbody id="prog-products-tbody">
                    <!-- Dynamic rows here -->
                  </tbody>
                </table>
              </div>
              <div style="display:flex; justify-content:flex-end;">
                <button type="button" id="btn-prog-save" style="background-color: #16a34a; color: white; border: none; padding: 6px 16px; font-size: 0.8rem; font-weight: bold; cursor: pointer; border-radius:2px;">SAVE PROGRAM</button>
              </div>
            </div>

          </div>

          <!-- Registry list of Loyalty Programs -->
          <div style="margin-top:12px; border: 1px solid #94a3b8; background-color: white; max-height:220px; overflow-y:auto; border-radius: 2px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
              <thead>
                <tr style="background-color:#cbd5e1; color:#1e3b8b; font-weight:bold; border-bottom:1px solid #94a3b8;">
                  <th style="padding:6px; width:90px;">CODE</th>
                  <th style="padding:6px;">PROGRAM NAME</th>
                  <th style="padding:6px; width:100px;">START DATE</th>
                  <th style="padding:6px; width:100px;">END DATE</th>
                  <th style="padding:6px; text-align:center; width:200px;">PARTICIPANTS</th>
                  <th style="padding:6px; text-align:center; width:120px;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${programs.length === 0 ? `
                  <tr><td colspan="6" style="text-align:center; padding:15px; color:#64748b;">NO LOYALTY PROGRAMS REGISTERED.</td></tr>
                ` : programs.map(p => `
                  <tr style="border-bottom:1px solid #cbd5e1;">
                    <td style="padding:6px; font-weight:bold;">${p.id}</td>
                    <td style="padding:6px; font-weight:bold;">${p.name.toUpperCase()}</td>
                    <td style="padding:6px;">${p.startDate}</td>
                    <td style="padding:6px;">${p.endDate}</td>
                    <td style="padding:6px; text-align:center; font-size:0.72rem; color:#475569;">
                      ${(p.influencers || []).length} Influencers | ${(p.products || []).length} Products/Rules
                    </td>
                    <td style="padding:6px; text-align:center; display:flex; justify-content:center; gap:6px;">
                      <button type="button" class="btn-prog-edit" data-id="${p.id}" style="background:none; border:none; color:#1e3b8b; cursor:pointer; font-weight:bold; font-size:0.75rem;">EDIT</button>
                      <button type="button" class="btn-prog-delete" data-id="${p.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:0.75rem;">DEL</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:12px;">
            <button type="button" class="btn" id="btn-prog-close" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; font-size:0.8rem; cursor:pointer;">CLOSE</button>
          </div>
        </div>
      </div>
    `;

    const overlay = document.getElementById("loyalty-modal-overlay");
    const close = () => {
      overlay.classList.remove("active");
      root.innerHTML = "";
    };

    document.getElementById("loyalty-close-btn-header").addEventListener("click", close);
    document.getElementById("btn-prog-close").addEventListener("click", close);

    const hiddenIdEl = document.getElementById("prog-id-hidden");
    const nameEl = document.getElementById("prog-name");
    const startEl = document.getElementById("prog-start");
    const endEl = document.getElementById("prog-end");
    const saveBtn = document.getElementById("btn-prog-save");

    nameEl.addEventListener("input", () => {
      nameEl.value = nameEl.value.toUpperCase();
    });

    // Populate Participating Influencers Table
    const renderInfluencersGrid = () => {
      const tbody = document.getElementById("prog-influencers-tbody");
      tbody.innerHTML = "";
      if (selectedInfluencers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:8px; color:#64748b;">No influencers added yet.</td></tr>`;
        return;
      }
      selectedInfluencers.forEach((infName, idx) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #cbd5e1";
        tr.innerHTML = `
          <td style="padding:4px; font-weight:bold;">${infName.toUpperCase()}</td>
          <td style="padding:4px; text-align:center;">
            <button type="button" class="btn-prog-remove-inf" data-index="${idx}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:0.8rem;">&times;</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll(".btn-prog-remove-inf").forEach(btn => {
        btn.addEventListener("click", () => {
          const index = parseInt(btn.getAttribute("data-index"));
          selectedInfluencers.splice(index, 1);
          renderInfluencersGrid();
        });
      });
    };

    document.getElementById("btn-prog-add-influencer").addEventListener("click", () => {
      const select = document.getElementById("prog-influencer-select");
      const name = select.value;
      if (!name) return;
      if (selectedInfluencers.includes(name)) {
        alert("Influencer already added!");
        return;
      }
      selectedInfluencers.push(name);
      select.value = "";
      renderInfluencersGrid();
    });

    // Populate products configuration table
    const renderProductsGrid = () => {
      const tbody = document.getElementById("prog-products-tbody");
      tbody.innerHTML = "";
      
      if (selectedProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:10px; color:#64748b;">No points rules added yet.</td></tr>`;
        return;
      }

      selectedProducts.forEach((sp, idx) => {
        const nameVal = sp.tempName || "";
        const uniqueNames = [...new Set(materials.map(m => m.name.toUpperCase()))];
        const matchingMaterials = nameVal && nameVal !== "ALL" 
          ? materials.filter(m => m.name.toUpperCase() === nameVal)
          : [];

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #cbd5e1";
        tr.innerHTML = `
          <!-- Product Name Selector -->
          <td style="padding:4px; width:45%;">
            <select class="prog-prod-name-select" data-index="${idx}" style="width:100%; padding:2px; font-size:0.75rem; background:white; color:black; border:1px solid #cbd5e1;">
              <option value="">-- Choose Product Name --</option>
              <option value="ALL" ${nameVal === 'ALL' ? 'selected' : ''}>ALL (ALL PRODUCTS)</option>
              ${uniqueNames.map(name => `<option value="${name}" ${nameVal === name ? 'selected' : ''}>${name}</option>`).join("")}
            </select>
          </td>
          <!-- Product Code Selector -->
          <td style="padding:4px; width:45%;">
            <select class="prog-prod-code-select" data-index="${idx}" style="width:100%; padding:2px; font-size:0.75rem; background:white; color:black; border:1px solid #cbd5e1;"
              ${!nameVal ? 'disabled' : ''}>
              ${nameVal === "ALL" ? `
                <option value="ALL" selected>ALL (ALL PRODUCTS)</option>
              ` : !nameVal ? `
                <option value="">-- Select Name First --</option>
              ` : `
                <option value="">-- Choose Code/Model --</option>
                <option value="ALL" ${sp.materialId === 'ALL' ? 'selected' : ''}>ALL MODELS</option>
                ${matchingMaterials.map(m => `<option value="${m.id}" ${sp.materialId === m.id ? 'selected' : ''}>${(m.code || '').toUpperCase()}</option>`).join("")}
              `}
            </select>
          </td>
          <td style="padding:4px; width:100px;">
            <input type="number" step="0.01" min="0" class="prog-prod-points" data-index="${idx}" value="${sp.points || 0}" style="width:100%; padding:2px; text-align:right; font-size:0.75rem; background:white; color:black; border:1px solid #cbd5e1;">
          </td>
          <td style="padding:4px; text-align:center;">
            <button type="button" class="btn-prog-remove-row" data-index="${idx}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:0.8rem;">&times;</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind row listeners
      tbody.querySelectorAll(".prog-prod-name-select").forEach(sel => {
        sel.addEventListener("change", (e) => {
          const index = parseInt(e.target.getAttribute("data-index"));
          const val = e.target.value;
          selectedProducts[index].tempName = val;
          if (val === "ALL") {
            selectedProducts[index].materialId = "ALL";
          } else {
            selectedProducts[index].materialId = "";
          }
          renderProductsGrid();
        });
      });

      tbody.querySelectorAll(".prog-prod-code-select").forEach(sel => {
        sel.addEventListener("change", (e) => {
          const index = parseInt(e.target.getAttribute("data-index"));
          const val = e.target.value;
          selectedProducts[index].materialId = val;
        });
      });

      tbody.querySelectorAll(".prog-prod-points").forEach(inpt => {
        inpt.addEventListener("change", (e) => {
          const index = parseInt(e.target.getAttribute("data-index"));
          selectedProducts[index].points = parseFloat(e.target.value) || 0;
        });
      });

      tbody.querySelectorAll(".btn-prog-remove-row").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const index = parseInt(btn.getAttribute("data-index"));
          selectedProducts.splice(index, 1);
          renderProductsGrid();
        });
      });
    };

    document.getElementById("btn-prog-add-product").addEventListener("click", () => {
      selectedProducts.push({ materialId: "", points: 0, tempName: "" });
      renderProductsGrid();
    });

    // Save logic
    saveBtn.addEventListener("click", () => {
      const pName = nameEl.value.trim().toUpperCase();
      const pStart = startEl.value;
      const pEnd = endEl.value;

      if (!pName || !pStart || !pEnd) {
        alert("Please fill in all required program details.");
        return;
      }

      if (selectedInfluencers.length === 0) {
        alert("Please add at least one participating influencer.");
        return;
      }

      const validProducts = selectedProducts.filter(p => p.materialId !== "");
      if (validProducts.length === 0) {
        alert("Please configure at least one reward points rule.");
        return;
      }

      const payload = {
        name: pName,
        startDate: pStart,
        endDate: pEnd,
        influencers: selectedInfluencers,
        products: validProducts.map(p => ({ productName: p.tempName, materialId: p.materialId, points: p.points }))
      };

      const editId = hiddenIdEl.value;
      if (editId) {
        state.updateLoyaltyProgram(editId, payload);
        alert("LOYALTY PROGRAM UPDATED SUCCESSFULLY.");
      } else {
        state.addLoyaltyProgram(payload);
        alert("LOYALTY PROGRAM CREATED SUCCESSFULLY.");
      }

      selectedInfluencers = [];
      selectedProducts = [];
      renderModalContent();
    });

    // Edit button trigger
    root.querySelectorAll(".btn-prog-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const match = programs.find(p => p.id === id);
        if (match) {
          hiddenIdEl.value = match.id;
          nameEl.value = match.name;
          startEl.value = match.startDate;
          endEl.value = match.endDate;
          
          selectedInfluencers = [...(match.influencers || [])];
          renderInfluencersGrid();

          selectedProducts = (match.products || []).map(p => {
            let name = p.productName || "";
            if (!name) {
              if (p.materialId === "ALL") {
                name = "ALL";
              } else {
                const m = materials.find(x => x.id === p.materialId);
                if (m) name = m.name.toUpperCase();
              }
            }
            return { materialId: p.materialId, points: p.points, tempName: name };
          });
          renderProductsGrid();
          saveBtn.innerText = "SAVE CHANGES";
        }
      });
    });

    // Delete button trigger
    root.querySelectorAll(".btn-prog-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this Loyalty Program?")) {
          state.deleteLoyaltyProgram(id);
          renderModalContent();
        }
      });
    });

    renderInfluencersGrid();
    renderProductsGrid();
  };

  renderModalContent();
}
