// Écran Profil et réglages
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

export function renderProfile(v) {
  const lv = level(S.xp),
    a = lvlXp(lv),
    b = lvlXp(lv + 1);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ k: dkey(d), l: "DLMMJVS"[d.getDay()], x: S.week[dkey(d)] || 0, t: i === 0 });
  }
  const mx = Math.max(S.goal, ...days.map(d => d.x));
  const acc = curAcc() || {};
  const sec = curSec(),
    su = secUnits(sec);
  const wx = weekXp(S),
    tr = tierOf(wx);
  const trI = TIERS.indexOf(tr);
  const wear = S.wear && ACCS[S.wear];
  const recap = [
    [ic("flame", 28, "", 2.6, "#FFE1BF"), "#FF9F1C", S.streak, "jours de série"],
    [flagSvg(sec.id, 30, 20, 4), "", `${su.d} / ${su.t}`, `<span>unités</span> · <span>${sec.name}</span>`],
    [ic("trophy", 28, "", 2.6), TROPHY[trI][1], `Ligue ${tr[1]}`, "cette semaine"],
    [ic("bolt", 28, "", 2.6, "#E2DAFF"), "#7C4DFF", S.xp, "XP total"],
    [ic("check", 28, "", 3), "#22B573", S.lessons, "séances"],
    [ic("crown", 28, "", 2.6, "#FFE7A8"), "#DFA300", S.perfect, "leçons parfaites"],
    [ic("target", 28, "", 2.6), "#E0457B", S.bestCombo, "meilleur combo"],
    [ic("mic", 28, "", 2.6), "#13A8A8", S.spoke, "phrases dites"],
  ];
  const others = ACC.list
    .map(a => {
      const st = a.id === ACC.current ? S : MEM[a.id] || loadState(a.id);
      const sk = st.lastDay === dkey() || st.lastDay === yest() ? st.streak : 0;
      return `<button class="pacc ${a.id === ACC.current ? "cur" : ""}" data-acc="${a.id}" aria-label="${esc(a.name)}"><span class="pav">${avatar(a, 62)}${sk ? `<i>${ic("flame", 13, "", 2.4, "#FFE1BF")}${sk}</i>` : ""}</span><span class="notr">${esc(a.name)}</span></button>`;
    })
    .join("");
  const BM = {
    first: ["egg", "#22B573", "#178A57", "1"],
    l10: ["book", "#3D8BFF", "#1D5FC2", "10"],
    l50: ["cap", "#7C4DFF", "#5A30D8", "50"],
    s3: ["flame", "#FF9F1C", "#C2410C", "3"],
    s7: ["flame", "#FF7A3C", "#C2410C", "7"],
    s30: ["flame", "#E8434F", "#A8203F", "30"],
    x500: ["bolt", "#FFB020", "#B45309", "500"],
    x2000: ["star", "#FFC83D", "#C98B00", "2000"],
    perf: ["hundred", "#22B573", "#178A57", "1"],
    perf10: ["crown", "#FFB020", "#B45309", "10"],
    combo15: ["target", "#E0457B", "#A8203F", "15"],
    speak10: ["mic", "#13A8A8", "#0C7F7F", "10"],
    toeic: ["brief", "#7C4DFF", "#5A30D8", ""],
    volt: ["feather", "#3D8BFF", "#1D5FC2", ""],
    ko: ["tiger", "#FF9F1C", "#C2410C", ""],
    sprint: ["timer", "#E0457B", "#A8203F", "15"],
    story: ["open", "#13A8A8", "#0C7F7F", ""],
  };
  const badges = BADGES.map((x, i) => {
    const on = S.badges.includes(x.id);
    const [k, c, d, num] = BM[x.id] || ["star", "#7C4DFF", "#5A30D8", ""];
    return `<button class="bdg ${on ? "on" : "lock"}" data-b="${i}" aria-label="${x.n}" style="--bc:${c};--bd:${d};animation-delay:${(0.2 + i * 0.04).toFixed(2)}s"><span class="bmed">${on ? ic(k, 34, "", 2.6) : ic("lock", 28, "", 2.6)}${on ? '<span class="shine"></span>' : ""}</span>${num ? `<span class="bnum">${num}</span>` : ""}</button>`;
  }).join("");
  v.innerHTML = `<div class="pban"><div class="pbtop"><div><h1 class="notr">${esc(acc.name || "Mon profil")}</h1><div class="pbsub"><span>Niveau ${lv}</span> · <span>${acc.srv ? "compte en ligne" : "compte sur cet appareil"}</span></div></div><div class="pbbtns"><button class="pbi" id="pWear" aria-label="Tenues de Horang">${ic("hanger", 30, "", 2.2)}</button><button class="pbi" id="pGear" aria-label="Réglages">${ic("gear", 28, "", 2.2)}</button></div></div><div class="phop">${mascot("happy")}</div>${wear ? `<span class="pwear">${wear.n}</span>` : ""}</div>
 <div class="pxp"><div class="pxpr"><b>Niv. ${lv}</b><span class="pxpbar"><i style="width:${Math.round(((S.xp - a) / (b - a)) * 100)}%"></i></span><b class="pnx">${lv + 1}</b></div><small><span>${S.xp} XP</span> · <span>encore ${b - S.xp} XP pour le niveau ${lv + 1}</span></small></div>
 <div class="pacts"><button class="btn ghost" id="pAdd">${ic("useradd", 22, "", 2.4)}<span>Ajouter un compte</span></button><button class="btn ghost pshare" id="pShare" aria-label="Partager ma progression">${ic("share", 24, "", 2.4)}</button></div>
 <h2 class="ph2">Récap</h2><div class="precap">${recap.map(([i, c, big, sm]) => `<div class="prc"><span class="prci" style="color:${c || "inherit"}">${i}</span><span><b>${big}</b><small>${sm}</small></span></div>`).join("")}</div>
 <h2 class="ph2">Comptes sur cet appareil</h2><div class="paccs">${others}<button class="pacc add" id="pAdd2" aria-label="Ajouter un compte"><span class="padd">${ic("plus", 26, "", 2.6)}</span><span>Ajouter</span></button></div>
 <div class="card"><h3>Cette semaine</h3><div class="week">${days.map(d => `<div class="${d.t ? "today" : ""}"><small>${d.x}</small><i style="height:${Math.max(3, (d.x / mx) * 90)}%"></i><small>${d.l}</small></div>`).join("")}</div></div>
 <h2 class="ph2">Badges · ${S.badges.length} sur ${BADGES.length}</h2><div class="pbdgs">${badges}</div><div class="ltip hidden" id="btip"></div>
 <h2 class="ph2">Mes outils</h2><div class="ptools"><button class="ptool" id="tStats">${ic("chart", 24, "", 2.4)}<span>Statistiques par notion</span>${ic("chevr", 20, "", 3)}</button><button class="ptool" id="tAi">${ic("spark", 24, "", 2.4)}<span>Mon Claude (IA)</span>${ic("chevr", 20, "", 3)}</button><button class="ptool" id="tWords">${ic("book", 24, "", 2.4)}<span>Mes mots</span>${ic("chevr", 20, "", 3)}</button></div>
 <div class="card"><h3>👤 Compte</h3>
  <div class="setrow"><span style="display:flex;align-items:center;gap:10px">${avatar(curAcc(), 40)}<span>${esc((curAcc() || {}).name || "")}<br><small style="color:var(--muted)">${(curAcc() || {}).srv ? "☁️ Compte en ligne · synchronisé" : (curAcc() || {}).pin ? "🔒 Protégé par code PIN" : "Sans code PIN"}</small></span></span><button class="btn ghost" id="aEdit" style="padding:8px 14px">Modifier</button></div>
  <div class="setrow"><span>Changer de compte (${ACC.list.length})</span><button class="btn ghost" id="aSwitch" style="padding:8px 14px">Changer</button></div>
  <div class="setrow"><span>Transférer ma progression sur un autre appareil</span><button class="btn ghost" id="aExp" style="padding:8px 14px">Exporter</button></div>
  <div class="setrow"><span>Récupérer une progression exportée</span><button class="btn ghost" id="aImp" style="padding:8px 14px">Importer</button></div>
  ${(curAcc() || {}).srv ? `<div class="setrow"><span>Se déconnecter de cet appareil</span><button class="btn ghost" id="aOut" style="padding:8px 14px">Déconnexion</button></div>` : ""}
  <div class="setrow"><span>Supprimer ce compte</span><button class="btn badb" id="aDel" style="padding:8px 14px">Supprimer</button></div></div>
 ${IOS && !STANDALONE && !(curAcc() || {}).srv ? "<div class=\"tipbox\">⚠️ Sur iPhone, Safari peut effacer les données d'un site que tu n'as pas ouvert depuis 7 jours. Pour ne jamais perdre ta progression : crée un compte en ligne, ou installe l'app sur l'écran d'accueil.</div>" : ""}
 <div class="card" id="aiCard"><h3>🤖 Mon Claude</h3><p class="secsub" style="margin:0 0 10px">L'IA crée tes exercices toujours différents, le coach d'erreurs, les thèmes, les rédactions corrigées, les unités et les histoires inédites. Chaque profil utilise <b>sa propre clé</b> : elle reste sur cet appareil et n'est jamais envoyée à notre serveur de comptes.</p>
  <div class="setrow"><span>État</span><span id="aiStat" style="color:var(--muted);font-size:14px;text-align:right">…</span></div>
  <label class="flabel">Clé API Claude</label><div class="keyrow"><input class="finput" id="aiKey" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="sk-ant-api03-…" value="${esc(aiKey())}"><button class="iconbtn" id="aiEye" aria-label="Afficher la clé">👁️</button></div>
  <label class="flabel">Modèle</label><select id="aiModel" class="finput">${Object.entries(AI_MODELS)
    .map(([k, v]) => `<option value="${k}" ${(aiCfg().model || "auto") === k ? "selected" : ""}>${v[0]}</option>`)
    .join("")}</select>
  <div id="aiMsg" class="aimsg"></div>
  <div class="aibtns"><button class="btn" id="aiSave">Enregistrer et tester</button>${aiKey() ? '<button class="btn ghost" id="aiDel">Retirer ma clé</button>' : ""}</div>
  <details class="aihelp"><summary>Comment obtenir ma clé ?</summary><ol><li>Va sur <b>console.anthropic.com</b> et connecte-toi (ou crée un compte).</li><li>Menu <b>Billing</b> : ajoute quelques euros de crédit (l'API est facturée à l'usage, séparément de l'abonnement claude.ai).</li><li>Menu <b>API Keys</b> → <b>Create Key</b>, puis copie la clé qui commence par <code>sk-ant-</code>.</li><li>Colle-la ici. « Automatique » utilise Haiku pour les exercices (quelques centimes par séance) et Sonnet pour les corrections et les créations.</li></ol></details></div>
 <div class="card" id="setCard"><h3>⚙️ Réglages</h3>
  <div class="setrow"><span>🌓 Thème</span><select id="sTheme"><option value="auto" ${THEME() === "auto" ? "selected" : ""}>Automatique</option><option value="light" ${THEME() === "light" ? "selected" : ""}>Clair</option><option value="dark" ${THEME() === "dark" ? "selected" : ""}>Sombre</option></select></div>
  <div class="setrow"><span>🌐 Langue · Language${KO_READY ? " · 언어" : ""}</span><select id="sUi" class="notr"><option value="fr" ${UI === "fr" ? "selected" : ""}>Français</option><option value="en" ${UI === "en" ? "selected" : ""}>English</option>${KO_READY ? `<option value="ko" ${UI === "ko" ? "selected" : ""}>한국어</option>` : ""}</select></div>
  <div class="setrow"><span>Objectif quotidien</span><select id="sGoal">${[
    [10, "Tranquille"],
    [20, "Normal"],
    [30, "Sérieux"],
    [50, "Intense"],
  ]
    .map(([x, l]) => `<option value="${x}" ${S.goal === x ? "selected" : ""}>${l} · ${x} XP</option>`)
    .join("")}</select></div>
  <div class="setrow"><span>Vitesse de la voix</span><input id="sRate" type="range" min="0.6" max="1.2" step="0.05" value="${S.set.rate}"></div>
  <div class="setrow"><span>Lecture auto après chaque réponse</span><button class="switch ${S.set.auto ? "on" : ""}" id="sAuto" aria-label="Lecture auto"></button></div>
  <div class="setrow"><span>Effets sonores</span><button class="switch ${S.set.sound ? "on" : ""}" id="sSound" aria-label="Sons"></button></div>
  <div class="setrow"><span>Exercices de micro</span><button class="switch ${S.speakOff > Date.now() ? "" : "on"}" id="sMic" aria-label="Micro"></button></div>
  <div class="setrow"><span>Exercices d'écoute</span><button class="switch ${S.listenOff > Date.now() ? "" : "on"}" id="sListen" aria-label="Écoute"></button></div>
  <div class="setrow"><span>Vibrations (iPhone · Android)</span><button class="switch ${S.set.haptic ? "on" : ""}" id="sHap" aria-label="Vibrations"></button></div>
  <div class="setrow"><span>🔔 Rappel quotidien<br><small style="color:var(--muted)">${!pushCapable() ? (IOS && !STANDALONE ? "Ajoute Speakeasy à l'écran d'accueil (Partager › Sur l'écran d'accueil) puis ouvre-le depuis l'icône pour l'activer." : "Non disponible sur ce navigateur.") : !(curAcc() || {}).srv ? "Nécessite un compte en ligne (gratuit) :" : S.set.remind ? "Activé à " + S.set.remind + " h, uniquement si tu n'as pas encore pratiqué ce jour-là." : "Uniquement si tu n'as pas encore pratiqué ce jour-là."}</small></span>${!pushCapable() ? "" : !(curAcc() || {}).srv ? (SRV.ok ? '<button class="chipbtn" id="sOnline">☁️ Passer en ligne</button>' : "") : `<span class="remrow"><select id="sRemH">${[8, 9, 12, 13, 17, 18, 19, 20, 21, 22].map(h => `<option value="${h}" ${(S.set.remind || 19) === h ? "selected" : ""}>${h} h</option>`).join("")}</select><button class="chipbtn" id="sRemB">${S.set.remind ? "🔕 Couper" : "🔔 Activer"}</button></span>`}</div>
  <div class="setrow"><span>Partager ma progression</span><button class="btn ghost" id="sShare" style="padding:8px 14px">📤 Partager</button></div>
  <div class="setrow"><span>Tester la voix</span><button class="btn ghost" id="sTest" style="padding:8px 14px">🔊 Écouter</button></div>
  <div class="setrow"><span>Réinitialiser la progression de ce compte</span><button class="btn badb" id="sReset" style="padding:8px 14px">Réinitialiser</button></div></div>`;
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
  $("#aEdit").onclick = () => accountForm(curAcc());
  $("#aSwitch").onclick = () => accountPicker();
  $("#pWear").onclick = () => (location.hash = "boutique");
  $("#pGear").onclick = () => $("#setCard").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#pAdd").onclick = $("#pAdd2").onclick = () => accountForm(null);
  $("#pShare").onclick = shareProgress;
  $("#tStats").onclick = () => (location.hash = "stats");
  $("#tAi").onclick = () => $("#aiCard").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#tWords").onclick = () => myWords();
  v.querySelectorAll("[data-acc]").forEach(
    b =>
      (b.onclick = () => {
        if (b.dataset.acc !== ACC.current) openAccount(b.dataset.acc);
      }),
  );
  v.querySelectorAll("[data-b]").forEach(
    b =>
      (b.onclick = () => {
        const x = BADGES[+b.dataset.b],
          tip = $("#btip"),
          on = S.badges.includes(x.id);
        if (tip.dataset.i === b.dataset.b && !tip.classList.contains("hidden")) return tip.classList.add("hidden");
        tip.dataset.i = b.dataset.b;
        tip.className = "ltip" + (on ? "" : " lock");
        tip.style.setProperty("--tc", b.style.getPropertyValue("--bc"));
        tip.innerHTML = `<b>${x.n}</b> · <span>${x.d}</span> · <span>${on ? "obtenu" : "pas encore obtenu"}</span>`;
      }),
  );
  $("#aExp").onclick = exportAcc;
  $("#aImp").onclick = importAcc;
  $("#aDel").onclick = deleteAcc;
  aiDetect().then(m => {
    const e = $("#aiStat");
    if (e) e.textContent = aiLabel(m);
  });
  $("#aiEye").onclick = () => {
    const i = $("#aiKey");
    i.type = i.type === "password" ? "text" : "password";
  };
  $("#aiModel").onchange = e => {
    const c = aiCfg();
    if (c.key) {
      c.model = e.target.value;
      aiSetCfg(c);
      aiDetect().then(m => {
        $("#aiStat").textContent = aiLabel(m);
      });
    }
  };
  $("#aiSave").onclick = async () => {
    const k = $("#aiKey").value.trim(),
      msg = $("#aiMsg");
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
    aiSetCfg({ key: k, model: $("#aiModel").value });
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
      $("#aiStat").textContent = aiLabel(m);
    });
    if (!$("#aiDel") && aiKey()) {
      $(".aibtns").insertAdjacentHTML("beforeend", '<button class="btn ghost" id="aiDel">Retirer ma clé</button>');
      $("#aiDel").onclick = () => {
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
  $("#sHap").onclick = e => {
    S.set.haptic = !S.set.haptic;
    e.target.classList.toggle("on", S.set.haptic);
    save();
    haptic(1);
  };
  $("#sShare").onclick = shareProgress;
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
  $("#sGoal").onchange = e => {
    S.goal = +e.target.value;
    save();
  };
  $("#sUi").onchange = e => setUi(e.target.value);
  $("#sTheme").onchange = e => setTheme(e.target.value);
  $("#sRate").onchange = e => {
    S.set.rate = +e.target.value;
    save();
    say("Hello! This is how I sound.", "en-US");
  };
  $("#sAuto").onclick = e => {
    S.set.auto = !S.set.auto;
    e.target.classList.toggle("on", S.set.auto);
    save();
  };
  $("#sSound").onclick = e => {
    S.set.sound = !S.set.sound;
    e.target.classList.toggle("on", S.set.sound);
    save();
  };
  $("#sListen").onclick = e => {
    S.listenOff = S.listenOff > Date.now() ? 0 : Date.now() + 365 * 864e5;
    e.target.classList.toggle("on", !(S.listenOff > Date.now()));
    save();
  };
  $("#sMic").onclick = e => {
    try {
      localStorage.removeItem("speakeasy-micko");
    } catch (x) {}
    if (SR0 && !(IOS && STANDALONE)) set_SR(SR0);
    S.speakOff = S.speakOff > Date.now() ? 0 : Date.now() + 365 * 864e5;
    e.target.classList.toggle("on", !(S.speakOff > Date.now()));
    save();
  };
  $("#sTest").onclick = () => {
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
  $("#sReset").onclick = () => {
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
export function myWords() {
  const s = curSec();
  let html = "";
  s.tracks.forEach(cid => {
    const C = COURSES[cid];
    const us = unlockedUnits(cid);
    const items = [];
    us.forEach(U => {
      (U.v || []).forEach(w => items.push([w[1], w[0], ""]));
      (U.p || []).forEach(a => {
        const P = pairOf(C, a);
        items.push([P.tgt, P.src, P.rom]);
      });
      (U.dd || []).forEach(d => items.push([d, "Dictée", ""]));
    });
    if (items.length)
      html += `<h3 style="margin-top:12px">${C.icon} ${C.name} · ${items.length}</h3><div class="vlist">${items.map(x => `<div class="vitem"><button class="spk" data-say="${esc(x[0])}" data-l="${C.lang}">🔊</button><div class="tg">${esc(x[0])}${x[2] ? `<div class="rom">${esc(x[2])}</div>` : ""}<div class="fr">${esc(x[1])}</div></div></div>`).join("")}</div>`;
  });
  const m = modal(
    `<h2>📒 Mes mots ${s.flag}</h2><p>Tout ce que tu as débloqué dans le parcours. Touche 🔊 pour écouter.</p>${html || '<div class="empty">Rien pour l\'instant</div>'}<button class="btn" onclick="closeModal()">Fermer</button>`,
  );
  m.querySelectorAll("[data-say]").forEach(b => (b.onclick = () => say(b.dataset.say, b.dataset.l)));
}
