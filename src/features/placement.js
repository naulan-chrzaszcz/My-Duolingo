// Test de niveau adaptatif
import { COURSES, LEVELS, REAL_PH, SECTIONS } from "../content/index.js";
import { S, save } from "../core/accounts.js";
import { FULL, hgIdx, nextStep, syncProg } from "../core/progress.js";
import { esc, shuffle } from "../core/util.js";
import { addToday } from "../core/xp.js";
import { ctxFor, make } from "../exercises/generate.js";
import { L, closeLesson, openSession } from "../lesson/engine.js";
import { foldSet } from "../screens/path.js";
import { mascot } from "../ui/mascot.js";
import { renderAll } from "../ui/router.js";
import { closeModal, confetti, modal, toast } from "../ui/ui.js";

// ===================== TEST DE NIVEAU (adaptatif, 4 paliers) =====================
export const PLACE_N = 6,
  PLACE_OK = 4;
export const PLACE_T = {
  trans: ["mc", "choice", "listen", "type", "tilesRev", "mcw"],
  toeic: ["photo", "part2", "choice", "conv", "read", "choice"],
  volt: ["spot", "choice", "spot", "dictee", "choice", "spot"],
};
export function placeEstimate(cid, p) {
  const k = COURSES[cid].kind;
  if (k === "toeic")
    return [
      "Score TOEIC estimé : moins de 400",
      "Score TOEIC estimé : 400 à 600",
      "Score TOEIC estimé : 600 à 780",
      "Score TOEIC estimé : 780 à 900",
      "Score TOEIC estimé : plus de 900",
    ][p];
  if (k === "volt")
    return [
      "Certificat Voltaire estimé : moins de 300 points",
      "Certificat Voltaire estimé : 300 à 500 (niveau Technique)",
      "Certificat Voltaire estimé : 500 à 700 (niveau Professionnel)",
      "Certificat Voltaire estimé : 700 à 900 (niveau Affaires)",
      "Certificat Voltaire estimé : plus de 900 (niveau Expert)",
    ][p];
  if (cid === "ko")
    return [
      "Niveau estimé : grand débutant (on commence par le hangul)",
      "Niveau estimé : TOPIK I · niveau 1",
      "Niveau estimé : TOPIK I · niveau 2",
      "Niveau estimé : TOPIK II · niveaux 3-4",
      "Niveau estimé : TOPIK II · niveau 5 ou plus",
    ][p];
  return "Niveau estimé (CECRL) : " + ["A1 · débutant", "A2", "B1", "B2", "C1 ou plus"][p];
}
export function placeStageExs(cid, k) {
  const C = COURSES[cid];
  const base = C.units.filter(U => !U.gen && U.lv === k);
  if (!base.length) return [];
  if (cid === "ko" && k === 0) {
    const hg = C.units.filter(U => U.hg),
      rest = base.filter(U => !U.hg);
    const ch = ctxFor(cid, hg);
    ch.allHj = hg.flatMap(x => x.hj || []);
    const cr = ctxFor(cid, rest.length ? rest : hg);
    return ["readw", "hear", "readw"]
      .map(t => make(t, ch))
      .concat(["mc", "listen", "choice"].map(t => make(t, cr)))
      .filter(Boolean);
  }
  const ctx = ctxFor(cid, cid === "ko" ? base.filter(U => !U.hg) : base, { hideP2: true });
  if (C.kind === "toeic") ctx.ph = shuffle(REAL_PH.slice());
  return (PLACE_T[C.kind] || PLACE_T.trans)
    .map(t => make(t, ctx))
    .filter(Boolean)
    .slice(0, PLACE_N);
}
export function placeIntro(cid) {
  const C = COURSES[cid];
  const prev = S.place && S.place[cid] != null && S.placeTs && S.placeTs[cid];
  const m = modal(
    `<div class="mcenter">${mascot("wow", "jump")}<h2>🎯 Test de niveau · ${C.icon} ${esc(C.name)}</h2><p>4 paliers de ${PLACE_N} questions, du niveau Facile au niveau Expert. Avec ${PLACE_OK} bonnes réponses sur ${PLACE_N}, tu passes au palier suivant ; sinon le test s'arrête. Environ 5 minutes, sans pénalité.</p><p style="font-size:14px">Ensuite, ton étape conseillée démarre à ton niveau. Les unités en dessous restent ouvertes si tu veux les revoir.${prev ? "<br>Dernier résultat : " + esc(placeEstimate(cid, S.place[cid])) : ""}</p><button class="btn big" id="pgo">Commencer le test</button><button class="btn ghost" onclick="closeModal()">Plus tard</button></div>`,
  );
  m.querySelector("#pgo").onclick = () => {
    closeModal();
    placeRun(cid, 0, []);
  };
}
export function placeRun(cid, k, hist) {
  const exs = placeStageExs(cid, k);
  if (!exs.length) return placeDone(cid, k, hist);
  openSession({ mode: "place", cid, exs: shuffle(exs), noRetry: true, stage: k, hist });
  toast(`🎯 Palier ${k + 1}/4 · ${LEVELS[k]}`);
}
export function placeStage() {
  const cid = L.cid,
    k = L.stage,
    hist = L.hist.concat([[L.correct, L.total]]),
    ok = L.correct >= Math.min(PLACE_OK, L.total);
  closeLesson();
  if (ok && k < 3) {
    const m = modal(
      `<div class="mcenter">${mascot("happy", "jump")}<h2>Palier ${LEVELS[k]} validé ✅</h2><p>${hist[k][0]}/${hist[k][1]} bonnes réponses. On monte d'un cran : niveau ${LEVELS[k + 1]}.</p><button class="btn big" id="pnext">Palier suivant</button><button class="btn ghost" id="pstop">M'arrêter ici</button></div>`,
      "",
      true,
    );
    m.querySelector("#pnext").onclick = () => {
      closeModal();
      placeRun(cid, k + 1, hist);
    };
    m.querySelector("#pstop").onclick = () => {
      closeModal();
      placeDone(cid, k + 1, hist);
    };
    return;
  }
  placeDone(cid, ok ? 4 : k, hist);
}
export function placeDone(cid, p, hist) {
  const C = COURSES[cid];
  S.place = S.place || {};
  S.place[cid] = p;
  S.placeTs = S.placeTs || {};
  S.placeTs[cid] = Date.now();
  if (cid === "ko" && p >= 1) {
    S.dn.ko = S.dn.ko || {};
    hgIdx("ko").forEach(i => {
      S.dn.ko[i] = FULL;
    });
  }
  syncProg(cid);
  const tot = hist.reduce((a, h) => a + h[0], 0),
    q = hist.reduce((a, h) => a + h[1], 0);
  S.xp += 10;
  addToday(10);
  save();
  const ns = nextStep(cid);
  const start = ns
    ? `Ton étape conseillée : « ${esc(C.units[ns.u].t)} » (${LEVELS[C.units[ns.u].lv]}).`
    : "Tout le parcours t'attend !";
  const m = modal(
    `<div class="mcenter">${mascot(p >= 2 ? "wow" : "happy", "dance")}<h2>${p >= 4 ? "Niveau Expert 🏆" : p === 0 ? "On part des bases 🌱" : "Niveau " + LEVELS[p - 1] + " validé 🎉"}</h2><p style="color:var(--ink);font-weight:800">${esc(placeEstimate(cid, p))}</p><div class="placebars">${[0, 1, 2, 3].map(i => `<div class="${i < hist.length ? (hist[i][0] >= Math.min(PLACE_OK, hist[i][1]) ? "ok" : "ko") : "na"}"><b>${LEVELS[i]}</b><small>${i < hist.length ? hist[i][0] + "/" + hist[i][1] : "—"}</small></div>`).join("")}</div><p>${tot}/${q} bonnes réponses · +10 XP<br>${start}</p><p style="font-size:13px">Estimation indicative, à partir des contenus de l'app. Tes erreurs du test alimentent déjà le coach et tes statistiques.</p><button class="btn big" id="pok">Voir mon parcours</button></div>`,
    "",
    true,
  );
  m.querySelector("#pok").onclick = () => {
    closeModal();
    confetti(70);
    foldSet(cid, {});
    const t = COURSES[cid];
    const sec = SECTIONS.find(x => x.tracks.includes(cid));
    if (sec) {
      S.sec = sec.id;
      if (sec.tracks.length > 1) S.track[sec.id] = cid;
    }
    save();
    location.hash = "parcours";
    renderAll();
    setTimeout(() => {
      const n = nextStep(cid);
      if (n) {
        const el = document.querySelector(`.node[data-u="${n.u}"][data-n="${n.n}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 350);
  };
}
