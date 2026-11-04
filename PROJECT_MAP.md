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
| `README.md` | User guide + serial protocol reference (R1 registers, Elmo fields) |
| `PROJECT_MAP.md` | This file |

---

## JavaScript modules (`js/`)

Scripts are loaded in this exact order in `index.html`:

```
constants.js → mathUtils.js → uiUtils.js → atpTests.js → panelUI.js
             → gimbalSerial.js → fileHandling.js → plotting.js
             → movementControl.js → app.js → blauplot-bundle.js
```

Each file exposes its public API by assigning to `window.*` at the bottom, so later scripts can call them.

---

### `js/constants.js`
Defines all **numbers and settings** used across the app — never changed at runtime. **Put new tunable values here, not inline in the code.**

Key values:
- `deg2ticks = 2¹⁸ / 360` — converts degrees to encoder ticks
- `r2d`, `d2r` — radian/degree conversion factors
- `SERIAL_BAUD_RATE = 115200`
- `DEFAULT_VELOCITY`, `MAX_VELOCITY` (deg/s)
- `PREDEFINED_POSITIONS` — home and the four corners; also the TR/EL limits used by the position pad and the friction sweep
- `FEATURES` — show/hide optional UI (developer setting, not a user toggle). `joystick: false` hides the round joystick in Movement Control; `complexScenarios: false` hides Sine Move / Repeat Linear (their `startSineMove()` / `startLinearMove()` are unimplemented stubs)
- `ARRIVAL_TOLERANCE_DEG` — distance at which an axis counts as "arrived" (`waitForPosition`, friction sweep)
- `SCENARIOS` — Demo 1 / Demo 2 profiles (amplitude, rate, center per axis), sent via `sineScenarioCmd()`
- `ATP_CONFIG` — all ATP test settings and pass/fail limits: `testVelocity`, `ibit` (timeout, status codes, sector, tolerances), `sine` (profile, duration, limits), `friction` (sweep velocity, limit). Plots, tables, popups and PDF report text read their limits from here
- `SYSTEM_MODE_NAMES` — `R1[10]` value → name, shown as e.g. "1 – Position" in `#systemModeInput`
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
**Small DOM utilities** — helpers used across the whole app.

| Function | What it does |
|---|---|
| `about()` | Shows the about/contact SweetAlert dialog |
| `drawTable(data)` | Renders a 4-column pass/fail table (Parameter, Traverse, Elevation, Criteria) into `#resultsTable` |
| `drawTableOneCol(data)` | Renders a 3-column single-value pass/fail table into `#resultsTable` |
| `cleanUp()` | Hides welcome text, clears `#resultsTable` |
| `addLabelsLine()` | Toggles the labels nav bar |
| `playLocalTone()` | Plays the ping sound on joystick moves |
| `validateAngleInput(el)` | Validates a degree input field |
| `validateVelocityInput(el)` | Validates a velocity input field |
| `waitForPosition(tr, el)` | Polls `PositionInputTR/EL` until gimbal reaches target angles |
| `updateInputValue(id, value, factor, dp)` | Scales a raw number and sets an input field value |
| `updateErrorBits(val)` | Decodes R1[9] error bits and updates `#errorBitsDisplay` |

---

### `js/atpTests.js`
**ATP test sequences, results rendering, and PDF report generation.**

| Function | What it does |
|---|---|
| `showIBITResults(plotId?, tableId?)` | Renders 2×2 BlauPlot subplot + limit lines + pass/fail table |
| `showSineTestResults(plotId?, tableId?)` | Renders sine test plot + table |
| `showFrictionTestResults(tr, el, plotId?, tableId?)` | Renders friction analysis plots + table |
| `finishIbitTableResults(silent?)` | Computes pass/fail, optionally shows result popup, calls `showIBITResults()` |
| `finishSineTestResults(detail?, silent?)` | Same pattern for sine test |
| `finishFrictionTestResults(silent?)` | Same pattern for friction test |
| `handleAtpCsvLoaded(fileName)` | Called when a CSV is loaded; routes to the right `finish*` function with `silent=true` (no popup) |
| `runIBIT()` | Full IBIT procedure: connect check, trigger, record, poll R1[51], save CSV |
| `runSineTest()` | Moves to TR −90°, EL 15°, runs sine scenario, records 15 s, saves CSV, returns home |
| `runFrictionTest()` | Slow sweep bottom-left → top-right → bottom-left, records throughout, saves CSV |
| `vtMarkTestLoaded(type)` | Saves `rows` snapshot into `vtSavedRows`, enables Show Results button, checks if all 3 loaded |
| `resetVtLoadedTests()` | Clears `vtSavedRows` and `vtLoadedTests` state |
| `checkAllTestsLoaded()` | Shows Print to PDF button when all 3 tests are loaded |
| `vtShowIbitResults()` | Re-displays IBIT from saved snapshot (no popup) |
| `vtShowSineResults()` | Re-displays Sine Test from saved snapshot |
| `vtShowFrictionResults()` | Re-displays Friction Test from saved snapshot |
| `printAtpReport()` | Builds and opens a print-ready PDF report — reads metadata from panel fields, captures plots with forced white theme, includes logo header (repeats every page via `<thead>`), summary page with per-test pass/fail and overall result |

