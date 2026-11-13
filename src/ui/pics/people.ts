// Personnages simples pour les scènes illustrées (v30). Dessins originaux.
import { C, K, ci, el, limb, pa, re } from "./kit.js";

export type Pt = [number, number];
export interface Person {
  x: number; // centre des hanches
  fy: number; // niveau du sol (pieds)
  pose?: "stand" | "walk" | "sit" | "kneel";
  dir?: 1 | -1; // regarde vers la droite (1) ou la gauche (-1)
  view?: "f" | "s" | "b"; // face, profil, dos
  shirt?: string;
  pants?: string;
  skin?: string;
  hair?: string;
  hs?: "short" | "long" | "bun" | "none";
  hl?: Pt; // main gauche (coordonnées absolues)
  hr?: Pt;
  elL?: Pt; // coudes (facultatifs)
  elR?: Pt;
  hat?: "chef" | "helmet" | "cap";
  skirt?: boolean;
  apron?: string;
  lean?: number; // inclinaison du buste en degrés (vers dir)
  gloves?: string;
  tie?: string;
}

/** Points utiles d'un personnage (épaules, tête) pour placer objets et mains. */
export function bodyPts(p: Person) {
  const hipY = p.fy - (p.pose === "sit" ? 17 : p.pose === "kneel" ? 14 : 24);
  const shY = hipY - 19;
  return { hipY, shY, headY: shY - 9 };
}

function headSvg(p: Person, x: number, y: number) {
  const hair = p.hair || C.dbrown,
    skin = p.skin || C.skin,
    d = p.dir || 1,
    v = p.view || "s";
  let back = "",
    top = "",
    face = "";
  if (p.hs === "long") back = pa(`M${x - 8.5} ${y}c0-7 4-10 8.5-10s8.5 3 8.5 10v11h-17z`, hair);
  if (p.hs === "bun") back = ci(x - d * 7, y - 6, 3.6, hair);
  if (v === "b") top = ci(x, y, 7.6, hair);
  else if (p.hs !== "none")
    top = pa(`M${x - 7.6} ${y - 1}c0-6 3-8.6 7.6-8.6s7.6 2.6 7.6 8.6c-4-1-6-3-7-5-2 3-5 5-8.2 5z`, hair);
  if (v === "f")
    face =
      ci(x - 2.6, y + 1, 1.1, K, 0) +
      ci(x + 2.6, y + 1, 1.1, K, 0) +
      `<path d="M${x - 2} ${y + 4.2}q2 1.6 4 0" fill="none" stroke-width="1.4"/>`;
  else if (v === "s") face = ci(x + d * 3.6, y + 0.6, 1.1, K, 0);
  let hat = "";
  if (p.hat === "chef")
    hat =
      re(x - 6, y - 10, 12, 5, 1, C.white) + pa(`M${x - 6} ${y - 9}c-5 0-6-8 0-8 1-5 11-5 12 0 6 0 5 8 0 8z`, C.white);
  if (p.hat === "helmet") hat = pa(`M${x - 8.6} ${y - 1}c0-6 3.6-9.6 8.6-9.6s8.6 3.6 8.6 9.6z`, C.yel) + li2(x, y);
  if (p.hat === "cap")
    hat =
      pa(`M${x - 7.6} ${y - 1}c0-6 3-8.6 7.6-8.6s7.6 2.6 7.6 8.6z`, C.red) +
      re(x + (d > 0 ? 3 : -11), y - 2, 8, 2.4, 1, C.red);
  return back + ci(x, y, 7.6, skin) + top + face + hat;
}
const li2 = (x: number, y: number) => `<path d="M${x - 11} ${y - 1}h22" stroke="${K}" stroke-width="2.5"/>`;

