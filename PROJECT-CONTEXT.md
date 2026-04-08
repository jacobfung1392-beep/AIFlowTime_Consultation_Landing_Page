# AIFlowTime project context (from CMS / layout work)

This file captures **non-obvious architecture, decisions, and pitfalls** from extended work on Page Layout CMS, public pages, and Firebase. It is **not** a full README; update it when behavior changes.

**Live site:** https://aiflowtime-hk.web.app  

---

## Is maintaining this file a good idea?

**Yes, when:**

- More than one person (or future you) touches the CMS, slugs, or Firestore shape.
- You need “why does X exist?” without re-reading old chats.

**Caveats:**

- It goes **stale** if nobody updates it after refactors.
- Prefer linking to **code** and **one source of truth** (e.g. `SECTION_TYPES` in `layout-editor.html`) instead of duplicating every field name here.

---

## Stack (high level)

- **Hosting:** Firebase Hosting (`firebase.json`), often with rewrites.
- **Data:** Firestore `pageLayouts` (and other collections, e.g. `registrations` for admin gate).
- **CMS:** `layout-editor.html` — client-side editor, preview iframe, saves layout docs.
- **Public pages:** Static HTML per route (e.g. `linktree.html`, `Kimi_Agent_AI Workshop Landing Page/index.html` for workshop-0 style landings) + runtime that applies `pageLayouts` sections.
- **Shared JS:** `js/shared-utils.js` (preview `postMessage` bridge), `js/page-background-runtime.js`, `js/page-background-presets.js`, `js/quiz-layout-shared.js`, etc.

---

## Page Layout CMS (`layout-editor.html`)

### Registry and sections

- **`PAGE_REGISTRY`:** Maps editor page ids to `firestoreDoc`, `previewUrl`, `sectionTypes`, `defaultSections`.
- **`SECTION_TYPES`:** Schema defaults per section type (hero, link-list, transformation, `page-background`, quiz blocks, etc.).
- **Deprecated types:** `DEPRECATED_LAYOUT_SECTION_TYPES` (e.g. standalone `lead-magnet`) — filtered out of “add section” / normalized lists.

### Critical: script initialization order

- **`normalizeEditableSectionTypes`** and **`DEPRECATED_LAYOUT_SECTION_TYPES` must be defined before** any code that calls them during initial parse (e.g. `Object.keys(PAGE_REGISTRY).forEach(...)`).
- If `DEPRECATED_LAYOUT_SECTION_TYPES` is still `undefined` when that loop runs, you get:  
  `Cannot read properties of undefined (reading 'hero')` — then the rest of the script never runs, **`auth` stays undefined**, and Google sign-in fails with `signInWithPopup` errors.

### Hero (workshop-0 / linktree parity)

- **Linktree** hero is driven by the same **content model** as workshop-style heroes: badge, rich title/tagline, media, **two buttons** (CTA + Learn more), scroll hint.
- Editor supports: **show/hide** per button, rich text on labels, **colors**, **action dropdown** backed by editable **`buttonOptions`** (e.g. go to payment, book appointment, learn more).
- **Payment URL:** Incomplete `/workshop-payment?id=` is normalized using logistics `workshopId` / defaults when possible.
- **Linktree** “Learn more” default anchor targets **`#lt-services`** (id on the first main link-list block).

### Lead magnet merged into link list

- Standalone **`lead-magnet`** section type is **deprecated** in the editor.
- Popup behavior lives on **`link-list` items** via `leadMagnet: { enabled, title, description, ... }`.
- **Migration:** `migrateDeprecatedLeadMagnetSections` (editor + some runtimes) moves old `lead-magnet` blocks into link-list items or new link-list sections.

### Text adjustment bar (preview font inference)

- **`_tabPreviewTargetSelectors`** maps `(sectionType, fieldName)` to CSS selectors inside the preview iframe.
- **Transformation:** section title rich HTML often lives in **`.tf-title span`** — measuring only `h2.tf-title` misses inline font sizes; selectors were extended for `theme` / `beforeText` / `afterText` where needed.

### Page background (HTML / code mode)

- Code snippets are injected into an **`iframe`** via `srcdoc` (see `page-background-runtime.js` and `preparePageBackgroundEffectSrcdoc` in `page-background-presets.js`).
- In `layout-editor.html`, code mode now has a **structured editor** (`HTML`, `CSS`, `JavaScript`, and newline-separated external library URLs) plus a **raw code fallback**. Structured inputs are compiled back into the existing `content.code` string before preview/save so old runtimes and saved pages stay compatible.
- Custom background animations are now saved **manually** from the page-background editor via **`儲存目前動畫為預設`**. Presets persist in layout-editor config and now preserve structured editor fields (`codeEditorMode`, `codeHtml`, `codeCss`, `codeJs`, `codeLibraryUrls`) instead of collapsing everything to raw code.
- **Mobile viewport:** Wrapper injects viewport meta + minimal reset so effects using `100vw`/`100vh` behave more like a real phone tab.
- There is now an **iframe URL mode** for hosted background pages (for example Linktree cosmic at `backgrounds/cosmic-orbit/index.html`) so heavy background code can run isolated from the main page.
- Pitfall: when extracting a background into its own hosted page, do **not** keep the original page-level negative `z-index` on the animation container inside the hosted page itself, or the iframe can load but show only the page's fallback background.

