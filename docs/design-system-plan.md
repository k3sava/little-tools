# Design System Implementation Plan
## Three Design Languages Across tools / toys / apps

**Goal:** Rebuild every page, tool, and toy across `tools.iamkesava.com` (55+ tools), `toys.iamkesava.com` (18 toys), and `apps.iamkesava.com` using three design languages to a standard *better* than Apple's, Google's, and Microsoft's own reference apps at applying the intent of the design language.

**Sites:**
- `little-tools` → `tools.iamkesava.com` (GitHub Pages, Next.js build)
- `little-toys` → `toys.iamkesava.com` (GitHub Pages, Next.js + static toy pages)
- `kami/web` → `apps.iamkesava.com` (Vercel, Next.js)

---

## Design Language Specifications

### ◎ Glass — Apple iOS 26 / visionOS / Apple HIG 2025

**Philosophy:** Every surface is a frosted window into a gradient wallpaper. Depth replaces borders. Spring physics replaces linear motion. Hierarchy is spatial, not decorative.

**Structural signature:**
- Gradient wallpaper fixed to viewport: `135deg #c7e0fc → #d8d4fc → #e9d5fb → #fbcfe8 → #bbf7d0`
- Header: floating frosted pill, 8px inset from edges, 18px border-radius, `backdrop-filter: saturate(180%) blur(20px)`
- Large title pattern: hero h1 below header, collapses into nav bar h1 on scroll (IntersectionObserver)
- Panel: detached floating sheet, `border-radius: 20px`, `margin: 8px 8px 8px 0`
- Mobile: bottom sheet (slides up from bottom edge, drag handle at top)
- Navigation: floating pill back button (chevron left), no breadcrumb trail

**Typography — iOS HIG:**
- Nav bar title: 17px / SF Pro / semibold / -0.022em
- Large title: 34px → 40px / SF Pro Display / bold / -0.03em
- Headline: 17px / semibold
- Body: 17px / regular / -0.01em / 1.47 leading
- Callout: 16px / Subhead: 15px / Footnote: 13px / Caption: 12px

**Motion:** Spring `cubic-bezier(0.34, 1.56, 0.64, 1)`, fast 200ms, base 380ms, slow 560ms

**Component signatures:**
- Buttons: full-radius pill (980px), frosted white background, blue text
- Inputs: frosted glass with glow focus ring (4px, `rgba(0,122,255,0.28)`)
- Sliders: 4px translucent track, 22px white thumb with blue shadow, spring on thumb
- Checkboxes: blue filled, rounded-6px, spring check animation
- Cards: `border-radius: 20px`, white 62% opacity, `box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.85)`
- FAB: frosted pill with spring entry
- Modals: sheet from bottom, frosted, spring entry

---

### ◆ Material — Google Material Design 3 (Material You)

**Philosophy:** Dynamic color from a seed. Tonal elevation replaces shadow. State layers communicate interaction. Every surface carries meaning through its tonal relationship to the primary color.

**Structural signature:**
- Background: `#fffbfe` (M3 Surface), warm neutral
- Header: M3 Top App Bar, 64px, `color-mix(in srgb, #6750a4 8%, #fffbfe)` tonal surface
- Navigation rail: on desktop (≥ 1024px), vertical strip 72px wide, icon + label pairs, active indicator pill `#eaddff`
- Panel: M3 navigation drawer style, 256px, `border-right: 1px solid #cac4d0`
- Mobile: bottom navigation bar (icon + label), 80px fixed
- Elevation: via tonal color overlay, not drop shadows

**Typography — M3 Type Scale:**
- Display Large: 57px / 400 / -0.025em (hero sections)
- Display Medium: 45px / 400 / 0
- Headline Large: 32px / 400
- Headline Medium: 28px / 400 (tool titles in header)
- Title Large: 22px / 400 (section headers)
- Body Large: 16px / 400 / 0.01em
- Label Large: 14px / 500 / 0.01em (buttons)
- Label Medium: 12px / 500 / 0.05em (input labels)

**Motion:** Emphasized decelerate `cubic-bezier(0.05, 0.7, 0.1, 1.0)`, fast 100ms, base 200ms, slow 400ms

