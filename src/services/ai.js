// Génération par IA (api/generate.php ou clé du profil)
import { COURSES } from "../content/index.js";
import { ACC, S, save } from "../core/accounts.js";
import { esc, rnd, secName, shuffle } from "../core/util.js";
import { drillLabel, drillSetFor, drillSub } from "../exercises/drills.js";
import { drillExercises } from "../features/grammar.js";
import { allPairs, ctxFor, distract, make } from "../exercises/generate.js";
import { words } from "../exercises/validate.js";
import { localDiag, localFocus } from "../features/coach.js";
import { EN_SUFFIX, KO_SUFFIX, NONFR, UI } from "../i18n/locale.js";
import { extremize } from "../lesson/build.js";
import { L, dueReviews, openSession } from "../lesson/engine.js";
import { mascot } from "../ui/mascot.js";
import { closeModal, modal, toast } from "../ui/ui.js";

// ===================== GÉNÉRATION PAR IA =====================
// 1) Clé API Claude personnelle, saisie dans le profil (appel direct à l'API, ou via le relais api/generate.php).
// 2) Dans Claude : capacité « sample ».  3) Sur ton serveur : clé commune facultative (api/generate.php).
// 4) Sinon : mélange local (révision remixée à partir des contenus vus, sans IA).
export const AI_ENDPOINT = "api/generate.php";
export const AI = { mode: null, sample: null, probed: false, srv: false, relay: false };
export const AI_MODELS = {
  auto: ["Automatique (conseillé)", null],
  haiku: ["Claude Haiku 5.5 · rapide", "claude-haiku-5-5"],
  sonnet: ["Claude Sonnet 5.5 · précis", "claude-sonnet-5-5"],
  opus: ["Claude Opus 5.5 · puissant", "claude-opus-5-5"],
};
// La clé reste sur l'appareil (jamais envoyée au serveur de comptes ni synchronisée), une par profil.
export function aiCfg() {
  try {
    return JSON.parse(localStorage.getItem("speakeasy-ai:" + ACC.current) || "{}") || {};
  } catch (e) {
    return {};
  }
}
export function aiSetCfg(c) {
  try {
    if (c && c.key) localStorage.setItem("speakeasy-ai:" + ACC.current, JSON.stringify(c));
    else localStorage.removeItem("speakeasy-ai:" + ACC.current);
  } catch (e) {}
  AI.mode = null;
}
export const aiKey = () => (aiCfg().key || "").trim();
export function aiModel(tier) {
  const c = aiCfg();
  const m = AI_MODELS[c.model || "auto"];
  return (m && m[1]) || (tier === "default" ? "claude-sonnet-5-5" : "claude-haiku-5-5");
}
export function aiErr(status, msg) {
  const m = String(msg || "");
  const e = new Error(m || "HTTP " + status);
  e.status = status;
  e.userMsg =
    status === 401 || /api.key|x-api-key|authentication/i.test(m)
      ? "🔑 Clé Claude refusée : vérifie-la dans ton profil."
      : /credit|balance|billing/i.test(m)
        ? "💳 Crédit API épuisé : recharge ton compte sur console.anthropic.com."
        : status === 429
          ? "⏳ Limite de l'API Claude atteinte, réessaie dans une minute."
          : status === 529 || status === 503
            ? "😴 Claude est très sollicité, réessaie dans un instant."
            : "";
  return e;
}
// Appel direct à l'API Claude avec la clé du profil ; si le navigateur bloque l'appel, passage par le relais du serveur (même clé).
export async function aiDirect(prompt, req, tier, ms, maxTok) {
  const key = aiKey();
  const model = aiModel(tier);
  let r, j;
  try {
    r = await withTimeout(
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model, max_tokens: maxTok || 6000, messages: [{ role: "user", content: prompt }] }),
      }),
      ms,
    );
  } catch (e) {
    if (e && e.message === "timeout") throw e;
    if (req && AI.relay) {
      r = await withTimeout(
        fetch(AI_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Key": key, "X-Model": model },
          body: JSON.stringify(req),
        }),
        ms,
      );
      j = await r.json().catch(() => ({}));
      if (!j.ok) throw aiErr(j.status || r.status, j.message || j.error);
      return j.text || "";
    }
    if (AI.sample) {
      const e2 = new Error("blocked");
      e2.fallback = true;
      throw e2;
    }
    throw e;
  }
  j = await r.json().catch(() => ({}));
  if (!r.ok) throw aiErr(r.status, j && j.error && j.error.message);
  return (j.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");
}
// Point d'entrée unique pour TOUTES les générations (exercices, coach, thèmes, mots, rédactions, unités, histoires)
export async function aiAsk(prompt, req, o) {
  o = o || {};
  if (NONFR) {
    prompt += UI === "ko" ? KO_SUFFIX : EN_SUFFIX;
    req = Object.assign({}, req, { ui: UI });
  }
  const mode = await aiDetect();
  if (mode === "local") return null;
  const ms = o.ms || 70000;
  try {
    if (mode === "key") {
      try {
        return parseLoose(await aiDirect(prompt, req, o.tier, ms));
      } catch (e) {
        if (!e.fallback) throw e;
        return await withTimeout(AI.sample.json(prompt, { modelTier: o.tier || "quick" }), ms);
      }
    }
    if (mode === "claude") return await withTimeout(AI.sample.json(prompt, { modelTier: o.tier || "quick" }), ms);
    const r = await withTimeout(
      fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      }),
      ms,
    );
    const j = await r.json();
    if (!j.ok) {
      if (j.error === "rate_limited")
        toast(
          "⏳ Beaucoup de générations récentes : révision mixte en attendant. Ajoute ta propre clé Claude dans ton profil pour ne plus être limitée.",
        );
      return null;
    }
    return parseLoose(j.text);
  } catch (e) {
    if (e && e.code === "not_granted" && mode === "claude") AI.mode = "local";
    if (e && e.userMsg && Date.now() - (AI.lastErr || 0) > 20000) {
      AI.lastErr = Date.now();
      toast(e.userMsg);
    }
    return null;
  }
}
export const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
export async function aiDetect() {
  if (AI.mode) return AI.mode;
  if (!AI.probed) {
    AI.probed = true;
    try {
      if (window.claude && typeof window.claude.use === "function") {
        const sm = await withTimeout(window.claude.use("sample"), 5000).catch(() => null);
        if (sm) AI.sample = sm;
      }
    } catch (e) {}
    if (location.protocol.startsWith("http") && !window.claude && navigator.onLine) {
      try {
        const r = await withTimeout(fetch(AI_ENDPOINT, { method: "GET", cache: "no-store" }), 5000);
        if (r.ok) {
          const j = await r.json();
          AI.srv = !!(j && j.ok);
          AI.relay = !!(j && (j.relay || j.ok));
        }
      } catch (e) {
        AI.probed = false;
      }
    }
  }
  if (aiKey()) return (AI.mode = "key");
  if (AI.sample) return (AI.mode = "claude");
  if (AI.srv && navigator.onLine) return (AI.mode = "server");
  return (AI.mode = "local");
}
export function aiLabel(m) {
  return m === "key"
    ? "✨ Ta clé Claude (" + (AI_MODELS[aiCfg().model || "auto"] || AI_MODELS.auto)[0].split(" ·")[0] + ")"
    : m === "claude"
      ? "✨ Claude (connecté)"
      : m === "server"
        ? "✨ Clé commune du serveur"
        : "🔀 Sans IA : révisions mélangées localement";
}
/** Règles de grammaire (notions v27) du cours où l'élève se trompe le plus (identifiants). */
export function weakRuleIds(cid) {
  const set = drillSetFor(cid);
  if (!set) return [];
  const d = S.drill || {};
  return Object.entries(d)
    .filter(([id, x]) => x && x[0] >= 2 && x[1] / x[0] >= 0.3 && (drillSub(id) || {}).set === set)
    .sort((a, b) => b[1][1] / b[1][0] - a[1][1] / a[1][0])
    .slice(0, 5)
    .map(([id]) => id);
}
/** Les mêmes règles, décrites pour l'IA (titre et taux d'erreur). */
export function weakRules(cid) {
  const d = S.drill || {};
  return weakRuleIds(cid).map(id =>
    `${drillLabel(id)} (${Math.round((d[id][1] / d[id][0]) * 100)} % d'erreurs)`.slice(0, 120),
  );
}
export function aiRequest(cid, units, errors, theme) {
  const C = COURSES[cid];
  const seen = [];
  units.forEach(U => {
    (U.p || []).forEach(a => seen.push(a[1] + " = " + a[0]));
    (U.v || []).forEach(w => seen.push(w[1] + " = " + w[0]));
    (U.c || []).forEach(c => seen.push(c[0].includes("___") ? c[0].replace("___", c[1][c[2]]) : c[1][c[2]]));
    (U.dd || []).forEach(d => seen.push(d));
  });
  const errs = (errors || [])
    .slice(-25)
    .map(e => `[${e.t}] ${e.q} | attendu : ${e.a} | donné : ${e.g || "—"}`.slice(0, 300));
  return {
    kind: C.kind,
    lang: C.lang,
    course: C.name,
    level: secName(cid, Math.max(...units.map(u => u.lv))),
    units: units.map(u => u.t).slice(-6),
    weak: weakRules(cid),
    seen: shuffle(seen).slice(0, 36),
    errors: errs,
    theme: (theme || "").slice(0, 80),
  };
}
export function aiPrompt(r) {
  const L = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" }[r.lang];
  const coach = r.errors && r.errors.length > 0;
  let schema,
    rules = "";
  if (r.kind === "volt") {
    schema =
      "{" +
      (coach ? '"diag":"diagnostic","focus":["point faible"],' : "") +
      '"c":[["phrase française avec ___ à la place du mot piège",["bonne orthographe","piège","piège","piège"],0,"règle expliquée en une phrase"]],"d":["phrase de dictée contenant un piège d\'orthographe"]}';
    rules =
      'Donne 14 éléments dans "c" et 4 dans "d". Pièges comme au Projet Voltaire / Certificat Voltaire : homophones, accords du participe passé, conjugaison, pluriels, orthographe d\'usage, orthotypographie.';
  } else {
    const ko = r.lang === "ko-KR";
    const toeic = r.kind === "toeic";
    schema =
      "{" +
      (coach ? '"diag":"diagnostic","focus":["point faible"],' : "") +
      '"p":[["phrase en français","traduction ' +
      L +
      ' principale",' +
      (ko ? '"romanisation révisée",' : "") +
      '"variante correcte acceptée"]],"c":[["phrase en ' +
      L +
      ' avec ___ à la place d\'un mot",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication courte en français","indice : forme de base du mot manquant (infinitif…) ou chaîne vide"]],"v":[["mot français","traduction ' +
      L +
      '"]]' +
      (toeic
        ? ',"l":[["question orale",["meilleure réponse","réponse piège","réponse piège"],0]],"cv":[{"d":[["M","réplique"],["W","réplique"]],"q":[["question",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication en français"]]}],"rd":[{"x":"document (e-mail, annonce, messages…)","q":[["question",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication en français"]]}]'
        : "") +
      "}";
    rules =
      'Donne 8 éléments dans "p" (1 à 3 variantes de traduction correctes par phrase), ' +
      (toeic
        ? '10 dans "c" (style TOEIC Parts 5-6), 4 dans "l" (Part 2), 2 dans "cv" (Parts 3-4 : conversation de 4 répliques entre M et W, ou annonce d\'un seul locuteur N ; 3 questions chacune), 2 dans "rd" (Part 7, 2 questions chacun), '
        : '8 dans "c", ') +
      '6 dans "v" (mots courts).';
  }
  return (
    "Tu es le coach d'une application d'apprentissage façon Duolingo. L'élève est francophone.\n" +
    "Cours : " +
    r.course +
    " (langue étudiée : " +
    L +
    "). Niveau : " +
    r.level +
    ". Unités étudiées : " +
    r.units.join(", ") +
    ".\n" +
    "Éléments déjà vus par l'élève (réutilise ce vocabulaire et ces structures dans des phrases NOUVELLES, jamais identiques) :\n- " +
    r.seen.join("\n- ") +
    "\n\n" +
    (r.theme
      ? "Thème imposé par l'élève : « " +
        r.theme +
        " ». TOUS les exercices doivent porter sur ce thème (vocabulaire, situations, phrases), au niveau indiqué, en réutilisant si possible les structures déjà vues.\n\n"
      : "") +
    (coach
      ? "Erreurs récentes de l'élève (exercice | réponse attendue | réponse donnée) :\n- " +
        r.errors.join("\n- ") +
        '\n\nAnalyse ces erreurs et repère les erreurs RÉCURRENTES : mots ou vocabulaire, construction des phrases, temps et conjugaison, accords, prépositions, orthographe, écoute. Dans "diag", écris un diagnostic bienveillant en français (2 à 3 phrases, tutoiement). Dans "focus", liste 2 à 4 points faibles courts. Au moins 70 % des exercices doivent cibler ces points faibles, sous des formes variées.\n\n'
      : "") +
    (r.weak && r.weak.length
      ? "Règles de grammaire où l'élève se trompe souvent :\n- " +
        r.weak.join("\n- ") +
        '\nConsacre au moins 3 éléments de "c" et 2 de "p" à ces règles.\n\n'
      : "") +
    "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n" +
    schema +
    "\n" +
    rules +
    "\n" +
    'Règles : langue naturelle et 100 % correcte ; difficulté adaptée au niveau, de la plus facile à la plus difficile ; dans "c", une seule bonne réponse sans ambiguïté et des distracteurs plausibles ; varie les thèmes de la vie quotidienne et professionnelle.'
  );
}
export function wordPrompt(r) {
  const L = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" }[r.lang];
  const fmt =
    r.lang === "fr-FR"
      ? '{"w":[["mot correctement orthographié","définition courte","phrase d\'exemple naturelle","piège d\'orthographe à retenir"]]}'
      : '{"w":[["mot ou expression en ' +
        L +
        '","traduction française courte","phrase d\'exemple simple et naturelle en ' +
        L +
        '","traduction française de l\'exemple"' +
        (r.lang === "ko-KR" ? ',"romanisation révisée du mot"' : "") +
        "]]}";
  return (
    "Tu aides un élève francophone qui apprend le " +
    L +
    ". Il a noté ces mots ou expressions (écrits en " +
    L +
    " ou en français) :\n- " +
    r.words.join("\n- ") +
    "\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n" +
    fmt +
    "\nUne entrée par mot, dans le même ordre. Si un mot est écrit en français, donne son équivalent en " +
    L +
    ". Corrige l'orthographe si besoin."
  );
}
export async function aiEnrich(lang, ws) {
  const req = { mode: "word", lang, words: ws.map(w => String(w).slice(0, 60)).slice(0, 10) };
  const raw = await aiAsk(wordPrompt(req), req, { tier: "quick", ms: 40000 });
  if (!raw || !Array.isArray(raw.w)) return null;
  return raw.w.map(a => (Array.isArray(a) ? a.map(x => (typeof x === "string" ? x.slice(0, 200) : "")) : []));
}
export function parseLoose(t) {
  if (t && typeof t === "object") return t;
  try {
    return JSON.parse(t);
  } catch (e) {}
  const m = String(t || "").match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch (e) {}
  }
  return null;
}
export function validateGen(raw, C) {
  if (!raw || typeof raw !== "object") return null;
  const str = x => typeof x === "string" && x.trim().length > 0 && x.length < 400;
  const out = { p: [], c: [], v: [], l: [], dd: [] };
  (raw.p || []).forEach(a => {
    if (Array.isArray(a) && a.length >= (C.rom ? 3 : 2) && a.every(str)) out.p.push(a.map(x => x.trim()));
  });
  (raw.c || []).forEach(a => {
    if (
      Array.isArray(a) &&
      str(a[0]) &&
      Array.isArray(a[1]) &&
      a[1].length >= 3 &&
      a[1].length <= 4 &&
      a[1].every(str) &&
      Number.isInteger(a[2]) &&
      a[2] >= 0 &&
      a[2] < a[1].length &&
      new Set(a[1].map(x => x.trim())).size === a[1].length
    ) {
      const c = [a[0].trim(), a[1].map(x => x.trim()), a[2], str(a[3]) ? a[3] : ""];
      // indice (forme de base) : permet l'exercice « écris le mot qui manque » (v27)
      if (str(a[4]) && a[4].length < 40 && a[0].includes("___")) c._h = a[4].trim();
      out.c.push(c);
    }
  });
  (raw.v || []).forEach(a => {
    if (Array.isArray(a) && a.length >= 2 && str(a[0]) && str(a[1]) && a[1].length < 40)
      out.v.push([a[0].trim(), a[1].trim()]);
  });
  (raw.l || []).forEach(a => {
    if (
      Array.isArray(a) &&
      str(a[0]) &&
      Array.isArray(a[1]) &&
      a[1].length === 3 &&
      a[1].every(str) &&
      Number.isInteger(a[2]) &&
      a[2] >= 0 &&
      a[2] < 3
    )
      out.l.push([a[0], a[1], a[2]]);
  });
  (raw.d || []).forEach(x => {
    if (str(x)) out.dd.push(x.trim());
  });
  const qok = a =>
    Array.isArray(a) &&
    str(a[0]) &&
    Array.isArray(a[1]) &&
    a[1].length >= 3 &&
    a[1].length <= 4 &&
    a[1].every(str) &&
    Number.isInteger(a[2]) &&
    a[2] >= 0 &&
    a[2] < a[1].length;
  out.cv = [];
  (raw.cv || []).forEach(o => {
    if (
      o &&
      Array.isArray(o.d) &&
      o.d.length &&
      o.d.every(l => Array.isArray(l) && ["M", "W", "N"].includes(l[0]) && str(l[1])) &&
      Array.isArray(o.q)
    ) {
      const q = o.q.filter(qok);
      if (q.length) out.cv.push({ d: o.d, q });
    }
  });
  out.rd = [];
  (raw.rd || []).forEach(o => {
    if (o && typeof o.x === "string" && o.x.length > 20 && o.x.length < 1500 && Array.isArray(o.q)) {
      const q = o.q.filter(qok);
      if (q.length) out.rd.push({ x: o.x, q });
    }
  });
  if (typeof raw.diag === "string" && raw.diag.length < 700) out.diag = raw.diag.trim();
  if (Array.isArray(raw.focus)) out.focus = raw.focus.filter(str).slice(0, 5);
  return out.p.length + out.c.length + out.dd.length >= 5 ? out : null;
}
export async function aiGenerate(cid, units, errors, theme) {
  const req = aiRequest(cid, units, errors, theme);
  const raw = await aiAsk(aiPrompt(req), req, { tier: "quick", ms: 70000 });
  return validateGen(raw, COURSES[cid]);
}
export function localRemix(cid, units) {
  const C = COURSES[cid];
  const g = k => units.flatMap(u => u[k] || []);
  const P = shuffle(g("p"));
  const c = shuffle(g("c")).slice(0, 6);
  const pool = P.flatMap(a => words(a[1])).filter(w => w.length >= 2);
  const reEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  P.slice(0, 10).forEach(a => {
    const ws = words(a[1]);
    const cands = ws.filter((w, i) => i > 0 && w.length >= (C.lang.startsWith("ko") ? 2 : 4));
    if (!cands.length || pool.length < 8) return;
    const w = rnd(cands);
    const opts = [w, ...distract(pool, [w], 3)];
    if (opts.length < 4) return;
    const q = a[1].replace(new RegExp("(^|\\s)" + reEsc(w)), "$1___");
    if (!q.includes("___")) return;
    c.push([q, opts, 0, `Phrase du parcours : « ${a[0]} »`]);
  });
  return { p: P, c, v: g("v"), l: g("l"), dd: g("dd"), cv: g("cv"), rd: g("rd") };
}
export const AI_T = {
  trans: [
    "match",
    "choice",
    "tiles",
    "mc",
    "fill",
    "listenTiles",
    "tiles",
    "spot",
    "type",
    "speak",
    "choice",
    "tilesRev",
    "type",
    "fill",
    "listen",
    "spot",
  ],
  toeic: [
    "choice",
    "part2",
    "conv",
    "choice",
    "tiles",
    "read",
    "part2",
    "choice",
    "conv",
    "type",
    "spot",
    "read",
    "fill",
    "listen",
    "part2",
    "speak",
  ],
  volt: [
    "spot",
    "choice",
    "dictee",
    "spot",
    "spot",
    "choice",
    "dictee",
    "spot",
    "choice",
    "spot",
    "spot",
    "dictee",
    "choice",
    "spot",
    "spot",
    "dictee",
  ],
};
export function buildFromGen(cid, units, G, ext) {
  const C = COURSES[cid];
  const ctx = ctxFor(cid, [G], { dis: 3, hideP2: true });
  ctx.allP = [...allPairs(C), ...(G.p || [])];
  if (!ctx.v.length) ctx.v = units.flatMap(u => u.v || []);
  const T = ext ? extremize(AI_T[C.kind], C.kind, false) : AI_T[C.kind];
  if (ext) {
    ctx.dis = 8;
  }
  return T.map(t => make(t, ctx))
    .filter(Boolean)
    .map(e => (ext ? Object.assign(e, { hidden: true }) : e));
}
export async function startAI(cid, units, cfg) {
  if (L) return;
  const coach = !!cfg.coach;
  const theme = cfg.theme || "";
  const errs = theme ? [] : (S.elog[cid] || []).slice(-25);
  modal(
    `<div class="mcenter">${mascot("wow", "dance")}<h2>${coach ? "🧠 Horang analyse tes erreurs…" : theme ? "🎨 Thème : " + esc(theme) : "✨ Horang prépare tes exercices…"}</h2><p>${coach ? "Recherche de tes erreurs récurrentes et création d'exercices ciblés." : "Création d'exercices inédits à partir de ce que tu as appris."}</p><div class="aiload"><i></i><i></i><i></i></div></div>`,
    "",
    true,
  );
  let G = null,
    src = "mix";
  try {
    G = await aiGenerate(cid, units, errs.length ? errs : null, theme);
    if (G) src = "ia";
  } catch (e) {}
  if (!G) G = localRemix(cid, units);
  closeModal();
  let exs = buildFromGen(cid, units, G, cfg.ext);
  // règles de grammaire les moins réussies : quelques phrases générées par gabarits, avec ou sans IA
  const wk = weakRuleIds(cid);
  if (wk.length && !cfg.ext) {
    const extra = drillExercises(cid, rnd(wk), 3);
    exs = exs.concat(extra);
  }
  const rv = dueReviews(cid, coach ? 6 : 3);
  exs = coach ? shuffle(rv.concat(exs)) : exs.concat(rv);
  if (src === "mix" && AI.mode === "local")
    toast(
      theme
        ? "🔀 Sans IA, le thème est approché avec les unités les plus proches"
        : "🔀 IA non configurée : révision mélangée à partir du parcours",
    );
  if (coach) {
    const d = G.diag || localDiag(cid);
    const f = G.focus || localFocus(cid);
    S.coach[cid] = { diag: d, focus: f, ts: Date.now(), src };
    save();
    const m = modal(
      `<div class="mcenter">${mascot("calm", "jump")}<h2>🧠 Ton diagnostic</h2><p style="color:var(--ink)">${esc(d)}</p>${f.length ? `<div class="chips">${f.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}<p>${exs.length} exercices ${src === "ia" ? "créés par l'IA pour toi" : "choisis dans tes erreurs et le parcours"}.</p><button class="btn big" id="cgo">C'est parti !</button></div>`,
      "",
      true,
    );
    m.querySelector("#cgo").onclick = () => {
      closeModal();
      openSession(Object.assign({ cid, exs, ai: src }, cfg));
    };
    return;
  }
  openSession(Object.assign({ cid, exs, ai: src }, cfg));
}
