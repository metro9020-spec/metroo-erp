// Global Draggable & Window Management Utility for Desktop ERP Modals and Windows

let topZIndex = 2000;

/**
 * Bring a target modal or window layout to the front (top z-index)
 */
export function bringToFront(el) {
  if (!el) return topZIndex;

  const winTarget = el.closest ? (el.closest(".modal-container, .modal-content, #active-window, .modal-overlay") || el) : el;

  // Compute highest z-index across all modal overlays and containers currently visible in DOM
  let maxZ = topZIndex;
  const selectors = ".modal-overlay, .modal-container, .modal-content, #active-window";
  document.querySelectorAll(selectors).forEach((node) => {
    const z = parseInt(window.getComputedStyle(node).zIndex || node.style.zIndex || "0", 10);
    if (!isNaN(z) && z > maxZ && z < 100000) {
      maxZ = z;
    }
  });

  topZIndex = maxZ + 10;

  const overlay = winTarget.closest ? (winTarget.closest(".modal-overlay") || (winTarget.classList && winTarget.classList.contains("modal-overlay") ? winTarget : null)) : null;
  if (overlay) {
    overlay.style.zIndex = String(topZIndex);
    const container = overlay.querySelector(".modal-container, .modal-content, .window-container");
    if (container) {
      container.style.zIndex = String(topZIndex + 1);
    }
  } else if (winTarget.style) {
    winTarget.style.zIndex = String(topZIndex);
  }

  return topZIndex;
}

/**
 * Make a layout window container draggable by a handle element
 */
export function makeDraggable(modalContainer, handleElement) {
  if (!modalContainer || !handleElement) return;
  if (handleElement.dataset.draggableAttached) return;
  handleElement.dataset.draggableAttached = "true";

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handleElement.style.cursor = "move";
  handleElement.style.userSelect = "none";

  const onMouseDown = (e) => {
    // Ignore clicks on interactive controls inside header (buttons, inputs, selects, links)
    const tag = e.target.tagName;
    if (tag === "BUTTON" || tag === "INPUT" || tag === "A" || tag === "SELECT" || e.target.closest("button") || e.target.closest("a") || e.target.closest("input") || e.target.closest("select")) {
      return;
    }

    // Bring to front on selection
    bringToFront(modalContainer);

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = modalContainer.getBoundingClientRect();
    
    // Ensure absolute/fixed positioning for drag movement
    modalContainer.style.position = "fixed";
    modalContainer.style.margin = "0";
    modalContainer.style.left = `${rect.left}px`;
    modalContainer.style.top = `${rect.top}px`;

    initialLeft = rect.left;
    initialTop = rect.top;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    // Viewport boundaries
    const maxLeft = window.innerWidth - modalContainer.offsetWidth;
    const maxTop = window.innerHeight - modalContainer.offsetHeight;

    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft > maxLeft) newLeft = Math.max(0, maxLeft);
    if (newTop > maxTop) newTop = Math.max(0, maxTop);

    modalContainer.style.left = `${newLeft}px`;
    modalContainer.style.top = `${newTop}px`;
  };

  const onMouseUp = () => {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  handleElement.addEventListener("mousedown", onMouseDown);
}

/**
 * Global Automatic Window Manager
 * Listens for mousedown on any open modal/layout window to bring it to front
 * and automatically attaches dragging handlers to headers/ribbon bars.
 * Also uses MutationObserver to bring newly opened or appended modals to top automatically.
 */
export function initGlobalWindowManager() {
  if (window._globalWindowManagerInitialized) return;
  window._globalWindowManagerInitialized = true;

  document.addEventListener("mousedown", (e) => {
    const winContainer = e.target.closest(".modal-container, .modal-content, #active-window, .modal-overlay");
    if (!winContainer) return;

    // 1. Bring layout window to front
    bringToFront(winContainer);

    // 2. Auto-detect header/ribbon element for dragging
    const headerEl = e.target.closest(".window-header, .modal-header") ||
                     (e.target.closest("div[style*='linear-gradient']") ? e.target.closest("div[style*='linear-gradient']") : null);

    if (headerEl && !headerEl.dataset.draggableAttached) {
      const dragTarget = headerEl.closest(".modal-container, .modal-content, #active-window");
      if (dragTarget) {
        makeDraggable(dragTarget, headerEl);
      }
    }
  }, true);

  const observeTarget = document.getElementById("modal-container-root") || document.body;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          if (node.matches && (node.matches(".modal-overlay, .modal-container, #active-window") || node.querySelector(".modal-overlay, .modal-container"))) {
            bringToFront(node);
          }
        }
      });
    });
  });

  observer.observe(observeTarget, { childList: true, subtree: true });
  if (observeTarget !== document.body) {
    observer.observe(document.body, { childList: true });
  }
}
