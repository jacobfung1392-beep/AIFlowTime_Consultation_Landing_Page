/**
 * Shared utility functions for AIFlowTime.
 * Eliminates duplication of escHtml, fixStorageUrl, capacity bars, etc.
 */

function escHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Allowed values for hero inline `color:` after CMS / execCommand (hex, rgb, hsl, named, var).
 */
function _heroTitleSafeColor(col) {
    if (!col) return false;
    col = String(col).trim();
    if (/url\s*\(|expression|javascript|attr\s*\(|</i.test(col)) return false;
    if (/^#([0-9a-f]{3,8})$/i.test(col)) return true;
    if (/^rgba?\s*\(/i.test(col)) return true;
    if (/^hsla?\s*\(/i.test(col)) return true;
    if (/^var\s*\(\s*--[a-zA-Z0-9_-]+\s*\)$/i.test(col)) return true;
    if (/^[a-z][a-z0-9\s,-]*$/i.test(col) && col.length <= 40) return true;
    return false;
}

/**
 * Hero layout title: allow safe inline HTML (bold, italic, color, size, etc.) for CMS → page.
 * Plain text (no tags) is escaped; newlines become <br>.
 */
function sanitizeHeroTitleHtml(html) {
    if (html == null || html === '') return '';
    var raw = String(html).trim();
    if (!raw) return '';

    if (/&lt;|&gt;|&#60;|&#62;|&#x3[cCeE];/.test(raw)) {
        var decoder = document.createElement('textarea');
        decoder.innerHTML = raw;
        raw = decoder.value;
    }

    if (!/[<>]/.test(raw)) return escHtml(raw).replace(/\n/g, '<br>');

    function cleanChildren(parent) {
        var frag = document.createDocumentFragment();
        var cn = Array.prototype.slice.call(parent.childNodes);
        cn.forEach(function(child) {
            if (child.nodeType === 3) {
                frag.appendChild(document.createTextNode(child.textContent));
                return;
            }
            if (child.nodeType !== 1) return;
            var tag = child.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'iframe') return;
            if (tag === 'br') {
                frag.appendChild(document.createElement('br'));
                return;
            }
            if (['b', 'strong', 'i', 'em', 'u', 's', 'strike'].indexOf(tag) !== -1) {
                var el = document.createElement(tag);
                el.appendChild(cleanChildren(child));
                frag.appendChild(el);
                return;
            }
            if (tag === 'font') {
                var sp2 = document.createElement('span');
                var faceColor = (child.getAttribute('color') || '').trim();
                if (faceColor) {
                    var fcNorm = faceColor.replace(/\s*!important\s*$/i, '').trim();
                    if (_heroTitleSafeColor(fcNorm)) sp2.setAttribute('style', 'color:' + fcNorm);
                }
                sp2.appendChild(cleanChildren(child));
                frag.appendChild(sp2);
                return;
            }
            if (tag === 'span') {
                var st = child.getAttribute('style') || '';
                var allowed = [];
                var m;
                if ((m = st.match(/color\s*:\s*([^;]+)/i))) {
                    var col = m[1].trim().replace(/\s*!important\s*$/i, '').trim();
                    if (_heroTitleSafeColor(col)) allowed.push('color:' + col);
                }
                if ((m = st.match(/font-size\s*:\s*([^;]+)/i))) {
                    var fs = m[1].trim().replace(/\s*!important\s*$/i, '').trim();
                    if (/^[\d.]+\s*(px|em|rem|%)$/i.test(fs)) allowed.push('font-size:' + fs);
                }
                // Do not unwrap font-size-only spans whose sole child is another span — that drops
                // font-size when users apply color after size (common: outer size, inner color).
                if (allowed.length) {
                    var sp = document.createElement('span');
                    sp.setAttribute('style', allowed.join(';'));
                    sp.appendChild(cleanChildren(child));
                    frag.appendChild(sp);
                } else {
                    frag.appendChild(cleanChildren(child));
                }
                return;
            }
            frag.appendChild(cleanChildren(child));
        });
        return frag;
    }

    var container = document.createElement('div');
    container.innerHTML = raw;
    var out = document.createElement('div');
    out.appendChild(cleanChildren(container));
    return out.innerHTML;
}

/**
 * Lead-magnet / free-material email bodies: preserve links and block tags
 * (sanitizeHeroTitleHtml strips <a>/<p>/<div>, which made custom templates blank).
 */
function sanitizeFreeMaterialEmailHtml(html) {
    if (html == null || html === '') return '';
    var raw = String(html).trim();
    if (!raw) return '';

    if (/&lt;|&gt;|&#60;|&#62;|&#x3[cCeE];/.test(raw)) {
        var decoder = document.createElement('textarea');
        decoder.innerHTML = raw;
        raw = decoder.value;
    }

    if (!/[<>]/.test(raw)) return escHtml(raw).replace(/\n/g, '<br>');

    function emailSafeHref(href) {
        href = String(href || '').trim();
        if (!href) return '';
        if (/^https?:\/\//i.test(href)) return href;
        if (/^mailto:/i.test(href)) return href;
        return '';
    }

    function cleanChildren(parent) {
        var frag = document.createDocumentFragment();
        var cn = Array.prototype.slice.call(parent.childNodes);
        cn.forEach(function(child) {
            if (child.nodeType === 3) {
                frag.appendChild(document.createTextNode(child.textContent));
                return;
            }
            if (child.nodeType !== 1) return;
            var tag = child.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'iframe') return;
            if (tag === 'br') {
                frag.appendChild(document.createElement('br'));
                return;
            }
            if (tag === 'hr') {
                frag.appendChild(document.createElement('hr'));
                return;
            }
            if (tag === 'a') {
                var safeHref = emailSafeHref(child.getAttribute('href'));
                if (!safeHref) {
                    frag.appendChild(cleanChildren(child));
                    return;
                }
                var a = document.createElement('a');
                a.setAttribute('href', safeHref);
                a.setAttribute('rel', 'noopener noreferrer');
                a.setAttribute('target', '_blank');
                a.appendChild(cleanChildren(child));
                frag.appendChild(a);
                return;
            }
            if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'blockquote'].indexOf(tag) !== -1) {
                var block = document.createElement(tag);
                block.appendChild(cleanChildren(child));
                frag.appendChild(block);
                return;
            }
            if (['b', 'strong', 'i', 'em', 'u', 's', 'strike'].indexOf(tag) !== -1) {
                var inline = document.createElement(tag);
                inline.appendChild(cleanChildren(child));
                frag.appendChild(inline);
                return;
            }
            if (tag === 'font') {
                var sp2 = document.createElement('span');
                var faceColor = (child.getAttribute('color') || '').trim();
                if (faceColor) {
                    var fcNorm = faceColor.replace(/\s*!important\s*$/i, '').trim();
                    if (_heroTitleSafeColor(fcNorm)) sp2.setAttribute('style', 'color:' + fcNorm);
                }
                sp2.appendChild(cleanChildren(child));
                frag.appendChild(sp2);
                return;
            }
            if (tag === 'span') {
                var st = child.getAttribute('style') || '';
                var allowed = [];
                var m;
                if ((m = st.match(/color\s*:\s*([^;]+)/i))) {
                    var col = m[1].trim().replace(/\s*!important\s*$/i, '').trim();
                    if (_heroTitleSafeColor(col)) allowed.push('color:' + col);
                }
                if ((m = st.match(/font-size\s*:\s*([^;]+)/i))) {
                    var fs = m[1].trim().replace(/\s*!important\s*$/i, '').trim();
                    if (/^[\d.]+\s*(px|em|rem|%)$/i.test(fs)) allowed.push('font-size:' + fs);
                }
                if (allowed.length) {
                    var sp = document.createElement('span');
                    sp.setAttribute('style', allowed.join(';'));
                    sp.appendChild(cleanChildren(child));
                    frag.appendChild(sp);
                } else {
                    frag.appendChild(cleanChildren(child));
                }
                return;
            }
            frag.appendChild(cleanChildren(child));
        });
        return frag;
    }

    var container = document.createElement('div');
    container.innerHTML = raw;
    var out = document.createElement('div');
    out.appendChild(cleanChildren(container));
    return out.innerHTML;
}

function _freeMaterialEmailHasVisibleContent(html) {
    if (!html || !String(html).trim()) return false;
    var d = document.createElement('div');
    d.innerHTML = html;
    return String(d.textContent || '').replace(/\s+/g, '').length > 0;
}

function _aiflowEscEmailAttr(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

/**
 * CMS email 內文「"標題":url」格式（與 insert 按鈕一致）→ 可點連結；其餘文字 escape。
 */
function _aiflowEmailQuotedLabelLinksToHtml(text) {
    text = String(text || '');
    var re = /("(?:[^"\\]|\\.)*")\s*:\s*(https?:\/\/[^\s<\]]+)/gi;
    var out = '';
    var last = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
        out += escHtml(text.slice(last, m.index)).replace(/\n/g, '<br>');
        var label;
        try {
            label = JSON.parse(m[1]);
        } catch (err) {
            label = m[1].slice(1, -1).replace(/\\(.)/g, '$1');
        }
        out += '<a href="' + _aiflowEscEmailAttr(m[2]) + '" rel="noopener noreferrer" target="_blank">' +
            escHtml(label) + '</a>';
        last = re.lastIndex;
    }
    out += escHtml(text.slice(last)).replace(/\n/g, '<br>');
    return out;
}

/**
 * Shared rich-text renderer for page-layout CMS fields.
 * Reuses the hero sanitizer so text adjustment bars and rich array fields
 * render consistently in preview and on the live page.
 */
function aiflowRenderRichTextHtml(value) {
    if (value == null) return '';
    var raw = String(value);
    if (!raw.trim()) return '';
    if (typeof sanitizeHeroTitleHtml === 'function') return sanitizeHeroTitleHtml(raw);
    return escHtml(raw).replace(/\n/g, '<br>');
}

function aiflowSetRichText(el, value) {
    if (!el) return '';
    var html = aiflowRenderRichTextHtml(value);
    el.innerHTML = html;
    return html;
}

function aiflowRichTextHasVisibleText(value) {
    return String(aiflowRenderRichTextHtml(value) || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function fixStorageUrl(url) {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    var match = url.match(/\/o\/([^?]+)/);
    if (match) {
        var storagePath = decodeURIComponent(match[1]);
        return 'https://asia-east2-aiflowtime-hk.cloudfunctions.net/storageProxy?path=' + encodeURIComponent(storagePath);
    }
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://asia-east2-aiflowtime-hk.cloudfunctions.net/storageProxy?path=' + encodeURIComponent(url);
}

function _aiflowTrimString(val) {
    return String(val == null ? '' : val).trim();
}

function _aiflowIsPlainObject(val) {
    return Object.prototype.toString.call(val) === '[object Object]';
}

function _aiflowHasMeaningfulValue(val) {
    if (val == null) return false;
    if (typeof val === 'string') return _aiflowTrimString(val) !== '';
    if (Array.isArray(val)) return val.length > 0;
    if (_aiflowIsPlainObject(val)) return Object.keys(val).length > 0;
    return true;
}

function _aiflowNormalizeSubmissionAnswers(val) {
    if (val == null) return '';
    if (typeof val === 'string') return _aiflowTrimString(val);
    if (Array.isArray(val)) {
        return val.map(function(item) {
            return _aiflowNormalizeSubmissionAnswers(item);
        }).filter(function(item) {
            return _aiflowHasMeaningfulValue(item);
        });
    }
    if (_aiflowIsPlainObject(val)) {
        var out = {};
        Object.keys(val).forEach(function(key) {
            var normalized = _aiflowNormalizeSubmissionAnswers(val[key]);
            if (_aiflowHasMeaningfulValue(normalized)) out[key] = normalized;
        });
        return out;
    }
    return val;
}

function _aiflowFlattenSubmissionValues(val, bucket) {
    bucket = bucket || [];
    if (!_aiflowHasMeaningfulValue(val)) return bucket;
    if (typeof val === 'string') {
        bucket.push(_aiflowTrimString(val));
        return bucket;
    }
    if (Array.isArray(val)) {
        val.forEach(function(item) {
            _aiflowFlattenSubmissionValues(item, bucket);
        });
        return bucket;
    }
    if (_aiflowIsPlainObject(val)) {
        Object.keys(val).forEach(function(key) {
            _aiflowFlattenSubmissionValues(val[key], bucket);
        });
        return bucket;
    }
    bucket.push(String(val));
    return bucket;
}

function _aiflowBuildFormSubmissionDocId(input, explicitDocId) {
    var rawDocId = _aiflowTrimString(explicitDocId || '');
    if (rawDocId) return rawDocId;
    var sourceCollection = _aiflowTrimString(input && input.sourceCollection);
    var sourceDocId = _aiflowTrimString(input && input.sourceDocId);
    if (!sourceCollection || !sourceDocId) return '';
    return sourceCollection + '__' + sourceDocId;
}

function buildFormSubmissionDoc(input) {
    input = input || {};
    if (typeof firebase === 'undefined' || !firebase.firestore || !firebase.firestore.FieldValue) {
        throw new Error('Firebase Firestore is unavailable for form submission mirroring.');
    }

    var answers = _aiflowNormalizeSubmissionAnswers(input.answers || input.rawAnswers || {});
    var doc = {
        formType: _aiflowTrimString(input.formType || 'other'),
        sourceKey: _aiflowTrimString(input.sourceKey || input.source || ''),
        sourceLabel: _aiflowTrimString(input.sourceLabel || ''),
        sourcePage: _aiflowTrimString(input.sourcePage || input.page || ''),
        sourcePath: _aiflowTrimString(input.sourcePath || (typeof window !== 'undefined' ? window.location.pathname : '')),
        sourceUrl: _aiflowTrimString(input.sourceUrl || (typeof window !== 'undefined' ? window.location.href : '')),
        sourceCollection: _aiflowTrimString(input.sourceCollection || ''),
        sourceDocId: _aiflowTrimString(input.sourceDocId || ''),
        sheetTab: _aiflowTrimString(input.sheetTab || ''),
        importSource: _aiflowTrimString(input.importSource || 'live-form'),
        leadDefinitionId: _aiflowTrimString(input.leadDefinitionId || ''),
        leadDefinitionType: _aiflowTrimString(input.leadDefinitionType || (input.leadDefinitionId ? (input.formType || '') : '')),
        leadDefinitionName: _aiflowTrimString(input.leadDefinitionName || ''),
        contactName: _aiflowTrimString(input.contactName || input.name || ''),
        phone: _aiflowTrimString(input.phone || ''),
        whatsapp: _aiflowTrimString(input.whatsapp || ''),
        email: _aiflowTrimString(input.email || ''),
        instagram: _aiflowTrimString(input.instagram || input.igAccount || ''),
        clientSubmittedAt: _aiflowTrimString(input.clientSubmittedAt || input.timestamp || new Date().toISOString()),
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        answers: answers
    };
    var searchParts = [
        doc.formType,
        doc.sourceKey,
        doc.sourceLabel,
        doc.sourcePage,
        doc.sourcePath,
        doc.leadDefinitionId,
        doc.leadDefinitionType,
        doc.leadDefinitionName,
        doc.contactName,
        doc.phone,
        doc.whatsapp,
        doc.email,
        doc.instagram
    ];
    searchParts = searchParts.concat(_aiflowFlattenSubmissionValues(answers, []));
    doc.searchText = searchParts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
    return doc;
}

function saveFormSubmissionMirror(input, opts) {
    opts = opts || {};

    function writeWithDb(db) {
        if (!db) return Promise.reject(new Error('Firestore unavailable'));
        try {
            var docData = buildFormSubmissionDoc(input);
            var explicitDocId = _aiflowBuildFormSubmissionDocId(input, opts.docId);
            var ref = explicitDocId
                ? db.collection('formSubmissions').doc(explicitDocId)
                : db.collection('formSubmissions').doc();
            return ref.set(docData, { merge: !!explicitDocId }).then(function() {
                return { id: ref.id, data: docData };
            });
        } catch (err) {
            return Promise.reject(err);
        }
    }

    if (opts.db) return writeWithDb(opts.db);

    return new Promise(function(resolve, reject) {
        try {
            if (typeof initFirebase === 'function') {
                initFirebase(function(app) {
                    try {
                        writeWithDb(app.firestore()).then(resolve).catch(reject);
                    } catch (err) {
                        reject(err);
                    }
                }, { waitForAuthPersistence: false });
                return;
            }
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                writeWithDb(firebase.firestore()).then(resolve).catch(reject);
                return;
            }
        } catch (err) {
            reject(err);
            return;
        }
        reject(new Error('Firebase unavailable'));
    });
}

function _aiflowDeepClone(val) {
    if (val == null) return val;
    return JSON.parse(JSON.stringify(val));
}

var AIFLOW_LEAD_DEFINITION_TYPES = [
    'quiz-lead',
    'consultation',
    'workshop-waitlist',
    'free-material',
    'lead-magnet'
];

var AIFLOW_LEAD_DEFINITION_TYPE_META = {
    'quiz-lead': { label: 'Quiz Leads' },
    consultation: { label: 'Consultation' },
    'workshop-waitlist': { label: 'Workshop Waitlist' },
    'free-material': { label: 'Free Material' },
    'lead-magnet': { label: 'Lead Magnet' }
};

var _aiflowLeadDefinitionDocCache = {};

function aiflowGetLeadDefinitionTypeMeta(type) {
    var key = _aiflowTrimString(type || '');
    return AIFLOW_LEAD_DEFINITION_TYPE_META[key] || { label: key || 'Lead' };
}

function aiflowGetLeadDefinitionTypeOptions(includeAll) {
    var opts = [];
    if (includeAll) opts.push({ value: 'all', label: '全部類型' });
    AIFLOW_LEAD_DEFINITION_TYPES.forEach(function(type) {
        opts.push({ value: type, label: aiflowGetLeadDefinitionTypeMeta(type).label });
    });
    return opts;
}

function _aiflowNormalizeLeadDocuments(list) {
    var docs = [];
    if (!Array.isArray(list)) return docs;
    list.forEach(function(item) {
        if (!item) return;
        var url = _aiflowTrimString(item.url || item.href || '');
        if (!url) return;
        docs.push({
            name: _aiflowTrimString(item.name || item.fileName || url.split('/').pop() || 'document'),
            url: url,
            fileName: _aiflowTrimString(item.fileName || item.name || '')
        });
    });
    return docs;
}

/** Lead Identity outbound links (title + url) for email/WA button snippets in CMS & runtime */
function _aiflowNormalizeIdentityLinks(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    list.forEach(function(row) {
        if (!row) return;
        var url = _aiflowTrimString(row.url || row.href || '');
        if (!url) return;
        out.push({
            title: _aiflowTrimString(row.title || row.label || ''),
            url: url
        });
    });
    return out;
}

function _aiflowNormalizeLeadFormFields(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function(item) {
        var row = {
            label: _aiflowTrimString(item && item.label || ''),
            type: _aiflowTrimString(item && item.type || 'text') || 'text'
        };
        var key = _aiflowTrimString(item && item.key || '');
        if (key) row.key = key;
        return row;
    }).filter(function(item) {
        return item.label;
    });
}

/** Infer collectName / collectEmail / collectPhone from legacy mini-list formFields */
function _aiflowInferLeadMagnetCollectFlags(formFields) {
    var out = { collectName: false, collectEmail: false, collectPhone: false };
    (formFields || []).forEach(function(f) {
        if (!f) return;
        var t = _aiflowTrimString(f.type || 'text') || 'text';
        var lab = String(f.label || '');
        var labLow = lab.toLowerCase();
        if (t === 'email') out.collectEmail = true;
        else if (t === 'tel') out.collectPhone = true;
        else if (t === 'text') {
            if (/whatsapp|whats|電話|phone|8\s*位|8位/i.test(lab) || /whatsapp|email/i.test(labLow)) {
                out.collectPhone = true;
            } else {
                out.collectName = true;
            }
        }
    });
    if (!out.collectName && !out.collectEmail && !out.collectPhone) {
        out.collectName = true;
        out.collectPhone = true;
    }
    return out;
}

/** Build lead-magnet formFields from CMS flags + labels (order: name, email, phone) */
function aiflowBuildLeadMagnetFormFieldsFromCollect(def) {
    def = def || {};
    var fields = [];
    if (def.collectName) {
        fields.push({ label: _aiflowTrimString(def.nameFieldLabel || '姓名') || '姓名', type: 'text', key: 'name' });
    }
    if (def.collectEmail) {
        fields.push({ label: _aiflowTrimString(def.emailFieldLabel || 'Email') || 'Email', type: 'email', key: 'email' });
    }
    if (def.collectPhone) {
        fields.push({
            label: _aiflowTrimString(def.phoneFieldLabel || 'WhatsApp（8位數字）') || 'WhatsApp（8位數字）',
            type: 'tel',
            key: 'phone'
        });
    }
    if (!fields.length) {
        fields.push({ label: _aiflowTrimString(def.nameFieldLabel || '姓名') || '姓名', type: 'text', key: 'name' });
        fields.push({
            label: _aiflowTrimString(def.phoneFieldLabel || 'WhatsApp（8位數字）') || 'WhatsApp（8位數字）',
            type: 'tel',
            key: 'phone'
        });
    }
    return fields;
}

function aiflowLeadDefinitionDisplayName(definition) {
    var def = definition || {};
    var name = _aiflowTrimString(def.name || '');
    if (name) return name;
    var title = _aiflowTrimString(String(def.title || '').replace(/<[^>]+>/g, ' '));
    if (title) return title;
    return aiflowGetLeadDefinitionTypeMeta(def.type).label;
}

function aiflowCreateLeadDefinitionDefaults(type) {
    var normalizedType = _aiflowTrimString(type || 'lead-magnet');
    if (AIFLOW_LEAD_DEFINITION_TYPES.indexOf(normalizedType) === -1) normalizedType = 'lead-magnet';
    var base = {
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
        emailMessage: '',
        whatsappGreetingMessage: '',
        documents: [],
        pdfUrl: '',
        fileName: '',
        deliveryMode: 'auto',
        deliveryIncludeDocuments: true,
        deliveryIncludeLinks: false,
        identityLinks: [],
        nameFieldLabel: '姓名',
        emailFieldLabel: 'Email',
        consentText: '',
        successMessage: '',
        helperNote: '',
        purposeNotes: '',
        formFields: []
    };
    if (normalizedType === 'lead-magnet') {
        base.phoneFieldLabel = 'WhatsApp（8位數字）';
        base.collectName = true;
        base.collectEmail = false;
        base.collectPhone = true;
        base.consentCheckboxEnabled = true;
        base.submitText = '提交';
        base.formFields = aiflowBuildLeadMagnetFormFieldsFromCollect(base);
    } else if (normalizedType === 'workshop-waitlist') {
        base.submitText = '加入等候名單';
    } else if (normalizedType === 'consultation') {
        base.submitText = '提交申請';
    } else if (normalizedType === 'quiz-lead') {
        base.submitText = '查看結果';
    }
    return base;
}

function aiflowNormalizeLeadDefinition(raw, opts) {
    raw = raw || {};
    opts = opts || {};
    var type = _aiflowTrimString(raw.type || opts.type || 'lead-magnet');
    if (AIFLOW_LEAD_DEFINITION_TYPES.indexOf(type) === -1) type = 'lead-magnet';
    var next = aiflowCreateLeadDefinitionDefaults(type);
    Object.keys(raw).forEach(function(key) {
        if (raw[key] === undefined) return;
        next[key] = _aiflowDeepClone(raw[key]);
    });
    next.id = _aiflowTrimString(opts.id || raw.id || '');
    next.type = type;
    next.name = _aiflowTrimString(next.name || '');
    next.status = ['active', 'draft', 'archived'].indexOf(_aiflowTrimString(next.status || 'active')) >= 0
        ? _aiflowTrimString(next.status || 'active')
        : 'active';
    next.publicEnabled = next.publicEnabled !== false;
    next.title = String(next.title || '');
    next.description = String(next.description || '');
    next.imageUrl = _aiflowTrimString(next.imageUrl || '');
    next.imageAlt = _aiflowTrimString(next.imageAlt || '');
    next.redirectUrl = _aiflowTrimString(next.redirectUrl || '');
    next.submitText = _aiflowTrimString(next.submitText || aiflowCreateLeadDefinitionDefaults(type).submitText);
    next.sectionLabel = String(next.sectionLabel || '');
    next.ctaText = _aiflowTrimString(next.ctaText || '');
    next.materialTitle = String(next.materialTitle || '');
    next.emailSubject = String(next.emailSubject || '');
    next.emailMessage = String(next.emailMessage || '');
    next.whatsappGreetingMessage = String(next.whatsappGreetingMessage || '');
    next.nameFieldLabel = _aiflowTrimString(next.nameFieldLabel || '姓名');
    next.emailFieldLabel = _aiflowTrimString(next.emailFieldLabel || 'Email');
    next.phoneFieldLabel = _aiflowTrimString(next.phoneFieldLabel || '');
    next.consentText = String(next.consentText || '');
    next.successMessage = String(next.successMessage || '');
    next.helperNote = String(next.helperNote || '');
    next.purposeNotes = String(next.purposeNotes || '');
    if (type === 'lead-magnet') {
        if (!raw.hasOwnProperty('collectName') && !raw.hasOwnProperty('collectEmail') && !raw.hasOwnProperty('collectPhone')) {
            var preNormFields = _aiflowNormalizeLeadFormFields(Array.isArray(raw.formFields) ? raw.formFields : []);
            var infFlags = _aiflowInferLeadMagnetCollectFlags(preNormFields);
            next.collectName = infFlags.collectName;
            next.collectEmail = infFlags.collectEmail;
            next.collectPhone = infFlags.collectPhone;
        } else {
            next.collectName = !!next.collectName;
            next.collectEmail = !!next.collectEmail;
            next.collectPhone = !!next.collectPhone;
        }
        if (!raw.hasOwnProperty('consentCheckboxEnabled')) {
            next.consentCheckboxEnabled = true;
        } else {
            next.consentCheckboxEnabled = !!next.consentCheckboxEnabled;
        }
        if (!next.phoneFieldLabel) next.phoneFieldLabel = 'WhatsApp（8位數字）';
        next.formFields = _aiflowNormalizeLeadFormFields(aiflowBuildLeadMagnetFormFieldsFromCollect(next));
    } else {
        next.formFields = _aiflowNormalizeLeadFormFields(next.formFields);
    }
    next.documents = _aiflowNormalizeLeadDocuments(next.documents);
    next.pdfUrl = _aiflowTrimString(next.pdfUrl || '');
    next.fileName = _aiflowTrimString(next.fileName || '');
    if (!next.documents.length && next.pdfUrl) {
        next.documents = [{
            name: next.fileName || next.pdfUrl.split('/').pop() || 'document',
            url: next.pdfUrl,
            fileName: next.fileName || ''
        }];
    }
    if (!next.pdfUrl && next.documents.length) next.pdfUrl = next.documents[0].url || '';
    if (!next.fileName && next.documents.length) next.fileName = next.documents[0].fileName || next.documents[0].name || '';
    next.identityLinks = _aiflowNormalizeIdentityLinks(next.identityLinks || []);
    var legacyMode = _aiflowTrimString(raw.deliveryMode || next.deliveryMode || 'auto').toLowerCase();
    if (!raw.hasOwnProperty('deliveryIncludeDocuments')) {
        if (legacyMode === 'link') next.deliveryIncludeDocuments = false;
        else {
            next.deliveryIncludeDocuments = !!(next.documents.length || _aiflowTrimString(next.pdfUrl || ''))
                || legacyMode === 'attachment'
                || legacyMode === 'auto';
        }
    } else {
        next.deliveryIncludeDocuments = !!next.deliveryIncludeDocuments;
    }
    if (!raw.hasOwnProperty('deliveryIncludeLinks')) {
        next.deliveryIncludeLinks = next.identityLinks.length > 0 || legacyMode === 'link';
    } else {
        next.deliveryIncludeLinks = !!next.deliveryIncludeLinks;
    }
    var primaryFileUrl = _aiflowTrimString(next.pdfUrl || '') || (next.documents[0] && next.documents[0].url) || '';
    if (next.deliveryIncludeDocuments && primaryFileUrl && _aiflowUrlLooksLikeDownloadableFile(primaryFileUrl)) {
        next.deliveryMode = 'attachment';
    } else if (next.deliveryIncludeLinks && (!next.deliveryIncludeDocuments || !primaryFileUrl)) {
        next.deliveryMode = 'link';
    } else {
        next.deliveryMode = ['auto', 'attachment', 'link'].indexOf(legacyMode) >= 0 ? legacyMode : 'auto';
    }
    if (next.deliveryIncludeDocuments && next.deliveryIncludeLinks) next.deliveryMode = 'auto';
    var hasAttachableDoc = next.documents.length > 0 || !!_aiflowTrimString(next.pdfUrl || '');
    var hasIdLinks = next.identityLinks.length > 0;
    if (type === 'lead-magnet') {
        if ((hasAttachableDoc || hasIdLinks) && !raw.hasOwnProperty('collectEmail')) {
            next.collectEmail = true;
            next.formFields = _aiflowNormalizeLeadFormFields(aiflowBuildLeadMagnetFormFieldsFromCollect(next));
        }
    }
    if (type === 'free-material' && hasIdLinks && !raw.hasOwnProperty('collectEmail')) {
        next.collectEmail = true;
    }
    return next;
}

function _aiflowResolveLeadDb(opts) {
    opts = opts || {};
    if (opts.db) return Promise.resolve(opts.db);
    return new Promise(function(resolve, reject) {
        try {
            if (typeof initFirebase === 'function') {
                initFirebase(function(app) {
                    try {
                        resolve(app.firestore());
                    } catch (err) {
                        reject(err);
                    }
                }, { waitForAuthPersistence: false });
                return;
            }
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                resolve(firebase.firestore());
                return;
            }
        } catch (err) {
            reject(err);
            return;
        }
        reject(new Error('Firebase unavailable'));
    });
}

