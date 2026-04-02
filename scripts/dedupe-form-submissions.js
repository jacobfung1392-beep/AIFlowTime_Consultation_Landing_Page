/**
 * Cleanup helper: remove duplicate formSubmissions created by overlapping backfills.
 *
 * Current rule:
 * - Keep consultation docs sourced from Firestore `consultations`
 * - Delete sheet-imported consultation docs that match the same lead
 *
 * Usage:
 *   node scripts/dedupe-form-submissions.js
 */

const {
  buildConsultationDedupeKey,
  initAdmin,
} = require('./form-submission-backfill-utils');

async function main() {
  const { db } = initAdmin();
  const snap = await db.collection('formSubmissions').where('formType', '==', 'consultation').get();
  const canonicalKeys = new Set();
  const duplicateDocIds = [];
  const seenSheetKeys = new Set();

  snap.forEach((doc) => {
    const data = doc.data() || {};
    if ((data.sourceCollection || '') === 'consultations') {
      canonicalKeys.add(buildConsultationDedupeKey(data));
    }
  });

  snap.forEach((doc) => {
    const data = doc.data() || {};
    if ((data.sheetTab || '') !== '1 on 1 Consultation') return;
    if ((data.importSource || '') !== 'backfill-sheet') return;
    const key = buildConsultationDedupeKey(data);
    if (canonicalKeys.has(key) || seenSheetKeys.has(key)) {
      duplicateDocIds.push(doc.id);
      return;
    }
    seenSheetKeys.add(key);
  });

  if (!duplicateDocIds.length) {
    console.log('No duplicate consultation formSubmissions found.');
    return;
  }

  console.log(`Deleting ${duplicateDocIds.length} duplicate consultation docs...`);
  for (let i = 0; i < duplicateDocIds.length; i += 400) {
    const batch = db.batch();
    duplicateDocIds.slice(i, i + 400).forEach((docId) => {
      batch.delete(db.collection('formSubmissions').doc(docId));
    });
    await batch.commit();
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
