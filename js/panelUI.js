/**
 * Panel UI — Side-panel open/close functions.
 * Builds and destroys the Movement Control, Installation Setup, and ATP side panels,
 * and adjusts content-area margins so nothing is hidden behind the panels.
 * Depends on: uiUtils.js, atpTests.js (runIBIT, runSineTest, runFrictionTest),
 *             movementControl.js (sendToAngles, joystickCmd, moveToPosition, runScenario,
 *                                  setZeroAngles, commutation, saveElmo, sendVelocity)
 */

// ==================== Movement Control UI Functions ====================

/**
 * Initialize and display the movement control panel
 */
function MovementControl() {
  document.querySelectorAll('.button').forEach(button => {
    button.classList.remove('active');
  });
  document.getElementById('movement-control-button').classList.add('active');

  const existingPanel = document.getElementById('movement-control-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  const movementPanel = document.createElement('div');
  movementPanel.id = 'movement-control-panel';
  movementPanel.classList.add('movement-panel');
  movementPanel.innerHTML = `
    <div class="panel-header">
      <h1>Movement Control</h1>
      <button class="panel-close-btn" onclick="closeMovementControl()">×</button>
    </div>
    
    <!-- Angle Control Section -->
    <div class="target-control" title="Traverse angle control">
      <label for="trAngle">TR [deg]</label>
      <input type="number" id="trAngle" value="0" step="0.1" style="width: 60px;" />
    </div><br>
    
    <div class="target-control" title="Elevation angle control">
      <label for="elAngle">EL [deg]</label>
      <input type="number" id="elAngle" value="0" step="0.1" style="width: 60px;" />
    </div><br>
    
    <div class="target-control" title="Movement velocity">
      <label for="movementVelocity">Velocity [deg/s]</label>
      <input type="number" id="movementVelocity" value="80" min="0" max="80" style="width: 60px;" />
    </div><br>
    
    <div class="target-control" style="display: flex; justify-content: center; margin-top: 10px;">
      <button onclick="sendToAngles()" style="background-color: var(--color-btn-active); color: var(--color-text-active);">Send to Angles</button>
    </div><br>
    
    <!-- Joystick Control -->
    <div style="display: flex; justify-content: center; align-items: center; margin: 20px 0;">
      <div id="joystick" style="width: 120px; height: 120px;">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:rgb(16,16,16);stop-opacity:1" />
              <stop offset="100%" style="stop-color:rgb(240,240,240);stop-opacity:1" />
            </linearGradient>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:rgb(240,240,240);stop-opacity:1" />
              <stop offset="100%" style="stop-color:rgb(16,16,16);stop-opacity:1" />
            </linearGradient>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:rgb(168,168,168);stop-opacity:1" />
              <stop offset="100%" style="stop-color:rgb(239,239,239);stop-opacity:1" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#grad1)" />
          <circle cx="50" cy="50" r="47" fill="url(#grad2)" stroke="black" stroke-width="1.5px" />
          <circle cx="50" cy="50" r="44" fill="url(#grad3)" />
          <circle cx="50" cy="50" r="20" fill="#cccccc" stroke="black" stroke-width="1px"
            onclick="joystickCmd('CENTER');" />
          <path d="M50,14 54,22 46,22Z" fill="rgba(0,0,0,0.8)" onclick="joystickCmd('UP')" />
          <path d="M50,86 54,78 46,78Z" fill="rgba(0,0,0,0.8)" onclick="joystickCmd('DOWN')" />
          <path d="M14,50 22,54 22,46Z" fill="rgba(0,0,0,0.8)" onclick="joystickCmd('LEFT')" />
          <path d="M86,50 78,54 78,46Z" fill="rgba(0,0,0,0.8)" onclick="joystickCmd('RIGHT')" />
        </svg>
      </div>
    </div>

    <hr>
    <h2>Predefined Positions</h2>
    <div class="target-control" style="display: flex; justify-content: center; margin-top: 10px; gap: 10px;">
      <button onclick="moveToPosition('topLeft', -200, 65)" title="Top Left (-200°, 65°)" style="background-color: var(--color-btn-active); color: var(--color-text-active);"><i class="fa fa-arrow-up" style="transform: rotate(-45deg); display: inline-block;"></i></button>
      <button onclick="moveToPosition('topRight', 200, 65)" title="Top Right (200°, 65°)" style="background-color: var(--color-btn-active); color: var(--color-text-active);"><i class="fa fa-arrow-up" style="transform: rotate(45deg); display: inline-block;"></i></button>
    </div><br>
    <div class="target-control" style="display: flex; justify-content: center; margin-top: 10px;">
      <button onclick="moveToPosition('home', 0, 0)" title="Home (0°, 0°)" style="background-color: var(--color-btn-active); color: var(--color-text-active);"><i class="fa fa-home"></i></button>
    </div><br>
    <div class="target-control" style="display: flex; justify-content: center; margin-top: 10px; gap: 10px;">
      <button onclick="moveToPosition('bottomLeft', -200, -15)" title="Bottom Left (-200°, -15°)" style="background-color: var(--color-btn-active); color: var(--color-text-active);"><i class="fa fa-arrow-down" style="transform: rotate(45deg); display: inline-block;"></i></button>
      <button onclick="moveToPosition('bottomRight', 200, -15)" title="Bottom Right (200°, -15°)" style="background-color: var(--color-btn-active); color: var(--color-text-active);"><i class="fa fa-arrow-down" style="transform: rotate(-45deg); display: inline-block;"></i></button>
    </div><br>
    
    <hr>
    <h2>Scenarios</h2>
    <div class="target-control" style="display: flex; justify-content: center; margin-top: 10px; gap: 10px;">
      <button onclick="runScenario('scan')" style="background-color: var(--color-btn-active); color: var(--color-text-active);">Scan</button>
      <button onclick="runScenario('demo1')" style="background-color: var(--color-btn-active); color: var(--color-text-active);">Demo 1</button>
      <button onclick="runScenario('demo2')" style="background-color: var(--color-btn-active); color: var(--color-text-active);">Demo 2</button>
    </div><br>
    
    <hr>
    <h2>Complex Scenarios</h2>
    <div style="margin: 10px 0;">
      <button onclick="openComplexScenario('sine')">Sine Move</button>
      <button onclick="openComplexScenario('linear')">Repeat Linear</button>
    </div>
    
  `;

  document.body.appendChild(movementPanel);

  const velInput = document.getElementById('movementVelocity');
  velInput.addEventListener('change', () => sendVelocity(velInput.value));
  velInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendVelocity(velInput.value); });

  // Adjust main content area to account for extended sidebar
  const explanationTextEl = document.getElementById('explenation_text');
  const plotAreaEl = document.getElementById('plot-area');
  const resultsTableEl = document.getElementById('resultsTable');
  explanationTextEl.style.marginLeft = '720px'; // 350px (main sidebar) + 350px (movement panel) + 20px gap
  plotAreaEl.style.marginLeft = '720px';
  resultsTableEl.style.marginLeft = '720px';
}

