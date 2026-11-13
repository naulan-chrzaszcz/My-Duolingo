// Navigation par hash et rendu des écrans
import { COURSES, SECTIONS } from "../content/index.js";
import { ACC, S, curAcc, save } from "../core/accounts.js";
import { nextStep, unitComplete } from "../core/progress.js";
import { todayXp } from "../core/xp.js";
import { placeIntro } from "../features/placement.js";
import { $, dkey, esc } from "../core/util.js";
import { COURSE_IC, flagSvg, ic } from "./icons.ts";
import { bankDue } from "../features/word-bank.js";
import { dueCount } from "../lesson/engine.js";
import { renderLeague } from "../screens/league.js";
import { renderPath } from "../screens/path.js";
import { renderProfile } from "../screens/profile.js";
import { renderShop } from "../screens/shop.js";
import { renderStats } from "../screens/stats.js";
import { renderStories } from "../screens/stories.js";
import { renderTrain } from "../screens/training.js";
import { closeModal, modal, toast } from "./ui.js";

// ===================== NAVIGATION & RENDU =====================
export let VIEW = "parcours";
export const curSec = () => SECTIONS.find(s => s.id === S.sec) || SECTIONS[0];
export const curCid = () => {
  const s = curSec();
  return s.tracks.includes(S.track[s.id]) ? S.track[s.id] : s.tracks[0];
};
export function route() {
  const h = (location.hash || "").slice(1);
  VIEW = ["parcours", "entrainement", "histoires", "ligue", "boutique", "profil", "stats"].includes(h) ? h : "parcours";
  renderAll();
}
export function updateBadge() {
  try {
    if (!navigator.setAppBadge || !ACC.current) return;
    const n = SECTIONS.reduce((a, x) => a + dueCount(x.tracks) + bankDue(x.id), 0);
    const todo = n || (S.lastDay === dkey() ? 0 : 1);
    if (todo) navigator.setAppBadge(todo).catch(() => {});
    else navigator.clearAppBadge().catch(() => {});
  } catch (e) {}
}
export function renderAll() {
  renderTop();
  updateBadge();
  document
    .querySelectorAll("#bottomnav a")
    .forEach(a => a.classList.toggle("on", a.dataset.v === (VIEW === "stats" ? "profil" : VIEW)));
  const v = $("#view");
  if (VIEW === "parcours") renderPath(v);
  else if (VIEW === "entrainement") renderTrain(v);
  else if (VIEW === "histoires") renderStories(v);
  else if (VIEW === "ligue") renderLeague(v);
  else if (VIEW === "boutique") renderShop(v);
  else if (VIEW === "stats") renderStats(v);
  else renderProfile(v);
}
export const safeColor = c => (/^#[0-9a-fA-F]{3,8}$/.test(String(c || "")) ? c : "#7C4DFF");
export const safeEmoji = e =>
  esc(
    Array.from(String(e || "🐯"))
      .slice(0, 7)
      .join(""),
  );
export function avatar(a, size = 34) {
  return a
    ? `<span class="avatar" style="background:${safeColor(a.color)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.58)}px">${safeEmoji(a.emoji)}</span>`
    : "";
}
/** Unités terminées / total d'une section (toutes ses formations). */
export function secUnits(sec) {
  let d = 0,
    t = 0;
  for (const c of sec.tracks) {
    const C = COURSES[c];
    if (!C) continue;
    t += C.units.length;
    C.units.forEach((u, i) => {
      if (unitComplete(c, i)) d++;
    });
  }
  return { d, t };
}
export function renderTop() {
  const s = curSec();
  $("#accBtn").innerHTML = avatar(curAcc());
  const tb = $("#topbar");
  if (tb) document.documentElement.style.setProperty("--toph", tb.offsetHeight + "px");
  const { d } = secUnits(s);
  const b = $("#secBtn");
  b.innerHTML = `${flagSvg(s.id, 34, 23, 6)}<span class="tnum">${d}</span>`;
  b.title = s.name;
  const st = $("#stats");
  const streakToday = S.lastDay === dkey();
  const tx = todayXp(),
    goal = S.goal || 20;
  st.innerHTML = `<button class="stat streak ${streakToday ? "" : "off"}" id="tStreak" title="Série">${ic("flame", 24, "", 2.4, "currentColor")}<span>${S.streak}</span></button><button class="stat gem" id="tGem" title="Gemmes">${ic("gem", 24, "", 2.2, "currentColor")}<span>${S.gems}</span></button><button class="stat xpg ${tx >= goal ? "met" : ""}" id="tXp" title="Objectif du jour">${ic("bolt", 24, "", 2.2, "currentColor")}<span>${tx}</span></button>`;
  $("#tGem").onclick = () => {
    location.hash = "boutique";
  };
  $("#tStreak").onclick = () => streakInfo();
  $("#tXp").onclick = () => streakInfo("goal");
}
export function streakInfo() {
  const ds = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dkey(d);
    ds.push({ l: "DLMMJVS"[d.getDay()], on: (S.week[k] || 0) > 0 });
  }
  const m = modal(
    `<div class="mcenter"><div class="bigflame" style="font-size:70px">🔥</div><h2>${S.streak} jour${S.streak > 1 ? "s" : ""} de série</h2><p>${S.lastDay === dkey() ? "Série prolongée aujourd'hui, bravo !" : "Termine une leçon aujourd'hui pour prolonger ta série."}</p><div class="wdots" style="justify-content:center">${ds.map(d => `<div><i class="${d.on ? "on" : ""}">${d.on ? "✓" : ""}</i>${d.l}</div>`).join("")}</div><p>❄️ Gels de série équipés : <b style="color:var(--ink)">${S.freeze}/2</b><br>Un gel protège ta série si tu rates une journée.</p><button class="btn" id="sgo">${S.freeze < 2 ? "Acheter un gel (50 💎)" : "Fermer"}</button></div>`,
  );
  m.querySelector("#sgo").onclick = () => {
    closeModal();
    if (S.freeze < 2) location.hash = "boutique";
  };
}
/** Menu déroulant du choix de langue (façon maquette « Choix de la langue »). */
export function sectionPicker() {
  const draw = () => {
    const s = SECTIONS.find(x => x.id === pick) || curSec();
    const { d, t } = secUnits(s);
    const pct = t ? Math.round((d / t) * 100) : 0;
    const cur = s.tracks.includes(S.track[s.id]) ? S.track[s.id] : s.tracks[0];
    const ns = nextStep(cur);
    const nu = ns ? COURSES[cur].units[ns.u] : null;
    const tiles = SECTIONS.map(
      x =>
        `<button data-s="${x.id}" class="ldflag ${x.id === pick ? "sel" : ""}" aria-pressed="${x.id === pick}"><span class="ldfr">${flagSvg(x.id, 92, 62, 13)}</span><span class="ldn">${esc(x.name)}</span></button>`,
    ).join("");
    const tracks = s.tracks
      .map(c => {
        const [k, col, dk] = COURSE_IC[c] || ["book", "#7C4DFF", "#5A30D8"];
        const on = c === curCid();
        return `<button data-t="${c}" class="ldtr"><span class="ldti" style="background:${col};box-shadow:0 5px 0 ${dk}">${ic(k, 36, "", 2.6)}</span>${on ? `<span class="ldcur">En cours</span>` : ""}<span class="ldtn">${esc(COURSES[c].name)}</span></button>`;
      })
      .join("");
    m.innerHTML = `<div class="ldflags">${tiles}</div>
<div class="ldcard"><div class="ldprog"><b>${d}</b><span class="ldbar"><i style="width:${pct}%"></i></span><b>${t}</b></div>
<div class="ldtxt"><span>Unités terminées :</span> <span>${d} / ${t}</span></div>
${nu ? `<div class="ldnext"><span>Prochaine :</span> <span>${esc(nu.t || "")}</span></div>` : ""}
<button class="ldlink" id="ldPlace">Test de niveau</button></div>
<h2 class="ldh">Cours de cette langue</h2><div class="ldtracks">${tracks}</div>`;
    m.querySelectorAll("[data-s]").forEach(
      b =>
        (b.onclick = () => {
          pick = b.dataset.s;
          S.sec = pick;
          save();
          renderAll();
          draw();
        }),
    );
    m.querySelectorAll("[data-t]").forEach(
      b =>
        (b.onclick = () => {
          S.sec = s.id;
          S.track[s.id] = b.dataset.t;
          save();
          closeModal();
          location.hash = "parcours";
          renderAll();
        }),
    );
    m.querySelector("#ldPlace").onclick = () => {
      S.sec = s.id;
      save();
      closeModal();
      renderAll();
      placeIntro(s.tracks.includes(S.track[s.id]) ? S.track[s.id] : s.tracks[0]);
    };
  };
  let pick = curSec().id;
  const m = modal("", "langdrop");
  draw();
  const b = $("#secBtn");
  if (b) {
    const r = b.getBoundingClientRect();
    m.style.top = Math.round(r.bottom + 8) + "px";
  }
}
