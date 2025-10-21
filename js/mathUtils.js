/**
 * Mathematical Utility Functions
 * This module contains all mathematical operations and utility functions
 * used throughout the application.
 */

// Constants will be available globally after constants.js is loaded

// ==================== Signal Processing Functions ====================

/**
 * Calculate the derivative of a signal
 * @param {Array} y - Input signal array
 * @param {Array} x - Time array (unused but kept for compatibility)
 * @returns {Array} Derivative array
 */
function diff(y, x) {
  let Ts = 0.01;
  let d = [];
  for (let i = 1; i < y.length; i++) {
    d[i] = (Number(y[i]) - Number(y[i - 1])) / Ts;
  }
  d[0] = d[1];
  return d;
}

/**
 * Calculate the integral of a signal
 * @param {Array} y - Input signal array
 * @param {Array} x - Time array (unused but kept for compatibility)
 * @returns {Array} Integral array
 */
function integrate(y, x) {
  let Ts = 0.01;
  let yInt = [];
  yInt[0] = parseFloat(y[0]);
  for (let i = 1; i < y.length; i++) {
    yInt[i] = yInt[i - 1] + Ts * parseFloat(y[i]);
  }
  return yInt;
}

/**
 * Apply a low-pass filter to a signal
 * @param {Array} y - Input signal array
 * @param {number} ws - Cutoff frequency
 * @returns {Array} Filtered signal array
 */
function filter(y, ws) {
  let Ts = 0.01;
  let w = parseFloat(ws);
  console.log(w);
  
  const pi = 3.1416;
  let D0 = pi ** 2 * w ** 2 + 140 * pi * w + 10000;
  let D1 = (2 * pi ** 2 * w ** 2 - 20000) / D0;
  let D2 = (pi ** 2 * w ** 2 - 140 * pi * w + 10000) / D0;
  let N0 = (w ** 2 * pi ** 2) / D0;
  let N1 = (2 * w ** 2 * pi ** 2) / D0;
  let N2 = N0;

  console.log(N0);
  console.log(N1);
  console.log(N2);
  console.log(D1);
  console.log(D2);

  //〖yf〗_k=N_0 y_k+N_1 y_(k-1)+N_2 y_(k-2)- D_1 〖yf〗_(k-1)-D_2 〖yf〗_(k-2)
  let yf = [];
  for (let i = 0; i < y.length; i++) {
    yf[i] = ((i >= 2) ? parseFloat(N0 * y[i] + N1 * y[i - 1] + N2 * y[i - 2] - D1 * yf[i - 1] - D2 * yf[i - 2]) : parseFloat(y[i]));
  }

  return yf;
}

/**
 * Remove linear trend from a signal
 * @param {Array} y - Input signal array
 * @param {Array} x - Time array (unused but kept for compatibility)
 * @returns {Array} Detrended signal array
 */
function detrend(y, x) {
  let a = (parseFloat(y[y.length - 1]) - parseFloat(y[0])) / (y.length - 1);
  let yd = y.map((item, i) => parseFloat(y[i]) - a * i);
  return yd;
}

/**
 * Fix angle wrapping issues in angle data
 * @param {Array} y - Input angle array
 * @param {Array} x - Time array (unused but kept for compatibility)
 * @returns {Array} Fixed angle array
 */
function fixAngle(y, x) {
  let yo = [];
  let bias = 0;
  yo[0] = y[0];
  for (let i = 1; i < y.length; i++) {
    bias += (y[i] - y[i - 1] > 300) ? -360 : 0;
    bias += (y[i] - y[i - 1] < -300) ? 360 : 0;
    yo[i] = y[i] + bias;
  }
  return yo;
}

/**
 * Calculate standard deviation of an array
 * @param {Array} v - Input array
 * @returns {number} Standard deviation
 */
function std(v) {
  let mu = mean(v);
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += Math.pow(Math.abs(v[i] - mu), 2);
  }
  return Math.sqrt(sum / (v.length - 1));
}

// ==================== Linear Regression ====================

/**
 * Fit a linear regression line to data points
 * @param {Array} x - X values
 * @param {Array} y - Y values
 * @returns {Object} Object with slope and bias properties
 */
function fitLinear(x, y) {
  const n = x.length;
  if (n !== y.length) throw new Error("x and y must be same length");

  const meanX = x.reduce((sum, xi) => sum + xi, 0) / n;
  const meanY = y.reduce((sum, yi) => sum + yi, 0) / n;

  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denominator = x.reduce((sum, xi) => sum + (xi - meanX) * (xi - meanX), 0);

  const slope = numerator / denominator;
  const bias = meanY - slope * meanX;

  return { slope, bias };
}

// ==================== Array Operations ====================

/**
 * Multiply array elements by a factor
 * @param {Array} array - Input array
 * @param {number} factor - Multiplication factor
 * @returns {Array} Scaled array
 */
const mult = (array, factor) => array.map(x => x * factor);

/**
 * Multiply two arrays element-wise
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {Array} Element-wise product array
 */
const multArrays = (arr1, arr2) => arr1.map((num, i) => num * arr2[i]);

/**
 * Add a value to all array elements
 * @param {Array} array - Input array
 * @param {number} plus - Value to add
 * @returns {Array} Array with added value
 */
const plus = (array, plus) => array.map(x => parseFloat(x) + plus);

/**
 * Subtract two arrays element-wise
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @returns {Array} Element-wise difference array
 */
const minusArrays = (a, b) => a.map((val, index) => val - b[index]);

