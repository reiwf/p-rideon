/* Staff-only upload endpoint for large media (the per-language safety videos).
   Files go to the Cloudflare R2 bucket bound as MEDIA and are served from the
   bucket's public hostname (MEDIA_PUBLIC_BASE_URL) — R2 egress is free, so a
   40 MB video handed to every guest at checkout costs nothing to serve.

   In the Worker the body is streamed into R2 rather than buffered — a Worker has
   only 128 MB of memory, and Cloudflare caps the request body at 100 MB anyway. */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { bearerToken, isStaff } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED = new Set(["video/mp4", "video/webm", "image/jpeg", "image/png", "image/webp"]);

/** The bucket binding + public base URL, or null when R2 isn't wired up yet. */
async function r2() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bucket = env.MEDIA;
    // set to the r2.dev subdomain or a custom domain — see DEPLOY.md
    const base = (env.MEDIA_PUBLIC_BASE_URL ?? process.env.MEDIA_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
    if (!bucket || !base) return null;
    return { bucket, base };
  } catch {
    // no Cloudflare context (plain `next dev` without the adapter)
    return null;
  }
}

/** R2 refuses a stream of unknown length, and Next may hand the route a re-wrapped
    body rather than the original request stream. FixedLengthStream re-declares the
    length without buffering; it exists only in the Workers runtime, so null here
    means "buffer instead" — which is the local-dev path, where uploads are small. */
function sized(body: ReadableStream, bytes: number): ReadableStream | null {
  if (!FixedLengthStream || bytes <= 0) return null;
  const { readable, writable } = new FixedLengthStream(bytes);
  void body.pipeTo(writable).catch(() => {});
  return readable;
}

/** GET /api/media — lets the admin UI tell "not configured" from "upload failed". */
export async function GET() {
  return Response.json({ configured: Boolean(await r2()) });
}

export async function POST(request: Request) {
  if (!(await isStaff(bearerToken(request)))) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const store = await r2();
  if (!store) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const folder = (url.searchParams.get("folder") ?? "media").replace(/[^a-z0-9/_-]/gi, "");
  const ext = (url.searchParams.get("ext") ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  if (!ALLOWED.has(contentType)) {
    return Response.json({ error: `Unsupported content type: ${contentType}` }, { status: 415 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    return Response.json({ error: "too_big" }, { status: 413 });
  }
  if (!request.body) {
    return Response.json({ error: "Empty body" }, { status: 400 });
  }

  // A fresh key every time: the previous file stays reachable for any guest who
  // still has the old booking page open, and nothing is cached under a stale URL.
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  try {
    await store.bucket.put(key, sized(request.body, declared) ?? (await request.arrayBuffer()), {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }

  return Response.json({ url: `${store.base}/${key}`, key });
}
