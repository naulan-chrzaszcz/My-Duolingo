// Écran Entraînement et ses cartes
import { COURSES, REAL_PH } from "../content/index.js";
import { S, save } from "../core/accounts.js";
import { unitOpen } from "../core/progress.js";
import { $, esc, shuffle } from "../core/util.js";
import { TEMPL, ctxFor, make } from "../exercises/generate.js";
import { HG_T } from "../exercises/hangul.js";
import { errStats, startBilan, startCoach } from "../features/coach.js";
import { notionPicker } from "../features/grammar.js";
import { placeEstimate, placeIntro } from "../features/placement.js";
import { themePicker } from "../features/theme-training.js";
import { bankDue, bankView } from "../features/word-bank.js";
import { unlockedUnits } from "../lesson/build.js";
import { PIC_WORDS, hasPic } from "../ui/pics.ts";
import { dueCount, openSession } from "../lesson/engine.js";
import { myWords } from "./profile.js";
import { startAI } from "../services/ai.js";
import { beep, say } from "../services/speech.js";
import { ic } from "../ui/icons.ts";
import { mascot } from "../ui/mascot.js";
import { curCid, curSec, renderAll } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";

const OR = "#FF9F1C",
  BL = "#3D8BFF",
  VI = "#7C4DFF",
  GR = "#22B573",
  PK = "#E0457B",
  GO = "#FFB020",
  TE = "#13A8A8";
