import { state } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";

export function removeAllSelectSeriesModals() {
  const modals = document.querySelectorAll("#select-series-modal");
  modals.forEach(el => {
    let parent = el.parentElement;
    if (parent && parent.id !== "modal-container-root" && parent !== document.body) {
      parent.remove();
    }
    el.remove();
  });
}

export function showSelectBillSeriesModal(txType, onSelect) {
  // Always clean up any existing series selection modals first
  removeAllSelectSeriesModals();

  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const seriesOptions = (state.getSeriesMaster() || []).filter(s => String(s.txType || "").toLowerCase() === String(txType || "").toLowerCase());
  if (seriesOptions.length <= 1) {
    if (typeof onSelect === "function") {
      onSelect(seriesOptions[0] || null);
    }
    return;
  }

  // Get last bill number
  let lastBillNum = "";
  if (String(txType).toLowerCase().includes("sale")) {
    const invs = state.getInvoices();
    if (invs && invs.length > 0) lastBillNum = invs[invs.length - 1].voucherNo || invs[invs.length - 1].id;
  } else if (String(txType).toLowerCase().includes("pur")) {
    const purs = state.getPurchases();
    if (purs && purs.length > 0) lastBillNum = purs[purs.length - 1].voucherNo || purs[purs.length - 1].refNo || purs[purs.length - 1].id;
  }

  let selectedIndex = 0;

  const modalHtml = `
    <div class="modal-overlay active blocking-modal" id="select-series-modal" tabindex="0" style="display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,0.5); z-index:1000500; position:fixed; inset:0; outline:none; pointer-events:auto;">
      <div class="modal-container window-container" style="background:#cbd5e1; border:2px solid #5a7b9c; border-radius:4px; width:340px; box-shadow:0 8px 30px rgba(0,0,0,0.35); font-family:Tahoma,sans-serif; font-size:12px; display:flex; flex-direction:column; overflow:hidden; pointer-events:auto;">
        <!-- Header -->
        <div class="window-header modal-header" style="background:linear-gradient(180deg,#1e4a8c,#3a6dba); color:white; font-weight:bold; padding:4px 8px; font-size:12px; cursor:move; user-select:none;">
          Select Bill Series
        </div>
        
        <!-- List container -->
        <div style="padding:10px;">
          <div id="series-select-box" style="border:1px solid #94a3b8; background:white; height:200px; overflow-y:auto; margin-bottom:10px;">
            ${seriesOptions.length === 0 ? `
              <div style="padding:10px; color:#64748b; font-style:italic;">No series available for ${txType}</div>
            ` : seriesOptions.map((s, idx) => `
              <div data-id="${s.id}" data-index="${idx}" class="series-option-item" style="padding:4px 8px; cursor:pointer; font-weight:bold; color:${idx === 0 ? '#fff' : '#1e3a8a'}; background:${idx === 0 ? '#0284c7' : 'transparent'};">
                ${s.name || s.seriesName || s.prefix || "Series"}
              </div>
            `).join("")}
          </div>

          <div style="color:#b91c1c; font-weight:bold; margin-bottom:10px; font-size:11px;">
            ${lastBillNum ? `Last Bill: ${lastBillNum}` : ''}
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button type="button" id="btn-series-ok" style="min-width:60px; padding:3px 12px; font-weight:bold; background:#e2e8f0; border:1px solid #475569; border-radius:2px; cursor:pointer;">OK</button>
            <button type="button" id="btn-series-cancel" style="min-width:60px; padding:3px 12px; font-weight:bold; background:#e2e8f0; border:1px solid #475569; border-radius:2px; cursor:pointer;">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const containerEl = document.createElement("div");
  containerEl.style.cssText = "position:fixed; inset:0; z-index:1000500; pointer-events:auto;";
  containerEl.innerHTML = modalHtml;
  root.appendChild(containerEl);

  const overlayEl = containerEl.querySelector("#select-series-modal");
  const winBox = overlayEl ? overlayEl.firstElementChild : null;
  const headerBar = winBox ? winBox.firstElementChild : null;
  if (winBox && headerBar) makeDraggable(winBox, headerBar);
  if (overlayEl) overlayEl.focus();

  const handleGlobalKeyDown = (e) => {
    if (!document.getElementById("select-series-modal")) {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      updateSelection(selectedIndex + 1, true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateSelection(selectedIndex - 1, true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      confirmSelection();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const close = () => {
    document.removeEventListener("keydown", handleGlobalKeyDown);
    if (containerEl && containerEl.parentNode) {
      containerEl.parentNode.removeChild(containerEl);
    } else {
      containerEl.remove();
    }
    removeAllSelectSeriesModals();
  };

  const items = containerEl.querySelectorAll(".series-option-item");

  function updateSelection(newIndex, scroll = false) {
    if (newIndex < 0 || newIndex >= seriesOptions.length) return;
    selectedIndex = newIndex;
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.style.background = "#0284c7";
        item.style.color = "white";
        if (scroll) {
          item.scrollIntoView({ block: "nearest" });
        }
      } else {
        item.style.background = "transparent";
        item.style.color = "#1e3a8a";
      }
    });
  }

  let isConfirmed = false;

  function confirmSelection() {
    if (isConfirmed) return;
    isConfirmed = true;
    const chosen = seriesOptions[selectedIndex];
    close();
    if (typeof onSelect === "function") {
      onSelect(chosen || null);
    }
  }

  items.forEach((item, idx) => {
    item.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      updateSelection(idx, false);
    });

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      updateSelection(idx, false);
    });

    item.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      updateSelection(idx, false);
      confirmSelection();
    });
  });

  document.addEventListener("keydown", handleGlobalKeyDown);

  const btnOk = containerEl.querySelector("#btn-series-ok");
  if (btnOk) {
    btnOk.addEventListener("mousedown", (e) => e.stopPropagation());
    btnOk.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      confirmSelection();
    });
  }

  const btnCancel = containerEl.querySelector("#btn-series-cancel");
  if (btnCancel) {
    btnCancel.addEventListener("mousedown", (e) => e.stopPropagation());
    btnCancel.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
  }
}
