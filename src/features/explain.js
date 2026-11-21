// v33 : « À savoir » après chaque réponse — une explication utile sur la phrase et sa construction.
// v38.2 : note écrite pour la phrase (champ « pe »), repères de grammaire vérifiés, astuce de la bonne unité.
// Sans réseau : règle de l'exercice, repères de grammaire reconnus dans la phrase, mots clés de l'unité.
// Avec une IA configurée : bouton « Explique ma réponse » (prompt construit côté serveur, mode « explain »).
import { COURSES } from "../content/index.js";
import { esc } from "../core/util.js";
import { drillLabel } from "../exercises/drills.js";
import { AI, aiAsk } from "../services/ai.js";
import { ic } from "../ui/icons.js";
import { grammarNotes, tipFits } from "./grammar-notes.js";

const clean = s =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();
/** Phrase dans la langue étudiée, quand l'exercice en a une. */
export function targetOf(ex, res) {
  if (ex.parts) return clean(ex.parts.map(p => p.before + p.right + p.after).join(" "));
  if (ex.t === "spot" || ex.t === "choice" || ex.t === "fill")
    return ex.q && ex.q.includes("___")
      ? clean(ex.q.replace(/\s*\([^)]*\)\s*$/, "").replace("___", ex.right || ex.answer))
      : "";
  return clean(ex.tgtText || ex.text || ex.audio || (res && res.speak) || (ex.prompt ? ex.answer : ""));
}

// Repères de grammaire : src/features/grammar-notes.js (v38.2, testés sur toutes les phrases des cours).

// ---- v38.2 : explication propre à la phrase (champ « pe » des unités : phrase cible → note) ----
const keyOf = s =>
  String(s || "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[.,!?;:¡¿"«»“”…]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const PE = new Map();
function peIndex(cid) {
  if (PE.has(cid)) return PE.get(cid);
  const m = new Map(),
    C = COURSES[cid];
  if (C)
    C.units.forEach((U, u) => {
      if (!U.pe) return;
      const ko = String(C.lang).startsWith("ko");
      (U.p || []).forEach(p => {
        const note = U.pe[p[1]];
        if (!note) return;
        // variantes acceptées (en coréen, la 3e case est la romanisation)
        [p[1], ...p.slice(ko ? 3 : 2)].forEach(t => m.set(keyOf(t), { note, u }));
      });
    });
  PE.set(cid, m);
  return m;
}
/** Note de la phrase étudiée (ou de sa traduction), si le cours en a une. */
export function phraseNote(ex, res, cid) {
  const m = peIndex(cid);
  if (!m.size) return null;
  for (const t of [targetOf(ex, res), ex.answer, ex.prompt, res && res.speak, res && res.sol]) {
    const hit = t && m.get(keyOf(t));
    if (hit) return hit;
  }
  return null;
}
/** Mots de l'unité (ou du cours) présents dans la phrase : « mot = traduction ». */
function keyWords(T, cid, lang) {
  const C = COURSES[cid];
  if (!C || !T) return [];
  const low = T.toLowerCase();
  const ko = lang.startsWith("ko");
  const seen = new Set(),
    hits = [];
  C.units.forEach(U =>
    (U.v || []).forEach(([src, tgt]) => {
      const w = String(tgt || "")
        .replace(/\s*\([^)]*\)/g, "")
        .trim();
      const k = w.toLowerCase();
      if (k.length < (ko ? 2 : 3) || seen.has(k) || k === low.replace(/[.?!]$/, "")) return;
      const found = ko
        ? low.includes(k)
        : new RegExp("(^|[^\\p{L}])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\p{L}]|$)", "u").test(low);
      if (found) {
        seen.add(k);
        hits.push([w, src]);
      }
    }),
  );
  return hits.sort((a, b) => b[0].length - a[0].length).slice(0, 3);
}
/** Astuce de l'unité d'où vient la phrase (pas celle de la leçon en cours : une révision mêle les unités),
 * seulement si elle cite un mot ou une tournure de la phrase. */
