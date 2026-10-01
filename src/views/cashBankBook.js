import { state } from "../state.js";
import { renderPrintHeaderHtml, formatDateDisplay } from "./reports.js";
import { renderTallyDatePickerHtml, initTallyDatePickers, getActiveFyBounds } from "../utils/datePicker.js";

// Helper function to get month intervals in a date range
function getMonthsInPeriod(fromDateStr, toDateStr) {
  const months = [];
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (!fromDateStr || !toDateStr) return months;
  const sParts = fromDateStr.split("-").map(Number);
  const eParts = toDateStr.split("-").map(Number);
  if (sParts.length < 3 || eParts.length < 3) return months;

  let curY = sParts[0];
  let curM = sParts[1];
  const ey = eParts[0];
  const em = eParts[1];

  while (curY < ey || (curY === ey && curM <= em)) {
    const daysInM = new Date(curY, curM, 0).getDate();
    
    let startDay = (curY === sParts[0] && curM === sParts[1]) ? sParts[2] : 1;
    let endDay = (curY === ey && curM === em) ? eParts[2] : daysInM;

    const startIso = `${curY}-${String(curM).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    const endIso = `${curY}-${String(curM).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    const name = `${MONTH_NAMES[curM - 1]} ${curY}`;

    months.push({
      year: curY,
      month: curM,
      name,
      startIso,
      endIso
    });

    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  return months;
}

// Helper function to get days in a date period (ISO YYYY-MM-DD)
function getDaysInPeriod(fromDateStr, toDateStr) {
  const days = [];
  if (!fromDateStr || !toDateStr) return days;
  let cur = new Date(fromDateStr + "T00:00:00");
  const end = new Date(toDateStr + "T00:00:00");
  if (isNaN(cur.getTime()) || isNaN(end.getTime())) return days;

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Build fast matching lookup Set for target account ID ($O(1)$ set lookup)
function buildMatchingSet(accId, ledgers) {
  const matchSet = new Set();
  if (!accId) return matchSet;
  const strAcc = String(accId).trim();
  matchSet.add(strAcc);

  const upperAcc = strAcc.toUpperCase();
  const isCashGroup = upperAcc === "1010" || upperAcc === "CASH-IN-HAND" || upperAcc === "CASH BOOK";
  const isBankGroup = upperAcc === "1020" || upperAcc === "BANK ACCOUNTS" || upperAcc === "BANK BOOK";

  if (isCashGroup) {
    matchSet.add("1010");
    matchSet.add("L0001");
    (ledgers || []).forEach(l => {
      if ((l.groupName || "").toUpperCase() === "CASH-IN-HAND" || (l.name || "").toUpperCase() === "CASH") {
        if (l.code) matchSet.add(String(l.code));
        if (l.id) matchSet.add(String(l.id));
        if (l.name) matchSet.add(String(l.name).toUpperCase());
      }
    });
  } else if (isBankGroup) {
    matchSet.add("1020");
    (ledgers || []).forEach(l => {
      if ((l.groupName || "").toUpperCase() === "BANK ACCOUNTS") {
        if (l.code) matchSet.add(String(l.code));
        if (l.id) matchSet.add(String(l.id));
        if (l.name) matchSet.add(String(l.name).toUpperCase());
      }
    });
  } else {
    const ledger = (ledgers || []).find(l => 
      String(l.code) === strAcc || 
      String(l.id) === strAcc || 
      String(l.name).toUpperCase() === upperAcc
    );
    if (ledger) {
      if (ledger.code) matchSet.add(String(ledger.code));
      if (ledger.name) matchSet.add(String(ledger.name).toUpperCase());
      if (ledger.id) matchSet.add(String(ledger.id));
    }
  }

  return matchSet;
}

// Compute balance summary for a single ledger code in a date range (Optimized Single-Pass)
function getLedgerPeriodSummary(accId, fromDate, toDate) {
  const transactions = state.getTransactions() || [];
  const ledgers = state.getLedgers() || [];
  const matchSet = buildMatchingSet(accId, ledgers);

  let openingDr = 0;
  let openingCr = 0;

  const ledger = ledgers.find(l => l.code === accId);
  if (ledger) {
    const op = parseFloat(ledger.openingBalance) || 0;
    if (ledger.balanceType === "Debit") {
      openingDr += op;
    } else {
      openingCr += op;
    }
  }

  let debit = 0;
  let credit = 0;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx || !tx.date) continue;
    const isBefore = fromDate && tx.date < fromDate;
    const isInside = (!fromDate || tx.date >= fromDate) && (!toDate || tx.date <= toDate);
    if (!isBefore && !isInside) continue;

    const entries = tx.entries;
    if (!entries) continue;
    for (let j = 0; j < entries.length; j++) {
      const e = entries[j];
      if (e.accountId && matchSet.has(String(e.accountId))) {
        const d = parseFloat(e.debit) || 0;
        const c = parseFloat(e.credit) || 0;
        if (isBefore) {
          openingDr += d;
          openingCr += c;
        } else {
          debit += d;
          credit += c;
        }
      }
    }
  }

  let openingBalance = 0;
  let openingBalanceSuffix = "Dr";
  if (openingDr >= openingCr) {
    openingBalance = openingDr - openingCr;
    openingBalanceSuffix = "Dr";
  } else {
    openingBalance = openingCr - openingDr;
    openingBalanceSuffix = "Cr";
  }

  const finalDr = openingDr + debit;
  const finalCr = openingCr + credit;
  let closingBalance = 0;
  let closingBalanceSuffix = "Dr";
  if (finalDr >= finalCr) {
    closingBalance = finalDr - finalCr;
    closingBalanceSuffix = "Dr";
  } else {
    closingBalance = finalCr - finalDr;
    closingBalanceSuffix = "Cr";
  }

  return {
    openingBalance,
    openingBalanceSuffix,
    openingDr,
    openingCr,
    debit,
    credit,
    closingBalance,
    closingBalanceSuffix,
    finalDr,
    finalCr
  };
}

// Single-Pass Monthly Summaries calculation (Fast & smooth)
function getLedgerMonthlySummaries(accId, fromDate, toDate) {
  const transactions = state.getTransactions() || [];
  const ledgers = state.getLedgers() || [];
  const monthIntervals = getMonthsInPeriod(fromDate, toDate);
  const matchSet = buildMatchingSet(accId, ledgers);

  const ledger = ledgers.find(l => l.code === accId);
  let netOpDr = 0;
  let netOpCr = 0;
  if (ledger) {
    const op = parseFloat(ledger.openingBalance) || 0;
    if (ledger.balanceType === "Debit") {
      netOpDr += op;
    } else {
      netOpCr += op;
    }
  }

  const monthBuckets = {};
  for (let i = 0; i < monthIntervals.length; i++) {
    const m = monthIntervals[i];
    const key = `${m.year}-${String(m.month).padStart(2, '0')}`;
    monthBuckets[key] = { debit: 0, credit: 0 };
  }

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx || !tx.date) continue;
    const txDate = tx.date;
    const entries = tx.entries;
    if (!entries) continue;

    for (let j = 0; j < entries.length; j++) {
      const e = entries[j];
      if (e.accountId && matchSet.has(String(e.accountId))) {
        const d = parseFloat(e.debit) || 0;
        const c = parseFloat(e.credit) || 0;

        if (fromDate && txDate < fromDate) {
          netOpDr += d;
          netOpCr += c;
        } else if ((!fromDate || txDate >= fromDate) && (!toDate || txDate <= toDate)) {
          const mKey = txDate.substring(0, 7);
          const bucket = monthBuckets[mKey];
          if (bucket) {
            bucket.debit += d;
            bucket.credit += c;
          }
        }
      }
    }
  }

  let currentNetDr = netOpDr;
  let currentNetCr = netOpCr;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;

  const resultMonths = monthIntervals.map(m => {
    const mKey = `${m.year}-${String(m.month).padStart(2, '0')}`;
    const bucket = monthBuckets[mKey] || { debit: 0, credit: 0 };

    let opBal = 0;
    let opSuffix = "Dr";
    if (currentNetDr >= currentNetCr) {
      opBal = currentNetDr - currentNetCr;
      opSuffix = "Dr";
    } else {
      opBal = currentNetCr - currentNetDr;
      opSuffix = "Cr";
    }

    const debit = bucket.debit;
    const credit = bucket.credit;
    totalPeriodDebit += debit;
    totalPeriodCredit += credit;

    currentNetDr += debit;
    currentNetCr += credit;

    let clBal = 0;
    let clSuffix = "Dr";
    if (currentNetDr >= currentNetCr) {
      clBal = currentNetDr - currentNetCr;
      clSuffix = "Dr";
    } else {
      clBal = currentNetCr - currentNetDr;
      clSuffix = "Cr";
    }

    return {
      monthObj: m,
      openingBalance: opBal,
      openingBalanceSuffix: opSuffix,
      debit,
      credit,
      closingBalance: clBal,
      closingBalanceSuffix: clSuffix
    };
  });

  let overallOpBal = 0;
  let overallOpSuffix = "Dr";
  if (netOpDr >= netOpCr) {
    overallOpBal = netOpDr - netOpCr;
    overallOpSuffix = "Dr";
  } else {
    overallOpBal = netOpCr - netOpDr;
    overallOpSuffix = "Cr";
  }

  let overallClBal = 0;
  let overallClSuffix = "Dr";
  if (currentNetDr >= currentNetCr) {
    overallClBal = currentNetDr - currentNetCr;
    overallClSuffix = "Dr";
  } else {
    overallClBal = currentNetCr - currentNetDr;
    overallClSuffix = "Cr";
  }

  const overallSummary = {
    openingBalance: overallOpBal,
    openingBalanceSuffix: overallOpSuffix,
    debit: totalPeriodDebit,
    credit: totalPeriodCredit,
    closingBalance: overallClBal,
    closingBalanceSuffix: overallClSuffix
  };

  return { months: resultMonths, overallSummary };
}

