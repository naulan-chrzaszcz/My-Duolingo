// XP du jour, série, niveau
import { S, save } from "./accounts.js";
import { dkey, yest } from "./util.js";
import { toast } from "../ui/ui.js";

export function todayXp() {
  return S.week[dkey()] || 0;
}
export function addToday(x) {
  const k = dkey();
  S.week[k] = (S.week[k] || 0) + x;
  const keys = Object.keys(S.week).sort();
  while (keys.length > 21) delete S.week[keys.shift()];
}
export function regen() {
  if (S.hearts >= 5) {
    S.hTs = Date.now();
    return;
  }
  const n = Math.floor((Date.now() - S.hTs) / 1200000);
  if (n > 0) {
    S.hearts = Math.min(5, S.hearts + n);
    S.hTs += n * 1200000;
    if (S.hearts >= 5) S.hTs = Date.now();
  }
}
export const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
export function daily() {
  const t = dkey();
  if (S.lastDay && S.lastDay !== t && S.lastDay !== yest()) {
    const missed = daysBetween(S.lastDay, t) - 1;
    if (S.streak > 0 && missed > 0 && S.freeze >= missed) {
      S.freeze -= missed;
      S.lastDay = yest();
      setTimeout(() => toast(`❄️ Ton gel de série a protégé ta série de ${S.streak} jours !`), 900);
      save();
    } else S.streak = 0;
  }
  if (S.q.day !== t) S.q = { day: t, l: 0, c: 0, s: 0, claimed: [] };
  regen();
}
export const level = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
export const lvlXp = l => 40 * (l - 1) * (l - 1);
