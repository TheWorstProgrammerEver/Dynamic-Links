# Dynamic Links

Dynamic Links is a Supabase-backed React TypeScript app skeleton for a Dynamic Link Code management app.

The app currently supports Supabase authentication and a protected home screen that says
`Welcome to Dynamic Links`.

It keeps the product surface intentionally small for now: auth, runtime config, Netlify builds, a local Supabase stack, an Edge Function health check, and local/LAN developer ergonomics.

## Get Going

Prerequisites:

- Node.js 20.19 or newer and npm
- Docker Desktop

From a fresh clone:

```sh
npm run get-going
```

The script installs npm dependencies when needed, opens and waits for Docker Desktop on macOS, starts the local Supabase stack, starts local Edge Functions, starts Vite on LAN, writes ignored local developer config to `public/config.local.json`, verifies reachable ports, and prints the localhost and LAN endpoint sheet.

Press `Ctrl+C` to stop dev processes started by the script. Supabase containers keep their local data in Docker volumes; use `npm run all-done` when you want everything wound down.

## Runtime Config

`public/config.js` is the committed browser loader. It synchronously loads one JSON config file:

- `public/config.local.json` when `#{CONFIG_FILE}#` has not been substituted
- the substituted `#{CONFIG_FILE}#` path when present

`public/config.json` is the committed deployment template and should be substituted by CI/CD. `npm run get-going` generates ignored `public/config.local.json` for the current machine/LAN. Visual tests keep their config under `tests/visual/config.test.json` and route it as `/config.local.json`.

## Visual Auth Smoke

The Playwright smoke suite includes a local Supabase email/password journey:

```sh
npm run get-going
npm run test:visual
npm run all-done
```

The test creates a temporary user through the browser, signs out, signs back in, and removes the user through the local Supabase admin API.

## Security Integration Tests

The security integration command is wired in but currently has no app-table tests because Dynamic Links has no persisted product data yet:

```sh
npm run get-going
npm run test:security
npm run all-done
```

Add RLS and direct publishable-key tests here when the first persisted Dynamic Links feature lands.
