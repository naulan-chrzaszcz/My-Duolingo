// Détection iOS/Android/app installée, thème, installation, vibrations
import { S } from "../core/accounts.js";

// ===================== SONS, VOIX, MICRO =====================
export const IOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
// Thème clair / sombre : automatique (réglage du téléphone) ou forcé sur cet appareil
export function THEME() {
  try {
    const t = localStorage.getItem("speakeasy-theme");
    return t === "light" || t === "dark" ? t : "auto";
  } catch (e) {
    return "auto";
  }
}
export function setTheme(v) {
  try {
    if (v === "auto") localStorage.removeItem("speakeasy-theme");
    else localStorage.setItem("speakeasy-theme", v);
  } catch (e) {}
  const h = document.documentElement;
  if (v === "auto") h.removeAttribute("data-theme");
  else h.setAttribute("data-theme", v);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    const dk = m.getAttribute("media") && m.getAttribute("media").includes("dark");
    if (v === "auto") m.setAttribute("content", dk ? "#15121F" : "#F6F4FF");
    else m.setAttribute("content", v === "dark" ? "#15121F" : "#F6F4FF");
  });
  const cs = document.querySelector('meta[name="color-scheme"]');
  if (cs) cs.setAttribute("content", v === "light" ? "only light" : v === "dark" ? "dark" : "light dark");
}
export const ANDROID = /Android/i.test(navigator.userAgent);
export const STANDALONE =
  window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
// Retour haptique : navigator.vibrate (Android) ou astuce <input switch> de Safari iOS 18+
export const INSTALL = { ev: null };
export function iosTick() {
  const l = document.createElement("label");
  l.setAttribute("aria-hidden", "true");
  l.style.display = "none";
  const i = document.createElement("input");
  i.type = "checkbox";
  i.setAttribute("switch", "");
  l.appendChild(i);
  document.head.appendChild(l);
  l.click();
  l.remove();
}
export function haptic(n) {
  if (!S || !S.set || !S.set.haptic) return;
  try {
    if (navigator.vibrate && !IOS) {
      navigator.vibrate(n > 1 ? [25, 60, 25] : 15);
      return;
    }
    if (!IOS) return;
    iosTick();
    if (n > 1)
      setTimeout(() => {
        try {
          iosTick();
        } catch (e) {}
      }, 120);
  } catch (e) {}
}
