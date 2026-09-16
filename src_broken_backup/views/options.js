import { state } from "../state.js";

export function showOptionsModal() {
  const root = document.getElementById("modal-container-root");
  const options = state.getOptions();

  root.innerHTML = `
    <div class="modal-overlay active" id="options-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container" style="max-width:450px; width: 90%; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px; border-bottom: 1px solid #1d4ed8;">
          <div style="display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-gears"></i> UTILITIES - OPTIONS CONFIGURATION
          </div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="options-close-btn-header">&times;</button>
        </div>
        
        <form id="options-form" style="display:flex; flex-direction:column; gap:12px; margin-top:12px; padding: 10px 8px;">
          <fieldset style="border: 1px solid #94a3b8; border-radius: 3px; padding: 10px; background-color: #cbd5e1;">
            <legend style="font-size: 0.8rem; font-weight: 700; color: #1e3a8a; padding: 0 4px;">Sales & Purchase Settings</legend>
            <div style="display:flex; flex-direction:column; gap:10px; margin-top:6px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; font-weight: 600;">
                <input type="checkbox" id="opt-employee-sales" ${options.enableEmployeeSales ? 'checked' : ''} style="cursor:pointer;">
                Enable Employee Name in Sales Bill
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; font-weight: 600;">
                <input type="checkbox" id="opt-influencer-sales" ${options.enableInfluencerSales ? 'checked' : ''} style="cursor:pointer;">
                Enable Influencer Name in Sales Bill
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; font-weight: 600;">
                <input type="checkbox" id="opt-cess" ${options.enableCess ? 'checked' : ''} style="cursor:pointer;">
                Enable CESS in Bills
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; font-weight: 600;">
                <input type="checkbox" id="opt-hsn4digit" ${options.enable4DigitHsn !== false ? 'checked' : ''} style="cursor:pointer;">
                Enable 4 digit HSN CODE
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; font-weight: 600;">
                <input type="checkbox" id="opt-addlcess-sales" ${options.enableCessInSalesBill ? 'checked' : ''} style="cursor:pointer;">
                Enable Additional CESS in Sales Bill
              </label>
            </div>
          </fieldset>
          
          <div style="display:flex; justify-content:flex-end; gap:6px; border-top:1px solid #94a3b8; padding-top:10px; margin-top:6px;">
            <button type="submit" class="btn" style="background:#e2e8f0; border:1px solid #475569; padding:4px 14px; font-weight:bold; color:black; font-size:0.8rem; cursor:pointer;">Save</button>
            <button type="button" class="btn" id="btn-options-cancel" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; font-size:0.8rem; cursor:pointer;">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = document.getElementById("options-modal-overlay");
  const close = () => {
    overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("options-close-btn-header").addEventListener("click", close);
  document.getElementById("btn-options-cancel").addEventListener("click", close);

  document.getElementById("options-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const enableEmployeeSales = document.getElementById("opt-employee-sales").checked;
    const enableInfluencerSales = document.getElementById("opt-influencer-sales").checked;
    const enableCess = document.getElementById("opt-cess").checked;
    const enable4DigitHsn = document.getElementById("opt-hsn4digit").checked;
    const enableCessInSalesBill = document.getElementById("opt-addlcess-sales").checked;

    // Reset cached custom HSN list if switching format to prevent incorrect digit mixes
    const oldOption = state.getOptions().enable4DigitHsn !== false;
    if (oldOption !== enable4DigitHsn) {
      state.hsnCodes = enable4DigitHsn ? ["2523", "7214", "2505", "6901", "2517"] : ["25230000", "72140000", "25050000", "69010000", "25170000"];
    }

    state.updateOptions({
      enableEmployeeSales,
      enableInfluencerSales,
      enableCess,
      enable4DigitHsn,
      enableCessInSalesBill
    });

    alert("Options updated successfully.");
    close();
  });
}
