// v39.2 : « Demande à Horang » — un coach en conversation qui propose des exercices sur ce que l'on vient de voir
// ou sur la notion que l'on veut travailler. Réutilise l'entraînement à thème (startAI), les notions de grammaire
// (startDrills) et les repères de « À savoir » (explain.js), sans rien retirer de ces fonctions.
// Sans IA : la demande est rapprochée des règles de grammaire et des unités du cours (fonctionne hors ligne).
import { COURSES } from "../content/index.js";
import { S } from "../core/accounts.js";
import { esc, secName } from "../core/util.js";
import { drillLabel, drillSetFor, drillSub, dtx } from "../exercises/drills.js";
import { grammarNotes, targetOf } from "./explain.js";
import { trText } from "../i18n/translate.js";
import { startDrills } from "./grammar.js";
import { unlockedUnits } from "../lesson/build.js";
import { aiAsk, aiDetect, startAI } from "../services/ai.js";
import { beep } from "../services/speech.js";
import { ic } from "../ui/icons.ts";
import { mascot } from "../ui/mascot.js";
import { curCid } from "../ui/router.js";
import { closeModal, modal } from "../ui/ui.js";

// ---------- ce que l'élève vient de voir (mémoire de la session, rien n'est synchronisé) ----------
/** Dernières phrases rencontrées en leçon ou en entraînement, la plus récente en dernier. */
export const RECENT = [];
/** Phrases gardées avec le bouton « Garder pour Horang » du pied de page. */
export const PINS = [];
const NO_SEEN = new Set(["match", "write", "hg", "build", "hear", "jamo", "jamoRev"]);

/** Appelé après chaque réponse (moteur de leçon) : retient la phrase, sa règle et son unité. */
export function noteSeen(ex, res, L) {
  try {
    if (!ex || NO_SEEN.has(ex.t) || (L && (L.mode === "place" || L.mode === "sprint"))) return null;
    const s = targetOf(ex, res);
    if (!s || s.length < 3) return null;
    const cid = ex._cid || (L && L.cid);
    if (!cid || !COURSES[cid]) return null;
    const it = { cid, s: s.slice(0, 200), sub: ex._sub || "", u: (L && L.unitT) || "", ok: !!res.ok, ts: Date.now() };
    const i = RECENT.findIndex(x => x.s === it.s && x.cid === cid);
    if (i >= 0) RECENT.splice(i, 1);
    RECENT.push(it);
    if (RECENT.length > 16) RECENT.shift();
    return it;
  } catch (e) {
    return null;
  }
}
export const isPinned = it => !!it && PINS.some(x => x.s === it.s && x.cid === it.cid);
/** Garde (ou retire) une phrase pour la proposer en premier dans « Demande à Horang ». */
export function togglePin(it) {
  if (!it) return false;
  const i = PINS.findIndex(x => x.s === it.s && x.cid === it.cid);
  if (i >= 0) {
    PINS.splice(i, 1);
    return false;
  }
  PINS.push(it);
  if (PINS.length > 8) PINS.shift();
  return true;
}
export const pinsFor = cid => PINS.filter(x => x.cid === cid);