**`silent` parameter on `finish*` functions:** when `true`, skips the pass/fail SweetAlert popup. Used when loading CSVs from the ATP Results panel.

**`vtSavedRows`:** module-level object `{ ibit, sine, friction }` holding deep copies of `rows` for each loaded test — used by `printAtpReport` and the `vtShow*` functions.

**Depends on:** `uiUtils.js` (`waitForPosition`), `gimbalSerial.js`, `fileHandling.js`, `movementControl.js`, `blauplot-bundle.js` (`window.BP`), `mathUtils.js` (`minAbs`, `plus`), `app.js` (`rows`, `shouldRecordData`, `startTime`).

---

### `js/panelUI.js`
**Side-panel open/close functions** — builds and destroys the three navigation panels, and adjusts content-area margins.

| Function | What it does |
|---|---|
| `MovementControl()` | Opens the movement control side panel |
| `closeMovementControl()` | Closes it and restores layout margins |
| `openComplexScenario(type)` | Opens sine/linear scenario configuration dialog |
| `closeComplexScenario()` | Closes the dialog |
| `InstallationSetup()` | Opens the installation setup side panel |
| `closeInstallationSetup()` | Closes it and restores layout margins |
| `ATP()` | Opens the ATP test side panel |
| `closeATP()` | Closes it and restores layout margins |
| `ViewTelemetry()` | Opens the **ATP Results** side panel (id `view-telemetry-panel`) with file choosers for IBIT, Sine Test, and Friction Test CSVs, plus metadata input fields |
| `closeViewTelemetry()` | Closes the ATP Results panel and restores layout margins |

**ATP Results panel fields** (all `vt-` prefixed, read by `printAtpReport()` for the PDF cover page):
- Metadata: gimbal no., operator, date/time (pre-filled on open), remarks
- Driver Info (filled by `readDriverInfo()`): param version, SIL version, CA[7] TR/EL, zero offset TR/EL — see the Elmo fields table in `README.md`

Every panel open/close function also sets the content margins (see *Margin layout* below).

---

### `js/gimbalSerial.js`
**All serial communication** with the hardware via the Web Serial API.

| Function | What it does |
|---|---|
| `requestSerialPort()` | Opens the COM port (prompts user to pick it) |
| `closeSerialPort()` | Closes connection and releases locks |
| `reconnectSerialPort()` | Closes and reopens the same port (used after `sv;` save command) |
| `sendMsg(msg)` | Sends a command string to the gimbal |
| `readMsg(msg, options)` | Sends a command and waits for the reply (default: until `;;`, 40 ms timeout; see JSDoc for options) |
| `startReadLoop()` / `stopReadLoop()` | Start/stop the background receive loop |
| `flushSerialReader()` | Waits until the port is quiet, then discards buffered bytes |
| `showLiveData(state)` | Starts/stops a 20 ms polling loop |
| `updateLiveData()` | Reads one telemetry snapshot, updates UI inputs, appends to `rows` if recording; also caches `R1[51]` in `lastIbitStatus` |
| `getLastIbitStatus()` | Returns the most recent `R1[51]` value received via live data (used by `runIBIT`) |
| `resetLastIbitStatus()` | Sets `lastIbitStatus` back to `null` (called before each IBIT run to clear stale values) |
| `parsePairs(input)` | Parses `"R1[10];0;R1[31];-1226;..."` style responses |
| `decodeRegisters(R1,R2,R3)` | Decodes three packed 32-bit registers into position/velocity/current fields |

