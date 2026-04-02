if (window.__USE_NEW_QUIZ_RUNTIME) {
    // New layout-driven runtime is loaded from /js/quiz-runtime.js.
} else {
// ============================================================
// AIFlowTime — 2-Minute AI Diagnostic
// ============================================================

var AXES = [
    { key: 'communication', label: 'AI 溝通力', emoji: '🗣️', description: '同AI溝通嘅能力' },
    { key: 'visual', label: '視覺創作力', emoji: '🎨', description: '用AI做設計同視覺內容' },
    { key: 'efficiency', label: '效率槓桿力', emoji: '⚡', description: '用AI慳時間嘅程度' },
    { key: 'automation', label: '自動化力', emoji: '🔄', description: '建立AI系統同workflow' },
    { key: 'awareness', label: 'AI 認知力', emoji: '🧠', description: '對AI能力同工具嘅認知' },
    { key: 'action', label: '行動力', emoji: '🚀', description: '學習同執行嘅意願' }
];

var MAX_SCORES = {
    communication: 16,
    visual: 9,
    efficiency: 19,
    automation: 17,
    awareness: 20,
    action: 20
};

function _emptyAxisScores() {
    var out = {};
    AXES.forEach(function(axis) { out[axis.key] = 0; });
    return out;
}

function _emptyQuizScores() {
    return {
        avgScore: 0,
        level: 0,
        painTag: '',
        desireTag: '',
        recommendedProduct: '',
        axisTotals: _emptyAxisScores(),
        axisNormalized: _emptyAxisScores(),
        lowestAxis: AXES[0].key,
        highestAxis: AXES[0].key
    };
}

var QUIZ_QUESTIONS = [
    {
        id: 1,
        title: '你要寫一封重要嘅客戶回覆email，你會點做？',
        subtitle: '揀最貼近你真實做法嘅選項',
        options: [
            { text: '自己由零開始寫，逐字逐句諗', scores: { communication: 1, visual: 0, efficiency: 1, automation: 0, awareness: 1, action: 1 } },
            { text: 'Google搵範本，然後改改佢', scores: { communication: 2, visual: 0, efficiency: 2, automation: 0, awareness: 2, action: 1 } },
            { text: '叫ChatGPT幫你起稿，但要改好多先用得', scores: { communication: 3, visual: 0, efficiency: 2, automation: 0, awareness: 3, action: 2 } },
            { text: '用設定好嘅prompt，AI出稿後微調就send', scores: { communication: 4, visual: 0, efficiency: 4, automation: 2, awareness: 4, action: 3 } },
            { text: 'AI Agent自動draft好，approve就得', scores: { communication: 5, visual: 0, efficiency: 5, automation: 5, awareness: 5, action: 4 } }
        ]
    },
    {
        id: 2,
        title: '老闆叫你出一張社交媒體宣傳圖，限今日交。你會？',
        subtitle: '諗下你真實會點處理',
        options: [
            { text: '開Canva慢慢砌，搵素材搵到天黑', scores: { communication: 0, visual: 1, efficiency: 1, automation: 0, awareness: 1, action: 1 } },
            { text: '用Canva template改文字同顏色', scores: { communication: 0, visual: 2, efficiency: 2, automation: 0, awareness: 2, action: 1 } },
            { text: '用AI生成圖片，但唔太識控制風格', scores: { communication: 1, visual: 3, efficiency: 2, automation: 0, awareness: 3, action: 2 } },
            { text: '用Midjourney加品牌風格prompt，出幾個版本揀', scores: { communication: 3, visual: 4, efficiency: 3, automation: 1, awareness: 4, action: 3 } },
            { text: '已經有AI設計workflow，10分鐘內出稿', scores: { communication: 3, visual: 5, efficiency: 5, automation: 4, awareness: 5, action: 4 } }
        ]
    },
    {
        id: 3,
        title: '你收到一份50頁行業報告，要下午前做summary俾老闆。',
        subtitle: '呢個情境考驗你用AI處理資訊嘅能力',
        options: [
            { text: '硬啃，由頭睇到尾，慢慢寫重點', scores: { communication: 0, visual: 0, efficiency: 1, automation: 0, awareness: 1, action: 1 } },
            { text: '睇目錄同結論，自己寫個大概', scores: { communication: 0, visual: 0, efficiency: 2, automation: 0, awareness: 2, action: 2 } },
            { text: 'Upload去ChatGPT叫佢summarize，但唔太識點問', scores: { communication: 2, visual: 0, efficiency: 2, automation: 0, awareness: 3, action: 2 } },
            { text: '用AI做structured summary，再追問細節', scores: { communication: 4, visual: 0, efficiency: 4, automation: 1, awareness: 4, action: 3 } },
            { text: '有自動化flow，PDF入去自動出brief同action items', scores: { communication: 4, visual: 0, efficiency: 5, automation: 5, awareness: 5, action: 4 } }
        ]
    },
    {
        id: 4,
        title: '而家最困擾你嘅係咩？',
        subtitle: '揀一個最令你「嗯⋯⋯係喎」嘅選項',
        options: [
            { text: '資訊太多，唔知從何入手', scores: { communication: 1, visual: 1, efficiency: 1, automation: 1, awareness: 0, action: 1 }, painTag: 'foundations' },
            { text: 'AI出嘅嘢成日唔啱，浪費時間', scores: { communication: 0, visual: 1, efficiency: 1, automation: 1, awareness: 2, action: 2 }, painTag: 'prompting' },
            { text: '日日都好忙但好似冇乜進展', scores: { communication: 2, visual: 1, efficiency: 0, automation: 0, awareness: 2, action: 1 }, painTag: 'automation' },
            { text: '想做靚啲嘅內容但冇時間／唔識', scores: { communication: 2, visual: 0, efficiency: 1, automation: 1, awareness: 2, action: 2 }, painTag: 'visual' },
            { text: '其實都OK，想同人交流進步', scores: { communication: 3, visual: 3, efficiency: 3, automation: 2, awareness: 3, action: 3 }, painTag: 'community' }
        ]
    },
    {
        id: 5,
        title: '你最想AI幫你做到咩？',
        subtitle: '想像下如果AI真係幫到你，你最想要邊個結果',
        options: [
            { text: '幫我快啲完成日常工作', scores: { communication: 1, visual: 0, efficiency: 1, automation: 0, awareness: 1, action: 3 }, desireTag: 'efficiency' },
            { text: '幫我做出專業級嘅視覺內容', scores: { communication: 0, visual: 1, efficiency: 0, automation: 0, awareness: 1, action: 3 }, desireTag: 'visual' },
            { text: '幫我建立自動化系統唔使重複做嘢', scores: { communication: 0, visual: 0, efficiency: 1, automation: 1, awareness: 2, action: 4 }, desireTag: 'automation' },
            { text: '幫我學識新技能保持競爭力', scores: { communication: 1, visual: 1, efficiency: 1, automation: 1, awareness: 1, action: 4 }, desireTag: 'learning' },
            { text: '幫我開展副業或新收入來源', scores: { communication: 1, visual: 1, efficiency: 1, automation: 1, awareness: 2, action: 5 }, desireTag: 'business' }
        ]
    }
];

// ============================================================
// Profile Definitions
// ============================================================
var PROFILES = {
    observer: {
        emoji: '🪑',
        name: 'AI 旁觀者',
        level: 1,
        levelLabel: 'Level 1 / 5',
        diagnosis: '你仲企喺AI時代嘅門口觀望。唔係你唔叻，係你未開始。好消息：而家開始，你可以用2小時追返人哋用咗半年先識嘅嘢。',
        warning: '每遲一個月開始，你同識用AI嘅人之間嘅差距就大一個月。',
        action: '你需要嘅係一個起點 — 學識同AI對話嘅基本功。',
        color: '#ef4444'
    },
    dabbler: {
        emoji: '🏊',
        name: 'AI 試水者',
        level: 2,
        levelLabel: 'Level 2 / 5',
        diagnosis: '你已經濕咗腳趾，但仲未真正落水。你用過ChatGPT，但佢俾你嘅嘢成日唔啱用。問題唔係AI，係你未識點同佢溝通。',
        warning: '你而家嘅用法，可能令你覺得AI冇用。但其實係方法未啱。',
        action: '你需要掌握prompt嘅底層邏輯，先可以真正用AI慳時間。',
        color: '#f97316'
    },
    tooluser: {
        emoji: '🔧',
        name: 'AI 工具人',
        level: 3,
        levelLabel: 'Level 3 / 5',
        diagnosis: '你識用AI，但只限於基本任務。你仲未解鎖AI喺視覺、自動化、系統化方面嘅威力。你嘅下一步唔係學多啲工具，係學點樣用AI建立系統。',
        warning: '你已經過咗起步階段，但小心停喺comfort zone。',
        action: '係時候揀一個方向深入 — 視覺創作定自動化。',
        color: '#eab308'
    },
    'semi-auto': {
        emoji: '⚙️',
        name: 'AI 半自動化者',
        level: 4,
        levelLabel: 'Level 4 / 5',
        diagnosis: '你已經行得好前，但你仲係一個人戰鬥。你需要嘅唔係更多課程，係一個系統同一班同路人。',
        warning: '單打獨鬥嘅天花板好快到。你需要社群同系統嚟突破。',
        action: '加入一個識用AI嘅社群，交流自動化workflow同實戰經驗。',
        color: '#3b82f6'
    },
    native: {
        emoji: '🧬',
        name: 'AI 原住民',
        level: 5,
        levelLabel: 'Level 5 / 5',
        diagnosis: '你已經係AI Native。你唔需要基礎課程 — 你需要嘅係同level嘅人交流，同埋更進階嘅自動化系統。',
        warning: '你嘅挑戰唔係學習，係搵到同頻嘅人一齊Build。',
        action: '歡迎加入進階社群，一齊Build更大嘅嘢。',
        color: '#a855f7'
    }
};

var PRODUCT_CTA = {
    starter: {
        label: 'AI 起動班 — 2小時學識同AI對話',
        url: '/workshop-0',
        price: 'HKD 180'
    },
    visual: {
        label: 'AI 視覺創作營 — 3堂做出品牌設計語言',
        url: '/workshop-c',
        price: 'HKD 1,599'
    },
    bootcamp: {
        label: 'AI 原住民修煉計劃 — 從零到AI自動化',
        url: '/bootcamp',
        price: '即將推出'
    },
    community: {
        label: '加入 AIFLOWTIME 社群',
        url: '/community',
        price: '免費'
    },
    pro: {
        label: 'AIFLOWTIME Pro 會員',
        url: '/community-pro',
        price: 'HKD 499/月'
    }
};

// ============================================================
// State
// ============================================================
var _quizState = {
    currentQ: 0,
    answers: [],
    scores: _emptyQuizScores(),
    profile: null,
    leadCaptured: false,
    activeAxisKey: AXES[0].key
};

// ============================================================
// Init
// ============================================================
function initQuiz() {
    _quizState = { currentQ: 0, answers: [], scores: _emptyQuizScores(), profile: null, leadCaptured: false, activeAxisKey: AXES[0].key };
    renderIntro();
}

function setQuizMainMode(mode) {
    var node = document.getElementById('quizMain');
    if (!node) return;
    node.classList.toggle('is-result-mode', mode === 'result');
}

// ============================================================
// Render: Intro Screen
// ============================================================
function renderIntro() {
    var main = document.getElementById('quizMain');
    setQuizMainMode('default');
    main.innerHTML =
        '<div class="q-intro fade-in visible">' +
            '<div class="q-intro-badge">2 分鐘 AI 診斷</div>' +
            '<h1 class="q-intro-title">你嘅 AI 能力<br>去到邊？</h1>' +
            '<p class="q-intro-sub">5 條情境題，幫你搵出真正嘅瓶頸<br>同最適合你嘅下一步。</p>' +
            '<div class="q-intro-points">' +
                '<div class="q-intro-point"><span class="q-intro-point-icon">🎯</span><div><strong>診斷你嘅 AI 成熟度</strong><br><span>唔係考試，係幫你認清自己</span></div></div>' +
                '<div class="q-intro-point"><span class="q-intro-point-icon">💡</span><div><strong>即場俾你一個可以做嘅行動</strong><br><span>唔使等，今日就用得著</span></div></div>' +
                '<div class="q-intro-point"><span class="q-intro-point-icon">🗺️</span><div><strong>推薦最適合你嘅學習路線</strong><br><span>唔再盲目揀課程</span></div></div>' +
            '</div>' +
            '<button class="q-btn-primary" onclick="startQuizFlow()">開始診斷</button>' +
            '<p class="q-intro-note">免費 · 不需登入 · 結果即時顯示</p>' +
        '</div>';
    hideProgress();
}

// ============================================================
// Start Quiz
// ============================================================
function startQuizFlow() {
    _quizState.currentQ = 0;
    _quizState.answers = [];
    showProgress();
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// Render: Question
// ============================================================
function renderQuestion() {
    var q = QUIZ_QUESTIONS[_quizState.currentQ];
    var total = QUIZ_QUESTIONS.length;
    var num = _quizState.currentQ + 1;
    var prevAnswer = _quizState.answers[_quizState.currentQ];
    updateProgress(num, total);

    var main = document.getElementById('quizMain');
    setQuizMainMode('default');
    var optionsHtml = '';
    for (var i = 0; i < q.options.length; i++) {
        var opt = q.options[i];
        var isSelected = (prevAnswer != null && prevAnswer === i);
        optionsHtml += '<button class="q-option' + (isSelected ? ' selected' : '') + '" data-idx="' + i + '" onclick="selectOption(this, ' + i + ')">' +
            '<span class="q-option-letter">' + String.fromCharCode(65 + i) + '</span>' +
            '<span class="q-option-text">' + escH(opt.text) + '</span>' +
        '</button>';
    }

    main.innerHTML =
        '<div class="q-card fade-in visible">' +
            '<div class="q-card-num">第 ' + num + ' / ' + total + ' 題</div>' +
            '<h2 class="q-card-title">' + escH(q.title) + '</h2>' +
            '<p class="q-card-sub">' + escH(q.subtitle) + '</p>' +
            '<div class="q-options">' + optionsHtml + '</div>' +
            (num > 1 ? '<button class="q-btn-back" onclick="prevQuestion()">← 上一題</button>' : '') +
        '</div>';
}

function selectOption(btn, idx) {
    var allBtns = btn.parentElement.querySelectorAll('.q-option');
    for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('selected');
    btn.classList.add('selected');

    _quizState.answers[_quizState.currentQ] = idx;

    setTimeout(function() {
        if (_quizState.currentQ < QUIZ_QUESTIONS.length - 1) {
            _quizState.currentQ++;
            renderQuestion();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            computeProfile();
            renderLeadCapture();
        }
    }, 500);
}

function prevQuestion() {
    if (_quizState.currentQ > 0) {
        _quizState.currentQ--;
        renderQuestion();
    }
}

// ============================================================
// Compute Profile
// ============================================================
function computeProfile() {
    var totals = _emptyAxisScores();
    for (var i = 0; i < _quizState.answers.length; i++) {
        var q = QUIZ_QUESTIONS[i];
        var chosen = _quizState.answers[i];
        if (chosen === undefined || chosen === null || !q || !q.options || !q.options[chosen]) continue;
        var optionScores = q.options[chosen].scores || {};
        AXES.forEach(function(axis) {
            totals[axis.key] += optionScores[axis.key] || 0;
        });
    }

    var normalized = _emptyAxisScores();
    var normalizedSum = 0;
    AXES.forEach(function(axis) {
        var max = MAX_SCORES[axis.key] || 1;
        normalized[axis.key] = Math.round((totals[axis.key] / max) * 100);
        normalizedSum += normalized[axis.key];
    });

    var avgScore = Math.round(normalizedSum / AXES.length);
    var level = 1;
    var archetype = 'observer';
    if (avgScore <= 25) {
        level = 1;
        archetype = 'observer';
    } else if (avgScore <= 40) {
        level = 2;
        archetype = 'dabbler';
    } else if (avgScore <= 60) {
        level = 3;
        archetype = 'tooluser';
    } else if (avgScore <= 80) {
        level = 4;
        archetype = 'semi-auto';
    } else {
        level = 5;
        archetype = 'native';
    }

    var painQuestion = QUIZ_QUESTIONS[3];
    var desireQuestion = QUIZ_QUESTIONS[4];
    var painOption = painQuestion && painQuestion.options ? painQuestion.options[_quizState.answers[3]] : null;
    var desireOption = desireQuestion && desireQuestion.options ? desireQuestion.options[_quizState.answers[4]] : null;
    var painTag = painOption && painOption.painTag ? painOption.painTag : '';
    var desireTag = desireOption && desireOption.desireTag ? desireOption.desireTag : '';

    var lowestAxis = AXES[0].key;
    var highestAxis = AXES[0].key;
    AXES.forEach(function(axis) {
        if (normalized[axis.key] < normalized[lowestAxis]) lowestAxis = axis.key;
        if (normalized[axis.key] > normalized[highestAxis]) highestAxis = axis.key;
    });

    var recommendedProduct = 'starter';
    if (level <= 2) {
        recommendedProduct = 'starter';
    } else if (lowestAxis === 'visual') {
        recommendedProduct = 'visual';
    } else if (lowestAxis === 'automation') {
        recommendedProduct = 'bootcamp';
    } else if (level >= 4 && lowestAxis === 'action') {
        recommendedProduct = 'community';
    } else if (level >= 4 && (lowestAxis === 'communication' || lowestAxis === 'efficiency')) {
        recommendedProduct = 'community';
    } else if (level === 5) {
        recommendedProduct = 'pro';
    } else if (level === 3 && lowestAxis === 'communication') {
        recommendedProduct = 'starter';
    } else {
        recommendedProduct = 'bootcamp';
    }

    _quizState.profile = Object.assign({ key: archetype }, PROFILES[archetype]);
    _quizState.activeAxisKey = lowestAxis;
    _quizState.scores = {
        avgScore: avgScore,
        level: level,
        painTag: painTag,
        desireTag: desireTag,
        recommendedProduct: recommendedProduct,
        axisTotals: totals,
        axisNormalized: normalized,
        lowestAxis: lowestAxis,
        highestAxis: highestAxis
    };
}

// ============================================================
// Render: Lead Capture Gate
// ============================================================
function renderLeadCapture() {
    hideProgress();
    var p = _quizState.profile;
    var main = document.getElementById('quizMain');
    setQuizMainMode('default');
    main.innerHTML =
        '<div class="q-gate fade-in visible">' +
            '<div class="q-gate-icon">' + p.emoji + '</div>' +
            '<h2 class="q-gate-title">你嘅 AI 診斷結果已經準備好</h2>' +
            '<div class="q-gate-preview">' +
                '<div class="q-gate-blur">' +
                    '<div class="q-gate-profile-name" style="color:' + p.color + ';">' + escH(p.name) + '</div>' +
                    '<div class="q-gate-profile-sub">' + escH(p.levelLabel) + '</div>' +
                '</div>' +
            '</div>' +
            '<p class="q-gate-desc">輸入你嘅資料，即刻解鎖個人化診斷報告<br>（包括即場可用嘅行動建議）</p>' +
            '<form class="q-gate-form" onsubmit="return submitLead(event)">' +
                '<input type="text" id="leadName" class="q-input" placeholder="你嘅名字" required>' +
                '<div class="q-contact-toggle">' +
                    '<button type="button" class="q-toggle-btn active" id="togglePhone" onclick="switchContactMode(\'phone\')">📱 電話號碼</button>' +
                    '<button type="button" class="q-toggle-btn" id="toggleEmail" onclick="switchContactMode(\'email\')">✉️ Email</button>' +
                '</div>' +
                '<div id="contactPhoneWrap" class="q-phone-row">' +
                    '<select id="leadCountryCode" class="q-country-select">' +
                        '<option value="+852" selected>🇭🇰 +852</option>' +
                        '<option value="+86">🇨🇳 +86</option>' +
                        '<option value="+886">🇹🇼 +886</option>' +
                        '<option value="+853">🇲🇴 +853</option>' +
                        '<option value="+65">🇸🇬 +65</option>' +
                        '<option value="+60">🇲🇾 +60</option>' +
                        '<option value="+81">🇯🇵 +81</option>' +
                        '<option value="+82">🇰🇷 +82</option>' +
                        '<option value="+44">🇬🇧 +44</option>' +
                        '<option value="+1">🇺🇸 +1</option>' +
                        '<option value="+61">🇦🇺 +61</option>' +
                        '<option value="+64">🇳🇿 +64</option>' +
                    '</select>' +
                    '<input type="tel" id="leadPhone" class="q-input q-phone-input" placeholder="電話號碼" pattern="[0-9]{6,15}" inputmode="numeric">' +
                '</div>' +
                '<div id="contactEmailWrap" class="q-email-row" style="display:none;">' +
                    '<input type="email" id="leadEmail" class="q-input" placeholder="your@email.com">' +
                '</div>' +
                '<div id="leadError" class="q-lead-error"></div>' +
                '<button type="submit" class="q-btn-primary" style="width:100%;">解鎖我嘅診斷報告</button>' +
            '</form>' +
            '<p class="q-gate-privacy">🔒 我哋唔會 spam 你，資料只用於跟進學習建議</p>' +
        '</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

var _contactMode = 'phone';

function switchContactMode(mode) {
    _contactMode = mode;
    var phoneWrap = document.getElementById('contactPhoneWrap');
    var emailWrap = document.getElementById('contactEmailWrap');
    var btnPhone = document.getElementById('togglePhone');
    var btnEmail = document.getElementById('toggleEmail');
    var errEl = document.getElementById('leadError');
    if (errEl) errEl.textContent = '';
    if (mode === 'phone') {
        phoneWrap.style.display = '';
        emailWrap.style.display = 'none';
        btnPhone.classList.add('active');
        btnEmail.classList.remove('active');
    } else {
        phoneWrap.style.display = 'none';
        emailWrap.style.display = '';
        btnPhone.classList.remove('active');
        btnEmail.classList.add('active');
    }
}

function submitLead(e) {
    e.preventDefault();
    var name = document.getElementById('leadName').value.trim();
    var errEl = document.getElementById('leadError');
    if (errEl) errEl.textContent = '';

    if (!name) {
        if (errEl) errEl.textContent = '請輸入你嘅名字';
        return false;
    }

    var contact = '';
    var countryCode = '';
    var contactType = _contactMode;

    if (_contactMode === 'phone') {
        var code = document.getElementById('leadCountryCode').value;
        var phone = document.getElementById('leadPhone').value.trim().replace(/\s+/g, '');
        if (!phone || !/^[0-9]{6,15}$/.test(phone)) {
            if (errEl) errEl.textContent = '請輸入有效嘅電話號碼';
            return false;
        }
        countryCode = code.replace('+', '');
        contact = phone;
    } else {
        var email = document.getElementById('leadEmail').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (errEl) errEl.textContent = '請輸入有效嘅 Email 地址';
            return false;
        }
        contact = email;
    }

    _quizState.leadCaptured = true;

    var profileKey = _quizState.profile ? _quizState.profile.key : 'unknown';
    var profileNameCn = _quizState.profile ? _quizState.profile.name : '';
    var safeScores = _quizState.scores || _emptyQuizScores();
    var productMeta = PRODUCT_CTA[safeScores.recommendedProduct] || null;
    var productLabel = productMeta ? productMeta.label : '';
    var phoneValue = contactType === 'phone' ? ((countryCode ? '+' + countryCode + ' ' : '') + contact) : '';
    var emailValue = contactType === 'email' ? contact : '';
    var referrer = (typeof document !== 'undefined' && document.referrer) ? document.referrer : null;
    var utmSource = getURLParam('utm_source');
    var utmMedium = getURLParam('utm_medium');
    var utmCampaign = getURLParam('utm_campaign');
    var safeAnswers = [];
    for (var i = 0; i < QUIZ_QUESTIONS.length; i++) {
        safeAnswers.push(_quizState.answers[i] != null ? _quizState.answers[i] : -1);
    }

    // Save to Firestore
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
                profile: profileKey,
                profileName: profileNameCn,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                avgScore: safeScores.avgScore || 0,
                level: safeScores.level || 0,
                archetype: profileKey,
                axisTotals: safeScores.axisTotals || _emptyAxisScores(),
                axisNormalized: safeScores.axisNormalized || _emptyAxisScores(),
                lowestAxis: safeScores.lowestAxis || '',
                highestAxis: safeScores.highestAxis || '',
                painTag: safeScores.painTag || '',
                desireTag: safeScores.desireTag || '',
                recommendedProduct: safeScores.recommendedProduct || '',
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
                        profile: profileKey,
                        profileName: profileNameCn,
                        level: safeScores.level || 0,
                        avgScore: safeScores.avgScore || 0,
                        axisTotals: safeScores.axisTotals || _emptyAxisScores(),
                        axisNormalized: safeScores.axisNormalized || _emptyAxisScores(),
                        lowestAxis: safeScores.lowestAxis || '',
                        highestAxis: safeScores.highestAxis || '',
                        painTag: safeScores.painTag || '',
                        desireTag: safeScores.desireTag || '',
                        recommendedProduct: safeScores.recommendedProduct || '',
                        recommendedProductLabel: productLabel,
                        recommendedWorkshop: productLabel,
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
    } catch(err) {}

    // Also send to Google Sheets (same sheet as consultation/workshop, new tab)
    try {
        var sheetData = {
            name: name,
            countryCode: countryCode,
            contact: contact,
            contactType: contactType,
            phone: phoneValue,
            email: emailValue,
            profile: profileNameCn + ' (' + profileKey + ')',
            recommendedWorkshop: productLabel,
            recommendedProduct: safeScores.recommendedProduct || '',
            level: safeScores.level || 0,
            avgScore: safeScores.avgScore || 0,
            lowestAxis: safeScores.lowestAxis || '',
            highestAxis: safeScores.highestAxis || '',
            painTag: safeScores.painTag || '',
            desireTag: safeScores.desireTag || '',
            axisTotals: JSON.stringify(safeScores.axisTotals || _emptyAxisScores()),
            axisNormalized: JSON.stringify(safeScores.axisNormalized || _emptyAxisScores()),
            referrer: referrer,
            utm_source: utmSource || '',
            utm_medium: utmMedium || '',
            utm_campaign: utmCampaign || '',
            scores: 'Avg:' + (safeScores.avgScore || 0) + ' Level:' + (safeScores.level || 0) + ' Low:' + (safeScores.lowestAxis || '-') + ' High:' + (safeScores.highestAxis || '-') + ' Pain:' + (safeScores.painTag || '-') + ' Desire:' + (safeScores.desireTag || '-') + ' Product:' + (safeScores.recommendedProduct || '-'),
            timestamp: new Date().toISOString(),
            source: 'quiz-diagnostic',
            page: '2分鐘AI診斷'
        };
        fetch('https://script.google.com/macros/s/AKfycbxE8KP5ohNSbHIFOWxl-JoWgu9_my8N8ofkTEXaeU0b7QB6K-s3qx4KE-5bOz7Qj4_miQ/exec', {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sheetData)
        }).catch(function() {});
    } catch(err) {}

    renderResult();
    return false;
}

