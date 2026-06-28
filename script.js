/**
 * ========================================================
 * GLOBAL STATE, PLUGIN CONFIGURATION & TRACKING LABELS
 * ========================================================
 */
if (typeof ChartDataLabels !== "undefined" && typeof Chart !== "undefined") {
  Chart.register(ChartDataLabels);
}

// Global scope configuration variables
let viewingTrashBin = false;
let dangerAlertTimer = null;
let allRecords = []; // High-speed internal memory cache for instant structural filtering

/**
 * ========================================================
 * CUSTOM OVERLAY COMPONENTS (MODAL POPUPS)
 * ========================================================
 */
function customConfirm(title, message, callback) {
  let confirmModal = document.getElementById("customConfirmModal");
  if (!confirmModal) {
    confirmModal = document.createElement("div");
    confirmModal.id = "customConfirmModal";
    confirmModal.className = "modal";
    confirmModal.innerHTML = `
      <div class="modal-content" style="max-width: 380px; text-align: center;">
        <h3 id="customConfirmTitle" style="margin-bottom: 12px; font-size: 18px; color: #fff;"></h3>
        <p id="customConfirmMessage" style="color: var(--text-muted); margin-bottom: 24px; font-size: 14px; line-height: 1.5;"></p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="customConfirmBtnYes" class="btn-save" style="margin-top: 0; background: var(--color-safe); flex: 1;">Confirm</button>
          <button id="customConfirmBtnNo" class="btn-save" style="margin-top: 0; background: var(--color-danger); flex: 1;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmModal);
  }

  document.getElementById("customConfirmTitle").innerText = title;
  document.getElementById("customConfirmMessage").innerText = message;
  confirmModal.style.display = "flex";

  const yesBtn = document.getElementById("customConfirmBtnYes");
  const noBtn = document.getElementById("customConfirmBtnNo");

  const newYesBtn = yesBtn.cloneNode(true);
  const newNoBtn = noBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
  noBtn.parentNode.replaceChild(newNoBtn, noBtn);

  newYesBtn.addEventListener("click", () => {
    confirmModal.style.display = "none";
    if (callback) callback(true);
  });

  newNoBtn.addEventListener("click", () => {
    confirmModal.style.display = "none";
    if (callback) callback(false);
  });
}

function customAlert(title, message) {
  let alertModal = document.getElementById("customAlertModal");
  if (!alertModal) {
    alertModal = document.createElement("div");
    alertModal.id = "customAlertModal";
    alertModal.className = "modal";
    alertModal.innerHTML = `
      <div class="modal-content" style="max-width: 380px; text-align: center;">
        <h3 id="customAlertTitle" style="margin-bottom: 12px; font-size: 18px; color: var(--color-danger);"></h3>
        <p id="customAlertMessage" style="color: var(--text-muted); margin-bottom: 20px; font-size: 14px; line-height: 1.5;"></p>
        <button id="customAlertBtnClose" class="btn-save" style="margin-top: 0;">Dismiss</button>
      </div>
    `;
    document.body.appendChild(alertModal);
  }

  document.getElementById("customAlertTitle").innerText = title;
  document.getElementById("customAlertMessage").innerText = message;
  alertModal.style.display = "flex";

  document.getElementById("customAlertBtnClose").onclick = () => {
    alertModal.style.display = "none";
  };
}

// Soft-Delete UI Context View Toggle Handler
function toggleTrashView() {
  viewingTrashBin = !viewingTrashBin;
  const toggleBtn = document.getElementById("trashToggleBtn");
  const captionHeader = document.getElementById("tableCaptionHeading");

  if (viewingTrashBin) {
    if (toggleBtn) {
      toggleBtn.innerText = "View Active Logs";
      toggleBtn.style.background = "#0ea5e9";
      toggleBtn.style.color = "#fff";
    }
    if (captionHeader) {
      captionHeader.innerText = "Trash Bin - Soft Deleted Telemetry Rows";
    }
  } else {
    if (toggleBtn) {
      toggleBtn.innerText = "View Trash Bin";
      toggleBtn.style.background = "#f1c40f";
      toggleBtn.style.color = "#000";
    }
    if (captionHeader) {
      captionHeader.innerText = "Live System Logs";
    }
  }
  loadHistory();
}

// Tab Switching Controller with Active Blue CSS State Highlights Fixed
function showTab(tabId, btn) {
  document
    .querySelectorAll(".tabContent")
    .forEach((t) => t.classList.remove("active"));

  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add("active");
  }

  document.querySelectorAll(".tabButton").forEach((b) => {
    b.classList.remove("active");
  });

  if (btn) {
    btn.classList.add("active");
  } else if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add("active");
  }
}

// Hardware actuator override dispatcher


/**
 * ========================================================
 * DATA VISUALIZATION LAYER (CHARTJS INSTANCES)
 * ========================================================
 */
let waterChart, statusChart, activityChart;
const waterCtx = document.getElementById("waterChart");
if (waterCtx) {
  waterChart = new Chart(waterCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Water Depth Metrics",
          data: [],
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14, 165, 233, 0.08)",
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { datalabels: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

const statusCtx = document.getElementById("statusChart");
if (statusCtx) {
  statusChart = new Chart(statusCtx, {
    type: "pie",
    data: {
      labels: ["SAFE", "WARNING", "DANGER"],
      datasets: [
        { data: [0, 0, 0], backgroundColor: ["#2ecc71", "#f1c40f", "#e74c3c"] },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        documentDataLabels: { display: false },
        datalabels: {
          color: "#fff",
          formatter: (val, ctx) => {
            if (val === 0) return ""; 
            let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            return sum > 0 ? ((val * 100) / sum).toFixed(1) + "%" : "0%";
          },
        },
      },
    },
  });
}

const activityCtx = document.getElementById("activityChart");
if (activityCtx) {
  activityChart = new Chart(activityCtx, {
    type: "bar",
    data: {
      labels: ["Closed/Retracted", "Deployed/Open"],
      datasets: [
        {
          label: "Instances Logged",
          data: [0, 0],
          backgroundColor: ["#34495e", "#9b59b6"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { datalabels: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

/**
 * ========================================================
 * AUTOMATED TELEMETRY METRIC LOGIC ENGINE
 * ========================================================
 */
function calculateAutomatedMetrics() {
  const distanceInput = document.getElementById("recordDistance");
  const waterLevelInput = document.getElementById("recordWaterLevel");
  const barrierSelect = document.getElementById("recordBarrier");
  const conditionSelect = document.getElementById("recordCondition");

  if (!distanceInput || !distanceInput.value) return;

  const distance = parseFloat(distanceInput.value);
  const maxDistance = 9.4; 
  const computedWaterLevel = Math.max(0, maxDistance - distance);

  if (waterLevelInput) {
    waterLevelInput.value = computedWaterLevel.toFixed(2);
  }

  let calculatedCondition = "SAFE";
  let calculatedBarrier = "0";

  if (computedWaterLevel < 2.0) {
    calculatedCondition = "SAFE";
    calculatedBarrier = "0";
  } else if (computedWaterLevel >= 2.0 && computedWaterLevel < 3.0) {
    calculatedCondition = "WARNING";
    calculatedBarrier = "0";
  } else {
    calculatedCondition = "DANGER";
    calculatedBarrier = "1";
  }

  if (conditionSelect) conditionSelect.value = calculatedCondition;
  if (barrierSelect) barrierSelect.value = calculatedBarrier;
}

function loadHistory() {
  const queryUrl = `api.php?action=fetch&trash=${viewingTrashBin ? 1 : 0}`;

  fetch(queryUrl)
    .then((res) => res.text())
    .then((text) => {
      try {
        const data = JSON.parse(text);
        if (data.error) {
          allRecords = [];
        } else if (Array.isArray(data)) {
          allRecords = data;
        } else if (data && data.data && Array.isArray(data.data)) {
          allRecords = data.data;
        } else {
          allRecords = [];
        }
        applyFilters();
      } catch (err) {
        allRecords = [];
        applyFilters();
      }
    })
    .catch((err) => console.error("Network sync issue:", err));
}

/**
 * ========================================================
 * FIXED: PIPELINE UNBLOCKED (REMOVED EARLY EXIT BUG)
 * ========================================================
 */
function applyFilters() {
  const container = document.getElementById("log");
  // FIX: Early exit removed so charts and interpretations process globally on the Dashboard page

  const condSelect =
    document.getElementById("statusFilter") ||
    document.getElementById("filterCondition") ||
    document.getElementById("recordCondition");
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  const filterCond = condSelect ? condSelect.value.toUpperCase() : "";
  const filterStart = startInput ? startInput.value : "";
  const filterEnd = endInput ? endInput.value : "";

  const filteredData = allRecords.filter((row) => {
    const cleanCondition = (row.scondition || row.condition || row.status || "SAFE").toUpperCase();
    if (filterCond !== "" && cleanCondition !== filterCond) return false;

    const rowDate = row.tStamp ? row.tStamp.split(" ")[0] : "";
    if (filterStart !== "" && rowDate < filterStart) return false;
    if (filterEnd !== "" && rowDate > filterEnd) return false;

    return true;
  });

  // Only attempt to paint table elements if they exist on the active page
  if (container) {
    container.innerHTML = "";

    if (filteredData.length === 0) {
      container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#9ca3af;">No rows match structural query criteria.</td></tr>`;
    } else {
      filteredData.forEach((row) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #1f2937";

        const timestamp = row.tStamp || row.timestamp || "N/A";
        const rawDistance = row.distance || row.DISTANCE || 0;
        const cleanCondition = (row.scondition || row.condition || row.status || "SAFE").toUpperCase();

        let actionButtonsMarkup = "";
        if (window.USER_ROLE_PERMIT === "admin") {
          actionButtonsMarkup = viewingTrashBin
            ? `<button onclick="restoreRecord(${row.id})" style="background: #2ecc71; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 13px;">Restore</button>`
            : `<button onclick='openEditModal(${JSON.stringify(row).replace(/'/g, "&apos;").replace(/"/g, "&quot;")})' style="background:#0ea5e9; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:600; margin-right:5px; font-size:13px;">Edit</button>
                 <button onclick="deleteRecord(${row.id})" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:600; font-size:13px;">Delete</button>`;
        }

        tr.innerHTML = `
          <td style="padding: 12px 10px; color: #f9fafb;">${timestamp}</td>
          <td style="padding: 12px 10px; color: #f9fafb;">${parseFloat(rawDistance).toFixed(2)} cm</td>
          <td style="padding: 12px 10px;">
            <span class="badge" style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${parseInt(row.barrier) === 1 ? "rgba(239, 68, 68, 0.2)" : "rgba(46, 204, 113, 0.2)"}; color: ${parseInt(row.barrier) === 1 ? "#ef4444" : "#2ecc71"};">
              ${parseInt(row.barrier) === 1 ? "DEPLOYED" : "CLOSED"}
            </span>
          </td>
          <td style="padding: 12px 10px; color: #f9fafb;">${parseFloat(row.water_level || 0).toFixed(2)} cm</td>
          <td style="padding: 12px 10px;">
            <span class="badge" style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${cleanCondition === "DANGER" ? "rgba(239, 68, 68, 0.2)" : cleanCondition === "WARNING" ? "rgba(241, 196, 15, 0.2)" : "rgba(46, 204, 113, 0.2)"}; color: ${cleanCondition === "DANGER" ? "#ef4444" : cleanCondition === "WARNING" ? "#f1c40f" : "#2ecc71"};">
              ${cleanCondition}
            </span>
          </td>
          <td class="actions-col" style="padding: 12px 10px; text-align: center;">${actionButtonsMarkup}</td>
        `;
        container.appendChild(tr);
      });
    }
  }

  // Pass execution onwards regardless of which page the client is sitting on
  updateMetricsAndAnalytics(filteredData);
}

