// Écran Paramètres (v28) : menu façon Duolingo et sous-pages (préférences, compte, notifications, Mon Claude)
import { COURSES } from "../content/index.js";
import { ACC, MEM, S, curAcc, loadState, save, saveAcc, set_S } from "../core/accounts.js";
import { hydrate } from "../core/progress.js";
import { KEY } from "../core/state.js";
import { $, dkey, esc, yest } from "../core/util.js";
import { level, lvlXp } from "../core/xp.js";
import { pairOf } from "../exercises/generate.js";
import { shareProgress } from "../features/coach.js";
import { BADGES } from "../features/quests.js";
import { KO_READY, UI } from "../i18n/locale.js";
import { unlockedUnits } from "../lesson/build.js";
import { accountForm, accountPicker, deleteAcc, exportAcc, importAcc, openAccount } from "./accounts.js";
import { setUi } from "./language.js";
import { TROPHY, tierOf, weekStart, weekXp, TIERS } from "./league.js";
import { AI_MODELS, aiCfg, aiDetect, aiDirect, aiKey, aiLabel, aiSetCfg } from "../services/ai.js";
import { SRV, srv } from "../services/cloud.js";
import { goOnline, pushCapable, remindSet } from "../services/reminders.js";
import { SR0, beep, say, set_SR } from "../services/speech.js";
import { flagSvg, ic } from "../ui/icons.ts";
import { ACCS, mascot } from "../ui/mascot.js";
import { secUnits } from "../ui/router.js";
import { IOS, STANDALONE, THEME, haptic, setTheme } from "../ui/platform.js";
import { avatar, curCid, curSec, renderAll } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";

