import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "COMPANY DATA BASE");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, "BACKUP");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const BACKUP_DB_DIR = process.env.BACKUP_DB_DIR || path.join(__dirname, "COMPANY DATA BASE_BACKUP");
if (!fs.existsSync(BACKUP_DB_DIR)) fs.mkdirSync(BACKUP_DB_DIR, { recursive: true });

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Bypass-Tunnel-Reminder", "bypass-tunnel-reminder"]
}));
app.use(express.json({ limit: "50mb" }));

// ── Helper: resolve the folder and file names ──────────────────────────────────
function getCompanies() {
  const filePath = path.join(DATA_DIR, "companies.json");
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error reading companies.json:", e);
      return [];
    }
  }
  return [];
}

const sanitize = (name) => name ? String(name).replace(/[<>:"/\\|?*]+/g, '_') : "Unknown";

function getCompanyDetails(companyId, fyId) {
  const companies = getCompanies();
  const company = companies.find(c => String(c.id) === String(companyId));
  if (!company) {
    return { folderName: 'company ' + companyId, fileName: 'data' + (!fyId || fyId === 'default' ? '' : '_' + fyId) + '.json' };
  }
  
  const companyName = sanitize(company.name);
  let fyName = "Current F.Y";
  
  if (company.financialYears) {
    const fy = company.financialYears.find(f => String(f.id) === String(fyId));
    if (fy && fy.name) {
      fyName = sanitize(fy.name);
    } else if (fyId === "default") {
      const defFy = company.financialYears.find(f => String(f.id) === "default");
      if (defFy && defFy.name) fyName = sanitize(defFy.name);
    }
  }
  
  return { folderName: companyName, fileName: companyName + ' - ' + fyName + '.json' };
}

function companyFolder(companyId) {
  const { folderName } = getCompanyDetails(companyId, null);
  const base = path.join(DATA_DIR, folderName);
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

function dataFilePath(companyId, fyId) {
  const { folderName, fileName } = getCompanyDetails(companyId, fyId);
  const base = path.join(DATA_DIR, folderName);
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return path.join(base, fileName);
}

// Migration to rename old folders and files
function runMigration() {
  const companies = getCompanies();
  for (const company of companies) {
    const oldFolder = path.join(DATA_DIR, 'company ' + company.id);
    const newFolder = path.join(DATA_DIR, sanitize(company.name));
    
    if (fs.existsSync(oldFolder) && oldFolder !== newFolder) {
      if (!fs.existsSync(newFolder)) {
        fs.renameSync(oldFolder, newFolder);
      }
    }
    
    if (fs.existsSync(newFolder)) {
      const fys = company.financialYears || [{id: "default", name: "Current F.Y"}];
      for (const fy of fys) {
        const oldFileSuffix = fy.id === "default" ? "" : '_' + fy.id;
        const oldFilePath = path.join(newFolder, 'data' + oldFileSuffix + '.json');
        const newFilePath = path.join(newFolder, sanitize(company.name) + ' - ' + sanitize(fy.name) + '.json');
        
        if (fs.existsSync(oldFilePath) && !fs.existsSync(newFilePath)) {
          fs.renameSync(oldFilePath, newFilePath);
        }
      }
    }
  }
}
runMigration();

// ── GET  /api/data/:companyId/:fyId  ────────────────────────────────────────
app.get("/api/data/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const filePath = dataFilePath(companyId, fyId);

  if (fs.existsSync(filePath)) {
    try {
      res.json(JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch (err) {
      console.error("Error reading data file:", err);
      res.status(500).json({ error: "Failed to read data file" });
    }
  } else {
    res.status(404).json({ error: "No data found for this company" });
  }
});

// ── POST /api/data/:companyId/:fyId  ────────────────────────────────────────
app.post("/api/data/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const filePath = dataFilePath(companyId, fyId);

  try {
    let incomingData = req.body;

    // Concurrency & Duplicate Check: Merge with current disk data if exists
    if (fs.existsSync(filePath)) {
      try {
        const diskContent = fs.readFileSync(filePath, "utf8");
        const diskData = JSON.parse(diskContent);

        if (diskData && typeof diskData === "object") {
          // Invoices Protection: keep incoming if provided, otherwise preserve disk invoices
          if (!Array.isArray(incomingData.invoices) || incomingData.invoices.length === 0) {
            if (Array.isArray(diskData.invoices) && diskData.invoices.length > 0) {
              incomingData.invoices = diskData.invoices;
            }
          }

          // Purchases Protection: keep incoming if provided, otherwise preserve disk purchases
          if (!Array.isArray(incomingData.purchases) || incomingData.purchases.length === 0) {
            if (Array.isArray(diskData.purchases) && diskData.purchases.length > 0) {
              incomingData.purchases = diskData.purchases;
            }
          }

          // Materials Protection: keep incoming if provided, otherwise preserve disk materials
          if (!Array.isArray(incomingData.materials) || incomingData.materials.length === 0) {
            if (Array.isArray(diskData.materials) && diskData.materials.length > 0) {
              incomingData.materials = diskData.materials;
            }
          }

          // Contacts Protection: keep incoming if provided, otherwise preserve disk contacts
          if (!Array.isArray(incomingData.contacts) || incomingData.contacts.length === 0) {
            if (Array.isArray(diskData.contacts) && diskData.contacts.length > 0) {
              incomingData.contacts = diskData.contacts;
            }
          }

          // Preserve categories and lists if incoming is empty
          if (Array.isArray(diskData.categories) && diskData.categories.length > 0) {
            if (!Array.isArray(incomingData.categories) || incomingData.categories.length === 0) {
              incomingData.categories = diskData.categories;
            }
          }
          if (Array.isArray(diskData.subCategories) && diskData.subCategories.length > 0) {
            if (!Array.isArray(incomingData.subCategories) || incomingData.subCategories.length === 0) {
              incomingData.subCategories = diskData.subCategories;
            }
          }
          if (Array.isArray(diskData.productGroups) && diskData.productGroups.length > 0) {
            if (!Array.isArray(incomingData.productGroups) || incomingData.productGroups.length === 0) {
              incomingData.productGroups = diskData.productGroups;
            }
          }
          if (Array.isArray(diskData.companies) && diskData.companies.length > 0) {
            if (!Array.isArray(incomingData.companies) || incomingData.companies.length === 0) {
              incomingData.companies = diskData.companies;
            }
          }
          if (Array.isArray(diskData.productNames) && diskData.productNames.length > 0) {
            if (!Array.isArray(incomingData.productNames) || incomingData.productNames.length === 0) {
              incomingData.productNames = diskData.productNames;
            }
          }
          // Merge Sales Orders by ID so mobile app orders and Main ERP orders are both preserved
          const salesOrdersMap = new Map();
          if (Array.isArray(diskData.salesOrders)) {
            diskData.salesOrders.forEach(o => {
              if (o && o.id) salesOrdersMap.set(String(o.id), o);
            });
          }
          if (Array.isArray(incomingData.salesOrders)) {
            incomingData.salesOrders.forEach(o => {
              if (o && o.id) {
                const existing = salesOrdersMap.get(String(o.id));
                salesOrdersMap.set(String(o.id), existing ? { ...existing, ...o } : o);
              }
            });
          }
          incomingData.salesOrders = Array.from(salesOrdersMap.values())
            .sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));

          // Merge Pre-Take Orders by ID
          const preTakeMap = new Map();
          if (Array.isArray(diskData.preTakeOrders)) {
            diskData.preTakeOrders.forEach(o => {
              if (o && o.id) preTakeMap.set(String(o.id), o);
            });
          }
          if (Array.isArray(incomingData.preTakeOrders)) {
            incomingData.preTakeOrders.forEach(o => {
              if (o && o.id) {
                const existing = preTakeMap.get(String(o.id));
                preTakeMap.set(String(o.id), existing ? { ...existing, ...o } : o);
              }
            });
          }
          incomingData.preTakeOrders = Array.from(preTakeMap.values());

          // Merge Transactions: protect sales & purchase transactions while allowing clean voucher updates
          const isSalesOrPurchaseTx = (tx) => {
            if (!tx) return false;
            const vt = String(tx.voucherType || '').toUpperCase().trim();
            const idStr = String(tx.id || '').toUpperCase().trim();
            const refStr = String(tx.reference || '').toUpperCase().trim();
            const descStr = String(tx.description || '').toUpperCase().trim();
            if (vt === 'SALE' || vt === 'SALES' || vt === 'PUR' || vt === 'PURCHASE') return true;
            if (idStr.startsWith('TX-1') && (refStr.includes('COGS') || descStr.includes('COST OF GOODS SOLD'))) return true;
            if (idStr.startsWith('LSL-') || idStr.startsWith('INV-') || idStr.startsWith('B2B') || idStr.startsWith('SA-')) return true;
            if (refStr.startsWith('LSL-') || refStr.startsWith('INV-') || refStr.startsWith('B2B') || refStr.startsWith('SA-')) return true;
            return false;
          };

          if (Array.isArray(incomingData.transactions)) {
            // Incoming transactions from client is the authoritative list
          } else if (Array.isArray(diskData.transactions)) {
            incomingData.transactions = diskData.transactions;
          }
        }
      } catch (mergeErr) {
        console.warn("[Concurrency Protection] Non-fatal merge warning:", mergeErr.message);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(incomingData, null, 2), "utf8");
    res.json({ success: true, message: "Data saved successfully", data: incomingData });
  } catch (err) {
    console.error("Error saving data file:", err);
    res.status(500).json({ error: "Failed to save data file" });
  }
});

// ── GET /sales-app (Direct route for Sales Executives) ────────────────────
const getSalesAppPath = () => {
  const rootFile = path.join(__dirname, "sales-app.html");
  const distFile = path.join(__dirname, "dist", "sales-app.html");
  const publicFile = path.join(__dirname, "public", "sales-app.html");
  if (fs.existsSync(rootFile)) return rootFile;
  if (fs.existsSync(distFile)) return distFile;
  if (fs.existsSync(publicFile)) return publicFile;
  return null;
};

app.get(["/sales-app", "/sales-app.html", "/sales"], (req, res) => {
  const fPath = getSalesAppPath();
  if (fPath) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(fPath);
  } else {
    res.redirect("/#sales-orders");
  }
});

// ── GET /api/sales-orders/:companyId/:fyId ─────────────────────────────────
app.get("/api/sales-orders/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  if (!fs.existsSync(filePath)) return res.json([]);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(Array.isArray(data.salesOrders) ? data.salesOrders : []);
  } catch (err) {
    res.status(500).json({ error: "Failed to load sales orders" });
  }
});

