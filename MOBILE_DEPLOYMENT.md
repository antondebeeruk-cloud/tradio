# Tradio mobile apps

Tradio uses Capacitor 7 to wrap the existing secure web application in native Android and iPhone projects. Both apps use the same Tradio account and live business data as `https://tradio.uk`.

## What is included

- Android project: `android/`
- iPhone project: `ios/`
- App identifier: `uk.tradio.app`
- Custom link scheme: `tradio://`
- Native location permission for Fuel & Mileage
- Camera and photo-library privacy descriptions for receipt and job-file capture
- Tradio app icons and launch screens

The 0.20 Beta tracker uses native GPS while Tradio is in the foreground. Continuous locked-screen background mileage needs a separate native background-location service and store privacy review; it is intentionally not claimed by this release.

## Keep native projects in sync

After changing native plugins or the Capacitor configuration:

```bash
npm install
npm run mobile:assets
npm run mobile:sync
```

Normal Next.js page changes are served by `https://tradio.uk`, so deploy the website as usual. The app store binary only needs rebuilding when native code, permissions, plugins, icons or version details change.

## Landing-page download buttons

The landing page displays Android and iPhone download options. Add these public environment variables to the VPS when the signed builds are ready:

```env
NEXT_PUBLIC_ANDROID_APP_URL=https://tradio.uk/downloads/tradio-android.apk
NEXT_PUBLIC_IOS_APP_URL=https://testflight.apple.com/join/YOUR_TESTFLIGHT_CODE
```

Restart Tradio after changing them. The Android value can point to a hosted APK or Google Play listing. The iPhone value should point to TestFlight or the App Store. Until a value exists, the matching button safely displays **Beta coming soon**.

## Android testing

1. Install the current Android Studio and its Android SDK.
2. Run `npm run mobile:android`.
3. Let Android Studio finish its Gradle sync.
4. Connect an Android phone with USB debugging enabled, or start an emulator.
5. Select the device and press **Run**.
6. Log in, open **Fuel & Mileage**, start a trip and allow precise location.

Before Google Play release, create a private signing key in Android Studio, build an Android App Bundle (`.aab`), complete the Play Console data-safety form and test through an internal testing track.

## iPhone testing

Apple requires macOS, Xcode and an Apple Developer account for signing:

1. Move or clone the project onto a Mac.
2. Run `npm install` and `npm run mobile:sync`.
3. Run `npm run mobile:ios`.
4. In Xcode, select the **App** target and your Apple developer team.
5. Confirm the bundle identifier is `uk.tradio.app`.
6. Connect an iPhone, select it and press **Run**.
7. Test login, camera uploads, Tradio links and Fuel & Mileage permission.

Before App Store release, add the final privacy details in App Store Connect, archive the app in Xcode and send it through TestFlight first.

## Universal links

The app already accepts `tradio://` links. Opening ordinary `https://tradio.uk/...` links directly in the installed app requires two values created during store signing:

- Apple Developer Team ID
- Android release certificate SHA-256 fingerprint

Once those are known, add the Apple association file and Android `assetlinks.json` under `public/.well-known/`, then enable Associated Domains in Xcode and the matching Android HTTPS intent filter. Do not publish placeholder signing values.

## Local server override

Production builds use `https://tradio.uk`. For device development only, set `CAPACITOR_SERVER_URL` before running `npm run mobile:sync`. The URL must be reachable from the phone. Never ship a clear-text local URL to an app store.
