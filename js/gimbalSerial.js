/**
 * Serial Communication Module
 * This module handles all Web Serial API interactions for communication
 * with the gimbal control hardware.
 */

// Global serial port variables
let serialPort;
let writer;
let reader;

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
 * Flush the serial reader buffer
 */
async function flushSerialReader() {
  if (reader) {
    try {
      const timeoutMs = 1000; // 1 seconds timeout
      const startTime = Date.now();
      
      while (true) {
        // Check for timeout
        if (Date.now() - startTime > timeoutMs) {
          console.log('flushSerialReader timeout - stopping flush');
          break;
        }
        
        // Create a timeout promise that rejects after remaining time
        const remainingTime = Math.max(0, timeoutMs - (Date.now() - startTime));
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Read timeout')), remainingTime)
        );
        
        try {
          const result = await Promise.race([
            reader.read(),
            timeoutPromise
          ]);
          
          if (result.done) break;
        } catch (readError) {
          // If it's a timeout error, break the loop
          if (readError.message === 'Read timeout') {
            console.log('flushSerialReader read timeout - stopping flush');
            break;
          }
          // For other errors, continue to the next iteration
        }
      }
    } catch (error) {
      // Ignore errors when flushing
    }
  }
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
  
  showLiveData(false);
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
      await sendMsg('eo=1;'); // Turn off echo
      console.log("Stopped show live data interval");
  } else if (state)  {
      console.log("Start show live data interval");
      await sendMsg('eo=0;'); // Turn on echo
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
    tRead = await readMsg('R1[10];R1[31];R1[41];R1[33];R1[43];R1[34];R1[44];;\r', { 
      skipLock: true
    });
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
  
  // Parse semicolon-delimited values
  const values = tRead.split(';').map(val => {
    const trimmed = val.trim();
    if (trimmed === '') return null;
    const num = Number(trimmed);
    return isNaN(num) ? trimmed : num;
  });
  
  // Extract values by index (example: 0;-1226;461;-1;-2;-1;-1;;;;)
  const sysMode = values[0] ?? null;
  const posTr = values[1] ?? null;
  const posEl = values[2] ?? null;
  const velTr = values[3] ?? null;
  const velEl = values[4] ?? null;
  const curTr = values[5] ?? null;
  const curEl = values[6] ?? null;

  // Only update UI if all values are valid numbers and 100ms have passed since last update
  const allValuesValid = [sysMode, posTr, posEl, velTr, velEl, curTr, curEl].every(val => 
    val !== null && typeof val === 'number' && !isNaN(val)
  );
  
  const now = Date.now();
  const timeSinceLastUIUpdate = Date.now() - lastUIUpdateTime;
  
  if (allValuesValid && timeSinceLastUIUpdate >= 100) {
    updateInputValue('systemModeInput', sysMode, 1);
    updateInputValue('PositionInputTR', posTr);
    updateInputValue('PositionInputEL', posEl);
    updateInputValue('VelocityInputTR', velTr,10,0);
    updateInputValue('VelocityInputEL', velEl,10,0);
    updateInputValue('CurrentInputTR', curTr,1000,1);
    updateInputValue('CurrentInputEL', curEl,1000,1);
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