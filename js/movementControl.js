/**
 * Movement Control Module
 * This module handles all gimbal movement and control scenarios
 * for the gimbal control application.
 */

// ==================== Movement Control Business Logic ====================

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
  document.getElementById('trAngle').value = tr;
  document.getElementById('elAngle').value = el;
  sendToAngles();
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
      sendMsg('R1[13]=1; R1[14]=100; R1[15]=90; R1[23]=5; R1[24]=30; R1[25]=10; R1[1]=13;');
      console.log('Running demo 1 scenario');
      break;
    case 'demo2':
      if (intervalMove) {
        clearInterval(intervalMove);
        intervalMove = null;
        console.log("Stopped sending commands");
        updateMovementStatus('Demo 2 stopped', 'ready');
      } else {
        console.log("Start sending commands");
        updateMovementStatus('Running Demo 2 - jumping back and forth...', 'running');
        intervalMove = setInterval(() => {
          let message;
          if (changeDir) {
            message = 'R1[11]=195; R1[21]=55;';
          } else {
            message = 'R1[11]=200; R1[21]=60;';
          }
          sendMsg(message);
          changeDir = !changeDir;
        }, 1000);
      }
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
 * Run commutation procedure
 */
function commutation() {
  if (!validateMovementPrerequisites()) {
    return;
  }
  
  updateMovementStatus('Running commutation procedure...', 'running');
  //sendMsg('R1[1]=2');
}

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
    title: 'Perform Commutation',
    text: `Are you sure you want to perform commutation?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });
  if (!result.isConfirmed) {
    console.log('Canceled');
    return;
  }
  
  updateMovementStatus('Performing commutation...', 'running');
  showLiveData(false);

  turnOffMotor()
  sendMsg('rz[1]=167');
  await new Promise(resolve => setTimeout(resolve, 50));
  // await flushSerialReader();

  sendMsg(`ax${axis}.ca[15]=5;ax${axis}.ca[10]=1;`);
  await new Promise(resolve => setTimeout(resolve, 50));
  sendMsg(`ax${axis}.mo=1`);
  // Wait for commutation to complete by polling ax${axis}.SO every 100ms
  let commutationDone = false;
  const timeoutMs = 20000; // 20 seconds timeout
  const startTime = Date.now();
  
  while (!commutationDone) {
    // Check for timeout
    if (Date.now() - startTime > timeoutMs) {
      updateMovementStatus('Commutation timeout - operation may have failed', 'error');
      showLiveData(true);
      return false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    let soValue = await readMsg(`ax${axis}.SO;;`);
    // Try to extract the value (could be "ax${axis}.SO=1" or just "1")
    let match = soValue && soValue.match ? soValue.match(/(\d+)/) : null;
    let value = match ? parseInt(match[1], 10) : parseInt(soValue, 10);
    if (value === 1) {
      commutationDone = true;
    }
  }
  sendMsg('rz[1]=165');
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
window.runScenario = runScenario;
window.startSineMove = startSineMove;
window.startLinearMove = startLinearMove;
window.joystickCmd = joystickCmd;
window.updateMovementStatus = updateMovementStatus;
window.commutation = commutation;
window.setZeroAngles = setZeroAngles;
window.playTune = playTune;
window.turnOffMotor = turnOffMotor;
window.sendVelocity = sendVelocity;