// ============================================================
// Render: Result Page
// ============================================================
var QUIZ_LEVEL_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#a855f7'];

function _quizHexToRgba(hex, alpha) {
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

function _quizLevelSegmentsHtml(level) {
    return QUIZ_LEVEL_COLORS.map(function(color, idx) {
        var filled = idx < level;
        return '<span class="q-level-segment" style="background:' + (filled ? color : 'rgba(148,163,184,0.18)') + ';border-color:' + _quizHexToRgba(color, filled ? 0.65 : 0.18) + ';"></span>';
    }).join('');
}

function _quizShareSegmentsHtml(level) {
    return QUIZ_LEVEL_COLORS.map(function(color, idx) {
        var filled = idx < level;
        return '<span style="flex:1;height:18px;border-radius:999px;background:' + (filled ? color : 'rgba(255,255,255,0.12)') + ';border:1px solid ' + _quizHexToRgba(color, filled ? 0.9 : 0.22) + ';display:block;"></span>';
    }).join('');
}

function _quizAxisMeta(key) {
    for (var i = 0; i < AXES.length; i++) {
        if (AXES[i].key === key) return AXES[i];
    }
    return AXES[0];
}

function _quizAxisRankCopy(key, scores) {
    if (!scores) return '能力現況';
    if (key === scores.lowestAxis && key === scores.highestAxis) return '目前整體相對平均';
    if (key === scores.lowestAxis) return '目前最值得加強';
    if (key === scores.highestAxis) return '目前最強項';
    return '能力現況';
}

function _quizRadarPoint(idx, pct, radius, cx, cy) {
    var angle = (-Math.PI / 2) + ((Math.PI * 2) / AXES.length) * idx;
    var dist = radius * ((pct || 0) / 100);
    return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist
    };
}