**Component signatures:**
- Buttons: Filled (primary `#6750a4`), Tonal (`#eaddff`/`#21005d`), Outlined, Text. All `border-radius: 20px`
- Inputs: Filled (surface container `#e7e0ec`, bottom indicator, no outer border)
- Sliders: 4px track, 20px purple thumb, 10px state layer on focus
- Checkboxes: square with rounded-2px, checked = filled `#6750a4`
- Cards: Filled (`color-mix(5% primary)`), Elevated (1dp shadow), Outlined (`1px #cac4d0`)
- FAB: `#eaddff`, 16px radius, centered icon, Extended FAB has text
- Nav Rail: 72px wide, icons 24px, labels 12px / M3 Label Medium
- State layers: `::after` overlay, `currentColor`, `opacity: 0.08` hover / `0.12` active / `0.16` pressed

---

### ▣ Metro — Microsoft Fluent Design 2 / Windows 11

**Philosophy:** Typography IS the design. Content over chrome. Acrylic materials (translucent blur + noise) define surfaces. The 4px grid is law. Interactions are brisk and direct — no spring, no bounce.

**Structural signature:**
- Background: `#f3f3f3` (Windows canvas), `color-scheme: light`
- Header: Command Bar, 44px compact, Acrylic (`rgba(243,243,243,0.82)` + `blur(40px)` + noise texture overlay)
- Left navigation: NavigationView (hamburger toggles 48px icon-only → 280px full, Acrylic background)
- Pivot / Tab Bar: horizontal, below header, 36px tall, active = underline `2px #0078d4`
- Panel: Acrylic surface, flat, dividers replace borders
- Mobile: side drawer (NavigationView collapsed)

**Typography — Fluent Type Ramp:**
- Display: 40px / 600 / -0.01em (hero)
- Title Large: 28px / 600
- Title: 20px / 600
- Subtitle: 20px / 400
- Body Strong: 14px / 600
- Body: 14px / 400
- Caption Strong: 12px / 600
- Caption: 12px / 400

**Motion:** Brisk, direct. Fast 83ms, base 167ms, slow 250ms. Easing `cubic-bezier(0, 0, 0.58, 1.0)` (decelerate only). No spring, no overshoot.

**Component signatures:**
- Buttons: Standard (`#ffffff`, `1px #8a8a8a border`, `4px radius`), Accent (`#0078d4`, no border, `4px radius`)
- Inputs: White bg, `1px #8a8a8a` border, `4px radius`, bottom `2px #0078d4` on focus
- Sliders: 2px flat track `#d1d1d1`, 16px square thumb `#0078d4`, 2px radius
- Checkboxes: Square `2px #8a8a8a` border, checked = `#0078d4` fill + white check
- Cards: White, `1px #d1d1d1` border, `8px radius`, `box-shadow: 0 2px 4px rgba(0,0,0,0.07)`
- AppBarButton: icon 20px + label 12px stacked, 40px × 76px, no border
- Pivot tabs: horizontal row, `14px / 600`, `2px #0078d4` bottom indicator, `36px` height
- Flyout menus: Acrylic, 1px border, `4px radius`, brisk 167ms

---

## Component Inventory & Status

