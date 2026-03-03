# Anthropic Claude AI Design System Specification
## AIFLOWTIME Website Design Reference

---

## 1. COLOR PALETTE

### Primary Colors

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `--background` | `#FFFFFF` | Primary page background |
| `--foreground` | `#141413` (oklch(0.145 0 0)) | Primary text color |
| `--primary` | `#030213` | Brand color, primary actions |
| `--secondary` | `#F5F5F7` (oklch(0.95 0.0058 264.53)) | Secondary backgrounds |
| `--muted` | `#ECECF0` | Muted backgrounds, subtle emphasis |
| `--muted-foreground` | `#717182` | Secondary text, captions |
| `--border` | `rgba(0, 0, 0, 0.1)` | Dividers, borders, outlines |
| `--destructive` | `#D4183D` | Error states, danger actions |

### Anthropic Brand Colors (Official)

| Color Name | Hex Value | RGB | Usage |
|------------|-----------|-----|-------|
| **Dark** | `#141413` | rgb(20, 20, 19) | Primary text, dark backgrounds |
| **Light** | `#FAF9F5` | rgb(250, 249, 245) | Light backgrounds |
| **Mid Gray** | `#B0AEA5` | rgb(176, 174, 165) | Secondary elements |
| **Light Gray** | `#E8E6DC` | rgb(232, 230, 220) | Subtle backgrounds |
| **Orange/Terracotta** | `#D97757` | rgb(217, 119, 87) | Primary accent |
| **Blue** | `#6A9BCC` | rgb(106, 155, 204) | Secondary accent |
| **Green** | `#788C5D` | rgb(120, 140, 93) | Tertiary accent |

### Claude-Specific Colors

| Color Name | Hex Value | Usage |
|------------|-----------|-------|
| **Crail** | `#C15F3C` | Primary brand accent |
| **Cloudy** | `#B1ADA1` | Secondary text, borders |
| **Pampas** | `#F4F3EE` | Card backgrounds, sections |
| **Warm Cream** | `#FAF9F7` | Page backgrounds |
| **Terracotta/Coral** | `#D4775C` | CTAs, highlights |
| **Warm Grey** | `#3B3B3B` | Body text |
| **Off-White** | `#E8E4DF` | Secondary backgrounds |

### Color Usage Guidelines

```css
/* CSS Custom Properties */
:root {
  /* Backgrounds */
  --background: #FFFFFF;
  --background-warm: #FAF9F7;
  --background-cream: #FAF9F5;
  --background-muted: #F4F3EE;
  
  /* Text */
  --foreground: #141413;
  --text-primary: #3B3B3B;
  --text-secondary: #717182;
  --text-muted: #B0AEA5;
  
  /* Accents */
  --accent-terracotta: #D97757;
  --accent-coral: #D4775C;
  --accent-blue: #6A9BCC;
  --accent-green: #788C5D;
  
  /* Borders */
  --border: rgba(0, 0, 0, 0.1);
  --border-light: #E8E4DF;
  
  /* States */
  --destructive: #D4183D;
}
```

---

## 2. TYPOGRAPHY SYSTEM

### Font Families

| Purpose | Font | Fallback |
|---------|------|----------|
| **Headings** | Poppins | Arial, sans-serif |
| **Body Text** | Lora | Georgia, serif |
| **UI Elements** | System UI | -apple-system, BlinkMacSystemFont |

### Alternative Editorial Fonts

For a more literary magazine aesthetic:
- **Headings**: `Tiempos Headline`, `Styrene`, `Canela`, `GT Super`
- **Body**: `Tiempos Text`, `Lora`, `Source Serif Pro`, `Merriweather`
- **UI/Sans**: `Inter`, `Sohne`, `Graphik`, `DM Sans`

### Typography Scale

| Element | Font Size | Font Weight | Line Height | Letter Spacing |
|---------|-----------|-------------|-------------|----------------|
| **H1** | 2rem (32px) | 500 | 1.5 | -0.02em |
| **H2** | 1.5rem (24px) | 500 | 1.5 | -0.01em |
| **H3** | 1.25rem (20px) | 500 | 1.5 | 0 |
| **H4** | 1.125rem (18px) | 500 | 1.5 | 0 |
| **Body** | 1rem (16px) | 400 | 1.6 | 0 |
| **Small** | 0.875rem (14px) | 400 | 1.5 | 0 |
| **Caption** | 0.75rem (12px) | 400 | 1.4 | 0.01em |

### Typography Rules

1. **Do not override base typography** with Tailwind classes unless specifically needed
2. HTML elements receive automatic styling when no text-* classes are present
3. Use `font-weight: 500` for headings (medium, not bold)
4. Use `font-weight: 400` for body text (normal)
5. Maintain line-height of 1.5-1.6 for readability
6. Left-align all body text (no center alignment for long-form content)

---

## 3. LAYOUT PRINCIPLES

### Core Philosophy

