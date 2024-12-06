let serialPort;
let writer;
let reader;

let motorOn = false;
let joystickTr = 0;
let joystickEl = 0;
let intervalMove;
let intervalShowPos;
let changeDir = true;

async function openClosePort(event) {
    const button = document.getElementById('connectButton');
    if (button.textContent === 'Connect') {
        await requestSerialPort()
        //if (serialPort) {
        button.textContent = 'Disconnect';
        button.style.background = "#008080";

        posAngleShow('open');
        /*} else {
            button.textContent = 'Nope';
            button.style.background="#108080";
        }*/
    } else {
        await posAngleShow('close');
        await closeSerialPort();
        button.textContent = 'Connect';
        button.style.background = "#5898d4"; 
    }
}

async function requestSerialPort() {
    try {
        serialPort = await navigator.serial.requestPort();
        //await serialPort.open({ baudRate: 115200 });   // Platinum Drive
        await serialPort.open({ baudRate: 230400 });   // Titanium Drive
        writer = await serialPort.writable.getWriter();
        reader = await serialPort.readable.getReader();
        console.log('Serial port opened successfully!');
        return true;
    } catch (error) {
        console.error('Error connecting to serial port:', error);
        return false;
    }
}

async function sendMsg(message) {
    if (!serialPort) {
        console.error('Serial port not opened. Click "Open Serial Port" first.');
        return;
    }
    //let message = 'Yes!';
    message = message + '\r';
    // const writer = serialPort.writable.getWriter();
    await writer.write(new TextEncoder().encode(message));
    // writer.releaseLock();
    //console.log(`Sent: ${message}`);
}

async function closeSerialPort() {
    if (serialPort) {
        await writer.releaseLock();
        await reader.releaseLock();
        await serialPort.close();
        console.log('Serial port closed.');
    }
}

function motorState() {
    const button = document.getElementById('motorOnButton');
    if (motorOn) {
        // Turn Motors Off
        sendMsg("R1[1]=0\r");
        button.style.background = "#5898d4";
        button.textContent = 'Motor On';
    } else { // Turn Motors On
        if (!serialPort) {
            alert('Please connect to driver first');
        } else {
            sendMsg("R1[1]=1\r");
            button.style.background = "#008080";
            button.textContent = 'Motor Off';
        }
    }
    motorOn = !motorOn;
}

function goToAngle() {

    if (motorOn) {
        const trAngInput = document.getElementById('angTr-input');
        const elAngInput = document.getElementById('angEl-input');
        const trAngValue = trAngInput.value;
        const elAngValue = elAngInput.value;
        
        let message = `R1[11]=${trAngValue}; R1[21]=${elAngValue}`;
        console.log(message);
        sendMsg(message);
        //message = 'R1[1]=1';
        //sendMsg(message);
    } else {
        alert('Motors are off, \nPlease turn on motors first');
    }
}

function startScenario(scenarioNumber) {

    let message = '';

    if (motorOn) {
        joystickTr = 0;
        joystickEl = 0;

        switch (scenarioNumber) {

            case 1:  // Home
                message = 'R1[12]=0; R1[22]=0; R1[11]=0; R1[21]=0; R1[1]=1;';
                break;

            case 2:   // Scan
                message = 'R1[12]=0; R1[22]=0; R1[11]=0; R1[21]=0; R1[1]=2;';
                break

            case 3:   // Demo
                message = 'R1[13]=1; R1[14]=100; R1[15]=90; R1[23]=5; R1[24]=30; R1[25]=10; R1[1]=3;';
                break
            case 4:   // Demo 2
                //message = 'R1[13]=1; R1[14]=50; R1[15]=-60; R1[23]=3; R1[24]=30; R1[25]=15; R1[1]=3;';
                jumpBackForth();
                break                
        }

        console.log(message);
        sendMsg(message);
    } else {
        alert('Please turn on motors first');
    }
}