function aiflowFetchLeadDefinitionById(id, opts) {
    var docId = _aiflowTrimString(id || '');
    if (!docId) return Promise.resolve(null);
    if (_aiflowLeadDefinitionDocCache[docId]) return Promise.resolve(_aiflowLeadDefinitionDocCache[docId]);
    return _aiflowResolveLeadDb(opts).then(function(db) {
        return db.collection('leadDefinitions').doc(docId).get().then(function(doc) {
            if (!doc.exists) return null;
            var normalized = aiflowNormalizeLeadDefinition(doc.data() || {}, { id: doc.id });
            _aiflowLeadDefinitionDocCache[docId] = normalized;
            return normalized;
        });
    });
}

function aiflowFetchLeadDefinitionsByIds(ids, opts) {
    var unique = [];
    (ids || []).forEach(function(id) {
        var docId = _aiflowTrimString(id || '');
        if (docId && unique.indexOf(docId) === -1) unique.push(docId);
    });
    if (!unique.length) return Promise.resolve({});
    return Promise.all(unique.map(function(id) {
        return aiflowFetchLeadDefinitionById(id, opts).then(function(def) {
            return { id: id, definition: def };
        }).catch(function() {
            return { id: id, definition: null };
        });
    })).then(function(rows) {
        var out = {};
        rows.forEach(function(row) {
            if (row.definition) out[row.id] = row.definition;
        });
        return out;
    });
}

