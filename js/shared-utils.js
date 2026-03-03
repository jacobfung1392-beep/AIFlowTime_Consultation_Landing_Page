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
 * Sort sessions by date then time (ascending).
 */
function sortSessionsList(sessions) {
    if (!sessions || !sessions.length) return [];
    return sessions.slice().sort(function(a, b) {
        var da = (a.date || '').replace(/[年月]/g, '-').replace(/日/g, '');
        var db2 = (b.date || '').replace(/[年月]/g, '-').replace(/日/g, '');
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
