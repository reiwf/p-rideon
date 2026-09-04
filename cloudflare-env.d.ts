/* Bindings this app adds on top of the ones the OpenNext adapter declares.
   Kept hand-written (rather than generated with `wrangler types`, which emits a
   ~15k-line file) because the app only ever touches the R2 `put` below. */

declare global {
  interface CloudflareEnv {
    /** R2 bucket for large media — the per-language safety videos. */
    MEDIA?: {
      put(
        key: string,
        value: ReadableStream | ArrayBuffer,
        options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
      ): Promise<unknown>;
    };
    /** Public hostname the MEDIA bucket is served from, e.g. https://media.p-rideon.com */
    MEDIA_PUBLIC_BASE_URL?: string;
  }

  /** Workers-runtime stream of a declared length. Absent outside workerd. */
  const FixedLengthStream: (new (length: number) => { readable: ReadableStream; writable: WritableStream }) | undefined;
}

export {};
