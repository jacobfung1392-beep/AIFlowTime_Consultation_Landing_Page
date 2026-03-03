# Mobile UX Checklist for Single-Page Course Landing Pages

## Executive Summary
This checklist provides mobile-first design guidelines for developers building single-page course landing pages. Following these recommendations ensures optimal user experience, performance, and accessibility across all mobile devices.

---

## 1. Tap Target Sizes

### Minimum Requirements
| Guideline | Minimum Size | Use Case |
|-----------|--------------|----------|
| WCAG 2.2 AA (Required) | 24×24px | Legal compliance minimum |
| WCAG 2.1 AAA (Enhanced) | 44×44px | Recommended for accessibility |
| Apple iOS HIG | 44×44pt (~59px) | iOS native apps |
| Google Material Design | 48×48dp | Android native apps |
| **Recommended for Web** | **44×48px** | Best practice for mobile web |

### Implementation Guidelines

```css
/* Base interactive elements */
button, .button, [role="button"], a {
  min-width: 44px;
  min-height: 44px;
}

/* Icon buttons - visual size can be smaller with padding */
.icon-button {
  width: 24px;
  height: 24px;
  padding: 10px;  /* Creates 44px touch target */
  margin: -10px;  /* Compensates for padding */
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Touch-optimized for coarse pointers */
@media (pointer: coarse) {
  .action-button {
    min-height: 48px;
    padding: 12px 20px;
  }
}
```

### Critical Rules
- [ ] All buttons minimum 44×44px
- [ ] All links minimum 44×44px (except inline text links)
- [ ] Form inputs minimum 44px height
- [ ] Checkboxes/radio buttons minimum 24×24px
- [ ] Spacing between adjacent targets: minimum 8px (12px preferred)
- [ ] Bottom navigation items: 48×48px or larger
- [ ] Close buttons on modals: minimum 44×44px

### Position-Based Sizing
Research shows touch precision varies by screen position:
- **Top of screen**: 42-46px minimum (11mm)
- **Center of screen**: 27-30px acceptable (7mm)
- **Bottom of screen**: 44-48px minimum (12mm) - thumb zone

---

## 2. Viewport & Scroll Behavior

### Required Viewport Meta Tag
```html
<!-- Standard mobile viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Accessibility-friendly (allows zoom) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, maximum-scale=5.0">
```

### iOS Safari Zoom Prevention
**Critical**: Input fields with font-size < 16px trigger auto-zoom on iOS.

```css
/* Prevent iOS auto-zoom on form focus */
input, textarea, select {
  font-size: 16px;  /* Minimum to prevent zoom */
}

/* Or use relative sizing with 16px root */
html {
  font-size: 16px;
}

input {
  font-size: 1rem;  /* = 16px */
}
```

### Scroll Behavior Best Practices
- [ ] Use `overflow-x: hidden` on body to prevent horizontal scroll
- [ ] Implement smooth scroll: `scroll-behavior: smooth`
- [ ] Avoid `position: fixed` elements that cause scroll jank
- [ ] Use `overscroll-behavior: contain` for modals/drawers
- [ ] Test momentum scrolling on iOS: `-webkit-overflow-scrolling: touch`

### Reflow Requirements
- [ ] Content must reflow to viewport width without horizontal scrolling
- [ ] Images must scale to viewport: `max-width: 100%`
- [ ] Tables should stack vertically on mobile
- [ ] Form labels should appear above inputs (not beside)

---

## 3. Card Layout Patterns

### Mobile vs Desktop Card Patterns

| Pattern | Desktop | Mobile | Best For |
|---------|---------|--------|----------|
| Horizontal Grid | 3-4 columns | 1 column | Feature lists, pricing |
| Masonry | Mixed heights | Stacked | Portfolios, galleries |
| Horizontal Scroll | Carousel | Swipeable | Testimonials, products |
| Vertical Stack | Sidebar + content | Full-width cards | Course modules, lessons |

### Recommended Mobile Card Pattern: Vertical Stack
```css
/* Mobile-first card stack */
.card-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.card {
  width: 100%;
  padding: 20px;
  border-radius: 12px;
  /* Glassmorphism or solid background */
}

/* Tablet and up */
@media (min-width: 768px) {
  .card-container {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .card {
    flex: 1 1 calc(50% - 8px);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .card {
    flex: 1 1 calc(33.333% - 11px);
  }
}
```

