// Rédactions corrigées par l'IA
import { COURSES } from "../content/index.js";
import { shuffle } from "../core/util.js";
import { pairOf } from "../exercises/generate.js";
import { aiAsk } from "../services/ai.js";

// ===================== RÉDACTIONS =====================
export function writeTasks(cid, u, k) {
  const C = COURSES[cid],
    U = C.units[u],
    lang = C.lang,
    L0 = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" }[lang];
  const tg = (U.v || []).map(v => v[1]);
  const P = (U.p || []).map(a => pairOf(C, a));
  const lvTxt = ["de niveau débutant", "de niveau intermédiaire", "de niveau avancé", "de niveau expert"][U.lv] || "";
  const base = { t: "write", lang, _u: u, _cid: cid, unit: U.t };
  if (U.hg) {
    const ws = shuffle(P.filter(x => x.rom)).slice(0, 5);
    if (k === 0)
      return [
        {
          ...base,
          mode: "transcribe",
          task: "Écris ces mots en hangul (clavier coréen) :",
          items: ws.map(x => ({ rom: x.rom, ko: x.tgt, fr: x.src })),
        },
      ];
    return [
      {
        ...base,
        task: "Écris en hangul 3 mots coréens que tu connais (un par ligne) et ce qu'ils veulent dire en français.",
        req: [],
        min: 3,
        max: 60,
        model: ws
          .slice(0, 3)
          .map(x => x.tgt + " — " + x.src)
          .join("\n"),
      },
    ];
  }
  if (C.kind === "volt") {
    const cs = shuffle((U.c || []).filter(c => c[0].includes("___"))).slice(0, 3);
    const req = cs.map(c => c[1][c[2]]);
    if (k === 0)
      return [
        {
          ...base,
          task: `Écris 3 phrases de ton choix qui contiennent correctement : ${req.map(r => "« " + r + " »").join(", ")}.`,
          req,
          need: req.length,
          min: 15,
          max: 90,
          model: cs.map(c => c[0].replace("___", c[1][c[2]])).join("\n"),
        },
      ];
    return [
      {
        ...base,
        task: `Rédige un court message professionnel (50 à 100 mots) à un collègue, sans aucune faute, en appliquant les règles de l'unité : ${U.d}.`,
        req: req.slice(0, 2),
        need: 1,
        min: 45,
        max: 130,
        model: cs.map(c => c[0].replace("___", c[1][c[2]])).join(" "),
      },
    ];
  }
  const pick = shuffle(tg).slice(0, 3);
  const model = shuffle(P)
    .slice(0, 4)
    .map(x => x.tgt)
    .join(" ");
  if (U.wt && U.wt[k ? 1 : 0]) {
    const short = !k;
    return [
      {
        ...base,
        task: U.wt[k ? 1 : 0] + ` Écris en ${L0}.`,
        req: short ? pick : shuffle(tg).slice(0, 2),
        need: short ? Math.min(1, pick.length) : 1,
        min: short ? 15 : 50,
        max: short ? 120 : 180,
        model,
      },
    ];
  }
  if (k === 0)
    return [
      {
        ...base,
        task: `Écris 3 à 5 phrases ${lvTxt} en ${L0} sur le thème « ${U.t} » (${U.d}). Utilise au moins 2 de ces mots : ${pick.join(", ")}.`,
        req: pick,
        need: Math.min(2, pick.length),
        min: lang.startsWith("ko") ? 6 : 15,
        max: 120,
        model,
      },
    ];
  const pro = cid === "en-pro" || cid === "en-toeic";
  return [
    {
      ...base,
      task: pro
        ? `Rédige un e-mail professionnel en ${L0} (60 à 120 mots) en lien avec « ${U.t} » : ${U.d}. Pense à la formule d'appel et à la conclusion.`
        : `Écris un petit texte en ${L0} (5 à 8 phrases ${lvTxt}) sur « ${U.t} » : raconte une situation personnelle en réutilisant ce que tu as appris (${U.d}).`,
      req: shuffle(tg).slice(0, 2),
      need: 1,
      min: lang.startsWith("ko") ? 12 : 50,
      max: 180,
      model,
    },
  ];
}
export function writePrompt(r) {
  const L0 = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" }[r.lang];
  return (
    "Tu es professeur de " +
    L0 +
    " et tu corriges la rédaction d'un élève francophone. Niveau visé : " +
    r.level +
    ".\nConsigne : " +
    r.task +
    '\n\nTexte de l\'élève :\n"""\n' +
    r.text +
    '\n"""\n\nCorrige toutes les fautes (orthographe, grammaire, conjugaison, vocabulaire, tournures peu naturelles) et vérifie que la consigne est respectée. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n{"score":0,"corrige":"texte entièrement corrigé","erreurs":[["extrait fautif","correction","notion courte (ex. accord du participe passé, present perfect, préposition, honorifique)","explication courte en français"]],"bilan":"2 phrases bienveillantes en français avec un conseil précis"}\nscore est une note sur 100 (respect de la consigne, correction de la langue, richesse). Si le texte est parfait, erreurs est une liste vide.'
  );
}
export async function aiWrite(req) {
  const raw = await aiAsk(writePrompt(req), Object.assign({ mode: "write" }, req), { tier: "default", ms: 70000 });
  if (!raw || typeof raw !== "object") return null;
  const sc = Math.max(0, Math.min(100, Math.round(+raw.score || 0)));
  return {
    score: sc,
    corr: typeof raw.corrige === "string" ? raw.corrige.slice(0, 3000) : "",
    errs: Array.isArray(raw.erreurs)
      ? raw.erreurs
          .filter(e => Array.isArray(e) && e.length >= 2)
          .slice(0, 20)
          .map(e => e.map(x => String(x || "").slice(0, 200)))
      : [],
    bilan: typeof raw.bilan === "string" ? raw.bilan.slice(0, 500) : "",
  };
}
export const wc = (t, lang) =>
  lang.startsWith("ko") ? t.replace(/\s/g, "").length : (t.trim().match(/\S+/g) || []).length;
