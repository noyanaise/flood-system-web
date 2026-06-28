<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Smart Flood Barrier System</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style.css" />
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
  </head>
  <body id="appBody">
    <header class="app-header">
      <div class="header-brand">
        <h1>Smart Flood Barrier System</h1>

        <div class="user-profile-badge" style="display: flex; gap: 15px; align-items: center;">
          <span>
            Operator: <strong id="profileUsername">Loading...</strong> (<span id="profileRole">...</span>)
          </span>
          <span>System Status: <strong>Online</strong></span>
          <button onclick="handleSignOut()" style="background: #ef4444; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer;">
            Sign Out
          </button>
        </div>
      </div>

      <div id="statusBar">
        <button id="btnConnectSerial" onclick="toggleSerialLink()" style="background: var(--primary-blue); color: #fff; font-weight: 600; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; transition: background 0.2s;">
          🔌 Connect Arduino
        </button>

        <button onclick="send('A')">AUTO MODE</button>
        <button onclick="send('S')" style="background: #2ecc71; color: #000;">FORCE SAFE</button>
        <button onclick="send('D')" style="background: #e74c3c; color: #fff;">FORCE DANGER</button>
        
        <span id="connStatus" style="margin-left: 10px;">System Ready</span>
        <span id="serialStatusIndicator" style="margin-left: 10px; opacity: 0.8; font-size: 14px;"></span>
      </div>
    </header>

    <div id="dangerNotificationBanner" class="alert-banner status-danger-banner">
      ⚠️ CRITICAL WARNING: SYSTEM HAS DETECTED FLOOD DANGER LEVELS! TAKE IMMEDIATE SAFETY PRECAUTIONS!
    </div>
    <div id="warningNotificationBanner" class="alert-banner status-warning-banner">
      ⚠️ WARNING ALERT: Elevated water levels detected. System telemetry indicates approaching safety thresholds.
    </div>

    <div class="main-layout-wrapper">
      <aside class="sidebar-nav">
        <div class="sidebar-title">Navigation Menu</div>
        <nav class="tabs">
          <button class="tabButton active" onclick="showTab('recordsView', this)">Records Grid</button>
          <button class="tabButton" onclick="showTab('dashboardView', this)">Metrics Dashboard</button>
          <button class="tabButton" onclick="showTab('summaryView', this)">KPI Summary</button>
        </nav>
      </aside>

      <main class="content-display-view">
        
        <div id="recordsView" class="tabContent active">
          <h2 id="tableCaptionHeading" class="view-heading">Live System Logs</h2>
          <div class="filters">
            <label>Status:
              <select id="statusFilter">
                <option value="">All Rows</option>
                <option value="SAFE">SAFE</option>
                <option value="WARNING">WARNING</option>
                <option value="DANGER">DANGER</option>
              </select>
            </label>
            <label>Start: <input type="date" id="startDate" /></label>
            <label>End: <input type="date" id="endDate" /></label>
           

            <div class="action-utilities">
              <button id="trashToggleBtn" class="btn-trash" onclick="toggleTrashView()">View Trash Bin</button>
              <button onclick="openCreateModal()" class="btn-add-manual">+ Add Manual Log</button>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Distance</th>
                  <th>Barrier</th>
                  <th>Water Level</th>
                  <th>Status</th>
                  <th class="actions-col text-center">Action</th>
                </tr>
              </thead>
              <tbody id="log"></tbody>
            </table>
          </div>
        </div>

        <div id="dashboardView" class="tabContent">
          
          <div class="chartBox" id="dataInterpretationDashboard" style="margin-bottom: 20px; padding: 20px; border-left: 5px solid #0ea5e9; flex-direction: column; display: flex;">
            <h3 style="margin-bottom: 10px; font-size: 15px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px;">
              📈 Immediate Threat & Trend Analysis
            </h3>
            <p id="interpretationTextDashboard" style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
              Waiting for real-time telemetry array processing...
            </p>
          </div>

          <div class="charts">
            <div class="chartBox">
              <h3 style="margin-bottom: 10px;">Water Level (Live)</h3>
              <div class="canvas-container">
                <canvas id="waterChart"></canvas>
              </div>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-subtle);">
                <p id="waterChartInterp" style="font-size: 13px; color: #d1d5db; line-height: 1.5; margin: 0;">Analyzing liquid displacement trajectory...</p>
              </div>
            </div>
            
            <div class="chartBox">
              <h3 style="margin-bottom: 10px;">Status Distribution</h3>
              <div class="canvas-container">
                <canvas id="statusChart"></canvas>
              </div>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-subtle);">
                <p id="statusChartInterp" style="font-size: 13px; color: #d1d5db; line-height: 1.5; margin: 0;">Calculating hazard state ratios...</p>
              </div>
            </div>
            
            <div class="chartBox">
              <h3 style="margin-bottom: 10px;">Hardware Activations</h3>
              <div class="canvas-container">
                <canvas id="activityChart"></canvas>
              </div>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-subtle);">
                <p id="activityChartInterp" style="font-size: 13px; color: #d1d5db; line-height: 1.5; margin: 0;">Evaluating actuator load distribution...</p>
              </div>
            </div>
          </div>
        </div>

        <div id="summaryView" class="tabContent">
          <h2 class="view-heading">System KPI Summary Profile</h2>
          
          <div id="summaryBox" class="summary-container" style="margin-bottom: 20px;"></div>

          <div class="chartBox" id="dataInterpretationKPI" style="margin-top: 20px; padding: 20px; border-left: 5px solid #a855f7; flex-direction: column; display: flex;">
            <h3 style="margin-bottom: 10px; font-size: 15px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px;">
              📊 Strategic System Performance & Maintenance Insights
            </h3>
            <p id="interpretationTextKPI" style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
              Waiting for historical database record processing...
            </p>
          </div>

        </div>
      </main>
    </div>

    <div id="crudModal" class="modal">
      <div class="modal-content">
        <span class="close" onclick="closeCrudModal()">&times;</span>
        <h2 id="modalTitle">Add / Edit Record</h2>
        <form id="crudForm" onsubmit="handleCrudSubmit(event)">
          <input type="hidden" id="recordId" />
          <div class="form-group">
            <label for="recordDistance">Distance (cm):</label>
            <input type="number" id="recordDistance" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="recordWaterLevel">Water Level (cm):</label>
            <input type="number" id="recordWaterLevel" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="recordBarrier">Barrier Status:</label>
            <select id="recordBarrier">
              <option value="0">CLOSED</option>
              <option value="1">OPEN / DEPLOYED</option>
            </select>
          </div>
          <div class="form-group">
            <label for="recordCondition">Condition Status Flag:</label>
            <select id="recordCondition">
              <option value="SAFE">SAFE</option>
              <option value="WARNING">WARNING</option>
              <option value="DANGER">DANGER</option>
            </select>
          </div>
          <button type="submit" class="btn-save">Commit Record Metrics</button>
        </form>
      </div>
    </div>

    <footer class="app-footer">
      <p>&copy; 2026 Smart Flood Barrier System. All rights reserved.</p>
    </footer>

    <script src="auth-guard.js"></script>
    <script src="script.js"></script>
  </body>
</html>
