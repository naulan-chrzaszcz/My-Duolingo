// Mascotte Horang et ses tenues
import { S } from "../core/accounts.js";

// ===================== MASCOTTE (Horang, le petit tigre) =====================
export function mascot(mood = "happy", cls = "") {
  const mouth =
    {
      happy:
        '<path d="M50 79 Q60 90 70 79" stroke="#3D2B1F" stroke-width="3.5" fill="#FF8A8A" stroke-linecap="round"/>',
      sad: '<path d="M50 86 Q60 77 70 86" stroke="#3D2B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
      wow: '<ellipse cx="60" cy="83" rx="5.5" ry="7" fill="#3D2B1F"/>',
      calm: '<path d="M52 80 Q60 85 68 80" stroke="#3D2B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    }[mood] || "";
  const eyes =
    mood === "happy" && cls.includes("dance")
      ? '<path d="M37 58 Q44 51 51 58" stroke="#3D2B1F" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M69 58 Q76 51 83 58" stroke="#3D2B1F" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : '<g class="eye"><circle cx="44" cy="58" r="7.5" fill="#3D2B1F"/><circle cx="46.5" cy="55" r="2.6" fill="#fff"/></g><g class="eye"><circle cx="76" cy="58" r="7.5" fill="#3D2B1F"/><circle cx="78.5" cy="55" r="2.6" fill="#fff"/></g>';
  const tear = mood === "sad" ? '<path d="M84 66 Q87 73 84 76 Q81 73 84 66Z" fill="#7CC4FF"/>' : "";
  const acc = typeof S !== "undefined" && S && S.wear && ACCS[S.wear] ? ACCS[S.wear].svg : "";
  return `<svg class="mascot ${cls}" viewBox="0 0 120 120" aria-hidden="true"><circle cx="25" cy="30" r="15" fill="#FF9F1C"/><circle cx="25" cy="30" r="8" fill="#FFE1BF"/><circle cx="95" cy="30" r="15" fill="#FF9F1C"/><circle cx="95" cy="30" r="8" fill="#FFE1BF"/><circle cx="60" cy="64" r="47" fill="#FF9F1C"/><path d="M60 17 L53 33 L60 30 L67 33Z M44 21 L44 33 L49 31Z M76 21 L76 33 L71 31Z" fill="#3D2B1F"/><path d="M13 55 L29 59 L13 64Z M107 55 L91 59 L107 64Z M15 72 L28 72 L17 78Z M105 72 L92 72 L103 78Z" fill="#3D2B1F"/><ellipse cx="60" cy="82" rx="27" ry="20" fill="#FFF6EC"/>${eyes}<path d="M54 71 Q60 66 66 71 Q60 77 54 71Z" fill="#3D2B1F"/><circle cx="33" cy="76" r="6" fill="#FF6B6B" opacity=".35"/><circle cx="87" cy="76" r="6" fill="#FF6B6B" opacity=".35"/>${mouth}${tear}${acc}</svg>`;
}
export const ACCS = {
  hat: {
    n: "Chapeau haut-de-forme",
    ic: "🎩",
    p: 100,
    svg: '<rect x="38" y="0" width="44" height="24" rx="3" fill="#2B2850"/><rect x="38" y="14" width="44" height="6" fill="#E0457B"/><rect x="26" y="21" width="68" height="7" rx="3.5" fill="#2B2850"/>',
  },
  glasses: {
    n: "Lunettes stylées",
    ic: "🕶️",
    p: 120,
    svg: '<g stroke="#2B2850" stroke-width="3.5" fill="rgba(124,77,255,.28)"><circle cx="44" cy="58" r="11"/><circle cx="76" cy="58" r="11"/></g><g stroke="#2B2850" stroke-width="3.5" fill="none" stroke-linecap="round"><path d="M55 56 Q60 52 65 56"/><path d="M33 55 L17 50 M87 55 L103 50"/></g>',
  },
  scarf: {
    n: "Écharpe d'hiver",
    ic: "🧣",
    p: 80,
    svg: '<path d="M24 100 Q60 120 96 100 L97 110 Q60 128 23 110Z" fill="#FF4F5E"/><rect x="72" y="106" width="13" height="14" rx="3" fill="#E0457B"/>',
  },
  phones: {
    n: "Casque audio",
    ic: "🎧",
    p: 150,
    svg: '<path d="M17 62 Q15 12 60 12 Q105 12 103 62" fill="none" stroke="#2B2850" stroke-width="7" stroke-linecap="round"/><rect x="6" y="50" width="17" height="28" rx="8" fill="#3D8BFF"/><rect x="97" y="50" width="17" height="28" rx="8" fill="#3D8BFF"/>',
  },
  crown: {
    n: "Couronne royale",
    ic: "👑",
    p: 300,
    svg: '<path d="M35 24 L40 3 L51 15 L60 -1 L69 15 L80 3 L85 24Z" fill="#FFC83D" stroke="#DFA300" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="14" r="3.5" fill="#FF4F5E"/><circle cx="45" cy="18" r="2.5" fill="#3D8BFF"/><circle cx="75" cy="18" r="2.5" fill="#22B573"/>',
  },
  flower: {
    n: "Fleur de cerisier",
    ic: "🌸",
    p: 60,
    svg: '<g transform="translate(88 24)"><circle cx="0" cy="-8" r="7" fill="#FFB6D2"/><circle cx="8" cy="-2" r="7" fill="#FFB6D2"/><circle cx="5" cy="8" r="7" fill="#FFB6D2"/><circle cx="-5" cy="8" r="7" fill="#FFB6D2"/><circle cx="-8" cy="-2" r="7" fill="#FFB6D2"/><circle r="4" fill="#FFC83D"/></g>',
  },
};
