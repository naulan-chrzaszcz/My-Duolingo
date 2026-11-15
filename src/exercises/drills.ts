// Notions de grammaire : phrases générées à partir de gabarits (src/content/grammar/*.json).
// Une même règle produit des dizaines de phrases différentes (sujets, lieux, moments tirés au hasard),
// avec des mauvaises réponses toujours réelles : impossible de retenir la réponse par cœur.
//
// Syntaxe des gabarits :
//   {a|b|c}   un choix au hasard
//   {1=a|b|c} un choix lié : toutes les accolades « 1= » de l'élément prennent le même rang
//   {@liste}  un mot du lexique de la langue (lex), {1=@liste} pour un choix lié
import EN from "../content/grammar/en.json";
import FR from "../content/grammar/fr.json";
import KO from "../content/grammar/ko.json";
import { COURSES } from "../content/index.js";
import { S } from "../core/accounts.js";
import { shuffle } from "../core/util.js";
import { EN_TXT } from "../i18n/dict-en.js";
import { KO_TXT } from "../i18n/dict-ko.js";
import { UI } from "../i18n/locale.js";
import { ITEM_UNIT } from "./generate.js";

/** Élément de QCM : [question avec ___, options (la 1re est la bonne), n° de règle, indice, autres réponses acceptées]. */
export type DrillItem = [string, string[], number, (string | null)?, string[]?];
/** Paire de traduction : phrase source par langue d'interface, traductions acceptées, traductions fautives. */
export interface DrillPair {
  s: Record<string, string>;
  t: string[];
  x?: string[];
}
export interface DrillSub {
  id: string;
  t: string;
  lv: number;
  memo: string;
  r: string[];
  i: DrillItem[];
  p?: DrillPair[];
}
export interface DrillNotion {
  id: string;
  ic: string;
  t: string;
  d: string;
  subs: DrillSub[];
}
export interface DrillSet {
  lang: string;
  cid: string;
  lex: Record<string, string[]>;
  notions: DrillNotion[];
  units: Record<string, Record<string, string[]>>;
}
/** QCM généré, au format des QCM des cours ([question, options, index, explication]) plus quelques propriétés. */
export type GenItem = [string, string[], number, string] & { _sub: string; _k: string; _h?: string; _a?: string[] };
/** Paire générée, au format des phrases des cours ([source, cible, ...variantes]) plus les traductions fautives. */
export type GenPair = string[] & { _sub: string; _k: string; _x: string[] };

export const DRILL_SETS: Record<string, DrillSet> = {
  en: EN as unknown as DrillSet,
  fr: FR as unknown as DrillSet,
  ko: KO as unknown as DrillSet,
};
/** Jeu de notions d'un cours (les trois cours d'anglais partagent le même). */
export function drillSetFor(cid: string): DrillSet | null {
  if (cid === "fr-fle") return DRILL_SETS.fr;
  if (cid === "ko") return DRILL_SETS.ko;
  if (/^en-/.test(cid)) return DRILL_SETS.en;
  return null;
}
const SUBS = new Map<string, { sub: DrillSub; notion: DrillNotion; set: DrillSet }>();
for (const set of Object.values(DRILL_SETS))
  for (const notion of set.notions) for (const sub of notion.subs) SUBS.set(sub.id, { sub, notion, set });
export const drillSub = (id: string) => SUBS.get(id) || null;

/** Texte de consigne (titre, mémo, règle) dans la langue d'interface. */
export function dtx(s: string): string {
  if (UI === "fr" || typeof s !== "string") return s;
  const D = (UI === "ko" ? KO_TXT : EN_TXT) as Record<string, string>;
  return Object.prototype.hasOwnProperty.call(D, s) ? D[s] : s;
}

const GROUP = /\{(?:(\d)=)?([^{}]*)\}/g;
/** Remplace les accolades d'un gabarit ; « picks » garde le rang des choix liés pour tout l'élément. */
export function expand(s: string, picks: Map<string, number>, lex: Record<string, string[]>): string {
  return s.replace(GROUP, (_m, tag: string | undefined, body: string) => {
    const alts = body.startsWith("@") ? lex[body.slice(1)] || [body] : body.split("|");
    if (!tag) return alts[Math.floor(Math.random() * alts.length)];
    if (!picks.has(tag)) picks.set(tag, Math.floor(Math.random() * alts.length));
    return alts[picks.get(tag)! % alts.length];
  });
}

// Gabarits vus récemment : on évite de reposer la même structure deux fois de suite
const RECENT: string[] = [];
function remember(k: string) {
  RECENT.push(k);
  if (RECENT.length > 14) RECENT.shift();
}
function pickIndex(n: number, key: (i: number) => string): number {
  const order: number[] = shuffle(Array.from({ length: n }, (_, i) => i));
  return order.find(i => !RECENT.includes(key(i))) ?? order[0];
}

