# Modern Landing Page Animation Techniques - Research Report
## For High-End Workshop Landing Page

---

## Executive Summary

This report analyzes modern animation techniques from industry-leading sites (Linear.app, Stripe.com, Raycast.com, Arc Browser) and provides implementation-ready code snippets for creating premium landing page experiences. All techniques are optimized for performance, accessibility, and mobile responsiveness.

---

## 1. CARD EFFECTS

### 1.1 3D Flip/Reveal Animations (Before/After Cards)

**Reference:** Linear.app feature cards, Stripe product showcases

```css
/* 3D Card Container */
.card-3d-container {
  perspective: 1000px;
  width: 300px;
  height: 400px;
}

.card-3d {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-3d-container:hover .card-3d {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-front {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.card-back {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  transform: rotateY(180deg);
}
```

**Before/After Comparison Card:**

```css
.before-after-card {
  position: relative;
  width: 400px;
  height: 300px;
  overflow: hidden;
  border-radius: 12px;
  cursor: pointer;
}

.before-after-card .before,
.before-after-card .after {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.before-after-card .after {
  opacity: 0;
  transform: scale(1.1);
}

.before-after-card:hover .before {
  opacity: 0;
  transform: scale(0.95);
}

.before-after-card:hover .after {
  opacity: 1;
  transform: scale(1);
}
```

### 1.2 Hover Lift Effects with Dynamic Shadows

**Reference:** Linear.app card interactions

```css
/* Premium Lift Effect */
.card-lift {
  background: white;
  border-radius: 16px;
  padding: 24px;
  transition: 
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 4px 8px rgba(0, 0, 0, 0.02),
    0 8px 16px rgba(0, 0, 0, 0.02);
  will-change: transform, box-shadow;
}

.card-lift:hover {
  transform: translateY(-8px);
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.04),
    0 8px 16px rgba(0, 0, 0, 0.04),
    0 16px 32px rgba(0, 0, 0, 0.04),
    0 32px 64px rgba(0, 0, 0, 0.04);
}

/* Subtle Scale Variant */
.card-scale {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-scale:hover {
  transform: scale(1.02);
}
```

### 1.3 Gradient Border Animations

**Reference:** Stripe.com interactive elements

```css
/* Animated Gradient Border using @property */
@property --angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.gradient-border-card {
  position: relative;
  padding: 3px;
  border-radius: 16px;
  background: #1a1a2e;
}

.gradient-border-card::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  background: conic-gradient(
    from var(--angle),
    #ff006e,
    #8338ec,
    #3a86ff,
    #06ffa5,
    #ffbe0b,
    #ff006e
  );
  z-index: -1;
  animation: rotate 4s linear infinite;
}

.gradient-border-card::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  background: conic-gradient(
    from var(--angle),
    #ff006e,
    #8338ec,
    #3a86ff,
    #06ffa5,
    #ffbe0b,
    #ff006e
  );
  z-index: -1;
  animation: rotate 4s linear infinite;
  filter: blur(12px);
  opacity: 0.5;
}

@keyframes rotate {
  to {
    --angle: 360deg;
  }
}

/* Inner Content */
.gradient-border-content {
  background: #1a1a2e;
  border-radius: 14px;
  padding: 24px;
  position: relative;
  z-index: 1;
}
```

**Fallback for browsers without @property support:**

```css
.gradient-border-fallback {
  position: relative;
  border-radius: 16px;
  padding: 2px;
  overflow: hidden;
}

.gradient-border-fallback::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    #ff006e,
    #8338ec,
    #3a86ff,
    #06ffa5,
    #ffbe0b,
    #ff006e
  );
  background-size: 400% 400%;
  animation: gradient-shift 3s ease infinite;
  z-index: -1;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### 1.4 Glassmorphism Effects

**Reference:** Arc Browser, modern SaaS landing pages

```css
/* Premium Glassmorphism Card */
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: 
    backdrop-filter 0.3s ease,
    background 0.3s ease,
    transform 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  transform: translateY(-4px);
}

/* Dark Variant */
.glass-card-dark {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
}

/* Gradient Glassmorphism */
.gradient-glass {
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(20px);
  border-radius: 24px;
  overflow: hidden;
}

.gradient-glass::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transition: left 0.5s ease;
}

