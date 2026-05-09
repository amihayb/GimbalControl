/**
 * Serial Communication Module
 * This module handles all Web Serial API interactions for communication
 * with the gimbal control hardware.
 */

// Global serial port variables
let serialPort;
let writer;
let reader;

// Set to true to use the 3-register packed decoding method (R1[51]/R1[52]/R1[53]),
// or false to use the original 7-register method (R1[10]/R1[31]/R1[41]/...).
const USE_PACKED_REGISTERS = false;

// Semaphore to pause live data polling during manual serial operations
let serialLockDepth = 0;
let liveDataPauseRequested = false;
let liveDataInProgress = false;
let liveDataIdleResolvers = [];
let lastUIUpdateTime = 0;

// ==================== Core Serial Functions ====================

/**
 * Request and open a serial port connection
 * @returns {Promise<boolean>} True if connection successful, false otherwise
 */
async function requestSerialPort() {
  try {
      serialPort = await navigator.serial.requestPort();
      await serialPort.open({ baudRate: 115200 });
      writer = await serialPort.writable.getWriter();
      reader = await serialPort.readable.getReader();
      console.log('Serial port opened successfully!');
      return true;
  } catch (error) {
      console.error('Error connecting to serial port:', error);
      return false;
  }
}

/**
 * Wait until the current live data cycle finishes (if any)
 * @returns {Promise<void>}
 */
function waitForLiveDataIdle() {
  if (!liveDataInProgress) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    liveDataIdleResolvers.push(resolve);
  });
}

/**
 * Run a serial operation while holding the semaphore so updateLiveData is paused
 * @param {() => Promise<any>} fn
 * @returns {Promise<any>}
 */
async function runWithSerialLock(fn) {
  serialLockDepth++;

  if (serialLockDepth === 1) {
    liveDataPauseRequested = true;
    await waitForLiveDataIdle();
  }

  try {
    return await fn();
  } finally {
    serialLockDepth = Math.max(0, serialLockDepth - 1);
    if (serialLockDepth === 0) {
      liveDataPauseRequested = false;
    }
  }
}

/**
 * Internal helper to send raw bytes to the serial writer
 * (callers must hold the serial lock before invoking)
 * @param {string} message
 */
async function writeSerialMessage(message) {
  if (!writer) {
    console.warn('Attempted to write without an active serial writer');
    return;
  }

  const encoder = new TextEncoder();
  await writer.write(encoder.encode(message + '\r'));
}

/**
 * Send a message to the gimbal
 * @param {string} message - Message to send
 * @param {{skipLock?: boolean}} options - Optional behavior overrides
 */
function sendMsg(message, options = {}) {
  if (!writer) {
    console.warn('sendMsg called without an open serial writer');
    return;
  }

  const exec = () => writeSerialMessage(message);
  return options.skipLock ? exec() : runWithSerialLock(exec);
}

/**
 * Read a message from the gimbal
 * @param {string} message - Message to send before reading
 * @param {Object} options - Options object
 * @param {boolean} options.skipLock - If true, skip the serial lock
 * @returns {Promise<string>} Response from gimbal
 */
async function readMsg(message, options = {}) {
  if (!reader) {
    console.error('No serial reader available');
    return '';
  }
  if (!writer) {
    console.error('No serial writer available for readMsg');
    return '';
  }

  const exec = async () => {
    try {
      const sendTime = Date.now();
      await writeSerialMessage(message);
      
      // Read response with timeout
      const timeoutMs = 40;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      );
      
      const readPromise = (async () => {
        let response = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          response += chunk;
          // console.log(`readMsg raw chunk (${Date.now() - sendTime}ms): "${chunk.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`);
          
          // Check if we have a complete response (ends with semicolon or newline)
          if (chunk.includes(';;')) {   // chunk.includes('\r')
            break;
          }
        }
        return response.trim();
      })();
      
      return await Promise.race([readPromise, timeoutPromise]);
    } catch (error) {
      if (error.message !== 'Timeout') {
        console.error('Error reading from serial port:', error);
      }
      return '';
    }
  };

  return options.skipLock ? exec() : runWithSerialLock(exec);
}

