// ============================================================
// AIFlowTime — 2-Minute AI Diagnostic
// ============================================================

var QUIZ_QUESTIONS = [
    {
        id: 1,
        title: '你平時點樣用 AI？',
        subtitle: '揀最貼近你真實情況嘅選項',
        options: [
            { text: '聽過但基本上未用過', scores: { explorer: 3, dabbler: 0, repeater: 0, creator: 0 } },
            { text: '間中問下 ChatGPT，但成日覺得答案唔啱', scores: { explorer: 2, dabbler: 2, repeater: 0, creator: 0 } },
            { text: '日常都會用，但每次都要重新諗點問', scores: { explorer: 0, dabbler: 3, repeater: 1, creator: 0 } },
            { text: '已經有一套自己嘅用法，可以穩定出到嘢', scores: { explorer: 0, dabbler: 0, repeater: 2, creator: 2 } }
        ]
    },
    {
        id: 2,
        title: 'AI 俾你嘅結果，你通常要改幾多次？',
        subtitle: '回想你最近一次用 AI 做嘢嘅經驗',
        options: [
            { text: '改到唔想改，最後自己做算', scores: { explorer: 3, dabbler: 1, repeater: 0, creator: 0 } },
            { text: '通常要改 3-5 次先收貨', scores: { explorer: 1, dabbler: 3, repeater: 0, creator: 0 } },
            { text: '改 1-2 次就 OK，因為我知點問', scores: { explorer: 0, dabbler: 1, repeater: 2, creator: 1 } },
            { text: '好少需要改，我嘅 prompt 已經好穩定', scores: { explorer: 0, dabbler: 0, repeater: 2, creator: 2 } }
        ]
    },
    {
        id: 3,
        title: '你上星期花咗幾多時間做重複嘅嘢？',
        subtitle: '例如：覆訊息、搵檔案、填表、排版、整 IG post...',
        options: [
            { text: '唔太清楚，冇留意過', scores: { explorer: 2, dabbler: 1, repeater: 1, creator: 0 } },
            { text: '應該超過一半時間都係重複嘅', scores: { explorer: 0, dabbler: 1, repeater: 3, creator: 1 } },
            { text: '有啲重複，但我已經有方法處理部分', scores: { explorer: 0, dabbler: 0, repeater: 2, creator: 2 } },
            { text: '好少，大部分重複嘢已經自動化', scores: { explorer: 0, dabbler: 0, repeater: 0, creator: 2 } }
        ]
    },
    {
        id: 4,
        title: '你而家用緊幾多個 AI 工具？',
        subtitle: '包括 ChatGPT、Canva、Notion AI、Midjourney 等',
        options: [
            { text: '0-1 個，主要係 ChatGPT', scores: { explorer: 3, dabbler: 1, repeater: 0, creator: 0 } },
            { text: '2-3 個，但唔太確定邊個最適合自己', scores: { explorer: 1, dabbler: 3, repeater: 0, creator: 1 } },
            { text: '3-5 個，各有各用途', scores: { explorer: 0, dabbler: 1, repeater: 2, creator: 2 } },
            { text: '5 個以上，而且有啲已經互相連接', scores: { explorer: 0, dabbler: 0, repeater: 1, creator: 3 } }
        ]
    },
    {
        id: 5,
        title: '而家最困擾你嘅係咩？',
        subtitle: '揀一個最令你「嗯⋯⋯係喎」嘅選項',
        options: [
            { text: '資訊太多，唔知從何入手', scores: { explorer: 3, dabbler: 1, repeater: 0, creator: 0 } },
            { text: 'AI 出嘅嘢成日唔啱，浪費時間', scores: { explorer: 1, dabbler: 3, repeater: 0, creator: 0 } },
            { text: '日日都好忙但好似冇乜進展', scores: { explorer: 0, dabbler: 0, repeater: 3, creator: 1 } },
            { text: '想做靚啲嘅內容但冇時間／唔識', scores: { explorer: 0, dabbler: 0, repeater: 1, creator: 3 } },
            { text: '其實都 OK，想再進步多啲', scores: { explorer: 0, dabbler: 0, repeater: 1, creator: 1 } }
        ]
    },
    {
        id: 6,
        title: '當你搵到一個好方法做嘢，之後會點？',
        subtitle: '呢題反映你嘅系統化思維',
        options: [
            { text: '下次已經唔記得點做', scores: { explorer: 3, dabbler: 1, repeater: 0, creator: 0 } },
            { text: '會記住，但冇特別記錄落嚟', scores: { explorer: 1, dabbler: 3, repeater: 0, creator: 0 } },
            { text: '會寫低或者存起佢，之後可以再用', scores: { explorer: 0, dabbler: 1, repeater: 3, creator: 1 } },
            { text: '會整成模板或流程，確保每次都用到', scores: { explorer: 0, dabbler: 0, repeater: 1, creator: 3 } }
        ]
    },
    {
        id: 7,
        title: '如果有人教你每星期慳返 5 小時，你會？',
        subtitle: '最後一題！呢題反映你嘅行動力',
        options: [
            { text: '聽下先，未必會即刻行動', scores: { explorer: 2, dabbler: 1, repeater: 0, creator: 0 } },
            { text: '有興趣，但要睇下適唔適合自己', scores: { explorer: 1, dabbler: 2, repeater: 1, creator: 0 } },
            { text: '會認真考慮，如果有清晰步驟就會跟', scores: { explorer: 0, dabbler: 1, repeater: 2, creator: 1 } },
            { text: '即刻想知點做，我已經準備好', scores: { explorer: 0, dabbler: 0, repeater: 1, creator: 3 } }
        ]
    }
];