/** Un QCM tiré d'une règle (index de gabarit facultatif). */
export function genItem(set: DrillSet, sub: DrillSub, idx?: number): GenItem | null {
  if (!sub.i.length) return null;
  const i = idx ?? pickIndex(sub.i.length, j => sub.id + "#" + j);
  const [q, opts, r, h, a] = sub.i[i];
  for (let tries = 0; tries < 6; tries++) {
    const picks = new Map<string, number>();
    const Q = expand(q, picks, set.lex);
    const O = opts.map(o => expand(o, picks, set.lex));
    if (new Set(O).size !== O.length) continue; // deux options identiques après tirage : on retire
    const it = [Q, O, 0, dtx(sub.r[r] || sub.r[0])] as unknown as GenItem;
    it._sub = sub.id;
    it._k = sub.id + "#" + i;
    if (h) it._h = expand(h, picks, set.lex);
    if (a && a.length) it._a = a.map(x => expand(x, picks, set.lex));
    remember(it._k);
    return it;
  }
  return null;
}
/** Une phrase à traduire tirée d'une règle, ou null si la règle n'en a pas pour cette langue d'interface. */
export function genPair(set: DrillSet, sub: DrillSub, idx?: number): GenPair | null {
  const ps = (sub.p || []).filter(p => p.s[UI]);
  if (!ps.length) return null;
  const i = idx ?? pickIndex(ps.length, j => sub.id + "@" + j);
  const P = ps[i];
  const picks = new Map<string, number>();
  const src = expand(P.s[UI], picks, set.lex);
  const t = P.t.map(x => expand(x, picks, set.lex));
  const arr = [src, ...t] as GenPair;
  arr._sub = sub.id;
  arr._k = sub.id + "@" + i;
  arr._x = (P.x || []).map(x => expand(x, picks, set.lex));
  remember(arr._k);
  return arr;
}

/** Ajoute aux données d'une leçon des phrases générées sur les règles de ses unités (environ la moitié des QCM). */
export function mixDrills(ctx: any, units: any[]) {
  if (!ctx || ctx.noDrill) return;
  const set = drillSetFor(ctx.cid);
  if (!set) return;
  const map = set.units[ctx.cid] || {};
  const C = ctx.C;
  const add: GenItem[] = [],
    addP: GenPair[] = [];
  const seen = new Set<string>([...(ctx.c || []).map((c: any) => c[0]), ...(ctx.p || []).map((p: any) => p[1])]);
  for (const U of units) {
    // v36 : une unité à sujet propre ne travaille que ses notions (U.g, donné par partUnit) ; sinon celles du thème
    const ids: string[] | undefined = Array.isArray(U.g) ? U.g : map[U.t0 || U.t];
    if (!ids) continue;
    const subs = ids.map(id => (SUBS.get(id) || ({} as any)).sub).filter(Boolean) as DrillSub[];
    if (!subs.length) continue;
    const u = C.units.indexOf(U);
    const n = Math.max(3, Math.min(6, (U.c || []).length));
    // jamais deux fois la même phrase dans une leçon
    for (let k = 0, got = 0; k < n * 3 && got < n && add.length < 24; k++) {
      const it = genItem(set, subs[k % subs.length]);
      if (!it || seen.has(it[0])) continue;
      seen.add(it[0]);
      if (u >= 0) ITEM_UNIT.set(it, u);
      add.push(it);
      got++;
    }
    if ((U.p || []).length)
      for (let k = 0, got = 0; k < 9 && got < 3 && addP.length < 12; k++) {
        const p = genPair(set, subs[k % subs.length]);
        if (!p || seen.has(p[1])) continue;
        seen.add(p[1]);
        if (u >= 0) ITEM_UNIT.set(p, u);
        addP.push(p);
        got++;
      }
  }
  if (add.length) {
    ctx.c = shuffle(ctx.c.concat(add));
    ctx.cs = shuffle(ctx.cs.concat(add));
  }
  if (addP.length && ctx.p.length) ctx.p = shuffle(ctx.p.concat(addP));
}

/** Taux de réussite d'une règle ou d'une notion entière (null si jamais travaillée). */
export function drillRate(ids: string[]): number | null {
  const d = ((S as any).drill || {}) as Record<string, [number, number]>;
  let n = 0,
    k = 0;
  ids.forEach(id => {
    const x = d[id];
    if (x) {
      n += x[0];
      k += x[1];
    }
  });
  return n ? Math.round(((n - k) / n) * 100) : null;
}
/** Enregistre une réponse (première tentative) pour le taux de réussite par règle. */
export function drillRecord(sub: string, ok: boolean) {
  const s = S as any;
  const d = (s.drill = s.drill || {});
  const x = (d[sub] = d[sub] || [0, 0]);
  x[0]++;
  if (!ok) x[1]++;
}
/** Titre traduit d'une règle (sert aux statistiques). */
export function drillLabel(sub: string): string {
  const x = SUBS.get(sub);
  return x ? dtx(x.sub.t) : sub;
}
/** Règles concernées par une séance : une notion, une règle, ou tout. */
export function drillSubs(set: DrillSet, pick?: string): DrillSub[] {
  if (!pick) return set.notions.flatMap(n => n.subs);
  const n = set.notions.find(x => x.id === pick);
  if (n) return n.subs;
  const s = SUBS.get(pick);
  return s ? [s.sub] : [];
}
/** Cours utilisé pour une séance de notions (langue, statistiques). */
export const drillCid = (set: DrillSet) => (COURSES[set.cid] ? set.cid : Object.keys(COURSES)[0]);
