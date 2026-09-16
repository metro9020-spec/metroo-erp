// Utility function to format any date input into DD/MM/YYYY format
export function formatDate(dStr) {
  if (!dStr) return "";
  if (dStr instanceof Date) {
    if (isNaN(dStr.getTime())) return "";
    const day = String(dStr.getDate()).padStart(2, "0");
    const month = String(dStr.getMonth() + 1).padStart(2, "0");
    const year = dStr.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const str = String(dStr).trim();
  const p = str.split("-");
  if (p.length === 3 && p[0].length === 4) {
    // YYYY-MM-DD -> DD/MM/YYYY
    return `${p[2].padStart(2, "0")}/${p[1].padStart(2, "0")}/${p[0]}`;
  }
  const slashParts = str.split("/");
  if (slashParts.length === 3 && slashParts[2].length === 4) {
    return `${slashParts[0].padStart(2, "0")}/${slashParts[1].padStart(2, "0")}/${slashParts[2]}`;
  }
  const d = new Date(dStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
}

export function formatDateDisplay(dStr) {
  return formatDate(dStr);
}

