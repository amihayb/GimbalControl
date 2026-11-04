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
  await pauseLiveDataAndFlush();
  try {
    await sendMsg(`s${axisNum}[17]=s${axisNum}[17]-ax${axisNum}.px;`);
    await flushSerialReader();

    const newOffset = await readRegister(`S${axisNum}[17]`);
    console.log(`S${axisNum}[17] = ${newOffset}`);
    if (isNaN(newOffset)) {
      updateMovementStatus(`Error: could not read S${axisNum}[17] — zero ${axisName} not completed`, 'error');
      return;
    }

    // S[18] is the high word of the 64-bit offset: 0 for positive, -1 for negative.
    const s18 = newOffset > 0 ? 0 : -1;
    await sendMsg(`S${axisNum}[18]=${s18};`);
    console.log(`S${axisNum}[18]=${s18};`);

    await sendMsg(`s${axisNum}[1]=0;`);    // Restart encoder
    await sendMsg(`s${axisNum}[1]=5;`);    // Set back encoder type

    await new Promise(resolve => setTimeout(resolve, 200));
    updateMovementStatus(`Zero ${axisName} set`, 'ready');
  } finally {
    await showLiveData(true);
  }
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

    mf = await readRegister(`ax${axis}.MF`, 1);
    if (mf === 128) break;
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

  const ca7 = await readRegister(`ax${axis}.CA[7]`, 1);
  console.log(`Commutation complete. CA[7] = ${ca7}`);

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
    wf40 = await readRegister(`ax${axis}.WF[40]`, 1);
    if (!isNaN(wf40) && wf40 !== 0) break;
    console.warn(`WF[40] read attempt ${attempt + 1} failed (got: ${wf40}), retrying...`);
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
 * Stop live data, wait 100 ms, then flush stale bytes from the serial buffer.
 * Callers must call showLiveData(true) when done (use try/finally).
 */
async function pauseLiveDataAndFlush() {
  await showLiveData(false);
  await sendMsg('eo=1;');    // readRegister relies on the echoed register name
  await new Promise(resolve => setTimeout(resolve, 100));
  await flushSerialReader();
}

/**
 * Read one register (e.g. 'ax1.CA[7]', 'S1[17]') with echo on, retrying after a flush.
 * The response must contain the register name (eo=1 format: "ax1.CA[7];;1030;;"),
 * so a stale or shifted response is rejected instead of being trusted.
 * @returns {Promise<number>} Parsed value, or NaN if all attempts failed
 */
async function readRegister(key, attempts = 3) {
  const escaped = key.replace(/[\[\]\.]/g, '\\$&');
  const pattern = new RegExp(`${escaped};+\\s*([-+]?\\d+\\.?\\d*(?:[eE][+-]?\\d+)?)\\s*;`, 'i');

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const raw = await readMsg(`${key};;`, { until: buf => pattern.test(buf), timeoutMs: 300 });
    const match = raw && raw.match(pattern);
    if (match) return parseFloat(match[1]);

    console.warn(`Read ${key} attempt ${attempt} failed (got: "${raw}")`);
    if (attempt < attempts) await flushSerialReader();
  }
  return NaN;
}

/**
 * Read the zero offsets S1[17] (TR) and S2[17] (EL) in raw encoder counts.
 * Returns NaN for an axis whose response could not be parsed.
 */
async function readZeroOffsets() {
  const tr = await readRegister('S1[17]');
  const el = await readRegister('S2[17]');
  return { tr, el };
}

/**
 * Read CA[7] from both axes and populate the panel input fields.
 */
