// Unités générées par l'IA
import { COURSES } from "../content/index.js";
import { S, save } from "../core/accounts.js";
import { NPU, secName } from "../core/util.js";
import { indexItems } from "../exercises/generate.js";
import { aiAsk, aiDetect, validateGen } from "../services/ai.js";
import { mascot } from "../ui/mascot.js";
import { renderAll } from "../ui/router.js";
import { closeModal, confetti, modal, toast } from "../ui/ui.js";

// ---------- Unités générées par l'IA ----------
export const BASE_UNITS = {};
export function applyGenUnits() {
  Object.entries(COURSES).forEach(([cid, C]) => {
    C.units = BASE_UNITS[cid].concat((S.genU && S.genU[cid]) || []);
  });
  indexItems();
}
export function unitPrompt(r) {
  const L0 = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" }[r.lang];
  const ko = r.lang === "ko-KR";
  const schema =
    r.kind === "volt"
      ? '{"t":"titre court","d":"notions de l\'unité, séparées par des virgules","tip":"astuce de cours en 2 phrases","c":[["phrase avec ___",["bonne orthographe","piège","piège","piège"],0,"règle"]],"d2":["phrase de dictée"]}'
      : '{"t":"titre court","d":"notions de l\'unité, séparées par des virgules","tip":"astuce de cours en 2 phrases","p":[["phrase en français","traduction ' +
        L0 +
        '",' +
        (ko ? '"romanisation révisée",' : "") +
        '"variante acceptée"]],"v":[["mot français","traduction ' +
        L0 +
        '"]],"c":[["phrase en ' +
        L0 +
        ' avec ___",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication en français"]]' +
        (r.kind === "toeic"
          ? ',"l":[["question orale",["meilleure réponse","piège","piège"],0]],"cv":[{"d":[["M","réplique"],["W","réplique"]],"q":[["question",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication"]]}],"rd":[{"x":"document","q":[["question",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication"]]}]'
          : "") +
        "}";
  return (
    "Tu conçois la suite d'un parcours d'apprentissage façon Duolingo pour un élève francophone.\nCours : " +
    r.course +
    " (langue : " +
    L0 +
    "). Unités déjà terminées (titre : notions) :\n- " +
    r.done.join("\n- ") +
    "\n\nCrée l'unité numéro " +
    r.num +
    " : un thème NOUVEAU et des notions NOUVELLES qui prolongent logiquement le parcours, niveau " +
    r.level +
    " (un peu plus difficile que la dernière unité). Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n" +
    schema +
    "\n" +
    (r.kind === "volt"
      ? 'Donne 12 éléments dans "c" et 4 dans "d2".'
      : 'Donne 10 éléments dans "p" (1 à 3 variantes correctes chacun), 6 dans "v", 6 dans "c"' +
        (r.kind === "toeic" ? ', 4 dans "l", 2 dans "cv" (3 questions chacun), 2 dans "rd" (2 questions chacun)' : "") +
        ".") +
    "\nLangue naturelle et 100 % correcte, une seule bonne réponse par question."
  );
}
export async function genUnit(cid) {
  const C = COURSES[cid];
  const mode = await aiDetect();
  if (mode === "local") {
    modal(
      `<div class="mcenter">${mascot("calm")}<h2>Connecte ton Claude</h2><p>La création d'unités demande l'IA. Ajoute ta clé API Claude dans ton profil (rubrique « 🤖 Mon Claude ») : elle n'est utilisée que pour ton compte.</p><button class="btn" onclick="closeModal();location.hash='profil'">Ouvrir mon profil</button><button class="btn ghost" onclick="closeModal()">Plus tard</button></div>`,
    );
    return;
  }
  modal(
    `<div class="mcenter">${mascot("wow", "dance")}<h2>✨ Horang crée ta prochaine unité…</h2><p>Nouveau thème, nouvelles notions, ${NPU} étapes.</p><div class="aiload"><i></i><i></i><i></i></div></div>`,
    "",
    true,
  );
  const req = {
    mode: "unit",
    kind: C.kind,
    lang: C.lang,
    course: C.name,
    level: secName(cid, 3),
    num: C.units.length + 1,
    done: C.units.slice(-14).map(u => (u.t + " : " + u.d).slice(0, 140)),
  };
  const raw = await aiAsk(unitPrompt(req), req, { tier: "default", ms: 110000 });
  closeModal();
  const G = raw && validateGen(Object.assign({}, raw, { d: raw.d2 || [] }), C);
  if (!G || !raw.t) {
    toast("La création n'a pas abouti, réessaie dans un instant.");
    return;
  }
  const U = {
    t: String(raw.t).slice(0, 60),
    d: String(typeof raw.d === "string" ? raw.d : "").slice(0, 160),
    tip: String(raw.tip || "").slice(0, 400),
    lv: 3,
    gen: 1,
    p: G.p,
    v: G.v,
    c: G.c,
    l: G.l,
    dd: G.dd,
    cv: G.cv,
    rd: G.rd,
  };
  S.genU[cid] = S.genU[cid] || [];
  S.genU[cid].push(U);
  save();
  applyGenUnits();
  renderAll();
  confetti(80);
  toast(`✨ Nouvelle unité : ${U.t}`);
  const el = document.querySelector("#unit" + (C.units.length - 1));
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
