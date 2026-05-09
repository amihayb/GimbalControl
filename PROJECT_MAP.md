# Project Map — Lynx Gimbal Control

> **For AI agents:** Read this file before making any changes. It describes the full project structure, how the code is organized, and the key conventions you must follow.

---

A **Progressive Web App (PWA)** that runs in the browser and communicates with the Lynx gimbal hardware over a USB/serial cable using the Web Serial API.  
No server is required — open `index.html` directly (or host it on GitHub Pages) and the app works offline too.  
**Important:** because the app is opened as a `file://` URL locally, ES-module `import` is blocked by CORS. All scripts are loaded as plain classic `<script>` tags.

---

## Top-level files

| File | Purpose |
|---|---|
| `index.html` | Single-page application shell — loads all scripts, defines all HTML panels |
| `StyleSheet.css` | All visual styling (light/dark themes, layout, buttons, panels) |
| `manifest.json` | PWA metadata — name, icons, display mode (installable as a desktop app) |
| `sw.js` | Service Worker — caches assets for offline use |
| `LICENSE` | License file |
| `README.md` | Short project description |
| `PROJECT_MAP.md` | This file |

---

## JavaScript modules (`js/`)

Scripts are loaded in this exact order in `index.html`:

```
constants.js → mathUtils.js → uiUtils.js → gimbalSerial.js
             → fileHandling.js → plotting.js → movementControl.js → app.js
             → blauplot-bundle.js
```

Each file exposes its public API by assigning to `window.*` at the bottom, so later scripts can call them.

---

### `js/constants.js`
Defines all **numbers and settings** used across the app — never changed at runtime.

Key values:
- `deg2ticks = 2¹⁸ / 360` — converts degrees to encoder ticks
- `r2d`, `d2r` — radian/degree conversion factors
- `SERIAL_BAUD_RATE = 115200`
- `DEFAULT_VELOCITY`, `MAX_VELOCITY` (deg/s)
- `PREDEFINED_POSITIONS` — home, topRight, topLeft, bottomRight, bottomLeft
- `MOVEMENT_STATUS_TYPES`, `STATUS_COLORS`
- `initialRows` — blank template for the `rows` recording object

---

### `js/mathUtils.js`
**Pure math helpers** — no DOM access, no serial.

| Function | What it does |
|---|---|
| `diff(y)` | Numerical derivative |
| `integrate(y)` | Numerical integral |
| `filter(y, ws)` | 2nd-order Butterworth low-pass filter |
| `detrend(y)` | Remove linear trend |
| `fixAngle(y)` | Unwrap angle (fix 360° wrapping jumps) |
| `std(v)` | Standard deviation |
| `fitLinear(x, y)` | Linear regression (slope + bias) |
| `mult`, `plus`, `minusArrays`, etc. | Array arithmetic shortcuts |
| `applySignalProcessing(rows)` | Copies rows, scales time/angles/currents to physical units, applies median filter |
| `createStreamingMedian5()` | Rolling 5-sample median filter (used for live angle smoothing) |

---

### `js/uiUtils.js`
**UI panels, ATP test flows, and IBIT results rendering.**

Key responsibilities:

| Function | What it does |
|---|---|
| `drawTable(data)` | Renders a 4-column pass/fail table (Parameter, Traverse, Elevation, Criteria) into `#resultsTable` |
| `updateInputValue(id, value, scale)` | Updates a live-data input field on screen |
| `playLocalTone()` | Plays the ping sound on joystick moves |
| `MovementControl()` | Opens the movement control side panel |
| `closeMovementControl()` | Closes it and restores layout margins |
| `InstallationSetup()` | Opens the installation setup side panel |
| `closeInstallationSetup()` | Closes it and restores layout margins |
| `ATP()` | Opens the ATP test side panel |
| `closeATP()` | Closes it and restores layout margins |
| `showIBITResults()` | After IBIT: hides welcome area, clears `#plot-area`, renders 2×2 BlauPlot subplot + limit lines + pass/fail table via `window.BP` |
| `runIBIT()` | Full IBIT procedure: connect check, trigger, record, poll R1[51], save CSV, call `showIBITResults()` |
| `runSineTest()` | Sine scenario: random angles, record, save CSV |
| `runFrictionTest()` | Friction test: sweep, record, save CSV |
| `waitForPosition(tr, el)` | Polls until gimbal reaches target angles |
| `updateErrorBits(val)` | Decodes R1[9] error bits and updates UI |