.gradient-glass:hover::before {
  left: 100%;
}
```

---

## 2. SCROLL-TRIGGERED ANIMATIONS

### 2.1 Fade-Up Reveals with Stagger

**Reference:** Stripe.com section reveals, Linear.app content animations

**Using GSAP ScrollTrigger:**

```javascript
// GSAP ScrollTrigger Setup
gsap.registerPlugin(ScrollTrigger);

// Fade-up reveal with stagger for card grids
gsap.utils.toArray('.reveal-card').forEach((card, i) => {
  gsap.from(card, {
    scrollTrigger: {
      trigger: card,
      start: 'top 85%',
      end: 'top 50%',
      toggleActions: 'play none none reverse',
      // markers: true, // Debug only
    },
    y: 60,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: i * 0.1, // Stagger based on index
  });
});

// Batch animation for better performance
ScrollTrigger.batch('.reveal-batch', {
  onEnter: (elements) => {
    gsap.from(elements, {
      y: 50,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
    });
  },
  start: 'top 85%',
});
```

**CSS-only Alternative:**

```css
/* Intersection Observer based reveal */
.reveal-element {
  opacity: 0;
  transform: translateY(40px);
  transition: 
    opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.reveal-element.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger delays */
.reveal-element:nth-child(1) { transition-delay: 0s; }
.reveal-element:nth-child(2) { transition-delay: 0.1s; }
.reveal-element:nth-child(3) { transition-delay: 0.2s; }
.reveal-element:nth-child(4) { transition-delay: 0.3s; }
.reveal-element:nth-child(5) { transition-delay: 0.4s; }
.reveal-element:nth-child(6) { transition-delay: 0.5s; }
```

```javascript
// Intersection Observer for CSS reveals
const observerOptions = {
  root: null,
  rootMargin: '0px 0px -10% 0px',
  threshold: 0.1,
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target); // Only animate once
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal-element').forEach((el) => {
  revealObserver.observe(el);
});
```

### 2.2 Parallax Effects for Hero Section

**Reference:** Arc Browser hero, Stripe.com hero animations

```javascript
// GSAP Parallax Implementation
gsap.registerPlugin(ScrollTrigger);

// Hero parallax layers
const heroTl = gsap.timeline({
  scrollTrigger: {
    trigger: '.hero-section',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
  },
});

// Background layer (slowest)
heroTl.to('.hero-bg', {
  y: 200,
  ease: 'none',
}, 0);

// Middle layer
heroTl.to('.hero-mid', {
  y: 100,
  ease: 'none',
}, 0);

// Foreground content (fastest)
heroTl.to('.hero-content', {
  y: 50,
  opacity: 0,
  ease: 'none',
}, 0);

// Scale effect on scroll
heroTl.to('.hero-image', {
  scale: 1.1,
  ease: 'none',
}, 0);
```

**CSS-only Parallax (simpler, less control):**

```css
.parallax-container {
  perspective: 1px;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
}

.parallax-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.parallax-bg {
  transform: translateZ(-1px) scale(2);
}

.parallax-content {
  transform: translateZ(0);
}
```

### 2.3 Section Entrance Animations

```javascript
// Section entrance with multiple elements
gsap.utils.toArray('.section-animate').forEach((section) => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
  });

  tl.from(section.querySelector('.section-title'), {
    y: 40,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
  })
  .from(section.querySelector('.section-subtitle'), {
    y: 30,
    opacity: 0,
    duration: 0.5,
    ease: 'power2.out',
  }, '-=0.3')
  .from(section.querySelectorAll('.feature-item'), {
    y: 50,
    opacity: 0,
    duration: 0.5,
    stagger: 0.1,
    ease: 'power2.out',
  }, '-=0.2');
});
```

### 2.4 Progress-Based Animations

```javascript
// Scroll progress indicator
const progressBar = document.querySelector('.scroll-progress');

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = (scrollTop / docHeight) * 100;
  progressBar.style.width = `${scrollPercent}%`;
});

// GSAP ScrollTrigger progress-based animation
gsap.to('.progress-element', {
  scrollTrigger: {
    trigger: '.progress-section',
    start: 'top center',
    end: 'bottom center',
    scrub: true,
    onUpdate: (self) => {
      console.log('Progress:', self.progress);
    },
  },
  scale: 1.5,
  rotation: 360,
  ease: 'none',
});
```

---

## 3. MICRO-INTERACTIONS

### 3.1 Button Hover States

**Magnetic Button Effect:**

```javascript
// Magnetic Button Implementation
class MagneticButton {
  constructor(element, options = {}) {
    this.element = element;
    this.strength = options.strength || 0.3;
    this.radius = options.radius || 100;
    
    this.element.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.element.addEventListener('mouseleave', this.onMouseLeave.bind(this));
  }

