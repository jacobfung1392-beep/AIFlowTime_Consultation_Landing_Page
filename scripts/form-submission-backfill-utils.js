const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const admin = require('firebase-admin');
const { google } = require('googleapis');

const DEFAULT_IMPORTED_STATUS = process.env.FORM_SUBMISSIONS_IMPORTED_STATUS || 'new';

function getKeyPath() {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '..', 'service-account.json');
}

function ensureKeyFile() {
  const keyPath = getKeyPath();
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      'Missing service account key file. Put service-account.json in the project root ' +
      'or set GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/key.json'
    );
  }
  return keyPath;
}

function initAdmin() {
  const keyPath = ensureKeyFile();
  const key = require(keyPath);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(key) });
  }
  return {
    admin,
    db: admin.firestore(),
    keyPath,
  };
}

async function getSheetClient(keyPath) {
  const key = require(keyPath);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

function cleanString(value) {
  return String(value == null ? '' : value).trim();
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function hasMeaningfulValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return cleanString(value) !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
}

function normalizeValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return cleanString(value);
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item)).filter((item) => hasMeaningfulValue(item));
  }
  if (isPlainObject(value)) {
    const out = {};
    Object.keys(value).forEach((key) => {
      const normalized = normalizeValue(value[key]);
      if (hasMeaningfulValue(normalized)) out[key] = normalized;
    });
    return out;
  }
  return value;
}

function flattenValues(value, bucket) {
  bucket = bucket || [];
  if (!hasMeaningfulValue(value)) return bucket;
  if (typeof value === 'string') {
    bucket.push(cleanString(value));
    return bucket;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenValues(item, bucket));
    return bucket;
  }
  if (isPlainObject(value)) {
    Object.keys(value).forEach((key) => flattenValues(value[key], bucket));
    return bucket;
  }
  bucket.push(String(value));
  return bucket;
}

function parseHongKongSheetDate(value) {
  const str = cleanString(value);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || '0');
  return new Date(Date.UTC(year, month, day, hour - 8, minute, second));
}

function toTimestamp(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value;
  if (value.toDate && typeof value.toDate === 'function') {
    return admin.firestore.Timestamp.fromDate(value.toDate());
  }
  if (value.seconds != null) {
    return new admin.firestore.Timestamp(value.seconds, value.nanoseconds || 0);
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return admin.firestore.Timestamp.fromDate(value);
  }
  if (typeof value === 'number' && isFinite(value)) {
    return admin.firestore.Timestamp.fromDate(new Date(value));
  }
  if (typeof value === 'string') {
    const hkDate = parseHongKongSheetDate(value);
    if (hkDate && !isNaN(hkDate.getTime())) {
      return admin.firestore.Timestamp.fromDate(hkDate);
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return admin.firestore.Timestamp.fromDate(date);
    }
  }
  return null;
}

function timestampToIso(value) {
  const ts = toTimestamp(value) || admin.firestore.Timestamp.now();
  return ts.toDate().toISOString();
}

function pruneEmptyObject(obj, keepKeys) {
  const keep = new Set(keepKeys || []);
  const out = {};
  Object.keys(obj).forEach((key) => {
    if (keep.has(key) || hasMeaningfulValue(obj[key])) {
      out[key] = obj[key];
    }
  });
  return out;
}

