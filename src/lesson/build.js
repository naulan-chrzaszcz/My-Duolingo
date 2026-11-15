// Construction d'une leçon (étapes, version extrême)
import { COURSES } from "../content/index.js";
import { S } from "../core/accounts.js";
import { nextStep, unitOpen, unitSteps } from "../core/progress.js";
import { PSZ } from "../core/progress.js";
import { NODE, NPU, TIER, shuffle } from "../core/util.js";
import { TEMPL, ctxFor, make } from "../exercises/generate.js";
import { HG_T } from "../exercises/hangul.js";
import { dueReviews } from "./engine.js";

export const EXT_MAP = {
  mc: "type",
  mcw: "type",
  tilesRev: "type",
  tiles: "type",
  listenTiles: "listen",
  match: "type",
  choice: "spot",
  photo: "photo",
  pic: "picw",
  picw: "type",
  part2: "part2",
  jamo: "jamoRev",
  readw: "build",
};
export function extremize(T, kind, hg) {
  return T.map((t, i) => {
    if (hg) return t === "jamo" ? "hear" : t === "match" ? "build" : t === "mc" ? "readw" : t;
    if (kind === "volt") return t === "choice" ? (i % 2 ? "dictee" : "spot") : t;
    if (kind === "toeic" && t === "choice") return i % 3 ? "choice" : "type";
    return EXT_MAP[t] || t;
  }).concat(kind === "volt" ? ["dictee", "spot"] : hg ? ["build", "hear"] : ["speak", "listen"]);
}
/** v33 : séances plus courtes, façon Duolingo — on retire d'abord les types d'exercice les plus répétés. */
export function shorten(T, keep) {
  T = T.slice();
  while (T.length > keep) {
    const c = {};
    T.forEach(t => (c[t] = (c[t] || 0) + 1));
    const top = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
    T.splice(T.lastIndexOf(top), 1);
  }
  return T;
}
/** v35 : palier de difficulté d'une étape. Un thème découpé en unités à sujet propre repart du plus facile dans chaque unité. */
export function stepTier(U, n) {
  if (!U || !U.parts || NODE[n] !== "L") return TIER[n];
  const a = Math.floor(n / PSZ) * PSZ;
  const i = NODE.slice(a, n).filter(x => x === "L").length;
  const total = NODE.slice(a, a + PSZ).filter(x => x === "L").length;
  return total >= 5 ? [0, 0, 1, 2, 3][i] : total === 4 ? [0, 1, 2, 3][i] : [0, 1, 3][i];
}
/** v35 : le contenu d'une unité affichée (sa part des phrases, mots et QCM du thème). */
export function partUnit(U, part) {
  const P = U.parts && U.parts[part];
  if (!P) return U;
  // chaque liste nommée dans la partie (p, v, c, dd, hj, sy, mp, ph, l…) est restreinte à ses index ; les autres restent communes au thème
  const o = Object.assign({}, U, { t: P.t });
  Object.keys(P).forEach(k => {
    if (k !== "t" && Array.isArray(P[k]) && Array.isArray(U[k])) o[k] = P[k].map(i => U[k][i]).filter(x => x != null);
  });
  // v36 : notions de grammaire générées propres à l'unité (ids de grammar/*.json) ; liste vide = aucune
  if (Array.isArray(P.g)) o.g = P.g;
  return o;
}
export function buildLesson(cid, u, n, ext) {
  if (ext) {
    const C = COURSES[cid],
      U = C.units[u];
    const ctx = ctxFor(cid, C.units.slice(Math.max(0, u - 1), u + 1), { dis: 8, hideP2: true });
    if (U.hg) ctx.allHj = C.units.slice(0, u + 1).flatMap(x => x.hj || []);
    const T = extremize(
      U.hg ? HG_T[Math.max(0, Math.min(3, TIER[n] + 1))] : TEMPL[C.kind][Math.min(4, Math.max(0, TIER[n]) + 1)],
      C.kind,
      !!U.hg,
    );
    return shorten(T, 12)
      .map(t => make(t, ctx))
      .filter(Boolean)
      .map(e => Object.assign(e, { hidden: true }));
  }
  const C = COURSES[cid],
    U = C.units[u];
  if (U.hg) {
    const ctx = ctxFor(cid, [U.parts && n < NPU - 1 ? partUnit(U, Math.floor(n / PSZ)) : U]);
    ctx.allHj = C.units.slice(0, u + 1).flatMap(x => x.hj || []);
    return shorten(HG_T[Math.max(0, stepTier(U, n))], n >= NPU - 1 ? 12 : 10)
      .map(t => make(t, ctx))
      .filter(Boolean)
      .concat(dueReviews(cid, 1));
  }
  let prevP = C.units.slice(0, u).flatMap(x => x.p || []);
  // v35 : une unité à sujet propre travaille sa part du thème ; les unités précédentes du thème reviennent en révision
  const part = Math.floor(n / PSZ);
  const own = U.parts && n < NPU - 1;
  const UU = own ? partUnit(U, part) : U;
  if (own) prevP = prevP.concat(U.parts.slice(0, part).flatMap((P, i) => partUnit(U, i).p));
  const TIERN = stepTier(U, n);
  const ctx = ctxFor(cid, [UU], { dis: Math.min(6, 2 + u), hideP2: u >= 2 });
  // une unité à sujet propre a peu de phrases : une seule phrase de révision, et aucune pendant la découverte
  const nPrev = own ? (TIERN >= 1 ? 1 : 0) : 3;
  if (prevP.length && ctx.p.length && nPrev) ctx.p = shuffle([...ctx.p, ...shuffle(prevP).slice(0, nPrev)]);
  if (TIERN === 0 && ctx.p.length) ctx.p.sort((a, b) => a[1].length - b[1].length); // crescendo : phrases courtes d'abord
  let T = TEMPL[C.kind][Math.max(0, TIERN)].slice();
  if (C.kind === "trans") {
    if (UU.c && UU.c.length && n < NPU - 1) {
      T[4] = "choice";
      T[8] = "choice";
      T[12] = "choice";
      if (TIERN >= 2) T[10] = "spot";
    }
    if (u >= 2) T = T.map(t => (t === "tiles" && Math.random() < 0.4 ? "type" : t));
    if (u >= 3) T = T.map(t => (t === "mc" ? "tiles" : t === "listenTiles" ? "listen" : t));
  }
  if (UU.cv && UU.cv.length)
    T = T.map((t, i) => (t === "choice" || t === "part2" || t === "read" ? (i % 3 === 2 ? "part2" : "conv") : t));
  if (UU.rd && UU.rd.length)
    T = T.map((t, i) => (t === "choice" || t === "part2" || t === "conv" ? (i % 4 === 3 ? "choice" : "read") : t));
  const exs = shorten(T, n >= NPU - 1 ? 12 : 10)
    .map(t => make(t, ctx))
    .filter(Boolean);
  return exs.concat(dueReviews(cid, n >= NPU - 1 ? 2 : 1));
}
export function unlockedUnits(cid) {
  const C = COURSES[cid];
  const ns = nextStep(cid);
  const pl = (S.place && S.place[cid]) || 0;
  const r = C.units.filter(
    (U, u) => unitSteps(cid, u) > 0 || (ns && ns.u === u) || (U.lv < pl && unitOpen(cid, u) && !U.gen),
  );
  return r.length ? r : [C.units.find((U, u) => unitOpen(cid, u)) || C.units[0]];
}
