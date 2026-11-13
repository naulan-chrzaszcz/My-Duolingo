// Écran Ligue
import { ACC, MEM, S, curAcc, loadState, save } from "../core/accounts.js";
import { $, dkey, esc } from "../core/util.js";
import { level } from "../core/xp.js";
import { UI } from "../i18n/locale.js";
import { L } from "../lesson/engine.js";
import { accountForm } from "./accounts.js";
import { SRV, srvBoard } from "../services/cloud.js";
import { beep } from "../services/speech.js";
import { ic, medalSvg, trophySvg } from "../ui/icons.ts";
import { mascot } from "../ui/mascot.js";
import { VIEW, avatar, renderTop } from "../ui/router.js";
import { closeModal, confetti, modal } from "../ui/ui.js";

// ---------- Ligue ----------
export function weekStart(off = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * off);
  return d;
}
export function weekXp(st, off = 0) {
  const s = weekStart(off);
  let x = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    x += st.week[dkey(d)] || 0;
  }
  return x;
}
export const TIERS = [
  [0, "Bronze", "🥉", "#C27A3A"],
  [100, "Argent", "🥈", "#8E9BB0"],
  [300, "Or", "🥇", "#DFA300"],
  [600, "Saphir", "💎", "#3D8BFF"],
  [1000, "Rubis", "♦️", "#E0457B"],
  [1500, "Diamant", "💠", "#13A8A8"],
];
/** Couleurs des coupes de ligue (face, contour), dans l'ordre de TIERS. */
export const TROPHY = [
  ["#D08C56", "#8A5224"],
  ["#AEB8C8", "#5E6B80"],
  ["#FFC83D", "#C98B00"],
  ["#3D8BFF", "#1D5FC2"],
  ["#E0457B", "#A8203F"],
  ["#13A8A8", "#0C7F7F"],
];
/** Rang : médaille dessinée pour le podium, numéro ensuite. */
export const rankMark = r => (r <= 3 ? medalSvg(r) : `${r}`);
export function renderLeague(v) {
  const my = weekXp(S),
    last = weekXp(S, 1);
  let ti = 0;
  TIERS.forEach((t, i) => {
    if (my >= t[0]) ti = i;
  });
  const T = TIERS[ti],
    N = TIERS[ti + 1];
  const end = weekStart(-1);
  const left = Math.max(1, Math.ceil((end - new Date()) / 864e5));
  const rows = ACC.list
    .map(a => {
      const st = a.id === ACC.current ? S : MEM[a.id] || loadState(a.id);
      return { a, x: weekXp(st) };
    })
    .sort((p, q) => q.x - p.x);
  const trophies = TIERS.map((t, i) => {
    const big = i === ti;
    return `<button class="ltro ${big ? "on" : i < ti ? "past" : "lock"}" data-tier="${i}" aria-label="Ligue ${t[1]}">${big ? '<span class="lhalo"></span>' : ""}<span class="ltrs">${trophySvg(TROPHY[i][0], TROPHY[i][1], big ? 104 : 70, i > ti)}</span></button>`;
  }).join("");
  const pct = N ? Math.min(100, Math.round(((my - T[0]) / (N[0] - T[0])) * 100)) : 100;
  v.innerHTML = `<div class="lghead"><div><h1>Ligue ${T[1]}</h1><div class="lgleft">${ic("clock", 20, "", 2.6)}<span>Encore ${left} jour${left > 1 ? "s" : ""}</span></div></div><span class="lgme"><b>${my} XP</b><small>cette semaine</small></span></div>
 <div class="ltros">${trophies}</div><div class="ltip hidden" id="ltip"></div>
 <div class="card lprog"><div class="lpt"><span>${my} XP cette semaine</span>${N ? `<span class="lpn" style="color:${TROPHY[ti + 1][1]}">${N[1]} : ${N[0]}</span>` : ""}</div><div class="lpbar"><i style="width:${pct}%"></i></div><p>${N ? `<span>Encore</span> <b style="color:${TROPHY[ti + 1][1]}">${N[0] - my} XP</b> <span>pour monter en ligue ${N[1]}.</span>` : "Tu es au sommet : ligue Diamant !"}</p></div>
 <div class="card lloc"><h3>Classement de la semaine</h3>${rows.map((r, i) => `<div class="lrow ${r.a.id === ACC.current ? "me" : ""}" style="animation-delay:${(i * 0.05).toFixed(2)}s"><span class="lrank">${rankMark(i + 1)}</span>${avatar(r.a, 48)}<div class="lname"><b class="notr">${esc(r.a.name)}</b></div><span class="lx">${r.x} XP</span></div>`).join("")}
 ${ACC.list.length < 2 ? `<p class="secsub" style="margin:12px 0 0">Ajoute des comptes (famille, amis, collègues) sur cet appareil pour vous défier chaque semaine !</p><button class="btn ghost" id="ladd" style="margin-top:10px">${ic("useradd", 20, "", 2.4)}<span>Ajouter un compte</span></button>` : ""}</div>
 <div class="card"><h3>Toi vs la semaine dernière</h3><div class="vs"><div><small>Semaine dernière</small><b>${last} XP</b></div><div class="vsarrow ${my >= last ? "up" : "dn"}">${ic("chart", 30, "", 2.4)}</div><div><small>Cette semaine</small><b>${my} XP</b></div></div><p class="secsub" style="margin:10px 0 0">${my > last ? "Tu fais déjà mieux que la semaine dernière, continue !" : `Encore ${last - my + 1} XP pour battre ton score de la semaine dernière.`}</p></div>`;
  v.querySelectorAll("[data-tier]").forEach(
    b =>
      (b.onclick = () => {
        const i = +b.dataset.tier,
          tip = $("#ltip"),
          t = TIERS[i];
        if (tip.dataset.i === String(i) && !tip.classList.contains("hidden")) {
          tip.classList.add("hidden");
          return;
        }
        tip.dataset.i = String(i);
        tip.style.setProperty("--tc", TROPHY[i][0]);
        tip.className = "ltip" + (i > ti ? " lock" : "");
        tip.innerHTML = `<b>Ligue ${t[1]}</b> · <span>${i < ti ? "déjà atteinte cette semaine." : i === ti ? `ta ligue actuelle (à partir de ${t[0]} XP).` : `à partir de ${t[0]} XP gagnés dans la semaine.`}</span>`;
      }),
  );
  const la = $("#ladd");
  if (la) la.onclick = () => accountForm(null);
  if (SRV.ok) {
    const box = document.createElement("div");
    box.className = "card lgcard";
    box.innerHTML = '<h3>🌍 Classement de tous les membres</h3><div class="empty">Chargement…</div>';
    v.insertBefore(box, v.querySelector(".lloc"));
    srvBoard().then(B => {
      if (VIEW !== "ligue" || !box.isConnected) return;
      if (!B) {
        box.querySelector(".empty").textContent = "Classement indisponible pour le moment.";
        return;
      }
      renderBoard(box, B, my);
      leagueResult(B);
    });
  }
}
// ---- Ligues en ligne : classement de tous les comptes du site (semaine / depuis toujours), podium, médailles ----
export let LG_TAB = "w";
export function tierOf(x) {
  let t = TIERS[0];
  TIERS.forEach(q => {
    if (x >= q[0]) t = q;
  });
  return t;
}
export function renderBoard(box, B, myWxp) {
  const acc = curAcc(),
    online = !!(acc && acc.srv),
    me = online ? acc.name : null;
  // mon score local est plus frais que la dernière synchronisation
  const wk = B.rows.map(r => (r.name === me ? { ...r, wxp: Math.max(r.wxp, myWxp), xp: Math.max(r.xp, S.xp) } : r));
  if (online && myWxp > 0 && !wk.some(r => r.name === me) && wk.length < 50)
    wk.push({
      name: me,
      emoji: acc.emoji,
      color: acc.color,
      wxp: myWxp,
      xp: S.xp,
      streak: S.streak || 0,
      m: [0, 0, 0],
    });
  wk.sort((p, q) => q.wxp - p.wxp);
  const al = B.all.map(r => (r.name === me ? { ...r, xp: Math.max(r.xp, S.xp) } : r)).sort((p, q) => q.xp - p.xp);
  const medals = m =>
    m
      ? ["🥇", "🥈", "🥉"]
          .map((e, i) => (m[i] ? `<span class="lmed">${e}${m[i] > 1 ? "×" + m[i] : ""}</span>` : ""))
          .join("")
      : "";
  const sub = (r, all) =>
    `<small class="lsub">${all ? `<span>Niveau ${level(r.xp)}</span>` : `<span class="notr">${tierOf(r.wxp)[2]}</span> <span>${tierOf(r.wxp)[1]}</span>`}${r.streak > 1 ? `<span class="notr"> · 🔥 ${r.streak}</span>` : ""} ${medals(r.m)}</small>`;
  const val = (r, all) => `${(all ? r.xp : r.wxp).toLocaleString(UI === "fr" ? "fr-FR" : "en-US")} XP`;
  const draw = () => {
    const all = LG_TAB === "a",
      rows = all ? al : wk;
    const pod = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : null;
    const rest = pod ? rows.slice(3) : rows;
    const rank = B.me ? (all ? B.me.arank : B.me.wrank) : 0;
    box.innerHTML = `<h3>🌍 Classement de tous les membres <span class="lgcount notr">👥 ${B.members}</span></h3>
  <div class="lgtabs"><button class="${all ? "" : "on"}" data-t="w">Cette semaine</button><button class="${all ? "on" : ""}" data-t="a">Depuis toujours</button></div>
  ${rows.length ? "" : `<div class="empty">${all ? "Aucun membre pour l'instant." : "Personne n'a encore gagné d'XP cette semaine. Sois la première !"}</div>`}
  ${
    pod
      ? `<div class="podium">${pod
          .map((r, i) => {
            const pl = [2, 1, 3][i];
            return `<div class="pcol p${pl} ${r.name === me ? "me" : ""}">${avatar(r, pl === 1 ? 64 : 50)}<b class="notr">${esc(r.name)}</b><small class="notr">${val(r, all)}</small><div class="pstep">${medalSvg(pl)}${r.streak > 1 ? `<i class="notr">🔥 ${r.streak}</i>` : ""}</div></div>`;
          })
          .join("")}</div>`
      : ""
  }
  ${rest.map((r, i) => `<div class="lrow ${r.name === me ? "me" : ""}"><span class="lrank">${rankMark(pod ? i + 4 : i + 1)}</span>${avatar(r, 40)}<div class="lname"><b class="notr">${esc(r.name)}</b>${sub(r, all)}</div><span class="lx notr">${val(r, all)}</span></div>`).join("")}
  ${rank > 50 ? `<div class="lrow me"><span class="lrank">${rank}</span>${avatar(acc, 40)}<div class="lname"><b class="notr">${esc(me)}</b></div><span class="lx notr">${val({ xp: S.xp, wxp: myWxp }, all)}</span></div>` : ""}
  ${online ? "" : '<p class="secsub" style="margin:10px 0 0">Crée un compte en ligne pour apparaître dans ce classement.</p>'}
  <div class="lprize"><span>Fin de semaine :</span> <b>+50</b>, <b>+30</b> <span>et</span> <b>+20 💎</b> <span>pour le podium.</span></div>
  ${B.last && B.last.length ? `<div class="lglast"><h4>🏅 Podium de la semaine dernière</h4><div class="lgl">${B.last.map((r, i) => `<span class="${r.name === me ? "me" : ""}">${["🥇", "🥈", "🥉"][i]} ${avatar(r, 26)} <b class="notr">${esc(r.name)}</b> <small class="notr">${r.wxp} XP</small></span>`).join("")}</div>${B.me && B.me.lrank ? `<p class="secsub" style="margin:8px 0 0">Tu as fini n° ${B.me.lrank} sur ${B.me.lcount} avec ${B.me.lwxp} XP.</p>` : ""}</div>` : ""}`;
    box.querySelectorAll(".lgtabs button").forEach(
      b =>
        (b.onclick = () => {
          beep("tap");
          LG_TAB = b.dataset.t;
          draw();
        }),
    );
  };
  draw();
}
// Résultat de la semaine écoulée : affiché une seule fois, avec des gemmes pour le podium
export function leagueResult(B) {
  const m = B && B.me;
  const wk = dkey(weekStart(1));
  if (!m || !m.lrank || S.lgSeen === wk || L) return;
  if (!$("#modal").classList.contains("hidden")) return;
  S.lgSeen = wk;
  const prize = [50, 30, 20][m.lrank - 1] || 0;
  if (prize) S.gems += prize;
  save();
  renderTop();
  const md = modal(
    `<div class="mcenter">${mascot(m.lrank <= 3 ? "wow" : "happy", "jump")}<h2>🏁 Semaine terminée !</h2><p style="font-size:44px;margin:6px 0">${["🥇", "🥈", "🥉"][m.lrank - 1] || "🏅"}</p><p>Tu as fini n° ${m.lrank} sur ${m.lcount} avec ${m.lwxp} XP.</p>${prize ? `<p><b>Tu montes sur le podium : +${prize} 💎</b></p>` : ""}<p class="secsub">Nouvelle semaine, nouveau classement : à toi de jouer !</p><button class="btn" id="lgok">C'est parti !</button></div>`,
  );
  if (prize) {
    try {
      confetti();
    } catch (e) {}
    beep("win");
  }
  md.querySelector("#lgok").onclick = closeModal;
}
export async function leagueCheck() {
  const a = curAcc();
  if (!SRV.ok || !a || !a.srv || !a.token || S.lgSeen === dkey(weekStart(1))) return;
  const B = await srvBoard();
  if (B && S.onb) leagueResult(B);
}
