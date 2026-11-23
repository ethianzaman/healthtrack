/**
 * Minimal Supabase Storage client over its REST API (no SDK): upload, short-lived signed links,
 * delete. The bucket is private, so files are only reachable through a signed link that our
 * server creates after checking who is asking. Pure: config and fetch are passed in (testable).
 */

export interface SupabaseStorageConfig {
  url: string;
  serviceKey: string;
  bucket: string;
}

export interface FileStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Link valid for `expiresIn` seconds; `downloadAs` makes the browser save it with that name. */
  signedUrl(key: string, expiresIn?: number, downloadAs?: string): Promise<string>;
  remove(keys: string[]): Promise<void>;
  /** Cheap request that keeps a free project from being paused for inactivity. */
  ping(): Promise<void>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** "a/b c.jpg" -> "a/b%20c.jpg" (each path segment encoded, slashes kept). */
const encodePath = (key: string) => key.split("/").map(encodeURIComponent).join("/");

export function createSupabaseStorage(config: SupabaseStorageConfig, fetchImpl: typeof fetch = fetch): FileStorage {
  const base = `${config.url.replace(/\/+$/, "")}/storage/v1`;
  // New-style secret keys (sb_secret_...) go only in the apikey header; legacy service_role JWTs also as Bearer.
  const headers: Record<string, string> = config.serviceKey.startsWith("sb_")
    ? { apikey: config.serviceKey }
    : { Authorization: `Bearer ${config.serviceKey}`, apikey: config.serviceKey };
  let bucketReady = false;

  async function call(path: string, init: RequestInit): Promise<Response> {
    const res = await fetchImpl(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) }, cache: "no-store" });
    return res;
  }

  async function fail(res: Response, what: string): Promise<never> {
    const text = await res.text().catch(() => "");
    throw new StorageError(`Storage ${what} failed (${res.status}): ${text.slice(0, 200)}`, res.status);
  }

  /** Creates the private bucket the first time it's needed. */
  async function ensureBucket() {
    if (bucketReady) return;
    const res = await call(`/bucket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: config.bucket, name: config.bucket, public: false, file_size_limit: 5 * 1024 * 1024 }),
    });
    // 200 created; 400/409 "already exists" is fine too.
    if (!res.ok && res.status !== 400 && res.status !== 409) await fail(res, "bucket setup");
    bucketReady = true;
  }

  return {
    async put(key, bytes, contentType) {
      const upload = () =>
        call(`/object/${config.bucket}/${encodePath(key)}`, {
          method: "POST",
          headers: { "Content-Type": contentType, "x-upsert": "false", "cache-control": "max-age=31536000" },
          body: bytes as BodyInit,
        });
      let res = await upload();
      if (!res.ok && !bucketReady && (res.status === 404 || res.status === 400)) {
        const body = await res.clone().text();
        if (/bucket not found/i.test(body)) {
          await ensureBucket();
          res = await upload();
        }
      }
      if (!res.ok) await fail(res, "upload");
      bucketReady = true;
    },

    async signedUrl(key, expiresIn = 300, downloadAs) {
      const res = await call(`/object/sign/${config.bucket}/${encodePath(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn }),
      });
      if (!res.ok) await fail(res, "signing");
      const { signedURL } = (await res.json()) as { signedURL?: string };
      if (!signedURL) throw new StorageError("Storage signing returned no link", 502);
      const url = `${base}${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
      return downloadAs ? `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(downloadAs)}` : url;
    },

    async remove(keys) {
      const list = keys.filter(Boolean);
      for (let i = 0; i < list.length; i += 100) {
        const res = await call(`/object/${config.bucket}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: list.slice(i, i + 100) }),
        });
        if (!res.ok && res.status !== 404) await fail(res, "delete");
      }
    },

    async ping() {
      const res = await call(`/bucket/${config.bucket}`, { method: "GET" });
      if (!res.ok && res.status !== 404) await fail(res, "ping");
    },
  };
}