// ── POST /api/sales-orders/:companyId/:fyId ────────────────────────────────
app.post("/api/sales-orders/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  try {
    let data = {};
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    if (!Array.isArray(data.salesOrders)) data.salesOrders = [];

    const newOrder = req.body;
    if (!newOrder.id) {
      const orderCount = data.salesOrders.length + 1;
      const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
      newOrder.id = `SO-${dateStr}-${String(orderCount).padStart(4, '0')}`;
    }
    if (!newOrder.date) newOrder.date = new Date().toISOString().split('T')[0];
    if (!newOrder.status) newOrder.status = "Pending";
    if (!newOrder.createdTimestamp) newOrder.createdTimestamp = Date.now();

    data.salesOrders.unshift(newOrder);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    res.json({ success: true, message: "Order placed successfully!", order: newOrder });
  } catch (err) {
    console.error("Error creating sales order:", err);
    res.status(500).json({ error: "Failed to save order: " + err.message });
  }
});

// ── PUT /api/sales-orders/:companyId/:fyId/:orderId ───────────────────────
app.put("/api/sales-orders/:companyId/:fyId/:orderId", (req, res) => {
  const { companyId, fyId, orderId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Data file not found" });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(data.salesOrders)) data.salesOrders = [];

    const idx = data.salesOrders.findIndex(o => String(o.id) === String(orderId));
    if (idx === -1) return res.status(404).json({ error: "Order not found" });

    data.salesOrders[idx] = { ...data.salesOrders[idx], ...req.body, updatedTimestamp: Date.now() };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    res.json({ success: true, message: "Order updated successfully", order: data.salesOrders[idx] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update order" });
  }
});

// ── DELETE /api/sales-orders/:companyId/:fyId/:orderId ────────────────────
app.delete("/api/sales-orders/:companyId/:fyId/:orderId", (req, res) => {
  const { companyId, fyId, orderId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Data file not found" });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(data.salesOrders)) data.salesOrders = [];

    data.salesOrders = data.salesOrders.filter(o => String(o.id) !== String(orderId));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// ── GET /api/pre-take-orders/:companyId/:fyId ──────────────────────────────
app.get("/api/pre-take-orders/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  if (!fs.existsSync(filePath)) return res.json([]);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(Array.isArray(data.preTakeOrders) ? data.preTakeOrders : []);
  } catch (err) {
    res.status(500).json({ error: "Failed to load pre-take orders" });
  }
});

// ── POST /api/pre-take-orders/:companyId/:fyId ─────────────────────────────
// Create/Assign Pre-Take Order from Main ERP to Sales Executive
app.post("/api/pre-take-orders/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  try {
    let data = {};
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    if (!Array.isArray(data.preTakeOrders)) data.preTakeOrders = [];

    const newPreTakeOrder = req.body;
    if (!newPreTakeOrder.id) {
      const count = data.preTakeOrders.length + 1;
      const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
      newPreTakeOrder.id = `PTO-${dateStr}-${String(count).padStart(4, '0')}`;
    }
    if (!newPreTakeOrder.date) newPreTakeOrder.date = new Date().toISOString().split('T')[0];
    if (!newPreTakeOrder.status) newPreTakeOrder.status = "Assigned";
    if (!newPreTakeOrder.createdTimestamp) newPreTakeOrder.createdTimestamp = Date.now();
    newPreTakeOrder.seen = false;
    newPreTakeOrder.seenAt = null;

    data.preTakeOrders.unshift(newPreTakeOrder);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    res.json({ success: true, message: "Pre-Take Order assigned successfully!", order: newPreTakeOrder });
  } catch (err) {
    console.error("Error creating pre-take order:", err);
    res.status(500).json({ error: "Failed to save pre-take order: " + err.message });
  }
});

// ── POST /api/pre-take-orders/:companyId/:fyId/:orderId/mark-seen ──────────
app.post("/api/pre-take-orders/:companyId/:fyId/:orderId/mark-seen", (req, res) => {
  const { companyId, fyId, orderId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Data file not found" });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(data.preTakeOrders)) data.preTakeOrders = [];

    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ', ' + new Date().toLocaleDateString('en-IN');
    let updated = false;

    data.preTakeOrders.forEach(o => {
      if (String(o.id) === String(orderId)) {
        o.seen = true;
        o.seenAt = o.seenAt || nowStr;
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    }

    res.json({ success: true, message: "Order marked as seen" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark order as seen" });
  }
});

// ── POST /api/pre-take-orders/:companyId/:fyId/mark-seen-all ────────────────
app.post("/api/pre-take-orders/:companyId/:fyId/mark-seen-all", (req, res) => {
  const { companyId, fyId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Data file not found" });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(data.preTakeOrders)) data.preTakeOrders = [];

    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ', ' + new Date().toLocaleDateString('en-IN');
    let count = 0;

    data.preTakeOrders.forEach(o => {
      if (!o.seen) {
        o.seen = true;
        o.seenAt = nowStr;
        count++;
      }
    });

    if (count > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    }

    res.json({ success: true, updatedCount: count });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark orders as seen" });
  }
});

// ── PUT /api/pre-take-orders/:companyId/:fyId/:orderId ──────────────────────
// Edit / Update Pre-Take Order from Main ERP & alert Mobile Executive
app.put("/api/pre-take-orders/:companyId/:fyId/:orderId", (req, res) => {
  const { companyId, fyId, orderId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Data file not found" });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(data.preTakeOrders)) data.preTakeOrders = [];

    const index = data.preTakeOrders.findIndex(o => String(o.id) === String(orderId));
    if (index === -1) return res.status(404).json({ error: "Pre-take order not found" });

    const updatedPayload = req.body;
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ', ' + new Date().toLocaleDateString('en-IN');

    data.preTakeOrders[index] = {
      ...data.preTakeOrders[index],
      ...updatedPayload,
      id: orderId, // preserve order ID
      isUpdated: true,
      updatedAt: nowStr,
      updatedTimestamp: Date.now(),
      seen: false, // reset seen status so rep sees new notification badge!
      seenAt: null
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    res.json({ success: true, message: "Pre-Take Order updated successfully!", order: data.preTakeOrders[index] });
  } catch (err) {
    console.error("Error updating pre-take order:", err);
    res.status(500).json({ error: "Failed to update pre-take order: " + err.message });
  }
});

// ── DELETE /api/pre-take-orders/:companyId/:fyId/:orderId ──────────────────
app.delete("/api/pre-take-orders/:companyId/:fyId/:orderId", (req, res) => {
  const { companyId, fyId, orderId } = req.params;
  const filePath = dataFilePath(companyId, fyId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Data file not found" });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(data.preTakeOrders)) data.preTakeOrders = [];

    data.preTakeOrders = data.preTakeOrders.filter(o => String(o.id) !== String(orderId));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    res.json({ success: true, message: "Pre-Take Order cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear pre-take order" });
  }
});

// ── POST /api/sales-login ───────────────────────────────────────────────────
app.post("/api/sales-login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and Password are required." });
  }

  const uInput = String(username).trim().toLowerCase();
  const pInput = String(password).trim();

  let companies = getCompanies();

  // Fallback to default company if companies.json is empty
  if (!Array.isArray(companies) || companies.length === 0) {
    companies = [{
      id: "1",
      name: "METRO AGENCIES",
      username: "admin",
      password: "123",
      users: [
        { id: "USR-1", username: "admin", password: "123", fullName: "Administrator", role: "Admin", status: "Active" }
      ]
    }];
  }

  const accessibleCompanies = [];
  let authenticatedUser = null;

  for (const comp of companies) {
    let match = null;
    const users = Array.isArray(comp.users) ? comp.users : [];
    match = users.find(u => 
      String(u.username || "").trim().toLowerCase() === uInput && 
      String(u.password || "").trim() === pInput && 
      u.status !== "Inactive"
    );

    if (!match && comp.username && String(comp.username).trim().toLowerCase() === uInput && String(comp.password).trim() === pInput) {
      match = {
        id: "USR-ADMIN",
        username: comp.username,
        fullName: (comp.name || "Company") + " Admin",
        role: "Admin"
      };
    }

    if (!match && uInput === "admin" && pInput === "123") {
      match = {
        id: "USR-DEFAULT-ADMIN",
        username: "admin",
        fullName: "Administrator",
        role: "Admin"
      };
    }

    if (match) {
      if (!authenticatedUser) authenticatedUser = match;
      accessibleCompanies.push({
        id: comp.id,
        name: comp.name || "METRO AGENCIES",
        subName: comp.subName || "",
        state: comp.state || "Kerala"
      });
    }
  }

  if (authenticatedUser && accessibleCompanies.length > 0) {
    return res.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
        fullName: authenticatedUser.fullName || authenticatedUser.username,
        role: authenticatedUser.role || "Sales Executive"
      },
      companies: accessibleCompanies
    });
  } else {
    return res.status(401).json({ success: false, error: "Invalid User ID or Password." });
  }
});

