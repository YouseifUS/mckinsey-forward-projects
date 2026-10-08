# Intention | النية

**Intention** is an Arabic, offline-first habit-building application for Android and iOS. It was the first mobile application I created as a practical result of my personal learning journey in the McKinsey Forward Program.

The application is built around a simple idea:

> Build habits around who you want to become, not only what you want to achieve.

## Download the Android app

[Download Intention v1.0.0 APK](../../releases/intention-arabic-v1.0.0.apk)

The APK supports Android 7.0 and newer on `arm64-v8a` and `armeabi-v7a` devices. It is signed with a testing key for direct installation and evaluation, not for Google Play production publishing.

## Features

- Complete Arabic interface with right-to-left layout.
- Guided seven-step habit creation flow.
- Separate fields for intention and personal meaning.
- Cue → Routine → Reward habit loop.
- Complete or undo today's habit once per local calendar day.
- Current streak, longest streak, and total completion statistics.
- Interactive monthly completion calendar.
- Edit, archive, restore, and permanently delete habits.
- Local SQLite persistence with migrations and duplicate protection.
- Offline-first operation with no account, backend, API key, analytics, or advertisements.
- Supportive language that avoids shame, pressure, and excessive gamification.

## Technology

- React Native
- Expo SDK 57
- TypeScript
- Expo Router
- Expo SQLite
- React Native StyleSheet
- Vitest

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm start
```

Scan the displayed QR code using Expo Go on a device connected to the same network.

### Validation

```bash
npm run validate
```

The validation command runs the automated tests, TypeScript type checking, and Expo linting. The test suite covers habit creation and editing, daily completion and undo, duplicate and future-date prevention, archiving and restoring, completion-history preservation, streak calculations, missed days, year/month boundaries, leap years, and daylight-saving transitions.

## Project structure

```text
src/
  app/          Expo Router screens and navigation
  business/     Local-date and streak calculations
  components/   Reusable mobile UI components
  database/     SQLite schema, migrations, and repositories
  hooks/        Screen data and refresh hooks
  theme/        Design tokens
  types/        Domain models
  utils/        Shared utilities
tests/          Business-logic and persistence tests
```

## Data and privacy

Habit and completion data remain in a SQLite database on the user's device. The app has no authentication, cloud synchronization, advertising, analytics, or external data service.

## License

This project is open source under the repository's [MIT License](../../LICENSE). You may use, copy, modify, publish, distribute, sublicense, or sell the software under the license terms.

## Disclaimer

This is an independent personal learning project created through individual effort. It is **not an official project of McKinsey & Company or the McKinsey Forward Program**, and it is not sponsored, endorsed, reviewed, or maintained by McKinsey & Company.

هذا المشروع اجتهاد شخصي مستقل، وليس مشروعًا رسميًا تابعًا لشركة McKinsey & Company أو برنامج McKinsey Forward، ولا يمثل اعتمادًا أو رعاية من جانبهم.
