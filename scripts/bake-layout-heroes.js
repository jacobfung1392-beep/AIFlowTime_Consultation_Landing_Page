#!/usr/bin/env node
/**
 * Bakes CMS hero blocks from Firestore into static HTML for faster first paint.
 *
 * Targets: linktree, workshop-main (ai-beginner-workshop), workshop-0 (Kimi page), workshop-c.
 *
 * ADC: gcloud auth application-default login
 *
 * Usage:
 *   node scripts/bake-layout-heroes.js           # all pages
 *   node scripts/bake-layout-heroes.js linktree # one page
 */
/* eslint-disable no-console */

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var admin = require('firebase-admin');
var JSDOM = require('jsdom').JSDOM;

var ROOT = path.join(__dirname, '..');
var FIREBASERC = path.join(ROOT, '.firebaserc');

function markerBegin(id) {
    return '<!-- BAKE_LAYOUT_HERO:' + id + ':BEGIN -->';
}
function markerEnd(id) {
    return '<!-- BAKE_LAYOUT_HERO:' + id + ':END -->';
}

var TARGETS = [
    { key: 'linktree', docId: 'linktree', relPath: 'linktree.html', flavor: 'linktree' },
    { key: 'workshop-main', docId: 'workshop-main', relPath: 'ai-beginner-workshop.html', flavor: 'workshopMain' },
    { key: 'workshop-0', docId: 'workshop-0', relPath: 'Kimi_Agent_AI Workshop Landing Page/index.html', flavor: 'workshop0' },
    { key: 'workshop-c', docId: 'workshop-c', relPath: 'workshop-c.html', flavor: 'workshopC' }
];

function loadRichTextRenderer() {
    var dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://aiflowtime-hk.web.app/'
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.navigator = dom.window.navigator;
    var code = fs.readFileSync(path.join(ROOT, 'js', 'shared-utils.js'), 'utf8');
    vm.runInThisContext(code, { filename: 'shared-utils.js' });
    if (typeof aiflowRenderRichTextHtml !== 'function') {
        throw new Error('shared-utils did not define aiflowRenderRichTextHtml');
    }
}

function _escHtml(s) {
    return global.escHtml(s);
}

function _richTextHtml(value) {
    return aiflowRenderRichTextHtml(value);
}

function findHeroSection(sections, preferredId) {
    if (!Array.isArray(sections)) return null;
    if (preferredId) {
        for (var i = 0; i < sections.length; i++) {
            if (sections[i] && sections[i].id === preferredId && sections[i].type === 'hero') return sections[i];
        }
    }
    for (var j = 0; j < sections.length; j++) {
        if (sections[j] && sections[j].type === 'hero') return sections[j];
    }
    return null;
}

function workshopIdFromSections(sections) {
    for (var i = 0; i < (sections || []).length; i++) {
        var s = sections[i];
        if (s && s.type === 'logistics-card' && s.content) {
            var id = String(s.content.workshopId || '').trim();
            if (id) return id;
        }
    }
    return 'workshop-0';
}

/* ---------- Linktree (same as prior bake-linktree-hero) ---------- */

function createDefaultLinktreeHeaderSection() {
    return {
        id: 'lt-header',
        type: 'hero',
        visible: true,
        content: {
            title: 'AIFlowTime的世界',
            subtitle: '用 AI 換時間｜建立會自己跑的工作系統\n專為斜槓族、AI 新手、小生意老闆而設',
            ctaVisible: true,
            ctaText: '立即預留名額',
            ctaActionId: 'go-to-payment',
            secondaryCtaVisible: true,
            secondaryCtaText: '了解更多',
            secondaryCtaActionId: 'learn-more',
            gifUrl: 'Landing-page-logo.png'
        }
    };
}

function _ltIsIncompletePaymentLink(url) {
    var raw = String(url || '').trim();
    return !raw || /^\/workshop-payment\?id=?$/i.test(raw);
}

function _ltDefaultHeroPaymentLink() {
    return '/workshop-payment?id=workshop-0';
}

