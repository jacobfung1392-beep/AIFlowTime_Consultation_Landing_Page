/**
 * One-time backfill: Google Sheets tabs -> formSubmissions
 *
 * Usage:
 *   node scripts/backfill-form-submissions-from-sheets.js
 *
 * Optional:
 *   AIFLOWTIME_SPREADSHEET_ID=... node scripts/backfill-form-submissions-from-sheets.js
 *   FORM_SUBMISSIONS_IMPORTED_STATUS=archived node scripts/backfill-form-submissions-from-sheets.js
 */

const {
  buildConsultationImport,
  buildConsultationDedupeKey,
  buildLeadMagnetImport,
  buildSheetImportId,
  buildWorkshopWaitlistImport,
  cleanString,
  getSheetClient,
  inferImportFromPayload,
  initAdmin,
  parseJsonCell,
} = require('./form-submission-backfill-utils');

const SPREADSHEET_ID = process.env.AIFLOWTIME_SPREADSHEET_ID || '1_WW7PTjYibD4G8l-E7-dtJVr9eaKq7CqeLb6a0iTeBA';
const EXISTING_CONSULTATION_KEYS = new Set();

const SHEET_SPECS = [
  {
    name: 'AIFlowTime Leads',
    range: 'A:E',
    optional: false,
    transform(row, rowNumber) {
      const get = (i) => cleanString(row[i]);
      const rowKey = ['lead', get(0), get(1), get(2), get(3)].join('|');
      return buildLeadMagnetImport('', {
        timestamp: get(0),
        name: get(1),
        whatsapp: get(2),
        page: get(3),
        source: 'sheet-lead-magnet',
      }, {
        docId: buildSheetImportId('AIFlowTime Leads', rowKey),
        sheetTab: 'AIFlowTime Leads',
        sheetRowKey: rowKey,
        importSource: 'backfill-sheet',
      });
    },
  },
  {
    name: 'Workshops',
    range: 'A:H',
    optional: false,
    transform(row, rowNumber) {
      const get = (i) => cleanString(row[i]);
      const rowKey = ['workshop', get(0), get(1), get(2), get(3), get(4), get(6)].join('|');
      return buildWorkshopWaitlistImport('', {
        timestamp: get(0),
        name: get(1),
        email: get(2),
        whatsapp: get(3),
        workshopEvent: get(4),
        painPoint: get(5),
        page: get(6),
        source: 'workshop-waitlist',
      }, {
        docId: buildSheetImportId('Workshops', rowKey),
        sheetTab: 'Workshops',
        sheetRowKey: rowKey,
        importSource: 'backfill-sheet',
      });
    },
  },
  {
    name: '1 on 1 Consultation',
    range: 'A:T',
    optional: false,
    transform(row, rowNumber) {
      const get = (i) => cleanString(row[i]);
      const rowKey = ['consultation', get(0), get(1), get(2), get(3), get(18)].join('|');
      const dedupeKey = buildConsultationDedupeKey({
        timestamp: get(0),
        name: get(1),
        phone: get(2),
        email: get(3),
        page: get(18),
      });
      if (EXISTING_CONSULTATION_KEYS.has(dedupeKey)) {
        return null;
      }
      return buildConsultationImport('', {
        timestamp: get(0),
        name: get(1),
        phone: get(2),
        email: get(3),
        igAccount: get(4),
        aiSkillLevel: get(5),
        aiGoal: get(6),
        currentAITools: get(7),
        currentAIToolsOtherText: get(8),
        successOutcome: get(9),
        currentProblem: get(10),
        startTiming: get(11),
        willingnessToPay: get(12),
        whyNow: get(13),
        workshopInterest: get(14),
        aiTopics: get(15),
        aiTopicsOtherText: get(16),
        additionalInfo: get(17),
        page: get(18),
      }, {
        docId: buildSheetImportId('1 on 1 Consultation', rowKey),
        sourceCollection: '',
        sheetTab: '1 on 1 Consultation',
        sheetRowKey: rowKey,
        importSource: 'backfill-sheet',
      });
    },
  },
  {
    name: 'Other Submissions',
    range: 'A:D',
    optional: true,
    transform(row, rowNumber) {
      const get = (i) => cleanString(row[i]);
      const payload = parseJsonCell(get(1)) || { rawData: get(1) };
      if (!payload.timestamp) payload.timestamp = get(0);
      if (!payload.page) payload.page = get(2);
      const rowKey = ['other', get(0), get(2), get(1)].join('|');
      return inferImportFromPayload('', payload, {
        docId: buildSheetImportId('Other Submissions', rowKey),
        sourceCollection: '',
        sheetTab: 'Other Submissions',
        sheetRowKey: rowKey,
        importSource: 'backfill-sheet',
      });
    },
  },
];

async function readSheetRows(sheets, spec) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${spec.name}'!${spec.range}`,
    });
    return res.data.values || [];
  } catch (err) {
    if (spec.optional) {
      console.warn(`[${spec.name}] skipped optional sheet: ${err.message}`);
      return [];
    }
    throw err;
  }
}

async function commitChunk(db, docs) {
  if (!docs.length) return;
  const batch = db.batch();
  const target = db.collection('formSubmissions');
  docs.forEach((item) => {
    batch.set(target.doc(item.docId), item.docData, { merge: true });
  });
  await batch.commit();
}

async function migrateSheet(db, sheets, spec) {
  const rows = await readSheetRows(sheets, spec);
  if (rows.length < 2) {
    console.log(`\n[${spec.name}] no data rows found`);
    return { imported: 0, skipped: 0 };
  }

  const dataRows = rows.slice(1);
  let imported = 0;
  let skipped = 0;
  const chunk = [];

  console.log(`\n[${spec.name}] found ${dataRows.length} data rows`);

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      const transformed = spec.transform(row, rowNumber);
      if (!transformed || !transformed.docId || !transformed.docData) {
        skipped += 1;
        return;
      }
      chunk.push(transformed);
      imported += 1;
    } catch (err) {
      skipped += 1;
      console.warn(`[${spec.name}] skipped row ${rowNumber}: ${err.message}`);
    }
  });

  for (let i = 0; i < chunk.length; i += 400) {
    await commitChunk(db, chunk.slice(i, i + 400));
  }

  console.log(`[${spec.name}] imported ${imported}, skipped ${skipped}`);
  return { imported, skipped };
}

async function main() {
  const { db, keyPath } = initAdmin();
  const sheets = await getSheetClient(keyPath);
  const consultationSnap = await db.collection('consultations').get();
  consultationSnap.forEach((doc) => {
    EXISTING_CONSULTATION_KEYS.add(buildConsultationDedupeKey(doc.data() || {}));
  });
  let totalImported = 0;
  let totalSkipped = 0;

  for (const spec of SHEET_SPECS) {
    const result = await migrateSheet(db, sheets, spec);
    totalImported += result.imported;
    totalSkipped += result.skipped;
  }

  console.log('\nDone.');
  console.log(`Imported: ${totalImported}`);
  console.log(`Skipped: ${totalSkipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
