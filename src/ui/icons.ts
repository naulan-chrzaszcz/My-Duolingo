// Icônes dessinées (SVG au trait, couleur = currentColor), drapeaux des sections, coupes et médailles (v28).
// Remplacent les emojis dans la barre du haut, la barre du bas, le parcours, l'entraînement, la série, la ligue et le profil.

const P: Record<string, string> = {
  // barre du bas
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  open: '<path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  // barre du haut
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/>',
  gem: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16M15 4l-3 16"/>',
  bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  chevr: '<path d="M9 5l7 7-7 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  // parcours
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/>',
  phones:
    '<path d="M4 16v-4a8 8 0 0 1 16 0v4"/><rect x="3" y="15" width="4" height="6" rx="1.5"/><rect x="17" y="15" width="4" height="6" rx="1.5"/>',
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
  spark: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  chest: '<path d="M4 10h16v10H4z"/><path d="M4 10l2-5h12l2 5"/><path d="M10 13h4v3h-4z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  guide: '<path d="M7 3h10a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  skip: '<path d="M5 5l7 7-7 7M12 5l7 7-7 7"/>',
  // entraînement
  repeat:
    '<path d="M4 12a8 8 0 0 1 14-5.3L20 8"/><path d="M20 3v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 16"/><path d="M4 21v-5h5"/>',
  bookmark: '<path d="M7 4h10v17l-5-3.5L7 21z"/>',
  book: '<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z"/><path d="M5 20a2 2 0 0 0 2 1h12"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h7"/>',
  clip: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H5v16h14V5h-3"/><path d="M9 14l2 2 4-4"/>',
  chat: '<path d="M4 5h16v11H10l-6 4z"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 13h18"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  palette:
    '<path d="M12 3a9 9 0 0 0 0 18c1.6 0 2-1.2 1.6-2.2-.6-1.4.4-2.8 1.9-2.8H18a3 3 0 0 0 3-3c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="15.5" cy="8.5" r="1"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/><path d="M10 9a2 2 0 0 1 4 0"/>',
  hangul: '<path d="M4 6h7M7.5 6v12M4 18h7M14 5v14M14 12h6"/>',
  // série, ligue, profil
  share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4h11l-2.5 4L17 12H6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  hanger: '<path d="M12 7a2 2 0 1 1 2-2"/><path d="M12 7v2L3 16a1.5 1.5 0 0 0 1 2.6h16a1.5 1.5 0 0 0 1-2.6l-9-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  useradd: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  egg: '<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  hundred: '<path d="M5 8v8M9 8h3v8H9zM15 8h3v8h-3z"/>',
  feather: '<path d="M20 4C10 4 5 10 5 19"/><path d="M20 4c0 8-5 12-12 12"/>',
  tiger:
    '<circle cx="12" cy="13" r="7"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><path d="M10 12h.01M14 12h.01M10 16q2 1.5 4 0"/>',
};

