// Écran Parcours (unités, fiche d'unité, guide)
import { COURSES, LEVELS } from "../content/index.js";
import { ACC, S, save } from "../core/accounts.js";
import {
  curLevel,
  doneCount,
  hgDone,
  isDone,
  nextStep,
  stepOpen,
  PARTS,
  PSZ,
  partSteps,
  partsDone,
  unitComplete,
  unitOpen,
  unitSteps,
} from "../core/progress.js";
import { $, NODE, NPU, TIER, UCOLORS, UDARK, esc, lessonNo, secName } from "../core/util.js";
import { todayXp } from "../core/xp.js";
import { pairOf } from "../exercises/generate.js";
import { genUnit } from "../features/ai-units.js";
import { placeEstimate, placeIntro } from "../features/placement.js";
import { todayQuests } from "../features/quests.js";
import { buildLesson } from "../lesson/build.js";
import { openSession } from "../lesson/engine.js";
import { writeTasks } from "../lesson/writing.js";
import { AI, startAI } from "../services/ai.js";
import { beep, say } from "../services/speech.js";
import { flagSvg, ic } from "../ui/icons.ts";
import { mascot } from "../ui/mascot.js";
import { horangScene } from "../ui/scenes.ts";
import { hasPic, picSvg, picWord } from "../ui/pics.ts";
import { ANDROID, INSTALL, IOS, STANDALONE, haptic } from "../ui/platform.js";
import { curCid, curSec, renderAll } from "../ui/router.js";
import { closeModal, deep, modal, toast } from "../ui/ui.js";

