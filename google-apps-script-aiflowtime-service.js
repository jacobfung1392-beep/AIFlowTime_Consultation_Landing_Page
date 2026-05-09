// Google Apps Script — AIFlowTime 服務 (“live” shape: quiz, consultation, leads, workshop, other)
// Paste into script.google.com, bind or standalone. Deploy Web app: Execute as Me, Anyone.
// Script property LAYOUT_EDITOR_SYNC_SECRET must match the layout editor for header sync.

const TARGET_SPREADSHEET_NAME = 'AIFlowTime 服務';
const CONSULTATION_SHEET_NAME = '1 on 1 Consultation';
const HEADER_SYNC_SECRET_PROP = 'LAYOUT_EDITOR_SYNC_SECRET';

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTargetSpreadsheet_() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (error) {}

  try {
    const files = DriveApp.getFilesByName(TARGET_SPREADSHEET_NAME);
    if (files.hasNext()) return SpreadsheetApp.open(files.next());
  } catch (error) {}

  return SpreadsheetApp.create(TARGET_SPREADSHEET_NAME);
}

function formatHkTime_(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  return Utilities.formatDate(date, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
}

function valueToCell_(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Sheets treats leading +, =, -, @ as formula/special → #ERROR!. Leading apostrophe forces plain text. */
function sheetPlainTextCell_(value) {
  var s = value == null ? '' : String(value);
  if (!s) return '';
  var c = s.charAt(0);
  if (c === '+' || c === '=' || c === '-' || c === '@') return "'" + s;
  return s;
}

function uniqueHeaders_(headers) {
  const seen = {};
  const out = [];
  (headers || []).forEach(function(header) {
    header = String(header || '').trim();
    if (!header || seen[header]) return;
    seen[header] = true;
    out.push(header);
  });
  return out;
}

function ensureSheetHeaders_(sheet, requiredHeaders) {
  requiredHeaders = uniqueHeaders_(requiredHeaders);

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  let existingHeaders = [];

  if (sheet.getLastRow() > 0) {
    existingHeaders = sheet
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .map(function(value) {
        return String(value || '').trim();
      });
  }

  if (!existingHeaders.filter(Boolean).length) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.getRange(1, 1, 1, requiredHeaders.length).setFontWeight('bold');
    return requiredHeaders.slice();
  }

  requiredHeaders.forEach(function(header) {
    if (existingHeaders.indexOf(header) < 0) existingHeaders.push(header);
  });

  sheet.getRange(1, 1, 1, existingHeaders.length).setValues([existingHeaders]);
  sheet.getRange(1, 1, 1, existingHeaders.length).setFontWeight('bold');
  return existingHeaders;
}

function appendObjectRow_(sheet, headers, values) {
  const finalHeaders = ensureSheetHeaders_(sheet, headers);
  sheet.appendRow(finalHeaders.map(function(header) {
    return valueToCell_(values[header]);
  }));
}

function handleAiflowSyncConsultationHeaders_(data) {
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty(HEADER_SYNC_SECRET_PROP);

  if (!expected || String(data.syncSecret || '') !== expected) {
    return jsonResponse_({
      status: 'error',
      message: 'Unauthorized. Set script property LAYOUT_EDITOR_SYNC_SECRET.'
    });
  }

  const ss = getTargetSpreadsheet_();
  let sheet = ss.getSheetByName(CONSULTATION_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONSULTATION_SHEET_NAME);

  const headers = uniqueHeaders_((data.headers || []).concat([
    'WhatsApp Consent',
    'Custom answers (JSON)'
  ]));

  ensureSheetHeaders_(sheet, headers);

  return jsonResponse_({
    status: 'success',
    message: 'Headers merged',
    count: headers.length,
    spreadsheetUrl: ss.getUrl()
  });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');

    if (data && data.action === 'aiflowSyncConsultationHeaders') {
      return handleAiflowSyncConsultationHeaders_(data);
    }

    const ss = getTargetSpreadsheet_();

    const isQuizDiagnostic = data.source === 'quiz-diagnostic';
    const isConsultationForm =
      !isQuizDiagnostic &&
      (data.formType === 'consultation' || (data.phone && (data.aiGoal || data.currentProblem)));
    const isEmailForm =
      !isQuizDiagnostic &&
      data.name &&
      data.whatsapp &&
      !data.phone;
    const isWorkshopForm =
      !isQuizDiagnostic &&
      (data.source === 'workshop-waitlist' || (data.name && data.email && data.painPoint));

    let sheet;
    let sheetName;

    if (isQuizDiagnostic) {
      sheetName = '2分鐘AI診斷';
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);

      const headers = [
        'Timestamp (HKT)', 'Name', 'Country Code', 'Contact', 'Contact Type',
        'AI Profile', 'Recommended Workshop', 'Scores', 'Page'
      ];

      const hkTime = formatHkTime_(data.timestamp);
      appendObjectRow_(sheet, headers, {
        'Timestamp (HKT)': hkTime,
        'Name': data.name || '',
        'Country Code': data.countryCode ? ("'" + data.countryCode) : '',
        'Contact': sheetPlainTextCell_(data.contact || ''),
        'Contact Type': data.contactType || '',
        'AI Profile': data.profile || '',
        'Recommended Workshop': data.recommendedWorkshop || '',
        'Scores': data.scores || '',
        'Page': data.page || '2分鐘AI診斷'
      });

    } else if (isConsultationForm) {
      sheetName = CONSULTATION_SHEET_NAME;
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);

      const hkTime = formatHkTime_(data.timestamp);
      const aiTopicsStr = valueToCell_(data.aiTopics);
      const currentAIToolsStr = valueToCell_(data.currentAITools);

      const headers = [
        'Timestamp', 'Name', 'Phone', 'Email', 'IG Account', 'AI Skill Level',
        'AI Goal (90 days)', 'Current AI Tools', 'Current AI Tools Other',
        'Success Outcome', 'Current Problem', 'Start Timing', 'Willingness to Pay',
        'Why Now', 'Workshop Interest', 'AI Topics', 'AI Topics Other',
        'Additional Info', 'WhatsApp Consent', 'Page', 'Submission Date'
      ];

      const values = {
        'Timestamp': hkTime,
        'Name': data.name || '',
        'Phone': sheetPlainTextCell_(data.phone || ''),
        'Email': data.email || '',
        'IG Account': sheetPlainTextCell_(data.igAccount || ''),
        'AI Skill Level': data.aiSkillLevel || '',
        'AI Goal (90 days)': data.aiGoal || '',
        'Current AI Tools': currentAIToolsStr,
        'Current AI Tools Other': data.currentAIToolsOtherText || '',
        'Success Outcome': data.successOutcome || '',
        'Current Problem': data.currentProblem || '',
        'Start Timing': data.startTiming || '',
        'Willingness to Pay': data.willingnessToPay || '',
        'Why Now': data.whyNow || '',
        'Workshop Interest': data.workshopInterest || '',
        'AI Topics': aiTopicsStr,
        'AI Topics Other': data.aiTopicsOtherText || '',
        'Additional Info': data.additionalInfo || '',
        'WhatsApp Consent': data.whatsappConsent || '',
        'Page': data.page || 'IG獲客諮詢表單',
        'Submission Date': hkTime
      };

      const customAnswers = data.customAnswers || {};
      const customLabels = data.customAnswerLabels || {};

      Object.keys(customAnswers).forEach(function(key) {
        const label = customLabels[key] || key;
        const header = 'Custom: ' + label + ' [' + key + ']';
        headers.push(header);
        values[header] = valueToCell_(customAnswers[key]);
      });

      headers.push('Custom answers (JSON)');
      try {
        values['Custom answers (JSON)'] = JSON.stringify({
          answers: customAnswers,
          labels: customLabels
        });
      } catch (error) {
        values['Custom answers (JSON)'] = '';
      }

      appendObjectRow_(sheet, headers, values);

    } else if (isEmailForm) {
      sheetName = 'AIFlowTime Leads';
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);

      const hkTime = formatHkTime_(data.timestamp);
      appendObjectRow_(sheet, ['Timestamp', 'Name', 'WhatsApp', 'Page', 'Submission Date'], {
        'Timestamp': hkTime,
        'Name': data.name || '',
        'WhatsApp': sheetPlainTextCell_(data.whatsapp || ''),
        'Page': data.page || '',
        'Submission Date': hkTime
      });

    } else if (isWorkshopForm) {
      sheetName = 'AI 新手工作坊等候名單';
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);

      const hkTime = formatHkTime_(data.timestamp);
      appendObjectRow_(sheet, [
        'Timestamp', 'Name', 'Email', 'WhatsApp', 'Workshop/Event',
        'Pain Point', 'Page', 'Submission Date (HKT)'
      ], {
        'Timestamp': hkTime,
        'Name': data.name || '',
        'Email': data.email || '',
        'WhatsApp': sheetPlainTextCell_(data.whatsapp || ''),
        'Workshop/Event': data.workshopEvent || '',
        'Pain Point': data.painPoint || '',
        'Page': data.page || 'AI 新手工作坊',
        'Submission Date (HKT)': hkTime
      });

    } else {
      sheetName = 'Other Submissions';
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);

      const hkTime = formatHkTime_(data.timestamp);
      appendObjectRow_(sheet, ['Timestamp', 'Data', 'Page', 'Submission Date'], {
        'Timestamp': hkTime,
        'Data': JSON.stringify(data),
        'Page': data.page || 'Unknown',
        'Submission Date': hkTime
      });
    }

    Logger.log('Data saved successfully to sheet: ' + sheetName);
    Logger.log('Spreadsheet URL: ' + ss.getUrl());

    return jsonResponse_({
      status: 'success',
      message: 'Data saved successfully',
      sheetName: sheetName,
      spreadsheetUrl: ss.getUrl()
    });

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);

    return jsonResponse_({
      status: 'error',
      message: error.toString(),
      stack: error.stack
    });
  }
}

function testDoPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        formType: 'consultation',
        name: 'Test User',
        phone: '+852 1234 5678',
        email: 'test@example.com',
        aiGoal: '測試 AI 目標',
        currentProblem: '測試問題',
        customAnswers: {
          custom_test_1: '這是自訂題答案',
          custom_test_2: ['選項 A', '選項 B']
        },
        customAnswerLabels: {
          custom_test_1: '自訂短答題',
          custom_test_2: '自訂多選題'
        },
        timestamp: new Date().toISOString(),
        page: 'Test Consultation'
      })
    }
  };

  const result = doPost(testData);
  Logger.log(result.getContent());
}
