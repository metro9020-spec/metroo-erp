export const initialMaterials = [
  {
    id: "MAT-001",
    name: "OPC 53 Grade Cement",
    code: "OPC-53",
    category: "Cement",
    unit: "Bags",
    reorderLevel: 100,
    productGroup: "Structural Supply",
    company: "Ultratech",
    subCategory: "OPC 53",
    hsnCode: "2523",
    description: "High quality structural cement",
    productType: "Goods",
    rackNo: "A-1",
    defaultDiscount: 0,
    alternateUnits: [],
    batches: [
      {
        batchNo: "BAT-JUL01",
        stock: 350,
        landingCost: 7.50,
        marginPercent: 30.67,
        marginAmount: 2.30,
        gstExclRate: 9.80,
        gstInclRate: 11.56,
        mrp: 12.25,
        expiryDate: "2026-12-31"
      }
    ]
  },
  {
    id: "MAT-002",
    name: "TMT Steel Bars 12mm",
    code: "TMT-12",
    category: "Steel",
    unit: "Tons",
    reorderLevel: 4.0,
    productGroup: "Structural Supply",
    company: "Jindal",
    subCategory: "TMT Reb",
    hsnCode: "7214",
    description: "Reinforcement steel rebars",
    productType: "Goods",
    rackNo: "Yard-2",
    defaultDiscount: 0,
    alternateUnits: [],
    batches: [
      {
        batchNo: "BAT-STEEL01",
        stock: 12.5,
        landingCost: 580.00,
        marginPercent: 24.14,
        marginAmount: 140.00,
        gstExclRate: 720.00,
        gstInclRate: 849.60,
        mrp: 900.00,
        expiryDate: ""
      }
    ]
  },
  {
    id: "MAT-003",
    name: "Fine River Sand",
    code: "SAND-RIV",
    category: "Sand",
    unit: "CFT",
    reorderLevel: 500,
    productGroup: "Structural Supply",
    company: "Other",
    subCategory: "River Sand",
    hsnCode: "2505",
    description: "Sieved fine river sand",
    productType: "Goods",
    rackNo: "Yard-1",
    defaultDiscount: 0,
    alternateUnits: [],
    batches: [
      {
        batchNo: "BAT-SAND01",
        stock: 1500,
        landingCost: 1.20,
        marginPercent: 62.5,
        marginAmount: 0.75,
        gstExclRate: 1.95,
        gstInclRate: 2.30,
        mrp: 2.50,
        expiryDate: ""
      }
    ]
  },
  {
    id: "MAT-004",
    name: "Red Clay Bricks",
    code: "BRK-RED",
    category: "Bricks",
    unit: "Pcs",
    reorderLevel: 3000,
    productGroup: "Structural Supply",
    company: "Other",
    subCategory: "",
    hsnCode: "6901",
    description: "Standard red clay bricks",
    productType: "Goods",
    rackNo: "Yard-3",
    defaultDiscount: 0,
    alternateUnits: [],
    batches: [
      {
        batchNo: "BAT-BRK01",
        stock: 12000,
        landingCost: 0.15,
        marginPercent: 86.67,
        marginAmount: 0.13,
        gstExclRate: 0.28,
        gstInclRate: 0.33,
        mrp: 0.35,
        expiryDate: ""
      }
    ]
  },
  {
    id: "MAT-005",
    name: "20mm Crushed Blue Metal Aggregate",
    code: "AGG-20",
    category: "Aggregates",
    unit: "Tons",
    reorderLevel: 20.0,
    productGroup: "Structural Supply",
    company: "Other",
    subCategory: "",
    hsnCode: "2517",
    description: "Coarse aggregate",
    productType: "Goods",
    rackNo: "Yard-1",
    defaultDiscount: 0,
    alternateUnits: [],
    batches: [
      {
        batchNo: "BAT-AGG01",
        stock: 85.0,
        landingCost: 18.50,
        marginPercent: 40.54,
        marginAmount: 7.50,
        gstExclRate: 26.00,
        gstInclRate: 30.68,
        mrp: 32.50,
        expiryDate: ""
      }
    ]
  }
];

