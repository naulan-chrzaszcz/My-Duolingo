// Bouton retour (Android, geste retour) : ferme leçons et fenêtres sans quitter le site
import { $ } from "../core/util.js";
import { L, closeLesson, openSession, set_closeLesson, set_openSession } from "../lesson/engine.js";
import { playStory, set_playStory } from "../screens/stories.js";
import { ANDROID } from "./platform.js";
import { closeModal, modal, set_closeModal, set_modal } from "./ui.js";

// ===================== BOUTON RETOUR (Android, geste retour) =====================
// Une seule entrée d'historique « garde » par fenêtre ouverte. Fermer une fenêtre ne remonte JAMAIS l'historique
// tout seul (un retour différé pouvait sortir du site quand une autre fenêtre s'ouvrait juste après) :
// l'entrée devient « libre » et sera réutilisée par la prochaine fenêtre.
export function installBackButton() {
  (function () {
    const H = { on: false, stale: false, href: "" };
    const mOpen = () => !$("#modal").classList.contains("hidden");
    const ov = () => !!L || mOpen();
    const isGuard = () => !!(history.state && history.state.sk);
    const arm = () => {
      if (H.on) return;
      try {
        if (!isGuard()) history.pushState({ sk: 1 }, "", location.href);
        H.on = true;
        H.stale = false;
      } catch (e) {}
    };
    if (isGuard()) {
      H.stale = true;
      H.href = location.href;
    } // page rechargée sur une entrée « garde »
    const disarm = () => {
      if (H.on && !ov()) {
        H.on = false;
        H.stale = isGuard();
        H.href = location.href;
      }
    };
    const wrap = (f, after) =>
      function (...a) {
        const r = f.apply(this, a);
        after();
        return r;
      };
    set_modal(wrap(modal, arm));
    set_openSession(wrap(openSession, arm));
    set_playStory(wrap(playStory, arm));
    set_closeModal(wrap(closeModal, () => setTimeout(disarm, 0)));
    set_closeLesson(wrap(closeLesson, () => setTimeout(disarm, 0)));
    window.addEventListener("hashchange", () => {
      if (!isGuard()) H.stale = false;
    });
    window.addEventListener("popstate", () => {
      if (H.on) {
        H.on = false;
        if (mOpen()) {
          const x = $("#modal .mx");
          if (x) closeModal();
          else {
            arm();
            return;
          }
        } else if (L) {
          const lx = $("#lx");
          if (lx) lx.click();
          else closeLesson();
        }
        if (ov()) arm();
        return;
      }
      // retour depuis une entrée « garde » restée libre : on saute directement à la page précédente
      // (un changement d'onglet par #ancre déclenche aussi popstate : l'adresse change alors, on ne fait rien)
      if (H.stale && !isGuard()) {
        H.stale = false;
        if (location.href === H.href) {
          try {
            history.back();
          } catch (e) {}
        }
      }
    });
  })();
}
// Clavier Android : garde le champ actif visible au-dessus du clavier
document.addEventListener("focusin", e => {
  const t = e.target;
  if (!ANDROID || !t || !t.matches || !t.matches("input,textarea")) return;
  setTimeout(() => {
    try {
      t.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (x) {}
  }, 300);
});
