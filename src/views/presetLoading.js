import { state } from "../state.js";

export function renderPresetLoading(container) {
  const materials = state.getMaterials();
  
  // Get unique product names for the dropdown
  const uniqueProductNames = [...new Set(materials.map(m => m.name))].sort();

  container.innerHTML = `
    <div style="padding: 1rem; display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Title Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--border-color, #e2e8f0); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 8px;">
        <div>
          <h2 style="margin: 0; font-size: 1.4rem; font-weight: 700; color: #1e3a8a; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-truck-ramp-box" style="color: #3b82f6;"></i>
            Preset Loading & Unloading Charges Configuration
          </h2>
          <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">Configure standard labor handling rates per unit for each product</span>
        </div>
        <div>
          <a href="#headloader-report" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; text-decoration: none;">
            <i class="fa-solid fa-people-carry-box"></i> Open Headloader Payable Report
          </a>
        </div>
      </div>

      <!-- Config Form and Table Grid -->
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
        
        <!-- Form Panel -->
        <div class="panel" style="padding: 1.25rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h3 style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 700; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Set Handling Charges</h3>
          
          <form id="preset-loading-form" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label for="pl-product-name" style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 0.8rem; color: #475569;">Product Name *</label>
              <select id="pl-product-name" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.85rem;" required>
                <option value="">-- Choose Product Name --</option>
                ${uniqueProductNames.map(name => `<option value="${name}">${name}</option>`).join("")}
              </select>
            </div>

            <div>
              <label for="pl-product-code" style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 0.8rem; color: #475569;">Code / Model *</label>
              <select id="pl-product-code" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.85rem;" disabled required>
                <option value="">-- Choose Code/Model --</option>
              </select>
            </div>

            <div>
              <label for="pl-loading-charge" style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 0.8rem; color: #15803d;">Loading Charge (Sales) / Unit *</label>
              <div style="position: relative; display: flex; align-items: center;">
                <span style="position: absolute; left: 10px; color: #64748b; font-weight: 600; font-size: 0.85rem;">₹</span>
                <input type="number" step="0.01" min="0" id="pl-loading-charge" class="form-control" style="width: 100%; padding: 6px 10px 6px 24px; font-size: 0.85rem;" placeholder="0.00" required>
              </div>
            </div>

            <div>
              <label for="pl-unloading-charge" style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 0.8rem; color: #c2410c;">Unloading Charge (Purchases) / Unit *</label>
              <div style="position: relative; display: flex; align-items: center;">
                <span style="position: absolute; left: 10px; color: #64748b; font-weight: 600; font-size: 0.85rem;">₹</span>
                <input type="number" step="0.01" min="0" id="pl-unloading-charge" class="form-control" style="width: 100%; padding: 6px 10px 6px 24px; font-size: 0.85rem;" placeholder="0.00" required>
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 0.5rem;">
              <button type="submit" class="btn btn-primary" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <i class="fa-solid fa-floppy-disk"></i> Save Configuration
              </button>
              <button type="button" id="btn-pl-reset" class="btn btn-secondary" style="padding: 8px 12px; font-size: 0.85rem; font-weight: 600;">
                Clear
              </button>
            </div>
          </form>
        </div>

        <!-- Preloaded Configs Table -->
        <div class="panel" style="padding: 1.25rem; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h3 style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 700; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Products List & Preset Rates</h3>
          
          <div class="table-responsive" style="max-height: 450px; overflow-y: auto;">
            <table class="data-table">
              <thead>
                <tr style="position: sticky; top: 0; background: var(--bg-surface, #f8fafc); z-index: 1;">
                  <th>Product Name</th>
                  <th>Code / Model</th>
                  <th>Unit</th>
                  <th style="text-align: right;">Loading (Sales)</th>
                  <th style="text-align: right;">Unloading (Purchases)</th>
                  <th style="text-align: center; width: 80px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${materials.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; color: var(--text-muted, #64748b); padding: 2rem;">No products found in Master. Create products first.</td></tr>
                ` : materials.map(m => `
                  <tr class="pl-product-row" data-name="${m.name}" data-code="${m.code}" style="cursor: pointer;" title="Click to load product configuration">
                    <td><strong>${m.name}</strong></td>
                    <td><code class="highlight-text" style="font-weight: 700;">${m.code}</code></td>
                    <td>${m.unit || 'Bags'}</td>
                    <td style="text-align: right; font-weight: 700; color: #16a34a;">₹${(m.loadingCharge || 0).toFixed(2)}</td>
                    <td style="text-align: right; font-weight: 700; color: #c2410c;">₹${((m.unloadingCharge !== undefined && m.unloadingCharge !== null) ? m.unloadingCharge : (m.loadingCharge || 0)).toFixed(2)}</td>
                    <td style="text-align: center;">
                      <button type="button" class="btn btn-secondary btn-icon pl-edit-btn" data-name="${m.name}" data-code="${m.code}" style="padding: 2px 6px; font-size: 0.75rem;">
                        <i class="fa-solid fa-pen"></i> Select
                      </button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `;

  // Bind Elements
  const form = document.getElementById("preset-loading-form");
  const productSelect = document.getElementById("pl-product-name");
  const codeSelect = document.getElementById("pl-product-code");
  const chargeInput = document.getElementById("pl-loading-charge");
  const unloadingChargeInput = document.getElementById("pl-unloading-charge");
  const clearBtn = document.getElementById("btn-pl-reset");

  // Cascading dropdown logic
  productSelect.addEventListener("change", () => {
    const selectedName = productSelect.value;
    codeSelect.innerHTML = '<option value="">-- Choose Code/Model --</option>';
    chargeInput.value = "";
    unloadingChargeInput.value = "";

    if (!selectedName) {
      codeSelect.disabled = true;
      return;
    }

    const filtered = materials.filter(m => m.name === selectedName);
    filtered.forEach(m => {
      const option = document.createElement("option");
      option.value = m.code;
      option.innerText = m.code;
      codeSelect.appendChild(option);
    });

    codeSelect.disabled = false;

    // Auto-select code if only one code exists
    if (filtered.length === 1) {
      codeSelect.value = filtered[0].code;
      codeSelect.dispatchEvent(new Event("change"));
    }
  });

  codeSelect.addEventListener("change", () => {
    const selectedName = productSelect.value;
    const selectedCode = codeSelect.value;
    if (selectedName && selectedCode) {
      const mat = materials.find(m => m.name === selectedName && m.code === selectedCode);
      if (mat) {
        chargeInput.value = mat.loadingCharge !== undefined ? mat.loadingCharge : 0;
        unloadingChargeInput.value = (mat.unloadingCharge !== undefined && mat.unloadingCharge !== null) ? mat.unloadingCharge : (mat.loadingCharge || 0);
      }
    } else {
      chargeInput.value = "";
      unloadingChargeInput.value = "";
    }
  });

  // Handle Form submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const selectedName = productSelect.value;
    const selectedCode = codeSelect.value;
    const chargeVal = parseFloat(chargeInput.value) || 0;
    const unloadingVal = parseFloat(unloadingChargeInput.value) || 0;

    if (!selectedName || !selectedCode) {
      alert("Please choose a valid product name and code/model.");
      return;
    }

    const mat = materials.find(m => m.name === selectedName && m.code === selectedCode);
    if (mat) {
      mat.loadingCharge = chargeVal;
      mat.loadingChargeEnabled = chargeVal > 0;
      mat.unloadingCharge = unloadingVal;
      mat.unloadingChargeEnabled = unloadingVal > 0;
      state.saveState();
      alert(`Successfully saved rates for ${selectedName} (${selectedCode}):\nLoading (Sales): ₹${chargeVal.toFixed(2)}\nUnloading (Purchases): ₹${unloadingVal.toFixed(2)}`);
      renderPresetLoading(container);
    } else {
      alert("Product not found in database.");
    }
  });

  // Handle clear/reset button
  clearBtn.addEventListener("click", () => {
    form.reset();
    codeSelect.disabled = true;
    codeSelect.innerHTML = '<option value="">-- Choose Code/Model --</option>';
  });

  // Handle click on rows/buttons to load data
  const loadProductData = (name, code) => {
    productSelect.value = name;
    productSelect.dispatchEvent(new Event("change"));
    codeSelect.value = code;
    codeSelect.dispatchEvent(new Event("change"));
    chargeInput.focus();
  };

  document.querySelectorAll(".pl-product-row").forEach(row => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const name = row.getAttribute("data-name");
      const code = row.getAttribute("data-code");
      loadProductData(name, code);
    });
  });

  document.querySelectorAll(".pl-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name");
      const code = btn.getAttribute("data-code");
      loadProductData(name, code);
    });
  });
}
