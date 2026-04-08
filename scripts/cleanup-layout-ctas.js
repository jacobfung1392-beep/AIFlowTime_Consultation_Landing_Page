#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { initAdmin } = require('./form-submission-backfill-utils');

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const docArg = args.find((arg) => arg.startsWith('--doc='));
const docFilter = docArg ? String(docArg.split('=').slice(1).join('=') || '').trim() : '';

function trim(value) {
  return String(value == null ? '' : value).trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildWorkshopPaymentLink(workshopId) {
  const wsId = trim(workshopId);
  if (!wsId) return '';
  return '/workshop-payment?id=' + encodeURIComponent(wsId);
}

function isClearlyBrokenPaymentLink(url) {
  const raw = trim(url);
  return !raw || raw === '#' || /^\/workshop-payment(?:\?id(?:=)?)?$/i.test(raw);
}

function pageHasVisibleSectionType(sections, type) {
  return (Array.isArray(sections) ? sections : []).some((section) => {
    return section && section.type === type && section.visible !== false;
  });
}

function inferWorkshopId(docId, sections) {
  const fromLogistics = (Array.isArray(sections) ? sections : []).find((section) => {
    return section && section.type === 'logistics-card' && section.content && trim(section.content.workshopId);
  });
  if (fromLogistics) return trim(fromLogistics.content.workshopId);
  if (docId === 'workshop-0') return 'workshop-0';
  if (docId === 'workshop-c') return 'workshop-c';
  return '';
}

function maybeRecordChange(changes, section, fieldPath, before, after, reason) {
  if (before === after) return;
  changes.push({
    sectionId: trim(section && section.id) || '(no-id)',
    sectionType: trim(section && section.type) || '(no-type)',
    field: fieldPath,
    before,
    after,
    reason,
  });
}

function cleanupHeroContent(docId, section, sections, changes) {
  const content = section && section.content ? section.content : {};
  const workshopId = inferWorkshopId(docId, sections);
  const paymentLink = buildWorkshopPaymentLink(workshopId);
  if (!paymentLink) return false;

  let changed = false;
  const actionId = trim(content.ctaActionId);
  if (actionId === 'go-to-payment' && isClearlyBrokenPaymentLink(content.ctaLink)) {
    const before = trim(content.ctaLink);
    content.ctaLink = paymentLink;
    maybeRecordChange(changes, section, 'content.ctaLink', before, content.ctaLink, 'repair broken hero payment CTA');
    changed = true;
  }

  if (Array.isArray(content.buttonOptions) && content.buttonOptions.length) {
    content.buttonOptions = content.buttonOptions.map((option, idx) => {
      const next = Object.assign({}, option || {});
      if (trim(next.id) === 'go-to-payment' && isClearlyBrokenPaymentLink(next.url)) {
        const before = trim(next.url);
        next.url = paymentLink;
        maybeRecordChange(changes, section, 'content.buttonOptions[' + idx + '].url', before, next.url, 'repair broken hero action library payment URL');
        changed = true;
      }
      return next;
    });
  }

  return changed;
}

function cleanupLogisticsContent(docId, section, sections, changes) {
  const content = section && section.content ? section.content : {};
  const workshopId = trim(content.workshopId) || inferWorkshopId(docId, sections);
  const paymentLink = buildWorkshopPaymentLink(workshopId);
  if (!paymentLink) return false;
  if (!isClearlyBrokenPaymentLink(content.ctaLink)) return false;
  const before = trim(content.ctaLink);
  content.ctaLink = paymentLink;
  maybeRecordChange(changes, section, 'content.ctaLink', before, content.ctaLink, 'repair broken logistics CTA');
  return before !== content.ctaLink;
}

function cleanupFinalCtaContent(section, sections, changes) {
  const content = section && section.content ? section.content : {};
  const hasWorkshops = pageHasVisibleSectionType(sections, 'workshops');
  const raw = trim(content.ctaLink);
  const resolved = !raw
    ? (hasWorkshops ? '#workshops' : '/workshops')
    : (raw === '#workshops' && !hasWorkshops ? '/workshops' : raw);
  if (raw === resolved) return false;
  content.ctaLink = resolved;
  maybeRecordChange(changes, section, 'content.ctaLink', raw, resolved, hasWorkshops ? 'fill empty workshops CTA anchor' : 'replace dead workshops anchor with catalog URL');
  return true;
}

function cleanupLayoutDoc(docId, data) {
  const sections = Array.isArray(data && data.sections) ? clone(data.sections) : [];
  const changes = [];
  let changed = false;

  sections.forEach((section) => {
    if (!section || !section.content) return;
    if (section.type === 'hero') {
      if (cleanupHeroContent(docId, section, sections, changes)) changed = true;
      return;
    }
    if (section.type === 'logistics-card') {
      if (cleanupLogisticsContent(docId, section, sections, changes)) changed = true;
      return;
    }
    if (section.type === 'final-cta') {
      if (cleanupFinalCtaContent(section, sections, changes)) changed = true;
    }
  });

  return { changed, sections, changes };
}

async function main() {
  const { db } = initAdmin();
  let query = db.collection('pageLayouts');
  if (docFilter) {
    const snap = await db.collection('pageLayouts').doc(docFilter).get();
    if (!snap.exists) {
      throw new Error('No pageLayouts document found for --doc=' + docFilter);
    }
    query = null;
    const result = cleanupLayoutDoc(snap.id, snap.data() || {});
    await reportAndMaybeApply(db, [{ id: snap.id, data: snap.data() || {}, cleanup: result }]);
    return;
  }

  const snapshot = await query.get();
  const docs = snapshot.docs.map((doc) => {
    return {
      id: doc.id,
      data: doc.data() || {},
      cleanup: cleanupLayoutDoc(doc.id, doc.data() || {}),
    };
  });
  await reportAndMaybeApply(db, docs);
}

async function reportAndMaybeApply(db, docs) {
  const changedDocs = docs.filter((entry) => entry.cleanup && entry.cleanup.changed);
  if (!changedDocs.length) {
    console.log('No CTA cleanup changes needed.');
    return;
  }

  console.log('CTA cleanup candidates:');
  changedDocs.forEach((entry) => {
    console.log('\n- ' + entry.id);
    entry.cleanup.changes.forEach((change) => {
      console.log(
        '  * ' + change.sectionType + ' / ' + change.sectionId + ' / ' + change.field +
        '\n    before: ' + JSON.stringify(change.before) +
        '\n    after:  ' + JSON.stringify(change.after) +
        '\n    reason: ' + change.reason
      );
    });
  });

  console.log('\nSummary: ' + changedDocs.length + ' document(s), ' + changedDocs.reduce((sum, entry) => sum + entry.cleanup.changes.length, 0) + ' field update(s).');

  if (!shouldApply) {
    console.log('\nDry run only. Re-run with --apply to write these exact changes.');
    return;
  }

  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, 'layout-cta-cleanup-' + stamp + '.json');
  const backupPayload = changedDocs.map((entry) => ({
    id: entry.id,
    original: entry.data,
    changes: entry.cleanup.changes,
  }));
  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2));

  const batch = db.batch();
  changedDocs.forEach((entry) => {
    const ref = db.collection('pageLayouts').doc(entry.id);
    batch.set(ref, {
      sections: entry.cleanup.sections,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'cursor-layout-cta-cleanup',
    }, { merge: true });
  });
  await batch.commit();

  console.log('\nApplied CTA cleanup successfully.');
  console.log('Backup written to: ' + backupPath);
}

main().catch((err) => {
  console.error('CTA cleanup failed:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
