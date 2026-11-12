// Raccourcis clavier pendant les leçons
import { $ } from "../core/util.js";
import { L, check } from "./engine.js";

// ===================== CLAVIER =====================
document.addEventListener("keydown", e => {
  if (!L || !$("#modal").classList.contains("hidden")) return;
  const tag = (document.activeElement || {}).tagName;
  if (e.key === "Enter") {
    if (tag === "TEXTAREA") return;
    if (L.state === "answer") {
      const c = $("#chk");
      if (c && !c.disabled) {
        e.preventDefault();
        check();
      }
    } else if (L.state === "feedback") {
      const c = $("#cont");
      if (c) {
        e.preventDefault();
        c.click();
      }
    } else if (L.state === "story") {
      const c = $("#snext");
      if (c && !c.disabled) {
        e.preventDefault();
        c.click();
      }
    } else if (L.state === "end") {
      const c = $("#endc");
      if (c) {
        e.preventDefault();
        c.click();
      }
    }
    return;
  }
  if (tag !== "TEXTAREA" && L.state === "answer" && /^[1-4]$/.test(e.key) && L.ctrl && L.ctrl.key)
    L.ctrl.key(+e.key - 1);
  if (L.state === "story" && /^[1-4]$/.test(e.key)) {
    const os = [...document.querySelectorAll(".sq:last-child .opt")];
    const o = os[+e.key - 1];
    o && !o.disabled && o.click();
  }
});
// Clavier (ordinateur, et touche « OK » du clavier du téléphone) :
// Entrée = Vérifier puis Continuer ; 1 à 9 = choisir une réponse
document.addEventListener("keydown", e => {
  if (!L || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
  const les = $("#lesson");
  if (!les || les.classList.contains("hidden")) return;
  if (!$("#modal").classList.contains("hidden")) return;
  const t = e.target,
    tag = t && t.tagName;
  if (e.key === "Enter") {
    if (e.shiftKey || (t && t.classList && t.classList.contains("wtxt"))) return;
    if (tag === "BUTTON" || tag === "A" || tag === "SELECT") return;
    const go =
      $("#cont") ||
      (() => {
        const c = $("#chk");
        return c && !c.disabled ? c : null;
      })();
    if (go) {
      e.preventDefault();
      go.click();
    } else if (tag === "TEXTAREA") e.preventDefault();
    return;
  }
  if (/^[1-9]$/.test(e.key) && tag !== "INPUT" && tag !== "TEXTAREA" && L.state === "answer") {
    const o = document.querySelectorAll("#lbody .opt")[+e.key - 1];
    if (o && !o.disabled) {
      e.preventDefault();
      o.click();
    }
  }
});
