// Écran Série (v28) : onglets « Ma série » et « Objectif du jour », calendrier du mois, gels, paliers de série
import { S, save } from "../core/accounts.js";
import { dkey } from "../core/util.js";
import { todayXp } from "../core/xp.js";
import { shareProgress } from "../features/coach.js";
import { UI } from "../i18n/locale.js";
import { ic } from "../ui/icons.ts";
import { closeModal, modal } from "../ui/ui.js";

/** Paliers de série : [jours, gemmes offertes]. */
export const MILESTONES = [
  [7, 10],
  [14, 20],
  [30, 40],
  [50, 60],
];
/** À appeler quand la série vient d'augmenter : offre les gemmes du palier atteint (une fois par série). */
export function streakMilestone() {
  if (!Array.isArray(S.smil)) S.smil = [];
  const m = MILESTONES.find(([d]) => d === S.streak);
  if (!m || S.smil.includes(m[0])) return 0;
  S.smil.push(m[0]);
  S.gems += m[1];
  return m[1];
}
/** Série remise à zéro : les paliers pourront être regagnés. */
export function streakReset() {
  S.smil = [];
}

const LOC = UI === "en" ? "en-GB" : UI === "ko" ? "ko-KR" : "fr-FR";
const WD = UI === "en" ? "MTWTFSS" : UI === "ko" ? "월화수목금토일" : "LMMJVSD";
export const FLAME = `<svg class="sflame" width="132" height="150" viewBox="0 0 132 150" aria-hidden="true"><defs><linearGradient id="sfl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC83D"/><stop offset=".55" stop-color="#FF7A3C"/><stop offset="1" stop-color="#E8434F"/></linearGradient><radialGradient id="sglow" cx=".5" cy=".7" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><ellipse cx="66" cy="140" rx="40" ry="8" fill="#FFE1D2" opacity=".7"/><path d="M66 8c10 22 52 40 52 82a52 52 0 0 1-104 0c0-20 9-34 20-44 0 14 6 24 16 26-2-24 4-46 16-64z" fill="url(#sfl)" stroke="#C2410C" stroke-width="6" stroke-linejoin="round"/><path d="M40 70c4-12 12-18 18-20-4 10-4 18 0 26" fill="none" stroke="#FFE7A8" stroke-width="7" stroke-linecap="round" opacity=".8"/><circle cx="66" cy="100" r="30" fill="url(#sglow)"/><path d="M66 78c6 9 15 14 15 25a15 15 0 0 1-30 0c0-11 9-16 15-25z" fill="#fff"/></svg>`;
// v32 : objectifs alignés sur l'XP réel d'une leçon (150 à 190 XP)
export const GOALS = [
  [100, "Tranquille"],
  [200, "Normal"],
  [400, "Sérieux"],
  [600, "Intense"],
];
const day = d => dkey(d);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
/** Jours pratiqués (XP > 0) et jours protégés par un gel. */
const practiced = k => (S.week[k] || 0) > 0;
const frozen = k => (S.frz || []).includes(k);

function calendar(y, mo) {
  const first = new Date(y, mo, 1, 12);
  const nd = new Date(y, mo + 1, 0, 12).getDate();
  const lead = (first.getDay() + 6) % 7; // lundi en premier
  const tk = dkey();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= nd; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  // jour où le prochain palier sera atteint si la série continue
  const next = MILESTONES.find(([m]) => m > S.streak);
  let goalK = "";
  const alive = S.lastDay === tk || (S.lastDay && day(addDays(new Date(), -1)) === S.lastDay);
  if (next && alive && S.streak > 0) goalK = day(addDays(new Date(), next[0] - S.streak - (S.lastDay === tk ? 0 : 1)));
  let rows = "",
    nPr = 0,
    nFr = 0;
  for (let r = 0; r < cells.length / 7; r++) {
    const row = cells.slice(r * 7, r * 7 + 7);
    const on = row.map(d => {
      if (!d) return false;
      const k = day(new Date(y, mo, d, 12));
      return practiced(k) || frozen(k);
    });
    let pills = "",
      a = -1,
      kk = 0;
    for (let i = 0; i <= 7; i++) {
      if (i < 7 && on[i]) {
        if (a < 0) a = i;
      } else if (a >= 0) {
        pills += `<span class="spill" style="left:calc(${((a * 100) / 7).toFixed(3)}% + 4px);width:calc(${(((i - a) * 100) / 7).toFixed(3)}% - 8px);animation-delay:${(r * 0.12 + kk++ * 0.05).toFixed(2)}s"></span>`;
        a = -1;
      }
    }
    const cs = row
      .map(d => {
        if (!d) return "<span></span>";
        const k = day(new Date(y, mo, d, 12));
        if (frozen(k) && !practiced(k)) {
          nFr++;
          return `<span class="scd"><span class="sfz">${d}<i>${ic("snow", 13, "", 2.6)}</i></span></span>`;
        }
        if (practiced(k)) nPr++;
        if (k === tk) return `<span class="scd"><span class="stoday ${practiced(k) ? "on" : ""}">${d}</span></span>`;
        if (practiced(k)) return `<span class="scd on">${d}</span>`;
        if (k === goalK)
          return `<span class="scd"><span class="sgoal">${ic("flag", 18, "", 2.6)}<b>${d}</b></span></span>`;
        return `<span class="scd">${d}</span>`;
      })
      .join("");
    rows += `<div class="scrow">${pills}${cs}</div>`;
  }
  return { rows, nPr, nFr };
}