// ---------- rapprochement local : règles de grammaire et unités du cours ----------
const norm = s =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ");
const STOP = new Set(
  "les des une pour avec dans sur que qui quoi mais donc car est sont mon mes ton tes son ses notre votre leur leurs cette ces cet comment faire veux voudrais aimerais travailler entrainer entraine reviser revoir exercice exercices phrase phrases sur the and for with what how want practice practise this that please".split(
    " ",
  ),
);
function keywords(text) {
  return [
    ...new Set(
      norm(text)
        .split(/[^\p{L}\p{N}]+/u)
        .filter(w => (/[가-힣]/.test(w) ? w.length >= 1 : w.length >= 3) && !STOP.has(w)),
    ),
  ];
}
const hits = (kw, hay) => {
  const h = norm(hay);
  return kw.reduce((a, k) => a + (h.includes(k) ? (k.length >= 6 ? 2 : 1) : 0), 0);
};
/** Règles de grammaire du cours les plus proches de la demande (au plus 2). */
export function matchRules(cid, text) {
  const set = drillSetFor(cid);
  const kw = keywords(text);
  if (!set || !kw.length) return [];
  const sc = [];
  set.notions.forEach(n =>
    n.subs.forEach(sub => {
      // titre (poids fort), mémo et règles, en français et dans la langue d'interface
      const t = sub.t + " " + dtx(sub.t);
      const body = [sub.memo, dtx(sub.memo), ...sub.r, ...sub.r.map(dtx), n.t, dtx(n.t)].join(" ");
      const s = hits(kw, t) * 3 + hits(kw, body);
      if (s >= 2) sc.push([s, sub.id]);
    }),
  );
  return sc
    .sort((a, b) => b[0] - a[0])
    .slice(0, 2)
    .map(x => x[1]);
}
/** Unités débloquées les plus proches de la demande (titre, description, astuce, phrases et mots). */
export function matchUnits(cid, text) {
  const C = COURSES[cid];
  const kw = keywords(text);
  if (!C || !kw.length) return [];
  const ul = unlockedUnits(cid);
  const pool = ul.length ? ul : C.units.slice(0, 3);
  return pool
    .map(U => {
      const head = [U.t, U.d, U.tip].join(" ");
      const body = [...(U.p || []).flat(), ...(U.v || []).flat()].join(" ");
      return [hits(kw, head) * 2 + hits(kw, body), U];
    })
    .filter(x => x[0] >= 2)
    .sort((a, b) => b[0] - a[0])
    .slice(0, 3)
    .map(x => x[1]);
}
const unitByTitle = (cid, t) => (t && COURSES[cid] ? COURSES[cid].units.find(U => U.t === t) : null);

