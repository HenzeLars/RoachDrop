# 🪳 RoachDrop

A fast, zero-dependency, techno-infused falling-block puzzle game for the browser.
Vanilla ES modules, HTML5 Canvas 2D, and the Web Audio API — no frameworks, no build step, no external assets.

## Play

- **Online (GitHub Pages):** https://<your-username>.github.io/RoachDrop/
- **Locally:** it's a static site, so serve the repo root with any static server, e.g.
  `python3 -m http.server 8042` then open http://localhost:8042/
  (Opening `index.html` directly via `file://` won't work — browsers block ES modules there.)

## Controls

| Action | Keys |
|---|---|
| Move | `←` `→` / `A` `D` |
| Soft Drop | `↓` / `S` |
| Hard Drop | `Space` |
| Rotate CW / CCW | `↑` / `X` · `Z` / `Ctrl` |
| Hold | `C` / `Shift` |
| Pause | `P` / `Esc` |
| Mute | `M` |

## Deploy

Pushes to `main` auto-deploy via `.github/workflows/deploy.yml`.
One-time: repo **Settings → Pages → Source: "GitHub Actions"**.

## Legal

Original assets only. No third-party branding, no tracking, no external requests.
High scores and audio settings stay in `localStorage`.