### Card UX Guidelines
- [ ] Cards should be full-width on mobile
- [ ] Card padding: minimum 16px (20px preferred)
- [ ] Gap between cards: 12-16px
- [ ] Card border-radius: 8-16px
- [ ] Each card should have a single clear action
- [ ] Avoid horizontal scrolling cards on mobile (use vertical stack instead)

---

## 4. Glassmorphism Performance

### The Problem
`backdrop-filter: blur()` can cause significant performance issues on mobile:
- GPU-intensive compositing
- Battery drain on continuous use
- Jank during scroll animations
- Safari-specific rendering issues

### Performance Data
| Scenario | Power Draw | FPS Impact |
|----------|------------|------------|
| Full-screen glass grid (iPhone) | 2.1W | 58fps |
| Heavy blur (15px+) | High | 25% FPS drop |
| Multiple simultaneous blurs | Very High | 40%+ FPS drop |

### Safe Implementation
```css
/* Optimized glassmorphism */
.glass-card {
  /* Fallback for unsupported browsers */
  background-color: rgba(255, 255, 255, 0.9);
  
  /* Modern browsers with support */
  @supports (backdrop-filter: blur(10px)) {
    background-color: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px); /* Safari */
  }
  
  /* GPU acceleration hints */
  will-change: backdrop-filter;
  transform: translateZ(0);
}

/* Mobile-optimized: reduce blur radius */
@media (max-width: 768px) and (hover: none) {
  .glass-card {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
}

/* Respect user preferences */
@media (prefers-reduced-transparency: reduce) {
  .glass-card {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background-color: rgba(255, 255, 255, 0.95);
  }
}
```

### Performance Recommendations
- [ ] Limit blur radius to 5-12px on mobile (80% of designs use 5-15px)
- [ ] Use solid color fallbacks for unsupported browsers
- [ ] Apply `will-change: backdrop-filter` sparingly
- [ ] Test on actual devices, not just emulators
- [ ] Consider disabling on low-end devices
- [ ] Never use full-screen blur on mobile
- [ ] Maximum 2-3 glass elements visible simultaneously

### Alternative: CSS-only Glass Effect
```css
/* Performance-friendly alternative without backdrop-filter */
.glass-alternative {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.4) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}
```

---

## 5. CTA Button Placement

### Sticky Bottom Bar vs Inline CTAs

| Approach | Best For | Conversion Impact | UX Considerations |
|----------|----------|-------------------|-------------------|
| **Sticky Bottom Bar** | Long pages, e-commerce, lead gen | +15-20% mobile CTR | Always accessible, can feel intrusive |
| **Inline CTAs** | Short pages, content-focused | Baseline | Natural flow, may be missed |
| **Hybrid (Both)** | Course landing pages | Highest | Multiple touchpoints |

### Sticky CTA Implementation
```css
/* Sticky bottom CTA bar */
.sticky-cta {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
  
  /* Safe area for notched devices */
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

/* Add padding to body to prevent content hiding */
body {
  padding-bottom: 80px; /* Height of sticky bar */
}

/* Hide on scroll down, show on scroll up (optional) */
.sticky-cta {
  transition: transform 0.3s ease;
}

.sticky-cta.hidden {
  transform: translateY(100%);
}
```

### CTA Best Practices
- [ ] Primary CTA should be visible within first viewport (above fold)
- [ ] Sticky CTA appears after scrolling past hero section
- [ ] CTA button height: 48-56px on mobile
- [ ] CTA text: 2-4 words maximum
- [ ] Use contrasting colors for CTA buttons
- [ ] Repeat CTA after key sections (testimonials, features, pricing)
- [ ] Sticky CTA should not cover essential content
- [ ] Include safe-area-inset for iPhone notch

### CTA Wording Guidelines
- Use action verbs: "Get Started", "Enroll Now", "Start Learning"
- Create urgency: "Join 10,000+ Students", "Limited Spots"
- Reduce friction: "Free Trial", "No Credit Card Required"

---

## 6. Image Loading & Performance

### Image Optimization Checklist
- [ ] Use WebP format (30% smaller than JPEG)
- [ ] Compress images: 60-80% reduction without quality loss
- [ ] Maximum image size: 1MB (500KB preferred)
- [ ] Implement lazy loading for below-fold images
- [ ] Use responsive images with `srcset`
- [ ] Specify image dimensions to prevent layout shift

