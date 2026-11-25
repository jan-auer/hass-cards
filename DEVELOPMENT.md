# Development

Vite · Lit · TypeScript · Biome · Vitest (jsdom for logic, WebKit via Playwright for rendering). Node ≥ 22.22.2.

```bash
npm install
npx playwright install webkit
```

| Script                     | What it does                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run build`            | Bundle in `dist/hass-cards.js`.                                                             |
| `npm run lint`             | Biome check and `tsc --noEmit`.                                                             |
| `npm run format`           | Biome format and safe fixes.                                                                |
| `npm test`                 | `*.test.ts` in jsdom, `*.browser.test.ts` in headless WebKit.                               |
| `npm run screenshots`      | README images from demo data (light and dark).                                              |
| `npm run screenshots:live` | README images for room tile and vacuum, from the live dashboard, with stand-in room photos. |

`screenshots:live` reads `HA_URL` and `HA_TOKEN` from the environment, this repo's `.env`, or the file in `HA_ENV_FILE`.

## Releasing

HACS installs from GitHub releases, not tags. The tag is `v` plus the version in `package.json`.

1. `npm version <x.y.z> --no-git-tag-version`, commit as `Release v<x.y.z>`, push, wait for CI and HACS validation.
2. `gh release create v<x.y.z> --title v<x.y.z> --generate-notes`, then trim the notes to what changed per card, breaking config changes first.
3. The release workflow checks the tag, runs lint and tests, builds and attaches `hass-cards.js`, which is the file HACS downloads.
