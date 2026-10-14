# TimeStamper

A progressive web app for logging the exact time each phase of a movement happens (fixed wing, rotor wing, ground), shown in the time zone where the case started. Everything stays on the phone.

- Glossary: [CONTEXT.md](CONTEXT.md)
- Build spec: [docs/spec.md](docs/spec.md)
- Decisions: [docs/adr/](docs/adr/)

## Files

| Path | What it is |
|---|---|
| `index.html`, `styles.css` | Page shell and all styling, including the five palettes |
| `js/app.js` | Screens (Log, Review, Settings), sheets and event handling |
| `js/model.js` | Case and Entry rules: pure functions, tested in node |
| `js/time.js` | Time zone display helpers |
| `js/store.js` | On-device storage (`localStorage`, key `timestamper.v1`) and the persistent-storage request |
| `sw.js` | Service worker: caches the whole app for offline use |
| `manifest.webmanifest`, `icons/` | Home-screen install |
| `fonts/` | Atkinson Hyperlegible Next and Mono (SIL Open Font License 1.1, from Google Fonts), self-hosted so the app works offline |

No framework and no build step: the files are served as they are.

## Run locally

```sh
npm run serve      # http://localhost:8080
npm test           # unit tests for the case rules and time handling (node 20+)
```

The service worker only runs over `http://localhost` or `https://`.

## Releasing a change

Bump `VERSION` in `sw.js` whenever any app file changes. Installed phones only fetch new files when `sw.js` itself changes. They pick up the new version the next time the app is opened.

## Hosting

GitHub Pages, serving the repository root of `main`. All paths are relative, so it works at `https://<user>.github.io/<repo>/`.
