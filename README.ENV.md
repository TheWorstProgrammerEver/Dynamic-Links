# Dynamic Links Environment And Deployment

This document is the production deployment contract for Dynamic Links. It intentionally uses placeholders only. Do not put real service-role keys, access tokens, private keys, passwords, or local-only host values in this file.

## Netlify Site Settings

- Build command: `npm run build:netlify`
- Publish directory: `dist`
- Node runtime: Node.js `20.19` or newer, matching `package.json`

`npm run build:netlify` first runs the normal Vite build, then renders `dist/config.js`, `dist/config.json`, and `dist/_redirects` from the committed templates in `public/`.

## Netlify Environment Variables

Set these in Netlify site configuration for the production deploy context used by the build.

| Variable | Purpose | Where set | Secret | Example value shape | Missing or wrong failure symptom |
| --- | --- | --- | --- | --- | --- |
| `BUILD_VERSION` | Browser-visible deployment identifier rendered into `/config.json`. | Netlify site environment variable. | No | `2026-07-04.1`, `git-abcdef1`, or `v1.2.3` | `npm run build:netlify` fails with `Missing Netlify environment variables: BUILD_VERSION`, or the app shows an unhelpful/stale version label. |
| `ENVIRONMENT` | Browser-visible environment label. | Netlify site environment variable. | No | `production` | `npm run build:netlify` fails, or the auth screen and diagnostics show the wrong environment. |
| `AUTH_EMAIL_PASSWORD_ENABLED` | Enables email/password UI flows in browser runtime config. Must align with Supabase Auth email/password settings. | Netlify site environment variable. | No | `true` or `false` | Build can fail if not set; wrong value hides an enabled provider or exposes a provider that Supabase rejects. |
| `AUTH_PASSKEY_ENABLED` | Enables passkey sign-in UI. Must align with hosted Supabase passkey/WebAuthn settings. | Netlify site environment variable. | No | `true` or `false` | Build can fail if not set; wrong value hides passkeys or exposes passkey actions that fail in the browser. |
| `AUTH_OTP_ENABLED` | Enables email one-time-password UI flows. Must align with Supabase email OTP/provider settings. | Netlify site environment variable. | No | `true` or `false` | Build can fail if not set; wrong value hides OTP or exposes an OTP flow that Supabase rejects. |
| `AUTH_MAGIC_LINK_ENABLED` | Enables magic-link UI flows. Must align with Supabase email provider and redirect settings. | Netlify site environment variable. | No | `true` or `false` | Build can fail if not set; wrong value hides magic links or exposes a flow that sends unusable links. |
| `PUBLIC_LINK_HOST` | Canonical public origin used when the app displays Link Code URLs and when QR images encode public URLs. | Netlify site environment variable and Supabase Edge Function secret. | No | `https://links.example.com` | Build can fail if not set; wrong value makes copied public links and QR images point at the wrong host. |
| `SUPABASE_URL` | Hosted Supabase project API URL used by the browser runtime config and Netlify `_redirects` proxy targets. | Netlify site environment variable. | No | `https://<project-ref>.supabase.co` | Build can fail if not set; wrong value breaks browser auth, app requests, and `/code/*` proxy routes. |
| `SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable/anon key used by `@supabase/supabase-js`. | Netlify site environment variable. | No | `sb_publishable_...` or the hosted project's anon JWT | Build can fail if not set; wrong value causes auth initialization or API authorization failures. |

Boolean variables are rendered as raw JSON booleans in `public/config.json`; set them exactly to `true` or `false`, without quotes in local shell examples. Netlify stores values as strings, and the build script writes them into JSON.

## Netlify Redirects

`public/_redirects` is copied to `dist/_redirects` by Vite, then rendered by `npm run build:netlify`.

Expected production behavior:

```text
/code/:code/qr.png https://<project-ref>.supabase.co/functions/v1/public-link-code-qr/:code/qr.png 200
/code/* https://<project-ref>.supabase.co/functions/v1/public-link-code/:splat 200
/* /index.html 200
```

The `/code/:code/qr.png` rule must stay above `/code/*` so QR image requests reach `public-link-code-qr`. The `/code/*` rule must stay above the SPA fallback so public Link Code resolution reaches Supabase instead of `index.html`.

## Supabase Hosted Dashboard Settings

Configure these in the hosted Supabase project, not in Netlify.

- Auth Site URL: `https://<netlify-site-host>`
- Auth Redirect URLs: include `https://<netlify-site-host>` and any production custom domain origin used for the app. Add exact callback origins only; avoid local development URLs in production unless intentionally supporting them.
- Email provider: enable email signup/sign-in when any of `AUTH_EMAIL_PASSWORD_ENABLED`, `AUTH_OTP_ENABLED`, or `AUTH_MAGIC_LINK_ENABLED` is `true`.
- Email confirmations and SMTP: choose production-safe confirmation and SMTP settings for the project. If confirmations are enabled, redirect URLs must allow the production app origin.
- Passkeys/WebAuthn: if `AUTH_PASSKEY_ENABLED=true`, enable passkeys in Supabase Auth and set the WebAuthn relying party values to the production app origin:
  - RP display name: `Dynamic Links`
  - RP ID: `<netlify-site-host-without-scheme>` or the production custom-domain host
  - Origins: `https://<netlify-site-host>` and any production custom-domain origin used by the app
- Passkeys/WebAuthn: if hosted passkeys are not configured, set `AUTH_PASSKEY_ENABLED=false` so the browser does not expose passkey actions that cannot complete.

The browser client enables Supabase's passkey-capable auth client. The runtime `AUTH_*` flags decide which auth methods are visible to users, so the flags and hosted Auth provider settings must agree.

## Supabase Database And Function Deployment

Apply all migrations in `supabase/migrations/` to the hosted database before testing production traffic:

```sh
supabase db push --project-ref <project-ref>
```

Deploy all Edge Functions that the app and public routes depend on:

```sh
supabase functions deploy app-health --project-ref <project-ref> --no-verify-jwt
supabase functions deploy app --project-ref <project-ref> --no-verify-jwt
supabase functions deploy public-link-code --project-ref <project-ref> --no-verify-jwt
supabase functions deploy public-link-code-qr --project-ref <project-ref> --no-verify-jwt
```

JWT verification at the Supabase gateway must remain disabled for these functions, matching `supabase/config.toml`:

- `app-health`: public health endpoint; no JWT required.
- `app`: gateway JWT verification disabled, but the function itself requires a signed-in Supabase user through `withSupabase({ auth: 'user' })`.
- `public-link-code`: public unauthenticated resolver for `/code/{code}`; no JWT required.
- `public-link-code-qr`: public unauthenticated QR image renderer for `/code/{code}/qr.png`; no JWT required.

Set Supabase Edge Function secrets required by public functions:

```sh
supabase secrets set --project-ref <project-ref> PUBLIC_LINK_HOST=https://<netlify-site-host>
```

`public-link-code` and `public-link-code-qr` use the hosted project's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` inside the Edge Runtime to resolve public Link Codes without weakening table RLS. Treat any service-role value as secret. Do not put it in Netlify browser config.

## Production Smoke Checks

Run these against the hosted Supabase URL and deployed Netlify site after a production deploy. They should not require real secrets.

```sh
curl -i https://<project-ref>.supabase.co/functions/v1/app-health
```

Expected: `200` JSON containing `"ok":true`.

```sh
curl -i -X OPTIONS https://<project-ref>.supabase.co/functions/v1/app
```

Expected: a deployed-function response from Supabase, not a Supabase `NOT_FOUND` function-missing response. Browser CORS/preflight errors with Supabase `NOT_FOUND` usually mean the hosted Edge Function has not been deployed to that project, not that frontend CORS code is necessarily wrong.

```sh
curl -i https://<netlify-site-host>/code/<known-active-code>
```

Expected for a redirect-mode Link Code: `302` with `Location: https://<target-url>`. Expected for a raw-content Link Code: the configured status, content type, and body. Unknown, deleted, inactive, or unconfigured codes should return the safe public 404 JSON.

```sh
curl -i https://<netlify-site-host>/code/<known-active-code>/qr.png
```

Expected: `200` with `content-type: image/png` for an existing Link Code.

Also open the app at `https://<netlify-site-host>` and confirm sign-in, Link Code list loading, copied public URLs, and QR image URLs all use the production public host.

## Validation Checklist

- `npm run build:netlify` succeeds with the Netlify variables above.
- `public/config.json` placeholders match the documented Netlify variables.
- `public/_redirects` placeholders match the documented Netlify variables.
- Hosted Supabase Auth settings match the browser `AUTH_*` flags.
- Hosted migrations are applied before app traffic.
- Hosted Edge Functions are deployed with JWT verification disabled at the gateway where documented.
- `PUBLIC_LINK_HOST` is set for Supabase Edge Functions.
- Production smoke checks pass without using real secrets in commands or logs.