/**
 * ========================================================
 * METRICS & CHART INTEGRATION WORKER
 * ========================================================
 */
/**
 * ========================================================
 * METRICS & CHART INTEGRATION WORKER
 * ========================================================
 */
/**
 * ========================================================
 * METRICS & CHART INTEGRATION WORKER (SEPARATED INTERPRETATIONS)
 * ========================================================
 */
/**
 * ========================================================
 * METRICS & CHART INTEGRATION WORKER (DEEP ANALYTICS UPGRADE)
 * ========================================================
 */
/**
 * ========================================================
 * METRICS & CHART INTEGRATION WORKER (ADVANCED STATS CORES)
 * ========================================================
 */
function updateMetricsAndAnalytics(data) {
  const graphData = [...data].reverse();
  
  if (waterChart) {
    waterChart.data.labels = graphData.map((r) => r.tStamp ? r.tStamp.split(" ")[1] || r.tStamp : "");
    waterChart.data.datasets[0].data = graphData.map((r) => r.water_level);
    waterChart.update();
  }

  let safe = 0, warn = 0, danger = 0, activeCount = 0;
  let totalDist = 0, totalWater = 0;
  
  // Track high and low values using simple baselines
  let highestWater = 0;
  let lowestWater = data.length > 0 ? parseFloat(data[0].water_level || 0) : 0;
  let highestDist = 0;
  let lowestDist = data.length > 0 ? parseFloat(data[0].distance || data[0].DISTANCE || 0) : 0;

  data.forEach((r) => {
    const curWater = parseFloat(r.water_level || 0);
    const curDist = parseFloat(r.distance || r.DISTANCE || 0);
    
    totalDist += curDist;
    totalWater += curWater;
    
    // Calculate highest and lowest values
    if (curWater > highestWater) highestWater = curWater;
    if (curWater < lowestWater) lowestWater = curWater;
    if (curDist > highestDist) highestDist = curDist;
    if (curDist < lowestDist) lowestDist = curDist;

    const cl = (r.scondition || r.condition || r.status || "SAFE").toUpperCase();
    if (cl === "SAFE") safe++;
    if (cl === "WARNING") warn++;
    if (cl === "DANGER") danger++;
    if (parseInt(r.barrier) === 1) activeCount++;
  });

  // 1. POPULATE SUMMARY CARDS WITH PLAIN ENGLISH LABELS
  const summaryBox = document.getElementById("summaryBox");
  if (summaryBox) {
    summaryBox.innerHTML = `
      <div class="kpi-card">
        <h3>Avg Clearance (Dist)</h3>
        <p style="color:#fff;">${data.length ? (totalDist / data.length).toFixed(2) : "0.00"} cm</p>
        <span style="font-size:11px; color:var(--text-muted); display:block; margin-top:4px;">Min: ${lowestDist.toFixed(1)} / Max: ${highestDist.toFixed(1)}</span>
      </div>
      <div class="kpi-card">
        <h3>Avg Water Level</h3>
        <p style="color:var(--primary-blue);">${data.length ? (totalWater / data.length).toFixed(2) : "0.00"} cm</p>
        <span style="font-size:11px; color:var(--text-muted); display:block; margin-top:4px;">Min: ${lowestWater.toFixed(1)} / Max: ${highestWater.toFixed(1)}</span>
      </div>
      <div class="kpi-card"><h3>Normal (SAFE)</h3><p style="color:var(--color-safe);">${safe}</p></div>
      <div class="kpi-card"><h3>Alert (WARNING)</h3><p style="color:var(--color-warning);">${warn}</p></div>
      <div class="kpi-card"><h3>Critical (DANGER)</h3><p style="color:var(--color-danger);">${danger}</p></div>
      <div class="kpi-card"><h3>Barrier Deployed</h3><p style="color:#fff;">${activeCount} <span style="font-size:12px; font-weight:400; color:var(--text-muted);">(${data.length ? ((activeCount / data.length) * 100).toFixed(1) : "0"}%)</span></p></div>
    `;
  }

  if (statusChart) {
    statusChart.data.datasets[0].data = [safe, warn, danger];
    statusChart.update('none');
  }
  if (activityChart) {
    activityChart.data.datasets[0].data = [data.length - activeCount, activeCount];
    activityChart.update();
  }

  // 2. GENERATE CLEAR AND PROFESSIONAL DISPATCH TEXT
  if (data.length > 0) {
    const latest = data[data.length - 1]; 
    const latestWater = parseFloat(latest.water_level || 0).toFixed(2);
    const latestCondition = String(latest.scondition || latest.condition || latest.status || "SAFE").trim().toUpperCase();
    const latestBarrier = parseInt(latest.barrier) === 1 ? "DEPLOYED" : "CLOSED";
    
    const safePct = ((safe / data.length) * 100).toFixed(1);
    const warnPct = ((warn / data.length) * 100).toFixed(1);
    const dangerPct = ((danger / data.length) * 100).toFixed(1);
    const barrierPct = ((activeCount / data.length) * 100).toFixed(1);

    let diff = 0;
    if (data.length > 5) {
      const olderWater = parseFloat(data[data.length - 5].water_level || 0);
      diff = latestWater - olderWater;
    }

    // A. MAIN DASHBOARD OVERVIEW CARD
    let dashAnalysis = `The station records a current water level of <strong>${latestWater} cm</strong>. The system status is currently <strong>${latestCondition}</strong> and the flood barrier is <strong>${latestBarrier}</strong>. `;

    if (latestCondition === "DANGER") {
      dashAnalysis += `<br><br><span style="color: var(--color-danger); font-weight:600;">🚨 EMERGENCY ALERT:</span> The water has crossed the critical threshold. Defensive barriers must remain fully active until water levels safely drop back down.`;
    } else if (diff > 1.0) {
      dashAnalysis += `<br><br><span style="color: var(--color-warning); font-weight:600;">📈 RISING TREND:</span> Water is rising faster than the area can currently drain (up by ${diff.toFixed(2)} cm over the last 5 readings).`;
    } else {
      dashAnalysis += `Water levels are holding stable with regular drainage patterns across the monitored area.`;
    }

    const textDash = document.getElementById("interpretationTextDashboard");
    const cardDash = document.getElementById("dataInterpretationDashboard");
    if (textDash) textDash.innerHTML = dashAnalysis;
    
    if (cardDash) {
      cardDash.className = "interpretation-card";
      if (latestCondition === "DANGER") cardDash.classList.add("state-danger");
      else if (latestCondition === "WARNING") cardDash.classList.add("state-warning");
      else cardDash.classList.add("state-safe");
    }

    // B. SUB-CHART INLINE CAPTIONS (SIMPLE TREND ANALYSIS)
    let waterInterp = `<strong>Water Level Trend:</strong> `;
    if (diff > 1.0) {
      waterInterp += `<span style="color:var(--color-warning);">Rising.</span> Water levels increased by ${diff.toFixed(2)} cm over the last 5 checks. Highest recorded point: ${highestWater.toFixed(2)} cm.`;
    } else if (diff < -1.0) {
      waterInterp += `<span style="color:var(--color-safe);">Receding.</span> The water level has successfully dropped by ${Math.abs(diff).toFixed(2)} cm.`;
    } else {
      waterInterp += `Stable. The water level is holding steady. The peak height recorded during this period is ${highestWater.toFixed(2)} cm.`;
    }
    const wcEl = document.getElementById("waterChartInterp");
    if (wcEl) wcEl.innerHTML = waterInterp;

    let statusInterp = `<strong>Condition Mix Summary:</strong> `;
    if (parseFloat(dangerPct) > 10) {
      statusInterp += `High-risk levels recorded (${dangerPct}% of the time). The area is experiencing frequent high-water conditions.`;
    } else if (parseFloat(warnPct) > 30) {
      statusInterp += `Elevated levels. The system spent ${warnPct}% of its runtime in alert status, showing persistent water volume.`;
    } else {
      statusInterp += `Normal conditions. The station is maintaining a safe status for ${safePct}% of the logged history.`;
    }
    const scEl = document.getElementById("statusChartInterp");
    if (scEl) scEl.innerHTML = statusInterp;

    let activityInterp = `<strong>Barrier Activity Log:</strong> `;
    if (parseFloat(barrierPct) > 25) {
      activityInterp += `<span style="color:var(--color-danger); font-weight:500;">Frequent Activity.</span> The barrier was active ${barrierPct}% of the time. Routine mechanical inspections are recommended.`;
    } else {
      activityInterp += `Normal Load. The flood gate only needed to deploy for ${barrierPct}% of the tracking period.`;
    }
    const acEl = document.getElementById("activityChartInterp");
    if (acEl) acEl.innerHTML = activityInterp;

    // C. BOTTOM KPI SUMMARY CARD REPORT
    let kpiAnalysis = `Based on a dataset of <strong>${data.length} logs</strong>, the system is performing normally. The average water level sits at <strong>${(totalWater / data.length).toFixed(2)} cm</strong>, with a peak crest height of <strong>${highestWater.toFixed(2)} cm</strong>. This leaves a minimum safety clearance of <strong>${lowestDist.toFixed(2)} cm</strong> before potential overflow.`;

    kpiAnalysis += `<br><br><strong>Maintenance & Operations Recommendations:</strong><br>`;
    if (parseFloat(barrierPct) > 20) {
      kpiAnalysis += `• ⚠️ <strong>Gate Usage Notice:</strong> The gates are deploying frequently (${barrierPct}% of logs). <em>Action: Schedule structural lubrication for the moving parts.</em>`;
    } else {
      kpiAnalysis += `• ✅ <strong>Gate Health Status:</strong> Deployment usage is minimal (${barrierPct}%), which preserves the overall lifespan of the system.`;
    }

    kpiAnalysis += `<br>`;
    
    if (highestWater > 7.5) {
      kpiAnalysis += `• 🚨 <strong>High Peak Warning:</strong> The system recorded a severe high-water event hitting ${highestWater.toFixed(2)} cm. <em>Action: Check the physical seals to ensure they were not damaged or warped under the high pressure.</em>`;
    } else {
      kpiAnalysis += `• ✅ <strong>Drainage System Check:</strong> Local drainage structures are managing normal water volume well within safe limits.`;
    }

    const textKPI = document.getElementById("interpretationTextKPI");
    const cardKPI = document.getElementById("dataInterpretationKPI");
    if (textKPI) textKPI.innerHTML = kpiAnalysis;

    if (cardKPI) {
      cardKPI.className = "interpretation-card";
      if (parseFloat(dangerPct) > 15 || parseFloat(barrierPct) > 20 || highestWater > 7.5) cardKPI.classList.add("state-danger");
      else if (parseFloat(warnPct) > 30) cardKPI.classList.add("state-warning");
      else cardKPI.classList.add("state-safe");
    }
  }
}