// ── GET /api/catalog/:companyId/:fyId ──────────────────────────────────────
app.get("/api/catalog/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const filePath = dataFilePath(companyId, fyId);

  if (!fs.existsSync(filePath)) {
    console.warn(`Catalog file not found for company ${companyId}: ${filePath}`);
    return res.json({ companyId, contacts: [], materials: [] });
  }

  try {
    console.log(`[Catalog] Fetching live catalog from path: ${filePath}`);
    const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    const data = JSON.parse(content);
    const customerMap = new Map();

    // 1. Extract from data.contacts (customers/parties)
    (Array.isArray(data.contacts) ? data.contacts : []).forEach(c => {
      const t = String(c.type || '').toLowerCase();
      const gn = String(c.groupName || '').toUpperCase();
      const isCust = !c.type || t === 'customer' || t === 'both' || gn === 'SUNDRY DEBTORS' || c.listInCustomerList;
      if (isCust && c.name) {
        const key = String(c.id || c.name);
        customerMap.set(key, {
          id: c.id || c.name,
          name: String(c.name).trim(),
          mobile: c.mobile || c.phone || '',
          city: c.city || '',
          address: c.address || '',
          gstNo: c.gstin || c.gstNo || ''
        });
      }
    });

    // 2. Extract from data.ledgers (SUNDRY DEBTORS / CUSTOMERS)
    (Array.isArray(data.ledgers) ? data.ledgers : []).forEach(l => {
      const gn = String(l.groupName || '').toUpperCase();
      const isDebtor = gn === 'SUNDRY DEBTORS' || l.isCustomerSubLedger || gn === 'CUSTOMERS';
      if (isDebtor && l.name) {
        const nameKey = String(l.name).toLowerCase().trim();
        const exists = Array.from(customerMap.values()).some(c => String(c.name).toLowerCase().trim() === nameKey);
        if (!exists) {
          const key = String(l.code || l.id || l.name);
          customerMap.set(key, {
            id: l.code || l.id || `LEDG-${l.tradeasyId || Date.now()}`,
            name: String(l.name).trim(),
            mobile: l.phone || l.mobile || '',
            city: l.city || '',
            address: l.address || '',
            gstNo: l.gstin || l.gstNo || ''
          });
        }
      }
    });

    const contacts = Array.from(customerMap.values());

    const materials = (Array.isArray(data.materials) ? data.materials : []).map(m => {
      let mainStock = 0;
      let defaultRate = 0;
      if (Array.isArray(m.batches) && m.batches.length > 0) {
        mainStock = m.batches.reduce((sum, b) => sum + (parseFloat(b.stock) || 0), 0);
        defaultRate = parseFloat(m.batches[0].gstInclRate || m.batches[0].mrp || 0);
      }
      return {
        id: m.id,
        name: m.name,
        code: m.code,
        category: m.category,
        subCategory: m.subCategory,
        unit: m.unit,
        stock: mainStock,
        rate: defaultRate,
        batches: m.batches || []
      };
    });

    res.json({ companyId: String(companyId), companyName: data.companyName || '', contacts, materials });
  } catch (err) {
    console.error(`Error loading catalog for company ${companyId}:`, err);
    res.status(500).json({ error: "Failed to load catalog" });
  }
});

