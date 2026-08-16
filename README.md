# Undertone

A drum track, ambient pad, and bass-line set generator. One locked loop: kick through hats, a chord pad, and a bass line that sits on the kick.

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

Sign-in (Google / X) is optional — generation works as a guest. Saved sets stay on the device; a signed-in account also keeps a cloud library.

WAV export renders the current loop offline. Share copies a seed URL.

## Stack

React 19, TanStack Start, Tailwind v4, Web Audio.
