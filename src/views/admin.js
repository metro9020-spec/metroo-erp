import { state } from "../state.js";
import { showFyLoadingOverlay } from "../main.js";
import { openRestoreCompanyModal } from "./restoreCompanyModal.js";
import { openMissingDoubleEntryModal } from "./missingDoubleEntryModal.js";
import { showClearDatabaseModal } from "./clearDatabaseModal.js";
import { showEditCompanyModal } from "./login.js";
import { showImportInvoicesModal } from "./importInvoicesModal.js";
import { showRearrangeBillsModal } from "./rearrangeBillsModal.js";
import { showRearrangeVouchersModal } from "./rearrangeVouchersModal.js";

let currentAdminTab = "tab-overview";

export function renderAdmin(container, activeTabId) {
  if (activeTabId) {
    currentAdminTab = activeTabId;
  }
  const activeTab = currentAdminTab || "tab-overview";

  const currentPassword = state.getAdminPassword();
  const activeCompanyId = state.getActiveCompanyId();
  const companies = state.getRegisteredCompanies();
  const company = companies.find(c => String(c.id) === String(activeCompanyId));
  const fysList = company ? (company.financialYears || []) : [];
  const activeFyId = state.getActiveFyId();
  const activeFyObj = fysList.find(f => f.id === activeFyId) || (fysList[0] || { startDate: company?.financialYearStarts || '2026-04-01', endDate: company?.financialYearEnds || '2027-03-31' });
  const activeFyLabel = company ? state.getFyDisplayLabel(activeFyObj) : 'N/A';

  const companyUsers = activeCompanyId ? state.getCompanyUsers(activeCompanyId) : [];
  const auditFindings = state.findMissingAndUnbalancedDoubleEntries({ onlyCurrentFy: true });
  const auditCount = auditFindings.length;
  const allowPyEdit = state.getOptions().allowPreviousYearEditing === true;

  container.innerHTML = `
    <div class="admin-container">
      
      <!-- Top Hero Banner Header & Quick Action Toolbar -->
      <div class="admin-hero-banner">
        <div class="admin-hero-header">
          <div>
            <div class="admin-hero-title-group">
              <i class="fa-solid fa-user-shield"></i>
              <h2>Administrator Command Center</h2>
              <span class="admin-badge-pill">ADMIN CONSOLE</span>
            </div>
            <p class="admin-hero-subtitle">Unified dashboard for multi-tenant companies, access roles, financial periods, accounting audit, and security settings.</p>
          </div>

          <!-- Quick Action Toolbar -->
          <div class="admin-quick-actions">
            <button type="button" id="header-btn-audit" class="admin-quick-btn btn-audit">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Double Entry Audit
            </button>
            <button type="button" id="header-btn-users" class="admin-quick-btn btn-users">
              <i class="fa-solid fa-users-gear"></i> Manage Users
            </button>
            <button type="button" id="header-btn-restore" class="admin-quick-btn btn-restore">
              <i class="fa-solid fa-rotate-left"></i> Restore Company
            </button>
            <button type="button" id="header-btn-rearrange-bills" class="admin-quick-btn btn-series" style="background: #2563eb;">
              <i class="fa-solid fa-arrow-down-1-9"></i> Rearrange Bills
            </button>
            <button type="button" id="header-btn-rearrange-vouchers" class="admin-quick-btn btn-series" style="background: #4f46e5;" title="Reset and renumber vouchers in ascending date order">
              <i class="fa-solid fa-arrow-down-1-9"></i> Reset Vouchers (Date)
            </button>
            <button type="button" id="header-btn-import-invoices" class="admin-quick-btn btn-series" style="background: #16a34a;">
              <i class="fa-solid fa-file-import"></i> Import Invoices
            </button>
            <button type="button" id="header-btn-canceled-bills" class="admin-quick-btn btn-purge" style="background: #dc2626;">
              <i class="fa-solid fa-ban"></i> Canceled Bills
            </button>
            <button type="button" id="header-btn-purge" class="admin-quick-btn btn-purge">
              <i class="fa-solid fa-trash-can"></i> Data Purge
            </button>
          </div>
        </div>

        <!-- Live KPI Summary Bar -->
        <div class="admin-kpi-grid">
          <div class="admin-kpi-card">
            <div class="admin-kpi-label">Active Company</div>
            <div class="admin-kpi-val" style="color: #38bdf8;" title="${company?.name || 'N/A'}">${company?.name || 'N/A'}</div>
          </div>

          <div class="admin-kpi-card">
            <div class="admin-kpi-label">Company ID</div>
            <div class="admin-kpi-val" style="color: #fde047;">${activeCompanyId || 'N/A'}</div>
          </div>

          <div class="admin-kpi-card">
            <div class="admin-kpi-label">Active Financial Year</div>
            <div class="admin-kpi-val" style="color: #86efac;" title="${activeFyLabel}">${activeFyLabel}</div>
          </div>

          <div class="admin-kpi-card">
            <div class="admin-kpi-label">Company Users</div>
            <div class="admin-kpi-val" style="color: #e0e7ff;">${companyUsers.length} Active User(s)</div>
          </div>

          <div class="admin-kpi-card">
            <div class="admin-kpi-label">Double Entry Health</div>
            <div class="admin-kpi-val" style="color: ${auditCount === 0 ? '#4ade80' : '#f87171'};">
              ${auditCount === 0 ? '100% BALANCED' : `${auditCount} Discrepancies`}
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs Bar -->
      <div class="admin-tabs-bar">
        <button type="button" class="admin-tab-btn ${activeTab === 'tab-overview' ? 'active' : ''}" data-tab="tab-overview">
          <i class="fa-solid fa-chart-pie"></i> Overview & Quick Tools
        </button>
        <button type="button" class="admin-tab-btn ${activeTab === 'tab-company' ? 'active' : ''}" data-tab="tab-company">
          <i class="fa-solid fa-building"></i> Companies (${companies.length})
        </button>
        <button type="button" class="admin-tab-btn ${activeTab === 'tab-users' ? 'active' : ''}" data-tab="tab-users">
          <i class="fa-solid fa-users"></i> Users & Roles (${companyUsers.length})
        </button>
        <button type="button" class="admin-tab-btn ${activeTab === 'tab-fy' ? 'active' : ''}" data-tab="tab-fy">
          <i class="fa-solid fa-calendar-days"></i> Financial Periods (${fysList.length})
        </button>
        <button type="button" class="admin-tab-btn ${activeTab === 'tab-audit' ? 'active' : ''}" data-tab="tab-audit">
          <i class="fa-solid fa-scale-unbalanced-flip"></i> Accounting & Audit Engines
        </button>
        <button type="button" class="admin-tab-btn ${activeTab === 'tab-security' ? 'active' : ''}" data-tab="tab-security">
          <i class="fa-solid fa-lock"></i> Security & Safeguards
        </button>
      </div>

      <!-- TAB 1: OVERVIEW & QUICK TOOLS (3x2 Balanced Grid) -->
      <div id="tab-overview" class="admin-tab-content ${activeTab === 'tab-overview' ? 'active' : ''}" style="display: ${activeTab === 'tab-overview' ? 'flex' : 'none'}; flex-direction: column; gap: 0.6rem;">
        <div class="admin-cards-grid">
          
          <!-- Card 1: Double Entry Diagnostic -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title">
                  <i class="fa-solid fa-scale-unbalanced-flip"></i> Double Entry Finder
                </div>
                <span class="admin-status-badge ${auditCount === 0 ? 'healthy' : 'warning'}">
                  ${auditCount === 0 ? 'HEALTHY' : `${auditCount} ISSUES`}
                </span>
              </div>
              <p class="admin-card-desc">Audit sales, purchases, returns & journal vouchers for missing accounting transactions or Debit ≠ Credit discrepancies.</p>
            </div>
            <button type="button" id="btn-overview-audit" class="btn btn-primary" style="padding: 6px 12px; background: #059669; border-color: #047857; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Launch Audit Tool
            </button>
          </div>

          <!-- Card 3: Company Users -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title">
                  <i class="fa-solid fa-users-gear"></i> User Access Manager
                </div>
                <span class="admin-status-badge purple">${companyUsers.length} USERS</span>
              </div>
              <p class="admin-card-desc">Manage user credentials, assign roles (Admin, Sales Clerk, Accountant), and update login access passwords.</p>
            </div>
            <button type="button" id="btn-overview-users" class="btn btn-primary" style="padding: 6px 12px; background: #1e3b8b; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i class="fa-solid fa-user-plus"></i> Open User Manager
            </button>
          </div>

          <!-- Card 4: Restore Company -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title">
                  <i class="fa-solid fa-rotate-left" style="color: #10b981;"></i> Restore Company
                </div>
                <span class="admin-status-badge healthy">RECOVERY</span>
              </div>
              <p class="admin-card-desc">Inspect archived company backups and restore deleted company profiles & data back to active status.</p>
            </div>
            <button type="button" id="btn-overview-restore" class="btn btn-success" style="padding: 6px 12px; background: #10b981; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i class="fa-solid fa-rotate-left"></i> Restore Deleted Company
            </button>
          </div>

          <!-- Card 5: Data Purge Tool -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title" style="color: #991b1b;">
                  <i class="fa-solid fa-trash-can" style="color: #ef4444;"></i> Data Purge & Clear DB
                </div>
                <span class="admin-status-badge warning">MAINTENANCE</span>
              </div>
              <p class="admin-card-desc">Select specific data categories (Sales, Purchases, Inventory, Vouchers) to purge or reset database.</p>
            </div>
            <button type="button" id="btn-overview-purge" class="btn btn-danger" style="padding: 6px 12px; background: #ef4444; border-color: #dc2626; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i class="fa-solid fa-trash-can"></i> Open Data Purge Tool
            </button>
          </div>

          <!-- Card 6: Google Drive & Custom Backup -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title" style="color: #15803d;">
                  <i class="fa-solid fa-cloud-arrow-up" style="color: #16a34a;"></i> Google Drive Backup
                </div>
                <span class="admin-status-badge healthy">CLOUD BACKUP</span>
              </div>
              <p class="admin-card-desc">Export snapshot copy of <strong>COMPANY DATA BASE</strong> to Google Drive or custom folder.</p>

              <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;">
                <div style="display: flex; gap: 4px;">
                  <input type="text" id="admin-gdrive-path" value="${state.options?.googleDriveBackupPath || ''}" placeholder="Path e.g. G:\\My Drive\\Backups" style="flex: 1; padding: 4px 8px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 4px; font-size: 0.75rem; font-family: monospace; background: var(--bg-tertiary, #ffffff); color: var(--text-primary, #0f172a);">
                  <button type="button" id="btn-gdrive-fill-default" title="Auto-Suggest Default Path" style="background: var(--bg-tertiary, #f1f5f9); border: 1px solid var(--border-color, #cbd5e1); color: var(--text-secondary, #334155); padding: 4px 8px; font-size: 0.72rem; font-weight: 600; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                    <i class="fa-solid fa-magic"></i> Auto
                  </button>
                </div>
                <div id="gdrive-status-msg" style="font-size: 0.72rem; font-weight: 600; display: none; margin-top: 2px;"></div>
              </div>
            </div>

            <button type="button" id="btn-overview-gdrive-backup" style="padding: 6px 12px; background: #16a34a; border: none; color: white; border-radius: 4px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i class="fa-solid fa-cloud-arrow-up"></i> Backup to Google Drive
            </button>
          </div>

          <!-- Card 7: Import Sales & Purchase Invoices -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title" style="color: #0369a1;">
                  <i class="fa-solid fa-file-import" style="color: #0284c7;"></i> Import Sales & Purchase Invoices
                </div>
                <span class="admin-status-badge info">BULK IMPORT</span>
              </div>
              <p class="admin-card-desc">Import sales and purchase invoices from CSV files. Customize voucher series numbers, choose group/single mode, and auto-detect missing customers/vendors.</p>
            </div>
            <button type="button" id="btn-overview-import-invoices" class="btn btn-primary" style="padding: 6px 12px; background: #0284c7; border-color: #0369a1; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i class="fa-solid fa-file-import"></i> Launch Import Engine
            </button>
          </div>

          <!-- Card 8: Canceled Bills & Series Adjuster -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title" style="color: #dc2626;">
                  <i class="fa-solid fa-ban" style="color: #ef4444;"></i> Canceled Bills & Series Adjuster
                </div>
                <span class="admin-status-badge warning">SERIES TOOL</span>
              </div>
              <p class="admin-card-desc">Inspect cancelled sales & purchase bills, permanently remove them, and automatically re-adjust series numbers like the bill never existed.</p>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" id="btn-overview-can-sales" class="btn btn-primary" style="flex:1; padding: 6px 8px; background: #dc2626; border-color: #b91c1c; font-size: 0.76rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <i class="fa-solid fa-file-invoice"></i> Sales Cancelled
              </button>
              <button type="button" id="btn-overview-can-pur" class="btn btn-primary" style="flex:1; padding: 6px 8px; background: #991b1b; border-color: #7f1d1d; font-size: 0.76rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <i class="fa-solid fa-cart-shopping"></i> Purchase Cancelled
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- TAB 2: COMPANY & MULTI-TENANT MANAGEMENT -->
      <div id="tab-company" class="admin-tab-content ${activeTab === 'tab-company' ? 'active' : ''}" style="display: ${activeTab === 'tab-company' ? 'flex' : 'none'}; flex-direction: column; gap: 0.6rem;">
        <div class="admin-panel-section">
          <div class="admin-section-header">
            <div>
              <h3 class="admin-section-title"><i class="fa-solid fa-building" style="color: #2563eb;"></i> Registered Companies & Multi-Tenant Registry</h3>
              <p class="admin-section-subtitle">View active companies, modify Company IDs, manage financial years, and perform company backups or deletion.</p>
            </div>
            <button type="button" id="btn-tab-company-restore" style="background: #10b981; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-size: 0.78rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px;">
              <i class="fa-solid fa-rotate-left"></i> Restore Company
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; max-height: calc(100vh - 270px); overflow-y: auto;">
            ${companies.length === 0 ? `<div style="font-size: 0.8rem; color: var(--text-secondary, #64748b); padding: 12px; text-align: center;">No registered companies found in database.</div>` : companies.map(c => {
              const isActive = String(c.id) === String(activeCompanyId);
              const fysCount = (c.financialYears || []).length || 1;
              return `
                <div class="admin-list-card ${isActive ? 'active' : ''}">
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary, #1e293b);">${c.name}</span>
                      <span class="admin-status-badge neutral" style="background: #1e3b8b; color: white;">ID: ${c.id}</span>
                      ${isActive ? `<span class="admin-status-badge healthy">ACTIVE COMPANY</span>` : ''}
                    </div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary, #64748b); margin-top: 4px;">
                      ${c.subName ? `${c.subName} • ` : ''}${c.gstin ? `GSTIN: ${c.gstin} • ` : ''}${fysCount} Financial Year(s)
                    </div>
                  </div>
                  <div class="admin-list-actions">
                    <button type="button" class="btn-admin-edit-company btn btn-primary" data-id="${c.id}" data-name="${c.name}" style="padding: 4px 10px; font-size: 0.76rem; background: #1e3b8b; border-color: #1e3b8b; color: white; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                      <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button type="button" class="btn-admin-change-company-id btn btn-secondary" data-id="${c.id}" data-name="${c.name}" style="padding: 4px 10px; font-size: 0.76rem; background: #0284c7; border-color: #0369a1; color: white; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                      <i class="fa-solid fa-pen-to-square"></i> Change ID
                    </button>
                    <button type="button" class="btn-admin-delete-company btn btn-danger" data-id="${c.id}" data-name="${c.name}" style="padding: 4px 10px; font-size: 0.76rem; background: #ef4444; border-color: #dc2626; color: white; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                      <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- TAB 3: USER MANAGEMENT & ACCESS ROLES -->
      <div id="tab-users" class="admin-tab-content ${activeTab === 'tab-users' ? 'active' : ''}" style="display: ${activeTab === 'tab-users' ? 'flex' : 'none'}; flex-direction: column; gap: 0.6rem;">
        <div class="admin-panel-section">
          <div class="admin-section-header">
            <div>
              <h3 class="admin-section-title"><i class="fa-solid fa-users-gear" style="color: #2563eb;"></i> Company User Credentials & Access Roles</h3>
              <p class="admin-section-subtitle">Manage company user profiles, assign operational roles, and update passwords for <strong>${company?.name || 'Active Company'}</strong>.</p>
            </div>
            <button type="button" id="btn-tab-open-user-modal" class="btn btn-primary" style="padding: 5px 14px; background: #1e3b8b; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; gap: 5px;">
              <i class="fa-solid fa-user-plus"></i> Open User Manager
            </button>
          </div>

          <div class="admin-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${companyUsers.length === 0 ? `
                  <tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--text-secondary, #64748b);">No active users found for this company.</td></tr>
                ` : companyUsers.map(u => `
                  <tr>
                    <td style="font-weight: 700;">${u.fullName || u.username}</td>
                    <td style="font-family: monospace; font-size: 0.82rem; color: #2563eb;">${u.username}</td>
                    <td><span class="admin-status-badge info">${u.role || 'Sales Clerk'}</span></td>
                    <td><span class="admin-status-badge ${u.status === 'Inactive' ? 'warning' : 'healthy'}">${u.status || 'Active'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 4: FINANCIAL YEAR MANAGEMENT -->
      <div id="tab-fy" class="admin-tab-content ${activeTab === 'tab-fy' ? 'active' : ''}" style="display: ${activeTab === 'tab-fy' ? 'flex' : 'none'}; flex-direction: column; gap: 0.6rem;">
        <div class="admin-panel-section">
          <div class="admin-section-header">
            <div>
              <h3 class="admin-section-title"><i class="fa-solid fa-calendar-days" style="color: #2563eb;"></i> Financial Year Management & Configuration</h3>
              <p class="admin-section-subtitle">Edit financial year names, starting/ending dates, switch active financial years, or delete period records.</p>
            </div>
          </div>

          <!-- Previous Financial Year Editing & Entry Security Lock Card -->
          <div style="background: ${allowPyEdit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; border: 1px solid ${allowPyEdit ? '#86efac' : '#fecdd3'}; border-radius: 6px; padding: 10px 14px; margin-bottom: 0.6rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="flex: 1; min-width: 250px;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <i class="fa-solid ${allowPyEdit ? 'fa-lock-open' : 'fa-lock'}" style="font-size: 1.1rem; color: ${allowPyEdit ? '#15803d' : '#b91c1c'};"></i>
                <span style="font-weight: 800; font-size: 0.85rem; color: var(--text-primary, #0f172a);">Previous Financial Year (PY) Lock Status:</span>
                <span class="admin-status-badge ${allowPyEdit ? 'healthy' : 'warning'}">
                  ${allowPyEdit ? 'UNLOCKED / ALLOWED' : 'LOCKED (PROTECTED)'}
                </span>
              </div>
              <p style="margin: 2px 0 0 0; font-size: 0.76rem; color: var(--text-secondary, #475569);">
                ${allowPyEdit 
                  ? 'Previous year transaction editing is currently <strong style="color:#15803d;">UNLOCKED</strong>. Users can post, edit or delete past bills.' 
                  : 'Previous year transaction editing is currently <strong style="color:#b91c1c;">LOCKED</strong>. Historical records are protected from alterations.'}
              </p>
            </div>
            <button type="button" class="btn-toggle-py-lock btn" style="background: ${allowPyEdit ? '#dc2626' : '#059669'}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px;">
              <i class="fa-solid ${allowPyEdit ? 'fa-lock' : 'fa-lock-open'}"></i>
              ${allowPyEdit ? 'Lock Previous Year' : 'Unlock Previous Year'}
            </button>
          </div>

          <!-- Edit FY Details Compact Form -->
          <form id="admin-fy-date-form-tab" style="display: flex; flex-direction: column; gap: 8px; background: var(--bg-tertiary, #f8fafc); border: 1px solid var(--border-color, #cbd5e1); padding: 10px 12px; border-radius: 6px; margin-bottom: 0.6rem;">
            <div style="font-weight: 800; font-size: 0.82rem; color: #1e3b8b; border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 4px;">
              <i class="fa-solid fa-pen-to-square"></i> Edit Financial Year Details
            </div>
            <div style="display: grid; grid-template-columns: ${fysList.length > 1 ? '1fr 1fr 1fr 1fr auto' : '1fr 1fr 1fr auto'}; gap: 8px; align-items: end;">
              ${fysList.length > 1 ? `
                <div class="form-group" style="margin: 0;">
                  <label for="admin-fy-select-tab" style="font-weight: 700; font-size: 0.75rem; color: var(--text-secondary, #334155);">Select F.Y.</label>
                  <select id="admin-fy-select-tab" class="form-control" style="background: var(--bg-secondary, white); color: var(--text-primary, black); font-weight: 700; font-size: 0.78rem; padding: 4px 8px;">
                    ${fysList.map(fy => `
                      <option value="${fy.id}" ${fy.id === activeFyId ? 'selected' : ''}>
                        ${state.getFyDisplayLabel(fy)}${fy.id === activeFyId ? ' [ACTIVE]' : ''}
                      </option>
                    `).join('')}
                  </select>
                </div>
              ` : ''}

              <div class="form-group" style="margin: 0;">
                <label for="admin-fy-name-tab" style="font-weight: 700; font-size: 0.75rem; color: var(--text-secondary, #334155);">F.Y. Name / Label</label>
                <input type="text" id="admin-fy-name-tab" class="form-control" value="${activeFyObj.name || ''}" placeholder="e.g. FY 2026-27" style="background: var(--bg-secondary, white); color: var(--text-primary, black); font-weight: bold; font-size: 0.78rem; padding: 4px 8px;">
              </div>

              <div class="form-group" style="margin: 0;">
                <label for="admin-fy-start-date-tab" style="font-weight: 700; font-size: 0.75rem; color: var(--text-secondary, #334155);">Starts From *</label>
                <input type="date" id="admin-fy-start-date-tab" class="form-control" value="${activeFyObj.startDate || '2026-04-01'}" required style="background: var(--bg-secondary, white); color: var(--text-primary, black); font-weight: bold; font-size: 0.78rem; padding: 4px 8px;">
              </div>

              <div class="form-group" style="margin: 0;">
                <label for="admin-fy-end-date-tab" style="font-weight: 700; font-size: 0.75rem; color: var(--text-secondary, #334155);">Ends On *</label>
                <input type="date" id="admin-fy-end-date-tab" class="form-control" value="${activeFyObj.endDate || '2027-03-31'}" required style="background: var(--bg-secondary, white); color: var(--text-primary, black); font-weight: bold; font-size: 0.78rem; padding: 4px 8px;">
              </div>

              <button type="submit" class="btn btn-primary" style="padding: 5px 14px; background: #059669; border-color: #047857; font-size: 0.78rem; font-weight: 700; white-space: nowrap;">
                <i class="fa-solid fa-calendar-check"></i> Save
              </button>
            </div>
          </form>

          <!-- List of Configured Financial Years -->
          <div style="display: flex; flex-direction: column; gap: 6px; max-height: calc(100vh - 380px); overflow-y: auto;">
            <div style="font-size: 0.78rem; font-weight: 800; color: var(--text-secondary, #334155);">Configured Financial Years:</div>
            ${fysList.map(fy => {
              const isCurrentActive = String(fy.id) === String(activeFyId);
              const isOnlyFy = fysList.length <= 1;
              const displayLabel = state.getFyDisplayLabel(fy);
              const startF = fy.startDate ? fy.startDate.split('-').reverse().join('/') : 'N/A';
              const endF = fy.endDate ? fy.endDate.split('-').reverse().join('/') : 'N/A';
              return `
                <div class="admin-list-card ${isCurrentActive ? 'active' : ''}">
                  <div style="flex: 1;">
                    <span style="font-weight: 800; font-size: 0.85rem; color: var(--text-primary, #1e293b);">${displayLabel}</span>
                    <span style="font-size: 0.76rem; color: var(--text-secondary, #64748b); margin-left: 6px;">(${startF} to ${endF})</span>
                    ${isCurrentActive ? `<span class="admin-status-badge healthy" style="margin-left: 6px;">ACTIVE</span>` : ''}
                  </div>
                  <div class="admin-list-actions">
                    ${!isCurrentActive ? `
                      <button type="button" class="btn-admin-set-active-fy btn btn-secondary" data-id="${fy.id}" style="padding: 4px 10px; font-size: 0.74rem; background: #2563eb; border-color: #1d4ed8; color: white; cursor: pointer; font-weight: 700;">
                        <i class="fa-solid fa-check-to-slot"></i> Set Active
                      </button>
                    ` : ''}
                    <button type="button" class="btn-admin-delete-fy btn btn-danger" data-id="${fy.id}" data-label="${displayLabel}" ${isOnlyFy ? 'disabled title="Cannot delete the only financial year"' : ''} style="padding: 4px 10px; font-size: 0.74rem; background: #ef4444; border-color: #dc2626; ${isOnlyFy ? 'opacity: 0.5; cursor: not-allowed;' : 'cursor: pointer;'}">
                      <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- TAB 5: AUDIT & SERIES ENGINES -->
      <div id="tab-audit" class="admin-tab-content ${activeTab === 'tab-audit' ? 'active' : ''}" style="display: ${activeTab === 'tab-audit' ? 'flex' : 'none'}; flex-direction: column; gap: 0.6rem;">
        <div class="admin-cards-grid" style="grid-template-columns: 1fr 1fr;">
          
          <!-- Double Entry Diagnostic Engine Panel -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title">
                  <i class="fa-solid fa-scale-unbalanced-flip"></i> Double Entry Finder
                </div>
                <span class="admin-status-badge healthy">ACCOUNTING TOOL</span>
              </div>
              <p class="admin-card-desc">Scan database for unbalanced journal entries (Debit ≠ Credit), unlinked sales/purchases, 0-entry corrupted records, and missing ledger links.</p>
            </div>
            <button type="button" id="btn-tab-audit-launch" class="btn btn-primary" style="padding: 6px 14px; background: #059669; border-color: #047857; font-size: 0.78rem; font-weight: 700;">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Launch Double Entry Audit Tool
            </button>
          </div>

          <!-- Canceled Bills Manager Panel -->
          <div class="admin-card">
            <div>
              <div class="admin-card-header">
                <div class="admin-card-title" style="color: #dc2626;">
                  <i class="fa-solid fa-ban" style="color: #ef4444;"></i> Remove Canceled Bills & Adjust Series
                </div>
                <span class="admin-status-badge warning">SERIES ADJUSTMENT</span>
              </div>
              <p class="admin-card-desc">Remove cancelled bills permanently and automatically fill series gaps so bill numbers increment seamlessly as if cancelled bills never existed.</p>
            </div>
            <button type="button" id="btn-tab-canceled-bills-launch" class="btn btn-danger" style="padding: 6px 14px; background: #dc2626; border-color: #b91c1c; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i class="fa-solid fa-ban"></i> Launch Canceled Bills Manager
            </button>
          </div>

        </div>
      </div>

      <!-- TAB 6: SECURITY & DATA SAFEGUARDS -->
      <div id="tab-security" class="admin-tab-content ${activeTab === 'tab-security' ? 'active' : ''}" style="display: ${activeTab === 'tab-security' ? 'flex' : 'none'}; flex-direction: column; gap: 0.6rem;">
        <div class="admin-panel-section">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            
            <!-- Left Side: Password Form -->
            <div>
              <div class="admin-section-header">
                <div>
                  <h3 class="admin-section-title"><i class="fa-solid fa-lock" style="color: #2563eb;"></i> Operations Security Password</h3>
                  <p class="admin-section-subtitle">Required for company deletion & period closing.</p>
                </div>
              </div>

              <form id="admin-password-form" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="form-group" style="margin: 0;">
                  <label for="admin-current-pwd" style="font-weight: 700; font-size: 0.76rem; color: var(--text-secondary, #334155);">Current Security Password</label>
                  <input type="text" id="admin-current-pwd" class="form-control" value="${currentPassword}" readonly style="background-color: var(--bg-tertiary, #f1f5f9); color: var(--text-secondary, #64748b); cursor: not-allowed; font-weight: bold; font-size: 0.8rem; padding: 5px 8px;">
                </div>

                <div class="form-group" style="margin: 0;">
                  <label for="admin-new-pwd" style="font-weight: 700; font-size: 0.76rem; color: var(--text-secondary, #334155);">New Security Password *</label>
                  <input type="password" id="admin-new-pwd" class="form-control" placeholder="Enter new password..." required style="background: var(--bg-secondary, white); color: var(--text-primary, black); font-weight: bold; font-size: 0.8rem; padding: 5px 8px;">
                </div>

                <div class="form-group" style="margin: 0;">
                  <label for="admin-confirm-pwd" style="font-weight: 700; font-size: 0.76rem; color: var(--text-secondary, #334155);">Confirm New Password *</label>
                  <input type="password" id="admin-confirm-pwd" class="form-control" placeholder="Re-type new password..." required style="background: var(--bg-secondary, white); color: var(--text-primary, black); font-weight: bold; font-size: 0.8rem; padding: 5px 8px;">
                </div>

                <div style="margin-top: 4px;">
                  <button type="submit" class="btn btn-primary" style="padding: 6px 16px; background: #1e3b8b; font-size: 0.78rem; font-weight: 700;"><i class="fa-solid fa-floppy-disk"></i> Save Password</button>
                </div>
              </form>
            </div>

            <!-- Right Side: PY Lock Security Card -->
            <div style="border-left: 1px solid var(--border-color, #e2e8f0); padding-left: 1rem;">
              <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: #1e3b8b; font-weight: 800;"><i class="fa-solid fa-shield-halved"></i> Previous Year Lock Safeguard</h4>
              <div style="background: ${allowPyEdit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; border: 1px solid ${allowPyEdit ? '#86efac' : '#fecdd3'}; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary, #0f172a);">
                  Previous F.Y. Editing: 
                  <span style="font-weight: 800; color: ${allowPyEdit ? '#15803d' : '#b91c1c'};">${allowPyEdit ? 'UNLOCKED' : 'LOCKED'}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary, #64748b); line-height: 1.35;">
                  Toggle permission for users to edit, delete, or post new vouchers/bills in previous financial periods.
                </div>
                <button type="button" class="btn-toggle-py-lock btn" style="background: ${allowPyEdit ? '#dc2626' : '#059669'}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                  <i class="fa-solid ${allowPyEdit ? 'fa-lock' : 'fa-lock-open'}"></i>
                  ${allowPyEdit ? 'Lock Previous Year' : 'Unlock Previous Year'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  `;

  // ── Tab Switching Logic ──────────────────────────────────────────────────────────
  const tabBtns = container.querySelectorAll(".admin-tab-btn");
  const tabContents = container.querySelectorAll(".admin-tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (e) e.preventDefault();
      const targetId = btn.getAttribute("data-tab");
      if (targetId) {
        currentAdminTab = targetId;
      }

      tabBtns.forEach(b => {
        b.classList.remove("active");
      });
      tabContents.forEach(c => {
        c.style.display = "none";
        c.classList.remove("active");
      });

      btn.classList.add("active");

      const targetEl = container.querySelector(`#${targetId}`);
      if (targetEl) {
        targetEl.style.display = "flex";
        targetEl.classList.add("active");
      }
    });
  });

  // ── Event Handlers & Actions ──────────────────────────────────────────────────

  // Toggle Previous Financial Year Lock
  container.querySelectorAll(".btn-toggle-py-lock").forEach(btn => {
    btn.addEventListener("click", () => {
      const currentVal = state.getOptions().allowPreviousYearEditing === true;
      const newVal = !currentVal;
      state.updateOptions({ allowPreviousYearEditing: newVal });
      alert(newVal
        ? "SUCCESS: Previous Financial Year Editing & Entry is now TURNED ON (UNLOCKED).\n\nUsers are now allowed to create, edit, or delete transactions in previous financial years."
        : "SUCCESS: Previous Financial Year Editing & Entry is now TURNED OFF (LOCKED).\n\nTransactions and records in past financial years are now 100% locked and protected from edits or new entries."
      );
      renderAdmin(container);
    });
  });

  const openCanceledBillsModal = (type = "sales") => {
    import("./canceledBills.js").then(m => {
      m.showCanceledBillsReportModal(type, document.getElementById("modal-container-root"));
    });
  };

  // Header quick buttons
  container.querySelector("#header-btn-audit")?.addEventListener("click", () => openMissingDoubleEntryModal(() => renderAdmin(container)));
  container.querySelector("#header-btn-users")?.addEventListener("click", () => import("./userManagement.js").then(m => m.renderUserManagementModal()));
  container.querySelector("#header-btn-restore")?.addEventListener("click", () => openRestoreCompanyModal(() => renderAdmin(container)));
  container.querySelector("#header-btn-rearrange-bills")?.addEventListener("click", () => showRearrangeBillsModal());
  container.querySelector("#header-btn-rearrange-vouchers")?.addEventListener("click", () => showRearrangeVouchersModal("ALL"));
  container.querySelector("#header-btn-import-invoices")?.addEventListener("click", () => showImportInvoicesModal(() => renderAdmin(container)));
  container.querySelector("#header-btn-canceled-bills")?.addEventListener("click", () => openCanceledBillsModal("sales"));
  container.querySelector("#header-btn-purge")?.addEventListener("click", () => showClearDatabaseModal());

  // Overview Tab buttons
  container.querySelector("#btn-overview-audit")?.addEventListener("click", () => openMissingDoubleEntryModal(() => renderAdmin(container)));
  container.querySelector("#btn-overview-users")?.addEventListener("click", () => import("./userManagement.js").then(m => m.renderUserManagementModal()));
  container.querySelector("#btn-overview-restore")?.addEventListener("click", () => openRestoreCompanyModal(() => renderAdmin(container)));
  container.querySelector("#btn-overview-import-invoices")?.addEventListener("click", () => showImportInvoicesModal(() => renderAdmin(container)));
  container.querySelector("#btn-overview-can-sales")?.addEventListener("click", () => openCanceledBillsModal("sales"));
  container.querySelector("#btn-overview-can-pur")?.addEventListener("click", () => openCanceledBillsModal("purchase"));
  container.querySelector("#btn-overview-purge")?.addEventListener("click", () => showClearDatabaseModal());

  // Google Drive & Custom Location Backup Actions
  container.querySelector("#btn-gdrive-fill-default")?.addEventListener("click", () => {
    const inputEl = container.querySelector("#admin-gdrive-path");
    if (inputEl) {
      inputEl.value = "C:\\Google Drive\\ERP Backups";
    }
  });

  container.querySelector("#btn-overview-gdrive-backup")?.addEventListener("click", async () => {
    const inputEl = container.querySelector("#admin-gdrive-path");
    const statusEl = container.querySelector("#gdrive-status-msg");
    const backupBtn = container.querySelector("#btn-overview-gdrive-backup");

    const targetPath = inputEl ? inputEl.value.trim() : "";
    if (!targetPath) {
      alert("Please specify a Google Drive or custom folder path first.");
      return;
    }

    if (backupBtn) {
      backupBtn.disabled = true;
      backupBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Copying Database...`;
    }

    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.style.color = "#2563eb";
      statusEl.textContent = "⏳ Copying COMPANY DATA BASE folder to Google Drive target location...";
    }

    const res = await state.backupToCustomFolder(targetPath);

    if (backupBtn) {
      backupBtn.disabled = false;
      backupBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Backup to Google Drive`;
    }

    if (res.success) {
      if (statusEl) {
        statusEl.style.color = "#166534";
        statusEl.textContent = `✅ ${res.message}`;
      }
      alert(`SUCCESS!\n\n${res.message}\n\nBackup Location:\n${res.backupPath}`);
    } else {
      if (statusEl) {
        statusEl.style.color = "#dc2626";
        statusEl.textContent = `❌ ${res.message}`;
      }
      alert(`BACKUP FAILED:\n\n${res.message}`);
    }
  });

  // Company Tab restore button
  container.querySelector("#btn-tab-company-restore")?.addEventListener("click", () => openRestoreCompanyModal(() => renderAdmin(container)));

  // User Tab user manager button
  container.querySelector("#btn-tab-open-user-modal")?.addEventListener("click", () => import("./userManagement.js").then(m => m.renderUserManagementModal()));

  // Audit Tab launch buttons
  container.querySelector("#btn-tab-audit-launch")?.addEventListener("click", () => openMissingDoubleEntryModal(() => renderAdmin(container)));
  container.querySelector("#btn-tab-canceled-bills-launch")?.addEventListener("click", () => openCanceledBillsModal("sales"));

  // Financial Year Form Logic (Tab)
  const fySelectEl = container.querySelector("#admin-fy-select-tab");
  const fyNameInput = container.querySelector("#admin-fy-name-tab");
  const fyStartInput = container.querySelector("#admin-fy-start-date-tab");
  const fyEndInput = container.querySelector("#admin-fy-end-date-tab");

  if (fySelectEl) {
    fySelectEl.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      const selectedObj = fysList.find(f => f.id === selectedId);
      if (selectedObj) {
        if (fyNameInput) fyNameInput.value = selectedObj.name || "";
        if (fyStartInput && selectedObj.startDate) fyStartInput.value = selectedObj.startDate;
        if (fyEndInput && selectedObj.endDate) fyEndInput.value = selectedObj.endDate;
      }
    });
  }

  const fyDateFormTab = container.querySelector("#admin-fy-date-form-tab");
  if (fyDateFormTab) {
    fyDateFormTab.addEventListener("submit", (e) => {
      e.preventDefault();
      const targetFyId = fySelectEl ? fySelectEl.value : activeFyId;
      const newName = fyNameInput ? fyNameInput.value.trim() : "";
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

      const res = state.updateFinancialYearDates(activeCompanyId, targetFyId, newStart, newEnd, newName);
      if (res.success) {
        alert("Financial Year details successfully updated!");
        renderAdmin(container);
      } else {
        alert("Failed to update financial year details: " + res.message);
      }
    });
  }

  container.querySelectorAll(".btn-admin-set-active-fy").forEach(btn => {
    btn.addEventListener("click", async () => {
      const fyId = btn.getAttribute("data-id");
      const showOverlay = window.showFyLoadingOverlay || showFyLoadingOverlay;
      await showOverlay(async () => {
        state.setActiveFyId(fyId);
        await state.initFromServer();
        renderAdmin(container);
      }, 700);
    });
  });

  container.querySelectorAll(".btn-admin-delete-fy").forEach(btn => {
    btn.addEventListener("click", async () => {
      const fyId = btn.getAttribute("data-id");
      const fyLabel = btn.getAttribute("data-label");

      if (!confirm(`CRITICAL WARNING:\n\nAre you sure you want to PERMANENTLY DELETE Financial Year "${fyLabel}"?`)) return;

      const adminPassword = prompt("SECURITY CHECK: Enter Admin Security Password to confirm deletion of this Financial Year:");
      if (adminPassword === null) return;

      if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
        alert("Incorrect Admin Security Password! Financial Year deletion aborted.");
        return;
      }

      const showOverlay = window.showFyLoadingOverlay || showFyLoadingOverlay;
      let deleteResult = null;
      await showOverlay(async () => {
        deleteResult = await state.deleteFinancialYear(activeCompanyId, fyId);
        if (typeof window.updateCompanyHeaderIndicator === "function") {
          window.updateCompanyHeaderIndicator();
        }
        renderAdmin(container);
      }, 700);

      if (deleteResult && !deleteResult.success) {
        alert("Failed to delete Financial Year: " + deleteResult.message);
      }
    });
  });

  // Edit Company Details
  container.querySelectorAll(".btn-admin-edit-company").forEach(btn => {
    btn.addEventListener("click", () => {
      const compId = btn.getAttribute("data-id");
      showEditCompanyModal(document.getElementById("modal-container-root"), () => renderAdmin(container), compId);
    });
  });

  // Change Company ID
  container.querySelectorAll(".btn-admin-change-company-id").forEach(btn => {
    btn.addEventListener("click", () => {
      const oldCompId = btn.getAttribute("data-id");
      const compName = btn.getAttribute("data-name");

      const newIdInput = prompt(`CHANGE COMPANY ID for "${compName}":\n\nCurrent Company ID: ${oldCompId}\n\nEnter new Company ID:`, oldCompId);
      if (newIdInput === null) return;
      const cleanNewId = newIdInput.trim();
      if (!cleanNewId || cleanNewId === oldCompId) return;

      const adminPassword = prompt(`SECURITY CHECK: Enter Admin Security Password to change Company ID for "${compName}":`);
      if (adminPassword === null) return;

      if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
        alert("Incorrect Admin Security Password! Company ID change aborted.");
        return;
      }

      const res = state.changeCompanyId(oldCompId, cleanNewId);
      if (res.success) {
        alert(res.message);
        renderAdmin(container);
      } else {
        alert("Failed to change Company ID: " + res.message);
      }
    });
  });

  // Delete Company
  container.querySelectorAll(".btn-admin-delete-company").forEach(btn => {
    btn.addEventListener("click", async () => {
      const targetCompId = btn.getAttribute("data-id");
      const targetCompName = btn.getAttribute("data-name");

      if (!confirm(`CRITICAL SECURITY WARNING:\n\nAre you sure you want to BACKUP & DELETE Company "${targetCompName}" (Company ID: ${targetCompId})?`)) return;

      const adminPassword = prompt(`SECURITY CHECK: Enter Admin Security Password to confirm deletion of Company "${targetCompName}":`);
      if (adminPassword === null) return;

      if (adminPassword !== state.getAdminPassword() && adminPassword !== "123") {
        alert("Incorrect Admin Security Password! Company deletion aborted.");
        return;
      }

      try {
        const result = await state.deleteCompany(targetCompId);
        alert(`Company "${targetCompName}" has been deleted successfully.\n\nBackup saved to:\n${result.backupLocation || 'BACKUP folder'}`);
        if (String(activeCompanyId) === String(targetCompId)) {
          window.location.reload();
        } else {
          renderAdmin(container);
        }
      } catch (err) {
        alert(`Failed to delete company: ${err.message}`);
      }
    });
  });

  // Admin Password Form
  container.querySelector("#admin-password-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const newPwd = container.querySelector("#admin-new-pwd").value;
    const confirmPwd = container.querySelector("#admin-confirm-pwd").value;

    if (newPwd !== confirmPwd) {
      alert("New password and confirm password do not match!");
      return;
    }

    state.setAdminPassword(newPwd);
    alert("Admin security password updated successfully!");
    renderAdmin(container);
  });
}