// ── POST /api/backup/:companyId/:fyId  ──────────────────────────────────────
// Copies the current data file into:  company 1/BACKUP/erp_backup_<timestamp>.json
app.post("/api/backup/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const sourceFile = dataFilePath(companyId, fyId);

  if (!fs.existsSync(sourceFile)) {
    return res.status(404).json({ error: "No data exists to backup yet." });
  }

  const backupDir = path.join(companyFolder(companyId), "BACKUP");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const dateStr = new Date().toISOString().replace(/:/g, "-").split(".")[0];
  const suffix  = (!fyId || fyId === "default") ? "" : `_${fyId}`;
  const targetFile = path.join(backupDir, `erp_backup${suffix}_${dateStr}.json`);

  try {
    fs.copyFileSync(sourceFile, targetFile);
    res.json({ success: true, message: `Backup saved to ${targetFile}`, file: targetFile });
  } catch (err) {
    console.error("Error creating backup:", err);
    res.status(500).json({ error: "Failed to create backup." });
  }
});

// ── GET /api/backups/:companyId  ─────────────────────────────────────────────
// Returns a list of available backup files for a company
app.get("/api/backups/:companyId", (req, res) => {
  const backupDir = path.join(companyFolder(req.params.companyId), "BACKUP");
  if (!fs.existsSync(backupDir)) return res.json([]);
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith(".json"))
    .map(f => ({
      name: f,
      size: fs.statSync(path.join(backupDir, f)).size,
      modified: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => new Date(b.modified) - new Date(a.modified));
  res.json(files);
});

// ── POST /api/restore/:companyId/:fyId  ──────────────────────────────────────
// Restores a specific backup file: body = { "file": "<filename>" }
app.post("/api/restore/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  const { file } = req.body;
  if (!file) return res.status(400).json({ error: "No backup file specified." });

  const backupDir  = path.join(companyFolder(companyId), "BACKUP");
  const backupFile = path.join(backupDir, file);

  if (!fs.existsSync(backupFile)) {
    return res.status(404).json({ error: `Backup file not found: ${file}` });
  }

  const destFile = dataFilePath(companyId, fyId);
  try {
    fs.copyFileSync(backupFile, destFile);
    res.json({ success: true, message: `Restored from ${file}` });
  } catch (err) {
    console.error("Error restoring backup:", err);
    res.status(500).json({ error: "Failed to restore backup." });
  }
});

