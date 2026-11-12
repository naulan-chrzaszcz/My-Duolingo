// Construction d'une leçon (étapes, version extrême)
import { COURSES } from "../content/index.js";
import { S } from "../core/accounts.js";
import { nextStep, unitOpen, unitSteps } from "../core/progress.js";
import { NPU, TIER, shuffle } from "../core/util.js";
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
    return T.map(t => make(t, ctx))
      .filter(Boolean)
      .map(e => Object.assign(e, { hidden: true }));
  }
  const C = COURSES[cid],
    U = C.units[u];
  if (U.hg) {
    const ctx = ctxFor(cid, [U]);
    ctx.allHj = C.units.slice(0, u + 1).flatMap(x => x.hj || []);
    return HG_T[Math.max(0, TIER[n])]
      .map(t => make(t, ctx))
      .filter(Boolean)
      .concat(dueReviews(cid, 2));
  }
  const prevP = C.units.slice(0, u).flatMap(x => x.p || []);
  const ctx = ctxFor(cid, [U], { dis: Math.min(6, 2 + u), hideP2: u >= 2 });
  if (prevP.length && ctx.p.length) ctx.p = shuffle([...ctx.p, ...shuffle(prevP).slice(0, 3)]);
  if (TIER[n] === 0 && ctx.p.length) ctx.p.sort((a, b) => a[1].length - b[1].length); // crescendo : phrases courtes d'abord
  let T = TEMPL[C.kind][Math.max(0, TIER[n])].slice();
  if (C.kind === "trans") {
    if (U.c && U.c.length && n < NPU - 1) {
      T[4] = "choice";
      T[8] = "choice";
      T[12] = "choice";
      if (TIER[n] >= 2) T[10] = "spot";
    }
    if (u >= 2) T = T.map(t => (t === "tiles" && Math.random() < 0.4 ? "type" : t));
    if (u >= 3) T = T.map(t => (t === "mc" ? "tiles" : t === "listenTiles" ? "listen" : t));
  }
  if (U.cv)
    T = T.map((t, i) => (t === "choice" || t === "part2" || t === "read" ? (i % 3 === 2 ? "part2" : "conv") : t));
  if (U.rd)
    T = T.map((t, i) => (t === "choice" || t === "part2" || t === "conv" ? (i % 4 === 3 ? "choice" : "read") : t));
  const exs = T.map(t => make(t, ctx)).filter(Boolean);
  return exs.concat(dueReviews(cid, n >= NPU - 1 ? 3 : 2));
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
