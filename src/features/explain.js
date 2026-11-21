// v33 : « À savoir » après chaque réponse — une explication utile sur la phrase et sa construction.
// Sans réseau : règle de l'exercice, repères de grammaire reconnus dans la phrase, mots clés de l'unité.
// Avec une IA configurée : bouton « Explique ma réponse » (prompt construit côté serveur, mode « explain »).
import { COURSES } from "../content/index.js";
import { esc } from "../core/util.js";
import { drillLabel } from "../exercises/drills.js";
import { AI, aiAsk } from "../services/ai.js";
import { ic } from "../ui/icons.js";

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

// ---- repères de grammaire reconnus dans la phrase (une note par repère, 2 au plus) ----
// Un mot en -ed ou en -ing n'est pas forcément un verbe : adjectifs (tired, interesting), noms (bed, morning),
// passif ou état après be (is delayed, I'm lowkey tired). Pas de lookbehind dans les regex : Safari ancien ne le lit pas.
const toks = s =>
  s
    .replace(/[^a-z' ]+/g, " ")
    .split(" ")
    .filter(Boolean);
const BE = new Set(
  "am is are was were be been being 'm 're 's i'm you're he's she's it's we're they're that's there's isn't aren't wasn't weren't".split(
    " ",
  ),
);
// adverbes qui peuvent s'intercaler : « I'm lowkey tired », « it was really boring », « he just arrived »
const ADV = new Set(
  "not so too very really quite pretty bit little kind sort of lowkey kinda super always never still just also already".split(
    " ",
  ),
);
// après ces verbes, le mot en -ed est un adjectif ou un participe, pas un prétérit (got married, feel tired, have finished)
const LINK = new Set(
  "have has had haven't hasn't hadn't 've get gets got getting feel feels felt look looks looked seem seems seemed become became".split(
    " ",
  ),
);
/** Mot qui précède le mot n° i, adverbes sautés. */
const before = (t, i) => {
  let j = i - 1;
  while (j >= 0 && (ADV.has(t[j]) || (t[j] === "a" && t[j + 1] === "bit"))) j--;
  return t[j] || "";
};
const isBe = w => BE.has(w) || /'(m|re|s)$/.test(w);
const NOT_ED = new Set(
  (
    "bed red sled hundred need indeed seed feed weed speed deed bleed breed greed proceed succeed exceed " +
    "naked wicked sacred kindred rugged ragged beloved aged " +
    "tired bored interested excited married worried scared surprised pleased delighted annoyed confused embarrassed " +
    "disappointed satisfied stressed relaxed amazed frightened exhausted crowded talented skilled experienced " +
    "qualified motivated organized organised complicated detailed related limited advanced"
  ).split(" "),
);
const NOT_ING = new Set(
  (
    "thing something nothing anything everything king ring sing spring string sting wing swing bring morning evening " +
    "ceiling building wedding during ending pudding sibling darling earring clothing " +
    "interesting boring amazing exciting surprising annoying confusing disappointing tiring relaxing charming shocking " +
    "embarrassing frightening worrying touching inspiring refreshing satisfying stunning challenging"
  ).split(" "),
);
/** be (+ adverbes) + mot en -ing qui n'est ni un nom ni un adjectif connu : forme progressive. */
const progressive = s => toks(s).some((w, i, t) => /^\w+ing$/.test(w) && !NOT_ING.has(w) && isBe(before(t, i)));
/** Verbe régulier au prétérit : mot en -ed qui n'est ni un adjectif ou un nom connu, ni après be, have, get… */
const pastEd = s =>
  toks(s).some((w, i, t) => {
    if (!/^[a-z]{2,}ed$/.test(w) || NOT_ED.has(w)) return false;
    const p = before(t, i);
    return !isBe(p) && !LINK.has(p) && !/'ve$/.test(p);
  });
const EN = [
  [{ test: progressive }, "be + verbe en -ing : action en cours (forme progressive)."],
  [
    /\b(have|has|haven't|hasn't|'ve)\s+(\w+\s+)?(\w+ed|been|done|gone|seen|made|had|taken|written|eaten|known|given|found|sent|met|left|lost|bought|told)\b/,
    "have / has + participe passé : present perfect (un lien entre le passé et maintenant).",
  ],
  [/\bgoing to\s+\w+/, "be going to + verbe : un projet déjà décidé."],
  [/\b(will|won't|'ll)\b/, "will + base verbale : futur, décision prise sur le moment ou prédiction."],
  [/\b(did|didn't)\b/, "did / didn't + base verbale : question ou négation au passé."],
  [
    /\b(do|does|don't|doesn't)\b/,
    "do / does : auxiliaire des questions et des négations au présent ; le verbe reste à la base verbale.",
  ],
  [/\b(would like|'d like)\b/, "would like : la manière polie de dire « want »."],
  [
    /\b(can|can't|could|should|shouldn't|must|may|might|would)\b/,
    "Après un modal (can, should, must, would…), le verbe reste à la base verbale, sans « to ».",
  ],
  [
    /\b(more|less)\s+\w+\s+than\b|\b\w+er\s+than\b/,
    "Comparatif : adjectif court + -er, adjectif long avec more, puis than.",
  ],
  [
    /\bthere\s+(is|are|was|were|isn't|aren't)\b|\bthere's\b/,
    "there is / there are : « il y a », accordé avec le nom qui suit.",
  ],
  [{ test: pastEd }, "Au prétérit, les verbes réguliers prennent -ed ; les irréguliers s'apprennent par cœur."],
];
const FR = [
  [
    /\b(ne|n['’])\s?\S+(\s\S+)?\s(pas|jamais|plus|rien)\b/,
    "Négation : ne + verbe + pas (ne devient n' devant une voyelle).",
  ],
  [
    /\b(ai|as|a|avons|avez|ont|suis|es|est|sommes|êtes|sont)\s+(\S+\s)?\S+(é|ée|és|ées|is|it|ert|u|ue|us)\b/,
    "Passé composé : avoir ou être au présent + participe passé.",
  ],
  [/\b(vais|vas|va|allons|allez|vont)\s+\S+(er|ir|re)\b/, "Futur proche : aller au présent + infinitif."],
  [/est-ce qu|qu['’]est-ce/, "est-ce que transforme une phrase en question sans changer l'ordre des mots."],
  [/\bil y a\b/, "il y a : expression invariable pour dire qu'une chose existe ou se trouve là."],
  [/\b(au|aux)\b/, "au = à + le ; aux = à + les."],
  [/\b(du|de la|de l['’])\s?\S+/, "du, de la, de l' : article partitif, pour une quantité qu'on ne compte pas."],
  [
    /\b(me|te|se|nous|vous)\s+\S+(e|es|ons|ez|ent)\b|\bs['’]\S+/,
    "Verbe pronominal : le pronom (me, te, se…) se place avant le verbe.",
  ],
];
const KO_END = [
  [/고 싶/, "-고 싶어요 : « vouloir » faire quelque chose."],
  [/주세요[.?!]?$/, "주세요 : « s'il vous plaît », pour demander quelque chose ou un service."],
  [/(으)?세요[.?!]?$/, "-(으)세요 : demande polie ou marque de respect envers la personne."],
  [/[았었했였](어요|습니다)/, "-았/었어요 : le verbe est au passé."],
  [/(을|ㄹ|를)? ?거예요[.?!]?$/, "-(으)ㄹ 거예요 : futur ou intention."],
  [/지 않|(^| )안 /, "안 + verbe, ou verbe + -지 않아요 : la négation."],
  [/(있어요|없어요)[.?!]?$/, "있어요 = il y a, avoir ; 없어요 = il n'y a pas, ne pas avoir."],
  [/니까\?$/, "-(스)ㅂ니까 ? : question en style formel."],
  [/니다[.!]?$/, "-(스)ㅂ니다 : style formel poli (travail, annonces, inconnus)."],
  [/요[.?!]?$/, "La terminaison -요 est le style poli de tous les jours."],
];
const KO_PART = [
  [/^.+에서$/, "에서 indique le lieu où se passe l'action, ou le point de départ."],
  [/^.+[은는]$/, "은/는 marque le thème : ce dont on parle."],
  [/^.+[을를]$/, "을/를 marque le complément d'objet du verbe."],
  [/^.+에$/, "에 indique le lieu où l'on va, ou le moment."],
  [/^.+[이가]$/, "이/가 marque le sujet du verbe."],
];
function grammarNotes(T, lang) {
  const out = [];
  if (!T) return out;
  if (lang.startsWith("ko")) {
    const toks = T.replace(/[.?!,]/g, "")
      .split(" ")
      .filter(Boolean);
    for (const [re, txt] of KO_PART) {
      const w = toks.slice(0, -1).find(x => x.length > 1 && re.test(x));
      if (w) out.push(`<span class="notr" lang="ko">${esc(w)}</span> : <span>${txt}</span>`);
      if (out.length === 1) break;
    }
    const e = KO_END.find(([re]) => re.test(T));
    if (e) out.push(esc(e[1]));
    if (!out.length && toks.length >= 2) out.push("En coréen, le verbe se place à la fin de la phrase.");
  } else {
    const low = T.toLowerCase().replace(/[’]/g, "'");
    for (const [re, txt] of lang.startsWith("en") ? EN : FR) {
      if (re.test(low)) out.push(esc(txt));
      if (out.length === 2) break;
    }
  }
  return out;
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
function unitTip(T, cid, u) {
  const C = COURSES[cid];
  if (!C) return "";
  let U = u != null ? C.units[u] : null;
  if (!U && T) U = C.units.find(x => (x.p || []).some(p => p[1] === T) || (x.dd || []).includes(T));
  return (U && U.tip) || "";
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
    const tip = unitTip(T, cid, L && L.mode === "lesson" ? L.u : null);
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
