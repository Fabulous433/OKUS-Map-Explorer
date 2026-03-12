# Industrial Skeuomorphism Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the entire OKUS Map Explorer UI from brutalist geometric (black borders / yellow-orange accents) to Industrial Skeuomorphism (neumorphic shadows, chassis grey, physical metaphors) while fixing all Web Design Guidelines violations.

**Architecture:** The redesign is token-driven — Phase 1 replaces CSS custom properties and font loading so every shadcn component automatically shifts appearance. Phase 2 reskins base components (Button, Card, Input). Phase 3 updates layout shells (sidebar, mobile nav). Phase 4 applies page-level refinements. Phase 5 fixes accessibility and polish. No structural React changes needed — this is purely a visual/CSS layer transformation.

**Tech Stack:** React 18, Tailwind CSS 3, shadcn/ui (Radix), Vite 7, lucide-react, wouter, recharts, leaflet

---

## Current State Summary

| Aspect | Current (Brutalist) | Target (Industrial Skeuomorphism) |
|--------|-------------------|-----------------------------------|
| Background | `#ffffff` / `#f9fafb` | `#e0e5ec` (chassis grey) |
| Accent | `#FFFF00` yellow + `#FF6B00` orange | `#ff4757` safety-orange |
| Borders | 2-4px solid black everywhere | Neumorphic shadows (no visible borders) |
| Radius | `rounded-none` (0px) | `4px` – `24px` (soft injection-molded) |
| Shadows | `shadow-[6px_6px_0_0_rgba(0,0,0,0.08)]` | Dual-shadow: `8px 8px 16px #babecc, -8px -8px 16px #fff` |
| Fonts (sans) | Space Grotesk | Inter |
| Fonts (serif) | Archivo Black | *(removed — not needed)* |
| Fonts (mono) | IBM Plex Mono | JetBrains Mono |
| Buttons | Flat, black-bordered, yellow bg | 3D neumorphic, press-down physics |
| Cards | Black-bordered flat panels | Bolted modules with corner screws + vents |
| Inputs | Black-bordered rectangles | Recessed wells with inset shadows |
| Mobile nav | Flat tabs, black borders | Neumorphic tab bar, physical press |

---

## Web Design Guidelines Violations To Fix (Integrated Into Tasks)

| # | Violation | Fix Location | Task |
|---|-----------|-------------|------|
| A1 | `<div>` with click handler inside `<Link>` (should be semantic) | layout.tsx:27, mobile-bottom-nav.tsx:23 | Task 9, 10 |
| A2 | `<label>` without `htmlFor` | login.tsx:91,99 | Task 12 |
| A3 | `<select>` / `<input type="date">` without `name` | dashboard.tsx:155-175 | Task 13 |
| A4 | Icons without `aria-hidden` on decorative icons | layout.tsx:27 | Task 9 |
| F1 | Nav items without visible focus indicator | layout.tsx, mobile-bottom-nav.tsx | Task 9, 10 |
| F2 | Native date/select without custom focus style | dashboard.tsx | Task 13 |
| FM1 | Input `username` without `spellCheck={false}` | login.tsx:92 | Task 12 |
| FM2 | Empty placeholders (should show example with `…`) | login.tsx:92,100 | Task 12 |
| AN1 | Animations without `prefers-reduced-motion` respect | index.css:305 | Task 1 |
| T1 | `"..."` instead of `"…"` (ellipsis char) | layout.tsx:56, login.tsx:107 | Task 9, 12 |
| T2 | Numeric columns without `tabular-nums` | dashboard.tsx | Task 13 |
| P1 | 25+ Google Font families loaded (only 2 needed) | index.html:10 | Task 2 |
| P2 | No `<link rel="preload">` for critical fonts | index.html | Task 2 |
| N1 | Dashboard filters not synced to URL params | dashboard.tsx | Task 13 |
| TI1 | No `touch-action: manipulation` on interactive elements | mobile-bottom-nav.tsx | Task 10 |
| TI2 | `maximum-scale=1` disabling zoom (anti-pattern) | index.html:5 | Task 2 |

---

## Phase 1: Design Tokens & Global Foundation

### Task 1: Replace CSS Custom Properties in `index.css`

**Files:**
- Modify: `client/src/index.css` (entire `:root` and `.dark` blocks + utilities)

**Step 1: Replace `:root` light-mode tokens**

