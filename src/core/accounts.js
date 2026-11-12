// Profils de l'appareil et sauvegarde locale de l'état S
import { hydrate } from "./progress.js";
import { KEY } from "./state.js";
import { cloudSave, srvPush } from "../services/cloud.js";

// ---- Comptes : chaque compte a sa propre progression (stockée dans ce navigateur) ----
export const AKEY = "speakeasy-accounts";
export const AV_EMOJI = ["🐯", "🦊", "🐼", "🐨", "🐸", "🦄", "🐙", "🐧", "🐰", "🦁"];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export let ACC = { current: null, list: [] };
export function saveAcc() {
  try {
    localStorage.setItem(AKEY, JSON.stringify(ACC));
  } catch (e) {}
}
export function loadAcc() {
  let a = null;
  try {
    a = JSON.parse(localStorage.getItem(AKEY) || "null");
  } catch (e) {}
  if (a && Array.isArray(a.list)) ACC = a;
  if (!ACC.list.length) {
    let old = null;
    try {
      old = localStorage.getItem(KEY);
    } catch (e) {}
    if (old) {
      const id = uid();
      ACC.list.push({ id, name: "Moi", emoji: "🐯", color: "#7C4DFF", pin: "" });
      ACC.current = id;
      try {
        localStorage.setItem(KEY + ":" + id, old);
        localStorage.removeItem(KEY);
      } catch (e) {}
      saveAcc();
    }
  }
}
export const curAcc = () => ACC.list.find(a => a.id === ACC.current);
export function loadState(id) {
  try {
    return hydrate(JSON.parse(localStorage.getItem(KEY + ":" + id) || "{}"));
  } catch (e) {
    return hydrate({});
  }
}
export const MEM = {};
/** État du profil courant (voir types.ts : State). Lecture partout ; remplacement entier avec set_S(). */
export let S = hydrate({});
/** Remplace l'état du profil courant (changement de profil, chargement, réinitialisation). */
export function set_S(v) {
  return (S = v);
}
export function save() {
  S.ts = Date.now();
  if (!ACC.current) return;
  MEM[ACC.current] = S;
  try {
    localStorage.setItem(KEY + ":" + ACC.current, JSON.stringify(S));
  } catch (e) {}
  cloudSave();
  srvPush();
}
