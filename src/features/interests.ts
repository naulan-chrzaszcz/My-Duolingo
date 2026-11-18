// Centres d'intérêt de l'élève (v39) : choisis à l'accueil ou dans Paramètres › Préférences,
// ils orientent les phrases générées par l'IA (leçon du jour, étapes IA, révisions, bilan, coach).
import { S, save } from "../core/accounts.js";
import { esc } from "../core/util.js";
import { beep } from "../services/speech.js";
import { closeModal, modal, toast } from "../ui/ui.js";

/** [identifiant stable, libellé affiché (et envoyé à l'IA), emoji] */
export const INTERESTS: [string, string, string][] = [
  ["travel", "Voyage", "✈️"],
  ["food", "Cuisine", "🍜"],
  ["sport", "Sport", "⚽"],
  ["music", "Musique", "🎵"],
  ["screen", "Cinéma et séries", "🎬"],
  ["games", "Jeux vidéo", "🎮"],
  ["work", "Travail et carrière", "💼"],
  ["tech", "Technologie", "💻"],
  ["nature", "Nature et animaux", "🌿"],
  ["fashion", "Mode et beauté", "👗"],
  ["books", "Lecture", "📚"],
  ["health", "Santé et bien-être", "🧘"],
];
export const LIKES_MAX = 6;

const P = (): any => S;
export function likesIds(): string[] {
  const a = P().likes;
  return Array.isArray(a) ? a.filter((id: string) => INTERESTS.some(x => x[0] === id)) : [];
}
export function likesFree(): string {
  return typeof P().likeFree === "string" ? P().likeFree.slice(0, 60) : "";
}
/** Libellés envoyés à l'IA (au plus 7), dans l'ordre de la liste puis le texte libre */
export function likesList(): string[] {
  const ids = likesIds();
  const out = INTERESTS.filter(x => ids.includes(x[0])).map(x => x[1]);
  const f = likesFree().trim();
  if (f) out.push(f);
  return out.slice(0, LIKES_MAX + 1);
}

/** Fenêtre de choix : puces + champ libre. after() est appelé après « Enregistrer » ou « Passer ». */
export function interestsPicker(after?: () => void, skipLabel = "Annuler"): void {
  let sel = likesIds();
  const m = modal(
    `<div class="mcenter"><h2>Tes centres d'intérêt</h2><p>Les leçons créées par l'IA parleront de ce qui te plaît. Choisis jusqu'à ${LIKES_MAX} thèmes.</p></div>
    <div class="likes">${INTERESTS.map(([id, l, e]) => `<button class="likechip${sel.includes(id) ? " sel" : ""}" data-l="${id}" aria-pressed="${sel.includes(id)}"><span class="e">${e}</span><span>${l}</span></button>`).join("")}</div>
    <input class="finput" id="likeFree" maxlength="60" placeholder="Autre chose ? Ex. : la K-pop, l'escalade" value="${esc(likesFree())}">
    <button class="btn" id="likeOk">Enregistrer</button><button class="btn ghost" id="likeSkip">${skipLabel}</button>`,
    "",
    true,
  );
  m.querySelectorAll("[data-l]").forEach((b: HTMLElement) => {
    b.onclick = () => {
      const id = b.dataset.l || "";
      if (sel.includes(id)) sel = sel.filter(x => x !== id);
      else if (sel.length >= LIKES_MAX) {
        toast(`Jusqu'à ${LIKES_MAX} thèmes`);
        return;
      } else sel.push(id);
      b.classList.toggle("sel", sel.includes(id));
      b.setAttribute("aria-pressed", String(sel.includes(id)));
      beep("tap");
    };
  });
  (m.querySelector("#likeOk") as HTMLElement).onclick = () => {
    P().likes = sel;
    P().likeFree = ((m.querySelector("#likeFree") as HTMLInputElement).value || "").trim().slice(0, 60);
    save();
    closeModal();
    if (after) after();
    else toast("Centres d'intérêt enregistrés");
  };
  (m.querySelector("#likeSkip") as HTMLElement).onclick = () => {
    closeModal();
    if (after) after();
  };
}