function fetchLatestData() {
  fetch("api.php?action=latest")
    .then((response) => response.text())
    .then((text) => {
      try {
        const data = JSON.parse(text);
        if (!data || data.error) return;

        const dangerBanner = document.getElementById("dangerNotificationBanner");
        const warningBanner = document.getElementById("warningNotificationBanner");

        if (dangerBanner && warningBanner) {
          if (data.scondition === "DANGER") {
            dangerBanner.style.display = "block";
            warningBanner.style.display = "none";
          } else if (data.scondition === "WARNING") {
            dangerBanner.style.display = "none";
            warningBanner.style.display = "block";
          } else {
            dangerBanner.style.display = "none";
            warningBanner.style.display = "none";
          }
        }

        const lastUpdatedEl = document.getElementById("lastUpdated");
        if (lastUpdatedEl) {
          lastUpdatedEl.innerHTML = `<strong>Last Sync:</strong> ${data.tStamp} | <strong>Current Threat Level:</strong> ${data.scondition}`;
        }
      } catch (e) {}
    })
    .catch((err) => console.error("Banner fetch failed:", err));
}

function openCreateModal() {
  const form = document.getElementById("crudForm");
  if (form) form.reset();
  document.getElementById("recordId").value = "";
  document.getElementById("modalTitle").innerText = "Insert New Telemetry Metric Context";
  document.getElementById("crudModal").style.display = "flex";
}

