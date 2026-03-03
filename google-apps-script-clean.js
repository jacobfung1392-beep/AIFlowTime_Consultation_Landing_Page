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
    const targetSpreadsheetName = 'AIFlowTime 90mins Consultation Form Submissions';
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
    const isConsultationForm = data.phone && (data.aiGoal || data.currentProblem);
    const isEmailForm = data.name && data.whatsapp && !data.phone;
    
    let sheet;
    let sheetName;
    
    if (isConsultationForm) {
      // IG Consultation Form
      sheetName = 'IG獲客諮詢';
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
        hkTime,
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
        hkTime
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
        hkTime,
        data.name,
        data.whatsapp,
        data.page,
        hkTime
      ]);
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
        hkTime,
        JSON.stringify(data),
        data.page || 'Unknown',
        hkTime
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