function tabStreak(st) {
  const { y, mo } = st;
  const now = new Date();
  const isNow = y === now.getFullYear() && mo === now.getMonth();
  const min = addDays(now, -400);
  const canPrev = new Date(y, mo, 1) > new Date(min.getFullYear(), min.getMonth(), 1);
  const { rows, nPr, nFr } = calendar(y, mo);
  const mname = new Intl.DateTimeFormat(LOC, { month: "long", year: "numeric" }).format(new Date(y, mo, 1, 12));
  const next = MILESTONES.find(([m]) => m > S.streak);
  const marks = [1, ...MILESTONES.map(m => m[0])];
  let mil = "";
  marks.forEach((m, i) => {
    const done = S.streak >= m,
      nx = next && next[0] === m;
    mil += `<span class="smil ${done ? "done" : nx ? "next" : ""}"><i></i><b>${m}</b></span>`;
    if (i < marks.length - 1) {
      const n2 = marks[i + 1];
      const f = S.streak >= n2 ? 1 : S.streak <= m ? 0 : (S.streak - m) / (n2 - m);
      mil += `<span class="smbar"><i style="width:${Math.round(f * 100)}%;animation-delay:${(0.3 + i * 0.15).toFixed(2)}s"></i></span>`;
    }
  });
  const today = S.lastDay === dkey();
  const fz = S.freeze || 0;
  return `<div class="shero"><div><div class="snum">${S.streak}</div><div class="slbl">${S.streak > 1 ? "jours d'affilée !" : S.streak === 1 ? "jour de série !" : "Aucune série en cours"}</div><div class="ssub">${today ? "Série prolongée aujourd'hui, bravo !" : "Termine une leçon aujourd'hui pour prolonger ta série."}</div></div>${FLAME}</div>
<div class="skb sfreeze"><span class="sfic">${ic("snow", 28, "", 2.4)}</span><div><p>Une séance par jour garde ta série. Un gel de série la protège si tu rates un jour.</p><p class="sfcount"><span>Gels de série équipés :</span> <b>${fz} / 2</b></p>${fz < 2 ? `<button class="slink" id="sBuy">Acheter un gel (50 💎)</button>` : ""}</div></div>
<div class="smonth"><h2 class="notr">${mname}</h2><div><button class="snav" id="sPrev" aria-label="Mois précédent" ${canPrev ? "" : "disabled"}>${ic("left", 24, "", 3)}</button><button class="snav" id="sNext" aria-label="Mois suivant" ${isNow ? "disabled" : ""}>${ic("chevr", 24, "", 3)}</button></div></div>
<div class="sstats"><div class="skb"><span class="sdot o">${ic("check", 18, "", 3)}</span><div><b>${nPr}</b><small>Jours d'entraînement</small></div></div><div class="skb"><span class="sdot b">${ic("snow", 17, "", 2.6)}</span><div><b>${nFr}</b><small>Gels utilisés</small></div></div></div>
<div class="skb scal"><div class="swd notr">${Array.from(WD)
    .map(x => `<span>${x}</span>`)
    .join("")}</div>${rows}</div>
<h2 class="sh2">Objectif de série</h2>
<div class="skb smilbox"><div class="smils">${mil}</div><p>${next ? `<span>Encore ${next[0] - S.streak} jour(s) pour atteindre ${next[0]} jours d'affilée :</span> <b>+${next[1]} 💎</b>` : "Tous les paliers sont atteints : quelle régularité !"}</p></div>
<button class="btn sshare" id="sShare2">${ic("share", 22, "", 2.6)}<span>Partager ma série</span></button>`;
}

function tabGoal(st) {
  const tx = todayXp(),
    g = S.goal || 100;
  const pct = Math.min(1, tx / g);
  const C = 339.3;
  const mon = addDays(new Date(), -((new Date().getDay() + 6) % 7));
  const tk = dkey();
  const vals = Array.from({ length: 7 }, (_, i) => {
    const k = day(addDays(mon, i));
    return [WD[i], S.week[k] || 0, k === tk];
  });
  const mx = Math.max(g, ...vals.map(v => v[1]));
  const lvl = (GOALS.find(x => x[0] === g) || [g, ""])[1];
  return `<div class="sgoalhead"><div class="sring"><svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="54" fill="none" stroke="var(--soft)" stroke-width="16"/><circle class="sring2" cx="66" cy="66" r="54" fill="none" stroke="${pct >= 1 ? "#22B573" : "#7C4DFF"}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 66 66)"/></svg><div><b>${tx}</b><small>sur ${g} XP</small></div></div>
<div><h2>Objectif du jour</h2><p>${tx >= g ? "Objectif atteint, bravo ! Tout XP en plus compte pour la ligue." : `<span>Encore</span> <b>${g - tx} XP</b> <span>pour atteindre ton objectif.</span>`}</p></div></div>
<h2 class="sh2">Cette semaine</h2>
<div class="skb sweek">${vals
    .map(
      ([l, v, t], i) =>
        `<div class="swcol"><span class="swv">${v || ""}</span><span class="swbar ${t ? "t" : v >= g ? "ok" : ""}" style="height:${Math.max(4, Math.round((v / mx) * 110))}px;animation-delay:${(i * 0.06).toFixed(2)}s"></span><span class="swl notr ${t ? "t" : ""}">${l}</span></div>`,
    )
    .join("")}</div>
<div class="skb sgoalrow"><div><b>Objectif quotidien</b><small><span>${lvl}</span> · <span>${g} XP par jour</span></small></div><button class="slink" id="sGoalEd">Modifier</button></div>
${st.edit ? `<div class="sgoals">${GOALS.map(([x, l]) => `<button data-g="${x}" class="${x === g ? "on" : ""}"><b>${l}</b><small>${x} XP</small></button>`).join("")}</div>` : ""}`;
}

/** Ouvre l'écran Série (tab = "goal" pour l'objectif du jour). */
export function openStreak(tab) {
  const now = new Date();
  const st = { tab: tab === "goal" ? 2 : 1, y: now.getFullYear(), mo: now.getMonth(), edit: false };
  const m = modal("", "streaksheet");
  const draw = () => {
    m.innerHTML = `<div class="shead"><button class="sx" id="sClose" aria-label="Fermer">${ic("x", 28, "", 3)}</button><h1>Série</h1><button class="sx" id="sShare" aria-label="Partager ma série">${ic("share", 26, "", 2.6)}</button></div>
<div class="stabs"><button id="sT1" class="${st.tab === 1 ? "on" : ""}">Ma série</button><button id="sT2" class="${st.tab === 2 ? "on" : ""}">Objectif du jour</button><span class="sunder" style="transform:translateX(${st.tab === 1 ? 0 : 100}%)"></span></div>
<div class="sbody">${st.tab === 1 ? tabStreak(st) : tabGoal(st)}</div>`;
    const on = (id, f) => {
      const b = m.querySelector(id);
      if (b) b.onclick = f;
    };
    on("#sClose", () => closeModal());
    on("#sShare", () => shareProgress());
    on("#sShare2", () => shareProgress());
    on("#sT1", () => {
      st.tab = 1;
      draw();
    });
    on("#sT2", () => {
      st.tab = 2;
      draw();
    });
    on("#sBuy", () => {
      closeModal();
      location.hash = "boutique";
    });
    on("#sPrev", () => {
      st.mo--;
      if (st.mo < 0) {
        st.mo = 11;
        st.y--;
      }
      draw();
    });
    on("#sNext", () => {
      st.mo++;
      if (st.mo > 11) {
        st.mo = 0;
        st.y++;
      }
      draw();
    });
    on("#sGoalEd", () => {
      st.edit = !st.edit;
      draw();
    });
    m.querySelectorAll("[data-g]").forEach(
      b =>
        (b.onclick = () => {
          S.goal = +b.dataset.g;
          save();
          st.edit = false;
          draw();
          const top = document.querySelector("#tXp");
          if (top) top.classList.toggle("met", todayXp() >= S.goal);
        }),
    );
  };
  draw();
}