/** Icône au trait, couleur héritée (currentColor). `fill` remplit la forme (flamme, gemme…). */
export function ic(name: string, size = 24, cls = "", sw = 2.4, fill = "none"): string {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.star}</svg>`;
}

/** Icône et couleur de chaque cours (tuiles du menu des langues, profil). */
export const COURSE_IC: Record<string, [string, string, string]> = {
  "en-daily": ["chat", "#22B573", "#178A57"],
  "en-pro": ["brief", "#FF9F1C", "#C2410C"],
  "en-toeic": ["target", "#7C4DFF", "#5A30D8"],
  "fr-volt": ["pencil", "#3D8BFF", "#1D5FC2"],
  "fr-fle": ["open", "#13A8A8", "#0C7F7F"],
  ko: ["hangul", "#E0457B", "#A8203F"],
};

/** Drapeau dessiné d'une section (en : Royaume-Uni, fr : France, ko : Corée). */
export function flagSvg(id: string, w = 34, h = 23, r = 6): string {
  let inner: string;
  if (id === "en")
    inner =
      '<rect width="30" height="20" fill="#2A4FA8"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4.4"/><path d="M0 0L30 20M30 0L0 20" stroke="#E0303F" stroke-width="1.6"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6.4"/><path d="M15 0V20M0 10H30" stroke="#E0303F" stroke-width="3.6"/>';
  else if (id === "fr")
    inner =
      '<rect width="10" height="20" fill="#2A5FD8"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#E8424F"/>';
  else {
    const g =
      '<g stroke="#2B2B2B" stroke-width="0.9" stroke-linecap="round"><path d="M-1.6 -1.2H1.6M-1.6 0H1.6M-1.6 1.2H1.6"/></g>';
    inner =
      '<rect width="30" height="20" fill="#F7F7F7"/>' +
      [
        [7.2, 5, -56],
        [22.8, 5, 56],
        [7.2, 15, 56],
        [22.8, 15, -56],
      ]
        .map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})">${g}</g>`)
        .join("") +
      '<path d="M10 10a5 5 0 0 1 10 0z" fill="#D8333F"/><path d="M10 10a5 5 0 0 0 10 0z" fill="#2A4FA8"/><circle cx="12.5" cy="10" r="2.5" fill="#D8333F"/><circle cx="17.5" cy="10" r="2.5" fill="#2A4FA8"/>';
  }
  return `<span class="flag" style="width:${w}px;height:${h}px;border-radius:${r}px"><svg width="${w}" height="${h}" viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true">${inner}</svg></span>`;
}

/** Coupe de ligue (verrouillée : grise avec un cadenas). */
export function trophySvg(c: string, d: string, w: number, lock = false): string {
  // coupe verrouillée : couleurs portées par des classes CSS (adaptées au thème sombre)
  const f = lock ? ' class="tlk"' : ` fill="${c}"`,
    k = lock ? ' class="tld"' : ` fill="${d}"`,
    s = lock ? "" : ` stroke="${d}"`;
  const deco = lock
    ? `<g transform="translate(50 38)"><circle r="7"${k}/><path d="M-3 4h6l-1.5 9h-3z"${k}/></g>`
    : '<path d="M30 22c4-4 12-6 20-6s16 2 20 6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-linecap="round"/><path d="M36 36l8 10 6-14 6 14 8-10" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>';
  return `<svg width="${w}" height="${Math.round(w * 1.1)}" viewBox="0 0 100 110" aria-hidden="true"${lock ? ' class="tlock"' : ""}><path d="M22 12h56v12c0 6 8 6 12 2 4 10-4 20-14 22-4 12-12 18-26 20-14-2-22-8-26-20-10-2-18-12-14-22 4 4 12 4 12-2z"${f}${s} stroke-width="5" stroke-linejoin="round"/>${deco}<path d="M44 68h12v14H44z"${k}/><rect x="28" y="82" width="44" height="12" rx="5"${f}${s} stroke-width="5"/><rect x="22" y="94" width="56" height="10" rx="4"${k}/></svg>`;
}

const MEDAL: Record<number, [string, string, string]> = {
  1: ["#FFC83D", "#C98B00", "#7A4E00"],
  2: ["#D5DCE8", "#8E9BB0", "#3E4A5E"],
  3: ["#EDB58A", "#B06A35", "#5A2E0E"],
};
/** Médaille de podium (1, 2 ou 3) avec son ruban. */
export function medalSvg(r: number): string {
  const [c, d, t] = MEDAL[r];
  return `<span class="medal" aria-label="${r}"><svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true"><path d="M9 26l-3 13 7-4 4 5 2-14zM25 26l3 13-7-4-4 5-2-14z" fill="${d}"/><circle cx="17" cy="16" r="14" fill="${c}" stroke="${d}" stroke-width="3"/></svg><span style="color:${t}">${r}</span></span>`;
}
