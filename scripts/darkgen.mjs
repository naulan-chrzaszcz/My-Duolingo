// Génère le thème sombre à partir des couleurs du thème clair (style.css).
// Chaque couleur claire connue est remplacée par son équivalent sombre, propriété par propriété.
// Pour ajuster le thème sombre : modifier les tables ci-dessous (couleur claire -> couleur sombre).
const SURF = '#211D33', SOFT = '#2B2643', SOFT2 = '#332D4F';
const BG = {
  '#FFF': SURF, '#FFFFFF': SURF, '#FBFAFF': '#1C192C', '#F7F3FF': SOFT, '#F3EEFF': SOFT, '#EEE9FF': SOFT2, '#EFE9FF': SOFT, '#E9E2FF': '#2E2750', '#E2DAFF': '#3A3166', '#C9B8FF': '#5A48A8', '#E7E3F7': SOFT2, '#FFE7C2': '#4A3312', '#FFF7DB': '#3A3118', '#EAF4FF': '#1B2A45', '#F0EBFF': SOFT, '#F1EEFB': SOFT, '#F1EFF7': SOFT,
  '#EEEAF6': SOFT, '#EEEAF9': SOFT, '#E7DEFF': '#3A3166', '#E3E0EF': '#3A3556', '#E6E3F1': '#2E2A45', '#E7E3F3': SOFT2, '#DCD8EA': '#3A3556', '#EEE': SOFT2,
  '#FFF4CC': '#3A3118', '#FFF6D6': '#3A3118', '#FFF7DB': '#3A3118', '#FFFDF5': '#2E2816', '#FFE9A8': '#4A3B12', '#FFE1E1': '#43202A', '#FFE9F3': '#3D1F33',
  '#FFC2C8': '#5A2530', '#DDF7E6': '#163A2A', '#EAF2FF': '#1B2A45', '#2B2850': '#3A3560', '#4A3A8C': '#5A48A8',
};
const BORDER = {
  '#FFF': SURF, '#CDBEFF': '#4A3F80', '#D9CCFF': '#4A3F80', '#D9D2F2': '#3A3556', '#EEE9FF': '#3A3556', '#EEEAF6': '#3A3556', '#F2EFFA': '#2E2A45',
  '#B9A2FF': '#7C5CE0', '#9C7BFF': '#8B6BFF', '#F1E6C2': '#5A4A20', '#F5D98B': '#6B5520', '#FFE49A': '#6B5520',
};
const SHADOW = {
  '#CDBEFF': '#120F20', '#D2CEE4': '#120F20', '#DAD5EC': '#120F20', '#DCCFFF': '#120F20', '#EEE9FF': '#2E2A45', '#CBC7DD': '#120F20',
  '#9FE6C3': '#1E6B47', '#FFB3BB': '#7A2632', '#1C1838': '#05040A',
};
const TEXT = {
  '#2B2850': '#ECEAF8', '#9A3412': '#FFB27A', '#ECE9F6': '#332D4F', '#C9C4DD': '#4E4772', '#5A30D8': '#B9A2FF', '#7A3E00': '#FFC98A', '#625E86': '#B8B3D8', '#4A4670': '#C9C5E6', '#1D6FD8': '#7FB2FF', '#5B5480': '#B8B3D8', '#5A3D00': '#F5D27A', '#7A5B00': '#F5D27A', '#147A3D': '#5FE3A5', '#B3261E': '#FF8A92',
  '#A9A4C2': '#7E7A9E', '#ADA8C8': '#77739A', '#B3AECB': '#7E7A9E',
};
const TSHADOW = { '#FFF': '#000' };
const RGBA = { 'rgba(246,244,255,.92)': 'rgba(23,20,36,.92)' };
const VARS = ':root{--bg:#15121F;--card:#211D33;--ink:#ECEAF8;--muted:#9C98BE;--line:#3A3556;--okbg:#163A2A;--badbg:#43202A;--soft:#2B2643;--lockc:#3A3556;--ink2:#B8B3D8;color-scheme:dark}';

