// Choix, création, export et suppression des profils
import { ACC, AV_EMOJI, MEM, S, curAcc, loadState, save, saveAcc, set_S, uid } from "../core/accounts.js";
import { hydrate } from "../core/progress.js";
import { KEY } from "../core/state.js";
import { UCOLORS, dkey, esc, rnd, yest } from "../core/util.js";
import { daily, level } from "../core/xp.js";
import { applyGenUnits } from "../features/ai-units.js";
import { UI } from "../i18n/locale.js";
import { L, closeLesson } from "../lesson/engine.js";
import { onboarding } from "./onboarding.js";
import { SRV, cloudInit, loginEntry, loginForm, set_cloudRef, srv, srvPull } from "../services/cloud.js";
import { beep } from "../services/speech.js";
import { mascot } from "../ui/mascot.js";
import { avatar, renderAll } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";

// ===================== COMPTES =====================
export function accStats(a) {
  const st = a.id === ACC.current ? S : MEM[a.id] || loadState(a.id);
  return `Niv. ${level(st.xp)} · 🔥 ${st.lastDay === dkey() || st.lastDay === yest() ? st.streak : 0} · ${st.xp} XP`;
}
export function accountPicker(forced) {
  if (L) closeLesson();
  const m = modal(
    `<div class="mcenter">${mascot("happy", "jump")}<h2>Qui apprend aujourd'hui ?</h2><p>Chaque compte a sa propre progression, sa série et ses badges.</p></div><div class="accgrid">${ACC.list.map(a => `<button class="acc ${a.id === ACC.current ? "sel" : ""}" data-a="${a.id}">${avatar(a, 64)}<b>${esc(a.name)}${a.pin ? " 🔒" : ""}${a.srv ? " ☁️" : ""}</b><small>${accStats(a)}</small></button>`).join("")}<button class="acc add" id="aNew"><span class="avatar" style="background:var(--soft);width:64px;height:64px;font-size:30px;color:var(--pri)">＋</span><b>Ajouter</b><small>Nouveau compte</small></button></div><button class="btn ghost" id="aLogin">🔑 J'ai déjà un compte</button>${!forced ? '<button class="btn ghost" onclick="closeModal()">Fermer</button>' : ""}`,
    "",
    !!forced,
  );
  const al = m.querySelector("#aLogin");
  if (al) al.onclick = () => loginEntry(forced);
  m.querySelectorAll("[data-a]").forEach(
    b =>
      (b.onclick = () => {
        const a = ACC.list.find(x => x.id === b.dataset.a);
        beep("tap");
        if (a.srv && !a.token) loginForm(a.name, forced);
        else if (a.pin && (forced || a.id !== ACC.current)) askPin(a, () => switchTo(a.id), forced);
        else switchTo(a.id);
      }),
  );
  m.querySelector("#aNew").onclick = () => accountForm(null, forced);
}
export function askPin(a, ok, forced) {
  const m = modal(
    `<div class="mcenter">${avatar(a, 72)}<h2>${esc(a.name)}</h2><p>Entre ton code PIN</p><input class="pin" id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><div id="perr" style="color:var(--bad);min-height:22px;margin-top:8px"></div><button class="btn" id="pok">Valider</button><button class="btn ghost" id="pback">Retour</button></div>`,
    "",
    !!forced,
  );
  const inp = m.querySelector("#pin");
  setTimeout(() => inp.focus(), 50);
  const go = () => {
    if (inp.value === a.pin) {
      closeModal();
      ok();
    } else {
      beep("bad");
      inp.value = "";
      m.querySelector("#perr").textContent = "Code incorrect";
      inp.classList.add("shake");
      setTimeout(() => inp.classList.remove("shake"), 400);
    }
  };
  m.querySelector("#pok").onclick = go;
  inp.onkeydown = e => {
    if (e.key === "Enter") go();
  };
  inp.oninput = () => {
    if (inp.value.length === 4) go();
  };
  m.querySelector("#pback").onclick = () => accountPicker(forced);
}
export function accountForm(a, forced) {
  const isNew = !a;
  const online = isNew ? SRV.ok : !!(a && a.srv);
  let emoji = a ? a.emoji : rnd(AV_EMOJI),
    color = a ? a.color : rnd(UCOLORS);
  const m = modal(
    `${isNew && !ACC.list.length ? `<button class="chipbtn notr uisw" onclick="langPicker(()=>{})">🌐 ${UI === "fr" ? "Français" : UI === "en" ? "English" : "한국어"}</button>` : ""}<h2>${isNew ? (online ? "Créer mon compte" : "Nouveau compte") : "Modifier le compte"}</h2><p>${online ? "Ton compte est enregistré sur le serveur : retrouve ta progression sur tous tes appareils." : "Un prénom, un avatar, et un code PIN si tu veux protéger ta progression."}</p>
  <div class="mcenter" id="prev"></div>
  <label class="flabel">${online ? "Pseudo" : "Prénom"}</label><input class="finput" id="fn" maxlength="20" value="${a ? esc(a.name) : ""}" placeholder="Ex. Minji" ${online && !isNew ? "disabled" : ""} autocomplete="username">
  <label class="flabel">Avatar</label><div class="pickrow" id="fe">${AV_EMOJI.map(e => `<button data-e="${e}">${e}</button>`).join("")}</div>
  <label class="flabel">Couleur</label><div class="pickrow" id="fc">${UCOLORS.map(c => `<button data-c="${c}" style="background:${c}"></button>`).join("")}</div>
  ${online ? (isNew ? `<label class="flabel">Mot de passe (6 caractères minimum)</label><input class="finput" id="fpw" type="password" autocomplete="new-password">` : "") : `<label class="flabel">Code PIN à 4 chiffres (facultatif)</label><input class="finput" id="fp" type="password" inputmode="numeric" maxlength="4" value="${a ? esc(a.pin) : ""}" placeholder="Laisser vide = pas de code">`}
  ${isNew && !online ? `<p class="secsub" style="font-size:13px;margin:10px 0 0">${window.claude ? "☁️ Ce profil sera sauvegardé avec ton compte Claude : tu le retrouveras sur un autre appareil avec « J'ai déjà un compte »." : location.protocol.startsWith("http") ? "⚠️ Serveur de comptes non détecté : ce profil restera sur cet appareil. Touche « J'ai déjà un compte » pour réessayer la connexion au serveur." : "Ce profil reste sur cet appareil."}</p>` : ""}
  <div id="ferr" style="color:var(--bad);min-height:20px;margin-top:6px"></div>
  <button class="btn" id="fok">${isNew ? "Créer le compte" : "Enregistrer"}</button>${isNew ? `<button class="btn ghost" id="flogin">🔑 J'ai déjà un compte</button>` : ""}${!forced || ACC.list.length ? `<button class="btn ghost" id="fcancel">Annuler</button>` : ""}`,
    "",
    !!forced,
  );
  const fl = m.querySelector("#flogin");
  if (fl) fl.onclick = () => loginEntry(forced);
  const prev = () => {
    m.querySelector("#prev").innerHTML = avatar({ emoji, color }, 80);
    m.querySelectorAll("[data-e]").forEach(b => b.classList.toggle("sel", b.dataset.e === emoji));
    m.querySelectorAll("[data-c]").forEach(b => b.classList.toggle("sel", b.dataset.c === color));
  };
  prev();
  m.querySelectorAll("[data-e]").forEach(
    b =>
      (b.onclick = () => {
        emoji = b.dataset.e;
        beep("tap");
        prev();
      }),
  );
  m.querySelectorAll("[data-c]").forEach(
    b =>
      (b.onclick = () => {
        color = b.dataset.c;
        beep("tap");
        prev();
      }),
  );
  const fc = m.querySelector("#fcancel");
  if (fc) fc.onclick = () => (forced ? accountPicker(true) : closeModal());
  setTimeout(() => m.querySelector("#fn").focus(), 50);
  m.querySelector("#fok").onclick = async () => {
    const name = m.querySelector("#fn").value.trim(),
      pin = m.querySelector("#fp") ? m.querySelector("#fp").value.trim() : "",
      err = m.querySelector("#ferr");
    if (online && isNew) {
      const password = m.querySelector("#fpw").value;
      if (!/^[\p{L}\p{N} _.\-]{2,20}$/u.test(name)) return (err.textContent = "Pseudo : 2 à 20 lettres ou chiffres.");
      if (password.length < 6) return (err.textContent = "Mot de passe : 6 caractères minimum.");
      err.textContent = "…";
      let j;
      try {
        j = await srv("register", { name, password, emoji, color });
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
      const id = uid();
      ACC.list.push({ id, name: j.name, emoji, color, pin: "", srv: true, token: j.token });
      saveAcc();
      closeModal();
      switchTo(id, true);
      return;
    }
    if (online && !isNew) {
      Object.assign(a, { emoji, color });
      saveAcc();
      save();
      closeModal();
      renderAll();
      toast("✅ Compte mis à jour");
      return;
    }
    if (!name) return (err.textContent = "Choisis un prénom.");
    if (pin && !/^\d{4}$/.test(pin)) return (err.textContent = "Le code PIN doit contenir exactement 4 chiffres.");
    if (ACC.list.some(x => x.name.toLowerCase() === name.toLowerCase() && (!a || x.id !== a.id)))
      return (err.textContent = "Ce prénom est déjà utilisé.");
    if (isNew) {
      const id = uid();
      ACC.list.push({ id, name, emoji, color, pin });
      saveAcc();
      closeModal();
      switchTo(id, true);
    } else {
      Object.assign(a, { name, emoji, color, pin });
      saveAcc();
      closeModal();
      renderAll();
      toast("✅ Compte mis à jour");
    }
  };
}
export function switchTo(id, isNew) {
  if (L) closeLesson();
  ACC.current = id;
  saveAcc();
  set_S(MEM[id] || loadState(id));
  MEM[id] = S;
  set_cloudRef(null);
  applyGenUnits();
  daily();
  closeModal();
  if (location.hash !== "#parcours") location.hash = "parcours";
  renderAll();
  const a = curAcc();
  if (!S.onb) onboarding(isNew ? a.name : null);
  else toast(`${a.emoji} Bonjour ${a.name} !`);
  cloudInit();
  if (a.srv) srvPull();
}
export const b64e = s => btoa(unescape(encodeURIComponent(s))),
  b64d = s => decodeURIComponent(escape(atob(s)));
export function exportAcc() {
  const a = curAcc();
  save();
  const code = "SPK1." + b64e(JSON.stringify({ name: a.name, emoji: a.emoji, color: a.color, state: S }));
  const m = modal(
    `<h2>📤 Exporter ma progression</h2><p>Copie ce code, puis colle-le dans « Importer » sur l'autre appareil (ou garde-le comme sauvegarde).</p><textarea class="finput" id="ecode" readonly style="height:120px;font-size:12px;word-break:break-all">${code}</textarea><button class="btn" id="ecopy">Copier le code</button><button class="btn ghost" onclick="closeModal()">Fermer</button>`,
  );
  const ta = m.querySelector("#ecode");
  ta.onclick = () => ta.select();
  m.querySelector("#ecopy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast("📋 Code copié !");
    } catch (e) {
      ta.select();
      toast("Sélectionne le texte et copie-le (Ctrl+C)");
    }
  };
}
export function importAcc() {
  const m = modal(
    `<h2>📥 Importer une progression</h2><p>Colle le code exporté. Il sera ajouté comme un nouveau compte sur cet appareil.</p><textarea class="finput" id="icode" style="height:120px;font-size:12px" placeholder="SPK1.…"></textarea><div id="ierr" style="color:var(--bad);min-height:20px;margin-top:6px"></div><button class="btn" id="iok">Importer</button><button class="btn ghost" onclick="closeModal()">Annuler</button>`,
  );
  m.querySelector("#iok").onclick = () => {
    const raw = m.querySelector("#icode").value.trim();
    try {
      if (!raw.startsWith("SPK1.")) throw 0;
      const d = JSON.parse(b64d(raw.slice(5)));
      if (!d || !d.state) throw 0;
      let name = String(d.name || "Importé").slice(0, 20);
      while (ACC.list.some(x => x.name.toLowerCase() === name.toLowerCase())) name += " (2)";
      const id = uid();
      ACC.list.push({ id, name, emoji: d.emoji || "🐯", color: d.color || "#7C4DFF", pin: "" });
      saveAcc();
      try {
        localStorage.setItem(KEY + ":" + id, JSON.stringify(hydrate(d.state)));
      } catch (e) {
        MEM[id] = hydrate(d.state);
      }
      closeModal();
      switchTo(id);
      toast("📥 Progression importée");
    } catch (e) {
      m.querySelector("#ierr").textContent = "Ce code n'est pas valide.";
    }
  };
}
export function deleteAcc() {
  const a = curAcc();
  const m = modal(
    `<div class="mcenter">${mascot("sad", "sad")}<h2>Supprimer « ${esc(a.name)} » ?</h2><p>${a.srv ? "Le compte et toute sa progression seront supprimés du serveur. C'est définitif." : "Toute la progression de ce compte sera effacée de cet appareil. Pense à l'exporter avant si tu veux la garder."}</p>${a.srv ? '<input class="finput" id="dpw" type="password" placeholder="Ton mot de passe pour confirmer"><div id="derr" style="color:var(--bad);min-height:20px;margin-top:6px"></div>' : ""}<button class="btn badb" id="dy">Supprimer définitivement</button><button class="btn ghost" onclick="closeModal()">Annuler</button></div>`,
  );
  m.querySelector("#dy").onclick = async () => {
    if (a.srv) {
      let j = {};
      try {
        j = await srv("delete", { token: a.token, password: m.querySelector("#dpw").value });
      } catch (e) {}
      if (!j.ok) {
        m.querySelector("#derr").textContent =
          j.error === "bad" ? "Mot de passe incorrect." : "Suppression impossible pour l'instant.";
        return;
      }
    }
    try {
      localStorage.removeItem(KEY + ":" + a.id);
    } catch (e) {}
    delete MEM[a.id];
    ACC.list = ACC.list.filter(x => x.id !== a.id);
    ACC.current = null;
    saveAcc();
    closeModal();
    set_S(hydrate({}));
    if (ACC.list.length) accountPicker(true);
    else accountForm(null, true);
    toast("Compte supprimé");
  };
}