function sineMove(ax){

    if (motorOn) {
        let message = '';
        // console.log('sineFrq' + ax + '-input');
        const sineFrq = document.getElementById('sineFrq' + ax + '-input').value;
        const sineAmp = document.getElementById('sineAmp' + ax + '-input').value;
        const trAng = document.getElementById('ang' + ax + '-input').value;
        if (ax == 'Tr'){
            message = `R1[13]=${10*sineFrq}; R1[14]=${10*sineAmp}; R1[15]=${trAng}; R1[1]=3`;
        } else {
            message = `R1[23]=${10*sineFrq}; R1[24]=${10*sineAmp}; R1[25]=${trAng}; R1[1]=3`;
        }
        console.log(message);
        sendMsg(message);
    } else {
        alert('Motors are off, \nPlease turn on motors first');
    }
}

function jumpBackForth() {

    if (intervalMove) {
        clearInterval(intervalMove);
        intervalMove = null;
        console.log("Stopped sending commands");
    } else {
        console.log("Start sending commands");
        intervalMove = setInterval(() => {
            if (changeDir) {
                message = 'R1[11]=195; R1[21]=55;';
            } else {
                message = 'R1[11]=200; R1[21]=60;';
            }
            sendMsg(message);
            changeDir = !changeDir;
        }, 1000);
    }
}

async function posAngleShow(state) {

    if (intervalShowPos && state=='close') {
        clearInterval(intervalShowPos);
        intervalShowPos = null;
        console.log("Stopped show pos command interval");
    } else if (state=='open')  {
        console.log("Start show pos command interval");
        intervalShowPos = setInterval(() => {
            setPosBoxes();
        }, 100);
    }
}

async function setPosBoxes() {
    let posTr = await readMsg('R1[31]');
    updateInputValue('angTr-pos', posTr);
    let posEl = await readMsg('R1[41]');
    updateInputValue('angEl-pos', posEl);
}

async function readMsg(message) {
    // Send the message
    await sendMsg(message);
  
    // Initialize the reader for the serial port
    // let reader = serialPort.readable.getReader();
  
    try {
      // Read data from the serial port
      const { value, done } = await reader.read();
  
      if (value) {
        // Convert Uint8Array to string and process the response
        const decodedValue = new TextDecoder().decode(value);
        const response = removeCommand(message, decodedValue);
        return response; // Return the processed response
      } else {
        console.warn("No data received or connection closed.");
        return null;
      }
    } catch (error) {
      console.error("Error reading from serial port:", error);
      return null;
    } finally {
      // Always release the reader lock
    //   await reader.releaseLock();
    }
  }

// async function readMsg(message) {

//             await sendMsg(message);
//             let reader = serialPort.readable.getReader();
//             const { value, done } = await reader.read();
//             if (value) {
//                 // Convert Uint8Array to string for easier reading
//                 // console.log("Received data:", new TextDecoder().decode(value));
//                 response = removeCommand(message, new TextDecoder().decode(value));
//                 console.log(response);
//             }
//             await reader.releaseLock();
// }

function removeCommand(command, response) {
    if (response.startsWith(command)) {
      let result = response.slice(command.length); // Remove the command
      if (result.endsWith(';')) {
        result = result.slice(0, -1); // Remove the trailing ';'
      }
      return result;
    }
    return null; // If command is not at the start, return the original response
  }

  async function updateInputValue(inputId, valueString, factor = 10) {
    // Convert the valueString to a number
    const number = parseFloat(valueString);
    if (isNaN(number)) {
      //console.error(`Invalid number: "${valueString}"`);
      return;
    }
  
    // Calculate the new value
    const newValue = number / factor;
  
    // Update the input box value
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
      inputElement.value = newValue;
    } else {
      console.error(`Input with id "${inputId}" not found.`);
    }
  }

function playTune() {

    if (motorOn) {
        let message = 'R1[1]=8';
        sendMsg(message);
    } else {
        alert('Motors are off, \nPlease turn on motors first');
    }
}

function joystickCmd(direction) {
    playLocalTone();
    console.log(direction);

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
    //console.log(`Joystick TR = ${joystickTr}, EL = ${joystickEl}`);
    let message = `R1[12]=${joystickTr}; R1[22]=${joystickEl}`;
    console.log(message);
    sendMsg(message);
}


function playLocalTone() {
    const audioElement = document.getElementById('localAudio');
    audioElement.play();
}