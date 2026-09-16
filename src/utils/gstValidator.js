export function setupGstinInput(inputEl, validateBtnEl, warningEl) {
  if (!inputEl) return;

  // Set standard HTML attribute for hard limit at 15 characters
  inputEl.maxLength = 15;

  const updateValidationState = () => {
    let val = inputEl.value.toUpperCase();
    if (val.length > 15) {
      val = val.slice(0, 15);
    }
    inputEl.value = val;

    if (warningEl) {
      if (val.length > 0 && val.length < 15) {
        warningEl.textContent = `Warning: GSTIN must be 15 digits (Current: ${val.length})`;
        warningEl.style.display = "block";
      } else {
        warningEl.textContent = "";
        warningEl.style.display = "none";
      }
    }
  };

  inputEl.addEventListener("input", updateValidationState);
  inputEl.addEventListener("blur", updateValidationState);
  updateValidationState();

  if (validateBtnEl) {
    validateBtnEl.addEventListener("click", async (e) => {
      e.preventDefault();
      const val = inputEl.value.trim().toUpperCase();
      if (val.length > 0 && val.length < 15) {
        alert(`GSTIN is incomplete (${val.length} digits). GSTIN should be 15 digits.`);
      }

      if (val) {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(val);
          } else {
            // Fallback for older browser contexts
            inputEl.select();
            document.execCommand("copy");
          }
        } catch (err) {
          console.warn("Failed to auto-copy GSTIN:", err);
        }
      }

      window.open("https://services.gst.gov.in/services/searchtp", "_blank");
    });
  }
}

export function validateGstinOnSubmit(gstinValue) {
  const trimmed = (gstinValue || "").trim();
  if (trimmed.length > 0 && trimmed.length < 15) {
    return {
      valid: false,
      message: `GSTIN must be exactly 15 digits (Entered: ${trimmed.length} digits).`
    };
  }
  return { valid: true };
}

export function getValidGstRate(item, mat = null, defaultRate = 18) {
  if (item && item.gstPercent !== undefined && item.gstPercent !== null && item.gstPercent !== "") {
    const p = parseFloat(item.gstPercent);
    if (!isNaN(p)) return p;
  }
  if (item && item.taxPercent !== undefined && item.taxPercent !== null && item.taxPercent !== "") {
    const p = parseFloat(item.taxPercent);
    if (!isNaN(p)) return p;
  }
  if (mat) {
    if (mat.igst !== undefined && mat.igst !== null && mat.igst !== "") {
      const p = parseFloat(mat.igst);
      if (!isNaN(p)) return p;
    }
    if (mat.taxRate !== undefined && mat.taxRate !== null && mat.taxRate !== "") {
      const p = parseFloat(mat.taxRate);
      if (!isNaN(p)) return p;
    }
    if (mat.taxPercent !== undefined && mat.taxPercent !== null && mat.taxPercent !== "") {
      const p = parseFloat(mat.taxPercent);
      if (!isNaN(p)) return p;
    }
  }
  return defaultRate;
}

