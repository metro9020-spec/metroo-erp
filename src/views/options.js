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
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; font-weight: 600;">
                <input type="checkbox" id="opt-closing-balance" ${options.enablePartyClosingBalanceBottom !== false ? 'checked' : ''} style="cursor:pointer;">
                Display Closing Balance of Selected Party at Bottom of Sales/Purchase Window
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; font-weight: 600;">
                <input type="checkbox" id="opt-headloader" ${options.enableHeadloader !== false ? 'checked' : ''} style="cursor:pointer;">
                Enable Headloaders Report in Utilities & Load/Unload Types in Bills
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
    const enablePartyClosingBalanceBottom = document.getElementById("opt-closing-balance").checked;
    const enableHeadloader = document.getElementById("opt-headloader").checked;

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
      enableCessInSalesBill,
      enablePartyClosingBalanceBottom,
      enableHeadloader
    });

    alert("Options updated successfully.");
    close();
  });
}

export function showChangePasswordModal() {
  const root = document.getElementById("modal-container-root");
  const currentUser = state.getCurrentUser();
  const activeCompanyId = state.getActiveCompanyId();

  root.innerHTML = `
    <div class="modal-overlay active" id="change-pwd-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.4); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container" style="max-width:420px; width: 90%; background-color:#ffffff; color:#0f172a; padding: 20px; border:2px solid #1e3b8b; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="background: linear-gradient(180deg, #1e3b8b 0%, #3b82f6 100%); color:white; padding:8px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 4px; margin-bottom: 15px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-key"></i> UTILITIES - CHANGE PASSWORD
          </div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.4rem; cursor:pointer;" id="pwd-close-btn-header">&times;</button>
        </div>

        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; padding:8px 12px; margin-bottom:12px; font-size:0.8rem; color:#1e3a8a;">
          Logged in as: <strong>${currentUser ? (currentUser.fullName || currentUser.username) : "User"} (${currentUser ? (currentUser.role || "User") : "User"})</strong>
        </div>

        <form id="change-pwd-form" style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:0.75rem; font-weight:600; color:#334155;">Old Password *</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="pwd-old" required placeholder="Enter old password..." style="padding:6px 36px 6px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.85rem; width:100%; box-sizing:border-box;">
              <button type="button" class="toggle-pwd-btn" data-target="pwd-old" style="position: absolute; right: 8px; background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 0.9rem; padding: 2px;" title="Toggle Password Visibility">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:0.75rem; font-weight:600; color:#334155;">New Password *</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="pwd-new" required placeholder="Enter new password..." style="padding:6px 36px 6px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.85rem; width:100%; box-sizing:border-box;">
              <button type="button" class="toggle-pwd-btn" data-target="pwd-new" style="position: absolute; right: 8px; background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 0.9rem; padding: 2px;" title="Toggle Password Visibility">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:0.75rem; font-weight:600; color:#334155;">Confirm New Password *</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="pwd-confirm" required placeholder="Re-type new password..." style="padding:6px 36px 6px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.85rem; width:100%; box-sizing:border-box;">
              <button type="button" class="toggle-pwd-btn" data-target="pwd-confirm" style="position: absolute; right: 8px; background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 0.9rem; padding: 2px;" title="Toggle Password Visibility">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; border-top:1px solid #e2e8f0; padding-top:10px;">
            <button type="button" id="btn-pwd-cancel" style="background:#f1f5f9; border:1px solid #94a3b8; padding:6px 14px; color:#334155; font-size:0.8rem; font-weight:600; border-radius:4px; cursor:pointer;">Cancel</button>
            <button type="submit" style="background:#1e3b8b; border:none; color:white; padding:6px 16px; font-size:0.8rem; font-weight:bold; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-floppy-disk"></i> Update Password</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = document.getElementById("change-pwd-modal-overlay");
  const close = () => {
    overlay.classList.remove("active");
    root.innerHTML = "";
  };

  document.getElementById("pwd-close-btn-header").addEventListener("click", close);
  document.getElementById("btn-pwd-cancel").addEventListener("click", close);

  document.querySelectorAll(".toggle-pwd-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        const isPassword = targetInput.type === "password";
        targetInput.type = isPassword ? "text" : "password";
        btn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
      }
    });
  });

  document.getElementById("change-pwd-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const oldPwd = document.getElementById("pwd-old").value;
    const newPwd = document.getElementById("pwd-new").value;
    const confirmPwd = document.getElementById("pwd-confirm").value;

    if (newPwd !== confirmPwd) {
      alert("New Password and Confirm Password do not match!");
      return;
    }

    if (!activeCompanyId) {
      alert("No active company selected.");
      return;
    }

    const companyUsers = state.getCompanyUsers(activeCompanyId);
    const currUName = (currentUser ? currentUser.username : "admin").toLowerCase();
    const targetUser = companyUsers.find(u => u.username.toLowerCase() === currUName);

    if (targetUser) {
      if (targetUser.password !== oldPwd) {
        alert("Incorrect Old Password!");
        return;
      }

      // Update password in Admin User Management list
      targetUser.password = newPwd;
      state.saveCompanyUser(activeCompanyId, targetUser);

      // Update current logged-in session password if matching
      currentUser.password = newPwd;
      state.setCurrentUser(currentUser);

      alert("Password updated successfully! The change has been reflected in User Management.");
      close();
    } else {
      // If legacy admin user
      const companies = state.getRegisteredCompanies();
      const comp = companies.find(c => String(c.id) === String(activeCompanyId));
      if (comp && comp.password === oldPwd) {
        comp.password = newPwd;
        state.saveRegisteredCompanies(companies);

        // Save into users array as well so it's visible in User Management table
        state.saveCompanyUser(activeCompanyId, {
          username: comp.username || "admin",
          password: newPwd,
          fullName: "Administrator",
          role: "Admin",
          status: "Active"
        });

        alert("Password updated successfully! The change has been reflected in User Management.");
        close();
      } else {
        alert("Incorrect Old Password!");
      }
    }
  });
}

