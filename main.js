// AIFlowTime Main JavaScript
// 實現所有交互功能和動畫效果

function onReady(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

function initAll() {
    if (window.__aiflowtime_initialized) {
        console.log('Already initialized, skipping');
        return;
    }
    window.__aiflowtime_initialized = true;
    
    console.log('Initializing AIFlowTime...');
    
    // 初始化所有功能
    initIdentityCarousel();
    initScrollAnimations();
    initParallaxEffect();
    initCarousel();
    initSmoothScroll();
    initMobileMenu();
    initServicesShader();
    initTiltCards();
    initNavbarScroll();
    initHeroDotMatrix();
    initSkyToggle();
    initFlashlightEffect();
    initPortfolioHero();
    initGooeyTextMorphing();
    initBackgroundPaths();
    initOrbitingCircles();
    initAnimatedCardStack();
}

onReady(initAll);

// Fallback for Instagram/Facebook in-app browsers
setTimeout(() => {
    if (!window.__aiflowtime_initialized) {
        console.warn('⚠️ Fallback init triggered (IG/FB webview)');
        initAll();
    }
}, 800);

// ==================== 身份輪播功能 ====================
function initIdentityCarousel() {
    const identities = document.querySelectorAll('.identity-item');
    let currentIndex = 0;
    
    if (identities.length === 0) return;
    
    // 設置初始狀態
    identities[0].classList.add('active');
    
    // 每 1.2 秒切換一次
    setInterval(() => {
        // 隱藏當前
        identities[currentIndex].classList.remove('active');
        
        // 更新索引
        currentIndex = (currentIndex + 1) % identities.length;
        
        // 顯示下一個
        identities[currentIndex].classList.add('active');
    }, 1200);
}

// ==================== 滾動觸發動畫 ====================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('visible')) {
                entry.target.classList.add('visible');
                // Once visible, stop observing to prevent flickering
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all fade-in-up elements
    document.querySelectorAll('.fade-in-up').forEach((el, index) => {
        // Skip if already visible to prevent re-animation
        if (!el.classList.contains('visible')) {
            el.style.transitionDelay = `${index * 100}ms`;
            observer.observe(el);
        }
    });
    
    // Observe all sections for slide-in effect
    document.querySelectorAll('section').forEach(section => {
        if (!section.classList.contains('visible')) {
            observer.observe(section);
        }
    });
    
    // Observe all cards for staggered animation
    document.querySelectorAll('.tilt-card').forEach((card, index) => {
        if (!card.classList.contains('visible')) {
            card.style.transitionDelay = `${index * 100}ms`;
            observer.observe(card);
        }
    });
}

// ==================== 視差滾動效果 ====================
function initParallaxEffect() {
    const parallaxElements = document.querySelectorAll('.parallax-bg');
    
    if (parallaxElements.length === 0) return;
    
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5; // 視差係數 0.5x
        
        parallaxElements.forEach(element => {
            element.style.transform = `translateY(${rate}px)`;
        });
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

// ==================== Events Swiper Carousel ====================
function initCarousel() {
    // Check if swiper element exists
    const swiperEl = document.querySelector('.eventsSwiper');
    if (!swiperEl) {
        console.log('Swiper element not found');
        return;
    }
    
    // Wait for Swiper to be available
    if (typeof Swiper === 'undefined') {
        console.log('Waiting for Swiper to load...');
        setTimeout(initCarousel, 100);
        return;
    }
    
    try {
        // Initialize Swiper for events carousel
        // With CDN bundle, all modules are included
        const eventsSwiper = new Swiper('.eventsSwiper', {
            spaceBetween: 50,
            autoplay: {
                delay: 4000,
                disableOnInteraction: false,
            },
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            loop: true,
            slidesPerView: 'auto',
            coverflowEffect: {
                rotate: 0,
                stretch: 0,
                depth: 100,
                modifier: 2.5,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });
        
        console.log('Events Swiper initialized successfully');
    } catch (error) {
        console.error('Error initializing Swiper:', error);
    }
}

// Legacy function for compatibility (if needed elsewhere)
function goToSlide(index) {
    // This function is kept for compatibility but may not be used with Swiper
    console.log('goToSlide called:', index);
}

// ==================== 平滑滾動 ====================
function initSmoothScroll() {
    // 為所有內部連結添加平滑滾動
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                const offsetTop = target.offsetTop - 80; // 考慮導航欄高度
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 滾動到指定區塊（供按鈕調用）
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offsetTop = section.offsetTop - 80;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

// ==================== 手機選單 ====================
function initMobileMenu() {
    const mobileMenuButton = document.querySelector('.md\\:hidden button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            // 切換選單顯示狀態
            if (mobileMenu) {
                mobileMenu.classList.toggle('hidden');
            } else {
                // 如果沒有選單元素，創建一個
                createMobileMenu();
            }
        });
    }
}

// 創建手機選單
function createMobileMenu() {
    const nav = document.querySelector('nav');
    const menuHTML = `
        <div class="mobile-menu hidden md:hidden bg-white border-t border-gray-100">
            <div class="px-6 py-4 space-y-4">
                <a href="index.html#about" class="block text-gray-600 hover:text-blue-600 transition-colors">關於我們</a>
                <a href="index.html#services" class="block text-gray-600 hover:text-blue-600 transition-colors">服務</a>
                <a href="consultation.html" class="block text-blue-600 font-semibold">諮詢</a>
                <a href="index.html#contact" class="block text-gray-600 hover:text-blue-600 transition-colors">聯絡</a>
                <button class="btn-primary text-white px-6 py-2 rounded-lg font-medium w-full">
                    立即預約
                </button>
            </div>
        </div>
    `;
    nav.insertAdjacentHTML('afterend', menuHTML);
    
    // 綁定新選單的點擊事件
    document.querySelector('.mobile-menu').addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            document.querySelector('.mobile-menu').classList.add('hidden');
        }
    });
}

