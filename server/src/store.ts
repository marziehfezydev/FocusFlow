import { Redis } from '@upstash/redis';

/**
 * Tiny key-value interface. Two implementations:
 *  - Upstash Redis over HTTP (works from serverless functions, e.g. Vercel)
 *  - an in-memory fake, selected with FOCUSFLOW_STORE=memory (tests / local simulation)
 * With neither configured, `kv` is null and the app uses plain files on disk.
 */
export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: string, ttlSec?: number): Promise<void>;
  setnx(key: string, value: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  incr(key: string, ttlSec?: number): Promise<number>;
  hget(key: string, field: string): Promise<unknown>;
  hsetnx(key: string, field: string, value: string): Promise<boolean>;
  hlen(key: string): Promise<number>;
}

function upstash(url: string, token: string): KV {
  const r = new Redis({ url, token });
  return {
    get: (k) => r.get(k),
    set: async (k, v, ttl) => { if (ttl) await r.set(k, v, { ex: ttl }); else await r.set(k, v); },
    setnx: async (k, v) => (await r.setnx(k, v)) === 1,
    exists: async (k) => (await r.exists(k)) === 1,
    incr: async (k, ttl) => {
      const n = await r.incr(k);
      if (ttl && n === 1) await r.expire(k, ttl);
      return n;
    },
    hget: (k, f) => r.hget(k, f),
    hsetnx: async (k, f, v) => (await r.hsetnx(k, f, v)) === 1,
    hlen: (k) => r.hlen(k),
  };
}

function memory(): KV {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const counters = new Map<string, number>();
  const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
  return {
    get: async (k) => strings.get(k) ?? null, // values are stored as strings, so no object is shared between requests
    set: async (k, v) => { strings.set(k, v); },
    setnx: async (k, v) => { if (strings.has(k)) return false; strings.set(k, v); return true; },
    exists: async (k) => strings.has(k),
    incr: async (k) => { const n = (counters.get(k) ?? 0) + 1; counters.set(k, n); return n; },
    hget: async (k, f) => h(k).get(f) ?? null,
    hsetnx: async (k, f, v) => { if (h(k).has(f)) return false; h(k).set(f, v); return true; },
    hlen: async (k) => h(k).size,
  };
}

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const kv: KV | null =
  process.env.FOCUSFLOW_STORE === 'memory' ? memory() : url && token ? upstash(url, token) : null;

/** Upstash may hand back parsed JSON for values that were stored as JSON text. Accept both. */
export const parseJson = <T>(v: unknown): T | null =>
  v == null ? null : typeof v === 'string' ? (JSON.parse(v) as T) : (v as T);