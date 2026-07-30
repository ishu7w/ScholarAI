# Theme — ScholarAI

## Part 1 — Token summary

Tailwind CSS v4 (no `tailwind.config.*`; tokens defined via CSS variables + `@theme inline` in `src/app/globals.css`). Single dark theme only — no `.dark` variant, no light mode.

### Colors (`:root` → Tailwind color names via `@theme inline`)
| Token | Value | Tailwind usage |
|---|---|---|
| `--background` | `#05060a` | `bg-background` (near-black navy) |
| `--surface` | `#0a0c14` | `bg-surface` |
| `--surface-2` | `#10131f` | `bg-surface-2` |
| `--foreground` | `#f4f5f7` | `text-foreground` |
| `--muted` | `#9299ab` | `text-muted` |
| `--border` | `rgba(255,255,255,0.08)` | (raw var; borders usually `border-white/8` or `/10`) |
| `--primary` | `#6d5cff` | `bg-primary` (violet) |
| `--primary-bright` | `#8b7cff` | `text-primary-bright` |
| `--accent` | `#22d3ee` | `text-accent` (cyan) |
| `--success` | `#34d399` | green |
| `--warning` | `#fbbf24` | amber |
| `--danger` | `#f87171` | red |

Signature gradients: brand `linear-gradient(120deg, #8b7cff 0%, #22d3ee 60%, #34d399 100%)` (`.text-gradient`); button `linear-gradient(135deg, #6d5cff, #5a3fe0)`; progress `linear-gradient(90deg, #6d5cff, #22d3ee)`; logo tile `bg-gradient-to-br from-primary to-accent/70`.

### Fonts (Google fonts loaded in `src/app/layout.tsx`)
| Token | Font | Role |
|---|---|---|
| `--font-sans` / `--font-inter` | Inter | body (body sets `font-family: var(--font-inter), system-ui, sans-serif`) |
| `--font-display` / `--font-space-grotesk` | Space Grotesk | headings, logo, stat numbers (applied via `font-[family-name:var(--font-space-grotesk)]`) |
| `--font-mono` / `--font-geist-mono` | Geist Mono | mono |

Type scale: default Tailwind. Common: hero `text-4xl`–`text-6xl` bold Space Grotesk; section h2 `font-semibold`; UI text `text-sm`; labels `text-xs text-muted`; badges 12px/600.

### Spacing / radius / shadows / effects
- Spacing: default Tailwind scale; cards `p-6`, shell `p-5`/`px-6 py-4`, sidebar width `w-64` (mobile drawer `w-72`).
- Radius: `rounded-lg` (8px) small controls, `rounded-xl` (12px) inputs/buttons/nav items, `rounded-2xl` (16px) cards/navbar, `rounded-3xl` (24px) auth card, `rounded-full`/`999px` pills & badges. `.input-premium`/`.btn-*` = 12px.
- Shadows/glows: `.glow-primary` `0 0 40px -8px rgba(109,92,255,0.5)`; card hover `0 20px 50px -20px rgba(109,92,255,0.35)` + `translateY(-4px)`; button hover `0 8px 30px -8px rgba(109,92,255,0.7)`; focus ring `0 0 0 4px rgba(109,92,255,0.15)`.
- Glassmorphism: `.glass` = `rgba(255,255,255,0.04)` + `blur(20px)` + 1px `rgba(255,255,255,0.08)` border; `.glass-strong` = `rgba(16,19,31,0.75)` + `blur(28px)` + `rgba(255,255,255,0.1)` border.
- Backgrounds: `.grid-bg` 64px grid lines at `rgba(255,255,255,0.035)` masked radially from top.
- Motion: easing `cubic-bezier(0.22, 1, 0.36, 1)` recurs (card hover, Framer entrances); keyframes `float` (6s), `pulse-ring`, `shimmer` (`.skeleton`); global `prefers-reduced-motion` kill switch.
- Breakpoints: default Tailwind (`sm md lg ...`); sidebar shows at `lg`, desktop nav at `md`.

### Component utility classes (defined in globals.css, used as design primitives)
`.glass`, `.glass-strong`, `.text-gradient`, `.text-gradient-warm`, `.grid-bg`, `.glow-primary`, `.card-hover`, `.input-premium`, `.btn-primary`, `.btn-ghost`, `.badge`, `.animate-float`, `.skeleton`.

---

## Part 2 — Raw sources

### `src/app/globals.css` (full)

```css
@import "tailwindcss";

:root {
  --background: #05060a;
  --surface: #0a0c14;
  --surface-2: #10131f;
  --foreground: #f4f5f7;
  --muted: #9299ab;
  --border: rgba(255, 255, 255, 0.08);
  --primary: #6d5cff;
  --primary-bright: #8b7cff;
  --accent: #22d3ee;
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-primary: var(--primary);
  --color-primary-bright: var(--primary-bright);
  --color-accent: var(--accent);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --font-sans: var(--font-inter);
  --font-display: var(--font-space-grotesk);
  --font-mono: var(--font-geist-mono);
}

html {
  scroll-behavior: initial;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), system-ui, sans-serif;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: rgba(109, 92, 255, 0.4);
  color: #fff;
}

::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: var(--background);
}
::-webkit-scrollbar-thumb {
  background: #232838;
  border-radius: 8px;
}
::-webkit-scrollbar-thumb:hover {
  background: #303750;
}

/* ---------- shared component classes ---------- */

.glass {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-strong {
  background: rgba(16, 19, 31, 0.75);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.text-gradient {
  background: linear-gradient(120deg, #8b7cff 0%, #22d3ee 60%, #34d399 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.text-gradient-warm {
  background: linear-gradient(120deg, #f4f5f7 20%, #8b7cff 80%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.grid-bg {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
}

.glow-primary {
  box-shadow: 0 0 40px -8px rgba(109, 92, 255, 0.5);
}

.card-hover {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s, box-shadow 0.3s;
}
.card-hover:hover {
  transform: translateY(-4px);
  border-color: rgba(139, 124, 255, 0.35);
  box-shadow: 0 20px 50px -20px rgba(109, 92, 255, 0.35);
}

.input-premium {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  color: var(--foreground);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.input-premium::placeholder {
  color: #5b6172;
}
.input-premium:focus {
  border-color: rgba(139, 124, 255, 0.6);
  box-shadow: 0 0 0 4px rgba(109, 92, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #6d5cff, #5a3fe0);
  color: #fff;
  font-weight: 600;
  border-radius: 12px;
  padding: 12px 24px;
  cursor: pointer;
  border: 1px solid rgba(139, 124, 255, 0.5);
  transition: box-shadow 0.25s, filter 0.25s;
}
.btn-primary:hover {
  filter: brightness(1.12);
  box-shadow: 0 8px 30px -8px rgba(109, 92, 255, 0.7);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--foreground);
  font-weight: 500;
  border-radius: 12px;
  padding: 12px 24px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s, border-color 0.2s;
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-14px); }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s infinite;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### `postcss.config.mjs` (full)

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### Font loading — `src/app/layout.tsx` (excerpt)

```tsx
import { Inter, Space_Grotesk, Geist_Mono } from "next/font/google";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
```

No `tailwind.config.ts/js` exists (Tailwind v4 CSS-first configuration). No theme provider / dark-mode toggle — the app is permanently dark.