/**
 * Close the serial port connection
 */
function closeSerialPort() {
  if (writer) {
    writer.releaseLock();
    writer = null;
  }
  if (reader) {
    reader.releaseLock();
    reader = null;
  }
  if (serialPort) {
    serialPort.close();
    serialPort = null;
  }
  console.log('Serial port closed');
}

/**
 * Reconnect to the same serial port without prompting
 * @returns {Promise<boolean>} True if reconnection successful, false otherwise
 */
async function reconnectSerialPort() {
  if (!serialPort) {
    console.error('No serial port to reconnect to');
    return false;
  }

  try {
    // Release locks
    if (writer) {
      writer.releaseLock();
      writer = null;
    }
    if (reader) {
      reader.releaseLock();
      reader = null;
    }

    // Store port reference
    const portToReconnect = serialPort;

    // Close the port
    await portToReconnect.close();

    // Reopen the same port
    await portToReconnect.open({ baudRate: 115200 });
    serialPort = portToReconnect;

    // Get new reader and writer
    writer = await serialPort.writable.getWriter();
    reader = await serialPort.readable.getReader();

    console.log('Serial port reconnected successfully!');
    return true;
  } catch (error) {
    console.error('Error reconnecting to serial port:', error);
    serialPort = null;
    return false;
  }
}

/**
 * Flush stale data from the serial buffer by waiting briefly and then
 * sending a dummy query ('px;;') and discarding its response.
 * Any buffered echoes from previous commands are consumed and thrown away,
 * leaving the buffer clean for the next real read.
 */
async function flushSerialReader() {
  if (!reader) return;
  await new Promise(resolve => setTimeout(resolve, 100));
  await readMsg('px;;\r', { skipLock: true });
  console.log('flushSerialReader: buffer synced');
}

// ==================== Utility Functions ====================

/**
 * Parse serial response pairs into key-value array
 * @param {string} input - Serial response string
 * @returns {Array<Array<number>>} Array of [key, value] pairs
 */
function parsePairs(input) {
  const parts = input.split(";").filter(Boolean);

  const result = [];

  for (let i = 0; i < parts.length; i += 2) {
    let rawKey = parts[i];
    let value = parts[i + 1];
    if (value === undefined) continue;

    // Extract number inside brackets only if key starts with "R1["
    let key;
    if (rawKey.startsWith('R1[')) {
      const match = rawKey.match(/\[(\d+)\]/);
      key = match ? Number(match[1]) : rawKey;
    } else {
      key = rawKey; // Keep full key for non-R1 keys
    }

    // Convert value to number if possible
    const numVal = Number(value);
    result.push([key, isNaN(numVal) ? value : numVal]);
  }

  return result;
}

/**
 * Extract expected keys from a command string (e.g., 'R1[10];R1[31];...' → ['10', '31', ...])
 * @param {string} message - Command string
 * @returns {Array<string>} Array of extracted keys as strings
 */
function extractKeysFromCommand(message) {
  const keyMatches = message.matchAll(/\[(\d+)\]/g);
  return Array.from(keyMatches, match => match[1]);
}

/**
 * Get value from parsed pairs array by key
 * @param {Array<Array<number>>} pairs - Array of [key, value] pairs
 * @param {number} key - Key to search for
 * @returns {number|null} Value if found, null otherwise
 */
const getValue = (pairs, key) =>
  pairs.find(([k]) => String(k) === String(key))?.[1] ?? null;

/**
 * Sign-extend a value from a given bit width to a full 32-bit signed integer.
 * @param {number} value - The raw unsigned value
 * @param {number} bits  - The number of bits it was extracted from
 * @returns {number} Signed integer
 */
function signExtend(value, bits) {
  const shift = 32 - bits;
  return (value << shift) >> shift;
}

/**
 * Decode three packed 32-bit registers (R1[51], R1[52], R1[53]) into individual gimbal fields.
 * @param {number} R1 - First packed register
 * @param {number} R2 - Second packed register
 * @param {number} R3 - Third packed register
 * @returns {{ posTr, posEl, posCmdTr, posCmdEl, rateTr, rateEl, status, curTr, curEl }}
 */
