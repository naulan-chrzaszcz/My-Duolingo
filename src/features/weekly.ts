// Bilan de la semaine (v39.1) : à la première ouverture de la semaine, si l'élève a travaillé la semaine passée,
// un court bilan (progrès, erreurs qui reviennent) et 3 objectifs pour la semaine. Sans IA, il est construit
// à partir des statistiques ; avec l'IA, il est rédigé pour l'élève (un appel par semaine). À revoir depuis le profil.
import { S, save } from "../core/accounts.js";
import { dkey, esc, secName } from "../core/util.js";
import { COURSES } from "../content/index.js";
import { aiAsk, aiDetect, likesText } from "../services/ai.js";
import { mascot } from "../ui/mascot.js";
import { curCid, curSec } from "../ui/router.js";
import { closeModal, modal } from "../ui/ui.js";
import { weekStart, weekXp } from "../screens/league.js";
import { bankDue } from "./word-bank.js";
import { TYPE_FR } from "./coach.js";
import { likesList } from "./interests";
import { goalId, goalText } from "./personalize";

const P = (): any => S;
export type WeekStats = {
  xp: number;
  prev: number;
  days: number;
  streak: number;
  due: number;
  errors: string[];
  topType: string;
  topUnit: string;
};
/** parts : phrases du bilan sans IA, affichées séparément pour être traduites une à une. */
export type Weekly = {
  wk: string;
  bilan: string;
  parts?: string[];
  obj: string[];
  src: "ia" | "local";
  xp: number;
  days: number;
};

export const weekKey = (): string => dkey(weekStart(0));

/** Le bilan doit-il s'ouvrir ? Une fois par semaine, seulement après une semaine où l'élève a travaillé. */
export function weeklyDue(): boolean {
  const st = P();
  return !!(st.onb && st.wkSeen !== weekKey() && weekXp(st, 1) > 0);
}

/** Statistiques de la semaine passée (lundi à dimanche) pour le cours en cours. */
export function weekStats(): WeekStats {
  const st = P();
  const from = weekStart(1).setHours(0, 0, 0, 0),
    to = weekStart(0).setHours(0, 0, 0, 0);
  let days = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    if ((st.week[dkey(d)] || 0) > 0) days++;
  }
  const log = ((st.elog && st.elog[curCid()]) || []).filter((e: any) => e.ts >= from && e.ts < to);
  const top = (f: (e: any) => string) => {
    const m: Record<string, number> = {};
    log.forEach((e: any) => {
      const k = f(e);
      if (k) m[k] = (m[k] || 0) + 1;
    });
    const best = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] >= 2 ? best[0] : "";
  };
  return {
    xp: weekXp(st, 1),
    prev: weekXp(st, 2),
    days,
    streak: st.streak || 0,
    due: bankDue(curSec().id),
    errors: log.slice(-15).map((e: any) => `[${e.t}] ${e.q} | attendu : ${e.a} | donné : ${e.g || "—"}`.slice(0, 300)),
    topType: top(e => (TYPE_FR as Record<string, string>)[e.t] || ""),
    topUnit: top(e => e.u || ""),
  };
}

/** Bilan sans IA, à partir des chiffres. */
export function localWeekly(s: WeekStats): Weekly {
  const evo = s.prev ? Math.round(((s.xp - s.prev) / s.prev) * 100) : 0;
  const parts = [`La semaine dernière : ${s.xp} XP en ${s.days} jour${s.days > 1 ? "s" : ""} d'activité.`];
  if (s.prev && evo >= 10) parts.push(`C'est ${evo} % de plus que la semaine d'avant, bravo !`);
  else if (s.prev && evo <= -10) parts.push(`C'est ${-evo} % de moins que la semaine d'avant : on repart ensemble.`);
  if (s.topType) parts.push(`Tes erreurs portaient surtout sur : ${s.topType}.`);
  const obj = [
    s.days < 5 ? "Pratiquer au moins 5 jours cette semaine" : "Garder ta série tous les jours de la semaine",
    s.topUnit ? `Revoir l'unité « ${s.topUnit} »` : "Faire une leçon bilan dans l'onglet Entraînement",
    s.due ? `Réviser tes ${s.due} mots à retenir` : "Ajouter 5 mots à retenir vus dans tes leçons",
  ];
  return { wk: weekKey(), bilan: parts.join(" "), parts, obj, src: "local", xp: s.xp, days: s.days };
}

