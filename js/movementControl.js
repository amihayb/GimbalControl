/**
 * Movement Control Module
 * This module handles all gimbal movement and control scenarios
 * for the gimbal control application.
 */

// ==================== Movement Control Business Logic ====================

let currentVelocity = 20;

function setMovementVelocity(v) {
  currentVelocity = v;
  const el = document.getElementById('movementVelocity');
  if (el) el.value = v;
}

// ==================== Validation Functions ====================

/**
 * Validate prerequisites for movement operations
 * @returns {boolean} True if all prerequisites are met
 */
function validateMovementPrerequisites() {
  // Check serial connection
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return false;
  }

  // Check motor status
  const motorToggle = document.getElementById('motor-toggle');
  if (!motorToggle || !motorToggle.checked) {
    updateMovementStatus('Error: Motors are off', 'error');
    return false;
  }

  return true;
}

// ==================== Core Movement Functions ====================

/**
 * Send angle commands to the gimbal
 */
function sendToAngles() {
  console.log('sendToAngles function called');
  
  if (!validateMovementPrerequisites()) {
    console.log('Movement prerequisites not met');
    return;
  }

  const trAngle = parseFloat(document.getElementById('trAngle').value) || 0;
  const elAngle = parseFloat(document.getElementById('elAngle').value) || 0;
  const velocity = parseFloat(document.getElementById('movementVelocity').value) || 20;
  
  console.log(`Angles: TR=${trAngle}, EL=${elAngle}, Velocity=${velocity}`);

  updateMovementStatus(`Moving to TR: ${trAngle}°, EL: ${elAngle}°, Velocity: ${velocity}°/s`, 'moving');
  
  // Send commands to move both axes
  const velCmd = Math.floor(velocity * deg2ticks);
  sendMsg(`R1[1]=1; SP=${velCmd}; R1[11]=${trAngle}; R1[21]=${elAngle};`);
}

/**
 * Move to a predefined position
 * @param {string} position - Position name
 * @param {number} tr - Traverse angle
 * @param {number} el - Elevation angle
 */
function moveToPosition(position, tr, el) {
  // Update UI inputs if they exist (movement panel may not be open)
  const trInput = document.getElementById('trAngle');
  const elInput = document.getElementById('elAngle');
  if (trInput) trInput.value = tr;
  if (elInput) elInput.value = el;

  const velocity = parseFloat(document.getElementById('movementVelocity')?.value) || currentVelocity;
  const velCmd = Math.floor(velocity * deg2ticks);
  sendMsg(`R1[1]=1; SP=${velCmd}; R1[11]=${tr}; R1[21]=${el};`);
  updateMovementStatus(`Moving to ${position} position`, 'moving');
}

// ==================== Scenario Functions ====================

/**
 * Run predefined movement scenarios
 * @param {string} scenario - Scenario name ('scan', 'demo1', 'demo2')
 */
function runScenario(scenario) {
  if (!validateMovementPrerequisites()) {
    return;
  }

  switch(scenario) {
    case 'scan':
      updateMovementStatus('Running scan scenario...', 'running');
      sendMsg('R1[12]=0; R1[22]=0; R1[11]=0; R1[21]=0; R1[1]=12;');
      console.log('Running scan scenario');
      break;
    case 'demo1':
      updateMovementStatus('Running demo 1 scenario...', 'running');
      sendMsg('R1[16]=2; R1[17]=100; R1[18]=90; R1[26]=5; R1[27]=30; R1[28]=10; R1[1]=13;');
      console.log('Running demo 1 scenario');
      break;
    case 'demo2':
      updateMovementStatus('Running demo 2 scenario...', 'running');
      sendMsg('R1[16]=20; R1[17]=30; R1[18]=-30; R1[26]=10; R1[27]=30; R1[28]=30; R1[1]=13;');
      console.log('Running demo 2 scenario');
      break;
  }
}

// ==================== Complex Movement Functions ====================

/**
 * Start sine wave movement
 */
function startSineMove() {
  const amplitude = parseFloat(document.getElementById('sineAmplitude').value);
  const frequency = parseFloat(document.getElementById('sineFrequency').value);
  const duration = parseFloat(document.getElementById('sineDuration').value);
  
  updateMovementStatus(`Starting sine move: ${amplitude}° amplitude, ${frequency}Hz, ${duration}s`, 'running');
  closeComplexScenario();
  // Implement sine move logic here
  console.log(`Starting sine move: ${amplitude}°, ${frequency}Hz, ${duration}s`);
}

