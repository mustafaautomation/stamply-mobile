# Stamply mobile

Expo SDK 58 app. Routes live in `src/app`. Domain rules and the data layer live under `src/domain` and `src/data`.

With no `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, the app uses the seeded mock repository. Do not add a service-role key.

Before using an Expo API that may have changed, check the installed `expo` version and the matching docs under `https://docs.expo.dev/versions/v58.0.0/`.

```bash
npx expo install <package>
npm run lint
npm run typecheck
npm test
npx expo export --platform web
npm run test:e2e
```

Do not generate `ios/` or `android/` by hand. Configure native behavior in `app.config.ts`.
