import { state } from "../state.js";

export function renderAdmin(container) {
  const currentPassword = state.getAdminPassword();

  container.innerHTML = `
    <div class="panel" style="max-width: 600px; margin: 2rem auto; font-family: var(--font-body);">
      <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.3rem; font-family: var(--font-heading); color: var(--accent-color); display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-lock text-warning"></i> Admin Settings & Password Configuration
        </h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Configure security settings, operations password, and databases.</p>
      </div>

      <form id="admin-password-form" style="display: flex; flex-direction: column; gap: 1.2rem;">
        <div class="form-group">
          <label for="admin-current-pwd" style="font-weight: 600; font-size: 0.85rem;">Current Security Password</label>
          <input type="text" id="admin-current-pwd" class="form-control" value="${currentPassword}" readonly style="background-color: var(--bg-tertiary); color: var(--text-muted); cursor: not-allowed; font-weight: bold;">
        </div>

        <div class="form-group">
          <label for="admin-new-pwd" style="font-weight: 600; font-size: 0.85rem;">New Security Password *</label>
          <input type="password" id="admin-new-pwd" class="form-control" placeholder="Enter new password..." required style="background: white; color: black; font-weight: bold;">
        </div>

        <div class="form-group">
          <label for="admin-confirm-pwd" style="font-weight: 600; font-size: 0.85rem;">Confirm New Password *</label>
          <input type="password" id="admin-confirm-pwd" class="form-control" placeholder="Re-type new password..." required style="background: white; color: black; font-weight: bold;">
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button type="submit" class="btn btn-primary" style="padding: 6px 20px;"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
        </div>
      </form>

      <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 1.5rem;">
        <h3 style="font-size: 1.1rem; font-family: var(--font-heading); color: var(--accent-color); margin-bottom: 10px;">Accounting Period Ending</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Process year-end, calculate closing balances, and automatically generate opening balances for a new Financial Year.</p>
        <button type="button" id="btn-run-yearend" class="btn btn-primary" style="background-color: var(--warning-color); border: none;">
          <i class="fa-solid fa-calendar-check"></i> Run Accounting Period Ending
        </button>
      </div>

    </div>
  `;


  const btnYearEnd = document.getElementById("btn-run-yearend");
  if (btnYearEnd) {
    btnYearEnd.addEventListener("click", () => {
      if (window.showYearEndModal) window.showYearEndModal();
    });
  }

  document.getElementById("admin-password-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const newPwd = document.getElementById("admin-new-pwd").value;
    const confirmPwd = document.getElementById("admin-confirm-pwd").value;

    if (newPwd !== confirmPwd) {
      alert("New password and confirm password do not match!");
      return;
    }

    state.setAdminPassword(newPwd);
    alert("Admin security password updated successfully!");
    renderAdmin(container);
  });
}
