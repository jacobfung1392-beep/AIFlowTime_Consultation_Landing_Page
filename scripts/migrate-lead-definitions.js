#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { initAdmin } = require('./form-submission-backfill-utils');

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const docArg = args.find((arg) => arg.startsWith('--doc='));
const docFilter = docArg ? trim(docArg.split('=').slice(1).join('=')) : '';

const LEAD_TYPES = [
  'quiz-lead',
  'consultation',
  'workshop-waitlist',
  'free-material',
  'lead-magnet',
];

function trim(value) {
  return String(value == null ? '' : value).trim();
}

function deepClone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeLeadDocuments(list) {
  const docs = [];
  if (!Array.isArray(list)) return docs;
  list.forEach((item) => {
    if (!item) return;
    const url = trim(item.url || item.href || '');
    if (!url) return;
    docs.push({
      name: trim(item.name || item.fileName || url.split('/').pop() || 'document'),
      url,
      fileName: trim(item.fileName || item.name || ''),
    });
  });
  return docs;
}

function normalizeLeadFormFields(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      label: trim(item && item.label),
      type: trim((item && item.type) || 'text') || 'text',
    }))
    .filter((item) => item.label);
}

function getLeadTypeLabel(type) {
  switch (trim(type)) {
    case 'quiz-lead':
      return 'Quiz Leads';
    case 'consultation':
      return 'Consultation';
    case 'workshop-waitlist':
      return 'Workshop Waitlist';
    case 'free-material':
      return 'Free Material';
    case 'lead-magnet':
      return 'Lead Magnet';
    default:
      return trim(type) || 'Lead';
  }
}

function createLeadDefinitionDefaults(type) {
  let normalizedType = trim(type || 'lead-magnet');
  if (!LEAD_TYPES.includes(normalizedType)) normalizedType = 'lead-magnet';
  const base = {
    name: '',
    type: normalizedType,
    status: 'active',
    publicEnabled: true,
    title: '',
    description: '',
    imageUrl: '',
    imageAlt: '',
    redirectUrl: '',
    submitText: normalizedType === 'free-material' ? '立即寄送' : '提交',
    sectionLabel: '',
    ctaText: normalizedType === 'free-material' ? '領取免費資料' : '',
    materialTitle: '',
    emailSubject: '',
    documents: [],
    pdfUrl: '',
    fileName: '',
    deliveryMode: 'auto',
    nameFieldLabel: '姓名',
    emailFieldLabel: 'Email',
    consentText: '',
    successMessage: '',
    helperNote: '',
    purposeNotes: '',
    formFields: normalizedType === 'lead-magnet'
      ? [{ label: '姓名', type: 'text' }, { label: 'WhatsApp / Email', type: 'text' }]
      : [],
  };
  if (normalizedType === 'workshop-waitlist') {
    base.submitText = '加入等候名單';
  } else if (normalizedType === 'consultation') {
    base.submitText = '提交申請';
  } else if (normalizedType === 'quiz-lead') {
    base.submitText = '查看結果';
  }
  return base;
}

function normalizeLeadDefinition(raw, opts) {
  raw = raw || {};
  opts = opts || {};
  let type = trim(raw.type || opts.type || 'lead-magnet');
  if (!LEAD_TYPES.includes(type)) type = 'lead-magnet';
  const next = createLeadDefinitionDefaults(type);
  Object.keys(raw).forEach((key) => {
    if (raw[key] === undefined) return;
    next[key] = deepClone(raw[key]);
  });
  next.id = trim(opts.id || raw.id || '');
  next.type = type;
  next.name = trim(next.name);
  next.status = ['active', 'draft', 'archived'].includes(trim(next.status || 'active'))
    ? trim(next.status || 'active')
    : 'active';
  next.publicEnabled = next.publicEnabled !== false;
  next.title = String(next.title || '');
  next.description = String(next.description || '');
  next.imageUrl = trim(next.imageUrl);
  next.imageAlt = trim(next.imageAlt);
  next.redirectUrl = trim(next.redirectUrl);
  next.submitText = trim(next.submitText || createLeadDefinitionDefaults(type).submitText);
  next.sectionLabel = String(next.sectionLabel || '');
  next.ctaText = trim(next.ctaText);
  next.materialTitle = String(next.materialTitle || '');
  next.emailSubject = String(next.emailSubject || '');
  next.deliveryMode = ['auto', 'attachment', 'link'].includes(trim(next.deliveryMode || 'auto'))
    ? trim(next.deliveryMode || 'auto')
    : 'auto';
  next.nameFieldLabel = trim(next.nameFieldLabel || '姓名');
  next.emailFieldLabel = trim(next.emailFieldLabel || 'Email');
  next.consentText = String(next.consentText || '');
  next.successMessage = String(next.successMessage || '');
  next.helperNote = String(next.helperNote || '');
  next.purposeNotes = String(next.purposeNotes || '');
  next.formFields = normalizeLeadFormFields(next.formFields);
  next.documents = normalizeLeadDocuments(next.documents);
  next.pdfUrl = trim(next.pdfUrl);
  next.fileName = trim(next.fileName);
  if (!next.documents.length && next.pdfUrl) {
    next.documents = [{
      name: next.fileName || next.pdfUrl.split('/').pop() || 'document',
      url: next.pdfUrl,
      fileName: next.fileName || '',
    }];
  }
  if (!next.pdfUrl && next.documents.length) next.pdfUrl = next.documents[0].url || '';
  if (!next.fileName && next.documents.length) {
    next.fileName = next.documents[0].fileName || next.documents[0].name || '';
  }
  return next;
}