function cat(p) {
  if (p.startsWith('background')) return BG;
  if (p.startsWith('border') || p === 'outline' || p === 'outline-color') return BORDER;
  if (p === 'box-shadow') return SHADOW;
  if (['color', 'fill', 'stroke', '-webkit-text-fill-color'].includes(p)) return TEXT;
  if (p === 'text-shadow') return TSHADOW;
  return null;
}
function fix(p, v) {
  const m = cat(p);
  if (!m) return null;
  let nv = v.replace(/#[0-9A-Fa-f]{3,8}\b/g, h => m[h.toUpperCase()] ?? h);
  for (const [a, b] of Object.entries(RGBA)) nv = nv.split(a).join(b);
  if (m === BG) nv = nv.split('var(--ink)').join('#3A3560');
  return nv !== v ? nv : null;
}
// règles : [conditions @ englobantes, sélecteur, déclarations]
function parse(css) {
  const out = []; const stack = []; let buf = '';
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      const head = buf.trim(); buf = '';
      if (head.startsWith('@')) stack.push(head);
      else { const j = css.indexOf('}', i); out.push([[...stack], head, css.slice(i + 1, j)]); i = j; }
      continue;
    }
    if (ch === '}') { if (stack.length) stack.pop(); buf = ''; continue; }
    buf += ch;
  }
  return out;
}
function splitDecls(d) {
  const parts = []; let depth = 0, cur = '';
  for (const ch of d) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.filter(p => p.includes(':')).map(p => { const k = p.indexOf(':'); return [p.slice(0, k), p.slice(k + 1)]; });
}
export function darkCss(css) {
  const auto = [], force = [];
  for (const [st, sel, d] of parse(css)) {
    if (st.some(s => s.startsWith('@keyframes') || s.startsWith('@font-face')) || sel.startsWith(':root')) continue;
    const dl = splitDecls(d);
    const colored = dl.some(([p, v]) => p.trim().startsWith('background') && /var\(--(gold|ok|pri|bad|orange|blue)|gradient/.test(v));
    const add = [];
    for (let [p, v] of dl) {
      p = p.trim();
      if (colored && cat(p) === TEXT) continue;
      const nv = fix(p, v.trim());
      if (nv) add.push(`${p}:${nv}`);
    }
    if (!add.length) continue;
    const body = add.join(';');
    const sels = sel.split(/,(?![^(]*\))/).map(s => s.trim());
    const conds = st.filter(s => s.startsWith('@media')).map(s => s.slice(6).trim());
    const wrap = w => sels.map(s => s.startsWith('html') ? s.replace('html', w) : `${w} ${s}`).join(',');
    const A = wrap(':where(html:not([data-theme=light]))');
    const F = wrap(':where(html[data-theme=dark])');
    auto.push(`@media ${['(prefers-color-scheme:dark)', ...conds].join(' and ')}{${A}{${body}}}`);
    force.push(conds.length ? `@media ${conds.join(' and ')}{${F}{${body}}}` : `${F}{${body}}`);
  }
  const vA = VARS.replace(':root', 'html:not([data-theme=light])');
  const vF = VARS.replace(':root', 'html[data-theme=dark]');
  const GOOD = ['.good .ftxt h3', '.good .fsol', '.spotw.good', '.opt.good'];
  const BAD = ['.bad .ftxt h3', '.bad .fsol', '.spotw.bad', '.opt.bad'];
  const pre = (w, l) => l.map(x => `${w} ${x}`).join(',');
  const wa = ':where(html:not([data-theme=light]))', wf = ':where(html[data-theme=dark])';
  const extraA = `@media (prefers-color-scheme:dark){${pre(wa, GOOD)}{color:#5FE3A5}${pre(wa, BAD)}{color:#FF8A92}}`;
  const extraF = `${pre(wf, GOOD)}{color:#5FE3A5}${pre(wf, BAD)}{color:#FF8A92}`;
  return '/* ===== Thème sombre (généré par scripts/darkgen.mjs) ===== */\n:root{color-scheme:light dark}\nhtml[data-theme=light]{color-scheme:only light}\n'
    + `@media (prefers-color-scheme:dark){${vA}}\n${vF}\n` + auto.join('\n') + '\n' + force.join('\n') + '\n' + extraA + '\n' + extraF + '\n';
}
