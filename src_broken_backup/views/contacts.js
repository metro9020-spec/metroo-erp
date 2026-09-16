import { state } from "../state.js";
import { renderCurrentView } from "../main.js";

let searchContactFilter = "";
let activeContactTypeFilter = "all";

export function setContactTypeFilter(type) {
  activeContactTypeFilter = type;
}

export function renderContacts(container) {
  const contacts = state.getContacts();

  // Metrics calculations
  const customers = contacts.filter(c => c.type === "customer" || c.listInCustomerList === true);
  const suppliers = contacts.filter(c => c.type === "supplier" || c.listInVendorList === true);

  const totalReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  const totalPayables = suppliers.reduce((sum, c) => sum + Math.abs(Math.min(0, c.balance || 0)), 0);

  const filteredContacts = contacts.filter(c => {
    const term = searchContactFilter.trim().toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(term) || (c.contactPerson && c.contactPerson.toLowerCase().includes(term));
    if (activeContactTypeFilter === "all") return matchesSearch;
    if (activeContactTypeFilter === "customer") return matchesSearch && (c.type === "customer" || c.listInCustomerList === true);
    if (activeContactTypeFilter === "supplier") return matchesSearch && (c.type === "supplier" || c.listInVendorList === true);
    return matchesSearch;
  });

  container.innerHTML = `
    <!-- Top Stats Panel -->
    <div class="metrics-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:12px;">
      <div class="metric-card" style="background:#1e293b; color:white; padding:12px; border-radius:4px; border-left:4px solid #3b82f6;">
        <span style="font-size:0.75rem; color:#94a3b8; display:block; font-weight:bold; text-transform:uppercase;">ACTIVE CUSTOMERS</span>
        <strong style="font-size:1.5rem; display:block; margin-top:4px;">${customers.length}</strong>
      </div>
      <div class="metric-card" style="background:#1e293b; color:white; padding:12px; border-radius:4px; border-left:4px solid #10b981;">
        <span style="font-size:0.75rem; color:#94a3b8; display:block; font-weight:bold; text-transform:uppercase;">ACTIVE SUPPLIERS</span>
        <strong style="font-size:1.5rem; display:block; margin-top:4px;">${suppliers.length}</strong>
      </div>
      <div class="metric-card" style="background:#1e293b; color:white; padding:12px; border-radius:4px; border-left:4px solid #f59e0b;">
        <span style="font-size:0.75rem; color:#94a3b8; display:block; font-weight:bold; text-transform:uppercase;">ACCOUNTS RECEIVABLE</span>
        <strong style="font-size:1.3rem; display:block; margin-top:4px; color:#f59e0b;">₹${totalReceivables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
      </div>
      <div class="metric-card" style="background:#1e293b; color:white; padding:12px; border-radius:4px; border-left:4px solid #ef4444;">
        <span style="font-size:0.75rem; color:#94a3b8; display:block; font-weight:bold; text-transform:uppercase;">ACCOUNTS PAYABLE</span>
        <strong style="font-size:1.3rem; display:block; margin-top:4px; color:#ef4444;">₹${totalPayables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
      </div>
    </div>

    <!-- Toolbar -->
    <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:8px; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:12px;">
      <div style="display:flex; gap:10px; align-items:center;">
        <input type="text" id="search-contacts" class="form-control" placeholder="SEARCH DIRECTORY..." value="${searchContactFilter.toUpperCase()}" style="width: 250px; background-color:white; color:black; font-size:0.8rem; padding:4px 8px; border:1px solid #94a3b8;">
        <div style="display: flex; gap: 4px;">
          <button class="btn filter-type-btn ${activeContactTypeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" data-type="all" style="font-size:0.75rem; padding:4px 10px;">ALL</button>
          <button class="btn filter-type-btn ${activeContactTypeFilter === 'customer' ? 'btn-primary' : 'btn-secondary'}" data-type="customer" style="font-size:0.75rem; padding:4px 10px;">CUSTOMERS</button>
          <button class="btn filter-type-btn ${activeContactTypeFilter === 'supplier' ? 'btn-primary' : 'btn-secondary'}" data-type="supplier" style="font-size:0.75rem; padding:4px 10px;">SUPPLIERS</button>
        </div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-secondary" id="btn-global-payment" style="font-size:0.75rem;"><i class="fa-solid fa-cash-register"></i> RECORD PAYMENT</button>
        <button class="btn btn-primary" id="btn-add-customer" style="font-size:0.75rem;"><i class="fa-solid fa-user-plus"></i> ADD CUSTOMER</button>
        <button class="btn btn-success" id="btn-add-vendor" style="background-color:#10b981; border:none; color:white; font-size:0.75rem;"><i class="fa-solid fa-truck-field"></i> ADD VENDOR</button>
      </div>
    </div>

    <!-- Contacts Table Panel -->
    <div class="panel" style="padding: 10px; border: 1px solid #cbd5e1; background-color: white;">
      <div class="table-responsive">
        <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem;">
          <thead>
            <tr style="background-color:#1e293b; color:white; border-bottom:2px solid #475569;">
              <th style="padding:6px 10px;">CODE</th>
              <th style="padding:6px 10px;">CONTACT NAME</th>
              <th style="padding:6px 10px;">TYPE</th>
              <th style="padding:6px 10px;">CONTACT PERSON</th>
              <th style="padding:6px 10px;">PHONE / MOBILE</th>
              <th style="padding:6px 10px; text-align: right;">OUTSTANDING BALANCE</th>
              <th style="padding:6px 10px; text-align: center; width:120px;">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${filteredContacts.length === 0 ? `
              <tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px; font-weight:bold;">NO CONTACTS FOUND.</td></tr>
            ` : filteredContacts.map((c, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background-color:${idx % 2 === 0 ? '#f8fafc' : 'white'};">
                <td style="padding:6px 10px; font-weight:bold;"><code style="background-color:#f1f5f9; padding:2px; font-weight:700;">${c.id.toUpperCase()}</code></td>
                <td style="padding:6px 10px;"><strong>${c.name.toUpperCase()}</strong></td>
                <td style="padding:6px 10px;"><span class="badge ${c.type === 'supplier' ? 'secondary' : 'primary'}" style="font-size:0.7rem; font-weight:bold;">${c.type.toUpperCase()}</span></td>
                <td style="padding:6px 10px;">${(c.contactPerson || 'N/A').toUpperCase()}</td>
                <td style="padding:6px 10px;">${(c.mobile || c.phone || 'N/A').toUpperCase()}</td>
                <td style="padding:6px 10px; text-align: right; font-weight: bold; color:${c.balance >= 0 ? '#b45309' : '#dc2626'}">
                  ₹${Math.abs(c.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${c.balance >= 0 ? 'Dr' : 'Cr'}
                </td>
                <td style="padding:6px 10px; text-align: center;">
                  <button type="button" class="edit-contact-btn" data-id="${c.id}" style="background:none; border:none; color:#1e3b8b; cursor:pointer; font-weight:bold; font-size:0.75rem; margin-right:8px;">EDIT</button>
                  <button type="button" class="delete-contact-btn" data-id="${c.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:0.75rem;">DEL</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind UI Events
  const searchInput = document.getElementById("search-contacts");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchContactFilter = e.target.value.toUpperCase();
      renderContacts(container);
    });
  }

  container.querySelectorAll(".filter-type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeContactTypeFilter = btn.getAttribute("data-type");
      renderContacts(container);
    });
  });

  const addCustBtn = document.getElementById("btn-add-customer");
  if (addCustBtn) {
    addCustBtn.addEventListener("click", () => {
      showAddContactModal(container, null, "customer");
    });
  }

  const addVendBtn = document.getElementById("btn-add-vendor");
  if (addVendBtn) {
    addVendBtn.addEventListener("click", () => {
      showAddContactModal(container, null, "supplier");
    });
  }

  container.querySelectorAll(".edit-contact-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showEditContactModal(container, btn.getAttribute("data-id"));
    });
  });

  container.querySelectorAll(".delete-contact-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const c = contacts.find(item => item.id === id);
      if (c && confirm(`ARE YOU SURE YOU WANT TO PERMANENTLY DELETE PROFILE FOR "${c.name.toUpperCase()}"?`)) {
        try {
          state.deleteContact(id);
          renderContacts(container);
        } catch (err) {
          alert(err.message.toUpperCase());
        }
      }
    });
  });

  const globalPaymentBtn = document.getElementById("btn-global-payment");
  if (globalPaymentBtn) {
    globalPaymentBtn.addEventListener("click", () => {
      showRecordPaymentModal(container, null);
    });
  }
}

// -------------------------------------------------------------
// COMPREHENSIVE WINDOWS-STYLE CUSTOMER/VENDOR MASTER DIALOG
// -------------------------------------------------------------
export function showAddContactModal(targetRoot, onSuccess = null, forceType = "customer") {
  showContactMasterWindow(targetRoot, null, forceType, onSuccess);
}

export function showEditContactModal(targetRoot, contactId) {
  const contact = state.getContacts().find(c => c.id === contactId);
  if (!contact) return;
  showContactMasterWindow(targetRoot, contact, contact.type, null);
}

function showContactMasterWindow(targetRoot, contact = null, forceType = "customer", onSuccess = null) {
  const root = document.getElementById("modal-container-root");
  const isEdit = !!contact;
  const isCustomer = forceType === "customer";
  const windowTitle = isCustomer ? "CUSTOMER MASTER" : "VENDOR MASTER";

  // Prepopulated state database values
  const c = contact || {
    id: "",
    name: "",
    ledgerCode: "",
    nameInBill: "",
    groupName: isCustomer ? "SUNDRY DEBTORS" : "SUNDRY CREDITORS",
    type: forceType,
    billingAddress: "",
    phone: "",
    mobile: "",
    whatsApp: "",
    state: "KERALA",
    district: "KANNUR",
    area: "Aluva",
    fax: "",
    email: "",
    contactPerson: "",
    gstin: "",
    dlNo1: "",
    pincode: "",
    creditLimit: 0,
    creditPeriod: "",
    salesExecutive: "",
    openingBalance: 0,
    openingBalances: {},
    bankName: "",
    accountNo: "",
    ifsc: "",
    swiftCode: "",
    nameInCheque: "",
    siteType: "single",
    sites: []
  };

  const indianStatesDistricts = {
    "KERALA": ["ALAPPUZHA", "ERNAKULAM", "IDUKKI", "KANNUR", "KASARAGOD", "KOLLAM", "KOTTAYAM", "KOZHIKODE", "MALAPPURAM", "PALAKKAD", "PATHANAMTHITTA", "THIRUVANANTHAPURAM", "THRISSUR", "WAYANAD"],
    "ANDHRA PRADESH": ["ANANTAPUR", "CHITTOOR", "EAST GODAVARI", "GUNTUR", "KRISHNA", "KURNOOL", "NELLORE", "PRAKASAM", "SREEKULAM", "VISAKHAPATNAM", "VIZIANAGARAM", "WEST GODAVARI", "YSR KADAPA"],
    "ARUNACHAL PRADESH": ["CHANGBLANG", "DIBANG VALLEY", "EAST KAMENG", "EAST SIANG", "KURUNG KUMEY", "LOHIT", "LONGDING", "LOWER DIBANG VALLEY", "LOWER SUBANSIRI", "NAMSAI", "PAPUM PARE", "TAWANG", "TIRAP", "UPPER SIANG", "UPPER SUBANSIRI", "WEST KAMENG", "WEST SIANG"],
    "ASSAM": ["BAKSA", "BARPETA", "BONGAIGAON", "CACHAR", "CHIRANG", "DARRANG", "DHEMAJI", "DHUBRI", "DIBRUGARH", "DIMA HASAO", "GOALPARA", "GOLAGHAT", "HAILAKANDI", "JORHAT", "KAMRUP", "KAMRUP METROPOLITAN", "KARBI ANGLONG", "KARIMGANJ", "KOKRAJHAR", "LAKHIMPUR", "MAJULI", "MORIGAON", "NAGAON", "NALBARI", "SIVASAGAR", "SONITPUR", "TINSUKIA", "UDALGURI", "WEST KARBI ANGLONG"],
    "BIHAR": ["ARARIA", "ARWAL", "AURANGABAD", "BANKA", "BEGUSARAI", "BHAGALPUR", "BHOJPUR", "BUXAR", "DARBHANGA", "EAST CHAMPARAN", "GAYA", "GOPALGANJ", "JAMUI", "JEHANABAD", "KAIMUR", "KATIHAR", "KHAGARIA", "KISHANGANJ", "LAKHISARAI", "MADHEPURA", "MADHUBANI", "MUNGER", "MUZAFFARPUR", "NALANDA", "NAWADA", "PATNA", "PURNEA", "ROHTAS", "SAHARSA", "SAMASTIPUR", "SARAN", "SHEIKHPURA", "SHEOHAR", "SITAMARHI", "SIWAN", "SUPAUL", "VAISHALI", "WEST CHAMPARAN"],
    "CHHATTISGARH": ["BALOD", "BALODA BAZAR", "BALRAMPUR", "BASTAR", "BEMETARA", "BIJAPUR", "BILASPUR", "DANTEWADA", "DHAMTARI", "DURG", "GARIYABAND", "JANJGIR-CHAMPA", "JASHPUR", "KABIRDHAM", "KANKER", "KONDAGAON", "KORBA", "KOREA", "MAHASAMUND", "MUNGELI", "NARAYANPUR", "RAIGARH", "RAIPUR", "RAJNANDGAON", "SUKMA", "SURAJPUR", "SURGUJA"],
    "GOA": ["NORTH GOA", "SOUTH GOA"],
    "GUJARAT": ["AHMEDABAD", "AMRELI", "ANAND", "ARAVALLI", "BANASKANTHA", "BHARUCH", "BHAVNAGAR", "BOTAD", "CHHOTA UDEPUR", "DAHOD", "DANGS", "DEVBHUMI DWARKA", "GANDHINAGAR", "GIR SOMNATH", "JAMNAGAR", "JUNAGADH", "KUTCH", "KHEDA", "MAHISAGAR", "MEHSANA", "MORBI", "NARMADA", "NAVSARI", "PANCHMAHAL", "PATAN", "PORBANDAR", "RAJKOT", "SABARKANTHA", "SURAT", "SURENDRANAGAR", "TAPI", "VADODARA", "VALSAD"],
    "HARYANA": ["AMBALA", "BHIWANI", "CHARKHI DADRI", "FARIDABAD", "FATEHABAD", "GURUGRAM", "HISAR", "JHAJJAR", "JIND", "KAITHAL", "KARNAL", "KURUKSHETRA", "MAHENDRAGARH", "MEWAT", "PALWAL", "PANCHKULA", "PANIPAT", "REWARI", "ROHTAK", "SIRSA", "SONIPAT", "YAMUNANAGAR"],
    "HIMACHAL PRADESH": ["BILASPUR", "CHAMBA", "HAMIRPUR", "KANGRA", "KINNAUR", "KULLU", "LAHAUL AND SPITI", "MANDI", "SHIMLA", "SIRMAUR", "SOLAN", "UNA"],
    "JHARKHAND": ["BOKARO", "CHATRA", "DEOGHAR", "DHANBAD", "DUMKA", "EAST SINGHBHUM", "GARHWA", "GIRIDIH", "GODDA", "GUMLA", "HAZARIBAGH", "JAMTARA", "KHUNTI", "KODERMA", "LATEHAR", "LOHARDAGA", "PAKUR", "PALAMU", "RAMGARH", "RANCHI", "SAHIBGANJ", "SARAIKELA KHARSAWAN", "SIMDEGA", "WEST SINGHBHUM"],
    "KARNATAKA": ["BAGALKOT", "BALLARI", "BELAGAVI", "BENGALURU RURAL", "BENGALURU URBAN", "BIDAR", "CHAMARAJANAGAR", "CHIKKABALLAPUR", "CHIKKAMAGALURU", "CHITRADURGA", "DAKSHINA KANNADA", "DAVANAGERE", "DHARWAD", "GADAG", "HASSAN", "HAVERI", "KALABURAGI", "KODAGU", "KOLAR", "KOPPAL", "MANDYA", "MYSURU", "RAICHUR", "RAMANAGARA", "SHIVAMOGGA", "TUMAKURU", "UDUPI", "UTTARA KANNADA", "VIJAYAPURA", "YADGIR"],
    "MADHYA PRADESH": ["AGAR MALWA", "ALIRAJPUR", "ANUPPUR", "ASHOKNAGAR", "BALAGHAT", "BARWANI", "BETUL", "BHIND", "BHOPAL", "BURHANPUR", "CHHATARPUR", "CHHINDWARA", "DAMOH", "DATIA", "DEWAS", "DHAR", "DINDORI", "GUNA", "GWALIOR", "HARDA", "HOSHANGABAD", "INDORE", "JABALPUR", "JHABUA", "KATNI", "KHANDWA", "KHARGONE", "MANDLA", "MANDSAUR", "MORENA", "NARSINGHPUR", "NEEMUCH", "PANNA", "RAISEN", "RAJGARH", "RATLAM", "REWA", "SAGAR", "SATNA", "SEHORE", "SEONI", "SHAHDOL", "SHAJAPUR", "SHEOPUR", "SHIVPURI", "SIDHI", "SINGRAULI", "TIKAMGARH", "UJJAIN", "UMARIA", "VIDISHA"],
    "MAHARASHTRA": ["AHMEDNAGAR", "AKOLA", "AMRAVATI", "AURANGABAD", "BEED", "BHANDARA", "BULDHANA", "CHANDRAPUR", "DHULE", "GADCHIROLI", "GONDIA", "HINGOLI", "JALGAON", "JALNA", "KOLHAPUR", "LATUR", "MUMBAI CITY", "MUMBAI SUBURBAN", "NAGPUR", "NANDED", "NANDURBAR", "NASHIK", "OSMANABAD", "PALGHAR", "PARBHANI", "PUNE", "RAIGAD", "RATNAGIRI", "SANGLI", "SATARA", "SINDHUDURG", "SOLAPUR", "THANE", "WARDHA", "WASHIM", "YAVATMAL"],
    "MANIPUR": ["BISHNUPUR", "CHANDEL", "CHURACHANDPUR", "IMPHAL EAST", "IMPHAL WEST", "SENAPATI", "TAMENGLONG", "THOUBAL", "UKHRUL"],
    "MEGHALAYA": ["EAST GARO HILLS", "EAST JAINTIA HILLS", "EAST KHASI HILLS", "NORTH GARO HILLS", "RI BHOI", "SOUTH GARO HILLS", "SOUTH WEST GARO HILLS", "SOUTH WEST KHASI HILLS", "WEST GARO HILLS", "WEST JAINTIA HILLS", "WEST KHASI HILLS"],
    "MIZORAM": ["AIZAWL", "CHAMPHAI", "KOLASIB", "LAWNGTLAI", "LUNGLEI", "MAMIT", "SAIHA", "SERCHHIP"],
    "NAGALAND": ["DIMAPUR", "KIPHIRE", "KOHIMA", "LONGLENG", "MOKOKCHUNG", "MON", "PEREN", "PHEK", "TUENSANG", "WOKHA", "ZUNHEBOTO"],
    "ODISHA": ["ANGUL", "BALANGIR", "BALASORE", "BARGARH", "BHADRAK", "BOUDH", "CUTTACK", "DEOGARH", "DHENKANAL", "GAJAPATI", "GANJAM", "JAGATSINGHPUR", "JAJPUR", "JHARSUGUDA", "KALAHANDI", "KANDHAMAL", "KENDRAPARA", "KEONJHAR", "KHORDHA", "KORAPUT", "MALKANGIRI", "MAYURBHANJ", "NABARANGPUR", "NAYAGARH", "NUAPADA", "PURI", "RAYAGADA", "SAMBALPUR", "SONEPUR", "SUNDARGARH"],
    "PUNJAB": ["AMRITSAR", "BARNALA", "BATHINDA", "FARIDKOT", "FATEHGARH SAHIB", "FAZILKA", "FIROZPUR", "GURDASPUR", "HOSHIARPUR", "JALANDHAR", "KAPURTHALA", "LUDHIANA", "MANSA", "MOGA", "MUKTSAR", "PATHANKOT", "PATIALA", "RUPNAGAR", "SAHIBZADA AJIT SINGH NAGAR", "SANGRUR", "SHAHID BHAGAT SINGH NAGAR", "TARN TARAN"],
    "RAJASTHAN": ["AJMER", "ALWAR", "BANSWARA", "BARAN", "BARMER", "BHARATPUR", "BHILWARA", "BIKANER", "BUNDI", "CHITTORGARH", "CHURU", "DAUSA", "DHOLPUR", "DUNGARPUR", "GANGANAGAR", "HANUMANGARH", "JAIPUR", "JAISALMER", "JALORE", "JHALAWAR", "JHUNJHUNU", "JODHPUR", "KARAULI", "KOTA", "NAGAUR", "PALI", "PRATAPGARH", "RAJSAMAND", "SAWAI MADHOPUR", "SIKAR", "SIROHI", "TONK", "UDAIPUR"],
    "SIKKIM": ["EAST SIKKIM", "NORTH SIKKIM", "SOUTH SIKKIM", "WEST SIKKIM"],
    "TAMIL NADU": ["ARIYALUR", "CHENNAI", "COIMBATORE", "CUDDALORE", "DHARMAPURI", "DINDIGUL", "ERODE", "KANCHEEPURAM", "KANYAKUMARI", "KARUR", "KRISHNAGIRI", "MADURAI", "NAGAPATTINAM", "NAMAKKAL", "NILGIRIS", "PERAMBALUR", "PUDUKKOTTAI", "RAMANATHAPURAM", "SALEM", "SIVAGANGA", "THANJAVUR", "THENI", "THOOTHUKUDI", "TIRUCHIRAPPALLI", "TIRUNELVELI", "TIRUPPUR", "TIRUVALLUR", "TIRUVANNAMALAI", "TIRUVARUR", "VELLORE", "VILUPPURAM", "VIRUDHUNAGAR"],
    "TELANGANA": ["ADILABAD", "BHADRADRI KOTHAGUDEM", "HYDERABAD", "JAGTIAL", "JANGAON", "JAYASHANKAR BHUPALPALLY", "JOGULAMBA GADWAL", "KAMAREDDY", "KARIMNAGAR", "KHAMMAM", "KUMURAM BHEEM ASIFABAD", "MAHABUBABAD", "MAHABUBNAGAR", "MANCHERIAL", "MEDAK", "MEDCHAL-MALKAJGIRI", "MULUGU", "NAGARKURNOOL", "NALGONDA", "NARAYANPET", "NIRMAL", "NIZAMABAD", "PEDDAPALLI", "RAJANNA SIRCILLA", "RANGAREDDY", "SANGAREDDY", "SIDDIPET", "SURYAPET", "VIKARABAD", "WANAPARTHY", "WARANGAL RURAL", "WARANGAL URBAN", "YADADRI BHUVANAGIRI"],
    "TRIPURA": ["DHALAI", "GOMATI", "KHOWAI", "NORTH TRIPURA", "SEPAHIJALA", "SOUTH TRIPURA", "UNAKOTI", "WEST TRIPURA"],
    "UTTAR PRADESH": ["AGRA", "ALIGARH", "ALLAHABAD", "AMBEDKAR NAGAR", "AMETHI", "AMROHA", "AURAIYA", "AZAMGARH", "BAGHPAT", "BAHRAICH", "BALLIA", "BALRAMPUR", "BANDA", "BARABANKI", "BAREILLY", "BASTI", "BHADOHI", "BIJNOR", "BUDAUN", "BULANDSHAHR", "CHANDAULI", "CHITRAKOOT", "DEORIA", "ETAH", "ETAWAH", "FAIZABAD", "FARRUKHABAD", "FATEHPUR", "FIROZABAD", "GAUTAM BUDDHA NAGAR", "GHAZIABAD", "GHAZIPUR", "GONDA", "GORAKHPUR", "HAMIRPUR", "HAPUR", "HARDOI", "HATHRAS", "JALAUN", "JAUNPUR", "JHANSI", "KANNANUJ", "KANPUR DEHAT", "KANPUR NAGAR", "KASGANJ", "KAUSHAMBI", "KHERI", "KUSHINAGAR", "LALITPUR", "LUCKNOW", "MAHARAJGANJ", "MAHOBA", "MAINPURI", "MATHURA", "MAU", "MEERUT", "MIRZAPUR", "MORADABAD", "MUZAFFARNAGAR", "PILIBHIT", "PRATAPGARH", "RAEBARELI", "RAMPUR", "SAHARANPUR", "SAMBHAL", "SANT KABIR NAGAR", "SHAHJAHANPUR", "SHAMLI", "SHRAVASTI", "SIDDHARTHNAGAR", "SITAPUR", "SONBHADRA", "SULTANPUR", "UNNAO", "VARANASI"],
    "UTTARAKHAND": ["ALMORA", "BAGESHWAR", "CHAMOLI", "CHAMPAWAT", "DEHRADUN", "HARIDWAR", "NAINITAL", "PAURI GARHWAL", "PITHORAGARH", "RUDRAPRAYAG", "TEHRI GARHWAL", "UDHAM SINGH NAGAR", "UTTARKASHI"],
    "WEST BENGAL": ["ALIPURDUAR", "BANKURA", "BIRBHUM", "COOCH BEHAR", "DAKSHIN DINAJPUR", "DARJEELING", "HOOGHLY", "HOWRAH", "JALPAIGURI", "JHARGRAM", "KALIMPONG", "KOLKATA", "MALDA", "MURSHIDABAD", "NADIA", "NORTH 24 PARGANAS", "PASCHIM BARDHAMAN", "PASCHIM MEDINIPUR", "PURBA BARDHAMAN", "PURBA MEDINIPUR", "PURULIA", "SOUTH 24 PARGANAS", "UTTAR DINAJPUR"]
  };

  // sites is an array of strings, openingBalances is a map { "SITE_NAME": opening_balance_value }
  let currentSites = [...(c.sites || [])];
  let currentOpeningBalances = { ...(c.openingBalances || {}) };

  const activeState = (c.state || "KERALA").toUpperCase();
  const activeDistrict = (c.district || "KANNUR").toUpperCase();

  const stateOptions = Object.keys(indianStatesDistricts).map(st => `
    <option value="${st}" ${activeState === st ? "selected" : ""}>${st}</option>
  `).join("");

  const initialDistricts = indianStatesDistricts[activeState] || [];
  const districtOptions = initialDistricts.map(dt => `
    <option value="${dt}" ${activeDistrict === dt ? "selected" : ""}>${dt}</option>
  `).join("");

  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-con" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
      <div class="modal-container" style="max-width:850px; width: 95%; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        <!-- Header ribbon -->
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px; border-bottom: 1px solid #1d4ed8;">
          <div style="display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-address-book"></i> MASTERS - ${windowTitle} ${isEdit ? '(EDITING)' : '(NEW)'}
          </div>
          <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="win-close-btn-header">&times;</button>
        </div>

        <form id="contact-master-form" style="display:flex; flex-direction:column; gap:10px; margin-top:12px; font-size:0.8rem;">
          
          <!-- First Row Primary Fields -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; background-color:#f1f5f9; padding:10px; border:1px solid #94a3b8; border-radius:3px;">
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:grid; grid-template-columns: 110px 1fr; gap:4px; align-items:center;">
                <label style="font-weight:600;">LEDGER NAME *</label>
                <input type="text" id="c-name" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${c.name.toUpperCase()}" autocomplete="new-password" required>
                
                <label style="font-weight:600;">NAME IN BILL</label>
                <input type="text" id="c-nameInBill" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.nameInBill || c.name).toUpperCase()}" autocomplete="new-password">

                <label style="font-weight:600;">GSTIN NUMBER</label>
                <div style="display:flex; gap:4px;">
                  <input type="text" id="c-gstin" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px; flex:1;" value="${(c.gstin || '').toUpperCase()}" autocomplete="new-password" maxlength="15">
                  <button type="button" id="btn-verify-gstin" style="background-color:#1e3b8b; color:white; border:none; padding:3px 8px; font-weight:bold; cursor:pointer;" title="Verify on GST Portal">VERIFY</button>
                </div>
              </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:grid; grid-template-columns: 110px 1fr; gap:4px; align-items:center;">
                <label style="font-weight:600;">GROUP NAME</label>
                <select id="c-groupName" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;">
                  <option value="SUNDRY DEBTORS" ${c.groupName === "SUNDRY DEBTORS" ? "selected" : ""}>SUNDRY DEBTORS</option>
                  <option value="SUNDRY CREDITORS" ${c.groupName === "SUNDRY CREDITORS" ? "selected" : ""}>SUNDRY CREDITORS</option>
                </select>

                <div></div>
                <div style="margin-top: 6px;">
                  ${isCustomer ? `
                    <label style="font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="c-cross-list" ${c.listInVendorList === true ? "checked" : ""}>
                      TICK HERE TO LIST THE CUSTOMER IN VENDORS LIST
                    </label>
                  ` : `
                    <label style="font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="c-cross-list" ${c.listInCustomerList === true ? "checked" : ""}>
                      TICK HERE TO LIST THE VENDOR IN CUSTOMERS LIST
                    </label>
                  `}
                </div>
              </div>
            </div>
          </div>

          <!-- Tabs Panel Navigation -->
          <div style="display:flex; border-bottom:1px solid #94a3b8; background-color:#cbd5e1; padding: 2px 4px 0;">
            <button type="button" class="tab-btn active" id="tab-address" style="background:#f1f5f9; border:1px solid #94a3b8; border-bottom:none; padding:4px 12px; cursor:pointer; font-weight:bold; font-size:0.75rem; border-radius:2px 2px 0 0;">ADDRESS & CONTACT</button>
            <button type="button" class="tab-btn" id="tab-credit" style="background:#e2e8f0; border:1px solid #94a3b8; border-bottom:none; padding:4px 12px; cursor:pointer; font-weight:bold; font-size:0.75rem; border-radius:2px 2px 0 0; margin-left:2px;">CREDIT LIMITS</button>
            <button type="button" class="tab-btn" id="tab-sites" style="background:#e2e8f0; border:1px solid #94a3b8; border-bottom:none; padding:4px 12px; cursor:pointer; font-weight:bold; font-size:0.75rem; border-radius:2px 2px 0 0; margin-left:2px;">${isCustomer ? 'CUSTOMER SITES & OP BAL' : 'VENDOR BRANCHES & OP BAL'}</button>
          </div>

          <!-- Form Tab Contents Panels -->
          <div style="background-color:#f1f5f9; border:1px solid #94a3b8; border-top:none; padding:12px; border-radius:0 0 3px 3px; min-height:220px;">
            
            <!-- PANEL 1: Address and Contacts info -->
            <div id="panel-address" class="tab-panel-content">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <div style="display:grid; grid-template-columns: 110px 1fr; gap:4px; align-items:center;">
                    <label style="font-weight:600;">CONTACT PERSON</label>
                    <input type="text" id="c-contactPerson" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.contactPerson || '').toUpperCase()}" autocomplete="new-password">

                    <label style="font-weight:600;">MOBILE NUMBER</label>
                    <input type="text" id="c-mobile" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.mobile || '').toUpperCase()}" autocomplete="new-password">

                    <label style="font-weight:600;">WHATSAPP NUMBER</label>
                    <input type="text" id="c-whatsApp" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.whatsApp || '').toUpperCase()}" autocomplete="new-password">

                    <label style="font-weight:600;">PHONE NUMBER</label>
                    <input type="text" id="c-phone" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.phone || '').toUpperCase()}" autocomplete="new-password">

                    <label style="font-weight:600;">EMAIL ID</label>
                    <input type="email" id="c-email" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.email || '').toUpperCase()}" autocomplete="new-password">
                  </div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <div style="display:grid; grid-template-columns: 110px 1fr; gap:4px;">
                    <label style="font-weight:600;">BILLING ADDRESS</label>
                    <textarea id="c-billingAddress" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px; height:45px; resize:none;" autocomplete="new-password">${(c.billingAddress || '').toUpperCase()}</textarea>
                    
                    <label style="font-weight:600;">STATE / REGION</label>
                    <select id="c-state" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;">
                      ${stateOptions}
                    </select>

                    <label style="font-weight:600;">DISTRICT</label>
                    <select id="c-district" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;">
                      ${districtOptions}
                    </select>

                    <label style="font-weight:600;">AREA</label>
                    <input type="text" id="c-area" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.area || '').toUpperCase()}" autocomplete="new-password">
                  </div>
                </div>
              </div>
            </div>

            <!-- PANEL 2: Credit limits -->
            <div id="panel-credit" class="tab-panel-content" style="display:none;">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <div style="display:grid; grid-template-columns: 130px 1fr; gap:4px; align-items:center;">
                    <label style="font-weight:600;">CREDIT LIMIT (₹)</label>
                    <input type="number" step="0.01" id="c-creditLimit" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${c.creditLimit}" autocomplete="new-password">

                    <label style="font-weight:600;">CREDIT PERIOD (DAYS)</label>
                    <input type="text" id="c-creditPeriod" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.creditPeriod || '').toUpperCase()}" autocomplete="new-password">
                  </div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <div style="display:grid; grid-template-columns: 130px 1fr; gap:4px; align-items:center;">
                    <label style="font-weight:600;">SALES EXECUTIVE</label>
                    <input type="text" id="c-salesExecutive" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${(c.salesExecutive || '').toUpperCase()}" autocomplete="new-password">
                  </div>
                </div>
              </div>
            </div>

            <!-- PANEL 3: Customer multiple locations, branches, and Opening Balances -->
            <div id="panel-sites" class="tab-panel-content" style="display:none;">
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px; background-color:#cbd5e1; padding:6px; border:1px solid #94a3b8; border-radius:3px;">
                  <label style="font-weight:700;">LOCATION STRUCTURE:</label>
                  <select id="c-siteType" style="background-color:white; color:black; border:1px solid #7a96b2; padding:2px;">
                    <option value="single" ${c.siteType === "single" ? "selected" : ""}>SINGLE MAIN OFFICE / SITE</option>
                    <option value="multiple" ${c.siteType === "multiple" ? "selected" : ""}>MULTIPLE SITES / BRANCH OFFICES</option>
                  </select>
                </div>
                
                <!-- Single Site Opening Balance -->
                <div id="single-site-opening-container" style="display:${c.siteType === 'single' ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap:12px; background-color:white; border:1px solid #cbd5e1; padding:10px; border-radius:3px;">
                  <div style="display:grid; grid-template-columns: 140px 1fr; gap:4px; align-items:center;">
                    <label style="font-weight:600;">OPENING BAL DEBIT (Dr)</label>
                    <input type="number" step="0.01" id="c-single-opBalDr" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${c.openingBalance >= 0 ? c.openingBalance : 0}">
                  </div>
                  <div style="display:grid; grid-template-columns: 140px 1fr; gap:4px; align-items:center;">
                    <label style="font-weight:600;">OPENING BAL CREDIT (Cr)</label>
                    <input type="number" step="0.01" id="c-single-opBalCr" style="background-color:white; color:black; border:1px solid #7a96b2; padding:3px;" value="${c.openingBalance < 0 ? Math.abs(c.openingBalance) : 0}">
                  </div>
                </div>

                <!-- Multiple Sites Listing with Opening Balance Input per branch -->
                <div id="multiple-sites-container" style="display:${c.siteType === 'multiple' ? 'flex' : 'none'}; flex-direction:column; gap:6px; background-color:white; border:1px solid #cbd5e1; padding:8px; border-radius:3px;">
                  <div style="display:flex; gap:6px; align-items:center;">
                    <input type="text" id="add-site-input" placeholder="ENTER NEW LOCATION/BRANCH NAME..." style="flex:1; border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;">
                    
                    <div style="display:flex; align-items:center; gap:4px;">
                      <label style="font-weight:600; font-size:0.7rem;">OP BAL:</label>
                      <input type="number" step="0.01" id="add-site-opbal" placeholder="0.00" style="width:90px; border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;">
                      <select id="add-site-optype" style="border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;">
                        <option value="Dr">Dr</option>
                        <option value="Cr">Cr</option>
                      </select>
                    </div>

                    <button type="button" id="btn-add-site" style="background-color:#1e3b8b; color:white; border:none; padding:4px 12px; font-weight:bold; cursor:pointer;">ADD</button>
                  </div>
                  
                  <div id="sites-list-ul" style="display:flex; flex-direction:column; gap:4px; max-height:150px; overflow-y:auto; border-top:1px solid #e2e8f0; padding-top:6px; margin-top:4px;">
                    <!-- Site rows rendered dynamically -->
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer Command Buttons -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #94a3b8; padding-top:10px; margin-top:6px;">
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn" id="btn-contact-new" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; font-weight:bold; color:black; cursor:pointer;">NEW</button>
              <button type="button" class="btn" id="btn-contact-search-btn" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; font-weight:bold; color:black; cursor:pointer;">DIRECTORY</button>
            </div>
            
            <div style="display:flex; gap:6px;">
              <button type="submit" class="btn" style="background:#e2e8f0; border:1px solid #475569; padding:4px 14px; font-weight:bold; color:black; cursor:pointer;">SAVE</button>
              ${isEdit ? `<button type="button" class="btn" id="btn-contact-delete" style="background:#f87171; border:1px solid #b91c1c; padding:4px 14px; font-weight:bold; color:white; cursor:pointer;">DELETE</button>` : ''}
              <button type="button" class="btn" id="btn-contact-close" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; cursor:pointer;">CLOSE</button>
            </div>
          </div>

        </form>
      </div>
    </div>
  `;

  // Bind key inputs uppercase listener
  const formEl = document.getElementById("contact-master-form");
  formEl.querySelectorAll("input[type='text'], textarea").forEach(input => {
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase();
    });
  });

  // Dynamic tab switcher action
  const tabs = ["address", "credit", "sites"];
  tabs.forEach(tab => {
    const tabBtn = document.getElementById(`tab-${tab}`);
    if (tabBtn) {
      tabBtn.addEventListener("click", () => {
        tabs.forEach(t => {
          const btn = document.getElementById(`tab-${t}`);
          const panel = document.getElementById(`panel-${t}`);
          if (btn) btn.style.background = "#e2e8f0";
          if (panel) panel.style.display = "none";
        });
        tabBtn.style.background = "#f1f5f9";
        document.getElementById(`panel-${tab}`).style.display = "block";
      });
    }
  });

  // Multiple sites local management
  const renderSitesList = () => {
    const listContainer = document.getElementById("sites-list-ul");
    if (!listContainer) return;
    listContainer.innerHTML = currentSites.map((site, index) => {
      const balVal = currentOpeningBalances[site] || 0;
      const typeStr = balVal >= 0 ? "Dr" : "Cr";
      const absBal = Math.abs(balVal).toFixed(2);
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background-color:#f1f5f9; padding:4px 8px; border:1px solid #cbd5e1; border-radius:2px; font-size:0.75rem;">
          <div>
            <span style="font-weight:bold; color:#1e293b; margin-right:8px;">${site.toUpperCase()}</span>
            <span style="background-color:#cbd5e1; padding:2px 6px; font-weight:bold; color:#0f172a; border-radius:2px;">OP BAL: ₹${absBal} ${typeStr}</span>
          </div>
          <button type="button" class="btn-remove-site" data-index="${index}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:1rem; padding:0 4px;">&times;</button>
        </div>
      `;
    }).join("");

    listContainer.querySelectorAll(".btn-remove-site").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        const siteName = currentSites[idx];
        currentSites.splice(idx, 1);
        delete currentOpeningBalances[siteName];
        renderSitesList();
      });
    });
  };

  const addSiteBtn = document.getElementById("btn-add-site");
  const addSiteInput = document.getElementById("add-site-input");
  const addSiteOpbalInput = document.getElementById("add-site-opbal");
  const addSiteOptypeSelect = document.getElementById("add-site-optype");
  
  if (addSiteBtn && addSiteInput) {
    addSiteBtn.addEventListener("click", () => {
      const val = addSiteInput.value.trim().toUpperCase();
      if (!val) return;
      if (currentSites.some(s => s.toUpperCase() === val)) {
        alert("THIS LOCATION ALREADY EXISTS.");
        return;
      }
      
      const opbalVal = parseFloat(addSiteOpbalInput.value) || 0;
      const optype = addSiteOptypeSelect.value;
      const finalBal = optype === "Dr" ? opbalVal : -opbalVal;
      
      currentSites.push(val);
      currentOpeningBalances[val] = finalBal;
      
      addSiteInput.value = "";
      addSiteOpbalInput.value = "";
      renderSitesList();
    });
  }

  const siteTypeSelect = document.getElementById("c-siteType");
  if (siteTypeSelect) {
    siteTypeSelect.addEventListener("change", (e) => {
      const isMultiple = e.target.value === "multiple";
      document.getElementById("single-site-opening-container").style.display = isMultiple ? "none" : "grid";
      document.getElementById("multiple-sites-container").style.display = isMultiple ? "flex" : "none";
    });
  }

  // State dynamic district handler
  const stateSelect = document.getElementById("c-state");
  const districtSelect = document.getElementById("c-district");
  if (stateSelect && districtSelect) {
    stateSelect.addEventListener("change", (e) => {
      const selectedSt = e.target.value;
      const districts = indianStatesDistricts[selectedSt] || [];
      districtSelect.innerHTML = districts.map(dt => `
        <option value="${dt}">${dt}</option>
      `).join("");
    });
  }

  renderSitesList();

  // Close logic hooks
  const overlay = document.getElementById("modal-overlay-con");
  const close = () => {
    overlay.classList.remove("active");
    root.innerHTML = "";
    const currentHash = window.location.hash.replace(/^#/, "");
    const activeWin = document.getElementById("active-window");
    if (!currentHash || currentHash === "home") {
      if (activeWin) activeWin.classList.add("hidden");
    } else {
      renderCurrentView();
    }
  };

  document.getElementById("win-close-btn-header").addEventListener("click", close);
  document.getElementById("btn-contact-close").addEventListener("click", close);

  document.getElementById("btn-contact-new").addEventListener("click", () => {
    showContactMasterWindow(targetRoot, null, forceType, onSuccess);
  });

  document.getElementById("btn-contact-search-btn").addEventListener("click", () => {
    close();
    activeContactTypeFilter = forceType;
    window.location.hash = "#contacts";
  });

  if (isEdit) {
    document.getElementById("btn-contact-delete").addEventListener("click", () => {
      if (confirm(`ARE YOU SURE YOU WANT TO PERMANENTLY DELETE PROFILE FOR "${c.name.toUpperCase()}"?`)) {
        try {
          state.deleteContact(c.id);
          close();
          if (onSuccess) onSuccess();
        } catch (err) {
          alert(err.message.toUpperCase());
        }
      }
    });
  }

  // GSTIN Verify Button Listener
  const verifyBtn = document.getElementById("btn-verify-gstin");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", () => {
      const gstinVal = document.getElementById("c-gstin").value.trim();
      if (!gstinVal) {
        alert("PLEASE ENTER A GSTIN TO VERIFY.");
        return;
      }
      if (gstinVal.length !== 15) {
        alert("GSTIN MUST BE EXACTLY 15 CHARACTERS.");
        return;
      }
      
      // Open window synchronously to avoid popup blockers
      window.open("https://services.gst.gov.in/services/searchtp", "_blank");

      // Attempt to copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(gstinVal).catch(e => console.error(e));
      } else {
        // Fallback for non-https/older browsers
        const tempInput = document.createElement("input");
        tempInput.value = gstinVal;
        document.body.appendChild(tempInput);
        tempInput.select();
        try { document.execCommand("copy"); } catch(e) {}
        document.body.removeChild(tempInput);
      }
    });
  }

  // Save profile submit
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();

    const gstinInput = document.getElementById("c-gstin").value.trim();
    if (gstinInput.length > 0 && gstinInput.length !== 15) {
      alert("GSTIN NUMBER MUST BE EXACTLY 15 CHARACTERS LONG.");
      return;
    }

    const siteTypeVal = document.getElementById("c-siteType").value;
    let finalOpBal = 0;
    let finalOpeningBalances = {};

    if (siteTypeVal === "single") {
      const opDr = parseFloat(document.getElementById("c-single-opBalDr").value) || 0;
      const opCr = parseFloat(document.getElementById("c-single-opBalCr").value) || 0;
      finalOpBal = opDr > 0 ? opDr : (opCr > 0 ? -opCr : 0);
      finalOpeningBalances = {};
    } else {
      finalOpeningBalances = { ...currentOpeningBalances };
      // General contact opening balance is the sum of site balances
      finalOpBal = Object.values(finalOpeningBalances).reduce((sum, v) => sum + v, 0);
    }

    const groupVal = document.getElementById("c-groupName").value.toUpperCase();
    const typeVal = forceType;
    const crossListed = document.getElementById("c-cross-list")?.checked || false;

    const payload = {
      name: document.getElementById("c-name").value.trim().toUpperCase(),
      ledgerCode: "", // Removed ledger code
      nameInBill: document.getElementById("c-nameInBill").value.trim().toUpperCase(),
      groupName: groupVal,
      type: typeVal,
      billingAddress: document.getElementById("c-billingAddress").value.trim().toUpperCase(),
      phone: document.getElementById("c-phone").value.trim().toUpperCase(),
      mobile: document.getElementById("c-mobile").value.trim().toUpperCase(),
      whatsApp: document.getElementById("c-whatsApp").value.trim().toUpperCase(),
      state: document.getElementById("c-state").value.toUpperCase(),
      district: document.getElementById("c-district").value.trim().toUpperCase(),
      area: document.getElementById("c-area")?.value.trim().toUpperCase() || "",
      fax: document.getElementById("c-fax")?.value.trim().toUpperCase() || "",
      email: document.getElementById("c-email")?.value.trim().toUpperCase() || "",
      contactPerson: document.getElementById("c-contactPerson").value.trim().toUpperCase(),
      gstin: document.getElementById("c-gstin").value.trim().toUpperCase(),
      dlNo1: "",
      pincode: "",
      creditLimit: parseFloat(document.getElementById("c-creditLimit").value) || 0,
      creditPeriod: document.getElementById("c-creditPeriod").value.trim().toUpperCase(),
      salesExecutive: document.getElementById("c-salesExecutive").value.trim().toUpperCase(),
      openingBalance: finalOpBal,
      balance: finalOpBal,
      openingBalances: finalOpeningBalances,
      siteType: siteTypeVal,
      sites: currentSites,
      listInVendorList: typeVal === "customer" ? crossListed : false,
      listInCustomerList: typeVal === "supplier" ? crossListed : false
    };

    try {
      if (isEdit) {
        state.updateContact(c.id, payload);
        alert("PROFILE UPDATED SUCCESSFULLY.");
      } else {
        const added = state.addContact(payload);
        alert(`PROFILE CREATED SUCCESSFULLY WITH ID: ${added.id}`);
      }
      close();
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.message.toUpperCase());
    }
  });
}

// Modal: Record Payment
export function showRecordPaymentModal(container, preselectedContactId) {
  const contacts = state.getContacts();
  const root = document.getElementById("modal-container-root");

  root.innerHTML = `
    <div class="modal-overlay active" id="modal-overlay-con">
      <div class="modal-container" style="max-width:550px; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #64748b; font-family:'Segoe UI', sans-serif;">
        <div class="modal-header" style="background-color:#1e3b8b; color:white; padding:6px 12px; border-radius: var(--border-radius-sm); font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
          <h3>RECORD PAYMENT VOUCHER</h3>
          <button class="btn btn-secondary btn-icon" id="btn-close-modal" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
        </div>
        <form id="record-payment-form" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          <div class="modal-body">
            <div class="form-group">
              <label for="p-contact" style="font-size:0.8rem; font-weight:600;">SELECT CUSTOMER / SUPPLIER *</label>
              <select id="p-contact" class="form-control" style="background-color:white; color:black;" required>
                <option value="">-- SELECT CONTACT --</option>
                ${contacts.map(c => `
                  <option value="${c.id}" ${c.id === preselectedContactId ? 'selected' : ''}>
                    ${c.name.toUpperCase()} (${c.type.toUpperCase()}) - BAL: ₹${Math.abs(c.balance || 0).toFixed(2)} ${c.balance >= 0 ? 'DR' : 'CR'}
                  </option>
                `).join("")}
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top:8px;">
              <div class="form-group">
                <label for="p-amount" style="font-size:0.8rem; font-weight:600;">PAYMENT AMOUNT (₹) *</label>
                <input type="number" step="0.01" id="p-amount" class="form-control" style="background-color:white; color:black;" placeholder="0.00" required min="0.01">
              </div>
              <div class="form-group">
                <label for="p-date" style="font-size:0.8rem; font-weight:600;">PAYMENT DATE *</label>
                <input type="date" id="p-date" class="form-control" style="background-color:white; color:black;" value="${new Date().toISOString().split("T")[0]}" required>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top:8px;">
              <div class="form-group">
                <label for="p-method" style="font-size:0.8rem; font-weight:600;">PAYMENT MODE *</label>
                <select id="p-method" class="form-control" style="background-color:white; color:black;" required>
                  <option value="bank">BANK TRANSFER / EFT / CHEQUE</option>
                  <option value="cash">CASH IN HAND</option>
                </select>
              </div>
              <div class="form-group">
                <label for="p-ref" style="font-size:0.8rem; font-weight:600;">REFERENCE RECEIPT / CHQ # *</label>
                <input type="text" id="p-ref" class="form-control" style="background-color:white; color:black;" placeholder="E.G. TX-98782" required>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:6px; border-top:1px solid #94a3b8; padding-top:8px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal" style="background-color:#f1f5f9; color:black;">CANCEL</button>
            <button type="submit" class="btn btn-primary" style="background-color:#1e3b8b; color:white; border:none; font-weight:bold;">SUBMIT PAYMENT</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Capitalize input values
  const refInput = document.getElementById("p-ref");
  refInput.addEventListener("input", () => {
    refInput.value = refInput.value.toUpperCase();
  });

  const overlay = document.getElementById("modal-overlay-con");
  const close = () => { overlay.classList.remove("active"); root.innerHTML = ""; };

  document.getElementById("btn-close-modal").addEventListener("click", close);
  document.getElementById("btn-cancel-modal").addEventListener("click", close);

  document.getElementById("record-payment-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const contactId = document.getElementById("p-contact").value;
    const amount = document.getElementById("p-amount").value;
    const date = document.getElementById("p-date").value;
    const method = document.getElementById("p-method").value;
    const ref = document.getElementById("p-ref").value.trim().toUpperCase();

    const success = state.recordPayment(contactId, amount, method, ref, date);
    if (success) {
      close();
      renderContacts(container);
    } else {
      alert("FAILED TO POST PAYMENT VOUCHER.");
    }
  });
}
