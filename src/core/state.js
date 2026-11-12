// État d'un profil (valeurs par défaut, migrations)
import { COURSES, UNIT_REMAP } from "../content/index.js";
import { NPU } from "./util.js";
import { R } from "../exercises/render.js";
import { NONFR, UI } from "../i18n/locale.js";

// ===================== ÉTAT =====================
export const KEY = "speakeasy-v1";
export const DEF = () => ({
  place: {},
  dn: {},
  genStories: {},
  listenOff: 0,
  lgSeen: "",
  koBest: 0,
  ext: {},
  st: {},
  genU: {},
  bank: {},
  elog: {},
  coach: {},
  voltBest: 0,
  freeze: 0,
  boostUntil: 0,
  infUntil: 0,
  owned: [],
  wear: "",
  stories: [],
  mockBest: 0,
  sec: UI === "en" ? "fr" : "en",
  track: { en: "en-daily", fr: NONFR ? "fr-fle" : "fr-volt", ko: "ko" },
  xp: 0,
  gems: 30,
  hearts: 5,
  hTs: Date.now(),
  streak: 0,
  lastDay: null,
  goal: 20,
  week: {},
  prog: {},
  mist: {},
  badges: [],
  lessons: 0,
  perfect: 0,
  spoke: 0,
  bestCombo: 0,
  sprint: 0,
  q: { day: null, l: 0, c: 0, s: 0, claimed: [] },
  set: { rate: 0.95, sound: true, auto: true, haptic: true, remind: 0, hideInstall: false },
  onb: false,
  speakOff: 0,
  ts: 0,
});
export function migrateProg(s) {
  if (s.pv >= 2) return;
  Object.keys(s.prog || {}).forEach(cid => {
    const C = COURSES[cid];
    if (!C) return;
    const p = s.prog[cid] || 0;
    const orig = C.units.filter(u => u.orig);
    const k = Math.floor(p / 5),
      rem = p % 5;
    if (k >= orig.length) {
      s.prog[cid] = (C.units.indexOf(orig[orig.length - 1]) + 1) * NPU;
    } else {
      const ni = C.units.indexOf(orig[k]);
      s.prog[cid] = ni * NPU + rem;
    }
  });
  s.pv = 3;
}
// Nouvelles unités insérées par niveau (v10) : on recale progression, couronnes, stats et erreurs
export function remapUnits(s, MI, only) {
  if (!MI && typeof UNIT_REMAP === "undefined") return;
  const UR = only ? Object.fromEntries(only.map(c => [c, 1])) : UNIT_REMAP;
  const mi =
    MI ||
    ((cid, u) => {
      const R = UNIT_REMAP[cid];
      if (!R || u === null || u === undefined || u === "x" || isNaN(+u)) return u;
      u = +u;
      return u < R.oldLen ? R.map[u] : u - R.oldLen + R.newLen;
    });
  const UNIT_REMAP_ = UR;
  Object.keys(s.prog || {}).forEach(cid => {
    if (!UNIT_REMAP_[cid]) return;
    const p = s.prog[cid] || 0;
    s.prog[cid] = mi(cid, Math.floor(p / NPU)) * NPU + (p % NPU);
  });
  Object.keys(s.ext || {}).forEach(cid => {
    if (!UNIT_REMAP_[cid]) return;
    s.ext[cid] = (s.ext[cid] || []).map(i => mi(cid, Math.floor(i / NPU)) * NPU + (i % NPU));
  });
  Object.keys(s.st || {}).forEach(cid => {
    const st = s.st[cid];
    if (!st || !UNIT_REMAP_[cid]) return;
    const nu = {};
    Object.entries(st.u || {}).forEach(([k, v]) => {
      nu[mi(cid, k)] = v;
    });
    st.u = nu;
    const nk = {};
    Object.entries(st.sk || {}).forEach(([k, v]) => {
      const i = k.indexOf("|");
      nk[mi(cid, k.slice(0, i)) + k.slice(i)] = v;
    });
    st.sk = nk;
    Object.values(st.r || {}).forEach(r => {
      if (r && r.u !== undefined) r.u = mi(cid, r.u);
    });
  });
  Object.keys(s.mist || {}).forEach(cid => {
    if (!UNIT_REMAP_[cid]) return;
    (s.mist[cid] || []).forEach(e => {
      if (e && e._u !== undefined) e._u = mi(cid, e._u);
    });
  });
}
