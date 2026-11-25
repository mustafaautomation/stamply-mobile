# Stamply mobile

Live URL target: https://stamply-app.quvantic.com

Local web (dev): http://127.0.0.1:43123

## Build

```bash
npm install
npm run export:web
```

`npx expo export --platform web` writes a single-page app to `dist/`. Serve it with `npx serve dist -l 4173 -s`.

Native builds use `eas.json` profiles `development`, `preview`, and `production`. Do not run a paid EAS build from CI.

```bash
npx eas-cli@latest build --profile preview --platform android
```

## Env vars

All optional. With none set, the app uses the seeded on-device demo.

- `EXPO_PUBLIC_SUPABASE_URL` — shared Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — anon key only; never a service-role key
- `EXPO_PUBLIC_EAS_PROJECT_ID` — only for a real Expo push token

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run export:web
npm run test:e2e
```

CI: `.github/workflows/ci.yml` on `ubuntu-latest`. No secrets. Playwright is `@playwright/test` >= 1.65.1.

Maestro device flows: `.maestro/`.

Identifiers: `com.quvantic.stamply`, scheme `stamply`.