function leadDefinitionDisplayName(definition) {
  const name = trim(definition && definition.name);
  if (name) return name;
  const title = stripHtml(definition && definition.title);
  if (title) return title;
  return getLeadTypeLabel(definition && definition.type);
}

function migrationSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function migrationDocId(layoutId, sectionId, itemKey, type) {
  const joined = ['lead', type, layoutId, sectionId, itemKey]
    .map(migrationSlug)
    .filter(Boolean)
    .join('-');
  return joined || ('lead-' + Date.now());
}

function hasInlineFreeMaterial(content) {
  return !!(
    trim(content && content.title) ||
    trim(content && content.description) ||
    trim(content && content.imageUrl) ||
    (Array.isArray(content && content.documents) && content.documents.length) ||
    trim(content && content.pdfUrl)
  );
}

function buildLinkLeadDefinition(layoutId, sectionId, linkIndex, link) {
  const popup = (link && link.leadMagnet) || {};
  const defId = migrationDocId(layoutId, sectionId, 'link-' + linkIndex, 'lead-magnet');
  const payload = normalizeLeadDefinition({
    id: defId,
    name: stripHtml(popup.title || link.label || ('Lead Magnet ' + (linkIndex + 1))),
    type: 'lead-magnet',
    status: 'active',
    publicEnabled: true,
    title: popup.title || link.label || '',
    description: popup.description || link.description || '',
    imageUrl: popup.imageUrl || link.imageUrl || '',
    submitText: popup.submitText || '提交',
    redirectUrl: popup.redirectUrl || (trim(link.url) !== '#' ? trim(link.url) : ''),
    formFields: Array.isArray(popup.formFields) ? popup.formFields : [],
    purposeNotes: 'Migrated from page layout "' + layoutId + '" / section "' + sectionId + '" / link "' + (link.label || ('Link ' + (linkIndex + 1))) + '".',
  }, { id: defId, type: 'lead-magnet' });
  return {
    id: defId,
    data: payload,
    displayName: leadDefinitionDisplayName(payload),
  };
}

function buildFreeMaterialLeadDefinition(layoutId, sectionId, content) {
  const defId = migrationDocId(layoutId, sectionId, 'free-material', 'free-material');
  const payload = normalizeLeadDefinition({
    id: defId,
    name: stripHtml((content && (content.materialTitle || content.title)) || ('Free Material ' + layoutId)),
    type: 'free-material',
    status: 'active',
    publicEnabled: true,
    title: (content && content.title) || '',
    description: (content && content.description) || '',
    imageUrl: (content && content.imageUrl) || '',
    imageAlt: (content && content.imageAlt) || '',
    redirectUrl: (content && content.redirectUrl) || '',
    submitText: (content && content.submitText) || '立即寄送',
    sectionLabel: (content && content.sectionLabel) || '',
    ctaText: (content && content.ctaText) || '',
    materialTitle: (content && (content.materialTitle || content.title)) || '',
    emailSubject: (content && content.emailSubject) || '',
    documents: Array.isArray(content && content.documents) ? content.documents : [],
    pdfUrl: (content && content.pdfUrl) || '',
    fileName: (content && content.fileName) || '',
    deliveryMode: (content && content.deliveryMode) || 'auto',
    nameFieldLabel: (content && content.nameFieldLabel) || '姓名',
    emailFieldLabel: (content && content.emailFieldLabel) || 'Email',
    consentText: (content && content.consentText) || '',
    successMessage: (content && content.successMessage) || '',
    helperNote: (content && content.helperNote) || '',
    purposeNotes: 'Migrated from page layout "' + layoutId + '" / section "' + sectionId + '".',
  }, { id: defId, type: 'free-material' });
  return {
    id: defId,
    data: payload,
    displayName: leadDefinitionDisplayName(payload),
  };
}

