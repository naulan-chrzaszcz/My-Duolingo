// Personnalisation du profil (v39) : à la première visite du profil (puis à la demande depuis « Mes outils »),
// trois étapes rapides pour que l'IA s'adapte à chaque compte : objectif, centres d'intérêt, connexion de Claude.
import { S, save } from "../core/accounts.js";
import { esc } from "../core/util.js";
import { aiConnect, aiDetect, aiKey, aiLabel } from "../services/ai.js";
import { beep } from "../services/speech.js";
import { mascot } from "../ui/mascot.js";
import { renderAll } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";
import { interestsPicker } from "./interests";

/** [identifiant, libellé, emoji, consigne pour l'IA] (même consigne dans server/api/generate.php) */
export const GOALS: [string, string, string, string][] = [
  ["trip", "Voyager", "🧳", "voyager et se débrouiller sur place"],
  ["job", "Pour mon travail", "💼", "utiliser la langue dans son travail"],
  ["exam", "Réussir un examen", "🎓", "réussir un examen (TOEIC, Certificat Voltaire, TOPIK…)"],
  ["study", "Mes études", "📖", "réussir ses études"],
  ["people", "Parler avec des proches", "💬", "parler avec des proches ou des amis"],
  ["fun", "Pour le plaisir", "🎉", "le plaisir d'apprendre (culture, séries, musique)"],
];
const P = (): any => S;
export const goalId = (): string => (GOALS.some(g => g[0] === P().why) ? P().why : "");
export const goalText = (): string => (GOALS.find(g => g[0] === goalId()) || ["", "", "", ""])[3];

/** Première visite du profil : la fenêtre s'ouvre une seule fois (ensuite, bouton « Personnaliser mon expérience »). */
export function personalizeFirstVisit(): void {
  const st = P();
  if (!st.onb || st.pzSeen) return;
  if (!document.querySelector("#modal")?.classList.contains("hidden")) return;
  st.pzSeen = true;
  save();
  personalize();
}

export function personalize(): void {
  const m = modal(
    `<div class="mcenter">${mascot("happy", "jump")}<h2>Personnalise ton expérience</h2><p>Trois questions rapides pour que les leçons créées par l'IA te ressemblent : ton objectif, tes centres d'intérêt et ton Claude.</p></div>
    <button class="btn" id="pzGo">C'est parti</button><button class="btn ghost" id="pzLater">Plus tard</button>`,
  );
  (m.querySelector("#pzGo") as HTMLElement).onclick = stepGoal;
  (m.querySelector("#pzLater") as HTMLElement).onclick = closeModal;
}

function stepGoal(): void {
  let sel = goalId();
  const m = modal(
    `<div class="mcenter"><h2>Pourquoi tu apprends ?</h2><p>L'IA choisira des situations utiles pour ton objectif.</p></div>
    <div class="choices pzgoals">${GOALS.map(([id, l, e]) => `<button data-g="${id}" class="${id === sel ? "sel" : ""}"><span class="e">${e}</span><span>${l}</span></button>`).join("")}</div>
    <button class="btn" id="pzG">Continuer</button><button class="btn ghost" id="pzGs">Passer</button>`,
    "",
    true,
  );
  m.querySelectorAll("[data-g]").forEach((b: HTMLElement) => {
    b.onclick = () => {
      sel = b.dataset.g || "";
      m.querySelectorAll("[data-g]").forEach((x: HTMLElement) => x.classList.toggle("sel", x === b));
      beep("tap");
    };
  });
  (m.querySelector("#pzG") as HTMLElement).onclick = () => {
    P().why = sel;
    save();
    interestsPicker(stepClaude, "Passer");
  };
  (m.querySelector("#pzGs") as HTMLElement).onclick = () => interestsPicker(stepClaude, "Passer");
}

async function stepClaude(): Promise<void> {
  const mode = await aiDetect();
  const ready = mode !== "local";
  const m = modal(
    `<div class="mcenter"><h2>Ton Claude</h2><p>${
      ready
        ? "Ton IA est prête : les leçons du jour, les révisions et les conversations seront créées pour toi."
        : "Connecte ta clé Claude pour des leçons créées pour toi. Elle reste sur cet appareil, liée à ce profil."
    }</p><p class="pzstat">${esc(aiLabel(mode))}</p></div>
    ${
      ready
        ? ""
        : `<label class="flabel">Clé API Claude</label><input class="finput" id="pzKey" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="sk-ant-api03-…" value="${esc(aiKey())}">
    <div id="pzMsg" class="aimsg"></div><button class="btn" id="pzCon">Enregistrer et tester</button>
    <details class="aihelp"><summary>Comment obtenir ma clé ?</summary><ol><li>Va sur <b>console.anthropic.com</b> et connecte-toi (ou crée un compte).</li><li>Menu <b>Billing</b> : ajoute quelques euros de crédit (l'API est facturée à l'usage, séparément de l'abonnement claude.ai).</li><li>Menu <b>API Keys</b> → <b>Create Key</b>, puis copie la clé qui commence par <code>sk-ant-</code>.</li><li>Colle-la ici. « Automatique » utilise Haiku pour les exercices (quelques centimes par séance) et Sonnet pour les corrections et les créations.</li></ol></details>`
    }
    <button class="btn ${ready ? "" : "ghost"}" id="pzEnd">${ready ? "Terminer" : "Plus tard"}</button>`,
    "",
    true,
  );
  const con = m.querySelector("#pzCon") as HTMLButtonElement | null;
  if (con)
    con.onclick = async () => {
      const msg = m.querySelector("#pzMsg") as HTMLElement;
      con.disabled = true;
      msg.className = "aimsg";
      msg.textContent = "⏳ Test de la clé…";
      const r = await aiConnect((m.querySelector("#pzKey") as HTMLInputElement).value, "");
      con.disabled = false;
      msg.className = "aimsg " + r.cls;
      msg.textContent = r.text;
      if (r.cls === "ok") {
        beep("win");
        setTimeout(stepClaude, 900);
      }
    };
  (m.querySelector("#pzEnd") as HTMLElement).onclick = finish;
}

function finish(): void {
  P().pzDone = true;
  save();
  closeModal();
  toast("✨ Ton profil est personnalisé !");
  renderAll();
}
