// Segmented DD/MM/YYYY Date Picker Utility
// Formats dates as DD/MM/YYYY (e.g. 01/04/2026, 15/08/2026)
// Provides smart segmented typing rules:
// - DD: typing 0..3 waits for 2nd digit; typing 4..9 auto-prefixes '0' and jumps to MM
// - MM: typing 0..1 waits for 2nd digit; typing 2..9 auto-prefixes '0' and jumps to YYYY
// - Auto-advances fields and includes dropdown calendar popover

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Format ISO date string YYYY-MM-DD or Date object into DD/MM/YYYY format
 * Example: 2026-04-01 -> "01/04/2026"
 */
export function formatTallyDate(dInput) {
  if (!dInput) return "";
  let year, monthIdx, day;
  if (dInput instanceof Date) {
    if (isNaN(dInput.getTime())) return "";
    year = dInput.getFullYear();
    monthIdx = dInput.getMonth();
    day = dInput.getDate();
  } else {
    const str = String(dInput).trim();
    const isoParts = str.split("-");
    if (isoParts.length === 3 && isoParts[0].length === 4) {
      year = parseInt(isoParts[0], 10);
      monthIdx = parseInt(isoParts[1], 10) - 1;
      day = parseInt(isoParts[2], 10);
    } else {
      const parsed = new Date(str);
      if (isNaN(parsed.getTime())) return str;
      year = parsed.getFullYear();
      monthIdx = parsed.getMonth();
      day = parsed.getDate();
    }
  }

  const dd = String(day).padStart(2, "0");
  const mm = String(monthIdx + 1).padStart(2, "0");
  return `${dd}/${mm}/${year}`;
}

/**
 * Parse various date input strings into YYYY-MM-DD ISO string
 */
export function parseSmartDate(inputStr, fallbackIso = "") {
  if (!inputStr) return fallbackIso;
  const str = String(inputStr).trim();
  if (!str) return fallbackIso;

  // Standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = str.split(/[\/\-\.\s]+/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = -1;
    let year = parseInt(parts[2], 10);

    const mStr = parts[1].toLowerCase();
    const mIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === mStr);
    if (mIdx !== -1) {
      month = mIdx + 1;
    } else {
      const fullMIdx = FULL_MONTH_NAMES.findIndex(m => m.toLowerCase() === mStr);
      if (fullMIdx !== -1) {
        month = fullMIdx + 1;
      } else {
        month = parseInt(parts[1], 10);
      }
    }

    if (year < 100) {
      year += (year < 50 ? 2000 : 1900);
    }

    if (isValidDateParts(year, month, day)) {
      return toIso(year, month, day);
    }
  }

  // Digits only
  if (/^\d{6}$/.test(str)) {
    // DDMMYY
    const d = parseInt(str.substring(0, 2), 10);
    const m = parseInt(str.substring(2, 4), 10);
    let y = parseInt(str.substring(4, 6), 10);
    y += (y < 50 ? 2000 : 1900);
    return isValidDateParts(y, m, d) ? toIso(y, m, d) : fallbackIso;
  }

  if (/^\d{8}$/.test(str)) {
    // DDMMYYYY
    const d = parseInt(str.substring(0, 2), 10);
    const m = parseInt(str.substring(2, 4), 10);
    const y = parseInt(str.substring(4, 8), 10);
    return isValidDateParts(y, m, d) ? toIso(y, m, d) : fallbackIso;
  }

  // Try standard JS Date parse fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  return fallbackIso;
}

function isValidDateParts(y, m, d) {
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const testDate = new Date(y, m - 1, d);
  return testDate.getFullYear() === y && testDate.getMonth() === m - 1 && testDate.getDate() === d;
}