  onMouseMove(e) {
    const rect = this.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * this.strength;
    const deltaY = (e.clientY - centerY) * this.strength;
    
    this.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  }

  onMouseLeave() {
    this.element.style.transform = 'translate(0, 0)';
  }
}

// Initialize
document.querySelectorAll('.magnetic-btn').forEach((btn) => {
  new MagneticButton(btn, { strength: 0.4 });
});
```

```css
.magnetic-btn {
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.15s ease-out;
  will-change: transform;
}
```

**Ripple Effect Button:**

```javascript
// Ripple Effect
function createRipple(event) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
  circle.classList.add('ripple');

  const existingRipple = button.querySelector('.ripple');
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(circle);
}

document.querySelectorAll('.ripple-btn').forEach((btn) => {
  btn.addEventListener('click', createRipple);
});
```

```css
.ripple-btn {
  position: relative;
  overflow: hidden;
  padding: 16px 32px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.ripple-btn .ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0);
  animation: ripple-animation 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

**Glow Button Effect:**

```css
.glow-btn {
  position: relative;
  padding: 16px 40px;
  background: #0f0f23;
  color: #00d4ff;
  border: 2px solid #00d4ff;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: 
    box-shadow 0.3s ease,
    text-shadow 0.3s ease,
    transform 0.2s ease;
}

.glow-btn:hover {
  box-shadow: 
    0 0 10px rgba(0, 212, 255, 0.5),
    0 0 20px rgba(0, 212, 255, 0.3),
    0 0 40px rgba(0, 212, 255, 0.2);
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.8);
  transform: translateY(-2px);
}

.glow-btn:active {
  transform: translateY(0) scale(0.98);
}
```

### 3.2 Cursor-Following Effects

```javascript
// Custom Cursor with Trail Effect
class CustomCursor {
  constructor() {
    this.cursor = document.createElement('div');
    this.cursor.className = 'custom-cursor';
    document.body.appendChild(this.cursor);
    
    this.trail = [];
    this.trailLength = 5;
    
    for (let i = 0; i < this.trailLength; i++) {
      const trailDot = document.createElement('div');
      trailDot.className = 'cursor-trail';
      trailDot.style.opacity = (1 - i / this.trailLength) * 0.5;
      document.body.appendChild(trailDot);
      this.trail.push(trailDot);
    }
    
    this.position = { x: 0, y: 0 };
    this.targetPosition = { x: 0, y: 0 };
    
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.animate();
  }

  onMouseMove(e) {
    this.targetPosition.x = e.clientX;
    this.targetPosition.y = e.clientY;
  }

  animate() {
    // Smooth follow
    this.position.x += (this.targetPosition.x - this.position.x) * 0.15;
    this.position.y += (this.targetPosition.y - this.position.y) * 0.15;
    
    this.cursor.style.left = `${this.position.x}px`;
    this.cursor.style.top = `${this.position.y}px`;
    
    // Update trail
    this.trail.forEach((dot, i) => {
      const delay = (i + 1) * 0.05;
      const trailX = this.position.x + (this.targetPosition.x - this.position.x) * delay;
      const trailY = this.position.y + (this.targetPosition.y - this.position.y) * delay;
      dot.style.left = `${trailX}px`;
      dot.style.top = `${trailY}px`;
    });
    
    requestAnimationFrame(this.animate.bind(this));
  }
}

// Initialize custom cursor (disable on touch devices)
if (!window.matchMedia('(pointer: coarse)').matches) {
  new CustomCursor();
}
```

```css
.custom-cursor {
  position: fixed;
  width: 20px;
  height: 20px;
  border: 2px solid #00d4ff;
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 9999;
  transition: 
    width 0.2s ease,
    height 0.2s ease,
    background 0.2s ease;
  mix-blend-mode: difference;
}

.custom-cursor.hovering {
  width: 40px;
  height: 40px;
  background: rgba(0, 212, 255, 0.1);
}

.cursor-trail {
  position: fixed;
  width: 8px;
  height: 8px;
  background: #00d4ff;
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 9998;
}

/* Hide default cursor */
body.custom-cursor-active {
  cursor: none;
}

body.custom-cursor-active a,
body.custom-cursor-active button {
  cursor: none;
}
```

### 3.3 Loading States

