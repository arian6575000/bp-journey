# BP Journey

Offline blood-pressure tracker (Expo SDK 58, React Native, TypeScript, Expo Router, SQLite). English and Urdu (RTL), no account, data stays on the phone.

## Features
- Quick Add (systolic, diastolic, optional pulse) with optional details (date/time, arm, position, time of day, notes)
- Central validation (errors vs data-quality warnings vs emergency flag), safety flow for very high readings
- Home dashboard, History (filters, sorting, paging), Trends (SVG charts, weekly/monthly summaries, distribution)
- Reading details, edit, delete; measurement guide with checklist
- Local reminders (weekly schedules, pause, test), PDF and CSV reports, JSON backup, delete-all
- Light/dark theme, English/Urdu, accessibility labels, large touch targets

## Develop
```bash
npm install --legacy-peer-deps
npm run typecheck
npm run lint
npm test
npx expo start
```

## Build the APK with GitHub Actions
1. Put `unzip.yml` and `android-apk.yml` in `.github/workflows/` (upload the files; do not paste).
2. Upload the project ZIP to the repository root, run **Extract ZIP in Repository Root**; it starts the build.
3. Download the APK from the run's artifacts or from Releases.

## Notes and limits
- Category labels follow the 2017 ACC/AHA adult guideline (`src/domain/classification.ts`). Have all medical copy reviewed by a clinician before public release.
- Data is not separately encrypted by the app. Android cloud backup is disabled.
- Reminders resume after a pause when the app is next opened.
- The release APK is signed with the debug key (installable for testing, not for Play Store).