/**
 * Start linear movement repetition
 */
function startLinearMove() {
  const start = parseFloat(document.getElementById('linearStart').value);
  const end = parseFloat(document.getElementById('linearEnd').value);
  const reps = parseInt(document.getElementById('linearReps').value);
  const velocity = parseFloat(document.getElementById('linearVelocity').value);
  
  updateMovementStatus(`Starting linear move: ${start}° to ${end}°, ${reps} reps, ${velocity}°/s`, 'running');
  closeComplexScenario();
  // Implement linear move logic here
  console.log(`Starting linear move: ${start}° to ${end}°, ${reps} reps, ${velocity}°/s`);
}

// ==================== Joystick Control Functions ====================

/**
 * Handle joystick commands
 * @param {string} direction - Joystick direction ('UP', 'DOWN', 'LEFT', 'RIGHT', 'CENTER')
 */
function joystickCmd(direction) {
  if (!validateMovementPrerequisites()) {
    return;
  }

  playLocalTone();

  switch (direction) {
    case "UP":
      joystickEl++;
      break;
    case "DOWN":
      joystickEl--;
      break;
    case "RIGHT":
      joystickTr++;
      break;
    case "LEFT":
      joystickTr--;
      break;
    case "CENTER":
      joystickTr = 0;
      joystickEl = 0;
  }

  sendMsg(`R1[12]=${joystickTr}; R1[22]=${joystickEl}`);
}

// ==================== Installation Setup Functions ====================


/**
 * Set zero angle for the specified axis
 * @param {string} ax - 'tr' for traverse (S1) or 'el' for elevation (S2). Omit to set both axes.
 */