function openEditModal(record) {
  const rawDist = record.distance || record.DISTANCE || 0;
  document.getElementById("recordId").value = record.id;
  document.getElementById("recordDistance").value = rawDist;
  document.getElementById("recordWaterLevel").value = record.water_level;
  document.getElementById("recordBarrier").value = record.barrier;
  document.getElementById("recordCondition").value = record.scondition;
  document.getElementById("modalTitle").innerText = `Alter Log Reference Frame #${record.id}`;
  document.getElementById("crudModal").style.display = "flex";
}

function closeCrudModal() {
  document.getElementById("crudModal").style.display = "none";
}

function handleCrudSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("recordId").value;
  const contextAction = id ? "Update" : "Add";

  customConfirm(
    `${contextAction} Record`,
    `Are you sure you want to commit these metrics to the live tracking infrastructure?`,
    (confirmed) => {
      if (!confirmed) return;

      const payload = {
        id,
        distance: parseFloat(document.getElementById("recordDistance").value),
        water_level: parseFloat(document.getElementById("recordWaterLevel").value),
        barrier: parseInt(document.getElementById("recordBarrier").value),
        scondition: document.getElementById("recordCondition").value,
      };

      const apiAction = id ? "update" : "create";

      fetch(`api.php?action=${apiAction}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" || data.success === true || !data.error) {
            closeCrudModal();
            loadHistory();
          } else {
            customAlert("Execution Error", data.error || "The routing endpoint rejected this layout.");
          }
        })
        .catch((err) => {
          console.error("CRUD fault:", err);
          customAlert("Network Failure", "Telemetry synchronization request failed.");
        });
    },
  );
}

function deleteRecord(id) {
  customConfirm(
    "Delete Telemetry Record",
    `Flag telemetry entry #${id} as soft-deleted? It will move to the trash bin repository.`,
    (confirmed) => {
      if (!confirmed) return;

      fetch("api.php?action=delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" || data.success) loadHistory();
          else customAlert("Purge Error", data.error);
        })
        .catch((err) => {
          console.error("Delete engine system fault:", err);
          customAlert("System Error", "The engine could not resolve your deletion request.");
        });
    },
  );
}

