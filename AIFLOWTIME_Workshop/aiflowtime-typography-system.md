
# AIFLOWTIME Typography System
## Bilingual Font Selection (English + Traditional Chinese)

---

## Executive Summary

### Selected Font Combination

| Language | Primary Font | Fallback |
|----------|-------------|----------|
| **English** | Courier Prime | 'Courier New', Courier, monospace |
| **Traditional Chinese** | LXGW WenKai TC | 'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif |

### Selection Rationale

**Courier Prime (English)**
- Designed specifically for screenwriters - optimized for readability at body sizes
- Features *true italics* (not just slanted roman) - essential for editorial design
- Bolder bold weights that balance well with white space
- Has authentic typewriter heritage without looking like a code editor font
- Better readability than Special Elite (which has distressed effects)
- More editorial character than IBM Plex Mono (corporate feel)
- Less "IDE-looking" than JetBrains Mono

**LXGW WenKai TC (Chinese)**
- Handwritten, typewriter-adjacent aesthetic derived from Fontworks' Klee One
- Japanese textbook style with Song-ti characteristics
- Three weights (Light 300, Regular 400, Bold 700) for flexibility
- "Cute" and personable feel that pairs well with Courier Prime's sincerity
- Open source (OFL 1.1 license)

**Noto Serif TC (Chinese Fallback)**
- Professional serif with 6 weights (200-700)
- Variable font available for performance
- Excellent readability for extended Chinese text
- Comprehensive character coverage

---

## 1. Google Fonts Import URLs

### Option A: Individual Font Links (Recommended for precise control)

```html
<!-- English Font - Courier Prime -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">

<!-- Chinese Font - LXGW WenKai TC -->
<link href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@300;400;700&display=swap" rel="stylesheet">

<!-- Chinese Fallback - Noto Serif TC (load only if needed) -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;700&display=swap" rel="stylesheet">
```

