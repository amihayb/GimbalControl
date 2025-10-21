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
 * Set zero angles for the gimbal
 */
async function setZeroAngles() {
  // Check serial connection
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return false;
  }

  const result = await Swal.fire({
    title: 'Set Current Angle',
    text: `Are you sure you want to set current angle to zero?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });
  if (!result.isConfirmed) {
    console.log('Canceled');
    return;
  }
  
  updateMovementStatus('Setting zero angles...', 'running');
  showLiveData(false);
  await new Promise(resolve => setTimeout(resolve, 50));
  await flushSerialReader();

  // var tRead = await readMsg('S1[17]');
  // const curOffset = parseFloat(tRead.replace(';', ''));
  // var tRead = await readMsg('ax1.px');
  // const curAngle = parseFloat(tRead.replace(';', ''));

  // Retry logic for reading values
  let curOffset, curAngle;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      var tRead = await readMsg('S1[17];AX1.px;S2[17];AX2.px;');
      console.log(`Attempt ${attempts + 1}: ${tRead}`);
      let pairs = parsePairs(tRead);
      curOffsetTr = getValue(pairs, "S1[17]");
      curAngleTr = getValue(pairs, "AX1.px");
      curOffsetEl = getValue(pairs, "S2[17]");
      curAngleEl = getValue(pairs, "AX2.px");
      console.log(`Values: curOffset=${curOffsetTr}, curAngle=${curAngleTr}, curOffsetEl=${curOffsetEl}, curAngleEl=${curAngleEl}`);
      
      // Check if both values are valid numbers
      if (typeof curOffsetTr === 'number' && typeof curAngleTr === 'number' && 
          !isNaN(curOffsetTr) && !isNaN(curAngleTr) && typeof curOffsetEl === 'number' && typeof curAngleEl === 'number' && 
          !isNaN(curOffsetEl) && !isNaN(curAngleEl)) {
        console.log('Valid values received');
        break;
      } else {
        console.log(`Invalid values on attempt ${attempts + 1}`);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
        }
      }
    } catch (error) {
      console.error(`Error on attempt ${attempts + 1}:`, error);
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  // If all attempts failed, show error and return
  if (attempts >= maxAttempts) {
    updateMovementStatus('Failed to read valid offset and angle values after 5 attempts', 'error');
    console.error('Failed to get valid values after 5 attempts');
    return;
  }

  var newOffsetTr = curOffsetTr - curAngleTr;
  var newOffsetEl = curOffsetEl - curAngleEl;

  // Stop motor using toggle function
  const motorToggleElement = document.getElementById('motor-toggle');
  if (motorToggleElement && motorToggleElement.checked) {
    motorToggleElement.checked = false;
    motorToggle(motorToggleElement);
  }

  sendMsg('S1[17]=' + newOffsetTr);
  sendMsg('S2[17]=' + newOffsetEl);
  console.log('S1[17]=' + newOffsetTr);
  console.log('S2[17]=' + newOffsetEl);

  if (newOffsetTr > 0.0) {
    sendMsg('S1[18]=0;');
    console.log('S1[18]=0;');
  } else {
    sendMsg('S1[18]=-1;');
    console.log('S1[18]=-1;');
  }
  if (newOffsetEl > 0.0) {
    sendMsg('S2[18]=0;');
    console.log('S2[18]=0;');
  } else {
    sendMsg('S2[18]=-1;');
    console.log('S2[18]=-1;');
  }
  sendMsg('s1[1]=0');    // Restart encoder
  sendMsg('s1[1]=5;');    // Set back encoder type
  sendMsg('s2[1]=0');    // Restart encoder
  sendMsg('s2[1]=5;');    // Set back encoder type

  await new Promise(resolve => setTimeout(resolve, 200));
  await flushSerialReader();
  updateMovementStatus('Zero angles set', 'ready');
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
  await flushSerialReader();

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
    let soValue = await readMsg(`ax${axis}.SO`);
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
