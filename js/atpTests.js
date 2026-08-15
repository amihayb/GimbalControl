/**
 * ATP Test Sequences
 * IBIT, Sine Test, Friction Test — serial-driven test flows with recording and results display.
 * Depends on: uiUtils.js (waitForPosition), gimbalSerial.js, fileHandling.js, movementControl.js,
 *             blauplot-bundle.js (window.BP), mathUtils.js (minAbs, plus), app.js (rows, shouldRecordData, startTime)
 */

// ==================== View Telemetry State ====================

// Per-test saved row snapshots for PDF report generation
let vtSavedRows  = { ibit: null, sine: null, friction: null };
// Which tests have been loaded via the View Telemetry panel
let vtLoadedTests = { ibit: false, sine: false, friction: false };

/**
 * Return a BlauPlot theme config by reading the active CSS variables.
 * Automatically reflects whichever theme (light/dark) is currently set on <html>.
 */
function getPlotTheme() {
  const s = getComputedStyle(document.documentElement);
  return {
    bg:            s.getPropertyValue('--color-panel-bg').trim(),
    surface:       s.getPropertyValue('--color-nav-bg').trim(),
    border:        s.getPropertyValue('--color-border').trim(),
    textPrimary:   s.getPropertyValue('--color-text-primary').trim(),
    textSecondary: s.getPropertyValue('--color-text-muted').trim(),
  };
}

function subplotAxisRefs(subplotIndex) {
  return {
    xRef: subplotIndex === 1 ? 'x' : 'x' + subplotIndex,
    yRef: subplotIndex === 1 ? 'y' : 'y' + subplotIndex,
  };
}

function buildXYTrace(x, y, subplotIndex, lineOpts = {}) {
  const { xRef, yRef } = subplotAxisRefs(subplotIndex);
  const trace = {
    x, y,
    xaxis: xRef,
    yaxis: yRef,
    type: 'scatter',
    mode: lineOpts.mode || 'lines',
    name: lineOpts.name || '',
    showlegend: lineOpts.showlegend !== false,
  };
  if (lineOpts.color || lineOpts.dash || lineOpts.width) {
    trace.line = {
      color: lineOpts.color,
      dash: lineOpts.dash,
      width: lineOpts.width ?? 1.5,
    };
  }
  if (lineOpts.opacity != null) trace.opacity = lineOpts.opacity;
  return trace;
}

function ibitTestPassed() {
  const checks = [
    [minAbs(plus(rows.Tr_angle, -200)), 1],
    [minAbs(plus(rows.Tr_angle, -60)), 1],
    [minAbs(plus(rows.Tr_angle, 200)), 1],
    [minAbs(plus(rows.El_angle, 15)), 1],
    [minAbs(plus(rows.Tr_velocity, -80)), 4],
    [minAbs(plus(rows.El_velocity, -80)), 4],
    [minAbs(plus(rows.Tr_velocity, 80)), 4],
    [minAbs(plus(rows.El_velocity, 80)), 4],
  ];
  return checks.every(([val, crit]) => Math.abs(val) <= crit);
}

function sineCurrentRange(arr) {
  let mn = arr[0], mx = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < mn) mn = arr[i];
    if (arr[i] > mx) mx = arr[i];
  }
  return mx - mn;
}

function sineTestPassed() {
  return maxAbs(rows.Tr_pos_err) <= 1 && maxAbs(rows.El_pos_err) <= 1
      && sineCurrentRange(rows.Tr_current) < 1
      && sineCurrentRange(rows.El_current) < 1;
}

function frictionTestPassed(tr, el) {
  return tr.meanDiffFwd <= 1 && tr.meanDiffBwd <= 1
      && el.meanDiffFwd <= 1 && el.meanDiffBwd <= 1;
}

function showAtpPassFailSwal(testName, passed, detail) {
  Swal.fire({
    title: passed ? `${testName} Passed ✓` : `${testName} Failed ✗`,
    text: detail,
    icon: passed ? 'success' : 'error',
  });
}

function finishIbitTableResults(silent = false) {
  const passed = ibitTestPassed();
  if (!silent) showAtpPassFailSwal('IBIT', passed, passed
    ? 'All sector and velocity checks within limits.'
    : 'One or more IBIT table values exceeded limits.');
  showIBITResults();
}

function finishSineTestResults(detail, silent = false) {
  const passed = sineTestPassed();
  if (!silent) showAtpPassFailSwal('Sine Test', passed, detail || (passed
    ? 'Position error within ±1° and current range within 1 A on both axes.'
    : `Peak pos error: Tr=${maxAbs(rows.Tr_pos_err).toFixed(3)}°, El=${maxAbs(rows.El_pos_err).toFixed(3)}° | Current range: Tr=${sineCurrentRange(rows.Tr_current).toFixed(3)} A, El=${sineCurrentRange(rows.El_current).toFixed(3)} A`));
  showSineTestResults();
}

function finishFrictionTestResults(silent = false) {
  let tr, el;
  try {
    tr = computeFrictionAnalysis(rows.Tr_angle, rows.Tr_current);
    el = computeFrictionAnalysis(rows.El_angle, rows.El_current);
  } catch (e) {
    Swal.fire({ title: 'Friction Analysis Error', text: e.message, icon: 'error' });
    return;
  }
  const passed = frictionTestPassed(tr, el);
  const worst = Math.max(tr.meanDiffFwd, tr.meanDiffBwd, el.meanDiffFwd, el.meanDiffBwd);
  if (!silent) showAtpPassFailSwal('Friction Test', passed, passed
    ? 'Mean friction deviation ≤ 1 A on all branches.'
    : `Worst mean deviation: ${worst.toFixed(4)} A (limit 1 A).`);
  showFrictionTestResults(tr, el);
}

/**
 * Render IBIT results: hide welcome area, clear plot-area, draw 2×2 subplot and pass/fail table.
 * @param {string} [plotId='plot']         - ID of the target plot container element.
 * @param {string} [tableId='resultsTable'] - ID of the target table container element.
 */