function buildSearchText(doc) {
  const parts = [
    doc.formType,
    doc.sourceKey,
    doc.sourceLabel,
    doc.sourcePage,
    doc.sourcePath,
    doc.contactName,
    doc.phone,
    doc.whatsapp,
    doc.email,
    doc.instagram,
  ];
  parts.push(...flattenValues(doc.answers || {}, []));
  return parts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildBaseSubmission(data) {
  const answers = normalizeValue(data.answers || {});
  const submittedAt = toTimestamp(data.submittedAt || data.createdAt || data.clientSubmittedAt) || admin.firestore.Timestamp.now();
  const createdAt = toTimestamp(data.createdAt) || submittedAt;
  const updatedAt = toTimestamp(data.updatedAt) || createdAt;
  const doc = {
    formType: cleanString(data.formType || 'other'),
    sourceKey: cleanString(data.sourceKey || ''),
    sourceLabel: cleanString(data.sourceLabel || ''),
    sourcePage: cleanString(data.sourcePage || ''),
    sourcePath: cleanString(data.sourcePath || ''),
    sourceUrl: cleanString(data.sourceUrl || ''),
    sourceCollection: cleanString(data.sourceCollection || ''),
    sourceDocId: cleanString(data.sourceDocId || ''),
    sheetTab: cleanString(data.sheetTab || ''),
    sheetRowKey: cleanString(data.sheetRowKey || ''),
    importSource: cleanString(data.importSource || 'backfill'),
    contactName: cleanString(data.contactName || ''),
    phone: cleanString(data.phone || ''),
    whatsapp: cleanString(data.whatsapp || ''),
    email: cleanString(data.email || ''),
    instagram: cleanString(data.instagram || ''),
    clientSubmittedAt: cleanString(data.clientSubmittedAt || timestampToIso(submittedAt)),
    submittedAt,
    createdAt,
    updatedAt,
    answers,
  };
  if (cleanString(data.status)) doc.status = cleanString(data.status);
  if (cleanString(data.adminNotes)) doc.adminNotes = cleanString(data.adminNotes);
  if (cleanString(data.lastFollowUpType)) doc.lastFollowUpType = cleanString(data.lastFollowUpType);
  if (data.lastFollowUpAt) doc.lastFollowUpAt = toTimestamp(data.lastFollowUpAt);
  doc.searchText = buildSearchText(doc);
  return pruneEmptyObject(doc, ['answers', 'searchText', 'importSource', 'submittedAt', 'createdAt', 'updatedAt', 'clientSubmittedAt']);
}

function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sheet';
}

function stableHash(value) {
  return crypto.createHash('sha1').update(cleanString(value)).digest('hex').slice(0, 24);
}

function normalizePhoneForKey(value) {
  return cleanString(value).replace(/[^\d]/g, '');
}

function timestampMinuteKey(value) {
  const ts = toTimestamp(value);
  if (!ts) return cleanString(value).toLowerCase();
  return ts.toDate().toISOString().slice(0, 16);
}

function buildConsultationDedupeKey(data) {
  const source = data || {};
  return [
    'consultation',
    timestampMinuteKey(source.submittedAt || source.createdAt || source.clientSubmittedAt || source.timestamp),
    cleanString(source.contactName || source.name).toLowerCase(),
    normalizePhoneForKey(source.phone),
    cleanString(source.email).toLowerCase(),
    cleanString(source.sourcePage || source.page).toLowerCase(),
  ].join('|');
}

function buildFirestoreImportId(collectionName, docId) {
  return 'firestore__' + slugify(collectionName) + '__' + cleanString(docId);
}

function buildSheetImportId(sheetName, rowKey) {
  return 'sheet__' + slugify(sheetName) + '__' + stableHash(rowKey);
}

function splitCsvCell(value) {
  const str = cleanString(value);
  if (!str) return [];
  return str.split(/\s*,\s*/).map((item) => cleanString(item)).filter(Boolean);
}

function buildConsultationImport(docId, data, opts) {
  opts = opts || {};
  const imported = buildBaseSubmission({
    formType: 'consultation',
    sourceKey: 'ig-consultation',
    sourceLabel: 'AI 諮詢申請',
    sourcePage: data.page || 'IG獲客諮詢表單',
    sourceCollection: opts.sourceCollection || 'consultations',
    sourceDocId: docId,
    sheetTab: opts.sheetTab || '1 on 1 Consultation',
    sheetRowKey: opts.sheetRowKey || '',
    importSource: opts.importSource || 'backfill-firestore',
    contactName: data.name,
    phone: data.phone,
    email: data.email,
    instagram: data.igAccount,
    clientSubmittedAt: data.timestamp,
    submittedAt: data.createdAt || data.timestamp,
    createdAt: data.createdAt || data.timestamp,
    updatedAt: data.updatedAt || data.createdAt || data.timestamp,
    status: cleanString(data.status) || DEFAULT_IMPORTED_STATUS,
    answers: {
      aiSkillLevel: data.aiSkillLevel,
      aiGoal: data.aiGoal,
      currentAITools: Array.isArray(data.currentAITools) ? data.currentAITools : splitCsvCell(data.currentAITools),
      currentAIToolsOtherText: data.currentAIToolsOtherText,
      successOutcome: data.successOutcome,
      currentProblem: data.currentProblem,
      startTiming: data.startTiming,
      willingnessToPay: data.willingnessToPay,
      whyNow: data.whyNow,
      workshopInterest: data.workshopInterest,
      aiTopics: Array.isArray(data.aiTopics) ? data.aiTopics : splitCsvCell(data.aiTopics),
      aiTopicsOtherText: data.aiTopicsOtherText,
      additionalInfo: data.additionalInfo,
      whatsappConsent: data.whatsappConsent,
    },
  });
  return {
    docId: opts.docId || buildFirestoreImportId(opts.sourceCollection || 'consultations', docId),
    docData: imported,
  };
}

