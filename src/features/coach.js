// Coach : statistiques d'erreurs et révisions ciblées
import { COURSES, SECTIONS } from "../content/index.js";
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
  pic: "vocabulaire en images",
  picw: "vocabulaire en images",
  fill: "grammaire / règles",
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
/** v33 : leçon bilan — tout ce qui a été vu, avec plus de place pour les unités où l'on se trompe, les erreurs à ancrer et les mots à revoir. */
export function startBilan(cid) {
  const seen = unlockedUnits(cid);
  const errs = S.elog[cid] || [];
  const w = {};
  errs.forEach(e => e.u && (w[e.u] = (w[e.u] || 0) + 1));
  const hard = seen
    .filter(u => w[u.t])
    .sort((a, b) => w[b.t] - w[a.t])
    .slice(0, 5);
  const rest = seen.filter(u => !hard.includes(u));
  // les unités difficiles d'abord, puis un échantillon régulier de tout le reste (début, milieu, fin du parcours)
  const n = Math.max(0, 10 - hard.length);
  const spread =
    rest.length <= n
      ? rest
      : Array.from({ length: n }, (_, i) => rest[Math.round((i * (rest.length - 1)) / Math.max(1, n - 1))]);
  const units = [...new Set([...spread, ...hard])];
  const sec = SECTIONS.find(x => x.tracks.includes(cid));
  const now = Date.now();
  const words = ((sec && S.bank[sec.id]) || [])
    .filter(x => (x.due || 0) <= now)
    .slice(0, 10)
    .map(x => (x.w + (x.tr ? " = " + x.tr : "")).slice(0, 120));
  startAI(cid, units, { mode: "train", coach: errs.length >= 3, bilan: true, words });
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
