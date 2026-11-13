// Point d'entrée : imports de tous les modules puis démarrage
import "./i18n/locale.js";
import "./content/index.js";
import "./i18n/translate.js";
import "./screens/language.js";
import "./core/util.js";
import "./core/state.js";
import "./core/progress.js";
import "./core/accounts.js";
import "./services/cloud.js";
import "./core/xp.js";
import "./ui/platform.js";
import "./services/speech.js";
import "./exercises/validate.js";
import "./ui/mascot.js";
import "./ui/ui.js";
import "./features/quests.js";
import "./exercises/generate.js";
import "./exercises/distractors.js";
import "./exercises/hangul.js";
import "./exercises/drills.js";
import "./lesson/build.js";
import "./ui/router.js";
import "./features/placement.js";
import "./screens/path.js";
import "./screens/training.js";
import "./features/theme-training.js";
import "./features/word-bank.js";
import "./features/grammar.js";
import "./screens/profile.js";
import "./screens/settings.js";
import "./screens/streak.js";
import "./features/ai-units.js";
import "./screens/stats.js";
import "./screens/stories.js";
import "./screens/league.js";
import "./screens/shop.js";
import "./services/ai.js";
import "./features/coach.js";
import "./services/reminders.js";
import "./lesson/engine.js";
import "./lesson/writing.js";
import "./exercises/render.js";
import "./lesson/keyboard.js";
import "./screens/accounts.js";
import "./screens/onboarding.js";
import "./ui/back-button.js";
import "./lesson/keyboard.js";
import "./ui/typography.js";
import "./globals.js";
import { COURSES } from "./content/index.js";
import { ACC, MEM, S, curAcc, loadAcc, loadState, save, set_S } from "./core/accounts.js";
import { $ } from "./core/util.js";
import { daily } from "./core/xp.js";
import { indexItems } from "./exercises/generate.js";
import { BASE_UNITS, applyGenUnits } from "./features/ai-units.js";
import { UI, UI_ASK } from "./i18n/locale.js";
import { trAttrs, trNode, trText, trTree } from "./i18n/translate.js";
import { L, wakeOn } from "./lesson/engine.js";
import { accountForm, accountPicker } from "./screens/accounts.js";
import { langPicker } from "./screens/language.js";
import { leagueCheck } from "./screens/league.js";
import { onboarding } from "./screens/onboarding.js";
import { SRV, cloudInit, loginForm, netUI, onOnline, srvDetect, srvPull } from "./services/cloud.js";
import { TTS_UNLOCK, loadVoices, set_TTS_UNLOCK } from "./services/speech.js";
import { installBackButton } from "./ui/back-button.js";
import { mascot } from "./ui/mascot.js";
import { INSTALL, THEME, setTheme } from "./ui/platform.js";
import { renderAll, route, sectionPicker } from "./ui/router.js";
import { installTypography } from "./ui/typography.js";

if (UI !== "fr") {
  trTree(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === "characterData") trNode(m.target);
      else if (m.type === "attributes") trAttrs(m.target);
      else m.addedNodes.forEach(trTree);
    }
  }).observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"],
  });
  for (const f of ["alert", "confirm", "prompt"]) {
    const o = window[f];
    if (typeof o === "function") window[f] = (m, ...r) => o.call(window, trText(String(m == null ? "" : m)), ...r);
  }
}
if (THEME() !== "auto") setTheme(THEME());
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  INSTALL.ev = e;
  try {
    if (S && !/^#?(profil|reglages)/.test(location.hash)) renderAll();
  } catch (x) {}
});
window.addEventListener("appinstalled", () => {
  INSTALL.ev = null;
  try {
    S.set.hideInstall = true;
    save();
  } catch (x) {}
});
if ("speechSynthesis" in window) {
  loadVoices();
  try {
    speechSynthesis.onvoiceschanged = loadVoices;
  } catch (e) {}
}
document.addEventListener(
  "pointerdown",
  () => {
    if (TTS_UNLOCK || !("speechSynthesis" in window)) return;
    set_TTS_UNLOCK(true);
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
      loadVoices();
    } catch (e) {}
  },
  { once: false, passive: true },
);
Object.entries(COURSES).forEach(([cid, C]) => (BASE_UNITS[cid] = C.units.slice()));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && L) wakeOn();
});
// ===================== DÉMARRAGE =====================
$("#secBtn").onclick = sectionPicker;
$(".brand").innerHTML = mascot("happy") + "<span>Speakeasy</span>";
window.addEventListener("hashchange", route);
$("#accBtn").onclick = () => accountPicker();
indexItems();
loadAcc();
window.addEventListener("online", onOnline);
window.addEventListener("offline", netUI);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !navigator.onLine) return;
  if (Date.now() - (SRV.lastPull || 0) < 30000) return;
  SRV.lastPull = Date.now();
  if (!SRV.ok) onOnline();
  else srvPull();
});
try {
  SRV.pending = !!localStorage.getItem("speakeasy-pending:" + ACC.current);
} catch (e) {}
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !window.claude) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
try {
  navigator.storage && navigator.storage.persist && navigator.storage.persist();
} catch (e) {}
(async () => {
  await srvDetect();
  if (ACC.current && curAcc()) {
    set_S(loadState(ACC.current));
    MEM[ACC.current] = S;
    applyGenUnits();
    daily();
    route();
    const a = curAcc();
    if (a.srv && !a.token) loginForm(a.name, true);
    else if (a.pin || ACC.list.length > 1) accountPicker(true);
    else {
      if (!S.onb) onboarding();
      if (a.srv) {
        SRV.lastPull = Date.now();
        srvPull().then(() => setTimeout(leagueCheck, 1500));
      }
    }
    netUI();
  } else {
    route();
    const go = () => {
      if (ACC.list.length) accountPicker(true);
      else accountForm(null, true);
    };
    if (UI_ASK) langPicker(go);
    else go();
  }
})();
if (ACC.current) cloudInit();
installBackButton();
installTypography();