// ==================== 表單處理 ====================
function handleFormSubmit(formData) {
    // 這裡可以添加表單提交邏輯
    console.log('表單提交:', formData);
    
    // 模擬提交成功
    setTimeout(() => {
        alert('多謝查詢！我哋會盡快聯絡你。');
    }, 500);
}

// ==================== 性能優化 ====================
// 節流函數（用於 scroll 事件）
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 防抖函數（用於 resize 事件）
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// ==================== 工具函數 ====================

// 檢查元素是否在視口中
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// 獲取隨機顏色（用於測試）
function getRandomColor() {
    const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 格式化日期
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Asia/Hong_Kong'
    };
    return date.toLocaleDateString('zh-Hant-HK', options);
}

// ==================== 錯誤處理 ====================
window.addEventListener('error', function(e) {
    console.error('JavaScript 錯誤:', e.error);
});

// 處理 Promise 錯誤
window.addEventListener('unhandledrejection', function(e) {
    console.error('未處理的 Promise 錯誤:', e.reason);
});

// ==================== 無限網格背景效果 ====================
function initInfiniteGrid() {
    const container = document.getElementById('infiniteGridContainer');
    const highlightGrid = document.getElementById('highlightGrid');
    
    if (!container || !highlightGrid) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let isMouseMoving = false;
    
    // 追蹤滑鼠位置
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isMouseMoving = true;
        updateGridMask();
    });
    
    // 更新網格遮罩（flashlight 效果）
    function updateGridMask() {
        if (!isMouseMoving) return;
        
        // 創建徑向漸變遮罩，跟隨滑鼠位置
        const radius = window.innerWidth < 768 ? 200 : 300;
        const maskImage = `radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, black, transparent)`;
        
        highlightGrid.style.maskImage = maskImage;
        highlightGrid.style.webkitMaskImage = maskImage;
    }
    
    // 當滑鼠離開視窗時，淡出效果
    document.addEventListener('mouseleave', () => {
        isMouseMoving = false;
        highlightGrid.style.maskImage = 'radial-gradient(0px circle at 0px 0px, black, transparent)';
        highlightGrid.style.webkitMaskImage = 'radial-gradient(0px circle at 0px 0px, black, transparent)';
    });
    
    // 初始化：確保容器可以接收滑鼠事件（但內容不阻擋）
    container.style.pointerEvents = 'none';
    
    // 讓整個頁面可以觸發滑鼠追蹤
    document.body.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        updateGridMask();
    });
}

// ==================== 服務區塊 Shader 效果 ====================
function initServicesShader() {
    const canvas = document.getElementById('servicesShader');
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.warn('WebGL2 not supported, shader effect disabled');
        return;
    }
    
    const vertexShaderSource = `#version 300 es
precision highp float;
in vec4 position;
void main() {
    gl_Position = position;
}`;
    
    const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x, R.y)

float rnd(vec2 p) {
    p = fract(p * vec2(12.9898, 78.233));
    p += dot(p, p + 34.56);
    return fract(p.x * p.y);
}

float noise(in vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    float a = rnd(i), b = rnd(i + vec2(1.0, 0.0));
    float c = rnd(i + vec2(0.0, 1.0)), d = rnd(i + 1.0);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float t = 0.0, a = 1.0;
    mat2 m = mat2(1.0, -0.5, 0.2, 1.2);
    for (int i = 0; i < 5; i++) {
        t += a * noise(p);
        p *= 2.0 * m;
        a *= 0.5;
    }
    return t;
}

float clouds(vec2 p) {
    float d = 1.0, t = 0.0;
    for (float i = 0.0; i < 3.0; i++) {
        float a = d * fbm(i * 10.0 + p.x * 0.2 + 0.2 * (1.0 + i) * p.y + d + i * i + p);
        t = mix(t, d, a);
        d = a;
        p *= 2.0 / (i + 1.0);
    }
    return t;
}

