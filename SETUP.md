# ProCreds — EAS Setup Guide

This document walks a new contributor (or future Claude) from a clean clone to the first App Store + Play Store build.

## 1. Create / sign into an Expo account

1. Visit https://expo.dev and create a free account if you don't have one.
2. From the project root, run:

   ```bash
   npx eas-cli login
   ```

3. Confirm login:

   ```bash
   npx eas-cli whoami
   ```

## 2. Configure EAS for this project

Already configured — `eas.json` is checked in. If you ever need to regenerate or repair it:

```bash
npx eas-cli build:configure
```

## 3. EAS Submit Fields

Fill in the placeholders in `eas.json → submit.production` before submitting.

### iOS (`submit.production.ios`)

You need an active **Apple Developer Program** membership ($99/yr).

| Field | Where to find it |
|---|---|
| `appleId` | The email address of your Apple ID (the one enrolled in the Apple Developer Program). |
| `appleTeamId` | https://developer.apple.com/account → "Membership" → "Team ID" (10-character alphanumeric). |
| `ascAppId` | Create the app at https://appstoreconnect.apple.com → "My Apps" → "+" → New App. After creation, the Apple ID for the listing appears in App Information → "Apple ID" (numeric). |

Bundle identifier is already `com.procreds.app` in `app.json` and must match the App Store Connect record exactly.

### Android (`submit.production.android`)

1. Create a Play Console account ($25 one-time): https://play.google.com/console
2. Create a new app with package `com.procreds.app`.
3. Generate a service account JSON key:
   - Google Cloud Console → IAM → Service Accounts → Create.
   - Grant it `Service Account User` and link it to Play Console (Play Console → Setup → API access).
4. Save the JSON as `play-service-account.json` in the project root. **Do not commit it** — it is already in `.gitignore`.

## 4. First build

Run a production build for both platforms:

```bash
npx eas-cli build --profile production --platform all
```

EAS will prompt to register iOS credentials (push key, distribution cert) — accept the auto-managed flow.

## 5. First submit

```bash
npx eas-cli submit --profile production --platform ios
npx eas-cli submit --profile production --platform android
```

iOS goes to TestFlight; Android lands in the Internal track.