Replace the entire `:root { ... }` block with Industrial Skeuomorphism tokens:

```css
:root {
  /* ── Industrial Skeuomorphism Tokens ── */
  --background: 214 15% 91%;          /* #e0e5ec — chassis grey */
  --foreground: 195 11% 21%;          /* #2d3436 — charcoal ink */
  --border: 216 10% 73%;              /* #babecc — shadow color */
  --card: 214 15% 91%;               /* #e0e5ec — same as chassis */
  --card-foreground: 195 11% 21%;    /* #2d3436 */
  --card-border: 216 10% 73%;
  --sidebar: 216 14% 95%;            /* #f0f2f5 — raised panel */
  --sidebar-foreground: 195 11% 21%;
  --sidebar-border: 216 10% 73%;
  --sidebar-primary: 354 100% 64%;   /* #ff4757 — safety orange */
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 214 17% 84%;     /* #d1d9e6 — muted/recessed */
  --sidebar-accent-foreground: 195 11% 21%;
  --sidebar-ring: 354 100% 64%;
  --popover: 216 14% 95%;            /* #f0f2f5 */
  --popover-foreground: 195 11% 21%;
  --popover-border: 216 10% 73%;
  --primary: 354 100% 64%;           /* #ff4757 — safety orange */
  --primary-foreground: 0 0% 100%;   /* white */
  --secondary: 214 17% 84%;          /* #d1d9e6 */
  --secondary-foreground: 195 11% 21%;
  --muted: 214 17% 84%;              /* #d1d9e6 — recessed */
  --muted-foreground: 215 14% 34%;   /* #4a5568 — WCAG AA compliant */
  --accent: 354 100% 64%;            /* #ff4757 */
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 40%;
  --destructive-foreground: 0 0% 98%;
  --input: 214 17% 84%;
  --ring: 354 100% 64%;
  --chart-1: 354 100% 64%;
  --chart-2: 24 100% 50%;
  --chart-3: 142 71% 45%;
  --chart-4: 214 15% 91%;
  --chart-5: 280 5% 30%;

  --font-sans: Inter, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius: .5rem;

  /* ── Neumorphic Shadow System ── */
  --shadow-card: 8px 8px 16px #babecc, -8px -8px 16px #ffffff;
  --shadow-floating: 12px 12px 24px #babecc, -12px -12px 24px #ffffff, inset 1px 1px 0 rgba(255,255,255,0.5);
  --shadow-pressed: inset 6px 6px 12px #babecc, inset -6px -6px 12px #ffffff;
  --shadow-recessed: inset 4px 4px 8px #babecc, inset -4px -4px 8px #ffffff;
  --shadow-sharp: 4px 4px 8px rgba(0,0,0,0.15), -1px -1px 1px rgba(255,255,255,0.8);
  --shadow-glow-accent: 0 0 10px 2px rgba(255, 71, 87, 0.6);
  --shadow-glow-green: 0 0 10px 2px rgba(34, 197, 94, 0.6);

  /* ── Elevation Overlay (keep existing system working) ── */
  --button-outline: rgba(0,0,0, .06);
  --badge-outline: rgba(0,0,0, .04);
  --opaque-button-border-intensity: -6;
  --elevate-1: rgba(0,0,0, .03);
  --elevate-2: rgba(0,0,0, .06);

  /* ── Legacy shadow overrides (flat → neumorphic) ── */
  --shadow-2xs: var(--shadow-card);
  --shadow-xs: var(--shadow-card);
  --shadow-sm: var(--shadow-card);
  --shadow: var(--shadow-card);
  --shadow-md: var(--shadow-card);
  --shadow-lg: var(--shadow-floating);
  --shadow-xl: var(--shadow-floating);
  --shadow-2xl: var(--shadow-floating);

  --tracking-normal: 0em;
  --spacing: 0.25rem;

  /* ── Border fallbacks ── */
  --sidebar-primary-border: hsl(var(--sidebar-primary));
  --sidebar-accent-border: hsl(var(--sidebar-accent));
  --primary-border: hsl(var(--primary));
  --secondary-border: hsl(var(--secondary));
  --muted-border: hsl(var(--muted));
  --accent-border: hsl(var(--accent));
  --destructive-border: hsl(var(--destructive));
}
```

**Step 2: Replace `.dark` block**

Same structure but with dark adaptations (the industrial style is light-mode primary, dark mode is secondary):