function buildQuizImport(docId, data, opts) {
  opts = opts || {};
  const contactType = cleanString(data.contactType || '');
  const contact = cleanString(data.contact || '');
  const countryCode = cleanString(data.countryCode || '');
  const phoneValue = contactType === 'phone'
    ? (countryCode ? '+' + countryCode + ' ' + contact : contact)
    : '';
  const imported = buildBaseSubmission({
    formType: 'quiz-lead',
    sourceKey: 'quiz-diagnostic',
    sourceLabel: 'AI 診斷結果',
    sourcePage: data.page || '2分鐘AI診斷',
    sourceCollection: opts.sourceCollection || 'quizLeads',
    sourceDocId: docId,
    sheetTab: opts.sheetTab || 'Other Submissions',
    sheetRowKey: opts.sheetRowKey || '',
    importSource: opts.importSource || 'backfill-firestore',
    contactName: data.name,
    phone: phoneValue,
    email: contactType === 'email' ? contact : '',
    clientSubmittedAt: data.timestamp,
    submittedAt: data.createdAt || data.timestamp,
    createdAt: data.createdAt || data.timestamp,
    updatedAt: data.updatedAt || data.createdAt || data.timestamp,
    status: cleanString(data.status) || DEFAULT_IMPORTED_STATUS,
    answers: {
      contactType,
      profile: data.profile,
      profileName: data.profileName,
      recommendedWorkshop: data.recommendedWorkshop,
      scores: data.scores || {},
      answers: data.answers || [],
    },
  });
  return {
    docId: opts.docId || buildFirestoreImportId(opts.sourceCollection || 'quizLeads', docId),
    docData: imported,
  };
}

function buildFreeMaterialImport(docId, data, opts) {
  opts = opts || {};
  const imported = buildBaseSubmission({
    formType: 'free-material',
    sourceKey: 'free-material-modal',
    sourceLabel: '免費資料下載',
    sourcePage: data.pageTitle || data.pagePath || '免費資料下載',
    sourcePath: data.pagePath || '',
    sourceCollection: opts.sourceCollection || 'freeMaterialLeads',
    sourceDocId: docId,
    sheetTab: opts.sheetTab || '',
    sheetRowKey: opts.sheetRowKey || '',
    importSource: opts.importSource || 'backfill-firestore',
    contactName: data.name,
    email: data.email,
    clientSubmittedAt: data.timestamp,
    submittedAt: data.createdAt || data.timestamp,
    createdAt: data.createdAt || data.timestamp,
    updatedAt: data.updatedAt || data.createdAt || data.timestamp,
    status: cleanString(data.status) || DEFAULT_IMPORTED_STATUS,
    answers: {
      materialTitle: data.materialTitle,
      documentName: data.documentName,
      documentUrl: data.documentUrl,
      pageKey: data.pageKey,
      sectionId: data.sectionId,
      consentAccepted: data.consentAccepted,
    },
  });
  return {
    docId: opts.docId || buildFirestoreImportId(opts.sourceCollection || 'freeMaterialLeads', docId),
    docData: imported,
  };
}

function buildLeadMagnetImport(docId, data, opts) {
  opts = opts || {};
  const imported = buildBaseSubmission({
    formType: 'lead-magnet',
    sourceKey: cleanString(data.sourceKey || data.source || 'lead-magnet'),
    sourceLabel: '免費 AI 指南',
    sourcePage: data.page || data.sourcePage || '免費 AI 指南',
    sourceCollection: opts.sourceCollection || '',
    sourceDocId: docId,
    sheetTab: opts.sheetTab || 'AIFlowTime Leads',
    sheetRowKey: opts.sheetRowKey || '',
    importSource: opts.importSource || 'backfill-sheet',
    contactName: data.name,
    whatsapp: data.whatsapp,
    clientSubmittedAt: data.timestamp,
    submittedAt: data.timestamp,
    createdAt: data.timestamp,
    updatedAt: data.timestamp,
    status: cleanString(data.status) || DEFAULT_IMPORTED_STATUS,
    answers: {
      consentAccepted: data.consentAccepted,
    },
  });
  return {
    docId: opts.docId || buildSheetImportId(opts.sheetTab || 'AIFlowTime Leads', opts.sheetRowKey || docId),
    docData: imported,
  };
}