/**
 * Remove first element from array (subtract first element from all)
 * @param {Array} array - Input array
 * @returns {Array} Array with first element removed
 */
const removeFirst = (array) => array.map((item, idx, all) => parseFloat(item) - parseFloat(all[0]));

/**
 * Remove mean from array
 * @param {Array} array - Input array
 * @returns {Array} Array with mean removed
 */
const removeMean = (array) => array.map((item, idx, all) => parseFloat(item) - mean(all));

/**
 * Calculate mean of array
 * @param {Array} array - Input array
 * @returns {number} Mean value
 */
const mean = (array) => array.reduce((a, b) => parseFloat(a) + parseFloat(b)) / array.length;

/**
 * Calculate derivative of array
 * @param {Array} arr - Input array
 * @returns {Array} Derivative array
 */
const derivative = arr => arr.slice(1).map((val, index) => 333 * (val - arr[index]));

// ==================== Array Statistics ====================

/**
 * Find minimum positive value in array
 * @param {Array} arr - Input array
 * @returns {number} Minimum positive value or maximum value if no positives
 */
const minPositive = arr => {
  const positives = arr.filter(num => num > 0);
  return positives.length > 0 ? Math.min(...positives) : Math.max(...arr);
};

/**
 * Find maximum absolute value in array
 * @param {Array} arr - Input array
 * @returns {number} Maximum absolute value
 */
const maxAbs = (arr) => Math.max(...arr.map(Math.abs));

/**
 * Find maximum negative value in array
 * @param {Array} arr - Input array
 * @returns {number} Maximum negative value or minimum value if no negatives
 */
const maxNegative = arr => {
  const negatives = arr.filter(num => num < 0);
  return negatives.length > 0 ? Math.max(...negatives) : Math.min(...arr);
};

/**
 * Find minimum value in array (converted to degrees)
 * @param {Array} arr - Input array
 * @returns {number} Minimum value in degrees
 */
const min = (arr) => r2d * Math.min(...arr);

/**
 * Find maximum value in array (converted to degrees)
 * @param {Array} arr - Input array
 * @returns {number} Maximum value in degrees
 */
const max = (arr) => r2d * Math.max(...arr);

// ==================== String and Utility Functions ====================

/**
 * Clean string by removing special characters
 * @param {string} str - Input string
 * @returns {string} Cleaned string
 */
const strClean = (str) => str.replace(/[^a-zA-Z0-9 ]/g, "");

/**
 * Get last value from array (converted to degrees)
 * @param {Array} arr - Input array
 * @returns {number} Last value in degrees
 */
const lastVal = (arr) => (parseFloat(arr.slice(-1)[0]) * r2d);

/**
 * Find first index where value changes
 * @param {Array} data - Input array
 * @returns {number} Index of first change
 */
const findFirstChangeIndex = data => data.findIndex((value, index) => index > 0 && value !== data[index - 1]);


// ==================== Median Filter for 5 elements====================
function median5(a, b, c, d, e) {
  const arr = [a, b, c, d, e];
  // Efficient sort for 5 items (fixed cost)
  arr.sort((x, y) => x - y);
  return arr[2]; // median is the 3rd element
}

// ==================== Streaming Median Filter ====================

/**
 * Create a streaming median filter with window size 5
 * @returns {Function} Function that takes a value and returns the median
 */
function createStreamingMedian5() {
  const window = [];

  return function addSample(value) {
    // Keep only the last 5 samples
    window.push(value);
    if (window.length > 5) window.shift();

    if (window.length < 5) return null; // Not enough data yet

    // Copy and sort to find median
    const sorted = window.slice().sort((a, b) => a - b);
    return sorted[2];
  };
}

/**
 * Get all indexes of a value in an array
 * @param {Array} arr - The array to search
 * @param {*} val - The value to find
 * @returns {Array} Array of indexes where the value was found
 */
function getIdx(arr, val) {
  var indexes = [], i = -1;
  while ((i = arr.indexOf(val, i + 1)) != -1) {
    indexes.push(i);
  }
  return indexes;
}

/**
 * Find the index of the first element greater than a value
 * @param {Array} array - The array to search
 * @param {number} val - The value to compare against
 * @returns {number} Index of first element greater than val, or -1 if not found
 */
function minIdx(array, val) {
  return array.findIndex(n => n > val);
}

/**
 * Find the index of the first element greater than a value
 * @param {Array} array - The array to search
 * @param {number} val - The value to compare against
 * @returns {number} Index of first element greater than val, or -1 if not found
 */
function maxIdx(array, val) {
  return array.findIndex(n => n > val);
}

// ==================== Exported Functions ====================

// Make functions available globally
window.diff = diff;
window.integrate = integrate;
window.filter = filter;
window.detrend = detrend;
window.fixAngle = fixAngle;
window.std = std;
window.fitLinear = fitLinear;
window.mult = mult;
window.multArrays = multArrays;
window.plus = plus;
window.minusArrays = minusArrays;
window.removeFirst = removeFirst;
window.removeMean = removeMean;
window.mean = mean;
window.derivative = derivative;
window.minPositive = minPositive;
window.maxAbs = maxAbs;
window.maxNegative = maxNegative;
window.min = min;
window.max = max;
window.strClean = strClean;
window.lastVal = lastVal;
window.findFirstChangeIndex = findFirstChangeIndex;
window.createStreamingMedian5 = createStreamingMedian5;
window.getIdx = getIdx;
window.minIdx = minIdx;
window.maxIdx = maxIdx;
