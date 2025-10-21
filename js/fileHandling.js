/**
 * File Handling Module
 * This module handles CSV file operations and data processing
 * for the gimbal control application.
 */

// ==================== File Reading Functions ====================

/**
 * Read and parse a CSV file
 * @param {File} file - The file to read
 */
function readFile(file) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const text = event.target.result;
    const lines = text.split(/\r?\n/);
    const header = lines[0].split(',');
    
    // Initialize rows object with empty arrays
    rows = {};
    header.forEach(h => rows[h.trim()] = []);

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length === header.length) {
        values.forEach((val, j) => {
          rows[header[j].trim()].push(Number(val));
        });
      }
    }

    // Rename keys to match expected format for backwards compatibility
    if (rows['Time_ms']) {
      rows['time'] = rows['Time_ms'];
      delete rows['Time_ms'];
    }
    if (rows['Angle_deg']) {
      rows['Tr_angle'] = rows['Angle_deg']; 
      delete rows['Angle_deg'];
    }
    if (rows['Current_A']) {
      rows['Tr_current'] = rows['Current_A'];
      delete rows['Current_A'];
    }
    if (rows['Torque_mNm']) {
      rows['Tr_current'] = rows['Torque_mNm']; // Convert torque to current equivalent
      delete rows['Torque_mNm'];
    }
    
    // Initialize missing arrays with zeros if not present
    if (!rows['Tr_angle']) rows['Tr_angle'] = [];
    if (!rows['Tr_velocity']) rows['Tr_velocity'] = [];
    if (!rows['Tr_current']) rows['Tr_current'] = [];
    if (!rows['El_angle']) rows['El_angle'] = [];
    if (!rows['El_velocity']) rows['El_velocity'] = [];
    if (!rows['El_current']) rows['El_current'] = [];

    showTorqueTest();
  };
  reader.readAsText(file);
}

// ==================== Data Processing Functions ====================

/**
 * Process data for analysis
 */
function processData() {
  rows["time"] = mult(removeFirst(rows["time"]),0.001);
  rows["padestalAimCmdTr"] = rows["outAimingAlgDebugOutfSpare5"];
  rows["padestalAimCmdEl"] = plus(rows["outAimingAlgDebugOutfSpare6"], 15 * d2r);
  // rows["padestalAimCmdEl"] = rows["outAimingAlgDebugOutfSpare6"];

  rows["padestalAimErrTr"] = minusArrays(rows["outAimingAlgDebugOutfSpare5"], rows["inWS_SensorsstResolversfPsi"]);
  rows["padestalAimErrEl"] = plus(minusArrays(rows["outAimingAlgDebugOutfSpare6"], rows["inWS_SensorsstResolversfTheta"]), 15 * d2r);
  // rows["padestalAimErrEl"] = minusArrays(rows["outAimingAlgDebugOutfSpare6"], rows["inWS_SensorsstResolversfTheta"]);

  rows["totalAimErrTr"] = minusArrays(rows["padestalAimErrTr"], rows["inLEUfMissile_RelAngle_Tr_M"]);
  // rows["totalAimErrEl"] = plus(minusArrays(rows["padestalAimErrEl"], rows["inLEUfMissile_RelAngle_El_M"]), +15 * d2r);
  rows["totalAimErrEl"] = minusArrays(rows["padestalAimErrEl"], rows["inLEUfMissile_RelAngle_El_M"]);

  rows["CpCmd_Tr"] = mult(derivative(rows["inWS_SensorsstResolversfPsi"]), 0.5);
  // rows["CpCmd_El"] = plus(mult(derivative(rows["inWS_SensorsstResolversfTheta"]), 0.5), -15 * d2r);
  rows["CpCmd_El"] = mult(derivative(rows["inWS_SensorsstResolversfTheta"]), 0.5);
}

// ==================== CSV Export Functions ====================

/**
 * Export data to CSV with default filename
 */
function export2csv() {
  exportToCsv('download.csv', rows);
}

/**
 * Export data to CSV file
 * @param {string} filename - The filename for the CSV file
 * @param {Object} rows - The data object to export
 */
function exportToCsv(filename, rows) {

  var processRow = function (row) {
    var finalVal = '';
    for (var j = 0; j < row.length; j++) {
      var result = processVal(row[j])
      if (j > 0)
        finalVal += ',';
      finalVal += result;
    }
    return finalVal + '\n';
  };

  var csvFile = '';
  // for (var i = 0; i < rows.length; i++) {
  //     csvFile += processRow(rows[i]););
  // }
  let fields = Object.keys(rows);

  csvFile += processRow(Object.keys(rows));
  //Object.keys(rows).forEach(field => csvFile += processRow(rows[field]));
  for (var j = 0; j < rows[fields[0]].length; j++) {
    csvFile += column2row(rows, j);
  }


  var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function column2row(row, j) {
    let finalVal = '';
    Object.keys(rows).forEach(field => finalVal += processVal(row[field][j]) + ',');
    finalVal = finalVal.slice(0, -1);
    return finalVal + '\n';
  }

  function processVal(val) {
    var innerValue = val === null ? '' : val.toString();
    if (val instanceof Date) {
      innerValue = val.toLocaleString();
    };
    var result = innerValue.replace(/"/g, '""');
    if (result.search(/("|,|\n)/g) >= 0)
      result = '"' + result + '"';
    return result;
  }
}

/**
 * Save recorded data to CSV file with timestamp
 */
function saveDataToCSV() {
  let csvContent = "Time_s,Tr_Angle_deg,Tr_Velocity_deg/s,Tr_Current_A,El_Angle_deg,El_Velocity_deg/s,El_Current_A\n";
  
  for (let i = 0; i < rows.time.length; i++) {
    // Helper function to safely format values, handling null/undefined
    const safeFormat = (value) => {
      return (value !== null && value !== undefined && !isNaN(value)) ? value.toFixed(3) : '';
    };
    
    csvContent += `${rows.time[i]/1000 || 0},${safeFormat(rows.Tr_angle[i])},${safeFormat(rows.Tr_velocity[i])},${safeFormat(rows.Tr_current[i])},${safeFormat(rows.El_angle[i])},${safeFormat(rows.El_velocity[i])},${safeFormat(rows.El_current[i])}\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `torque_test_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== Exported Functions ====================

// Make functions available globally
window.readFile = readFile;
window.processData = processData;
window.export2csv = export2csv;
window.exportToCsv = exportToCsv;
window.saveDataToCSV = saveDataToCSV;