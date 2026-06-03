/**
 * BlauPlot — index.js
 * Convenience re-export of the core modules.
 *
 * Usage:
 *   import { parseFile, buildLine, buildLayout, plot,
 *            yline, xline, enableDataTips,
 *            drawTable, drawTableOneCol, clearTable } from './BlauPlot/index.js';
 *
 * Math utilities are intentionally excluded here — import them explicitly:
 *   import { diff, integrate, filter, stats } from './BlauPlot/math.js';
 */

export * from "./parser.js";
export * from "./plot.js";
export * from "./table.js";