// ── DELETE /api/data/:companyId/:fyId  ──────────────────────────────────────
app.delete("/api/data/:companyId/:fyId", (req, res) => {
  const { companyId, fyId } = req.params;
  try {
    const companies = getCompanies();
    const company = companies.find(c => String(c.id) === String(companyId));
    
    // Find matching file
    const { folderName, fileName } = getCompanyDetails(companyId, fyId);
    const folderPath = path.join(DATA_DIR, folderName);
    const targetFilePath = path.join(folderPath, fileName);
    
    let deletedFiles = [];
    if (fs.existsSync(targetFilePath)) {
      try {
        fs.unlinkSync(targetFilePath);
        deletedFiles.push(fileName);
      } catch (e) {
        console.warn("Could not delete file:", targetFilePath, e.message);
      }
    }

    // Also check for legacy file name if any
    const legacyPath = path.join(folderPath, `data${fyId === 'default' ? '' : '_' + fyId}.json`);
    if (fs.existsSync(legacyPath)) {
      try {
        fs.unlinkSync(legacyPath);
        deletedFiles.push(path.basename(legacyPath));
      } catch (e) {}
    }

    // Remove FY from companies.json if present
    if (company && Array.isArray(company.financialYears)) {
      company.financialYears = company.financialYears.filter(f => String(f.id) !== String(fyId));
      const compFilePath = path.join(DATA_DIR, "companies.json");
      fs.writeFileSync(compFilePath, JSON.stringify(companies, null, 2), "utf8");
    }

    res.json({ success: true, message: "Financial year deleted successfully", deletedFiles });
  } catch (err) {
    console.error("Error deleting financial year:", err);
    res.status(500).json({ error: "Failed to delete financial year: " + err.message });
  }
});

