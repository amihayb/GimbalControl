/**
 * BlauPlot — math.js
 * Signal processing and array math utilities.
 *
 * All functions are PURE: they accept arrays and return new arrays.
 * No side effects, no global state.
 *
 * This file is intentionally NOT re-exported from index.js.
 * Import it explicitly when needed:
 *   import { diff, integrate } from './BlauPlot/math.js';
 *
 * Exports:
 *   diff(arr, sampleTime?)
 *   integrate(arr, sampleTime?)
 *   filter(arr, cutoffHz, sampleTime?)
 *   detrend(arr)
 *   mult(arr, factor)
 *   removeFirst(arr)
 *   removeMean(arr)
 *   smoothAngle(arr)
 *   stats(arr)
 */

const DEFAULT_SAMPLE_TIME = 0.01;

// ── Basic Array Math ──────────────────────────────────────────────────────────

/**
 * Multiply every element by a scalar factor.
 * @param {number[]} arr
 * @param {number}   factor
 * @returns {number[]}
 */
export function mult(arr, factor) {
  return arr.map(x => x * factor);
}

/**
 * Subtract the first element from every element (zero-reference).
 * @param {number[]} arr
 * @returns {number[]}
 */
export function removeFirst(arr) {
  const first = Number(arr[0]);
  return arr.map(x => Number(x) - first);
}

/**
 * Subtract the mean from every element (zero-mean signal).
 * @param {number[]} arr
 * @returns {number[]}
 */
export function removeMean(arr) {
  const mu = mean(arr);
  return arr.map(x => Number(x) - mu);
}

// ── Statistics ────────────────────────────────────────────────────────────────

/**
 * Compute the arithmetic mean of an array.
 * @param {number[]} arr
 * @returns {number}
 */
export function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => Number(a) + Number(b), 0) / arr.length;
}

/**
 * Compute the sample standard deviation of an array.
 * @param {number[]} arr
 * @returns {number}
 */
export function std(arr) {
  if (arr.length < 2) return NaN;
  const mu = mean(arr);
  const sumSq = arr.reduce((acc, x) => acc + Math.pow(Number(x) - mu, 2), 0);
  return Math.sqrt(sumSq / (arr.length - 1));
}

/**
 * Return descriptive statistics for an array.
 * @param {number[]} arr
 * @returns {{ mean: number, std: number, min: number, max: number, n: number }}
 */
export function stats(arr) {
  return {
    mean: mean(arr),
    std:  std(arr),
    min:  Math.min(...arr),
    max:  Math.max(...arr),
    n:    arr.length,
  };
}

// ── Signal Processing ─────────────────────────────────────────────────────────

/**
 * First-order backward difference (numerical derivative).
 * Result has the same length as input; result[0] = result[1].
 *
 * @param {number[]} arr
 * @param {number}  [sampleTime=0.01] — time between samples in seconds
 * @returns {number[]}
 */
export function diff(arr, sampleTime = DEFAULT_SAMPLE_TIME) {
  const d = new Array(arr.length);
  for (let i = 1; i < arr.length; i++) {
    d[i] = (Number(arr[i]) - Number(arr[i - 1])) / sampleTime;
  }
  d[0] = d[1] ?? 0;
  return d;
}

/**
 * Rectangular (Euler forward) integration.
 * result[i] = result[i-1] + sampleTime * arr[i]
 *
 * @param {number[]} arr
 * @param {number}  [sampleTime=0.01] — time between samples in seconds
 * @returns {number[]}
 */
export function integrate(arr, sampleTime = DEFAULT_SAMPLE_TIME) {
  const out = new Array(arr.length);
  out[0] = Number(arr[0]);
  for (let i = 1; i < arr.length; i++) {
    out[i] = out[i - 1] + sampleTime * Number(arr[i]);
  }
  return out;
}

/**
 * 2nd-order Butterworth low-pass filter.
 * Implemented as a biquad IIR filter discretized with the bilinear transform.
 *
 * @param {number[]} arr
 * @param {number}   cutoffHz  — filter cutoff frequency in Hz
 * @param {number}  [sampleTime=0.01] — time between samples in seconds
 * @returns {number[]}
 */
export function filter(arr, cutoffHz, sampleTime = DEFAULT_SAMPLE_TIME) {
  const w  = parseFloat(cutoffHz);
  const pi = Math.PI;
  const D0 = pi ** 2 * w ** 2 + 140 * pi * w + 10000;
  const D1 = (2 * pi ** 2 * w ** 2 - 20000) / D0;
  const D2 = (pi ** 2 * w ** 2 - 140 * pi * w + 10000) / D0;
  const N0 = (w ** 2 * pi ** 2) / D0;
  const N1 = (2 * w ** 2 * pi ** 2) / D0;
  const N2 = N0;

  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    if (i >= 2) {
      out[i] = N0 * Number(arr[i])
             + N1 * Number(arr[i - 1])
             + N2 * Number(arr[i - 2])
             - D1 * out[i - 1]
             - D2 * out[i - 2];
    } else {
      out[i] = Number(arr[i]);
    }
  }
  return out;
}

/**
 * Remove a linear trend from a signal (detrend).
 * Fits a straight line between first and last sample and subtracts it.
 *
 * @param {number[]} arr
 * @returns {number[]}
 */
export function detrend(arr) {
  const n = arr.length;
  if (n < 2) return arr.slice();
  const slope = (Number(arr[n - 1]) - Number(arr[0])) / (n - 1);
  return arr.map((x, i) => Number(x) - slope * i);
}

/**
 * Unwrap angle jumps (smooth 360° discontinuities).
 * Assumes input is in degrees. Adds/subtracts 360° whenever a step
 * exceeds 300° in a single sample.
 *
 * @param {number[]} arr — angle array in degrees
 * @returns {number[]}
 */
export function smoothAngle(arr) {
  const out = new Array(arr.length);
  out[0] = Number(arr[0]);
  let bias = 0;
  for (let i = 1; i < arr.length; i++) {
    const delta = Number(arr[i]) - Number(arr[i - 1]);
    if (delta > 300)  bias -= 360;
    if (delta < -300) bias += 360;
    out[i] = Number(arr[i]) + bias;
  }
  return out;
}
