(function(global) {
    'use strict';

    var DEFAULT_DEFS = [
        { id: 'cn-page-background', type: 'page-background', order: 0 },
        { id: 'cn-hero', type: 'cn-hero', order: 1 },
        { id: 'cn-cta', type: 'cn-cta', order: 2 },
        { id: 'cn-process', type: 'cn-process', order: 3 },
        { id: 'cn-faq', type: 'cn-faq', order: 4 }
    ];

    var TYPE_DEFAULTS = {
        'page-background': {
            sourceType: 'css',
            imageUrl: '',
            css: '',
            code: '',
            codeEditorMode: 'structured',
            codeHtml: '',
            codeCss: '',
            codeJs: '',
            codeLibraryUrls: '',
            iframeUrl: '',
            opacity: 100,
            fixed: false
        },
        'cn-hero': {
            badge: '1-ON-1 AI CONSULTATION',
            preLineHtml: '針對 <span class="hl">Slashers</span>、<span class="hl">AI 新手</span>的',
            titleHtml: '一對一<span class="accent">AI</span>諮詢服務',
            imageUrl: 'Jacob_halftone_optimized.png',
            imageAlt: 'Jacob',
            description: '一對一深入分析，幫你快速釐清方向、學習建立第一個AI工作流！'
        },
        'cn-cta': {
            title: '準備好慳返你嘅時間未？',
            imageUrl: 'Computer_Image_optimized.webp',
            imageAlt: 'Computer',
            paragraph1: '識得用AI，每日慳一個鐘，一星期就慳咗七個鐘，一年落嚟你都慳咗300幾個鐘！',
            paragraph2: '跟我分享你遇到的難題！開始建立你嘅 AI 工作流',
            ctaText: '跟我分享你遇到的難題！',
            ctaLink: 'ig-consultation.html'
        },
        'cn-process': {
            sectionTitle: '諮詢流程',
            sectionSub: '三步幫你建立專屬 AI 工作流',
            highlights: [
                {
                    title: '1. 問題定位（Problem Spotting）',
                    body: '了解你而家做緊乜、目標係乜、時間流失位係邊。Jacob 會深入探討你日常工作流程，找出最耗時、最重複嘅環節。',
                    highlightLabel: '重點：',
                    highlightText: '釐清你嘅工作性質、時間分配、痛點位置',
                    variant: 'orange'
                },
                {
                    title: '2. 痛點拆解（Pain Point）',
                    body: '揾出最耗時、最重複、最易自動化嘅 1-3 件事。Jacob 會用專業框架分析，判斷邊啲工序最適合用 AI 優化。',
                    highlightLabel: '目標：',
                    highlightText: '鎖定最高 ROI 嘅自動化機會',
                    variant: 'purple'
                }
            ],
            deliverablesTitle: '3. 你會得到（Deliverables）',
            deliverableCards: [
                { title: '最有用 AI 工具建議', body: '打造「相當於專業助理」嘅輸出能力' },
                { title: '自動化概念與方向', body: '目標每日省 1–2 小時（保守目標）' },
                { title: '你專屬嘅 AI workflow 建議', body: '可落地、可立即執行' }
            ],
            resultTitle: '4. 結果（Result）',
            resultHeading: '諮詢成果',
            resultBody: '你將會了解到AI嘅本質，同埋未來嘅學習方向，獲得使用 AI 工具加速工作流程的知識與能力。',
            resultBoldLine: '成為AI原生使用者，不分年紀！<br>即刻做AI高手Level 1！',
            resultBullets: [
                { label: '即走即用 prompts' },
                { label: 'AI 小技巧' },
                { label: '模板／清單' }
            ]
        },
        'cn-faq': {
            title: '常見問題',
            subtitle: '解答你對諮詢服務嘅疑問',
            items: [
                { question: '我完全新手得唔得？', answer: '絕對得！Jacob 專為零基礎人士設計，由最基本概念開始教起。你只要識得用電腦、打中文就可以。Jacob 會用簡單易明嘅方式，手把手帶你建立第一條工作流。' },
                { question: '需要準備咩？', answer: '你只需要：一部可以上網嘅電腦、你日常工作嘅流程描述（越詳細越好）、以及一顆開放學習嘅心。Jacob 會提供所有需要嘅工具同資源，唔使你額外準備乜。' },
                { question: '會唔會教到我用邊啲工具？', answer: '會！Jacob 會根據你嘅需求同預算，推薦最適合你嘅 AI 工具。可能包括：ChatGPT、Claude、Notion AI、Zapier、Make 等等。Jacob 會教你點樣組合唔同工具，打造最適合你嘅自動化系統。' },
                { question: '90 分鐘夠唔夠？', answer: '對於入門絕對夠！90 分鐘足夠 Jacob 深入了解你嘅需求、分析痛點、同埋設計一條可以立即執行嘅工作流。而且你會得到完整嘅學習資源，可以跟住步驟慢慢實踐。如果需要更深入嘅指導，Jacob 都有後續支援服務。' }
            ]
        }
    };

    var RESULT_ICON_SVGS = [
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
    ];

    function _esc(s) {
        if (typeof escHtml === 'function') return escHtml(s);
        if (!s) return '';
        var div = document.createElement('div');
        div.textContent = String(s);
        return div.innerHTML;
    }

    function _rich(s) {
        if (typeof aiflowRenderRichTextHtml === 'function') return aiflowRenderRichTextHtml(s);
        return _esc(s).replace(/\n/g, '<br>');
    }

    function deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj || {}));
        } catch (e) {
            return {};
        }
    }

    function mergeContent(type, patch) {
        var base = deepClone(TYPE_DEFAULTS[type] || {});
        if (!patch || typeof patch !== 'object') return base;
        Object.keys(patch).forEach(function(k) {
            if (patch[k] !== undefined) base[k] = patch[k];
        });
        return base;
    }

    function normalizeConsultationSections(raw) {
        var source = Array.isArray(raw) ? raw : [];
        var byId = {};
        source.forEach(function(s) {
            if (s && s.id) byId[s.id] = s;
        });
        var used = {};
        var out = DEFAULT_DEFS.map(function(def, idx) {
            used[def.id] = true;
            var from = byId[def.id] || {};
            var merged = {
                id: def.id,
                type: from.type || def.type,
                visible: from.visible !== false,
                order: from.order != null ? from.order : def.order != null ? def.order : idx,
                content: mergeContent(def.type, from.content || {})
            };
            return merged;
        });
        source.forEach(function(s) {
            if (!s || !s.id || used[s.id]) return;
            out.push({
                id: s.id,
                type: s.type,
                visible: s.visible !== false,
                order: s.order != null ? s.order : out.length,
                content: mergeContent(s.type, s.content || {})
            });
        });
        return out;
    }

    function updateNoiseLayer() {
        var noise = document.getElementById('noise-bg');
        if (!noise || !document.body) return;
        var cmsBg = document.body.classList.contains('layout-page-bg-active');
        noise.style.display = cmsBg ? 'none' : '';
    }

    function applyHero(el, c) {
        var badge = el.querySelector('.hero-badge');
        var pre = el.querySelector('.hero-pre');
        var h1 = el.querySelector('h1');
        var img = el.querySelector('.hero-img');
        var desc = el.querySelector('.hero-desc');
        if (badge && c.badge !== undefined) badge.textContent = c.badge;
        if (pre && c.preLineHtml !== undefined) pre.innerHTML = _rich(c.preLineHtml);
        if (h1 && c.titleHtml !== undefined) h1.innerHTML = typeof sanitizeHeroTitleHtml === 'function' ? sanitizeHeroTitleHtml(c.titleHtml) : _rich(c.titleHtml);
        if (img && c.imageUrl) img.src = c.imageUrl;
        if (img && c.imageAlt !== undefined) img.alt = c.imageAlt;
        if (desc && c.description !== undefined) desc.innerHTML = _rich(c.description);
    }

    function applyCta(el, c) {
        var h2 = el.querySelector('h2');
        var img = el.querySelector('.cta-img');
        var p1 = el.querySelector('.cta-text');
        var p2 = el.querySelector('.cta-sub');
        var a = el.querySelector('.glass-cta');
        var span = el.querySelector('.glass-cta-text');
        if (h2 && c.title !== undefined) h2.innerHTML = _rich(c.title);
        if (img && c.imageUrl) img.src = c.imageUrl;
        if (img && c.imageAlt !== undefined) img.alt = c.imageAlt;
        if (p1 && c.paragraph1 !== undefined) p1.innerHTML = _rich(c.paragraph1);
        if (p2 && c.paragraph2 !== undefined) p2.innerHTML = _rich(c.paragraph2);
        if (a && c.ctaLink !== undefined) a.href = c.ctaLink || '#';
        if (span && c.ctaText !== undefined) span.textContent = c.ctaText;
    }

    function applyProcess(el, c) {
        var titleEl = el.querySelector('.section-title');
        var subEl = el.querySelector('.section-sub');
        var mount = el.querySelector('.cn-process-mount');
        if (!mount) return;
        if (titleEl && c.sectionTitle !== undefined) titleEl.innerHTML = _rich(c.sectionTitle);
        if (subEl && c.sectionSub !== undefined) subEl.innerHTML = _rich(c.sectionSub);

        var html = '';
        (c.highlights || []).forEach(function(h) {
            var variant = String(h.variant || 'orange').toLowerCase() === 'purple' ? 'purple' : 'orange';
            html += '<div class="timeline-item fade-in">';
            html += '<h3>' + _esc(h.title || '') + '</h3>';
            html += '<p>' + _rich(h.body || '') + '</p>';
            if (h.highlightText) {
                html += '<div class="tl-highlight ' + _esc(variant) + '"><strong>' + _esc(h.highlightLabel || '') + '</strong> ' + _rich(h.highlightText) + '</div>';
            }
            html += '</div>';
        });

        if (c.deliverablesTitle || (c.deliverableCards && c.deliverableCards.length)) {
            html += '<div class="timeline-item fade-in">';
            html += '<h3>' + _esc(c.deliverablesTitle || '') + '</h3>';
            html += '<div class="del-grid">';
            (c.deliverableCards || []).forEach(function(card) {
                html += '<div class="del-card"><h4>' + _esc(card.title || '') + '</h4><p>' + _rich(card.body || '') + '</p></div>';
            });
            html += '</div></div>';
        }

        html += '<div class="timeline-item fade-in">';
        html += '<h3>' + _esc(c.resultTitle || '') + '</h3>';
        html += '<div class="result-card">';
        html += '<h4>' + _esc(c.resultHeading || '') + '</h4>';
        html += '<p>' + _rich(c.resultBody || '') + '</p>';
        if (c.resultBoldLine) html += '<p class="bold-line">' + _rich(c.resultBoldLine) + '</p>';
        html += '<div class="result-icons">';
        (c.resultBullets || []).forEach(function(b, i) {
            var iconSvg = RESULT_ICON_SVGS[i % RESULT_ICON_SVGS.length];
            html += '<div class="result-icon-item"><div class="result-icon-circle">' + iconSvg + '</div><p>' + _esc(b.label || '') + '</p></div>';
        });
        html += '</div></div></div>';

        mount.innerHTML = html;
    }

    function faqChevronSvg() {
        return '<svg class="faq-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
    }

    function applyFaq(el, c) {
        var titleEl = el.querySelector('.section-title');
        var subEl = el.querySelector('.section-sub');
        var mount = el.querySelector('.cn-faq-mount');
        if (!mount) return;
        if (titleEl && c.title !== undefined) titleEl.innerHTML = _rich(c.title);
        if (subEl && c.subtitle !== undefined) subEl.innerHTML = _rich(c.subtitle);
        var html = '';
        (c.items || []).forEach(function(item) {
            html += '<div class="faq-item fade-in">';
            html += '<div class="faq-question" onclick="toggleFAQ(this)">';
            html += '<span>' + _esc(item.question || '') + '</span>' + faqChevronSvg();
            html += '</div>';
            html += '<div class="faq-answer"><p>' + _rich(item.answer || '') + '</p></div>';
            html += '</div>';
        });
        mount.innerHTML = html;
    }

    function applyContent(el, sec) {
        var c = sec.content || {};
        switch (sec.type) {
            case 'cn-hero':
                applyHero(el, c);
                break;
            case 'cn-cta':
                applyCta(el, c);
                break;
            case 'cn-process':
                applyProcess(el, c);
                break;
            case 'cn-faq':
                applyFaq(el, c);
                break;
            default:
                break;
        }
    }

    function _sectionElQuery(id) {
        var sid = String(id || '');
        if (typeof CSS !== 'undefined' && CSS.escape) {
            return '[data-section-id="' + CSS.escape(sid) + '"]';
        }
        return '[data-section-id="' + sid.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
    }

    function reorderConsultationSections(mount, sorted) {
        var footer = mount.querySelector('footer');
        if (!footer) return;
        sorted.forEach(function(sec) {
            if (!sec || sec.type === 'page-background' || !sec.visible) return;
            var el = mount.querySelector(_sectionElQuery(sec.id));
            if (!el) return;
            mount.insertBefore(el, footer);
        });
    }

    function applyConsultationPageLayout(rawSections, opts) {
        opts = opts || {};
        var mount = document.querySelector('.page-content');
        if (!mount) return;

        var sections = normalizeConsultationSections(rawSections);
        var bgWrapperId = opts.wrapperId || 'consultation-page-bg';
        if (typeof syncPageBackgroundFromSections === 'function') {
            syncPageBackgroundFromSections(sections, { wrapperId: bgWrapperId });
        }
        updateNoiseLayer();

        var contentSections = sections.filter(function(s) {
            return s && s.type !== 'page-background';
        }).sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

        contentSections.forEach(function(sec) {
            var el = mount.querySelector(_sectionElQuery(sec.id));
            if (!el) return;
            if (!sec.visible) {
                el.style.display = 'none';
                return;
            }
            el.style.display = '';
            applyContent(el, sec);
        });

        reorderConsultationSections(mount, contentSections);

        function markSectionVisible(el) {
            if (!el) return;
            if (el.classList.contains('fade-in')) el.classList.add('visible');
            el.querySelectorAll('.fade-in').forEach(function(node) {
                node.classList.add('visible');
            });
        }

        contentSections.forEach(function(sec) {
            if (!sec || !sec.visible || sec.type === 'page-background') return;
            var el = mount.querySelector(_sectionElQuery(sec.id));
            if (el) markSectionVisible(el);
        });
    }

    global.normalizeConsultationSections = normalizeConsultationSections;
    global.applyConsultationPageLayout = applyConsultationPageLayout;
    global.consultationUpdateNoiseLayer = updateNoiseLayer;
})(window);