function _ltHeroOptionIdFromLabel(label, idx) {
    var slug = String(label || '')
        .toLowerCase()
        .replace(/<[^>]+>/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return slug || ('option-' + idx);
}

function _ltNormalizeHeroButtonOptions(sectionId, content) {
    var defaults = [
        { id: 'go-to-payment', label: 'Go to payment / 立即報名', url: _ltDefaultHeroPaymentLink() },
        { id: 'book-appointment', label: 'Book appointment / 預約諮詢', url: '/consultation' },
        { id: 'learn-more', label: 'Learn more / 了解更多', url: sectionId === 'lt-header' ? '#lt-services' : '#experience' }
    ];
    var raw = Array.isArray(content && content.buttonOptions)
        ? JSON.parse(JSON.stringify(content.buttonOptions))
        : [];
    var seen = {};
    var merged = defaults.map(function(def, idx) {
        var match = null;
        for (var i = 0; i < raw.length; i++) {
            if (String((raw[i] && raw[i].id) || '') === def.id) {
                match = raw[i];
                break;
            }
        }
        var next = Object.assign({}, def, match || {});
        next.id = String(next.id || '').trim() || _ltHeroOptionIdFromLabel(next.label, idx);
        next.label = String(next.label || '').trim();
        next.url = String(next.url || '').trim();
        if (next.id === 'go-to-payment' && _ltIsIncompletePaymentLink(next.url)) next.url = _ltDefaultHeroPaymentLink();
        if (next.id === 'book-appointment' && !next.url) next.url = '/consultation';
        if (next.id === 'learn-more' && !next.url) next.url = sectionId === 'lt-header' ? '#lt-services' : '#experience';
        seen[next.id] = true;
        return next;
    });
    raw.forEach(function(opt, idx) {
        var next = Object.assign({ id: '', label: '', url: '' }, opt || {});
        next.id = String(next.id || '').trim() || _ltHeroOptionIdFromLabel(next.label, idx + defaults.length);
        next.label = String(next.label || '').trim();
        next.url = String(next.url || '').trim();
        if (seen[next.id] || (!next.label && !next.url)) return;
        seen[next.id] = true;
        merged.push(next);
    });
    return merged;
}

function _ltResolveHeroButtonUrl(sectionId, content, actionId, fallbackLink) {
    var options = _ltNormalizeHeroButtonOptions(sectionId, content);
    var targetId = String(actionId || '').trim();
    for (var i = 0; i < options.length; i++) {
        if (options[i].id === targetId && String(options[i].url || '').trim()) return String(options[i].url || '').trim();
    }
    var fallback = String(fallbackLink || '').trim();
    if (_ltIsIncompletePaymentLink(fallback)) return _ltDefaultHeroPaymentLink();
    return fallback;
}

function _ltNormalizeHeroContent(sectionId, content) {
    var raw = content && typeof content === 'object' ? content : {};
    var next = JSON.parse(JSON.stringify(raw || {}));
    next.ctaVisible = raw.ctaVisible !== false;
    next.ctaShimmer = raw.ctaShimmer === true || String(raw.ctaShimmer || '').toLowerCase() === 'true';
    if (!String(next.title || '').replace(/<[^>]+>/g, ' ').trim() && sectionId === 'lt-header') {
        next.title = 'AIFlowTime的世界';
    }
    next.buttonOptions = _ltNormalizeHeroButtonOptions(sectionId, next);
    if (!String(next.ctaActionId || '').trim()) next.ctaActionId = 'go-to-payment';
    if (sectionId === 'lt-header') {
        if (!String(next.secondaryCtaText || '').trim()) next.secondaryCtaText = '了解更多';
        next.secondaryCtaVisible = raw.secondaryCtaVisible === undefined ? true : raw.secondaryCtaVisible !== false;
        if (!String(next.secondaryCtaActionId || '').trim()) next.secondaryCtaActionId = 'learn-more';
    } else {
        next.secondaryCtaVisible = raw.secondaryCtaVisible === true ||
            (raw.secondaryCtaVisible !== false && !!String(next.secondaryCtaText || '').trim());
    }
    next.ctaLink = _ltResolveHeroButtonUrl(sectionId, next, next.ctaActionId, raw.ctaLink || next.ctaLink);
    next.secondaryCtaLink = _ltResolveHeroButtonUrl(sectionId, next, next.secondaryCtaActionId, raw.secondaryCtaLink || next.secondaryCtaLink);
    var hms = parseInt(raw.heroMediaSizePercent != null ? raw.heroMediaSizePercent : next.heroMediaSizePercent, 10);
    if (isNaN(hms)) hms = 100;
    next.heroMediaSizePercent = Math.max(30, Math.min(100, hms));
    return next;
}

function _ltHeroButtonStyle(colors, includeBorder) {
    var styles = [];
    if (colors && colors.bg) styles.push('background:' + colors.bg);
    if (colors && colors.text) styles.push('color:' + colors.text);
    if (includeBorder && colors && colors.border) styles.push('border-color:' + colors.border);
    return styles.length ? ' style="' + _escHtml(styles.join(';')) + '"' : '';
}

function _ltHeroButtonAttrs(url) {
    var href = String(url || '').trim() || '#';
    if (/^https?:/i.test(href)) return ' href="' + _escHtml(href) + '" target="_blank" rel="noopener noreferrer"';
    return ' href="' + _escHtml(href) + '"';
}

function _ltDeriveManagedVideoPosterUrl(src) {
    var raw = String(src || '').trim();
    if (!raw) return '';
    if (/storageProxy\?path=/i.test(raw)) {
        try {
            var proxyUrl = new URL(raw, 'https://aiflowtime-hk.web.app');
            var pathVal = proxyUrl.searchParams.get('path') || '';
            if (!/\.(mp4|mov|webm)$/i.test(pathVal)) return '';
            proxyUrl.searchParams.set('path', pathVal.replace(/\.(mp4|mov|webm)$/i, '.jpg'));
            return proxyUrl.toString();
        } catch (err) {
            return raw.replace(/\.(mp4|mov|webm)(?=(?:[?#].*)?$)/i, '.jpg');
        }
    }
    return raw.replace(/\.(mp4|mov|webm)(?=(?:[?#].*)?$)/i, '.jpg');
}

function _ltRenderManagedVideo(src, className, inlineStyle) {
    var poster = _ltDeriveManagedVideoPosterUrl(src);
    var attrs = ['class="' + _escHtml(className || 'lt-managed-video') + '"'];
    attrs.push('src="' + _escHtml(src || '') + '"');
    attrs.push('data-video-src="' + _escHtml(src || '') + '"');
    attrs.push('muted', 'autoplay', 'loop', 'playsinline', 'webkit-playsinline', 'disablepictureinpicture');
    attrs.push('preload="auto"');
    if (poster) attrs.push('poster="' + _escHtml(poster) + '"');
    if (inlineStyle) attrs.push('style="' + _escHtml(inlineStyle) + '"');
    return '<video ' + attrs.join(' ') + '></video>';
}

function mergeLinktreeHeaderFromSections(sections) {
    var defaultHeader = createDefaultLinktreeHeaderSection();
    var raw = findHeroSection(sections, 'lt-header');
    var header = Object.assign({}, defaultHeader, raw || {}, { id: 'lt-header', type: 'hero', visible: true });
    header.content = Object.assign({}, defaultHeader.content, (raw && raw.content) || {});
    return header;
}

function buildLinktreeHeroInnerHtml(section) {
    var heroCfg = _ltNormalizeHeroContent(section.id, section.content || {});
    var titleHtml = _richTextHtml(heroCfg.title || '');
    var subtitleHtml = _richTextHtml(heroCfg.subtitle || '');
    var badgeText = _richTextHtml(heroCfg.badge || '');
    var mediaHtml = '';
    if (heroCfg.gifUrl) {
        var heroSrc = String(heroCfg.gifUrl);
        var heroIsVideo = /\.(mp4|webm|mov)(?:[?#]|$)/i.test(heroCfg.gifUrl);
        var _hms = parseInt(heroCfg.heroMediaSizePercent, 10);
        var _wrapW = '';
        if (!isNaN(_hms) && _hms < 100) {
            var _pct = Math.max(30, Math.min(100, _hms));
            _wrapW = ' style="width:min(100%,' + Math.round(480 * _pct / 100) + 'px)"';
        }
        mediaHtml = '<div class="hero-media-wrap hero-media-ready' + (heroIsVideo ? ' lt-video-wrap' : '') + '"' + _wrapW + '>' +
            (heroIsVideo
                ? _ltRenderManagedVideo(heroSrc, 'hero-media lt-managed-video', '')
                : '<img class="hero-media" src="' + _escHtml(heroSrc) + '" alt="' + _escHtml(String(heroCfg.title || 'AIFlowTime').replace(/<[^>]+>/g, ' ').trim() || 'AIFlowTime') + '">') +
            '</div>';
    }
    var ctaHtml = _richTextHtml(heroCfg.ctaText || '');
    var ctaVisible = heroCfg.ctaVisible !== false && String(ctaHtml || '').replace(/<[^>]+>/g, ' ').trim();
    var learnHtml = _richTextHtml(heroCfg.secondaryCtaText || '');
    var learnVisible = heroCfg.secondaryCtaVisible !== false && String(learnHtml || '').replace(/<[^>]+>/g, ' ').trim();
    var buttons = [];
    if (ctaVisible) {
        buttons.push('<a class="btn-primary' + (heroCfg.ctaShimmer ? ' aiflow-btn-shimmer' : '') + '"' + _ltHeroButtonAttrs(heroCfg.ctaLink) + _ltHeroButtonStyle({ bg: heroCfg.ctaBgColor, text: heroCfg.ctaTextColor }, false) + '>' + ctaHtml + '</a>');
    }
    if (learnVisible) {
        buttons.push('<a class="btn-outline"' + _ltHeroButtonAttrs(heroCfg.secondaryCtaLink) + _ltHeroButtonStyle({ bg: heroCfg.secondaryCtaBgColor, text: heroCfg.secondaryCtaTextColor, border: heroCfg.secondaryCtaBorderColor }, true) + '>' + learnHtml + '</a>');
    }
    var scrollHintHtml = '';
    if (heroCfg.showScrollHint !== false) {
        scrollHintHtml = '<div class="scroll-hint"' + (heroCfg.scrollHintColor ? ' style="color:' + _escHtml(heroCfg.scrollHintColor) + ';"' : '') + '>' +
            '<div class="scroll-hint-pill"' + (heroCfg.scrollHintColor ? ' style="border-color:' + _escHtml(heroCfg.scrollHintColor) + ';"' : '') + '>' +
                '<div class="scroll-hint-dot"' + (heroCfg.scrollHintDotColor ? ' style="background:' + _escHtml(heroCfg.scrollHintDotColor) + ';"' : '') + '></div>' +
            '</div>' +
            '<span>SCROLL</span>' +
        '</div>';
    }
    return mediaHtml +
        (String(badgeText || '').replace(/<[^>]+>/g, ' ').trim() ? '<div class="hero-badge">' + badgeText + '</div>' : '') +
        '<h1 class="hero-title">' + titleHtml + '</h1>' +
        (subtitleHtml ? '<p class="hero-tagline">' + subtitleHtml + '</p>' : '') +
        (buttons.length ? '<div class="cta-group">' + buttons.join('') + '</div>' : '') +
        scrollHintHtml;
}

/* ---------- Workshop main (ai-beginner) ---------- */

var WM_DEFAULT_CONTENT = {
    title: '把 AI 變成你的時間槓桿',
    subtitle: '學會建立<span style="color:var(--accent); font-weight:800; font-size:1.15em;">可複製的工作系統</span>，每週多出 <span style="color:var(--accent); font-weight:800; font-size:1.15em;">5–10 小時</span>，從混亂走向<span style="color:var(--accent); font-weight:800; font-size:1.15em;">掌控</span>。',
    ctaText: '立即預留名額',
    ctaLink: '/workshop-payment?id=workshop-0',
    gifUrl: 'Capy Yawn.mp4',
    heroMediaSizePercent: 100,
    ctaShimmer: true
};

function mergeWorkshopMainHero(sections) {
    var raw = findHeroSection(sections, 'hero_default');
    return {
        id: 'hero_default',
        type: 'hero',
        visible: true,
        content: Object.assign({}, WM_DEFAULT_CONTENT, (raw && raw.content) || {})
    };
}

function buildWorkshopMainSectionHtml(section) {
    var c = section.content || {};
    var titleHtml = _richTextHtml(c.title || '');
    var subHtml = _richTextHtml(c.subtitle || '');
    var ctaHtml = _richTextHtml(c.ctaText || '');
    var ctaHref = String(c.ctaLink || '/workshop-payment?id=workshop-0').trim() || '/workshop-payment?id=workshop-0';
    var shimmer = c.ctaShimmer === undefined ? true : (c.ctaShimmer === true || String(c.ctaShimmer || '').toLowerCase() === 'true');
    var btnClass = 'btn' + (shimmer ? ' btn-shimmer' : '');
    var gifWrapStyle = 'text-align: center; margin-bottom: 24px;';
    var innerMedia = '';
    if (c.gifUrl) {
        var heroSrc = String(c.gifUrl);
        var isVid = /\.(mp4|webm|mov)(?:[?#]|$)/i.test(heroSrc);
        var hms = parseInt(c.heroMediaSizePercent, 10);
        if (!isNaN(hms) && hms < 100) {
            var pct = Math.max(30, Math.min(100, hms));
            gifWrapStyle += 'max-width:min(100%, ' + Math.round(420 * pct / 100) + 'px);margin-left:auto;margin-right:auto;';
        }
        innerMedia = isVid
            ? _ltRenderManagedVideo(heroSrc, 'hero-gif', '')
            : '<img class="hero-gif" src="' + _escHtml(heroSrc) + '" alt="' + _escHtml(String(c.title || '').replace(/<[^>]+>/g, ' ').trim() || 'Hero') + '" loading="eager" decoding="async">';
    }
    var mediaBlock = c.gifUrl
        ? '<div class="hero-gif-wrap hero-media-ready" style="' + _escHtml(gifWrapStyle) + '">' + innerMedia + '</div>'
        : '<div class="hero-gif-wrap hero-media-ready" style="' + _escHtml(gifWrapStyle) + '"></div>';
    return '<section class="hero" data-section-id="hero_default" data-section-type="hero" data-layout-hero-baked="1">\n' +
        '<div class="container">\n' +
        mediaBlock + '\n' +
        '<div class="hero-content">\n' +
        '<h1>' + titleHtml + '</h1>\n' +
        '<p class="hero-subtitle" style="font-size:clamp(16px, 2.2vw, 20px); color:var(--text); font-weight:500; line-height:1.7; max-width:560px; margin:0 auto 40px;">' + subHtml + '</p>\n' +
        '<div class="hero-cta">\n' +
        '<a href="' + _escHtml(ctaHref) + '" class="' + _escHtml(btnClass) + '">' + ctaHtml + '</a>\n' +
        '</div>\n' +
        '</div>\n' +
        '</section>';
}

/* ---------- Workshop 0 (Kimi) ---------- */

function _w0IsIncompletePaymentLink(url) {
    var raw = String(url || '').trim();
    return !raw || /^\/workshop-payment\?id=?$/i.test(raw);
}

function w0NormalizeHeroButtonOptionsBake(secId, content, payment) {
    var defaults = [
        { id: 'go-to-payment', label: 'Go to payment / 立即報名', url: payment },
        { id: 'book-appointment', label: 'Book appointment / 預約諮詢', url: '/consultation' },
        { id: 'learn-more', label: 'Learn more / 了解更多', url: secId === 'wc-hero' ? '#logistics' : '#experience' }
    ];
    var raw = Array.isArray(content && content.buttonOptions) ? JSON.parse(JSON.stringify(content.buttonOptions)) : [];
    var seen = {};
    var merged = defaults.map(function(def, idx) {
        var match = null;
        for (var i = 0; i < raw.length; i++) {
            if (String((raw[i] && raw[i].id) || '') === def.id) {
                match = raw[i];
                break;
            }
        }
        var opt = Object.assign({}, def, match || {});
        opt.id = String(opt.id || '').trim() || _ltHeroOptionIdFromLabel(opt.label, idx);
        opt.label = String(opt.label || '').trim();
        opt.url = String(opt.url || '').trim();
        if (opt.id === 'go-to-payment' && _w0IsIncompletePaymentLink(opt.url)) opt.url = payment;
        if (opt.id === 'book-appointment' && !opt.url) opt.url = '/consultation';
        if (opt.id === 'learn-more' && !opt.url) opt.url = secId === 'wc-hero' ? '#logistics' : '#experience';
        seen[opt.id] = true;
        return opt;
    });
    raw.forEach(function(r, idx) {
        var opt = Object.assign({ id: '', label: '', url: '' }, r || {});
        opt.id = String(opt.id || '').trim() || _ltHeroOptionIdFromLabel(opt.label, idx + defaults.length);
        opt.label = String(opt.label || '').trim();
        opt.url = String(opt.url || '').trim();
        if (seen[opt.id] || (!opt.label && !opt.url)) return;
        seen[opt.id] = true;
        merged.push(opt);
    });
    return merged;
}

function w0NormalizeHeroForBake(secId, rawContent, workshopId) {
    var payment = '/workshop-payment?id=' + encodeURIComponent(workshopId || 'workshop-0');
    var raw = rawContent && typeof rawContent === 'object' ? rawContent : {};
    var next = JSON.parse(JSON.stringify(raw || {}));
    next.ctaVisible = raw.ctaVisible !== false;
    next.ctaShimmer = raw.ctaShimmer === true || String(raw.ctaShimmer || '').toLowerCase() === 'true';
    next.buttonOptions = w0NormalizeHeroButtonOptionsBake(secId, next, payment);
    if (!String(next.ctaActionId || '').trim()) next.ctaActionId = 'go-to-payment';
    if (secId === 'w0-hero') {
        if (!String(next.secondaryCtaText || '').trim()) next.secondaryCtaText = '了解更多';
        next.secondaryCtaVisible = raw.secondaryCtaVisible === undefined ? true : raw.secondaryCtaVisible !== false;
        if (!String(next.secondaryCtaActionId || '').trim()) next.secondaryCtaActionId = 'learn-more';
    } else {
        next.secondaryCtaVisible = raw.secondaryCtaVisible === true ||
            (raw.secondaryCtaVisible !== false && !!String(next.secondaryCtaText || '').trim());
    }
    function resolve(actionId, fallback) {
        var options = next.buttonOptions;
        var targetId = String(actionId || '').trim();
        for (var i = 0; i < options.length; i++) {
            if (options[i].id === targetId && String(options[i].url || '').trim()) return String(options[i].url || '').trim();
        }
        var fb = String(fallback || '').trim();
        if (_w0IsIncompletePaymentLink(fb)) return payment;
        return fb;
    }
    next.ctaLink = resolve(next.ctaActionId, raw.ctaLink || next.ctaLink);
    next.secondaryCtaLink = resolve(next.secondaryCtaActionId, raw.secondaryCtaLink || next.secondaryCtaLink);
    var hmsx = parseInt(raw.heroMediaSizePercent != null ? raw.heroMediaSizePercent : next.heroMediaSizePercent, 10);
    if (isNaN(hmsx)) hmsx = 100;
    next.heroMediaSizePercent = Math.max(30, Math.min(100, hmsx));
    return next;
}

function w0VisibleButton(visible, html) {
    return visible !== false && String(html || '').replace(/<[^>]+>/g, ' ').trim() !== '';
}

function buildWorkshop0SectionHtml(sections) {
    var rawSec = findHeroSection(sections, 'w0-hero');
    var wsId = workshopIdFromSections(sections);
    var base = Object.assign({ id: 'w0-hero', type: 'hero', content: {} }, rawSec || {});
    var heroCfg = w0NormalizeHeroForBake('w0-hero', base.content || {}, wsId);
    var titleHtml = heroCfg.title ? _richTextHtml(heroCfg.title) : '';
    var tagHtml = heroCfg.subtitle ? _richTextHtml(heroCfg.subtitle) : '';
    var badgeHtml = heroCfg.badge ? _richTextHtml(heroCfg.badge) : '';
    var badgeBlock = '<div class="hero-badge"' + (String(heroCfg.badge || '').replace(/<[^>]+>/g, ' ').trim() ? '' : ' style="display:none;"') + '>' + badgeHtml + '</div>';
    var ctaPrimaryHtml = _richTextHtml(heroCfg.ctaText || '');
    var ctaSecondaryHtml = _richTextHtml(heroCfg.secondaryCtaText || '');
    var cta1Show = w0VisibleButton(heroCfg.ctaVisible, ctaPrimaryHtml);
    var cta2Show = w0VisibleButton(heroCfg.secondaryCtaVisible, ctaSecondaryHtml);
    var primaryA = '<a href="' + _escHtml(heroCfg.ctaLink || '#') + '" class="btn-primary' + (heroCfg.ctaShimmer ? ' aiflow-btn-shimmer' : '') + '"' + _ltHeroButtonStyle({ bg: heroCfg.ctaBgColor, text: heroCfg.ctaTextColor }, false) + '>' + ctaPrimaryHtml + '</a>';
    var secA = '<a href="' + _escHtml(heroCfg.secondaryCtaLink || '#') + '" class="btn-outline"' + _ltHeroButtonStyle({ bg: heroCfg.secondaryCtaBgColor, text: heroCfg.secondaryCtaTextColor, border: heroCfg.secondaryCtaBorderColor }, true) + '>' + ctaSecondaryHtml + '</a>';
    if (!cta1Show) primaryA = '<a href="#" class="btn-primary" style="display:none !important;"></a>';
    if (!cta2Show) secA = '<a href="#" class="btn-outline" style="display:none !important;"></a>';
    var ctaGroupStyle = (cta1Show || cta2Show) ? '' : ' style="display:none;"';
    var mediaBlock = '';
    if (heroCfg.gifUrl) {
        var heroSrc = String(heroCfg.gifUrl);
        var isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(heroSrc);
        var mw = '';
        var hmp = parseInt(heroCfg.heroMediaSizePercent, 10);
        if (!isNaN(hmp) && hmp < 100) {
            var pc2 = Math.max(30, Math.min(100, hmp));
            mw = ' style="max-width:min(100%, ' + Math.round(480 * pc2 / 100) + 'px)"';
        }
        mediaBlock = '<div class="hero-media-wrap hero-media-ready"' + mw + '>' +
            (isVideo
                ? '<video class="hero-media" src="' + _escHtml(heroSrc) + '" muted autoplay loop playsinline webkit-playsinline></video>'
                : '<img class="hero-media" src="' + _escHtml(heroSrc) + '" alt="' + _escHtml(String(heroCfg.title || '').replace(/<[^>]*>/g, '') || 'Hero media') + '">') +
            '</div>';
    } else {
        mediaBlock = '<div class="hero-media-wrap hero-media-pending" style="display:none;"><img class="hero-media" src="" alt="" style="display:none;"></div>';
    }
    var shParts = [];
    if (heroCfg.showScrollHint === false) shParts.push('display:none');
    if (heroCfg.scrollHintColor) shParts.push('color:' + heroCfg.scrollHintColor);
    var scrollHint = '<div class="scroll-hint"' + (shParts.length ? ' style="' + _escHtml(shParts.join(';')) + '"' : '') + '>' +
        '<div class="scroll-hint-pill"' + (heroCfg.scrollHintColor ? ' style="border-color:' + _escHtml(heroCfg.scrollHintColor) + ';"' : '') + '>' +
        '<div class="scroll-hint-dot"' + (heroCfg.scrollHintDotColor ? ' style="background:' + _escHtml(heroCfg.scrollHintDotColor) + ';"' : '') + '></div></div>' +
        '<span>SCROLL</span></div>';
    return '<section class="hero" id="hero" data-section-id="w0-hero" data-section-type="hero" data-layout-hero-baked="1">\n' +
        mediaBlock + '\n' +
        badgeBlock + '\n' +
        '<h1 class="hero-title">' + titleHtml + '</h1>\n' +
        '<p class="hero-tagline">' + tagHtml + '</p>\n' +
        '<div class="cta-group"' + ctaGroupStyle + '>\n' + primaryA + '\n' + secA + '\n</div>\n' +
        scrollHint + '\n' +
        '</section>';
}

/* ---------- Workshop C ---------- */

var WC_DEFAULT = {
    badge: '✦ WORKSHOP C · 視覺升級',
    title: '下一級<br><span class="accent">視覺</span>',
    eyebrowText: 'NEXT-LEVEL VISUAL — COMMERCIAL AI IMAGERY',
    subtitle: '你不是不會設計。<br><strong>你只是還沒學會用 AI 做決定。</strong>',
    ctaText: '立即預留席位 →',
    ctaLink: '/workshop-payment?id=workshop-c',
    secondaryCtaText: '了解內容',
    secondaryCtaLink: '#what-you-learn'
};

function mergeWcHero(sections) {
    var raw = findHeroSection(sections, 'wc-hero');
    return Object.assign({}, WC_DEFAULT, (raw && raw.content) || {});
}

function buildWorkshopCSectionHtml(sections) {
    var c = mergeWcHero(sections);
    var pay = '/workshop-payment?id=workshop-c';
    var ctaHref = String(c.ctaLink || '').trim() || pay;
    if (_w0IsIncompletePaymentLink(ctaHref)) ctaHref = pay;
    return '<section class="hero" data-section-id="wc-hero" data-section-type="hero" data-layout-hero-baked="1">\n' +
        '<div class="hero-badge">' + _richTextHtml(c.badge || WC_DEFAULT.badge) + '</div>\n' +
        '<h1 class="hero-title">' + _richTextHtml(c.title || '') + '</h1>\n' +
        '<p class="hero-subtitle-en">' + _richTextHtml(c.eyebrowText || '') + '</p>\n' +
        '<p class="hero-tagline">' + _richTextHtml(c.subtitle || '') + '</p>\n' +
        '<div class="cta-group">\n' +
        '<a href="' + _escHtml(ctaHref) + '" class="btn-primary">' + _richTextHtml(c.ctaText || '') + '</a>\n' +
        '<a href="' + _escHtml(String(c.secondaryCtaLink || '#what-you-learn')) + '" class="btn-outline">' + _richTextHtml(c.secondaryCtaText || '') + '</a>\n' +
        '</div>\n' +
        '<div class="scroll-hint">\n' +
        '<span>SCROLL</span>\n' +
        '<div class="scroll-arrow"></div>\n' +
        '</div>\n' +
        '</section>';
}

/* ---------- IO ---------- */

function replaceBakedBlock(absPath, key, newContent) {
    var b = markerBegin(key);
    var e = markerEnd(key);
    var html = fs.readFileSync(absPath, 'utf8');
    if (html.indexOf(b) === -1 || html.indexOf(e) === -1) {
        throw new Error(absPath + ' missing markers ' + key);
    }
    var re = new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'm');
    var next = html.replace(re, b + '\n' + newContent + '\n' + e);
    if (next === html) throw new Error('No replacement for ' + key);
    fs.writeFileSync(absPath, next, 'utf8');
}

function bakeTarget(t, db, iso) {
    return db.collection('pageLayouts').doc(t.docId).get().then(function(doc) {
        var sections = doc.exists && doc.data().sections ? doc.data().sections : [];
        var block = '';
        if (t.flavor === 'linktree') {
            var headerSec = mergeLinktreeHeaderFromSections(sections);
            var inner = buildLinktreeHeroInnerHtml(headerSec);
            block = '<!-- baked-at: ' + iso + ' (pageLayouts/' + t.docId + ') -->\n' +
                '<header class="linktree-header hero linktree-hero fade-in" data-section-id="lt-header" data-section-type="hero" data-layout-hero-baked="1">\n' +
                inner + '\n' +
                '</header>';
        } else if (t.flavor === 'workshopMain') {
            var wmSec = mergeWorkshopMainHero(sections);
            block = '<!-- baked-at: ' + iso + ' (pageLayouts/' + t.docId + ') -->\n' + buildWorkshopMainSectionHtml(wmSec);
        } else if (t.flavor === 'workshop0') {
            block = '<!-- baked-at: ' + iso + ' (pageLayouts/' + t.docId + ') -->\n' + buildWorkshop0SectionHtml(sections);
        } else if (t.flavor === 'workshopC') {
            block = '<!-- baked-at: ' + iso + ' (pageLayouts/' + t.docId + ') -->\n' + buildWorkshopCSectionHtml(sections);
        }
        replaceBakedBlock(path.join(ROOT, t.relPath), t.key, block);
        console.log('OK: baked', t.key, '→', t.relPath);
    });
}

function main() {
    loadRichTextRenderer();
    var firebaserc = JSON.parse(fs.readFileSync(FIREBASERC, 'utf8'));
    var projectId = firebaserc.projects && firebaserc.projects.default;
    if (!projectId) throw new Error('No default project in .firebaserc');
    if (!admin.apps.length) admin.initializeApp({ projectId: projectId });
    var db = admin.firestore();
    var filter = (process.argv[2] || '').trim().toLowerCase();
    var list = filter
        ? TARGETS.filter(function(t) { return t.key === filter; })
        : TARGETS.slice();
    if (filter && !list.length) {
        console.error('Unknown target:', filter, '— use:', TARGETS.map(function(t) { return t.key; }).join(', '));
        process.exit(1);
    }
    var iso = new Date().toISOString();
    return list.reduce(function(chain, t) {
        return chain.then(function() { return bakeTarget(t, db, iso); });
    }, Promise.resolve()).then(function() {
        console.log('Done (' + list.length + ' page(s)).');
    });
}

main().catch(function(err) {
    console.error(err.message || err);
    process.exit(1);
});
