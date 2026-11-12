// Comptes en ligne (api/account.php) : synchronisation, connexion, classement
import { ACC, MEM, S, curAcc, loadState, save, saveAcc, set_S, uid } from "../core/accounts.js";
import { hydrate } from "../core/progress.js";
import { KEY } from "../core/state.js";
import { dkey, esc } from "../core/util.js";
import { daily } from "../core/xp.js";
import { applyGenUnits } from "../features/ai-units.js";
import { exKey } from "../lesson/engine.js";
import { accountForm, accountPicker, importAcc, switchTo } from "../screens/accounts.js";
import { weekStart, weekXp } from "../screens/league.js";
import { AI } from "./ai.js";
import { mascot } from "../ui/mascot.js";
import { avatar, renderAll } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";

// ---- Comptes en ligne (api/account.php) : progression sur tous les appareils + classement des membres ----
export const SRV = { ok: false, url: "api/account.php", timer: null };
export async function srvDetect() {
  if (!location.protocol.startsWith("http")) return false;
  try {
    const r = await Promise.race([
      fetch(SRV.url + "?a=ping", { cache: "no-store" }),
      new Promise((_, j) => setTimeout(() => j(0), 8000)),
    ]);
    const j = await r.json();
    SRV.ok = !!(j && j.ok);
  } catch (e) {
    SRV.ok = false;
  }
  return SRV.ok;
}
export async function srv(a, body) {
  const r = await Promise.race([
    fetch(SRV.url + "?a=" + a, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }),
    new Promise((_, j) => setTimeout(() => j(new Error("timeout")), 15000)),
  ]);
  let j = {};
  try {
    j = await r.json();
  } catch (e) {}
  if (r.status === 401) j.error = "auth";
  return j;
}
export function srvPush() {
  const a = curAcc();
  if (!a || !a.srv || !a.token) return;
  if (!SRV.ok || !navigator.onLine) {
    srvPendingSet(true);
    return;
  }
  clearTimeout(SRV.timer);
  SRV.timer = setTimeout(async () => {
    const x0 = S.xp,
      g0 = S.gems;
    try {
      const j = await srv("save", {
        token: a.token,
        state: JSON.stringify(S),
        ts: S.ts,
        wxp: weekXp(S),
        week: dkey(weekStart(0)),
        xp: S.xp,
        streak: S.streak || 0,
        emoji: a.emoji,
        color: a.color,
      });
      if (j.error === "auth") {
        a.token = "";
        saveAcc();
        toast("🔑 Session expirée : reconnecte-toi pour synchroniser.");
      } else if (j.ok) {
        syncBase({ xp: x0, gems: g0 });
        srvPendingSet(false);
      } else srvPendingSet(true);
    } catch (e) {
      srvPendingSet(true);
    }
  }, 1200);
}
export function mergeStates(a, b) {
  const n = (a.ts || 0) >= (b.ts || 0) ? a : b,
    o = n === a ? b : a;
  const m = JSON.parse(JSON.stringify(n));
  const O = JSON.parse(JSON.stringify(o));
  ["xp", "lessons", "perfect", "spoke", "bestCombo", "sprint", "mockBest", "voltBest", "koBest"].forEach(k => {
    m[k] = Math.max(+m[k] || 0, +O[k] || 0);
  });
  Object.entries(O.prog || {}).forEach(([c, v]) => {
    m.prog[c] = Math.max(m.prog[c] || 0, v || 0);
  });
  m.place = m.place || {};
  Object.entries(O.place || {}).forEach(([c, v]) => {
    m.place[c] = Math.max(m.place[c] || 0, v || 0);
  });
  m.dn = m.dn || {};
  Object.entries(O.dn || {}).forEach(([c, us]) => {
    const d = (m.dn[c] = m.dn[c] || {});
    Object.entries(us || {}).forEach(([u, k]) => {
      d[u] = (d[u] || 0) | (k || 0);
    });
  });
  Object.entries(O.week || {}).forEach(([d, v]) => {
    m.week[d] = Math.max(m.week[d] || 0, v || 0);
  });
  if ((O.lastDay || "") > (m.lastDay || "")) {
    m.lastDay = O.lastDay;
    m.streak = O.streak;
  } else if (O.lastDay === m.lastDay) m.streak = Math.max(m.streak || 0, O.streak || 0);
  ["badges", "stories", "owned"].forEach(k => {
    m[k] = [...new Set([...(m[k] || []), ...(O[k] || [])])];
  });
  Object.entries(O.ext || {}).forEach(([c, a]) => {
    m.ext[c] = [...new Set([...(m.ext[c] || []), ...(a || [])])];
  });
  Object.entries(O.bank || {}).forEach(([s, a]) => {
    const cur = (m.bank[s] = m.bank[s] || []);
    (a || []).forEach(w => {
      const x = cur.find(y => y.id === w.id || y.w === w.w);
      if (!x) cur.push(w);
      else if ((w.box || 0) > (x.box || 0) || (!x.tr && w.tr)) Object.assign(x, w);
    });
  });
  Object.entries(O.mist || {}).forEach(([c, a]) => {
    const cur = (m.mist[c] = m.mist[c] || []);
    (a || []).forEach(e => {
      if (!cur.some(x => exKey(x) === exKey(e))) cur.push(e);
    });
    if (cur.length > 80) m.mist[c] = cur.slice(-80);
  });
  Object.entries(O.elog || {}).forEach(([c, a]) => {
    const cur = (m.elog[c] = m.elog[c] || []);
    const seen = new Set(cur.map(x => JSON.stringify(x)));
    (a || []).forEach(e => {
      const k = JSON.stringify(e);
      if (!seen.has(k)) {
        seen.add(k);
        cur.push(e);
      }
    });
    cur.sort((x, y) => (x.ts || 0) - (y.ts || 0));
    if (cur.length > 60) m.elog[c] = cur.slice(-60);
  });
  Object.entries(O.genU || {}).forEach(([c, a]) => {
    if ((a || []).length > (m.genU[c] || []).length) m.genU[c] = a;
  });
  Object.entries(O.genStories || {}).forEach(([s, a]) => {
    const cur = (m.genStories[s] = m.genStories[s] || []);
    (a || []).forEach(st => {
      if (!cur.some(x => x.id === st.id)) cur.push(st);
    });
  });
  Object.entries(O.st || {}).forEach(([c, st]) => {
    if (!m.st[c]) m.st[c] = st;
  });
  m.ts = Math.max(a.ts || 0, b.ts || 0) + 1;
  return hydrate(m);
}
// Repère propre à CET appareil : XP et gemmes au moment de la dernière synchro réussie (jamais envoyé au serveur)
export function syncBase(st) {
  const k = "speakeasy-sync:" + ACC.current;
  try {
    if (st) {
      localStorage.setItem(k, JSON.stringify({ x: st.xp || 0, g: st.gems || 0 }));
      return;
    }
    return JSON.parse(localStorage.getItem(k) || "null");
  } catch (e) {
    return null;
  }
}
export function srvPendingSet(v) {
  SRV.pending = !!v;
  try {
    const k = "speakeasy-pending:" + ACC.current;
    v ? localStorage.setItem(k, "1") : localStorage.removeItem(k);
  } catch (e) {}
  netUI();
}
export function netUI() {
  let b = document.getElementById("netbar");
  const a = curAcc();
  const off = !navigator.onLine;
  const pend = !off && a && a.srv && SRV.pending;
  if (!off && !pend) {
    if (b) b.remove();
    return;
  }
  if (!b) {
    b = document.createElement("div");
    b.id = "netbar";
    document.body.appendChild(b);
  }
  b.className = off ? "off" : "pend";
  b.textContent = off
    ? "📴 Hors ligne · ta progression est gardée et sera synchronisée au retour du réseau"
    : "⏳ Synchronisation en attente…";
}
export async function onOnline() {
  netUI();
  AI.mode = null;
  await srvDetect();
  const a = curAcc();
  if (SRV.ok && a && a.srv && a.token) {
    SRV.lastPull = Date.now();
    await srvPull();
  }
}
export async function srvPull() {
  const a = curAcc();
  if (!SRV.ok || !a || !a.srv || !a.token) return;
  try {
    const j = await srv("load", { token: a.token });
    if (j.error === "auth") {
      a.token = "";
      saveAcc();
      loginForm(a.name);
      return;
    }
    if (j.ok && j.state) {
      const remote = hydrate(JSON.parse(j.state));
      const strip = x => JSON.stringify(Object.assign({}, x, { ts: 0 }));
      const before = strip(S);
      const m = mergeStates(S, remote);
      // XP et gemmes : on ajoute ce qui a été gagné (ou dépensé) ici depuis la dernière synchro, au total du serveur
      const B0 = syncBase(),
        dx = B0 ? (S.xp || 0) - B0.x : 0,
        dg = B0 ? (S.gems || 0) - B0.g : 0;
      m.xp = Math.max(m.xp || 0, (remote.xp || 0) + Math.max(0, dx));
      m.gems = Math.max(0, B0 ? (remote.gems || 0) + dg : m.gems || 0);
      if (strip(m) === strip(remote)) {
        m.ts = remote.ts || m.ts;
        syncBase(m);
      } else syncBase(remote);
      const changed = strip(m) !== before;
      set_S(m);
      MEM[a.id] = S;
      applyGenUnits();
      try {
        localStorage.setItem(KEY + ":" + a.id, JSON.stringify(S));
      } catch (e) {}
      if (changed) {
        daily();
        renderAll();
        toast("☁️ Progression synchronisée");
      }
      if (strip(m) !== strip(remote)) srvPush();
      else srvPendingSet(false);
    } else if (j.ok) srvPush();
  } catch (e) {}
}
// Point d'entrée « J'ai déjà un compte » : serveur de comptes, compte Claude, ou fichier exporté
export async function loginEntry(forced) {
  if (location.protocol.startsWith("http") && !window.claude) {
    const w = modal(
      `<div class="mcenter">${mascot("calm")}<h2>Connexion au serveur…</h2><div class="aiload"><i></i><i></i><i></i></div></div>`,
      "",
      true,
    );
    if (SRV.ok || (await srvDetect())) {
      closeModal();
      return loginForm("", forced);
    }
    const m = modal(
      `<div class="mcenter">${mascot("sad", "sad")}<h2>Serveur de comptes injoignable</h2><p>Les comptes en ligne passent par <b>api/account.php</b> sur ton site. Vérifie :</p></div><ul class="chk"><li>que <b>${esc(location.origin + location.pathname.replace(/[^/]*$/, ""))}api/account.php?a=ping</b> affiche <code>{"ok":true}</code> ;</li><li>que PHP a les extensions <b>PDO SQLite</b> et <b>cURL</b> ;</li><li>que le dossier <b>api/data</b> est accessible en écriture par PHP ;</li><li>que tu as du réseau (sinon réessaie au retour de la connexion).</li></ul><button class="btn" id="lretry">Réessayer</button><button class="btn ghost" id="limp">📥 Importer une progression exportée</button><button class="btn ghost" id="lback">Retour</button>`,
      "",
      !!forced,
    );
    m.querySelector("#lretry").onclick = () => loginEntry(forced);
    m.querySelector("#limp").onclick = () => {
      closeModal();
      importAcc();
    };
    m.querySelector("#lback").onclick = () =>
      forced || !ACC.list.length ? (ACC.list.length ? accountPicker(true) : accountForm(null, true)) : closeModal();
    return;
  }
  if (window.claude) {
    const w = modal(
      `<div class="mcenter">${mascot("calm")}<h2>Recherche de tes profils…</h2><p>Profils enregistrés avec ton compte Claude.</p><div class="aiload"><i></i><i></i><i></i></div></div>`,
      "",
      true,
    );
    const list = await cloudProfiles();
    const here = new Set(ACC.list.map(a => a.id));
    const avail = (list || []).filter(x => !here.has(x.acc));
    const m = modal(
      `<div class="mcenter">${mascot("happy", "jump")}<h2>🔑 Retrouver mon profil</h2><p>${list === null ? "Impossible de lire ton espace Claude pour le moment (connexion ou autorisation). Réessaie dans un instant." : avail.length ? "Ces profils sont enregistrés avec ton compte Claude. Touche le tien pour le retrouver ici, avec toute ta progression." : list.length ? "Tous tes profils enregistrés sont déjà sur cet appareil." : "Aucun profil enregistré avec ton compte Claude pour l'instant. Un profil y est sauvegardé automatiquement dès qu'il a été utilisé sur la page Claude."}</p></div>
   ${avail.length ? `<div class="accgrid">${avail.map((x, i) => `<button class="acc" data-c="${i}">${avatar({ emoji: x.v.emoji || "🐯", color: x.v.color || "#7C4DFF" }, 64)}<b>${esc(x.v.name || "Profil")}</b><small>${+x.v.xp || 0} XP</small></button>`).join("")}</div>` : ""}
   <p class="secsub" style="font-size:13px">Sur ton propre serveur, les comptes ont un pseudo et un mot de passe, et se synchronisent sur tous les appareils.</p><button class="btn ghost" id="limp">📥 Importer une progression exportée</button><button class="btn ghost" id="lback">Retour</button>`,
      "",
      !!forced,
    );
    m.querySelectorAll("[data-c]").forEach(
      b =>
        (b.onclick = () => {
          const x = avail[+b.dataset.c];
          let st = {};
          try {
            st = JSON.parse(x.v.state);
          } catch (e) {}
          const a = {
            id: x.acc,
            name: x.v.name || "Profil",
            emoji: x.v.emoji || "🐯",
            color: x.v.color || "#7C4DFF",
            pin: "",
          };
          let nm = a.name;
          let k = 2;
          while (ACC.list.some(y => y.name.toLowerCase() === nm.toLowerCase())) nm = a.name + " " + k++;
          a.name = nm;
          ACC.list.push(a);
          saveAcc();
          try {
            localStorage.setItem(KEY + ":" + a.id, JSON.stringify(st));
          } catch (e) {}
          delete MEM[a.id];
          closeModal();
          switchTo(a.id);
          toast(`☁️ Profil ${a.name} retrouvé`);
        }),
    );
    m.querySelector("#limp").onclick = () => {
      closeModal();
      importAcc();
    };
    m.querySelector("#lback").onclick = () =>
      forced || !ACC.list.length ? (ACC.list.length ? accountPicker(true) : accountForm(null, true)) : closeModal();
    return;
  }
  const m = modal(
    `<div class="mcenter">${mascot("calm")}<h2>🔑 Retrouver ma progression</h2><p>Ce fichier est ouvert directement depuis l'appareil : pas de compte en ligne possible ici. Installe le site sur ton serveur pour avoir des comptes synchronisés, ou importe une progression exportée depuis un autre appareil.</p></div><button class="btn" id="limp">📥 Importer une progression</button><button class="btn ghost" id="lback">Retour</button>`,
    "",
    !!forced,
  );
  m.querySelector("#limp").onclick = () => {
    closeModal();
    importAcc();
  };
  m.querySelector("#lback").onclick = () =>
    forced || !ACC.list.length ? (ACC.list.length ? accountPicker(true) : accountForm(null, true)) : closeModal();
}
export function loginForm(prefill, forced) {
  const m = modal(
    `<div class="mcenter">${mascot("happy", "jump")}<h2>🔑 Se connecter</h2><p>Retrouve ta progression sur cet appareil.</p></div>
  <label class="flabel">Pseudo</label><input class="finput" id="ln" maxlength="20" value="${esc(prefill || "")}" autocomplete="username">
  <label class="flabel">Mot de passe</label><input class="finput" id="lp" type="password" autocomplete="current-password">
  <div id="lerr" style="color:var(--bad);min-height:20px;margin-top:6px"></div><button class="btn" id="lok">Se connecter</button><button class="btn ghost" id="lback">Retour</button>`,
    "",
    !!forced,
  );
  setTimeout(() => m.querySelector(prefill ? "#lp" : "#ln").focus(), 50);
  m.querySelector("#lback").onclick = () => (ACC.list.length ? accountPicker(forced) : accountForm(null, forced));
  const go = async () => {
    const name = m.querySelector("#ln").value.trim(),
      password = m.querySelector("#lp").value,
      err = m.querySelector("#lerr");
    if (!name || !password) return;
    err.textContent = "…";
    let j;
    try {
      j = await srv("login", { name, password });
    } catch (e) {
      err.textContent = "Serveur injoignable, réessaie.";
      return;
    }
    if (!j.ok) {
      err.textContent =
        j.error === "rate_limited"
          ? "Trop de tentatives : réessaie dans 15 minutes."
          : "Pseudo ou mot de passe incorrect.";
      return;
    }
    let a = ACC.list.find(x => x.srv && x.name.toLowerCase() === j.name.toLowerCase());
    if (!a) {
      a = { id: uid(), name: j.name, emoji: j.emoji || "🐯", color: j.color || "#7C4DFF", pin: "", srv: true };
      ACC.list.push(a);
    }
    a.token = j.token;
    a.emoji = j.emoji || a.emoji;
    a.color = j.color || a.color;
    saveAcc();
    if (j.state) {
      const loc = MEM[a.id] || loadState(a.id);
      const mg = mergeStates(loc, hydrate(JSON.parse(j.state)));
      MEM[a.id] = mg;
      try {
        localStorage.setItem(KEY + ":" + a.id, JSON.stringify(mg));
      } catch (e) {}
    }
    closeModal();
    switchTo(a.id);
    setTimeout(() => {
      if (curAcc() === a) {
        SRV.lastPull = Date.now();
        srvPull();
      }
    }, 300);
  };
  m.querySelector("#lok").onclick = go;
  m.querySelector("#lp").onkeydown = e => {
    if (e.key === "Enter") go();
  };
}
export async function srvBoard() {
  if (!SRV.ok) return null;
  try {
    const a = curAcc();
    const j = await srv("board", {
      week: dkey(weekStart(0)),
      prev: dkey(weekStart(1)),
      token: (a && a.srv && a.token) || "",
    });
    return j.ok ? j : null;
  } catch (e) {
    return null;
  }
}
// Synchronisation (quand la page tourne comme artefact Claude : progression gardée sur ton compte)
export let cloudRef = null,
  cloudTimer = null;