function showIBITResults(plotId, tableId) {
  plotId  = plotId  || 'plot';
  tableId = tableId || 'resultsTable';

  if (plotId === 'plot') {
    const welcomeEl = document.getElementById('explenation_text');
    if (welcomeEl) welcomeEl.style.display = 'none';
    const plotArea = document.getElementById('plot-area');
    while (plotArea.firstChild) plotArea.removeChild(plotArea.firstChild);
    const plotDiv = document.createElement('div');
    plotDiv.id = 'plot';
    plotArea.appendChild(plotDiv);
  }

  const gridOptions = { gridRows: 2, gridCols: 2, pattern: 'independent' };
  const traces = [
    BP.buildLine('Tr_angle',    rows, 1, 'time', gridOptions),
    BP.buildLine('El_angle',    rows, 2, 'time', gridOptions),
    BP.buildLine('Tr_velocity', rows, 3, 'time', gridOptions),
    BP.buildLine('El_velocity', rows, 4, 'time', gridOptions),
  ];
  const theme = getPlotTheme();
  const layout = BP.buildLayout(2, 2, { pattern: 'independent', roworder: 'top to bottom', theme });
  layout.yaxis.title  = { ...layout.yaxis.title,  text: 'angle [deg]' };
  layout.yaxis3.title = { ...layout.yaxis3.title, text: 'rate [deg/s]' };
  const titleStyle = { showarrow: false, x: 0.5, y: 1, xanchor: 'center', yanchor: 'bottom', font: { color: theme.textPrimary } };
  layout.annotations = [
    { ...titleStyle, text: 'Traverse<br>Position Error',  xref: 'x domain',  yref: 'y domain'  },
    { ...titleStyle, text: 'Elevation<br>Position Error', xref: 'x2 domain', yref: 'y2 domain' },
    { ...titleStyle, text: 'Velocity',                   xref: 'x3 domain', yref: 'y3 domain' },
    { ...titleStyle, text: 'Velocity',                   xref: 'x4 domain', yref: 'y4 domain' },
  ];
  BP.plot(plotId, traces, layout, { editable: false });

  BP.yline(plotId,  200, { color: 'red',   dash: 'dash', label: 'sector limits',     yref: 'y',  xref: 'x domain',  editable: false });
  BP.yline(plotId, -200, { color: 'red',   dash: 'dash',                              yref: 'y',  xref: 'x domain',  editable: false });
  BP.yline(plotId,   60, { color: 'red',   dash: 'dash', label: 'sector limits',     yref: 'y2', xref: 'x2 domain', editable: false });
  BP.yline(plotId,  -15, { color: 'red',   dash: 'dash',                              yref: 'y2', xref: 'x2 domain', editable: false });
  BP.yline(plotId,   80, { color: 'green', dash: 'dash', label: 'Velocity Command',  yref: 'y3', xref: 'x3 domain', editable: false });
  BP.yline(plotId,  -80, { color: 'green', dash: 'dash',                              yref: 'y3', xref: 'x3 domain', editable: false });
  BP.yline(plotId,   80, { color: 'green', dash: 'dash', label: 'Velocity Command',  yref: 'y4', xref: 'x4 domain', editable: false });
  BP.yline(plotId,  -80, { color: 'green', dash: 'dash',                              yref: 'y4', xref: 'x4 domain', editable: false });

  BP.drawTable(tableId, [
    {
      parameter: 'Upper Sector Limits Error',
      value1: minAbs(plus(rows.Tr_angle, -200)),
      value2: minAbs(plus(rows.Tr_angle, -60)),
      successCriteria: 1,
      successMethod: 'smaller'
    },
    {
      parameter: 'Lower Sector Limits Error',
      value1: minAbs(plus(rows.Tr_angle, 200)),
      value2: minAbs(plus(rows.El_angle, 15)),
      successCriteria: 1,
      successMethod: 'smaller'
    },
    {
      parameter: 'Right Max Velocity Error',
      value1: minAbs(plus(rows.Tr_velocity, -80)),
      value2: minAbs(plus(rows.El_velocity, -80)),
      successCriteria: 4,
      successMethod: 'smaller'
    },
    {
      parameter: 'Left Max Velocity Error',
      value1: minAbs(plus(rows.Tr_velocity, 80)),
      value2: minAbs(plus(rows.El_velocity, 80)),
      successCriteria: 4,
      successMethod: 'smaller'
    }
  ]);
}

/**
 * Render Sine Test results: 3×2 subplot grid and pass/fail table for position error.
 * @param {string} [plotId='plot']         - ID of the target plot container element.
 * @param {string} [tableId='resultsTable'] - ID of the target table container element.
 */
function showSineTestResults(plotId, tableId) {
  plotId  = plotId  || 'plot';
  tableId = tableId || 'resultsTable';

  if (plotId === 'plot') {
    const welcomeEl = document.getElementById('explenation_text');
    if (welcomeEl) welcomeEl.style.display = 'none';
    const plotArea = document.getElementById('plot-area');
    while (plotArea.firstChild) plotArea.removeChild(plotArea.firstChild);
    const plotDiv = document.createElement('div');
    plotDiv.id = 'plot';
    plotArea.appendChild(plotDiv);
  }

  const gridOptions = { gridRows: 3, gridCols: 2, pattern: 'independent' };
  const traces = [
    BP.buildLine('Tr_pos_err',  rows, 1, 'time', { ...gridOptions, name: 'PosErrTr' }),
    BP.buildLine('El_pos_err',  rows, 2, 'time', { ...gridOptions, name: 'PosErrEl' }),
    BP.buildLine('Tr_velocity', rows, 3, 'time', gridOptions),
    BP.buildLine('El_velocity', rows, 4, 'time', gridOptions),
    BP.buildLine('Tr_current',  rows, 5, 'time', gridOptions),
    BP.buildLine('El_current',  rows, 6, 'time', gridOptions),
  ];
  const theme = getPlotTheme();
  const layout = BP.buildLayout(3, 2, { pattern: 'independent', roworder: 'top to bottom', theme });
  layout.yaxis.title  = { ...layout.yaxis.title,  text: 'angle [deg]' };
  layout.yaxis3.title = { ...layout.yaxis3.title, text: 'rate [deg/s]' };
  layout.yaxis5.title = { ...layout.yaxis5.title, text: 'Current [amp]' };
  const titleStyle = { showarrow: false, x: 0.5, y: 1, xanchor: 'center', yanchor: 'bottom', font: { color: theme.textPrimary } };
  layout.annotations = [
    { ...titleStyle, text: 'Traverse<br>Position Error',  xref: 'x domain',  yref: 'y domain'  },
    { ...titleStyle, text: 'Elevation<br>Position Error', xref: 'x2 domain', yref: 'y2 domain' },
    { ...titleStyle, text: 'Velocity',                   xref: 'x3 domain', yref: 'y3 domain' },
    { ...titleStyle, text: 'Velocity',                   xref: 'x4 domain', yref: 'y4 domain' },
    { ...titleStyle, text: 'Motor Current',              xref: 'x5 domain', yref: 'y5 domain' },
    { ...titleStyle, text: 'Motor Current',              xref: 'x6 domain', yref: 'y6 domain' },
  ];
  BP.plot(plotId, traces, layout, { editable: false });

  BP.yline(plotId,  1, { color: 'red', dash: 'dash', label: '±1° limit', yref: 'y',  xref: 'x domain',  editable: false });
  BP.yline(plotId, -1, { color: 'red', dash: 'dash',                      yref: 'y',  xref: 'x domain',  editable: false });
  BP.yline(plotId,  1, { color: 'red', dash: 'dash', label: '±1° limit', yref: 'y2', xref: 'x2 domain', editable: false });
  BP.yline(plotId, -1, { color: 'red', dash: 'dash',                      yref: 'y2', xref: 'x2 domain', editable: false });

  BP.drawTable(tableId, [
    {
      parameter: 'Position Error [deg]',
      value1: maxAbs(rows.Tr_pos_err),
      value2: maxAbs(rows.El_pos_err),
      successCriteria: 1,
    },
    {
      parameter: 'Current Range [A]',
      value1: sineCurrentRange(rows.Tr_current),
      value2: sineCurrentRange(rows.El_current),
      successCriteria: 1,
      successMethod: 'smaller',
    },
  ]);
}

