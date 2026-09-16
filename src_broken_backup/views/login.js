import { state } from "../state.js";

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
  parent.innerHTML = "";
  const companies = state.getRegisteredCompanies();

  // If no companies, force company creation
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
  usernameInput.value = "admin";
  usernameInput.style.cssText = `
    padding: 6px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 0.9rem;
  `;

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.value = "123";
  passwordInput.style.cssText = `
    padding: 6px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 0.9rem;
  `;

  const dateInput = document.createElement("input");
  dateInput.type = "text";
  dateInput.readOnly = true;
  dateInput.value = formatLoginDate(new Date());
  dateInput.style.cssText = `
    padding: 6px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 0.9rem;
    background: #e2e8f0;
    cursor: default;
  `;

  rightCol.appendChild(createFormRow("Company", companySelect));
  rightCol.appendChild(createFormRow("User Name", usernameInput));
  rightCol.appendChild(createFormRow("Password", passwordInput));
  rightCol.appendChild(createFormRow("Login Date", dateInput));

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
    const selectedComp = companies.find(c => c.id === compId);
    if (!selectedComp) return;

    if (usernameInput.value.trim() === selectedComp.username && passwordInput.value === selectedComp.password) {
      state.setActiveCompanyId(compId);
      state.setLoginDate(new Date().toISOString().split("T")[0]);
      await state.syncFromServer();
      await state.loadState();
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
  });

  btnRow.appendChild(okBtn);
  btnRow.appendChild(cancelBtn);
  rightCol.appendChild(btnRow);

  body.appendChild(rightCol);
  loginBox.appendChild(body);
  parent.appendChild(loginBox);
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
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">Address</label>
    <textarea id="comp-address" rows="3" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; resize: none;"></textarea>
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

  const { wrapper: dlRow, input: dlInput } = createInputRow("D. L. No. 1", "comp-dl");
  leftCol.appendChild(dlRow);

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

  const { wrapper: mainRow, input: mainInput } = createInputRow("Maintain", "comp-maintain", "text", "Inventory with Accounts");
  rightCol.appendChild(mainRow);

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
  rightCol.appendChild(gstinRow);

  const { wrapper: fssaiRow, input: fssaiInput } = createInputRow("FSSAI Lic.No", "comp-fssai");
  rightCol.appendChild(fssaiRow);

  // Toggle GSTIN input enabling/disabling based on tax type select selection
  setTimeout(() => {
    const taxSelect = document.getElementById("comp-taxapp");
    const gstinEl = document.getElementById("comp-gstin");
    const updateGstinState = () => {
      if (taxSelect.value === "UNREGISTERED") {
        gstinEl.value = "";
        gstinEl.disabled = true;
        gstinEl.removeAttribute("required");
      } else {
        gstinEl.disabled = false;
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
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!nameInput.value.trim()) {
      alert("Company Name is required!");
      return;
    }
    const cData = {
      name: nameInput.value.trim(),
      subName: subNameInput.value.trim(),
      address: document.getElementById("comp-address").value.trim(),
      country: countryInput.value.trim(),
      state: stateSelect.value,
      district: districtSelect.value,
      phone: phoneInput.value.trim(),
      mobile: mobileInput.value.trim(),
      email: emailInput.value.trim(),
      dlNo: dlInput.value.trim(),
      pincode: pinInput.value.trim(),
      website: webInput.value.trim(),
      currencyName: currInput.value.trim(),
      financialYearStarts: document.getElementById("comp-fy-start").value,
      financialYearEnds: document.getElementById("comp-fy-end").value,
      maintain: mainInput.value.trim(),
      taxApplicable: document.getElementById("comp-taxapp").value,
      gstin: gstinInput.value.trim(),
      fssaiLicNo: fssaiInput.value.trim(),
      username: userInput.value.trim(),
      password: passInput.value
    };

    const newCompany = state.createCompany(cData);
    alert(`Company "${newCompany.name}" created successfully!`);
    
    // Automatically set as active and log in
    state.setActiveCompanyId(newCompany.id);
    state.setLoginDate(new Date().toISOString().split("T")[0]);
    await state.syncFromServer();
    await state.loadState();
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

  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay active";
  modalOverlay.id = "edit-company-modal";
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  `;

  const infoBox = document.createElement("div");
  infoBox.style.cssText = `
    width: 800px;
    background: #f8fafc;
    border: 2px solid #1e3b8b;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    overflow: hidden;
    color: #1e293b;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
    <span>Edit Company Information</span>
    <span style="font-size:0.95rem; font-weight:normal; background:rgba(255,255,255,0.15); padding:2px 8px; border-radius:4px;">Company ID : ${company.id}</span>
  `;
  infoBox.appendChild(header);

  const form = document.createElement("form");
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
    input.required = (id === "edit-comp-name" || id === "edit-comp-username" || id === "edit-comp-password");
    input.style.cssText = `padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem;`;
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
  addrWrapper.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">Address</label>
    <textarea id="edit-comp-address" rows="3" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; resize: none;"></textarea>
  `;
  leftCol.appendChild(addrWrapper);

  const { wrapper: countryRow, input: countryInput } = createInputRow("Country", "edit-comp-country", "text", company.country || "INDIA");
  leftCol.appendChild(countryRow);

  // State Select
  const stateWrapper = document.createElement("div");
  stateWrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  stateWrapper.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">State</label>
    <select id="edit-comp-state" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155;">
      ${Object.keys(INDIAN_STATES_DISTRICTS).map(s => `<option value="${s}">${s}</option>`).join("")}
    </select>
  `;
  leftCol.appendChild(stateWrapper);

  // District Select
  const districtWrapper = document.createElement("div");
  districtWrapper.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  districtWrapper.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">District</label>
    <select id="edit-comp-district" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155;"></select>
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

  const { wrapper: dlRow, input: dlInput } = createInputRow("D. L No.1", "edit-comp-dl", "text", company.dlNo || "");
  leftCol.appendChild(dlRow);

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
        <input type="date" id="edit-comp-fy-start" value="${company.financialYearStarts || '2026-04-01'}" style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem;">
      </div>
      <div style="flex-grow:1;">
        <label style="font-size:0.75rem; font-weight:bold; color:#475569;">Ends on</label>
        <input type="date" id="edit-comp-fy-end" value="${company.financialYearEnds || '2027-03-31'}" style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem;">
      </div>
    </div>
  `;
  rightCol.appendChild(fyBox);

  const { wrapper: mainRow, input: mainInput } = createInputRow("Maintain", "edit-comp-maintain", "text", company.maintain || "Inventory with Accounts");
  rightCol.appendChild(mainRow);

  const taxRow = document.createElement("div");
  taxRow.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  const isGstSelected = (company.taxApplicable || "GST(Goods and Service TAX)") === "GST(Goods and Service TAX)";
  taxRow.innerHTML = `
    <label style="font-size: 0.8rem; font-weight: bold; color: #475569;">Tax Applicable</label>
    <select id="edit-comp-taxapp" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem; background: white; color: #334155;">
      <option value="GST(Goods and Service TAX)" ${isGstSelected ? 'selected' : ''}>GST(Goods and Service TAX)</option>
      <option value="UNREGISTERED" ${!isGstSelected ? 'selected' : ''}>UNREGISTERED</option>
    </select>
  `;
  rightCol.appendChild(taxRow);

  const { wrapper: gstinRow, input: gstinInput } = createInputRow("GSTIN", "edit-comp-gstin", "text", company.gstin || "");
  gstinInput.maxLength = 15;
  gstinInput.pattern = ".{15,15}";
  gstinInput.title = "GSTIN must be exactly 15 characters long.";
  rightCol.appendChild(gstinRow);

  const { wrapper: fssaiRow, input: fssaiInput } = createInputRow("FSSAI Lic.No", "edit-comp-fssai", "text", company.fssaiLicNo || "");
  rightCol.appendChild(fssaiRow);

  // Toggle GSTIN input enabling/disabling based on tax type select selection in edit modal
  setTimeout(() => {
    const taxSelect = document.getElementById("edit-comp-taxapp");
    const gstinEl = document.getElementById("edit-comp-gstin");
    const updateGstinState = () => {
      if (taxSelect.value === "UNREGISTERED") {
        gstinEl.value = "";
        gstinEl.disabled = true;
        gstinEl.removeAttribute("required");
      } else {
        gstinEl.disabled = false;
        gstinEl.setAttribute("required", "required");
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

  form.appendChild(rightCol);

  // Set Address
  setTimeout(() => {
    const txt = document.getElementById("edit-comp-address");
    if (txt) txt.value = company.address || "";
  }, 0);

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
  closeBtn.addEventListener("click", () => {
    modalOverlay.remove();
  });

  footer.appendChild(saveBtn);
  footer.appendChild(closeBtn);
  form.appendChild(footer);
  infoBox.appendChild(form);
  modalOverlay.appendChild(infoBox);
  modalContainer.appendChild(modalOverlay);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!nameInput.value.trim()) return;

    const registry = state.getRegisteredCompanies();
    const idx = registry.findIndex(c => c.id === activeId);
    if (idx !== -1) {
      registry[idx] = {
        ...registry[idx],
        name: nameInput.value.trim(),
        subName: subNameInput.value.trim(),
        address: document.getElementById("edit-comp-address").value.trim(),
        country: countryInput.value.trim(),
        state: stateSelect.value,
        district: districtSelect.value,
        phone: phoneInput.value.trim(),
        mobile: mobileInput.value.trim(),
        email: emailInput.value.trim(),
        dlNo: dlInput.value.trim(),
        pincode: pinInput.value.trim(),
        website: webInput.value.trim(),
        currencyName: currInput.value.trim(),
        financialYearStarts: document.getElementById("edit-comp-fy-start").value,
        financialYearEnds: document.getElementById("edit-comp-fy-end").value,
        maintain: mainInput.value.trim(),
        taxApplicable: document.getElementById("edit-comp-taxapp").value,
        gstin: gstinInput.value.trim(),
        fssaiLicNo: fssaiInput.value.trim(),
        username: userInput.value.trim(),
        password: passInput.value
      };
      state.saveRegisteredCompanies(registry);
      alert("Company details updated successfully!");
      modalOverlay.remove();
      if (onSaveSuccess) onSaveSuccess();
    }
  });
}
