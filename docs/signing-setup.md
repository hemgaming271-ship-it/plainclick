# Signing + notarization setup (Windows only, no Mac needed)

Goal: buyers download `PlainClick-x.y.z.zip`, open the app, and macOS shows only the normal "downloaded from the internet"
prompt. There is no Gatekeeper block, and no "right-click → Open" workaround. That needs an app that is **Developer ID signed,
notarized by Apple, and stapled**. Everything below runs on Windows and on GitHub's free macOS runners.

What's already built and tested:
- `tools/signing/New-DeveloperIdCsr.ps1` and `Export-DeveloperIdP12.ps1`. They were tested end to end on Windows with a throwaway CA standing in for Apple (`Test-SigningHelpers.ps1`).
- `.github/workflows/signing-selftest.yml` checks that a `.p12` made on Windows imports on a GitHub macOS runner and signs the app.
- `.github/workflows/release.yml` builds a universal app (Apple silicon + Intel). With the Apple secrets set, it then signs, notarizes, staples, zips and records the checksum. A second, clean runner then checks the app the way a buyer's Mac would.

CI evidence, 2026-11-18:
- "Signing helpers self-test" run #7 passed (commit `8d18a05`). A `.p12` made on Windows with these scripts imported on a macOS 15 runner, and `codesign` signed the app with it (hardened runtime).
  The test CA had to be marked trusted on that throwaway runner, the same way Apple's root is trusted on every Mac. Without that, codesign reports `errSecInternalComponent`.
- "Release build" run #2 passed as a dry run (commit `c1827e6`). The universal binary (arm64 + x86_64) was built, zipped and checksummed, and Gatekeeper on a clean macOS 26 runner rejected the unsigned zip, as expected.

What still needs you (accounts and payments are yours to do):

## 1. Join the Apple Developer Program (US$99/year)
- Go to developer.apple.com/programs/enroll. You need an Apple Account with two-factor authentication turned on.
- Enrolling as an **individual** puts your legal name on the certificate, and buyers can see it in the app's signature. A company enrollment needs a D-U-N-S number.
- Apple's identity check and approval can take from a few hours to a few days.
- Only the **Account Holder** can create a Developer ID certificate.

## 2. Make the certificate request on Windows
```powershell
cd C:\Users\hemma\OneDrive\Desktop\plainclick
powershell -ExecutionPolicy Bypass -File tools\signing\New-DeveloperIdCsr.ps1 -Email "<your Apple Account email>" -Name "<your name>"
```
This creates `%USERPROFILE%\PlainClick-signing\PlainClick-DeveloperID.certSigningRequest`. The private key stays in your Windows user's certificate store.
Use the **same Windows user** for step 4.

## 3. Create the certificate at Apple
1. Go to developer.apple.com → Certificates, IDs & Profiles → Certificates → **+**.
2. Choose **Developer ID Application**, with the **G2 Sub-CA**.
3. Upload the `.certSigningRequest` file, then download the `.cer` file.

## 4. Create a notarization key (App Store Connect API)
1. Go to appstoreconnect.apple.com → Users and Access → Integrations → App Store Connect API → **Team Keys** → **+**.
2. Give it any name, with the **Developer** role.
3. Write down the **Issuer ID** and the **Key ID**.
4. Download `AuthKey_XXXX.p8`. Apple lets you download it **only once**.

## 5. Export the .p12 and the GitHub secret values
```powershell
powershell -ExecutionPolicy Bypass -File tools\signing\Export-DeveloperIdP12.ps1 -CerPath "$HOME\Downloads\developerID_application.cer" -P8Path "$HOME\Downloads\AuthKey_XXXX.p8"
```
The script checks its own output: the `.p12` must open with the password and contain the matching private key.

## 6. Add the secrets to GitHub
On GitHub, open the repo → Settings → Secrets and variables → Actions.

| Name | Kind | Value |
|---|---|---|
| `MACOS_CERT_P12_BASE64` | Secret | contents of `MACOS_CERT_P12_BASE64.txt` |
| `MACOS_CERT_P12_PASSWORD` | Secret | contents of `MACOS_CERT_P12_PASSWORD.txt` |
| `NOTARY_API_KEY_P8_BASE64` | Secret | contents of `NOTARY_API_KEY_P8_BASE64.txt` |
| `NOTARY_API_KEY_ID` | Secret | the Key ID from step 4 |
| `NOTARY_API_ISSUER_ID` | Secret | the Issuer ID from step 4 |
| `BUNDLE_ID` | **Variable** (Variables tab) | final app ID, e.g. `com.yourname.plainclick` |

Pick the bundle ID once. Changing it after release makes every user grant Accessibility permission again and resets their settings.
Developer ID apps don't need the ID registered anywhere.

Secrets are hidden from logs and aren't available to pull requests from forks, so they're safe in a public repo.
After saving them, keep the `.p12` and its password in a password manager or an offline backup, then **delete the .txt files**.
If the `.p12` ever leaks, revoke the certificate at developer.apple.com and make a new one.

## 7. Build a release
1. On GitHub, go to Actions → **Release build (sign + notarize)** → Run workflow, and enter a version such as `0.1.0`.
2. The job summary should show Gatekeeper **accepted** with "Notarized Developer ID", and the ticket as stapled.
3. Download the `plainclick-release` artifact: the zip plus its `.sha256` file.

Without the secrets, the same workflow runs as a **dry run**. It makes a `…-UNSIGNED-DRY-RUN.zip`, which Gatekeeper rejects as expected. Never give that zip to buyers.

## Still needed after signing
- **Someone has to open the signed zip on a real Mac before sales start** (`docs/release-checklist.md` §A/§B). A beta tester with a Mac can do this.
- Then publish the zip, put its URL and SHA-256 in the website settings, and turn on `NEXT_PUBLIC_RELEASE_AVAILABLE`.
