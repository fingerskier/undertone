# Undertone

A drum track, ambient pad, and bass-line set generator. One locked loop: kick through hats, a chord pad, and a bass line that sits on the kick.

A pure client-side PWA — no server, no accounts. Everything runs on Web Audio in the browser, saved sets stay on the device, and it installs to the home screen and works offline.

## Rooms

Night Drive · Warehouse · Dusk · Pulse · Fog · Ritual

Each room changes groove, kit character, and mix. Lock a stem and regenerate the others. Tap drum steps to rewrite the pattern.

## Run

```bash
npm install
npm run dev
```

Then open the app and hit Play. Space starts and stops; `g` generates a new seed.

```bash
npm run typecheck
npm run build
```

WAV export renders the current loop offline. Share copies a seed URL.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml` (set the repository's Pages source to "GitHub Actions"). The build honors `BASE_PATH` for subdirectory hosting.

## Stack

React 19, Vite, Tailwind v4, Web Audio.
