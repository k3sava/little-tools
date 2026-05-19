# Three Design Languages — Implementation Plan
**Sites:** tools.iamkesava.com · toys.iamkesava.com · apps.iamkesava.com  
**Themes:** glass (Apple iOS/macOS) · material (Google M3) · metro (Microsoft Fluent 2)  
**Standard:** better than Apple/Google/Microsoft's own apps at applying design intent  
**Date:** 2026-05-19

---

## What "fully new global theme" means

CSS token overrides alone are **not** sufficient. Each design language requires:

| Layer | Glass | Material | Metro |
|-------|-------|----------|-------|
| **Navigation** | Large title + bottom tab bar (iOS HIG) | Navigation rail 72px + mobile nav bar | Pivot control + command bar |
| **Layout** | Full-bleed canvas, floating panels | Content pane + nav rail + bottom sheet | Content + left nav pane |
| **Interactive elements** | Spring physics, haptic-like scale | Ripple effect, state layers | Reveal highlight, 83ms transitions |
| **Controls panel** | Grouped table view (iOS Settings style) | List items with 48px touch targets | Compact list 32px rows |
| **Buttons** | Capsule + blur (tinted glass) | Filled / Outlined / Text variants | Default / Accent / Command bar |
| **Inputs** | Frosted, rounded-xl, no label above | Filled (underline) or Outlined | Simple border, compact |
| **Modals** | Half-sheet from bottom, spring easing | Bottom sheet or dialog, decelerate | Fly-out panel or content dialog |
| **Typography** | SF Pro Display 34px large title | M3 Display/Headline/Title scale | Segoe UI Variable, body 14px |
| **Motion** | spring cubic-bezier(0.34,1.56,0.64,1) | Emphasized decelerate (0.05,0.7,0.1,1) | Brisk 83ms linear |

---

## Phase 0 — CSS Foundation ✅ DONE
- Tokens: `--kami-*` vars per theme in globals.css
- Structural CSS: panels, sliders, typography, cards
- Toy effect pages: `theme-patch.css` injected via aggregate-toys.mjs
- Toy homepages: `_chrome/chrome.css` overrides for home-grid, pix-card

---

## Phase 1 — Navigation Architecture JSX (Current)

### 1a. tool-shell.tsx structural additions

**Glass:**
- ✅ Large title block below header (done)
- ❌ **Bottom tab bar** — mobile iOS-style: Home · Search · Recent · Theme (4 tabs, 49px)
- ❌ **Grouped panel** — iOS Settings-style grouped card for controls panel

**Material:**
- ✅ Navigation rail (done, 4 items)
- ❌ **Ripple effect** — JS event delegation at shell level, 300ms decelerate
- ❌ **Mobile navigation bar** — bottom 80px with Home/Design/Dev/Text/PDF icons
- ❌ **M3 FAB** — FilledButton variant, elevated, bottom-right of canvas

**Metro:**
- ❌ **Pivot control** — horizontal tab row below header, Segoe UI 15px, underline indicator
- ❌ **Command bar** — right-aligned labeled icon buttons (Save, Share, Help) in header
- ❌ **Breadcrumb separator** — `>` style, not `·`

### 1b. tools hub page (hub-content.tsx)

**Glass:**
- Hero search bar centered, 540px wide, frosted glass, SF Pro, 50px height
- Category chips below search (scrollable horizontal)
- Tool grid: 340px min, 24px gap, glass cards with 18px radius
- Large display title "little tools" 48px SF Pro Display

**Material:**
- M3 search bar at top, filled style with leading icon
- Navigation rail on left for collection filtering (Desktop)
- Tool grid: filled cards, 12px radius, tonal surface
- Headline M3 typography

**Metro:**
- Search box flat, 32px, full-width top
- Pivot tabs: All · Design · Dev · Text · PDF · Other
- Tool list: compact tiles, 40px rows on desktop
- No decorative radius

---

## Phase 2 — Component Library Per Theme

### 2a. Button system
Each theme needs its own button visual AND layout:
- **Glass:** `border-radius: 20px`, `backdrop-filter: blur(8px)`, `rgba(255,255,255,0.55)`, color `#007aff`, spring hover scale
- **Material Filled:** `background: #6750a4`, white text, `border-radius: 20px`, ripple
- **Material Outlined:** `border: 1px solid #cac4d0`, color `#6750a4`, ripple
- **Material Text:** no border/bg, color `#6750a4`, ripple
- **Metro Default:** `border: 1px solid #8a8a8a`, `border-radius: 2px`, 83ms reveal
- **Metro Accent:** `background: #0078d4`, white text

### 2b. Input system
- **Glass:** `border-radius: 12px`, `backdrop-filter`, placeholder `rgba(60,60,67,0.3)`, no visible label
- **Material Filled:** `background: #f5f0ff`, underline only, floating label
- **Material Outlined:** full border, label cutout
- **Metro:** `border: 1px solid #8a8a8a`, `border-radius: 2px`, label above

