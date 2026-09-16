import { state } from "../state.js";

export function renderAdmin(container) {
  const currentPassword = state.getAdminPassword();
  const activeCompanyId = state.getActiveCompanyId();
  const companies = state.getRegisteredCompanies();
  const company = companies.find(c => c.id === activeCompanyId);
  const fysList = company ? (company.financialYears || []) : [];
  const activeFyId = state.getActiveFyId();
  const activeFyObj = fysList.find(f => f.id === activeFyId) || (fysList[0] || { startDate: company?.financialYearStarts || '2026-04-01', endDate: company?.financialYearEnds || '2027-03-31' });

  container.innerHTML = `
    <div class="panel" style="max-width: 600px; margin: 2rem auto; font-family: var(--font-body);">
      <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.3rem; font-family: var(--font-heading); color: var(--accent-color); display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-lock text-warning"></i> Admin Settings & Password Configuration
        </h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Configure security settings, operations password, and databases.</p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: bold; font-size: 0.95rem; color: #1e3b8b;"><i class="fa-solid fa-users-gear"></i> Company Users & Passwords</div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Manage login users, assign access roles, and update passwords for this company.</div>
        </div>
        <button type="button" id="btn-open-user-mgmt" class="btn btn-primary" style="padding: 6px 16px; background: #1e3b8b; font-size: 0.85rem;"><i class="fa-solid fa-user-plus"></i> Manage Users</button>
      </div>

      <!-- Resequencing Engine Panel -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin-bottom: 1.5rem;">
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: bold; font-size: 0.95rem; color: #1e3b8b;">
            <i class="fa-solid fa-arrows-rotate text-primary"></i> Resequencing Engine
          </div>
          <span style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Series Tool</span>
        </div>
        <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px;">Re-adjust all invoice and purchase numbers chronologically per series continuously (1, 2, 3...) to fill skipped numbers and eliminate gaps.</p>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.78rem; color: #475569; font-weight: 600;">
            Status: Gapless Engine Ready
          </div>
          <button type="button" id="btn-admin-resequence-engine" class="btn btn-primary" style="padding: 6px 16px; background: #0284c7; border-color: #0369a1; font-size: 0.85rem; font-weight: bold;">
            <i class="fa-solid fa-arrows-rotate"></i> Run Resequencing Engine
          </button>
        </div>
      </div>

      <!-- Financial Year Date Configuration for Admin -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin-bottom: 1.5rem;">
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: bold; font-size: 0.95rem; color: #1e3b8b;">
            <i class="fa-solid fa-calendar-days text-primary"></i> Financial Year Starting & Ending Dates
          </div>
          <span style="font-size: 0.75rem; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Admin Only</span>
        </div>
        <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px;">Change the start date or end date for the company's financial years.</p>
        
        <form id="admin-fy-date-form" style="display: flex; flex-direction: column; gap: 12px;">
          ${fysList.length > 1 ? `
            <div class="form-group">
              <label for="admin-fy-select" style="font-weight: 600; font-size: 0.82rem; color: #334155;">Select Financial Year to Edit</label>
              <select id="admin-fy-select" class="form-control" style="background: white; color: black; font-weight: 600; font-size: 0.85rem;">
                ${fysList.map(fy => `
                  <option value="${fy.id}" ${fy.id === activeFyId ? 'selected' : ''}>
                    ${state.getFyDisplayLabel(fy)} (${fy.startDate ? fy.startDate.split('-').reverse().join('/') : 'N/A'} to ${fy.endDate ? fy.endDate.split('-').reverse().join('/') : 'N/A'})${fy.id === activeFyId ? ' [ACTIVE]' : ''}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label for="admin-fy-start-date" style="font-weight: 600; font-size: 0.82rem; color: #334155;">Financial Year Starts From *</label>
              <input type="date" id="admin-fy-start-date" class="form-control" value="${activeFyObj.startDate || '2026-04-01'}" required style="background: white; color: black; font-weight: bold; font-size: 0.85rem;">
            </div>
            <div class="form-group">
              <label for="admin-fy-end-date" style="font-weight: 600; font-size: 0.82rem; color: #334155;">Financial Year Ends On *</label>
              <input type="date" id="admin-fy-end-date" class="form-control" value="${activeFyObj.endDate || '2027-03-31'}" required style="background: white; color: black; font-weight: bold; font-size: 0.85rem;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
            <button type="submit" class="btn btn-primary" style="padding: 6px 18px; background: #059669; border-color: #047857; font-size: 0.85rem;">
              <i class="fa-solid fa-calendar-check"></i> Update Financial Year Dates
            </button>
          </div>
        </form>
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
    </div>
  `;

  document.getElementById("btn-open-user-mgmt").addEventListener("click", () => {
    import("./userManagement.js").then(m => {
      m.renderUserManagementModal();
    });
  });

  document.getElementById("btn-admin-resequence-engine")?.addEventListener("click", () => {
    if (confirm("Execute Series Resequencing Engine?\n\nThis will re-adjust all invoice and purchase numbers chronologically per series continuously (1, 2, 3...) to fill skipped numbers and eliminate gaps.")) {
      state.resequenceSeriesVoucherNumbers(true);
      state.realignSeriesCurrentNumbers();
      alert("Resequencing Engine finished successfully!\n\nAll bill series numbers are now 100% continuous with zero skipped numbers.");
      renderAdmin(container);
    }
  });

  const fySelectEl = document.getElementById("admin-fy-select");
  const fyStartInput = document.getElementById("admin-fy-start-date");
  const fyEndInput = document.getElementById("admin-fy-end-date");

  if (fySelectEl) {
    fySelectEl.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      const selectedObj = fysList.find(f => f.id === selectedId);
      if (selectedObj) {
        if (fyStartInput && selectedObj.startDate) fyStartInput.value = selectedObj.startDate;
        if (fyEndInput && selectedObj.endDate) fyEndInput.value = selectedObj.endDate;
      }
    });
  }

  const fyDateForm = document.getElementById("admin-fy-date-form");
  if (fyDateForm) {
    fyDateForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const targetFyId = fySelectEl ? fySelectEl.value : activeFyId;
      const newStart = fyStartInput ? fyStartInput.value : "";
      const newEnd = fyEndInput ? fyEndInput.value : "";

      if (!newStart || !newEnd) {
        alert("Please specify both starting and ending dates for the financial year.");
        return;
      }

      if (newStart > newEnd) {
        alert("Financial Year Starting Date cannot be after the Ending Date!");
        return;
      }

      const res = state.updateFinancialYearDates(activeCompanyId, targetFyId, newStart, newEnd);
      if (res.success) {
        alert("Financial Year dates successfully updated!");
        renderAdmin(container);
      } else {
        alert("Failed to update financial year dates: " + res.message);
      }
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
