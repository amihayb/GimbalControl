# Lynx Gimbal Control

A browser-based control and test tool for the **Lynx gimbal**. Connect over USB, move the antenna, run installation and acceptance tests, record telemetry, and view results — no server required.

**Live demo:** [amihayb.github.io/GimbalControl](https://amihayb.github.io/GimbalControl/)

---

## Features

- **Serial connection** — talks to the gimbal over USB using the Web Serial API (115200 baud)
- **Live telemetry** — traverse/elevation angle, velocity, and current
- **Movement control** — go to angles, preset positions, joystick nudging, velocity mode, and demo scenarios
- **Installation setup** — commutation, zero-angle setup, and related procedures
- **Acceptance tests (ATP)** — IBIT, sine test, friction test, and automated torque sweep
- **ATP Results panel** — load saved test CSVs, view results, and print a professional PDF report with logo header, pass/fail summary, and white-background plots
- **Safety warnings** — confirmation dialogs before motor-on and before commutation
- **Data recording** — save and load CSV files; drag-and-drop import
- **Charts** — Plotly-based plots for test results (including IBIT 2×2 grid via BlauPlot)
- **PWA** — installable as a desktop app; works offline after first load

---

## Getting started

### Requirements

- **Browser:** Google Chrome or Microsoft Edge (Web Serial API is required)
- **Hardware:** Lynx gimbal connected via USB
- **OS:** Windows, macOS, or Linux with a supported serial driver

### Run locally

1. Clone or download this repository.
2. Open `index.html` in Chrome or Edge (double-click the file, or drag it into the browser).
3. Click **Connect** in the sidebar and choose the gimbal’s COM port when prompted.
4. Turn the motor on, then use the sidebar buttons for movement, tests, or recording.

> **Note:** The app is loaded as plain scripts (not ES modules) so it works from a `file://` URL without a local web server.

### Run from GitHub Pages

Open the [live demo](https://amihayb.github.io/GimbalControl/) — same app, served over HTTPS. Web Serial still requires a supported browser and a physical USB connection.

---

## Project layout

| Path | Purpose |
|---|---|
| `index.html` | Main application page |
| `js/` | Application logic (serial, movement, tests, plotting) |
| `BlauPlot/` | Chart/table library source (bundled as `js/blauplot-bundle.js` for browser use) |
| `vendor/` | Third-party libraries (Plotly, SweetAlert2, etc.) |
| `StyleSheet.css` | Styling (light/dark themes) |
| `manifest.json`, `sw.js` | PWA install and offline caching |
| `PROJECT_MAP.md` | Detailed architecture and conventions (for developers and AI agents) |

---

## R1[x] communication guide

The gimbal is controlled over USB serial at **115200 baud** using plain text commands. Registers are addressed as `R1[index]`. The app sends each command terminated by `\r` (carriage return).

### Message format

| Action | Format | Example |
|---|---|---|
| **Write** one or more registers | `R1[n]=value;` (semicolon-separated) | `R1[11]=90; R1[21]=45;` |
| **Read** registers | List registers, end with `;;` | `R1[31];R1[41];;` |
| **Response** | Semicolon-separated values | `1234;5678;` (same order as requested) |

Multiple writes can be combined in one line. Some movement commands also use `SP=` for traverse/elevation speed in **encoder ticks** (`velocity_deg_s × 2¹⁸ / 360`).

### Command register — `R1[1]`

| Value | Meaning (as used by this app) |
|---|---|
| `0` | Motor off / stop |
| `1` | Motor on; used with position moves (`R1[11]`, `R1[21]`) |
| `5` | Start **IBIT** (Built-In Test) |
| `8` | Play tune on the gimbal |
| `12` | Run **scan** scenario |
| `13` | Run **complex/sine** scenario (parameters in `R1[16]`–`R1[28]`) |

**Examples from the app:**

```
R1[1]=1; SP=14564; R1[11]=90; R1[21]=45;     # move to TR 90°, EL 45° at 20 deg/s
R1[1]=5                                       # trigger IBIT
R1[12]=0; R1[22]=0; R1[11]=0; R1[21]=0; R1[1]=12   # scan scenario
```

### Connection and motor — `R1[3]`

| Value | When sent |
|---|---|
| `1` | Motor toggle turned **on** (before `R1[1]=1`) |
| `0` | Serial connection **disconnected** |

Emergency stop sends `kl;r1[1]=0;` five times, then turns the motor off.

### Position and joystick

| Register | Direction | Units | Purpose |
|---|---|---|---|
| `R1[11]` | Write | degrees | Traverse **target** angle |
| `R1[21]` | Write | degrees | Elevation **target** angle |
| `R1[12]` | Write | degrees | Traverse **joystick** offset (±1° steps) |
| `R1[22]` | Write | degrees | Elevation **joystick** offset |

### Velocity limits

| Register | Axis | Units | Typical use |
|---|---|---|---|
| `R1[13]` | Traverse | deg/s | Max traverse speed (app clamps to 80) |
| `R1[23]` | Elevation | deg/s | Max elevation speed |

Example: `R1[13]=80; R1[23]=80;` — set both axes to 80 deg/s (used before IBIT and test moves).

### Scenario parameters (with `R1[1]=13`)

Used for demo and sine-test moves. Set parameters first, then trigger with `R1[1]=13`.

| Register | Used for |
|---|---|
| `R1[16]`, `R1[17]`, `R1[18]` | Traverse scenario (amplitude, rate, center angle) |
| `R1[26]`, `R1[27]`, `R1[28]` | Elevation scenario (amplitude, rate, center angle) |

Example (sine test):  
`R1[16]=10; R1[17]=40; R1[18]=45; R1[26]=5; R1[27]=40; R1[28]=30; R1[1]=13;`

### Telemetry — reading live data

The app polls telemetry every 20 ms with echo off (`eo=0`):

```
R1[125];R1[10];R1[31];R1[41];R1[33];R1[43];R1[34];R1[44];R1[9];R1[35];R1[45];R1[51];;
```

| Register | Meaning | Display scaling |
|---|---|---|
| `R1[125]` | Alignment marker — always **255**; frames without it are discarded | — |
| `R1[10]` | System mode | raw |
| `R1[31]`, `R1[41]` | Position TR, EL | ÷ 1000 → degrees |
| `R1[33]`, `R1[43]` | Velocity TR, EL | ÷ 1000 → deg/s |
| `R1[34]`, `R1[44]` | Current TR, EL | ÷ 1000 → A |
| `R1[9]` | Error bit flags | see below |
| `R1[35]`, `R1[45]` | Position error TR, EL | recorded only |
| `R1[51]` | IBIT status | see below |

**Packed read** (optional — set `USE_PACKED_REGISTERS = true` in code):

```
R1[51];R1[52];R1[53];;
```

Three 32-bit words are decoded into position, commanded position, velocity, current, and status. See `decodeRegisters()` in `js/gimbalSerial.js`.

### IBIT status — `R1[51]`

During IBIT, the app polls `R1[51];;` until:

| Value | Meaning |
|---|---|
| `4` | IBIT **passed** |
| `9` | IBIT **failed** |

### Error bits — `R1[9]`

Each bit being **1** means an error; **0** means OK. The sidebar shows decoded names:

| Bit | Error |
|---|---|
| 0 | Software error |
| 1 | Motor TR error |
| 2 | Motor EL error |
| 3 | Motor TR off despite command |
| 4 | Motor EL off despite command |
| 5 | No movement TR (motor on, cmd sent) |
| 6 | No movement EL (motor on, cmd sent) |
| 7 | TR position error > 1° |
| 8 | EL position error > 1° |
| 9 | Input message timeout |
| 10 | Input message checksum error |

### Elmo fields — installation and driver info

Commutation, zero offset and driver info use Elmo fields instead of `R1[x]`. They are read with echo on (`eo=1`), so the reply repeats the field name: `ax1.CA[7];;1030;`.

| Field | Meaning |
|---|---|
| `ax1.CA[7]`, `ax2.CA[7]` | Commutation angle TR, EL (0–4095) |
| `S1[17]`, `S2[17]` | Zero offset TR, EL (encoder counts). `S[18]` is set with it: `0` if positive, `-1` otherwise |
| `UF[1]` | Parameter version (no scaling) |
| `R1[99]` | SIL version (÷ 1000) |

---

## For developers

See **[PROJECT_MAP.md](PROJECT_MAP.md)** for module load order, data flow, serial protocol notes, and known caveats.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