// Single-Pass Daily Summaries calculation (Fast & smooth)
function getLedgerDailySummaries(accId, monthObj) {
  const transactions = state.getTransactions() || [];
  const ledgers = state.getLedgers() || [];
  const dayIsoList = getDaysInPeriod(monthObj.startIso, monthObj.endIso);
  const matchSet = buildMatchingSet(accId, ledgers);

  const ledger = ledgers.find(l => l.code === accId);
  let netOpDr = 0;
  let netOpCr = 0;
  if (ledger) {
    const op = parseFloat(ledger.openingBalance) || 0;
    if (ledger.balanceType === "Debit") {
      netOpDr += op;
    } else {
      netOpCr += op;
    }
  }

  const dayBuckets = {};
  for (let i = 0; i < dayIsoList.length; i++) {
    dayBuckets[dayIsoList[i]] = { debit: 0, credit: 0 };
  }

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx || !tx.date) continue;
    const txDate = tx.date;
    const entries = tx.entries;
    if (!entries) continue;

    for (let j = 0; j < entries.length; j++) {
      const e = entries[j];
      if (e.accountId && matchSet.has(String(e.accountId))) {
        const d = parseFloat(e.debit) || 0;
        const c = parseFloat(e.credit) || 0;

        if (txDate < monthObj.startIso) {
          netOpDr += d;
          netOpCr += c;
        } else if (txDate >= monthObj.startIso && txDate <= monthObj.endIso) {
          const bucket = dayBuckets[txDate];
          if (bucket) {
            bucket.debit += d;
            bucket.credit += c;
          }
        }
      }
    }
  }

  let currentNetDr = netOpDr;
  let currentNetCr = netOpCr;
  let totalMonthDebit = 0;
  let totalMonthCredit = 0;

  const resultDays = dayIsoList.map(dIso => {
    const bucket = dayBuckets[dIso] || { debit: 0, credit: 0 };

    let opBal = 0;
    let opSuffix = "Dr";
    if (currentNetDr >= currentNetCr) {
      opBal = currentNetDr - currentNetCr;
      opSuffix = "Dr";
    } else {
      opBal = currentNetCr - currentNetDr;
      opSuffix = "Cr";
    }

    const debit = bucket.debit;
    const credit = bucket.credit;
    totalMonthDebit += debit;
    totalMonthCredit += credit;

    currentNetDr += debit;
    currentNetCr += credit;

    let clBal = 0;
    let clSuffix = "Dr";
    if (currentNetDr >= currentNetCr) {
      clBal = currentNetDr - currentNetCr;
      clSuffix = "Dr";
    } else {
      clBal = currentNetCr - currentNetDr;
      clSuffix = "Cr";
    }

    return {
      dateIso: dIso,
      openingBalance: opBal,
      openingBalanceSuffix: opSuffix,
      debit,
      credit,
      closingBalance: clBal,
      closingBalanceSuffix: clSuffix
    };
  });

  let overallOpBal = 0;
  let overallOpSuffix = "Dr";
  if (netOpDr >= netOpCr) {
    overallOpBal = netOpDr - netOpCr;
    overallOpSuffix = "Dr";
  } else {
    overallOpBal = netOpCr - netOpDr;
    overallOpSuffix = "Cr";
  }

  let overallClBal = 0;
  let overallClSuffix = "Dr";
  if (currentNetDr >= currentNetCr) {
    overallClBal = currentNetDr - currentNetCr;
    overallClSuffix = "Dr";
  } else {
    overallClBal = currentNetCr - currentNetDr;
    overallClSuffix = "Cr";
  }

  const monthOverallSummary = {
    openingBalance: overallOpBal,
    openingBalanceSuffix: overallOpSuffix,
    debit: totalMonthDebit,
    credit: totalMonthCredit,
    closingBalance: overallClBal,
    closingBalanceSuffix: overallClSuffix
  };

  return { days: resultDays, monthOverallSummary };
}

