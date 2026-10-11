# Firebase setup for نية

Work is isolated on `feature/firebase-integration`. Do not merge into main without the owner's explicit approval.

## Connected project

The Firebase project is **Neyya** (`neyya-fc8d6`), on the no-cost Spark plan. The registered Web app is **Neyya Expo**. Email/Password sign-in is enabled.

The checked-in `.env` contains public client identifiers so builds on this branch use this project. It contains no administrator credentials or account passwords. Use an ignored `.env.local` to override these values for another development project. Emulator tests explicitly target `demo-neyya`, never this project.

Console: https://console.firebase.google.com/project/neyya-fc8d6/overview

Firestore creation and rule publication are still pending. Do not treat this setup as release-ready until the database and live ownership checks are complete.

Verified against this real project: email account creation, sign-out, wrong-password rejection and sign-in. The temporary test account was removed afterward. Android, iOS and Web exports also passed with the configured client settings. Firestore live sync/ownership checks have not run yet.

## Create the cloud project

1. Open https://console.firebase.google.com/ and create a Firebase project. Google Analytics is optional for this feature.
2. In Authentication → Sign-in method, enable **Email/Password**. This implementation supports email registration, sign-in, sign-out and password reset. Google sign-in is not included.
3. Create a **Cloud Firestore Standard / Native mode** database. Select the region carefully; database location cannot be changed later. Start with production rules.
4. In Project settings → Your apps, register a **Web app**. The Firebase JavaScript SDK uses this configuration on Expo Android, iOS and web; no service-account key or native Google services files are required.
5. Copy `apiKey`, `authDomain`, `projectId`, and `appId` into a local `.env.local` based on `.env.example`. These are public client identifiers, not administrative secrets. Never add service-account JSON or passwords to the repository.
6. Deploy the rules from this directory, using the actual project ID:

   ```sh
   npx firebase login
   npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

7. Restart Expo after setting environment variables, or rebuild the application for installed users. Verify registration, login, restart, reset-email delivery and two-device sync against the configured project before release.

Without Firebase configuration the app remains a fully local app and the account page explains that cloud login is unavailable.

## Local development and tests

```sh
npm ci
npm run validate
npm run test:firebase
npm run export:android
npm run export:ios
npm run export:web
```

Use Node.js 24.12+ (the CI uses Node 24). The emulator test requires Java 21+, runs only against `demo-neyya`, and does not need a real Firebase project. It tests authorization rules, Auth registration/login and the real Firestore transport. Ordinary `npm test` skips emulator tests unless both emulator host variables are set; CI explicitly runs them using the emulators.

## Data preservation and offline behavior

- Guest storage continues to use `intention.db` and schema v2. The existing habits, completion history, archive state and reminder times remain intact.
- Every Firebase UID uses a separate SQLite database. Login/logout remounts the database and screens, preventing one account from seeing another account's local habits. Auth persistence uses Expo SQLite key/value storage on mobile and browser storage on web.
- The account page offers an explicit one-time **copy** of guest data. Import runs in a transaction; failure rolls back both records and the marker. Retrying cannot duplicate habits or daily completions. The guest source is retained, including after logout.
- An import fills gaps in an existing account. It does not overwrite existing cloud values or resurrect remote deletions/undone completions. Editing an imported habit before its first sync turns it into a normal edit.
- Local mutations and their outbox entries are committed atomically through SQLite triggers. The queue survives app restart. Per-mutation IDs prevent a late acknowledgement from clearing a newer local edit. Remote application is transactional and cannot overwrite pending local edits.
- Sync runs while the app is in the foreground: at startup, foreground return, after changes, every 30 seconds, and through “Sync now”. It does not run in a terminated app. A new sign-in requires internet; a persisted session can continue locally while offline. Unsynced changes can be lost if the app is uninstalled.
- Habit fields use the last write accepted by Firestore; edits to separate dates have separate documents. This is not a field-by-field merge for simultaneous edits to the same habit. Deletion wins over stale habit edits; a new habit gets a new ID. Deletion/undo uses tombstones so offline devices learn about it later.
- Security rules permit only the UID owner to read/write `users/{uid}/habits` and `users/{uid}/completions`, validate shapes, deny unrelated paths and forbid physical removal of tombstones. Local storage relies on the platform's application sandbox and is not separately encrypted by this change.
- Foreground sync reads the account's habit/history collections; very large histories or many active devices need incremental sync and retention design before scaling. Monitor Firestore usage; free quotas are not a guarantee of unlimited free operation.

## Rollback

No guest data is deleted or renamed, and this change does not raise its database version. The previous application can reopen the original guest database. Account data added in this branch lives separately and will not appear in the old application. Keep this branch, account databases and cloud data when testing rollback; do not uninstall before pending changes finish syncing. Main and the previous APK stay unchanged.