// ── GET  /api/companies  ────────────────────────────────────────────────────
app.get("/api/companies", (req, res) => {
  const filePath = path.join(DATA_DIR, "companies.json");
  if (fs.existsSync(filePath)) {
    try {
      res.json(JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch (err) {
      res.status(500).json({ error: "Failed to read companies." });
    }
  } else {
    res.json([]);
  }
});

// ── POST /api/companies  ────────────────────────────────────────────────────
app.post("/api/companies", (req, res) => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, "companies.json");
  try {
    const oldCompanies = getCompanies();
    const newCompanies = req.body;

    // Handle renaming of company folder & files if company name or FY name changed
    if (Array.isArray(oldCompanies) && Array.isArray(newCompanies)) {
      for (const newComp of newCompanies) {
        const oldComp = oldCompanies.find(c => String(c.id) === String(newComp.id));
        if (oldComp) {
          const oldFolderName = sanitize(oldComp.name);
          const newFolderName = sanitize(newComp.name);
          const oldFolderPath = path.join(DATA_DIR, oldFolderName);
          const newFolderPath = path.join(DATA_DIR, newFolderName);

          if (oldFolderName !== newFolderName && fs.existsSync(oldFolderPath)) {
            if (!fs.existsSync(newFolderPath)) {
              try {
                fs.renameSync(oldFolderPath, newFolderPath);
              } catch (renameErr) {
                console.warn("Failed to rename company directory:", renameErr.message);
              }
            }
          }

          const targetFolderPath = fs.existsSync(newFolderPath) ? newFolderPath : (fs.existsSync(oldFolderPath) ? oldFolderPath : null);
          if (targetFolderPath) {
            const oldFys = oldComp.financialYears || [];
            const newFys = newComp.financialYears || [];
            for (const newFy of newFys) {
              const oldFy = oldFys.find(f => String(f.id) === String(newFy.id));
              const oldFyName = oldFy ? sanitize(oldFy.name) : "Current F.Y";
              const newFyName = sanitize(newFy.name || "Current F.Y");

              const oldFileName1 = (oldComp ? sanitize(oldComp.name) : oldFolderName) + ' - ' + oldFyName + '.json';
              const newFileName1 = sanitize(newComp.name) + ' - ' + newFyName + '.json';
              const oldFilePath1 = path.join(targetFolderPath, oldFileName1);
              const newFilePath1 = path.join(targetFolderPath, newFileName1);

              if (oldFilePath1 !== newFilePath1 && fs.existsSync(oldFilePath1) && !fs.existsSync(newFilePath1)) {
                try {
                  fs.renameSync(oldFilePath1, newFilePath1);
                } catch (fileRenameErr) {
                  console.warn("Failed to rename FY file:", fileRenameErr.message);
                }
              }
            }
          }
        }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(newCompanies, null, 2), "utf8");
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving companies:", err);
    res.status(500).json({ error: "Failed to save companies: " + err.message });
  }
});

// ── DELETE /api/companies/:companyId (and /api/company/:companyId) ──────────
// Backs up all financial years and company metadata before permanently deleting active files
const handleDeleteCompany = (req, res) => {
  const { companyId } = req.params;
  try {
    const companies = getCompanies();
    const companyIndex = companies.findIndex(c => String(c.id) === String(companyId));
    
    if (companyIndex === -1) {
      return res.status(404).json({ error: `Company with ID "${companyId}" not found.` });
    }

    const company = companies[companyIndex];
    const companyName = sanitize(company.name);
    const dateStr = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "_");
    
    // Backup folder targets
    const backupCompanyFolder = path.join(BACKUP_DIR, `${companyName}_backup_${dateStr}`);
    const backupDbCompanyFolder = path.join(BACKUP_DB_DIR, `${companyName}_backup_${dateStr}`);
    
    if (!fs.existsSync(backupCompanyFolder)) fs.mkdirSync(backupCompanyFolder, { recursive: true });
    if (!fs.existsSync(backupDbCompanyFolder)) fs.mkdirSync(backupDbCompanyFolder, { recursive: true });

    // Source directories
    const primaryFolder = path.join(DATA_DIR, companyName);
    const legacyFolder = path.join(DATA_DIR, 'company ' + company.id);

    const backedUpFiles = [];

    // Helper to copy directory recursively
    const copyRecursive = (src, dest) => {
      if (!fs.existsSync(src)) return;
      const stat = fs.statSync(src);
      if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const items = fs.readdirSync(src);
        for (const item of items) {
          copyRecursive(path.join(src, item), path.join(dest, item));
        }
      } else {
        fs.copyFileSync(src, dest);
        backedUpFiles.push(path.basename(src));
      }
    };

    // 1. Copy primary company folder
    if (fs.existsSync(primaryFolder)) {
      copyRecursive(primaryFolder, backupCompanyFolder);
      copyRecursive(primaryFolder, backupDbCompanyFolder);
    }

    // 2. Copy legacy company folder if exists
    if (fs.existsSync(legacyFolder) && legacyFolder !== primaryFolder) {
      copyRecursive(legacyFolder, backupCompanyFolder);
      copyRecursive(legacyFolder, backupDbCompanyFolder);
    }

    // 3. Copy loose files for this company if any
    const looseLegacyFile = path.join(DATA_DIR, `data_company_${company.id}.json`);
    if (fs.existsSync(looseLegacyFile)) {
      fs.copyFileSync(looseLegacyFile, path.join(backupCompanyFolder, path.basename(looseLegacyFile)));
      fs.copyFileSync(looseLegacyFile, path.join(backupDbCompanyFolder, path.basename(looseLegacyFile)));
      backedUpFiles.push(path.basename(looseLegacyFile));
    }

    // 4. Copy each financial year JSON file directly to root BACKUP/ with standalone timestamp naming
    const fys = company.financialYears || [{ id: "default", name: "Current F.Y" }];
    for (const fy of fys) {
      const { fileName } = getCompanyDetails(company.id, fy.id);
      const srcFile = path.join(primaryFolder, fileName);
      if (fs.existsSync(srcFile)) {
        const standaloneBackupName = `${companyName} - ${sanitize(fy.name || fy.id)}_backup_deleted_${dateStr}.json`;
        const standaloneBackupPath = path.join(BACKUP_DIR, standaloneBackupName);
        fs.copyFileSync(srcFile, standaloneBackupPath);
        backedUpFiles.push(standaloneBackupName);
      }
    }

    // 5. Save full company metadata inside the backup folders
    const metaContent = JSON.stringify(company, null, 2);
    fs.writeFileSync(path.join(backupCompanyFolder, "company_meta.json"), metaContent, "utf8");
    fs.writeFileSync(path.join(backupDbCompanyFolder, "company_meta.json"), metaContent, "utf8");

    // 6. Update COMPANY DATA BASE_BACKUP/companies.json record
    try {
      const backupCompaniesPath = path.join(BACKUP_DB_DIR, "companies.json");
      let backupCompaniesList = [];
      if (fs.existsSync(backupCompaniesPath)) {
        try { backupCompaniesList = JSON.parse(fs.readFileSync(backupCompaniesPath, "utf8")); } catch (e) {}
      }
      if (!Array.isArray(backupCompaniesList)) backupCompaniesList = [];
      const existingIdx = backupCompaniesList.findIndex(c => String(c.id) === String(company.id));
      const backupRecord = { ...company, deletedAt: new Date().toISOString(), backupFolder: backupCompanyFolder };
      if (existingIdx !== -1) {
        backupCompaniesList[existingIdx] = backupRecord;
      } else {
        backupCompaniesList.push(backupRecord);
      }
      fs.writeFileSync(backupCompaniesPath, JSON.stringify(backupCompaniesList, null, 2), "utf8");
    } catch (bkErr) {
      console.warn("Could not update backup companies list:", bkErr.message);
    }

    // 7. Verify backup folder is not empty
    const backupFilesCheck = fs.readdirSync(backupCompanyFolder);
    if (backupFilesCheck.length === 0) {
      throw new Error("Backup folder was created but no files could be saved.");
    }

    // 8. Delete active company data files and folder from COMPANY DATA BASE
    if (fs.existsSync(primaryFolder)) {
      fs.rmSync(primaryFolder, { recursive: true, force: true });
    }
    if (fs.existsSync(legacyFolder) && legacyFolder !== primaryFolder) {
      fs.rmSync(legacyFolder, { recursive: true, force: true });
    }
    if (fs.existsSync(looseLegacyFile)) {
      fs.unlinkSync(looseLegacyFile);
    }

    // 9. Remove from active companies.json
    companies.splice(companyIndex, 1);
    const activeCompaniesPath = path.join(DATA_DIR, "companies.json");
    fs.writeFileSync(activeCompaniesPath, JSON.stringify(companies, null, 2), "utf8");

    console.log(`[Company Delete] Company "${company.name}" (ID: ${companyId}) backed up to "${backupCompanyFolder}" and deleted successfully.`);

    res.json({
      success: true,
      message: `Company "${company.name}" and all of its data have been securely backed up and deleted from the active database.`,
      backupLocation: backupCompanyFolder,
      backedUpFiles: [...new Set(backedUpFiles)]
    });
  } catch (err) {
    console.error("Error backing up and deleting company:", err);
    res.status(500).json({ error: "Failed to delete company: " + err.message });
  }
};

