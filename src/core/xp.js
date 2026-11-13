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
  while (keys.length > 400) delete S.week[keys.shift()]; // ~13 mois : calendrier de l'écran Série
}
export const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
export function daily() {
  const t = dkey();
  if (S.lastDay && S.lastDay !== t && S.lastDay !== yest()) {
    const missed = daysBetween(S.lastDay, t) - 1;
    if (S.streak > 0 && missed > 0 && S.freeze >= missed) {
      S.freeze -= missed;
      // jours protégés par un gel, affichés dans le calendrier de l'écran Série
      S.frz = Array.isArray(S.frz) ? S.frz : [];
      for (let i = 1; i <= missed; i++) {
        const d = new Date(S.lastDay + "T12:00:00");
        d.setDate(d.getDate() + i);
        S.frz.push(dkey(d));
      }
      S.frz = S.frz.slice(-60);
      S.lastDay = yest();
      setTimeout(() => toast(`❄️ Ton gel de série a protégé ta série de ${S.streak} jours !`), 900);
      save();
    } else {
      S.streak = 0;
      S.smil = [];
    }
  }
  if (S.q.day !== t) S.q = { day: t, l: 0, c: 0, s: 0, claimed: [] };
}
export const level = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
export const lvlXp = l => 40 * (l - 1) * (l - 1);
