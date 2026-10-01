import {
  initialMaterials,
  initialContacts,
  initialInvoices,
  initialTransactions,
  initialAccountGroups,
  initialLedgers,
  initialUnits
} from "./sampleData.js";
import {
  appwriteClient,
  appwriteDatabases,
  appwriteStorage,
  APPWRITE_DATABASE_ID,
  APPWRITE_STORAGE_BUCKET,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  Query,
  ID,
  Permission,
  Role,
  sanitizeAppwriteId
} from "./appwrite.js";
import { getValidGstRate } from "./utils/gstValidator.js";

export function formatRateValue(val) {
  if (val === undefined || val === null || val === "" || isNaN(val)) return "";
  const num = parseFloat(val);
  const str = String(val);
  if (str.includes(".")) {
    const decimals = str.split(".")[1];
    if (decimals && decimals.length > 2) {
      return str;
    }
  }
  return num.toFixed(2);
}

export function isManualVoucherOrReturn(t) {
  if (!t) return false;
  const vUpper = String(t.voucherType || "").trim().toUpperCase();
  const idUpper = String(t.id || "").trim().toUpperCase();
  const refUpper = String(t.reference || "").trim().toUpperCase();
  const descUpper = String(t.description || "").trim().toUpperCase();

  if (["RECEIPT", "PAYMENT", "JOURNAL", "CONTRA", "REC", "PAY", "CON", "JV"].includes(vUpper)) return true;
  if (idUpper.startsWith("TX-REC-") || idUpper.startsWith("TX-PAY-") || idUpper.startsWith("TX-CON-") || idUpper.startsWith("TX-JV-") || idUpper.startsWith("TX-VOUCHER-")) return true;
  if (refUpper.startsWith("RC-") || refUpper.startsWith("PAY-") || refUpper.startsWith("PY-") || refUpper.startsWith("PM-") || refUpper.startsWith("CNTR-") || refUpper.startsWith("CO-") || refUpper.startsWith("CON-") || refUpper.startsWith("JV-") || refUpper.startsWith("DN-") || refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("SALES RETURN") || refUpper.startsWith("PURCHASE RETURN")) return true;
  if ((refUpper.startsWith("CN-") && !refUpper.startsWith("CNTR-") && !refUpper.startsWith("CON-") && !refUpper.startsWith("CO-")) || (refUpper.startsWith("SR-") && !refUpper.startsWith("SALES"))) return true;
  if (descUpper.includes("REC VOUCHER") || descUpper.includes("PAY VOUCHER") || descUpper.includes("CONTRA VOUCHER") || descUpper.includes("RECEIPT FROM") || descUpper.includes("PAYMENT TO")) return true;

  return false;
}

export function getTimeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    try {
      return AbortSignal.timeout(ms);
    } catch (e) {}
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export function extractNormalizedDocKeys(str) {
  if (!str) return [];
  const upper = String(str).trim().toUpperCase();
  const keys = new Set();
  const tokens = upper.split(/[\s,;]+/);
  for (let token of tokens) {
    token = token.trim();
    if (!token) continue;
    const match = token.match(/^([A-Z0-9]+?)[-_\s]*0*(\d+)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10);
      if (prefix && !isNaN(num)) {
        keys.add(`${prefix}-${num}`);
      }
    }
    const cleanToken = token.replace(/0*(\d+)/g, (m, n) => parseInt(n, 10));
    if (cleanToken) keys.add(cleanToken);
    keys.add(token);
  }
  return Array.from(keys);
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
  const str = String(dateStr).trim();
  if (!str) return new Date();

  const parts = str.split(/[-/]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return new Date(p0, p1 - 1, p2);
      }
      if (parts[2].length === 4) {
        // DD-MM-YYYY or DD/MM/YYYY
        return new Date(p2, p1 - 1, p0);
      }
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