```css
.dark {
  --button-outline: rgba(255,255,255, .08);
  --badge-outline: rgba(255,255,255, .04);
  --opaque-button-border-intensity: 8;
  --elevate-1: rgba(255,255,255, .04);
  --elevate-2: rgba(255,255,255, .08);
  --background: 200 12% 16%;        /* #2d3436 dark chassis */
  --foreground: 214 15% 91%;        /* #e0e5ec */
  --border: 210 10% 25%;
  --card: 200 10% 18%;
  --card-foreground: 214 15% 91%;
  --card-border: 210 10% 22%;
  --sidebar: 200 10% 14%;
  --sidebar-foreground: 214 15% 91%;
  --sidebar-border: 210 10% 20%;
  --sidebar-primary: 354 100% 64%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 210 10% 22%;
  --sidebar-accent-foreground: 214 15% 91%;
  --sidebar-ring: 354 100% 64%;
  --popover: 200 10% 18%;
  --popover-foreground: 214 15% 91%;
  --popover-border: 210 10% 22%;
  --primary: 354 100% 64%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 10% 25%;
  --secondary-foreground: 214 15% 91%;
  --muted: 210 10% 22%;
  --muted-foreground: 214 10% 65%;
  --accent: 354 100% 64%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 35%;
  --destructive-foreground: 0 0% 98%;
  --input: 210 10% 30%;
  --ring: 354 100% 64%;
  --chart-1: 354 100% 70%;
  --chart-2: 24 100% 60%;
  --chart-3: 142 71% 55%;
  --chart-4: 210 10% 50%;
  --chart-5: 280 5% 55%;
  --shadow-card: 6px 6px 12px rgba(0,0,0,0.3), -6px -6px 12px rgba(255,255,255,0.03);
  --shadow-floating: 10px 10px 20px rgba(0,0,0,0.4), -10px -10px 20px rgba(255,255,255,0.03);
  --shadow-pressed: inset 4px 4px 10px rgba(0,0,0,0.4), inset -4px -4px 10px rgba(255,255,255,0.03);
  --shadow-recessed: inset 3px 3px 6px rgba(0,0,0,0.3), inset -3px -3px 6px rgba(255,255,255,0.03);
  --shadow-2xs: var(--shadow-card);
  --shadow-xs: var(--shadow-card);
  --shadow-sm: var(--shadow-card);
  --shadow: var(--shadow-card);
  --shadow-md: var(--shadow-card);
  --shadow-lg: var(--shadow-floating);
  --shadow-xl: var(--shadow-floating);
  --shadow-2xl: var(--shadow-floating);
  --sidebar-primary-border: hsl(var(--sidebar-primary));
  --sidebar-accent-border: hsl(var(--sidebar-accent));
  --primary-border: hsl(var(--primary));
  --secondary-border: hsl(var(--secondary));
  --muted-border: hsl(var(--muted));
  --accent-border: hsl(var(--accent));
  --destructive-border: hsl(var(--destructive));
}
```

**Step 3: Update `@layer base` with noise texture + reduced motion**

