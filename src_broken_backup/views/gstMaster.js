import { state } from "../state.js";

export function showGstMasterModal() {
  const root = document.getElementById("modal-container-root");
  
  function renderContent() {
    const gstList = state.getGstMaster();
    
    // The account groups to populate in the dropdown
    const prebuiltGroups = [
      "INPUT SGST",
      "INPUT CGST",
      "INPUT IGST",
      "OUTPUT SGST",
      "OUTPUT CGST",
      "OUTPUT IGST"
    ];

    root.innerHTML = `
      <div class="modal-overlay active" id="gst-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
        <div class="modal-container" style="max-width: 650px; width: 95%; background-color: #cbd5e1; color: #0f172a; padding: 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: auto;">
          
          <!-- Window Header Ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color: white; display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; font-weight: 700; font-size: 0.85rem; border-radius: 2px 2px 0 0; border-bottom: 1px solid #1d4ed8; margin:-15px -15px 12px -15px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-percent"></i> Tax Master
            </div>
            <button style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer; line-height: 1;" id="gst-close-btn-header">&times;</button>
          </div>

          <!-- Main Input Section (Row Layout matching the picture) -->
          <form id="gst-master-form" style="display: flex; gap: 10px; align-items: flex-end; padding: 10px; background-color: #cbd5e1; margin-bottom: 6px;">
            <div style="display: flex; flex-direction: column; gap: 4px; flex: 2;">
              <label style="font-size: 0.8rem; font-weight: bold; color: black;">Tax Name</label>
              <input type="text" id="gst-name" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 3px; font-size: 0.8rem; height: 24px; width: 100%; box-sizing: border-box;" required placeholder="e.g. INPUT SGST 2.5%">
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; width: 80px;">
              <label style="font-size: 0.8rem; font-weight: bold; color: black;">Tax%</label>
              <input type="number" step="0.01" id="gst-percent" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 3px; font-size: 0.8rem; height: 24px; width: 100%; box-sizing: border-box;" required placeholder="e.g. 2.5">
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; flex: 2;">
              <label style="font-size: 0.8rem; font-weight: bold; color: black;">Account Group</label>
              <select id="gst-group" style="background-color: white; color: black; border: 1px solid #7a96b2; padding: 3px; font-size: 0.8rem; height: 24px; width: 100%; box-sizing: border-box;" required>
                ${prebuiltGroups.map(grp => `<option value="${grp}">${grp}</option>`).join("")}
              </select>
            </div>

            <button type="submit" style="background: #e2e8f0; border: 1px solid #475569; padding: 2px 20px; font-weight: bold; cursor: pointer; font-size: 0.8rem; height: 24px; box-shadow: 1px 1px 2px white inset; border-radius: 2px; color: black;">Add</button>
          </form>

          <!-- List Grid / Table -->
          <div style="border: 1px solid #94a3b8; background-color: white; border-radius: 2px; max-height: 250px; overflow-y: auto; margin-bottom: 12px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; color: black;">
              <thead>
                <tr style="background-color: #1e3a8a; color: white; border-bottom: 2px solid #475569; font-size: 0.8rem;">
                  <th style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">Tax Name</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; width: 100px; font-weight: bold;">Tax %</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">Account Group</th>
                  <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; width: 80px; font-weight: bold;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${gstList.length === 0 ? `
                  <tr>
                    <td colspan="4" style="text-align: center; color: #64748b; padding: 20px; font-style: italic;">No Tax entries found.</td>
                  </tr>
                ` : gstList.map(entry => `
                  <tr style="border-bottom: 1px solid #cbd5e1;">
                    <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${entry.name}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${entry.percent}%</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1;">${entry.accountGroup}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">
                      <button type="button" class="delete-gst-btn" data-id="${entry.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: bold; font-size: 0.75rem;">DELETE</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <!-- Bottom Footer Close button -->
          <div style="display: flex; justify-content: flex-end; padding-top: 8px; border-top: 1px solid #cbd5e1;">
            <button type="button" id="gst-close-btn" style="background: #e2e8f0; border: 1px solid #475569; padding: 4px 16px; color: black; font-size: 0.8rem; cursor: pointer; font-weight: bold; border-radius: 2px;">Close</button>
          </div>

        </div>
      </div>
    `;

    // Hook auto capitalization for tax name
    const taxNameInput = document.getElementById("gst-name");
    if (taxNameInput) {
      taxNameInput.addEventListener("input", () => {
        taxNameInput.value = taxNameInput.value.toUpperCase();
      });
    }

    // Add close button listeners
    const closeOverlay = () => {
      const overlay = document.getElementById("gst-modal-overlay");
      if (overlay) overlay.classList.remove("active");
      root.innerHTML = "";
    };
    document.getElementById("gst-close-btn-header").addEventListener("click", closeOverlay);
    document.getElementById("gst-close-btn").addEventListener("click", closeOverlay);

    // Form submission
    document.getElementById("gst-master-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("gst-name").value.trim().toUpperCase();
      const percent = parseFloat(document.getElementById("gst-percent").value) || 0;
      const accountGroup = document.getElementById("gst-group").value;

      try {
        state.addGstMasterEntry({ name, percent, accountGroup });
        renderContent();
      } catch (err) {
        alert(err.message.toUpperCase());
      }
    });

    // Delete actions
    root.querySelectorAll(".delete-gst-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (confirm("ARE YOU SURE YOU WANT TO PERMANENTLY DELETE THIS GST ENTRY?")) {
          state.deleteGstMasterEntry(id);
          renderContent();
        }
      });
    });
  }

  renderContent();
}