function aiflowSubscribeLeadDefinitions(onChange, onError, opts) {
    opts = opts || {};
    return _aiflowResolveLeadDb(opts).then(function(db) {
        return db.collection('leadDefinitions').onSnapshot(function(snap) {
            var list = [];
            snap.forEach(function(doc) {
                var normalized = aiflowNormalizeLeadDefinition(doc.data() || {}, { id: doc.id });
                _aiflowLeadDefinitionDocCache[doc.id] = normalized;
                list.push(normalized);
            });
            list.sort(function(a, b) {
                return aiflowLeadDefinitionDisplayName(a).localeCompare(aiflowLeadDefinitionDisplayName(b), 'zh-Hant');
            });
            if (typeof onChange === 'function') onChange(list);
        }, function(err) {
            if (typeof onError === 'function') onError(err);
        });
    });
}

function aiflowLeadDefinitionSelectOptions(definitions, type, includeBlankLabel) {
    var filtered = (definitions || []).filter(function(item) {
        return !type || type === 'all' || item.type === type;
    });
    var options = [];
    if (includeBlankLabel) options.push({ value: '', label: includeBlankLabel });
    filtered.forEach(function(item) {
        options.push({
            value: item.id,
            label: aiflowLeadDefinitionDisplayName(item) + ' [' + aiflowGetLeadDefinitionTypeMeta(item.type).label + ']'
        });
    });
    return options;
}

function aiflowApplyLeadDefinitionToLinkLeadMagnet(link, definition) {
    if (!definition) return _aiflowDeepClone(link || {});
    var normalized = aiflowNormalizeLeadDefinition(definition, { id: definition.id });
    var next = _aiflowDeepClone(link || {});
    var popup = _aiflowIsPlainObject(next.leadMagnet) ? _aiflowDeepClone(next.leadMagnet) : {};
    if (!popup.hasOwnProperty('enabled')) popup.enabled = true;
    popup.title = normalized.title || '';
    popup.description = normalized.description || '';
    popup.imageUrl = normalized.imageUrl || '';
    popup.submitText = normalized.submitText || '提交';
    popup.redirectUrl = normalized.redirectUrl || '';
    popup.formFields = _aiflowDeepClone(normalized.formFields || []);
    popup.consentText = String(normalized.consentText || '');
    popup.consentCheckboxEnabled = normalized.consentCheckboxEnabled !== false;
    popup.materialTitle = normalized.materialTitle || '';
    popup.emailSubject = normalized.emailSubject || '';
    popup.emailMessage = String(normalized.emailMessage || '');
    popup.deliveryMode = normalized.deliveryMode || 'auto';
    popup.documents = _aiflowDeepClone(normalized.documents || []);
    popup.pdfUrl = normalized.pdfUrl || '';
    popup.fileName = normalized.fileName || '';
    popup.whatsappGreetingMessage = String(normalized.whatsappGreetingMessage || '');
    popup.identityLinks = _aiflowDeepClone(normalized.identityLinks || []);
    popup.deliveryIncludeDocuments = normalized.deliveryIncludeDocuments !== false;
    popup.deliveryIncludeLinks = !!normalized.deliveryIncludeLinks;
    popup.collectEmail = !!normalized.collectEmail;
    popup.collectPhone = normalized.collectPhone !== false;
    if (!popup.redirectUrl) {
        var linkUrl = _aiflowTrimString(next.url || '');
        if (linkUrl && linkUrl !== '#') popup.redirectUrl = linkUrl;
    }
    next.leadMagnet = popup;
    next.leadDefinitionId = normalized.id || _aiflowTrimString(next.leadDefinitionId || '');
    next.leadDefinitionType = normalized.type || 'lead-magnet';
    next.leadDefinitionName = aiflowLeadDefinitionDisplayName(normalized);
    return next;
}

