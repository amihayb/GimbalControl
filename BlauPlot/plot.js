/**
 * BlauPlot — plot.js
 * Plotly-based plotting utilities for NxM subplot grids.
 *
 * Peer dependency: window.Plotly must be loaded by the caller.
 *
 * Exports:
 *   buildLine(signalName, rows, subplotIndex, xAxisName, options?)
 *   buildLayout(gridRows, gridCols, options?)
 *   plot(container, traces, layout, config?)
 *   yline(container, value, options?)
 *   xline(container, xValue, options?)
 *   enableDataTips(container, options?)
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a container argument to a DOM element ID string.
 * Accepts either a string ID or an HTMLElement.
 * @param {string|HTMLElement} container
 * @returns {string} element ID
 */
function resolveId(container) {
  if (typeof container === "string") return container;
  if (container && container.id) return container.id;
  throw new Error("BlauPlot: container must be an element ID string or an HTMLElement with an id.");
}

/**
 * Resolve a container argument to an HTMLElement.
 * @param {string|HTMLElement} container
 * @returns {HTMLElement}
 */
function resolveEl(container) {
  if (typeof container === "string") return document.getElementById(container);
  return container;
}

/**
 * Map a 1-based visual subplot index (left-to-right, top-to-bottom) to
 * Plotly axis reference strings, respecting grid pattern.
 *
 * @param {number} subplotIndex  — 1-based
 * @param {number} gridRows
 * @param {number} gridCols
 * @param {'coupled'|'independent'} pattern
 * @returns {{ xRef: string, yRef: string }}
 */