export const initialContacts = [
  {
    id: "CON-001",
    name: "Apex Infrastructure & Builders",
    type: "customer",
    contactPerson: "Rajesh Kumar",
    phone: "+1 555-0177",
    email: "accounts@apexinfra.com",
    address: "742 Highrise Avenue, Sector 6, New Delhi",
    balance: 2950.00
  },
  {
    id: "CON-002",
    name: "Global Concrete Contractors",
    type: "customer",
    contactPerson: "David Smith",
    phone: "+1 555-0145",
    email: "billing@globalconcrete.net",
    address: "88 Industrial Way, Suburbia",
    balance: 0.00
  },
  {
    id: "CON-003",
    name: "Star Cement Industries Ltd",
    type: "supplier",
    contactPerson: "Amit Shah",
    phone: "+1 555-0122",
    email: "logistics@starcement.com",
    address: "Cement Factory Area, Highway 1A, Rajasthan",
    balance: 0.00
  },
  {
    id: "CON-004",
    name: "Jindal Steel & Power Ltd",
    type: "supplier",
    contactPerson: "Vikas Jindal",
    phone: "+1 555-0199",
    email: "orders@jindalsteel.com",
    address: "Steel Yard Gates, Industrial Area 3, Haryana",
    balance: 0.00
  }
];

export const initialInvoices = [
  {
    id: "1",
    date: "2026-07-02",
    dueDate: "2026-08-02",
    contactId: "CON-001",
    contactName: "Apex Infrastructure & Builders",
    items: [
      {
        materialId: "MAT-001",
        name: "OPC 53 Grade Cement",
        batchNo: "BAT-JUL01",
        quantity: 200,
        unit: "Bags",
        price: 9.80,
        amount: 1960.00
      },
      {
        materialId: "MAT-005",
        name: "20mm Crushed Blue Metal Aggregate",
        batchNo: "BAT-AGG01",
        quantity: 20,
        unit: "Tons",
        price: 26.00,
        amount: 520.00
      }
    ],
    subtotal: 2480.00,
    taxRate: 18,
    taxAmount: 446.40,
    shipping: 150.00,
    discount: 126.40,
    total: 2950.00,
    paidAmount: 0.00,
    status: "unpaid"
  }
];

export const initialTransactions = [
  {
    id: "TX-1003",
    date: "2026-07-02",
    reference: "Invoice 1",
    description: "Sales to Apex Infrastructure & Builders",
    entries: [
      { accountId: "1100", debit: 2950.00, credit: 0 },
      { accountId: "4100", debit: 0, credit: 2480.00 },
      { accountId: "2200", debit: 0, credit: 446.40 },
      { accountId: "4200", debit: 0, credit: 150.00 },
      { accountId: "4100", debit: 126.40, credit: 0 }
    ]
  },
  {
    id: "TX-1004",
    date: "2026-07-02",
    reference: "1 COGS",
    description: "Cost of Goods Sold matching Invoice 1",
    entries: [
      { accountId: "5100", debit: 1870.00, credit: 0 },
      { accountId: "1200", debit: 0, credit: 1870.00 }
    ]
  }
];