/**
 * Render Friction Test results: 2×2 midline + friction deviation plots and pass/fail table.
 * @param {object} [tr]                     - precomputed traverse analysis (optional)
 * @param {object} [el]                     - precomputed elevation analysis (optional)
 * @param {string} [plotId='plot']          - ID of the target plot container element.
 * @param {string} [tableId='resultsTable'] - ID of the target table container element.
 */
function showFrictionTestResults(tr, el, plotId, tableId) {
  plotId  = plotId  || 'plot';
  tableId = tableId || 'resultsTable';

  try {
    if (!tr) tr = computeFrictionAnalysis(rows.Tr_angle, rows.Tr_current);
    if (!el) el = computeFrictionAnalysis(rows.El_angle, rows.El_current);
  } catch (e) {
    Swal.fire({ title: 'Friction Analysis Error', text: e.message, icon: 'error' });
    return;
  }

  if (plotId === 'plot') {
    const welcomeEl = document.getElementById('explenation_text');
    if (welcomeEl) welcomeEl.style.display = 'none';
    const plotArea = document.getElementById('plot-area');
    while (plotArea.firstChild) plotArea.removeChild(plotArea.firstChild);
    const plotDiv = document.createElement('div');
    plotDiv.id = 'plot';
    plotArea.appendChild(plotDiv);
  }

  const bc = tr.binCenters;
  const bcEl = el.binCenters;

  const traces = [
    buildXYTrace(tr.angleFwd, tr.currentFwd, 1, { name: 'Raw fwd', color: 'rgba(255,153,153,0.4)', width: 0.5, opacity: 0.4 }),
    buildXYTrace(tr.angleBwd, tr.currentBwd, 1, { name: 'Raw bwd', color: 'rgba(153,204,255,0.4)', width: 0.5, opacity: 0.4 }),
    buildXYTrace(bc, tr.meanFwd, 1, { name: 'Forward mean', color: '#cc3333', dash: 'dash' }),
    buildXYTrace(bc, tr.meanBwd, 1, { name: 'Backward mean', color: '#3380cc', dash: 'dash' }),
    buildXYTrace(bc, tr.midline, 1, { name: 'Midline', color: '#000000', width: 2 }),

    buildXYTrace(el.angleFwd, el.currentFwd, 2, { name: 'Raw fwd', color: 'rgba(255,153,153,0.4)', width: 0.5, opacity: 0.4 }),
    buildXYTrace(el.angleBwd, el.currentBwd, 2, { name: 'Raw bwd', color: 'rgba(153,204,255,0.4)', width: 0.5, opacity: 0.4 }),
    buildXYTrace(bcEl, el.meanFwd, 2, { name: 'Forward mean', color: '#cc3333', dash: 'dash' }),
    buildXYTrace(bcEl, el.meanBwd, 2, { name: 'Backward mean', color: '#3380cc', dash: 'dash' }),
    buildXYTrace(bcEl, el.midline, 2, { name: 'Midline', color: '#000000', width: 2 }),

    buildXYTrace(bc, tr.diffFwd, 3, { name: 'Forward', color: '#cc3333' }),
    buildXYTrace(bc, tr.diffBwd, 3, { name: 'Backward', color: '#3380cc' }),

    buildXYTrace(bcEl, el.diffFwd, 4, { name: 'Forward', color: '#cc3333' }),
    buildXYTrace(bcEl, el.diffBwd, 4, { name: 'Backward', color: '#3380cc' }),
  ];

  const theme = getPlotTheme();
  const layout = BP.buildLayout(2, 2, { pattern: 'independent', roworder: 'top to bottom', theme });
  layout.yaxis.title  = { ...layout.yaxis.title,  text: 'Current [A]' };
  layout.yaxis2.title = { ...layout.yaxis2.title, text: 'Current [A]' };
  layout.yaxis3.title = { ...layout.yaxis3.title, text: '|ΔCurrent| [A]' };
  layout.yaxis4.title = { ...layout.yaxis4.title, text: '|ΔCurrent| [A]' };
  layout.xaxis.title  = { ...layout.xaxis.title,  text: 'Angle [deg]' };
  layout.xaxis2.title = { ...layout.xaxis2.title, text: 'Angle [deg]' };
  layout.xaxis3.title = { ...layout.xaxis3.title, text: 'Angle [deg]' };
  layout.xaxis4.title = { ...layout.xaxis4.title, text: 'Angle [deg]' };

  const titleStyle = { showarrow: false, x: 0.5, y: 1, xanchor: 'center', yanchor: 'bottom', font: { color: theme.textPrimary } };
  layout.annotations = [
    { ...titleStyle, text: 'Traverse<br>Raw & Midline',  xref: 'x domain',  yref: 'y domain'  },
    { ...titleStyle, text: 'Elevation<br>Raw & Midline', xref: 'x2 domain', yref: 'y2 domain' },
    { ...titleStyle, text: 'Traverse<br>Friction',       xref: 'x3 domain', yref: 'y3 domain' },
    { ...titleStyle, text: 'Elevation<br>Friction',      xref: 'x4 domain', yref: 'y4 domain' },
  ];
  BP.plot(plotId, traces, layout, { editable: false });

  BP.yline(plotId, tr.meanDiffFwd, { color: '#cc3333', dash: 'dash', label: `Fwd mean = ${tr.meanDiffFwd.toFixed(4)} A`, yref: 'y3', xref: 'x3 domain', editable: false });
  BP.yline(plotId, tr.meanDiffBwd, { color: '#3380cc', dash: 'dash', label: `Bwd mean = ${tr.meanDiffBwd.toFixed(4)} A`, yref: 'y3', xref: 'x3 domain', editable: false });
  BP.yline(plotId, el.meanDiffFwd, { color: '#cc3333', dash: 'dash', label: `Fwd mean = ${el.meanDiffFwd.toFixed(4)} A`, yref: 'y4', xref: 'x4 domain', editable: false });
  BP.yline(plotId, el.meanDiffBwd, { color: '#3380cc', dash: 'dash', label: `Bwd mean = ${el.meanDiffBwd.toFixed(4)} A`, yref: 'y4', xref: 'x4 domain', editable: false });

  BP.drawTable(tableId, [
    { parameter: 'Forward Friction',  value1: tr.meanDiffFwd, value2: el.meanDiffFwd, successCriteria: 1 },
    { parameter: 'Backward Friction', value1: tr.meanDiffBwd, value2: el.meanDiffBwd, successCriteria: 1 },
  ]);
}