function _quizRadarTextAnchor(x, cx) {
    if (Math.abs(x - cx) < 12) return 'middle';
    return x < cx ? 'end' : 'start';
}

function _quizRadarPolygonPoints(values, radius, cx, cy) {
    return AXES.map(function(axis, idx) {
        var point = _quizRadarPoint(idx, values[axis.key] || 0, radius, cx, cy);
        return point.x.toFixed(2) + ',' + point.y.toFixed(2);
    }).join(' ');
}

function _quizAxisChipsHtml(normalized, activeKey) {
    normalized = normalized || _emptyAxisScores();
    activeKey = activeKey || AXES[0].key;
    return AXES.map(function(axis) {
        var value = normalized[axis.key] || 0;
        return '<button type="button" class="q-axis-chip' + (axis.key === activeKey ? ' is-active' : '') + '" data-axis-key="' + axis.key + '" data-axis-trigger="1">' +
            '<span class="q-axis-chip-emoji">' + axis.emoji + '</span>' +
            '<span class="q-axis-chip-copy"><strong>' + escH(axis.label) + '</strong><span>' + value + ' / 100</span></span>' +
        '</button>';
    }).join('');
}

function _quizRadarSvgHtml(normalized, color, activeKey) {
    normalized = normalized || _emptyAxisScores();
    activeKey = activeKey || AXES[0].key;
    var cx = 180;
    var cy = 148;
    var maxRadius = 104;
    var labelRadius = 144;
    var ringValues = [20, 40, 60, 80, 100];
    var ringHtml = ringValues.map(function(val) {
        return '<polygon class="q-radar-ring" points="' + _quizRadarPolygonPoints({
            communication: val,
            visual: val,
            efficiency: val,
            automation: val,
            awareness: val,
            action: val
        }, maxRadius, cx, cy) + '"></polygon>';
    }).join('');
    var maxPoints = AXES.map(function(axis, idx) { return _quizRadarPoint(idx, 100, maxRadius, cx, cy); });
    var spokesHtml = AXES.map(function(axis, idx) {
        return '<line class="q-radar-spoke" x1="' + cx + '" y1="' + cy + '" x2="' + maxPoints[idx].x.toFixed(2) + '" y2="' + maxPoints[idx].y.toFixed(2) + '"></line>';
    }).join('');
    var actualPoints = AXES.map(function(axis, idx) { return _quizRadarPoint(idx, normalized[axis.key] || 0, maxRadius, cx, cy); });
    var areaPoints = actualPoints.map(function(point) {
        return point.x.toFixed(2) + ',' + point.y.toFixed(2);
    }).join(' ');
    var labelsHtml = AXES.map(function(axis, idx) {
        var point = _quizRadarPoint(idx, 100, labelRadius, cx, cy);
        var anchor = _quizRadarTextAnchor(point.x, cx);
        var labelY = point.y + (idx === 0 ? -8 : idx === 3 ? 16 : 4);
        return '<g class="q-radar-label' + (axis.key === activeKey ? ' is-active' : '') + '" data-axis-key="' + axis.key + '" data-axis-trigger="1" transform="translate(' + point.x.toFixed(2) + ' ' + labelY.toFixed(2) + ')">' +
            '<text text-anchor="' + anchor + '" class="q-radar-label-emoji">' + axis.emoji + '</text>' +
            '<text y="16" text-anchor="' + anchor + '" class="q-radar-label-text">' + escH(axis.label) + '</text>' +
        '</g>';
    }).join('');
    var pointsHtml = AXES.map(function(axis, idx) {
        var point = actualPoints[idx];
        return '<circle class="q-radar-point' + (axis.key === activeKey ? ' is-active' : '') + '" data-axis-key="' + axis.key + '" cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="' + (axis.key === activeKey ? 6.5 : 5) + '"></circle>' +
            '<circle class="q-radar-hit" data-axis-key="' + axis.key + '" data-axis-trigger="1" cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="16"></circle>';
    }).join('');
    return '<svg class="q-radar-svg" viewBox="0 0 360 320" role="img" aria-label="AI 六維能力雷達圖">' +
        '<defs><filter id="qRadarGlow"><feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="' + color + '" flood-opacity="0.28"></feDropShadow></filter></defs>' +
        ringHtml +
        spokesHtml +
        '<polygon class="q-radar-area" points="' + areaPoints + '" style="fill:' + _quizHexToRgba(color, 0.24) + ';stroke:' + color + ';"></polygon>' +
        pointsHtml +
        labelsHtml +
        '</svg>';
}

