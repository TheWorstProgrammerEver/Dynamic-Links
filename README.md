# Dynamic Links

Dynamic Links is a Supabase-backed React TypeScript app for creating reusable Link Codes.

It keeps the product surface intentionally small for now: auth, owned Link Code management, runtime config, Netlify builds, a local Supabase stack, Edge Functions, and local/LAN developer ergonomics.

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

`publicLinks.host` is the configured host used when the authenticated app shows or copies public Link Code URLs.

## Public Link Codes

The canonical public Link Code URL convention is:

```text
{publicLinks.host}/code/{url-encoded-link-code}
```

Netlify serves `/code/*` through the unauthenticated `public-link-code` Supabase Edge Function before the SPA fallback. The resolver returns a minimal public lookup response for active configured codes and the same safe 404 JSON for unknown, deleted, inactive, or unconfigured codes. Owner-only fields such as display name and owner user ID stay behind the authenticated app function.

Local Vite development proxies `/code/*` to the local Supabase function at `/functions/v1/public-link-code/*`, so `npm run get-going` can exercise the same public route shape from the printed app host.

## Visual Auth Smoke

The Playwright smoke suite includes a local Supabase email/password journey:

```sh
npm run get-going
npm run test:visual
npm run all-done
```

The test creates a temporary user through the browser, signs out, signs back in, and removes the user through the local Supabase admin API.

## Security Integration Tests

```sh
npm run get-going
npm run test:security
npm run all-done
```

The security suite covers owner-only direct table policies, authenticated app function authorization, and the anonymous public resolver boundary.
