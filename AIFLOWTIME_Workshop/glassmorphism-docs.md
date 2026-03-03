# iOS 26 Liquid Glass / Glassmorphism CSS Documentation

## Overview

A production-ready CSS implementation of Apple's iOS 26 Liquid Glass design for the AIFLOWTIME website workshop cards.

## Files

- `glassmorphism.css` - Main CSS file with all glassmorphism classes
- `glassmorphism-example.html` - Demo page showing all variants
- `glassmorphism-docs.md` - This documentation file

## Quick Start

```html
<!-- Include the CSS -->
<link rel="stylesheet" href="glassmorphism.css">

<!-- Basic glass card -->
<div class="glass-card">
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>

<!-- Dark variant -->
<div class="glass-card glass-card--dark">
  <h3>Dark Card</h3>
  <p>For dark backgrounds...</p>
</div>

<!-- Interactive with liquid effect -->
<div class="glass-card glass-card--interactive glass-card--liquid">
  <h3>Interactive Liquid</h3>
  <p>With hover states and shine...</p>
</div>
```

## CSS Classes Reference

### Base Class

| Class | Description |
|-------|-------------|
| `.glass-card` | Base glass card with frosted glass effect |

### Variants

| Class | Description |
|-------|-------------|
| `.glass-card--dark` | Dark variant for light/dark backgrounds |
| `.glass-card--clear` | High transparency variant (like iOS 26 .clear) |
| `.glass-card--strong` | Higher opacity for better readability |
| `.glass-card--sm` | Small border radius (16px) |
| `.glass-card--lg` | Large border radius (24px) |
| `.glass-card--pill` | Pill/capsule shape (9999px radius) |

### Interactive States

| Class | Description |
|-------|-------------|
| `.glass-card--interactive` | Adds hover and active states |
| `.glass-card--liquid` | Adds specular highlight effect |

### Background Classes

| Class | Description |
|-------|-------------|
| `.glass-bg` | Animated gradient background |
| `.glass-bg--subtle` | Soft pastel gradient |
| `.glass-bg--dark` | Dark animated gradient |
| `.glass-bg--aurora` | Aurora-style animated background |
| `.glass-bg--mesh` | Mesh gradient background |

### Utility Classes

| Class | Description |
|-------|-------------|
| `.glass-text-shadow` | Subtle text shadow for readability |
| `.glass-text-shadow--strong` | Stronger text shadow |
| `.glass-content` | Standard padding (1.5rem) |
| `.glass-content--sm` | Small padding (1rem) |
| `.glass-content--lg` | Large padding (2rem) |
| `.glass-divider` | Glass-style divider line |

## iOS 26 Liquid Glass Specifications

The CSS implements the following iOS 26 Liquid Glass properties:

| Property | Value | Description |
|----------|-------|-------------|
| `backdrop-filter: blur()` | 16-24px | Creates frosted glass blur |
| `backdrop-filter: saturate()` | 180% | Enhances color saturation |
| `background` | rgba(255,255,255,0.15) | Semi-transparent white |
| `border` | 1px solid rgba(255,255,255,0.3) | Subtle glass edge |
| `border-radius` | 16-20px | Rounded corners |
| `box-shadow` | 0 8px 30px rgba(0,0,0,0.1) | Soft depth shadow |

## Browser Compatibility

### Full Support (backdrop-filter enabled by default)

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 76+ | Full support |
| Safari | 9+ | Excellent support |
| Firefox | 103+ | Enabled by default since v103 |
| Edge | 79+ | Full support |
| iOS Safari | 9+ | Full support |
| Chrome Android | 76+ | Full support |

### Fallback Behavior

For browsers without `backdrop-filter` support:

```css
/* Fallback styles applied automatically */
.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(209, 213, 219, 0.5);
}
```

The fallback uses `@supports` for feature detection:

```css
@supports (backdrop-filter: blur(10px)) or (-webkit-backdrop-filter: blur(10px)) {
  .glass-card {
    /* Glass effect applied only if supported */
  }
}
```

## Accessibility

### Supported Media Queries

The CSS respects the following user preferences:

#### prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Disables animations */
}
```

#### prefers-reduced-transparency

```css
@media (prefers-reduced-transparency: reduce) {
  /* Increases opacity, removes backdrop-filter */
}
```

#### prefers-contrast: high

```css
@media (prefers-contrast: high) {
  /* Solid backgrounds, high contrast borders */
}
```

#### prefers-color-scheme: dark

```css
@media (prefers-color-scheme: dark) {
  /* Auto-switches to dark variant */
}
```

### Best Practices for Accessibility

1. **Text Contrast**: Ensure text has sufficient contrast against the glass background
2. **Text Shadow**: Use `.glass-text-shadow` for better readability
3. **Strong Variant**: Use `.glass-card--strong` for content-heavy cards
4. **Testing**: Test with all accessibility modes enabled

## Background Recommendations

For the glass effect to be visible, you need a colorful or textured background:

### Recommended Backgrounds

1. **Gradients**: Soft, multi-color gradients work best
2. **Images**: Photos with varied colors and textures
3. **Abstract Shapes**: Blurred shapes and blobs
4. **Mesh Gradients**: Multiple overlapping radial gradients

### Background Classes Provided

```html
<!-- Animated gradient -->
<div class="glass-bg">
  <div class="glass-card">...</div>
</div>

<!-- Aurora effect -->
<div class="glass-bg--aurora">
  <div class="glass-card glass-card--dark">...</div>
</div>

<!-- Mesh gradient -->
<div class="glass-bg--mesh">
  <div class="glass-card glass-card--dark">...</div>
</div>
```

## Performance Considerations

### GPU Acceleration

The `backdrop-filter` property is GPU-accelerated but can be intensive:

- **Limit usage**: Use on 2-3 elements per viewport maximum
- **Avoid animation**: Don't animate the blur effect
- **Test on mobile**: Verify performance on mid-range devices
- **Use will-change sparingly**: Only on animated elements

### Optimization Tips

```css
/* For animated glass elements */
.glass-card--animated {
  will-change: transform, box-shadow;
}

/* GPU acceleration */
.glass-card--gpu {
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

## Customization

### CSS Custom Properties

Modify the CSS variables to customize the effect:

```css
:root {
  /* Blur intensity */
  --glass-blur: 20px;
  
  /* Saturation level */
  --glass-saturate: 180%;
  
  /* Background opacity */
  --glass-bg-opacity: 0.15;
  
  /* Border radius */
  --glass-radius: 20px;
  
  /* Shadow intensity */
  --glass-shadow-spread: 30px;
}
```

### Creating Custom Variants

```css
/* Custom variant example */
.glass-card--custom {
  --glass-blur: 30px;
  --glass-bg-opacity: 0.2;
  border-radius: 12px;
}
```

## Common Use Cases

### Workshop Cards (AIFLOWTIME)

```html
<article class="glass-card glass-card--interactive glass-card--liquid">
  <span class="card-badge">Beginner</span>
  <h3>AI Fundamentals</h3>
  <p>Learn the basics of AI...</p>
  <button class="card-button">Register</button>
</article>
```

### Navigation Bar

```html
<nav class="glass-card glass-card--pill">
  <ul>
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
</nav>
```

### Modal/Dialog

```html
<div class="glass-card glass-card--lg" style="max-width: 500px;">
  <h2>Modal Title</h2>
  <p>Modal content...</p>
  <button>Close</button>
</div>
```

### Sidebar

```html
<aside class="glass-card glass-card--dark" style="width: 280px;">
  <nav>...</nav>
</aside>
```

## Troubleshooting

### Issue: Glass effect not visible

**Solution**: Ensure you have a colorful background behind the card:

```html
<!-- ❌ Won't show glass effect -->
<div style="background: white;">
  <div class="glass-card">...</div>
</div>

<!-- ✅ Glass effect visible -->
<div class="glass-bg">
  <div class="glass-card">...</div>
</div>
```

### Issue: Text not readable

**Solution**: Use the strong variant or add text shadow:

```html
<!-- ❌ May be hard to read -->
<div class="glass-card">
  <p>Long text content...</p>
</div>

<!-- ✅ Better readability -->
<div class="glass-card glass-card--strong">
  <p class="glass-text-shadow">Long text content...</p>
</div>
```

### Issue: Performance issues

**Solution**: Reduce blur or limit the number of glass elements:

```css
/* Reduce blur intensity */
.glass-card {
  --glass-blur: 10px;
}
```

## Resources

- [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [Can I Use: backdrop-filter](https://caniuse.com/css-backdrop-filter)
- [Apple iOS 26 Liquid Glass](https://developer.apple.com/design/)
- [Glassmorphism CSS Generator](https://css.glass/)

## License

MIT License - Free for personal and commercial use.