**Rule — never call `reader.read()` directly.** The background loop is the only reader; it appends to `rxBuffer` and `readMsg` waits on that buffer. A second reader that times out steals the next reply and every following read comes back empty.

**Serial locking:** `runWithSerialLock(fn)` pauses the live-data loop while a manual command runs.

**Live data frame:** starts with `R1[125]`, which always returns `255`. `updateLiveData()` finds the `255` and reads the values after it; frames without it are discarded. Register list: see *Telemetry* in `README.md`.

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
`Time_s, Tr_Angle_deg, Tr_Velocity_deg/s, Tr_Current_A, El_Angle_deg, El_Velocity_deg/s, El_Current_A, Tr_PosErr_deg, El_PosErr_deg, Status`

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
| `sineScenarioCmd(profile)` | Builds the `R1[16..28]; R1[1]=13` command from a profile in `SCENARIOS` or `ATP_CONFIG.sine` |
| `moveToEdge(direction)` | Position pad arrows: `up`/`down` keep the live TR and send EL to max/min; `left`/`right` keep the live EL and send TR to min/max (limits from `PREDEFINED_POSITIONS`) |
| `runScenario(scenario)` | Runs `'scan'`, `'demo1'`, or `'demo2'` |
| `joystickCmd(direction)` | Increments/decrements traverse or elevation by 1° |
| `sendVelocity(v)` | Sends velocity to both axes; clamps to `MAX_VELOCITY` |
| `setZeroAngles(axis)` | Sets the current position as zero for one axis (updates `S[17]`/`S[18]`, restarts the encoder) |
| `commutation(axis)` | Automated motor commutation with progress indicator and safety warning |
| `commutationStepByStep(axis)` | Torque-control commutation. No UI button yet — **do not remove**, planned for future use |
| `pauseLiveDataAndFlush()` | Stops live data, turns echo on, waits 100 ms, flushes. Callers must restart live data in a `finally` block |
| `readRegister(key, attempts = 3)` | Reads one Elmo field (e.g. `ax1.CA[7]`), retrying on a bad reply; returns `NaN` on failure |
| `readZeroOffsets()` | Reads both zero offsets; returns `{ tr, el }` |
| `readCommutationAngles()` | Installation Setup **Read**: CA[7] and zero offsets for both axes |
| `writeCommutationAngles()` | Installation Setup **Write**: CA[7], plus zero offsets if filled in (asks for confirmation) |
| `readDriverInfo()` | ATP Results **Read Driver**: param version, SIL version, CA[7], zero offsets |
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
- `motorToggle()` — **async**; shows a SweetAlert safety warning before enabling the motor drive; cancelling aborts the toggle
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
  Tr_pos_err,     // traverse position error (deg)
  El_pos_err,     // elevation position error (deg)
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

**Used by:** the `show*Results()` functions in `atpTests.js`.  
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
  #topnav          — file open, record button, Glimpse link, theme toggle, about,
                     #app-version (app version text, e.g. "V1.0" — edit here on release), Blau logo
  #sidenav         — connection, motor, live telemetry inputs, nav buttons
  #drop-zone       — main content area (position: relative)
    #explenation_text  — welcome text + lynx image (hidden after IBIT/test)
    #resultsTable      — <div> container for pass/fail table (drawn by BP.drawTableOneCol or drawTable)
    #plot-area         — container for all charts
      #plot            — Plotly renders IBIT 2×2 grid here
  .movement-panel  — (dynamically appended to body when open)
```

**Margin layout:** `#explenation_text`, `#resultsTable` and `#plot-area` always share the same `margin-left`: `370px` by default (350px sidebar + 20px gap), `720px` while a side panel is open (+350px panel).

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
| Several constants in `constants.js` are unused (`ANGLE_CONVERSION_FACTOR`, `CURRENT_MIN/MAX`, `JOYSTICK_STEP`, `CSV_HEADERS`, `SIDEBAR_WIDTH`, …) | `constants.js` | Harmless; candidates for cleanup |
| Every script in `index.html` must also be listed in `STATIC_ASSETS` in `sw.js` | `sw.js` | A missing file can stay stale after a cache-version bump |