```css
@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply font-sans antialiased bg-background text-foreground;
    /* Noise texture — simulates matte plastic surface */
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  }

  /* Respect prefers-reduced-motion globally */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

**Step 4: Update mobile utility CSS**

Replace `.mobile-panel-shadow` and `.mobile-nav-shell` with neumorphic variants:

```css
@media (max-width: 1023px) {
  .mobile-panel-shadow {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .mobile-nav-shell {
    box-shadow: 0 -8px 16px #babecc, 0 -2px 4px rgba(0,0,0,0.04);
  }

  .mobile-nav-item {
    transition: transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
                box-shadow 150ms ease,
                color 150ms ease;
  }

  .mobile-nav-item:active {
    transform: translateY(2px);
    box-shadow: var(--shadow-pressed);
  }
}
```

**Step 5: Commit**

```bash
git add client/src/index.css
git commit -m "feat(ui): replace CSS tokens with Industrial Skeuomorphism design system"
```

---

### Task 2: Update Font Loading & Fix HTML Anti-patterns

**Files:**
- Modify: `client/index.html`

**Step 1: Replace massive Google Fonts URL with only Inter + JetBrains Mono**

Replace line 10 (the Google Fonts `<link>`) with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400&family=JetBrains+Mono:wght@400;500;700&display=swap">
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

**Step 2: Fix `maximum-scale=1` anti-pattern (fixes TI2)**

Replace:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
```
With:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#e0e5ec" />
```

**Step 3: Commit**

```bash
git add client/index.html
git commit -m "fix(perf): trim fonts to Inter+JetBrains Mono, fix viewport zoom anti-pattern"
```

---

### Task 3: Update Tailwind Config

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: Update border radius to Industrial Skeuomorphism scale**

```ts
borderRadius: {
  sm: "4px",    /* tight mechanical edges */
  md: "8px",    /* standard controls */
  lg: "16px",   /* large panels */
  xl: "24px",   /* hero components */
  "2xl": "30px", /* oversized containers */
},
```

**Step 2: Remove `--font-serif` references**

In `fontFamily`, remove `serif` line since we no longer use serif headings:

```ts
fontFamily: {
  sans: ["var(--font-sans)"],
  mono: ["var(--font-mono)"],
},
```

**Step 3: Add custom box-shadow utilities**

Add `boxShadow` to the `extend` block:

```ts
boxShadow: {
  card: "var(--shadow-card)",
  floating: "var(--shadow-floating)",
  pressed: "var(--shadow-pressed)",
  recessed: "var(--shadow-recessed)",
  sharp: "var(--shadow-sharp)",
  "glow-accent": "var(--shadow-glow-accent)",
  "glow-green": "var(--shadow-glow-green)",
},
```

**Step 4: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(ui): update tailwind tokens for Industrial Skeuomorphism"
```

---

## Phase 2: Base Component Reskin

### Task 4: Reskin Button Component

**Files:**
- Modify: `client/src/components/ui/button.tsx`

**Step 1: Update `buttonVariants` CVA config**

Replace the entire `buttonVariants` definition:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold uppercase tracking-wide " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 " +
  "transition-all duration-150 cursor-pointer " +
  "active:translate-y-[2px] active:shadow-pressed",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[4px_4px_8px_rgba(166,50,60,0.4),-4px_-4px_8px_rgba(255,100,110,0.4)] border border-white/20 hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground shadow-card border border-destructive-border hover:brightness-110",
        outline:
          "bg-background text-foreground shadow-card border border-transparent hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground shadow-card border border-transparent hover:text-primary",
        ghost:
          "border border-transparent hover:bg-muted hover:shadow-recessed",
      },
      size: {
        default: "min-h-11 px-6 py-2",
        sm: "min-h-9 rounded-md px-4 text-xs",
        lg: "min-h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
```

Key changes:
- `rounded-lg` default (16px injection-molded feel)
- `active:translate-y-[2px] active:shadow-pressed` — physical button press
- `uppercase tracking-wide` — industrial label aesthetic
- `min-h-11` (44px) default — near 48px touch target
- Neumorphic shadow system per variant

**Step 2: Commit**

```bash
git add client/src/components/ui/button.tsx
git commit -m "feat(ui): reskin Button to Industrial Skeuomorphism"
```

---

### Task 5: Reskin Card Component

**Files:**
- Modify: `client/src/components/ui/card.tsx`

**Step 1: Update Card base class**

Replace Card's className:
```tsx
className={cn(
  "shadcn-card rounded-xl bg-background text-card-foreground shadow-card relative",
  className
)}
```

Remove the `border` — depth is communicated through neumorphic shadow alone.

**Step 2: Add optional corner screws + vent slots as Card sub-components**

Add after `CardFooter`:

```tsx
/** Corner screw decoration — place inside Card as first child */
function CardScrews() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-xl"
      style={{
        background: [
          "radial-gradient(circle at 12px 12px, rgba(0,0,0,0.12) 2px, transparent 3px)",
          "radial-gradient(circle at calc(100% - 12px) 12px, rgba(0,0,0,0.12) 2px, transparent 3px)",
          "radial-gradient(circle at 12px calc(100% - 12px), rgba(0,0,0,0.12) 2px, transparent 3px)",
          "radial-gradient(circle at calc(100% - 12px) calc(100% - 12px), rgba(0,0,0,0.12) 2px, transparent 3px)",
        ].join(", "),
      }}
      aria-hidden="true"
    />
  );
}

