/**
 * BlauPlot — parser.js
 * CSV/text file parsing utilities.
 *
 * Exports:
 *   parseFile(file, options?)   — async, accepts a File object
 *   parseText(text, options?)   — sync, accepts a string
 */

const MAX_HEADER_SCAN_LINES = 50;

/**
 * Split a single CSV line into an array of raw string values.
 * @param {string} row
 * @returns {string[]}
 */
function parseLine(row) {
  return (row == null ? "" : String(row)).split(",");
}

/**
 * Strip leading/trailing whitespace from each column name.
 * @param {string[]} names
 * @returns {string[]}
 */
function cleanNames(names) {
  return names.map(n => n.trim());
}

/**
 * Build an empty { colName: [] } object from a header array.
 * @param {string[]} header
 * @returns {object}
 */
function makeRows(header) {
  const obj = {};
  for (const col of header) obj[col] = [];
  return obj;
}

/**
 * Generate fallback column names when no header row is detected.
 * Produces ["TIME", "S1", "S2", ...] for numCols columns.
 * @param {number} numCols
 * @returns {{ header: string[], startIdx: number }}
 */
function makeDefaultHeader(numCols) {
  const header = ["TIME"];
  for (let i = 1; i < numCols; i++) header.push("S" + i);
  return { header, startIdx: 0 };
}

/**
 * Detect and return the header row from a lines array.
 * Scans up to MAX_HEADER_SCAN_LINES lines for a row where the second
 * element is not a number (i.e. a text header). Falls back to
 * options.defaultHeader, then to generated names.
 *
 * @param {string[]} lines
 * @param {object} [options]
 * @param {boolean}   options.useLabels    — use options.labelsText as header override
 * @param {string}    options.labelsText   — comma-separated header string
 * @param {string[]}  options.defaultHeader — fallback header when no header detected
 * @returns {{ header: string[], startIdx: number }}
 */
function detectHeader(lines, options = {}) {
  // Manual label override
  if (options.useLabels && options.labelsText) {
    const parts = parseLine(options.labelsText);
    if (parts.length > 1 && isNaN(parts[1].trim())) {
      return { header: cleanNames(parts), startIdx: 0 };
    }
  }

  // Scan for a text header row
  const scanLimit = Math.min(MAX_HEADER_SCAN_LINES, lines.length);
  for (let i = 0; i < scanLimit; i++) {
    const parts = parseLine(lines[i]);
    if (parts.length > 1 && isNaN(parts[1].trim())) {
      return { header: cleanNames(parts), startIdx: i + 1 };
    }
  }

  // No header found — try provided default, then auto-generate
  const sampleParts = parseLine(lines[0] || "");
  if (options.defaultHeader && options.defaultHeader.length === sampleParts.length) {
    return { header: options.defaultHeader, startIdx: 0 };
  }

  return makeDefaultHeader(sampleParts.length);
}

/**
 * Parse a CSV/text string into a rows object.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {boolean}   options.useLabels    — use options.labelsText as header override
 * @param {string}    options.labelsText   — comma-separated header string
 * @param {string[]}  options.defaultHeader — fallback header when no header row detected
 * @returns {{ header: string[], rows: object }}
 *   rows is { [colName]: string[] } — values are strings; convert as needed.
 */
export function parseText(text, options = {}) {
  const lines = text.split(/\r?\n/);
  const { header, startIdx } = detectHeader(lines, options);
  const rows = makeRows(header);

  for (let i = startIdx; i < lines.length; i++) {
    const parts = parseLine(lines[i]);
    if (parts.length === header.length) {
      for (let j = 0; j < header.length; j++) {
        rows[header[j]].push(Number(parts[j]));
      }
    }
  }

  return { header, rows };
}

/**
 * Parse a File object (from drag-drop or <input type="file">).
 * Reads the file as text, then delegates to parseText.
 *
 * @param {File} file
 * @param {object} [options]   — same options as parseText
 * @returns {Promise<{ header: string[], rows: object, fileName: string }>}
 */
export async function parseFile(file, options = {}) {
  const text = await file.text();
  const result = parseText(text, options);
  return { ...result, fileName: file.name };
}