```css
/* Skeleton Loading */
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Spinner */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 212, 255, 0.3);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Pulsing Dot */
.pulse-loader {
  display: flex;
  gap: 8px;
}

.pulse-loader span {
  width: 12px;
  height: 12px;
  background: #00d4ff;
  border-radius: 50%;
  animation: pulse 1.4s ease-in-out infinite;
}

.pulse-loader span:nth-child(2) {
  animation-delay: 0.2s;
}

.pulse-loader span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
```

### 3.4 Smooth Scroll Behavior

```javascript
// Smooth Scroll with GSAP
function smoothScrollTo(target, duration = 1) {
  gsap.to(window, {
    duration: duration,
    scrollTo: {
      y: target,
      offsetY: 80, // Account for fixed header
    },
    ease: 'power3.inOut',
  });
}

// Native smooth scroll with polyfill
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
});

// GSAP ScrollSmoother (premium plugin)
// const smoother = ScrollSmoother.create({
//   wrapper: '#smooth-wrapper',
//   content: '#smooth-content',
//   smooth: 1.5,
//   effects: true,
// });
```

---

## 4. TIMING & EASING RECOMMENDATIONS

### 4.1 Duration Guidelines

| Animation Type | Duration | Notes |
|----------------|----------|-------|
| Micro-interactions | 150-200ms | Button hovers, toggles |
| Card hover effects | 250-350ms | Lift, scale, shadow |
| Page transitions | 400-600ms | Section changes |
| Scroll reveals | 600-800ms | Content entrance |
| Complex animations | 800-1200ms | Hero animations |

### 4.2 Easing Functions

```css
/* Standard Easing */
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Bounce/Elastic */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

/* Smooth deceleration */
--ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);

/* Dramatic */
--ease-dramatic: cubic-bezier(0.87, 0, 0.13, 1);
```

### 4.3 GSAP Easing

```javascript
// Recommended GSAP easings
gsap.to(element, {
  duration: 0.8,
  y: 0,
  opacity: 1,
  ease: 'power3.out',      // Smooth deceleration
  // ease: 'back.out(1.7)',   // Slight overshoot
  // ease: 'elastic.out(1, 0.3)', // Bouncy
  // ease: 'expo.out',        // Dramatic slowdown
});
```

---

## 5. PERFORMANCE OPTIMIZATION

### 5.1 GPU Acceleration

```css
/* Always animate these properties for 60fps */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU layer */
}

/* Remove will-change after animation */
.animation-complete {
  will-change: auto;
}
```

### 5.2 CSS Containment

```css
.card-container {
  contain: layout style paint;
  /* Prevents layout recalculation of parent */
}

.animation-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```

### 5.3 Intersection Observer for Lazy Animation

```javascript
// Only animate elements in viewport
const animationObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
      animationObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
```

### 5.4 Reduce Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  .parallax-element {
    transform: none !important;
  }
}
```

---

## 6. MOBILE ADAPTATION

### 6.1 Touch-Friendly Interactions

```css
/* Larger touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Remove hover effects on touch devices */
@media (hover: none) {
  .card-lift:hover {
    transform: none;
    box-shadow: none;
  }
  
  .card-lift:active {
    transform: scale(0.98);
  }
}

/* Tap highlight */
.tap-element {
  -webkit-tap-highlight-color: rgba(0, 212, 255, 0.2);
}
```

### 6.2 Mobile Animation Adjustments

```javascript
// Detect mobile and reduce animation complexity
const isMobile = window.matchMedia('(pointer: coarse)').matches;
const isLowPower = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (isMobile || isLowPower) {
  // Disable complex animations
  gsap.globalTimeline.timeScale(0);
  
  // Or use simpler animations
  document.querySelectorAll('.animate').forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}
```

### 6.3 Responsive Animation Breakpoints

```css
/* Desktop - full animations */
@media (min-width: 1024px) {
  .reveal-element {
    --animation-distance: 60px;
    --animation-duration: 0.8s;
  }
}

/* Tablet - reduced */
@media (min-width: 768px) and (max-width: 1023px) {
  .reveal-element {
    --animation-distance: 40px;
    --animation-duration: 0.6s;
  }
}