- **Content-first**: Design serves the content, not the other way around
- **Generous whitespace**: Breathing room creates focus and clarity
- **Clear hierarchy**: Visual weight guides the eye naturally
- **Minimal decoration**: Every element serves a purpose
- **Left-aligned text**: Editorial, readable, professional

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 2px | Micro adjustments |
| `space-2` | 4px | Tight spacing |
| `space-3` | 6px | Icon gaps |
| `space-4` | 8px | Component padding |
| `space-6` | 12px | Small gaps |
| `space-8` | 16px | Default spacing |
| `space-10` | 20px | Medium gaps |
| `space-12` | 24px | Large gaps |
| `space-16` | 32px | Section padding |
| `space-20` | 40px | Large section gaps |
| `space-24` | 48px | Hero spacing |

### Spacing Patterns

```
Sections:     space-y-8  (32px between sections)
Forms:        space-y-6  (24px between form groups)
Fields:       space-y-2  (8px between label and input)
Elements:     space-y-4  (16px between related elements)
Cards:        gap-6      (24px between cards)
```

### Container Guidelines

```css
/* Standard page wrapper */
.main-container {
  max-width: 72rem;        /* 1152px */
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;      /* 16px mobile */
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .main-container {
    padding-left: 1.5rem;  /* 24px tablet */
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .main-container {
    padding-left: 2rem;    /* 32px desktop */
    padding-right: 2rem;
  }
}
```

### Grid System

```css
/* Card grid - responsive */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Two column layout */
.two-column {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .two-column {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## 4. UI COMPONENTS

### Buttons

#### Variants

| Variant | Classes | Usage |
|---------|---------|-------|
| **Primary** | `bg-primary text-primary-foreground hover:bg-primary/90` | Main CTAs |
| **Secondary** | `bg-secondary text-secondary-foreground hover:bg-secondary/80` | Secondary actions |
| **Outline** | `border border-border bg-background hover:bg-muted` | Tertiary actions |
| **Ghost** | `hover:bg-muted` | Icon buttons, subtle actions |
| **Destructive** | `bg-destructive text-white hover:bg-destructive/90` | Danger actions |

#### Sizes

| Size | Classes | Usage |
|------|---------|-------|
| **Small** | `h-8 px-3 text-sm` | Compact UI |
| **Default** | `h-10 px-4 py-2` | Standard buttons |
| **Large** | `h-12 px-6 text-lg` | Hero CTAs |
| **Icon** | `h-10 w-10` | Icon-only buttons |

#### Button Example

```jsx
<Button variant="default" size="default">
  Try Claude
</Button>

<Button variant="outline" size="lg">
  Learn More
</Button>
```

### Cards

#### Structure

```jsx
<Card className="border-border/30 shadow-sm">
  <CardHeader className="border-b border-border/30">
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent className="p-6">
    {/* Card content */}
  </CardContent>
  <CardFooter className="border-t border-border/30">
    {/* Footer actions */}
  </CardFooter>
</Card>
```

#### Card Styles

| Property | Value |
|----------|-------|
| Border | `1px solid rgba(0, 0, 0, 0.1)` |
| Border Radius | `0.625rem` (10px) |
| Shadow | `0 1px 3px rgba(0, 0, 0, 0.05)` |
| Background | `#FFFFFF` or `#F4F3EE` |
| Padding | `1.5rem` (24px) |

### Inputs

```jsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    placeholder="Enter your email"
    className="border-border/30"
  />
</div>
```

#### Input Styles

| Property | Value |
|----------|-------|
| Border | `1px solid rgba(0, 0, 0, 0.1)` |
| Border Radius | `0.5rem` (8px) |
| Height | `2.5rem` (40px) |
| Padding | `0.75rem 1rem` |
| Focus Ring | `2px solid rgba(0, 0, 0, 0.2)` |

### Dividers

```jsx
<!-- Horizontal divider -->
<hr className="border-border/30" />

<!-- Section divider with spacing -->
<div className="py-8">
  <hr className="border-border/30" />
</div>
```

### Navigation

```jsx
<nav className="border-b border-border/30 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      {/* Navigation links */}
      {/* CTA button */}
    </div>
  </div>
</nav>
```

### Alerts

```jsx
<Alert variant="default">
  <Info className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    This is an informational message.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong.
  </AlertDescription>
</Alert>
```

---

## 5. BORDER RADIUS

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.625rem` (10px) | Default border radius |
| `--radius-sm` | `calc(var(--radius) - 4px)` | Small elements |
| `--radius-lg` | `var(--radius)` | Large elements |
| `--radius-xl` | `calc(var(--radius) + 4px)` | Extra large |

---

## 6. SHADOWS

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | Subtle elevation |
| `shadow` | `0 1px 3px rgba(0, 0, 0, 0.1)` | Default cards |
| `shadow-md` | `0 4px 6px rgba(0, 0, 0, 0.1)` | Modals, dropdowns |

---

## 7. RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

### Responsive Patterns

```css
/* Grid */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

/* Text */
text-2xl sm:text-3xl lg:text-4xl

/* Padding */
px-4 sm:px-6 lg:px-8