void main() {
    vec2 uv = (FC - 0.5 * R) / MN;
    vec2 st = uv * vec2(2.0, 1.0);
    vec3 col = vec3(0.0);
    float bg = clouds(vec2(st.x + T * 0.5, -st.y));
    uv *= 1.0 - 0.3 * (sin(T * 0.2) * 0.5 + 0.5);
    
    for (float i = 1.0; i < 12.0; i++) {
        uv += 0.1 * cos(i * vec2(0.1 + 0.01 * i, 0.8) + i * i + T * 0.5 + 0.1 * uv.x);
        vec2 p = uv;
        float d = length(p);
        col += 0.00125 / d * (cos(sin(i) * vec3(1.0, 2.0, 3.0)) + 1.0);
        float b = noise(i + p + bg * 1.731);
        col += 0.002 * b / length(max(p, vec2(b * p.x * 0.02, p.y)));
        col = mix(col, vec3(bg * 0.25, bg * 0.137, bg * 0.05), d);
    }
    
    fragColor = vec4(col, 1.0);
}`;
    
    function compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    
    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        return program;
    }
    
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;
    
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;
    
    const vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    const resolutionLocation = gl.getUniformLocation(program, 'resolution');
    const timeLocation = gl.getUniformLocation(program, 'time');
    
    function resize() {
        const bannerContainer = canvas.parentElement;
        if (!bannerContainer) return;
        
        const rect = bannerContainer.getBoundingClientRect();
        const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
        const bannerHeight = 200; // Fixed banner height
        
        canvas.width = rect.width * dpr;
        canvas.height = bannerHeight * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = bannerHeight + 'px';
        
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    
    let startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const time = (now - startTime) * 0.001;
        
        gl.useProgram(program);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform1f(timeLocation, time);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(animate);
    }
    
    resize();
    animate();
    
    window.addEventListener('resize', resize);
}

// ==================== 3D Tilt Card Effects ====================
function initTiltCards() {
    const cards = document.querySelectorAll('[data-tilt-card]');
    const threshold = 12; // Adjust the threshold value to control the tilt effect
    
    cards.forEach((card) => {
        let tilt = { x: 0, y: 0 };
        
        const handleMove = (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            
            tilt.x = y * -threshold;
            tilt.y = x * threshold;
            
            card.style.transform = `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`;
        };
        
        const handleLeave = () => {
            tilt = { x: 0, y: 0 };
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
        };
        
        card.addEventListener('mousemove', handleMove);
        card.addEventListener('mouseleave', handleLeave);
    });
}



// ==================== Navigation Bar Scroll Effect ====================
function initNavbarScroll() {
    const nav = document.getElementById('mainNav');
    const navBrand = document.getElementById('navBrand');
    const navLinks = document.querySelectorAll('#mainNav a');
    const navButton = document.querySelector('#mainNav button.btn-interactive');
    
    if (!nav || !navBrand) return;
    
    function updateNavbar() {
        const scrollY = window.scrollY;
        const scrollThreshold = 50; // Start transition after 50px scroll
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        if (scrollY > scrollThreshold) {
            // Scrolled down - make transparent with white text
            if (isDarkMode) {
                nav.style.background = 'rgba(29, 31, 44, 0)';
                nav.style.borderBottomColor = 'rgba(55, 65, 81, 0)';
            } else {
                nav.style.background = 'rgba(255, 255, 255, 0)';
                nav.style.borderBottomColor = 'rgba(229, 231, 235, 0)';
            }
            navBrand.style.color = 'white';
            navLinks.forEach(link => {
                link.style.color = 'white';
            });
            // Make button text white too
            if (navButton) {
                const btnText = navButton.querySelector('.btn-text');
                const btnHoverContent = navButton.querySelector('.btn-hover-content');
                if (btnText) btnText.style.color = 'white';
                if (btnHoverContent) btnHoverContent.style.color = 'white';
            }
        } else {
            // At top - make solid with appropriate text color
            if (isDarkMode) {
                nav.style.background = 'rgba(29, 31, 44, 0.9)';
                nav.style.borderBottomColor = 'rgba(55, 65, 81, 0.5)';
                navBrand.style.color = '#ffffff';
                navLinks.forEach(link => {
                    link.style.color = '#ffffff';
                });
            } else {
                nav.style.background = 'rgba(255, 255, 255, 0.95)';
                nav.style.borderBottomColor = 'rgba(229, 231, 235, 0.8)';
                navBrand.style.color = '#1F2937';
                navLinks.forEach(link => {
                    link.style.color = '#4B5563'; // gray-600
                });
            }
            // Reset button text color
            if (navButton) {
                const btnText = navButton.querySelector('.btn-text');
                const btnHoverContent = navButton.querySelector('.btn-hover-content');
                if (btnText) btnText.style.color = '';
                if (btnHoverContent) btnHoverContent.style.color = '';
            }
        }
    }
    
    // Initial state
    updateNavbar();
    
    // Update on scroll
    window.addEventListener('scroll', updateNavbar, { passive: true });
    
    // Update when theme changes
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', updateNavbar);
    }
}

// ==================== Email Modal ====================
function openEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        // Focus on email input
        setTimeout(() => {
            const emailInput = document.getElementById('emailInput');
            if (emailInput) emailInput.focus();
        }, 100);
    }
}

function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Reset checkbox and disable button when modal closes
        const consentCheckbox = document.getElementById('consentCheckbox');
        const submitButton = document.getElementById('emailModalSubmit');
        if (consentCheckbox) {
            consentCheckbox.checked = false;
        }
        if (submitButton) {
            submitButton.disabled = true;
        }
    }
}

function closeEmailModalOnOverlay(event) {
    if (event.target.id === 'emailModal') {
        closeEmailModal();
    }
}

function handleEmailSubmit(event) {
    event.preventDefault();
    const nameInput = document.getElementById('nameInput');
    const whatsappInput = document.getElementById('whatsappInput');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const name = nameInput.value.trim();
    let whatsapp = whatsappInput.value.trim().replace(/\s+/g, '');
    
    // Validate WhatsApp number is exactly 8 digits
    if (!/^[0-9]{8}$/.test(whatsapp)) {
        alert('請輸入8位數字WhatsApp號碼');
        whatsappInput.focus();
        return;
    }
    
    if (name && whatsapp && consentCheckbox.checked) {
        // Send data to Google Sheets for Lead Magnet (Free AI Guide)
        const formData = {
            name: name,
            whatsapp: whatsapp,
            timestamp: new Date().toISOString(),
            source: 'home-page-lead-magnet',
            page: '領取免費2026年AI指南'
        };
        
        console.log('Submitting lead magnet form:', formData);
        
        // Lead Magnet Google Script URL (same as linktree)
        const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwcEjkz6roPWxKFyap-Jdn-q87F3Y7tOmhbLWH3HHgywuKsWP9z8oAaupjEhJLrPQDiew/exec';
        
        console.log('Sending POST request to:', googleScriptURL);
        
        fetch(googleScriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        }).then(() => {
            console.log('✅ Form submission sent successfully');
        }).catch((error) => {
            console.error('❌ Error submitting form:', error);
        });
        
        // Also save to localStorage as backup
        const submissions = JSON.parse(localStorage.getItem('aiflowtime_submissions') || '[]');
        submissions.push(formData);
        localStorage.setItem('aiflowtime_submissions', JSON.stringify(submissions));
        
        console.log('Form submitted:', formData);
        
        // Close modal and reset form
        closeEmailModal();
        nameInput.value = '';
        whatsappInput.value = '';
        consentCheckbox.checked = false;
        updateSubmitButtonState();
        
        // Redirect to the guide page
        window.location.href = 'ai-guide-2026.html';
    }
}

// Function to update submit button state based on checkbox and WhatsApp validation
function updateSubmitButtonState() {
    const nameInput = document.getElementById('nameInput');
    const whatsappInput = document.getElementById('whatsappInput');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const submitButton = document.getElementById('emailModalSubmit');
    
    if (nameInput && whatsappInput && consentCheckbox && submitButton) {
        const whatsappNumber = whatsappInput.value.trim().replace(/\s+/g, '');
        const isValid = nameInput.value.trim().length >= 2 && 
                       /^[0-9]{8}$/.test(whatsappNumber) && 
                       consentCheckbox.checked;
        submitButton.disabled = !isValid;
    }
}

// Initialize checkbox and input listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('nameInput');
    const whatsappInput = document.getElementById('whatsappInput');
    const consentCheckbox = document.getElementById('consentCheckbox');
    
    if (nameInput) {
        nameInput.addEventListener('input', updateSubmitButtonState);
    }
    if (whatsappInput) {
        whatsappInput.addEventListener('input', updateSubmitButtonState);
    }
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', updateSubmitButtonState);
    }
    
    // Also check when modal opens to ensure button is disabled initially
    const emailModal = document.getElementById('emailModal');
    if (emailModal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (emailModal.classList.contains('active')) {
                        // Modal opened, ensure checkbox is unchecked and button is disabled
                        const checkbox = document.getElementById('consentCheckbox');
                        const button = document.getElementById('emailModalSubmit');
                        if (checkbox && button) {
                            checkbox.checked = false;
                            button.disabled = true;
                        }
                    }
                }
            });
        });
        observer.observe(emailModal, { attributes: true });
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeEmailModal();
    }
});

// ==================== Hero Dot Matrix Background ====================
function initHeroDotMatrix() {
    const canvas = document.getElementById('heroDotMatrix');
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
        console.warn('WebGL not supported, skipping dot matrix animation');
        return;
    }
    
    // Set canvas size
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Vertex shader
    const vertexShaderSource = `
        precision mediump float;
        attribute vec2 a_position;
        uniform vec2 u_resolution;
        varying vec2 v_fragCoord;
        
        void main() {
            vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            v_fragCoord = a_position;
        }
    `;
    
    // Fragment shader (based on the React component's shader)
    // Using WebGL1 compatible code without dynamic array indexing
    const fragmentShaderSource = `
        precision mediump float;
        
        uniform float u_time;
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        
        varying vec2 v_fragCoord;
        
        float PHI = 1.61803398874989484820459;
        
        float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }
        
        float getOpacity(float rand) {
            // Map random value to opacity levels - scaled to 30% max
            if (rand < 0.1) return 0.09;
            else if (rand < 0.2) return 0.09;
            else if (rand < 0.3) return 0.09;
            else if (rand < 0.4) return 0.15;
            else if (rand < 0.5) return 0.15;
            else if (rand < 0.6) return 0.15;
            else if (rand < 0.7) return 0.24;
            else if (rand < 0.8) return 0.24;
            else if (rand < 0.9) return 0.24;
            else return 0.3;
        }
        
        vec3 getColor(float offset) {
            // Always use white color
            return vec3(1.0, 1.0, 1.0);
        }
        
        void main() {
            vec2 st = v_fragCoord.xy;
            
            // Center the grid
            st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
            st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));
            
            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);
            
            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
            
            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= getOpacity(rand);
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
            
            vec3 color = getColor(show_offset);
            
            // Animation timing - show dots immediately, then animate
            float animation_speed_factor = 0.3;
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);
            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
            
            // Intro animation (dots appear from center)
            float timeFactor = u_time * animation_speed_factor;
            
            // Make dots visible immediately (skip animation for now to debug)
            // After 3 seconds, all dots should be visible
            if (u_time > 3.0) {
                opacity *= 1.0; // Always visible after 3 seconds
            } else {
                // Show dots gradually from center
                float visibility = step(timing_offset_intro, timeFactor);
                opacity *= visibility;
            }
            
            gl_FragColor = vec4(color, opacity);
            gl_FragColor.rgb *= gl_FragColor.a;
        }
    `;
    
    // Compile shader
    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    
    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;
    
    // Create program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);
    
    // Store program reference for resize handler
    const programRef = program;
    
    // Set up geometry (full screen quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        0, 0,
        canvas.width, 0,
        0, canvas.height,
        canvas.width, canvas.height,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Set uniforms
    const uniforms = {
        u_time: gl.getUniformLocation(program, 'u_time'),
        u_total_size: gl.getUniformLocation(program, 'u_total_size'),
        u_dot_size: gl.getUniformLocation(program, 'u_dot_size'),
        u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    };
    
    // Set uniform values - make dots larger and more visible
    gl.uniform1f(uniforms.u_total_size, 25);
    gl.uniform1f(uniforms.u_dot_size, 4);
    gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
    
    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    
    // Animation loop
    let startTime = Date.now();
    function animate() {
        const currentTime = (Date.now() - startTime) / 1000;
        gl.uniform1f(uniforms.u_time, currentTime);
        
        // Clear with transparent background
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Draw the pattern
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(animate);
    }
    
    // Start animation after a short delay to ensure canvas is ready
    setTimeout(() => {
        animate();
        console.log('Dot matrix animation started');
    }, 100);
}

// ==================== Sky Toggle (Day/Night Mode) ====================
function initSkyToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');
    const body = document.body;
    const dayGrid = document.getElementById('dayGrid');
    const nightGrid = document.getElementById('nightGrid');
    const nav = document.getElementById('mainNav');
    const navBrand = document.getElementById('navBrand');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Load saved theme preference, default to dark mode
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === null ? true : savedTheme === 'dark'; // Default to dark mode
    
    // Sync both toggles
    function syncToggles(isDarkMode) {
        if (themeToggle) themeToggle.checked = isDarkMode;
        if (themeToggleMobile) themeToggleMobile.checked = isDarkMode;
    }
    
    syncToggles(isDark);
    updateTheme(isDark);
    
    function handleToggleChange(isDarkMode) {
        updateTheme(isDarkMode);
        syncToggles(isDarkMode);
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            handleToggleChange(this.checked);
        });
    }
    
    if (themeToggleMobile) {
        themeToggleMobile.addEventListener('change', function() {
            handleToggleChange(this.checked);
        });
    }
    
    function updateTheme(isDarkMode) {
        const dayLogo = document.getElementById('dayLogo');
        const nightLogo = document.getElementById('nightLogo');
        
        if (isDarkMode) {
            body.classList.add('dark-mode');
            dayGrid.classList.add('hidden');
            nightGrid.classList.remove('hidden');
            
            // Switch to night logo
            if (dayLogo) dayLogo.style.display = 'none';
            if (nightLogo) nightLogo.style.display = 'block';
            
            // Update nav colors for dark mode
            if (nav) {
                nav.style.background = 'rgba(29, 31, 44, 0.9)';
                nav.style.borderBottomColor = 'rgba(55, 65, 81, 0.5)';
            }
            if (navBrand) navBrand.style.color = '#ffffff';
            navLinks.forEach(link => {
                link.style.color = '#ffffff';
            });
        } else {
            body.classList.remove('dark-mode');
            dayGrid.classList.remove('hidden');
            nightGrid.classList.add('hidden');
            
            // Switch to day logo
            if (dayLogo) dayLogo.style.display = 'block';
            if (nightLogo) nightLogo.style.display = 'none';
            
            // Update nav colors for light mode
            if (nav) {
                nav.style.background = 'rgba(255, 255, 255, 0.9)';
                nav.style.borderBottomColor = 'rgba(229, 231, 235, 0.5)';
            }
            if (navBrand) navBrand.style.color = '#1F2937';
            navLinks.forEach(link => {
                link.style.color = '#6B7280';
            });
        }
    }
}

// ==================== Flashlight Effect ====================
function initFlashlightEffect() {
    const flashlightOverlay = document.getElementById('flashlightOverlay');
    if (!flashlightOverlay) return;
    
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        if (flashlightOverlay) {
            flashlightOverlay.style.setProperty('--mouse-x', `${mouseX}px`);
            flashlightOverlay.style.setProperty('--mouse-y', `${mouseY}px`);
        }
    });
}

// ==================== Gooey Text Morphing ====================
function initGooeyTextMorphing() {
    const texts = ["Flow", "With", "AI"];
    const morphTime = 1; // seconds
    const cooldownTime = 0.25; // seconds
    
    const text1Ref = document.getElementById('gooeyText1');
    const text2Ref = document.getElementById('gooeyText2');
    
    if (!text1Ref || !text2Ref) {
        console.warn('Gooey text elements not found, skipping initialization.');
        return;
    }
    
    let textIndex = texts.length - 1;
    let time = new Date();
    let morph = 0;
    let cooldown = cooldownTime;
    
    const setMorph = (fraction) => {
        if (text1Ref && text2Ref) {
            text2Ref.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
            text2Ref.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
            
            fraction = 1 - fraction;
            
            text1Ref.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
            text1Ref.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
        }
    };
    
    const doCooldown = () => {
        morph = 0;
        if (text1Ref && text2Ref) {
            text2Ref.style.filter = "";
            text2Ref.style.opacity = "100%";
            text1Ref.style.filter = "";
            text1Ref.style.opacity = "0%";
        }
    };
    
    const doMorph = () => {
        morph -= cooldown;
        cooldown = 0;
        let fraction = morph / morphTime;
        
        if (fraction > 1) {
            cooldown = cooldownTime;
            fraction = 1;
        }
        
        setMorph(fraction);
    };
    
    function animate() {
        requestAnimationFrame(animate);
        
        const newTime = new Date();
        const shouldIncrementIndex = cooldown > 0;
        const dt = (newTime.getTime() - time.getTime()) / 1000;
        time = newTime;
        
        cooldown -= dt;
        
        if (cooldown <= 0) {
            if (shouldIncrementIndex) {
                textIndex = (textIndex + 1) % texts.length;
                
                if (text1Ref && text2Ref) {
                    text1Ref.textContent = texts[textIndex % texts.length];
                    text2Ref.textContent = texts[(textIndex + 1) % texts.length];
                }
            }
            
            doMorph();
        } else {
            doCooldown();
        }
    }
    
    // Initialize with first text
    if (text1Ref && text2Ref) {
        text1Ref.textContent = texts[textIndex % texts.length];
        text2Ref.textContent = texts[(textIndex + 1) % texts.length];
        text1Ref.style.opacity = "0%";
        text2Ref.style.opacity = "100%";
    }
    
    animate();
    
    console.log('Gooey text morphing initialized.');
}

// ==================== Portfolio Hero ====================
function initPortfolioHero() {
    const nameJacob = document.getElementById('portfolioNameJacob');
    const nameFung = document.getElementById('portfolioNameFung');
    
    if (!nameJacob || !nameFung) {
        console.warn('Portfolio hero elements not found, skipping initialization.');
        return;
    }
    
    // Blur text animation function
    function createBlurText(element, text, delay = 50, animateBy = 'words', direction = 'top') {
        const segments = animateBy === 'words' ? text.split(' ') : text.split('');
        element.innerHTML = '';
        
        segments.forEach((segment, i) => {
            const span = document.createElement('span');
            span.className = 'blur-text-segment';
            if (direction === 'bottom') {
                span.classList.add('direction-bottom');
            }
            span.textContent = segment + (animateBy === 'words' && i < segments.length - 1 ? '\u00A0' : '');
            element.appendChild(span);
            
            // Trigger animation when element is in view
            const observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        span.classList.add('visible');
                    }, i * delay);
                }
            }, { threshold: 0.1 });
            
            observer.observe(element);
        });
    }
    
    // Initialize blur text animations
    createBlurText(nameJacob, 'JACOB', 100, 'letters', 'top');
    createBlurText(nameFung, 'FUNG', 100, 'letters', 'top');
    
    console.log('Portfolio hero initialized.');
}

// ==================== Background Paths Effect ====================
function initBackgroundPaths() {
    const container = document.getElementById('serviceCardPaths');
    if (!container) {
        console.warn('Background paths container not found, skipping initialization.');
        return;
    }
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'background-paths-svg');
    svg.setAttribute('viewBox', '0 0 696 316');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    
    // Create two sets of paths with different positions
    for (let position of [1, -1]) {
        for (let i = 0; i < 36; i++) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const xOffset = 380 - i * 5 * position;
            const yOffset = 189 + i * 6;
            const xOffset2 = 312 - i * 5 * position;
            const yOffset2 = 216 - i * 6;
            const xOffset3 = 152 - i * 5 * position;
            const yOffset3 = 343 - i * 6;
            const xOffset4 = 616 - i * 5 * position;
            const yOffset4 = 470 - i * 6;
            const xOffset5 = 684 - i * 5 * position;
            const yOffset5 = 875 - i * 6;
            
            const d = `M-${xOffset} -${yOffset}C-${xOffset} -${yOffset} -${xOffset2} ${yOffset2} ${xOffset3} ${yOffset3}C${xOffset4} ${yOffset4} ${xOffset5} ${yOffset5} ${xOffset5} ${yOffset5}`;
            
            path.setAttribute('d', d);
            path.setAttribute('class', 'background-path');
            path.setAttribute('stroke-width', (0.5 + i * 0.03).toString());
            path.setAttribute('stroke-opacity', (0.1 + i * 0.03).toString());
            
            // Animate the path
            const duration = 20 + Math.random() * 10;
            // path.style.animation = `backgroundPathAnimation ${duration}s linear infinite`;
            path.style.opacity = '0.3';
            
            svg.appendChild(path);
        }
    }
    
    container.appendChild(svg);
    
    // Add CSS animation keyframes
    if (!document.getElementById('backgroundPathsStyle')) {
        const style = document.createElement('style');
        style.id = 'backgroundPathsStyle';
        style.textContent = `
            @keyframes backgroundPathAnimation {
                0% {
                    stroke-dasharray: 0, 1000;
                    opacity: 0.3;
                }
                50% {
                    opacity: 0.6;
                }
                100% {
                    stroke-dasharray: 1000, 0;
                    opacity: 0.3;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Disable animation to prevent flickering
    const paths = svg.querySelectorAll('.background-path');
    paths.forEach(path => {
        path.style.animation = 'none';
        path.style.opacity = '0.1';
    });
    
    console.log('Background paths initialized.');
}

// ==================== Orbiting Circles ====================
function initOrbitingCircles() {
    const container = document.getElementById('orbitingCirclesContainer');
    if (!container) return;
    
    // Create SVG for orbit paths
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pointer-events-none absolute inset-0 w-full h-full');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('version', '1.1');
    
    // Inner orbit path (radius 80px)
    const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerCircle.setAttribute('class', 'orbit-path');
    innerCircle.setAttribute('cx', '50%');
    innerCircle.setAttribute('cy', '50%');
    innerCircle.setAttribute('r', '80');
    svg.appendChild(innerCircle);
    
    // Outer orbit path (radius 140px)
    const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerCircle.setAttribute('class', 'orbit-path');
    outerCircle.setAttribute('cx', '50%');
    outerCircle.setAttribute('cy', '50%');
    outerCircle.setAttribute('r', '140');
    svg.appendChild(outerCircle);
    
    container.appendChild(svg);
    
    // AI Tool icons (simplified versions)
    const icons = [
        // Inner orbit - ChatGPT
        { size: 30, radius: 80, duration: 20, delay: 0, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.2"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' },
        // Inner orbit - Notion
        { size: 30, radius: 80, duration: 20, delay: 10, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" opacity="0.2"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>' },
        // Outer orbit - Google Drive
        { size: 40, radius: 140, duration: 20, delay: 0, reverse: true, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 4,20 8,20 16,4" opacity="0.2"/><path d="M19 18l-6-10-6 10h12zm-12 2l-3-5 9-15 9 15-3 5H7z"/></svg>' },
        // Outer orbit - GitHub
        { size: 40, radius: 140, duration: 20, delay: 10, reverse: true, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" opacity="0.2"/><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/></svg>' }
    ];
    
    icons.forEach(config => {
        const circle = document.createElement('div');
        circle.className = 'orbit-circle';
        circle.style.width = `${config.size}px`;
        circle.style.height = `${config.size}px`;
        circle.style.setProperty('--radius', `${config.radius}px`);
        circle.style.setProperty('--size', `${config.size}px`);
        circle.style.setProperty('--delay', config.delay);
        circle.style.animationDuration = `${config.duration}s`;
        
        if (config.reverse) {
            circle.style.animationDirection = 'reverse';
        }
        
        circle.innerHTML = config.icon;
        container.appendChild(circle);
    });
    
    console.log('Orbiting circles initialized.');
}

// ==================== 動畫卡片堆疊功能 (Native Scroll) ====================
function initAnimatedCardStack() {
    const cardStack = document.getElementById('animatedCardStack');
    
    if (!cardStack) {
        console.warn('Card stack not found');
        return;
    }
    
    console.log('Initializing native scroll card stack...');
    
    // Card data for AIFlowTime workshops
    const cardData = {
        1: {
            title: 'AI 省時入門工作坊',
            description: '從零開始建立你的第一條 AI 工作流',
            image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&auto=format&fit=crop&q=80'
        },
        2: {
            title: '斜槓族自動化系統班',
            description: '整合工具與客戶，建立穩定交付流程',
            image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&auto=format&fit=crop&q=80'
        },
        3: {
            title: '媽媽專用：碎片時間 AI 副業',
            description: '利用碎片時間建立會自己跑的副業系統',
            image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&auto=format&fit=crop&q=80'
        }
    };
    
    const INDEX_PIXELS = 200;
    const STACK_OFFSET = 60;
    const totalCards = 3;
    const cardElements = [];
    
    function createCardElement(contentType, index) {
        const data = cardData[contentType];
        const cardEl = document.createElement('div');
        cardEl.className = 'animated-card';
        cardEl.dataset.index = index;
        cardEl.dataset.contentType = contentType;
        
        cardEl.innerHTML = `
            <div class="animated-card-content">
                <div class="animated-card-image">
                    <img src="${data.image}" alt="${data.title}" draggable="false" />
                </div>
                <div class="animated-card-footer">
                    <div class="animated-card-info">
                        <div class="animated-card-title">${data.title}</div>
                        <div class="animated-card-description">${data.description}</div>
                    </div>
                    <button class="animated-card-button" onclick="window.location.href='consultation.html'">
                        了解更多
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
                            <path d="M9.5 18L15.5 12L9.5 6" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        return cardEl;
    }
    
    function interpolate(value, inputRange, outputRange) {
        const [inputMin, inputMax] = inputRange;
        const [outputMin, outputMax] = outputRange;
        
        if (value <= inputMin) return outputMin;
        if (value >= inputMax) return outputMax;
        
        const ratio = (value - inputMin) / (inputMax - inputMin);
        return outputMin + (outputMax - outputMin) * ratio;
    }
    
    function updateCards(scrollTop) {
        const currentIndex = scrollTop / INDEX_PIXELS;
        
        cardElements.forEach((cardEl, i) => {
            const normalizedIndex = ((i % totalCards) + totalCards) % totalCards;
            const normalizedCurrent = ((currentIndex % totalCards) + totalCards) % totalCards;
            
            let distance = normalizedIndex - normalizedCurrent;
            if (distance > totalCards / 2) distance -= totalCards;
            if (distance < -totalCards / 2) distance += totalCards;
            
            const clampedDistance = Math.max(-2, Math.min(2, distance));
            
            const scale = interpolate(Math.abs(clampedDistance), [0, 2], [1, 0.85]);
            const yOffset = clampedDistance * STACK_OFFSET;
            const zIndex = Math.max(0, 3 - Math.abs(clampedDistance));
            const opacity = interpolate(Math.abs(clampedDistance), [0, 1.5], [1, 0.3]);
            
            cardEl.style.transform = `translate(-50%, calc(-50% + ${yOffset}px)) scale(${scale})`;
            cardEl.style.opacity = opacity;
            cardEl.style.zIndex = Math.round(zIndex);
            
            const virtualIndex = Math.floor(currentIndex) + i;
            const newContentType = ((virtualIndex % totalCards) + totalCards) % totalCards + 1;
            if (parseInt(cardEl.dataset.contentType) !== newContentType) {
                cardEl.dataset.contentType = newContentType;
                const data = cardData[newContentType];
                cardEl.querySelector('.animated-card-title').textContent = data.title;
                cardEl.querySelector('.animated-card-description').textContent = data.description;
                cardEl.querySelector('.animated-card-image img').src = data.image;
            }
        });
    }
    
    // Create structure
    const viewport = document.createElement('div');
    viewport.className = 'animated-card-stack-viewport';
    
    const spacer = document.createElement('div');
    spacer.className = 'animated-card-stack-spacer';
    
    // Create cards
    for (let i = 0; i < 3; i++) {
        const contentType = ((i % totalCards) + 1);
        const cardEl = createCardElement(contentType, i);
        viewport.appendChild(cardEl);
        cardElements.push(cardEl);
    }
    
    cardStack.appendChild(viewport);
    cardStack.appendChild(spacer);
    
    // Set initial scroll position to middle
    cardStack.scrollTop = 750;
    
    // Use passive scroll listener for native iOS momentum
    let ticking = false;
    cardStack.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateCards(cardStack.scrollTop);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
    
    // Initial render
    updateCards(cardStack.scrollTop);
    
    console.log('✅ Native scroll card stack initialized');
}

// ==================== 導出函數供其他腳本使用 ====================
window.AIFlowTime = {
    scrollToSection,
    goToSlide,
    handleFormSubmit,
    isInViewport,
    formatDate,
    openEmailModal,
    closeEmailModal
};