function toIso(y, m, d) {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

// Global active popover tracker
let activePopover = null;

document.addEventListener("click", (e) => {
  if (activePopover && !activePopover.contains(e.target) && !activePopover.triggerEl.contains(e.target)) {
    closeActivePopover();
  }
});

function closeActivePopover() {
  if (activePopover) {
    if (activePopover.parentNode) {
      activePopover.parentNode.removeChild(activePopover);
    }
    activePopover = null;
  }
}

/**
 * Creates HTML template string for a Tally-style DatePicker input control
 */
export function renderTallyDatePickerHtml({ id, name, value, className = "form-control", style = "", width = "135px" }) {
  const isoVal = parseSmartDate(value) || value || "";
  const displayVal = formatTallyDate(isoVal);
  return `
    <div class="tally-date-wrapper" style="display: inline-flex; align-items: center; position: relative; width: ${width}; vertical-align: middle;">
      <input type="text" 
             id="${id}" 
             ${name ? `name="${name}"` : ""} 
             class="${className} tally-date-input" 
             style="width: 100%; padding-right: 20px; text-align: center; font-weight: 600; letter-spacing: 0.5px; ${style}" 
             value="${displayVal}" 
             data-iso-date="${isoVal}" 
             autocomplete="off" 
             placeholder="DD/MM/YYYY" />
      <button type="button" class="tally-date-btn" style="position: absolute; right: 2px; background: transparent; border: none; cursor: pointer; padding: 2px 4px; color: #475569; font-size: 0.75rem; line-height: 1; user-select: none;" title="Open Calendar">▾</button>
    </div>
  `;
}

/**
 * Attaches Segmented DD/MM/YYYY DatePicker behavior to an input element
 */
export function attachTallyDatePicker(inputEl, onChangeCallback) {
  if (!inputEl || inputEl.dataset.tallyAttached) return;
  inputEl.dataset.tallyAttached = "true";

  let wrapper = inputEl.closest(".tally-date-wrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "tally-date-wrapper";
    wrapper.style.cssText = `display: inline-flex; align-items: center; position: relative; width: ${inputEl.style.width || "135px"}; vertical-align: middle;`;
    inputEl.parentNode.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tally-date-btn";
    btn.style.cssText = "position: absolute; right: 2px; background: transparent; border: none; cursor: pointer; padding: 2px 4px; color: #475569; font-size: 0.75rem; line-height: 1; user-select: none;";
    btn.title = "Open Calendar";
    btn.innerHTML = "▾";
    wrapper.appendChild(btn);
  }

  const btn = wrapper.querySelector(".tally-date-btn");

  let internalIso = inputEl.dataset.isoDate || parseSmartDate(inputEl.value) || "2026-04-01";
  inputEl.dataset.isoDate = internalIso;

  // Closure state for date parts & typing
  let parts = { dd: "01", mm: "04", yyyy: "2026" };
  const updatePartsFromIso = (iso) => {
    const p = formatTallyDate(iso).split("/");
    parts = {
      dd: p[0] || "01",
      mm: p[1] || "04",
      yyyy: p[2] || "2026"
    };
  };
  updatePartsFromIso(internalIso);

  let activeSegment = 0; // 0 = DD, 1 = MM, 2 = YYYY
  let segmentTyped = "";

  // Set visible text in input element without breaking property descriptors
  const updateRawDisplay = (formattedVal) => {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (desc && desc.set) {
      desc.set.call(inputEl, formattedVal);
    } else {
      inputEl.setAttribute("value", formattedVal);
    }
  };

  const syncSelection = (segIdx, partialTyped = "") => {
    try {
      if (segIdx === 0) {
        if (partialTyped.length === 1) inputEl.setSelectionRange(1, 2);
        else inputEl.setSelectionRange(0, 2);
      } else if (segIdx === 1) {
        if (partialTyped.length === 1) inputEl.setSelectionRange(4, 5);
        else inputEl.setSelectionRange(3, 5);
      } else {
        inputEl.setSelectionRange(6, 10);
      }
    } catch (e) {}
  };

  const renderAndHighlight = (segIdx, partialTyped = "") => {
    let ddStr = parts.dd;
    let mmStr = parts.mm;
    let yyyyStr = parts.yyyy;

    if (segIdx === 0 && partialTyped.length === 1) {
      ddStr = partialTyped + "_";
    } else if (segIdx === 1 && partialTyped.length === 1) {
      mmStr = partialTyped + "_";
    }

    const formatted = `${ddStr}/${mmStr}/${yyyyStr}`;
    updateRawDisplay(formatted);
    syncSelection(segIdx, partialTyped);
  };

  // Initial display setup
  renderAndHighlight(0);

  // Override .value property so standard getters/setters work with ISO date strings
  Object.defineProperty(inputEl, "value", {
    get() {
      return internalIso;
    },
    set(newVal) {
      const parsed = parseSmartDate(newVal, newVal);
      internalIso = parsed;
      inputEl.dataset.isoDate = parsed;
      updatePartsFromIso(parsed);
      if (document.activeElement !== inputEl) {
        renderAndHighlight(activeSegment);
      }
    },
    configurable: true
  });

  const selectSegment = (segIdx) => {
    activeSegment = segIdx;
    segmentTyped = "";
    renderAndHighlight(segIdx, "");
    setTimeout(() => {
      syncSelection(segIdx, "");
    }, 0);
  };

  inputEl.addEventListener("focus", () => {
    selectSegment(0);
  });

  inputEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const pos = inputEl.selectionStart || 0;
    if (pos <= 2) selectSegment(0);
    else if (pos <= 5) selectSegment(1);
    else selectSegment(2);
  });

  const commitAndNotify = () => {
    let y = parseInt(parts.yyyy, 10);
    let m = parseInt(parts.mm, 10);
    let d = parseInt(parts.dd, 10);

    if (y < 100) y += (y < 50 ? 2000 : 1900);
    if (!isValidDateParts(y, m, d)) {
      y = 2026; m = 4; d = 1;
      parts = { dd: "01", mm: "04", yyyy: "2026" };
    }

    const iso = toIso(y, m, d);
    internalIso = iso;
    inputEl.dataset.isoDate = iso;
    renderAndHighlight(activeSegment);

    if (onChangeCallback) onChangeCallback(iso);
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
  };

  inputEl.addEventListener("keydown", (e) => {
    const key = e.key;

    if (key === "Tab") {
      if (!e.shiftKey && activeSegment < 2) {
        e.preventDefault();
        selectSegment(activeSegment + 1);
        return;
      } else if (e.shiftKey && activeSegment > 0) {
        e.preventDefault();
        selectSegment(activeSegment - 1);
        return;
      }
      return;
    }

    if (key === "Enter") {
      e.preventDefault();
      commitAndNotify();
      closeActivePopover();
      inputEl.blur();
      return;
    }

    if (key === "Escape") {
      closeActivePopover();
      return;
    }

    if (key === "ArrowRight" || key === "/" || key === "-") {
      e.preventDefault();
      if (activeSegment < 2) selectSegment(activeSegment + 1);
      return;
    }

    if (key === "ArrowLeft") {
      e.preventDefault();
      if (activeSegment > 0) selectSegment(activeSegment - 1);
      return;
    }

    if (key === "ArrowUp" || key === "ArrowDown") {
      e.preventDefault();
      let y = parseInt(parts.yyyy, 10);
      let m = parseInt(parts.mm, 10);
      let d = parseInt(parts.dd, 10);
      if (isNaN(y) || isNaN(m) || isNaN(d)) {
        y = 2026; m = 4; d = 1;
      }
      if (y < 100) y += (y < 50 ? 2000 : 1900);

      const dt = new Date(y, m - 1, d);
      const delta = (key === "ArrowUp") ? 1 : -1;

      if (activeSegment === 0) {
        dt.setDate(dt.getDate() + delta);
      } else if (activeSegment === 1) {
        dt.setMonth(dt.getMonth() + delta);
      } else if (activeSegment === 2) {
        dt.setFullYear(dt.getFullYear() + delta);
      }

      parts = {
        dd: String(dt.getDate()).padStart(2, "0"),
        mm: String(dt.getMonth() + 1).padStart(2, "0"),
        yyyy: String(dt.getFullYear())
      };

      segmentTyped = "";
      commitAndNotify();
      return;
    }

    if (key === "Backspace") {
      e.preventDefault();
      if (segmentTyped.length > 0) {
        segmentTyped = "";
        renderAndHighlight(activeSegment);
      } else if (activeSegment > 0) {
        selectSegment(activeSegment - 1);
      }
      return;
    }

    // Digit typing logic
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();

      if (activeSegment === 0) {
        // --- DAY (DD) ---
        if (segmentTyped === "") {
          if (key >= "4") {
            // 4..9 immediately sets '04'..'09' and advances to MM
            parts.dd = "0" + key;
            selectSegment(1);
          } else {
            // 0..3 waits for 2nd digit
            segmentTyped = key;
            renderAndHighlight(0, key);
          }
        } else {
          // 2nd digit typed for Day
          let dayNum = parseInt(segmentTyped + key, 10);
          if (dayNum > 31) dayNum = 31;
          if (dayNum === 0) dayNum = 1;
          parts.dd = String(dayNum).padStart(2, "0");
          selectSegment(1);
        }
      } else if (activeSegment === 1) {
        // --- MONTH (MM) ---
        if (segmentTyped === "") {
          if (key >= "2") {
            // 2..9 immediately sets '02'..'09' and advances to YYYY
            parts.mm = "0" + key;
            selectSegment(2);
          } else {
            // 0..1 waits for 2nd digit
            segmentTyped = key;
            renderAndHighlight(1, key);
          }
        } else {
          // 2nd digit typed for Month
          let mNum = parseInt(segmentTyped + key, 10);
          if (mNum > 12) mNum = 12;
          if (mNum === 0) mNum = 1;
          parts.mm = String(mNum).padStart(2, "0");
          selectSegment(2);
        }
      } else if (activeSegment === 2) {
        // --- YEAR (YYYY) ---
        segmentTyped += key;
        if (segmentTyped.length === 2) {
          let yShort = parseInt(segmentTyped, 10);
          let yFull = yShort + (yShort < 50 ? 2000 : 1900);
          parts.yyyy = String(yFull);
          renderAndHighlight(2);
        } else if (segmentTyped.length >= 4) {
          parts.yyyy = segmentTyped.substring(0, 4);
          commitAndNotify();
          selectSegment(2);
        } else {
          parts.yyyy = segmentTyped.padStart(4, "0");
          renderAndHighlight(2);
        }
      }
    }
  });

  inputEl.addEventListener("blur", () => {
    setTimeout(() => {
      if (!activePopover || (activePopover && !activePopover.contains(document.activeElement))) {
        commitAndNotify();
      }
    }, 150);
  });

  const openCalendar = (e) => {
    e.stopPropagation();
    if (activePopover && activePopover.triggerEl === inputEl) {
      closeActivePopover();
      return;
    }
    closeActivePopover();
    showCalendarPopover(inputEl, internalIso, (selectedIso) => {
      internalIso = selectedIso;
      inputEl.dataset.isoDate = selectedIso;
      updateRawDisplay(formatTallyDate(selectedIso));
      if (onChangeCallback) onChangeCallback(selectedIso);
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  if (btn) btn.addEventListener("click", openCalendar);
}

/**
 * Renders Calendar Dropdown Popover
 */
function showCalendarPopover(inputEl, currentIso, onSelect) {
  let currDate = currentIso ? new Date(currentIso) : new Date();
  if (isNaN(currDate.getTime())) currDate = new Date();

  let viewYear = currDate.getFullYear();
  let viewMonth = currDate.getMonth();

  const popover = document.createElement("div");
  popover.className = "tally-calendar-popover";
  popover.triggerEl = inputEl;
  popover.style.cssText = `
    position: absolute;
    z-index: 99999;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    padding: 10px;
    width: 240px;
    font-family: inherit;
    font-size: 0.82rem;
    color: #1e293b;
    user-select: none;
  `;

  const rect = inputEl.getBoundingClientRect();
  popover.style.top = `${window.scrollY + rect.bottom + 4}px`;
  popover.style.left = `${window.scrollX + rect.left}px`;

  const renderCalendar = () => {
    const monthName = FULL_MONTH_NAMES[viewMonth];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIdx = new Date(viewYear, viewMonth, 1).getDay();

    let html = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-weight: 600;">
        <button type="button" class="cal-prev" style="background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #475569;">&lt;</button>
        <span style="font-size: 0.85rem; color: #0f172a;">${monthName} ${viewYear}</span>
        <button type="button" class="cal-next" style="background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #475569;">&gt;</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: 600; color: #64748b; font-size: 0.72rem; margin-bottom: 4px;">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center;">
    `;

    for (let i = 0; i < firstDayIdx; i++) {
      html += `<div></div>`;
    }

    const todayIso = toIso(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    const selIso = currentIso;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayIso = toIso(viewYear, viewMonth + 1, day);
      const isSelected = dayIso === selIso;
      const isToday = dayIso === todayIso;

      let style = "padding: 4px 0; border-radius: 4px; cursor: pointer; font-size: 0.78rem;";
      if (isSelected) {
        style += " background: #2563eb; color: #ffffff; font-weight: bold;";
      } else if (isToday) {
        style += " background: #eff6ff; color: #1d4ed8; font-weight: bold; border: 1px solid #bfdbfe;";
      } else {
        style += " background: transparent; color: #334155;";
      }

      html += `<div class="cal-day" data-iso="${dayIso}" style="${style}">${day}</div>`;
    }

    html += `</div>`;
    popover.innerHTML = html;

    popover.querySelector(".cal-prev").addEventListener("click", (e) => {
      e.stopPropagation();
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      renderCalendar();
    });

    popover.querySelector(".cal-next").addEventListener("click", (e) => {
      e.stopPropagation();
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      renderCalendar();
    });

    popover.querySelectorAll(".cal-day").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        if (!el.style.background.includes("2563eb")) {
          el.style.background = "#f1f5f9";
        }
      });
      el.addEventListener("mouseleave", () => {
        if (!el.style.background.includes("2563eb") && !el.style.background.includes("eff6ff")) {
          el.style.background = "transparent";
        }
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const selectedIso = el.dataset.iso;
        onSelect(selectedIso);
        closeActivePopover();
      });
    });
  };

  renderCalendar();
  document.body.appendChild(popover);
  activePopover = popover;
}

/**
 * Automatically initializes all inputs with class 'tally-date-input' inside a container
 */
export function initTallyDatePickers(container = document, onChangeCallback) {
  const inputs = container.querySelectorAll(".tally-date-input");
  inputs.forEach((input) => {
    attachTallyDatePicker(input, onChangeCallback);
  });
}