// ============================================================
// Profile Definitions
// ============================================================
var PROFILES = {
    explorer: {
        key: 'explorer',
        icon: '🌀',
        name: 'The Overwhelmed Explorer',
        nameCn: '資訊迷航者',
        color: '#6B7280',
        workshopId: 'workshop-0',
        workshopName: 'Workshop 0 — Change Your Mind',
        workshopLink: '/ai-beginner-workshop#workshops',
        diagnosis: '你對 AI 充滿好奇，也看過不少相關內容，但一直停留在「知道」卻「用不出來」的階段。每次打開 ChatGPT 都不太確定該怎麼問，結果不是答非所問，就是太空泛沒辦法用。',
        prediction: '如果繼續這樣下去，你會花越來越多時間看教學、存 Reels，但實際能力不會提升。資訊焦慮只會越來越重，而身邊的人已經開始用 AI 提升效率了。',
        immediateFix: '今天就試一件事：打開 ChatGPT，把你今天最頭痛的一件工作，用「我想要 ___，背景是 ___，請用 ___ 格式回答」這個結構問一次。你會發現，問得清楚，AI 就答得準。',
        workshopPitch: '這正是 Workshop 0 要解決的問題——不教工具，先教你「怎麼想、怎麼問」。90 分鐘後你會帶走一套屬於你的提問框架。'
    },
    dabbler: {
        key: 'dabbler',
        icon: '🔧',
        name: 'The Prompt Dabbler',
        nameCn: 'AI 試水者',
        color: '#D97757',
        workshopId: 'workshop-a',
        workshopName: 'Workshop A — AI 原住民養成班',
        workshopLink: '/ai-beginner-workshop#workshops',
        diagnosis: '你已經在用 AI，但成果時好時壞。有時候 ChatGPT 給你驚喜，有時候又完全不對路。你知道 AI 很強，但總覺得自己沒有「用對」，也不確定該用哪個工具做哪件事。',
        prediction: '如果繼續靠感覺用 AI，你的效率天花板會很快到頂。你會一直在「試 → 失敗 → 換工具 → 再試」的循環裡，花了時間卻沒有累積。',
        immediateFix: '今天就做一件事：把你最常用 AI 做的那件事，寫下你的 prompt，然後加上這三個元素——角色（你是 ___）、背景（我的情況是 ___）、格式（請用 ___ 方式回答）。馬上再試一次，感受差別。',
        workshopPitch: 'Workshop A 會幫你找到最適合你的 AI 工具組合，學會穩定出好結果的 prompt 結構，並在課堂上完成一件你真正需要做的事——不是示範，是你帶走的實際成果。'
    },
    repeater: {
        key: 'repeater',
        icon: '⏰',
        name: 'The Busy Repeater',
        nameCn: '時間困局者',
        color: '#2563EB',
        workshopId: 'workshop-b',
        workshopName: 'Workshop B — 時間回購術',
        workshopLink: '/ai-beginner-workshop#workshops',
        diagnosis: '你很努力，每天都在忙，但忙完回頭看，好像沒有真正推進什麼重要的事。你的時間被大量重複性的瑣事吃掉——覆訊息、排版、填表、找檔案⋯⋯你知道應該有更好的方法，但一直沒時間去想。',
        prediction: '如果繼續這樣，你會越來越累，但產出不會等比增加。你的競爭對手已經開始用 AI 自動化這些瑣事，而你還在用最原始的方式硬撐。差距會越拉越大。',
        immediateFix: '今天就做一件事：拿出紙筆，寫下你上星期做過最重複的 3 件事。然後問自己：「如果有個助手幫我做這件事，我只需要給他什麼指令？」這就是自動化的起點。',
        workshopPitch: 'Workshop B 會教你識別「時間吸血鬼」，把低價值任務交給 AI，並在課堂上親手打造一個明天就能用的 Workflow。目標：每週回購 5-10 小時。'
    },
    creator: {
        key: 'creator',
        icon: '🎨',
        name: 'The Visual Creator',
        nameCn: '視覺突破者',
        color: '#7C3AED',
        workshopId: 'workshop-c',
        workshopName: 'Workshop C — 下一級視覺',
        workshopLink: '/ai-beginner-workshop#workshops',
        diagnosis: '你已經有一定的 AI 基礎和系統思維，但在視覺內容上遇到瓶頸。你需要持續產出品牌一致的圖像和影片，但每次都花太多時間在設計、改稿、來回溝通上。',
        prediction: '如果繼續手動處理每一張圖、每一條片，你的內容產出速度會成為增長的最大瓶頸。在這個視覺為王的時代，產出慢就是落後。',
        immediateFix: '今天就試一件事：打開任何一個 AI 圖像工具（Canva AI、ChatGPT DALL-E），用「風格 + 主題 + 用途」的結構生成一張圖。例如：「簡約商務風格，主題是時間管理，用於 IG Story」。',
        workshopPitch: 'Workshop C 會教你用 AI 快速生成一致風格的品牌素材，從構思到成品一條龍完成，並帶走一套可持續複製的視覺輸出流程。'
    },
    advanced: {
        key: 'advanced',
        icon: '🚀',
        name: 'The Optimization Seeker',
        nameCn: '系統進化者',
        color: '#059669',
        workshopId: 'workshop-d',
        workshopName: 'Workshop D — AI × 自我突破',
        workshopLink: '/ai-beginner-workshop#workshops',
        diagnosis: '你已經走在大多數人前面了。你有穩定的 AI 使用習慣，也建立了一些系統。但你知道自己還可以更好——你想要的不只是效率，而是一套能持續進化的個人成長系統。',
        prediction: '你目前的瓶頸不是工具或技巧，而是方向和架構。如果沒有人幫你拉高視角，你可能會在現有水平上原地踏步，錯過真正的突破機會。',
        immediateFix: '今天就做一件事：打開 ChatGPT，問它「Based on my current situation [描述你的現狀], what are the 3 highest-leverage changes I could make in the next 30 days?」讓 AI 做你的外部大腦。',
        workshopPitch: 'Workshop D 用 AI 做自我整理、拆解卡點、制定行動路線。你會帶走一份 30 天可落地的行動計劃，不靠意志硬撐，靠系統推動改變。'
    },
    beginner: {
        key: 'beginner',
        icon: '📖',
        name: 'The Fresh Starter',
        nameCn: 'AI 新手村',
        color: '#9CA3AF',
        workshopId: null,
        workshopName: null,
        workshopLink: null,
        diagnosis: '你對 AI 還很陌生，可能連 ChatGPT 都還沒怎麼用過。這完全沒問題——每個人都是從零開始的。重要的是你已經踏出了第一步，做了這個診斷。',
        prediction: '好消息是：現在開始學 AI，你還來得及。壞消息是：如果再等下去，差距只會越來越大。AI 不會取代你，但會用 AI 的人會。',
        immediateFix: '今天就做一件事：打開 chat.openai.com，註冊一個免費帳號，然後問它「我是一個 [你的職業]，我想用 AI 幫我 [你最想解決的一件事]，請給我 3 個具體建議」。就這樣，你已經開始了。',
        workshopPitch: null
    }
};