function aiflowApplyLeadDefinitionToFreeMaterialContent(content, definition) {
    if (!definition) return _aiflowDeepClone(content || {});
    var normalized = aiflowNormalizeLeadDefinition(definition, { id: definition.id });
    var next = _aiflowDeepClone(content || {});
    next.sectionLabel = normalized.sectionLabel || '';
    next.title = normalized.title || '';
    next.description = normalized.description || '';
    next.imageUrl = normalized.imageUrl || '';
    next.imageAlt = normalized.imageAlt || '';
    next.ctaText = normalized.ctaText || '';
    next.submitText = normalized.submitText || '';
    next.materialTitle = normalized.materialTitle || '';
    next.emailSubject = normalized.emailSubject || '';
    next.emailMessage = String(normalized.emailMessage || '');
    next.whatsappGreetingMessage = String(normalized.whatsappGreetingMessage || '');
    next.documents = _aiflowDeepClone(normalized.documents || []);
    next.pdfUrl = normalized.pdfUrl || '';
    next.fileName = normalized.fileName || '';
    next.deliveryMode = normalized.deliveryMode || 'auto';
    next.identityLinks = _aiflowDeepClone(normalized.identityLinks || []);
    next.deliveryIncludeDocuments = normalized.deliveryIncludeDocuments !== false;
    next.deliveryIncludeLinks = !!normalized.deliveryIncludeLinks;
    next.nameFieldLabel = normalized.nameFieldLabel || '姓名';
    next.emailFieldLabel = normalized.emailFieldLabel || 'Email';
    next.consentText = normalized.consentText || '';
    next.successMessage = normalized.successMessage || '';
    next.helperNote = normalized.helperNote || '';
    next.redirectUrl = normalized.redirectUrl || '';
    next.leadDefinitionId = normalized.id || _aiflowTrimString(next.leadDefinitionId || '');
    next.leadDefinitionType = normalized.type || 'free-material';
    next.leadDefinitionName = aiflowLeadDefinitionDisplayName(normalized);
    return next;
}

function aiflowLeadMagnetFirstDocument(config) {
    config = config || {};
    var docs = Array.isArray(config.documents) ? config.documents.filter(function(d) { return d && d.url; }) : [];
    if (docs.length) return docs[0];
    var u = _aiflowTrimString(config.pdfUrl || '');
    if (u) {
        var fn = _aiflowTrimString(config.fileName || '');
        return { url: u, name: fn || u.split('/').pop().split('?')[0] || 'document', fileName: fn };
    }
    return null;
}

function aiflowLeadMagnetDefaultFormFields() {
    return [
        { label: '姓名', type: 'text', key: 'name' },
        { label: 'WhatsApp（8位數字）', type: 'tel', key: 'phone' }
    ];
}

function aiflowLeadMagnetFieldsArrayFromConfig(config) {
    var fields = config && Array.isArray(config.formFields) ? config.formFields : [];
    if (!fields.length) fields = aiflowLeadMagnetDefaultFormFields();
    return fields.map(function(fd, idx) {
        var type = _aiflowTrimString(fd.type || 'text') || 'text';
        var key = _aiflowTrimString(fd.key || '');
        if (!key) {
            if (type === 'email') key = 'email';
            else if (type === 'tel') key = 'phone';
            else key = idx === 0 ? 'name' : 'field_' + idx;
        }
        return {
            label: _aiflowTrimString(fd.label || ''),
            type: type,
            key: key
        };
    }).filter(function(f) { return f.label; });
}

function aiflowLeadMagnetRenderFields(containerEl, config, onChange) {
    if (!containerEl || typeof document === 'undefined') return;
    containerEl.innerHTML = '';
    containerEl.__aiflowLmOnChange = typeof onChange === 'function' ? onChange : null;
    aiflowLeadMagnetFieldsArrayFromConfig(config).forEach(function(fd) {
        var inp = document.createElement('input');
        inp.type = fd.type === 'email' ? 'email' : fd.type === 'tel' ? 'tel' : 'text';
        if (fd.type === 'tel') inp.setAttribute('inputmode', 'numeric');
        inp.placeholder = fd.label;
        inp.className = 'whatsapp-modal-input aiflow-lm-field-input';
        inp.setAttribute('data-aiflow-lm-key', fd.key);
        inp.setAttribute('data-aiflow-lm-type', fd.type);
        inp.required = true;
        inp.addEventListener('input', function() {
            if (containerEl.__aiflowLmOnChange) containerEl.__aiflowLmOnChange();
        });
        containerEl.appendChild(inp);
    });
}

function aiflowLeadMagnetFieldValueValid(type, rawVal) {
    var v = String(rawVal || '').trim();
    if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (type === 'tel') return /^[0-9]{8}$/.test(v.replace(/\s+/g, ''));
    return v.length >= 2;
}

function aiflowLeadMagnetFormValid(fieldsContainer, consentCheckboxEl, config) {
    if (!fieldsContainer) return false;
    var ok = true;
    fieldsContainer.querySelectorAll('.aiflow-lm-field-input').forEach(function(inp) {
        var t = inp.getAttribute('data-aiflow-lm-type') || 'text';
        if (!aiflowLeadMagnetFieldValueValid(t, inp.value)) ok = false;
    });
    if (config && config.consentCheckboxEnabled !== false) {
        if (!consentCheckboxEl || !consentCheckboxEl.checked) ok = false;
    }
    return ok;
}

function aiflowLeadMagnetReadValues(fieldsContainer, consentCheckboxEl, config) {
    var out = {
        name: '',
        email: '',
        whatsapp: '',
        consentAccepted: true,
        answers: {}
    };
    if (!fieldsContainer) return out;
    fieldsContainer.querySelectorAll('.aiflow-lm-field-input').forEach(function(inp) {
        var key = inp.getAttribute('data-aiflow-lm-key') || '';
        var t = inp.getAttribute('data-aiflow-lm-type') || 'text';
        var v = (inp.value || '').trim();
        var stored = t === 'tel' ? v.replace(/\s+/g, '') : v;
        out.answers[key] = stored;
        if (key === 'name') out.name = v;
        else if (key === 'email') out.email = v;
        else if (key === 'phone') out.whatsapp = stored;
    });
    if (config && config.consentCheckboxEnabled !== false) {
        out.consentAccepted = !!(consentCheckboxEl && consentCheckboxEl.checked);
    }
    return out;
}

/**
 * Build a visual capacity bar.
 * @param {number} capacity  - total seats
 * @param {number} enrolled  - seats taken
 * @param {object} [opts]
 * @param {string} [opts.barClass]    - CSS class for the bar wrapper (default: 'capacity-bar')
 * @param {string} [opts.rectClass]   - CSS class for each rect (default: 'capacity-rect')
 * @param {string} [opts.textClass]   - CSS class for the text (default: 'capacity-text')
 * @param {string} [opts.format]      - 'remaining' (尚餘 X/Y 個名額) | 'enrolled' (已有 X/Y 人報名)
 * @param {string} [opts.wrapClass]   - optional outer wrapper class
 */
function buildCapacityBar(capacity, enrolled, opts) {
    capacity = capacity || 0;
    enrolled = enrolled || 0;
    if (capacity <= 0) return '';
    opts = opts || {};

    var barClass  = opts.barClass  || 'capacity-bar';
    var rectClass = opts.rectClass || 'capacity-rect';
    var textClass = opts.textClass || 'capacity-text';
    var format    = opts.format    || 'remaining';
    var wrapClass = opts.wrapClass || '';

    var remaining = Math.max(0, capacity - enrolled);
    var totalRects = capacity <= 10 ? capacity : 10;
    var seatsPerRect = capacity <= 10 ? 1 : capacity / 10;
    var filledRects = Math.min(totalRects, Math.ceil(enrolled / seatsPerRect));

    var html = wrapClass ? '<div class="' + wrapClass + '">' : '';
    html += '<div class="' + barClass + '">';
    for (var i = 0; i < totalRects; i++) {
        html += '<div class="' + rectClass + (i < filledRects ? ' filled' : '') + '"></div>';
    }
    html += '</div>';

    var spanWrap = opts.spanWrap;

    if (remaining <= 0) {
        html += '<div class="' + textClass + '" style="color:var(--accent-text,#E53935);font-weight:700;">已滿</div>';
    } else if (format === 'enrolled') {
        var nums = enrolled + '/' + capacity;
        html += '<div class="' + textClass + '">已有 ' + (spanWrap ? '<span>' + nums + '</span>' : nums) + ' 人報名</div>';
    } else {
        html += '<div class="' + textClass + '">尚餘 ' + remaining + ' / ' + capacity + ' 個名額</div>';
    }

    if (wrapClass) html += '</div>';
    return html;
}

function buildDiamondRating(difficulty) {
    var level = difficulty || 1;
    var html = '<div class="workshop-diamonds">';
    for (var i = 1; i <= 6; i++) {
        html += '<span class="diamond ' + (i <= level ? 'filled' : 'empty') + '">◆</span>';
    }
    var label, labelClass;
    if (level <= 2) { label = '入門'; labelClass = 'dl-beginner'; }
    else if (level <= 4) { label = '進階'; labelClass = 'dl-intermediate'; }
    else { label = '高階'; labelClass = 'dl-advanced'; }
    html += '<span class="difficulty-label ' + labelClass + '">' + label + '</span>';
    html += '</div>';
    return html;
}

function getCtaColorHex(colorId) {
    var map = { accent: '#D97757', dark: '#3A3A3A', green: '#4CAF50', blue: '#2196F3', red: '#E53935', purple: '#9C27B0', grey: '#9E9E9E' };
    return map[colorId] || map.accent;
}

function aiflowIsIncompleteWorkshopPaymentLink(url) {
    var raw = String(url || '').trim();
    return !raw || /^\/workshop-payment\?id=?$/i.test(raw);
}

function aiflowBuildWorkshopPaymentLink(workshopId, fallbackWorkshopId) {
    var wsId = String(workshopId || '').trim() || String(fallbackWorkshopId || '').trim() || 'workshop-0';
    return '/workshop-payment?id=' + encodeURIComponent(wsId);
}

function aiflowToAbsoluteUrl(url, baseUrl) {
    var raw = String(url || '').trim();
    if (!raw) return null;
    var base = String(baseUrl || '').trim();
    if (!base && typeof window !== 'undefined' && window.location && window.location.href) base = window.location.href;
    if (!base) base = 'https://aiflowtime-hk.web.app/';
    try {
        return new URL(raw, base);
    } catch (err) {
        return null;
    }
}

function aiflowNormalizePathname(pathname) {
    var path = String(pathname || '').trim() || '/';
    path = path.replace(/\/+$/, '');
    return path || '/';
}

function aiflowIsSamePageLink(url, opts) {
    opts = opts || {};
    var raw = String(url || '').trim();
    if (!raw) return false;
    if (raw.charAt(0) === '#') return true;
    var currentUrl = String(opts.currentUrl || '').trim();
    if (!currentUrl && typeof window !== 'undefined' && window.location && window.location.href) currentUrl = window.location.href;
    if (!currentUrl) return false;
    var target = aiflowToAbsoluteUrl(raw, opts.baseUrl || currentUrl);
    var current = aiflowToAbsoluteUrl(currentUrl, opts.baseUrl || currentUrl);
    if (!target || !current) return false;
    return target.origin === current.origin &&
        aiflowNormalizePathname(target.pathname) === aiflowNormalizePathname(current.pathname);
}

function aiflowFindVisibleIdTarget(id, root) {
    if (typeof document === 'undefined') return null;
    root = root && root.querySelectorAll ? root : document;
    var safeId = String(id || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    if (!safeId) return null;
    var nodes = root.querySelectorAll('[id="' + safeId + '"]');
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] && nodes[i].getClientRects && nodes[i].getClientRects().length) return nodes[i];
    }
    return null;
}

function aiflowPageHasVisibleSectionType(type, root) {
    if (typeof document === 'undefined') return false;
    root = root && root.querySelectorAll ? root : document;
    var safeType = String(type || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    if (!safeType) return false;
    var nodes = root.querySelectorAll('[data-section-type="' + safeType + '"]');
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] && nodes[i].getClientRects && nodes[i].getClientRects().length) return true;
    }
    return false;
}

function aiflowResolvePaymentCtaLink(rawLink, opts) {
    opts = opts || {};
    var raw = String(rawLink || '').trim();
    var fallback = aiflowBuildWorkshopPaymentLink(opts.workshopId, opts.fallbackWorkshopId);
    if (aiflowIsIncompleteWorkshopPaymentLink(raw)) return fallback;
    if (raw === '#') return fallback;
    if (!opts.allowSamePage && aiflowIsSamePageLink(raw, {
        currentUrl: opts.currentUrl,
        baseUrl: opts.baseUrl
    })) {
        return fallback;
    }
    return raw;
}

