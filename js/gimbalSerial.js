/**
 * Serial Communication Module
 * This module handles all Web Serial API interactions for communication
 * with the gimbal control hardware.
 */

// Global serial port variables
let serialPort;
let writer;
let reader;

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
 * Send a message to the gimbal
 * @param {string} message - Message to send
 */
function sendMsg(message) {
  if (writer) {
    const encoder = new TextEncoder();
    writer.write(encoder.encode(message + '\r'));
  }
}

/**
 * Read a message from the gimbal
 * @param {string} message - Message to send before reading
 * @returns {Promise<string>} Response from gimbal
 */
async function readMsg(message) {
  if (!reader) {
    console.error('No serial reader available');
    return '';
  }

  try {
    sendMsg(message);
    
    // Read response with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 1000)
    );
    
    const readPromise = (async () => {
      let response = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        response += chunk;
        
        // Check if we have a complete response (ends with semicolon or newline)
        if (chunk.includes(';') || chunk.includes('\n') || chunk.includes('\r')) {
          break;
        }
      }
      return response.trim();
    })();
    
    return await Promise.race([readPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error reading from serial port:', error);
    return '';
  }
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

    // Try to extract number inside brackets (R1[xx], s1[xx], etc.)
    const match = rawKey.match(/\[(\d+)\]/);
    const key = match ? Number(match[1]) : rawKey; // if brackets found → number, else keep raw

    // Convert value to number if possible
    const numVal = Number(value);
    result.push([key, isNaN(numVal) ? value : numVal]);
  }

  return result;
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
  await new Promise(resolve => setTimeout(resolve, 50));
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
      console.log("Stopped show live data interval");
  } else if (state)  {
      console.log("Start show live data interval");
      intervalShowLiveData = setInterval(() => {
        updateLiveData();
      }, 50); // ms
  }
}

/**
 * Update live data from gimbal and refresh UI
 */
async function updateLiveData() {
  let tRead = await readMsg('R1[10];R1[31];R1[41];R1[33];R1[43];R1[34];R1[44];');
  // console.log(tRead);
  let pairs = parsePairs(tRead);
  let sysMode = getValue(pairs, 10);
  let posTr = getValue(pairs, 31);
  let posEl = getValue(pairs, 41);
  let velTr = getValue(pairs, 33);
  let velEl = getValue(pairs, 43);
  let curTr = getValue(pairs, 34);
  let curEl = getValue(pairs, 44);

  // // Only update UI if all values are valid numbers
  // const allValuesValid = [sysMode, posTr, posEl, velTr, velEl, curTr, curEl].every(val => 
  //   typeof val === 'number' && !isNaN(val)
  // );
  
  // // if (allValuesValid) {
    updateInputValue('systemModeInput', sysMode, 1);
    updateInputValue('PositionInputTR', posTr);
    updateInputValue('PositionInputEL', posEl);
    updateInputValue('VelocityInputTR', velTr,10,0);
    updateInputValue('VelocityInputEL', velEl,10,0);
    updateInputValue('CurrentInputTR', curTr,1000,1);
    updateInputValue('CurrentInputEL', curEl,1000,1);
  // } else {
  //   console.log('Skipping UI update - not all values are valid numbers:', { sysMode, posTr, posEl });
  // }

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
window.flushSerialReader = flushSerialReader;
window.parsePairs = parsePairs;
window.showLiveData = showLiveData;
window.updateLiveData = updateLiveData;

// Export serial port variables for other modules to use
window.serialPort = serialPort;
window.writer = writer;
window.reader = reader;