app.delete("/api/companies/:companyId", handleDeleteCompany);
app.delete("/api/company/:companyId", handleDeleteCompany);

// ── Misc ─────────────────────────────────────────────────────────────────────

let isLocked = false;
app.get('/api/lock', (req, res) => {
  if (isLocked) {
    res.json({ locked: false });
  } else {
    isLocked = true;
    setTimeout(() => { isLocked = false; }, 10000);
    res.json({ locked: true });
  }
});
app.get('/api/unlock', (req, res) => {
  isLocked = false;
  res.json({ success: true });
});

app.post("/api/log", (req, res) => {
  fs.appendFileSync("browser_errors.log", JSON.stringify(req.body) + "\n"); console.log("BROWSER LOG:", req.body);
  res.send("ok");
});

function cleanPath(inputPath) {
  if (!inputPath || typeof inputPath !== "string") return "";
  let clean = inputPath.trim();
  while (/^[a-zA-Z]:[\\/][a-zA-Z]:/i.test(clean) || /^[a-zA-Z]:[a-zA-Z]:/i.test(clean)) {
    clean = clean.replace(/^[a-zA-Z]:[\\/]?/i, "");
  }
  return path.normalize(clean);
}

app.post("/api/gstr1/export", (req, res) => {
  let { folderPath, csvFiles } = req.body;
  if (!folderPath || !csvFiles || typeof csvFiles !== "object") {
    return res.status(400).json({ error: "Invalid parameters. Folder path and csvFiles required." });
  }

  folderPath = cleanPath(folderPath);

  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const createdFiles = [];
    for (const [filename, content] of Object.entries(csvFiles)) {
      const targetFilePath = path.join(folderPath, filename);
      fs.writeFileSync(targetFilePath, content, "utf8");
      createdFiles.push(targetFilePath);
    }

    res.json({ success: true, message: `Successfully exported ${createdFiles.length} CSV files to ${folderPath}`, files: createdFiles });
  } catch (err) {
    console.error("Error exporting GSTR1 CSV files:", err);
    res.status(500).json({ error: "Failed to write CSV files: " + err.message });
  }
});