function restoreRecord(id) {
  customConfirm(
    "Restore Telemetry Record",
    `Restore telemetry record entry #${id} back into live view state logs?`,
    (confirmed) => {
      if (!confirmed) return;

      fetch("api.php?action=restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" || data.success) {
            loadHistory();
          } else {
            customAlert("Restoration Failure", data.error);
          }
        })
        .catch((err) => {
          console.error("Restoration processing tracking fault:", err);
          customAlert("System Error", "The execution sequence encountered an infrastructure fault.");
        });
    },
  );
}

function handleSignOut() {
  customConfirm(
    "Terminate Session Link",
    "Are you sure you want to log out of the Smart Flood Barrier secure telemetry management network?",
    (confirmed) => {
      if (confirmed) {
        window.location.href = "login.php?action=logout";
      }
    },
  );
}

document.addEventListener("DOMContentLoaded", () => {
  fetchLatestData();

  const distanceInput = document.getElementById("recordDistance");
  if (distanceInput) {
    distanceInput.addEventListener("input", calculateAutomatedMetrics);
  }

  const selectors = ["statusFilter", "filterCondition", "recordCondition", "startDate", "endDate"];
  selectors.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", applyFilters);
      el.addEventListener("change", applyFilters);
    }
  });

  setInterval(() => {
    fetchLatestData();
  }, 1000);

  const securityWaiter = setInterval(() => {
    if (window.USER_ROLE_PERMIT) {
      clearInterval(securityWaiter); 

      if (window.USER_ROLE_PERMIT === "user") {
        document.body.classList.add("role-user");
        const adminElements = document.querySelectorAll("#statusBar button, .action-utilities, .actions-col");
        adminElements.forEach((el) => {
          el.style.setProperty("display", "none", "important");
        });
      } else if (window.USER_ROLE_PERMIT === "admin") {
        document.body.classList.add("role-admin");
      }

      if (typeof loadHistory === "function") {
        loadHistory();
        setInterval(() => { loadHistory(); }, 500);
      }
    }
  }, 50);
});

