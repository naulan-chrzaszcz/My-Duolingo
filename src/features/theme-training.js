// Entraînement à thème
import { COURSES } from "../content/index.js";
import { esc } from "../core/util.js";
import { unlockedUnits } from "../lesson/build.js";
import { startAI } from "../services/ai.js";
import { curCid, curSec } from "../ui/router.js";
import { closeModal, modal } from "../ui/ui.js";

// ---------- Entraînement à thème ----------
export const THEMES_FLE = [
  "At the café",
  "At the bakery",
  "Shopping",
  "Directions in the city",
  "Train travel",
  "At the hotel",
  "At the doctor's",
  "Job interview",
  "Meeting colleagues",
  "Renting a flat",
  "Weekend plans",
  "French food & cooking",
];
export const THEMES = {
  en: [
    "Développement logiciel (PR, code review)",
    "Incident & support technique",
    "Aéroport & voyage",
    "Restaurant",
    "Entretien d'embauche",
    "Réunion d'équipe",
    "Appel téléphonique",
    "Santé & médecin",
    "Shopping",
    "Small talk",
    "Ressources humaines (TOEIC)",
    "Finance & comptabilité (TOEIC)",
    "Marketing & ventes (TOEIC)",
    "Logistique & livraisons (TOEIC)",
  ],
  fr: [
    "Courrier professionnel",
    "Accords du participe passé",
    "Homophones",
    "Accord sujet-verbe",
    "Conjugaison",
    "Pluriels & nombres",
    "Traits d'union",
    "Paronymes & expressions fautives",
    "Orthotypographie",
    "Lettre de motivation",
    "Compte rendu de réunion",
  ],
  ko: [
    "Hangul & prononciation",
    "Au café",
    "Transports",
    "K-drama",
    "Au travail",
    "Shopping",
    "Famille",
    "Restaurant coréen",
    "Honorifiques (존댓말)",
    "맞춤법",
  ],
};
export function themePicker() {
  const s = curSec();
  const cid = curCid();
  const THM = cid === "fr-fle" ? THEMES_FLE : THEMES[s.id];
  const m =
    modal(`<h2>🎨 Entraînement à thème</h2><p>Choisis un thème ou écris le tien : les exercices seront générés sur ce sujet, à ton niveau (${COURSES[cid].icon} ${COURSES[cid].name}).</p>
  ${s.tracks.length > 1 ? `<div class="tracks">${s.tracks.map(t => `<button data-tt="${t}" class="${t === cid ? "on" : ""}">${COURSES[t].icon} ${COURSES[t].name}</button>`).join("")}</div>` : ""}
  <div class="chips pick">${THM.map(t => `<button data-th="${esc(t)}">${esc(t)}</button>`).join("")}</div>
  <label class="flabel">Ou ton propre thème</label><input class="finput" id="thIn" maxlength="80" placeholder="Ex. : réserver un hôtel, parler de mes hobbies, négocier un salaire…">
  <button class="btn" id="thGo">Générer mes exercices</button><button class="btn ghost" onclick="closeModal()">Annuler</button>`);
  let tcid = cid;
  m.querySelectorAll("[data-tt]").forEach(
    b =>
      (b.onclick = () => {
        tcid = b.dataset.tt;
        m.querySelectorAll("[data-tt]").forEach(x => x.classList.toggle("on", x === b));
      }),
  );
  m.querySelectorAll("[data-th]").forEach(
    b =>
      (b.onclick = () => {
        m.querySelector("#thIn").value = b.dataset.th;
        m.querySelectorAll("[data-th]").forEach(x => x.classList.toggle("on", x === b));
      }),
  );
  m.querySelector("#thGo").onclick = () => {
    const th = m.querySelector("#thIn").value.trim();
    if (!th) {
      m.querySelector("#thIn").focus();
      return;
    }
    closeModal();
    startTheme(tcid, th);
  };
}
export function startTheme(cid, theme) {
  const C = COURSES[cid];
  const ul = unlockedUnits(cid);
  const kw = theme
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(w => w.length >= 4);
  const hit = C.units.filter(u => kw.some(k => (u.t + " " + u.d + " " + (u.tip || "")).toLowerCase().includes(k)));
  const units = hit.length ? [...new Set([...ul.slice(-2), ...hit])] : ul;
  startAI(cid, units, { mode: "train", theme });
}