export const initialAccountGroups = [
  { id: "1", name: "ADAVANCE TO SUPPLIER", under: "CURRENT ASSETS", isDefault: true },
  { id: "2", name: "BANK ACCOUNTS", under: "CURRENT ASSETS", isDefault: true },
  { id: "3", name: "BANK OD A/C", under: "CURRENT LIABILITIES", isDefault: true },
  { id: "4", name: "BRANCH / DIVISIONS", under: "LIABILITIES", isDefault: true },
  { id: "5", name: "CAPITAL ACCOUNT", under: "EQUITY", isDefault: true },
  { id: "6", name: "CASH-IN-HAND", under: "CURRENT ASSETS", isDefault: true },
  { id: "7", name: "CURRENT ASSETS", under: "ASSETS", isDefault: true },
  { id: "8", name: "CURRENT LIABILITIES", under: "LIABILITIES", isDefault: true },
  { id: "9", name: "DEPOSITS", under: "CURRENT ASSETS", isDefault: true },
  { id: "10", name: "DEPOSITS (ASSETS)", under: "CURRENT ASSETS", isDefault: true },
  { id: "11", name: "DEPRECIATION", under: "EXPENSE", isDefault: true },
  { id: "12", name: "DIRECT EXPENSES", under: "EXPENSE", isDefault: true },
  { id: "13", name: "DIRECT INCOME", under: "INCOME", isDefault: true },
  { id: "14", name: "DUTIES & TAXES", under: "CURRENT LIABILITIES", isDefault: true },
  { id: "15", name: "EMPLOYEE EXPENSES", under: "EXPENSE", isDefault: true },
  { id: "16", name: "FIXED ASSETS", under: "ASSETS", isDefault: true },
  { id: "17", name: "INDIRECT EXPENSES", under: "EXPENSE", isDefault: true },
  { id: "18", name: "INDIRECT INCOME", under: "INCOME", isDefault: true },
  { id: "19", name: "INVESTMENTS", under: "ASSETS", isDefault: true },
  { id: "20", name: "LOANS & ADVANCES(ASSET)", under: "CURRENT ASSETS", isDefault: true },
  { id: "21", name: "PURCHASE ACCOUNT", under: "EXPENSE", isDefault: true },
  { id: "22", name: "SALES ACCOUNT", under: "INCOME", isDefault: true },
  { id: "23", name: "INPUT SGST", under: "DUTIES & TAXES", isDefault: true },
  { id: "24", name: "INPUT CGST", under: "DUTIES & TAXES", isDefault: true },
  { id: "25", name: "INPUT IGST", under: "DUTIES & TAXES", isDefault: true },
  { id: "26", name: "OUTPUT SGST", under: "DUTIES & TAXES", isDefault: true },
  { id: "27", name: "OUTPUT CGST", under: "DUTIES & TAXES", isDefault: true },
  { id: "28", name: "OUTPUT IGST", under: "DUTIES & TAXES", isDefault: true },
  { id: "29", name: "SUNDRY CREDITORS", under: "CURRENT LIABILITIES", isDefault: true },
  { id: "30", name: "SUNDRY DEBTORS", under: "CURRENT ASSETS", isDefault: true },
  { id: "31", name: "ADJUSTMENTS", under: "CURRENT LIABILITIES", isDefault: true },
];

