# Build & Code-Signing Guide

This document explains how to build **Mailcow Client** for Windows and Linux, and how to code-sign the resulting binaries.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18 LTS | `node --version` |
| npm | ≥ 9 | bundled with Node |
| Git | any | for cloning / tagging |

Install dependencies once:

```bash
npm install
```

---

## Build Commands

### Windows (x64) — `.exe` Portable + `.msi` Installer

Run on a Windows host **or** in a Windows container / GitHub Actions runner:

```bash
npm run dist:win
```

Produces files in `release/`:
- `Mailcow Client <version>.exe` — standalone portable executable
- `Mailcow Client <version>.msi` — Windows Installer package

### Linux (x64) — AppImage

Run on a Linux host:

```bash
npm run dist:linux
```

Produces `release/Mailcow Client-<version>.AppImage`.

Make it executable and run it directly — no installation required:

```bash
chmod +x "release/Mailcow Client-<version>.AppImage"
./"release/Mailcow Client-<version>.AppImage"
```

### macOS (Apple Silicon) — DMG

Run on a macOS host:

```bash
npm run dist:mac
```

Produces `release/Mailcow Client-<version>.dmg`.

---

## Cross-Compilation Notes

electron-builder can cross-compile in many cases, but native Node modules (like `keytar`) need to be re-compiled for the target platform. The recommended approach is to build on the target OS or use the official CI matrix (see `.github/workflows/`).

---

## Code-Signing

### Why sign?

Unsigned builds trigger security warnings on all three platforms:
- **Windows**: SmartScreen shows *"Windows protected your PC"*
- **macOS**: Gatekeeper blocks launch unless bypassed manually
- **Linux**: Signatures are optional but recommended for package repositories

### Windows Code-Signing

1. **Obtain a certificate**
   - Purchase an **OV (Organization Validation)** or **EV (Extended Validation)** code-signing certificate from a Microsoft-trusted CA, e.g. DigiCert, Sectigo, GlobalSign.
   - **Cost**: OV certs typically cost **$200–$500 USD/year**. EV certs are **$300–$700 USD/year** and remove SmartScreen warnings immediately.

2. **Export your certificate** as a `.pfx` (PKCS #12) file and set the environment variables:

   ```bash
   set CSC_LINK=path\to\certificate.pfx
   set CSC_KEY_PASSWORD=your_pfx_password
   ```

3. **Build with signing**:

   ```bash
   npm run dist:win
   ```

   electron-builder detects `CSC_LINK` and automatically signs the executable and installer.

4. **Timestamp server** (recommended — ensures the signature stays valid after cert expiry):

   Add to `electron-builder.json`:

   ```json
   "win": {
       "target": ["portable", "msi"],
       "certificateFile": "${env.CSC_LINK}",
       "certificatePassword": "${env.CSC_KEY_PASSWORD}",
       "timeStampServer": "http://timestamp.digicert.com"
   }
   ```

### macOS Code-Signing & Notarization

1. Enrol in the **Apple Developer Program** — **$99 USD/year**.
2. Export a *Developer ID Application* certificate from Xcode / Keychain.
3. Set environment variables:

   ```bash
   export CSC_LINK="Developer ID Application: Your Name (TEAMID)"
   export APPLE_ID="your@apple.id"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="YOURTEAMID"
   ```

4. Enable notarization in `electron-builder.json`:

   ```json
   "mac": {
       "target": "dmg",
       "notarize": true
   }
   ```

5. Build:

   ```bash
   npm run dist:mac
   ```

### Linux Code-Signing

AppImage does not use OS-level signatures. For distribution via package repositories (`.deb`, `.rpm`), sign with **GPG**:

```bash
# Sign an AppImage
gpg --detach-sign --armor "release/Mailcow Client-<version>.AppImage"
```

Provide the `.asc` signature alongside the AppImage for users to verify.

---

## Cost Summary

| Platform | Certificate / Programme | Approximate Annual Cost |
|----------|------------------------|------------------------|
| Windows OV | Code-signing CA (DigiCert, Sectigo…) | ~$200–$500 USD |
| Windows EV | Same CAs, hardware token required | ~$300–$700 USD |
| macOS | Apple Developer Program | $99 USD |
| Linux AppImage | GPG (free) | **Free** |
| Linux .deb/.rpm repos | Distro-specific GPG key | **Free** |

> **Note:** Open-source projects may qualify for **free or discounted** code-signing certificates from some CAs (e.g. SignPath Foundation offers free signing for OSS projects).

---

## Automated Builds with GitHub Actions

The `.github/workflows/` directory contains CI definitions. To trigger a full release build, push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will build for all platforms, sign (when secrets are configured), and publish the release assets to GitHub Releases — which the in-app update checker queries automatically.