function decodeRegisters(R1, R2, R3) {
  R1 = R1 | 0;
  R2 = R2 | 0;
  R3 = R3 | 0;

  const posTr    = signExtend((R1 >>> 20) & 0xFFF, 12);
  const posEl    = signExtend((R1 >>>  8) & 0xFFF, 12);
  const status   =            (R1 >>>  0) & 0xFF;

  const posCmdTr = signExtend((R2 >>> 20) & 0xFFF, 12);
  const posCmdEl = signExtend((R2 >>>  8) & 0xFFF, 12);
  const curTr    =            (R2 >>>  0) & 0xFF;

  const rateTr   = signExtend((R3 >>> 22) & 0x3FF, 10);
  const rateEl   = signExtend((R3 >>> 12) & 0x3FF, 10);
  const curEl    =            (R3 >>>  4) & 0xFF;

  return { posTr, posEl, posCmdTr, posCmdEl, rateTr, rateEl, status, curTr, curEl };
}

async function saveElmo() {
  
  // Check serial connection
  if (!serialPort) {
    updateMovementStatus('Error: No connection to device', 'error');
    return false;
  }

  const result = await Swal.fire({
    title: 'Save Elmo Settings',
    text: `Are you sure you want to save Elmo settings?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });
  if (!result.isConfirmed) {
    console.log('Canceled');
    return;
  }
  
  await showLiveData(false);
  sendMsg('sv;');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Disconnect and reconnect to COM port
  const reconnected = await reconnectSerialPort();
  if (!reconnected) {
    updateMovementStatus('Error: Failed to reconnect to device', 'error');
    return false;
  }

  updateMovementStatus('Elmo settings saved', 'ready');
  showLiveData(true);
}

// ==================== Live Data Functions ====================

/**
 * Start or stop live data reading from the gimbal
 * @param {boolean} state - True to start, false to stop
 */
async function showLiveData(state) {
  if (intervalShowLiveData && !state) {
      clearInterval(intervalShowLiveData);
      intervalShowLiveData = null;
      prevAngle = null;
      await sendMsg('eo=1;'); // Turn on echo
      console.log("Stopped show live data interval");
  } else if (state)  {
      console.log("Start show live data interval");
      await sendMsg('eo=0;'); // Turn off echo
      intervalShowLiveData = setInterval(() => {
        updateLiveData();
      }, 20); // ms
  }
}

/**
 * Update live data from gimbal and refresh UI
 */
async function updateLiveData() {
  if (liveDataPauseRequested || liveDataInProgress) {
    return;
  }

  liveDataInProgress = true;
  // let readTime = Date.now();
  let tRead;
  try {
    const readCommand = USE_PACKED_REGISTERS
      ? 'R1[51];R1[52];R1[53];;\r'
      : 'R1[125];R1[10];R1[31];R1[41];R1[33];R1[43];R1[34];R1[44];R1[9];;\r';
    tRead = await readMsg(readCommand, { skipLock: true });
    // let endTime = Date.now();
    // console.log(`Time taken: ${endTime - readTime}ms`);
  } finally {
    liveDataInProgress = false;
    if (liveDataIdleResolvers.length > 0) {
      liveDataIdleResolvers.forEach(resolve => resolve());
      liveDataIdleResolvers = [];
    }
  }

  if (!tRead) {
    return;
  }
  // console.log(tRead);
  // let pairs = parsePairs(tRead);
  // let sysMode = getValue(pairs, 10);
  // let posTr = getValue(pairs, 31);
  // let posEl = getValue(pairs, 41);
  // let velTr = getValue(pairs, 33);
  // let velEl = getValue(pairs, 43);
  // let curTr = getValue(pairs, 34);
  // let curEl = getValue(pairs, 44);
  
  let sysMode = null;
  let errBits = null;
  let posTr, posEl, velTr, velEl, curTr, curEl;
  let posCmdTr = null, posCmdEl = null, status = null;

  if (USE_PACKED_REGISTERS) {
    const parts = tRead.split(';').map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some(isNaN)) {
      return; // bad read — skip UI update and CSV recording
    }
    const decoded = decodeRegisters(parts[0], parts[1], parts[2]);
    posTr    = decoded.posTr;
    posEl    = decoded.posEl;
    velTr    = decoded.rateTr;
    velEl    = decoded.rateEl;
    curTr    = decoded.curTr;
    curEl    = decoded.curEl;
    posCmdTr = decoded.posCmdTr;
    posCmdEl = decoded.posCmdEl;
    status   = decoded.status;
  } else {
    // Parse semicolon-delimited values.
    // R1[125] always returns 255 and is used as an alignment sentinel.
    // Search for 255 to handle stale leading bytes from a previous response.
    const values = tRead.split(';').map(val => {
      const trimmed = val.trim();
      if (trimmed === '') return null;
      const num = Number(trimmed);
      return isNaN(num) ? trimmed : num;
    });
    const i = values.indexOf(255);
    if (i === -1) {
      console.warn('updateLiveData: alignment sentinel (255) not found — discarding frame');
      return;
    }
    if (i > 0) {
      console.warn(`updateLiveData: realigned by ${i} position(s)`);
    }
    sysMode = values[i + 1] ?? null;
    posTr   = values[i + 2] ?? null;
    posEl   = values[i + 3] ?? null;
    velTr   = values[i + 4] ?? null;
    velEl   = values[i + 5] ?? null;
    curTr   = values[i + 6] ?? null;
    curEl   = values[i + 7] ?? null;
    errBits = values[i + 8] ?? null;
  }

  // Only update UI if core values are valid numbers and 100ms have passed since last update
  const coreValues = [posTr, posEl, velTr, velEl, curTr, curEl];
  const isValid = val => val !== null && val !== undefined && typeof val === 'number' && !isNaN(val);
  const allValuesValid = USE_PACKED_REGISTERS
    ? coreValues.every(isValid)
    : [...coreValues, sysMode].every(isValid);
  
  const now = Date.now();
  const timeSinceLastUIUpdate = Date.now() - lastUIUpdateTime;
  
  if (allValuesValid && timeSinceLastUIUpdate >= 100) {
    if (!USE_PACKED_REGISTERS) {
      updateInputValue('systemModeInput', sysMode, 1);
    }
    updateInputValue('PositionInputTR', posTr);
    updateInputValue('PositionInputEL', posEl);
    updateInputValue('VelocityInputTR', velTr,10,0);
    updateInputValue('VelocityInputEL', velEl,10,0);
    updateInputValue('CurrentInputTR', curTr,1000,1);
    updateInputValue('CurrentInputEL', curEl,1000,1);
    updateErrorBits(errBits);
    lastUIUpdateTime = now;
  } else if (!allValuesValid) {
    console.log('Skipping UI update - not all values are valid numbers:', { sysMode, posTr, posEl, velTr, velEl, curTr, curEl });
  }

  // Save data if test is running and we've reached minAngle at least once
  if (shouldRecordData) {
    rows.Tr_angle.push(posTr);
    rows.Tr_velocity.push(velTr);
    rows.Tr_current.push(curTr); 
    rows.El_angle.push(posEl);
    rows.El_velocity.push(velEl);
    rows.El_current.push(curEl);
    rows.Tr_cmd_angle.push(posCmdTr);
    rows.El_cmd_angle.push(posCmdEl);
    rows.status.push(USE_PACKED_REGISTERS ? status : errBits);
    rows.time.push(Date.now() - startTime); // Time in milliseconds
  }
}

// ==================== Exported Functions ====================

// Make functions available globally
window.requestSerialPort = requestSerialPort;
window.sendMsg = sendMsg;
window.readMsg = readMsg;
window.closeSerialPort = closeSerialPort;
window.reconnectSerialPort = reconnectSerialPort;
window.flushSerialReader = flushSerialReader;
window.parsePairs = parsePairs;
window.showLiveData = showLiveData;
window.updateLiveData = updateLiveData;

// Export serial port variables for other modules to use
window.serialPort = serialPort;
window.writer = writer;
window.reader = reader;