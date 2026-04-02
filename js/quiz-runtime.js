(function(global) {
    'use strict';

    global.__USE_NEW_QUIZ_RUNTIME = true;

    var QUIZ_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxE8KP5ohNSbHIFOWxl-JoWgu9_my8N8ofkTEXaeU0b7QB6K-s3qx4KE-5bOz7Qj4_miQ/exec';
    var _contactMode = 'phone';
    var _booted = false;
    var _quizApp = {
        config: null,
        currentQ: 0,
        answers: [],
        scores: null,
        profile: null,
        leadCaptured: false,
        activeAxisKey: '',
        previewMode: false
    };

    function _fallbackConfig() {
        if (typeof buildQuizLayoutConfig === 'function') return buildQuizLayoutConfig(getDefaultQuizLayoutSections());
        return {
            sections: [],
            questions: [],
            intro: {},
            leadGate: {},
            thresholds: { axes: [], levels: [] },
            routing: { rules: [] },
            archetypes: { profiles: [] },
            products: { items: [] },
            resultDisplay: {}
        };
    }

    function escH(value) {
        if (value == null) return '';
        var div = document.createElement('div');
        div.textContent = String(value);
        return div.innerHTML;
    }

    function nl2brEsc(value) {
        return escH(value || '').replace(/\n/g, '<br>');
    }

    function richHtml(value) {
        var raw = value == null ? '' : String(value);
        if (!raw.trim()) return '';
        if (/<\/?[a-z][\s\S]*>/i.test(raw)) return raw;
        return escH(raw).replace(/\n/g, '<br>');
    }

    function clone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function safeNumber(value, fallback) {
        var num = parseFloat(value);
        return isNaN(num) ? (fallback != null ? fallback : 0) : num;
    }

    function safeInt(value, fallback) {
        var num = parseInt(value, 10);
        return isNaN(num) ? (fallback != null ? fallback : 0) : num;
    }

    function getURLParam(name) {
        try {
            var params = new URLSearchParams((window.location && window.location.search) || '');
            return params.get(name);
        } catch (err) {
            return null;
        }
    }

    function isPreviewMode() {
        return getURLParam('preview') === '1';
    }

    function getLayoutDocId() {
        return global.__AIFLOWTIME_LAYOUT_DOC || getURLParam('layoutDoc') || 'quiz';
    }

    function normalizeMediaUrl(url) {
        var raw = String(url || '').trim();
        if (!raw) return '';
        if (/^(https?:)?\/\//i.test(raw) || /^data:/i.test(raw) || raw.charAt(0) === '/') return raw;
        return '/' + raw.replace(/^\/+/, '');
    }

    function getConfig() {
        return _quizApp.config || _fallbackConfig();
    }

    function getAxes() {
        return (getConfig().thresholds && getConfig().thresholds.axes) || [];
    }

    function getQuestions() {
        return getConfig().questions || [];
    }

    function getProfiles() {
        return (getConfig().archetypes && getConfig().archetypes.profiles) || [];
    }

    function getProducts() {
        return (getConfig().products && getConfig().products.items) || [];
    }

    function getProductByKey(key) {
        var products = getProducts();
        for (var i = 0; i < products.length; i++) {
            if (products[i].key === key) return products[i];
        }
        return products[0] || { key: '', label: '', url: '#', price: '' };
    }

    function getProfileByKey(key) {
        var profiles = getProfiles();
        for (var i = 0; i < profiles.length; i++) {
            if (profiles[i].key === key) return profiles[i];
        }
        return profiles[0] || null;
    }

    function getSectionByType(type) {
        var sections = getConfig().sections || [];
        for (var i = 0; i < sections.length; i++) {
            if (sections[i].type === type) return sections[i];
        }
        return null;
    }

    function getSectionById(id) {
        var sections = getConfig().sections || [];
        for (var i = 0; i < sections.length; i++) {
            if (sections[i].id === id) return sections[i];
        }
        return null;
    }

    function emptyAxisScores() {
        if (typeof emptyQuizAxisScores === 'function') return emptyQuizAxisScores(getAxes());
        var out = {};
        getAxes().forEach(function(axis) { out[axis.key] = 0; });
        return out;
    }

    function emptyQuizScores() {
        var axes = getAxes();
        var base = emptyAxisScores();
        return {
            avgScore: 0,
            level: 0,
            painTag: '',
            desireTag: '',
            recommendedProduct: '',
            axisTotals: clone(base),
            axisNormalized: clone(base),
            lowestAxis: axes[0] ? axes[0].key : '',
            highestAxis: axes[0] ? axes[0].key : ''
        };
    }

    function levelColors() {
        var profiles = getProfiles();
        return profiles.map(function(profile) { return profile.color || '#D97757'; });
    }

    function resetQuizState() {
        var questions = getQuestions();
        _quizApp.currentQ = 0;
        _quizApp.answers = new Array(questions.length);
        _quizApp.scores = emptyQuizScores();
        _quizApp.profile = null;
        _quizApp.leadCaptured = false;
        _quizApp.activeAxisKey = getAxes()[0] ? getAxes()[0].key : '';
        _contactMode = 'phone';
    }

    function showProgress() {
        var node = document.getElementById('quizProgress');
        if (node) node.style.display = 'block';
    }

    function hideProgress() {
        var node = document.getElementById('quizProgress');
        if (node) node.style.display = 'none';
    }

    function setQuizMainMode(mode) {
        var node = document.getElementById('quizMain');
        if (!node) return;
        node.classList.toggle('is-result-mode', mode === 'result');
    }

    function updateProgress(current, total) {
        var fill = document.getElementById('progressFill');
        var label = document.getElementById('progressLabel');
        var pct = total > 0 ? Math.round((current / total) * 100) : 0;
        if (fill) fill.style.width = pct + '%';
        if (label) label.textContent = current + ' / ' + total;
    }

    function quizHexToRgba(hex, alpha) {
        var raw = String(hex || '').replace('#', '').trim();
        if (!raw) return 'rgba(255,255,255,' + alpha + ')';
        if (raw.length === 3) raw = raw.split('').map(function(ch) { return ch + ch; }).join('');
        var intVal = parseInt(raw, 16);
        if (isNaN(intVal)) return 'rgba(255,255,255,' + alpha + ')';
        var r = (intVal >> 16) & 255;
        var g = (intVal >> 8) & 255;
        var b = intVal & 255;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function normalizeHexColor(color) {
        var raw = String(color || '').trim();
        if (!raw) return '';
        var shortHex = raw.match(/^#([0-9a-f]{3})$/i);
        if (shortHex) {
            return '#' + shortHex[1].split('').map(function(ch) { return ch + ch; }).join('').toUpperCase();
        }
        var fullHex = raw.match(/^#([0-9a-f]{6})$/i);
        return fullHex ? '#' + fullHex[1].toUpperCase() : '';
    }

    function shadeHexColor(color, delta) {
        var hex = normalizeHexColor(color);
        if (!hex) return '';
        var value = parseInt(hex.slice(1), 16);
        var r = Math.max(0, Math.min(255, ((value >> 16) & 255) + delta));
        var g = Math.max(0, Math.min(255, ((value >> 8) & 255) + delta));
        var b = Math.max(0, Math.min(255, (value & 255) + delta));
        return '#' + [r, g, b].map(function(channel) {
            return channel.toString(16).padStart(2, '0');
        }).join('').toUpperCase();
    }

    function quizButtonStyleAttr(bgColor, textColor) {
        var bg = normalizeHexColor(bgColor);
        var text = normalizeHexColor(textColor);
        var vars = [];
        if (bg) {
            vars.push('--q-btn-bg:' + bg);
            vars.push('--q-btn-bg-hover:' + (shadeHexColor(bg, -18) || bg));
            vars.push('--q-btn-border:' + bg);
        }
        if (text) {
            vars.push('--q-btn-color:' + text);
            vars.push('--q-btn-color-hover:' + text);
        }
        return vars.length ? ' style="' + escH(vars.join(';')) + '"' : '';
    }

    function quizDistanceLabel(level) {
        return '你距離 AI 原住民仲有 ' + Math.max(0, 5 - level) + ' 級';
    }

    function quizLinkAttrs(url) {
        return /^https?:/i.test(String(url || '')) ? ' target="_blank" rel="noopener noreferrer"' : '';
    }

    function axisMeta(key) {
        var axes = getAxes();
        for (var i = 0; i < axes.length; i++) {
            if (axes[i].key === key) return axes[i];
        }
        return axes[0] || { key: key || '', label: key || '', emoji: '', description: '' };
    }

    function axisRankCopy(key, scores) {
        if (!scores) return '能力現況';
        if (key === scores.lowestAxis && key === scores.highestAxis) return '目前整體相對平均';
        if (key === scores.lowestAxis) return '目前最值得加強';
        if (key === scores.highestAxis) return '目前最強項';
        return '能力現況';
    }

    function parseAxisCsv(value) {
        return String(value || '')
            .split(',')
            .map(function(part) { return part.trim(); })
            .filter(Boolean);
    }

    function resolveRecommendedProduct(level, lowestAxis) {
        var routing = (getConfig().routing && getConfig().routing.rules) || [];
        for (var i = 0; i < routing.length; i++) {
            var rule = routing[i] || {};
            var minLevel = String(rule.minLevel || '').trim() ? safeInt(rule.minLevel, null) : null;
            var maxLevel = String(rule.maxLevel || '').trim() ? safeInt(rule.maxLevel, null) : null;
            var allowedAxes = parseAxisCsv(rule.lowestAxesCsv);
            if (minLevel != null && level < minLevel) continue;
            if (maxLevel != null && level > maxLevel) continue;
            if (allowedAxes.length && allowedAxes.indexOf(lowestAxis) === -1) continue;
            if (rule.targetProduct) return rule.targetProduct;
        }
        return getProducts()[0] ? getProducts()[0].key : '';
    }

    function computeQuizResult(answerIndexes) {
        var questions = getQuestions();
        var axes = getAxes();
        var totals = emptyAxisScores();
        var painTag = '';
        var desireTag = '';

        questions.forEach(function(question, qIdx) {
            var answerIdx = answerIndexes[qIdx];
            if (answerIdx == null || answerIdx < 0) return;
            var option = question.options && question.options[answerIdx] ? question.options[answerIdx] : null;
            if (!option) return;
            axes.forEach(function(axis) {
                totals[axis.key] = safeNumber(totals[axis.key], 0) + safeNumber(option.scores && option.scores[axis.key], 0);
            });
            if (question.questionRole === 'pain' && option.painTag) painTag = option.painTag;
            if (question.questionRole === 'desire' && option.desireTag) desireTag = option.desireTag;
        });

        var normalized = {};
        var totalNormalized = 0;
        axes.forEach(function(axis) {
            var maxScore = Math.max(1, safeNumber(axis.maxScore, 1));
            var pct = Math.round((safeNumber(totals[axis.key], 0) / maxScore) * 100);
            normalized[axis.key] = Math.max(0, Math.min(100, pct));
            totalNormalized += normalized[axis.key];
        });

        var avgScore = axes.length ? Math.round(totalNormalized / axes.length) : 0;
        var lowestAxis = axes[0] ? axes[0].key : '';
        var highestAxis = axes[0] ? axes[0].key : '';
        axes.forEach(function(axis) {
            if (normalized[axis.key] < normalized[lowestAxis]) lowestAxis = axis.key;
            if (normalized[axis.key] > normalized[highestAxis]) highestAxis = axis.key;
        });

        var levels = ((getConfig().thresholds && getConfig().thresholds.levels) || []).slice().sort(function(a, b) {
            return safeInt(a.level, 0) - safeInt(b.level, 0);
        });
        var selectedLevel = levels[levels.length - 1] || { archetypeKey: '', level: 0, levelLabel: '' };
        for (var i = 0; i < levels.length; i++) {
            if (avgScore <= safeInt(levels[i].maxAvgScore, 100)) {
                selectedLevel = levels[i];
                break;
            }
        }

        var rawProfile = clone(getProfileByKey(selectedLevel.archetypeKey)) || {
            key: selectedLevel.archetypeKey,
            emoji: '',
            name: selectedLevel.archetypeKey || 'AI Profile',
            level: selectedLevel.level,
            levelLabel: selectedLevel.levelLabel,
            diagnosis: '',
            warning: '',
            action: '',
            color: '#D97757',
            imageUrl: ''
        };
        rawProfile.key = rawProfile.key || selectedLevel.archetypeKey;
        rawProfile.level = safeInt(selectedLevel.level, rawProfile.level || 0);
        rawProfile.levelLabel = selectedLevel.levelLabel || rawProfile.levelLabel || '';

        var recommendedProduct = resolveRecommendedProduct(rawProfile.level, lowestAxis);
        return {
            profile: rawProfile,
            scores: {
                avgScore: avgScore,
                level: rawProfile.level,
                painTag: painTag,
                desireTag: desireTag,
                recommendedProduct: recommendedProduct,
                axisTotals: totals,
                axisNormalized: normalized,
                lowestAxis: lowestAxis,
                highestAxis: highestAxis
            }
        };
    }

    function sectionShell(sectionId, inner, extraClass) {
        return '<section class="' + (extraClass || '') + '" data-section-id="' + escH(sectionId || '') + '">' + inner + '</section>';
    }

    function optionScoreSummary(option) {
        var axes = getAxes();
        var pills = [];
        axes.forEach(function(axis) {
            var value = safeNumber(option && option.scores && option.scores[axis.key], 0);
            if (!value) return;
            pills.push('<span class="q-preview-score-pill">' + escH(axis.label) + ' +' + value + '</span>');
        });
        if (option && option.painTag) pills.push('<span class="q-preview-score-pill is-tag">Pain: ' + escH(option.painTag) + '</span>');
        if (option && option.desireTag) pills.push('<span class="q-preview-score-pill is-tag">Desire: ' + escH(option.desireTag) + '</span>');
        return pills.join('');
    }

    function previewSection(section, title, body) {
        var isHidden = section && section.visible === false;
        return '<section class="q-preview-block' + (isHidden ? ' q-preview-block-hidden' : '') + '" data-section-id="' + escH(section && section.id || '') + '">' +
            '<div class="q-preview-head"><div class="q-preview-kicker">' + escH(title) + '</div>' + (isHidden ? '<span class="q-preview-hidden-chip">已隱藏</span>' : '') + '</div>' +
            body +
            '</section>';
    }

    function quizLevelSegmentsHtml(level) {
        return levelColors().map(function(color, idx) {
            var filled = idx < level;
            return '<span class="q-level-segment" style="background:' + (filled ? color : 'rgba(148,163,184,0.18)') + ';border-color:' + quizHexToRgba(color, filled ? 0.65 : 0.18) + ';"></span>';
        }).join('');
    }

    function quizShareSegmentsHtml(level) {
        return levelColors().map(function(color, idx) {
            var filled = idx < level;
            return '<span style="flex:1;height:18px;border-radius:999px;background:' + (filled ? color : 'rgba(255,255,255,0.12)') + ';border:1px solid ' + quizHexToRgba(color, filled ? 0.9 : 0.22) + ';display:block;"></span>';
        }).join('');
    }

    function radarPoint(idx, pct, radius, cx, cy) {
        var axes = getAxes();
        var angle = (-Math.PI / 2) + ((Math.PI * 2) / Math.max(axes.length, 1)) * idx;
        var dist = radius * ((pct || 0) / 100);
        return {
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist
        };
    }

    function radarTextAnchor(x, cx) {
        if (Math.abs(x - cx) < 12) return 'middle';
        return x < cx ? 'end' : 'start';
    }

    function radarPolygonPoints(values, radius, cx, cy) {
        return getAxes().map(function(axis, idx) {
            var point = radarPoint(idx, values[axis.key] || 0, radius, cx, cy);
            return point.x.toFixed(2) + ',' + point.y.toFixed(2);
        }).join(' ');
    }

    function quizAxisChipsHtml(normalized, activeKey) {
        normalized = normalized || emptyAxisScores();
        activeKey = activeKey || (getAxes()[0] ? getAxes()[0].key : '');
        return getAxes().map(function(axis) {
            var value = normalized[axis.key] || 0;
            return '<button type="button" class="q-axis-chip' + (axis.key === activeKey ? ' is-active' : '') + '" data-axis-key="' + axis.key + '" data-axis-trigger="1">' +
                '<span class="q-axis-chip-copy"><strong>' + escH(axis.label) + '</strong><span>' + value + ' / 100</span></span>' +
            '</button>';
        }).join('');
    }

    function quizRadarSvgHtml(normalized, color, activeKey) {
        normalized = normalized || emptyAxisScores();
        activeKey = activeKey || (getAxes()[0] ? getAxes()[0].key : '');
        var cx = 180;
        var cy = 148;
        var maxRadius = 104;
        var labelRadius = 144;
        var ringValues = [20, 40, 60, 80, 100];
        var axes = getAxes();
        var uniformShape = {};
        axes.forEach(function(axis) { uniformShape[axis.key] = 100; });
        var ringHtml = ringValues.map(function(val) {
            var ringShape = {};
            axes.forEach(function(axis) { ringShape[axis.key] = val; });
            return '<polygon class="q-radar-ring" points="' + radarPolygonPoints(ringShape, maxRadius, cx, cy) + '"></polygon>';
        }).join('');
        var maxPoints = axes.map(function(axis, idx) { return radarPoint(idx, 100, maxRadius, cx, cy); });
        var spokesHtml = axes.map(function(axis, idx) {
            return '<line class="q-radar-spoke" x1="' + cx + '" y1="' + cy + '" x2="' + maxPoints[idx].x.toFixed(2) + '" y2="' + maxPoints[idx].y.toFixed(2) + '"></line>';
        }).join('');
        var actualPoints = axes.map(function(axis, idx) { return radarPoint(idx, normalized[axis.key] || 0, maxRadius, cx, cy); });
        var areaPoints = actualPoints.map(function(point) {
            return point.x.toFixed(2) + ',' + point.y.toFixed(2);
        }).join(' ');
        var labelsHtml = axes.map(function(axis, idx) {
            var point = radarPoint(idx, 100, labelRadius, cx, cy);
            var anchor = radarTextAnchor(point.x, cx);
            var labelY = point.y + (idx === 0 ? -2 : idx === Math.floor(axes.length / 2) ? 10 : 4);
            return '<g class="q-radar-label' + (axis.key === activeKey ? ' is-active' : '') + '" data-axis-key="' + axis.key + '" data-axis-trigger="1" transform="translate(' + point.x.toFixed(2) + ' ' + labelY.toFixed(2) + ')">' +
                '<text text-anchor="' + anchor + '" class="q-radar-label-text">' + escH(axis.label) + '</text>' +
            '</g>';
        }).join('');
        var pointsHtml = axes.map(function(axis, idx) {
            var point = actualPoints[idx];
            return '<circle class="q-radar-point' + (axis.key === activeKey ? ' is-active' : '') + '" data-axis-key="' + axis.key + '" cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="' + (axis.key === activeKey ? 6.5 : 5) + '"></circle>' +
                '<circle class="q-radar-hit" data-axis-key="' + axis.key + '" data-axis-trigger="1" cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="16"></circle>';
        }).join('');
        return '<svg class="q-radar-svg" viewBox="0 0 360 320" role="img" aria-label="AI 六維能力雷達圖">' +
            '<defs><filter id="qRadarGlow"><feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="' + color + '" flood-opacity="0.28"></feDropShadow></filter></defs>' +
            ringHtml +
            spokesHtml +
            '<polygon class="q-radar-area" points="' + areaPoints + '" style="fill:' + quizHexToRgba(color, 0.24) + ';stroke:' + color + ';"></polygon>' +
            pointsHtml +
            labelsHtml +
            '</svg>';
    }

    function setActiveQuizAxis(key) {
        var scores = _quizApp.scores || emptyQuizScores();
        var axis = axisMeta(key);
        var root = document.getElementById('quizMain');
        if (!root || !axis) return;
        _quizApp.activeAxisKey = key;
        root.querySelectorAll('[data-axis-key]').forEach(function(node) {
            node.classList.toggle('is-active', node.getAttribute('data-axis-key') === key);
        });
        var kicker = root.querySelector('#qAxisDetailKicker');
        var title = root.querySelector('#qAxisDetailTitle');
        var desc = root.querySelector('#qAxisDetailDesc');
        var value = root.querySelector('#qAxisDetailValue');
        var bar = root.querySelector('#qAxisDetailBarFill');
        var raw = root.querySelector('#qAxisDetailRaw');
        var axisValue = scores.axisNormalized && scores.axisNormalized[key] != null ? scores.axisNormalized[key] : 0;
        var axisRaw = scores.axisTotals && scores.axisTotals[key] != null ? scores.axisTotals[key] : 0;
        var axisCap = axisMeta(key).maxScore || 0;
        if (kicker) kicker.textContent = axisRankCopy(key, scores);
        if (title) title.textContent = axis.label;
        if (desc) desc.textContent = axis.description;
        if (value) value.textContent = axisValue + ' / 100';
        if (bar) bar.style.width = axisValue + '%';
        if (raw) raw.textContent = '原始分數 ' + axisRaw + ' / ' + axisCap;
    }

    function bindQuizRadarInteractions() {
        var root = document.getElementById('quizMain');
        if (!root) return;
        root.querySelectorAll('[data-axis-trigger="1"]').forEach(function(node) {
            var key = node.getAttribute('data-axis-key');
            if (!key) return;
            node.addEventListener('mouseenter', function() { setActiveQuizAxis(key); });
            node.addEventListener('focus', function() { setActiveQuizAxis(key); });
            node.addEventListener('click', function() { setActiveQuizAxis(key); });
        });
        var scores = _quizApp.scores || emptyQuizScores();
        setActiveQuizAxis(_quizApp.activeAxisKey || scores.lowestAxis || (getAxes()[0] ? getAxes()[0].key : ''));
    }

    function questionAnswerSelections() {
        var questions = getQuestions();
        return questions.map(function(question, idx) {
            var answerIdx = _quizApp.answers[idx] != null ? _quizApp.answers[idx] : -1;
            var option = answerIdx >= 0 && question.options[answerIdx] ? question.options[answerIdx] : null;
            return {
                sectionId: question.sectionId || ('quiz-question-' + (idx + 1)),
                questionRole: question.questionRole || 'skill',
                questionTitle: question.title || '',
                answerIndex: answerIdx,
                answerText: option ? option.text : ''
            };
        });
    }

    function renderIntro() {
        var intro = getConfig().intro || {};
        var section = getConfig().introSection || getSectionByType('quiz-intro') || {};
        var points = Array.isArray(intro.points) ? intro.points : [];
        var main = document.getElementById('quizMain');
        setQuizMainMode('default');
        var buttonStyle = quizButtonStyleAttr(intro.buttonBgColor, intro.buttonTextColor);
        var pointsHtml = points.map(function(point) {
            return '<div class="q-intro-point"><div><div class="q-intro-point-title">' + richHtml(point.title || '') + '</div><div class="q-intro-point-body">' + richHtml(point.body || '') + '</div></div></div>';
        }).join('');
        main.innerHTML = sectionShell(section.id, '' +
            '<div class="q-intro fade-in visible">' +
                '<div class="q-intro-badge">' + richHtml(intro.badgeText || '') + '</div>' +
                '<h1 class="q-intro-title">' + richHtml(intro.heading || '') + '</h1>' +
                '<p class="q-intro-sub">' + richHtml(intro.subtitle || '') + '</p>' +
                '<div class="q-intro-points">' + pointsHtml + '</div>' +
                '<button class="q-btn-primary" onclick="startQuizFlow()"' + buttonStyle + '>' + richHtml(intro.startButtonText || '開始') + '</button>' +
                '<p class="q-intro-note">' + richHtml(intro.noteText || '') + '</p>' +
            '</div>');
        hideProgress();
    }

    function startQuizFlow() {
        resetQuizState();
        showProgress();
        renderQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderQuestion() {
        var questions = getQuestions();
        var question = questions[_quizApp.currentQ];
        if (!question) {
            renderIntro();
            return;
        }
        var total = questions.length;
        var num = _quizApp.currentQ + 1;
        var prevAnswer = _quizApp.answers[_quizApp.currentQ];
        updateProgress(num, total);

        var optionsHtml = '';
        for (var i = 0; i < question.options.length; i++) {
            var opt = question.options[i];
            var isSelected = prevAnswer != null && prevAnswer === i;
            optionsHtml += '<button class="q-option' + (isSelected ? ' selected' : '') + '" data-idx="' + i + '" onclick="selectOption(this, ' + i + ')">' +
                '<span class="q-option-letter">' + String.fromCharCode(65 + i) + '</span>' +
                '<span class="q-option-text">' + escH(opt.text) + '</span>' +
            '</button>';
        }

        setQuizMainMode('default');
        document.getElementById('quizMain').innerHTML = sectionShell(question.sectionId, '' +
            '<div class="q-card fade-in visible">' +
                '<div class="q-card-num">Q' + num + '</div>' +
                '<h2 class="q-card-title">' + escH(question.title) + '</h2>' +
                '<p class="q-card-sub">' + nl2brEsc(question.subtitle || '') + '</p>' +
                '<div class="q-options">' + optionsHtml + '</div>' +
            '</div>');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function selectOption(btn, idx) {
        if (btn) btn.classList.add('selected');
        _quizApp.answers[_quizApp.currentQ] = idx;
        setTimeout(function() {
            if (_quizApp.currentQ < getQuestions().length - 1) {
                _quizApp.currentQ++;
                renderQuestion();
            } else {
                var result = computeQuizResult(_quizApp.answers);
                _quizApp.profile = result.profile;
                _quizApp.scores = result.scores;
                _quizApp.activeAxisKey = result.scores.lowestAxis || _quizApp.activeAxisKey;
                renderLeadCapture();
            }
        }, 500);
    }

    function gatePreviewCard() {
        var p = _quizApp.profile || getProfiles()[0] || { name: 'AI Profile', levelLabel: '', color: '#D97757', emoji: '' };
        return '<div class="q-gate-preview">' +
            '<div class="q-gate-blur" style="background:' + quizHexToRgba(p.color || '#D97757', 0.12) + ';border-color:' + quizHexToRgba(p.color || '#D97757', 0.24) + ';">' +
                '<div class="q-gate-profile-name">' + escH(p.name || '') + '</div>' +
                '<div class="q-gate-profile-sub">' + escH(p.levelLabel || '') + '</div>' +
            '</div>' +
        '</div>';
    }

    function renderLeadCapture() {
        var gate = getConfig().leadGate || {};
        var section = getConfig().leadGateSection || getSectionByType('quiz-lead-gate') || {};
        setQuizMainMode('default');
        document.getElementById('quizMain').innerHTML = sectionShell(section.id, '' +
            '<div class="q-gate fade-in visible">' +
                '<div class="q-gate-title">' + escH(gate.heading || '') + '</div>' +
                gatePreviewCard() +
                '<p class="q-gate-desc">' + nl2brEsc(gate.description || '') + '</p>' +
                '<form class="q-gate-form" onsubmit="return submitLead(event)">' +
                    '<input type="text" id="leadName" class="q-input" placeholder="' + escH(gate.namePlaceholder || '你嘅名字') + '">' +
                    '<div class="q-contact-toggle">' +
                        '<button type="button" id="togglePhone" class="q-contact-toggle-btn active" onclick="switchContactMode(\'phone\')">' + escH(gate.phoneToggleLabel || '電話號碼') + '</button>' +
                        '<button type="button" id="toggleEmail" class="q-contact-toggle-btn" onclick="switchContactMode(\'email\')">' + escH(gate.emailToggleLabel || 'Email') + '</button>' +
                    '</div>' +
                    '<div id="contactPhoneWrap" class="q-phone-row">' +
                        '<select id="leadCountryCode" class="q-code-select">' +
                            '<option value="+852" selected>+852</option>' +
                            '<option value="+86">+86</option>' +
                            '<option value="+853">+853</option>' +
                            '<option value="+886">+886</option>' +
                            '<option value="+65">+65</option>' +
                            '<option value="+60">+60</option>' +
                            '<option value="+1">+1</option>' +
                            '<option value="+44">+44</option>' +
                        '</select>' +
                        '<input type="tel" id="leadPhone" class="q-input" placeholder="' + escH(gate.phonePlaceholder || '電話號碼') + '">' +
                    '</div>' +
                    '<div id="contactEmailWrap" class="q-email-row" style="display:none;">' +
                        '<input type="email" id="leadEmail" class="q-input" placeholder="' + escH(gate.emailPlaceholder || 'your@email.com') + '">' +
                    '</div>' +
                    '<div id="leadError" class="q-lead-error"></div>' +
                    '<button type="submit" class="q-btn-primary" style="width:100%;">' + escH(gate.submitButtonText || '解鎖結果') + '</button>' +
                '</form>' +
                '<p class="q-gate-privacy">' + escH(gate.privacyNote || '') + '</p>' +
            '</div>');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function switchContactMode(mode) {
        _contactMode = mode;
        var phoneWrap = document.getElementById('contactPhoneWrap');
        var emailWrap = document.getElementById('contactEmailWrap');
        var btnPhone = document.getElementById('togglePhone');
        var btnEmail = document.getElementById('toggleEmail');
        var errEl = document.getElementById('leadError');
        if (errEl) errEl.textContent = '';
        if (phoneWrap) phoneWrap.style.display = mode === 'phone' ? '' : 'none';
        if (emailWrap) emailWrap.style.display = mode === 'email' ? '' : 'none';
        if (btnPhone) btnPhone.classList.toggle('active', mode === 'phone');
        if (btnEmail) btnEmail.classList.toggle('active', mode === 'email');
    }

    function submitLead(e) {
        if (e && e.preventDefault) e.preventDefault();
        var gate = getConfig().leadGate || {};
        var errEl = document.getElementById('leadError');
        if (errEl) errEl.textContent = '';
        var name = ((document.getElementById('leadName') || {}).value || '').trim();
        if (!name) {
            if (errEl) errEl.textContent = gate.nameError || '請輸入你嘅名字';
            return false;
        }

        var contact = '';
        var countryCode = '';
        var contactType = _contactMode;
        if (_contactMode === 'phone') {
            var code = ((document.getElementById('leadCountryCode') || {}).value || '+852').trim();
            var phone = (((document.getElementById('leadPhone') || {}).value) || '').trim().replace(/\s+/g, '');
            if (!phone || !/^[0-9]{6,15}$/.test(phone)) {
                if (errEl) errEl.textContent = gate.phoneError || '請輸入有效嘅電話號碼';
                return false;
            }
            countryCode = code.replace('+', '');
            contact = phone;
        } else {
            var email = (((document.getElementById('leadEmail') || {}).value) || '').trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (errEl) errEl.textContent = gate.emailError || '請輸入有效嘅 Email 地址';
                return false;
            }
            contact = email;
        }

        _quizApp.leadCaptured = true;
        var profile = _quizApp.profile || { key: 'unknown', name: '', level: 0 };
        var safeScores = _quizApp.scores || emptyQuizScores();
        var productMeta = getProductByKey(safeScores.recommendedProduct);
        var productLabel = productMeta ? productMeta.label : '';
        var phoneValue = contactType === 'phone' ? ((countryCode ? '+' + countryCode + ' ' : '') + contact) : '';
        var emailValue = contactType === 'email' ? contact : '';
        var referrer = (typeof document !== 'undefined' && document.referrer) ? document.referrer : null;
        var utmSource = getURLParam('utm_source');
        var utmMedium = getURLParam('utm_medium');
        var utmCampaign = getURLParam('utm_campaign');
        var answerSelections = questionAnswerSelections();
        var questionIds = answerSelections.map(function(item) { return item.sectionId; });
        var safeAnswers = answerSelections.map(function(item) { return item.answerIndex; });

        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                var db = firebase.firestore();
                var quizLeadRef = db.collection('quizLeads').doc();
                var quizLeadData = {
                    name: name,
                    email: emailValue || null,
                    phone: phoneValue || null,
                    countryCode: countryCode,
                    contact: contact,
                    contactType: contactType,
                    profile: profile.key,
                    profileName: profile.name || '',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    avgScore: safeScores.avgScore || 0,
                    level: safeScores.level || 0,
                    archetype: profile.key || '',
                    axisTotals: safeScores.axisTotals || emptyAxisScores(),
                    axisNormalized: safeScores.axisNormalized || emptyAxisScores(),
                    lowestAxis: safeScores.lowestAxis || '',
                    highestAxis: safeScores.highestAxis || '',
                    painTag: safeScores.painTag || '',
                    desireTag: safeScores.desireTag || '',
                    recommendedProduct: safeScores.recommendedProduct || '',
                    questionIds: questionIds,
                    answerSelections: answerSelections,
                    referrer: referrer,
                    utm_source: utmSource || null,
                    utm_medium: utmMedium || null,
                    utm_campaign: utmCampaign || null,
                    scores: safeScores,
                    answers: safeAnswers,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    source: window.location.href
                };
                var mirrorPromise = typeof saveFormSubmissionMirror === 'function'
                    ? saveFormSubmissionMirror({
                        formType: 'quiz-lead',
                        sourceKey: 'quiz-diagnostic',
                        sourceLabel: 'AI 診斷結果',
                        sourcePage: '2分鐘AI診斷',
                        sourcePath: window.location.pathname,
                        sourceUrl: window.location.href,
                        sourceCollection: 'quizLeads',
                        sourceDocId: quizLeadRef.id,
                        sheetTab: 'Other Submissions',
                        contactName: name,
                        phone: phoneValue,
                        email: emailValue,
                        answers: {
                            contactType: contactType,
                            profile: profile.key,
                            profileName: profile.name || '',
                            level: safeScores.level || 0,
                            avgScore: safeScores.avgScore || 0,
                            axisTotals: safeScores.axisTotals || emptyAxisScores(),
                            axisNormalized: safeScores.axisNormalized || emptyAxisScores(),
                            lowestAxis: safeScores.lowestAxis || '',
                            highestAxis: safeScores.highestAxis || '',
                            painTag: safeScores.painTag || '',
                            desireTag: safeScores.desireTag || '',
                            recommendedProduct: safeScores.recommendedProduct || '',
                            recommendedProductLabel: productLabel,
                            recommendedWorkshop: productLabel,
                            questionIds: questionIds,
                            answerSelections: answerSelections,
                            referrer: referrer,
                            utm_source: utmSource || null,
                            utm_medium: utmMedium || null,
                            utm_campaign: utmCampaign || null,
                            scores: safeScores,
                            answers: safeAnswers
                        }
                    }, { db: db }).catch(function() {})
                    : Promise.resolve();

                Promise.all([
                    quizLeadRef.set(quizLeadData),
                    mirrorPromise
                ]).catch(function() {});
            }
        } catch (err) {}

        try {
            var sheetData = {
                name: name,
                countryCode: countryCode,
                contact: contact,
                contactType: contactType,
                phone: phoneValue,
                email: emailValue,
                profile: (profile.name || '') + ' (' + (profile.key || '') + ')',
                recommendedWorkshop: productLabel,
                recommendedProduct: safeScores.recommendedProduct || '',
                level: safeScores.level || 0,
                avgScore: safeScores.avgScore || 0,
                lowestAxis: safeScores.lowestAxis || '',
                highestAxis: safeScores.highestAxis || '',
                painTag: safeScores.painTag || '',
                desireTag: safeScores.desireTag || '',
                axisTotals: JSON.stringify(safeScores.axisTotals || emptyAxisScores()),
                axisNormalized: JSON.stringify(safeScores.axisNormalized || emptyAxisScores()),
                questionIds: JSON.stringify(questionIds),
                answerSelections: JSON.stringify(answerSelections),
                referrer: referrer,
                utm_source: utmSource || '',
                utm_medium: utmMedium || '',
                utm_campaign: utmCampaign || '',
                scores: 'Avg:' + (safeScores.avgScore || 0) + ' Level:' + (safeScores.level || 0) + ' Low:' + (safeScores.lowestAxis || '-') + ' High:' + (safeScores.highestAxis || '-') + ' Pain:' + (safeScores.painTag || '-') + ' Desire:' + (safeScores.desireTag || '-') + ' Product:' + (safeScores.recommendedProduct || '-'),
                timestamp: new Date().toISOString(),
                source: 'quiz-diagnostic',
                page: '2分鐘AI診斷'
            };
            fetch(QUIZ_SHEET_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sheetData)
            }).catch(function() {});
        } catch (err2) {}

        renderResult();
        return false;
    }

    function resultImageHtml(profile) {
        var imageUrl = normalizeMediaUrl(profile && profile.imageUrl);
        if (!imageUrl) return '';
        return '<div class="q-result-image-wrap"><img class="q-result-image" src="' + escH(imageUrl) + '" alt="' + escH((profile && profile.name) || 'quiz result image') + '"></div>';
    }

    function renderResult() {
        var profile = _quizApp.profile || getProfiles()[0];
        var scores = _quizApp.scores || emptyQuizScores();
        var labels = getConfig().resultDisplay || {};
        var product = getProductByKey(scores.recommendedProduct);
        var lowestAxis = axisMeta(scores.lowestAxis);
        var highestAxis = axisMeta(scores.highestAxis);
        var activeAxis = _quizApp.activeAxisKey || scores.lowestAxis || (getAxes()[0] ? getAxes()[0].key : '');
        var resultImageBlock = normalizeMediaUrl(profile && profile.imageUrl)
            ? '<div data-section-id="' + escH((getConfig().archetypesSection || {}).id || '') + '">' + resultImageHtml(profile) + '</div>'
            : '';
        var mediaGridClass = resultImageBlock ? 'q-result-media-grid' : 'q-result-media-grid is-no-image';

        setQuizMainMode('result');
        document.getElementById('quizMain').innerHTML = sectionShell((getConfig().resultDisplaySection || {}).id, '' +
            '<div class="q-result fade-in visible">' +
                '<div class="q-result-hero">' +
                    '<div class="q-result-badge" style="background:' + escH(profile.color || '#D97757') + ';">' +
                        '<div>' +
                            '<div class="q-result-badge-cn">' + escH(profile.name || '') + '</div>' +
                            '<div class="q-result-badge-en">' + escH(profile.levelLabel || '') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="q-level-meter">' + quizLevelSegmentsHtml(profile.level || 0) + '</div>' +
                    '<div class="q-level-distance">' + escH(quizDistanceLabel(profile.level || 0)) + '</div>' +
                '</div>' +

                '<div class="' + mediaGridClass + '">' +
                    resultImageBlock +
                    '<div class="q-result-section q-radar-section" data-section-id="' + escH((getConfig().thresholdsSection || {}).id || '') + '" style="--radar-color:' + escH(profile.color || '#D97757') + ';--radar-glow:' + quizHexToRgba(profile.color || '#D97757', 0.16) + ';">' +
                        '<div class="q-result-section-label">' + escH(labels.radarTitle || 'AI 六維能力地圖') + '</div>' +
                        '<div class="q-radar-layout">' +
                            '<div class="q-radar-visual">' + quizRadarSvgHtml(scores.axisNormalized || emptyAxisScores(), profile.color || '#D97757', activeAxis) + '</div>' +
                            '<div class="q-radar-side">' +
                                '<div class="q-radar-score-pill">' + escH(labels.radarAvgLabel || '平均 AI 能力值') + ' ' + (scores.avgScore || 0) + ' / 100</div>' +
                                '<div class="q-axis-detail">' +
                                    '<div class="q-axis-detail-kicker" id="qAxisDetailKicker"></div>' +
                                    '<div class="q-axis-detail-title" id="qAxisDetailTitle"></div>' +
                                    '<div class="q-axis-detail-value" id="qAxisDetailValue"></div>' +
                                    '<div class="q-axis-detail-bar"><span id="qAxisDetailBarFill"></span></div>' +
                                    '<p id="qAxisDetailDesc"></p>' +
                                    '<div class="q-axis-detail-raw" id="qAxisDetailRaw"></div>' +
                                '</div>' +
                                '<div class="q-axis-chip-grid">' + quizAxisChipsHtml(scores.axisNormalized || emptyAxisScores(), activeAxis) + '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="q-result-section" data-section-id="' + escH((getConfig().resultDisplaySection || {}).id || '') + '">' +
                    '<div class="q-result-section-label">' + escH(labels.statusLabel || '你而家嘅狀態') + '</div>' +
                    '<p>' + escH(profile.diagnosis || '') + '</p>' +
                    '<div class="q-radar-score-pill" style="margin-top:18px;">' + escH(labels.strongestPrefix || '最強') + '：' + escH(highestAxis.label || '') + ' · ' + escH(labels.weakestPrefix || '最低') + '：' + escH(lowestAxis.label || '') + '</div>' +
                '</div>' +

                '<div class="q-result-section q-result-warning" data-section-id="' + escH((getConfig().resultDisplaySection || {}).id || '') + '">' +
                    '<div class="q-result-section-label">' + escH(labels.warningLabel || '注意') + '</div>' +
                    '<p>' + escH(profile.warning || '') + '</p>' +
                '</div>' +

                '<div class="q-result-section q-result-fix" data-section-id="' + escH((getConfig().resultDisplaySection || {}).id || '') + '">' +
                    '<div class="q-result-section-label">' + escH(labels.actionLabel || '你而家最應該做嘅一步') + '</div>' +
                    '<p>' + escH(profile.action || '') + '</p>' +
                '</div>' +

                '<div class="q-result-section q-result-workshop" data-section-id="' + escH((getConfig().routingSection || {}).id || '') + '">' +
                    '<div class="q-result-section-label">' + escH(labels.recommendationLabel || '推薦下一步') + '</div>' +
                    '<div class="q-result-ws-name" data-section-id="' + escH((getConfig().productsSection || {}).id || '') + '">' + escH(product.label || '') + '</div>' +
                    '<div class="q-result-cta-price">' + escH(product.price || '') + '</div>' +
                    '<a class="q-btn-primary q-result-main-cta" href="' + escH(product.url || '#') + '"' + quizLinkAttrs(product.url) + '>' + escH(product.label || '') + '</a>' +
                '</div>' +

                '<div class="q-result-actions" data-section-id="' + escH((getConfig().resultDisplaySection || {}).id || '') + '">' +
                    '<button type="button" id="shareResultBtn" class="q-btn-secondary q-share-btn" onclick="downloadQuizShareCard()">' + escH(labels.shareButtonText || '分享你嘅AI等級') + '</button>' +
                    '<a class="q-result-all-link" href="/ai-beginner-workshop">' + escH(labels.allWorkshopsText || '想睇晒所有工作坊？ →') + '</a>' +
                '</div>' +
            '</div>');

        hideProgress();
        bindQuizRadarInteractions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function downloadQuizShareCard() {
        var profile = _quizApp.profile;
        var scores = _quizApp.scores || emptyQuizScores();
        var labels = getConfig().resultDisplay || {};
        if (!profile) return;
        if (typeof html2canvas !== 'function') {
            alert('分享功能載入中，請稍後再試。');
            return;
        }

        var btn = document.getElementById('shareResultBtn');
        var originalLabel = btn ? btn.textContent : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = labels.shareLoadingText || '製作分享圖中...';
        }

        var host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;z-index:-1;';
        var imageUrl = normalizeMediaUrl(profile.imageUrl);
        var imageHtml = imageUrl
            ? '<div style="width:220px;height:220px;border-radius:28px;overflow:hidden;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);"><img src="' + escH(imageUrl) + '" alt="' + escH(profile.name || '') + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>'
            : '';
        host.innerHTML =
            '<div style="width:900px;padding:48px;background:linear-gradient(160deg,#0f172a 0%,#111827 48%,#1f2937 100%);color:#F8FAFC;border-radius:40px;font-family:\'Noto Sans TC\',sans-serif;box-shadow:0 32px 90px rgba(15,23,42,0.46);">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:28px;margin-bottom:32px;">' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="font-size:18px;letter-spacing:0.18em;text-transform:uppercase;color:' + quizHexToRgba(profile.color, 0.92) + ';margin-bottom:12px;">AIFLOWTIME AI診斷</div>' +
                        '<div style="font-size:46px;font-weight:800;line-height:1.2;">' + escH(profile.name || '') + '</div>' +
                        '<div style="font-size:24px;color:rgba(248,250,252,0.82);margin-top:10px;">' + escH(profile.levelLabel || '') + ' · 平均 ' + (scores.avgScore || 0) + '/100</div>' +
                    '</div>' +
                    '<div style="display:flex;flex-direction:column;gap:18px;align-items:flex-end;">' +
                        imageHtml +
                        '<div style="padding:14px 18px;border-radius:999px;background:' + quizHexToRgba(profile.color, 0.16) + ';border:1px solid ' + quizHexToRgba(profile.color, 0.35) + ';font-size:18px;font-weight:700;color:#fff;">' + escH(quizDistanceLabel(profile.level || 0)) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex;gap:12px;margin-bottom:28px;">' + quizShareSegmentsHtml(profile.level || 0) + '</div>' +
                '<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:28px;padding:28px;">' +
                    '<div style="font-size:18px;color:' + quizHexToRgba(profile.color, 0.92) + ';font-weight:700;margin-bottom:12px;">' + escH(labels.statusLabel || '你而家嘅狀態') + '</div>' +
                    '<div style="font-size:26px;line-height:1.7;color:#F8FAFC;">' + escH(profile.diagnosis || '') + '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(host);
        var target = host.firstChild;
        html2canvas(target, {
            backgroundColor: null,
            scale: 2,
            useCORS: true
        }).then(function(canvas) {
            var link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'aiflowtime-ai-diagnostic-level-' + (profile.level || 0) + '.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch(function() {
            alert(labels.shareErrorText || '生成分享圖失敗，請稍後再試。');
        }).finally(function() {
            if (host.parentNode) host.parentNode.removeChild(host);
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalLabel;
            }
        });
    }

    function buildPreviewSample() {
        var answers = getQuestions().map(function() { return 2; });
        if (!answers.length) return { profile: getProfiles()[0] || null, scores: emptyQuizScores() };
        return computeQuizResult(answers);
    }

    function renderQuizPreview() {
        hideProgress();
        var introSection = getConfig().introSection || getSectionByType('quiz-intro') || {};
        var leadGateSection = getConfig().leadGateSection || getSectionByType('quiz-lead-gate') || {};
        var thresholdsSection = getConfig().thresholdsSection || getSectionByType('quiz-thresholds') || {};
        var routingSection = getConfig().routingSection || getSectionByType('quiz-routing-rules') || {};
        var archetypesSection = getConfig().archetypesSection || getSectionByType('quiz-archetypes') || {};
        var productsSection = getConfig().productsSection || getSectionByType('quiz-products') || {};
        var resultSection = getConfig().resultDisplaySection || getSectionByType('quiz-result-display') || {};
        var intro = getConfig().intro || {};
        var gate = getConfig().leadGate || {};
        var thresholds = getConfig().thresholds || { axes: [], levels: [] };
        var routing = getConfig().routing || { rules: [] };
        var archetypes = getConfig().archetypes || { profiles: [] };
        var products = getConfig().products || { items: [] };
        var resultDisplay = getConfig().resultDisplay || {};
        var sample = buildPreviewSample();
        var introButtonStyle = quizButtonStyleAttr(intro.buttonBgColor, intro.buttonTextColor);

        var introHtml = previewSection(introSection, '開始頁', '' +
            '<div class="q-intro">' +
                '<div class="q-intro-badge">' + richHtml(intro.badgeText || '') + '</div>' +
                '<h2 class="q-intro-title" style="font-size:30px;">' + richHtml(intro.heading || '') + '</h2>' +
                '<p class="q-intro-sub">' + richHtml(intro.subtitle || '') + '</p>' +
                '<div class="q-intro-points">' +
                    (intro.points || []).map(function(point) {
                        return '<div class="q-intro-point"><div><div class="q-intro-point-title">' + richHtml(point.title || '') + '</div><div class="q-intro-point-body">' + richHtml(point.body || '') + '</div></div></div>';
                    }).join('') +
                '</div>' +
                '<button class="q-btn-primary" type="button"' + introButtonStyle + '>' + richHtml(intro.startButtonText || '') + '</button>' +
                '<p class="q-intro-note">' + richHtml(intro.noteText || '') + '</p>' +
            '</div>');

        var questionsHtml = getQuestions().map(function(question, idx) {
            var section = getSectionById(question.sectionId) || { id: question.sectionId, visible: true };
            return previewSection(section, '題目 ' + (idx + 1) + ' · ' + question.questionRole, '' +
                '<div class="q-card" style="text-align:left;">' +
                    '<div class="q-card-num">Q' + (idx + 1) + '</div>' +
                    '<h3 class="q-card-title" style="font-size:24px;">' + escH(question.title || '') + '</h3>' +
                    '<p class="q-card-sub">' + nl2brEsc(question.subtitle || '') + '</p>' +
                    '<div class="q-options">' +
                        question.options.map(function(option, optionIdx) {
                            return '<div class="q-option" style="cursor:default;">' +
                                '<span class="q-option-letter">' + String.fromCharCode(65 + optionIdx) + '</span>' +
                                '<div style="flex:1;min-width:0;">' +
                                    '<div class="q-option-text">' + escH(option.text || '') + '</div>' +
                                    '<div class="q-preview-score-pills">' + optionScoreSummary(option) + '</div>' +
                                '</div>' +
                            '</div>';
                        }).join('') +
                    '</div>' +
                '</div>');
        }).join('');

        var gateHtml = previewSection(leadGateSection, '結果解鎖表單', '' +
            '<div class="q-gate">' +
                '<div class="q-gate-title">' + escH(gate.heading || '') + '</div>' +
                '<p class="q-gate-desc">' + nl2brEsc(gate.description || '') + '</p>' +
                '<div class="q-preview-gate-form">' +
                    '<span>' + escH(gate.namePlaceholder || '') + '</span>' +
                    '<span>' + escH(gate.phoneToggleLabel || '') + '</span>' +
                    '<span>' + escH(gate.emailToggleLabel || '') + '</span>' +
                    '<button class="q-btn-primary" type="button">' + escH(gate.submitButtonText || '') + '</button>' +
                '</div>' +
            '</div>');

        var thresholdsHtml = previewSection(thresholdsSection, '評分與等級', '' +
            '<div class="q-preview-grid">' +
                thresholds.axes.map(function(axis) {
                    return '<div class="q-preview-info-card"><strong>' + escH(axis.label) + '</strong><span>' + escH(axis.description || '') + '</span><b>滿分 ' + escH(axis.maxScore) + '</b></div>';
                }).join('') +
            '</div>' +
            '<div class="q-preview-grid" style="margin-top:14px;">' +
                thresholds.levels.map(function(level) {
                    return '<div class="q-preview-info-card"><strong>' + escH(level.archetypeKey) + '</strong><span>' + escH(level.levelLabel || '') + '</span><b><= ' + escH(level.maxAvgScore) + '</b></div>';
                }).join('') +
            '</div>');

        var routingHtml = previewSection(routingSection, '推薦規則', '<div class="q-preview-rule-list">' +
            routing.rules.map(function(rule, idx) {
                return '<div class="q-preview-rule-item"><strong>#' + (idx + 1) + ' ' + escH(rule.label || '') + '</strong><span>Level ' + escH(rule.minLevel || '-') + ' 至 ' + escH(rule.maxLevel || '-') + '</span><span>Lowest Axis: ' + escH(rule.lowestAxesCsv || '任何') + '</span><b>' + escH(rule.targetProduct || '') + '</b></div>';
            }).join('') +
            '</div>');

        var archetypesHtml = previewSection(archetypesSection, 'Archetypes 與結果圖片', '<div class="q-preview-grid">' +
            archetypes.profiles.map(function(profile) {
                return '<div class="q-preview-profile-card" style="--preview-color:' + escH(profile.color || '#D97757') + ';">' +
                    '<div class="q-preview-profile-top">' + escH(profile.name || '') + '</div>' +
                    (normalizeMediaUrl(profile.imageUrl) ? '<img class="q-preview-profile-image" src="' + escH(normalizeMediaUrl(profile.imageUrl)) + '" alt="' + escH(profile.name || '') + '">' : '<div class="q-preview-profile-image is-empty">未設定結果圖片</div>') +
                    '<p>' + escH(profile.diagnosis || '') + '</p>' +
                '</div>';
            }).join('') +
            '</div>');

        var productsHtml = previewSection(productsSection, '產品 CTA', '<div class="q-preview-grid">' +
            products.items.map(function(item) {
                return '<div class="q-preview-info-card"><strong>' + escH(item.key || '') + '</strong><span>' + escH(item.label || '') + '</span><b>' + escH(item.price || '') + '</b></div>';
            }).join('') +
            '</div>');

        var previewResultImageBlock = normalizeMediaUrl(sample.profile && sample.profile.imageUrl)
            ? resultImageHtml(sample.profile)
            : '';
        var previewMediaGridClass = previewResultImageBlock ? 'q-result-media-grid' : 'q-result-media-grid is-no-image';

        var resultHtml = previewSection(resultSection, '結果頁顯示', '' +
            '<div class="q-result">' +
                '<div class="q-result-hero">' +
                    '<div class="q-result-badge" style="background:' + escH((sample.profile || {}).color || '#D97757') + ';"><div><div class="q-result-badge-cn">' + escH((sample.profile || {}).name || '') + '</div><div class="q-result-badge-en">' + escH((sample.profile || {}).levelLabel || '') + '</div></div></div>' +
                    '<div class="q-level-meter">' + quizLevelSegmentsHtml((sample.profile || {}).level || 0) + '</div>' +
                '</div>' +
                '<div class="' + previewMediaGridClass + '">' +
                    previewResultImageBlock +
                    '<div class="q-result-section q-radar-section" style="--radar-color:' + escH((sample.profile || {}).color || '#D97757') + ';--radar-glow:' + quizHexToRgba((sample.profile || {}).color || '#D97757', 0.16) + ';">' +
                        '<div class="q-result-section-label">' + escH(resultDisplay.radarTitle || '') + '</div>' +
                        '<div class="q-radar-layout">' +
                            '<div class="q-radar-visual">' + quizRadarSvgHtml((sample.scores || {}).axisNormalized || emptyAxisScores(), (sample.profile || {}).color || '#D97757', (sample.scores || {}).lowestAxis || '') + '</div>' +
                            '<div class="q-radar-side"><div class="q-radar-score-pill">' + escH(resultDisplay.radarAvgLabel || '') + ' ' + escH((sample.scores || {}).avgScore || 0) + ' / 100</div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>');

        setQuizMainMode('default');
        document.getElementById('quizMain').innerHTML = '<div class="q-preview-stack">' +
            introHtml + questionsHtml + gateHtml + thresholdsHtml + routingHtml + archetypesHtml + productsHtml + resultHtml +
            '</div>';
    }

    function renderApp() {
        resetQuizState();
        renderIntro();
    }

    function applyLayoutSections(sections) {
        _quizApp.config = typeof buildQuizLayoutConfig === 'function' ? buildQuizLayoutConfig(sections) : _fallbackConfig();
        if (typeof syncPageBackgroundFromSections === 'function') {
            syncPageBackgroundFromSections(_quizApp.config.sections, { wrapperId: 'quiz-page-bg' });
        }
        if (_quizApp.previewMode) renderQuizPreview();
        else renderApp();
    }

    function loadQuizLayoutFromFirestore() {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            applyLayoutSections(getDefaultQuizLayoutSections());
            return;
        }
        var db = firebase.firestore();
        db.collection('pageLayouts').doc(getLayoutDocId()).get().then(function(doc) {
            var data = doc.exists ? (doc.data() || {}) : null;
            if (typeof applyFirestorePageMeta === 'function') {
                applyFirestorePageMeta(data, { fallbackTitle: document.title });
            }
            var sections = data && Array.isArray(data.sections) && data.sections.length ? data.sections : getDefaultQuizLayoutSections();
            applyLayoutSections(sections);
        }).catch(function() {
            applyLayoutSections(getDefaultQuizLayoutSections());
        });
    }

    function bootQuizApp() {
        if (_booted) return;
        _booted = true;
        _quizApp.previewMode = isPreviewMode();

        if (_quizApp.previewMode) {
            applyLayoutSections(getDefaultQuizLayoutSections());
            if (typeof initLayoutPreviewBridge === 'function') {
                initLayoutPreviewBridge({
                    onLayoutPreview: function(sections) {
                        var scrollY = window.scrollY || window.pageYOffset || 0;
                        applyLayoutSections(sections);
                        window.scrollTo(0, scrollY);
                    }
                });
            }
            return;
        }

        loadQuizLayoutFromFirestore();
    }

    global.startQuizFlow = startQuizFlow;
    global.renderQuestion = renderQuestion;
    global.selectOption = selectOption;
    global.switchContactMode = switchContactMode;
    global.submitLead = submitLead;
    global.downloadQuizShareCard = downloadQuizShareCard;
    global.setActiveQuizAxis = setActiveQuizAxis;
    global.initAIFlowTimeQuiz = bootQuizApp;

    document.addEventListener('DOMContentLoaded', bootQuizApp);
})(window);
