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

## Ubuntu VPS deployment

First deploy the latest Tradio web release:

```bash
cd /root/tradio
git pull
npm ci
npm run build
pm2 restart tradio --update-env
pm2 save
```

Check `https://tradio.uk/#mobile-apps`. Both platforms should appear; they remain marked **Beta soon** until their signed download URLs are configured.

## Prepare the VPS for Android release builds

Install Java and the basic archive tools:

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk unzip wget
java -version
```

Install Google's current Linux command-line tools:

```bash
sudo mkdir -p /opt/android-sdk/cmdline-tools
cd /tmp
wget https://dl.google.com/android/repository/commandlinetools-linux-14742923_latest.zip
rm -rf /tmp/android-command-tools
mkdir -p /tmp/android-command-tools
unzip -q commandlinetools-linux-14742923_latest.zip -d /tmp/android-command-tools
sudo mkdir -p /opt/android-sdk/cmdline-tools/latest
sudo cp -a /tmp/android-command-tools/cmdline-tools/. /opt/android-sdk/cmdline-tools/latest/
sudo chown -R root:root /opt/android-sdk
```

Accept Google's Android SDK licence interactively, then install the SDK required by Tradio:

```bash
export ANDROID_HOME=/opt/android-sdk
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
sudo -E sdkmanager --licenses
sudo -E sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

## Create the private Android signing key

The signing key must remain on the server and must never be committed to GitHub. Losing it prevents compatible updates to an installed app.

```bash
sudo mkdir -p /root/.config/tradio
sudo keytool -genkeypair -v \
  -keystore /root/.config/tradio/tradio-release.jks \
  -alias tradio \
  -keyalg RSA -keysize 2048 -validity 10000
sudo chmod 600 /root/.config/tradio/tradio-release.jks
sudo nano /root/.config/tradio/android-signing.env
```

Add the following values using the passwords chosen during `keytool`:

```env
ANDROID_HOME=/opt/android-sdk
TRADIO_ANDROID_KEYSTORE_PATH=/root/.config/tradio/tradio-release.jks
TRADIO_ANDROID_KEYSTORE_PASSWORD=YOUR_PRIVATE_KEYSTORE_PASSWORD
TRADIO_ANDROID_KEY_ALIAS=tradio
TRADIO_ANDROID_KEY_PASSWORD=YOUR_PRIVATE_KEY_PASSWORD
```

Protect the secrets:

```bash
sudo chmod 600 /root/.config/tradio/android-signing.env
```

## Build and publish the Android APK

```bash
cd /root/tradio
chmod +x scripts/build-android-release.sh
./scripts/build-android-release.sh
```

Add this line to `/root/tradio/.env.local`:

```env
NEXT_PUBLIC_ANDROID_APP_URL=https://tradio.uk/downloads/tradio-android.apk
```

Rebuild because public environment values are included in the landing page during the Next.js build:

```bash
cd /root/tradio
npm run build
pm2 restart tradio --update-env
pm2 save
curl -I https://tradio.uk/downloads/tradio-android.apk
```

The response should be `200`. Keep an encrypted off-server backup of `tradio-release.jks` and its passwords.

## Activate the iPhone download

Build and upload the iPhone project from a Mac using Xcode. In App Store Connect, enable a TestFlight group and create its public invitation link. Then add it to `.env.local`:

```env
NEXT_PUBLIC_IOS_APP_URL=https://testflight.apple.com/join/YOUR_TESTFLIGHT_CODE
```

Run the same Next.js build and PM2 restart commands. Apple requires an uploaded, signed build before TestFlight users can install it.

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