| Component | Glass | Material | Metro | CSS Status | JSX Status |
|---|---|---|---|---|---|
| **Page background** | Gradient wallpaper | `#fffbfe` | `#f3f3f3` | ✅ Done | — |
| **Header / nav bar** | Floating frosted pill | M3 Top App Bar 64px | Command bar 44px | ✅ Done | ⬜ Large title collapse (Glass) |
| **Navigation rail** | Floating back pill | 72px icon+label rail | NavigationView hamburger | — | ❌ Not started |
| **Pivot / tabs** | iOS segment control | M3 primary tabs | Pivot underline | ✅ `.kc-segment` CSS | ❌ Pivot not implemented |
| **Panel / sidebar** | Floating sheet 20px radius | Drawer 256px | Acrylic flat 240px | ✅ Done | ❌ Mobile bottom sheet (Glass) |
| **Tool shell title** | 17px SF Pro semibold | 22px Google Sans 400 | 13px Segoe UI 600 | ✅ Done | ⬜ Large title hero section |
| **Buttons — primary** | Pill 980px, blue, frosted | Filled `#6750a4` 20px radius | Accent `#0078d4` 4px | ✅ Done | — |
| **Buttons — secondary** | Frosted white pill | Tonal `#eaddff` 20px | Standard white 4px | ✅ Done | — |
| **Buttons — icon** | Circle frosted | Outlined circle | Square 4px transparent | ✅ Done | — |
| **Buttons — state layer** | Spring scale | M3 ripple `::after` | Brisk `#0078d4 8%` | ✅ CSS ripple | — |
| **Text inputs** | Frosted glass, glow focus | Filled (bottom indicator) | White outlined, bottom focus | ✅ Done | — |
| **Sliders** | 22px white thumb, spring | 20px purple, decelerate | 16px square, flat 2px track | ✅ Done | — |
| **Checkboxes** | Blue rounded, spring check | `#6750a4` square 2px | `#0078d4` square 2px | ⬜ Basic only | ❌ Custom checkbox JSX |
| **Color pickers** | Frosted swatch card | M3 filled container | Flat white with border | ⬜ Partial | — |
| **File drop zones** | Frosted dashed, blue on drag | M3 dashed outlined container | Flat dashed `#d1d1d1` | ⬜ Partial | — |
| **Cards / tiles** | 20px radius, 62% white, inset highlight | 12px, tonal filled | 8px, white + 1px border | ✅ Done | — |
| **Tile grid density** | 2-col spacious (1024px+) | 4-col dense 12px gap | 4-col tight 8px gap | ✅ Done | — |
| **Modals / dialogs** | Bottom sheet, frosted, spring | M3 dialog, 28px radius | ContentDialog, 8px radius | ⬜ Color only | ❌ Bottom sheet JSX (Glass) |
| **Toasts** | Pill toast, frosted | Snackbar (bottom center) | Info bar (top) | ⬜ Color only | ❌ Per-theme position |
| **Command palette** | Spotlight-style | M3 search bar | WinUI search box | ⬜ Color only | — |
| **Breadcrumbs** | Small pill back button | M3 breadcrumb with `/` | Fluent breadcrumb `>` | ⬜ Color only | ❌ Glass back-button style |
| **Footer** | Frosted pill bar | M3 bottom navigation | Acrylic bottom bar | ✅ Chrome.css done | — |
| **Toy panel widgets** | Frosted panel, spring sliders | M3 outlined inputs | Compact flat grid | ✅ Done | — |
| **Range input (toys)** | White 22px thumb, spring | Purple 20px thumb, M3 | Square 16px, flat | ✅ Done | — |

---

## Page Inventory

### tools.iamkesava.com (little-tools)
**Aggregator pages:** `/` (homepage grid), `/designkit`, `/devkit`, `/textkit`, `/pdfkit`, `/csskit`

**55+ tools — by component complexity:**

**Simple canvas tools** (text in → output out, one panel):
`base64`, `case-converter`, `character-counter`, `cron-builder`, `hash-generator`, `json-formatter`, `jwt-decoder`, `lorem-ipsum`, `regex-tester`, `timestamp`, `url-encoder`, `uuid-generator`, `word-frequency`, `find-replace`, `text-cleaner`, `text-diff`, `markdown-editor`

**Visual output tools** (canvas with preview pane):
`border-radius`, `box-shadow`, `color-converter`, `contrast`, `easing-editor`, `favicon`, `gradient`, `palette`, `screenshot-beautifier`, `scroll-animation`, `glassmorphism`, `keyframe-animator`, `og-image`, `qr-code`

**Form-heavy tools** (multiple inputs, structured output):
`ab-test-calculator`, `aeo-readiness-scorer`, `caffeine`, `comparison-table`, `content-brief-builder`, `email-signature`, `feature-benefit-mapper`, `flexbox`, `fonts`, `flow`, `invoice-generator`, `link-in-bio`, `meeting-cost`, `meta-tag-generator`, `positioning-builder`, `real-age`, `rice-calculator`, `schema-generator`, `seo-content-analyzer`, `readability-scorer`, `headline-analyzer`, `release-notes-formatter`, `passage-audit`, `utm-builder`, `year-progress`

**File-processing tools** (upload → transform → download):
`file-converter`, `image-converter`, `pdf-compress`, `pdf-merge`, `pdf-split`, `video-converter`, `pdf-kit`

### toys.iamkesava.com (little-toys)
**Next.js aggregator:** `/` (section grid)

**18 toys:**
`wordart` (24 typography effects), `pixart` (65 image effects), `poster` / `poster-maker`, `kaleidoscopic`, `gravity-type`, `particle-life`, `plink`, `sonicc` (music playground), `stem-studio`, `string-art`, `synth-pad`, `zen-garden`, `aurora`, `aurea`

### apps.iamkesava.com (kami/web)
**Aggregator only:** `/` (3-col listing of tools + toys + apps)

---

## Multi-Agent Session Plan