### Lazy Loading Implementation
```html
<!-- Native lazy loading -->
<img src="course-image.webp" loading="lazy" alt="Course preview" width="800" height="450">

<!-- For single HTML files: use Intersection Observer -->
<img data-src="course-image.webp" class="lazy-image" alt="Course preview">
```

```javascript
// Lazy loading with Intersection Observer
const lazyImages = document.querySelectorAll('.lazy-image');

const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.remove('lazy-image');
      observer.unobserve(img);
    }
  });
});

lazyImages.forEach(img => imageObserver.observe(img));
```

### Single HTML File Optimization
For single-file landing pages:
- [ ] Inline critical CSS in `<head>`
- [ ] Use base64-encoded images only for critical assets (< 5KB)
- [ ] Defer non-critical JavaScript
- [ ] Minify HTML, CSS, and JavaScript
- [ ] Use CSS instead of images where possible (gradients, icons)

### Performance Budgets
| Metric | Target | Maximum |
|--------|--------|---------|
| First Contentful Paint (FCP) | < 1.5s | < 3s |
| Largest Contentful Paint (LCP) | < 2.5s | < 4s |
| Time to Interactive (TTI) | < 3.5s | < 5s |
| Total Page Size | < 1MB | < 3MB |
| JavaScript Bundle | < 100KB | < 300KB |

---

## 7. Common Mobile Pitfalls to Avoid

### Critical Issues
| Issue | Impact | Solution |
|-------|--------|----------|
| Horizontal scrolling | Poor UX, SEO penalty | `width: 100%`, `max-width: 100%` |
| Text too small | Accessibility fail, iOS zoom | Minimum 16px for inputs |
| Touch targets too small | Rage taps, accessibility fail | Minimum 44×44px |
| Fixed elements covering content | Content inaccessible | Add padding to body |
| Images without dimensions | Layout shift (CLS) | Always specify width/height |
| Blocking JavaScript | Slow interactivity | Use `defer` or `async` |

### iOS-Specific Issues
- [ ] Prevent callout on long-press: `-webkit-touch-callout: none`
- [ ] Prevent text selection on UI elements: `user-select: none`
- [ ] Handle safe areas: `env(safe-area-inset-*)`
- [ ] Fix 300ms tap delay: Use `touch-action: manipulation`

### Android-Specific Issues
- [ ] Test on various screen densities (DPI)
- [ ] Handle soft keyboard appearance
- [ ] Test on Chrome and Samsung Internet

---

## 8. Testing Checklist

### Device Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14/15 (standard)
- [ ] iPhone 14/15 Pro Max (large)
- [ ] Android mid-range device
- [ ] Android budget device
- [ ] Tablet (iPad)

### Browser Testing
- [ ] Safari iOS (latest)
- [ ] Chrome iOS
- [ ] Chrome Android
- [ ] Samsung Internet

### Interaction Testing
- [ ] All buttons tappable (44×44px)
- [ ] Forms submit correctly
- [ ] No horizontal scroll
- [ ] Smooth scroll behavior
- [ ] CTA buttons visible and functional
- [ ] Images load and display correctly
- [ ] No content covered by sticky elements

### Performance Testing
- [ ] Lighthouse score > 90
- [ ] Page load < 3s on 3G
- [ ] No layout shift (CLS < 0.1)
- [ ] First input delay < 100ms

---

## 9. Quick Reference: CSS Snippets

### Mobile-First Base Styles
```css
/* Reset and base styles */
* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Touch-friendly base */
button, a, input, select, textarea {
  min-height: 44px;
  min-width: 44px;
}

/* Prevent iOS zoom on inputs */
input, textarea, select {
  font-size: 16px;
}

/* Safe area support */
@supports (padding: max(0px)) {
  .safe-area {
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
}
```

### Responsive Breakpoints
```css
/* Mobile-first breakpoints */
/* Small phones */
@media (max-width: 375px) { }

/* Standard phones */
@media (min-width: 376px) and (max-width: 414px) { }

/* Large phones */
@media (min-width: 415px) and (max-width: 767px) { }

/* Tablets */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop */
@media (min-width: 1024px) { }
```

---

## 10. Resources

### Documentation
- [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Guidelines](https://m3.material.io/)

### Testing Tools
- Google Lighthouse
- Chrome DevTools Device Mode
- BrowserStack (cross-browser testing)
- WebPageTest (performance testing)

---

*Last Updated: 2024*
*For: AIFLOWTIME Course Landing Page Development*
