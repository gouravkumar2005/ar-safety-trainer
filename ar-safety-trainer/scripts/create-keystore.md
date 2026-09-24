# Release signing key

Android only installs or updates an APK that is signed. Debug builds are
signed automatically with a throwaway debug key. Release builds use your
own key, which is read from `android/keystore.properties`.

**Both `android/keystore.properties` and the `.jks` file are gitignored.
Back them up somewhere safe.** If you lose the key, you can't publish an
update to an installed app. Users would have to uninstall it, and lose
their local certificates/ledger, before installing a build signed with a
new key.

## Create a key (once)

Run from the `android/` folder. `keytool` comes with the JDK:

```
keytool -genkeypair -v -keystore release.jks -alias ar-safety-trainer \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=AR Safety Trainer, O=SIH26041, C=IN"
```

Then create `android/keystore.properties`:

```
storeFile=release.jks
storePassword=<the password you chose>
keyAlias=ar-safety-trainer
keyPassword=<the password you chose>
```

## Build a signed release APK

```
npm run apk:release
```

Output: `android/app/build/outputs/apk/release/app-release.apk`
