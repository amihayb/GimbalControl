/**
 * Plotting and Data Visualization Module
 * This module contains all Plotly.js related functions for creating
 * charts, tables, and data visualizations in the gimbal control application.
 */

// ==================== Table Creation Functions ====================

/**
 * Create a Plotly table with specified dimensions
 * @param {number} m - Number of rows
 * @param {number} n - Number of columns
 * @param {string} containerId - ID of the container element
 * @param {boolean} clean - Whether to clean existing content
 * @returns {Array<Array<HTMLElement>>} 2D array of plot handles
 */
function createPlotlyTable(m, n, containerId, clean = true) {
  const container = document.getElementById(containerId);

  // Remove any existing table in the container
  if (clean) { 
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  const table = document.createElement('table');
  const plotHandles = [];

  for (let i = 0; i < m; i++) {
    const row = document.createElement('tr');
    const rowHandles = [];

    for (let j = 0; j < n; j++) {
      const cell = document.createElement('td');
      const plotDiv = document.createElement('div');
      plotDiv.id = `plot-${i}-${j}`;
      plotDiv.className = 'plot-container';
      cell.appendChild(plotDiv);
      row.appendChild(cell);

      rowHandles.push(plotDiv);
    }

    table.appendChild(row);
    plotHandles.push(rowHandles);
  }

  // Append the new table to the designated container
  container.appendChild(table);

  return plotHandles;
}

/**
 * Create a split Plotly table with main plot and two sub-plots
 * @param {string} containerId - ID of the container element
 * @param {boolean} clean - Whether to clean existing content
 * @returns {Array<Array<HTMLElement>>} 2D array of plot handles
 */
function createSplitPlotlyTable(containerId, clean = true) {
  const container = document.getElementById(containerId);

  // Remove any existing table in the container
  if (clean) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.height = '600px'; // Set a fixed height for the entire table
  table.style.borderCollapse = 'collapse'; // Remove spacing between cells
  const plotHandles = [[], []]; // Create 2D array structure

  // Create the single row
  const row = document.createElement('tr');
  row.style.height = '100%';

  // Create left column (large plot)
  const leftCell = document.createElement('td');
  leftCell.style.width = '50%';
  leftCell.style.height = '100%';
  leftCell.style.padding = '0'; // Remove cell padding
  const leftPlotDiv = document.createElement('div');
  leftPlotDiv.id = 'plot-main';
  leftPlotDiv.className = 'plot-container';
  leftPlotDiv.style.height = '100%';
  leftCell.appendChild(leftPlotDiv);
  row.appendChild(leftCell);
  plotHandles[0][0] = leftPlotDiv;

  // Create right column with two rows
  const rightCell = document.createElement('td');
  rightCell.style.width = '50%';
  rightCell.style.height = '100%';
  rightCell.style.padding = '0'; // Remove cell padding
  
  // Create inner table for right column
  const innerTable = document.createElement('table');
  innerTable.style.height = '100%';
  innerTable.style.width = '100%';
  innerTable.style.borderCollapse = 'collapse'; // Remove spacing between rows
  
  // Create top row
  const topRow = document.createElement('tr');
  topRow.style.height = '50%';
  const topPlotCell = document.createElement('td');
  topPlotCell.style.padding = '0'; // Remove cell padding
  const topPlotDiv = document.createElement('div');
  topPlotDiv.id = 'plot-right-top';
  topPlotDiv.className = 'plot-container';
  topPlotDiv.style.height = '100%';
  topPlotCell.appendChild(topPlotDiv);
  topRow.appendChild(topPlotCell);
  innerTable.appendChild(topRow);
  plotHandles[0][1] = topPlotDiv;

  // Create bottom row
  const bottomRow = document.createElement('tr');
  bottomRow.style.height = '50%';
  const bottomPlotCell = document.createElement('td');
  bottomPlotCell.style.padding = '0'; // Remove cell padding
  const bottomPlotDiv = document.createElement('div');
  bottomPlotDiv.id = 'plot-right-bottom';
  bottomPlotDiv.className = 'plot-container';
  bottomPlotDiv.style.height = '100%';
  bottomPlotCell.appendChild(bottomPlotDiv);
  bottomRow.appendChild(bottomPlotCell);
  innerTable.appendChild(bottomRow);
  plotHandles[1][1] = bottomPlotDiv;

  rightCell.appendChild(innerTable);
  row.appendChild(rightCell);

  table.appendChild(row);
  container.appendChild(table);

  return plotHandles;
}

// ==================== Plot Configuration Functions ====================

/**
 * Convert plotly table to discrete mode
 * @param {Array<Array<HTMLElement>>} plotHandles - 2D array of plot handles
 */
function plotlyTableToDiscrete(plotHandles) {
  plotHandles.forEach((row) => {
    row.forEach((plotDiv) => {
      const update = {
        'yaxis.type': 'category'
      };
      Plotly.relayout(plotDiv.id, update);
    });
  });
}

// ==================== Core Plotting Functions ====================

/**
 * Create a plot in a specific cell of the plot table
 * @param {Array<Array<HTMLElement>>} plotHandles - 2D array of plot handles
 * @param {number} rowIndex - Row index of the plot
 * @param {number} colIndex - Column index of the plot
 * @param {Array} xData - X-axis data
 * @param {Array} yData - Y-axis data
 * @param {string} traceName - Name of the trace
 * @param {string} title - Plot title
 * @param {string} xLabel - X-axis label
 * @param {string} yLabel - Y-axis label
 * @param {string} color - Trace color
 * @param {boolean} showLeg - Whether to show legend
 * @param {string} mode - Plot mode ('lines', 'markers', etc.)
 */
function plot(plotHandles, rowIndex, colIndex, xData, yData, traceName = null, title, xLabel, yLabel, color = null, showLeg = true, mode = 'lines') {
  if (rowIndex >= plotHandles.length || colIndex >= plotHandles[rowIndex].length) {
    console.error('Invalid cell index');
    return;
  }

  const plotDiv = plotHandles[rowIndex][colIndex];
  const trace = {
    x: xData,
    y: yData,
    mode: mode,
    marker: color ? { color: color } : {},
    showlegend: showLeg
  };
  if (traceName !== null) {
    trace.name = traceName;
  }
  const layout = {
    title: title,
    xaxis: {
      title: xLabel
    },
    yaxis: {
      title: yLabel,
    },
    legend: {
      x: 1,
      y: 1,
      xanchor: 'right'
    },
    margin: {
      l: 50,    // left margin
      r: 20,    // right margin
      t: 30,    // top margin
      b: 40     // bottom margin
    },
    autosize: true
  };

  const config = {
    editable: true,
    responsive: true
  };

  // Check if the plot already exists
  if (plotDiv.data) {
    // Add new trace to the existing plot
    Plotly.addTraces(plotDiv.id, trace);
  } else {
    // Create a new plot if it doesn't exist
    Plotly.newPlot(plotDiv.id, [trace], layout, config);
  }
}

// ==================== Limit Line Functions ====================

/**
 * Add a limit line to a specific plot
 * @param {Array<Array<HTMLElement>>} plotHandles - 2D array of plot handles
 * @param {number} rowIndex - Row index of the plot
 * @param {number} colIndex - Column index of the plot
 * @param {number} val - Value for the limit line
 * @param {string} dashed - Line style ('solid', 'dashed', etc.)
 */
function addLimitLine(plotHandles, rowIndex, colIndex, val, dashed = 'solid') {
  if (rowIndex >= plotHandles.length || colIndex >= plotHandles[rowIndex].length) {
    console.error('Invalid cell index');
    return;
  }

  const plotDiv = plotHandles[rowIndex][colIndex];
  val = val * r2d;

  var lim1 = {
    x: [window.rows["time"][0], window.rows["time"].slice(-1)[0]],
    y: [val, val],
    name: 'Limit',
    mode: 'lines',
    line: {
      color: 'Red',
      width: 2,
      dash: dashed
    },
    showlegend: false,
  }
  Plotly.addTraces(plotDiv.id, lim1);
}

/**
 * Add limit lines if signal values are near the limits
 * @param {Array<Array<HTMLElement>>} plotHandles - 2D array of plot handles
 * @param {number} rowIndex - Row index of the plot
 * @param {number} colIndex - Column index of the plot
 * @param {Array} signal - Signal data to check
 * @param {number} limit1 - First limit value
 * @param {number} limit2 - Second limit value
 */
function addLimitLinesIfNear(plotHandles, rowIndex, colIndex, signal, limit1, limit2) {
  if (signal.some(value => Math.sign(value) == Math.sign(limit1))) {
    addLimitLine(plotHandles, rowIndex, colIndex, limit1);
  }
  if (signal.some(value => Math.sign(value) == Math.sign(limit2))) {
    addLimitLine(plotHandles, rowIndex, colIndex, limit2);
  }
}

/**
 * Add a divider line to a specific plot
 * @param {Array<Array<HTMLElement>>} plotHandles - 2D array of plot handles
 * @param {number} rowIndex - Row index of the plot
 * @param {number} colIndex - Column index of the plot
 * @param {number} val - X value for the divider
 * @param {string} name - Name for the divider
 * @param {string} dashed - Line style ('solid', 'dashed', etc.)
 */
function addDivider(plotHandles, rowIndex, colIndex, val, name='devider', dashed = 'dashed') {
  if (rowIndex >= plotHandles.length || colIndex >= plotHandles[rowIndex].length) {
    console.error('Invalid cell index');
    return;
  }

  const plotDiv = plotHandles[rowIndex][colIndex];

  var divide1 = {
    x: [val, val],
    y: plotDiv.layout.yaxis.range,
    name: name,
    mode: 'lines',
    line: {
      color: 'forestgreen',
      width: 2,
      dash: dashed
    },
    // showlegend: false,
  }
  Plotly.addTraces(plotDiv.id, divide1);
}

// ==================== Trace Management Functions ====================

/**
 * Add a line trace to the plot
 * @param {string} vName - Variable name from rows data
 * @param {number} ax_y - Y-axis number
 * @param {number} ax_x - X-axis number
 * @param {number} factor - Multiplication factor
 * @param {string} showName - Display name for the trace
 * @param {boolean} showLeg - Whether to show in legend
 * @param {boolean} allRows - Whether to use all rows
 * @returns {Object} Trace object
 */
function addLine(vName, ax_y = 1, ax_x = 1, factor = 1, showName, showLeg = true, allRows) {
  if (showName === undefined) {
    showName = vName.replace(/_/g, " ");
  }

  let x = [];
  let y = [];

  var x_axis = "time";
  x = rows[x_axis];
  y = mult(rows[vName], factor);
  var trace = {
    x: x,
    y: y,
    xaxis: 'x' + ax_x,
    yaxis: 'y' + ax_y,
    name: showName,
    type: 'scatter',
    showlegend: showLeg,
  };
  return trace;
}

/**
 * Add limit line traces
 * @param {number} ax_y - Y-axis number
 * @param {number} ax_x - X-axis number
 * @param {number} val - Limit value
 * @returns {Object} Limit line trace object
 */
function addLimitLineTraces(ax_y = 1, ax_x = 1, val) {
  var lim1 = {
    x: [window.rows["time"][0], window.rows["time"].slice(-1)[0]],
    y: [val, val],
    xaxis: 'x' + ax_x,
    yaxis: 'y' + ax_y,
    name: 'Limit',
    mode: 'line',
    line: {
      color: 'Red',
      width: 2,
    },
    showlegend: false,
  }
  return lim1;
}

/**
 * Add line trace for binary data
 * @param {string} vName - Variable name from rows data
 * @param {number} ax - Axis number
 * @param {boolean} allRows - Whether to use all rows
 * @returns {Object} Trace object
 */
function addLineBin(vName, ax, allRows) {
  let x = [];
  let y = [];

  var x_axis = "time";
  x = rows[x_axis];
  y = rows[vName];
  var trace = {
    x: x,
    y: y,
    yaxis: 'y' + ax,
    name: vName,
    type: 'scatter',
  };
  return trace;
}

/**
 * Plot multiple traces with subplot layout
 * @param {Array<Object>} traces - Array of trace objects
 * @param {number} sp_r - Number of subplot rows
 * @param {number} sp_c - Number of subplot columns
 */
function plotTraces(traces, sp_r = 2, sp_c = 1) {
  var layout = {
    height: window.innerHeight,
    title: {
      text: this.fileName,
      font: {
        size: 24
      },
    },
    grid: {
      rows: sp_r,
      columns: sp_c,
      pattern: 'coupled',
    },
    yaxis: { title: 'Y Axis 1' },
    yaxis2: { title: 'Y Axis 2' },
    annotation: [
      {
        xref: 'paper',
        yref: 'paper',
        x: 0,
        y: 1,
        xanchor: 'left',
        yanchor: 'top',
        text: 'Time (s)',
        showarrow: false,
        font: {
          size: 16
        }
      }
    ]
  };

  Plotly.newPlot("plot-area", traces, layout, { editable: true });
}

// ==================== Data Analysis Functions ====================

/**
 * Calculate linear regression for angle vs torque data
 * @returns {Object|null} Regression results or null if no data
  */
// function calculateRegression() {
//   // Check if we have data to analyze
//   if (!rows.angle || !rows.torque || rows.angle.length === 0 || rows.torque.length === 0) {
//     Swal.fire({
//       title: 'No Data',
//       text: 'Please record or load data before calculating regression',
//       icon: 'error'
//     });
//     return null;
//   }

//   // Prepare data for regression
//   const { slope, bias } = fitLinear(rows.angle, rows.torque);

//   // Format the equation
//   const equation = `y = ${slope.toFixed(3)}x + ${bias.toFixed(3)}`;
  
//   // Create evenly spaced angles array
//   const minAngle = Math.floor(Math.min(...rows.angle));
//   const maxAngle = Math.ceil(Math.max(...rows.angle));
//   const regressionAngles = [];
//   const regressionCurrents = [];
  
//   // Generate angles with 1-degree resolution
//   for (let angle = minAngle; angle <= maxAngle; angle++) {
//     regressionAngles.push(angle);
//     // Calculate current using regression equation: y = mx + b
//     const current = slope * angle + bias;
//     regressionCurrents.push(current);
//   }
  
//   // Store regression data in rows object
//   rows.regressionAngles = regressionAngles;
//   rows.regressionCurrents = regressionCurrents;
  
//   // Display results
//   // Swal.fire({
//   //   title: 'Regression Analysis',
//   //   html: `
//   //     <p>Equation: ${equation}</p>
//   //     <p>Generated ${regressionAngles.length} points from ${minAngle}° to ${maxAngle}°</p>
//   //   `,
//   //   icon: 'info'
//   // });

//   return {
//     slope,
//     bias,
//     string: equation,
//     angles: regressionAngles,
//     currents: regressionCurrents
//   };
// }

// ==================== Exported Functions ====================

// Make functions available globally
window.createPlotlyTable = createPlotlyTable;
window.createSplitPlotlyTable = createSplitPlotlyTable;
window.plotlyTableToDiscrete = plotlyTableToDiscrete;
window.plot = plot;
window.addLimitLine = addLimitLine;
window.addLimitLinesIfNear = addLimitLinesIfNear;
window.addDivider = addDivider;
window.addLine = addLine;
window.addLimitLineTraces = addLimitLineTraces;
window.addLineBin = addLineBin;
window.plotTraces = plotTraces;
window.calculateRegression = calculateRegression;
