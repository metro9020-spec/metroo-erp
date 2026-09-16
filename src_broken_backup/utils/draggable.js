// Global Draggable Utility for Desktop ERP Modals and Windows
export function makeDraggable(modalContainer, handleElement) {
  if (!modalContainer || !handleElement) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handleElement.style.cursor = "move";
  handleElement.style.userSelect = "none";

  const onMouseDown = (e) => {
    // Ignore clicks on close buttons or interactive controls inside header
    if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT" || e.target.tagName === "A" || e.target.tagName === "SELECT") {
      return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = modalContainer.getBoundingClientRect();
    
    // Ensure absolute positioning for drag
    modalContainer.style.position = "absolute";
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

    // Boundaries check to keep inside viewport
    const maxLeft = window.innerWidth - modalContainer.offsetWidth;
    const maxTop = window.innerHeight - modalContainer.offsetHeight;

    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft > maxLeft) newLeft = maxLeft;
    if (newTop > maxTop) newTop = maxTop;

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