// Render Book HTML (Level 1: List of ledgers under Cash/Bank group)
function renderBookHtml(title, groupName, fromDate, toDate) {
  const ledgers = state.getLedgers() || [];
  const groupLedgers = ledgers.filter(l => (l.groupName || "").toUpperCase() === groupName.toUpperCase());

  // Aggregate stats
  let totalOpeningDr = 0;
  let totalOpeningCr = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let totalClosingDr = 0;
  let totalClosingCr = 0;

  const rows = groupLedgers.map((l, index) => {
    const summary = getLedgerPeriodSummary(l.code, fromDate, toDate);
    totalOpeningDr += summary.openingDr;
    totalOpeningCr += summary.openingCr;
    totalDebit += summary.debit;
    totalCredit += summary.credit;
    totalClosingDr += summary.finalDr;
    totalClosingCr += summary.finalCr;

    return `
      <tr class="ledger-row-clickable book-row" data-code="${l.code}" title="Double click or press Enter to view Month-wise summary" style="border-bottom: 1px dashed #cbd5e1; font-style: italic; background-color: white; cursor: pointer; user-select: none;">
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; color: black; font-weight: 500;">
          ${index + 1}) <i>${l.name}</i>
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${summary.openingBalance.toFixed(2)} ${summary.openingBalanceSuffix}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${summary.debit.toFixed(2)}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${summary.credit.toFixed(2)}
        </td>
        <td style="padding: 6px 12px; text-align: right; color: black; font-weight: 600;">
          ${summary.closingBalance.toFixed(2)} ${summary.closingBalanceSuffix}
        </td>
      </tr>
    `;
  }).join("");

  // Group Totals
  let groupOpeningBalance = 0;
  let groupOpeningSuffix = "Dr";
  if (totalOpeningDr >= totalOpeningCr) {
    groupOpeningBalance = totalOpeningDr - totalOpeningCr;
    groupOpeningSuffix = "Dr";
  } else {
    groupOpeningBalance = totalOpeningCr - totalOpeningDr;
    groupOpeningSuffix = "Cr";
  }

  let groupClosingBalance = 0;
  let groupClosingSuffix = "Dr";
  if (totalClosingDr >= totalClosingCr) {
    groupClosingBalance = totalClosingDr - totalClosingCr;
    groupClosingSuffix = "Dr";
  } else {
    groupClosingBalance = totalClosingCr - totalClosingDr;
    groupClosingSuffix = "Cr";
  }

  const tableBodyHTML = `
    <!-- Group Header Row in Bold -->
    <tr style="font-weight: bold; background-color: #f1f5f9; border-bottom: 1px solid #94a3b8; user-select: none;">
      <td style="padding: 8px 12px; border-right: 1px solid #94a3b8; color: black;">${groupName.toUpperCase()}</td>
      <td style="padding: 8px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
        ${groupOpeningBalance.toFixed(2)} ${groupOpeningSuffix}
      </td>
      <td style="padding: 8px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
        ${totalDebit.toFixed(2)}
      </td>
      <td style="padding: 8px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
        ${totalCredit.toFixed(2)}
      </td>
      <td style="padding: 8px 12px; text-align: right; color: black;">
        ${groupClosingBalance.toFixed(2)} ${groupClosingSuffix}
      </td>
    </tr>
    <!-- Nested ledger records -->
    ${rows.length > 0 ? rows : `
      <tr style="background-color: white;"><td colspan="5" style="padding: 20px; text-align: center; color: #64748b;">No ledgers found in this group.</td></tr>
    `}
    <!-- Bottom Total Row with Double Underline -->
    <tr style="font-weight: bold; background-color: #e2e8f0; border-top: 2px solid #475569; user-select: none;">
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; color: black;">Total:</td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${groupOpeningBalance.toFixed(2)} ${groupOpeningSuffix}
      </td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${totalDebit.toFixed(2)}
      </td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${totalCredit.toFixed(2)}
      </td>
      <td style="padding: 10px 12px; text-align: right; color: black; border-bottom: 3px double #000;">
        ${groupClosingBalance.toFixed(2)} ${groupClosingSuffix}
      </td>
    </tr>
  `;

  return tableBodyHTML;
}

