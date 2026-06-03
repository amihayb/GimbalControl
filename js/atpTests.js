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

function sineTestPassed() {
  return maxAbs(rows.Tr_pos_err) <= 1 && maxAbs(rows.El_pos_err) <= 1;
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

function finishIbitTableResults() {
  const passed = ibitTestPassed();
  showAtpPassFailSwal('IBIT', passed, passed
    ? 'All sector and velocity checks within limits.'
    : 'One or more IBIT table values exceeded limits.');
  showIBITResults();
}

function finishSineTestResults(detail) {
  const passed = sineTestPassed();
  showAtpPassFailSwal('Sine Test', passed, detail || (passed
    ? 'Position error within ±1° on both axes.'
    : `Peak error: Tr=${maxAbs(rows.Tr_pos_err).toFixed(3)}°, El=${maxAbs(rows.El_pos_err).toFixed(3)}°`));
  showSineTestResults();
}

function finishFrictionTestResults() {
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
  showAtpPassFailSwal('Friction Test', passed, passed
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
      parameter: 'Position Error',
      value1: maxAbs(rows.Tr_pos_err),
      value2: maxAbs(rows.El_pos_err),
      successCriteria: 1,
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
    finishFrictionTestResults();
    vtMarkTestLoaded('friction');
  } else if (base.startsWith('IBIT')) {
    finishIbitTableResults();
    vtMarkTestLoaded('ibit');
  } else if (base.startsWith('SineTest')) {
    finishSineTestResults();
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

  // Poll R1[51] until result or timeout
  const maxWaitMs = 12000;
  const pollIntervalMs = 200;
  const pollStart = Date.now();
  let ibitResult = null;

  while (Date.now() - pollStart < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    const pct = Math.min(100, Math.round(((Date.now() - pollStart) / maxWaitMs) * 100));
    if (ibitBtn) ibitBtn.style.setProperty('--progress', `${pct}%`);

    const response = await readMsg('R1[51];;\r');
    console.log(response);
    const value = parseInt(response.trim().split(';')[0]);
    console.log(value);
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

/** Show the Print to PDF button when all 3 test files have been loaded. */
function checkAllTestsLoaded() {
  const btn = document.getElementById('btn-print-pdf');
  if (!btn) return;
  const allLoaded = vtLoadedTests.ibit && vtLoadedTests.sine && vtLoadedTests.friction;
  btn.style.display = allLoaded ? '' : 'none';
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
  if (!vtSavedRows.ibit || !vtSavedRows.sine || !vtSavedRows.friction) return;

  const { value: formValues, isConfirmed } = await Swal.fire({
    title: 'ATP Report Details',
    html: `
      <label style="display:block;text-align:left;margin-bottom:4px;font-weight:bold;">Gimbal Number</label>
      <input id="swal-gimbal-no" class="swal2-input" placeholder="e.g. SN-0042">
      <label style="display:block;text-align:left;margin-top:12px;margin-bottom:4px;font-weight:bold;">Remarks</label>
      <textarea id="swal-remarks" class="swal2-textarea" placeholder="Optional remarks..."></textarea>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Print to PDF',
    preConfirm: () => ({
      gimbalNo: document.getElementById('swal-gimbal-no').value.trim() || '—',
      remarks:  document.getElementById('swal-remarks').value.trim()  || '—',
    }),
  });

  if (!isConfirmed) return;

  Swal.fire({
    title: 'Building Report…',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });

  // Off-screen container: fixed position so Plotly gets real pixel dimensions.
  const tempContainer = document.createElement('div');
  tempContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;overflow:hidden;background:white;';
  document.body.appendChild(tempContainer);

  const testDefs = [
    {
      label: 'IBIT',
      render(pId, tId) { rows = vtSavedRows.ibit; showIBITResults(pId, tId); },
    },
    {
      label: 'Sine Test',
      render(pId, tId) { rows = vtSavedRows.sine; showSineTestResults(pId, tId); },
    },
    {
      label: 'Friction Test',
      render(pId, tId) {
        rows = vtSavedRows.friction;
        const trFr = computeFrictionAnalysis(rows.Tr_angle, rows.Tr_current);
        const elFr = computeFrictionAnalysis(rows.El_angle, rows.El_current);
        showFrictionTestResults(trFr, elFr, pId, tId);
      },
    },
  ];

  const capturedResults = [];
  const prevRows = rows;

  try {
    for (let i = 0; i < testDefs.length; i++) {
      const { label, render } = testDefs[i];

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
            clone.style.cssText = 'display:block;';
            plotCapture = clone.outerHTML;
          }
        }
      } catch (e) {
        console.error('Plot capture failed:', e);
      }

      capturedResults.push({ label, plotCapture, tableHTML: tableDiv.innerHTML });
    }
  } finally {
    rows = prevRows;
    tempContainer.remove();
    Swal.close();
  }

  // Build a self-contained report page
  const dateStr = new Date().toLocaleDateString();
  const sections = capturedResults.map(({ label, plotCapture, tableHTML }) => `
    <section>
      <h2>${label}</h2>
      <div class="plot-wrap">${plotCapture}</div>
      <div class="table-wrap">${tableHTML}</div>
    </section>`).join('');

  const reportHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ATP Report \u2014 ${formValues.gimbalNo}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body   { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; font-size: 13px; }
  h1     { font-size: 17px; margin: 0 0 10px; border-bottom: 2px solid #333; padding-bottom: 6px; }
  h2     { font-size: 14px; margin: 0 0 6px; border-bottom: 1px solid #bbb; padding-bottom: 4px; }
  table.meta  { border-collapse: collapse; margin-bottom: 18px; }
  table.meta td             { padding: 2px 12px 2px 0; vertical-align: top; }
  table.meta td:first-child { font-weight: bold; white-space: nowrap; }
  section     { margin-bottom: 32px; page-break-inside: avoid; }
  /* plot-wrap clips any SVG overflow so it never bleeds into the table below */
  .plot-wrap  { width: 100%; overflow: hidden; line-height: 0; }
  .plot-wrap img { width: 100%; display: block; }
  .plot-wrap svg { width: 100%; height: 380px; display: block; }
  .table-wrap { margin-top: 12px; clear: both; }
  .table-wrap table { border-collapse: collapse; width: 100%; }
  .table-wrap th, .table-wrap td { border: 1px solid #bbb; padding: 5px 12px; text-align: center; }
  .table-wrap thead th { background: #f2f2f2; font-weight: bold; }
  @page  { margin: 12mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>GimbalControl \u2014 ATP Report</h1>
<table class="meta">
  <tr><td>Gimbal Number</td><td>${formValues.gimbalNo}</td></tr>
  <tr><td>Date</td><td>${dateStr}</td></tr>
  <tr><td>Remarks</td><td>${formValues.remarks}</td></tr>
</table>
${sections}
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
