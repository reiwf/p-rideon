# Deploying P-rideon to Cloudflare (auto-deploy on GitHub push)

> **Why Workers and not "Pages"?** Cloudflare Pages' Next.js adapter
> (`next-on-pages`) is in maintenance mode and does not support Next 16.
> Cloudflare's recommended path for Next.js is **Cloudflare Workers** via the
> OpenNext adapter — same Git integration, same auto-deploy on push, same
> dashboard (Workers & Pages). This repo is already configured and the build
> has been verified locally (`npm run preview`).

## What's already in the repo

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Worker config: name `p-rideon`, Node compat, static assets |
| `open-next.config.ts` | OpenNext adapter config (forces a webpack build — Turbopack server chunks aren't supported by the adapter yet) |
| `package.json` scripts | `npm run preview` (build + run locally), `npm run deploy` (build + deploy from your machine) |
| `.gitignore` | ignores `.open-next/` and `.wrangler/` |

## One-time setup

### 1. Push the repo to GitHub

```powershell
git add -A
git commit -m "P-rideon booking site"
# create the repo under your account (needs GitHub CLI: winget install GitHub.cli && gh auth login)
gh repo create p-rideon --private --source . --push
```

(Or create an empty repo on github.com and `git remote add origin … && git push -u origin master`.)

### 2. Connect it to Cloudflare

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Workers** →
   **Import a repository** → pick `p-rideon`.
2. Build settings:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
   - Root directory: `/` (default)
3. Click **Create and deploy**. The first build will fail or render a broken
   site until the environment variables below are set — that's expected.

### 3. Environment variables

In the Worker's **Settings → Variables and Secrets**, add:

| Name | Value | Type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vtvxgzlkelychcjvvkwz.supabase.co` | Plaintext |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable key (see `.env.local`) | Plaintext |
| `DEEPL_API_KEY` | your DeepL key (admin auto-translate) | **Secret** |

Then in **Settings → Build → Variables and secrets**, add the two
`NEXT_PUBLIC_*` values again — Next.js inlines them at **build** time, so the
build environment needs them too. (The publishable Supabase values are safe to
expose; only `DEEPL_API_KEY` is sensitive and stays a runtime secret.)

Trigger a redeploy (**Deployments → Retry**, or push any commit).

### 4. Custom domain (optional but recommended)

Worker → **Settings → Domains & Routes → Add → Custom domain** →
`p-rideon.com` (and/or `www.p-rideon.com`). Since the domain's email (Resend)
is already on Cloudflare-manageable DNS, adding the site domain here also
gives you CDN + TLS automatically.

## Day-to-day

- **Every `git push` to `master` builds and deploys automatically.** Watch it
  under the Worker's *Deployments* tab. Pushes to other branches create
  preview deployments with their own URLs.
- Local check before pushing: `npm run preview` (builds the worker and serves
  it on a local workerd runtime).
- Emergency deploy from your machine without GitHub: `npm run deploy`
  (needs `npx wrangler login` once).

## Notes & gotchas

- **Turbopack:** normal local dev (`npm run dev`) still uses Turbopack. Only
  the Cloudflare build goes through webpack (`open-next.config.ts`
  `buildCommand`). Don't remove that override — the deploy breaks with
  `ChunkLoadError` without it.
- **Booking emails are unaffected** — they're sent by a Postgres trigger in
  Supabase, not by the web app.
- **Fly.io:** the old deployment (`drive-one` app, `fly.toml`, `Dockerfile`)
  keeps working until you remove it. Once Cloudflare is live on your domain,
  you can `fly apps destroy drive-one` and delete `fly.toml`, `Dockerfile`,
  and `.dockerignore` from the repo.
- **`output: "standalone"`** in `next.config.ts` is only used by the Docker/Fly
  build; OpenNext ignores it. Harmless to keep while both deploys exist.