/**
 * Route loaded CSV to the correct ATP results view by filename prefix.
 * Also marks the test as loaded in the View Telemetry panel if it is open.
 * @param {string} fileName
 */
function handleAtpCsvLoaded(fileName) {
  const base = fileName.replace(/\.csv$/i, '');
  if (base.startsWith('FrictionTest')) {
    finishFrictionTestResults(true);
    vtMarkTestLoaded('friction');
  } else if (base.startsWith('IBIT')) {
    finishIbitTableResults(true);
    vtMarkTestLoaded('ibit');
  } else if (base.startsWith('SineTest')) {
    finishSineTestResults(undefined, true);
    vtMarkTestLoaded('sine');
  } else if (typeof showTorqueTest === 'function') {
    showTorqueTest();
  }
}

/**
 * Run IBIT (Built-In Test) procedure
 */
async function runIBIT() {
  if (!serialPort) {
    Swal.fire({ title: 'No Connection', text: 'Please connect to the device first', icon: 'error' });
    return;
  }

  const motorToggleEl = document.getElementById('motor-toggle');
  if (!motorToggleEl || !motorToggleEl.checked) {
    Swal.fire({ title: 'Motor Off', text: 'Please turn the motor on before running IBIT', icon: 'warning' });
    return;
  }

  const ibitBtn = document.getElementById('btn-atp-ibit');
  if (ibitBtn) {
    ibitBtn.classList.add('in-progress');
    ibitBtn.style.setProperty('--progress', '0%');
  }

  // Set max velocity
  await readMsg('R1[13]=80; R1[23]=80;');

  // Trigger IBIT
  await sendMsg('R1[1]=5\r');

  // Start recording
  shouldRecordData = true;
  rows = { time: [], Tr_angle: [], Tr_velocity: [], Tr_current: [], El_angle: [], El_velocity: [], El_current: [], Tr_cmd_angle: [], El_cmd_angle: [], Tr_pos_err: [], El_pos_err: [], status: [] };
  startTime = Date.now();
  const recordButton = document.getElementById('recordButton');
  if (recordButton) recordButton.style.color = '#dc3545';

  // Poll R1[51] until result or timeout.
  // R1[51] is now included in every live-data frame; read the cached value
  // instead of issuing a separate serial request that would race with live data.
  resetLastIbitStatus();
  const maxWaitMs = 12000;
  const pollIntervalMs = 200;
  const pollStart = Date.now();
  let ibitResult = null;

  while (Date.now() - pollStart < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    const pct = Math.min(100, Math.round(((Date.now() - pollStart) / maxWaitMs) * 100));
    if (ibitBtn) ibitBtn.style.setProperty('--progress', `${pct}%`);

    const value = getLastIbitStatus();
    if (value === 4) { ibitResult = 'success'; break; }
    if (value === 9) { ibitResult = 'failure'; break; }
  }

  if (ibitBtn) ibitBtn.style.setProperty('--progress', '100%');
  await new Promise(resolve => setTimeout(resolve, 300));
  if (ibitBtn) {
    ibitBtn.classList.remove('in-progress');
    ibitBtn.style.removeProperty('--progress');
  }

  // Stop recording
  shouldRecordData = false;
  if (recordButton) recordButton.style.color = '';
  applySignalProcessingToRows();
  saveDataToCSV('IBIT');

  // Show result
  if (ibitResult === 'success') {
    Swal.fire({ title: 'IBIT Passed ✓', text: 'IBIT completed successfully (R1[51] = 4)', icon: 'success' });
  } else if (ibitResult === 'failure') {
    Swal.fire({ title: 'IBIT Failed ✗', text: 'IBIT test failed (R1[51] = 9)', icon: 'error' });
  } else {
    Swal.fire({ title: 'IBIT Timeout', text: 'IBIT did not complete within 30 seconds', icon: 'warning' });
  }
  showIBITResults();
}

/**
 * Run Sine Test: move to random angles, run sine scenario, record 15s, return home
 */