export const initialLedgers = [
  { code: "L001", name: "ACCRUED INTEREST", groupName: "CURRENT ASSETS", openingBalance: 0, balanceType: "Debit" },
  { code: "L002", name: "ADDITIONAL TAX", groupName: "DUTIES & TAXES", openingBalance: 0, balanceType: "Debit" },
  { code: "L003", name: "AMAZON GIFT CARD", groupName: "INDIRECT INCOME", openingBalance: 0, balanceType: "Credit" },
  { code: "L004", name: "ASHTECH", groupName: "CURRENT LIABILITIES", openingBalance: 0, balanceType: "Credit" },
  { code: "L005", name: "ASINAR", groupName: "EMPLOYEE EXPENSES", openingBalance: 0, balanceType: "Debit" },
  { code: "L006", name: "AUDIT FEE PAYABLE", groupName: "CURRENT LIABILITIES", openingBalance: 22000, balanceType: "Credit" },
  { code: "L007", name: "BANK CHARGES", groupName: "INDIRECT EXPENSES", openingBalance: 0, balanceType: "Debit" },
  { code: "L008", name: "BUSINESS PERQUISITES", groupName: "INDIRECT INCOME", openingBalance: 0, balanceType: "Credit" },
  { code: "L009", name: "CASH", groupName: "CASH-IN-HAND", openingBalance: 612951.91, balanceType: "Debit" },
  { code: "L010", name: "DEEPA ASSOCIATES", groupName: "CURRENT LIABILITIES", openingBalance: 0, balanceType: "Credit" },
  { code: "L011", name: "DEPRECIATION", groupName: "DEPRECIATION", openingBalance: 0, balanceType: "Debit" },
  { code: "L012", name: "DIARIES AND CALENDER", groupName: "INDIRECT EXPENSES", openingBalance: 0, balanceType: "Debit" },
  { code: "L013", name: "DISCOUNT ALLOWED", groupName: "INDIRECT EXPENSES", openingBalance: 0, balanceType: "Debit" },
  { code: "L014", name: "DISCOUNT RECEIVED", groupName: "INDIRECT INCOME", openingBalance: 0, balanceType: "Credit" },
  { code: "L015", name: "DISTRICT BANK", groupName: "BANK ACCOUNTS", openingBalance: 2614.80, balanceType: "Debit" },
  { code: "L016", name: "PURCHASE A/C", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
  { code: "L017", name: "SALES A/C", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
  { code: "L018", name: "LOCAL PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
  { code: "L020", name: "IGST PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
  { code: "L021", name: "NON TAXABLE PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
  { code: "L022", name: "LOCAL SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
  { code: "L024", name: "IGST SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
  { code: "L025", name: "NON TAXABLE SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
  { code: "L030", name: "FREIGHT ON SALES", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
  { code: "L031", name: "FREIGHT ON PURCHASE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
  { code: "L032", name: "LOADING CHARGE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
  { code: "L033", name: "UNLOADING CHARGE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
  { code: "L034", name: "ROUND OFF", groupName: "INDIRECT EXPENSES", openingBalance: 0, balanceType: "Debit" }
];

export const initialUnits = [
  { id: "1", category: "WEIGHT", name: "Quintel", symbol: "Qtl", altNameInBill: "Quintel", conversionValue: 100, conversionUnit: "Kilogram", printNameInsteadOfSymbol: false },
  { id: "2", category: "WEIGHT", name: "Kilogram", symbol: "Kg", altNameInBill: "Kilogram", conversionValue: 1000, conversionUnit: "Gram", printNameInsteadOfSymbol: false },
  { id: "3", category: "WEIGHT", name: "Gram", symbol: "g", altNameInBill: "Gram", conversionValue: 1000, conversionUnit: "Milligram", printNameInsteadOfSymbol: false },
  { id: "4", category: "WEIGHT", name: "Milligram", symbol: "mg", altNameInBill: "Milligram", conversionValue: 1, conversionUnit: "Milligram", printNameInsteadOfSymbol: false },
  { id: "5", category: "VOLUME", name: "Litre", symbol: "L", altNameInBill: "Litre", conversionValue: 1000, conversionUnit: "Millilitre", printNameInsteadOfSymbol: false },
  { id: "6", category: "VOLUME", name: "Millilitre", symbol: "ml", altNameInBill: "Millilitre", conversionValue: 1, conversionUnit: "Millilitre", printNameInsteadOfSymbol: false },
  { id: "7", category: "LENGTH", name: "Metre", symbol: "Mtr", altNameInBill: "Metre", conversionValue: 100, conversionUnit: "Centimetre", printNameInsteadOfSymbol: false },
  { id: "8", category: "LENGTH", name: "Centimetre", symbol: "cm", altNameInBill: "Centimetre", conversionValue: 10, conversionUnit: "Millimetre", printNameInsteadOfSymbol: false },
  { id: "9", category: "LENGTH", name: "Millimetre", symbol: "mm", altNameInBill: "Millimetre", conversionValue: 1, conversionUnit: "Millimetre", printNameInsteadOfSymbol: false },
  { id: "10", category: "LENGTH", name: "Feet", symbol: "Ft", altNameInBill: "Feet", conversionValue: 12, conversionUnit: "Inch", printNameInsteadOfSymbol: false },
  { id: "11", category: "LENGTH", name: "Inch", symbol: "In", altNameInBill: "Inch", conversionValue: 1, conversionUnit: "Inch", printNameInsteadOfSymbol: false },
  { id: "12", category: "AREA", name: "Sq.Feet", symbol: "Sq.Ft", altNameInBill: "Square Feet", conversionValue: 144, conversionUnit: "Sq.Inch", printNameInsteadOfSymbol: false },
  { id: "13", category: "AREA", name: "Sq.Inch", symbol: "Sq.In", altNameInBill: "Square Inch", conversionValue: 1, conversionUnit: "Sq.Inch", printNameInsteadOfSymbol: false },
  { id: "14", category: "AREA", name: "Sq.Metre", symbol: "Sq.M", altNameInBill: "Square Metre", conversionValue: 10000, conversionUnit: "Sq.Centimetre", printNameInsteadOfSymbol: false },
  { id: "15", category: "AREA", name: "Sq.Centimetre", symbol: "Sq.Cm", altNameInBill: "Square Centimetre", conversionValue: 1, conversionUnit: "Sq.Centimetre", printNameInsteadOfSymbol: false },
  { id: "16", category: "COUNT", name: "Bags", symbol: "Bags", altNameInBill: "Bags", conversionValue: 1, conversionUnit: "Bags", printNameInsteadOfSymbol: false },
  { id: "17", category: "WEIGHT", name: "Tons", symbol: "Tons", altNameInBill: "Tons", conversionValue: 1000, conversionUnit: "Kilogram", printNameInsteadOfSymbol: false },
  { id: "18", category: "VOLUME", name: "CFT", symbol: "CFT", altNameInBill: "Cubic Feet", conversionValue: 1, conversionUnit: "CFT", printNameInsteadOfSymbol: false },
  { id: "19", category: "COUNT", name: "Pcs", symbol: "Pcs", altNameInBill: "Pieces", conversionValue: 1, conversionUnit: "Pcs", printNameInsteadOfSymbol: false },
  { id: "20", category: "VOLUME", name: "Brass", symbol: "Brass", altNameInBill: "Brass", conversionValue: 100, conversionUnit: "CFT", printNameInsteadOfSymbol: false },
  // Additional default base units
  { id: "21", category: "COUNT", name: "Numbers", symbol: "Nos", altNameInBill: "Numbers", conversionValue: 1, conversionUnit: "Nos", printNameInsteadOfSymbol: false },
  { id: "22", category: "COUNT", name: "Box", symbol: "Box", altNameInBill: "Box", conversionValue: 1, conversionUnit: "Box", printNameInsteadOfSymbol: false },
  { id: "23", category: "COUNT", name: "Carton", symbol: "Ctn", altNameInBill: "Carton", conversionValue: 1, conversionUnit: "Ctn", printNameInsteadOfSymbol: false },
  { id: "24", category: "COUNT", name: "Dozen", symbol: "Dzn", altNameInBill: "Dozen", conversionValue: 12, conversionUnit: "Pcs", printNameInsteadOfSymbol: false },
  { id: "25", category: "LENGTH", name: "Roll", symbol: "Roll", altNameInBill: "Roll", conversionValue: 1, conversionUnit: "Roll", printNameInsteadOfSymbol: false },
  { id: "26", category: "COUNT", name: "Set", symbol: "Set", altNameInBill: "Set", conversionValue: 1, conversionUnit: "Set", printNameInsteadOfSymbol: false },
  { id: "27", category: "COUNT", name: "Bundle", symbol: "Bdl", altNameInBill: "Bundle", conversionValue: 1, conversionUnit: "Bdl", printNameInsteadOfSymbol: false },
  { id: "28", category: "LENGTH", name: "Yard", symbol: "Yd", altNameInBill: "Yard", conversionValue: 3, conversionUnit: "Feet", printNameInsteadOfSymbol: false },
  { id: "29", category: "COUNT", name: "Pack", symbol: "Pak", altNameInBill: "Pack", conversionValue: 1, conversionUnit: "Pak", printNameInsteadOfSymbol: false },
  { id: "30", category: "COUNT", name: "Sheet", symbol: "Sht", altNameInBill: "Sheet", conversionValue: 1, conversionUnit: "Sht", printNameInsteadOfSymbol: false }
];
