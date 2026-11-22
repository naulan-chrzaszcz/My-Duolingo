// Leçon du jour (v39) : à la première ouverture de la journée, si une série est en cours et que l'IA est
// disponible, une fenêtre propose une leçon inédite créée pour l'élève (niveau, centres d'intérêt, erreurs récentes).
// Fermer la fenêtre ne coûte rien : la leçon n'est générée qu'avec « Commencer ». Proposée une fois par jour.
import { S, save } from "../core/accounts.js";
import { daily } from "../core/xp.js";
import { dkey, esc } from "../core/util.js";
import { L } from "../lesson/engine.js";
import { unlockedUnits } from "../lesson/build.js";
import { AI, aiDetect, startAI } from "../services/ai.js";
import { mascot } from "../ui/mascot.js";
import { curCid } from "../ui/router.js";
import { closeModal, modal } from "../ui/ui.js";
import { interestsPicker, likesList } from "./interests";
import { showWeekly, weeklyDue } from "./weekly";

const P = (): any => S;
let busy = false;

/** La fenêtre doit-elle s'ouvrir maintenant ? (sans appeler l'IA) */
export function dailyDue(): boolean {
  const st = P();
  return !!(st.onb && (st.streak || 0) >= 1 && st.dlDay !== dkey() && !L);
}

/** Appelée au démarrage, au changement de profil et au retour dans l'app. */
export async function dailyLessonCheck(): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    daily(); // nouveau jour depuis la dernière ouverture : série et quêtes à jour
    // v39.1 : le bilan de la semaine passe avant la leçon du jour, qui suit quand on le ferme
    if (weeklyDue() && document.querySelector("#modal")?.classList.contains("hidden")) {
      busy = false;
      await showWeekly(() => setTimeout(dailyLessonCheck, 300));
      return;
    }
    if (!dailyDue() || !navigator.onLine) return;
    const modalOpen = !document.querySelector("#modal")?.classList.contains("hidden");
    if (modalOpen) return;
    if ((await aiDetect()) === "local" || AI.mode === "local") return;
    if (!dailyDue() || !document.querySelector("#modal")?.classList.contains("hidden")) return;
    P().dlDay = dkey();
    save();
    dailyLessonModal();
  } finally {
    busy = false;
  }
}

export function dailyLessonModal(): void {
  const likes = likesList();
  const n = P().streak || 0;
  const m = modal(
    `<div class="mcenter dlpop">${mascot("wow", "jump")}<h2>Ta leçon du jour</h2>
    <p>${likes.length ? "Une leçon inédite, créée rien que pour toi : à ton niveau, avec tes erreurs récentes et tes centres d'intérêt." : "Une leçon inédite, créée rien que pour toi : à ton niveau, avec tes erreurs récentes."}</p>
    ${likes.length ? `<div class="likes">${likes.map(l => `<span class="likechip sel">${esc(l)}</span>`).join("")}</div>` : ""}
    <p class="dlstreak">${n > 1 ? `🔥 Série de ${n} jours` : "🔥 Série de 1 jour"}</p></div>
    <button class="btn big" id="dlgo">Commencer</button>
    ${likes.length ? "" : `<button class="btn ghost" id="dllikes">Choisir mes centres d'intérêt</button>`}
    <button class="btn ghost" id="dllater">Plus tard</button>`,
  );
  (m.querySelector("#dlgo") as HTMLElement).onclick = () => {
    closeModal();
    startDailyLesson();
  };
  const lk = m.querySelector("#dllikes") as HTMLElement | null;
  if (lk) lk.onclick = () => interestsPicker(dailyLessonModal, "Plus tard");
  (m.querySelector("#dllater") as HTMLElement).onclick = closeModal;
}

export function startDailyLesson(): void {
  const cid = curCid();
  startAI(cid, unlockedUnits(cid), { mode: "train", daily: true });
}