**Layout margin management:** Every panel open/close function adjusts `marginLeft` on three elements together: `#explenation_text`, `#plot-area`, and `#resultsTable`.
- Panel open → `720px` (350px main sidebar + 350px panel + 20px gap)
- Panel close → `370px` (350px main sidebar + 20px gap)

---

### `js/gimbalSerial.js`
**All serial communication** with the hardware via the Web Serial API.

| Function | What it does |
|---|---|
| `requestSerialPort()` | Opens the COM port (prompts user to pick it) |
| `closeSerialPort()` | Closes connection and releases locks |
| `reconnectSerialPort()` | Closes and reopens the same port (used after `sv;` save command) |
| `sendMsg(msg)` | Sends a command string to the gimbal |
| `readMsg(msg)` | Sends a command and reads back the response |
| `flushSerialReader()` | Clears stale bytes from the receive buffer |
| `showLiveData(state)` | Starts/stops a 20 ms polling loop |
| `updateLiveData()` | Reads one telemetry snapshot, updates UI inputs, appends to `rows` if recording |
| `parsePairs(input)` | Parses `"R1[10];0;R1[31];-1226;..."` style responses |
| `decodeRegisters(R1,R2,R3)` | Decodes three packed 32-bit registers into position/velocity/current fields |

**Serial locking:** A semaphore (`serialLockDepth`) prevents the live-data loop from colliding with manual commands. `runWithSerialLock(fn)` wraps any write/read that needs exclusive access.

**Alignment sentinel (`R1[125]`):** Always returns `255` and acts as a sync marker. In `updateLiveData()`, `values.indexOf(255)` finds the sentinel; the 7 data registers follow at positions `i+1`…`i+7`. If `255` is absent the frame is discarded.

---

### `js/fileHandling.js`
**CSV import and export.**

| Function | What it does |
|---|---|
| `readFile(file)` | Parses a CSV into the global `rows` object, maps legacy column names, calls `showTorqueTest()` |
| `saveDataToCSV(prefix)` | Downloads current `rows` as a `.csv` with a timestamp in the name |
| `exportToCsv(filename, rows)` | Generic CSV exporter |
| `applySignalProcessingToRows()` | Delegates to `applySignalProcessing` from `mathUtils.js` |
| `formatTimestamp()` | Returns `yymmdd_HHMMSS` string for filenames |

CSV columns saved by `saveDataToCSV`:  
`Time_s, Tr_Angle_deg, Tr_Velocity_deg/s, Tr_Current_A, El_Angle_deg, El_Velocity_deg/s, El_Current_A, Status`

---

### `js/plotting.js`
**Plotly.js chart helpers** (legacy, multi-cell layout style).

| Function | What it does |
|---|---|
| `createPlotlyTable(m, n, containerId)` | Creates an m×n grid of chart divs inside a container |
| `createSplitPlotlyTable(containerId)` | Creates the "one big + two small" layout |
| `plot(handles, row, col, x, y, ...)` | Draws or adds a trace to a single cell |
| `addLimitLine(handles, row, col, val)` | Adds a horizontal limit line to a cell |
| `addDivider(handles, row, col, val)` | Adds a vertical event divider line |
| `addLine(vName, ax_y, ax_x, factor, ...)` | Builds a Plotly trace from `rows[vName]` |
| `plotTraces(traces, rows, cols)` | Renders all traces with a subplot layout into `#plot-area` |

