/**
 * MedWard Patient Manager - Google Apps Script Backend
 * Connects to Google Sheets for ward patient management
 *
 * SETUP INSTRUCTIONS:
 * 1. Create this as a NEW Apps Script project at script.google.com
 * 2. Copy this entire code to Code.gs
 * 3. Go to Project Settings (gear icon)
 * 4. Add Script Property: SHEET_ID = [Your Google Sheet ID]
 *    - Find your Sheet ID in the URL: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
 * 5. Deploy as Web App:
 *    - Click Deploy → New deployment
 *    - Select type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Click Deploy
 * 6. Copy the deployment URL
 * 7. Paste it in index.html: window.MEDWARD_PATIENT_API_URL = 'YOUR_URL_HERE';
 */

// Get Sheet ID from Script Properties
function getSheetId() {
  return PropertiesService.getScriptProperties().getProperty('SHEET_ID');
}

// Main entry point for POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let response;
    switch(action) {
      case 'getPatients':
        response = getPatients(data);
        break;
      case 'getWards':
        response = getWards();
        break;
      case 'addPatient':
        response = addPatient(data);
        break;
      case 'updatePatient':
        response = updatePatient(data);
        break;
      case 'deletePatient':
        response = deletePatient(data);
        break;
      case 'getDoctors':
        response = getDoctors();
        break;
      default:
        response = { success: false, error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test endpoint for GET requests
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'MedWard Patient Manager API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get all patients, optionally filtered by ward, doctor, or status
 */
function getPatients(data) {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = ss.getSheetByName('Unit e') || ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();

  const patients = [];
  let currentWard = '';
  let isChronicSection = false;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];

    // Detect section headers
    if (row[0] && typeof row[0] === 'string') {
      const cellValue = row[0].toString().toLowerCase();

      // Check for chronic section marker
      if (cellValue.includes('chronic')) {
        isChronicSection = true;
        continue;
      }

      // Check for ward headers (Ward A, Ward B, ICU, ER, etc.)
      if (cellValue.includes('ward') || cellValue === 'icu' || cellValue === 'er') {
        currentWard = row[0].toString().trim();
        isChronicSection = false; // Reset chronic flag when entering new ward
        continue;
      }
    }

    // Skip header rows
    if (row[1] === 'Patient name' || row[1] === 'Patient Name' || !row[1]) continue;

    // Parse patient row
    const roomBed = row[0] ? row[0].toString().trim() : '';
    const patientName = row[1] ? row[1].toString().trim() : '';
    const diagnosis = row[2] ? row[2].toString().trim() : '';
    const assignedDoctor = row[3] ? row[3].toString().trim() : '';
    const status = row[4] ? row[4].toString().trim() : (isChronicSection ? 'Chronic' : 'Non-Chronic');

    // Only add rows with patient names
    if (patientName && patientName !== 'Patient name' && patientName !== 'Patient Name') {
      patients.push({
        rowIndex: i + 1, // 1-indexed for Sheets API
        ward: currentWard || 'Unassigned',
        roomBed: roomBed,
        patientName: patientName,
        diagnosis: diagnosis,
        assignedDoctor: assignedDoctor,
        status: status,
        isChronicSection: isChronicSection
      });
    }
  }

  // Apply filters if provided
  let filtered = patients;

  if (data.ward) {
    filtered = filtered.filter(p =>
      p.ward.toLowerCase().includes(data.ward.toLowerCase())
    );
  }

  if (data.doctor) {
    filtered = filtered.filter(p =>
      p.assignedDoctor.toLowerCase().includes(data.doctor.toLowerCase())
    );
  }

  if (data.status) {
    filtered = filtered.filter(p =>
      p.status.toLowerCase() === data.status.toLowerCase()
    );
  }

  return {
    success: true,
    patients: filtered,
    totalCount: filtered.length,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Get list of unique wards from the sheet
 */
function getWards() {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = ss.getSheetByName('Unit e') || ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();

  const wards = new Set();

  for (let i = 0; i < values.length; i++) {
    const cell = values[i][0];
    if (cell && typeof cell === 'string') {
      const val = cell.trim();
      const lowerVal = val.toLowerCase();

      // Look for ward identifiers
      if (lowerVal.includes('ward') || lowerVal === 'icu' || lowerVal === 'er') {
        wards.add(val);
      }
    }
  }

  return {
    success: true,
    wards: Array.from(wards).sort()
  };
}

/**
 * Get list of unique doctors from the sheet
 */
function getDoctors() {
  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = ss.getSheetByName('Unit e') || ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();

  const doctors = new Set();

  for (let i = 0; i < values.length; i++) {
    const doctor = values[i][3]; // Column D (index 3)
    if (doctor && typeof doctor === 'string') {
      const trimmed = doctor.trim();
      // Exclude header text
      if (trimmed && trimmed !== 'Assigned Doctor' && trimmed !== 'Doctor') {
        doctors.add(trimmed);
      }
    }
  }

  return {
    success: true,
    doctors: Array.from(doctors).sort()
  };
}

/**
 * Add a new patient to the appropriate ward section
 */
function addPatient(data) {
  if (!data.patientName || !data.ward) {
    return { success: false, error: 'Patient name and ward are required' };
  }

  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = ss.getSheetByName('Unit e') || ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();

  // Find the correct ward section to insert into
  let insertRow = -1;
  let foundWard = false;

  for (let i = 0; i < values.length; i++) {
    const cell = values[i][0];
    if (cell && typeof cell === 'string') {
      const val = cell.trim().toLowerCase();
      const targetWard = data.ward.toLowerCase();

      // Found our target ward
      if (val === targetWard || val.includes(targetWard)) {
        foundWard = true;
        continue;
      }

      // Found next section (ward or chronic) - insert before this
      if (foundWard && (val.includes('ward') || val === 'icu' || val === 'er' || val.includes('chronic'))) {
        insertRow = i + 1; // 1-indexed
        break;
      }
    }

    // If we're in the right ward and this is an empty row, use it
    if (foundWard && !values[i][1]) {
      insertRow = i + 1;
      break;
    }
  }

  // If no insert position found, append at end
  if (insertRow === -1) {
    insertRow = sheet.getLastRow() + 1;
  }

  // Insert the new patient row
  sheet.insertRowBefore(insertRow);
  sheet.getRange(insertRow, 1, 1, 5).setValues([[
    data.roomBed || '',
    data.patientName,
    data.diagnosis || '',
    data.assignedDoctor || '',
    data.status || 'Non-Chronic'
  ]]);

  return {
    success: true,
    message: 'Patient added successfully',
    rowIndex: insertRow,
    patient: {
      roomBed: data.roomBed || '',
      patientName: data.patientName,
      diagnosis: data.diagnosis || '',
      assignedDoctor: data.assignedDoctor || '',
      status: data.status || 'Non-Chronic',
      ward: data.ward
    }
  };
}

/**
 * Update existing patient information
 */
function updatePatient(data) {
  if (!data.rowIndex) {
    return { success: false, error: 'Row index is required for update' };
  }

  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = ss.getSheetByName('Unit e') || ss.getSheets()[0];

  const row = data.rowIndex;

  // Update only provided fields
  if (data.roomBed !== undefined) {
    sheet.getRange(row, 1).setValue(data.roomBed);
  }
  if (data.patientName !== undefined) {
    sheet.getRange(row, 2).setValue(data.patientName);
  }
  if (data.diagnosis !== undefined) {
    sheet.getRange(row, 3).setValue(data.diagnosis);
  }
  if (data.assignedDoctor !== undefined) {
    sheet.getRange(row, 4).setValue(data.assignedDoctor);
  }
  if (data.status !== undefined) {
    sheet.getRange(row, 5).setValue(data.status);
  }

  return {
    success: true,
    message: 'Patient updated successfully',
    rowIndex: row
  };
}

/**
 * Delete/discharge a patient (removes the row from the sheet)
 */
function deletePatient(data) {
  if (!data.rowIndex) {
    return { success: false, error: 'Row index is required for deletion' };
  }

  const ss = SpreadsheetApp.openById(getSheetId());
  const sheet = ss.getSheetByName('Unit e') || ss.getSheets()[0];

  // Option 1: Clear the row (keeps structure)
  // sheet.getRange(data.rowIndex, 1, 1, 5).clearContent();

  // Option 2: Delete the row entirely (recommended)
  sheet.deleteRow(data.rowIndex);

  return {
    success: true,
    message: 'Patient removed successfully'
  };
}

/**
 * Test function - Run this to test the getPatients function
 * View results in Execution log
 */
function testGetPatients() {
  const result = getPatients({});
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test function - Get wards
 */
function testGetWards() {
  const result = getWards();
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test function - Get doctors
 */
function testGetDoctors() {
  const result = getDoctors();
  Logger.log(JSON.stringify(result, null, 2));
}