### Toolbar / save

- **Save layout** was moved into the same sticky bar as **Apply changes** and **Save as preset** (between “套用” and “儲存為預設”).
- **Apply** re-renders the edit form so new hero button options show up in dropdowns without a full reload.

### Mobile editor behavior

- Desktop remains a **3-panel** editor, but at **`<=900px`** the layout editor switches to a **single-surface mobile model** instead of trying to show sidebar + form + preview together.
- **Default phone view:** the middle **settings/edit panel** only.
- The old left sidebar (`.panel-left`) is reused as a **mobile `Sections` sheet** opened from a button in the sticky workbar, not from a second floating button.
- The live preview (`#previewPanel`) is reused as a **fullscreen mobile overlay** opened from the phone-only **`Live View`** floating button. Do **not** create a second iframe/runtime for mobile preview.
- Mobile state currently lives in `layout-editor.html` as **`_mobileSectionsOpen`**, **`_mobilePreviewOpen`**, **`_currentPreviewMode`**, with UI syncing handled by **`_syncMobileEditorUi()`**.
- For touch usability, section rows now expose **move up / move down** buttons as a fallback to drag-and-drop. If future section-row actions are added, keep them touch-safe at phone sizes.
- Selecting a section from the mobile `Sections` sheet closes that sheet automatically. Selecting a section from preview click-to-select closes the preview overlay and returns focus to the editor.
- `openAddModal()` now explicitly closes mobile editor overlays first so modal stacks do not fight the mobile sheet/preview surfaces.

### Admin login

- Layout editor uses **Firebase Auth** (`GoogleAuthProvider`, `signInWithPopup` after init).
- If popup login is blocked in some environments, layout editor now falls back to **`signInWithRedirect`**.
- **CSP / extensions:** Host-wide CSP may block random fonts from **browser extensions** (e.g. Perplexity) — harmless noise.
- **ERR_BLOCKED_BY_CLIENT** on `firestore.googleapis.com` is usually **ad blockers**; allowlist the site for CMS use.

---

## Public runtimes (selected)

### `linktree.html`

- **`_layoutDocId`:** default `linktree`; preview uses `initLayoutPreviewBridge`.
- **Hero `applyContent`:** Builds workshop-style DOM (media, badge, title, tagline, `cta-group`, scroll hint).
- **Lead magnet:** WhatsApp/modal pattern generalized per link with `activeWhatsAppModalConfig`.
- **Helpers like `_richTextHtml` / `_escHtml`:** Must be defined **before** code that calls them during first layout pass (ordering bug caused `ReferenceError` historically).
- Linktree's default page background now points at the hosted cosmic iframe page rather than the old inline Three.js block.
- For backward compatibility, Linktree runtime upgrades the old saved `page-background` cosmic **code preset** to the hosted iframe background at runtime.

### Workshop landing (`Kimi_Agent_AI Workshop Landing Page/index.html`)

- Serves **`/workshop-0`** (and clones/slug routes per Firebase rewrites + `resolvePageSlug`).
- Hero `applyContentToSection` extended for **secondary button**, **rich** badge/subtitle, **buttonOptions** resolution, **colors**.
- **`_w0CurrentLayoutSections`** used to resolve payment workshop id from logistics section when needed.

### Consultation page caveat

- **`consultation.html`** may only apply **page background** from layout + meta, **not** full section mounting — editor “sections” there often don’t render on the live page except background. Preview can also race Firestore vs `layoutPreview` message.

---

## Security / hygiene notes

- Preview uses **`postMessage(..., '*')`** in places; no origin checks. Acceptable for local CMS only if you trust the environment; tightening origins would be a future hardening step.

---

## Deploy

- Workspace rule: after hosting-affecting changes, run **`npx firebase deploy`** from project root (user may ask to skip for docs-only).
- Docs-only changes: **no deploy required.**

---

## Related files (bookmark)

| Area | Files |
|------|--------|
| CMS | `layout-editor.html` |
| Linktree | `linktree.html` |
| Workshop 0 template | `Kimi_Agent_AI Workshop Landing Page/index.html` |
| Background | `js/page-background-runtime.js`, `js/page-background-presets.js` |
| Preview bridge | `js/shared-utils.js` |
| Hosting / CSP | `firebase.json` |
| Functions / slugs | `functions/index.js` |

---

*Last aligned with work on: mobile layout editor shell (sections sheet + live preview overlay), page-background manual preset save + structured preset persistence, page-background structured code editor, layout editor login fix (deprecated types order), hero parity linktree/workshop-0, lead-magnet→link-list, text-adjustment selectors, page-background iframe viewport, save button placement.*
