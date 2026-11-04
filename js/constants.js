/**
 * Constants and Configuration Values
 * This module contains all global constants and configuration objects
 * that don't change during the application lifecycle.
 */

// Mathematical conversion constants
const deg2ticks = 2**18/360;
const r2d = 180 / 3.1416;
const d2r = 3.1416 / 180;

// Data structure for storing measurement data
const initialRows = {
  time: [],
  angle: [],
  current: [],
  torque: []
};

// Configuration constants
const ANGLE_CONVERSION_FACTOR = 728.178;
const TORQUE_CONVERSION_FACTOR = 27.8;
const ANGLE_CHANGE_THRESHOLD = 20;
const MAX_ANGLE_CHANGE_FAILS = 10;
const CURRENT_MIN = -10;
const CURRENT_MAX = 10;
const TELEMETRY_INTERVAL_MS = 20; // live-data polling interval in milliseconds
const ANGLE_UPDATE_INTERVAL = 50; // milliseconds
const MOVEMENT_INTERVAL = 200; // milliseconds
const SERIAL_BAUD_RATE = 115200;

// UI Configuration
const SIDEBAR_WIDTH = 350;
const MOVEMENT_PANEL_WIDTH = 350;
const PLOT_HEIGHT = 600;
const PLOT_CONTAINER_HEIGHT = 350;

// File handling constants
const CSV_HEADERS = "Time_ms,Angle_deg,Current_A,Torque_mNm\n";
const CSV_MIME_TYPE = 'text/csv;charset=utf-8;';

// Movement control constants
const DEFAULT_VELOCITY = 80; // deg/s
const MIN_VELOCITY = 0;
const MAX_VELOCITY = 80;
const JOYSTICK_STEP = 1;

// Predefined positions
const PREDEFINED_POSITIONS = {
  home: { tr: 0, el: 0 },
  topRight: { tr: 200, el: 65 },
  topLeft: { tr: -200, el: 65 },
  bottomRight: { tr: 200, el: -15 },
  bottomLeft: { tr: -200, el: -15 }
};

// Show/hide optional UI features (true = shown)
const FEATURES = {
  joystick: false,              // round joystick in the Movement Control panel
  complexScenarios: false,      // Sine Move / Repeat Linear — not implemented yet (Start sends nothing)
};

// Max distance [deg] from a target at which an axis counts as "arrived"
const ARRIVAL_TOLERANCE_DEG = 0.2;

// Scenario profiles sent with R1[1]=13: per axis amplitude [deg], rate, center angle [deg]
// (TR → R1[16], R1[17], R1[18]; EL → R1[26], R1[27], R1[28])
const SCENARIOS = {
  demo1: { tr: { amp: 2,  rate: 100, center: 90 },  el: { amp: 5,  rate: 30, center: 10 } },
  demo2: { tr: { amp: 20, rate: 30,  center: -30 }, el: { amp: 10, rate: 30, center: 30 } },
};

// ATP test settings and pass/fail limits
const ATP_CONFIG = {
  testVelocity: 80,             // deg/s, set before IBIT / Sine / Friction moves and after them

  ibit: {
    timeoutMs: 12000,
    statusPass: 4,              // R1[51] value when IBIT passed
    statusFail: 9,              // R1[51] value when IBIT failed
    sector: { trMax: 200, trMin: -200, elMax: 65, elMin: -15 },  // limits the IBIT sweep must reach
    sectorToleranceDeg: 1,
    velocityToleranceDegS: 4,   // allowed error vs. testVelocity
  },

  sine: {
    tr: { amp: 10, rate: 40, center: -90 },
    el: { amp: 5,  rate: 40, center: 15 },
    durationMs: 15000,
    posErrLimitDeg: 1,          // max |position error| on each axis
    currentRangeLimitA: 1,      // max (current max − current min) on each axis
  },

  friction: {
    velocity: 10,               // deg/s for the slow sweep
    limitA: 1,                  // max mean current deviation on each branch
  },
};

// System mode names for R1[10], shown in #systemModeInput
const SYSTEM_MODE_NAMES = {
  0: 'Idle',
  1: 'Position',
  2: 'Rate',
  4: 'Homing',
  5: 'IBIT',
  8: 'Sing',
  9: 'Restart Control',
  12: 'Side to side Profile',
  13: 'Sine Profile'
};

// Status types for movement control
const MOVEMENT_STATUS_TYPES = {
  READY: 'ready',
  MOVING: 'moving',
  RUNNING: 'running',
  ERROR: 'error',
  CONFIGURING: 'configuring'
};

// Status colors for UI
const STATUS_COLORS = {
  error: '#dc3545',
  moving: '#007bff',
  running: '#28a745',
  ready: '#6c757d'
};
