// Progression : étapes faites, unités ouvertes, prochaine étape
import { COURSES, HANGUL_UNITS, UNIT_REMAP, V9 } from "../content/index.js";
import { S, set_S } from "./accounts.js";
import { DEF, migrateProg, remapUnits } from "./state.js";
import { NPU } from "./util.js";
import { R } from "../exercises/render.js";
import { BASE_UNITS } from "../features/ai-units.js";

// ---- Parcours hybride : chaque étape est cochée individuellement ----
export const FULL = (1 << NPU) - 1;
// Comptes v9 : on coche les unités d'AVANT l'ajout des nouvelles unités (elles restent à faire, au lieu d'apparaître terminées)
// Ordre des unités connu par le profil : si du contenu est ajouté plus tard, on recale tout par titre d'unité
export function baseReady() {
  try {
    return !!BASE_UNITS;
  } catch (e) {
    return false;
  }
}
export function layNow(s, cid) {
  return (BASE_UNITS[cid] || COURSES[cid].units).concat((s.genU && s.genU[cid]) || []).map(u => u.t0 || u.t);
}
export function relayout(s) {
  s.lay = s.lay || {};
  Object.keys(COURSES).forEach(cid => {
    const cur = layNow(s, cid),
      old = s.lay[cid];
    if (old && old.join("\n") !== cur.join("\n")) {
      const used = new Set();
      const map = old.map(t => {
        let k = -1;
        for (let i = 0; i < cur.length; i++)
          if (cur[i] === t && !used.has(i)) {
            k = i;
            break;
          }
        if (k >= 0) used.add(k);
        return k;
      });
      const mi = (c, u) => {
        if (u === null || u === undefined || u === "x" || isNaN(+u)) return u;
        const k = map[+u];
        return k === undefined || k < 0 ? +u : k;
      };
      const d = s.dn && s.dn[cid];
      if (d) {
        const nd = {};
        Object.entries(d).forEach(([u, m]) => {
          const k = mi(cid, u);
          nd[k] = (nd[k] || 0) | m;
        });
        s.dn[cid] = nd;
      }
      remapUnits(s, mi, [cid]);
    }
    s.lay[cid] = cur;
  });
}
export function dnFromOld(s) {
  Object.keys(s.prog || {}).forEach(cid => {
    const p = s.prog[cid] || 0;
    if (!p) return;
    const R = typeof UNIT_REMAP !== "undefined" && UNIT_REMAP[cid];
    const k = Math.floor(p / NPU),
      r = p % NPU;
    const d = (s.dn[cid] = s.dn[cid] || {});
    for (let u = 0; u <= k; u++) {
      const nu = R ? (u < R.oldLen ? R.map[u] : u - R.oldLen + R.newLen) : u;
      if (nu == null || nu < 0) continue;
      const mask = u < k ? FULL : (1 << r) - 1;
      if (mask) d[nu] = (d[nu] || 0) | mask;
    }
  });
}
// Comptes v10 (compteur linéaire déjà converti) : tout ce qui précède la position est fait
export function dnFromLinear(s) {
  Object.keys(s.prog || {}).forEach(cid => {
    const p = s.prog[cid] || 0;
    const d = (s.dn[cid] = s.dn[cid] || {});
    for (let u = 0; u * NPU < p; u++) {
      const m = Math.min(NPU, p - u * NPU);
      d[u] = (d[u] || 0) | (m >= NPU ? FULL : (1 << m) - 1);
    }
  });
}
export const dnMask = (cid, u) => (S.dn[cid] || {})[u] || 0;
export const isDone = (cid, u, n) => !!(dnMask(cid, u) & (1 << n));
export const unitSteps = (cid, u) => {
  let m = dnMask(cid, u),
    c = 0;
  while (m) {
    c += m & 1;
    m >>>= 1;
  }
  return c;
};
export const unitComplete = (cid, u) => isDone(cid, u, NPU - 1);
export function setDone(cid, u, n) {
  S.dn[cid] = S.dn[cid] || {};
  S.dn[cid][u] = (S.dn[cid][u] || 0) | (1 << n);
  syncProg(cid);
}
export function doneCount(cid) {
  return Object.keys(S.dn[cid] || {}).reduce((a, u) => a + unitSteps(cid, +u), 0);
}
// Coréen : les 4 unités de hangul se font dans l'ordre ; le reste s'ouvre une fois le hangul validé
export function hgIdx(cid) {
  return cid === "ko" ? COURSES.ko.units.map((u, i) => (u.hg ? i : -1)).filter(i => i >= 0) : [];
}
export function hgDone(cid) {
  return hgIdx(cid).every(i => unitComplete(cid, i));
}
export function unitOpen(cid, u) {
  const U = COURSES[cid].units[u];
  if (!U) return false;
  if (cid !== "ko") return true;
  const hg = hgIdx(cid);
  if (U.hg) {
    const k = hg.indexOf(u);
    return k <= 0 || unitComplete(cid, hg[k - 1]);
  }
  return hgDone(cid);
}
export function stepOpen(cid, u, n) {
  return unitOpen(cid, u) && (n === 0 || isDone(cid, u, n - 1) || isDone(cid, u, n));
}
// Étape conseillée : la première unité ouverte, dans l'ordre du parcours, qui n'est pas terminée
export function nextStep(cid) {
  const C = COURSES[cid];
  const pl = Math.min(3, (S.place && S.place[cid]) || 0);
  for (const pass of [0, 1])
    for (let u = 0; u < C.units.length; u++) {
      if (!unitOpen(cid, u) || unitComplete(cid, u)) continue;
      if (!pass && C.units[u].lv < pl && !unitSteps(cid, u)) continue;
      for (let n = 0; n < NPU; n++) if (!isDone(cid, u, n)) return { u, n };
    }
  return null;
}
export function curLevel(cid) {
  const ns = nextStep(cid);
  const C = COURSES[cid];
  return ns ? C.units[ns.u].lv : 3;
}
// Compatibilité (badges, anciennes versions) : prog = index de l'étape conseillée
export function syncProg(cid) {
  const ns = nextStep(cid);
  S.prog[cid] = ns ? ns.u * NPU + ns.n : COURSES[cid].units.length * NPU;
}
export function hydrate(o) {
  const d = DEF();
  const s = Object.assign(d, o || {});
  ["owned", "stories", "badges"].forEach(k => {
    if (!Array.isArray(s[k])) s[k] = [];
  });
  ["place", "dn", "genStories", "ext", "st", "genU", "bank", "elog", "coach", "mist", "prog", "week"].forEach(k => {
    if (!s[k] || typeof s[k] !== "object") s[k] = {};
  });
  if (s.pv === 2) {
    if (s.prog.ko) s.prog.ko += HANGUL_UNITS.length * 6;
    s.pv = 3;
  }
  if (s.pv === 3) {
    Object.keys(s.prog).forEach(c => {
      const p = s.prog[c] || 0;
      s.prog[c] = Math.floor(p / 6) * NPU + (p % 6) * 3;
    });
    s.pv = 4;
  } else if (!s.pv && o && o.prog && Object.keys(o.prog).length) migrateProg(s);
  else if (!s.pv) s.pv = 4;
  if (s.pv === 3) {
    Object.keys(s.prog).forEach(c => {
      const p = s.prog[c] || 0;
      s.prog[c] = Math.floor(p / 6) * NPU + (p % 6) * 3;
    });
    s.pv = 4;
  }
  let fromOld = false;
  if (s.pv === 4) {
    dnFromOld(s);
    remapUnits(s);
    s.pv = 6;
    fromOld = true;
  }
  if (s.pv === 5) {
    dnFromLinear(s);
    s.pv = 6;
  }
  if (baseReady()) {
    if (!s.lay && !fromOld) {
      s.lay = {};
      Object.keys(COURSES).forEach(cid => {
        s.lay[cid] = layNow(s, cid).filter(t => !(typeof V9 !== "undefined" && (V9[cid] || []).some(u => u.t === t)));
      });
    }
    relayout(s);
  }
  try {
    const keep = S;
    set_S(s);
    Object.keys(COURSES).forEach(syncProg);
    set_S(keep);
  } catch (e) {}
  s.set = Object.assign(DEF().set, s.set || {});
  s.q = Object.assign(DEF().q, s.q || {});
  s.track = Object.assign(DEF().track, s.track || {});
  return s;
}