### 2c. Switch / Toggle
- **Glass:** iOS toggle switch (34×20px, spring thumb), `#34c759` on-color
- **Material:** M3 switch (52×32px), thumb with icon
- **Metro:** Windows toggle (40×20px), flat, `#0078d4` track

### 2d. Select / Dropdown
- **Glass:** picker sheet from bottom on mobile; inline popover desktop
- **Material:** filled dropdown menu, 8px elevation shadow
- **Metro:** ComboBox style, flat border, chevron icon

---

## Phase 3 — Per-Tool Layout Redesign

Priority order (by traffic/visibility):

**Batch A — Text tools** (markdown-editor, case-converter, text-diff, find-replace, lorem-ipsum):
- Glass: Split pane with frosted sidebar, large input area
- Material: Top app bar + content area + FAB for primary action
- Metro: Pivot with "Input" / "Output" / "Options" tabs

**Batch B — Design tools** (color-converter, gradient, glassmorphism, palette, border-radius, box-shadow):
- Glass: Canvas fills left, floating control sheet bottom-right
- Material: Canvas + navigation rail for tool selection + controls panel
- Metro: Command bar with tool options, canvas full-width

**Batch C — Dev tools** (json-formatter, regex-tester, base64, uuid-generator, hash-generator):
- Glass: Monaco-editor-style input, output below, frosted toolbar
- Material: Code surface, elevated toolbar, chip filters
- Metro: Splitpane, flat toolbar, Fluent monospace

**Batch D — PDF tools** (pdf-compress, pdf-merge, pdf-split):
- Glass: Drop zone as frosted card center, output cards below
- Material: Drop zone as dashed outlined container, filled action buttons
- Metro: File picker style, flat, command bar

**Batch E — Utility tools** (qr-code, timestamp, url-encoder, uuid-generator, word-frequency, year-progress):
- Glass: Single card, centered, spacious
- Material: M3 card with filled button
- Metro: Compact flat layout

---

## Phase 4 — Toy Effect Pages Structural HTML

For wordart/pixart effect pages (static HTML, modified via aggregate-toys.mjs):

**Glass:**
- `.wa-top` becomes a floating pill (center-fixed, 44px)
- `.wg` panel becomes a bottom sheet on mobile, right drawer on desktop
- Canvas fills full viewport, beautiful gradient backdrop

**Material:**
- `.wa-top` becomes full-width top app bar with title + icons
- `.wg` panel becomes a navigation drawer (left on desktop)
- M3 search bar in header for effect search

**Metro:**
- `.wa-top` becomes a command bar (44px, with labeled buttons)
- `.wg` panel stays right, Acrylic, compact Pivot for panel sections
- Pivot tabs: "Controls" / "Export" / "Help"

---

## Phase 5 — Aggregator Pages (designkit, devkit, textkit, pdfkit)

These are collection landing pages. Per theme:
- **Glass:** Hero with gradient backdrop, tool cards as glassmorphism cards
- **Material:** Top app bar + collection header chip + M3 card grid
- **Metro:** Pivot navigation + tile grid with Fluent hover reveal

---

## Phase 6 — apps.iamkesava.com (kami/web)

The master apps listing page. Per theme:
- **Glass:** Full-bleed hero, frosted site cards, SF Pro Display 48px headline
- **Material:** M3 navigation rail on left, card grid, headline scale
- **Metro:** Hero with accent color banner, tile grid

---

## Execution order

Each phase is a separate session. Within a session, use 2-3 parallel agents:
- Agent A: JSX/TSX changes (tool-shell.tsx, hub-content.tsx)
- Agent B: CSS (globals.css propagation)
- Agent C: Verification (Playwright screenshots, computed styles)

**Session 1 (current):** Phase 1a — Metro Pivot + Material Ripple + Glass Bottom Tab Bar in tool-shell.tsx  
**Session 2:** Phase 1b — hub-content.tsx redesign per theme  
**Session 3:** Phase 2 — Component library (button, input, switch, select)  
**Session 4:** Phase 3 Batch A — Text tools  
**Session 5:** Phase 3 Batch B/C/D/E — Remaining tools  
**Session 6:** Phase 4 — Toy effect pages structural HTML  
**Session 7:** Phase 5/6 — Aggregator + apps pages  

---

## Quality bar checklist (per component per theme)

- [ ] Typography: correct typeface loaded, correct size/weight/tracking
- [ ] Color: correct surface/on-surface/outline per M3/HIG/Fluent spec
- [ ] Motion: correct easing function and duration
- [ ] Touch targets: 44px (Glass), 48px (Material), 32px (Metro)
- [ ] Focus states: ring/glow correct per design language
- [ ] Hover states: scale (Glass), state layer (Material), reveal (Metro)
- [ ] Mobile: correct nav pattern per design language
- [ ] Dark mode: tokens defined for all three (deferred to Phase 7)
