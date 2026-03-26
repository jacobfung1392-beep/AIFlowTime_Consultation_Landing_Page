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

    document.querySelectorAll(selector).forEach(function(el) { observer.observe(el); });
}

var _aiflowFreeMaterialConfigs = {};
var _aiflowFreeMaterialState = { activeKey: '', busy: false, selectedDoc: null };

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
        '.af-free-material-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:24px;background:var(--af-modal-backdrop);}' +
        '.af-free-material-modal.show{display:flex;}' +
        '.af-free-material-dialog{width:min(560px,100%);background:#fff;border-radius:24px;padding:26px;box-shadow:0 24px 80px rgba(0,0,0,0.20);position:relative;}' +
        '.af-free-material-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border:none;border-radius:50%;background:rgba(0,0,0,0.06);color:#333;font-size:20px;cursor:pointer;}' +
        '.af-free-material-dialog h3{margin:0;font-size:28px;line-height:1.1;color:#231f20;}' +
        '.af-free-material-dialog p{margin:12px 0 0;color:rgba(35,31,32,0.72);line-height:1.7;}' +
        '.af-free-material-form{margin-top:20px;display:grid;gap:14px;}' +
        '.af-free-material-form label{display:block;margin-bottom:6px;font-size:13px;font-weight:700;color:#231f20;}' +
        '.af-free-material-form input{width:100%;padding:13px 14px;border:1px solid rgba(35,31,32,0.12);border-radius:14px;font:inherit;font-size:15px;}' +
        '.af-free-material-consent{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.6;color:rgba(35,31,32,0.78);}' +
        '.af-free-material-consent input{width:16px;height:16px;margin-top:3px;flex:0 0 16px;}' +
        '.af-free-material-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:6px;}' +
        '.af-free-material-submit{border:none;border-radius:999px;background:#D97757;color:#fff;padding:13px 22px;font:inherit;font-weight:700;cursor:pointer;}' +
        '.af-free-material-submit[disabled]{opacity:.65;cursor:wait;}' +
        '.af-free-material-status{font-size:13px;line-height:1.6;color:rgba(35,31,32,0.72);min-height:20px;}' +
        '.af-free-material-status.error{color:#b3261e;}' +
        '.af-free-material-status.success{color:#177245;}' +
        '.af-doc-picker-list{display:flex;flex-direction:column;gap:10px;margin:20px 0 0;}' +
        '.af-doc-picker-card{display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(35,31,32,0.03);border:1px solid rgba(35,31,32,0.08);border-radius:16px;cursor:pointer;transition:all .15s;}' +
        '.af-doc-picker-card:hover{background:rgba(217,119,87,0.08);border-color:rgba(217,119,87,0.3);transform:translateY(-1px);}' +
        '.af-doc-picker-badge{flex:0 0 44px;height:44px;display:flex;align-items:center;justify-content:center;background:#D97757;color:#fff;border-radius:12px;font-size:13px;font-weight:800;letter-spacing:.04em;}' +
        '.af-doc-picker-name{flex:1;min-width:0;font-size:15px;font-weight:600;color:#231f20;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.af-doc-picker-arrow{flex:0 0 20px;color:rgba(35,31,32,0.3);font-size:18px;}' +
        '@media (max-width: 860px){.af-free-material-shell{grid-template-columns:1fr;gap:18px;}.af-free-material-visual{min-height:220px;}.af-free-material-dialog{padding:22px 18px;}}';
    document.head.appendChild(style);
}

function registerFreeMaterialConfig(pageKey, sectionId, content) {
    var key = String(pageKey || 'page') + '::' + String(sectionId || ('section-' + Date.now()));
    _aiflowFreeMaterialConfigs[key] = JSON.parse(JSON.stringify(content || {}));
    return key;
}