function axisRefs(subplotIndex, gridRows, gridCols, pattern) {
  if (pattern === "independent") {
    const x = subplotIndex === 1 ? "x" : "x" + subplotIndex;
    const y = subplotIndex === 1 ? "y" : "y" + subplotIndex;
    return { xRef: x, yRef: y };
  }
  // coupled: columns share x-axes, rows share y-axes
  const col = ((subplotIndex - 1) % gridCols) + 1;
  const row = Math.floor((subplotIndex - 1) / gridCols) + 1;
  return {
    xRef: col === 1 ? "x" : "x" + col,
    yRef: row === 1 ? "y" : "y" + row,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a single Plotly trace for one signal.
 *
 * @param {string} signalName         — key in rows
 * @param {object} rows               — { [colName]: number[] }
 * @param {number} subplotIndex       — 1-based, left-to-right then top-to-bottom
 * @param {string} xAxisName          — key in rows to use as X axis
 * @param {object} [options]
 * @param {number}  options.gridRows  — total grid rows (default 1)
 * @param {number}  options.gridCols  — total grid cols (default 1)
 * @param {'coupled'|'independent'} options.pattern — axis sharing (default 'coupled')
 * @param {'lines'|'markers'|'lines+markers'} options.mode  (default 'lines')
 * @param {string}  options.color     — line/marker color override
 * @param {string}  options.name      — legend label (default = signalName)
 * @returns {object} Plotly trace object
 */
export function buildLine(signalName, rows, subplotIndex, xAxisName, options = {}) {
  const gridRows = options.gridRows || 1;
  const gridCols = options.gridCols || 1;
  const pattern  = options.pattern  || "coupled";
  const { xRef, yRef } = axisRefs(subplotIndex, gridRows, gridCols, pattern);

  const trace = {
    x:      rows[xAxisName] || [],
    y:      rows[signalName] || [],
    xaxis:  xRef,
    yaxis:  yRef,
    name:   options.name || signalName,
    type:   "scatter",
    mode:   options.mode || "lines",
  };

  if (options.color) {
    trace.line   = { color: options.color };
    trace.marker = { color: options.color };
  }

  return trace;
}

/**
 * Build a Plotly layout object for an NxM subplot grid.
 *
 * @param {number} gridRows           — grid row count
 * @param {number} gridCols           — grid col count
 * @param {object} [options]
 * @param {'coupled'|'independent'} options.pattern    (default 'coupled')
 * @param {'bottom to top'|'top to bottom'} options.roworder  (default 'bottom to top')
 * @param {object}  options.theme     — ThemeConfig; if omitted, Plotly defaults are used
 *   @param {string}  theme.bg            — paper/plot background color
 *   @param {string}  theme.surface       — legend background color
 *   @param {string}  theme.border        — grid/axis line color
 *   @param {string}  theme.textPrimary   — title/legend text color
 *   @param {string}  theme.textSecondary — tick label color
 * @param {number}  options.height    — plot height in px (default window.innerHeight - 80)
 * @returns {object} Plotly layout object
 */
export function buildLayout(gridRows, gridCols, options = {}) {
  gridRows = gridRows || 1;
  gridCols = gridCols || 1;
  const pattern  = options.pattern  || "coupled";
  const roworder = options.roworder || "bottom to top";
  const theme    = options.theme    || null;
  const height   = options.height   || (window.innerHeight - 80);

  const layout = {
    height,
    grid: { rows: gridRows, columns: gridCols, pattern, roworder },
    annotations: [],
    shapes: [],
  };

  if (theme) {
    layout.paper_bgcolor = theme.bg;
    layout.plot_bgcolor  = theme.bg;
    layout.font          = { color: theme.textPrimary, family: '"Lato", sans-serif' };
    layout.margin        = { t: 40, r: 40, b: 40, l: 60 };
    layout.legend        = {
      bgcolor:     theme.surface,
      bordercolor: theme.border,
      font:        { color: theme.textPrimary },
    };
  }

  // Build axis definitions
  const axisCommon = theme ? {
    gridcolor:     theme.border,
    linecolor:     theme.border,
    zerolinecolor: theme.border,
    tickfont:      { color: theme.textSecondary },
    title:         { font: { color: theme.textPrimary } },
  } : {};

  if (pattern === "coupled") {
    for (let c = 1; c <= gridCols; c++) {
      const key = c === 1 ? "xaxis" : "xaxis" + c;
      layout[key] = { ...axisCommon };
    }
    for (let r = 1; r <= gridRows; r++) {
      const key = r === 1 ? "yaxis" : "yaxis" + r;
      layout[key] = { ...axisCommon };
    }
  } else {
    const count = gridRows * gridCols;
    for (let i = 1; i <= count; i++) {
      layout[i === 1 ? "xaxis" : "xaxis" + i] = { ...axisCommon };
      layout[i === 1 ? "yaxis" : "yaxis" + i] = { ...axisCommon };
    }
  }

  return layout;
}

/**
 * Render a complete plot into a container element.
 * Calls Plotly.newPlot — replaces any existing plot in the container.
 *
 * @param {string|HTMLElement} container  — element ID or DOM node
 * @param {object[]} traces
 * @param {object}   layout
 * @param {object}  [config]              — Plotly config overrides
 */
export function plot(container, traces, layout, config = {}) {
  const id = resolveId(container);
  const fullConfig = { responsive: true, editable: true, ...config };
  window.Plotly.newPlot(id, traces, layout, fullConfig);
}

/**
 * Add a horizontal threshold/limit line to an already-rendered plot.
 * Uses Plotly.relayout to append a shape — does not re-render traces.
 *
 * @param {string|HTMLElement} container
 * @param {number} value                  — Y value for the line
 * @param {object} [options]
 * @param {string}  options.color         — line color (default 'red')
 * @param {'solid'|'dash'|'dot'} options.dash — (default 'dash')
 * @param {string}  options.label         — annotation text (omit to skip)
 * @param {string}  options.yref          — Plotly yaxis ref, e.g. 'y', 'y2' (default 'y')
 * @param {string}  options.xref          — Plotly xaxis ref (default 'paper', spans full width)
 */
export function yline(container, value, options = {}) {
  const id    = resolveId(container);
  const el    = resolveEl(container);
  const color = options.color || "red";
  const dash  = options.dash  || "dash";
  const yref  = options.yref  || "y";
  const xref  = options.xref  || "paper";
  const editable = options.editable !== undefined ? options.editable : false;

  const existingShapes = (el && el.layout && el.layout.shapes) ? [...el.layout.shapes] : [];
  const newShape = {
    type:  "line",
    xref,
    yref,
    x0: 0, x1: 1,
    y0: value, y1: value,
    line: { color, width: 2, dash },
    editable,
  };
  const shapes = [...existingShapes, newShape];

  const update = { shapes };

  if (options.label) {
    const existingAnnotations = (el && el.layout && el.layout.annotations) ? [...el.layout.annotations] : [];
    update.annotations = [...existingAnnotations, {
      xref:      "paper",
      yref,
      x:         1,
      xanchor:   "right",
      y:         value,
      yanchor:   "bottom",
      text:      options.label,
      showarrow: false,
      font:      { color },
    }];
  }

  window.Plotly.relayout(id, update);
}

/**
 * Add a vertical event divider line to an already-rendered plot.
 * Uses Plotly.relayout to append a shape.
 *
 * @param {string|HTMLElement} container
 * @param {number} xValue                 — X value for the divider
 * @param {object} [options]
 * @param {string}  options.color         — line color (default 'forestgreen')
 * @param {'solid'|'dash'|'dot'} options.dash  — (default 'dash')
 * @param {string}  options.label         — annotation text (omit to skip)
 * @param {string}  options.xref          — Plotly xaxis ref (default 'x')
 * @param {string}  options.yref          — y span ref (default 'paper', spans full height)
 */
export function xline(container, xValue, options = {}) {
  const id    = resolveId(container);
  const el    = resolveEl(container);
  const color = options.color || "forestgreen";
  const dash  = options.dash  || "dash";
  const xref  = options.xref  || "x";
  const yref  = options.yref  || "paper";

  const existingShapes = (el && el.layout && el.layout.shapes) ? [...el.layout.shapes] : [];
  const newShape = {
    type:  "line",
    xref,
    yref,
    x0: xValue, x1: xValue,
    y0: 0, y1: 1,
    line: { color, width: 2, dash },
  };
  const shapes = [...existingShapes, newShape];

  const update = { shapes };

  if (options.label) {
    const existingAnnotations = (el && el.layout && el.layout.annotations) ? [...el.layout.annotations] : [];
    update.annotations = [...existingAnnotations, {
      xref,
      yref:      "paper",
      x:         xValue,
      xanchor:   "left",
      y:         1,
      yanchor:   "bottom",
      text:      options.label,
      showarrow: false,
      font:      { color },
    }];
  }

  window.Plotly.relayout(id, update);
}

/**
 * Enable click-to-annotate data tips on an already-rendered plot.
 * Each click on a data point adds a persistent text annotation.
 * Call again to reset (removes previous listener and clears annotations).
 *
 * @param {string|HTMLElement} container
 * @param {object} [options]
 * @param {number}  options.fontSize — annotation font size (default 12)
 */
export function enableDataTips(container, options = {}) {
  const id       = resolveId(container);
  const el       = resolveEl(container);
  const fontSize = options.fontSize || 12;

  if (!el) return;

  // Remove previous listener if any
  if (el._blauPlotDataTipHandler) {
    el.removeEventListener("plotly_click", el._blauPlotDataTipHandler);
  }

  const handler = (data) => {
    if (!data || !data.points || !data.points.length) return;
    const pt   = data.points[0];
    const text = `x=${pt.x}, y=${Number(pt.y).toPrecision(4)}`;
    const existing = (el.layout && el.layout.annotations) ? [...el.layout.annotations] : [];
    window.Plotly.relayout(id, {
      annotations: [...existing, {
        text,
        x:         pt.x,
        y:         pt.y,
        xref:      pt.xaxis._id || "x",
        yref:      pt.yaxis._id || "y",
        showarrow: true,
        arrowhead: 2,
        font:      { size: fontSize },
      }],
    });
  };

  el.on("plotly_click", handler);
  el._blauPlotDataTipHandler = handler;
}
