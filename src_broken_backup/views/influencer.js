import { state } from "../state.js";

export function showInfluencerMasterModal() {
  const root = document.getElementById("modal-container-root");
  let influencers = state.getInfluencers();

  const renderModalContent = () => {
    influencers = state.getInfluencers();
    root.innerHTML = `
      <div class="modal-overlay active" id="influencer-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
        <div class="modal-container" style="max-width:800px; width: 90%; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          
          <!-- Header ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px; border-bottom: 1px solid #1d4ed8;">
            <div style="display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-crown"></i> MASTERS - INFLUENCER REGISTRY MASTER
            </div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="inf-close-btn-header">&times;</button>
          </div>

          <!-- Master form panel -->
          <form id="influencer-entry-form" style="display:grid; grid-template-columns: 1.5fr 1fr 1fr; gap:10px; margin-top:12px; background-color:#f1f5f9; padding:10px; border:1px solid #94a3b8; border-radius:3px;">
            <input type="hidden" id="inf-id-hidden" value="">
            <div>
              <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">INFLUENCER NAME *</label>
              <input type="text" id="inf-name" style="width:100%; border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;" required>
            </div>
            <div>
              <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">MOBILE NUMBER</label>
              <input type="text" id="inf-mobile" style="width:100%; border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;">
            </div>
            <div style="display:flex; align-items:flex-end; gap:6px;">
              <div style="flex:1;">
                <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">ADDRESS</label>
                <input type="text" id="inf-address" style="width:100%; border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;">
              </div>
              <button type="submit" id="btn-inf-save" style="background-color: #1e3b8b; color: white; border: none; padding: 5px 12px; font-size: 0.8rem; font-weight: bold; cursor: pointer; height: 26px;">ADD</button>
            </div>
          </form>

          <!-- Master registry table -->
          <div style="margin-top:12px; border: 1px solid #94a3b8; background-color: white; max-height:250px; overflow-y:auto; border-radius: 2px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
              <thead>
                <tr style="background-color:#cbd5e1; color:#1e3b8b; font-weight:bold; border-bottom:1px solid #94a3b8;">
                  <th style="padding:6px;">CODE</th>
                  <th style="padding:6px;">INFLUENCER NAME</th>
                  <th style="padding:6px;">MOBILE NO</th>
                  <th style="padding:6px;">ADDRESS</th>
                  <th style="padding:6px; text-align:center; width:120px;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${influencers.length === 0 ? `
                  <tr><td colspan="5" style="text-align:center; padding:15px; color:#64748b;">NO INFLUENCERS REGISTERED.</td></tr>
                ` : influencers.map(inf => `
                  <tr style="border-bottom:1px solid #cbd5e1;">
                    <td style="padding:6px; font-weight:bold;">${inf.id.toUpperCase()}</td>
                    <td style="padding:6px;">${inf.name.toUpperCase()}</td>
                    <td style="padding:6px;">${(inf.mobile || 'N/A').toUpperCase()}</td>
                    <td style="padding:6px;">${(inf.address || 'N/A').toUpperCase()}</td>
                    <td style="padding:6px; text-align:center; display:flex; justify-content:center; gap:6px;">
                      <button type="button" class="btn-inf-edit" data-id="${inf.id}" style="background:none; border:none; color:#1e3b8b; cursor:pointer; font-weight:bold; font-size:0.75rem;">EDIT</button>
                      <button type="button" class="btn-inf-delete" data-id="${inf.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:0.75rem;">DEL</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:12px;">
            <button type="button" class="btn" id="btn-inf-close" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; font-size:0.8rem; cursor:pointer;">CLOSE</button>
          </div>
        </div>
      </div>
    `;

    const overlay = document.getElementById("influencer-modal-overlay");
    const close = () => {
      overlay.classList.remove("active");
      root.innerHTML = "";
    };

    document.getElementById("inf-close-btn-header").addEventListener("click", close);
    document.getElementById("btn-inf-close").addEventListener("click", close);

    const hiddenIdEl = document.getElementById("inf-id-hidden");
    const nameEl = document.getElementById("inf-name");
    const mobileEl = document.getElementById("inf-mobile");
    const addressEl = document.getElementById("inf-address");
    const saveBtn = document.getElementById("btn-inf-save");

    // Convert input values to uppercase dynamically
    const capitalizeInput = (el) => {
      el.addEventListener("input", () => {
        el.value = el.value.toUpperCase();
      });
    };
    capitalizeInput(nameEl);
    capitalizeInput(mobileEl);
    capitalizeInput(addressEl);

    // Form submit listener (creates or updates influencer)
    document.getElementById("influencer-entry-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        name: nameEl.value.trim().toUpperCase(),
        mobile: mobileEl.value.trim().toUpperCase(),
        address: addressEl.value.trim().toUpperCase()
      };

      const editId = hiddenIdEl.value;
      if (editId) {
        state.updateInfluencer(editId, payload);
        alert("INFLUENCER UPDATED SUCCESSFULLY.");
      } else {
        state.addInfluencer(payload);
        alert("INFLUENCER ADDED SUCCESSFULLY.");
      }

      renderModalContent();
    });

    // Edit and delete actions
    root.querySelectorAll(".btn-inf-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const match = influencers.find(x => x.id === id);
        if (match) {
          hiddenIdEl.value = match.id;
          nameEl.value = match.name;
          mobileEl.value = match.mobile || "";
          addressEl.value = match.address || "";
          saveBtn.innerText = "Save";
        }
      });
    });

    root.querySelectorAll(".btn-inf-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this influencer?")) {
          state.deleteInfluencer(id);
          renderModalContent();
        }
      });
    });
  };

  renderModalContent();
}
