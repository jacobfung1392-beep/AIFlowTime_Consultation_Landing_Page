/**
 * One-time migration: Google Sheet "1 on 1 Consultation" → Firestore consultations
 *
 * SETUP (run once):
 * 1. Google Cloud Console (same project as Firebase: aiflowtime-hk):
 *    - Enable "Google Sheets API": https://console.cloud.google.com/apis/library/sheets.googleapis.com
 * 2. Firebase Console → Project Settings → Service accounts → "Generate new private key"
 *    - Save the JSON file as: service-account.json (in project root)
 *    - Or set env: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 * 3. Share the Google Sheet with the service account email (from the JSON, field "client_email"):
 *    - Open https://docs.google.com/spreadsheets/d/1_WW7PTjYibD4G8l-E7-dtJVr9eaKq7CqeLb6a0iTeBA/edit
 *    - Share → add the service account email (e.g. ...@aiflowtime-hk.iam.gserviceaccount.com) as Viewer
 * 4. Install deps: npm install
 * 5. Run: node scripts/migrate-consultations-from-sheet.js
 *
 * Migrated rows get status: 'completed' (change MIGRATED_STATUS below if you want 'new').
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const { google } = require('googleapis');

const SPREADSHEET_ID = '1_WW7PTjYibD4G8l-E7-dtJVr9eaKq7CqeLb6a0iTeBA';
const SHEET_NAME = '1 on 1 Consultation';
const MIGRATED_STATUS = 'completed'; // or 'new'

function getKeyPath() {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '..', 'service-account.json');
}

function ensureKeyFile() {
  const keyPath = getKeyPath();
  if (!fs.existsSync(keyPath)) {
    console.error('\nMissing service account key file.\n');
    console.error('Do these 3 steps first (one-time setup):\n');
    console.error('1. Enable Google Sheets API');
    console.error('   → https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=aiflowtime-hk');
    console.error('   Click "Enable" if it says "Enable API".\n');
    console.error('2. Download the key file');
    console.error('   → https://console.firebase.google.com/project/aiflowtime-hk/settings/serviceaccounts/adminsdk');
    console.error('   Click "Generate new private key" → Save the JSON file.');
    console.error('   Rename it to: service-account.json');
    console.error('   Put it in your project root (same folder as package.json).\n');
    console.error('3. Share your Google Sheet with the service account');
    console.error('   Open the downloaded JSON, copy the "client_email" value (looks like xxx@aiflowtime-hk.iam.gserviceaccount.com).');
    console.error('   → https://docs.google.com/spreadsheets/d/1_WW7PTjYibD4G8l-E7-dtJVr9eaKq7CqeLb6a0iTeBA/edit');
    console.error('   Click Share → paste that email → give "Viewer" → Done.\n');
    console.error('Then run this script again: node scripts/migrate-consultations-from-sheet.js\n');
    process.exit(1);
  }
  return keyPath;
}

async function getSheetClient(keyPath) {
  const key = require(keyPath);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

function parseTimestamp(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : admin.firestore.Timestamp.fromDate(d);
}

function rowToDoc(row) {
  const get = (i) => (row[i] != null ? String(row[i]).trim() : '') || '';
  const ts = parseTimestamp(row[0] || row[19]) ||
    admin.firestore.Timestamp.now();
  const currentAIToolsStr = get(7);
  const aiTopicsStr = get(15);
  return {
    name: get(1),
    phone: get(2),
    email: get(3),
    igAccount: get(4),
    aiSkillLevel: get(5),
    aiGoal: get(6),
    currentAITools: currentAIToolsStr ? currentAIToolsStr.split(/\s*,\s*/) : [],
    currentAIToolsOtherText: get(8),
    successOutcome: get(9),
    currentProblem: get(10),
    startTiming: get(11),
    willingnessToPay: get(12),
    whyNow: get(13),
    workshopInterest: get(14),
    aiTopics: aiTopicsStr ? aiTopicsStr.split(/\s*,\s*/) : [],
    aiTopicsOtherText: get(16),
    additionalInfo: get(17),
    page: get(18) || 'IG獲客諮詢表單',
    whatsappConsent: '',
    timestamp: row[0] ? String(row[0]).trim() : new Date().toISOString(),
    createdAt: ts,
    status: MIGRATED_STATUS,
  };
}

async function main() {
  const keyPath = ensureKeyFile();
  const key = require(keyPath);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(key) });
  }
  const db = admin.firestore();

  const sheets = await getSheetClient(keyPath);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:T`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) {
    console.log('No data rows in sheet (only header or empty).');
    process.exit(0);
    return;
  }
  const header = rows[0];
  const dataRows = rows.slice(1);
  console.log('Sheet headers:', header.join(' | '));
  console.log('Data rows to migrate:', dataRows.length);

  const col = db.collection('consultations');
  let count = 0;
  const BATCH_SIZE = 500;
  for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
    const chunk = dataRows.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const row of chunk) {
      const doc = rowToDoc(row);
      batch.set(col.doc(), doc);
      count++;
    }
    await batch.commit();
  }
  console.log('Migrated', count, 'rows to Firestore collection "consultations".');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
