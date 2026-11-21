// Traduction du DOM à la volée avec les dictionnaires UI_EN / UI_KO
import { esc } from "../core/util.js";
import { UI_EN } from "./dict-en.js";
import { UI_KO } from "./dict-ko.js";
import { UI } from "./locale.js";

// ---- Traduction de l'interface : chaque texte affiché passe par le dictionnaire UI_EN ----
export const I18N = { pats: [], cache: new Map() };
// Coréen : dictionnaire coréen, et à défaut la version anglaise (plus lisible qu'un texte resté en français)
export const UI_D = UI === "ko" ? Object.assign({}, UI_EN, typeof UI_KO !== "undefined" ? UI_KO : {}) : UI_EN;
(function () {
  if (UI === "fr") return;
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const k in UI_D) {
    if (!k.includes("¤")) continue;
    const lits = k.split("¤");
    const lit = lits.reduce((a, b) => (b.length > a.length ? b : a), "");
    if (lit.replace(/[\s·:().,«»!?'’-]/g, "").length < 3) continue;
    I18N.pats.push([new RegExp("^" + lits.map(esc).join("([\\s\\S]*?)") + "$"), UI_D[k], lit, lits.join("").length]);
  }
  I18N.pats.sort((a, b) => b[3] - a[3]);
})();
export function trCore(c, depth) {
  if (!c) return null;
  if (Object.prototype.hasOwnProperty.call(UI_D, c)) return UI_D[c];
  if (depth > 4) return null;
  const key = depth + "\u0001" + c;
  if (I18N.cache.has(key)) return I18N.cache.get(key);
  let out = null;
  const sub = g => {
    const t = g.trim();
    if (!t) return g;
    const r = trCore(t, depth + 1);
    return r == null ? g : g.replace(t, () => r);
  };
  for (const [re, tpl, lit] of I18N.pats) {
    if (!c.includes(lit)) continue;
    const m = c.match(re);
    if (!m) continue;
    let i = 0;
    out = tpl.replace(/¤(\d?)/g, (a, n) => sub(m[n ? +n : ++i] || ""));
    break;
  }
  if (out == null) {
    const em = c.match(/^([^\p{L}\p{N}«(“"']+)([\s\S]+)$/u);
    if (em) {
      const r = trCore(em[2], depth + 1);
      if (r != null) out = em[1] + r;
    }
  }
  if (out == null) {
    const em = c.match(/^([\s\S]+?)(\s*[^\p{L}\p{N}»)”"'.!?…]+)$/u);
    if (em) {
      const r = trCore(em[1], depth + 1);
      if (r != null) out = r + em[2];
    }
  }
  if (out == null)
    for (const sep of [" · ", " — ", " : ", " – "]) {
      if (!c.includes(sep)) continue;
      const parts = c.split(sep);
      const tt = parts.map(sub);
      if (tt.some((x, i) => x !== parts[i])) {
        out = tt.join(sep == " : " ? ": " : sep);
        break;
      }
    }
  if (I18N.cache.size > 5000) I18N.cache.clear();
  I18N.cache.set(key, out);
  return out;
}
export function trText(s) {
  if (UI === "fr" || typeof s !== "string") return s;
  const core = s.trim();
  if (!core) return s;
  const t = trCore(core, 0);
  return t == null ? s : s.replace(core, () => t);
}
export const TR_SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);
export function trNode(n) {
  const s = n.nodeValue;
  if (!s || !/\p{L}/u.test(s)) return;
  const p = n.parentElement;
  if (!p || TR_SKIP.has(p.tagName) || p.closest(".notr")) return;
  // texte marqué dans une autre langue que l'interface (contenu étudié : mot français, phrase coréenne…) : jamais traduit
  const lg = p.closest("[lang]");
  if (lg && lg !== document.documentElement && !String(lg.getAttribute("lang")).toLowerCase().startsWith(UI)) return;
  const t = trText(s);
  if (t !== s) n.nodeValue = t;
}
export function trAttrs(el) {
  if (!el.getAttribute || (el.closest && el.closest(".notr"))) return;
  for (const a of ["placeholder", "title", "aria-label"]) {
    const v = el.getAttribute(a);
    if (v) {
      const t = trText(v);
      if (t !== v) el.setAttribute(a, t);
    }
  }
}
export function trTree(root) {
  if (root.nodeType === 3) return trNode(root);
  if (root.nodeType !== 1 || TR_SKIP.has(root.tagName)) return;
  trAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) trNode(n);
    else trAttrs(n);
  }
}