// ---------- réponse de Claude (v39.2, mode « chat » de generate.php) ----------
const LANG_FR = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" };
/** Données envoyées pour une réponse de Horang : jamais de consigne libre, seulement le message et le contexte. */
export function chatRequest(cid, text, sentence) {
  const C = COURSES[cid];
  const set = drillSetFor(cid);
  const ul = unlockedUnits(cid);
  return {
    mode: "chat",
    kind: C.kind,
    lang: C.lang,
    course: C.name,
    level: secName(cid, Math.max(0, ...ul.map(u => u.lv || 0))),
    msg: String(text).slice(0, 300),
    now: [sentence, ...RECENT.filter(x => x.cid === cid && x.s !== sentence).map(x => x.s)]
      .filter(Boolean)
      .slice(0, 4)
      .map(x => String(x).slice(0, 200)),
    rules: set
      ? set.notions
          .flatMap(n => n.subs)
          .map(x => (x.id + " : " + x.t).slice(0, 100))
          .slice(0, 40)
      : [],
    units: ul.slice(-12).map(u => String(u.t).slice(0, 80)),
  };
}
/** Même consigne que server/api/generate.php (mode « chat »). */
export function chatPrompt(r) {
  const L = LANG_FR[r.lang] || "anglais";
  return (
    "Tu es Horang, le coach d'une application d'apprentissage façon Duolingo. L'élève est francophone et apprend le " +
    L +
    ". Cours : " +
    r.course +
    ". Niveau : " +
    r.level +
    ".\n" +
    (r.units.length ? "Unités déjà étudiées : " + r.units.join(", ") + ".\n" : "") +
    (r.now.length ? "Phrases que l'élève vient de voir :\n- " + r.now.join("\n- ") + "\n" : "") +
    "Message de l'élève : « " +
    r.msg +
    " »\n\n" +
    "Ce message est une question sur la langue, une notion qu'il veut travailler, ou une phrase qu'il a écrite lui-même et veut faire corriger. Réponds comme un professeur bienveillant, en français et en tutoyant :\n" +
    "- question ou notion : explique en 2 à 4 points très courts (la règle, un exemple en " +
    L +
    " avec sa traduction, le piège à éviter) ;\n" +
    "- phrase écrite par l'élève : corrige-la dans \"fix\" (sa phrase, la phrase corrigée, l'explication en une phrase) et résume la règle en 1 ou 2 points ; si elle est juste, la phrase corrigée est identique et l'explication le dit ;\n" +
    "- message sans rapport avec l'apprentissage du " +
    L +
    " : dis-le gentiment en un point et propose une notion de son niveau.\n" +
    (r.rules.length
      ? "Règles de grammaire du cours (identifiant : titre) :\n- " +
        r.rules.join("\n- ") +
        '\nDans "rule", donne l\'identifiant de la règle la plus proche du message, ou une chaîne vide si aucune ne convient.\n'
      : "") +
    'Dans "focus", écris en quelques mots (60 caractères au plus) le point précis à entraîner ensuite.\n' +
    'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour : {"reply":["point 1","point 2"],"fix":["phrase de l\'élève","phrase corrigée","explication"],"rule":"identifiant ou chaîne vide","focus":"point à entraîner"} ("fix" est une liste vide si le message n\'est pas une phrase à corriger).'
  );
}
/** Garde ce qui est utilisable dans la réponse de Claude (ou null). */
export function chatValid(raw, cid) {
  if (!raw || typeof raw !== "object") return null;
  const str = (x, n) => typeof x === "string" && x.trim().length > 0 && x.length <= n;
  const reply = (Array.isArray(raw.reply) ? raw.reply : [])
    .filter(x => str(x, 500))
    .map(x => x.trim())
    .slice(0, 4);
  const fix =
    Array.isArray(raw.fix) && raw.fix.length >= 3 && raw.fix.slice(0, 3).every(x => str(x, 400))
      ? raw.fix.slice(0, 3).map(x => x.trim())
      : null;
  const set = drillSetFor(cid);
  const x = typeof raw.rule === "string" ? drillSub(raw.rule.trim()) : null;
  const rule = x && set && x.set === set ? raw.rule.trim() : "";
  const focus = str(raw.focus, 120) ? raw.focus.trim() : "";
  if (!reply.length && !fix) return null;
  return { reply, fix, rule, focus };
}
const same = (a, b) =>
  String(a)
    .replace(/[\s.!?。]+$/u, "")
    .trim()
    .toLowerCase() ===
  String(b)
    .replace(/[\s.!?。]+$/u, "")
    .trim()
    .toLowerCase();