function aiflowResolveWorkshopsCtaLink(rawLink, opts) {
    opts = opts || {};
    var raw = String(rawLink || '').trim();
    var workshopsUrl = String(opts.workshopsUrl || '').trim() || '/workshops';
    var hasVisibleWorkshops = typeof opts.hasVisibleWorkshopsSection === 'boolean'
        ? opts.hasVisibleWorkshopsSection
        : !!aiflowFindVisibleIdTarget('workshops', opts.root) || aiflowPageHasVisibleSectionType('workshops', opts.root);
    if (!raw) return hasVisibleWorkshops ? '#workshops' : workshopsUrl;
    if (raw === '#workshops' && !hasVisibleWorkshops) return workshopsUrl;
    return raw;
}

function aiflowEnsureButtonShimmerStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('aiflowButtonShimmerStyle')) return;
    var style = document.createElement('style');
    style.id = 'aiflowButtonShimmerStyle';
    style.textContent =
        '@keyframes aiflow-btn-shimmer {' +
            '0% { left: -100%; }' +
            '100% { left: 100%; }' +
        '}' +
        '.aiflow-btn-shimmer {' +
            'position: relative;' +
            'overflow: hidden;' +
            'isolation: isolate;' +
        '}' +
        '.aiflow-btn-shimmer::after {' +
            'content: "";' +
            'position: absolute;' +
            'top: 0;' +
            'left: -100%;' +
            'width: 60%;' +
            'height: 100%;' +
            'background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%);' +
            'animation: aiflow-btn-shimmer 2.5s ease-in-out infinite;' +
            'box-shadow: 0 8px 24px rgba(217,119,87,0.3);' +
            'pointer-events: none;' +
        '}';
    document.head.appendChild(style);
}

function aiflowSetButtonShimmer(btn, enabled) {
    if (!btn || !btn.classList) return;
    if (enabled) aiflowEnsureButtonShimmerStyle();
    btn.classList.toggle('aiflow-btn-shimmer', !!enabled);
}

function aiflowCreateLayoutPendingController(options) {
    options = options || {};
    if (typeof document === 'undefined') {
        return {
            finish: function() {},
            restart: function() {},
            isPending: function() { return false; }
        };
    }
    var bodyClass = String(options.bodyClass || 'layout-pending').trim() || 'layout-pending';
    var timeoutMs = options.timeoutMs == null ? 6000 : Number(options.timeoutMs);
    if (!isFinite(timeoutMs) || timeoutMs < 0) timeoutMs = 0;
    var timer = null;
    var pending = false;

    function _setPending(next) {
        pending = !!next;
        if (document.body && document.body.classList) document.body.classList.toggle(bodyClass, pending);
    }

    function _clearTimer() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function finish() {
        _clearTimer();
        _setPending(false);
    }

    function restart() {
        _clearTimer();
        _setPending(true);
        if (timeoutMs > 0) timer = setTimeout(finish, timeoutMs);
    }

    restart();

    return {
        finish: finish,
        restart: restart,
        isPending: function() {
            return pending;
        }
    };
}

/**
 * Normalize a Chinese/mixed date string like "2026年4月8日（星期三）"
 * into a zero-padded comparable key "2026-04-08".
 */
function _normDateKey(dateStr) {
    if (!dateStr) return '';
    var m = dateStr.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!m) return dateStr;
    return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}

/**
 * Sort sessions by date then time (ascending).
 */
function sortSessionsList(sessions) {
    if (!sessions || !sessions.length) return [];
    return sessions.slice().sort(function(a, b) {
        var da = _normDateKey(a.date);
        var db2 = _normDateKey(b.date);
        if (da !== db2) return da < db2 ? -1 : 1;
        var ta = (a.time || '').replace(/[^0-9:]/g, '');
        var tb = (b.time || '').replace(/[^0-9:]/g, '');
        return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
}

/**
 * Mobile menu toggle (hamburger nav).
 * Expects: .hamburger button, #mobileMenu element.
 */
function toggleMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var mobileMenu = document.getElementById('mobileMenu');
    if (!hamburger || !mobileMenu) return;
    var isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', !isExpanded);
    mobileMenu.setAttribute('aria-hidden', String(isExpanded));
}

function closeMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var mobileMenu = document.getElementById('mobileMenu');
    if (!hamburger || !mobileMenu) return;
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
}

/**
 * Scroll-reveal observer. Adds 'visible' class when elements enter viewport.
 * @param {string} selector - CSS selector for elements to observe
 * @param {object} [opts]
 * @param {number} [opts.threshold] - IntersectionObserver threshold (default 0.1)
 * @param {string} [opts.activeClass] - class to add (default 'visible')
 */
function initScrollReveal(selector, opts) {
    opts = opts || {};
    var threshold = opts.threshold || 0.1;
    var activeClass = opts.activeClass || 'visible';
    function isInViewport(el) {
        if (!el || typeof el.getBoundingClientRect !== 'function') return false;
        var rect = el.getBoundingClientRect();
        var vw = window.innerWidth || document.documentElement.clientWidth || 0;
        var vh = window.innerHeight || document.documentElement.clientHeight || 0;
        return rect.width > 0 && rect.height > 0 &&
            rect.bottom >= 0 &&
            rect.right >= 0 &&
            rect.top <= vh &&
            rect.left <= vw;
    }

    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll(selector).forEach(function(el) { el.classList.add(activeClass); });
        return;
    }

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add(activeClass);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: threshold });

    document.querySelectorAll(selector).forEach(function(el) {
        if (el.classList.contains(activeClass) || isInViewport(el)) {
            el.classList.add(activeClass);
            return;
        }
        observer.observe(el);
    });
}

var _aiflowFreeMaterialConfigs = {};
var _aiflowFreeMaterialState = { activeKey: '', busy: false, selectedDoc: null };
var _aiflowOutboundEmailCache = { at: 0, ttlMs: 45000, data: null };

/** Public read: siteSettings/emailOutbound — used before writing `mail` for Trigger Email. */
function aiflowInvalidateOutboundEmailSettingsCache() {
    _aiflowOutboundEmailCache.at = 0;
    _aiflowOutboundEmailCache.data = null;
}

function aiflowFetchOutboundEmailSettings(db) {
    if (!db) return Promise.resolve({ outboundFrom: '', outboundReplyTo: '' });
    var now = Date.now();
    if (_aiflowOutboundEmailCache.data && (now - _aiflowOutboundEmailCache.at) < _aiflowOutboundEmailCache.ttlMs) {
        return Promise.resolve(_aiflowOutboundEmailCache.data);
    }
    return db.collection('siteSettings').doc('emailOutbound').get().then(function(doc) {
        var out = { outboundFrom: '', outboundReplyTo: '' };
        if (doc.exists) {
            var d = doc.data() || {};
            out.outboundFrom = _aiflowTrimString(d.outboundFrom || '');
            out.outboundReplyTo = _aiflowTrimString(d.outboundReplyTo || '');
        }
        _aiflowOutboundEmailCache = { at: Date.now(), ttlMs: _aiflowOutboundEmailCache.ttlMs || 45000, data: out };
        return out;
    }).catch(function() {
        return { outboundFrom: '', outboundReplyTo: '' };
    });
}
if (typeof window !== 'undefined') {
    window.aiflowInvalidateOutboundEmailSettingsCache = aiflowInvalidateOutboundEmailSettingsCache;
}

function _aiflowFreeMaterialRichText(html) {
    return typeof sanitizeHeroTitleHtml === 'function'
        ? sanitizeHeroTitleHtml(html || '')
        : escHtml(html || '').replace(/\n/g, '<br>');
}

function _aiflowFreeMaterialTheme(theme) {
    theme = theme || {};
    return {
        surface: theme.surface || '#ffffff',
        surfaceAlt: theme.surfaceAlt || 'rgba(255,255,255,0.72)',
        text: theme.text || '#231f20',
        muted: theme.muted || 'rgba(35,31,32,0.72)',
        accent: theme.accent || '#D97757',
        accentText: theme.accentText || '#ffffff',
        border: theme.border || 'rgba(35,31,32,0.10)',
        backdrop: theme.backdrop || 'rgba(20,16,14,0.56)'
    };
}

function _aiflowNormalizeDocs(cfg) {
    var docs = Array.isArray(cfg.documents) ? cfg.documents.filter(function(d) { return d && d.url; }) : [];
    if (!docs.length && cfg.pdfUrl) {
        docs = [{ name: cfg.fileName || cfg.pdfUrl.split('/').pop().split('?')[0] || 'document', url: cfg.pdfUrl, fileName: cfg.fileName || '' }];
    }
    return docs;
}

function _aiflowDocExtLabel(name) {
    var ext = String(name || '').split('.').pop().toLowerCase();
    var map = { pdf:'PDF', doc:'DOC', docx:'DOC', ppt:'PPT', pptx:'PPT', xls:'XLS', xlsx:'XLS', zip:'ZIP' };
    return map[ext] || 'FILE';
}

