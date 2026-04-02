/**
 * One-time backfill: existing Firestore lead collections -> formSubmissions
 *
 * Usage:
 *   node scripts/backfill-form-submissions-from-firestore.js
 *
 * Optional:
 *   FORM_SUBMISSIONS_IMPORTED_STATUS=archived node scripts/backfill-form-submissions-from-firestore.js
 */

const {
  buildConsultationImport,
  buildFreeMaterialImport,
  buildQuizImport,
  initAdmin,
} = require('./form-submission-backfill-utils');

const COLLECTIONS = [
  {
    name: 'consultations',
    transform: (docId, data) => buildConsultationImport(docId, data, {
      sourceCollection: 'consultations',
      importSource: 'backfill-firestore',
      sheetTab: '1 on 1 Consultation',
    }),
  },
  {
    name: 'quizLeads',
    transform: (docId, data) => buildQuizImport(docId, data, {
      sourceCollection: 'quizLeads',
      importSource: 'backfill-firestore',
      sheetTab: 'Other Submissions',
    }),
  },
  {
    name: 'freeMaterialLeads',
    transform: (docId, data) => buildFreeMaterialImport(docId, data, {
      sourceCollection: 'freeMaterialLeads',
      importSource: 'backfill-firestore',
    }),
  },
];

async function commitChunk(db, docs) {
  if (!docs.length) return;
  const batch = db.batch();
  const target = db.collection('formSubmissions');
  docs.forEach((item) => {
    batch.set(target.doc(item.docId), item.docData, { merge: true });
  });
  await batch.commit();
}

async function migrateCollection(db, spec) {
  const snap = await db.collection(spec.name).get();
  let imported = 0;
  let skipped = 0;
  let chunk = [];

  console.log(`\n[${spec.name}] found ${snap.size} source docs`);

  snap.forEach((doc) => {
    try {
      const transformed = spec.transform(doc.id, doc.data() || {});
      if (!transformed || !transformed.docId || !transformed.docData) {
        skipped += 1;
        return;
      }
      chunk.push(transformed);
      imported += 1;
    } catch (err) {
      skipped += 1;
      console.warn(`[${spec.name}] skipped ${doc.id}: ${err.message}`);
    }
  });

  for (let i = 0; i < chunk.length; i += 400) {
    await commitChunk(db, chunk.slice(i, i + 400));
  }

  console.log(`[${spec.name}] imported ${imported}, skipped ${skipped}`);
  return { imported, skipped };
}

async function main() {
  const { db } = initAdmin();
  let totalImported = 0;
  let totalSkipped = 0;

  for (const spec of COLLECTIONS) {
    const result = await migrateCollection(db, spec);
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
