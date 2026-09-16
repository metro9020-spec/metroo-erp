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
  { id: "30", name: "SUNDRY DEBTORS", under: "CURRENT ASSETS", isDefault: true }
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
  { code: "L019", name: "INTERSTATE PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
  { code: "L020", name: "IGST PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
  { code: "L021", name: "NON TAXABLE PURCHASE", groupName: "PURCHASE ACCOUNT", openingBalance: 0, balanceType: "Debit" },
  { code: "L022", name: "LOCAL SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
  { code: "L023", name: "INTERSTATE SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
  { code: "L024", name: "IGST SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
  { code: "L025", name: "NON TAXABLE SALES", groupName: "SALES ACCOUNT", openingBalance: 0, balanceType: "Credit" },
  { code: "L030", name: "FREIGHT ON SALES", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
  { code: "L031", name: "FREIGHT ON PURCHASE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
  { code: "L032", name: "LOADING CHARGE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
  { code: "L033", name: "UNLOADING CHARGE", groupName: "ADJUSTMENTS", openingBalance: 0, balanceType: "Debit" },
  { code: "L034", name: "ROUND OFF", groupName: "INDIRECT EXPENSES", openingBalance: 0, balanceType: "Debit" }
];

export const initialUnits = [
  { id: "1", category: "COUNT", name: "BAG-BAGS", symbol: "BAG-BAGS", altNameInBill: "Bags", conversionValue: 1, conversionUnit: "BAG-BAGS", printNameInsteadOfSymbol: false },
  { id: "2", category: "COUNT", name: "BAL-BALE", symbol: "BAL-BALE", altNameInBill: "Bale", conversionValue: 1, conversionUnit: "BAL-BALE", printNameInsteadOfSymbol: false },
  { id: "3", category: "COUNT", name: "BDL-BUNDLES", symbol: "BDL-BUNDLES", altNameInBill: "Bundles", conversionValue: 1, conversionUnit: "BDL-BUNDLES", printNameInsteadOfSymbol: false },
  { id: "4", category: "COUNT", name: "BKL-BUCKLES", symbol: "BKL-BUCKLES", altNameInBill: "Buckles", conversionValue: 1, conversionUnit: "BKL-BUCKLES", printNameInsteadOfSymbol: false },
  { id: "5", category: "COUNT", name: "BOU-BILLION OF UNITS", symbol: "BOU-BILLION OF UNITS", altNameInBill: "Billion of Units", conversionValue: 1000000000, conversionUnit: "UNT-UNITS", printNameInsteadOfSymbol: false },
  { id: "6", category: "COUNT", name: "BOX-BOX", symbol: "BOX-BOX", altNameInBill: "Box", conversionValue: 1, conversionUnit: "BOX-BOX", printNameInsteadOfSymbol: false },
  { id: "7", category: "VOLUME", name: "BTL-BOTTLES", symbol: "BTL-BOTTLES", altNameInBill: "Bottles", conversionValue: 1, conversionUnit: "BTL-BOTTLES", printNameInsteadOfSymbol: false },
  { id: "8", category: "COUNT", name: "BUN-BUNCHES", symbol: "BUN-BUNCHES", altNameInBill: "Bunches", conversionValue: 1, conversionUnit: "BUN-BUNCHES", printNameInsteadOfSymbol: false },
  { id: "9", category: "VOLUME", name: "CAN-CANS", symbol: "CAN-CANS", altNameInBill: "Cans", conversionValue: 1, conversionUnit: "CAN-CANS", printNameInsteadOfSymbol: false },
  { id: "10", category: "VOLUME", name: "CBM-CUBIC METERS", symbol: "CBM-CUBIC METERS", altNameInBill: "Cubic Meters", conversionValue: 1, conversionUnit: "CBM-CUBIC METERS", printNameInsteadOfSymbol: false },
  { id: "11", category: "VOLUME", name: "CCM-CUBIC CENTIMETERS", symbol: "CCM-CUBIC CENTIMETERS", altNameInBill: "Cubic Centimeters", conversionValue: 1, conversionUnit: "CCM-CUBIC CENTIMETERS", printNameInsteadOfSymbol: false },
  { id: "12", category: "LENGTH", name: "CMS-CENTIMETERS", symbol: "CMS-CENTIMETERS", altNameInBill: "Centimeters", conversionValue: 10, conversionUnit: "CMS-CENTIMETERS", printNameInsteadOfSymbol: false },
  { id: "13", category: "COUNT", name: "CTN-CARTONS", symbol: "CTN-CARTONS", altNameInBill: "Cartons", conversionValue: 1, conversionUnit: "CTN-CARTONS", printNameInsteadOfSymbol: false },
  { id: "14", category: "COUNT", name: "DOZ-DOZENS", symbol: "DOZ-DOZENS", altNameInBill: "Dozens", conversionValue: 12, conversionUnit: "NOS-NUMBERS", printNameInsteadOfSymbol: false },
  { id: "15", category: "VOLUME", name: "DRM-DRUMS", symbol: "DRM-DRUMS", altNameInBill: "Drums", conversionValue: 1, conversionUnit: "DRM-DRUMS", printNameInsteadOfSymbol: false },
  { id: "16", category: "COUNT", name: "GGR-GREAT GROSS", symbol: "GGR-GREAT GROSS", altNameInBill: "Great Gross", conversionValue: 144, conversionUnit: "DOZ-DOZENS", printNameInsteadOfSymbol: false },
  { id: "17", category: "WEIGHT", name: "GMS-GRAMMES", symbol: "GMS-GRAMMES", altNameInBill: "Grammes", conversionValue: 1, conversionUnit: "GMS-GRAMMES", printNameInsteadOfSymbol: false },
  { id: "18", category: "COUNT", name: "GSR-GROSS", symbol: "GSR-GROSS", altNameInBill: "Gross", conversionValue: 12, conversionUnit: "DOZ-DOZENS", printNameInsteadOfSymbol: false },
  { id: "19", category: "LENGTH", name: "GYD-GROSS YARDS", symbol: "GYD-GROSS YARDS", altNameInBill: "Gross Yards", conversionValue: 1, conversionUnit: "GYD-GROSS YARDS", printNameInsteadOfSymbol: false },
  { id: "20", category: "WEIGHT", name: "KGS-KILOGRAMS", symbol: "KGS-KILOGRAMS", altNameInBill: "Kilograms", conversionValue: 1000, conversionUnit: "GMS-GRAMMES", printNameInsteadOfSymbol: false },
  { id: "21", category: "VOLUME", name: "KLR-KILOLITRE", symbol: "KLR-KILOLITRE", altNameInBill: "Kilolitre", conversionValue: 1000, conversionUnit: "MLT-MILILITRE", printNameInsteadOfSymbol: false },
  { id: "22", category: "LENGTH", name: "KME-KILOMETRE", symbol: "KME-KILOMETRE", altNameInBill: "Kilometre", conversionValue: 1000, conversionUnit: "MTR-METERS", printNameInsteadOfSymbol: false },
  { id: "23", category: "VOLUME", name: "MLT-MILILITRE", symbol: "MLT-MILILITRE", altNameInBill: "Mililitre", conversionValue: 1, conversionUnit: "MLT-MILILITRE", printNameInsteadOfSymbol: false },
  { id: "24", category: "LENGTH", name: "MTR-METERS", symbol: "MTR-METERS", altNameInBill: "Meters", conversionValue: 100, conversionUnit: "CMS-CENTIMETERS", printNameInsteadOfSymbol: false },
  { id: "25", category: "WEIGHT", name: "MTS-METRIC TON", symbol: "MTS-METRIC TON", altNameInBill: "Metric Ton", conversionValue: 1000, conversionUnit: "KGS-KILOGRAMS", printNameInsteadOfSymbol: false },
  { id: "26", category: "COUNT", name: "NOS-NUMBERS", symbol: "NOS-NUMBERS", altNameInBill: "Numbers", conversionValue: 1, conversionUnit: "NOS-NUMBERS", printNameInsteadOfSymbol: false },
  { id: "27", category: "COUNT", name: "PAC-PACKETS", symbol: "PAC-PACKETS", altNameInBill: "Packets", conversionValue: 1, conversionUnit: "PAC-PACKETS", printNameInsteadOfSymbol: false },
  { id: "28", category: "COUNT", name: "PCS-PIECES", symbol: "PCS-PIECES", altNameInBill: "Pieces", conversionValue: 1, conversionUnit: "PCS-PIECES", printNameInsteadOfSymbol: false },
  { id: "29", category: "COUNT", name: "PRS-PAIRS", symbol: "PRS-PAIRS", altNameInBill: "Pairs", conversionValue: 2, conversionUnit: "PCS-PIECES", printNameInsteadOfSymbol: false },
  { id: "30", category: "WEIGHT", name: "QTL-QUINTAL", symbol: "QTL-QUINTAL", altNameInBill: "Quintal", conversionValue: 100, conversionUnit: "KGS-KILOGRAMS", printNameInsteadOfSymbol: false },
  { id: "31", category: "LENGTH", name: "ROL-ROLLS", symbol: "ROL-ROLLS", altNameInBill: "Rolls", conversionValue: 1, conversionUnit: "ROL-ROLLS", printNameInsteadOfSymbol: false },
  { id: "32", category: "COUNT", name: "SET-SETS", symbol: "SET-SETS", altNameInBill: "Sets", conversionValue: 1, conversionUnit: "SET-SETS", printNameInsteadOfSymbol: false },
  { id: "33", category: "AREA", name: "SQF-SQUARE FEET", symbol: "SQF-SQUARE FEET", altNameInBill: "Square Feet", conversionValue: 1, conversionUnit: "SQF-SQUARE FEET", printNameInsteadOfSymbol: false },
  { id: "34", category: "AREA", name: "SQM-SQUARE METERS", symbol: "SQM-SQUARE METERS", altNameInBill: "Square Meters", conversionValue: 1, conversionUnit: "SQM-SQUARE METERS", printNameInsteadOfSymbol: false },
  { id: "35", category: "AREA", name: "SQY-SQUARE YARDS", symbol: "SQY-SQUARE YARDS", altNameInBill: "Square Yards", conversionValue: 9, conversionUnit: "SQF-SQUARE FEET", printNameInsteadOfSymbol: false },
  { id: "36", category: "COUNT", name: "TBS-TABLETS", symbol: "TBS-TABLETS", altNameInBill: "Tablets", conversionValue: 1, conversionUnit: "TBS-TABLETS", printNameInsteadOfSymbol: false },
  { id: "37", category: "COUNT", name: "TGM-TEN GROSS", symbol: "TGM-TEN GROSS", altNameInBill: "Ten Gross", conversionValue: 120, conversionUnit: "DOZ-DOZENS", printNameInsteadOfSymbol: false },
  { id: "38", category: "COUNT", name: "THD-THOUSANDS", symbol: "THD-THOUSANDS", altNameInBill: "Thousands", conversionValue: 1000, conversionUnit: "NOS-NUMBERS", printNameInsteadOfSymbol: false },
  { id: "39", category: "WEIGHT", name: "TON-TONNES", symbol: "TON-TONNES", altNameInBill: "Tonnes", conversionValue: 1000, conversionUnit: "KGS-KILOGRAMS", printNameInsteadOfSymbol: false },
  { id: "40", category: "COUNT", name: "TUB-TUBES", symbol: "TUB-TUBES", altNameInBill: "Tubes", conversionValue: 1, conversionUnit: "TUB-TUBES", printNameInsteadOfSymbol: false },
  { id: "41", category: "VOLUME", name: "UGS-US GALLONS", symbol: "UGS-US GALLONS", altNameInBill: "US Gallons", conversionValue: 1, conversionUnit: "UGS-US GALLONS", printNameInsteadOfSymbol: false },
  { id: "42", category: "COUNT", name: "UNT-UNITS", symbol: "UNT-UNITS", altNameInBill: "Units", conversionValue: 1, conversionUnit: "UNT-UNITS", printNameInsteadOfSymbol: false },
  { id: "43", category: "LENGTH", name: "YDS-YARDS", symbol: "YDS-YARDS", altNameInBill: "Yards", conversionValue: 3, conversionUnit: "SQF-SQUARE FEET", printNameInsteadOfSymbol: false },
  { id: "44", category: "COUNT", name: "OTH-OTHERS", symbol: "OTH-OTHERS", altNameInBill: "Others", conversionValue: 1, conversionUnit: "OTH-OTHERS", printNameInsteadOfSymbol: false }
];
