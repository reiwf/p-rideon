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
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (creating admin logins) | **Secret** |

> **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS completely** — it can read and write
> every table regardless of policy. Supabase dashboard → Project Settings → API
> → `service_role`. It is used by one route only (`/api/staff`, to create admin
> logins), must never be `NEXT_PUBLIC_*`, and must never be added to the **Build**
> variables — build-time values get inlined into the browser bundle. Runtime
> secret only. Without it the admin-users page simply says it is not configured.

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

---

# Safety videos on Cloudflare R2

The precaution video at the last booking step is one MP4 **per language**
(subtitles are burned into the picture). Every guest who reaches step 3 streams
one, so the files live in **R2**: egress is free, versus metered bandwidth on
Supabase Storage. The Worker holds the bucket as the `MEDIA` binding and staff
upload through `/admin/bookings`.

## One-time setup

### 1. Create the bucket

Dashboard → **R2** → **Create bucket** → name it **`p-rideon-media`**, location
hint **Asia-Pacific (APAC)** (your guests are in Japan). Or from the terminal:

```powershell
npx wrangler r2 bucket create p-rideon-media --location apac
```

The name must match `wrangler.jsonc` → `r2_buckets[0].bucket_name`. The binding
itself is already in the repo, so nothing to add there.

### 2. Give the bucket a public hostname

The bucket is private by default and the booking page needs to read from it.

**Recommended — custom domain.** Bucket → **Settings** → **Public access** →
**Custom domains** → **Connect domain** → `media.p-rideon.com`. The DNS record
is created for you (the zone is already on Cloudflare for the Resend setup).
This serves through the normal CDN, so the video is cached at the edge and each
PoP fetches it from R2 once.

**Quick alternative — r2.dev.** Same panel → **R2.dev subdomain** → **Allow
Access**. You get `https://pub-<hash>.r2.dev`. Fine for testing; Cloudflare
rate-limits it and advises against production traffic, and it is *not* cached.

### 3. Point the app at that hostname

Edit `wrangler.jsonc` and fill in the URL — **no trailing slash**:

```jsonc
"vars": {
  "MEDIA_PUBLIC_BASE_URL": "https://media.p-rideon.com"
},
```

Then push. It goes in the file rather than the dashboard because
`wrangler deploy` overwrites dashboard-set plaintext variables with whatever
this block contains. (Secrets like `DEEPL_API_KEY` are *not* touched.)

While it is empty, `/api/media` answers 503 and the admin panel says the video
storage is not configured — uploads are refused, but a URL can still be pasted.

### 4. Upload the videos

Deployed site → `/admin/bookings` → **Safety video**: one file per language,
**Upload**, then **Save**. Max 100 MB each (Cloudflare's request-body cap).
Guests see the file for their own language; English covers any language left
empty. Clear all four to switch the requirement off entirely.

## Notes

- **Encoding:** H.264/AAC MP4, 720p is plenty. Subtitles burned in, one file per
  language. Keep each under ~50 MB if you can — it is streamed on a hotel
  wifi at checkout.
- **Replacing a video** writes a new object under a new random key and leaves
  the old one in place, so a guest who already has the booking page open is not
  broken mid-flow. Old files can be deleted from the R2 dashboard later.
- **Cost:** R2's free tier is 10 GB stored, 1 M writes and 10 M reads a month,
  and **zero** egress. Four videos will not come close.
- **Local dev:** `next.config.ts` calls `initOpenNextCloudflareForDev()`, so
  `npm run dev` sees a *local* simulated bucket under `.wrangler/state`. Files
  uploaded there are not reachable at the public hostname — do real uploads on
  the deployed site.
- **The old `car-videos` Supabase bucket** still holds the test upload from
  before the move. Its public URL works if you paste it into the admin panel,
  but re-uploading to R2 is what gets you the free egress. Delete the Supabase
  bucket once nothing references it.