> **Note:** `plotting.js` assigns `window.calculateRegression` but the function body is commented out — this causes a `ReferenceError` at startup. Avoid calling `calculateRegression()`.

---

### `js/movementControl.js`
**Gimbal movement commands** sent over serial.

| Function | What it does |
|---|---|
| `sendToAngles()` | Moves both axes to angles typed in the UI |
| `moveToPosition(name, tr, el)` | Moves to a named preset position |
| `runScenario(scenario)` | Runs `'scan'`, `'demo1'`, or `'demo2'` |
| `joystickCmd(direction)` | Increments/decrements traverse or elevation by 1° |
| `sendVelocity(v)` | Sends velocity to both axes; clamps to `MAX_VELOCITY` |
| `setZeroAngles(axis)` | Sets current position as the zero angle for an axis |
| `commutation(axis)` | Automated motor commutation with progress indicator |
| `commutationStepByStep(axis)` | Step-by-step commutation using torque control |
| `playTune()` | Sends `R1[1]=8` — plays a melody on the gimbal |
| `updateMovementStatus(msg, type)` | Updates the status bar text and color |
| `validateMovementPrerequisites()` | Checks serial is connected and motor is on |

---

### `js/app.js`
**Application entry point** — wires everything together.

Key responsibilities:
- Theme toggle (light/dark), persisted in `localStorage`
- Emergency stop (`stopSignClick`) — sends stop command 5 times then turns motor off
- `connectToggle()` — connects/disconnects serial and starts/stops live data
- `motorToggle()` — enables/disables the motor drive
- `startTorqueTest()` — runs the automated sweep test (cycle between min/max angle, record data, auto-save CSV)
- `recordData()` — manual start/stop of data recording
- `AnalyzeRecord()` — opens a file picker to load a previously saved CSV
- Drag-and-drop zone for CSV files
- Active button highlighting

**Global data store (`rows` object):**
```js
rows = {
  time,           // ms since recording start
  Tr_angle,       // traverse angle (deg)
  Tr_velocity,    // traverse velocity (deg/s)
  Tr_current,     // traverse current (A)
  El_angle,       // elevation angle (deg)
  El_velocity,    // elevation velocity (deg/s)
  El_current,     // elevation current (A)
  Tr_cmd_angle,   // traverse commanded angle (deg)
  El_cmd_angle,   // elevation commanded angle (deg)
  status          // status word
}
```
Filled by `updateLiveData()` during recording; read by `saveDataToCSV()` and plotting functions.

---

### `js/blauplot-bundle.js`
**BlauPlot bundled as a plain script** — safe for `file://` origin (no ES module imports).

Exposes `window.BP` with:

| Property | Source | What it does |
|---|---|---|
| `BP.buildLine(signal, rows, subplotIdx, xKey, opts)` | `BlauPlot/plot.js` | Builds a Plotly trace for one signal |
| `BP.buildLayout(rows, cols, opts)` | `BlauPlot/plot.js` | Builds a Plotly layout for an N×M subplot grid |
| `BP.plot(containerId, traces, layout, config?)` | `BlauPlot/plot.js` | Calls `Plotly.newPlot` |
| `BP.yline(containerId, value, opts)` | `BlauPlot/plot.js` | Adds a horizontal limit/threshold line |
| `BP.drawTableOneCol(containerId, data)` | `BlauPlot/table.js` | Renders a 3-column pass/fail table (Parameter, Value, Criteria) |
| `BP.clearTable(containerId)` | `BlauPlot/table.js` | Empties a table container |
| `BP.stats(arr)` | `BlauPlot/math.js` | Returns `{ mean, std, min, max, n }` |

