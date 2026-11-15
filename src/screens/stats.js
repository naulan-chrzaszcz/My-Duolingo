// Écran Statistiques
import { flagSvg, ic } from "../ui/icons.ts";
import { COURSES } from "../content/index.js";
import { S, save } from "../core/accounts.js";
import { esc } from "../core/util.js";
import { unlockedUnits } from "../lesson/build.js";
import { statBucket } from "../lesson/engine.js";
import { startAI } from "../services/ai.js";
import { curCid, curSec, renderAll } from "../ui/router.js";

// ---------- Statistiques par unité et par notion ----------
export const pct = (a, k) => (a ? Math.round(((a - k) / a) * 100) : 0);
export function renderStats(v) {
  const s = curSec();
  const cid = curCid();
  const C = COURSES[cid];
  const st = statBucket(cid);
  const rules = Object.values(st.r)
    .filter(r => r.k > 0)
    .sort((p, q) => q.k / q.a + q.k * 0.15 - (p.k / p.a + p.k * 0.15))
    .slice(0, 10);
  const tot = Object.values(st.u).reduce((x, y) => [x[0] + y[0], x[1] + y[1]], [0, 0]);
  const rows = C.units
    .map((U, ui) => {
      const x = st.u[ui];
      if (!x) return "";
      const sk = Object.entries(st.sk)
        .filter(([k]) => k.split("|")[0] == String(ui))
        .map(([k, y]) => [k.split("|")[1], y])
        .sort((p, q) => pct(...p[1]) - pct(...q[1]));
      const rr = Object.values(st.r)
        .filter(r => r.u == ui && r.k > 0)
        .sort((p, q) => q.k - p.k)
        .slice(0, 6);
      const m = pct(...x);
      return `<details class="sunit"><summary><span class="sut">${ui + 1}. ${esc(U.t)}</span><span class="sbar"><i style="width:${m}%;background:${m >= 80 ? "var(--ok)" : m >= 60 ? "var(--gold)" : "var(--bad)"}"></i></span><b>${m} %</b></summary>
   <div class="sdet"><h4>Compétences</h4>${sk.map(([n, y]) => `<div class="srow"><span>${esc(n)}</span><span class="sbar"><i style="width:${pct(...y)}%"></i></span><small>${pct(...y)} % · ${y[0]}</small></div>`).join("")}
   ${rr.length ? `<h4>Notions qui coincent</h4>${rr.map(r => `<div class="srule"><span>${esc(r.l)}</span><small class="rc">${ic("x", 13, "", 3.4)}${r.k} / ${r.a}</small></div>`).join("")}` : ""}
   <button class="btn ghost" data-ru="${ui}">🎯 Réviser cette unité</button></div></details>`;
    })
    .join("");
  v.innerHTML = `<h1 class="sectitle phd"><span>Statistiques</span>${flagSvg(s.id, 34, 23, 6)}</h1><p class="secsub">Chaque réponse est classée par thème, compétence et notion : tu vois exactement ce qui revient.</p>
  ${s.tracks.length > 1 ? `<div class="tracks">${s.tracks.map(t => `<button data-st="${t}" class="${t === cid ? "on" : ""}">${COURSES[t].icon} ${COURSES[t].name}</button>`).join("")}</div>` : ""}
  <div class="sgrid"><div class="sbox"><span class="si">✅</span><div><b>${tot[0] || tot[1] ? pct(...tot) + " %" : "—"}</b><small>réussite</small></div></div><div class="sbox"><span class="si">🧮</span><div><b>${tot[0]}</b><small>réponses</small></div></div><div class="sbox"><span class="si">📚</span><div><b>${Object.keys(st.u).filter(k => k !== "x").length}</b><small>unités travaillées</small></div></div><div class="sbox"><span class="si">🔁</span><div><b>${rules.length}</b><small>notions à revoir</small></div></div></div>
  <div class="card"><h3 class="hic">${ic("repeat", 22, "", 2.6)}<span>Erreurs récurrentes</span></h3>${rules.length ? `<p class="rnote">Erreurs sur le nombre de réponses. Touche la cible pour t'entraîner sur la notion.</p>` + rules.map((r, i) => `<div class="rerr"><b class="rn">${i + 1}</b><div class="rt"><span>${esc(r.l)}</span><div class="rm"><span class="rc">${ic("x", 13, "", 3.4)}${r.k} / ${r.a}</span>${C.units[r.u] ? `<small>Unité : ${esc(C.units[r.u].t)}</small>` : ""}</div></div><button class="rgo" data-rn="${i}" aria-label="S'entraîner sur cette notion">${ic("target", 22, "", 2.6)}</button></div>`).join("") : '<div class="empty">Pas encore d\'erreur enregistrée : fais quelques leçons !</div>'}</div>
  <div class="card"><h3 class="hic">${ic("layers", 22, "", 2.6)}<span>Par thème</span></h3>${rows || '<div class="empty">Aucune donnée pour ce parcours.</div>'}</div>
  <button class="btn ghost" onclick="location.hash='profil'">← Retour au profil</button>`;
  v.querySelectorAll("[data-st]").forEach(
    b =>
      (b.onclick = () => {
        S.track[s.id] = b.dataset.st;
        save();
        renderAll();
      }),
  );
  v.querySelectorAll("[data-ru]").forEach(
    b => (b.onclick = () => startAI(cid, [C.units[+b.dataset.ru]], { mode: "train", coach: true })),
  );
  v.querySelectorAll("[data-rn]").forEach(
    b =>
      (b.onclick = () => {
        const r = rules[+b.dataset.rn];
        const U = C.units[r.u];
        startAI(cid, U ? [U] : unlockedUnits(cid).slice(-2), {
          mode: "train",
          theme: "la notion « " + r.l.replace(/^(Rédaction · |Mot : |Phrase : )/, "") + " »",
        });
      }),
  );
}