/** Consigne pour l'IA (même texte dans server/api/generate.php, mode « weekly »). */
export function weeklyPrompt(r: any): string {
  const L0 = ({ "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" } as Record<string, string>)[r.lang];
  const n = r.stats || [];
  return (
    "Tu es le coach bienveillant d'une application d'apprentissage façon Duolingo. L'élève est francophone et apprend le " +
    L0 +
    " (cours : " +
    r.course +
    ", niveau : " +
    r.level +
    ").\nSa semaine passée : " +
    n[0] +
    " XP (semaine d'avant : " +
    n[1] +
    " XP), " +
    n[2] +
    " jours d'activité sur 7, série de " +
    n[3] +
    " jours, " +
    n[4] +
    " mots à retenir à revoir.\n" +
    (r.why && goalText() ? "Objectif de l'élève : " + goalText() + ".\n" : "") +
    (r.likes && r.likes.length ? likesText(r.likes) : "\n") +
    (r.errors && r.errors.length
      ? "Erreurs de la semaine (exercice | réponse attendue | réponse donnée) :\n- " + r.errors.join("\n- ") + "\n\n"
      : "Aucune erreur enregistrée cette semaine.\n\n") +
    'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n{"bilan":"2 à 3 phrases","objectifs":["objectif 1","objectif 2","objectif 3"]}\n' +
    "Le bilan est en français, au tutoiement, bienveillant et précis (progrès, point fort, erreur qui revient). Exactement 3 objectifs courts (moins de 90 caractères), concrets et réalisables dans l'application (leçons, révisions, mots à retenir, histoires), dont au moins un sur l'erreur la plus fréquente."
  );
}

/** Bilan rédigé par l'IA ; null si elle est indisponible ou si la réponse est inutilisable. */
export async function aiWeekly(s: WeekStats): Promise<Weekly | null> {
  if ((await aiDetect()) === "local") return null;
  const C = COURSES[curCid()];
  const req = {
    mode: "weekly",
    lang: C.lang,
    course: C.name,
    level: secName(curCid(), Math.max(0, ...C.units.map((u: any) => u.lv || 0))),
    stats: [s.xp, s.prev, s.days, s.streak, s.due],
    errors: s.errors,
    why: goalId(),
    likes: likesList(),
  };
  const raw: any = await aiAsk(weeklyPrompt(req), req, { tier: "quick", ms: 40000 });
  const str = (x: unknown, n: number) => typeof x === "string" && x.trim().length > 0 && x.length < n;
  if (!raw || !str(raw.bilan, 700) || !Array.isArray(raw.objectifs)) return null;
  const obj = raw.objectifs.filter((x: unknown) => str(x, 140)).slice(0, 3);
  if (obj.length < 3) return null;
  return {
    wk: weekKey(),
    bilan: raw.bilan.trim(),
    obj: obj.map((x: string) => x.trim()),
    src: "ia",
    xp: s.xp,
    days: s.days,
  };
}

function weeklyHtml(w: Weekly, loading: boolean): string {
  return `<div class="mcenter wkpop">${mascot("happy", "jump")}<h2>Ton bilan de la semaine</h2>
    <div class="wkstats"><span><b>${w.xp}</b><small>XP</small></span><span><b>${w.days}/7</b><small>jours</small></span></div>
    <p class="wkbilan">${w.parts ? w.parts.map(x => `<span>${esc(x)}</span>`).join(" ") : esc(w.bilan)}</p>${loading ? `<p class="wkload">Horang rédige ton bilan…</p>` : ""}
    <h3>Tes objectifs de la semaine</h3><ol class="wkobj">${w.obj.map(o => `<li>${esc(o)}</li>`).join("")}</ol></div>
    <button class="btn" id="wkOk">C'est noté</button>`;
}

/** Ouvre le bilan : d'abord la version sans IA, remplacée dès que l'IA a rédigé la sienne. */
export async function showWeekly(after?: () => void): Promise<void> {
  const st = P();
  st.wkSeen = weekKey();
  const s = weekStats();
  let w = localWeekly(s);
  st.wkLast = w;
  save();
  const bind = (m: Element) => {
    (m.querySelector("#wkOk") as HTMLElement).onclick = () => {
      closeModal();
      if (after) after();
    };
  };
  bind(modal(weeklyHtml(w, true)));
  const ia = await aiWeekly(s).catch(() => null);
  const card = document.querySelector("#modal .wkpop");
  if (ia) {
    st.wkLast = w = ia;
    save();
  }
  if (card && !document.querySelector("#modal")?.classList.contains("hidden")) bind(modal(weeklyHtml(w, false)));
}

/** Depuis le profil : le dernier bilan (ou celui de la semaine passée, calculé sans IA). */
export function lastWeekly(): void {
  const w: Weekly = P().wkLast || localWeekly(weekStats());
  const m = modal(weeklyHtml(w, false));
  (m.querySelector("#wkOk") as HTMLElement).onclick = closeModal;
}
