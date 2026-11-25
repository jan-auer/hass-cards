# Development

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

1. `npm version <x.y.z> --no-git-tag-version`, commit, push, and wait for CI to pass.
2. `git tag v<x.y.z> && git push origin v<x.y.z>`: the release workflow creates the release with `hass-cards.js` attached.