async function setZeroAngles(ax) {
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return false;
  }

  // If no axis specified, set both
  if (!ax) {
    await setZeroAngles('tr');
    await setZeroAngles('el');
    return;
  }

  const isTr = ax === 'tr';
  const axisNum = isTr ? '1' : '2';
  const axisName = isTr ? 'traverse' : 'elevation';
  const axisNameCap = isTr ? 'Traverse' : 'Elevation';

  const result = await Swal.fire({
    title: `Set Zero ${axisNameCap}`,
    text: `Are you sure you want to set current ${axisName} angle to zero?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });
  if (!result.isConfirmed) {
    console.log('Canceled');
    return;
  }

  updateMovementStatus(`Setting zero ${axisName}...`, 'running');
  showLiveData(false);
  await new Promise(resolve => setTimeout(resolve, 50));
  await readMsg('EO=1;;\r', { skipLock: true });

  sendMsg(';\r');
  sendMsg(`s${axisNum}[17]=s${axisNum}[17]-ax${axisNum}.px;\r`);

  const newOffset = await readMsg(`S${axisNum}[17];\r`);
  console.log(newOffset);

  if (parseFloat(newOffset) > 0.0) {
    sendMsg(`S${axisNum}[18]=0;\r`);
    console.log(`S${axisNum}[18]=0;`);
  } else {
    sendMsg(`S${axisNum}[18]=-1;\r`);
    console.log(`S${axisNum}[18]=-1;`);
  }

  sendMsg(`s${axisNum}[1]=0;\r`);    // Restart encoder
  sendMsg(`s${axisNum}[1]=5;\r`);    // Set back encoder type

  await new Promise(resolve => setTimeout(resolve, 200));
  updateMovementStatus(`Zero ${axisName} set`, 'ready');
  showLiveData(true);
}


async function commutation(axis = 2) {
  
  // Check serial connection
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return false;
  }

  const result = await Swal.fire({
    title: 'Start Motor Commutation',
    html: `<b>Warning!</b> Commutation may cause sudden movement.<br>Ensure the area is clear before proceeding.<br>Keep clear of moving parts and do not insert fingers or objects into the mechanism.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Proceed',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#d33'
  });
  if (!result.isConfirmed) {
    console.log('Canceled');
    return;
  }
  
  const commutationBtn = document.getElementById(`btn-commutation-${axis}`);
  if (commutationBtn) commutationBtn.classList.add('in-progress');

  updateMovementStatus('Performing commutation...', 'running');
  showLiveData(false);
  await turnOffMotor();
  await flushSerialReader();
  // await new Promise(resolve => setTimeout(resolve, 50));
  // await readMsg('EO=1;;\r', { skipLock: true });

  await readMsg(`ax${axis}.SC[1]=80;ax${axis}.SC[2]=2;ax${axis}.SC[3]=6;`);
  await readMsg(`ax${axis}.ER[2]=0;`);
  await readMsg(`ax${axis}.CA[10]=1;`);
  await readMsg(`ax${axis}.MO=1;`);

  updateMovementStatus('Waiting for commutation to complete...', 'running');
  if (commutationBtn) commutationBtn.style.setProperty('--progress', '0%');

  let mf = 0;
  const maxAttempts = 36;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pct = Math.round((attempt / maxAttempts) * 100);
    if (commutationBtn) commutationBtn.style.setProperty('--progress', `${pct}%`);

    const mfRaw = await readMsg(`ax${axis}.MF;;`);
    console.log(mfRaw);
    const match = mfRaw.match(/MF[^-\d]*([-+]?\d+\.?\d*(?:[eE][+-]?\d+)?)/);
    mf = match ? parseFloat(match[1]) : NaN;
    if (!isNaN(mf) && mf === 128) break;
    console.warn(`Commutation in progress... attempt ${attempt + 1}: MF=${mf}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (commutationBtn) commutationBtn.style.setProperty('--progress', '100%');
  await new Promise(resolve => setTimeout(resolve, 300));

  await readMsg(`ax${axis}.MO=0;`);
  await readMsg(`ax${axis}.ER[2]=1e7;`);

  if (commutationBtn) {
    commutationBtn.classList.remove('in-progress');
    commutationBtn.style.removeProperty('--progress');
  }

  const ca7Raw = await readMsg(`ax${axis}.CA[7];;`);
  console.log(`Commutation complete. ${ca7Raw}`);

  await new Promise(resolve => setTimeout(resolve, 200));
  updateMovementStatus('Commutation complete', 'ready');
  showLiveData(true);
}


// NOTE: commutationStepByStep is intentionally kept even though it has no UI button.
// It is documented in PROJECT_MAP.md as the alternative torque-control commutation method
// and may be wired to a UI button in a future release. Do NOT remove it.
async function commutationStepByStep(axis = 2) {
  
  // Check serial connection
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return false;
  }

  const result = await Swal.fire({
    title: 'Start Motor Commutation',
    html: `<b>Warning!</b> Commutation may cause sudden movement.<br>Ensure the area is clear before proceeding.<br>Keep clear of moving parts and do not insert fingers or objects into the mechanism.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Proceed',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#d33'
  });
  if (!result.isConfirmed) {
    console.log('Canceled');
    return;
  }
  
  updateMovementStatus('Performing commutation...', 'running');
  showLiveData(false);
  await turnOffMotor();
  await flushSerialReader();

  await readMsg(`ax${axis}.UM=3;ax${axis}.MO=1;`);
  await new Promise(resolve => setTimeout(resolve, 500));
  await readMsg(`ax${axis}.TC=1;`);
  updateMovementStatus('Waiting for commutation to settle...', 'running');
  await new Promise(resolve => setTimeout(resolve, 5000));

  let wf40 = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const wf40Raw = await readMsg(`ax${axis}.WF[40];;`);
    console.log(wf40Raw);
    const match = wf40Raw.match(/WF\[40\][^-\d]*([-+]?\d+\.?\d*(?:[eE][+-]?\d+)?)/);
    wf40 = match ? parseFloat(match[1]) : NaN;
    if (!isNaN(wf40) && wf40 !== 0) break;
    console.warn(`WF[40] read attempt ${attempt + 1} failed (got: ${wf40Raw}), retrying...`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  await sendMsg(`ax${axis}.MO=0;ax${axis}.UM=5;`);
  if (isNaN(wf40) || wf40 === 0) {
    updateMovementStatus('Commutation failed: could not read WF[40]', 'error');
    showLiveData(true);
    return false;
  }
  const newCommutation = (wf40 * 0.09375 + 1024) & 0xfff;

  await sendMsg(`ax${axis}.CA[7]=${newCommutation};`);
  console.log(`WF[40] = ${wf40}, new CA[7] = ${newCommutation}`);

  await new Promise(resolve => setTimeout(resolve, 200));
  updateMovementStatus('Commutation complete', 'ready');
  showLiveData(true);
}


/**
 * Play a tune on the gimbal
 */
