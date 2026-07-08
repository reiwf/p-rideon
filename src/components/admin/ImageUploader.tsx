"use client";

/* Vehicle gallery uploader. Uploads to the public `car-vehicles` Storage bucket
   (staff-write via RLS) and keeps an ordered list of public URLs on the vehicle.
   First image = primary card photo. */

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminT } from "@/lib/adminI18n";
import { Button } from "./ui";

export const VEHICLE_BUCKET = "car-vehicles";

export function ImageUploader({ images, onChange }: { images: string[]; onChange: (next: string[]) => void }) {
  const { t } = useAdminT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr("");
    setBusy(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `vehicles/${crypto.randomUUID()}.${ext || "jpg"}`;
        const { error } = await supabase.storage.from(VEHICLE_BUCKET).upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (error) throw new Error(error.message);
        added.push(supabase.storage.from(VEHICLE_BUCKET).getPublicUrl(path).data.publicUrl);
      }
      onChange([...images, ...added]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(i: number) {
    // Only drop the URL from the (unsaved) form draft. The storage object is
    // deliberately kept: deleting it here would break the live site if the
    // admin cancels the modal, since the saved vehicle still references it.
    // Orphaned files are cheap; broken customer-facing images are not.
    onChange(images.filter((_, j) => j !== i));
  }

  function makePrimary(i: number) {
    if (i === 0) return;
    const next = [...images];
    const [picked] = next.splice(i, 1);
    next.unshift(picked);
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.78rem] font-semibold text-ink">{t.vehicles.gallery}</span>
        <Button type="button" variant="ghost" className="px-3 py-1.5 text-[0.78rem]" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? t.vehicles.uploading : t.vehicles.addImages}
        </Button>
      </div>
      <p className="mt-1 text-[0.72rem] text-stone">{t.vehicles.galleryHint}</p>
      {err && <p className="mt-1 text-[0.72rem] text-signal">{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />

      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, i) => (
            <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-mist bg-paper-dim">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-[0.58rem] font-semibold text-paper">{t.vehicles.primary}</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-ink/55 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 && (
                  <button type="button" onClick={() => makePrimary(i)} className="text-[0.6rem] font-semibold text-paper hover:underline">
                    {t.vehicles.makePrimary}
                  </button>
                )}
                <button type="button" onClick={() => removeAt(i)} className="ml-auto text-[0.6rem] font-semibold text-paper hover:underline">
                  {t.common.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