function _aiflowEnsureFreeMaterialStyles() {
    if (document.getElementById('aiflowFreeMaterialStyles')) return;
    var style = document.createElement('style');
    style.id = 'aiflowFreeMaterialStyles';
    style.textContent =
        '.af-free-material-shell{width:min(1100px,100%);margin:0 auto;display:grid;grid-template-columns:minmax(260px,1.02fr) minmax(320px,1fr);gap:28px;align-items:center;}' +
        '.af-free-material-visual{border-radius:28px;overflow:hidden;min-height:280px;background:var(--af-surface-alt);border:1px solid var(--af-border);box-shadow:0 22px 56px rgba(0,0,0,0.08);}' +
        '.af-free-material-visual img{display:block;width:100%;height:100%;object-fit:cover;}' +
        '.af-free-material-copy{padding:8px 0;}' +
        '.af-free-material-label{margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--af-accent);}' +
        '.af-free-material-title{margin:0;font-size:clamp(30px,4vw,54px);line-height:1.06;color:var(--af-text);font-weight:800;}' +
        '.af-free-material-desc{margin:16px 0 0;font-size:16px;line-height:1.8;color:var(--af-muted);}' +
        '.af-free-material-helper{margin:14px 0 0;font-size:13px;line-height:1.7;color:var(--af-muted);}' +
        '.af-free-material-btn{margin-top:24px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 22px;border:none;border-radius:999px;background:var(--af-accent);color:var(--af-accent-text);font:inherit;font-weight:700;cursor:pointer;box-shadow:0 16px 30px rgba(0,0,0,0.12);}' +
        '.af-free-material-btn:hover{transform:translateY(-1px);}' +
        '#aiflowDocPickerModal.af-free-material-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:24px;background:var(--af-modal-backdrop);}' +
        '#aiflowDocPickerModal.af-free-material-modal.show{display:flex;}' +
        '#aiflowDocPickerModal .af-free-material-dialog{width:min(560px,100%);background:#fff;border-radius:24px;padding:26px;box-shadow:0 24px 80px rgba(0,0,0,0.20);position:relative;}' +
        '#aiflowDocPickerModal .af-free-material-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border:none;border-radius:50%;background:rgba(0,0,0,0.06);color:#333;font-size:20px;cursor:pointer;}' +
        '#aiflowDocPickerModal .af-free-material-dialog h3{margin:0;font-size:28px;line-height:1.1;color:#231f20;}' +
        '#aiflowDocPickerModal .af-free-material-dialog p{margin:12px 0 0;color:rgba(35,31,32,0.72);line-height:1.7;}' +
        '#aiflowFreeMaterialModal.whatsapp-modal-overlay{--brand-orange:#D97706;--text-primary:#1F2937;--text-secondary:#6B7280;--border-light:#E5E7EB;--bg-pampas:#F4F3EE;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:10000;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;overflow:visible;padding:20px;box-sizing:border-box;}' +
        '#aiflowFreeMaterialModal.whatsapp-modal-overlay.active{display:flex;opacity:1;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal{background:var(--bg-pampas);border-radius:1rem;padding:0;max-width:500px;width:100%;max-height:90vh;overflow:hidden;position:relative;display:flex;flex-direction:column;transform:scale(0.9);transition:transform 0.3s ease;box-shadow:none;font-family:inherit;}' +
        '#aiflowFreeMaterialModal.whatsapp-modal-overlay.active .whatsapp-modal{transform:scale(1);}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-media{flex:0 0 clamp(150px,36vh,260px);min-height:150px;max-height:min(40vh,280px);position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(244,243,238,0.92) 0%,var(--bg-pampas) 100%);}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-media[hidden]{display:none !important;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-content{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:visible;padding:1.5rem 2rem 2rem;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-header{margin-bottom:1.5rem;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-header h3{font-size:1rem;font-weight:600;line-height:1.35;color:var(--text-primary);margin:0 0 0.5rem 0;white-space:normal;overflow-wrap:anywhere;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-header p{color:var(--text-secondary);font-size:0.875rem;margin:0;line-height:1.5;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-close{position:absolute;top:0.75rem;right:0.75rem;z-index:5;background:rgba(255,255,255,0.72);border:none;font-size:1.5rem;color:var(--text-secondary);cursor:pointer;width:2.35rem;height:2.35rem;display:flex;align-items:center;justify-content:center;border-radius:999px;transition:all 0.2s ease;line-height:1;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-close:hover{background:#ffffff;color:var(--text-primary);}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-form{display:flex;flex-direction:column;gap:1rem;margin:0;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-form label.field-lbl{display:block;margin-bottom:0.35rem;font-size:0.8125rem;font-weight:600;color:var(--text-primary);}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-input{width:100%;padding:0.75rem 1rem;border:1px solid var(--border-light);border-radius:0.5rem;font-size:1rem;transition:all 0.2s ease;background:#fff;color:#1F2937;box-sizing:border-box;font:inherit;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-input:focus{outline:none;border-color:var(--brand-orange);box-shadow:0 0 0 3px rgba(217,119,6,0.1);}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-checkbox-label{display:flex;align-items:flex-start;gap:0.75rem;cursor:pointer;font-size:0.875rem;color:var(--text-secondary);line-height:1.5;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-checkbox{margin-top:0.125rem;width:1.25rem;height:1.25rem;cursor:pointer;flex-shrink:0;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-submit{background:var(--brand-orange);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:0.5rem;font-size:1rem;font-weight:600;cursor:pointer;transition:all 0.2s ease;font:inherit;}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-submit:hover:not(:disabled){background:#B45309;transform:translateY(-1px);}' +
        '#aiflowFreeMaterialModal .whatsapp-modal-submit:disabled{background:#D1D5DB;color:#9CA3AF;cursor:not-allowed;opacity:0.6;}' +
        '#aiflowFreeMaterialModal .af-free-material-status{font-size:0.875rem;line-height:1.5;min-height:1.25rem;color:var(--text-secondary);}' +
        '#aiflowFreeMaterialModal .af-free-material-status.error{color:#b3261e;}' +
        '#aiflowFreeMaterialModal .af-free-material-status.success{color:#177245;}' +
        '@media (max-width:640px){#aiflowFreeMaterialModal .whatsapp-modal{width:95%;}#aiflowFreeMaterialModal .whatsapp-modal-content{padding:1.25rem 1.5rem 1.5rem;}}' +
        '.af-doc-picker-list{display:flex;flex-direction:column;gap:10px;margin:20px 0 0;}' +
        '.af-doc-picker-card{display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(35,31,32,0.03);border:1px solid rgba(35,31,32,0.08);border-radius:16px;cursor:pointer;transition:all .15s;}' +
        '.af-doc-picker-card:hover{background:rgba(217,119,87,0.08);border-color:rgba(217,119,87,0.3);transform:translateY(-1px);}' +
        '.af-doc-picker-badge{flex:0 0 44px;height:44px;display:flex;align-items:center;justify-content:center;background:#D97757;color:#fff;border-radius:12px;font-size:13px;font-weight:800;letter-spacing:.04em;}' +
        '.af-doc-picker-name{flex:1;min-width:0;font-size:15px;font-weight:600;color:#231f20;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.af-doc-picker-arrow{flex:0 0 20px;color:rgba(35,31,32,0.3);font-size:18px;}' +
        '@media (max-width: 860px){.af-free-material-shell{grid-template-columns:1fr;gap:18px;}.af-free-material-visual{min-height:220px;}#aiflowDocPickerModal .af-free-material-dialog{padding:22px 18px;}}';
    document.head.appendChild(style);
}

function registerFreeMaterialConfig(pageKey, sectionId, content) {
    var key = String(pageKey || 'page') + '::' + String(sectionId || ('section-' + Date.now()));
    var clone = _aiflowDeepClone(content || {});
    delete clone.__leadDefinitionResolved;
    _aiflowFreeMaterialConfigs[key] = clone;
    return key;
}

function renderFreeMaterialSection(el, pageKey, sectionId, content, theme) {
    if (!el) return;
    _aiflowEnsureFreeMaterialStyles();
    var cfg = content || {};
    var leadDefinitionId = _aiflowTrimString(cfg.leadDefinitionId || '');
    if (leadDefinitionId && !cfg.__leadDefinitionResolved && typeof aiflowFetchLeadDefinitionById === 'function') {
        var baseCfg = _aiflowDeepClone(cfg);
        baseCfg.__leadDefinitionResolved = true;
        aiflowFetchLeadDefinitionById(leadDefinitionId).then(function(definition) {
            if (!definition) return;
            var mergedCfg = aiflowApplyLeadDefinitionToFreeMaterialContent(baseCfg, definition);
            mergedCfg.__leadDefinitionResolved = true;
            renderFreeMaterialSection(el, pageKey, sectionId, mergedCfg, theme);
        }).catch(function(err) {
            console.warn('[free-material] lead definition load failed:', err);
        });
        cfg = baseCfg;
    }
    var th = _aiflowFreeMaterialTheme(theme);
    var key = registerFreeMaterialConfig(pageKey, sectionId, cfg);
    var title = _aiflowFreeMaterialRichText(cfg.title || '');
    var desc = _aiflowFreeMaterialRichText(cfg.description || '');
    var label = _aiflowFreeMaterialRichText(cfg.sectionLabel || '');
    var helper = _aiflowFreeMaterialRichText(cfg.helperNote || '');
    var imageUrl = escHtml(cfg.imageUrl || '');
    var imageAlt = escHtml(cfg.imageAlt || cfg.materialTitle || 'Free material');
    var ctaText = escHtml(cfg.ctaText || '領取免費資料');
    el.classList.add('af-free-material-root');
    el.style.padding = '48px 24px';
    el.style.setProperty('--af-surface', th.surface);
    el.style.setProperty('--af-surface-alt', th.surfaceAlt);
    el.style.setProperty('--af-text', th.text);
    el.style.setProperty('--af-muted', th.muted);
    el.style.setProperty('--af-accent', th.accent);
    el.style.setProperty('--af-accent-text', th.accentText);
    el.style.setProperty('--af-border', th.border);
    el.innerHTML =
        '<div class="af-free-material-shell">' +
            '<div class="af-free-material-visual">' +
                (imageUrl ? '<img src="' + imageUrl + '" alt="' + imageAlt + '" loading="lazy" decoding="async">' : '') +
            '</div>' +
            '<div class="af-free-material-copy">' +
                (label ? '<div class="af-free-material-label">' + label + '</div>' : '') +
                (title ? '<div class="af-free-material-title">' + title + '</div>' : '') +
                (desc ? '<div class="af-free-material-desc">' + desc + '</div>' : '') +
                (helper ? '<div class="af-free-material-helper">' + helper + '</div>' : '') +
                '<button type="button" class="af-free-material-btn">' + ctaText + '</button>' +
            '</div>' +
        '</div>';
    var btn = el.querySelector('.af-free-material-btn');
    if (btn) {
        btn.onclick = function() {
            _aiflowFreeMaterialCta(key, th, {
                pageKey: pageKey,
                pagePath: window.location.pathname,
                pageTitle: document.title,
                sectionId: sectionId
            });
        };
    }
}

function _aiflowFreeMaterialCta(key, theme, meta) {
    var cfg = _aiflowFreeMaterialConfigs[key];
    if (!cfg) return;
    var docs = _aiflowNormalizeDocs(cfg);
    if (docs.length <= 1) {
        _aiflowFreeMaterialState.selectedDoc = docs[0] || null;
        openFreeMaterialModalByKey(key, theme, meta);
    } else {
        _aiflowOpenDocPicker(key, docs, theme, meta);
    }
}

function _aiflowOpenDocPicker(key, docs, theme, meta) {
    _aiflowEnsureFreeMaterialStyles();
    var th = _aiflowFreeMaterialTheme(theme);
    var cfg = _aiflowFreeMaterialConfigs[key] || {};
    var picker = document.getElementById('aiflowDocPickerModal');
    if (!picker) {
        picker = document.createElement('div');
        picker.id = 'aiflowDocPickerModal';
        picker.className = 'af-free-material-modal';
        picker.innerHTML =
            '<div class="af-free-material-dialog" style="max-width:480px;">' +
                '<button type="button" class="af-free-material-close" aria-label="Close">&times;</button>' +
                '<h3 id="aiflowDocPickerTitle"></h3>' +
                '<p id="aiflowDocPickerDesc"></p>' +
                '<div class="af-doc-picker-list" id="aiflowDocPickerList"></div>' +
            '</div>';
        document.body.appendChild(picker);
        picker.addEventListener('click', function(e) { if (e.target === picker) _aiflowCloseDocPicker(); });
        picker.querySelector('.af-free-material-close').onclick = _aiflowCloseDocPicker;
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && picker.classList.contains('show')) _aiflowCloseDocPicker();
        });
    }
    picker.style.setProperty('--af-modal-backdrop', th.backdrop);
    picker.querySelector('#aiflowDocPickerTitle').innerHTML = _aiflowFreeMaterialRichText(cfg.materialTitle || cfg.title || '選擇資料');
    picker.querySelector('#aiflowDocPickerDesc').textContent = '請選擇你要領取的文件：';
    var list = picker.querySelector('#aiflowDocPickerList');
    list.innerHTML = '';
    docs.forEach(function(d, i) {
        var card = document.createElement('div');
        card.className = 'af-doc-picker-card';
        card.innerHTML =
            '<div class="af-doc-picker-badge">' + escHtml(_aiflowDocExtLabel(d.fileName || d.name || '')) + '</div>' +
            '<div class="af-doc-picker-name">' + escHtml(d.name || d.fileName || ('文件 ' + (i + 1))) + '</div>' +
            '<div class="af-doc-picker-arrow">&#8250;</div>';
        card.onclick = (function(idx) {
            return function() {
                _aiflowFreeMaterialState.selectedDoc = docs[idx];
                _aiflowCloseDocPicker();
                openFreeMaterialModalByKey(key, theme, meta);
            };
        })(i);
        list.appendChild(card);
    });
    picker.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function _aiflowCloseDocPicker() {
    var picker = document.getElementById('aiflowDocPickerModal');
    if (picker) picker.classList.remove('show');
    document.body.style.overflow = '';
}

