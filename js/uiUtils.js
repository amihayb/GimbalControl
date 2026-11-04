/**
 * UI Utility Functions
 * Small DOM helpers, table renderers, audio, input validation, and live-data display.
 * Depends on: Swal (SweetAlert2)
 */

/**
 * Show about dialog
 */
function about(){
  Swal.fire({
    title: "Lynx Control",
    html: "For support, contact me:<br><br> Amihay Blau <br> mail: amihay@blaurobotics.co.il <br> Phone: +972-54-6668902",
    icon: "info"
  });
}

// ==================== Table Functions ====================

/**
 * Draw a pass/fail table with Traverse and Elevation columns into #resultsTable.
 * @param {Array} data - Array of { parameter, value1, value2, successCriteria, successMethod? }
 */
function drawTable(data) {
  const container = document.getElementById('resultsTable');

  if (!container) {
    console.error('Table not found');
    return;
  }

  while (container.firstChild) container.removeChild(container.firstChild);

  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headers = ['Parameter', 'Traverese', 'Elevation', 'Success Criteria'];
  const headerRow = document.createElement('tr');

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.style.textAlign = 'center';
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  data.forEach(item => {
    const row = document.createElement('tr');
    const cells = [item.parameter, item.value1, item.value2, item.successCriteria];

    cells.forEach((cellValue, index) => {
      const td = document.createElement('td');
      td.textContent = typeof cellValue === 'number' ? cellValue.toFixed(2) : cellValue;
      td.style.textAlign = 'center';

      if (index > 0 && index < 3) {
        const value = index === 1 ? item.value1 : item.value2;
        const success = item.successMethod === 'bigger'
          ? value > item.successCriteria
          : item.successMethod === 'smaller'
            ? value < item.successCriteria
            : Math.abs(value) <= item.successCriteria;
        td.style.color = success ? 'green' : 'red';
      }

      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

/**
 * Draw a single-value pass/fail table into #resultsTable.
 * @param {Array} data - Array of { parameter, value1, successCriteria, successMethod }
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
    th.style.textAlign = 'center';
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
      td.style.textAlign = 'center';

      if (item.successMethod === 'bigger')
        success = item.value1 > item.successCriteria;

      if (item.successMethod === 'smaller')
        success = item.value1 < item.successCriteria;

      if (index == 1) {
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
}

// ==================== Audio Functions ====================

/**
 * Play local audio tone
 */
function playLocalTone() {
  const audioElement = document.getElementById('localAudio');
  if (audioElement) {
    audioElement.currentTime = 0;
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
  if (isNaN(value)) {
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

// ==================== Input Value Functions ====================

/**
 * Poll until the gimbal reaches the target position within tolerance, or timeout.
 * Reads live position from PositionInputTR / PositionInputEL (already in degrees).
 * @param {number} targetTr - Target traverse angle [deg]
 * @param {number} targetEl - Target elevation angle [deg]
 * @param {number} tolerance - Acceptable error [deg] (default ARRIVAL_TOLERANCE_DEG)
 * @param {number} timeoutMs - Max wait time in ms (default 30000)
 */
async function waitForPosition(targetTr, targetEl, tolerance = ARRIVAL_TOLERANCE_DEG, timeoutMs = 30000) {
  const pollInterval = 200;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    const currentTr = parseFloat(document.getElementById('PositionInputTR')?.value);
    const currentEl = parseFloat(document.getElementById('PositionInputEL')?.value);
    if (!isNaN(currentTr) && !isNaN(currentEl) &&
        Math.abs(currentTr - targetTr) <= tolerance &&
        Math.abs(currentEl - targetEl) <= tolerance) {
      console.log(`Reached target TR=${targetTr}°, EL=${targetEl}°`);
      return true;
    }
  }
  console.warn(`Timeout waiting for TR=${targetTr}°, EL=${targetEl}°`);
  return false;
}

/**
 * Update input element value with number conversion and scaling
 * @param {string} inputId - ID of the input element to update
 * @param {string|number} valueString - Value to set (will be converted to number)
 * @param {number} factor - Scaling factor (default: 10)
 * @param {number} decimalPlaces - Decimal places for display (default: 1)
 */
async function updateInputValue(inputId, valueString, factor = 10, decimalPlaces = 1) {
  const number = parseFloat(valueString);
  if (isNaN(number)) {
    return;
  }

  const newValue = (number / factor).toFixed(decimalPlaces);
  const inputElement = document.getElementById(inputId);
  if (inputElement) {
    inputElement.value = newValue;
  } else {
    console.error(`Input with id "${inputId}" not found.`);
  }
}

// ==================== Error Bits Display ====================

const ERROR_BIT_NAMES = {
  0:  'Software error',
  1:  'Motor TR error',
  2:  'Motor EL error',
  3:  'Motor TR Off in spite of command',
  4:  'Motor EL Off in spite of command',
  5:  'No movement TR (motor on, cmd sent)',
  6:  'No movement EL (motor on, cmd sent)',
  7:  'TR position error > 1°',
  8:  'EL position error > 1°',
  9:  'Input message timeout',
  10: 'Input message checksum error',
};

/**
 * Update the error bits display from R1[9]
 * Each bit being 1 means an error; 0 means OK.
 * @param {number|null} errBits - UINT32 value from R1[9]
 */
function updateErrorBits(errBits) {
  const el = document.getElementById('errorBitsDisplay');
  if (!el) return;
  if (errBits === null || errBits === undefined || isNaN(errBits)) {
    el.textContent = '';
    return;
  }
  const bits = errBits >>> 0; // treat as UINT32
  if (bits === 0) {
    el.innerHTML = '<span style="color:#28a745;">OK</span>';
  } else {
    let html = '';
    for (let b = 0; b < 32; b++) {
      if (bits & (1 << b)) {
        const name = ERROR_BIT_NAMES[b] || `Bit ${b}`;
        html += `<div style="color:#dc3545;">• [${b}] ${name}</div>`;
      }
    }
    el.innerHTML = html;
  }
}

// ==================== Exported Functions ====================

window.about               = about;
window.drawTable           = drawTable;
window.drawTableOneCol     = drawTableOneCol;
window.cleanUp             = cleanUp;
window.addLabelsLine       = addLabelsLine;
window.playLocalTone       = playLocalTone;
window.validateAngleInput  = validateAngleInput;
window.validateVelocityInput = validateVelocityInput;
window.waitForPosition     = waitForPosition;
window.updateInputValue    = updateInputValue;
window.updateErrorBits     = updateErrorBits;
