# Duducare design system

The root `index.html` is the user's visual reference. The ui-ux-pro-max agriculture
search verified an organic visual direction and compact dashboard hierarchy.
The choices below adapt that guidance to the reference and existing Next.js app.
The generic search's marketing layout and Fira Code heading pairing were rejected:
this is an everyday farmer workspace, with readable sans-serif headings.

## Visual language

Warm cream background, forest green navigation, harvest-gold primary home action,
white rounded cards, restrained borders, and a consistent outlined SVG icon family.
Use the bundled Geist font through next/font; no runtime font request is needed.
Keep headings short and body copy plain. No decorative animation or emoji navigation.

| Role | Token | Value |
| --- | --- | --- |
| Background | `--background` | `#f6f4ec` |
| Text | `--foreground` | `#1c2a22` |
| Surface | `--surface` | `#ffffff` |
| Secondary text | `--muted` | `#59695e` |
| Border | `--line` | `#dce5d8` |
| Forest/action | `--deep` | `#17462f` |
| Green text | `--green` | `#287443` |
| Active sidebar | `--lime` | `#b7dc74` |
| Home action | `--amber` | `#e9a23b` |
| Secondary surface | `--soft` | `#eef4ea` |
| Error text | `--error` | `#a52c24` |

Use dark forest text on amber/lime, white on forest. Accent icon backgrounds
have separately readable dark foregrounds. Secondary text must remain readable.
The implemented theme is light only, including when the OS prefers dark mode.

## Layout and interaction

- Mobile: five labeled bottom tabs, safe-area inset, reserved content clearance.
- Laptop (1024px+): persistent sidebar, account strip and bounded content width.
- Core modules remain independently usable without login; private histories and
  administration enforce backend authentication and role checks.
- 4/8px spacing rhythm, 12–24px card padding, 16–24px card corners. Compact
  density must preserve 44px controls and 16px form text.
- Cards explain one task each. Forms show labels, specific errors, loading and
  retry behavior; location and season must be explicitly selected.
- Every route shows active navigation, supports keyboard use, and focuses main
  content after route changes. Focus rings must remain visible.
- Limit motion to feedback; respect reduced motion. Prefer wrapping to truncation.
- Test at 375px, 768px, laptop size and phone landscape without horizontal scroll.

## Evidence and offline behavior

Demo status stays visible. Never decorate simulated weather as live conditions,
a scripted chat as a live advisor, or user observations as verified advice.
Advice includes location, season, confidence, provenance and a disclaimer.
Service-worker caching is limited to public offline/brand assets; private pages,
API responses and photos must not be cached. Offline navigation explains recovery.