// ============================================================
// State
// ============================================================
var _quizState = {
    currentQ: 0,
    answers: [],
    scores: { explorer: 0, dabbler: 0, repeater: 0, creator: 0 },
    profile: null,
    leadCaptured: false
};

// ============================================================
// Init
// ============================================================
function initQuiz() {
    _quizState = { currentQ: 0, answers: [], scores: { explorer: 0, dabbler: 0, repeater: 0, creator: 0 }, profile: null, leadCaptured: false };
    renderIntro();
}

// ============================================================
// Render: Intro Screen
// ============================================================
function renderIntro() {
    var main = document.getElementById('quizMain');
    main.innerHTML =
        '<div class="q-intro fade-in visible">' +
            '<div class="q-intro-badge">2 分鐘 AI 診斷</div>' +
            '<h1 class="q-intro-title">你嘅 AI 能力<br>去到邊？</h1>' +
            '<p class="q-intro-sub">7 條情境題，幫你搵出真正嘅瓶頸<br>同最適合你嘅下一步。</p>' +
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
    }, 350);
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
    var totals = { explorer: 0, dabbler: 0, repeater: 0, creator: 0 };
    for (var i = 0; i < _quizState.answers.length; i++) {
        var q = QUIZ_QUESTIONS[i];
        var chosen = _quizState.answers[i];
        if (chosen === undefined || chosen === null) continue;
        var scores = q.options[chosen].scores;
        for (var k in scores) {
            if (scores.hasOwnProperty(k)) totals[k] += scores[k];
        }
    }

    var maxKey = 'explorer';
    var maxVal = -1;
    var totalAll = 0;
    for (var k in totals) {
        if (totals.hasOwnProperty(k)) {
            totalAll += totals[k];
            if (totals[k] > maxVal) { maxVal = totals[k]; maxKey = k; }
        }
    }

    // Very low total = complete beginner
    if (totalAll <= 8) {
        _quizState.profile = PROFILES.beginner;
    }
    // High creator + high repeater = advanced
    else if (totals.creator >= 12 && totals.repeater >= 8) {
        _quizState.profile = PROFILES.advanced;
    }
    else {
        _quizState.profile = PROFILES[maxKey];
    }

    _quizState.scores = totals;
}

