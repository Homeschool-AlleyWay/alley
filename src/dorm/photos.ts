/** Collage photo storage. Photos NEVER leave the device: IndexedDB only (in-memory fallback in private mode). */
import { DORM_PHOTOS_DB } from "./types";

export type PhotoKind = "photo" | "screenshot";
export interface PhotoRec { id: string; at: number; kind: PhotoKind; blob: Blob; caption: string }
export type AddResult = { ok: true; id: string } | { ok: false; error: string };
export const MAX_PHOTOS = 60;
const STORE = "photos";

const mem = new Map<string, PhotoRec>();
let dbp: Promise<IDBDatabase | null> | null = null;
let urlSet: string[] = [];

function openDb(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      if (typeof indexedDB === "undefined") return res(null);
      const rq = indexedDB.open(DORM_PHOTOS_DB, 1);
      rq.onupgradeneeded = () => { try { rq.result.createObjectStore(STORE, { keyPath: "id" }); } catch { /* exists */ } };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null); rq.onblocked = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return openDb().then((db) => new Promise<T | undefined>((res, rej) => {
    if (!db) return rej(new Error("nodb"));
    try { const r = fn(db.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); }
  }));
}
async function putRec(r: PhotoRec) { try { await tx("readwrite", (s) => s.put(r)); mem.delete(r.id); } catch { mem.set(r.id, r); } }

/** newest first */
export async function listPhotos(): Promise<PhotoRec[]> {
  let all: PhotoRec[] = [];
  try { all = ((await tx("readonly", (s) => s.getAll())) as PhotoRec[] | undefined) ?? []; } catch { /* memory only */ }
  const ids = new Set(all.map((r) => r.id)); mem.forEach((r) => { if (!ids.has(r.id)) all.push(r); });
  return all.sort((a, b) => b.at - a.at);
}

async function downscale(file: Blob, max = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.82));
}

/** Adds a photo. When MAX_PHOTOS are stored an error is returned (nothing is ever dropped silently). */
export async function addPhoto(file: Blob, kind: PhotoKind = "photo", caption = ""): Promise<AddResult> {
  try {
    if ((await listPhotos()).length >= MAX_PHOTOS) return { ok: false, error: `The collage is full (${MAX_PHOTOS} pictures). Delete one to add another.` };
    let blob: Blob;
    try { blob = await downscale(file); } catch { return { ok: false, error: "That file could not be read as a picture." }; }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await putRec({ id, at: Date.now(), kind, blob, caption: caption.slice(0, 120) });
    return { ok: true, id };
  } catch (e) { return { ok: false, error: "Could not save the picture: " + ((e as Error)?.message || "unknown") }; }
}

/** object URLs (newest first); call revokeUrls() / dispose() when done */
export async function urls(): Promise<string[]> {
  const list = await listPhotos(); revokeUrls();
  urlSet = list.map((r) => URL.createObjectURL(r.blob)); return urlSet.slice();
}
export function revokeUrls() { for (const u of urlSet) URL.revokeObjectURL(u); urlSet = []; }
export const dispose = revokeUrls;

export async function deletePhoto(id: string): Promise<boolean> {
  mem.delete(id);
  try { await tx("readwrite", (s) => s.delete(id)); return true; } catch { return mem.size >= 0; }
}
export async function captionPhoto(id: string, text: string): Promise<boolean> {
  const r = (await listPhotos()).find((x) => x.id === id); if (!r) return false;
  r.caption = text.slice(0, 120); await putRec(r); return true;
}
