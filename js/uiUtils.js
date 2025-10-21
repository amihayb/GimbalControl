/**
 * UI Utility Functions
 * This module contains all UI helper functions and DOM manipulation utilities
 * used throughout the application.
 */

/**
 * Show about dialog
 */
function about(){
  //alert('For support, contact me:\n\nAmihay Blau\nmail: amihay@blaurobotics.co.il\nPhone: +972-54-6668902');
  Swal.fire({
    title: "Lynx Control",
    html: "For support, contact me:<br><br> Amihay Blau <br> mail: amihay@blaurobotics.co.il <br> Phone: +972-54-6668902",
    icon: "info"
  });
}

// ==================== Table Functions ====================

/**
 * Draw a table with multiple columns of data
 * @param {Array} data - Array of objects containing table data
 */
function drawTable(data) {
  const table = document.getElementById('resultsTable');

  if (!table) {
    console.error('Table not found');
    return;
  }

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headers = ['Parameter', 'Traverese', 'Elevation', 'Success Criteria'];
  const headerRow = document.createElement('tr');

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.style.textAlign = 'center';  // Center-align headers
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  data.forEach(item => {
    const row = document.createElement('tr');
    const cells = [item.parameter, item.value1.toFixed(2), item.value2.toFixed(2), item.successCriteria];

    cells.forEach((cellValue, index) => {
      const td = document.createElement('td');
      td.textContent = cellValue;
      td.style.textAlign = 'center';  // Center-align cell values

      if (index > 0 && index < 3) { // Check only for Traverese and Elevation columns
        if (Math.abs(cellValue) > item.successCriteria) {
          td.style.color = 'red';
        } else {
          td.style.color = 'green';
        }
      }

      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}

/**
 * Draw a table with single column of data
 * @param {Array} data - Array of objects containing table data
 */
function drawTableOneCol(data) {
  const table = document.getElementById('resultsTable');

  if (!table) {
    console.error('Table not found');
    return;
  }

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headers = ['Parameter', 'Value', 'Success Criteria'];
  const headerRow = document.createElement('tr');

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.style.textAlign = 'center';  // Center-align headers
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  data.forEach(item => {
    const row = document.createElement('tr');
    const cells = [item.parameter, item.value1.toFixed(2), item.successCriteria.toFixed(2)];

    cells.forEach((cellValue, index) => {
      const td = document.createElement('td');
      td.textContent = cellValue;
      td.style.textAlign = 'center';  // Center-align cell values

      if (item.successMethod === 'bigger')
        success = item.value1 > item.successCriteria;

      if (item.successMethod === 'smaller')
        success = item.value1 < item.successCriteria;


      if (index == 1) { // Check only for value column
        if (success) {
          td.style.color = 'green';
        } else {
          td.style.color = 'red';
        }
      }

      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}

// ==================== UI Cleanup Functions ====================

/**
 * Clean up UI elements and reset display
 */
function cleanUp() {
  try {
    var explenation_text = document.getElementById("explenation_text");
    explenation_text.style.display = "none";

    const table = document.getElementById('resultsTable');
    // Remove any existing table in the container
    while (table.firstChild) {
      table.removeChild(table.firstChild);
    }

  } catch (error) { };
}

/**
 * Add labels line functionality
 */
function addLabelsLine() {

  if (document.getElementById("labelsNavBar").style.display == "none") {
    document.getElementById('labelsNavBar').style.display = 'flex';

    var SignalLabels = localStorage["SignalLabels"];
    if (SignalLabels != undefined) {
      document.getElementById("labelsInput").value = SignalLabels;
    }
    document.getElementById("labelsInput").addEventListener('input', updateValue);
  } else {
    document.getElementById('labelsNavBar').style.display = 'none';
  }

  function updateValue(e) {
    localStorage.setItem('SignalLabels', document.getElementById("labelsInput").value);
  }

  /*if ( !document.getElementById('labelsInput') ) {
 
  var label = document.createElement("label");
  label.innerHTML = "Labels: "
  label.htmlFor = "labels";
  var input = document.createElement('input');
  input.name = 'labelsInput';
  input.id = 'labelsInput';
  document.getElementById('labelsNavBar').appendChild(label);
  document.getElementById('labelsNavBar').appendChild(input);
  }
  else {
    document.getElementById('labelsInput').style.display = 'none';
 
  }*/
}

// ==================== Audio Functions ====================

/**
 * Play local audio tone
 */
function playLocalTone() {
  const audioElement = document.getElementById('localAudio');
  if (audioElement) {
    audioElement.currentTime = 0; // Reset to beginning
    audioElement.play().catch(e => console.log('Audio play failed:', e));
  }
}


// ==================== Input Validation Functions ====================

/**
 * Validate angle input
 * @param {HTMLElement} inputElement - The input element to validate
 */
function validateAngleInput(inputElement) {
  const value = parseFloat(inputElement.value);
  if (isNaN(value)) {   //|| value < -160 || value > 110
    inputElement.value = '0';
    Swal.fire({
      title: 'Invalid Angle',
      text: 'Angle must be a valid degree number.',
      icon: 'error'
    });
  }
}

/**
 * Validate velocity input
 * @param {HTMLElement} inputElement - The input element to validate
 */
function validateVelocityInput(inputElement) {
  const value = parseFloat(inputElement.value);
  if (isNaN(value) || value < 1 || value > 100) {
    inputElement.value = '30';
    Swal.fire({
      title: 'Invalid Velocity',
      text: 'Velocity must be between 1 and 100 deg/s',
      icon: 'error'
    });
  }
}

// ==================== Movement Control UI Functions ====================

/**
 * Initialize and display the movement control panel
 */
function MovementControl() {
  // Update button states
  document.querySelectorAll('.button').forEach(button => {
    button.classList.remove('active');
  });
  document.getElementById('movement-control-button').classList.add('active');

  // Hide the explanation text
  const explanationTextElement = document.getElementById('explenation_text');
  explanationTextElement.style.display = 'none';

  // Clear any existing content in plot area
  const plotAreaElement = document.getElementById('plot-area');
  plotAreaElement.innerHTML = '';

  // Remove existing movement control panel if it exists
  const existingPanel = document.getElementById('movement-control-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  // Create movement control sidebar panel
  const movementPanel = document.createElement('div');
  movementPanel.id = 'movement-control-panel';
  movementPanel.style.cssText = `
    height: 100%;
    width: 350px;
    position: fixed;
    z-index: 1;
    top: 0;
    left: 350px;
    color: #344563;
    background-color: #f7faff;
    overflow-x: hidden;
    overflow-y: auto;
    padding-left: 20px;
    padding-right: 20px;
    padding-top: 100px;
    padding-bottom: 20px;
    z-index: 5;
    box-shadow: 2px 0 5px rgba(0,0,0,0.5);
  `;

  movementPanel.classList.add('movement-panel');
  movementPanel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="margin: 0;">Movement Control</h1>
      <button onclick="closeMovementControl()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #344563;">×</button>
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
      <input type="number" id="movementVelocity" value="80" min="1" max="100" style="width: 60px;" />
    </div><br>
    
    <div class="target-control" style="display: flex; justify-content: center; margin-top: 10px;">
      <button onclick="sendToAngles()">Send to Angles</button>
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
    <h2 style="text-align: center;">Predefined Positions</h2>
    <div style="margin: 10px 0;">
      <button onclick="moveToPosition('home', 0, 0)">Home (0°, 0°)</button>
      <button onclick="moveToPosition('topRight', 200, 65)">Top Right (200°, 65°)</button>
      <button onclick="moveToPosition('topLeft', -200, 65)">Top Left (-200°, 65°)</button>
      <button onclick="moveToPosition('bottomRight', 200, -15)">Bottom Right (200°, -15°)</button>
      <button onclick="moveToPosition('bottomLeft', -200, -15)">Bottom Left (-200°, -15°)</button>
    </div>
    
    <hr>
    <h2 style="text-align: center;">Scenarios</h2>
    <div style="margin: 10px 0;">
      <button onclick="runScenario('scan')">Scan</button>
      <button onclick="runScenario('demo1')">Demo 1</button>
      <button onclick="runScenario('demo2')">Demo 2</button>
    </div>
    
    <hr>
    <h2 style="text-align: center;">Complex Scenarios</h2>
    <div style="margin: 10px 0;">
      <button onclick="openComplexScenario('sine')">Sine Move</button>
      <button onclick="openComplexScenario('linear')">Repeat Linear</button>
    </div>
    
  `;

  document.body.appendChild(movementPanel);
  
  // Adjust main content area to account for extended sidebar
  const explanationTextEl = document.getElementById('explenation_text');
  const plotAreaEl = document.getElementById('plot-area');
  explanationTextEl.style.marginLeft = '720px'; // 350px (main sidebar) + 350px (movement panel) + 20px gap
  plotAreaEl.style.marginLeft = '720px';
}

/**
 * Close the movement control panel and restore layout
 */
function closeMovementControl() {
  const movementPanel = document.getElementById('movement-control-panel');
  if (movementPanel) {
    movementPanel.remove();
    
    // Restore original layout
    const explanationTextRestore = document.getElementById('explenation_text');
    const plotAreaRestore = document.getElementById('plot-area');
    explanationTextRestore.style.marginLeft = '370px'; // Back to original: 350px sidebar + 20px gap
    plotAreaRestore.style.marginLeft = '370px';
  }
}

/**
 * Open complex scenario configuration dialog
 * @param {string} type - Scenario type ('sine' or 'linear')
 */
function openComplexScenario(type) {
  updateMovementStatus(`Opening ${type} scenario configuration...`, 'configuring');
  
  // Create submenu for complex scenarios
  const existingSubmenu = document.getElementById('complex-scenario-submenu');
  if (existingSubmenu) {
    existingSubmenu.remove();
  }

  const submenu = document.createElement('div');
  submenu.id = 'complex-scenario-submenu';
  submenu.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
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
  // Update button states
  document.querySelectorAll('.button').forEach(button => {
    button.classList.remove('active');
  });
  const installationButton = document.querySelector('a[onclick*="InstallationSetup"]');
  if (installationButton) {
    installationButton.classList.add('active');
  }

  // Hide the explanation text
  const explanationTextElement = document.getElementById('explenation_text');
  explanationTextElement.style.display = 'none';

  // Clear any existing content in plot area
  const plotAreaElement = document.getElementById('plot-area');
  plotAreaElement.innerHTML = '';

  // Remove existing installation setup panel if it exists
  const existingPanel = document.getElementById('installation-setup-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  // Create installation setup sidebar panel
  const installationPanel = document.createElement('div');
  installationPanel.id = 'installation-setup-panel';
  installationPanel.classList.add('movement-panel');
  installationPanel.style.cssText = `
    height: 100%;
    width: 350px;
    position: fixed;
    z-index: 1;
    top: 0;
    left: 350px;
    color: #344563;
    background-color: #f7faff;
    overflow-x: hidden;
    overflow-y: auto;
    padding-left: 20px;
    padding-right: 20px;
    padding-top: 100px;
    padding-bottom: 20px;
    z-index: 5;
    box-shadow: 2px 0 5px rgba(0,0,0,0.5);
  `;

  installationPanel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="margin: 0;">Installation Setup</h1>
      <button onclick="closeInstallationSetup()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #344563;">×</button>
    </div>
    
    <hr>
    <h2 style="text-align: center;">Setup Procedures</h2>
    <div style="margin: 10px 0;">
      <a class="button" onclick="setZeroAngles()">Set Zero Angles</a>
      <a class="button" onclick="commutation(1)">Commutation Traverse</a>
      <a class="button" onclick="commutation(2)">Commutation Elevation</a>
      <a class="button" onclick="saveElmo()">Save Elmo Settings</a>
    </div>
  `;

  document.body.appendChild(installationPanel);
  
  // Adjust main content area to account for extended sidebar
  const explanationTextEl = document.getElementById('explenation_text');
  const plotAreaEl = document.getElementById('plot-area');
  explanationTextEl.style.marginLeft = '720px'; // 350px (main sidebar) + 350px (installation panel) + 20px gap
  plotAreaEl.style.marginLeft = '720px';
}

/**
 * Close the installation setup panel and restore layout
 */
function closeInstallationSetup() {
  const installationPanel = document.getElementById('installation-setup-panel');
  if (installationPanel) {
    installationPanel.remove();
    
    // Restore original layout
    const explanationTextRestore = document.getElementById('explenation_text');
    const plotAreaRestore = document.getElementById('plot-area');
    explanationTextRestore.style.marginLeft = '370px'; // Back to original: 350px sidebar + 20px gap
    plotAreaRestore.style.marginLeft = '370px';
  }
}

// ==================== Input Value Functions ====================

/**
 * Update input element value with number conversion and scaling
 * @param {string} inputId - ID of the input element to update
 * @param {string|number} valueString - Value to set (will be converted to number)
 * @param {number} factor - Scaling factor (default: 10)
 */
async function updateInputValue(inputId, valueString, factor = 10, decimalPlaces = 1) {
  // Convert the valueString to a number
  const number = parseFloat(valueString);
  if (isNaN(number)) {
    // console.error(`Invalid number: "${valueString}"`);
    return;
  }

  // Calculate the new value
  const newValue = (number / factor).toFixed(decimalPlaces); 
  // Update the input box value
  const inputElement = document.getElementById(inputId);
  if (inputElement) {
    inputElement.value = newValue;
  } else {
    console.error(`Input with id "${inputId}" not found.`);
  }
}

// ==================== Exported Functions ====================

// Make functions available globally
window.drawTable = drawTable;
window.drawTableOneCol = drawTableOneCol;
window.cleanUp = cleanUp;
window.addLabelsLine = addLabelsLine;
window.playLocalTone = playLocalTone;
window.about = about;
window.validateAngleInput = validateAngleInput;
window.validateVelocityInput = validateVelocityInput;
window.MovementControl = MovementControl;
window.closeMovementControl = closeMovementControl;
window.openComplexScenario = openComplexScenario;
window.closeComplexScenario = closeComplexScenario;
window.InstallationSetup = InstallationSetup;
window.closeInstallationSetup = closeInstallationSetup;
window.updateInputValue = updateInputValue;