// ---- Unités repliables : choix mémorisé sur l'appareil, par profil et par cours ----
export function foldGet(cid) {
  try {
    return JSON.parse(localStorage.getItem("speakeasy-fold:" + ACC.current) || "{}")[cid] || {};
  } catch (e) {
    return {};
  }
}
export function foldSet(cid, f) {
  try {
    const all = JSON.parse(localStorage.getItem("speakeasy-fold:" + ACC.current) || "{}");
    all[cid] = f;
    localStorage.setItem("speakeasy-fold:" + ACC.current, JSON.stringify(all));
  } catch (e) {}
}
// Par défaut : dépliées = l'unité conseillée et les unités commencées mais pas finies
export function isFolded(cid, u, ns) {
  const f = foldGet(cid);
  if (f[u] !== undefined) return f[u];
  return !((ns && ns.u === u) || (unitSteps(cid, u) > 0 && !unitComplete(cid, u)));
}
export function toggleFold(cid, u, force) {
  const sec = document.getElementById("unit" + u);
  if (!sec) return;
  const fold = force !== undefined ? force : !sec.classList.contains("folded");
  sec.classList.toggle("folded", fold);
  sec.querySelector(".ubanner").setAttribute("aria-expanded", String(!fold));
  const f = foldGet(cid);
  f[u] = fold;
  foldSet(cid, f);
  haptic(1);
}
/** Icône d'une étape du parcours (pièce 3D). */
export function stepKind(n, st) {
  if (n === NPU - 1) return st === "done" ? "trophy" : "chest";
  if (st === "lock") return "lock";
  if (NODE[n] === "ai") return "spark";
  if (NODE[n] === "w") return "pencil";
  return ["star", "phones", "doc", "mic"][TIER[n]] || "star";
}
/** v33 : repères de thème le long d'une unité, façon Duolingo — étape où commence chaque phase, puis [titre, ce qu'on y travaille]. */
export const STAGE_AT = { 0: 0, 2: 1, 6: 2, 12: 3, [NPU - 1]: 4 };
const STAGES = {
  trans: [
    ["Découvrir", "Mots et premières phrases"],
    ["Comprendre", "Écoute et traduction guidée"],
    ["Construire", "Écrire les phrases"],
    ["Maîtriser", "Écrire, écouter et parler sans aide"],
  ],
  toeic: [
    ["Découvrir", "Vocabulaire et formats des questions"],
    ["Comprendre", "Questions plus rapides, pièges courants"],
    ["Approfondir", "Conversations et documents plus longs"],
    ["Maîtriser", "Rythme et difficulté de l'examen"],
  ],
  volt: [
    ["Découvrir", "La règle et ses cas simples"],
    ["S'entraîner", "Repérer la faute dans la phrase"],
    ["Approfondir", "Pièges et exceptions"],
    ["Maîtriser", "Dictées et phrases sans aide"],
  ],
  hg: [
    ["Découvrir", "Reconnaître les lettres"],
    ["Comprendre", "Lire les syllabes"],
    ["Construire", "Composer les blocs"],
    ["Maîtriser", "Lire et écrire sans aide"],
  ],
};
export function stageLabel(kind, U, i) {
  if (i === 4) return ["Bilan", "Tout ce que l'unité a couvert"];
  return (STAGES[U && U.hg ? "hg" : kind] || STAGES.trans)[i];
}
/** Nom court d'une étape (bulle et lecteur d'écran). */
export function stepName(n) {
  if (n === NPU - 1) return "Bilan de l'unité";
  if (NODE[n] === "ai") return "Révision IA";
  if (NODE[n] === "w") return "Rédaction";
  // v34 : numéro de la leçon dans son unité affichée (6 étapes)
  const a = Math.floor(n / PSZ) * PSZ;
  const les = k => NODE.slice(a, k).filter(x => x === "L").length;
  return "Leçon " + les(n + 1) + " sur " + les(a + PSZ);
}
/** Chapitres d'un cours : ses niveaux, dans l'ordre (0 = les bases… 3 = expert). */
export function chapters(cid) {
  return [...new Set(COURSES[cid].units.map(U => U.lv))].sort((a, b) => a - b);
}
/** Chapitre affiché : celui choisi, sinon celui de l'étape conseillée. */
export function curChapter(cid, ns) {
  const chs = chapters(cid);
  const c = (S.chap || {})[cid];
  if (chs.includes(c)) return c;
  if (ns) return COURSES[cid].units[ns.u].lv;
  return chs[chs.length - 1];
}
/** Change de chapitre ; « goCur » descend ensuite jusqu'à l'étape conseillée. */
export function setChapter(cid, lv, goCur) {
  S.chap = S.chap || {};
  S.chap[cid] = lv;
  save();
  if (location.hash !== "#parcours") location.hash = "parcours";
  renderAll();
  if (goCur) {
    const ns = nextStep(cid);
    const el = ns && document.querySelector(`.node[data-u="${ns.u}"][data-n="${ns.n}"]`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }
}
/** Écran « Chapitres » du cours, façon Duolingo. */
export function renderChapters(v) {
  const cid = curCid(),
    C = COURSES[cid];
  const ns = nextStep(cid);
  const cur = curChapter(cid, ns);
  let first = 1;
  const cards = chapters(cid)
    .map((lv, i) => {
      const us = C.units.map((U, u) => [U, u]).filter(([U]) => U.lv === lv);
      const d = us.reduce((x, [U, u]) => x + partsDone(cid, u), 0);
      const a = first,
        b = first + us.length * PARTS - 1;
      first = b + 1;
      return `<button class="chapcard ${lv === cur ? "on" : ""}" data-ch="${lv}" style="animation-delay:${(i * 0.05).toFixed(2)}s"><span class="cct"><b>Chapitre ${i + 1}</b><span class="ccr">${flagSvg(curSec().id, 26, 17, 4)}<span>Unités ${a} à ${b}</span></span></span><small>${secName(cid, lv)}</small><span class="ccbar"><i style="width:${Math.round((d / Math.max(1, us.length * PARTS)) * 100)}%"></i></span><span class="ccn">${d} / ${us.length * PARTS}</span></button>`;
    })
    .join("");
  v.innerHTML = `<div class="sethead"><button class="setx" id="chapClose" aria-label="Fermer">${ic("x", 28, "", 3)}</button><h1>${esc(C.name)}</h1><span></span></div><div class="chaplist">${cards}</div>`;
  $("#chapClose").onclick = () => (location.hash = "parcours");
  v.querySelectorAll("[data-ch]").forEach(b => (b.onclick = () => setChapter(cid, +b.dataset.ch)));
}
let curObs = null;
/** Bouton flottant « revenir à l'étape conseillée », visible quand elle sort de l'écran. */
function curFab(v, cid, ns) {
  if (curObs) curObs.disconnect();
  curObs = null;
  if (!ns || typeof IntersectionObserver === "undefined") return;
  const fab = document.createElement("button");
  fab.className = "pathfab hidden";
  fab.setAttribute("aria-label", "Revenir à l'étape conseillée");
  v.appendChild(fab);
  fab.onclick = () => {
    if (!v.querySelector(`.node[data-u="${ns.u}"][data-n="${ns.n}"]`))
      return setChapter(cid, COURSES[cid].units[ns.u].lv, true);
    const el = document.querySelector(`.node[data-u="${ns.u}"][data-n="${ns.n}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const el = v.querySelector(`.node[data-u="${ns.u}"][data-n="${ns.n}"]`);
  const target = el || v.querySelector(`#unit${ns.u} .ubanner`);
  if (!target) {
    fab.innerHTML = ic("down", 26, "", 2.8);
    fab.classList.remove("hidden");
    return;
  }
  curObs = new IntersectionObserver(es => {
    const e = es[es.length - 1];
    if (!fab.isConnected) return curObs && curObs.disconnect();
    const up = e.boundingClientRect.top < 0;
    fab.innerHTML = ic("down", 26, up ? "up" : "", 2.8);
    fab.classList.toggle("hidden", e.isIntersecting);
  });
  curObs.observe(target);
}
export function renderPath(v) {
  const s = curSec(),
    cid = curCid(),
    C = COURSES[cid],
    done = doneCount(cid),
    ns = nextStep(cid);
  // chapitres = niveaux du cours (comme Duolingo : on n'affiche que le chapitre choisi)
  const chs = chapters(cid);
  const ch = curChapter(cid, ns);
  const ci = chs.indexOf(ch);
  let units = "";
  let gi = 0;
  let k = 0;
  C.units.forEach((U, u) => {
    if (U.lv !== ch) return;
    const col = UCOLORS[u % 6],
      dk = UDARK[u % 6];
    const partNodes = ["", "", ""];
    for (let n = 0; n < NPU; n++, gi++) {
      let nodes = "";
      const part = Math.floor(n / PSZ),
        ln = n % PSZ;
      const idx = u * NPU + n;
      const st = isDone(cid, u, n)
        ? "done"
        : ns && ns.u === u && ns.n === n
          ? "cur"
          : stepOpen(cid, u, n)
            ? "open"
            : "lock";
      if (STAGE_AT[n] != null) {
        const [a, b] = stageLabel(C.kind, U, STAGE_AT[n]);
        nodes += `<div class="pstage"><i></i><span><b>${a}</b><small>${b}</small></span><i></i></div>`;
      }
      const off = Math.round(Math.sin(gi * 0.85) * 72);
      const k = stepKind(n, st);
      const [c, d] = NODE[n] === "ai" ? ["#B07BFF", "#7B4DD6"] : NODE[n] === "w" ? ["#13A8A8", "#0C7F7F"] : [col, dk];
      const crown = (S.ext[cid] || []).includes(idx);
      nodes += `<div class="nodewrap${st === "cur" || (st === "open" && n === 0) ? " bub" : ""}" style="transform:translateX(${off}px);--c:${c};--d:${d}">${st === "cur" ? `<div class="ring"></div><button class="startbub" data-u="${u}" data-n="${n}">${idx === 0 ? "Commencer" : "Go !"}</button>` : st === "open" && n === 0 ? `<button class="startbub soft" data-u="${u}" data-n="${n}">Ouvrir</button>` : ""}<button class="node coin ${st} ${n === NPU - 1 ? "chest" : ""} ${NODE[n] === "ai" ? "ainode" : NODE[n] === "w" ? "wnode" : ""}" data-u="${u}" data-n="${n}" aria-label="${stepName(n)}">${st === "done" || st === "cur" ? '<span class="gloss"></span>' : ""}${ic(k, k === "star" ? 38 : 34, "", 2.6)}${crown ? `<span class="crown">${ic("crown", 14, "", 2.2, "currentColor")}</span>` : ""}</button></div>`;
      if (n === 2 || n === 11)
        nodes += `<div class="pathmascot" style="${off > 0 ? "left" : "right"}:3%;top:${ln * 94 + 50 + (n === 2 ? 2 : 1) * 68}px">${horangScene(u * 2 + (n > 2 ? 1 : 0))}</div>`;
      partNodes[part] += nodes;
    }
    const locked = !unitOpen(cid, u);
    for (let part = 0; part < PARTS; part++) {
      k++;
      const us = partSteps(cid, u, part),
        uc = us === PSZ;
      const fd = false;
      const pc = Math.round((us / PSZ) * 100);
      const sg = stageLabel(C.kind, U, [0, 2, 3][part]);
      units += `<section class="unit ${fd ? "folded" : ""}" id="unit${u}${part ? "p" + part : ""}"><div class="ubanner" style="--c:${locked ? "#8F89AD" : deep(col)};--d:${locked ? "#6E6890" : dk}"><div class="ut"><small><span>Chapitre ${ci + 1}, unité ${k}</span> · <span>${sg[0]}</span>${uc ? ` <span class="udone">${ic("check", 14, "", 3.4)}</span>` : ""}</small><h2>${esc(U.t)}</h2><p>${part ? `<span>${sg[1]}</span>` : esc(U.d)}</p><div class="umini"><i style="width:${pc}%"></i></div></div><div class="ubtns">${part === 0 && locked && !U.hg && u === C.units.findIndex(x => !x.hg) ? `<button class="guide" data-j="${u}">⏩ Tester mon hangul</button>` : ""}<button class="guide" data-g="${u}" aria-label="Guide de l'unité">${ic("guide", 26, "", 2.4)}<span>Guide</span></button></div></div><div class="nodes">${partNodes[part]}</div></section>`;
    }
  });
  const nx = chs[ci + 1];
  if (nx !== undefined) {
    const nu = C.units.filter(U => U.lv === nx).length;
    units += `<div class="chapnext"><span class="chnk">Chapitre ${ci + 2}</span><b>${secName(cid, nx)}</b><small>${nu * PARTS} unités</small><button class="btn" id="chapNext">Continuer</button></div>`;
  }
  const nGen = (S.genU[cid] || []).length;
  const lastDone = unitSteps(cid, C.units.length - 1) > 0 || C.units.every((U, u) => unitComplete(cid, u));
  if (nx === undefined)
    units += `<div class="endtrophy"><span class="endtr">${ic("trophy", 40, "", 2.4)}</span><b>${C.units.every((U, u) => unitComplete(cid, u)) ? `Toutes les unités de ${C.name} sont terminées, bravo !` : `Fin du parcours ${C.name} : continue !`}</b>${nGen ? `<small>${nGen} unité(s) créée(s) par l'IA pour toi</small>` : ""}
  <div class="genbox"><span>${ic("spark", 20, "", 2.4)}<b>La suite, à l'infini</b></span><p>L'IA crée une nouvelle unité dès que la dernière est commencée.</p><button class="btn ${lastDone ? "goldb" : "ghost"}" id="genU" ${lastDone ? "" : "disabled"}>${lastDone ? "Créer l'unité suivante" : "Disponible dès la dernière unité commencée"}</button></div></div>`;
  const gx = todayXp(),
    gp = Math.min(100, Math.round((gx / S.goal) * 100));
  const side = `<div class="side"><div class="card"><div class="goalrow">${mascot(gp >= 100 ? "happy" : "calm", "jump")}<div style="flex:1"><h3 style="margin-bottom:6px">Objectif du jour</h3><div class="bar"><i style="width:${gp}%"></i><span>${gx} / ${S.goal} XP</span></div></div></div></div>
  <a class="card sidequest" href="#quetes"><span>${ic("chest", 26, "", 2.4)}</span><b>Quêtes du jour</b><em>${todayQuests().filter(q => S.q.claimed.includes(q.id)).length} / 3</em>${ic("chevr", 20, "", 2.8)}</a>
  <div class="card"><h3 class="hi">${ic("chart", 22, "", 2.4)}Progression ${C.name}</h3><div class="bar ok"><i style="width:${Math.round((done / (C.units.length * NPU)) * 100)}%"></i><span>${done} / ${C.units.length * NPU} étapes</span></div><p class="secsub" style="margin:10px 0 0">🧭 Parcours libre : ${cid === "ko" && !hgDone(cid) ? "termine les unités de hangul, puis" : ""} commence n'importe quelle unité avec « Ouvrir ». L'étape 👉 conseillée suit l'ordre du parcours.</p>${ns ? `<button class="btn ghost" id="goNext" style="margin-top:10px">👉 Aller à l'étape conseillée</button>` : ""}<button class="btn ghost" id="placeGo2" style="margin-top:8px">🎯 ${(S.place || {})[cid] != null ? "Refaire le test de niveau" : "Test de niveau"}</button>${(S.place || {})[cid] != null ? `<p class="secsub" style="margin:8px 0 0">${esc(placeEstimate(cid, S.place[cid]))}</p>` : ""}</div></div>`;
  const inst =
    ANDROID && !STANDALONE && !S.set.hideInstall
      ? `<div class="install"><span class="iic">📲</span><div><b>Installe Speakeasy sur ton téléphone</b><br>${INSTALL.ev ? "Une vraie app sur ton écran d'accueil : plein écran, rappels quotidiens et accès hors ligne." : "Dans Chrome, touche le menu <b>⋮</b> puis <b>« Ajouter à l'écran d'accueil »</b> (ou « Installer l'application ») : plein écran, rappels quotidiens et accès hors ligne."}${INSTALL.ev ? `<br><button class="btn" id="instgo" style="margin-top:8px;width:auto;padding:10px 18px">📲 Installer</button>` : ""}</div><button class="iconbtn" id="instx" aria-label="Fermer">✕</button></div>`
      : IOS && !STANDALONE && !S.set.hideInstall
        ? `<div class="install"><span class="iic">📲</span><div><b>Installe Speakeasy sur ton iPhone</b><br>Dans Safari, touche <b>Partager</b> <span class="shareic">⎋</span> puis <b>« Sur l'écran d'accueil »</b>. Tu auras le plein écran, le badge des révisions sur l'icône et les rappels quotidiens. (Pour l'oral au micro direct, ouvre plutôt le site dans Safari.)</div><button class="iconbtn" id="instx" aria-label="Fermer">✕</button></div>`
        : "";
  const placeBan =
    !doneCount(cid) && (S.place || {})[cid] == null
      ? `<div class="placeban"><span>🎯</span><div><b>Tu as déjà des bases en ${esc(C.name)} ?</b><br>Passe le test de niveau (10 min) : ton parcours démarrera au bon endroit.</div><button class="btn goldb" id="placeGo">Faire le test</button></div>`
      : "";
  const cu = C.units.filter(U => U.lv === ch),
    cd = cu.reduce((x, U) => x + partsDone(cid, C.units.indexOf(U)), 0);
  const chead = `<button class="chaphead" id="chapGo"><span class="chk">Chapitre ${ci + 1}</span><b>${secName(cid, ch)}</b><span class="chbar"><i style="width:${Math.round((cd / Math.max(1, cu.length * PARTS)) * 100)}%"></i></span><span class="chn">${cd} / ${cu.length * PARTS}</span>${ic("chevr", 22, "", 2.8)}</button>`;
  v.innerHTML = `${inst}<div class="pathgrid"><div>${placeBan}${chead}${units}</div>${side}</div>`;
  const ix = $("#instx");
  if (ix)
    ix.onclick = () => {
      S.set.hideInstall = true;
      save();
      renderAll();
    };
  const ig = $("#instgo");
  if (ig)
    ig.onclick = async () => {
      const e = INSTALL.ev;
      if (!e) return;
      INSTALL.ev = null;
      try {
        await e.prompt();
        const r = await e.userChoice;
        if (r && r.outcome === "accepted") {
          S.set.hideInstall = true;
          save();
          toast("📲 Speakeasy est installé !");
        }
      } catch (x) {}
      renderAll();
    };
  $("#chapGo").onclick = () => (location.hash = "chapitres");
  const cn = $("#chapNext");
  if (cn)
    cn.onclick = () => {
      setChapter(cid, nx);
      scrollTo(0, 0);
    };
  v.querySelectorAll(".node,.startbub").forEach(b => (b.onclick = () => nodeSheet(cid, +b.dataset.u, +b.dataset.n)));
  v.querySelectorAll("[data-j]").forEach(b => (b.onclick = () => jumpAsk(cid, +b.dataset.j)));
  const gb = $("#genU");
  if (gb) gb.onclick = () => genUnit(cid);
  [$("#placeGo"), $("#placeGo2")].forEach(b => {
    if (b) b.onclick = () => placeIntro(cid);
  });
  const gn = $("#goNext");
  if (gn && ns)
    gn.onclick = () => {
      if (C.units[ns.u].lv !== ch) return setChapter(cid, C.units[ns.u].lv, true);
      const el = document.querySelector(`.node[data-u="${ns.u}"][data-n="${ns.n}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  v.querySelectorAll("[data-g]").forEach(b => (b.onclick = () => guide(cid, +b.dataset.g)));
  curFab(v, cid, ns);
}
export function nodeSheet(cid, u, n, force) {
  const C = COURSES[cid],
    U = C.units[u],
    idx = u * NPU + n;
  beep("tap");
  if (!unitOpen(cid, u)) {
    modal(
      `<div class="mcenter">${mascot("calm")}<h2>Hangul d'abord 🔒</h2><p>Les unités de coréen supposent de savoir lire le hangul. Termine les unités de hangul dans l'ordre (ou passe le test « Tester mon hangul ») et tout le parcours s'ouvrira.</p><button class="btn" onclick="closeModal()">Compris</button></div>`,
    );
    return;
  }
  if (!stepOpen(cid, u, n)) {
    modal(
      `<div class="mcenter">${mascot("calm")}<h2>Étape verrouillée 🔒</h2><p>Dans une unité, les étapes se font dans l'ordre : la difficulté monte progressivement. Commence par l'étape ${(() => {
        for (let k = 0; k < NPU; k++) if (!isDone(cid, u, k)) return k + 1;
        return 1;
      })()} de « ${esc(U.t)} ».</p><button class="btn" onclick="closeModal()">Compris</button></div>`,
    );
    return;
  }
  const lv0 = curLevel(cid);
  if (!force && !unitSteps(cid, u) && U.lv >= lv0 + 2) {
    const ns = nextStep(cid);
    const m = modal(
      `<div class="mcenter">${mascot("wow")}<h2>Unité de niveau ${LEVELS[U.lv]}</h2><p>« ${esc(U.t)} » est nettement au-dessus de ton niveau actuel dans le parcours (${LEVELS[lv0]}). Tu peux la commencer : ce sera plus difficile, et tes erreurs alimenteront le coach.</p><button class="btn" id="lvgo">Commencer quand même</button>${ns ? `<button class="btn ghost" id="lvnext">👉 Aller à l'étape conseillée</button>` : ""}</div>`,
    );
    m.querySelector("#lvgo").onclick = () => {
      closeModal();
      nodeSheet(cid, u, n, true);
    };
    const ln = m.querySelector("#lvnext");
    if (ln)
      ln.onclick = () => {
        closeModal();
        nodeSheet(cid, ns.u, ns.n, true);
      };
    return;
  }
  const done = isDone(cid, u, n) ? Infinity : -1;
  const pc = UCOLORS[u % 6],
    pd = UDARK[u % 6];
  const head = `<div class="npk"><span>${stepName(n)}</span> · <span>Étape ${(n % PSZ) + 1} sur ${PSZ}</span></div><h2>${esc(U.t)}</h2>`;
  if (NODE[n] === "w") {
    const m = modal(
      `<div class="mcenter npc">${head}<button class="btn big" id="go">${idx < done ? "Nouvelle rédaction (+XP)" : "Commencer"}</button></div>`,
      "npop",
    );
    m.querySelector("#go").onclick = () => {
      closeModal();
      openSession({ mode: "lesson", cid, u, n, exs: writeTasks(cid, u, n === 14 ? 1 : 0) });
    };
    extBtn(m, cid, u, n, idx, done, () =>
      openSession({
        mode: "lesson",
        cid,
        u,
        n,
        ext: true,
        jh: 3,
        noRetry: true,
        exs: writeTasks(cid, u, 1).map(e => Object.assign(e, { min: Math.round((e.min || 10) * 1.5), strict: true })),
      }),
    );
    placePop(m, u, n, "#13A8A8", "#0C7F7F");
    return;
  }
  if (NODE[n] === "ai") {
    const m = modal(
      `<div class="mcenter npc">${head}<button class="btn big" id="go">${idx < done ? "Nouvelle révision (+XP)" : "Commencer"}</button></div>`,
      "npop",
    );
    m.querySelector("#go").onclick = () => {
      closeModal();
      startAI(cid, C.units.slice(Math.max(0, u - 2), u + 1), { mode: "lesson", u, n });
    };
    extBtn(m, cid, u, n, idx, done, () =>
      startAI(cid, C.units.slice(Math.max(0, u - 2), u + 1), { mode: "lesson", u, n, ext: true, jh: 3, noRetry: true }),
    );
    placePop(m, u, n, "#9B6BFF", "#7B4DD6");
    return;
  }
  const isCk = n === NPU - 1;
  const m = modal(
    `<div class="mcenter npc">${head}${isCk ? `<p>+20 💎</p>` : ""}<button class="btn big" id="go">${idx < done ? "Revoir (+XP)" : "Commencer"}</button></div>`,
    isCk ? "npop chestpop" : "npop",
  );
  m.querySelector("#go").onclick = () => {
    closeModal();
    openSession({ mode: "lesson", cid, u, n, exs: buildLesson(cid, u, n) });
  };
  extBtn(m, cid, u, n, idx, done, () =>
    openSession({ mode: "lesson", cid, u, n, ext: true, jh: 3, noRetry: true, exs: buildLesson(cid, u, n, true) }),
  );
  placePop(m, u, n, isCk ? "#FFB020" : pc, isCk ? "#C98B4A" : pd);
}
/** Place la fiche d'étape en bulle sous la pièce touchée (comme la maquette), sinon elle reste en panneau. */
export function placePop(m, u, n, col, dk) {
  m.style.setProperty("--c", deep(col));
  m.style.setProperty("--d", dk);
  const el = document.querySelector(`#view .node[data-u="${u}"][data-n="${n}"]`);
  if (!el) return;
  let r = el.getBoundingClientRect();
  if (!r.width || el.closest(".folded")) return;
  m.classList.add("at");
  const nav = document.querySelector("#bottomnav");
  const nr = nav ? nav.getBoundingClientRect() : null;
  const bottom = nr && nr.top > innerHeight / 2 ? nr.top - 10 : innerHeight - 10;
  const ban = el.closest(".unit")?.querySelector(".ubanner");
  const minTop =
    (document.querySelector("#topbar") || { offsetHeight: 60 }).offsetHeight + (ban ? ban.offsetHeight + 24 : 20);
  const h = m.offsetHeight;
  const maxTop = bottom - 18 - h - r.height;
  if (r.top < minTop || r.top > maxTop) {
    window.scrollBy(0, Math.round(r.top - Math.max(minTop, Math.min(maxTop, innerHeight * 0.3))));
    r = el.getBoundingClientRect();
  }
  if (r.bottom + 18 + h > bottom + 4 || r.top < 0) {
    m.classList.remove("at");
    return;
  }
  const w = m.offsetWidth;
  const cx = r.left + r.width / 2;
  const left = Math.max(8, Math.min(innerWidth - w - 8, cx - w / 2));
  m.style.top = Math.round(r.bottom + 18) + "px";
  m.style.left = Math.round(left) + "px";
  m.style.setProperty("--cx", Math.round(cx - left - 10) + "px");
  const y0 = scrollY;
  const off = () => {
    if (!m.isConnected) return removeEventListener("scroll", off);
    if (Math.abs(scrollY - y0) > 60) {
      removeEventListener("scroll", off);
      closeModal();
    }
  };
  setTimeout(() => addEventListener("scroll", off, { passive: true }), 120);
}
export function extBtn(m, cid, u, n, idx, done, start) {
  const got = (S.ext[cid] || []).includes(idx);
  const card = m.querySelector(".mcenter") || m;
  card.insertAdjacentHTML(
    "beforeend",
    `<div class="extbox"><button class="btn extb" id="extgo" title="Tout à l'écrit et à l'oral, plus de pièges, audio seul, 3 erreurs maximum. XP ×2 et une couronne 👑 sur l'étape."><span>Version extrême · XP ×2</span>${got ? ` <span class="crown">${ic("crown", 14, "", 2.2, "currentColor")}</span>` : ""}</button></div>`,
  );
  m.querySelector("#extgo").onclick = () => {
    closeModal();
    start();
  };
}
export function jumpAsk(cid, u) {
  const C = COURSES[cid];
  const m = modal(
    `<div class="mcenter">${mascot("wow", "jump")}<h2>⏩ Tu sais déjà lire le hangul ?</h2><p>Réussis le test de « ${esc(C.units[u].t)} » (en hangul, sans romanisation) avec moins de 3 erreurs : les unités de hangul seront validées et tout le parcours de coréen s'ouvrira.</p><button class="btn big" id="jgo">Passer le test</button><button class="btn ghost" onclick="closeModal()">Plus tard</button></div>`,
  );
  m.querySelector("#jgo").onclick = () => {
    closeModal();
    openSession({ mode: "jump", cid, u, n: 4, exs: buildLesson(cid, u, NPU - 1), jh: 3, noRetry: true });
  };
}
export function guide(cid, u) {
  const C = COURSES[cid],
    U = C.units[u];
  const lang = C.lang;
  const ph = (U.p || [])
    .map(a => {
      const P = pairOf(C, a);
      return `<div class="vitem"><button class="spk" data-say="${esc(P.tgt)}">🔊</button><div class="tg">${esc(P.tgt)}${P.rom ? `<div class="rom">${esc(P.rom)}</div>` : ""}<div class="fr">${esc(P.src)}</div></div></div>`;
    })
    .join("");
  const vo = (U.v || [])
    .map(
      w =>
        `<div class="vitem"><button class="spk" data-say="${esc(w[1])}">🔊</button><div class="tg">${esc(w[1])}<div class="fr">${esc(w[0])}</div></div></div>`,
    )
    .join("");
  const ch = (U.c || [])
    .slice(0, 4)
    .map(c => {
      const full = c[0].includes("___") ? c[0].replace("___", c[1][c[2]]) : c[1][c[2]];
      return `<div class="vitem"><button class="spk" data-say="${esc(full)}">🔊</button><div class="tg">${esc(full)}<div class="fr">${esc(c[3])}</div></div></div>`;
    })
    .join("");
  const pk = (U.pk || [])
    .filter(hasPic)
    .map(id => {
      const W = picWord(id, lang);
      return `<button class="picword" data-say="${esc(W.w)}">${picSvg(id)}<span lang="${lang}">${esc(W.w)}</span>${W.rom ? `<small>${esc(W.rom)}</small>` : ""}</button>`;
    })
    .join("");
  const m = modal(
    `<h2 class="hi">${ic("book", 22, "", 2.4)}${esc(U.t)}</h2><p>${LEVELS[U.lv]} · ${esc(U.d)}</p>${U.tip ? `<div class="tipbox">💡 ${esc(U.tip)}</div>` : ""}${ph ? `<h3 style="margin-top:14px">Phrases clés</h3><div class="vlist">${ph}</div>` : ""}${vo ? `<h3>Mots utiles</h3><div class="vlist">${vo}</div>` : ""}${pk ? `<h3>Mots en images</h3><div class="picwords">${pk}</div>` : ""}${ch ? `<h3>Règles en exemples</h3><div class="vlist">${ch}</div>` : ""}<button class="btn" onclick="closeModal()">Fermer</button>`,
  );
  m.querySelectorAll("[data-say]").forEach(b => (b.onclick = () => say(b.dataset.say, lang)));
}
