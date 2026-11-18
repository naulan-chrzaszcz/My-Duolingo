// Contenu des cours (JSON) adapté à la langue d'interface : à importer partout à la place de data.js
import { COURSES, HANGUL_UNITS, LEVELS, PH_IMG, REAL_PH, SECTIONS, STORIES, UNIT_REMAP, V9 } from "./data.js";
import { EN_TXT } from "../i18n/dict-en.js";
import { KO_TXT } from "../i18n/dict-ko.js";
import { UI } from "../i18n/locale.js";

export { LEVELS, SECTIONS, COURSES, STORIES, UNIT_REMAP, REAL_PH, PH_IMG, HANGUL_UNITS, V9 };
// Mots français du cours FLE, gardés même quand l'interface française retire ce cours :
// ils servent de mauvaises réponses aux « mots à retenir » de la section Voltaire, qui n'a pas de vocabulaire
export const FR_WORDS = (COURSES["fr-fle"] ? COURSES["fr-fle"].units : []).flatMap(U => (U.v || []).map(v => v[1]));
// ---- Contenus : titre d'origine gardé comme clé stable, puis version anglaise ----
(function () {
  Object.values(COURSES).forEach(C =>
    C.units.forEach(U => {
      if (!U.t0) U.t0 = U.t;
    }),
  );
  if (UI === "fr") {
    // interface française : le parcours « Learn French » s'adresse aux non-francophones
    delete COURSES["fr-fle"];
    STORIES.fr = STORIES.fr.filter(s => !s.fle);
    return;
  }
  if (UI === "ko") {
    KO_APPLY();
    return;
  }
  const T = s => (typeof s === "string" && Object.prototype.hasOwnProperty.call(EN_TXT, s) ? EN_TXT[s] : s);
  ["ko", "fr-volt"].forEach(cid =>
    COURSES[cid].units.forEach(U => {
      U.t = T(U.t);
      U.d = T(U.d);
      U.tip = T(U.tip);
      (U.parts || []).forEach(P => {
        P.t = T(P.t);
      });
      (U.hj || []).forEach(h => {
        h[1] = T(h[1]);
      });
      (U.p || []).forEach(p => {
        p[0] = T(p[0]);
      });
      (U.v || []).forEach(v => {
        v[0] = T(v[0]);
      });
      (U.c || []).forEach(c => {
        c[0] = T(c[0]);
        c[1] = c[1].map(T);
        c[3] = T(c[3]);
      });
    }),
  );
  Object.values(STORIES).forEach(a =>
    a.forEach(st => {
      st.t = T(st.t);
      st.items.forEach(it => {
        if (it.q !== undefined) {
          it.q = T(it.q);
          it.o = it.o.map(T);
        } else if (it.fr) it.fr = T(it.fr);
      });
    }),
  );
  LEVELS.splice(0, LEVELS.length, "Easy", "Intermediate", "Advanced", "Expert");
  const en = SECTIONS.findIndex(s => s.id === "en");
  if (en >= 0) SECTIONS.splice(en, 1);
  const fr = SECTIONS.find(s => s.id === "fr");
  fr.name = "French";
  fr.tracks = ["fr-fle", "fr-volt"];
  const ko = SECTIONS.find(s => s.id === "ko");
  ko.name = "Korean";
  COURSES["fr-volt"].name = "Voltaire spelling";
  COURSES.ko.name = "Korean";
  try {
    document.title = "Speakeasy — French & Korean";
    document.documentElement.lang = "en";
  } catch (e) {}
})();
// ---- Version coréenne : explications des parcours anglais, Voltaire et « Apprendre le français » ----
export function KO_APPLY() {
  const has = (o, k) => typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);
  const T = s => (has(KO_TXT, s) ? KO_TXT[s] : has(EN_TXT, s) ? EN_TXT[s] : s);
  const cids = ["en-daily", "en-pro", "en-toeic", "fr-volt", "fr-fle"];
  cids.forEach(cid => {
    const C = COURSES[cid];
    if (!C) return;
    C.name = T(C.name);
    C.units.forEach(U => {
      U.t = T(U.t0 || U.t);
      U.d = T(U.d);
      U.tip = T(U.tip);
      (U.parts || []).forEach(P => {
        P.t = T(P.t);
      });
      (U.p || []).forEach(p => {
        p[0] = T(p[0]);
      });
      (U.v || []).forEach(v => {
        v[0] = T(v[0]);
      });
      (U.c || []).forEach(c => {
        c[3] = T(c[3]);
      });
      (U.ph || []).forEach(p => {
        p[1] = T(p[1]);
      });
      if (U.wt) U.wt = U.wt.map(T);
      ["cv", "rd"].forEach(k =>
        (U[k] || []).forEach(x =>
          (x.q || []).forEach(q => {
            q[3] = T(q[3]);
          }),
        ),
      );
    });
  });
  STORIES.fr = STORIES.fr.filter(s => s.fle);
  STORIES.en.forEach(st => {
    st.t = T(st.t);
    st.items.forEach(it => {
      if (it.q === undefined && it.fr) it.fr = T(it.fr);
    });
  });
  STORIES.fr.forEach(st => {
    st.items.forEach(it => {
      if (it.q !== undefined) {
        it.q = T(it.q);
        it.o = it.o.map(T);
      } else if (it.fr) it.fr = T(it.fr);
    });
  });
  LEVELS.splice(0, LEVELS.length, "쉬움", "중급", "고급", "전문가");
  const ko = SECTIONS.findIndex(s => s.id === "ko");
  if (ko >= 0) SECTIONS.splice(ko, 1);
  const en = SECTIONS.find(s => s.id === "en");
  if (en) en.name = "영어";
  const fr = SECTIONS.find(s => s.id === "fr");
  if (fr) {
    fr.name = "프랑스어";
    fr.tracks = ["fr-fle", "fr-volt"];
  }
  try {
    document.title = "Speakeasy — 영어 · 프랑스어";
    document.documentElement.lang = "ko";
  } catch (e) {}
}
