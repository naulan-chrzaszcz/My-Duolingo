// Scènes de Horang le long du parcours (v29) : Horang en entier, dans une petite situation du quotidien.
// Dessins originaux en SVG (aucun personnage d'une autre application).

const OR = "#FF9F1C",
  INK = "#3D2B1F",
  CREAM = "#FFF6EC";

/** Tête de Horang (repère 120 × 120). eyes : "open" | "closed" | "happy". */
function head(eyes: "open" | "closed" | "happy", mouth: "smile" | "o" | "calm" = "smile"): string {
  const e =
    eyes === "closed"
      ? `<path d="M37 59 Q44 64 51 59" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M69 59 Q76 64 83 59" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : eyes === "happy"
        ? `<path d="M37 59 Q44 52 51 59" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M69 59 Q76 52 83 59" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        : `<circle cx="44" cy="58" r="7.5" fill="${INK}"/><circle cx="46.5" cy="55" r="2.6" fill="#fff"/><circle cx="76" cy="58" r="7.5" fill="${INK}"/><circle cx="78.5" cy="55" r="2.6" fill="#fff"/>`;
  const m =
    mouth === "o"
      ? `<ellipse cx="60" cy="83" rx="5" ry="6" fill="${INK}"/>`
      : mouth === "calm"
        ? `<path d="M52 80 Q60 85 68 80" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
        : `<path d="M50 79 Q60 90 70 79" stroke="${INK}" stroke-width="3.5" fill="#FF8A8A" stroke-linecap="round"/>`;
  return `<circle cx="25" cy="30" r="15" fill="${OR}"/><circle cx="25" cy="30" r="8" fill="#FFE1BF"/><circle cx="95" cy="30" r="15" fill="${OR}"/><circle cx="95" cy="30" r="8" fill="#FFE1BF"/><circle cx="60" cy="64" r="47" fill="${OR}"/><path d="M60 17 L53 33 L60 30 L67 33Z M44 21 L44 33 L49 31Z M76 21 L76 33 L71 31Z" fill="${INK}"/><path d="M13 55 L29 59 L13 64Z M107 55 L91 59 L107 64Z" fill="${INK}"/><ellipse cx="60" cy="82" rx="27" ry="20" fill="${CREAM}"/>${e}<path d="M54 71 Q60 66 66 71 Q60 77 54 71Z" fill="${INK}"/><circle cx="33" cy="76" r="6" fill="#FF6B6B" opacity=".35"/><circle cx="87" cy="76" r="6" fill="#FF6B6B" opacity=".35"/>${m}`;
}
/** Corps assis (repère 160 × 170), tête posée dessus. */
function body(): string {
  return `<ellipse cx="80" cy="162" rx="46" ry="7" fill="rgba(43,40,80,.12)"/><ellipse cx="80" cy="128" rx="40" ry="34" fill="${OR}"/><ellipse cx="80" cy="134" rx="24" ry="22" fill="${CREAM}"/><path d="M44 116 l12 4 M44 130 l11 2 M116 116 l-12 4 M116 130 l-11 2" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><ellipse cx="58" cy="158" rx="14" ry="8" fill="${OR}"/><ellipse cx="102" cy="158" rx="14" ry="8" fill="${OR}"/>`;
}
const wrap = (inner: string, cls = "") =>
  `<svg class="hscene ${cls}" viewBox="0 0 160 170" aria-hidden="true">${inner}</svg>`;
const headAt = (h: string, tilt = 0) => `<g transform="translate(26 0) scale(.9) rotate(${tilt} 60 64)">${h}</g>`;

/** Les scènes disponibles, dans l'ordre où elles apparaissent sur le parcours. */
export const SCENES: Array<() => string> = [
  // Horang mange un bol de riz avec des baguettes
  () =>
    wrap(
      body() +
        `<path d="M50 120 h60 a30 22 0 0 1 -60 0z" fill="#3D8BFF"/><path d="M50 120 h60" stroke="#1D5FC2" stroke-width="4" stroke-linecap="round"/><ellipse cx="80" cy="118" rx="28" ry="8" fill="#FFFFFE"/><circle cx="72" cy="114" r="4" fill="#FFFFFE"/><circle cx="86" cy="113" r="5" fill="#FFFFFE"/><path d="M98 92 L120 72 M102 96 L126 80" stroke="#8A5224" stroke-width="4" stroke-linecap="round"/><circle cx="46" cy="122" r="9" fill="${OR}"/><circle cx="114" cy="122" r="9" fill="${OR}"/>` +
        headAt(head("happy", "o"), -4),
    ),
  // Horang fait la sieste
  () =>
    wrap(
      body() +
        `<circle cx="52" cy="124" r="9" fill="${OR}"/><circle cx="108" cy="124" r="9" fill="${OR}"/>` +
        headAt(head("closed", "calm"), 12) +
        `<g class="zz" fill="#7C4DFF" font-family="Nunito,system-ui,sans-serif" font-weight="900"><text x="122" y="30" font-size="20">z</text><text x="136" y="16" font-size="14">z</text></g>`,
      "sleep",
    ),
  // Horang lit un livre
  () =>
    wrap(
      body() +
        `<path d="M48 104 L80 112 L112 104 L112 140 L80 148 L48 140 Z" fill="#FFFFFE" stroke="#7C4DFF" stroke-width="4" stroke-linejoin="round"/><path d="M80 112 V148" stroke="#7C4DFF" stroke-width="3"/><path d="M56 116 h16 M56 124 h16 M88 116 h16 M88 124 h16" stroke="#C9C4DD" stroke-width="3" stroke-linecap="round"/><circle cx="46" cy="126" r="9" fill="${OR}"/><circle cx="114" cy="126" r="9" fill="${OR}"/>` +
        headAt(head("open", "calm"), 6),
    ),
  // Horang écoute de la musique
  () =>
    wrap(
      body() +
        `<circle cx="48" cy="118" r="9" fill="${OR}"/><circle cx="112" cy="118" r="9" fill="${OR}"/>` +
        headAt(
          head("happy") +
            `<path d="M14 62 Q14 8 60 8 Q106 8 106 62" stroke="#2B2850" stroke-width="7" fill="none"/><rect x="4" y="54" width="18" height="28" rx="8" fill="#E0457B"/><rect x="98" y="54" width="18" height="28" rx="8" fill="#E0457B"/>`,
          -6,
        ) +
        `<g fill="#7C4DFF"><path d="M134 40 v18 a5 5 0 1 1 -3 -4.5 V44 l10 -3 v14 a5 5 0 1 1 -3 -4.5 V40z"/></g>`,
      "music",
    ),
  // Horang boit un café
  () =>
    wrap(
      body() +
        `<rect x="66" y="106" width="30" height="30" rx="6" fill="#FFFFFE" stroke="#C2410C" stroke-width="4"/><path d="M96 114 q12 0 12 9 q0 9 -12 9" stroke="#C2410C" stroke-width="4" fill="none"/><path d="M74 98 q4 -6 0 -12 M86 98 q4 -6 0 -12" stroke="#C9C4DD" stroke-width="3" fill="none" stroke-linecap="round" class="steam"/><circle cx="62" cy="122" r="9" fill="${OR}"/><circle cx="104" cy="126" r="9" fill="${OR}"/>` +
        headAt(head("open", "smile"), -3),
    ),
  // Horang salue avec un drapeau
  () =>
    wrap(
      body() +
        `<path d="M118 60 V132" stroke="#8A5224" stroke-width="4" stroke-linecap="round"/><path d="M118 60 h28 l-6 9 6 9 h-28z" fill="#22B573"/><circle cx="48" cy="124" r="9" fill="${OR}"/><circle cx="118" cy="120" r="9" fill="${OR}"/>` +
        headAt(head("happy", "smile"), -8),
      "wave",
    ),
];
/** Scène n° i (les scènes tournent). */
export function horangScene(i: number): string {
  return SCENES[((i % SCENES.length) + SCENES.length) % SCENES.length]();
}
