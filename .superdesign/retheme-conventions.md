# Editions re-theme conventions (site-wide sweep)

The global theme in `src/app/globals.css` has ALREADY been rewritten: paper ground `#E8E6DF`, surface `#DEDBD2`, ink `#151515`, muted `#75736C`, vermilion `#C4442C` (as `--primary`), hairline `rgba(21,21,21,0.16)`. Radius is globally forced to 0. `.glass`, `.btn-primary`, `.btn-ghost`, `.input-premium`, `.badge`, `.text-gradient` (now solid vermilion), `.grid-bg`, `.card-hover`, `.skeleton` all already render in the paper style — markup using them needs no change. Fonts: all headings via `--font-space-grotesk` are now Familjen Grotesk (aliased); body is Spline Sans Mono. `h1–h4` are globally uppercase.

Your job is ONLY to fix things globals cannot reach — hardcoded colors, gradients, glows, shadows, dark-theme assumptions — and to upgrade motion. Judge each occurrence, don't blind-replace.

## Color replacement map (hardcoded values in TSX)

| Old (dark theme) | New |
|---|---|
| `#05060a`, `#0a0c14`, `#10131f` (bg) | `var(--background)` / `var(--surface)` or Tailwind `bg-background` / `bg-surface` |
| `#f4f5f7`, `text-white`, `#fff` on dark | `text-foreground` (`#151515`); on ink-filled elements use `text-background` |
| `#9299ab` | `var(--muted)` |
| `#6d5cff`, `#8b7cff`, `#5a3fe0` (violet) | vermilion `#C4442C` for markers/active/strokes; ink `#151515` for fills |
| `#22d3ee` (cyan) | secondary ink `#494844` |
| `#34d399` (success) | `#4a6741` |
| `#fbbf24` (warning) | `#96762a` |
| `#f87171` (danger) | `#C4442C` |
| `rgba(255,255,255,0.08)` etc. white borders (`border-white/8`, `border-white/10`) | `border-[rgba(21,21,21,0.16)]` (or `hairline` class) |
| `bg-white/4`, `bg-white/5`, `hover:bg-white/5` | `bg-[rgba(21,21,21,0.04)]`, `hover:bg-[rgba(21,21,21,0.05)]` |
| `bg-black/60` (overlay) | `bg-[rgba(21,21,21,0.35)]` |

## Hard rules

1. **NO gradients**: every `bg-gradient-to-*`, `linear-gradient`, `radial-gradient` goes. Logo tiles (`bg-gradient-to-br from-primary to-accent/70`) become `bg-foreground` with the icon `text-background`. Decorative radial glow blobs (`blur-3xl` divs) are DELETED or replaced with a `plate` hatched block if a visual anchor is needed.
2. **NO shadows/glows**: remove `shadow-*`, `glow-primary` (class is now a no-op but remove noisy usages when touching the line anyway), `backdrop-blur-*` decorative usages.
3. **Vermilion is scarce**: only markers (small squares/dots), active states, focus, thin progress fills, and the "AI" wordmark accent (`.text-gradient` handles that). Never large filled areas. Ink fills for buttons/CTAs.
4. **Keep all class names that globals restyles** (`glass`, `btn-primary`, `badge`, …) — don't invent parallel systems. New helpers available: `mono-label`, `hairline`, `hairline-t`, `hairline-b`, `plate`, `text-outline`.
5. **Headlines**: where a page has a big display headline (hero-level), set ONE word outlined via `<span className="text-outline">WORD</span>` — the signature. Don't do it on small card titles.
6. **Charts (recharts)**: series palette in order: `#151515`, `#C4442C`, `#75736C`, `#494844`, `#96762a`, `#4a6741`. Grid/axis stroke `rgba(21,21,21,0.16)`; tick fill `#75736C`; tooltip `contentStyle`: `{ background: "#E8E6DF", border: "1px solid rgba(21,21,21,0.16)", borderRadius: 0, color: "#151515", fontFamily: "var(--font-spline-mono)", fontSize: 11 }`. Pie/bar cells use the palette in order.
7. **Avatar/`hue` props**: our Avatar primitive takes a `hue` — the re-themed primitive will render ink-on-paper; leave `hue` props in place (harmless) unless editing that line anyway.
8. **Motion language** (matches /register and /catalogue):
   - Framer entrances: `initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}` → `animate/whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}`, `transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}`, stagger siblings ~0.09s. Convert existing plain fade/slide entrances to include the blur.
   - GSAP reveals: `gsap.from(el, { opacity: 0, y: 26, filter: "blur(9px)", duration: 0.8, ease: "power3.out", stagger: 0.09 })`.
   - Respect `prefers-reduced-motion` exactly as the existing components do — never remove those guards.
9. **Accessibility**: keep every aria attribute, label, and keyboard handler. `aria-pressed` for toggles.
10. **Don't touch** `/register`, `/catalogue`, `editions.css`, `globals.css`, `layout.tsx` — already done.

## Reference pages (read them for the target feel)
- `src/app/register/page.tsx` — wizard, step squares, hairline dividers
- `src/app/catalogue/page.tsx` — broadsheet layout, ledger rows, mono labels, inspect controls
- `src/app/editions.css` — the canonical style vocabulary
