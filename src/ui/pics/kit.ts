// Petits outils de dessin SVG pour les images de vocabulaire et les scènes (v30).
// Dessins originaux : formes simples, contour sombre, couleurs vives (même esprit que les pièces du parcours).

export const K = "#2B2850"; // contour
export const C = {
  red: "#FF5A5F",
  dred: "#D93B48",
  orange: "#FF9F1C",
  yel: "#FFD23F",
  gold: "#F2B33D",
  green: "#4CC25A",
  dgreen: "#2E9E44",
  mint: "#8FD6A0",
  blue: "#4DA3FF",
  dblue: "#2F7BD6",
  sky: "#BFE3FF",
  ice: "#EAF5FF",
  purple: "#9B6BFF",
  lilac: "#C9B2FF",
  pink: "#FF8FB1",
  brown: "#B9774A",
  dbrown: "#8A5232",
  tan: "#E8A35C",
  cream: "#FFF3D6",
  white: "#FFFFFF",
  grey: "#C9CCDA",
  lgrey: "#E6E8F0",
  dgrey: "#8A8FA8",
  slate: "#4A4A68",
  skin: "#FFD0A8",
  skin2: "#C98B5E",
};
const n = (v: number) => +v.toFixed(1);
/** Disque. f = couleur de fond (ou "none"), o = 0 pour ne pas tracer de contour. */
export const ci = (x: number, y: number, r: number, f = "none", o = 1) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${f}"${o ? "" : ' stroke="none"'}/>`;
export const el = (x: number, y: number, rx: number, ry: number, f = "none", o = 1) =>
  `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${f}"${o ? "" : ' stroke="none"'}/>`;
export const re = (x: number, y: number, w: number, h: number, r = 0, f = "none", o = 1) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="${f}"${o ? "" : ' stroke="none"'}/>`;
export const pa = (d: string, f = "none", o = 1) => `<path d="${d}" fill="${f}"${o ? "" : ' stroke="none"'}/>`;
/** Trait coloré (sans remplissage). */
export const li = (d: string, col = K, w = 2.5, extra = "") =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}"${extra}/>`;
/** Trait épais avec contour (bras, jambes, tiges…). */
export const limb = (d: string, col: string, w = 6) =>
  `<path d="${d}" fill="none" stroke="${K}" stroke-width="${w + 3}"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
export const g = (tr: string, inner: string) => `<g transform="${tr}">${inner}</g>`;
/** Étoile à 5 branches. */
export function star(cx: number, cy: number, R: number, r: number, f: string, o = 1) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      rr = i % 2 ? r : R;
    d += (i ? "L" : "M") + n(cx + rr * Math.cos(a)) + " " + n(cy + rr * Math.sin(a));
  }
  return pa(d + "Z", f, o);
}
/** Enveloppe SVG d'une image (repère carré 64 × 64 par défaut). */
export function svg(inner: string, w = 64, h = 64, cls = "picsvg") {
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><g stroke="${K}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
}