**Used by:** `showIBITResults()` in `uiUtils.js`.  
**Why a bundle:** `BlauPlot/*.js` uses ES module syntax (`export`), which Chrome blocks on `file://` URLs. `blauplot-bundle.js` is a manually maintained IIFE copy.

---

## BlauPlot library (`BlauPlot/`)

The original ES-module source of the BlauPlot charting library. **Not loaded directly by `index.html`** — `blauplot-bundle.js` is the in-browser version. These files are the source of truth; if you change them, update `blauplot-bundle.js` to match.

| File | Purpose |
|---|---|
| `index.js` | Barrel re-export of `parser.js`, `plot.js`, `table.js` (not `math.js`) |
| `plot.js` | `buildLine`, `buildLayout`, `plot`, `yline`, `xline`, `enableDataTips` |
| `table.js` | `drawTable`, `drawTableOneCol`, `clearTable` |
| `math.js` | Pure functions: `diff`, `integrate`, `filter`, `stats`, `smoothAngle`, etc. |
| `parser.js` | `parseFile` (async), `parseText` — CSV parsing |

---

## HTML structure (`index.html`)

```
<body>
  #topnav          — file open, record button, Glimpse link, theme toggle, about
  #sidenav         — connection, motor, live telemetry inputs, nav buttons
  #drop-zone       — main content area (position: relative)
    #explenation_text  — welcome text + lynx image (hidden after IBIT/test)
    #resultsTable      — <div> container for pass/fail table (drawn by BP.drawTableOneCol or drawTable)
    #plot-area         — container for all charts
      #plot            — Plotly renders IBIT 2×2 grid here
  .movement-panel  — (dynamically appended to body when open)
```

**Margin layout:**

| State | `#explenation_text` | `#resultsTable` | `#plot-area` |
|---|---|---|---|
| Default (CSS) | `margin-left: 370px` | `margin-left: 370px` (via `.plot-area` class) | `margin-left: 370px` |
| Panel open (JS) | `720px` | `720px` | `720px` |
| Panel closed (JS) | `370px` | `370px` | `370px` |

---

## Vendor libraries (`vendor/`)

| File | Library | Used for |
|---|---|---|
| `plotly-latest.min.js` | [Plotly.js](https://plotly.com/javascript/) | All charts (`window.Plotly`) |
| `sweetalert2@11.js` | [SweetAlert2](https://sweetalert2.github.io/) | Confirmation/error dialogs (`window.Swal`) |
| `regression.min.js` | [regression-js](https://github.com/tom-alexander/regression-js) | Curve fitting |
| `font-awesome.min.css` | [Font Awesome 4](https://fontawesome.com/v4/) | Icons |

---

## Assets

| Folder | Contents |
|---|---|
| `images/` | App logos, Lynx gimbal photos (day/night), Rafael logo, stop-sign SVG |
| `fonts/` | Font Awesome webfont files |
| `assets/` | `minimal-ping.mp3` (joystick click sound) |

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
         fileHandling.js          ┌──────────────────┤
         (save/load CSV)          │                  │
                             plotting.js      blauplot-bundle.js
                         (legacy charts)    (BP: IBIT 2×2 grid,
                                             limit lines, table)
```

---

## Known issues / caveats

| Issue | Location | Impact |
|---|---|---|
| `calculateRegression` assigned to `window` but function is commented out | `js/plotting.js` bottom | `ReferenceError` at page load — avoid calling it |
| `showTorqueTest()` called from `fileHandling.js` and `app.js` but not defined | — | Loading a CSV throws `ReferenceError` |
| `turnOffMotor` defined in both `app.js` and `movementControl.js` | both | Last-loaded wins (`movementControl.js`) |
| `BlauPlot/*.js` and `js/blauplot-bundle.js` can drift out of sync | `blauplot-bundle.js` | Update bundle manually when BlauPlot source changes |
| `sw.js` does not pre-cache `js/blauplot-bundle.js` | `sw.js` | Will still load from network/fetch-cache fallback |
