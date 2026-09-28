# MyShule colour usage

`src/app/globals.css` is the source for semantic colours. Use its Tailwind tokens
in components so authentication, dashboards, mobile navigation and body portals
share the same palette. The TypeScript brand swatches are for brand artwork.

- `primary` / `primary-hover`: main actions and navy emphasis.
- `primary-soft` / `primary-muted`: section headings, record headings and neutral summary cards.
- `accent` / `accent-soft`: warm highlights on light surfaces.
- `sidebar` / `sidebar-active` / `sidebar-muted`: navigation surfaces and secondary navigation text.
- `inverse-accent`: orange highlights on navy surfaces; never use the darker `accent` for small text on navy.
- `success`, `warning`, `danger`, `info`: operational states, each paired with `*-soft` and `*-border`.
- `foreground`, `muted`, `muted-strong`: readable text on light surfaces.
- `focus` / `border-control`: keyboard focus and form boundaries.

Keep the main reading area light, with colour in section headings, navigation,
summary cards and status badges. Pair status colour with visible text or icons.
Metric colour must follow meaning, not a card's position: use `data-tone` on
`app-metric-card` for a semantic state. Do not override the semantic palette on a
workspace root; dialogs and notifications render outside that root.

Run `npm run test:design -- --runTestsByPath tests/design/colour-consistency.test.ts`
and `node tests/design/colour-system-browser.mjs` from `apps/web` when changing
the palette. The browser fixture uses isolated responses, not school records.
