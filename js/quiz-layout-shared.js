(function(global) {
    'use strict';

    function deepClone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function safeString(value, fallback) {
        if (value === undefined || value === null) return fallback || '';
        return String(value);
    }

    function safeNumber(value, fallback) {
        var num = parseFloat(value);
        return isNaN(num) ? (fallback != null ? fallback : 0) : num;
    }

    function safeInt(value, fallback) {
        var num = parseInt(value, 10);
        return isNaN(num) ? (fallback != null ? fallback : 0) : num;
    }

    function stripEmojiText(value, fallback) {
        var base = safeString(value, fallback);
        if (!base) return '';
        return base
            .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }

    var QUIZ_SECTION_TYPES = [
        'page-background',
        'quiz-intro',
        'quiz-question',
        'quiz-lead-gate',
        'quiz-thresholds',
        'quiz-routing-rules',
        'quiz-archetypes',
        'quiz-products',
        'quiz-result-display'
    ];

    var QUIZ_SINGLETON_TYPES = [
        'quiz-intro',
        'quiz-lead-gate',
        'quiz-thresholds',
        'quiz-routing-rules',
        'quiz-archetypes',
        'quiz-products',
        'quiz-result-display'
    ];

    var DEFAULT_AXES = [
        { key: 'communication', label: 'AI 溝通力', emoji: '', description: '同AI溝通嘅能力', maxScore: 16 },
        { key: 'visual', label: '視覺創作力', emoji: '', description: '用AI做設計同視覺內容', maxScore: 9 },
        { key: 'efficiency', label: '效率槓桿力', emoji: '', description: '用AI慳時間嘅程度', maxScore: 19 },
        { key: 'automation', label: '自動化力', emoji: '', description: '建立AI系統同workflow', maxScore: 17 },
        { key: 'awareness', label: 'AI 認知力', emoji: '', description: '對AI能力同工具嘅認知', maxScore: 20 },
        { key: 'action', label: '行動力', emoji: '', description: '學習同執行嘅意願', maxScore: 20 }
    ];

    var DEFAULT_LEVELS = [
        { archetypeKey: 'observer', level: 1, maxAvgScore: 25, levelLabel: 'Level 1 / 5' },
        { archetypeKey: 'dabbler', level: 2, maxAvgScore: 40, levelLabel: 'Level 2 / 5' },
        { archetypeKey: 'tooluser', level: 3, maxAvgScore: 60, levelLabel: 'Level 3 / 5' },
        { archetypeKey: 'semi-auto', level: 4, maxAvgScore: 80, levelLabel: 'Level 4 / 5' },
        { archetypeKey: 'native', level: 5, maxAvgScore: 100, levelLabel: 'Level 5 / 5' }
    ];

    var DEFAULT_PRODUCTS = [
        { key: 'starter', label: 'AI 起動班 — 2小時學識同AI對話', url: '/workshop-0', price: 'HKD 180' },
        { key: 'visual', label: 'AI 視覺創作營 — 3堂做出品牌設計語言', url: '/workshop-c', price: 'HKD 1,599' },
        { key: 'bootcamp', label: 'AI 原住民修煉計劃 — 從零到AI自動化', url: '/bootcamp', price: '即將推出' },
        { key: 'community', label: '加入 AIFLOWTIME 社群', url: '/community', price: '免費' },
        { key: 'pro', label: 'AIFLOWTIME Pro 會員', url: '/community-pro', price: 'HKD 499/月' }
    ];

    var DEFAULT_PROFILES = [
        {
            key: 'observer',
            emoji: '',
            name: 'AI 旁觀者',
            level: 1,
            levelLabel: 'Level 1 / 5',
            diagnosis: '你仲企喺AI時代嘅門口觀望。唔係你唔叻，係你未開始。好消息：而家開始，你可以用2小時追返人哋用咗半年先識嘅嘢。',
            warning: '每遲一個月開始，你同識用AI嘅人之間嘅差距就大一個月。',
            action: '你需要嘅係一個起點 — 學識同AI對話嘅基本功。',
            color: '#ef4444',
            imageUrl: ''
        },
        {
            key: 'dabbler',
            emoji: '',
            name: 'AI 試水者',
            level: 2,
            levelLabel: 'Level 2 / 5',
            diagnosis: '你已經濕咗腳趾，但仲未真正落水。你用過ChatGPT，但佢俾你嘅嘢成日唔啱用。問題唔係AI，係你未識點同佢溝通。',
            warning: '你而家嘅用法，可能令你覺得AI冇用。但其實係方法未啱。',
            action: '你需要掌握prompt嘅底層邏輯，先可以真正用AI慳時間。',
            color: '#f97316',
            imageUrl: ''
        },
        {
            key: 'tooluser',
            emoji: '',
            name: 'AI 工具人',
            level: 3,
            levelLabel: 'Level 3 / 5',
            diagnosis: '你識用AI，但只限於基本任務。你仲未解鎖AI喺視覺、自動化、系統化方面嘅威力。你嘅下一步唔係學多啲工具，係學點樣用AI建立系統。',
            warning: '你已經過咗起步階段，但小心停喺comfort zone。',
            action: '係時候揀一個方向深入 — 視覺創作定自動化。',
            color: '#eab308',
            imageUrl: ''
        },
        {
            key: 'semi-auto',
            emoji: '',
            name: 'AI 半自動化者',
            level: 4,
            levelLabel: 'Level 4 / 5',
            diagnosis: '你已經行得好前，但你仲係一個人戰鬥。你需要嘅唔係更多課程，係一個系統同一班同路人。',
            warning: '單打獨鬥嘅天花板好快到。你需要社群同系統嚟突破。',
            action: '加入一個識用AI嘅社群，交流自動化workflow同實戰經驗。',
            color: '#3b82f6',
            imageUrl: ''
        },
        {
            key: 'native',
            emoji: '',
            name: 'AI 原住民',
            level: 5,
            levelLabel: 'Level 5 / 5',
            diagnosis: '你已經係AI Native。你唔需要基礎課程 — 你需要嘅係同level嘅人交流，同埋更進階嘅自動化系統。',
            warning: '你嘅挑戰唔係學習，係搵到同頻嘅人一齊Build。',
            action: '歡迎加入進階社群，一齊Build更大嘅嘢。',
            color: '#a855f7',
            imageUrl: ''
        }
    ];

    var DEFAULT_INTRO = {
        title: '開始頁',
        badgeText: '2 分鐘 AI 診斷',
        heading: '你嘅 AI 能力\n去到邊？',
        subtitle: '5 條情境題，幫你搵出真正嘅瓶頸\n同最適合你嘅下一步。',
        startButtonText: '開始診斷',
        noteText: '免費 · 不需登入 · 結果即時顯示',
        buttonBgColor: '',
        buttonTextColor: '',
        points: [
            { title: '診斷你嘅 AI 成熟度', body: '唔係考試，係幫你認清自己' },
            { title: '即場俾你一個可以做嘅行動', body: '唔使等，今日就用得著' },
            { title: '推薦最適合你嘅學習路線', body: '唔再盲目揀課程' }
        ]
    };

    var DEFAULT_LEAD_GATE = {
        title: '資料解鎖',
        heading: '你嘅 AI 診斷結果已經準備好',
        description: '輸入你嘅資料，即刻解鎖個人化診斷報告\n（包括即場可用嘅行動建議）',
        submitButtonText: '解鎖我嘅診斷報告',
        privacyNote: '我哋唔會 spam 你，資料只用於跟進學習建議',
        namePlaceholder: '你嘅名字',
        phoneToggleLabel: '電話號碼',
        emailToggleLabel: 'Email',
        phonePlaceholder: '電話號碼',
        emailPlaceholder: 'your@email.com',
        nameError: '請輸入你嘅名字',
        phoneError: '請輸入有效嘅電話號碼',
        emailError: '請輸入有效嘅 Email 地址'
    };

    var DEFAULT_RESULT_DISPLAY = {
        title: '結果頁顯示',
        radarTitle: 'AI 六維能力地圖',
        radarAvgLabel: '平均 AI 能力值',
        statusLabel: '你而家嘅狀態',
        warningLabel: '注意',
        actionLabel: '你而家最應該做嘅一步',
        recommendationLabel: '推薦下一步',
        shareButtonText: '分享你嘅AI等級',
        shareLoadingText: '製作分享圖中...',
        shareErrorText: '生成分享圖失敗，請稍後再試。',
        allWorkshopsText: '想睇晒所有工作坊？ →',
        strongestPrefix: '最強',
        weakestPrefix: '最低'
    };

    var DEFAULT_ROUTING_RULES = [
        { label: 'Level 1-2 一律去起動班', minLevel: '', maxLevel: '2', lowestAxesCsv: '', targetProduct: 'starter' },
        { label: '視覺力最低時去視覺創作營', minLevel: '3', maxLevel: '', lowestAxesCsv: 'visual', targetProduct: 'visual' },
        { label: '自動化力最低時去原住民修煉計劃', minLevel: '3', maxLevel: '', lowestAxesCsv: 'automation', targetProduct: 'bootcamp' },
        { label: 'L4+ 行動力最低時去社群', minLevel: '4', maxLevel: '', lowestAxesCsv: 'action', targetProduct: 'community' },
        { label: 'L4+ 溝通力或效率最低時去社群', minLevel: '4', maxLevel: '', lowestAxesCsv: 'communication,efficiency', targetProduct: 'community' },
        { label: 'Level 5 去 Pro', minLevel: '5', maxLevel: '5', lowestAxesCsv: '', targetProduct: 'pro' },
        { label: 'L3 溝通力最低時回起動班', minLevel: '3', maxLevel: '3', lowestAxesCsv: 'communication', targetProduct: 'starter' },
        { label: '其餘情況預設去原住民修煉計劃', minLevel: '3', maxLevel: '', lowestAxesCsv: '', targetProduct: 'bootcamp' }
    ];

    function defaultQuestionContent(role, title, subtitle, options) {
        return {
            title: title,
            questionRole: role,
            subtitle: subtitle,
            options: options
        };
    }

    var DEFAULT_QUESTION_CONTENTS = [
        defaultQuestionContent('skill', '你要寫一封重要嘅客戶回覆email，你會點做？', '揀最貼近你真實做法嘅選項', [
            { text: '自己由零開始寫，逐字逐句諗', scores: { communication: 1, visual: 0, efficiency: 1, automation: 0, awareness: 1, action: 1 }, painTag: '', desireTag: '' },
            { text: 'Google搵範本，然後改改佢', scores: { communication: 2, visual: 0, efficiency: 2, automation: 0, awareness: 2, action: 1 }, painTag: '', desireTag: '' },
            { text: '叫ChatGPT幫你起稿，但要改好多先用得', scores: { communication: 3, visual: 0, efficiency: 2, automation: 0, awareness: 3, action: 2 }, painTag: '', desireTag: '' },
            { text: '用設定好嘅prompt，AI出稿後微調就send', scores: { communication: 4, visual: 0, efficiency: 4, automation: 2, awareness: 4, action: 3 }, painTag: '', desireTag: '' },
            { text: 'AI Agent自動draft好，approve就得', scores: { communication: 5, visual: 0, efficiency: 5, automation: 5, awareness: 5, action: 4 }, painTag: '', desireTag: '' }
        ]),
        defaultQuestionContent('skill', '老闆叫你出一張社交媒體宣傳圖，限今日交。你會？', '諗下你真實會點處理', [
            { text: '開Canva慢慢砌，搵素材搵到天黑', scores: { communication: 0, visual: 1, efficiency: 1, automation: 0, awareness: 1, action: 1 }, painTag: '', desireTag: '' },
            { text: '用Canva template改文字同顏色', scores: { communication: 0, visual: 2, efficiency: 2, automation: 0, awareness: 2, action: 1 }, painTag: '', desireTag: '' },
            { text: '用AI生成圖片，但唔太識控制風格', scores: { communication: 1, visual: 3, efficiency: 2, automation: 0, awareness: 3, action: 2 }, painTag: '', desireTag: '' },
            { text: '用Midjourney加品牌風格prompt，出幾個版本揀', scores: { communication: 3, visual: 4, efficiency: 3, automation: 1, awareness: 4, action: 3 }, painTag: '', desireTag: '' },
            { text: '已經有AI設計workflow，10分鐘內出稿', scores: { communication: 3, visual: 5, efficiency: 5, automation: 4, awareness: 5, action: 4 }, painTag: '', desireTag: '' }
        ]),
        defaultQuestionContent('skill', '你收到一份50頁行業報告，要下午前做summary俾老闆。', '呢個情境考驗你用AI處理資訊嘅能力', [
            { text: '硬啃，由頭睇到尾，慢慢寫重點', scores: { communication: 0, visual: 0, efficiency: 1, automation: 0, awareness: 1, action: 1 }, painTag: '', desireTag: '' },
            { text: '睇目錄同結論，自己寫個大概', scores: { communication: 0, visual: 0, efficiency: 2, automation: 0, awareness: 2, action: 2 }, painTag: '', desireTag: '' },
            { text: 'Upload去ChatGPT叫佢summarize，但唔太識點問', scores: { communication: 2, visual: 0, efficiency: 2, automation: 0, awareness: 3, action: 2 }, painTag: '', desireTag: '' },
            { text: '用AI做structured summary，再追問細節', scores: { communication: 4, visual: 0, efficiency: 4, automation: 1, awareness: 4, action: 3 }, painTag: '', desireTag: '' },
            { text: '有自動化flow，PDF入去自動出brief同action items', scores: { communication: 4, visual: 0, efficiency: 5, automation: 5, awareness: 5, action: 4 }, painTag: '', desireTag: '' }
        ]),
        defaultQuestionContent('pain', '而家最困擾你嘅係咩？', '揀一個最令你「嗯⋯⋯係喎」嘅選項', [
            { text: '資訊太多，唔知從何入手', scores: { communication: 1, visual: 1, efficiency: 1, automation: 1, awareness: 0, action: 1 }, painTag: 'foundations', desireTag: '' },
            { text: 'AI出嘅嘢成日唔啱，浪費時間', scores: { communication: 0, visual: 1, efficiency: 1, automation: 1, awareness: 2, action: 2 }, painTag: 'prompting', desireTag: '' },
            { text: '日日都好忙但好似冇乜進展', scores: { communication: 2, visual: 1, efficiency: 0, automation: 0, awareness: 2, action: 1 }, painTag: 'automation', desireTag: '' },
            { text: '想做靚啲嘅內容但冇時間／唔識', scores: { communication: 2, visual: 0, efficiency: 1, automation: 1, awareness: 2, action: 2 }, painTag: 'visual', desireTag: '' },
            { text: '其實都OK，想同人交流進步', scores: { communication: 3, visual: 3, efficiency: 3, automation: 2, awareness: 3, action: 3 }, painTag: 'community', desireTag: '' }
        ]),
        defaultQuestionContent('desire', '你最想AI幫你做到咩？', '想像下如果AI真係幫到你，你最想要邊個結果', [
            { text: '幫我快啲完成日常工作', scores: { communication: 1, visual: 0, efficiency: 1, automation: 0, awareness: 1, action: 3 }, painTag: '', desireTag: 'efficiency' },
            { text: '幫我做出專業級嘅視覺內容', scores: { communication: 0, visual: 1, efficiency: 0, automation: 0, awareness: 1, action: 3 }, painTag: '', desireTag: 'visual' },
            { text: '幫我建立自動化系統唔使重複做嘢', scores: { communication: 0, visual: 0, efficiency: 1, automation: 1, awareness: 2, action: 4 }, painTag: '', desireTag: 'automation' },
            { text: '幫我學識新技能保持競爭力', scores: { communication: 1, visual: 1, efficiency: 1, automation: 1, awareness: 1, action: 4 }, painTag: '', desireTag: 'learning' },
            { text: '幫我開展副業或新收入來源', scores: { communication: 1, visual: 1, efficiency: 1, automation: 1, awareness: 2, action: 5 }, painTag: '', desireTag: 'business' }
        ])
    ];

    function getDefaultQuizIntroContent() {
        return deepClone(DEFAULT_INTRO);
    }

    function getDefaultQuizLeadGateContent() {
        return deepClone(DEFAULT_LEAD_GATE);
    }

    function getDefaultQuizThresholdsContent() {
        return {
            title: '評分與等級',
            axes: deepClone(DEFAULT_AXES),
            levels: deepClone(DEFAULT_LEVELS)
        };
    }

    function getDefaultQuizRoutingRulesContent() {
        return {
            title: '產品推薦規則',
            rules: deepClone(DEFAULT_ROUTING_RULES)
        };
    }

    function getDefaultQuizArchetypesContent() {
        return {
            title: 'Archetypes',
            profiles: deepClone(DEFAULT_PROFILES)
        };
    }

    function getDefaultQuizProductsContent() {
        return {
            title: '推薦產品',
            items: deepClone(DEFAULT_PRODUCTS)
        };
    }

    function getDefaultQuizResultDisplayContent() {
        return deepClone(DEFAULT_RESULT_DISPLAY);
    }

    function getDefaultQuizQuestionContent(index) {
        var source = DEFAULT_QUESTION_CONTENTS[index] || DEFAULT_QUESTION_CONTENTS[0];
        return deepClone(source);
    }

    function buildDefaultQuizLayoutSections() {
        return [
            { id: 'quiz_intro_default', type: 'quiz-intro', visible: true, content: getDefaultQuizIntroContent() },
            { id: 'quiz_question_email', type: 'quiz-question', visible: true, content: getDefaultQuizQuestionContent(0) },
            { id: 'quiz_question_visual', type: 'quiz-question', visible: true, content: getDefaultQuizQuestionContent(1) },
            { id: 'quiz_question_summary', type: 'quiz-question', visible: true, content: getDefaultQuizQuestionContent(2) },
            { id: 'quiz_question_pain', type: 'quiz-question', visible: true, content: getDefaultQuizQuestionContent(3) },
            { id: 'quiz_question_desire', type: 'quiz-question', visible: true, content: getDefaultQuizQuestionContent(4) },
            { id: 'quiz_lead_gate_default', type: 'quiz-lead-gate', visible: true, content: getDefaultQuizLeadGateContent() },
            { id: 'quiz_thresholds_default', type: 'quiz-thresholds', visible: true, content: getDefaultQuizThresholdsContent() },
            { id: 'quiz_routing_default', type: 'quiz-routing-rules', visible: true, content: getDefaultQuizRoutingRulesContent() },
            { id: 'quiz_archetypes_default', type: 'quiz-archetypes', visible: true, content: getDefaultQuizArchetypesContent() },
            { id: 'quiz_products_default', type: 'quiz-products', visible: true, content: getDefaultQuizProductsContent() },
            { id: 'quiz_result_display_default', type: 'quiz-result-display', visible: true, content: getDefaultQuizResultDisplayContent() }
        ];
    }

    function emptyAxisScoresFromAxes(axes) {
        var out = {};
        (axes || DEFAULT_AXES).forEach(function(axis) {
            out[axis.key] = 0;
        });
        return out;
    }

    function normalizeAxisScores(raw, axes) {
        var out = {};
        (axes || DEFAULT_AXES).forEach(function(axis) {
            out[axis.key] = safeNumber(raw && raw[axis.key], 0);
        });
        return out;
    }

    function normalizeQuestionOption(raw, role, index) {
        raw = raw || {};
        return {
            text: safeString(raw.text, ''),
            scores: normalizeAxisScores(raw.scores || raw, DEFAULT_AXES),
            painTag: role === 'pain' ? safeString(raw.painTag, '') : '',
            desireTag: role === 'desire' ? safeString(raw.desireTag, '') : ''
        };
    }

    function normalizeQuestionContent(raw, fallback, questionIndex) {
        raw = raw || {};
        fallback = fallback || getDefaultQuizQuestionContent(questionIndex || 0);
        var role = safeString(raw.questionRole, fallback.questionRole || 'skill');
        var srcOptions = Array.isArray(raw.options) ? raw.options : fallback.options;
        var outOptions = [];
        for (var i = 0; i < 5; i++) {
            outOptions.push(normalizeQuestionOption(srcOptions[i] || fallback.options[i], role, i));
        }
        return {
            title: safeString(raw.title, fallback.title),
            questionRole: role,
            subtitle: safeString(raw.subtitle, fallback.subtitle),
            options: outOptions
        };
    }

    function normalizeQuizIntroContent(raw) {
        raw = raw || {};
        var fallback = getDefaultQuizIntroContent();
        var points = Array.isArray(raw.points) ? raw.points : fallback.points;
        return {
            title: safeString(raw.title, fallback.title),
            badgeText: safeString(raw.badgeText, fallback.badgeText),
            heading: safeString(raw.heading, fallback.heading),
            subtitle: safeString(raw.subtitle, fallback.subtitle),
            startButtonText: safeString(raw.startButtonText, fallback.startButtonText),
            noteText: safeString(raw.noteText, fallback.noteText),
            buttonBgColor: safeString(raw.buttonBgColor, fallback.buttonBgColor || ''),
            buttonTextColor: safeString(raw.buttonTextColor, fallback.buttonTextColor || ''),
            points: points.slice(0, 6).map(function(item, idx) {
                var pointFallback = fallback.points[idx] || { title: '', body: '' };
                return {
                    title: safeString(item && item.title, pointFallback.title),
                    body: safeString(item && item.body, pointFallback.body)
                };
            })
        };
    }

    function normalizeQuizLeadGateContent(raw) {
        raw = raw || {};
        var fallback = getDefaultQuizLeadGateContent();
        return {
            title: safeString(raw.title, fallback.title),
            heading: safeString(raw.heading, fallback.heading),
            description: safeString(raw.description, fallback.description),
            submitButtonText: safeString(raw.submitButtonText, fallback.submitButtonText),
            privacyNote: stripEmojiText(raw.privacyNote, fallback.privacyNote),
            namePlaceholder: safeString(raw.namePlaceholder, fallback.namePlaceholder),
            phoneToggleLabel: stripEmojiText(raw.phoneToggleLabel, fallback.phoneToggleLabel),
            emailToggleLabel: stripEmojiText(raw.emailToggleLabel, fallback.emailToggleLabel),
            phonePlaceholder: safeString(raw.phonePlaceholder, fallback.phonePlaceholder),
            emailPlaceholder: safeString(raw.emailPlaceholder, fallback.emailPlaceholder),
            nameError: safeString(raw.nameError, fallback.nameError),
            phoneError: safeString(raw.phoneError, fallback.phoneError),
            emailError: safeString(raw.emailError, fallback.emailError)
        };
    }

    function normalizeQuizThresholdsContent(raw) {
        raw = raw || {};
        var fallback = getDefaultQuizThresholdsContent();
        var srcAxes = Array.isArray(raw.axes) ? raw.axes : fallback.axes;
        var axes = DEFAULT_AXES.map(function(axis, idx) {
            var src = srcAxes[idx] || srcAxes.filter(function(item) { return item && item.key === axis.key; })[0] || {};
            return {
                key: axis.key,
                label: safeString(src.label, axis.label),
                emoji: '',
                description: safeString(src.description, axis.description),
                maxScore: safeInt(src.maxScore, axis.maxScore)
            };
        });
        var srcLevels = Array.isArray(raw.levels) ? raw.levels : fallback.levels;
        var levels = DEFAULT_LEVELS.map(function(level, idx) {
            var src = srcLevels[idx] || srcLevels.filter(function(item) { return item && item.archetypeKey === level.archetypeKey; })[0] || {};
            return {
                archetypeKey: level.archetypeKey,
                level: safeInt(src.level, level.level),
                maxAvgScore: safeInt(src.maxAvgScore, level.maxAvgScore),
                levelLabel: safeString(src.levelLabel, level.levelLabel)
            };
        });
        return {
            title: safeString(raw.title, fallback.title),
            axes: axes,
            levels: levels
        };
    }

    function normalizeQuizRoutingRulesContent(raw) {
        raw = raw || {};
        var fallback = getDefaultQuizRoutingRulesContent();
        var rules = Array.isArray(raw.rules) && raw.rules.length ? raw.rules : fallback.rules;
        return {
            title: safeString(raw.title, fallback.title),
            rules: rules.map(function(rule, idx) {
                var src = rule || fallback.rules[idx] || {};
                return {
                    label: safeString(src.label, '規則 ' + (idx + 1)),
                    minLevel: safeString(src.minLevel, ''),
                    maxLevel: safeString(src.maxLevel, ''),
                    lowestAxesCsv: safeString(src.lowestAxesCsv, ''),
                    targetProduct: safeString(src.targetProduct, 'bootcamp')
                };
            })
        };
    }

    function normalizeQuizArchetypesContent(raw) {
        raw = raw || {};
        var fallback = getDefaultQuizArchetypesContent();
        var profiles = Array.isArray(raw.profiles) && raw.profiles.length ? raw.profiles : fallback.profiles;
        return {
            title: safeString(raw.title, fallback.title),
            profiles: DEFAULT_PROFILES.map(function(profile, idx) {
                var src = profiles[idx] || profiles.filter(function(item) { return item && item.key === profile.key; })[0] || {};
                return {
                    key: profile.key,
                    emoji: '',
                    name: safeString(src.name, profile.name),
                    level: safeInt(src.level, profile.level),
                    levelLabel: safeString(src.levelLabel, profile.levelLabel),
                    diagnosis: safeString(src.diagnosis, profile.diagnosis),
                    warning: safeString(src.warning, profile.warning),
                    action: safeString(src.action, profile.action),
                    color: safeString(src.color, profile.color),
                    imageUrl: safeString(src.imageUrl, '')
                };
            })
        };
    }

    function normalizeQuizProductsContent(raw) {
        raw = raw || {};
        var fallback = getDefaultQuizProductsContent();
        var items = Array.isArray(raw.items) && raw.items.length ? raw.items : fallback.items;
        return {
            title: safeString(raw.title, fallback.title),
            items: DEFAULT_PRODUCTS.map(function(product, idx) {
                var src = items[idx] || items.filter(function(item) { return item && item.key === product.key; })[0] || {};
                return {
                    key: product.key,
                    label: safeString(src.label, product.label),
                    url: safeString(src.url, product.url),
                    price: safeString(src.price, product.price)
                };
            })
        };
    }

    function normalizeQuizResultDisplayContent(raw) {
        raw = raw || {};
        var fallback = getDefaultQuizResultDisplayContent();
        return {
            title: safeString(raw.title, fallback.title),
            radarTitle: safeString(raw.radarTitle, fallback.radarTitle),
            radarAvgLabel: safeString(raw.radarAvgLabel, fallback.radarAvgLabel),
            statusLabel: safeString(raw.statusLabel, fallback.statusLabel),
            warningLabel: stripEmojiText(raw.warningLabel, fallback.warningLabel),
            actionLabel: stripEmojiText(raw.actionLabel, fallback.actionLabel),
            recommendationLabel: safeString(raw.recommendationLabel, fallback.recommendationLabel),
            shareButtonText: safeString(raw.shareButtonText, fallback.shareButtonText),
            shareLoadingText: safeString(raw.shareLoadingText, fallback.shareLoadingText),
            shareErrorText: safeString(raw.shareErrorText, fallback.shareErrorText),
            allWorkshopsText: safeString(raw.allWorkshopsText, fallback.allWorkshopsText),
            strongestPrefix: safeString(raw.strongestPrefix, fallback.strongestPrefix),
            weakestPrefix: safeString(raw.weakestPrefix, fallback.weakestPrefix)
        };
    }

    function getQuizSingletonTypeFallback(type) {
        switch (type) {
            case 'quiz-intro':
                return { id: 'quiz_intro_default', type: type, visible: true, content: getDefaultQuizIntroContent() };
            case 'quiz-lead-gate':
                return { id: 'quiz_lead_gate_default', type: type, visible: true, content: getDefaultQuizLeadGateContent() };
            case 'quiz-thresholds':
                return { id: 'quiz_thresholds_default', type: type, visible: true, content: getDefaultQuizThresholdsContent() };
            case 'quiz-routing-rules':
                return { id: 'quiz_routing_default', type: type, visible: true, content: getDefaultQuizRoutingRulesContent() };
            case 'quiz-archetypes':
                return { id: 'quiz_archetypes_default', type: type, visible: true, content: getDefaultQuizArchetypesContent() };
            case 'quiz-products':
                return { id: 'quiz_products_default', type: type, visible: true, content: getDefaultQuizProductsContent() };
            case 'quiz-result-display':
                return { id: 'quiz_result_display_default', type: type, visible: true, content: getDefaultQuizResultDisplayContent() };
            default:
                return null;
        }
    }

    function normalizeQuizSection(type, section, index) {
        var fallback = section || getQuizSingletonTypeFallback(type) || {};
        var out = {
            id: safeString(fallback.id, type + '_' + Date.now()),
            type: type,
            visible: fallback.visible !== false,
            order: fallback.order != null ? fallback.order : index,
            content: {}
        };
        if (type === 'quiz-intro') out.content = normalizeQuizIntroContent(fallback.content);
        else if (type === 'quiz-lead-gate') out.content = normalizeQuizLeadGateContent(fallback.content);
        else if (type === 'quiz-thresholds') out.content = normalizeQuizThresholdsContent(fallback.content);
        else if (type === 'quiz-routing-rules') out.content = normalizeQuizRoutingRulesContent(fallback.content);
        else if (type === 'quiz-archetypes') out.content = normalizeQuizArchetypesContent(fallback.content);
        else if (type === 'quiz-products') out.content = normalizeQuizProductsContent(fallback.content);
        else if (type === 'quiz-result-display') out.content = normalizeQuizResultDisplayContent(fallback.content);
        return out;
    }

    function normalizeQuizQuestionSection(section, index) {
        var fallbackContent = getDefaultQuizQuestionContent(index);
        return {
            id: safeString(section && section.id, 'quiz_question_' + (index + 1)),
            type: 'quiz-question',
            visible: !section || section.visible !== false,
            order: section && section.order != null ? section.order : index + 1,
            content: normalizeQuestionContent(section && section.content, fallbackContent, index)
        };
    }

    function normalizeQuizPageBackgroundSection(section, index) {
        var raw = section && section.content ? deepClone(section.content) : {};
        var sourceType = safeString(raw.sourceType, 'css');
        if (['css', 'image', 'code'].indexOf(sourceType) === -1) sourceType = 'css';
        var normalized = {
            id: safeString(section && section.id, 'quiz_page_background'),
            type: 'page-background',
            visible: !section || section.visible !== false,
            order: section && section.order != null ? section.order : index,
            content: {
                sourceType: sourceType,
                imageUrl: safeString(raw.imageUrl, ''),
                css: safeString(raw.css, ''),
                code: safeString(raw.code, ''),
                opacity: safeInt(raw.opacity, 100),
                fixed: !!raw.fixed
            }
        };
        if (normalized.content.opacity < 0) normalized.content.opacity = 0;
        if (normalized.content.opacity > 100) normalized.content.opacity = 100;
        return normalized;
    }

    function normalizeQuizLayoutSections(rawSections) {
        var sections = Array.isArray(rawSections) ? deepClone(rawSections) : [];
        var defaults = buildDefaultQuizLayoutSections();
        if (!sections.length) return defaults;

        sections.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

        var singletonMap = {};
        var questionSections = [];
        var pageBackgroundSection = null;
        sections.forEach(function(section) {
            if (!section || QUIZ_SECTION_TYPES.indexOf(section.type) === -1) return;
            if (section.type === 'page-background') {
                if (!pageBackgroundSection) pageBackgroundSection = normalizeQuizPageBackgroundSection(section, -1);
            } else if (section.type === 'quiz-question') questionSections.push(section);
            else if (!singletonMap[section.type]) singletonMap[section.type] = section;
        });

        if (!questionSections.length) {
            defaults.forEach(function(section) {
                if (section.type === 'quiz-question') questionSections.push(section);
            });
        }

        questionSections = questionSections.map(function(section, idx) {
            return normalizeQuizQuestionSection(section, idx);
        });

        var normalized = [];
        if (pageBackgroundSection) normalized.push(pageBackgroundSection);
        QUIZ_SINGLETON_TYPES.forEach(function(type, idx) {
            normalized.push(normalizeQuizSection(type, singletonMap[type] || getQuizSingletonTypeFallback(type), idx));
            if (type === 'quiz-intro') {
                questionSections.forEach(function(questionSection) {
                    normalized.push(questionSection);
                });
            }
        });

        return normalized.map(function(section, idx) {
            section.order = idx;
            return section;
        });
    }

    function buildQuizLayoutConfig(rawSections) {
        var sections = normalizeQuizLayoutSections(rawSections);
        var backgroundSection = sections.filter(function(section) { return section.type === 'page-background'; })[0] || null;
        var introSection = sections.filter(function(section) { return section.type === 'quiz-intro'; })[0];
        var leadGateSection = sections.filter(function(section) { return section.type === 'quiz-lead-gate'; })[0];
        var thresholdsSection = sections.filter(function(section) { return section.type === 'quiz-thresholds'; })[0];
        var routingSection = sections.filter(function(section) { return section.type === 'quiz-routing-rules'; })[0];
        var archetypesSection = sections.filter(function(section) { return section.type === 'quiz-archetypes'; })[0];
        var productsSection = sections.filter(function(section) { return section.type === 'quiz-products'; })[0];
        var resultDisplaySection = sections.filter(function(section) { return section.type === 'quiz-result-display'; })[0];
        var questionSections = sections.filter(function(section) { return section.type === 'quiz-question' && section.visible !== false; });
        if (!questionSections.length) {
            questionSections = sections.filter(function(section) { return section.type === 'quiz-question'; });
        }

        var thresholds = normalizeQuizThresholdsContent(thresholdsSection.content);
        var profiles = normalizeQuizArchetypesContent(archetypesSection.content).profiles;
        var levels = thresholds.levels.map(function(level) {
            var profile = profiles.filter(function(item) { return item.key === level.archetypeKey; })[0] || {};
            return {
                archetypeKey: level.archetypeKey,
                level: level.level,
                maxAvgScore: level.maxAvgScore,
                levelLabel: safeString(profile.levelLabel, level.levelLabel)
            };
        });

        return {
            sections: sections,
            backgroundSection: backgroundSection,
            introSection: introSection,
            leadGateSection: leadGateSection,
            thresholdsSection: thresholdsSection,
            routingSection: routingSection,
            archetypesSection: archetypesSection,
            productsSection: productsSection,
            resultDisplaySection: resultDisplaySection,
            intro: normalizeQuizIntroContent(introSection.content),
            leadGate: normalizeQuizLeadGateContent(leadGateSection.content),
            thresholds: {
                title: thresholds.title,
                axes: thresholds.axes,
                levels: levels
            },
            routing: normalizeQuizRoutingRulesContent(routingSection.content),
            archetypes: {
                title: normalizeQuizArchetypesContent(archetypesSection.content).title,
                profiles: profiles
            },
            products: {
                title: normalizeQuizProductsContent(productsSection.content).title,
                items: normalizeQuizProductsContent(productsSection.content).items
            },
            resultDisplay: normalizeQuizResultDisplayContent(resultDisplaySection.content),
            questions: questionSections.map(function(section, idx) {
                var content = normalizeQuestionContent(section.content, getDefaultQuizQuestionContent(idx), idx);
                content.sectionId = section.id;
                return content;
            })
        };
    }

    global.QUIZ_SECTION_TYPES = deepClone(QUIZ_SECTION_TYPES);
    global.QUIZ_SINGLETON_TYPES = deepClone(QUIZ_SINGLETON_TYPES);
    global.QUIZ_DEFAULT_AXES = deepClone(DEFAULT_AXES);
    global.QUIZ_DEFAULT_LEVELS = deepClone(DEFAULT_LEVELS);
    global.QUIZ_DEFAULT_PRODUCTS = deepClone(DEFAULT_PRODUCTS);
    global.QUIZ_DEFAULT_PROFILES = deepClone(DEFAULT_PROFILES);
    global.getDefaultQuizIntroContent = getDefaultQuizIntroContent;
    global.getDefaultQuizLeadGateContent = getDefaultQuizLeadGateContent;
    global.getDefaultQuizThresholdsContent = getDefaultQuizThresholdsContent;
    global.getDefaultQuizRoutingRulesContent = getDefaultQuizRoutingRulesContent;
    global.getDefaultQuizArchetypesContent = getDefaultQuizArchetypesContent;
    global.getDefaultQuizProductsContent = getDefaultQuizProductsContent;
    global.getDefaultQuizResultDisplayContent = getDefaultQuizResultDisplayContent;
    global.getDefaultQuizQuestionContent = getDefaultQuizQuestionContent;
    global.getDefaultQuizLayoutSections = buildDefaultQuizLayoutSections;
    global.normalizeQuizLayoutSections = normalizeQuizLayoutSections;
    global.buildQuizLayoutConfig = buildQuizLayoutConfig;
    global.emptyQuizAxisScores = emptyAxisScoresFromAxes;
})(window);
