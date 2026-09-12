# Jael Chen — personal site (Komma edition)

English single-page rebuild of the personal site, using [kommakomma.is](https://kommakomma.is) as the reference for layout, type, motion and interaction. Only the content and imagery are mine.

Branches: `original` keeps the previous site untouched; `redesign/komma` is this version.

## Run

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/. Everything is static; no build step.

## Files

- `index.html` — all content. Edit copy here.
- `styles.css` — ported component CSS (loader, underlay nav, button-043, hero, intro, orbit tiles, services, milestones slider, CTA/ASCII, footer).
- `main.js` — motion, ported from the reference: GSAP + ScrollTrigger + SplitText (lines/chars masks), Lenis smooth scroll, the `osmo` ease `cubic-bezier(.625,.05,0,1)`.
- `assets/fonts/` — BDO Grotesk (same face as the reference), SIL OFL 1.1, from [LCTipografi/BDO-Grotesk](https://github.com/LCTipografi/BDO-Grotesk).
- `assets/vendor/` — gsap 3.13 (+ ScrollTrigger, SplitText), lenis 1.3.
- `assets/work/*.webp` — placeholder project posters generated from the project titles. Replace with real screenshots (hero: 1920×1080 primary + hover variant; card: 800×1200).
- `assets/hero-photo.webp`, `assets/about-photo.webp` — used in the "Where I can help" previews and milestones.

## What differs from the reference

- Single page, so no Barba page transitions; the menu and footer links scroll to anchors instead.
- Testimonials became a "milestones" slider with the same mechanics (I have no client quotes to show).
- The WebGL ASCII logo is a 2D-canvas ASCII render of the "JC" monogram; it still follows the pointer.
- No cookie banner: the site sets no cookies and loads no analytics.