function planLayoutMigration(docId, data) {
  const sections = Array.isArray(data && data.sections) ? deepClone(data.sections) : [];
  const plannedLeadDefinitions = [];
  const changes = [];
  let changed = false;

  sections.forEach((section, sectionIndex) => {
    if (!section || !section.content) return;
    const sectionId = trim(section.id) || ('section-' + sectionIndex);

    if (section.type === 'link-list' && Array.isArray(section.content.links)) {
      section.content.links.forEach((link, linkIndex) => {
        if (!link || trim(link.leadDefinitionId)) return;
        const popup = link.leadMagnet || {};
        const enabled = popup.enabled === true || String(popup.enabled || '').toLowerCase() === 'true';
        if (!enabled) return;

        const planned = buildLinkLeadDefinition(docId, sectionId, linkIndex, link);
        plannedLeadDefinitions.push(planned);
        link.leadDefinitionId = planned.id;
        link.leadDefinitionType = 'lead-magnet';
        link.leadDefinitionName = planned.displayName;
        changes.push({
          kind: 'lead-magnet',
          sectionId,
          linkIndex,
          leadDefinitionId: planned.id,
          label: trim(link.label) || ('Link ' + (linkIndex + 1)),
        });
        changed = true;
      });
      return;
    }

    if (section.type === 'free-material-download') {
      if (trim(section.content.leadDefinitionId)) return;
      if (!hasInlineFreeMaterial(section.content)) return;

      const planned = buildFreeMaterialLeadDefinition(docId, sectionId, section.content);
      plannedLeadDefinitions.push(planned);
      section.content.leadDefinitionId = planned.id;
      section.content.leadDefinitionType = 'free-material';
      section.content.leadDefinitionName = planned.displayName;
      changes.push({
        kind: 'free-material',
        sectionId,
        leadDefinitionId: planned.id,
        label: trim(section.content.materialTitle || section.content.title) || 'Free Material',
      });
      changed = true;
    }
  });

  return {
    changed,
    sections,
    plannedLeadDefinitions,
    changes,
  };
}

async function loadCandidateDocs(db) {
  if (docFilter) {
    const snap = await db.collection('pageLayouts').doc(docFilter).get();
    if (!snap.exists) throw new Error('No pageLayouts document found for --doc=' + docFilter);
    return [{
      id: snap.id,
      data: snap.data() || {},
      migration: planLayoutMigration(snap.id, snap.data() || {}),
    }];
  }

  const snapshot = await db.collection('pageLayouts').get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() || {},
    migration: planLayoutMigration(doc.id, doc.data() || {}),
  }));
}

function logPlan(changedDocs) {
  if (!changedDocs.length) {
    console.log('No lead definition backfill changes needed.');
    return;
  }

  console.log('Lead definition migration candidates:');
  changedDocs.forEach((entry) => {
    console.log('\n- ' + entry.id);
    entry.migration.changes.forEach((change) => {
      console.log(
        '  * ' + change.kind +
        ' / ' + change.sectionId +
        (change.linkIndex != null ? ' / link-' + change.linkIndex : '') +
        '\n    label: ' + JSON.stringify(change.label) +
        '\n    leadDefinitionId: ' + change.leadDefinitionId
      );
    });
  });

  const totalDefs = changedDocs.reduce((sum, entry) => sum + entry.migration.plannedLeadDefinitions.length, 0);
  console.log('\nSummary: ' + changedDocs.length + ' layout(s), ' + totalDefs + ' lead definition(s).');
}

async function applyPlan(db, changedDocs) {
  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, 'lead-definition-migration-' + stamp + '.json');
  const backupPayload = changedDocs.map((entry) => ({
    id: entry.id,
    original: entry.data,
    plannedLeadDefinitions: entry.migration.plannedLeadDefinitions,
    changes: entry.migration.changes,
  }));
  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2));

  let createdDefinitions = 0;
  let updatedDefinitions = 0;

  for (const entry of changedDocs) {
    for (const planned of entry.migration.plannedLeadDefinitions) {
      const ref = db.collection('leadDefinitions').doc(planned.id);
      const existing = await ref.get();
      const payload = Object.assign({}, planned.data, {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      if (!existing.exists) {
        payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
        createdDefinitions += 1;
      } else {
        updatedDefinitions += 1;
      }
      await ref.set(payload, { merge: true });
    }

    await db.collection('pageLayouts').doc(entry.id).set({
      sections: entry.migration.sections,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'cursor-lead-definition-migration',
    }, { merge: true });
  }

  console.log('\nApplied lead definition migration successfully.');
  console.log('Created definitions: ' + createdDefinitions);
  console.log('Updated definitions: ' + updatedDefinitions);
  console.log('Updated layouts: ' + changedDocs.length);
  console.log('Backup written to: ' + backupPath);
}

async function main() {
  const { db } = initAdmin();
  const docs = await loadCandidateDocs(db);
  const changedDocs = docs.filter((entry) => entry.migration && entry.migration.changed);

  logPlan(changedDocs);
  if (!changedDocs.length) return;

  if (!shouldApply) {
    console.log('\nDry run only. Re-run with --apply to write these exact changes.');
    return;
  }

  await applyPlan(db, changedDocs);
}

main().catch((err) => {
  console.error('Lead definition migration failed:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
