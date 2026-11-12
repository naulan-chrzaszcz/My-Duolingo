// Navigation par hash et rendu des écrans
import { COURSES, SECTIONS } from "../content/index.js";
import { ACC, S, curAcc, save } from "../core/accounts.js";
import { doneCount } from "../core/progress.js";
import { $, NPU, dkey, esc } from "../core/util.js";
import { regen } from "../core/xp.js";
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
  regen();
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
export function renderTop() {
  const s = curSec();
  $("#accBtn").innerHTML = avatar(curAcc());
  $("#secBtn").innerHTML =
    `<span style="font-size:20px">${s.flag}</span><span>${s.name}</span><span style="color:var(--muted)">▾</span>`;
  const st = $("#stats");
  const streakToday = S.lastDay === dkey();
  const inf = S.infUntil > Date.now();
  st.innerHTML = `<button class="stat streak ${streakToday ? "" : "off"}" id="tStreak" title="Série">🔥 ${S.streak}</button><button class="stat gem" id="tGem" title="Gemmes">💎 ${S.gems}</button>`;
  $("#tGem").onclick = () => {
    location.hash = "boutique";
  };
  $("#tStreak").onclick = streakInfo;
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
export function heartInfo() {
  regen();
  const inf = S.infUntil > Date.now();
  const next = S.hearts >= 5 ? 0 : Math.max(0, Math.ceil((S.hTs + 1200000 - Date.now()) / 60000));
  const m = modal(
    `<div class="mcenter"><div style="font-size:60px">❤️</div><h2>${inf ? "Cœurs illimités" : S.hearts + " / 5 cœurs"}</h2><p>${inf ? `Encore ${Math.ceil((S.infUntil - Date.now()) / 60000)} min de cœurs illimités.` : S.hearts >= 5 ? "Tu as tous tes cœurs. Tu perds un cœur à chaque erreur dans le parcours." : `Prochain cœur dans ${next} min. Chaque séance d'entraînement rend aussi 1 ❤️.`}</p>${!inf && S.hearts < 5 ? `<button class="btn goldb" id="hr" ${S.gems < 30 ? "disabled" : ""}>Recharger · 30 💎</button>` : ""}<button class="btn ghost" onclick="closeModal()">Fermer</button></div>`,
  );
  const hr = m.querySelector("#hr");
  if (hr)
    hr.onclick = () => {
      S.gems -= 30;
      S.hearts = 5;
      save();
      closeModal();
      renderTop();
      toast("❤️ Cœurs rechargés !");
    };
}
export function sectionPicker() {
  const html = `<h2>Que veux-tu travailler ?</h2><p>Chaque section a son propre parcours et ses entraînements.</p><div class="choices">${SECTIONS.map(
    s => {
      const tot = s.tracks.reduce((a, c) => a + COURSES[c].units.length * NPU, 0),
        dn = s.tracks.reduce((a, c) => a + doneCount(c), 0);
      return `<button data-s="${s.id}" class="${s.id === S.sec ? "sel" : ""}"><span class="e">${s.flag}</span><span>${s.name}<small>${s.id === "en" ? "Quotidien · Rédaction pro · TOEIC" : s.id === "fr" ? "Orthographe & grammaire (type Projet Voltaire)" : "Du débutant aux pièges de 맞춤법"} — ${Math.round((dn / tot) * 100)} %</small></span></button>`;
    },
  ).join("")}</div>`;
  const m = modal(html);
  m.querySelectorAll("[data-s]").forEach(
    b =>
      (b.onclick = () => {
        S.sec = b.dataset.s;
        save();
        closeModal();
        renderAll();
      }),
  );
}