export function person(p: Person): string {
  const d = p.dir || 1,
    pose = p.pose || "stand",
    shirt = p.shirt || C.blue,
    pants = p.pants || C.slate,
    skin = p.skin || C.skin;
  const { hipY, shY, headY } = bodyPts(p);
  const x = p.x;
  // jambes
  let legs = "";
  const shoe = (fx: number, fy: number) => el(fx + d * 2, fy - 1.5, 4.2, 2.4, K, 0);
  if (pose === "stand")
    legs =
      limb(`M${x - 3.5} ${hipY}L${x - 4} ${p.fy - 2}`, pants, 6) +
      limb(`M${x + 3.5} ${hipY}L${x + 4} ${p.fy - 2}`, pants, 6) +
      shoe(x - 4, p.fy) +
      shoe(x + 4, p.fy);
  else if (pose === "walk")
    legs =
      limb(`M${x} ${hipY}L${x - 9} ${p.fy - 2}`, pants, 6) +
      limb(`M${x} ${hipY}L${x + 9} ${p.fy - 2}`, pants, 6) +
      shoe(x - 9, p.fy) +
      shoe(x + 9, p.fy);
  else if (pose === "sit")
    legs = limb(`M${x} ${hipY}L${x + d * 14} ${hipY}L${x + d * 14} ${p.fy - 2}`, pants, 6.5) + shoe(x + d * 14, p.fy);
  else
    legs =
      limb(`M${x} ${hipY}L${x - d * 2} ${p.fy - 2}L${x - d * 13} ${p.fy - 2}`, pants, 6) +
      limb(`M${x} ${hipY}L${x + d * 10} ${hipY}L${x + d * 10} ${p.fy - 2}`, pants, 6) +
      shoe(x + d * 10, p.fy);
  // buste (incliné éventuellement autour des hanches)
  let torso = p.skirt
    ? pa(`M${x - 7} ${shY + 3}c0-3 2-4 4-4h6c2 0 4 1 4 4v${hipY - shY - 4}l3 7h-20l3-7z`, shirt)
    : re(x - 7.5, shY, 15, hipY - shY + 2, 5, shirt);
  if (p.apron) torso += re(x - 5.5 + d * 1.5, shY + 7, 11, hipY - shY + 1, 2, p.apron);
  if (p.tie) torso += pa(`M${x} ${shY}l2.2 3-2.2 9-2.2-9z`, p.tie);
  const hd = headSvg(p, x + (p.view === "f" ? 0 : d * 0.5), headY);
  // bras
  const sh: Pt[] = [
    [x - 5, shY + 4],
    [x + 5, shY + 4],
  ];
  const hand = p.gloves || skin;
  const arm = (s: Pt, h: Pt | undefined, e: Pt | undefined) => {
    const hh: Pt = h || [s[0] + (s[0] < x ? -2 : 2), s[1] + 18];
    return (
      limb(`M${s[0]} ${s[1]}${e ? `L${e[0]} ${e[1]}` : ""}L${hh[0]} ${hh[1]}`, shirt, 5) + ci(hh[0], hh[1], 2.9, hand)
    );
  };
  let upper = torso + hd;
  const lean = p.lean || 0;
  const arms = arm(sh[0], p.hl, p.elL) + arm(sh[1], p.hr, p.elR);
  if (lean) {
    // bras dessinés dans le repère incliné : les mains sont données dans ce repère aussi
    upper = `<g transform="rotate(${d * lean} ${x} ${hipY})">${upper}${arms}</g>`;
    return legs + upper;
  }
  return legs + upper + arms;
}

// ---- décors réutilisables (repère de scène 160 × 100) ----
export const room = (wall = "#EAF2FF", floor = "#D9DDEA", fl = 80) =>
  re(0, 0, 160, 100, 0, wall, 0) +
  re(0, fl, 160, 100 - fl, 0, floor, 0) +
  `<path d="M0 ${fl}h160" stroke="${K}" stroke-width="2"/>`;
export const outside = (sky = "#DDF0FF", ground = "#BFE6B0", gl = 78) =>
  re(0, 0, 160, 100, 0, sky, 0) +
  re(0, gl, 160, 100 - gl, 0, ground, 0) +
  `<path d="M0 ${gl}h160" stroke="${K}" stroke-width="2"/>`;
export const desk = (x: number, w: number, top: number, fy = 80, col = C.brown) =>
  re(x + 3, top + 4, 5, fy - top - 4, 1, C.dbrown) +
  re(x + w - 8, top + 4, 5, fy - top - 4, 1, C.dbrown) +
  re(x, top, w, 6, 2, col);
export const chairS = (x: number, seat: number, dir: 1 | -1 = 1, fy = 80, col = C.slate) =>
  re(dir > 0 ? x - 10 : x + 5, seat - 22, 5, 22, 2, col) +
  re(x - 10, seat, 20, 5, 2, col) +
  re(x - 9, seat + 5, 3.5, fy - seat - 5, 1, col) +
  re(x + 5.5, seat + 5, 3.5, fy - seat - 5, 1, col);
export const laptopSide = (x: number, y: number, dir: 1 | -1 = 1) =>
  re(x - 9, y - 3, 18, 3, 1, C.grey) +
  pa(`M${x + dir * 9} ${y - 3}l${dir * 4} -15`, "none") +
  `<path d="M${x + dir * 9} ${y - 3}l${dir * 4} -15" stroke="${K}" stroke-width="4.5"/><path d="M${x + dir * 9} ${y - 3}l${dir * 4} -15" stroke="${C.grey}" stroke-width="2"/>`;
export const plantPot = (x: number, fy: number, s = 1) =>
  pa(
    `M${x} ${fy - 14 * s}c-2-9-9-13-15-11 2 7 9 11 15 11zM${x} ${fy - 14 * s}c2-10 9-15 15-13-2 8-9 12-15 13zM${x} ${fy - 14 * s}c-3-9-1-17 2-22 3 5 3 14-2 22z`,
    C.green,
  ) + pa(`M${x - 8 * s} ${fy - 15 * s}h${16 * s}l-${3 * s} ${15 * s}h-${10 * s}z`, "#D9774A");