### Option B: Combined Import (Single request)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=LXGW+WenKai+TC:wght@300;400;700&family=Noto+Serif+TC:wght@400;500;700&display=swap" rel="stylesheet">
```

### Option C: CSS @import (for stylesheets)

```css
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=LXGW+WenKai+TC:wght@300;400;700&family=Noto+Serif+TC:wght@400;500;700&display=swap');
```

---

## 2. Font-Family CSS Declarations

### Base Font Stack

```css
:root {
  /* Primary font stack - English first, then Chinese */
  --font-primary: 'Courier Prime', 'LXGW WenKai TC', 'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', 'Courier New', Courier, monospace;
  
  /* English-only font stack */
  --font-en: 'Courier Prime', 'Courier New', Courier, monospace;
  
  /* Chinese-only font stack */
  --font-zh: 'LXGW WenKai TC', 'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif;
  
  /* Monospace/code font stack */
  --font-mono: 'Courier Prime', 'Courier New', Courier, monospace;
}
```

### Application Classes

```css
/* Apply to entire document */
body {
  font-family: var(--font-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* English-only content */
.font-en {
  font-family: var(--font-en);
}

/* Chinese-only content */
.font-zh {
  font-family: var(--font-zh);
}

/* Code blocks, inline code */
.font-mono {
  font-family: var(--font-mono);
}
```

---

## 3. Complete Type Scale

### Desktop Type Scale (Base: 16px = 1rem)

| Token | Size (px) | Size (rem) | Line Height | Letter Spacing | Weight | Usage |
|-------|-----------|------------|-------------|----------------|--------|-------|
| **h1** | 64px | 4rem | 1.1 | -0.02em | 700 | Hero headlines |
| **h2** | 48px | 3rem | 1.2 | -0.01em | 700 | Section titles |
| **h3** | 32px | 2rem | 1.3 | 0 | 400/700 | Card titles |
| **h4** | 24px | 1.5rem | 1.4 | 0 | 400/700 | Subtitles |
| **h5** | 20px | 1.25rem | 1.4 | 0 | 700 | Small headings |
| **body-lg** | 18px | 1.125rem | 1.7 | 0 | 400 | Lead paragraphs |
| **body** | 16px | 1rem | 1.7 | 0 | 400 | Body text |
| **body-sm** | 14px | 0.875rem | 1.6 | 0 | 400 | Secondary text |
| **caption** | 12px | 0.75rem | 1.5 | 0.02em | 400 | Captions, labels |
| **button** | 14px | 0.875rem | 1 | 0.05em | 700 | Button text |
| **overline** | 12px | 0.75rem | 1 | 0.1em | 400 | Uppercase labels |

### Mobile Type Scale (Base: 16px = 1rem)

| Token | Size (px) | Size (rem) | Line Height | Usage |
|-------|-----------|------------|-------------|-------|
| **h1-mobile** | 40px | 2.5rem | 1.15 | Hero headlines |
| **h2-mobile** | 32px | 2rem | 1.2 | Section titles |
| **h3-mobile** | 24px | 1.5rem | 1.3 | Card titles |
| **h4-mobile** | 20px | 1.25rem | 1.4 | Subtitles |
| **h5-mobile** | 18px | 1.125rem | 1.4 | Small headings |
| **body-mobile** | 16px | 1rem | 1.7 | Body text |
| **caption-mobile** | 12px | 0.75rem | 1.5 | Captions |

### CSS Implementation

```css
:root {
  /* Base size */
  --font-size-base: 16px;
  
  /* Desktop scale */
  --font-size-h1: 4rem;      /* 64px */
  --font-size-h2: 3rem;      /* 48px */
  --font-size-h3: 2rem;      /* 32px */
  --font-size-h4: 1.5rem;    /* 24px */
  --font-size-h5: 1.25rem;   /* 20px */
  --font-size-body-lg: 1.125rem;  /* 18px */
  --font-size-body: 1rem;    /* 16px */
  --font-size-body-sm: 0.875rem;  /* 14px */
  --font-size-caption: 0.75rem;   /* 12px */
  
  /* Line heights */
  --line-height-tight: 1.1;
  --line-height-snug: 1.2;
  --line-height-normal: 1.3;
  --line-height-relaxed: 1.4;
  --line-height-loose: 1.7;
  
  /* Letter spacing */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-snug: -0.01em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.02em;
  --letter-spacing-wider: 0.05em;
  --letter-spacing-widest: 0.1em;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  :root {
    --font-size-h1: 2.5rem;    /* 40px */
    --font-size-h2: 2rem;      /* 32px */
    --font-size-h3: 1.5rem;    /* 24px */
    --font-size-h4: 1.25rem;   /* 20px */
    --font-size-h5: 1.125rem;  /* 18px */
  }
}

/* Heading styles */
h1, .h1 {
  font-size: var(--font-size-h1);
  line-height: var(--line-height-tight);
  letter-spacing: var(--letter-spacing-tight);
  font-weight: 700;
}

h2, .h2 {
  font-size: var(--font-size-h2);
  line-height: var(--line-height-snug);
  letter-spacing: var(--letter-spacing-snug);
  font-weight: 700;
}

h3, .h3 {
  font-size: var(--font-size-h3);
  line-height: var(--line-height-normal);
  letter-spacing: var(--letter-spacing-normal);
  font-weight: 400;
}

h4, .h4 {
  font-size: var(--font-size-h4);
  line-height: var(--line-height-relaxed);
  letter-spacing: var(--letter-spacing-normal);
  font-weight: 400;
}

h5, .h5 {
  font-size: var(--font-size-h5);
  line-height: var(--line-height-relaxed);
  letter-spacing: var(--letter-spacing-normal);
  font-weight: 700;
}

/* Body text */
.body-lg {
  font-size: var(--font-size-body-lg);
  line-height: var(--line-height-loose);
}

body, .body {
  font-size: var(--font-size-body);
  line-height: var(--line-height-loose);
}

.body-sm {
  font-size: var(--font-size-body-sm);
  line-height: 1.6;
}

/* Caption and utility */
.caption {
  font-size: var(--font-size-caption);
  line-height: 1.5;
  letter-spacing: var(--letter-spacing-wide);
}

.overline {
  font-size: var(--font-size-caption);
  line-height: 1;
  letter-spacing: var(--letter-spacing-widest);
  text-transform: uppercase;
}

/* Button text */
.button-text {
  font-size: var(--font-size-body-sm);
  line-height: 1;
  letter-spacing: var(--letter-spacing-wider);
  font-weight: 700;
  text-transform: uppercase;
}
```

---

## 4. Usage Guidelines

### Font Purpose Matrix

| Content Type | Font | Weight | Size | Notes |
|--------------|------|--------|------|-------|
| **Hero Headlines** | Courier Prime | 700 | h1 | Use for main page titles |
| **Section Titles** | Courier Prime | 700 | h2 | Major section dividers |
| **Card Titles** | Courier Prime | 400/700 | h3 | Can use 400 for lighter feel |
| **Subtitles** | Courier Prime | 400 | h4 | Secondary headings |
| **Body Text (EN)** | Courier Prime | 400 | body | Main content paragraphs |
| **Body Text (ZH)** | LXGW WenKai TC | 400 | body | Chinese body content |
| **Emphasis/Italic** | Courier Prime | 400 italic | body | *True italics available* |
| **Bold Text** | Courier Prime | 700 | body | Strong emphasis |
| **Captions** | Courier Prime | 400 | caption | Image captions, footnotes |
| **Buttons** | Courier Prime | 700 | button | Uppercase, letter-spaced |
| **Code/Preformatted** | Courier Prime | 400 | body-sm | Monospace content |
| **Labels/Tags** | Courier Prime | 400 | caption | UI labels |

### Language-Specific Considerations

#### English Text
- Courier Prime has excellent readability at 12-16px sizes
- True italics provide authentic editorial feel
- Bold weight is heavier than standard Courier - balances white space well
- Monospace nature creates distinctive visual rhythm

#### Chinese Text
- LXGW WenKai TC at 16px+ is comfortable for reading
- Chinese characters naturally take more space - allow wider containers
- Line height of 1.7 works well for mixed EN/ZH content
- Consider using Noto Serif TC for very long Chinese passages (better performance)

### Mixed Language Content

```css
/* For mixed EN/ZH paragraphs */
.mixed-content {
  font-family: var(--font-primary);
  font-size: var(--font-size-body);
  line-height: 1.7;
}

/* English words in Chinese text */
.mixed-content em,
.mixed-content i {
  font-family: 'Courier Prime', monospace;
  font-style: italic;
}
```

---

## 5. Mobile Considerations

### Responsive Font Sizes

| Element | Desktop | Tablet (<992px) | Mobile (<768px) | Small Mobile (<480px) |
|---------|---------|-----------------|-----------------|----------------------|
| H1 | 64px | 48px | 40px | 32px |
| H2 | 48px | 40px | 32px | 28px |
| H3 | 32px | 28px | 24px | 22px |
| H4 | 24px | 22px | 20px | 18px |
| Body | 16px | 16px | 16px | 15px |

### Mobile-Specific Adjustments

```css
/* Mobile typography optimizations */
@media (max-width: 768px) {
  body {
    /* Slightly tighter line height on mobile */
    line-height: 1.6;
  }
  
  h1, h2, h3 {
    /* Tighter letter spacing on large mobile headings */
    letter-spacing: -0.01em;
  }
  
  /* Reduce paragraph width for better reading */
  p {
    max-width: 100%;
  }
}

/* Small mobile adjustments */
@media (max-width: 480px) {
  :root {
    --font-size-h1: 2rem;      /* 32px */
    --font-size-h2: 1.75rem;   /* 28px */
    --font-size-h3: 1.375rem;  /* 22px */
  }
  
  body {
    font-size: 15px;
  }
}
```

### Performance Considerations

1. **Font Loading Strategy**
   ```css
   /* Use font-display: swap to prevent FOIT */
   @font-face {
     font-family: 'Courier Prime';
     font-display: swap;
     /* ... */
   }
   ```

2. **Subset Loading** (if self-hosting)
   - Load only Latin subset for English
   - Load Traditional Chinese subset for Chinese
   - Consider using `unicode-range` in @font-face

3. **Preload Critical Fonts**
   ```html
   <link rel="preload" href="https://fonts.gstatic.com/s/courierprime/v9/...woff2" as="font" type="font/woff2" crossorigin>
   ```

---

## 6. Visual Examples

### Sample Rendering Preview

```
H1 (64px/700):        The Future of AI Workflow
H2 (48px/700):        Streamline Your Process
H3 (32px/400):        Intelligent Automation
H4 (24px/400):        Built for Teams
Body (16px/400):      Courier Prime delivers exceptional readability 
                      for editorial content with its authentic typewriter 
                      heritage and true italic support.
Italic (16px/italic): *True italics, not just slanted roman*
Bold (16px/700):      **Important emphasis stands out**
Caption (12px/400):   Figure 1: Typography system overview
Button (14px/700):    GET STARTED
```

### Chinese Sample

```
H1: 人工智能工作流程的未來
H2: 簡化您的工作流程
H3: 智能自動化
Body: LXGW WenKai TC 提供優美的手寫風格，與 Courier Prime 完美搭配。
```

---

## 7. Complete CSS File

```css
/**
 * AIFLOWTIME Typography System
 * Bilingual: English (Courier Prime) + Traditional Chinese (LXGW WenKai TC)
 */

/* ========================================
   1. FONT IMPORTS
   ======================================== */

@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=LXGW+WenKai+TC:wght@300;400;700&family=Noto+Serif+TC:wght@400;500;700&display=swap');

/* ========================================
   2. CSS VARIABLES
   ======================================== */

:root {
  /* Font families */
  --font-primary: 'Courier Prime', 'LXGW WenKai TC', 'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', 'Courier New', Courier, monospace;
  --font-en: 'Courier Prime', 'Courier New', Courier, monospace;
  --font-zh: 'LXGW WenKai TC', 'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif;
  --font-mono: 'Courier Prime', 'Courier New', Courier, monospace;
  
  /* Font sizes - Desktop */
  --font-size-h1: 4rem;          /* 64px */
  --font-size-h2: 3rem;          /* 48px */
  --font-size-h3: 2rem;          /* 32px */
  --font-size-h4: 1.5rem;        /* 24px */
  --font-size-h5: 1.25rem;       /* 20px */
  --font-size-body-lg: 1.125rem; /* 18px */
  --font-size-body: 1rem;        /* 16px */
  --font-size-body-sm: 0.875rem; /* 14px */
  --font-size-caption: 0.75rem;  /* 12px */
  
  /* Line heights */
  --line-height-tight: 1.1;
  --line-height-snug: 1.2;
  --line-height-normal: 1.3;
  --line-height-relaxed: 1.4;
  --line-height-loose: 1.7;
  
  /* Letter spacing */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-snug: -0.01em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.02em;
  --letter-spacing-wider: 0.05em;
  --letter-spacing-widest: 0.1em;
}

/* ========================================
   3. BASE STYLES
   ======================================== */

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  font-family: var(--font-primary);
  font-size: var(--font-size-body);
  line-height: var(--line-height-loose);
  color: #1a1a1a;
}

/* ========================================
   4. HEADING STYLES
   ======================================== */

h1, .h1 {
  font-family: var(--font-en);
  font-size: var(--font-size-h1);
  font-weight: 700;
  line-height: var(--line-height-tight);
  letter-spacing: var(--letter-spacing-tight);
  margin-bottom: 1.5rem;
}

h2, .h2 {
  font-family: var(--font-en);
  font-size: var(--font-size-h2);
  font-weight: 700;
  line-height: var(--line-height-snug);
  letter-spacing: var(--letter-spacing-snug);
  margin-bottom: 1.25rem;
}

h3, .h3 {
  font-family: var(--font-en);
  font-size: var(--font-size-h3);
  font-weight: 400;
  line-height: var(--line-height-normal);
  letter-spacing: var(--letter-spacing-normal);
  margin-bottom: 1rem;
}

h4, .h4 {
  font-family: var(--font-en);
  font-size: var(--font-size-h4);
  font-weight: 400;
  line-height: var(--line-height-relaxed);
  letter-spacing: var(--letter-spacing-normal);
  margin-bottom: 0.75rem;
}

h5, .h5 {
  font-family: var(--font-en);
  font-size: var(--font-size-h5);
  font-weight: 700;
  line-height: var(--line-height-relaxed);
  letter-spacing: var(--letter-spacing-normal);
  margin-bottom: 0.5rem;
}

/* ========================================
   5. BODY TEXT STYLES
   ======================================== */

.body-lg {
  font-size: var(--font-size-body-lg);
  line-height: var(--line-height-loose);
}

.body-sm {
  font-size: var(--font-size-body-sm);
  line-height: 1.6;
}

/* ========================================
   6. UTILITY TEXT STYLES
   ======================================== */

.caption {
  font-size: var(--font-size-caption);
  line-height: 1.5;
  letter-spacing: var(--letter-spacing-wide);
}

.overline {
  font-size: var(--font-size-caption);
  line-height: 1;
  letter-spacing: var(--letter-spacing-widest);
  text-transform: uppercase;
}

.button-text {
  font-size: var(--font-size-body-sm);
  line-height: 1;
  letter-spacing: var(--letter-spacing-wider);
  font-weight: 700;
  text-transform: uppercase;
}

/* ========================================
   7. EMPHASIS STYLES
   ======================================== */

em, i, .italic {
  font-family: var(--font-en);
  font-style: italic;
}

strong, b, .bold {
  font-weight: 700;
}

/* ========================================
   8. CODE STYLES
   ======================================== */

code, pre, .code {
  font-family: var(--font-mono);
  font-size: var(--font-size-body-sm);
}

/* ========================================
   9. LANGUAGE-SPECIFIC CLASSES
   ======================================== */

.font-en {
  font-family: var(--font-en);
}

.font-zh {
  font-family: var(--font-zh);
}

.font-mono {
  font-family: var(--font-mono);
}

/* ========================================
   10. RESPONSIVE ADJUSTMENTS
   ======================================== */

@media (max-width: 992px) {
  :root {
    --font-size-h1: 3rem;      /* 48px */
    --font-size-h2: 2.5rem;    /* 40px */
    --font-size-h3: 1.75rem;   /* 28px */
    --font-size-h4: 1.375rem;  /* 22px */
  }
}

@media (max-width: 768px) {
  :root {
    --font-size-h1: 2.5rem;    /* 40px */
    --font-size-h2: 2rem;      /* 32px */
    --font-size-h3: 1.5rem;    /* 24px */
    --font-size-h4: 1.25rem;   /* 20px */
    --font-size-h5: 1.125rem;  /* 18px */
  }
  
  body {
    line-height: 1.6;
  }
}

@media (max-width: 480px) {
  :root {
    --font-size-h1: 2rem;      /* 32px */
    --font-size-h2: 1.75rem;   /* 28px */
    --font-size-h3: 1.375rem;  /* 22px */
  }
  
  html {
    font-size: 15px;
  }
}
```

---

## 8. HTML Implementation Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIFLOWTIME - Typography Demo</title>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=LXGW+WenKai+TC:wght@300;400;700&family=Noto+Serif+TC:wght@400;500;700&display=swap" rel="stylesheet">
  
  <!-- Typography CSS -->
  <link rel="stylesheet" href="typography.css">
</head>
<body>
  <h1>The Future of AI Workflow</h1>
  <p class="body-lg">Streamline your creative process with intelligent automation.</p>
  
  <h2>為什麼選擇 AIFLOWTIME？</h2>
  <p>我們的平台結合了最先進的人工智能技術與直觀的工作流程設計。</p>
  
  <h3>Key Features</h3>
  <p><em>True italics</em> and <strong>bold emphasis</strong> work beautifully together.</p>
  
  <p class="caption">Last updated: January 2025</p>
  
  <button class="button-text">Get Started</button>
</body>
</html>
```

---

## Summary

This typography system provides:

1. **Courier Prime** for English - authentic typewriter feel with true italics and bold
2. **LXGW WenKai TC** for Chinese - handwritten, typewriter-adjacent aesthetic
3. **Noto Serif TC** as Chinese fallback - professional and highly readable
4. Complete type scale from 12px captions to 64px hero headlines
5. Responsive sizing for all breakpoints
6. Full CSS implementation ready for frontend development

The combination creates a distinctive editorial design that feels both nostalgic (typewriter heritage) and modern (clean digital rendering), perfect for a Claude-style AI platform.
