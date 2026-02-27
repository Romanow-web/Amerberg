/**
 * Google Apps Script Code for Team Performance Dashboard
 * 
 * INSTRUCTIONS:
 * 1. Create a new Google Sheet.
 * 2. Create two sheets named: "Employees" and "Results".
 * 3. Setup Headers:
 *    - Employees: id, name, team, status
 *    - Results: id, date, employee_id, metric_value, notes
 * 4. Go to Extensions > Apps Script.
 * 5. Paste this code into Code.gs.
 * 6. Click Deploy > New Deployment > Select type: Web App.
 *    - Execute as: Me
 *    - Who has access: Anyone (or Anyone with Google Account if you want stricter auth, but 'Anyone' is easiest for this demo)
 * 7. Copy the Web App URL and paste it into your frontend .env file as VITE_GOOGLE_SCRIPT_URL.
 */

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getData') {
    return getData();
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    
    if (action === 'addResult') {
      return addResult(body.data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const empSheet = ss.getSheetByName('Employees');
  const resSheet = ss.getSheetByName('Results');
  
  const employees = getSheetData(empSheet);
  const results = getSheetData(resSheet);
  
  // Transform results to match types
  const formattedResults = results.map(r => ({
    ...r,
    metric_value: Number(r.metric_value)
  }));

  return createJSONOutput({
    employees: employees,
    results: formattedResults
  });
}

function addResult(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Results');
  
  const id = Utilities.getUuid();
  // Order: id, month, employee_id, metric_type, metric_value, notes
  const row = [id, data.month, data.employee_id, data.metric_type || 'sales', data.metric_value, data.notes || ''];
  
  sheet.appendRow(row);
  
  return createJSONOutput({
    id: id,
    ...data
  });
}

// Helper to convert sheet data to array of objects
function getSheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      // Use raw header names as requested (snake_case)
      obj[header] = row[index];
    });
    return obj;
  });
}

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// CORS Setup for development (Optional, if needed)
// Google Apps Script Web Apps handle CORS automatically for GET/POST if deployed correctly as 'Anyone'.
