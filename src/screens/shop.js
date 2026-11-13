// Écran Boutique
import { ic } from "../ui/icons.ts";
import { S, save } from "../core/accounts.js";
import { $ } from "../core/util.js";
import { checkBadges } from "../features/quests.js";
import { beep } from "../services/speech.js";
import { ACCS, mascot } from "../ui/mascot.js";
import { renderAll } from "../ui/router.js";
import { confetti, toast } from "../ui/ui.js";

// ---------- Boutique ----------
export function renderShop(v) {
  const now = Date.now();
  const boost = S.boostUntil > now;
  const items = [
    {
      id: "freeze",
      ic: "❄️",
      k: "snow",
      col: "#3D8BFF",
      n: "Gel de série",
      d: `Protège ta série si tu rates un jour. Équipés : ${S.freeze}/2`,
      p: 50,
      dis: S.freeze >= 2,
      lab: S.freeze >= 2 ? "Max équipé" : null,
    },
    {
      id: "boost",
      ic: "⚡",
      k: "bolt",
      col: "#FFB020",
      n: "Double XP · 15 min",
      d: boost
        ? `Actif encore ${Math.ceil((S.boostUntil - now) / 60000)} min`
        : "Toutes tes séances rapportent 2× plus d'XP.",
      p: 40,
      dis: boost,
      lab: boost ? "Actif" : null,
    },
  ];
  v.innerHTML = `<div class="shophead"><h1 class="sectitle">Boutique</h1><span class="gembal">${ic("gem", 22, "", 2.4, "#9CC4FF")}<b>${S.gems}</b></span></div><p class="secsub">Gagne des gemmes avec les leçons (+5), les bilans d'unité (+20), l'entraînement (+3) et les quêtes du jour.</p>
 <h2 class="ph2">Bonus</h2><div class="tgrid">${items.map(it => `<div class="tcard"><span class="ti shopic" style="background:${it.col}">${ic(it.k, 30, "", 2.4)}</span><h3>${it.n}</h3><p>${it.d}</p><button class="btn ${it.dis ? "ghost" : "goldb"}" data-buy="${it.id}" ${it.dis || S.gems < it.p ? "disabled" : ""}>${it.lab || it.p + " 💎"}</button></div>`).join("")}</div>
 <h2 class="ph2">Tenues de Horang</h2><div class="tgrid">${Object.entries(ACCS)
   .map(([k, a]) => {
     const own = S.owned.includes(k),
       on = S.wear === k;
     return `<div class="tcard"><div class="sprev">${mascotWith(k)}</div><h3>${a.ic} ${a.n}</h3><button class="btn ${on ? "okb" : own ? "ghost" : "goldb"}" data-acc="${k}" ${!own && S.gems < a.p ? "disabled" : ""}>${on ? "Porté ✓" : own ? "Porter" : a.p + " 💎"}</button></div>`;
   })
   .join("")}</div>
 ${S.wear ? '<button class="btn ghost" id="unwear" style="margin-top:14px">Retirer la tenue</button>' : ""}`;
  v.querySelectorAll("[data-buy]").forEach(b => (b.onclick = () => buy(b.dataset.buy)));
  v.querySelectorAll("[data-acc]").forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.acc,
          a = ACCS[k];
        if (!S.owned.includes(k)) {
          if (S.gems < a.p) return;
          S.gems -= a.p;
          S.owned.push(k);
          beep("win");
          confetti(60);
          toast(`${a.ic} ${a.n} achetée !`);
        }
        S.wear = S.wear === k ? "" : k;
        checkBadges();
        save();
        renderAll();
      }),
  );
  const uw = $("#unwear");
  if (uw)
    uw.onclick = () => {
      S.wear = "";
      save();
      renderAll();
    };
}
export function mascotWith(k) {
  const w = S.wear;
  S.wear = k;
  const h = mascot("happy");
  S.wear = w;
  return h;
}
export function buy(id) {
  const P = { freeze: 50, boost: 40 }[id];
  if (S.gems < P) return;
  S.gems -= P;
  if (id === "freeze") {
    S.freeze = Math.min(2, S.freeze + 1);
    toast("❄️ Gel de série équipé !");
  }
  if (id === "boost") {
    S.boostUntil = Date.now() + 15 * 60000;
    toast("⚡ Double XP activé pour 15 min !");
  }
  beep("win");
  save();
  renderAll();
}