/** Vent slots decoration — place in CardHeader top-right */
function CardVents() {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-6 w-1 rounded-full bg-muted shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]" />
      ))}
    </div>
  );
}
```

Export: `export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardScrews, CardVents }`

**Step 3: Add hover lift to Card**

```tsx
"transition-all duration-300 hover:-translate-y-1 hover:shadow-floating"
```

**Step 4: Commit**

```bash
git add client/src/components/ui/card.tsx
git commit -m "feat(ui): reskin Card to Industrial Skeuomorphism with screws/vents"
```

---

### Task 6: Reskin Input Component

**Files:**
- Modify: `client/src/components/ui/input.tsx`

**Step 1: Update Input className**

```tsx
className={cn(
  "flex h-14 w-full rounded-lg border-none bg-background px-6 py-2 font-mono text-sm " +
  "shadow-recessed placeholder:text-muted-foreground/50 " +
  "focus-visible:outline-none focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_hsl(var(--accent))] " +
  "disabled:cursor-not-allowed disabled:opacity-50",
  className
)}
```

Key changes:
- `border-none` — depth via shadow only
- `shadow-recessed` — inset neumorphic well
- `font-mono` — data entry terminal aesthetic
- `h-14` (56px) — comfortable input height
- Focus = accent glow ring (simulates LED backlight)

**Step 2: Commit**

```bash
git add client/src/components/ui/input.tsx
git commit -m "feat(ui): reskin Input to recessed Industrial Skeuomorphism well"
```

---

### Task 7: Reskin Badge Component

**Files:**
- Modify: `client/src/components/ui/badge.tsx` (check if exists, else in tailwind utilities)

**Step 1: Find and update Badge**

Search for badge component: `client/src/components/ui/badge.tsx`

Update base classes to use monospace, uppercase, wide tracking:

```tsx
"inline-flex items-center rounded-sm border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] shadow-sharp transition-colors"
```

**Step 2: Commit**

```bash
git add client/src/components/ui/badge.tsx
git commit -m "feat(ui): reskin Badge to industrial stamped label"
```

---

### Task 8: Reskin Table Component

**Files:**
- Modify: `client/src/components/ui/table.tsx`

**Step 1: Update table styles**

- `Table`: Add `font-variant-numeric: tabular-nums` (fixes T2)
- `TableHeader`: `bg-background shadow-recessed` (inset panel header)
- `TableHead`: `font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground`
- `TableCell`: `font-mono text-sm`
- `TableRow`: hover with subtle card shadow

**Step 2: Commit**

```bash
git add client/src/components/ui/table.tsx
git commit -m "feat(ui): reskin Table to industrial data grid with tabular-nums"
```

---

## Phase 3: Layout Shell Redesign

### Task 9: Redesign Backoffice Layout (Desktop Sidebar + Mobile Header)

**Files:**
- Modify: `client/src/pages/backoffice/layout.tsx`

**Step 1: Fix semantic HTML (fixes A1, A4)**

Replace `NavItem` div-inside-Link pattern:

```tsx
function NavItem({ href, label, icon: Icon, match }: (typeof NAV_ITEMS)[number]) {
  const [isActive] = useRoute(match);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 rounded-lg mx-2 my-1
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${isActive
          ? "bg-primary text-primary-foreground shadow-pressed font-bold"
          : "text-foreground shadow-card hover:shadow-floating hover:-translate-y-0.5"
        }`}
      data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span className="font-mono text-sm font-bold flex-1">{label}</span>
      {isActive && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
    </Link>
  );
}
```

**Step 2: Redesign sidebar chrome**

```tsx
<aside className="hidden h-screen w-[260px] flex-shrink-0 flex-col bg-background shadow-[4px_0_16px_#babecc] lg:sticky lg:top-0 lg:flex">
  {/* Header — dark tech panel */}
  <div className="bg-[#2d3436] p-4">
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-2.5 rounded-full bg-[#ff4757] animate-pulse shadow-[var(--shadow-glow-accent)]" aria-hidden="true" />
      <h1 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white">
        BACKOFFICE
      </h1>
    </div>
    <p className="font-mono text-[9px] text-white/50 tracking-widest uppercase mt-1">
      Pajak Daerah OKU Selatan
    </p>
  </div>
  ...
</aside>
```

**Step 3: Fix loading text ellipsis (fixes T1)**

```tsx
// Change "Memuat sesi..." to "Memuat sesi…"
```

**Step 4: Redesign "Kembali ke Peta" as physical button**

Replace the div-inside-Link with:

```tsx
<Link
  href="/"
  className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg mx-2 mb-2 shadow-card
    hover:shadow-floating hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-pressed
    transition-all duration-150 cursor-pointer
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  data-testid="nav-peta"
>
  <Map className="w-5 h-5" aria-hidden="true" />
  <span className="font-mono text-sm font-bold uppercase tracking-wide">Kembali ke Peta</span>
</Link>
```

**Step 5: Update mobile header to dark tech panel**

```tsx
<header className="mobile-panel-shadow sticky top-0 z-40 bg-[#2d3436] px-4 py-3 text-white lg:hidden">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[#ff4757] animate-pulse shadow-[var(--shadow-glow-accent)]" aria-hidden="true" />
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/70">OKUS Backoffice</p>
      </div>
      <h1 className="truncate font-sans text-lg font-bold mt-1" style={{ textWrap: "balance" }}>{pageLabel}</h1>
    </div>
    ...
  </div>
</header>
```

**Step 6: Commit**

```bash
git add client/src/pages/backoffice/layout.tsx
git commit -m "feat(ui): redesign layout to Industrial Skeuomorphism, fix semantic HTML"
```

---

### Task 10: Redesign Mobile Bottom Nav

**Files:**
- Modify: `client/src/components/backoffice/mobile-bottom-nav.tsx`

**Step 1: Fix semantic HTML + add touch optimizations (fixes A1, TI1, F1)**

```tsx
function MobileNavItem({ href, label, icon: Icon, match }: (typeof MOBILE_NAV_ITEMS)[number]) {
  const [isActive] = useRoute(match);

  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5
        touch-action-manipulation transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${isActive
          ? "bg-primary text-primary-foreground shadow-pressed"
          : "shadow-card text-foreground active:translate-y-[2px] active:shadow-pressed"
        }`}
      style={{ touchAction: "manipulation" }}
      data-testid={`mobile-nav-${label.toLowerCase()}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
    </Link>
  );
}
```

**Step 2: Update nav container**

```tsx
<nav
  className="mobile-nav-shell fixed inset-x-0 bottom-0 z-50 bg-background/95 px-3
    pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-md lg:hidden"
  data-testid="mobile-bottom-nav"
>
  <div className="mx-auto flex max-w-3xl items-center gap-2">
    {MOBILE_NAV_ITEMS.map((item) => (
      <MobileNavItem key={item.href} {...item} />
    ))}
  </div>
</nav>
```

**Step 3: Commit**

```bash
git add client/src/components/backoffice/mobile-bottom-nav.tsx
git commit -m "feat(ui): redesign mobile nav to neumorphic tabs, fix accessibility"
```

---

### Task 11: Redesign Map Page Controls

**Files:**
- Modify: `client/src/pages/map-page.tsx`
- Modify: `client/src/components/map/mobile-map-drawer.tsx`

**Step 1: Update desktop control panel**

Replace the left panel styling from `border-[4px] border-black` to:

```tsx
className="absolute left-4 top-4 z-[1000] w-[360px] rounded-xl bg-background shadow-floating p-4 space-y-3"
```

**Step 2: Update map marker icon styling**

```tsx
// Update buildMarkerIcon — change from black box to neumorphic pill
html: `<div style="width:38px;height:38px;border-radius:8px;background:#e0e5ec;display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 6px #babecc,-3px -3px 6px #fff;">
  <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.5px;color:${selected.color}">${selected.label}</span>
</div>`,
```

**Step 3: Update mobile filter button + drawer**

Industrial-style filter button and slide-up drawer with neumorphic styling.

**Step 4: Commit**

```bash
git add client/src/pages/map-page.tsx client/src/components/map/mobile-map-drawer.tsx
git commit -m "feat(ui): redesign map controls to Industrial Skeuomorphism"
```

---

## Phase 4: Page-Level Redesign

### Task 12: Redesign Login Page (+ fix form accessibility)

**Files:**
- Modify: `client/src/pages/backoffice/login.tsx`

**Step 1: Fix form accessibility (fixes A2, FM1, FM2, T1)**

```tsx
<div className="space-y-1.5">
  <label htmlFor="login-username" className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
    USERNAME
  </label>
  <Input
    id="login-username"
    name="username"
    value={username}
    onChange={(event) => setUsername(event.target.value)}
    placeholder="masukkan username…"
    spellCheck={false}
    autoComplete="username"
    data-testid="input-login-username"
  />
</div>

<div className="space-y-1.5">
  <label htmlFor="login-password" className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
    PASSWORD
  </label>
  <Input
    id="login-password"
    name="password"
    type="password"
    value={password}
    onChange={(event) => setPassword(event.target.value)}
    placeholder="masukkan password…"
    autoComplete="current-password"
    data-testid="input-login-password"
  />
</div>
```

**Step 2: Redesign login card to "device" style**

```tsx
<div className="w-full max-w-md rounded-2xl bg-background shadow-floating overflow-hidden">
  {/* Header — dark tech panel with LED */}
  <div className="bg-[#2d3436] p-5">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-floating">
        <LockKeyhole className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h1 className="font-sans text-xl font-bold text-white">BACKOFFICE LOGIN</h1>
        <p className="font-mono text-[10px] text-white/50 uppercase tracking-[0.15em] mt-0.5">
          OKU Selatan Pajak Daerah
        </p>
      </div>
    </div>
  </div>

  {/* Form body */}
  <form onSubmit={handleSubmit} className="p-6 space-y-5">
    ...
    <Button
      type="submit"
      disabled={loginMutation.isPending}
      className="w-full"
      data-testid="button-login-submit"
    >
      <LogIn className="w-4 h-4" aria-hidden="true" />
      {loginMutation.isPending ? "MEMPROSES…" : "MASUK"}
    </Button>
  </form>
</div>
```

**Step 3: Commit**

```bash
git add client/src/pages/backoffice/login.tsx
git commit -m "feat(ui): redesign login page, fix form accessibility issues"
```

---

### Task 13: Redesign Dashboard Page (+ fix state/a11y)

**Files:**
- Modify: `client/src/pages/backoffice/dashboard.tsx`

**Step 1: Fix native inputs (fixes A3, F2, T2)**

Add `name` attributes to all form controls, add custom focus styles:

```tsx
<input
  type="date"
  name="from-date"
  value={fromDate}
  onChange={(event) => setFromDate(event.target.value)}
  className="h-11 rounded-lg bg-background px-3 font-mono text-xs shadow-recessed border-none
    focus-visible:outline-none focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_hsl(var(--accent))]"
  data-testid="input-dashboard-from-date"
/>
```

**Step 2: Add `tabular-nums` to stat cards**

```tsx
<p className="mt-1 font-sans text-2xl font-bold md:text-3xl" style={{ fontVariantNumeric: "tabular-nums" }}>
  {summary.totalWp}
</p>
```

**Step 3: Redesign stat cards as bolted modules**

Each stat card gets `CardScrews` and neumorphic shadow:

```tsx
<Card className="p-4 relative">
  <CardScrews />
  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total WP</p>
  <p className="mt-2 font-sans text-3xl font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
    {summary.totalWp}
  </p>
</Card>
```

**Step 4: Redesign chart container as recessed screen**

```tsx
<Card className="p-4 relative">
  <div className="rounded-lg bg-[#1a1a2e] p-4 shadow-recessed relative overflow-hidden">
    {/* CRT scanlines overlay */}
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        background: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.15) 50%)",
        backgroundSize: "100% 4px",
      }}
      aria-hidden="true"
    />
    <div className="h-[240px] w-full md:h-[300px] relative z-0">
      <ResponsiveContainer>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="periodStart" tick={{ fontSize: 11, fill: "#a8b2d1" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#a8b2d1" }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="createdOp" name="OP Dibuat" stroke="#ff4757" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="verifiedOp" name="OP Terverifikasi" stroke="#22c55e" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
</Card>
```

**Step 5: Sync filter state to URL params (fixes N1)**

```tsx
// Use wouter's useSearch + URLSearchParams to sync fromDate/toDate/groupBy
const search = useSearch();
const params = useMemo(() => new URLSearchParams(search), [search]);

// Initialize state from URL
const [fromDate, setFromDate] = useState(params.get("from") ?? toDateInputValue(fromDefault));
const [toDate, setToDate] = useState(params.get("to") ?? toDateInputValue(today));
const [groupBy, setGroupBy] = useState<"day" | "week">((params.get("groupBy") as "day" | "week") ?? "day");

// Sync back to URL on change
useEffect(() => {
  const newParams = new URLSearchParams({ from: fromDate, to: toDate, groupBy });
  setLocation(`/backoffice?${newParams.toString()}`, { replace: true });
}, [fromDate, toDate, groupBy, setLocation]);
```

**Step 6: Commit**

```bash
git add client/src/pages/backoffice/dashboard.tsx
git commit -m "feat(ui): redesign dashboard with industrial modules + screen effect, fix a11y + URL sync"
```

---

### Task 14: Reskin Data Tables (WP & OP pages)

**Files:**
- Modify: `client/src/pages/backoffice/objek-pajak.tsx`
- Modify: `client/src/pages/backoffice/wajib-pajak.tsx`
- Modify: `client/src/components/backoffice/mobile-op-card.tsx`
- Modify: `client/src/components/backoffice/mobile-wp-card.tsx`

**Step 1: Replace all brutalist border classes**

Search-and-replace across all 4 files:
- `border-[2px] border-black` → remove (use neumorphic shadow from Card)
- `border-[3px] border-black` → remove
- `rounded-none` → remove (let components use their defaults)
- `bg-[#FFFF00]` → `bg-primary`
- `text-[#FFFF00]` → `text-primary`
- `bg-[#FF6B00]` → `bg-primary`
- `bg-black` → `bg-[#2d3436]`
- `font-serif` → `font-sans`

**Step 2: Replace status badges with LED indicators**

```tsx
{/* Active status LED */}
<div className="flex items-center gap-1.5">
  <div className={cn(
    "h-2 w-2 rounded-full",
    isActive ? "bg-green-500 shadow-[var(--shadow-glow-green)]" : "bg-gray-400"
  )} />
  <span className="font-mono text-[10px] uppercase tracking-wide">
    {isActive ? "ACTIVE" : "INACTIVE"}
  </span>
</div>
```

**Step 3: Mobile cards become bolted modules**

Remove all `border-[3px] border-black` and `rounded-none`, let Card defaults apply neumorphic styling.

**Step 4: Commit**

```bash
git add client/src/pages/backoffice/objek-pajak.tsx client/src/pages/backoffice/wajib-pajak.tsx
git add client/src/components/backoffice/mobile-op-card.tsx client/src/components/backoffice/mobile-wp-card.tsx
git commit -m "feat(ui): reskin data tables + mobile cards to Industrial Skeuomorphism"
```

---

## Phase 5: Polish & Final Accessibility

### Task 15: Final Accessibility & Typography Sweep

**Files:**
- All modified files from previous tasks

**Step 1: Verify all `<label>` have `htmlFor`**

Grep across client/src for `<label` without `htmlFor`.

**Step 2: Verify all icon buttons have `aria-label`**

Grep for `size="icon"` or icon-only buttons without `aria-label`.

**Step 3: Verify all decorative icons have `aria-hidden="true"`**

Grep for `<Icon` patterns without `aria-hidden`.

**Step 4: Verify all `"..."` replaced with `"…"`**

Grep for `"..."` or `'...'` patterns in JSX strings.

**Step 5: Verify `prefers-reduced-motion` is respected**

Check that `index.css` has the global media query.

**Step 6: Run full app manually**

```bash
npm run dev
```

Test:
- Desktop sidebar navigation (keyboard tab through all items)
- Mobile bottom nav (touch + keyboard)
- Login form (tab order, focus visible, screen reader)
- Dashboard (filter controls, chart, stat cards)
- Map page (filter panel, markers, drawer)
- Responsive breakpoints (resize from 320px to 1440px)

**Step 7: Commit**

```bash
git add -A
git commit -m "fix(a11y): final accessibility sweep across all components"
```

---

## Dependency Check

No new npm packages needed. All styling is CSS/Tailwind-only. The existing dependencies cover everything:
- `lucide-react` ✓ (icons)
- `framer-motion` ✓ (advanced animations if needed)
- `tailwindcss-animate` ✓ (animation utilities)
- Google Fonts (Inter, JetBrains Mono) — free, already loaded via `<link>`

---

## Visual Reference: Before → After

```
BEFORE (Brutalist)              AFTER (Industrial Skeuomorphism)
┌──────────────────┐            ╭──────────────────╮
│ ████ 2px border  │            │   ░░░ neumorphic  │
│ bg-white         │            │   bg-#e0e5ec      │
│ #FFFF00 accent   │            │   #ff4757 accent  │
│ rounded-none     │            │   rounded-xl      │
│ mono everywhere  │            │   Inter + JBMono  │
│ shadow-[6px_6px] │            │   dual-shadow     │
└──────────────────┘            ╰──────────────────╯
```
