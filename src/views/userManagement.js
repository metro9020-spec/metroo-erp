import { state } from "../state.js";

export function renderUserManagementModal(modalRoot = document.getElementById("modal-container-root")) {
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
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  `;

  const container = document.createElement("div");
  container.style.cssText = `
    width: 750px;
    max-width: 95vw;
    background: #ffffff;
    border: 2px solid #1e3b8b;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  `;

  const renderContent = () => {
    const users = state.getCompanyUsers(activeCompanyId);

    container.innerHTML = `
      <div style="background: #1e3b8b; color: white; padding: 12px 18px; font-weight: bold; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;">
        <span><i class="fa-solid fa-users-gear" style="margin-right: 8px;"></i> User & Password Management</span>
        <button id="close-user-mgmt-btn" style="background: transparent; border: none; color: white; font-size: 1.2rem; cursor: pointer;">&times;</button>
      </div>

      <div style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
        <div>
          <div style="font-size: 0.9rem; font-weight: bold; color: #1e293b;">Company Users & Credentials</div>
          <div style="font-size: 0.75rem; color: #64748b;">Create different users with custom passwords and access roles.</div>
        </div>
        <button id="add-user-btn" style="background: #22c55e; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
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
              <th style="padding: 10px;">Status</th>
              <th style="padding: 10px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold; color: #1e3b8b;">${u.username}</td>
                <td style="padding: 10px; color: #334155;">${u.fullName || "-"}</td>
                <td style="padding: 10px;">
                  <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">${u.role || "Admin"}</span>
                </td>
                <td style="padding: 10px;">
                  <span style="color: ${u.status === "Inactive" ? "#ef4444" : "#16a34a"}; font-weight: bold; font-size: 0.8rem;">● ${u.status || "Active"}</span>
                </td>
                <td style="padding: 10px; text-align: center;">
                  <button class="edit-user-btn" data-id="${u.id}" style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; margin-right: 4px;" title="Edit User">
                    <i class="fa-solid fa-pen"></i> Edit
                  </button>
                  ${u.username !== "admin" ? `
                    <button class="delete-user-btn" data-id="${u.id}" data-username="${u.username}" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;" title="Delete User">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  ` : ""}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
        <button id="close-user-mgmt-footer" style="padding: 6px 18px; background: #64748b; color: white; border: none; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">Close</button>
      </div>
    `;

    // Event listeners
    container.querySelector("#close-user-mgmt-btn").addEventListener("click", () => modalOverlay.remove());
    container.querySelector("#close-user-mgmt-footer").addEventListener("click", () => modalOverlay.remove());

    container.querySelector("#add-user-btn").addEventListener("click", () => showUserEditForm());

    container.querySelectorAll(".edit-user-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const userObj = users.find(u => u.id === id);
        if (userObj) showUserEditForm(userObj);
      });
    });

    container.querySelectorAll(".delete-user-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const username = e.currentTarget.dataset.username;
        if (confirm(`Are you sure you want to delete user "${username}"?`)) {
          state.deleteCompanyUser(activeCompanyId, id);
          renderContent();
        }
      });
    });
  };

  const showUserEditForm = (userObj = null) => {
    const formOverlay = document.createElement("div");
    formOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 3100;
    `;

    const isEdit = !!userObj;
    formOverlay.innerHTML = `
      <div style="width: 420px; background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); overflow: hidden;">
        <div style="background: #1e3b8b; color: white; padding: 10px 16px; font-weight: bold; font-size: 1rem; display: flex; justify-content: space-between;">
          <span>${isEdit ? "Edit User Account" : "Add New User Account"}</span>
          <button id="close-user-form" style="background: transparent; border: none; color: white; cursor: pointer; font-size: 1.1rem;">&times;</button>
        </div>
        <form id="user-account-form" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Username *</label>
            <input type="text" id="usr-username" value="${isEdit ? userObj.username : ""}" ${isEdit && userObj.username === "admin" ? "readonly style='background:#f1f5f9;'" : ""} required style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; box-sizing: border-box;">
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Full Name</label>
            <input type="text" id="usr-fullname" value="${isEdit ? (userObj.fullName || "") : ""}" placeholder="e.g. John Doe" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; box-sizing: border-box;">
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Password *</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="usr-password" value="${isEdit ? userObj.password : ""}" required style="width: 100%; padding: 6px 36px 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; box-sizing: border-box;">
              <button type="button" id="toggle-usr-password" style="position: absolute; right: 8px; background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 0.9rem; padding: 2px;" title="Toggle Password Visibility">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">User Role</label>
            <select id="usr-role" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; box-sizing: border-box;">
              <option value="Admin" ${isEdit && userObj.role === "Admin" ? "selected" : ""}>Admin (Full Access)</option>
              <option value="Manager" ${isEdit && userObj.role === "Manager" ? "selected" : ""}>Manager (Operations)</option>
              <option value="Billing / Sales Clerk" ${isEdit && userObj.role === "Billing / Sales Clerk" ? "selected" : ""}>Billing / Sales Clerk</option>
              <option value="Accountant" ${isEdit && userObj.role === "Accountant" ? "selected" : ""}>Accountant</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Account Status</label>
            <select id="usr-status" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; box-sizing: border-box;">
              <option value="Active" ${isEdit && userObj.status === "Active" ? "selected" : ""}>Active</option>
              <option value="Inactive" ${isEdit && userObj.status === "Inactive" ? "selected" : ""}>Inactive</option>
            </select>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
            <button type="button" id="cancel-user-form" style="padding: 6px 14px; background: #cbd5e1; color: #334155; border: none; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">Cancel</button>
            <button type="submit" style="padding: 6px 18px; background: #1e3b8b; color: white; border: none; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">Save User</button>
          </div>
        </form>
      </div>
    `;

    container.appendChild(formOverlay);

    formOverlay.querySelector("#close-user-form").addEventListener("click", () => formOverlay.remove());
    formOverlay.querySelector("#cancel-user-form").addEventListener("click", () => formOverlay.remove());

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

      // Check unique username for new accounts
      const existingUsers = state.getCompanyUsers(activeCompanyId);
      if (!isEdit && existingUsers.some(u => u.username.toLowerCase() === usernameVal.toLowerCase())) {
        alert(`User with username "${usernameVal}" already exists!`);
        return;
      }

      const userData = {
        id: isEdit ? userObj.id : null,
        username: usernameVal,
        fullName: fullnameVal,
        password: passVal,
        role: roleVal,
        status: statusVal
      };

      state.saveCompanyUser(activeCompanyId, userData);
      formOverlay.remove();
      renderContent();
    });
  };

  renderContent();
  modalOverlay.appendChild(container);
  modalRoot.appendChild(modalOverlay);
}