// ============================================================
// Render: Lead Capture Gate
// ============================================================
function renderLeadCapture() {
    hideProgress();
    var p = _quizState.profile;
    var main = document.getElementById('quizMain');
    main.innerHTML =
        '<div class="q-gate fade-in visible">' +
            '<div class="q-gate-icon">' + p.icon + '</div>' +
            '<h2 class="q-gate-title">你嘅 AI Profile 已經準備好</h2>' +
            '<div class="q-gate-preview">' +
                '<div class="q-gate-blur">' +
                    '<div class="q-gate-profile-name" style="color:' + p.color + ';">' + escH(p.nameCn) + '</div>' +
                    '<div class="q-gate-profile-sub">' + escH(p.name) + '</div>' +
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
    var profileNameCn = _quizState.profile ? _quizState.profile.nameCn : '';
    var safeScores = _quizState.scores || { explorer: 0, dabbler: 0, repeater: 0, creator: 0 };
    var safeAnswers = [];
    for (var i = 0; i < QUIZ_QUESTIONS.length; i++) {
        safeAnswers.push(_quizState.answers[i] != null ? _quizState.answers[i] : -1);
    }

    // Save to Firestore
    try {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            var db = firebase.firestore();
            db.collection('quizLeads').add({
                name: name,
                countryCode: countryCode,
                contact: contact,
                contactType: contactType,
                profile: profileKey,
                profileName: profileNameCn,
                scores: safeScores,
                answers: safeAnswers,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                source: window.location.href
            }).catch(function() {});
        }
    } catch(err) {}

    // Also send to Google Sheets (same sheet as consultation/workshop, new tab)
    try {
        var workshopRec = _quizState.profile && _quizState.profile.workshopName ? _quizState.profile.workshopName : 'Free PDF / N/A';
        var sheetData = {
            name: name,
            countryCode: countryCode,
            contact: contact,
            contactType: contactType,
            profile: profileNameCn + ' (' + profileKey + ')',
            recommendedWorkshop: workshopRec,
            scores: 'E:' + safeScores.explorer + ' D:' + safeScores.dabbler + ' R:' + safeScores.repeater + ' C:' + safeScores.creator,
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
function renderResult() {
    var p = _quizState.profile;
    var main = document.getElementById('quizMain');

    var workshopCta = '';
    if (p.workshopPitch && p.workshopLink) {
        workshopCta =
            '<div class="q-result-section q-result-workshop">' +
                '<div class="q-result-section-label">推薦學習路線</div>' +
                '<h3 class="q-result-ws-name">' + escH(p.workshopName) + '</h3>' +
                '<p>' + escH(p.workshopPitch) + '</p>' +
                '<a href="' + p.workshopLink + '" class="q-btn-primary" style="display:inline-block;margin-top:16px;text-decoration:none;">了解工作坊詳情 →</a>' +
            '</div>';
    }

    var pdfCta =
        '<div class="q-result-section q-result-pdf">' +
            '<div class="q-result-pdf-inner">' +
                '<span class="q-result-pdf-icon">📄</span>' +
                '<div>' +
                    '<strong>未準備好上課？</strong><br>' +
                    '<span>免費 AI 入門指南即將推出，留意我哋嘅通知！</span>' +
                '</div>' +
            '</div>' +
        '</div>';

    main.innerHTML =
        '<div class="q-result fade-in visible">' +
            '<div class="q-result-badge" style="background:' + p.color + ';">' +
                '<span class="q-result-badge-icon">' + p.icon + '</span>' +
                '<div>' +
                    '<div class="q-result-badge-cn">' + escH(p.nameCn) + '</div>' +
                    '<div class="q-result-badge-en">' + escH(p.name) + '</div>' +
                '</div>' +
            '</div>' +

            '<div class="q-result-section">' +
                '<div class="q-result-section-label">你嘅現狀</div>' +
                '<p>' + escH(p.diagnosis) + '</p>' +
            '</div>' +

            '<div class="q-result-section q-result-warning">' +
                '<div class="q-result-section-label">⚠️ 如果繼續這樣</div>' +
                '<p>' + escH(p.prediction) + '</p>' +
            '</div>' +

            '<div class="q-result-section q-result-fix">' +
                '<div class="q-result-section-label">💡 今日就可以做嘅一件事</div>' +
                '<p>' + escH(p.immediateFix) + '</p>' +
            '</div>' +

            workshopCta +
            pdfCta +

            '<div class="q-result-actions">' +
                '<button class="q-btn-secondary" onclick="restartQuiz()">重新診斷</button>' +
            '</div>' +
        '</div>';

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
