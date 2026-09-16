import { state } from "../state.js";
import { setupGstinInput, validateGstinOnSubmit } from "../utils/gstValidator.js";

const INDIAN_STATES_DISTRICTS = {
  "KERALA": [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", 
    "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", 
    "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
  ],
  "TAMIL NADU": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tirunelveli"],
  "KARNATAKA": ["Bangalore", "Mysore", "Mangalore", "Hubli", "Belgaum", "Udupi"],
  "MAHARASHTRA": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"],
  "ANDHRA PRADESH": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  "ARUNACHAL PRADESH": ["Itanagar", "Tawang", "Ziro"],
  "ASSAM": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat"],
  "BIHAR": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "CHHATTISGARH": ["Raipur", "Bhilai", "Bilaspur"],
  "GOA": ["Panaji", "Margao", "Vasco da Gama"],
  "GUJARAT": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "HARYANA": ["Gurugram", "Faridabad", "Panipat", "Ambala"],
  "HIMACHAL PRADESH": ["Shimla", "Dharamshala", "Manali", "Solan"],
  "JHARKHAND": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "MADHYA PRADESH": ["Indore", "Bhopal", "Jabalpur", "Gwalior"],
  "MANIPUR": ["Imphal", "Ukhrul"],
  "MEGHALAYA": ["Shillong", "Tura"],
  "MIZORAM": ["Aizawl"],
  "NAGALAND": ["Kohima", "Dimapur"],
  "ODISHA": ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  "PUNJAB": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  "RAJASTHAN": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "SIKKIM": ["Gangtok"],
  "TELANGANA": ["Hyderabad", "Warangal", "Nizamabad"],
  "TRIPURA": ["Agartala"],
  "UTTAR PRADESH": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Varanasi", "Agra"],
  "UTTARAKHAND": ["Dehradun", "Haridwar", "Nainital"],
  "WEST BENGAL": ["Kolkata", "Howrah", "Darjeeling", "Siliguri"],
  "ANDAMAN AND NICOBAR": ["Port Blair"],
  "CHANDIGARH": ["Chandigarh"],
  "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": ["Daman", "Diu", "Silvassa"],
  "DELHI": ["New Delhi", "North Delhi", "South Delhi", "West Delhi"],
  "JAMMU AND KASHMIR": ["Srinagar", "Jammu", "Anantnag"],
  "LADAKH": ["Leh", "Kargil"],
  "LAKSHADWEEP": ["Kavaratti"],
  "PUDUCHERRY": ["Puducherry", "Karaikal"]
};

// Helper to format date as "30/ Jul /2026 Thursday"
function formatLoginDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[dateObj.getDay()];
  return `${day}/ ${month} /${year}  ${dayName}`;
}