function playTune() {
  if (!validateMovementPrerequisites()) {
    return;
  }

  sendMsg('R1[1]=8');
}

/**
 * Turn off the motor using the motor toggle
 */
function turnOffMotor() {
  const motorToggleElement = document.getElementById('motor-toggle');
  if (motorToggleElement) {
    if (motorToggleElement.checked) {
      motorToggleElement.checked = false;
      motorToggle(motorToggleElement);
      console.log('Motor turned off via toggle');
    } else {
      console.log('Motor is already off');
    }
  } else {
    console.error('Motor toggle element not found');
  }
}

/**
 * Send velocity to both axes when the movementVelocity input changes
 * @param {number|string} v - Velocity value in deg/s
 */
function sendVelocity(v) {
  if (!serialPort) return;
  let vel = parseFloat(v);
  if (isNaN(vel)) return;

  if (vel < 0) {
    vel = Math.abs(vel);
    document.getElementById('movementVelocity').value = vel;
  }

  if (vel > MAX_VELOCITY) {
    vel = MAX_VELOCITY;
    document.getElementById('movementVelocity').value = MAX_VELOCITY;
    updateMovementStatus(`Velocity clamped to max ${MAX_VELOCITY} deg/s`, 'error');
  }

  sendMsg(`R1[13]=${vel}; R1[23]=${vel};`);
}

// ==================== Commutation Angle R/W ====================

/**
 * Read CA[7] from both axes and populate the panel input fields.
 */
async function readCommutationAngles() {
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return;
  }

  updateMovementStatus('Reading CA[7]...', 'running');

  showLiveData(false);
  await new Promise(resolve => setTimeout(resolve, 60));

  // Drain residual live-data frames left in the USB buffer.
  for (let i = 0; i < 10; i++) {
    const r = await readMsg(';;', { skipLock: true });
    if (!r) break;
  }

  const trRaw = await readMsg('ax1.CA[7];;');
  const elRaw = await readMsg('ax2.CA[7];;');
  const trOffRaw = await readMsg('S1[17];;');
  const elOffRaw = await readMsg('S2[17];;');

  const parseOffset = (raw, socket) => {
    const match = raw && raw.match(new RegExp(`S${socket}\\[17\\];+([-+]?\\d+)`, 'i'));
    return match ? parseFloat(match[1]) : NaN;
  };

  const trOff = parseOffset(trOffRaw, 1);
  const elOff = parseOffset(elOffRaw, 2);

  const trOffInput = document.getElementById('zero-offset-tr');
  const elOffInput = document.getElementById('zero-offset-el');
  if (trOffInput) trOffInput.value = isNaN(trOff) ? '' : trOff;
  if (elOffInput) elOffInput.value = isNaN(elOff) ? '' : elOff;
  if (isNaN(trOff) || isNaN(elOff)) console.warn('Zero offset read failed:', trOffRaw, elOffRaw);

  const parseCA7 = (raw, axis) => {
    // Response must contain the register name to be trusted (eo=1 format: "ax1.CA[7];;1030;;").
    // Any response that lacks it (garbage, stale echo) returns NaN → error path.
    const match = raw && raw.match(new RegExp(`ax${axis}\\.CA\\[7\\];+([-+]?\\d+)`));
    return match ? parseFloat(match[1]) : NaN;
  };

  const trVal = parseCA7(trRaw, 1);
  const elVal = parseCA7(elRaw, 2);

  if (isNaN(trVal) || isNaN(elVal)) {
    showLiveData(true);
    updateMovementStatus('Error: Could not read CA[7]', 'error');
    return;
  }

  const trInput = document.getElementById('ca7-tr') || document.getElementById('vt-ca7-tr');
  const elInput = document.getElementById('ca7-el') || document.getElementById('vt-ca7-el');
  if (trInput) trInput.value = trVal;
  if (elInput) elInput.value = elVal;

  showLiveData(true);
  updateMovementStatus(`CA[7] read — TR: ${trVal}, EL: ${elVal} | Offset TR: ${trOff}, EL: ${elOff}`, 'ready');
}

/**
 * Read parameter version (UI[1]/1000), SIL version (R1[99]/1000), and CA[7] from both
 * axes, then populate the Driver Info fields in the ATP Results (view-telemetry) panel.
 */
