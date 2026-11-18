// Premier lancement
import { COURSES, SECTIONS } from "../content/index.js";
import { S, save } from "../core/accounts.js";
import { esc } from "../core/util.js";
import { placeIntro } from "../features/placement.js";
import { beep } from "../services/speech.js";
import { mascot } from "../ui/mascot.js";
import { curCid, renderAll } from "../ui/router.js";
import { closeModal, confetti, modal } from "../ui/ui.js";
import { interestsPicker } from "../features/interests.ts";

// ===================== ACCUEIL =====================
export function onboarding(who) {
  let sec = S.sec,
    goal = S.goal;
  const step1 = () => {
    const m = modal(
      `<div class="mcenter">${mascot("happy", "dance")}<h2>Salut${who ? " " + esc(who) : ""} ! Moi c'est Horang 🐯</h2><p>Je vais t'accompagner chaque jour. Par quoi on commence ?</p></div><div class="choices">${SECTIONS.map(s => `<button data-s="${s.id}" class="${s.id === sec ? "sel" : ""}"><span class="e">${s.flag}</span><span>${s.name}<small>${s.id === "en" ? "Conversation, rédaction pro, TOEIC" : s.id === "fr" ? "Orthographe façon Projet Voltaire" : "Coréen, des bases au 맞춤법"}</small></span></button>`).join("")}</div><button class="btn" id="n1">Continuer</button>`,
      "",
      true,
    );
    m.querySelectorAll("[data-s]").forEach(
      b =>
        (b.onclick = () => {
          sec = b.dataset.s;
          m.querySelectorAll("[data-s]").forEach(x => x.classList.toggle("sel", x === b));
          beep("tap");
        }),
    );
    m.querySelector("#n1").onclick = step2;
  };
  const step2 = () => {
    const m = modal(
      `<div class="mcenter">${mascot("wow", "jump")}<h2>Ton objectif quotidien ?</h2><p>Tu pourras le changer dans les paramètres.</p></div><div class="choices">${[
        [100, "Tranquille", "5 min / jour", "🌱"],
        [200, "Normal", "10 min / jour", "🙂"],
        [400, "Sérieux", "15 min / jour", "💪"],
        [600, "Intense", "20+ min / jour", "🚀"],
      ]
        .map(
          ([x, l, d, e]) =>
            `<button data-g="${x}" class="${x === goal ? "sel" : ""}"><span class="e">${e}</span><span>${l}<small>${d} · ${x} XP</small></span></button>`,
        )
        .join("")}</div><button class="btn" id="n2">C'est parti !</button>`,
      "",
      true,
    );
    m.querySelectorAll("[data-g]").forEach(
      b =>
        (b.onclick = () => {
          goal = +b.dataset.g;
          m.querySelectorAll("[data-g]").forEach(x => x.classList.toggle("sel", x === b));
          beep("tap");
        }),
    );
    m.querySelector("#n2").onclick = () => interestsPicker(step3, "Passer"); // v39 : centres d'intérêt
  };
  const step3 = () => {
    S.sec = sec;
    S.goal = goal;
    S.onb = true;
    save();
    const cid = curCid();
    const C = COURSES[cid];
    const m = modal(
      `<div class="mcenter">${mascot("happy", "jump")}<h2>Tu pars de zéro ?</h2><p>${C.icon} ${esc(C.name)}${SECTIONS.find(x => x.id === sec).tracks.length > 1 ? " (tu pourras tester aussi les autres parcours)" : ""}</p></div><div class="choices"><button data-p="0"><span class="e">🌱</span><span>Je débute<small>Commencer au tout début du parcours</small></span></button><button data-p="1"><span class="e">🎯</span><span>J'ai déjà des bases<small>Test de niveau de 10 minutes pour démarrer au bon endroit</small></span></button></div>`,
      "",
      true,
    );
    m.querySelectorAll("[data-p]").forEach(
      b =>
        (b.onclick = () => {
          closeModal();
          confetti(80);
          beep("win");
          renderAll();
          if (b.dataset.p === "1") setTimeout(() => placeIntro(cid), 250);
        }),
    );
  };
  step1();
}
