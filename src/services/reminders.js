// Rappels quotidiens (Web Push)
import { S, curAcc, save, saveAcc } from "../core/accounts.js";
import { esc } from "../core/util.js";
import { srv, srvPush } from "./cloud.js";
import { beep } from "./speech.js";
import { renderAll } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";

// ---------- Rappels quotidiens (Web Push, app écran d'accueil iOS 16.4+) ----------
export const PUSH_URL = "api/push.php";
export const pushCapable = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export function b64uToU8(b) {
  const p = "=".repeat((4 - (b.length % 4)) % 4);
  const s = atob((b + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}
// Profil local → compte en ligne : même progression, désormais synchronisée (rappels, ligues, autres appareils)
export function goOnline() {
  const a = curAcc();
  if (!a || a.srv) return;
  const m =
    modal(`<h2>☁️ Passer en ligne</h2><p class="secsub">Ton profil « ${esc(a.name)} » et toute sa progression sont enregistrés sur le serveur : rappels quotidiens, ligues, et connexion depuis tes autres appareils.</p>
 <label class="flabel">Pseudo</label><input class="finput" id="on" value="${esc(a.name)}" maxlength="20" autocomplete="username">
 <label class="flabel">Mot de passe (6 caractères minimum)</label><input class="finput" id="op" type="password" autocomplete="new-password">
 <div id="oerr" style="color:var(--bad);min-height:20px;margin-top:6px"></div><button class="btn" id="ook">Enregistrer en ligne</button><button class="btn ghost" id="ocancel">Annuler</button>`);
  m.querySelector("#ocancel").onclick = closeModal;
  m.querySelector("#ook").onclick = async () => {
    const name = m.querySelector("#on").value.trim(),
      password = m.querySelector("#op").value,
      err = m.querySelector("#oerr");
    if (!/^[\p{L}\p{N} _.\-]{2,20}$/u.test(name)) return (err.textContent = "Pseudo : 2 à 20 lettres ou chiffres.");
    if (password.length < 6) return (err.textContent = "Mot de passe : 6 caractères minimum.");
    err.textContent = "…";
    let j;
    try {
      j = await srv("register", { name, password, emoji: a.emoji, color: a.color });
    } catch (e) {
      return (err.textContent = "Serveur injoignable, réessaie.");
    }
    if (!j.ok)
      return (err.textContent =
        j.error === "taken"
          ? "Ce pseudo est déjà pris."
          : j.error === "rate_limited"
            ? "Trop de tentatives, réessaie plus tard."
            : "Impossible de créer le compte.");
    Object.assign(a, { name: j.name, srv: true, token: j.token, pin: "" });
    saveAcc();
    save();
    srvPush();
    closeModal();
    renderAll();
    beep("win");
    toast("☁️ Profil enregistré en ligne !");
  };
  setTimeout(() => m.querySelector("#op").focus(), 60);
}
export async function remindSet(hour) {
  const a = curAcc();
  if (!a || !a.srv || !a.token) {
    toast("Crée ou connecte un compte en ligne pour activer les rappels.");
    return false;
  }
  try {
    if (!hour) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(PUSH_URL + "?a=unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: a.token, endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      S.set.remind = 0;
      save();
      toast("🔕 Rappels désactivés");
      return true;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast("Notifications refusées : autorise-les dans Réglages › Notifications › Speakeasy.");
      return false;
    }
    const k = await (await fetch(PUSH_URL + "?a=key")).json();
    if (!k.ok) throw 0;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(k.key) });
    const j = await (
      await fetch(PUSH_URL + "?a=subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: a.token, sub: sub.toJSON(), hour, tz: -new Date().getTimezoneOffset() }),
      })
    ).json();
    if (!j.ok) throw 0;
    S.set.remind = hour;
    save();
    toast(`🔔 Rappel chaque jour à ${hour} h si tu n'as pas encore pratiqué`);
    return true;
  } catch (e) {
    toast("Impossible d'activer les rappels pour l'instant.");
    return false;
  }
}