async function runSineTest() {
  if (!serialPort) {
    Swal.fire({ title: 'No Connection', text: 'Please connect to the device first', icon: 'error' });
    return;
  }

  const motorToggleEl = document.getElementById('motor-toggle');
  if (!motorToggleEl || !motorToggleEl.checked) {
    Swal.fire({ title: 'Motor Off', text: 'Please turn the motor on before running Sine Test', icon: 'warning' });
    return;
  }

  const sineBtn = document.getElementById('btn-atp-sine');
  if (sineBtn) {
    sineBtn.classList.add('in-progress');
    sineBtn.style.setProperty('--progress', '0%');
  }

  // Pick random target angles
  const randomAngTr = Math.round(Math.random() * (90 - (-190)) + (-190));
  const randomAngEl = Math.round(Math.random() * (50 - (-10)) + (-10));
  console.log(`Sine Test: moving to TR=${randomAngTr}°, EL=${randomAngEl}°`);

  // Set max velocity
  await readMsg('R1[13]=80; R1[23]=80;');

  // Move to random angles and wait for arrival
  moveToPosition('sine-target', randomAngTr, randomAngEl);
  await waitForPosition(randomAngTr, randomAngEl);

  // Start sine scenario
  await sendMsg(`R1[16]=10; R1[17]=40; R1[18]=${randomAngTr}; R1[26]=5; R1[27]=40; R1[28]=${randomAngEl}; R1[1]=13;`);

  // Start recording
  shouldRecordData = true;
  rows = { time: [], Tr_angle: [], Tr_velocity: [], Tr_current: [], El_angle: [], El_velocity: [], El_current: [], Tr_cmd_angle: [], El_cmd_angle: [], Tr_pos_err: [], El_pos_err: [], status: [] };
  startTime = Date.now();
  const recordButton = document.getElementById('recordButton');
  if (recordButton) recordButton.style.color = '#dc3545';

  // Wait 15 seconds while updating progress bar
  const recordDuration = 15000;
  const pollInterval = 200;
  const recordStart = Date.now();
  while (Date.now() - recordStart < recordDuration) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    const pct = Math.min(100, Math.round(((Date.now() - recordStart) / recordDuration) * 100));
    if (sineBtn) sineBtn.style.setProperty('--progress', `${pct}%`);
  }

  // Stop recording and save
  shouldRecordData = false;
  if (recordButton) recordButton.style.color = '';
  applySignalProcessingToRows();
  saveDataToCSV('SineTest');

  // Return home
  moveToPosition('home', 0, 0);

  if (sineBtn) sineBtn.style.setProperty('--progress', '100%');
  await new Promise(resolve => setTimeout(resolve, 300));
  if (sineBtn) {
    sineBtn.classList.remove('in-progress');
    sineBtn.style.removeProperty('--progress');
  }

  finishSineTestResults(`Recorded at TR=${randomAngTr}°, EL=${randomAngEl}°`);
}

/**
 * Run Friction Test: slow sweep from bottom-left to top-right and back, recording throughout
 */
async function runFrictionTest() {
  if (!serialPort) {
    Swal.fire({ title: 'No Connection', text: 'Please connect to the device first', icon: 'error' });
    return;
  }

  const motorToggleEl = document.getElementById('motor-toggle');
  if (!motorToggleEl || !motorToggleEl.checked) {
    Swal.fire({ title: 'Motor Off', text: 'Please turn the motor on before running Friction Test', icon: 'warning' });
    return;
  }

  const frictionBtn = document.getElementById('btn-atp-friction');
  if (frictionBtn) {
    frictionBtn.classList.add('in-progress');
    frictionBtn.style.setProperty('--progress', '0%');
  }

  // Move to bottom-left at high speed and wait for arrival
  await readMsg('R1[13]=80; R1[23]=80;');
  moveToPosition('bottomLeft', PREDEFINED_POSITIONS.bottomLeft.tr, PREDEFINED_POSITIONS.bottomLeft.el);
  await waitForPosition(PREDEFINED_POSITIONS.bottomLeft.tr, PREDEFINED_POSITIONS.bottomLeft.el);

  // Set slow velocity for the sweep
  await readMsg('R1[13]=10; R1[23]=10;');

  // Start recording
  shouldRecordData = true;
  rows = { time: [], Tr_angle: [], Tr_velocity: [], Tr_current: [], El_angle: [], El_velocity: [], El_current: [], Tr_cmd_angle: [], El_cmd_angle: [], Tr_pos_err: [], El_pos_err: [], status: [] };
  startTime = Date.now();
  const recordButton = document.getElementById('recordButton');
  if (recordButton) recordButton.style.color = '#dc3545';

  // Leg 1: sweep to top-right, progress bar 0→50%
  const trStart1 = PREDEFINED_POSITIONS.bottomLeft.tr, elStart1 = PREDEFINED_POSITIONS.bottomLeft.el;
  const trEnd1   = PREDEFINED_POSITIONS.topRight.tr,   elEnd1   = PREDEFINED_POSITIONS.topRight.el;
  const dist1 = Math.max(Math.abs(trEnd1 - trStart1), Math.abs(elEnd1 - elStart1));
  moveToPosition('topRight', trEnd1, elEnd1);
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const curTr = parseFloat(document.getElementById('PositionInputTR')?.value);
    const curEl = parseFloat(document.getElementById('PositionInputEL')?.value);
    if (!isNaN(curTr) && !isNaN(curEl)) {
      const remaining = Math.max(Math.abs(trEnd1 - curTr), Math.abs(elEnd1 - curEl));
      const pct = Math.min(50, Math.round((1 - remaining / dist1) * 50));
      if (frictionBtn) frictionBtn.style.setProperty('--progress', `${pct}%`);
      if (remaining <= 0.2) break;
    }
  }

  // Leg 2: sweep back to bottom-left, progress bar 50→100%
  const trEnd2 = PREDEFINED_POSITIONS.bottomLeft.tr, elEnd2 = PREDEFINED_POSITIONS.bottomLeft.el;
  const dist2 = Math.max(Math.abs(trEnd2 - trEnd1), Math.abs(elEnd2 - elEnd1));
  moveToPosition('bottomLeft', trEnd2, elEnd2);
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const curTr = parseFloat(document.getElementById('PositionInputTR')?.value);
    const curEl = parseFloat(document.getElementById('PositionInputEL')?.value);
    if (!isNaN(curTr) && !isNaN(curEl)) {
      const remaining = Math.max(Math.abs(trEnd2 - curTr), Math.abs(elEnd2 - curEl));
      const pct = Math.min(100, 50 + Math.round((1 - remaining / dist2) * 50));
      if (frictionBtn) frictionBtn.style.setProperty('--progress', `${pct}%`);
      if (remaining <= 0.2) break;
    }
  }

  // Stop recording and save
  shouldRecordData = false;
  if (recordButton) recordButton.style.color = '';
  applySignalProcessingToRows();
  saveDataToCSV('FrictionTest');

  // Restore high velocity and return home
  await readMsg('R1[13]=80; R1[23]=80;');
  moveToPosition('home', 0, 0);

  if (frictionBtn) frictionBtn.style.setProperty('--progress', '100%');
  await new Promise(resolve => setTimeout(resolve, 300));
  if (frictionBtn) {
    frictionBtn.classList.remove('in-progress');
    frictionBtn.style.removeProperty('--progress');
  }

  finishFrictionTestResults();
}

// ==================== View Telemetry Helpers ====================