async function readCommutationAngles() {
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return;
  }

  updateMovementStatus('Reading CA[7]...', 'running');

  await pauseLiveDataAndFlush();
  try {
    const trVal = await readRegister('ax1.CA[7]');
    const elVal = await readRegister('ax2.CA[7]');
    const { tr: trOff, el: elOff } = await readZeroOffsets();

    const trOffInput = document.getElementById('zero-offset-tr');
    const elOffInput = document.getElementById('zero-offset-el');
    if (trOffInput) trOffInput.value = isNaN(trOff) ? '' : trOff;
    if (elOffInput) elOffInput.value = isNaN(elOff) ? '' : elOff;

    if (isNaN(trVal) || isNaN(elVal)) {
      updateMovementStatus('Error: Could not read CA[7]', 'error');
      return;
    }

    const trInput = document.getElementById('ca7-tr') || document.getElementById('vt-ca7-tr');
    const elInput = document.getElementById('ca7-el') || document.getElementById('vt-ca7-el');
    if (trInput) trInput.value = trVal;
    if (elInput) elInput.value = elVal;

    updateMovementStatus(`CA[7] read — TR: ${trVal}, EL: ${elVal} | Offset TR: ${trOff}, EL: ${elOff}`, 'ready');
  } finally {
    await showLiveData(true);
  }
}

/**
 * Read parameter version (UF[1], unscaled), SIL version (R1[99]/1000), and CA[7] from both
 * axes, then populate the Driver Info fields in the ATP Results (view-telemetry) panel.
 */
async function readDriverInfo() {
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return;
  }

  updateMovementStatus('Reading driver info...', 'running');

  await pauseLiveDataAndFlush();
  try {
    const paramVer = await readRegister('UF[1]');
    const sil      = (await readRegister('R1[99]')) / 1000;
    const trVal    = await readRegister('ax1.CA[7]');
    const elVal    = await readRegister('ax2.CA[7]');
    const { tr: trOff, el: elOff } = await readZeroOffsets();

    const trOffInput = document.getElementById('vt-zero-offset-tr');
    const elOffInput = document.getElementById('vt-zero-offset-el');
    if (trOffInput) trOffInput.value = isNaN(trOff) ? '' : trOff;
    if (elOffInput) elOffInput.value = isNaN(elOff) ? '' : elOff;

    if (isNaN(paramVer) || isNaN(sil) || isNaN(trVal) || isNaN(elVal)) {
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

    updateMovementStatus(`Driver info read — Param v${paramVer}, SIL ${sil}, CA[7] TR: ${trVal} EL: ${elVal}, Offset TR: ${trOff} EL: ${elOff}`, 'ready');
  } finally {
    await showLiveData(true);
  }
}

/**
 * Write the values from the panel input fields to CA[7] on both axes, and to the
 * zero offsets S1[17] / S2[17] for any offset field that is filled in.
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

  const offsets = [
    { socket: 1, raw: document.getElementById('zero-offset-tr')?.value.trim() ?? '' },
    { socket: 2, raw: document.getElementById('zero-offset-el')?.value.trim() ?? '' },
  ].filter(o => o.raw !== '');

  if (offsets.some(o => !/^[-+]?\d+$/.test(o.raw))) {
    updateMovementStatus('Error: Zero offset values must be integers', 'error');
    return;
  }

  if (offsets.length > 0) {
    const result = await Swal.fire({
      title: 'Write Zero Offset',
      text: 'Writing the zero offset changes the zero position of the axis. Continue?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Write',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;
  }

  await sendMsg(`ax1.CA[7]=${trVal};ax2.CA[7]=${elVal};`);

  if (offsets.length > 0) {
    await pauseLiveDataAndFlush();
    try {
      for (const { socket, raw } of offsets) {
        const val = parseInt(raw, 10);
        // S[18] is the high word of the 64-bit offset: 0 for positive, -1 for negative.
        await sendMsg(`S${socket}[17]=${val};S${socket}[18]=${val > 0 ? 0 : -1};`);
        await sendMsg(`s${socket}[1]=0;`);    // Restart encoder
        await sendMsg(`s${socket}[1]=5;`);    // Set back encoder type
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    } finally {
      await showLiveData(true);
    }
  }

  const offMsg = offsets.map(o => `S${o.socket}[17]=${o.raw}`).join(', ');
  updateMovementStatus(`CA[7] written — TR: ${trVal}, EL: ${elVal}${offMsg ? ' | ' + offMsg : ''}`, 'ready');
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
