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
const MIN_VELOCITY = 1;
const MAX_VELOCITY = 100;
const JOYSTICK_STEP = 1;

// Predefined positions
const PREDEFINED_POSITIONS = {
  home: { tr: 0, el: 0 },
  topRight: { tr: 200, el: 65 },
  topLeft: { tr: -200, el: 65 },
  bottomRight: { tr: 200, el: -15 },
  bottomLeft: { tr: -200, el: -15 }
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