// ======================================================================
// UNIFIED SMOOTHING & THROTTLED ENGINE (FIXED ORPHANED BRACE SYNTAX)
// ======================================================================
// ======================================================================
// TWO-WAY BI-DIRECTIONAL SYSTEM CONTROL ENGINE (AUTO, SAFE, DANGER)
// ======================================================================
let serialPort = null;
let serialReader = null;
let keepReading = false;

// Hardware Overrides & Anti-Flood Settings
let currentOverrideMode = "AUTO"; // Tracks "AUTO", "SAFE", or "DANGER"
let lastSavedDistance = 0; 
let lastSavedStatus = "SAFE";
let lastDbSaveTime = 0;
let distanceBuffer = [];     
const MAX_SAMPLES = 5;       

// 1. HARDWARE ACTUATOR OVERRIDE DISPATCHER (UPGRADED)
function send(cmd) {
  // Sync command state with your backend database infrastructure
  fetch("api.php?action=command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd }),
  })
  .then(() => {
    if (typeof fetchLatestData === "function") fetchLatestData();
  })
  .catch((err) => console.error("Hardware command uplink failure:", err));

  // Handle local state tracking mapping
  if (cmd === 'A') currentOverrideMode = "AUTO";
  if (cmd === 'S') currentOverrideMode = "SAFE";
  if (cmd === 'D') currentOverrideMode = "DANGER";

  // Instantly send command byte down the physical Web Serial pipe if active
  writeSerialCommand(cmd);

  // Dynamically update button highlight indicators in the top status bar
  updateStatusBarHighlights(cmd);
}

