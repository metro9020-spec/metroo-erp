import { state } from "../state.js";
import { bringToFront } from "../utils/draggable.js";

export function renderUserManagementModal() {
  const activeCompanyId = state.getActiveCompanyId();
  if (!activeCompanyId) {
    alert("Please select a company first.");
    return;
  }

  const existingModal = document.getElementById("user-management-modal");
  if (existingModal) existingModal.remove();

  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay active";
  modalOverlay.id = "user-management-modal";
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999900;
    pointer-events: auto !important;
  `;

  const container = document.createElement("div");
  container.className = "modal-container";
  container.style.cssText = `
    position: relative;
    width: 750px;
    max-width: 95vw;
    background: #ffffff;
    border: 2px solid #1e3b8b;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    pointer-events: auto !important;
    transform: none !important;
    z-index: 999901;
  `;

  const getUsersForManagementUI = () => {
    const currentUser = state.getCurrentUser();
    const isAdmin = !currentUser || currentUser.role === "Admin" || (currentUser.username && currentUser.username.toLowerCase() === "admin");
    if (isAdmin) {
      return state.getAllUsers();
    }
    return state.getCompanyUsers(activeCompanyId);
  };

  const showUserEditForm = (userArg = null) => {
    try {
      let userObj = null;
      if (typeof userArg === "string" || typeof userArg === "number") {
        const usersList = state.getAllUsers();
        userObj = usersList.find(u => String(u.id) === String(userArg) || String(u.username).toLowerCase() === String(userArg).toLowerCase()) || null;
      } else if (userArg && typeof userArg === "object" && (userArg.username || userArg.id) && !(userArg instanceof Event)) {
        userObj = userArg;
      }

      const existingFormOverlay = document.getElementById("user-edit-form-overlay");
      if (existingFormOverlay) existingFormOverlay.remove();

      const formOverlay = document.createElement("div");
      formOverlay.id = "user-edit-form-overlay";
      formOverlay.className = "modal-overlay active";
      formOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.65);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000000;
        pointer-events: auto !important;
      `;

      const isEdit = !!userObj;
      const allCompanies = state.getRegisteredCompanies();
      const currentAllowed = (userObj && Array.isArray(userObj.allowedCompanies) && userObj.allowedCompanies.length > 0)
        ? userObj.allowedCompanies.map(String)
        : allCompanies.map(c => String(c.id));

      const renderCompanyCheckboxes = (isRoleAdmin) => {
        if (isRoleAdmin) {
          return `
            <div style="font-size: 0.8rem; color: #0284c7; font-weight: bold;">
              <i class="fa-solid fa-shield-halved" style="margin-right: 4px;"></i> Admin role has access to all companies by default.
            </div>
          `;
        }
        return `
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${allCompanies.map(c => {
              const cIdStr = String(c.id);
              const isChecked = currentAllowed.includes(cIdStr);
              return `
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #1e293b; cursor: pointer;">
                  <input type="checkbox" class="chk-company-access" value="${c.id}" ${isChecked ? "checked" : ""}>
                  <span style="font-weight: 600;">${c.name}</span>
                </label>
              `;
            }).join("")}
          </div>
        `;
      };

      const isAdminDefault = isEdit ? (userObj.username === "admin" || userObj.role === "Admin") : false;

      formOverlay.innerHTML = `
        <div class="modal-container" style="width: 480px; max-width: 92vw; background: white; border-radius: 8px; box-shadow: 0 12px 30px rgba(0,0,0,0.45); overflow: hidden; font-family: system-ui, -apple-system, sans-serif; pointer-events: auto !important; position: relative; z-index: 1000001; transform: none !important;">
          <div style="background: #1e3b8b; color: white; padding: 12px 18px; font-weight: bold; font-size: 1.05rem; display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fa-solid ${isEdit ? 'fa-user-pen' : 'fa-user-plus'}" style="margin-right: 8px;"></i> ${isEdit ? "Edit User Account" : "Add New User Account"}</span>
            <button type="button" id="close-user-form-x" style="background: transparent; border: none; color: white; cursor: pointer; font-size: 1.4rem; line-height: 1;">&times;</button>
          </div>
          <form id="user-account-form" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Username *</label>
              <input type="text" id="usr-username" value="${isEdit ? (userObj.username || '') : ""}" ${isEdit && userObj.username === "admin" ? "readonly style='background:#f1f5f9; color:#64748b;'" : ""} required style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.88rem; box-sizing: border-box;">
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Full Name</label>
              <input type="text" id="usr-fullname" value="${isEdit ? (userObj.fullName || "") : ""}" placeholder="e.g. John Doe" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.88rem; box-sizing: border-box;">
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Password *</label>
              <div style="position: relative; display: flex; align-items: center;">
                <input type="password" id="usr-password" value="${isEdit ? (userObj.password || '') : ""}" required style="width: 100%; padding: 8px 36px 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.88rem; box-sizing: border-box;">
                <button type="button" id="toggle-usr-password" style="position: absolute; right: 8px; background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 0.95rem; padding: 2px;" title="Toggle Password Visibility">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">User Role</label>
              <select id="usr-role" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.88rem; background: white; box-sizing: border-box;">
                <option value="Admin" ${isEdit && userObj.role === "Admin" ? "selected" : ""}>Admin (Full Access)</option>
                <option value="Manager" ${isEdit && userObj.role === "Manager" ? "selected" : (!isEdit ? "" : "")}>Manager (Operations)</option>
                <option value="Billing / Sales Clerk" ${isEdit && userObj.role === "Billing / Sales Clerk" ? "selected" : (!isEdit ? "selected" : "")}>Billing / Sales Clerk</option>
                <option value="Accountant" ${isEdit && userObj.role === "Accountant" ? "selected" : ""}>Accountant</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Allowed Company Access</label>
              <div id="company-access-container" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; max-height: 140px; overflow-y: auto;">
                ${renderCompanyCheckboxes(isAdminDefault)}
              </div>
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Account Status</label>
              <select id="usr-status" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.88rem; background: white; box-sizing: border-box;">
                <option value="Active" ${isEdit && userObj.status === "Active" ? "selected" : ""}>Active</option>
                <option value="Inactive" ${isEdit && userObj.status === "Inactive" ? "selected" : ""}>Inactive</option>
              </select>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
              <button type="button" id="cancel-user-form" style="padding: 8px 16px; background: #cbd5e1; color: #334155; border: none; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">Cancel</button>
              <button type="submit" style="padding: 8px 20px; background: #1e3b8b; color: white; border: none; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">Save User</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(formOverlay);
      bringToFront(formOverlay);

      const closeForm = () => formOverlay.remove();
      formOverlay.querySelector("#close-user-form-x")?.addEventListener("click", closeForm);
      formOverlay.querySelector("#cancel-user-form")?.addEventListener("click", closeForm);

      const roleSelect = formOverlay.querySelector("#usr-role");
      const companyContainer = formOverlay.querySelector("#company-access-container");

      roleSelect?.addEventListener("change", () => {
        const isRoleAdmin = roleSelect.value === "Admin";
        companyContainer.innerHTML = renderCompanyCheckboxes(isRoleAdmin);
      });

      const pwdInput = formOverlay.querySelector("#usr-password");
      const pwdToggleBtn = formOverlay.querySelector("#toggle-usr-password");
      if (pwdToggleBtn && pwdInput) {
        pwdToggleBtn.addEventListener("click", () => {
          const isPassword = pwdInput.type === "password";
          pwdInput.type = isPassword ? "text" : "password";
          pwdToggleBtn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        });
      }

      formOverlay.querySelector("#user-account-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const usernameVal = formOverlay.querySelector("#usr-username").value.trim();
        const fullnameVal = formOverlay.querySelector("#usr-fullname").value.trim();
        const passVal = formOverlay.querySelector("#usr-password").value;
        const roleVal = formOverlay.querySelector("#usr-role").value;
        const statusVal = formOverlay.querySelector("#usr-status").value;

        if (!usernameVal || !passVal) {
          alert("Username and Password are required!");
          return;
        }

        const existingUsers = state.getAllUsers();
        if (!isEdit && existingUsers.some(u => u.username.toLowerCase() === usernameVal.toLowerCase())) {
          alert(`User with username "${usernameVal}" already exists!`);
          return;
        }

        let allowedCompaniesVal = [];
        if (roleVal === "Admin" || usernameVal.toLowerCase() === "admin") {
          allowedCompaniesVal = allCompanies.map(c => String(c.id));
        } else {
          const chks = formOverlay.querySelectorAll(".chk-company-access:checked");
          allowedCompaniesVal = Array.from(chks).map(cb => String(cb.value));
          if (allowedCompaniesVal.length === 0) {
            alert("Please select at least one company for this user to access.");
            return;
          }
        }

        const userData = {
          id: isEdit && userObj ? userObj.id : null,
          username: usernameVal,
          fullName: fullnameVal,
          password: passVal,
          role: roleVal,
          status: statusVal,
          allowedCompanies: allowedCompaniesVal
        };

        state.saveCompanyUser(activeCompanyId, userData);
        formOverlay.remove();
        renderContent();
      });
    } catch (err) {
      console.error("Error opening user form:", err);
      alert("Error opening form: " + err.message);
    }
  };

  window._openUserEditForm = (arg) => {
    showUserEditForm(arg);
  };

  function renderContent() {
    const users = getUsersForManagementUI();
    const allRegisteredComps = state.getRegisteredCompanies();

    container.innerHTML = `
      <div style="background: #1e3b8b; color: white; padding: 12px 18px; font-weight: bold; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;">
        <span><i class="fa-solid fa-users-gear" style="margin-right: 8px;"></i> User & Password Management</span>
        <button id="close-user-mgmt-btn" style="background: transparent; border: none; color: white; font-size: 1.2rem; cursor: pointer;">&times;</button>
      </div>

      <div style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
        <div>
          <div style="font-size: 0.9rem; font-weight: bold; color: #1e293b;">Company Users & Credentials</div>
          <div style="font-size: 0.75rem; color: #64748b;">Create different users with custom passwords, access roles, and company permissions.</div>
        </div>
        <button id="add-user-btn" style="background: #22c55e; color: white; border: none; padding: 7px 16px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px; pointer-events: auto !important;">
          <i class="fa-solid fa-user-plus"></i> Add New User
        </button>
      </div>

      <div style="padding: 15px 20px; overflow-y: auto; flex-grow: 1;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px;">Username</th>
              <th style="padding: 10px;">Full Name</th>
              <th style="padding: 10px;">Role</th>
              <th style="padding: 10px;">Allowed Companies</th>
              <th style="padding: 10px;">Status</th>
              <th style="padding: 10px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              let compBadges = "";
              if (u.role === "Admin" || u.username === "admin") {
                compBadges = `<span style="background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">All Companies</span>`;
              } else if (Array.isArray(u.allowedCompanies) && u.allowedCompanies.length > 0) {
                const names = u.allowedCompanies.map(id => {
                  const found = allRegisteredComps.find(c => String(c.id) === String(id));
                  return found ? found.name : `Company ${id}`;
                });
                compBadges = `<span style="background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;" title="${names.join(', ')}">${names.length} ${names.length === 1 ? 'Company' : 'Companies'} (${names.join(', ')})</span>`;
              } else {
                compBadges = `<span style="background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">None</span>`;
              }

              return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px; font-weight: bold; color: #1e3b8b;">${u.username}</td>
                  <td style="padding: 10px; color: #334155;">${u.fullName || "-"}</td>
                  <td style="padding: 10px;">
                    <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">${u.role || "Admin"}</span>
                  </td>
                  <td style="padding: 10px;">${compBadges}</td>
                  <td style="padding: 10px;">
                    <span style="color: ${u.status === "Inactive" ? "#ef4444" : "#16a34a"}; font-weight: bold; font-size: 0.8rem;">● ${u.status || "Active"}</span>
                  </td>
                  <td style="padding: 10px; text-align: center;">
                    <button class="edit-user-btn" data-id="${u.id || u.username}" style="background: #3b82f6; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; margin-right: 4px; pointer-events: auto !important;" title="Edit User">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    ${u.username !== "admin" ? `
                      <button class="delete-user-btn" data-id="${u.id || u.username}" data-username="${u.username}" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; pointer-events: auto !important;" title="Delete User">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    ` : ""}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
        <button id="close-user-mgmt-footer" style="padding: 6px 18px; background: #64748b; color: white; border: none; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer; pointer-events: auto !important;">Close</button>
      </div>
    `;

    container.querySelector("#close-user-mgmt-btn")?.addEventListener("click", () => modalOverlay.remove());
    container.querySelector("#close-user-mgmt-footer")?.addEventListener("click", () => modalOverlay.remove());

    container.querySelector("#add-user-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      showUserEditForm(null);
    });

    container.querySelectorAll(".edit-user-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetBtn = e.target.closest('.edit-user-btn');
        const id = targetBtn ? targetBtn.dataset.id : null;
        showUserEditForm(id);
      });
    });

    container.querySelectorAll(".delete-user-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetBtn = e.target.closest('.delete-user-btn');
        const id = targetBtn ? targetBtn.dataset.id : null;
        const username = targetBtn ? targetBtn.dataset.username : "";
        if (confirm(`Are you sure you want to delete user "${username}"?`)) {
          state.deleteCompanyUser(activeCompanyId, id);
          renderContent();
        }
      });
    });
  }

  renderContent();
  modalOverlay.appendChild(container);
  document.body.appendChild(modalOverlay);
  bringToFront(modalOverlay);
}