/**
 * Close the movement control panel and restore layout
 */
function closeMovementControl() {
  const movementPanel = document.getElementById('movement-control-panel');
  if (movementPanel) {
    movementPanel.remove();

    const explanationTextRestore = document.getElementById('explenation_text');
    const plotAreaRestore = document.getElementById('plot-area');
    const resultsTableRestore = document.getElementById('resultsTable');
    explanationTextRestore.style.marginLeft = '370px'; // Back to original: 350px sidebar + 20px gap
    plotAreaRestore.style.marginLeft = '370px';
    resultsTableRestore.style.marginLeft = '370px';
  }
}

/**
 * Open complex scenario configuration dialog
 * @param {string} type - Scenario type ('sine' or 'linear')
 */
function openComplexScenario(type) {
  updateMovementStatus(`Opening ${type} scenario configuration...`, 'configuring');

  const existingSubmenu = document.getElementById('complex-scenario-submenu');
  if (existingSubmenu) {
    existingSubmenu.remove();
  }

  const submenu = document.createElement('div');
  submenu.id = 'complex-scenario-submenu';
  submenu.classList.add('scenario-submenu');
  submenu.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 1000;
    min-width: 400px;
  `;

  if (type === 'sine') {
    submenu.innerHTML = `
      <h3>Sine Move Configuration</h3>
      <div style="margin: 15px 0;">
        <label>Amplitude [deg]:</label>
        <input type="number" id="sineAmplitude" value="30" style="width: 100%; padding: 8px; margin: 5px 0;">
      </div>
      <div style="margin: 15px 0;">
        <label>Frequency [Hz]:</label>
        <input type="number" id="sineFrequency" value="0.1" step="0.01" style="width: 100%; padding: 8px; margin: 5px 0;">
      </div>
      <div style="margin: 15px 0;">
        <label>Duration [sec]:</label>
        <input type="number" id="sineDuration" value="60" style="width: 100%; padding: 8px; margin: 5px 0;">
      </div>
      <div style="display: flex; gap: 10px; justify-content: end; margin-top: 20px;">
        <button onclick="closeComplexScenario()" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
        <button onclick="startSineMove()" style="padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Start</button>
      </div>
    `;
  } else if (type === 'linear') {
    submenu.innerHTML = `
      <h3>Repeat Linear Move Configuration</h3>
      <div style="margin: 15px 0;">
        <label>Start Angle [deg]:</label>
        <input type="number" id="linearStart" value="-30" style="width: 100%; padding: 8px; margin: 5px 0;">
      </div>
      <div style="margin: 15px 0;">
        <label>End Angle [deg]:</label>
        <input type="number" id="linearEnd" value="30" style="width: 100%; padding: 8px; margin: 5px 0;">
      </div>
      <div style="margin: 15px 0;">
        <label>Repetitions:</label>
        <input type="number" id="linearReps" value="5" min="1" style="width: 100%; padding: 8px; margin: 5px 0;">
      </div>
      <div style="margin: 15px 0;">
        <label>Velocity [deg/s]:</label>
        <input type="number" id="linearVelocity" value="20" style="width: 100%; padding: 8px; margin: 5px 0;">
      </div>
      <div style="display: flex; gap: 10px; justify-content: end; margin-top: 20px;">
        <button onclick="closeComplexScenario()" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
        <button onclick="startLinearMove()" style="padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Start</button>
      </div>
    `;
  }

  document.body.appendChild(submenu);
}

/**
 * Close complex scenario configuration dialog
 */
function closeComplexScenario() {
  const submenu = document.getElementById('complex-scenario-submenu');
  if (submenu) {
    submenu.remove();
  }
}

// ==================== Installation Setup UI Functions ====================

/**
 * Initialize and display the installation setup panel
 */
function InstallationSetup() {
  document.querySelectorAll('.button').forEach(button => {
    button.classList.remove('active');
  });
  const installationButton = document.querySelector('a[onclick*="InstallationSetup"]');
  if (installationButton) {
    installationButton.classList.add('active');
  }

  const existingPanel = document.getElementById('installation-setup-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  const installationPanel = document.createElement('div');
  installationPanel.id = 'installation-setup-panel';
  installationPanel.classList.add('movement-panel');

  installationPanel.innerHTML = `
    <div class="panel-header">
      <h1>Installation Setup</h1>
      <button class="panel-close-btn" onclick="closeInstallationSetup()">×</button>
    </div>
    
    <hr>
    <h2>Setup Procedures</h2>
    <div style="margin: 10px 0;">
      <a class="button" onclick="setZeroAngles('tr')">Set Zero TR</a>
      <a class="button" onclick="setZeroAngles('el')">Set Zero EL</a>
      <a class="button" id="btn-commutation-1" onclick="commutation(1)">Commutation Traverse</a>
      <a class="button" id="btn-commutation-2" onclick="commutation(2)">Commutation Elevation</a>
      <a class="button" onclick="saveElmo()">Save Elmo Settings</a>
    </div>
  `;

  document.body.appendChild(installationPanel);

  // Adjust main content area to account for extended sidebar
  const explanationTextEl = document.getElementById('explenation_text');
  const plotAreaEl = document.getElementById('plot-area');
  const resultsTableEl = document.getElementById('resultsTable');
  explanationTextEl.style.marginLeft = '720px'; // 350px (main sidebar) + 350px (installation panel) + 20px gap
  plotAreaEl.style.marginLeft = '720px';
  resultsTableEl.style.marginLeft = '720px';
}

/**
 * Close the installation setup panel and restore layout
 */
function closeInstallationSetup() {
  const installationPanel = document.getElementById('installation-setup-panel');
  if (installationPanel) {
    installationPanel.remove();

    const explanationTextRestore = document.getElementById('explenation_text');
    const plotAreaRestore = document.getElementById('plot-area');
    const resultsTableRestore = document.getElementById('resultsTable');
    explanationTextRestore.style.marginLeft = '370px'; // Back to original: 350px sidebar + 20px gap
    plotAreaRestore.style.marginLeft = '370px';
    resultsTableRestore.style.marginLeft = '370px';
  }
}

// ==================== ATP UI Functions ====================

/**
 * Initialize and display the ATP (Acceptance Test Procedure) panel
 */
function ATP() {
  document.querySelectorAll('.button').forEach(button => {
    button.classList.remove('active');
  });
  const atpButton = document.querySelector('a[onclick*="ATP"]');
  if (atpButton) {
    atpButton.classList.add('active');
  }

  const existingPanel = document.getElementById('atp-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  const atpPanel = document.createElement('div');
  atpPanel.id = 'atp-panel';
  atpPanel.classList.add('movement-panel');

  atpPanel.innerHTML = `
    <div class="panel-header">
      <h1>ATP</h1>
      <button class="panel-close-btn" onclick="closeATP()">×</button>
    </div>
    
    <hr>
    <h2>Test Procedures</h2>
    <div style="margin: 10px 0;">
      <a class="button" id="btn-atp-ibit" onclick="runIBIT()">IBIT</a>
      <a class="button" id="btn-atp-sine" onclick="runSineTest()">Sine Test</a>
      <a class="button" id="btn-atp-friction" onclick="runFrictionTest()">Friction Test</a>
    </div>
  `;

  document.body.appendChild(atpPanel);

  // Adjust main content area to account for extended sidebar
  const explanationTextEl = document.getElementById('explenation_text');
  const plotAreaEl = document.getElementById('plot-area');
  const resultsTableEl = document.getElementById('resultsTable');
  explanationTextEl.style.marginLeft = '720px';
  plotAreaEl.style.marginLeft = '720px';
  resultsTableEl.style.marginLeft = '720px';
}

/**
 * Close the ATP panel and restore layout
 */
function closeATP() {
  const atpPanel = document.getElementById('atp-panel');
  if (atpPanel) {
    atpPanel.remove();

    const explanationTextRestore = document.getElementById('explenation_text');
    const plotAreaRestore = document.getElementById('plot-area');
    const resultsTableRestore = document.getElementById('resultsTable');
    explanationTextRestore.style.marginLeft = '370px';
    plotAreaRestore.style.marginLeft = '370px';
    resultsTableRestore.style.marginLeft = '370px';
  }
}

/**
 * Open the View Telemetry side panel with file choosers for each ATP test type.
 * When all 3 files are loaded, a Print to PDF button becomes available.
 */
function ViewTelemetry() {
  document.querySelectorAll('.button').forEach(button => {
    button.classList.remove('active');
  });
  const telemetryButton = document.querySelector('a[onclick*="ViewTelemetry"]');
  if (telemetryButton) telemetryButton.classList.add('active');

  const existingPanel = document.getElementById('view-telemetry-panel');
  if (existingPanel) {
    existingPanel.remove();
    const explanationTextEl = document.getElementById('explenation_text');
    const plotAreaEl = document.getElementById('plot-area');
    const resultsTableEl = document.getElementById('resultsTable');
    explanationTextEl.style.marginLeft = '370px';
    plotAreaEl.style.marginLeft = '370px';
    resultsTableEl.style.marginLeft = '370px';
    if (telemetryButton) telemetryButton.classList.remove('active');
    return;
  }

  // Reset loaded-test tracking each time the panel opens fresh
  if (typeof resetVtLoadedTests === 'function') resetVtLoadedTests();

  const vtPanel = document.createElement('div');
  vtPanel.id = 'view-telemetry-panel';
  vtPanel.classList.add('movement-panel');

  vtPanel.innerHTML = `
    <div class="panel-header">
      <h1>ATP Results</h1>
      <button class="panel-close-btn" onclick="closeViewTelemetry()">×</button>
    </div>

    <div class="vt-meta-fields">
      <label class="vt-meta-label">Gimbal Number</label>
      <input type="text" id="vt-gimbal-no" class="vt-meta-input" placeholder="e.g. SN-0042">

      <label class="vt-meta-label">Operator</label>
      <input type="text" id="vt-operator" class="vt-meta-input" placeholder="Name">

      <label class="vt-meta-label">Date / Time</label>
      <input type="text" id="vt-datetime" class="vt-meta-input" placeholder="DD/MM/YYYY HH:MM">

      <label class="vt-meta-label">Remarks</label>
      <textarea id="vt-remarks" class="vt-meta-textarea" placeholder="Optional..."></textarea>
    </div>

    <hr>
    <h2>IBIT</h2>
    <div class="vt-test-section">
      <input type="file" id="vt-file-ibit" accept=".csv" style="display:none">
      <div class="vt-row">
        <span class="vt-icon-btn vt-choose-btn" onclick="document.getElementById('vt-file-ibit').click()" title="Load file">
          <i class="fa fa-folder-open"></i>
        </span>
        <span id="vt-filename-ibit" class="vt-filename-label">No file chosen</span>
        <span class="vt-icon-btn vt-show-btn vt-disabled" id="vt-show-ibit" onclick="vtShowIbitResults()" title="Show Results">
          <i class="fa fa-bar-chart"></i>
        </span>
      </div>
    </div>

    <hr>
    <h2>Sine Test</h2>
    <div class="vt-test-section">
      <input type="file" id="vt-file-sine" accept=".csv" style="display:none">
      <div class="vt-row">
        <span class="vt-icon-btn vt-choose-btn" onclick="document.getElementById('vt-file-sine').click()" title="Load file">
          <i class="fa fa-folder-open"></i>
        </span>
        <span id="vt-filename-sine" class="vt-filename-label">No file chosen</span>
        <span class="vt-icon-btn vt-show-btn vt-disabled" id="vt-show-sine" onclick="vtShowSineResults()" title="Show Results">
          <i class="fa fa-bar-chart"></i>
        </span>
      </div>
    </div>

    <hr>
    <h2>Friction Test</h2>
    <div class="vt-test-section">
      <input type="file" id="vt-file-friction" accept=".csv" style="display:none">
      <div class="vt-row">
        <span class="vt-icon-btn vt-choose-btn" onclick="document.getElementById('vt-file-friction').click()" title="Load file">
          <i class="fa fa-folder-open"></i>
        </span>
        <span id="vt-filename-friction" class="vt-filename-label">No file chosen</span>
        <span class="vt-icon-btn vt-show-btn vt-disabled" id="vt-show-friction" onclick="vtShowFrictionResults()" title="Show Results">
          <i class="fa fa-bar-chart"></i>
        </span>
      </div>
    </div>

    <hr>
    <a class="button vt-print-btn" id="btn-print-pdf" onclick="printAtpReport()" style="display:none;">
      Print to PDF
    </a>
  `;

  document.body.appendChild(vtPanel);

  // Pre-fill datetime in DD/MM/YYYY HH:MM format
  const dtInput = document.getElementById('vt-datetime');
  if (dtInput) {
    const now  = new Date();
    const dd   = String(now.getDate()).padStart(2, '0');
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh   = String(now.getHours()).padStart(2, '0');
    const min  = String(now.getMinutes()).padStart(2, '0');
    dtInput.value = `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  // Wire each file input: update the filename label, enable the Show Results button,
  // then hand the file to the existing readFile loader which routes to handleAtpCsvLoaded.
  ['ibit', 'sine', 'friction'].forEach(testType => {
    const input   = document.getElementById(`vt-file-${testType}`);
    const label   = document.getElementById(`vt-filename-${testType}`);
    const showBtn = document.getElementById(`vt-show-${testType}`);

    input.addEventListener('change', function () {
      if (!this.files[0]) return;
      label.textContent = this.files[0].name;
      showBtn.classList.remove('vt-disabled');
      readFile(this.files[0]);
    });
  });

  // Adjust main content area to account for the new side panel
  const explanationTextEl = document.getElementById('explenation_text');
  const plotAreaEl = document.getElementById('plot-area');
  const resultsTableEl = document.getElementById('resultsTable');
  explanationTextEl.style.marginLeft = '720px';
  plotAreaEl.style.marginLeft = '720px';
  resultsTableEl.style.marginLeft = '720px';
}

/**
 * Close the View Telemetry panel and restore layout
 */
function closeViewTelemetry() {
  const vtPanel = document.getElementById('view-telemetry-panel');
  if (vtPanel) {
    vtPanel.remove();

    const explanationTextEl = document.getElementById('explenation_text');
    const plotAreaEl = document.getElementById('plot-area');
    const resultsTableEl = document.getElementById('resultsTable');
    explanationTextEl.style.marginLeft = '370px';
    plotAreaEl.style.marginLeft = '370px';
    resultsTableEl.style.marginLeft = '370px';

    document.querySelectorAll('.button').forEach(button => {
      button.classList.remove('active');
    });
  }
}

// ==================== Exported Functions ====================

window.MovementControl        = MovementControl;
window.closeMovementControl   = closeMovementControl;
window.openComplexScenario    = openComplexScenario;
window.closeComplexScenario   = closeComplexScenario;
window.InstallationSetup      = InstallationSetup;
window.closeInstallationSetup = closeInstallationSetup;
window.ATP                    = ATP;
window.closeATP               = closeATP;
window.ViewTelemetry          = ViewTelemetry;
window.closeViewTelemetry     = closeViewTelemetry;