export function showWelcomeScreen(container, onLoginSuccess) {
  container.innerHTML = "";
  
  // Outer container for centering
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: radial-gradient(circle, #f1f5f9 0%, #cbd5e1 100%);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 20px;
    box-sizing: border-box;
  `;
  container.appendChild(wrapper);

  renderLoginPanel(wrapper, onLoginSuccess);
}

function renderLoginPanel(parent, onLoginSuccess) {
  // Render login form immediately with zero delay (0ms)
  _renderLoginForm(parent, onLoginSuccess);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  const host = window.location.hostname || "localhost";

  const apiUrl = (typeof window._getApiUrl === "function") 
    ? window._getApiUrl("/api/companies") 
    : `http://${host}:3001/api/companies`;

  fetch(apiUrl, {
    headers: { "Bypass-Tunnel-Reminder": "true" },
    signal: controller.signal
  })
    .then(r => r.ok ? r.json() : null)
    .then(serverCompanies => {
      clearTimeout(timeoutId);
      if (Array.isArray(serverCompanies) && serverCompanies.length > 0) {
        const localStr = localStorage.getItem("erp_companies");
        const localCompanies = localStr ? JSON.parse(localStr) : [];
        const merged = serverCompanies.map(sc => {
          const lc = localCompanies.find(c => String(c.id) === String(sc.id));
          if (lc && lc.financialYears && lc.financialYears.length > 0) {
            sc.financialYears = lc.financialYears;
          }
          if (lc && lc.serverUrl) {
            sc.serverUrl = lc.serverUrl;
          }
          return sc;
        });
        localStorage.setItem("erp_companies", JSON.stringify(merged));
        _renderLoginForm(parent, onLoginSuccess);
      }
    })
    .catch(() => { /* server offline or timed out — silent */ });
}

function _renderLoginForm(parent, onLoginSuccess) {
  parent.innerHTML = "";
  const companies = state.getRegisteredCompanies();

  // If no companies even after server fetch, force company creation
  if (companies.length === 0) {
    renderCompanyCreationPanel(parent, onLoginSuccess, true);
    return;
  }

  const loginBox = document.createElement("div");
  loginBox.style.cssText = `
    width: 600px;
    background: #f8fafc;
    border: 2px solid #1e3b8b;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    overflow: hidden;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    background: #1e3b8b;
    color: white;
    padding: 10px 15px;
    font-size: 1.25rem;
    font-weight: bold;
    letter-spacing: 0.5px;
  `;
  header.textContent = "Login";
  loginBox.appendChild(header);

  const body = document.createElement("div");
  body.style.cssText = `
    display: flex;
    padding: 30px;
    gap: 30px;
  `;

  // Left column: logo & icon
  const leftCol = document.createElement("div");
  leftCol.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 180px;
  `;

  // Lock Icon HTML / SVG
  const iconWrapper = document.createElement("div");
  iconWrapper.style.cssText = `
    width: 120px;
    height: 120px;
    background: radial-gradient(circle, #60a5fa 0%, #1d4ed8 100%);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 10px rgba(29, 78, 216, 0.4);
    position: relative;
    margin-bottom: 20px;
  `;
  iconWrapper.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="white" style="width: 60px; height: 60px;">
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  `;
  leftCol.appendChild(iconWrapper);

  const brand = document.createElement("div");
  brand.style.cssText = `
    text-align: center;
    font-weight: 900;
    font-size: 1.5rem;
    color: #1e293b;
    font-style: italic;
  `;
  brand.innerHTML = `
    tradeasy<span style="color:#eab308; font-weight:normal;">®</span>
    <div style="font-size:0.65rem; background:#1e3b8b; color:white; padding:2px 6px; border-radius:2px; font-weight:bold; margin-top:2px; font-style:normal; letter-spacing:1px;">EASINESS IN BUSINESS</div>
  `;
  leftCol.appendChild(brand);
  body.appendChild(leftCol);

  // Right column: Form
  const rightCol = document.createElement("div");
  rightCol.style.cssText = `
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 15px;
  `;

  // Row creator
  const createFormRow = (labelText, element) => {
    const row = document.createElement("div");
    row.style.cssText = `
      display: grid;
      grid-template-columns: 100px 1fr;
      align-items: center;
      gap: 10px;
    `;
    const label = document.createElement("label");
    label.style.cssText = `
      font-weight: bold;
      color: #334155;
      font-size: 0.9rem;
    `;
    label.textContent = labelText;
    row.appendChild(label);
    row.appendChild(element);
    return row;
  };

  const companySelect = document.createElement("select");
  companySelect.style.cssText = `
    padding: 6px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
  `;
  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    companySelect.appendChild(opt);
  });

  const usernameInput = document.createElement("input");
  usernameInput.type = "text";
  usernameInput.value = "";
  usernameInput.placeholder = "Enter User Name";
  usernameInput.autocomplete = "off";
  usernameInput.setAttribute("autocomplete", "off");
  usernameInput.style.cssText = `
    padding: 6px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 0.9rem;
  `;

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.value = "";
  passwordInput.placeholder = "Enter Password";
  passwordInput.autocomplete = "new-password";
  passwordInput.setAttribute("autocomplete", "new-password");
  passwordInput.style.cssText = `
    padding: 6px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 0.9rem;
  `;

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = new Date().toISOString().split("T")[0];
  dateInput.style.cssText = `
    padding: 6px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
    cursor: pointer;
  `;

  // Set min date based on selected company's current FY start date
  const setDateMin = () => {
    const compId = companySelect.value;
    const comp = companies.find(c => c.id === compId);
    if (comp) {
      const fys = comp.financialYears || [];
      if (fys.length > 0) {
        const currentFy = fys[fys.length - 1];
        dateInput.min = currentFy.startDate || "";
        // If current value is before the min, reset to today or FY start
        if (dateInput.value < dateInput.min) {
          dateInput.value = dateInput.min;
        }
      }
    }
  };
  setDateMin();
  companySelect.addEventListener("change", setDateMin);

  dateInput.addEventListener("change", () => {
    if (dateInput.min && dateInput.value < dateInput.min) {
      alert("Login date cannot be before the start of the current financial year.");
      dateInput.value = dateInput.min;
    }
  });

  const serverUrlInput = document.createElement("input");
  serverUrlInput.type = "text";
  serverUrlInput.placeholder = "e.g. http://100.66.24.43:3001";
  serverUrlInput.style.cssText = `
    padding: 6px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 0.85rem;
  `;

  const updateServerUrlField = () => {
    const compId = companySelect.value;
    const comp = companies.find(c => String(c.id) === String(compId));
    if (comp && comp.serverUrl) {
      serverUrlInput.value = comp.serverUrl;
    } else {
      serverUrlInput.value = localStorage.getItem("erp_last_server_url") || "";
    }
  };
  updateServerUrlField();
  companySelect.addEventListener("change", updateServerUrlField);

  rightCol.appendChild(createFormRow("Company", companySelect));
  rightCol.appendChild(createFormRow("User Name", usernameInput));
  rightCol.appendChild(createFormRow("Password", passwordInput));
  rightCol.appendChild(createFormRow("Login Date", dateInput));
  rightCol.appendChild(createFormRow("Server URL", serverUrlInput));

  // Buttons row
  const btnRow = document.createElement("div");
  btnRow.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 15px;
  `;

  const newCompanyBtn = document.createElement("button");
  newCompanyBtn.type = "button";
  newCompanyBtn.style.cssText = `
    padding: 6px 16px;
    background: #64748b;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    margin-right: auto;
    font-size: 0.85rem;
  `;
  newCompanyBtn.textContent = "New Company";
  newCompanyBtn.addEventListener("click", () => {
    renderCompanyCreationPanel(parent, onLoginSuccess, false);
  });
  btnRow.appendChild(newCompanyBtn);

  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.style.cssText = `
    padding: 6px 24px;
    background: #1e3b8b;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
  `;
  okBtn.textContent = "OK";
  okBtn.addEventListener("click", async () => {
    const compId = companySelect.value;
    const selectedComp = companies.find(c => String(c.id) === String(compId));
    if (!selectedComp) return;

    // Save server URL to active company if provided
    const newServerUrl = serverUrlInput.value.trim().replace(/\/+$/, "");
    if (newServerUrl) {
      if (window.location.protocol === "https:" && newServerUrl.startsWith("http://")) {
        alert(
          `⚠️ Mixed Content Security Warning:\n\n` +
          `You are accessing the app over HTTPS (${window.location.origin}), but specified an HTTP local server (${newServerUrl}).\n\n` +
          `Web browsers block HTTP network connections from HTTPS web pages.\n\n` +
          `👉 Please open ${newServerUrl} directly in your browser address bar to connect to your local server database.`
        );
      }
      selectedComp.serverUrl = newServerUrl;
      localStorage.setItem("erp_last_server_url", newServerUrl);
      const allCompanies = state.getRegisteredCompanies();
      const match = allCompanies.find(c => String(c.id) === String(compId));
      if (match) {
        match.serverUrl = newServerUrl;
        state.saveRegisteredCompanies(allCompanies);
      }
    }

    const user = state.authenticateUser(compId, usernameInput.value, passwordInput.value);
    if (user) {
      state.setActiveCompanyId(compId);
      state.setCurrentUser({
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        role: user.role || "Admin"
      });

      // Always login to the current (latest) financial year
      const fys = selectedComp.financialYears || [];
      if (fys.length > 0) {
        state.setActiveFyId(fys[fys.length - 1].id);
      }
      state.setLoginDate(dateInput.value || new Date().toISOString().split("T")[0]);

      // Pull fresh company data from server before entering the app
      okBtn.disabled = true;
      okBtn.textContent = "Loading...";
      
      const loadingOverlay = document.createElement("div");
      loadingOverlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(15, 23, 42, 0.92);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 14px; color: white; font-family: sans-serif;
        backdrop-filter: blur(4px);
      `;
      loadingOverlay.innerHTML = `
        <div style="color:#3b82f6; font-size:2.5rem;"><i class="fa-solid fa-database fa-spin"></i></div>
        <div style="font-size:1.1rem; font-weight:bold; letter-spacing:0.05em;">DOWNLOADING COMPANY DATA FROM SERVER...</div>
        <div style="color:#94a3b8; font-size:0.85rem;">Please wait while your database is synchronized...</div>
      `;
      document.body.appendChild(loadingOverlay);

      try {
        await state.initFromServer();
      } catch(e) {
        state.loadState(); // fallback
      } finally {
        loadingOverlay.remove();
        okBtn.disabled = false;
        okBtn.textContent = "OK";
      }

      // Start auto-sync to keep this browser in sync with server every 30s
      state.startAutoSync(30000);
      onLoginSuccess();
    } else {
      alert("Invalid Username or Password!");
    }
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.style.cssText = `
    padding: 6px 20px;
    background: #cbd5e1;
    color: #334155;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
  `;
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    usernameInput.value = "";
    passwordInput.value = "";
    usernameInput.focus();
  });

  companySelect.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      usernameInput.focus();
    }
  });

  usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      okBtn.focus();
      okBtn.click();
    }
  });

  dateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      okBtn.focus();
      okBtn.click();
    }
  });

  btnRow.appendChild(okBtn);
  btnRow.appendChild(cancelBtn);
  rightCol.appendChild(btnRow);

  body.appendChild(rightCol);
  loginBox.appendChild(body);
  parent.appendChild(loginBox);

  setTimeout(() => companySelect.focus(), 50);
}

