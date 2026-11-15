// Écran Profil et réglages
import { COURSES } from "../content/index.js";
import { ACC, MEM, S, curAcc, loadState, save, saveAcc, set_S } from "../core/accounts.js";
import { hydrate } from "../core/progress.js";
import { KEY } from "../core/state.js";
import { $, dkey, esc, yest } from "../core/util.js";
import { level, lvlXp } from "../core/xp.js";
import { pairOf } from "../exercises/generate.js";
import { shareProgress } from "../features/coach.js";
import { BADGES, BADGE_MEDAL } from "../features/quests.js";
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
  const BM = BADGE_MEDAL;
  const badges = BADGES.map((x, i) => {
    const on = S.badges.includes(x.id);
    const [k, c, d, num] = BM[x.id] || ["star", "#7C4DFF", "#5A30D8", ""];
    return `<button class="bdg ${on ? "on" : "lock"}" data-b="${i}" aria-label="${x.n}" style="--bc:${c};--bd:${d};animation-delay:${(0.2 + i * 0.04).toFixed(2)}s"><span class="bmed">${on ? ic(k, 34, "", 2.6) : ic("lock", 28, "", 2.6)}${on ? '<span class="shine"></span>' : ""}</span>${num ? `<span class="bnum">${num}</span>` : ""}</button>`;
  }).join("");
  v.innerHTML = `<div class="pban"><div class="pbtop"><div><h1 class="notr">${esc(acc.name || "Mon profil")}</h1><div class="pbsub"><span>Niveau ${lv}</span> · <span>${acc.srv ? "compte en ligne" : "compte sur cet appareil"}</span></div></div><div class="pbbtns"><button class="pbi" id="pWear" aria-label="Tenues de Horang">${ic("hanger", 30, "", 2.2)}</button><button class="pbi" id="pGear" aria-label="Paramètres">${ic("gear", 28, "", 2.2)}</button></div></div><div class="phop">${mascot("happy")}</div>${wear ? `<span class="pwear">${wear.n}</span>` : ""}</div>
 <div class="pxp"><div class="pxpr"><b>Niv. ${lv}</b><span class="pxpbar"><i style="width:${Math.round(((S.xp - a) / (b - a)) * 100)}%"></i></span><b class="pnx">${lv + 1}</b></div><small><span>${S.xp} XP</span> · <span>encore ${b - S.xp} XP pour le niveau ${lv + 1}</span></small></div>
 <div class="pacts"><button class="btn ghost" id="pAdd">${ic("useradd", 22, "", 2.4)}<span>Ajouter un compte</span></button><button class="btn ghost pshare" id="pShare" aria-label="Partager ma progression">${ic("share", 24, "", 2.4)}</button></div>
 <h2 class="ph2">Récap</h2><div class="precap">${recap.map(([i, c, big, sm]) => `<div class="prc"><span class="prci" style="color:${c || "inherit"}">${i}</span><span><b>${big}</b><small>${sm}</small></span></div>`).join("")}</div>
 <h2 class="ph2">Comptes sur cet appareil</h2><div class="paccs">${others}<button class="pacc add" id="pAdd2" aria-label="Ajouter un compte"><span class="padd">${ic("plus", 26, "", 2.6)}</span><span>Ajouter</span></button></div>
 <div class="card"><h3>Cette semaine</h3><div class="week">${days.map(d => `<div class="${d.t ? "today" : ""}"><small>${d.x}</small><i style="height:${Math.max(3, (d.x / mx) * 90)}%"></i><small>${d.l}</small></div>`).join("")}</div></div>
 <h2 class="ph2">Badges · ${S.badges.length} sur ${BADGES.length}</h2><div class="pbdgs">${badges}</div><div class="ltip hidden" id="btip"></div>
 <h2 class="ph2">Mes outils</h2><div class="ptools"><button class="ptool" id="tStats">${ic("chart", 24, "", 2.4)}<span>Statistiques par notion</span>${ic("chevr", 20, "", 3)}</button><button class="ptool" id="tAi">${ic("spark", 24, "", 2.4)}<span>Mon Claude (IA)</span>${ic("chevr", 20, "", 3)}</button><button class="ptool" id="tWords">${ic("book", 24, "", 2.4)}<span>Mes mots</span>${ic("chevr", 20, "", 3)}</button></div>
`;
  $("#pWear").onclick = () => (location.hash = "boutique");
  $("#pGear").onclick = () => (location.hash = "reglages");
  $("#pAdd").onclick = $("#pAdd2").onclick = () => accountForm(null);
  $("#pShare").onclick = shareProgress;
  $("#tStats").onclick = () => (location.hash = "stats");
  $("#tAi").onclick = () => (location.hash = "reglages/claude");
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
    `<h2 class="hi">${ic("bookmark", 22, "", 2.4)}Mes mots ${s.flag}</h2><p>Tout ce que tu as débloqué dans le parcours. Touche 🔊 pour écouter.</p>${html || '<div class="empty">Rien pour l\'instant</div>'}<button class="btn" onclick="closeModal()">Fermer</button>`,
  );
  m.querySelectorAll("[data-say]").forEach(b => (b.onclick = () => say(b.dataset.say, b.dataset.l)));
}