// Render Month-wise Summary HTML (Level 2: Month, Opening Balance, Receipt, Payment, Closing Balance)
function renderMonthSummaryHtml(title, ledgerCode, fromDate, toDate) {
  const { months, overallSummary } = getLedgerMonthlySummaries(ledgerCode, fromDate, toDate);

  const rows = months.map(mRes => {
    const m = mRes.monthObj;
    return `
      <tr class="month-row-clickable book-row" data-start="${m.startIso}" data-end="${m.endIso}" data-name="${m.name}" data-year="${m.year}" data-month="${m.month}" title="Double click or press Enter to view Day-wise summary" style="border-bottom: 1px dashed #cbd5e1; background-color: white; cursor: pointer; user-select: none;">
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; color: black; font-weight: 500;">
          <i>${m.name}</i>
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${mRes.openingBalance.toFixed(2)} ${mRes.openingBalanceSuffix}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${mRes.debit.toFixed(2)}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${mRes.credit.toFixed(2)}
        </td>
        <td style="padding: 6px 12px; text-align: right; color: black; font-weight: 600;">
          ${mRes.closingBalance.toFixed(2)} ${mRes.closingBalanceSuffix}
        </td>
      </tr>
    `;
  }).join("");

  return `
    ${rows.length > 0 ? rows : `
      <tr style="background-color: white;"><td colspan="5" style="padding: 20px; text-align: center; color: #64748b;">No monthly data found in selected period.</td></tr>
    `}
    <!-- Bottom Total Row -->
    <tr style="font-weight: bold; background-color: #e2e8f0; border-top: 2px solid #475569; user-select: none;">
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; color: black;">Total:</td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${overallSummary.openingBalance.toFixed(2)} ${overallSummary.openingBalanceSuffix}
      </td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${overallSummary.debit.toFixed(2)}
      </td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${overallSummary.credit.toFixed(2)}
      </td>
      <td style="padding: 10px 12px; text-align: right; color: black; border-bottom: 3px double #000;">
        ${overallSummary.closingBalance.toFixed(2)} ${overallSummary.closingBalanceSuffix}
      </td>
    </tr>
  `;
}