app.post("/api/filesystem/browse", (req, res) => {
  let targetDir = cleanPath(req.body.dir || "");
  
  const getDrives = () => {
    return ["C:\\", "D:\\", "E:\\", "F:\\", "G:\\", "H:\\"].filter(d => {
      try { return fs.existsSync(d); } catch (e) { return false; }
    });
  };

  if (!targetDir) {
    return res.json({ currentDir: "", parentDir: null, subdirs: getDrives() });
  }

  // If path doesn't exist, try creating it or fall back to parent drive
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      // Fall back to drive root if path doesn't exist and cannot be created
      const driveMatch = targetDir.match(/^[a-zA-Z]:\\?/);
      if (driveMatch && fs.existsSync(driveMatch[0])) {
        targetDir = driveMatch[0];
      } else {
        return res.json({ currentDir: "", parentDir: null, subdirs: getDrives() });
      }
    }
  }

  try {
    const parentDir = path.dirname(targetDir) === targetDir ? "" : path.dirname(targetDir);
    const files = fs.readdirSync(targetDir, { withFileTypes: true });
    const subdirs = [];

    for (const f of files) {
      try {
        if (f.isDirectory() && !f.name.startsWith("$") && !f.name.startsWith(".")) {
          subdirs.push(path.join(targetDir, f.name));
        }
      } catch (fErr) {
        // Skip inaccessible subdirectories
      }
    }

    res.json({ currentDir: targetDir, parentDir, subdirs });
  } catch (err) {
    console.error("Error reading directory:", err.message);
    res.json({ currentDir: targetDir, parentDir: "", subdirs: [], warning: "Access restricted or protected folder." });
  }
});

// ── Production Frontend Serving ─────────────────────────────────────────────
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Client-side SPA fallback for non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/sales-app") || req.path === "/sales") {
      const fPath = getSalesAppPath();
      if (fPath) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.sendFile(fPath);
      }
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Global error handling middleware
app.use((err, req, res, next) => {
  if (err) {
    if (err.type === 'request.aborted' || err.code === 'ECONNABORTED' || err.message === 'request aborted') {
      return res.status(400).end();
    }
    console.error("Server error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  }
  next();
});

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

app.listen(PORT, "0.0.0.0", () => {
  console.log("\n==================================================================");
  console.log(`🚀 ERP Server running on port ${PORT}`);
  console.log(`📁 Data folder: ${DATA_DIR}`);
  if (fs.existsSync(distPath)) {
    console.log(`💻 Serving production frontend from: ${distPath}`);
  }
  console.log("==================================================================");
  console.log(`🌐 MULTI-USER ACCESS URLS:`);
  console.log(`   • Server PC:            http://localhost:${PORT}`);
  const ips = getLocalIpAddresses();
  if (ips.length > 0) {
    ips.forEach(ip => {
      console.log(`   • LAN / Wi-Fi Devices:  http://${ip}:${PORT}`);
    });
  } else {
    console.log(`   • LAN / Wi-Fi Devices:  http://<YOUR-SERVER-IP>:${PORT}`);
  }
  console.log("==================================================================\n");
});

process.on("exit", code => console.log("EXITING", code));
process.on("uncaughtException", err => console.log("ERROR", err));
setInterval(() => {}, 1000 * 60 * 60);