// ---------- fenêtre de conversation ----------
let CHAT = null;
const short = (s, n = 46) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** Ouvre « Demande à Horang » (pré, facultatif : phrase vue à l'instant à proposer d'emblée). */
export function askOpen(pre) {
  const cid = curCid();
  const C = COURSES[cid];
  if (!C) return;
  aiDetect().catch(() => {});
  const m = modal(
    `<div class="askhead"><span class="askav">${mascot("happy")}</span><div><h2>Demande à Horang</h2><small><span>Ton coach</span> · <span class="notr">${esc(C.name)}</span></small></div></div>
  <div class="asklog" id="askLog" aria-live="polite"></div>
  <form class="askbar" id="askForm" autocomplete="off"><input class="finput" id="askIn" maxlength="160" enterkeyhint="send" placeholder="Une question, une notion ou ta phrase à corriger…" aria-label="Ta demande"><button class="askgo" type="submit" aria-label="Envoyer">${ic("chevr", 22, "", 3)}</button></form>`,
    "askmodal",
  );
  CHAT = { m, cid, log: m.querySelector("#askLog") };
  horang(
    `<p>Sur quoi veux-tu t'entraîner ? Pose une question, écris une notion ou une phrase à corriger, ou touche une phrase que tu viens de voir : je te prépare des exercices.</p>`,
  );
  suggest();
  const f = m.querySelector("#askForm");
  f.onsubmit = e => {
    e.preventDefault();
    const inp = m.querySelector("#askIn");
    const t = inp.value.trim();
    if (!t) return inp.focus();
    inp.value = "";
    ask(t);
  };
  if (pre) setTimeout(() => ask(`Cette phrase : « ${pre.s} »`, pre), 120);
}
function scrollEnd() {
  if (!CHAT) return;
  const l = CHAT.log;
  requestAnimationFrame(() => {
    l.lastElementChild && l.lastElementChild.scrollIntoView({ block: "end", behavior: "smooth" });
  });
}
function horang(html) {
  if (!CHAT) return null;
  const d = document.createElement("div");
  d.className = "askmsg h";
  d.innerHTML = `<div class="askb">${html}</div>`;
  CHAT.log.appendChild(d);
  scrollEnd();
  return d;
}
function me(text) {
  const d = document.createElement("div");
  d.className = "askmsg me";
  // texte de l'élève : jamais traduit ; seules les amorces (« Cette phrase : … ») le sont
  d.innerHTML = `<div class="askb notr">${esc(trText(text))}</div>`;
  CHAT.log.appendChild(d);
  scrollEnd();
}
/** Propositions : phrases gardées, phrases vues à l'instant, dernière erreur, notions du cours. */
function suggest() {
  const { cid } = CHAT;
  const seen = [];
  const add = it => {
    if (it && it.s && !seen.some(x => x.s === it.s)) seen.push(it);
  };
  pinsFor(cid).slice().reverse().forEach(add);
  RECENT.filter(x => x.cid === cid)
    .slice()
    .reverse()
    .forEach(add);
  const err = (S.elog[cid] || []).slice(-1)[0];
  const set = drillSetFor(cid);
  const notions = set ? set.notions.slice(0, 8) : [];
  const lastU = (RECENT.filter(x => x.cid === cid && x.u).slice(-1)[0] || {}).u;
  const chips = [];
  seen
    .slice(0, 4)
    .forEach((it, i) =>
      chips.push(
        `<button class="askchip askseen" data-k="s${i}">${ic(isPinned(it) ? "pin" : "repeat", 15, "", 2.6)}<span class="notr" lang="${esc(COURSES[cid].lang)}">${esc(short(it.s))}</span></button>`,
      ),
    );
  if (lastU)
    chips.push(
      `<button class="askchip askunit" data-k="u">${ic("map", 15, "", 2.6)}<span>Ma dernière unité</span></button>`,
    );
  if (err && err.a)
    chips.push(
      `<button class="askchip askerr" data-k="e">${ic("target", 15, "", 2.6)}<span>Ma dernière erreur</span></button>`,
    );
  const d = horang(
    `${seen.length || lastU || err ? `<b class="askh">Vu à l'instant</b><div class="askchips">${chips.join("")}</div>` : ""}${notions.length ? `<b class="askh">Idées</b><div class="askchips">${notions.map(n => `<button class="askchip" data-n="${esc(n.id)}"><span class="notr">${esc(n.ic)} ${esc(dtx(n.t))}</span></button>`).join("")}</div>` : ""}`,
  );
  if (!d) return;
  if (!chips.length && !notions.length) d.remove();
  d.querySelectorAll("[data-k]").forEach(
    b =>
      (b.onclick = () => {
        beep("tap");
        const k = b.dataset.k;
        if (k === "u") return ask(`Ma dernière unité : « ${lastU} »`, { cid, u: lastU, s: "" });
        if (k === "e")
          return ask(`Ma dernière erreur : « ${err.a} »`, { cid, s: String(err.a).slice(0, 200), u: err.u || "" });
        const it = seen[+k.slice(1)];
        ask(`Cette phrase : « ${it.s} »`, it);
      }),
  );
  d.querySelectorAll("[data-n]").forEach(
    b =>
      (b.onclick = () => {
        beep("tap");
        const n = set.notions.find(x => x.id === b.dataset.n);
        if (n) ask(dtx(n.t), { cid, notion: n.id, s: "" });
      }),
  );
}
/** Traite une demande : réponse de Horang (règle trouvée, repères de la phrase) et choix d'exercices. */
async function ask(text, it) {
  if (!CHAT) return;
  const { cid } = CHAT;
  const C = COURSES[cid];
  me(text);
  const wait = horang(`<p class="askwait"><i></i><i></i><i></i></p>`);
  const mode = await aiDetect().catch(() => "local");
  if (!CHAT || !document.body.contains(CHAT.log)) return;
  const ai = mode && mode !== "local";
  const sentence = (it && it.s) || "";
  // v39.2 : avec l'IA, Horang répond vraiment (question, notion, phrase à corriger) ; pas d'appel pour une idée de notion
  let G = null,
    aiFail = false;
  if (ai && !(it && (it.notion || (it.u && !it.s)))) {
    const req = chatRequest(cid, text, sentence);
    try {
      G = chatValid(await aiAsk(chatPrompt(req), req, { tier: "quick", ms: 30000 }), cid);
    } catch (e) {
      G = null;
    }
    aiFail = !G;
    if (!CHAT || !document.body.contains(CHAT.log)) return;
  }
  wait && wait.remove();
  // règles : celle de la phrase vue (notion générée), sinon celles qui ressemblent à la demande
  let rules = it && it.sub && drillSub(it.sub) ? [it.sub] : [];
  if (G && G.rule) rules = [G.rule, ...rules.filter(r => r !== G.rule)];
  if (!rules.length) rules = matchRules(cid, it && it.notion ? "" : text);
  const units = [];
  const pushU = U => U && !units.includes(U) && units.push(U);
  if (it && it.u) pushU(unitByTitle(cid, it.u));
  if (!sentence) matchUnits(cid, text.replace(/^[^«]*«\s*|\s*»$/g, "")).forEach(pushU);
  else if (!units.length) matchUnits(cid, sentence).forEach(pushU);
  const parts = [];
  const lang = esc(C.lang);
  if (G) {
    if (G.fix) {
      const ok = same(G.fix[0], G.fix[1]);
      parts.push(
        `<div class="askfix ${ok ? "ok" : ""}"><b class="askh">${ok ? "Ta phrase est juste" : "Ta phrase corrigée"}</b>${ok ? "" : `<s class="notr" lang="${lang}">${esc(G.fix[0])}</s>`}<span class="notr askright" lang="${lang}">${esc(G.fix[1])}</span><small class="notr">${esc(G.fix[2])}</small></div>`,
      );
    }
    if (G.reply.length) parts.push(`<ul class="askul notr">${G.reply.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`);
    if (rules.length && G.rule)
      parts.push(
        `<p class="askrule"><span>Règle du cours :</span> <b class="notr">${esc(drillLabel(rules[0]))}</b></p>`,
      );
  } else if (it && it.notion) {
    const n = drillSetFor(cid).notions.find(x => x.id === it.notion);
    parts.push(`<p class="notr">${esc(dtx(n.d))}</p>`);
  } else if (rules.length) {
    const x = drillSub(rules[0]);
    parts.push(
      `<p><span>Ça correspond à la règle</span> <b class="notr">${esc(drillLabel(rules[0]))}</b></p><p class="notr">${esc(dtx(x.sub.memo))}</p>`,
    );
  }
  if (aiFail) parts.unshift(`<p class="askw">Claude n'a pas pu répondre : voici ce que je trouve dans le cours.</p>`);
  if (sentence && C.kind !== "volt" && !G) {
    const notes = grammarNotes(sentence, C.lang).slice(0, 2);
    if (notes.length) parts.push(`<ul class="askul">${notes.map(n => `<li>${n}</li>`).join("")}</ul>`);
  }
  if (!rules.length && !units.length && !(it && it.notion) && !sentence && !ai) {
    horang(
      `<p>Sans IA, je n'ai rien trouvé sur ta demande dans le cours. Essaie une des idées ci-dessus, ou branche ton Claude dans Paramètres › Mon Claude pour des exercices sur n'importe quel sujet.</p>`,
    );
    return;
  }
  const acts = [];
  if (ai || units.length || sentence)
    acts.push(
      `<button class="btn" data-a="ai">${ic(ai ? "spark" : "repeat", 18, "", 2.6)}<span>${ai ? "Exercices sur mesure" : "Exercices de révision"}</span></button>`,
    );
  if (it && it.notion)
    acts.push(
      `<button class="btn ghost" data-a="n">${ic("layers", 18, "", 2.6)}<span>12 phrases sur cette notion</span></button>`,
    );
  else if (rules.length)
    acts.push(
      `<button class="btn ghost" data-a="r">${ic("layers", 18, "", 2.6)}<span>12 phrases sur cette règle</span></button>`,
    );
  if (!parts.length)
    parts.push(
      `<p>${ai ? "C'est noté : je te prépare des exercices nouveaux sur ce point, à ton niveau." : "Je te propose une révision des unités les plus proches de ta demande."}</p>`,
    );
  const d = horang(`${parts.join("")}<div class="askacts">${acts.join("")}</div>`);
  if (!d) return;
  const go = fn => {
    beep("tap");
    closeModal();
    CHAT = null;
    // une phrase gardée sur laquelle on s'entraîne n'est plus proposée en fin de séance
    if (it && it.s && isPinned(it)) togglePin(it);
    fn();
  };
  const a1 = d.querySelector('[data-a="ai"]');
  if (a1)
    a1.onclick = () =>
      go(() => {
        const base = unlockedUnits(cid);
        const us = units.length ? [...new Set([...units, ...base.slice(-2)])] : base;
        const now = [
          ...(G && G.fix && !same(G.fix[0], G.fix[1]) ? [G.fix[1]] : []),
          sentence,
          ...RECENT.filter(x => x.cid === cid && x.s !== sentence).map(x => x.s),
        ]
          .filter(Boolean)
          .slice(0, 4);
        startAI(cid, us.length ? us : COURSES[cid].units.slice(0, 2), {
          mode: "train",
          ask: ((G && G.focus ? G.focus + " — " : "") + text).slice(0, 160),
          now,
          subs: it && it.notion ? [it.notion] : rules,
        });
      });
  const a2 = d.querySelector('[data-a="r"]');
  if (a2) a2.onclick = () => go(() => startDrills(cid, rules[0]));
  const a3 = d.querySelector('[data-a="n"]');
  if (a3) a3.onclick = () => go(() => startDrills(cid, it.notion));
}

// ---------- bulle flottante (Parcours et Entraînement) ----------
const FAB_VIEWS = ["parcours", "entrainement", "chapitres"];
/** Affiche ou masque la bulle « Demande à Horang » selon l'écran (réglage Préférences). */
export function askFab(view) {
  let b = document.getElementById("askFab");
  const on = FAB_VIEWS.includes(view) && !(S.set && S.set.askOff) && !!COURSES[curCid()];
  document.body.classList.toggle("askon", on);
  if (!on) {
    if (b) b.remove();
    return;
  }
  if (!b) {
    b = document.createElement("button");
    b.id = "askFab";
    b.className = "askfab";
    b.setAttribute("aria-label", "Demande à Horang");
    b.innerHTML = `${ic("chat", 28, "", 2.4)}<span class="askdot"></span>`;
    b.onclick = () => {
      beep("tap");
      askOpen();
    };
    document.getElementById("app").appendChild(b);
  }
  b.classList.toggle("new", pinsFor(curCid()).length > 0);
}
