# Project Map — Lynx Gimbal Control

> **For AI agents:** Read this file before making any changes. It describes the full project structure, how the code is organized, and the key conventions you must follow.

---

A **Progressive Web App (PWA)** that runs in the browser and communicates with the Lynx gimbal hardware over a USB/serial cable using the Web Serial API.  
No server is required — open `index.html` directly (or host it on GitHub Pages) and the app works offline too.

---

## Top-level files

| File | Purpose |
|---|---|
| `index.html` | Single-page application shell — loads all scripts, defines all HTML panels |
| `StyleSheet.css` | All visual styling (light/dark themes, layout, buttons, panels) |
| `manifest.json` | PWA metadata — name, icons, display mode (installable as a desktop app) |
| `sw.js` | Service Worker — caches all assets so the app works offline |
| `LICENSE` | License file |
| `README.md` | Short project description |

---

## JavaScript modules (`js/`)

Scripts are loaded in this order in `index.html` so that each file can rely on the ones above it:

```
constants.js → mathUtils.js → uiUtils.js → gimbalSerial.js
             → fileHandling.js → plotting.js → movementControl.js → app.js
```

### `js/constants.js`
Defines all **numbers and settings** that are used across the whole app — never changed at runtime.

Key values:
- `deg2ticks = 2¹⁸ / 360` — converts degrees to encoder ticks
- `SERIAL_BAUD_RATE = 115200`
- `DEFAULT_VELOCITY`, `MAX_VELOCITY` (deg/s)
- `PREDEFINED_POSITIONS` — home, topRight, topLeft, bottomRight, bottomLeft
- UI sizing constants (sidebar width, plot height, etc.)

---

### `js/mathUtils.js`
**Pure math helpers** — no DOM access, no serial.

| Function | What it does |
|---|---|
| `diff(y)` | Numerical derivative |
| `integrate(y)` | Numerical integral |
| `filter(y, ws)` | 2nd-order low-pass filter |
| `detrend(y)` | Remove linear trend |
| `fixAngle(y)` | Unwrap angle (fix 360° wrapping jumps) |
| `std(v)` | Standard deviation |
| `fitLinear(x, y)` | Linear regression (slope + bias) |
| `mult`, `plus`, `minusArrays`, etc. | Array arithmetic shortcuts |
| `createStreamingMedian5()` | Rolling 5-sample median filter (used for live angle smoothing) |

---

### `js/uiUtils.js`
**DOM helper functions** — building tables, managing panels, updating inputs, audio.

Key responsibilities:
- `drawTable()` / `drawTableOneCol()` — render results tables
- `updateInputValue()` — update a live-data input field on screen
- `playLocalTone()` — plays the ping sound on joystick moves
- Panel open/close helpers (sidebar, movement panel, installation panel)
- `cleanUp()` — clears the plot area before drawing new charts
- `showTorqueTest()` — lays out the post-test analysis view

---

### `js/gimbalSerial.js`
**All serial communication** with the hardware via the Web Serial API.

Key responsibilities:

| Function | What it does |
|---|---|
| `requestSerialPort()` | Opens the COM port (prompts user to pick it) |
| `closeSerialPort()` | Closes connection and releases locks |
| `reconnectSerialPort()` | Closes and reopens the same port (used after `sv;` save command) |
| `sendMsg(msg)` | Sends a command string to the gimbal |
| `readMsg(msg)` | Sends a command and reads back the response |
| `flushSerialReader()` | Clears stale bytes from the receive buffer |
| `showLiveData(state)` | Starts/stops a 20 ms polling loop |
| `updateLiveData()` | Reads one snapshot of telemetry, updates UI inputs, and appends to `rows` if recording |
| `parsePairs(input)` | Parses `"R1[10];0;R1[31];-1226;..."` style responses |
| `decodeRegisters(R1,R2,R3)` | Decodes three packed 32-bit registers into position/velocity/current fields (alternative compact protocol) |

**Serial locking:** A semaphore (`serialLockDepth`) prevents the live-data loop from colliding with manual commands. `runWithSerialLock(fn)` wraps any write/read that needs exclusive access.

**Alignment sentinel (`R1[125]`):** The non-packed read command always requests `R1[125]` first. This register always returns `255` (0xFF) and acts as a sync marker. In `updateLiveData()`, after splitting the response, `values.indexOf(255)` finds the sentinel at position `i`. All 7 data registers are then read at `i+1` … `i+7`. If `i > 0` the parser self-corrects for stale leading bytes and logs a warning; if `255` is absent entirely the frame is discarded.

---

### `js/fileHandling.js`
**CSV import and export.**