function renderCompanyCreationPanel(parent, onLoginSuccess, isFirstTime = false) {
  parent.innerHTML = "";
  const companies = state.getRegisteredCompanies();
  const nextId = String(companies.length > 0 ? Math.max(...companies.map(c => parseInt(c.id) || 1)) + 1 : 1);

  const infoBox = document.createElement("div");
  infoBox.style.cssText = `
    width: 800px;
    background: #f8fafc;
    border: 2px solid #1e3b8b;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    overflow: hidden;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    background: #1e3b8b;
    color: white;
    padding: 10px 15px;
    font-size: 1.25rem;
    font-weight: bold;
    letter-spacing: 0.5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `
    <span>Company Information</span>
    <span style="font-size:0.95rem; font-weight:normal; background:rgba(255,255,255,0.15); padding:2px 8px; border-radius:4px;">Company ID : ${nextId}</span>
  `;
  infoBox.appendChild(header);

  // Connect to Existing Server Banner
  const serverBanner = document.createElement("div");
  serverBanner.style.cssText = `
    background: #eff6ff;
    border-bottom: 1px solid #bfdbfe;
    padding: 10px 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.85rem;
    color: #1e40af;
  `;
  serverBanner.innerHTML = `
    <div style="font-weight: 600;">
      🔗 <span>Already have a Local Backend Server?</span>
      <div style="font-size: 0.75rem; font-weight: normal; color: #3b82f6;">Connect to your existing company database on disk</div>
    </div>
    <div style="display: flex; gap: 6px; align-items: center;">
      <input type="text" id="sync-server-url" placeholder="e.g. http://100.66.24.43:3001" style="padding: 4px 8px; border: 1px solid #93c5fd; border-radius: 4px; font-size: 0.8rem; width: 220px;" />
      <button type="button" id="btn-sync-server" style="padding: 4px 12px; background: #2563eb; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">Connect & Sync</button>
    </div>
  `;
  infoBox.appendChild(serverBanner);

  setTimeout(() => {
    const syncBtn = document.getElementById("btn-sync-server");
    const syncInput = document.getElementById("sync-server-url");
    if (syncBtn && syncInput) {
      syncBtn.addEventListener("click", () => {
        const rawUrl = syncInput.value.trim().replace(/\/+$/, "");
        if (!rawUrl) {
          alert("Please enter your Local Backend Server URL (e.g. http://100.66.24.43:3001)");
          return;
        }
        syncBtn.textContent = "Connecting...";
        syncBtn.disabled = true;

        fetch(`${rawUrl}/api/companies`)
          .then(r => r.ok ? r.json() : Promise.reject("Failed to fetch"))
          .then(companies => {
            if (Array.isArray(companies) && companies.length > 0) {
              const updated = companies.map(c => ({
                ...c,
                serverUrl: c.serverUrl || rawUrl
              }));
              state.saveRegisteredCompanies(updated);
              state.setActiveCompanyId(updated[0].id);
              alert(`Successfully connected! Found ${updated.length} company: ${updated[0].name}`);
              renderLoginPanel(parent, onLoginSuccess);
            } else {
              alert("Server connected, but no companies were found in the database.");
            }
          })
          .catch(err => {
            alert(`Could not connect to server at ${rawUrl}. Please make sure server.js is running and accessible.`);
          })
          .finally(() => {
            syncBtn.textContent = "Connect & Sync";
            syncBtn.disabled = false;
          });
      });
    }
  }, 0);

  const form = document.createElement("form");
  form.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 25px;
  `;

  // Left Column fields
  const leftCol = document.createElement("div");
  leftCol.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

  const createInputRow = (labelText, id, type = "text", val = "") => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
    const label = document.createElement("label");
    label.style.cssText = `font-size: 0.8rem; font-weight: bold; color: #475569;`;
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.value = val;
    input.required = (id === "comp-name" || id === "comp-username" || id === "comp-password");
    input.style.cssText = `padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem;`;
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return { wrapper, input };
  };

  const { wrapper: nameRow, input: nameInput } = createInputRow("Company Name *", "comp-name");
  leftCol.appendChild(nameRow);

  const { wrapper: subNameRow, input: subNameInput } = createInputRow("Sub Name [Company Caption]", "comp-subname");
  leftCol.appendChild(subNameRow);

  // Address
  const addrWrapper = document.createElement("div");
  addrWrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  addrWrapper.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">Address *</label>
    <textarea id="comp-address" rows="3" required style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; resize: none;"></textarea>
  `;
  leftCol.appendChild(addrWrapper);

  const { wrapper: countryRow, input: countryInput } = createInputRow("Country", "comp-country", "text", "INDIA");
  leftCol.appendChild(countryRow);

  // State Select
  const stateWrapper = document.createElement("div");
  stateWrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  stateWrapper.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">State</label>
    <select id="comp-state" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155;">
      ${Object.keys(INDIAN_STATES_DISTRICTS).map(s => `<option value="${s}">${s}</option>`).join("")}
    </select>
  `;
  leftCol.appendChild(stateWrapper);

  // District Select
  const districtWrapper = document.createElement("div");
  districtWrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  districtWrapper.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">District</label>
    <select id="comp-district" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155;"></select>
  `;
  leftCol.appendChild(districtWrapper);

  const stateSelect = stateWrapper.querySelector("select");
  const districtSelect = districtWrapper.querySelector("select");

  const updateDistricts = (stateVal) => {
    const list = INDIAN_STATES_DISTRICTS[stateVal] || [];
    districtSelect.innerHTML = list.map(d => `<option value="${d}">${d}</option>`).join("");
  };

  stateSelect.addEventListener("change", (e) => {
    updateDistricts(e.target.value);
  });

  stateSelect.value = "KERALA";
  updateDistricts("KERALA");
  districtSelect.value = "Kannur";

  const { wrapper: phoneRow, input: phoneInput } = createInputRow("Phone 1", "comp-phone");
  leftCol.appendChild(phoneRow);

  const { wrapper: mobileRow, input: mobileInput } = createInputRow("Mobile", "comp-mobile");
  leftCol.appendChild(mobileRow);

  const { wrapper: emailRow, input: emailInput } = createInputRow("Email", "comp-email");
  leftCol.appendChild(emailRow);

  const { wrapper: pinRow, input: pinInput } = createInputRow("PinCode", "comp-pincode");
  leftCol.appendChild(pinRow);

  form.appendChild(leftCol);

  // Right Column fields
  const rightCol = document.createElement("div");
  rightCol.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

  const { wrapper: webRow, input: webInput } = createInputRow("Web Site", "comp-website", "text", "http://");
  rightCol.appendChild(webRow);

  const { wrapper: currRow, input: currInput } = createInputRow("Currency Name", "comp-currency", "text", "Rupees");
  rightCol.appendChild(currRow);

  // Financial Year Box
  const fyBox = document.createElement("div");
  fyBox.style.cssText = `
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 12px;
    background: #f1f5f9;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  fyBox.innerHTML = `
    <div style="font-weight: bold; font-size: 0.8rem; color: #1e3b8b;">Financial Year</div>
    <div style="display: flex; gap: 10px;">
      <div style="flex-grow:1;">
        <label style="font-size:0.75rem; font-weight:bold; color:#475569;">Starts from</label>
        <input type="date" id="comp-fy-start" value="2026-04-01" style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem;">
      </div>
      <div style="flex-grow:1;">
        <label style="font-size:0.75rem; font-weight:bold; color:#475569;">Ends on</label>
        <input type="date" id="comp-fy-end" value="2027-03-31" style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem;">
      </div>
    </div>
  `;
  rightCol.appendChild(fyBox);

  const taxRow = document.createElement("div");
  taxRow.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  taxRow.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">Tax Applicable</label>
    <select id="comp-taxapp" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155;">
      <option value="GST(Goods and Service TAX)" selected>GST(Goods and Service TAX)</option>
      <option value="UNREGISTERED">UNREGISTERED</option>
    </select>
  `;
  rightCol.appendChild(taxRow);

  const { wrapper: gstinRow, input: gstinInput } = createInputRow("GSTIN", "comp-gstin");
  gstinInput.maxLength = 15;
  gstinInput.pattern = ".{15,15}";
  gstinInput.title = "GSTIN must be exactly 15 characters long.";

  // Restructure gstinRow input container to add Validate button and warning text
  const gstinFieldContainer = document.createElement("div");
  gstinFieldContainer.style.cssText = `display:flex; flex-direction:column; gap:2px;`;
  const gstinInputGroup = document.createElement("div");
  gstinInputGroup.style.cssText = `display:flex; gap:6px; align-items:center;`;
  
  gstinInput.style.flex = "1";
  const validateBtn = document.createElement("button");
  validateBtn.type = "button";
  validateBtn.id = "btn-validate-comp-gstin";
  validateBtn.textContent = "Validate";
  validateBtn.style.cssText = `padding: 5px 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem;`;

  const warningEl = document.createElement("small");
  warningEl.id = "comp-gstin-warning";
  warningEl.style.cssText = `color: #dc2626; font-weight: bold; font-size: 0.75rem; display: none;`;

  // Move gstinInput into input group along with validateBtn
  gstinRow.removeChild(gstinInput);
  gstinInputGroup.appendChild(gstinInput);
  gstinInputGroup.appendChild(validateBtn);
  gstinFieldContainer.appendChild(gstinInputGroup);
  gstinFieldContainer.appendChild(warningEl);
  gstinRow.appendChild(gstinFieldContainer);

  rightCol.appendChild(gstinRow);

  const { wrapper: fssaiRow, input: fssaiInput } = createInputRow("FSSAI Lic.No", "comp-fssai");
  rightCol.appendChild(fssaiRow);

  // Toggle GSTIN input enabling/disabling based on tax type select selection
  setTimeout(() => {
    const taxSelect = document.getElementById("comp-taxapp");
    const gstinEl = document.getElementById("comp-gstin");
    const validateBtnEl = document.getElementById("btn-validate-comp-gstin");
    const warningEl = document.getElementById("comp-gstin-warning");
    
    setupGstinInput(gstinEl, validateBtnEl, warningEl);

    const updateGstinState = () => {
      if (taxSelect.value === "UNREGISTERED") {
        gstinEl.value = "";
        gstinEl.disabled = true;
        validateBtnEl.disabled = true;
        validateBtnEl.style.opacity = "0.5";
        validateBtnEl.style.cursor = "not-allowed";
        gstinEl.removeAttribute("required");
        warningEl.style.display = "none";
      } else {
        gstinEl.disabled = false;
        validateBtnEl.disabled = false;
        validateBtnEl.style.opacity = "1";
        validateBtnEl.style.cursor = "pointer";
        gstinEl.setAttribute("required", "required");
      }
    };
    taxSelect.addEventListener("change", updateGstinState);
    updateGstinState();
  }, 0);

  // Add credentials settings for newly created company admin
  const { wrapper: userRow, input: userInput } = createInputRow("Admin Username *", "comp-username", "text", "admin");
  rightCol.appendChild(userRow);

  const { wrapper: passRow, input: passInput } = createInputRow("Admin Password *", "comp-password", "password", "123");
  rightCol.appendChild(passRow);

  const { wrapper: serverUrlRow, input: serverUrlInput } = createInputRow("Local Backend Server URL (Optional)", "comp-serverurl", "text", "");
  serverUrlInput.placeholder = "e.g. http://192.168.1.10:3001 or https://compa.tunnel.com";
  rightCol.appendChild(serverUrlRow);

  form.appendChild(rightCol);

  // Footer Buttons Row
  const footer = document.createElement("div");
  footer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 15px 25px 25px 25px;
    border-top: 1px solid #e2e8f0;
  `;

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.style.cssText = `
    padding: 8px 30px;
    background: #1e3b8b;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.9rem;
  `;
  saveBtn.textContent = "Save";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.style.cssText = `
    padding: 8px 25px;
    background: #cbd5e1;
    color: #334155;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.9rem;
  `;
  closeBtn.textContent = "Close";

  // Prevent close if it's first time database setup
  if (isFirstTime) {
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.5";
    closeBtn.style.cursor = "not-allowed";
  }

  closeBtn.addEventListener("click", () => {
    renderLoginPanel(parent, onLoginSuccess);
  });

  footer.appendChild(saveBtn);
  footer.appendChild(closeBtn);
  form.appendChild(footer);
  infoBox.appendChild(form);

  // Submit Handler
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!nameInput.value.trim()) {
      alert("Company Name is required!");
      return;
    }
    const compAddress = document.getElementById("comp-address").value.trim();
    if (!compAddress) {
      alert("Address is required!");
      return;
    }

    const gstinValue = gstinInput.value.trim().toUpperCase();
    if (document.getElementById("comp-taxapp").value !== "UNREGISTERED") {
      const gstinCheck = validateGstinOnSubmit(gstinValue);
      if (!gstinCheck.valid) {
        alert(gstinCheck.message);
        return;
      }
    }
    const cData = {
      name: nameInput.value.trim(),
      subName: subNameInput.value.trim(),
      address: compAddress,
      country: countryInput.value.trim(),
      state: stateSelect.value,
      district: districtSelect.value,
      phone: phoneInput.value.trim(),
      mobile: mobileInput.value.trim(),
      email: emailInput.value.trim(),
      pincode: pinInput.value.trim(),
      website: webInput.value.trim(),
      currencyName: currInput.value.trim(),
      financialYearStarts: document.getElementById("comp-fy-start").value,
      financialYearEnds: document.getElementById("comp-fy-end").value,
      taxApplicable: document.getElementById("comp-taxapp").value,
      gstin: gstinInput.value.trim(),
      fssaiLicNo: fssaiInput.value.trim(),
      username: userInput.value.trim(),
      password: passInput.value,
      serverUrl: (() => {
        let url = serverUrlInput.value.trim();
        if (!url) {
          const comps = state.getRegisteredCompanies();
          const match = comps.find(c => c.serverUrl);
          if (match) url = match.serverUrl;
        }
        return url;
      })()
    };

    const newCompany = state.createCompany(cData);
    alert(`Company "${newCompany.name}" created successfully!`);
    
    // Automatically set as active and log in
    state.setActiveCompanyId(newCompany.id);
    state.setLoginDate(new Date().toISOString().split("T")[0]);
    state.loadState();
    onLoginSuccess();
  });

  parent.appendChild(infoBox);
}

export function showEditCompanyModal(modalContainer, onSaveSuccess) {
  console.log("showEditCompanyModal called with container:", modalContainer);
  const activeId = state.getActiveCompanyId();
  console.log("activeId:", activeId);
  if (!activeId) return;

  const companies = state.getRegisteredCompanies();
  console.log("companies in storage:", companies);
  const company = companies.find(c => c.id === activeId);
  console.log("company matches activeId:", company);
  if (!company) return;

  // Remove any existing modal instance first
  const existingModal = document.getElementById("edit-company-modal");
  if (existingModal) existingModal.remove();

  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay active blocking-modal";
  modalOverlay.id = "edit-company-modal";
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(2px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999999;
    pointer-events: auto;
  `;

  const infoBox = document.createElement("div");
  infoBox.className = "modal-container";
  infoBox.style.cssText = `
    width: 800px;
    max-width: 95vw;
    max-height: 90vh;
    background: #f8fafc;
    border: 2px solid #1e3b8b;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    overflow-y: auto;
    color: #1e293b;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    pointer-events: auto;
    position: relative;
    z-index: 1000000;
  `;

  const closeModal = () => {
    document.removeEventListener("keydown", handleEscKey);
    modalOverlay.remove();
  };

  const handleEscKey = (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  };
  document.addEventListener("keydown", handleEscKey);

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  const header = document.createElement("div");
  header.style.cssText = `
    background: #1e3b8b;
    color: white;
    padding: 10px 15px;
    font-size: 1.25rem;
    font-weight: bold;
    letter-spacing: 0.5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `
    <span>Edit Company Information</span>
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font-size:0.9rem; font-weight:normal; background:rgba(255,255,255,0.15); padding:2px 8px; border-radius:4px;">Company ID : ${company.id}</span>
      <button type="button" id="btn-edit-comp-close-x" style="background:transparent; border:none; color:white; font-size:1.3rem; font-weight:bold; cursor:pointer; padding:0 6px; line-height:1;" title="Close Window">&times;</button>
    </div>
  `;
  infoBox.appendChild(header);

  const form = document.createElement("form");
  form.noValidate = true;
  form.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 25px;
  `;

  const leftCol = document.createElement("div");
  leftCol.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

  const createInputRow = (labelText, id, type = "text", val = "") => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
    const label = document.createElement("label");
    label.style.cssText = `font-size: 0.8rem; font-weight: bold; color: #475569;`;
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.value = val;
    input.style.cssText = `padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; pointer-events: auto;`;
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return { wrapper, input };
  };

  const { wrapper: nameRow, input: nameInput } = createInputRow("Company Name *", "edit-comp-name", "text", company.name);
  leftCol.appendChild(nameRow);

  const { wrapper: subNameRow, input: subNameInput } = createInputRow("Sub Name [Company Caption]", "edit-comp-subname", "text", company.subName || "");
  leftCol.appendChild(subNameRow);

  const addrWrapper = document.createElement("div");
  addrWrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  const addrLabel = document.createElement("label");
  addrLabel.style.cssText = `font-size: 0.8rem; font-weight: bold; color: #475569;`;
  addrLabel.textContent = "Address *";
  const addrTextarea = document.createElement("textarea");
  addrTextarea.id = "edit-comp-address";
  addrTextarea.rows = 3;
  addrTextarea.required = true;
  addrTextarea.value = company.address || "";
  addrTextarea.style.cssText = `padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; resize: none; pointer-events: auto;`;
  addrWrapper.appendChild(addrLabel);
  addrWrapper.appendChild(addrTextarea);
  leftCol.appendChild(addrWrapper);

  const { wrapper: countryRow, input: countryInput } = createInputRow("Country", "edit-comp-country", "text", company.country || "INDIA");
  leftCol.appendChild(countryRow);

  // State Select
  const stateWrapper = document.createElement("div");
  stateWrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  stateWrapper.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">State</label>
    <select id="edit-comp-state" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155; pointer-events: auto;">
      ${Object.keys(INDIAN_STATES_DISTRICTS).map(s => `<option value="${s}">${s}</option>`).join("")}
    </select>
  `;
  leftCol.appendChild(stateWrapper);

  // District Select
  const districtWrapper = document.createElement("div");
  districtWrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  districtWrapper.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">District</label>
    <select id="edit-comp-district" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155; pointer-events: auto;"></select>
  `;
  leftCol.appendChild(districtWrapper);

  const stateSelect = stateWrapper.querySelector("select");
  const districtSelect = districtWrapper.querySelector("select");

  const updateDistricts = (stateVal) => {
    const list = INDIAN_STATES_DISTRICTS[stateVal] || [];
    districtSelect.innerHTML = list.map(d => `<option value="${d}">${d}</option>`).join("");
  };

  stateSelect.addEventListener("change", (e) => {
    updateDistricts(e.target.value);
  });

  const currentCompanyState = (company.state || "KERALA").toUpperCase();
  if (INDIAN_STATES_DISTRICTS[currentCompanyState]) {
    stateSelect.value = currentCompanyState;
    updateDistricts(currentCompanyState);
    districtSelect.value = company.district || "";
  } else {
    stateSelect.value = "KERALA";
    updateDistricts("KERALA");
  }

  const { wrapper: phoneRow, input: phoneInput } = createInputRow("Phone 1", "edit-comp-phone", "text", company.phone || "");
  leftCol.appendChild(phoneRow);

  const { wrapper: mobileRow, input: mobileInput } = createInputRow("Mobile", "edit-comp-mobile", "text", company.mobile || "");
  leftCol.appendChild(mobileRow);

  const { wrapper: emailRow, input: emailInput } = createInputRow("Email", "edit-comp-email", "text", company.email || "");
  leftCol.appendChild(emailRow);

  const { wrapper: pinRow, input: pinInput } = createInputRow("PinCode", "edit-comp-pincode", "text", company.pincode || "");
  leftCol.appendChild(pinRow);

  form.appendChild(leftCol);

  const rightCol = document.createElement("div");
  rightCol.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

  const { wrapper: webRow, input: webInput } = createInputRow("Web Site", "edit-comp-website", "text", company.website || "http://");
  rightCol.appendChild(webRow);

  const { wrapper: currRow, input: currInput } = createInputRow("Currency Name", "edit-comp-currency", "text", company.currencyName || "Rupees");
  rightCol.appendChild(currRow);

  // Financial Year Box
  const compFysList = company.financialYears || [];
  const compActiveFyId = state.getActiveFyId();
  const compActiveFyObj = compFysList.find(f => f.id === compActiveFyId) || (compFysList[0] || { startDate: company.financialYearStarts || '2026-04-01', endDate: company.financialYearEnds || '2027-03-31' });

  const fyBox = document.createElement("div");
  fyBox.style.cssText = `
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 12px;
    background: #f1f5f9;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  fyBox.innerHTML = `
    <div style="font-weight: bold; font-size: 0.8rem; color: #1e3b8b; display:flex; justify-content:space-between; align-items:center;">
      <span>Financial Year Dates</span>
      <span style="font-size:0.75rem; color:#64748b; font-weight:normal;">Edit Starting & Ending Dates</span>
    </div>
    ${compFysList.length > 1 ? `
      <div>
        <label style="font-size:0.75rem; font-weight:bold; color:#475569;">Select Financial Year</label>
        <select id="edit-comp-fy-select" style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; background:white; color:#334155; margin-top:2px; pointer-events:auto;">
          ${compFysList.map(fy => `
            <option value="${fy.id}" ${fy.id === compActiveFyId ? 'selected' : ''}>
              ${state.getFyDisplayLabel(fy)} (${fy.startDate ? fy.startDate.split('-').reverse().join('/') : 'N/A'} to ${fy.endDate ? fy.endDate.split('-').reverse().join('/') : 'N/A'})${fy.id === compActiveFyId ? ' [ACTIVE]' : ''}
            </option>
          `).join('')}
        </select>
      </div>
    ` : ''}
    <div style="display: flex; gap: 10px;">
      <div style="flex-grow:1;">
        <label style="font-size:0.75rem; font-weight:bold; color:#475569;">Starts from *</label>
        <input type="date" id="edit-comp-fy-start" value="${compActiveFyObj.startDate || company.financialYearStarts || '2026-04-01'}" required style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; pointer-events:auto;">
      </div>
      <div style="flex-grow:1;">
        <label style="font-size:0.75rem; font-weight:bold; color:#475569;">Ends on *</label>
        <input type="date" id="edit-comp-fy-end" value="${compActiveFyObj.endDate || company.financialYearEnds || '2027-03-31'}" required style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; pointer-events:auto;">
      </div>
    </div>
  `;
  rightCol.appendChild(fyBox);

  setTimeout(() => {
    const fySelectEl = document.getElementById("edit-comp-fy-select");
    const fyStartInput = document.getElementById("edit-comp-fy-start");
    const fyEndInput = document.getElementById("edit-comp-fy-end");
    if (fySelectEl) {
      fySelectEl.addEventListener("change", (e) => {
        const selected = compFysList.find(f => f.id === e.target.value);
        if (selected) {
          if (fyStartInput && selected.startDate) fyStartInput.value = selected.startDate;
          if (fyEndInput && selected.endDate) fyEndInput.value = selected.endDate;
        }
      });
    }
  }, 0);

  const taxRow = document.createElement("div");
  taxRow.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  const isGstSelected = (company.taxApplicable || "GST(Goods and Service TAX)") === "GST(Goods and Service TAX)";
  taxRow.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">Tax Applicable</label>
    <select id="edit-comp-taxapp" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155; pointer-events: auto;">
      <option value="GST(Goods and Service TAX)" ${isGstSelected ? 'selected' : ''}>GST(Goods and Service TAX)</option>
      <option value="UNREGISTERED" ${!isGstSelected ? 'selected' : ''}>UNREGISTERED</option>
    </select>
  `;
  rightCol.appendChild(taxRow);

  const { wrapper: gstinRow, input: gstinInput } = createInputRow("GSTIN", "edit-comp-gstin", "text", company.gstin || "");
  gstinInput.maxLength = 15;

  const gstinFieldContainer = document.createElement("div");
  gstinFieldContainer.style.cssText = `display:flex; flex-direction:column; gap:2px;`;
  const gstinInputGroup = document.createElement("div");
  gstinInputGroup.style.cssText = `display:flex; gap:6px; align-items:center;`;
  
  gstinInput.style.flex = "1";
  const validateBtn = document.createElement("button");
  validateBtn.type = "button";
  validateBtn.id = "btn-validate-edit-comp-gstin";
  validateBtn.textContent = "Validate";
  validateBtn.style.cssText = `padding: 5px 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem; pointer-events: auto;`;

  const warningEl = document.createElement("small");
  warningEl.id = "edit-comp-gstin-warning";
  warningEl.style.cssText = `color: #dc2626; font-weight: bold; font-size: 0.75rem; display: none;`;

  gstinRow.removeChild(gstinInput);
  gstinInputGroup.appendChild(gstinInput);
  gstinInputGroup.appendChild(validateBtn);
  gstinFieldContainer.appendChild(gstinInputGroup);
  gstinFieldContainer.appendChild(warningEl);
  gstinRow.appendChild(gstinFieldContainer);

  rightCol.appendChild(gstinRow);

  const { wrapper: fssaiRow, input: fssaiInput } = createInputRow("FSSAI Lic.No", "edit-comp-fssai", "text", company.fssaiLicNo || "");
  rightCol.appendChild(fssaiRow);

  setTimeout(() => {
    const taxSelect = document.getElementById("edit-comp-taxapp");
    const gstinEl = document.getElementById("edit-comp-gstin");
    const validateBtnEl = document.getElementById("btn-validate-edit-comp-gstin");
    const warningEl = document.getElementById("edit-comp-gstin-warning");
    
    setupGstinInput(gstinEl, validateBtnEl, warningEl);

    const updateGstinState = () => {
      if (taxSelect.value === "UNREGISTERED") {
        gstinEl.value = "";
        gstinEl.disabled = true;
        validateBtnEl.disabled = true;
        validateBtnEl.style.opacity = "0.5";
        validateBtnEl.style.cursor = "not-allowed";
        gstinEl.removeAttribute("required");
        gstinEl.removeAttribute("pattern");
        warningEl.style.display = "none";
      } else {
        gstinEl.disabled = false;
        validateBtnEl.disabled = false;
        validateBtnEl.style.opacity = "1";
        validateBtnEl.style.cursor = "pointer";
      }
    };
    taxSelect.addEventListener("change", updateGstinState);
    updateGstinState();
  }, 0);

  // Add credentials
  const { wrapper: userRow, input: userInput } = createInputRow("Admin Username *", "edit-comp-username", "text", company.username || "admin");
  rightCol.appendChild(userRow);

  const { wrapper: passRow, input: passInput } = createInputRow("Admin Password *", "edit-comp-password", "password", company.password || "123");
  rightCol.appendChild(passRow);

  const { wrapper: serverUrlRow, input: serverUrlInput } = createInputRow("Local Backend Server URL (Optional)", "edit-comp-serverurl", "text", company.serverUrl || "");
  serverUrlInput.placeholder = "e.g. http://192.168.1.10:3001 or https://compa.tunnel.com";
  rightCol.appendChild(serverUrlRow);

  form.appendChild(rightCol);

  const footer = document.createElement("div");
  footer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 15px 25px 25px 25px;
    border-top: 1px solid #e2e8f0;
  `;

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.style.cssText = `
    padding: 8px 30px;
    background: #1e3b8b;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.9rem;
    pointer-events: auto;
  `;
  saveBtn.textContent = "Save";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.style.cssText = `
    padding: 8px 25px;
    background: #cbd5e1;
    color: #334155;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.9rem;
    pointer-events: auto;
  `;
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });

  const headerCloseBtn = header.querySelector("#btn-edit-comp-close-x");
  if (headerCloseBtn) {
    headerCloseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }

  footer.appendChild(saveBtn);
  footer.appendChild(closeBtn);
  form.appendChild(footer);
  infoBox.appendChild(form);
  modalOverlay.appendChild(infoBox);

  const targetContainer = modalContainer || document.getElementById("modal-container-root") || document.body;
  targetContainer.appendChild(modalOverlay);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const newName = nameInput.value.trim();
    if (!newName) {
      alert("Company Name is required!");
      return;
    }

    const editAddress = addrTextarea.value.trim();
    if (!editAddress) {
      alert("Address is required!");
      return;
    }

    const newUsername = userInput.value.trim();
    const newPassword = passInput.value;
    if (!newUsername || !newPassword) {
      alert("Admin Username and Password are required!");
      return;
    }

    const gstinValue = gstinInput.value.trim().toUpperCase();
    if (document.getElementById("edit-comp-taxapp").value !== "UNREGISTERED" && gstinValue) {
      const gstinCheck = validateGstinOnSubmit(gstinValue);
      if (!gstinCheck.valid) {
        alert(gstinCheck.message);
        return;
      }
    }

    const registry = state.getRegisteredCompanies();
    const idx = registry.findIndex(c => String(c.id) === String(activeId));
    if (idx !== -1) {
      const newFyStart = document.getElementById("edit-comp-fy-start").value;
      const newFyEnd = document.getElementById("edit-comp-fy-end").value;
      const targetFySelect = document.getElementById("edit-comp-fy-select");
      const targetFyId = targetFySelect ? targetFySelect.value : compActiveFyId;

      if (!newFyStart || !newFyEnd) {
        alert("Please provide both starting and ending dates for the financial year.");
        return;
      }

      if (newFyStart > newFyEnd) {
        alert("Financial Year Starting Date cannot be after the Ending Date!");
        return;
      }

      let updatedFys = registry[idx].financialYears || [];
      if (updatedFys.length > 0) {
        const fyMatch = updatedFys.find(f => String(f.id) === String(targetFyId));
        if (fyMatch) {
          fyMatch.startDate = newFyStart;
          fyMatch.endDate = newFyEnd;
        }
      } else {
        updatedFys = [{
          id: "default",
          name: "Current F.Y",
          startDate: newFyStart,
          endDate: newFyEnd
        }];
      }

      registry[idx] = {
        ...registry[idx],
        name: newName,
        subName: subNameInput.value.trim(),
        address: editAddress,
        country: countryInput.value.trim(),
        state: stateSelect.value,
        district: districtSelect.value,
        phone: phoneInput.value.trim(),
        mobile: mobileInput.value.trim(),
        email: emailInput.value.trim(),
        pincode: pinInput.value.trim(),
        website: webInput.value.trim(),
        currencyName: currInput.value.trim(),
        financialYearStarts: newFyStart,
        financialYearEnds: newFyEnd,
        financialYears: updatedFys,
        taxApplicable: document.getElementById("edit-comp-taxapp").value,
        gstin: document.getElementById("edit-comp-taxapp").value === "UNREGISTERED" ? "" : gstinValue,
        fssaiLicNo: fssaiInput.value.trim(),
        username: newUsername,
        password: newPassword,
        serverUrl: serverUrlInput.value.trim()
      };

      state.saveRegisteredCompanies(registry);
      
      if (String(activeId) === String(state.getActiveCompanyId())) {
        state.loadState();
        state.notifyListeners();
      }

      alert("Company details updated successfully!");
      closeModal();
      if (onSaveSuccess) onSaveSuccess();
    }
  });
}
