
  const localStorage = {
    getItem: (key) => { if(key==='erp_active_company_id') return 'test'; return null; },
    setItem: () => {}
  };
  import {
  initialMaterials,
  initialContacts,
  initialInvoices,
  initialTransactions,
  initialAccountGroups,
  initialLedgers,
  initialUnits
} from "./sampleData.js";

// Expanded Chart of Accounts Definition
const ACCOUNTS = {
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




class StateManager {
  constructor() {
    this.listeners = [];
    this.materials = [];
    this.contacts = [];
    this.invoices = [];
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
    this.ledgers = [];
    this.units = [];
    this.seriesMaster = [];
    this.gstMaster = [];
    this.adminPassword = "123";
    this.checkAndMigrateLegacyData();
    this.loadState();
    this.clearSampleData();
    this.ensureDefaultSeries();
    this.ensureStandardGstLedgers();
    this.migrateLegacyTaxEntries();
    this.rebuildAllTaxTransactions();
    this.alignVoucherPrefixesWithSeries();
    this.realignSeriesCurrentNumbers();
    this.forceAlignTransactionUnits();
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
  }

  getCompanies() {
    return this.companies || [];
  }

  saveCompanies(companies) {
    this.companies = companies;
    this.saveState();
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

  getCompanyState() {
    const activeCompanyId = this.getActiveCompanyId();
    const activeCompany = this.getRegisteredCompanies().find(c => c.id === activeCompanyId);
    return activeCompany ? (activeCompany.state || "KERALA").toUpperCase() : "KERALA";
  }

  getLoginDate() {
    return localStorage.getItem("erp_login_date") || new Date().toISOString().split("T")[0];
  }

  setLoginDate(date) {
    localStorage.setItem("erp_login_date", date);
  }

  createCompany(companyData) {
    const companies = this.getRegisteredCompanies();
    const newId = String(companies.length > 0 ? Math.max(...companies.map(c => parseInt(c.id) || 1)) + 1 : 1);
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
      password: companyData.password || "123"
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
    if (companies.length === 0) {
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
        password: "123"
      };
      this.saveRegisteredCompanies([defaultCompany]);
      
      if (legacyState) {
        localStorage.setItem("erp_company_data_1", legacyState);
        localStorage.removeItem("erp_building_materials_state");
      } else {
        const seedState = {
          materials: [],
          contacts: [],
          invoices: [],
          transactions: [],
          purchases: [],
          salesReturns: [],
          purchaseReturns: [],
          conversions: [],
          adminPassword: "123",
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
        localStorage.setItem("erp_company_data_1", JSON.stringify(seedState));
      }
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
        const isKerala = (inv.state || companyState).toUpperCase() === companyState;
        const taxGroups = {};
        (inv.items || []).forEach(item => {
          const rate = item.gstPercent || 18;
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
        const isKerala = (pur.state || companyState).toUpperCase() === companyState;
        const taxGroups = {};
        (pur.items || []).forEach(item => {
          const rate = item.gstPercent || 18;
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

  rebuildAllTaxTransactions() {
    if (!this.transactions) return;
    
    let stateChanged = false;
    const companyState = this.getCompanyState();

    // 0. Global Scrubber for Corrupted '1010' (Cash In Hand) accounts
    // The old restoreInvoice bug forced '1010' into transactions regardless of payMode.
    // If a custom cash ledger exists, aggressively migrate all '1010' references to it.
    const customCashL = this.ledgers && this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
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

    // 1. Completely clear all Duties & Taxes (groupName: "Duties & Taxes" / GST groups) and code "2200" entries from ALL invoice/purchase-related transactions
    this.transactions.forEach(tx => {
      const idUpper = String(tx.id || "").toUpperCase();
      const refUpper = String(tx.reference || "").toUpperCase();
      const descUpper = String(tx.description || "").toUpperCase();

      // Skip purchase return and sales return transactions — they manage their own GST entries
      const isPurchaseReturn = refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("DN-") || descUpper.includes("PURCHASE RETURN");
      const isSalesReturn = refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("CN-") || refUpper.startsWith("SR-") || descUpper.includes("SALES RETURN");
      if (isPurchaseReturn || isSalesReturn) return;

      const purchasePrefixes = (this.seriesMaster || []).filter(s => s.txType === "Purchase").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
      purchasePrefixes.push("PR-", "LP-", "L-", "IPR-", "NPR-", "LPR-", "LP");

      const salesPrefixes = (this.seriesMaster || []).filter(s => s.txType === "Sales").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
      salesPrefixes.push("INV-", "IN-", "SA-", "LSL-", "ISL-", "NSL-");

      const isSales = salesPrefixes.some(p => idUpper.startsWith(p) || refUpper.startsWith(p)) || descUpper.includes("SALES") || descUpper.includes("INVOICE");
      const isPurchase = !isSales && (purchasePrefixes.some(p => idUpper.startsWith(p) || refUpper.startsWith(p)) || descUpper.includes("PURCHASE"));

      // Only clean auto-generated sales invoice/purchase transactions. Do not delete tax entries from manual vouchers!
      if (isSales || isPurchase) {
        const prevLength = tx.entries.length;
        tx.entries = tx.entries.filter(entry => {
          if (entry.accountId === "2200") return false;
          const led = this.ledgers.find(l => l.code === entry.accountId);
          if (led) {
            const n = (led.name || "").toUpperCase();
            const g = (led.groupName || "").toUpperCase();
            // Do NOT strip purchase/sales account ledgers (e.g. "IGST PURCHASE", "IGST SALES") even though their names contain "IGST"
            const isPurchaseOrSalesAccount = g === "PURCHASE ACCOUNT" || g === "SALES ACCOUNT" || g === "PURCHASE ACCOUNTS" || g === "SALES ACCOUNTS";
            if (isPurchaseOrSalesAccount) return true; // Keep these entries
            const gstGroups = ["INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
            const isGstGroup = gstGroups.includes(g) || g === "DUTIES & TAXES" || n.includes("CGST") || n.includes("SGST") || n.includes("IGST") || n.includes("CESS");
            return !isGstGroup;
          }
          return true;
        });
        if (tx.entries.length !== prevLength) {
          stateChanged = true;
        }
      }
    });

    // 2. Clean up orphaned transactions that are no longer linked to active purchases/invoices
    const activePurchases = (this.purchases || []).filter(p => !p.isCancelled);
    const activePurIds = activePurchases.map(p => String(p.id || "").toUpperCase());
    const activePurVnos = activePurchases.map(p => String(p.voucherNo || "").toUpperCase()).filter(Boolean);
    const activePurRefs = activePurchases.map(p => String(p.refNo || "").toUpperCase()).filter(Boolean);
    
    const activeInvoices = (this.invoices || []).filter(i => !i.isCancelled);
    const activeInvIds = activeInvoices.map(i => String(i.id || "").toUpperCase());
    const activeInvVnos = activeInvoices.map(i => String(i.voucherNo || "").toUpperCase()).filter(Boolean);
    const activeInvRefs = activeInvoices.map(i => String(i.refNo || "").toUpperCase()).filter(Boolean);

    const seenInvoiceVouchers = new Set();
    const seenPurchaseVouchers = new Set();

    const prevLength = this.transactions.length;
    this.transactions = this.transactions.filter(tx => {
      const idUpper = String(tx.id || "").toUpperCase();
      const refUpper = String(tx.reference || "").toUpperCase();
      const descUpper = String(tx.description || "").toUpperCase();

      // Never remove purchase return or sales return transactions in orphan cleanup
      const isPurchaseReturn = refUpper.startsWith("DEBIT NOTE") || refUpper.startsWith("DN-") || descUpper.includes("PURCHASE RETURN");
      const isSalesReturn = refUpper.startsWith("CREDIT NOTE") || refUpper.startsWith("CN-") || refUpper.startsWith("SR-") || descUpper.includes("SALES RETURN");
      if (isPurchaseReturn || isSalesReturn) return true;
      
      const purchasePrefixes = (this.seriesMaster || []).filter(s => s.txType === "Purchase").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
      purchasePrefixes.push("PR-", "LP-", "L-", "IPR-", "NPR-", "LPR-", "LP");

      const salesPrefixes = (this.seriesMaster || []).filter(s => s.txType === "Sales").map(s => (s.prefix || "").toUpperCase()).filter(Boolean);
      salesPrefixes.push("INV-", "IN-", "SA-", "LSL-", "ISL-", "NSL-");

      const isInvoiceRelated = salesPrefixes.some(p => idUpper.startsWith(p) || refUpper.startsWith(p));
      const isPurchaseRelated = !isInvoiceRelated && purchasePrefixes.some(p => idUpper.startsWith(p) || refUpper.startsWith(p));
      
      if (isPurchaseRelated) {
        const isMatched = activePurIds.includes(idUpper) || activePurIds.includes(refUpper) ||
                          activePurVnos.includes(idUpper) || activePurVnos.includes(refUpper) ||
                          activePurRefs.includes(idUpper) || activePurRefs.includes(refUpper) ||
                          activePurIds.some(pid => descUpper.includes(pid)) || 
                          activePurVnos.some(v => descUpper.includes(v)) || 
                          activePurRefs.some(r => descUpper.includes(r));
        if (isMatched) {
          const pur = activePurchases.find(p => 
            String(p.id).toUpperCase() === idUpper || String(p.id).toUpperCase() === refUpper ||
            (p.voucherNo && String(p.voucherNo).toUpperCase() === refUpper) ||
            (p.refNo && String(p.refNo).toUpperCase() === refUpper)
          );
          if (pur) {
            const key = pur.id;
            if (seenPurchaseVouchers.has(key)) return false;
            seenPurchaseVouchers.add(key);
          }
          return true;
        }
        return false;
      }
      if (isInvoiceRelated) {
        const isMatched = activeInvIds.includes(idUpper) || activeInvIds.includes(refUpper) ||
                          activeInvVnos.includes(idUpper) || activeInvVnos.includes(refUpper) ||
                          activeInvRefs.includes(idUpper) || activeInvRefs.includes(refUpper) ||
                          activeInvIds.some(iid => descUpper.includes(iid)) || 
                          activeInvVnos.some(v => descUpper.includes(v)) || 
                          activeInvRefs.some(r => descUpper.includes(r));
        if (isMatched) {
          const inv = activeInvoices.find(i => 
            String(i.id).toUpperCase() === idUpper || String(i.id).toUpperCase() === refUpper ||
            (i.voucherNo && String(i.voucherNo).toUpperCase() === refUpper) ||
            (i.refNo && String(i.refNo).toUpperCase() === refUpper)
          );
          if (inv) {
            const key = inv.id;
            if (seenInvoiceVouchers.has(key)) return false;
            seenInvoiceVouchers.add(key);
          }
          return true;
        }
        return false;
      }
      return true;
    });
    
    if (this.transactions.length !== prevLength) {
      stateChanged = true;
    }

    // 3. Re-append fresh tax entries or recreate transactions for active Invoices
    this.invoices.forEach(inv => {
      if (inv.isCancelled) return;
      const tx = this.transactions.find(t => {
        const tid = String(t.id || "").toUpperCase();
        const iid = String(inv.id || "").toUpperCase();
        const vno = String(inv.voucherNo || "").toUpperCase();
        const rno = String(inv.refNo || "").toUpperCase();
        const tref = String(t.reference || "").toUpperCase();
        const tdesc = String(t.description || "").toUpperCase();
        
        return tid === iid || 
               (iid && tref === iid) || 
               (vno && tref === vno) || 
               (rno && tref === rno) || 
               (iid && tref.includes(iid)) || 
               (vno && tref.includes(vno)) || 
               (rno && tref.includes(rno)) ||
               (iid && tdesc.includes(iid)) ||
               (vno && tdesc.includes(vno)) ||
               (rno && tdesc.includes(rno));
      });

      if (tx) {
        const isLocal = (inv.state || companyState).toUpperCase() === companyState;
        const taxGroups = {};
        (inv.items || []).forEach(item => {
          const rate = item.gstPercent || 18;
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          
          let gstAmt = parseFloat(item.gstAmount);
          if (isNaN(gstAmt) || gstAmt === undefined || gstAmt === null) {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const amt = qty * price;
            const disAmt = amt * ((parseFloat(item.discountPercent) || 0) / 100);
            const netVal = amt - disAmt;
            gstAmt = netVal * (rate / 100);
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
               tx.entries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
               tx.entries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
            } else {
               const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
               tx.entries.push({ accountId: igstLedger, debit: 0, credit: gstAmt });
            }
          }
        });

        const totalCess = (inv.totalCess || 0) + (inv.additionalCess || 0);
        if (totalCess > 0) {
          tx.entries.push({ accountId: "2200", debit: 0, credit: totalCess });
        }
        stateChanged = true;
      } else {
        this.recreateInvoiceTransaction(inv);
        stateChanged = true;
      }
    });

    // 4. Re-append fresh tax entries or recreate transactions for active Purchases
    this.purchases.forEach(pur => {
      if (pur.isCancelled) return;
      const tx = this.transactions.find(t => {
        const tid = String(t.id || "").toUpperCase();
        const pid = String(pur.id || "").toUpperCase();
        const vno = String(pur.voucherNo || "").toUpperCase();
        const rno = String(pur.refNo || "").toUpperCase();
        const tref = String(t.reference || "").toUpperCase();
        const tdesc = String(t.description || "").toUpperCase();
        
        return tid === pid || 
               (pid && tref === pid) || 
               (vno && tref === vno) || 
               (rno && tref === rno) || 
               (pid && tref.includes(pid)) || 
               (vno && tref.includes(vno)) || 
               (rno && tref.includes(rno)) ||
               (pid && tdesc.includes(pid)) ||
               (vno && tdesc.includes(vno)) ||
               (rno && tdesc.includes(rno));
      });

      if (tx) {
        const isLocal = (pur.state || companyState).toUpperCase() === companyState;
        const taxGroups = {};
        (pur.items || []).forEach(item => {
          const rate = item.gstPercent || 18;
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          
          let gstAmt = parseFloat(item.gstAmount);
          if (isNaN(gstAmt) || gstAmt === undefined || gstAmt === null) {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const amt = qty * price;
            const disAmt = amt * ((parseFloat(item.discountPercent) || 0) / 100);
            const netVal = amt - disAmt;
            gstAmt = netVal * (rate / 100);
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
               tx.entries.push({ accountId: cgstLedger, debit: cgstAmt, credit: 0 });
               tx.entries.push({ accountId: sgstLedger, debit: sgstAmt, credit: 0 });
            } else {
               const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Input IGST ${rate.toFixed(1).replace(".0", "")}%`);
               tx.entries.push({ accountId: igstLedger, debit: gstAmt, credit: 0 });
            }
          }
        });

        const totalCess = (pur.totalCess || 0) + (pur.additionalCess || 0);
        if (totalCess > 0) {
          tx.entries.push({ accountId: "2200", debit: totalCess, credit: 0 });
        }
        stateChanged = true;
      } else {
        this.recreatePurchaseTransaction(pur);
        stateChanged = true;
      }
    });

    // 5. Re-append fresh tax entries for active Purchase Returns
    (this.purchaseReturns || []).forEach(pr => {
      const tx = this.transactions.find(t => {
        const tref = String(t.reference || "").toUpperCase();
        const tdesc = String(t.description || "").toUpperCase();
        const prid = String(pr.id || "").toUpperCase();
        return tref === `DEBIT NOTE ${prid}` || tref === prid || tref.includes(prid);
      });

      if (tx) {
        // Strip existing GST entries first to avoid duplicates
        tx.entries = tx.entries.filter(entry => {
          const led = this.ledgers.find(l => l.code === entry.accountId);
          if (led) {
            const n = (led.name || "").toUpperCase();
            const g = (led.groupName || "").toUpperCase();
            const isPurchaseOrSalesAccount = g === "PURCHASE ACCOUNT" || g === "SALES ACCOUNT" || g === "PURCHASE ACCOUNTS" || g === "SALES ACCOUNTS";
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
          const rate = item.gstPercent || 18;
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
        return tref === `CREDIT NOTE ${srid}` || tref === srid || tref.includes(srid);
      });

      if (tx) {
        // Strip existing GST entries first to avoid duplicates
        tx.entries = tx.entries.filter(entry => {
          const led = this.ledgers.find(l => l.code === entry.accountId);
          if (led) {
            const n = (led.name || "").toUpperCase();
            const g = (led.groupName || "").toUpperCase();
            const isPurchaseOrSalesAccount = g === "PURCHASE ACCOUNT" || g === "SALES ACCOUNT" || g === "PURCHASE ACCOUNTS" || g === "SALES ACCOUNTS";
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
          const rate = item.gstPercent || 18;
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
    let customer = null;
    if (inv.contactId === "__CASH__") {
      customer = { id: "__CASH__", name: "CASH SALES" };
    } else {
      customer = this.contacts.find(c => c.id === inv.contactId);
    }
    const customerName = customer ? customer.name : "Customer";
    
    let debitAccount = inv.siteName ? `${inv.contactId}::${inv.siteName}` : inv.contactId;
    if (inv.payMode === "Cash") {
      const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
      debitAccount = cashL ? cashL.code : "1010";
    } else if (inv.payMode === "Bank") {
      const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
      debitAccount = bankL ? bankL.code : "1020";
    }

    const sVoucherNo = inv.voucherNo || inv.id;
    const salesCreditLedger = "L022";
    
    let totalDebit = parseFloat(inv.total);
    const salesCredit = parseFloat((inv.subtotal - (inv.discount || 0)).toFixed(2));

    const salesEntries = [
      { accountId: debitAccount, debit: totalDebit, credit: 0 },
      { accountId: salesCreditLedger, debit: 0, credit: salesCredit }
    ];

    let runningCredit = salesCredit;
    let runningDebit = totalDebit;

    const isKerala = (inv.state || (customer && customer.state) || this.getCompanyState()).toUpperCase() === this.getCompanyState();
    const taxGroups = {};
    (inv.items || []).forEach(item => {
      const rate = item.gstPercent || 18;
      if (!taxGroups[rate]) taxGroups[rate] = 0;
      
      let gstAmt = parseFloat(item.gstAmount);
      if (isNaN(gstAmt) || gstAmt === undefined || gstAmt === null) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const amt = qty * price;
        const disAmt = amt * ((parseFloat(item.discountPercent) || 0) / 100);
        const netVal = amt - disAmt;
        gstAmt = netVal * (rate / 100);
      }
      taxGroups[rate] += gstAmt;
    });

    Object.keys(taxGroups).forEach(rateStr => {
      const rate = parseFloat(rateStr);
      const gstAmt = taxGroups[rateStr];
      if (gstAmt > 0) {
        if (isKerala) {
          const cgstAmt = parseFloat((gstAmt / 2).toFixed(2));
          const sgstAmt = parseFloat((gstAmt / 2).toFixed(2));
          const cgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output CGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          const sgstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output SGST ${(rate / 2).toFixed(1).replace(".0", "")}%`);
          salesEntries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
          salesEntries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
          runningCredit += cgstAmt + sgstAmt;
        } else {
          const igstAmt = parseFloat(gstAmt.toFixed(2));
          const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
          salesEntries.push({ accountId: igstLedger, debit: 0, credit: igstAmt });
          runningCredit += igstAmt;
        }
      }
    });

    const totalCess = parseFloat(((inv.totalCess || 0) + (inv.additionalCess || 0)).toFixed(2));
    if (totalCess > 0) {
      salesEntries.push({ accountId: "2200", debit: 0, credit: totalCess });
      runningCredit += totalCess;
    }

    if (inv.adjustmentsList) {
      inv.adjustmentsList.forEach(a => {
        const amt = parseFloat(parseFloat(a.amount || 0).toFixed(2));
        if (amt > 0) {
          let ledgerCode = a.ledgerCode;
          if (!ledgerCode || ledgerCode === "L002") {
            if (a.name.toUpperCase() === "LOADING CHARGES" || a.name.toUpperCase() === "LOADING CHARGE") {
              ledgerCode = "L032";
            } else if (a.name.toUpperCase() === "UNLOADING CHARGE" || a.name.toUpperCase() === "UNLOADING CHARGE AT SITE") {
              ledgerCode = "L033";
            } else if (a.name.toUpperCase() === "FREIGHT" || a.name.toUpperCase() === "FREIGHT ON SALES") {
              ledgerCode = "L030";
            } else {
              const master = this.salesAdjustments.find(m => m.name.toUpperCase() === a.name.toUpperCase());
              ledgerCode = master ? master.ledgerCode : "L002";
            }
            a.ledgerCode = ledgerCode;
          }
          if (a.type === "Add") {
            salesEntries.push({ accountId: ledgerCode, debit: 0, credit: amt });
            runningCredit += amt;
          } else {
            salesEntries.push({ accountId: ledgerCode, debit: amt, credit: 0 });
            runningDebit += amt;
          }
        }
      });
    }

    const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
    const roundCode = roundL ? roundL.code : "5600";

    const roundOff = parseFloat(inv.roundOff) || 0;
    let finalRoundOff = parseFloat(roundOff.toFixed(2));
    if (finalRoundOff > 0) {
      salesEntries.push({ accountId: roundCode, debit: 0, credit: finalRoundOff });
      runningCredit += finalRoundOff;
    } else if (finalRoundOff < 0) {
      salesEntries.push({ accountId: roundCode, debit: Math.abs(finalRoundOff), credit: 0 });
      runningDebit += Math.abs(finalRoundOff);
    }

    const diff = parseFloat((runningDebit - runningCredit).toFixed(2));
    if (diff !== 0) {
        if (diff > 0) {
            salesEntries.push({ accountId: roundCode, debit: 0, credit: diff });
        } else {
            salesEntries.push({ accountId: roundCode, debit: Math.abs(diff), credit: 0 });
        }
    }

    this.transactions.push({
      id: inv.id,
      date: inv.date,
      reference: `Invoice ${sVoucherNo}`,
      description: `Sales to ${customerName}`,
      siteName: inv.siteName || "",
      entries: salesEntries
    });
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
    this.invoices.forEach(inv => {
      if (!inv) return;
      let series = null;
      if (inv.seriesId) {
        series = this.seriesMaster.find(s => s.id === inv.seriesId);
      } else {
        const vnoStr = String(inv.voucherNo || inv.refNo || inv.id || "").toUpperCase();
        series = this.seriesMaster.find(s => {
          if (s.txType !== "Sales") return false;
          const pref = (s.prefix || "").toUpperCase();
          return pref && vnoStr.startsWith(pref);
        });
        if (!series) {
          series = this.seriesMaster.find(s => s.txType === "Sales" && s.isActive);
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
        } else {
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
    this.purchases.forEach(pur => {
      if (!pur) return;
      let series = null;
      if (pur.seriesId) {
        series = this.seriesMaster.find(s => s.id === pur.seriesId);
      } else {
        const vnoStr = String(pur.voucherNo || pur.refNo || pur.id || "").toUpperCase();
        series = this.seriesMaster.find(s => {
          if (s.txType !== "Purchase") return false;
          const pref = (s.prefix || "").toUpperCase();
          return pref && vnoStr.startsWith(pref);
        });
        if (!series) {
          series = this.seriesMaster.find(s => s.txType === "Purchase" && s.isActive);
        }
      }

      if (series && series.prefix) {
        const prefix = series.prefix;
        const prefixEscaped = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`^${prefixEscaped}\\d+$`, "i");
        
        const primaryNo = String(pur.refNo || pur.voucherNo || pur.id || "");
        if (primaryNo && regex.test(primaryNo)) {
          if (pur.voucherNo !== primaryNo) { pur.voucherNo = primaryNo; changed = true; }
          if (pur.refNo !== primaryNo) { pur.refNo = primaryNo; changed = true; }
          if (pur.id !== primaryNo) { pur.id = primaryNo; changed = true; }
        } else {
          let oldVno = primaryNo;
          if (oldVno) {
            const matchNum = oldVno.match(/\d+$/);
            const numStr = matchNum ? matchNum[0] : "";
            const num = parseInt(numStr) || 1;
            const digits = parseInt(series.digits) || 4;
            const newVno = prefix + String(num).padStart(digits, '0');

            const prevId = pur.id;
            pur.id = newVno;
            pur.refNo = newVno;
            pur.voucherNo = newVno;

            this.transactions.forEach(t => {
              if (t.reference === oldVno || t.reference === prevId) {
                t.reference = newVno;
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
      const nameUpper = l.name.toUpperCase();
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
      let ledger = this.ledgers.find(l => l.name && l.name.toUpperCase() === entry.name.toUpperCase());
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
      const nameUpper = l.name.toUpperCase();
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
  async loadState(skipNotify = false) {
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

      // Try loading from Firestore
      const docRef = doc(db, "company_data", activeId);
      const docSnap = await getDoc(docRef);
      
      let parsed = {};
      if (docSnap.exists()) {
        parsed = docSnap.data();
      } else {
        // Fallback to localStorage for migration
        const stored = localStorage.getItem(`erp_company_data_${activeId}`);
        if (stored) {
          parsed = JSON.parse(stored);
        }
      }

      this.materials = parsed.materials || [];
      this.contacts = parsed.contacts || [];
      this.invoices = parsed.invoices || [];
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
      this.hsnCodes = parsed.hsnCodes || [];
      this.stockAdjustments = parsed.stockAdjustments || [];
      this.productGroups = parsed.productGroups || [];
      this.categories = parsed.categories || [];
      this.subCategories = parsed.subCategories || [];
      this.productNames = parsed.productNames || [];
      this.seriesMaster = parsed.seriesMaster || [];

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
          const key = g.name.toUpperCase();
          if (expectedParents[key] && (g.under || "").toUpperCase() !== expectedParents[key]) {
            g.under = expectedParents[key];
            groupStateChanged = true;
          }
        });
        if (groupStateChanged) {
          this.saveState();
        }

        this.ledgers = (parsed.ledgers || []).map(l => {
          if (l.name) l.name = l.name.toUpperCase();
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

        // Find next purchase counter without overwriting user voucher numbers or deduplicating
        if (this.purchases && this.purchases.length > 0 && this.seriesMaster) {
          const activePurSeries = this.seriesMaster.find(s => s.id === "SER-LOCAL-PURCHASE");
          if (activePurSeries) {
            const prefix = activePurSeries.prefix || "LPR-";
            let maxNum = 0;
            this.purchases.forEach(p => {
              const vno = p.voucherNo || "";
              if (vno.startsWith(prefix)) {
                const num = parseInt(vno.substring(prefix.length)) || 0;
                if (num > maxNum) maxNum = num;
              }
            });
            activePurSeries.currentNumber = maxNum + 1;
          }
        }

        // Find next sales counter without overwriting user voucher numbers or deduplicating
        if (this.invoices && this.invoices.length > 0 && this.seriesMaster) {
          const activeSalesSeries = this.seriesMaster.find(s => s.id === "SER-LOCAL-SALES");
          if (activeSalesSeries) {
            const prefix = activeSalesSeries.prefix || "LSL-";
            let maxNum = 0;
            this.invoices.forEach(inv => {
              const vno = inv.voucherNo || "";
              if (vno.startsWith(prefix)) {
                const num = parseInt(vno.substring(prefix.length)) || 0;
                if (num > maxNum) maxNum = num;
              }
            });
            activeSalesSeries.currentNumber = maxNum + 1;
          }
        }

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

        // Remove the auto-generated "Opening Balance" capital entry (TX-1001) — user did not create this
        const opBalIdx = this.transactions.findIndex(t => t.id === "TX-1001" || t.reference === "Opening Balance");
        if (opBalIdx !== -1) {
          this.transactions.splice(opBalIdx, 1);
          this.saveState();
        }

        if (!localStorage.getItem("debit_note_wipe_done")) {
          console.log("Wiping corrupted purchase returns once...");
          this.purchaseReturns = [];
          this.transactions = this.transactions.filter(t => {
            const ref = (t.reference || "").toUpperCase();
            return !ref.startsWith("DEBIT NOTE") && !ref.startsWith("PR-") && !ref.startsWith("DN-");
          });
          localStorage.setItem("debit_note_wipe_done", "true");
          this.saveState(true);
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
        // Recompute all stock from transaction history on load
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
    this.materials.forEach(m => {
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

    // Add purchase return quantities
    this.purchases.forEach(pur => {
      if (pur.isCancelled) return;
      (pur.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || item.price || mat.landingCost || 350);
          let batch = mat.batches.find(b => b.batchNo === bNo);
          if (!batch) {
            batch = {
              batchNo: bNo,
              landingCost: parseFloat(item.price) || mat.landingCost || 350,
              sellingPrice: parseFloat(item.sellingPrice) || mat.gstExclRate || 380,
              mrp: parseFloat(item.mrp) || mat.mrp || 400,
              stock: 0
            };
            mat.batches.push(batch);
          }
          batch.stock += parseFloat(item.quantity) || 0;
        }
      });
    });

    // Subtract sales quantities
    this.invoices.forEach(inv => {
      if (inv.isCancelled) return;
      (inv.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          let batch = mat.batches.find(b => b.batchNo === bNo);
          if (!batch) {
            batch = {
              batchNo: bNo,
              landingCost: mat.landingCost || 350,
              sellingPrice: parseFloat(item.price) || mat.gstExclRate || 380,
              mrp: parseFloat(item.mrp) || mat.mrp || 400,
              stock: 0
            };
            mat.batches.push(batch);
          }
          batch.stock -= parseFloat(item.quantity) || 0;
        }
      });
    });

    // Add sales returns
    (this.salesReturns || []).forEach(ret => {
      (ret.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          let batch = mat.batches.find(b => b.batchNo === bNo);
          if (batch) {
            batch.stock += parseFloat(item.quantity) || 0;
          }
        }
      });
    });

    // Subtract purchase returns
    (this.purchaseReturns || []).forEach(ret => {
      (ret.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          let batch = mat.batches.find(b => b.batchNo === bNo);
          if (batch) {
            batch.stock -= parseFloat(item.quantity) || 0;
          }
        }
      });
    });

    // Apply Stock Adjustments
    (this.stockAdjustments || []).forEach(adj => {
      if (adj.isCancelled) return;
      (adj.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          let batch = mat.batches.find(b => b.batchNo === bNo) || mat.batches[0];
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
      m.stock = m.batches.reduce((sum, b) => sum + b.stock, 0);
      if (m.stock < 0) m.stock = 0;
      if (m.batches.length > 0) {
        const latest = m.batches[m.batches.length - 1];
        m.landingCost = latest.landingCost;
        m.gstExclRate = latest.sellingPrice;
        m.mrp = latest.mrp;
        m.costPrice = latest.landingCost;
        m.sellingPrice = latest.sellingPrice;
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

  saveState(skipNotify = false) {
    try {
      const activeId = this.getActiveCompanyId();
      if (!activeId) return;

      const stateToSave = {
        materials: this.materials,
        contacts: this.contacts,
        invoices: this.invoices,
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
        hsnCodes: this.hsnCodes,
        seriesMaster: this.seriesMaster || [],
        gstMaster: this.gstMaster || []
      };

      // Background sync to Firestore
      setDoc(doc(db, "company_data", activeId), stateToSave).catch(e => {
        console.error("Firebase save failed:", e);
      });

      localStorage.setItem(`erp_company_data_${activeId}`, JSON.stringify(stateToSave));
      if (!skipNotify) {
        this.notifyListeners();
      }
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }

  getOptions() {
    if (!this.options) {
      this.options = {
        enableEmployeeSales: true,
        enableInfluencerSales: true,
        enableCess: true,
        enable4DigitHsn: true,
        enableCessInSalesBill: false
      };
    }
    if (this.options.enableCessInSalesBill === undefined) this.options.enableCessInSalesBill = false;
    return this.options;
  }

  updateOptions(newOptions) {
    this.options = { ...this.getOptions(), ...newOptions };
    this.saveState();
  }

  // ── Series Master ──────────────────────────────────────────────
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
        name: "Local Sales (CGST+SGST)",
        prefix: "LSL-",
        digits: 4,
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
        ledgerCode: "L020",
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
      const exists = this.seriesMaster.find(s => s.id === d.id || (s.txType === d.txType && s.seriesType === d.seriesType));
      if (!exists) {
        this.seriesMaster.push(d);
        changed = true;
      } else {
        if (!exists.seriesType) { exists.seriesType = d.seriesType; changed = true; }
        if (!exists.ledgerCode) { exists.ledgerCode = d.ledgerCode; changed = true; }
        if (!exists.id) { exists.id = d.id; changed = true; }
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

    if (changed) {
      this.saveState();
    }
  }

  saveSeries(obj) {
    if (!this.seriesMaster) this.seriesMaster = [];
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
    this.saveState();
    return obj;
  }

  realignSeriesCurrentNumbers() {
    if (!this.seriesMaster) return;

    let changed = false;

    this.seriesMaster.forEach(series => {
      const prefix = series.prefix || "";
      const txType = series.txType;
      
      let maxNum = series.startingNumber || 1;
      
      if (txType.toLowerCase().includes("purchase")) {
        const purList = this.purchases || [];
        console.log(`[SERIES AUDIT] Purchase Series: ${series.name}, Prefix: "${prefix}", Total Purchases: ${purList.length}`);
        purList.forEach(pur => {
          if (!pur) return;
          const fields = ["voucherNo", "refNo", "id"];
          fields.forEach(field => {
            const vno = pur[field];
            if (vno && prefix && String(vno).toUpperCase().startsWith(prefix.toUpperCase())) {
              const numPart = String(vno).substring(prefix.length);
              const num = parseInt(numPart);
              console.log(`  -> Match field "${field}": "${vno}", numPart: "${numPart}", parsed: ${num}`);
              if (!isNaN(num) && num >= maxNum) {
                maxNum = num + 1;
              }
            }
          });
        });
      } else {
        const invList = this.invoices || [];
        console.log(`[SERIES AUDIT] Sales Series: ${series.name}, Prefix: "${prefix}", Total Invoices: ${invList.length}`);
        invList.forEach(inv => {
          if (!inv) return;
          const fields = ["voucherNo", "refNo", "id"];
          fields.forEach(field => {
            const vno = inv[field];
            if (vno && prefix && String(vno).toUpperCase().startsWith(prefix.toUpperCase())) {
              const numPart = String(vno).substring(prefix.length);
              const num = parseInt(numPart);
              console.log(`  -> Match field "${field}": "${vno}", numPart: "${numPart}", parsed: ${num}`);
              if (!isNaN(num) && num >= maxNum) {
                maxNum = num + 1;
              }
            }
          });
        });
      }

      if (series.currentNumber !== maxNum) {
        console.log(`[SERIES AUDIT] Updating currentNumber for ${series.name} from ${series.currentNumber} to ${maxNum}`);
        series.currentNumber = maxNum;
        changed = true;
      }
    });

    if (changed) {
      this.saveState(true);
    }
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
  getInvoices() { return this.invoices; }
  getTransactions() {
    console.log("getTransactions() CALLED. CHECK TX-1005:", JSON.stringify(this.transactions.find(t => t.id === "TX-1005")));
    return this.transactions;
  }
  getPurchases() { return this.purchases; }
  getSalesReturns() { return this.salesReturns; }
  getPurchaseReturns() { return this.purchaseReturns; }
  getConversions() { return this.conversions; }
  getStockAdjustments() {
     if (!this.stockAdjustments) this.stockAdjustments = [];
     return this.stockAdjustments;
   }
   saveStockAdjustment(doc) {
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
    const ledgerExists = ledgers.some(l => l.name.toUpperCase() === newEntry.name.toUpperCase());
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
      const lIdx = ledgers.findIndex(l => l.name.toUpperCase() === entry.name.toUpperCase());
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
      if (!this.ledgers.some(l => l.name && l.name.toUpperCase() === dl.name.toUpperCase())) {
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
    let ledger = this.ledgers.find(l => l.name.toUpperCase() === name.toUpperCase());
    console.log(`[DUTIES & TAXES LEDGER LOOKUP] Requested: "${name}" | Found:`, ledger ? `${ledger.name} (${ledger.code})` : "None");
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
      this.saveState();
    }
    return ledger.code;
  }
  
  addLedger(ledger) {
    if (!this.ledgers) this.ledgers = [];
    
    const codeConflict = this.ledgers.some(l => l.code.toLowerCase() === ledger.code.toLowerCase());
    if (codeConflict) throw new Error("same ledger code already exist");

    const nameConflict = this.ledgers.some(l => l.name.toLowerCase() === ledger.name.toLowerCase()) ||
                         this.contacts?.some(c => c.name.toLowerCase() === ledger.name.toLowerCase());
    if (nameConflict) throw new Error("same ledger name already exist");
    
    const newLedger = {
      code: ledger.code.toUpperCase(),
      name: ledger.name.toUpperCase(),
      groupName: ledger.groupName.toUpperCase(),
      openingBalance: parseFloat(ledger.openingBalance) || 0,
      balanceType: ledger.balanceType || "Debit"
    };
    this.ledgers.push(newLedger);
    this.saveState();
    return newLedger;
  }
  
  updateLedger(code, ledgerData) {
    const l = this.ledgers.find(x => x.code === code);
    if (!l) return null;
    
    const conflict = this.ledgers.some(x => x.code !== code && x.name.toLowerCase() === ledgerData.name.toLowerCase());
    const contactConflict = this.contacts?.some(c => c.name.toLowerCase() === ledgerData.name.toLowerCase());
    if (conflict || contactConflict) throw new Error("same ledger name already exist");

    l.name = ledgerData.name.toUpperCase();
    l.groupName = ledgerData.groupName.toUpperCase();
    l.openingBalance = parseFloat(ledgerData.openingBalance) || 0;
    l.balanceType = ledgerData.balanceType || "Debit";
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

  getAccountBalances(endDate = "") {
    const balances = {};
    
    // Initialize core accounts
    for (const code of Object.keys(ACCOUNTS)) {
      balances[code] = { balance: 0 };
    }

    const ledgers = this.getLedgers();
    ledgers.forEach(l => {
      const op = parseFloat(l.openingBalance) || 0;
      let bal = l.balanceType === "Debit" ? op : -op;
      balances[l.code] = { balance: bal };
    });

    // Dynamically include contacts so their ledger postings modify their balances
    // Also accumulate contact opening balances into control accounts (2100 / 1100)
    if (this.contacts) {
      this.contacts.forEach(c => {
        const controlAcc = (c.type === "supplier" || c.listInVendorList) ? "2100" : "1100";
        if (c.siteType === "multiple" && Array.isArray(c.sites) && c.sites.length > 0) {
          c.sites.forEach(site => {
            const siteOpBal = c.openingBalances && c.openingBalances[site] !== undefined ? parseFloat(c.openingBalances[site]) : 0;
            balances[`${c.id}::${site}`] = { balance: siteOpBal };
            // Mirror opening balance into control account
            if (siteOpBal !== 0 && balances[controlAcc]) {
              balances[controlAcc].balance += siteOpBal;
            }
          });
        } else {
          const opBal = parseFloat(c.openingBalance) || 0;
          balances[c.id] = { balance: opBal };
          // Mirror opening balance into control account
          if (opBal !== 0 && balances[controlAcc]) {
            balances[controlAcc].balance += opBal;
          }
        }
      });
    }

    this.transactions.forEach(tx => {
      if (endDate && tx.date > endDate) return;
      // Find matching contact and site for this transaction (if any)
      let matchedContact = null;
      let matchedSite = null;
      if (this.contacts) {
        matchedContact = this.contacts.find(c => {
          // Check if there is an entry directly using c.id or c.id::site
          const directEntry = tx.entries.find(e => e.accountId === c.id || (e.accountId && e.accountId.startsWith(c.id + "::")));
          if (directEntry) {
            if (directEntry.accountId.includes("::")) {
              matchedSite = directEntry.accountId.split("::")[1];
            }
            return true;
          }

          // Otherwise check description and reference, restricted by contact type
          const matchedInv = this.invoices.find(inv => inv.contactId === c.id && tx.reference && tx.reference.includes(inv.id));
          const matchedPur = this.purchases.find(p => p.contactId === c.id && (tx.reference && (tx.reference.includes(p.refNo) || tx.reference.includes(p.invoiceNo))));
          const matchedSalesRet = this.salesReturns.find(sr => sr.contactId === c.id && tx.reference && tx.reference.includes(sr.id));
          const matchedPurRet = this.purchaseReturns.find(pr => pr.contactId === c.id && tx.reference && tx.reference.includes(pr.id));
          
          if (matchedInv || matchedPur || matchedSalesRet || matchedPurRet) {
            matchedSite = tx.siteName || (matchedInv ? matchedInv.siteName : (matchedPur ? matchedPur.siteName : (matchedSalesRet ? matchedSalesRet.siteName : (matchedPurRet ? matchedPurRet.siteName : null))));
            return true;
          }

          // Otherwise check description/reference but strictly matching contact type
          const isCustomer = c.type === "customer" || c.listInCustomerList === true;
          const nameMatch = tx.description.toLowerCase().includes(c.name.toLowerCase()) || (tx.reference && tx.reference.toLowerCase().includes(c.name.toLowerCase()));
          if (nameMatch) {
            const isPurOrPay = tx.reference.toLowerCase().includes("purchase") || tx.reference.startsWith("DN-") || tx.reference.startsWith("PR-") || tx.description.toLowerCase().includes("payment to supplier") || tx.description.toLowerCase().includes("purchase of building");
            const isInvOrRec = tx.reference.toLowerCase().includes("invoice") || tx.reference.startsWith("CN-") || tx.reference.startsWith("SR-") || tx.description.toLowerCase().includes("receipt from customer") || tx.description.toLowerCase().includes("sales invoice to");
            if (isCustomer && !isPurOrPay) {
              return true;
            }
            if (!isCustomer && !isInvOrRec) {
              return true;
            }
          }
          return false;
        });
      }

      tx.entries.forEach(e => {
        let accId = e.accountId;
        if (balances[accId]) {
          balances[accId].balance += (e.debit - e.credit);
        }

        // If e.accountId is a contact ID or site/branch account ID, reflect it in the control account (1100 or 2100)
        let baseContactId = accId;
        if (accId.includes("::")) {
          baseContactId = accId.split("::")[0];
        }
        const contact = this.contacts?.find(c => c.id === baseContactId);
        if (contact) {
          const controlAcc = (contact.type === "supplier" || contact.listInVendorList) ? "2100" : "1100";
          if (balances[controlAcc]) {
            balances[controlAcc].balance += (e.debit - e.credit);
          }
        }

        // If the transaction is matched to a contact, and the entry is to a control account (1100 or 2100),
        // reflect it in that contact's balance (matching the specific site if multiple)
        if (matchedContact && (accId === "1100" || accId === "2100")) {
          const expectedControl = (matchedContact.type === "supplier" || matchedContact.listInVendorList) ? "2100" : "1100";
          if (accId === expectedControl) {
            let targetKey = matchedContact.id;
            if (matchedContact.siteType === "multiple" && matchedSite) {
              const actualSite = (matchedContact.sites || []).find(s => s.toLowerCase() === matchedSite.toLowerCase());
              if (actualSite) {
                targetKey = `${matchedContact.id}::${actualSite}`;
              } else if (matchedContact.sites && matchedContact.sites.length > 0) {
                targetKey = `${matchedContact.id}::${matchedContact.sites[0]}`;
              }
            } else if (matchedContact.siteType === "multiple" && matchedContact.sites && matchedContact.sites.length > 0) {
              targetKey = `${matchedContact.id}::${matchedContact.sites[0]}`;
            }
            if (balances[targetKey]) {
              balances[targetKey].balance += (e.debit - e.credit);
            }
          }
        }
      });
    });

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

  addHsnCode(code) {
    const is4Digit = this.getOptions().enable4DigitHsn !== false;
    if (!this.hsnCodes) {
      this.hsnCodes = is4Digit ? ["2523", "7214", "2505", "6901", "2517"] : ["25230000", "72140000", "25050000", "69010000", "25170000"];
    }
    const cleanCode = String(code).trim();
    if (cleanCode && !this.hsnCodes.includes(cleanCode)) {
      this.hsnCodes.push(cleanCode);
      this.saveState();
      return true;
    }
    return false;
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
    const conflict = this.contacts.some(c => c.name.toLowerCase() === contactData.name.toLowerCase());
    const ledgerConflict = this.ledgers?.some(l => l.name.toLowerCase() === contactData.name.toLowerCase());
    if (conflict || ledgerConflict) {
      throw new Error("same ledger name already exist");
    }

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
      name: contactData.name,
      type: contactData.type,
      ledgerCode: contactData.ledgerCode || "",
      nameInBill: contactData.nameInBill || contactData.name,
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
      nameInCheque: contactData.nameInCheque || contactData.name,
      siteType: contactData.siteType || "single",
      sites: Array.isArray(contactData.sites) ? contactData.sites : [],
      listInVendorList: !!contactData.listInVendorList,
      listInCustomerList: !!contactData.listInCustomerList
    };

    this.contacts.push(newContact);
    this.saveState();
    return newContact;
  }

  updateContact(id, updatedData) {
    const contact = this.contacts.find(c => c.id === id);
    if (!contact) return null;

    const conflict = this.contacts.some(c => c.id !== id && c.name.toLowerCase() === updatedData.name.toLowerCase());
    const ledgerConflict = this.ledgers?.some(l => l.name.toLowerCase() === updatedData.name.toLowerCase());
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
      name: updatedData.name,
      type: updatedData.type,
      ledgerCode: updatedData.ledgerCode || "",
      nameInBill: updatedData.nameInBill || updatedData.name,
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
      nameInCheque: updatedData.nameInCheque || updatedData.name,
      siteType: updatedData.siteType || "single",
      sites: Array.isArray(updatedData.sites) ? updatedData.sites : [],
      listInVendorList: !!updatedData.listInVendorList,
      listInCustomerList: !!updatedData.listInCustomerList
    });

    this.saveState();
    return contact;
  }

  deleteContact(id) {
    const existsInTransactions = this.transactions.some(tx => 
      tx.entries.some(e => e.accountId === id || e.accountId.startsWith(id + "::"))
    );
    const existsInInvoices = this.invoices.some(i => i.contactId === id);
    const existsInPurchases = this.purchases.some(p => p.contactId === id);
    const existsInSalesReturns = this.salesReturns.some(sr => sr.contactId === id);
    const existsInPurchaseReturns = this.purchaseReturns.some(pr => pr.contactId === id);

    if (existsInTransactions || existsInInvoices || existsInPurchases || existsInSalesReturns || existsInPurchaseReturns) {
      throw new Error("THIS LEDGER/CUSTOMER/VENDOR CANNOT DELETE AS SOME VOUCHER EXISTS AGAINST THIS LEDGER/CUSTOMER");
    }

    const idx = this.contacts.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.contacts.splice(idx, 1);
    this.saveState();
    return true;
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

  // Stock conversion (source product → target product)
  createStockConversion(convData) {
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
      reference: `Conversion ${srcMat.id}➔${tgtMat.id}`,
      description: `Stock Conversion: ${srcQty} ${srcMat.unit} of ${srcMat.name} → ${tgtQty} ${tgtMat.unit} of ${tgtMat.name}`,
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
      const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
      creditAccount = cashL ? cashL.code : "1010"; // Cash in Hand
    } else if (purchaseData.payMode === "Bank") {
      const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
      creditAccount = bankL ? bankL.code : "1020"; // Bank Current Account
    }

    const pVoucherNo = purchaseData.voucherNo || purchaseData.refNo || this.generateNextVoucherNo("purchase");
    const isKerala = (purchaseData.state || supplier.state || this.getCompanyState()).toUpperCase() === this.getCompanyState();
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
    if (!purchaseDebitLedger || purchaseDebitLedger === "L018") {
      if (seriesType === "NONTAXABLE") {
        const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE PURCHASE");
        purchaseDebitLedger = l ? (l.code || l.id) : "L021";
      } else if (seriesType === "INTERSTATE" || seriesType === "IGST" || seriesType === "OUTSTATE" || !isKerala) {
        const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "IGST PURCHASE") || this.ledgers.find(x => x.name && x.name.toUpperCase() === "INTERSTATE PURCHASE");
        purchaseDebitLedger = l ? (l.code || l.id) : "L020";
      } else {
        const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "LOCAL PURCHASE");
        purchaseDebitLedger = l ? (l.code || l.id) : "L018";
      }
    }
    const tx = {
      id: txId,
      date: purchaseData.date || new Date().toISOString().split("T")[0],
      reference: pVoucherNo,
      description: `Purchase of building materials from ${supplier.name} - Ref: ${purchaseData.refNo || "-"}`,
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
      const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
      const roundCode = roundL ? roundL.code : "5600";
      if (roundOff > 0) {
        tx.entries.push({ accountId: roundCode, debit: roundOff, credit: 0 }); // roundOff debit for purchase (adds to cost)
      } else {
        tx.entries.push({ accountId: roundCode, debit: 0, credit: Math.abs(roundOff) }); // roundOff credit for purchase (reduces cost)
      }
    }

    if (adjustments !== 0 && (!purchaseData.adjustmentsList || purchaseData.adjustmentsList.length === 0)) {
      const shippingL = this.ledgers.find(l => l.name.toUpperCase().includes("SHIPPING") || l.code === "5200" || l.name.toUpperCase().includes("TRANSPORT"));
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

    console.log(`[RECORD PURCHASE DEBUG] seriesId=${purchaseData.seriesId} seriesType=${seriesType} seriesLedgerCode=${series ? series.ledgerCode : 'NO_SERIES'} isKerala=${isKerala} purchaseState=${purchaseData.state} supplierState=${supplier.state} companyState=${this.getCompanyState()} purchaseDebitLedger=${purchaseDebitLedger}`, JSON.stringify(tx.entries));
    this.transactions.push(tx);

    // If it's a Credit purchase, increase vendor balance payable
    if (purchaseData.payMode === "Credit") {
      supplier.balance = (supplier.balance || 0) - itemsNetTotal;
    }

    const pId = purchaseData.id || purchaseData.refNo || ("PUR-" + String(this.purchases.length + 1).padStart(3, "0"));
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

    // Increment series number if series was used
    if (purchaseData.seriesId) {
      const s = this.seriesMaster?.find(ser => ser.id === purchaseData.seriesId);
      if (s) s.currentNumber = (s.currentNumber || s.startingNumber || 1) + 1;
    }

    this.recomputeAllStocks();
    this.saveState();
    return true;
  }

  createPurchaseReturn(returnData) {
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
      const gstPercent = parseFloat(item.gstPercent) || (mat ? (parseFloat(mat.igst) || 18) : 18);
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
    const originalSeriesType = originalSeries ? originalSeries.seriesType : null;
    const isIGSTBySeriesType = originalSeriesType && ["INTERSTATE", "IGST", "OUTSTATE"].includes(originalSeriesType.toUpperCase());
    // Fall back to state comparison only if we couldn't resolve the series
    const isKeralaByState = (returnData.state || supplier.state || this.getCompanyState()).toUpperCase() === this.getCompanyState();
    const isKerala = isIGSTBySeriesType ? false : isKeralaByState;

    const taxGroups = {};
    returnData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      // Use item-level gstPercent first (saved at bill time), fallback to material igst, then default 18
      const rate = parseFloat(item.gstPercent) || (mat ? (parseFloat(mat.igst) || 18) : 18);
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
      const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
      const roundCode = roundL ? roundL.code : "5600";
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

    console.log(`[CREATE PURCHASE RETURN] Pushing transaction to database: ID: ${txId} | Reference: Debit Note ${dnId} | Entries:`, JSON.stringify(entries));
    this.transactions.push({
      id: txId,
      date: returnData.date || new Date().toISOString().split("T")[0],
      reference: `Debit Note ${dnId}`,
      description: `Purchase Return to ${supplier.name}`,
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
    const customer = this.contacts.find(c => c.id === returnData.contactId && (c.type === "customer" || c.listInCustomerList === true));
    if (!customer) return false;

    let subtotal = 0;
    let totalGst = 0;
    const returnItems = [];
    let cogsReversal = 0;

    returnData.items.forEach(item => {
      const mat = this.materials.find(m => m.id === item.materialId);
      if (!mat) return;

      const qty = parseFloat(item.quantity);
      const rate = parseFloat(item.price);
      const gstPercent = parseFloat(item.gstPercent) || (mat ? (parseFloat(mat.igst) || 18) : 18);
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
      const rate = parseFloat(item.gstPercent) || (mat ? (parseFloat(mat.igst) || 18) : 18);
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

    const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
    const roundCode = roundL ? roundL.code : "5600";
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
      reference: `Credit Note ${cnId}`,
      description: `Sales Return from ${customer.name}`,
      siteName: returnData.siteName || "",
      entries: entries
    });

    if (cogsReversal > 0) {
      const cogsTxId = this.generateNextTxId();
      this.transactions.push({
        id: cogsTxId,
        date: returnData.date || new Date().toISOString().split("T")[0],
        reference: `${cnId} COGS`,
        description: `COGS reversal for credit note`,
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

    this.saveState();
    return true;
  }

  // --- SALES INVOICES (BATCH-WISE OUTGOING - ERP Style) ---
  createInvoice(invoiceData) {
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
      
      const genDisAmt = taxableBeforeGeneral * (generalDiscPercent / 100);
      const netVal = taxableBeforeGeneral - genDisAmt;

      subtotal += amt;
      totalDiscount += (rowDisAmt + genDisAmt);

      const gstPercent = seriesType === "NONTAXABLE" ? 0 : ((item.gstPercent !== undefined && item.gstPercent !== null && item.gstPercent !== "") ? parseFloat(item.gstPercent) : ((mat.igst !== undefined && mat.igst !== null) ? mat.igst : 18));
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
    let debitAccount = invoiceData.siteName ? `${invoiceData.contactId}::${invoiceData.siteName}` : invoiceData.contactId;
    if (invoiceData.payMode === "Cash") {
      const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
      debitAccount = cashL ? cashL.code : "1010"; // Cash in Hand
    } else if (invoiceData.payMode === "Bank") {
      const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
      debitAccount = bankL ? bankL.code : "1020"; // Bank Current Account
    }

    const isKerala = (invoiceData.state || customer.state || this.getCompanyState()).toUpperCase() === this.getCompanyState();
    const taxGroups = {};
    items.forEach(item => {
      const rate = item.gstPercent || 18;
      if (!taxGroups[rate]) taxGroups[rate] = 0;
      taxGroups[rate] += item.gstAmount;
    });

    const salesCreditLedger = (series ? series.ledgerCode : null) || "L022"; // Defaults to LOCAL SALES ledger
    const salesEntries = [
      { accountId: debitAccount, debit: itemsNetTotal, credit: 0 },
      { accountId: salesCreditLedger, debit: 0, credit: (subtotal - totalDiscount) }
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
          salesEntries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
          salesEntries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
        } else {
          const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
          salesEntries.push({ accountId: igstLedger, debit: 0, credit: gstAmt });
        }
      }
    });

    if (totalCess + additionalCess > 0) {
      salesEntries.push({ accountId: "2200", debit: 0, credit: (totalCess + additionalCess) });
    }
    if (invoiceDiscount > 0) {
      salesEntries.push({ accountId: salesCreditLedger, debit: invoiceDiscount, credit: 0 });
    }

    if (roundOff !== 0) {
      const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
      const roundCode = roundL ? roundL.code : "5600";
      if (roundOff > 0) {
        salesEntries.push({ accountId: roundCode, debit: 0, credit: roundOff });
      } else {
        salesEntries.push({ accountId: roundCode, debit: Math.abs(roundOff), credit: 0 });
      }
    }

    if (adjustments !== 0 && (!invoiceData.adjustmentsList || invoiceData.adjustmentsList.length === 0)) {
      const shippingL = this.ledgers.find(l => l.name.toUpperCase().includes("SHIPPING") || l.code === "4200");
      const shippingCode = shippingL ? shippingL.code : "4200";
      if (adjustments > 0) {
        salesEntries.push({ accountId: shippingCode, debit: 0, credit: adjustments });
      } else {
        salesEntries.push({ accountId: shippingCode, debit: Math.abs(adjustments), credit: 0 });
      }
    }

    if (invoiceData.adjustmentsList) {
      invoiceData.adjustmentsList.forEach(a => {
        const amt = parseFloat(a.amount) || 0;
        if (amt > 0) {
          let ledgerCode = a.ledgerCode;
          if (!ledgerCode || ledgerCode === "L002") {
            if (a.name.toUpperCase() === "LOADING CHARGES" || a.name.toUpperCase() === "LOADING CHARGE") {
              ledgerCode = "L032";
            } else if (a.name.toUpperCase() === "UNLOADING CHARGE" || a.name.toUpperCase() === "UNLOADING CHARGE AT SITE") {
              ledgerCode = "L033";
            } else if (a.name.toUpperCase() === "FREIGHT" || a.name.toUpperCase() === "FREIGHT ON SALES") {
              ledgerCode = "L030";
            } else {
              const master = this.salesAdjustments.find(m => m.name.toUpperCase() === a.name.toUpperCase());
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

    const sVoucherNo = invoiceData.voucherNo || this.generateNextVoucherNo("sales");
    this.transactions.push({
      id: invoiceTxId,
      date: invoiceData.date || new Date().toISOString().split("T")[0],
      reference: sVoucherNo,
      description: `Sales Invoice to ${customer.name} - Employee: ${invoiceData.employee || "-"}`,
      siteName: invoiceData.siteName || "",
      entries: salesEntries
    });

    if (totalCogs > 0) {
      const cogsTxId = this.generateNextTxId();
      this.transactions.push({
        id: cogsTxId,
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
    if (invoiceData.payMode === "Credit") {
      customer.balance = (customer.balance || 0) + itemsNetTotal;
    }

    const newInvoice = {
      id: invoiceId,
      seriesId: invoiceData.seriesId || "",
      voucherNo: sVoucherNo,
      refNo: invoiceData.refNo || "",
      employee: invoiceData.employee || "",
      date: invoiceData.date || new Date().toISOString().split("T")[0],
      dueDate: invoiceData.dueDate || new Date().toISOString().split("T")[0],
      contactId: invoiceData.contactId,
      contactName: customer.name,
      siteName: invoiceData.siteName || "",
      state: invoiceData.state || "KERALA",
      payMode: invoiceData.payMode || "Cash",
      creditPeriod: invoiceData.creditPeriod || "",
      narration: invoiceData.narration || "",
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
      paidAmount: invoiceData.payMode !== "Credit" ? itemsNetTotal : 0.00,
      status: invoiceData.payMode !== "Credit" ? "paid" : "unpaid"
    };

    // Increment series number only for NEW invoices, not edits.
    // When editing, invoiceData.id is the existing invoice's id (passed from the UI).
    if (invoiceData.seriesId && !invoiceData.id) {
      const s = this.seriesMaster?.find(ser => ser.id === invoiceData.seriesId);
      if (s) s.currentNumber = (s.currentNumber || s.startingNumber || 1) + 1;
    }

    this.invoices.push(newInvoice);
    this.recomputeAllStocks();
    this.saveState();
    return newInvoice;
  }

  createContraVoucher(data) {
    const amount = parseFloat(data.amount) || 0;
    if (amount <= 0) return false;

    const txId = this.generateNextTxId();
    this.transactions.push({
      id: txId,
      date: data.date || new Date().toISOString().split("T")[0],
      reference: data.reference || "Contra",
      description: data.description || "Contra Transfer",
      entries: [
        { accountId: data.toAccountId, debit: amount, credit: 0 },
        { accountId: data.fromAccountId, debit: 0, credit: amount }
      ]
    });
    this.saveState();
    return true;
  }

  createReceiptVoucher(data) {
    const cashAmt = parseFloat(data.cashAmount) || 0;
    const bankAmt = parseFloat(data.bankAmount) || 0;
    const amount = (cashAmt > 0 || bankAmt > 0) ? (cashAmt + bankAmt) : (parseFloat(data.amount) || 0);
    if (amount <= 0) return false;

    const txId = this.generateNextTxId();
    const date = data.date || new Date().toISOString().split("T")[0];
    const ref = data.reference || "Receipt";
    
    let creditAcc = data.creditAccountId;
    let desc = data.description || "";

    if (!data.isGeneral) {
      const contact = this.contacts.find(c => c.id === data.contactId);
      if (!contact) return false;
      
      contact.balance = (contact.balance || 0) - amount;
      if (contact.type === "customer") {
        creditAcc = "1100"; // Accounts Receivable
        desc = `Receipt from Customer: ${contact.name} (${ref})`;
      } else {
        creditAcc = "2100"; // Accounts Payable
        desc = `Receipt from Supplier: ${contact.name} (${ref})`;
      }
    }

    const entries = [];
    if (cashAmt > 0) {
      entries.push({ accountId: data.cashAccountId || "L009", debit: cashAmt, credit: 0 });
    }
    if (bankAmt > 0) {
      entries.push({ accountId: data.bankAccountId || "L015", debit: bankAmt, credit: 0 });
    }
    if (entries.length === 0) {
      entries.push({ accountId: data.toAccountId, debit: amount, credit: 0 });
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
    const cashAmt = parseFloat(data.cashAmount) || 0;
    const bankAmt = parseFloat(data.bankAmount) || 0;
    const amount = (cashAmt > 0 || bankAmt > 0) ? (cashAmt + bankAmt) : (parseFloat(data.amount) || 0);
    if (amount <= 0) return false;

    const txId = this.generateNextTxId();
    const date = data.date || new Date().toISOString().split("T")[0];
    const ref = data.reference || "Payment";
    
    let debitAcc = data.debitAccountId;
    let desc = data.description || "";

    if (!data.isGeneral) {
      const contact = this.contacts.find(c => c.id === data.contactId);
      if (!contact) return false;

      contact.balance = (contact.balance || 0) + amount;
      if (contact.type === "supplier") {
        debitAcc = "2100"; // Accounts Payable
        desc = `Payment to Supplier: ${contact.name} (${ref})`;
      } else {
        debitAcc = "1100"; // Accounts Receivable
        desc = `Payment to Customer: ${contact.name} (${ref})`;
      }
    }

    const entries = [];
    entries.push({ accountId: debitAcc, debit: amount, credit: 0 });
    if (cashAmt > 0) {
      entries.push({ accountId: data.cashAccountId || "L009", debit: 0, credit: cashAmt });
    }
    if (bankAmt > 0) {
      entries.push({ accountId: data.bankAccountId || "L015", debit: 0, credit: bankAmt });
    }
    if (entries.length === 1) {
      entries.push({ accountId: data.fromAccountId, debit: 0, credit: amount });
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

  getAdminPassword() {
    return this.adminPassword || "123";
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

  generateNextVoucherNo(type) {
    let prefix = "";
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

    let maxNum = 0;
    if (this.transactions) {
      this.transactions.forEach(t => {
        const ref = (t.reference || "").trim();
        if (ref.startsWith(prefix)) {
          const numPart = ref.substring(prefix.length);
          const parsed = parseInt(numPart);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      });
    }
    return prefix + (maxNum + 1);
  }

  repairVoucherNumbers() {
    if (!this.transactions) return;

    // Cleanup orphaned transactions from the previous voucher-renaming bug
    this.transactions = this.transactions.filter(t => {
      const ref = (t.reference || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      
      // If it's named as a Payment (P/PM) but is actually a Purchase
      if ((ref.startsWith("pm-") || ref.startsWith("p")) && !ref.startsWith("pr") && desc.includes("purchase of building")) {
        return false; // delete
      }
      // If it's named as a Receipt (R/RC) but is actually a Sales Invoice
      if ((ref.startsWith("rc-") || ref.startsWith("r")) && desc.includes("sales invoice to")) {
        return false; // delete
      }
      return true;
    });

    // 1. Receipts
    const receipts = this.transactions.filter(t => {
      const ref = (t.reference || "").toUpperCase();
      const desc = (t.description || "").toLowerCase();
      return ref.startsWith("RC-") || ref.startsWith("RCPT") || ref.startsWith("RECEIPT") || (ref.startsWith("R") && !ref.startsWith("RC-") && !ref.startsWith("RCPT") && !ref.startsWith("RECEIPT") && /^[R]\d+$/.test(ref)) || desc.includes("receipt from");
    });
    receipts.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
    receipts.forEach((t, i) => {
      t.reference = "RC-" + (i + 1);
    });

    // 2. Payments
    const payments = this.transactions.filter(t => {
      const ref = (t.reference || "").toUpperCase();
      const desc = (t.description || "").toLowerCase();
      return ref.startsWith("PM-") || ref.startsWith("PAY") || ref.startsWith("PAYMENT") || (ref.startsWith("P") && !ref.startsWith("PR") && !ref.startsWith("PM") && /^[P]\d+$/.test(ref)) || desc.includes("payment to");
    });
    payments.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
    payments.forEach((t, i) => {
      t.reference = "PM-" + (i + 1);
    });

    // 3. Contras
    const contras = this.transactions.filter(t => {
      const ref = (t.reference || "").toUpperCase();
      const desc = (t.description || "").toLowerCase();
      return ref.startsWith("CO-") || ref.startsWith("CONTRA") || (ref.startsWith("C") && !ref.startsWith("CN") && !ref.startsWith("CO") && /^[C]\d+$/.test(ref)) || desc.includes("contra transfer");
    });
    contras.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
    contras.forEach((t, i) => {
      t.reference = "CO-" + (i + 1);
    });

    // 4. Journals (exclude Sales, Purchases, Contras, Payments, Receipts, COGS)
    const journals = this.transactions.filter(t => {
      const ref = (t.reference || "").toUpperCase();
      const desc = (t.description || "").toLowerCase();
      return (ref.startsWith("JV-") || ref.startsWith("JV") || ref.startsWith("JOURNAL") || (ref.startsWith("J") && /^[J]\d+$/.test(ref)) || desc.includes("journal entry")) &&
             !ref.startsWith("RC-") && !ref.startsWith("PM-") && !ref.startsWith("CO-") && !ref.startsWith("PR-") && !ref.startsWith("SA-") && !ref.includes("COGS");
    });
    journals.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
    journals.forEach((t, i) => {
      t.reference = "JV-" + (i + 1);
    });

    // 5. Sales Invoices
    if (this.invoices) {
      const sortedInvoices = [...this.invoices];
      sortedInvoices.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
      sortedInvoices.forEach((inv, i) => {
        const isSeriesInv = inv.seriesId || (inv.voucherNo && (inv.voucherNo.startsWith("LSL-") || inv.voucherNo.startsWith("ISL-") || inv.voucherNo.startsWith("NSL-")));
        if (isSeriesInv) return;
        
        const vNo = "SA-" + (i + 1);
        inv.voucherNo = vNo;
        
        // Update transaction reference
        const tx = this.transactions.find(t => t.id === inv.id || t.reference === `Invoice ${inv.id}` || t.reference === `SA${i+1}`);
        if (tx) tx.reference = vNo;

        // Update COGS transaction
        const cogsTx = this.transactions.find(t => t.reference === `${inv.id} COGS` || t.reference === `SA${i+1} COGS` || t.reference === `SA-${i+1} COGS`);
        if (cogsTx) cogsTx.reference = `${vNo} COGS`;
      });
    }

    // 6. Purchases
    if (this.purchases) {
      const sortedPurchases = [...this.purchases];
      sortedPurchases.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
      sortedPurchases.forEach((pur, i) => {
        const isSeriesPur = pur.seriesId || (pur.voucherNo && (pur.voucherNo.startsWith("LPR-") || pur.voucherNo.startsWith("IPR-") || pur.voucherNo.startsWith("NPR-")));
        if (isSeriesPur) return;

        const vNo = "PR-" + (i + 1);
        pur.voucherNo = vNo;

        // Update transaction reference
        const tx = this.transactions.find(t => t.id === pur.id || t.reference === `Purchase Bill ${pur.invoiceNo}` || t.reference === `PR${i+1}`);
        if (tx) tx.reference = vNo;
      });
    }

    // 7. Sales Returns
    if (this.salesReturns) {
      this.salesReturns.forEach(sr => {
        const idStr = String(sr.id || "");
        if (idStr.startsWith("CN-") || /^\d+$/.test(idStr)) {
          const oldId = idStr;
          const numStr = idStr.replace("CN-", "");
          const num = parseInt(numStr) || 1;
          const newId = "SR-" + String(num).padStart(3, "0");
          
          sr.id = newId;
          // Update matching transactions
          if (this.transactions) {
            this.transactions.forEach(t => {
              if (t.reference === `Credit Note ${oldId}`) {
                t.reference = `Credit Note ${newId}`;
              }
              if (t.reference === `${oldId} COGS`) {
                t.reference = `${newId} COGS`;
              }
            });
          }
        }
      });
    }

    // 8. Purchase Returns
    if (this.purchaseReturns) {
      this.purchaseReturns.forEach(pr => {
        const idStr = String(pr.id || "");
        if (idStr.startsWith("DN-") || /^\d+$/.test(idStr)) {
          const oldId = idStr;
          const numStr = idStr.replace("DN-", "");
          const num = parseInt(numStr) || 1;
          const newId = "PR-" + String(num).padStart(3, "0");
          
          pr.id = newId;
          // Update matching transactions
          if (this.transactions) {
            this.transactions.forEach(t => {
              if (t.reference === `Debit Note ${oldId}`) {
                t.reference = `Debit Note ${newId}`;
              }
            });
          }
        }
      });
    }
  }

  repairMissingTransactions() {
    let stateChanged = false;
    // Clean up any leftover or orphaned transactions for cancelled/deleted bills
    if (this.transactions) {
      const cancelledInvoiceIds = new Set((this.invoices || []).filter(i => i.isCancelled).map(i => i.id).filter(Boolean));
      const cancelledPurchaseIds = new Set((this.purchases || []).filter(p => p.isCancelled).map(p => p.id).filter(Boolean));
      const cancelledInvoiceNos = new Set((this.invoices || []).filter(i => i.isCancelled).map(i => String(i.voucherNo).trim()).filter(Boolean));
      const cancelledPurchaseNos = new Set((this.purchases || []).filter(p => p.isCancelled).map(p => String(p.voucherNo || p.refNo || p.invoiceNo).trim()).filter(Boolean));
      
      const validInvoiceNos = new Set((this.invoices || []).filter(i => !i.isCancelled).map(i => String(i.voucherNo).trim()).filter(Boolean));
      const validPurchaseNos = new Set((this.purchases || []).filter(p => !p.isCancelled).map(p => String(p.voucherNo || p.refNo || p.invoiceNo).trim()).filter(Boolean));

      const beforeLen = this.transactions.length;
      this.transactions = this.transactions.filter(tx => {
        if (tx.id && (cancelledInvoiceIds.has(tx.id) || cancelledPurchaseIds.has(tx.id))) {
          return false;
        }
        if (tx.reference) {
          const cleanRef = String(tx.reference).split(" ")[0].trim();
          
          if (cancelledInvoiceNos.has(cleanRef) || cancelledPurchaseNos.has(cleanRef)) {
            return false;
          }

          // Force remove orphaned sales/purchase transactions that have no matching active record
          const isSalesTx = (tx.description && tx.description.toLowerCase().includes("sales invoice")) || cleanRef.startsWith("SA-") || cleanRef.startsWith("SI-") || cleanRef.startsWith("LI-") || cleanRef.startsWith("NI-");
          if (isSalesTx && !validInvoiceNos.has(cleanRef)) {
            return false;
          }

          const isPurchaseTx = (tx.description && tx.description.toLowerCase().includes("purchase")) || cleanRef.startsWith("PU-") || cleanRef.startsWith("PI-");
          if (isPurchaseTx && !validPurchaseNos.has(cleanRef)) {
            return false;
          }
        }
        return true;
      });
      if (this.transactions.length !== beforeLen) {
        this.saveState(true);
      }
    }

    if (this.purchases) {
      this.purchases.forEach(pur => {
        if (!pur || pur.isCancelled) return;
        let creditAccount = pur.siteName ? `${pur.contactId}::${pur.siteName}` : pur.contactId;
        if (pur.payMode === "Cash") {
          const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
          creditAccount = cashL ? cashL.code : "1010";
        } else if (pur.payMode === "Bank") {
          const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
          creditAccount = bankL ? bankL.code : "1020";
        }

        // Look up series ledgerCode from the purchase's stored seriesId
        const repairSeries = pur.seriesId ? this.seriesMaster?.find(s => s.id === pur.seriesId) : null;
        let repairDebitLedger = repairSeries ? repairSeries.ledgerCode : null;
        
        if (!repairDebitLedger || repairDebitLedger === "L018") {
          const repairSeriesType = repairSeries ? repairSeries.seriesType : "LOCAL";
          const repairIsKerala = (pur.state || this.getCompanyState()).toUpperCase() === this.getCompanyState();
          if (repairSeriesType === "NONTAXABLE") {
            const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "NON TAXABLE PURCHASE");
            repairDebitLedger = l ? (l.code || l.id) : "L021";
          } else if (repairSeriesType === "INTERSTATE" || repairSeriesType === "IGST" || repairSeriesType === "OUTSTATE" || !repairIsKerala) {
            const l = this.ledgers.find(x => x.name && x.name.toUpperCase() === "IGST PURCHASE") || this.ledgers.find(x => x.name && x.name.toUpperCase() === "INTERSTATE PURCHASE");
            repairDebitLedger = l ? (l.code || l.id) : "L020";
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
          const rate = item.gstPercent || 18;
          if (!repairTaxGroups[rate]) repairTaxGroups[rate] = 0;
          repairTaxGroups[rate] += item.gstAmount || 0;
        });
        const repairIsKerala = (pur.state || this.getCompanyState()).toUpperCase() === this.getCompanyState();
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
          const shippingL = this.ledgers.find(l => l.name.toUpperCase().includes("SHIPPING") || l.code === "5200" || l.name.toUpperCase().includes("TRANSPORT"));
          const shippingCode = shippingL ? shippingL.code : "5200";
          if (adjustments > 0) {
            entries.push({ accountId: shippingCode, debit: adjustments, credit: 0 });
          } else {
            entries.push({ accountId: shippingCode, debit: 0, credit: Math.abs(adjustments) });
          }
        }

        const roundOff = parseFloat(pur.roundOff) || 0;
        if (roundOff !== 0) {
          const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
          const roundCode = roundL ? roundL.code : "5600";
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

        const tx = this.transactions.find(t => t.reference === pur.voucherNo || t.id === pur.id);
        if (tx) {
          const origSig = JSON.stringify(tx.entries);
          const newSig = JSON.stringify(entries);
          if (origSig !== newSig) {
            tx.entries = entries;
            stateChanged = true;
          }
        } else {
          const txId = this.generateNextTxId();
          this.transactions.push({
            id: txId,
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
        let debitAccount = inv.siteName ? `${inv.contactId}::${inv.siteName}` : inv.contactId;
        if (inv.payMode === "Cash") {
          const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
          debitAccount = cashL ? cashL.code : "1010";
        } else if (inv.payMode === "Bank") {
          const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
          debitAccount = bankL ? bankL.code : "1020";
        }

        const isKerala = (inv.state || this.getCompanyState()).toUpperCase() === this.getCompanyState();
        const taxGroups = {};
        (inv.items || []).forEach(item => {
          const rate = item.gstPercent || 18;
          if (!taxGroups[rate]) taxGroups[rate] = 0;
          taxGroups[rate] += item.gstAmount || 0;
        });

        // Resolve sales ledger dynamically based on stored salesCreditLedger (or default L017)
        const activeSalesSeries = inv.seriesId ? this.seriesMaster?.find(s => s.id === inv.seriesId) : null;
        const salesCreditLedger = (activeSalesSeries ? activeSalesSeries.ledgerCode : null) || "L017";

        const entries = [
          { accountId: debitAccount, debit: inv.total, credit: 0 },
          { accountId: salesCreditLedger, debit: 0, credit: (inv.subtotal - (inv.totalDiscount || 0)) }
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
              entries.push({ accountId: cgstLedger, debit: 0, credit: cgstAmt });
              entries.push({ accountId: sgstLedger, debit: 0, credit: sgstAmt });
            } else {
              const igstLedger = this.getOrCreateDutiesAndTaxesLedger(`Output IGST ${rate.toFixed(1).replace(".0", "")}%`);
              entries.push({ accountId: igstLedger, debit: 0, credit: gstAmt });
            }
          }
        });

        const totalCess = (inv.totalCess || 0) + (inv.additionalCess || 0);
        if (totalCess > 0) {
          entries.push({ accountId: "2200", debit: 0, credit: totalCess });
        }

        const adjustments = parseFloat(inv.adjustments) || 0;
        if (adjustments !== 0 && (!inv.adjustmentsList || inv.adjustmentsList.length === 0)) {
          const shippingL = this.ledgers.find(l => l.name.toUpperCase().includes("SHIPPING") || l.code === "4200");
          const shippingCode = shippingL ? shippingL.code : "4200";
          if (adjustments > 0) {
            entries.push({ accountId: shippingCode, debit: 0, credit: adjustments });
          } else {
            entries.push({ accountId: shippingCode, debit: Math.abs(adjustments), credit: 0 });
          }
        }

        const roundOff = parseFloat(inv.roundOff) || 0;
        if (roundOff !== 0) {
          const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
          const roundCode = roundL ? roundL.code : "5600";
          if (roundOff > 0) {
            entries.push({ accountId: roundCode, debit: 0, credit: roundOff });
          } else {
            entries.push({ accountId: roundCode, debit: Math.abs(roundOff), credit: 0 });
          }
        }

        if (inv.adjustmentsList) {
          inv.adjustmentsList.forEach(a => {
            const amt = parseFloat(a.amount) || 0;
            if (amt > 0) {
              let ledgerCode = a.ledgerCode;
              if (!ledgerCode || ledgerCode === "L002") {
                if (a.name.toUpperCase() === "LOADING CHARGES" || a.name.toUpperCase() === "LOADING CHARGE") {
                  ledgerCode = "L032";
                } else if (a.name.toUpperCase() === "UNLOADING CHARGE" || a.name.toUpperCase() === "UNLOADING CHARGE AT SITE") {
                  ledgerCode = "L033";
                } else if (a.name.toUpperCase() === "FREIGHT" || a.name.toUpperCase() === "FREIGHT ON SALES") {
                  ledgerCode = "L030";
                } else {
                  const master = this.salesAdjustments.find(m => m.name.toUpperCase() === a.name.toUpperCase());
                  ledgerCode = master ? master.ledgerCode : "L002";
                }
                a.ledgerCode = ledgerCode;
              }
              if (a.type === "Add") {
                entries.push({ accountId: ledgerCode, debit: 0, credit: amt });
              } else {
                entries.push({ accountId: ledgerCode, debit: amt, credit: 0 });
              }
            }
          });
        }

        const tx = this.transactions.find(t => t.reference === inv.voucherNo || t.id === inv.id);
        if (tx) {
          const origSig = JSON.stringify(tx.entries);
          const newSig = JSON.stringify(entries);
          if (origSig !== newSig) {
            tx.entries = entries;
            stateChanged = true;
          }
        } else {
          const txId = this.generateNextTxId();
          this.transactions.push({
            id: txId,
            date: inv.date,
            reference: inv.voucherNo,
            description: `Sales Invoice to ${inv.contactName} - Ref: ${inv.refNo || "-"}`,
            siteName: inv.siteName || "",
            entries
          });
          stateChanged = true;
        }

          // Also ensure COGS transaction is repaired if missing
          const totalCogs = (inv.items || []).reduce((sum, item) => {
            const mat = this.materials.find(m => m.id === item.materialId);
            return sum + ((parseFloat(item.quantity) || 0) * (mat ? (mat.landingCost || 0) : 0));
          }, 0);
          if (totalCogs > 0) {
            const cogsExists = this.transactions.some(t => t.reference === `${inv.voucherNo} COGS`);
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
          const rate = parseFloat(item.gstPercent) || (mat ? (parseFloat(mat.igst) || 18) : 18);
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
          const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
          customerAccount = cashL ? cashL.code : "1010";
        } else if (sr.payMode === "Bank") {
          const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
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
          const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
          const roundCode = roundL ? roundL.code : "5600";
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

        const tx = this.transactions.find(t => t.reference === `Credit Note ${sr.id}` || t.reference === sr.id);
        if (tx) {
          const origSig = JSON.stringify(tx.entries);
          const newSig = JSON.stringify(entries);
          if (origSig !== newSig) {
            tx.entries = entries;
            stateChanged = true;
          }
        } else {
          const txId = this.generateNextTxId();
          this.transactions.push({
            id: txId,
            date: sr.date,
            reference: `Credit Note ${sr.id}`,
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
                description: `COGS reversal for credit note`,
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
        const originalSeriesType = originalSeries ? originalSeries.seriesType : null;
        const isIGSTBySeriesType = originalSeriesType && ["INTERSTATE", "IGST", "OUTSTATE"].includes(originalSeriesType.toUpperCase());
        const isKeralaByState = (pr.state || (supplier ? supplier.state : this.getCompanyState()) || this.getCompanyState()).toUpperCase() === this.getCompanyState();
        const isKerala = isIGSTBySeriesType ? false : isKeralaByState;
        
        const taxGroups = {};
        (pr.items || []).forEach(item => {
          const mat = this.materials.find(m => m.id === item.materialId);
          const rate = parseFloat(item.gstPercent) || (mat ? (parseFloat(mat.igst) || 18) : 18);
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
          const cashL = this.ledgers.find(l => l.groupName === "CASH-IN-HAND" || l.name.toUpperCase() === "CASH");
          supplierAccount = cashL ? cashL.code : "1010";
        } else if (pr.payMode === "Bank") {
          const bankL = this.ledgers.find(l => l.groupName === "BANK ACCOUNTS" || l.name.toUpperCase().includes("BANK"));
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
          const roundL = this.ledgers.find(l => l.name.toUpperCase().includes("ROUND"));
          const roundCode = roundL ? roundL.code : "5600";
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
        const tx = this.transactions.find(t => t.reference === `Debit Note ${pr.id}` || t.reference === pr.id);
        console.log("Found transaction:", tx ? tx.id : "null", "origSig:", tx ? JSON.stringify(tx.entries) : "null", "newSig:", JSON.stringify(entries));
        if (tx) {
          const origSig = JSON.stringify(tx.entries);
          const newSig = JSON.stringify(entries);
          if (origSig !== newSig) {
            tx.entries = entries;
            console.log("ASSIGNED tx.entries FOR:", tx.id, "NEW ENTRIES:", JSON.stringify(tx.entries));
            stateChanged = true;
          }
        } else {
          const txId = this.generateNextTxId();
          this.transactions.push({
            id: txId,
            date: pr.date,
            reference: `Debit Note ${pr.id}`,
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
    const newTx = {
      id: txId,
      date: data.date || new Date().toISOString().split("T")[0],
      reference: data.reference || "JV",
      description: data.description || "Journal Entry",
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
    if (tx.reference.toLowerCase().includes("receipt")) {
      const match = tx.description.match(/Receipt from (?:Customer|Supplier): (.*?) \(/i);
      if (match && match[1]) {
        const contact = this.contacts.find(c => c.name.toLowerCase() === match[1].trim().toLowerCase());
        if (contact) {
          const amt = tx.entries.find(e => e.debit > 0)?.debit || 0;
          contact.balance = (contact.balance || 0) - amt;
        }
      }
    }
    if (tx.reference.toLowerCase().includes("payment")) {
      const match = tx.description.match(/Payment to (?:Supplier|Customer): (.*?) \(/i);
      if (match && match[1]) {
        const contact = this.contacts.find(c => c.name.toLowerCase() === match[1].trim().toLowerCase());
        if (contact) {
          const amt = tx.entries.find(e => e.debit > 0)?.debit || 0;
          contact.balance = (contact.balance || 0) + amt;
        }
      }
    }
  }

  reverseTransactionImpact(tx) {
    if (tx.reference.toLowerCase().includes("receipt")) {
      const match = tx.description.match(/Receipt from (?:Customer|Supplier): (.*?) \(/i);
      if (match && match[1]) {
        const contact = this.contacts.find(c => c.name.toLowerCase() === match[1].trim().toLowerCase());
        if (contact) {
          const amt = tx.entries.find(e => e.debit > 0)?.debit || 0;
          contact.balance = (contact.balance || 0) + amt;
        }
      }
    }
    if (tx.reference.toLowerCase().includes("payment")) {
      const match = tx.description.match(/Payment to (?:Supplier|Customer): (.*?) \(/i);
      if (match && match[1]) {
        const contact = this.contacts.find(c => c.name.toLowerCase() === match[1].trim().toLowerCase());
        if (contact) {
          const amt = tx.entries.find(e => e.debit > 0)?.debit || 0;
          contact.balance = (contact.balance || 0) - amt;
        }
      }
    }
  }

  // --- FINANCIAL REPORT CALCULATIONS ---
  filterTxsByDate(txs, startDate, endDate) {
    if (!startDate && !endDate) return txs;
    const start = startDate ? new Date(startDate) : new Date("2000-01-01");
    const end = endDate ? new Date(endDate) : new Date("2099-12-31");
    end.setHours(23, 59, 59, 999);

    return txs.filter(tx => {
      const d = new Date(tx.date);
      return d >= start && d <= end;
    });
  }

  getStockValuationAtDate(targetDateStr = "") {
    const targetDate = targetDateStr ? new Date(targetDateStr) : null;
    if (targetDate) {
      targetDate.setHours(23, 59, 59, 999);
    }

    const stockMap = {};
    const batchCostMap = {};

    this.materials.forEach(m => {
      const defaultBatches = [...(m.batches || [])];
      if (defaultBatches.length === 0 && (parseFloat(m.openingStock) > 0)) {
        defaultBatches.push({
          batchNo: String(m.landingCost || 350),
          landingCost: m.landingCost || 350,
          openingStock: parseFloat(m.openingStock) || 0
        });
      }

      defaultBatches.forEach(b => {
        const key = `${m.id}::${b.batchNo}`;
        stockMap[key] = parseFloat(b.openingStock) || 0;
        batchCostMap[key] = parseFloat(b.landingCost) || 0;
      });
    });

    const updateStock = (matId, bNo, qty, isAdd) => {
      const mat = this.materials.find(m => m.id === matId);
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

    this.purchases.forEach(pur => {
      if (pur.isCancelled) return;
      if (targetDate && new Date(pur.date) > targetDate) return;
      (pur.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
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

    this.invoices.forEach(inv => {
      if (inv.isCancelled) return;
      if (targetDate && new Date(inv.date) > targetDate) return;
      (inv.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          updateStock(item.materialId, bNo, parseFloat(item.quantity) || 0, false);
        }
      });
    });

    (this.salesReturns || []).forEach(ret => {
      if (ret.isCancelled) return;
      if (targetDate && new Date(ret.date) > targetDate) return;
      (ret.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          updateStock(item.materialId, bNo, parseFloat(item.quantity) || 0, true);
        }
      });
    });

    (this.purchaseReturns || []).forEach(ret => {
      if (ret.isCancelled) return;
      if (targetDate && new Date(ret.date) > targetDate) return;
      (ret.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          updateStock(item.materialId, bNo, parseFloat(item.quantity) || 0, false);
        }
      });
    });

    (this.stockAdjustments || []).forEach(adj => {
      if (adj.isCancelled) return;
      if (targetDate && new Date(adj.date) > targetDate) return;
      (adj.items || []).forEach(item => {
        const mat = this.materials.find(m => m.id === item.materialId);
        if (mat) {
          const bNo = String(item.batchNo || mat.batches[0]?.batchNo || mat.landingCost || 350);
          const isAdd = item.stockAffect === "Add (+)";
          updateStock(item.materialId, bNo, parseFloat(item.qty) || 0, isAdd);
        }
      });
    });

    let totalValuation = 0;
    Object.keys(stockMap).forEach(key => {
      const qty = stockMap[key];
      const cost = batchCostMap[key] || 0;
      if (qty > 0) {
        totalValuation += qty * cost;
      }
    });

    return totalValuation;
  }

  getProfitLoss(startDate = "", endDate = "") {
    const filteredTxs = this.filterTxsByDate(this.transactions, startDate, endDate);
    
    const getGroupCategory = (gName) => {
      if (!gName) return "";
      let currentGroup = (this.accountGroups || []).find(g => g.name.toUpperCase() === gName.toUpperCase());
      if (!currentGroup) {
        const nameUpper = gName.toUpperCase();
        if (nameUpper === "ASSETS" || nameUpper.includes("ASSET")) return "BALANCE_SHEET";
        if (nameUpper === "LIABILITIES" || nameUpper.includes("LIABILITY") || nameUpper === "EQUITY" || nameUpper.includes("CAPITAL")) return "BALANCE_SHEET";
        if (nameUpper.includes("EXPENSE") || nameUpper.includes("COST") || nameUpper.includes("LOSS") || nameUpper === "DEPRECIATION") return "EXPENSE";
        if (nameUpper.includes("INCOME") || nameUpper.includes("REVENUE") || nameUpper.includes("GAIN")) return "INCOME";
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
        const parentGroup = (this.accountGroups || []).find(g => g.name.toUpperCase() === under);
        if (!parentGroup) break;
        under = parentGroup.under ? parentGroup.under.toUpperCase() : "";
      }

      const nameUpper = gName.toUpperCase();
      if (nameUpper === "ASSETS" || nameUpper.includes("ASSET") || nameUpper.includes("DEBTORS") || nameUpper.includes("CASH") || nameUpper.includes("BANK") || nameUpper.includes("INVESTMENT")) return "BALANCE_SHEET";
      if (nameUpper === "LIABILITIES" || nameUpper.includes("LIABILITY") || nameUpper === "EQUITY" || nameUpper.includes("CAPITAL") || nameUpper.includes("CREDITORS") || nameUpper.includes("TAX") || nameUpper.includes("DUTIES")) return "BALANCE_SHEET";
      if (nameUpper.includes("EXPENSE") || nameUpper.includes("COST") || nameUpper.includes("LOSS") || nameUpper === "DEPRECIATION") return "EXPENSE";
      if (nameUpper.includes("INCOME") || nameUpper.includes("REVENUE") || nameUpper.includes("GAIN")) return "INCOME";
      return "";
    };

    const periodChanges = {};

    filteredTxs.forEach(tx => {
      tx.entries.forEach(e => {
        const id = e.accountId;
        if (periodChanges[id] === undefined) {
          periodChanges[id] = 0;
        }
        periodChanges[id] += (e.debit - e.credit);
      });
    });

    const ledgers = this.getLedgers();
    const getAccountDetails = (accId) => {
      const led = ledgers.find(l => l.code === accId);
      if (led) {
        return {
          name: led.name,
          groupName: led.groupName || "",
          balanceType: led.balanceType || "Debit"
        };
      }
      const staticAcc = ACCOUNTS[accId];
      if (staticAcc) {
        return {
          name: staticAcc.name,
          groupName: "",
          balanceType: (staticAcc.type === "asset" || staticAcc.type === "expense") ? "Debit" : "Credit"
        };
      }
      return {
        name: accId,
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
      const isContact = this.contacts?.some(c => String(c.id) === strAccId || strAccId.startsWith(String(c.id) + "::")) || strAccId.includes("::");
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
      openingStock = this.materials.reduce((sum, m) => sum + (m.batches || []).reduce((bSum, b) => bSum + ((parseFloat(b.openingStock) || 0) * (parseFloat(b.landingCost) || 0)), 0), 0);
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

    const isLiabilitiesAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const allGroups = this.accountGroups || [];
      const targetGroups = ["CURRENT LIABILITIES", "DUTIES & TAXES", "SUNDRY CREDITORS", "BANK OD A/C", "BRANCH / DIVISIONS", "LIABILITIES", "INPUT SGST", "INPUT CGST", "INPUT IGST", "OUTPUT SGST", "OUTPUT CGST", "OUTPUT IGST"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = allGroups.find(g => String(g.name || "").toUpperCase() === current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isCapitalAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const allGroups = this.accountGroups || [];
      const targetGroups = ["CAPITAL ACCOUNT", "EQUITY"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = allGroups.find(g => String(g.name || "").toUpperCase() === current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isCurrentAssetsAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const allGroups = this.accountGroups || [];
      const targetGroups = ["CURRENT ASSETS", "BANK ACCOUNTS", "CASH-IN-HAND", "SUNDRY DEBTORS", "LOANS & ADVANCES(ASSET)", "DEPOSITS", "ADAVANCE TO SUPPLIER", "ASSETS"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = allGroups.find(g => String(g.name || "").toUpperCase() === current);
        if (parent && parent.under) current = String(parent.under).toUpperCase();
        else break;
      }
      return false;
    };

    const isFixedAssetsAccount = (gName) => {
      if (!gName) return false;
      let current = String(gName).toUpperCase();
      const allGroups = this.accountGroups || [];
      const targetGroups = ["FIXED ASSETS"];
      for (let i = 0; i < 15; i++) {
        if (targetGroups.includes(current)) return true;
        const parent = allGroups.find(g => String(g.name || "").toUpperCase() === current);
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

        const gnUpper = (l.groupName || "").toUpperCase();

        if (isCapitalAccount(gnUpper)) {
          capitalVal -= bal;
          capitalDetails.push({ name: l.name, balance: -bal });
        } else if (isLiabilitiesAccount(gnUpper)) {
          currentLiabilitiesVal -= bal;
          currentLiabilitiesDetails.push({ name: l.name, balance: -bal });
        } else if (isFixedAssetsAccount(gnUpper)) {
          fixedAssetsVal += bal;
          fixedAssetsDetails.push({ name: l.name, balance: bal });
        } else if (isCurrentAssetsAccount(gnUpper)) {
          currentAssetsVal += bal;
          currentAssetsDetails.push({ name: l.name, balance: bal });
        }
      });
    }

    // Difference in Opening Balance (ledgers only — contact opening balances are
    // already reflected in control accounts 2100/1100 via getAccountBalances)
    let diff = 0;
    if (this.ledgers) {
      this.ledgers.forEach(l => {
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
      diffAsset = -diff;
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
              const isPurchaseOrSalesAccount = g === "PURCHASE ACCOUNT" || g === "SALES ACCOUNT" || g === "PURCHASE ACCOUNTS" || g === "SALES ACCOUNTS";
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

    this.transactions = this.transactions.filter(tx => {
      if (tx.id === inv.id) return false;
      const ref = String(tx.reference || "").trim();
      const vNo = String(inv.voucherNo || "").trim();
      const invId = String(inv.id || "").trim();
      
      if (vNo && ref === vNo) return false;
      if (vNo && ref === `${vNo} COGS`) return false;
      if (invId && ref === `Invoice ${invId}`) return false;
      if (invId && ref === `${invId} COGS`) return false;
      if (ref.startsWith(vNo + " ")) return false; // Catch anything starting with voucherNo (like COGS)
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

    const sVoucherNo = inv.voucherNo || this.generateNextVoucherNo("sales");
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

    this.transactions = this.transactions.filter(tx => {
      if (tx.id === pur.id) return false;
      const ref = String(tx.reference || "").trim();
      const vNo = String(pur.voucherNo || pur.refNo || pur.invoiceNo || "").trim();
      if (vNo && ref === vNo) return false;
      if (vNo && ref.startsWith(vNo + " ")) return false;
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
    if (!this.units) this.units = [];
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
      if (this.accountGroups) {
        this.accountGroups.forEach(cg => {
          if (cg.under === g) {
            children.push(cg.name);
            children.push(...getSubGroups(cg.name));
          }
        });
      }
      return children;
    };

    const targetGroups = [groupName, ...getSubGroups(groupName)];

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
        if (targetGroups.includes(l.groupName)) {
          list.push(l.code);
        }
      });
    }

    return Array.from(new Set(list));
  }

  getAccountName(accId) {
    const staticAcc = ACCOUNTS[accId];
    if (staticAcc) return staticAcc.name;
    if (accId.includes("::")) {
      const [baseId, site] = accId.split("::");
      const contact = this.contacts?.find(c => c.id === baseId);
      return contact ? `${contact.name} (${site})` : accId;
    }
    const contact = this.contacts?.find(c => c.id === accId);
    if (contact) return contact.name;
    const ledger = this.ledgers?.find(l => l.code === accId);
    if (ledger) return ledger.name;
    return accId;
  }

  getAccountGroupName(accId) {
    const staticAcc = ACCOUNTS[accId];
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
    const baseId = accId.includes("::") ? accId.split("::")[0] : accId;
    const contact = this.contacts?.find(c => c.id === baseId);
    if (contact) {
      return (contact.type === "supplier" || contact.listInVendorList) ? "SUNDRY CREDITORS" : "SUNDRY DEBTORS";
    }
    const ledger = this.ledgers?.find(l => l.code === accId);
    if (ledger) return ledger.groupName;
    return "OTHER";
  }

  getGroupSummary(groupName, startDate = "", endDate = "") {
    const accountIds = this.getGroupAccounts(groupName);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

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
        isDebitType = contact ? (contact.type !== "supplier" && !contact.listInVendorList) : true;
        if (contact) {
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
        const prevDate = start ? new Date(start.getTime() - 86400000).toISOString().split('T')[0] : "";
        const opVal = this.getStockValuationAtDate(prevDate);
        const clVal = this.getStockValuationAtDate(endDate);
        opening = opVal;
        debit = clVal > opVal ? clVal - opVal : 0;
        credit = opVal > clVal ? opVal - clVal : 0;
      } else {
        this.transactions.forEach(tx => {
          let matchedContact = null;
          let matchedSite = null;
          if (this.contacts) {
            matchedContact = this.contacts.find(c => {
              const directEntry = tx.entries.find(e => e.accountId === c.id || e.accountId.startsWith(c.id + "::"));
              if (directEntry) {
                if (directEntry.accountId.includes("::")) {
                  matchedSite = directEntry.accountId.split("::")[1];
                }
                return true;
              }
              const matchedInv = this.invoices?.find(inv => inv.contactId === c.id && tx.reference && tx.reference.includes(inv.id));
              const matchedPur = this.purchases?.find(p => p.contactId === c.id && (tx.reference && (tx.reference.includes(p.refNo) || tx.reference.includes(p.invoiceNo))));
              const matchedSalesRet = this.salesReturns?.find(sr => sr.contactId === c.id && tx.reference && tx.reference.includes(sr.id));
              const matchedPurRet = this.purchaseReturns?.find(pr => pr.contactId === c.id && tx.reference && tx.reference.includes(pr.id));
              if (matchedInv || matchedPur || matchedSalesRet || matchedPurRet) {
                matchedSite = tx.siteName || (matchedInv ? matchedInv.siteName : (matchedPur ? matchedPur.siteName : (matchedSalesRet ? matchedSalesRet.siteName : (matchedPurRet ? matchedPurRet.siteName : null))));
                return true;
              }
              const isCustomer = c.type === "customer" || c.listInCustomerList === true;
              const nameMatch = tx.description.toLowerCase().includes(c.name.toLowerCase()) || (tx.reference && tx.reference.toLowerCase().includes(c.name.toLowerCase()));
              if (nameMatch) {
                const isPurOrPay = tx.reference.toLowerCase().includes("purchase") || tx.reference.startsWith("DN-") || tx.reference.startsWith("PR-") || tx.description.toLowerCase().includes("payment to supplier") || tx.description.toLowerCase().includes("purchase of building");
                const isInvOrRec = tx.reference.toLowerCase().includes("invoice") || tx.reference.startsWith("CN-") || tx.reference.startsWith("SR-") || tx.description.toLowerCase().includes("receipt from customer") || tx.description.toLowerCase().includes("sales invoice to");
                if (isCustomer && !isPurOrPay) return true;
                if (!isCustomer && !isInvOrRec) return true;
              }
              return false;
            });
          }

          tx.entries.forEach(e => {
            let targetAcc = e.accountId;
            if ((targetAcc === "1100" || targetAcc === "2100") && matchedContact) {
              const suffix = matchedSite ? `::${matchedSite}` : "";
              targetAcc = matchedContact.id + suffix;
            }

            if (targetAcc === accId) {
              const txDate = new Date(tx.date);
              if (start && txDate < start) {
                opening += (e.debit - e.credit);
              } else if ((!start || txDate >= start) && (!end || txDate <= end)) {
                debit += e.debit;
                credit += e.credit;
              }
            }
          });
        });
      }

      const closing = opening + (debit - credit);

      items.push({
        accountId: accId,
        name: this.getAccountName(accId),
        groupName: this.getAccountGroupName(accId),
        opening: isDebitType ? opening : -opening,
        debit,
        credit,
        closing: isDebitType ? closing : -closing,
        isDebitType
      });
    });

    return items;
  }
}

const state = new StateManager();

  
  try {
      // 1. Create Products
      const products = [];
      const timestamp = new Date().getTime();
      for(let i=1; i<=5; i++) {
          const id = "TEST-MAT-" + timestamp + "-" + i;
          const prod = {
              id: id,
              name: "Test Product " + i + " " + timestamp,
              code: "PROD" + i + timestamp,
              unit: "PCS",
              hsnCode: "1234",
              landingCost: 100 * i,
              purchaseRate: 100 * i,
              mrp: 150 * i,
              retailRate: 140 * i,
              wholesaleRate: 130 * i,
              cgst: 9,
              sgst: 9,
              igst: 18,
              cess: 0,
              stock: 0,
              batches: []
          };
          state.materials.push(prod);
          products.push(prod);
      }
      
      // 2. Create Vendors
      const vendors = [];
      for(let i=1; i<=5; i++) {
          const id = "TEST-CON-SUP-" + timestamp + "-" + i;
          const vendor = {
              id: id,
              name: "Test Vendor " + i + " " + timestamp,
              type: "supplier",
              phone: "999999999" + i,
              state: i % 2 === 0 ? "KERALA" : "TAMIL NADU",
              gstin: "32XXXXX1234X1Z" + i,
              balance: 0,
              listInVendorList: true
          };
          state.contacts.push(vendor);
          vendors.push(vendor);
      }
  
      // 3. Create Customers
      const customers = [];
      for(let i=1; i<=5; i++) {
          const id = "TEST-CON-CUST-" + timestamp + "-" + i;
          const customer = {
              id: id,
              name: "Test Customer " + i + " " + timestamp,
              type: "customer",
              phone: "888888888" + i,
              state: i % 2 === 0 ? "KERALA" : "KARNATAKA",
              gstin: "29XXXXX1234X1Z" + i,
              balance: 0,
              listInCustomerList: true
          };
          state.contacts.push(customer);
          customers.push(customer);
      }
  
      // 4. Create Local Purchases
      state.recordPurchase({
          supplierId: vendors[1].id,
          date: new Date().toISOString().split("T")[0],
          payMode: "Credit",
          state: "KERALA",
          items: [
              { materialId: products[0].id, name: products[0].name, quantity: 10, price: 100, gstPercent: 18, gstAmount: 180, amount: 1000 }
          ],
          subtotal: 1000,
          total: 1180,
          roundOff: 0
      });
  
      // 5. Create IGST Purchases
      state.recordPurchase({
          supplierId: vendors[0].id,
          date: new Date().toISOString().split("T")[0],
          payMode: "Credit",
          state: "TAMIL NADU",
          items: [
              { materialId: products[1].id, name: products[1].name, quantity: 5, price: 200, gstPercent: 18, gstAmount: 180, amount: 1000 }
          ],
          subtotal: 1000,
          total: 1180,
          roundOff: 0
      });
  
      // 6. Create No-Tax Purchase
      state.recordPurchase({
          supplierId: vendors[1].id,
          date: new Date().toISOString().split("T")[0],
          payMode: "Credit",
          state: "KERALA",
          items: [
              { materialId: products[2].id, name: products[2].name, quantity: 5, price: 300, gstPercent: 0, gstAmount: 0, amount: 1500 }
          ],
          subtotal: 1500,
          total: 1500,
          roundOff: 0
      });
  
      // 7. Create Local Sales
      state.createInvoice({
          contactId: customers[1].id,
          date: new Date().toISOString().split("T")[0],
          payMode: "Credit",
          state: "KERALA",
          items: [
              { materialId: products[0].id, name: products[0].name, quantity: 2, price: 150, gstPercent: 18, gstAmount: 54, amount: 300 }
          ],
          subtotal: 300,
          total: 354,
          roundOff: 0
      });
  
      // 8. Create IGST Sales
      state.createInvoice({
          contactId: customers[0].id,
          date: new Date().toISOString().split("T")[0],
          payMode: "Credit",
          state: "KARNATAKA",
          items: [
              { materialId: products[1].id, name: products[1].name, quantity: 1, price: 250, gstPercent: 18, gstAmount: 45, amount: 250 }
          ],
          subtotal: 250,
          total: 295,
          roundOff: 0
      });
  
      // 9. Create No-Tax Sales
      state.createInvoice({
          contactId: customers[1].id,
          date: new Date().toISOString().split("T")[0],
          payMode: "Credit",
          state: "KERALA",
          items: [
              { materialId: products[2].id, name: products[2].name, quantity: 1, price: 350, gstPercent: 0, gstAmount: 0, amount: 350 }
          ],
          subtotal: 350,
          total: 350,
          roundOff: 0
      });
  
      // 10. Receipt & Payment
      state.createReceiptVoucher({
          date: new Date().toISOString().split("T")[0],
          cashAmount: 354,
          bankAmount: 0,
          contactId: customers[1].id,
          isGeneral: false,
          description: "Receipt from Customer 2"
      });
      
      state.createPaymentVoucher({
          date: new Date().toISOString().split("T")[0],
          cashAmount: 1180,
          bankAmount: 0,
          contactId: vendors[1].id,
          isGeneral: false,
          description: "Payment to Vendor 2"
      });
  
      // 11. Contra
      state.createContraVoucher({
          date: new Date().toISOString().split("T")[0],
          amount: 500,
          sourceAccount: "1010", // Cash
          destAccount: "1020", // Bank
          description: "Cash deposited to Bank"
      });
  
      state.saveState();
      console.log("Success! Data created:", state.materials.length, state.contacts.length);
  } catch(e) {
      console.error("ERROR CAUGHT:");
      console.error(e.message);
  }
