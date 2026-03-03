// Google Apps Script to collect Lead Magnet (Free AI Guide) form submissions
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://script.google.com/
// 2. Click "New Project"
// 3. Delete any existing code and paste this entire file
// 4. Click "Deploy" > "New deployment"
// 5. Choose "Web app" as deployment type
// 6. Set "Execute as" to "Me"
// 7. Set "Who has access" to "Anyone"
// 8. Click "Deploy"
// 9. Copy the Web App URL
// 10. Replace the Google Script URL in linktree.html (around line 1803) with your actual URL
//
// The script will automatically create a new sheet called "AIFlowTime Lead Magnet" in your Google Drive

// Handle GET requests (when someone accesses the URL directly in browser)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    'status': 'success',
    'message': 'Lead Magnet Form Handler is active. This endpoint accepts POST requests only.',
    'spreadsheetId': '136-FMo5GlBzr8uNjoMMwDuoiBzmiJBsCoOWROaQC9oE'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle POST requests (form submissions)
function doPost(e) {
  try {
    Logger.log('doPost called');
    Logger.log('e.postData: ' + JSON.stringify(e.postData));
    Logger.log('e.parameter: ' + JSON.stringify(e.parameter));
    
    // Handle different data formats
    let data;
    if (e.postData && e.postData.contents) {
      // Try to parse as JSON first
      try {
        data = JSON.parse(e.postData.contents);
        Logger.log('Parsed JSON data: ' + JSON.stringify(data));
      } catch (jsonError) {
        // If not JSON, try as form data
        data = e.parameter || {};
        Logger.log('Using form data: ' + JSON.stringify(data));
      }
    } else if (e.parameter) {
      // Form-encoded data
      data = e.parameter;
      Logger.log('Using parameter data: ' + JSON.stringify(data));
    } else {
      throw new Error('No data received');
    }
    
    // Use a specific spreadsheet by ID (RECOMMENDED - most reliable)
    const spreadsheetId = '136-FMo5GlBzr8uNjoMMwDuoiBzmiJBsCoOWROaQC9oE';
    Logger.log('=== LEAD MAGNET SCRIPT ===');
    Logger.log('Target Spreadsheet ID: ' + spreadsheetId);
    let ss;
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
      Logger.log('✅ Successfully opened spreadsheet: ' + ss.getName());
      Logger.log('✅ Spreadsheet URL: ' + ss.getUrl());
    } catch (spreadsheetError) {
      Logger.log('Error opening spreadsheet: ' + spreadsheetError.toString());
      throw new Error('Cannot access spreadsheet. Please check permissions and spreadsheet ID.');
    }
    
    // Get or create the sheet for lead magnet submissions
    const sheetName = 'Lead Magnet Submissions';
    Logger.log('Looking for sheet: ' + sheetName);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log('Sheet not found, creating new sheet: ' + sheetName);
      sheet = ss.insertSheet(sheetName);
      // Add headers
      sheet.appendRow([
        'Timestamp', 
        'Name', 
        'WhatsApp', 
        'Source Page', 
        'Submission Date (HKT)'
      ]);
      // Make headers bold
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      // Freeze header row
      sheet.setFrozenRows(1);
      // Auto-resize columns
      sheet.autoResizeColumns(1, 5);
      Logger.log('✅ Created new sheet: ' + sheetName);
    } else {
      Logger.log('✅ Using existing sheet: ' + sheetName);
    }
    
    Logger.log('Current spreadsheet has ' + ss.getNumSheets() + ' sheets');
    Logger.log('Sheet names: ' + ss.getSheets().map(s => s.getName()).join(', '));
    
    // Format timestamp for Hong Kong timezone
    const timestampStr = data.timestamp || data.Timestamp || new Date().toISOString();
    const timestamp = new Date(timestampStr);
    const hkTime = Utilities.formatDate(timestamp, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
    Logger.log('Timestamp: ' + timestampStr + ' -> HKT: ' + hkTime);
    
    // Extract data fields (handle both JSON and form-encoded)
    const name = data.name || data.Name || '';
    const whatsapp = data.whatsapp || data.WhatsApp || data.whatsappNumber || '';
    const source = data.source || data.Source || 'linktree';
    
    Logger.log('Extracted data - Name: ' + name + ', WhatsApp: ' + whatsapp + ', Source: ' + source);
    
    // Validate required fields
    if (!name || !whatsapp) {
      throw new Error('Missing required fields: name or whatsapp');
    }
    
    // Append the form data with error handling
    try {
      sheet.appendRow([
        hkTime,  // Timestamp in HKT
        name,
        whatsapp,
        source,
        hkTime  // Submission Date (HKT)
      ]);
      
      // Auto-resize columns to fit content
      sheet.autoResizeColumns(1, 5);
      
      Logger.log('Row appended successfully');
    } catch (appendError) {
      Logger.log('Error appending row: ' + appendError.toString());
      throw appendError;
    }
    
    // Log success for debugging
    Logger.log('Lead magnet data saved successfully');
    Logger.log('Name: ' + data.name);
    Logger.log('WhatsApp: ' + data.whatsapp);
    Logger.log('Spreadsheet URL: ' + ss.getUrl());
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'message': 'Lead magnet data saved successfully',
      'spreadsheetUrl': ss.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Log error for debugging
    Logger.log('Error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString(),
      'stack': error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to verify the script works
// Run this from the Apps Script editor to test
function testDoPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        name: 'Test User',
        whatsapp: '+852 1234 5678',
        timestamp: new Date().toISOString(),
        source: 'linktree'
      })
    }
  };
  
  const result = doPost(testData);
  Logger.log(result.getContent());
}