function _quizDistanceLabel(level) {
    return '你距離 AI 原住民仲有 ' + Math.max(0, 5 - level) + ' 級';
}

function _quizLinkAttrs(url) {
    return /^https?:/i.test(String(url || '')) ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function downloadQuizShareCard() {
    var p = _quizState.profile;
    var scores = _quizState.scores || _emptyQuizScores();
    if (!p) return;
    if (typeof html2canvas !== 'function') {
        alert('分享功能載入中，請稍後再試。');
        return;
    }

    var btn = document.getElementById('shareResultBtn');
    var originalLabel = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = '製作分享圖中...';
    }

    var host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;z-index:-1;';
    host.innerHTML =
        '<div style="width:900px;padding:48px;background:linear-gradient(160deg,#0f172a 0%,#111827 48%,#1f2937 100%);color:#F8FAFC;border-radius:40px;font-family:\'Noto Sans TC\',sans-serif;box-shadow:0 32px 90px rgba(15,23,42,0.46);">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:32px;">' +
                '<div>' +
                    '<div style="font-size:18px;letter-spacing:0.18em;text-transform:uppercase;color:' + _quizHexToRgba(p.color, 0.92) + ';margin-bottom:12px;">AIFLOWTIME AI診斷</div>' +
                    '<div style="font-size:72px;line-height:1;margin-bottom:12px;">' + p.emoji + '</div>' +
                    '<div style="font-size:46px;font-weight:800;line-height:1.2;">' + escH(p.name) + '</div>' +
                    '<div style="font-size:24px;color:rgba(248,250,252,0.82);margin-top:10px;">' + escH(p.levelLabel) + ' · 平均 ' + (scores.avgScore || 0) + '/100</div>' +
                '</div>' +
                '<div style="padding:14px 18px;border-radius:999px;background:' + _quizHexToRgba(p.color, 0.16) + ';border:1px solid ' + _quizHexToRgba(p.color, 0.35) + ';font-size:18px;font-weight:700;color:#fff;">' + escH(_quizDistanceLabel(p.level)) + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:12px;margin-bottom:28px;">' + _quizShareSegmentsHtml(p.level) + '</div>' +
            '<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:28px;padding:28px;">' +
                '<div style="font-size:18px;color:' + _quizHexToRgba(p.color, 0.92) + ';font-weight:700;margin-bottom:12px;">你而家嘅狀態</div>' +
                '<div style="font-size:26px;line-height:1.7;color:#F8FAFC;">' + escH(p.diagnosis) + '</div>' +
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
        link.download = 'aiflowtime-ai-diagnostic-level-' + (p.level || 0) + '.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
    }).catch(function() {
        alert('生成分享圖失敗，請稍後再試。');
    }).finally(function() {
        if (host.parentNode) host.parentNode.removeChild(host);
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
    });
}