/**
 * Mark a test type as loaded in the VT panel, save a snapshot of rows for PDF,
 * and check whether all 3 tests are now loaded.
 * @param {'ibit'|'sine'|'friction'} testType
 */
function vtMarkTestLoaded(testType) {
  if (!document.getElementById('view-telemetry-panel')) return;
  vtLoadedTests[testType] = true;
  vtSavedRows[testType] = JSON.parse(JSON.stringify(rows));
  checkAllTestsLoaded();
}

/** Reset VT panel state — called when the View Telemetry panel opens. */
function resetVtLoadedTests() {
  vtLoadedTests = { ibit: false, sine: false, friction: false };
  vtSavedRows   = { ibit: null,  sine: null,  friction: null };
}

/** Show the Print to PDF button when at least one test file has been loaded. */
function checkAllTestsLoaded() {
  const btn = document.getElementById('btn-print-pdf');
  if (!btn) return;
  const anyLoaded = vtLoadedTests.ibit || vtLoadedTests.sine || vtLoadedTests.friction;
  btn.style.display = anyLoaded ? '' : 'none';
}

/** Re-show IBIT results from the saved VT snapshot. */
function vtShowIbitResults() {
  if (!vtSavedRows.ibit) return;
  const prev = rows;
  rows = vtSavedRows.ibit;
  finishIbitTableResults();
  rows = prev;
}

/** Re-show Sine Test results from the saved VT snapshot. */
function vtShowSineResults() {
  if (!vtSavedRows.sine) return;
  const prev = rows;
  rows = vtSavedRows.sine;
  finishSineTestResults();
  rows = prev;
}

/** Re-show Friction Test results from the saved VT snapshot. */
function vtShowFrictionResults() {
  if (!vtSavedRows.friction) return;
  const prev = rows;
  rows = vtSavedRows.friction;
  finishFrictionTestResults();
  rows = prev;
}

/**
 * Ask for gimbal number and remarks, then:
 *  1. Render each test off-screen one at a time.
 *  2. Clone the Plotly SVG and capture the pass/fail table HTML.
 *  3. Build a self-contained HTML page and open it in a new tab.
 *  4. The new tab auto-triggers the browser Print dialog.
 *
 * This avoids all window.print() / @media print layout issues by giving
 * the browser a clean, standalone page to print.
 */