### What can run in PARALLEL
Each design language is fully independent CSS/JSX. Three agents can work simultaneously:
- **Agent Glass** — All Glass-specific work
- **Agent Material** — All Material-specific work
- **Agent Metro** — All Metro-specific work

Within each theme, tools can be batched:
- **Agent Tool-Batch-A** — Simple canvas tools (17 tools)
- **Agent Tool-Batch-B** — Visual output tools (14 tools)
- **Agent Tool-Batch-C** — Form-heavy tools (25 tools)
- **Agent Tool-Batch-D** — File-processing tools (7 tools)
- **Agent Toys** — All 18 toys (static HTML pages)

---

## Phase Breakdown

### Phase 0 — Foundation (COMPLETE)
- [x] CSS token layer: `--kami-*` custom properties for all 3 themes
- [x] THEMES array update (5 → 8) in all theme switchers
- [x] chrome.css: header/footer per-theme color overrides
- [x] theme-tokens.css: toy panel per-theme variables
- [x] Vercel gh-pages build fix

### Phase 1 — Structural CSS (COMPLETE)
- [x] Floating header: Glass (8px inset, 18px radius)
- [x] Header heights: Material 64px, Metro 44px
- [x] Typography scale: iOS HIG / M3 / Fluent type ramps
- [x] Grid density: Glass 2-col, Material+Metro 4-col with correct gap
- [x] Range inputs: custom per-theme track/thumb/easing
- [x] Spring easing: Glass all interactive elements
- [x] State layer ripple: Material `::after` on buttons
- [x] Acrylic panel: Metro backdrop-filter
- [x] Accent dot: theme-appropriate color + shape

### Phase 2 — JSX Shell Restructuring (NEXT)

**2A — tool-shell.tsx: Large Title (Glass)**
- Add IntersectionObserver on sentinel below header
- When sentinel exits viewport: header title becomes visible, large title fades
- When sentinel enters viewport: large title shows, header title becomes transparent
- Large title: 34–40px, SF Pro Display, below floating header, generous padding

**2B — tool-shell.tsx: Navigation Rail (Material)**
- On `data-theme="material"` + desktop (≥1024px): inject 72px rail alongside panel
- Rail items: [Home icon → /], [collection icons → /designkit, /textkit, etc.]
- Active indicator: `#eaddff` pill behind active icon
- FAB position: top of rail, `#eaddff` background

**2C — tool-shell.tsx: Command Bar + Pivot (Metro)**
- Compact action buttons with text labels visible (not icon-only)
- AppBarButton: icon 20px + label 12px stacked, 76px wide
- Breadcrumb → styled as Fluent breadcrumb with `›` separators

**2D — Checkbox + Toggle redesign**
- Custom checkbox JSX component: per-theme styled natively
- Glass: `border-radius: 6px`, blue fill, spring check SVG
- Material: `border-radius: 2px`, `#6750a4` fill, M3 checkmark
- Metro: `border-radius: 2px`, `#0078d4` fill, white check, 1px border

**2E — Toast / notification per-theme**
- Glass: frosted pill, bottom center, spring slide-up
- Material: Snackbar, bottom-left, `#1c1b1f` bg, 200ms decelerate
- Metro: Info bar, top below command bar, `#fff` bg, `1px #d1d1d1` border

### Phase 3 — Tool-Specific Canvas Layouts
For each tool: override the canvas area padding, max-width, content alignment per theme.

**Glass canvas:** wide max-width (960px+), generous padding (32px), centered card with frosted background
**Material canvas:** full-width with 16px padding, tonal surface sections
**Metro canvas:** full-width with 12px padding, flat dividers between sections

**Priority tools (highest traffic / most visual):**
1. `meeting-cost` — dual panel (inputs left, output right)
2. `contrast` — color swatch displays
3. `gradient` — gradient preview canvas
4. `palette` — color chip grids
5. `fonts` — typography preview
6. `easing-editor` — animation canvas
7. `og-image` — image preview card
8. `markdown-editor` — split-pane editor

### Phase 4 — Toy Panel Redesign
The toys (wordart, pixart, poster) use `.wg-body` / `.wg-row` panel structures with heavy slider use.

**Per-theme work for each toy:**
- Panel background: Glass frosted / Material surface container / Metro Acrylic
- Widget rows: Glass spacious (28px row height) / Material M3 list-item (48px) / Metro compact (32px)
- Section headers `.wg-head`: Glass: 13px SF Pro semibold / Material: 12px Label Medium uppercase / Metro: 12px Caption
- Export buttons: per-theme primary button shape

