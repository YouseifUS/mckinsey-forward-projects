# نية | Niyyah

**نية (Niyyah)** is an Arabic, offline-first habit-building application for Android and iOS. It was the first mobile application I created as a practical result of my personal learning journey in the McKinsey Forward Program.

The application is built around a simple idea:

> Build habits around who you want to become, not only what you want to achieve.

## Visual identity

The current interface uses an ivory background, antique-gold controls, deep green panels, subtle eight-point geometric ornament, and a three-leaf sprout mark inspired by daily growth. The app display name is **نية**.

Amiri headings and Tajawal body text are bundled for offline use. Their SIL Open Font Licenses are included in `assets/fonts/`. The editable logo sources are in `assets/images/`.

The app package identifiers and the `intention.db` database name are preserved so the visual update does not create a separate app or reset existing habit data.

## Download the Android app — v2.1.0

[Download نية v2.1.0 APK](https://github.com/YouseifUS/mckinsey-forward-projects/releases/download/intention-v2.1.0/niyyah-v2.1.0.apk)

The v2.1.0 APK adds optional daily habit reminders and includes the gold visual identity and supports Android 7.0 and newer on `arm64-v8a` and `armeabi-v7a` devices. It is signed with a testing key for direct installation and evaluation, not for Google Play production publishing.

[Release notes](./CHANGELOG.md) · [Previous v2.0.0 release](https://github.com/YouseifUS/mckinsey-forward-projects/releases/tag/intention-v2.0.0)

<img src="../../docs/images/niyyah-v2-home.png" alt="نية v2.0.0 — Arabic home screen with gold and Islamic geometric design" width="320" />

## Features

- Complete Arabic interface with right-to-left layout.
- Guided seven-step habit creation flow, with an optional daily reminder on the review screen.
- Separate fields for intention and personal meaning.
- Cue → Routine → Reward habit loop.
- Complete or undo today's habit once per local calendar day.
- Current streak, longest streak, and total completion statistics.
- Interactive monthly completion calendar.
- Edit, archive, restore, and permanently delete habits.
- Choose or change a daily reminder time; receive a local notification titled with the habit name.
- Notification permission requested when enabling a reminder, with a settings link if denied.
- Reminders update on rename/time changes, pause on archive, resume on restore, and cancel on deletion or disabling.
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

### Browser preview

```bash
npx expo start --web
```

The browser preview uses the same screens and SQLite repository. `metro.config.js` supports SQLite WebAssembly and sends the isolation headers required by browser storage. Static web hosting must also send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.

### Daily reminders

Reminders are local notifications scheduled by the device, so they work offline and do not need a push token, backend, or account. Choose a time on the habit creation review screen or in **تعديل العادة**. The notification title is the habit name; tapping it opens the active habit.

The app creates an Android notification channel before requesting permission. If permission is refused, the reminder remains disabled and the user can open device settings or save without a reminder. Saving rechecks permission. On startup and return from settings, the app repairs missing schedules and removes stale ones without asking for permission again. Existing habits receive no reminders until the user enables one; the version 2 database migration preserves habits and completion history.

Android 12+ uses the declared `SCHEDULE_EXACT_ALARM` permission for precise scheduling when the device grants it. If the device has not allowed **Alarms & reminders** (المنبّهات والتذكيرات), Expo falls back to an inexact alarm and delivery may be delayed. The time picker explains this. Device notification settings, Do Not Disturb, and battery restrictions can also affect presentation/delivery. Times use the device's local clock.

The browser preview cannot schedule mobile notifications. The v2.1.0 APK includes `expo-notifications` and the native notification configuration. Rebuilding from source is necessary when adding or changing native modules.

Device acceptance checks (Android and iOS):

1. Enable a reminder and accept the system permission prompt. Pick a time a few minutes ahead, save, and background/close the app. Confirm one notification with the habit name arrives.
2. Deny permission and verify the settings link appears; save with the reminder disabled. Grant permission in settings and return to enable it.
3. Rename the habit or change the time and confirm only the updated notification is scheduled. Confirm foreground presentation and tap navigation, including a cold launch.
4. Disable, archive, or delete the habit and confirm its reminder is cancelled; restore an archived habit and confirm its reminder resumes.
5. Reopen the app, restart the phone, and check schedules persist; check timezone/DST changes on the target devices.
6. On Android 12+, test with Alarms & reminders permission both enabled and disabled, including a device in idle mode.

### Validation

```bash
npm run validate
```

The validation command runs the automated tests, TypeScript type checking, and Expo linting. The test suite covers habit creation and editing, daily completion and undo, duplicate and future-date prevention, archiving and restoring, completion-history preservation, streak calculations, missed days, year/month boundaries, leap years, and daylight-saving transitions. Reminder tests cover permission refusal/grant, channel setup, Android/iOS triggers, changing name/time, disabling, archiving/restoring, deleting, reconciliation, scheduling failures, notification tap IDs, time validation, and the version 1 → 2 data migration. Native notification delivery must still be checked on devices.

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
