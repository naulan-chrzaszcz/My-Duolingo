// Mauvaises réponses crédibles pour les choix multiples
import { ITEM_UNIT, PROPER } from "./generate.js";

// ---- Mauvaises réponses crédibles : même forme que la bonne (majuscule, nombre de mots, longueur, ponctuation, type de mot), niveau proche ----
export function simScore(a, b) {
  const W = x => x.trim().split(/\s+/).length,
    wa = W(a),
    wb = W(b);
  let s = 0;
  const up = x => /^\p{Lu}/u.test(x.replace(/^[«"'¿¡(\s]+/, ""));
  if (up(a) === up(b)) s += 3;
  if (wa > 1 === wb > 1) s += 3;
  s -= Math.min(4, Math.abs(wa - wb) * 1.2);
  s -= Math.min(3, Math.abs(a.length - b.length) / 4);
  const end = x => (x.trim().match(/[?!.…]$/) || [""])[0];
  if (end(a) === end(b)) s += 3;
  else s -= 2;
  const pre = x =>
    (x.match(/^(to|the|a|an|le|la|les|l'|un|une|des|se|s'|je|i|you|we|il|elle)\b/i) || [""])[0].toLowerCase();
  if (pre(a) === pre(b)) s += 1.5;
  const suf = x =>
    (x.match(/(ing|ed|ly|tion|sion|ment|ness|ous|ful|able|ible|ive|er|ir|re|té|eux|euse|ant|ent|다|요|니다)$/i) || [
      "",
    ])[0].toLowerCase();
  if (suf(a) && suf(a) === suf(b)) s += 2;
  return s;
}
// Deux réponses « identiques » à l'œil : même mot à « to / le / la / l' » près, ou l'une contient l'autre
export const coreForm = x =>
  String(x)
    .toLowerCase()
    .replace(/[.,!?;:«»"()…]/g, " ")
    .replace(/^\s*(to|the|a|an|le|la|les|l'|un|une|se|s')\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
export function tooClose(a, b) {
  const x = coreForm(a),
    y = coreForm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const s = x.length < y.length ? x : y,
    l = x.length < y.length ? y : x;
  return s.length >= 4 && (" " + l + " ").includes(" " + s + " ");
}
export const POOLS = new WeakMap();
export function coursePool(C, key) {
  let m = POOLS.get(C);
  if (!m) POOLS.set(C, (m = {}));
  if (!m[key])
    m[key] = C.units.flatMap((U, u) => (U[key] || []).map(it => ({ s: it[1], src: it[0], u, lv: U.lv || 0 })));
  return m[key];
}
// k mauvaises réponses pour « ans » : les plus ressemblantes, avec un peu de hasard pour varier d'une fois à l'autre
export function similarOptions(C, key, ans, src, item, k) {
  const u0 = ITEM_UNIT.get(item);
  const lv0 = u0 != null && C.units[u0] ? C.units[u0].lv || 0 : null;
  const low = x => String(x).trim().toLowerCase();
  const seen = new Set([low(ans)]);
  const cands = [];
  for (const c of coursePool(C, key)) {
    if (typeof c.s !== "string" || !c.s.trim()) continue;
    const l = low(c.s);
    if (seen.has(l) || low(c.src) === low(src) || tooClose(c.s, ans)) continue;
    seen.add(l);
    if (lv0 != null && c.lv > lv0 + 1) continue;
    cands.push([
      simScore(ans, c.s) + (c.u === u0 ? 2 : u0 != null && Math.abs(c.u - u0) <= 2 ? 1 : 0) + Math.random() * 2.5,
      c.s,
    ]);
  }
  const up = /^\p{Lu}/u.test(ans),
    lo = /^\p{Ll}/u.test(ans);
  return cands
    .sort((x, y) => y[0] - x[0])
    .slice(0, k)
    .map(x => {
      let s = x[1];
      if (up && /^\p{Ll}/u.test(s)) s = s[0].toUpperCase() + s.slice(1);
      else if (lo && /^\p{Lu}\p{Ll}/u.test(s) && !/^(I|I'[a-z]+)\b/.test(s) && key === "v" && !PROPER.test(s))
        s = s[0].toLowerCase() + s.slice(1);
      return s;
    });
}
