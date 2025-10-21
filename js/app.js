// Constants and math functions will be available globally after their respective scripts are loaded

// Serial port variables are now managed by serial.js module

let intervalShowLiveData = null;
let intervalMove;

let angle = 0;
const angleMedian = createStreamingMedian5();

// Add at the top with other global variables
// let angleData = [];
// let currentData = [];
// let timeData = [];
let startTime;
let shouldRecordData = false;
let prevAngle = null;
let firstValidRead = false;
let angleChangeFailCount = 0;


let joystickTr = 0;
let joystickEl = 0;
let changeDir = false;

// Replace angleData, currentData, timeData arrays with rows object
let rows = {
  time: [],
  Tr_angle: [],
  Tr_velocity: [],
  Tr_current: [],
  El_angle: [],
  El_velocity: [],
  El_current: [],
};


// ==================== UI-Specific Serial Functions ====================

/**
 * Toggle serial port connection (UI-specific)
 * @param {HTMLElement} button - The toggle button element
 */
async function connectToggle(button) {
  if (button.checked) {
    const isConnected = await requestSerialPort();
    if (!isConnected) {
      //document.getElementById('connection-toggle').checked = false;
      button.checked = false; // Uncheck the toggle button if connection fails
      return
    }
    // await readMsg('eo=0;');
    // const moState = await readMsg('mo');
    // if (moState.includes('1')) {
    //   document.getElementById('motor-toggle').checked = true;
    // }

    showLiveData(true);
  } else {
    showLiveData(false);
    // await sendMsg('eo=1;');
    await sendMsg('R1[3]=0\r');
    closeSerialPort();
  }
}

/**
 * Toggle motor on/off (UI-specific)
 * @param {HTMLElement} button - The motor toggle button element
 */
function motorToggle(button) {
  if (!serialPort) {
    button.checked = false;
    Swal.fire({
      title: 'No Connection',
      text: 'Please connect to the device first',
      icon: 'error'
    });
    return;
  }

  sendMsg("R1[3]=1\r");

  if (button.checked) {
    sendMsg('R1[1]=1\r');
    console.log('Motor ON!');
  } else {
    sendMsg('R1[1]=0\r');
    console.log('Motor OFF!');
    // Stop any ongoing movement interval
    if (intervalMove) {
      clearInterval(intervalMove);
      intervalMove = null;
    }
    
  }
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


async function ensureMotorOn() {
  const motorToggleButton = document.getElementById('motor-toggle');
  if (!motorToggleButton.checked) {
    motorToggleButton.checked = true;
    motorToggle(motorToggleButton);
    await new Promise(resolve => setTimeout(resolve, 50)); // Add 50 msec delay
  }
}



async function startTorqueTest() {
  if (!serialPort) {
    Swal.fire({
      title: 'No Connection',
      text: 'Please connect to the device first',
      icon: 'error'
    });
    return;
  }
  // Only update Torque Test button if not already active
  if (!document.getElementById('torque-test-button').classList.contains('active')) {
    document.querySelectorAll('.button').forEach(button => {
      button.classList.remove('active');
    });
    document.getElementById('torque-test-button').classList.add('active');
  }

  await ensureMotorOn();
  
  // Get min/max angle values from inputs
  const minInput = document.getElementById('minAngleInput');
  const maxInput = document.getElementById('maxAngleInput');
  const velocityInput = document.getElementById('velocityInput');
  const minAngle = parseFloat(minInput.value);
  const maxAngle = parseFloat(maxInput.value);
  const velocity = parseFloat(velocityInput.value);


  // Reset data arrays
  rows = {
    time: [],
    angle: [],
    current: [],
    torque: []
  };
  shouldRecordData = false;
  startTime = Date.now();

  if (intervalMove) {
    clearInterval(intervalMove);
    intervalMove = null;
  }

  let cycleCount = -0.5;
  let movingToMax = false;
  
  await sendMsg('sp=' + Math.floor(velocity * 728.178) + ';' + 'pa=' + Math.floor(minAngle * 728.178) + ';bg');
  intervalMove = setInterval(async () => {
    if (movingToMax && Math.abs(angle - maxAngle) < 0.5) {
      // Reached max angle, move back to min
      sendMsg('pa=' + Math.floor(minAngle * 728.178) + ';bg');
      movingToMax = false;
      cycleCount += 0.5; // Half cycle completed
    } else if (!movingToMax && Math.abs(angle - minAngle) < 0.5) {
      // Reached min angle, move to max
      sendMsg('pa=' + Math.floor(maxAngle * 728.178) + ';bg');
      movingToMax = true;
      cycleCount += 0.5; // Half cycle completed
      shouldRecordData = true; // Start recording after first time reaching minAngle
    }
    const reps = document.getElementById('repsInput');
    // Check if two complete cycles are done
    if (cycleCount >= reps.value) {
      // Turn off motor at end of test
      const motorToggle = document.getElementById('motor-toggle');
      motorToggle.checked = false;
      motorToggle.dispatchEvent(new Event('change'));

      clearInterval(intervalMove);
      intervalMove = null;
      //shouldRecordData = false;

      // Show test results
      showTorqueTest();
      
      // Save data to CSV
      saveDataToCSV();
    }
  }, 200);
}


/////////// Read and process files ///////////
const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
  const fileList = event
    .target.files;
  console.log(fileList);
  for (const file of fileList) {
    readFile(file);
    // alert('So far it is just a demo.\nChoose tests on the left to see what is what.\n\nAmihay Blau');
  }
});

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('drop-zone').classList.remove('pale');
  var file = event.dataTransfer.files[0];
  readFile(file);
  //document.getElementById('drop_zone').style.display = 'none';
}