function _aiflowEnsureFreeMaterialModal() {
    _aiflowEnsureFreeMaterialStyles();
    var modal = document.getElementById('aiflowFreeMaterialModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'aiflowFreeMaterialModal';
    modal.className = 'whatsapp-modal-overlay';
    modal.innerHTML =
        '<div class="whatsapp-modal" onclick="event.stopPropagation()">' +
            '<button type="button" class="whatsapp-modal-close" aria-label="Close">&times;</button>' +
            '<div class="whatsapp-modal-media" id="aiflowFmModalMediaWrap" hidden>' +
                '<img id="aiflowFmModalImage" src="" alt="" class="whatsapp-modal-image" loading="eager" decoding="async">' +
            '</div>' +
            '<div class="whatsapp-modal-content">' +
                '<div class="whatsapp-modal-header">' +
                    '<h3 id="aiflowFreeMaterialModalTitle"></h3>' +
                    '<p id="aiflowFreeMaterialModalDesc"></p>' +
                '</div>' +
                '<form class="whatsapp-modal-form" id="aiflowFreeMaterialForm">' +
                    '<div>' +
                        '<label class="field-lbl" id="aiflowFmNameLabel" for="aiflowFmName">姓名</label>' +
                        '<input id="aiflowFmName" class="whatsapp-modal-input" name="name" type="text" autocomplete="name" required>' +
                    '</div>' +
                    '<div>' +
                        '<label class="field-lbl" id="aiflowFmEmailLabel" for="aiflowFmEmail">Email</label>' +
                        '<input id="aiflowFmEmail" class="whatsapp-modal-input" name="email" type="email" autocomplete="email" required>' +
                    '</div>' +
                    '<label class="whatsapp-modal-checkbox-label" id="aiflowFmConsentWrap">' +
                        '<input type="checkbox" id="aiflowFmConsent" name="consent" class="whatsapp-modal-checkbox">' +
                        '<span id="aiflowFmConsentText"></span>' +
                    '</label>' +
                    '<div class="af-free-material-status" id="aiflowFmStatus"></div>' +
                    '<button class="whatsapp-modal-submit" id="aiflowFmSubmit" type="submit">送出</button>' +
                '</form>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeFreeMaterialModal();
    });
    var closer = modal.querySelector('.whatsapp-modal-close');
    if (closer) closer.onclick = closeFreeMaterialModal;
    modal.querySelector('#aiflowFreeMaterialForm').addEventListener('submit', _submitFreeMaterialRequest);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeFreeMaterialModal();
    });
    return modal;
}

function openFreeMaterialModalByKey(key, theme, meta) {
    var cfg = _aiflowFreeMaterialConfigs[key];
    if (!cfg) return;
    var modal = _aiflowEnsureFreeMaterialModal();
    _aiflowFreeMaterialState.activeKey = key;
    _aiflowFreeMaterialState.meta = meta || {};
    _aiflowFreeMaterialState.theme = _aiflowFreeMaterialTheme(theme);
    var doc = _aiflowFreeMaterialState.selectedDoc;
    var docName = (doc && doc.name) ? ' — ' + doc.name : '';
    var mediaWrap = modal.querySelector('#aiflowFmModalMediaWrap');
    var imgEl = modal.querySelector('#aiflowFmModalImage');
    var heroImg = _aiflowTrimString(cfg.imageUrl || '');
    if (heroImg && imgEl && mediaWrap) {
        imgEl.src = typeof fixStorageUrl === 'function' ? fixStorageUrl(heroImg) : heroImg;
        imgEl.alt = _aiflowTrimString(cfg.imageAlt || cfg.materialTitle || 'Free material') || 'Free material';
        mediaWrap.hidden = false;
    } else if (mediaWrap && imgEl) {
        imgEl.removeAttribute('src');
        imgEl.alt = '';
        mediaWrap.hidden = true;
    }
    modal.querySelector('#aiflowFreeMaterialModalTitle').innerHTML = _aiflowFreeMaterialRichText((cfg.materialTitle || cfg.title || '免費資料下載') + docName);
    var descEl = modal.querySelector('#aiflowFreeMaterialModalDesc');
    var descHtml = _aiflowFreeMaterialRichText(cfg.description || '');
    if (descEl) {
        descEl.innerHTML = descHtml;
        descEl.style.display = (_aiflowTrimString(String(cfg.description || '').replace(/<[^>]+>/g, ' '))) ? '' : 'none';
    }
    modal.querySelector('#aiflowFmNameLabel').textContent = cfg.nameFieldLabel || '姓名';
    modal.querySelector('#aiflowFmEmailLabel').textContent = cfg.emailFieldLabel || 'Email';
    modal.querySelector('#aiflowFmConsentText').innerHTML = _aiflowFreeMaterialRichText(cfg.consentText || '');
    modal.querySelector('#aiflowFmConsentWrap').style.display = cfg.consentText ? 'flex' : 'none';
    modal.querySelector('#aiflowFmConsent').checked = false;
    modal.querySelector('#aiflowFmSubmit').textContent = cfg.submitText || '立即寄送';
    modal.querySelector('#aiflowFmStatus').textContent = '';
    modal.querySelector('#aiflowFmStatus').className = 'af-free-material-status';
    modal.querySelector('#aiflowFreeMaterialForm').reset();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(function() {
        var inp = modal.querySelector('#aiflowFmName');
        if (inp) inp.focus();
    }, 20);
}

