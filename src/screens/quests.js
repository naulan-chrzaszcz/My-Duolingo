// Onglet Quêtes (v29) : quête du mois et quêtes du jour, façon Duolingo
import { S } from "../core/accounts.js";
import { QM_GOAL, QM_STEPS, questMonth, todayQuests } from "../features/quests.js";
import { UI } from "../i18n/locale.js";
import { ic } from "../ui/icons.ts";
import { mascot } from "../ui/mascot.js";

const LOC = UI === "en" ? "en-GB" : UI === "ko" ? "ko-KR" : "fr-FR";
const CHEST = [
  ["#3D8BFF", "#1D5FC2"],
  ["#7C4DFF", "#5A30D8"],
  ["#FF7A3C", "#C2410C"],
  ["#22B573", "#178A57"],
];
/** Coffre dessiné ; ouvert (couvercle relevé) quand la quête est faite. */
export function chestSvg(c, d, open, w = 56) {
  const lid = open
    ? `<path d="M8 22 L14 6 H50 L56 22 Z" fill="#FFC83D" stroke="#C98B00" stroke-width="3" stroke-linejoin="round" transform="rotate(-14 8 22)"/>`
    : `<path d="M8 26 Q8 10 22 10 H42 Q56 10 56 26 Z" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="20" y="10" width="8" height="16" fill="#FFC83D"/><rect x="36" y="10" width="8" height="16" fill="#FFC83D"/>`;
  return `<svg class="qchest ${open ? "open" : ""}" width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="58" rx="24" ry="4" fill="rgba(0,0,0,.08)"/><rect x="8" y="26" width="48" height="28" rx="5" fill="${open ? "#FFE7A8" : c}" stroke="${open ? "#C98B00" : d}" stroke-width="3"/><rect x="8" y="36" width="48" height="5" fill="${open ? "#FFC83D" : d}" opacity=".5"/>${lid}<rect x="27" y="30" width="10" height="12" rx="3" fill="#FFC83D" stroke="#C98B00" stroke-width="2.5"/>${open ? '<circle cx="32" cy="22" r="4" fill="#FFF3B0"/>' : ""}</svg>`;
}
export function renderQuests(v) {
  const qm = questMonth();
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const days = Math.max(1, Math.ceil((end - now) / 864e5));
  const mid = new Date(now);
  mid.setHours(24, 0, 0, 0);
  const hrs = Math.max(1, Math.ceil((mid - now) / 36e5));
  const month = new Intl.DateTimeFormat(LOC, { month: "long" }).format(now);
  const pct = Math.min(100, Math.round((qm.pts / QM_GOAL) * 100));
  const marks = QM_STEPS.map(
    ([n, g]) =>
      `<span class="qmk ${qm.pts >= n ? "on" : ""}" style="left:${(n / QM_GOAL) * 100}%"><b>${n}</b><small>+${g} 💎</small></span>`,
  ).join("");
  const rows = todayQuests()
    .map((q, i) => {
      const c = Math.min(q.cur(), q.max()),
        done = S.q.claimed.includes(q.id);
      const [col, dk] = CHEST[i % CHEST.length];
      return `<div class="qrow ${done ? "done" : ""}" style="animation-delay:${(i * 0.06).toFixed(2)}s"><div class="qtx"><b>${q.t()}</b><span class="qbar"><i style="width:${(c / q.max()) * 100}%"></i><em>${c} / ${q.max()}</em></span><small>+${q.g} 💎</small></div>${chestSvg(col, dk, done)}</div>`;
    })
    .join("");
  v.innerHTML = `<header class="qhero"><div class="qht"><h1>Quête de ${month}</h1><div class="qleft">${ic("clock", 20, "", 2.6)}<span>${days} jours</span></div></div><div class="qmasc">${mascot("happy")}</div>
<div class="qmcard"><div class="qmt"><b>Gagne ${QM_GOAL} points de quête</b><span>${qm.pts} / ${QM_GOAL}</span></div><div class="qmbar"><i style="width:${pct}%"></i>${marks}</div><p>Chaque quête du jour accomplie rapporte 1 point.</p></div></header>
<div class="qdhead"><h2>Quêtes du jour</h2><span>${ic("clock", 18, "", 2.6)}<span class="qhrs"><b class="notr">${hrs}</b> <span>h</span></span></span></div><div class="qlist">${rows}</div>`;
}
