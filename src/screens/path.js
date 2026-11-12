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
  unitComplete,
  unitOpen,
  unitSteps,
} from "../core/progress.js";
import { $, NODE, NPU, TIER, UCOLORS, UDARK, esc, lessonNo, secName } from "../core/util.js";
import { todayXp } from "../core/xp.js";
import { pairOf } from "../exercises/generate.js";
import { genUnit } from "../features/ai-units.js";
import { placeEstimate, placeIntro } from "../features/placement.js";
import { QUESTS } from "../features/quests.js";
import { buildLesson } from "../lesson/build.js";
import { openSession } from "../lesson/engine.js";
import { writeTasks } from "../lesson/writing.js";
import { AI, startAI } from "../services/ai.js";
import { beep, say } from "../services/speech.js";
import { mascot } from "../ui/mascot.js";
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
export function renderPath(v) {
  const s = curSec(),
    cid = curCid(),
    C = COURSES[cid],
    done = doneCount(cid),
    ns = nextStep(cid);
  const tabs =
    s.tracks.length > 1
      ? `<div class="tracks">${s.tracks.map(t => `<button data-t="${t}" class="${t === cid ? "on" : ""}">${COURSES[t].icon} ${COURSES[t].name}</button>`).join("")}</div>`
      : "";
  let units = "";
  let gi = 0;
  C.units.forEach((U, u) => {
    const col = UCOLORS[u % 6],
      dk = UDARK[u % 6];
    let nodes = "";
    for (let n = 0; n < NPU; n++, gi++) {
      const idx = u * NPU + n;
      const st = isDone(cid, u, n)
        ? "done"
        : ns && ns.u === u && ns.n === n
          ? "cur"
          : stepOpen(cid, u, n)
            ? "open"
            : "lock";
      const off = Math.round(Math.sin(gi * 0.85) * 72);
      const ic =
        n === NPU - 1
          ? st === "done"
            ? "🏆"
            : "🎁"
          : NODE[n] === "ai"
            ? st === "lock"
              ? "🔒"
              : "✨"
            : NODE[n] === "w"
              ? st === "lock"
                ? "🔒"
                : "✍️"
              : st === "done"
                ? "✔"
                : st === "lock"
                  ? "🔒"
                  : ["⭐", "📖", "🎧", "💪"][TIER[n]];
      nodes += `<div class="nodewrap${st === "cur" || (st === "open" && n === 0) ? " bub" : ""}" style="transform:translateX(${off}px);color:${col}">${st === "cur" ? `<div class="ring"></div><button class="startbub" data-u="${u}" data-n="${n}">${idx === 0 ? "Commencer" : "Go !"}</button>` : st === "open" && n === 0 ? `<button class="startbub soft" data-u="${u}" data-n="${n}">Ouvrir</button>` : ""}${(S.ext[cid] || []).includes(idx) ? '<span class="crown">👑</span>' : ""}<button class="node ${st} ${n === NPU - 1 ? "chest" : ""} ${NODE[n] === "ai" ? "ainode" : NODE[n] === "w" ? "wnode" : ""}" data-u="${u}" data-n="${n}" style="${st === "cur" ? `background:${col};box-shadow:0 7px 0 ${dk}` : st === "open" ? `border-color:${col};color:${col}` : ""}" aria-label="Leçon ${n + 1}">${ic}</button></div>`;
      if (n === 2 || n === 11)
        nodes += `<div class="pathmascot" style="${u % 2 ? "left" : "right"}:4%;top:120px">${mascot(u % 2 ? "calm" : "happy")}</div>`;
    }
    const locked = !unitOpen(cid, u);
    const us = unitSteps(cid, u),
      uc = unitComplete(cid, u);
    if (u === 0 || C.units[u - 1].lv !== U.lv)
      units += `<div class="pathsec"><span>Section ${U.lv + 1}</span><h3>${secName(cid, U.lv)}</h3><small>${C.units.filter(x => x.lv === U.lv).length} unités</small></div>`;
    const fd = isFolded(cid, u, ns);
    const pc = Math.round((us / NPU) * 100);
    units += `<section class="unit ${fd ? "folded" : ""}" id="unit${u}"><div class="ubanner" role="button" tabindex="0" aria-expanded="${!fd}" data-fold="${u}" style="background:${locked ? "#8F89AD" : deep(col)}"><div class="ut"><small>Unité ${u + 1} · ${LEVELS[U.lv]}${U.gen ? " · ✨ créée par l'IA" : ""}${uc ? " · ✓ terminée" : us ? ` · ${us}/${NPU} étapes` : U.lv < ((S.place || {})[cid] || 0) ? " · niveau validé au test" : ""}${ns && ns.u === u ? " · 👉 conseillée" : ""}</small><h2>${esc(U.t)}</h2><p>${esc(U.d)}</p><div class="umini"><i style="width:${pc}%"></i></div></div><div class="ubtns"><span class="ufold" aria-hidden="true">⌄</span>${locked && !U.hg && u === C.units.findIndex(x => !x.hg) ? `<button class="guide" data-j="${u}">⏩ Tester mon hangul</button>` : ""}<button class="guide" data-g="${u}">📖 Guide</button></div></div><div class="nodes">${nodes}</div></section>`;
  });
  const nGen = (S.genU[cid] || []).length;
  const lastDone = unitSteps(cid, C.units.length - 1) > 0 || C.units.every((U, u) => unitComplete(cid, u));
  units += `<div class="endtrophy"><div>🏆</div>${C.units.every((U, u) => unitComplete(cid, u)) ? `Toutes les unités de ${C.name} sont terminées, bravo !` : `Fin du parcours ${C.name} : continue !`}${nGen ? `<br><small>${nGen} unité(s) créée(s) par l'IA pour toi</small>` : ""}
  <div class="genbox"><b>✨ La suite, à l'infini</b><p>Dès que tu as commencé la dernière unité, l'IA crée une nouvelle unité complète (phrases, vocabulaire, règles${C.kind === "toeic" ? ", écoute, lecture" : ""}) qui prolonge ce que tu as appris, avec des notions nouvelles.</p><button class="btn ${lastDone ? "goldb" : "ghost"}" id="genU" ${lastDone ? "" : "disabled"}>${lastDone ? "Créer l'unité suivante" : "Disponible dès la dernière unité commencée"}</button></div></div>`;
  const gx = todayXp(),
    gp = Math.min(100, Math.round((gx / S.goal) * 100));
  const side = `<div class="side"><div class="card"><div class="goalrow">${mascot(gp >= 100 ? "happy" : "calm", "jump")}<div style="flex:1"><h3 style="margin-bottom:6px">Objectif du jour</h3><div class="bar"><i style="width:${gp}%"></i><span>${gx} / ${S.goal} XP</span></div></div></div></div>
  <div class="card"><h3>🎯 Quêtes du jour</h3>${QUESTS.map(q => {
    const c = Math.min(q.cur(), q.max()),
      dn = S.q.claimed.includes(q.id);
    return `<div class="quest ${dn ? "done" : ""}"><div class="qi">${dn ? "✅" : q.ic}</div><div class="qb"><div>${q.t()} <span style="color:var(--blue)">+${q.g}💎</span></div><div class="bar pri"><i style="width:${(c / q.max()) * 100}%"></i><span>${c} / ${q.max()}</span></div></div></div>`;
  }).join("")}</div>
  <div class="card"><h3>📈 Progression ${C.name}</h3><div class="bar ok"><i style="width:${Math.round((done / (C.units.length * NPU)) * 100)}%"></i><span>${done} / ${C.units.length * NPU} étapes</span></div><p class="secsub" style="margin:10px 0 0">🧭 Parcours libre : ${cid === "ko" && !hgDone(cid) ? "termine les 4 unités de hangul, puis" : ""} commence n'importe quelle unité avec « Ouvrir ». L'étape 👉 conseillée suit l'ordre du parcours.</p>${ns ? `<button class="btn ghost" id="goNext" style="margin-top:10px">👉 Aller à l'étape conseillée</button>` : ""}<button class="btn ghost" id="placeGo2" style="margin-top:8px">🎯 ${(S.place || {})[cid] != null ? "Refaire le test de niveau" : "Test de niveau"}</button>${(S.place || {})[cid] != null ? `<p class="secsub" style="margin:8px 0 0">${esc(placeEstimate(cid, S.place[cid]))}</p>` : ""}</div></div>`;
  const inst =
    ANDROID && !STANDALONE && !S.set.hideInstall
      ? `<div class="install"><span class="iic">📲</span><div><b>Installe Speakeasy sur ton téléphone</b><br>${INSTALL.ev ? "Une vraie app sur ton écran d'accueil : plein écran, rappels quotidiens et accès hors ligne." : "Dans Chrome, touche le menu <b>⋮</b> puis <b>« Ajouter à l'écran d'accueil »</b> (ou « Installer l'application ») : plein écran, rappels quotidiens et accès hors ligne."}${INSTALL.ev ? `<br><button class="btn" id="instgo" style="margin-top:8px;width:auto;padding:10px 18px">📲 Installer</button>` : ""}</div><button class="iconbtn" id="instx" aria-label="Fermer">✕</button></div>`
      : IOS && !STANDALONE && !S.set.hideInstall
        ? `<div class="install"><span class="iic">📲</span><div><b>Installe Speakeasy sur ton iPhone</b><br>Dans Safari, touche <b>Partager</b> <span class="shareic">⎋</span> puis <b>« Sur l'écran d'accueil »</b>. Tu auras le plein écran, le badge des révisions sur l'icône et les rappels quotidiens. (Pour l'oral au micro direct, ouvre plutôt le site dans Safari.)</div><button class="iconbtn" id="instx" aria-label="Fermer">✕</button></div>`
        : "";
  const placeBan =
    !doneCount(cid) && (S.place || {})[cid] == null
      ? `<div class="placeban"><span>🎯</span><div><b>Tu as déjà des bases en ${esc(C.name)} ?</b><br>Passe le test de niveau (5 min) : ton parcours démarrera au bon endroit.</div><button class="btn goldb" id="placeGo">Faire le test</button></div>`
      : "";
  const foldbar = `<div class="foldbar"><button class="chipbtn" id="unfoldAll">⌄ Tout déplier</button><button class="chipbtn" id="foldAll">⌃ Tout replier</button><button class="chipbtn" id="foldSmart">👉 En cours</button></div>`;
  v.innerHTML = `${inst}<div class="pathgrid"><div>${tabs}${placeBan}${foldbar}${units}</div>${side}</div>`;
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
  v.querySelectorAll("[data-t]").forEach(
    b =>
      (b.onclick = () => {
        S.track[s.id] = b.dataset.t;
        save();
        renderAll();
      }),
  );
  v.querySelectorAll(".node,.startbub").forEach(b => (b.onclick = () => nodeSheet(cid, +b.dataset.u, +b.dataset.n)));
  v.querySelectorAll("[data-fold]").forEach(b => {
    const u = +b.dataset.fold;
    b.onclick = e => {
      if (e.target.closest("button")) return;
      toggleFold(cid, u);
    };
    b.onkeydown = e => {
      if ((e.key === "Enter" || e.key === " ") && e.target === b) {
        e.preventDefault();
        toggleFold(cid, u);
      }
    };
  });
  const setAll = f => {
    const o = {};
    C.units.forEach((U, u) => {
      o[u] = typeof f === "function" ? f(u) : f;
    });
    foldSet(cid, o);
    v.querySelectorAll(".unit").forEach((sec, u) => {
      sec.classList.toggle("folded", o[u]);
      sec.querySelector(".ubanner").setAttribute("aria-expanded", String(!o[u]));
    });
  };
  $("#unfoldAll").onclick = () => setAll(false);
  $("#foldAll").onclick = () => setAll(true);
  $("#foldSmart").onclick = () => {
    foldSet(cid, {});
    setAll(u => isFolded(cid, u, ns));
  };
  v.querySelectorAll("[data-j]").forEach(b => (b.onclick = () => jumpAsk(cid, +b.dataset.j)));
  const gb = $("#genU");
  if (gb) gb.onclick = () => genUnit(cid);
  [$("#placeGo"), $("#placeGo2")].forEach(b => {
    if (b) b.onclick = () => placeIntro(cid);
  });
  const gn = $("#goNext");
  if (gn && ns)
    gn.onclick = () => {
      toggleFold(cid, ns.u, false);
      const el = document.querySelector(`.node[data-u="${ns.u}"][data-n="${ns.n}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  v.querySelectorAll("[data-g]").forEach(b => (b.onclick = () => guide(cid, +b.dataset.g)));
}
export function nodeSheet(cid, u, n, force) {
  const C = COURSES[cid],
    U = C.units[u],
    idx = u * NPU + n;
  beep("tap");
  if (!unitOpen(cid, u)) {
    modal(
      `<div class="mcenter">${mascot("calm")}<h2>Hangul d'abord 🔒</h2><p>Les unités de coréen supposent de savoir lire le hangul. Termine les 4 unités de hangul dans l'ordre (ou passe le test « Tester mon hangul ») et tout le parcours s'ouvrira.</p><button class="btn" onclick="closeModal()">Compris</button></div>`,
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
  if (NODE[n] === "w") {
    const m = modal(
      `<div class="mcenter">${mascot("calm", "jump")}<h2>✍️ Rédaction</h2><p><b style="color:var(--ink)">${esc(U.t)}</b><br>Écris de vrais textes avec ce que tu as appris. ${AI.mode === "local" ? "Sans IA, tu compares avec un modèle et une liste de vérification." : "L'IA corrige ton texte, explique chaque faute et l'ajoute à tes statistiques."}</p><button class="btn big" id="go">${idx < done ? "Nouvelle rédaction (+XP)" : "Commencer"}</button></div>`,
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
    return;
  }
  if (NODE[n] === "ai") {
    const m = modal(
      `<div class="mcenter">${mascot("wow", "dance")}<h2>✨ Révision IA</h2><p><b style="color:var(--ink)">${esc(U.t)}</b><br>Des exercices inédits, générés à chaque fois, pour consolider cette unité et les deux précédentes. Jamais deux fois les mêmes !</p><button class="btn big" id="go">${idx < done ? "Nouvelle révision (+XP)" : "Commencer"}</button></div>`,
    );
    m.querySelector("#go").onclick = () => {
      closeModal();
      startAI(cid, C.units.slice(Math.max(0, u - 2), u + 1), { mode: "lesson", u, n });
    };
    extBtn(m, cid, u, n, idx, done, () =>
      startAI(cid, C.units.slice(Math.max(0, u - 2), u + 1), { mode: "lesson", u, n, ext: true, jh: 3, noRetry: true }),
    );
    return;
  }
  const isCk = n === NPU - 1;
  const m = modal(
    `<div class="mcenter">${mascot(isCk ? "wow" : "happy", "jump")}<h2>${isCk ? "🎁 Bilan de l'unité" : "Leçon " + lessonNo(n) + " sur 12"}</h2><p><b style="color:var(--ink)">${esc(U.t)}</b> · ${LEVELS[U.lv]}<br>${isCk ? "Un test plus long et plus difficile. Réussis-le pour ouvrir le coffre (+20 💎)." : ["Découverte en douceur", "On ajoute l'écoute", "On passe à l'écrit", "Mode difficile : tout à l'écrit et à l'oral"][TIER[n]]}</p><button class="btn big" id="go">${idx < done ? "Revoir (+XP)" : "Commencer"}</button></div>`,
  );
  m.querySelector("#go").onclick = () => {
    closeModal();
    openSession({ mode: "lesson", cid, u, n, exs: buildLesson(cid, u, n) });
  };
  extBtn(m, cid, u, n, idx, done, () =>
    openSession({ mode: "lesson", cid, u, n, ext: true, jh: 3, noRetry: true, exs: buildLesson(cid, u, n, true) }),
  );
}
export function extBtn(m, cid, u, n, idx, done, start) {
  const got = (S.ext[cid] || []).includes(idx);
  const card = m.querySelector(".mcenter") || m;
  const base = isDone(cid, u, n);
  card.insertAdjacentHTML(
    "beforeend",
    `<div class="extbox"><button class="btn extb" id="extgo">🔥 Version extrême${got ? " · 👑 réussie" : ""}</button><small>Tout à l'écrit et à l'oral, plus de pièges, audio seul, 3 erreurs maximum. XP ×2 et une couronne 👑 sur l'étape.${base ? "" : "<br>💡 Conseil : fais d'abord la version de base de cette étape."}</small></div>`,
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
  const m = modal(
    `<h2>📖 ${esc(U.t)}</h2><p>${LEVELS[U.lv]} · ${esc(U.d)}</p>${U.tip ? `<div class="tipbox">💡 ${esc(U.tip)}</div>` : ""}${ph ? `<h3 style="margin-top:14px">Phrases clés</h3><div class="vlist">${ph}</div>` : ""}${vo ? `<h3>Mots utiles</h3><div class="vlist">${vo}</div>` : ""}${ch ? `<h3>Règles en exemples</h3><div class="vlist">${ch}</div>` : ""}<button class="btn" onclick="closeModal()">Fermer</button>`,
  );
  m.querySelectorAll("[data-say]").forEach(b => (b.onclick = () => say(b.dataset.say, lang)));
}
