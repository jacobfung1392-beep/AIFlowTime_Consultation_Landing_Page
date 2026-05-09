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

    function safeImageUrl(url) {
        var clean = String(url || '').trim();
        if (!clean) return '';
        if (/^(https?:|\/|data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,)/i.test(clean)) return clean;
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
            if (tag === 'img') {
                var imgSrc = safeImageUrl(child.getAttribute('src') || '');
                if (!imgSrc) return;
                var img = document.createElement('img');
                img.setAttribute('src', imgSrc);
                var alt = (child.getAttribute('alt') || '').trim();
                if (alt) img.setAttribute('alt', alt.slice(0, 180));
                img.setAttribute('loading', 'lazy');
                img.setAttribute('decoding', 'async');
                img.setAttribute('style', 'display:block;max-width:100%;height:auto;margin:16px auto;border-radius:14px;');
                frag.appendChild(img);
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
                if ((m = st.match(/font-weight\s*:\s*([^;]+)/i))) {
                    var fw = m[1].trim().replace(/\s*!important\s*$/i, '').trim();
                    if (/^(normal|bold|[1-9]00)$/i.test(fw)) allowed.push('font-weight:' + fw);
                }
                if ((m = st.match(/font-style\s*:\s*([^;]+)/i))) {
                    var fst = m[1].trim().replace(/\s*!important\s*$/i, '').trim();
                    if (/^(normal|italic)$/i.test(fst)) allowed.push('font-style:' + fst);
                }
                if ((m = st.match(/text-decoration(?:-line)?\s*:\s*([^;]+)/i))) {
                    var td = m[1].trim().replace(/\s*!important\s*$/i, '').trim();
                    if (/^(none|underline|line-through|underline line-through|line-through underline)$/i.test(td)) allowed.push('text-decoration:' + td);
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

function aiflowApplyTextAlignToElement(el, content, fieldName) {
    if (!el) return;
    if (!fieldName || !content || typeof content !== 'object') {
        el.style.removeProperty('text-align');
        return;
    }
    var a = String(content[fieldName + '_textAlign'] || '').trim().toLowerCase();
    if (a === 'center' || a === 'right' || a === 'justify' || a === 'left') el.style.textAlign = a;
    else el.style.removeProperty('text-align');
}

function aiflowSectionCropNumber(value) {
    var n = parseFloat(value);
    if (isNaN(n) || n < 0) return 0;
    return Math.min(2000, n);
}

function aiflowEnsureSectionCropInner(sectionEl) {
    if (!sectionEl) return null;
    var direct = null;
    Array.prototype.slice.call(sectionEl.children || []).some(function(child) {
        if (child && child.classList && child.classList.contains('layout-section-crop-inner')) {
            direct = child;
            return true;
        }
        return false;
    });
    if (direct) return direct;
    direct = document.createElement('div');
    direct.className = 'layout-section-crop-inner';
    Array.prototype.slice.call(sectionEl.childNodes || []).forEach(function(node) {
        if (node.nodeType === 1 && node.classList && node.classList.contains('layout-section-crop-handle')) return;
        direct.appendChild(node);
    });
    sectionEl.insertBefore(direct, sectionEl.firstChild);
    return direct;
}

function aiflowApplySectionCropToElement(sectionEl, content) {
    if (!sectionEl) return;
    content = content || {};
    var cropTop = aiflowSectionCropNumber(content._cropTop);
    var cropBottom = aiflowSectionCropNumber(content._cropBottom);
    var hasExplicitHeight = content._cropHeight !== undefined && content._cropHeight !== null && String(content._cropHeight).trim() !== '';
    var cropHeight = hasExplicitHeight ? aiflowSectionCropNumber(content._cropHeight) : 0;
    sectionEl.setAttribute('data-layout-crop-top', String(Math.round(cropTop * 100) / 100));
    sectionEl.setAttribute('data-layout-crop-bottom', String(Math.round(cropBottom * 100) / 100));
    if (hasExplicitHeight) sectionEl.setAttribute('data-layout-crop-height', String(Math.round(cropHeight * 100) / 100));
    else sectionEl.removeAttribute('data-layout-crop-height');

    var existingInner = null;
    Array.prototype.slice.call(sectionEl.children || []).some(function(child) {
        if (child && child.classList && child.classList.contains('layout-section-crop-inner')) {
            existingInner = child;
            return true;
        }
        return false;
    });

    if (!cropTop && !cropBottom && !hasExplicitHeight) {
        if (existingInner) {
            while (existingInner.firstChild) sectionEl.insertBefore(existingInner.firstChild, existingInner);
            existingInner.remove();
        }
        sectionEl.style.height = '';
        sectionEl.style.overflow = '';
        if (sectionEl.hasAttribute('data-layout-crop-prev-min-height')) {
            var prevMinHeight = sectionEl.getAttribute('data-layout-crop-prev-min-height') || '';
            if (prevMinHeight) sectionEl.style.minHeight = prevMinHeight;
            else sectionEl.style.removeProperty('min-height');
            sectionEl.removeAttribute('data-layout-crop-prev-min-height');
        }
        sectionEl.removeAttribute('data-layout-crop-natural-height');
        return;
    }

    var inner = existingInner || aiflowEnsureSectionCropInner(sectionEl);
    if (!inner) return;
    sectionEl.style.position = sectionEl.style.position || 'relative';
    sectionEl.style.overflow = 'hidden';
    if (!sectionEl.hasAttribute('data-layout-crop-prev-min-height')) {
        sectionEl.setAttribute('data-layout-crop-prev-min-height', sectionEl.style.minHeight || '');
    }
    sectionEl.style.minHeight = '0px';
    inner.style.transform = cropTop ? ('translate3d(0,-' + cropTop + 'px,0)') : '';
    inner.style.willChange = 'transform';

    sectionEl.style.height = '';
    var naturalHeight = Math.max(
        inner.scrollHeight || 0,
        inner.offsetHeight || 0,
        Math.ceil((inner.getBoundingClientRect && inner.getBoundingClientRect().height) || 0),
        sectionEl.scrollHeight || 0
    );
    var visibleHeight = hasExplicitHeight
        ? Math.max(24, cropHeight)
        : Math.max(24, naturalHeight - cropTop - cropBottom);
    var derivedBottom = Math.max(0, naturalHeight - cropTop - visibleHeight);
    sectionEl.setAttribute('data-layout-crop-bottom', String(Math.round(derivedBottom * 100) / 100));
    sectionEl.setAttribute('data-layout-crop-height', String(Math.round(visibleHeight * 100) / 100));
    sectionEl.style.height = visibleHeight + 'px';
    sectionEl.setAttribute('data-layout-crop-natural-height', String(naturalHeight));
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
    'lead-magnet'
];

var AIFLOW_LEAD_DEFINITION_TYPE_META = {
    'quiz-lead': { label: 'Quiz Leads' },
    consultation: { label: 'Consultation' },
    'workshop-waitlist': { label: 'Waiting List' },
    'lead-magnet': { label: 'Lead Magnets' }
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
    if (normalizedType === 'free-material') normalizedType = 'lead-magnet';
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
        submitText: '提交',
        sectionLabel: '',
        ctaText: '',
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
    if (type === 'free-material') type = 'lead-magnet';
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
    next.leadDefinitionType = normalized.type || 'lead-magnet';
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
    var leadDefinitionType = _aiflowTrimString(cfg.leadDefinitionType || 'lead-magnet');
    if (leadDefinitionType === 'free-material') leadDefinitionType = 'lead-magnet';
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
        leadDefinitionType: leadDefinitionType,
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
                formType: 'lead-magnet',
                sourceKey: cfg.leadDefinitionId ? ('lead-definition:' + cfg.leadDefinitionId) : 'lead-magnet-modal',
                sourceLabel: cfg.leadDefinitionName || cfg.materialTitle || '免費資料下載',
                sourcePage: meta.pageTitle || document.title || '',
                sourcePath: meta.pagePath || window.location.pathname,
                sourceUrl: window.location.href,
                sourceCollection: 'freeMaterialLeads',
                sourceDocId: leadId,
                leadDefinitionId: cfg.leadDefinitionId || '',
                leadDefinitionType: (cfg.leadDefinitionType === 'free-material' ? 'lead-magnet' : (cfg.leadDefinitionType || 'lead-magnet')),
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

function _aiflowEnsureConsultationSectionStyles() {
    if (document.getElementById('aiflowConsultationSectionStyles')) return;
    var style = document.createElement('style');
    style.id = 'aiflowConsultationSectionStyles';
    style.textContent =
        '.af-consult-section{--afc-bg:#0a0a0f;--afc-card:#111118;--afc-border:rgba(255,255,255,0.07);--afc-accent:#D97757;--afc-text:#f0ede8;--afc-muted:rgba(240,237,232,0.55);--afc-dim:rgba(240,237,232,0.3);--afc-glow:rgba(217,119,87,0.35);background:var(--afc-bg);color:var(--afc-text);padding:calc(5.75rem + env(safe-area-inset-top,0px)) 20px 80px;scroll-margin-top:calc(5rem + env(safe-area-inset-top,0px));position:relative;overflow:hidden;}' +
        '.af-consult-section:before{content:"";position:absolute;inset:0;background:radial-gradient(circle 700px at 50% 0,rgba(217,119,87,0.18),transparent 70%);pointer-events:none;}' +
        '.af-consult-wrap{position:relative;z-index:1;max-width:720px;margin:0 auto;}' +
        '.af-consult-header{text-align:center;margin-bottom:48px;}' +
        '.af-consult-badge{display:inline-block;background:rgba(217,119,87,0.15);color:var(--afc-accent);font-size:13px;font-weight:700;padding:6px 18px;border-radius:20px;letter-spacing:1px;margin-bottom:20px;font-family:"Courier Prime",monospace;}' +
        '.af-consult-header h2{font-size:clamp(32px,5vw,46px);font-weight:700;line-height:1.3;margin:0 0 12px;color:var(--afc-text);}' +
        '.af-consult-header .accent{color:var(--afc-accent);}' +
        '.af-consult-header p{margin:0;color:var(--afc-muted);font-size:17px;line-height:1.8;}' +
        '.af-consult-header .highlight{color:var(--afc-accent);font-weight:inherit;margin-top:8px;}' +
        '.af-consult-card{background:var(--afc-card);border:1px solid var(--afc-border);border-radius:16px;padding:32px 28px;margin-bottom:24px;transition:border-color .2s;}' +
        '.af-consult-card:hover{border-color:var(--afc-glow);}' +
        '.af-consult-card h3{font-size:18px;font-weight:700;color:var(--afc-accent);margin:0 0 24px;padding-bottom:12px;border-bottom:1px solid var(--afc-border);font-family:"Courier Prime",monospace;letter-spacing:.5px;}' +
        '.af-consult-field{margin-bottom:20px;}' +
        '.af-consult-field:last-child{margin-bottom:0;}' +
        '.af-consult-label{display:block;font-weight:500;color:var(--afc-text);margin-bottom:8px;font-size:15px;line-height:1.5;}' +
        '.af-consult-label.required:after{content:" *";color:var(--afc-accent);}' +
        '.af-consult-input,.af-consult-select,.af-consult-textarea{width:100%;padding:14px 16px;background:rgba(255,255,255,0.04);border:1.5px solid var(--afc-border);border-radius:12px;font-size:16px;font-family:inherit;color:var(--afc-text);transition:all .2s;box-sizing:border-box;}' +
        '.af-consult-input:focus,.af-consult-select:focus,.af-consult-textarea:focus{outline:none;border-color:var(--afc-accent);box-shadow:0 0 0 3px rgba(217,119,87,0.15);}' +
        '.af-consult-input::placeholder,.af-consult-textarea::placeholder{color:var(--afc-dim);}' +
        '.af-consult-select{cursor:pointer;}' +
        '.af-consult-select option{background:var(--afc-card);color:var(--afc-text);}' +
        '.af-consult-textarea{min-height:100px;resize:vertical;}' +
        '.af-consult-help{font-size:13px;color:var(--afc-dim);margin-top:6px;}' +
        '.af-consult-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:8px;}' +
        '.af-consult-check{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--afc-border);cursor:pointer;font-size:15px;color:var(--afc-text);transition:border-color .2s,background .2s;}' +
        '.af-consult-check input{width:18px;height:18px;accent-color:var(--afc-accent);flex-shrink:0;}' +
        '.af-consult-radio-choice:has(input:checked){border-color:var(--afc-accent);background:rgba(217,119,87,0.10);box-shadow:0 0 0 1px rgba(217,119,87,0.25);}' +
        '.af-consult-other{display:none;margin-top:10px;}' +
        '.af-consult-consent{display:flex;align-items:flex-start;gap:12px;padding:16px 20px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--afc-border);margin-bottom:24px;}' +
        '.af-consult-consent input{width:20px;height:20px;accent-color:var(--afc-accent);flex-shrink:0;margin-top:3px;}' +
        '.af-consult-consent span{font-size:14px;color:var(--afc-muted);line-height:1.6;}' +
        '.af-consult-submit{display:flex;align-items:center;justify-content:center;width:100%;height:56px;padding:0 32px;background:var(--afc-accent);color:#fff;border:none;border-radius:14px;font-size:18px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 0 24px rgba(217,119,87,0.4);}' +
        '.af-consult-submit:disabled{background:rgba(255,255,255,0.1);color:var(--afc-dim);cursor:not-allowed;box-shadow:none;}' +
        '.af-consult-success{display:none;text-align:center;padding:60px 32px;background:var(--afc-card);border:1px solid var(--afc-border);border-radius:16px;}' +
        '.af-consult-success.show{display:block;}' +
        '.af-consult-success-icon{width:72px;height:72px;margin:0 auto 24px;background:var(--afc-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff;}' +
        '.af-consult-success h3{font-size:24px;margin:0 0 12px;color:var(--afc-text);}' +
        '.af-consult-success p{font-size:16px;color:var(--afc-muted);line-height:1.7;margin:0;}' +
        '.af-consult-status{min-height:22px;margin-top:12px;font-size:14px;color:var(--afc-muted);}' +
        '.af-consult-status.error{color:#ffb4a8;}' +
        '@media(max-width:520px){.af-consult-section{padding:calc(5.5rem + env(safe-area-inset-top,0px)) 16px 56px;scroll-margin-top:calc(4.75rem + env(safe-area-inset-top,0px));}.af-consult-card{padding:24px 20px;}.af-consult-check-grid{grid-template-columns:1fr;}}';
    document.head.appendChild(style);
}

function _aiflowConsultEsc(s) {
    return typeof escHtml === 'function'
        ? escHtml(String(s || ''))
        : String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function aiflowGetDefaultServiceApplicationContent() {
    return {
        badge: 'SERVICE APPLICATION',
        title: '服務<span class="accent">申請</span>表單',
        subtitle: '讓我們更了解你的情況',
        highlight: '提交你的需要，我們會盡快與你聯絡。',
        successTitle: '提交成功！',
        successMessage: '我們已收到你的資料，會盡快與你聯絡。',
        submitText: '提交申請 →',
        submittingText: '提交中...',
        errorMessage: '提交時遇到問題，請稍後再試。',
        otherPlaceholder: '請輸入其他...',
        cardTitles: {
            basic: '// 基本資料',
            survey: '// AI 應用調查',
            needs: '// 需求與意願',
            custom: '// 自訂問題'
        },
        fieldOrder: [
            'name',
            'phone',
            'email',
            'igAccount',
            'aiSkillLevel',
            'aiGoal',
            'currentAITools',
            'successOutcome',
            'currentProblem',
            'startTiming',
            'willingnessToPay',
            'whyNow',
            'workshopInterest',
            'aiTopics',
            'additionalInfo',
            'whatsappConsent'
        ],
        customFields: [],
        fields: {
            name: { visible: true, required: true, label: '姓名', placeholder: '請輸入你的姓名', help: '' },
            phone: { visible: true, required: true, label: '電話號碼', placeholder: '+852 xxxx xxxx', help: '' },
            email: { visible: true, required: false, label: 'Email Address', placeholder: 'your.email@example.com', help: '' },
            igAccount: { visible: true, required: false, label: '你的 IG 帳號？', placeholder: '@your_instagram', help: '請輸入你的 Instagram 帳號（包含 @）' },
            aiSkillLevel: { visible: true, required: true, label: '你會怎樣形容自己在AI應用方面的能力？', placeholder: '請選擇', optionsText: '從未接觸\n新手\n進階\n專家' },
            aiGoal: { visible: true, required: true, label: '你希望在接下來 90 天，透過 AI 最想達成哪一個具體成果？', placeholder: '例如：每週省下 5 小時重複工作、每月多產出 8 條內容等' },
            currentAITools: { visible: true, required: false, label: '目前你在工作或創業中，已經有在用哪些 AI 工具？（可多選）', optionsText: 'ChatGPT\nClaude\nGemini\nNotion AI\nZapier\nMake\nn8n\nKimi', allowOther: true, otherLabel: '其他' },
            successOutcome: { visible: true, required: false, label: '用一句話形容：如果這次服務很成功，結束後你希望自己「多了哪一種能力」或「少了哪一種困擾」？', placeholder: '請用一句話描述...' },
            currentProblem: { visible: true, required: true, label: '你目前最想解決的問題是什麼？', placeholder: '請詳細描述你目前遇到的問題...' },
            startTiming: { visible: true, required: true, label: '如果我們可以解決你的問題，你希望多快開始進行？', placeholder: '請選擇', optionsText: '立即開始\n1週內\n2-4週內\n1-3個月內\n3個月以上' },
            willingnessToPay: { visible: true, required: true, label: '這個問題，你願意花錢解決嗎？', placeholder: '請選擇', optionsText: '非常願意\n願意\n考慮中\n不太願意\n不願意' },
            whyNow: { visible: true, required: false, label: '你現在為什麼會想找我們解決問題？是什麼讓你覺得現在就是時機？', placeholder: '請分享你的想法...' },
            workshopInterest: { visible: true, required: false, label: '你會唔會有興趣參加未來嘅 AI 付費工作坊？', placeholder: '請選擇', optionsText: '有興趣\n可能會\n暫時冇興趣' },
            aiTopics: { visible: true, required: false, label: '你對邊啲 AI 主題比較有興趣？（可多選）', optionsText: '內容／文案生成\n社交媒體內容流程\n工作流自動化（n8n／Zapier／Make）\n簡報／報告／文件整理\n客服／銷售\n資料整理／分析', allowOther: true, otherLabel: '其他' },
            additionalInfo: { visible: true, required: false, label: '有沒有什麼想讓我們提前知道的？', placeholder: '任何額外的資訊、問題或需求...' },
            whatsappConsent: { visible: true, required: true, label: '我同意在提交此表單後，透過 WhatsApp 接收由 AIFlowTime 提供的自動化 AI 回覆與相關服務資訊（包括申請安排與後續聯絡）。' }
        }
    };
}

function aiflowGetServiceApplicationBuiltinFieldMeta() {
    return {
        name: { group: 'basic', type: 'short-answer', tag: 'Short answer', inputType: 'text', title: '姓名' },
        phone: { group: 'basic', type: 'short-answer', tag: 'Short answer', inputType: 'tel', title: '電話' },
        email: { group: 'basic', type: 'short-answer', tag: 'Short answer', inputType: 'email', title: 'Email' },
        igAccount: { group: 'basic', type: 'short-answer', tag: 'Short answer', inputType: 'text', title: 'IG 帳號' },
        aiSkillLevel: { group: 'survey', type: 'multiple-choice', tag: 'Multiple choice', title: 'AI 程度' },
        aiGoal: { group: 'survey', type: 'long-answer', tag: 'Long answer', title: '90 天目標' },
        currentAITools: { group: 'survey', type: 'checkboxes', tag: 'Checkboxes', title: '目前使用工具' },
        successOutcome: { group: 'survey', type: 'long-answer', tag: 'Long answer', title: '成功後希望' },
        currentProblem: { group: 'needs', type: 'long-answer', tag: 'Long answer', title: '目前問題' },
        startTiming: { group: 'needs', type: 'multiple-choice', tag: 'Multiple choice', title: '開始時間' },
        willingnessToPay: { group: 'needs', type: 'multiple-choice', tag: 'Multiple choice', title: '付費意願' },
        whyNow: { group: 'needs', type: 'long-answer', tag: 'Long answer', title: '為什麼現在' },
        workshopInterest: { group: 'needs', type: 'multiple-choice', tag: 'Multiple choice', title: '工作坊興趣' },
        aiTopics: { group: 'needs', type: 'checkboxes', tag: 'Checkboxes', title: 'AI 主題興趣' },
        additionalInfo: { group: 'needs', type: 'long-answer', tag: 'Long answer', title: '補充資料' },
        whatsappConsent: { group: 'consent', type: 'consent', tag: 'Consent', title: '同意條款' }
    };
}

function aiflowGetServiceApplicationDefaultFieldOrder() {
    return aiflowGetDefaultServiceApplicationContent().fieldOrder.slice();
}

function aiflowFieldKeysFromConsultationUiOrder(ui) {
    if (!Array.isArray(ui)) return [];
    return ui.filter(function(x) { return x && x.type === 'field' && String(x.key || '').trim(); }).map(function(x) { return String(x.key).trim(); });
}

function aiflowFieldDisplayGroupsFromConsultationUiOrder(ui, cfg) {
    var map = {};
    if (!Array.isArray(ui) || !cfg) return map;
    var meta = aiflowGetServiceApplicationBuiltinFieldMeta();
    var currentSeg = null;
    for (var i = 0; i < ui.length; i++) {
        var item = ui[i];
        if (!item) continue;
        if (item.type === 'title') {
            currentSeg = String(item.segmentId || '').trim() || null;
            continue;
        }
        if (item.type === 'field') {
            var key = String(item.key || '').trim();
            if (!key) continue;
            var built = meta[key];
            var intrGrp = built ? (built.group || 'custom') : ((_consultCustomFieldCfg(cfg, key) || {}).group || 'custom');
            if (intrGrp === 'consent' || (built && built.type === 'consent')) {
                map[key] = 'consent';
                currentSeg = null;
            } else {
                map[key] = currentSeg || intrGrp;
            }
        }
    }
    return map;
}

function aiflowBuildLegacyConsultationUiOrder(cfg) {
    var ui = [];
    if (!cfg) return ui;
    var meta = aiflowGetServiceApplicationBuiltinFieldMeta();
    var order = Array.isArray(cfg.fieldOrder) && cfg.fieldOrder.length ? cfg.fieldOrder.slice() : aiflowGetServiceApplicationDefaultFieldOrder();
    var fmap = (cfg.fieldDisplayGroups && typeof cfg.fieldDisplayGroups === 'object') ? cfg.fieldDisplayGroups : {};
    function intrinsic(key) {
        if (meta[key]) return meta[key].group || 'custom';
        var cf = _consultCustomFieldCfg(cfg, key);
        return cf ? (cf.group || 'custom') : 'custom';
    }
    var currentSeg = null;
    for (var i = 0; i < order.length; i++) {
        var key = String(order[i] || '').trim();
        if (!key) continue;
        var seg = fmap[key] || intrinsic(key);
        if (seg === 'consent') {
            ui.push({ type: 'field', key: key });
            currentSeg = null;
            continue;
        }
        if (seg !== currentSeg) {
            ui.push({ type: 'title', segmentId: seg });
            currentSeg = seg;
        }
        ui.push({ type: 'field', key: key });
    }
    return ui;
}

function _normalizeConsultationUiOrder(ui, merged) {
    if (!Array.isArray(ui) || !ui.length || !merged) return null;
    var meta = aiflowGetServiceApplicationBuiltinFieldMeta();
    var allowedOrder = Array.isArray(merged.fieldOrder) ? merged.fieldOrder.slice() : [];
    var allowed = {};
    allowedOrder.forEach(function(k) { allowed[k] = true; });
    var out = [];
    var seen = {};
    for (var i = 0; i < ui.length; i++) {
        var item = ui[i];
        if (!item || !item.type) continue;
        if (item.type === 'title') {
            var sid = String(item.segmentId || '').trim();
            if (!sid) continue;
            out.push({ type: 'title', segmentId: sid });
            continue;
        }
        if (item.type === 'field') {
            var k = String(item.key || '').trim();
            if (!allowed[k] || seen[k]) continue;
            seen[k] = true;
            out.push({ type: 'field', key: k });
        }
    }
    for (var j = 0; j < allowedOrder.length; j++) {
        var k2 = allowedOrder[j];
        if (!seen[k2]) {
            seen[k2] = true;
            out.push({ type: 'field', key: k2 });
        }
    }
    if (out.length && out[0].type === 'field') {
        var fk = out[0].key;
        var built = meta[fk];
        var ig = built ? (built.group || 'custom') : ((_consultCustomFieldCfg(merged, fk) || {}).group || 'custom');
        if (ig !== 'consent') {
            out.unshift({ type: 'title', segmentId: ig });
        }
    }
    return out.length ? out : null;
}

function _aiflowMergeServiceApplicationContent(content) {
    var defaults = aiflowGetDefaultServiceApplicationContent();
    var cfg = content && typeof content === 'object' ? JSON.parse(JSON.stringify(content)) : {};
    var merged = Object.assign({}, defaults, cfg);
    merged.cardTitles = Object.assign({}, defaults.cardTitles, cfg.cardTitles || {});
    merged.fields = Object.assign({}, defaults.fields);
    Object.keys(defaults.fields).forEach(function(key) {
        merged.fields[key] = Object.assign({}, defaults.fields[key], (cfg.fields && cfg.fields[key]) || {});
    });
    merged.customFields = Array.isArray(cfg.customFields) ? cfg.customFields.filter(function(item) {
        return item && item.key;
    }).map(function(item) {
        return Object.assign({
            key: '',
            type: 'short-answer',
            group: 'custom',
            visible: true,
            required: false,
            label: '自訂問題',
            placeholder: '',
            help: '',
            optionsText: '',
            multipleChoiceDisplay: 'select'
        }, item || {});
    }) : [];
    var builtinMeta = aiflowGetServiceApplicationBuiltinFieldMeta();
    var allowed = {};
    Object.keys(builtinMeta).forEach(function(key) { allowed[key] = true; });
    merged.customFields.forEach(function(item) { allowed[item.key] = true; });
    var rawOrder = Array.isArray(cfg.fieldOrder) && cfg.fieldOrder.length ? cfg.fieldOrder : defaults.fieldOrder;
    var explicitOrder = Array.isArray(cfg.fieldOrder) && cfg.fieldOrder.length > 0;
    var seen = {};
    merged.fieldOrder = rawOrder.filter(function(key) {
        key = String(key || '').trim();
        if (!key || !allowed[key] || seen[key]) return false;
        seen[key] = true;
        return true;
    });
    if (!explicitOrder) {
        defaults.fieldOrder.forEach(function(key) {
            if (!seen[key]) {
                merged.fieldOrder.push(key);
                seen[key] = true;
            }
        });
    }
    merged.customFields.forEach(function(item) {
        if (!seen[item.key]) {
            merged.fieldOrder.push(item.key);
            seen[item.key] = true;
        }
    });
    merged.fieldDisplayGroups = (cfg.fieldDisplayGroups && typeof cfg.fieldDisplayGroups === 'object')
        ? JSON.parse(JSON.stringify(cfg.fieldDisplayGroups))
        : {};
    merged.consultationUiOrder = null;
    if (Array.isArray(cfg.consultationUiOrder) && cfg.consultationUiOrder.length) {
        var normalized = _normalizeConsultationUiOrder(cfg.consultationUiOrder, merged);
        if (normalized && normalized.length) {
            merged.consultationUiOrder = normalized;
            merged.fieldOrder = aiflowFieldKeysFromConsultationUiOrder(normalized);
            merged.fieldDisplayGroups = aiflowFieldDisplayGroupsFromConsultationUiOrder(normalized, merged);
        }
    }
    return merged;
}

function _consultFieldCfg(cfg, key) {
    if (cfg.fields && cfg.fields[key]) return cfg.fields[key];
    var custom = _consultCustomFieldCfg(cfg, key);
    return custom || {};
}

function _consultCustomFieldCfg(cfg, key) {
    var list = (cfg && Array.isArray(cfg.customFields)) ? cfg.customFields : [];
    for (var i = 0; i < list.length; i++) {
        if (String(list[i].key || '') === String(key || '')) return list[i];
    }
    return null;
}

function _consultFieldVisible(fieldCfg) {
    return !fieldCfg || fieldCfg.visible !== false;
}

/** Treat CMS / Firestore values like true, 1, or "true" as required (editor checkbox + legacy data). */
function _consultIsFieldRequired(fieldCfg) {
    if (!fieldCfg || fieldCfg.visible === false) return false;
    var r = fieldCfg.required;
    return r === true || r === 1 || String(r).toLowerCase() === 'true';
}

function _consultOptionsList(fieldCfg, fallback) {
    var raw = fieldCfg && fieldCfg.optionsText;
    if (Array.isArray(raw)) return raw.filter(function(item) { return String(item || '').trim(); });
    if (typeof raw === 'string') {
        return raw.split(/\r?\n/).map(function(item) { return String(item || '').trim(); }).filter(Boolean);
    }
    return (fallback || []).slice();
}

function _aiflowConsultRich(value) {
    return typeof aiflowRenderRichTextHtml === 'function'
        ? aiflowRenderRichTextHtml(value)
        : _aiflowConsultEsc(value).replace(/\n/g, '<br>');
}

function _aiflowConsultAttr(value) {
    return _aiflowConsultEsc(value).replace(/'/g, '&#39;');
}

function _aiflowConsultAlignAttr(obj, key) {
    var a = String((obj && obj[key + '_textAlign']) || '').trim().toLowerCase();
    return (a === 'center' || a === 'right' || a === 'justify' || a === 'left')
        ? ' style="text-align:' + a + ';"'
        : '';
}

function _aiflowConsultRichEl(tag, cls, value, obj, key, dataField) {
    return '<' + tag +
        (cls ? ' class="' + _aiflowConsultAttr(cls) + '"' : '') +
        (dataField ? ' data-layout-field="' + _aiflowConsultAttr(dataField) + '"' : '') +
        _aiflowConsultAlignAttr(obj, key) +
        '>' + _aiflowConsultRich(value) + '</' + tag + '>';
}

function renderConsultationSection(el, content, options) {
    if (!el) return;
    _aiflowEnsureConsultationSectionStyles();
    var cfg = _aiflowMergeServiceApplicationContent(content || {});
    var id = 'afConsult_' + String((options && options.sectionId) || el.getAttribute('data-section-id') || Date.now()).replace(/[^A-Za-z0-9_-]/g, '_');
    var title = cfg.title || '服務<span class="accent">申請</span>表單';
    title = typeof sanitizeHeroTitleHtml === 'function' ? sanitizeHeroTitleHtml(title) : _aiflowConsultEsc(title);
    var subtitle = cfg.subtitle || '讓我們更了解你的情況';
    var highlight = cfg.highlight || '提交你的需要，我們會盡快與你聯絡。';
    el.classList.add('af-consult-section');
    el.innerHTML =
        '<div class="af-consult-wrap">' +
            '<div class="af-consult-header">' +
                _aiflowConsultRichEl('div', 'af-consult-badge', cfg.badge || 'SERVICE APPLICATION', cfg, 'badge', 'badge') +
                '<h2 data-layout-field="title"' + _aiflowConsultAlignAttr(cfg, 'title') + '>' + title + '</h2>' +
                _aiflowConsultRichEl('p', '', subtitle, cfg, 'subtitle', 'subtitle') +
                _aiflowConsultRichEl('p', 'highlight', highlight, cfg, 'highlight', 'highlight') +
            '</div>' +
            '<div class="af-consult-success" data-consult-success><div class="af-consult-success-icon">✓</div>' +
                _aiflowConsultRichEl('h3', '', cfg.successTitle || '提交成功！', cfg, 'successTitle', 'successTitle') +
                _aiflowConsultRichEl('p', '', cfg.successMessage || '我們已收到你的資料，會盡快與你聯絡。', cfg, 'successMessage', 'successMessage') +
            '</div>' +
            '<form data-consult-form>' +
                _consultRenderOrderedFields(cfg) +
                '<button type="submit" class="af-consult-submit" data-default-text="' + _aiflowConsultAttr(String(cfg.submitText || '提交申請 →').replace(/<[^>]*>/g, '')) + '" data-default-html="' + _aiflowConsultAttr(_aiflowConsultRich(cfg.submitText || '提交申請 →')) + '" data-submitting-text="' + _aiflowConsultAttr(cfg.submittingText || '提交中...') + '"' + _aiflowConsultAlignAttr(cfg, 'submitText') + '>' + _aiflowConsultRich(cfg.submitText || '提交申請 →') + '</button><div class="af-consult-status" data-consult-status data-error-message="' + _aiflowConsultEsc(cfg.errorMessage || '提交時遇到問題，請稍後再試。') + '"></div>' +
            '</form>' +
        '</div>';
    var form = el.querySelector('[data-consult-form]');
    if (form) {
        form.addEventListener('change', _syncConsultOtherFields);
        form.addEventListener('submit', function(e) { _submitConsultationSection(e, el); });
        _syncConsultOtherFields({ currentTarget: form });
    }
}

function _consultFieldFromConfig(cfg, name, type) {
    var f = _consultFieldCfg(cfg, name);
    if (!_consultFieldVisible(f)) return '';
    return _consultField(f, name, type);
}

function _consultRenderOrderedFieldsFromUi(cfg) {
    var meta = aiflowGetServiceApplicationBuiltinFieldMeta();
    var html = '';
    var openGroup = '';
    function closeCard() {
        if (openGroup) html += '</div>';
        openGroup = '';
    }
    function openCard(group) {
        if (group === 'consent') {
            closeCard();
            return;
        }
        if (openGroup === group) return;
        closeCard();
        openGroup = group || 'custom';
        var rawTitle = (cfg.cardTitles && cfg.cardTitles[openGroup]) != null ? cfg.cardTitles[openGroup] : '';
        var title = String(rawTitle).trim();
        if (!title) {
            title = '// 新區塊';
        }
        html += '<div class="af-consult-card" data-consult-card="' + _aiflowConsultAttr(openGroup) + '">' +
            _aiflowConsultRichEl('h3', '', title, cfg.cardTitles || {}, openGroup, 'cardTitles.' + openGroup);
    }
    var ui = cfg.consultationUiOrder;
    for (var i = 0; i < ui.length; i++) {
        var item = ui[i];
        if (!item) continue;
        if (item.type === 'title') {
            openCard(String(item.segmentId || '').trim() || 'custom');
            continue;
        }
        if (item.type === 'field') {
            var key = String(item.key || '').trim();
            if (!key) continue;
            var built = meta[key];
            var custom = built ? null : _consultCustomFieldCfg(cfg, key);
            if (!built && !custom) continue;
            if (built && built.type === 'consent') {
                closeCard();
                html += _consultRenderBuiltinField(cfg, key, built);
                continue;
            }
            if (!openGroup) {
                var ig = built ? (built.group || 'custom') : (custom.group || 'custom');
                if (ig !== 'consent') openCard(ig);
            }
            if (built) html += _consultRenderBuiltinField(cfg, key, built);
            else html += _consultCustomField(custom);
        }
    }
    closeCard();
    return html;
}

function _consultRenderOrderedFields(cfg) {
    if (Array.isArray(cfg.consultationUiOrder) && cfg.consultationUiOrder.length) {
        return _consultRenderOrderedFieldsFromUi(cfg);
    }
    var meta = aiflowGetServiceApplicationBuiltinFieldMeta();
    var order = Array.isArray(cfg.fieldOrder) && cfg.fieldOrder.length ? cfg.fieldOrder : aiflowGetServiceApplicationDefaultFieldOrder();
    var html = '';
    var openGroup = '';
    function closeCard() {
        if (openGroup) html += '</div>';
        openGroup = '';
    }
    function openCard(group) {
        if (group === 'consent') {
            closeCard();
            return;
        }
        if (openGroup === group) return;
        closeCard();
        openGroup = group || 'custom';
        var rawTitle = (cfg.cardTitles && cfg.cardTitles[openGroup]) != null ? cfg.cardTitles[openGroup] : '';
        var title = String(rawTitle).trim();
        if (!title) {
            title = openGroup === 'custom' ? '// 自訂問題' : '// 新區塊';
        }
        html += '<div class="af-consult-card" data-consult-card="' + _aiflowConsultAttr(openGroup) + '">' +
            _aiflowConsultRichEl('h3', '', title, cfg.cardTitles || {}, openGroup, 'cardTitles.' + openGroup);
    }
    order.forEach(function(key) {
        key = String(key || '').trim();
        if (!key) return;
        var built = meta[key];
        var custom = built ? null : _consultCustomFieldCfg(cfg, key);
        if (!built && !custom) return;
        var map = cfg.fieldDisplayGroups || {};
        var group = map[key];
        if (!group || typeof group !== 'string' || !String(group).trim()) {
            group = built ? built.group : (custom.group || 'custom');
        }
        openCard(group);
        if (built) html += _consultRenderBuiltinField(cfg, key, built);
        else html += _consultCustomField(custom);
    });
    closeCard();
    return html;
}

function _consultSelectMarkup(name, options, required, placeholderText) {
    var html = '<select class="af-consult-select" name="' + _aiflowConsultEsc(name) + '"' + (required ? ' required' : '') + '>';
    var ph = String(placeholderText || '').trim() || '請選擇';
    html += '<option value="">' + _aiflowConsultEsc(ph) + '</option>';
    (options || []).forEach(function(opt) {
        var o = String(opt || '').trim();
        if (!o) return;
        html += '<option value="' + _aiflowConsultEsc(o) + '">' + _aiflowConsultEsc(o) + '</option>';
    });
    html += '</select>';
    return html;
}

function _consultRadioGridMarkup(inputName, options, required) {
    var html = '<div class="af-consult-check-grid af-consult-radio-grid" role="radiogroup">';
    var idx = 0;
    (options || []).forEach(function(opt) {
        var o = String(opt || '').trim();
        if (!o) return;
        var reqAttr = (required && idx === 0) ? ' required' : '';
        idx++;
        html += '<label class="af-consult-check af-consult-radio-choice"><input type="radio" name="' + _aiflowConsultEsc(inputName) + '" value="' + _aiflowConsultEsc(o) + '"' + reqAttr + '> ' + _aiflowConsultEsc(o) + '</label>';
    });
    html += '</div>';
    return html;
}

function _consultMultipleChoiceFromConfig(cfg, name, fallbackOptions) {
    var f = _consultFieldCfg(cfg, name);
    if (!_consultFieldVisible(f)) return '';
    var options = _consultOptionsList(f, fallbackOptions);
    var required = _consultIsFieldRequired(f);
    var mode = String(f.multipleChoiceDisplay || 'select').trim().toLowerCase();
    var help = (f.help) ? '<p class="af-consult-help" data-layout-field="fields.' + _aiflowConsultAttr(name) + '.help"' + _aiflowConsultAlignAttr(f, 'help') + '>' + _aiflowConsultRich(f.help) + '</p>' : '';
    var control = (mode === 'radio')
        ? _consultRadioGridMarkup(name, options, required)
        : _consultSelectMarkup(name, options, required, f.placeholder);
    return '<div class="af-consult-field"><label class="af-consult-label' + (required ? ' required' : '') + '" data-layout-field="fields.' + _aiflowConsultAttr(name) + '.label"' + _aiflowConsultAlignAttr(f, 'label') + '>' + _aiflowConsultRich(f && f.label) + '</label>' +
        control + help + '</div>';
}

function _consultEffectiveBuiltinInputType(cfg, key, meta) {
    if (!meta || meta.type === 'consent') return 'consent';
    var f = _consultFieldCfg(cfg, key);
    var raw = f && f.consultInputType != null ? String(f.consultInputType).trim() : '';
    if (!raw) return meta.type;
    var allowed = { 'short-answer': true, 'long-answer': true, 'multiple-choice': true, checkboxes: true };
    return allowed[raw] ? raw : meta.type;
}

function _consultRenderBuiltinField(cfg, key, meta) {
    if (meta.type === 'consent') return _consultConsentFromConfig(cfg);
    var t = _consultEffectiveBuiltinInputType(cfg, key, meta);
    if (t === 'multiple-choice') {
        var fallbackSelect = {
            aiSkillLevel: ['從未接觸','新手','進階','專家'],
            startTiming: ['立即開始','1週內','2-4週內','1-3個月內','3個月以上'],
            willingnessToPay: ['非常願意','願意','考慮中','不太願意','不願意'],
            workshopInterest: ['有興趣','可能會','暫時冇興趣']
        };
        return _consultMultipleChoiceFromConfig(cfg, key, fallbackSelect[key] || []);
    }
    if (t === 'checkboxes') {
        var fallbackChecks = {
            currentAITools: ['ChatGPT','Claude','Gemini','Notion AI','Zapier','Make','n8n','Kimi','其他'],
            aiTopics: ['內容／文案生成','社交媒體內容流程','工作流自動化（n8n／Zapier／Make）','簡報／報告／文件整理','客服／銷售','資料整理／分析','其他']
        };
        var otherName = key === 'currentAITools' ? 'currentAIToolsOtherText' : (key === 'aiTopics' ? 'aiTopicsOtherText' : key + 'OtherText');
        return _consultCheckboxesFromConfig(cfg, key, fallbackChecks[key] || [], otherName);
    }
    if (t === 'long-answer') return _consultTextareaFromConfig(cfg, key);
    return _consultFieldFromConfig(cfg, key, meta.inputType || 'text');
}

function _consultTextareaFromConfig(cfg, name) {
    var f = _consultFieldCfg(cfg, name);
    if (!_consultFieldVisible(f)) return '';
    return _consultTextarea(f, name);
}

function _consultCheckboxesFromConfig(cfg, name, fallbackOptions, otherName) {
    var f = _consultFieldCfg(cfg, name);
    if (!_consultFieldVisible(f)) return '';
    var options = _consultOptionsList(f, fallbackOptions).filter(function(item) {
        return item !== '其他' && item !== String(f.otherLabel || '').trim();
    });
    if (f.allowOther !== false) {
        options.push(String(f.otherLabel || '其他').trim() || '其他');
    }
    return _consultCheckboxes(f, name, options, otherName, cfg.otherPlaceholder || '請輸入其他...', f.allowOther !== false ? (String(f.otherLabel || '其他').trim() || '其他') : '');
}

function _consultConsentFromConfig(cfg) {
    var f = _consultFieldCfg(cfg, 'whatsappConsent');
    if (!_consultFieldVisible(f)) return '';
    return '<label class="af-consult-consent"><input type="checkbox" name="whatsappConsent"' + (_consultIsFieldRequired(f) ? ' required' : '') + '><span data-layout-field="fields.whatsappConsent.label"' + _aiflowConsultAlignAttr(f, 'label') + '>' + _aiflowConsultRich(f.label || '') + '</span></label>';
}

function _consultField(fieldCfg, name, type) {
    var required = _consultIsFieldRequired(fieldCfg);
    return '<div class="af-consult-field"><label class="af-consult-label' + (required ? ' required' : '') + '" data-layout-field="fields.' + _aiflowConsultAttr(name) + '.label"' + _aiflowConsultAlignAttr(fieldCfg, 'label') + '>' + _aiflowConsultRich(fieldCfg && fieldCfg.label) + '</label>' +
        '<input class="af-consult-input" name="' + _aiflowConsultEsc(name) + '" type="' + _aiflowConsultEsc(type || 'text') + '" placeholder="' + _aiflowConsultEsc((fieldCfg && fieldCfg.placeholder) || '') + '"' + (required ? ' required' : '') + '>' +
        ((fieldCfg && fieldCfg.help) ? '<p class="af-consult-help" data-layout-field="fields.' + _aiflowConsultAttr(name) + '.help"' + _aiflowConsultAlignAttr(fieldCfg, 'help') + '>' + _aiflowConsultRich(fieldCfg.help) + '</p>' : '') + '</div>';
}

function _consultTextarea(fieldCfg, name) {
    var required = _consultIsFieldRequired(fieldCfg);
    return '<div class="af-consult-field"><label class="af-consult-label' + (required ? ' required' : '') + '" data-layout-field="fields.' + _aiflowConsultAttr(name) + '.label"' + _aiflowConsultAlignAttr(fieldCfg, 'label') + '>' + _aiflowConsultRich(fieldCfg && fieldCfg.label) + '</label>' +
        '<textarea class="af-consult-textarea" name="' + _aiflowConsultEsc(name) + '" placeholder="' + _aiflowConsultEsc((fieldCfg && fieldCfg.placeholder) || '') + '"' + (required ? ' required' : '') + '></textarea></div>';
}

function _consultCheckboxes(fieldCfg, name, options, otherName, otherPlaceholder, otherLabel) {
    var required = _consultIsFieldRequired(fieldCfg);
    var reqAttr = required ? ' data-consult-required-checkgroup="' + _aiflowConsultAttr(name) + '"' : '';
    var html = '<div class="af-consult-field"' + reqAttr + '><label class="af-consult-label' + (required ? ' required' : '') + '" data-layout-field="fields.' + _aiflowConsultAttr(name) + '.label"' + _aiflowConsultAlignAttr(fieldCfg, 'label') + '>' + _aiflowConsultRich(fieldCfg && fieldCfg.label) + '</label><div class="af-consult-check-grid">';
    (options || []).forEach(function(opt) {
        var isOther = otherLabel && opt === otherLabel;
        html += '<label class="af-consult-check"><input type="checkbox" name="' + _aiflowConsultEsc(name) + '" value="' + _aiflowConsultEsc(opt) + '"' + (isOther ? ' data-other-target="' + _aiflowConsultEsc(otherName) + '"' : '') + '> ' + _aiflowConsultEsc(opt) + '</label>';
    });
    html += '</div><div class="af-consult-other" data-other-wrap="' + _aiflowConsultEsc(otherName) + '"><input class="af-consult-input" name="' + _aiflowConsultEsc(otherName) + '" type="text" placeholder="' + _aiflowConsultEsc(otherPlaceholder || '請輸入其他...') + '"></div></div>';
    return html;
}

function _consultCustomInputName(key) {
    return 'custom__' + String(key || '').replace(/[^A-Za-z0-9_-]/g, '_');
}

function _consultCustomField(fieldCfg) {
    if (!fieldCfg || fieldCfg.visible === false || !fieldCfg.key) return '';
    var key = String(fieldCfg.key);
    var name = _consultCustomInputName(key);
    var labelAttr = ' data-consult-custom-key="' + _aiflowConsultAttr(key) + '" data-consult-custom-label="' + _aiflowConsultAttr(_aiflowPlainText(fieldCfg.label || key)) + '"';
    var type = fieldCfg.type || 'short-answer';
    var required = _consultIsFieldRequired(fieldCfg);
    var label = '<label class="af-consult-label' + (required ? ' required' : '') + '" data-layout-field="customFields.' + _aiflowConsultAttr(key) + '.label"' + _aiflowConsultAlignAttr(fieldCfg, 'label') + '>' + _aiflowConsultRich(fieldCfg.label || '自訂問題') + '</label>';
    var help = fieldCfg.help ? '<p class="af-consult-help">' + _aiflowConsultRich(fieldCfg.help) + '</p>' : '';
    if (type === 'long-answer') {
        return '<div class="af-consult-field"' + labelAttr + '>' + label +
            '<textarea class="af-consult-textarea" name="' + _aiflowConsultAttr(name) + '" placeholder="' + _aiflowConsultEsc(fieldCfg.placeholder || '') + '"' + (required ? ' required' : '') + '></textarea>' + help + '</div>';
    }
    if (type === 'multiple-choice') {
        var mode = String(fieldCfg.multipleChoiceDisplay || 'select').trim().toLowerCase();
        var mcOpts = _consultOptionsList(fieldCfg, []);
        var ctrl = (mode === 'radio')
            ? _consultRadioGridMarkup(name, mcOpts, required)
            : _consultSelectMarkup(name, mcOpts, required, fieldCfg.placeholder);
        return '<div class="af-consult-field"' + labelAttr + '>' + label + ctrl + help + '</div>';
    }
    if (type === 'checkboxes') {
        var options = _consultOptionsList(fieldCfg, []);
        var otherLabel = String(fieldCfg.otherLabel || '其他').trim() || '其他';
        if (fieldCfg.allowOther === true && options.indexOf(otherLabel) < 0) options.push(otherLabel);
        var otherName = name + '__other';
        var reqGrp = required ? ' data-consult-required-checkgroup="' + _aiflowConsultAttr(name) + '"' : '';
        var html = '<div class="af-consult-field"' + labelAttr + reqGrp + '>' + label + '<div class="af-consult-check-grid">';
        options.forEach(function(opt) {
            var isOther = fieldCfg.allowOther === true && opt === otherLabel;
            html += '<label class="af-consult-check"><input type="checkbox" name="' + _aiflowConsultAttr(name) + '" value="' + _aiflowConsultEsc(opt) + '"' + (isOther ? ' data-other-target="' + _aiflowConsultAttr(otherName) + '"' : '') + '> ' + _aiflowConsultEsc(opt) + '</label>';
        });
        html += '</div><div class="af-consult-other" data-other-wrap="' + _aiflowConsultAttr(otherName) + '"><input class="af-consult-input" name="' + _aiflowConsultAttr(otherName) + '" type="text" placeholder="' + _aiflowConsultEsc(fieldCfg.otherPlaceholder || '請輸入其他...') + '"></div>' + help + '</div>';
        return html;
    }
    return '<div class="af-consult-field"' + labelAttr + '>' + label +
        '<input class="af-consult-input" name="' + _aiflowConsultAttr(name) + '" type="text" placeholder="' + _aiflowConsultEsc(fieldCfg.placeholder || '') + '"' + (required ? ' required' : '') + '>' + help + '</div>';
}

function _aiflowPlainText(html) {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function _consultSyncRequiredCheckboxGroups(form) {
    if (!form || !form.querySelectorAll) return;
    var seenClear = {};
    form.querySelectorAll('[data-consult-required-checkgroup]').forEach(function(wrap) {
        var grp = wrap.getAttribute('data-consult-required-checkgroup');
        if (!grp || seenClear[grp]) return;
        seenClear[grp] = true;
        var esc = grp.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        form.querySelectorAll('input[type="checkbox"][name="' + esc + '"]').forEach(function(cb) {
            cb.setCustomValidity('');
        });
    });
    form.querySelectorAll('[data-consult-required-checkgroup]').forEach(function(wrap) {
        var grp = wrap.getAttribute('data-consult-required-checkgroup');
        if (!grp) return;
        var esc = grp.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        var inputs = form.querySelectorAll('input[type="checkbox"][name="' + esc + '"]');
        if (!inputs.length) return;
        var any = false;
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].checked) { any = true; break; }
        }
        var msg = '請至少選擇一項';
        inputs[0].setCustomValidity(any ? '' : msg);
    });
}

function _syncConsultOtherFields(e) {
    var form = (e && (e.currentTarget || e.target && e.target.form)) || null;
    if (!form || !form.querySelectorAll) return;
    form.querySelectorAll('[data-other-target]').forEach(function(cb) {
        var target = cb.getAttribute('data-other-target');
        var wrap = form.querySelector('[data-other-wrap="' + target + '"]');
        var input = form.querySelector('[name="' + target + '"]');
        if (wrap) wrap.style.display = cb.checked ? 'block' : 'none';
        if (!cb.checked && input) input.value = '';
    });
    _consultSyncRequiredCheckboxGroups(form);
}

function _consultFormValues(form) {
    function val(name) {
        var picked = form.querySelector('[name="' + name + '"]:checked');
        if (picked) return String(picked.value || '').trim();
        var el = form.querySelector('[name="' + name + '"]');
        return el ? String(el.value || '').trim() : '';
    }
    function checked(name) {
        return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function(el) { return el.value; });
    }
    var customAnswers = {};
    var customAnswerLabels = {};
    form.querySelectorAll('[data-consult-custom-key]').forEach(function(wrap) {
        var key = wrap.getAttribute('data-consult-custom-key') || '';
        if (!key) return;
        var label = wrap.getAttribute('data-consult-custom-label') || key;
        var name = _consultCustomInputName(key);
        var checkedVals = checked(name);
        var answer = checkedVals.length ? checkedVals : val(name);
        var other = val(name + '__other');
        if (Array.isArray(answer) && other) answer = answer.concat([other]);
        if (!Array.isArray(answer) && other) answer = other;
        customAnswers[key] = answer;
        customAnswerLabels[key] = label;
    });
    return {
        name: val('name'),
        phone: val('phone'),
        email: val('email'),
        igAccount: val('igAccount'),
        aiSkillLevel: val('aiSkillLevel'),
        aiGoal: val('aiGoal'),
        currentAITools: checked('currentAITools'),
        currentAIToolsOtherText: val('currentAIToolsOtherText'),
        successOutcome: val('successOutcome'),
        currentProblem: val('currentProblem'),
        startTiming: val('startTiming'),
        willingnessToPay: val('willingnessToPay'),
        whyNow: val('whyNow'),
        workshopInterest: val('workshopInterest'),
        aiTopics: checked('aiTopics'),
        aiTopicsOtherText: val('aiTopicsOtherText'),
        additionalInfo: val('additionalInfo'),
        whatsappConsent: form.querySelector('[name="whatsappConsent"]') && form.querySelector('[name="whatsappConsent"]').checked ? '是' : '否',
        customAnswers: customAnswers,
        customAnswerLabels: customAnswerLabels,
        formType: 'consultation',
        timestamp: new Date().toISOString(),
        page: 'IG獲客諮詢表單'
    };
}

function _submitConsultationSection(event, root) {
    event.preventDefault();
    var form = event.currentTarget;
    _consultSyncRequiredCheckboxGroups(form);
    if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
        if (typeof form.reportValidity === 'function') form.reportValidity();
        return;
    }
    var submitButton = form.querySelector('.af-consult-submit');
    var status = root.querySelector('[data-consult-status]');
    var success = root.querySelector('[data-consult-success]');
    var formData = _consultFormValues(form);
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = submitButton.getAttribute('data-submitting-text') || '提交中...';
    }
    if (status) {
        status.textContent = '';
        status.className = 'af-consult-status';
    }
    function finishOk() {
        form.style.display = 'none';
        if (success) success.classList.add('show');
        try { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
    }
    function finishError(err) {
        console.error('Consultation submission failed:', err);
        if (status) {
            status.textContent = status.getAttribute('data-error-message') || '提交時遇到問題，請稍後再試。';
            status.className = 'af-consult-status error';
        }
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.getAttribute('data-default-html') || submitButton.getAttribute('data-default-text') || '提交申請 →';
        }
    }
    var googleScriptURL = 'https://script.google.com/macros/s/AKfycbxE8KP5ohNSbHIFOWxl-JoWgu9_my8N8ofkTEXaeU0b7QB6K-s3qx4KE-5bOz7Qj4_miQ/exec';
    initFirebase(function(app) {
        var db = app.firestore();
        var consultRef = db.collection('consultations').doc();
        var fsData = Object.assign({}, formData, {
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'new'
        });
        var mirrorPromise = typeof saveFormSubmissionMirror === 'function'
            ? saveFormSubmissionMirror({
                formType: 'consultation',
                sourceKey: 'ig-consultation',
                sourceLabel: 'AI 諮詢申請',
                sourcePage: formData.page,
                sourcePath: window.location.pathname,
                sourceUrl: window.location.href,
                sourceCollection: 'consultations',
                sourceDocId: consultRef.id,
                sheetTab: '1 on 1 Consultation',
                contactName: formData.name,
                phone: formData.phone,
                email: formData.email,
                instagram: formData.igAccount,
                answers: {
                    aiSkillLevel: formData.aiSkillLevel,
                    aiGoal: formData.aiGoal,
                    currentAITools: formData.currentAITools,
                    currentAIToolsOtherText: formData.currentAIToolsOtherText,
                    successOutcome: formData.successOutcome,
                    currentProblem: formData.currentProblem,
                    startTiming: formData.startTiming,
                    willingnessToPay: formData.willingnessToPay,
                    whyNow: formData.whyNow,
                    workshopInterest: formData.workshopInterest,
                    aiTopics: formData.aiTopics,
                    aiTopicsOtherText: formData.aiTopicsOtherText,
                    additionalInfo: formData.additionalInfo,
                    whatsappConsent: formData.whatsappConsent,
                    customAnswers: formData.customAnswers,
                    customAnswerLabels: formData.customAnswerLabels
                },
                timestamp: formData.timestamp
            }, { db: db })
            : Promise.resolve();
        var sheetPromise = fetch(googleScriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        }).catch(function(err) {
            console.warn('Consultation Google Sheet write failed:', err);
        });
        Promise.all([consultRef.set(fsData), mirrorPromise, sheetPromise]).then(finishOk).catch(finishError);
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
    /* Section outlines, crop handles, and contenteditable previews must only run inside the layout editor iframe — not on top-level tabs even with ?preview=1. */
    var previewChromeEnabled = typeof options.previewChromeEnabled === 'boolean'
        ? options.previewChromeEnabled
        : !!(window.parent && window.parent !== window);
    if (previewChromeEnabled) {
        document.documentElement.classList.add('layout-editor-preview-chrome');
    }
    var clickSelectEnabled = previewChromeEnabled && (options.clickSelectEnabled !== false);
    var activeTextEl = null;
    var activeTextRange = null;
    var editableTextSelector = '[data-layout-field], [data-layout-array-field]';
    var cropDrag = null;

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

    function _ensureCropHandles(secEl) {
        if (!previewChromeEnabled || !secEl) return;
        secEl.style.position = secEl.style.position || 'relative';
        ['top', 'bottom'].forEach(function(edge) {
            if (secEl.querySelector(':scope > .layout-section-crop-handle[data-crop-edge="' + edge + '"]')) return;
            var handle = document.createElement('button');
            handle.type = 'button';
            handle.className = 'layout-section-crop-handle layout-section-crop-handle-' + edge;
            handle.setAttribute('data-crop-edge', edge);
            handle.setAttribute('aria-label', edge === 'top' ? '調整上方裁切' : '調整下方裁切');
            handle.innerHTML = '<span></span>';
            secEl.appendChild(handle);
        });
    }

    function _removeCropHandles(secEl) {
        if (!secEl) return;
        secEl.querySelectorAll(':scope > .layout-section-crop-handle').forEach(function(handle) {
            handle.remove();
        });
    }

    function _applyCropValues(secEl, top, bottom, height) {
        if (!secEl) return;
        var content = {
            _cropTop: aiflowSectionCropNumber(top),
            _cropBottom: aiflowSectionCropNumber(bottom)
        };
        if (height !== undefined && height !== null) content._cropHeight = aiflowSectionCropNumber(height);
        if (typeof aiflowApplySectionCropToElement === 'function') {
            aiflowApplySectionCropToElement(secEl, content);
        }
        _ensureCropHandles(secEl);
    }

    function _postCropChange(secEl) {
        if (!secEl || !window.parent || window.parent === window) return;
        window.parent.postMessage({
            type: 'previewSectionCropChange',
            sectionId: secEl.getAttribute('data-section-id') || '',
            cropTop: aiflowSectionCropNumber(secEl.getAttribute('data-layout-crop-top')),
            cropBottom: aiflowSectionCropNumber(secEl.getAttribute('data-layout-crop-bottom')),
            cropHeight: aiflowSectionCropNumber(secEl.getAttribute('data-layout-crop-height'))
        }, '*');
    }

    function _editableTextEl(node) {
        return node && node.closest ? node.closest(editableTextSelector) : null;
    }

    function _enablePreviewTextEditing(root) {
        if (!previewChromeEnabled) return;
        (root || document).querySelectorAll(editableTextSelector).forEach(function(el) {
            el.setAttribute('contenteditable', 'true');
            el.setAttribute('spellcheck', 'false');
            el.classList.add('layout-preview-editable-text');
        });
    }

    function _selectionInside(el) {
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount || !el) return false;
        var range = sel.getRangeAt(0);
        return el.contains(range.startContainer) && el.contains(range.endContainer);
    }

    function _rememberTextRange(el) {
        if (!el || !_selectionInside(el)) return false;
        try {
            activeTextRange = window.getSelection().getRangeAt(0).cloneRange();
            return true;
        } catch (err) {
            return false;
        }
    }

    function _restoreTextRange(el) {
        if (!el || !activeTextRange) return false;
        try {
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(activeTextRange.cloneRange());
            return _selectionInside(el);
        } catch (err) {
            return false;
        }
    }

    function _selectTextContents(el) {
        if (!el) return false;
        try {
            var sel = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
            activeTextRange = range.cloneRange();
            return true;
        } catch (err) {
            return false;
        }
    }

    function _selectionCoversTextContents(el) {
        var sel = window.getSelection();
        if (!el || !sel || !sel.rangeCount || !_selectionInside(el)) return false;
        try {
            var range = sel.getRangeAt(0);
            if (range.collapsed) return false;
            var whole = document.createRange();
            whole.selectNodeContents(el);
            return range.compareBoundaryPoints(Range.START_TO_START, whole) <= 0 &&
                range.compareBoundaryPoints(Range.END_TO_END, whole) >= 0;
        } catch (err) {
            return false;
        }
    }

    function _textPayload(el) {
        if (!el) return null;
        var secEl = el.closest(sectionSelector);
        if (!secEl) return null;
        var payload = {
            sectionId: secEl.getAttribute('data-section-id') || '',
            field: el.getAttribute('data-layout-field') || '',
            arrayName: el.getAttribute('data-layout-array') || '',
            index: el.getAttribute('data-layout-index') || '',
            arrayField: el.getAttribute('data-layout-array-field') || '',
            html: el.innerHTML,
            selectionAll: _selectionCoversTextContents(el)
        };
        var activeNode = null;
        var sel = window.getSelection();
        if (sel && sel.rangeCount && _selectionInside(el)) {
            activeNode = sel.anchorNode;
            payload.selectionCollapsed = sel.getRangeAt(0).collapsed;
        }
        var activeElement = activeNode ? (activeNode.nodeType === 1 ? activeNode : activeNode.parentElement) : el;
        try {
            var cs = window.getComputedStyle(activeElement || el);
            payload.color = cs.color || '';
            payload.fontSize = cs.fontSize || '';
        } catch (err) {}
        return payload;
    }

    function _previewClickTargetPayload(target, secEl) {
        if (!target || !secEl) return {};
        var payload = {};
        var fieldEl = _editableTextEl(target);
        if (!fieldEl && target.closest) {
            var fieldWrap = target.closest('.af-consult-field, .af-consult-card, [data-consult-card]');
            if (fieldWrap) fieldEl = fieldWrap.querySelector('[data-layout-field], [data-layout-array-field]');
        }
        if (fieldEl) {
            payload.field = fieldEl.getAttribute('data-layout-field') || '';
            payload.arrayName = fieldEl.getAttribute('data-layout-array') || '';
            payload.index = fieldEl.getAttribute('data-layout-index') || '';
            payload.arrayField = fieldEl.getAttribute('data-layout-array-field') || '';
        }
        var consultCard = target.closest && target.closest('[data-consult-card]');
        if (consultCard) payload.consultCard = consultCard.getAttribute('data-consult-card') || '';
        return payload;
    }

    function _postPreviewText(type, el) {
        var payload = _textPayload(el);
        if (!payload || !window.parent || window.parent === window) return;
        payload.type = type;
        window.parent.postMessage(payload, '*');
    }

    function _selectTextContentsIfNeeded(el) {
        var sel = window.getSelection();
        var range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        if (range && !range.collapsed && _selectionInside(el)) return;
        _selectTextContents(el);
    }

    function _stylePropToCss(prop) {
        return String(prop || '').replace(/[A-Z]/g, function(ch) { return '-' + ch.toLowerCase(); });
    }

    function _cleanupPreviewSpans(root) {
        if (!root) return;
        Array.prototype.slice.call(root.querySelectorAll('span')).reverse().forEach(function(node) {
            if (!node || node.nodeType !== 1 || node.tagName !== 'SPAN') return;
            var attrs = node.getAttributeNames ? node.getAttributeNames() : [];
            if (attrs.length) return;
            var parent = node.parentNode;
            if (!parent) return;
            while (node.firstChild) parent.insertBefore(node.firstChild, node);
            parent.removeChild(node);
        });
    }

    function _previewFragmentElementsDepthSorted(fragment) {
        var out = [];
        if (!fragment) return out;
        function walk(node, depth) {
            if (!node) return;
            if (node.nodeType === 1) {
                out.push({ el: node, depth: depth });
                for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i], depth + 1);
                return;
            }
            for (var j = 0; j < node.childNodes.length; j++) walk(node.childNodes[j], depth);
        }
        for (var k = 0; k < fragment.childNodes.length; k++) walk(fragment.childNodes[k], 0);
        out.sort(function(a, b) { return b.depth - a.depth; });
        return out.map(function(item) { return item.el; });
    }

    function _previewInlineCommandSpec(cmd) {
        if (cmd === 'bold') return {
            tags: { B: true, STRONG: true },
            hasStyle: function(el) {
                var fw = el && el.style && el.style.fontWeight;
                return fw === 'bold' || parseInt(fw, 10) >= 600;
            },
            removeStyle: function(el) { if (el && el.style) el.style.removeProperty('font-weight'); },
            applyOffStyle: function(el) { if (el && el.style) el.style.fontWeight = '400'; }
        };
        if (cmd === 'italic') return {
            tags: { I: true, EM: true },
            hasStyle: function(el) { return !!(el && el.style && el.style.fontStyle === 'italic'); },
            removeStyle: function(el) { if (el && el.style) el.style.removeProperty('font-style'); },
            applyOffStyle: function(el) { if (el && el.style) el.style.fontStyle = 'normal'; }
        };
        if (cmd === 'underline') return {
            tags: { U: true },
            hasStyle: function(el) {
                var td = String((el && el.style && (el.style.textDecorationLine || el.style.textDecoration)) || '').toLowerCase();
                return td.indexOf('underline') >= 0;
            },
            removeStyle: function(el) {
                if (!el || !el.style) return;
                var td = String(el.style.textDecoration || el.style.textDecorationLine || '').toLowerCase();
                if (td.indexOf('underline') >= 0 && td.indexOf('line-through') >= 0) el.style.textDecoration = 'line-through';
                else {
                    el.style.removeProperty('text-decoration');
                    el.style.removeProperty('text-decoration-line');
                }
            },
            applyOffStyle: function(el) { if (el && el.style) el.style.textDecoration = 'none'; }
        };
        if (cmd === 'strikeThrough') return {
            tags: { S: true, STRIKE: true, DEL: true },
            hasStyle: function(el) {
                var td = String((el && el.style && (el.style.textDecorationLine || el.style.textDecoration)) || '').toLowerCase();
                return td.indexOf('line-through') >= 0;
            },
            removeStyle: function(el) {
                if (!el || !el.style) return;
                var td = String(el.style.textDecoration || el.style.textDecorationLine || '').toLowerCase();
                if (td.indexOf('underline') >= 0 && td.indexOf('line-through') >= 0) el.style.textDecoration = 'underline';
                else {
                    el.style.removeProperty('text-decoration');
                    el.style.removeProperty('text-decoration-line');
                }
            },
            applyOffStyle: function(el) { if (el && el.style) el.style.textDecoration = 'none'; }
        };
        return null;
    }

    function _previewNodeHasInlineCommand(node, root, spec) {
        var el = node && node.nodeType === 1 ? node : (node && node.parentElement);
        while (el) {
            if (spec.tags && spec.tags[el.tagName]) return true;
            if (spec.hasStyle && spec.hasStyle(el)) return true;
            if (el === root) break;
            el = el.parentElement;
        }
        return false;
    }

    function _previewRangeFullyHasInlineCommand(range, root, cmd) {
        var spec = _previewInlineCommandSpec(cmd);
        if (!range || !root || !spec) return false;
        var nodes = [];
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node || !String(node.nodeValue || '').trim()) return NodeFilter.FILTER_REJECT;
                try {
                    return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                } catch (err) {
                    return NodeFilter.FILTER_REJECT;
                }
            }
        });
        var node;
        while ((node = walker.nextNode())) nodes.push(node);
        if (!nodes.length) return false;
        return nodes.every(function(textNode) {
            return _previewNodeHasInlineCommand(textNode, root, spec);
        });
    }

    function _previewRangeHasAnyInlineCommand(range, root, cmd) {
        var spec = _previewInlineCommandSpec(cmd);
        if (!range || !root || !spec) return false;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node || !String(node.nodeValue || '').trim()) return NodeFilter.FILTER_REJECT;
                try {
                    return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                } catch (err) {
                    return NodeFilter.FILTER_REJECT;
                }
            }
        });
        var node;
        while ((node = walker.nextNode())) {
            if (_previewNodeHasInlineCommand(node, root, spec)) return true;
        }
        return false;
    }

    function _previewUnwrapElement(el) {
        if (!el || !el.parentNode) return;
        var parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }

    function _previewRemoveInlineCommandFromFragment(fragment, cmd) {
        var spec = _previewInlineCommandSpec(cmd);
        if (!fragment || !spec) return fragment;
        _previewFragmentElementsDepthSorted(fragment).forEach(function(el) {
            if (spec.removeStyle) spec.removeStyle(el);
            if (el.getAttribute && el.getAttribute('style') === '') el.removeAttribute('style');
            if (spec.tags && spec.tags[el.tagName]) _previewUnwrapElement(el);
        });
        return fragment;
    }

    function _previewClearOverridingOffStyles(root, cmd) {
        if (!root || root.nodeType !== 1) return;
        var nodes = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
        nodes.forEach(function(el) {
            if (!el || !el.style) return;
            if (cmd === 'bold') {
                var fw = String(el.style.fontWeight || '').toLowerCase();
                if (fw === '400' || fw === 'normal') el.style.removeProperty('font-weight');
            } else if (cmd === 'italic') {
                var fs = String(el.style.fontStyle || '').toLowerCase();
                if (fs === 'normal') el.style.removeProperty('font-style');
            } else if (cmd === 'underline' || cmd === 'strikeThrough') {
                var td = String(el.style.textDecoration || el.style.textDecorationLine || '').toLowerCase();
                if (td === 'none' || td === '') {
                    el.style.removeProperty('text-decoration');
                    el.style.removeProperty('text-decoration-line');
                }
            }
            if (el.getAttribute && el.getAttribute('style') === '') el.removeAttribute('style');
        });
    }

    function _previewApplyInlineCommandWrap(el, cmd, tagName) {
        if (!el || !tagName) return false;
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount || !_selectionInside(el)) return false;
        var range = sel.getRangeAt(0);
        var wrapper = document.createElement(tagName);
        try {
            range.surroundContents(wrapper);
        } catch (err) {
            var extracted = range.extractContents();
            wrapper.appendChild(extracted);
            range.insertNode(wrapper);
        }
        _previewClearOverridingOffStyles(wrapper, cmd);
        _cleanupPreviewSpans(wrapper);
        try {
            var nextRange = document.createRange();
            nextRange.selectNodeContents(wrapper);
            sel.removeAllRanges();
            sel.addRange(nextRange);
            activeTextRange = nextRange.cloneRange();
        } catch (err2) {}
        return true;
    }

    function _previewToggleInlineCommand(el, cmd) {
        if (!el || !cmd) return false;
        el.focus();
        var sel = window.getSelection();
        if (!_restoreTextRange(el) && (!sel || !sel.rangeCount || !_selectionInside(el))) {
            _selectTextContentsIfNeeded(el);
            sel = window.getSelection();
        } else {
            sel = window.getSelection();
        }
        var range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        if (range && range.collapsed && _restoreTextRange(el)) {
            sel = window.getSelection();
            range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        }
        if (!range || !_selectionInside(el)) return false;
        if (_previewRangeHasAnyInlineCommand(range, el, cmd)) {
            var holder = document.createDocumentFragment();
            holder.appendChild(_previewRemoveInlineCommandFromFragment(range.extractContents(), cmd));
            var first = holder.firstChild;
            var last = holder.lastChild;
            range.insertNode(holder);
            var nextRange = document.createRange();
            if (first && last) {
                nextRange.setStartBefore(first);
                nextRange.setEndAfter(last);
            } else if (first) {
                nextRange.selectNode(first);
            }
            sel.removeAllRanges();
            sel.addRange(nextRange);
            activeTextRange = nextRange.cloneRange();
            return true;
        }
        var map = { bold: 'B', italic: 'I', underline: 'U', strikeThrough: 'S' };
        var tag = map[cmd];
        var ok = tag ? _previewApplyInlineCommandWrap(el, cmd, tag) : false;
        if (!ok) {
            try {
                ok = document.execCommand(cmd, false, null);
            } catch (err) {
                ok = false;
            }
        }
        _rememberTextRange(el);
        return ok;
    }

    function _applyInlineStyleToPreviewSelection(el, prop, value, opts) {
        if (!el || !prop || !value) return false;
        opts = opts || {};
        el.focus();
        if (opts.forceWhole) _selectTextContents(el);
        else if (!_restoreTextRange(el)) _selectTextContentsIfNeeded(el);
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return false;
        var range = sel.getRangeAt(0);
        if (!_selectionInside(el)) return false;
        var span = document.createElement('span');
        span.style[prop] = value;
        try {
            range.surroundContents(span);
        } catch (err) {
            var contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
        }
        var cssProp = _stylePropToCss(prop);
        span.querySelectorAll('*').forEach(function(node) {
            if (node.style) node.style.removeProperty(cssProp);
            if (prop === 'color' && node.removeAttribute) node.removeAttribute('color');
            if (node.getAttribute && node.getAttribute('style') === '') node.removeAttribute('style');
        });
        _cleanupPreviewSpans(span);
        try {
            var nextRange = document.createRange();
            nextRange.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(nextRange);
            activeTextRange = nextRange.cloneRange();
        } catch (err2) {}
        return true;
    }

    function _safePreviewImageUrl(url) {
        var clean = String(url || '').trim();
        if (!clean) return '';
        if (/^(https?:|\/|data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,)/i.test(clean)) return clean;
        return '';
    }

    function _insertImageToPreviewSelection(el, url, alt) {
        if (!el) return false;
        var safeUrl = _safePreviewImageUrl(url);
        if (!safeUrl) return false;
        el.focus();
        if (!_restoreTextRange(el)) _selectTextContentsIfNeeded(el);
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount || !_selectionInside(el)) return false;
        var range = sel.getRangeAt(0);
        var img = document.createElement('img');
        img.setAttribute('src', safeUrl);
        img.setAttribute('alt', String(alt || '').slice(0, 180));
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        img.setAttribute('style', 'display:block;max-width:100%;height:auto;margin:16px auto;border-radius:14px;');
        range.deleteContents();
        range.insertNode(img);
        range = document.createRange();
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        activeTextRange = range.cloneRange();
        return true;
    }

    function _findPreviewTextFromPayload(payload) {
        if (!payload) return activeTextEl;
        var sectionId = payload.sectionId || '';
        var field = payload.arrayField || payload.field || '';
        var root = sectionId ? _findSectionEl(sectionId) : document;
        if (!root || !field) return activeTextEl;
        var candidates = root.querySelectorAll(editableTextSelector);
        for (var i = 0; i < candidates.length; i++) {
            var el = candidates[i];
            if ((payload.arrayName || '') && el.getAttribute('data-layout-array') !== String(payload.arrayName)) continue;
            if ((payload.index || payload.index === 0) && el.getAttribute('data-layout-index') !== String(payload.index)) continue;
            if ((payload.arrayField || '') && el.getAttribute('data-layout-array-field') !== String(payload.arrayField)) continue;
            if (!(payload.arrayField || '') && el.getAttribute('data-layout-field') !== String(field)) continue;
            return el;
        }
        return activeTextEl;
    }

    function _cssAttr(value) {
        return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function _closestScrollTarget(el) {
        if (!el || !el.closest) return el;
        return el.closest('.af-consult-field, .af-consult-card, .form-group, [data-layout-field], [data-layout-array-field]') || el;
    }

    function _fieldNameFromPath(path) {
        var clean = String(path || '').trim();
        var match = clean.match(/^fields\.([^.]+)\./);
        if (match) return match[1];
        return clean.indexOf('.') < 0 ? clean : '';
    }

    function _findPreviewScrollTarget(sectionEl, payload) {
        if (!sectionEl || !payload) return sectionEl;
        var fieldPath = String(payload.fieldPath || payload.arrayField || payload.field || '').trim();
        if (payload.arrayName && (payload.arrayField || payload.field)) {
            var arrayField = String(payload.arrayField || payload.field || '');
            var arraySelector = '[data-layout-array="' + _cssAttr(payload.arrayName) + '"][data-layout-array-field="' + _cssAttr(arrayField) + '"]';
            if (payload.index !== '' && payload.index !== undefined && payload.index !== null) {
                arraySelector += '[data-layout-index="' + _cssAttr(payload.index) + '"]';
            }
            var arrayTarget = sectionEl.querySelector(arraySelector);
            if (arrayTarget) return _closestScrollTarget(arrayTarget);
        }
        if (fieldPath.indexOf('cardTitles.') === 0) {
            var cardKey = fieldPath.split('.')[1] || '';
            var cardTarget = sectionEl.querySelector('[data-consult-card="' + _cssAttr(cardKey) + '"]');
            if (cardTarget) return cardTarget;
        }
        var fieldName = _fieldNameFromPath(fieldPath) || String(payload.field || '').trim();
        if (fieldPath) {
            var exactRichTarget = sectionEl.querySelector('[data-layout-field="' + _cssAttr(fieldPath) + '"]');
            if (exactRichTarget) return _closestScrollTarget(exactRichTarget);
        }
        if (fieldName) {
            var richTarget = sectionEl.querySelector('[data-layout-field="' + _cssAttr(fieldName) + '"]');
            if (richTarget) return _closestScrollTarget(richTarget);
            var formTarget = sectionEl.querySelector('[name="' + _cssAttr(fieldName) + '"]');
            if (formTarget) return _closestScrollTarget(formTarget);
        }
        if (fieldPath === 'submitText' || fieldPath === 'submittingText') {
            var buttonTarget = sectionEl.querySelector('[data-default-text], button[type="submit"]');
            if (buttonTarget) return buttonTarget;
        }
        if (fieldPath === 'successTitle' || fieldPath === 'successMessage') {
            var successTarget = sectionEl.querySelector('[data-consult-success]');
            if (successTarget) return successTarget;
        }
        return sectionEl;
    }

    function _syncPreviewClickUi() {
        document.documentElement.classList.toggle('layout-preview-click-select-enabled', !!clickSelectEnabled);
    }

    if (!document.getElementById('layoutPreviewBridgeStyle')) {
        var bridgeStyle = document.createElement('style');
        bridgeStyle.id = 'layoutPreviewBridgeStyle';
        bridgeStyle.textContent =
            'html.layout-editor-preview-chrome.layout-preview-click-select-enabled [data-section-id] { cursor: pointer; transition: outline 0.15s, outline-offset 0.15s; outline: 2px solid transparent; outline-offset: -2px; }' +
            'html.layout-editor-preview-chrome.layout-preview-click-select-enabled [data-section-id]:hover { outline: 2px solid rgba(217,119,87,0.55); outline-offset: -2px; }' +
            'html.layout-editor-preview-chrome [data-section-id].preview-selected { outline: 2px solid #D97757; outline-offset: -2px; }' +
            'html.layout-editor-preview-chrome .layout-section-crop-inner { transition: none; }' +
            'html.layout-editor-preview-chrome .layout-section-crop-handle { position:absolute; left:50%; width:74px; height:20px; margin-left:-37px; z-index:50; border:1px solid #D97757; border-radius:999px; background:#fffaf6; box-shadow:0 6px 16px rgba(0,0,0,0.18); cursor:ns-resize; display:none; align-items:center; justify-content:center; padding:0; }' +
            'html.layout-editor-preview-chrome .layout-section-crop-handle span { width:34px; height:3px; border-radius:999px; background:#D97757; display:block; }' +
            'html.layout-editor-preview-chrome [data-section-id].preview-selected > .layout-section-crop-handle { display:flex; }' +
            'html.layout-editor-preview-chrome .layout-section-crop-handle-top { top:6px; }' +
            'html.layout-editor-preview-chrome .layout-section-crop-handle-bottom { bottom:6px; }' +
            'html.layout-editor-preview-chrome.layout-section-crop-dragging, html.layout-editor-preview-chrome.layout-section-crop-dragging * { cursor:ns-resize !important; user-select:none !important; }';
        document.head.appendChild(bridgeStyle);
    }

    window.addEventListener('message', function(e) {
        if (!e || !e.data) return;
        if (e.data.type === 'layoutPreview' && onLayoutPreview && Array.isArray(e.data.sections)) {
            var selectedBefore = e.data.selectedSectionId ? _findSectionEl(e.data.selectedSectionId) : null;
            var selectedBeforeTop = selectedBefore && selectedBefore.getBoundingClientRect ? selectedBefore.getBoundingClientRect().top : null;
            var scrollBefore = window.scrollY || window.pageYOffset || 0;
            var editorScroll = e.data.editorScrollTarget;
            var editorScrollOk = editorScroll && editorScroll.sectionId && String(editorScroll.sectionId) === String(e.data.selectedSectionId || '');
            onLayoutPreview(e.data.sections, e.data);
            var restorePreviewScroll = function() {
                if (editorScrollOk) return;
                var selectedAfter = e.data.selectedSectionId ? _findSectionEl(e.data.selectedSectionId) : null;
                if (selectedAfter && selectedAfter.getBoundingClientRect && selectedBeforeTop !== null) {
                    var selectedAfterTop = selectedAfter.getBoundingClientRect().top;
                    window.scrollTo(window.scrollX || window.pageXOffset || 0, (window.scrollY || window.pageYOffset || 0) + selectedAfterTop - selectedBeforeTop);
                } else {
                    window.scrollTo(window.scrollX || window.pageXOffset || 0, scrollBefore);
                }
            };
            var applyEditorScroll = function() {
                if (!editorScrollOk) return;
                var sectionTarget = _findSectionEl(editorScroll.sectionId);
                var target = _findPreviewScrollTarget(sectionTarget, editorScroll);
                if (target && typeof target.scrollIntoView === 'function') {
                    try { target.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (err) {}
                }
            };
            restorePreviewScroll();
            applyEditorScroll();
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(function() {
                    restorePreviewScroll();
                    applyEditorScroll();
                });
            } else {
                setTimeout(function() {
                    restorePreviewScroll();
                    applyEditorScroll();
                }, 0);
            }
            _enablePreviewTextEditing();
            if (e.data.selectedSectionId) {
                var selected = _findSectionEl(e.data.selectedSectionId);
                if (selected) _ensureCropHandles(selected);
            }
            return;
        }
        if (e.data.type === 'previewTextCommand') {
            var textEl = _findPreviewTextFromPayload(e.data);
            if (!textEl) return;
            activeTextEl = textEl;
            var ok = false;
            if (e.data.command === 'style') {
                ok = _applyInlineStyleToPreviewSelection(textEl, e.data.styleProp, e.data.styleValue, { forceWhole: e.data.selectionAll === true });
            } else if (e.data.command === 'insertImage') {
                ok = _insertImageToPreviewSelection(textEl, e.data.imageUrl, e.data.imageAlt);
            } else if (e.data.command === 'exec' && e.data.execCommand) {
                textEl.focus();
                if (e.data.selectionAll === true) _selectTextContents(textEl);
                else if (!_restoreTextRange(textEl)) _selectTextContentsIfNeeded(textEl);
                if (_previewInlineCommandSpec(e.data.execCommand)) {
                    ok = _previewToggleInlineCommand(textEl, e.data.execCommand);
                } else {
                    try { ok = document.execCommand(e.data.execCommand, false, e.data.execValue || null); } catch (err) { ok = false; }
                }
                _rememberTextRange(textEl);
            }
            if (ok) {
                _postPreviewText('previewTextInput', textEl);
                _postPreviewText('previewTextSelection', textEl);
            }
            return;
        }
        if (e.data.type === 'scrollToSection' && e.data.sectionId) {
            var sectionTarget = _findSectionEl(e.data.sectionId);
            var target = _findPreviewScrollTarget(sectionTarget, e.data);
            if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        if (e.data.type === 'highlightSection') {
            _clearPreviewSelection();
            _allSectionEls().forEach(_removeCropHandles);
            if (e.data.sectionId) {
                var active = _findSectionEl(e.data.sectionId);
                if (active) {
                    active.classList.add('preview-selected');
                    _ensureCropHandles(active);
                }
            }
            return;
        }
        if (e.data.type === 'setPreviewClickSelectEnabled') {
            clickSelectEnabled = e.data.enabled !== false;
            _syncPreviewClickUi();
        }
    });

    document.addEventListener('focusin', function(e) {
        var textEl = _editableTextEl(e.target);
        if (!textEl) return;
        activeTextEl = textEl;
        _rememberTextRange(textEl);
        _postPreviewText('previewTextFocus', textEl);
    }, true);

    document.addEventListener('input', function(e) {
        var textEl = _editableTextEl(e.target);
        if (!textEl) return;
        activeTextEl = textEl;
        _rememberTextRange(textEl);
        _postPreviewText('previewTextInput', textEl);
    }, true);

    document.addEventListener('keydown', function(e) {
        var textEl = _editableTextEl(e.target);
        if (!textEl) return;
        if ((e.metaKey || e.ctrlKey) && String(e.key || '').toLowerCase() === 'a') {
            e.preventDefault();
            e.stopPropagation();
            activeTextEl = textEl;
            if (_selectTextContents(textEl)) {
                _postPreviewText('previewTextSelection', textEl);
            }
        }
    }, true);

    document.addEventListener('selectionchange', function() {
        var sel = window.getSelection();
        var node = sel && sel.rangeCount ? sel.anchorNode : null;
        var textEl = _editableTextEl(node);
        if (!textEl) return;
        activeTextEl = textEl;
        _rememberTextRange(textEl);
        _postPreviewText('previewTextSelection', textEl);
    });

    document.addEventListener('click', function(e) {
        var textEl = _editableTextEl(e.target);
        if (!textEl) return;
        if (!previewChromeEnabled) return;
        activeTextEl = textEl;
        textEl.focus();
        _rememberTextRange(textEl);
        _clearPreviewSelection();
        var secEl = textEl.closest(sectionSelector);
        if (secEl) {
            secEl.classList.add('preview-selected');
            _ensureCropHandles(secEl);
        }
        _postPreviewText('previewTextFocus', textEl);
        if (e.target && e.target.closest && e.target.closest('a')) e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        else e.stopPropagation();
    }, true);

    document.addEventListener('click', function(e) {
        var secEl = e.target && e.target.closest ? e.target.closest(sectionSelector) : null;
        if (!secEl) return;
        if (!clickSelectEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        _clearPreviewSelection();
        _allSectionEls().forEach(_removeCropHandles);
        secEl.classList.add('preview-selected');
        _ensureCropHandles(secEl);
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(Object.assign({
                type: 'previewSectionClick',
                sectionId: secEl.getAttribute('data-section-id')
            }, _previewClickTargetPayload(e.target, secEl)), '*');
        }
    }, true);

    document.addEventListener('pointerdown', function(e) {
        var handle = e.target && e.target.closest ? e.target.closest('.layout-section-crop-handle') : null;
        if (!handle) return;
        var secEl = handle.closest(sectionSelector);
        if (!secEl) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        cropDrag = {
            sectionEl: secEl,
            edge: handle.getAttribute('data-crop-edge') || 'bottom',
            startY: e.clientY,
            startTop: aiflowSectionCropNumber(secEl.getAttribute('data-layout-crop-top')),
            startBottom: aiflowSectionCropNumber(secEl.getAttribute('data-layout-crop-bottom')),
            startHeight: aiflowSectionCropNumber(secEl.getAttribute('data-layout-crop-height')) || Math.max(24, secEl.getBoundingClientRect().height)
        };
        document.documentElement.classList.add('layout-section-crop-dragging');
        try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    }, true);

    document.addEventListener('pointermove', function(e) {
        if (!cropDrag || !cropDrag.sectionEl) return;
        e.preventDefault();
        var dy = e.clientY - cropDrag.startY;
        var top = cropDrag.startTop;
        var bottom = cropDrag.startBottom;
        var height = cropDrag.startHeight;
        var inner = cropDrag.sectionEl.querySelector(':scope > .layout-section-crop-inner');
        var naturalHeight = Math.max(
            inner ? (inner.scrollHeight || 0) : 0,
            inner ? (inner.offsetHeight || 0) : 0,
            inner && inner.getBoundingClientRect ? Math.ceil(inner.getBoundingClientRect().height) : 0,
            cropDrag.sectionEl.scrollHeight || 0
        );
        var minHeight = 24;
        if (cropDrag.edge === 'top') {
            var fixedBottomEdge = cropDrag.startTop + cropDrag.startHeight;
            top = cropDrag.startTop + dy;
            if (top < 0) top = 0;
            if (top > fixedBottomEdge - minHeight) top = fixedBottomEdge - minHeight;
            height = Math.max(minHeight, fixedBottomEdge - top);
            bottom = Math.max(0, naturalHeight - top - height);
        } else {
            height = Math.max(minHeight, cropDrag.startHeight + dy);
            top = cropDrag.startTop;
            bottom = Math.max(0, naturalHeight - top - height);
        }
        _applyCropValues(cropDrag.sectionEl, top, bottom, height);
        _postCropChange(cropDrag.sectionEl);
    }, true);

    function _finishCropDrag() {
        if (!cropDrag) return;
        _postCropChange(cropDrag.sectionEl);
        cropDrag = null;
        document.documentElement.classList.remove('layout-section-crop-dragging');
    }

    document.addEventListener('pointerup', _finishCropDrag, true);
    document.addEventListener('pointercancel', _finishCropDrag, true);

    _syncPreviewClickUi();
    if (previewChromeEnabled) {
        _enablePreviewTextEditing();
    }

    window.__layoutPreviewBridgeApi = {
        setClickSelectEnabled: function(enabled) {
            clickSelectEnabled = previewChromeEnabled && (enabled !== false);
            _syncPreviewClickUi();
        },
        refreshEditableText: function() {
            _enablePreviewTextEditing();
        }
    };
    window.__layoutPreviewBridgeInit = true;
    return window.__layoutPreviewBridgeApi;
}