/** Rubriques de l'écran Entraînement, dans l'ordre d'affichage. */
const TGROUPS = ["Hangul", "Révisions", "Grammaire", "Écoute & oral", "Vocabulaire", "Examens", "Défis & IA"];
/** Titre de carte → [rubrique, icône, couleur]. Une carte absente de la table va dans « Défis & IA ». */
const TMAP = {
  "Alphabet hangul": ["Hangul", "hangul", PK],
  "Sons proches (가 / 카 / 까)": ["Hangul", "ear", TE],
  "Compose les syllabes": ["Hangul", "layers", VI],
  "Tableau du hangul": ["Hangul", "grid", BL],
  "Mes erreurs (ancrage)": ["Révisions", "repeat", OR],
  "Mes mots à retenir": ["Révisions", "bookmark", PK],
  "Mes mots": ["Révisions", "book", BL],
  "Réviser une unité au choix": ["Révisions", "layers", BL],
  "Notions de grammaire": ["Grammaire", "grid", VI],
  "Grammaire en rafale": ["Grammaire", "bolt", GO],
  "Règles en rafale": ["Grammaire", "bolt", GO],
  "Grammar sprint": ["Grammaire", "bolt", GO],
  "Trouve l'erreur": ["Grammaire", "search", TE],
  "Find the mistake": ["Grammaire", "search", TE],
  "Clique sur la faute": ["Grammaire", "search", TE],
  "Trouve l'erreur (맞춤법)": ["Grammaire", "search", TE],
  "맞춤법 & dictée": ["Grammaire", "pencil", PK],
  "Fiches de cours": ["Grammaire", "doc", BL],
  "Règles du Certificat": ["Grammaire", "doc", BL],
  "Écoute TOEIC": ["Écoute & oral", "phones", BL],
  Listening: ["Écoute & oral", "phones", BL],
  Écoute: ["Écoute & oral", "phones", BL],
  Prononciation: ["Écoute & oral", "mic", GR],
  Pronunciation: ["Écoute & oral", "mic", GR],
  Dictée: ["Écoute & oral", "pencil", VI],
  Dictation: ["Écoute & oral", "pencil", VI],
  "Dictées Voltaire": ["Écoute & oral", "pencil", VI],
  "Mots utiles — Conversation": ["Vocabulaire", "chat", GR],
  "Mots utiles — Rédaction pro": ["Vocabulaire", "brief", OR],
  "Mots utiles — TOEIC": ["Vocabulaire", "target", PK],
  "Useful words — French": ["Vocabulaire", "chat", GR],
  "Mots utiles": ["Vocabulaire", "chat", PK],
  "Vocabulaire en images": ["Vocabulaire", "image", GR],
  "Words in pictures": ["Vocabulaire", "image", GR],
  "Lecture TOEIC (Part 7)": ["Examens", "doc", TE],
  "TOEIC blanc express": ["Examens", "clip", VI],
  "Examen blanc Voltaire": ["Examens", "clip", VI],
  "Examen blanc coréen": ["Examens", "clip", VI],
  "Test de niveau": ["Examens", "gauge", GO],
  "Sprint 60 secondes": ["Défis & IA", "timer", OR],
  "Leçon bilan": ["Défis & IA", "target", OR],
  "Révision IA illimitée": ["Défis & IA", "spark", VI],
  "Entraînement à thème": ["Défis & IA", "palette", PK],
};
export function renderTrain(v) {
  const s = curSec();
  const cards = [];
  const ccid = curCid();
  const add = (ic, t, d, tag, fn) => cards.push({ ic, t, d, tag, fn });
  const NOTIONS = "Notions de grammaire";
  if (s.id === "en") {
    add(
      "🧩",
      NOTIONS,
      "Temps, mots de liaison, modaux, prépositions : des phrases nouvelles à chaque séance.",
      "Grammaire",
      () => notionPicker(ccid),
    );
    add("💬", "Mots utiles — Conversation", "Expressions du quotidien pour parler naturellement.", "Quotidien", () =>
      trainVocab("en-daily"),
    );
    add(
      "🖼️",
      "Vocabulaire en images",
      "Choisis la bonne image, puis le bon mot : les mots du quotidien en dessins.",
      "Images",
      () => trainPics("en-daily"),
    );
    add("💼", "Mots utiles — Rédaction pro", "E-mails, réunions, formules diplomatiques.", "Pro", () =>
      trainVocab("en-pro"),
    );
    add("🎯", "Mots utiles — TOEIC", "Vocabulaire et pièges des Parts 5 & 6.", "TOEIC", () => trainVocab("en-toeic"));
    add("🎧", "Écoute TOEIC", "Parts 1 à 4 : scènes, questions-réponses, conversations, annonces.", "Listening", () =>
      trainListen(["en-toeic", "en-daily", "en-pro"]),
    );
    add("🎙️", "Prononciation", "Lis des phrases à voix haute, le micro te corrige.", "Oral", () =>
      trainSpeak(["en-daily", "en-pro"]),
    );
    add(
      "📰",
      "Lecture TOEIC (Part 7)",
      "E-mails, annonces, offres d'emploi, messages : lis et réponds.",
      "Reading",
      () => trainRead(),
    );
    add(
      "📝",
      "TOEIC blanc express",
      `20 questions dans l'ordre de l'examen, score estimé sur 990. Record : ${S.mockBest || "—"}`,
      "Examen",
      () => trainMock(),
    );
    add("👆", "Trouve l'erreur", `Repère la faute… ou valide la phrase (${COURSES[ccid].name}).`, "Grammaire", () =>
      trainSpot(ccid),
    );
    add("🧠", "Grammaire en rafale", `Temps, prépositions, pièges : 12 questions (${COURSES[ccid].name}).`, "QCM", () =>
      trainChoice(ccid),
    );
    add("✍️", "Dictée", "Écoute et écris la phrase exacte, mot pour mot.", "Dictée", () => trainDictation(ccid));
  } else if (ccid === "fr-fle") {
    add(
      "🧩",
      NOTIONS,
      "Temps, mots de liaison, modaux, prépositions : des phrases nouvelles à chaque séance.",
      "Grammaire",
      () => notionPicker("fr-fle"),
    );
    add("💬", "Useful words — French", "Everyday words and phrases, with audio.", "Vocabulary", () =>
      trainVocab("fr-fle"),
    );
    add(
      "🖼️",
      "Words in pictures",
      "Pick the right picture, then the right word: everyday words as drawings.",
      "Pictures",
      () => trainPics("fr-fle"),
    );
    add("🎧", "Listening", "Write what you hear, then check.", "Listening", () => trainListen(["fr-fle"]));
    add("🎙️", "Pronunciation", "Read French sentences aloud, the microphone corrects you.", "Speaking", () =>
      trainSpeak(["fr-fle"]),
    );
    add("👆", "Find the mistake", "Spot the grammar mistake… or confirm the sentence is correct.", "Grammar", () =>
      trainSpot("fr-fle"),
    );
    add("🧠", "Grammar sprint", "Articles, genders, verbs, prepositions: 12 questions.", "Quiz", () =>
      trainChoice("fr-fle"),
    );
    add("✍️", "Dictation", "Listen and write the exact sentence, accents included.", "Dictation", () =>
      trainDictation("fr-fle"),
    );
  } else if (s.id === "fr") {
    add(
      "👆",
      "Clique sur la faute",
      "La méthode du Projet Voltaire : repère la faute… ou valide qu'il n'y en a pas.",
      "Voltaire",
      () => trainSpot("fr-volt"),
    );
    add(
      "✒️",
      "Examen blanc Voltaire",
      `30 phrases, score estimé sur 1000 (paliers du Certificat). Record : ${S.voltBest || "—"}`,
      "Examen",
      () => trainVoltMock(),
    );
    add("✍️", "Dictées Voltaire", "Écoute et écris sans faute : accents et accords comptent.", "Dictée", () =>
      trainDictee("fr-volt"),
    );
    add("🧠", "Règles en rafale", "Homophones, accords, conjugaison : 12 questions.", "QCM", () =>
      trainChoice("fr-volt"),
    );
    add(
      "📚",
      "Règles du Certificat",
      `Les ${COURSES["fr-volt"].units.length} familles de règles du Projet Voltaire, avec ton taux de réussite pour chacune.`,
      "Cours",
      () => voltRules(),
    );
  } else {
    add(
      "🔤",
      "Alphabet hangul",
      "Reconnais les lettres et leurs sons, du tout début aux diphtongues.",
      "Débutant",
      () => trainHangul("letters"),
    );
    add(
      "👂",
      "Sons proches (가 / 카 / 까)",
      "Entraîne ton oreille aux sons que le français ne distingue pas.",
      "Écoute",
      () => trainHangul("hear"),
    );
    add("🧩", "Compose les syllabes", "Assemble consonne + voyelle (+ finale) pour former un bloc.", "Débutant", () =>
      trainHangul("build"),
    );
    add("📋", "Tableau du hangul", "Toutes les lettres, à toucher pour les écouter.", "Référence", () => hangulChart());
    add(
      "🧩",
      NOTIONS,
      "Temps, connecteurs, modaux, particules : des phrases nouvelles à chaque séance.",
      "Grammaire",
      () => notionPicker("ko"),
    );
    add("🐯", "Mots utiles", "Vocabulaire et phrases essentielles.", "Vocabulaire", () => trainVocab("ko"));
    add(
      "🖼️",
      "Vocabulaire en images",
      "Choisis la bonne image, puis le bon mot : les mots du quotidien en dessins.",
      "Images",
      () => trainPics("ko"),
    );
    add(
      "👆",
      "Trouve l'erreur (맞춤법)",
      "Repère la faute d'orthographe coréenne… ou valide la phrase.",
      "Orthographe",
      () => trainSpot("ko"),
    );
    add("✍️", "맞춤법 & dictée", "돼/되, 안/않, 웬/왠… et dictées.", "Orthographe", () => trainChoice("ko"));
    add("🎙️", "Prononciation", "Lis en coréen, le micro te corrige.", "Oral", () => trainSpeak(["ko"]));
    add("🎧", "Écoute", "Écris ce que tu entends.", "Écoute", () => trainListen(["ko"]));
    add("✍️", "Dictée", "Écoute et écris la phrase exacte en hangul.", "Dictée", () => trainDictation("ko"));
    add(
      "📝",
      "Examen blanc coréen",
      `20 questions façon TOPIK I (écoute et lecture), score estimé sur 200. Record : ${S.koBest || "—"}`,
      "Examen",
      () => trainKoMock(),
    );
  }
  add(
    "🎯",
    "Test de niveau",
    `Situe-toi en 10 minutes sur ${COURSES[ccid].name}${(S.place || {})[ccid] != null ? " · dernier résultat : " + placeEstimate(ccid, S.place[ccid]).replace(/^[^:]*: /, "") : ""}.`,
    "Niveau",
    () => placeIntro(ccid),
  );
  add(
    "📌",
    "Mes mots à retenir",
    `${(S.bank[s.id] || []).length} mot(s) · ${bankDue(s.id)} à revoir. Ajoute un mot vu aujourd'hui : écoute, prononciation, révisions espacées.`,
    "Perso",
    () => bankView(),
  );
  if (bankDue(s.id)) cards[cards.length - 1].badge = `${bankDue(s.id)} à revoir`;
  add(
    "🎨",
    "Entraînement à thème",
    "Choisis un thème (voyage, entretien, réunion…) ou invente le tien : exercices générés sur mesure.",
    "IA",
    () => themePicker(),
  );
  add(
    "🧭",
    "Leçon bilan",
    "Une séance sur tout ce que tu as vu : les unités où tu te trompes, tes erreurs à ancrer et tes mots à revoir.",
    "IA",
    () => startBilan(curCid()),
  );
  add(
    "✨",
    "Révision IA illimitée",
    `Des exercices nouveaux à chaque séance, générés à partir de tout ce que tu as vu (${COURSES[curCid()].name}).`,
    "IA",
    () => startAI(curCid(), unlockedUnits(curCid()), { mode: "train" }),
  );
  add("⏱️", "Sprint 60 secondes", `Un maximum de bonnes réponses en 1 minute. Record : ${S.sprint}`, "Défi", () =>
    trainSprint(),
  );
  const mc = s.tracks.reduce((a, c) => a + (S.mist[c] || []).length, 0);
  if (ccid !== "fr-volt")
    add(
      "📚",
      "Fiches de cours",
      `Les ${COURSES[ccid].units.length} unités de ${COURSES[ccid].name} avec leur astuce de cours et ton taux de réussite.`,
      "Cours",
      () => rulesSheet(ccid),
    );
  add("📒", "Mes mots", "Tous les mots et phrases débloqués, à écouter et réviser.", "Lexique", () => myWords());
  add(
    "🎯",
    "Réviser une unité au choix",
    "Choisis une unité déjà vue (avec ton taux de réussite) et retravaille-la à fond.",
    "Ciblé",
    () => unitPicker(ccid),
  );
  add(
    "🩹",
    "Mes erreurs (ancrage)",
    mc
      ? `${mc} exercice(s) raté(s), révisés à intervalles croissants (1, 3, 7 jours) jusqu'à être ancrés.`
      : "Aucune erreur enregistrée pour l'instant 🎉",
    "Révision",
    () => trainMistakes(),
  );
  const co = S.coach[ccid],
    st = errStats(ccid),
    due = dueCount(s.tracks);
  const C = COURSES[ccid];
  const hero = `<header class="trhero"><div class="trtop"><h1>Entraînement</h1><button class="trstat" onclick="location.hash='stats'" aria-label="Statistiques">${ic("chart", 20, "", 2.4)}</button></div>
  <p class="trsub">Illimité · +3 💎 par séance terminée. Les exercices portent sur les unités que tu as commencées ou validées au test de niveau.</p>
  <div class="coach"><small><span>Coach IA</span> · <span>${esc(C.name)}</span></small><h2>Tes erreurs récurrentes</h2>
  <p>${co ? esc(co.diag) : st.n ? `${st.n} erreur(s) enregistrée(s). Lance le coach : il analyse tes fautes (mots, constructions, temps, accords…) et crée des exercices ciblés, toujours différents.` : "Fais quelques leçons : chaque erreur est analysée ici pour créer des exercices sur mesure."}</p>
  ${co && co.focus && co.focus.length ? `<div class="chips">${co.focus.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
  <div class="coachb"><button class="btn" id="coachGo">${st.n ? "Séance ciblée" : "Séance découverte"}</button><span class="cdue">${ic("repeat", 16, "", 2.6)}<span>${due} rappel${due > 1 ? "s" : ""} à ancrer aujourd'hui</span></span></div>
  <div class="coachl">${mascot("calm")}</div></div>
</header>`;
  const groups = {};
  const ord = Object.keys(TMAP);
  const rank = c => ord.indexOf(c.t) + 1 || 99;
  cards
    .map((c, i) => [c, i])
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .forEach(([c, i]) => {
      const [g, k, col] = TMAP[c.t] || ["Défis & IA", "star", VI];
      (groups[g] = groups[g] || []).push(
        `<button class="tcard trow" data-i="${i}"><span class="trt"><span class="trh"><h3>${c.t}</h3>${c.badge ? `<span class="tbadge">${c.badge}</span>` : ""}</span><p>${c.d}</p><span class="tag">${c.tag}</span></span><span class="tric" style="background:${col}"><i></i>${ic(k, 28, "", 2.4)}</span></button>`,
      );
    });
  const body = TGROUPS.filter(g => groups[g])
    .map(g => `<section class="tsec"><h2>${g}</h2>${groups[g].join("")}</section>`)
    .join("");
  v.innerHTML = `${hero}<div class="tsecs">${body}</div>`;
  v.querySelectorAll(".tcard").forEach(
    b =>
      (b.onclick = () => {
        beep("tap");
        cards[+b.dataset.i].fn();
      }),
  );
  $("#coachGo").onclick = () => {
    beep("tap");
    startCoach(ccid);
  };
  v.querySelectorAll("[data-ct]").forEach(
    b =>
      (b.onclick = () => {
        S.track[s.id] = b.dataset.ct;
        save();
        renderAll();
      }),
  );
}
export function trainVocab(cid) {
  const ctx = ctxFor(cid, unlockedUnits(cid));
  const T = ["match", "mcw", "mcw", "tilesRev", "mcw", "tiles", "match", "mcw", "listenTiles", "type", "speak", "mcw"];
  openSession({ mode: "train", cid, exs: T.map(t => make(t, ctx)).filter(Boolean) });
}
/** v30 : vocabulaire en images (mots des unités débloquées d'abord, puis tous les mots illustrés). */
export function trainPics(cid) {
  const ctx = ctxFor(cid, unlockedUnits(cid));
  const mine = ctx.pk.slice();
  ctx.pk = [
    ...shuffle(mine),
    ...shuffle(PIC_WORDS.map(r => r[0]).filter(id => hasPic(id) && !mine.includes(id))),
  ].slice(0, 24);
  ctx.ptr.pk = 0;
  const T = ["pic", "pic", "picw", "pic", "picw", "pic", "picw", "pic", "picw", "pic", "picw", "picw"];
  openSession({ mode: "train", cid, exs: T.map(t => make(t, ctx)).filter(Boolean) });
}
export function trainListen(cids) {
  S.listenOff = 0;
  const exs = [];
  cids.forEach((cid, i) => {
    const ctx = ctxFor(cid, unlockedUnits(cid), { hideP2: true });
    if (cid === "en-toeic") ctx.ph = shuffle(REAL_PH.concat(ctx.ph || []));
    // v32 : hors TOEIC (coréen, FLE), la carte Écoute ne contient que de l'écoute (plus de QCM de grammaire)
    const T =
      COURSES[cid].kind !== "toeic" && cids.length === 1
        ? [
            "listenTiles",
            "listen",
            "listenTiles",
            "listen",
            "listenTiles",
            "listen",
            "listen",
            "listenTiles",
            "listen",
            "listen",
          ]
        : i === 0
          ? ["photo", "part2", "conv", "part2", "conv", "photo", "listen", "part2"]
          : ["listenTiles", "listen", "listen"];
    T.forEach(t => {
      const e = make(t, ctx);
      e && exs.push(e);
    });
  });
  openSession({ mode: "train", cid: cids[0], exs: shuffle(exs).slice(0, 14) });
}
export function trainSpeak(cids) {
  S.listenOff = 0;
  S.speakOff = 0;
  const exs = [];
  cids.forEach(cid => {
    const ctx = ctxFor(cid, unlockedUnits(cid));
    for (let i = 0; i < (cids.length === 1 ? 8 : 5); i++) {
      const e = make("speak", ctx);
      e && exs.push(e);
    }
  });
  openSession({ mode: "train", cid: cids[0], exs: shuffle(exs).slice(0, 8) });
}
export function trainRead() {
  const C = COURSES["en-toeic"];
  const ctx = ctxFor("en-toeic", C.units);
  openSession({
    mode: "train",
    cid: "en-toeic",
    exs: Array.from({ length: 8 }, () => make("read", ctx)).filter(Boolean),
  });
}
export function trainMock() {
  S.listenOff = 0;
  const C = COURSES["en-toeic"];
  const ctx = ctxFor("en-toeic", C.units, { hideP2: true });
  ctx.ph = shuffle(REAL_PH.slice());
  // Proportions du vrai TOEIC (L : 6/25/39/30, R : 30/16/54) ramenées à 20 questions
  const talks = ctx.cv.filter(x => x.d.length === 1),
    convs = ctx.cv.filter(x => x.d.length > 1);
  const pick = (arr, n, t) => {
    const c2 = Object.assign({}, ctx, { cv: arr, ptr: Object.assign({}, ctx.ptr, { cv: 0 }) });
    return Array.from({ length: n }, () => make(t, c2)).filter(Boolean);
  };
  const L1 = [
    ...pick(ctx.ph, 1, "photo"),
    ...Array.from({ length: 2 }, () => make("part2", ctx)),
    ...pick(convs, 4, "conv"),
    ...pick(talks, 3, "conv"),
  ];
  const R1 = [
    ...Array.from({ length: 5 }, () => make("choice", ctx)),
    ...Array.from({ length: 5 }, () => make("read", ctx)),
  ];
  const exs = [
    ...L1.map(e => Object.assign(e, { sec: "L" })),
    ...R1.filter(Boolean).map(e => Object.assign(e, { sec: "R" })),
  ];
  const m = modal(
    `<div class="mcenter">${mascot("wow", "jump")}<h2>TOEIC blanc express</h2><p>20 questions dans les proportions du vrai TOEIC : écoute (Parts 1 à 4) puis lecture (Parts 5 à 7). Pas de seconde chance, comme le jour J. Score estimé à la fin.</p><button class="btn big" id="mgo">Commencer</button></div>`,
  );
  m.querySelector("#mgo").onclick = () => {
    closeModal();
    openSession({ mode: "train", cid: "en-toeic", exs, mock: true, noRetry: true, lc: [0, 0], rc: [0, 0] });
  };
}
export function trainVoltMock() {
  S.listenOff = 0;
  const C = COURSES["fr-volt"];
  const ctx = ctxFor("fr-volt", C.units);
  ctx.spot1 = true; // examen blanc : une phrase à la fois, comme au certificat
  const exs = Array.from({ length: 30 }, (_, i) => make(i % 6 === 5 ? "choice" : "spot", ctx)).filter(Boolean);
  const m = modal(
    `<div class="mcenter">${mascot("wow", "jump")}<h2>Examen blanc Voltaire</h2><p>30 phrases sur toutes les règles du parcours, dans le style du Certificat Voltaire : trouve la faute ou valide qu'il n'y en a pas. Pas de seconde chance. Score estimé sur 1000 à la fin.</p><button class="btn big" id="vgo">Commencer</button></div>`,
  );
  m.querySelector("#vgo").onclick = () => {
    closeModal();
    openSession({ mode: "train", cid: "fr-volt", exs, voltMock: true, noRetry: true });
  };
}
export function trainSpot(cid) {
  const ctx = ctxFor(cid, unlockedUnits(cid));
  openSession({ mode: "train", cid, exs: Array.from({ length: 14 }, () => make("spot", ctx)).filter(Boolean) });
}
export function trainHangul(mode) {
  S.listenOff = 0;
  const C = COURSES.ko;
  const hg = C.units.filter(u => u.hg);
  const ul = unlockedUnits("ko").filter(u => u.hg);
  const units = ul.length ? ul : [hg[0]];
  const ctx = ctxFor("ko", units);
  ctx.allHj = units.flatMap(u => u.hj);
  const T =
    mode === "letters"
      ? [
          "jamo",
          "jamoRev",
          "jamo",
          "match",
          "jamoRev",
          "jamo",
          "jamoRev",
          "jamo",
          "match",
          "jamoRev",
          "jamo",
          "jamoRev",
        ]
      : mode === "hear"
        ? Array(12).fill("hear")
        : ["build", "build", "readw", "build", "build", "readw", "build", "build", "readw", "build", "build", "build"];
  openSession({ mode: "train", cid: "ko", exs: T.map(t => make(t, ctx)).filter(Boolean) });
}
export function hangulChart() {
  const hg = COURSES.ko.units.filter(u => u.hg);
  const sec = (t, arr) =>
    `<h3 style="margin-top:14px">${t}</h3><div class="hgchart">${arr.map(j => `<button data-s="${esc(j[2])}"><b>${esc(j[0])}</b><small>${esc(j[1])}</small></button>`).join("")}</div>`;
  const m = modal(
    `<h2 class="hi">${ic("grid", 22, "", 2.4)}Tableau du hangul</h2><p>Touche une lettre pour l'entendre dans une syllabe.</p>${hg.map(u => sec(u.t.replace(/^Hangul \d : /, ""), u.hj)).join("")}<div class="tipbox" style="margin-top:14px">💡 ${esc(hg[3].tip)}</div><button class="btn" onclick="closeModal()">Fermer</button>`,
  );
  m.querySelectorAll("[data-s]").forEach(b => (b.onclick = () => say(b.dataset.s, "ko-KR")));
}
export function trainDictation(cid) {
  S.listenOff = 0;
  const ul = unlockedUnits(cid),
    us = ul.filter(u => !u.hg);
  const ctx = ctxFor(cid, us.length ? us : ul);
  openSession({
    mode: "train",
    cid,
    exs: Array.from({ length: 8 }, (_, i) => make(i % 4 === 3 ? "listenTiles" : "listen", ctx)).filter(Boolean),
  });
}
export function unitRate(cid, u) {
  const x = (S.st[cid] && S.st[cid].u && S.st[cid].u[u]) || null;
  return x && x[0] ? Math.round(((x[0] - x[1]) / x[0]) * 100) : null;
}
export function unitPicker(cid) {
  const s = curSec();
  const C = COURSES[cid];
  const ul = unlockedUnits(cid);
  const m =
    modal(`<h2 class="hi">${ic("target", 22, "", 2.4)}Réviser une unité</h2><p>Les unités que tu as commencées, avec ton taux de réussite. Les plus fragiles sont en rouge.</p>${s.tracks.length > 1 ? `<div class="tracks">${s.tracks.map(t => `<button data-tt="${t}" class="${t === cid ? "on" : ""}">${COURSES[t].icon} ${COURSES[t].name}</button>`).join("")}</div>` : ""}
  <div class="ulist">${ul
    .map(U => {
      const u = C.units.indexOf(U);
      const r = unitRate(cid, u);
      return `<button class="urow" data-u="${u}"><span class="un">${u + 1}</span><span class="ut"><b>${esc(U.t)}</b><small>${esc(U.d || "")}</small></span><span class="ur ${r === null ? "" : r < 70 ? "bad" : r < 85 ? "mid" : "good"}">${r === null ? "—" : r + " %"}</span></button>`;
    })
    .join("")}</div><button class="btn ghost" onclick="closeModal()">Fermer</button>`);
  m.querySelectorAll("[data-tt]").forEach(b => (b.onclick = () => unitPicker(b.dataset.tt)));
  m.querySelectorAll("[data-u]").forEach(
    b =>
      (b.onclick = () => {
        const u = +b.dataset.u,
          U = C.units[u];
        closeModal();
        const ctx = ctxFor(cid, [U]);
        if (U.hg) ctx.allHj = C.units.slice(0, u + 1).flatMap(x => x.hj || []);
        const T = U.hg ? HG_T[2] : TEMPL[C.kind][2];
        openSession({
          mode: "train",
          cid,
          u,
          exs: T.map(t => make(t, ctx))
            .filter(Boolean)
            .map(e => Object.assign(e, { _u: u })),
        });
      }),
  );
}
export function voltRules() {
  rulesSheet("fr-volt");
}
export const RULE_T = {
  volt: ["spot", "choice", "spot", "dictee", "spot", "choice", "spot", "spot", "dictee", "choice", "spot", "spot"],
  toeic: [
    "choice",
    "part2",
    "choice",
    "conv",
    "choice",
    "read",
    "photo",
    "choice",
    "part2",
    "type",
    "choice",
    "listen",
  ],
  trans: [
    "mc",
    "tiles",
    "choice",
    "listen",
    "mcw",
    "type",
    "spot",
    "speak",
    "tilesRev",
    "choice",
    "listenTiles",
    "type",
  ],
};
export function rulesSheet(cid) {
  const C = COURSES[cid];
  const ul = new Set(C.units.filter((U, u) => unitOpen(cid, u)));
  const volt = C.kind === "volt";
  const m = modal(
    `<h2 class="hi">${ic("book", 22, "", 2.4)}${volt ? "Règles du Certificat Voltaire" : "Fiches de cours · " + C.icon + " " + esc(C.name)}</h2><p>${C.units.length} ${volt ? "familles de règles, du niveau Technique au niveau Expert" : "unités, chacune avec son astuce de cours"}. Touche une fiche pour t'entraîner dessus ; le pourcentage est ton taux de réussite.</p><div class="ulist">${C.units
      .map((U, u) => {
        const r = unitRate(cid, u),
          ok = ul.has(U);
        return `<button class="urow ${ok ? "" : "lock"}" data-u="${u}"><span class="un">${ok ? u + 1 : "🔒"}</span><span class="ut"><b>${esc(U.t)}</b><small>${esc(U.d || "")}</small>${ok && U.tip ? `<small class="utip">💡 ${esc(U.tip)}</small>` : ""}</span><span class="ur ${r === null ? "" : r < 70 ? "bad" : r < 85 ? "mid" : "good"}">${r === null ? "—" : r + " %"}</span></button>`;
      })
      .join("")}</div><button class="btn ghost" onclick="closeModal()">Fermer</button>`,
  );
  m.querySelectorAll("[data-u]").forEach(
    b =>
      (b.onclick = () => {
        if (b.classList.contains("lock")) {
          toast("🔒 Termine d'abord les unités de hangul");
          return;
        }
        const u = +b.dataset.u;
        closeModal();
        const U = C.units[u];
        const ctx = ctxFor(cid, [U]);
        if (U.hg) ctx.allHj = C.units.slice(0, u + 1).flatMap(x => x.hj || []);
        const T = U.hg ? HG_T[Math.min(3, Math.max(0, 1))] : RULE_T[C.kind] || RULE_T.trans;
        openSession({
          mode: "train",
          cid,
          u,
          exs: T.map(t => make(t, ctx))
            .filter(Boolean)
            .map(e => Object.assign(e, { _u: u })),
        });
      }),
  );
}
export function trainKoMock() {
  S.listenOff = 0;
  const C = COURSES.ko;
  const ctx = ctxFor(
    "ko",
    C.units.filter(u => !u.hg),
    { hideP2: true },
  );
  const T = [
    "listen",
    "choice",
    "mc",
    "listenTiles",
    "choice",
    "type",
    "listen",
    "choice",
    "tilesRev",
    "spot",
    "listen",
    "choice",
    "mc",
    "listen",
    "choice",
    "tiles",
    "listen",
    "choice",
    "type",
    "choice",
  ];
  const exs = T.map((t, i) => Object.assign(make(t, ctx) || {}, { sec: i % 2 ? "R" : "L" })).filter(e => e.t);
  const m = modal(
    `<div class="mcenter">${mascot("wow", "jump")}<h2>Examen blanc coréen</h2><p>20 questions d'écoute et de lecture sur tout le parcours, dans l'esprit du TOPIK I. Pas de seconde chance. Score estimé sur 200 à la fin.</p><button class="btn big" id="kgo">Commencer</button></div>`,
  );
  m.querySelector("#kgo").onclick = () => {
    closeModal();
    openSession({ mode: "train", cid: "ko", exs, koMock: true, noRetry: true });
  };
}
export function trainDictee(cid) {
  S.listenOff = 0;
  const ctx = ctxFor(cid, unlockedUnits(cid));
  openSession({ mode: "train", cid, exs: Array.from({ length: 6 }, () => make("dictee", ctx)).filter(Boolean) });
}
export function trainChoice(cid) {
  const ctx = ctxFor(cid, unlockedUnits(cid));
  const T = [
    "choice",
    "choice",
    "choice",
    "dictee",
    "choice",
    "choice",
    "choice",
    "dictee",
    "choice",
    "choice",
    "choice",
    "choice",
  ];
  openSession({ mode: "train", cid, exs: T.map(t => make(t, ctx)).filter(Boolean) });
}
export function trainMistakes() {
  const s = curSec();
  let exs = [];
  s.tracks.forEach(c => (S.mist[c] || []).forEach(e => exs.push(Object.assign({}, e, { _cid: c }))));
  if (!exs.length) {
    modal(
      `<div class="mcenter">${mascot("happy", "dance")}<h2>Rien à réviser !</h2><p>Chaque exercice raté atterrit ici pour être retravaillé.</p><button class="btn" onclick="closeModal()">Super</button></div>`,
    );
    return;
  }
  openSession({ mode: "train", cid: s.tracks[0], exs: shuffle(exs).slice(0, 12), review: true });
}
export function trainSprint() {
  const s = curSec();
  const exs = [];
  s.tracks.forEach(cid => {
    const ctx = ctxFor(cid, unlockedUnits(cid), { dis: 2 });
    const T =
      COURSES[cid].kind === "trans"
        ? ["mc", "mcw", "mc", "choice", "mcw", "mc"]
        : ["choice", "mcw", "choice", "mc", "choice"];
    for (let r = 0; r < 4; r++)
      T.forEach(t => {
        const e = make(t, ctx);
        e && exs.push(e);
      });
  });
  openSession({ mode: "sprint", cid: s.tracks[0], exs: shuffle(exs).slice(0, 60) });
}
