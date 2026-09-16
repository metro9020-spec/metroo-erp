import { state } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";

export function showSelectBillSeriesModal(txType, onSelect) {
  const root = document.getElementById("modal-container-root");
  if (!root) return;

  const allSeries = state.getSeriesMaster().filter(s => s.txType === txType);
  const seriesOptions = [
    { id: "__DEFAULT__", name: "<Default>", currentNumber: null },
    ...allSeries
  ];

  // Get last bill number
  let lastBillNum = "";
  if (txType === "Sales") {
    const invs = state.getInvoices();
    if (invs && invs.length > 0) lastBillNum = invs[invs.length - 1].id;
  } else if (txType === "Purchase") {
    const purs = state.getPurchases();
    if (purs && purs.length > 0) lastBillNum = purs[purs.length - 1].refNo || purs[purs.length - 1].id;
  }

  let selectedIndex = 0;

  const modalHtml = `
    <div class="modal-overlay active" id="select-series-modal" tabindex="0" style="display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,0.5); z-index:10000; position:fixed; inset:0; outline:none;">
      <div style="background:#cbd5e1; border:2px solid #5a7b9c; border-radius:4px; width:340px; box-shadow:0 8px 30px rgba(0,0,0,0.35); font-family:Tahoma,sans-serif; font-size:12px; display:flex; flex-direction:column; overflow:hidden;">
        <!-- Header -->
        <div style="background:linear-gradient(180deg,#1e4a8c,#3a6dba); color:white; font-weight:bold; padding:4px 8px; font-size:12px;">
          Select Bill Series
        </div>
        
        <!-- List container -->
        <div style="padding:10px;">
          <div id="series-select-box" style="border:1px solid #94a3b8; background:white; height:200px; overflow-y:auto; margin-bottom:10px;">
            ${seriesOptions.map((s, idx) => `
              <div data-id="${s.id}" data-index="${idx}" class="series-option-item" style="padding:4px 8px; cursor:pointer; font-weight:bold; color:${idx === 0 ? '#fff' : (s.id === '__DEFAULT__' ? '#000' : '#1e3a8a')}; background:${idx === 0 ? '#0284c7' : 'transparent'};">
                ${s.name}
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
  containerEl.innerHTML = modalHtml;
  document.body.appendChild(containerEl);

  const overlayEl = containerEl.querySelector("#select-series-modal");
  const winBox = overlayEl ? overlayEl.firstElementChild : null;
  const headerBar = winBox ? winBox.firstElementChild : null;
  if (winBox && headerBar) makeDraggable(winBox, headerBar);
  overlayEl.focus();

  const close = () => { containerEl.remove(); };

  const items = containerEl.querySelectorAll(".series-option-item");

  function updateSelection(newIndex) {
    if (newIndex < 0 || newIndex >= seriesOptions.length) return;
    selectedIndex = newIndex;
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.style.background = "#0284c7";
        item.style.color = "white";
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.style.background = "transparent";
        const id = item.getAttribute("data-id");
        item.style.color = id === "__DEFAULT__" ? "#000" : "#1e3a8a";
      }
    });
  }

  function confirmSelection() {
    const chosen = seriesOptions[selectedIndex];
    close();
    onSelect(chosen && chosen.id !== "__DEFAULT__" ? chosen : null);
  }

  items.forEach((item, idx) => {
    item.addEventListener("click", () => {
      updateSelection(idx);
    });

    item.addEventListener("dblclick", () => {
      updateSelection(idx);
      confirmSelection();
    });
  });

  overlayEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      updateSelection(selectedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateSelection(selectedIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      confirmSelection();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });

  containerEl.querySelector("#btn-series-ok").addEventListener("click", confirmSelection);
  containerEl.querySelector("#btn-series-cancel").addEventListener("click", close);
}
