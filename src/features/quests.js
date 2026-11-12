// Quêtes du jour et badges
import { COURSES } from "../content/index.js";
import { S } from "../core/accounts.js";
import { unitComplete } from "../core/progress.js";
import { todayXp } from "../core/xp.js";
import { weekXp } from "../screens/league.js";
import { toast } from "../ui/ui.js";

// ===================== QUÊTES & BADGES =====================
export const QUESTS = [
  { id: "xp", ic: "⚡", t: () => `Gagne ${S.goal} XP`, cur: () => todayXp(), max: () => S.goal, g: 10 },
  { id: "l", ic: "📘", t: () => "Termine 2 leçons", cur: () => S.q.l, max: () => 2, g: 10 },
  { id: "c", ic: "🔥", t: () => "Enchaîne 8 bonnes réponses", cur: () => S.q.c, max: () => 8, g: 15 },
  { id: "s", ic: "🎧", t: () => "Réussis 4 exercices d'écoute ou d'oral", cur: () => S.q.s, max: () => 4, g: 10 },
];
export function checkQuests() {
  QUESTS.forEach(q => {
    if (!S.q.claimed.includes(q.id) && q.cur() >= q.max()) {
      S.q.claimed.push(q.id);
      S.gems += q.g;
      toast(`${q.ic} Quête accomplie : +${q.g} 💎`);
    }
  });
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
    ok: () => COURSES["en-toeic"].units.some((U, u) => unitComplete("en-toeic", u)),
  },
  {
    id: "volt",
    ic: "✒️",
    n: "Plume de Voltaire",
    d: "1 unité Voltaire",
    ok: () => COURSES["fr-volt"].units.some((U, u) => unitComplete("fr-volt", u)),
  },
  {
    id: "ko",
    ic: "🐯",
    n: "호랑이",
    d: "1 unité de coréen",
    ok: () => COURSES.ko.units.some((U, u) => !U.hg && unitComplete("ko", u)),
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
  { id: "league", ic: "🥇", n: "Ligue Or", d: "300 XP en une semaine", ok: () => weekXp(S) >= 300 },
];
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
