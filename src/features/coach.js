// Coach : statistiques d'erreurs et révisions ciblées
import { COURSES } from "../content/index.js";
import { S } from "../core/accounts.js";
import { level } from "../core/xp.js";
import { unlockedUnits } from "../lesson/build.js";
import { startAI } from "../services/ai.js";
import { toast } from "../ui/ui.js";

export const TYPE_FR = {
  write: "rédaction",
  hg: "lecture du hangul",
  build: "écriture du hangul",
  mc: "choix de traduction",
  tiles: "construction de phrases",
  tilesRev: "compréhension",
  listenTiles: "écoute",
  listen: "écoute (dictée)",
  type: "traduction écrite",
  speak: "prononciation",
  choice: "grammaire / règles",
  part2: "TOEIC Part 2",
  conv: "TOEIC Parts 3-4",
  read: "TOEIC Part 7",
  dictee: "dictée",
  spot: "repérage de fautes",
  photo: "TOEIC Part 1",
};
export function errStats(cid) {
  const a = S.elog[cid] || [];
  const by = f => {
    const m = {};
    a.forEach(e => {
      const k = f(e);
      if (k) m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  };
  return { n: a.length, units: by(e => e.u), types: by(e => TYPE_FR[e.t]) };
}
export function localFocus(cid) {
  const st = errStats(cid);
  return [...st.units.slice(0, 2).map(x => x[0]), ...st.types.slice(0, 2).map(x => x[0])];
}
export function localDiag(cid) {
  const st = errStats(cid);
  if (!st.n) return "Pas encore assez d'erreurs pour un diagnostic : voici une révision variée de ce que tu as vu.";
  return `Sur tes ${st.n} dernières erreurs, tu bloques surtout ${st.types[0] ? "en " + st.types[0][0] : ""}${st.units[0] ? ` et dans l'unité « ${st.units[0][0]} »` : ""}. On revient dessus avec tes erreurs à ancrer et des exercices de ces unités.`;
}
export function startCoach(cid) {
  const C = COURSES[cid];
  const errs = S.elog[cid] || [];
  const unitsWithErr = [...new Set(errs.map(e => e.u).filter(Boolean))];
  let units = C.units.filter(u => unitsWithErr.includes(u.t));
  const ul = unlockedUnits(cid);
  if (units.length < 2) units = ul.slice(-3);
  startAI(cid, units, { mode: "train", coach: true });
}
export async function shareProgress() {
  const txt = `🔥 ${S.streak} jour${S.streak > 1 ? "s" : ""} de série sur Speakeasy · ${S.xp} XP · niveau ${level(S.xp)} 🐯`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Speakeasy", text: txt, url: location.origin + location.pathname });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(txt);
    toast("📋 Copié : colle-le où tu veux !");
  } catch (e) {
    toast(txt);
  }
}
