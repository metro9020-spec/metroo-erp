import { state } from "../state.js";
import { makeDraggable } from "../utils/draggable.js";
import { formatDate } from "../utils/dateUtils.js";

export function showLoyaltyReportModal() {
  const root = document.getElementById("modal-container-root");
  const programs = state.getLoyaltyPrograms();
  let selectedProgramId = programs.length > 0 ? programs[0].id : "";
  let searchFilter = "";

  const renderModalContent = () => {
    const summary = selectedProgramId ? state.getProgramLoyaltySummary(selectedProgramId) : null;
    const filteredInfluencers = summary 
      ? summary.influencers.filter(inf => inf.influencerName.toLowerCase().includes(searchFilter.toLowerCase()))
      : [];
    
    root.innerHTML = `
      <div class="modal-overlay active" id="loyalty-report-modal-overlay" style="display:flex; justify-content:center; align-items:center; background: rgba(15,23,42,0.3); backdrop-filter: blur(1px); z-index:2000;">
        <div class="modal-container" style="max-width:1050px; width: 95%; background-color:#cbd5e1; color:#0f172a; padding: 15px; border:2px solid #5a7b9c; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          
          <!-- Header ribbon -->
          <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px; border-bottom: 1px solid #1d4ed8;">
            <div style="display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-chart-line"></i> REPORTS - LOYALTY PROGRAM REPORTS
            </div>
            <button type="button" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;" id="loyalty-rep-close-btn-header">&times;</button>
          </div>

          <!-- Selection & Search Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; background:#f1f5f9; padding:10px; border:1px solid #94a3b8; border-radius:3px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-weight:700; font-size:0.8rem; color:#1e3b8b;">SELECT LOYALTY PROGRAM:</label>
              <select id="loyalty-rep-program-select" style="padding:4px 10px; font-size:0.8rem; background:white; color:black; border:1px solid #cbd5e1;">
                <option value="">-- Choose Program --</option>
                ${programs.map(p => `<option value="${p.id}" ${selectedProgramId === p.id ? 'selected' : ''}>${p.name.toUpperCase()} (${formatDate(p.startDate)} to ${formatDate(p.endDate)})</option>`).join("")}
              </select>
            </div>
            
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-weight:700; font-size:0.8rem; color:#1e3b8b;">SEARCH INFLUENCER:</label>
              <input type="text" id="loyalty-rep-search-influencer" placeholder="Search by name..." value="${searchFilter}" style="padding:4px 8px; font-size:0.8rem; background:white; color:black; border:1px solid #cbd5e1; width:220px;">
            </div>
          </div>

          <!-- Influencer Performance Table -->
          <div style="margin-top:12px; border: 1px solid #94a3b8; background-color: white; max-height:280px; overflow-y:auto; border-radius: 2px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.8rem; color:black;">
              <thead>
                <tr style="background-color:#cbd5e1; color:#1e3b8b; font-weight:bold; border-bottom:1px solid #94a3b8;">
                  <th style="padding:8px;">PARTICIPATING INFLUENCER (DOUBLE-CLICK NAME FOR DETAILS)</th>
                  <th style="padding:8px; text-align:right; width:150px;">REFERRED SALES</th>
                  <th style="padding:8px; text-align:right; width:120px;">EARNED POINTS</th>
                  <th style="padding:8px; text-align:right; width:120px;">REDEEMED POINTS</th>
                  <th style="padding:8px; text-align:right; width:120px; color:#1e3b8b;">AVAILABLE BALANCE</th>
                  <th style="padding:8px; text-align:center; width:180px;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${!summary || filteredInfluencers.length === 0 ? `
                  <tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No matching influencers found or no program selected.</td></tr>
                ` : filteredInfluencers.map(inf => `
                  <tr style="border-bottom:1px solid #cbd5e1;">
                    <td style="padding:8px; font-weight:bold; cursor:pointer;" class="influencer-name-cell" data-name="${inf.influencerName}">${inf.influencerName.toUpperCase()}</td>
                    <td style="padding:8px; text-align:right; font-weight:600;">\u20B9${inf.totalSales.toFixed(2)}</td>
                    <td style="padding:8px; text-align:right; color:#16a34a; font-weight:700;">${inf.pointsEarned.toFixed(2)}</td>
                    <td style="padding:8px; text-align:right; color:#dc2626;">${inf.pointsRedeemed.toFixed(2)}</td>
                    <td style="padding:8px; text-align:right; font-weight:bold; color:#1e3b8b;">${inf.balance.toFixed(2)}</td>
                    <td style="padding:8px; text-align:center; display:flex; justify-content:center; gap:8px;">
                      <button type="button" class="btn-prog-rep-redeem" data-name="${inf.influencerName}" style="background:none; border:none; color:#16a34a; cursor:pointer; font-weight:bold; font-size:0.75rem;">REDEEM</button>
                      <button type="button" class="btn-prog-rep-ledger" data-name="${inf.influencerName}" style="background:none; border:none; color:#d97706; cursor:pointer; font-weight:bold; font-size:0.75rem;">LEDGER</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <!-- Summary Metrics at the bottom -->
          ${summary ? `
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:bold; background:#e2e8f0; padding:8px 12px; border-radius:3px; margin-top:12px; border: 1px solid #94a3b8; color:black;">
              <span>Total Referred Sales: <span style="color:#1e3b8b;">\u20B9${summary.totalSales.toFixed(2)}</span></span>
              <span>Total Earned: <span style="color:#16a34a;">${summary.pointsEarned.toFixed(2)} Pts</span></span>
              <span>Total Redeemed: <span style="color:#dc2626;">${summary.pointsRedeemed.toFixed(2)} Pts</span></span>
              <span>Current Balance: <span style="color:#2563eb;">${summary.balance.toFixed(2)} Pts</span></span>
            </div>
          ` : ''}

          <div style="display:flex; justify-content:flex-end; margin-top:12px;">
            <button type="button" class="btn" id="btn-loyalty-rep-close" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; font-size:0.8rem; cursor:pointer;">CLOSE</button>
          </div>
        </div>
      </div>
    `;

    const overlay = document.getElementById("loyalty-report-modal-overlay");
    const close = () => {
      overlay.classList.remove("active");
      root.innerHTML = "";
    };

    document.getElementById("loyalty-rep-close-btn-header").addEventListener("click", close);
    document.getElementById("btn-loyalty-rep-close").addEventListener("click", close);

    const progSelect = document.getElementById("loyalty-rep-program-select");
    progSelect.addEventListener("change", (e) => {
      selectedProgramId = e.target.value;
      renderModalContent();
    });

    // Make main modal draggable
    const repContainer = overlay.querySelector(".modal-container");
    const repHeader = overlay.querySelector("div[style*='linear-gradient']");
    makeDraggable(repContainer, repHeader);

    // Handle search input focus and typing
    const searchInput = document.getElementById("loyalty-rep-search-influencer");
    if (searchInput) {
      searchInput.focus();
      searchInput.setSelectionRange(searchFilter.length, searchFilter.length);
      searchInput.addEventListener("input", (e) => {
        searchFilter = e.target.value;
        renderModalContent();
      });
    }

    if (summary) {
      // Bind redeem points
      root.querySelectorAll(".btn-prog-rep-redeem").forEach(btn => {
        btn.addEventListener("click", () => {
          const influencerName = btn.getAttribute("data-name");
          showProgramRedeemModal(influencerName);
        });
      });

      // Bind ledger modal
      root.querySelectorAll(".btn-prog-rep-ledger").forEach(btn => {
        btn.addEventListener("click", () => {
          const influencerName = btn.getAttribute("data-name");
          showProgramLedgerModal(influencerName);
        });
      });

      // Bind double click for item-wise report modal
      root.querySelectorAll(".influencer-name-cell").forEach(cell => {
        cell.addEventListener("dblclick", () => {
          const influencerName = cell.getAttribute("data-name");
          showItemWiseReferralReport(influencerName);
        });
      });
    }
  };

  const showProgramRedeemModal = (influencerName) => {
    const summary = state.getProgramLoyaltySummary(selectedProgramId);
    const influencerPerf = summary.influencers.find(x => x.influencerName === influencerName);
    const balance = influencerPerf ? influencerPerf.balance : 0;

    const div = document.createElement("div");
    div.id = "program-redeem-overlay";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2500; display:flex; justify-content:center; align-items:center;";
    div.innerHTML = `
      <div style="background:#cbd5e1; color:#0f172a; padding:15px; border-radius:4px; border:2px solid #5a7b9c; width:90%; max-width:360px; font-family:'Segoe UI', sans-serif;">
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <span>REDEEM FOR ${summary.programName.toUpperCase()}</span>
          <button type="button" id="prog-redeem-close-btn" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
        </div>
        <div style="margin-top:10px; font-size:0.8rem; font-weight:600; background:#e2e8f0; padding:6px; border-radius:2px;">
          Influencer: <b>${influencerName.toUpperCase()}</b><br>
          Available Balance: <span style="color:#1e3b8b;">${balance.toFixed(2)} Points</span>
        </div>
        <form id="prog-redeem-form" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:2px;">REDEMPTION DATE</label>
            <input type="date" id="prog-red-date" value="${new Date().toISOString().split("T")[0]}" style="width:100%; padding:3px; font-size:0.8rem; background:white; color:black; border:1px solid #7a96b2;" required>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:2px;">POINTS TO REDEEM</label>
            <input type="number" step="0.01" min="0.01" max="${balance}" id="prog-red-points" style="width:100%; padding:3px; font-size:0.8rem; background:white; color:black; border:1px solid #7a96b2;" required>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:2px;">NARRATION/REMARKS</label>
            <input type="text" id="prog-red-narration" placeholder="e.g. Festival Gift" style="width:100%; padding:3px; font-size:0.8rem; background:white; color:black; border:1px solid #7a96b2;">
          </div>
          <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px;">
            <button type="submit" style="background-color: #1e3b8b; color: white; border: none; padding: 4px 12px; font-size: 0.8rem; font-weight: bold; cursor: pointer;">REDEEM</button>
            <button type="button" id="prog-redeem-cancel-btn" style="background:#f1f5f9; border:1px solid #475569; padding:4px 12px; color:black; font-size:0.8rem; cursor:pointer;">CANCEL</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(div);

    const closeRedeem = () => div.remove();

    document.getElementById("prog-redeem-close-btn").addEventListener("click", closeRedeem);
    document.getElementById("prog-redeem-cancel-btn").addEventListener("click", closeRedeem);
    
    document.getElementById("prog-redeem-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const pts = parseFloat(document.getElementById("prog-red-points").value) || 0;
      if (pts > balance) {
        alert("Redemption points cannot exceed the available balance!");
        return;
      }
      state.addInfluencerRedemption({
        influencerName,
        programId: selectedProgramId,
        date: document.getElementById("prog-red-date").value,
        points: pts,
        narration: document.getElementById("prog-red-narration").value.trim().toUpperCase()
      });
      alert("POINTS REDEEMED SUCCESSFULLY FOR PROGRAM!");
      closeRedeem();
      renderModalContent();
    });
  };

  const showProgramLedgerModal = (influencerName) => {
    const summary = state.getProgramLoyaltySummary(selectedProgramId);
    
    // Filter transactions to matching influencer
    const txs = [];
    summary.invoices.filter(i => i.influencer === influencerName).forEach(inv => {
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

    summary.redemptions.filter(r => r.influencerName === influencerName).forEach(red => {
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
            ${tx.isRedemption ? `<button type="button" class="btn-prog-del-redemption" data-red-id="${tx.ref}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:0.7rem;">Delete</button>` : '-'}
          </td>
        </tr>
      `;
    }).join("");

    const div = document.createElement("div");
    div.id = "program-ledger-overlay";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2500; display:flex; justify-content:center; align-items:center;";
    div.innerHTML = `
      <div style="background:#cbd5e1; color:#0f172a; padding:15px; border-radius:4px; border:2px solid #5a7b9c; width:95%; max-width:750px; font-family:'Segoe UI', sans-serif;">
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <span>LEDGER: ${influencerName.toUpperCase()} [${summary.programName.toUpperCase()}]</span>
          <button type="button" id="prog-ledger-close-btn" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
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
                <tr><td colspan="8" style="text-align:center; padding:15px; color:#64748b;">NO PROGRAM TRANSACTIONS RECORDED.</td></tr>
              ` : ledgerRows}
            </tbody>
          </table>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <button type="button" id="prog-ledger-close-btn-bottom" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; font-size:0.8rem; cursor:pointer;">CLOSE</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    const closeLedger = () => div.remove();

    document.getElementById("prog-ledger-close-btn").addEventListener("click", closeLedger);
    document.getElementById("prog-ledger-close-btn-bottom").addEventListener("click", closeLedger);

    div.querySelectorAll(".btn-prog-del-redemption").forEach(btn => {
      btn.addEventListener("click", () => {
        const redId = btn.getAttribute("data-red-id");
        if (confirm(`Are you sure you want to delete redemption ${redId}?`)) {
          state.deleteInfluencerRedemption(redId);
          alert("REDEMPTION DELETED.");
          closeLedger();
          showProgramLedgerModal(influencerName);
          renderModalContent();
        }
      });
    });
  };

  const showItemWiseReferralReport = (influencerName) => {
    const summary = state.getProgramLoyaltySummary(selectedProgramId);
    
    // Filter invoices referred by this influencer in the program range
    const activeInvoices = (state.invoices || []).filter(i => {
      if (i.isCancelled) return false;
      if (i.influencer !== influencerName) return false;
      
      const program = state.getLoyaltyPrograms().find(p => p.id === selectedProgramId);
      if (!program) return false;
      const start = new Date(program.startDate).getTime();
      const end = new Date(program.endDate).getTime();
      const dateMs = new Date(i.date).getTime();
      
      return dateMs >= start && dateMs <= end;
    });

    const program = state.getLoyaltyPrograms().find(p => p.id === selectedProgramId);
    const programProductsList = program ? (program.products || []) : [];

    const rows = [];
    activeInvoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const mat = state.getMaterials().find(m => m.id === item.materialId);
          if (!mat) return;
          const matName = mat.name.toUpperCase();
          const matId = mat.id;
          const qty = parseFloat(item.quantity) || 0;

          let matchedRule = programProductsList.find(p => {
            if (p.productName) {
              return p.productName === matName && p.materialId === matId;
            } else {
              return p.materialId === matId;
            }
          });
          if (!matchedRule) {
            matchedRule = programProductsList.find(p => {
              if (p.productName) {
                return p.productName === matName && (p.materialId === "ALL" || p.materialId === "all");
              } else {
                return p.materialId === "ALL" || p.materialId === "all";
              }
            });
          }
          if (!matchedRule) {
            matchedRule = programProductsList.find(p => p.productName === "ALL");
          }

          if (matchedRule) {
            const pointsVal = parseFloat(matchedRule.points) || 0;
            rows.push({
              date: inv.date,
              billNo: inv.voucherNo,
              productName: mat.name,
              productModel: mat.code,
              qty: qty,
              points: qty * pointsVal
            });
          }
        });
      }
    });

    // Sort by date oldest first
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);
    const totalPoints = rows.reduce((sum, r) => sum + r.points, 0);

    const div = document.createElement("div");
    div.id = "item-wise-referral-overlay";
    div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2500; display:flex; justify-content:center; align-items:center;";
    div.innerHTML = `
      <div style="background:#cbd5e1; color:#0f172a; padding:15px; border-radius:4px; border:2px solid #5a7b9c; width:95%; max-width:800px; font-family:'Segoe UI', sans-serif;">
        <div style="background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%); color:white; padding:6px 12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; border-radius: 2px;">
          <span>ITEM-WISE REFERRAL REPORT - ${influencerName.toUpperCase()} [${summary.programName.toUpperCase()}]</span>
          <button type="button" id="item-wise-close-btn" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
        </div>
        
        <div style="margin-top:10px; border: 1px solid #94a3b8; background-color: white; max-height:320px; overflow-y:auto; border-radius: 2px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem; color:black;">
            <thead>
              <tr style="background-color:#cbd5e1; color:#1e3b8b; font-weight:bold; border-bottom:1px solid #94a3b8;">
                <th style="padding:6px;">DATE</th>
                <th style="padding:6px;">BILL NO</th>
                <th style="padding:6px;">PRODUCT NAME</th>
                <th style="padding:6px;">PRODUCT MODEL</th>
                <th style="padding:6px; text-align:right; width:80px;">QTY</th>
                <th style="padding:6px; text-align:right; width:100px;">POINTS</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length === 0 ? `
                <tr class="item-report-row"><td colspan="6" style="text-align:center; padding:15px; color:#64748b;">NO QUALIFYING SALES REFERRED IN THIS PERIOD.</td></tr>
              ` : rows.map(r => `
                <tr class="item-report-row" data-bill-no="${r.billNo}" style="border-bottom:1px solid #cbd5e1; cursor:pointer;" title="Double click to open invoice">
                  <td style="padding:6px;">${formatDate(r.date)}</td>
                  <td style="padding:6px; font-weight:bold; color:#1e3b8b; text-decoration:underline;">${r.billNo}</td>
                  <td style="padding:6px;">${r.productName.toUpperCase()}</td>
                  <td style="padding:6px; font-weight:500;">${r.productModel.toUpperCase()}</td>
                  <td style="padding:6px; text-align:right; font-weight:600;">${r.qty}</td>
                  <td style="padding:6px; text-align:right; font-weight:700; color:#16a34a;">${r.points.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
            ${rows.length > 0 ? `
              <tfoot>
                <tr style="background-color:#f1f5f9; font-weight:bold; border-top:2px solid #94a3b8; color:#1e3b8b;">
                  <td colspan="4" style="padding:6px; text-align:right;">TOTAL:</td>
                  <td style="padding:6px; text-align:right; font-weight:bold;">${totalQty}</td>
                  <td style="padding:6px; text-align:right; font-weight:bold; color:#16a34a;">${totalPoints.toFixed(2)}</td>
                </tr>
              </tfoot>
            ` : ""}
          </table>
        </div>
        
        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <button type="button" id="btn-item-wise-print" style="background:#1e3b8b; color:white; border:none; padding:4px 14px; font-size:0.8rem; font-weight:bold; cursor:pointer; border-radius:3px; margin-right:6px;">PRINT REPORT</button>
          <button type="button" id="item-wise-close-btn-bottom" style="background:#f1f5f9; border:1px solid #475569; padding:4px 14px; color:black; font-size:0.8rem; cursor:pointer;">CLOSE</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    const closeItemWise = () => div.remove();

    document.getElementById("item-wise-close-btn").addEventListener("click", closeItemWise);
    document.getElementById("item-wise-close-btn-bottom").addEventListener("click", closeItemWise);

    // Make sub-modal draggable
    const itemContainer = div.querySelector(".modal-container");
    const itemHeader = div.querySelector("div[style*='linear-gradient']");
    makeDraggable(itemContainer, itemHeader);

    // Double-click row handler to open specific sales invoice
    div.querySelectorAll(".item-report-row").forEach(tr => {
      tr.addEventListener("dblclick", () => {
        const billNo = tr.getAttribute("data-bill-no");
        if (!billNo) return;
        const matchedInvoice = state.getInvoices().find(i => i.voucherNo === billNo || i.id === billNo);
        if (matchedInvoice) {
          // Close detailed report first
          closeItemWise();
          // Load invoice builder
          import("./transactions.js").then(m => {
            m.showInvoiceBuilderModal(null, null, null, () => {
              renderModalContent();
            }, matchedInvoice);
          });
        } else {
          alert("Sales bill not found in records!");
        }
      });
    });

    // Print Report Handler
    document.getElementById("btn-item-wise-print").addEventListener("click", () => {
      const activeCompanyId = state.getActiveCompanyId();
      const activeCompany = state.getRegisteredCompanies().find(c => c.id === activeCompanyId);
      const printWindow = window.open("", "_blank");
      
      printWindow.document.write(`
        <html>
        <head>
          <title>Print Referral Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; color: #1e3a8a; margin-bottom: 5px; }
            h4 { text-align: center; margin-top: 0; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #cbd5e1; color: #1e3a8a; font-weight: bold; }
            tfoot td { font-weight: bold; background-color: #f1f5f9; color: #1e3b8b; }
            .footer-sig { margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>${activeCompany ? activeCompany.name.toUpperCase() : 'GST ERP SYSTEM'}</h2>
          <h4 style="text-align:center;">ITEM-WISE REFERRAL REPORT - ${influencerName.toUpperCase()}</h4>
          <p style="text-align:center; font-size:12px;">Program: <b>${summary.programName.toUpperCase()}</b> | Period: ${formatDate(program.startDate)} to ${formatDate(program.endDate)}</p>
          
          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>BILL NO</th>
                <th>PRODUCT NAME</th>
                <th>PRODUCT MODEL</th>
                <th style="text-align:right; width:80px;">QTY</th>
                <th style="text-align:right; width:100px;">POINTS</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${formatDate(r.date)}</td>
                  <td>${r.billNo}</td>
                  <td>${r.productName.toUpperCase()}</td>
                  <td>${r.productModel.toUpperCase()}</td>
                  <td style="text-align:right;">${r.qty}</td>
                  <td style="text-align:right; color:#16a34a; font-weight:bold;">${r.points.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align:right;">TOTAL:</td>
                <td style="text-align:right;">${totalQty}</td>
                <td style="text-align:right; color:#16a34a;">${totalPoints.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div class="footer-sig">
            <div>Prepared By: ___________________</div>
            <div>Authorized Signatory: ___________________</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    });
  };

  renderModalContent();
}