// 2. TRANSMIT BYTES DOWN THE WEB SERIAL PIPE
async function writeSerialCommand(commandChar) {
  if (!serialPort || !serialPort.writable) return;
  try {
    const encoder = new TextEncoder();
    const writer = serialPort.writable.getWriter();
    await writer.write(encoder.encode(commandChar + "\n"));
    writer.releaseLock();
    console.log(`⚡ Sent Mode Command to Arduino: ${commandChar}`);
  } catch (err) {
    console.error("Failed to write to serial port:", err);
  }
}

// 3. VISUAL ACTIVE-BUTTON CONTROLLER FOR STATUS BAR
function updateStatusBarHighlights(activeCmd) {
  const statusBar = document.getElementById("statusBar");
  if (!statusBar) return;
  
  const buttons = statusBar.getElementsByTagName("button");
  for (let btn of buttons) {
    if (btn.id === "btnConnectSerial") continue; // Skip connect button
    
    const clickAction = btn.getAttribute("onclick");
    if (clickAction && clickAction.includes(`'${activeCmd}'`)) {
      btn.style.border = "2px solid #fff";
      btn.style.boxShadow = "0 0 12px rgba(255, 255, 255, 0.4)";
      btn.style.transform = "scale(1.03)";
    } else {
      btn.style.border = "none";
      btn.style.boxShadow = "none";
      btn.style.transform = "scale(1)";
    }
  }
}