function closeFreeMaterialModal() {
    var modal = document.getElementById('aiflowFreeMaterialModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    _aiflowFreeMaterialState.busy = false;
}

function _aiflowApplyEmailTemplateTokens(template, map) {
    var out = String(template || '');
    if (!map) return out;
    Object.keys(map).forEach(function(k) {
        var val = map[k] == null ? '' : String(map[k]);
        var re = new RegExp('\\{' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}', 'g');
        out = out.replace(re, val);
    });
    return out;
}

function _aiflowUrlLooksLikeDownloadableFile(url) {
    var u = String(url || '').split('?')[0].toLowerCase();
    return /\.(pdf|zip|docx?|xlsx?|pptx?|epub)$/.test(u);
}

/** CMS：deliveryIncludeDocuments + 可下載副檔名 → Trigger Email 附件 */
function _aiflowMailShouldAttachFile(cfg, attachDocUrl) {
    if (!cfg || cfg.deliveryIncludeDocuments === false) return false;
    if (!attachDocUrl) return false;
    return _aiflowUrlLooksLikeDownloadableFile(attachDocUrl);
}

function _buildFreeMaterialEmailHtml(name, doc, cfg) {
    var title = cfg.materialTitle || '免費資料';
    var docName = (doc && (doc.name || doc.fileName)) || cfg.fileName || 'notes.pdf';
    var docUrl = (doc && doc.url) || cfg.pdfUrl || '';
    var idLinks = _aiflowNormalizeIdentityLinks(cfg.identityLinks || []);
    if (!docUrl && idLinks[0]) docUrl = idLinks[0].url;
    var primaryAttach = (doc && doc.url) || _aiflowTrimString(cfg.pdfUrl || '');
    var linkOnly = !(cfg.deliveryIncludeDocuments !== false && primaryAttach && _aiflowUrlLooksLikeDownloadableFile(primaryAttach));
    function _fmEsc(s) {
        return typeof escHtml === 'function'
            ? escHtml(String(s || ''))
            : String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }
    var safeName = _fmEsc(name);
    var safeTitle = _fmEsc(title);
    var safeDocName = _fmEsc(docName);
    var tmpl = _aiflowTrimString(cfg.emailMessage || '');
    if (tmpl) {
        var filled = _aiflowApplyEmailTemplateTokens(tmpl, {
            name: safeName,
            materialTitle: safeTitle,
            downloadUrl: docUrl,
            documentName: safeDocName
        });
        var customHtml;
        if (/<[a-z][\s\S]*>/i.test(filled)) {
            customHtml = sanitizeFreeMaterialEmailHtml(filled);
        } else {
            customHtml = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">' +
                _aiflowEmailQuotedLabelLinksToHtml(filled) + '</div>';
        }
        if (_freeMaterialEmailHasVisibleContent(customHtml)) return customHtml;
        tmpl = '';
    }
    if (linkOnly) {
        var linkRows = idLinks.length ? idLinks : [{ title: '', url: docUrl }];
        var btns = linkRows.map(function(l) {
            var u = _aiflowTrimString(l.url || '');
            if (!u) return '';
            var lab = _fmEsc(_aiflowTrimString(l.title || '') || '開啟連結');
            return '<p style="margin:12px 0;"><a href="' + _fmEsc(u) + '" ' +
                'style="display:inline-block;padding:12px 28px;background:#FF6B2C;color:#fff;' +
                'text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">' +
                lab + '</a></p>';
        }).join('');
        return '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">' +
            '<h2 style="color:#222;">Hi ' + safeName + '!</h2>' +
            '<p style="font-size:16px;line-height:1.6;color:#444;">感謝你的申請！你請求的「<strong>' +
            safeTitle + '</strong>」請透過下方連結開啟或下載。</p>' +
            btns +
            '<hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;">' +
            '<p style="font-size:12px;color:#999;">此郵件由 AIFLOWTIME 自動發送。</p>' +
            '</div>';
    }
    return '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">' +
        '<h2 style="color:#222;">Hi ' + safeName + '!</h2>' +
        '<p style="font-size:16px;line-height:1.6;color:#444;">感謝你的申請！你請求的「<strong>' +
        safeTitle + '</strong>」已附在這封 email 中。</p>' +
        '<p style="font-size:16px;line-height:1.6;color:#444;">如果附件未能顯示，你也可以直接點擊下方連結下載：</p>' +
        '<p style="margin:20px 0;"><a href="' + _fmEsc(docUrl) + '" ' +
        'style="display:inline-block;padding:12px 28px;background:#FF6B2C;color:#fff;' +
        'text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">' +
        '下載 ' + safeDocName + '</a></p>' +
        '<hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;">' +
        '<p style="font-size:12px;color:#999;">此郵件由 AIFLOWTIME 自動發送。</p>' +
        '</div>';
}

/**
 * Write freeMaterialLeads + mail (Firebase email extension). Optional mirror handled by caller.
 */
function aiflowSendMaterialEmailFromBrowser(opts) {
    opts = opts || {};
    var name = String(opts.name || '').trim();
    var email = String(opts.email || '').trim();
    var cfg = opts.cfg || {};
    var doc = opts.doc || null;
    if (!doc) doc = (_aiflowNormalizeDocs(cfg) || [])[0] || null;
    var attachUrl = (doc && doc.url) || _aiflowTrimString(cfg.pdfUrl || '');
    var idLinks = _aiflowNormalizeIdentityLinks(cfg.identityLinks || []);
    var docUrl = attachUrl || (idLinks[0] && idLinks[0].url) || '';
    var docName = (doc && (doc.name || doc.fileName)) || cfg.fileName || '';
    var db = opts.db;
    if (!db) {
        try { db = firebase.firestore(); } catch (_) {}
    }
    if (!db || !email || !docUrl) {
        return Promise.reject(new Error('aiflowSendMaterialEmailFromBrowser: need Firestore, email, and document URL'));
    }
    var docForHtml = doc;
    if (!docForHtml && idLinks[0]) {
        docForHtml = { url: idLinks[0].url, name: idLinks[0].title || 'link', fileName: '' };
    }
    var leadRef = db.collection('freeMaterialLeads').doc();
    var subject = _aiflowTrimString(cfg.emailSubject || '') || ('AIFLOWTIME — ' + (cfg.materialTitle || '你的免費資料'));
    var htmlBody = _buildFreeMaterialEmailHtml(name, docForHtml, cfg);
    var useAttachment = _aiflowMailShouldAttachFile(cfg, attachUrl);
    var attachFileName = docName || 'document';
    if (!/\.\w{2,5}$/.test(attachFileName)) attachFileName += '.pdf';
    var meta = opts.meta || {};
    var leadData = {
        name: name,
        email: email,
        materialTitle: cfg.materialTitle || '',
        documentName: docName,
        documentUrl: docUrl,
        leadDefinitionId: _aiflowTrimString(cfg.leadDefinitionId || ''),
        leadDefinitionType: _aiflowTrimString(cfg.leadDefinitionType || 'free-material'),
        leadDefinitionName: _aiflowTrimString(cfg.leadDefinitionName || ''),
        submissionSource: String(meta.submissionSource || ''),
        pageKey: meta.pageKey || '',
        pagePath: meta.pagePath || (typeof window !== 'undefined' ? window.location.pathname : ''),
        pageTitle: meta.pageTitle || (typeof document !== 'undefined' ? document.title : ''),
        sectionId: meta.sectionId || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        deliveryIncludeDocuments: cfg.deliveryIncludeDocuments !== false,
        deliveryIncludeLinks: !!cfg.deliveryIncludeLinks,
        identityLinks: idLinks.slice()
    };
    leadData.mailDocId = leadRef.id;
    if (opts.consentAccepted !== undefined) leadData.consentAccepted = !!opts.consentAccepted;
    var leadId = leadRef.id;
    return aiflowFetchOutboundEmailSettings(db).then(function(ob) {
        var mailData = {
            to: [email],
            message: {
                subject: subject,
                html: htmlBody
            }
        };
        if (useAttachment) {
            mailData.message.attachments = [{ filename: attachFileName, path: attachUrl }];
        }
        if (ob && ob.outboundFrom) mailData.from = ob.outboundFrom;
        if (ob && ob.outboundReplyTo) mailData.replyTo = ob.outboundReplyTo;
        return Promise.all([
            leadRef.set(leadData),
            db.collection('mail').doc(leadRef.id).set(mailData)
        ]);
    }).then(function() {
        return { leadId: leadId };
    });
}

/** Queue a WhatsApp message for future automation (Meta verification pending). */
function aiflowQueueWhatsappOutreach(opts) {
    opts = opts || {};
    var phone = String(opts.phone || '').trim();
    var body = String(opts.body || '').trim();
    if (!phone || !body) return Promise.resolve(false);
    var db = opts.db;
    if (!db) {
        try { db = firebase.firestore(); } catch (_) {}
    }
    if (!db) return Promise.resolve(false);
    return db.collection('whatsappOutreachQueue').add({
        toPhone: phone,
        body: body,
        leadDefinitionId: _aiflowTrimString(opts.leadDefinitionId || ''),
        source: String(opts.source || 'lead-magnet'),
        documentUrl: String(opts.documentUrl || ''),
        contactName: String(opts.contactName || ''),
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() { return true; }).catch(function(err) {
        console.warn('[whatsappOutreachQueue]', err);
        return false;
    });
}

function _submitFreeMaterialRequest(e) {
    e.preventDefault();
    if (_aiflowFreeMaterialState.busy) return;
    var key = _aiflowFreeMaterialState.activeKey;
    var cfg = _aiflowFreeMaterialConfigs[key];
    var modal = document.getElementById('aiflowFreeMaterialModal');
    if (!cfg || !modal) return;
    var nameInput = modal.querySelector('#aiflowFmName');
    var emailInput = modal.querySelector('#aiflowFmEmail');
    var consentInput = modal.querySelector('#aiflowFmConsent');
    var submitBtn = modal.querySelector('#aiflowFmSubmit');
    var status = modal.querySelector('#aiflowFmStatus');
    var name = String((nameInput && nameInput.value) || '').trim();
    var email = String((emailInput && emailInput.value) || '').trim();
    var consentAccepted = !cfg.consentText || !!(consentInput && consentInput.checked);

    var doc = _aiflowFreeMaterialState.selectedDoc;
    if (!doc) {
        var docs = _aiflowNormalizeDocs(cfg);
        doc = docs[0] || null;
    }
    var docUrl = (doc && doc.url) || cfg.pdfUrl || '';
    var docName = (doc && (doc.name || doc.fileName)) || cfg.fileName || '';

    if (!name || !email) {
        status.textContent = '請先填寫姓名和 email。';
        status.className = 'af-free-material-status error';
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = '請輸入有效的 email。';
        status.className = 'af-free-material-status error';
        return;
    }
    if (!docUrl) {
        status.textContent = '這份資料尚未設定文件連結。';
        status.className = 'af-free-material-status error';
        return;
    }
    if (!consentAccepted) {
        status.textContent = '請先勾選同意條款。';
        status.className = 'af-free-material-status error';
        return;
    }
    var db;
    try { db = firebase.firestore(); } catch (_) {}
    if (!db) {
        status.textContent = '系統初始化中，請稍後再試。';
        status.className = 'af-free-material-status error';
        return;
    }
    _aiflowFreeMaterialState.busy = true;
    submitBtn.disabled = true;
    status.textContent = '正在寄送資料...';
    status.className = 'af-free-material-status';

    var meta = _aiflowFreeMaterialState.meta || {};
    aiflowSendMaterialEmailFromBrowser({
        name: name,
        email: email,
        cfg: cfg,
        doc: doc,
        db: db,
        consentAccepted: consentAccepted,
        meta: {
            submissionSource: 'free-material-modal',
            pageKey: meta.pageKey || '',
            pagePath: meta.pagePath || window.location.pathname,
            pageTitle: meta.pageTitle || document.title,
            sectionId: meta.sectionId || ''
        }
    }).then(function(res) {
        var leadId = res && res.leadId;
        if (typeof saveFormSubmissionMirror === 'function' && leadId) {
            return saveFormSubmissionMirror({
                formType: 'free-material',
                sourceKey: cfg.leadDefinitionId ? ('lead-definition:' + cfg.leadDefinitionId) : 'free-material-modal',
                sourceLabel: cfg.leadDefinitionName || cfg.materialTitle || '免費資料下載',
                sourcePage: meta.pageTitle || document.title || '',
                sourcePath: meta.pagePath || window.location.pathname,
                sourceUrl: window.location.href,
                sourceCollection: 'freeMaterialLeads',
                sourceDocId: leadId,
                leadDefinitionId: cfg.leadDefinitionId || '',
                leadDefinitionType: cfg.leadDefinitionType || 'free-material',
                leadDefinitionName: cfg.leadDefinitionName || '',
                contactName: name,
                email: email,
                answers: {
                    leadDefinitionName: cfg.leadDefinitionName || '',
                    materialTitle: cfg.materialTitle || '',
                    documentName: docName,
                    pageKey: meta.pageKey || '',
                    sectionId: meta.sectionId || '',
                    consentAccepted: consentAccepted
                }
            }, { db: db });
        }
    }).then(function() {
        status.textContent = cfg.successMessage || '已寄送，請查看你的 email。';
        status.className = 'af-free-material-status success';
        submitBtn.disabled = false;
        _aiflowFreeMaterialState.busy = false;
        _aiflowFreeMaterialState.selectedDoc = null;
        var nextUrl = _aiflowTrimString(cfg.redirectUrl || '');
        setTimeout(function() {
            closeFreeMaterialModal();
            if (nextUrl) window.location.href = nextUrl;
        }, 1600);
    }).catch(function(err) {
        status.textContent = '寄送失敗，請稍後再試。';
        status.className = 'af-free-material-status error';
        submitBtn.disabled = false;
        _aiflowFreeMaterialState.busy = false;
    });
}

/**
 * Apply CMS page-level SEO from a Firestore `pageLayouts` document.
 * Uses metaTitle, pageName (display name), and metaDescription when present.
 *
 * @param {Object|null|undefined} data - Result of doc.data(), or null if no doc
 * @param {Object} [options]
 * @param {string} [options.fallbackTitle] - Default <title> / og:title when CMS leaves SEO title blank
 */
function maybeRedirectToCanonicalPageSlug(data) {
    if (!data || typeof window === 'undefined') return false;
    var params;
    try {
        params = new URLSearchParams(window.location && window.location.search ? window.location.search : '');
    } catch (err) {
        params = null;
    }
    if (params && params.get('preview') === '1') return false;
    var slug = String((window.__AIFLOWTIME_PAGE_SLUG || data.pageSlug || '')).trim().replace(/^\/+/, '').toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return false;
    var currentPath = String((window.location && window.location.pathname) || '/').replace(/\/+$/, '') || '/';
    var targetPath = '/' + slug;
    if (currentPath === targetPath) return false;
    var nextUrl = targetPath + String((window.location && window.location.search) || '');
    window.location.replace(nextUrl);
    return true;
}

function applyFirestorePageMeta(data, options) {
    options = options || {};
    if (!data || typeof document === 'undefined') return;
    if (maybeRedirectToCanonicalPageSlug(data)) return;

    var fallbackTitle = String(options.fallbackTitle || document.title || '').trim();

    function upsert(isProperty, key, val) {
        var realSel = isProperty
            ? 'meta[property="' + key.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]'
            : 'meta[name="' + key.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
        var el = document.head.querySelector(realSel);
        if (!val) {
            if (el) el.remove();
            return;
        }
        if (!el) {
            el = document.createElement('meta');
            if (isProperty) el.setAttribute('property', key);
            else el.setAttribute('name', key);
            document.head.appendChild(el);
        }
        el.setAttribute('content', val);
    }

    var seoTitle = String(data.metaTitle || '').trim();
    var pageName = String(data.pageName || '').trim();
    var docTitle = seoTitle || pageName;
    if (docTitle) document.title = docTitle;

    var desc = String(data.metaDescription || '').trim();
    var shareTitle = docTitle || fallbackTitle;

    upsert(false, 'description', desc);
    upsert(true, 'og:title', shareTitle);
    upsert(true, 'og:description', desc);
    upsert(false, 'twitter:title', shareTitle);
    upsert(false, 'twitter:description', desc);
}

/**
 * Layout editor preview bridge.
 * Handles:
 * - live section updates from parent iframe host
 * - scroll/highlight requests from the editor
 * - click-to-select section messaging back to the editor
 * - runtime enable/disable of preview click selection
 */
function initLayoutPreviewBridge(options) {
    options = options || {};
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    if (window.__layoutPreviewBridgeInit) return window.__layoutPreviewBridgeApi || null;

    var onLayoutPreview = typeof options.onLayoutPreview === 'function' ? options.onLayoutPreview : null;
    var sectionSelector = options.sectionSelector || '[data-section-id]';
    var clickSelectEnabled = options.clickSelectEnabled !== false;

    function _allSectionEls() {
        return document.querySelectorAll(sectionSelector);
    }

    function _findSectionEl(sectionId) {
        if (!sectionId) return null;
        return document.querySelector('[data-section-id="' + String(sectionId).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
    }

    function _clearPreviewSelection() {
        _allSectionEls().forEach(function(el) {
            el.classList.remove('preview-selected');
        });
    }

    function _syncPreviewClickUi() {
        document.documentElement.classList.toggle('layout-preview-click-select-enabled', !!clickSelectEnabled);
    }

    if (!document.getElementById('layoutPreviewBridgeStyle')) {
        var bridgeStyle = document.createElement('style');
        bridgeStyle.id = 'layoutPreviewBridgeStyle';
        bridgeStyle.textContent =
            'html.layout-preview-click-select-enabled [data-section-id] { cursor: pointer; transition: outline 0.15s, outline-offset 0.15s; outline: 2px solid transparent; outline-offset: -2px; }' +
            'html.layout-preview-click-select-enabled [data-section-id]:hover { outline: 2px solid rgba(217,119,87,0.55); outline-offset: -2px; }' +
            '[data-section-id].preview-selected { outline: 2px solid #D97757; outline-offset: -2px; }';
        document.head.appendChild(bridgeStyle);
    }

    window.addEventListener('message', function(e) {
        if (!e || !e.data) return;
        if (e.data.type === 'layoutPreview' && onLayoutPreview && Array.isArray(e.data.sections)) {
            onLayoutPreview(e.data.sections, e.data);
            return;
        }
        if (e.data.type === 'scrollToSection' && e.data.sectionId) {
            var target = _findSectionEl(e.data.sectionId);
            if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        if (e.data.type === 'highlightSection') {
            _clearPreviewSelection();
            if (e.data.sectionId) {
                var active = _findSectionEl(e.data.sectionId);
                if (active) active.classList.add('preview-selected');
            }
            return;
        }
        if (e.data.type === 'setPreviewClickSelectEnabled') {
            clickSelectEnabled = e.data.enabled !== false;
            _syncPreviewClickUi();
        }
    });

    document.addEventListener('click', function(e) {
        var secEl = e.target && e.target.closest ? e.target.closest(sectionSelector) : null;
        if (!secEl) return;
        if (!clickSelectEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        _clearPreviewSelection();
        secEl.classList.add('preview-selected');
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'previewSectionClick',
                sectionId: secEl.getAttribute('data-section-id')
            }, '*');
        }
    }, true);

    _syncPreviewClickUi();

    window.__layoutPreviewBridgeApi = {
        setClickSelectEnabled: function(enabled) {
            clickSelectEnabled = enabled !== false;
            _syncPreviewClickUi();
        }
    };
    window.__layoutPreviewBridgeInit = true;
    return window.__layoutPreviewBridgeApi;
}