function handleDragOver(event) {
  event.preventDefault();
  //event.target.style.backgroundColor = "#59F2F7";
  document.getElementById('drop-zone').classList.add('pale');
}

function handleDragLeave(event) {
  event.preventDefault();
  //event.target.style.backgroundColor = "#59F2F7";
  document.getElementById('drop-zone').classList.remove('pale');
}

/////////// End of Read and process files ///////////



// Set pressed button color to active
// let previousLink = null;
let previousLink = document.getElementById('torque-test-button');

document.querySelectorAll('.button').forEach(link => {
  link.addEventListener('click', function (event) {
    event.preventDefault(); // Prevent the default link behavior

    // Reset the previous link's color
    if (previousLink) {
      previousLink.classList.remove('active');
    }

    // Set the current link's color
    this.classList.add('active');

    // Update the previous link
    previousLink = this;
  });
});
// End of Set pressed button color to active


// function showTorqueTest() {
//   cleanUp();

//   const pl = createSplitPlotlyTable('plot-area');

//   // Main plot: Angle vs Current (Hysteresis plot)
//   plot(pl, 0, 0, rows.angle, rows.torque, traceName = 'Angle', title = "Command - Position", "Angle [deg]", 'Torque [mNm]', null, false, 'markers');
  
//   // Calculate regression and add regression line
//   const regressionResult = calculateRegression();
//   if (regressionResult) {
//     plot(pl, 0, 0, rows.regressionAngles, rows.regressionCurrents, traceName = 'Regression', title = "Command - Position", "Angle [deg]", 'Torque [mNm]', 'red', true, 'lines');
//   }
  
//   // Top right: Angle vs Time
//   plot(pl, 0, 1, mult(rows.time, 0.001), rows.angle, traceName = 'Angle', title = "Position", "Time [s]", "Angle [deg]", null, false);
  
//   // Bottom right: Current vs Time
//   plot(pl, 1, 1, mult(rows.time, 0.001), rows.current, traceName = 'Current', title = "Current", "Time [s]", "Current [Amp]", null, false);
// }


// Add event listeners for input validation
// document.addEventListener('DOMContentLoaded', function() {
//   const minAngleInput = document.getElementById('minAngleInput');
//   const maxAngleInput = document.getElementById('maxAngleInput');
//   const velocityInput = document.getElementById('velocityInput');

//   minAngleInput.addEventListener('change', () => validateAngleInput(minAngleInput));
//   maxAngleInput.addEventListener('change', () => validateAngleInput(maxAngleInput));
//   velocityInput.addEventListener('change', () => validateVelocityInput(velocityInput));
// });


function AnalyzeRecord(){
  // Trigger file selector when Analyze Record is clicked
  const fileSelector = document.getElementById('file-selector');
  fileSelector.click();

  // Add one-time event listener for file selection
  fileSelector.addEventListener('change', function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      readFile(file);
    }
    // Remove the event listener after it's used
    fileSelector.removeEventListener('change', handleFileSelect);
    // Reset the file input
    fileSelector.value = '';
  }, { once: true });
}

function recordData() {
  // Toggle recording state
  shouldRecordData = !shouldRecordData;
  
  if (shouldRecordData) {
    // Turn ON recording
    console.log('Recording started');
    
    // Reset the rows array
    rows = {
      time: [],
      Tr_angle: [],
      Tr_velocity: [],
      Tr_current: [],
      El_angle: [],
      El_velocity: [],
      El_current: [],
    };
    
    // Set start time to now
    startTime = Date.now();
    
    // Change record data circle to red
    const recordButton = document.getElementById('recordButton');
    if (recordButton) {
      recordButton.style.color = '#dc3545'; // Bootstrap red
    }
    
  } else {
    // Turn OFF recording
    console.log('Recording stopped');
    
    // Change record data circle back to default color
    const recordButton = document.getElementById('recordButton');
    if (recordButton) {
      recordButton.style.color = ''; // Reset to default
    }
    
    // Save data to CSV
    saveDataToCSV();
  }
}


