// Quêtes du jour et badges
import { COURSES } from "../content/index.js";
import { S } from "../core/accounts.js";
import { partsDone } from "../core/progress.js";
import { todayXp } from "../core/xp.js";
import { weekXp } from "../screens/league.js";
import { toast } from "../ui/ui.js";

// ===================== QUÊTES & BADGES =====================
// v32 : une douzaine de quêtes possibles, 3 tirées chaque jour (une « volume » et deux d'autres familles).
// k = famille : v volume, p précision, o oral/écoute, d découverte, r révision.
export const QUEST_POOL = [
  { id: "xp", k: "v", ic: "⚡", t: () => `Gagne ${S.goal} XP`, cur: () => todayXp(), max: () => S.goal, g: 10 },
  { id: "l2", k: "v", ic: "📘", t: () => "Termine 2 leçons", cur: () => S.q.l, max: () => 2, g: 10 },
  { id: "l3", k: "v", ic: "📘", t: () => "Termine 3 leçons", cur: () => S.q.l, max: () => 3, g: 15 },
  { id: "ok30", k: "v", ic: "✅", t: () => "Donne 30 bonnes réponses", cur: () => S.q.ok || 0, max: () => 30, g: 10 },
  {
    id: "min10",
    k: "v",
    ic: "⏱️",
    t: () => "Étudie 10 minutes",
    cur: () => Math.floor((S.q.sec || 0) / 60),
    max: () => 10,
    g: 15,
  },
  { id: "c8", k: "p", ic: "🔥", t: () => "Enchaîne 8 bonnes réponses", cur: () => S.q.c, max: () => 8, g: 10 },
  { id: "c12", k: "p", ic: "🔥", t: () => "Enchaîne 12 bonnes réponses", cur: () => S.q.c, max: () => 12, g: 15 },
  {
    id: "perf",
    k: "p",
    ic: "💯",
    t: () => "Termine une séance sans erreur",
    cur: () => S.q.p || 0,
    max: () => 1,
    g: 15,
  },
  {
    id: "acc90",
    k: "p",
    ic: "🎯",
    t: () => "Termine 2 séances avec 90 % de précision",
    cur: () => S.q.a || 0,
    max: () => 2,
    g: 15,
  },
  {
    id: "s4",
    k: "o",
    ic: "🎧",
    t: () => "Réussis 4 exercices d'écoute ou d'oral",
    cur: () => S.q.s,
    max: () => 4,
    g: 10,
  },
  {
    id: "s8",
    k: "o",
    ic: "🎧",
    t: () => "Réussis 8 exercices d'écoute ou d'oral",
    cur: () => S.q.s,
    max: () => 8,
    g: 15,
  },
  { id: "story", k: "d", ic: "📖", t: () => "Lis une histoire", cur: () => S.q.st || 0, max: () => 1, g: 10 },
  { id: "train", k: "r", ic: "🏋️", t: () => "Termine un entraînement", cur: () => S.q.t || 0, max: () => 1, g: 10 },
  { id: "mist", k: "r", ic: "🩹", t: () => "Corrige 3 erreurs passées", cur: () => S.q.m || 0, max: () => 3, g: 15 },
];
/** Les 3 quêtes du jour (tirées une fois par jour, puis gardées dans S.q.ids). */
export function todayQuests() {
  if (!Array.isArray(S.q.ids) || S.q.ids.length !== 3 || S.q.ids.some(id => !QUEST_POOL.some(q => q.id === id))) {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const first = pick(QUEST_POOL.filter(q => q.k === "v"));
    const fams = ["p", "o", "d", "r"].sort(() => Math.random() - 0.5).slice(0, 2);
    S.q.ids = [first.id, ...fams.map(f => pick(QUEST_POOL.filter(q => q.k === f)).id)];
    S.q.claimed = (S.q.claimed || []).filter(id => S.q.ids.includes(id));
  }
  return S.q.ids.map(id => QUEST_POOL.find(q => q.id === id));
}
/** Ancien nom gardé pour le code qui lit la liste complète. */
export const QUESTS = QUEST_POOL;
/** Quête du mois : chaque quête du jour accomplie donne 1 point ; paliers [points, gemmes]. v32 : 60 points, 4 paliers. */
export const QM_GOAL = 60;
export const QM_STEPS = [
  [10, 20],
  [25, 30],
  [40, 50],
  [60, 100],
];
export function questMonth() {
  const m = new Date().toISOString().slice(0, 7);
  if (!S.qm || S.qm.m !== m) S.qm = { m, pts: 0, got: [], v: 2 };
  if (S.qm.v !== 2) {
    // paliers d'avant la v32 (10, 20, 30) : déjà payés, on les reporte sur les nouveaux
    const old = { 10: 10, 20: 25, 30: 40 };
    S.qm.got = (S.qm.got || []).map(n => old[n] || n);
    S.qm.v = 2;
  }
  return S.qm;
}
/** Valide les quêtes atteintes. `quiet` : sans bulle (la fin de leçon les affiche elle-même). Renvoie ce qui vient d'être gagné. */
export function checkQuests(quiet) {
  const won = [];
  todayQuests().forEach(q => {
    if (!S.q.claimed.includes(q.id) && q.cur() >= q.max()) {
      S.q.claimed.push(q.id);
      S.gems += q.g;
      won.push({ id: q.id, g: q.g });
      if (!quiet) toast(`${q.ic} Quête accomplie : +${q.g} 💎`);
      const qm = questMonth();
      qm.pts++;
      QM_STEPS.forEach(([n, g]) => {
        if (qm.pts >= n && !qm.got.includes(n)) {
          qm.got.push(n);
          S.gems += g;
          won.push({ month: n, g });
          if (!quiet) setTimeout(() => toast(`🏆 Quête du mois : ${n} points, +${g} 💎`), 1200);
        }
      });
    }
  });
  return won;
}
export const BADGES = [
  { id: "first", ic: "🐣", n: "Premier pas", d: "1re leçon", ok: () => S.lessons >= 1 },
  { id: "l10", ic: "📚", n: "Assidue", d: "10 leçons", ok: () => S.lessons >= 10 },
  { id: "l50", ic: "🎓", n: "Érudite", d: "50 leçons", ok: () => S.lessons >= 50 },
  { id: "s3", ic: "🔥", n: "En feu", d: "Série de 3 jours", ok: () => S.streak >= 3 },
  { id: "s7", ic: "🌋", n: "Volcan", d: "Série de 7 jours", ok: () => S.streak >= 7 },
  { id: "s30", ic: "☄️", n: "Inarrêtable", d: "Série de 30 jours", ok: () => S.streak >= 30 },
  { id: "x500", ic: "⚡", n: "Électrique", d: "500 XP", ok: () => S.xp >= 500 },
  { id: "x2000", ic: "🌟", n: "Superstar", d: "2 000 XP", ok: () => S.xp >= 2000 },
  { id: "perf", ic: "💯", n: "Sans faute", d: "1 leçon parfaite", ok: () => S.perfect >= 1 },
  { id: "perf10", ic: "👑", n: "Perfectionniste", d: "10 leçons parfaites", ok: () => S.perfect >= 10 },
  { id: "combo15", ic: "🎯", n: "Sniper", d: "Combo de 15", ok: () => S.bestCombo >= 15 },
  { id: "speak10", ic: "🎙️", n: "Moulin à paroles", d: "10 phrases prononcées", ok: () => S.spoke >= 10 },
  {
    id: "toeic",
    ic: "💼",
    n: "TOEIC Ready",
    d: "1 unité TOEIC",
    ok: () => COURSES["en-toeic"].units.some((U, u) => partsDone("en-toeic", u) > 0),
  },
  {
    id: "volt",
    ic: "✒️",
    n: "Plume de Voltaire",
    d: "1 unité Voltaire",
    ok: () => COURSES["fr-volt"].units.some((U, u) => partsDone("fr-volt", u) > 0),
  },
  {
    id: "ko",
    ic: "🐯",
    n: "호랑이",
    d: "1 unité de coréen",
    ok: () => COURSES.ko.units.some((U, u) => !U.hg && partsDone("ko", u) > 0),
  },
  { id: "sprint", ic: "⏱️", n: "Éclair", d: "15 au Sprint", ok: () => S.sprint >= 15 },
  { id: "story", ic: "📖", n: "Conteuse", d: "3 histoires lues", ok: () => S.stories.length >= 3 },
  {
    id: "ext",
    ic: "🔥",
    n: "Extrême",
    d: "1 étape en version extrême",
    ok: () => Object.values(S.ext).some(a => a.length > 0),
  },
  {
    id: "ext10",
    ic: "👑",
    n: "Légende",
    d: "10 couronnes",
    ok: () => Object.values(S.ext).reduce((x, a) => x + a.length, 0) >= 10,
  },
  { id: "style", ic: "🎩", n: "Fashion", d: "1re tenue achetée", ok: () => S.owned.length >= 1 },
  { id: "league", ic: "🥇", n: "Ligue Or", d: "800 XP en une semaine", ok: () => weekXp(S) >= 800 },
];
/** Médaille dessinée de chaque badge : [icône, couleur, couleur foncée, nombre affiché]. */
export const BADGE_MEDAL = {
  first: ["egg", "#22B573", "#178A57", "1"],
  l10: ["book", "#3D8BFF", "#1D5FC2", "10"],
  l50: ["cap", "#7C4DFF", "#5A30D8", "50"],
  s3: ["flame", "#FF9F1C", "#C2410C", "3"],
  s7: ["flame", "#FF7A3C", "#C2410C", "7"],
  s30: ["flame", "#E8434F", "#A8203F", "30"],
  x500: ["bolt", "#FFB020", "#B45309", "500"],
  x2000: ["star", "#FFC83D", "#C98B00", "2000"],
  perf: ["hundred", "#22B573", "#178A57", "1"],
  perf10: ["crown", "#FFB020", "#B45309", "10"],
  combo15: ["target", "#E0457B", "#A8203F", "15"],
  speak10: ["mic", "#13A8A8", "#0C7F7F", "10"],
  toeic: ["brief", "#7C4DFF", "#5A30D8", ""],
  volt: ["feather", "#3D8BFF", "#1D5FC2", ""],
  ko: ["tiger", "#FF9F1C", "#C2410C", ""],
  sprint: ["timer", "#E0457B", "#A8203F", "15"],
  story: ["open", "#13A8A8", "#0C7F7F", ""],
};
export function checkBadges() {
  const nw = [];
  BADGES.forEach(b => {
    if (!S.badges.includes(b.id) && b.ok()) {
      S.badges.push(b.id);
      nw.push(b);
    }
  });
  return nw;
}
