"use client";

import Dexie, { type Table } from "dexie";
import { SYNC_MODE } from "./config";
import type { Store } from "./store";
import { supabase } from "./supabase";

/**
 * Photos. The picture itself lives in a separate local database (it is big, and never part of the
 * synced rows); the photos table holds its size and, once uploaded, its path in private storage.
 * Pictures are compressed on the device before they are kept: 1600 px WebP, plus a 480 px thumbnail.
 */
type Media = { id: string; full: Blob; thumb: Blob };
class MediaDB extends Dexie {
  media!: Table<Media, string>;
  constructor() { super("wahb-media"); this.version(1).stores({ media: "id" }); }
}
let db: MediaDB | null = null;
const media = () => (db ??= new MediaDB());

async function toWebp(bitmap: ImageBitmap, max: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Could not compress the photo"))), "image/webp", quality));
  return { blob, width, height };
}

/** Compress a picked file and keep it: returns the new photos row. */
export async function addPhoto(store: Store, file: File, memoryId: string | null) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const full = await toWebp(bitmap, 1600, 0.82);
  const thumb = await toWebp(bitmap, 480, 0.72);
  bitmap.close();
  const row = await store.put("photos", {
    memory_id: memoryId, width: full.width, height: full.height, bytes: full.blob.size,
    taken_at: file.lastModified ? new Date(file.lastModified).toISOString() : null, storage_path: null,
  });
  await media().media.put({ id: row.id, full: full.blob, thumb: thumb.blob });
  void uploadPending(store);
  return row;
}

const urls = new Map<string, string>();
/** A URL for a photo: the local copy if this device has it, otherwise a short-lived link to the private copy. */
export async function photoUrl(id: string, storagePath: string | null, size: "thumb" | "full" = "thumb"): Promise<string | null> {
  const key = `${id}:${size}`;
  if (urls.has(key)) return urls.get(key)!;
  const m = await media().media.get(id);
  if (m) { const u = URL.createObjectURL(size === "thumb" ? m.thumb : m.full); urls.set(key, u); return u; }
  if (storagePath && SYNC_MODE === "supabase") {
    const { data } = await supabase().storage.from("photos").createSignedUrl(storagePath, 3600);
    return data?.signedUrl ?? null;
  }
  return null;
}

export async function deletePhotoFile(id: string) { await media().media.delete(id); }

/** With sync on, send pictures that are only on this device to private storage under the owner's folder. */
export async function uploadPending(store: Store) {
  if (SYNC_MODE !== "supabase" || !navigator.onLine) return;
  const { data: auth } = await supabase().auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  for (const p of (await store.all("photos")).filter((x) => !x.storage_path)) {
    const m = await media().media.get(p.id);
    if (!m) continue;
    const path = `${uid}/${p.id}.webp`;
    const { error } = await supabase().storage.from("photos").upload(path, m.full, { contentType: "image/webp", upsert: true });
    if (!error) await store.patch("photos", p.id, { storage_path: path });
  }
}