| Function | What it does |
|---|---|
| `readFile(file)` | Parses a CSV file into the global `rows` object, then calls `showTorqueTest()` |
| `saveDataToCSV(prefix)` | Downloads the current `rows` recording as a `.csv` file with a timestamp in the name |
| `exportToCsv(filename, rows)` | Generic CSV exporter (any `rows` object) |
| `processData()` | Post-processes a loaded data file (computes aim errors, derivatives, etc.) for advanced analysis |
| `formatTimestamp()` | Returns `yymmdd_HHMMSS` string for filenames |

CSV columns saved by `saveDataToCSV`:  
`Time_s, Tr_Angle_deg, Tr_Velocity_deg/s, Tr_Current_A, El_Angle_deg, El_Velocity_deg/s, El_Current_A, Tr_Cmd_Angle_deg, El_Cmd_Angle_deg, Status`

---

### `js/plotting.js`
**All charts**, built on [Plotly.js](https://plotly.com/javascript/).

Key functions:
- `createPlotlyTable(m, n, containerId)` — creates an m×n grid of chart divs
- `createSplitPlotlyTable(containerId)` — creates the standard "one big + two small" layout used for test results
- `plot(handle, row, col, x, y, ...)` — draws or updates a single trace on a chart
- Various helpers for adding annotations, formatting axes, etc.

---

### `js/movementControl.js`
**Gimbal movement commands** sent over serial.

| Function | What it does |
|---|---|
| `sendToAngles()` | Moves both axes to the angles typed in the UI |
| `moveToPosition(name, tr, el)` | Moves to a named preset position |
| `runScenario(scenario)` | Runs built-in scenarios: `'scan'`, `'demo1'`, `'demo2'` |
| `joystickCmd(direction)` | Increments/decrements traverse or elevation by 1° |
| `sendVelocity(v)` | Sends velocity to both axes; clamps to `MAX_VELOCITY` |
| `setZeroAngles(axis)` | Calibration: sets current position as the zero angle for an axis |
| `commutation(axis)` | Motor commutation procedure (automatic, with progress indicator) |
| `commutationStepByStep(axis)` | Alternative step-by-step commutation using torque control |
| `playTune()` | Sends `R1[1]=8` — plays a melody on the gimbal |
| `updateMovementStatus(msg, type)` | Updates the status bar text and color |
| `validateMovementPrerequisites()` | Checks that serial is connected and motor is on before any move |

---

### `js/app.js`
**Application entry point** — wires everything together.

Key responsibilities:
- Theme toggle (light/dark), persisted in `localStorage`
- Emergency stop (`stopSignClick`) — sends stop command 5 times then turns motor off
- `connectToggle()` — connects/disconnects serial and starts/stops live data
- `motorToggle()` — enables/disables the motor drive
- `startTorqueTest()` — runs the automated sweep test (move between min/max angle for N cycles, record data, auto-save CSV)
- `recordData()` — manual start/stop of data recording
- `AnalyzeRecord()` — opens a file picker to load a previously saved CSV
- Drag-and-drop zone for CSV files
- Active button highlighting

**Global data store (`rows` object):**
```
rows = {
  time, Tr_angle, Tr_velocity, Tr_current,
  El_angle, El_velocity, El_current,
  Tr_cmd_angle, El_cmd_angle, status
}
```
This object is filled by `updateLiveData()` during recording and read by `saveDataToCSV()` and the plotting functions.

---

## Vendor libraries (`vendor/`)

| File | Library | Used for |
|---|---|---|
| `plotly-latest.min.js` | [Plotly.js](https://plotly.com/javascript/) | All charts and plots |
| `sweetalert2@11.js` | [SweetAlert2](https://sweetalert2.github.io/) | Confirmation/error dialogs |
| `regression.min.js` | [regression-js](https://github.com/tom-alexander/regression-js) | Curve fitting on test data |
| `font-awesome.min.css` | [Font Awesome 4](https://fontawesome.com/v4/) | Icons (sun/moon, etc.) |

---

## Assets

| Folder | Contents |
|---|---|
| `images/` | App logos, Lynx gimbal photos (day/night), Rafael logo, stop-sign SVG |
| `fonts/` | Font Awesome webfont files |
| `assets/` | `minimal-ping.mp3` (joystick click sound), `knob.zip` |

---

## Data flow summary

```
Hardware (gimbal) ──USB──► Web Serial API
                                │
                         gimbalSerial.js
                         (sendMsg / readMsg)
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
          app.js          movementControl.js    updateLiveData()
       (test logic,        (move commands,          │
        recording)          installation)      rows{} object
              │                                     │
         fileHandling.js                      plotting.js
         (save/load CSV)                    (draw charts)
```