// 4. SERIAL CHANNEL LINK MANAGEMENT
window.toggleSerialLink = async function() {
  const btn = document.getElementById("btnConnectSerial");
  const indicator = document.getElementById("serialStatusIndicator");
  if (!btn) return;

  if (serialPort) {
    keepReading = false;
    if (serialReader) {
      try { await serialReader.cancel(); } catch (e) {}
    }
    return; 
  }

  if (!("serial" in navigator)) {
    alert("Web Serial API not supported! Please use a modern version of Google Chrome or Edge.");
    return;
  }

  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 9600 });
    
    keepReading = true;
    btn.innerHTML = "🔌 Disconnect";
    btn.style.background = "var(--color-danger)";
    if (indicator) indicator.innerHTML = "Streaming Live";

    // Highlight that we default into Auto Mode upon connection setup
    updateStatusBarHighlights(currentOverrideMode);
    readSerialStream();
  } catch (error) {
    console.error("Serial Link Error:", error);
    if (indicator) indicator.innerHTML = "Port Error";
    serialPort = null;
  }
};

async function readSerialStream() {
  const textDecoder = new TextDecoderStream();
  serialPort.readable.pipeTo(textDecoder.writable);
  serialReader = textDecoder.readable.getReader();
  let stringBuffer = "";

  try {
    while (keepReading) {
      const { value, done } = await serialReader.read();
      if (done) break;
      if (value) {
        stringBuffer += value;
        if (stringBuffer.includes("\n")) {
          const lines = stringBuffer.split("\n");
          stringBuffer = lines.pop(); 
          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.length > 0) processTelemetry(cleanLine);
          }
        }
      }
    }
  } catch (err) {
    console.error("Read Error:", err);
  } finally {
    if (serialReader) { try { serialReader.releaseLock(); } catch(e){} }
    if (serialPort) {
      try { await serialPort.close(); } catch(e){}
      serialPort = null;
    }
    
    const btn = document.getElementById("btnConnectSerial");
    if (btn) {
      btn.innerHTML = "🔌 Connect Arduino";
      btn.style.background = "var(--primary-blue)";
    }
    const indicator = document.getElementById("serialStatusIndicator");
    if (indicator) indicator.innerHTML = "Hardware Offline";
  }
}

// 5. PROCESS INCOMING TELEMETRY & ENFORCE SELECTED MODE RULES
// 5. PROCESS INCOMING TELEMETRY (STRICT ARDUINO PASSTHROUGH)
function processTelemetry(rawReading) {
  // 1. Only process strings that match the Arduino's exact output format
  if (!rawReading.startsWith("DATA,")) return; 

  const parts = rawReading.split(",");
  if (parts.length < 4) return;

  // 2. Extract the EXACT values computed by the Arduino
  const exactDistance = parseFloat(parts[1]);
  const exactBarrier = parseInt(parts[2]);
  const exactCondition = parts[3].trim().toUpperCase();

  if (isNaN(exactDistance)) return;

  // 3. Compute water level exactly as the Arduino does
  const maxDistance = 9.4;
  const exactWaterLevel = Math.max(0, maxDistance - exactDistance);

  // 4. Save Throttling (Prevents database spam while retaining real-time status changes)
  const currentTime = Date.now();
  const timeSinceLastSave = currentTime - lastDbSaveTime;
  const statusChanged = exactCondition !== lastSavedStatus;

  // Save if the condition changes (e.g., SAFE to WARNING) OR every 2 seconds
  if (statusChanged || timeSinceLastSave >= 2000) {
    lastSavedDistance = exactDistance;
    lastSavedStatus = exactCondition;
    lastDbSaveTime = currentTime;

    fetch("api.php?action=create_record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        DISTANCE: exactDistance,
        water_level: parseFloat(exactWaterLevel.toFixed(2)),
        barrier: exactBarrier,
        scondition: exactCondition
      })
    })
    .then(res => res.json())
    .then(data => {
      if (typeof loadHistory === "function") loadHistory();
      if (typeof fetchLatestData === "function") fetchLatestData();
    })
    .catch(err => console.error("Database save error:", err));
  }
}

// 6. HARDWARE DISCONNECT RESET CAPABILITY
navigator.serial.addEventListener("disconnect", (event) => {
  keepReading = false;
  serialPort = null;
  serialReader = null;
  const btn = document.getElementById("btnConnectSerial");
  if (btn) {
    btn.innerHTML = "🔌 Connect Arduino";
    btn.style.background = "var(--primary-blue)";
  }
  const indicator = document.getElementById("serialStatusIndicator");
  if (indicator) indicator.innerHTML = "Hardware Offline";
});

window.localToggleSerialConnection = window.toggleSerialLink;
// Highlight Auto Mode button state visually on interface boot up
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => updateStatusBarHighlights("AUTO"), 600);
});