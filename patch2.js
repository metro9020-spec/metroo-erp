import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mainFilePath = path.join(__dirname, "src", "main.js");

let content = fs.readFileSync(mainFilePath, "utf8");

const missingCode = `
// DOM Elements
const windowContentEl = document.getElementById("window-content");

export function renderCurrentView() {
  const hash = window.location.hash.slice(1) || "dashboard";

  windowContentEl.innerHTML = "";

  switch (hash) {
    case "login":
      break;
    case "dashboard":
      renderDashboard(windowContentEl);
      break;
    case "inventory":
    case "products-list":
    case "stock-register":
    case "stock-register-detailed":
    case "stock-quick-view":
      renderInventory(windowContentEl);
      break;
    case "transactions":
    case "transaction-log":
      renderTransactions(windowContentEl);
      break;
    case "vouchers":
      renderVouchers(windowContentEl);
      break;
    case "contacts":
    case "contacts-directory":
      renderContacts(windowContentEl);
      break;
    case "reports":
      renderReports(windowContentEl);
      break;
    case "admin":
      renderAdmin(windowContentEl);
      break;
    case "ledger":
    case "ledgers":
      renderLedger(windowContentEl);
      break;
    case "groups":
      renderGroups(windowContentEl);
      break;
    case "adjustments":
      renderAdjustments(windowContentEl);
      break;
    case "preset-loading":
    case "presetLoading":
      renderPresetLoading(windowContentEl);
      break;
    case "search-vouchers":
    case "searchVouchers":
      renderSearchVouchers(windowContentEl);
      break;
    default:
      renderDashboard(windowContentEl);
      break;
  }
}

window.addEventListener("hashchange", renderCurrentView);

`;

// Insert after the last import statement
content = content.replace(/(import { showWelcomeScreen, showEditCompanyModal } from "\.\/views\/login\.js";)/, "$1\n" + missingCode);

fs.writeFileSync(mainFilePath, content);
console.log("main.js recovered successfully.");
