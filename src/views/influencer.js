import { state } from "../state.js";
import { formatDate } from "../utils/dateUtils.js";

export function showInfluencerMasterModal() {
  const root = document.getElementById("modal-container-root");
  let influencers = state.getInfluencers();

  const renderModalContent = () => {
    influencers = state.getInfluencers();
    root.innerHTML = `
      <div class="modal-overlay active" id="influencer-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
        <div class="modal-container" style="max-width:950px; width: 95%; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          
          <!-- Header ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px; border-bottom: 1px solid #1d4ed8;">
            <div style="display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-crown"></i> MASTERS - INFLUENCER REGISTRY & LOYALTY MASTER
            </div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="inf-close-btn-header">&times;</button>
          </div>

          <!-- Master form panel -->
          <form id="influencer-entry-form" style="display:grid; grid-template-columns: 1.5fr 1fr 1fr; gap:10px; margin-top:12px; background-color:#f1f5f9; padding:10px; border:1px solid #94a3b8; border-radius:3px;">
            <input type="hidden" id="inf-id-hidden" value="">
            <div>
              <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">INFLUENCER NAME *</label>
              <input type="text" id="inf-name" style="width:100%; border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;" required>
            </div>
            <div>
              <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">MOBILE NUMBER</label>
              <input type="text" id="inf-mobile" style="width:100%; border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;">
            </div>
            <div style="display:flex; align-items:flex-end; gap:6px;">
              <div style="flex:1;">
                <label style="display:block; font-weight:600; font-size:0.75rem; margin-bottom:2px;">ADDRESS</label>
                <input type="text" id="inf-address" style="width:100%; border:1px solid #7a96b2; padding:3px; font-size:0.8rem; background-color:white; color:black;">
              </div>
              <button type="submit" id="btn-inf-save" style="background-color: #1e3b8b; color: white; border: none; padding: 5px 12px; font-size: 0.8rem; font-weight: bold; cursor: pointer; height: 26px;">ADD</button>
            </div>
          </form>

          <!-- Master registry table -->
          <div style="margin-top:12px; border: 1px solid #94a3b8; background-color: white; max-height:280px; overflow-y:auto; border-radius: 2px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
              <thead>
                <tr style="background-color:#cbd5e1; color:#1e3b8b; font-weight:bold; border-bottom:1px solid #94a3b8;">
                  <th style="padding:6px;">CODE</th>
                  <th style="padding:6px;">NAME</th>
                  <th style="padding:6px;">MOBILE NO</th>
                  <th style="padding:6px; text-align:right;">TOTAL SALES</th>
                  <th style="padding:6px; text-align:right;">EARNED PTS</th>
                  <th style="padding:6px; text-align:right;">REDEEMED</th>
                  <th style="padding:6px; text-align:right; color:#1e3b8b;">BALANCE</th>
                  <th style="padding:6px; text-align:center; width:220px;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${influencers.length === 0 ? `
                  <tr><td colspan="8" style="text-align:center; padding:15px; color:#64748b;">NO INFLUENCERS REGISTERED.</td></tr>
                ` : influencers.map(inf => {
                  const loyalty = state.getInfluencerLoyaltySummary(inf.name);
                  return `
                    <tr style="border-bottom:1px solid #cbd5e1;">
                      <td style="padding:6px; font-weight:bold;">${inf.id.toUpperCase()}</td>
                      <td style="padding:6px; font-weight:bold;">${inf.name.toUpperCase()}</td>
                      <td style="padding:6px;">${(inf.mobile || 'N/A').toUpperCase()}</td>
                      <td style="padding:6px; text-align:right;">${loyalty.totalSales.toFixed(2)}</td>
                      <td style="padding:6px; text-align:right; color:#16a34a; font-weight:600;">${loyalty.pointsEarned.toFixed(2)}</td>
                      <td style="padding:6px; text-align:right; color:#dc2626;">${loyalty.pointsRedeemed.toFixed(2)}</td>
                      <td style="padding:6px; text-align:right; font-weight:bold; color:#1e3b8b;">${loyalty.balance.toFixed(2)}</td>
                      <td style="padding:6px; text-align:center; display:flex; justify-content:center; gap:8px;">
                        <button type="button" class="btn-inf-edit" data-id="${inf.id}" style="background:none; border:none; color:#1e3b8b; cursor:pointer; font-weight:bold; font-size:0.75rem;">EDIT</button>
                        <button type="button" class="btn-inf-redeem" data-name="${inf.name}" style="background:none; border:none; color:#16a34a; cursor:pointer; font-weight:bold; font-size:0.75rem;">REDEEM</button>
                        <button type="button" class="btn-inf-ledger" data-name="${inf.name}" style="background:none; border:none; color:#d97706; cursor:pointer; font-weight:bold; font-size:0.75rem;">LEDGER</button>
                        <button type="button" class="btn-inf-delete" data-id="${inf.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:0.75rem;">DEL</button>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:12px;">
            <button type="button" class="btn" id="btn-inf-close" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; font-size:0.8rem; cursor:pointer;">CLOSE</button>
          </div>
        </div>
      </div>
    `;

    const overlay = document.getElementById("influencer-modal-overlay");
    const close = () => {
      overlay.classList.remove("active");
      root.innerHTML = "";
    };

    document.getElementById("inf-close-btn-header").addEventListener("click", close);
    document.getElementById("btn-inf-close").addEventListener("click", close);

    const hiddenIdEl = document.getElementById("inf-id-hidden");
    const nameEl = document.getElementById("inf-name");
    const mobileEl = document.getElementById("inf-mobile");
    const addressEl = document.getElementById("inf-address");
    const saveBtn = document.getElementById("btn-inf-save");

    // Convert input values to uppercase dynamically
    const capitalizeInput = (el) => {
      el.addEventListener("input", () => {
        el.value = el.value.toUpperCase();
      });
    };
    capitalizeInput(nameEl);
    capitalizeInput(mobileEl);
    capitalizeInput(addressEl);

    // Form submit listener (creates or updates influencer)
    document.getElementById("influencer-entry-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        name: nameEl.value.trim().toUpperCase(),
        mobile: mobileEl.value.trim().toUpperCase(),
        address: addressEl.value.trim().toUpperCase()
      };

      const editId = hiddenIdEl.value;
      if (editId) {
        state.updateInfluencer(editId, payload);
        alert("INFLUENCER UPDATED SUCCESSFULLY.");
      } else {
        state.addInfluencer(payload);
        alert("INFLUENCER ADDED SUCCESSFULLY.");
      }

      renderModalContent();
    });

    // Edit and delete actions
    root.querySelectorAll(".btn-inf-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const match = influencers.find(x => x.id === id);
        if (match) {
          hiddenIdEl.value = match.id;
          nameEl.value = match.name;
          mobileEl.value = match.mobile || "";
          addressEl.value = match.address || "";
          saveBtn.innerText = "SAVE";
        }
      });
    });

    root.querySelectorAll(".btn-inf-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this influencer?")) {
          state.deleteInfluencer(id);
          renderModalContent();
        }
      });
    });

    // Redeem action
    root.querySelectorAll(".btn-inf-redeem").forEach(btn => {
      btn.addEventListener("click", () => {
        const influencerName = btn.getAttribute("data-name");
        showRedemptionModal(influencerName);
      });
    });

    // Ledger action
    root.querySelectorAll(".btn-inf-ledger").forEach(btn => {
      btn.addEventListener("click", () => {
        const influencerName = btn.getAttribute("data-name");
        showLedgerModal(influencerName);
      });
    });
  };

  const showRedemptionModal = (influencerName) => {
    const summary = state.getInfluencerLoyaltySummary(influencerName);
    const div = document.createElement("div");
    div.id = "loyalty-redeem-overlay";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2500; display:flex; justify-content:center; align-items:center;";
    div.innerHTML = `
      <div style="background:#cbd5e1; color:#0f172a; padding:15px; border-radius:4px; border:2px solid #5a7b9c; width:90%; max-width:350px; font-family:'Segoe UI', sans-serif;">
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <span>REDEEM POINTS - ${influencerName.toUpperCase()}</span>
          <button type="button" id="redeem-close-btn" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
        </div>
        <div style="margin-top:10px; font-size:0.85rem; font-weight:600;">
          Available Balance: <span style="color:#1e3b8b;">${summary.balance.toFixed(2)} Points</span>
        </div>
        <form id="loyalty-redeem-form" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:2px;">REDEMPTION DATE</label>
            <input type="date" id="red-date" value="${new Date().toISOString().split("T")[0]}" style="width:100%; padding:3px; font-size:0.8rem; background:white; color:black; border:1px solid #7a96b2;" required>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:2px;">POINTS TO REDEEM</label>
            <input type="number" step="0.01" min="0.01" max="${summary.balance}" id="red-points" style="width:100%; padding:3px; font-size:0.8rem; background:white; color:black; border:1px solid #7a96b2;" required>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:2px;">NARRATION/REMARKS</label>
            <input type="text" id="red-narration" placeholder="e.g. Gift Voucher / Bank Transfer" style="width:100%; padding:3px; font-size:0.8rem; background:white; color:black; border:1px solid #7a96b2;">
          </div>
          <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px;">
            <button type="submit" style="background-color: #1e3b8b; color: white; border: none; padding: 4px 12px; font-size: 0.8rem; font-weight: bold; cursor: pointer;">REDEEM</button>
            <button type="button" id="redeem-cancel-btn" style="background:#f1f5f9; border:1px solid #475569; padding:4px 12px; color:black; font-size:0.8rem; cursor:pointer;">CANCEL</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(div);

    const closeRedeem = () => {
      div.remove();
    };

    document.getElementById("redeem-close-btn").addEventListener("click", closeRedeem);
    document.getElementById("redeem-cancel-btn").addEventListener("click", closeRedeem);
    document.getElementById("loyalty-redeem-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const pts = parseFloat(document.getElementById("red-points").value) || 0;
      if (pts > summary.balance) {
        alert("Redemption points cannot exceed the available balance!");
        return;
      }
      state.addInfluencerRedemption({
        influencerName,
        date: document.getElementById("red-date").value,
        points: pts,
        narration: document.getElementById("red-narration").value.trim().toUpperCase()
      });
      alert("POINTS REDEEMED SUCCESSFULLY!");
      closeRedeem();
      renderModalContent();
    });
  };

  const showLedgerModal = (influencerName) => {
    const summary = state.getInfluencerLoyaltySummary(influencerName);
    
    // Build transaction list
    const txs = [];
    summary.invoices.forEach(inv => {
      txs.push({
        date: inv.date,
        ref: inv.voucherNo,
        type: "EARNED (+)",
        details: inv.customerName,
        amount: inv.total,
        points: inv.points,
        timestamp: new Date(inv.date).getTime()
      });
    });
    summary.redemptions.forEach(red => {
      txs.push({
        date: red.date,
        ref: red.id,
        type: "REDEEMED (-)",
        details: red.narration || "REDEMPTION",
        amount: 0,
        points: -red.points,
        timestamp: new Date(red.date).getTime(),
        isRedemption: true
      });
    });

    txs.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalance = 0;
    const ledgerRows = txs.map(tx => {
      runningBalance += tx.points;
      return `
        <tr style="border-bottom:1px solid #cbd5e1; font-size:0.75rem;">
          <td style="padding:5px;">${formatDate(tx.date)}</td>
          <td style="padding:5px; font-weight:bold;">${tx.ref}</td>
          <td style="padding:5px; color:${tx.points > 0 ? '#16a34a' : '#dc2626'}; font-weight:bold;">${tx.type}</td>
          <td style="padding:5px;">${tx.details.toUpperCase()}</td>
          <td style="padding:5px; text-align:right;">${tx.amount > 0 ? tx.amount.toFixed(2) : '-'}</td>
          <td style="padding:5px; text-align:right; font-weight:bold; color:${tx.points > 0 ? '#16a34a' : '#dc2626'};">${tx.points > 0 ? '+' : ''}${tx.points.toFixed(2)}</td>
          <td style="padding:5px; text-align:right; font-weight:bold;">${runningBalance.toFixed(2)}</td>
          <td style="padding:5px; text-align:center;">
            ${tx.isRedemption ? `<button type="button" class="btn-del-redemption" data-red-id="${tx.ref}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:0.7rem;">Delete</button>` : '-'}
          </td>
        </tr>
      `;
    }).join("");

    const div = document.createElement("div");
    div.id = "loyalty-ledger-overlay";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2500; display:flex; justify-content:center; align-items:center;";
    div.innerHTML = `
      <div style="background:#cbd5e1; color:#0f172a; padding:15px; border-radius:4px; border:2px solid #5a7b9c; width:95%; max-width:750px; font-family:'Segoe UI', sans-serif;">
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <span>LOYALTY LEDGER - ${influencerName.toUpperCase()}</span>
          <button type="button" id="ledger-close-btn" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
        </div>
        <div style="margin-top:10px; display:flex; justify-content:space-between; font-size:0.8rem; font-weight:bold; background:#e2e8f0; padding:6px; border-radius:3px;">
          <span>Total Referrals: ${summary.totalSales.toFixed(2)}</span>
          <span>Points Earned: ${summary.pointsEarned.toFixed(2)}</span>
          <span>Points Redeemed: ${summary.pointsRedeemed.toFixed(2)}</span>
          <span style="color:#1e3b8b;">Current Balance: ${summary.balance.toFixed(2)}</span>
        </div>
        <div style="margin-top:10px; border: 1px solid #94a3b8; background-color: white; max-height:300px; overflow-y:auto; border-radius: 2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem; color:black;">
            <thead>
              <tr style="background-color:#cbd5e1; color:#1e3b8b; font-weight:bold; border-bottom:1px solid #94a3b8;">
                <th style="padding:5px;">DATE</th>
                <th style="padding:5px;">REF NO</th>
                <th style="padding:5px;">TYPE</th>
                <th style="padding:5px;">DETAILS</th>
                <th style="padding:5px; text-align:right;">SALES AMT</th>
                <th style="padding:5px; text-align:right;">POINTS</th>
                <th style="padding:5px; text-align:right;">BALANCE</th>
                <th style="padding:5px; text-align:center;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${txs.length === 0 ? `
                <tr><td colspan="8" style="text-align:center; padding:15px; color:#64748b;">NO TRANSACTIONS RECORDED.</td></tr>
              ` : ledgerRows}
            </tbody>
          </table>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <button type="button" id="ledger-close-btn-bottom" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; font-size:0.8rem; cursor:pointer;">CLOSE</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    const closeLedger = () => {
      div.remove();
    };

    document.getElementById("ledger-close-btn").addEventListener("click", closeLedger);
    document.getElementById("ledger-close-btn-bottom").addEventListener("click", closeLedger);

    div.querySelectorAll(".btn-del-redemption").forEach(btn => {
      btn.addEventListener("click", () => {
        const redId = btn.getAttribute("data-red-id");
        if (confirm(`Are you sure you want to delete redemption ${redId}?`)) {
          state.deleteInfluencerRedemption(redId);
          alert("REDEMPTION DELETED SUCCESSFULLY.");
          closeLedger();
          showLedgerModal(influencerName);
          renderModalContent();
        }
      });
    });
  };

  renderModalContent();
}