// Render Day-wise Summary HTML (Level 3: Date, Opening Balance, Receipt, Payment, Closing Balance)
function renderDaySummaryHtml(title, ledgerCode, monthObj) {
  const { days, monthOverallSummary } = getLedgerDailySummaries(ledgerCode, monthObj);

  const rows = days.map(dRes => {
    return `
      <tr class="day-row-clickable book-row" data-date="${dRes.dateIso}" title="Double click or press Enter to view Individual Ledger for this date" style="border-bottom: 1px dashed #cbd5e1; background-color: white; cursor: pointer; user-select: none;">
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; color: black; font-weight: 500;">
          ${formatDateDisplay(dRes.dateIso)}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${dRes.openingBalance.toFixed(2)} ${dRes.openingBalanceSuffix}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${dRes.debit.toFixed(2)}
        </td>
        <td style="padding: 6px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black;">
          ${dRes.credit.toFixed(2)}
        </td>
        <td style="padding: 6px 12px; text-align: right; color: black; font-weight: 600;">
          ${dRes.closingBalance.toFixed(2)} ${dRes.closingBalanceSuffix}
        </td>
      </tr>
    `;
  }).join("");

  return `
    ${rows.length > 0 ? rows : `
      <tr style="background-color: white;"><td colspan="5" style="padding: 20px; text-align: center; color: #64748b;">No daily data found in selected month.</td></tr>
    `}
    <!-- Bottom Total Row -->
    <tr style="font-weight: bold; background-color: #e2e8f0; border-top: 2px solid #475569; user-select: none;">
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; color: black;">Total:</td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${monthOverallSummary.openingBalance.toFixed(2)} ${monthOverallSummary.openingBalanceSuffix}
      </td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${monthOverallSummary.debit.toFixed(2)}
      </td>
      <td style="padding: 10px 12px; border-right: 1px solid #94a3b8; text-align: right; color: black; border-bottom: 3px double #000;">
        ${monthOverallSummary.credit.toFixed(2)}
      </td>
      <td style="padding: 10px 12px; text-align: right; color: black; border-bottom: 3px double #000;">
        ${monthOverallSummary.closingBalance.toFixed(2)} ${monthOverallSummary.closingBalanceSuffix}
      </td>
    </tr>
  `;
}

