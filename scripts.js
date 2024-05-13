let serialPort;
let motorOn = false;

function openClosePort(event) {
    const button = document.getElementById('connectButton');
    if (button.textContent === 'Connect') {
        requestSerialPort()
        //if (serialPort) {
        button.textContent = 'Disconnect';
        button.style.background = "#008080";
        /*} else {
            button.textContent = 'Nope';
            button.style.background="#108080";
        }*/
    } else {
        closeSerialPort();
        button.textContent = 'Connect';
        button.style.background = "#5898d4";
    }
}

async function requestSerialPort() {
    try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });
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
    //const message = 'Yes!';
    const writer = serialPort.writable.getWriter();
    await writer.write(new TextEncoder().encode(message));
    writer.releaseLock();
    console.log(`Sent: ${message}`);
}

async function closeSerialPort() {
    if (serialPort) {
        await serialPort.close();
        console.log('Serial port closed.');
    }
}

function motorState() {
    const button = document.getElementById('motorOnButton');
    if (motorOn) {
        // Turn Motors Off
        sendMsg("R1[1]=0");
        button.style.background = "#5898d4";
    } else { // Turn Motors On
        if (!serialPort) {
            alert('Please connect to driver first');
        } else {
            sendMsg("R1[1]=1");
            button.style.background = "#008080";
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

        const message = `R1[11]=${trAngValue}, R1[21]=${elAngValue}`;
        console.log(message);
        sendMsg(message);
    } else {
        alert('Motors are off, \nPlease turn on motors first');
    }
}

function startScenario(scenarioNumber) {

    if (motorOn) {
        const message = `R1[1]=2, R1[2]=${scenarioNumber}`;
        console.log(message);
        sendMsg(message);
    } else {
        alert('Please turn on motors first');
    }
}

function goTo(direction) {
    console.log(direction);
    playLocalTone();
}


function playLocalTone() {
    const audioElement = document.getElementById('localAudio');
    audioElement.play();
}