function renderFreeMaterialSection(el, pageKey, sectionId, content, theme) {
    if (!el) return;
    _aiflowEnsureFreeMaterialStyles();
    var cfg = content || {};
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
    modal.className = 'af-free-material-modal';
    modal.innerHTML =
        '<div class="af-free-material-dialog">' +
            '<button type="button" class="af-free-material-close" aria-label="Close">&times;</button>' +
            '<h3 id="aiflowFreeMaterialModalTitle"></h3>' +
            '<p id="aiflowFreeMaterialModalDesc"></p>' +
            '<form class="af-free-material-form" id="aiflowFreeMaterialForm">' +
                '<div><label id="aiflowFmNameLabel" for="aiflowFmName">姓名</label><input id="aiflowFmName" name="name" type="text" autocomplete="name" required></div>' +
                '<div><label id="aiflowFmEmailLabel" for="aiflowFmEmail">Email</label><input id="aiflowFmEmail" name="email" type="email" autocomplete="email" required></div>' +
                '<label class="af-free-material-consent" id="aiflowFmConsentWrap"><input id="aiflowFmConsent" name="consent" type="checkbox"><span id="aiflowFmConsentText"></span></label>' +
                '<div class="af-free-material-actions">' +
                    '<div class="af-free-material-status" id="aiflowFmStatus"></div>' +
                    '<button class="af-free-material-submit" id="aiflowFmSubmit" type="submit">送出</button>' +
                '</div>' +
            '</form>' +
        '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeFreeMaterialModal();
    });
    modal.querySelector('.af-free-material-close').onclick = closeFreeMaterialModal;
    modal.querySelector('#aiflowFreeMaterialForm').addEventListener('submit', _submitFreeMaterialRequest);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) closeFreeMaterialModal();
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
    var th = _aiflowFreeMaterialState.theme;
    var doc = _aiflowFreeMaterialState.selectedDoc;
    var docName = (doc && doc.name) ? ' — ' + doc.name : '';
    modal.style.setProperty('--af-modal-backdrop', th.backdrop);
    modal.querySelector('#aiflowFreeMaterialModalTitle').innerHTML = _aiflowFreeMaterialRichText((cfg.materialTitle || cfg.title || '免費資料下載') + docName);
    modal.querySelector('#aiflowFreeMaterialModalDesc').innerHTML = _aiflowFreeMaterialRichText(cfg.description || '');
    modal.querySelector('#aiflowFmNameLabel').textContent = cfg.nameFieldLabel || '姓名';
    modal.querySelector('#aiflowFmEmailLabel').textContent = cfg.emailFieldLabel || 'Email';
    modal.querySelector('#aiflowFmConsentText').innerHTML = _aiflowFreeMaterialRichText(cfg.consentText || '');
    modal.querySelector('#aiflowFmConsentWrap').style.display = cfg.consentText ? 'flex' : 'none';
    modal.querySelector('#aiflowFmConsent').checked = false;
    modal.querySelector('#aiflowFmSubmit').textContent = cfg.submitText || '立即寄送';
    modal.querySelector('#aiflowFmStatus').textContent = '';
    modal.querySelector('#aiflowFmStatus').className = 'af-free-material-status';
    modal.querySelector('#aiflowFreeMaterialForm').reset();
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    setTimeout(function() {
        var inp = modal.querySelector('#aiflowFmName');
        if (inp) inp.focus();
    }, 20);
}

function closeFreeMaterialModal() {
    var modal = document.getElementById('aiflowFreeMaterialModal');
    if (!modal) return;
    modal.classList.remove('show');
    document.body.style.overflow = '';
    _aiflowFreeMaterialState.busy = false;
}

function _buildFreeMaterialEmailHtml(name, doc, cfg) {
    var title = cfg.materialTitle || '免費資料';
    var docName = (doc && doc.name) || cfg.fileName || 'notes.pdf';
    var docUrl = (doc && doc.url) || cfg.pdfUrl || '';
    return '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">' +
        '<h2 style="color:#222;">Hi ' + (name || '').replace(/</g, '&lt;') + '!</h2>' +
        '<p style="font-size:16px;line-height:1.6;color:#444;">感謝你的申請！你請求的「<strong>' +
        (title).replace(/</g, '&lt;') + '</strong>」已附在這封 email 中。</p>' +
        '<p style="font-size:16px;line-height:1.6;color:#444;">如果附件未能顯示，你也可以直接點擊下方連結下載：</p>' +
        '<p style="margin:20px 0;"><a href="' + docUrl + '" ' +
        'style="display:inline-block;padding:12px 28px;background:#FF6B2C;color:#fff;' +
        'text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">' +
        '下載 ' + docName.replace(/</g, '&lt;') + '</a></p>' +
        '<hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;">' +
        '<p style="font-size:12px;color:#999;">此郵件由 AIFLOWTIME 自動發送。</p>' +
        '</div>';
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
    var leadData = {
        name: name,
        email: email,
        materialTitle: cfg.materialTitle || '',
        documentName: docName,
        documentUrl: docUrl,
        pageKey: meta.pageKey || '',
        pagePath: meta.pagePath || window.location.pathname,
        pageTitle: meta.pageTitle || document.title,
        sectionId: meta.sectionId || '',
        consentAccepted: consentAccepted,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    var subject = cfg.emailSubject || ('AIFLOWTIME — ' + (cfg.materialTitle || '你的免費資料'));
    var htmlBody = _buildFreeMaterialEmailHtml(name, doc, cfg);

    var attachments = [];
    if (docUrl) {
        var attachFileName = docName || 'document';
        if (!/\.\w{2,5}$/.test(attachFileName)) attachFileName += '.pdf';
        attachments.push({ filename: attachFileName, path: docUrl });
    }
    var mailData = {
        to: [email],
        message: { subject: subject, html: htmlBody }
    };
    if (attachments.length) mailData.message.attachments = attachments;

    var leadRef = db.collection('freeMaterialLeads').doc();
    leadData.mailDocId = leadRef.id;

    Promise.all([
        leadRef.set(leadData),
        db.collection('mail').doc(leadRef.id).set(mailData)
    ]).then(function() {
        status.textContent = cfg.successMessage || '已寄送，請查看你的 email。';
        status.className = 'af-free-material-status success';
        submitBtn.disabled = false;
        _aiflowFreeMaterialState.busy = false;
        _aiflowFreeMaterialState.selectedDoc = null;
        setTimeout(closeFreeMaterialModal, 1600);
    }).catch(function(err) {
        status.textContent = '寄送失敗，請稍後再試。';
        status.className = 'af-free-material-status error';
        submitBtn.disabled = false;
        _aiflowFreeMaterialState.busy = false;
    });
}