function unitTip(T, cid, u) {
  const C = COURSES[cid];
  if (!C || !T) return "";
  const k = keyOf(T);
  let U = C.units.find(
    x => (x.p || []).some(p => p.some(t => keyOf(t) === k)) || (x.dd || []).some(t => keyOf(t) === k),
  );
  if (!U && u != null) U = C.units[u];
  return U && U.tip && tipFits(U.tip, T, C.lang) ? U.tip : "";
}
/** Bloc « À savoir » du pied de page (HTML), ou "" s'il n'y a rien d'utile à dire. */
export function explainHtml(ex, res, L) {
  const cid = ex._cid || (L && L.cid);
  const C = COURSES[cid];
  const lang = ex.lang || (C && C.lang) || "";
  const T = targetOf(ex, res);
  const items = [];
  const exps = res.exps && res.exps.length ? res.exps : res.exp ? [res.exp] : [];
  // l'explication de l'exercice vient du cours : elle est déjà dans la langue de l'interface
  [...new Set(exps)].slice(0, 3).forEach(e => items.push(`<span class="notr">${esc(e)}</span>`));
  // explication écrite pour cette phrase : la plus utile, elle passe avant les repères automatiques
  const pn = C && phraseNote(ex, res, cid);
  if (pn && items.length < 3 && !exps.includes(pn.note)) items.push(`<span class="notr">${esc(pn.note)}</span>`);
  if (!items.length && ex._sub) items.push(`<span>Règle travaillée :</span> <b>${esc(drillLabel(ex._sub))}</b>`);
  if (C && C.kind !== "volt" && items.length < 2) grammarNotes(T, lang).forEach(n => items.length < 3 && items.push(n));
  if (C && C.kind !== "volt") {
    const kw = keyWords(T, cid, lang);
    if (kw.length)
      items.push(
        `<span>Mots clés :</span> <span class="notr">${kw.map(([w, s]) => `<b lang="${esc(lang)}">${esc(w)}</b> = ${esc(s)}`).join(" · ")}</span>`,
      );
  }
  if (!items.length) {
    const tip = unitTip(T, cid, ex._u != null ? ex._u : null);
    if (tip) items.push(`<span>Astuce de l'unité :</span> <span class="notr">${esc(tip)}</span>`);
  }
  const ai = T && AI.mode && AI.mode !== "local" && ex.t !== "write";
  if (!items.length && !ai) return "";
  return `<div class="fexp fx">${items.length ? `<b class="fxh">${ic("bulb", 16, "", 2.4)}<span>À savoir</span></b><ul>${items.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}${ai ? `<button class="fxai" id="fxai">${ic("spark", 16, "", 2.4)}<span>Explique ma réponse</span></button><div class="fxout" id="fxout" aria-live="polite"></div>` : ""}</div>`;
}

const CACHE = new Map();
export function explainPrompt(r) {
  const Lg = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" }[r.lang] || "anglais";
  return `Tu es professeur de ${Lg} dans une application façon Duolingo. L'élève est francophone. Cours : ${r.course}.
Phrase correcte : « ${r.sentence} »${r.source ? `\nÉnoncé de l'exercice : « ${r.source} »` : ""}
Réponse de l'élève : « ${r.given || "—"} » (${r.ok ? "juste" : "fausse"}).
Explique en 2 à 4 points très courts, en français et en tutoyant : le sens de la phrase, sa construction (ordre des mots, temps, accords, particules ou prépositions selon la langue)${r.ok ? "" : ", et pourquoi la réponse de l'élève est fausse"}. Termine par une astuce pour s'en souvenir si elle est utile. Pas de félicitations ni de reproche.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour : {"exp":["point 1","point 2"]}`;
}
/** Branche le bouton « Explique ma réponse » du pied de page. */
export function bindExplain(ex, res, given, L) {
  const b = document.querySelector("#fxai");
  if (!b) return;
  b.onclick = async () => {
    const out = document.querySelector("#fxout");
    const C = COURSES[ex._cid || (L && L.cid)] || {};
    const req = {
      mode: "explain",
      lang: ex.lang || C.lang,
      course: C.name || "",
      sentence: targetOf(ex, res).slice(0, 300),
      source: String(ex.prompt || ex.q || "").slice(0, 300),
      given: String(given || "").slice(0, 200),
      ok: !!res.ok,
    };
    const k = req.sentence + "|" + req.given + "|" + req.ok;
    b.disabled = true;
    b.classList.add("load");
    let lines = CACHE.get(k);
    if (!lines) {
      out.innerHTML = `<p class="fxw">Horang réfléchit…</p>`;
      try {
        const raw = await aiAsk(explainPrompt(req), req, { tier: "quick", ms: 30000 });
        lines =
          raw && Array.isArray(raw.exp)
            ? raw.exp
                .map(x => String(x).slice(0, 320))
                .filter(Boolean)
                .slice(0, 4)
            : null;
      } catch (e) {
        lines = null;
      }
      if (lines && lines.length) CACHE.set(k, lines);
    }
    if (!document.body.contains(out)) return;
    b.classList.remove("load");
    if (lines && lines.length) {
      b.remove();
      out.innerHTML = `<ul class="notr">${lines.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    } else {
      b.disabled = false;
      out.innerHTML = `<p class="fxw">Explication indisponible pour l'instant.</p>`;
    }
  };
}
