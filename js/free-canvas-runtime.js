(function(global) {
    'use strict';

    var DEFAULT_CANVAS = {
        designWidth: 1440,
        designHeight: 900,
        background: { type: 'color', color: '#FAF9F7', imageUrl: '', fit: 'cover' },
        responsiveMode: 'scale',
        snap: { enabled: true, gridSize: 8 }
    };

    function esc(str) {
        if (global.escHtml) return global.escHtml(str);
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clone(value) {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (err) { return value; }
    }

    function num(value, fallback, min, max) {
        var n = parseFloat(value);
        if (isNaN(n)) n = fallback;
        if (min != null) n = Math.max(min, n);
        if (max != null) n = Math.min(max, n);
        return n;
    }

    function normalizeCanvas(raw) {
        raw = raw && typeof raw === 'object' ? raw : {};
        var next = clone(DEFAULT_CANVAS);
        Object.keys(raw).forEach(function(key) {
            if (raw[key] && typeof raw[key] === 'object' && !Array.isArray(raw[key]) && next[key] && typeof next[key] === 'object') {
                next[key] = Object.assign({}, next[key], raw[key]);
            } else {
                next[key] = raw[key];
            }
        });
        next.designWidth = num(next.designWidth, 1440, 320, 5000);
        next.designHeight = num(next.designHeight, 900, 320, 20000);
        next.responsiveMode = next.responsiveMode || 'scale';
        next.background = next.background && typeof next.background === 'object' ? next.background : {};
        next.background.type = ['color', 'image', 'transparent'].indexOf(next.background.type) >= 0 ? next.background.type : 'color';
        next.background.color = String(next.background.color || '#FAF9F7');
        next.background.imageUrl = String(next.background.imageUrl || '');
        next.background.fit = next.background.fit === 'contain' ? 'contain' : 'cover';
        next.snap = next.snap && typeof next.snap === 'object' ? next.snap : {};
        next.snap.enabled = next.snap.enabled !== false;
        next.snap.gridSize = num(next.snap.gridSize, 8, 1, 80);
        return next;
    }

    function isSafeCanvasHref(href) {
        href = String(href || '').trim();
        if (!href) return false;
        if (/^javascript:/i.test(href)) return false;
        if (/^\s*data:/i.test(href)) return false;
        if (href.indexOf('//') === 0) return false;
        if (/^https?:\/\//i.test(href)) return true;
        if (/^mailto:/i.test(href)) return true;
        if (href.charAt(0) === '/' || href.charAt(0) === '#' || href.charAt(0) === '?') return true;
        return false;
    }

    function normalizeNode(raw, idx) {
        raw = raw && typeof raw === 'object' ? raw : {};
        var type = ['text', 'image', 'video'].indexOf(raw.type) >= 0 ? raw.type : 'text';
        var node = {
            id: String(raw.id || ('node_' + Date.now() + '_' + idx)),
            type: type,
            x: num(raw.x, 120 + idx * 24, -5000, 10000),
            y: num(raw.y, 120 + idx * 24, -5000, 10000),
            width: num(raw.width, type === 'text' ? 360 : 420, 24, 5000),
            height: num(raw.height, type === 'text' ? 120 : 280, 24, 5000),
            rotation: num(raw.rotation, 0, -3600, 3600),
            zIndex: Math.round(num(raw.zIndex, idx + 1, -9999, 99999)),
            opacity: num(raw.opacity, 1, 0, 1),
            locked: raw.locked === true,
            hidden: raw.hidden === true,
            content: raw.content && typeof raw.content === 'object' ? clone(raw.content) : {},
            animation: normalizeAnimation(raw.animation)
        };
        if (type === 'text') {
            node.content.text = String(node.content.text || 'Double click to edit text');
            node.content.fontFamily = String(node.content.fontFamily || 'Inter, system-ui, sans-serif');
            node.content.fontSize = num(node.content.fontSize, 48, 6, 300);
            node.content.color = String(node.content.color || '#231F20');
            node.content.fontWeight = String(node.content.fontWeight || '700');
            node.content.textAlign = ['left', 'center', 'right'].indexOf(node.content.textAlign) >= 0 ? node.content.textAlign : 'center';
            node.content.lineHeight = num(node.content.lineHeight, 1.1, 0.6, 3);
            node.content.linkUrl = String(node.content.linkUrl || '');
        } else {
            node.content.src = String(node.content.src || '');
            node.content.fit = node.content.fit === 'contain' ? 'contain' : 'cover';
            node.content.alt = String(node.content.alt || '');
            node.content.linkUrl = String(node.content.linkUrl || '');
            node.content.autoplay = node.content.autoplay !== false;
            node.content.muted = node.content.muted !== false;
            node.content.loop = node.content.loop !== false;
            node.content.controls = node.content.controls === true;
        }
        return node;
    }

    function normalizeAnimation(raw) {
        raw = raw && typeof raw === 'object' ? raw : {};
        var type = ['none', 'float', 'pulse', 'spin', 'sway', 'fadeIn', 'bobAndRotate'].indexOf(raw.type) >= 0 ? raw.type : 'none';
        var params = raw.params && typeof raw.params === 'object' ? clone(raw.params) : {};
        return {
            type: type,
            enabled: type !== 'none' && raw.enabled !== false,
            params: params
        };
    }

    function normalizeDocument(data) {
        data = data && typeof data === 'object' ? data : {};
        return {
            pageMode: data.pageMode === 'canvas' ? 'canvas' : 'standard',
            canvas: normalizeCanvas(data.canvas),
            canvasNodes: (Array.isArray(data.canvasNodes) ? data.canvasNodes : []).map(normalizeNode)
        };
    }

    function animationStyle(node) {
        var anim = normalizeAnimation(node.animation);
        if (!anim.enabled || anim.type === 'none') return '';
        var p = anim.params || {};
        var duration = num(p.duration, anim.type === 'fadeIn' ? 0.8 : 3, 0.1, 60);
        var delay = num(p.delay, 0, -60, 60);
        var amplitude = num(p.amplitude, 18, 0, 500);
        var scaleAmount = num(p.scaleAmount, 1.06, 0.1, 5);
        var angle = num(p.angle, 3, 0, 360);
        var name = 'afCanvas' + anim.type.charAt(0).toUpperCase() + anim.type.slice(1);
        return '--af-float-amp:' + amplitude + 'px;--af-pulse-scale:' + scaleAmount + ';--af-sway-angle:' + angle + 'deg;' +
            'animation:' + name + ' ' + duration + 's ease-in-out ' + delay + 's infinite;';
    }

    function mediaMarkup(node) {
        var c = node.content || {};
        var src = esc(c.src || '');
        var style = 'width:100%;height:100%;object-fit:' + (c.fit === 'contain' ? 'contain' : 'cover') + ';display:block;';
        var linkRaw = String(c.linkUrl || '').trim();
        var linkOk = isSafeCanvasHref(linkRaw);
        var linkOpen = linkOk ? '<a class="af-canvas-media-link" href="' + esc(linkRaw) + '" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;height:100%;">' : '';
        var linkClose = linkOk ? '</a>' : '';
        if (!src) {
            return '<div class="af-canvas-empty-media">No media selected</div>';
        }
        if (node.type === 'video') {
            return linkOpen + '<video src="' + src + '" style="' + style + '"' +
                (c.autoplay !== false ? ' autoplay' : '') +
                (c.muted !== false ? ' muted' : '') +
                (c.loop !== false ? ' loop' : '') +
                (c.controls === true ? ' controls' : '') +
                ' playsinline></video>' + linkClose;
        }
        return linkOpen + '<img src="' + src + '" alt="' + esc(c.alt || '') + '" style="' + style + '">' + linkClose;
    }

    function textMarkup(node) {
        var c = node.content || {};
        var style = [
            'font-family:' + String(c.fontFamily || 'Inter, system-ui, sans-serif'),
            'font-size:' + num(c.fontSize, 48, 6, 300) + 'px',
            'color:' + String(c.color || '#231F20'),
            'font-weight:' + String(c.fontWeight || '700'),
            'text-align:' + String(c.textAlign || 'center'),
            'line-height:' + num(c.lineHeight, 1.1, 0.6, 3),
            'white-space:pre-wrap',
            'word-break:break-word'
        ].join(';') + ';';
        var linkRaw = String(c.linkUrl || '').trim();
        var inner = esc(c.text || '');
        if (isSafeCanvasHref(linkRaw)) {
            inner = '<a class="af-canvas-text-link" href="' + esc(linkRaw) + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">' + inner + '</a>';
        }
        return '<div class="af-canvas-text-content" style="' + esc(style) + '">' + inner + '</div>';
    }

    function nodeStyle(node) {
        return [
            'position:absolute',
            'left:' + node.x + 'px',
            'top:' + node.y + 'px',
            'width:' + node.width + 'px',
            'height:' + node.height + 'px',
            'transform:rotate(' + node.rotation + 'deg)',
            'transform-origin:center center',
            'z-index:' + node.zIndex,
            'opacity:' + node.opacity,
            'display:' + (node.hidden ? 'none' : 'block')
        ].join(';') + ';' + animationStyle(node);
    }

    function renderCanvasHtml(data, opts) {
        opts = opts || {};
        var doc = normalizeDocument(data);
        var canvas = doc.canvas;
        var bg = canvas.background || {};
        var bgStyle = '';
        if (bg.type === 'color') bgStyle = 'background:' + String(bg.color || '#FAF9F7') + ';';
        if (bg.type === 'image' && bg.imageUrl) {
            bgStyle = 'background-image:url("' + esc(bg.imageUrl) + '");background-size:' + (bg.fit === 'contain' ? 'contain' : 'cover') + ';background-position:center;background-repeat:no-repeat;';
        }
        var nodesHtml = doc.canvasNodes.map(function(node) {
            var body = node.type === 'text' ? textMarkup(node) : mediaMarkup(node);
            return '<div class="af-canvas-node af-canvas-node-' + esc(node.type) + '" data-node-id="' + esc(node.id) + '" style="' + esc(nodeStyle(node)) + '">' + body + '</div>';
        }).join('');
        return '<div class="af-canvas-viewport" data-canvas-mode="scale">' +
            '<div class="af-canvas-stage" style="width:' + canvas.designWidth + 'px;height:' + canvas.designHeight + 'px;' + esc(bgStyle) + '">' +
            nodesHtml +
            '</div></div>';
    }

    function renderCanvas(target, data, opts) {
        opts = opts || {};
        if (!target) return null;
        target.innerHTML = renderCanvasHtml(data, opts);
        var viewport = target.querySelector('.af-canvas-viewport');
        if (viewport && opts.scaleMode) viewport.setAttribute('data-scale-mode', opts.scaleMode);
        resizeCanvas(target, opts);
        return target.querySelector('.af-canvas-stage');
    }

    function resizeCanvas(target, opts) {
        opts = opts || {};
        target = target || document;
        var viewports = target.querySelectorAll ? target.querySelectorAll('.af-canvas-viewport') : [];
        viewports.forEach(function(viewport) {
            var stage = viewport.querySelector('.af-canvas-stage');
            if (!stage) return;
            var w = parseFloat(stage.style.width) || stage.offsetWidth || 1440;
            var h = parseFloat(stage.style.height) || stage.offsetHeight || 900;
            var mode = opts.scaleMode || viewport.getAttribute('data-scale-mode') || 'contain';
            var scale;
            if (mode === 'width') {
                var avail = Math.max(80, viewport.clientWidth - 8);
                scale = avail / w;
                if (!isFinite(scale) || scale <= 0) scale = 1;
            } else {
                scale = Math.min(viewport.clientWidth / w, viewport.clientHeight / h);
                if (!isFinite(scale) || scale <= 0) scale = 1;
            }
            stage.style.transform = 'scale(' + scale + ')';
            stage.style.transformOrigin = 'top left';
            viewport.style.setProperty('--af-canvas-stage-width', (w * scale) + 'px');
            viewport.style.setProperty('--af-canvas-stage-height', (h * scale) + 'px');
        });
    }

    function css() {
        return '.af-canvas-viewport{position:relative;width:100%;height:100%;overflow:auto;background:#ece9e4;display:flex;align-items:flex-start;justify-content:flex-start;padding:24px;box-sizing:border-box;}' +
            '.af-canvas-viewport::after{content:"";display:block;width:var(--af-canvas-stage-width,1440px);height:var(--af-canvas-stage-height,900px);flex:0 0 auto;}' +
            '.af-canvas-stage{position:absolute;top:24px;left:24px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,.18);}' +
            '.af-canvas-node{box-sizing:border-box;}' +
            '.af-canvas-node img,.af-canvas-node video{border-radius:inherit;}' +
            '.af-canvas-text-content{width:100%;height:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;}' +
            '.af-canvas-empty-media{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.08);color:rgba(0,0,0,.45);font:600 18px system-ui,sans-serif;}' +
            '@keyframes afCanvasFloat{0%,100%{translate:0 0}50%{translate:0 calc(var(--af-float-amp,18px) * -1)}}' +
            '@keyframes afCanvasPulse{0%,100%{scale:1}50%{scale:var(--af-pulse-scale,1.06)}}' +
            '@keyframes afCanvasSpin{to{rotate:360deg}}' +
            '@keyframes afCanvasSway{0%,100%{rotate:calc(var(--af-sway-angle,3deg) * -1)}50%{rotate:var(--af-sway-angle,3deg)}}' +
            '@keyframes afCanvasFadeIn{0%{opacity:0;translate:0 12px}100%{opacity:1;translate:0 0}}' +
            '@keyframes afCanvasBobAndRotate{0%,100%{translate:0 0;rotate:calc(var(--af-sway-angle,3deg) * -1)}50%{translate:0 calc(var(--af-float-amp,18px) * -1);rotate:var(--af-sway-angle,3deg)}}';
    }

    function ensureStyles() {
        if (document.getElementById('afCanvasRuntimeStyles')) return;
        var style = document.createElement('style');
        style.id = 'afCanvasRuntimeStyles';
        style.textContent = css();
        document.head.appendChild(style);
    }

    global.AFFreeCanvas = {
        DEFAULT_CANVAS: DEFAULT_CANVAS,
        normalizeCanvas: normalizeCanvas,
        normalizeNode: normalizeNode,
        normalizeAnimation: normalizeAnimation,
        normalizeDocument: normalizeDocument,
        renderCanvasHtml: renderCanvasHtml,
        renderCanvas: renderCanvas,
        resizeCanvas: resizeCanvas,
        ensureStyles: ensureStyles,
        isSafeCanvasHref: isSafeCanvasHref
    };
})(window);
