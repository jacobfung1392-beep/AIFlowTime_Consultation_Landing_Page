// Google Apps Script to collect form submissions to Google Sheets
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
// 10. Replace 'YOUR_GOOGLE_SCRIPT_URL' in main.js with your actual URL
//
// The script will automatically create a new sheet called "AIFlowTime Leads" in your Google Drive

function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // OPTION 1: Use a specific spreadsheet by ID (most reliable)
    // To get your spreadsheet ID: Open your Google Sheet, look at the URL
    // Example: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
    // Uncomment the line below and replace SPREADSHEET_ID_HERE with your actual ID
    // const ss = SpreadsheetApp.openById('SPREADSHEET_ID_HERE');
    
    // OPTION 2: Find spreadsheet by name
    const targetSpreadsheetName = 'AIFlowTime 服務';
    let ss;
    
    try {
      // First, try to get the active spreadsheet (if script is bound to a sheet)
      ss = SpreadsheetApp.getActiveSpreadsheet();
      Logger.log('Using active spreadsheet: ' + ss.getName());
    } catch (error) {
      // If no active spreadsheet, search for the target spreadsheet by name
      try {
        const files = DriveApp.getFilesByName(targetSpreadsheetName);
        if (files.hasNext()) {
          ss = SpreadsheetApp.open(files.next());
          Logger.log('Found spreadsheet by name: ' + ss.getName());
        } else {
          // If not found, create a new one with the target name
          ss = SpreadsheetApp.create(targetSpreadsheetName);
          Logger.log('Created new spreadsheet: ' + ss.getName() + ' - URL: ' + ss.getUrl());
        }
      } catch (searchError) {
        // Fallback: create a new spreadsheet
        ss = SpreadsheetApp.create(targetSpreadsheetName);
        Logger.log('Created new spreadsheet (fallback): ' + ss.getName() + ' - URL: ' + ss.getUrl());
      }
    }
    
    // Determine which form type this is
    // IMPORTANT: Check workshop form FIRST by source to avoid misidentification
    const isWorkshopForm = data.source === 'workshop-waitlist';
    const isConsultationForm = !isWorkshopForm && data.phone && (data.aiGoal || data.currentProblem);
    const isEmailForm = !isWorkshopForm && !isConsultationForm && data.name && data.whatsapp && !data.phone;
    
    Logger.log('Form type detection:');
    Logger.log('- isWorkshopForm: ' + isWorkshopForm);
    Logger.log('- isConsultationForm: ' + isConsultationForm);
    Logger.log('- isEmailForm: ' + isEmailForm);
    Logger.log('- data.source: ' + data.source);
    
    let sheet;
    let sheetName;
    
    if (isConsultationForm) {
      // IG Consultation Form
      sheetName = '1 on 1 Consultation';
      sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        // Add headers for consultation form
        sheet.appendRow([
          'Timestamp', 'Name', 'Phone', 'Email', 'IG Account', 'AI Skill Level', 'AI Goal (90 days)', 
          'Current AI Tools', 'Current AI Tools Other', 'Success Outcome', 'Current Problem', 
          'Start Timing', 'Willingness to Pay', 'Why Now', 
          'Workshop Interest', 'AI Topics', 'AI Topics Other', 'Additional Info', 
          'Page', 'Submission Date'
        ]);
        sheet.getRange(1, 1, 1, 20).setFontWeight('bold');
      }
      
      // Format timestamp for Hong Kong timezone
      const timestamp = new Date(data.timestamp);
      const hkTime = Utilities.formatDate(timestamp, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
      
      // Format arrays as comma-separated strings
      const aiTopicsStr = Array.isArray(data.aiTopics) ? data.aiTopics.join(', ') : (data.aiTopics || '');
      const currentAIToolsStr = Array.isArray(data.currentAITools) ? data.currentAITools.join(', ') : (data.currentAITools || '');
      
      // Append consultation form data (using HKT for timestamp)
      sheet.appendRow([
        hkTime,  // Use HKT formatted time instead of raw timestamp
        data.name || '',
        data.phone || '',
        data.email || '',
        data.igAccount || '',
        data.aiSkillLevel || '',
        data.aiGoal || '',
        currentAIToolsStr,
        data.currentAIToolsOtherText || '',
        data.successOutcome || '',
        data.currentProblem || '',
        data.startTiming || '',
        data.willingnessToPay || '',
        data.whyNow || '',
        data.workshopInterest || '',
        aiTopicsStr,
        data.aiTopicsOtherText || '',
        data.additionalInfo || '',
        data.page || 'IG獲客諮詢表單',
        hkTime  // Keep Submission Date as well
      ]);
      
    } else if (isEmailForm) {
      // Email/WhatsApp Form
      sheetName = 'AIFlowTime Leads';
      sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        // Add headers for email form
        sheet.appendRow(['Timestamp', 'Name', 'WhatsApp', 'Page', 'Submission Date']);
        sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      }
      
      // Format timestamp for Hong Kong timezone
      const timestamp = new Date(data.timestamp);
      const hkTime = Utilities.formatDate(timestamp, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
      
      // Append email form data (using HKT for timestamp)
      sheet.appendRow([
        hkTime,  // Use HKT formatted time instead of raw timestamp
        data.name,
        data.whatsapp,
        data.page,
        hkTime  // Keep Submission Date as well
      ]);
    } else if (isWorkshopForm) {
      // Workshop Waitlist Form
      sheetName = 'Workshops';
      sheet = ss.getSheetByName(sheetName);
      
      const expectedHeaders = ['Timestamp', 'Name', 'Email', 'WhatsApp', 'Workshop/Event', 'Pain Point', 'Page', 'Submission Date (HKT)'];
      
      Logger.log('Workshop form detected. Sheet name: ' + sheetName);
      Logger.log('Data received: ' + JSON.stringify(data));
      
      if (!sheet) {
        // Create new sheet with headers
        Logger.log('Creating new Workshops sheet');
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(expectedHeaders);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
      } else {
        // Force update headers to ensure they are correct
        Logger.log('Workshops sheet exists, checking headers...');
        const lastCol = sheet.getLastColumn();
        const existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
        Logger.log('Existing headers: ' + JSON.stringify(existingHeaders));
        Logger.log('Expected headers: ' + JSON.stringify(expectedHeaders));
        
        // Check if headers match exactly
        let headersMatch = false;
        if (existingHeaders.length === expectedHeaders.length) {
          headersMatch = existingHeaders.every((h, i) => {
            const existingHeader = String(h).trim();
            const expectedHeader = String(expectedHeaders[i]).trim();
            return existingHeader === expectedHeader;
          });
        }
        
        Logger.log('Headers match: ' + headersMatch);
        
        if (!headersMatch) {
          // Update headers - delete old header row and insert new one
          Logger.log('Updating headers...');
          if (sheet.getLastRow() > 0) {
            sheet.deleteRow(1);
          }
          sheet.insertRowBefore(1);
          sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
          sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
          Logger.log('Headers updated successfully');
        }
      }
      
      // Format timestamp for Hong Kong timezone
      const timestamp = new Date(data.timestamp);
      const hkTime = Utilities.formatDate(timestamp, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
      
      // Prepare data row
      const dataRow = [
        hkTime,
        data.name || '',
        data.email || '',
        data.whatsapp || '',
        data.workshopEvent || '',
        data.painPoint || '',
        data.page || 'AI 新手工作坊',
        hkTime
      ];
      
      Logger.log('Appending data row: ' + JSON.stringify(dataRow));
      
      // Append workshop waitlist form data
      sheet.appendRow(dataRow);
      
      Logger.log('Data appended successfully to Workshops sheet');
    } else {
      // Unknown form type - save to generic sheet
      sheetName = 'Other Submissions';
      sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(['Timestamp', 'Data', 'Page', 'Submission Date']);
        sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
      }
      
      const timestamp = new Date(data.timestamp);
      const hkTime = Utilities.formatDate(timestamp, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
      
      sheet.appendRow([
        hkTime,  // Use HKT formatted time instead of raw timestamp
        JSON.stringify(data),
        data.page || 'Unknown',
        hkTime  // Keep Submission Date as well
      ]);
    }
    
    // Log success for debugging
    Logger.log('Data saved successfully to sheet: ' + sheetName);
    Logger.log('Spreadsheet URL: ' + ss.getUrl());
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'message': 'Data saved successfully',
      'sheetName': sheetName,
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
function testDoPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        name: 'Test User',
        whatsapp: '+852 1234 5678',
        timestamp: new Date().toISOString(),
        page: 'Test Submission'
      })
    }
  };
  
  const result = doPost(testData);
  Logger.log(result.getContent());
}

