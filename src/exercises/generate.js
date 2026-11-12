// Génération des exercices à partir des données d'unité : make(type, ctx)
import { COURSES } from "../content/index.js";
import { S } from "../core/accounts.js";
import { rnd, shuffle } from "../core/util.js";
import { similarOptions } from "./distractors.js";
import { HG_CHO, HG_JUNG, hgDecomp } from "./hangul.js";
import { noNote, words } from "./validate.js";
import { BASE_LANG } from "../i18n/locale.js";

// ===================== GÉNÉRATION D'EXERCICES =====================
export function pairOf(C, a) {
  return C.rom
    ? { src: a[0], tgt: a[1], rom: a[2], alts: [a[1], ...a.slice(3)] }
    : { src: a[0], tgt: a[1], rom: "", alts: a.slice(1) };
}
export const allPairs = C => C.units.flatMap(u => u.p || []);
export function ctxFor(cid, units, o = {}) {
  const C = COURSES[cid];
  const g = k => units.flatMap(u => u[k] || []);
  return Object.assign(
    {
      C,
      cid,
      p: shuffle(g("p")),
      cs: shuffle(g("c").filter(c => c[0].includes("___"))),
      hj: shuffle(g("hj")),
      sy: shuffle(g("sy")),
      mp: shuffle(g("mp")),
      allHj: C.units.flatMap(u => u.hj || []),
      ph: shuffle(g("ph")),
      c: shuffle(g("c")),
      l: shuffle(g("l")),
      d: shuffle(g("dd")),
      cv: shuffle(g("cv")),
      rd: shuffle(g("rd")),
      v: g("v"),
      allP: allPairs(C),
      ptr: { p: 0, c: 0, cs: 0, ph: 0, hj: 0, sy: 0, mp: 0, l: 0, d: 0, v: 0, cv: 0, rd: 0 },
      dis: 3,
      hideP2: false,
    },
    o,
  );
}
export const NEED = {
  mc: "p",
  mcw: "v",
  tiles: "p",
  tilesRev: "p",
  type: "p",
  listen: "p",
  listenTiles: "p",
  speak: "p",
  match: "v",
  choice: "c",
  part2: "l",
  dictee: "d",
  conv: "cv",
  read: "rd",
  spot: "cs",
  photo: "ph",
  jamo: "hj",
  jamoRev: "hj",
  hear: "mp",
  readw: "p",
  build: "sy",
};
export const FB = {
  match: ["mc"],
  mcw: ["mc"],
  choice: ["tiles", "dictee"],
  part2: ["choice", "listenTiles"],
  dictee: ["choice", "listen"],
  speak: ["listenTiles"],
  conv: ["part2", "listenTiles"],
  read: ["choice", "tiles"],
  spot: ["choice"],
  photo: ["part2", "choice"],
  jamo: ["mc"],
  jamoRev: ["mc"],
  hear: ["listenTiles"],
  readw: ["mc"],
  build: ["mc"],
};
export function take(ctx, k) {
  const a = ctx[k];
  const it = a[ctx.ptr[k] % a.length];
  ctx.last = it;
  ctx.ptr[k]++;
  if (ctx.ptr[k] % a.length === 0 && a.length > 2) ctx[k] = shuffle(a);
  return it;
}
export function distract(pool, answerWords, k) {
  const set = new Set(answerWords.map(w => w.toLowerCase()));
  const out = [];
  for (const w of shuffle(pool)) {
    const lw = w.toLowerCase();
    if (!set.has(lw) && !out.some(o => o.toLowerCase() === lw)) out.push(lw === w ? w : w.toLowerCase());
    if (out.length >= k) break;
  }
  return out;
}
export const ITEM_UNIT = new WeakMap();
export const PROPER =
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|English|French|Korean|Paris|London|Seoul|Internet|TOEIC|Mr|Mrs|Ms|Dr|[A-Z]{2,})\b/;
export function indexItems() {
  Object.entries(COURSES).forEach(([cid, C]) =>
    C.units.forEach((U, ui) =>
      ["p", "c", "v", "l", "dd", "cv", "rd", "ph", "hj", "sy", "mp"].forEach(k =>
        (U[k] || []).forEach(it => {
          if (it && typeof it === "object") ITEM_UNIT.set(it, ui);
        }),
      ),
    ),
  );
}
export function make(t, ctx) {
  ctx.last = null;
  const ex = make0(t, ctx);
  if (ex && ex._u == null && ctx.last && typeof ctx.last === "object") {
    const u = ITEM_UNIT.get(ctx.last);
    if (u != null) ex._u = u;
  }
  return ex;
}
export function make0(t, ctx) {
  const { C } = ctx,
    lang = C.lang;
  const soff = S.listenOff > Date.now();
  if (t === "speak" && (soff || S.speakOff > Date.now())) t = soff ? "tiles" : "listenTiles";
  if (soff) {
    if (t === "listenTiles") t = "tiles";
    else if (t === "listen") t = "type";
    else if (t === "dictee" && ctx.p && ctx.p.length) t = "type";
    else if ((t === "hear" || t === "jamoRev") && ctx.hj && ctx.hj.length) t = "jamo";
    else if (t === "part2" || t === "conv" || t === "photo")
      t = ctx.c && ctx.c.length ? "choice" : ctx.rd && ctx.rd.length ? "read" : t;
  }
  const order = [t, ...(FB[t] || []), "choice", "mc", "dictee"];
  t = order.find(x => ctx[NEED[x]] && ctx[NEED[x]].length);
  if (!t) return null;
  if (t === "match") {
    const v = shuffle(ctx.v).slice(0, 5);
    if (v.length < 3) return make0("mc", ctx);
    return { t, lang, pairs: v };
  }
  if (t === "mcw") {
    const w = take(ctx, "v");
    let others = similarOptions(C, "v", w[1], w[0], w, 3);
    if (others.length < 3)
      others = others.concat(
        shuffle(ctx.v.filter(x => x[1] !== w[1] && !others.includes(x[1])))
          .slice(0, 3 - others.length)
          .map(x => x[1]),
      );
    return { t: "mc", lang, w: true, prompt: w[0], answer: w[1], options: shuffle([w[1], ...others]), speak: w[1] };
  }
  if (t === "choice") {
    const c = take(ctx, "c");
    return { t, lang, q: c[0], answer: c[1][c[2]], options: shuffle(c[1]), e: c[3], kind: C.kind };
  }
  if (t === "part2") {
    const l = take(ctx, "l");
    return { t, lang, q: l[0], answer: l[1][l[2]], options: shuffle(l[1]), hidden: ctx.hideP2 };
  }
  if (t === "conv" || t === "read") {
    const it = take(ctx, t === "conv" ? "cv" : "rd");
    const qq = rnd(it.q);
    return { t, lang, d: it.d, x: it.x, g: it.g, q: qq[0], answer: qq[1][qq[2]], options: shuffle(qq[1]), e: qq[3] };
  }
  if (t === "spot") {
    const c = take(ctx, "cs");
    const right = c[1][c[2]];
    const others = c[1].filter((_, i) => i !== c[2]);
    const faulty = Math.random() < 0.65 && others.length > 0;
    const wrong = faulty ? rnd(others) : right;
    let q = c[0],
      hint = "";
    const m = q.match(/\s*\(([^)]*)\)\s*$/);
    if (m) {
      hint = m[1];
      q = q.slice(0, m.index);
    }
    const [before, after] = q.split("___");
    return {
      t,
      lang,
      before,
      after: after || "",
      chunk: wrong,
      right,
      faulty,
      e: c[3],
      hint,
      q: c[0],
      answer: right,
      kind: C.kind,
    };
  }
  if (t === "jamo" || t === "jamoRev") {
    const j = take(ctx, "hj");
    const others = shuffle(ctx.allHj.filter(x => x[0] !== j[0] && x[1] !== j[1])).slice(0, 3);
    if (t === "jamo")
      return {
        t: "hg",
        lang,
        title: "Quel son fait cette lettre ?",
        big: j[0],
        answer: j[1],
        options: shuffle([j[1], ...others.map(x => x[1])]),
        after: j[2],
        q: j[0],
      };
    return {
      t: "hg",
      lang,
      title: `Quelle lettre fait le son « ${j[1]} » ?`,
      auto: j[2],
      answer: j[0],
      options: shuffle([j[0], ...others.map(x => x[0])]),
      optAudio: Object.fromEntries([j, ...others].map(x => [x[0], x[2]])),
      after: j[2],
      letters: true,
      q: j[1],
    };
  }
  if (t === "hear") {
    const g = take(ctx, "mp");
    const a = rnd(g);
    let opts = g.slice();
    if (opts.length < 3)
      opts = opts.concat(shuffle(ctx.sy.map(x => x[0]).filter(x => !opts.includes(x))).slice(0, 3 - opts.length));
    return {
      t: "hg",
      lang,
      title: "Qu'entends-tu ?",
      auto: a,
      answer: a,
      options: shuffle(opts),
      after: a,
      letters: true,
      q: "écoute (" + g.join(" / ") + ")",
    };
  }
  if (t === "readw") {
    const P = pairOf(C, take(ctx, "p"));
    if (!P.rom) return make0("mc", ctx);
    const others = shuffle([...new Set(ctx.allP.filter(a => a[1] !== P.tgt && a[2]).map(a => a[2]))]).slice(0, 3);
    return {
      t: "hg",
      lang,
      title: "Comment se lit ce mot ?",
      big: P.tgt,
      sub: "« " + P.src + " »",
      answer: P.rom,
      options: shuffle([P.rom, ...others]),
      after: P.tgt,
      q: P.tgt,
    };
  }
  if (t === "build") {
    const y = take(ctx, "sy");
    const parts = hgDecomp(y[0]);
    const pool = [...HG_CHO.filter(x => x !== "ㅇ" || true), ...HG_JUNG.slice(0, 14)];
    return {
      t,
      lang,
      syl: y[0],
      roman: y[1],
      parts,
      tiles: shuffle([...parts, ...shuffle(pool.filter(x => !parts.includes(x))).slice(0, 4)]),
      answer: y[0],
      q: y[1],
    };
  }
  if (t === "photo") {
    const p = take(ctx, "ph");
    return {
      t,
      lang,
      scene: p[0],
      img: p[4] || "",
      cap: p[1],
      answer: p[2][p[3]],
      options: shuffle(p[2]),
      hidden: ctx.hideP2,
      q: p[1],
    };
  }
  if (t === "dictee") {
    const d = take(ctx, "d");
    return { t, lang, answer: d, audio: d, alts: [d] };
  }
  const P = pairOf(C, take(ctx, "p"));
  const base = { lang, prompt: P.src, answer: P.tgt, alts: P.alts, rom: P.rom };
  if (t === "mc") {
    let others = ctx.last && ITEM_UNIT.has(ctx.last) ? similarOptions(C, "p", P.tgt, ctx.last[0], ctx.last, 3) : [];
    if (others.length < 3)
      others = others.concat(
        shuffle(ctx.allP.map(a => a[1]).filter(x => x !== P.tgt && !others.includes(x))).slice(0, 3 - others.length),
      );
    return { ...base, t, options: shuffle([P.tgt, ...others]) };
  }
  if (t === "tiles" || t === "listenTiles") {
    const w = words(P.tgt);
    const pool = ctx.allP.flatMap(a => words(a[1]));
    return { ...base, t, audio: P.tgt, tiles: shuffle([...w, ...distract(pool, w, ctx.dis)]) };
  }
  if (t === "tilesRev") {
    const src = noNote(P.src);
    const w = words(src);
    const pool = ctx.allP.flatMap(a => words(noNote(a[0])));
    return {
      ...base,
      t,
      answer: src,
      alts: [],
      ansLang: BASE_LANG,
      tgtText: P.tgt,
      tiles: shuffle([...w, ...distract(pool, w, ctx.dis)]),
    };
  }
  if (t === "type") return { ...base, t };
  if (t === "listen") return { ...base, t, audio: P.tgt };
  if (t === "speak") return { ...base, t, text: P.tgt };
  return null;
}
export const TEMPL = {
  trans: [
    [
      "match",
      "mc",
      "tilesRev",
      "mc",
      "tiles",
      "listenTiles",
      "mcw",
      "tiles",
      "speak",
      "tilesRev",
      "mc",
      "tiles",
      "listenTiles",
      "match",
    ],
    [
      "mc",
      "tiles",
      "tilesRev",
      "listenTiles",
      "tiles",
      "match",
      "speak",
      "tiles",
      "type",
      "mcw",
      "listenTiles",
      "tiles",
      "type",
      "speak",
    ],
    [
      "tiles",
      "listenTiles",
      "type",
      "match",
      "tiles",
      "speak",
      "type",
      "listen",
      "tiles",
      "type",
      "mcw",
      "listen",
      "tiles",
      "type",
    ],
    [
      "type",
      "listen",
      "tiles",
      "type",
      "speak",
      "type",
      "listen",
      "speak",
      "tiles",
      "type",
      "listen",
      "type",
      "speak",
      "type",
    ],
    [
      "type",
      "listen",
      "type",
      "speak",
      "choice",
      "tiles",
      "listen",
      "type",
      "speak",
      "type",
      "match",
      "type",
      "listen",
      "choice",
      "speak",
      "type",
    ],
  ],
  toeic: [
    [
      "match",
      "photo",
      "choice",
      "part2",
      "choice",
      "tilesRev",
      "choice",
      "part2",
      "conv",
      "choice",
      "tiles",
      "read",
      "choice",
      "part2",
    ],
    [
      "choice",
      "part2",
      "photo",
      "choice",
      "tiles",
      "conv",
      "match",
      "part2",
      "choice",
      "read",
      "speak",
      "choice",
      "conv",
      "choice",
    ],
    [
      "choice",
      "part2",
      "conv",
      "choice",
      "type",
      "part2",
      "read",
      "choice",
      "listen",
      "conv",
      "choice",
      "photo",
      "read",
      "speak",
    ],
    [
      "choice",
      "part2",
      "conv",
      "type",
      "read",
      "choice",
      "part2",
      "listen",
      "conv",
      "choice",
      "read",
      "type",
      "choice",
      "part2",
    ],
    [
      "photo",
      "part2",
      "part2",
      "conv",
      "conv",
      "choice",
      "choice",
      "read",
      "read",
      "choice",
      "part2",
      "conv",
      "type",
      "read",
      "choice",
      "speak",
    ],
  ],
  volt: [
    [
      "choice",
      "spot",
      "choice",
      "dictee",
      "spot",
      "choice",
      "spot",
      "choice",
      "dictee",
      "spot",
      "choice",
      "spot",
      "choice",
      "spot",
    ],
    [
      "spot",
      "choice",
      "dictee",
      "spot",
      "choice",
      "spot",
      "dictee",
      "choice",
      "spot",
      "spot",
      "choice",
      "dictee",
      "spot",
      "choice",
    ],
    [
      "spot",
      "dictee",
      "choice",
      "spot",
      "dictee",
      "spot",
      "choice",
      "spot",
      "dictee",
      "spot",
      "choice",
      "spot",
      "dictee",
      "spot",
    ],
    [
      "dictee",
      "spot",
      "spot",
      "choice",
      "dictee",
      "spot",
      "spot",
      "dictee",
      "choice",
      "spot",
      "spot",
      "dictee",
      "spot",
      "spot",
    ],
    [
      "spot",
      "dictee",
      "spot",
      "choice",
      "spot",
      "dictee",
      "spot",
      "spot",
      "choice",
      "dictee",
      "spot",
      "spot",
      "dictee",
      "spot",
      "choice",
      "spot",
    ],
  ],
};