/* Mobile - minimal */
@media (max-width: 767px) {
  .reveal-element {
    --animation-distance: 20px;
    --animation-duration: 0.4s;
  }
}
```

---

## 7. RECOMMENDED LIBRARIES

### 7.1 GSAP (GreenSock Animation Platform)

**Best for:** Complex scroll animations, timelines, professional-grade motion

```bash
npm install gsap
```

```javascript
// Core + ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Recommended plugins:
// - ScrollTrigger (free) - Scroll-based animations
// - ScrollSmoother (paid) - Smooth scrolling
// - SplitText (paid) - Text animations
// - MorphSVG (paid) - SVG morphing
```

### 7.2 Framer Motion (React)

**Best for:** React component animations, gestures, layout animations

```bash
npm install framer-motion
```

```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
>
  Content
</motion.div>
```

### 7.3 Lottie

**Best for:** Complex vector animations, icon animations

```bash
npm install lottie-react
```

```jsx
import Lottie from 'lottie-react';
import animationData from './animation.json';

<Lottie 
  animationData={animationData}
  loop={true}
  autoplay={true}
/>
```

### 7.4 Lenis (Smooth Scroll)

**Best for:** Lightweight smooth scrolling

```bash
npm install lenis
```

```javascript
import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);
```

---

## 8. IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Define animation goals (guide attention, delight, feedback)
- [ ] Create animation storyboard
- [ ] Identify performance budget (max animation file size)
- [ ] Plan reduced-motion alternatives

### Development
- [ ] Use GPU-accelerated properties (transform, opacity)
- [ ] Implement `will-change` strategically
- [ ] Add `prefers-reduced-motion` support
- [ ] Test on real devices (iOS Safari, Android Chrome)
- [ ] Verify 60fps in Chrome DevTools

### Testing
- [ ] Test on low-end devices (6x CPU throttling)
- [ ] Verify touch interactions work
- [ ] Check keyboard navigation
- [ ] Test with screen readers
- [ ] Validate Core Web Vitals

---

## 9. QUICK REFERENCE: SITE-SPECIFIC TECHNIQUES

### Linear.app
- **Card Effects:** Subtle lift (4-8px), layered shadows, border glow on hover
- **Timing:** 200-300ms, ease-out curves
- **Colors:** Purple/blue gradient accents
- **Key:** Restraint - animations enhance without distracting

### Stripe.com
- **Scroll Effects:** Parallax depth, staggered reveals, pinned sections
- **Gradients:** Animated gradient borders, shifting backgrounds
- **Micro-interactions:** Button magnetic pull, cursor following
- **Key:** Smooth, professional, confidence-inspiring

### Raycast.com
- **Interactions:** Highly responsive buttons, instant feedback
- **Polish:** Consistent easing, perfect timing
- **Effects:** Subtle glows, crisp shadows
- **Key:** Every interaction feels intentional

### Arc Browser
- **Hero Animations:** Dramatic entrance, layered parallax
- **Motion:** Bold but smooth, memorable first impression
- **Transitions:** Seamless section changes
- **Key:** Make a statement, then get out of the way

---

## 10. CODE TEMPLATES

### Complete Card Component

```html
<div class="premium-card">
  <div class="card-glow"></div>
  <div class="card-content">
    <h3>Card Title</h3>
    <p>Card description goes here.</p>
  </div>
</div>
```

```css
.premium-card {
  position: relative;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 2px;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.premium-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    rgba(0, 212, 255, 0.3) 50%,
    transparent 100%
  );
  animation: rotate 4s linear infinite;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.premium-card:hover::before {
  opacity: 1;
}

.premium-card:hover {
  transform: translateY(-8px);
}

.card-content {
  position: relative;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 18px;
  padding: 24px;
  z-index: 1;
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}
```

### Complete Scroll Reveal Section

```html
<section class="reveal-section">
  <h2 class="reveal-title">Section Title</h2>
  <div class="card-grid">
    <div class="reveal-card">Card 1</div>
    <div class="reveal-card">Card 2</div>
    <div class="reveal-card">Card 3</div>
  </div>
</section>
```

```javascript
gsap.registerPlugin(ScrollTrigger);

// Title reveal
gsap.from('.reveal-title', {
  scrollTrigger: {
    trigger: '.reveal-section',
    start: 'top 80%',
  },
  y: 40,
  opacity: 0,
  duration: 0.8,
  ease: 'power3.out',
});

// Staggered card reveal
gsap.from('.reveal-card', {
  scrollTrigger: {
    trigger: '.card-grid',
    start: 'top 80%',
  },
  y: 60,
  opacity: 0,
  duration: 0.6,
  stagger: 0.15,
  ease: 'power2.out',
});
```

---

*Report compiled for high-end workshop landing page implementation*
*Last updated: 2024*
