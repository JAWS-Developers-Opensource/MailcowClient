
# Mailcow Client

A desktop email / calendar / contacts client for [Mailcow](https://mailcow.email) servers, built with Electron + React + TypeScript.

## Quick start (development)

```bash
npm install
npm run dev
```

## Building for distribution

| Platform | Command |
|----------|---------|
| Windows (x64) | `npm run dist:win` |
| Linux (x64) | `npm run dist:linux` |
| macOS (Apple Silicon) | `npm run dist:mac` |

For detailed build instructions, code-signing setup, and cost information see [docs/build-and-signing.md](docs/build-and-signing.md).

## Automatic update check

The app checks [GitHub Releases](https://github.com/JAWS-Developers-Opensource/MailcowClient/releases) on startup. If a newer version is available an update dialog appears, directing you to the release page to download the latest installer.
