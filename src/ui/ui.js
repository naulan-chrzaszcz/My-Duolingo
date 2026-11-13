// Composants d'interface génériques : toasts, modales, confettis
import { $, rnd } from "../core/util.js";

// ===================== UI GÉNÉRIQUE =====================
// Bandeaux d'unité : couleur assombrie juste ce qu'il faut pour que le texte blanc reste lisible (contraste ≥ 4,5)
export function deep(h) {
  const m = /^#([0-9a-f]{6})$/i.exec(h || "");
  if (!m) return h;
  let c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  const lum = a => {
    const r = a.map(x => {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2];
  };
  for (let k = 0; k < 12 && 1.05 / (lum(c) + 0.05) < 4.5; k++) c = c.map(x => x * 0.95);
  return "#" + c.map(x => Math.round(x).toString(16).padStart(2, "0")).join("");
}
export function toast(t) {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = t;
  d.setAttribute("role", "status");
  const box = $("#toasts");
  if ([...box.children].some(x => x.textContent.replace(/\u00a0/g, " ") === String(t) && !x.classList.contains("out")))
    return;
  while (box.children.length > 2) box.firstChild.remove();
  box.appendChild(d);
  const ms = Math.min(7000, 2600 + Math.max(0, String(t).length - 50) * 45);
  setTimeout(() => d.classList.add("out"), ms);
  setTimeout(() => d.remove(), ms + 500);
}
export function modal(html, cls = "", locked = false) {
  const m = $("#modal");
  m.innerHTML = `<div class="mback"></div><div class="mcard ${cls}">${locked ? "" : `<button class="mx" aria-label="Fermer">✕</button>`}${html}</div>`;
  m.classList.remove("hidden");
  if (!locked) {
    m.querySelector(".mback").onclick = closeModal;
    m.querySelector(".mx").onclick = closeModal;
  }
  return m.querySelector(".mcard");
}
/** Permet d'envelopper modal (utilisé par ui/back-button.js). */
export function set_modal(v) {
  return (modal = v);
}
export function closeModal() {
  $("#modal").classList.add("hidden");
  $("#modal").innerHTML = "";
}
/** Permet d'envelopper closeModal (utilisé par ui/back-button.js). */
export function set_closeModal(v) {
  return (closeModal = v);
}
export function confetti(n = 140) {
  const c = $("#confetti"),
    x = c.getContext("2d");
  c.width = innerWidth;
  c.height = innerHeight;
  c.style.display = "block";
  const cols = ["#7C4DFF", "#FFC83D", "#22B573", "#FF4F5E", "#3D8BFF", "#FF9F1C"];
  const P = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 240,
    y: innerHeight * 0.3,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 15 - 5,
    r: Math.random() * 7 + 5,
    c: rnd(cols),
    a: Math.random() * 6,
    va: (Math.random() - 0.5) * 0.35,
  }));
  let f = 0;
  (function loop() {
    x.clearRect(0, 0, c.width, c.height);
    P.forEach(p => {
      p.vy += 0.33;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.a += p.va;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.a);
      x.fillStyle = p.c;
      x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      x.restore();
    });
    if (++f < 170) requestAnimationFrame(loop);
    else {
      x.clearRect(0, 0, c.width, c.height);
      c.style.display = "none";
    }
  })();
}
/** Réglage « Réduire les animations » de l'appareil. */
export function REDUCED() {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}
/** Éclat de particules autour d'un point de l'écran (bonne réponse). */
export function burst(x, y, n = 14, cols) {
  if (REDUCED()) return;
  const box = document.createElement("div");
  box.className = "burst";
  box.style.left = x + "px";
  box.style.top = y + "px";
  const C = cols || ["#22B573", "#FFC83D", "#7C4DFF", "#3D8BFF", "#FF9F1C", "#FF7AC6"];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i");
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const d = 38 + Math.random() * 54;
    s.style.setProperty("--dx", Math.cos(a) * d + "px");
    s.style.setProperty("--dy", Math.sin(a) * d + "px");
    s.style.background = C[i % C.length];
    if (i % 3 === 0) s.className = "bsq";
    s.style.animationDelay = Math.round(Math.random() * 70) + "ms";
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1000);
}
/** Fait glisser un élément depuis une ancienne position (étiquette qui part de la banque vers la réponse). */
export function flyFrom(from, el) {
  if (!from || !el || !el.animate || REDUCED()) return;
  const to = el.getBoundingClientRect();
  const dx = from.left - to.left,
    dy = from.top - to.top;
  if (Math.abs(dx) + Math.abs(dy) < 2) return;
  try {
    el.animate([{ transform: `translate(${dx}px,${dy}px) scale(1.04)` }, { transform: "translate(0,0) scale(1)" }], {
      duration: 240,
      easing: "cubic-bezier(.2,.9,.3,1.15)",
    });
  } catch (e) {}
}
export function countUp(el, to, ms = 900, suffix = "") {
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suffix;
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