/* Display */
hidden md:block
```

---

## 8. ICONS

### Icon Library

- **Primary**: `lucide-react`
- **Sizes**:
  - Small: `h-3 w-3` (12px)
  - Standard: `h-4 w-4` (16px)
  - Large: `h-5 w-5` (20px)

### Common Icons

| Icon | Usage |
|------|-------|
| `Home` | Navigation home |
| `User` | User profile |
| `Settings` | Settings page |
| `Search` | Search functionality |
| `Menu` | Mobile menu |
| `X` | Close action |
| `ChevronDown` | Dropdown indicator |
| `ChevronRight` | Link arrow |
| `ArrowLeft` | Back navigation |
| `ArrowRight` | Forward navigation |
| `Check` | Success state |
| `AlertCircle` | Warning/Error |
| `Info` | Information |
| `Loader2` | Loading state |
| `Plus` | Add action |
| `Trash2` | Delete action |

---

## 9. MOOD & DESIGN PRINCIPLES

### Brand Personality

- **Calm**: No harsh colors, no aggressive animations
- **Intellectual**: Editorial typography, thoughtful content hierarchy
- **Trustworthy**: Clean, honest design without dark patterns
- **Human-centered**: Warm accents, approachable but professional
- **Technical**: Precise spacing, consistent patterns

### Design Philosophy

> "Like a high-end literary magazine" - thoughtful, refined, content-focused

### Key Principles

1. **Restraint**: Less is more. Every element must earn its place.
2. **Clarity**: Information hierarchy should be immediately apparent.
3. **Warmth**: The design should feel inviting, not cold or corporate.
4. **Consistency**: Patterns should be predictable and repeatable.
5. **Accessibility**: Design for all users, regardless of ability.

---

## 10. WHAT CLAUDE DOES NOT DO

### ❌ Avoid These

| Don't | Do Instead |
|-------|------------|
| **Gradients** | Use solid colors only |
| **Neon colors** | Use muted, warm palette |
| **Tech-bro aesthetic** | Use editorial, literary style |
| **Busy backgrounds** | Use clean, minimal backgrounds |
| **Center-aligned body text** | Left-align all body text |
| **Harsh shadows** | Use subtle, soft shadows |
| **Bold headings (700+)** | Use medium weight (500) |
| **Decorative elements** | Every element serves a purpose |
| **Over-animation** | Subtle, purposeful motion only |
| **Multiple accent colors** | Stick to 1-2 accent colors |
| **Border radius extremes** | Use consistent, moderate radius |
| **All caps text** | Use sentence case |

### Anti-Patterns

```css
/* DON'T: Gradients */
background: linear-gradient(135deg, #ff6b6b, #4ecdc4);

/* DON'T: Neon colors */
color: #00ff00;

/* DON'T: Harsh shadows */
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);

/* DON'T: Center-aligned long text */
text-align: center; /* for body text */

/* DON'T: Excessive border radius */
border-radius: 50px;

/* DON'T: Bold headings */
font-weight: 700;
```

---

## 11. IMPLEMENTATION CHECKLIST

### Required

- [ ] Use CSS custom properties for all colors
- [ ] Import shadcn/ui components correctly
- [ ] Implement dark mode support
- [ ] Apply responsive design patterns
- [ ] Use Lucide React for icons
- [ ] Maintain consistent spacing
- [ ] Left-align body text
- [ ] Use medium (500) font weight for headings
- [ ] Apply generous whitespace
- [ ] Test across all breakpoints

### Forbidden

- [ ] No gradient backgrounds
- [ ] No neon or overly saturated colors
- [ ] No tech-bro aesthetic (dark mode with neon accents)
- [ ] No busy patterns or textures
- [ ] No center-aligned body text
- [ ] No custom shadcn component versions
- [ ] No hardcoded colors
- [ ] No different icon libraries
- [ ] No bold (700+) heading weights
- [ ] No excessive decoration

---

## 12. EXAMPLE PAGE STRUCTURE

```jsx
export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/30 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <NavLinks />
            <Button variant="default">Try Claude</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 bg-warm-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight">
              The AI for problem solvers
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Claude is a next generation AI assistant built for work and deep thinking.
            </p>
            <div className="mt-8 flex gap-4">
              <Button variant="default" size="lg">
                Try Claude
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create with Claude</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Draft and iterate on websites, graphics, documents, and code.
                </p>
              </CardContent>
            </Card>
            {/* More cards... */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Footer content */}
        </div>
      </footer>
    </div>
  );
}
```

---

## 13. RESOURCES

### Official References

- **Anthropic Website**: https://www.anthropic.com
- **Claude.ai**: https://claude.ai
- **shadcn/ui**: https://ui.shadcn.com
- **Lucide Icons**: https://lucide.dev

### Design Inspiration

- High-end literary magazines (The New Yorker, The Atlantic)
- Editorial design systems
- Academic publications
- Museum and gallery websites

---

*This design specification document is based on research of Anthropic's Claude AI brand design language, official brand guidelines, and best practices for editorial web design.*

**Version**: 1.0  
**Last Updated**: 2025  
**For**: AIFLOWTIME Website Development
