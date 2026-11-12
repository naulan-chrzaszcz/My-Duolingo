// Outils généraux (DOM, hasard, dates) et constantes du parcours
import { COURSES } from "../content/index.js";

// ===================== OUTILS =====================
export const $ = s => document.querySelector(s);
export const rnd = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const esc = s =>
  String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const dkey = (d = new Date()) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const yest = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dkey(d);
};
export const NPU = 18; // étapes par unité : 12 leçons, 3 révisions IA, 2 rédactions, 1 bilan
export const NODE = ["L", "L", "L", "L", "ai", "L", "L", "L", "w", "L", "ai", "L", "L", "L", "w", "L", "ai", "ck"];
export const TIER = [0, 0, 1, 1, -1, 1, 2, 2, -1, 2, -1, 3, 3, 3, -1, 3, -1, 4];
export const lessonNo = n => NODE.slice(0, n + 1).filter(x => x === "L").length;
export const SECTION_NAMES = ["Les bases · A1-A2", "Intermédiaire · B1", "Avancé · B2", "Expert · C1"];
export const SEC_BY = {
  toeic: [
    "Les bases · objectif 500+",
    "Intermédiaire · objectif 650+",
    "Avancé · objectif 785+",
    "Expert · objectif 900+",
  ],
  volt: [
    "Les bases · objectif 300 (Technique)",
    "Intermédiaire · objectif 500 (Professionnel)",
    "Avancé · objectif 700 (Affaires)",
    "Expert · objectif 900",
  ],
  ko: [
    "Les bases · TOPIK I niveau 1",
    "Élémentaire · TOPIK I niveau 2",
    "Intermédiaire · TOPIK II 3-4",
    "Avancé · TOPIK II 5+",
  ],
};
export function secName(cid, lv) {
  const C = COURSES[cid] || {};
  return ((cid === "ko" ? SEC_BY.ko : SEC_BY[C.kind]) || SECTION_NAMES)[lv] || SECTION_NAMES[lv];
}
export const UCOLORS = ["#7C4DFF", "#22B573", "#3D8BFF", "#FF7A45", "#E0457B", "#13A8A8"];
export const UDARK = ["#5A30D8", "#178A57", "#2766C9", "#D85B2A", "#B32E5E", "#0C7F7F"];
export const PRAISE = [
  "Excellent !",
  "Bravo !",
  "Parfait !",
  "Génial !",
  "Bien joué !",
  "Impressionnant !",
  "Tu gères !",
  "Magnifique !",
];
