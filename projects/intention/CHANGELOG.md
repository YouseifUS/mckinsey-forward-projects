# Changelog

## 2.0.0 — 2026-10-08

The app is now named **نية (Niyyah)** and has an Islamic geometric and gold visual identity.

- Ivory surfaces, antique-gold controls, and deep green panels.
- Three-leaf sprout icon with an arch, plus updated launch and Android adaptive icons.
- Bundled Amiri headings and Tajawal body fonts for offline Arabic text.
- Redesigned home, habit cards, creation flow, detail screens, and archive.
- Daily completion count and progress indicator on the home screen.
- Persistent, labelled add-habit action, including on small screens.
- SQLite browser-preview configuration for visual verification.

The habit model, database schema, application identifiers, and local database name remain compatible with v1. Existing habits and completion history are preserved when installing the update over v1. The release APK uses the same testing certificate as v1.

Validation: 21 automated tests pass, TypeScript and lint checks pass, browser creation/completion/undo flows were exercised, and the Android release build succeeds. The APK has not been tested on a physical device.

## 1.0.0 — 2026-10-08

Initial Arabic, offline-first habit-building app with guided creation, intention and meaning fields, cue/routine/reward, daily completion and undo, streaks, calendar, editing, archiving, restoration, and local SQLite storage.
