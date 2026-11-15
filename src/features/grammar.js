// Notions de grammaire : choix d'une notion ou d'une règle, mémo, séance de phrases générées
import { ic } from "../ui/icons.js";
import { COURSES } from "../content/index.js";
import { esc, shuffle } from "../core/util.js";
import { ctxFor, make } from "../exercises/generate.js";
import { drillCid, drillRate, drillSetFor, drillSub, drillSubs, dtx, genItem, genPair } from "../exercises/drills.js";
import { openSession } from "../lesson/engine.js";
import { beep } from "../services/speech.js";
import { closeModal, modal } from "../ui/ui.js";

const rateCls = r => (r === null ? "" : r < 70 ? "bad" : r < 85 ? "mid" : "good");
const rateTxt = r => (r === null ? "—" : r + " %");

/** Fenêtre de choix : les 4 notions (temps, liaison, modaux, prépositions/particules) et leurs règles. */
export function notionPicker(cid) {
  const set = drillSetFor(cid);
  if (!set) return;
  const m = modal(
    `<h2 class="hi">${ic("layers", 22, "", 2.4)}Notions de grammaire</h2><p>Les phrases changent à chaque séance : impossible de deviner la réponse par cœur. Touche une notion pour t'entraîner sur toutes ses règles, ou une règle pour lire son mémo.</p>
  <div class="ulist nlist">${set.notions
    .map(n => {
      const r = drillRate(n.subs.map(s => s.id));
      return `<button class="urow nrow" data-n="${n.id}"><span class="un">${n.ic}</span><span class="ut"><b>${esc(dtx(n.t))}</b><small>${esc(dtx(n.d))}</small></span><span class="ur ${rateCls(r)}">${rateTxt(r)}</span></button><div class="nsubs">${n.subs
        .map(s => {
          const rs = drillRate([s.id]);
          return `<button class="nsub" data-s="${s.id}"><span>💡 ${esc(dtx(s.t))}</span><span class="ur ${rateCls(rs)}">${rateTxt(rs)}</span></button>`;
        })
        .join("")}</div>`;
    })
    .join("")}</div>
  <button class="btn" id="nmix">🔀 Tout mélanger</button><button class="btn ghost" onclick="closeModal()">Fermer</button>`,
    "nmodal",
  );
  m.querySelectorAll("[data-n]").forEach(
    b =>
      (b.onclick = () => {
        beep("tap");
        closeModal();
        startDrills(cid, b.dataset.n);
      }),
  );
  m.querySelectorAll("[data-s]").forEach(
    b =>
      (b.onclick = () => {
        beep("tap");
        ruleCard(cid, b.dataset.s);
      }),
  );
  m.querySelector("#nmix").onclick = () => {
    beep("tap");
    closeModal();
    startDrills(cid);
  };
}

/** Mémo d'une règle, avec un exemple tiré au hasard, puis séance sur cette seule règle. */
export function ruleCard(cid, subId) {
  const x = drillSub(subId);
  if (!x) return;
  const { sub, set } = x;
  const it = genItem(set, sub);
  const ex = it ? esc(it[0]).replace("___", `<b class="dans">${esc(it[1][0])}</b>`) : "";
  const r = drillRate([sub.id]);
  const m = modal(
    `<h2 class="hi">${ic("bulb", 22, "", 2.4)}${esc(dtx(sub.t))}</h2><p>${esc(dtx(sub.memo))}</p>
  <ul class="drules">${sub.r.map(t => `<li>${esc(dtx(t))}</li>`).join("")}</ul>
  ${ex ? `<div class="tipbox dex" lang="${set.lang}">${ex}</div>` : ""}
  <p class="micnote" style="text-align:left;margin:4px 0 0">${r === null ? "Pas encore travaillée." : `Ta réussite sur cette règle : ${r} %`}</p>
  <button class="btn" id="dgo">S'entraîner sur cette règle</button><button class="btn ghost" id="dback">← Toutes les notions</button>`,
    "nmodal",
  );
  m.querySelector("#dgo").onclick = () => {
    beep("tap");
    closeModal();
    startDrills(cid, sub.id);
  };
  m.querySelector("#dback").onclick = () => notionPicker(cid);
}

// Déroulé d'une séance : QCM, mot à écrire, faute à trouver, phrase à reconstituer
const PLAN = {
  ko: ["choice", "choice", "fill", "choice", "choice", "fill", "choice", "choice", "fill", "choice", "fill", "choice"],
  def: ["choice", "choice", "fill", "spot", "choice", "tiles", "fill", "choice", "spot", "choice", "fill", "tiles"],
};

/** Fabrique les exercices d'une séance de notions (une notion, une règle, ou tout si pick est vide). */
export function drillExercises(cid, pick, n = 12) {
  const set = drillSetFor(cid);
  if (!set) return [];
  const subs = drillSubs(set, pick);
  if (!subs.length) return [];
  const course = drillCid(set);
  const ctx = ctxFor(course, [], { noDrill: true });
  const plan = (set.lang.startsWith("ko") ? PLAN.ko : PLAN.def).slice(0, n);
  let order = shuffle(subs);
  let k = 0;
  const nextSub = () => {
    if (k >= order.length) {
      order = shuffle(subs);
      k = 0;
    }
    return order[k++];
  };
  const exs = [];
  for (const t of plan) {
    let ex = null;
    for (let tries = 0; tries < subs.length + 2 && !ex; tries++) {
      const sub = nextSub();
      if (t === "tiles") {
        const p = genPair(set, sub);
        if (!p) continue;
        ctx.p = [p];
        ctx.last = null;
        ex = make("tiles", ctx);
      } else {
        const it = genItem(set, sub);
        if (!it) continue;
        if (t === "fill" && !it._h) continue;
        ctx.c = [it];
        ctx.cs = [it];
        ctx.ptr.c = ctx.ptr.cs = 0;
        ex = make(t, ctx);
      }
      if (ex && !ex._sub) ex._sub = sub.id;
    }
    if (!ex) {
      // aucune règle de la sélection ne convient à ce type d'exercice : un QCM à la place
      const sub = nextSub();
      const it = genItem(set, sub);
      if (it) {
        ctx.c = [it];
        ctx.ptr.c = 0;
        ex = make("choice", ctx);
        if (ex) ex._sub = sub.id;
      }
    }
    if (ex) exs.push(ex);
  }
  return exs;
}
export function startDrills(cid, pick) {
  const set = drillSetFor(cid);
  if (!set) return;
  const course = drillCid(set);
  const exs = drillExercises(cid, pick);
  openSession({ mode: "train", cid: course, exs, keepDup: true }); // une règle se travaille en répétant : on garde les reprises
}
/** Le cours d'une section a-t-il des notions de grammaire ? */
export const hasNotions = cid => !!drillSetFor(cid) && !!COURSES[drillCid(drillSetFor(cid))];