### Phase 5 — Aggregator Page Redesign
Homepage sections for all three sites need per-theme layout:

**Glass homepage:**
- Hero section: large display title (40px, -0.03em), subtitle 17px, frosted card CTA
- Tool grid: 2-col, 200px+ min-height tiles, frosted cards, spring hover
- Section dividers: gradient lines with opacity

**Material homepage:**
- Hero section: Display Large (57px, 400 weight), subtitle Body Large 16px
- Tool grid: 4-col dense, M3 filled cards with tonal surfaces
- Section chips: M3 Assist Chip for category filters

**Metro homepage:**
- Hero section: Display (40px / 600), compact subtitle 14px
- Tool grid: 4-col tight 8px gap, flat white cards with 1px border
- Section headers: Pivot-style horizontal tab labels for category

### Phase 6 — QA, Polish, Accessibility
- Test all themes on mobile (375px, 390px, 428px viewport)
- Verify WCAG 2.1 AA contrast for all text colors in all themes
- Animate theme transitions: 300ms ease on `background-color`, `color`, `border-color`
- Dark mode: Material adds `dark` color scheme variant
- Verify keyboard navigation in all themes
- Performance: ensure backdrop-filter not applied on low-power devices

---

## Success Criteria per Design Language

### Glass: "Better than iOS 26"
- [ ] Every surface is either the gradient wallpaper or a frosted layer above it
- [ ] Large title collapse on scroll in every tool
- [ ] All interactive elements use spring easing (no linear, no ease-in-out)
- [ ] Mobile: controls in bottom sheet (not sidebar)
- [ ] All radius values follow Apple HIG: 6px checkboxes, 12px inputs, 18px header, 20px cards, 980px pills
- [ ] Typography uses actual iOS HIG size scale throughout
- [ ] Color is exclusively blue (#007aff) for interactive, never purple or green

### Material: "Better than Google's own M3 showcase apps"
- [ ] Navigation rail present on desktop for tools with navigation
- [ ] Every button follows M3 hierarchy: Filled > Tonal > Outlined > Text
- [ ] All color values derived from #6750A4 seed via M3 tonal palette
- [ ] State layers (`::after` opacity) on every interactive element
- [ ] Motion strictly uses emphasized decelerate easing
- [ ] No hard drop shadows — only tonal color elevation

### Metro: "Better than WinUI 3 gallery"
- [ ] Pivot / tab bar replaces breadcrumb on tool pages
- [ ] All spacing on 4px grid (8/12/16/20/24/32/40/48px)
- [ ] AppBarButton pattern: icon + label stacked, compact
- [ ] Acrylic on header and panel (backdrop blur with subtle noise layer)
- [ ] All motion under 250ms, no spring, no bounce
- [ ] Typography uses Segoe UI Variable text weight axis at every scale

---

## File Map

```
little-tools/
  src/
    app/globals.css          ← token + structural CSS (Phases 0–1 done)
    components/
      tools/tool-shell.tsx   ← Phase 2A/2B/2C (JSX shell restructuring)
      ui/checkbox.tsx        ← Phase 2D (custom checkbox)
      ui/toast.tsx           ← Phase 2E (per-theme toast)
  docs/
    design-system-plan.md   ← THIS FILE

little-toys/
  public/
    _chrome/
      chrome.css             ← Phase 0 done; Phase 4 toy-panel work
      theme.js               ← THEMES array (done)
    wordart/shared/
      theme-tokens.css       ← Phase 4 (panel, slider redesign)
    pixart/shared/
      theme-tokens.css       ← Phase 4
    poster/shared/
      theme-tokens.css       ← Phase 4
  src/app/globals.css        ← aggregator pages (Phase 5)

kami/web/
  src/app/globals.css        ← Phase 5 aggregator redesign
```

---

## Execution Order (Current Session)

1. ✅ Write this plan document
2. 🔄 Phase 2A: Large title (Glass) in tool-shell.tsx
3. 🔄 Phase 2B: Navigation rail (Material) in tool-shell.tsx
4. 🔄 Phase 2C: Command bar labels (Metro) in tool-shell.tsx
5. 🔄 Phase 2D: Custom checkbox per-theme
6. 🔄 Phase 2E: Toast positioning per-theme CSS
7. 🔄 Phase 3: Priority tool canvas layouts (meeting-cost, contrast, gradient)
8. 🔄 Phase 4: Toy panel widget density overrides
9. 🔄 Phase 5: Homepage hero section per-theme
