# AGENTS.md

## Cursor Cloud specific instructions

### What this is
Static frontend site (no backend, no build step) — a Spanish-language quotation
("cotización") system for Formas.shop. Pages: `detalle-cotizacion.html`,
`editItem.html`, `editItem-generico.html`, with logic in `js-scripts/` and styles
in `styles/` + `detalle-cotizacion.css`. The only npm dependency is Playwright,
used solely by the dev-only screenshot tool `capture-comparison.mjs`.

### Running the app (dev)
- Serve the repo root over HTTP and open `detalle-cotizacion.html`, e.g.
  `python3 -m http.server 8765` then `http://127.0.0.1:8765/detalle-cotizacion.html`.
- Must be served over HTTP, not opened via `file://`: scripts `fetch()`
  `products-data.json`, which fails under `file://`.
- Requires internet access: Bootstrap, Bootstrap Icons, Font Awesome, Google
  Fonts, and SortableJS are loaded from CDNs.

### Lint / test / build
- No build step (plain HTML/CSS/JS).
- No linter configured.
- No real tests: `npm test` is the default placeholder and intentionally exits 1.

### Screenshot comparison tool (dev only)
- `node capture-comparison.mjs` expects a sibling `../Cotizacion v4` directory
  that does NOT exist in this repo, so its V4 capture step fails. It is a
  visual-diff helper and is not required to run or develop the app.
