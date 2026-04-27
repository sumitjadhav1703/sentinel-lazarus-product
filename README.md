# Lazarus Sentinel

Desktop-first multi-server safety terminal built with Electron, React, xterm.js, node-pty, ssh2, better-sqlite3, and electron-store.

## Project Structure

```text
assets/build/       Packaging assets, app icon outputs, and macOS entitlements
docs/product/       Product and monetization planning documents
docs/prototype/     Original Claude Design handoff prototype
scripts/            Local maintenance, packaging, and readiness scripts
src/main/           Electron main process, persistence, SSH, and terminal services
src/preload/        Narrow context bridge exposed to the renderer
src/renderer/       React application UI and renderer-side helpers
src/shared/         Shared defaults, model helpers, execution planning, and sanitizers
tests/              Vitest coverage for scaffold, renderer, persistence, SSH, and terminals
```

## Run Locally

```bash
npm install
npm run dev
```

Use `npm run preview` after a production build if you want to smoke-test the packaged renderer/main output.

## Package The App

```bash
npm run icons
npm run pack
npm run dist
```

`npm run pack` creates an unpacked desktop app in `release/` for local inspection. `npm run dist` creates distributable artifacts for the current platform using `electron-builder`.

Packaging assets live in `assets/build/`. `npm run icons` regenerates `icon.png`, `icon.icns`, and `icon.ico` from the local icon generator.

For signed and notarized macOS builds, copy `.env.example` to `.env` and provide your Apple Developer values:

```bash
APPLE_TEAM_ID=
APPLE_ID=
APPLE_APP_SPECIFIC_PASSWORD=
CSC_LINK=
CSC_KEY_PASSWORD=
```

## Readiness Check

```bash
npm run check
```

The readiness check runs:

```bash
npm test
npm run build
npm audit --audit-level=high
```

Run those commands sequentially. Tests and build both touch generated output, so running them in parallel can create avoidable races.

## Current Capabilities

- Server dashboard with add, edit, remove, search, filters, and multi-select.
- Command composer with production confirmation and editable safety rules.
- Local terminal execution through `node-pty`.
- SSH probe and SSH terminal sessions through `ssh2`.
- xterm.js terminal rendering with resize forwarding.
- Execution cancellation and command history updates.
- Local settings, server config, and SQLite-backed command history.
- Optional output-log persistence. Output logs are off by default, and saved logs are bounded and secret-masked.

## Privacy Defaults

Credentials and private keys stay in the Electron main process. The renderer only talks through the preload bridge exposed as `window.api`.

Command history masks common inline secrets. Output logs are only persisted when Settings enables output logs.

## Useful Scripts

```bash
npm run dev      # start Electron in development mode
npm test         # run Vitest
npm run build    # production build
npm run preview  # preview the production build
npm run check    # test + build + high-severity audit
npm run icons    # regenerate app icon assets
npm run pack     # build an unpacked desktop app
npm run dist     # build distributable desktop artifacts
```
