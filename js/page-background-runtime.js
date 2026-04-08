(function(global) {
    'use strict';

    function clampOpacity(value) {
        var num = parseInt(value, 10);
        if (isNaN(num)) return 100;
        if (num < 0) return 0;
        if (num > 100) return 100;
        return num;
    }

    function removeNode(id) {
        var node = document.getElementById(id);
        if (node && node.parentNode) node.parentNode.removeChild(node);
    }

    function setBodyBackgroundActive(active) {
        if (!document.body || !document.body.classList) return;
        document.body.classList.toggle('layout-page-bg-active', !!active);
    }

    function normalizeIframeUrl(raw) {
        var u = String(raw || '').trim();
        if (!u) return '';
        if (/^javascript:/i.test(u)) return '';
        if (/^https?:\/\//i.test(u)) return u;
        if (u.charAt(0) === '/') return u;
        return '/' + u.replace(/^\/+/, '');
    }

    function normalizeContent(content) {
        var next = content && typeof content === 'object' ? JSON.parse(JSON.stringify(content)) : {};
        var st = String(next.sourceType || 'css');
        next.sourceType = ['css', 'image', 'code', 'iframe'].indexOf(st) >= 0 ? st : 'css';
        next.imageUrl = String(next.imageUrl || '');
        next.css = String(next.css || '');
        next.code = String(next.code || '');
        next.iframeUrl = normalizeIframeUrl(next.iframeUrl);
        next.opacity = clampOpacity(next.opacity);
        next.fixed = !!next.fixed;
        if (next.sourceType === 'code' && typeof global.normalizePageBackgroundEffectCode === 'function') {
            next.code = String(global.normalizePageBackgroundEffectCode(next.code) || '');
        }
        return next;
    }

    function prepareCodeSrcdoc(code) {
        if (typeof global.preparePageBackgroundEffectSrcdoc === 'function') {
            return global.preparePageBackgroundEffectSrcdoc(code);
        }
        var raw = String(code || '');
        if (!raw.trim()) return raw;
        var viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" data-af-bg-viewport="1">';
        var baseReset = '<style data-af-bg-viewport-reset="1">html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent;}body{position:relative;}canvas,svg,video,img{max-width:100%;}</style>';
        if (/<head[^>]*>/i.test(raw)) {
            if (!/name=["']viewport["']/i.test(raw)) raw = raw.replace(/<head([^>]*)>/i, '<head$1>' + viewportMeta);
            if (!/data-af-bg-viewport-reset/i.test(raw)) raw = raw.replace(/<head([^>]*)>/i, '<head$1>' + baseReset);
            return raw;
        }
        if (/<body[^>]*>/i.test(raw)) {
            if (/<html[^>]*>/i.test(raw)) return raw.replace(/<html([^>]*)>/i, '<html$1><head>' + viewportMeta + baseReset + '</head>');
            return raw.replace(/<body([^>]*)>/i, '<head>' + viewportMeta + baseReset + '</head><body$1>');
        }
        return '<!DOCTYPE html><html><head>' + viewportMeta + baseReset + '</head><body>' + raw + '</body></html>';
    }

    function clearAppliedPageBackground(opts) {
        opts = opts || {};
        removeNode(opts.wrapperId || 'layout-page-bg');
        removeNode(opts.styleId || 'layout-page-bg-style');
        (opts.legacyIds || []).forEach(removeNode);
        setBodyBackgroundActive(false);
    }

    function createWrapper(opts, opacity) {
        var wrapper = document.createElement('div');
        wrapper.id = opts.wrapperId || 'layout-page-bg';
        wrapper.setAttribute('aria-hidden', 'true');
        var position = opts.position === 'absolute' ? 'absolute' : 'fixed';
        wrapper.style.cssText = [
            'position:' + position,
            'inset:0',
            'z-index:' + (opts.zIndex != null ? opts.zIndex : -1),
            'pointer-events:none',
            'overflow:hidden',
            'opacity:' + opacity,
            'background:transparent',
            '-webkit-transform:translateZ(0)',
            'transform:translateZ(0)'
        ].join(';') + ';';
        return wrapper;
    }

    function applyPageBackgroundContent(content, opts) {
        opts = opts || {};
        clearAppliedPageBackground(opts);

        var normalized = normalizeContent(content);
        var opacity = normalized.opacity / 100;
        if (!document.body) return null;

        if (normalized.sourceType === 'css') {
            if (!normalized.css.trim()) return null;
            var cssWrap = createWrapper(opts, opacity);
            cssWrap.style.cssText += normalized.css + ';';
            if (normalized.fixed) cssWrap.style.backgroundAttachment = 'fixed';
            document.body.appendChild(cssWrap);
            setBodyBackgroundActive(true);
            return cssWrap;
        }

        if (normalized.sourceType === 'image') {
            if (!normalized.imageUrl.trim()) return null;
            var imageWrap = createWrapper(opts, opacity);
            var img = document.createElement('img');
            img.alt = '';
            img.src = normalized.imageUrl;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            imageWrap.appendChild(img);
            document.body.appendChild(imageWrap);
            setBodyBackgroundActive(true);
            return imageWrap;
        }

        if (normalized.sourceType === 'code') {
            if (!normalized.code.trim()) return null;
            var codeWrap = createWrapper(opts, opacity);
            var iframe = document.createElement('iframe');
            iframe.setAttribute('aria-hidden', 'true');
            iframe.setAttribute('title', 'Background');
            iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;background:transparent;-webkit-transform:translateZ(0);transform:translateZ(0);';
            iframe.srcdoc = prepareCodeSrcdoc(normalized.code);
            codeWrap.appendChild(iframe);
            document.body.appendChild(codeWrap);
            setBodyBackgroundActive(true);
            return codeWrap;
        }

        if (normalized.sourceType === 'iframe') {
            if (!normalized.iframeUrl) return null;
            var url = normalized.iframeUrl;
            var wrapIframe = createWrapper(opts, opacity);
            var bgFrame = document.createElement('iframe');
            bgFrame.setAttribute('aria-hidden', 'true');
            bgFrame.setAttribute('title', 'Background');
            bgFrame.referrerPolicy = 'strict-origin-when-cross-origin';
            bgFrame.style.cssText = 'width:100%;height:100%;border:none;display:block;background:transparent;-webkit-transform:translateZ(0);transform:translateZ(0);';
            bgFrame.src = url;
            bgFrame.loading = 'eager';
            wrapIframe.appendChild(bgFrame);
            document.body.appendChild(wrapIframe);
            setBodyBackgroundActive(true);
            return wrapIframe;
        }

        return null;
    }

    function syncPageBackgroundFromSections(rawSections, opts) {
        var sections = Array.isArray(rawSections) ? rawSections.slice() : [];
        sections.sort(function(a, b) { return (a && a.order || 0) - (b && b.order || 0); });
        var active = null;
        sections.forEach(function(section) {
            if (active || !section || section.type !== 'page-background' || section.visible === false || !section.content) return;
            active = section;
        });
        if (active) return applyPageBackgroundContent(active.content, opts);
        clearAppliedPageBackground(opts);
        return null;
    }

    global.applyPageBackgroundContent = applyPageBackgroundContent;
    global.clearAppliedPageBackground = clearAppliedPageBackground;
    global.syncPageBackgroundFromSections = syncPageBackgroundFromSections;
})(window);