// General function to show the book modal
function showBookModal(title, groupName, container) {
  const root = document.getElementById("modal-container-root");
  if (!root) return;
  
  const modalId = `book-modal-overlay-${groupName.replace(/\s+/g, "-")}`;
  const existing = document.getElementById(modalId);
  if (existing) {
    root.appendChild(existing);
    existing.style.zIndex = String(2000 + root.children.length * 10);
    return;
  }

  const fyBounds = getActiveFyBounds();
  const defaultFrom = fyBounds.startStr || "2026-04-01";
  const defaultTo = fyBounds.endStr || "2027-03-31";

  // Navigation state
  let viewMode = "LEDGERS"; // "LEDGERS" | "MONTHS" | "DAYS"
  let selectedLedgerCode = null;
  let selectedMonthObj = null;
  let activeRowIndex = 0;

  let keyListener;

  const modalEl = document.createElement("div");
  modalEl.id = modalId;
  modalEl.className = "modal-overlay active";
  modalEl.style.display = "flex";
  modalEl.style.justifyContent = "center";
  modalEl.style.alignItems = "center";
  modalEl.style.background = "rgba(15,23,42,0.35)";
  modalEl.style.backdropFilter = "blur(1px)";
  modalEl.style.zIndex = String(2000 + root.children.length * 10);

  const close = () => {
    modalEl.remove();
    document.removeEventListener("keydown", keyListener);
  };

  modalEl.innerHTML = `
      <div class="modal-container" style="max-width: 1000px; width: 95%; background-color: #cbd5e1; color: #0f172a; padding: 12px; border: 3px solid #1e3b8b; font-family: var(--font-body); border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        
        <!-- Official Print Header -->
        <div id="book-print-header">
          ${renderPrintHeaderHtml(title.toUpperCase(), "Book: " + title, "Period: " + formatDateDisplay(defaultFrom) + " to " + formatDateDisplay(defaultTo))}
        </div>

        <!-- Classic title bar -->
        <div class="modal-header no-print" style="background: linear-gradient(90deg, #1e3b8b, #4f46e5); color: white; padding: 6px 12px; border-radius: var(--border-radius-sm) var(--border-radius-sm) 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3b8b;">
          <span id="book-window-title" style="font-weight: bold; font-size: 0.9rem; letter-spacing: 0.5px;">${title.toUpperCase()}</span>
          <button class="btn btn-secondary btn-icon" id="btn-close-book-x" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
        </div>

        <!-- Date select & controls panel -->
        <div class="no-print" style="background-color: #b4cbe6; padding: 10px; border: 1px solid #94a3b8; display: flex; flex-direction: column; gap: 10px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; background: #c5d7ed; padding: 8px 12px; border-radius: 4px; border: 1px solid #a5c3e5; gap: 15px; flex-wrap: wrap;">
            
            <div id="book-breadcrumb-controls" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <!-- Populated dynamically based on viewMode -->
            </div>

            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary foot-btn" id="btn-book-view" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 3px 15px; cursor: pointer; font-size: 0.85rem;"><u>V</u>iew</button>
              <button class="btn btn-secondary foot-btn" id="btn-book-print" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 3px 15px; cursor: pointer; font-size: 0.85rem;"><u>P</u>rint</button>
              <button class="btn btn-secondary foot-btn" id="btn-book-close" style="background-color: #cbd5e1; border: 1px solid #64748b; color: black; font-weight: bold; padding: 3px 15px; cursor: pointer; font-size: 0.85rem;"><u>C</u>lose</button>
            </div>
          </div>

          <!-- Report table -->
          <div id="book-table-container" style="background-color: white; border: 1.5px solid #1e3b8b; max-height: 400px; overflow-y: auto; border-radius: 3px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.08);" tabindex="0">
            <table style="width: 100%; border-collapse: collapse; margin-top: 0;">
              <thead id="book-thead">
                <!-- Populated dynamically -->
              </thead>
              <tbody id="book-tbody">
                <!-- Populated dynamically -->
              </tbody>
            </table>
          </div>

        </div>
      </div>
      <style>
        .foot-btn:hover {
          background-color: #94a3b8 !important;
          border-color: #475569 !important;
        }
        #book-tbody tr.book-row:hover td {
          background-color: #e2e8f0 !important;
        }
        #book-tbody tr.book-row.active-row td {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        #book-tbody tr.book-row.active-row td i {
          color: white !important;
        }
      </style>
    </div>
  `;

  root.appendChild(modalEl);

  const windowTitleEl = modalEl.querySelector("#book-window-title");
  const printHeaderEl = modalEl.querySelector("#book-print-header");
  const breadcrumbContainer = modalEl.querySelector("#book-breadcrumb-controls");
  const thead = modalEl.querySelector("#book-thead");
  const tbody = modalEl.querySelector("#book-tbody");
  const tableContainer = modalEl.querySelector("#book-table-container");

  function getLedgerName(code) {
    if (state.getAccountDisplayName) {
      const name = state.getAccountDisplayName(code);
      if (name && name !== code) return name;
    }
    const ledgers = state.getLedgers() || [];
    const l = ledgers.find(x => x.code === code || x.id === code);
    if (l) return l.name;
    const contacts = state.getContacts() || [];
    const c = contacts.find(x => x.id === code || x.ledgerCode === code || x.code === code);
    return c ? c.name : code;
  }

  function updateRowHighlight() {
    if (!tbody) return;
    const clickableRows = tbody.querySelectorAll(".book-row");
    clickableRows.forEach((r, idx) => {
      if (idx === activeRowIndex) {
        r.classList.add("active-row");
        r.scrollIntoView({ block: "nearest" });
      } else {
        r.classList.remove("active-row");
      }
    });
  }

  function executeDrilldown(row) {
    if (!row) return;
    if (viewMode === "LEDGERS") {
      const code = row.getAttribute("data-code");
      if (code) {
        selectedLedgerCode = code;
        viewMode = "MONTHS";
        activeRowIndex = 0;
        renderView();
      }
    } else if (viewMode === "MONTHS") {
      const startIso = row.getAttribute("data-start");
      const endIso = row.getAttribute("data-end");
      const name = row.getAttribute("data-name");
      const year = parseInt(row.getAttribute("data-year"), 10);
      const month = parseInt(row.getAttribute("data-month"), 10);
      if (startIso && endIso) {
        selectedMonthObj = { startIso, endIso, name, year, month };
        viewMode = "DAYS";
        activeRowIndex = 0;
        renderView();
      }
    } else if (viewMode === "DAYS") {
      const dateIso = row.getAttribute("data-date");
      if (dateIso && selectedLedgerCode) {
        import("./reports.js").then(m => {
          m.showIndividualLedgerModal(selectedLedgerCode, dateIso, dateIso);
        });
      }
    }
  }

  let isUpdatingDates = false;

  function renderView() {
    let dateFromVal = defaultFrom;
    let dateToVal = defaultTo;

    const fromInput = modalEl.querySelector("#book-date-from");
    const toInput = modalEl.querySelector("#book-date-to");
    if (fromInput && fromInput.value) dateFromVal = fromInput.value;
    if (toInput && toInput.value) dateToVal = toInput.value;

    const ledgerName = selectedLedgerCode ? getLedgerName(selectedLedgerCode) : "";

    // 1. Update Title & Print Header
    if (viewMode === "LEDGERS") {
      if (windowTitleEl) windowTitleEl.textContent = title.toUpperCase();
      if (printHeaderEl) {
        printHeaderEl.innerHTML = renderPrintHeaderHtml(title.toUpperCase(), "Book: " + title, "Period: " + formatDateDisplay(dateFromVal) + " to " + formatDateDisplay(dateToVal));
      }
    } else if (viewMode === "MONTHS") {
      if (windowTitleEl) windowTitleEl.textContent = `${title.toUpperCase()} - MONTH-WISE SUMMARY (${ledgerName.toUpperCase()})`;
      if (printHeaderEl) {
        printHeaderEl.innerHTML = renderPrintHeaderHtml(`${title.toUpperCase()} - MONTH-WISE SUMMARY`, "Account: " + ledgerName, "Period: " + formatDateDisplay(dateFromVal) + " to " + formatDateDisplay(dateToVal));
      }
    } else if (viewMode === "DAYS") {
      const monthTitle = selectedMonthObj ? selectedMonthObj.name : "";
      if (windowTitleEl) windowTitleEl.textContent = `${title.toUpperCase()} - DAY-WISE SUMMARY (${ledgerName.toUpperCase()})`;
      if (printHeaderEl) {
        printHeaderEl.innerHTML = renderPrintHeaderHtml(`${title.toUpperCase()} - DAY-WISE SUMMARY`, "Account: " + ledgerName + " | Month: " + monthTitle, "Period: " + formatDateDisplay(selectedMonthObj ? selectedMonthObj.startIso : dateFromVal) + " to " + formatDateDisplay(selectedMonthObj ? selectedMonthObj.endIso : dateToVal));
      }
    }

    // 2. Update Breadcrumb Controls
    if (breadcrumbContainer) {
      if (viewMode === "LEDGERS") {
        breadcrumbContainer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <label style="font-weight: bold; color: #1e3b8b; font-size: 0.85rem;">From:</label>
              ${renderTallyDatePickerHtml({ id: "book-date-from", value: dateFromVal, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <label style="font-weight: bold; color: #1e3b8b; font-size: 0.85rem;">To:</label>
              ${renderTallyDatePickerHtml({ id: "book-date-to", value: dateToVal, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
          </div>
        `;
      } else if (viewMode === "MONTHS") {
        breadcrumbContainer.innerHTML = `
          <button id="btn-back-to-ledgers" class="btn btn-secondary foot-btn" style="background-color: #3b82f6; color: white; border: 1px solid #1d4ed8; font-weight: bold; padding: 3px 12px; cursor: pointer; font-size: 0.82rem; border-radius: 3px; display: inline-flex; align-items: center; gap: 4px;">
            ← Back to ${title}
          </button>
          <span style="font-weight: bold; color: #1e3b8b; font-size: 0.88rem; background: #e2e8f0; padding: 3px 10px; border-radius: 3px; border: 1px solid #cbd5e1;">
            Account: <strong>${ledgerName}</strong>
          </span>
          <div style="display: flex; align-items: center; gap: 12px; margin-left: 8px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <label style="font-weight: bold; color: #1e3b8b; font-size: 0.85rem;">From:</label>
              ${renderTallyDatePickerHtml({ id: "book-date-from", value: dateFromVal, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <label style="font-weight: bold; color: #1e3b8b; font-size: 0.85rem;">To:</label>
              ${renderTallyDatePickerHtml({ id: "book-date-to", value: dateToVal, style: "height:26px; padding:2px 6px; font-size:0.8rem; border:1px solid #7f9db9; border-radius:3px;", width: "130px" })}
            </div>
          </div>
        `;
      } else if (viewMode === "DAYS") {
        breadcrumbContainer.innerHTML = `
          <button id="btn-back-to-months" class="btn btn-secondary foot-btn" style="background-color: #3b82f6; color: white; border: 1px solid #1d4ed8; font-weight: bold; padding: 3px 12px; cursor: pointer; font-size: 0.82rem; border-radius: 3px; display: inline-flex; align-items: center; gap: 4px;">
            ← Back to Month Summary
          </button>
          <span style="font-weight: bold; color: #1e3b8b; font-size: 0.88rem; background: #e2e8f0; padding: 3px 10px; border-radius: 3px; border: 1px solid #cbd5e1;">
            Account: <strong>${ledgerName}</strong> | Month: <strong>${selectedMonthObj ? selectedMonthObj.name : ""}</strong>
          </span>
        `;
      }

      isUpdatingDates = true;
      initTallyDatePickers(breadcrumbContainer);
      isUpdatingDates = false;

      // Re-bind back buttons
      modalEl.querySelector("#btn-back-to-ledgers")?.addEventListener("click", () => {
        viewMode = "LEDGERS";
        selectedLedgerCode = null;
        activeRowIndex = 0;
        renderView();
      });
      modalEl.querySelector("#btn-back-to-months")?.addEventListener("click", () => {
        viewMode = "MONTHS";
        selectedMonthObj = null;
        activeRowIndex = 0;
        renderView();
      });

      const newFrom = modalEl.querySelector("#book-date-from");
      const newTo = modalEl.querySelector("#book-date-to");
      const handleDateChange = () => {
        if (!isUpdatingDates) {
          activeRowIndex = 0;
          renderView();
        }
      };
      if (newFrom) newFrom.addEventListener("change", handleDateChange);
      if (newTo) newTo.addEventListener("change", handleDateChange);
    }

    // 3. Update Table Header & Body
    if (viewMode === "LEDGERS") {
      if (thead) {
        thead.innerHTML = `
          <tr style="border-bottom: 2px solid #1e3b8b; user-select: none;">
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: left; font-size: 0.85rem; width: 35%;">Particulars</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 18%;">Opening Balance</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 15%;">Debit</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 15%;">Credit</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 17%;">Closing Balance</th>
          </tr>
        `;
      }
      if (tbody) {
        tbody.innerHTML = renderBookHtml(title, groupName, dateFromVal, dateToVal);
      }
    } else if (viewMode === "MONTHS") {
      if (thead) {
        thead.innerHTML = `
          <tr style="border-bottom: 2px solid #1e3b8b; user-select: none;">
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: left; font-size: 0.85rem; width: 30%;">Month</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 20%;">Opening Balance</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 15%;">Receipt</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 15%;">Payment</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 20%;">Closing Balance</th>
          </tr>
        `;
      }
      if (tbody) {
        tbody.innerHTML = renderMonthSummaryHtml(title, selectedLedgerCode, dateFromVal, dateToVal);
      }
    } else if (viewMode === "DAYS") {
      if (thead) {
        thead.innerHTML = `
          <tr style="border-bottom: 2px solid #1e3b8b; user-select: none;">
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: left; font-size: 0.85rem; width: 25%;">Date</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 20%;">Opening Balance</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 18%;">Receipt</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; border-right: 1px solid #94a3b8; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 18%;">Payment</th>
            <th style="background-color: #1e3b8b !important; color: white !important; font-weight: bold; padding: 8px 12px; text-align: right; font-size: 0.85rem; width: 19%;">Closing Balance</th>
          </tr>
        `;
      }
      if (tbody && selectedMonthObj) {
        tbody.innerHTML = renderDaySummaryHtml(title, selectedLedgerCode, selectedMonthObj);
      }
    }

    updateRowHighlight();
  }

  // Bind View & Close controls
  modalEl.querySelector("#btn-book-view")?.addEventListener("click", () => {
    activeRowIndex = 0;
    renderView();
  });
  modalEl.querySelector("#btn-close-book-x")?.addEventListener("click", close);
  modalEl.querySelector("#btn-book-close")?.addEventListener("click", close);

  modalEl.querySelector("#btn-book-print")?.addEventListener("click", () => {
    window.print();
  });

  // Single-click row selection & double-click drilldown
  tbody?.addEventListener("click", (e) => {
    const row = e.target.closest(".book-row");
    if (row) {
      const rows = Array.from(tbody.querySelectorAll(".book-row"));
      const idx = rows.indexOf(row);
      if (idx !== -1) {
        activeRowIndex = idx;
        updateRowHighlight();
      }
    }
  });

  tbody?.addEventListener("dblclick", (e) => {
    const row = e.target.closest(".book-row");
    if (row) {
      executeDrilldown(row);
    }
  });

  // Hotkey Navigation: Up/Down arrow key selection, Enter key drilldown, Esc/Backspace back
  keyListener = (e) => {
    // Ignore key combinations or if typing inside input
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
      if (e.key === "Escape") {
        close();
      }
      return;
    }

    const clickableRows = tbody ? Array.from(tbody.querySelectorAll(".book-row")) : [];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (clickableRows.length > 0) {
        activeRowIndex = (activeRowIndex + 1) % clickableRows.length;
        updateRowHighlight();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (clickableRows.length > 0) {
        activeRowIndex = (activeRowIndex - 1 + clickableRows.length) % clickableRows.length;
        updateRowHighlight();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (clickableRows.length > 0 && clickableRows[activeRowIndex]) {
        executeDrilldown(clickableRows[activeRowIndex]);
      }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      if (viewMode === "DAYS") {
        viewMode = "MONTHS";
        selectedMonthObj = null;
        activeRowIndex = 0;
        renderView();
      } else if (viewMode === "MONTHS") {
        viewMode = "LEDGERS";
        selectedLedgerCode = null;
        activeRowIndex = 0;
        renderView();
      }
    } else if (e.key === "Escape") {
      close();
    }
  };
  document.addEventListener("keydown", keyListener);

  // Focus table container for immediate keyboard navigation
  if (tableContainer) {
    tableContainer.focus();
  }

  // Initial render
  renderView();
}

// Exports
export function showCashBookModal(container) {
  showBookModal("CASH BOOK", "CASH-IN-HAND", container);
}

export function showBankBookModal(container) {
  showBookModal("BANK BOOK", "BANK ACCOUNTS", container);
}
