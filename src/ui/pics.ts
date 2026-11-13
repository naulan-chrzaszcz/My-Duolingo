// Images de vocabulaire et scènes illustrées (v30) : dessins originaux en SVG, aucun fichier externe.
import words from "../content/pics.json";
import { svg } from "./pics/kit.js";
import { ICONS_A } from "./pics/icons-a.js";
import { ICONS_B } from "./pics/icons-b.js";
import { ICONS_C } from "./pics/icons-c.js";
import { P1_SCENES } from "./pics/scenes-p1.js";

/** Mots illustrés : [id, catégorie, français, anglais, coréen, romanisation]. */
export const PIC_WORDS: string[][] = words as string[][];
export const PIC_BY_ID: Record<string, string[]> = Object.fromEntries(PIC_WORDS.map(w => [w[0], w]));
const ICONS: Record<string, string> = { ...ICONS_A, ...ICONS_B, ...ICONS_C };

/** Dessin d'un mot (SVG prêt à insérer), ou "" s'il n'existe pas. */
export function picSvg(id: string, cls = "picsvg"): string {
  return ICONS[id] ? svg(ICONS[id], 64, 64, cls) : "";
}
export const hasPic = (id: string) => !!ICONS[id] && !!PIC_BY_ID[id];
/** Mot d'une image dans la langue du cours ("en-US", "fr-FR", "ko-KR") ; rom = romanisation (coréen). */
export function picWord(id: string, lang: string): { w: string; rom: string } {
  const r = PIC_BY_ID[id];
  if (!r) return { w: id, rom: "" };
  const l = lang.slice(0, 2);
  return l === "ko" ? { w: r[4], rom: r[5] } : l === "fr" ? { w: r[2], rom: "" } : { w: r[3], rom: "" };
}

/** Scène illustrée de la Part 1, retrouvée par la phrase correcte ; "" si aucune. */
export function p1Svg(answer: string): string {
  const s = P1_SCENES[answer];
  return s ? svg(s, 160, 100, "scenesvg") : "";
}
export const P1_KEYS = Object.keys(P1_SCENES);