async function readDriverInfo() {
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return;
  }

  updateMovementStatus('Reading driver info...', 'running');

  showLiveData(false);
  await new Promise(resolve => setTimeout(resolve, 60));

  for (let i = 0; i < 10; i++) {
    const r = await readMsg(';;', { skipLock: true });
    if (!r) break;
  }

  const ui1Raw  = await readMsg('UI[1];;');
  const silRaw  = await readMsg('R1[99];;');
  const trRaw   = await readMsg('ax1.CA[7];;');
  const elRaw   = await readMsg('ax2.CA[7];;');

  const parseNum = (raw, key) => {
    const escaped = key.replace(/[\[\]\.]/g, '\\$&');
    const match = raw && raw.match(new RegExp(`${escaped};+([-+]?\\d+\\.?\\d*(?:[eE][+-]?\\d+)?)`));
    return match ? parseFloat(match[1]) : NaN;
  };

  const parseCA7 = (raw, axis) => {
    const match = raw && raw.match(new RegExp(`ax${axis}\\.CA\\[7\\];+([-+]?\\d+)`));
    return match ? parseFloat(match[1]) : NaN;
  };

  const paramVer = parseNum(ui1Raw, 'UI[1]') / 1000;
  const sil      = parseNum(silRaw, 'R1[99]') / 1000;
  const trVal    = parseCA7(trRaw, 1);
  const elVal    = parseCA7(elRaw, 2);

  if (isNaN(paramVer) || isNaN(sil) || isNaN(trVal) || isNaN(elVal)) {
    showLiveData(true);
    updateMovementStatus('Error: Could not read driver info', 'error');
    return;
  }

  const paramVerEl = document.getElementById('vt-param-version');
  const silVerEl   = document.getElementById('vt-sil-version');
  const trInput    = document.getElementById('vt-ca7-tr');
  const elInput    = document.getElementById('vt-ca7-el');

  if (paramVerEl) paramVerEl.value = paramVer;
  if (silVerEl)   silVerEl.value   = sil;
  if (trInput)    trInput.value    = trVal;
  if (elInput)    elInput.value    = elVal;

  showLiveData(true);
  updateMovementStatus(`Driver info read — Param v${paramVer}, SIL ${sil}, CA[7] TR: ${trVal} EL: ${elVal}`, 'ready');
}

/**
 * Write the values from the panel input fields to CA[7] on both axes.
 */
async function writeCommutationAngles() {
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return;
  }

  const trInput = document.getElementById('ca7-tr');
  const elInput = document.getElementById('ca7-el');
  const trVal = trInput ? parseInt(trInput.value, 10) : NaN;
  const elVal = elInput ? parseInt(elInput.value, 10) : NaN;

  if (isNaN(trVal) || trVal < 0 || trVal > 4095 ||
      isNaN(elVal) || elVal < 0 || elVal > 4095) {
    updateMovementStatus('Error: CA[7] values must be integers 0–4095', 'error');
    return;
  }

  await sendMsg(`ax1.CA[7]=${trVal};ax2.CA[7]=${elVal};`);
  updateMovementStatus(`CA[7] written — TR: ${trVal}, EL: ${elVal}`, 'ready');
}

// ==================== Status Functions ====================

/**
 * Update movement status display
 * @param {string} message - Status message
 * @param {string} type - Status type ('error', 'moving', 'running', 'ready')
 */
function updateMovementStatus(message, type) {
  const statusElement = document.getElementById('movementStatus');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.style.color = type === 'error' ? '#dc3545' : 
                               type === 'moving' ? '#007bff' : 
                               type === 'running' ? '#28a745' : '#6c757d';
  }
}

// ==================== Exported Functions ====================

// Make functions available globally
window.validateMovementPrerequisites = validateMovementPrerequisites;
window.sendToAngles = sendToAngles;
window.moveToPosition = moveToPosition;
window.setMovementVelocity = setMovementVelocity;
window.runScenario = runScenario;
window.startSineMove = startSineMove;
window.startLinearMove = startLinearMove;
window.joystickCmd = joystickCmd;
window.updateMovementStatus = updateMovementStatus;
window.commutation = commutation;
window.readCommutationAngles = readCommutationAngles;
window.writeCommutationAngles = writeCommutationAngles;
window.readDriverInfo = readDriverInfo;
window.setZeroAngles = setZeroAngles;
window.playTune = playTune;
window.turnOffMotor = turnOffMotor;
window.sendVelocity = sendVelocity;
