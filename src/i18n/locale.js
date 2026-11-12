// Langue d'interface (fr / en / ko) et constantes associées

// ===================== LANGUE DE L'INTERFACE (FR / EN) =====================
// Choix mémorisé sur l'appareil. Première visite : langue du navigateur (français → FR, sinon EN).
// Les appareils qui avaient déjà Speakeasy restent en français.
// Première ouverture : la langue est demandée tout de suite (pré-sélection d'après le navigateur).
export let UI_ASK = false;
export function set_UI_ASK(v) {
  return (UI_ASK = v);
}
export const KO_READY = true; // version coréenne en cours de traduction : masquée tant qu'elle n'est pas complète
export const UI = (() => {
  try {
    const v = localStorage.getItem("speakeasy-ui");
    if (v === "fr" || v === "en" || (v === "ko" && KO_READY)) return v;
    if (localStorage.getItem("speakeasy-accounts")) {
      localStorage.setItem("speakeasy-ui", "fr");
      return "fr";
    }
    const ls = (
      navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "fr"]
    ).map(x => String(x).toLowerCase());
    UI_ASK = true;
    return ls.some(x => x.startsWith("fr")) ? "fr" : ls.some(x => x.startsWith("ko")) && KO_READY ? "ko" : "en";
  } catch (e) {
    return "fr";
  }
})();
export const BASE_LANG = UI === "en" ? "en-US" : UI === "ko" ? "ko-KR" : "fr-FR";
export const NONFR = UI !== "fr";
export const KO_SUFFIX =
  '\n\nIMPORTANT — LANGUAGE OF THE LEARNER: the learner is a native Korean speaker using the app in Korean (not a French speaker). Ignore the earlier mentions of a French-speaking learner. Every text that would normally be written in French for the learner (sentences to translate, translations in the "fr" fields, word meanings, instructions, explanations, tips, feedback, diagnostics, titles, questions about a story) must be written in natural Korean (polite 해요체) instead. Keep the JSON field names exactly as specified. The language being studied stays as specified (English content stays in English, French content stays in French).';
export const EN_SUFFIX =
  '\n\nIMPORTANT — LANGUAGE OF THE LEARNER: the learner is an English speaker using the app in English (not a French speaker). Ignore the earlier mentions of a French-speaking learner. Every text that would normally be written in French for the learner (sentences to translate, translations in the "fr" fields, word meanings, instructions, explanations, tips, feedback, diagnostics, titles, questions about a story) must be written in English instead. Keep the JSON field names exactly as specified. The language being studied stays as specified (French content stays in French when French is the language studied).';
