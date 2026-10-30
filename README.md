# Papa Jersey — online catalog (phase 1)

Mobile-first jersey catalog in Indonesian. Customers filter, pick a size and optional nameset, then send a ready-made order on WhatsApp. Shop owners manage jerseys at `/admin` after signing in with Google. Built from the PRD dated 29 October 2026.

## Stack

- **Website**: React + Vite single-page app (`src/`). Reads published jerseys straight from Sanity's public CDN API — no `@sanity/client` in the public bundle.
- **Data and photos**: Sanity Content Lake (free plan). Photos are shrunk in the browser before upload; Sanity's image CDN serves each size on request.
- **Server routes** (`api/`, Vercel functions): Google sign-in, admin jersey CRUD, photo upload, and `api/jersey.js`, which renders `/jersey/:slug` with that jersey's title and preview image so WhatsApp and Instagram show the right card, and returns a real 404 for hidden or unknown jerseys.
- **Shared rules** (`src/lib/jersey.js`): sizes, types, validation, the WhatsApp message, filters. Used by both the website and the API.

There is no Sanity Studio: the `/admin` panel is the only management UI, and the `jersey` documents are written by `api/admin/*`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173 — shows sample jerseys while VITE_SANITY_PROJECT_ID is empty
npm test
npm run lint
npm run build
```

`npm run dev` serves the website only. Use `vercel dev` to exercise `/api/*` (sign-in, admin, jersey previews).

## Go-live setup

1. Create a Sanity project, dataset `production`, **public** read. Create an API token with Editor rights.
2. Create a Google OAuth client (Web). Redirect URI: `https://<domain>/api/auth/callback` (and `http://localhost:3000/api/auth/callback` for `vercel dev`).
3. Set the variables from `.env.example` in the hosting project. `ADMIN_SESSION_SECRET` must be 32+ random characters.
4. Add the Sanity CORS origin for the domain (Sanity → API → CORS origins), without credentials.
5. Deploy, sign in at `/admin`, and add the first jerseys.

## Accounts and roles

`ADMIN_USERS` lists who can sign in: `owner@x.com,helper@y.com:staff`. Owners can do everything. Staff can only change stock and show/hide. Every request checks the current list, so removing an email locks that person out at once. Changing the list needs only an env-var update and redeploy, not a code change.

## How the PRD acceptance checks are met

| PRD check | Where |
| --- | --- |
| Filter/search, size, nameset, correct WhatsApp order | `CatalogPage.jsx`, `JerseyPage.jsx`, `orderMessage()` (tested against the PRD example) |
| Sold-out size shows "Habis" and can't be picked | `JerseyPage.jsx` — disabled radio |
| Unlisted Google account can't open owner pages | `api/_lib/auth.js` + `api/auth/callback.js` (tested) |
| New jersey visible within a minute | Admin writes published documents directly; site reads Sanity's API CDN (purged on write); jersey pages cache 30 s |
| Hidden jersey not shown, even by old link | Catalog query filters `visible == true`; `api/jersey.js` returns 404 |
| Page under 2 s on mobile | ~84 KB gzipped JS, admin code split out, resized WebP/AVIF photos, fixed aspect boxes (no layout jump) |

## Assumptions to confirm with the client

- **Hosting cost**: Vercel's free Hobby plan is for non-commercial use. A shop should budget for Vercel Pro, or move `api/` to Netlify/Cloudflare functions (the handlers are plain Node `(req, res)`).
- **Kids sizes** use the same XS–3XL list as adults. If kids jerseys are sold by age, the size list needs a second set.
- **Fan and player** are separate jerseys (own price and stock), matching the version filter.
- **Nameset**: up to 12 letters and a number 0–99. The printing cost is set per jersey, pre-filled from `VITE_DEFAULT_NAMESET_PRICE`.
- **Stock** is lowered by hand after each WhatsApp order, so two people can order the last unit of a size at the same time.
- Brand colours are placeholders in `:root` of `src/styles.css`; the logo is a placeholder `public/favicon.svg`.
