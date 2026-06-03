/**
 * BlauPlot — table.js
 * Pass/fail results table rendering utilities.
 *
 * Exports:
 *   drawTable(container, data, options?)       — two-axis table (e.g. Traverse + Elevation)
 *   drawTableOneCol(container, data)           — single-value table
 *   clearTable(container)                      — remove all rows and headers
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

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
 * Create a <th> element with centered text.
 * @param {string} text
 * @returns {HTMLTableCellElement}
 */
function makeHeader(text) {
  const th = document.createElement("th");
  th.textContent = text;
  th.style.textAlign = "center";
  th.style.padding = "4px 8px";
  return th;
}

/**
 * Create a <td> element with centered text and optional color.
 * @param {string|number} value
 * @param {string} [color]
 * @returns {HTMLTableCellElement}
 */
function makeCell(value, color) {
  const td = document.createElement("td");
  td.textContent = typeof value === "number" ? value.toFixed(3) : value;
  td.style.textAlign = "center";
  td.style.padding = "4px 8px";
  if (color) td.style.color = color;
  return td;
}

/**
 * Append a <thead> row to a table element.
 * @param {HTMLTableElement} table
 * @param {string[]} headers
 */
function appendHead(table, headers) {
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  headers.forEach(h => tr.appendChild(makeHeader(h)));
  thead.appendChild(tr);
  table.appendChild(thead);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render a two-axis pass/fail table (e.g. Traverse + Elevation columns).
 * A value cell is green if Math.abs(value) <= successCriteria, red otherwise.
 *
 * @param {string|HTMLElement} container
 * @param {Array<{
 *   parameter: string,
 *   value1: number,
 *   value2: number,
 *   successCriteria: number
 * }>} data
 * @param {object} [options]
 * @param {string[]} options.columnNames — axis column headers
 *   (default ['Traverse', 'Elevation'])
 */
export function drawTable(container, data, options = {}) {
  const el = resolveEl(container);
  if (!el) return;

  clearTable(el);

  const colNames = (options.columnNames && options.columnNames.length === 2)
    ? options.columnNames
    : ["Traverse", "Elevation"];

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  appendHead(table, ["Parameter", colNames[0], colNames[1], "Success Criteria"]);

  const tbody = document.createElement("tbody");

  data.forEach(item => {
    const tr = document.createElement("tr");
    const pass1 = Math.abs(item.value1) <= item.successCriteria;
    const pass2 = Math.abs(item.value2) <= item.successCriteria;
    tr.appendChild(makeCell(item.parameter));
    tr.appendChild(makeCell(item.value1, pass1 ? "green" : "red"));
    tr.appendChild(makeCell(item.value2, pass2 ? "green" : "red"));
    tr.appendChild(makeCell(item.successCriteria));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  el.appendChild(table);
}

/**
 * Render a single-value pass/fail table.
 * Success is determined by successMethod:
 *   'bigger'  — pass if value > successCriteria
 *   'smaller' — pass if value < successCriteria
 *
 * @param {string|HTMLElement} container
 * @param {Array<{
 *   parameter: string,
 *   value: number,
 *   successCriteria: number,
 *   successMethod: 'bigger' | 'smaller'
 * }>} data
 */
export function drawTableOneCol(container, data) {
  const el = resolveEl(container);
  if (!el) return;

  clearTable(el);

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  appendHead(table, ["Parameter", "Value", "Success Criteria"]);

  const tbody = document.createElement("tbody");

  data.forEach(item => {
    const pass = item.successMethod === "bigger"
      ? item.value > item.successCriteria
      : item.value < item.successCriteria;

    const tr = document.createElement("tr");
    tr.appendChild(makeCell(item.parameter));
    tr.appendChild(makeCell(item.value, pass ? "green" : "red"));
    tr.appendChild(makeCell(item.successCriteria));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  el.appendChild(table);
}

/**
 * Remove all content from a table container.
 * Call this before rendering a new scenario's results.
 *
 * @param {string|HTMLElement} container
 */
export function clearTable(container) {
  const el = resolveEl(container);
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}