/** Sous-pages des paramètres : [identifiant dans l'adresse, titre, icône]. */
export const SETTINGS_PAGES = [
  ["preferences", "Préférences", "gear"],
  ["compte", "Profil et compte", "user"],
  ["notifications", "Notifications", "clock"],
  ["claude", "Mon Claude (IA)", "spark"],
];
const page = (id, body) => `<div class="card setcard" data-page="${id}">${body}</div>`;
function pageHtml(sub) {
  if (sub === "preferences")
    return page(
      "preferences",
      `
  <div class="setrow"><span>🌓 Thème</span><select id="sTheme"><option value="auto" ${THEME() === "auto" ? "selected" : ""}>Automatique</option><option value="light" ${THEME() === "light" ? "selected" : ""}>Clair</option><option value="dark" ${THEME() === "dark" ? "selected" : ""}>Sombre</option></select></div>
  <div class="setrow"><span>🌐 Langue · Language${KO_READY ? " · 언어" : ""}</span><select id="sUi" class="notr"><option value="fr" ${UI === "fr" ? "selected" : ""}>Français</option><option value="en" ${UI === "en" ? "selected" : ""}>English</option>${KO_READY ? `<option value="ko" ${UI === "ko" ? "selected" : ""}>한국어</option>` : ""}</select></div>
  <div class="setrow"><span>Objectif quotidien</span><select id="sGoal">${[
    [50, "Tranquille"],
    [100, "Normal"],
    [200, "Sérieux"],
    [400, "Intense"],
  ]
    .map(([x, l]) => `<option value="${x}" ${S.goal === x ? "selected" : ""}>${l} · ${x} XP</option>`)
    .join("")}</select></div>
  <div class="setrow"><span>Vitesse de la voix</span><input id="sRate" type="range" min="0.6" max="1.2" step="0.05" value="${S.set.rate}"></div>
  <div class="setrow"><span>Lecture auto après chaque réponse</span><button class="switch ${S.set.auto ? "on" : ""}" id="sAuto" aria-label="Lecture auto"></button></div>
  <div class="setrow"><span>Effets sonores</span><button class="switch ${S.set.sound ? "on" : ""}" id="sSound" aria-label="Sons"></button></div>
  <div class="setrow"><span>Exercices de micro</span><button class="switch ${S.speakOff > Date.now() ? "" : "on"}" id="sMic" aria-label="Micro"></button></div>
  <div class="setrow"><span>Exercices d'écoute</span><button class="switch ${S.listenOff > Date.now() ? "" : "on"}" id="sListen" aria-label="Écoute"></button></div>
  <div class="setrow"><span>Vibrations (iPhone · Android)</span><button class="switch ${S.set.haptic ? "on" : ""}" id="sHap" aria-label="Vibrations"></button></div>
  <div class="setrow"><span>Tester la voix</span><button class="btn ghost" id="sTest" style="padding:8px 14px">🔊 Écouter</button></div>
  `,
    );
  if (sub === "compte")
    return (
      ` <div class="card"><h3>👤 Compte</h3>
  <div class="setrow"><span style="display:flex;align-items:center;gap:10px">${avatar(curAcc(), 40)}<span>${esc((curAcc() || {}).name || "")}<br><small style="color:var(--muted)">${(curAcc() || {}).srv ? "☁️ Compte en ligne · synchronisé" : (curAcc() || {}).pin ? "🔒 Protégé par code PIN" : "Sans code PIN"}</small></span></span><button class="btn ghost" id="aEdit" style="padding:8px 14px">Modifier</button></div>
  <div class="setrow"><span>Changer de compte (${ACC.list.length})</span><button class="btn ghost" id="aSwitch" style="padding:8px 14px">Changer</button></div>
  <div class="setrow"><span>Transférer ma progression sur un autre appareil</span><button class="btn ghost" id="aExp" style="padding:8px 14px">Exporter</button></div>
  <div class="setrow"><span>Récupérer une progression exportée</span><button class="btn ghost" id="aImp" style="padding:8px 14px">Importer</button></div>
  ${(curAcc() || {}).srv ? `<div class="setrow"><span>Se déconnecter de cet appareil</span><button class="btn ghost" id="aOut" style="padding:8px 14px">Déconnexion</button></div>` : ""}
  <div class="setrow"><span>Supprimer ce compte</span><button class="btn badb" id="aDel" style="padding:8px 14px">Supprimer</button></div></div>
 ${IOS && !STANDALONE && !(curAcc() || {}).srv ? "<div class=\"tipbox\">⚠️ Sur iPhone, Safari peut effacer les données d'un site que tu n'as pas ouvert depuis 7 jours. Pour ne jamais perdre ta progression : crée un compte en ligne, ou installe l'app sur l'écran d'accueil.</div>" : ""}
` +
      page(
        "compte2",
        `<div class="setrow"><span>Partager ma progression</span><button class="btn ghost" id="sShare" style="padding:8px 14px">📤 Partager</button></div>
  <div class="setrow"><span>Réinitialiser la progression de ce compte</span><button class="btn badb" id="sReset" style="padding:8px 14px">Réinitialiser</button></div>`,
      )
    );
  if (sub === "notifications")
    return page(
      "notifications",
      `<div class="setrow"><span>🔔 Rappel quotidien<br><small style="color:var(--muted)">${!pushCapable() ? (IOS && !STANDALONE ? "Ajoute Speakeasy à l'écran d'accueil (Partager › Sur l'écran d'accueil) puis ouvre-le depuis l'icône pour l'activer." : "Non disponible sur ce navigateur.") : !(curAcc() || {}).srv ? "Nécessite un compte en ligne (gratuit) :" : S.set.remind ? "Activé à " + S.set.remind + " h, uniquement si tu n'as pas encore pratiqué ce jour-là." : "Uniquement si tu n'as pas encore pratiqué ce jour-là."}</small></span>${!pushCapable() ? "" : !(curAcc() || {}).srv ? (SRV.ok ? '<button class="chipbtn" id="sOnline">☁️ Passer en ligne</button>' : "") : `<span class="remrow"><select id="sRemH">${[8, 9, 12, 13, 17, 18, 19, 20, 21, 22].map(h => `<option value="${h}" ${(S.set.remind || 19) === h ? "selected" : ""}>${h} h</option>`).join("")}</select><button class="chipbtn" id="sRemB">${S.set.remind ? "🔕 Couper" : "🔔 Activer"}</button></span>`}</div>
  `,
    );
  if (sub === "claude")
    return ` <div class="card" id="aiCard"><h3>🤖 Mon Claude</h3><p class="secsub" style="margin:0 0 10px">L'IA crée tes exercices toujours différents, le coach d'erreurs, les thèmes, les rédactions corrigées, les unités et les histoires inédites. Chaque profil utilise <b>sa propre clé</b> : elle reste sur cet appareil et n'est jamais envoyée à notre serveur de comptes.</p>
  <div class="setrow"><span>État</span><span id="aiStat" style="color:var(--muted);font-size:14px;text-align:right">…</span></div>
  <label class="flabel">Clé API Claude</label><div class="keyrow"><input class="finput" id="aiKey" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="sk-ant-api03-…" value="${esc(aiKey())}"><button class="iconbtn" id="aiEye" aria-label="Afficher la clé">👁️</button></div>
  <label class="flabel">Modèle</label><select id="aiModel" class="finput">${Object.entries(AI_MODELS)
    .map(([k, v]) => `<option value="${k}" ${(aiCfg().model || "auto") === k ? "selected" : ""}>${v[0]}</option>`)
    .join("")}</select>
  <div id="aiMsg" class="aimsg"></div>
  <div class="aibtns"><button class="btn" id="aiSave">Enregistrer et tester</button>${aiKey() ? '<button class="btn ghost" id="aiDel">Retirer ma clé</button>' : ""}</div>
  <details class="aihelp"><summary>Comment obtenir ma clé ?</summary><ol><li>Va sur <b>console.anthropic.com</b> et connecte-toi (ou crée un compte).</li><li>Menu <b>Billing</b> : ajoute quelques euros de crédit (l'API est facturée à l'usage, séparément de l'abonnement claude.ai).</li><li>Menu <b>API Keys</b> → <b>Create Key</b>, puis copie la clé qui commence par <code>sk-ant-</code>.</li><li>Colle-la ici. « Automatique » utilise Haiku pour les exercices (quelques centimes par séance) et Sonnet pour les corrections et les créations.</li></ol></details></div>
`;
  return "";
}
/** Écran Paramètres : sans sous-page, la liste des rubriques ; sinon la rubrique choisie. */
export function renderSettings(v, sub) {
  const pg = SETTINGS_PAGES.find(x => x[0] === sub);
  if (!pg) {
    v.innerHTML = `<div class="sethead"><button class="setx" id="setClose" aria-label="Fermer">${ic("x", 28, "", 3)}</button><h1>Paramètres</h1><span></span></div>
<h2 class="seth2">Compte</h2><div class="setlist">${SETTINGS_PAGES.map(([id, t, k]) => `<a class="setitem" href="#reglages/${id}"><span class="setic">${ic(k, 22, "", 2.4)}</span><span>${t}</span>${ic("chevr", 22, "", 2.8)}</a>`).join("")}</div>
<h2 class="seth2">Raccourcis</h2><div class="setlist"><a class="setitem" href="#stats"><span class="setic">${ic("chart", 22, "", 2.4)}</span><span>Statistiques par notion</span>${ic("chevr", 22, "", 2.8)}</a><a class="setitem" href="#boutique"><span class="setic">${ic("hanger", 22, "", 2.4)}</span><span>Tenues de Horang</span>${ic("chevr", 22, "", 2.8)}</a></div>`;
    $("#setClose").onclick = () => (location.hash = "profil");
    return;
  }
  v.innerHTML = `<div class="sethead"><button class="setx" id="setBack" aria-label="Retour">${ic("left", 28, "", 3)}</button><h1>${pg[1]}</h1><span></span></div>${pageHtml(sub)}`;
  $("#setBack").onclick = () => (location.hash = "reglages");
  bindSettings();
}
/** Branche les réglages présents à l'écran (ceux des autres sous-pages sont ignorés). */
function bindSettings() {
  const $$ = s => $(s) || {};
  const ao = $("#aOut");
  if (ao)
    ao.onclick = async () => {
      const a = curAcc();
      save();
      clearTimeout(SRV.timer);
      try {
        await srv("save", {
          token: a.token,
          state: JSON.stringify(S),
          ts: S.ts,
          wxp: weekXp(S),
          week: dkey(weekStart(0)),
          xp: S.xp,
          emoji: a.emoji,
          color: a.color,
        });
        await srv("logout", { token: a.token });
      } catch (e) {}
      try {
        localStorage.removeItem(KEY + ":" + a.id);
      } catch (e) {}
      delete MEM[a.id];
      ACC.list = ACC.list.filter(x => x !== a);
      ACC.current = null;
      saveAcc();
      set_S(hydrate({}));
      toast("👋 Déconnecté·e");
      if (ACC.list.length) accountPicker(true);
      else accountForm(null, true);
    };
  $$("#aEdit").onclick = () => accountForm(curAcc());
  $$("#aSwitch").onclick = () => accountPicker();
  $$("#aExp").onclick = exportAcc;
  $$("#aImp").onclick = importAcc;
  $$("#aDel").onclick = deleteAcc;
  aiDetect().then(m => {
    const e = $$("#aiStat");
    if (e) e.textContent = aiLabel(m);
  });
  $$("#aiEye").onclick = () => {
    const i = $$("#aiKey");
    i.type = i.type === "password" ? "text" : "password";
  };
  $$("#aiModel").onchange = e => {
    const c = aiCfg();
    if (c.key) {
      c.model = e.target.value;
      aiSetCfg(c);
      aiDetect().then(m => {
        $$("#aiStat").textContent = aiLabel(m);
      });
    }
  };
  $$("#aiSave").onclick = async () => {
    const k = $$("#aiKey").value.trim(),
      msg = $$("#aiMsg");
    if (!k) {
      msg.className = "aimsg bad";
      msg.textContent = "Colle ta clé (elle commence par sk-ant-).";
      return;
    }
    if (!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(k)) {
      msg.className = "aimsg bad";
      msg.textContent =
        "Ça ne ressemble pas à une clé Claude : elle commence par « sk-ant- » et fait une centaine de caractères. Copie-la en entier.";
      return;
    }
    const prev = aiCfg();
    aiSetCfg({ key: k, model: $$("#aiModel").value });
    msg.className = "aimsg";
    msg.textContent = "⏳ Test de la clé…";
    await aiDetect();
    try {
      const t = await aiDirect(
        'Réponds uniquement par le mot JSON {"ok":true}.',
        { mode: "word", lang: "en-US", words: ["hello"] },
        "quick",
        25000,
        20,
      );
      msg.className = "aimsg ok";
      msg.textContent = "✅ Clé valide : ton Claude est connecté !";
      beep("win");
      haptic(2);
    } catch (e) {
      const fb = e && e.fallback;
      msg.className = "aimsg " + (fb ? "" : "bad");
      msg.textContent = fb
        ? "Clé enregistrée. Ici l'appel direct est bloqué : Speakeasy utilisera Claude de la page."
        : e.userMsg ||
          (e.message === "timeout"
            ? "⏳ Pas de réponse (réseau ?). La clé est enregistrée, réessaie plus tard."
            : "Clé enregistrée, mais le test a échoué (" + esc(String(e.message || e).slice(0, 80)) + ").");
      if (e && e.status === 401 && prev.key !== k) aiSetCfg(prev.key ? prev : null);
    }
    aiDetect().then(m => {
      $$("#aiStat").textContent = aiLabel(m);
    });
    if (!$("#aiDel") && aiKey()) {
      $(".aibtns").insertAdjacentHTML("beforeend", '<button class="btn ghost" id="aiDel">Retirer ma clé</button>');
      $$("#aiDel").onclick = () => {
        aiSetCfg(null);
        toast("🔑 Clé retirée de cet appareil");
        renderAll();
      };
    }
  };
  const ad = $("#aiDel");
  if (ad)
    ad.onclick = () => {
      aiSetCfg(null);
      toast("🔑 Clé retirée de cet appareil");
      renderAll();
    };
  $$("#sHap").onclick = e => {
    S.set.haptic = !S.set.haptic;
    e.target.classList.toggle("on", S.set.haptic);
    save();
    haptic(1);
  };
  $$("#sShare").onclick = shareProgress;
  const rb = $("#sRemB"),
    rh = $("#sRemH");
  if (rb)
    rb.onclick = async () => {
      rb.disabled = true;
      const ok = await remindSet(S.set.remind ? 0 : +rh.value);
      rb.disabled = false;
      if (ok) renderAll();
    };
  if (rh)
    rh.onchange = async () => {
      if (S.set.remind) {
        await remindSet(+rh.value);
        renderAll();
      }
    };
  const so = $("#sOnline");
  if (so) so.onclick = () => goOnline();
  $$("#sGoal").onchange = e => {
    S.goal = +e.target.value;
    save();
  };
  $$("#sUi").onchange = e => setUi(e.target.value);
  $$("#sTheme").onchange = e => setTheme(e.target.value);
  $$("#sRate").onchange = e => {
    S.set.rate = +e.target.value;
    save();
    say("Hello! This is how I sound.", "en-US");
  };
  $$("#sAuto").onclick = e => {
    S.set.auto = !S.set.auto;
    e.target.classList.toggle("on", S.set.auto);
    save();
  };
  $$("#sSound").onclick = e => {
    S.set.sound = !S.set.sound;
    e.target.classList.toggle("on", S.set.sound);
    save();
  };
  $$("#sListen").onclick = e => {
    S.listenOff = S.listenOff > Date.now() ? 0 : Date.now() + 365 * 864e5;
    e.target.classList.toggle("on", !(S.listenOff > Date.now()));
    save();
  };
  $$("#sMic").onclick = e => {
    try {
      localStorage.removeItem("speakeasy-micko");
    } catch (x) {}
    if (SR0 && !(IOS && STANDALONE)) set_SR(SR0);
    S.speakOff = S.speakOff > Date.now() ? 0 : Date.now() + 365 * 864e5;
    e.target.classList.toggle("on", !(S.speakOff > Date.now()));
    save();
  };
  $$("#sTest").onclick = () => {
    const l = COURSES[curCid()].lang;
    say(
      l.startsWith("ko")
        ? "안녕하세요! 반가워요."
        : l.startsWith("fr")
          ? "Bonjour ! Prêt pour la dictée ?"
          : "Hello! Ready to practice your English?",
      l,
    );
  };
  $$("#sReset").onclick = () => {
    const m = modal(
      `<div class="mcenter">${mascot("sad", "sad")}<h2>Tout effacer ?</h2><p>XP, série, badges et progression seront remis à zéro. C'est définitif.</p><button class="btn badb" id="ry">Oui, tout effacer</button><button class="btn ghost" onclick="closeModal()">Annuler</button></div>`,
    );
    m.querySelector("#ry").onclick = () => {
      set_S(hydrate({ onb: true, ts: Date.now(), sec: S.sec }));
      save();
      closeModal();
      renderAll();
      toast("Progression réinitialisée");
    };
  };
}