function buildWorkshopWaitlistImport(docId, data, opts) {
  opts = opts || {};
  const imported = buildBaseSubmission({
    formType: 'workshop-waitlist',
    sourceKey: cleanString(data.sourceKey || data.source || 'workshop-waitlist'),
    sourceLabel: '工作坊等候名單',
    sourcePage: data.page || 'AI 新手工作坊',
    sourceCollection: opts.sourceCollection || '',
    sourceDocId: docId,
    sheetTab: opts.sheetTab || 'Workshops',
    sheetRowKey: opts.sheetRowKey || '',
    importSource: opts.importSource || 'backfill-sheet',
    contactName: data.name,
    whatsapp: data.whatsapp,
    email: data.email,
    clientSubmittedAt: data.timestamp,
    submittedAt: data.timestamp,
    createdAt: data.timestamp,
    updatedAt: data.timestamp,
    status: cleanString(data.status) || DEFAULT_IMPORTED_STATUS,
    answers: {
      workshopEvent: data.workshopEvent,
      painPoint: data.painPoint,
      painPointOther: data.painPointOther,
    },
  });
  return {
    docId: opts.docId || buildSheetImportId(opts.sheetTab || 'Workshops', opts.sheetRowKey || docId),
    docData: imported,
  };
}

function buildGenericOtherImport(docId, data, opts) {
  opts = opts || {};
  const imported = buildBaseSubmission({
    formType: cleanString(data.formType || 'other'),
    sourceKey: cleanString(data.sourceKey || data.source || 'other-submission'),
    sourceLabel: cleanString(data.sourceLabel || 'Other Submission'),
    sourcePage: cleanString(data.page || data.sourcePage || 'Other Submission'),
    sourceCollection: opts.sourceCollection || '',
    sourceDocId: docId,
    sheetTab: opts.sheetTab || 'Other Submissions',
    sheetRowKey: opts.sheetRowKey || '',
    importSource: opts.importSource || 'backfill-sheet',
    contactName: data.name,
    phone: data.phone,
    whatsapp: data.whatsapp,
    email: data.email,
    instagram: data.igAccount || data.instagram,
    clientSubmittedAt: data.timestamp,
    submittedAt: data.timestamp,
    createdAt: data.timestamp,
    updatedAt: data.timestamp,
    status: cleanString(data.status) || DEFAULT_IMPORTED_STATUS,
    answers: data.answers || data.rawData || data,
  });
  return {
    docId: opts.docId || buildSheetImportId(opts.sheetTab || 'Other Submissions', opts.sheetRowKey || docId),
    docData: imported,
  };
}

function inferImportFromPayload(docId, payload, opts) {
  const data = payload || {};
  if (cleanString(data.source) === 'quiz-diagnostic' || hasMeaningfulValue(data.scores) || hasMeaningfulValue(data.profile)) {
    return buildQuizImport(docId, data, opts);
  }
  if (cleanString(data.source) === 'workshop-waitlist' || cleanString(data.workshopEvent)) {
    return buildWorkshopWaitlistImport(docId, data, opts);
  }
  if (cleanString(data.source).indexOf('lead-magnet') !== -1 || (cleanString(data.whatsapp) && !cleanString(data.phone) && !cleanString(data.email))) {
    return buildLeadMagnetImport(docId, data, opts);
  }
  if (cleanString(data.phone) && (cleanString(data.aiGoal) || cleanString(data.currentProblem))) {
    return buildConsultationImport(docId, data, opts);
  }
  if (cleanString(data.materialTitle) || cleanString(data.documentName)) {
    return buildFreeMaterialImport(docId, data, opts);
  }
  return buildGenericOtherImport(docId, data, opts);
}

function parseJsonCell(value) {
  const str = cleanString(value);
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

module.exports = {
  DEFAULT_IMPORTED_STATUS,
  buildConsultationImport,
  buildConsultationDedupeKey,
  buildFreeMaterialImport,
  buildFirestoreImportId,
  buildLeadMagnetImport,
  buildSheetImportId,
  buildWorkshopWaitlistImport,
  buildQuizImport,
  cleanString,
  getSheetClient,
  inferImportFromPayload,
  initAdmin,
  parseJsonCell,
  stableHash,
};
