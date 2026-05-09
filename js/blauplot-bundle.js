/**
 * BlauPlot bundle — plain (non-module) script safe for file:// origin.
 * Exposes window.BP = { buildLine, buildLayout, plot, yline,
 *                        drawTable, drawTableOneCol, clearTable, stats }
 */
(function () {

  // ── plot.js helpers ─────────────────────────────────────────────────────────

  function resolveId(container) {
    if (typeof container === 'string') return container;
    if (container && container.id) return container.id;
    throw new Error('BlauPlot: container must be an element ID string or an HTMLElement with an id.');
  }

  function resolveEl(container) {
    if (typeof container === 'string') return document.getElementById(container);
    return container;
  }

  function axisRefs(subplotIndex, gridRows, gridCols, pattern) {
    if (pattern === 'independent') {
      const x = subplotIndex === 1 ? 'x' : 'x' + subplotIndex;
      const y = subplotIndex === 1 ? 'y' : 'y' + subplotIndex;
      return { xRef: x, yRef: y };
    }
    const col = ((subplotIndex - 1) % gridCols) + 1;
    const row = Math.floor((subplotIndex - 1) / gridCols) + 1;
    return {
      xRef: col === 1 ? 'x' : 'x' + col,
      yRef: row === 1 ? 'y' : 'y' + row,
    };
  }

  function buildLine(signalName, rows, subplotIndex, xAxisName, options) {
    options = options || {};
    const gridRows = options.gridRows || 1;
    const gridCols = options.gridCols || 1;
    const pattern  = options.pattern  || 'coupled';
    const { xRef, yRef } = axisRefs(subplotIndex, gridRows, gridCols, pattern);
    const trace = {
      x:     rows[xAxisName] || [],
      y:     rows[signalName] || [],
      xaxis: xRef,
      yaxis: yRef,
      name:  options.name || signalName,
      type:  'scatter',
      mode:  options.mode || 'lines',
    };
    if (options.color) {
      trace.line   = { color: options.color };
      trace.marker = { color: options.color };
    }
    return trace;
  }

  function buildLayout(gridRows, gridCols, options) {
    options  = options  || {};
    gridRows = gridRows || 1;
    gridCols = gridCols || 1;
    const pattern  = options.pattern  || 'coupled';
    const roworder = options.roworder || 'bottom to top';
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

    const axisCommon = theme ? {
      gridcolor:     theme.border,
      linecolor:     theme.border,
      zerolinecolor: theme.border,
      tickfont:      { color: theme.textSecondary },
      title:         { font: { color: theme.textPrimary } },
    } : {};

    if (pattern === 'coupled') {
      for (let c = 1; c <= gridCols; c++) {
        const key = c === 1 ? 'xaxis' : 'xaxis' + c;
        layout[key] = Object.assign({}, axisCommon);
      }
      for (let r = 1; r <= gridRows; r++) {
        const key = r === 1 ? 'yaxis' : 'yaxis' + r;
        layout[key] = Object.assign({}, axisCommon);
      }
    } else {
      const count = gridRows * gridCols;
      for (let i = 1; i <= count; i++) {
        layout[i === 1 ? 'xaxis' : 'xaxis' + i] = Object.assign({}, axisCommon);
        layout[i === 1 ? 'yaxis' : 'yaxis' + i] = Object.assign({}, axisCommon);
      }
    }

    return layout;
  }

  function plot(container, traces, layout, config) {
    const id = resolveId(container);
    const fullConfig = Object.assign({ responsive: true, editable: true }, config || {});
    window.Plotly.newPlot(id, traces, layout, fullConfig);
  }

  function yline(container, value, options) {
    options = options || {};
    const id    = resolveId(container);
    const el    = resolveEl(container);
    const color = options.color || 'red';
    const dash  = options.dash  || 'dash';
    const yref  = options.yref  || 'y';
    const xref  = options.xref  || 'paper';
    const editable = options.editable !== undefined ? options.editable : false;

    const existingShapes = (el && el.layout && el.layout.shapes) ? el.layout.shapes.slice() : [];
    const newShape = {
      type: 'line', xref, yref,
      x0: 0, x1: 1,
      y0: value, y1: value,
      line: { color, width: 2, dash },
      editable,
    };
    const update = { shapes: existingShapes.concat([newShape]) };

    if (options.label) {
      const existingAnnotations = (el && el.layout && el.layout.annotations) ? el.layout.annotations.slice() : [];
      update.annotations = existingAnnotations.concat([{
        xref:      'paper',
        yref,
        x:         1,
        xanchor:   'right',
        y:         value,
        yanchor:   'bottom',
        text:      options.label,
        showarrow: false,
        font:      { color },
      }]);
    }

    window.Plotly.relayout(id, update);
  }

  // ── table.js helpers ─────────────────────────────────────────────────────────

  function makeHeader(text) {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.textAlign = 'center';
    th.style.padding = '4px 8px';
    return th;
  }

  function makeCell(value, color) {
    const td = document.createElement('td');
    td.textContent = typeof value === 'number' ? value.toFixed(3) : value;
    td.style.textAlign = 'center';
    td.style.padding = '4px 8px';
    if (color) td.style.color = color;
    return td;
  }

  function appendHead(table, headers) {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    headers.forEach(function (h) { tr.appendChild(makeHeader(h)); });
    thead.appendChild(tr);
    table.appendChild(thead);
  }

  function clearTable(container) {
    const el = resolveEl(container);
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function drawTable(container, data, options) {
    options = options || {};
    const el = resolveEl(container);
    if (!el) return;

    clearTable(el);

    const colNames = (options.columnNames && options.columnNames.length === 2)
      ? options.columnNames
      : ['Traverse', 'Elevation'];

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    appendHead(table, ['Parameter', colNames[0], colNames[1], 'Success Criteria']);

    const tbody = document.createElement('tbody');
    data.forEach(function (item) {
      const tr = document.createElement('tr');
      const pass1 = Math.abs(item.value1) <= item.successCriteria;
      const pass2 = Math.abs(item.value2) <= item.successCriteria;
      tr.appendChild(makeCell(item.parameter));
      tr.appendChild(makeCell(item.value1, pass1 ? 'green' : 'red'));
      tr.appendChild(makeCell(item.value2, pass2 ? 'green' : 'red'));
      tr.appendChild(makeCell(item.successCriteria));
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    el.appendChild(table);
  }

  function drawTableOneCol(container, data) {
    const el = resolveEl(container);
    if (!el) return;

    clearTable(el);

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    appendHead(table, ['Parameter', 'Value', 'Success Criteria']);

    const tbody = document.createElement('tbody');
    data.forEach(function (item) {
      const pass = item.successMethod === 'bigger'
        ? item.value > item.successCriteria
        : item.value < item.successCriteria;

      const tr = document.createElement('tr');
      tr.appendChild(makeCell(item.parameter));
      tr.appendChild(makeCell(item.value, pass ? 'green' : 'red'));
      tr.appendChild(makeCell(item.successCriteria));
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    el.appendChild(table);
  }

  // ── math.js helpers ──────────────────────────────────────────────────────────

  function _mean(arr) {
    if (!arr.length) return NaN;
    return arr.reduce(function (a, b) { return Number(a) + Number(b); }, 0) / arr.length;
  }

  function _std(arr) {
    if (arr.length < 2) return NaN;
    const mu = _mean(arr);
    const sumSq = arr.reduce(function (acc, x) { return acc + Math.pow(Number(x) - mu, 2); }, 0);
    return Math.sqrt(sumSq / (arr.length - 1));
  }

  function stats(arr) {
    return {
      mean: _mean(arr),
      std:  _std(arr),
      min:  Math.min.apply(null, arr),
      max:  Math.max.apply(null, arr),
      n:    arr.length,
    };
  }

  // ── Expose on window.BP ──────────────────────────────────────────────────────

  window.BP = {
    buildLine,
    buildLayout,
    plot,
    yline,
    drawTable,
    drawTableOneCol,
    clearTable,
    stats,
  };

}());
