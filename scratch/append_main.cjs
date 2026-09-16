const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");

const funcs = `
export function updateCompanyHeaderIndicator() {
  const label = document.getElementById("header-company-name");
  const activeId = state.getActiveCompanyId();
  if (label && activeId) {
    const companies = state.getRegisteredCompanies();
    const current = companies.find(c => c.id === activeId);
    if (current) {
      label.textContent = current.name + " (" + state.getLoginDate() + ")";
    }
  }
}

export function checkLoginAndRender() {
  const activeCompanyId = state.getActiveCompanyId();
  const appContainer = document.getElementById("app");
  
  let welcomeContainer = document.getElementById("welcome-login-root");
  if (!welcomeContainer) {
    welcomeContainer = document.createElement("div");
    welcomeContainer.id = "welcome-login-root";
    document.body.appendChild(welcomeContainer);
  }
  
  if (!activeCompanyId) {
    if (appContainer) appContainer.style.display = "none";
    welcomeContainer.style.display = "block";
    showWelcomeScreen(welcomeContainer, () => {
      checkLoginAndRender();
      window.location.hash = "#inventory";
      renderCurrentView();
    });
  } else {
    if (appContainer) appContainer.style.display = "block";
    welcomeContainer.style.display = "none";
    welcomeContainer.innerHTML = "";
    updateCompanyHeaderIndicator();
    renderCurrentView();
  }
}

export function renderCurrentView() {
  const activeCompanyId = state.getActiveCompanyId();
  if (!activeCompanyId) return;

  const hash = window.location.hash.substring(1) || "dashboard";
  
  const windowContentEl = document.getElementById("window-content-area");
  
  if (hash === "dashboard") renderDashboard(windowContentEl);
  else if (hash === "inventory") renderInventory(windowContentEl);
  else if (hash === "transactions") renderTransactions(windowContentEl);
  else if (hash === "vouchers") renderVouchers(windowContentEl);
  else if (hash === "contacts") renderContacts(windowContentEl);
  else if (hash === "reports") renderReports(windowContentEl);
  else if (hash === "admin") renderAdmin(windowContentEl);
  else if (hash === "groups") renderGroups(windowContentEl);
  else if (hash === "ledgers") renderLedger(windowContentEl);
  else if (hash === "adjustments") renderAdjustments(windowContentEl);
  else if (hash === "preset-loading") renderPresetLoading(windowContentEl);
  else if (hash === "search-vouchers") renderSearchVouchers(windowContentEl);
}
`;

main += funcs;
fs.writeFileSync("src/main.js", main);
console.log("Appended missing functions");