export function set_cloudRef(v) {
  return (cloudRef = v);
}
export const CLOUD = { db: null, id: null };
export async function cloudReady() {
  if (CLOUD.db && CLOUD.id) return true;
  try {
    if (!window.claude || typeof window.claude.use !== "function") return false;
    const to = ms => new Promise(r => setTimeout(() => r(null), ms));
    const db = await Promise.race([window.claude.use("db"), to(10000)]);
    const user = await Promise.race([window.claude.use("user"), to(10000)]);
    if (!db || !user) return false;
    const id = await user.id();
    if (!id) return false;
    CLOUD.db = db;
    CLOUD.id = id;
    return true;
  } catch (e) {
    return false;
  }
}
// Profils enregistrés avec le compte Claude de la personne (pour les retrouver sur un autre appareil)
export async function cloudProfiles() {
  if (!(await cloudReady())) return null;
  try {
    const snap = await Promise.race([
      CLOUD.db.collection("data/users/" + CLOUD.id).get(),
      new Promise((_, j) => setTimeout(() => j(new Error("timeout")), 10000)),
    ]);
    const docs = (snap && (snap.docs || snap)) || [];
    return [...docs]
      .map(d => {
        const v = typeof d.data === "function" ? d.data() : d.data || d;
        const id = String(d.id || v.id || "");
        return { doc: id, acc: id.replace(/^progress-/, ""), v };
      })
      .filter(x => x.doc.startsWith("progress-") && x.v && x.v.state);
  } catch (e) {
    return null;
  }
}
export async function cloudInit() {
  try {
    if (!window.claude || typeof window.claude.use !== "function") return;
    const to = ms => new Promise(r => setTimeout(() => r(null), ms));
    const db = await Promise.race([window.claude.use("db"), to(10000)]);
    const user = await Promise.race([window.claude.use("user"), to(10000)]);
    if (!db || !user) return;
    const id = await user.id();
    if (!id) return;
    CLOUD.db = db;
    CLOUD.id = id;
    if (!ACC.current) return;
    cloudRef = db.collection("data/users/" + id).doc("progress-" + ACC.current);
    const snap = await Promise.race([cloudRef.get(), to(10000)]);
    const d = snap && (typeof snap.data === "function" ? snap.data() : snap);
    if (d && d.state && (d.ts || 0) > (S.ts || 0)) {
      set_S(hydrate(S.ts ? mergeStates(S, hydrate(JSON.parse(d.state))) : JSON.parse(d.state)));
      MEM[ACC.current] = S;
      applyGenUnits();
      save();
      daily();
      renderAll();
      toast("☁️ Progression synchronisée");
    } else if (S.ts) cloudSave();
  } catch (e) {
    cloudRef = null;
  }
}
export function cloudSave() {
  if (!cloudRef) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    try {
      const a = curAcc() || {};
      const p = cloudRef.set({
        state: JSON.stringify(S),
        ts: S.ts,
        name: a.name || "",
        emoji: a.emoji || "",
        color: a.color || "",
        xp: S.xp || 0,
      });
      p && p.catch && p.catch(() => {});
    } catch (e) {}
  }, 1500);
}
