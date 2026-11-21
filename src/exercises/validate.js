// Correction des réponses (tolérance, nombres, articles, fautes de frappe)
import { COURSES } from "../content/index.js";
import { esc } from "../core/util.js";
import { L } from "../lesson/engine.js";

// ===================== CORRECTION =====================
export const EN_C = [
  [/\bi'm\b/g, "i am"],
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/n't\b/g, " not"],
  [/'re\b/g, " are"],
  [/'ll\b/g, " will"],
  [/'ve\b/g, " have"],
  [/'d\b/g, " would"],
  [/\b(it|that|what|there|he|she|who|where|here)'s\b/g, "$1 is"],
  [/\blet's\b/g, "let us"],
  [/\bcan not\b/g, "cannot"],
];
export function norm(s, lang) {
  s = String(s || "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'");
  if (lang.startsWith("en")) {
    EN_C.forEach(([r, x]) => (s = s.replace(r, x)));
    s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  s = s.replace(/[.,!?;:¡¿"«»“”()\[\]…–—\/-]/g, " ");
  if (lang.startsWith("ko")) return s.replace(/\s+/g, "");
  return s.replace(/\s+/g, " ").trim();
}
export function lev(a, b) {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const c = [i];
    for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[n];
}
// ---- Validation tolérante des réponses écrites (hors dictées d'orthographe) ----
export const NUM_EN = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
export const NUM_FR = {
  zero: 0,
  zéro: 0,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  vingts: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
};
// « ten » = « 10 », « twenty-one » = « 21 », « two hundred » = « 200 », « dix-sept » = « 17 », « quatre-vingts » = « 80 »…
export function numLoose(s, lang) {
  const en = lang.startsWith("en"),
    M = en ? NUM_EN : lang.startsWith("fr") ? NUM_FR : null;
  if (!M) return s;
  const t = s.split(" "),
    out = [];
  for (let i = 0; i < t.length; i++) {
    let v = M[t[i]];
    if (v === undefined) {
      out.push(t[i]);
      continue;
    }
    if (!en && v === 4 && (t[i + 1] === "vingt" || t[i + 1] === "vingts")) {
      v = 80;
      i++;
    }
    const nx = M[t[i + 1]];
    if (v >= 20 && v < 100 && nx !== undefined && (nx < 10 || (!en && (v === 60 || v === 80) && nx < 20))) {
      v += nx;
      i++;
    } else if (
      !en &&
      v >= 20 &&
      v < 100 &&
      t[i + 1] === "et" &&
      (t[i + 2] === "un" || t[i + 2] === "une" || t[i + 2] === "onze")
    ) {
      v += t[i + 2] === "onze" ? 11 : 1;
      i += 2;
    } else if (!en && v === 10 && nx !== undefined && nx >= 7 && nx <= 9) {
      v += nx;
      i++;
    }
    const H = en ? "hundred" : "cent";
    if (v < 10 && (t[i + 1] === H || t[i + 1] === H + "s")) {
      v *= 100;
      i++;
      let k = i + 1;
      if (en && t[k] === "and") k++;
      const r = M[t[k]];
      if (r !== undefined && r < 100) {
        let rv = r;
        const r2 = M[t[k + 1]];
        if (r >= 20 && r2 !== undefined && r2 < 10) {
          rv += r2;
          k++;
        }
        v += rv;
        i = k;
      }
    }
    out.push(String(v));
  }
  return out.join(" ");
}
export const ARTICLES = { en: /^(a|an|the)$/, fr: /^(le|la|les|un|une|des|du)$/ };
export function looseForm(s, lang) {
  let x = numLoose(norm(s, lang), lang);
  if (lang.startsWith("fr")) x = x.replace(/œ/g, "oe");
  return x;
}
export function typoBudget(n, lang) {
  return lang.startsWith("ko")
    ? n < 5
      ? 0
      : n < 12
        ? 1
        : n < 20
          ? 2
          : 3
    : n < 7
      ? 0
      : n < 14
        ? 1
        : n < 25
          ? 2
          : n < 40
            ? 3
            : 4;
}
export function checkText(v, answers, lang, strict) {
  const nv = norm(v, lang);
  if (!nv) return { ok: false };
  let best = 1e9;
  for (const a of answers) {
    const na = norm(a, lang);
    if (na === nv) return { ok: true };
    best = Math.min(best, lev(na, nv));
  }
  if (strict) return { ok: false };
  const lv = looseForm(v, lang),
    la = answers.map(a => looseForm(a, lang));
  if (la.includes(lv)) return { ok: true };
  const key = lang.slice(0, 2),
    da = x => x.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (key === "fr" && typeof L !== "undefined" && L && L.cid === "fr-fle" && la.some(a => da(a) === da(lv)))
    return { ok: true, typo: true };
  const noArt = x =>
    ARTICLES[key]
      ? x
          .split(" ")
          .filter(w => !ARTICLES[key].test(w))
          .join(" ")
      : x;
  const u = noArt(lv);
  if (ARTICLES[key] && u && la.some(a => noArt(a) === u)) return { ok: true, typo: true };
  for (const a of la)
    best = Math.min(
      best,
      lev(a, lv),
      key === "fr" ? lev(da(a), da(lv)) : 1e9,
      ARTICLES[key] && u ? lev(noArt(a), u) : 1e9,
    );
  if (best <= typoBudget(la[0].length, lang)) {
    // v38.2 : un autre vrai mot (« to » pour « the », « form » pour « from ») n'est pas une faute de frappe
    if ((key === "en" || key === "fr") && realWordSwap(lv, answers, lang)) return { ok: false, near: true };
    return { ok: true, typo: true };
  }
  return { ok: false };
}
// ---- v38.2 : mots connus d'une langue (toutes les phrases et le vocabulaire des cours) ----
const KNOWN = {};
function knownWords(key) {
  if (KNOWN[key]) return KNOWN[key];
  const set = new Set(),
    add = t =>
      typeof t === "string" &&
      norm(t, key)
        .split(" ")
        .forEach(w => w && set.add(w));
  Object.values(COURSES).forEach(C => {
    if (!String(C.lang || "").startsWith(key)) return;
    C.units.forEach(U => {
      (U.p || []).forEach(p => p.slice(1).forEach(add));
      (U.v || []).forEach(v => add(v[1]));
      (U.c || []).forEach(c => {
        add(c[0]);
        (c[1] || []).forEach(add);
      });
      (U.dd || []).forEach(add);
    });
  });
  return (KNOWN[key] = set);
}
/** La réponse remplace un mot de la solution par un autre mot qui existe (et pas une simple forme du même mot). */
export function realWordSwap(given, answers, lang) {
  const key = lang.slice(0, 2),
    known = knownWords(key),
    da = x => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const aw = new Set();
  answers.forEach(a => {
    looseForm(a, lang)
      .split(" ")
      .forEach(w => aw.add(w));
    // formes sans apostrophe (« its » pour « it's », « dont » pour « don't ») : fautes de frappe courantes
    String(a)
      .toLowerCase()
      .replace(/[’]/g, "'")
      .split(/[^\p{L}\d']+/u)
      .forEach(w => w && aw.add(w.replace(/'/g, "")));
  });
  const same = (x, u) =>
    x === u ||
    da(x) === da(u) ||
    u === x + "s" ||
    x === u + "s" ||
    u === x + "es" ||
    x === u + "es" ||
    u === x + "e" ||
    x === u + "e";
  return String(given)
    .split(" ")
    .filter(Boolean)
    .some(u => !aw.has(u) && known.has(u) && ![...aw].some(x => same(x, u)));
}
export function lcsMark(ans, usr) {
  const A = ans,
    B = usr,
    m = A.length,
    n = B.length,
    T = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      T[i][j] = A[i].k === B[j].k ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
  const hit = new Array(m).fill(false);
  let i = 0,
    j = 0;
  while (i < m && j < n) {
    if (A[i].k === B[j].k) {
      hit[i] = true;
      i++;
      j++;
    } else if (T[i + 1][j] >= T[i][j + 1]) i++;
    else j++;
  }
  return hit;
}
export function diffHtml(user, answer, lang) {
  const tok = s =>
    s
      .split(/\s+/)
      .filter(Boolean)
      .map(w => ({ w, k: norm(w, lang) }))
      .filter(x => x.k);
  const A = tok(answer),
    U = tok(user);
  const hit = lcsMark(A, U);
  return (
    '<div class="diff">' +
    A.map((x, i) => (hit[i] ? esc(x.w) : '<span class="m">' + esc(x.w) + "</span>")).join(" ") +
    "</div>"
  );
}
// Notes de contexte entre parenthèses (« (formal) », « (très poli) », « (반말) »…) : elles guident la traduction mais ne font pas partie de la phrase à reconstituer
export const noNote = s =>
  String(s || "")
    .replace(/\s*\(([^)#]{2,})\)/g, "")
    .trim() || String(s || "");
export const words = s =>
  s
    .split(/\s+/)
    .map(w => w.replace(/^[.,!?;:«»"“”()¿¡]+|[.,!?;:«»"“”()]+$/g, ""))
    .filter(Boolean);
