// Réserve des réponses de l'IA (v38.2), sur l'appareil seulement : IndexedDB, jamais synchronisée.
// Chaque profil paie sa propre clé Claude : relancer la même séance ne doit pas repayer la même génération.
// Pour une même demande, on garde jusqu'à AI_CACHE.versions réponses ; une fois la réserve pleine,
// on en ressert une au hasard sans appeler Claude. Les exercices étant tirés au hasard dans la réponse,
// deux séances bâties sur la même version restent différentes.

export const AI_CACHE = {
  versions: 3, // réponses gardées par demande d'exercices
  days: 30, // durée de vie d'une réserve, à partir de sa première réponse
  max: 60, // demandes gardées au plus ; la moins récemment utilisée part en premier
};

export type CacheEntry = { k: string; v: string[]; ts: number; used: number };

// Nombre de versions à garder selon le mode de génération (0 = jamais en réserve)
export function cacheVersions(mode: string): number {
  // histoires et unités créées s'ajoutent au profil : une réponse resservie ferait un doublon
  if (mode === "story" || mode === "unit") return 0;
  // une traduction, une explication ou une correction ne gagne rien à être redemandée
  if (mode === "word" || mode === "explain" || mode === "write") return 1;
  return AI_CACHE.versions;
}

// Empreinte de la demande (deux empreintes de 53 bits + longueur) : on ne garde jamais le texte du prompt
export function cacheKey(s: string): string {
  const h = (seed: number) => {
    let h1 = 0xdeadbeef ^ seed,
      h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  return h(1) + "-" + h(2) + "-" + s.length.toString(36);
}

const DB_NAME = "speakeasy-ai",
  STORE = "r";
let dbp: Promise<IDBDatabase | null> | null = null;
const within = <T>(p: Promise<T>, ms: number, dflt: T): Promise<T> =>
  Promise.race([p, new Promise<T>(res => setTimeout(() => res(dflt), ms))]).catch(() => dflt);

// Ouverture de la base ; null si IndexedDB est absent ou bloqué (navigation privée) : l'IA est alors appelée normalement
function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = within(
    new Promise<IDBDatabase | null>(res => {
      try {
        const rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = () => {
          if (!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE, { keyPath: "k" });
        };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
        rq.onblocked = () => res(null);
      } catch (e) {
        res(null);
      }
    }),
    3000,
    null,
  ).then(d => {
    if (!d) dbp = null; // nouvel essai au prochain appel
    return d;
  });
  return dbp;
}
function req<T>(mode: IDBTransactionMode, fn: (st: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return db().then(d => {
    if (!d) return null;
    return within(
      new Promise<T | null>(res => {
        try {
          const r = fn(d.transaction(STORE, mode).objectStore(STORE));
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(null);
        } catch (e) {
          res(null);
        }
      }),
      3000,
      null,
    );
  });
}

const fresh = (e: CacheEntry | null | undefined): e is CacheEntry =>
  !!e && Array.isArray(e.v) && Date.now() - (e.ts || 0) < AI_CACHE.days * 864e5;

export async function cacheGet(k: string): Promise<CacheEntry | null> {
  const e = await req<CacheEntry>("readonly", st => st.get(k));
  return fresh(e) ? e : null;
}

// Une réponse au hasard dans la réserve, relue depuis le texte gardé (l'appelant peut la modifier sans rien abîmer)
export function cachePick(e: CacheEntry): unknown {
  e.used = Date.now();
  req("readwrite", st => st.put(e));
  try {
    return JSON.parse(e.v[Math.floor(Math.random() * e.v.length)]);
  } catch (err) {
    return null;
  }
}

export async function cachePut(k: string, raw: unknown, cap: number): Promise<void> {
  let text: string;
  try {
    text = JSON.stringify(raw);
  } catch (e) {
    return;
  }
  if (!text || text.length > 200000) return;
  const now = Date.now();
  const old = await req<CacheEntry>("readonly", st => st.get(k));
  const e: CacheEntry = fresh(old) ? old : { k, v: [], ts: now, used: now };
  if (!e.v.includes(text)) e.v.push(text);
  e.v = e.v.slice(-cap);
  e.used = now;
  await req("readwrite", st => st.put(e));
  // ménage : réserves expirées, puis les moins récemment utilisées au-delà de AI_CACHE.max
  const all = (await req<CacheEntry[]>("readonly", st => st.getAll())) || [];
  const drop: CacheEntry[] = all.filter((x): boolean => !fresh(x));
  const live = all.filter(fresh).sort((a, b) => (b.used || 0) - (a.used || 0));
  drop.push(...live.slice(AI_CACHE.max));
  for (const x of drop) await req("readwrite", st => st.delete(x.k));
}

export async function cacheCount(): Promise<number> {
  return (await req<number>("readonly", st => st.count())) || 0;
}
export async function cacheClear(): Promise<void> {
  await req("readwrite", st => st.clear());
}