async function printAtpReport() {
  if (!vtSavedRows.ibit && !vtSavedRows.sine && !vtSavedRows.friction) return;

  // Read metadata from the panel fields
  const gimbalRaw = document.getElementById('vt-gimbal-no')?.value.trim() || '';
  const operator  = document.getElementById('vt-operator')?.value.trim()  || '—';
  const remarks   = document.getElementById('vt-remarks')?.value.trim()   || '—';
  const rawDt     = document.getElementById('vt-datetime')?.value.trim();

  const ca7TrRaw = parseFloat(document.getElementById('vt-ca7-tr')?.value);
  const ca7ElRaw = parseFloat(document.getElementById('vt-ca7-el')?.value);
  const hasCa7   = !isNaN(ca7TrRaw) && !isNaN(ca7ElRaw);

  // Format gimbal number: pure digits get zero-padded to 3 places and prefixed with "SN: "
  function formatGimbalNo(raw) {
    if (!raw) return '—';
    if (/^\d+$/.test(raw)) return 'SN: ' + raw.padStart(4, '0');
    return raw;
  }
  const gimbalNo = formatGimbalNo(gimbalRaw);

  // Parse the text field value (DD/MM/YYYY HH:MM) into a Date
  function parsePanelDate(str) {
    const m = str && str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (!m) return new Date();
    return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  }
  const dateObj  = parsePanelDate(rawDt);

  // DD/MM/YYYY HH:MM for the metadata table
  const dateTime = rawDt || (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  })();

  // "Month D, YYYY" for the page footer
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const footerDate = `${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

  Swal.fire({
    title: 'Building Report\u2026',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });

  // Use the absolute .src already loaded in the DOM — works on both http:// and file://.
  // No fetch needed; the new window shares the same origin so can load these URLs directly.
  const rafLogoUrl  = document.querySelector('img[src*="RafLogo"]')?.src  || '';
  const blauLogoUrl = document.querySelector('img[src*="logo-title"]')?.src || '';

  // Compute pass/fail for summary page using saved rows.
  // Tests that were not loaded get null (not false) so we can distinguish "not loaded" from "failed".
  const prevRowsForSummary = rows;
  let ibitOk = null;
  if (vtSavedRows.ibit) {
    rows = vtSavedRows.ibit;
    ibitOk = ibitTestPassed();
  }
  let sineOk = null;
  if (vtSavedRows.sine) {
    rows = vtSavedRows.sine;
    sineOk = sineTestPassed();
  }
  let frictionOk = null;
  if (vtSavedRows.friction) {
    rows = vtSavedRows.friction;
    try {
      const trFr = computeFrictionAnalysis(rows.Tr_angle, rows.Tr_current);
      const elFr = computeFrictionAnalysis(rows.El_angle, rows.El_current);
      frictionOk = frictionTestPassed(trFr, elFr);
    } catch (e) { frictionOk = false; }
  }
  rows = prevRowsForSummary;
  const loadedCount = [ibitOk, sineOk, frictionOk].filter(v => v !== null).length;
  const allLoaded   = loadedCount === 3;
  const allOk       = allLoaded && ibitOk && sineOk && frictionOk;

  // Off-screen container: fixed position so Plotly gets real pixel dimensions.
  const tempContainer = document.createElement('div');
  tempContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;overflow:hidden;background:white;';
  document.body.appendChild(tempContainer);

  const testDefs = [
    {
      key: 'ibit',
      label: 'IBIT \u2014 Built-In Test',
      description: 'The Built-In Test (IBIT) verifies the gimbal\u2019s mechanical and control integrity across its full movement range. During the test, the gimbal is commanded to traverse the entire movement sector \u2014 spanning \u00b1200\u00b0 in traverse and \u221215\u00b0 to +65\u00b0 in elevation \u2014 to confirm that the system can reach and hold positions throughout the operational envelope. Position error, velocity, and motor current are recorded continuously. The test passes when the peak position error remains within \u00b11\u00b0 throughout the sweep and motor current stays within operating limits.',
      render(pId, tId) { rows = vtSavedRows.ibit; showIBITResults(pId, tId); },
    },
    {
      key: 'sine',
      label: 'Sine Test \u2014 Dynamic Tracking',
      description: 'The Sine Test evaluates the gimbal\u2019s dynamic tracking performance under sinusoidal motion commands. The system is driven with a continuous sine-wave profile on both the traverse and elevation axes simultaneously, at a randomised operating point. The test passes when the peak position error on both axes does not exceed \u00b11\u00b0, and the motor current range (max \u2212 min) on each axis remains below 1\u00a0A, throughout the manoeuvre.',
      render(pId, tId) { rows = vtSavedRows.sine; showSineTestResults(pId, tId); },
    },
    {
      key: 'friction',
      label: 'Friction Test \u2014 Mechanical Resistance',
      description: 'The Friction Test characterises the mechanical friction of the gimbal by performing a slow, constant-velocity sweep from the bottom-left to the top-right corner of the operating envelope and back. Motor current is recorded throughout both legs of the sweep. The test analyses the mean current difference between the forward and reverse directions on each axis; the test passes when this difference does not exceed 1\u00a0A on either axis, indicating balanced and acceptable friction levels.',
      render(pId, tId) {
        rows = vtSavedRows.friction;
        const trFr = computeFrictionAnalysis(rows.Tr_angle, rows.Tr_current);
        const elFr = computeFrictionAnalysis(rows.El_angle, rows.El_current);
        showFrictionTestResults(trFr, elFr, pId, tId);
      },
    },
  ].filter(def => vtSavedRows[def.key] !== null);

  const capturedResults = [];
  const prevRows = rows;

  try {
    for (let i = 0; i < testDefs.length; i++) {
      const { label, description, render } = testDefs[i];

      // Fresh divs for each test so IDs never clash
      tempContainer.innerHTML = '';
      const plotDiv = document.createElement('div');
      plotDiv.id = `_atpPdfPlot${i}`;
      plotDiv.style.cssText = 'width:900px;height:420px;';
      const tableDiv = document.createElement('div');
      tableDiv.id = `_atpPdfTable${i}`;
      tempContainer.appendChild(plotDiv);
      tempContainer.appendChild(tableDiv);

      render(plotDiv.id, tableDiv.id);

      // Give Plotly time to finish the SVG render
      await new Promise(r => setTimeout(r, 400));

      // Capture the plot as a PNG image via Plotly.toImage (most reliable).
      // Fall back to a viewBox-corrected SVG clone if toImage is unavailable.
      let plotCapture = '<p style="color:red;">(plot render failed)</p>';
      try {
        if (window.Plotly && typeof window.Plotly.toImage === 'function') {
          // Force full white/light theme before capture regardless of app theme.
          // Must update backgrounds, all axis colours, legend, annotations, and global font.
          const whiteUpdate = {
            paper_bgcolor: 'white',
            plot_bgcolor:  'white',
            font:          { color: '#333' },
            'legend.bgcolor':     'white',
            'legend.bordercolor': '#ccc',
            'legend.font.color':  '#333',
          };
          const existingLayout = plotDiv.layout || {};
          Object.keys(existingLayout).forEach(key => {
            if (/^[xy]axis\d*$/.test(key)) {
              whiteUpdate[`${key}.tickfont.color`]      = '#333';
              whiteUpdate[`${key}.title.font.color`]    = '#333';
              whiteUpdate[`${key}.linecolor`]           = '#bbb';
              whiteUpdate[`${key}.zerolinecolor`]       = '#bbb';
              whiteUpdate[`${key}.gridcolor`]           = '#e5e5e5';
            }
          });
          if (Array.isArray(existingLayout.annotations)) {
            existingLayout.annotations.forEach((_, idx) => {
              whiteUpdate[`annotations[${idx}].font.color`] = '#333';
            });
          }
          await window.Plotly.relayout(plotDiv, whiteUpdate);
          const dataUrl = await window.Plotly.toImage(plotDiv, { format: 'png', width: 900, height: 420 });
          plotCapture = `<img src="${dataUrl}" style="width:100%;display:block;" alt="${label} plot">`;
        } else {
          // SVG fallback: must set viewBox so internal pixel coordinates scale correctly
          const mainSvg = plotDiv.querySelector('svg.main-svg');
          if (mainSvg) {
            const origW = parseFloat(mainSvg.getAttribute('width'))  || 900;
            const origH = parseFloat(mainSvg.getAttribute('height')) || 420;
            const clone = mainSvg.cloneNode(true);
            clone.setAttribute('viewBox', `0 0 ${origW} ${origH}`);
            clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            clone.setAttribute('width',  '100%');
            clone.setAttribute('height', '380');
            clone.style.cssText = 'display:block;background:white;';
            plotCapture = clone.outerHTML;
          }
        }
      } catch (e) {
        console.error('Plot capture failed:', e);
      }

      capturedResults.push({ label, description, plotCapture, tableHTML: tableDiv.innerHTML });
    }
  } finally {
    rows = prevRows;
    tempContainer.remove();
    Swal.close();
  }

  // Summary table rows — only include tests that were actually loaded
  const summaryRows = [
    { name: 'IBIT',          ok: ibitOk },
    { name: 'Sine Test',     ok: sineOk },
    { name: 'Friction Test', ok: frictionOk },
  ].filter(({ ok }) => ok !== null)
   .map(({ name, ok }) => `
    <tr>
      <td>${name}</td>
      <td class="${ok ? 'pass' : 'fail'}">${ok ? 'PASS \u2713' : 'FAIL \u2717'}</td>
    </tr>`).join('');

  // Each test section becomes its own tbody row so the thead logo repeats on every page
  const testRows = capturedResults.map(({ label, description, plotCapture, tableHTML }) => `
    <tr class="page-break"><td class="content-cell">
      <h2>${label}</h2>
      ${description ? `<p class="test-description">${description}</p>` : ''}
      <div class="plot-wrap">${plotCapture}</div>
      <div class="table-wrap">${tableHTML}</div>
    </td></tr>`).join('');

  const headerCellHTML = `
    <div class="report-header">
      <div class="header-logos">
        ${rafLogoUrl  ? `<img src="${rafLogoUrl}"  class="logo" alt="Rafael">` : ''}
        ${blauLogoUrl ? `<img src="${blauLogoUrl}" class="logo" alt="Blau Robotics">` : ''}
      </div>
      <div class="header-title">Acceptance Test Procedure Report</div>
    </div>`;

  const reportHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ATP Report \u2014 ${gimbalNo}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 13px; background: #fff; }

  /* ---- Page layout table — thead/tfoot repeat on every printed page ---- */
  .page-layout { width: 100%; border-collapse: collapse; }
  .page-layout thead td { padding-bottom: 22px; }
  .page-layout tfoot td { padding-top: 14px; border-top: 1px solid #3276a0; font-size: 10px; color: #666; }
  .content-cell { vertical-align: top; padding-bottom: 28px; }
  tr.page-break { page-break-before: always; }

  /* ---- Header with logos ---- */
  .report-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 0 10px;
    border-bottom: none;
  }
  .header-logos {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 14px;
  }
  .logo { height: 32px; width: auto; }
  .header-title {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    color: #333;
    text-decoration: underline;
  }

  /* ---- Metadata box ---- */
  .meta-box {
    border: 1px solid #3276a0;
    border-radius: 4px;
    background: #f4f8fb;
    padding: 12px 16px;
    margin-bottom: 32px;
    display: inline-block;
    min-width: 340px;
  }
  table.meta { border-collapse: collapse; }
  table.meta td { padding: 3px 16px 3px 0; vertical-align: top; }
  table.meta td:first-child { font-weight: bold; white-space: nowrap; color: #3276a0; }

  /* ---- Summary section ---- */
  .summary-section { margin-bottom: 36px; }
  .summary-section h2 { font-size: 15px; margin: 0 0 14px; border-bottom: 1px solid #bbb; padding-bottom: 5px; }
  table.summary-table { border-collapse: collapse; width: 320px; }
  table.summary-table th, table.summary-table td { border: 1px solid #bbb; padding: 7px 18px; text-align: center; }
  table.summary-table thead th { background: #f2f2f2; font-weight: bold; }
  .pass { color: #1a7a35; font-weight: bold; }
  .fail { color: #c0392b; font-weight: bold; }
  .overall-result {
    margin-top: 16px;
    padding: 10px 20px;
    font-size: 15px;
    font-weight: bold;
    border-radius: 4px;
    display: inline-block;
  }
  .overall-result.pass { background: #e8f5e9; border: 1px solid #1a7a35; }
  .overall-result.fail { background: #fdecea; border: 1px solid #c0392b; }
  .overall-result.partial { background: #fdf6e3; border: 1px solid #c9a227; color: #7a5c00; }

  /* ---- Test detail sections ---- */
  h2 { font-size: 14px; margin: 0 0 10px; border-bottom: 1px solid #bbb; padding-bottom: 5px; }
  .test-description { font-size: 12px; color: #444; line-height: 1.6; margin: 0 0 14px; }
  .plot-wrap { width: 100%; overflow: hidden; line-height: 0; background: #fff; margin-bottom: 8px; }
  .plot-wrap img { width: 100%; display: block; }
  .plot-wrap svg { width: 100%; height: 380px; display: block; background: #fff; }
  .table-wrap { margin-top: 14px; clear: both; }
  .table-wrap table { border-collapse: collapse; width: 100%; }
  .table-wrap th, .table-wrap td { border: 1px solid #bbb; padding: 6px 12px; text-align: center; }
  .table-wrap thead th { background: #f2f2f2; font-weight: bold; }

  @page {
    size: A4;
    margin: 14mm 12mm 20mm;
    @bottom-left   { content: "${footerDate}"; font-size: 10px; color: #666; font-family: Arial, sans-serif; }
    @bottom-center { content: "Lynx ATP \u2014 ${gimbalNo}"; font-size: 10px; color: #666; font-family: Arial, sans-serif; }
    @bottom-right  { content: "Page " counter(page); font-size: 10px; color: #666; font-family: Arial, sans-serif; }
  }
</style>
</head>
<body>
<table class="page-layout">
  <thead>
    <tr><td>${headerCellHTML}</td></tr>
  </thead>
  <tbody>
    <!-- Page 1: metadata + summary -->
    <tr><td class="content-cell">
      <div class="meta-box">
        <table class="meta">
          <tr><td>Gimbal Number</td><td>${gimbalNo}</td></tr>
          <tr><td>Operator</td><td>${operator}</td></tr>
          <tr><td>Date / Time</td><td>${dateTime}</td></tr>
          ${hasCa7 ? `<tr><td>Commutation Angle CA[7]</td><td>TR: ${ca7TrRaw} &nbsp;&nbsp; EL: ${ca7ElRaw}</td></tr>` : ''}
          <tr><td>Remarks</td><td style="white-space:pre-wrap;">${remarks}</td></tr>
        </table>
      </div>
      <div class="summary-section">
        <h2>Test Summary</h2>
        <table class="summary-table">
          <thead><tr><th>Test</th><th>Result</th></tr></thead>
          <tbody>${summaryRows}</tbody>
        </table>
        <div class="overall-result ${allLoaded ? (allOk ? 'pass' : 'fail') : 'partial'}">
          Overall: ${allLoaded ? (allOk ? 'ALL TESTS PASSED \u2713' : 'ONE OR MORE TESTS FAILED \u2717') : `Partial Report \u2014 ${loadedCount} of 3 tests loaded`}
        </div>
      </div>
    </td></tr>
    <!-- Pages 2+: one row per test, each starting on a new page -->
    ${testRows}
  </tbody>
</table>
<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 300);
  });
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    Swal.fire({
      title: 'Pop-up Blocked',
      text: 'Please allow pop-ups for this site, then click Print to PDF again.',
      icon: 'warning',
    });
    return;
  }
  win.document.open();
  win.document.write(reportHTML);
  win.document.close();
}

// ==================== Exported Functions ====================

window.showIBITResults           = showIBITResults;
window.showSineTestResults       = showSineTestResults;
window.showFrictionTestResults   = showFrictionTestResults;
window.finishIbitTableResults    = finishIbitTableResults;
window.finishSineTestResults     = finishSineTestResults;
window.finishFrictionTestResults = finishFrictionTestResults;
window.handleAtpCsvLoaded        = handleAtpCsvLoaded;
window.runIBIT                   = runIBIT;
window.runSineTest               = runSineTest;
window.runFrictionTest           = runFrictionTest;
window.vtMarkTestLoaded          = vtMarkTestLoaded;
window.resetVtLoadedTests        = resetVtLoadedTests;
window.checkAllTestsLoaded       = checkAllTestsLoaded;
window.vtShowIbitResults         = vtShowIbitResults;
window.vtShowSineResults         = vtShowSineResults;
window.vtShowFrictionResults     = vtShowFrictionResults;
window.printAtpReport            = printAtpReport;
