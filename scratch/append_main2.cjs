const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");

// Remove the one I just added
main = main.replace(/export function updateCompanyHeaderIndicator[\s\S]*/, "");

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
  const windowContainerEl = document.getElementById("active-window");
  const windowTitleEl = document.getElementById("window-title-text");
  const windowContentEl = document.getElementById("window-content-area");

  if (!activeCompanyId) {
    if (windowContainerEl) windowContainerEl.classList.add("hidden");
    return;
  }

  const hash = window.location.hash.substring(1) || "dashboard";
  const route = routes[hash];
  
  if (!route) {
    if (windowContainerEl) windowContainerEl.classList.add("hidden");
    return;
  }

  if (windowContainerEl) windowContainerEl.classList.remove("hidden");
  if (windowTitleEl) windowTitleEl.textContent = route.title;
  if (windowContentEl) {
    windowContentEl.innerHTML = "";
    route.render(windowContentEl);
  }
}
`;

main += funcs;
fs.writeFileSync("src/main.js", main);
console.log("Appended correct functions");