export function toIsoDateStr(dateStr) {
  if (!dateStr) return "";
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return "";
    const yyyy = dateStr.getFullYear();
    const mm = String(dateStr.getMonth() + 1).padStart(2, '0');
    const dd = String(dateStr.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(dateStr).trim();
  const parts = str.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  const d = parseDateSafely(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return str;
}

export function mergeCollectionDatasets(target = {}, source = {}) {
  if (!source || typeof source !== "object") return target || {};
  if (!target || typeof target !== "object") target = {};

  const result = { ...target };
  const keysToMerge = [
    "materials", "contacts", "invoices", "purchases", 
    "salesOrders", "salesReturns", "purchaseReturns", 
    "transactions", "ledgers"
  ];

  keysToMerge.forEach(key => {
    const arrTarget = Array.isArray(target[key]) ? target[key] : [];
    const arrSource = Array.isArray(source[key]) ? source[key] : [];
    const idProp = key === "ledgers" ? "code" : "id";

    const map = new Map();
    const getKey = (item) => {
      if (!item) return null;
      let val = item[idProp] || item.id || item.code;
      if (!val && item.voucherNo) val = item.voucherNo;
      if (!val && item.reference) val = item.reference;
      return val ? String(val).trim() : null;
    };

    arrTarget.forEach(item => {
      const k = getKey(item);
      if (k) map.set(k, item);
    });

    arrSource.forEach(item => {
      const k = getKey(item);
      if (!k) return;
      if (!map.has(k)) {
        map.set(k, item);
      } else {
        const existing = map.get(k);
        const mergedItem = { ...existing };
        Object.keys(item).forEach(prop => {
          if (item[prop] !== undefined && item[prop] !== null) {
            mergedItem[prop] = item[prop];
          }
        });
        map.set(k, mergedItem);
      }
    });

    result[key] = Array.from(map.values());
  });

  Object.keys(source).forEach(k => {
    if (!keysToMerge.includes(k) && result[k] === undefined) {
      result[k] = source[k];
    }
  });

  if (source._lastSaved && (!result._lastSaved || source._lastSaved > result._lastSaved)) {
    result._lastSaved = source._lastSaved;
  }

  return result;
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
    this._currentUser = null;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("erp_current_user");
      }
    } catch (e) {}
    this.influencerRedemptions = [];
    this.loyaltyPrograms = [];
    this._suppressSave = true;
    this._pendingSave = false;
    this._isDataLoadedFromCloud = false;
    this._accountBalancesCache = null;
    this._cancelledDocKeysCache = null;
    this.checkAndMigrateLegacyData();
    this.loadState();
    this.ensureDefaultSeries();
    this.ensureStandardBaseLedgers();
    this.healCorruptedBaseLedgers();
    this.ensureStandardGstLedgers();
    this.migrateLegacyTaxEntries();
    this.rebuildAllTaxTransactions();
    this.cleanDuplicateTransactions();
    this.repairMissingTransactions();
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

  invalidateBalancesCache() {
    this._accountBalancesCache = null;
    this._cancelledDocKeysCache = null;
    this._canonicalAccountCache = null;
    this._groupParentMapCache = null;
  }

  getGroupParentMap() {
    if (this._groupParentMapCache) return this._groupParentMapCache;
    const map = new Map();
    (this.accountGroups || []).forEach(g => {
      if (g && g.name) map.set(String(g.name).trim().toUpperCase(), g);
    });
    this._groupParentMapCache = map;
    return map;
  }

  getBackendApiUrl(endpoint = "") {
    if (typeof window === "undefined") return null;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    try {
      const activeCompany = this.getActiveCompany ? this.getActiveCompany() : null;
      let customUrl = (activeCompany && activeCompany.serverUrl) ? activeCompany.serverUrl.trim() : "";
      if (!customUrl) {
        customUrl = (localStorage.getItem("erp_custom_backend_url") || "").trim();
      }
      if (!customUrl) {
        const comps = this.getRegisteredCompanies ? this.getRegisteredCompanies() : [];
        const compWithUrl = comps.find(c => c && c.serverUrl && c.serverUrl.trim());
        if (compWithUrl) customUrl = compWithUrl.serverUrl.trim();
      }
      if (customUrl) {
        const base = customUrl.replace(/\/+$/, "");
        if (window.location.protocol === "https:" && base.startsWith("http://") && !base.includes("localhost") && !base.includes("127.0.0.1")) {
          console.warn("[Backend API] Custom server URL is HTTP on an HTTPS page. Browser may block mixed content:", base);
        }
        return `${base}${cleanEndpoint}`;
      }
    } catch (e) {}

    const host = window.location.hostname || "localhost";
    const port = window.location.port;
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/.test(host);

    if (isLocalHost) {
      if (port === "3001") {
        return cleanEndpoint;
      }
      return `http://${host}:3001${cleanEndpoint}`;
    }

    return null;
  }

  getCancelledDocKeys() {
    if (this._cancelledDocKeysCache) return this._cancelledDocKeysCache;
    const keys = new Set();
    const addKeys = (item) => {
      if (!item) return;
      // ONLY use self-identifying document keys (id, voucherNo). NEVER use parent billNo/refNo/invoiceNo.
      const fields = [item.id, item.voucherNo];
      fields.forEach(f => {
        if (f) {
          extractNormalizedDocKeys(f).forEach(k => {
            if (!['SALES', 'RETURN', 'PURCHASE', 'INVOICE', 'BILL', 'COGS'].includes(k)) {
              keys.add(k);
            }
          });
        }
      });
    };

    (this.invoices || []).filter(i => i.isCancelled).forEach(addKeys);
    (this.purchases || []).filter(p => p.isCancelled).forEach(addKeys);
    (this.salesReturns || []).filter(r => r.isCancelled).forEach(addKeys);
    (this.purchaseReturns || []).filter(r => r.isCancelled).forEach(addKeys);

    this._cancelledDocKeysCache = keys;
    return keys;
  }

  isTransactionForCancelledDoc(tx) {
    if (!tx) return false;
    if (tx.isCancelled) return true;
    const cancelledKeys = this.getCancelledDocKeys();
    if (!cancelledKeys || cancelledKeys.size === 0) return false;

    if (!tx._normDocKeys) {
      const txId = tx.id ? String(tx.id).trim().toUpperCase() : '';
      const tvid = tx.voucherId ? String(tx.voucherId).trim().toUpperCase() : '';
      const ref = tx.reference ? String(tx.reference).trim() : '';
      const tvno = tx.voucherNo ? String(tx.voucherNo).trim() : '';
      const desc = tx.description ? String(tx.description).trim() : '';

      tx._normDocKeys = [
        ...extractNormalizedDocKeys(txId),
        ...extractNormalizedDocKeys(tvid),
        ...extractNormalizedDocKeys(ref),
        ...extractNormalizedDocKeys(tvno),
        ...extractNormalizedDocKeys(desc)
      ].filter(k => !['SALES', 'RETURN', 'PURCHASE', 'INVOICE', 'BILL', 'COGS'].includes(k));
    }

    for (let i = 0; i < tx._normDocKeys.length; i++) {
      if (cancelledKeys.has(tx._normDocKeys[i])) return true;
    }
    return false;
  }

  // ── Appwrite Realtime Transaction Listener ─────────────────────────────────
  initAppwriteRealtime() {
    if (this._appwriteRealtimeUnsubscribe) {
      try {
        this._appwriteRealtimeUnsubscribe();
      } catch (e) {}
      this._appwriteRealtimeUnsubscribe = null;
    }

    try {
      if (typeof appwriteClient !== "undefined" && typeof appwriteClient.subscribe === "function") {
        const channel = `databases.${APPWRITE_DATABASE_ID}.collections.transactions.documents`;
        console.log(`[Appwrite Realtime] Subscribing to instant transaction channel: ${channel}`);

        this._appwriteRealtimeUnsubscribe = appwriteClient.subscribe(channel, (response) => {
          try {
            const activeId = String(this.getActiveCompanyId() || "");
            const activeFyId = String(this.getActiveFyId() || "default");
            const payload = response && response.payload;
            if (!payload || !payload.company_id) return;

            // Check if document belongs to current company
            if (String(payload.company_id) !== activeId) return;

            // Check FY match (allow default or matching FY)
            if (payload.fy_id && String(payload.fy_id) !== activeFyId && payload.fy_id !== "default" && activeFyId !== "default") {
              return;
            }

            const events = Array.isArray(response.events) ? response.events : [];
            const isDelete = events.some(e => String(e).includes(".delete"));

            let rawTx = null;
            if (payload.raw_data) {
              try {
                rawTx = typeof payload.raw_data === "string" ? JSON.parse(payload.raw_data) : payload.raw_data;
              } catch (e) {}
            }

            const txId = (rawTx && rawTx.id) || payload.voucher_no || payload.$id;

            if (isDelete) {
              const prevLen = (this.transactions || []).length;
              this.transactions = (this.transactions || []).filter(t => t && t.id !== txId && t.voucherId !== txId);
              if (this.transactions.length !== prevLen) {
                this.persistLocalStateOnly();
                this.notifyListeners();
                if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
                  window.dispatchEvent(new CustomEvent("erp:data-refreshed"));
                }
                console.log(`[Appwrite Realtime] Removed transaction ${txId} via real-time push.`);
              }
            } else {
              // Create or Update
              if (!rawTx) {
                rawTx = {
                  id: txId,
                  voucherId: payload.voucher_no || txId,
                  voucherNo: payload.voucher_no,
                  voucherType: payload.voucher_type,
                  date: payload.date,
                  partyId: payload.party_id,
                  partyName: payload.party_name,
                  amount: payload.amount,
                  description: payload.narration || "",
                  entries: []
                };
              }

              if (!this.transactions) this.transactions = [];
              const idx = this.transactions.findIndex(t => t && (t.id === rawTx.id || (t.voucherId && rawTx.voucherId && t.voucherId === rawTx.voucherId)));

              if (idx >= 0) {
                this.transactions[idx] = { ...this.transactions[idx], ...rawTx };
                console.log(`[Appwrite Realtime] Updated transaction ${rawTx.id} via real-time push.`);
              } else {
                this.transactions.push(rawTx);
                console.log(`[Appwrite Realtime] Inserted new transaction ${rawTx.id} via real-time push.`);
              }

              this.persistLocalStateOnly();
              this.notifyListeners();
              if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
                window.dispatchEvent(new CustomEvent("erp:data-refreshed"));
              }
            }
          } catch (err) {
            console.warn("[Appwrite Realtime] Error processing event:", err);
          }
        });
      }
    } catch (e) {
      console.warn("[Appwrite Realtime] Subscription error:", e);
    }
  }

  persistLocalStateOnly() {
    try {
      const activeId = this.getActiveCompanyId();
      if (!activeId) return;
      const fyId = this.getActiveFyId();
      const stateToSave = {
        _lastSaved: Date.now(),
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
        salesAdjustments: this.salesAdjustments || [],
        purchaseAdjustments: this.purchaseAdjustments || [],
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
      const lsKey = `erp_company_data_${activeId}${fyId === 'default' ? '' : '_' + fyId}`;
      localStorage.setItem(lsKey, JSON.stringify(stateToSave));
      this._serverLoadedData = stateToSave;
    } catch (e) {}
  }

  // ── Auto-Sync: Poll server & Appwrite every 15 seconds ──────────────────────
  startAutoSync(intervalMs = 15000) {
    if (this._autoSyncInterval) clearInterval(this._autoSyncInterval);
    this.initAppwriteRealtime();

    this._autoSyncInterval = setInterval(async () => {
      // Pause polling if tab is hidden to save CPU and battery
      if (typeof document !== "undefined" && document.hidden) return;

      const activeId = this.getActiveCompanyId();
      if (!activeId) return;

      // Skip sync if local save happened recently (within 10 seconds)
      if (this._lastLocalSaveTime && (Date.now() - this._lastLocalSaveTime < 10000)) return;

      // Don't sync if user is actively typing/editing (a modal, voucher popup, or active voucher entry is in progress)
      const modalRoot = document.getElementById("modal-container-root");
      if (modalRoot && modalRoot.children.length > 0) return;

      const overlay = document.getElementById("modal-overlay");
      if (overlay && overlay.classList.contains("active")) return;

      const popup = document.getElementById("jv-input-popup");
      if (popup && popup.style.display !== "none") return;

      const gridBody = document.getElementById("jv-grid-body");
      if (gridBody && gridBody.children.length > 0 && !gridBody.innerHTML.includes("No entry lines added")) return;

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "SELECT" || activeEl.tagName === "TEXTAREA")) return;

      const fyId = this.getActiveFyId();

      try {
        const dataUrl = this.getBackendApiUrl(`/api/data/${activeId}/${fyId}`);
        let incomingData = null;

        if (dataUrl) {
          try {
            const res = await fetch(dataUrl, {
              cache: "no-store",
              headers: { "Bypass-Tunnel-Reminder": "true" },
              signal: getTimeoutSignal(4000)
            });
            if (res.ok) incomingData = await res.json();
          } catch (e) {}
        } else {
          // In cloud static mode (e.g. Cloudflare Pages), poll Appwrite Cloud Storage
          try {
            incomingData = await this.fetchAppwriteCloudData(activeId, fyId);
          } catch (e) {}
        }

        if (!incomingData || typeof incomingData !== "object") return;

        const incomingInvs = Array.isArray(incomingData.invoices) ? incomingData.invoices.length : 0;
        const incomingTxs = Array.isArray(incomingData.transactions) ? incomingData.transactions.length : 0;
        const currentInvs = Array.isArray(this.invoices) ? this.invoices.length : 0;
        const currentTxs = Array.isArray(this.transactions) ? this.transactions.length : 0;

        const incomingLastSaved = Number(incomingData._lastSaved || 0);
        const currentLastSaved = Number((this._serverLoadedData && this._serverLoadedData._lastSaved) || this._lastLocalSaveTime || 0);

        // If incoming server/cloud dataset is not newer than our loaded state, skip
        if (incomingLastSaved <= currentLastSaved) {
          return;
        }

        let merged = incomingData;
        const currentStr = JSON.stringify(this._serverLoadedData || {});
        const mergedStr = JSON.stringify(merged);

        if (currentStr !== mergedStr) {
          this._serverLoadedData = merged;
          this.loadState();
          const lsKey = `erp_company_data_${activeId}${fyId === 'default' ? '' : '_' + fyId}`;
          try {
            localStorage.setItem(lsKey, JSON.stringify(merged));
          } catch (e) {}

          if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent("erp:data-refreshed"));
          }
          console.log("[AutoSync] Data refreshed from " + (dataUrl ? "Local Server API" : "Appwrite Cloud") + ".");
        }
      } catch (e) {}
    }, intervalMs);
  }

  stopAutoSync() {
    if (this._autoSyncInterval) {
      clearInterval(this._autoSyncInterval);
      this._autoSyncInterval = null;
    }
  }

  async fetchAppwriteCloudData(activeId, fyId) {
    if (!activeId) return null;
    const targetFyId = String(fyId || this.getActiveFyId() || "default");
    const candidateFileIds = Array.from(new Set([
      sanitizeAppwriteId(`db_${activeId}_${targetFyId}`),
      sanitizeAppwriteId(`db_${activeId}_default`),
      sanitizeAppwriteId(`db_${activeId}_Current_F_Y`),
      sanitizeAppwriteId(`db_${activeId}_fy_bkp`)
    ]));

    // 1. FAST PATH: Instant download of full company DB from Appwrite Cloud Storage
    // Check all candidate files in parallel and select the newest snapshot by _lastSaved timestamp
    const validSnapshots = [];
    await Promise.all(candidateFileIds.map(async (fileId) => {
      try {
        const storageUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_STORAGE_BUCKET}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}&t=${Date.now()}`;
        const res = await fetch(storageUrl, { cache: "no-store" });
        if (res.ok) {
          const fullData = await res.json();
          if (fullData && typeof fullData === "object" && (
            (Array.isArray(fullData.ledgers) && fullData.ledgers.length > 0) ||
            (Array.isArray(fullData.transactions) && fullData.transactions.length > 0) ||
            (Array.isArray(fullData.contacts) && fullData.contacts.length > 0) ||
            (Array.isArray(fullData.invoices) && fullData.invoices.length > 0)
          )) {
            validSnapshots.push({
              fileId,
              fullData,
              lastSaved: Number(fullData._lastSaved || 0)
            });
          }
        }
      } catch (storageErr) {}
    }));

    // Helper to query all documents for a collection
    const fetchAllDocs = async (collectionId) => {
      let all = [];
      let offset = 0;
      const limit = 100;
      while (true) {
        try {
          const res = await appwriteDatabases.listDocuments(
            APPWRITE_DATABASE_ID,
            collectionId,
            [
              Query.equal("company_id", String(activeId)),
              Query.limit(limit),
              Query.offset(offset)
            ]
          );
          if (!res || !Array.isArray(res.documents) || res.documents.length === 0) break;
          all = all.concat(res.documents);
          if (res.documents.length < limit) break;
          offset += limit;
        } catch (e) {
          break;
        }
      }

      if (targetFyId && targetFyId !== 'default' && targetFyId !== 'all') {
        const fyMatches = all.filter(d => String(d.fy_id) === String(targetFyId));
        if (fyMatches.length > 0) return fyMatches;
      }
      return all;
    };

    const parseRaw = (doc) => {
      if (!doc) return null;
      if (doc.raw_data) {
        try {
          return typeof doc.raw_data === 'string' ? JSON.parse(doc.raw_data) : doc.raw_data;
        } catch (e) {}
      }
      return doc;
    };

    if (validSnapshots.length > 0) {
      // Always select the newest snapshot by _lastSaved timestamp
      validSnapshots.sort((a, b) => (b.lastSaved || 0) - (a.lastSaved || 0));
      const best = validSnapshots[0];
      const baseData = best.fullData || {};

      console.log(`[Appwrite Cloud] Selected newest DB snapshot (${best.fileId}, _lastSaved: ${best.lastSaved}) with ${baseData.invoices?.length || 0} invoices and ${baseData.transactions?.length || 0} vouchers.`);
      return baseData;
    }

    // 2. FALLBACK PATH: Query Appwrite Database Collections

    try {
      const [materials, contacts, invoices, purchases, salesOrders, salesReturns, purchaseReturns, transactions, ledgers, settings] = await Promise.all([
        fetchAllDocs("materials"),
        fetchAllDocs("contacts"),
        fetchAllDocs("invoices"),
        fetchAllDocs("purchases"),
        fetchAllDocs("sales_orders"),
        fetchAllDocs("sales_returns"),
        fetchAllDocs("purchase_returns"),
        fetchAllDocs("transactions"),
        fetchAllDocs("ledgers"),
        fetchAllDocs("company_settings")
      ]);

      if (materials.length > 0 || contacts.length > 0 || invoices.length > 0 || purchases.length > 0 || transactions.length > 0 || ledgers.length > 0) {
        let maxDocTime = 0;
        const allDocs = [...materials, ...contacts, ...invoices, ...purchases, ...transactions, ...ledgers];
        allDocs.forEach(d => {
          if (d && d.$updatedAt) {
            const t = new Date(d.$updatedAt).getTime();
            if (t > maxDocTime) maxDocTime = t;
          }
        });

        const result = {
          _fyId: targetFyId,
          _lastSaved: maxDocTime || 1,
          materials: materials.map(parseRaw).filter(Boolean),
          contacts: contacts.map(parseRaw).filter(Boolean),
          invoices: invoices.map(parseRaw).filter(Boolean),
          purchases: purchases.map(parseRaw).filter(Boolean),
          salesOrders: salesOrders.map(parseRaw).filter(Boolean),
          salesReturns: salesReturns.map(parseRaw).filter(Boolean),
          purchaseReturns: purchaseReturns.map(parseRaw).filter(Boolean),
          transactions: transactions.map(parseRaw).filter(Boolean),
          ledgers: ledgers.map(l => {
            const item = parseRaw(l);
            if (l.account_group && !item.groupName) item.groupName = l.account_group;
            return item;
          }).filter(Boolean)
        };

        if (Array.isArray(settings)) {
          settings.forEach(s => {
            if (s && s.setting_key && s.setting_value) {
              try {
                result[s.setting_key] = JSON.parse(s.setting_value);
              } catch (e) {}
            }
          });
        }

        return result;
      }
      return {
        _fyId: targetFyId,
        _lastSaved: 0,
        materials: [],
        contacts: [],
        invoices: [],
        purchases: [],
        salesOrders: [],
        salesReturns: [],
        purchaseReturns: [],
        transactions: [],
        ledgers: []
      };
    } catch (e) {
      console.warn("Appwrite cloud fetch error:", e);
    }
    return null;
  }

  async fetchSupabaseData(activeId, fyId) {
    return this.fetchAppwriteCloudData(activeId, fyId);
  }

  async initFromServer() {
    const apiUrl = this.getBackendApiUrl("/api/companies");

    try {
      let serverCompanies = null;
      if (apiUrl) {
        try {
          const res = await fetch(apiUrl, {
            headers: { "Bypass-Tunnel-Reminder": "true" },
            signal: getTimeoutSignal(2000)
          });
          if (res.ok) serverCompanies = await res.json();
        } catch (e) {}
      }

      if (!Array.isArray(serverCompanies) || serverCompanies.length === 0) {
        // Fallback to Appwrite Cloud Database
        try {
          const compRes = await appwriteDatabases.listDocuments(APPWRITE_DATABASE_ID, "companies", [Query.limit(100)]);
          if (compRes && Array.isArray(compRes.documents) && compRes.documents.length > 0) {
            let allFys = [];
            try {
              const fysRes = await appwriteDatabases.listDocuments(APPWRITE_DATABASE_ID, "financial_years", [Query.limit(100)]);
              if (fysRes && Array.isArray(fysRes.documents)) allFys = fysRes.documents;
            } catch (e) {}

            serverCompanies = compRes.documents.map(c => {
              if (c.raw_data) {
                try {
                  return JSON.parse(c.raw_data);
                } catch (e) {}
              }
              const compFys = (allFys || [])
                .filter(f => String(f.company_id) === String(c.company_id || c.$id))
                .map(f => ({
                  id: String(f.$id || f.name),
                  name: f.name,
                  startDate: f.start_date,
                  endDate: f.end_date
                }));

              return {
                id: String(c.company_id || c.$id),
                name: c.name,
                subName: c.sub_name || "",
                address: c.address || "",
                country: c.country || "INDIA",
                state: c.state || "KERALA",
                district: c.district || "",
                phone: c.phone || "",
                mobile: c.mobile || "",
                email: c.email || "",
                pincode: c.pincode || "",
                website: c.website || "",
                currencyName: c.currency_name || "Rupees",
                taxApplicable: c.tax_applicable || "",
                gstin: c.gstin || "",
                username: c.username || "admin",
                password: c.password || "123",
                financialYears: compFys.length > 0 ? compFys : [{ id: "default", name: "Current F.Y" }]
              };
            });
          }
        } catch (e) {}

        if (!Array.isArray(serverCompanies) || serverCompanies.length === 0) {
          try {
            const staticRes = await fetch("/data/companies.json");
            if (staticRes.ok) serverCompanies = await staticRes.json();
          } catch (e) {}
        }
      }

      if (Array.isArray(serverCompanies) && serverCompanies.length > 0) {
        const localStr = localStorage.getItem("erp_companies");
        const localCompanies = localStr ? JSON.parse(localStr) : [];
        const merged = serverCompanies.map(sc => {
          const lc = localCompanies.find(c => String(c.id) === String(sc.id));
          if (lc) {
            if (lc.serverUrl) sc.serverUrl = lc.serverUrl;
            if (Array.isArray(lc.financialYears) && lc.financialYears.length > 0) {
              const fyMap = new Map();
              (sc.financialYears || []).forEach(fy => {
                if (fy && fy.id) fyMap.set(String(fy.id), fy);
              });
              lc.financialYears.forEach(lfy => {
                if (lfy && lfy.id) {
                  const existing = fyMap.get(String(lfy.id));
                  if (existing) {
                    fyMap.set(String(lfy.id), { ...existing, ...lfy });
                  } else {
                    fyMap.set(String(lfy.id), lfy);
                  }
                }
              });
              sc.financialYears = Array.from(fyMap.values());
            }

            // Merge users so locally added users are not overwritten
            const userMap = new Map();
            if (Array.isArray(lc.users)) {
              lc.users.forEach(u => {
                if (u && u.username) userMap.set(u.username.toLowerCase(), { ...u });
              });
            }
            if (Array.isArray(sc.users)) {
              sc.users.forEach(u => {
                if (u && u.username) {
                  const k = u.username.toLowerCase();
                  if (userMap.has(k)) {
                    userMap.set(k, { ...userMap.get(k), ...u });
                  } else {
                    userMap.set(k, { ...u });
                  }
                }
              });
            }
            if (userMap.size > 0) {
              sc.users = Array.from(userMap.values());
            }
          }
          return sc;
        });

        localCompanies.forEach(lc => {
          if (!merged.some(m => String(m.id) === String(lc.id))) {
            merged.push(lc);
          }
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
      const lsKey = `erp_company_data_${activeId}${fyId === 'default' ? '' : '_' + fyId}`;
      let localCachedData = null;
      try {
        const localStr = localStorage.getItem(lsKey);
        if (localStr) localCachedData = JSON.parse(localStr);
      } catch (e) {}

      let localServerData = null;
      const dataUrl = this.getBackendApiUrl(`/api/data/${activeId}/${fyId}`);
      if (dataUrl) {
        try {
          const dataRes = await fetch(dataUrl, {
            headers: { "Bypass-Tunnel-Reminder": "true" },
            signal: getTimeoutSignal(2000)
          });
          if (dataRes.ok) {
            localServerData = await dataRes.json();
          }
        } catch (e) {}
      }

      const hasValidData = (d) => d && typeof d === "object" && (
        (Array.isArray(d.invoices) && d.invoices.length > 0) ||
        (Array.isArray(d.contacts) && d.contacts.length > 0) ||
        (Array.isArray(d.materials) && d.materials.length > 0) ||
        (Array.isArray(d.transactions) && d.transactions.length > 0) ||
        (Array.isArray(d.ledgers) && d.ledgers.length > 0)
      );

      let cloudData = null;
      try {
        cloudData = await this.fetchAppwriteCloudData(activeId, fyId);
      } catch (e) {}

      let staticData = null;
      try {
        const staticRes = await fetch(`/data/${activeId}_${fyId}.json?v=${Date.now()}`);
        if (staticRes.ok) staticData = await staticRes.json();
      } catch (e) {}

      const localInvs = Array.isArray(localCachedData?.invoices) ? localCachedData.invoices.length : 0;
      const localTxs = Array.isArray(localCachedData?.transactions) ? localCachedData.transactions.length : 0;
      const localCount = (localInvs * 100000) + localTxs;

      const serverInvs = Array.isArray(localServerData?.invoices) ? localServerData.invoices.length : 0;
      const serverTxs = Array.isArray(localServerData?.transactions) ? localServerData.transactions.length : 0;
      const serverCount = (serverInvs * 100000) + serverTxs;

      const cloudInvs = Array.isArray(cloudData?.invoices) ? cloudData.invoices.length : 0;
      const cloudTxs = Array.isArray(cloudData?.transactions) ? cloudData.transactions.length : 0;
      const cloudCount = (cloudInvs * 100000) + cloudTxs;

      const staticInvs = Array.isArray(staticData?.invoices) ? staticData.invoices.length : 0;
      const staticTxs = Array.isArray(staticData?.transactions) ? staticData.transactions.length : 0;
      const staticCount = (staticInvs * 100000) + staticTxs;

      const localTime = Number(localCachedData?._lastSaved || 0);
      const serverTime = Number(localServerData?._lastSaved || 0);
      const cloudTime = Number(cloudData?._lastSaved || 0);
      const staticTime = Number(staticData?._lastSaved || 0);

      let mergedData = null;

      // Select authoritative external candidate (Cloud / Server / Static)
      let externalCandidate = null;
      if (hasValidData(cloudData) && cloudCount >= serverCount && cloudTime >= staticTime) {
        externalCandidate = cloudData;
      } else if (hasValidData(localServerData) && serverTime >= cloudTime && serverTime >= staticTime) {
        externalCandidate = localServerData;
      } else if (hasValidData(staticData) && staticTime >= cloudTime && staticTime >= serverTime) {
        externalCandidate = staticData;
      } else if (hasValidData(cloudData)) {
        externalCandidate = cloudData;
      } else if (hasValidData(localServerData)) {
        externalCandidate = localServerData;
      } else if (hasValidData(staticData)) {
        externalCandidate = staticData;
      }

      const externalTime = Number(externalCandidate?._lastSaved || 0);

      // Detect if local cache has phantom / ghost clone entries or legacy duplicate migration batches
      const hasGhostClones = Array.isArray(localCachedData?.transactions) && (
        localCachedData.transactions.some(t => {
          const vNo = String(t.voucherNo || t.refNo || t.id || '');
          return /^LSL-03[7-9]\d$/i.test(vNo) || /^LSL-040\d$/i.test(vNo) || t.id === 'RC-786';
        }) || (localTxs > ((externalCandidate?.transactions?.length || 0) + 100))
      );

      // If external dataset is newer, or local cache is empty/stale/polluted with duplicates, adopt external dataset
      if (externalCandidate && (!hasValidData(localCachedData) || externalTime >= localTime || hasGhostClones)) {
        mergedData = externalCandidate;
        console.log(`[initFromServer] Adopted authoritative external dataset (${externalTime} vs local ${localTime}, ghostClones/duplicates: ${hasGhostClones}).`);
      } else if (hasValidData(localCachedData)) {
        mergedData = localCachedData;
        console.log(`[initFromServer] Local cache is newest (${localTime}). Forward-syncing.`);
      } else if (externalCandidate) {
        mergedData = externalCandidate;
      }

      if (mergedData && typeof mergedData === "object" && (mergedData.transactions || mergedData.invoices || mergedData.purchases || mergedData.materials || mergedData.contacts || mergedData.ledgers)) {
        this._serverLoadedData = mergedData;
        try {
          localStorage.setItem(`erp_company_data_${activeId}${fyId === 'default' ? '' : '_' + fyId}`, JSON.stringify(mergedData));
        } catch (e) {}

        if (dataUrl && mergedData !== localServerData) {
          try {
            fetch(dataUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mergedData)
            }).catch(() => {});
          } catch (e) {}
        }
      }
    }

    this._isDataLoadedFromCloud = true;
    this.loadState();
    this.initAppwriteRealtime();
    this.notifyListeners();
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("erp:data-refreshed"));
    }
  }

  async syncAllTransactionsToAppwrite(activeId, fyId) {
    try {
      const compId = String(activeId || this.getActiveCompanyId() || "1");
      const fId = String(fyId || this.getActiveFyId() || "default");
      if (!compId || !Array.isArray(this.transactions) || this.transactions.length === 0) return;

      console.log(`[Appwrite Cloud] Reconciling ${this.transactions.length} local transaction(s) to Appwrite Database collection...`);
      for (const tx of this.transactions) {
        if (tx && tx.id) {
          this.syncTransactionToAppwrite(tx, false, compId, fId).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("[Appwrite Cloud] syncAllTransactionsToAppwrite error:", e);
    }
  }

  getRegisteredCompanies() {
    try {
      const val = localStorage.getItem("erp_companies");
      if (!val || val === "undefined" || val === "null") return [];
      const list = JSON.parse(val) || [];
      let changed = false;
      for (const c of list) {
        c.financialYears = c.financialYears || [];
        if (c.financialYears.length === 0) {
          c.financialYears.push({
            id: "default",
            name: "Current F.Y",
            startDate: c.financialYearStarts || "2026-04-01",
            endDate: c.financialYearEnds || "2027-03-31"
          });
          changed = true;
        }

        // Deduplicate financialYears by unique ID (keep latest instance if duplicate IDs exist)
        const uniqueById = [];
        const seenIds = new Set();
        for (let i = c.financialYears.length - 1; i >= 0; i--) {
          const fy = c.financialYears[i];
          if (!fy || !fy.id) continue;
          const fid = String(fy.id);
          if (!seenIds.has(fid)) {
            seenIds.add(fid);
            uniqueById.unshift(fy);
          } else {
            changed = true;
          }
        }

        // Deduplicate financialYears by effective date period (startDate + endDate)
        const uniqueByRange = [];
        const seenRanges = new Set();
        for (let i = uniqueById.length - 1; i >= 0; i--) {
          const fy = uniqueById[i];
          const start = fy.startDate || c.financialYearStarts || "";
          const end = fy.endDate || (i === uniqueById.length - 1 ? c.financialYearEnds : "");
          const rangeKey = `${start}_${end}`;
          if (!seenRanges.has(rangeKey)) {
            seenRanges.add(rangeKey);
            uniqueByRange.unshift(fy);
          } else {
            // Remove unlinked local storage keys for duplicate FYs
            if (fy.id && fy.id !== "default") {
              try {
                localStorage.removeItem(`erp_company_data_${c.id}_${fy.id}`);
              } catch (e) {}
            }
            changed = true;
          }
        }

        c.financialYears = uniqueByRange;

        c.financialYears.forEach((fy, idx) => {
          const isLatest = idx === c.financialYears.length - 1;
          const startFmt = fy.startDate ? fy.startDate.split("-").reverse().join("/") : "";
          const endFmt = fy.endDate ? fy.endDate.split("-").reverse().join("/") : "";
          const rangeName = (startFmt && endFmt) ? `${startFmt} to ${endFmt}` : "Previous F.Y";

          if (isLatest) {
            if (fy.name !== "Current F.Y") {
              fy.name = "Current F.Y";
              changed = true;
            }
            c.financialYearStarts = fy.startDate || c.financialYearStarts;
            c.financialYearEnds = fy.endDate || c.financialYearEnds;
          } else {
            if (fy.name !== rangeName) {
              fy.name = rangeName;
              changed = true;
            }
          }
        });
      }
      if (changed) {
        localStorage.setItem("erp_companies", JSON.stringify(list));
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  async saveRegisteredCompanies(companies) {
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
      const apiUrl = this.getBackendApiUrl("/api/companies");

      let localResp = null;
      if (apiUrl) {
        try {
          const resp = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(companiesWithFy)
          });
          localResp = await resp.json();
        } catch (e) {}
      }

      // Background push to Appwrite Cloud Database
      try {
        for (const c of companiesWithFy) {
          const compId = String(c.id);
          const docId = `comp_${compId}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
          const compData = {
            company_id: compId,
            name: c.name || "Unnamed",
            sub_name: c.subName || "",
            phone: c.phone || "",
            mobile: c.mobile || "",
            gstin: c.gstin || "",
            raw_data: JSON.stringify(c)
          };

          try {
            await appwriteDatabases.updateDocument(APPWRITE_DATABASE_ID, "companies", docId, compData);
          } catch (updateErr) {
            if (updateErr.code === 404) {
              await appwriteDatabases.createDocument(APPWRITE_DATABASE_ID, "companies", docId, compData).catch(e => {});
            }
          }

          if (Array.isArray(c.financialYears)) {
            for (const fy of c.financialYears) {
              const fyDocId = `fy_${compId}_${fy.id || 'default'}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
              const fyData = {
                company_id: compId,
                name: fy.name || "Current F.Y",
                start_date: fy.startDate || "",
                end_date: fy.endDate || ""
              };
              try {
                await appwriteDatabases.updateDocument(APPWRITE_DATABASE_ID, "financial_years", fyDocId, fyData);
              } catch (updateFyErr) {
                if (updateFyErr.code === 404) {
                  await appwriteDatabases.createDocument(APPWRITE_DATABASE_ID, "financial_years", fyDocId, fyData).catch(e => {});
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Appwrite company sync error:", e);
      }

      return localResp || { success: true };
    } catch (e) {
      return null;
    }
  }

  changeCompanyId(oldId, newId) {
    if (!oldId || !newId) return { success: false, message: "Invalid company ID specified." };
    const cleanOldId = String(oldId).trim();
    const cleanNewId = String(newId).trim();

    if (!cleanNewId) return { success: false, message: "New Company ID cannot be empty." };
    if (cleanOldId === cleanNewId) return { success: true, message: "Company ID unchanged." };

    const companies = this.getRegisteredCompanies();
    const compIndex = companies.findIndex(c => String(c.id) === cleanOldId);
    if (compIndex === -1) return { success: false, message: `Company with ID "${cleanOldId}" not found.` };

    const isDuplicate = companies.some(c => String(c.id) === cleanNewId && String(c.id) !== cleanOldId);
    if (isDuplicate) return { success: false, message: `Company ID "${cleanNewId}" is already assigned to another company.` };

    // Update ID in company list
    companies[compIndex].id = cleanNewId;

    // Migrate all localStorage keys for this company ID
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.endsWith(`_${cleanOldId}`)) {
          const prefix = k.slice(0, k.length - cleanOldId.length);
          const newKey = prefix + cleanNewId;
          const val = localStorage.getItem(k);
          if (val !== null) {
            localStorage.setItem(newKey, val);
            localStorage.removeItem(k);
          }
        } else if (k.startsWith(`erp_company_data_${cleanOldId}`)) {
          const suffix = k.slice(`erp_company_data_${cleanOldId}`.length);
          const newKey = `erp_company_data_${cleanNewId}${suffix}`;
          const val = localStorage.getItem(k);
          if (val !== null) {
            localStorage.setItem(newKey, val);
            localStorage.removeItem(k);
          }
        }
      }
    } catch (e) {
      console.warn("LocalStorage migration error during Company ID change:", e);
    }

    // Update active company ID if current company was updated
    const currentActiveId = String(this.getActiveCompanyId());
    if (currentActiveId === cleanOldId) {
      this.setActiveCompanyId(cleanNewId);
    }

    this.saveRegisteredCompanies(companies);

    if (currentActiveId === cleanOldId) {
      this.saveState();
    }

    this.notifyListeners();

    return { success: true, message: `Company ID changed from "${cleanOldId}" to "${cleanNewId}" successfully.` };
  }

  getCurrentFinancialYearId(companyId) {
    const activeId = companyId || this.getActiveCompanyId();
    if (!activeId) return "default";
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(activeId));
    if (!company || !company.financialYears || company.financialYears.length === 0) {
      return "default";
    }
    const currentFy = company.financialYears.find(f => f.name === "Current F.Y") || company.financialYears[company.financialYears.length - 1];
    return currentFy ? currentFy.id : "default";
  }

  resetToCurrentFinancialYear(companyId) {
    const activeId = companyId || this.getActiveCompanyId();
    if (activeId) {
      const currentFyId = this.getCurrentFinancialYearId(activeId);
      this.setActiveFyId(currentFyId);
      return currentFyId;
    }
    return "default";
  }

  getActiveFyId() {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return "default";
    let fy = localStorage.getItem(`erp_active_fy_id_${activeId}`);
    if (!fy) {
      fy = this.getCurrentFinancialYearId(activeId);
    }
    return fy || "default";
  }

  getFyDisplayLabel(fy, company) {
    if (!fy) return "";
    const activeCompany = company || this.getRegisteredCompanies().find(c => String(c.id) === String(this.getActiveCompanyId()));
    const fys = (activeCompany && activeCompany.financialYears) ? activeCompany.financialYears : [];
    const isLatest = fys.length > 0 && String(fys[fys.length - 1].id) === String(fy.id);

    const startFormatted = fy.startDate ? fy.startDate.split("-").reverse().join("/") : "";
    const endFormatted = fy.endDate ? fy.endDate.split("-").reverse().join("/") : "";

    if (isLatest) {
      if (startFormatted && endFormatted) {
        return `Current F.Y (${startFormatted} - ${endFormatted})`;
      }
      return "Current F.Y";
    }

    // Previous financial year
    if (startFormatted && endFormatted) {
      return `${startFormatted} to ${endFormatted}`;
    }
    return (fy.name && fy.name !== "Current F.Y") ? fy.name : "Previous F.Y";
  }

  validateTransactionDate(date) {
    if (!date) return;
    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return;
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(activeCompanyId));
    if (!company) return;
    const activeFyId = this.getActiveFyId();
    let fy = (company.financialYears || []).find(f => String(f.id) === String(activeFyId));
    if (!fy && company.financialYears && company.financialYears.length > 0) {
      fy = company.financialYears.find(f => f.name === "Current F.Y") || company.financialYears[0];
    }
    if (!fy && (company.financialYearStarts || company.financialYearEnds)) {
      fy = {
        startDate: company.financialYearStarts,
        endDate: company.financialYearEnds
      };
    }
    if (fy) {
      const txIso = toIsoDateStr(date);
      if (fy.startDate) {
        const fyStartIso = toIsoDateStr(fy.startDate);
        if (txIso && fyStartIso && txIso < fyStartIso) {
          const formattedDate = txIso.split("-").reverse().join("/");
          const formattedStartDate = fyStartIso.split("-").reverse().join("/");
          throw new Error(`TRANSACTION DATE (${formattedDate}) CANNOT BE BEFORE THE START OF THE FINANCIAL YEAR (${formattedStartDate}).`);
        }
      }
      if (fy.endDate) {
        const fyEndIso = toIsoDateStr(fy.endDate);
        if (txIso && fyEndIso && txIso > fyEndIso) {
          const formattedDate = txIso.split("-").reverse().join("/");
          const formattedEndDate = fyEndIso.split("-").reverse().join("/");
          throw new Error(`TRANSACTION DATE (${formattedDate}) CANNOT BE BEYOND THE END OF THE FINANCIAL YEAR (${formattedEndDate}).`);
        }
      }
    }
  }

  getActiveFinancialYearStartDate() {
    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return null;
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(activeCompanyId));
    if (!company) return null;
    const activeFyId = this.getActiveFyId();
    const fy = (company.financialYears || []).find(f => String(f.id) === String(activeFyId)) || (company.financialYears ? company.financialYears[0] : null);
    return fy ? fy.startDate : (company.financialYearStarts || null);
  }

  getActiveFinancialYearEndDate() {
    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return null;
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(activeCompanyId));
    if (!company) return null;
    const activeFyId = this.getActiveFyId();
    const fy = (company.financialYears || []).find(f => String(f.id) === String(activeFyId)) || (company.financialYears ? company.financialYears[0] : null);
    return fy ? fy.endDate : (company.financialYearEnds || null);
  }



  setActiveFyId(fyId) {
    const activeId = this.getActiveCompanyId();
    if (activeId) {
      if (fyId) {
        localStorage.setItem(`erp_active_fy_id_${activeId}`, fyId);
      } else {
        localStorage.removeItem(`erp_active_fy_id_${activeId}`);
      }
      this._serverLoadedData = null;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("financialYearChanged", { detail: { fyId } }));
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
    return this._currentUser || null;
  }

  setCurrentUser(userObj) {
    this._currentUser = userObj ? { ...userObj } : null;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("erp_current_user");
      }
    } catch (e) {}
  }

  getCompanyUsers(companyId) {
    const compId = companyId || this.getActiveCompanyId();
    if (!compId) return [];
    const companies = this.getRegisteredCompanies();
    const comp = companies.find(c => String(c.id) === String(compId));
    if (!comp) return [];

    if (!Array.isArray(comp.users)) {
      comp.users = [];
    }

    // Ensure Admin user is ALWAYS present in comp.users
    const hasAdmin = comp.users.some(u => (u.username || "").trim().toLowerCase() === "admin" || u.role === "Admin");
    if (!hasAdmin) {
      comp.users.unshift({
        id: "USR-1",
        username: comp.username || "admin",
        password: String(comp.password ?? "123"),
        fullName: "Administrator",
        role: "Admin",
        status: "Active",
        allowedCompanies: companies.map(c => String(c.id))
      });
      this.saveRegisteredCompanies(companies);
    }
    return comp.users;
  }

  saveCompanyUser(companyId, userData) {
    const compId = companyId || this.getActiveCompanyId();
    if (!compId) return null;
    const companies = this.getRegisteredCompanies();

    const allowed = (Array.isArray(userData.allowedCompanies) && userData.allowedCompanies.length > 0)
      ? userData.allowedCompanies.map(String)
      : (userData.role === "Admin" || (userData.username && userData.username.toLowerCase() === "admin"))
        ? companies.map(c => String(c.id))
        : [String(compId)];

    const targetUserId = userData.id || ("USR-" + Date.now());
    const usernameKey = (userData.username || "").trim().toLowerCase();

    const updatedUserObj = {
      id: targetUserId,
      username: (userData.username || "").trim(),
      password: String(userData.password ?? ""),
      fullName: userData.fullName ? userData.fullName.trim() : (userData.username || "").trim(),
      role: userData.role || "Sales Clerk",
      status: userData.status || "Active",
      allowedCompanies: allowed
    };

    companies.forEach(comp => {
      if (!Array.isArray(comp.users)) comp.users = [];

      // Ensure Admin exists in comp.users
      const hasAdmin = comp.users.some(u => (u.username || "").trim().toLowerCase() === "admin" || u.role === "Admin");
      if (!hasAdmin) {
        comp.users.unshift({
          id: "USR-1",
          username: comp.username || "admin",
          password: String(comp.password ?? "123"),
          fullName: "Administrator",
          role: "Admin",
          status: "Active",
          allowedCompanies: companies.map(c => String(c.id))
        });
      }

      const compIdStr = String(comp.id);
      const isAllowed = (updatedUserObj.role === "Admin" || updatedUserObj.username.toLowerCase() === "admin")
        ? true
        : allowed.includes(compIdStr);

      const idx = comp.users.findIndex(u => String(u.id) === String(targetUserId) || ((u.username || "").trim().toLowerCase() === usernameKey));

      if (isAllowed) {
        if (idx !== -1) {
          comp.users[idx] = { ...comp.users[idx], ...updatedUserObj };
        } else {
          comp.users.push({ ...updatedUserObj });
        }
        if (updatedUserObj.username.toLowerCase() === (comp.username || "admin").toLowerCase()) {
          comp.password = updatedUserObj.password;
        }
      } else {
        if (idx !== -1 && updatedUserObj.username.toLowerCase() !== "admin") {
          comp.users.splice(idx, 1);
        }
      }
    });

    this.saveRegisteredCompanies(companies);
    return updatedUserObj;
  }

  deleteCompanyUser(companyId, userId) {
    const companies = this.getRegisteredCompanies();
    let deletedAny = false;

    companies.forEach(comp => {
      if (Array.isArray(comp.users)) {
        const initialLen = comp.users.length;
        comp.users = comp.users.filter(u => String(u.id) !== String(userId) && String(u.username).toLowerCase() !== String(userId).toLowerCase());
        if (comp.users.length !== initialLen) deletedAny = true;
      }
    });

    if (deletedAny) {
      this.saveRegisteredCompanies(companies);
    }
    return deletedAny;
  }

  getAllUsers() {
    const companies = this.getRegisteredCompanies();
    const userMap = new Map();

    companies.forEach(comp => {
      const users = (Array.isArray(comp.users) && comp.users.length > 0)
        ? comp.users
        : [
            {
              id: "USR-1",
              username: comp.username || "admin",
              password: String(comp.password ?? "123"),
              fullName: "Administrator",
              role: "Admin",
              status: "Active",
              allowedCompanies: companies.map(c => String(c.id))
            }
          ];

      users.forEach(u => {
        const key = (u.username || "").trim().toLowerCase();
        if (key) {
          if (!userMap.has(key)) {
            userMap.set(key, { ...u });
          } else {
            const existing = userMap.get(key);
            if (Array.isArray(u.allowedCompanies)) {
              const existingAllowed = existing.allowedCompanies || [];
              const mergedAllowed = Array.from(new Set([
                ...existingAllowed.map(String),
                ...u.allowedCompanies.map(String)
              ]));
              existing.allowedCompanies = mergedAllowed;
            }
          }
        }
      });
    });

    if (!userMap.has("admin") && companies.length > 0) {
      userMap.set("admin", {
        id: "USR-1",
        username: companies[0].username || "admin",
        password: String(companies[0].password ?? "123"),
        fullName: "Administrator",
        role: "Admin",
        status: "Active",
        allowedCompanies: companies.map(c => String(c.id))
      });
    }

    return Array.from(userMap.values());
  }

  authenticateUser(companyId, username, password) {
    const compIdStr = String(companyId);
    const uInput = (username || "").trim().toLowerCase();
    const pInput = String(password ?? "").trim();

    if (!uInput || !pInput) return null;

    // 1. Check direct company users list
    const users = this.getCompanyUsers(companyId);
    let match = users.find(u => 
      (u.username || "").trim().toLowerCase() === uInput && 
      String(u.password ?? "").trim() === pInput && 
      u.status !== "Inactive"
    );

    // 2. If not directly in company users, search across all system users
    if (!match) {
      const allUsers = this.getAllUsers();
      match = allUsers.find(u => 
        (u.username || "").trim().toLowerCase() === uInput && 
        String(u.password ?? "").trim() === pInput && 
        u.status !== "Inactive"
      );
    }

    if (match) {
      const isAdmin = match.role === "Admin" || (match.username || "").trim().toLowerCase() === "admin";
      if (!isAdmin && Array.isArray(match.allowedCompanies) && match.allowedCompanies.length > 0) {
        if (!match.allowedCompanies.map(String).includes(compIdStr)) {
          return null;
        }
      }
      return match;
    }

    // Fallback: check main company legacy admin credentials
    const comp = this.getRegisteredCompanies().find(c => String(c.id) === compIdStr);
    if (comp && comp.username && (comp.username || "").trim().toLowerCase() === uInput && String(comp.password ?? "").trim() === pInput) {
      return {
        id: "USR-LEGACY-ADMIN",
        username: comp.username,
        password: comp.password,
        fullName: "Administrator",
        role: "Admin",
        status: "Active",
        allowedCompanies: this.getRegisteredCompanies().map(c => String(c.id))
      };
    }
    return null;
  }

  getActiveCompanyId() {
    const val = localStorage.getItem("erp_active_company_id");
    if (val && val !== "undefined" && val !== "null") return val;
    const registered = this.getRegisteredCompanies();
    if (Array.isArray(registered) && registered.length > 0 && registered[0].id) {
      const fallbackId = String(registered[0].id);
      try {
        localStorage.setItem("erp_active_company_id", fallbackId);
      } catch (e) {}
      return fallbackId;
    }
    return null;
  }

  setActiveCompanyId(companyId) {
    if (companyId) {
      localStorage.setItem("erp_active_company_id", companyId);
      this.resetToCurrentFinancialYear(companyId);
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

  calculateOneYearEnd(startDateStr) {
    if (!startDateStr) return "";
    const parts = startDateStr.split("-").map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) return startDateStr;
    const endDateObj = new Date(parts[0] + 1, parts[1] - 1, parts[2] - 1);
    const y = endDateObj.getFullYear();
    const m = String(endDateObj.getMonth() + 1).padStart(2, '0');
    const d = String(endDateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async deleteFinancialYear(companyId, fyId) {
    const currentUser = this.getCurrentUser();
    const isAdmin = !currentUser || currentUser.role === "Admin" || currentUser.role === "admin";
    if (!isAdmin) {
      return { success: false, message: "Access Restricted! Only Admin users can delete financial years." };
    }

    // Flexible argument ordering if passed as (fyId, companyId)
    let targetCompanyId = companyId;
    let targetFyId = fyId;
    const companies = this.getRegisteredCompanies();
    let company = companies.find(c => String(c.id) === String(targetCompanyId));

    if (!company) {
      company = companies.find(c => String(c.id) === String(targetFyId));
      if (company) {
        // Swapped arguments
        targetCompanyId = fyId;
        targetFyId = companyId;
      } else {
        targetCompanyId = this.getActiveCompanyId();
        company = companies.find(c => String(c.id) === String(targetCompanyId));
      }
    }

    if (!company) return { success: false, message: "Company not found." };

    company.financialYears = company.financialYears || [];
    if (company.financialYears.length <= 1) {
      return { success: false, message: "Cannot delete the only financial year. A company must have at least one financial year." };
    }

    const fyIndex = company.financialYears.findIndex(f => String(f.id) === String(targetFyId));
    if (fyIndex === -1) {
      return { success: false, message: "Financial Year not found in company." };
    }

    const isDeletingLatest = fyIndex === company.financialYears.length - 1;
    const deletedFy = company.financialYears[fyIndex];

    // Remove deleted FY from company.financialYears array
    company.financialYears.splice(fyIndex, 1);

    // If deleting the latest/current FY, promote the remaining latest FY to be "Current F.Y"
    // and auto-extend its endDate to complete 1 full year from its startDate
    if (isDeletingLatest && company.financialYears.length > 0) {
      const promotedFy = company.financialYears[company.financialYears.length - 1];
      if (promotedFy) {
        const start = promotedFy.startDate || company.financialYearStarts || "2026-04-01";
        promotedFy.endDate = this.calculateOneYearEnd(start);
        promotedFy.name = "Current F.Y";
        company.financialYearStarts = start;
        company.financialYearEnds = promotedFy.endDate;
      }
    }

    // If targetFyId was active, switch to latest available FY
    if (String(this.getActiveFyId()) === String(targetFyId)) {
      const remainingFy = company.financialYears[company.financialYears.length - 1];
      this.setActiveFyId(remainingFy ? remainingFy.id : "default");
    }

    // Save updated registered companies list to localStorage & Supabase FIRST
    await this.saveRegisteredCompanies(companies);

    // Remove deleted FY's local storage key
    const deletedLsKey = `erp_company_data_${targetCompanyId}${targetFyId === 'default' ? '' : '_' + targetFyId}`;
    localStorage.removeItem(deletedLsKey);

    // Call server to delete file from disk, promote previous FY, and update companies.json
    const deleteApiUrl = this.getBackendApiUrl(`/api/data/${targetCompanyId}/${targetFyId}`);

    let extraMsg = "";
    if (deleteApiUrl) {
      try {
        const resp = await fetch(deleteApiUrl, {
          method: "DELETE",
          signal: getTimeoutSignal(1500)
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.renamedFiles && data.renamedFiles.length > 0) {
            extraMsg = " Previous FY has been renamed to 'Current F.Y' and database file updated.";
          }
        }
      } catch (e) {
        console.error("Server financial year delete failed:", e);
      }
    }

    // Delete records from Appwrite Cloud Database
    try {
      await this.purgeAppwriteCompanyData(targetCompanyId, targetFyId);
      const fyDocId = `fy_${targetCompanyId}_${targetFyId}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, "financial_years", fyDocId).catch(e => {});
    } catch (e) {}

    // Reload companies state from server with a safety timeout
    try {
      await Promise.race([
        this.initFromServer(),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (e) {
      this.loadState();
      this.notifyListeners();
    }

    return { success: true, message: `Financial year '${deletedFy.name}' deleted successfully.${extraMsg}` };
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

    // 3. Purge all company records from Appwrite Cloud Database
    try {
      const compDocId = `comp_${targetCompanyId}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, "companies", compDocId).catch(e => {});
      const allCols = ["financial_years", "materials", "contacts", "invoices", "purchases", "transactions", "ledgers", "sales_orders", "sales_returns", "purchase_returns", "company_settings"];
      for (const col of allCols) {
        try {
          const res = await appwriteDatabases.listDocuments(APPWRITE_DATABASE_ID, col, [
            Query.equal("company_id", String(targetCompanyId)),
            Query.limit(100)
          ]);
          if (res && res.documents) {
            await Promise.all(res.documents.map(d => appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, col, d.$id).catch(e => {})));
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Appwrite company delete error:", e);
    }

    // 4. Call server to backup and delete from disk
    let serverRes = null;
    try {
      const apiUrl = this.getBackendApiUrl(`/api/companies/${targetCompanyId}`);
      if (apiUrl) {
        const res = await fetch(apiUrl, { method: "DELETE" });
        serverRes = await res.json();
      }
    } catch (err) {
      console.warn("Server company delete request failed:", err);
    }

    // 5. If current active company was deleted, clear active company
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

  async getDeletedCompanies() {
    try {
      const apiUrl = this.getBackendApiUrl("/api/deleted-companies");
      if (!apiUrl) return [];
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("Failed to fetch deleted companies:", err);
      return [];
    }
  }

  async restoreCompany(companyId, backupFolder) {
    try {
      const apiUrl = this.getBackendApiUrl("/api/restore-company");
      if (!apiUrl) throw new Error("Local backend server is not reachable in static cloud mode.");
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, backupFolder })
      });

      const serverRes = await res.json();
      if (!res.ok || !serverRes.success) {
        throw new Error(serverRes.error || serverRes.message || "Failed to restore company.");
      }

      if (serverRes.company) {
        const companies = this.getRegisteredCompanies();
        const existingIdx = companies.findIndex(c => String(c.id) === String(serverRes.company.id));
        if (existingIdx !== -1) {
          companies[existingIdx] = serverRes.company;
        } else {
          companies.push(serverRes.company);
        }
        localStorage.setItem("erp_companies", JSON.stringify(companies));
        this.setActiveCompanyId(serverRes.company.id);

        const restoredFyId = this.getActiveFyId() || "default";
        const dataUrl = this.getBackendApiUrl(`/api/data/${serverRes.company.id}/${restoredFyId}`);
        if (dataUrl) {
          try {
            const dataRes = await fetch(dataUrl);
            if (dataRes.ok) {
              const restoredData = await dataRes.json();
              const lsKey = `erp_company_data_${serverRes.company.id}${restoredFyId === 'default' ? '' : '_' + restoredFyId}`;
              localStorage.setItem(lsKey, JSON.stringify(restoredData));
            }
          } catch (e) {
            console.error("Failed to fetch restored company data from server:", e);
          }
        }

        this._serverLoadedData = null;
        this.loadState();
      }

      this.notifyListeners();
      return serverRes;
    } catch (err) {
      console.error("Server company restore failed:", err);
      throw err;
    }
  }

  async createAutoServerBackup(companyId, fyId) {
    const activeId = companyId || this.getActiveCompanyId();
    const activeFyId = fyId || this.getActiveFyId();
    if (!activeId) return { success: false, message: "No active company selected." };
    try {
      const apiUrl = this.getBackendApiUrl(`/api/backup/${activeId}/${activeFyId}`);
      if (!apiUrl) return { success: false, message: "Local backend server not reachable in cloud mode." };
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create server backup.");
      }
      return data;
    } catch (err) {
      console.error("Server auto backup failed:", err);
      return { success: false, message: err.message };
    }
  }

  async getServerBackupFiles(companyId) {
    const activeId = companyId || this.getActiveCompanyId();
    if (!activeId) return [];
    try {
      const apiUrl = this.getBackendApiUrl(`/api/backups/${activeId}`);
      if (!apiUrl) return [];
      const res = await fetch(apiUrl, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error("Failed to fetch server backup files:", err);
      return [];
    }
  }

  async restoreServerBackupFile(fileName, companyId, fyId) {
    const activeId = companyId || this.getActiveCompanyId();
    const activeFyId = fyId || this.getActiveFyId();
    if (!activeId || !fileName) {
      return { success: false, message: "Company ID and backup file name are required." };
    }
    try {
      const apiUrl = this.getBackendApiUrl(`/api/restore/${activeId}/${activeFyId}`);
      if (!apiUrl) return { success: false, message: "Local backend server not reachable in cloud mode." };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify({ file: fileName })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to restore backup file on server.");
      }

      // Fetch freshly restored database content from server
      const dataUrl = this.getBackendApiUrl(`/api/data/${activeId}/${activeFyId}`);
      if (!dataUrl) {
        throw new Error("No data URL available to fetch restored data.");
      }

      const dataRes = await fetch(dataUrl, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      if (!dataRes.ok) {
        throw new Error("Backup file copied on server, but failed to fetch restored data.");
      }

      const restoredDb = await dataRes.json();
      return await this.importDatabaseState(restoredDb);
    } catch (err) {
      console.error("Failed to restore server backup file:", err);
      return { success: false, message: err.message };
    }
  }

  async purgeAppwriteCompanyData(companyId, fyId) {
    if (!companyId) return;
    const cleanActiveId = String(companyId);
    const targetFyId = String(fyId || "default");
    const collections = [
      "materials", "contacts", "invoices", "purchases",
      "transactions", "ledgers", "sales_orders",
      "sales_returns", "purchase_returns", "company_settings"
    ];

    try {
      await Promise.all(collections.map(async col => {
        try {
          const res = await appwriteDatabases.listDocuments(
            APPWRITE_DATABASE_ID,
            col,
            [
              Query.equal("company_id", cleanActiveId),
              Query.equal("fy_id", targetFyId),
              Query.limit(100)
            ]
          );
          if (res && res.documents) {
            await Promise.all(res.documents.map(d =>
              appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, col, d.$id).catch(e => {})
            ));
          }
        } catch (e) {}
      }));
    } catch (e) {
      console.warn("Appwrite purge failed:", e);
    }
  }

  async purgeSupabaseCompanyData(companyId, fyId) {
    return this.purgeAppwriteCompanyData(companyId, fyId);
  }

  async importDatabaseState(dataObj) {
    if (!dataObj || typeof dataObj !== "object") {
      return { success: false, message: "Invalid database JSON backup file." };
    }

    this._isRestoring = true;
    try {
      // Determine payload root (handles exported full backup objects vs direct table dumps)
      const payload = (dataObj.data && typeof dataObj.data === "object" && !Array.isArray(dataObj.data))
        ? dataObj.data
        : dataObj;

      let targetCompany = dataObj.company || dataObj.companyProfile || payload.company || payload.companyProfile || null;
      let targetCompanyId = dataObj.companyId || payload.companyId || (targetCompany ? targetCompany.id : null) || this.getActiveCompanyId() || ("comp_" + Date.now());
      let targetCompanyName = (targetCompany ? targetCompany.name : null) || dataObj.companyName || payload.companyName || "Restored Company";

      const companies = this.getRegisteredCompanies();
      let company = companies.find(c => String(c.id) === String(targetCompanyId));

      if (!company) {
        company = targetCompany || {
          id: targetCompanyId,
          name: targetCompanyName,
          financialYearStarts: dataObj.financialYearStarts || payload.financialYearStarts || "2026-04-01",
          financialYearEnds: dataObj.financialYearEnds || payload.financialYearEnds || "2027-03-31",
          financialYears: dataObj.financialYears || payload.financialYears || [
            { id: "default", name: "Current F.Y", startDate: "2026-04-01", endDate: "2027-03-31" }
          ]
        };
        companies.push(company);
        this.saveRegisteredCompanies(companies);
      } else if (targetCompany && typeof targetCompany === "object") {
        Object.assign(company, targetCompany);
        this.saveRegisteredCompanies(companies);
      }

      const fyId = dataObj.fyId || payload.fyId || this.getActiveFyId() || "default";
      const lsKey = `erp_company_data_${targetCompanyId}${fyId === "default" ? "" : "_" + fyId}`;

      const dbData = {
        materials: payload.materials || [],
        contacts: payload.contacts || [],
        ledgers: payload.ledgers || [],
        invoices: payload.invoices || [],
        transactions: payload.transactions || [],
        purchases: payload.purchases || [],
        salesOrders: payload.salesOrders || [],
        salesReturns: payload.salesReturns || [],
        purchaseReturns: payload.purchaseReturns || [],
        conversions: payload.conversions || [],
        stockAdjustments: payload.stockAdjustments || [],
        accountGroups: payload.accountGroups || (this.accountGroups && this.accountGroups.length > 0 ? this.accountGroups : []),
        units: payload.units || (this.units && this.units.length > 0 ? this.units : []),
        seriesMaster: payload.seriesMaster || [],
        options: payload.options || this.options || {},
        influencers: payload.influencers || [],
        hsnCodes: payload.hsnCodes || [],
        productGroups: payload.productGroups || [],
        companies: payload.companies || [],
        categories: payload.categories || [],
        subCategories: payload.subCategories || [],
        productNames: payload.productNames || []
      };

      // 1. Purge Supabase Cloud Database first to eliminate un-restored newer records
      await this.purgeSupabaseCompanyData(targetCompanyId, fyId);

      // 2. Overwrite localStorage & memory cache
      localStorage.setItem(lsKey, JSON.stringify(dbData));
      this._serverLoadedData = dbData;

      // 3. Directly assign memory properties from dbData
      this.materials = dbData.materials;
      this.contacts = dbData.contacts;
      this.ledgers = dbData.ledgers;
      this.invoices = dbData.invoices;
      this.transactions = dbData.transactions;
      this.purchases = dbData.purchases;
      this.salesOrders = dbData.salesOrders;
      this.salesReturns = dbData.salesReturns;
      this.purchaseReturns = dbData.purchaseReturns;
      this.conversions = dbData.conversions;
      this.stockAdjustments = dbData.stockAdjustments;
      if (Array.isArray(dbData.accountGroups) && dbData.accountGroups.length > 0) this.accountGroups = dbData.accountGroups;
      if (Array.isArray(dbData.units) && dbData.units.length > 0) this.units = dbData.units;
      if (Array.isArray(dbData.seriesMaster)) this.seriesMaster = dbData.seriesMaster;

      // 4. Overwrite local Express server disk file with isRestore=true
      const saveUrl = this.getBackendApiUrl(`/api/data/${targetCompanyId}/${fyId}?isRestore=true`);
      if (saveUrl) {
        try {
          await fetch(saveUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...dbData, _isRestore: true })
          });
        } catch (e) {
          console.error("Syncing imported database state to server failed:", e);
        }
      }

      this.setActiveCompanyId(targetCompanyId);
      this.setActiveFyId(fyId);
      this.saveState(false, true);
      this.notifyListeners();

      return { success: true, message: `Successfully restored database for '${company.name}' (ID: ${company.id}).` };
    } finally {
      this._isRestoring = false;
    }
  }

  async backupToCustomFolder(targetPath) {
    if (targetPath) {
      this.options = this.options || {};
      this.options.googleDriveBackupPath = targetPath;
      this.saveState();
    }

    const downloadClientBackup = () => {
      const activeId = this.getActiveCompanyId();
      const company = (this.getRegisteredCompanies() || []).find(c => String(c.id) === String(activeId)) || { name: "METRO_AGENCIES" };
      const compName = (company.name || "METRO_AGENCIES").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${compName}_Backup_${new Date().toISOString().split("T")[0]}.json`;

      const fullData = {
        _exportDate: new Date().toISOString(),
        company: company,
        materials: this.materials || [],
        contacts: this.contacts || [],
        invoices: this.invoices || [],
        purchases: this.purchases || [],
        salesOrders: this.salesOrders || [],
        salesReturns: this.salesReturns || [],
        purchaseReturns: this.purchaseReturns || [],
        transactions: this.transactions || [],
        ledgers: this.ledgers || []
      };

      const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    try {
      const apiUrl = this.getBackendApiUrl("/api/backup-custom-drive");
      if (!apiUrl) {
        downloadClientBackup();
        return { 
          success: true, 
          message: "Database snapshot exported and downloaded to your computer as a JSON file.", 
          backupPath: "Downloads Folder" 
        };
      }

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify({ targetPath })
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.includes("application/json")) {
        downloadClientBackup();
        return { 
          success: true, 
          message: "Database snapshot exported and downloaded to your computer as a JSON file.", 
          backupPath: "Downloads Folder" 
        };
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        downloadClientBackup();
        return { 
          success: true, 
          message: "Database snapshot downloaded directly to your computer as a JSON file.", 
          backupPath: "Downloads Folder" 
        };
      }

      downloadClientBackup();
      return {
        success: true,
        message: data.message + " (Also downloaded to your computer)",
        backupPath: data.backupPath,
        filesCopied: data.filesCopied
      };
    } catch (err) {
      downloadClientBackup();
      return { 
        success: true, 
        message: "Database backup downloaded directly to your computer as a JSON file.", 
        backupPath: "Downloads Folder" 
      };
    }
  }

  createLocalDatabaseSnapshot(label = "Manual Point-in-Time Backup") {
    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return { success: false, message: "No active company selected." };

    const company = this.getRegisteredCompanies().find(c => String(c.id) === String(activeCompanyId));
    const companyName = company ? company.name : "Company";
    const fyId = this.getActiveFyId() || "default";

    const now = new Date();
    const ts = now.getTime();
    const dateFormatted = now.toLocaleDateString("en-IN") + " " + now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const snapshotKey = `erp_snapshot_${activeCompanyId}_${ts}`;

    const snapshotData = {
      type: "ERP_POINT_IN_TIME_SNAPSHOT",
      snapshotKey,
      timestamp: ts,
      dateFormatted,
      label,
      companyId: activeCompanyId,
      companyName,
      fyId,
      company,
      data: {
        materials: JSON.parse(JSON.stringify(this.materials || [])),
        contacts: JSON.parse(JSON.stringify(this.contacts || [])),
        ledgers: JSON.parse(JSON.stringify(this.ledgers || [])),
        invoices: JSON.parse(JSON.stringify(this.invoices || [])),
        transactions: JSON.parse(JSON.stringify(this.transactions || [])),
        purchases: JSON.parse(JSON.stringify(this.purchases || [])),
        salesReturns: JSON.parse(JSON.stringify(this.salesReturns || [])),
        purchaseReturns: JSON.parse(JSON.stringify(this.purchaseReturns || [])),
        conversions: JSON.parse(JSON.stringify(this.conversions || [])),
        stockAdjustments: JSON.parse(JSON.stringify(this.stockAdjustments || [])),
        accountGroups: this.accountGroups,
        units: this.units,
        options: this.options,
        seriesMaster: this.seriesMaster
      }
    };

    try {
      localStorage.setItem(snapshotKey, JSON.stringify(snapshotData));

      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`erp_snapshot_${activeCompanyId}_`)) {
          allKeys.push(k);
        }
      }
      allKeys.sort();
      while (allKeys.length > 15) {
        const oldestKey = allKeys.shift();
        localStorage.removeItem(oldestKey);
      }

      return {
        success: true,
        snapshotKey,
        dateFormatted,
        message: `Snapshot '${label}' created successfully for ${companyName} (${dateFormatted}).`
      };
    } catch (e) {
      console.error("Failed to save local database snapshot:", e);
      return { success: false, message: "Storage quota exceeded or failed to save snapshot." };
    }
  }

  getLocalSnapshots() {
    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return [];

    const snapshots = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`erp_snapshot_${activeCompanyId}_`)) {
        try {
          const item = JSON.parse(localStorage.getItem(k));
          if (item && item.timestamp) {
            snapshots.push(item);
          }
        } catch (e) {}
      }
    }
    snapshots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return snapshots;
  }

  async restoreLocalDatabaseSnapshot(snapshotKey) {
    if (!snapshotKey) return { success: false, message: "Snapshot key is required." };
    const raw = localStorage.getItem(snapshotKey);
    if (!raw) return { success: false, message: "Snapshot data not found in local storage." };

    try {
      const snapshot = JSON.parse(raw);
      const res = await this.importDatabaseState(snapshot.data ? {
        ...snapshot.data,
        company: snapshot.company,
        companyId: snapshot.companyId,
        companyName: snapshot.companyName,
        fyId: snapshot.fyId
      } : snapshot);

      return {
        success: true,
        message: `Successfully rolled back database to condition at ${snapshot.dateFormatted} (${snapshot.label || 'Snapshot'}).`
      };
    } catch (e) {
      console.error("Failed to restore snapshot:", e);
      return { success: false, message: `Failed to restore snapshot: ${e.message}` };
    }
  }

  exportFullCompanyBackupJson() {
    const activeCompanyId = this.getActiveCompanyId();
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(activeCompanyId));
    const companyName = company ? company.name : "Company";
    const fyId = this.getActiveFyId() || "default";

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }).replace(/:/g, "-").replace(/\s+/g, "");

    const backupObj = {
      type: "ERP_FULL_COMPANY_BACKUP",
      backupVersion: "2.0",
      backupTimestamp: now.toISOString(),
      backupDateStr: now.toLocaleString("en-IN"),
      companyId: activeCompanyId,
      companyName,
      fyId,
      company,
      financialYears: company ? company.financialYears : [],
      data: {
        materials: this.materials || [],
        contacts: this.contacts || [],
        ledgers: this.ledgers || [],
        invoices: this.invoices || [],
        transactions: this.transactions || [],
        purchases: this.purchases || [],
        salesReturns: this.salesReturns || [],
        purchaseReturns: this.purchaseReturns || [],
        conversions: this.conversions || [],
        stockAdjustments: this.stockAdjustments || [],
        accountGroups: this.accountGroups,
        units: this.units,
        options: this.options,
        seriesMaster: this.seriesMaster,
        hsnCodes: this.hsnCodes,
        influencers: this.influencers
      }
    };

    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanCompName = companyName.replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `Backup_${cleanCompName}_${dateStr}_${timeStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, fileName: a.download, message: `Backup downloaded: ${a.download}` };
  }

  updateFinancialYearDates(companyId, fyId, newStartDate, newEndDate, newName) {
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
      if (newName && newName.trim()) {
        fy.name = newName.trim();
      } else if (fy.startDate && fy.endDate) {
        const startFormatted = fy.startDate.split("-").reverse().join("/");
        const endFormatted = fy.endDate.split("-").reverse().join("/");
        fy.name = `${startFormatted} to ${endFormatted}`;
      }
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
          name: newName || "Current F.Y",
          startDate: newStartDate || "2026-04-01",
          endDate: newEndDate || "2027-03-31"
        });
      }
    }

    this.saveRegisteredCompanies(companies);
    this.notifyListeners();

    return { success: true, message: "Financial year configuration updated successfully." };
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
    const rawDate = localStorage.getItem("erp_login_date") || new Date().toISOString().split("T")[0];
    const fyStart = this.getActiveFinancialYearStartDate();
    const fyEnd = this.getActiveFinancialYearEndDate();
    if (fyStart && rawDate < fyStart) return fyStart;
    if (fyEnd && rawDate > fyEnd) return fyEnd;
    return rawDate;
  }

  setLoginDate(date) {
    // Ensure login date is within active financial year start and end dates
    const fyStart = this.getActiveFinancialYearStartDate();
    const fyEnd = this.getActiveFinancialYearEndDate();
    if (fyStart && date < fyStart) {
      date = fyStart;
    }
    if (fyEnd && date > fyEnd) {
      date = fyEnd;
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
    const apiUrl = this.getBackendApiUrl(`/api/data/${newId}/default`);
    if (apiUrl) {
      fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seedState)
      }).catch(e => console.error("Immediate company seed sync failed:", e));
    }

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

      // Preserve all transactions - do not delete duplicates automatically
    });

    this.invoices.forEach(inv => {
      if (!inv) return;
      // Preserve all transactions - do not delete duplicates automatically
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
      if (!pr || pr.isCancelled || pr.isCanceled || pr.status === "CANCELLED" || pr.status === "cancelled") return;
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
      if (!sr || sr.isCancelled || sr.isCanceled || sr.status === "CANCELLED" || sr.status === "cancelled") return;
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

    inv.id = sVoucherNo;
    inv.voucherNo = sVoucherNo;
    if (!inv.refNo) inv.refNo = sVoucherNo;

    if (matchingTxs.length > 0) {
      const bestTx = matchingTxs.find(t => t.entries && t.entries.length > 2) ||
                     matchingTxs.find(t => t.voucherType === "SALE" || t.id === sVoucherNo || t.voucherId === sVoucherNo) ||
                     matchingTxs[0];

      bestTx.id = sVoucherNo;
      bestTx.voucherId = sVoucherNo;
      bestTx.voucherType = "SALE";
      bestTx.voucherNo = sVoucherNo;
      bestTx.date = inv.date;
      bestTx.reference = sVoucherNo;
      bestTx.description = inv.narration || "";
      bestTx.siteName = inv.siteName || "";
      bestTx.entries = salesEntries;

      // Preserve all transactions - do not delete duplicates automatically
    } else {
      this.transactions.push({
        id: sVoucherNo,
        voucherId: sVoucherNo,
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

    // 0a. Clean null/undefined invoices
    if (this.invoices && Array.isArray(this.invoices)) {
      this.invoices = this.invoices.filter(Boolean);
    }

    // 0b. Clean null/undefined purchases
    if (this.purchases && Array.isArray(this.purchases)) {
      this.purchases = this.purchases.filter(Boolean);
    }

    // Preserve all transactions and ensure each has a unique ID (never delete transactions automatically)
    const seenTxIds = new Set();
    this.transactions.forEach(tx => {
      if (!tx) return;
      const tid = String(tx.id || "").trim();
      if (!tid || seenTxIds.has(tid)) {
        let newId = this.generateNextTxId();
        while (seenTxIds.has(newId) || this.transactions.some(t => t !== tx && t && t.id === newId)) {
          newId = this.generateNextTxId();
        }
        tx.id = newId;
        stateChanged = true;
      }
      seenTxIds.add(tx.id);
    });

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
      const totalDiscount = parseFloat(pur.totalDiscount !== undefined ? pur.totalDiscount : (pur.discountAmount || pur.discount || 0)) || 0;
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

    pur.id = pVoucherNo;
    pur.voucherNo = pVoucherNo;
    if (!pur.refNo) pur.refNo = pVoucherNo;

    if (matchingTxs.length > 0) {
      const bestTx = matchingTxs.find(t => t.entries && t.entries.length > 2) ||
                     matchingTxs.find(t => t.voucherType === "PUR" || t.id === pVoucherNo || t.voucherId === pVoucherNo) ||
                     matchingTxs[0];

      bestTx.id = pVoucherNo;
      bestTx.voucherId = pVoucherNo;
      bestTx.voucherType = "PUR";
      bestTx.voucherNo = pVoucherNo;
      bestTx.date = pur.date || new Date().toISOString().split("T")[0];
      bestTx.reference = pVoucherNo;
      bestTx.description = pur.narration || "";
      bestTx.siteName = pur.siteName || "";
      bestTx.entries = purchaseEntries;

      // Preserve all transactions - do not delete duplicates automatically
    } else {
      this.transactions.push({
        id: pVoucherNo,
        voucherId: pVoucherNo,
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

    // 3. Align all document and transaction IDs with their series voucher numbers
    (this.invoices || []).forEach(inv => {
      if (!inv) return;
      const vno = String(inv.voucherNo || inv.refNo || inv.id || "").trim();
      if (vno) {
        if (inv.id !== vno) { inv.id = vno; changed = true; }
        if (inv.voucherNo !== vno) { inv.voucherNo = vno; changed = true; }
        if (!inv.refNo) { inv.refNo = vno; changed = true; }
      }
    });

    (this.purchases || []).forEach(pur => {
      if (!pur) return;
      const vno = String(pur.voucherNo || pur.refNo || pur.id || "").trim();
      if (vno) {
        if (pur.id !== vno) { pur.id = vno; changed = true; }
        if (pur.voucherNo !== vno) { pur.voucherNo = vno; changed = true; }
        if (!pur.refNo) { pur.refNo = vno; changed = true; }
      }
    });

    (this.transactions || []).forEach(t => {
      if (!t) return;
      const ref = String(t.reference || "").trim();
      if (ref && !ref.includes("Stock Adj") && ref !== "JV") {
        if (ref.endsWith(" COGS")) {
          const baseDoc = ref.replace(/ COGS$/i, "").trim();
          const targetId = `${baseDoc}-COGS`;
          if (t.id !== targetId) { t.id = targetId; changed = true; }
          if (t.voucherId !== baseDoc) { t.voucherId = baseDoc; changed = true; }
          if (t.voucherNo !== baseDoc) { t.voucherNo = baseDoc; changed = true; }
        } else {
          if (t.id !== ref) { t.id = ref; changed = true; }
          if (t.voucherId !== ref) { t.voucherId = ref; changed = true; }
          if (t.voucherNo !== ref) { t.voucherNo = ref; changed = true; }
        }
      }
    });

    // 4. Synchronize all seriesMaster counters to actual max used + 1
    (this.seriesMaster || []).forEach(s => {
      if (!s || !s.prefix) return;
      const prefixUpper = String(s.prefix).toUpperCase();
      let maxNum = (parseInt(s.startingNumber) || 1) - 1;

      if (s.txType === "Sales") {
        (this.invoices || []).forEach(inv => {
          if (!inv || inv.isCancelled || inv.isCanceled || String(inv.status).toUpperCase() === "CANCELLED") return;
          const vno = String(inv.voucherNo || inv.refNo || inv.id || "").trim();
          if (vno.toUpperCase().startsWith(prefixUpper)) {
            const numPart = vno.substring(s.prefix.length);
            if (/^\d+$/.test(numPart)) {
              const n = parseInt(numPart, 10);
              if (!isNaN(n) && n > maxNum) maxNum = n;
            }
          }
        });
      } else if (s.txType === "Purchase") {
        (this.purchases || []).forEach(pur => {
          if (!pur || pur.isCancelled || pur.isCanceled || String(pur.status).toUpperCase() === "CANCELLED") return;
          const vno = String(pur.voucherNo || pur.refNo || pur.id || "").trim();
          if (vno.toUpperCase().startsWith(prefixUpper)) {
            const numPart = vno.substring(s.prefix.length);
            if (/^\d+$/.test(numPart)) {
              const n = parseInt(numPart, 10);
              if (!isNaN(n) && n > maxNum) maxNum = n;
            }
          }
        });
      }

      const expectedNext = maxNum + 1;
      if (s.currentNumber !== expectedNext) {
        s.currentNumber = expectedNext;
        changed = true;
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

    const seenKeys = new Set();
    const uniqueInvoices = [];

    this.invoices.forEach(inv => {
      if (!inv) return;
      const vKey = String(inv.voucherNo || inv.refNo || inv.id || "").trim().toUpperCase();
      if (!vKey) return;

      if (!seenKeys.has(vKey)) {
        seenKeys.add(vKey);
        uniqueInvoices.push(inv);
      } else {
        changed = true;
      }
    });

    if (changed) {
      this.invoices = uniqueInvoices;
    }

    const extractNum = (str) => {
      const m = String(str || "").match(/(\d+)/g);
      return m ? parseInt(m[m.length - 1], 10) : 0;
    };

    this.invoices.sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      const numA = extractNum(a.voucherNo || a.refNo || a.id);
      const numB = extractNum(b.voucherNo || b.refNo || b.id);
      if (numA !== numB) return numA - numB;
      const dateA = toIsoDateStr(a.date);
      const dateB = toIsoDateStr(b.date);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return String(a.voucherNo || a.id || "").localeCompare(String(b.voucherNo || b.id || ""));
    });

    if (changed && shouldSave) {
      this.saveState(true);
    }
  }

  deduplicateAndEnforceUniquePurchases(shouldSave = true) {
    if (!this.purchases || !Array.isArray(this.purchases)) return;
    let changed = false;

    const seenKeys = new Set();
    const uniquePurchases = [];

    this.purchases.forEach(pur => {
      if (!pur) return;
      const vKey = String(pur.voucherNo || pur.refNo || pur.id || "").trim().toUpperCase();
      if (!vKey) return;

      if (!seenKeys.has(vKey)) {
        seenKeys.add(vKey);
        uniquePurchases.push(pur);
      } else {
        changed = true;
      }
    });

    if (changed) {
      this.purchases = uniquePurchases;
    }

    const extractNum = (str) => {
      const m = String(str || "").match(/(\d+)/g);
      return m ? parseInt(m[m.length - 1], 10) : 0;
    };

    this.purchases.sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      const numA = extractNum(a.voucherNo || a.refNo || a.id);
      const numB = extractNum(b.voucherNo || b.refNo || b.id);
      if (numA !== numB) return numA - numB;
      const dateA = toIsoDateStr(a.date);
      const dateB = toIsoDateStr(b.date);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return String(a.voucherNo || a.id || "").localeCompare(String(b.voucherNo || b.id || ""));
    });

    if (changed && shouldSave) {
      this.saveState(true);
    }
  }

  ensureStandardBaseLedgers() {
    if (!this.ledgers) this.ledgers = [];
    const baseCodes = ["L018","L019","L020","L021","L022","L023","L024","L025"];
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

      const isCogs = refUpper.includes("COGS") || descUpper.includes("COST OF GOODS");
      if (isCogs) {
        tx.entries.forEach(e => {
          if (e.accountId === "L017" || e.accountId === "4100") {
            e.accountId = "1200";
            changed = true;
          }
        });
        return;
      }

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

      const fyId = this.getActiveFyId();
      const lsKey = `erp_company_data_${activeId}${fyId === 'default' ? '' : '_' + fyId}`;
      let parsed = null;
      try {
        const stored = localStorage.getItem(lsKey);
        if (stored) {
          parsed = JSON.parse(stored);
        }
      } catch (e) {}

      if (this._serverLoadedData && typeof this._serverLoadedData === "object" && !this._isRestoring) {
        const serverFyId = this._serverLoadedData._fyId || fyId;
        if (!serverFyId || String(serverFyId) === String(fyId)) {
          parsed = parsed ? { ...parsed, ...this._serverLoadedData } : { ...this._serverLoadedData };
          [
            "materials", "contacts", "ledgers", "accountGroups", "salesOrders",
            "salesReturns", "purchaseReturns", "purchases", "invoices", "transactions",
            "units", "categories", "subCategories", "productGroups", "productNames",
            "seriesMaster", "gstMaster", "options", "influencers", "influencerRedemptions", "loyaltyPrograms"
          ].forEach(key => {
            if (Array.isArray(this._serverLoadedData[key]) && this._serverLoadedData[key].length > 0) {
              parsed[key] = this._serverLoadedData[key];
            } else if (this._serverLoadedData[key] && typeof this._serverLoadedData[key] === "object") {
              parsed[key] = this._serverLoadedData[key];
            }
          });
        }
      }

      parsed = parsed || {};

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
      initialAccountGroups.forEach(ig => {
        if (!this.accountGroups.some(g => String(g.name || "").trim().toUpperCase() === String(ig.name || "").trim().toUpperCase())) {
          this.accountGroups.push({ ...ig, isDefault: true });
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
          "DEPOSITS": "CURRENT ASSETS",
          "DEPOSITS (ASSETS)": "CURRENT ASSETS",
          "OTHER CURRENT ASSETS": "CURRENT ASSETS",
          "ADAVANCE TO SUPPLIER": "CURRENT ASSETS",
          "LOANS & ADVANCES(ASSET)": "CURRENT ASSETS",
          "OUTSTANDING LIABILITIES & PROVISIONS": "CURRENT LIABILITIES",
          "PROVISIONS": "CURRENT LIABILITIES",
          "ADJUSTMENTS": "CURRENT LIABILITIES",
          "ADJUSTMENT": "CURRENT LIABILITIES",
          "AJUSTMENTS": "CURRENT LIABILITIES",
          "AJUSTMENT": "CURRENT LIABILITIES"
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

        // Ensure default ledgers exist (excluding L016 Purchase A/C & L017 Sales A/C)
        const defaultLedgers = [
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
        this.alignVoucherPrefixesWithSeries();
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
        this.normalizeAllDates();
        this.saveState();
        if (!skipNotify) {
          this.notifyListeners();
        }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }

  normalizeAllDates() {
    let changed = false;
    const normItem = (item) => {
      if (!item) return;
      if (item.date) {
        const iso = toIsoDateStr(item.date);
        if (iso && iso !== item.date) {
          item.date = iso;
          changed = true;
        }
      }
      if (item.billDate) {
        const iso = toIsoDateStr(item.billDate);
        if (iso && iso !== item.billDate) {
          item.billDate = iso;
          changed = true;
        }
      }
      if (item.invoiceDate) {
        const iso = toIsoDateStr(item.invoiceDate);
        if (iso && iso !== item.invoiceDate) {
          item.invoiceDate = iso;
          changed = true;
        }
      }
    };

    (this.invoices || []).forEach(normItem);
    (this.purchases || []).forEach(normItem);
    (this.salesReturns || []).forEach(normItem);
    (this.purchaseReturns || []).forEach(normItem);
    (this.transactions || []).forEach(normItem);

    if (changed) {
      this.invalidateBalancesCache();
    }
    return changed;
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
      
      // Reset stock on all batches to their openingStock & RENAME batchNo to equal landingCost
      const renamedBatches = [];
      m.batches.forEach(b => {
        b.stock = parseFloat(b.openingStock) || 0;
        const lCost = parseFloat(b.landingCost);
        const bNum = parseFloat(b.batchNo);
        const cost = !isNaN(lCost) && lCost > 0 ? lCost : (!isNaN(bNum) && bNum > 0 ? bNum : (parseFloat(m.landingCost) || 0));
        b.landingCost = cost;
        b.batchNo = formatRateValue(cost) || String(cost);

        const existing = renamedBatches.find(rb => String(rb.batchNo).trim() === String(b.batchNo).trim());
        if (existing) {
          existing.openingStock = (parseFloat(existing.openingStock) || 0) + (parseFloat(b.openingStock) || 0);
          existing.stock = (parseFloat(existing.stock) || 0) + (parseFloat(b.stock) || 0);
          if (b.sellingPrice) existing.sellingPrice = b.sellingPrice;
          if (b.mrp) existing.mrp = b.mrp;
        } else {
          renamedBatches.push(b);
        }
      });
      m.batches = renamedBatches;

      // If no batches exist, seed a default batch matching initial pricing
      if (m.batches.length === 0) {
        const dCost = parseFloat(m.landingCost) || 0;
        m.batches.push({
          batchNo: formatRateValue(dCost) || String(dCost),
          landingCost: dCost,
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
          const itemRate = parseFloat(item.price);
          const itemCost = !isNaN(itemRate) && itemRate > 0 ? itemRate : (parseFloat(item.landingCost) || mat.landingCost || 350);
          const bNo = formatRateValue(itemCost) || String(itemCost);
          item.batchNo = bNo; // rename batch on item to equal landing cost
          let batch = mat.batches.find(b => String(b.batchNo).trim() === bNo);
          if (!batch) {
            batch = {
              batchNo: bNo,
              landingCost: itemCost,
              sellingPrice: parseFloat(item.sellingPrice) || mat.gstExclRate || 380,
              mrp: parseFloat(item.mrp) || mat.mrp || 400,
              openingStock: 0,
              stock: 0
            };
            mat.batches.push(batch);
          } else {
            batch.landingCost = itemCost;
            batch.batchNo = bNo;
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
          const rawBNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : null;
          
          if (rawBNo) {
            let targetBatch = mat.batches.find(b => String(b.batchNo).trim() === rawBNo);
            if (!targetBatch) {
              const bNum = parseFloat(rawBNo);
              if (!isNaN(bNum)) {
                targetBatch = mat.batches.find(b => Math.abs((parseFloat(b.landingCost) || 0) - bNum) < 0.0001);
              }
            }
            if (!targetBatch) {
              const bCost = parseFloat(item.price) || mat.landingCost || 350;
              const bNo = formatRateValue(bCost) || String(bCost);
              targetBatch = {
                batchNo: bNo,
                landingCost: bCost,
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
          const rawBNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : null;
          let batch = rawBNo ? (mat.batches.find(b => String(b.batchNo).trim() === rawBNo) || mat.batches.find(b => Math.abs((parseFloat(b.landingCost) || 0) - parseFloat(rawBNo)) < 0.0001)) : mat.batches[0];
          if (!batch && rawBNo) {
            const bCost = !isNaN(parseFloat(rawBNo)) && parseFloat(rawBNo) > 0 ? parseFloat(rawBNo) : (mat.landingCost || 350);
            const bNo = formatRateValue(bCost) || String(bCost);
            batch = {
              batchNo: bNo,
              landingCost: bCost,
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
          const rawBNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : null;
          if (rawBNo) {
            let targetBatch = mat.batches.find(b => String(b.batchNo).trim() === rawBNo) || mat.batches.find(b => Math.abs((parseFloat(b.landingCost) || 0) - parseFloat(rawBNo)) < 0.0001);
            if (!targetBatch) {
              const bCost = !isNaN(parseFloat(rawBNo)) && parseFloat(rawBNo) > 0 ? parseFloat(rawBNo) : (mat.landingCost || 350);
              const bNo = formatRateValue(bCost) || String(bCost);
              targetBatch = {
                batchNo: bNo,
                landingCost: bCost,
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
          const rawBNo = item.batchNo != null && String(item.batchNo).trim() !== "" 
            ? String(item.batchNo).trim() 
            : null;
          let batch = rawBNo ? (mat.batches.find(b => String(b.batchNo).trim() === rawBNo) || mat.batches.find(b => Math.abs((parseFloat(b.landingCost) || 0) - parseFloat(rawBNo)) < 0.0001)) : mat.batches[0];
          if (!batch && rawBNo) {
            const bCost = !isNaN(parseFloat(rawBNo)) && parseFloat(rawBNo) > 0 ? parseFloat(rawBNo) : (mat.landingCost || 350);
            const bNo = formatRateValue(bCost) || String(bCost);
            batch = {
              batchNo: bNo,
              landingCost: bCost,
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
    const cost = parseFloat(batchData.landingCost) !== undefined && !isNaN(parseFloat(batchData.landingCost)) && parseFloat(batchData.landingCost) > 0
      ? parseFloat(batchData.landingCost)
      : (!isNaN(parseFloat(batchData.batchNo)) && parseFloat(batchData.batchNo) > 0 ? parseFloat(batchData.batchNo) : (mat.landingCost || 0));
    const bNo = formatRateValue(cost) || String(cost);
    let existing = mat.batches.find(b => b.batchNo === bNo || (batchData.batchNo && b.batchNo === String(batchData.batchNo)));
    if (existing) {
      existing.batchNo = bNo; // rename batch equal to landing cost
      existing.landingCost = cost;
      if (batchData.sellingPrice !== undefined && !isNaN(parseFloat(batchData.sellingPrice))) {
        existing.sellingPrice = parseFloat(batchData.sellingPrice);
      }
      if (batchData.mrp !== undefined && !isNaN(parseFloat(batchData.mrp))) {
        existing.mrp = parseFloat(batchData.mrp);
      }
      if (batchData.gstInclRate !== undefined && !isNaN(parseFloat(batchData.gstInclRate))) {
        existing.gstInclRate = parseFloat(batchData.gstInclRate);
      }
      if (batchData.marginPercent !== undefined && !isNaN(parseFloat(batchData.marginPercent))) {
        existing.marginPercent = parseFloat(batchData.marginPercent);
      }
      if (batchData.marginAmount !== undefined && !isNaN(parseFloat(batchData.marginAmount))) {
        existing.marginAmount = parseFloat(batchData.marginAmount);
      }
    } else {
      mat.batches.push({
        batchNo: bNo,
        landingCost: cost,
        sellingPrice: parseFloat(batchData.sellingPrice) !== undefined && !isNaN(parseFloat(batchData.sellingPrice)) ? parseFloat(batchData.sellingPrice) : (mat.gstExclRate || 0),
        gstInclRate: parseFloat(batchData.gstInclRate) !== undefined && !isNaN(parseFloat(batchData.gstInclRate)) ? parseFloat(batchData.gstInclRate) : (mat.gstInclRate || 0),
        marginPercent: parseFloat(batchData.marginPercent) !== undefined && !isNaN(parseFloat(batchData.marginPercent)) ? parseFloat(batchData.marginPercent) : (mat.marginPercent || 0),
        marginAmount: parseFloat(batchData.marginAmount) !== undefined && !isNaN(parseFloat(batchData.marginAmount)) ? parseFloat(batchData.marginAmount) : (mat.marginAmount || 0),
        mrp: parseFloat(batchData.mrp) !== undefined && !isNaN(parseFloat(batchData.mrp)) ? parseFloat(batchData.mrp) : (mat.mrp || 0),
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
      const dataUrl = this.getBackendApiUrl(`/api/data/${activeId}/${fyId}`);
      if (!dataUrl) return;
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
      const apiUrl = this.getBackendApiUrl("/api/companies");
      if (!apiUrl) return;
      const res = await fetch(apiUrl, {
        headers: { "Bypass-Tunnel-Reminder": "true" },
        signal: getTimeoutSignal(5000)
      });
      if (res.ok) {
        const data = await res.json();
        const currentStr = localStorage.getItem("erp_companies");
        const current = currentStr ? JSON.parse(currentStr) : [];
        if (Array.isArray(data) && data.length > 0) {
          const mergedData = data.map(serverComp => {
            const localComp = current.find(c => String(c.id) === String(serverComp.id));
            if (localComp) {
              if (localComp.serverUrl) serverComp.serverUrl = localComp.serverUrl;
              if (localComp.financialYears && localComp.financialYears.length > 0) {
                const allFys = [...(serverComp.financialYears || []), ...localComp.financialYears];
                serverComp.financialYears = Array.from(new Map(allFys.map(item => [item.id, item])).values());
              }
              // Merge users
              const userMap = new Map();
              if (Array.isArray(localComp.users)) {
                localComp.users.forEach(u => {
                  if (u && u.username) userMap.set(u.username.toLowerCase(), { ...u });
                });
              }
              if (Array.isArray(serverComp.users)) {
                serverComp.users.forEach(u => {
                  if (u && u.username) {
                    const k = u.username.toLowerCase();
                    if (userMap.has(k)) {
                      userMap.set(k, { ...userMap.get(k), ...u });
                    } else {
                      userMap.set(k, { ...u });
                    }
                  }
                });
              }
              if (userMap.size > 0) {
                serverComp.users = Array.from(userMap.values());
              }
            }
            return serverComp;
          });

          current.forEach(lc => {
            if (!mergedData.some(m => String(m.id) === String(lc.id))) {
              mergedData.push(lc);
            }
          });

          const mergedStr = JSON.stringify(mergedData);
          if (mergedStr !== currentStr) {
            localStorage.setItem("erp_companies", mergedStr);
            this.notifyListeners();
          }
          if (current.length === 0) {
            window.location.reload();
          }
        } else if (current.length > 0) {
          this.saveRegisteredCompanies(current);
        }
      }
    } catch(e) {}
  }

  saveState(skipNotify = false, isRestore = false) {
    this._accountBalancesCache = null;
    if (this._suppressSave) {
      this._pendingSave = true;
      return;
    }
    try {
      const activeId = this.getActiveCompanyId();
      if (!activeId) return;
      const fyId = this.getActiveFyId();

      const now = Date.now();
      const stateToSave = {
        _lastSaved: now,
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

      // Synchronously save directly to localStorage (authoritative data store)
      try {
        const lsKey = `erp_company_data_${activeId}${fyId === 'default' ? '' : '_' + fyId}`;
        localStorage.setItem(lsKey, JSON.stringify(stateToSave));
      } catch (lsErr) {
        console.warn("Failed to set localStorage backup:", lsErr);
      }

      this._lastLocalSaveTime = now;
      this._serverLoadedData = stateToSave;

      // Immediately write recent transaction documents directly to Appwrite's transactions collection (no delay)
      if (!isRestore && !this._isRestoring) {
        this.syncRecentTransactionsDirectly(activeId, fyId);
      }

      // Debounced sync to Appwrite Cloud Storage (1500ms debounce) for full snapshot backup
      if (this._isDataLoadedFromCloud && !isRestore && !this._isRestoring) {
        this.syncToAppwriteCloud(activeId, fyId, false);
      }

      // Optional background sync to local backend API server on disk
      const isRestoreQuery = (isRestore || this._isRestoring) ? "?isRestore=true" : "";
      const saveApiUrl = this.getBackendApiUrl(`/api/data/${activeId}/${fyId}${isRestoreQuery}`);

      if (saveApiUrl) {
        fetch(saveApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true"
          },
          body: JSON.stringify({ ...stateToSave, ...((isRestore || this._isRestoring) ? { _isRestore: true } : {}) })
        })
        .catch(e => {
          // Background server sync failed, silent handle since localstorage is primary
        });
      }

      if (!skipNotify) {
        this.notifyListeners();
      }
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }

  syncRecentTransactionsDirectly(activeId, fyId) {
    try {
      const compId = String(activeId || this.getActiveCompanyId() || "1");
      const fId = String(fyId || this.getActiveFyId() || "default");
      if (!compId) return;

      if (Array.isArray(this.transactions) && this.transactions.length > 0) {
        // Sync the latest 5 transactions immediately in the background
        const recentTxs = this.transactions.slice(-5);
        for (const tx of recentTxs) {
          if (tx && tx.id) {
            this.syncTransactionToAppwrite(tx, false, compId, fId).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn("[Appwrite Direct Sync] Error:", e);
    }
  }

  async syncTransactionToAppwrite(tx, isDeleted = false, customActiveId = null, customFyId = null) {
    if (!tx || !tx.id) return;
    const activeId = String(customActiveId || this.getActiveCompanyId() || "1");
    const fyId = String(customFyId || this.getActiveFyId() || "default");
    const docId = sanitizeAppwriteId(`tx_${activeId}_${fyId}_${tx.id}`);

    if (!this._inFlightTxSyncs) this._inFlightTxSyncs = new Set();
    if (this._inFlightTxSyncs.has(docId)) return;
    this._inFlightTxSyncs.add(docId);

    try {
      if (isDeleted) {
        await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, "transactions", docId).catch(() => {});
        console.log(`[Appwrite Cloud] Deleted transaction document (${docId})`);
        return;
      }

      let partyName = tx.partyName || "";
      let partyId = tx.partyId || "";
      let totalAmt = Number(tx.amount !== undefined && tx.amount !== null && !isNaN(tx.amount) ? tx.amount : 0);

      if (Array.isArray(tx.entries) && tx.entries.length > 0) {
        if (!totalAmt) {
          const debitSum = tx.entries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
          const creditSum = tx.entries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);
          totalAmt = debitSum || creditSum || 0;
        }
        if (!partyName) {
          const firstNonCashEntry = tx.entries.find(e => {
            const accId = String(e.accountId || "");
            return !accId.toLowerCase().includes("cash") && !accId.toLowerCase().includes("bank");
          }) || tx.entries[0];
          if (firstNonCashEntry && firstNonCashEntry.accountId) {
            const contact = (this.contacts || []).find(c => String(c.id) === String(firstNonCashEntry.accountId) || String(c.name).toLowerCase() === String(firstNonCashEntry.accountId).toLowerCase());
            const ledger = (this.ledgers || []).find(l => String(l.id) === String(firstNonCashEntry.accountId) || String(l.name).toLowerCase() === String(firstNonCashEntry.accountId).toLowerCase());
            partyName = contact ? contact.name : (ledger ? ledger.name : firstNonCashEntry.accountId);
            partyId = contact ? String(contact.id) : (ledger ? String(ledger.id) : String(firstNonCashEntry.accountId));
          }
        }
      }

      const docData = {
        company_id: activeId,
        fy_id: fyId,
        voucher_no: String(tx.voucherNo || tx.reference || tx.id || "").substring(0, 95),
        voucher_type: String(tx.voucherType || tx.type || "").substring(0, 45),
        date: String(tx.date || "").substring(0, 45),
        party_id: String(partyId || "").substring(0, 95),
        party_name: String(partyName || "").substring(0, 250),
        amount: totalAmt,
        narration: String(tx.narration || tx.description || "").substring(0, 490),
        raw_data: JSON.stringify(tx)
      };

      const permissions = [
        Permission.read(Role.any()),
        Permission.write(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ];

      try {
        await appwriteDatabases.updateDocument(APPWRITE_DATABASE_ID, "transactions", docId, docData);
        console.log(`[Appwrite Cloud] Updated transaction (${tx.id || tx.voucherNo}) in database.`);
      } catch (updateErr) {
        if (updateErr.code === 404 || String(updateErr.message || "").includes("not found")) {
          try {
            await appwriteDatabases.createDocument(APPWRITE_DATABASE_ID, "transactions", docId, docData, permissions);
            console.log(`[Appwrite Cloud] Created transaction (${tx.id || tx.voucherNo}) in database.`);
          } catch (createErr) {
            if (createErr.code !== 409 && createErr.code !== 429 && !String(createErr.message || "").includes("already exists")) {
              const relayUrl = this.getBackendApiUrl("/api/appwrite/sync-transaction");
              if (relayUrl) {
                await fetch(relayUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ docId, docData, isDeleted: false })
                }).catch(() => {});
              }
            }
          }
        } else if (updateErr.code === 409) {
          // Document already exists, silently handled
        } else if (updateErr.code === 429) {
          // Rate limit reached on document API; data is already preserved in cloud storage snapshot
        } else {
          // Relay via local server if available
          const relayUrl = this.getBackendApiUrl("/api/appwrite/sync-transaction");
          if (relayUrl) {
            await fetch(relayUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ docId, docData, isDeleted: false })
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      if (err.code !== 409 && err.code !== 429 && !String(err.message || "").includes("already exists")) {
        try {
          const relayUrl = this.getBackendApiUrl("/api/appwrite/sync-transaction");
          if (relayUrl) {
            await fetch(relayUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ docId, docData, isDeleted })
            }).catch(() => {});
          }
        } catch (e) {}
      }
    } finally {
      this._inFlightTxSyncs.delete(docId);
    }
  }

  async syncToAppwriteCloud(activeId, fyId, immediate = false) {
    if (!activeId) return;
    const cleanActiveId = String(activeId);
    const cleanFyId = String(fyId || "default");

    if (this._appwriteSyncDebounceTimer) {
      clearTimeout(this._appwriteSyncDebounceTimer);
      this._appwriteSyncDebounceTimer = null;
    }

    const performSync = async () => {
      if (this._isAppwriteSyncing) return;
      this._isAppwriteSyncing = true;
      try {
        if (typeof window !== "undefined" && typeof window.Blob !== "undefined" && typeof window.File !== "undefined") {
          const fullSnapshot = {
            _fyId: cleanFyId,
            _lastSaved: Date.now(),
            materials: this.materials || [],
            contacts: this.contacts || [],
            invoices: this.invoices || [],
            purchases: this.purchases || [],
            salesOrders: this.salesOrders || [],
            salesReturns: this.salesReturns || [],
            purchaseReturns: this.purchaseReturns || [],
            transactions: this.transactions || [],
            ledgers: this.ledgers || [],
            influencers: this.influencers || [],
            influencerRedemptions: this.influencerRedemptions || [],
            loyaltyPrograms: this.loyaltyPrograms || [],
            options: this.options || {},
            accountGroups: this.accountGroups || [],
            productGroups: this.productGroups || [],
            categories: this.categories || [],
            subCategories: this.subCategories || [],
            productNames: this.productNames || [],
            units: this.units || [],
            gstMaster: this.gstMaster || [],
            seriesMaster: this.seriesMaster || []
          };
          const targetFileIds = Array.from(new Set([
            sanitizeAppwriteId(`db_${cleanActiveId}_${cleanFyId}`),
            sanitizeAppwriteId(`db_${cleanActiveId}_default`),
            sanitizeAppwriteId(`db_${cleanActiveId}_Current_F_Y`)
          ]));

          const permissions = [
            Permission.read(Role.any()),
            Permission.write(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any())
          ];

          for (const fileId of targetFileIds) {
            try {
              const blob = new Blob([JSON.stringify(fullSnapshot)], { type: "application/json" });
              const fileObj = new File([blob], `${fileId}.json`, { type: "application/json" });
              try {
                await appwriteStorage.deleteFile(APPWRITE_STORAGE_BUCKET, fileId);
              } catch (delErr) {}

              try {
                await appwriteStorage.createFile(APPWRITE_STORAGE_BUCKET, fileId, fileObj, permissions);
                console.log(`[Appwrite Cloud] Saved database snapshot (${fileId}) with ${fullSnapshot.transactions.length} transactions.`);
              } catch (createErr) {
                const relayUrl = this.getBackendApiUrl("/api/appwrite/sync-storage");
                if (relayUrl) {
                  await fetch(relayUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileId, data: fullSnapshot })
                  }).catch(() => {});
                }
              }
            } catch (fErr) {
              const relayUrl = this.getBackendApiUrl("/api/appwrite/sync-storage");
              if (relayUrl) {
                await fetch(relayUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fileId, data: fullSnapshot })
                }).catch(() => {});
              }
            }
          }

          // Background sync recent transactions for this company/FY to Appwrite transactions collection sequentially
          if (Array.isArray(this.transactions) && this.transactions.length > 0) {
            const txBatch = this.transactions.slice(-10);
            for (const tx of txBatch) {
              try {
                await this.syncTransactionToAppwrite(tx, false, cleanActiveId, cleanFyId);
              } catch (e) {}
            }
          }
        }
      } catch (storageErr) {
        console.warn("[Appwrite Cloud] Sync error:", storageErr?.message || storageErr);
      } finally {
        this._isAppwriteSyncing = false;
      }
    };

    if (immediate) {
      return performSync();
    } else {
      this._appwriteSyncDebounceTimer = setTimeout(performSync, 1500);
    }
  }


  async syncToSupabase(activeId, fyId) {
    return this.syncToAppwriteCloud(activeId, fyId);
  }

  // ── Force Sync All Data to Server ────────────────────────────────────────
  // Reads ALL company data from localStorage (every company, every FY) and
  // pushes it to the local server's disk files. Use this when server files
  // are missing or out of date (e.g. server was offline during saves).
  async forceSyncAllToServer() {
    const getUrl = (endpoint) => this.getBackendApiUrl(endpoint);
    const results = { success: [], failed: [] };

    const compUrl = getUrl("/api/companies");
    if (!compUrl) {
      return { success: false, message: "Local backend server is not reachable in static cloud mode." };
    }

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

      const res = await fetch(compUrl, {
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
              const dataUrl = getUrl(`/api/data/${company.id}/${fyId}`);
              if (dataUrl) {
                const saveRes = await fetch(dataUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" },
                  body: JSON.stringify(data)
                });
                if (saveRes.ok) {
                  results.success.push(`company ${company.id} / FY: ${fyId}`);
                } else {
                  results.failed.push(`company ${company.id} / FY: ${fyId} (HTTP ${saveRes.status})`);
                }
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

  checkTransactionsAfterDate(targetEndDate) {
    if (!targetEndDate) return { hasTransactions: false, message: "", offendingEntries: [] };

    const targetIso = toIsoDateStr(targetEndDate);
    const offendingEntries = [];

    (this.transactions || []).forEach(t => {
      const tIso = toIsoDateStr(t.date);
      if (tIso && tIso > targetIso) {
        const dF = tIso.split('-').reverse().join('/');
        offendingEntries.push(`Voucher/Transaction #${t.voucherNo || t.id || ''} (${t.voucherType || 'Tx'} on ${dF})`);
      }
    });

    (this.invoices || []).forEach(i => {
      const iIso = toIsoDateStr(i.date);
      if (iIso && iIso > targetIso) {
        const dF = iIso.split('-').reverse().join('/');
        offendingEntries.push(`Sales Invoice #${i.invoiceNo || i.id} (${dF})`);
      }
    });

    (this.purchases || []).forEach(p => {
      const pIso = toIsoDateStr(p.date);
      if (pIso && pIso > targetIso) {
        const dF = pIso.split('-').reverse().join('/');
        offendingEntries.push(`Purchase Bill #${p.purchaseNo || p.id} (${dF})`);
      }
    });

    (this.salesReturns || []).forEach(sr => {
      const srIso = toIsoDateStr(sr.date);
      if (srIso && srIso > targetIso) {
        const dF = srIso.split('-').reverse().join('/');
        offendingEntries.push(`Sales Return #${sr.returnNo || sr.id} (${dF})`);
      }
    });

    (this.purchaseReturns || []).forEach(pr => {
      const prIso = toIsoDateStr(pr.date);
      if (prIso && prIso > targetIso) {
        const dF = prIso.split('-').reverse().join('/');
        offendingEntries.push(`Purchase Return #${pr.returnNo || pr.id} (${dF})`);
      }
    });

    (this.stockAdjustments || []).forEach(sa => {
      const saIso = toIsoDateStr(sa.date);
      if (saIso && saIso > targetIso) {
        const dF = saIso.split('-').reverse().join('/');
        offendingEntries.push(`Stock Adjustment #${sa.id} (${dF})`);
      }
    });

    (this.conversions || []).forEach(c => {
      const cIso = toIsoDateStr(c.date);
      if (cIso && cIso > targetIso) {
        const dF = cIso.split('-').reverse().join('/');
        offendingEntries.push(`Stock Conversion #${c.id} (${dF})`);
      }
    });

    (this.salesOrders || []).forEach(so => {
      const soIso = toIsoDateStr(so.date);
      if (soIso && soIso > targetIso) {
        const dF = soIso.split('-').reverse().join('/');
        offendingEntries.push(`Sales Order #${so.orderNo || so.id} (${dF})`);
      }
    });

    if (offendingEntries.length > 0) {
      const formattedEndDate = targetIso.split('-').reverse().join('/');
      const sampleList = offendingEntries.slice(0, 5).map(e => `• ${e}`).join('\n');
      const extraCount = offendingEntries.length > 5 ? `\n...and ${offendingEntries.length - 5} more entry(ies)` : '';
      return {
        hasTransactions: true,
        offendingEntries,
        message: `CANNOT END FINANCIAL YEAR ON ${formattedEndDate}!\n\nThere are ${offendingEntries.length} transaction(s)/entry(ies) dated after ${formattedEndDate}:\n\n${sampleList}${extraCount}\n\nPlease delete or modify the date of these entries before ending the financial year on ${formattedEndDate}.`
      };
    }

    return { hasTransactions: false, message: "", offendingEntries: [] };
  }

  isPLAccount(l) {
    if (!l) return false;
    const code = String(l.code || "").toUpperCase();
    if (["L017", "L018", "L019", "L020", "L021", "L022", "L023", "L024", "L025"].includes(code)) {
      return true;
    }
    const groupName = String(l.groupName || "").toUpperCase();
    const plKeywords = [
      "SALES ACCOUNTS", "SALES ACCOUNT", "PURCHASE ACCOUNTS", "PURCHASE ACCOUNT", 
      "INCOME", "EXPENSE", "REVENUE", "SALES", "PURCHASE", "DIRECT EXPENSES", 
      "INDIRECT EXPENSES", "DIRECT INCOME", "INDIRECT INCOME", "DEPRECIATION", "EMPLOYEE EXPENSES"
    ];
    if (plKeywords.some(kw => groupName.includes(kw))) {
      return true;
    }
    
    // Check recursively up the accountGroups tree if available
    const accountGroups = this.accountGroups || [];
    const groupByNameUpper = new Map();
    accountGroups.forEach(g => {
      if (g && g.name) groupByNameUpper.set(String(g.name).toUpperCase(), g);
    });
    let curr = groupName;
    for (let i = 0; i < 15; i++) {
      if (!curr) break;
      if (["INCOME", "EXPENSE", "REVENUE", "SALES", "PURCHASE", "DEPRECIATION"].some(kw => curr.includes(kw))) {
        return true;
      }
      if (["ASSETS", "CURRENT ASSETS", "FIXED ASSETS", "LIABILITIES", "CURRENT LIABILITIES", "EQUITY", "CAPITAL ACCOUNT"].some(kw => curr.includes(kw))) {
        return false;
      }
      const parent = groupByNameUpper.get(curr);
      if (parent && parent.under) curr = String(parent.under).toUpperCase();
      else break;
    }

    return false;
  }

  async createNewFinancialYear(name, startDate, endDate, currentFyEnd) {
    const activeId = this.getActiveCompanyId();
    if (!activeId) return { success: false, message: "No active company" };

    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => c.id === activeId);
    if (!company) return { success: false, message: "Company not found" };

    // Check if name overlaps with another existing financial year (excluding current active year being ended)
    const activeFyId = this.getActiveFyId();
    company.financialYears = company.financialYears || [];
    if (company.financialYears.some(fy => String(fy.id) !== String(activeFyId) && fy.name === name)) {
      return { success: false, message: `Financial Year '${name}' already exists.` };
    }

    const newFyId = "fy_" + name.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now();
    const newFy = {
      id: newFyId,
      name,
      startDate,
      endDate
    };

    // Determine target ending date for the current financial year being ended
    let currentFyEndDate = currentFyEnd;
    if (!currentFyEndDate && startDate) {
      const parts = startDate.split("-").map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      dateObj.setDate(dateObj.getDate() - 1);
      const prevYearEndYear = dateObj.getFullYear();
      const prevYearEndMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const prevYearEndDate = String(dateObj.getDate()).padStart(2, '0');
      currentFyEndDate = `${prevYearEndYear}-${prevYearEndMonth}-${prevYearEndDate}`;
    }

    // Cannot end financial year if any transaction exists after currentFyEndDate
    const checkRes = this.checkTransactionsAfterDate(currentFyEndDate);
    if (checkRes.hasTransactions) {
      return {
        success: false,
        message: checkRes.message
      };
    }

    // Recompute all stocks and clear balance cache before computing closing balances
    this.recomputeAllStocks();
    this._accountBalancesCache = null;

    // Calculate closing balances and stock from the CURRENT financial year to carry forward
    const closingBalances = this.getAccountBalances(currentFyEndDate);
    
    // We also want to compile current materials closing stocks
    // If closing stock of last FY is negative, carry it forward as negative opening stock in next FY
    const materialsCarrier = JSON.parse(JSON.stringify(this.materials));
    materialsCarrier.forEach(m => {
      m.batches = m.batches || [];
      m.batches.forEach(b => {
        b.openingStock = parseFloat(b.stock) || 0;
        b.stock = b.openingStock;
      });
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
      
      const isPL = this.isPLAccount(l);
      
      if (isPL) {
        // Income & Expense balances close out, reset to 0 in the new year
        l.openingBalance = 0;
        l.balanceType = "Debit";
      } else {
        // Carry forward balance for Balance Sheet items (Assets, Liabilities, Capital)
        if (bal >= 0) {
          l.openingBalance = bal;
          l.balanceType = "Debit";
        } else {
          l.openingBalance = Math.abs(bal);
          l.balanceType = "Credit";
        }
      }
    });

    // Automatically create Profit & Loss ledger under CAPITAL ACCOUNT for carrying forward to next FY
    const activeFy = (company.financialYears || []).find(fy => fy.id === activeFyId);
    const fyStart = (activeFy && activeFy.startDate) ? activeFy.startDate : (company.financialYearStarts || "");
    const currBs = this.getBalanceSheet(fyStart, currentFyEndDate);
    const currentYearNetProfit = (currBs && currBs.liabilities) ? currBs.liabilities.retainedEarnings : (this.getProfitLoss(fyStart, currentFyEndDate).netProfit || 0);

    const isPlAccumulatedName = (name) => {
      const u = String(name || "").trim().toUpperCase();
      return u === "PROFIT AND LOSS ACCOUNT PREVIOUS YEAR" || 
             u === "PROFIT AND LOSS ACCOUNT PREVIOUS YEARS" || 
             u === "PREVIOUS YEAR PROFIT" || 
             u === "PREVIOUS YEAR PROFIT A/C" || 
             u === "PREVIOUS YEARS PROFIT" || 
             u === "RETAINED EARNINGS" || 
             u.includes("PROFIT/LOSS OF THE F.Y.") ||
             (u.includes("PREVIOUS YEAR") && u.includes("PROFIT")) ||
             (u.includes("PREVIOUS YEARS") && u.includes("PROFIT"));
    };

    let prevAccumulatedPl = 0;
    this.ledgers.forEach(l => {
      if (isPlAccumulatedName(l.name)) {
        const balData = closingBalances[l.code];
        const bal = balData ? balData.balance : (l.balanceType === "Debit" ? (l.openingBalance || 0) : -(l.openingBalance || 0));
        prevAccumulatedPl += (bal < 0 ? Math.abs(bal) : -Math.abs(bal));
      }
    });

    const totalAccumulatedProfit = currentYearNetProfit + prevAccumulatedPl;
    const defaultPlLedgerName = "PROFIT AND LOSS ACCOUNT PREVIOUS YEAR";

    let plLedger = ledgersCarrier.find(l => isPlAccumulatedName(l.name));
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
        name: defaultPlLedgerName,
        groupName: "CAPITAL ACCOUNT"
      };
      ledgersCarrier.push(plLedger);
    } else {
      plLedger.groupName = "CAPITAL ACCOUNT";
    }

    plLedger.openingBalance = Math.abs(totalAccumulatedProfit);
    plLedger.balanceType = totalAccumulatedProfit >= 0 ? "Credit" : "Debit";

    // Also copy over contacts and carry forward their closing balances with explicit balanceType
    const contactsCarrier = JSON.parse(JSON.stringify(this.contacts));
    contactsCarrier.forEach(c => {
      const balData = closingBalances[c.id];
      const bal = balData ? balData.balance : 0;
      if (bal >= 0) {
        c.openingBalance = bal;
        c.balanceType = "Debit";
      } else {
        c.openingBalance = Math.abs(bal);
        c.balanceType = "Credit";
      }
      c.balance = bal;
      if (c.siteType === "multiple" && Array.isArray(c.sites)) {
        c.openingBalances = c.openingBalances || {};
        c.siteBalanceTypes = c.siteBalanceTypes || {};
        c.sites.forEach(site => {
          const siteKey = `${c.id}::${site}`;
          const siteBalData = closingBalances[siteKey];
          const siteBal = siteBalData ? siteBalData.balance : 0;
          if (siteBal >= 0) {
            c.openingBalances[site] = siteBal;
            c.siteBalanceTypes[site] = "Debit";
          } else {
            c.openingBalances[site] = Math.abs(siteBal);
            c.siteBalanceTypes[site] = "Credit";
          }
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

    // Update active/current financial year's ending date to the selected currentFyEndDate
    const existingFy = company.financialYears.find(fy => String(fy.id) === String(activeFyId));
    if (existingFy) {
      if (currentFyEndDate) {
        existingFy.endDate = currentFyEndDate;
      }

      // Update name of ended financial year to reflect its exact date period (e.g. 01/04/2026 to 27/09/2026)
      const startFormatted = existingFy.startDate ? existingFy.startDate.split("-").reverse().join("/") : (company.financialYearStarts ? company.financialYearStarts.split("-").reverse().join("/") : "");
      const endFormatted = existingFy.endDate ? existingFy.endDate.split("-").reverse().join("/") : "";
      existingFy.name = (startFormatted && endFormatted) ? `${startFormatted} to ${endFormatted}` : "Previous F.Y";
    }

    // Save the previous financial year's data in localStorage under its ended FY key
    if (existingFy) {
      const prevLsKey = `erp_company_data_${activeId}${existingFy.id === 'default' ? '' : '_' + existingFy.id}`;
      const currentStoredData = localStorage.getItem(`erp_company_data_${activeId}`);
      if (currentStoredData) {
        localStorage.setItem(prevLsKey, currentStoredData);
      }
    }

    // Set new active financial year name to Current F.Y
    newFy.name = "Current F.Y";

    // Update company root financial year date range to the new FY
    company.financialYearStarts = startDate;
    company.financialYearEnds = endDate;

    // Save the new company year in registered companies and AWAIT server response FIRST
    company.financialYears.push(newFy);
    await this.saveRegisteredCompanies(companies);

    // Save the new year's database state
    const newLsKey = `erp_company_data_${activeId}${newFyId === 'default' ? '' : '_' + newFyId}`;
    localStorage.setItem(newLsKey, JSON.stringify(newState));
    this._serverLoadedData = newState;
    this._serverLoadedData._fyId = newFyId;
    
    // Sync with the server API for this new fyId
    const saveFyUrl = this.getBackendApiUrl(`/api/data/${activeId}/${newFyId}`);
    if (saveFyUrl) {
      try {
        await fetch(saveFyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newState)
        });
      } catch (e) {
        console.error("Syncing new financial year failed:", e);
      }
    }

    // Sync new FY state and previous FY state to Supabase Cloud Database
    const originalMaterials = this.materials;
    const originalContacts = this.contacts;
    const originalLedgers = this.ledgers;
    const originalInvoices = this.invoices;
    const originalTransactions = this.transactions;
    const originalPurchases = this.purchases;
    const originalSalesReturns = this.salesReturns;
    const originalPurchaseReturns = this.purchaseReturns;

    this.materials = newState.materials;
    this.contacts = newState.contacts;
    this.ledgers = newState.ledgers;
    this.invoices = newState.invoices;
    this.transactions = newState.transactions;
    this.purchases = newState.purchases;
    this.salesReturns = newState.salesReturns;
    this.purchaseReturns = newState.purchaseReturns;

    try {
      await this.syncToSupabase(activeId, newFyId);
    } catch (e) {}

    if (existingFy) {
      this.materials = originalMaterials;
      this.contacts = originalContacts;
      this.ledgers = originalLedgers;
      this.invoices = originalInvoices;
      this.transactions = originalTransactions;
      this.purchases = originalPurchases;
      this.salesReturns = originalSalesReturns;
      this.purchaseReturns = originalPurchaseReturns;
      try {
        await this.syncToSupabase(activeId, existingFy.id);
      } catch (e) {}
    } else {
      this.materials = newState.materials;
      this.contacts = newState.contacts;
      this.ledgers = newState.ledgers;
      this.invoices = newState.invoices;
      this.transactions = newState.transactions;
      this.purchases = newState.purchases;
      this.salesReturns = newState.salesReturns;
      this.purchaseReturns = newState.purchaseReturns;
    }

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
    this._accountBalancesCache = null;
    const prevClosingBalances = this.getAccountBalances();
    const prevClosingMaterials = JSON.parse(JSON.stringify(this.materials));
    const prevStart = (prevFy && prevFy.startDate) ? prevFy.startDate : (company.financialYearStarts || "");
    const prevEnd = (prevFy && prevFy.endDate) ? prevFy.endDate : (company.financialYearEnds || "");
    const prevBs = this.getBalanceSheet(prevStart, prevEnd);
    const netProfit = (prevBs && prevBs.liabilities) ? prevBs.liabilities.retainedEarnings : (this.getProfitLoss(prevStart, prevEnd).netProfit || 0);

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
    
    // Clear cache again after restoring current year state context
    this._accountBalancesCache = null;

    // Copy any missing ledgers created in previous year into current year
    (prevData.ledgers || []).forEach(pl => {
      if (!this.ledgers.some(l => l.code === pl.code || String(l.name || "").toUpperCase() === String(pl.name || "").toUpperCase())) {
        this.ledgers.push(JSON.parse(JSON.stringify(pl)));
      }
    });

    // Copy any missing contacts created in previous year into current year
    (prevData.contacts || []).forEach(pc => {
      if (!this.contacts.some(c => c.id === pc.id)) {
        this.contacts.push(JSON.parse(JSON.stringify(pc)));
      }
    });

    // Copy any missing materials created in previous year into current year
    (prevData.materials || []).forEach(pm => {
      if (!this.materials.some(m => m.id === pm.id)) {
        this.materials.push(JSON.parse(JSON.stringify(pm)));
      }
    });

    // Update current year's ledger opening balances
    this.ledgers.forEach(l => {
      const balData = prevClosingBalances[l.code];
      const bal = balData ? balData.balance : 0;
      
      const isPL = this.isPLAccount(l);
      
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

    // Calculate accumulated profit/loss across previous years to carry forward
    let prevAccumulatedPl = 0;
    const isPlAccumulatedName = (name) => {
      const u = String(name || "").trim().toUpperCase();
      return u === "PROFIT AND LOSS ACCOUNT PREVIOUS YEAR" || 
             u === "PROFIT AND LOSS ACCOUNT PREVIOUS YEARS" || 
             u === "PREVIOUS YEAR PROFIT" || 
             u === "PREVIOUS YEAR PROFIT A/C" || 
             u === "PREVIOUS YEARS PROFIT" || 
             u === "RETAINED EARNINGS" || 
             u.includes("PROFIT/LOSS OF THE F.Y.") ||
             (u.includes("PREVIOUS YEAR") && u.includes("PROFIT")) ||
             (u.includes("PREVIOUS YEARS") && u.includes("PROFIT"));
    };

    (prevData.ledgers || []).forEach(l => {
      if (isPlAccumulatedName(l.name)) {
        const balData = prevClosingBalances[l.code];
        const bal = balData ? balData.balance : (l.balanceType === "Debit" ? (parseFloat(l.openingBalance) || 0) : -(parseFloat(l.openingBalance) || 0));
        prevAccumulatedPl += (bal < 0 ? Math.abs(bal) : -Math.abs(bal));
      }
    });
    const totalAccumulatedProfit = netProfit + prevAccumulatedPl;

    // Automatically create or update Profit & Loss ledger under CAPITAL ACCOUNT for current year
    const defaultPlLedgerName = "PROFIT AND LOSS ACCOUNT PREVIOUS YEAR";
    let plLedger = this.ledgers.find(l => isPlAccumulatedName(l.name));
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
        name: defaultPlLedgerName,
        groupName: "CAPITAL ACCOUNT"
      };
      this.ledgers.push(plLedger);
    } else {
      plLedger.groupName = "CAPITAL ACCOUNT";
    }
    plLedger.openingBalance = Math.abs(totalAccumulatedProfit);
    plLedger.balanceType = totalAccumulatedProfit >= 0 ? "Credit" : "Debit";

    // Update current year's contact opening balances
    this.contacts.forEach(c => {
      const balData = prevClosingBalances[c.id];
      const bal = balData ? balData.balance : 0;
      if (bal >= 0) {
        c.openingBalance = bal;
        c.balanceType = "Debit";
      } else {
        c.openingBalance = Math.abs(bal);
        c.balanceType = "Credit";
      }
      c.balance = bal;
      if (c.siteType === "multiple" && Array.isArray(c.sites)) {
        c.openingBalances = c.openingBalances || {};
        c.siteBalanceTypes = c.siteBalanceTypes || {};
        c.sites.forEach(site => {
          const siteKey = `${c.id}::${site}`;
          const siteBalData = prevClosingBalances[siteKey];
          const siteBal = siteBalData ? siteBalData.balance : 0;
          if (siteBal >= 0) {
            c.openingBalances[site] = siteBal;
            c.siteBalanceTypes[site] = "Debit";
          } else {
            c.openingBalances[site] = Math.abs(siteBal);
            c.siteBalanceTypes[site] = "Credit";
          }
        });
      }
    });

    // Update current year's material opening stock based on previous closing stock
    this.materials.forEach(m => {
      const prevMat = prevClosingMaterials.find(pm => pm.id === m.id);
      if (prevMat) {
        const prevBatches = prevMat.batches || [];
        if (prevBatches.length > 0) {
          m.batches = prevBatches.map(pb => ({
            batchNo: String(pb.batchNo != null ? pb.batchNo : (prevMat.landingCost || 0)).trim(),
            landingCost: parseFloat(pb.landingCost) || 0,
            sellingPrice: parseFloat(pb.sellingPrice || pb.sellingRate) || 0,
            mrp: parseFloat(pb.mrp) || 0,
            openingStock: parseFloat(pb.stock) || 0,
            stock: parseFloat(pb.stock) || 0
          }));
        } else {
          m.batches = [{
            batchNo: String(m.landingCost || 0),
            landingCost: m.landingCost || 0,
            sellingPrice: m.sellingPrice || m.gstExclRate || 0,
            mrp: m.mrp || 0,
            openingStock: parseFloat(prevMat.stock) || 0,
            stock: parseFloat(prevMat.stock) || 0
          }];
        }
        m.openingStock = m.batches.reduce((sum, b) => sum + (parseFloat(b.openingStock) || 0), 0);
        m.stock = m.openingStock;
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

    // Purge any stray transactions dated prior to next financial year start date
    if (nextFy.startDate) {
      nextData.purchases = (nextData.purchases || []).filter(p => p.date && p.date >= nextFy.startDate);
      nextData.invoices = (nextData.invoices || []).filter(i => i.date && i.date >= nextFy.startDate);
      nextData.transactions = (nextData.transactions || []).filter(t => t.date && t.date >= nextFy.startDate);
      nextData.salesReturns = (nextData.salesReturns || []).filter(sr => sr.date && sr.date >= nextFy.startDate);
      nextData.purchaseReturns = (nextData.purchaseReturns || []).filter(pr => pr.date && pr.date >= nextFy.startDate);
      nextData.stockAdjustments = (nextData.stockAdjustments || []).filter(sa => sa.date && sa.date >= nextFy.startDate);
    }

    // Compute current year's closing balances
    this.recomputeAllStocks();
    this._accountBalancesCache = null;
    const currentClosingBalances = this.getAccountBalances();
    const currentClosingMaterials = JSON.parse(JSON.stringify(this.materials));
    const currentFyObj = company.financialYears[currentIndex];
    const currStart = (currentFyObj && currentFyObj.startDate) ? currentFyObj.startDate : (company.financialYearStarts || "");
    const currEnd = (currentFyObj && currentFyObj.endDate) ? currentFyObj.endDate : (company.financialYearEnds || "");
    const currBs = this.getBalanceSheet(currStart, currEnd);
    const netProfit = (currBs && currBs.liabilities) ? currBs.liabilities.retainedEarnings : (this.getProfitLoss(currStart, currEnd).netProfit || 0);

    // Copy any missing ledgers created in current year into next year
    nextData.ledgers = nextData.ledgers || [];
    (this.ledgers || []).forEach(cl => {
      if (!nextData.ledgers.some(l => l.code === cl.code || String(l.name || "").toUpperCase() === String(cl.name || "").toUpperCase())) {
        nextData.ledgers.push(JSON.parse(JSON.stringify(cl)));
      }
    });

    // Copy any missing contacts created in current year into next year
    nextData.contacts = nextData.contacts || [];
    (this.contacts || []).forEach(cc => {
      if (!nextData.contacts.some(c => c.id === cc.id)) {
        nextData.contacts.push(JSON.parse(JSON.stringify(cc)));
      }
    });

    // Copy any missing materials created in current year into next year
    nextData.materials = nextData.materials || [];
    (this.materials || []).forEach(cm => {
      if (!nextData.materials.some(m => m.id === cm.id)) {
        nextData.materials.push(JSON.parse(JSON.stringify(cm)));
      }
    });

    // Update next year's ledger opening balances in nextData
    nextData.ledgers.forEach(l => {
      const balData = currentClosingBalances[l.code];
      const bal = balData ? balData.balance : 0;
      
      const isPL = this.isPLAccount(l);
      
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

    // Calculate accumulated profit/loss across current & previous years to carry forward to next year
    let currentAccumulatedPl = 0;
    const isPlAccumulatedName = (name) => {
      const u = String(name || "").trim().toUpperCase();
      return u === "PROFIT AND LOSS ACCOUNT PREVIOUS YEAR" || 
             u === "PROFIT AND LOSS ACCOUNT PREVIOUS YEARS" || 
             u === "PREVIOUS YEAR PROFIT" || 
             u === "PREVIOUS YEAR PROFIT A/C" || 
             u === "PREVIOUS YEARS PROFIT" || 
             u === "RETAINED EARNINGS" || 
             u.includes("PROFIT/LOSS OF THE F.Y.") ||
             (u.includes("PREVIOUS YEAR") && u.includes("PROFIT")) ||
             (u.includes("PREVIOUS YEARS") && u.includes("PROFIT"));
    };

    (this.ledgers || []).forEach(l => {
      if (isPlAccumulatedName(l.name)) {
        const balData = currentClosingBalances[l.code];
        const bal = balData ? balData.balance : (l.balanceType === "Debit" ? (parseFloat(l.openingBalance) || 0) : -(parseFloat(l.openingBalance) || 0));
        currentAccumulatedPl += (bal < 0 ? Math.abs(bal) : -Math.abs(bal));
      }
    });
    const totalAccumulatedProfit = netProfit + currentAccumulatedPl;

    // Update next year's P&L carry forward ledger
    const defaultPlLedgerName = "PROFIT AND LOSS ACCOUNT PREVIOUS YEAR";
    let plLedger = nextData.ledgers.find(l => isPlAccumulatedName(l.name));
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
        name: defaultPlLedgerName,
        groupName: "CAPITAL ACCOUNT"
      };
      nextData.ledgers.push(plLedger);
    } else {
      plLedger.groupName = "CAPITAL ACCOUNT";
    }
    plLedger.openingBalance = Math.abs(totalAccumulatedProfit);
    plLedger.balanceType = totalAccumulatedProfit >= 0 ? "Credit" : "Debit";

    // Update next year's material opening stock
    nextData.materials = nextData.materials || [];
    nextData.materials.forEach(nm => {
      const cm = currentClosingMaterials.find(x => x.id === nm.id);
      if (cm) {
        const cmBatches = cm.batches || [];
        if (cmBatches.length > 0) {
          nm.batches = cmBatches.map(cb => ({
            batchNo: String(cb.batchNo != null ? cb.batchNo : (cm.landingCost || 0)).trim(),
            landingCost: parseFloat(cb.landingCost) || 0,
            sellingPrice: parseFloat(cb.sellingPrice || cb.sellingRate) || 0,
            mrp: parseFloat(cb.mrp) || 0,
            openingStock: parseFloat(cb.stock) || 0,
            stock: parseFloat(cb.stock) || 0
          }));
        } else {
          nm.batches = [{
            batchNo: String(nm.landingCost || 0),
            landingCost: nm.landingCost || 0,
            sellingPrice: nm.sellingPrice || nm.gstExclRate || 0,
            mrp: nm.mrp || 0,
            openingStock: parseFloat(cm.stock) || 0,
            stock: parseFloat(cm.stock) || 0
          }];
        }
        nm.openingStock = nm.batches.reduce((sum, b) => sum + (parseFloat(b.openingStock) || 0), 0);
        nm.stock = nm.openingStock;
      }
    });

    // Update next year's contact opening balances with explicit balanceType
    nextData.contacts = nextData.contacts || [];
    nextData.contacts.forEach(nc => {
      const cc = this.contacts.find(x => x.id === nc.id);
      if (cc) {
        const balData = currentClosingBalances[cc.id];
        const bal = balData ? balData.balance : 0;
        if (bal >= 0) {
          nc.openingBalance = bal;
          nc.balanceType = "Debit";
        } else {
          nc.openingBalance = Math.abs(bal);
          nc.balanceType = "Credit";
        }
        nc.balance = bal;
        
        if (cc.siteType === "multiple" && Array.isArray(cc.sites)) {
          nc.openingBalances = nc.openingBalances || {};
          nc.siteBalanceTypes = nc.siteBalanceTypes || {};
          cc.sites.forEach(site => {
            const siteKey = `${cc.id}::${site}`;
            const siteBalData = currentClosingBalances[siteKey];
            const siteBal = siteBalData ? siteBalData.balance : 0;
            if (siteBal >= 0) {
              nc.openingBalances[site] = siteBal;
              nc.siteBalanceTypes[site] = "Debit";
            } else {
              nc.openingBalances[site] = Math.abs(siteBal);
              nc.siteBalanceTypes[site] = "Credit";
            }
          });
        }
      }
    });

    // Save and sync the next year state
    const nextLsKey = `erp_company_data_${activeId}${nextFyId === 'default' ? '' : '_' + nextFyId}`;
    localStorage.setItem(nextLsKey, JSON.stringify(nextData));
    
    const saveNextUrl = this.getBackendApiUrl(`/api/data/${activeId}/${nextFyId}`);
    if (saveNextUrl) {
      fetch(saveNextUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextData)
      }).catch(e => console.error("Syncing updated next year opening balances failed:", e));
    }

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
        influencerLoyaltyRate: 1.0,
        allowPreviousYearEditing: false
      };
    }
    if (this.options.enableCessInSalesBill === undefined) this.options.enableCessInSalesBill = false;
    if (this.options.enablePartyClosingBalanceBottom === undefined) this.options.enablePartyClosingBalanceBottom = true;
    if (this.options.enableHeadloader === undefined) this.options.enableHeadloader = true;
    if (this.options.influencerLoyaltyRate === undefined) this.options.influencerLoyaltyRate = 1.0;
    if (this.options.allowPreviousYearEditing === undefined) this.options.allowPreviousYearEditing = false;
    return this.options;
  }

  isPreviousFyLocked(txDate) {
    const options = this.getOptions();
    if (options.allowPreviousYearEditing === true) {
      return { locked: false };
    }

    const activeCompanyId = this.getActiveCompanyId();
    const activeFyId = this.getActiveFyId();
    const companies = this.getRegisteredCompanies();
    const company = companies.find(c => String(c.id) === String(activeCompanyId));

    if (!company || !company.financialYears || company.financialYears.length <= 1) {
      return { locked: false };
    }

    const fys = company.financialYears;
    const latestFy = fys[fys.length - 1];

    if (activeFyId && String(activeFyId) !== String(latestFy.id)) {
      const activeFyObj = fys.find(f => String(f.id) === String(activeFyId));
      const label = activeFyObj ? this.getFyDisplayLabel(activeFyObj) : activeFyId;
      return {
        locked: true,
        reason: `PREVIOUS FINANCIAL YEAR LOCKED:\n\nEditing and entering transactions in Previous Financial Years is TURNED OFF in Admin Panel settings.\n\nCurrent Active Period (${label}) is a Previous Financial Year. Turn ON 'Allow Previous Year Editing' in Admin Panel to modify this period.`
      };
    }

    if (txDate && latestFy.startDate) {
      const formattedTxDate = toIsoDateStr(txDate);
      if (formattedTxDate && formattedTxDate < latestFy.startDate) {
        return {
          locked: true,
          reason: `PREVIOUS FINANCIAL YEAR LOCKED:\n\nTransaction date (${formattedTxDate.split('-').reverse().join('/')}) falls in a Previous Financial Year (prior to ${latestFy.startDate.split('-').reverse().join('/')}).\n\nEditing and entry in Previous Financial Years is TURNED OFF in Admin Panel settings.`
        };
      }
    }

    return { locked: false };
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
      const prefix = series.prefix || "";
      const prefixUpper = prefix.toUpperCase();
      const txType = (series.txType || "").toLowerCase();
      let maxUsed = (series.startingNumber || 1) - 1;

      if (txType.includes("purchase")) {
        const purList = this.purchases || [];
        purList.forEach(pur => {
          if (!pur || pur.isCancelled || pur.isCanceled || String(pur.status).toUpperCase() === "CANCELLED") return;
          const vno = String(pur.voucherNo || pur.refNo || "").trim();
          if (!vno) return;
          
          let matchesThisSeries = false;
          const vnoUpper = vno.toUpperCase();
          if (prefixUpper) {
            if (vnoUpper.startsWith(prefixUpper)) matchesThisSeries = true;
          } else {
            if (pur.seriesId === series.id) matchesThisSeries = true;
          }

          if (matchesThisSeries) {
            let num = NaN;
            if (prefixUpper && vnoUpper.startsWith(prefixUpper)) {
              num = parseInt(vno.substring(prefix.length), 10);
            } else if (!prefixUpper) {
              num = parseInt(vno, 10);
            }
            if (!isNaN(num) && num > maxUsed) {
              maxUsed = num;
            }
          }
        });
      } else {
        const invList = this.invoices || [];
        invList.forEach(inv => {
          if (!inv || inv.isCancelled || inv.isCanceled || String(inv.status).toUpperCase() === "CANCELLED") return;
          const vno = String(inv.voucherNo || inv.refNo || "").trim();
          if (!vno) return;

          let matchesThisSeries = false;
          const vnoUpper = vno.toUpperCase();
          if (prefixUpper) {
            if (vnoUpper.startsWith(prefixUpper)) matchesThisSeries = true;
          } else {
            if (inv.seriesId === series.id) matchesThisSeries = true;
          }

          if (matchesThisSeries) {
            let num = NaN;
            if (prefixUpper && vnoUpper.startsWith(prefixUpper)) {
              num = parseInt(vno.substring(prefix.length), 10);
            } else if (!prefixUpper) {
              num = parseInt(vno, 10);
            }
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

    // Self-healing check: if an erroneous invoice with a jump (e.g. LSL-0399 right after LSL-0366) exists, fix it
    const localSalesSeries = (this.seriesMaster || []).find(s => s.id === "SER-LOCAL-SALES" || (s.prefix === "LSL-" && s.txType === "Sales"));
    if (localSalesSeries && this.invoices && this.invoices.length > 0) {
      const lslInvs = this.invoices.filter(i => {
        const vno = String(i.voucherNo || i.refNo || "").toUpperCase();
        return vno.startsWith("LSL-");
      });
      const wrongInv = lslInvs.find(i => {
        const vno = String(i.voucherNo || i.refNo || "").toUpperCase();
        return vno === "LSL-0399" || vno === "LSL-399";
      });
      if (wrongInv) {
        const otherNums = lslInvs
          .filter(i => i !== wrongInv)
          .map(i => parseInt(String(i.voucherNo || i.refNo).replace(/^[A-Za-z-]+/, ""), 10))
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        const maxOther = otherNums.length > 0 ? otherNums[otherNums.length - 1] : 366;
        const correctNum = maxOther + 1;
        const correctVno = "LSL-" + String(correctNum).padStart(4, "0");
        console.log(`[Self-Healing] Correcting erroneous invoice number ${wrongInv.voucherNo} -> ${correctVno}`);
        
        const oldVno = wrongInv.voucherNo;
        wrongInv.voucherNo = correctVno;
        wrongInv.refNo = correctVno;
        
        if (this.transactions) {
          this.transactions.forEach(t => {
            if (t.voucherNo === oldVno || t.reference === oldVno || t.reference === `INVOICE ${oldVno}` || t.reference === `${oldVno} COGS`) {
              t.voucherNo = correctVno;
              if (t.reference === oldVno) t.reference = correctVno;
              else if (t.reference === `INVOICE ${oldVno}`) t.reference = `INVOICE ${correctVno}`;
              else if (t.reference === `${oldVno} COGS`) t.reference = `${correctVno} COGS`;
            }
          });
        }
        localSalesSeries.currentNumber = correctNum + 1;
        changed = true;
      }
    }

    if (changed) {
      this.saveState(true);
    }
  }

  rearrangeBillsInSeries(seriesId, options = {}) {
    if (!this.seriesMaster || !Array.isArray(this.seriesMaster)) {
      return { success: false, message: "No series master configurations found." };
    }

    const {
      excludeCancelled = true,
      customStartingNumber = null,
      txType: specifiedTxType = null
    } = options;

    let targetSeriesList = [];
    if (seriesId === "ALL" || !seriesId) {
      targetSeriesList = specifiedTxType 
        ? this.seriesMaster.filter(s => String(s.txType || "").toLowerCase() === String(specifiedTxType).toLowerCase())
        : this.seriesMaster;
    } else {
      targetSeriesList = this.seriesMaster.filter(s => String(s.id) === String(seriesId));
    }

    if (targetSeriesList.length === 0) {
      return { success: false, message: "No matching series found to rearrange." };
    }

    let totalRearranged = 0;
    const summaryDetails = [];

    const extractNumber = (str) => {
      if (!str) return 0;
      const matches = String(str).match(/(\d+)/g);
      if (matches && matches.length > 0) {
        return parseInt(matches[matches.length - 1], 10) || 0;
      }
      return 0;
    };

    targetSeriesList.forEach(series => {
      const sTxType = String(series.txType || "Sales").toLowerCase();
      const prefix = series.prefix || "";
      const prefixUpper = prefix.toUpperCase();
      const digits = parseInt(series.digits) || 4;
      let startNumber = customStartingNumber !== null ? parseInt(customStartingNumber) : (parseInt(series.startingNumber) || 1);
      if (isNaN(startNumber) || startNumber < 1) startNumber = 1;

      // Target the appropriate document collection for this series
      const collectionType = sTxType.includes("purchase") ? "purchase" : "sales";

      let targetCollection = [];
      let collectionName = "";
      if (sTxType.includes("purchase") && sTxType.includes("return")) {
        targetCollection = this.purchaseReturns || [];
        collectionName = "Purchase Return";
      } else if (sTxType.includes("sales") && sTxType.includes("return")) {
        targetCollection = this.salesReturns || [];
        collectionName = "Sales Return";
      } else if (sTxType.includes("purchase")) {
        targetCollection = this.purchases || [];
        collectionName = "Purchase";
      } else {
        targetCollection = this.invoices || [];
        collectionName = "Sales";
      }

      // Deduplicate object references in collection
      let seriesDocs = targetCollection.filter(doc => {
        if (!doc) return false;
        if (doc.seriesId && String(doc.seriesId) === String(series.id)) return true;
        if (!doc.seriesId && prefixUpper) {
          const vno = String(doc.voucherNo || doc.refNo || doc.id || "").toUpperCase();
          if (vno.startsWith(prefixUpper)) return true;
        }
        return false;
      });

      // Deduplicate object references
      const seenObjRefs = new Set();
      const uniqueDocs = [];
      seriesDocs.forEach(d => {
        if (d && !seenObjRefs.has(d)) {
          seenObjRefs.add(d);
          uniqueDocs.push(d);
        }
      });
      seriesDocs = uniqueDocs;

      if (seriesDocs.length === 0) {
        summaryDetails.push(`${series.name}: No bills found.`);
        return;
      }

      if (excludeCancelled) {
        const cancelledDocs = seriesDocs.filter(d => d.isCancelled || d.isCanceled || String(d.status).toUpperCase() === "CANCELLED");
        cancelledDocs.forEach(cd => {
          this.removeCancelledBill(cd.id, collectionType, false);
        });
        seriesDocs = seriesDocs.filter(d => !(d.isCancelled || d.isCanceled || String(d.status).toUpperCase() === "CANCELLED"));
      }

      if (seriesDocs.length === 0) {
        summaryDetails.push(`${series.name}: All bills were cancelled and removed.`);
        return;
      }

      // Sort in Ascending Order by Date (Chronological) FIRST, then by createdAt as tiebreaker
      seriesDocs.sort((a, b) => {
        const dateIsoA = toIsoDateStr(a.date);
        const dateIsoB = toIsoDateStr(b.date);
        if (dateIsoA !== dateIsoB) return dateIsoA.localeCompare(dateIsoB);

        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdA - createdB;
      });

      // Renumber sequentially without skipping
      const idMappings = new Map();

      seriesDocs.forEach((doc, idx) => {
        const seqNum = startNumber + idx;
        const newVoucherNo = prefix + String(seqNum).padStart(digits, '0');

        const oldId = String(doc.id || "").trim();
        const oldVno = String(doc.voucherNo || "").trim();
        const oldRef = String(doc.refNo || "").trim();

        doc.seriesId = series.id;
        doc.voucherNo = newVoucherNo;
        doc.refNo = newVoucherNo;
        doc.id = newVoucherNo;
        if (doc.billNo) doc.billNo = newVoucherNo;

        if (oldId) idMappings.set(oldId, newVoucherNo);
        if (oldVno && oldVno !== oldId) idMappings.set(oldVno, newVoucherNo);
        if (oldRef && oldRef !== oldId && oldRef !== oldVno) idMappings.set(oldRef, newVoucherNo);
      });

      // Update double-entry accounting transactions references
      if (this.transactions && Array.isArray(this.transactions)) {
        this.transactions.forEach(tx => {
          if (!tx) return;
          const txIdStr = String(tx.id || "").trim();
          const txVIdStr = String(tx.voucherId || "").trim();
          const txVNoStr = String(tx.voucherNo || "").trim();
          const txRefStr = String(tx.reference || "").trim();

          idMappings.forEach((newVno, oldVal) => {
            if (!oldVal) return;
            if (txIdStr === oldVal) tx.id = newVno;
            if (txVIdStr === oldVal) tx.voucherId = newVno;
            if (txVNoStr === oldVal) tx.voucherNo = newVno;

            if (txRefStr === oldVal) {
              tx.reference = newVno;
            } else if (txRefStr.includes(oldVal)) {
              tx.reference = txRefStr.split(oldVal).join(newVno);
            }

            if (tx.description && tx.description.includes(oldVal)) {
              tx.description = tx.description.split(oldVal).join(newVno);
            }

            if (tx.entries && Array.isArray(tx.entries)) {
              tx.entries.forEach(e => {
                if (e.description && e.description.includes(oldVal)) {
                  e.description = e.description.split(oldVal).join(newVno);
                }
              });
            }
          });
        });
      }

      // Recreate double-entry transactions for exact accounting precision
      seriesDocs.forEach(doc => {
        if (sTxType.includes("purchase")) {
          this.recreatePurchaseTransaction(doc);
        } else if (!sTxType.includes("return")) {
          this.recreateInvoiceTransaction(doc);
        }
      });

      totalRearranged += seriesDocs.length;
      const endSeq = startNumber + seriesDocs.length - 1;
      const startFmt = `${prefix}${String(startNumber).padStart(digits, '0')}`;
      const endFmt = `${prefix}${String(endSeq).padStart(digits, '0')}`;
      summaryDetails.push(`${series.name} (${series.txType}): ${seriesDocs.length} bill(s) rearranged in ascending order (${startFmt} to ${endFmt}).`);
    });

    // Sort this.invoices and this.purchases arrays in place by normalized date ascending & voucher number ascending
    if (this.invoices && Array.isArray(this.invoices)) {
      this.invoices.sort((a, b) => {
        if (!a) return 1;
        if (!b) return -1;
        const dateA = toIsoDateStr(a.date);
        const dateB = toIsoDateStr(b.date);
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const numA = extractNumber(a.voucherNo || a.refNo || a.id);
        const numB = extractNumber(b.voucherNo || b.refNo || b.id);
        if (numA !== numB) return numA - numB;
        return String(a.voucherNo || a.id || "").localeCompare(String(b.voucherNo || b.id || ""));
      });
    }

    if (this.purchases && Array.isArray(this.purchases)) {
      this.purchases.sort((a, b) => {
        if (!a) return 1;
        if (!b) return -1;
        const dateA = toIsoDateStr(a.date);
        const dateB = toIsoDateStr(b.date);
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const numA = extractNumber(a.voucherNo || a.refNo || a.id);
        const numB = extractNumber(b.voucherNo || b.refNo || b.id);
        if (numA !== numB) return numA - numB;
        return String(a.voucherNo || a.id || "").localeCompare(String(b.voucherNo || b.id || ""));
      });
    }

    this.realignSeriesCurrentNumbers();
    this.recomputeAllStocks();
    this.invalidateBalancesCache();
    this.saveState();
    this.notifyListeners();

    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("erp:data-refreshed"));
    }

    return {
      success: true,
      totalRearranged,
      details: summaryDetails,
      message: `Successfully rearranged ${totalRearranged} bill(s) in ascending order without skipping series numbers.`
    };
  }


  getVoucherCategory(tx) {
    if (!tx) return null;

    // Check if tx is attached to an invoice, purchase bill, or return document
    const docRefSet = new Set();
    (this.purchases || []).forEach(p => {
      if (!p) return;
      if (p.voucherNo) docRefSet.add(String(p.voucherNo).trim().toUpperCase());
      if (p.refNo) docRefSet.add(String(p.refNo).trim().toUpperCase());
      if (p.id) docRefSet.add(String(p.id).trim().toUpperCase());
    });
    (this.invoices || []).forEach(i => {
      if (!i) return;
      if (i.voucherNo) docRefSet.add(String(i.voucherNo).trim().toUpperCase());
      if (i.refNo) docRefSet.add(String(i.refNo).trim().toUpperCase());
      if (i.id) docRefSet.add(String(i.id).trim().toUpperCase());
    });

    const refClean = String(tx.reference || tx.voucherNo || tx.id || "").trim();
    const refUpper = refClean.toUpperCase();
    const refLower = refClean.toLowerCase();
    const vTypeUpper = String(tx.voucherType || "").trim().toUpperCase();

    if (docRefSet.has(refUpper) || refUpper.includes("COGS")) {
      return null; // Invoice / Purchase transaction, not manual voucher
    }

    const cashBankIds = new Set(
      (this.getLedgers() || [])
        .filter(l => l.groupName === "CASH-IN-HAND" || l.groupName === "BANK ACCOUNTS")
        .map(l => l.code)
    );
    cashBankIds.add("1010");
    cashBankIds.add("1020");

    const entries = tx.entries || [];
    const debitsCashBank = entries.some(e => cashBankIds.has(e.accountId) && parseFloat(e.debit) > 0);
    const creditsCashBank = entries.some(e => cashBankIds.has(e.accountId) && parseFloat(e.credit) > 0);
    const creditsNonCashBank = entries.some(e => !cashBankIds.has(e.accountId) && parseFloat(e.credit) > 0);
    const debitsNonCashBank = entries.some(e => !cashBankIds.has(e.accountId) && parseFloat(e.debit) > 0);
    const onlyCashBank = entries.length > 0 && entries.every(e => cashBankIds.has(e.accountId));

    // 1. Contra Check
    if (
      vTypeUpper === "CONTRA" || vTypeUpper === "CON" ||
      refUpper.startsWith("CO-") || refUpper.startsWith("CNTR-") ||
      (refUpper.startsWith("CO") && !refUpper.startsWith("COGS")) ||
      (onlyCashBank && debitsCashBank && creditsCashBank && entries.length === 2)
    ) {
      return "contra";
    }

    // 2. Receipt Check
    if (
      vTypeUpper === "RECEIPT" || vTypeUpper === "REC" ||
      refUpper.startsWith("RC-") || refUpper.startsWith("RC") ||
      refLower.includes("receipt") || refLower.includes("rcpt") ||
      (refUpper.startsWith("R") && !refUpper.startsWith("RC-") && !refUpper.startsWith("RCPT") && !refUpper.startsWith("RECEIPT") && /^[R]\d+$/.test(refUpper)) ||
      (debitsCashBank && creditsNonCashBank)
    ) {
      return "receipt";
    }

    // 3. Payment Check
    if (
      vTypeUpper === "PAYMENT" || vTypeUpper === "PAY" ||
      refUpper.startsWith("PM-") || refUpper.startsWith("PM") ||
      refLower.includes("payment") || refLower.includes("pay") ||
      (refUpper.startsWith("P") && !refUpper.startsWith("PR") && !refUpper.startsWith("PM") && /^[P]\d+$/.test(refUpper)) ||
      (creditsCashBank && debitsNonCashBank)
    ) {
      return "payment";
    }

    // 4. Debit Note Check
    if (
      vTypeUpper === "DEBIT NOTE" || vTypeUpper === "DEBIT" || vTypeUpper === "DN" ||
      refUpper.startsWith("DN-") || refUpper.startsWith("DN") ||
      refLower.includes("debit note") || refLower.includes("dbn-") ||
      (refUpper.startsWith("D") && /^[D]\d+$/.test(refUpper))
    ) {
      return "debit";
    }

    // 5. Credit Note Check
    if (
      vTypeUpper === "CREDIT NOTE" || vTypeUpper === "CREDIT" || vTypeUpper === "CN" ||
      refUpper.startsWith("CN-") || refUpper.startsWith("CN") ||
      refLower.includes("credit note") || refLower.includes("crn-") ||
      (refUpper.startsWith("C") && !refUpper.startsWith("CN-") && !refUpper.startsWith("CO-") && !refUpper.startsWith("COGS") && /^[C]\d+$/.test(refUpper))
    ) {
      return "credit";
    }

    // 6. Journal Check
    if (
      vTypeUpper === "JOURNAL" || vTypeUpper === "JV" ||
      refUpper.startsWith("JV-") || refUpper.startsWith("JV") ||
      refLower.includes("journal") ||
      (refUpper.startsWith("J") && /^[J]\d+$/.test(refUpper))
    ) {
      return "journal";
    }

    return "journal"; // Default fallback for manual vouchers
  }

  getVouchersForRearrange(options = {}) {
    const {
      voucherType = "receipt",
      prefix = null,
      startingNumber = 1,
      digits = null,
      dateScope = "current_fy",
      fromDate = null,
      toDate = null
    } = options;

    let startDate = null;
    let endDate = null;

    if (dateScope === "current_fy") {
      startDate = this.getActiveFinancialYearStartDate ? this.getActiveFinancialYearStartDate() : "2026-04-01";
      endDate = this.getActiveFinancialYearEndDate ? this.getActiveFinancialYearEndDate() : "2027-03-31";
    } else if (dateScope === "custom") {
      startDate = fromDate;
      endDate = toDate;
    }

    const startIso = startDate ? toIsoDateStr(startDate) : null;
    const endIso = endDate ? toIsoDateStr(endDate) : null;

    const extractNumber = (str) => {
      if (!str) return 0;
      const matches = String(str).match(/(\d+)/g);
      if (matches && matches.length > 0) {
        return parseInt(matches[matches.length - 1], 10) || 0;
      }
      return 0;
    };

    const extractPrefixAndDigits = (ref, defaultPrefix, defaultDigits = 3) => {
      if (!ref) return { prefix: defaultPrefix, digits: defaultDigits };
      const str = String(ref).trim();
      const match = str.match(/^([A-Za-z\-_]+)(\d+)$/);
      if (match) {
        return {
          prefix: match[1],
          digits: match[2].length
        };
      }
      return { prefix: defaultPrefix, digits: defaultDigits };
    };

    const DEFAULT_PREFIXES = {
      receipt: "RC-",
      payment: "PM-",
      contra: "CO-",
      journal: "JV-",
      debit: "DN-",
      credit: "CN-"
    };

    const typesToProcess = String(voucherType).toUpperCase() === "ALL"
      ? ["receipt", "payment", "contra", "journal", "debit", "credit"]
      : [String(voucherType).toLowerCase()];

    const allTxs = this.transactions || [];
    const results = [];

    typesToProcess.forEach(type => {
      const typeTxs = allTxs.filter(tx => {
        if (!tx || !tx.id || tx.isCancelled) return false;
        const cat = this.getVoucherCategory(tx);
        if (cat !== type) return false;

        const txDateIso = toIsoDateStr(tx.date);
        if (!txDateIso) return false;
        if (startIso && txDateIso < startIso) return false;
        if (endIso && txDateIso > endIso) return false;
        return true;
      });

      if (typeTxs.length === 0) return;

      // Detect prefix & digits from existing vouchers if not explicitly customized
      let typePrefix = prefix;
      let typeDigits = digits !== null && digits !== undefined && !isNaN(parseInt(digits)) ? parseInt(digits) : null;

      if (!typePrefix) {
        const prefixCounts = {};
        typeTxs.forEach(tx => {
          const info = extractPrefixAndDigits(tx.reference || tx.voucherNo, DEFAULT_PREFIXES[type] || "V-", 3);
          prefixCounts[info.prefix] = (prefixCounts[info.prefix] || 0) + 1;
        });
        let maxCount = 0;
        let bestPrefix = DEFAULT_PREFIXES[type] || "V-";
        Object.keys(prefixCounts).forEach(p => {
          if (prefixCounts[p] > maxCount) {
            maxCount = prefixCounts[p];
            bestPrefix = p;
          }
        });
        typePrefix = bestPrefix;
      }

      if (!typeDigits || typeDigits < 1) {
        let maxDigits = 0;
        typeTxs.forEach(tx => {
          const str = String(tx.reference || tx.voucherNo || "").trim();
          const match = str.match(/^([A-Za-z\-_]+)(\d+)$/);
          if (match && match[2].length > maxDigits) {
            maxDigits = match[2].length;
          }
        });
        typeDigits = maxDigits >= 2 ? maxDigits : 3;
      }

      let startNum = startingNumber !== null && startingNumber !== undefined && !isNaN(parseInt(startingNumber))
        ? parseInt(startingNumber)
        : 1;
      if (startNum < 1) startNum = 1;

      // Sort in Ascending Order by Date (Chronological)
      const sortedTxs = [...typeTxs].sort((a, b) => {
        const dateIsoA = toIsoDateStr(a.date);
        const dateIsoB = toIsoDateStr(b.date);
        if (dateIsoA !== dateIsoB) return dateIsoA.localeCompare(dateIsoB);

        const numA = extractNumber(a.reference || a.voucherNo || a.id);
        const numB = extractNumber(b.reference || b.voucherNo || b.id);
        if (numA !== numB) return numA - numB;

        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (createdA !== createdB) return createdA - createdB;

        return String(a.id || "").localeCompare(String(b.id || ""));
      });

      sortedTxs.forEach((tx, idx) => {
        const seqNum = startNum + idx;
        const newVoucherNo = typePrefix + String(seqNum).padStart(typeDigits, '0');
        results.push({
          type,
          tx,
          oldVoucherNo: String(tx.reference || tx.voucherNo || tx.id || "").trim(),
          newVoucherNo,
          date: tx.date,
          dateIso: toIsoDateStr(tx.date),
          description: tx.description || "",
          entries: tx.entries || []
        });
      });
    });

    return results;
  }

  rearrangeVouchersByDate(options = {}) {
    const previewList = this.getVouchersForRearrange(options);
    if (!previewList || previewList.length === 0) {
      return { success: false, message: "No vouchers found matching the specified criteria to rearrange." };
    }

    const idMappings = new Map();
    let totalRearranged = 0;
    const summaryByType = {};

    previewList.forEach(item => {
      const { tx, oldVoucherNo, newVoucherNo, type } = item;
      if (!tx) return;

      const oldId = String(tx.id || "").trim();
      const oldRef = String(tx.reference || "").trim();
      const oldVno = String(tx.voucherNo || "").trim();

      tx.voucherNo = newVoucherNo;
      tx.reference = newVoucherNo;
      tx.voucherType = type.toUpperCase();

      if (oldRef && oldRef !== newVoucherNo) idMappings.set(oldRef, newVoucherNo);
      if (oldVno && oldVno !== newVoucherNo) idMappings.set(oldVno, newVoucherNo);
      if (oldId && oldId !== newVoucherNo && !oldId.startsWith("TX-")) idMappings.set(oldId, newVoucherNo);

      totalRearranged++;
      if (!summaryByType[type]) {
        summaryByType[type] = { count: 0, startVno: newVoucherNo, endVno: newVoucherNo };
      }
      summaryByType[type].count++;
      summaryByType[type].endVno = newVoucherNo;
    });

    // Update references in double-entry transactions
    if (idMappings.size > 0 && this.transactions && Array.isArray(this.transactions)) {
      this.transactions.forEach(tx => {
        if (!tx) return;
        idMappings.forEach((newVno, oldVal) => {
          if (!oldVal || oldVal === newVno) return;
          if (tx.description && tx.description.includes(oldVal)) {
            tx.description = tx.description.split(oldVal).join(newVno);
          }
          if (tx.entries && Array.isArray(tx.entries)) {
            tx.entries.forEach(e => {
              if (e.description && e.description.includes(oldVal)) {
                e.description = e.description.split(oldVal).join(newVno);
              }
            });
          }
        });
      });
    }

    // Sort this.transactions in place by Date ascending & voucher number ascending
    const extractNumber = (str) => {
      if (!str) return 0;
      const matches = String(str).match(/(\d+)/g);
      if (matches && matches.length > 0) {
        return parseInt(matches[matches.length - 1], 10) || 0;
      }
      return 0;
    };

    if (this.transactions && Array.isArray(this.transactions)) {
      this.transactions.sort((a, b) => {
        if (!a) return 1;
        if (!b) return -1;
        const dateA = toIsoDateStr(a.date);
        const dateB = toIsoDateStr(b.date);
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const numA = extractNumber(a.reference || a.voucherNo || a.id);
        const numB = extractNumber(b.reference || b.voucherNo || b.id);
        if (numA !== numB) return numA - numB;
        return String(a.reference || a.id || "").localeCompare(String(b.reference || b.id || ""));
      });
    }

    const summaryDetails = Object.keys(summaryByType).map(t => {
      const s = summaryByType[t];
      const typeLabel = t.charAt(0).toUpperCase() + t.slice(1);
      return `${typeLabel} Vouchers: ${s.count} voucher(s) reset in chronological date order (${s.startVno} to ${s.endVno}).`;
    });

    this.realignSeriesCurrentNumbers();
    this.invalidateBalancesCache();
    this.saveState(true);
    this.notifyListeners();

    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("erp:data-refreshed"));
    }

    return {
      success: true,
      totalRearranged,
      details: summaryDetails,
      message: `Successfully reset & rearranged ${totalRearranged} voucher(s) in chronological ascending order by Date.`
    };
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
      const activeId = this.getActiveCompanyId();
      try {
        const ls = localStorage.getItem(`erp_headloader_products_${activeId}`);
        if (ls) {
          const parsed = JSON.parse(ls);
          if (Array.isArray(parsed)) this.headloaderProductIds = parsed;
        }
      } catch (e) {}
      if (!Array.isArray(this.headloaderProductIds)) {
        this.headloaderProductIds = [];
      }
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
     const txDate = doc.date || new Date().toISOString().split("T")[0];
     const fyCheck = this.isPreviousFyLocked(txDate);
     if (fyCheck.locked) {
       alert(fyCheck.reason);
       return false;
     }
     this.validateTransactionDate(txDate);
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
     const fyCheck = this.isPreviousFyLocked(doc.date);
     if (fyCheck.locked) {
       alert(fyCheck.reason);
       return false;
     }
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
    } else {
      const existingUpper = new Set(this.accountGroups.map(g => String(g.name || "").trim().toUpperCase()));
      initialAccountGroups.forEach(ig => {
        if (ig && ig.name && !existingUpper.has(String(ig.name).trim().toUpperCase())) {
          this.accountGroups.push({ ...ig, isDefault: true });
        }
      });
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
  
  purgeContactLedgers() {
    if (!this.ledgers || !this.contacts || this.contacts.length === 0) return;
    const protectedGroups = new Set([
      "CASH-IN-HAND", "CASH IN HAND", "BANK ACCOUNTS", "BANK ACCOUNT", "FIXED ASSETS", "CAPITAL ACCOUNT", "EQUITY",
      "DUTIES & TAXES", "INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST",
      "PURCHASE ACCOUNT", "SALES ACCOUNT", "INDIRECT EXPENSES", "INDIRECT INCOME", "DIRECT EXPENSES", "DIRECT INCOME",
      "DEPOSITS", "DEPOSITS (ASSETS)", "OTHER CURRENT ASSETS", "CURRENT ASSETS", "CURRENT LIABILITIES",
      "OUTSTANDING LIABILITIES & PROVISIONS", "PROVISIONS", "ADJUSTMENTS", "DEPRECIATION", "SALARY", "UNSECURED LOANS", "SUSPENSE A/C"
    ]);

    const contactNames = new Set(this.contacts.map(c => (c.name || "").trim().toUpperCase()).filter(Boolean));
    const contactIds = new Set(this.contacts.map(c => (c.id || "").trim().toUpperCase()).filter(Boolean));
    const initialCount = this.ledgers.length;

    this.ledgers = this.ledgers.filter(l => {
      if (!l || !l.name) return false;
      const gName = String(l.groupName || "").trim().toUpperCase();
      if (protectedGroups.has(gName)) return true;

      const isExplicitSubledger = !!(l.parentCustomerId || l.isCustomerSubLedger || l.isVendorSubLedger || l.isContactLedger);
      const isContactGroup = gName === "SUNDRY DEBTORS" || gName === "SUNDRY CREDITORS" || gName === "CUSTOMERS" || gName === "VENDORS";
      const cleanName = String(l.name).trim().toUpperCase();

      if (isExplicitSubledger) return false;
      if (isContactGroup && contactNames.has(cleanName)) return false;
      if (l.parentCustomerId && contactIds.has(String(l.parentCustomerId).trim().toUpperCase())) return false;

      return true;
    });

    if (this.ledgers.length !== initialCount) {
      console.log(`[PURGE] Removed ${initialCount - this.ledgers.length} contact subledgers.`);
      this.saveState();
    }
  }

  deduplicateAndEnforceUniqueLedgers(shouldSave = true) {
    if (!this.ledgers || !Array.isArray(this.ledgers)) return;
    let changed = false;
    const seen = new Set();
    const clean = [];

    this.ledgers.forEach(l => {
      if (!l) return;
      const code = String(l.code || l.id || "").trim().toUpperCase();
      const name = String(l.name || "").trim().toUpperCase();
      const key = code ? `code:${code}` : `name:${name}`;

      if (key) {
        if (!seen.has(key)) {
          seen.add(key);
          clean.push(l);
        } else {
          changed = true;
        }
      } else {
        clean.push(l);
      }
    });

    if (clean.length !== this.ledgers.length) {
      this.ledgers = clean;
      changed = true;
    }

    if (changed && shouldSave) {
      this.saveState(true);
    }
  }

  getLedgers() {
    this.deduplicateAndEnforceUniqueLedgers(false);
    this.ensureDefaultLedgers();
    this.ensureStandardGstLedgers();
    this.purgeContactLedgers();
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
    if (this._canonicalAccountCache && this._canonicalAccountCache.has(strId)) {
      return this._canonicalAccountCache.get(strId);
    }
    const res = this._computeCanonicalAccountId(strId);
    if (!this._canonicalAccountCache) {
      this._canonicalAccountCache = new Map();
    }
    this._canonicalAccountCache.set(strId, res);
    return res;
  }

  _computeCanonicalAccountId(strId) {
    if (ACCOUNTS[strId]) return strId;

    const baseId = strId.includes("::") ? strId.split("::")[0] : strId;
    const site = strId.includes("::") ? strId.split("::")[1] : "";

    // 1. Direct Contact match (by ID, ledgerCode, or normalized name)
    if (this.contacts) {
      for (let i = 0; i < this.contacts.length; i++) {
        const c = this.contacts[i];
        const cNormName = String(c.name || "").trim().toUpperCase();
        if (c.id === baseId || (c.ledgerCode && c.ledgerCode === baseId) || (cNormName && cNormName === baseId.toUpperCase())) {
          const canonical = c.id;
          return site ? `${canonical}::${site}` : canonical;
        }
      }
    }

    // 2. Direct Ledger match
    if (this.ledgers) {
      for (let i = 0; i < this.ledgers.length; i++) {
        const l = this.ledgers[i];
        const lNormName = String(l.name || "").trim().toUpperCase();
        if (l.code === baseId || (lNormName && lNormName === baseId.toUpperCase())) {
          if (this.contacts) {
            const cMatch = this.contacts.find(c => c.ledgerCode === l.code || c.id === l.code || (c.name && String(c.name).trim().toUpperCase() === lNormName));
            if (cMatch) return site ? `${cMatch.id}::${site}` : cMatch.id;
          }
          return site ? `${l.code}::${site}` : l.code;
        }
      }
    }

    // 3. Flexible L-code and CUST/VEND matching
    const matchL = baseId.match(/^L0*(\d+)$/i);
    if (matchL) {
      const num = parseInt(matchL[1], 10);
      const p3 = "L" + String(num).padStart(3, "0");
      const p4 = "L" + String(num).padStart(4, "0");
      const unp = "L" + String(num);

      const custP3 = "CUST-" + String(num).padStart(3, "0");
      const custP4 = "CUST-" + String(num).padStart(4, "0");
      const vendP3 = "VEND-" + String(num).padStart(3, "0");
      const vendP4 = "VEND-" + String(num).padStart(4, "0");

      if (this.contacts) {
        const cMatch = this.contacts.find(c => 
          c.ledgerCode === p3 || c.id === p3 || c.ledgerCode === p4 || c.id === p4 || c.ledgerCode === unp || c.id === unp ||
          c.id === custP3 || c.ledgerCode === custP3 || c.id === custP4 || c.ledgerCode === custP4 ||
          c.id === vendP3 || c.ledgerCode === vendP3 || c.id === vendP4 || c.ledgerCode === vendP4 ||
          (c.tradeasyLedgerId && c.tradeasyLedgerId === num)
        );
        if (cMatch) return site ? `${cMatch.id}::${site}` : cMatch.id;
      }

      if (this.ledgers) {
        const lMatch = this.ledgers.find(l => l.code === p3 || l.code === p4 || l.code === unp || l.tradeasyId === num);
        if (lMatch) return site ? `${lMatch.code}::${site}` : lMatch.code;
      }
    }

    return strId;
  }

  getAccountDisplayName(accId, tx = null) {
    if (!accId) return "";
    const strId = String(accId).trim();
    const baseId = strId.includes("::") ? strId.split("::")[0] : strId;
    const sitePart = strId.includes("::") ? strId.split("::")[1] : "";
    const canonicalId = this.getCanonicalAccountId(baseId);

    // 1. Control accounts (1100 / 2100) with tx context or description resolution
    if (baseId === "1100" || baseId === "2100" || canonicalId === "1100" || canonicalId === "2100") {
      if (tx) {
        if (tx.contactName) return sitePart ? `${tx.contactName} (${sitePart})` : tx.contactName;
        if (tx.supplierName) return sitePart ? `${tx.supplierName} (${sitePart})` : tx.supplierName;
        const desc = tx.description || "";
        if (desc.includes("Receipt from Customer:")) {
          const parsed = desc.replace("Receipt from Customer:", "").split("(")[0].trim();
          if (parsed) return sitePart ? `${parsed} (${sitePart})` : parsed;
        }
        if (desc.includes("Receipt from Supplier:")) {
          const parsed = desc.replace("Receipt from Supplier:", "").split("(")[0].trim();
          if (parsed) return sitePart ? `${parsed} (${sitePart})` : parsed;
        }
        if (desc.includes("Payment to Supplier:")) {
          const parsed = desc.replace("Payment to Supplier:", "").split("(")[0].trim();
          if (parsed) return sitePart ? `${parsed} (${sitePart})` : parsed;
        }
        if (desc.includes("Payment to Customer:")) {
          const parsed = desc.replace("Payment to Customer:", "").split("(")[0].trim();
          if (parsed) return sitePart ? `${parsed} (${sitePart})` : parsed;
        }
      }
    }

    // 2. Direct match in contacts list (check contacts FIRST)
    if (this.contacts && Array.isArray(this.contacts)) {
      const baseUpper = baseId.toUpperCase();
      const matchC = this.contacts.find(c => {
        if (!c) return false;
        if (c.id === baseId || c.id === canonicalId) return true;
        if (c.ledgerCode && (c.ledgerCode === baseId || c.ledgerCode === canonicalId)) return true;
        if (c.code && (c.code === baseId || c.code === canonicalId)) return true;
        if (c.tradeasyLedgerId && (String(c.tradeasyLedgerId) === baseId || String(c.tradeasyLedgerId) === canonicalId)) return true;
        if (c.name && c.name.trim().toUpperCase() === baseUpper) return true;
        const cCan = this.getCanonicalAccountId(c.id);
        if (cCan && (cCan === canonicalId || cCan === baseId)) return true;
        return false;
      });
      if (matchC && matchC.name) {
        return sitePart ? `${matchC.name} (${sitePart})` : matchC.name;
      }
    }

    // 3. Direct match in ledgers list
    if (this.ledgers && Array.isArray(this.ledgers)) {
      const baseUpper = baseId.toUpperCase();
      const matchL = this.ledgers.find(l => {
        if (!l) return false;
        if (l.code === baseId || l.code === canonicalId) return true;
        if (l.id && (l.id === baseId || l.id === canonicalId)) return true;
        if (l.tradeasyId && (String(l.tradeasyId) === baseId || String(l.tradeasyId) === canonicalId)) return true;
        if (l.name && l.name.trim().toUpperCase() === baseUpper) return true;
        const lCan = this.getCanonicalAccountId(l.code);
        if (lCan && (lCan === canonicalId || lCan === baseId)) return true;
        return false;
      });
      if (matchL) {
        // If this ledger belongs to a contact, return the contact's name instead
        if (this.contacts && Array.isArray(this.contacts)) {
          const normName = String(matchL.name || "").trim().toUpperCase();
          const parentC = this.contacts.find(c => c && (c.ledgerCode === matchL.code || c.id === matchL.code || (c.name && String(c.name).trim().toUpperCase() === normName)));
          if (parentC && parentC.name) {
            return sitePart ? `${parentC.name} (${sitePart})` : parentC.name;
          }
        }
        if (matchL.name && !matchL.name.match(/^L\d+$/i)) return sitePart ? `${matchL.name} (${sitePart})` : matchL.name;
      }
    }

    // 4. Static Accounts
    if (ACCOUNTS[baseId] && ACCOUNTS[baseId].name) {
      return sitePart ? `${ACCOUNTS[baseId].name} (${sitePart})` : ACCOUNTS[baseId].name;
    }
    if (ACCOUNTS[canonicalId] && ACCOUNTS[canonicalId].name) {
      return sitePart ? `${ACCOUNTS[canonicalId].name} (${sitePart})` : ACCOUNTS[canonicalId].name;
    }

    // 5. Unpadded L-codes or CUST/VEND codes
    const matchLCode = baseId.match(/^L(\d+)$/i);
    if (matchLCode) {
      const padded = "L" + matchLCode[1].padStart(4, "0");
      if (this.contacts) {
        const cMatch = this.contacts.find(c => c && (c.ledgerCode === padded || c.id === padded));
        if (cMatch && cMatch.name) return sitePart ? `${cMatch.name} (${sitePart})` : cMatch.name;
      }
      if (this.ledgers) {
        const lMatch = this.ledgers.find(l => l && (l.code === padded || l.id === padded));
        if (lMatch) {
          const cMatch = this.contacts?.find(c => c && (c.ledgerCode === lMatch.code || c.id === lMatch.code));
          if (cMatch && cMatch.name) return sitePart ? `${cMatch.name} (${sitePart})` : cMatch.name;
          if (lMatch.name && !lMatch.name.match(/^L\d+$/i)) return sitePart ? `${lMatch.name} (${sitePart})` : lMatch.name;
        }
      }
    }

    const matchCustCode = baseId.match(/^(CUST|VEND)-(\d+)$/i);
    if (matchCustCode) {
      const padded = matchCustCode[1].toUpperCase() + "-" + matchCustCode[2].padStart(4, "0");
      if (this.contacts) {
        const cMatch = this.contacts.find(c => c && (c.id === padded || c.ledgerCode === padded));
        if (cMatch && cMatch.name) return sitePart ? `${cMatch.name} (${sitePart})` : cMatch.name;
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

    const outputCgstCode = "L0053";
    const outputSgstCode = "L0048";
    const outputIgstCode = "L0058";
    const inputCgstCode = "L0038";
    const inputSgstCode = "L0033";
    const inputIgstCode = "L0043";
    const roundOffCode = "L0012";

    [outputCgstCode, outputSgstCode, outputIgstCode, inputCgstCode, inputSgstCode, inputIgstCode, roundOffCode].forEach(code => {
      if (!balances[code]) balances[code] = { balance: 0 };
    });

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
            if (siteOpBal !== 0 && balances[controlAcc]) {
              balances[controlAcc].balance += siteOpBal;
            }
          });
        } else {
          let opBal = parseFloat(c.openingBalance) || 0;
          if (opBal !== 0 && bType === "Credit") opBal = -Math.abs(opBal);
          else if (opBal !== 0 && bType === "Debit") opBal = Math.abs(opBal);
          balances[c.id] = { balance: opBal };
          if (opBal !== 0 && balances[controlAcc]) {
            balances[controlAcc].balance += opBal;
          }
        }
      });
    }

    const seenTxIds = new Set();
    const txsByRef = new Set();

    (this.transactions || []).forEach(tx => {
      if (!tx || !tx.id || seenTxIds.has(tx.id) || tx.isCancelled || this.isTransactionForCancelledDoc(tx)) return;
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

    const getGstHelper = (doc, isPurchase = false) => {
      let cgst = parseFloat(doc.cgst || 0);
      let sgst = parseFloat(doc.sgst || 0);
      let igst = parseFloat(doc.igst || 0);

      if (cgst === 0 && sgst === 0 && igst === 0) {
        const totalGst = parseFloat(doc.totalGst || 0);
        if (totalGst > 0) {
          const isInterstate = doc.state && doc.state.toUpperCase() !== "KERALA";
          if (isInterstate) {
            igst = totalGst;
          } else {
            cgst = totalGst / 2;
            sgst = totalGst / 2;
          }
        } else if (doc.items && Array.isArray(doc.items)) {
          doc.items.forEach(item => {
            const itemGst = parseFloat(item.gstAmount || 0);
            if (itemGst > 0) {
              const isInterstate = doc.state && doc.state.toUpperCase() !== "KERALA";
              if (isInterstate) {
                igst += itemGst;
              } else {
                cgst += itemGst / 2;
                sgst += itemGst / 2;
              }
            }
          });
        }
      }
      return { cgst, sgst, igst };
    };

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
          const sub = (parseFloat(inv.subtotal) || 0) - (parseFloat(inv.totalDiscount) || 0);
          if (!balances["L0004"]) balances["L0004"] = { balance: 0 };
          balances["L0004"].balance -= sub;

          const amt = parseFloat(inv.total) || 0;
          if (balances[contact.id]) balances[contact.id].balance += amt;
          const controlAcc = (contact.type === "supplier" || contact.listInVendorList || contact.groupName === "SUNDRY CREDITORS") ? "2100" : "1100";
          if (balances[controlAcc]) {
            balances[controlAcc].balance += amt;
          }

          const gst = getGstHelper(inv, false);
          balances[outputCgstCode].balance -= gst.cgst;
          balances[outputSgstCode].balance -= gst.sgst;
          balances[outputIgstCode].balance -= gst.igst;

          const ro = parseFloat(inv.roundOff || inv.roundoff || 0);
          if (ro !== 0) balances[roundOffCode].balance += ro;
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
          const sub = (parseFloat(pur.subtotal) || 0) - (parseFloat(pur.totalDiscount) || 0);
          if (!balances["L0005"]) balances["L0005"] = { balance: 0 };
          balances["L0005"].balance += sub;

          const amt = parseFloat(pur.total) || 0;
          if (balances[contact.id]) balances[contact.id].balance -= amt;
          const controlAcc = (contact.type === "supplier" || contact.listInVendorList || contact.groupName === "SUNDRY CREDITORS") ? "2100" : "1100";
          if (balances[controlAcc]) {
            balances[controlAcc].balance -= amt;
          }

          const gst = getGstHelper(pur, true);
          balances[inputCgstCode].balance += gst.cgst;
          balances[inputSgstCode].balance += gst.sgst;
          balances[inputIgstCode].balance += gst.igst;

          const ro = parseFloat(pur.roundOff || pur.roundoff || 0);
          if (ro !== 0) balances[roundOffCode].balance += ro;
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
    const txDate = purchaseData.date || new Date().toISOString().split("T")[0];
    const fyCheck = this.isPreviousFyLocked(txDate);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }
    this.validateTransactionDate(txDate);
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

    let tempSubtotal = 0;
    let tempRowDiscount = 0;
    purchaseData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      if (mat) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price) || 0;
        const discountPercent = parseFloat(item.rowDiscountPercent !== undefined ? item.rowDiscountPercent : item.discountPercent) || 0;
        let rowDisAmt = item.rowDiscountAmount !== undefined ? parseFloat(item.rowDiscountAmount) : 0;
        const amt = qty * rate;
        if (discountPercent !== 0 && rowDisAmt === 0) {
          rowDisAmt = amt * (discountPercent / 100);
        } else if (discountPercent !== 0) {
          rowDisAmt = amt * (discountPercent / 100);
        } else if (rowDisAmt === 0 && item.discountAmount !== undefined && (parseFloat(purchaseData.discountAmount) || 0) === 0 && (parseFloat(purchaseData.discountPercent) || 0) === 0) {
          rowDisAmt = parseFloat(item.discountAmount) || 0;
        }
        tempSubtotal += amt;
        tempRowDiscount += rowDisAmt;
      }
    });
    const baseSubtotalNet = tempSubtotal - tempRowDiscount;

    let generalDiscPercent = parseFloat(purchaseData.discountPercent) || 0;
    let generalDiscAmount = parseFloat(purchaseData.discountAmount) || 0;
    if (baseSubtotalNet > 0) {
      if (generalDiscPercent !== 0 && generalDiscAmount === 0) {
        generalDiscAmount = baseSubtotalNet * (generalDiscPercent / 100);
      } else if (generalDiscAmount !== 0 && generalDiscPercent === 0) {
        generalDiscPercent = (generalDiscAmount / baseSubtotalNet) * 100;
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
      const discountPercent = parseFloat(item.rowDiscountPercent !== undefined ? item.rowDiscountPercent : item.discountPercent) || 0;
      let rowDisAmt = item.rowDiscountAmount !== undefined ? parseFloat(item.rowDiscountAmount) : 0;
      const amt = qty * rate;
      if (discountPercent !== 0 && rowDisAmt === 0) {
        rowDisAmt = amt * (discountPercent / 100);
      } else if (discountPercent !== 0) {
        rowDisAmt = amt * (discountPercent / 100);
      } else if (rowDisAmt === 0 && item.discountAmount !== undefined && generalDiscAmount === 0 && generalDiscPercent === 0) {
        rowDisAmt = parseFloat(item.discountAmount) || 0;
      }
      const taxableBeforeGeneral = amt - rowDisAmt;
      const genDisAmt = baseSubtotalNet > 0 ? (taxableBeforeGeneral / baseSubtotalNet) * generalDiscAmount : 0;
      const netVal = taxableBeforeGeneral - genDisAmt;

      subtotal += amt;
      totalDiscount += (rowDisAmt + genDisAmt);

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
      const newLandingCost = (oldStock > 0 && qty > 0)
        ? ((oldStock * (mat.landingCost || 0)) + (qty * (netVal / qty))) / (oldStock + qty)
        : (qty > 0 ? (netVal / qty) : (mat.landingCost || 0));
      mat.landingCost = newLandingCost;
      mat.costPrice = newLandingCost;

      purchaseItems.push({
        materialId: item.materialId,
        name: mat.name,
        code: mat.code || item.code || "",
        batchNo: item.batchNo || (rate > 0 ? String(rate) : (mat.landingCost ? String(mat.landingCost) : "")),
        quantity: qty,
        unit: item.unit || mat.unit,
        price: rate,
        landingCost: qty > 0 ? (netVal / qty) : rate,
        mrp: mrp,
        rowDiscountPercent: discountPercent,
        rowDiscountAmount: rowDisAmt,
        discountPercent: discountPercent,
        discountAmount: rowDisAmt + genDisAmt,
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
    const pId = pVoucherNo;
    const txId = pVoucherNo;
    purchaseData.id = pVoucherNo;
    purchaseData.voucherNo = pVoucherNo;

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

    const newPurDoc = {
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
      discountPercent: String(purchaseData.discountPercent || "0"),
      discountAmount: String(purchaseData.discountAmount || "0.00"),
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
    };

    const cleanPVUpper = String(pVoucherNo).trim().toUpperCase();
    const existingPurIdx = (this.purchases || []).findIndex(p => 
      p.id === pId || 
      (cleanPVUpper && String(p.voucherNo || p.refNo || "").trim().toUpperCase() === cleanPVUpper && !p.isCancelled && !p.isCanceled && String(p.status).toUpperCase() !== "CANCELLED")
    );

    if (existingPurIdx !== -1) {
      this.purchases[existingPurIdx] = newPurDoc;
    } else {
      this.purchases.push(newPurDoc);
    }

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
    const txDate = returnData.date || new Date().toISOString().split("T")[0];
    const fyCheck = this.isPreviousFyLocked(txDate);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }
    this.validateTransactionDate(txDate);
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
        batchNo: item.batchNo || "",
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
    const txDate = returnData.date || new Date().toISOString().split("T")[0];
    const fyCheck = this.isPreviousFyLocked(txDate);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }
    this.validateTransactionDate(txDate);
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
        batchNo: item.batchNo || "",
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
    const txDate = invoiceData.date || new Date().toISOString().split("T")[0];
    const fyCheck = this.isPreviousFyLocked(txDate);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return null;
    }
    this.validateTransactionDate(txDate);
    let customer = null;
    if (invoiceData.contactId === "__CASH__") {
      customer = { id: "__CASH__", name: "CASH SALES", balance: 0 };
    } else {
      customer = this.contacts.find(c => c.id === invoiceData.contactId && (c.type === "customer" || c.listInCustomerList === true));
    }
    if (!customer) return null;

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
        const discountPercent = parseFloat(item.rowDiscountPercent !== undefined ? item.rowDiscountPercent : item.discountPercent) || 0;
        let rowDisAmt = item.rowDiscountAmount !== undefined ? parseFloat(item.rowDiscountAmount) : 0;
        const amt = qty * rate;
        if (discountPercent !== 0 && rowDisAmt === 0) {
          rowDisAmt = amt * (discountPercent / 100);
        } else if (discountPercent !== 0) {
          rowDisAmt = amt * (discountPercent / 100);
        } else if (rowDisAmt === 0 && item.discountAmount !== undefined && (parseFloat(invoiceData.discountAmount) || 0) === 0 && (parseFloat(invoiceData.discountPercent) || 0) === 0) {
          rowDisAmt = parseFloat(item.discountAmount) || 0;
        }
        tempSubtotal += amt;
        tempRowDiscount += rowDisAmt;
      }
    });
    const baseSubtotalNet = tempSubtotal - tempRowDiscount;

    let generalDiscPercent = parseFloat(invoiceData.discountPercent) || 0;
    let generalDiscAmount = parseFloat(invoiceData.discountAmount) || 0;
    if (baseSubtotalNet > 0) {
      if (generalDiscPercent !== 0 && generalDiscAmount === 0) {
        generalDiscAmount = baseSubtotalNet * (generalDiscPercent / 100);
      } else if (generalDiscAmount !== 0 && generalDiscPercent === 0) {
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
      const discountPercent = parseFloat(item.rowDiscountPercent !== undefined ? item.rowDiscountPercent : item.discountPercent) || 0;
      let rowDisAmt = item.rowDiscountAmount !== undefined ? parseFloat(item.rowDiscountAmount) : 0;
      const amt = qty * rate;
      if (discountPercent !== 0 && rowDisAmt === 0) {
        rowDisAmt = amt * (discountPercent / 100);
      } else if (discountPercent !== 0) {
        rowDisAmt = amt * (discountPercent / 100);
      } else if (rowDisAmt === 0 && item.discountAmount !== undefined && generalDiscAmount === 0 && generalDiscPercent === 0) {
        rowDisAmt = parseFloat(item.discountAmount) || 0;
      }
      const taxableBeforeGeneral = amt - rowDisAmt;
      
      const gstPercent = seriesType === "NONTAXABLE" ? 0 : ((item.gstPercent !== undefined && item.gstPercent !== null && item.gstPercent !== "") ? parseFloat(item.gstPercent) : ((mat.igst !== undefined && mat.igst !== null) ? mat.igst : 18));
      const genDisAmt = baseSubtotalNet > 0 ? (taxableBeforeGeneral / baseSubtotalNet) * generalDiscAmount : 0;
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
        rowDiscountPercent: discountPercent,
        rowDiscountAmount: rowDisAmt,
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
    let sVoucherNo;
    if (invoiceData.voucherNo) {
      // Editing an existing invoice – keep the original number.
      sVoucherNo = invoiceData.voucherNo;
    } else {
      // New invoice with a series – generate strictly the next sequential number for this series
      sVoucherNo = this.generateNextVoucherNo("sales", invoiceData.seriesId || (series ? series.id : null));
    }

    const invoiceId = sVoucherNo;
    const invoiceTxId = sVoucherNo;

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
      const cogsTxId = `${sVoucherNo}-COGS`;
      this.transactions.push({
        id: cogsTxId,
        voucherId: invoiceId,
        voucherType: "SALE",
        voucherNo: sVoucherNo,
        date: invoiceData.date || new Date().toISOString().split("T")[0],
        reference: `${sVoucherNo} COGS`,
        description: `Cost of Goods Sold for invoice ${sVoucherNo}`,
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
      refNo: invoiceData.refNo || sVoucherNo,
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

    const cleanVNoUpperCheck = String(sVoucherNo).trim().toUpperCase();
    const existingIdx = (this.invoices || []).findIndex(inv => 
      inv.id === invoiceId || 
      (cleanVNoUpperCheck && String(inv.voucherNo || "").trim().toUpperCase() === cleanVNoUpperCheck && !inv.isCancelled && !inv.isCanceled && String(inv.status).toUpperCase() !== "CANCELLED")
    );

    if (existingIdx !== -1) {
      this.invoices[existingIdx] = newInvoice;
    } else {
      this.invoices.push(newInvoice);
    }

    this.recreateInvoiceTransaction(newInvoice);
    this.invalidateBalancesCache();
    this.recomputeAllStocks();
    this.saveState();
    return newInvoice;
  }

  createContraVoucher(data) {
    const txDate = data.date || new Date().toISOString().split("T")[0];
    const fyCheck = this.isPreviousFyLocked(txDate);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }
    this.validateTransactionDate(txDate);
    const amount = parseFloat(data.amount) || 0;
    if (amount <= 0) return false;

    return this.addTransaction({
      id: data.id,
      date: data.date || new Date().toISOString().split("T")[0],
      reference: data.reference || "Contra",
      description: data.description || "",
      entries: [
        { accountId: data.toAccountId, debit: amount, credit: 0 },
        { accountId: data.fromAccountId, debit: 0, credit: amount }
      ]
    });
  }

  createReceiptVoucher(data) {
    const txDate = data.date || new Date().toISOString().split("T")[0];
    const fyCheck = this.isPreviousFyLocked(txDate);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }
    this.validateTransactionDate(txDate);
    const cashAmt = parseFloat(data.cashAmount) || 0;
    const bankAmt = parseFloat(data.bankAmount) || 0;
    const amount = (cashAmt > 0 || bankAmt > 0) ? (cashAmt + bankAmt) : (parseFloat(data.amount) || 0);
    if (amount <= 0) return false;

    const date = data.date || new Date().toISOString().split("T")[0];
    const ref = data.reference || this.generateNextVoucherNo("receipt");
    
    let creditAcc = data.creditAccountId;
    let desc = data.description || "";

    if (!data.isGeneral) {
      const contact = this.contacts.find(c => c.id === data.contactId);
      if (!contact) return false;
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

    return this.addTransaction({
      id: data.id,
      date: date,
      reference: ref,
      description: desc,
      siteName: data.siteName || "",
      entries: entries
    });
  }

  createPaymentVoucher(data) {
    const txDate = data.date || new Date().toISOString().split("T")[0];
    const fyCheck = this.isPreviousFyLocked(txDate);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }
    this.validateTransactionDate(txDate);
    const cashAmt = parseFloat(data.cashAmount) || 0;
    const bankAmt = parseFloat(data.bankAmount) || 0;
    const amount = (cashAmt > 0 || bankAmt > 0) ? (cashAmt + bankAmt) : (parseFloat(data.amount) || 0);
    if (amount <= 0) return false;

    const date = data.date || new Date().toISOString().split("T")[0];
    const ref = data.reference || this.generateNextVoucherNo("payment");
    
    let debitAcc = data.debitAccountId;
    let desc = data.description || "";

    if (!data.isGeneral) {
      const contact = this.contacts.find(c => c.id === data.contactId);
      if (!contact) return false;
      debitAcc = data.siteName ? `${contact.id}::${data.siteName}` : contact.id;
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

    return this.addTransaction({
      id: data.id,
      date: date,
      reference: ref,
      description: desc,
      siteName: data.siteName || "",
      entries: entries
    });
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
      else if (type === "debit") prefix = "DN-";
      else if (type === "credit") prefix = "CN-";
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

    // STRICT PER-SERIES SEPARATION:
    // If this is a Sales series, scan ONLY sales invoices matching this series
    if (series && series.txType === "Sales") {
      (this.invoices || []).forEach(inv => {
        if (!inv || inv.isCancelled || inv.isCanceled || String(inv.status).toUpperCase() === "CANCELLED") return;
        const ref = String(inv.voucherNo || inv.refNo || inv.id || "").trim();
        if (!ref) return;

        let matchesThisSeries = false;
        if (prefixUpper && ref.toUpperCase().startsWith(prefixUpper)) {
          matchesThisSeries = true;
        } else if (!prefixUpper && inv.seriesId === series.id) {
          matchesThisSeries = true;
        }

        if (matchesThisSeries) {
          const numPart = prefixUpper ? ref.substring(prefix.length) : ref;
          if (/^\d+$/.test(numPart)) {
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        }
      });
    } else if (series && series.txType === "Purchase") {
      // If this is a Purchase series, scan ONLY purchases matching this series
      (this.purchases || []).forEach(pur => {
        if (!pur || pur.isCancelled || pur.isCanceled || String(pur.status).toUpperCase() === "CANCELLED") return;
        const ref = String(pur.voucherNo || pur.refNo || pur.id || "").trim();
        if (!ref) return;

        let matchesThisSeries = false;
        if (prefixUpper && ref.toUpperCase().startsWith(prefixUpper)) {
          matchesThisSeries = true;
        } else if (!prefixUpper && pur.seriesId === series.id) {
          matchesThisSeries = true;
        }

        if (matchesThisSeries) {
          const numPart = prefixUpper ? ref.substring(prefix.length) : ref;
          if (/^\d+$/.test(numPart)) {
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        }
      });
    } else {
      // Direct Vouchers (Receipt, Payment, Contra, Journal, etc.) - scan transactions with this prefix
      if (this.transactions) {
        this.transactions.forEach(t => {
          if (!t) return;
          const ref = String(t.reference || t.voucherNo || t.id || "").trim();
          if (prefixUpper && ref.toUpperCase().startsWith(prefixUpper) && !ref.endsWith(" COGS")) {
            const numPart = ref.substring(prefix.length);
            if (/^\d+$/.test(numPart)) {
              const parsed = parseInt(numPart, 10);
              if (!isNaN(parsed) && parsed > maxNum) {
                maxNum = parsed;
              }
            }
          }
        });
      }
    }

    // Strictly sequential: always maxNum + 1 (never skip numbers)
    const nextNum = Math.max(startNum, maxNum + 1);
    if (series) {
      series.currentNumber = nextNum + 1;
    }
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
      const cancelledSalesReturnIds = new Set((this.salesReturns || []).filter(r => r.isCancelled).flatMap(r => [String(r.id || '').trim(), String(r.voucherNo || '').trim()]).filter(Boolean));
      const cancelledPurchaseReturnIds = new Set((this.purchaseReturns || []).filter(r => r.isCancelled).flatMap(r => [String(r.id || '').trim(), String(r.voucherNo || '').trim(), String(r.billNo || '').trim()]).filter(Boolean));

      const cancelledInvoiceNos = new Set((this.invoices || []).filter(i => i.isCancelled).map(i => String(i.voucherNo).trim()).filter(Boolean));
      const cancelledPurchaseNos = new Set((this.purchases || []).filter(p => p.isCancelled).map(p => String(p.voucherNo || p.refNo || p.invoiceNo).trim()).filter(Boolean));
      const cancelledSalesReturnNos = new Set((this.salesReturns || []).filter(r => r.isCancelled).flatMap(r => [String(r.voucherNo || '').trim(), String(r.id || '').trim()]).filter(Boolean));
      const cancelledPurchaseReturnNos = new Set((this.purchaseReturns || []).filter(r => r.isCancelled).flatMap(r => [String(r.voucherNo || '').trim(), String(r.id || '').trim(), String(r.billNo || '').trim()]).filter(Boolean));

      const validInvoiceNos = new Set((this.invoices || []).filter(i => !i.isCancelled).flatMap(i => [String(i.voucherNo || '').trim(), String(i.id || '').trim(), String(i.billNo || '').trim()]).filter(Boolean));
      const validPurchaseNos = new Set((this.purchases || []).filter(p => !p.isCancelled).flatMap(p => [String(p.voucherNo || '').trim(), String(p.refNo || '').trim(), String(p.invoiceNo || '').trim(), String(p.id || '').trim()]).filter(Boolean));

      const purchasePrefixes = ["LPR-", "IPR-", "NPR-", "PUR-", "PU-", "PI-", "PR-", "LP-", "P-"];
      const salesPrefixes = ["SA-", "SI-", "LI-", "NI-", "LSL-", "INV-", "B2B-"];

      const beforeLen = this.transactions.length;
      this.transactions = this.transactions.filter(tx => {
        if (this.isTransactionForCancelledDoc(tx)) {
          return false;
        }
        const txIdUpper = String(tx.id || "").trim().toUpperCase();
        const tvidUpper = String(tx.voucherId || "").trim().toUpperCase();
        const refStr = String(tx.reference || "").trim();
        const refUpper = refStr.toUpperCase();
        const cleanRef = refStr.split(" ")[0].trim().toUpperCase();

        if (tx.id && (cancelledInvoiceIds.has(tx.id) || cancelledPurchaseIds.has(tx.id) || cancelledSalesReturnIds.has(tx.id) || cancelledPurchaseReturnIds.has(tx.id))) {
          return false;
        }

        if (refStr && (cancelledInvoiceNos.has(cleanRef) || cancelledPurchaseNos.has(cleanRef) || cancelledSalesReturnNos.has(cleanRef) || cancelledPurchaseReturnNos.has(cleanRef))) {
          return false;
        }

        for (const srId of cancelledSalesReturnIds) {
          const sUpper = srId.toUpperCase();
          if (sUpper && (txIdUpper === sUpper || tvidUpper === sUpper || refUpper.includes(sUpper) || cleanRef === sUpper)) {
            return false;
          }
        }
        for (const prId of cancelledPurchaseReturnIds) {
          const pUpper = prId.toUpperCase();
          if (pUpper && (txIdUpper === pUpper || tvidUpper === pUpper || refUpper.includes(pUpper) || cleanRef === pUpper)) {
            return false;
          }
        }

        // Clean orphaned Sales Return transactions when document no longer exists
        if (refUpper.startsWith("SALES RETURN") || refUpper.startsWith("SR-") || refUpper.includes("SALES RETURN") || (refUpper.endsWith(" COGS") && (refUpper.startsWith("SR-") || refUpper.startsWith("CN-") || refUpper.includes("RETURN")))) {
          const validSalesReturnIds = new Set((this.salesReturns || []).flatMap(r => [String(r.id || '').trim().toUpperCase(), String(r.voucherNo || '').trim().toUpperCase()]).filter(Boolean));
          let matchesValidSr = false;
          for (const srId of validSalesReturnIds) {
            if (srId && (txIdUpper === srId || tvidUpper === srId || refUpper.includes(srId) || cleanRef === srId)) {
              matchesValidSr = true;
              break;
            }
          }
          if (!matchesValidSr) return false;
        }

        // Clean orphaned Purchase Return transactions when document no longer exists
        if (refUpper.startsWith("PURCHASE RETURN") || (refUpper.startsWith("PR-") && !cleanRef.startsWith("LPR-") && !cleanRef.startsWith("IPR-") && !cleanRef.startsWith("NPR-"))) {
          const validPurchaseReturnIds = new Set((this.purchaseReturns || []).flatMap(r => [String(r.id || '').trim().toUpperCase(), String(r.voucherNo || '').trim().toUpperCase(), String(r.billNo || '').trim().toUpperCase()]).filter(Boolean));
          let matchesValidPr = false;
          for (const prId of validPurchaseReturnIds) {
            if (prId && (txIdUpper === prId || tvidUpper === prId || refUpper.includes(prId) || cleanRef === prId)) {
              matchesValidPr = true;
              break;
            }
          }
          if (!matchesValidPr) return false;
        }

        if (isManualVoucherOrReturn(tx)) return true;
        const idStr = String(tx.id || "").trim();
        const descStr = String(tx.description || "").toLowerCase();
        const cleanId = idStr.split(" ")[0].trim();

        // Check if manual voucher (do not drop authentic manual payment/receipt/journal/contra vouchers)
        const isManualVoucher = tx.voucherType === "RECEIPT" || tx.voucherType === "PAYMENT" || tx.voucherType === "JOURNAL" || tx.voucherType === "CONTRA" ||
                                cleanRef.startsWith("RC-") || cleanRef.startsWith("PY-") || cleanRef.startsWith("JV-") ||
                                cleanId.startsWith("RC-") || cleanId.startsWith("PY-") || cleanId.startsWith("JV-");

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
      // Auto-recover B2B0023 if it was erroneously dropped
      if (!this.invoices.some(i => {
        const v = String(i.voucherNo || i.refNo || i.id || "").trim().toUpperCase();
        return v === "B2B0023" || v === "B2B-0023";
      })) {
        const b2b23Invoice = {
          id: "B2B0023",
          billNo: 260,
          voucherNo: "B2B0023",
          seriesId: "SER-B2B-SALES",
          refNo: "B2B0023",
          date: "2026-07-24",
          dueDate: "2026-07-24",
          contactId: "CUST-0427",
          customerId: "CUST-0427",
          contactName: "MANEESH PV",
          customerName: "MANEESH PV",
          ledgerId: 427,
          items: [
            {
              materialId: "MAT-0730",
              name: "CEMENT",
              code: "AMBUJA",
              model: "AMBUJA",
              batchNo: "228.813",
              quantity: 150,
              unit: "Nos",
              price: 243.22,
              amount: 36483,
              netValue: 36483,
              taxRate: 18,
              gstPercent: 18,
              gstAmount: 6566.94,
              cessPercent: 0,
              netAmount: 43049.94,
              hsn: "2523",
              cgst: 3283.47,
              sgst: 3283.47,
              igst: 0
            }
          ],
          subtotal: 36483,
          taxRate: 18,
          taxAmount: 6566.94,
          cgst: 3283.47,
          sgst: 3283.47,
          igst: 0,
          shipping: 0,
          discount: 0,
          roundOff: 0.06,
          total: 43050,
          paidAmount: 0,
          status: "unpaid",
          cancelFlag: false,
          payMode: "Credit",
          paymode: "Credit"
        };
        this.invoices.push(b2b23Invoice);
        stateChanged = true;
        console.log("[Auto-Recovery] Successfully restored missing invoice B2B0023.");
      }

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
        if (!sr) return;
        if (sr.isCancelled) {
          const srid = String(sr.id || "").trim().toUpperCase();
          const vno = String(sr.voucherNo || "").trim().toUpperCase();
          const beforeLen = this.transactions.length;
          this.transactions = this.transactions.filter(t => {
            const tref = String(t.reference || "").toUpperCase();
            const tvno = String(t.voucherNo || "").toUpperCase();
            const tid = String(t.id || "").toUpperCase();
            if (srid && (tref.includes(srid) || tvno === srid || tid === srid)) return false;
            if (vno && (tref.includes(vno) || tvno === vno || tid === vno)) return false;
            return true;
          });
          if (this.transactions.length !== beforeLen) stateChanged = true;
          return;
        }
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
        if (!pr) return;
        if (pr.isCancelled) {
          const prid = String(pr.id || "").trim().toUpperCase();
          const vno = String(pr.voucherNo || pr.billNo || "").trim().toUpperCase();
          const beforeLen = this.transactions.length;
          this.transactions = this.transactions.filter(t => {
            const tref = String(t.reference || "").toUpperCase();
            const tvno = String(t.voucherNo || "").toUpperCase();
            const tid = String(t.id || "").toUpperCase();
            if (prid && (tref.includes(prid) || tvno === prid || tid === prid)) return false;
            if (vno && (tref.includes(vno) || tvno === vno || tid === vno)) return false;
            return true;
          });
          if (this.transactions.length !== beforeLen) stateChanged = true;
          return;
        }
        const supplier = this.contacts.find(c => c.id === pr.contactId);

        // Resolve the original purchase's series type to correctly identify IGST vs Local
        const originalPurchase = pr.billNo ? this.purchases.find(p => String(p.invoiceNo) === String(pr.billNo) || String(p.voucherNo) === String(pr.billNo)) : null;
        const originalSeriesId = originalPurchase ? originalPurchase.seriesId : null;
        const originalSeries = originalSeriesId ? (this.seriesMaster || []).find(s => s.id === originalSeriesId) : null;
        const isInterstate = this.isInterstatePurchase(pr, supplier);
        const isKerala = !isInterstate;
        
        const taxGroups = {};
        (pr.items || []).forEach(item => {
          if (!item.batchNo || String(item.batchNo).trim() === "") {
            if (originalPurchase && originalPurchase.items) {
              const purItem = originalPurchase.items.find(pi => pi.materialId === item.materialId || pi.name === item.name);
              if (purItem && (purItem.batchNo || purItem.price)) {
                item.batchNo = purItem.batchNo || String(purItem.price);
                stateChanged = true;
              }
            }
          }
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
    const date = data.date || new Date().toISOString().split("T")[0];
    const fyCheck = this.isPreviousFyLocked(date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }
    this.validateTransactionDate(date);

    const refUpper = String(data.reference || "").trim().toUpperCase();
    const formattedEntries = (data.entries || []).map(e => ({
      accountId: e.accountId,
      debit: parseFloat(e.debit) || 0,
      credit: parseFloat(e.credit) || 0
    }));
    const newEntriesSig = formattedEntries
      .map(e => `${e.accountId}:${e.debit.toFixed(2)}:${e.credit.toFixed(2)}`)
      .sort()
      .join("|");

    // Check if matching transaction already exists by ID or Reference+Date+Entries
    let existingTx = null;
    if (data.id) {
      existingTx = (this.transactions || []).find(t => t && t.id === data.id);
    }
    if (!existingTx && refUpper && refUpper !== "JV" && refUpper !== "CONTRA") {
      existingTx = (this.transactions || []).find(t => {
        if (!t) return false;
        const tRef = String(t.reference || "").trim().toUpperCase();
        if (tRef !== refUpper || t.date !== date) return false;
        const tEntriesSig = (t.entries || [])
          .map(e => `${e.accountId || e.accountCode || ""}:${parseFloat(e.debit || 0).toFixed(2)}:${parseFloat(e.credit || 0).toFixed(2)}`)
          .sort()
          .join("|");
        return tEntriesSig === newEntriesSig;
      });
    }

    if (existingTx) {
      this.reverseTransactionImpact(existingTx);
      existingTx.date = date;
      existingTx.reference = data.reference || existingTx.reference || "JV";
      existingTx.description = data.description !== undefined ? data.description : existingTx.description;
      existingTx.siteName = data.siteName !== undefined ? data.siteName : existingTx.siteName;
      existingTx.entries = formattedEntries;
      existingTx._normDocKeys = null;
      this.applyTransactionImpact(existingTx);
      this.saveState();
      this.syncTransactionToAppwrite(existingTx);
      return true;
    }

    const refStr = String(data.reference || "JV").trim();
    const isDocRef = refStr && refStr !== "JV" && !refStr.endsWith(" COGS");
    const txId = data.id || (isDocRef ? refStr : this.generateNextTxId());
    let inferredVType = data.voucherType || "";
    if (!inferredVType) {
      const refUpper = refStr.toUpperCase();
      if (refUpper.startsWith("RC-") || refUpper.startsWith("REC")) inferredVType = "RECEIPT";
      else if (refUpper.startsWith("PM-") || refUpper.startsWith("PY-") || refUpper.startsWith("PAY")) inferredVType = "PAYMENT";
      else if (refUpper.startsWith("CO-") || refUpper.startsWith("CON-") || refUpper.startsWith("CNTR")) inferredVType = "CONTRA";
      else if (refUpper.startsWith("JV-") || refUpper.startsWith("JV")) inferredVType = "JOURNAL";
    }

    const newTx = {
      id: txId,
      voucherId: data.voucherId || txId,
      voucherType: inferredVType,
      voucherNo: data.voucherNo || refStr,
      date: date,
      reference: refStr,
      description: data.description || "",
      siteName: data.siteName || "",
      entries: formattedEntries
    };
    this.transactions.push(newTx);
    this.applyTransactionImpact(newTx);
    this.saveState();
    this.syncTransactionToAppwrite(newTx);
    return true;
  }

  deleteTransaction(id) {
    const txIndex = this.transactions.findIndex(t => t.id === id);
    if (txIndex !== -1) {
      const tx = this.transactions[txIndex];
      const fyCheck = this.isPreviousFyLocked(tx.date);
      if (fyCheck.locked) {
        alert(fyCheck.reason);
        return false;
      }
      this.reverseTransactionImpact(tx);
      this.transactions.splice(txIndex, 1);
      this.saveState();
      this.syncTransactionToAppwrite(tx, true);
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
    let targetTime = 0;
    if (targetDateStr) {
      const d = parseDateSafely(targetDateStr);
      d.setHours(23, 59, 59, 999);
      targetTime = d.getTime();
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
        batchCostMap[key] = parseFloat(b.landingCost) || parseFloat(m.landingCost) || parseFloat(m.purchasePrice) || 0;
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

    const isAfterTarget = (dateStr) => {
      if (!targetTime || !dateStr) return false;
      return parseDateSafely(dateStr).getTime() > targetTime;
    };

    (this.purchases || []).forEach(pur => {
      if (pur.isCancelled) return;
      if (isAfterTarget(pur.date)) return;
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
      if (isAfterTarget(inv.date)) return;
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
      if (isAfterTarget(ret.date)) return;
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
      if (isAfterTarget(ret.date)) return;
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
      if (isAfterTarget(adj.date)) return;
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

  isSalesAccount(accId, ledgerObj = null) {
    if (!accId && !ledgerObj) return false;
    const strCode = accId ? String(accId).trim().toUpperCase() : "";
    const canonical = accId ? String(this.getCanonicalAccountId(accId)).toUpperCase() : "";
    
    const coreSalesCodes = new Set(["4100", "L0004", "L022", "L023", "L024", "L025"]);
    if (coreSalesCodes.has(strCode) || coreSalesCodes.has(canonical)) return true;

    const l = ledgerObj || (this.ledgers || []).find(x => 
      String(x.code).toUpperCase() === strCode || 
      String(x.code).toUpperCase() === canonical || 
      (x.id && String(x.id).toUpperCase() === strCode)
    );

    const gn = l ? String(l.groupName || "").trim().toUpperCase() : (accId ? this.getAccountGroupName(accId).toUpperCase() : "");
    const name = l ? String(l.name || "").trim().toUpperCase() : (accId ? this.getAccountName(accId).toUpperCase() : "");

    if (gn === "SALES ACCOUNTS" || gn === "SALES ACCOUNT" || gn === "SALES" || gn.includes("SALES ACCOUNT") || gn.includes("SALES ACCOUNTS")) return true;

    const groupByNameUpper = this.getGroupParentMap();
    let currGn = gn;
    for (let i = 0; i < 10; i++) {
      if (!currGn) break;
      if (currGn === "SALES ACCOUNTS" || currGn === "SALES ACCOUNT" || currGn === "SALES" || currGn.includes("SALES ACCOUNT")) return true;
      const parent = groupByNameUpper.get(currGn);
      if (!parent || !parent.under) break;
      currGn = String(parent.under).trim().toUpperCase();
    }

    if (name.includes("SALES") && !gn.includes("EXPENSE") && !gn.includes("INCOME") && !gn.includes("ASSET") && !gn.includes("LIABILITY")) {
      return true;
    }

    return false;
  }

  isPurchaseAccount(accId, ledgerObj = null) {
    if (!accId && !ledgerObj) return false;
    const strCode = accId ? String(accId).trim().toUpperCase() : "";
    const canonical = accId ? String(this.getCanonicalAccountId(accId)).toUpperCase() : "";

    const corePurCodes = new Set(["L0005", "L018", "L019", "L020", "L021"]);
    if (corePurCodes.has(strCode) || corePurCodes.has(canonical)) return true;

    const l = ledgerObj || (this.ledgers || []).find(x => 
      String(x.code).toUpperCase() === strCode || 
      String(x.code).toUpperCase() === canonical || 
      (x.id && String(x.id).toUpperCase() === strCode)
    );

    const gn = l ? String(l.groupName || "").trim().toUpperCase() : (accId ? this.getAccountGroupName(accId).toUpperCase() : "");
    const name = l ? String(l.name || "").trim().toUpperCase() : (accId ? this.getAccountName(accId).toUpperCase() : "");

    if (gn === "PURCHASE ACCOUNTS" || gn === "PURCHASE ACCOUNT" || gn === "PURCHASE" || gn.includes("PURCHASE ACCOUNT") || gn.includes("PURCHASE ACCOUNTS")) return true;

    const groupByNameUpper = this.getGroupParentMap();
    let currGn = gn;
    for (let i = 0; i < 10; i++) {
      if (!currGn) break;
      if (currGn === "PURCHASE ACCOUNTS" || currGn === "PURCHASE ACCOUNT" || currGn === "PURCHASE" || currGn.includes("PURCHASE ACCOUNT")) return true;
      const parent = groupByNameUpper.get(currGn);
      if (!parent || !parent.under) break;
      currGn = String(parent.under).trim().toUpperCase();
    }

    if (name.includes("PURCHASE") && !gn.includes("EXPENSE") && !gn.includes("INCOME") && !gn.includes("ASSET") && !gn.includes("LIABILITY")) {
      return true;
    }

    return false;
  }

  getProfitLoss(startDate = "", endDate = "") {
    const fyStart = this.getActiveFinancialYearStartDate();
    const effectiveStartDate = startDate || "";

    // Stock Valuations
    let openingStock = 0;
    if (effectiveStartDate && fyStart && effectiveStartDate > fyStart) {
      const prevDate = new Date(new Date(effectiveStartDate) - 86400000).toISOString().split("T")[0];
      openingStock = this.getStockValuationAtDate(prevDate);
    } else {
      openingStock = this.getOpeningStockValuation();
    }
    const closingStock = this.getStockValuationAtDate(endDate);

    // Sales Accounts & Sales Details (derived from Group Summary for 100% consistency)
    const salesSummary = this.getGroupSummary("SALES ACCOUNTS", effectiveStartDate, endDate);
    const salesDetails = [];
    let salesVal = 0;

    salesSummary.forEach(item => {
      const netPeriodSales = item.credit - item.debit;
      const ledgerOp = (!effectiveStartDate || effectiveStartDate <= fyStart) ? (item.opening < 0 ? Math.abs(item.opening) : -item.opening) : 0;
      const totalSales = netPeriodSales + (ledgerOp > 0 ? ledgerOp : 0);

      if (Math.abs(totalSales) > 0.001) {
        salesVal += totalSales;
        salesDetails.push({
          code: item.accountId,
          name: item.name,
          amount: totalSales
        });
      }
    });

    if (salesVal === 0 && (!this.transactions || this.transactions.length === 0)) {
      const filteredInvoices = (this.invoices || []).filter(inv => !inv.isCancelled && !inv.isCanceled && String(inv.status).toUpperCase() !== "CANCELLED" && (!effectiveStartDate || inv.date >= effectiveStartDate) && (!endDate || inv.date <= endDate));
      salesVal = filteredInvoices.reduce((sum, inv) => sum + ((parseFloat(inv.subtotal) || 0) - (parseFloat(inv.totalDiscount) || 0)), 0);
    }

    // Purchase Accounts & Purchase Details (derived from Group Summary for 100% consistency)
    const purSummary = this.getGroupSummary("PURCHASE ACCOUNTS", effectiveStartDate, endDate);
    const purchaseDetails = [];
    let purchaseVal = 0;

    purSummary.forEach(item => {
      const netPeriodPur = item.debit - item.credit;
      const ledgerOp = (!effectiveStartDate || effectiveStartDate <= fyStart) ? (item.opening > 0 ? item.opening : 0) : 0;
      const totalPur = netPeriodPur + ledgerOp;

      if (Math.abs(totalPur) > 0.001) {
        purchaseVal += totalPur;
        purchaseDetails.push({
          code: item.accountId,
          name: item.name,
          amount: totalPur
        });
      }
    });

    if (purchaseVal === 0 && (!this.transactions || this.transactions.length === 0)) {
      const filteredPurchases = (this.purchases || []).filter(p => !p.isCancelled && !p.isCanceled && String(p.status).toUpperCase() !== "CANCELLED" && (!effectiveStartDate || p.date >= effectiveStartDate) && (!endDate || p.date <= endDate));
      purchaseVal = filteredPurchases.reduce((sum, p) => sum + ((parseFloat(p.subtotal) || 0) - (parseFloat(p.totalDiscount) || 0)), 0);
    }

    // Other Incomes and Other Expenses
    const start = effectiveStartDate ? parseDateSafely(effectiveStartDate) : null;
    const end = endDate ? parseDateSafely(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    const startTime = start ? start.getTime() : 0;
    const endTime = end ? end.getTime() : 0;

    const canonicalMap = new Map();
    const getCanonical = (code) => {
      if (!code) return "";
      const str = String(code).trim();
      if (canonicalMap.has(str)) return canonicalMap.get(str);
      const res = this.getCanonicalAccountId(str);
      canonicalMap.set(str, res);
      return res;
    };

    const plAccountActivity = new Map();

    (this.transactions || []).forEach(tx => {
      if (!tx || !tx.id || !tx.entries || tx.isCancelled || this.isTransactionForCancelledDoc(tx)) return;
      let txTime = 0;
      if (tx.date) {
        txTime = parseDateSafely(tx.date).getTime();
      }
      if (startTime && txTime && txTime < startTime) return;
      if (endTime && txTime && txTime > endTime) return;

      tx.entries.forEach(e => {
        if (!e || !e.accountId) return;
        const targetAcc = getCanonical(e.accountId);
        if (!targetAcc) return;

        const dr = parseFloat(e.debit) || 0;
        const cr = parseFloat(e.credit) || 0;

        let accData = plAccountActivity.get(targetAcc);
        if (!accData) {
          accData = { debit: 0, credit: 0 };
          plAccountActivity.set(targetAcc, accData);
        }
        accData.debit += dr;
        accData.credit += cr;
      });
    });

    const otherIncomes = [];
    const otherExpenses = [];
    const salesAccSet = new Set(salesSummary.map(s => getCanonical(s.accountId)));
    const purAccSet = new Set(purSummary.map(p => getCanonical(p.accountId)));
    const bsControlCodes = new Set(["1010", "1020", "1100", "1200", "2100", "2200", "3100", "3200", "5100"]);

    const groupByNameUpper = this.getGroupParentMap();
    const bsGroupCache = new Map();
    const isBsGroup = (gn) => {
      if (!gn) return false;
      const originalGn = String(gn).trim().toUpperCase();
      if (bsGroupCache.has(originalGn)) return bsGroupCache.get(originalGn);

      const bsKeywords = [
        "ADJUSTMENTS", "ADJUSTMENT", "AJUSTMENTS", "AJUSTMENT", 
        "CURRENT LIABILITIES", "LIABILITIES", "CURRENT ASSETS", 
        "FIXED ASSETS", "ASSETS", "CAPITAL ACCOUNT", "EQUITY", 
        "SUNDRY CREDITORS", "SUNDRY DEBTORS", "DUTIES & TAXES", 
        "DUTIES AND TAXES", "PROVISIONS", "LOANS (LIABILITY)", 
        "LOANS & ADVANCES(ASSET)", "BANK ACCOUNTS", "CASH-IN-HAND", 
        "BRANCH / DIVISIONS", "SUSPENSE A/C", "RESERVES & SURPLUS"
      ];
      if (bsKeywords.includes(originalGn)) {
        bsGroupCache.set(originalGn, true);
        return true;
      }
      let curr = originalGn;
      let res = false;
      for (let i = 0; i < 10; i++) {
        const parent = groupByNameUpper.get(curr);
        if (!parent || !parent.under) break;
        curr = String(parent.under).trim().toUpperCase();
        if (bsKeywords.includes(curr)) {
          res = true;
          break;
        }
      }
      bsGroupCache.set(originalGn, res);
      return res;
    };

    const isCogsAccount = (code, name) => {
      const cUpper = String(code || "").trim().toUpperCase();
      const nUpper = String(name || "").trim().toUpperCase();
      if (cUpper === "5100" || cUpper === "1200" || cUpper === "L0003") return true;
      if (nUpper.includes("COST OF GOODS") || nUpper.includes("COGS") || nUpper.includes("COST OF SALES")) return true;
      return false;
    };

    const allLedgers = this.getLedgers() || [];
    allLedgers.forEach(l => {
      if (!l || !l.code) return;
      const canonical = getCanonical(l.code);
      if (salesAccSet.has(canonical) || purAccSet.has(canonical) || bsControlCodes.has(canonical) || bsControlCodes.has(l.code)) return;
      if (this.isSalesAccount(l.code, l) || this.isPurchaseAccount(l.code, l) || isCogsAccount(l.code, l.name)) return;

      const gnUpper = String(l.groupName || "").trim().toUpperCase();
      if (isBsGroup(gnUpper)) return;

      const nameUpper = String(l.name || "").trim().toUpperCase();
      if (isCogsAccount(l.code, nameUpper)) return;

      const activity = plAccountActivity.get(canonical) || plAccountActivity.get(l.code) || { debit: 0, credit: 0 };
      
      let op = 0;
      if (!effectiveStartDate || effectiveStartDate <= fyStart) {
        op = parseFloat(l.openingBalance) || 0;
        if (l.balanceType === "Credit") op = -op;
      }

      const netBalance = op + (activity.debit - activity.credit);

      if (Math.abs(netBalance) < 0.001) return;

      const isInc = gnUpper.includes("INCOME") || gnUpper.includes("REVENUE") || nameUpper.includes("INCOME");
      const isExp = gnUpper.includes("EXPENSE") || gnUpper.includes("DEPRECIATION") || gnUpper.includes("SALARY");

      if (isInc) {
        const amt = netBalance < 0 ? Math.abs(netBalance) : -netBalance;
        otherIncomes.push({ code: l.code, name: nameUpper, groupName: gnUpper || "INDIRECT INCOME", amount: amt });
      } else if (isExp) {
        const amt = netBalance > 0 ? netBalance : -Math.abs(netBalance);
        otherExpenses.push({ code: l.code, name: nameUpper, groupName: gnUpper || "INDIRECT EXPENSES", amount: amt });
      } else {
        if (netBalance < 0) {
          otherIncomes.push({ code: l.code, name: nameUpper, groupName: gnUpper || "INDIRECT INCOME", amount: Math.abs(netBalance) });
        } else {
          otherExpenses.push({ code: l.code, name: nameUpper, groupName: gnUpper || "INDIRECT EXPENSES", amount: netBalance });
        }
      }
    });

    const otherIncomesTotal = otherIncomes.reduce((s, i) => s + i.amount, 0);
    const otherExpensesTotal = otherExpenses.reduce((s, e) => s + e.amount, 0);

    const cogs = openingStock + purchaseVal - closingStock;
    const grossProfit = salesVal - cogs;
    const netProfit = grossProfit + otherIncomesTotal - otherExpensesTotal;
    const totalExpenses = cogs + otherExpensesTotal;

    return {
      openingStock,
      closingStock,
      purchase: purchaseVal,
      sales: salesVal,
      salesDetails,
      purchaseDetails,
      cogs,
      grossProfit,
      otherIncomes,
      otherExpenses,
      revenueTotal: salesVal + otherIncomesTotal,
      expensesTotal: totalExpenses,
      revenue: { total: salesVal, grandTotal: salesVal + otherIncomesTotal },
      expenses: { total: totalExpenses, purchase: purchaseVal, cogs },
      netProfit
    };
  }

  getBalanceSheet(startDate = "", endDate = "") {
    const balances = this.getAccountBalances(endDate);
    const fyStartForBs = startDate || this.getActiveFinancialYearStartDate() || (this.companies && this.companies[0] ? this.companies[0].financialYearStarts : "");
    const allTimePl = this.getProfitLoss(fyStartForBs, endDate);
    const retainedEarnings = allTimePl.netProfit;

    const contactCodes = new Set();
    (this.contacts || []).forEach(c => {
      if (c && c.id) contactCodes.add(String(c.id));
      if (c && c.ledgerCode) contactCodes.add(String(c.ledgerCode));
    });

    const rawLedgersByCode = new Map();
    (this.getLedgers() || []).forEach(l => {
      if (l && l.code) rawLedgersByCode.set(String(l.code).toUpperCase(), l);
    });

    const groupByNameUpper = new Map();
    (this.accountGroups || []).forEach(g => {
      if (g && g.name) groupByNameUpper.set(String(g.name).trim().toUpperCase(), g);
    });

    const plLedgerCodes = new Set([
      '4100', '5100', '1200', 'L0003', 'L0004', 'L0005', 'L0007', 'L0008', 'L0009', 'L0010', 'L0012',
      'L0013', 'L0014', 'L0015', 'L0016', 'L0060', 'L0061', 'L0062', 'L0063', 'L0064', 'L0065', 'L0066', 'L0067', 'L0099',
      'L0101', 'L0116', 'L0120', 'L0124', 'L0126', 'L0135', 'L0139', 'L0146', 'L0150', 'L0151', 'L0155', 'L0156',
      'L0553', 'L1017', 'L1122'
    ]);

    const isPlLedger = (gnUpper, nameUpper, code) => {
      if (plLedgerCodes.has(code)) return true;

      const bsKeywords = ['ADJUSTMENTS', 'ADJUSTMENT', 'AJUSTMENTS', 'AJUSTMENT', 'CURRENT LIABILITIES', 'LIABILITIES', 'CURRENT ASSETS', 'FIXED ASSETS', 'ASSETS', 'CAPITAL ACCOUNT', 'EQUITY'];
      let curr = gnUpper;
      for (let i = 0; i < 15; i++) {
        if (!curr) break;
        if (bsKeywords.includes(curr)) {
          return false;
        }
        if (['EXPENSE', 'INCOME', 'REVENUE', 'SALES', 'PURCHASE', 'DIRECT EXPENSES', 'INDIRECT EXPENSES', 'DIRECT INCOME', 'INDIRECT INCOME', 'SALARY', 'DEPRECIATION', 'TRADING', 'PROFIT & LOSS'].some(kw => curr.includes(kw))) {
          return true;
        }
        const parent = groupByNameUpper.get(curr);
        if (parent && parent.under) curr = String(parent.under).trim().toUpperCase();
        else break;
      }

      if (['SALES ACCOUNT', 'PURCHASE ACCOUNT', 'DIRECT EXPENSES', 'INDIRECT EXPENSES', 'DIRECT INCOME', 'INDIRECT INCOME', 'TRADING', 'PROFIT & LOSS'].includes(gnUpper)) {
        return true;
      }

      const bsGroupKeywords = ['ASSET', 'LIABIL', 'CAPITAL', 'DEPOSIT', 'ADVANCE', 'DEBTOR', 'CREDITOR', 'BANK', 'CASH', 'DUTY', 'DUTIES', 'TAX', 'PROVISION', 'ADJUSTMENT', 'AJUSTMENT'];
      if (!bsGroupKeywords.some(kw => gnUpper.includes(kw))) {
        if (['PURCHASE', 'SALES', 'DISCOUNT ALLOWED', 'DISCOUNT RECEIVED', 'FREIGHT', 'ROUND OFF', 'UNLOADING CHARGE', 'LOADING CHARGE', 'BANK CHARGES', 'GST LATE FEE', 'SOFTWARE UPDATION', 'PRICE CHANGE'].some(kw => nameUpper.includes(kw))) {
          if (!nameUpper.includes('PAYABLE') && !nameUpper.includes('RECEIVABLE') && !nameUpper.includes('ADVANCE')) {
            return true;
          }
        }
      }

      return false;
    };

    const isDutiesAndTaxes = (gnUpper, nameUpper) => {
      let curr = gnUpper;
      for (let i = 0; i < 15; i++) {
        if (!curr) break;
        if (['DUTIES & TAXES', 'DUTIES AND TAXES', 'INPUT SGST', 'INPUT CGST', 'INPUT IGST', 'OUTPUT SGST', 'OUTPUT CGST', 'OUTPUT IGST'].some(kw => curr === kw || curr.includes('DUTIES'))) return true;
        const parent = groupByNameUpper.get(curr);
        if (parent && parent.under) curr = String(parent.under).trim().toUpperCase();
        else break;
      }
      if (['INPUT SGST', 'INPUT CGST', 'INPUT IGST', 'OUTPUT SGST', 'OUTPUT CGST', 'OUTPUT IGST', 'DUTIES & TAXES', 'DUTIES AND TAXES'].includes(gnUpper)) return true;
      if (['INPUT SGST', 'INPUT CGST', 'INPUT IGST', 'OUTPUT SGST', 'OUTPUT CGST', 'OUTPUT IGST', 'GST PAID', 'GST PAYABLE'].some(kw => nameUpper.includes(kw))) return true;
      return false;
    };

    const getRootCategory = (gnUpper, nameUpper) => {
      let curr = gnUpper;
      for (let i = 0; i < 15; i++) {
        if (!curr) break;
        if (['CAPITAL ACCOUNT', 'EQUITY', 'RESERVES & SURPLUS'].some(kw => curr === kw || curr.includes('CAPITAL') || curr.includes('RESERVE'))) {
          return 'CAPITAL';
        }
        if (['SECURED LOANS', 'UNSECURED LOANS', 'LONG TERM LOANS', 'LOANS (LIABILITY)', 'LONG TERM LIABILITIES'].some(kw => curr === kw || curr.includes('SECURED') || curr.includes('UNSECURED') || curr.includes('LONG TERM'))) {
          return 'LONG_TERM_LIABILITIES';
        }
        if (['FIXED ASSETS'].some(kw => curr === kw || curr.includes('FIXED ASSET'))) {
          return 'FIXED_ASSETS';
        }
        if (['INVESTMENTS', 'FIXED DEPOSITS'].some(kw => curr === kw || curr.includes('INVESTMENT'))) {
          return 'INVESTMENTS';
        }
        if (['CURRENT ASSETS', 'BANK ACCOUNTS', 'CASH-IN-HAND', 'SUNDRY DEBTORS', 'LOANS & ADVANCES(ASSET)', 'DEPOSITS', 'DEPOSITS (ASSETS)', 'ADAVANCE TO SUPPLIER', 'OTHER CURRENT ASSETS', 'STOCK-IN-HAND'].some(kw => curr === kw || curr.includes('CURRENT ASSET') || curr.includes('DEBTOR') || curr.includes('CASH') || curr.includes('BANK'))) {
          return 'CURRENT_ASSETS';
        }
        if (['CURRENT LIABILITIES', 'DUTIES & TAXES', 'SUNDRY CREDITORS', 'BANK OD A/C', 'BRANCH / DIVISIONS', 'OUTSTANDING LIABILITIES & PROVISIONS', 'PROVISIONS', 'SUSPENSE A/C', 'ADJUSTMENTS', 'ADJUSTMENT', 'AJUSTMENTS', 'AJUSTMENT'].some(kw => curr === kw || curr.includes('LIABILIT') || curr.includes('CREDITOR') || curr.includes('DUTY') || curr.includes('TAX') || curr.includes('ADJUSTMENT') || curr.includes('AJUSTMENT'))) {
          return 'CURRENT_LIABILITIES';
        }
        const parent = groupByNameUpper.get(curr);
        if (parent && parent.under) curr = String(parent.under).trim().toUpperCase();
        else break;
      }

      if (nameUpper.includes('CAPITAL') || nameUpper.includes('PREVIOUS YEAR PROFIT')) return 'CAPITAL';
      if (nameUpper.includes('BUILDING') || nameUpper.includes('FURNITURE') || nameUpper.includes('MACHINERY') || nameUpper.includes('WEIGHING MACHINE') || nameUpper.includes('GENERATOR') || nameUpper.includes('WATER TANK')) return 'FIXED_ASSETS';

      return 'OTHER';
    };

    let capitalVal = 0;
    let longTermLiabilitiesVal = 0;
    let currentLiabilitiesVal = 0;
    let fixedAssetsVal = 0;
    let investmentsVal = 0;
    let currentAssetsVal = 0;

    const capitalDetails = [];
    const longTermLiabilitiesDetails = [];
    const currentLiabilitiesDetails = [];
    const fixedAssetsDetails = [];
    const investmentsDetails = [];
    const currentAssetsDetails = [];

    let netTaxBal = 0; // Debit is +, Credit is -
    const dutiesAndTaxesDetails = [];

    // Control accounts
    if (balances['3100'] && Math.abs(balances['3100'].balance) > 0.001) {
      capitalVal -= balances['3100'].balance;
      capitalDetails.push({ name: 'Capital / Owner Equity', balance: -balances['3100'].balance, group: 'CAPITAL ACCOUNT' });
    }
    if (balances['2100'] && Math.abs(balances['2100'].balance) > 0.001) {
      const b = balances['2100'].balance;
      if (b < 0) {
        currentLiabilitiesVal -= b;
        currentLiabilitiesDetails.push({ name: 'Sundry Creditors (Accounts Payable)', balance: -b, group: 'SUNDRY CREDITORS' });
      } else {
        currentAssetsVal += b;
        currentAssetsDetails.push({ name: 'Advance to Suppliers (Creditors Dr)', balance: b, group: 'SUNDRY CREDITORS' });
      }
    }
    if (balances['1100'] && Math.abs(balances['1100'].balance) > 0.001) {
      const b = balances['1100'].balance;
      if (b > 0) {
        currentAssetsVal += b;
        currentAssetsDetails.push({ name: 'Sundry Debtors (Accounts Receivable)', balance: b, group: 'SUNDRY DEBTORS' });
      } else {
        currentLiabilitiesVal -= b;
        currentLiabilitiesDetails.push({ name: 'Advance from Customers (Debtors Cr)', balance: -b, group: 'SUNDRY DEBTORS' });
      }
    }

    const closingStockVal = this.getStockValuationAtDate(endDate);
    if (closingStockVal !== 0) {
      currentAssetsVal += closingStockVal;
      currentAssetsDetails.push({ name: 'Stock on Hand', balance: closingStockVal, group: 'Stock-in-Hand' });
    }

    const skipControlCodes = new Set(['1010', '1020', '1100', '2100', '2200', '3100']);

    Object.entries(balances).forEach(([code, data]) => {
      const bal = data.balance;
      if (Math.abs(bal) < 0.001 || skipControlCodes.has(code)) return;
      if (contactCodes.has(code) || code.startsWith('CUST-') || code.startsWith('VEND-') || code.startsWith('SITE-')) return;

      const l = rawLedgersByCode.get(code.toUpperCase());
      const gnUpper = l ? String(l.groupName || '').toUpperCase() : '';
      const nameUpper = l ? String(l.name || '').toUpperCase() : code;

      const isPl = isPlLedger(gnUpper, nameUpper, code);
      if (isPl) return; // STRICT EXCLUSION OF P&L NOMINAL ACCOUNTS

      // Net aggregate Duties & Taxes ledgers so they show on ONLY ONE side
      if (isDutiesAndTaxes(gnUpper, nameUpper)) {
        netTaxBal += bal;
        dutiesAndTaxesDetails.push({
          code,
          name: l ? l.name : nameUpper,
          balance: bal,
          group: 'Duties & Taxes'
        });
        return;
      }

      const cat = getRootCategory(gnUpper, nameUpper);
      const displayGroup = l ? (l.groupName || 'Current Assets') : 'Current Assets';

      if (cat === 'CAPITAL') {
        capitalVal -= bal;
        capitalDetails.push({ name: nameUpper, balance: -bal, group: displayGroup });
      } else if (cat === 'LONG_TERM_LIABILITIES') {
        longTermLiabilitiesVal -= bal;
        longTermLiabilitiesDetails.push({ name: nameUpper, balance: -bal, group: displayGroup });
      } else if (cat === 'FIXED_ASSETS') {
        fixedAssetsVal += bal;
        fixedAssetsDetails.push({ name: nameUpper, balance: bal, group: displayGroup });
      } else if (cat === 'INVESTMENTS') {
        if (bal > 0) {
          investmentsVal += bal;
          investmentsDetails.push({ name: nameUpper, balance: bal, group: displayGroup });
        } else {
          currentLiabilitiesVal -= bal;
          currentLiabilitiesDetails.push({ name: nameUpper, balance: -bal, group: displayGroup });
        }
      } else if (cat === 'CURRENT_ASSETS') {
        if (bal > 0) {
          currentAssetsVal += bal;
          currentAssetsDetails.push({ name: nameUpper, balance: bal, group: displayGroup });
        } else {
          currentLiabilitiesVal -= bal;
          currentLiabilitiesDetails.push({ name: nameUpper, balance: -bal, group: displayGroup });
        }
      } else if (cat === 'CURRENT_LIABILITIES') {
        if (bal < 0) {
          currentLiabilitiesVal -= bal;
          currentLiabilitiesDetails.push({ name: nameUpper, balance: -bal, group: displayGroup });
        } else {
          currentAssetsVal += bal;
          currentAssetsDetails.push({ name: nameUpper, balance: bal, group: displayGroup });
        }
      } else {
        if (bal < 0) {
          currentLiabilitiesVal -= bal;
          currentLiabilitiesDetails.push({ name: nameUpper, balance: -bal, group: displayGroup });
        } else {
          currentAssetsVal += bal;
          currentAssetsDetails.push({ name: nameUpper, balance: bal, group: displayGroup });
        }
      }
    });

    // Place Net Duties & Taxes on EXACTLY ONE SIDE of Balance Sheet
    if (Math.abs(netTaxBal) > 0.001) {
      if (netTaxBal > 0) {
        // Net Debit = Asset (Input Tax Credit)
        currentAssetsVal += netTaxBal;
        if (dutiesAndTaxesDetails.length > 0) {
          dutiesAndTaxesDetails.forEach(d => {
            currentAssetsDetails.push({ name: d.name, balance: d.balance, group: 'Duties & Taxes', code: d.code });
          });
        } else {
          currentAssetsDetails.push({ name: 'Duties & Taxes (Input Tax Credit)', balance: netTaxBal, group: 'Duties & Taxes' });
        }
      } else {
        // Net Credit = Liability (Tax Payable)
        const absBal = Math.abs(netTaxBal);
        currentLiabilitiesVal += absBal;
        if (dutiesAndTaxesDetails.length > 0) {
          dutiesAndTaxesDetails.forEach(d => {
            currentLiabilitiesDetails.push({ name: d.name, balance: -d.balance, group: 'Duties & Taxes', code: d.code });
          });
        } else {
          currentLiabilitiesDetails.push({ name: 'Duties & Taxes (Tax Payable)', balance: absBal, group: 'Duties & Taxes' });
        }
      }
    }

    const rawAssets = fixedAssetsVal + investmentsVal + currentAssetsVal;
    const rawLiab = capitalVal + longTermLiabilitiesVal + currentLiabilitiesVal + retainedEarnings;
    const rawDiff = rawAssets - rawLiab;

    let diffLiab = 0;
    let diffAsset = 0;
    if (Math.abs(rawDiff) > 0.001) {
      if (rawDiff < 0) diffAsset = Math.abs(rawDiff);
      else diffLiab = rawDiff;
    }

    const totalAssets = fixedAssetsVal + investmentsVal + currentAssetsVal + diffAsset;
    const totalLiabilities = capitalVal + longTermLiabilitiesVal + currentLiabilitiesVal + retainedEarnings + diffLiab;
    const difference = totalAssets - totalLiabilities;

    return {
      assets: {
        fixedAssetsVal,
        investmentsVal,
        currentAssetsVal,
        otherCurrentAssetsVal: 0,
        diffAsset,
        total: totalAssets,
        fixedAssetsDetails,
        investmentsDetails,
        currentAssetsDetails,
        otherCurrentAssetsDetails: []
      },
      liabilities: {
        capitalVal,
        longTermLiabilitiesVal,
        currentLiabilitiesVal,
        diffLiab,
        retainedEarnings,
        total: totalLiabilities,
        capitalDetails,
        longTermLiabilitiesDetails,
        currentLiabilitiesDetails
      },
      capital: { total: capitalVal, details: capitalDetails },
      reserves: { total: 0, details: [] },
      longTermLiabilities: { total: longTermLiabilitiesVal, details: longTermLiabilitiesDetails },
      currentLiabilities: { total: currentLiabilitiesVal, details: currentLiabilitiesDetails },
      fixedAssets: { total: fixedAssetsVal, details: fixedAssetsDetails },
      investments: { total: investmentsVal, details: investmentsDetails },
      currentAssets: { total: currentAssetsVal, details: currentAssetsDetails },
      profitAndLoss: { amount: Math.abs(retainedEarnings), type: retainedEarnings >= 0 ? "profit" : "loss" },
      rawDiff,
      inBalance: Math.abs(rawDiff) < 0.01,
      difference: rawDiff
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
      const targetGroups = ["CURRENT LIABILITIES", "DUTIES & TAXES", "SUNDRY CREDITORS", "BANK OD A/C", "BRANCH / DIVISIONS", "LIABILITIES", "INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST", "OUTSTANDING LIABILITIES & PROVISIONS", "PROVISIONS", "UNSECURED LOANS", "SUSPENSE A/C", "OUTSTANDING LIABILITIES AND PROVISIONS", "ADJUSTMENTS", "ADJUSTMENT", "AJUSTMENTS", "AJUSTMENT"];
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
      const targetGroups = ["CURRENT ASSETS", "BANK ACCOUNTS", "CASH-IN-HAND", "SUNDRY DEBTORS", "LOANS & ADVANCES(ASSET)", "DEPOSITS", "DEPOSITS (ASSETS)", "ADAVANCE TO SUPPLIER", "OTHER CURRENT ASSETS", "ASSETS"];
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

    const processedContactIds = new Set();

    if (this.contacts) {
      this.contacts.forEach(c => {
        if (c.id) processedContactIds.add(String(c.id).toUpperCase());
        if (c.ledgerCode) processedContactIds.add(String(c.ledgerCode).toUpperCase());

        const isCreditor = c.type === "supplier" || c.listInVendorList === true || String(c.groupName || "").toUpperCase() === "SUNDRY CREDITORS";
        let bType = c.balanceType || (isCreditor ? "Credit" : "Debit");
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
          if (isCreditor) {
            if (bType === "Credit") {
              contactCreditorsOp += cOp;
            } else {
              contactCreditorsOp -= cOp;
            }
          } else {
            if (bType === "Debit") {
              contactDebtorsOp += cOp;
            } else {
              contactDebtorsOp -= cOp;
            }
          }
        }
      });
    }

    if (this.ledgers) {
      this.ledgers.forEach(l => {
        const op = parseFloat(l.openingBalance) || 0;
        if (op === 0) return;
        const codeUpper = String(l.code || "").toUpperCase();
        if (processedContactIds.has(codeUpper)) return;

        const gnUpper = String(l.groupName || "").toUpperCase();
        if (gnUpper === "SUNDRY CREDITORS") {
          const val = l.balanceType === "Debit" ? -op : op;
          contactCreditorsOp += val;
        } else if (gnUpper === "SUNDRY DEBTORS") {
          const val = l.balanceType === "Credit" ? -op : op;
          contactDebtorsOp += val;
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
      const seenOpeningLedgers = new Set();
      this.ledgers.forEach(l => {
        if (!l) return;
        const key = String(l.code || l.id || l.name || "").trim().toUpperCase();
        if (!key || seenOpeningLedgers.has(key)) return;
        seenOpeningLedgers.add(key);

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

    const fyCheck = this.isPreviousFyLocked(inv.date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }

    if (inv.payMode === "Credit") {
      const customer = this.contacts.find(c => c.id === inv.contactId);
      if (customer) {
        customer.balance = (customer.balance || 0) - inv.total;
      }
    }

    inv.isCancelled = true;
    this.invalidateBalancesCache();

    const invIdUpper = String(inv.id || "").trim().toUpperCase();
    const vNoUpper = String(inv.voucherNo || "").trim().toUpperCase();
    const refNoUpper = String(inv.refNo || "").trim().toUpperCase();

    this.transactions = this.transactions.filter(tx => {
      if (this.isTransactionForCancelledDoc(tx)) return false;

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

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  restoreInvoice(id) {
    const inv = this.invoices.find(i => i.id === id);
    if (!inv || !inv.isCancelled) return false;

    const fyCheck = this.isPreviousFyLocked(inv.date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }

    if (inv.payMode === "Credit") {
      const customer = this.contacts.find(c => c.id === inv.contactId);
      if (customer) {
        customer.balance = (customer.balance || 0) + inv.total;
      }
    }

    inv.isCancelled = false;
    this.invalidateBalancesCache();

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

    const fyCheck = this.isPreviousFyLocked(pur.date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }

    if (pur.payMode === "Credit") {
      const supplier = this.contacts.find(c => c.id === pur.contactId);
      if (supplier) {
        supplier.balance = (supplier.balance || 0) + pur.total;
      }
    }

    pur.isCancelled = true;
    this.invalidateBalancesCache();

    const purIdUpper = String(pur.id || "").trim().toUpperCase();
    const vNoUpper = String(pur.voucherNo || "").trim().toUpperCase();
    const refNoUpper = String(pur.refNo || "").trim().toUpperCase();
    const invNoUpper = String(pur.invoiceNo || "").trim().toUpperCase();

    this.transactions = this.transactions.filter(tx => {
      if (this.isTransactionForCancelledDoc(tx)) return false;

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

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  restorePurchase(id) {
    const pur = this.purchases.find(p => p.id === id);
    if (!pur || !pur.isCancelled) return false;

    const fyCheck = this.isPreviousFyLocked(pur.date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }

    if (pur.payMode === "Credit") {
      const supplier = this.contacts.find(c => c.id === pur.contactId);
      if (supplier) {
        supplier.balance = (supplier.balance || 0) - pur.total;
      }
    }

    pur.isCancelled = false;
    this.invalidateBalancesCache();

    const pVoucherNo = pur.voucherNo || this.generateNextVoucherNo("purchase");
    pur.voucherNo = pVoucherNo;

    this.recreatePurchaseTransaction(pur);

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  removeCancelledBill(id, type = "sales", adjustSeries = true) {
    if (type === "sales_return" || type === "salesReturns") {
      return this.deleteSalesReturn(id);
    }
    if (type === "purchase_return" || type === "purchaseReturns") {
      return this.deletePurchaseReturn(id);
    }
    let removed = false;
    const isSales = type === "sales" || type === "invoices";

    if (isSales) {
      const targetIdStr = String(id || "").trim().toUpperCase();
      const idx = (this.invoices || []).findIndex(i => 
        String(i.id || "").trim().toUpperCase() === targetIdStr ||
        (i.voucherNo && String(i.voucherNo).trim().toUpperCase() === targetIdStr) ||
        (i.refNo && String(i.refNo).trim().toUpperCase() === targetIdStr)
      );
      if (idx !== -1) {
        const inv = this.invoices[idx];
        const realId = inv.id;
        const fyCheck = this.isPreviousFyLocked(inv.date);
        if (fyCheck.locked) {
          alert(fyCheck.reason);
          return false;
        }
        if (!inv.isCancelled) {
          this.cancelInvoice(realId);
        }
        const invIdUpper = String(inv.id || "").trim().toUpperCase();
        const vNoUpper = String(inv.voucherNo || "").trim().toUpperCase();
        const refNoUpper = String(inv.refNo || "").trim().toUpperCase();

        this.transactions = (this.transactions || []).filter(tx => {
          const txIdUpper = String(tx.id || "").trim().toUpperCase();
          const tvidUpper = String(tx.voucherId || "").trim().toUpperCase();
          if (txIdUpper === invIdUpper || (tvidUpper && tvidUpper === invIdUpper)) return false;

          const ref = String(tx.reference || "").trim().toUpperCase();
          const tvno = String(tx.voucherNo || "").trim().toUpperCase();
          if (vNoUpper && (ref === vNoUpper || tvno === vNoUpper || ref === `${vNoUpper} COGS` || ref.startsWith("INVOICE " + vNoUpper))) return false;
          if (invIdUpper && (ref === invIdUpper || tvno === invIdUpper || ref === `${invIdUpper} COGS` || ref.startsWith("INVOICE " + invIdUpper))) return false;
          if (refNoUpper && (ref === refNoUpper || tvno === refNoUpper || ref === `INVOICE ${refNoUpper}`)) return false;
          return true;
        });

        this.invoices.splice(idx, 1);
        removed = true;
      }
    } else {
      const targetIdStr = String(id || "").trim().toUpperCase();
      const idx = (this.purchases || []).findIndex(p => 
        String(p.id || "").trim().toUpperCase() === targetIdStr ||
        (p.voucherNo && String(p.voucherNo).trim().toUpperCase() === targetIdStr) ||
        (p.refNo && String(p.refNo).trim().toUpperCase() === targetIdStr)
      );
      if (idx !== -1) {
        const pur = this.purchases[idx];
        const realId = pur.id;
        const fyCheck = this.isPreviousFyLocked(pur.date);
        if (fyCheck.locked) {
          alert(fyCheck.reason);
          return false;
        }
        if (!pur.isCancelled) {
          this.cancelPurchase(realId);
        }
        const purIdUpper = String(pur.id || "").trim().toUpperCase();
        const vNoUpper = String(pur.voucherNo || "").trim().toUpperCase();
        const refNoUpper = String(pur.refNo || "").trim().toUpperCase();

        this.transactions = (this.transactions || []).filter(tx => {
          const txIdUpper = String(tx.id || "").trim().toUpperCase();
          const tvidUpper = String(tx.voucherId || "").trim().toUpperCase();
          if (txIdUpper === purIdUpper || (tvidUpper && tvidUpper === purIdUpper)) return false;

          const ref = String(tx.reference || "").trim().toUpperCase();
          const tvno = String(tx.voucherNo || "").trim().toUpperCase();
          if (vNoUpper && (ref === vNoUpper || tvno === vNoUpper || ref.startsWith("PURCHASE " + vNoUpper))) return false;
          if (purIdUpper && (ref === purIdUpper || tvno === purIdUpper || ref.startsWith("PURCHASE " + purIdUpper))) return false;
          if (refNoUpper && (ref === refNoUpper || tvno === refNoUpper || ref === `PURCHASE ${refNoUpper}`)) return false;
          return true;
        });

        this.purchases.splice(idx, 1);
        removed = true;
      }
    }

    if (removed) {
      if (adjustSeries) {
        this.realignSeriesCurrentNumbers();
      }
      this.recomputeAllStocks();
      this.saveState();
      this.notifyListeners();
    }
    return removed;
  }

  removeAllCancelledBills(type = "sales", adjustSeries = true) {
    let count = 0;
    const isSales = type === "sales" || type === "invoices";
    const isBoth = type === "all";

    if (isSales || isBoth) {
      const cancelledInvIds = (this.invoices || []).filter(i => i.isCancelled).map(i => i.id);
      cancelledInvIds.forEach(id => {
        if (this.removeCancelledBill(id, "sales", false)) {
          count++;
        }
      });
    }

    if (!isSales || isBoth) {
      const cancelledPurIds = (this.purchases || []).filter(p => p.isCancelled).map(p => p.id);
      cancelledPurIds.forEach(id => {
        if (this.removeCancelledBill(id, "purchase", false)) {
          count++;
        }
      });
    }

    if (count > 0) {
      if (adjustSeries) {
        this.realignSeriesCurrentNumbers();
      }
      this.recomputeAllStocks();
      this.saveState();
      this.notifyListeners();
    }

    return count;
  }

  removeDuplicateInvoices(type = "sales") {
    const isSales = type === "sales" || type === "invoices";
    const collection = isSales ? (this.invoices || []) : (this.purchases || []);

    let removedCount = 0;
    const vMap = new Map();

    // 1. First pass: Deduplicate strictly by voucherNo / refNo / id
    collection.forEach(doc => {
      if (!doc) return;
      const vKey = String(doc.voucherNo || doc.refNo || doc.id || "").trim().toUpperCase();
      if (!vKey) return;

      if (!vMap.has(vKey)) {
        vMap.set(vKey, [doc]);
      } else {
        vMap.get(vKey).push(doc);
      }
    });

    // Only deduplicate exact duplicate document records by unique voucherNo/id
    const idsToRemove = new Set();
    vMap.forEach((docs) => {
      if (docs.length > 1) {
        // Prefer non-cancelled doc over cancelled doc
        docs.sort((a, b) => {
          const aCanc = a.isCancelled || a.isCanceled || String(a.status).toUpperCase() === "CANCELLED" ? 1 : 0;
          const bCanc = b.isCancelled || b.isCanceled || String(b.status).toUpperCase() === "CANCELLED" ? 1 : 0;
          if (aCanc !== bCanc) return aCanc - bCanc;
          return String(a.id || "").localeCompare(String(b.id || ""));
        });

        // Keep docs[0], mark duplicate clone copies docs[1..N-1] for deletion
        for (let i = 1; i < docs.length; i++) {
          idsToRemove.add(docs[i].id);
          removedCount++;
        }
      }
    });

    if (idsToRemove.size > 0) {
      if (isSales) {
        this.invoices = (this.invoices || []).filter(inv => !idsToRemove.has(inv.id));
      } else {
        this.purchases = (this.purchases || []).filter(pur => !idsToRemove.has(pur.id));
      }

      this.transactions = (this.transactions || []).filter(tx => {
        const tid = String(tx.id || "").toUpperCase();
        const tvid = String(tx.voucherId || "").toUpperCase();
        return !idsToRemove.has(tid) && !idsToRemove.has(tvid);
      });

      this.realignSeriesCurrentNumbers();
      this.recomputeAllStocks();
      this.saveState();
      this.notifyListeners();
    }

    return removedCount;
  }

  deleteInvoice(id, adjustSeries = true) {
    return this.removeCancelledBill(id, "sales", adjustSeries);
  }

  deletePurchase(id, adjustSeries = true) {
    return this.removeCancelledBill(id, "purchase", adjustSeries);
  }

  cancelSalesReturn(id) {
    const ret = (this.salesReturns || []).find(r => r.id === id);
    if (!ret || ret.isCancelled) return false;

    const fyCheck = this.isPreviousFyLocked(ret.date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }

    if (ret.payMode !== "Cash" && ret.payMode !== "Bank") {
      const customer = this.contacts.find(c => c.id === ret.contactId);
      if (customer) {
        customer.balance = (customer.balance || 0) + ret.total;
      }
    }

    ret.isCancelled = true;
    this.invalidateBalancesCache();

    const retIdUpper = String(ret.id || "").trim().toUpperCase();
    const vNoUpper = String(ret.voucherNo || ret.billNo || "").trim().toUpperCase();

    this.transactions = this.transactions.filter(tx => {
      if (this.isTransactionForCancelledDoc(tx)) return false;

      const txIdUpper = String(tx.id || "").trim().toUpperCase();
      const tvidUpper = String(tx.voucherId || "").trim().toUpperCase();
      if (retIdUpper && (txIdUpper === retIdUpper || tvidUpper === retIdUpper)) return false;
      if (vNoUpper && (txIdUpper === vNoUpper || tvidUpper === vNoUpper)) return false;

      const ref = String(tx.reference || "").trim().toUpperCase();
      const tvno = String(tx.voucherNo || "").trim().toUpperCase();

      if (retIdUpper && (ref.includes(retIdUpper) || tvno.includes(retIdUpper))) return false;
      if (vNoUpper && (ref.includes(vNoUpper) || tvno.includes(vNoUpper))) return false;

      return true;
    });

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  restoreSalesReturn(id) {
    const ret = (this.salesReturns || []).find(r => r.id === id);
    if (!ret || !ret.isCancelled) return false;

    const fyCheck = this.isPreviousFyLocked(ret.date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }

    if (ret.payMode !== "Cash" && ret.payMode !== "Bank") {
      const customer = this.contacts.find(c => c.id === ret.contactId);
      if (customer) {
        customer.balance = (customer.balance || 0) - ret.total;
      }
    }

    ret.isCancelled = false;
    this.invalidateBalancesCache();
    this.repairTaxEntries();
    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  repairTaxEntries() {
    if (typeof this.rebuildAllTaxTransactions === "function") {
      this.rebuildAllTaxTransactions();
    }
  }

  cancelPurchaseReturn(id) {
    const ret = (this.purchaseReturns || []).find(r => r.id === id);
    if (!ret || ret.isCancelled) return false;

    const fyCheck = this.isPreviousFyLocked(ret.date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }

    if (ret.payMode !== "Cash" && ret.payMode !== "Bank") {
      const supplier = this.contacts.find(c => c.id === ret.contactId);
      if (supplier) {
        supplier.balance = (supplier.balance || 0) - ret.total;
      }
    }

    ret.isCancelled = true;
    this.invalidateBalancesCache();

    const retIdUpper = String(ret.id || "").trim().toUpperCase();
    const vNoUpper = String(ret.voucherNo || ret.billNo || "").trim().toUpperCase();

    this.transactions = this.transactions.filter(tx => {
      if (this.isTransactionForCancelledDoc(tx)) return false;

      const txIdUpper = String(tx.id || "").trim().toUpperCase();
      const tvidUpper = String(tx.voucherId || "").trim().toUpperCase();
      if (retIdUpper && (txIdUpper === retIdUpper || tvidUpper === retIdUpper)) return false;
      if (vNoUpper && (txIdUpper === vNoUpper || tvidUpper === vNoUpper)) return false;

      const ref = String(tx.reference || "").trim().toUpperCase();
      const tvno = String(tx.voucherNo || "").trim().toUpperCase();

      if (retIdUpper && (ref.includes(retIdUpper) || tvno.includes(retIdUpper))) return false;
      if (vNoUpper && (ref.includes(vNoUpper) || tvno.includes(vNoUpper))) return false;

      return true;
    });

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  restorePurchaseReturn(id) {
    const ret = (this.purchaseReturns || []).find(r => r.id === id);
    if (!ret || !ret.isCancelled) return false;

    const fyCheck = this.isPreviousFyLocked(ret.date);
    if (fyCheck.locked) {
      alert(fyCheck.reason);
      return false;
    }

    if (ret.payMode !== "Cash" && ret.payMode !== "Bank") {
      const supplier = this.contacts.find(c => c.id === ret.contactId);
      if (supplier) {
        supplier.balance = (supplier.balance || 0) + ret.total;
      }
    }

    ret.isCancelled = false;
    this.invalidateBalancesCache();
    this.repairTaxEntries();
    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  deleteSalesReturn(id) {
    const targetIdStr = String(id || "").trim().toUpperCase();
    const idx = (this.salesReturns || []).findIndex(r => 
      String(r.id || "").trim().toUpperCase() === targetIdStr ||
      (r.voucherNo && String(r.voucherNo).trim().toUpperCase() === targetIdStr) ||
      (r.refNo && String(r.refNo).trim().toUpperCase() === targetIdStr)
    );
    if (idx !== -1) {
      const ret = this.salesReturns[idx];
      const realId = ret.id;
      const fyCheck = this.isPreviousFyLocked(ret.date);
      if (fyCheck.locked) {
        alert(fyCheck.reason);
        return false;
      }
      if (!ret.isCancelled) {
        this.cancelSalesReturn(realId);
      }
      const newIdx = (this.salesReturns || []).findIndex(r => 
        String(r.id || "").trim().toUpperCase() === targetIdStr ||
        (r.voucherNo && String(r.voucherNo).trim().toUpperCase() === targetIdStr) ||
        (r.refNo && String(r.refNo).trim().toUpperCase() === targetIdStr)
      );
      if (newIdx !== -1) {
        this.salesReturns.splice(newIdx, 1);
      }
      this.invalidateBalancesCache();
      this.transactions = (this.transactions || []).filter(tx => !this.isTransactionForCancelledDoc(tx));
      this.recomputeAllStocks();
      this.saveState();
      return true;
    }
    return false;
  }

  deletePurchaseReturn(id) {
    const targetIdStr = String(id || "").trim().toUpperCase();
    const idx = (this.purchaseReturns || []).findIndex(r => 
      String(r.id || "").trim().toUpperCase() === targetIdStr ||
      (r.voucherNo && String(r.voucherNo).trim().toUpperCase() === targetIdStr) ||
      (r.refNo && String(r.refNo).trim().toUpperCase() === targetIdStr)
    );
    if (idx !== -1) {
      const ret = this.purchaseReturns[idx];
      const realId = ret.id;
      const fyCheck = this.isPreviousFyLocked(ret.date);
      if (fyCheck.locked) {
        alert(fyCheck.reason);
        return false;
      }
      if (!ret.isCancelled) {
        this.cancelPurchaseReturn(realId);
      }
      const newIdx = (this.purchaseReturns || []).findIndex(r => 
        String(r.id || "").trim().toUpperCase() === targetIdStr ||
        (r.voucherNo && String(r.voucherNo).trim().toUpperCase() === targetIdStr) ||
        (r.refNo && String(r.refNo).trim().toUpperCase() === targetIdStr)
      );
      if (newIdx !== -1) {
        this.purchaseReturns.splice(newIdx, 1);
      }
      this.invalidateBalancesCache();
      this.transactions = (this.transactions || []).filter(tx => !this.isTransactionForCancelledDoc(tx));
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
    const normGroupName = String(groupName || "").trim().toUpperCase();
    
    const getSubGroups = (g) => {
      const children = [];
      const gUpper = String(g || "").trim().toUpperCase();
      if (this.accountGroups) {
        this.accountGroups.forEach(cg => {
          if (String(cg.under || "").trim().toUpperCase() === gUpper) {
            children.push(String(cg.name || "").trim().toUpperCase());
            children.push(...getSubGroups(cg.name));
          }
        });
      }
      return children;
    };

    const baseGroups = [normGroupName];
    if (normGroupName === "SALES ACCOUNTS" || normGroupName === "SALES ACCOUNT" || normGroupName === "SALES") {
      baseGroups.push("SALES ACCOUNTS", "SALES ACCOUNT", "SALES");
    }
    if (normGroupName === "PURCHASE ACCOUNTS" || normGroupName === "PURCHASE ACCOUNT" || normGroupName === "PURCHASE") {
      baseGroups.push("PURCHASE ACCOUNTS", "PURCHASE ACCOUNT", "PURCHASE");
    }
    if (normGroupName === "SUNDRY DEBTORS" || normGroupName === "DEBTORS") {
      baseGroups.push("SUNDRY DEBTORS", "DEBTORS", "CURRENT ASSETS");
    }
    if (normGroupName === "SUNDRY CREDITORS" || normGroupName === "CREDITORS") {
      baseGroups.push("SUNDRY CREDITORS", "CREDITORS", "CURRENT LIABILITIES");
    }
    if (normGroupName === "DUTIES & TAXES" || normGroupName === "DUTIES AND TAXES") {
      baseGroups.push("DUTIES & TAXES", "DUTIES AND TAXES");
    }

    const targetGroups = Array.from(new Set([
      ...baseGroups,
      ...baseGroups.flatMap(g => getSubGroups(g))
    ]));

    const isSalesReq = targetGroups.some(g => g === "SALES ACCOUNTS" || g === "SALES ACCOUNT" || g === "SALES");
    const isPurReq = targetGroups.some(g => g === "PURCHASE ACCOUNTS" || g === "PURCHASE ACCOUNT" || g === "PURCHASE");

    if (isSalesReq) {
      list.push("4100", "L0004", "L022", "L023", "L024", "L025");
    }

    if (isPurReq) {
      list.push("L0005", "L018", "L019", "L020", "L021");
    }

    if (targetGroups.some(g => g === "CURRENT ASSETS" || g === "SUNDRY DEBTORS")) {
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

    if (targetGroups.some(g => g === "CURRENT LIABILITIES" || g === "SUNDRY CREDITORS")) {
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

    if (targetGroups.some(g => g === "CURRENT ASSETS" || g === "STOCK IN HAND")) {
      list.push("1200");
    }

    if (targetGroups.some(g => g === "CASH-IN-HAND")) {
      list.push("1010");
    }

    if (targetGroups.some(g => g === "BANK ACCOUNTS")) {
      list.push("1020");
    }

    if (targetGroups.some(g => g === "DUTIES & TAXES" || g === "DUTIES AND TAXES")) {
      list.push("2200");
    }

    if (targetGroups.some(g => g === "CAPITAL ACCOUNT")) {
      list.push("3100");
    }

    if (this.ledgers) {
      this.ledgers.forEach(l => {
        const lGn = String(l.groupName || "").trim().toUpperCase();
        if (targetGroups.includes(lGn) || (isSalesReq && this.isSalesAccount(l.code, l)) || (isPurReq && this.isPurchaseAccount(l.code, l))) {
          list.push(l.code);
        }
      });
    }

    const result = [];
    const seenCanonicals = new Set();
    list.forEach(id => {
      const canonical = this.getCanonicalAccountId(id);
      if (canonical && !seenCanonicals.has(canonical)) {
        seenCanonicals.add(canonical);
        result.push(canonical);
      } else if (!canonical && !seenCanonicals.has(id)) {
        seenCanonicals.add(id);
        result.push(id);
      }
    });

    return result;
  }

  getAccountName(accId) {
    if (this.getAccountDisplayName) {
      const dName = this.getAccountDisplayName(accId);
      if (dName && dName !== accId) return dName;
    }
    const canonicalAcc = this.getCanonicalAccountId(accId);
    const staticAcc = ACCOUNTS[canonicalAcc] || ACCOUNTS[accId];
    if (staticAcc) return staticAcc.name;
    const strAcc = String(canonicalAcc || accId);
    const baseId = strAcc.includes("::") ? strAcc.split("::")[0] : strAcc;
    const site = strAcc.includes("::") ? strAcc.split("::")[1] : null;

    const contact = this.contacts?.find(c => c && (c.id === baseId || c.ledgerCode === baseId || c.code === baseId || (c.name && String(c.name).toUpperCase() === baseId.toUpperCase())));
    if (contact && contact.name) return site ? `${contact.name} (${site})` : contact.name;

    const ledger = this.ledgers?.find(l => l && (l.code === baseId || l.id === baseId));
    if (ledger) {
      const parentC = this.contacts?.find(c => c && (c.ledgerCode === ledger.code || c.id === ledger.code || (c.name && String(c.name).toUpperCase() === String(ledger.name).toUpperCase())));
      if (parentC && parentC.name) return site ? `${parentC.name} (${site})` : parentC.name;
      if (ledger.name && !ledger.name.match(/^L\d+$/i)) return site ? `${ledger.name} (${site})` : ledger.name;
    }

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
    const contact = this.contacts?.find(c => c.id === baseId || c.ledgerCode === baseId || (c.name && String(c.name).toUpperCase() === baseId.toUpperCase()));
    if (contact) {
      return (contact.type === "supplier" || contact.listInVendorList) ? "SUNDRY CREDITORS" : "SUNDRY DEBTORS";
    }
    const ledger = this.ledgers?.find(l => l.code === strAcc);
    if (ledger) return ledger.groupName;
    return "OTHER";
  }

  getGroupSummary(groupName, startDate = "", endDate = "") {
    const accountIds = this.getGroupAccounts(groupName);

    const activeFyStartDate = this.getActiveFinancialYearStartDate ? this.getActiveFinancialYearStartDate() : null;
    if (activeFyStartDate) {
      const activeFyStartD = parseDateSafely(activeFyStartDate);
      const fromD = startDate ? parseDateSafely(startDate) : null;
      const toD = endDate ? parseDateSafely(endDate) : null;
      if (!startDate || (fromD && fromD < activeFyStartD)) {
        startDate = activeFyStartDate;
      }
      if (endDate && toD && toD < activeFyStartD) {
        endDate = activeFyStartDate;
      }
    }

    const start = startDate ? parseDateSafely(startDate) : null;
    const end = endDate ? parseDateSafely(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    const startTime = start ? start.getTime() : 0;
    const endTime = end ? end.getTime() : 0;

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
      if (!tx || !tx.id || !tx.entries || tx.isCancelled || this.isTransactionForCancelledDoc(tx)) return;
      let txTime = 0;
      if (tx.date) {
        txTime = parseDateSafely(tx.date).getTime();
      }
      const isBeforeStart = startTime && txTime && txTime < startTime;
      const isWithinRange = (!startTime || (txTime && txTime >= startTime)) && (!endTime || (txTime && txTime <= endTime));

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

    const contactMap = new Map();
    (this.contacts || []).forEach(c => {
      if (c && c.id) contactMap.set(c.id, c);
    });

    const ledgerMap = new Map();
    (this.ledgers || []).forEach(l => {
      if (l && l.code) ledgerMap.set(l.code, l);
    });

    const items = [];

    accountIds.forEach(accId => {
      let initialBal = 0;
      let isDebitType = true;

      const staticAcc = ACCOUNTS[accId];
      if (staticAcc) {
        isDebitType = (staticAcc.type === "asset" || staticAcc.type === "expense");
      } else {
        const baseId = accId.includes("::") ? accId.split("::")[0] : accId;
        const contact = contactMap.get(baseId);
        if (contact) {
          let bType = contact.balanceType || ((contact.type === "supplier" || contact.listInVendorList) ? "Credit" : "Debit");
          isDebitType = (bType === "Debit");
          if (contact.siteType === "multiple") {
            const site = accId.includes("::") ? accId.split("::")[1] : null;
            initialBal = site && contact.openingBalances && contact.openingBalances[site] !== undefined ? parseFloat(contact.openingBalances[site]) : 0;
          } else {
            initialBal = parseFloat(contact.openingBalance) || 0;
          }
        } else {
          const ledger = ledgerMap.get(accId);
          if (ledger) {
            isDebitType = ledger.balanceType === "Debit";
            initialBal = parseFloat(ledger.openingBalance) || 0;
          } else {
            const isSalesL = this.isSalesAccount ? this.isSalesAccount(accId) : false;
            const isPurL = this.isPurchaseAccount ? this.isPurchaseAccount(accId) : false;
            if (isSalesL) {
              isDebitType = false;
            } else if (isPurL) {
              isDebitType = true;
            } else {
              isDebitType = true;
            }
          }
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

  // ── Missing & Unbalanced Double Entry Finder & Audit Engine ────────────────────────
  findMissingAndUnbalancedDoubleEntries(options = {}) {
    const findings = [];
    const onlyCurrentFy = options.onlyCurrentFy !== false;
    const fyStart = onlyCurrentFy ? this.getActiveFinancialYearStartDate() : null;
    const fyEnd = onlyCurrentFy ? this.getActiveFinancialYearEndDate() : null;

    const isInFyRange = (dateStr) => {
      if (!onlyCurrentFy || (!fyStart && !fyEnd)) return true;
      const iso = toIsoDateStr(dateStr);
      if (!iso) return true;
      if (fyStart && iso < toIsoDateStr(fyStart)) return false;
      if (fyEnd && iso > toIsoDateStr(fyEnd)) return false;
      return true;
    };

    const getPartyName = (partyId) => {
      if (!partyId) return "";
      const baseId = partyId.includes("::") ? partyId.split("::")[0] : partyId;
      const contact = (this.contacts || []).find(c => c.id === baseId);
      if (contact) return contact.name;
      const ledger = (this.ledgers || []).find(l => l.code === partyId);
      if (ledger) return ledger.name;
      const staticAcc = ACCOUNTS[partyId];
      if (staticAcc) return staticAcc.name;
      return partyId;
    };

    // 1. Audit Existing Journal Entries in `this.transactions`
    const txs = this.transactions || [];
    txs.forEach(tx => {
      if (!tx) return;
      if (!isInFyRange(tx.date)) return;

      const txId = String(tx.id || "");
      const vNo = tx.voucherNo || tx.reference || tx.id || "-";
      const vType = tx.voucherType || "VOUCHER";
      const party = getPartyName(tx.partyId) || tx.description || "General Journal";

      if (!Array.isArray(tx.entries) || tx.entries.length === 0) {
        findings.push({
          id: `CORRUPT-${txId}`,
          docId: txId,
          sourceType: "TRANSACTION",
          voucherType: vType,
          voucherNo: vNo,
          date: tx.date || "-",
          partyName: party,
          issueType: "EMPTY_ENTRIES",
          issueSeverity: "HIGH",
          debitTotal: 0,
          creditTotal: 0,
          difference: 0,
          description: `Transaction record ${vNo} has 0 debit/credit journal entries.`,
          canAutoFix: true,
          rawRecord: tx
        });
        return;
      }

      let dTotal = 0;
      let cTotal = 0;
      let hasInvalidAccount = false;

      tx.entries.forEach(e => {
        if (!e) return;
        const d = parseFloat(e.debit) || 0;
        const c = parseFloat(e.credit) || 0;
        dTotal += d;
        cTotal += c;

        if (!e.accountId) {
          hasInvalidAccount = true;
        }
      });

      dTotal = Math.round(dTotal * 100) / 100;
      cTotal = Math.round(cTotal * 100) / 100;
      const diff = Math.abs(Math.round((dTotal - cTotal) * 100) / 100);

      if (diff > 0.01) {
        findings.push({
          id: `UNBALANCED-${txId}`,
          docId: txId,
          sourceType: "TRANSACTION",
          voucherType: vType,
          voucherNo: vNo,
          date: tx.date || "-",
          partyName: party,
          issueType: "UNBALANCED",
          issueSeverity: "CRITICAL",
          debitTotal: dTotal,
          creditTotal: cTotal,
          difference: diff,
          description: `Unbalanced Entry: Total Debit (₹${dTotal.toLocaleString("en-IN")}) ≠ Total Credit (₹${cTotal.toLocaleString("en-IN")}). Discrepancy: ₹${diff.toLocaleString("en-IN")}`,
          canAutoFix: true,
          rawRecord: tx
        });
      } else if (hasInvalidAccount) {
        findings.push({
          id: `BAD_ACCOUNT-${txId}`,
          docId: txId,
          sourceType: "TRANSACTION",
          voucherType: vType,
          voucherNo: vNo,
          date: tx.date || "-",
          partyName: party,
          issueType: "UNKNOWN_LEDGER",
          issueSeverity: "MEDIUM",
          debitTotal: dTotal,
          creditTotal: cTotal,
          difference: 0,
          description: `Transaction ${vNo} contains journal entries with missing/unresolved ledger account IDs.`,
          canAutoFix: true,
          rawRecord: tx
        });
      } else if ((dTotal > 0 && cTotal === 0) || (cTotal > 0 && dTotal === 0)) {
        findings.push({
          id: `SINGLE_ENTRY-${txId}`,
          docId: txId,
          sourceType: "TRANSACTION",
          voucherType: vType,
          voucherNo: vNo,
          date: tx.date || "-",
          partyName: party,
          issueType: "SINGLE_ENTRY",
          issueSeverity: "HIGH",
          debitTotal: dTotal,
          creditTotal: cTotal,
          difference: Math.max(dTotal, cTotal),
          description: `Single-entry voucher: Contains ${dTotal > 0 ? "Debit" : "Credit"} side of ₹${Math.max(dTotal, cTotal).toLocaleString("en-IN")} but missing opposing entry.`,
          canAutoFix: true,
          rawRecord: tx
        });
      }
    });

    // 2. Audit Missing Double Entry Journal Transactions for Invoices
    const invoices = this.invoices || [];
    invoices.forEach(inv => {
      if (!inv || !isInFyRange(inv.date)) return;
      const iId = String(inv.id || "");
      const iNo = inv.invoiceNo || inv.reference || inv.id || "-";
      const party = getPartyName(inv.customer || inv.customerId) || inv.customerName || "Customer";
      const netTotal = Math.round((parseFloat(inv.grandTotal || inv.total || 0)) * 100) / 100;

      const txMatch = txs.find(t => {
        if (!t) return false;
        const tid = String(t.id || "").trim();
        const tvid = String(t.voucherId || "").trim();
        const tref = String(t.reference || "").trim();
        const tvno = String(t.voucherNo || "").trim();
        return tid === iId || tvid === iId || tref === iNo || tvno === iNo || tref === `INVOICE ${iNo}`;
      });

      if (!txMatch) {
        findings.push({
          id: `MISSING_INV-${iId}`,
          docId: iId,
          sourceType: "INVOICE",
          voucherType: "SALE INVOICE",
          voucherNo: iNo,
          date: inv.date || "-",
          partyName: party,
          issueType: "MISSING_DOUBLE_ENTRY",
          issueSeverity: "CRITICAL",
          debitTotal: netTotal,
          creditTotal: 0,
          difference: netTotal,
          description: `Sales Invoice ${iNo} (₹${netTotal.toLocaleString("en-IN")}) exists in Sales Register but has NO accounting double-entry transaction recorded in journal!`,
          canAutoFix: true,
          rawRecord: inv
        });
      }
    });

    // 3. Audit Missing Double Entry Journal Transactions for Purchases
    const purchases = this.purchases || [];
    purchases.forEach(pur => {
      if (!pur || !isInFyRange(pur.date)) return;
      const pId = String(pur.id || "");
      const pNo = pur.voucherNo || pur.refNo || pur.invoiceNo || pur.id || "-";
      const party = getPartyName(pur.supplier || pur.supplierId) || pur.supplierName || "Supplier";
      const netTotal = Math.round((parseFloat(pur.grandTotal || pur.total || 0)) * 100) / 100;

      const txMatch = txs.find(t => {
        if (!t) return false;
        const tid = String(t.id || "").trim();
        const tvid = String(t.voucherId || "").trim();
        const tref = String(t.reference || "").trim();
        const tvno = String(t.voucherNo || "").trim();
        return tid === pId || tvid === pId || tref === pNo || tvno === pNo;
      });

      if (!txMatch) {
        findings.push({
          id: `MISSING_PUR-${pId}`,
          docId: pId,
          sourceType: "PURCHASE",
          voucherType: "PURCHASE BILL",
          voucherNo: pNo,
          date: pur.date || "-",
          partyName: party,
          issueType: "MISSING_DOUBLE_ENTRY",
          issueSeverity: "CRITICAL",
          debitTotal: netTotal,
          creditTotal: 0,
          difference: netTotal,
          description: `Purchase Bill ${pNo} (₹${netTotal.toLocaleString("en-IN")}) exists in Purchase Register but has NO accounting double-entry transaction recorded in journal!`,
          canAutoFix: true,
          rawRecord: pur
        });
      }
    });

    // 4. Audit Missing Double Entry Journal Transactions for Sales Returns
    const salesReturns = this.salesReturns || [];
    salesReturns.forEach(sr => {
      if (!sr || !isInFyRange(sr.date)) return;
      const srId = String(sr.id || "");
      const srNo = sr.creditNoteNo || sr.reference || sr.id || "-";
      const party = getPartyName(sr.customer || sr.customerId) || "Customer";
      const netTotal = Math.round((parseFloat(sr.grandTotal || sr.total || 0)) * 100) / 100;

      const txMatch = txs.find(t => t && (String(t.id) === srId || String(t.voucherId) === srId || String(t.reference) === srNo));
      if (!txMatch) {
        findings.push({
          id: `MISSING_SR-${srId}`,
          docId: srId,
          sourceType: "SALES_RETURN",
          voucherType: "SALES RETURN (CREDIT NOTE)",
          voucherNo: srNo,
          date: sr.date || "-",
          partyName: party,
          issueType: "MISSING_DOUBLE_ENTRY",
          issueSeverity: "HIGH",
          debitTotal: netTotal,
          creditTotal: 0,
          difference: netTotal,
          description: `Sales Return / Credit Note ${srNo} (₹${netTotal.toLocaleString("en-IN")}) has NO accounting double-entry transaction in journal!`,
          canAutoFix: true,
          rawRecord: sr
        });
      }
    });

    // 5. Audit Missing Double Entry Journal Transactions for Purchase Returns
    const purchaseReturns = this.purchaseReturns || [];
    purchaseReturns.forEach(pr => {
      if (!pr || !isInFyRange(pr.date)) return;
      const prId = String(pr.id || "");
      const prNo = pr.debitNoteNo || pr.reference || pr.id || "-";
      const party = getPartyName(pr.supplier || pr.supplierId) || "Supplier";
      const netTotal = Math.round((parseFloat(pr.grandTotal || pr.total || 0)) * 100) / 100;

      const txMatch = txs.find(t => t && (String(t.id) === prId || String(t.voucherId) === prId || String(t.reference) === prNo));
      if (!txMatch) {
        findings.push({
          id: `MISSING_PR-${prId}`,
          docId: prId,
          sourceType: "PURCHASE_RETURN",
          voucherType: "PURCHASE RETURN (DEBIT NOTE)",
          voucherNo: prNo,
          date: pr.date || "-",
          partyName: party,
          issueType: "MISSING_DOUBLE_ENTRY",
          issueSeverity: "HIGH",
          debitTotal: netTotal,
          creditTotal: 0,
          difference: netTotal,
          description: `Purchase Return / Debit Note ${prNo} (₹${netTotal.toLocaleString("en-IN")}) has NO accounting double-entry transaction in journal!`,
          canAutoFix: true,
          rawRecord: pr
        });
      }
    });

    // 6. Audit Missing Double Entry Journal Transactions for Stock Adjustments
    const stockAdjs = this.stockAdjustments || [];
    stockAdjs.forEach(sa => {
      if (!sa || !isInFyRange(sa.date)) return;
      const saId = String(sa.id || "");
      const saNo = sa.refNo || sa.id || "-";
      const refSearch = `Stock Adj: ${saNo}`;

      const txMatch = txs.find(t => t && (String(t.reference) === refSearch || String(t.id) === saId));
      if (!txMatch) {
        findings.push({
          id: `MISSING_SA-${saId}`,
          docId: saId,
          sourceType: "STOCK_ADJ",
          voucherType: "STOCK ADJUSTMENT",
          voucherNo: saNo,
          date: sa.date || "-",
          partyName: sa.employee || "Inventory Control",
          issueType: "MISSING_DOUBLE_ENTRY",
          issueSeverity: "MEDIUM",
          debitTotal: 0,
          creditTotal: 0,
          difference: 0,
          description: `Stock Adjustment ${saNo} has NO matching double-entry accounting transaction in ledger.`,
          canAutoFix: true,
          rawRecord: sa
        });
      }
    });

    return findings;
  }

  autoFixDoubleEntryIssue(finding) {
    if (!finding) return { success: false, message: "Invalid finding record." };

    const { sourceType, docId, issueType, rawRecord } = finding;

    try {
      if (sourceType === "INVOICE") {
        const inv = rawRecord || (this.invoices || []).find(i => String(i.id) === String(docId));
        if (inv) {
          this.recreateInvoiceTransaction(inv);
          this.saveState();
          return { success: true, message: `Successfully generated double-entry transaction for Invoice #${finding.voucherNo}.` };
        }
      } else if (sourceType === "PURCHASE") {
        const pur = rawRecord || (this.purchases || []).find(p => String(p.id) === String(docId));
        if (pur) {
          this.recreatePurchaseTransaction(pur);
          this.saveState();
          return { success: true, message: `Successfully generated double-entry transaction for Purchase Bill #${finding.voucherNo}.` };
        }
      } else if (sourceType === "STOCK_ADJ") {
        const doc = rawRecord || (this.stockAdjustments || []).find(a => String(a.id) === String(docId));
        if (doc) {
          this.recreateStockAdjustmentTransaction(doc);
          this.saveState();
          return { success: true, message: `Successfully re-created double-entry transaction for Stock Adjustment #${finding.voucherNo}.` };
        }
      } else if (sourceType === "TRANSACTION") {
        const txIndex = (this.transactions || []).findIndex(t => String(t.id) === String(docId));
        if (txIndex >= 0) {
          const tx = this.transactions[txIndex];
          if (issueType === "EMPTY_ENTRIES") {
            this.transactions.splice(txIndex, 1);
            this.saveState();
            return { success: true, message: `Removed empty corrupted transaction #${finding.voucherNo}.` };
          } else if (issueType === "UNBALANCED" || issueType === "SINGLE_ENTRY") {
            let dSum = 0, cSum = 0;
            (tx.entries || []).forEach(e => {
              dSum += parseFloat(e.debit) || 0;
              cSum += parseFloat(e.credit) || 0;
            });
            dSum = Math.round(dSum * 100) / 100;
            cSum = Math.round(cSum * 100) / 100;

            if (dSum > cSum) {
              const diff = Math.round((dSum - cSum) * 100) / 100;
              tx.entries.push({ accountId: "3200", debit: 0, credit: diff, description: "Auto-balancing entry" });
            } else if (cSum > dSum) {
              const diff = Math.round((cSum - dSum) * 100) / 100;
              tx.entries.push({ accountId: "3200", debit: diff, credit: 0, description: "Auto-balancing entry" });
            }
            this.saveState();
            return { success: true, message: `Auto-balanced transaction #${finding.voucherNo} with Retained Earnings entry.` };
          } else if (issueType === "UNKNOWN_LEDGER") {
            (tx.entries || []).forEach(e => {
              if (!e.accountId) e.accountId = "1010";
            });
            this.saveState();
            return { success: true, message: `Resolved missing account IDs in transaction #${finding.voucherNo}.` };
          }
        }
      }

      this.rebuildAllTaxTransactions();
      this.saveState();
      return { success: true, message: `Re-processed accounting entries for #${finding.voucherNo}.` };
    } catch (err) {
      return { success: false, message: `Failed to fix issue: ${err.message}` };
    }
  }

  autoFixAllDoubleEntryIssues(options = {}) {
    const findings = this.findMissingAndUnbalancedDoubleEntries(options);
    if (!findings || findings.length === 0) {
      return { success: true, fixedCount: 0, message: "No missing or unbalanced double entry transactions found!" };
    }

    let fixedCount = 0;
    this._suppressSave = true;

    this.rebuildAllTaxTransactions();
    this.cleanDuplicateTransactions();

    findings.forEach(f => {
      const res = this.autoFixDoubleEntryIssue(f);
      if (res && res.success) fixedCount++;
    });

    this._suppressSave = false;
    this.saveState(true);

    return {
      success: true,
      fixedCount,
      totalCount: findings.length,
      message: `Successfully resolved ${fixedCount} missing/unbalanced double entry transaction issue(s)!`
    };
  }
}


const state = new StateManager();

if (typeof window !== "undefined") {
  window._getApiUrl = (endpoint) => state.getBackendApiUrl(endpoint);

  window.addEventListener("beforeunload", () => {
    try {
      if (state && typeof state.syncToAppwriteCloud === "function") {
        state.syncToAppwriteCloud(state.getActiveCompanyId(), state.getActiveFyId(), true);
      }
    } catch (e) {}
  });

  window.addEventListener("pagehide", () => {
    try {
      if (state && typeof state.syncToAppwriteCloud === "function") {
        state.syncToAppwriteCloud(state.getActiveCompanyId(), state.getActiveFyId(), true);
      }
    } catch (e) {}
  });
}

export { state };

