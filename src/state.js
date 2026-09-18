import {
  initialMaterials,
  initialContacts,
  initialInvoices,
  initialTransactions,
  initialAccountGroups,
  initialLedgers,
  initialUnits
} from "./sampleData.js";
import { getValidGstRate } from "./utils/gstValidator.js";

export function isManualVoucherOrReturn(t) {
  if (!t) return false;
  const vUpper = String(t.voucherType || "").trim().toUpperCase();
  const idUpper = String(t.id || "").trim().toUpperCase();
  const refUpper = String(t.reference || "").trim().toUpperCase();
  const descUpper = String(t.description || "").trim().toUpperCase();

  if (["RECEIPT", "PAYMENT", "JOURNAL", "CONTRA", "REC", "PAY", "CON", "JV"].includes(vUpper)) return true;
  if (idUpper.startsWith("TX-REC-") || idUpper.startsWith("TX-PAY-") || idUpper.startsWith("TX-CON-") || idUpper.startsWith("TX-JV-") || idUpper.startsWith("TX-VOUCHER-")) return true;
  if (refUpper.startsWith("RC-") || refUpper.startsWith("PAY-") || refUpper.startsWith("PY-") || refUpper.startsWith("PM-") || refUpper.startsWith("CNTR-") || refUpper.startsWith("JV-") || refUpper.startsWith("DN-") || refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("SALES RETURN") || refUpper.startsWith("PURCHASE RETURN")) return true;
  if ((refUpper.startsWith("CN-") && !refUpper.startsWith("CNTR-")) || (refUpper.startsWith("SR-") && !refUpper.startsWith("SALES"))) return true;
  if (descUpper.includes("REC VOUCHER") || descUpper.includes("PAY VOUCHER") || descUpper.includes("CONTRA VOUCHER") || descUpper.includes("RECEIPT FROM") || descUpper.includes("PAYMENT TO")) return true;

  return false;
}


// Expanded Chart of Accounts Definition
export const ACCOUNTS = {
  // Assets (1000 - 1999) - Debit balances
  "1010": { name: "Cash in Hand", type: "asset" },
  "1020": { name: "Bank Current Account", type: "asset" },
  "1100": { name: "Accounts Receivable", type: "asset" },
  "1200": { name: "Stock-in-Hand", type: "asset" },

  // Liabilities (2000 - 2999) - Credit balances
  "2100": { name: "Accounts Payable", type: "liability" },
  "2200": { name: "GST/VAT Payable", type: "liability" },

  // Equity (3000 - 3999) - Credit balances
  "3100": { name: "Capital / Owner Equity", type: "equity" },
  "3200": { name: "Retained Earnings", type: "equity" },

  // Revenue (4000 - 4999) - Credit balances
  "4100": { name: "Sales A/C", type: "revenue" },
  "4110": { name: "Sales Returns", type: "revenue" }, // Contra-revenue
  "4200": { name: "Shipping Revenue", type: "revenue" },
  "4300": { name: "Inventory Adjustment Gain", type: "revenue" },

  // Expenses (5000 - 5999) - Debit balances
  "5100": { name: "Cost of Goods Sold (COGS)", type: "expense" },
  "5110": { name: "Purchase Returns", type: "expense" }, // Contra-expense
  "5200": { name: "Transport & Delivery Expense", type: "expense" },
  "5300": { name: "Rent & Utilities", type: "expense" },
  "5400": { name: "Salaries & Wages", type: "expense" },
  "5500": { name: "Inventory Write-Off / Loss", type: "expense" },
  "5600": { name: "Office Expenses", type: "expense" }
};

export const STANDARD_HSN_DESCRIPTIONS = {
  // Cements, Lime, Plaster & Minerals (Chapter 25)
  "2523": "PORTLAND CEMENT, ALUMINOUS CEMENT, SLAG CEMENT",
  "2505": "NATURAL SANDS OF ALL KINDS",
  "2517": "PEBBLES, GRAVEL, BROKEN OR CRUSHED STONE (AGGREGATES)",
  "2515": "MARBLE, TRAVERTINE AND OTHER CALCAREOUS MONUMENTAL STONE",
  "2516": "GRANITE, PORPHYRY, BASALT, SANDSTONE MONUMENTAL STONE",
  "2520": "GYPSUM; ANHYDRITE; PLASTERS",
  "2522": "QUICKLIME, SLAKED LIME AND HYDRAULIC LIME",
  "2518": "DOLOMITE, CALCINED OR SINTERED",

  // Ceramic & Glass Products (Chapters 68, 69, 70)
  "6802": "WORKED MONUMENTAL OR BUILDING STONE (GRANITE / MARBLE)",
  "6808": "PANELS, BOARDS, TILES, BLOCKS OF VEGETABLE FIBRE OR WOOD",
  "6810": "ARTICLES OF CEMENT, CONCRETE OR ARTIFICIAL STONE",
  "6811": "ARTICLES OF ASBESTOS-CEMENT, CELLULOSE FIBRE-CEMENT",
  "6901": "BRICKS, BLOCKS, TILES AND OTHER CERAMIC GOODS",
  "6904": "CERAMIC BUILDING BRICKS, FLOORING BLOCKS, SUPPORT TILES",
  "6905": "ROOFING TILES, CHIMNEY-POTS, COWLS, CHIMNEY LINERS",
  "6907": "CERAMIC FLAGS AND PAVING, HEARTH OR WALL TILES",
  "6910": "CERAMIC SINKS, WASH BASINS, WATER CLOSET PANS",
  "7005": "FLOAT GLASS AND POLISHED GLASS",
  "7007": "SAFETY GLASS, TOUGHENED OR LAMINATED",

  // Iron & Steel Products (Chapters 72, 73)
  "7214": "BARS AND RODS OF IRON OR NON-ALLOY STEEL (TMT REBARS)",
  "7208": "FLAT-ROLLED PRODUCTS OF IRON OR STEEL (HR COILS/SHEETS)",
  "7209": "FLAT-ROLLED PRODUCTS OF IRON OR STEEL (CR COILS/SHEETS)",
  "7210": "FLAT-ROLLED PRODUCTS OF IRON/STEEL, PLATED/COATED (GI SHEETS)",
  "7213": "BARS AND RODS, HOT-ROLLED, IN IRREGULARLY WOUND COILS",
  "7216": "ANGLES, SHAPES AND SECTIONS OF IRON OR NON-ALLOY STEEL",
  "7217": "WIRE OF IRON OR NON-ALLOY STEEL (BINDING WIRE)",
  "7306": "TUBES, PIPES AND HOLLOW PROFILES OF IRON OR STEEL (MS/GI PIPES)",
  "7308": "STRUCTURES AND PARTS OF STRUCTURES OF IRON OR STEEL (TRUSSES/ROOFING)",
  "7312": "STRANDED WIRE, ROPES, CABLES OF IRON OR STEEL",
  "7314": "CLOTH, GRILL, NETTING AND FENCING OF IRON OR STEEL WIRE",
  "7318": "SCREWS, BOLTS, NUTS, COACH SCREWS, RIVETS, WASHERS",
  "7326": "OTHER ARTICLES OF IRON OR STEEL",

  // Non-Ferrous Metals (Chapters 74, 76)
  "7407": "COPPER BARS, RODS AND PROFILES",
  "7411": "COPPER TUBES AND PIPES",
  "7604": "ALUMINIUM BARS, RODS AND PROFILES",
  "7610": "ALUMINIUM STRUCTURES AND PARTS (DOORS, WINDOWS, FRAMES)",

  // Paints, Chemicals, Adhesives & Plastics (Chapters 32, 35, 38, 39)
  "3208": "PAINTS AND VARNISHES (NON-AQUEOUS)",
  "3209": "PAINTS AND VARNISHES (AQUEOUS MEDIUM)",
  "3210": "OTHER PAINTS AND VARNISHES, WATER PIGMENTS",
  "3214": "GLAZIERS PUTTY, RESIN MASTICS, WALL PUTTY",
  "3506": "PREPARED GLUES AND OTHER PREPARED ADHESIVES",
  "3816": "REFRACTORY CEMENTS, MORTARS, CONCRETES",
  "3824": "WATERPROOFING COMPOUNDS, CHEMICAL PRODUCTS & PREPARATIONS",
  "3917": "TUBES, PIPES AND HOSES, AND FITTINGS (PVC / CPVC PIPES)",
  "3925": "BUILDERS' WARE OF PLASTICS (PVC TANKS, DOORS, WINDOWS)",
  "3926": "OTHER ARTICLES OF PLASTICS",

  // Wood & Wood Products (Chapter 44)
  "4407": "WOOD SAWN OR CHIPPED LENGTHWISE, SLICED OR PEELED",
  "4409": "WOOD CONTINUOUSLY SHAPED ALONG EDGES",
  "4410": "PARTICLE BOARD, ORIENTED STRAND BOARD (OSB)",
  "4411": "FIBREBOARD OF WOOD (MDF / HDF)",
  "4412": "PLYWOOD, VENEERED PANELS AND SIMILAR LAMINATED WOOD",
  "4418": "BUILDERS' JOINERY AND CARPENTRY OF WOOD",

  // Tools, Hardware & Plumbing (Chapters 82, 83, 84)
  "8201": "HAND TOOLS (SHOVELS, SPADES, PICKS, HOES)",
  "8202": "HAND SAWS AND SAW BLADES",
  "8203": "FILES, RASPS, PLIERS, PINCERS, METAL CUTTING SHEARS",
  "8204": "HAND-OPERATED SPANNERS AND WRENCHES",
  "8205": "HAND TOOLS NOT ELSEWHERE SPECIFIED",
  "8301": "PADLOCKS AND LOCKS, CLASPS AND KEYS",
  "8302": "BASE METAL MOUNTINGS, FITTINGS (HINGES, HANDLES)",
  "8481": "TAPS, COCKS, VALVES FOR PIPES, TANKS (PLUMBING TAPS/VALVES)",

  // Electricals & Lighting (Chapters 85, 94)
  "8504": "ELECTRICAL TRANSFORMERS, STATIC CONVERTERS, INDUCTORS",
  "8536": "ELECTRICAL SWITCHES, PLUGS, SOCKETS, MCBS, FUSES",
  "8537": "BOARDS, PANELS, CONSOLES, DISTRIBUTION BOARDS",
  "8539": "ELECTRIC FILAMENT OR DISCHARGE LAMPS, LED BULBS",
  "8544": "INSULATED WIRE, CABLE AND ELECTRIC CONDUCTORS",
  "9405": "LAMPS AND LIGHTING FITTINGS (LED FIXTURES)",

  // Services (SAC Codes - Chapter 99)
  "9954": "CONSTRUCTION SERVICES",
  "9965": "GOODS TRANSPORT SERVICES (GTA / TRANSPORT)",
  "9973": "LEASING OR RENTAL SERVICES OF MACHINERY/EQUIPMENT",
  "9983": "OTHER PROFESSIONAL, TECHNICAL AND BUSINESS SERVICES",
  "9985": "SUPPORT SERVICES (MANPOWER, SECURITY)",
  "9987": "MAINTENANCE, REPAIR AND INSTALLATION SERVICES",
  "9988": "MANUFACTURING SERVICES ON PHYSICAL INPUTS (JOB WORK)"
};




export function parseDateSafely(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  // Try normal parsing first (e.g. YYYY-MM-DD)
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  // Try parsing DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(d.getTime())) return d;
    }
    if (parts[0].length === 4) {
      d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date(dateStr);
}

class StateManager {
  constructor() {
    this.listeners = [];
    this.materials = [];
    this.contacts = [];
    this.invoices = [];
    this.salesOrders = [];
    this.transactions = [];
    this.purchases = [];
    this.salesReturns = [];
    this.purchaseReturns = [];
    this.conversions = [];
    this.productGroups = [];
    this.companies = [];
    this.categories = [];
    this.subCategories = [];
    this.productNames = [];
    this.hsnCodes = [];
    this.hsnDescriptions = {};
    this.ledgers = [];
    this.units = [];
    this.seriesMaster = [];
    this.gstMaster = [];
    this.adminPassword = "123";
    this.influencerRedemptions = [];
    this.loyaltyPrograms = [];
    this._suppressSave = true;
    this._pendingSave = false;
    this.checkAndMigrateLegacyData();
    this.loadState();
    this.ensureDefaultSeries();
    this.ensureStandardBaseLedgers();
    this.healCorruptedBaseLedgers();
    this.ensureStandardGstLedgers();
    this.migrateLegacyTaxEntries();
    this.rebuildAllTaxTransactions();
    this.cleanDuplicateTransactions();
    this.alignVoucherPrefixesWithSeries();
    this.realignSeriesCurrentNumbers();
    this.forceAlignTransactionUnits();
    this._suppressSave = false;
    if (this._pendingSave) {
      this._pendingSave = false;
      this.saveState(true);
    }
    this.notifyListeners();
  }

  // ── Auto-Sync: Poll server every 30 seconds ───────────────────────────────
  startAutoSync(intervalMs = 5000) {
    if (this._autoSyncInterval) clearInterval(this._autoSyncInterval);

    this._autoSyncInterval = setInterval(async () => {
      const activeId = this.getActiveCompanyId();
      if (!activeId) return;

      // Don't sync if user is actively typing/editing (a modal is open)
      const modalRoot = document.getElementById("modal-container-root");
      if (modalRoot && modalRoot.children.length > 0) return;

      const host = window.location.hostname || "localhost";
      const fyId = this.getActiveFyId();

      try {
        const apiUrl = (typeof window._getApiUrl === "function")
          ? window._getApiUrl(`/api/data/${activeId}/${fyId}`)
          : `http://${host}:3001/api/data/${activeId}/${fyId}`;

        const res = await fetch(apiUrl, {
          cache: "no-store",
          headers: { "Bypass-Tunnel-Reminder": "true" },
          signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return;

        const serverData = await res.json();
        if (!serverData || typeof serverData !== "object") return;

        const serverStr = JSON.stringify(serverData);
        const currentStr = JSON.stringify(this._serverLoadedData || {});

        // Only reload if server has different (newer) data
        if (currentStr !== serverStr) {
          this._serverLoadedData = serverData;
          this.loadState();
          this.notifyListeners();
          if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent("erp:data-refreshed"));
          }
          console.log("[AutoSync] Data refreshed from server.");
        }
      } catch (e) {
        // Server offline or unreachable — silently skip this tick
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this._autoSyncInterval) {
      clearInterval(this._autoSyncInterval);
      this._autoSyncInterval = null;
    }
  }

  async initFromServer() {
    // Always purge any cached company data from localStorage
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("erp_company_data_")) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {}

    const host = window.location.hostname || "localhost";
    const apiUrl = (typeof window._getApiUrl === "function")
      ? window._getApiUrl("/api/companies")
      : `http://${host}:3001/api/companies`;

    try {
      let serverCompanies = null;
      try {
        const res = await fetch(apiUrl, {
          headers: { "Bypass-Tunnel-Reminder": "true" },
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) serverCompanies = await res.json();
      } catch (e) {}

      if (!Array.isArray(serverCompanies) || serverCompanies.length === 0) {
        // Fallback for static Netlify deployment
        try {
          const staticRes = await fetch("/data/companies.json");
          if (staticRes.ok) serverCompanies = await staticRes.json();
        } catch (e) {}
      }

      if (Array.isArray(serverCompanies) && serverCompanies.length > 0) {
        const localStr = localStorage.getItem("erp_companies");
        const localCompanies = localStr ? JSON.parse(localStr) : [];
        const merged = serverCompanies.map(sc => {
          const lc = localCompanies.find(c => String(c.id) === String(sc.id));
          if (lc && lc.serverUrl) sc.serverUrl = lc.serverUrl;
          return sc;
        });
        localStorage.setItem("erp_companies", JSON.stringify(merged));
      }
    } catch (e) {
      // Server unreachable
    }

    let activeId = this.getActiveCompanyId();
    if (!activeId) {
      const companies = this.getRegisteredCompanies();
      if (companies.length > 0) {
        activeId = companies[0].id;
        try {
          localStorage.setItem("erp_active_company_id", String(activeId));
        } catch (e) {}
      }
    }

    if (activeId) {
      const fyId = this.getActiveFyId();
      try {
        const dataUrl = (typeof window._getApiUrl === "function")
          ? window._getApiUrl(`/api/data/${activeId}/${fyId}`)
          : `http://${host}:3001/api/data/${activeId}/${fyId}`;
        
        let loadedData = null;
        try {
          const dataRes = await fetch(dataUrl, {
            headers: { "Bypass-Tunnel-Reminder": "true" },
            signal: AbortSignal.timeout(15000)
          });
          if (dataRes.ok) {
            loadedData = await dataRes.json();
          }
        } catch (e) {}

        // Fallback for static Netlify deployment without backend server
        if (!loadedData || typeof loadedData !== "object") {
          try {
            const staticDataRes = await fetch(`/data/${activeId}_${fyId}.json`);
            if (staticDataRes.ok) {
              loadedData = await staticDataRes.json();
            } else {
              const staticDefRes = await fetch(`/data/${activeId}.json`);
              if (staticDefRes.ok) loadedData = await staticDefRes.json();
            }
          } catch (e) {}
        }

        if (loadedData && typeof loadedData === "object") {
          this._serverLoadedData = loadedData;
        }
      } catch (e) {}
    }

    this.loadState();
    this.notifyListeners();
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("erp:data-refreshed"));
    }
  }

  getRegisteredCompanies() {
    try {
      const val = localStorage.getItem("erp_companies");
      if (!val || val === "undefined" || val === "null") return [];
      return JSON.parse(val) || [];
    } catch (e) {
      return [];
    }
  }

  saveRegisteredCompanies(companies) {
    localStorage.setItem("erp_companies", JSON.stringify(companies));
    try {
      const companiesWithFy = companies.map(c => {
        if (!c.financialYears || c.financialYears.length === 0) {
          return {
            ...c,
            financialYears: [{
              id: "default",
              name: "Current F.Y",
              startDate: c.financialYearStarts || "2026-04-01",
              endDate: c.financialYearEnds || "2027-03-31"
            }]
          };
        }
        return c;
      });
      const host = window.location.hostname || "localhost";
      const apiUrl = (typeof window._getApiUrl === "function") 
        ? window._getApiUrl("/api/companies") 
        : `http://${host}:3001/api/companies`;

      fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companiesWithFy)
      });
    } catch (e) {}
  }

  getActiveFyId() {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return "default";
    let fy = localStorage.getItem(`erp_active_fy_id_${activeId}`);
    if (!fy) fy = "default";
    return fy;
  }

  getFyDisplayLabel(fy) {
    if (!fy || !fy.startDate || !fy.endDate) return fy ? fy.name : "";
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (fy.name === "Current F.Y" || (fy.startDate <= todayStr && todayStr <= fy.endDate)) {
      return "Current F.Y";
    }

    const startFormatted = fy.startDate.split("-").reverse().join("/");
    const endFormatted = fy.endDate.split("-").reverse().join("/");
    return `${startFormatted} to ${endFormatted}`;
  }

  validateTransactionDate(date) {
    if (!date) return;
    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return;
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => c.id === activeCompanyId);
    if (!company) return;
    const activeFyId = this.getActiveFyId();
    const fy = (company.financialYears || []).find(f => f.id === activeFyId);
    if (fy && fy.startDate) {
      const txD = new Date(date);
      const fyD = new Date(fy.startDate);
      if (txD < fyD) {
        const formattedDate = date.split("-").reverse().join("/");
        const formattedStartDate = fy.startDate.split("-").reverse().join("/");
        throw new Error(`TRANSACTION DATE (${formattedDate}) CANNOT BE BEFORE THE START OF THE FINANCIAL YEAR (${formattedStartDate}).`);
      }
    }
  }

  getActiveFinancialYearStartDate() {
    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return null;
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => c.id === activeCompanyId);
    if (!company) return null;
    const activeFyId = this.getActiveFyId();
    const fy = (company.financialYears || []).find(f => f.id === activeFyId);
    return fy ? fy.startDate : null;
  }

  getActiveFinancialYearEndDate() {
    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return null;
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => c.id === activeCompanyId);
    if (!company) return null;
    const activeFyId = this.getActiveFyId();
    const fy = (company.financialYears || []).find(f => f.id === activeFyId);
    return fy ? fy.endDate : null;
  }



  setActiveFyId(fyId) {
    const activeId = this.getActiveCompanyId();
    if (activeId) {
      if (fyId) {
        localStorage.setItem(`erp_active_fy_id_${activeId}`, fyId);
      } else {
        localStorage.removeItem(`erp_active_fy_id_${activeId}`);
      }
    }
  }

  getCompanies() {
    return this.companies || [];
  }

  saveCompanies(companies) {
    this.companies = companies;
    this.saveState();
  }

  // ── Multi-User Management & Session ──────────────────────────────────────────
  getCurrentUser() {
    try {
      const val = localStorage.getItem("erp_current_user");
      return val ? JSON.parse(val) : null;
    } catch(e) {
      return null;
    }
  }

  setCurrentUser(userObj) {
    if (userObj) {
      localStorage.setItem("erp_current_user", JSON.stringify(userObj));
    } else {
      localStorage.removeItem("erp_current_user");
    }
  }

  getCompanyUsers(companyId) {
    const compId = companyId || this.getActiveCompanyId();
    if (!compId) return [];
    const companies = this.getRegisteredCompanies();
    const comp = companies.find(c => String(c.id) === String(compId));
    if (!comp) return [];

    if (!Array.isArray(comp.users) || comp.users.length === 0) {
      comp.users = [
        {
          id: "USR-1",
          username: comp.username || "admin",
          password: comp.password || "123",
          fullName: "Administrator",
          role: "Admin",
          status: "Active"
        }
      ];
      this.saveRegisteredCompanies(companies);
    }
    return comp.users;
  }

  saveCompanyUser(companyId, userData) {
    const compId = companyId || this.getActiveCompanyId();
    if (!compId) return null;
    const companies = this.getRegisteredCompanies();
    const comp = companies.find(c => String(c.id) === String(compId));
    if (!comp) return null;

    if (!Array.isArray(comp.users)) comp.users = [];

    if (userData.id) {
      const idx = comp.users.findIndex(u => u.id === userData.id);
      if (idx !== -1) {
        comp.users[idx] = { ...comp.users[idx], ...userData };
        if (userData.username === comp.username) {
          comp.password = userData.password;
        }
      }
    } else {
      const newId = "USR-" + Date.now();
      const newUser = {
        id: newId,
        username: userData.username.trim(),
        password: userData.password,
        fullName: userData.fullName ? userData.fullName.trim() : userData.username,
        role: userData.role || "Sales Clerk",
        status: userData.status || "Active"
      };
      comp.users.push(newUser);
      userData.id = newId;
    }

    this.saveRegisteredCompanies(companies);
    return userData;
  }

  deleteCompanyUser(companyId, userId) {
    const compId = companyId || this.getActiveCompanyId();
    if (!compId) return false;
    const companies = this.getRegisteredCompanies();
    const comp = companies.find(c => String(c.id) === String(compId));
    if (!comp || !Array.isArray(comp.users)) return false;

    comp.users = comp.users.filter(u => u.id !== userId);
    this.saveRegisteredCompanies(companies);
    return true;
  }

  authenticateUser(companyId, username, password) {
    const users = this.getCompanyUsers(companyId);
    const uInput = (username || "").trim().toLowerCase();
    const match = users.find(u => u.username.toLowerCase() === uInput && u.password === password && u.status !== "Inactive");
    if (match) return match;

    // Fallback: check main company legacy admin credentials
    const comp = this.getRegisteredCompanies().find(c => String(c.id) === String(companyId));
    if (comp && comp.username.toLowerCase() === uInput && comp.password === password) {
      return {
        id: "USR-LEGACY-ADMIN",
        username: comp.username,
        password: comp.password,
        fullName: "Administrator",
        role: "Admin",
        status: "Active"
      };
    }
    return null;
  }

  getActiveCompanyId() {
    const val = localStorage.getItem("erp_active_company_id");
    if (!val || val === "undefined" || val === "null") return null;
    return val;
  }

  setActiveCompanyId(companyId) {
    if (companyId) {
      localStorage.setItem("erp_active_company_id", companyId);
    } else {
      localStorage.removeItem("erp_active_company_id");
    }
  }

  clearSelectedCompanyData(categories = []) {
    if (!categories || categories.length === 0) return;

    if (categories.includes("sales")) {
      this.invoices = [];
    }
    if (categories.includes("purchases")) {
      this.purchases = [];
    }
    if (categories.includes("returns")) {
      this.salesReturns = [];
      this.purchaseReturns = [];
    }
    if (categories.includes("vouchers")) {
      this.transactions = [];
    }
    if (categories.includes("stockAdjustments")) {
      this.conversions = [];
    }
    if (categories.includes("products")) {
      this.materials = [];
      this.categories = [];
      this.subCategories = [];
      this.productNames = [];
      this.hsnCodes = [];
      this.hsnDescriptions = {};
    }
    if (categories.includes("contacts")) {
      this.contacts = [];
    }
    if (categories.includes("influencers")) {
      this.influencerRedemptions = [];
      this.loyaltyPrograms = [];
    }
    if (categories.includes("openingBalances")) {
      if (Array.isArray(this.ledgers)) {
        this.ledgers.forEach(l => {
          l.openingBalance = 0;
          l.balance = 0;
          l.balanceType = "Debit";
        });
      }
      if (Array.isArray(this.contacts)) {
        this.contacts.forEach(c => {
          c.openingBalance = 0;
          c.balance = 0;
          c.openingBalanceType = "Debit";
          if (c.openingBalances && typeof c.openingBalances === "object") {
            Object.keys(c.openingBalances).forEach(k => {
              c.openingBalances[k] = 0;
            });
          }
        });
      }
      if (Array.isArray(this.materials)) {
        this.materials.forEach(m => {
          m.openingStock = 0;
          if (Array.isArray(m.batches)) {
            m.batches.forEach(b => {
              b.openingStock = 0;
            });
          }
        });
        this.recomputeAllStocks();
      }
    }
    if (categories.includes("openingStock") && !categories.includes("openingBalances")) {
      if (Array.isArray(this.materials)) {
        this.materials.forEach(m => {
          m.openingStock = 0;
          if (Array.isArray(m.batches)) {
            m.batches.forEach(b => {
              b.openingStock = 0;
            });
          }
        });
        this.recomputeAllStocks();
      }
    }
    if (categories.includes("series")) {
      if (Array.isArray(this.seriesMaster)) {
        this.seriesMaster.forEach(s => {
          s.currentNumber = s.startFrom || 1;
        });
      }
    }

    this.saveState();
    this.notifyListeners();
  }

  deleteFinancialYear(companyId, fyId) {
    const targetCompanyId = companyId || this.getActiveCompanyId();
    if (!targetCompanyId) return { success: false, message: "No active company found." };

    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(targetCompanyId));
    if (!company) return { success: false, message: "Company not found." };

    company.financialYears = company.financialYears || [];
    if (company.financialYears.length <= 1) {
      return { success: false, message: "Cannot delete the only financial year. A company must have at least one financial year." };
    }

    const fyIndex = company.financialYears.findIndex(f => String(f.id) === String(fyId));
    if (fyIndex === -1) {
      return { success: false, message: "Financial Year not found in company." };
    }

    const deletedFy = company.financialYears[fyIndex];
    company.financialYears.splice(fyIndex, 1);

    // Remove from local storage
    const lsKey = `erp_company_data_${targetCompanyId}${fyId === 'default' ? '' : '_' + fyId}`;
    localStorage.removeItem(lsKey);

    // Save registered companies
    this.saveRegisteredCompanies(companies);

    // If active FY was the deleted one, switch to remaining FY
    const currentActiveFy = this.getActiveFyId();
    if (String(currentActiveFy) === String(fyId)) {
      const remainingFy = company.financialYears[company.financialYears.length - 1];
      this.setActiveFyId(remainingFy.id);
    }

    // Call server to delete file from disk and update companies.json
    const host = window.location.hostname || "localhost";
    const deleteApiUrl = (typeof window._getApiUrl === "function")
      ? window._getApiUrl(`/api/data/${targetCompanyId}/${fyId}`)
      : `http://${host}:3001/api/data/${targetCompanyId}/${fyId}`;
    fetch(deleteApiUrl, {
      method: "DELETE"
    }).catch(e => console.error("Server financial year delete failed:", e));

    this.loadState();
    this.notifyListeners();

    return { success: true, message: `Financial year '${deletedFy.name}' deleted successfully.` };
  }

  async deleteCompany(companyId) {
    const targetCompanyId = companyId || this.getActiveCompanyId();
    if (!targetCompanyId) return { success: false, message: "No active company found." };

    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(targetCompanyId));
    if (!company) return { success: false, message: "Company not found." };

    // 1. Remove all company data from local storage
    const years = company.financialYears || [];
    years.forEach(fy => {
      localStorage.removeItem(`erp_company_data_${targetCompanyId}${fy.id === 'default' ? '' : '_' + fy.id}`);
    });
    localStorage.removeItem(`erp_company_data_${targetCompanyId}`);
    localStorage.removeItem(`erp_users_${targetCompanyId}`);

    try {
      const allKeys = Object.keys(localStorage);
      for (const k of allKeys) {
        if (k.startsWith(`erp_company_data_${targetCompanyId}`) || k.startsWith(`erp_users_${targetCompanyId}`) || k === `erp_options_${targetCompanyId}` || k === `erp_hsn_${targetCompanyId}`) {
          localStorage.removeItem(k);
        }
      }
    } catch (e) {}

    // 2. Remove from registered companies in localStorage
    const updatedCompanies = companies.filter(c => String(c.id) !== String(targetCompanyId));
    localStorage.setItem("erp_companies", JSON.stringify(updatedCompanies));

    // 3. Call server to backup and delete from disk
    let serverRes = null;
    try {
      const host = window.location.hostname || "localhost";
      const apiUrl = (typeof window._getApiUrl === "function") 
        ? window._getApiUrl(`/api/companies/${targetCompanyId}`) 
        : `http://${host}:3001/api/companies/${targetCompanyId}`;
      
      const res = await fetch(apiUrl, { method: "DELETE" });
      serverRes = await res.json();
    } catch (err) {
      console.warn("Server company delete request failed:", err);
    }

    // 4. If current active company was deleted, clear active company
    if (String(this.getActiveCompanyId()) === String(targetCompanyId)) {
      this.setActiveCompanyId(null);
    }

    this.notifyListeners();

    return {
      success: true,
      message: serverRes?.message || `Company "${company.name}" has been backed up and deleted successfully.`,
      backupLocation: serverRes?.backupLocation,
      backedUpFiles: serverRes?.backedUpFiles
    };
  }

  updateFinancialYearDates(companyId, fyId, newStartDate, newEndDate) {
    const targetCompanyId = companyId || this.getActiveCompanyId();
    if (!targetCompanyId) return { success: false, message: "No active company found." };

    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(targetCompanyId));
    if (!company) return { success: false, message: "Company not found." };

    company.financialYears = company.financialYears || [];
    const targetFyId = fyId || this.getActiveFyId();
    const fy = company.financialYears.find(f => String(f.id) === String(targetFyId));

    if (fy) {
      if (newStartDate) fy.startDate = newStartDate;
      if (newEndDate) fy.endDate = newEndDate;
      // If it's the active FY or sole FY, also update company root fields
      if (company.financialYears.length === 1 || String(targetFyId) === String(this.getActiveFyId())) {
        if (newStartDate) company.financialYearStarts = newStartDate;
        if (newEndDate) company.financialYearEnds = newEndDate;
      }
    } else {
      if (newStartDate) company.financialYearStarts = newStartDate;
      if (newEndDate) company.financialYearEnds = newEndDate;
      if (company.financialYears.length === 0) {
        company.financialYears.push({
          id: "default",
          name: "Current F.Y",
          startDate: newStartDate || "2026-04-01",
          endDate: newEndDate || "2027-03-31"
        });
      }
    }

    this.saveRegisteredCompanies(companies);
    this.notifyListeners();

    return { success: true, message: "Financial year dates updated successfully." };
  }

  getCompanyState() {
    const activeCompanyId = this.getActiveCompanyId();
    const activeCompany = this.getRegisteredCompanies().find(c => c.id === activeCompanyId);
    return activeCompany ? (activeCompany.state || "KERALA").toUpperCase() : "KERALA";
  }

  getCompanyGstin() {
    const activeCompanyId = this.getActiveCompanyId();
    const activeCompany = this.getRegisteredCompanies().find(c => c.id === activeCompanyId);
    return activeCompany ? (activeCompany.gstin || "") : "";
  }

  isCompanyUnregistered() {
    const activeCompanyId = this.getActiveCompanyId();
    const activeCompany = this.getRegisteredCompanies().find(c => String(c.id) === String(activeCompanyId));
    if (!activeCompany) return false;
    return activeCompany.taxApplicable === "UNREGISTERED" || !activeCompany.gstin || activeCompany.isUnregistered === true;
  }

  getStateCodeFromNameOrGstin(stateNameOrGstin) {
    if (!stateNameOrGstin) return "";
    const str = String(stateNameOrGstin).trim().toUpperCase();

    if (/^\d{2}/.test(str)) {
      return str.substring(0, 2);
    }

    const stateMap = {
      "JAMMU AND KASHMIR": "01", "JK": "01",
      "HIMACHAL PRADESH": "02", "HP": "02",
      "PUNJAB": "03", "PB": "03",
      "CHANDIGARH": "04", "CH": "04",
      "UTTARAKHAND": "05", "UK": "05", "UA": "05",
      "HARYANA": "06", "HR": "06",
      "DELHI": "07", "DL": "07",
      "RAJASTHAN": "08", "RJ": "08",
      "UTTAR PRADESH": "09", "UP": "09",
      "BIHAR": "10", "BR": "10",
      "SIKKIM": "11", "SK": "11",
      "ARUNACHAL PRADESH": "12", "AR": "12",
      "NAGALAND": "13", "NL": "13",
      "MANIPUR": "14", "MN": "14",
      "MIZORAM": "15", "MZ": "15",
      "TRIPURA": "16", "TR": "16",
      "MEGHALAYA": "17", "ML": "17",
      "ASSAM": "18", "AS": "18",
      "WEST BENGAL": "19", "WB": "19",
      "JHARKHAND": "20", "JH": "20",
      "ODISHA": "21", "OR": "21", "OD": "21",
      "CHATTISGARH": "22", "CG": "22", "CT": "22",
      "MADHYA PRADESH": "23", "MP": "23",
      "GUJARAT": "24", "GJ": "24",
      "DAMAN AND DIU": "25", "DD": "25",
      "DADRA AND NAGAR HAVELI": "26", "DN": "26",
      "MAHARASHTRA": "27", "MH": "27",
      "ANDHRA PRADESH": "37", "AP": "37",
      "KARNATAKA": "29", "KA": "29",
      "GOA": "30", "GA": "30",
      "LAKSHADWEEP": "31", "LD": "31",
      "KERALA": "32", "KL": "32",
      "TAMIL NADU": "33", "TN": "33", "TAMILNADU": "33",
      "PUDUCHERRY": "34", "PY": "34", "PONDICHERRY": "34",
      "ANDAMAN AND NICOBAR ISLANDS": "35", "AN": "35",
      "TELANGANA": "36", "TS": "36", "TG": "36",
      "LADAKH": "38", "LA": "38"
    };

    const cleaned = str.replace(/^\d{2}\s*-\s*/, "").trim();
    return stateMap[cleaned] || "";
  }

  isInterstatePurchase(pur, supplier = null) {
    if (!pur) return false;

    // Explicit flags or tax types
    if (pur.isInterstate === true || String(pur.isInterstate).toLowerCase() === "true") return true;
    if (pur.isLocal === false || String(pur.isLocal).toLowerCase() === "false") return true;
    const taxType = String(pur.taxType || pur.gstType || "").toLowerCase();
    if (taxType === "igst" || taxType === "interstate" || taxType === "outstate") return true;

    // Series check
    const seriesId = pur.seriesId;
    const purSeries = seriesId ? (this.seriesMaster || []).find(s => s.id === seriesId) : null;
    if (purSeries) {
      const sType = String(purSeries.seriesType || "").toUpperCase();
      if (["INTERSTATE", "IGST", "OUTSTATE"].includes(sType)) return true;
      if (purSeries.ledgerCode === "L019") return true;
    }

    // Purchase ledger check
    if (pur.ledgerCode === "L019" || pur.purchaseLedgerCode === "L019" || pur.accountId === "L019") return true;

    // Item-level IGST check
    if (Array.isArray(pur.items)) {
      const hasIgst = pur.items.some(item => 
        (parseFloat(item.igst) > 0) || 
        (parseFloat(item.igstAmount) > 0) || 
        String(item.taxType || "").toLowerCase() === "igst"
      );
      if (hasIgst) return true;
    }

    // Contact/Supplier lookup
    if (!supplier && (pur.supplierId || pur.contactId)) {
      const suppId = pur.supplierId || pur.contactId;
      supplier = (this.contacts || []).find(c => c.id === suppId);
    }

    const compState = this.getCompanyState();
    const compGstin = this.getCompanyGstin();
    const compStateCode = this.getStateCodeFromNameOrGstin(compGstin) || this.getStateCodeFromNameOrGstin(compState) || "32";

    // Supplier GSTIN state code vs Company state code
    const supplierGstin = String(supplier?.gstin || pur.supplierGstin || pur.gstin || "").trim();
    if (supplierGstin.length >= 2 && /^\d{2}/.test(supplierGstin)) {
      const suppCode = supplierGstin.substring(0, 2);
      if (suppCode !== compStateCode) return true;
    }

    // Supplier or Purchase State name comparison
    const rawState = String(pur.state || supplier?.state || "").trim().toUpperCase();
    if (rawState) {
      const cleanedState = rawState.replace(/^\d{2}\s*-\s*/, "").trim();
      if (cleanedState && cleanedState !== compState) {
        const stateCode = this.getStateCodeFromNameOrGstin(cleanedState);
        if (!stateCode || stateCode !== compStateCode) {
          return true;
        }
      }
    }

    return false;
  }

  isInterstateSale(inv, customer = null) {
    if (!inv) return false;

    if (inv.isInterstate === true || String(inv.isInterstate).toLowerCase() === "true") return true;
    if (inv.isLocal === false || String(inv.isLocal).toLowerCase() === "false") return true;
    const taxType = String(inv.taxType || inv.gstType || "").toLowerCase();
    if (taxType === "igst" || taxType === "interstate" || taxType === "outstate") return true;

    const seriesId = inv.seriesId;
    const invSeries = seriesId ? (this.seriesMaster || []).find(s => s.id === seriesId) : null;
    if (invSeries) {
      const sType = String(invSeries.seriesType || "").toUpperCase();
      if (["INTERSTATE", "IGST", "OUTSTATE"].includes(sType)) return true;
    }

    if (Array.isArray(inv.items)) {
      const hasIgst = inv.items.some(item => 
        (parseFloat(item.igst) > 0) || 
        (parseFloat(item.igstAmount) > 0) || 
        String(item.taxType || "").toLowerCase() === "igst"
      );
      if (hasIgst) return true;
    }

    if (!customer && (inv.customerId || inv.contactId)) {
      const custId = inv.customerId || inv.contactId;
      customer = (this.contacts || []).find(c => c.id === custId);
    }

    const compState = this.getCompanyState();
    const compGstin = this.getCompanyGstin();
    const compStateCode = this.getStateCodeFromNameOrGstin(compGstin) || this.getStateCodeFromNameOrGstin(compState) || "32";

    const customerGstin = String(customer?.gstin || inv.customerGstin || inv.gstin || "").trim();
    if (customerGstin.length >= 2 && /^\d{2}/.test(customerGstin)) {
      const custCode = customerGstin.substring(0, 2);
      if (custCode !== compStateCode) return true;
    }

    const rawState = String(inv.state || customer?.state || "").trim().toUpperCase();
    if (rawState) {
      const cleanedState = rawState.replace(/^\d{2}\s*-\s*/, "").trim();
      if (cleanedState && cleanedState !== compState) {
        const stateCode = this.getStateCodeFromNameOrGstin(cleanedState);
        if (!stateCode || stateCode !== compStateCode) {
          return true;
        }
      }
    }

    return false;
  }

  isInterstateInvoice(inv, customer = null) {
    return this.isInterstateSale(inv, customer);
  }

  isInterstateSalesReturn(ret, customer = null) {
    return this.isInterstateSale(ret, customer);
  }

  isInterstatePurchaseReturn(pr, supplier = null) {
    return this.isInterstatePurchase(pr, supplier);
  }

  getLoginDate() {
    return localStorage.getItem("erp_login_date") || new Date().toISOString().split("T")[0];
  }

  setLoginDate(date) {
    // Ensure login date is not before the current financial year start date
    const fyStart = this.getActiveFinancialYearStartDate();
    if (fyStart && date < fyStart) {
      date = fyStart;
    }
    localStorage.setItem("erp_login_date", date);
  }

  createCompany(companyData) {
    const companies = this.getRegisteredCompanies();
    // Unique Company ID generation ensures new companies NEVER collide with existing company IDs (like ID 1 or METRO AGENCIES)
    const nextNumericId = companies.length > 0 ? Math.max(...companies.map(c => parseInt(c.id) || 0)) + 1 : 1;
    const timestampId = Date.now();
    const newId = String(companies.some(c => String(c.id) === "1") ? timestampId : nextNumericId);

    const newCompany = {
      id: newId,
      name: companyData.name || "",
      subName: companyData.subName || "",
      address: companyData.address || "",
      country: companyData.country || "INDIA",
      state: companyData.state || "KERALA",
      phone: companyData.phone || "",
      mobile: companyData.mobile || "",
      email: companyData.email || "",
      dlNo: companyData.dlNo || "",
      pincode: companyData.pincode || "",
      website: companyData.website || "",
      currencyName: companyData.currencyName || "Rupees",
      financialYearStarts: companyData.financialYearStarts || "",
      financialYearEnds: companyData.financialYearEnds || "",
      maintain: companyData.maintain || "Inventory with Accounts",
      taxApplicable: companyData.taxApplicable || "GST(Goods and Service TAX)",
      gstin: companyData.gstin || "",
      fssaiLicNo: companyData.fssaiLicNo || "",
      username: companyData.username || "admin",
      password: companyData.password || "123",
      serverUrl: companyData.serverUrl || "",
      users: companyData.users || [
        {
          id: "USR-1",
          username: companyData.username || "admin",
          password: companyData.password || "123",
          fullName: "Administrator",
          role: "Admin",
          status: "Active"
        }
      ]
    };
    companies.push(newCompany);
    this.saveRegisteredCompanies(companies);
    
    // Seed new company data
    const seedState = {
      materials: [],
      contacts: [],
      invoices: [],
      transactions: [],
      purchases: [],
      salesReturns: [],
      purchaseReturns: [],
      conversions: [],
      adminPassword: newCompany.password,
      accountGroups: JSON.parse(JSON.stringify(initialAccountGroups)),
      ledgers: JSON.parse(JSON.stringify(initialLedgers)),
      salesAdjustments: [
        { name: "FREIGHT", ledgerCode: "L030" },
        { name: "LOADING CHARGE", ledgerCode: "L032" },
        { name: "LOADING CHARGES", ledgerCode: "L032" },
        { name: "UNLOADING CHARGE AT SITE", ledgerCode: "L033" }
      ],
      purchaseAdjustments: [
        { name: "FREIGHT", ledgerCode: "L031" },
        { name: "UNLOADING CHARGE", ledgerCode: "L033" }
      ],
      units: JSON.parse(JSON.stringify(initialUnits)),
      options: {
        enableEmployeeSales: true,
        enableInfluencerSales: true,
        enableCess: true,
        enable4DigitHsn: true,
        enableCessInSalesBill: false
      },
      seriesMaster: []
    };
    localStorage.setItem(`erp_company_data_${newId}`, JSON.stringify(seedState));

    // Immediately sync company seed data to backend server disk
    const apiUrl = (typeof window._getApiUrl === "function") 
      ? window._getApiUrl(`/api/data/${newId}/default`) 
      : `http://${window.location.hostname || "localhost"}:3001/api/data/${newId}/default`;

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seedState)
    }).catch(e => console.error("Immediate company seed sync failed:", e));

    return newCompany;
  }

  checkAndMigrateLegacyData() {
    let companies = [];
    try {
      companies = this.getRegisteredCompanies();
    } catch (e) {}
    if (!companies || !Array.isArray(companies)) {
      companies = [];
    }
    const legacyState = localStorage.getItem("erp_building_materials_state");
    // Only perform migration if legacy single-company state exists and no companies are registered
    if (companies.length === 0 && legacyState) {
      const defaultCompany = {
        id: "1",
        name: "METRO AGENCIES",
        subName: "EASINESS IN BUSINESS",
        address: "POKKUNDU\nKURUMATHUR\nKANNUR - 670142",
        country: "INDIA",
        state: "KERALA",
        phone: "04602224904",
        mobile: "902087748",
        email: "info@metroagencies.com",
        dlNo: "DL-12345",
        pincode: "670142",
        website: "http://metroagencies.com",
        currencyName: "Rupees",
        financialYearStarts: "2026-04-01",
        financialYearEnds: "2027-03-31",
        maintain: "Inventory with Accounts",
        taxApplicable: "GST(Goods and Service TAX)",
        gstin: "32AFUPH3623R1ZX",
        fssaiLicNo: "FSSAI-889211",
        username: "admin",
        password: "123",
        users: [
          {
            id: "USR-1",
            username: "admin",
            password: "123",
            fullName: "Administrator",
            role: "Admin",
            status: "Active"
          }
        ]
      };
      this.saveRegisteredCompanies([defaultCompany]);
      localStorage.setItem("erp_company_data_1", legacyState);
      localStorage.removeItem("erp_building_materials_state");
    }
  }

  migrateLegacyTaxEntries() {
    if (!this.transactions) return;
    
    let stateChanged = false;
    const companyState = this.getCompanyState();

    this.transactions.forEach(tx => {
      const hasLegacyTax = tx.entries.some(e => e.accountId === "2200");
      if (!hasLegacyTax) return;

      // 1. Sales Invoice
      const inv = this.invoices.find(i => String(i.id) === String(tx.id) || (i.voucherNo && String(i.voucherNo) === String(tx.reference)));
      if (inv) {
        const customer = inv.contactId === "__CASH__" ? null : this.contacts.find(c => c.id === inv.contactId);
        const isKerala = !this.isInterstateSale(inv, customer);
        const taxGroups = {};
        (inv.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = getValidGstRate(item, mat, 18);
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          taxGroups[rate] += item.gstAmount || 0;
        });

        const totalCess = (inv.totalCess || 0) + (inv.additionalCess || 0);
        tx.entries = tx.entries.filter(e => e.accountId !== "2200");

        Object.keys(taxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = taxGroups[rateStr];
          if (gstAmt > 0) {
            if (isKerala) {
              const cgstAmt = gstAmt / 2;
              const sgstAmt = gstAmt / 2;
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
              tx.entries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: igstLedger, debit: 0, credit: gstAmt });
            }
          }
        });

        if (totalCess > 0) {
          tx.entries.push({ accountId: "2200", debit: 0, credit: totalCess });
        }
        stateChanged = true;
        return;
      }

      // 2. Purchase
      const pur = this.purchases.find(p => String(p.id) === String(tx.id) || (p.voucherNo && String(p.voucherNo) === String(tx.reference)));
      if (pur) {
        const isKerala = !this.isInterstatePurchase(pur);
        const taxGroups = {};
        (pur.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = getValidGstRate(item, mat, 18);
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          taxGroups[rate] += item.gstAmount || 0;
        });

        const totalCess = (pur.totalCess || 0) + (pur.additionalCess || 0);
        tx.entries = tx.entries.filter(e => e.accountId !== "2200");

        Object.keys(taxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = taxGroups[rateStr];
          if (gstAmt > 0) {
            if (isKerala) {
              const cgstAmt = gstAmt / 2;
              const sgstAmt = gstAmt / 2;
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: cgstLedger, debit: cgstAmt, credit: 0 });
              tx.entries.push({ accountId: sgstLedger, debit: sgstAmt, credit: 0 });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: igstLedger, debit: gstAmt, credit: 0 });
            }
          }
        });

        if (totalCess > 0) {
          tx.entries.push({ accountId: "2200", debit: totalCess, credit: 0 });
        }
        stateChanged = true;
        return;
      }

      // 3. Sales Return
      const sret = this.salesReturns?.find(r => String(r.id) === String(tx.id) || (r.voucherNo && String(r.voucherNo) === String(tx.reference)));
      if (sret) {
        const isKerala = (sret.state || companyState).toUpperCase() === companyState;
        const taxGroups = {};
        (sret.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = mat ? parseFloat(mat.taxRate || 18) : 18;
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          taxGroups[rate] += itemAmt * (rate / 100);
        });

        tx.entries = tx.entries.filter(e => e.accountId !== "2200");

        Object.keys(taxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = taxGroups[rateStr];
          if (gstAmt > 0) {
            if (isKerala) {
              const cgstAmt = gstAmt / 2;
              const sgstAmt = gstAmt / 2;
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: cgstLedger, debit: cgstAmt, credit: 0 });
              tx.entries.push({ accountId: sgstLedger, debit: sgstAmt, credit: 0 });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: igstLedger, debit: gstAmt, credit: 0 });
            }
          }
        });
        stateChanged = true;
        return;
      }

      // 4. Purchase Return
      const pret = this.purchaseReturns?.find(r => String(r.id) === String(tx.id) || (r.voucherNo && String(r.voucherNo) === String(tx.reference)));
      if (pret) {
        const isKerala = (pret.state || companyState).toUpperCase() === companyState;
        const taxGroups = {};
        (pret.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = mat ? parseFloat(mat.taxRate || 18) : 18;
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          const itemAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          taxGroups[rate] += itemAmt * (rate / 100);
        });

        tx.entries = tx.entries.filter(e => e.accountId !== "2200");

        Object.keys(taxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = taxGroups[rateStr];
          if (gstAmt > 0) {
            if (isKerala) {
              const cgstAmt = gstAmt / 2;
              const sgstAmt = gstAmt / 2;
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
              tx.entries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: igstLedger, debit: 0, credit: gstAmt });
            }
          }
        });
        stateChanged = true;
        return;
      }

      // Fallback
      const desc = (tx.description || "").toLowerCase();
      const isSales = desc.includes("sales") || desc.includes("invoice") || desc.includes("customer");
      const isReturn = desc.includes("return");
      
      const newEntries = [];
      tx.entries.forEach(entry => {
        if (entry.accountId === "2200") {
          const val = entry.debit || entry.credit || 0;
          if (val > 0) {
            const halfVal = val / 2;
            if (isSales) {
              if (isReturn) {
                const cgstLedger = this.getOrCreateDutiesAndTaxesLedger("Output CGST 9%");
                const sgstLedger = this.getOrCreateDutiesAndTaxesLedger("Output SGST 9%");
                newEntries.push({ accountId: cgstLedger, debit: halfVal, credit: 0 });
                newEntries.push({ accountId: sgstLedger, debit: halfVal, credit: 0 });
              } else {
                const cgstLedger = this.getOrCreateDutiesAndTaxesLedger("Output CGST 9%");
                const sgstLedger = this.getOrCreateDutiesAndTaxesLedger("Output SGST 9%");
                newEntries.push({ accountId: cgstLedger, debit: 0, credit: halfVal });
                newEntries.push({ accountId: sgstLedger, debit: 0, credit: halfVal });
              }
            } else {
              if (isReturn) {
                const cgstLedger = this.getOrCreateDutiesAndTaxesLedger("Input CGST 9%");
                const sgstLedger = this.getOrCreateDutiesAndTaxesLedger("Input SGST 9%");
                newEntries.push({ accountId: cgstLedger, debit: 0, credit: halfVal });
                newEntries.push({ accountId: sgstLedger, debit: 0, credit: halfVal });
              } else {
                const cgstLedger = this.getOrCreateDutiesAndTaxesLedger("Input CGST 9%");
                const sgstLedger = this.getOrCreateDutiesAndTaxesLedger("Input SGST 9%");
                newEntries.push({ accountId: cgstLedger, debit: halfVal, credit: 0 });
                newEntries.push({ accountId: sgstLedger, debit: halfVal, credit: 0 });
              }
            }
            stateChanged = true;
          } else {
            newEntries.push(entry);
          }
        } else {
          newEntries.push(entry);
        }
      });
      tx.entries = newEntries;
    });

    if (stateChanged) {
      this.saveState();
    }
  }

  resaveAllSalesAccounts() {
    this.migrateLegacyTaxEntries();
    this.rebuildAllTaxTransactions();
    this.saveState(true);
    return true;
  }

  rebuildAllTaxTransactions() {
    if (!this.transactions) return;
    
    let stateChanged = false;
    const companyState = this.getCompanyState();

    const purchasePrefixes = (this.seriesMaster || []).filter(s => s.txType === "Purchase").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
    purchasePrefixes.push("PR-", "LP-", "L-", "IPR-", "NPR-", "LPR-", "LP");

    const salesPrefixes = (this.seriesMaster || []).filter(s => s.txType === "Sales").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
    salesPrefixes.push("INV-", "IN-", "SA-", "LSL-", "ISL-", "NSL-");

    // 0. Global Scrubber for Corrupted '1010' (Cash In Hand) accounts
    // The old restoreInvoice bug forced '1010' into transactions regardless of payMode.
    // If a custom cash ledger exists, aggressively migrate all '1010' references to it.
    const customCashL = this.ledgers && this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
    if (customCashL) {
      this.transactions.forEach(tx => {
        if (tx.entries) {
          tx.entries.forEach(e => {
            if (e.accountId === "1010") {
              e.accountId = customCashL.code;
              stateChanged = true;
            }
          });
        }
      });
    }

    // Deduplicate any duplicate purchase/invoice transactions
    this.purchases.forEach(pur => {
      if (!pur) return;
      const pid = String(pur.id || "").trim().toUpperCase();
      const vno = String(pur.voucherNo || "").trim().toUpperCase();
      const rno = String(pur.refNo || "").trim().toUpperCase();
      const ino = String(pur.invoiceNo || "").trim().toUpperCase();

      const matchingTxs = this.transactions.filter(t => {
        if (!t || isManualVoucherOrReturn(t)) return false;
        const tid = String(t.id || "").trim().toUpperCase();
        const tvid = String(t.voucherId || "").trim().toUpperCase();
        const tref = String(t.reference || "").trim().toUpperCase();
        const tvno = String(t.voucherNo || "").trim().toUpperCase();
        const tdesc = String(t.description || "").trim().toUpperCase();
        if (tdesc.includes("SALES") || (!tdesc.includes("PURCHASE") && salesPrefixes.some(p => tid.startsWith(p) || tref.startsWith(p)))) return false;
        
        return (pid && (tid === pid || tvid === pid || tref === pid || tvno === pid)) || 
               (vno && (tref === vno || tvno === vno || tid === vno)) || 
               (rno && (tref === rno || tvno === rno || tid === rno)) || 
               (ino && (tref === ino || tvno === ino || tid === ino));
      });

      if (matchingTxs.length > 1) {
        const bestTx = matchingTxs.find(t => t.entries && t.entries.length > 2) ||
                       matchingTxs.find(t => t.voucherType === "PUR" || t.id === pur.id || t.voucherId === pur.id) ||
                       matchingTxs[0];
        const duplicatesToRemove = new Set(matchingTxs.filter(t => t !== bestTx).map(t => t.id));
        this.transactions = this.transactions.filter(t => !duplicatesToRemove.has(t.id));
        stateChanged = true;
      }
    });

    this.invoices.forEach(inv => {
      if (!inv) return;
      const iid = String(inv.id || "").trim().toUpperCase();
      const vno = String(inv.voucherNo || "").trim().toUpperCase();
      const rno = String(inv.refNo || "").trim().toUpperCase();

      const matchingTxs = this.transactions.filter(t => {
        if (!t || isManualVoucherOrReturn(t)) return false;
        const tid = String(t.id || "").trim().toUpperCase();
        const tvid = String(t.voucherId || "").trim().toUpperCase();
        const tref = String(t.reference || "").trim().toUpperCase();
        const tvno = String(t.voucherNo || "").trim().toUpperCase();
        const tdesc = String(t.description || "").trim().toUpperCase();
        if (tdesc.includes("PURCHASE") || (!tdesc.includes("SALES") && !tdesc.includes("INVOICE") && purchasePrefixes.some(p => tid.startsWith(p) || tref.startsWith(p)))) return false;
        
        return (iid && (tid === iid || tvid === iid || tref === iid || tvno === iid)) || 
               (vno && (tref === vno || tvno === vno || tid === vno || tref === `INVOICE ${vno}`)) || 
               (rno && (tref === rno || tvno === rno || tid === rno));
      });

      if (matchingTxs.length > 1) {
        const bestTx = matchingTxs.find(t => t.entries && t.entries.length > 2) ||
                       matchingTxs.find(t => t.voucherType === "SALE" || t.id === inv.id || t.voucherId === inv.id) ||
                       matchingTxs[0];
        const duplicatesToRemove = new Set(matchingTxs.filter(t => t !== bestTx).map(t => t.id));
        this.transactions = this.transactions.filter(t => !duplicatesToRemove.has(t.id));
        stateChanged = true;
      }
    });



    // 3. Re-append fresh tax entries or recreate transactions for active Invoices
    this.invoices.forEach(inv => {
      if (inv.isCancelled) return;
      this.recreateInvoiceTransaction(inv);
      stateChanged = true;
    });

    // 4. Re-append fresh tax entries or recreate transactions for active Purchases
    this.purchases.forEach(pur => {
      if (pur.isCancelled) return;
      this.recreatePurchaseTransaction(pur);
      stateChanged = true;
    });

    // 5. Re-append fresh tax entries for active Purchase Returns
    (this.purchaseReturns || []).forEach(pr => {
      const tx = this.transactions.find(t => {
        const tref = String(t.reference || "").toUpperCase();
        const tdesc = String(t.description || "").toUpperCase();
        const prid = String(pr.id || "").toUpperCase();
        return tref === `DEBIT NOTE ${prid}` || tref === `PURCHASE RETURN ${prid}` || tref === prid || tref.includes(prid);
      });

      if (tx) {
        // Strip existing GST entries first to avoid duplicates
        tx.entries = tx.entries.filter(entry => {
          const led = this.ledgers.find(l => l.code === entry.accountId);
          if (led) {
            const n = (led.name || "").toUpperCase();
            const g = (led.groupName || "").toUpperCase();
            const isPurchaseOrSalesAccount = g === "PURCHASE ACCOUNT" || g === "SALES ACCOUNT" || g === "PURCHASE ACCOUNTS" || g === "SALES ACCOUNTS" || n.includes("PURCHASE") || n.includes("SALES");
            if (isPurchaseOrSalesAccount) return true;
            const gstGroups = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
            const isGstGroup = gstGroups.includes(g) || g === "DUTIES & TAXES" || n.includes("CGST") || n.includes("SGST") || n.includes("IGST") || n.includes("CESS");
            return !isGstGroup;
          }
          return true;
        });

        const supplier = this.contacts.find(c => c.id === pr.contactId);
        const isLocal = (pr.state || (supplier && supplier.state) || companyState).toUpperCase() === companyState;
        const taxGroups = {};
        (pr.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = getValidGstRate(item, mat, 18);
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          let gstAmt = parseFloat(item.gstAmount);
          if (isNaN(gstAmt) || gstAmt === undefined || gstAmt === null) {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            gstAmt = (qty * price) * (rate / 100);
          }
          taxGroups[rate] += gstAmt;
        });

        Object.keys(taxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = taxGroups[rateStr];
          if (gstAmt > 0) {
            if (isLocal) {
              const cgstAmt = gstAmt / 2;
              const sgstAmt = gstAmt / 2;
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
              tx.entries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: igstLedger, debit: 0, credit: gstAmt });
            }
          }
        });
        stateChanged = true;
      }
    });

    // 6. Re-append fresh tax entries for active Sales Returns
    (this.salesReturns || []).forEach(sr => {
      const tx = this.transactions.find(t => {
        const tref = String(t.reference || "").toUpperCase();
        const tdesc = String(t.description || "").toUpperCase();
        const srid = String(sr.id || "").toUpperCase();
        return tref === `CREDIT NOTE ${srid}` || tref === `SALES RETURN ${srid}` || tref === srid || tref.includes(srid);
      });

      if (tx) {
        // Strip existing GST entries first to avoid duplicates
        tx.entries = tx.entries.filter(entry => {
          const led = this.ledgers.find(l => l.code === entry.accountId);
          if (led) {
            const n = (led.name || "").toUpperCase();
            const g = (led.groupName || "").toUpperCase();
            const isPurchaseOrSalesAccount = g === "PURCHASE ACCOUNT" || g === "SALES ACCOUNT" || g === "PURCHASE ACCOUNTS" || g === "SALES ACCOUNTS" || n.includes("PURCHASE") || n.includes("SALES");
            if (isPurchaseOrSalesAccount) return true;
            const gstGroups = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
            const isGstGroup = gstGroups.includes(g) || g === "DUTIES & TAXES" || n.includes("CGST") || n.includes("SGST") || n.includes("IGST") || n.includes("CESS");
            return !isGstGroup;
          }
          return true;
        });

        const customer = this.contacts.find(c => c.id === sr.contactId);
        const isLocal = (sr.state || (customer && customer.state) || companyState).toUpperCase() === companyState;
        const taxGroups = {};
        (sr.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = getValidGstRate(item, mat, 18);
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          let gstAmt = parseFloat(item.gstAmount);
          if (isNaN(gstAmt) || gstAmt === undefined || gstAmt === null) {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            gstAmt = (qty * price) * (rate / 100);
          }
          taxGroups[rate] += gstAmt;
        });

        Object.keys(taxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = taxGroups[rateStr];
          if (gstAmt > 0) {
            if (isLocal) {
              const cgstAmt = gstAmt / 2;
              const sgstAmt = gstAmt / 2;
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: cgstLedger, debit: cgstAmt, credit: 0 });
              tx.entries.push({ accountId: sgstLedger, debit: sgstAmt, credit: 0 });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
              tx.entries.push({ accountId: igstLedger, debit: gstAmt, credit: 0 });
            }
          }
        });
        stateChanged = true;
      }
    });

    if (stateChanged) {
      this.saveState(true);
    }
  }

  recreateInvoiceTransaction(inv) {
    if (!inv || inv.isCancelled) return;
    const iid = String(inv.id || "").trim().toUpperCase();
    const vno = String(inv.voucherNo || "").trim().toUpperCase();
    const rno = String(inv.refNo || "").trim().toUpperCase();
    const bno = String(inv.billNo || "").trim().toUpperCase();

    let customer = null;
    if (inv.contactId === "__CASH__") {
      customer = { id: "__CASH__", name: "CASH SALES" };
    } else {
      customer = (this.contacts || []).find(c => c.id === inv.contactId || c.id === inv.customerId);
    }
    const customerName = customer ? customer.name : "Customer";
    
    let payMode = inv.payMode || inv.paymode || "Cash";
    if (inv.contactId === "__CASH__" && payMode === "Credit") {
      payMode = "Cash";
    }
    let debitAccount = inv.siteName ? `${inv.contactId}::${inv.siteName}` : inv.contactId;
    if (payMode && payMode !== "Credit") {
      const payL = (this.ledgers || []).find(l => l.code === payMode || (l.name && l.name.toUpperCase() === payMode.toUpperCase()));
      if (payL) {
        debitAccount = payL.code;
      } else {
        const modeUpper = String(payMode).toUpperCase();
        if (modeUpper.includes("CASH")) {
          const cashL = (this.ledgers || []).find(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
          debitAccount = cashL ? cashL.code : "1010";
        } else {
          const bankL = (this.ledgers || []).find(l => l.groupName === "BANK ACCOUNTS" || String(l.name || "").toUpperCase().includes("BANK"));
          debitAccount = bankL ? bankL.code : "1020";
        }
      }
    }

    const sVoucherNo = inv.voucherNo || inv.id;
    let invSeries = inv.seriesId ? (this.seriesMaster || []).find(s => s.id === inv.seriesId) : null;
    if (!invSeries && sVoucherNo) {
      const vnoUpper = String(sVoucherNo).trim().toUpperCase();
      invSeries = (this.seriesMaster || []).find(s => s.txType === "Sales" && s.prefix && vnoUpper.startsWith(String(s.prefix).toUpperCase()));
    }
    const seriesType = invSeries ? invSeries.seriesType : "LOCAL";
    let salesCreditLedger = invSeries ? invSeries.ledgerCode : null;
    if (!salesCreditLedger) {
      if (seriesType === "INTERSTATE") salesCreditLedger = "L023";
      else if (seriesType === "NONTAXABLE") salesCreditLedger = "L025";
      else salesCreditLedger = "L022";
    }

    let salesCredit = 0;
    const taxGroups = {};
    const isKerala = !this.isInterstateSale(inv, customer);

    if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
      inv.items.forEach(item => {
        const mat = this.materials ? this.materials.find(m => m.id === item.materialId) : null;
        const rate = seriesType === "NONTAXABLE" ? 0 : getValidGstRate(item, mat, 18);
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const amt = qty * price;
        const disP = parseFloat(item.discountPercent) || 0;
        const disA = item.discountAmount !== undefined ? parseFloat(item.discountAmount) : (amt * (disP / 100));
        const netVal = item.netValue !== undefined ? parseFloat(item.netValue) : (amt - disA);
        
        salesCredit += netVal;

        if (rate > 0) {
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          let gstAmt = parseFloat(item.gstAmount);
          if (isNaN(gstAmt) || gstAmt === undefined || gstAmt === null || (gstAmt === 0 && rate > 0)) {
            gstAmt = netVal * (rate / 100);
          }
          taxGroups[rate] += parseFloat(gstAmt) || 0;
        }
      });
      salesCredit = parseFloat(salesCredit.toFixed(2));
    } else {
      const discountVal = parseFloat((inv.totalDiscount !== undefined ? inv.totalDiscount : (inv.discountAmount || inv.discount || 0))).toFixed(2);
      salesCredit = parseFloat(((inv.subtotal || 0) - (parseFloat(discountVal) || 0)).toFixed(2));
    }

    const totalDebit = parseFloat((inv.total || 0).toFixed(2));

    const salesEntries = [
      { accountId: debitAccount, debit: totalDebit, credit: 0 },
      { accountId: salesCreditLedger, debit: 0, credit: salesCredit }
    ];

    let totalGst = 0;
    Object.keys(taxGroups).forEach(rateStr => {
      const rate = parseFloat(rateStr);
      const gstAmt = parseFloat(taxGroups[rateStr].toFixed(2));
      if (gstAmt > 0) {
        totalGst += gstAmt;
        if (isKerala) {
          const cgstAmt = parseFloat((gstAmt / 2).toFixed(2));
          const sgstAmt = parseFloat((gstAmt - cgstAmt).toFixed(2));
          const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          salesEntries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
          salesEntries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
        } else {
          const igstAmt = gstAmt;
          const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
          salesEntries.push({ accountId: igstLedger, debit: 0, credit: igstAmt });
        }
      }
    });

    const totalCess = parseFloat(((inv.totalCess || 0) + (inv.additionalCess || 0)).toFixed(2));
    if (totalCess > 0) {
      const cessL = (this.ledgers || []).find(l => l.groupName === "DUTIES & TAXES" && String(l.name || "").toUpperCase().includes("CESS"));
      const cessCode = cessL ? cessL.code : "2200";
      salesEntries.push({ accountId: cessCode, debit: 0, credit: totalCess });
    }

    let adjTotal = 0;
    if (inv.adjustmentsList && Array.isArray(inv.adjustmentsList) && inv.adjustmentsList.length > 0) {
      inv.adjustmentsList.forEach(a => {
        const amt = parseFloat(parseFloat(a.amount || 0).toFixed(2));
        if (amt > 0) {
          let ledgerCode = a.ledgerCode;
          if (!ledgerCode || ledgerCode === "L002") {
            const nameUpper = String(a.name || "").toUpperCase();
            if (nameUpper.includes("LOADING")) ledgerCode = "L032";
            else if (nameUpper.includes("UNLOADING")) ledgerCode = "L033";
            else if (nameUpper.includes("FREIGHT")) ledgerCode = "L030";
            else {
              const master = (this.salesAdjustments || []).find(m => String(m.name || "").toUpperCase() === nameUpper);
              ledgerCode = master ? master.ledgerCode : "L002";
            }
            a.ledgerCode = ledgerCode;
          }
          if (a.type === "Add") {
            salesEntries.push({ accountId: ledgerCode, debit: 0, credit: amt });
            adjTotal += amt;
          } else {
            salesEntries.push({ accountId: ledgerCode, debit: amt, credit: 0 });
            adjTotal -= amt;
          }
        }
      });
    } else if (inv.adjustments && parseFloat(inv.adjustments) !== 0) {
      const adjVal = parseFloat(inv.adjustments);
      adjTotal += adjVal;
      const shippingL = (this.ledgers || []).find(l => String(l.name || "").toUpperCase().includes("SHIPPING") || l.code === "4200");
      const shippingCode = shippingL ? shippingL.code : "4200";
      if (adjVal > 0) {
        salesEntries.push({ accountId: shippingCode, debit: 0, credit: Math.abs(adjVal) });
      } else {
        salesEntries.push({ accountId: shippingCode, debit: Math.abs(adjVal), credit: 0 });
      }
    }

    const unroundedTotal = parseFloat((salesCredit + totalGst + totalCess + adjTotal).toFixed(2));
    const targetTotal = totalDebit || Math.round(unroundedTotal);
    const trueRoundOff = parseFloat((targetTotal - unroundedTotal).toFixed(2));

    inv.roundOff = trueRoundOff;

    const roundCode = this.getOrCreateRoundOffLedger();
    if (trueRoundOff > 0) {
      salesEntries.push({ accountId: roundCode, debit: 0, credit: trueRoundOff });
    } else if (trueRoundOff < 0) {
      salesEntries.push({ accountId: roundCode, debit: Math.abs(trueRoundOff), credit: 0 });
    }

    const matchingTxs = this.transactions.filter(t => {
      if (!t) return false;
      const tid = String(t.id || "").trim().toUpperCase();
      const tvid = String(t.voucherId || "").trim().toUpperCase();
      const tref = String(t.reference || "").trim().toUpperCase();
      const tvno = String(t.voucherNo || "").trim().toUpperCase();
      const tdesc = String(t.description || "").trim().toUpperCase();

      if (isManualVoucherOrReturn(t) || tdesc.includes("COST OF GOODS SOLD") || tref.includes("COGS")) return false;

      return (tvid && tvid === iid) ||
             (tid && tid === iid) ||
             (vno && (tvno === vno || tref === vno || tref === `INVOICE ${vno}`)) ||
             (iid && (tvno === iid || tref === iid || tref === `INVOICE ${iid}`)) ||
             (rno && (tref === rno || tvno === rno));
    });

    if (matchingTxs.length > 0) {
      const bestTx = matchingTxs.find(t => t.entries && t.entries.length > 2) ||
                     matchingTxs.find(t => t.voucherType === "SALE" || t.id === inv.id || t.voucherId === inv.id) ||
                     matchingTxs[0];

      bestTx.id = inv.id;
      bestTx.voucherId = inv.id;
      bestTx.voucherType = "SALE";
      bestTx.voucherNo = sVoucherNo;
      bestTx.date = inv.date;
      bestTx.reference = sVoucherNo;
      bestTx.description = inv.narration || "";
      bestTx.siteName = inv.siteName || "";
      bestTx.entries = salesEntries;

      if (matchingTxs.length > 1) {
        const dupIds = new Set(matchingTxs.filter(t => t !== bestTx).map(t => t.id));
        this.transactions = this.transactions.filter(t => !dupIds.has(t.id));
      }
    } else {
      this.transactions.push({
        id: inv.id,
        voucherId: inv.id,
        voucherType: "SALE",
        voucherNo: sVoucherNo,
        date: inv.date,
        reference: sVoucherNo,
        description: inv.narration || "",
        siteName: inv.siteName || "",
        entries: salesEntries
      });
    }
  }

  cleanDuplicateTransactions() {
    if (!this.transactions || !Array.isArray(this.transactions)) return;
    let stateChanged = false;

    // 0a. Comprehensive Invoice Deduplication (exact ID match only)
    if (this.invoices && Array.isArray(this.invoices) && this.invoices.length > 0) {
      const seenInvIds = new Set();
      const cleanInvs = [];
      this.invoices.forEach(inv => {
        if (!inv) return;
        const id = String(inv.id || "").trim();
        if (id) {
          if (!seenInvIds.has(id)) {
            seenInvIds.add(id);
            cleanInvs.push(inv);
          } else {
            stateChanged = true;
          }
        } else {
          cleanInvs.push(inv);
        }
      });
      if (cleanInvs.length !== this.invoices.length) {
        this.invoices = cleanInvs;
        stateChanged = true;
      }
    }

    // 0b. Comprehensive Purchase Deduplication (exact ID match only)
    if (this.purchases && Array.isArray(this.purchases) && this.purchases.length > 0) {
      const seenPurIds = new Set();
      const cleanPurs = [];
      this.purchases.forEach(pur => {
        if (!pur) return;
        const id = String(pur.id || "").trim();
        if (id) {
          if (!seenPurIds.has(id)) {
            seenPurIds.add(id);
            cleanPurs.push(pur);
          } else {
            stateChanged = true;
          }
        } else {
          cleanPurs.push(pur);
        }
      });
      if (cleanPurs.length !== this.purchases.length) {
        this.purchases = cleanPurs;
        stateChanged = true;
      }
    }

    // Exact ID deduplication pass (only remove exact duplicate ID instances)
    const seenTxIds = new Set();
    const cleanTransactions = [];

    this.transactions.forEach(tx => {
      if (!tx) return;
      const tid = String(tx.id || "").trim();
      if (tid) {
        if (!seenTxIds.has(tid)) {
          seenTxIds.add(tid);
          cleanTransactions.push(tx);
        } else {
          stateChanged = true;
        }
      } else {
        cleanTransactions.push(tx);
      }
    });

    if (cleanTransactions.length !== this.transactions.length) {
      this.transactions = cleanTransactions;
      stateChanged = true;
    }

    // 4. Round-off ledger entry repair pass: re-assign entries misallocated to "5600" for round-off to canonical round-off ledger
    const canonicalRoundCode = this.getOrCreateRoundOffLedger();
    if (this.transactions && Array.isArray(this.transactions)) {
      this.transactions.forEach(t => {
        if (t && Array.isArray(t.entries)) {
          const desc = String(t.description || "").toUpperCase();
          const ref = String(t.reference || "").toUpperCase();
          const vType = String(t.voucherType || "").toUpperCase();
          const isDocTx = vType.includes("SALE") || vType.includes("PURCHASE") || vType.includes("RETURN") ||
                          desc.includes("INVOICE") || desc.includes("PURCHASE") || desc.includes("RETURN") ||
                          ref.includes("INV") || ref.includes("PUR") || ref.includes("RET") || ref.includes("CN-") || ref.includes("DN-");
          
          t.entries.forEach(entry => {
            if (entry && entry.accountId === "5600") {
              const officeExpLedger = (this.ledgers || []).find(l => l.code === "5600");
              const officeExpName = String(officeExpLedger ? officeExpLedger.name : "").toUpperCase();
              if (officeExpName.includes("ROUND") || isDocTx) {
                entry.accountId = canonicalRoundCode;
                stateChanged = true;
              }
            }
          });
        }
      });
    }

    // 5. Sync all invoice & purchase transactions to recalculate exact mathematical roundOff values
    if (this.invoices && Array.isArray(this.invoices)) {
      this.invoices.forEach(inv => {
        if (inv && !inv.isCancelled && inv.items && inv.items.length > 0) {
          this.recreateInvoiceTransaction(inv);
        }
      });
    }
    if (this.purchases && Array.isArray(this.purchases)) {
      this.purchases.forEach(pur => {
        if (pur && !pur.isCancelled && pur.items && pur.items.length > 0) {
          this.recreatePurchaseTransaction(pur);
        }
      });
    }

    if (stateChanged) {
      this.saveState(true);
    }
  }

  recreatePurchaseTransaction(pur) {
    if (!pur || pur.isCancelled) return;
    const pid = String(pur.id || "").trim().toUpperCase();
    const vno = String(pur.voucherNo || "").trim().toUpperCase();
    const rno = String(pur.refNo || "").trim().toUpperCase();
    const ino = String(pur.invoiceNo || "").trim().toUpperCase();

    const sId = pur.contactId || pur.supplierId;
    const supplier = this.contacts.find(c => c.id === sId);
    const supplierName = supplier ? supplier.name : (pur.contactName || pur.supplierName || "Supplier");
    
    let creditAccount = pur.siteName ? `${sId}::${pur.siteName}` : sId;
    if (pur.payMode && pur.payMode !== "Credit") {
      const payL = this.ledgers.find(l => l.code === pur.payMode || (l.name && l.name.toUpperCase() === pur.payMode.toUpperCase()));
      if (payL) {
        creditAccount = payL.code;
      } else {
        const modeUpper = String(pur.payMode).toUpperCase();
        if (modeUpper.includes("CASH")) {
          const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
          creditAccount = cashL ? cashL.code : "1010";
        } else {
          const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || String(l.name || "").toUpperCase().includes("BANK"));
          creditAccount = bankL ? bankL.code : "1020";
        }
      }
    }

    const pVoucherNo = pur.voucherNo || pur.id;
    let purchaseDebitLedger = "L018";
    const purSeries = this.seriesMaster?.find(s => s.id === pur.seriesId);
    const seriesType = purSeries ? purSeries.seriesType : "LOCAL";
    const isInterstate = this.isInterstatePurchase(pur, supplier);
    const isKerala = !isInterstate;

    if (purSeries && purSeries.ledgerCode) {
      purchaseDebitLedger = purSeries.ledgerCode;
    } else {
      if (isInterstate || seriesType === "INTERSTATE" || seriesType === "IGST" || seriesType === "OUTSTATE") {
        const l = this.ledgers.find(x => x.name && (x.name.toUpperCase() === "IGST PURCHASE" || x.name.toUpperCase() === "INTERSTATE PURCHASE"));
        purchaseDebitLedger = l ? (l.code || l.id) : "L019";
      } else if (seriesType === "NONTAXABLE") {
        const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE PURCHASE");
        purchaseDebitLedger = l ? (l.code || l.id) : "L021";
      } else {
        const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "LOCAL PURCHASE");
        purchaseDebitLedger = l ? (l.code || l.id) : "L018";
      }
    }

    let purchaseDebit = 0;
    const taxGroups = {};

    if (pur.items && Array.isArray(pur.items) && pur.items.length > 0) {
      pur.items.forEach(item => {
        const mat = (this.materials || []).find(m => m.id === item.materialId);
        const rate = getValidGstRate(item, mat, 18);
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const amt = qty * price;
        const disP = parseFloat(item.discountPercent) || 0;
        const disA = item.discountAmount !== undefined ? parseFloat(item.discountAmount) : (amt * (disP / 100));
        const netVal = item.netValue !== undefined ? parseFloat(item.netValue) : (amt - disA);
        
        purchaseDebit += netVal;

        if (rate > 0) {
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          let gstAmt = parseFloat(item.gstAmount);
          if (isNaN(gstAmt) || gstAmt === undefined || gstAmt === null) {
            gstAmt = netVal * (rate / 100);
          }
          taxGroups[rate] += parseFloat(gstAmt) || 0;
        }
      });
      purchaseDebit = parseFloat(purchaseDebit.toFixed(2));
    } else {
      const subtotal = parseFloat(pur.subtotal) || 0;
      const totalDiscount = parseFloat(pur.totalDiscount || pur.discount) || 0;
      purchaseDebit = parseFloat((subtotal - totalDiscount).toFixed(2));
    }

    const targetTotal = parseFloat((pur.total || 0).toFixed(2));

    const purchaseEntries = [
      { accountId: purchaseDebitLedger, debit: purchaseDebit, credit: 0 },
      { accountId: creditAccount, debit: 0, credit: targetTotal }
    ];

    let totalGst = 0;
    Object.keys(taxGroups).forEach(rateStr => {
      const rate = parseFloat(rateStr);
      const gstAmt = parseFloat(taxGroups[rateStr].toFixed(2));
      if (gstAmt > 0) {
        totalGst += gstAmt;
        if (isKerala) {
          const cgstAmt = parseFloat((gstAmt / 2).toFixed(2));
          const sgstAmt = parseFloat((gstAmt - cgstAmt).toFixed(2));
          const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          purchaseEntries.push({ accountId: cgstLedger, debit: cgstAmt, credit: 0 });
          purchaseEntries.push({ accountId: sgstLedger, debit: sgstAmt, credit: 0 });
        } else {
          const igstAmt = gstAmt;
          const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
          purchaseEntries.push({ accountId: igstLedger, debit: igstAmt, credit: 0 });
        }
      }
    });

    const totalCess = parseFloat(((pur.totalCess || 0) + (pur.additionalCess || 0)).toFixed(2));
    if (totalCess > 0) {
      purchaseEntries.push({ accountId: "2200", debit: totalCess, credit: 0 });
    }

    let adjTotal = 0;
    if (pur.adjustmentsList && Array.isArray(pur.adjustmentsList) && pur.adjustmentsList.length > 0) {
      pur.adjustmentsList.forEach(a => {
        const amt = parseFloat(parseFloat(a.amount || 0).toFixed(2));
        if (amt > 0) {
          let ledgerCode = a.ledgerCode;
          if (!ledgerCode) {
            const master = this.purchaseAdjustments?.find(m => m.name.toUpperCase() === a.name.toUpperCase());
            ledgerCode = master ? master.ledgerCode : "5200";
          }
          if (a.type === "Add") {
            purchaseEntries.push({ accountId: ledgerCode, debit: amt, credit: 0 });
            adjTotal += amt;
          } else {
            purchaseEntries.push({ accountId: ledgerCode, debit: 0, credit: amt });
            adjTotal -= amt;
          }
        }
      });
    } else {
      const adjustments = parseFloat(pur.adjustments) || 0;
      if (adjustments !== 0) {
        const shippingL = (this.ledgers || []).find(l => String(l.name || "").toUpperCase().includes("SHIPPING") || l.code === "5200" || String(l.name || "").toUpperCase().includes("TRANSPORT"));
        const shippingCode = shippingL ? shippingL.code : "5200";
        if (adjustments > 0) {
          purchaseEntries.push({ accountId: shippingCode, debit: adjustments, credit: 0 });
          adjTotal += adjustments;
        } else {
          purchaseEntries.push({ accountId: shippingCode, debit: 0, credit: Math.abs(adjustments) });
          adjTotal -= Math.abs(adjustments);
        }
      }
    }

    const unroundedTotal = parseFloat((purchaseDebit + totalGst + totalCess + adjTotal).toFixed(2));
    const trueRoundOff = parseFloat((targetTotal - unroundedTotal).toFixed(2));

    pur.roundOff = trueRoundOff;

    const roundCode = this.getOrCreateRoundOffLedger();
    if (trueRoundOff > 0) {
      purchaseEntries.push({ accountId: roundCode, debit: trueRoundOff, credit: 0 });
    } else if (trueRoundOff < 0) {
      purchaseEntries.push({ accountId: roundCode, debit: 0, credit: Math.abs(trueRoundOff) });
    }

    const matchingTxs = this.transactions.filter(t => {
      if (!t || isManualVoucherOrReturn(t)) return false;
      const tid = String(t.id || "").trim().toUpperCase();
      const tvid = String(t.voucherId || "").trim().toUpperCase();
      const tref = String(t.reference || "").trim().toUpperCase();
      const tvno = String(t.voucherNo || "").trim().toUpperCase();
      const tdesc = String(t.description || "").trim().toUpperCase();

      return (tvid && tvid === pid) ||
             (tid && tid === pid) ||
             (vno && (tvno === vno || tref === vno || tref === `PURCHASE ${vno}`)) ||
             (pid && (tvno === pid || tref === pid || tref === `PURCHASE ${pid}`)) ||
             (rno && (tref === rno || tvno === rno)) ||
             (ino && (tref === ino || tvno === ino));
    });

    if (matchingTxs.length > 0) {
      const bestTx = matchingTxs.find(t => t.entries && t.entries.length > 2) ||
                     matchingTxs.find(t => t.voucherType === "PUR" || t.id === pur.id || t.voucherId === pur.id) ||
                     matchingTxs[0];

      bestTx.id = pur.id;
      bestTx.voucherId = pur.id;
      bestTx.voucherType = "PUR";
      bestTx.voucherNo = pVoucherNo;
      bestTx.date = pur.date || new Date().toISOString().split("T")[0];
      bestTx.reference = pVoucherNo;
      bestTx.description = pur.narration || "";
      bestTx.siteName = pur.siteName || "";
      bestTx.entries = purchaseEntries;

      if (matchingTxs.length > 1) {
        const dupIds = new Set(matchingTxs.filter(t => t !== bestTx).map(t => t.id));
        this.transactions = this.transactions.filter(t => !dupIds.has(t.id));
      }
    } else {
      this.transactions.push({
        id: pur.id,
        voucherId: pur.id,
        voucherType: "PUR",
        voucherNo: pVoucherNo,
        date: pur.date || new Date().toISOString().split("T")[0],
        reference: pVoucherNo,
        description: pur.narration || "",
        siteName: pur.siteName || "",
        entries: purchaseEntries
      });
    }
  }

  alignVoucherPrefixesWithSeries() {
    if (!this.invoices || !this.purchases || !this.seriesMaster) return;

    let changed = false;

    // Unconditional direct migration for LP -> L prefix change on purchases
    this.purchases.forEach(pur => {
      if (!pur) return;
      const fields = ["voucherNo", "refNo", "id"];
      fields.forEach(field => {
        const val = pur[field];
        if (val && String(val).toUpperCase().startsWith("LP") && !String(val).toUpperCase().startsWith("LPR")) {
          const matchNum = String(val).match(/\d+$/);
          const numStr = matchNum ? matchNum[0] : "";
          const newVal = "L" + numStr;
          
          pur[field] = newVal;
          
          this.transactions.forEach(t => {
            if (isManualVoucherOrReturn(t)) return;
            if (t.reference === val) {
              t.reference = newVal;
              changed = true;
            }
            if (t.id === val) {
              t.id = newVal;
              changed = true;
            }
          });
          changed = true;
        }
      });
    });

    // 1. Align Invoices
    const sortedSalesSeries = (this.seriesMaster || [])
      .filter(s => s.txType === "Sales" && s.prefix)
      .sort((a, b) => (b.prefix || "").length - (a.prefix || "").length);

    this.invoices.forEach(inv => {
      if (!inv) return;
      let series = null;
      if (inv.seriesId) {
        series = this.seriesMaster.find(s => s.id === inv.seriesId);
      } else {
        const vnoStr = String(inv.voucherNo || inv.refNo || inv.id || "").toUpperCase();
        series = sortedSalesSeries.find(s => {
          const pref = (s.prefix || "").toUpperCase();
          return pref && vnoStr.startsWith(pref);
        });
        if (series) {
          inv.seriesId = series.id;
          changed = true;
        }
      }

      if (series && series.prefix) {
        const prefix = series.prefix;
        const prefixEscaped = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`^${prefixEscaped}\\d+$`, "i");
        
        const primaryNo = String(inv.id || inv.refNo || inv.voucherNo || "");
        if (primaryNo && regex.test(primaryNo)) {
          if (inv.voucherNo !== primaryNo) { inv.voucherNo = primaryNo; changed = true; }
          if (inv.refNo !== primaryNo) { inv.refNo = primaryNo; changed = true; }
          if (inv.id !== primaryNo) { inv.id = primaryNo; changed = true; }
        } else if (inv.seriesId) {
          // Only re-prefix if seriesId was explicitly specified for this invoice
          let oldVno = primaryNo;
          if (oldVno) {
            const matchNum = oldVno.match(/\d+$/);
            const numStr = matchNum ? matchNum[0] : "";
            const num = parseInt(numStr) || 1;
            const digits = parseInt(series.digits) || 4;
            const newVno = prefix + String(num).padStart(digits, '0');
            
            const prevId = inv.id;
            inv.id = newVno;
            inv.refNo = newVno;
            inv.voucherNo = newVno;
            
            this.transactions.forEach(t => {
              if (isManualVoucherOrReturn(t)) return;
              if (t.reference === oldVno || t.reference === prevId) {
                t.reference = newVno;
                changed = true;
              }
              if (t.reference === `${oldVno} COGS` || t.reference === `${prevId} COGS`) {
                t.reference = `${newVno} COGS`;
                changed = true;
              }
              if (t.id === oldVno || t.id === prevId) {
                t.id = newVno;
                changed = true;
              }
            });
            changed = true;
          }
        }
      }
    });

    // 2. Align Purchases
    const sortedPurSeries = (this.seriesMaster || [])
      .filter(s => s.txType === "Purchase" && s.prefix)
      .sort((a, b) => (b.prefix || "").length - (a.prefix || "").length);

    this.purchases.forEach(pur => {
      if (!pur) return;
      let series = null;
      if (pur.seriesId) {
        series = this.seriesMaster.find(s => s.id === pur.seriesId);
      } else {
        const vnoStr = String(pur.voucherNo || pur.id || "").toUpperCase();
        series = sortedPurSeries.find(s => {
          const pref = (s.prefix || "").toUpperCase();
          return pref && vnoStr.startsWith(pref);
        });
        if (series) {
          pur.seriesId = series.id;
          changed = true;
        }
      }

      if (series && series.prefix) {
        const prefix = series.prefix;
        const prefixEscaped = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`^${prefixEscaped}\\d+$`, "i");
        
        const primaryNo = String(pur.voucherNo || pur.id || "");
        if (primaryNo && regex.test(primaryNo)) {
          if (pur.voucherNo !== primaryNo) { pur.voucherNo = primaryNo; changed = true; }
        } else if (pur.seriesId) {
          let oldVno = primaryNo;
          if (oldVno) {
            const matchNum = oldVno.match(/\d+$/);
            const numStr = matchNum ? matchNum[0] : "";
            const num = parseInt(numStr) || 1;
            const digits = parseInt(series.digits) || 4;
            const newVno = prefix + String(num).padStart(digits, '0');

            const prevVno = pur.voucherNo;
            pur.voucherNo = newVno;

            this.transactions.forEach(t => {
              if (isManualVoucherOrReturn(t)) return;
              if (t.reference === oldVno || (prevVno && t.reference === prevVno)) {
                t.reference = newVno;
                changed = true;
              }
              if (t.id === oldVno || (prevVno && t.id === prevVno)) {
                t.id = newVno;
                changed = true;
              }
            });
            changed = true;
          }
        }
      }
    });

    this.deduplicateAndEnforceUniqueInvoices(false);
    this.deduplicateAndEnforceUniquePurchases(false);

    if (changed) {
      this.saveState(true);
    }
  }

  deduplicateAndEnforceUniqueInvoices(shouldSave = true) {
    if (!this.invoices || !Array.isArray(this.invoices)) return;
    let changed = false;

    // Exact ID deduplication pass (only remove exact duplicate ID instances)
    const seenInvIds = new Set();
    const cleanInvs = [];

    this.invoices.forEach(inv => {
      if (!inv) return;
      const iid = String(inv.id || "").trim();
      if (iid) {
        if (!seenInvIds.has(iid)) {
          seenInvIds.add(iid);
          cleanInvs.push(inv);
        } else {
          changed = true;
        }
      } else {
        cleanInvs.push(inv);
      }
    });

    if (cleanInvs.length !== this.invoices.length) {
      this.invoices = cleanInvs;
      changed = true;
    }

    if (changed && shouldSave) {
      this.saveState(true);
    }
  }

  deduplicateAndEnforceUniquePurchases(shouldSave = true) {
    if (!this.purchases || !Array.isArray(this.purchases)) return;
    let changed = false;

    // Exact ID deduplication pass (only remove exact duplicate ID instances)
    const seenPurIds = new Set();
    const cleanPurs = [];

    this.purchases.forEach(pur => {
      if (!pur) return;
      const pid = String(pur.id || "").trim();
      if (pid) {
        if (!seenPurIds.has(pid)) {
          seenPurIds.add(pid);
          cleanPurs.push(pur);
        } else {
          changed = true;
        }
      } else {
        cleanPurs.push(pur);
      }
    });

    if (cleanPurs.length !== this.purchases.length) {
      this.purchases = cleanPurs;
      changed = true;
    }

    if (changed && shouldSave) {
      this.saveState(true);
    }
  }

  ensureStandardBaseLedgers() {
    if (!this.ledgers) this.ledgers = [];
    const baseCodes = ["L016","L018","L019","L020","L021","L022","L023","L024","L025"];
    const standardBaseLedgers = initialLedgers.filter(l => baseCodes.includes(l.code));
    
    let changed = false;

    standardBaseLedgers.forEach(stdL => {
      // User explicitly requested to remove INTERSTATE PURCHASE A/C
      if (stdL.code === "L019") return; 

      const conflictIdx = this.ledgers.findIndex(l => l.code === stdL.code);
      if (conflictIdx !== -1) {
        const conflict = this.ledgers[conflictIdx];
        if (conflict.name.toUpperCase() !== String(stdL.name || "").toUpperCase()) {
          // Relocate the conflicting ledger to a new ID
          let maxNum = 0;
          this.ledgers.forEach(l => {
            if (l.code && l.code.startsWith("L")) {
               const num = parseInt(l.code.substring(1));
               if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          });
          const newCode = `L${String(maxNum + 1).padStart(3, "0")}`;
          
          // Update gstMaster if it was a GST ledger
          if (this.gstMaster) {
            const gstMasterMatch = this.gstMaster.find(g => g.id === conflict.code);
            if (gstMasterMatch) gstMasterMatch.id = newCode;
          }
          
          // DO NOT blindly update tx.entries here, because it corrupts base ledger pointers.
          // healCorruptedBaseLedgers() will handle re-syncing the true base ledgers.

          conflict.code = newCode; 
          this.ledgers.push(JSON.parse(JSON.stringify(stdL)));
          changed = true;
        }
      } else {
        const nameIdx = this.ledgers.findIndex(l => String(l.name || "").toUpperCase() === String(stdL.name || "").toUpperCase());
        if (nameIdx === -1) {
          this.ledgers.push(JSON.parse(JSON.stringify(stdL)));
          changed = true;
        }
      }
    });

    // Handle user's explicit request to remove L019 completely
    const prevLen = this.ledgers.length;
    this.ledgers = this.ledgers.filter(l => l.code !== "L019");
    if (this.ledgers.length !== prevLen) {
      changed = true;
      // Remap series using L019 to L020
      if (this.seriesMaster) {
        this.seriesMaster.forEach(s => {
          if (s.ledgerCode === "L019") {
            s.ledgerCode = "L020";
            changed = true;
          }
        });
      }
      // Remap transactions using L019 to L020
      if (this.transactions) {
        this.transactions.forEach(tx => {
          if (tx.entries) {
            tx.entries.forEach(e => {
              if (e.accountId === "L019") {
                e.accountId = "L020";
                changed = true;
              }
            });
          }
        });
      }
    }

    if (changed) {
      this.saveState(true);
    }
  }

  healCorruptedBaseLedgers() {
    if (!this.transactions) return;
    let changed = false;

    const purchasePrefixes = (this.seriesMaster || []).filter(s => s.txType === "Purchase").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
    purchasePrefixes.push("PR-", "LP-", "L-", "IPR-", "NPR-", "LPR-", "LP");

    const salesPrefixes = (this.seriesMaster || []).filter(s => s.txType === "Sales").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
    salesPrefixes.push("INV-", "IN-", "SA-", "LSL-", "ISL-", "NSL-");

    this.transactions.forEach(tx => {
      if (!tx.entries || tx.entries.length < 2) return;
      const idUpper = String(tx.id || "").toUpperCase();
      const refUpper = String(tx.reference || "").toUpperCase();
      const descUpper = String(tx.description || "").toUpperCase();

      const isSales = salesPrefixes.some(p => idUpper.startsWith(p) || refUpper.startsWith(p)) || descUpper.includes("SALES") || descUpper.includes("INVOICE");
      const isPurchase = !isSales && (purchasePrefixes.some(p => idUpper.startsWith(p) || refUpper.startsWith(p)) || descUpper.includes("PURCHASE"));
      
      const isPurchaseReturn = refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("PURCHASE RETURN") || refUpper.startsWith("DN-") || descUpper.includes("PURCHASE RETURN");
      const isSalesReturn = refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("SALES RETURN") || refUpper.startsWith("CN-") || refUpper.startsWith("SR-") || descUpper.includes("SALES RETURN");

      if (isPurchaseReturn || isSalesReturn) return;

      if (isPurchase) {
        const baseLedgerCode = tx.entries[0].accountId;
        const baseLedger = this.ledgers.find(l => l.code === baseLedgerCode);
        if (!baseLedger || baseLedger.groupName.toUpperCase() === "DUTIES & TAXES") {
          const pur = (this.purchases || []).find(p => p.id === tx.id || p.voucherNo === tx.reference || p.refNo === tx.reference);
          let correctCode = "L016";
          if (pur && pur.seriesId) {
            const series = this.seriesMaster.find(s => s.id === pur.seriesId);
            if (series && series.ledgerCode) correctCode = series.ledgerCode;
          }
          if (tx.entries[0].accountId !== correctCode) {
            tx.entries[0].accountId = correctCode;
            changed = true;
          }
        }
      } else if (isSales) {
        const baseLedgerCode = tx.entries[1].accountId;
        const baseLedger = this.ledgers.find(l => l.code === baseLedgerCode);
        if (!baseLedger || baseLedger.groupName.toUpperCase() === "DUTIES & TAXES") {
          const inv = (this.invoices || []).find(i => i.id === tx.id || i.voucherNo === tx.reference);
          let correctCode = "L017";
          if (inv && inv.seriesId) {
            const series = this.seriesMaster.find(s => s.id === inv.seriesId);
            if (series && series.ledgerCode) correctCode = series.ledgerCode;
          }
          if (tx.entries[1].accountId !== correctCode) {
            tx.entries[1].accountId = correctCode;
            changed = true;
          }
        }
      }
    });

    if (changed) {
      this.saveState(true);
    }
  }

  ensureStandardGstLedgers() {
    if (!this.gstMaster) this.gstMaster = [];
    if (!this.ledgers) this.ledgers = [];

    const defaultGstEntries = [];
    const suffixes = ["0%", "2.5%", "5%", "6%", "9%", "12%", "14%", "18%", "28%"];
    
    const getPercent = (s) => parseFloat(s.replace("%", "")) || 0;

    const groups = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
    groups.forEach(g => {
      suffixes.forEach(s => {
        const isIgst = g.includes("IGST");
        const rateVal = getPercent(s);
        const isValidIgst = isIgst && [0, 5, 12, 18, 28].includes(rateVal);
        const isValidCgstSgst = !isIgst && [0, 2.5, 6, 9, 14].includes(rateVal);

        if (isValidIgst || isValidCgstSgst) {
          defaultGstEntries.push({
            name: `${g} ${s}`,
            percent: rateVal,
            accountGroup: g
          });
        }
      });
    });

    let stateChanged = false;

    // 1. Ensure all default/standard entries exist in gstMaster
    defaultGstEntries.forEach(de => {
      const exists = this.gstMaster.some(e => e.name.toUpperCase() === de.name.toUpperCase());
      if (!exists) {
        const id = "GST-" + String(this.gstMaster.length + 1).padStart(3, "0");
        this.gstMaster.push({
          id,
          name: de.name.toUpperCase(),
          percent: de.percent,
          accountGroup: de.accountGroup
        });
        stateChanged = true;
      }
    });

    // 2. Scan through all existing ledgers and prebuild/convert matching ones to gstMaster
    const gstGroups = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
    
    this.ledgers.forEach(l => {
      if (!l || !l.name || !l.groupName) return;
      const nameUpper = String(l.name || "").toUpperCase();
      const groupUpper = l.groupName.toUpperCase();
      
      let matchedGroup = gstGroups.find(g => nameUpper.includes(g) || groupUpper === g);
      
      if (matchedGroup || (groupUpper === "DUTIES & TAXES" && (nameUpper.includes("CGST") || nameUpper.includes("SGST") || nameUpper.includes("IGST")))) {
        if (!matchedGroup) {
          if (nameUpper.includes("INPUT")) {
            if (nameUpper.includes("CGST")) matchedGroup = "INPUT CGST";
            else if (nameUpper.includes("SGST")) matchedGroup = "INPUT SGST";
            else if (nameUpper.includes("IGST")) matchedGroup = "INPUT IGST";
          } else if (nameUpper.includes("OUTPUT")) {
            if (nameUpper.includes("CGST")) matchedGroup = "OUTPUT CGST";
            else if (nameUpper.includes("SGST")) matchedGroup = "OUTPUT SGST";
            else if (nameUpper.includes("IGST")) matchedGroup = "OUTPUT IGST";
          }
        }
        
        if (matchedGroup) {
          if (l.groupName.toUpperCase() !== matchedGroup) {
            l.groupName = matchedGroup;
            stateChanged = true;
          }
          
          const exists = this.gstMaster.some(e => e.name.toUpperCase() === nameUpper);
          if (!exists) {
            const matchPercent = nameUpper.match(/[\d.]+/);
            const rateVal = matchPercent ? parseFloat(matchPercent[0]) : 0;
            const id = "GST-" + String(this.gstMaster.length + 1).padStart(3, "0");
            this.gstMaster.push({
              id,
              name: nameUpper,
              percent: rateVal,
              accountGroup: matchedGroup
            });
            stateChanged = true;
          }
        }
      }
    });

    // 3. Ensure ledger accounts exist for all registered gstMaster entries
    this.gstMaster.forEach(entry => {
      let ledger = this.ledgers.find(l => l.name && String(l.name || "").toUpperCase() === entry.name.toUpperCase());
      if (!ledger) {
        let maxNum = 0;
        this.ledgers.forEach(l => {
          if (l.code && l.code.startsWith("L")) {
            const num = parseInt(l.code.substring(1));
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        const code = "L" + String(maxNum + 1).padStart(3, "0");
        ledger = {
          code,
          name: entry.name.toUpperCase(),
          groupName: entry.accountGroup.toUpperCase(),
          openingBalance: 0,
          balanceType: "Debit"
        };
        this.ledgers.push(ledger);
        stateChanged = true;
      } else {
        if (ledger.groupName && ledger.groupName.toUpperCase() !== entry.accountGroup.toUpperCase()) {
          ledger.groupName = entry.accountGroup.toUpperCase();
          stateChanged = true;
        }
      }
    });

    // Standardize & deduplicate standard GST duties & taxes ledgers
    const uniqueLedgersByName = {};
    const ledgerCodeMap = {};
    
    this.ledgers.forEach(l => {
      if (!l || !l.name) return;
      const nameUpper = String(l.name || "").toUpperCase();
      const isGst = l.groupName && ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST", "DUTIES & TAXES"].includes(l.groupName.toUpperCase());
      if (isGst) {
        if (!uniqueLedgersByName[nameUpper]) {
          uniqueLedgersByName[nameUpper] = l;
        } else {
          const existing = uniqueLedgersByName[nameUpper];
          const existingIsL = existing.code && existing.code.startsWith("L");
          const currentIsL = l.code && l.code.startsWith("L");
          
          if (!existingIsL && currentIsL) {
            ledgerCodeMap[existing.code] = l.code;
            uniqueLedgersByName[nameUpper] = l;
          } else {
            ledgerCodeMap[l.code] = existing.code;
          }
        }
      }
    });

    if (Object.keys(ledgerCodeMap).length > 0) {
      if (this.transactions) {
        this.transactions.forEach(t => {
          if (t.entries) {
            t.entries.forEach(e => {
              if (ledgerCodeMap[e.accountId]) {
                e.accountId = ledgerCodeMap[e.accountId];
              }
            });
          }
        });
      }
      const codesToRemove = new Set(Object.keys(ledgerCodeMap));
      this.ledgers = this.ledgers.filter(l => !codesToRemove.has(l.code));
      stateChanged = true;
    }

    if (stateChanged) {
      this.saveState();
    }
  }

  // Load from Firestore
  // Load from Firestore
  loadState(skipNotify = false) {
    try {
      const activeId = this.getActiveCompanyId();
      if (!activeId) {
        // Clear active variables if not logged in
        this.materials = [];
        this.contacts = [];
        this.invoices = [];
        this.transactions = [];
        this.purchases = [];
        this.salesReturns = [];
        this.purchaseReturns = [];
        this.conversions = [];
        this.adminPassword = "123";
        this.accountGroups = [];
        this.ledgers = [];
        this.units = [];
        this.seriesMaster = [];
        this.stockAdjustments = [];
        return;
      }

      let parsed = this._serverLoadedData || {};

      // Fire off background sync to ensure latest from Firebase without blocking init
      

      this.materials = parsed.materials || [];
      this.contacts = parsed.contacts || [];
      this.invoices = parsed.invoices || [];
      this.salesOrders = parsed.salesOrders || [];
      this.transactions = parsed.transactions || [];
      this.purchases = parsed.purchases || [];
      this.salesReturns = parsed.salesReturns || [];
      this.purchaseReturns = parsed.purchaseReturns || [];
      this.conversions = parsed.conversions || [];
      this.gstMaster = parsed.gstMaster || [];
      this.adminPassword = parsed.adminPassword || "123";
      this.accountGroups = parsed.accountGroups || [];
      
      this.salesAdjustments = parsed.salesAdjustments || [];
      this.purchaseAdjustments = parsed.purchaseAdjustments || [];
      this.units = parsed.units || [];
      this.options = parsed.options || {};
      this.influencers = parsed.influencers || [];
      this.influencerRedemptions = parsed.influencerRedemptions || [];
      this.loyaltyPrograms = parsed.loyaltyPrograms || [];
      this.hsnCodes = parsed.hsnCodes || [];
      this.hsnDescriptions = parsed.hsnDescriptions || {};
      this.stockAdjustments = parsed.stockAdjustments || [];
      this.productGroups = parsed.productGroups || [];
      this.categories = parsed.categories || [];
      this.subCategories = parsed.subCategories || [];
      this.productNames = parsed.productNames || [];
      this.seriesMaster = parsed.seriesMaster || [];
      this.headloaderProductIds = parsed.headloaderProductIds || [];
      this.headloaderTypes = (Array.isArray(parsed.headloaderTypes) && parsed.headloaderTypes.length > 0)
        ? parsed.headloaderTypes
        : [{ id: "std", name: "Standard", isDefault: true }];

      // Ensure default groups
      if (!this.accountGroups.some(g => g.name === "PURCHASE ACCOUNT")) {
        this.accountGroups.push({ id: "21", name: "PURCHASE ACCOUNT", under: "EXPENSE", isDefault: true });
      }
      if (!this.accountGroups.some(g => g.name === "SALES ACCOUNT")) {
        this.accountGroups.push({ id: "22", name: "SALES ACCOUNT", under: "INCOME", isDefault: true });
      }
      if (!this.accountGroups.some(g => g.name === "SUNDRY CREDITORS")) {
        this.accountGroups.push({ id: "29", name: "SUNDRY CREDITORS", under: "CURRENT LIABILITIES", isDefault: true });
      }
      if (!this.accountGroups.some(g => g.name === "SUNDRY DEBTORS")) {
        this.accountGroups.push({ id: "30", name: "SUNDRY DEBTORS", under: "CURRENT ASSETS", isDefault: true });
      }
      const prebuiltGroups = [
        { id: "23", name: "INPUT SGST", under: "DUTIES & TAXES" },
        { id: "24", name: "INPUT CGST", under: "DUTIES & TAXES" },
        { id: "25", name: "INPUT IGST", under: "DUTIES & TAXES" },
        { id: "26", name: "OUTPUT SGST", under: "DUTIES & TAXES" },
        { id: "27", name: "OUTPUT CGST", under: "DUTIES & TAXES" },
        { id: "28", name: "OUTPUT IGST", under: "DUTIES & TAXES" }
      ];
      prebuiltGroups.forEach(pg => {
        if (!this.accountGroups.some(g => g.name === pg.name)) {
          this.accountGroups.push({ ...pg, isDefault: true });
        }
      });

      // Enforce expected parents on default groups to correct custom modifications
        const expectedParents = {
          "PURCHASE ACCOUNT": "EXPENSE",
          "SALES ACCOUNT": "INCOME",
          "SUNDRY CREDITORS": "CURRENT LIABILITIES",
          "SUNDRY DEBTORS": "CURRENT ASSETS",
          "INPUT SGST": "DUTIES & TAXES",
          "INPUT CGST": "DUTIES & TAXES",
          "INPUT IGST": "DUTIES & TAXES",
          "OUTPUT SGST": "DUTIES & TAXES",
          "OUTPUT CGST": "DUTIES & TAXES",
          "OUTPUT IGST": "DUTIES & TAXES",
          "DUTIES & TAXES": "CURRENT LIABILITIES",
          "CURRENT ASSETS": "ASSETS",
          "CURRENT LIABILITIES": "LIABILITIES",
          "FIXED ASSETS": "ASSETS",
          "CAPITAL ACCOUNT": "EQUITY",
          "BANK ACCOUNTS": "CURRENT ASSETS",
          "CASH-IN-HAND": "CURRENT ASSETS",
          "DEPOSITS (ASSETS)": "CURRENT ASSETS",
          "LOANS & ADVANCES(ASSET)": "CURRENT ASSETS"
        };
        let groupStateChanged = false;
        this.accountGroups.forEach(g => {
          const key = String(g.name || "").toUpperCase();
          if (expectedParents[key] && (g.under || "").toUpperCase() !== expectedParents[key]) {
            g.under = expectedParents[key];
            groupStateChanged = true;
          }
        });
        if (groupStateChanged) {
          this.saveState();
        }

        this.ledgers = (parsed.ledgers || []).map(l => {
          if (l.name) l.name = String(l.name || "").toUpperCase();
          if (l.groupName) l.groupName = l.groupName.toUpperCase();
          return l;
        }).filter(l => l.code !== "L016" && l.name !== "PURCHASE A/C");

        // Ensure default group ADJUSTMENTS exists under CURRENT LIABILITIES
        if (!this.accountGroups.some(g => g.name === "ADJUSTMENTS")) {
          this.accountGroups.push({ id: "31", name: "ADJUSTMENTS", under: "CURRENT LIABILITIES", isDefault: true });
        }

        // Ensure default ledgers exist (excluding L016 Purchase A/C)
        const defaultLedgers = [
          { code: "L017", name: "SALES A/C", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
          { code: "L018", name: "LOCAL PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
          { code: "L019", name: "INTERSTATE PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
          { code: "L020", name: "IGST PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
          { code: "L021", name: "NON TAXABLE PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
          { code: "L022", name: "LOCAL SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
          { code: "L023", name: "INTERSTATE SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
          { code: "L024", name: "IGST SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
          { code: "L025", name: "NON TAXABLE SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
          // Built-in adjustments ledgers under ADJUSTMENTS group
          { code: "L030", name: "FREIGHT ON SALES", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
          { code: "L031", name: "FREIGHT ON PURCHASE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
          { code: "L032", name: "LOADING CHARGE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
          { code: "L033", name: "UNLOADING CHARGE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" }
        ];

        defaultLedgers.forEach(dl => {
          const exists = this.ledgers.some(l => l.name === dl.name);
          if (!exists) {
            let targetCode = dl.code;
            // If the code is already taken, generate a unique one
            if (this.ledgers.some(l => l.code === targetCode)) {
              let maxNum = 0;
              this.ledgers.forEach(l => {
                if (l.code && l.code.startsWith("L")) {
                  const num = parseInt(l.code.substring(1));
                  if (!isNaN(num) && num > maxNum) maxNum = num;
                }
              });
              targetCode = "L" + String(maxNum + 1).padStart(3, "0");
            }
            this.ledgers.push({
              code: targetCode,
              name: dl.name,
              groupName: dl.groupName,
              openingBalance: dl.openingBalance || 0,
              balanceType: dl.balanceType || "Debit"
            });
          }
        });

        // Resolve codes dynamically by name
        const getLedgerCodeByName = (name, fallbackCode) => {
          const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === name.toUpperCase());
          return l ? l.code : fallbackCode;
        };

        // Set up / enforce default sales adjustments affecting their respective ledgers
        this.salesAdjustments = [
          { name: "FREIGHT", ledgerCode: getLedgerCodeByName("FREIGHT ON SALES", "L030") },
          { name: "LOADING CHARGE", ledgerCode: getLedgerCodeByName("LOADING CHARGE", "L032") },
          { name: "LOADING CHARGES", ledgerCode: getLedgerCodeByName("LOADING CHARGE", "L032") },
          { name: "UNLOADING CHARGE AT SITE", ledgerCode: getLedgerCodeByName("UNLOADING CHARGE", "L033") }
        ];

        // Set up / enforce default purchase adjustments affecting their respective ledgers
        this.purchaseAdjustments = [
          { name: "FREIGHT", ledgerCode: getLedgerCodeByName("FREIGHT ON PURCHASE", "L031") },
          { name: "UNLOADING CHARGE", ledgerCode: getLedgerCodeByName("UNLOADING CHARGE", "L033") }
        ];

        // Enforce all new default base units exist in active company units
        this.units = parsed.units || [];
        const baseUnitsToEnsure = JSON.parse(JSON.stringify(initialUnits));
        baseUnitsToEnsure.forEach(bu => {
          if (!this.units.some(u => 
            (u.name && u.name.toUpperCase() === bu.name.toUpperCase()) || 
            (u.symbol && u.symbol.toUpperCase() === bu.symbol.toUpperCase())
          )) {
            this.units.push(bu);
          }
        });

        this.options = parsed.options || {
          enableEmployeeSales: true,
          enableInfluencerSales: true,
          enableCess: true,
          enable4DigitHsn: true
        };
        if (this.options.enable4DigitHsn === undefined) {
          this.options.enable4DigitHsn = true;
        }
        if (this.options.enableCessInSalesBill === undefined) {
          this.options.enableCessInSalesBill = false;
        }
        this.influencers = parsed.influencers || [
          { id: "INF-001", name: "Anil Architect", address: "Kochi, Kerala", mobile: "9876543210" },
          { id: "INF-002", name: "Modern Builders", address: "Aluva, Kerala", mobile: "9876543211" }
        ];
        this.seriesMaster = parsed.seriesMaster || [];
        this.ensureDefaultSeries();
        console.log("PURCHASE RETURNS LOADED:", parsed.purchaseReturns);
        console.log("ALL LEDGERS IN DB:", (parsed.ledgers || []).map(l => ({ code: l.code, name: l.name })));

        // Realign series currentNumber counters on load based on max existing voucher number (preserves historical bill numbers)
        this.realignSeriesCurrentNumbers();

        // AUTO-REPAIR DUPLICATE IDs
        const seenIds = new Set();
        let maxIdNum = 1000;
        if (this.transactions) {
          this.transactions.forEach(t => {
            const num = parseInt((t.id || "").replace("TX-", "")) || 0;
            if (num > maxIdNum) maxIdNum = num;
          });

          this.transactions.forEach(t => {
            if (!t.id || seenIds.has(t.id)) {
              maxIdNum++;
              const oldId = t.id;
              const newId = "TX-" + maxIdNum;
              t.id = newId;
              
              if (oldId) {
                // If it was a purchase transaction, update the purchase id to match the new transaction ID
                if (t.reference.toLowerCase().includes("purchase") || t.reference.toLowerCase().includes("bill")) {
                  const pur = this.purchases.find(p => p.id === oldId);
                  if (pur) pur.id = newId;
                } else if (t.reference.toLowerCase().includes("invoice") || t.reference.toLowerCase().includes("sales")) {
                  const inv = this.invoices.find(i => i.id === oldId);
                  if (inv) inv.id = newId;
                }
              }
            } else {
              seenIds.add(t.id);
            }
          });
        }


        this.repairVoucherNumbers();
        
        // Cleanup the ghost STAR-901 transaction if it exists in local storage
        const starIdx = this.transactions.findIndex(t => t.reference === "Bill STAR-901" || t.id === "TX-1002");
        if (starIdx !== -1) {
          this.transactions.splice(starIdx, 1);
          this.purchases = this.purchases.filter(p => p.refNo !== "STAR-901" && p.id !== "PR-1");
          const starSupplier = this.contacts.find(c => c.id === "CON-003");
          if (starSupplier && (starSupplier.balance === -2625.00 || starSupplier.balance === 2625.00)) {
            starSupplier.balance = 0.00;
          }
          this.saveState();
        }

        // Remove the auto-generated "Opening Balance" capital entry (TX-1001) â€” user did not create this
        const opBalIdx = this.transactions.findIndex(t => t.id === "TX-1001" || t.reference === "Opening Balance");
        if (opBalIdx !== -1) {
          this.transactions.splice(opBalIdx, 1);
          this.saveState();
        }

        this.repairMissingTransactions();
        
        
        this.productGroups = parsed.productGroups || ["Structural Supply", "Finishing Materials", "Plumbing & Fittings"];
        this.companies = parsed.companies || ["Ultratech", "Jindal", "Ambuja"];
        this.categories = parsed.categories || ["Cement", "Steel", "Sand", "Bricks", "Aggregates", "Other"];
        this.subCategories = parsed.subCategories || ["OPC 53", "TMT Reb", "River Sand"];
        this.productNames = parsed.productNames || [];
        this.hsnCodes = parsed.hsnCodes || ["2523", "7214", "2505", "6901", "2517"];
        this.stockAdjustments = parsed.stockAdjustments || [];

        // Self-healing metadata reconstruction from existing materials
        if (this.materials && this.materials.length > 0) {
          const uniqueNames = [...new Set(this.materials.map(m => m.name).filter(Boolean))];
          uniqueNames.forEach(name => {
            const clean = name.trim().toUpperCase();
            if (!this.productNames.map(x => String(x).toUpperCase()).includes(clean)) {
              this.productNames.push(clean);
            }
          });
          const uniqueGroups = [...new Set(this.materials.map(m => m.productGroup).filter(Boolean))];
          uniqueGroups.forEach(g => {
            if (!this.productGroups.includes(g)) this.productGroups.push(g);
          });
          const uniqueCos = [...new Set(this.materials.map(m => m.company).filter(Boolean))];
          uniqueCos.forEach(c => {
            if (!this.companies.includes(c)) this.companies.push(c);
          });
          const uniqueCats = [...new Set(this.materials.map(m => m.category).filter(Boolean))];
          uniqueCats.forEach(c => {
            if (!this.categories.includes(c)) this.categories.push(c);
          });
          const uniqueSubs = [...new Set(this.materials.map(m => m.subCategory).filter(Boolean))];
          uniqueSubs.forEach(s => {
            if (!this.subCategories.includes(s)) this.subCategories.push(s);
          });
        }

        // Ensure all loaded materials have the new Product Master parameters
        this.materials.forEach(m => this.applySchemaDefaults(m));

        // Deduplicate and enforce unique voucher numbers across all invoices and purchases
        this.deduplicateAndEnforceUniqueInvoices(false);
        this.deduplicateAndEnforceUniquePurchases(false);

        // Deduplicate any transactions across purchases and invoices
        this.cleanDuplicateTransactions();
        this.realignSeriesCurrentNumbers();

        // ── Migration: ensure Sales and Purchase series post to correct ledgers ──
        const localSalesLedger = this.ledgers.find(l =>
          l.name && (l.name.toUpperCase() === 'LOCAL SALES' || l.name.toUpperCase() === 'LOCAL SALES (CGST+SGST)')
        ) || { code: 'L0004' };
        const igstPurLedger = this.ledgers.find(l =>
          l.name && (l.name.toUpperCase() === 'IGST PURCHASE' || l.name.toUpperCase() === 'INTERSTATE PURCHASE')
        ) || { code: 'L0062' };
        const localPurLedger = this.ledgers.find(l => l.name && l.name.toUpperCase() === 'LOCAL PURCHASE') || { code: 'L0005' };

        const igstSeriesObj = (this.seriesMaster || []).find(s => s.id === 'SER-IGST-PURCHASE' || (s.txType === 'Purchase' && (s.seriesType === 'INTERSTATE' || s.seriesType === 'IGST')));
        const localSeriesObj = (this.seriesMaster || []).find(s => s.id === 'SER-LOCAL-PURCHASE' || (s.txType === 'Purchase' && s.seriesType === 'LOCAL'));
        const localSalesSeriesObjs = (this.seriesMaster || []).filter(s => s.txType === 'Sales' && (s.seriesType === 'LOCAL' || s.id === 'SER-LOCAL-SALES' || s.id === 'SER-B2B-SALES'));

        if (igstSeriesObj) igstSeriesObj.ledgerCode = igstPurLedger.code;
        if (localSeriesObj) localSeriesObj.ledgerCode = localPurLedger.code;
        if (localSalesSeriesObjs && localSalesSeriesObjs.length > 0) {
          localSalesSeriesObjs.forEach(s => {
            s.ledgerCode = localSalesLedger.code;
          });
        }

        const igstVoucherNos = new Set();
        const localVoucherNos = new Set();

        (this.purchases || []).forEach(p => {
          const isIgst = p.seriesId === 'SER-IGST-PURCHASE' ||
                         String(p.voucherNo || '').startsWith('IPR-') ||
                         (p.state && p.state.toUpperCase() !== 'KERALA') ||
                         (p.items && p.items.some(i => parseFloat(i.igst) > 0 || parseFloat(i.igstAmt) > 0 || parseFloat(i.igstRate) > 0));
          if (isIgst) {
            p.seriesId = 'SER-IGST-PURCHASE';
            if (p.voucherNo) igstVoucherNos.add(p.voucherNo);
            if (p.refNo) igstVoucherNos.add(p.refNo);
            if (p.id) igstVoucherNos.add(p.id);
          } else {
            p.seriesId = 'SER-LOCAL-PURCHASE';
            if (p.voucherNo) localVoucherNos.add(p.voucherNo);
            if (p.refNo) localVoucherNos.add(p.refNo);
            if (p.id) localVoucherNos.add(p.id);
          }
        });

        // Correct transaction entries
        for (const tx of (this.transactions || [])) {
          const ref = String(tx.reference || '').trim();
          for (const entry of (tx.entries || [])) {
            if (igstVoucherNos.has(ref) && entry.debit > 0 && !String(entry.accountId).startsWith('VEND') && !String(entry.accountId).startsWith('L003') && !String(entry.accountId).startsWith('L004') && entry.accountId !== 'L0012') {
              entry.accountId = igstPurLedger.code;
            } else if (localVoucherNos.has(ref) && entry.debit > 0 && !String(entry.accountId).startsWith('VEND') && !String(entry.accountId).startsWith('L003') && !String(entry.accountId).startsWith('L004') && entry.accountId !== 'L0012') {
              entry.accountId = localPurLedger.code;
            }
          }
        }

        // ── Migration: ensure Local Sales invoices post to LOCAL SALES ledger ──
        const localSalesVoucherNos = new Set();
        (this.invoices || []).forEach(inv => {
          const vNo = inv.voucherNo || inv.refNo || inv.id;
          if (vNo) localSalesVoucherNos.add(String(vNo).trim());
        });

        for (const tx of (this.transactions || [])) {
          const ref = String(tx.reference || "").trim();
          if (localSalesVoucherNos.has(ref) || ref.startsWith("LSL-") || ref.startsWith("B2B")) {
            for (const entry of (tx.entries || [])) {
              if (entry.credit > 0 && (entry.accountId === "L0005" || entry.accountId === "L022" || entry.accountId === "4100")) {
                entry.accountId = localSalesLedger.code;
              }
            }
          }
        }

        this.recomputeAllStocks();
        this.saveState();
        if (!skipNotify) {
          this.notifyListeners();
        }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }

  applySchemaDefaults(m) {
    m.code = m.code || m.id;
    m.barcode = m.barcode || "";
    m.eanCode = m.eanCode || "";
    m.productGroup = m.productGroup || "";
    m.company = m.company || "";
    m.subCategory = m.subCategory || "";
    m.hsnCode = m.hsnCode || "";
    m.description = m.description || "";
    m.productType = m.productType || "Goods";
    m.rackNo = m.rackNo || "";
    m.defaultDiscount = m.defaultDiscount !== undefined ? m.defaultDiscount : 0;
    m.alternateUnits = m.alternateUnits || [];
    m.loadingCharge = m.loadingCharge !== undefined ? parseFloat(m.loadingCharge) : 0;
    m.unloadingCharge = m.unloadingCharge !== undefined ? parseFloat(m.unloadingCharge) : 0;
    m.loadingChargeEnabled = m.loadingChargeEnabled === true;
    m.unloadingChargeEnabled = m.unloadingChargeEnabled === true;
    m.loadingChargesByType = (m.loadingChargesByType && typeof m.loadingChargesByType === 'object') ? m.loadingChargesByType : {};
    m.unloadingChargesByType = (m.unloadingChargesByType && typeof m.unloadingChargesByType === 'object') ? m.unloadingChargesByType : {};

    m.batches = m.batches || [];
    m.stock = parseFloat(m.stock) || 0;
    m.openingStock = m.openingStock !== undefined ? parseFloat(m.openingStock) : m.stock;
    m.landingCost = parseFloat(m.landingCost) || 0;
    m.mrp = parseFloat(m.mrp) || 0;
    m.gstExclRate = parseFloat(m.gstExclRate) || 0;
    m.gstInclRate = parseFloat(m.gstInclRate) || 0;
    m.marginPercent = parseFloat(m.marginPercent) || 0;
    m.marginAmount = parseFloat(m.marginAmount) || 0;
    m.costPrice = m.landingCost;
    m.sellingPrice = m.gstExclRate;
  }

  // Full recompute of stock for ALL materials from transaction history based on batches
  recomputeAllStocks() {
    const matById = new Map();
    (this.materials || []).forEach(m => {
      matById.set(m.id, m);
      m.batches = m.batches || [];
      
      // Reset stock on all batches to their openingStock
      m.batches.forEach(b => {
        b.stock = parseFloat(b.openingStock) || 0;
      });

      // If no batches exist, seed a default batch matching initial pricing
      if (m.batches.length === 0) {
        m.batches.push({
          batchNo: String(m.landingCost || 0),
          landingCost: m.landingCost || 0,
          sellingPrice: m.gstExclRate || m.sellingPrice || 0,
          mrp: m.mrp || 0,
          openingStock: parseFloat(m.openingStock) || 0,
          stock: parseFloat(m.openingStock) || 0
        });
      }

      // Sync material openingStock to sum of all batch openingStocks
      m.openingStock = m.batches.reduce((sum, b) => sum + (parseFloat(b.openingStock) || 0), 0);
      m.stock = m.openingStock;
    });

    // 1. Add purchase quantities (Receipts into batches)
    (this.purchases || []).forEach(pur => {
      if (pur.isCancelled) return;
      (pur.items || []).forEach(item => {
        const mat = matById.get(item.materialId);
        if (mat) {
          const bNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : String(item.price || mat.landingCost || 350);
          let batch = mat.batches.find(b => String(b.batchNo).trim() === bNo);
          if (!batch) {
            batch = {
              batchNo: bNo,
              landingCost: parseFloat(item.price) || mat.landingCost || 350,
              sellingPrice: parseFloat(item.sellingPrice) || mat.gstExclRate || 380,
              mrp: parseFloat(item.mrp) || mat.mrp || 400,
              openingStock: 0,
              stock: 0
            };
            mat.batches.push(batch);
          }
          batch.stock += parseFloat(item.quantity) || 0;
        }
      });
    });

    // 2. Subtract sales quantities
    (this.invoices || []).forEach(inv => {
      if (inv.isCancelled) return;
      (inv.items || []).forEach(item => {
        const mat = matById.get(item.materialId);
        if (mat) {
          let remQty = parseFloat(item.quantity) || 0;
          const bNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : null;
          
          if (bNo) {
            let targetBatch = mat.batches.find(b => String(b.batchNo).trim() === bNo);
            if (!targetBatch) {
              targetBatch = {
                batchNo: bNo,
                landingCost: parseFloat(item.price) || mat.landingCost || 350,
                sellingPrice: parseFloat(item.sellingPrice) || mat.gstExclRate || 380,
                mrp: parseFloat(item.mrp) || mat.mrp || 400,
                openingStock: 0,
                stock: 0
              };
              mat.batches.push(targetBatch);
            }
            targetBatch.stock -= remQty;
          } else {
            // No specific batch requested on invoice line: deduct from in-stock batches (FIFO)
            const inStockBatches = mat.batches.filter(b => b.stock > 0);
            for (const b of inStockBatches) {
              if (remQty <= 0) break;
              const deduct = Math.min(b.stock, remQty);
              b.stock -= deduct;
              remQty -= deduct;
            }
            if (remQty > 0) {
              const fallbackBatch = mat.batches[0];
              if (fallbackBatch) {
                fallbackBatch.stock -= remQty;
              }
            }
          }
        }
      });
    });

    // 3. Add sales returns
    (this.salesReturns || []).forEach(ret => {
      if (ret.isCancelled) return;
      (ret.items || []).forEach(item => {
        const mat = matById.get(item.materialId);
        if (mat) {
          const bNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : null;
          let batch = bNo ? mat.batches.find(b => String(b.batchNo).trim() === bNo) : mat.batches[0];
          if (!batch && bNo) {
            batch = {
              batchNo: bNo,
              landingCost: mat.landingCost || 350,
              sellingPrice: mat.gstExclRate || 380,
              mrp: mat.mrp || 400,
              openingStock: 0,
              stock: 0
            };
            mat.batches.push(batch);
          }
          if (batch) {
            batch.stock += parseFloat(item.quantity) || 0;
          }
        }
      });
    });

    // 4. Subtract purchase returns
    (this.purchaseReturns || []).forEach(ret => {
      if (ret.isCancelled) return;
      (ret.items || []).forEach(item => {
        const mat = matById.get(item.materialId);
        if (mat) {
          let remQty = parseFloat(item.quantity) || 0;
          const bNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : null;
          if (bNo) {
            let targetBatch = mat.batches.find(b => String(b.batchNo).trim() === bNo);
            if (!targetBatch) {
              targetBatch = {
                batchNo: bNo,
                landingCost: mat.landingCost || 350,
                sellingPrice: mat.gstExclRate || 380,
                mrp: mat.mrp || 400,
                openingStock: 0,
                stock: 0
              };
              mat.batches.push(targetBatch);
            }
            targetBatch.stock -= remQty;
          } else {
            const inStockBatches = mat.batches.filter(b => b.stock > 0);
            for (const b of inStockBatches) {
              if (remQty <= 0) break;
              const deduct = Math.min(b.stock, remQty);
              b.stock -= deduct;
              remQty -= deduct;
            }
            if (remQty > 0) {
              const fallback = mat.batches[0];
              if (fallback) fallback.stock -= remQty;
            }
          }
        }
      });
    });

    // 5. Apply Stock Adjustments
    (this.stockAdjustments || []).forEach(adj => {
      if (adj.isCancelled) return;
      (adj.items || []).forEach(item => {
        const mat = matById.get(item.materialId);
        if (mat) {
          const bNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : null;
          let batch = bNo ? mat.batches.find(b => String(b.batchNo).trim() === bNo) : mat.batches[0];
          if (!batch && bNo) {
            batch = {
              batchNo: bNo,
              landingCost: mat.landingCost || 350,
              sellingPrice: mat.gstExclRate || 380,
              mrp: mat.mrp || 400,
              openingStock: 0,
              stock: 0
            };
            mat.batches.push(batch);
          }
          if (batch) {
            const qty = parseFloat(item.qty) || 0;
            if (item.stockAffect === "Add (+)") {
              batch.stock += qty;
            } else {
              batch.stock -= qty;
            }
          }
        }
      });
    });

    // Re-tally stock, update default rates to reflect the most recent batch
    this.materials.forEach(m => {
      m.stock = m.batches.reduce((sum, b) => sum + (parseFloat(b.stock) || 0), 0);
      if (m.batches.length > 0) {
        const inStockBatches = m.batches.filter(b => (parseFloat(b.stock) || 0) > 0);
        const latest = inStockBatches.length > 0 ? inStockBatches[inStockBatches.length - 1] : m.batches[m.batches.length - 1];
        if (latest) {
          m.landingCost = latest.landingCost;
          m.gstExclRate = latest.sellingPrice;
          m.mrp = latest.mrp;
          m.costPrice = latest.landingCost;
          m.sellingPrice = latest.sellingPrice;
        }
      }
    });
  }

  getMaterialBatches(materialId) {
    const mat = this.materials.find(m => m.id === materialId);
    return mat ? (mat.batches || []) : [];
  }

  addOrUpdateMaterialBatch(materialId, batchData) {
    const mat = this.materials.find(m => m.id === materialId);
    if (!mat) return false;
    mat.batches = mat.batches || [];
    const bNo = String(batchData.batchNo);
    let existing = mat.batches.find(b => b.batchNo === bNo);
    if (existing) {
      existing.sellingPrice = parseFloat(batchData.sellingPrice) || existing.sellingPrice;
      existing.mrp = parseFloat(batchData.mrp) || existing.mrp;
      existing.landingCost = parseFloat(batchData.landingCost) || existing.landingCost;
    } else {
      mat.batches.push({
        batchNo: bNo,
        landingCost: parseFloat(batchData.landingCost) || mat.landingCost || 0,
        sellingPrice: parseFloat(batchData.sellingPrice) || mat.gstExclRate || 0,
        mrp: parseFloat(batchData.mrp) || mat.mrp || 0,
        stock: 0
      });
    }
    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  mergeBatches(materialId, sourceBatchNo, targetBatchNo, options = {}) {
    const mat = (this.materials || []).find(m => m.id === materialId);
    if (!mat) return { success: false, message: "Product not found." };
    mat.batches = mat.batches || [];

    const strSrc = String(sourceBatchNo || "").trim();
    const strTgt = String(targetBatchNo || "").trim();

    if (!strSrc || !strTgt) {
      return { success: false, message: "Both source and target batch numbers must be specified." };
    }
    if (strSrc === strTgt) {
      return { success: false, message: "Source and target batch cannot be the same." };
    }

    const srcBatch = mat.batches.find(b => String(b.batchNo).trim() === strSrc);
    const tgtBatch = mat.batches.find(b => String(b.batchNo).trim() === strTgt);

    if (!srcBatch) return { success: false, message: `Source Batch "${sourceBatchNo}" not found.` };
    if (!tgtBatch) return { success: false, message: `Target Batch "${targetBatchNo}" not found.` };

    // 1. Merge opening stock
    const srcOpStock = parseFloat(srcBatch.openingStock) || 0;
    const tgtOpStock = parseFloat(tgtBatch.openingStock) || 0;
    tgtBatch.openingStock = tgtOpStock + srcOpStock;
    srcBatch.openingStock = 0;

    // 2. Handle rate options if requested (e.g., weighted average)
    if (options.useWeightedAverageCost) {
      const srcStock = parseFloat(srcBatch.stock) || 0;
      const tgtStock = parseFloat(tgtBatch.stock) || 0;
      const totalStock = srcStock + tgtStock;
      if (totalStock > 0) {
        const srcCost = parseFloat(srcBatch.landingCost) || 0;
        const tgtCost = parseFloat(tgtBatch.landingCost) || 0;
        tgtBatch.landingCost = ((srcStock * srcCost) + (tgtStock * tgtCost)) / totalStock;
      }
    }

    // 3. Re-point historical transactions referencing sourceBatchNo to targetBatchNo
    (this.purchases || []).forEach(pur => {
      (pur.items || []).forEach(item => {
        if (item.materialId === materialId && String(item.batchNo || "").trim() === strSrc) {
          item.batchNo = strTgt;
        }
      });
    });

    (this.invoices || []).forEach(inv => {
      (inv.items || []).forEach(item => {
        if (item.materialId === materialId && String(item.batchNo || "").trim() === strSrc) {
          item.batchNo = strTgt;
        }
      });
    });

    (this.salesReturns || []).forEach(sr => {
      (sr.items || []).forEach(item => {
        if (item.materialId === materialId && String(item.batchNo || "").trim() === strSrc) {
          item.batchNo = strTgt;
        }
      });
    });

    (this.purchaseReturns || []).forEach(pr => {
      (pr.items || []).forEach(item => {
        if (item.materialId === materialId && String(item.batchNo || "").trim() === strSrc) {
          item.batchNo = strTgt;
        }
      });
    });

    (this.stockAdjustments || []).forEach(adj => {
      (adj.items || []).forEach(item => {
        if (item.materialId === materialId && String(item.batchNo || "").trim() === strSrc) {
          item.batchNo = strTgt;
        }
      });
    });

    // 4. Remove Source Batch from mat.batches
    mat.batches = mat.batches.filter(b => String(b.batchNo).trim() !== strSrc);

    // 5. Recompute all stocks & save
    this.recomputeAllStocks();
    this.saveState();

    return { success: true, message: `Successfully merged Batch "${sourceBatchNo}" into Batch "${targetBatchNo}".` };
  }

  resetToDefault() {
    this.materials = JSON.parse(JSON.stringify(initialMaterials));
    this.materials.forEach(m => this.applySchemaDefaults(m));
    this.contacts = JSON.parse(JSON.stringify(initialContacts));
     this.invoices = JSON.parse(JSON.stringify(initialInvoices));
    this.transactions = JSON.parse(JSON.stringify(initialTransactions));
    this.purchases = [];
    this.salesReturns = [];
    this.purchaseReturns = [];
    this.conversions = [];
    this.gstMaster = [];
    this.adminPassword = "123";
    this.accountGroups = JSON.parse(JSON.stringify(initialAccountGroups));
    this.ledgers = JSON.parse(JSON.stringify(initialLedgers));
    this.salesAdjustments = [
      { name: "FREIGHT", ledgerCode: "L030" },
      { name: "LOADING CHARGE", ledgerCode: "L032" },
      { name: "LOADING CHARGES", ledgerCode: "L032" },
      { name: "OTHER ITEMS", ledgerCode: "L002" },
      { name: "UNLOADING CHARGE", ledgerCode: "L033" }
    ];
    this.purchaseAdjustments = [
      { name: "FREIGHT", ledgerCode: "L031" },
      { name: "FREIGHT ON PURCHASE", ledgerCode: "L031" },
      { name: "UNLOADING CHARGE", ledgerCode: "L033" }
    ];
    this.units = JSON.parse(JSON.stringify(initialUnits));
    this.options = {
      enableEmployeeSales: true,
      enableInfluencerSales: true,
      enableCess: true,
      enable4DigitHsn: true,
      enableCessInSalesBill: false
    };
    this.seriesMaster = [];
    this.ensureDefaultSeries();
    this.influencers = [
      { id: "INF-001", name: "Anil Architect", address: "Kochi, Kerala", mobile: "9876543210" },
      { id: "INF-002", name: "Modern Builders", address: "Aluva, Kerala", mobile: "9876543211" }
    ];

    this.productGroups = ["Structural Supply", "Finishing Materials", "Plumbing & Fittings"];
    this.companies = ["Ultratech", "Jindal", "Ambuja"];
    this.categories = ["Cement", "Steel", "Sand", "Bricks", "Aggregates", "Other"];
    this.subCategories = ["OPC 53", "TMT Reb", "River Sand"];
    this.productNames = []; // Clear pre-defined names list so only actual created products show

    this.saveState();
  }

  clearSampleData() {
    this.materials = (this.materials || []).filter(m => !m.id.startsWith("MAT-"));
    this.contacts = (this.contacts || []).filter(c => !c.id.startsWith("CON-"));
    this.invoices = (this.invoices || []).filter(i => !String(i.contactId).startsWith("CON-") && i.id !== "1");
    this.transactions = (this.transactions || []).filter(tx => {
      const txId = String(tx.id || "");
      if (txId.startsWith("TX-100")) return false;
      const ref = String(tx.reference || "");
      if (ref === "Invoice 1" || ref === "1 COGS") return false;
      return true;
    });

    const sampleNames = new Set(["OPC 53 GRADE CEMENT", "TMT STEEL BARS 12MM", "FINE RIVER SAND", "RED CLAY BRICKS", "20MM CRUSHED BLUE METAL AGGREGATE"]);
    this.productNames = (this.productNames || []).filter(name => !sampleNames.has(name.toUpperCase()));

    this.recomputeAllStocks();
    this.saveState();
  }

  clearDatabase() {
    this.materials = [];
    this.contacts = [];
    this.invoices = [];
    this.transactions = [];
    this.purchases = [];
    this.salesReturns = [];
    this.purchaseReturns = [];
    this.conversions = [];
    this.gstMaster = [];
    this.accountGroups = JSON.parse(JSON.stringify(initialAccountGroups));
    this.ledgers = JSON.parse(JSON.stringify(initialLedgers)).map(l => {
      l.openingBalance = 0;
      return l;
    });
    this.salesAdjustments = [];
    this.purchaseAdjustments = [];
    this.units = [];
    this.options = {
      enableEmployeeSales: true,
      enableInfluencerSales: true,
      enableCess: true,
      enable4DigitHsn: true,
      enableCessInSalesBill: false
    };
    this.seriesMaster = [];
    this.ensureDefaultSeries();
    this.ensureStandardGstLedgers();
    this.saveState();
  }

  isDocInterState(doc) {
    if (!doc) return false;
    const contactId = doc.supplierId || doc.customerId || doc.partyId || doc.contactId;
    let contact = null;
    if (contactId) {
      contact = this.contacts.find(c => c.id === contactId);
    }
    const docState = (doc.state || "").toUpperCase().trim();
    const contactState = (contact && contact.state) ? contact.state.toUpperCase().trim() : "";
    const companyState = this.getCompanyState();
    
    // Check series type if available
    let series = null;
    if (doc.seriesId) {
      series = this.seriesMaster.find(s => s.id === doc.seriesId);
    }
    if (series && series.seriesType) {
      if (series.seriesType === "INTERSTATE" || series.seriesType === "IGST") return true;
      if (series.seriesType === "LOCAL") return false;
    }

    if (docState && docState !== companyState && docState !== "ALL") return true;
    if (contactState && contactState !== companyState && contactState !== "ALL") return true;
    return false;
  }

  


  async syncFromServer() {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return;
    const fyId = this.getActiveFyId();
    try {
      const host = window.location.hostname || "localhost";
      const dataUrl = (typeof window._getApiUrl === "function")
        ? window._getApiUrl(`/api/data/${activeId}/${fyId}`)
        : `http://${host}:3001/api/data/${activeId}/${fyId}`;
      const res = await fetch(dataUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.ledgers) {
          localStorage.setItem(`erp_company_data_${activeId}${fyId === 'default' ? '' : '_' + fyId}`, JSON.stringify(data));
          this.loadState(); // Reload from local storage memory
          this.notifyListeners();
        }
      }
    } catch(e) {
      console.error(e);
    }
  }


  async syncCompanies() {
    try {
      const host = window.location.hostname || "localhost";
      const apiUrl = (typeof window._getApiUrl === "function")
        ? window._getApiUrl("/api/companies")
        : `http://${host}:3001/api/companies`;
      const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(500)
      });
      if (res.ok) {
        const data = await res.json();
        const currentStr = localStorage.getItem("erp_companies");
        const current = currentStr ? JSON.parse(currentStr) : [];
        if (Array.isArray(data) && data.length > 0) {
          // Merge financialYears from localStorage to prevent overwriting with old server data
          const mergedData = data.map(serverComp => {
            const localComp = current.find(c => c.id === serverComp.id);
            if (localComp && localComp.financialYears && localComp.financialYears.length > 0) {
              const allFys = [...localComp.financialYears, ...(serverComp.financialYears || [])]; serverComp.financialYears = Array.from(new Map(allFys.map(item => [item.id, item])).values());
            }
            return serverComp;
          });
          localStorage.setItem("erp_companies", JSON.stringify(mergedData));
          if (current.length === 0) {
            window.location.reload();
          }
        } else if (current.length > 0) {
          this.saveRegisteredCompanies(current);
        }
      }
    } catch(e) {}
  }

  saveState(skipNotify = false) {
    this._accountBalancesCache = null;
    if (this._suppressSave) {
      this._pendingSave = true;
      return;
    }
    try {
      const activeId = this.getActiveCompanyId();
      if (!activeId) return;
      const fyId = this.getActiveFyId();

      const stateToSave = {
        materials: this.materials,
        contacts: this.contacts,
        invoices: this.invoices,
        salesOrders: this.salesOrders || [],
        transactions: this.transactions,
        purchases: this.purchases,
        salesReturns: this.salesReturns,
        purchaseReturns: this.purchaseReturns,
        conversions: this.conversions,
        stockAdjustments: this.stockAdjustments || [],
        productGroups: this.productGroups,
        companies: this.companies,
        categories: this.categories,
        subCategories: this.subCategories,
        productNames: this.productNames,
        adminPassword: this.adminPassword || "123",
        accountGroups: this.accountGroups,
        ledgers: this.ledgers,
        salesAdjustments: Array.isArray(this.salesAdjustments) ? this.salesAdjustments.map(a => Object.fromEntries(Object.entries(a).filter(([_, v]) => v !== undefined))) : [],
        purchaseAdjustments: Array.isArray(this.purchaseAdjustments) ? this.purchaseAdjustments.map(a => Object.fromEntries(Object.entries(a).filter(([_, v]) => v !== undefined))) : [],
        units: this.units,
        options: this.options,
        influencers: this.influencers,
        influencerRedemptions: this.influencerRedemptions || [],
        loyaltyPrograms: this.loyaltyPrograms || [],
        hsnCodes: this.hsnCodes,
        hsnDescriptions: this.hsnDescriptions || {},
        seriesMaster: this.seriesMaster || [],
        headloaderProductIds: this.headloaderProductIds || [],
        headloaderTypes: this.headloaderTypes || [{ id: "std", name: "Standard", isDefault: true }],
        gstMaster: this.gstMaster || []
      };

      // Immediate sync to local backend API server database on disk
      const host = window.location.hostname || "localhost";
      const saveApiUrl = (typeof window._getApiUrl === "function")
        ? window._getApiUrl(`/api/data/${activeId}/${fyId}`)
        : `http://${host}:3001/api/data/${activeId}/${fyId}`;

      fetch(saveApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify(stateToSave)
      })
      .then(res => res.ok ? res.json() : null)
      .then(resData => {
        if (resData && resData.data && resData.data.invoices) {
          const merged = resData.data;
          this.invoices = merged.invoices || this.invoices;
          this.salesOrders = merged.salesOrders || this.salesOrders;
          this.purchases = merged.purchases || this.purchases;
          this.transactions = merged.transactions || this.transactions;
          stateToSave.invoices = this.invoices;
          stateToSave.salesOrders = this.salesOrders;
          stateToSave.purchases = this.purchases;
        }
      })
      .catch(e => {
        console.error("Local node server save failed:", e);
      });

      this._serverLoadedData = stateToSave;
      if (!skipNotify) {
        this.notifyListeners();
      }
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }

  // ── Force Sync All Data to Server ────────────────────────────────────────
  // Reads ALL company data from localStorage (every company, every FY) and
  // pushes it to the local server's disk files. Use this when server files
  // are missing or out of date (e.g. server was offline during saves).
  async forceSyncAllToServer() {
    const getUrl = (endpoint) => (typeof window !== "undefined" && typeof window._getApiUrl === "function")
      ? window._getApiUrl(endpoint)
      : endpoint;
    const results = { success: [], failed: [] };

    // 1. Sync companies list (always includes financialYears now)
    try {
      const companies = this.getRegisteredCompanies();
      const companiesWithFy = companies.map(c => {
        if (!c.financialYears || c.financialYears.length === 0) {
          return {
            ...c,
            financialYears: [{
              id: "default",
              name: "Current F.Y",
              startDate: c.financialYearStarts || "2026-04-01",
              endDate: c.financialYearEnds || "2027-03-31"
            }]
          };
        }
        return c;
      });

      const res = await fetch(getUrl("/api/companies"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" },
        body: JSON.stringify(companiesWithFy)
      });
      if (res.ok) {
        results.success.push("companies.json");
      } else {
        results.failed.push("companies.json (HTTP " + res.status + ")");
      }

      // 2. For each company × each FY, find the data in localStorage and push to server
      for (const company of companiesWithFy) {
        const fys = company.financialYears || [{ id: "default" }];

        for (const fy of fys) {
          const fyId = fy.id;
          const lsKey = `erp_company_data_${company.id}${fyId === "default" ? "" : "_" + fyId}`;
          const stored = localStorage.getItem(lsKey);

          if (stored) {
            try {
              const data = JSON.parse(stored);
              const saveRes = await fetch(getUrl(`/api/data/${company.id}/${fyId}`), {
                method: "POST",
                headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" },
                body: JSON.stringify(data)
              });
              if (saveRes.ok) {
                results.success.push(`company ${company.id} / FY: ${fyId}`);
              } else {
                results.failed.push(`company ${company.id} / FY: ${fyId} (HTTP ${saveRes.status})`);
              }
            } catch (e) {
              results.failed.push(`company ${company.id} / FY: ${fyId} (${e.message})`);
            }
          } else {
            // No data in localStorage for this FY — skip
          }
        }
      }
    } catch (e) {
      results.failed.push("companies sync failed: " + e.message);
    }

    return results;
  }

  createNewFinancialYear(name, startDate, endDate) {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return { success: false, message: "No active company" };

    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => c.id === activeId);
    if (!company) return { success: false, message: "Company not found" };

    // Check if name or dates overlap
    company.financialYears = company.financialYears || [];
    if (company.financialYears.some(fy => fy.name === name)) {
      return { success: false, message: `Financial Year '${name}' already exists.` };
    }

    const newFyId = "fy_" + name.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now();
    const newFy = {
      id: newFyId,
      name,
      startDate,
      endDate
    };

    // Calculate closing balances and stock from the CURRENT financial year to carry forward
    const closingBalances = this.getAccountBalances(); // uses active (which is previous) year
    
    // We also want to compile current materials closing stocks
    // Our active materials list contains computed stocks (via recomputeAllStocks done on load/save)
    const materialsCarrier = JSON.parse(JSON.stringify(this.materials));
    materialsCarrier.forEach(m => {
      m.batches = m.batches || [];
      // Carry forward batch stocks
      m.batches.forEach(b => {
        b.openingStock = parseFloat(b.stock) || 0;
        b.stock = parseFloat(b.stock) || 0;
      });
      // Filter out zero stock batches, but keep at least one default if all are 0
      m.batches = m.batches.filter(b => b.openingStock > 0);
      if (m.batches.length === 0) {
        m.batches.push({
          batchNo: String(m.landingCost || 0),
          landingCost: m.landingCost || 0,
          sellingPrice: m.sellingPrice || m.gstExclRate || 0,
          mrp: m.mrp || 0,
          openingStock: 0,
          stock: 0
        });
      }
      m.openingStock = m.batches.reduce((sum, b) => sum + (parseFloat(b.openingStock) || 0), 0);
      m.stock = m.openingStock;
    });

    // We copy over ledgers, and carry forward their closing balance as opening balance
    const ledgersCarrier = JSON.parse(JSON.stringify(this.ledgers));
    ledgersCarrier.forEach(l => {
      const balData = closingBalances[l.code];
      const bal = balData ? balData.balance : 0;
      
      const groupName = (l.groupName || "").toUpperCase();
      const isPL = ["SALES ACCOUNT", "PURCHASE ACCOUNT", "INCOME", "EXPENSE", "REVENUE", "SALES", "PURCHASE"].some(x => groupName.includes(x)) || 
                   ["L017", "L018", "L019", "L020", "L021", "L022", "L023", "L024", "L025"].includes(l.code);
      
      if (isPL) {
        // Income & Expense balances close out, reset to 0 in the new year
        l.openingBalance = 0;
        l.balanceType = "Debit";
      } else {
        // Carry forward balance for Balance Sheet items
        if (bal >= 0) {
          l.openingBalance = bal;
          l.balanceType = "Debit";
        } else {
          l.openingBalance = Math.abs(bal);
          l.balanceType = "Credit";
        }
      }
    });

    // Automatically create Profit & Loss ledger under CAPITAL ACCOUNT for carrying forward
    const activeFyId = this.getActiveFyId();
    const currentFy = company.financialYears.find(fy => fy.id === activeFyId) || { name: "Default Year" };
    const prevYearName = currentFy.name;
    const profitLossData = this.getProfitLoss();
    const netProfit = profitLossData.netProfit || 0;

    const plLedgerName = `PROFIT/LOSS OF THE F.Y. ${prevYearName}`;
    let plLedger = ledgersCarrier.find(l => l.name === plLedgerName);
    if (!plLedger) {
      let maxNum = 0;
      ledgersCarrier.forEach(l => {
        if (l.code && l.code.startsWith("L")) {
          const num = parseInt(l.code.substring(1));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const targetCode = "L" + String(maxNum + 1).padStart(3, "0");
      plLedger = {
        code: targetCode,
        name: plLedgerName,
        groupName: "CAPITAL ACCOUNT"
      };
      ledgersCarrier.push(plLedger);
    }
    plLedger.openingBalance = Math.abs(netProfit);
    plLedger.balanceType = netProfit >= 0 ? "Credit" : "Debit";

    // Also copy over contacts and carry forward their closing balances
    const contactsCarrier = JSON.parse(JSON.stringify(this.contacts));
    contactsCarrier.forEach(c => {
      const balData = closingBalances[c.id];
      const bal = balData ? balData.balance : 0;
      c.openingBalance = bal;
      c.balance = bal;
      if (c.siteType === "multiple" && Array.isArray(c.sites)) {
        c.openingBalances = c.openingBalances || {};
        c.sites.forEach(site => {
          const siteKey = `${c.id}::${site}`;
          const siteBalData = closingBalances[siteKey];
          c.openingBalances[site] = siteBalData ? siteBalData.balance : 0;
        });
      }
    });

    // Prepare state object for the new financial year
    const newState = {
      materials: materialsCarrier,
      contacts: contactsCarrier,
      ledgers: ledgersCarrier,
      invoices: [],
      transactions: [],
      purchases: [],
      salesReturns: [],
      purchaseReturns: [],
      conversions: [],
      stockAdjustments: [],
      productGroups: this.productGroups,
      companies: this.companies,
      categories: this.categories,
      subCategories: this.subCategories,
      productNames: this.productNames,
      adminPassword: this.adminPassword || "123",
      accountGroups: this.accountGroups,
      salesAdjustments: this.salesAdjustments,
      purchaseAdjustments: this.purchaseAdjustments,
      units: this.units,
      options: this.options,
      influencers: this.influencers,
      hsnCodes: this.hsnCodes,
      seriesMaster: JSON.parse(JSON.stringify(this.seriesMaster || [])).map(s => {
        // Reset current number series counters for new financial year
        s.currentNumber = 1;
        return s;
      }),
      gstMaster: this.gstMaster || []
    };

    // Update active/current financial year's ending date to be the day before the new FY starts
    const existingFy = company.financialYears.find(fy => fy.id === activeFyId);
    if (existingFy && startDate) {
      const parts = startDate.split("-").map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      dateObj.setDate(dateObj.getDate() - 1);
      const prevYearEndYear = dateObj.getFullYear();
      const prevYearEndMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const prevYearEndDate = String(dateObj.getDate()).padStart(2, '0');
      existingFy.endDate = `${prevYearEndYear}-${prevYearEndMonth}-${prevYearEndDate}`;

      // Update name of ended financial year to reflect its exact date period (e.g. 01-04-2026 to 30-08-2026)
      const startFormatted = existingFy.startDate.split("-").reverse().join("-");
      const endFormatted = existingFy.endDate.split("-").reverse().join("-");
      existingFy.name = `${startFormatted} to ${endFormatted}`;
    }

    // Set new active financial year name to Current F.Y
    newFy.name = "Current F.Y";

    // Save the new company year in registered companies
    company.financialYears.push(newFy);
    this.saveRegisteredCompanies(companies);

    // Save the new year's database state
    localStorage.setItem(`erp_company_data_${activeId}_${newFyId}`, JSON.stringify(newState));
    
    // Sync with the server API for this new fyId
    const host = window.location.hostname || "localhost";
    const saveFyUrl = (typeof window._getApiUrl === "function")
      ? window._getApiUrl(`/api/data/${activeId}/${newFyId}`)
      : `http://${host}:3001/api/data/${activeId}/${newFyId}`;
    fetch(saveFyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newState)
    }).catch(e => console.error("Syncing new financial year failed:", e));

    return { success: true, newFy };
  }

  updateOpeningBalancesFromPreviousYear() {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return { success: false, message: "No active company" };

    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => c.id === activeId);
    if (!company) return { success: false, message: "Company not found" };

    const currentFyId = this.getActiveFyId();
    if (currentFyId === "default") {
      return { success: false, message: "No previous financial year available (already in default year)." };
    }

    company.financialYears = company.financialYears || [];
    const currentIndex = company.financialYears.findIndex(fy => fy.id === currentFyId);
    if (currentIndex <= 0) {
      return { success: false, message: "No previous financial year found." };
    }

    const prevFy = company.financialYears[currentIndex - 1];
    const prevFyId = prevFy.id;

    // Load previous financial year's database state from localStorage
    const prevStored = localStorage.getItem(`erp_company_data_${activeId}${prevFyId === 'default' ? '' : '_' + prevFyId}`);
    if (!prevStored) {
      return { success: false, message: `Could not find database for previous financial year '${prevFy.name}'.` };
    }

    const prevData = JSON.parse(prevStored);
    
    // Swap state to previous year temporarily to compute
    const originalState = {
      transactions: this.transactions,
      ledgers: this.ledgers,
      contacts: this.contacts,
      purchases: this.purchases,
      materials: this.materials,
      invoices: this.invoices,
      salesReturns: this.salesReturns,
      purchaseReturns: this.purchaseReturns,
      stockAdjustments: this.stockAdjustments,
      conversions: this.conversions
    };

    this.transactions = prevData.transactions || [];
    this.ledgers = prevData.ledgers || [];
    this.contacts = prevData.contacts || [];
    this.purchases = prevData.purchases || [];
    this.materials = prevData.materials || [];
    this.invoices = prevData.invoices || [];
    this.salesReturns = prevData.salesReturns || [];
    this.purchaseReturns = prevData.purchaseReturns || [];
    this.stockAdjustments = prevData.stockAdjustments || [];
    this.conversions = prevData.conversions || [];
    
    this.recomputeAllStocks();
    const prevClosingBalances = this.getAccountBalances();
    const prevClosingMaterials = JSON.parse(JSON.stringify(this.materials));
    const prevProfitLossData = this.getProfitLoss();
    const netProfit = prevProfitLossData.netProfit || 0;

    // Swap state back to current year
    this.transactions = originalState.transactions;
    this.ledgers = originalState.ledgers;
    this.contacts = originalState.contacts;
    this.purchases = originalState.purchases;
    this.materials = originalState.materials;
    this.invoices = originalState.invoices;
    this.salesReturns = originalState.salesReturns;
    this.purchaseReturns = originalState.purchaseReturns;
    this.stockAdjustments = originalState.stockAdjustments;
    this.conversions = originalState.conversions;

    // Update current year's ledger opening balances
    this.ledgers.forEach(l => {
      const balData = prevClosingBalances[l.code];
      const bal = balData ? balData.balance : 0;
      
      const groupName = (l.groupName || "").toUpperCase();
      const isPL = ["SALES ACCOUNT", "PURCHASE ACCOUNT", "INCOME", "EXPENSE", "REVENUE", "SALES", "PURCHASE"].some(x => groupName.includes(x)) || 
                   ["L017", "L018", "L019", "L020", "L021", "L022", "L023", "L024", "L025"].includes(l.code);
      
      if (!isPL) {
        if (bal >= 0) {
          l.openingBalance = bal;
          l.balanceType = "Debit";
        } else {
          l.openingBalance = Math.abs(bal);
          l.balanceType = "Credit";
        }
      } else {
        l.openingBalance = 0;
        l.balanceType = "Debit";
      }
    });

    // Automatically create or update Profit & Loss ledger under CAPITAL ACCOUNT for current year
    const prevYearName = prevFy.name;
    const plLedgerName = `PROFIT/LOSS OF THE F.Y. ${prevYearName}`;
    let plLedger = this.ledgers.find(l => l.name === plLedgerName);
    if (!plLedger) {
      let maxNum = 0;
      this.ledgers.forEach(l => {
        if (l.code && l.code.startsWith("L")) {
          const num = parseInt(l.code.substring(1));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const targetCode = "L" + String(maxNum + 1).padStart(3, "0");
      plLedger = {
        code: targetCode,
        name: plLedgerName,
        groupName: "CAPITAL ACCOUNT"
      };
      this.ledgers.push(plLedger);
    }
    plLedger.openingBalance = Math.abs(netProfit);
    plLedger.balanceType = netProfit >= 0 ? "Credit" : "Debit";

    // Update current year's contact opening balances
    this.contacts.forEach(c => {
      const balData = prevClosingBalances[c.id];
      const bal = balData ? balData.balance : 0;
      c.openingBalance = bal;
      c.balance = bal;
      if (c.siteType === "multiple" && Array.isArray(c.sites)) {
        c.openingBalances = c.openingBalances || {};
        c.sites.forEach(site => {
          const siteKey = `${c.id}::${site}`;
          const siteBalData = prevClosingBalances[siteKey];
          c.openingBalances[site] = siteBalData ? siteBalData.balance : 0;
        });
      }
    });

    // Update current year's material opening stock based on previous closing stock
    this.materials.forEach(m => {
      const prevMat = prevClosingMaterials.find(pm => pm.id === m.id);
      if (prevMat) {
        m.batches = m.batches || [];
        const prevBatches = prevMat.batches || [];
        
        m.batches.forEach(b => {
          const prevB = prevBatches.find(pb => pb.batchNo === b.batchNo);
          if (prevB) {
            b.openingStock = parseFloat(prevB.stock) || 0;
            b.stock = parseFloat(prevB.stock) || 0;
          }
        });
        
        // Add any batches that were created in the previous year but don't exist in current year yet
        prevBatches.forEach(pb => {
          if (!m.batches.some(b => b.batchNo === pb.batchNo)) {
            m.batches.push({
              batchNo: pb.batchNo,
              landingCost: pb.landingCost || 0,
              sellingPrice: pb.sellingPrice || 0,
              mrp: pb.mrp || 0,
              openingStock: parseFloat(pb.stock) || 0,
              stock: parseFloat(pb.stock) || 0
            });
          }
        });

        m.batches = m.batches.filter(b => b.openingStock > 0);
        if (m.batches.length === 0) {
          m.batches.push({
            batchNo: String(m.landingCost || 0),
            landingCost: m.landingCost || 0,
            sellingPrice: m.sellingPrice || m.gstExclRate || 0,
            mrp: m.mrp || 0,
            openingStock: 0,
            stock: 0
          });
        }
        m.openingStock = m.batches.reduce((sum, b) => sum + (parseFloat(b.openingStock) || 0), 0);
      }
    });

    // Recompute stocks for current year with new opening values and save
    this.recomputeAllStocks();
    this.saveState();
    return { success: true };
  }

  updateClosingBalancesToNextYear() {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return { success: false, message: "No active company" };

    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => c.id === activeId);
    if (!company) return { success: false, message: "Company not found" };

    const currentFyId = this.getActiveFyId();
    company.financialYears = company.financialYears || [];
    const currentIndex = company.financialYears.findIndex(fy => fy.id === currentFyId);
    if (currentIndex === -1 || currentIndex === company.financialYears.length - 1) {
      return { success: false, message: "No next financial year found (already in the latest year)." };
    }

    const nextFy = company.financialYears[currentIndex + 1];
    const nextFyId = nextFy.id;

    // Load next financial year's database state from localStorage
    const nextStored = localStorage.getItem(`erp_company_data_${activeId}${nextFyId === 'default' ? '' : '_' + nextFyId}`);
    if (!nextStored) {
      return { success: false, message: `Could not find database for next financial year '${nextFy.name}'.` };
    }

    const nextData = JSON.parse(nextStored);

    // Compute current year's closing balances
    this.recomputeAllStocks();
    const currentClosingBalances = this.getAccountBalances();
    const currentClosingMaterials = JSON.parse(JSON.stringify(this.materials));
    const currentProfitLossData = this.getProfitLoss();
    const netProfit = currentProfitLossData.netProfit || 0;

    // Update next year's ledger opening balances in nextData
    nextData.ledgers = nextData.ledgers || [];
    nextData.ledgers.forEach(l => {
      const balData = currentClosingBalances[l.code];
      const bal = balData ? balData.balance : 0;
      
      const groupName = (l.groupName || "").toUpperCase();
      const isPL = ["SALES ACCOUNT", "PURCHASE ACCOUNT", "INCOME", "EXPENSE", "REVENUE", "SALES", "PURCHASE"].some(x => groupName.includes(x)) || 
                   ["L017", "L018", "L019", "L020", "L021", "L022", "L023", "L024", "L025"].includes(l.code);
      
      if (isPL) {
        l.openingBalance = 0;
        l.balanceType = "Debit";
      } else {
        if (bal >= 0) {
          l.openingBalance = bal;
          l.balanceType = "Debit";
        } else {
          l.openingBalance = Math.abs(bal);
          l.balanceType = "Credit";
        }
      }
    });

    // Update next year's P&L carry forward ledger
    const prevYearName = company.financialYears[currentIndex].name;
    const plLedgerName = `PROFIT/LOSS OF THE F.Y. ${prevYearName}`;
    let plLedger = nextData.ledgers.find(l => l.name === plLedgerName);
    if (!plLedger) {
      let maxNum = 0;
      nextData.ledgers.forEach(l => {
        if (l.code && l.code.startsWith("L")) {
          const num = parseInt(l.code.substring(1));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const targetCode = "L" + String(maxNum + 1).padStart(3, "0");
      plLedger = {
        code: targetCode,
        name: plLedgerName,
        groupName: "CAPITAL ACCOUNT"
      };
      nextData.ledgers.push(plLedger);
    }
    plLedger.openingBalance = Math.abs(netProfit);
    plLedger.balanceType = netProfit >= 0 ? "Credit" : "Debit";

    // Update next year's material opening stock
    nextData.materials = nextData.materials || [];
    nextData.materials.forEach(nm => {
      const cm = currentClosingMaterials.find(x => x.id === nm.id);
      if (cm) {
        nm.batches = nm.batches || [];
        cm.batches = cm.batches || [];
        
        nm.batches.forEach(nb => {
          const cb = cm.batches.find(x => x.batchNo === nb.batchNo);
          if (cb) {
            nb.openingStock = parseFloat(cb.stock) || 0;
            nb.stock = parseFloat(cb.stock) || 0;
          }
        });
        
        cm.batches.forEach(cb => {
          if (parseFloat(cb.stock) > 0 && !nm.batches.some(x => x.batchNo === cb.batchNo)) {
            nm.batches.push({
              batchNo: cb.batchNo,
              landingCost: cb.landingCost || 0,
              sellingPrice: cb.sellingPrice || cb.sellingRate || 0,
              mrp: cb.mrp || 0,
              openingStock: parseFloat(cb.stock) || 0,
              stock: parseFloat(cb.stock) || 0
            });
          }
        });

        nm.openingStock = nm.batches.reduce((sum, b) => sum + (parseFloat(b.openingStock) || 0), 0);
        nm.stock = nm.openingStock;
      }
    });

    // Update next year's contact opening balances
    nextData.contacts = nextData.contacts || [];
    nextData.contacts.forEach(nc => {
      const cc = this.contacts.find(x => x.id === nc.id);
      if (cc) {
        const balData = currentClosingBalances[cc.id];
        const bal = balData ? balData.balance : 0;
        nc.openingBalance = bal;
        nc.balance = bal;
        
        if (cc.siteType === "multiple" && Array.isArray(cc.sites)) {
          nc.openingBalances = nc.openingBalances || {};
          cc.sites.forEach(site => {
            const siteKey = `${cc.id}::${site}`;
            const siteBalData = currentClosingBalances[siteKey];
            nc.openingBalances[site] = siteBalData ? siteBalData.balance : 0;
          });
        }
      }
    });

    // Save and sync the next year state
    localStorage.setItem(`erp_company_data_${activeId}_${nextFyId}`, JSON.stringify(nextData));
    
    const host = window.location.hostname || "localhost";
    const saveNextUrl = (typeof window._getApiUrl === "function")
      ? window._getApiUrl(`/api/data/${activeId}/${nextFyId}`)
      : `http://${host}:3001/api/data/${activeId}/${nextFyId}`;
    fetch(saveNextUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextData)
    }).catch(e => console.error("Syncing updated next year opening balances failed:", e));

    return { success: true };
  }

  getOptions() {
    if (!this.options) {
      this.options = {
        enableEmployeeSales: true,
        enableInfluencerSales: true,
        enableCess: true,
        enable4DigitHsn: true,
        enableCessInSalesBill: false,
        enablePartyClosingBalanceBottom: true,
        enableHeadloader: true,
        influencerLoyaltyRate: 1.0
      };
    }
    if (this.options.enableCessInSalesBill === undefined) this.options.enableCessInSalesBill = false;
    if (this.options.enablePartyClosingBalanceBottom === undefined) this.options.enablePartyClosingBalanceBottom = true;
    if (this.options.enableHeadloader === undefined) this.options.enableHeadloader = true;
    if (this.options.influencerLoyaltyRate === undefined) this.options.influencerLoyaltyRate = 1.0;
    return this.options;
  }

  updateOptions(newOptions) {
    this.options = { ...this.getOptions(), ...newOptions };
    this.saveState();
  }

  // â”€â”€ Series Master â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getSeriesMaster() {
    if (!this.seriesMaster) this.seriesMaster = [];
    this.ensureDefaultSeries();
    return this.seriesMaster;
  }

  ensureDefaultSeries() {
    if (!this.seriesMaster) this.seriesMaster = [];
    const defaults = [
      {
        id: "SER-LOCAL-SALES",
        txType: "Sales",
        seriesType: "LOCAL",
        name: "Local Sales (B2C)",
        prefix: "LSL-",
        digits: 4,
        startingNumber: 1,
        currentNumber: 1,
        ledgerCode: "L022",
        isActive: true
      },
      {
        id: "SER-B2B-SALES",
        txType: "Sales",
        seriesType: "LOCAL",
        name: "Local Sales (B2B)",
        prefix: "B2B00",
        digits: 1,
        startingNumber: 1,
        currentNumber: 1,
        ledgerCode: "L022",
        isActive: true
      },
      {
        id: "SER-IGST-SALES",
        txType: "Sales",
        seriesType: "INTERSTATE",
        name: "IGST Sales",
        prefix: "ISL-",
        digits: 4,
        startingNumber: 1,
        currentNumber: 1,
        ledgerCode: "L024",
        isActive: false
      },
      {
        id: "SER-NONTAXABLE-SALES",
        txType: "Sales",
        seriesType: "NONTAXABLE",
        name: "Non Taxable Sales",
        prefix: "NSL-",
        digits: 4,
        startingNumber: 1,
        currentNumber: 1,
        ledgerCode: "L025",
        isActive: false
      },
      {
        id: "SER-LOCAL-PURCHASE",
        txType: "Purchase",
        seriesType: "LOCAL",
        name: "Local Purchase (CGST+SGST)",
        prefix: "LPR-",
        digits: 4,
        startingNumber: 1,
        currentNumber: 1,
        ledgerCode: "L018",
        isActive: true
      },
      {
        id: "SER-IGST-PURCHASE",
        txType: "Purchase",
        seriesType: "INTERSTATE",
        name: "IGST Purchase",
        prefix: "IPR-",
        digits: 4,
        startingNumber: 1,
        currentNumber: 1,
        ledgerCode: "L019",
        isActive: false
      },
      {
        id: "SER-NONTAXABLE-PURCHASE",
        txType: "Purchase",
        seriesType: "NONTAXABLE",
        name: "Non Taxable Purchase",
        prefix: "NPR-",
        digits: 4,
        startingNumber: 1,
        currentNumber: 1,
        ledgerCode: "L021",
        isActive: false
      }
    ];

    let changed = false;
    defaults.forEach(d => {
      const exists = this.seriesMaster.find(s => s.id === d.id);
      if (!exists) {
        this.seriesMaster.push(d);
        changed = true;
      } else {
        if (!exists.seriesType) { exists.seriesType = d.seriesType; changed = true; }
        if (!exists.ledgerCode) { exists.ledgerCode = d.ledgerCode; changed = true; }
      }
    });

    ["Sales", "Purchase"].forEach(txType => {
      const active = this.seriesMaster.find(s => s.txType === txType && s.isActive);
      if (!active) {
        const local = this.seriesMaster.find(s => s.txType === txType && s.seriesType === "LOCAL");
        if (local) {
          local.isActive = true;
          changed = true;
        }
      }
    });

    // Sanitize any mismapped series ledger codes (e.g. Sales series pointing to Purchase ledger)
    if (this.seriesMaster && Array.isArray(this.seriesMaster)) {
      this.seriesMaster.forEach(s => {
        if (s.txType === "Sales") {
          const l = (this.ledgers || []).find(x => x.code === s.ledgerCode);
          const isPurchaseLedger = l && (l.groupName === "PURCHASE ACCOUNT" || String(l.name || "").toUpperCase().includes("PURCHASE"));
          if (isPurchaseLedger || !l) {
            if (s.seriesType === "INTERSTATE" || s.id.includes("IGST")) {
              const igstL = (this.ledgers || []).find(x => String(x.name || "").toUpperCase() === "IGST SALES") || (this.ledgers || []).find(x => String(x.name || "").toUpperCase().includes("IGST SALES"));
              s.ledgerCode = igstL ? igstL.code : "L0060";
            } else if (s.seriesType === "NONTAXABLE") {
              const nonTaxL = (this.ledgers || []).find(x => String(x.name || "").toUpperCase() === "NON TAXABLE SALES") || (this.ledgers || []).find(x => String(x.name || "").toUpperCase().includes("NON TAXABLE SALES"));
              s.ledgerCode = nonTaxL ? nonTaxL.code : "L0061";
            } else {
              const localL = (this.ledgers || []).find(x => String(x.name || "").toUpperCase() === "LOCAL SALES") || (this.ledgers || []).find(x => String(x.name || "").toUpperCase().includes("LOCAL SALES"));
              s.ledgerCode = localL ? localL.code : "L0004";
            }
            changed = true;
          }
        } else if (s.txType === "Purchase") {
          const l = (this.ledgers || []).find(x => x.code === s.ledgerCode);
          const isSalesLedger = l && (l.groupName === "SALES ACCOUNT" || String(l.name || "").toUpperCase().includes("SALES"));
          if (isSalesLedger || !l) {
            if (s.seriesType === "INTERSTATE" || s.id.includes("IGST")) {
              const igstL = (this.ledgers || []).find(x => String(x.name || "").toUpperCase() === "IGST PURCHASE") || (this.ledgers || []).find(x => String(x.name || "").toUpperCase().includes("IGST PURCHASE"));
              s.ledgerCode = igstL ? igstL.code : "L0062";
            } else if (s.seriesType === "NONTAXABLE") {
              const nonTaxL = (this.ledgers || []).find(x => String(x.name || "").toUpperCase() === "NON TAXABLE PURCHASE") || (this.ledgers || []).find(x => String(x.name || "").toUpperCase().includes("NON TAXABLE PURCHASE"));
              s.ledgerCode = nonTaxL ? nonTaxL.code : "L0063";
            } else {
              const localL = (this.ledgers || []).find(x => String(x.name || "").toUpperCase() === "LOCAL PURCHASE") || (this.ledgers || []).find(x => String(x.name || "").toUpperCase().includes("LOCAL PURCHASE"));
              s.ledgerCode = localL ? localL.code : "L0005";
            }
            changed = true;
          }
        }
      });
    }

    if (changed) {
      this.saveState();
    }
  }

  saveSeries(obj) {
    if (!this.seriesMaster) this.seriesMaster = [];
    const cleanPrefix = String(obj.prefix || "").trim().toUpperCase();
    if (cleanPrefix) {
      const conflict = this.seriesMaster.find(s => s.id !== obj.id && String(s.prefix || "").trim().toUpperCase() === cleanPrefix);
      if (conflict) {
        console.warn(`[saveSeries] Prefix "${obj.prefix}" is already in use by series "${conflict.name}" (${conflict.txType}).`);
        alert(`Voucher prefix "${obj.prefix}" is already in use by series "${conflict.name}" (${conflict.txType}). Prefix must be unique across all series.`);
        return null;
      }
    }
    if (obj.id) {
      const idx = this.seriesMaster.findIndex(s => s.id === obj.id);
      if (idx !== -1) {
        const oldPrefix = this.seriesMaster[idx].prefix;
        const newPrefix = obj.prefix;
        this.seriesMaster[idx] = obj;

        if (oldPrefix !== newPrefix) {
          // 1. Update Invoices
          this.invoices.forEach(inv => {
            const oldVno = String(inv.voucherNo || inv.refNo || inv.id || "");
            const oldVnoUpper = String(oldVno || "").toUpperCase();
            const oldPrefixUpper = String(oldPrefix || "").toUpperCase();
            
            if (inv.seriesId === obj.id || (oldPrefix && oldVnoUpper.startsWith(oldPrefixUpper))) {
              inv.seriesId = obj.id;
              let newVno = "";
              if (oldPrefix && oldVnoUpper.startsWith(oldPrefixUpper)) {
                newVno = newPrefix + oldVno.substring(oldPrefix.length);
              } else if (oldVno) {
                const matchNum = oldVno.match(/\d+$/);
                const numStr = matchNum ? matchNum[0] : "";
                newVno = newPrefix + numStr;
              }
              
              if (newVno && oldVno) {
                if (inv.voucherNo === oldVno) inv.voucherNo = newVno;
                if (inv.refNo === oldVno) inv.refNo = newVno;
                if (inv.id === oldVno) inv.id = newVno;
                
                // Update transaction references & ID
                this.transactions.forEach(t => {
                  if (t.reference === oldVno) {
                    t.reference = newVno;
                  }
                  if (t.reference === `${oldVno} COGS`) {
                    t.reference = `${newVno} COGS`;
                  }
                  if (t.id === oldVno) {
                    t.id = newVno;
                  }
                });
              }
            }
          });

          // 2. Update Purchases
          this.purchases.forEach(pur => {
            const oldVno = String(pur.voucherNo || pur.refNo || pur.id || "");
            const oldVnoUpper = String(oldVno || "").toUpperCase();
            const oldPrefixUpper = String(oldPrefix || "").toUpperCase();
            
            if (pur.seriesId === obj.id || (oldPrefix && oldVnoUpper.startsWith(oldPrefixUpper))) {
              pur.seriesId = obj.id;
              let newVno = "";
              if (oldPrefix && oldVnoUpper.startsWith(oldPrefixUpper)) {
                newVno = newPrefix + oldVno.substring(oldPrefix.length);
              } else if (oldVno) {
                const matchNum = oldVno.match(/\d+$/);
                const numStr = matchNum ? matchNum[0] : "";
                newVno = newPrefix + numStr;
              }
              
              if (newVno && oldVno) {
                if (pur.voucherNo === oldVno) pur.voucherNo = newVno;
                if (pur.refNo === oldVno) pur.refNo = newVno;
                if (pur.id === oldVno) pur.id = newVno;
                
                // Update transaction references & ID
                this.transactions.forEach(t => {
                  if (t.reference === oldVno) {
                    t.reference = newVno;
                  }
                  if (t.id === oldVno) {
                    t.id = newVno;
                  }
                });
              }
            }
          });
        }
      } else {
        this.seriesMaster.push(obj);
      }
    } else {
      obj.id = "SER-" + Date.now();
      this.seriesMaster.push(obj);
    }
    this.realignSeriesCurrentNumbers();
    this.rebuildAllTaxTransactions();
    this.saveState();
    return obj;
  }

  realignSeriesCurrentNumbers() {
    if (!this.seriesMaster) return;

    let changed = false;

    const allSalesSeries = (this.seriesMaster || [])
      .filter(s => s.txType === "Sales" && s.prefix)
      .sort((a, b) => (b.prefix || "").length - (a.prefix || "").length);

    const allPurSeries = (this.seriesMaster || [])
      .filter(s => s.txType === "Purchase" && s.prefix)
      .sort((a, b) => (b.prefix || "").length - (a.prefix || "").length);

    this.seriesMaster.forEach(series => {
      const prefix = (series.prefix || "").toUpperCase();
      const txType = (series.txType || "").toLowerCase();
      let maxUsed = (series.startingNumber || 1) - 1;

      if (txType.includes("purchase")) {
        const purList = this.purchases || [];
        purList.forEach(pur => {
          if (!pur) return;
          const vno = String(pur.voucherNo || pur.id || "").trim();
          if (!vno) return;
          
          let matchesThisSeries = false;
          if (pur.seriesId === series.id) {
            matchesThisSeries = true;
          } else if (!pur.seriesId && prefix) {
            const vnoUpper = vno.toUpperCase();
            const bestMatch = allPurSeries.find(s => vnoUpper.startsWith((s.prefix || "").toUpperCase()));
            if (bestMatch && bestMatch.id === series.id) {
              matchesThisSeries = true;
            }
          }

          if (matchesThisSeries) {
            const numPart = prefix && vno.toUpperCase().startsWith(prefix) ? vno.substring(prefix.length) : vno;
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxUsed) {
              maxUsed = num;
            }
          }
        });
      } else {
        const invList = this.invoices || [];
        invList.forEach(inv => {
          if (!inv) return;
          const vno = String(inv.voucherNo || inv.refNo || inv.id || "").trim();
          if (!vno) return;

          let matchesThisSeries = false;
          if (inv.seriesId === series.id) {
            matchesThisSeries = true;
          } else if (!inv.seriesId && prefix) {
            const vnoUpper = vno.toUpperCase();
            const bestMatch = allSalesSeries.find(s => vnoUpper.startsWith((s.prefix || "").toUpperCase()));
            if (bestMatch && bestMatch.id === series.id) {
              matchesThisSeries = true;
            }
          }

          if (matchesThisSeries) {
            const numPart = prefix && vno.toUpperCase().startsWith(prefix) ? vno.substring(prefix.length) : vno;
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxUsed) {
              maxUsed = num;
            }
          }
        });
      }

      const targetNext = Math.max(series.startingNumber || 1, maxUsed + 1);
      if (series.currentNumber !== targetNext) {
        series.currentNumber = targetNext;
        changed = true;
      }
    });

    if (changed) {
      this.saveState(true);
    }
  }

  resequenceSeriesVoucherNumbers(shouldSave = true) {
    if (!this.seriesMaster) return false;

    let changed = false;

    const isManualOrReturn = (t) => {
      if (!t) return true;
      const type = String(t.voucherType || "").toUpperCase();
      const ref = String(t.reference || "").toUpperCase();
      return type.includes("RETURN") || ref.includes("CREDIT NOTE") || ref.includes("DEBIT NOTE");
    };

    const allSalesSeries = (this.seriesMaster || [])
      .filter(s => s.txType === "Sales" && s.prefix)
      .sort((a, b) => (b.prefix || "").length - (a.prefix || "").length);

    const allPurSeries = (this.seriesMaster || [])
      .filter(s => s.txType === "Purchase" && s.prefix)
      .sort((a, b) => (b.prefix || "").length - (a.prefix || "").length);

    this.seriesMaster.forEach(series => {
      const prefix = series.prefix || "";
      const digits = parseInt(series.digits) || 4;
      const startNum = parseInt(series.startingNumber) || 1;
      const isPurchase = String(series.txType || "").toLowerCase().includes("purchase");

      if (isPurchase) {
        const purList = (this.purchases || []).filter(pur => {
          if (!pur) return false;
          if (pur.seriesId === series.id) return true;
          if (!pur.seriesId && prefix) {
            const vnoUpper = String(pur.voucherNo || pur.id || "").toUpperCase();
            const bestMatch = allPurSeries.find(s => vnoUpper.startsWith((s.prefix || "").toUpperCase()));
            if (bestMatch && bestMatch.id === series.id) return true;
            if (vnoUpper.startsWith(prefix.toUpperCase())) return true;
          }
          return false;
        });

        purList.sort((a, b) => {
          if (a.date !== b.date) return String(a.date || "").localeCompare(String(b.date || ""));
          const matchA = String(a.voucherNo || a.id).match(/\d+$/);
          const matchB = String(b.voucherNo || b.id).match(/\d+$/);
          const numA = matchA ? parseInt(matchA[0], 10) : 0;
          const numB = matchB ? parseInt(matchB[0], 10) : 0;
          return numA - numB;
        });

        purList.forEach((pur, index) => {
          pur.seriesId = series.id;
          const seq = startNum + index;
          const newVno = prefix + String(seq).padStart(digits, "0");
          const oldVno = String(pur.voucherNo || pur.refNo || pur.id || "");

          if (oldVno !== newVno) {
            const prevId = pur.id;
            pur.voucherNo = newVno;
            pur.refNo = newVno;
            pur.id = newVno;

            (this.transactions || []).forEach(t => {
              if (isManualOrReturn(t)) return;
              if (t.reference === oldVno || t.reference === prevId) {
                t.reference = newVno;
                t.voucherNo = newVno;
                changed = true;
              }
              if (t.id === oldVno || t.id === prevId) {
                t.id = newVno;
                t.voucherNo = newVno;
                changed = true;
              }
            });
            changed = true;
          }
        });

        const targetCurrent = startNum + purList.length;
        if (series.currentNumber !== targetCurrent) {
          series.currentNumber = targetCurrent;
          changed = true;
        }
      } else {
        const invList = (this.invoices || []).filter(inv => {
          if (!inv) return false;
          if (inv.seriesId === series.id) return true;
          if (!inv.seriesId && prefix) {
            const vnoUpper = String(inv.voucherNo || inv.refNo || inv.id || "").toUpperCase();
            const bestMatch = allSalesSeries.find(s => vnoUpper.startsWith((s.prefix || "").toUpperCase()));
            if (bestMatch && bestMatch.id === series.id) return true;
            if (vnoUpper.startsWith(prefix.toUpperCase()) || (prefix.toUpperCase().startsWith("B2B") && vnoUpper.startsWith("B2B"))) return true;
          }
          return false;
        });

        invList.sort((a, b) => {
          if (a.date !== b.date) return String(a.date || "").localeCompare(String(b.date || ""));
          const matchA = String(a.voucherNo || a.refNo || a.id).match(/\d+$/);
          const matchB = String(b.voucherNo || b.refNo || b.id).match(/\d+$/);
          const numA = matchA ? parseInt(matchA[0], 10) : 0;
          const numB = matchB ? parseInt(matchB[0], 10) : 0;
          return numA - numB;
        });

        invList.forEach((inv, index) => {
          inv.seriesId = series.id;
          const seq = startNum + index;
          const newVno = prefix + String(seq).padStart(digits, "0");
          const oldVno = String(inv.voucherNo || inv.refNo || inv.id || "");

          if (oldVno !== newVno) {
            const prevId = inv.id;
            inv.voucherNo = newVno;
            inv.refNo = newVno;
            inv.id = newVno;

            (this.transactions || []).forEach(t => {
              if (isManualOrReturn(t)) return;
              if (t.reference === oldVno || t.reference === prevId) {
                t.reference = newVno;
                t.voucherNo = newVno;
                changed = true;
              }
              if (t.reference === `${oldVno} COGS` || t.reference === `${prevId} COGS`) {
                t.reference = `${newVno} COGS`;
                t.voucherNo = newVno;
                changed = true;
              }
              if (t.id === oldVno || t.id === prevId) {
                t.id = newVno;
                t.voucherNo = newVno;
                changed = true;
              }
            });
            changed = true;
          }
        });

        const targetCurrent = startNum + invList.length;
        if (series.currentNumber !== targetCurrent) {
          series.currentNumber = targetCurrent;
          changed = true;
        }
      }
    });

    if (changed && shouldSave) {
      this.saveState(true);
    }

    return changed;
  }

  forceAlignTransactionUnits() {
    if (!this.materials || !Array.isArray(this.materials)) return;
    
    const materialUnitMap = {};
    const materialNameUnitMap = {};

    this.materials.forEach(m => {
      if (m.unit) {
        if (m.id) materialUnitMap[m.id] = m.unit;
        if (m.name) materialNameUnitMap[m.name.toUpperCase().trim()] = m.unit;
      }
    });

    let updated = false;

    const getMasterUnit = (item) => {
      if (item.materialId && materialUnitMap[item.materialId]) {
        return materialUnitMap[item.materialId];
      }
      if (item.name) {
        const key = item.name.toUpperCase().trim();
        if (materialNameUnitMap[key]) return materialNameUnitMap[key];
      }
      return null;
    };

    if (this.invoices && Array.isArray(this.invoices)) {
      this.invoices.forEach(inv => {
        if (inv.items && Array.isArray(inv.items)) {
          inv.items.forEach(item => {
            const masterUnit = getMasterUnit(item);
            if (masterUnit && item.unit !== masterUnit) {
              item.unit = masterUnit;
              updated = true;
            }
          });
        }
      });
    }

    if (this.purchases && Array.isArray(this.purchases)) {
      this.purchases.forEach(pur => {
        if (pur.items && Array.isArray(pur.items)) {
          pur.items.forEach(item => {
            const masterUnit = getMasterUnit(item);
            if (masterUnit && item.unit !== masterUnit) {
              item.unit = masterUnit;
              updated = true;
            }
          });
        }
      });
    }

    if (this.salesReturns && Array.isArray(this.salesReturns)) {
      this.salesReturns.forEach(ret => {
        if (ret.items && Array.isArray(ret.items)) {
          ret.items.forEach(item => {
            const masterUnit = getMasterUnit(item);
            if (masterUnit && item.unit !== masterUnit) {
              item.unit = masterUnit;
              updated = true;
            }
          });
        }
      });
    }

    if (this.purchaseReturns && Array.isArray(this.purchaseReturns)) {
      this.purchaseReturns.forEach(ret => {
        if (ret.items && Array.isArray(ret.items)) {
          ret.items.forEach(item => {
            const masterUnit = getMasterUnit(item);
            if (masterUnit && item.unit !== masterUnit) {
              item.unit = masterUnit;
              updated = true;
            }
          });
        }
      });
    }

    if (updated) {
      this.saveState();
    }
  }

  deleteSeries(id) {
    if (!this.seriesMaster) return;
    this.seriesMaster = this.seriesMaster.filter(s => s.id !== id);
    this.saveState();
  }

  // Get next voucher number for a given transaction type using active series
  getNextSeriesNumber(txType) {
    if (!this.seriesMaster) return null;
    const series = this.seriesMaster.find(s => s.txType === txType && s.isActive);
    if (!series) return null;
    const num = (series.currentNumber || series.startingNumber || 1);
    const digits = parseInt(series.digits) || 4;
    const padded = String(num).padStart(digits, "0");
    return (series.prefix || "") + padded;
  }

  incrementSeriesNumber(txType) {
    if (!this.seriesMaster) return;
    const series = this.seriesMaster.find(s => s.txType === txType && s.isActive);
    if (!series) return;
    series.currentNumber = (series.currentNumber || series.startingNumber || 1) + 1;
    this.saveState();
  }

  getInfluencers() {
    if (!this.influencers) {
      this.influencers = [
        { id: "INF-001", name: "Anil Architect", address: "Kochi, Kerala", mobile: "9876543210" },
        { id: "INF-002", name: "Modern Builders", address: "Aluva, Kerala", mobile: "9876543211" }
      ];
    }
    return this.influencers;
  }

  addInfluencer(payload) {
    const fresh = this.getInfluencers();
    const nextId = "INF-" + String(fresh.length + 1).padStart(3, "0");
    const item = { id: nextId, ...payload };
    fresh.push(item);
    this.saveState();
    return item;
  }

  updateInfluencer(id, payload) {
    const fresh = this.getInfluencers();
    const idx = fresh.findIndex(x => x.id === id);
    if (idx !== -1) {
      fresh[idx] = { ...fresh[idx], ...payload };
      this.saveState();
      return true;
    }
    return false;
  }

  deleteInfluencer(id) {
    const fresh = this.getInfluencers();
    this.influencers = fresh.filter(x => x.id !== id);
    this.saveState();
    return true;
  }

  getInfluencerRedemptions() {
    if (!this.influencerRedemptions) {
      this.influencerRedemptions = [];
    }
    return this.influencerRedemptions;
  }

  addInfluencerRedemption(payload) {
    const redemptions = this.getInfluencerRedemptions();
    const nextId = "RED-" + String(redemptions.length + 1).padStart(4, "0");
    const item = { id: nextId, ...payload };
    redemptions.push(item);
    this.saveState();
    return item;
  }

  deleteInfluencerRedemption(id) {
    const redemptions = this.getInfluencerRedemptions();
    this.influencerRedemptions = redemptions.filter(x => x.id !== id);
    this.saveState();
    return true;
  }

  getInfluencerLoyaltySummary(influencerName) {
    const activeInvoices = (this.invoices || []).filter(i => !i.isCancelled && i.influencer === influencerName);
    const totalSales = activeInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    
    const pointsEarned = activeInvoices.reduce((sum, inv) => {
      let invoicePoints = 0;
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          if (mat && mat.loyaltyPointsPerUnit) {
            const qty = parseFloat(item.quantity) || 0;
            const pts = parseFloat(mat.loyaltyPointsPerUnit) || 0;
            invoicePoints += qty * pts;
          }
        });
      }
      return sum + invoicePoints;
    }, 0);

    const redemptions = this.getInfluencerRedemptions().filter(r => r.influencerName === influencerName);
    const pointsRedeemed = redemptions.reduce((sum, r) => sum + (parseFloat(r.points) || 0), 0);
    const balance = pointsEarned - pointsRedeemed;

    return {
      totalSales,
      pointsEarned,
      pointsRedeemed,
      balance,
      invoices: activeInvoices.map(inv => {
        let invoicePoints = 0;
        if (inv.items && Array.isArray(inv.items)) {
          inv.items.forEach(item => {
            const mat = this.materials.find(m => m.id === item.materialId);
            if (mat && mat.loyaltyPointsPerUnit) {
              const qty = parseFloat(item.quantity) || 0;
              const pts = parseFloat(mat.loyaltyPointsPerUnit) || 0;
              invoicePoints += qty * pts;
            }
          });
        }
        return {
          id: inv.id,
          date: inv.date,
          voucherNo: inv.voucherNo,
          customerName: inv.contactName,
          total: parseFloat(inv.total) || 0,
          points: invoicePoints
        };
      }),
      redemptions: redemptions.map(r => ({
        id: r.id,
        date: r.date,
        points: parseFloat(r.points) || 0,
        narration: r.narration || ""
      }))
    };
  }

  getLoyaltyPrograms() {
    if (!this.loyaltyPrograms) {
      this.loyaltyPrograms = [];
    }
    return this.loyaltyPrograms;
  }

  addLoyaltyProgram(payload) {
    const programs = this.getLoyaltyPrograms();
    const nextId = "PROG-" + String(programs.length + 1).padStart(3, "0");
    const item = { id: nextId, ...payload };
    programs.push(item);
    this.saveState();
    return item;
  }

  updateLoyaltyProgram(id, payload) {
    const programs = this.getLoyaltyPrograms();
    const idx = programs.findIndex(p => p.id === id);
    if (idx !== -1) {
      programs[idx] = { ...programs[idx], ...payload };
      this.saveState();
      return true;
    }
    return false;
  }

  deleteLoyaltyProgram(id) {
    const programs = this.getLoyaltyPrograms();
    this.loyaltyPrograms = programs.filter(p => p.id !== id);
    this.saveState();
    return true;
  }

  getProgramLoyaltySummary(programId) {
    const program = this.getLoyaltyPrograms().find(p => p.id === programId);
    if (!program) {
      return {
        totalSales: 0,
        pointsEarned: 0,
        pointsRedeemed: 0,
        balance: 0,
        influencers: [],
        invoices: [],
        redemptions: []
      };
    }

    const start = new Date(program.startDate).getTime();
    const end = new Date(program.endDate).getTime();

    const activeInvoices = (this.invoices || []).filter(i => {
      if (i.isCancelled) return false;
      if (!i.influencer) return false;
      
      const influencerMatch = (program.influencers || []).includes(i.influencer);
      if (!influencerMatch) return false;

      const dateMs = new Date(i.date).getTime();
      return dateMs >= start && dateMs <= end;
    });

    const programProductsList = program.products || [];

    const invoicesList = activeInvoices.map(inv => {
      let pts = 0;
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          if (!mat) return;
          const matName = mat.name.toUpperCase();
          const matId = mat.id;
          const qty = parseFloat(item.quantity) || 0;

          let matchedRule = programProductsList.find(p => {
            if (p.productName) {
              return p.productName === matName && p.materialId === matId;
            } else {
              return p.materialId === matId;
            }
          });
          if (!matchedRule) {
            matchedRule = programProductsList.find(p => {
              if (p.productName) {
                return p.productName === matName && (p.materialId === "ALL" || p.materialId === "all");
              } else {
                return p.materialId === "ALL" || p.materialId === "all";
              }
            });
          }
          if (!matchedRule) {
            matchedRule = programProductsList.find(p => p.productName === "ALL");
          }

          if (matchedRule) {
            const pointsVal = parseFloat(matchedRule.points) || 0;
            pts += qty * pointsVal;
          }
        });
      }
      return {
        id: inv.id,
        date: inv.date,
        voucherNo: inv.voucherNo,
        influencer: inv.influencer,
        customerName: inv.contactName,
        total: parseFloat(inv.total) || 0,
        points: pts
      };
    });

    const redemptions = this.getInfluencerRedemptions().filter(r => r.programId === programId);
    const redemptionsList = redemptions.map(r => ({
      id: r.id,
      date: r.date,
      influencerName: r.influencerName,
      points: parseFloat(r.points) || 0,
      narration: r.narration || ""
    }));

    const influencerSummaries = (program.influencers || []).map(infName => {
      const infInvoices = invoicesList.filter(inv => inv.influencer === infName);
      const sales = infInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const earned = infInvoices.reduce((sum, inv) => sum + inv.points, 0);

      const infRedemptions = redemptionsList.filter(r => r.influencerName === infName);
      const redeemed = infRedemptions.reduce((sum, r) => sum + r.points, 0);

      return {
        influencerName: infName,
        totalSales: sales,
        pointsEarned: earned,
        pointsRedeemed: redeemed,
        balance: earned - redeemed
      };
    });

    const totalSales = invoicesList.reduce((sum, inv) => sum + inv.total, 0);
    const pointsEarned = invoicesList.reduce((sum, inv) => sum + inv.points, 0);
    const pointsRedeemed = redemptionsList.reduce((sum, r) => sum + r.points, 0);

    return {
      programName: program.name,
      totalSales,
      pointsEarned,
      pointsRedeemed,
      balance: pointsEarned - pointsRedeemed,
      influencers: influencerSummaries,
      invoices: invoicesList,
      redemptions: redemptionsList
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(l => l(this));
  }

  // --- GETTERS ---
  getMaterials() { return this.materials; }
  getHeadloaderProductIds() {
    if (!this.headloaderProductIds || !Array.isArray(this.headloaderProductIds)) {
      this.headloaderProductIds = [];
    }
    return this.headloaderProductIds;
  }
  setHeadloaderProductIds(ids) {
    this.headloaderProductIds = Array.isArray(ids) ? ids : Array.from(ids || []);
    const activeId = this.getActiveCompanyId();
    try {
      localStorage.setItem(`erp_headloader_products_${activeId}`, JSON.stringify(this.headloaderProductIds));
    } catch (e) {}
    this.saveState();
  }
  getHeadloaderTypes(operation = null) {
    if (!this.headloaderTypes || !Array.isArray(this.headloaderTypes) || this.headloaderTypes.length === 0) {
      const activeId = this.getActiveCompanyId();
      let lsTypes = null;
      try {
        const ls = localStorage.getItem(`erp_headloader_types_${activeId}`);
        if (ls) lsTypes = JSON.parse(ls);
      } catch (e) {}
      this.headloaderTypes = (Array.isArray(lsTypes) && lsTypes.length > 0)
        ? lsTypes
        : [{ id: "std", name: "Standard", category: "both", isDefault: true }];
    }
    // Ensure category field exists on each type
    this.headloaderTypes.forEach(t => {
      if (!t.category) t.category = t.id === "std" || t.isDefault ? "both" : "both";
    });

    if (operation === "loading") {
      return this.headloaderTypes.filter(t => t.category === "loading" || t.category === "both" || t.id === "std" || t.isDefault);
    }
    if (operation === "unloading") {
      return this.headloaderTypes.filter(t => t.category === "unloading" || t.category === "both" || t.id === "std" || t.isDefault);
    }
    return this.headloaderTypes;
  }
  setHeadloaderTypes(types) {
    this.headloaderTypes = (Array.isArray(types) && types.length > 0)
      ? types
      : [{ id: "std", name: "Standard", category: "both", isDefault: true }];
    const activeId = this.getActiveCompanyId();
    try {
      localStorage.setItem(`erp_headloader_types_${activeId}`, JSON.stringify(this.headloaderTypes));
    } catch (e) {}
    this.saveState();
  }
  addHeadloaderType(name, category = "both") {
    if (!name || !name.trim()) return null;
    const trimmed = name.trim();
    const types = [...this.getHeadloaderTypes()];
    const existing = types.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (category && existing.category !== category) {
        existing.category = category;
        this.setHeadloaderTypes(types);
      }
      return existing;
    }
    const newType = {
      id: "type_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: trimmed,
      category: category || "both",
      isDefault: false
    };
    types.push(newType);
    this.setHeadloaderTypes(types);
    return newType;
  }
  deleteHeadloaderType(id) {
    if (id === "std") return false;
    let types = this.getHeadloaderTypes();
    if (types.length <= 1) return false;
    types = types.filter(t => t.id !== id);
    this.setHeadloaderTypes(types);
    return true;
  }
  getHeadloaderDayOverrides() {
    if (!this.headloaderDayOverrides) {
      const activeId = this.getActiveCompanyId();
      let lsOverrides = null;
      try {
        const ls = localStorage.getItem(`erp_headloader_day_overrides_${activeId}`);
        if (ls) lsOverrides = JSON.parse(ls);
      } catch (e) {}
      this.headloaderDayOverrides = (lsOverrides && typeof lsOverrides === 'object') ? lsOverrides : {};
    }
    return this.headloaderDayOverrides;
  }
  setHeadloaderDayOverride(date, itemKey, { qty, rate }) {
    const overrides = this.getHeadloaderDayOverrides();
    const dayKey = date || "No Date";
    if (!overrides[dayKey]) overrides[dayKey] = {};
    if (!overrides[dayKey][itemKey]) overrides[dayKey][itemKey] = {};
    if (qty !== undefined && qty !== null && !isNaN(qty)) {
      overrides[dayKey][itemKey].qty = parseFloat(qty);
    }
    if (rate !== undefined && rate !== null && !isNaN(rate)) {
      overrides[dayKey][itemKey].rate = parseFloat(rate);
    }
    const activeId = this.getActiveCompanyId();
    try {
      localStorage.setItem(`erp_headloader_day_overrides_${activeId}`, JSON.stringify(overrides));
    } catch (e) {}
    this.saveState();
  }
  clearHeadloaderDayOverrides(date = null) {
    const overrides = this.getHeadloaderDayOverrides();
    if (date) {
      delete overrides[date];
    } else {
      this.headloaderDayOverrides = {};
    }
    const activeId = this.getActiveCompanyId();
    try {
      localStorage.setItem(`erp_headloader_day_overrides_${activeId}`, JSON.stringify(this.headloaderDayOverrides));
    } catch (e) {}
    this.saveState();
  }
  getContacts() {
    const balances = this.getAccountBalances();
    this.contacts.forEach(c => {
      if (c.siteType === "multiple" && Array.isArray(c.sites) && c.sites.length > 0) {
        c.balance = c.sites.reduce((sum, site) => {
          const key = `${c.id}::${site}`;
          return sum + (balances[key] ? balances[key].balance : 0);
        }, 0);
      } else {
        if (balances[c.id]) {
          c.balance = balances[c.id].balance;
        }
      }
    });
    return this.contacts;
  }
  getInvoices() {
    this.deduplicateAndEnforceUniqueInvoices(false);
    return this.invoices;
  }
  getTransactions() {
    return this.transactions;
  }
  getPurchases() {
    this.deduplicateAndEnforceUniquePurchases(false);
    return this.purchases;
  }
  getSalesReturns() { return this.salesReturns; }
  getPurchaseReturns() { return this.purchaseReturns; }
  getConversions() { return this.conversions; }
  getStockAdjustments() {
     if (!this.stockAdjustments) this.stockAdjustments = [];
     return this.stockAdjustments;
   }
   saveStockAdjustment(doc) {
     this.validateTransactionDate(doc.date || new Date().toISOString().split("T")[0]);
     if (!this.stockAdjustments) this.stockAdjustments = [];
     const idx = this.stockAdjustments.findIndex(a => a.id === doc.id);
     if (idx >= 0) {
       this.stockAdjustments[idx] = doc;
     } else {
       this.stockAdjustments.push(doc);
     }
     this.recreateStockAdjustmentTransaction(doc);
     this.recomputeAllStocks();
     this.saveState();
     return true;
   }
   deleteStockAdjustment(id) {
     if (!this.stockAdjustments) return false;
     const doc = this.stockAdjustments.find(a => a.id === id);
     if (!doc) return false;
     this.stockAdjustments = this.stockAdjustments.filter(a => a.id !== id);
     this.transactions = this.transactions.filter(t => t.reference !== `Stock Adj: ${doc.refNo}`);
     this.recomputeAllStocks();
     this.saveState();
     return true;
   }
   recreateStockAdjustmentTransaction(doc) {
     this.transactions = this.transactions.filter(t => t.reference !== `Stock Adj: ${doc.refNo}`);
     const entries = [];
     (doc.items || []).forEach(item => {
       const amt = parseFloat(item.amount) || 0;
       if (amt > 0) {
         if (item.stockAffect === "Add (+)") {
           entries.push({ accountId: "1200", debit: amt, credit: 0 });
           entries.push({ accountId: "4300", debit: 0, credit: amt });
         } else {
           entries.push({ accountId: "5500", debit: amt, credit: 0 });
           entries.push({ accountId: "1200", debit: 0, credit: amt });
         }
       }
     });
     if (entries.length > 0) {
       const txId = this.generateNextTxId();
       this.transactions.push({
         id: txId,
         date: doc.date || new Date().toISOString().split("T")[0],
         reference: `Stock Adj: ${doc.refNo}`,
         description: `Stock adjustment - Employee: ${doc.employee || "-"} - Depot: ${doc.depot || "-"} - ${doc.description || ""}`,
         entries: entries
       });
     }
   }

  getAccountGroups() {
    if (!this.accountGroups || this.accountGroups.length === 0) {
      this.accountGroups = JSON.parse(JSON.stringify(initialAccountGroups));
    }
    return this.accountGroups;
  }
  
  addAccountGroup(group) {
    if (!this.accountGroups) this.accountGroups = [];
    const conflict = this.accountGroups.some(g => g.name.toLowerCase() === group.name.toLowerCase());
    if (conflict) throw new Error(`Group "${group.name}" already exists.`);
    
    const id = String(Math.max(45, ...this.accountGroups.map(g => parseInt(g.id) || 0)) + 1);
    const newGroup = {
      id,
      name: group.name,
      under: group.under,
      isDefault: false
    };
    this.accountGroups.push(newGroup);
    this.saveState();
    return newGroup;
  }
  
  deleteAccountGroup(id) {
    const idx = this.accountGroups.findIndex(g => g.id === id);
    if (idx === -1) return false;
    this.accountGroups.splice(idx, 1);
    this.saveState();
    return true;
  }
  
  getGstMaster() {
    if (!this.gstMaster) this.gstMaster = [];
    return this.gstMaster;
  }

  addGstMasterEntry(entry) {
    if (!this.gstMaster) this.gstMaster = [];
    const conflict = this.gstMaster.some(e => e.name.toLowerCase() === entry.name.toLowerCase());
    if (conflict) {
      throw new Error(`GST entry "${entry.name}" already exists.`);
    }

    const id = "GST-" + String(this.gstMaster.length + 1).padStart(3, "0");
    const newEntry = {
      id,
      name: entry.name.toUpperCase(),
      percent: parseFloat(entry.percent) || 0,
      accountGroup: entry.accountGroup.toUpperCase()
    };
    this.gstMaster.push(newEntry);

    // Automatically create a ledger for it
    const ledgers = this.getLedgers();
    const ledgerExists = ledgers.some(l => String(l.name || "").toUpperCase() === newEntry.name.toUpperCase());
    if (!ledgerExists) {
      let maxNum = 0;
      ledgers.forEach(l => {
        if (l.code && l.code.startsWith("L")) {
          const num = parseInt(l.code.substring(1));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const code = "L" + String(maxNum + 1).padStart(3, "0");
      ledgers.push({
        code,
        name: newEntry.name,
        groupName: newEntry.accountGroup,
        openingBalance: 0,
        balanceType: "Debit"
      });
    }

    this.saveState();
    return newEntry;
  }

  deleteGstMasterEntry(id) {
    if (!this.gstMaster) this.gstMaster = [];
    const idx = this.gstMaster.findIndex(e => e.id === id);
    if (idx !== -1) {
      const entry = this.gstMaster[idx];
      this.gstMaster.splice(idx, 1);
      
      const ledgers = this.getLedgers();
      const lIdx = ledgers.findIndex(l => String(l.name || "").toUpperCase() === entry.name.toUpperCase());
      if (lIdx !== -1) {
        const ledgerCode = ledgers[lIdx].code;
        const hasTx = this.transactions.some(tx => tx.entries.some(ent => ent.accountId === ledgerCode));
        if (!hasTx) {
          ledgers.splice(lIdx, 1);
        }
      }

      this.saveState();
      return true;
    }
    return false;
  }
  
  getLedgers() {
    this.ensureDefaultLedgers();
    this.ensureStandardGstLedgers();
    return this.ledgers || [];
  }
  
  ensureDefaultLedgers() {
    if (!this.ledgers) this.ledgers = [];
    if (!initialLedgers || initialLedgers.length === 0) return;
    
    let stateChanged = false;
    const defaults = JSON.parse(JSON.stringify(initialLedgers));
    defaults.forEach(dl => {
      if (!this.ledgers.some(l => l.name && String(l.name || "").toUpperCase() === String(dl.name || "").toUpperCase())) {
        let targetCode = dl.code;
        if (this.ledgers.some(l => l.code === targetCode)) {
          let maxNum = 0;
          this.ledgers.forEach(l => {
            if (l.code && l.code.toUpperCase().startsWith("L")) {
              const num = parseInt(l.code.substring(1));
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          });
          targetCode = "L" + String(maxNum + 1).padStart(3, "0");
        }
        this.ledgers.push({
          code: targetCode,
          name: dl.name,
          groupName: dl.groupName,
          openingBalance: dl.openingBalance || 0,
          balanceType: dl.balanceType || "Debit"
        });
        stateChanged = true;
      }
    });
    if (stateChanged) {
      this.saveState();
    }
  }

  getOrCreateDutiesAndTaxesLedger(name) {
    if (!this.ledgers) this.ledgers = [];
    const upperName = String(name || "").toUpperCase();
    let ledger = this.ledgers.find(l => String(l.name || "").toUpperCase() === upperName);
    if (!ledger) {
      let maxNum = 0;
      this.ledgers.forEach(l => {
        if (l.code && l.code.startsWith("L")) {
          const num = parseInt(l.code.substring(1));
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const newCode = "L" + String(maxNum + 1).padStart(3, "0");
      ledger = {
        code: newCode,
        name: name,
        groupName: "DUTIES & TAXES",
        openingBalance: 0,
        balanceType: "Debit"
      };
      this.ledgers.push(ledger);
    }
    return ledger.code;
  }

  getOrCreateRoundOffLedger() {
    if (!this.ledgers) this.ledgers = [];
    let roundL = this.ledgers.find(l => {
      if (!l) return false;
      const n = String(l.name || "").toUpperCase();
      const c = String(l.code || "").toUpperCase();
      return n === "ROUND OFF" || n.includes("ROUND OFF") || n.includes("ROUNDING") || c === "L034" || c === "5130";
    });
    if (roundL) return roundL.code;

    const newCode = "L034";
    const ledger = {
      code: newCode,
      name: "ROUND OFF",
      groupName: "INDIRECT EXPENSES",
      openingBalance: 0,
      balanceType: "Debit"
    };
    this.ledgers.push(ledger);
    return newCode;
  }
  
  addLedger(ledger) {
    if (!this.ledgers) this.ledgers = [];
    
    const codeConflict = this.ledgers.some(l => l.code.toLowerCase() === ledger.code.toLowerCase());
    if (codeConflict) throw new Error("same ledger code already exist");

    const cleanName = ledger.name.trim().toUpperCase();
    const isContactSubledger = ledger.isCustomerSubLedger || ledger.parentCustomerId || ledger.groupName === "SUNDRY CREDITORS" || ledger.groupName === "SUNDRY DEBTORS";
    const nameConflict = this.ledgers.some(l => l.name.trim().toUpperCase() === cleanName) ||
                         (!isContactSubledger && this.contacts?.some(c => c.name.trim().toUpperCase() === cleanName));
    if (nameConflict) throw new Error("same ledger name already exist");
    
    const newLedger = {
      code: ledger.code.toUpperCase(),
      name: cleanName,
      groupName: ledger.groupName.toUpperCase(),
      openingBalance: parseFloat(ledger.openingBalance) || 0,
      balanceType: ledger.balanceType || "Debit",
      parentCustomerId: ledger.parentCustomerId || null,
      isCustomerSubLedger: !!ledger.isCustomerSubLedger
    };
    this.ledgers.push(newLedger);
    this.saveState();
    return newLedger;
  }
  
  updateLedger(code, ledgerData) {
    const l = this.ledgers.find(x => x.code === code);
    if (!l) return null;
    
    const cleanName = ledgerData.name.trim().toUpperCase();
    const isContactSubledger = ledgerData.isCustomerSubLedger || l.isCustomerSubLedger || l.parentCustomerId || ledgerData.groupName === "SUNDRY CREDITORS" || ledgerData.groupName === "SUNDRY DEBTORS";
    const conflict = this.ledgers.some(x => x.code !== code && x.name.trim().toUpperCase() === cleanName);
    const contactConflict = !isContactSubledger && this.contacts?.some(c => c.name.trim().toUpperCase() === cleanName && c.ledgerCode !== code && c.id !== l.parentCustomerId);
    if (conflict || contactConflict) throw new Error("same ledger name already exist");

    l.name = cleanName;
    l.groupName = ledgerData.groupName.toUpperCase();
    l.openingBalance = parseFloat(ledgerData.openingBalance) || 0;
    l.balanceType = ledgerData.balanceType || "Debit";
    if (ledgerData.parentCustomerId !== undefined) l.parentCustomerId = ledgerData.parentCustomerId;
    if (ledgerData.isCustomerSubLedger !== undefined) l.isCustomerSubLedger = ledgerData.isCustomerSubLedger;
    this.saveState();
    return l;
  }
  
  deleteLedger(code) {
    const existsInTransactions = this.transactions.some(tx => 
      tx.entries.some(e => e.accountId === code)
    );
    const existsInPurchases = this.purchases.some(p => 
      p.adjustmentsList?.some(a => a.ledgerCode === code)
    );
    const existsInInvoices = this.invoices.some(i => 
      i.adjustmentsList?.some(a => a.ledgerCode === code)
    );
    
    if (existsInTransactions || existsInPurchases || existsInInvoices) {
      throw new Error("THIS LEDGER/CUSTOMER/VENDOR CANNOT DELETE AS SOME VOUCHER EXISTS AGAINST THIS LEDGER/CUSTOMER");
    }

    const idx = this.ledgers.findIndex(l => l.code === code);
    if (idx === -1) return false;
    this.ledgers.splice(idx, 1);
    this.saveState();
    return true;
  }

  getCanonicalAccountId(accId) {
    if (!accId) return accId;
    const strId = String(accId).trim();
    if (ACCOUNTS[strId]) return strId;

    const baseId = strId.includes("::") ? strId.split("::")[0] : strId;
    const site = strId.includes("::") ? strId.split("::")[1] : "";

    // 1. Direct Contact match (by ID, ledgerCode, or normalized name)
    if (this.contacts) {
      for (let i = 0; i < this.contacts.length; i++) {
        const c = this.contacts[i];
        const cNormName = String(c.name || "").trim().toUpperCase();
        if (c.id === baseId || (c.ledgerCode && c.ledgerCode === baseId) || (cNormName && cNormName === baseId.toUpperCase())) {
          const canonical = c.ledgerCode || c.id;
          return site ? `${canonical}::${site}` : canonical;
        }
      }
    }

    // 2. Direct Ledger match (if ledger belongs to a contact, return the contact's canonical key)
    if (this.ledgers) {
      for (let i = 0; i < this.ledgers.length; i++) {
        const l = this.ledgers[i];
        const lNormName = String(l.name || "").trim().toUpperCase();
        if (l.code === baseId || (lNormName && lNormName === baseId.toUpperCase())) {
          if (this.contacts) {
            const cMatch = this.contacts.find(c => c.ledgerCode === l.code || c.id === l.code || (c.name && String(c.name).trim().toUpperCase() === lNormName));
            if (cMatch) {
              const canonical = cMatch.ledgerCode || cMatch.id;
              return site ? `${canonical}::${site}` : canonical;
            }
          }
          return site ? `${l.code}::${site}` : l.code;
        }
      }
    }

    // 3. Match unpadded/3-digit L-codes (e.g. L022 -> L0022) or Tradeasy ID
    const matchL = baseId.match(/^L(\d+)$/i);
    if (matchL) {
      const padded = "L" + matchL[1].padStart(4, "0");
      if (this.contacts) {
        const cMatch = this.contacts.find(c => c.ledgerCode === padded || c.id === padded);
        if (cMatch) {
          const canonical = cMatch.ledgerCode || cMatch.id;
          return site ? `${canonical}::${site}` : canonical;
        }
      }
      if (this.ledgers) {
        const lMatch = this.ledgers.find(l => l.code === padded);
        if (lMatch) return site ? `${padded}::${site}` : padded;
      }
      const num = parseInt(matchL[1]);
      if (this.ledgers) {
        const lMatch = this.ledgers.find(l => l.tradeasyId === num);
        if (lMatch) return site ? `${lMatch.code}::${site}` : lMatch.code;
      }
    }

    // 4. Match unpadded/3-digit CUST-codes (e.g. CUST-022 -> CUST-0022) or Tradeasy ID
    const matchCust = baseId.match(/^(CUST|VEND)-(\d+)$/i);
    if (matchCust) {
      const padded = matchCust[1].toUpperCase() + "-" + matchCust[2].padStart(4, "0");
      if (this.contacts) {
        const cMatch = this.contacts.find(c => c.id === padded || c.ledgerCode === padded);
        if (cMatch) {
          const canonical = cMatch.ledgerCode || cMatch.id;
          return site ? `${canonical}::${site}` : canonical;
        }
      }
    }

    return strId;
  }

  getAccountBalances(endDate = "") {
    if (!endDate && this._accountBalancesCache) {
      return this._accountBalancesCache;
    }
    const balances = {};
    
    // Initialize core accounts
    for (const code of Object.keys(ACCOUNTS)) {
      balances[code] = { balance: 0 };
    }
    balances["1100"] = { balance: 0 };
    balances["2100"] = { balance: 0 };

    const ledgers = this.getLedgers();
    ledgers.forEach(l => {
      const op = parseFloat(l.openingBalance) || 0;
      let bal = l.balanceType === "Debit" ? op : -op;
      balances[l.code] = { balance: bal };
    });

    const contactsById = new Map();
    (this.contacts || []).forEach(c => {
      if (!c) return;
      if (c.id) contactsById.set(String(c.id).toUpperCase(), c);
      if (c.ledgerCode) contactsById.set(String(c.ledgerCode).toUpperCase(), c);
      if (c.name) contactsById.set(String(c.name).trim().toUpperCase(), c);
    });
    (this.ledgers || []).forEach(l => {
      if (!l) return;
      if (l.parentCustomerId) {
        const parentC = (this.contacts || []).find(c => c.id === l.parentCustomerId);
        if (parentC && l.code) contactsById.set(String(l.code).toUpperCase(), parentC);
      }
    });

    if (this.contacts) {
      this.contacts.forEach(c => {
        const controlAcc = (c.type === "supplier" || c.listInVendorList || c.groupName === "SUNDRY CREDITORS") ? "2100" : "1100";
        let bType = c.balanceType;
        if (!bType) {
          bType = (c.type === "supplier" || c.listInVendorList || c.groupName === "SUNDRY CREDITORS") ? "Credit" : "Debit";
        }
        if (c.siteType === "multiple" && Array.isArray(c.sites) && c.sites.length > 0) {
          c.sites.forEach(site => {
            let siteOpBal = c.openingBalances && c.openingBalances[site] !== undefined ? parseFloat(c.openingBalances[site]) : 0;
            if (siteOpBal !== 0 && bType === "Credit") siteOpBal = -Math.abs(siteOpBal);
            else if (siteOpBal !== 0 && bType === "Debit") siteOpBal = Math.abs(siteOpBal);
            balances[`${c.id}::${site}`] = { balance: siteOpBal };
            // Mirror opening balance into control account
            if (siteOpBal !== 0 && balances[controlAcc]) {
              balances[controlAcc].balance += siteOpBal;
            }
          });
        } else {
          let opBal = parseFloat(c.openingBalance) || 0;
          if (opBal !== 0 && bType === "Credit") opBal = -Math.abs(opBal);
          else if (opBal !== 0 && bType === "Debit") opBal = Math.abs(opBal);
          balances[c.id] = { balance: opBal };
          // Mirror opening balance into control account
          if (opBal !== 0 && balances[controlAcc]) {
            balances[controlAcc].balance += opBal;
          }
        }
      });
    }

    const invByDocId = new Map();
    (this.invoices || []).forEach(i => {
      if (!i) return;
      if (i.id) invByDocId.set(String(i.id), i);
      if (i.voucherNo) invByDocId.set(String(i.voucherNo), i);
      if (i.refNo) invByDocId.set(String(i.refNo), i);
    });
    const purByDocId = new Map();
    (this.purchases || []).forEach(p => {
      if (!p) return;
      if (p.id) purByDocId.set(String(p.id), p);
      if (p.voucherNo) purByDocId.set(String(p.voucherNo), p);
      if (p.refNo) purByDocId.set(String(p.refNo), p);
      if (p.invoiceNo) purByDocId.set(String(p.invoiceNo), p);
    });

    const seenTxIds = new Set();
    const txsByRef = new Set();

    (this.transactions || []).forEach(tx => {
      if (!tx || !tx.id || seenTxIds.has(tx.id) || tx.isCancelled) return;
      if (endDate && tx.date > endDate) return;

      const vRef = String(tx.reference || "").trim();
      if (vRef) txsByRef.add(vRef);
      if (vRef && !["JV", "JOURNAL ENTRY", "CONTRA", "PAYMENT", "RECEIPT"].includes(vRef.toUpperCase())) {
        const totalDebit = (tx.entries || []).reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
        const docSig = `${vRef}::${tx.date}::${totalDebit.toFixed(2)}`;
        txsByRef.add(docSig);
      }
      seenTxIds.add(tx.id);

      (tx.entries || []).forEach(e => {
        if (!e || !e.accountId) return;
        let rawAccId = String(e.accountId).trim();
        let baseAccId = rawAccId.includes("::") ? rawAccId.split("::")[0].toUpperCase() : rawAccId.toUpperCase();
        let accId = this.getCanonicalAccountId(rawAccId);
        if (accId) accId = String(accId);
        const amount = (parseFloat(e.debit) || 0) - (parseFloat(e.credit) || 0);

        if (accId && balances[accId]) {
          balances[accId].balance += amount;
        }

        const contact = contactsById.get(baseAccId) || (accId ? contactsById.get(accId.toUpperCase()) : null);
        if (contact) {
          let targetKey = contact.id;
          if (rawAccId.includes("::")) {
            targetKey = `${contact.id}::${rawAccId.split("::")[1]}`;
          }
          if (balances[targetKey] && targetKey !== accId) {
            balances[targetKey].balance += amount;
          }

          if (accId !== "1100" && accId !== "2100" && baseAccId !== "1100" && baseAccId !== "2100") {
            const controlAcc = (contact.type === "supplier" || contact.listInVendorList || contact.groupName === "SUNDRY CREDITORS") ? "2100" : "1100";
            if (balances[controlAcc]) {
              balances[controlAcc].balance += amount;
            }
          }
        }
      });
    });

    (this.invoices || []).forEach(inv => {
      if (!inv || inv.isCancelled) return;
      if (endDate && inv.date > endDate) return;
      const isCreditInv = inv.payMode === "Credit" || (!inv.payMode && inv.contactId && inv.contactId !== "__CASH__");
      if (!isCreditInv) return;
      const invContactId = String(inv.contactId || "").split("::")[0].toUpperCase();
      const contact = contactsById.get(invContactId);
      if (contact) {
        const vNo = inv.voucherNo || inv.id || "";
        const docSig = `Sales::${vNo}`;
        if (!txsByRef.has(vNo) && !txsByRef.has(docSig)) {
          const amt = parseFloat(inv.total) || 0;
          if (balances[contact.id]) balances[contact.id].balance += amt;
          const controlAcc = (contact.type === "supplier" || contact.listInVendorList || contact.groupName === "SUNDRY CREDITORS") ? "2100" : "1100";
          if (balances[controlAcc]) {
            balances[controlAcc].balance += amt;
          }
        }
      }
    });

    (this.purchases || []).forEach(pur => {
      if (!pur || pur.isCancelled) return;
      if (endDate && pur.date > endDate) return;
      const isCreditPur = pur.payMode === "Credit" || (!pur.payMode && (pur.supplierId || pur.contactId) !== "__CASH__");
      if (!isCreditPur) return;
      const purContactId = String(pur.supplierId || pur.contactId || "").split("::")[0].toUpperCase();
      const contact = contactsById.get(purContactId);
      if (contact) {
        const vNo = pur.voucherNo || pur.id || pur.invoiceNo || "";
        const docSig = `Purchase::${vNo}`;
        if (!txsByRef.has(vNo) && !txsByRef.has(docSig)) {
          const amt = parseFloat(pur.total) || 0;
          if (balances[contact.id]) balances[contact.id].balance -= amt;
          const controlAcc = (contact.type === "supplier" || contact.listInVendorList || contact.groupName === "SUNDRY CREDITORS") ? "2100" : "1100";
          if (balances[controlAcc]) {
            balances[controlAcc].balance -= amt;
          }
        }
      }
    });

    if (!endDate) {
      this._accountBalancesCache = balances;
    }
    return balances;
  }

  getProductGroups() { return this.productGroups; }
  getCategories() { return this.categories; }
  getSubCategories() { return this.subCategories; }
  getProductNames() {
    return this.productNames || [];
  }

  getSalesAdjustments() {
    this.ensureDefaultAdjustments();
    return this.salesAdjustments || [];
  }
  getPurchaseAdjustments() {
    this.ensureDefaultAdjustments();
    return this.purchaseAdjustments || [];
  }
  
  ensureDefaultAdjustments() {
    let stateChanged = false;
    
    const getLedgerCodeByName = (name, fallbackCode) => {
      if (!this.ledgers) return fallbackCode;
      const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === name.toUpperCase());
      return l ? l.code : fallbackCode;
    };

    if (!this.salesAdjustments || this.salesAdjustments.length === 0) {
      this.salesAdjustments = [
        { name: "FREIGHT", ledgerCode: getLedgerCodeByName("FREIGHT ON SALES", "L030") },
        { name: "LOADING CHARGE", ledgerCode: getLedgerCodeByName("LOADING CHARGE", "L032") },
        { name: "LOADING CHARGES", ledgerCode: getLedgerCodeByName("LOADING CHARGE", "L032") },
        { name: "UNLOADING CHARGE AT SITE", ledgerCode: getLedgerCodeByName("UNLOADING CHARGE", "L033") }
      ];
      stateChanged = true;
    }

    if (!this.purchaseAdjustments || this.purchaseAdjustments.length === 0) {
      this.purchaseAdjustments = [
        { name: "FREIGHT", ledgerCode: getLedgerCodeByName("FREIGHT ON PURCHASE", "L031") },
        { name: "UNLOADING CHARGE", ledgerCode: getLedgerCodeByName("UNLOADING CHARGE", "L033") }
      ];
      stateChanged = true;
    }
    
    if (stateChanged) {
      this.saveState();
    }
  }
  saveSalesAdjustments(list) {
    this.salesAdjustments = list;
    this.saveState();
  }
  savePurchaseAdjustments(list) {
    this.purchaseAdjustments = list;
    this.saveState();
  }

  getHsnCodes() {
    const is4Digit = this.getOptions().enable4DigitHsn !== false;
    if (!this.hsnCodes) {
      this.hsnCodes = is4Digit ? ["2523", "7214", "2505", "6901", "2517"] : ["25230000", "72140000", "25050000", "69010000", "25170000"];
    }
    return this.hsnCodes;
  }

  addHsnCode(code, description = "") {
    const is4Digit = this.getOptions().enable4DigitHsn !== false;
    if (!this.hsnCodes) {
      this.hsnCodes = is4Digit ? ["2523", "7214", "2505", "6901", "2517"] : ["25230000", "72140000", "25050000", "69010000", "25170000"];
    }
    const cleanCode = String(code).trim();
    if (cleanCode && !this.hsnCodes.includes(cleanCode)) {
      this.hsnCodes.push(cleanCode);
      if (description) {
        if (!this.hsnDescriptions) this.hsnDescriptions = {};
        this.hsnDescriptions[cleanCode] = String(description).trim();
      }
      this.saveState();
      return true;
    }
    return false;
  }

  getHsnDescription(code) {
    if (!code) return "";
    const cleanCode = String(code).trim();
    if (!cleanCode) return "";

    // 1. Check user-saved custom HSN descriptions
    if (this.hsnDescriptions && this.hsnDescriptions[cleanCode]) {
      return this.hsnDescriptions[cleanCode];
    }

    // 2. Check existing materials in database
    const existingMat = (this.materials || []).find(m => m && m.hsnCode === cleanCode && m.description && m.description.trim());
    if (existingMat && existingMat.description) {
      return existingMat.description;
    }

    // 3. Exact match in standard dictionary
    if (STANDARD_HSN_DESCRIPTIONS[cleanCode]) {
      return STANDARD_HSN_DESCRIPTIONS[cleanCode];
    }

    // 4. Prefix match (e.g. 8-digit or 6-digit HSN matching 4-digit heading)
    if (cleanCode.length >= 4) {
      const prefix4 = cleanCode.substring(0, 4);
      if (STANDARD_HSN_DESCRIPTIONS[prefix4]) {
        return STANDARD_HSN_DESCRIPTIONS[prefix4];
      }
      if (this.hsnDescriptions && this.hsnDescriptions[prefix4]) {
        return this.hsnDescriptions[prefix4];
      }
    }

    // 5. 2-digit chapter match if available
    if (cleanCode.length >= 2) {
      const prefix2 = cleanCode.substring(0, 2);
      if (STANDARD_HSN_DESCRIPTIONS[prefix2]) {
        return STANDARD_HSN_DESCRIPTIONS[prefix2];
      }
    }

    return "";
  }

  setHsnDescription(code, description) {
    if (!code) return;
    const cleanCode = String(code).trim();
    const cleanDesc = String(description || "").trim();
    if (!cleanCode) return;
    if (!this.hsnDescriptions) this.hsnDescriptions = {};
    if (cleanDesc) {
      this.hsnDescriptions[cleanCode] = cleanDesc;
    } else {
      delete this.hsnDescriptions[cleanCode];
    }
    this.saveState();
  }

  suggest4DigitHsn(criteria = {}) {
    const is4Digit = this.getOptions().enable4DigitHsn !== false;
    const name = String(criteria.name || "").trim().toLowerCase();
    const category = String(criteria.category || "").trim().toLowerCase();
    const subCategory = String(criteria.subCategory || "").trim().toLowerCase();
    const productGroup = String(criteria.productGroup || "").trim().toLowerCase();
    const allText = `${name} ${category} ${subCategory} ${productGroup}`.toLowerCase();

    if (!allText.trim()) return "";

    // 1. Check existing materials in the database for exact/similar match
    const matchMat = (this.materials || []).find(m => {
      if (!m || !m.hsnCode) return false;
      const mName = String(m.name || "").toLowerCase();
      const mCat = String(m.category || "").toLowerCase();
      const mSub = String(m.subCategory || "").toLowerCase();
      if (name && mName === name) return true;
      if (subCategory && mSub === subCategory) return true;
      if (category && mCat === category) return true;
      return false;
    });

    if (matchMat && matchMat.hsnCode) {
      const code = String(matchMat.hsnCode).trim();
      return is4Digit && code.length > 4 ? code.substring(0, 4) : code;
    }

    // 2. Keyword matching against standard 4-digit HSN categories
    const rules = [
      // Cement / Lime / Plasters
      { keywords: ["cement", "opc", "ppc", "psc", "portland", "white cement"], hsn: "2523" },
      { keywords: ["river sand", "m sand", "m-sand", "p sand", "p-sand", "silica sand", "fine sand", "sand"], hsn: "2505" },
      { keywords: ["aggregates", "aggregate", "gravel", "jelly", "blue metal", "broken stone", "crushed stone", "ballast", "granite chips", "grit"], hsn: "2517" },
      { keywords: ["gypsum", "plaster of paris", "pop", "anhydrite"], hsn: "2520" },
      { keywords: ["quicklime", "slaked lime", "hydraulic lime", "chuna"], hsn: "2522" },
      { keywords: ["marble slab", "marble", "travertine"], hsn: "2515" },
      { keywords: ["granite slab", "granite", "sandstone", "basalt", "porphyry"], hsn: "2516" },

      // Paints / Putty / Chemicals / Plastics (check specific keywords first)
      { keywords: ["wall putty", "acrylic putty", "putty"], hsn: "3214" },
      { keywords: ["paints", "paint", "emulsion", "distemper", "enamel", "varnish", "stainer", "primer", "luster"], hsn: "3208" },
      { keywords: ["pvc pipe", "cpvc pipe", "upvc pipe", "pvc", "cpvc", "upvc", "conduit pipe", "swr pipe", "plumbing pipe", "pipe fitting", "pipes"], hsn: "3917" },
      { keywords: ["water tank", "pvc tank", "sintex", "loft tank", "plastic tank", "pvc door"], hsn: "3925" },
      { keywords: ["fevicol", "adhesive", "glue", "epoxy", "araldite", "sealant", "silicone"], hsn: "3506" },
      { keywords: ["waterproofing", "dr fixit", "waterproof", "admixture", "curing compound", "chemical", "grout"], hsn: "3824" },

      // Steel / Iron / Rebars / Metals
      { keywords: ["tmt", "rebar", "rebars", "reinforcement", "fe 500", "fe 550", "tor steel", "steel rod", "steel bar"], hsn: "7214" },
      { keywords: ["binding wire", "gi wire", "ms wire", "barbed wire", "galvanized wire"], hsn: "7217" },
      { keywords: ["hr sheet", "hr plate", "hr coil", "hot rolled"], hsn: "7208" },
      { keywords: ["cr sheet", "cr coil", "cold rolled"], hsn: "7209" },
      { keywords: ["gi sheet", "gp sheet", "corrugated sheet", "roofing sheet", "galvanized iron"], hsn: "7210" },
      { keywords: ["angle", "channel", "beam", "joist", "isumb", "isjb", "t iron", "structural steel", "steel section"], hsn: "7216" },
      { keywords: ["ms pipe", "gi pipe", "steel pipe", "square pipe", "rectangular pipe", "erw pipe"], hsn: "7306" },
      { keywords: ["truss", "shed", "steel structure", "roof truss"], hsn: "7308" },
      { keywords: ["wire mesh", "welded mesh", "chainlink", "chicken mesh", "fencing mesh", "metal mesh"], hsn: "7314" },
      { keywords: ["wire rope", "steel rope", "cable rope"], hsn: "7312" },
      { keywords: ["screw", "screws", "bolt", "bolts", "nut", "nuts", "washer", "rivet", "anchor bolt", "fastener", "fasteners", "nail", "nails"], hsn: "7318" },
      { keywords: ["copper pipe", "copper tube", "copper wire", "copper"], hsn: "7411" },
      { keywords: ["aluminium door", "aluminium window", "aluminium partition"], hsn: "7610" },
      { keywords: ["aluminium", "aluminum", "al profile", "al section"], hsn: "7604" },
      { keywords: ["steel", "iron"], hsn: "7214" },

      // Bricks / Tiles / Ceramic / Stone
      { keywords: ["brick", "bricks", "clay brick", "fly ash", "red brick", "solid brick", "hollow brick", "fire brick"], hsn: "6901" },
      { keywords: ["tile", "tiles", "vitrified", "ceramic tile", "floor tile", "wall tile", "paving tile", "parking tile"], hsn: "6907" },
      { keywords: ["roof tile", "roofing tile", "mangalore tile"], hsn: "6905" },
      { keywords: ["basin", "sink", "commode", "closet", "urinal", "sanitary", "sanitaryware", "toilet", "wash basin", "ewc", "iwc"], hsn: "6910" },
      { keywords: ["paver block", "interlock", "concrete block", "precast", "cement brick", "solid block", "hollow block"], hsn: "6810" },
      { keywords: ["asbestos", "cement sheet", "ac sheet"], hsn: "6811" },
      { keywords: ["polished stone", "granite slab", "marble slab"], hsn: "6802" },

      // Wood & Glass
      { keywords: ["plywood", "ply", "block board", "flush door", "veneer", "marine ply", "shuttering ply"], hsn: "4412" },
      { keywords: ["wood", "timber", "teak", "plank", "sawn wood"], hsn: "4407" },
      { keywords: ["mdf", "hdf", "fibreboard"], hsn: "4411" },
      { keywords: ["particle board", "osb"], hsn: "4410" },
      { keywords: ["wooden door", "door frame", "window frame", "joinery"], hsn: "4418" },
      { keywords: ["glass", "mirror", "toughened glass", "float glass"], hsn: "7005" },

      // Hardware & Plumbing
      { keywords: ["tap", "valve", "cock", "bib tap", "pillar tap", "mixer", "ball valve", "gate valve", "faucet", "plumbing"], hsn: "8481" },
      { keywords: ["hinge", "handle", "tower bolt", "aldrop", "door closer", "lock", "padlock", "mortice lock", "hardware"], hsn: "8302" },
      { keywords: ["shovel", "spade", "pickaxe", "trowel", "hammer", "pliers", "spanner", "tool", "tools", "chisel"], hsn: "8205" },

      // Electricals & Lighting
      { keywords: ["wire", "cable", "electrical wire", "copper cable", "flexible cable", "submersible cable"], hsn: "8544" },
      { keywords: ["switch", "socket", "mcb", "rccb", "distribution box", "fuse", "db box", "switchboard", "electrical"], hsn: "8536" },
      { keywords: ["bulb", "led bulb", "tube light", "lamp", "led panel", "spot light", "cfl"], hsn: "8539" },
      { keywords: ["led light", "light fixture", "flood light", "street light"], hsn: "9405" },

      // Services / Transport
      { keywords: ["construction", "civil work", "masonry", "contractor"], hsn: "9954" },
      { keywords: ["transport", "freight", "cartage", "loading", "unloading", "shipping", "delivery"], hsn: "9965" }
    ];

    for (const rule of rules) {
      for (const kw of rule.keywords) {
        const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
        if (regex.test(allText)) {
          return is4Digit ? rule.hsn : `${rule.hsn}0000`;
        }
      }
    }

    return "";
  }

  // --- METADATA WRITERS ---
  addProductGroup(name) {
    const clean = String(name).trim().toUpperCase();
    if (!clean) return false;
    const upperList = this.productGroups.map(x => String(x).toUpperCase());
    if (upperList.includes(clean)) {
      throw new Error("PRODUCT GROUP ALREADY EXISTS.");
    }
    this.productGroups.push(clean);
    this.saveState();
    return true;
  }

  addCompany(name) {
    const clean = String(name).trim().toUpperCase();
    if (!clean) return false;
    const upperList = this.companies.map(x => String(x).toUpperCase());
    if (upperList.includes(clean)) {
      throw new Error("COMPANY / BRAND ALREADY EXISTS.");
    }
    this.companies.push(clean);
    this.saveState();
    return true;
  }

  addCategory(name) {
    const clean = String(name).trim().toUpperCase();
    if (!clean) return false;
    const upperList = this.categories.map(x => String(x).toUpperCase());
    if (upperList.includes(clean)) {
      throw new Error("CATEGORY ALREADY EXISTS.");
    }
    this.categories.push(clean);
    this.saveState();
    return true;
  }

  addSubCategory(name) {
    const clean = String(name).trim().toUpperCase();
    if (!clean) return false;
    const upperList = this.subCategories.map(x => String(x).toUpperCase());
    if (upperList.includes(clean)) {
      throw new Error("SUB CATEGORY ALREADY EXISTS.");
    }
    this.subCategories.push(clean);
    this.saveState();
    return true;
  }

  addProductName(name) {
    const clean = String(name).trim().toUpperCase();
    if (!clean) return false;
    const upperList = this.productNames.map(x => String(x).toUpperCase());
    if (upperList.includes(clean)) {
      throw new Error("PRODUCT NAME CLASS ALREADY EXISTS.");
    }
    this.productNames.push(clean);
    this.saveState();
    return true;
  }

  // --- CONTACT OPERATIONS ---
  addContact(contactData) {
    if (contactData.gstin && String(contactData.gstin).trim().length > 0 && String(contactData.gstin).trim().length !== 15) {
      throw new Error("GSTIN NUMBER MUST BE EXACTLY 15 CHARACTERS LONG.");
    }

    const cleanName = contactData.name.trim().toUpperCase();
    const conflict = this.contacts.some(c => c.name.trim().toUpperCase() === cleanName);
    const ledgerConflict = this.ledgers?.some(l => 
      l.name.trim().toUpperCase() === cleanName && 
      l.groupName !== "SUNDRY CREDITORS" && 
      l.groupName !== "SUNDRY DEBTORS"
    );
    if (conflict || ledgerConflict) {
      throw new Error("same ledger name already exist");
    }

    const existingLedger = this.ledgers?.find(l => 
      l.name.trim().toUpperCase() === cleanName && 
      (l.groupName === "SUNDRY CREDITORS" || l.groupName === "SUNDRY DEBTORS")
    );

    if (contactData.siteType === "multiple" && Array.isArray(contactData.sites)) {
      const siteSet = new Set();
      for (const s of contactData.sites) {
        const lower = s.toLowerCase();
        if (siteSet.has(lower)) {
          throw new Error(`Duplicate site name "${s}" is not allowed.`);
        }
        siteSet.add(lower);
      }
    }

    const id = (contactData.type === "supplier" ? "SUP-" : "CUST-") + String(this.contacts.length + 1).padStart(3, "0");
    const newContact = {
      id,
      name: cleanName,
      type: contactData.type,
      ledgerCode: contactData.ledgerCode || (existingLedger ? existingLedger.code : ""),
      nameInBill: contactData.nameInBill ? contactData.nameInBill.trim().toUpperCase() : cleanName,
      groupName: contactData.groupName || (contactData.type === "supplier" ? "SUNDRY CREDITORS" : "SUNDRY DEBTORS"),
      billingAddress: contactData.billingAddress || "",
      shippingAddress: contactData.shippingAddress || "",
      isShippingSame: !!contactData.isShippingSame,
      phone: contactData.phone || "",
      mobile: contactData.mobile || "",
      whatsApp: contactData.whatsApp || "",
      state: contactData.state || "KERALA",
      district: contactData.district || "",
      pincode: contactData.pincode || "",
      fax: contactData.fax || "",
      email: contactData.email || "",
      contactPerson: contactData.contactPerson || "",
      gstin: contactData.gstin || "",
      dlNo1: contactData.dlNo1 || "",
      creditLimit: parseFloat(contactData.creditLimit) || 0,
      creditPeriod: contactData.creditPeriod || "",
      salesExecutive: contactData.salesExecutive || "",
      openingBalance: parseFloat(contactData.openingBalance) || 0,
      balance: parseFloat(contactData.openingBalance) || 0,
      openingBalances: contactData.openingBalances || {},
      bankName: contactData.bankName || "",
      accountNo: contactData.accountNo || "",
      ifsc: contactData.ifsc || "",
      swiftCode: contactData.swiftCode || "",
      nameInCheque: contactData.nameInCheque || cleanName,
      siteType: contactData.siteType || "single",
      sites: Array.isArray(contactData.sites) ? contactData.sites : [],
      hasOtherLedgers: !!contactData.hasOtherLedgers,
      listInVendorList: !!contactData.listInVendorList,
      listInCustomerList: !!contactData.listInCustomerList
    };

    if (existingLedger && !existingLedger.parentCustomerId) {
      existingLedger.parentCustomerId = id;
    }

    this.contacts.push(newContact);
    this.saveState();
    return newContact;
  }

  updateContact(id, updatedData) {
    const contact = this.contacts.find(c => c.id === id);
    if (!contact) return null;

    if (updatedData.gstin && String(updatedData.gstin).trim().length > 0 && String(updatedData.gstin).trim().length !== 15) {
      throw new Error("GSTIN NUMBER MUST BE EXACTLY 15 CHARACTERS LONG.");
    }

    const cleanName = updatedData.name.trim().toUpperCase();
    const oldName = (contact.name || "").trim().toUpperCase();

    const conflict = this.contacts.some(c => c.id !== id && c.name.trim().toUpperCase() === cleanName);
    const ledgerConflict = this.ledgers?.some(l => {
      const lName = l.name.trim().toUpperCase();
      if (lName !== cleanName) return false;
      if (contact.ledgerCode && l.code === contact.ledgerCode) return false;
      if (l.parentCustomerId && l.parentCustomerId === id) return false;
      if (l.groupName === "SUNDRY CREDITORS" || l.groupName === "SUNDRY DEBTORS") return false;
      if (oldName === cleanName) return false;
      return true;
    });

    if (conflict || ledgerConflict) {
      throw new Error("same ledger name already exist");
    }

    if (updatedData.siteType === "multiple" && Array.isArray(updatedData.sites)) {
      const siteSet = new Set();
      for (const s of updatedData.sites) {
        const lower = s.toLowerCase();
        if (siteSet.has(lower)) {
          throw new Error(`Duplicate site name "${s}" is not allowed.`);
        }
        siteSet.add(lower);
      }
    }

    Object.assign(contact, {
      name: cleanName,
      type: updatedData.type,
      ledgerCode: updatedData.ledgerCode || contact.ledgerCode || "",
      nameInBill: updatedData.nameInBill ? updatedData.nameInBill.trim().toUpperCase() : cleanName,
      groupName: updatedData.groupName || (updatedData.type === "supplier" ? "SUNDRY CREDITORS" : "SUNDRY DEBTORS"),
      billingAddress: updatedData.billingAddress || "",
      shippingAddress: updatedData.shippingAddress || "",
      isShippingSame: !!updatedData.isShippingSame,
      phone: updatedData.phone || "",
      mobile: updatedData.mobile || "",
      whatsApp: updatedData.whatsApp || "",
      state: updatedData.state || "KERALA",
      district: updatedData.district || "",
      pincode: updatedData.pincode || "",
      fax: updatedData.fax || "",
      email: updatedData.email || "",
      contactPerson: updatedData.contactPerson || "",
      gstin: updatedData.gstin || "",
      dlNo1: updatedData.dlNo1 || "",
      creditLimit: parseFloat(updatedData.creditLimit) || 0,
      creditPeriod: updatedData.creditPeriod || "",
      salesExecutive: updatedData.salesExecutive || "",
      openingBalance: parseFloat(updatedData.openingBalance) || 0,
      openingBalances: updatedData.openingBalances || {},
      bankName: updatedData.bankName || "",
      accountNo: updatedData.accountNo || "",
      ifsc: updatedData.ifsc || "",
      swiftCode: updatedData.swiftCode || "",
      nameInCheque: updatedData.nameInCheque || cleanName,
      siteType: updatedData.siteType || "single",
      sites: Array.isArray(updatedData.sites) ? updatedData.sites : [],
      hasOtherLedgers: !!updatedData.hasOtherLedgers,
      listInVendorList: !!updatedData.listInVendorList,
      listInCustomerList: !!updatedData.listInCustomerList
    });

    if (this.ledgers && oldName !== cleanName) {
      this.ledgers.forEach(l => {
        if ((contact.ledgerCode && l.code === contact.ledgerCode) || l.parentCustomerId === id || l.name.trim().toUpperCase() === oldName) {
          l.name = cleanName;
        }
      });
    }

    this.saveState();
    return contact;
  }

  checkContactTransactionsAcrossAllYears(contactId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) {
      return { hasTransactions: false, contact: null };
    }

    const cId = String(contactId);
    const cName = (contact.name || "").trim().toUpperCase();
    const cCode = (contact.ledgerCode || "").trim().toUpperCase();
    const companies = this.getRegisteredCompanies();
    const activeCompanyId = this.getActiveCompanyId() || (companies[0] ? String(companies[0].id) : "1");
    const company = companies.find(c => String(c.id) === String(activeCompanyId)) || companies[0];
    const activeFyId = this.getActiveFyId();

    const isMatchEntry = (e) => {
      if (!e) return false;
      const accId = String(e.accountId || "").trim();
      const accName = String(e.accountName || "").trim().toUpperCase();
      if (accId === cId || accId.startsWith(cId + "::")) return true;
      if (cName && (accName === cName || accId.toUpperCase() === cName)) return true;
      if (cCode && (accId.toUpperCase() === cCode || accName === cCode)) return true;
      return false;
    };

    const isMatchDoc = (doc) => {
      if (!doc) return false;
      if (doc.contactId && String(doc.contactId) === cId) return true;
      const party = String(doc.contactName || doc.customerName || doc.vendorName || doc.influencerName || "").trim().toUpperCase();
      if (cName && party === cName) return true;
      return false;
    };

    // 1. Check Active Financial Year (In-Memory State)
    let currentFyName = "Current Financial Year";
    if (company && Array.isArray(company.financialYears)) {
      const activeFyObj = company.financialYears.find(f => String(f.id) === String(activeFyId));
      if (activeFyObj && activeFyObj.name) currentFyName = activeFyObj.name;
    }

    // Check transactions in active year
    const activeTxMatch = (this.transactions || []).find(tx => 
      (tx.entries && tx.entries.some(isMatchEntry)) || (tx.contactId && String(tx.contactId) === cId)
    );
    if (activeTxMatch) {
      return {
        hasTransactions: true,
        fyName: currentFyName,
        reason: `Voucher / Transaction (${activeTxMatch.id || activeTxMatch.reference || 'TX'}) found in ${currentFyName}`
      };
    }

    // Check invoices
    const activeInvMatch = (this.invoices || []).find(isMatchDoc);
    if (activeInvMatch) {
      return {
        hasTransactions: true,
        fyName: currentFyName,
        reason: `Sales Invoice (${activeInvMatch.voucherNo || activeInvMatch.id}) found in ${currentFyName}`
      };
    }

    // Check purchases
    const activePurchMatch = (this.purchases || []).find(isMatchDoc);
    if (activePurchMatch) {
      return {
        hasTransactions: true,
        fyName: currentFyName,
        reason: `Purchase Bill (${activePurchMatch.id || activePurchMatch.billNo}) found in ${currentFyName}`
      };
    }

    // Check sales returns
    const activeSrMatch = (this.salesReturns || []).find(isMatchDoc);
    if (activeSrMatch) {
      return {
        hasTransactions: true,
        fyName: currentFyName,
        reason: `Sales Return (${activeSrMatch.id || activeSrMatch.billNo}) found in ${currentFyName}`
      };
    }

    // Check purchase returns
    const activePrMatch = (this.purchaseReturns || []).find(isMatchDoc);
    if (activePrMatch) {
      return {
        hasTransactions: true,
        fyName: currentFyName,
        reason: `Purchase Return (${activePrMatch.id || activePrMatch.billNo}) found in ${currentFyName}`
      };
    }

    // Check influencer redemptions
    const activeIrMatch = (this.influencerRedemptions || []).find(isMatchDoc);
    if (activeIrMatch) {
      return {
        hasTransactions: true,
        fyName: currentFyName,
        reason: `Loyalty / Influencer Redemption found in ${currentFyName}`
      };
    }

    // Check active non-zero opening balance
    if ((contact.openingBalance && Math.abs(contact.openingBalance) > 0.001) ||
        (contact.openingBalances && Object.values(contact.openingBalances).some(v => Math.abs(v) > 0.001))) {
      return {
        hasTransactions: true,
        fyName: currentFyName,
        reason: `Non-zero Opening Balance recorded in ${currentFyName}`
      };
    }

    // 2. Check ALL Other Financial Years in Storage
    const checkedKeys = new Set();
    const fyMap = {};

    if (company && Array.isArray(company.financialYears)) {
      company.financialYears.forEach(fy => {
        const key = `erp_company_data_${activeCompanyId}${fy.id === 'default' ? '' : '_' + fy.id}`;
        fyMap[key] = fy.name || `F.Y. (${fy.startDate || ''} - ${fy.endDate || ''})`;
      });
    }

    // Collect all keys in localStorage for this company
    const allLsKeys = [];
    try {
      if (typeof localStorage !== "undefined" && localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith(`erp_company_data_${activeCompanyId}`) || k.startsWith("erp_company_data_"))) {
            if (!allLsKeys.includes(k)) allLsKeys.push(k);
          }
        }
      }
    } catch (e) {}

    // Add registered FY keys
    Object.keys(fyMap).forEach(k => {
      if (!allLsKeys.includes(k)) allLsKeys.push(k);
    });

    const currentActiveKey = `erp_company_data_${activeCompanyId}${activeFyId === 'default' ? '' : '_' + activeFyId}`;
    checkedKeys.add(currentActiveKey);

      for (const key of allLsKeys) {
        if (checkedKeys.has(key)) continue;
        checkedKeys.add(key);

        const fyLabel = fyMap[key] || "Historical Financial Year";
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const fyData = JSON.parse(raw);
          if (!fyData || typeof fyData !== "object") continue;

          // Check transactions
          const txMatch = (fyData.transactions || []).find(tx => 
            (tx.entries && tx.entries.some(isMatchEntry)) || (tx.contactId && String(tx.contactId) === cId)
          );
          if (txMatch) {
            return {
              hasTransactions: true,
              fyName: fyLabel,
              reason: `Voucher / Transaction (${txMatch.id || txMatch.reference || 'TX'}) found in ${fyLabel}`
            };
          }

          // Check invoices
          const invMatch = (fyData.invoices || []).find(isMatchDoc);
          if (invMatch) {
            return {
              hasTransactions: true,
              fyName: fyLabel,
              reason: `Sales Invoice (${invMatch.voucherNo || invMatch.id}) found in ${fyLabel}`
            };
          }

          // Check purchases
          const purchMatch = (fyData.purchases || []).find(isMatchDoc);
          if (purchMatch) {
            return {
              hasTransactions: true,
              fyName: fyLabel,
              reason: `Purchase Bill (${purchMatch.id || purchMatch.billNo}) found in ${fyLabel}`
            };
          }

          // Check sales returns
          const srMatch = (fyData.salesReturns || []).find(isMatchDoc);
          if (srMatch) {
            return {
              hasTransactions: true,
              fyName: fyLabel,
              reason: `Sales Return (${srMatch.id || srMatch.billNo}) found in ${fyLabel}`
            };
          }

          // Check purchase returns
          const prMatch = (fyData.purchaseReturns || []).find(isMatchDoc);
          if (prMatch) {
            return {
              hasTransactions: true,
              fyName: fyLabel,
              reason: `Purchase Return (${prMatch.id || prMatch.billNo}) found in ${fyLabel}`
            };
          }

          // Check influencer redemptions
          const irMatch = (fyData.influencerRedemptions || []).find(isMatchDoc);
          if (irMatch) {
            return {
              hasTransactions: true,
              fyName: fyLabel,
              reason: `Loyalty / Influencer Redemption found in ${fyLabel}`
            };
          }

          // Check non-zero opening balance in that FY
          const histContact = (fyData.contacts || []).find(c => c.id === cId || (cName && (c.name || "").trim().toUpperCase() === cName));
          if (histContact) {
            if ((histContact.openingBalance && Math.abs(histContact.openingBalance) > 0.001) ||
                (histContact.openingBalances && Object.values(histContact.openingBalances).some(v => Math.abs(v) > 0.001))) {
              return {
                hasTransactions: true,
                fyName: fyLabel,
                reason: `Non-zero Opening Balance recorded in ${fyLabel}`
              };
            }
          }
        } catch (e) {
          console.error(`Error checking transactions in FY store ${key}:`, e);
        }
      }

    return { hasTransactions: false, contact };
  }

  deleteContact(id, password = null) {
    if (password !== null && password !== undefined && password !== "") {
      if (!this.verifyAdminPassword(password)) {
        throw new Error("INCORRECT ADMIN / SECURITY PASSWORD. CUSTOMER DELETION ABORTED.");
      }
    }

    const contact = this.contacts.find(c => c.id === id);
    if (!contact) return false;

    const isCustomer = contact.type === "customer" || contact.listInCustomerList === true;
    const typeLabel = isCustomer ? "CUSTOMER" : (contact.type === "supplier" ? "VENDOR" : "LEDGER / CONTACT");

    const checkResult = this.checkContactTransactionsAcrossAllYears(id);
    if (checkResult.hasTransactions) {
      throw new Error(`CANNOT DELETE ${typeLabel} "${(contact.name || '').toUpperCase()}": ${checkResult.reason.toUpperCase()}. ACCOUNTS WITH TRANSACTION HISTORY IN ANY FINANCIAL YEAR CANNOT BE DELETED.`);
    }

    const idx = this.contacts.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.contacts.splice(idx, 1);
    this.saveState();

    // Clean up unused contact profile from other financial year stores in localStorage
    try {
      const activeCompanyId = this.getActiveCompanyId();
      if (activeCompanyId) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`erp_company_data_${activeCompanyId}`)) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const fyData = JSON.parse(raw);
              if (fyData && Array.isArray(fyData.contacts)) {
                const fIdx = fyData.contacts.findIndex(c => c.id === id);
                if (fIdx !== -1) {
                  fyData.contacts.splice(fIdx, 1);
                  localStorage.setItem(k, JSON.stringify(fyData));
                }
              }
            }
          }
        }
      }
    } catch (e) {}

    this.notifyListeners();
    return true;
  }

  getContactClosingBalance(contactId, siteName = null, upToDate = null) {
    if (!contactId || contactId === "__CASH__") {
      return {
        balance: 0,
        absBalance: 0,
        balanceFormatted: "₹0.00",
        suffix: "Dr",
        isDebit: true,
        name: "CASH SALES",
        statusText: "Cash Sale"
      };
    }

    const contact = (this.contacts || []).find(c => c && c.id === contactId);
    if (!contact) {
      return {
        balance: 0,
        absBalance: 0,
        balanceFormatted: "₹0.00",
        suffix: "Dr",
        isDebit: true,
        name: "UNKNOWN",
        statusText: "Customer not found"
      };
    }

    let rawBal = 0;
    let bType = contact.balanceType;
    if (!bType) {
      bType = (contact.type === "supplier" || contact.listInVendorList) ? "Credit" : "Debit";
    }
    if (siteName) {
      const siteOpBal = (contact.openingBalances && contact.openingBalances[siteName] !== undefined) ? parseFloat(contact.openingBalances[siteName]) : 0;
      rawBal = siteOpBal;
    } else if (contact.siteType === "multiple" && Array.isArray(contact.sites) && contact.sites.length > 0) {
      contact.sites.forEach(s => {
        const siteOpBal = (contact.openingBalances && contact.openingBalances[s] !== undefined) ? parseFloat(contact.openingBalances[s]) : 0;
        rawBal += siteOpBal;
      });
    } else {
      rawBal = parseFloat(contact.openingBalance) || 0;
    }
    if (rawBal !== 0 && bType === "Credit") rawBal = -Math.abs(rawBal);
    else if (rawBal !== 0 && bType === "Debit") rawBal = Math.abs(rawBal);

    const contactNameUpper = String(contact.name || "").toUpperCase();
    const childLedgerCodes = new Set();
    (this.ledgers || []).forEach(l => {
      if (!l) return;
      const lCode = String(l.code || "").trim().toUpperCase();
      const cCode = String(contact.ledgerCode || "").trim().toUpperCase();
      const lName = String(l.name || "").trim().toUpperCase();
      const isPrimary = (lCode && (lCode === cCode || lCode === "L" + String(contact.id).replace(/^(VEND|CUST)-/, ""))) || (lName && lName === contactNameUpper);
      if (l.parentCustomerId === contact.id || String(l.groupName || "").toUpperCase() === contactNameUpper) {
        childLedgerCodes.add(String(l.code));
        if (!isPrimary) {
          const op = parseFloat(l.openingBalance) || 0;
          rawBal += (l.balanceType === "Debit" ? op : -op);
        }
      }
    });

    const targetSiteKey = siteName ? `${contact.id}::${siteName}` : null;
    const isContactAccount = (accStr) => {
      if (!accStr) return false;
      const str = String(accStr);
      if (targetSiteKey) return str === targetSiteKey || str === contact.id;
      if (str === contact.id || str.startsWith(contact.id + "::")) return true;
      if (childLedgerCodes.has(str)) return true;
      return false;
    };

    const txs = this.transactions || [];
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      if (!tx || (upToDate && tx.date > upToDate)) continue;
      
      const entries = tx.entries || [];
      for (let j = 0; j < entries.length; j++) {
        const e = entries[j];
        if (e && isContactAccount(e.accountId)) {
          rawBal += ((parseFloat(e.debit) || 0) - (parseFloat(e.credit) || 0));
        }
      }
    }

    const absVal = Math.abs(rawBal);
    const isDebtor = contact.type === "customer" || contact.listInCustomerList === true || contact.groupName === "SUNDRY DEBTORS";

    let suffix = "Dr";
    let statusText = "NIL BALANCE";

    if (absVal > 0.005) {
      if (isDebtor) {
        suffix = rawBal >= 0 ? "Dr" : "Cr";
        statusText = rawBal >= 0 ? "RECEIVABLE / DR" : "ADVANCE / CR";
      } else {
        suffix = rawBal <= 0 ? "Cr" : "Dr";
        statusText = rawBal <= 0 ? "PAYABLE / CR" : "ADVANCE / DR";
      }
    } else {
      statusText = "NIL BALANCE";
    }

    return {
      balance: rawBal,
      absBalance: absVal,
      balanceFormatted: `₹${absVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}`,
      suffix: suffix,
      isDebit: isDebtor ? (rawBal >= 0) : (rawBal > 0),
      name: contact.name,
      statusText: statusText,
      creditLimit: contact.creditLimit || 0,
      creditPeriod: contact.creditPeriod || 0
    };
  }

  // --- INVENTORY OPERATIONS ---
  addMaterial(material) {
    const codeConflict = this.materials.some(m =>
      m.name.toLowerCase() === material.name.toLowerCase() &&
      m.code.toLowerCase() === material.code.toLowerCase()
    );
    if (codeConflict) {
      throw new Error(`The product code/model "${material.code}" already exists under "${material.name}". Use a unique code.`);
    }

    const id = "MAT-" + String(this.materials.length + 1).padStart(3, "0");
    const openingStock = parseFloat(material.stock) || 0;
    const newMaterial = {
      id,
      name: material.name,
      code: material.code || id,
      category: material.category,
      unit: material.unit || "Bags",
      reorderLevel: parseFloat(material.reorderLevel) || 0,
      barcode: material.barcode || "",
      eanCode: material.eanCode || "",
      productGroup: material.productGroup || "",
      company: material.company || "",
      subCategory: material.subCategory || "",
      hsnCode: material.hsnCode || "",
      description: material.description || "",
      productType: material.productType || "Goods",
      rackNo: material.rackNo || "",
      defaultDiscount: parseFloat(material.defaultDiscount) || 0,
      igst: (material.igst !== undefined && material.igst !== null && material.igst !== "") ? parseFloat(material.igst) : 18,
      cgst: (material.cgst !== undefined && material.cgst !== null && material.cgst !== "") ? parseFloat(material.cgst) : 9,
      sgst: (material.sgst !== undefined && material.sgst !== null && material.sgst !== "") ? parseFloat(material.sgst) : 9,
      cess: parseFloat(material.cess) || 0,
      addlCess: parseFloat(material.addlCess) || 0,
      cessOn: material.cessOn || "NetValue",
      alternateUnits: material.alternateUnits || [],
      loadingChargeEnabled: material.loadingChargeEnabled === true,
      loadingCharge: parseFloat(material.loadingCharge) || 0,
      unloadingChargeEnabled: material.unloadingChargeEnabled === true,
      unloadingCharge: parseFloat(material.unloadingCharge) || 0,
      // Flat stock fields (no batches)
      openingStock: openingStock,
      stock: openingStock,
      landingCost: parseFloat(material.landingCost) || 0,
      marginPercent: parseFloat(material.marginPercent) || 0,
      marginAmount: parseFloat(material.marginAmount) || 0,
      gstExclRate: parseFloat(material.gstExclRate) || 0,
      gstInclRate: parseFloat(material.gstInclRate) || 0,
      mrp: parseFloat(material.mrp) || 0,
      costPrice: parseFloat(material.landingCost) || 0,
      sellingPrice: parseFloat(material.gstExclRate) || 0,
      // Auto-create a batch matching landingCost when creating a product for the first time
      batches: [
        {
          batchNo: String(parseFloat(material.landingCost) || 0),
          landingCost: parseFloat(material.landingCost) || 0,
          openingStock: openingStock,
          stock: openingStock,
          marginPercent: parseFloat(material.marginPercent) || 0,
          marginAmount: parseFloat(material.marginAmount) || 0,
          gstExclRate: parseFloat(material.gstExclRate) || 0,
          gstInclRate: parseFloat(material.gstInclRate) || 0,
          mrp: parseFloat(material.mrp) || 0,
          sellingPrice: parseFloat(material.gstExclRate) || 0
        }
      ]
    };

    this.materials.push(newMaterial);

    if (openingStock > 0) {
      const costAmount = openingStock * newMaterial.landingCost;
      this.addTransactionInternal({
        date: new Date().toISOString().split("T")[0],
        reference: "Opening Stock",
        description: `Opening stock for ${newMaterial.name}`,
        entries: [
          { accountId: "1200", debit: costAmount, credit: 0 },
          { accountId: "3100", debit: 0, credit: costAmount }
        ]
      });
    }

    this.saveState();
    return newMaterial;
  }

  updateMaterial(id, updatedData) {
    const mat = this.materials.find(m => m.id === id);
    if (!mat) return null;

    const codeConflict = this.materials.some(m =>
      m.id !== id &&
      m.name.toLowerCase() === updatedData.name.toLowerCase() &&
      m.code.toLowerCase() === updatedData.code.toLowerCase()
    );
    if (codeConflict) {
      throw new Error(`The product code/model "${updatedData.code}" already exists under "${updatedData.name}".`);
    }

    mat.name = updatedData.name;
    mat.code = updatedData.code || mat.id;
    mat.category = updatedData.category;
    mat.unit = updatedData.unit;
    mat.reorderLevel = parseFloat(updatedData.reorderLevel) || 0;
    mat.barcode = updatedData.barcode || "";
    mat.eanCode = updatedData.eanCode || "";
    mat.productGroup = updatedData.productGroup || "";
    mat.company = updatedData.company || "";
    mat.subCategory = updatedData.subCategory || "";
    mat.hsnCode = updatedData.hsnCode || "";
    mat.description = updatedData.description || "";
    mat.productType = updatedData.productType || "Goods";
    mat.rackNo = updatedData.rackNo || "";
    mat.defaultDiscount = parseFloat(updatedData.defaultDiscount) || 0;
    mat.igst = (updatedData.igst !== undefined && updatedData.igst !== null && updatedData.igst !== "") ? parseFloat(updatedData.igst) : 18;
    mat.cgst = (updatedData.cgst !== undefined && updatedData.cgst !== null && updatedData.cgst !== "") ? parseFloat(updatedData.cgst) : 9;
    mat.sgst = (updatedData.sgst !== undefined && updatedData.sgst !== null && updatedData.sgst !== "") ? parseFloat(updatedData.sgst) : 9;
    mat.cess = parseFloat(updatedData.cess) || 0;
    mat.addlCess = parseFloat(updatedData.addlCess) || 0;
    mat.cessOn = updatedData.cessOn || "NetValue";
    mat.alternateUnits = updatedData.alternateUnits || [];
    mat.loadingChargeEnabled = updatedData.loadingChargeEnabled === true;
    mat.loadingCharge = parseFloat(updatedData.loadingCharge) || 0;
    mat.unloadingChargeEnabled = updatedData.unloadingChargeEnabled === true;
    mat.unloadingCharge = parseFloat(updatedData.unloadingCharge) || 0;

    // Update pricing fields directly (no batch)
    mat.landingCost = parseFloat(updatedData.landingCost) || mat.landingCost || 0;
    mat.marginPercent = parseFloat(updatedData.marginPercent) || 0;
    mat.marginAmount = parseFloat(updatedData.marginAmount) || 0;
    mat.gstExclRate = parseFloat(updatedData.gstExclRate) || 0;
    mat.gstInclRate = parseFloat(updatedData.gstInclRate) || 0;
    mat.mrp = parseFloat(updatedData.mrp) || 0;
    mat.costPrice = mat.landingCost;
    mat.sellingPrice = mat.gstExclRate;

    // Update unit in all transaction items related to this product (matching by ID or name fallback)
    const updatedUnit = updatedData.unit;
    const matNameUpper = mat.name.toUpperCase().trim();

    if (this.invoices && Array.isArray(this.invoices)) {
      this.invoices.forEach(inv => {
        if (inv.items && Array.isArray(inv.items)) {
          inv.items.forEach(item => {
            if (item.materialId === id || (item.name && item.name.toUpperCase().trim() === matNameUpper)) {
              item.unit = updatedUnit;
            }
          });
        }
      });
    }

    if (this.purchases && Array.isArray(this.purchases)) {
      this.purchases.forEach(pur => {
        if (pur.items && Array.isArray(pur.items)) {
          pur.items.forEach(item => {
            if (item.materialId === id || (item.name && item.name.toUpperCase().trim() === matNameUpper)) {
              item.unit = updatedUnit;
            }
          });
        }
      });
    }

    if (this.salesReturns && Array.isArray(this.salesReturns)) {
      this.salesReturns.forEach(ret => {
        if (ret.items && Array.isArray(ret.items)) {
          ret.items.forEach(item => {
            if (item.materialId === id || (item.name && item.name.toUpperCase().trim() === matNameUpper)) {
              item.unit = updatedUnit;
            }
          });
        }
      });
    }

    if (this.purchaseReturns && Array.isArray(this.purchaseReturns)) {
      this.purchaseReturns.forEach(ret => {
        if (ret.items && Array.isArray(ret.items)) {
          ret.items.forEach(item => {
            if (item.materialId === id || (item.name && item.name.toUpperCase().trim() === matNameUpper)) {
              item.unit = updatedUnit;
            }
          });
        }
      });
    }

    this.saveState();
    return mat;
  }

  hasProductTransactions(id) {
    const mat = this.materials.find(m => m.id === id);
    if (!mat) return false;

    if ((parseFloat(mat.openingStock) || 0) > 0) return true;
    if ((mat.batches || []).some(b => (parseFloat(b.openingStock) || 0) > 0)) return true;

    const hasPurchase = (this.purchases || []).some(p => (p.items || []).some(item => item.materialId === id));
    if (hasPurchase) return true;

    const hasSale = (this.invoices || []).some(i => (i.items || []).some(item => item.materialId === id));
    if (hasSale) return true;

    const hasSalesRet = (this.salesReturns || []).some(sr => (sr.items || []).some(item => item.materialId === id));
    if (hasSalesRet) return true;
    const hasPurRet = (this.purchaseReturns || []).some(pr => (pr.items || []).some(item => item.materialId === id));
    if (hasPurRet) return true;

    return false;
  }

  deleteMaterial(id) {
    const idx = this.materials.findIndex(m => m.id === id);
    if (idx === -1) return false;
    
    if (this.hasProductTransactions(id)) {
      throw new Error("This product has existing transactions (Opening Stock, Sales, or Purchases) and cannot be deleted.");
    }

    this.materials.splice(idx, 1);
    this.saveState();
    return true;
  }

  adjustStock(materialId, adjustmentQty, reason, date) {
    const mat = this.materials.find(m => m.id === materialId);
    if (!mat) return false;

    const qty = parseFloat(adjustmentQty);
    if (isNaN(qty) || qty === 0) return false;

    const newStock = mat.stock + qty;
    if (newStock < 0) return false;

    // Adjust opening stock so recompute stays correct
    mat.openingStock = (mat.openingStock || 0) + qty;
    mat.stock = newStock;
    const costValue = Math.abs(qty) * mat.landingCost;

    const txId = this.generateNextTxId();
    const tx = {
      id: txId,
      date: date || new Date().toISOString().split("T")[0],
      reference: "Stock Adj: " + mat.id,
      description: `Stock adjustment (${qty > 0 ? "+" : ""}${qty} ${mat.unit}) - Reason: ${reason || "Audit"}`,
      entries: []
    };
    if (qty > 0) {
      tx.entries.push({ accountId: "1200", debit: costValue, credit: 0 });
      tx.entries.push({ accountId: "4300", debit: 0, credit: costValue });
    } else {
      tx.entries.push({ accountId: "5500", debit: costValue, credit: 0 });
      tx.entries.push({ accountId: "1200", debit: 0, credit: costValue });
    }
    this.transactions.push(tx);
    this.saveState();
    return true;
  }

  // Stock conversion (source product â†’ target product)
  createStockConversion(convData) {
    this.validateTransactionDate(convData.date || new Date().toISOString().split("T")[0]);
    const srcMat = this.materials.find(m => m.id === convData.sourceMaterialId);
    const tgtMat = this.materials.find(m => m.id === convData.targetMaterialId);
    if (!srcMat || !tgtMat) return false;

    const srcQty = parseFloat(convData.sourceQty);
    const tgtQty = parseFloat(convData.targetQty);
    if (srcMat.stock < srcQty) return false;

    const date = convData.date || new Date().toISOString().split("T")[0];
    const costValue = srcQty * srcMat.landingCost;

    // Reduce source stock
    srcMat.openingStock = (srcMat.openingStock || 0) - srcQty;
    srcMat.stock -= srcQty;

    // Increase target stock with weighted average cost
    const oldTgtStock = tgtMat.stock || 0;
    tgtMat.openingStock = (tgtMat.openingStock || 0) + tgtQty;
    tgtMat.stock += tgtQty;
    const newLandingCost = (oldTgtStock * tgtMat.landingCost + costValue) / tgtMat.stock;
    tgtMat.landingCost = newLandingCost;
    tgtMat.costPrice = newLandingCost;

    // Post double entry
    const txId = this.generateNextTxId();
    this.transactions.push({
      id: txId,
      date: date,
      reference: `Conversion ${srcMat.id}âž”${tgtMat.id}`,
      description: `Stock Conversion: ${srcQty} ${srcMat.unit} of ${srcMat.name} â†’ ${tgtQty} ${tgtMat.unit} of ${tgtMat.name}`,
      entries: [
        { accountId: "1200", debit: costValue, credit: 0 },
        { accountId: "1200", debit: 0, credit: costValue }
      ]
    });

    const convId = "CONV-" + String(this.conversions.length + 1).padStart(3, "0");
    this.conversions.push({
      id: convId,
      date: date,
      sourceId: srcMat.id,
      sourceName: srcMat.name,
      sourceQty,
      sourceUnit: srcMat.unit,
      targetId: tgtMat.id,
      targetName: tgtMat.name,
      targetQty,
      targetUnit: tgtMat.unit,
      value: costValue
    });

    this.saveState();
    return true;
  }

  // --- PURCHASES (BATCH-WISE INCOMING) ---
  recordPurchase(purchaseData) {
    this.validateTransactionDate(purchaseData.date || new Date().toISOString().split("T")[0]);
    const supplier = this.contacts.find(c => c.id === purchaseData.supplierId && (c.type === "supplier" || c.listInVendorList === true));
    if (!supplier) return false;

    let series = null;
    if (purchaseData.seriesId) {
      series = this.seriesMaster.find(s => s.id === purchaseData.seriesId);
    } else {
      series = this.seriesMaster.find(s => s.txType === "Purchase" && s.isActive);
    }
    const seriesType = series ? series.seriesType : "LOCAL";

    // Validate that refNo is unique
    const incomingRefNo = String(purchaseData.refNo || "").trim();
    if (incomingRefNo) {
      const isDuplicateRef = this.purchases.some(p => 
        p.id !== purchaseData.id &&
        String(p.refNo || "").trim() === incomingRefNo
      );
      if (isDuplicateRef) {
        throw new Error(`SERIES NUMBER "${incomingRefNo}" IS ALREADY USED IN ANOTHER PURCHASE BILL. SERIES NUMBERS MUST BE UNIQUE.`);
      }
    }

    // Validate that invoiceNo is unique per vendor
    const incomingInvoiceNo = String(purchaseData.invoiceNo || "").trim().toUpperCase();
    if (incomingInvoiceNo) {
      const isDuplicate = this.purchases.some(p => 
        p.supplierId === purchaseData.supplierId && 
        p.id !== purchaseData.id &&
        String(p.invoiceNo || "").trim().toUpperCase() === incomingInvoiceNo
      );
      if (isDuplicate) {
        throw new Error(`INVOICE NUMBER "${incomingInvoiceNo}" ALREADY EXISTS FOR THIS VENDOR.`);
      }
    }

    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let totalCess = 0;
    const purchaseItems = [];

    purchaseData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      if (!mat) return;

      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.price) || 0;
      const mrp = parseFloat(item.mrp) || rate * 1.5;
      const discountPercent = parseFloat(item.discountPercent) || 0;
      
      const amt = qty * rate;
      const disAmt = amt * (discountPercent / 100);
      const netVal = amt - disAmt;

      subtotal += amt;
      totalDiscount += disAmt;

      // GST calculations
      const gstPercent = seriesType === "NONTAXABLE" ? 0 : ((item.gstPercent !== undefined && item.gstPercent !== null && item.gstPercent !== "") ? parseFloat(item.gstPercent) : ((mat.igst !== undefined && mat.igst !== null) ? mat.igst : 18));
      const gstAmt = seriesType === "NONTAXABLE" ? 0 : (netVal * (gstPercent / 100));
      totalGst += gstAmt;

      // Cess calculations
      const cessPercent = parseFloat(item.cessPercent) || mat.cess || 0;
      const cessAmt = netVal * (cessPercent / 100);
      totalCess += cessAmt;

      // Update material landing cost (weighted average) and record line item
      const oldStock = mat.stock || 0;
      const newLandingCost = oldStock > 0
        ? ((oldStock * mat.landingCost) + (qty * (netVal / qty))) / (oldStock + qty)
        : (netVal / qty);
      mat.landingCost = newLandingCost;
      mat.costPrice = newLandingCost;

      purchaseItems.push({
        materialId: item.materialId,
        name: mat.name,
        code: mat.code || item.code || "",
        batchNo: item.batchNo || "",
        quantity: qty,
        unit: item.unit || mat.unit,
        price: rate,
        mrp: mrp,
        discountPercent: discountPercent,
        discountAmount: disAmt,
        netValue: netVal,
        gstPercent: gstPercent,
        gstAmount: gstAmt,
        netAmount: netVal + gstAmt
      });
    });

    const adjustments = parseFloat(purchaseData.adjustments) || 0;
    const additionalCess = parseFloat(purchaseData.additionalCess) || 0;
    const roundOff = parseFloat(purchaseData.roundOff) || 0;
    
    // Net total calculations
    const itemsNetTotal = (subtotal - totalDiscount) + totalGst + totalCess + adjustments + additionalCess + roundOff;

    const txId = this.generateNextTxId();
    
    // Select normal account offset based on Pay Mode
    let creditAccount = purchaseData.siteName ? `${purchaseData.supplierId}::${purchaseData.siteName}` : purchaseData.supplierId;
    if (purchaseData.payMode === "Cash") {
      const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
      creditAccount = cashL ? cashL.code : "1010"; // Cash in Hand
    } else if (purchaseData.payMode === "Bank") {
      const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || String(l.name || "").toUpperCase().includes("BANK"));
      creditAccount = bankL ? bankL.code : "1020"; // Bank Current Account
    }

    // Track whether this is a new voucher number or reuse of an existing one (edit case)
    const isNewVoucherNo = !purchaseData.voucherNo;
    const pVoucherNo = purchaseData.voucherNo || purchaseData.refNo || this.generateNextVoucherNo("purchase");
    const isInterstate = this.isInterstatePurchase(purchaseData, supplier);
    const isKerala = !isInterstate;
    const taxGroups = {};
    purchaseData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      const gstPercent = seriesType === "NONTAXABLE" ? 0 : ((item.gstPercent !== undefined && item.gstPercent !== null && item.gstPercent !== "") ? parseFloat(item.gstPercent) : ((mat && mat.igst !== undefined && mat.igst !== null) ? mat.igst : 18));
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.price) || 0;
      const amt = qty * rate;
      const disAmt = amt * ((parseFloat(item.discountPercent) || 0) / 100);
      const netVal = amt - disAmt;
      const gstAmt = seriesType === "NONTAXABLE" ? 0 : (netVal * (gstPercent / 100));
      if (!taxGroups[gstPercent]) taxGroups[gstPercent] = 0;
      taxGroups[gstPercent] += gstAmt;
    });

    let purchaseDebitLedger = series ? series.ledgerCode : null;
    
    // ALWAYS force correct ledger ID for interstate purchases to avoid ghost ledger issue
    if (seriesType === "INTERSTATE" || seriesType === "IGST" || seriesType === "OUTSTATE" || isInterstate) {
      const l = this.ledgers.find(x => x.name && (x.name.toUpperCase() === "IGST PURCHASE" || x.name.toUpperCase() === "INTERSTATE PURCHASE"));
      if (l) {
        purchaseDebitLedger = l.code || l.id;
      } else {
        purchaseDebitLedger = "L019";
      }
    }

    if (!purchaseDebitLedger || (purchaseDebitLedger === "L018" && isInterstate)) {
      if (seriesType === "NONTAXABLE") {
        const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE PURCHASE");
        purchaseDebitLedger = l ? (l.code || l.id) : "L021";
      } else if (isInterstate) {
        const l = this.ledgers.find(x => x.name && (x.name.toUpperCase() === "IGST PURCHASE" || x.name.toUpperCase() === "INTERSTATE PURCHASE"));
        purchaseDebitLedger = l ? (l.code || l.id) : "L019";
      } else {
        const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "LOCAL PURCHASE");
        purchaseDebitLedger = l ? (l.code || l.id) : "L018";
      }
    }
    const pId = purchaseData.id || purchaseData.refNo || ("PUR-" + String(this.purchases.length + 1).padStart(3, "0"));

    const tx = {
      id: txId,
      voucherId: pId,
      voucherType: "PUR",
      voucherNo: pVoucherNo,
      date: purchaseData.date || new Date().toISOString().split("T")[0],
      reference: pVoucherNo,
      description: purchaseData.narration || "",
      siteName: purchaseData.siteName || "",
      entries: [
        { accountId: purchaseDebitLedger, debit: (subtotal - totalDiscount), credit: 0 },
        { accountId: creditAccount, debit: 0, credit: itemsNetTotal }
      ]
    };

    Object.keys(taxGroups).forEach(rateStr => {
      const rate = parseFloat(rateStr);
      const gstAmt = taxGroups[rateStr];
      if (gstAmt > 0) {
        if (isKerala) {
          const cgstAmt = gstAmt / 2;
          const sgstAmt = gstAmt / 2;
          const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          tx.entries.push({ accountId: cgstLedger, debit: cgstAmt, credit: 0 });
          tx.entries.push({ accountId: sgstLedger, debit: sgstAmt, credit: 0 });
        } else {
          const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
          tx.entries.push({ accountId: igstLedger, debit: gstAmt, credit: 0 });
        }
      }
    });

    if (totalCess + additionalCess > 0) {
      tx.entries.push({ accountId: "2200", debit: (totalCess + additionalCess), credit: 0 });
    }

    if (roundOff !== 0) {
      const roundCode = this.getOrCreateRoundOffLedger();
      if (roundOff > 0) {
        tx.entries.push({ accountId: roundCode, debit: roundOff, credit: 0 }); // roundOff debit for purchase (adds to cost)
      } else {
        tx.entries.push({ accountId: roundCode, debit: 0, credit: Math.abs(roundOff) }); // roundOff credit for purchase (reduces cost)
      }
    }

    if (adjustments !== 0 && (!purchaseData.adjustmentsList || purchaseData.adjustmentsList.length === 0)) {
      const shippingL = this.ledgers.find(l => String(l.name || "").toUpperCase().includes("SHIPPING") || l.code === "5200" || String(l.name || "").toUpperCase().includes("TRANSPORT"));
      const shippingCode = shippingL ? shippingL.code : "5200";
      if (adjustments > 0) {
        tx.entries.push({ accountId: shippingCode, debit: adjustments, credit: 0 });
      } else {
        tx.entries.push({ accountId: shippingCode, debit: 0, credit: Math.abs(adjustments) });
      }
    }

    if (purchaseData.adjustmentsList) {
      purchaseData.adjustmentsList.forEach(a => {
        const amt = parseFloat(a.amount) || 0;
        if (amt > 0) {
          let ledgerCode = a.ledgerCode;
          if (!ledgerCode) {
            const master = this.purchaseAdjustments.find(m => m.name.toUpperCase() === a.name.toUpperCase());
            ledgerCode = master ? master.ledgerCode : "5200";
          }
          if (a.type === "Add") {
            tx.entries.push({ accountId: ledgerCode, debit: amt, credit: 0 });
          } else {
            tx.entries.push({ accountId: ledgerCode, debit: 0, credit: amt });
          }
        }
      });
    }

    // Purge any pre-existing transactions for this purchase bill before pushing new entry
    const cleanPVNoUpper = String(pVoucherNo).trim().toUpperCase();
    const cleanPIdUpper = String(pId).trim().toUpperCase();
    const cleanPRefUpper = String(purchaseData.refNo || "").trim().toUpperCase();
    const cleanPInvUpper = String(purchaseData.invoiceNo || "").trim().toUpperCase();

    this.transactions = this.transactions.filter(t => {
      const tidUpper = String(t.id || "").trim().toUpperCase();
      const tvidUpper = String(t.voucherId || "").trim().toUpperCase();
      if (tidUpper === cleanPIdUpper) return false;
      if (tvidUpper && tvidUpper === cleanPIdUpper) return false;
      const ref = String(t.reference || "").trim().toUpperCase();
      const tvno = String(t.voucherNo || "").trim().toUpperCase();
      if (cleanPVNoUpper && (ref === cleanPVNoUpper || tvno === cleanPVNoUpper || ref === `PURCHASE ${cleanPVNoUpper}` || ref.startsWith(cleanPVNoUpper + " ") || ref.startsWith("PURCHASE " + cleanPVNoUpper))) return false;
      if (cleanPIdUpper && (ref === cleanPIdUpper || tvno === cleanPIdUpper || ref === `PURCHASE ${cleanPIdUpper}` || ref.startsWith(cleanPIdUpper + " ") || ref.startsWith("PURCHASE " + cleanPIdUpper))) return false;
      if (cleanPRefUpper && (ref === cleanPRefUpper || tvno === cleanPRefUpper)) return false;
      if (cleanPInvUpper && (ref === cleanPInvUpper || tvno === cleanPInvUpper)) return false;
      return true;
    });

    console.log(`[RECORD PURCHASE DEBUG] seriesId=${purchaseData.seriesId} seriesType=${seriesType} seriesLedgerCode=${series ? series.ledgerCode : 'NO_SERIES'} isKerala=${isKerala} purchaseState=${purchaseData.state} supplierState=${supplier.state} companyState=${this.getCompanyState()} purchaseDebitLedger=${purchaseDebitLedger}`, JSON.stringify(tx.entries));
    this.transactions.push(tx);

    // If it's a Credit purchase, increase vendor balance payable
    if (purchaseData.payMode === "Credit") {
      supplier.balance = (supplier.balance || 0) - itemsNetTotal;
    }

    this.purchases.push({
      id: pId,
      seriesId: purchaseData.seriesId || "",
      voucherNo: pVoucherNo,
      refNo: purchaseData.refNo || "",
      invoiceNo: purchaseData.invoiceNo || "",
      date: purchaseData.date || new Date().toISOString().split("T")[0],
      contactId: purchaseData.supplierId,
      contactName: supplier.name,
      siteName: purchaseData.siteName || "",
      state: purchaseData.state || (supplier ? supplier.state : null) || this.getCompanyState(),
      payMode: purchaseData.payMode || "Credit",
      creditPeriod: purchaseData.creditPeriod || "",
      narration: purchaseData.narration || "",
      headloaderType: purchaseData.headloaderType || "std",
      items: purchaseItems,
      subtotal: subtotal,
      totalDiscount: totalDiscount,
      totalGst: totalGst,
      totalCess: totalCess,
      adjustments: adjustments,
      adjustmentsList: purchaseData.adjustmentsList || [],
      additionalCess: additionalCess,
      roundOff: roundOff,
      total: itemsNetTotal
    });

    // Increment series number only for new purchases (not edits which reuse the existing voucherNo)
    if (isNewVoucherNo && purchaseData.seriesId) {
      const s = this.seriesMaster?.find(ser => ser.id === purchaseData.seriesId);
      if (s) s.currentNumber = (s.currentNumber || s.startingNumber || 1) + 1;
    }

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  createPurchaseReturn(returnData) {
    this.validateTransactionDate(returnData.date || new Date().toISOString().split("T")[0]);
    const supplier = this.contacts.find(c => c.id === returnData.contactId && (c.type === "supplier" || c.listInVendorList === true));
    if (!supplier) return false;

    let subtotal = 0;
    let totalGst = 0;
    const returnItems = [];
    let hasInvalidStock = false;

    returnData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      if (!mat) return;
      const qty = parseFloat(item.quantity);
      if (mat.stock < qty) hasInvalidStock = true;
      const rate = parseFloat(item.price);
      const gstPercent = getValidGstRate(item, mat, 18);
      const gstAmt = qty * rate * (gstPercent / 100);
      subtotal += qty * rate;
      totalGst += gstAmt;
      returnItems.push({
        materialId: item.materialId,
        name: mat.name,
        quantity: qty,
        unit: mat.unit,
        price: rate,
        amount: qty * rate,
        gstPercent: gstPercent,
        gstAmount: gstAmt
      });
    });

    if (hasInvalidStock) return false;

    const taxRate = parseFloat(returnData.taxRate) || 0;
    const taxAmount = totalGst;

    let adjTotal = 0;
    if (returnData.adjustmentsList) {
      returnData.adjustmentsList.forEach(a => {
        const amt = parseFloat(a.amount) || 0;
        if (a.type === "Add") adjTotal += amt;
        else adjTotal -= amt;
      });
    }
    const roundOff = parseFloat(returnData.roundOff) || 0;
    const total = subtotal + taxAmount + roundOff + adjTotal;

    const dnId = returnData.id || ("PR-" + String(this.purchaseReturns.length + 1).padStart(3, "0"));
    const txId = this.generateNextTxId();

    // Determine if IGST (interstate) by looking at the original purchase bill's series type
    // This is the reliable way — state-string comparison fails when company state = supplier state but series is IGST
    const originalPurchase = returnData.billNo ? this.purchases.find(p => String(p.invoiceNo) === String(returnData.billNo) || String(p.voucherNo) === String(returnData.billNo)) : null;
    const originalSeriesId = originalPurchase ? originalPurchase.seriesId : null;
    const originalSeries = originalSeriesId ? (this.seriesMaster || []).find(s => s.id === originalSeriesId) : null;
    const isInterstate = this.isInterstatePurchase(returnData, supplier);
    const isKerala = !isInterstate;

    const taxGroups = {};
    returnData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      const rate = getValidGstRate(item, mat, 18);
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const amt = qty * price;
      const gstAmt = amt * (rate / 100);
      if (!taxGroups[rate]) taxGroups[rate] = 0;
      taxGroups[rate] += gstAmt;
    });

    // Determine purchase account based on tax and series type
    let hasTax = Object.values(taxGroups).some(gstAmt => gstAmt > 0);
    let purchaseLedgerCode = "L018"; // Default Local Purchase
    if (!hasTax) {
      const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE PURCHASE");
      purchaseLedgerCode = l ? (l.code || l.id) : "L021";
    } else if (isKerala) {
      const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "LOCAL PURCHASE");
      purchaseLedgerCode = l ? (l.code || l.id) : "L018";
    } else {
      const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "IGST PURCHASE") || this.ledgers.find(x => x.name && x.name.toUpperCase() === "INTERSTATE PURCHASE");
      purchaseLedgerCode = l ? (l.code || l.id) : "L020";
    }

    const entries = [
      { accountId: returnData.contactId, debit: total, credit: 0 },
      { accountId: purchaseLedgerCode, debit: 0, credit: subtotal }
    ];

    Object.keys(taxGroups).forEach(rateStr => {
      const rate = parseFloat(rateStr);
      const gstAmt = taxGroups[rateStr];
      if (gstAmt > 0) {
        if (isKerala) {
          const cgstAmt = gstAmt / 2;
          const sgstAmt = gstAmt / 2;
          const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          entries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
          entries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
        } else {
          const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
          entries.push({ accountId: igstLedger, debit: 0, credit: gstAmt });
        }
      }
    });

    if (roundOff !== 0) {
      const roundCode = this.getOrCreateRoundOffLedger();
      if (roundOff > 0) {
        entries.push({ accountId: roundCode, debit: 0, credit: roundOff });
      } else {
        entries.push({ accountId: roundCode, debit: Math.abs(roundOff), credit: 0 });
      }
    }

    if (returnData.adjustmentsList) {
      returnData.adjustmentsList.forEach(a => {
        const amt = parseFloat(a.amount) || 0;
        if (amt > 0) {
          if (a.type === "Add") {
            entries.push({ accountId: a.ledgerCode, debit: 0, credit: amt });
          } else {
            entries.push({ accountId: a.ledgerCode, debit: amt, credit: 0 });
          }
        }
      });
    }

    console.log(`[CREATE PURCHASE RETURN] Pushing transaction to database: ID: ${txId} | Reference: Purchase Return ${dnId} | Entries:`, JSON.stringify(entries));
    this.transactions.push({
      id: txId,
      date: returnData.date || new Date().toISOString().split("T")[0],
      reference: `Purchase Return ${dnId}`,
      description: returnData.narration || returnData.description || "",
      siteName: returnData.siteName || "",
      entries: entries
    });

    supplier.balance = (supplier.balance || 0) + total;

    this.purchaseReturns.push({
      id: dnId,
      billNo: returnData.billNo || "",
      date: returnData.date || new Date().toISOString().split("T")[0],
      contactId: returnData.contactId,
      contactName: supplier.name,
      state: returnData.state || supplier.state || this.getCompanyState(),
      items: returnItems,
      subtotal,
      taxRate,
      taxAmount,
      adjustmentsList: returnData.adjustmentsList || [],
      roundOff,
      total
    });

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }
  createSalesReturn(returnData) {
    this.validateTransactionDate(returnData.date || new Date().toISOString().split("T")[0]);
    const customer = this.contacts.find(c => c.id === returnData.contactId && (c.type === "customer" || c.listInCustomerList === true));
    if (!customer) return false;

    const taxRate = returnData.taxRate || 18;
    let subtotal = 0;
    let totalGst = 0;
    const returnItems = [];
    let cogsReversal = 0;

    returnData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      if (!mat) return;

      const qty = parseFloat(item.quantity);
      const rate = parseFloat(item.price);
      const gstPercent = getValidGstRate(item, mat, 18);
      const gstAmt = qty * rate * (gstPercent / 100);
      subtotal += qty * rate;
      totalGst += gstAmt;

      cogsReversal += qty * mat.landingCost;

      returnItems.push({
        materialId: item.materialId,
        name: mat.name,
        quantity: qty,
        unit: mat.unit,
        price: rate,
        amount: qty * rate,
        gstPercent: gstPercent,
        gstAmount: gstAmt
      });
    });

    const taxAmount = totalGst;

    let adjTotal = 0;
    if (returnData.adjustmentsList) {
      returnData.adjustmentsList.forEach(a => {
        const amt = parseFloat(a.amount) || 0;
        if (a.type === "Add") adjTotal += amt;
        else adjTotal -= amt;
      });
    }
    const roundOff = parseFloat(returnData.roundOff) || 0;
    const total = parseFloat((subtotal + taxAmount + roundOff + adjTotal).toFixed(2));
    const finalSubtotal = parseFloat(subtotal.toFixed(2));

    const cnId = returnData.id || ("SR-" + String(this.salesReturns.length + 1).padStart(3, "0"));
    const txId = this.generateNextTxId();
    const customerAccount = returnData.siteName ? `${returnData.contactId}::${returnData.siteName}` : returnData.contactId;

    const isKerala = (returnData.state || customer.state || this.getCompanyState()).toUpperCase() === this.getCompanyState();
    const taxGroups = {};
    returnData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      const rate = getValidGstRate(item, mat, 18);
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const amt = qty * price;
      const gstAmt = amt * (rate / 100);
      if (!taxGroups[rate]) taxGroups[rate] = 0;
      taxGroups[rate] += gstAmt;
    });

    let hasTax = Object.values(taxGroups).some(gstAmt => gstAmt > 0);
    let salesLedgerCode = "L022"; 
    if (!hasTax) {
      const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE SALES");
      salesLedgerCode = l ? (l.code || l.id) : "L025";
    } else if (isKerala) {
      const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "LOCAL SALES");
      salesLedgerCode = l ? (l.code || l.id) : "L022";
    } else {
      const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "IGST SALES") || this.ledgers.find(x => x.name && x.name.toUpperCase() === "INTERSTATE SALES");
      salesLedgerCode = l ? (l.code || l.id) : "L024";
    }

    const entries = [
      { accountId: salesLedgerCode, debit: finalSubtotal, credit: 0 },
      { accountId: customerAccount, debit: 0, credit: total }
    ];

    let runningDebit = finalSubtotal;
    let runningCredit = total;

    Object.keys(taxGroups).forEach(rateStr => {
      const rate = parseFloat(rateStr);
      const gstAmt = taxGroups[rateStr];
      if (gstAmt > 0) {
        if (isKerala) {
          const cgstAmt = parseFloat((gstAmt / 2).toFixed(2));
          const sgstAmt = parseFloat((gstAmt / 2).toFixed(2));
          const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          entries.push({ accountId: cgstLedger, debit: cgstAmt, credit: 0 });
          entries.push({ accountId: sgstLedger, debit: sgstAmt, credit: 0 });
          runningDebit += cgstAmt + sgstAmt;
        } else {
          const igstAmt = parseFloat(gstAmt.toFixed(2));
          const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
          entries.push({ accountId: igstLedger, debit: igstAmt, credit: 0 });
          runningDebit += igstAmt;
        }
      }
    });

    const roundCode = this.getOrCreateRoundOffLedger();
    let finalRoundOff = parseFloat(roundOff.toFixed(2));

    if (finalRoundOff > 0) {
      entries.push({ accountId: roundCode, debit: finalRoundOff, credit: 0 });
      runningDebit += finalRoundOff;
    } else if (finalRoundOff < 0) {
      entries.push({ accountId: roundCode, debit: 0, credit: Math.abs(finalRoundOff) });
      runningCredit += Math.abs(finalRoundOff);
    }

    if (returnData.adjustmentsList) {
      returnData.adjustmentsList.forEach(a => {
        const amt = parseFloat(parseFloat(a.amount || 0).toFixed(2));
        if (amt > 0) {
          if (a.type === "Add") {
            entries.push({ accountId: a.ledgerCode, debit: amt, credit: 0 });
            runningDebit += amt;
          } else {
            entries.push({ accountId: a.ledgerCode, debit: 0, credit: amt });
            runningCredit += amt;
          }
        }
      });
    }

    const diff = parseFloat((runningDebit - runningCredit).toFixed(2));
    if (diff !== 0) {
        if (diff > 0) {
            entries.push({ accountId: roundCode, debit: 0, credit: diff });
        } else {
            entries.push({ accountId: roundCode, debit: Math.abs(diff), credit: 0 });
        }
    }

    this.transactions.push({
      id: txId,
      date: returnData.date || new Date().toISOString().split("T")[0],
      reference: `Sales Return ${cnId}`,
      description: returnData.narration || returnData.description || "",
      siteName: returnData.siteName || "",
      entries: entries
    });

    if (cogsReversal > 0) {
      const cogsTxId = this.generateNextTxId();
      this.transactions.push({
        id: cogsTxId,
        date: returnData.date || new Date().toISOString().split("T")[0],
        reference: `${cnId} COGS`,
        description: "",
        siteName: returnData.siteName || "",
        entries: [
          { accountId: "1200", debit: cogsReversal, credit: 0 },
          { accountId: "5100", debit: 0, credit: cogsReversal }
        ]
      });
    }

    customer.balance = (customer.balance || 0) - total;

    this.salesReturns.push({
      id: cnId,
      billNo: returnData.billNo || "",
      date: returnData.date || new Date().toISOString().split("T")[0],
      contactId: returnData.contactId,
      contactName: customer.name,
      siteName: returnData.siteName || "",
      state: returnData.state || customer.state || this.getCompanyState(),
      items: returnItems,
      subtotal,
      taxRate,
      taxAmount,
      adjustmentsList: returnData.adjustmentsList || [],
      roundOff,
      total
    });

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  // --- SALES INVOICES (BATCH-WISE OUTGOING - ERP Style) ---
  createInvoice(invoiceData) {
    this.validateTransactionDate(invoiceData.date || new Date().toISOString().split("T")[0]);
    let customer = null;
    if (invoiceData.contactId === "__CASH__") {
      customer = { id: "__CASH__", name: "CASH SALES", balance: 0 };
    } else {
      customer = this.contacts.find(c => c.id === invoiceData.contactId && (c.type === "customer" || c.listInCustomerList === true));
    }
    if (!customer) return null;

    const invoiceId = invoiceData.id || String(this.invoices.length + 1);

    let series = null;
    if (invoiceData.seriesId) {
      series = this.seriesMaster.find(s => s.id === invoiceData.seriesId);
    } else {
      series = this.seriesMaster.find(s => s.txType === "Sales" && s.isActive);
    }
    const seriesType = series ? series.seriesType : "LOCAL";

    let tempSubtotal = 0;
    let tempRowDiscount = 0;
    invoiceData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      if (mat) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const discountPercent = parseFloat(item.discountPercent) || 0;
        const amt = qty * rate;
        tempSubtotal += amt;
        tempRowDiscount += amt * (discountPercent / 100);
      }
    });
    const baseSubtotalNet = tempSubtotal - tempRowDiscount;

    let generalDiscPercent = parseFloat(invoiceData.discountPercent) || 0;
    let generalDiscAmount = parseFloat(invoiceData.discountAmount) || 0;
    if (baseSubtotalNet > 0) {
      if (generalDiscPercent > 0 && generalDiscAmount === 0) {
        generalDiscAmount = baseSubtotalNet * (generalDiscPercent / 100);
      } else if (generalDiscAmount > 0 && generalDiscPercent === 0) {
        generalDiscPercent = (generalDiscAmount / baseSubtotalNet) * 100;
      }
    }

    const invoiceDiscount = 0;

    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let totalCess = 0;
    let totalCogs = 0;

    const items = invoiceData.items.map(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      if (!mat) return null;

      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.price) || 0;
      const mrp = parseFloat(item.mrp) || rate * 1.25;
      const discountPercent = parseFloat(item.discountPercent) || 0;
      
      const amt = qty * rate;
      const rowDisAmt = amt * (discountPercent / 100);
      const taxableBeforeGeneral = amt - rowDisAmt;
      
      const gstPercent = seriesType === "NONTAXABLE" ? 0 : ((item.gstPercent !== undefined && item.gstPercent !== null && item.gstPercent !== "") ? parseFloat(item.gstPercent) : ((mat.igst !== undefined && mat.igst !== null) ? mat.igst : 18));
      const genDisAmt = (taxableBeforeGeneral * (generalDiscPercent / 100)) / (1 + (gstPercent / 100));
      const netVal = taxableBeforeGeneral - genDisAmt;

      subtotal += amt;
      totalDiscount += (rowDisAmt + genDisAmt);
      const gstAmt = seriesType === "NONTAXABLE" ? 0 : (netVal * (gstPercent / 100));
      totalGst += gstAmt;

      const cessPercent = parseFloat(item.cessPercent) || mat.cess || 0;
      const cessAmt = netVal * (cessPercent / 100);
      totalCess += cessAmt;

      const batchNo = item.batchNo || "";

      // Flat stock deduction
      mat.stock = (mat.stock || 0) - qty;
      if (mat.stock < 0) mat.stock = 0;
      totalCogs += qty * (mat.landingCost || 0);

      return {
        materialId: item.materialId,
        name: mat.name,
        code: mat.code,
        batchNo: batchNo,
        quantity: qty,
        unit: item.unit || mat.unit,
        price: rate,
        mrp: mrp,
        discountPercent: discountPercent,
        discountAmount: rowDisAmt + genDisAmt,
        netValue: netVal,
        gstPercent: gstPercent,
        gstAmount: gstAmt,
        netAmount: netVal + gstAmt
      };
    }).filter(Boolean);

    const adjustments = parseFloat(invoiceData.adjustments) || 0;
    const additionalCess = parseFloat(invoiceData.additionalCess) || 0;
    const roundOff = parseFloat(invoiceData.roundOff) || 0;

    const itemsNetTotal = (subtotal - totalDiscount) + totalGst + totalCess + adjustments + additionalCess + roundOff;

    const invoiceTxId = this.generateNextTxId();
    
    // Choose debit account offset based on Pay Mode
    let payMode = invoiceData.payMode || "Cash";
    if (invoiceData.contactId === "__CASH__" && payMode === "Credit") {
      payMode = "Cash";
    }
    let debitAccount = "1010";
    if (payMode === "Credit" && invoiceData.contactId && invoiceData.contactId !== "__CASH__") {
      debitAccount = invoiceData.siteName ? `${invoiceData.contactId}::${invoiceData.siteName}` : invoiceData.contactId;
    } else {
      const payL = this.ledgers.find(l => l.code === payMode || (l.name && l.name.toUpperCase() === payMode.toUpperCase()));
      if (payL) {
        debitAccount = payL.code;
      } else {
        const modeUpper = String(payMode).toUpperCase();
        if (modeUpper.includes("CASH")) {
          const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
          debitAccount = cashL ? cashL.code : "1010";
        } else {
          const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || String(l.name || "").toUpperCase().includes("BANK"));
          debitAccount = bankL ? bankL.code : "1020";
        }
      }
    }

    const isKerala = !this.isInterstateSale(invoiceData, customer);
    const taxGroups = {};
    items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      const rate = seriesType === "NONTAXABLE" ? 0 : getValidGstRate(item, mat, 18);
      if (rate <= 0) return;
      if (!taxGroups[rate]) taxGroups[rate] = 0;
      
      let gstAmt = parseFloat(item.gstAmount);
      if (isNaN(gstAmt) || gstAmt === undefined || gstAmt === null || (gstAmt === 0 && rate > 0)) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const amt = qty * price;
        const disAmt = amt * ((parseFloat(item.discountPercent) || 0) / 100);
        const netVal = amt - disAmt;
        gstAmt = seriesType === "NONTAXABLE" ? 0 : (netVal * (rate / 100));
      }
      taxGroups[rate] += (parseFloat(gstAmt) || 0);
    });

    let salesCreditLedger = (series ? series.ledgerCode : null);
    if (!salesCreditLedger) {
      if (seriesType === "INTERSTATE") salesCreditLedger = "L023";
      else if (seriesType === "NONTAXABLE") salesCreditLedger = "L025";
      else salesCreditLedger = "L022";
    }
    const salesEntries = [
      { accountId: debitAccount, debit: itemsNetTotal, credit: 0 },
      { accountId: salesCreditLedger, debit: 0, credit: (subtotal - totalDiscount) }
    ];

    Object.keys(taxGroups).forEach(rateStr => {
      const rate = parseFloat(rateStr);
      const gstAmt = parseFloat(taxGroups[rateStr].toFixed(2));
      if (gstAmt > 0) {
        if (isKerala) {
          const cgstAmt = parseFloat((gstAmt / 2).toFixed(2));
          const sgstAmt = parseFloat((gstAmt - cgstAmt).toFixed(2));
          const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          salesEntries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
          salesEntries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
        } else {
          const igstAmt = gstAmt;
          const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
          salesEntries.push({ accountId: igstLedger, debit: 0, credit: igstAmt });
        }
      }
    });

    const totalCessVal = parseFloat((totalCess + additionalCess).toFixed(2));
    if (totalCessVal > 0) {
      const cessL = (this.ledgers || []).find(l => l.groupName === "DUTIES & TAXES" && String(l.name || "").toUpperCase().includes("CESS"));
      const cessCode = cessL ? cessL.code : "2200";
      salesEntries.push({ accountId: cessCode, debit: 0, credit: totalCessVal });
    }

    const roundCode = this.getOrCreateRoundOffLedger();

    if (roundOff !== 0) {
      if (roundOff > 0) {
        salesEntries.push({ accountId: roundCode, debit: 0, credit: roundOff });
      } else {
        salesEntries.push({ accountId: roundCode, debit: Math.abs(roundOff), credit: 0 });
      }
    }

    if (adjustments !== 0 && (!invoiceData.adjustmentsList || invoiceData.adjustmentsList.length === 0)) {
      const shippingL = (this.ledgers || []).find(l => String(l.name || "").toUpperCase().includes("SHIPPING") || l.code === "4200");
      const shippingCode = shippingL ? shippingL.code : "4200";
      if (adjustments > 0) {
        salesEntries.push({ accountId: shippingCode, debit: 0, credit: Math.abs(adjustments) });
      } else {
        salesEntries.push({ accountId: shippingCode, debit: Math.abs(adjustments), credit: 0 });
      }
    }

    if (invoiceData.adjustmentsList) {
      invoiceData.adjustmentsList.forEach(a => {
        const amt = parseFloat(parseFloat(a.amount || 0).toFixed(2));
        if (amt > 0) {
          let ledgerCode = a.ledgerCode;
          if (!ledgerCode || ledgerCode === "L002") {
            const nameUpper = String(a.name || "").toUpperCase();
            if (nameUpper.includes("LOADING")) {
              ledgerCode = "L032";
            } else if (nameUpper.includes("UNLOADING")) {
              ledgerCode = "L033";
            } else if (nameUpper.includes("FREIGHT")) {
              ledgerCode = "L030";
            } else {
              const master = (this.salesAdjustments || []).find(m => String(m.name || "").toUpperCase() === nameUpper);
              ledgerCode = master ? master.ledgerCode : "L002";
            }
            a.ledgerCode = ledgerCode;
          }
          if (a.type === "Add") {
            salesEntries.push({ accountId: ledgerCode, debit: 0, credit: amt });
          } else {
            salesEntries.push({ accountId: ledgerCode, debit: amt, credit: 0 });
          }
        }
      });
    }

    let sumDebits = 0;
    let sumCredits = 0;
    salesEntries.forEach(e => {
      sumDebits += parseFloat((e.debit || 0).toFixed(2));
      sumCredits += parseFloat((e.credit || 0).toFixed(2));
    });
    sumDebits = parseFloat(sumDebits.toFixed(2));
    sumCredits = parseFloat(sumCredits.toFixed(2));

    const diff = parseFloat((sumDebits - sumCredits).toFixed(2));
    if (diff !== 0) {
      if (diff > 0) {
        const existingRound = salesEntries.find(e => e.accountId === roundCode);
        if (existingRound) {
          if (existingRound.credit > 0) existingRound.credit = parseFloat((existingRound.credit + diff).toFixed(2));
          else if (existingRound.debit >= diff) existingRound.debit = parseFloat((existingRound.debit - diff).toFixed(2));
          else {
            const rem = diff - existingRound.debit;
            existingRound.debit = 0;
            existingRound.credit = parseFloat(rem.toFixed(2));
          }
        } else {
          salesEntries.push({ accountId: roundCode, debit: 0, credit: diff });
        }
      } else {
        const absDiff = Math.abs(diff);
        const existingRound = salesEntries.find(e => e.accountId === roundCode);
        if (existingRound) {
          if (existingRound.debit > 0) existingRound.debit = parseFloat((existingRound.debit + absDiff).toFixed(2));
          else if (existingRound.credit >= absDiff) existingRound.credit = parseFloat((existingRound.credit - absDiff).toFixed(2));
          else {
            const rem = absDiff - existingRound.credit;
            existingRound.credit = 0;
            existingRound.debit = parseFloat(rem.toFixed(2));
          }
        } else {
          salesEntries.push({ accountId: roundCode, debit: absDiff, credit: 0 });
        }
      }
    }

    // ── Generate / resolve the voucher number ────────────────────────────────
    // For EDITS: use the existing voucherNo (passed explicitly).
    // For NEW invoices with a series: generate from the series counter RIGHT NOW
    //   (not from the UI field / refNo) so duplicates are impossible.
    // For NEW invoices without a series: fall back to generateNextVoucherNo.
    let sVoucherNo;
    if (invoiceData.voucherNo) {
      // Editing an existing invoice – keep the original number.
      sVoucherNo = invoiceData.voucherNo;
    } else if (invoiceData.seriesId) {
      // New invoice with a series – generate fresh from series counter.
      const s = this.seriesMaster?.find(ser => ser.id === invoiceData.seriesId);
      if (s) {
        const prefix  = s.prefix || "";
        const digits  = parseInt(s.digits) || 4;
        let maxUsed = (s.startingNumber || 1) - 1;
        const allSalesSeries = (this.seriesMaster || [])
          .filter(ser => ser.txType === "Sales" && ser.prefix)
          .sort((a, b) => (b.prefix || "").length - (a.prefix || "").length);

        (this.invoices || []).forEach(inv => {
          const vno = String(inv.voucherNo || inv.id || "").trim();
          if (!vno) return;

          let matchesThisSeries = false;
          if (inv.seriesId === s.id) {
            matchesThisSeries = true;
          } else if (!inv.seriesId && prefix) {
            const vnoUpper = vno.toUpperCase();
            const bestMatch = allSalesSeries.find(ser => vnoUpper.startsWith((ser.prefix || "").toUpperCase()));
            if (bestMatch && bestMatch.id === s.id) {
              matchesThisSeries = true;
            }
          }

          if (matchesThisSeries) {
            const numPart = prefix && vno.toUpperCase().startsWith(prefix.toUpperCase()) ? vno.substring(prefix.length) : vno;
            const n = parseInt(numPart, 10);
            if (!isNaN(n) && n > maxUsed) maxUsed = n;
          }
        });

        let nextNum = Math.max(s.currentNumber || 1, maxUsed + 1);
        sVoucherNo = prefix + String(nextNum).padStart(digits, "0");
        while (this.invoices.some(inv => String(inv.voucherNo || inv.id || "").toUpperCase() === sVoucherNo.toUpperCase())) {
          nextNum++;
          sVoucherNo = prefix + String(nextNum).padStart(digits, "0");
        }
        // Immediately increment so the next invoice gets a different number
        s.currentNumber = nextNum + 1;
      } else {
        sVoucherNo = this.generateNextVoucherNo("sales");
        while (this.invoices.some(inv => String(inv.voucherNo || inv.id || "").toUpperCase() === sVoucherNo.toUpperCase())) {
          sVoucherNo = this.generateNextVoucherNo("sales");
        }
      }
    } else {
      sVoucherNo = this.generateNextVoucherNo("sales");
      while (this.invoices.some(inv => String(inv.voucherNo || inv.id || "").toUpperCase() === sVoucherNo.toUpperCase())) {
        sVoucherNo = this.generateNextVoucherNo("sales");
      }
    }

    // Purge any existing transactions for this invoice ID/voucherNo to prevent duplication on edit
    const cleanVNoUpper = String(sVoucherNo).trim().toUpperCase();
    const cleanIdUpper = String(invoiceId).trim().toUpperCase();
    this.transactions = this.transactions.filter(tx => {
      const txIdUpper = String(tx.id || "").trim().toUpperCase();
      const tvidUpper = String(tx.voucherId || "").trim().toUpperCase();
      if (txIdUpper === cleanIdUpper) return false;
      if (tvidUpper && tvidUpper === cleanIdUpper) return false;
      const ref = String(tx.reference || "").trim().toUpperCase();
      const tvno = String(tx.voucherNo || "").trim().toUpperCase();
      if (cleanVNoUpper && (ref === cleanVNoUpper || tvno === cleanVNoUpper || ref === `INVOICE ${cleanVNoUpper}` || ref === `${cleanVNoUpper} COGS` || ref.startsWith(cleanVNoUpper + " ") || ref.startsWith("INVOICE " + cleanVNoUpper))) return false;
      if (cleanIdUpper && (ref === cleanIdUpper || tvno === cleanIdUpper || ref === `INVOICE ${cleanIdUpper}` || ref === `${cleanIdUpper} COGS` || ref.startsWith(cleanIdUpper + " ") || ref.startsWith("INVOICE " + cleanIdUpper))) return false;
      return true;
    });

    this.transactions.push({
      id: invoiceTxId,
      voucherId: invoiceId,
      voucherType: "SALE",
      voucherNo: sVoucherNo,
      date: invoiceData.date || new Date().toISOString().split("T")[0],
      reference: sVoucherNo,
      description: invoiceData.narration || "",
      siteName: invoiceData.siteName || "",
      entries: salesEntries
    });

    if (totalCogs > 0) {
      const cogsTxId = this.generateNextTxId();
      this.transactions.push({
        id: cogsTxId,
        voucherId: invoiceId,
        voucherType: "SALE",
        voucherNo: sVoucherNo,
        date: invoiceData.date || new Date().toISOString().split("T")[0],
        reference: `${sVoucherNo} COGS`,
        description: "",
        entries: [
          { accountId: "5100", debit: totalCogs, credit: 0 },
          { accountId: "1200", debit: 0, credit: totalCogs }
        ]
      });
    }

    // If it's Credit, increase customer's balance due
    if (payMode === "Credit") {
      customer.balance = (customer.balance || 0) + itemsNetTotal;
    }

    const invDateStr = invoiceData.date || new Date().toISOString().split("T")[0];
    let invDueDateStr = invoiceData.dueDate || invDateStr;
    if (invDueDateStr < invDateStr) {
      invDueDateStr = invDateStr;
    }

    const newInvoice = {
      id: invoiceId,
      seriesId: invoiceData.seriesId || (series ? series.id : ""),
      voucherNo: sVoucherNo,
      refNo: invoiceData.refNo || "",
      employee: invoiceData.employee || "",
      influencer: invoiceData.influencer || "",
      date: invDateStr,
      dueDate: invDueDateStr,
      contactId: invoiceData.contactId,
      contactName: customer.name,
      siteName: invoiceData.siteName || "",
      state: invoiceData.state || "KERALA",
      payMode: payMode,
      creditPeriod: invoiceData.creditPeriod || "",
      narration: invoiceData.narration || "",
      headloaderType: invoiceData.headloaderType || "std",
      discountPercent: invoiceData.discountPercent || "0",
      discountAmount: invoiceData.discountAmount || "0.00",
      shippingAddress: invoiceData.shippingAddress || "",
      vehicleNo: invoiceData.vehicleNo || "",
      items: items,
      subtotal: subtotal,
      totalDiscount: totalDiscount + invoiceDiscount,
      totalGst: totalGst,
      totalCess: totalCess,
      adjustments: adjustments,
      adjustmentsList: invoiceData.adjustmentsList || [],
      additionalCess: additionalCess,
      roundOff: roundOff,
      total: itemsNetTotal,
      paidAmount: payMode !== "Credit" ? itemsNetTotal : 0.00,
      status: payMode !== "Credit" ? "paid" : "unpaid"
    };

    // Note: series currentNumber is already incremented above when sVoucherNo was generated.

    this.invoices.push(newInvoice);
    this.recomputeAllStocks();
    this.saveState();
    return newInvoice;
  }

  createContraVoucher(data) {
    this.validateTransactionDate(data.date || new Date().toISOString().split("T")[0]);
    const amount = parseFloat(data.amount) || 0;
    if (amount <= 0) return false;

    const txId = this.generateNextTxId();
    this.transactions.push({
      id: txId,
      date: data.date || new Date().toISOString().split("T")[0],
      reference: data.reference || "Contra",
      description: data.description || "",
      entries: [
        { accountId: data.toAccountId, debit: amount, credit: 0 },
        { accountId: data.fromAccountId, debit: 0, credit: amount }
      ]
    });
    this.saveState();
    return true;
  }

  createReceiptVoucher(data) {
    this.validateTransactionDate(data.date || new Date().toISOString().split("T")[0]);
    const cashAmt = parseFloat(data.cashAmount) || 0;
    const bankAmt = parseFloat(data.bankAmount) || 0;
    const amount = (cashAmt > 0 || bankAmt > 0) ? (cashAmt + bankAmt) : (parseFloat(data.amount) || 0);
    if (amount <= 0) return false;

    const txId = this.generateNextTxId();
    const date = data.date || new Date().toISOString().split("T")[0];
    const ref = data.reference || this.generateNextVoucherNo("receipt");
    
    let creditAcc = data.creditAccountId;
    let desc = data.description || "";

    if (!data.isGeneral) {
      const contact = this.contacts.find(c => c.id === data.contactId);
      if (!contact) return false;
      
      contact.balance = (contact.balance || 0) - amount;
      creditAcc = data.siteName ? `${contact.id}::${data.siteName}` : contact.id;
    }

    const defaultCash = this.ledgers?.find(l => l.groupName === "CASH-IN-HAND" || l.name?.toUpperCase() === "CASH")?.code || "L0001";
    const defaultBank = this.ledgers?.find(l => l.groupName === "BANK ACCOUNTS" || l.name?.toUpperCase().includes("BANK"))?.code || "1020";

    const entries = [];
    if (cashAmt > 0) {
      entries.push({ accountId: data.cashAccountId || defaultCash, debit: cashAmt, credit: 0 });
    }
    if (bankAmt > 0) {
      entries.push({ accountId: data.bankAccountId || defaultBank, debit: bankAmt, credit: 0 });
    }
    if (entries.length === 0) {
      entries.push({ accountId: data.toAccountId || (data.paymentMode === "cash" ? defaultCash : defaultBank), debit: amount, credit: 0 });
    }
    entries.push({ accountId: creditAcc, debit: 0, credit: amount });

    this.transactions.push({
      id: txId,
      date: date,
      reference: ref,
      description: desc,
      siteName: data.siteName || "",
      entries: entries
    });
    this.saveState();
    return true;
  }

  createPaymentVoucher(data) {
    this.validateTransactionDate(data.date || new Date().toISOString().split("T")[0]);
    const cashAmt = parseFloat(data.cashAmount) || 0;
    const bankAmt = parseFloat(data.bankAmount) || 0;
    const amount = (cashAmt > 0 || bankAmt > 0) ? (cashAmt + bankAmt) : (parseFloat(data.amount) || 0);
    if (amount <= 0) return false;

    const txId = this.generateNextTxId();
    const date = data.date || new Date().toISOString().split("T")[0];
    const ref = data.reference || this.generateNextVoucherNo("payment");
    
    let debitAcc = data.debitAccountId;
    let desc = data.description || "";

    if (!data.isGeneral) {
      const contact = this.contacts.find(c => c.id === data.contactId);
      if (!contact) return false;

      debitAcc = data.siteName ? `${contact.id}::${data.siteName}` : contact.id;
      if (contact.type === "supplier" || contact.listInVendorList) {
        contact.balance = (contact.balance || 0) + amount;
      } else {
        contact.balance = (contact.balance || 0) - amount;
      }
    }

    const defaultCash = this.ledgers?.find(l => l.groupName === "CASH-IN-HAND" || l.name?.toUpperCase() === "CASH")?.code || "L0001";
    const defaultBank = this.ledgers?.find(l => l.groupName === "BANK ACCOUNTS" || l.name?.toUpperCase().includes("BANK"))?.code || "1020";

    const entries = [];
    entries.push({ accountId: debitAcc, debit: amount, credit: 0 });
    if (cashAmt > 0) {
      entries.push({ accountId: data.cashAccountId || defaultCash, debit: 0, credit: cashAmt });
    }
    if (bankAmt > 0) {
      entries.push({ accountId: data.bankAccountId || defaultBank, debit: 0, credit: bankAmt });
    }
    if (entries.length === 1) {
      entries.push({ accountId: data.fromAccountId || (data.paymentMode === "cash" ? defaultCash : defaultBank), debit: 0, credit: amount });
    }

    this.transactions.push({
      id: txId,
      date: date,
      reference: ref,
      description: desc,
      siteName: data.siteName || "",
      entries: entries
    });
    this.saveState();
    return true;
  }

  recordPayment(contactId, amount, method, ref, date) {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return false;
    const contact = this.contacts?.find(c => c.id === contactId);
    if (!contact) return false;

    const isCustomer = contact.type === "customer" || contact.listInCustomerList;
    if (isCustomer) {
      return this.createReceiptVoucher({
        date: date || new Date().toISOString().split("T")[0],
        reference: ref || this.generateNextVoucherNo("receipt"),
        isGeneral: false,
        contactId: contact.id,
        amount: numAmount,
        cashAmount: method === "cash" ? numAmount : 0,
        bankAmount: method !== "cash" ? numAmount : 0,
        paymentMode: method,
        description: ""
      });
    } else {
      return this.createPaymentVoucher({
        date: date || new Date().toISOString().split("T")[0],
        reference: ref || this.generateNextVoucherNo("payment"),
        isGeneral: false,
        contactId: contact.id,
        amount: numAmount,
        cashAmount: method === "cash" ? numAmount : 0,
        bankAmount: method !== "cash" ? numAmount : 0,
        paymentMode: method,
        description: ""
      });
    }
  }

  getAdminPassword() {
    return this.adminPassword || "123";
  }

  verifyAdminPassword(password) {
    if (password === null || password === undefined) return false;
    const trimmed = String(password).trim();
    if (!trimmed) return false;

    // 1. Current admin password in state
    if (this.adminPassword && trimmed === String(this.adminPassword).trim()) return true;
    // 2. Default fallback password
    if (trimmed === "123") return true;

    // 3. Active company password and company admin users
    const activeCompanyId = this.getActiveCompanyId();
    if (activeCompanyId) {
      const companies = this.getRegisteredCompanies();
      const comp = companies.find(c => String(c.id) === String(activeCompanyId));
      if (comp) {
        if (comp.password && trimmed === String(comp.password).trim()) return true;
        if (Array.isArray(comp.users)) {
          const matchedUser = comp.users.find(u => 
            (u.role === "Admin" || (u.username && u.username.toLowerCase() === "admin")) &&
            u.password && String(u.password).trim() === trimmed &&
            u.status !== "Inactive"
          );
          if (matchedUser) return true;
        }
      }
    }

    return false;
  }

  setAdminPassword(p) {
    this.adminPassword = p;
    this.saveState();
  }

  generateNextTxId() {
    let max = 1000;
    if (this.transactions) {
      this.transactions.forEach(t => {
        const num = parseInt((t.id || "").replace("TX-", "")) || 0;
        if (num > max) max = num;
      });
    }
    if (this.purchases) {
      this.purchases.forEach(p => {
        const num = parseInt((p.id || "").replace("TX-", "")) || 0;
        if (num > max) max = num;
      });
    }
    if (this.invoices) {
      this.invoices.forEach(i => {
        const num = parseInt((i.id || "").replace("TX-", "")) || 0;
        if (num > max) max = num;
      });
    }
    return "TX-" + (max + 1);
  }

  generateNextLedgerCode() {
    let max = 0;
    const allLedgers = this.getLedgers();
    allLedgers.forEach(l => {
      if (l.code && l.code.toUpperCase().startsWith("L")) {
        const num = parseInt(l.code.substring(1)) || 0;
        if (num > max) max = num;
      }
    });
    return "L" + String(max + 1).padStart(3, '0');
  }

  generateNextVoucherNo(type, seriesId = null) {
    let series = null;
    if (seriesId) {
      series = (this.seriesMaster || []).find(s => s.id === seriesId);
    }
    if (!series && type) {
      const typeUpper = String(type).toUpperCase();
      if (typeUpper === "SALES" || typeUpper === "INVOICE") {
        series = (this.seriesMaster || []).find(s => s.txType === "Sales" && s.isActive) || (this.seriesMaster || []).find(s => s.txType === "Sales");
      } else if (typeUpper === "PURCHASE") {
        series = (this.seriesMaster || []).find(s => s.txType === "Purchase" && s.isActive) || (this.seriesMaster || []).find(s => s.txType === "Purchase");
      }
    }

    let prefix = series ? (series.prefix || "") : "";
    let digits = series ? (parseInt(series.digits) || 4) : 4;
    let startNum = series ? (parseInt(series.startingNumber) || 1) : 1;

    if (!prefix) {
      if (type === "receipt") prefix = "RC-";
      else if (type === "payment") prefix = "PM-";
      else if (type === "journal") prefix = "JV-";
      else if (type === "contra") prefix = "CO-";
      else if (type === "purchase") prefix = "PR-";
      else if (type === "sales" || type === "invoice") prefix = "SA-";
      else if (type === "stock-adjust") {
        let maxNum = 0;
        if (this.stockAdjustments) {
          this.stockAdjustments.forEach(a => {
            const parsed = parseInt(a.refNo);
            if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
          });
        }
        return String(maxNum + 1);
      }
      else return "V-1";
    }

    let maxNum = startNum - 1;
    const prefixUpper = prefix.toUpperCase();

    const allMatchingSeries = (this.seriesMaster || [])
      .filter(s => s.prefix)
      .sort((a, b) => (b.prefix || "").length - (a.prefix || "").length);

    if (series && this.invoices) {
      this.invoices.forEach(inv => {
        const ref = String(inv.voucherNo || inv.refNo || inv.id || "").trim();
        if (!ref) return;

        let matchesThisSeries = false;
        if (inv.seriesId === series.id) {
          matchesThisSeries = true;
        } else if (!inv.seriesId && prefixUpper) {
          const refUpper = ref.toUpperCase();
          const bestMatch = allMatchingSeries.find(s => s.txType === "Sales" && refUpper.startsWith((s.prefix || "").toUpperCase()));
          if (bestMatch && bestMatch.id === series.id) {
            matchesThisSeries = true;
          }
        }

        if (matchesThisSeries) {
          const numPart = prefixUpper && ref.toUpperCase().startsWith(prefixUpper) ? ref.substring(prefix.length) : ref;
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      });
    }

    if (series && this.purchases) {
      this.purchases.forEach(pur => {
        const ref = String(pur.voucherNo || pur.refNo || pur.id || "").trim();
        if (!ref) return;

        let matchesThisSeries = false;
        if (pur.seriesId === series.id) {
          matchesThisSeries = true;
        } else if (!pur.seriesId && prefixUpper) {
          const refUpper = ref.toUpperCase();
          const bestMatch = allMatchingSeries.find(s => s.txType === "Purchase" && refUpper.startsWith((s.prefix || "").toUpperCase()));
          if (bestMatch && bestMatch.id === series.id) {
            matchesThisSeries = true;
          }
        }

        if (matchesThisSeries) {
          const numPart = prefixUpper && ref.toUpperCase().startsWith(prefixUpper) ? ref.substring(prefix.length) : ref;
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      });
    }

    if (!series) {
      if (this.transactions) {
        this.transactions.forEach(t => {
          const ref = (t.reference || "").trim();
          if (prefixUpper && ref.toUpperCase().startsWith(prefixUpper)) {
            const numPart = ref.substring(prefix.length);
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        });
      }
      if (this.invoices) {
        this.invoices.forEach(inv => {
          const ref = (inv.voucherNo || inv.refNo || inv.id || "").trim();
          if (prefixUpper && ref.toUpperCase().startsWith(prefixUpper)) {
            const numPart = ref.substring(prefix.length);
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        });
      }
      if (this.purchases) {
        this.purchases.forEach(pur => {
          const ref = (pur.voucherNo || pur.refNo || pur.id || "").trim();
          if (prefixUpper && ref.toUpperCase().startsWith(prefixUpper)) {
            const numPart = ref.substring(prefix.length);
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        });
      }
    }

    const nextNum = Math.max(series ? (series.currentNumber || 1) : 1, maxNum + 1);
    return prefix + String(nextNum).padStart(digits, "0");
  }

  repairVoucherNumbers() {
    // Non-destructive: Preserve existing voucher references and numbers intact.
    return;
  }

  cleanupDuplicateContactLedgers() {
    if (!this.contacts || !this.ledgers) return;

    const contactMap = new Map();
    this.contacts.forEach(c => {
      if (c && c.name) {
        contactMap.set(c.name.trim().toUpperCase(), c);
      }
    });

    // 1. Link contacts to existing SUNDRY CREDITORS / SUNDRY DEBTORS ledgers if ledgerCode or parentCustomerId is missing
    this.ledgers.forEach(l => {
      if (!l || !l.name) return;
      const cleanName = l.name.trim().toUpperCase();
      const matchingContact = contactMap.get(cleanName);
      if (matchingContact) {
        if (!matchingContact.ledgerCode) {
          matchingContact.ledgerCode = l.code;
        }
        if (!l.parentCustomerId) {
          l.parentCustomerId = matchingContact.id;
        }
      }
    });

    // 2. Remove orphan/duplicate ledgers in this.ledgers under SUNDRY CREDITORS / SUNDRY DEBTORS that duplicate a contact name AND have no transactions
    const usedLedgerCodesInTx = new Set();
    (this.transactions || []).forEach(tx => {
      (tx.entries || []).forEach(e => {
        if (e && e.accountId) usedLedgerCodesInTx.add(String(e.accountId).trim().toUpperCase());
      });
    });

    const initialCount = this.ledgers.length;
    this.ledgers = this.ledgers.filter(l => {
      if (!l || !l.name) return false;
      const gName = String(l.groupName || "").toUpperCase();
      const isContactGroup = gName === "SUNDRY CREDITORS" || gName === "SUNDRY DEBTORS";
      if (!isContactGroup) return true;

      const cleanName = l.name.trim().toUpperCase();
      const matchingContact = contactMap.get(cleanName);
      
      if (matchingContact) {
        if (matchingContact.ledgerCode === l.code || l.parentCustomerId === matchingContact.id) return true;
        if (usedLedgerCodesInTx.has(l.code.toUpperCase())) return true;
        return false;
      }
      return true;
    });

    if (this.ledgers.length !== initialCount) {
      console.log(`[CLEANUP] Removed ${initialCount - this.ledgers.length} duplicate/unused contact ledgers.`);
      this.saveState();
    }
  }

  migrateIgstPurchasesToIgstSeries() {
    if (!this.purchases || this.purchases.length === 0) return 0;

    this.ensureDefaultSeries();

    let igstSeries = (this.seriesMaster || []).find(s => 
      s.txType === "Purchase" && 
      (s.seriesType === "INTERSTATE" || s.seriesType === "IGST" || s.id === "SER-IGST-PURCHASE")
    );

    if (!igstSeries) {
      igstSeries = {
        id: "SER-IGST-PURCHASE",
        txType: "Purchase",
        seriesType: "INTERSTATE",
        name: "IGST Purchase",
        prefix: "IPR-",
        digits: 4,
        startingNumber: 1,
        currentNumber: 1,
        ledgerCode: "L019",
        isActive: true
      };
      if (!this.seriesMaster) this.seriesMaster = [];
      this.seriesMaster.push(igstSeries);
    }

    igstSeries.isActive = true;

    let migratedCount = 0;
    this.purchases.forEach(pur => {
      if (!pur) return;

      const isIgst = this.isInterstatePurchase(pur);
      if (!isIgst) return;

      const currentSeries = pur.seriesId ? (this.seriesMaster || []).find(s => s.id === pur.seriesId) : null;
      const isLocalSeries = !currentSeries || currentSeries.seriesType === "LOCAL" || currentSeries.id === "SER-LOCAL-PURCHASE";

      if (isLocalSeries) {
        console.log(`[MIGRATE IGST PURCHASE] Moving purchase ${pur.id} (${pur.voucherNo || pur.refNo}) from Local series to IGST series (${igstSeries.id}).`);
        pur.seriesId = igstSeries.id;

        const supplier = (this.contacts || []).find(c => c.id === (pur.supplierId || pur.contactId));
        if (!pur.state || pur.state.toUpperCase() === "KERALA") {
          if (supplier && supplier.state && supplier.state.toUpperCase() !== "KERALA") {
            pur.state = supplier.state;
          } else if (supplier && supplier.gstin && /^\d{2}/.test(supplier.gstin)) {
            const code = supplier.gstin.substring(0, 2);
            if (code !== "32") {
              pur.state = "OUTSTATE";
            }
          } else {
            pur.state = "OUTSTATE";
          }
        }

        this.recreatePurchaseTransaction(pur);
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      console.log(`[MIGRATE IGST PURCHASE] Successfully moved ${migratedCount} IGST purchases to IGST Purchase series.`);
      this.recalculate();
      this.saveState();
    }

    return migratedCount;
  }

  repairMissingTransactions() {
    this.cleanDuplicateTransactions();
    this.cleanupDuplicateContactLedgers();
    this.migrateIgstPurchasesToIgstSeries();
    let stateChanged = false;
    // Clean up any leftover or orphaned transactions for cancelled/deleted bills
    if (this.transactions) {
      const cancelledInvoiceIds = new Set((this.invoices || []).filter(i => i.isCancelled).map(i => i.id).filter(Boolean));
      const cancelledPurchaseIds = new Set((this.purchases || []).filter(p => p.isCancelled).map(p => p.id).filter(Boolean));
      const cancelledInvoiceNos = new Set((this.invoices || []).filter(i => i.isCancelled).map(i => String(i.voucherNo).trim()).filter(Boolean));
      const cancelledPurchaseNos = new Set((this.purchases || []).filter(p => p.isCancelled).map(p => String(p.voucherNo || p.refNo || p.invoiceNo).trim()).filter(Boolean));
      
      const validInvoiceNos = new Set((this.invoices || []).filter(i => !i.isCancelled).flatMap(i => [String(i.voucherNo || '').trim(), String(i.id || '').trim(), String(i.billNo || '').trim()]).filter(Boolean));
      const validPurchaseNos = new Set((this.purchases || []).filter(p => !p.isCancelled).flatMap(p => [String(p.voucherNo || '').trim(), String(p.refNo || '').trim(), String(p.invoiceNo || '').trim(), String(p.id || '').trim()]).filter(Boolean));

      const purchasePrefixes = ["LPR-", "IPR-", "NPR-", "PUR-", "PU-", "PI-", "PR-", "LP-", "P-"];
      const salesPrefixes = ["SA-", "SI-", "LI-", "NI-", "LSL-", "INV-", "B2B-"];

      const beforeLen = this.transactions.length;
      this.transactions = this.transactions.filter(tx => {
        if (isManualVoucherOrReturn(tx)) return true;
        if (tx.id && (cancelledInvoiceIds.has(tx.id) || cancelledPurchaseIds.has(tx.id))) {
          return false;
        }
        const refStr = String(tx.reference || "").trim();
        const idStr = String(tx.id || "").trim();
        const descStr = String(tx.description || "").toLowerCase();
        const cleanRef = refStr.split(" ")[0].trim();
        const cleanId = idStr.split(" ")[0].trim();

        if (refStr && (cancelledInvoiceNos.has(cleanRef) || cancelledPurchaseNos.has(cleanRef))) {
          return false;
        }

        // Check if manual voucher (do not drop authentic manual payment/receipt/journal/contra/debit note vouchers)
        const isManualVoucher = tx.voucherType === "RECEIPT" || tx.voucherType === "PAYMENT" || tx.voucherType === "JOURNAL" || tx.voucherType === "CONTRA" ||
                                cleanRef.startsWith("RC-") || cleanRef.startsWith("PY-") || cleanRef.startsWith("JV-") || cleanRef.startsWith("CN-") || cleanRef.startsWith("DN-") ||
                                cleanId.startsWith("RC-") || cleanId.startsWith("PY-") || cleanId.startsWith("JV-") || cleanId.startsWith("CN-") || cleanId.startsWith("DN-");


        return true;
      });
      if (this.transactions.length !== beforeLen) {
        this.saveState(true);
      }
    }

    if (this.purchases) {
      this.purchases.forEach(pur => {
        if (!pur || pur.isCancelled) return;
        let purContactId = pur.supplierId || pur.contactId;
        const purContactName = pur.supplierName || pur.contactName;
        if ((!purContactId || purContactId === "__CASH__") && purContactName) {
          const cNameUpper = purContactName.trim().toUpperCase();
          if (cNameUpper !== "CASH" && cNameUpper !== "CASH SUPPLIER" && cNameUpper !== "WALK-IN SUPPLIER") {
            const matchedC = (this.contacts || []).find(c => c.name && c.name.trim().toUpperCase() === cNameUpper);
            if (matchedC) {
              purContactId = matchedC.id;
              pur.supplierId = matchedC.id;
              pur.contactId = matchedC.id;
              stateChanged = true;
            }
          }
        }

        let creditAccount = "1010";
        if (pur.payMode === "Credit" && purContactId && purContactId !== "__CASH__") {
          creditAccount = pur.siteName ? `${purContactId}::${pur.siteName}` : purContactId;
        } else {
          if (pur.payMode === "Cash") {
            const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
            creditAccount = cashL ? cashL.code : "1010";
          } else if (pur.payMode === "Bank") {
            const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || String(l.name || "").toUpperCase().includes("BANK"));
            creditAccount = bankL ? bankL.code : "1020";
          } else {
            const payL = this.ledgers.find(l => l.code === pur.payMode || (l.name && l.name.toUpperCase() === String(pur.payMode).toUpperCase()));
            if (payL) {
              creditAccount = payL.code;
            } else if (purContactId && purContactId !== "__CASH__") {
              creditAccount = pur.siteName ? `${purContactId}::${pur.siteName}` : purContactId;
            }
          }
        }

        // Look up series ledgerCode from the purchase's stored seriesId
        const repairSeries = pur.seriesId ? this.seriesMaster?.find(s => s.id === pur.seriesId) : null;
        let repairDebitLedger = repairSeries ? repairSeries.ledgerCode : null;
        
        const repairIsInterstate = this.isInterstatePurchase(pur);
        const repairIsKerala = !repairIsInterstate;

        if (!repairDebitLedger || (repairDebitLedger === "L018" && repairIsInterstate)) {
          const repairSeriesType = repairSeries ? repairSeries.seriesType : (repairIsInterstate ? "INTERSTATE" : "LOCAL");
          if (repairSeriesType === "NONTAXABLE") {
            const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE PURCHASE");
            repairDebitLedger = l ? (l.code || l.id) : "L021";
          } else if (repairSeriesType === "INTERSTATE" || repairSeriesType === "IGST" || repairSeriesType === "OUTSTATE" || repairIsInterstate) {
            const l = this.ledgers.find(x => x.name && (x.name.toUpperCase() === "IGST PURCHASE" || x.name.toUpperCase() === "INTERSTATE PURCHASE"));
            repairDebitLedger = l ? (l.code || l.id) : "L019";
          } else {
            const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "LOCAL PURCHASE");
            repairDebitLedger = l ? (l.code || l.id) : "L018";
          }
        }

        const entries = [
          { accountId: repairDebitLedger, debit: (pur.subtotal - (pur.totalDiscount || 0)), credit: 0 },
          { accountId: creditAccount, debit: 0, credit: pur.total }
        ];

        // Add GST entries by rate
        const repairTaxGroups = {};
        (pur.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = getValidGstRate(item, mat, 18);
          if (!repairTaxGroups[rate]) repairTaxGroups[rate] = 0;
          repairTaxGroups[rate] += item.gstAmount || 0;
        });
        Object.keys(repairTaxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = repairTaxGroups[rateStr];
          if (gstAmt > 0) {
            if (repairIsKerala) {
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              entries.push({ accountId: cgstLedger, debit: gstAmt / 2, credit: 0 });
              entries.push({ accountId: sgstLedger, debit: gstAmt / 2, credit: 0 });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
              entries.push({ accountId: igstLedger, debit: gstAmt, credit: 0 });
            }
          }
        });

        const adjustments = parseFloat(pur.adjustments) || 0;
        if (adjustments !== 0 && (!pur.adjustmentsList || pur.adjustmentsList.length === 0)) {
          const shippingL = this.ledgers.find(l => String(l.name || "").toUpperCase().includes("SHIPPING") || l.code === "5200" || String(l.name || "").toUpperCase().includes("TRANSPORT"));
          const shippingCode = shippingL ? shippingL.code : "5200";
          if (adjustments > 0) {
            entries.push({ accountId: shippingCode, debit: adjustments, credit: 0 });
          } else {
            entries.push({ accountId: shippingCode, debit: 0, credit: Math.abs(adjustments) });
          }
        }

        const roundOff = parseFloat(pur.roundOff) || 0;
        if (roundOff !== 0) {
          const roundCode = this.getOrCreateRoundOffLedger();
          if (roundOff > 0) {
            entries.push({ accountId: roundCode, debit: roundOff, credit: 0 });
          } else {
            entries.push({ accountId: roundCode, debit: 0, credit: Math.abs(roundOff) });
          }
        }

        if (pur.adjustmentsList) {
          pur.adjustmentsList.forEach(a => {
            const amt = parseFloat(a.amount) || 0;
            if (amt > 0) {
              let ledgerCode = a.ledgerCode;
              if (!ledgerCode) {
                const master = this.purchaseAdjustments.find(m => m.name.toUpperCase() === a.name.toUpperCase());
                ledgerCode = master ? master.ledgerCode : "5200";
              }
              if (a.type === "Add") {
                entries.push({ accountId: ledgerCode, debit: amt, credit: 0 });
              } else {
                entries.push({ accountId: ledgerCode, debit: 0, credit: amt });
              }
            }
          });
        }

        const matchingTxs = this.transactions.filter(t => {
          const desc = String(t.description || "").toLowerCase();
          const ref = String(t.reference || "").toUpperCase();
          const isSalesTx = desc.includes("sales invoice") || ref.startsWith("LSL-") || ref.startsWith("ISL-") || ref.startsWith("NSL-") || ref.startsWith("INV-") || ref.startsWith("B2B");
          if (isSalesTx) return false;
          return t.id === pur.id || t.reference === pur.voucherNo || (pur.refNo && t.reference === pur.refNo);
        });
        if (matchingTxs.length > 0) {
          const tx = matchingTxs.find(t => String(t.id) === String(pur.id)) || matchingTxs[0];
          const origSig = JSON.stringify(tx.entries);
          const newSig = JSON.stringify(entries);
          if (origSig !== newSig || tx.id !== pur.id || tx.reference !== pur.voucherNo) {
            tx.id = pur.id;
            tx.reference = pur.voucherNo;
            tx.entries = entries;
            stateChanged = true;
          }
          if (matchingTxs.length > 1) {
            const duplicateIds = new Set(matchingTxs.filter(t => t.id !== tx.id).map(t => t.id));
            this.transactions = this.transactions.filter(t => !duplicateIds.has(t.id));
            stateChanged = true;
          }
        } else {
          this.transactions.push({
            id: pur.id,
            date: pur.date,
            reference: pur.voucherNo,
            description: `Purchase of building materials from ${pur.supplierName || pur.contactName} - Invoice: ${pur.invoiceNo || "-"}`,
            siteName: pur.siteName || "",
            entries
          });
          stateChanged = true;
        }
      });
    }

    if (this.invoices) {
      this.invoices.forEach(inv => {
        if (!inv || inv.isCancelled) return;
        if ((!inv.contactId || inv.contactId === "__CASH__") && inv.contactName) {
          const cNameUpper = inv.contactName.trim().toUpperCase();
          if (cNameUpper !== "CASH" && cNameUpper !== "CASH CUSTOMER" && cNameUpper !== "WALK-IN CUSTOMER") {
            const matchedC = (this.contacts || []).find(c => c.name && c.name.trim().toUpperCase() === cNameUpper);
            if (matchedC) {
              inv.contactId = matchedC.id;
              stateChanged = true;
            }
          }
        }

        this.recreateInvoiceTransaction(inv);

        // Ensure COGS transaction is repaired if missing
        const totalCogs = (inv.items || []).reduce((sum, item) => {
          const mat = (this.materials || []).find(m => m.id === item.materialId);
          return sum + ((parseFloat(item.quantity) || 0) * (mat ? (parseFloat(mat.landingCost) || 0) : 0));
        }, 0);
        if (totalCogs > 0) {
          const cogsExists = (this.transactions || []).some(t => t && t.reference === `${inv.voucherNo} COGS`);
          if (!cogsExists) {
            const cogsTxId = this.generateNextTxId();
            this.transactions.push({
              id: cogsTxId,
              date: inv.date,
              reference: `${inv.voucherNo} COGS`,
              description: `Cost of Goods Sold for invoice ${inv.voucherNo}`,
              entries: [
                { accountId: "5100", debit: totalCogs, credit: 0 },
                { accountId: "1200", debit: 0, credit: totalCogs }
              ]
            });
            stateChanged = true;
          }
        }
      });
    }

    if (this.salesReturns) {
      this.salesReturns.forEach(sr => {
        if (!sr || sr.isCancelled) return;
        const customer = this.contacts.find(c => c.id === sr.contactId);
        const isKerala = (sr.state || (customer ? customer.state : this.getCompanyState()) || this.getCompanyState()).toUpperCase() === this.getCompanyState();
        
        const taxGroups = {};
        (sr.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = getValidGstRate(item, mat, 18);
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          const amt = qty * price;
          const gstAmt = amt * (rate / 100);
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          taxGroups[rate] += gstAmt;
        });

        let hasTax = Object.values(taxGroups).some(gstAmt => gstAmt > 0);
        let salesLedgerCode = "L022";
        if (!hasTax) {
          const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE SALES");
          salesLedgerCode = l ? l.code : "L025";
        } else if (isKerala) {
          const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "LOCAL SALES");
          salesLedgerCode = l ? l.code : "L022";
        } else {
          const l = this.ledgers.find(x => x.name && (x.name.toUpperCase() === "IGST SALES" || x.name.toUpperCase() === "INTERSTATE SALES"));
          salesLedgerCode = l ? l.code : "L024";
        }

        let customerAccount = sr.siteName ? `${sr.contactId}::${sr.siteName}` : sr.contactId;
        if (sr.payMode === "Cash") {
          const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
          customerAccount = cashL ? cashL.code : "1010";
        } else if (sr.payMode === "Bank") {
          const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || String(l.name || "").toUpperCase().includes("BANK"));
          customerAccount = bankL ? bankL.code : "1020";
        }

        const entries = [
          { accountId: salesLedgerCode, debit: sr.subtotal, credit: 0 },
          { accountId: customerAccount, debit: 0, credit: sr.total }
        ];

        Object.keys(taxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = taxGroups[rateStr];
          if (gstAmt > 0) {
            if (isKerala) {
              const cgstAmt = gstAmt / 2;
              const sgstAmt = gstAmt / 2;
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              entries.push({ accountId: cgstLedger, debit: cgstAmt, credit: 0 });
              entries.push({ accountId: sgstLedger, debit: sgstAmt, credit: 0 });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
              entries.push({ accountId: igstLedger, debit: gstAmt, credit: 0 });
            }
          }
        });

        const roundOff = parseFloat(sr.roundOff) || 0;
        if (roundOff !== 0) {
          const roundCode = this.getOrCreateRoundOffLedger();
          if (roundOff > 0) {
            entries.push({ accountId: roundCode, debit: roundOff, credit: 0 });
          } else {
            entries.push({ accountId: roundCode, debit: 0, credit: Math.abs(roundOff) });
          }
        }

        if (sr.adjustmentsList) {
          sr.adjustmentsList.forEach(a => {
            const amt = parseFloat(a.amount) || 0;
            if (amt > 0) {
              if (a.type === "Add") {
                entries.push({ accountId: a.ledgerCode, debit: amt, credit: 0 });
              } else {
                entries.push({ accountId: a.ledgerCode, debit: 0, credit: amt });
              }
            }
          });
        }

        const matchingTxs = this.transactions.filter(t => (t.reference === `Credit Note ${sr.id}` || t.reference === `Sales Return ${sr.id}` || t.reference === sr.id || (sr.voucherNo && t.reference === sr.voucherNo)) && !String(t.reference || "").includes("COGS"));
        if (matchingTxs.length > 0) {
          const tx = matchingTxs[0];
          if (tx.reference === `Credit Note ${sr.id}`) {
            tx.reference = `Sales Return ${sr.id}`;
            tx.description = `Sales Return from ${sr.contactName || (customer ? customer.name : 'Customer')}`;
            stateChanged = true;
          }
          const origSig = JSON.stringify(tx.entries);
          const newSig = JSON.stringify(entries);
          if (origSig !== newSig) {
            tx.entries = entries;
            stateChanged = true;
          }
          if (matchingTxs.length > 1) {
            const duplicateIds = new Set(matchingTxs.slice(1).map(t => t.id));
            this.transactions = this.transactions.filter(t => !duplicateIds.has(t.id));
            stateChanged = true;
          }
        } else {
          const txId = this.generateNextTxId();
          this.transactions.push({
            id: txId,
            date: sr.date,
            reference: `Sales Return ${sr.id}`,
            description: `Sales Return from ${sr.contactName || (customer ? customer.name : 'Customer')}`,
            siteName: sr.siteName || "",
            entries: entries
          });
          stateChanged = true;
        }

          // Also ensure COGS reversal is repaired
          let cogsReversal = 0;
          (sr.items || []).forEach(item => {
            const mat = this.materials.find(m => m.id === item.materialId);
            if (mat) {
              cogsReversal += (parseFloat(item.quantity) || 0) * (parseFloat(mat.landingCost) || 0);
            }
          });
          if (cogsReversal > 0) {
            const cogsExists = this.transactions.some(t => t.reference === `${sr.id} COGS`);
            if (!cogsExists) {
              const cogsTxId = this.generateNextTxId();
              this.transactions.push({
                id: cogsTxId,
                date: sr.date,
                reference: `${sr.id} COGS`,
                description: `COGS reversal for Sales Return`,
                siteName: sr.siteName || "",
                entries: [
                  { accountId: "1200", debit: cogsReversal, credit: 0 },
                  { accountId: "5100", debit: 0, credit: cogsReversal }
                ]
              });
            }
          }
      });
    }

    if (this.purchaseReturns) {
      this.purchaseReturns.forEach(pr => {
        if (!pr || pr.isCancelled) return;
        const supplier = this.contacts.find(c => c.id === pr.contactId);

        // Resolve the original purchase's series type to correctly identify IGST vs Local
        const originalPurchase = pr.billNo ? this.purchases.find(p => String(p.invoiceNo) === String(pr.billNo) || String(p.voucherNo) === String(pr.billNo)) : null;
        const originalSeriesId = originalPurchase ? originalPurchase.seriesId : null;
        const originalSeries = originalSeriesId ? (this.seriesMaster || []).find(s => s.id === originalSeriesId) : null;
        const isInterstate = this.isInterstatePurchase(pr, supplier);
        const isKerala = !isInterstate;
        
        const taxGroups = {};
        (pr.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = getValidGstRate(item, mat, 18);
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          const amt = qty * price;
          const gstAmt = amt * (rate / 100);
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          taxGroups[rate] += gstAmt;
        });

        let hasTax = Object.values(taxGroups).some(gstAmt => gstAmt > 0);
        let purchaseLedgerCode = "L018";
        if (!hasTax) {
          const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE PURCHASE");
          purchaseLedgerCode = l ? (l.code || l.id) : "L021";
        } else if (isKerala) {
          const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "LOCAL PURCHASE");
          purchaseLedgerCode = l ? (l.code || l.id) : "L018";
        } else {
          const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "IGST PURCHASE") || this.ledgers.find(x => x.name && x.name.toUpperCase() === "INTERSTATE PURCHASE");
          purchaseLedgerCode = l ? (l.code || l.id) : "L020";
        }

        let supplierAccount = pr.siteName ? `${pr.contactId}::${pr.siteName}` : pr.contactId;
        if (pr.payMode === "Cash") {
          const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || String(l.name || "").toUpperCase() === "CASH");
          supplierAccount = cashL ? cashL.code : "1010";
        } else if (pr.payMode === "Bank") {
          const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || String(l.name || "").toUpperCase().includes("BANK"));
          supplierAccount = bankL ? bankL.code : "1020";
        }

        const entries = [
          { accountId: supplierAccount, debit: pr.total, credit: 0 },
          { accountId: purchaseLedgerCode, debit: 0, credit: pr.subtotal }
        ];

        Object.keys(taxGroups).forEach(rateStr => {
          const rate = parseFloat(rateStr);
          const gstAmt = taxGroups[rateStr];
          if (gstAmt > 0) {
            if (isKerala) {
              const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
              entries.push({ accountId: cgstLedger, debit: 0, credit: gstAmt / 2 });
              entries.push({ accountId: sgstLedger, debit: 0, credit: gstAmt / 2 });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
              entries.push({ accountId: igstLedger, debit: 0, credit: gstAmt });
            }
          }
        });

        const roundOff = parseFloat(pr.roundOff) || 0;
        if (roundOff !== 0) {
          const roundCode = this.getOrCreateRoundOffLedger();
          if (roundOff > 0) {
            entries.push({ accountId: roundCode, debit: 0, credit: roundOff });
          } else {
            entries.push({ accountId: roundCode, debit: Math.abs(roundOff), credit: 0 });
          }
        }

        if (pr.adjustmentsList) {
          pr.adjustmentsList.forEach(a => {
            const amt = parseFloat(a.amount) || 0;
            if (amt > 0) {
              if (a.type === "Add") {
                entries.push({ accountId: a.ledgerCode, debit: 0, credit: amt });
              } else {
                entries.push({ accountId: a.ledgerCode, debit: amt, credit: 0 });
              }
            }
          });
        }

        console.log("REPAIR PURCHASE RETURN:", pr.id, "taxGroups:", taxGroups, "entries:", entries);
        const matchingTxs = this.transactions.filter(t => t.reference === `Debit Note ${pr.id}` || t.reference === `Purchase Return ${pr.id}` || t.reference === pr.id || (pr.voucherNo && t.reference === pr.voucherNo));
        console.log("Found transactions for purchase return:", matchingTxs.length);
        if (matchingTxs.length > 0) {
          const tx = matchingTxs[0];
          if (tx.reference === `Debit Note ${pr.id}`) {
            tx.reference = `Purchase Return ${pr.id}`;
            tx.description = `Purchase Return to ${pr.contactName || (supplier ? supplier.name : 'Supplier')}`;
            stateChanged = true;
          }
          const origSig = JSON.stringify(tx.entries);
          const newSig = JSON.stringify(entries);
          if (origSig !== newSig) {
            tx.entries = entries;
            console.log("ASSIGNED tx.entries FOR:", tx.id, "NEW ENTRIES:", JSON.stringify(tx.entries));
            stateChanged = true;
          }
          if (matchingTxs.length > 1) {
            const duplicateIds = new Set(matchingTxs.slice(1).map(t => t.id));
            this.transactions = this.transactions.filter(t => !duplicateIds.has(t.id));
            stateChanged = true;
          }
        } else {
          const txId = this.generateNextTxId();
          this.transactions.push({
            id: txId,
            date: pr.date,
            reference: `Purchase Return ${pr.id}`,
            description: `Purchase Return to ${pr.contactName || (supplier ? supplier.name : 'Supplier')}`,
            siteName: pr.siteName || "",
            entries: entries
          });
          stateChanged = true;
        }
      });
    }
    if (stateChanged) {
      this.saveState(true);
      console.log("SAVED STATE. CHECK TX-1005 IN MEMORY:", JSON.stringify(this.transactions.find(t => t.id === "TX-1005")));
    }
  }

  addTransaction(data) {
    const txId = data.id || this.generateNextTxId();
    const date = data.date || new Date().toISOString().split("T")[0];
    this.validateTransactionDate(date);
    const newTx = {
      id: txId,
      date: date,
      reference: data.reference || "JV",
      description: data.description || "",
      siteName: data.siteName || "",
      entries: data.entries.map(e => ({
        accountId: e.accountId,
        debit: parseFloat(e.debit) || 0,
        credit: parseFloat(e.credit) || 0
      }))
    };
    this.transactions.push(newTx);
    this.applyTransactionImpact(newTx);
    this.saveState();
    return true;
  }

  deleteTransaction(id) {
    const txIndex = this.transactions.findIndex(t => t.id === id);
    if (txIndex !== -1) {
      const tx = this.transactions[txIndex];
      this.reverseTransactionImpact(tx);
      this.transactions.splice(txIndex, 1);
      this.saveState();
      return true;
    }
    return false;
  }

  applyTransactionImpact(tx) {
    if (!tx) return;
    const ref = String(tx.reference || "").toLowerCase();
    const desc = String(tx.description || "");
    if (ref.includes("receipt")) {
      const match = desc.match(/Receipt from (?:Customer|Supplier): (.*?) \(/i);
      if (match && match[1]) {
        const contact = (this.contacts || []).find(c => c && c.name && c.name.toLowerCase() === match[1].trim().toLowerCase());
        if (contact) {
          const amt = (tx.entries || []).find(e => e && e.debit > 0)?.debit || 0;
          contact.balance = (contact.balance || 0) - amt;
        }
      }
    }
    if (ref.includes("payment")) {
      const match = desc.match(/Payment to (?:Supplier|Customer): (.*?) \(/i);
      if (match && match[1]) {
        const contact = (this.contacts || []).find(c => c && c.name && c.name.toLowerCase() === match[1].trim().toLowerCase());
        if (contact) {
          const amt = (tx.entries || []).find(e => e && e.debit > 0)?.debit || 0;
          contact.balance = (contact.balance || 0) + amt;
        }
      }
    }
  }

  reverseTransactionImpact(tx) {
    if (!tx) return;
    const ref = String(tx.reference || "").toLowerCase();
    const desc = String(tx.description || "");
    if (ref.includes("receipt")) {
      const match = desc.match(/Receipt from (?:Customer|Supplier): (.*?) \(/i);
      if (match && match[1]) {
        const contact = (this.contacts || []).find(c => c && c.name && c.name.toLowerCase() === match[1].trim().toLowerCase());
        if (contact) {
          const amt = (tx.entries || []).find(e => e && e.debit > 0)?.debit || 0;
          contact.balance = (contact.balance || 0) + amt;
        }
      }
    }
    if (ref.includes("payment")) {
      const match = desc.match(/Payment to (?:Supplier|Customer): (.*?) \(/i);
      if (match && match[1]) {
        const contact = (this.contacts || []).find(c => c && c.name && c.name.toLowerCase() === match[1].trim().toLowerCase());
        if (contact) {
          const amt = (tx.entries || []).find(e => e && e.debit > 0)?.debit || 0;
          contact.balance = (contact.balance || 0) - amt;
        }
      }
    }
  }

  // --- FINANCIAL REPORT CALCULATIONS ---
  filterTxsByDate(txs, startDate, endDate) {
    const activeFyStartDate = this.getActiveFinancialYearStartDate();
    if (activeFyStartDate) {
      const activeFyStartD = parseDateSafely(activeFyStartDate);
      const startD = startDate ? parseDateSafely(startDate) : null;
      const endD = endDate ? parseDateSafely(endDate) : null;
      if (!startDate || (startD && startD < activeFyStartD)) {
        startDate = activeFyStartDate;
      }
      if (endDate && endD && endD < activeFyStartD) {
        endDate = activeFyStartDate;
      }
    }
    if (!startDate && !endDate) return txs;
    const start = startDate ? parseDateSafely(startDate) : new Date("2000-01-01");
    const end = endDate ? parseDateSafely(endDate) : new Date("2099-12-31");
    end.setHours(23, 59, 59, 999);

    return txs.filter(tx => {
      const d = parseDateSafely(tx.date);
      return d >= start && d <= end;
    });
  }

  getStockValuationAtDate(targetDateStr = "", materialIdFilter = null) {
    const targetDate = targetDateStr ? new Date(targetDateStr) : null;
    if (targetDate) {
      targetDate.setHours(23, 59, 59, 999);
    }

    const materialById = new Map((this.materials || []).map(m => [m.id, m]));
    const stockMap = {};
    const batchCostMap = {};

    (this.materials || []).forEach(m => {
      if (materialIdFilter && m.id !== materialIdFilter) return;
      const defaultBatches = [...(m.batches || [])];
      const opQty = (m.openingStock !== undefined && m.openingStock !== null && !isNaN(parseFloat(m.openingStock)))
        ? parseFloat(m.openingStock)
        : (parseFloat(m.stock) || 0);
      if (defaultBatches.length === 0 && opQty !== 0) {
        defaultBatches.push({
          batchNo: String(m.landingCost || 350),
          landingCost: m.landingCost || 350,
          openingStock: opQty
        });
      }

      defaultBatches.forEach(b => {
        const key = `${m.id}::${b.batchNo}`;
        stockMap[key] = parseFloat(b.openingStock) || 0;
        batchCostMap[key] = parseFloat(b.landingCost) || 0;
      });
    });

    const updateStock = (matId, bNo, qty, isAdd) => {
      if (materialIdFilter && matId !== materialIdFilter) return;
      const mat = materialById.get(matId);
      if (!mat) return;
      const key = `${matId}::${bNo}`;
      if (stockMap[key] === undefined) {
        stockMap[key] = 0;
        batchCostMap[key] = mat.landingCost || 350;
      }
      if (isAdd) {
        stockMap[key] += qty;
      } else {
        stockMap[key] -= qty;
      }
    };

    (this.purchases || []).forEach(pur => {
      if (pur.isCancelled) return;
      if (targetDate && new Date(pur.date) > targetDate) return;
      (pur.items || []).forEach(item => {
        const mat = materialById.get(item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || item.price || mat.landingCost || 350);
          const key = `${item.materialId}::${bNo}`;
          if (batchCostMap[key] === undefined) {
            batchCostMap[key] = parseFloat(item.price) || mat.landingCost || 350;
          }
          updateStock(item.materialId, bNo, parseFloat(item.quantity) || 0, true);
        }
      });
    });

    (this.invoices || []).forEach(inv => {
      if (inv.isCancelled) return;
      if (targetDate && new Date(inv.date) > targetDate) return;
      (inv.items || []).forEach(item => {
        const mat = materialById.get(item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches?.[0]?.batchNo || mat.landingCost || 350);
          updateStock(item.materialId, bNo, parseFloat(item.quantity) || 0, false);
        }
      });
    });

    (this.salesReturns || []).forEach(ret => {
      if (ret.isCancelled) return;
      if (targetDate && new Date(ret.date) > targetDate) return;
      (ret.items || []).forEach(item => {
        const mat = materialById.get(item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches?.[0]?.batchNo || mat.landingCost || 350);
          updateStock(item.materialId, bNo, parseFloat(item.quantity) || 0, true);
        }
      });
    });

    (this.purchaseReturns || []).forEach(ret => {
      if (ret.isCancelled) return;
      if (targetDate && new Date(ret.date) > targetDate) return;
      (ret.items || []).forEach(item => {
        const mat = materialById.get(item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches?.[0]?.batchNo || mat.landingCost || 350);
          updateStock(item.materialId, bNo, parseFloat(item.quantity) || 0, false);
        }
      });
    });

    (this.stockAdjustments || []).forEach(adj => {
      if (adj.isCancelled) return;
      if (targetDate && new Date(adj.date) > targetDate) return;
      (adj.items || []).forEach(item => {
        const mat = materialById.get(item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches?.[0]?.batchNo || mat.landingCost || 350);
          const isAdd = item.stockAffect === "Add (+)";
          updateStock(item.materialId, bNo, parseFloat(item.qty) || 0, isAdd);
        }
      });
    });

    let totalValuation = 0;
    Object.keys(stockMap).forEach(key => {
      const qty = stockMap[key];
      const cost = batchCostMap[key] || 0;
      if (qty !== 0) {
        totalValuation += qty * cost;
      }
    });

    return totalValuation;
  }

  getOpeningStockValuation() {
    if (!this.materials || !Array.isArray(this.materials)) return 0;
    return this.materials.reduce((sum, m) => {
      if (!m) return sum;
      if (m.batches && m.batches.length > 0) {
        return sum + m.batches.reduce((bSum, b) => bSum + ((parseFloat(b.openingStock) || 0) * (parseFloat(b.landingCost) || 0)), 0);
      }
      const opStock = (m.openingStock !== undefined && m.openingStock !== null && !isNaN(parseFloat(m.openingStock)))
        ? parseFloat(m.openingStock)
        : (parseFloat(m.stock) || 0);
      const cost = parseFloat(m.landingCost) || parseFloat(m.purchasePrice) || 0;
      return sum + (opStock * cost);
    }, 0);
  }

  getProfitLoss(startDate = "", endDate = "") {
    const filteredTxs = this.filterTxsByDate(this.transactions, startDate, endDate);

    const contactById = new Map();
    const contactByNameUpper = new Map();
    (this.contacts || []).forEach(c => {
      if (c && c.id) contactById.set(c.id, c);
      if (c && c.name) contactByNameUpper.set(String(c.name).toUpperCase(), c);
    });

    const groupByNameUpper = new Map();
    (this.accountGroups || []).forEach(g => {
      if (g && g.name) groupByNameUpper.set(String(g.name).toUpperCase(), g);
    });

    const ledgers = this.getLedgers();
    const ledgerByCode = new Map();
    ledgers.forEach(l => {
      if (l && l.code) ledgerByCode.set(String(l.code), l);
    });
    
    const getGroupCategory = (gName) => {
      if (!gName) return "";
      const gnUpper = String(gName).toUpperCase();
      if (contactByNameUpper.has(gnUpper) || contactById.has(gName)) {
        return "BALANCE_SHEET";
      }
      let currentGroup = groupByNameUpper.get(gnUpper);
      if (!currentGroup) {
        if (gnUpper === "ASSETS" || gnUpper.includes("ASSET") || gnUpper.includes("DEBTORS") || gnUpper.includes("CREDITORS")) return "BALANCE_SHEET";
        if (gnUpper === "LIABILITIES" || gnUpper.includes("LIABILITY") || gnUpper === "EQUITY" || gnUpper.includes("CAPITAL")) return "BALANCE_SHEET";
        if (gnUpper.includes("EXPENSE") || gnUpper.includes("COST") || gnUpper.includes("LOSS") || gnUpper === "DEPRECIATION") return "EXPENSE";
        if (gnUpper.includes("INCOME") || gnUpper.includes("REVENUE") || gnUpper.includes("GAIN")) return "INCOME";
        return "";
      }

      let under = currentGroup.under ? currentGroup.under.toUpperCase() : "";
      for (let i = 0; i < 10; i++) {
        if (under === "ASSETS" || under === "LIABILITIES" || under === "EQUITY") {
          return "BALANCE_SHEET";
        }
        if (under === "EXPENSE" || under === "INCOME") {
          return under;
        }
        const parentGroup = groupByNameUpper.get(under);
        if (!parentGroup) break;
        under = parentGroup.under ? parentGroup.under.toUpperCase() : "";
      }

      if (gnUpper === "ASSETS" || gnUpper.includes("ASSET") || gnUpper.includes("DEBTORS") || gnUpper.includes("CASH") || gnUpper.includes("BANK") || gnUpper.includes("INVESTMENT")) return "BALANCE_SHEET";
      if (gnUpper === "LIABILITIES" || gnUpper.includes("LIABILITY") || gnUpper === "EQUITY" || gnUpper.includes("CAPITAL") || gnUpper.includes("CREDITORS") || gnUpper.includes("TAX") || gnUpper.includes("DUTIES") || gnUpper.includes("GST") || gnUpper.includes("CESS")) return "BALANCE_SHEET";
      if (gnUpper.includes("EXPENSE") || gnUpper.includes("COST") || gnUpper.includes("LOSS") || gnUpper === "DEPRECIATION") return "EXPENSE";
      if (gnUpper.includes("INCOME") || gnUpper.includes("REVENUE") || gnUpper.includes("GAIN")) return "INCOME";
      return "";
    };

    const periodChanges = {};

    filteredTxs.forEach(tx => {
      tx.entries.forEach(e => {
        const id = this.getCanonicalAccountId(e.accountId);
        if (periodChanges[id] === undefined) {
          periodChanges[id] = 0;
        }
        periodChanges[id] += (e.debit - e.credit);
      });
    });

    const getAccountDetails = (accId) => {
      const canonicalAcc = this.getCanonicalAccountId(accId);
      const led = ledgerByCode.get(String(canonicalAcc)) || ledgerByCode.get(String(accId));
      if (led) {
        return {
          name: led.name,
          groupName: led.groupName || "",
          balanceType: led.balanceType || "Debit"
        };
      }
      const staticAcc = ACCOUNTS[canonicalAcc] || ACCOUNTS[accId];
      if (staticAcc) {
        return {
          name: staticAcc.name,
          groupName: "",
          balanceType: (staticAcc.type === "asset" || staticAcc.type === "expense") ? "Debit" : "Credit"
        };
      }
      return {
        name: canonicalAcc || accId,
        groupName: "",
        balanceType: "Debit"
      };
    };

    const filteredInvoices = this.invoices.filter(inv => {
      if (inv.isCancelled) return false;
      if (startDate && inv.date < startDate) return false;
      if (endDate && inv.date > endDate) return false;
      return true;
    });
    const salesVal = filteredInvoices.reduce((sum, inv) => sum + ((parseFloat(inv.subtotal) || 0) - (parseFloat(inv.totalDiscount) || 0)), 0);

    const filteredSalesReturns = this.salesReturns.filter(sr => {
      if (sr.isCancelled) return false;
      if (startDate && sr.date < startDate) return false;
      if (endDate && sr.date > endDate) return false;
      return true;
    });
    const salesReturnsVal = filteredSalesReturns.reduce((sum, sr) => sum + (parseFloat(sr.subtotal) || 0), 0);

    const otherIncomes = [];
    const otherExpenses = [];

    Object.keys(periodChanges).forEach(accId => {
      const changeDb = periodChanges[accId];
      if (Math.abs(changeDb) < 0.001) return;

      const strAccId = String(accId);
      const led = ledgerByCode.get(strAccId);
      const isChildLedgerOfCustomer = led && (led.parentCustomerId || contactByNameUpper.has(String(led.groupName || "").toUpperCase()) || contactById.has(led.groupName));
      const isContact = contactById.has(strAccId) || contactById.has(strAccId.split("::")[0]) || strAccId.includes("::") || isChildLedgerOfCustomer;
      if (isContact) {
        return;
      }

      const details = getAccountDetails(accId);
      const nameUpper = String(details.name || "").toUpperCase();
      const groupUpper = String(details.groupName || "").toUpperCase();

      // Exclude core Sales, Purchase, COGS, Stock hand, and Return accounts from other Income/Expenses
      if (accId === "4100" || accId === "4110" || 
          nameUpper.includes("SALES") || groupUpper.includes("SALES") || 
          nameUpper.includes("PURCHASE") || groupUpper.includes("PURCHASE") || 
          accId === "1200" || accId === "5100" || accId === "5110" || 
          accId === "4300" || accId === "5500" ||
          nameUpper.includes("COGS") || nameUpper.includes("COST OF GOODS")) {
        return;
      }

      const isExpense = accId.startsWith("5") || 
                        groupUpper.includes("EXPENSE") || 
                        groupUpper.includes("EXPENSES") || 
                        groupUpper.includes("LOSS") || 
                        groupUpper.includes("SALARIES") ||
                        details.balanceType === "Debit";

      let isBalanceSheetAccount = false;
      if (details.groupName) {
        isBalanceSheetAccount = getGroupCategory(details.groupName) === "BALANCE_SHEET";
      } else {
        const staticAcc = ACCOUNTS[accId];
        if (staticAcc) {
          isBalanceSheetAccount = staticAcc.type === "asset" || staticAcc.type === "liability" || staticAcc.type === "equity";
        }
      }

      if (isBalanceSheetAccount) {
        return;
      }

      if (isExpense) {
        otherExpenses.push({
          code: accId,
          name: details.name,
          amount: changeDb
        });
      } else {
        otherIncomes.push({
          code: accId,
          name: details.name,
          amount: -changeDb
        });
      }
    });

    let openingStock = 0;
    if (startDate) {
      const prevDate = new Date(new Date(startDate) - 86400000).toISOString().split("T")[0];
      openingStock = this.getStockValuationAtDate(prevDate);
    } else {
      openingStock = this.getOpeningStockValuation();
    }

    const closingStock = this.getStockValuationAtDate(endDate);

    const filteredPurchases = this.purchases.filter(p => {
      if (p.isCancelled) return false;
      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;
      return true;
    });
    const purchase = filteredPurchases.reduce((sum, p) => sum + ((parseFloat(p.subtotal) || 0) - (parseFloat(p.totalDiscount) || 0)), 0);

    const filteredPurchaseReturns = this.purchaseReturns.filter(pr => {
      if (pr.isCancelled) return false;
      if (startDate && pr.date < startDate) return false;
      if (endDate && pr.date > endDate) return false;
      return true;
    });
    const purchaseReturn = filteredPurchaseReturns.reduce((sum, pr) => sum + (parseFloat(pr.subtotal) || 0), 0);
    const netPurchase = purchase - purchaseReturn;

    const netSales = salesVal - salesReturnsVal;

    const grossProfit = netSales + closingStock - (openingStock + netPurchase);

    const otherIncomesTotal = otherIncomes.reduce((sum, i) => sum + i.amount, 0);
    const otherExpensesTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

    const totalRevenue = netSales + closingStock + otherIncomesTotal;
    const totalExpenses = openingStock + netPurchase + otherExpensesTotal;

    return {
      openingStock,
      closingStock,
      purchase: netPurchase,
      sales: netSales,
      grossProfit,
      otherIncomes,
      otherExpenses,
      revenueTotal: totalRevenue,
      expensesTotal: totalExpenses,
      netProfit: totalRevenue - totalExpenses
    };
  }

  getBalanceSheet(startDate = "", endDate = "") {
    const balances = this.getAccountBalances(endDate);

    const contactById = new Map();
    const contactByNameUpper = new Map();
    (this.contacts || []).forEach(c => {
      if (c && c.id) contactById.set(c.id, c);
      if (c && c.name) contactByNameUpper.set(String(c.name).toUpperCase(), c);
    });

    const groupByNameUpper = new Map();
    (this.accountGroups || []).forEach(g => {
      if (g && g.name) groupByNameUpper.set(String(g.name).toUpperCase(), g);
    });

    const isLiabilitiesAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const supp = contactByNameUpper.get(current) || contactById.get(current);
      if (supp && (supp.type === "supplier" || supp.listInVendorList === true || supp.groupName === "SUNDRY CREDITORS")) return true;
      const targetGroups = ["CURRENT LIABILITIES", "DUTIES & TAXES", "SUNDRY CREDITORS", "BANK OD A/C", "BRANCH / DIVISIONS", "LIABILITIES", "INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = groupByNameUpper.get(current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isCapitalAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const targetGroups = ["CAPITAL ACCOUNT", "EQUITY"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = groupByNameUpper.get(current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isCurrentAssetsAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const cust = contactByNameUpper.get(current) || contactById.get(current);
      if (cust && (cust.type === "customer" || cust.listInCustomerList === true || cust.groupName === "SUNDRY DEBTORS")) return true;
      const targetGroups = ["CURRENT ASSETS", "BANK ACCOUNTS", "CASH-IN-HAND", "SUNDRY DEBTORS", "LOANS & ADVANCES(ASSET)", "DEPOSITS", "ADAVANCE TO SUPPLIER", "ASSETS"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = groupByNameUpper.get(current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isFixedAssetsAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const targetGroups = ["FIXED ASSETS"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = groupByNameUpper.get(current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const closingStockVal = this.getStockValuationAtDate(endDate);

    let capitalVal = balances["3100"] ? -balances["3100"].balance : 0;
    let currentLiabilitiesVal = (balances["2100"] ? -balances["2100"].balance : 0) + (balances["2200"] ? -balances["2200"].balance : 0);
    let fixedAssetsVal = 0;
    let currentAssetsVal = (balances["1010"] ? balances["1010"].balance : 0) + 
                           (balances["1020"] ? balances["1020"].balance : 0) + 
                           (balances["1100"] ? balances["1100"].balance : 0) + 
                           closingStockVal;
    let otherCurrentAssetsVal = 0;

    const capitalDetails = [];
    const currentLiabilitiesDetails = [];
    const fixedAssetsDetails = [];
    const currentAssetsDetails = [];
    const otherCurrentAssetsDetails = [];

    if (balances["3100"] && balances["3100"].balance !== 0) {
      capitalDetails.push({ name: "Capital / Owner Equity", balance: -balances["3100"].balance });
    }
    if (balances["2100"] && balances["2100"].balance !== 0) {
      currentLiabilitiesDetails.push({ name: "Sundry Creditors (Accounts Payable)", balance: -balances["2100"].balance });
    }
    if (balances["2200"] && balances["2200"].balance !== 0) {
      currentLiabilitiesDetails.push({ name: "GST/VAT Payable", balance: -balances["2200"].balance });
    }
    if (balances["1010"] && balances["1010"].balance !== 0) {
      currentAssetsDetails.push({ name: "Cash in Hand", balance: balances["1010"].balance });
    }
    if (balances["1020"] && balances["1020"].balance !== 0) {
      currentAssetsDetails.push({ name: "Bank Current Account", balance: balances["1020"].balance });
    }
    if (balances["1100"] && balances["1100"].balance !== 0) {
      currentAssetsDetails.push({ name: "Sundry Debtors (Accounts Receivable)", balance: balances["1100"].balance });
    }
    if (closingStockVal !== 0) {
      currentAssetsDetails.push({ name: "Stock on Hand", balance: closingStockVal });
    }

    if (this.ledgers) {
      this.ledgers.forEach(l => {
        const bal = balances[l.code] ? balances[l.code].balance : 0;
        if (bal === 0) return;

        const parentCust = (l.parentCustomerId && contactById.get(l.parentCustomerId)) || contactByNameUpper.get(String(l.groupName || "").toUpperCase());
        const gnUpper = (l.groupName || "").toUpperCase();

        if (parentCust || gnUpper === "SUNDRY DEBTORS" || gnUpper === "SUNDRY CREDITORS") {
          return; // Already represented in 1100 and 2100 control accounts
        } else if (isCapitalAccount(gnUpper)) {
          capitalVal -= bal;
          capitalDetails.push({ name: l.name, balance: -bal, group: l.groupName });
        } else if (isLiabilitiesAccount(gnUpper)) {
          currentLiabilitiesVal -= bal;
          currentLiabilitiesDetails.push({ name: l.name, balance: -bal, group: l.groupName });
        } else if (isFixedAssetsAccount(gnUpper)) {
          fixedAssetsVal += bal;
          fixedAssetsDetails.push({ name: l.name, balance: bal, group: l.groupName });
        } else if (isCurrentAssetsAccount(gnUpper)) {
          currentAssetsVal += bal;
          currentAssetsDetails.push({ name: l.name, balance: bal, group: l.groupName });
        }
      });
    }

    // Difference due to opening balance (including ledgers, contacts, and opening stock)
    const openingStockVal = this.materials.reduce((sum, m) => sum + (m.batches || []).reduce((bSum, b) => bSum + ((parseFloat(b.openingStock) || 0) * (parseFloat(b.landingCost) || 0)), 0), 0);
    let diff = openingStockVal;
    const seenDiffCanonicals = new Set();

    if (this.contacts) {
      this.contacts.forEach(c => {
        const canonical = this.getCanonicalAccountId(c.id);
        seenDiffCanonicals.add(canonical);
        let bType = c.balanceType || ((c.type === "supplier" || c.listInVendorList) ? "Credit" : "Debit");
        if (c.siteType === "multiple" && Array.isArray(c.sites) && c.sites.length > 0) {
          c.sites.forEach(site => {
            const siteOpBal = c.openingBalances && c.openingBalances[site] !== undefined ? parseFloat(c.openingBalances[site]) : 0;
            if (bType === "Credit") {
              diff -= Math.abs(siteOpBal);
            } else {
              diff += Math.abs(siteOpBal);
            }
          });
        } else {
          const opBal = parseFloat(c.openingBalance) || 0;
          if (bType === "Credit") {
            diff -= Math.abs(opBal);
          } else {
            diff += Math.abs(opBal);
          }
        }
      });
    }

    if (this.ledgers) {
      this.ledgers.forEach(l => {
        const canonical = this.getCanonicalAccountId(l.code);
        if (seenDiffCanonicals.has(canonical)) return;
        seenDiffCanonicals.add(canonical);
        const op = parseFloat(l.openingBalance) || 0;
        if (l.balanceType === "Debit") {
          diff += op;
        } else {
          diff -= op;
        }
      });
    }

    let diffLiab = 0;
    let diffAsset = 0;
    if (diff > 0) {
      diffLiab = diff;
    } else if (diff < 0) {
      diffAsset = Math.abs(diff);
    }

    const allTimePl = this.getProfitLoss(startDate, endDate);
    const retainedEarnings = allTimePl.netProfit;

    const totalAssets = fixedAssetsVal + currentAssetsVal + otherCurrentAssetsVal + diffAsset;
    const totalLiabilities = capitalVal + currentLiabilitiesVal + retainedEarnings + diffLiab;

    return {
      assets: {
        fixedAssetsVal,
        currentAssetsVal,
        otherCurrentAssetsVal,
        diffAsset,
        total: totalAssets,
        fixedAssetsDetails,
        currentAssetsDetails,
        otherCurrentAssetsDetails
      },
      liabilities: {
        capitalVal,
        currentLiabilitiesVal,
        diffLiab,
        retainedEarnings,
        total: totalLiabilities,
        capitalDetails,
        currentLiabilitiesDetails
      },
      inBalance: Math.abs(totalAssets - totalLiabilities) < 0.05
    };
  }

  getOpeningBalanceSheet() {
    const contactById = new Map();
    const contactByNameUpper = new Map();
    (this.contacts || []).forEach(c => {
      if (c && c.id) contactById.set(c.id, c);
      if (c && c.name) contactByNameUpper.set(String(c.name).toUpperCase(), c);
    });

    const groupByNameUpper = new Map();
    (this.accountGroups || []).forEach(g => {
      if (g && g.name) groupByNameUpper.set(String(g.name).toUpperCase(), g);
    });

    const isLiabilitiesAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const supp = contactByNameUpper.get(current) || contactById.get(current);
      if (supp && (supp.type === "supplier" || supp.listInVendorList === true || supp.groupName === "SUNDRY CREDITORS")) return true;
      const targetGroups = ["CURRENT LIABILITIES", "DUTIES & TAXES", "SUNDRY CREDITORS", "BANK OD A/C", "BRANCH / DIVISIONS", "LIABILITIES", "INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = groupByNameUpper.get(current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isCapitalAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const targetGroups = ["CAPITAL ACCOUNT", "EQUITY"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = groupByNameUpper.get(current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isCurrentAssetsAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const cust = contactByNameUpper.get(current) || contactById.get(current);
      if (cust && (cust.type === "customer" || cust.listInCustomerList === true || cust.groupName === "SUNDRY DEBTORS")) return true;
      const targetGroups = ["CURRENT ASSETS", "BANK ACCOUNTS", "CASH-IN-HAND", "SUNDRY DEBTORS", "LOANS & ADVANCES(ASSET)", "DEPOSITS", "ADAVANCE TO SUPPLIER", "ASSETS"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = groupByNameUpper.get(current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isFixedAssetsAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const targetGroups = ["FIXED ASSETS"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = groupByNameUpper.get(current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const openingStockVal = (this.materials || []).reduce((sum, m) => sum + (m.batches || []).reduce((bSum, b) => bSum + ((parseFloat(b.openingStock) || 0) * (parseFloat(b.landingCost || b.costPrice || b.purchaseRate) || 0)), 0), 0);

    const cashAcc = ACCOUNTS["1010"];
    const bankAcc = ACCOUNTS["1020"];
    const debtorsAcc = ACCOUNTS["1100"];
    const creditorsAcc = ACCOUNTS["2100"];
    const taxAcc = ACCOUNTS["2200"];
    const capitalAcc = ACCOUNTS["3100"];

    let capitalVal = capitalAcc ? Math.abs(parseFloat(capitalAcc.openingBalance) || 0) : 0;
    let sundryCreditorsOp = creditorsAcc ? Math.abs(parseFloat(creditorsAcc.openingBalance) || 0) : 0;
    let taxOp = taxAcc ? Math.abs(parseFloat(taxAcc.openingBalance) || 0) : 0;

    let contactDebtorsOp = 0;
    let contactCreditorsOp = 0;
    if (this.contacts) {
      this.contacts.forEach(c => {
        let bType = c.balanceType || ((c.type === "supplier" || c.listInVendorList) ? "Credit" : "Debit");
        let cOp = 0;
        if (c.siteType === "multiple" && Array.isArray(c.sites) && c.sites.length > 0) {
          c.sites.forEach(site => {
            const siteOp = c.openingBalances && c.openingBalances[site] !== undefined ? parseFloat(c.openingBalances[site]) || 0 : 0;
            cOp += Math.abs(siteOp);
          });
        } else {
          cOp = Math.abs(parseFloat(c.openingBalance) || 0);
        }

        if (cOp !== 0) {
          if (bType === "Credit" || c.type === "supplier" || c.listInVendorList) {
            contactCreditorsOp += cOp;
          } else {
            contactDebtorsOp += cOp;
          }
        }
      });
    }

    let currentLiabilitiesVal = sundryCreditorsOp + contactCreditorsOp + taxOp;
    let fixedAssetsVal = 0;

    let cashOp = cashAcc ? Math.abs(parseFloat(cashAcc.openingBalance) || 0) : 0;
    let bankOp = bankAcc ? Math.abs(parseFloat(bankAcc.openingBalance) || 0) : 0;
    let debtorsOp = (debtorsAcc ? Math.abs(parseFloat(debtorsAcc.openingBalance) || 0) : 0) + contactDebtorsOp;

    let currentAssetsVal = cashOp + bankOp + debtorsOp + openingStockVal;
    let otherCurrentAssetsVal = 0;

    const capitalDetails = [];
    const currentLiabilitiesDetails = [];
    const fixedAssetsDetails = [];
    const currentAssetsDetails = [];
    const otherCurrentAssetsDetails = [];

    if (capitalVal !== 0) {
      capitalDetails.push({ name: "Capital / Owner Equity (Opening)", balance: capitalVal });
    }
    if (currentLiabilitiesVal !== 0) {
      if (sundryCreditorsOp + contactCreditorsOp !== 0) {
        currentLiabilitiesDetails.push({ name: "Sundry Creditors (Opening)", balance: sundryCreditorsOp + contactCreditorsOp });
      }
      if (taxOp !== 0) {
        currentLiabilitiesDetails.push({ name: "GST/VAT Payable (Opening)", balance: taxOp });
      }
    }

    if (cashOp !== 0) {
      currentAssetsDetails.push({ name: "Cash in Hand (Opening)", balance: cashOp });
    }
    if (bankOp !== 0) {
      currentAssetsDetails.push({ name: "Bank Current Account (Opening)", balance: bankOp });
    }
    if (debtorsOp !== 0) {
      currentAssetsDetails.push({ name: "Sundry Debtors (Opening)", balance: debtorsOp });
    }
    if (openingStockVal !== 0) {
      currentAssetsDetails.push({ name: "Stock on Hand (Opening)", balance: openingStockVal });
    }

    if (this.ledgers) {
      this.ledgers.forEach(l => {
        const op = parseFloat(l.openingBalance) || 0;
        if (op === 0) return;
        const parentCust = (l.parentCustomerId && contactById.get(l.parentCustomerId)) || contactByNameUpper.get(String(l.groupName || "").toUpperCase());
        const gnUpper = (l.groupName || "").toUpperCase();

        if (parentCust || gnUpper === "SUNDRY DEBTORS" || gnUpper === "SUNDRY CREDITORS") {
          return;
        } else if (isCapitalAccount(gnUpper)) {
          const val = l.balanceType === "Debit" ? -op : op;
          capitalVal += val;
          capitalDetails.push({ name: `${l.name} (Opening)`, balance: val, group: l.groupName });
        } else if (isLiabilitiesAccount(gnUpper)) {
          const val = l.balanceType === "Debit" ? -op : op;
          currentLiabilitiesVal += val;
          currentLiabilitiesDetails.push({ name: `${l.name} (Opening)`, balance: val, group: l.groupName });
        } else if (isFixedAssetsAccount(gnUpper)) {
          const val = l.balanceType === "Credit" ? -op : op;
          fixedAssetsVal += val;
          fixedAssetsDetails.push({ name: `${l.name} (Opening)`, balance: val, group: l.groupName });
        } else if (isCurrentAssetsAccount(gnUpper)) {
          const val = l.balanceType === "Credit" ? -op : op;
          currentAssetsVal += val;
          currentAssetsDetails.push({ name: `${l.name} (Opening)`, balance: val, group: l.groupName });
        }
      });
    }

    const totalOpeningAssets = fixedAssetsVal + currentAssetsVal + otherCurrentAssetsVal;
    const totalOpeningLiabilities = capitalVal + currentLiabilitiesVal;

    let diffLiab = 0;
    let diffAsset = 0;

    if (totalOpeningAssets > totalOpeningLiabilities) {
      diffLiab = totalOpeningAssets - totalOpeningLiabilities;
    } else if (totalOpeningLiabilities > totalOpeningAssets) {
      diffAsset = totalOpeningLiabilities - totalOpeningAssets;
    }

    const totalAssets = totalOpeningAssets + diffAsset;
    const totalLiabilities = totalOpeningLiabilities + diffLiab;

    return {
      isOpening: true,
      assets: {
        fixedAssetsVal,
        currentAssetsVal,
        otherCurrentAssetsVal,
        diffAsset,
        total: totalAssets,
        fixedAssetsDetails,
        currentAssetsDetails,
        otherCurrentAssetsDetails
      },
      liabilities: {
        capitalVal,
        currentLiabilitiesVal,
        diffLiab,
        retainedEarnings: 0,
        total: totalLiabilities,
        capitalDetails,
        currentLiabilitiesDetails
      },
      inBalance: Math.abs(totalAssets - totalLiabilities) < 0.05
    };
  }

  getTaxSummary() {
    this.migrateLegacyTaxEntries();
    this.rebuildAllTaxTransactions();

    let taxCollected = 0;
    let taxPaid = 0;

    console.log("[TAX SUMMARY DEBUG] Starting calculation. Ledgers:", this.ledgers);

    this.transactions.forEach(tx => {
      const idUpper = String(tx.id || "").toUpperCase();
      const refUpper = String(tx.reference || "").toUpperCase();
      const descUpper = String(tx.description || "").toUpperCase();
      
      const purchasePrefixes = (this.seriesMaster || []).filter(s => s.txType === "Purchase").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
      purchasePrefixes.push("PR-", "LP-", "L-", "IPR-", "NPR-", "LPR-", "LP");

      const salesPrefixes = (this.seriesMaster || []).filter(s => s.txType === "Sales").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
      salesPrefixes.push("INV-", "IN-", "SA-", "LSL-", "ISL-", "NSL-");

      const isSales = salesPrefixes.some(p => idUpper.startsWith(p) || refUpper.startsWith(p)) || descUpper.includes("SALES") || descUpper.includes("INVOICE");
      const isPurchase = !isSales && (purchasePrefixes.some(p => idUpper.startsWith(p) || refUpper.startsWith(p)) || descUpper.includes("PURCHASE"));

      tx.entries.forEach(entry => {
        if (entry.accountId === "2200") {
          const hasDynamicTax = tx.entries.some(e => {
            if (e.accountId === "2200") return false;
            const led = this.ledgers.find(l => l.code === e.accountId);
            if (led) {
              const n = (led.name || "").toUpperCase();
              const g = (led.groupName || "").toUpperCase();
              const isPurchaseOrSalesAccount = g === "PURCHASE ACCOUNT" || g === "SALES ACCOUNT" || g === "PURCHASE ACCOUNTS" || g === "SALES ACCOUNTS" || n.includes("PURCHASE") || n.includes("SALES");
              if (isPurchaseOrSalesAccount) return false;
              return g === "DUTIES & TAXES" || n.includes("CGST") || n.includes("SGST") || n.includes("IGST") || n.includes("CESS");
            }
            return false;
          });
          if (!hasDynamicTax) {
            taxCollected += entry.credit;
            taxPaid += entry.debit;
          }
          return;
        }

        const ledger = this.ledgers.find(l => l.code === entry.accountId);
        if (ledger) {
          const nameUpper = (ledger.name || "").toUpperCase();
          const groupUpper = (ledger.groupName || "").toUpperCase();
          const isGst = groupUpper === "DUTIES & TAXES" || nameUpper.includes("CGST") || nameUpper.includes("SGST") || nameUpper.includes("IGST") || nameUpper.includes("CESS");
          
          if (isGst) {
            if (nameUpper.includes("OUTPUT")) {
              taxCollected += (entry.credit - entry.debit);
            } else if (nameUpper.includes("INPUT")) {
              taxPaid += (entry.debit - entry.credit);
            } else if (isSales) {
              taxCollected += (entry.credit - entry.debit);
            } else if (isPurchase) {
              taxPaid += (entry.debit - entry.credit);
            } else {
              // General fallback based on debit/credit
              if (entry.credit > 0) {
                taxCollected += entry.credit;
              }
              if (entry.debit > 0) {
                taxPaid += entry.debit;
              }
            }
          }
        }
      });
    });

    console.log(`[TAX SUMMARY DEBUG] Result: taxCollected=${taxCollected}, taxPaid=${taxPaid}`);
    return {
      taxCollected,
      taxPaid,
      netTaxPayable: taxCollected - taxPaid
    };
  }

  cancelInvoice(id) {
    const inv = this.invoices.find(i => i.id === id);
    if (!inv || inv.isCancelled) return false;

    if (inv.payMode === "Credit") {
      const customer = this.contacts.find(c => c.id === inv.contactId);
      if (customer) {
        customer.balance = (customer.balance || 0) - inv.total;
      }
    }

    const invIdUpper = String(inv.id || "").trim().toUpperCase();
    const vNoUpper = String(inv.voucherNo || "").trim().toUpperCase();
    const refNoUpper = String(inv.refNo || "").trim().toUpperCase();

    this.transactions = this.transactions.filter(tx => {
      const txIdUpper = String(tx.id || "").trim().toUpperCase();
      const tvidUpper = String(tx.voucherId || "").trim().toUpperCase();
      if (txIdUpper === invIdUpper) return false;
      if (tvidUpper && tvidUpper === invIdUpper) return false;
      
      const ref = String(tx.reference || "").trim().toUpperCase();
      const tvno = String(tx.voucherNo || "").trim().toUpperCase();

      if (vNoUpper && (ref === vNoUpper || tvno === vNoUpper || ref === `${vNoUpper} COGS` || ref === `INVOICE ${vNoUpper}` || ref.startsWith(vNoUpper + " ") || ref.startsWith("INVOICE " + vNoUpper))) {
        return false;
      }
      if (invIdUpper && (ref === invIdUpper || tvno === invIdUpper || ref === `${invIdUpper} COGS` || ref === `INVOICE ${invIdUpper}` || ref.startsWith(invIdUpper + " ") || ref.startsWith("INVOICE " + invIdUpper))) {
        return false;
      }
      if (refNoUpper && (ref === refNoUpper || tvno === refNoUpper || ref === `INVOICE ${refNoUpper}`)) {
        return false;
      }
      return true;
    });

    inv.isCancelled = true;
    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  restoreInvoice(id) {
    const inv = this.invoices.find(i => i.id === id);
    if (!inv || !inv.isCancelled) return false;

    if (inv.payMode === "Credit") {
      const customer = this.contacts.find(c => c.id === inv.contactId);
      if (customer) {
        customer.balance = (customer.balance || 0) + inv.total;
      }
    }

    inv.isCancelled = false;

    const sVoucherNo = inv.voucherNo || inv.refNo || this.generateNextVoucherNo("sales");
    inv.voucherNo = sVoucherNo;

    this.recreateInvoiceTransaction(inv);

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  cancelPurchase(id) {
    const pur = this.purchases.find(p => p.id === id);
    if (!pur || pur.isCancelled) return false;

    if (pur.payMode === "Credit") {
      const supplier = this.contacts.find(c => c.id === pur.contactId);
      if (supplier) {
        supplier.balance = (supplier.balance || 0) + pur.total;
      }
    }

    const purIdUpper = String(pur.id || "").trim().toUpperCase();
    const vNoUpper = String(pur.voucherNo || "").trim().toUpperCase();
    const refNoUpper = String(pur.refNo || "").trim().toUpperCase();
    const invNoUpper = String(pur.invoiceNo || "").trim().toUpperCase();

    this.transactions = this.transactions.filter(tx => {
      const txIdUpper = String(tx.id || "").trim().toUpperCase();
      const tvidUpper = String(tx.voucherId || "").trim().toUpperCase();
      if (txIdUpper === purIdUpper) return false;
      if (tvidUpper && tvidUpper === purIdUpper) return false;
      
      const ref = String(tx.reference || "").trim().toUpperCase();
      const tvno = String(tx.voucherNo || "").trim().toUpperCase();

      if (vNoUpper && (ref === vNoUpper || tvno === vNoUpper || ref === `PURCHASE ${vNoUpper}` || ref.startsWith(vNoUpper + " ") || ref.startsWith("PURCHASE " + vNoUpper))) {
        return false;
      }
      if (purIdUpper && (ref === purIdUpper || tvno === purIdUpper || ref === `PURCHASE ${purIdUpper}` || ref.startsWith(purIdUpper + " ") || ref.startsWith("PURCHASE " + purIdUpper))) {
        return false;
      }
      if (refNoUpper && (ref === refNoUpper || tvno === refNoUpper || ref === `PURCHASE ${refNoUpper}`)) {
        return false;
      }
      if (invNoUpper && (ref === invNoUpper || tvno === invNoUpper || ref === `PURCHASE ${invNoUpper}`)) {
        return false;
      }
      return true;
    });

    pur.isCancelled = true;
    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  restorePurchase(id) {
    const pur = this.purchases.find(p => p.id === id);
    if (!pur || !pur.isCancelled) return false;

    if (pur.payMode === "Credit") {
      const supplier = this.contacts.find(c => c.id === pur.contactId);
      if (supplier) {
        supplier.balance = (supplier.balance || 0) - pur.total;
      }
    }

    pur.isCancelled = false;

    const pVoucherNo = pur.voucherNo || this.generateNextVoucherNo("purchase");
    pur.voucherNo = pVoucherNo;

    this.recreatePurchaseTransaction(pur);

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  deleteInvoice(id) {
    const idx = this.invoices.findIndex(i => i.id === id);
    if (idx !== -1) {
      const inv = this.invoices[idx];
      if (!inv.isCancelled) {
        this.cancelInvoice(id);
      }
      this.invoices.splice(idx, 1);
      this.saveState();
      return true;
    }
    return false;
  }

  deletePurchase(id) {
    const idx = this.purchases.findIndex(p => p.id === id);
    if (idx !== -1) {
      const pur = this.purchases[idx];
      if (!pur.isCancelled) {
        this.cancelPurchase(id);
      }
      this.purchases.splice(idx, 1);
      this.saveState();
      return true;
    }
    return false;
  }

  deleteSalesReturn(id) {
    const idx = this.salesReturns.findIndex(r => r.id === id);
    if (idx !== -1) {
      const ret = this.salesReturns[idx];
      if (ret.payMode !== "Cash") {
        const customer = this.contacts.find(c => c.id === ret.contactId);
        if (customer) {
          customer.balance = (customer.balance || 0) + ret.total;
        }
      }
      this.transactions = this.transactions.filter(tx => 
        tx.reference !== `Credit Note ${ret.id}` &&
        tx.reference !== `Sales Return ${ret.id}` &&
        !tx.reference.startsWith(ret.id) &&
        !tx.reference.startsWith(`CN-${id}`) &&
        !tx.reference.startsWith(`SR-${id}`)
      );
      this.salesReturns.splice(idx, 1);
      this.recomputeAllStocks();
      this.saveState();
      return true;
    }
    return false;
  }

  deletePurchaseReturn(id) {
    const idx = this.purchaseReturns.findIndex(r => r.id === id);
    if (idx !== -1) {
      const ret = this.purchaseReturns[idx];
      if (ret.payMode !== "Cash") {
        const supplier = this.contacts.find(c => c.id === ret.contactId);
        if (supplier) {
          supplier.balance = (supplier.balance || 0) - ret.total;
        }
      }
      this.transactions = this.transactions.filter(tx => 
        tx.reference !== `Debit Note ${ret.id}` &&
        tx.reference !== `Purchase Return ${ret.id}` &&
        !tx.reference.startsWith(ret.id) &&
        !tx.reference.startsWith(`DN-${id}`) &&
        !tx.reference.startsWith(`PR-${id}`)
      );
      this.purchaseReturns.splice(idx, 1);
      this.recomputeAllStocks();
      this.saveState();
      return true;
    }
    return false;
  }

  getUnits() {
    this.ensureDefaultUnits();
    return this.units || [];
  }

  ensureDefaultUnits() {
    if (!this.units || this.units.length === 0 || !this.units.some(u => u.name && u.name.includes("-"))) {
      this.units = JSON.parse(JSON.stringify(initialUnits));
      this.saveState();
      return;
    }
    if (!initialUnits || initialUnits.length === 0) return;
    const baseUnitsToEnsure = JSON.parse(JSON.stringify(initialUnits));
    let stateChanged = false;
    baseUnitsToEnsure.forEach(bu => {
      if (!this.units.some(u => 
        (u.name && u.name.toUpperCase() === bu.name.toUpperCase()) || 
        (u.symbol && u.symbol.toUpperCase() === bu.symbol.toUpperCase())
      )) {
        this.units.push(bu);
        stateChanged = true;
      }
    });
    if (stateChanged) {
      this.saveState();
    }
  }

  addUnit(unitData) {
    if (!this.units) this.units = [];
    const id = String(this.units.length > 0 ? Math.max(...this.units.map(u => parseInt(u.id) || 0)) + 1 : 1);
    const newUnit = { id, ...unitData };
    this.units.push(newUnit);
    this.saveState();
    return newUnit;
  }

  updateUnit(id, unitData) {
    if (!this.units) this.units = [];
    const idx = this.units.findIndex(u => String(u.id) === String(id));
    if (idx !== -1) {
      this.units[idx] = { ...this.units[idx], ...unitData };
      this.saveState();
      return true;
    }
    return false;
  }

  deleteUnit(id) {
    if (!this.units) this.units = [];
    const idx = this.units.findIndex(u => String(u.id) === String(id));
    if (idx !== -1) {
      this.units.splice(idx, 1);
      this.saveState();
      return true;
    }
    return false;
  }

  getGroupAccounts(groupName) {
    const list = [];
    const getSubGroups = (g) => {
      const children = [];
      const gUpper = String(g || "").toUpperCase();
      if (this.accountGroups) {
        this.accountGroups.forEach(cg => {
          if (String(cg.under || "").toUpperCase() === gUpper) {
            children.push(String(cg.name || "").toUpperCase());
            children.push(...getSubGroups(cg.name));
          }
        });
      }
      return children;
    };

    const targetGroups = [String(groupName || "").toUpperCase(), ...getSubGroups(groupName)];

    if (targetGroups.includes("CURRENT ASSETS") || targetGroups.includes("SUNDRY DEBTORS")) {
      if (this.contacts) {
        this.contacts.forEach(c => {
          if (c.type === "customer" || c.listInCustomerList) {
            list.push(c.id);
            if (c.siteType === "multiple" && c.sites) {
              c.sites.forEach(s => list.push(`${c.id}::${s}`));
            }
          }
        });
      }
    }

    if (targetGroups.includes("CURRENT LIABILITIES") || targetGroups.includes("SUNDRY CREDITORS")) {
      if (this.contacts) {
        this.contacts.forEach(c => {
          if (c.type === "supplier" || c.listInVendorList) {
            list.push(c.id);
            if (c.siteType === "multiple" && c.sites) {
              c.sites.forEach(s => list.push(`${c.id}::${s}`));
            }
          }
        });
      }
    }

    if (targetGroups.includes("CURRENT ASSETS") || targetGroups.includes("STOCK IN HAND")) {
      list.push("1200");
    }

    if (targetGroups.includes("CASH-IN-HAND")) {
      list.push("1010");
    }

    if (targetGroups.includes("BANK ACCOUNTS")) {
      list.push("1020");
    }

    if (targetGroups.includes("DUTIES & TAXES")) {
      list.push("2200");
    }

    if (targetGroups.includes("CAPITAL ACCOUNT")) {
      list.push("3100");
    }

    if (this.ledgers) {
      this.ledgers.forEach(l => {
        if (targetGroups.includes(String(l.groupName || "").toUpperCase())) {
          list.push(l.code);
        }
      });
    }

    const result = [];
    const seenCanonicals = new Set();
    list.forEach(id => {
      const canonical = this.getCanonicalAccountId(id);
      if (!seenCanonicals.has(canonical)) {
        seenCanonicals.add(canonical);
        result.push(id);
      }
    });

    return result;
  }

  getAccountName(accId) {
    const canonicalAcc = this.getCanonicalAccountId(accId);
    const staticAcc = ACCOUNTS[canonicalAcc] || ACCOUNTS[accId];
    if (staticAcc) return staticAcc.name;
    const strAcc = String(canonicalAcc || accId);
    if (strAcc.includes("::")) {
      const [baseId, site] = strAcc.split("::");
      const contact = this.contacts?.find(c => c.id === baseId);
      return contact ? `${contact.name} (${site})` : strAcc;
    }
    const contact = this.contacts?.find(c => c.id === strAcc);
    if (contact) return contact.name;
    const ledger = this.ledgers?.find(l => l.code === strAcc);
    if (ledger) return ledger.name;
    return strAcc;
  }

  getAccountGroupName(accId) {
    const canonicalAcc = this.getCanonicalAccountId(accId);
    const staticAcc = ACCOUNTS[canonicalAcc] || ACCOUNTS[accId];
    if (staticAcc) {
      if (accId === "1010") return "CASH-IN-HAND";
      if (accId === "1020") return "BANK ACCOUNTS";
      if (accId === "1100") return "SUNDRY DEBTORS";
      if (accId === "1200") return "STOCK IN HAND";
      if (accId === "2100") return "SUNDRY CREDITORS";
      if (accId === "2200") return "DUTIES & TAXES";
      if (accId === "3100") return "CAPITAL ACCOUNT";
      return staticAcc.type.toUpperCase();
    }
    const strAcc = String(canonicalAcc || accId);
    const baseId = strAcc.includes("::") ? strAcc.split("::")[0] : strAcc;
    const contact = this.contacts?.find(c => c.id === baseId);
    if (contact) {
      return (contact.type === "supplier" || contact.listInVendorList) ? "SUNDRY CREDITORS" : "SUNDRY DEBTORS";
    }
    const ledger = this.ledgers?.find(l => l.code === strAcc);
    if (ledger) return ledger.groupName;
    return "OTHER";
  }

  getGroupSummary(groupName, startDate = "", endDate = "") {
    const accountIds = this.getGroupAccounts(groupName);
    const start = startDate ? parseDateSafely(startDate) : null;
    const end = endDate ? parseDateSafely(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const canonicalMap = new Map();
    const getCanonical = (code) => {
      if (!code) return "";
      const str = String(code).trim();
      if (canonicalMap.has(str)) return canonicalMap.get(str);
      const res = this.getCanonicalAccountId(str);
      canonicalMap.set(str, res);
      return res;
    };

    const summaryMap = new Map();

    (this.transactions || []).forEach(tx => {
      if (!tx || !tx.id || !tx.entries) return;
      const txDate = tx.date ? parseDateSafely(tx.date) : null;
      const isBeforeStart = start && txDate && txDate < start;
      const isWithinRange = (!start || (txDate && txDate >= start)) && (!end || (txDate && txDate <= end));

      if (!isBeforeStart && !isWithinRange) return;

      tx.entries.forEach(e => {
        if (!e || !e.accountId) return;
        const targetAcc = getCanonical(e.accountId);
        if (!targetAcc) return;

        const dr = parseFloat(e.debit) || 0;
        const cr = parseFloat(e.credit) || 0;

        let accData = summaryMap.get(targetAcc);
        if (!accData) {
          accData = { opening: 0, debit: 0, credit: 0 };
          summaryMap.set(targetAcc, accData);
        }

        if (isBeforeStart) {
          accData.opening += (dr - cr);
        } else if (isWithinRange) {
          accData.debit += dr;
          accData.credit += cr;
        }
      });
    });

    const items = [];

    accountIds.forEach(accId => {
      let initialBal = 0;
      let isDebitType = true;

      const staticAcc = ACCOUNTS[accId];
      if (staticAcc) {
        isDebitType = (staticAcc.type === "asset" || staticAcc.type === "expense");
      } else if (accId.includes("::") || this.contacts?.some(c => c.id === accId)) {
        const baseId = accId.includes("::") ? accId.split("::")[0] : accId;
        const contact = this.contacts.find(c => c.id === baseId);
        if (contact) {
          let bType = contact.balanceType || ((contact.type === "supplier" || contact.listInVendorList) ? "Credit" : "Debit");
          isDebitType = (bType === "Debit");
          if (contact.siteType === "multiple") {
            const site = accId.includes("::") ? accId.split("::")[1] : null;
            initialBal = site && contact.openingBalances && contact.openingBalances[site] !== undefined ? parseFloat(contact.openingBalances[site]) : 0;
          } else {
            initialBal = parseFloat(contact.openingBalance) || 0;
          }
        }
      } else if (this.ledgers) {
        const ledger = this.ledgers.find(l => l.code === accId);
        if (ledger) {
          isDebitType = ledger.balanceType === "Debit";
          initialBal = parseFloat(ledger.openingBalance) || 0;
        }
      }

      let opening = isDebitType ? initialBal : -initialBal;
      let debit = 0;
      let credit = 0;

      if (accId === "1200") {
        const prevDate = start ? new Date(start.getTime() - 86400000).toISOString().split("T")[0] : "";
        const opVal = this.getStockValuationAtDate(prevDate);
        const clVal = this.getStockValuationAtDate(endDate);
        opening = opVal;
        debit = clVal > opVal ? clVal - opVal : 0;
        credit = opVal > clVal ? opVal - clVal : 0;
      } else {
        const canonicalAcc = getCanonical(accId);
        const accData = summaryMap.get(canonicalAcc) || summaryMap.get(accId);
        if (accData) {
          opening += accData.opening;
          debit = accData.debit;
          credit = accData.credit;
        }
      }

      const closing = opening + (debit - credit);

      items.push({
        accountId: accId,
        name: this.getAccountName(accId),
        groupName: this.getAccountGroupName(accId),
        opening,
        debit,
        credit,
        closing,
        isDebitType
      });
    });

    return items;
  }
}

const state = new StateManager();


export { state };