function setActiveQuizAxis(key) {
    var scores = _quizState.scores || _emptyQuizScores();
    var axisMeta = _quizAxisMeta(key);
    var root = document.getElementById('quizMain');
    if (!root || !axisMeta) return;
    _quizState.activeAxisKey = key;
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
    if (kicker) kicker.textContent = _quizAxisRankCopy(key, scores);
    if (title) title.textContent = axisMeta.emoji + ' ' + axisMeta.label;
    if (desc) desc.textContent = axisMeta.description;
    if (value) value.textContent = axisValue + ' / 100';
    if (bar) bar.style.width = axisValue + '%';
    if (raw) raw.textContent = '原始分數 ' + axisRaw + ' / ' + (MAX_SCORES[key] || 0);
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
    setActiveQuizAxis(_quizState.activeAxisKey || ((_quizState.scores || {}).lowestAxis) || AXES[0].key);
}

function renderResult() {
    var p = _quizState.profile;
    var main = document.getElementById('quizMain');
    var scores = _quizState.scores || _emptyQuizScores();
    var cta = PRODUCT_CTA[scores.recommendedProduct] || PRODUCT_CTA.starter;
    var lowestAxis = _quizAxisMeta(scores.lowestAxis);
    var highestAxis = _quizAxisMeta(scores.highestAxis);
    var activeAxis = _quizState.activeAxisKey || scores.lowestAxis || AXES[0].key;

    setQuizMainMode('result');
    main.innerHTML =
        '<div class="q-result fade-in visible">' +
            '<div class="q-result-hero">' +
                '<div class="q-result-emoji-wrap" style="--profile-color:' + p.color + ';--profile-glow:' + _quizHexToRgba(p.color, 0.38) + ';">' + p.emoji + '</div>' +
                '<div class="q-result-badge" style="background:' + p.color + ';">' +
                    '<div>' +
                        '<div class="q-result-badge-cn">' + escH(p.name) + '</div>' +
                        '<div class="q-result-badge-en">' + escH(p.levelLabel) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="q-level-meter">' + _quizLevelSegmentsHtml(p.level) + '</div>' +
                '<div class="q-level-distance">' + escH(_quizDistanceLabel(p.level)) + '</div>' +
            '</div>' +

            '<div class="q-result-section q-radar-section" style="--radar-color:' + p.color + ';--radar-glow:' + _quizHexToRgba(p.color, 0.16) + ';">' +
                '<div class="q-result-section-label">AI 六維能力地圖</div>' +
                '<div class="q-radar-layout">' +
                    '<div class="q-radar-visual">' + _quizRadarSvgHtml(scores.axisNormalized || _emptyAxisScores(), p.color, activeAxis) + '</div>' +
                    '<div class="q-radar-side">' +
                        '<div class="q-radar-score-pill">平均 AI 能力值 ' + (scores.avgScore || 0) + ' / 100</div>' +
                        '<div class="q-axis-detail">' +
                            '<div class="q-axis-detail-kicker" id="qAxisDetailKicker"></div>' +
                            '<div class="q-axis-detail-title" id="qAxisDetailTitle"></div>' +
                            '<div class="q-axis-detail-value" id="qAxisDetailValue"></div>' +
                            '<div class="q-axis-detail-bar"><span id="qAxisDetailBarFill"></span></div>' +
                            '<p id="qAxisDetailDesc"></p>' +
                            '<div class="q-axis-detail-raw" id="qAxisDetailRaw"></div>' +
                        '</div>' +
                        '<div class="q-axis-chip-grid">' + _quizAxisChipsHtml(scores.axisNormalized || _emptyAxisScores(), activeAxis) + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="q-result-section">' +
                '<div class="q-result-section-label">你而家嘅狀態</div>' +
                '<p>' + escH(p.diagnosis) + '</p>' +
            '</div>' +

            '<div class="q-result-badge" style="background:' + p.color + ';">' +
                '<span class="q-result-badge-icon">🎯</span>' +
                '<div style="text-align:left;">' +
                    '<div class="q-result-badge-cn">平均 AI 能力值 ' + (scores.avgScore || 0) + ' / 100</div>' +
                    '<div class="q-result-badge-en">最強：' + escH(highestAxis.label) + ' · 最低：' + escH(lowestAxis.label) + '</div>' +
                '</div>' +
            '</div>' +

            '<div class="q-result-section q-result-warning">' +
                '<div class="q-result-section-label">⚠️ 注意</div>' +
                '<p>' + escH(p.warning) + '</p>' +
            '</div>' +

            '<div class="q-result-section q-result-fix">' +
                '<div class="q-result-section-label">💡 你而家最應該做嘅一步</div>' +
                '<p>' + escH(p.action) + '</p>' +
            '</div>' +

            '<div class="q-result-section q-result-workshop">' +
                '<div class="q-result-section-label">推薦下一步</div>' +
                '<h3 class="q-result-ws-name">' + escH(cta.label) + '</h3>' +
                '<div class="q-result-cta-price">' + escH(cta.price) + '</div>' +
                '<a href="' + cta.url + '" class="q-btn-primary q-result-main-cta"' + _quizLinkAttrs(cta.url) + '>立即了解 →</a>' +
                '<button type="button" class="q-btn-secondary q-share-btn" id="shareResultBtn" onclick="downloadQuizShareCard()">分享你嘅AI等級</button>' +
                '<a href="/ai-beginner-workshop#workshops" class="q-result-all-link">想睇晒所有工作坊？ →</a>' +
            '</div>' +

            '<div class="q-result-actions">' +
                '<button class="q-btn-secondary" onclick="restartQuiz()">重新診斷</button>' +
            '</div>' +
        '</div>';

    bindQuizRadarInteractions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// Restart
// ============================================================
function restartQuiz() {
    initQuiz();
}

// ============================================================
// Progress Bar
// ============================================================
function showProgress() {
    document.getElementById('quizProgress').style.display = 'block';
}
function hideProgress() {
    document.getElementById('quizProgress').style.display = 'none';
}
function updateProgress(current, total) {
    var pct = Math.round((current / total) * 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressLabel').textContent = current + ' / ' + total;
}

// ============================================================
// Utility
// ============================================================
function getURLParam(name) {
    try {
        var params = new URLSearchParams((window.location && window.location.search) || '');
        return params.get(name);
    } catch (err) {
        return null;
    }
}

function escH(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ============================================================
// Boot
// ============================================================
document.addEventListener('DOMContentLoaded', initQuiz);
}
