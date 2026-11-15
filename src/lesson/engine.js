// Moteur de leçon : déroulé, vérification, résultats, erreurs
import { COURSES } from "../content/index.js";
import { S, save } from "../core/accounts.js";
import { FULL, hgIdx, isDone, setDone, syncProg } from "../core/progress.js";
import { $, NPU, PRAISE, dkey, esc, rnd, shuffle, yest } from "../core/util.js";
import { addToday, level, todayXp } from "../core/xp.js";
import { distract } from "../exercises/generate.js";
import { drillLabel, drillRecord } from "../exercises/drills.js";
import { R } from "../exercises/render.js";
import { words } from "../exercises/validate.js";
import { bindExplain, explainHtml } from "../features/explain.js";
import { placeStage } from "../features/placement.js";
import { UI } from "../i18n/locale.js";
import { BADGE_MEDAL, checkBadges, checkQuests, todayQuests } from "../features/quests.js";
import { bankApply, bankDue } from "../features/word-bank.js";
import { beep, say } from "../services/speech.js";
import { FLAME, streakMilestone, streakReset } from "../screens/streak.js";
import { ic } from "../ui/icons.js";
import { mascot } from "../ui/mascot.js";
import { VIEW, curSec, renderAll, renderTop } from "../ui/router.js";
import { burst, closeModal, confetti, countUp, modal, toast } from "../ui/ui.js";

// ===================== MOTEUR DE LEÇON =====================
/** Leçon en cours (null hors leçon). Lecture partout ; remplacement avec set_L(). */
export let L = null;
/** Remplace la leçon en cours (null pour la fermer). */
export function set_L(v) {
  return (L = v);
}
export let WAKE = null;
export async function wakeOn() {
  try {
    if ("wakeLock" in navigator && !WAKE) {
      WAKE = await navigator.wakeLock.request("screen");
      WAKE.addEventListener("release", () => {
        WAKE = null;
      });
    }
  } catch (e) {
    WAKE = null;
  }
}
export function wakeOff() {
  try {
    WAKE && WAKE.release();
  } catch (e) {}
  WAKE = null;
}
export function openSession(cfg) {
  wakeOn();
  if (!cfg.exs || !cfg.exs.length) {
    toast("Pas encore assez de contenu débloqué ici.");
    return;
  }

  if (cfg.u != null && !cfg.unitT) cfg.unitT = COURSES[cfg.cid].units[cfg.u].t;
  // v32 : pas deux fois le même exercice dans une séance d'entraînement ou de révision IA (le sprint peut répéter)
  if ((cfg.mode === "train" || cfg.ai) && !cfg.keepDup) {
    const seen = new Set();
    cfg.exs = cfg.exs.filter(e => {
      const k =
        e.t +
        "|" +
        (e.t === "match"
          ? e.pairs
              .map(p => p[1])
              .sort()
              .join(",")
          : e.q || e.prompt || e.text || e.audio || e.answer || e.id || Math.random());
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  L = Object.assign(
    {
      q: cfg.exs.slice(),
      total: cfg.exs.length,
      done: 0,
      correct: 0,
      wrong: 0,
      combo: 0,
      maxCombo: 0,
      xp: 0,
      start: Date.now(),
      retries: new Map(),
      state: "answer",
      ctrl: null,
      listenOk: 0,
      spokeOk: 0,
    },
    cfg,
  );
  const el = $("#lesson");
  el.classList.remove("hidden");
  document.body.classList.add("noscroll");
  el.innerHTML = `<div class="lwrap"><div class="lhead"><button class="iconbtn" id="lx" aria-label="Quitter">✕</button><div class="pbar"><i id="pfill" style="width:0%"></i><span id="pcombo"></span></div><div id="lstat" class="lstat"></div></div><div class="lbody" id="lbody"></div></div><div class="lfoot" id="lfoot"></div>`;
  $("#lx").onclick = quitAsk;
  if (L.mode === "sprint") {
    L.timeLeft = 60;
    const run = L; // le minuteur ne concerne que ce sprint : il s'arrête si une autre séance a pris sa place
    run.timer = setInterval(() => {
      if (L !== run) return clearInterval(run.timer);
      L.timeLeft--;
      updHead();
      if (L.timeLeft <= 0) {
        clearInterval(L.timer);
        finish();
      }
    }, 1000);
  }
  updHead();
  nextEx();
}
/** Permet d'envelopper openSession (utilisé par ui/back-button.js). */
export function set_openSession(v) {
  return (openSession = v);
}
export function updHead() {
  if (!L || !$("#pfill")) return; // pas d'en-tête : écran de fin affiché ou leçon fermée
  const p = L.mode === "sprint" ? Math.min(100, (L.correct / 30) * 100) : (L.done / L.total) * 100;
  $("#pfill").style.width = p + "%";
  $("#lstat").innerHTML =
    L.mode === "sprint"
      ? `<span style="color:${L.timeLeft <= 10 ? "var(--bad)" : "var(--blue)"}">⏱ ${L.timeLeft}</span>`
      : L.mode === "jump" || L.ext
        ? `<span style="color:var(--bad)">${L.ext ? "🔥" : ""}❤️ ${L.jh}</span>`
        : `<span style="color:${L.ai ? "var(--pri)" : "var(--gold-d)"}">${L.ai === "ia" ? "✨ IA" : L.ai ? "🔀 Mix" : "⚡ " + L.xp}</span>`;
  $("#pcombo").textContent = L.combo >= 3 ? `🔥 ${L.combo} d'affilée` : "";
  // barre de progression : elle chauffe avec la série de bonnes réponses, et sursaute quand elle avance
  const bar = $(".pbar");
  if (bar) {
    bar.classList.toggle("hot", L.combo >= 3);
    bar.classList.toggle("fire", L.combo >= 5);
  }
  const fill = $("#pfill");
  if (fill.dataset.p !== String(p)) {
    if (fill.dataset.p && +fill.dataset.p < p) {
      fill.classList.remove("bump");
      void fill.offsetWidth;
      fill.classList.add("bump");
    }
    fill.dataset.p = String(p);
  }
}
/** Éclat de couleurs autour de la coche de la bonne réponse (plus fourni pendant une série). */
export function okFx() {
  const fic = $("#lfoot .fic");
  if (!fic || !L) return;
  const r = fic.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, L.combo >= 5 ? 24 : L.combo >= 3 ? 18 : 12);
}
// Exercices qui demandent d'écouter (haut-parleur) ou de parler (micro)
export const isAudioEx = ex =>
  !!ex &&
  (["listen", "listenTiles", "dictee", "part2", "conv"].includes(ex.t) ||
    (ex.t === "photo" && ex.hidden) ||
    (ex.t === "hg" && !!ex.auto));
// « Plus tard » (micro) / « Pas de son » (écoute) : pause de 15 min, sans pénalité. Les exercices restants de la séance
// sont remplacés par leur version silencieuse (étiquettes, traduction écrite) ou retirés quand il n'y en a pas.
export function pauseAudio(kind) {
  if (!L || L.state !== "answer") return;
  const until = Date.now() + 15 * 60000;
  if (kind === "mic") S.speakOff = until;
  else S.listenOff = until;
  save();
  toast(kind === "mic" ? "🎙️ Exercices de micro en pause 15 min" : "🔇 Exercices d'écoute en pause 15 min");
  const all = [L.ex, ...L.q];
  const pool = all
    .filter(e => e && typeof e.answer === "string" && e.lang === L.ex.lang && e.prompt)
    .flatMap(e => words(e.answer))
    .concat(COURSES[L.cid] ? COURSES[L.cid].units.flatMap(u => (u.v || []).map(v => v[1])).flatMap(words) : []);
  const conv = e => {
    if (!e) return null;
    if (e.t === "speak") {
      if (kind !== "mic") return e;
      const ans = e.answer || e.text;
      if (!e.prompt || !ans) return null;
      const w = words(ans);
      return {
        ...e,
        t: "tiles",
        answer: ans,
        alts: e.alts || [ans],
        audio: ans,
        tiles: shuffle([...w, ...distract(pool, w, 4)]),
      };
    }
    if (kind === "sound") {
      if (e.t === "listenTiles") return e.prompt ? { ...e, t: "tiles" } : null;
      if (e.t === "listen") return e.prompt ? { ...e, t: "type" } : null;
      if (isAudioEx(e)) return null;
    }
    return e;
  };
  const n0 = L.q.length;
  L.q = L.q.map(conv).filter(Boolean);
  L.total -= n0 - L.q.length;
  const cur = conv(L.ex);
  if (cur && cur !== L.ex) L.q.unshift(cur);
  else L.total--;
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  nextEx();
}
export function setReady(b) {
  const c = $("#chk");
  if (c) c.disabled = !b;
}
export function nextEx() {
  if (!L) return;
  if (!L.q.length) return finish();
  L.ex = L.q.shift();
  L.state = "answer";
  const ex = L.ex;
  const body = $("#lbody");
  body.classList.remove("shake", "enter");
  void body.offsetWidth;
  body.classList.add("enter");
  L.ctrl = (R[ex.t] || R.mc)(ex, body);
  if (ex._rev) {
    const t = body.querySelector(".ltitle");
    if (t) t.insertAdjacentHTML("beforeend", ' <span class="aibadge revb">🔁 Rappel</span>');
  }
  if (L.ai === "ia" && !body.querySelector(".aibadge")) {
    const t = body.querySelector(".ltitle");
    if (t) t.insertAdjacentHTML("beforeend", ' <span class="aibadge">✨ généré par IA</span>');
  }
  const isSpeak = ex.t === "speak",
    isMatch = ex.t === "match",
    isAud = isAudioEx(ex) && L.mode !== "place";
  $("#lfoot").className = "lfoot";
  $("#lfoot").innerHTML =
    `<div class="fin"><button class="btn ghost" id="skip">${isSpeak ? "🔇 Plus tard" : isAud ? "🔇 Pas de son" : "Passer"}</button>${isMatch ? "" : `<button class="btn" id="chk" disabled>Vérifier</button>`}</div>`;
  $("#skip").onclick = () => {
    if (isSpeak) return pauseAudio("mic");
    if (isAud) return pauseAudio("sound");
    check(true);
  };
  const c = $("#chk");
  if (c) c.onclick = () => check();
  const ta = body.querySelector("textarea");
  if (ta) setTimeout(() => ta.focus(), 60);
}
export function check(giveUp) {
  if (!L || L.state !== "answer") return;
  const c = $("#chk");
  if (!giveUp && c && c.disabled && L.ex.t !== "match") return;
  const res = L.ctrl.grade(!!giveUp);
  if (res && typeof res.then === "function") {
    L.state = "grading";
    const b = $("#chk");
    if (b) {
      b.disabled = true;
      b.textContent = "Correction…";
    }
    res
      .then(r => {
        if (L) result(r);
      })
      .catch(() => {
        if (L) result({ ok: false, title: "Correction impossible", sol: "Réessaie plus tard." });
      });
    return;
  }
  result(res);
}
export function result(res) {
  const ex = L.ex;
  const given = res.given !== undefined ? res.given : readGiven();
  L.state = "feedback";
  if (L.mock) {
    const k = ex.sec === "L" ? "lc" : "rc";
    L[k][1]++;
    if (res.ok) L[k][0]++;
  }
  if (ex.t !== "write" && !L.retries.has(ex)) recordStat(ex, res.ok);
  if (res.ok) {
    L.correct++;
    L.done++;
    L.combo++;
    if (L.combo > L.maxCombo) L.maxCombo = L.combo;
    const first = !L.retries.has(ex);
    const g = L.mode === "sprint" ? 0 : (first ? 10 : 5) + (L.combo >= 5 ? 2 : 0);
    L.xp += g;
    const combo = L.combo > 0 && L.combo % 5 === 0;
    beep(combo ? "combo" : "ok", combo ? (L.combo / 5 - 1) * 2 : L.combo - 1);
    if (g) xpFly("+" + g + " XP");
    if ([3, 5, 10, 15, 20, 30].includes(L.combo)) {
      const d = document.createElement("div");
      d.className = "combo-pop";
      d.textContent = `🔥 ${L.combo} d'affilée !`;
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 1200);
    }
    if (["listen", "listenTiles", "part2", "speak", "dictee", "conv", "photo"].includes(ex.t)) L.listenOk++;
    if (ex.t === "speak") L.spokeOk++;
    if (ex._bank) {
      if (L.bankRes[ex._bank] === undefined) L.bankRes[ex._bank] = true;
    } else anchorOk(ex);
  } else {
    L.wrong++;
    L.combo = 0;
    beep("bad");
    $("#lbody").classList.add("shake");
    logError(ex, given);
    if (ex._bank && L.bankRes) L.bankRes[ex._bank] = false;
    if (L.mode === "jump" || L.ext) L.jh--;
    if (L.mode !== "place") addMistake(ex);
    const r = L.retries.get(ex) || 0;
    if (r < 2 && L.mode !== "sprint" && !L.noRetry && ex.t !== "match" && ex.t !== "write") {
      L.retries.set(ex, r + 1);
      L.q.push(ex);
    } else L.done++;
  }
  updHead();
  const pm = $("#lbody .prompt svg.mascot");
  if (pm) {
    pm.outerHTML = mascot(res.ok ? "happy" : "sad", res.ok ? "jump" : "sad");
  }
  const autoSpeak = () => {
    if (res.speak2) {
      say(res.speak, res.lang);
      say(res.speak2, res.lang, { queue: true });
    } else if (res.speak) say(res.speak, res.lang);
  };
  if (L.mode === "sprint") {
    const f = $("#lfoot");
    f.className = "lfoot " + (res.ok ? "ok" : "bad");
    f.innerHTML = `<div class="fin"><div class="fhead"><div class="fic">${res.ok ? "✓" : "✕"}</div><div class="ftxt"><h3>${res.ok ? rnd(PRAISE) : "Raté"}</h3>${res.ok ? "" : `<div class="fsol">${res.solHtml || esc(res.sol)}</div>`}</div></div></div>`;
    if (res.ok) okFx();
    if (S.set.auto && res.speak) say(res.speak, res.lang);
    setTimeout(
      () => {
        if (L && L.state === "feedback" && L.timeLeft > 0) nextEx();
      },
      res.ok ? 650 : 1500,
    );
    return;
  }
  const f = $("#lfoot");
  f.className = "lfoot " + (res.ok ? "ok" : "bad");
  const title = res.ok
    ? res.typo
      ? "Attention à la faute de frappe :"
      : res.title || rnd(PRAISE)
    : res.title || "Réponse correcte :";
  const sol = res.solHtml || (res.sol ? esc(res.sol) : "");
  f.innerHTML = `<div class="fin"><div class="fhead"><div class="fic">${res.ok ? "✓" : "✕"}</div><div class="ftxt"><h3>${title}</h3>${sol ? `<div class="fsol">${res.ok && !res.typo && !res.solHtml ? "🔊 " : ""}${sol}</div>` : ""}${res.rom ? `<div class="rom">${esc(res.rom)}</div>` : ""}${res.diff || ""}</div>${res.speak ? `<div class="faud"><button class="iconbtn" id="fa1" aria-label="Écouter">🔊</button><button class="iconbtn" id="fa2" aria-label="Écouter lentement">🐢</button></div>` : ""}</div>${explainHtml(ex, res, L)}<button class="btn ${res.ok ? "okb" : "badb"}" id="cont">Continuer</button></div>`;
  bindExplain(ex, res, given, L);
  if (res.ok) okFx();
  if (res.speak) {
    $("#fa1").onclick = autoSpeak;
    $("#fa2").onclick = () => say(res.speak2 ? res.speak2 : res.speak, res.lang, { slow: true });
  }
  if (S.set.auto) autoSpeak();
  $("#cont").onclick = () => {
    if (!L || L.state !== "feedback") return;
    if ((L.mode === "jump" || L.ext) && L.jh <= 0) return jumpFail();
    nextEx();
  };
  setTimeout(() => {
    const b = $("#cont");
    b && b.focus();
  }, 50);
}
export function xpFly(t) {
  const d = document.createElement("div");
  d.className = "xpfly";
  d.textContent = t;
  const r = $("#pfill").getBoundingClientRect();
  d.style.left = r.right - 20 + "px";
  d.style.top = r.top + 20 + "px";
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}
export const DAY = 864e5;
export function dueReviews(cid, n) {
  return shuffle((S.mist[cid] || []).filter(m => (m.due || 0) <= Date.now()))
    .slice(0, n)
    .map(m => Object.assign({}, m, { _cid: cid, _rev: true }));
}
export function dueCount(cids) {
  return cids.reduce((a, c) => a + (S.mist[c] || []).filter(m => (m.due || 0) <= Date.now()).length, 0);
}
export function anchorOk(e) {
  const c = e._cid || (L && L.cid);
  if (!c || !S.mist[c]) return;
  const k = exKey(e);
  const m = S.mist[c].find(x => exKey(x) === k);
  if (!m) return;
  S.q.m = (S.q.m || 0) + 1; // quête « Corrige 3 erreurs passées »
  m.box = (m.box || 0) + 1;
  if (m.box >= 4) S.mist[c] = S.mist[c].filter(x => x !== m);
  else m.due = Date.now() + [1, 3, 7][m.box - 1] * DAY;
}
export function exAsk(e) {
  return e.t === "tilesRev"
    ? e.tgtText
    : e.t === "spot"
      ? e.parts
        ? e.parts.map(p => p.before + "___" + p.after).join(" / ")
        : e.before + "___" + e.after
      : e.prompt || e.q || e.text || e.audio || (e.pairs ? "association de mots" : "");
}
export function readGiven() {
  const t = $("#tin");
  if (t) return t.value;
  const sp = [...document.querySelectorAll("#lbody .spotw.sel")];
  if (sp.length) return sp[0].dataset.v === "none" ? "(il n'y a pas de faute)" : sp.map(x => x.textContent).join(", ");
  const o = document.querySelector("#lbody .opt.sel span:nth-child(2)");
  if (o) return o.textContent;
  const a = document.querySelector("#ans");
  if (a) return [...a.querySelectorAll(".tile")].map(x => x.textContent).join(" ");
  const h = document.querySelector("#micst");
  if (h) return h.textContent.slice(0, 120);
  return "";
}
/** Correction d'un exercice « trouve l'erreur » (une ou plusieurs phrases), pour le journal des erreurs. */
function spotFix(ex) {
  const bad = (ex.parts || [ex]).filter(p => p.faulty);
  return bad.length ? bad.map(p => p.chunk + " → " + p.right).join(" ; ") : "(pas de faute)";
}
export function logError(ex, given) {
  const c = ex._cid || (L && L.cid);
  if (!c || ex.t === "match" || ex.t === "write") return;
  const a = (S.elog[c] = S.elog[c] || []);
  a.push({
    t: ex.t,
    q: String(exAsk(ex)).slice(0, 160),
    a: String(ex.t === "spot" ? spotFix(ex) : ex.answer || "").slice(0, 120),
    g: String(given || "").slice(0, 120),
    u: (L && L.unitT) || "",
    e: ex.e || "",
    ts: Date.now(),
  });
  if (a.length > 80) a.splice(0, a.length - 80);
}
export const SKILL = {
  mc: "Vocabulaire & sens",
  tiles: "Construction de phrases",
  tilesRev: "Compréhension écrite",
  listenTiles: "Compréhension orale",
  listen: "Compréhension orale",
  type: "Traduction écrite",
  speak: "Prononciation",
  choice: "Grammaire & règles",
  spot: "Repérage de fautes",
  dictee: "Orthographe (dictée)",
  part2: "TOEIC Part 2",
  conv: "TOEIC Parts 3-4",
  read: "TOEIC Part 7",
  photo: "TOEIC Part 1",
  pic: "Vocabulaire en images",
  picw: "Vocabulaire en images",
  hg: "Lecture du hangul",
  build: "Écriture du hangul",
  match: "Vocabulaire & sens",
  write: "Rédaction",
  fill: "Grammaire & règles",
};
export function ruleOf(ex) {
  if ((ex.t === "choice" || ex.t === "spot" || ex.t === "fill") && ex.e)
    return ["r:" + ex.e.slice(0, 90), ex.e.slice(0, 110)];
  // phrase générée d'une notion de grammaire : regroupée sous le titre de sa règle
  if (ex._sub) return ["d:" + ex._sub, drillLabel(ex._sub)];
  if (ex.t === "hg") return ["h:" + ex.q, "Hangul : " + ex.q];
  if (ex.t === "build") return ["h:" + ex.syl, "Syllabe " + ex.syl + " (" + ex.roman + ")"];
  if (ex.t === "pic" || ex.t === "picw") return ["w:" + ex.q, "Mot : " + ex.q];
  if (ex.t === "mc" && ex.w) return ["w:" + ex.answer, "Mot : " + ex.answer + " (" + ex.prompt + ")"];
  if (["type", "tiles", "listen", "listenTiles", "speak"].includes(ex.t) && ex.answer && ex.answer.length < 70)
    return ["s:" + ex.answer, "Phrase : " + ex.answer];
  return null;
}
export function statBucket(c) {
  return (S.st[c] = S.st[c] || { u: {}, sk: {}, r: {} });
}
export function statRule(c, u, key, label, ok) {
  const st = statBucket(c);
  const x = (st.r[key] = st.r[key] || { a: 0, k: 0, l: label, u });
  x.a++;
  if (!ok) {
    x.k++;
    x.ts = Date.now();
  }
  const ks = Object.keys(st.r);
  if (ks.length > 500) {
    ks.sort((p, q) => st.r[p].k * 3 + st.r[p].a - (st.r[q].k * 3 + st.r[q].a))
      .slice(0, ks.length - 450)
      .forEach(k => delete st.r[k]);
  }
}
export function recordStat(ex, ok) {
  const c = ex._cid || (L && L.cid);
  if (!c || ex._bank) return;
  if (ex._sub) drillRecord(ex._sub, ok);
  const st = statBucket(c);
  const u = ex._u != null ? ex._u : L && L.u != null ? L.u : "x";
  const inc = (o, k) => {
    const x = (o[k] = o[k] || [0, 0]);
    x[0]++;
    if (!ok) x[1]++;
  };
  inc(st.u, u);
  inc(st.sk, u + "|" + (SKILL[ex.t] || ex.t));
  const r = ruleOf(ex);
  if (r) statRule(c, u, r[0], r[1], ok);
}
export function exKey(e) {
  return e.t + "|" + (e.answer || "") + "|" + (e.q || e.prompt || "");
}
export function addMistake(e) {
  if (e.t === "match" || e.t === "write" || e._bank) return;
  const c = e._cid || (L && L.cid);
  if (!c) return;
  const arr = (S.mist[c] = S.mist[c] || []);
  const k = exKey(e);
  const ex = arr.find(x => exKey(x) === k);
  if (ex) {
    ex.box = 0;
    ex.due = Date.now() + DAY / 2;
    return;
  }
  const copy = Object.assign({}, e, { box: 0, due: Date.now() + 20 * 60000 });
  delete copy._cid;
  delete copy._rev;
  arr.push(copy);
  if (arr.length > 80) arr.shift();
}
export function removeMistake(e) {
  const c = e._cid;
  if (!c || !S.mist[c]) return;
  const k = exKey(e);
  S.mist[c] = S.mist[c].filter(x => exKey(x) !== k);
}
export function quitAsk() {
  const m = modal(
    `<div class="mcenter">${mascot("sad", "sad")}<h2>Attends, ne pars pas !</h2><p>Si tu quittes maintenant, tu perds l'XP de cette séance.</p><button class="btn" id="qk">Continuer</button><button class="btn ghost" id="qq">Quitter</button></div>`,
  );
  m.querySelector("#qk").onclick = closeModal;
  m.querySelector("#qq").onclick = () => {
    closeModal();
    closeLesson();
  };
}
export function closeLesson(scroll) {
  document.querySelectorAll(".wpop").forEach(x => x.remove());
  wakeOff();
  if (L && L.timer) clearInterval(L.timer);
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  if (L && L.rec)
    try {
      L.rec.abort();
    } catch (e) {}
  L = null;
  $("#lesson").classList.add("hidden");
  $("#lesson").innerHTML = "";
  document.body.classList.remove("noscroll");
  save();
  renderAll();
  if (scroll && VIEW === "parcours") {
    const cur = document.querySelector(".node.cur");
    if (cur) {
      cur.scrollIntoView({ behavior: "smooth", block: "center" });
      cur.classList.add("jump");
    }
  }
}
/** Permet d'envelopper closeLesson (utilisé par ui/back-button.js). */
export function set_closeLesson(v) {
  return (closeLesson = v);
}
export function jumpFail() {
  const u = L.u,
    ext = L.ext;
  closeLesson();
  modal(
    `<div class="mcenter">${mascot("sad", "sad")}<h2>Pas cette fois !</h2><p>${ext ? "3 erreurs : la version extrême t'a eue cette fois. Refais la version de base puis retente ta chance 🔥" : `Trop d'erreurs pour sauter à l'unité ${u + 1}. Continue le parcours normalement, tu y arriveras vite 💪`}</p><button class="btn" onclick="closeModal()">D'accord</button></div>`,
  );
}
export function finish() {
  if (!L) return;
  if (L.mode === "place") return placeStage();
  if (L.timer) clearInterval(L.timer);
  try {
    if (L.rec) L.rec.abort();
  } catch (e) {}
  const secs = Math.round((Date.now() - L.start) / 1000),
    acc = L.correct + L.wrong ? Math.round((L.correct / (L.correct + L.wrong)) * 100) : 100;
  let bonus = 0;
  if (L.mode === "lesson" && L.wrong === 0) {
    bonus = 10;
    S.perfect++;
  }
  if (L.mode === "sprint") {
    L.xp = L.correct * 4;
    S.sprint = Math.max(S.sprint, L.correct);
  }
  bankApply();
  const boost = (S.boostUntil > Date.now() ? 2 : 1) * (L.ext ? 2 : 1);
  let extNew = false;
  if (L.ext && L.mode === "lesson") {
    const idx = L.u * NPU + L.n;
    S.ext[L.cid] = S.ext[L.cid] || [];
    if (!S.ext[L.cid].includes(idx)) {
      S.ext[L.cid].push(idx);
      extNew = true;
      S.gems += 10;
    }
  }
  const gained = (L.xp + bonus) * boost,
    goalBefore = todayXp() >= S.goal,
    lvBefore = level(S.xp);
  S.xp += gained;
  addToday(gained);
  S.lessons++;
  S.q.l++;
  S.q.c = Math.max(S.q.c, L.maxCombo);
  S.bestCombo = Math.max(S.bestCombo, L.maxCombo);
  S.q.s += L.listenOk;
  // v32 : compteurs des quêtes variées
  S.q.ok = (S.q.ok || 0) + L.correct;
  S.q.sec = (S.q.sec || 0) + Math.min(secs, 1800);
  if (L.correct + L.wrong >= 5 && L.wrong === 0) S.q.p = (S.q.p || 0) + 1;
  if (L.correct + L.wrong >= 5 && acc >= 90) S.q.a = (S.q.a || 0) + 1;
  if (L.mode === "story") S.q.st = (S.q.st || 0) + 1;
  if (L.mode === "train") S.q.t = (S.q.t || 0) + 1;
  S.spoke += L.spokeOk;
  let streakUp = false,
    milGems = 0;
  if (S.lastDay !== dkey()) {
    S.streak = S.lastDay === yest() ? S.streak + 1 : 1;
    if (S.streak === 1) streakReset();
    S.lastDay = dkey();
    streakUp = true;
    milGems = streakMilestone();
  }
  if (L.mode === "story" && !S.stories.includes(L.story.id)) S.stories.push(L.story.id);
  if (L.mode === "jump") {
    hgIdx(L.cid).forEach(i => {
      S.dn[L.cid] = S.dn[L.cid] || {};
      S.dn[L.cid][i] = FULL;
    });
    syncProg(L.cid);
  }
  let chest = false;
  if (L.mode === "lesson") {
    const idx = L.u * NPU + L.n;
    const first = !isDone(L.cid, L.u, L.n);
    setDone(L.cid, L.u, L.n);
    S.gems += L.n === NPU - 1 ? 20 : 5;
    chest = L.n === NPU - 1;
  } else {
    S.gems += 3;
  }
  const qWon = checkQuests(true);
  const nb = checkBadges();
  save();
  const scr = [];
  const mode = L.mode;
  // v32 : un seul écran de bilan (résultat, encouragement, récompenses, suite de la journée)
  const title =
    mode === "sprint"
      ? "Temps écoulé !"
      : mode === "story"
        ? "Histoire terminée !"
        : mode === "jump"
          ? "Hangul validé !"
          : mode === "lesson"
            ? chest
              ? "Unité terminée !"
              : "Leçon terminée !"
            : "Entraînement terminé !";
  const cheers =
    L.wrong === 0
      ? ["Sans faute : c'est du solide !", "Aucune erreur. Horang est fier de toi !"]
      : acc >= 85
        ? ["Très belle séance, tu progresses vite !", "Presque parfait : continue comme ça !"]
        : acc >= 60
          ? [
              "Bien joué ! Chaque erreur corrigée te fait avancer.",
              "Tu avances : ce qui a coincé reviendra en révision.",
            ]
          : [
              "Séance difficile, mais terminée : c'est ce qui compte.",
              "Courage ! Ces notions reviendront jusqu'à être acquises.",
            ];
  const notes = [];
  if (L.ext)
    notes.push([
      "flame",
      extNew ? "Version extrême réussie : XP ×2 et une couronne (+10 gemmes)" : "Version extrême réussie : XP ×2",
    ]);
  else if (boost > 1) notes.push(["bolt", "Bonus XP ×2 actif"]);
  if (mode === "sprint") notes.push(["timer", `${L.correct} bonne(s) réponse(s) — record : ${S.sprint}`]);
  else if (bonus) notes.push(["hundred", "Leçon parfaite : +10 XP bonus"]);
  const csec = curSec(),
    due = dueCount(csec.tracks),
    bdue = bankDue(csec.id),
    tx = todayXp(),
    goalNow = tx >= S.goal,
    tq = todayQuests(),
    qDone = tq.filter(q => S.q.claimed.includes(q.id)).length,
    lvNow = level(S.xp);
  const rewards = [];
  if (lvNow > lvBefore)
    rewards.push(
      `<div class="erw lv"><span class="bmed" style="--bc:#FFC83D;--bd:#C98B00">${ic("star", 30, "", 2.6)}<span class="shine"></span></span><b>Niveau ${lvNow}</b><small>Tu montes en puissance.</small></div>`,
    );
  if (!goalBefore && goalNow)
    rewards.push(
      `<div class="erw"><span class="bmed" style="--bc:#7C4DFF;--bd:#5A30D8">${ic("target", 30, "", 2.6)}<span class="shine"></span></span><b>Objectif du jour</b><small>${tx} XP aujourd'hui</small></div>`,
    );
  qWon
    .filter(x => x.month)
    .forEach(x =>
      rewards.push(
        `<div class="erw"><span class="bmed" style="--bc:#7C4DFF;--bd:#5A30D8">${ic("chest", 30, "", 2.4)}<span class="shine"></span></span><b>Quête du mois</b><small>${x.month} points : +${x.g} gemmes</small></div>`,
      ),
    );
  const qGems = qWon.filter(x => !x.month).reduce((a, x) => a + x.g, 0);
  nb.forEach(b => {
    const [k, c, d] = BADGE_MEDAL[b.id] || ["star", "#7C4DFF", "#5A30D8"];
    rewards.push(
      `<div class="erw"><span class="bmed" style="--bc:${c};--bd:${d}">${ic(k, 30, "", 2.6)}<span class="shine"></span></span><b>${b.n}</b><small>${b.d}</small></div>`,
    );
  });
  const revTxt = [
    due ? `<span>${due} erreur${due > 1 ? "s" : ""} à ancrer</span>` : "",
    bdue ? `<span>${bdue} mot${bdue > 1 ? "s" : ""} à revoir</span>` : "",
  ].filter(Boolean);
  const next = `<div class="enext">
  <div class="erow ${goalNow ? "done" : ""}"><span class="eri g">${ic(goalNow ? "check" : "bolt", 22, "", goalNow ? 3.2 : 2.4)}</span><div class="ert"><b>${goalNow ? "Objectif du jour atteint !" : "Objectif du jour"}</b><span class="ebar"><i style="width:${Math.min(100, Math.round((tx / Math.max(1, S.goal)) * 100))}%"></i></span></div><small class="notr">${tx} / ${S.goal} XP</small></div>
  <div class="erow ${qDone >= tq.length ? "done" : ""}"><span class="eri q">${ic("chest", 22, "", 2.4)}</span><div class="ert"><b>Quêtes du jour</b><span class="edots">${tq.map(q => `<i class="${S.q.claimed.includes(q.id) ? "on" : ""}"></i>`).join("")}</span></div>${qGems ? `<span class="egem">+${qGems} ${ic("gem", 16, "", 2.2)}</span>` : ""}<small class="notr">${qDone} / ${tq.length}</small></div>
  <div class="erow ${revTxt.length ? "todo" : "done"}"><span class="eri r">${ic("repeat", 22, "", 2.6)}</span><div class="ert"><b>${revTxt.length ? "À réviser" : "Révisions à jour"}</b><span class="erv">${revTxt.length ? revTxt.join(" · ") : "<span>Rien à revoir pour l'instant.</span>"}</span></div>${revTxt.length ? `<button class="ergo" id="endRev">Réviser</button>` : ""}</div></div>`;
  scr.push({
    html: `<div class="ehero">${mascot("happy", "dance")}</div><h1 class="gold">${title}</h1><p class="echeer">${cheers[(S.lessons + L.correct) % cheers.length]}</p>${notes.map(([k, t]) => `<p class="enote">${ic(k, 18, "", 2.6)}<span>${t}</span></p>`).join("")}
  <div class="ecards"><div class="ecard g"><small>XP gagnés</small><b data-c="${gained}">0</b></div><div class="ecard a"><small>Précision</small><b data-c="${acc}" data-s="%">0</b></div><div class="ecard ${mode === "sprint" ? "c" : "t"}"><small>${mode === "sprint" ? "Score" : "Temps"}</small><b>${mode === "sprint" ? L.correct : Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0")}</b></div></div>
  ${rewards.length ? `<div class="erews"><h3>${rewards.length > 1 ? "Récompenses" : "Récompense"}</h3><div class="erewl">${rewards.join("")}</div></div>` : ""}${next}`,
    cls: "endsum",
    after: () => {
      beep("win");
      confetti(rewards.length ? 160 : 110);
      document.querySelectorAll("[data-c]").forEach(e => countUp(e, +e.dataset.c, 900, e.dataset.s || ""));
      const r = $("#endRev");
      if (r)
        r.onclick = () => {
          closeLesson();
          location.hash = "entrainement";
        };
    },
  });
  if (L.voltMock) {
    const tot = Math.round((L.correct / Math.max(1, L.correct + L.wrong)) * 100) * 10;
    S.voltBest = Math.max(S.voltBest || 0, tot);
    save();
    const lvl =
      tot >= 900
        ? "Expert"
        : tot >= 700
          ? "Affaires"
          : tot >= 500
            ? "Professionnel"
            : tot >= 300
              ? "Technique"
              : "En dessous du niveau Technique";
    scr.push({
      html: `<div class="bigflame">✒️</div><h1 class="pri">Score estimé : <span data-c="${tot}">0</span> / 1000</h1><div class="ecards"><div class="ecard t"><small>Niveau</small><b style="font-size:17px">${lvl}</b></div><div class="ecard a"><small>Bonnes réponses</small><b>${L.correct}/${L.correct + L.wrong}</b></div><div class="ecard g"><small>Record</small><b>${S.voltBest}</b></div></div><p>Paliers du Certificat Voltaire : 300 Technique · 500 Professionnel · 700 Affaires · 900 Expert.<br><small>Estimation indicative sur 30 phrases : le vrai Certificat compte bien plus de questions et son barème n'est pas public.</small></p>`,
      after: () => {
        document.querySelectorAll("[data-c]").forEach(e => countUp(e, +e.dataset.c, 1200));
      },
    });
  }
  if (L.koMock) {
    const tot = Math.round((L.correct / Math.max(1, L.correct + L.wrong)) * 200);
    S.koBest = Math.max(S.koBest || 0, tot);
    save();
    const lvl = tot >= 140 ? "TOPIK I · niveau 2" : tot >= 80 ? "TOPIK I · niveau 1" : "Sous le niveau 1";
    scr.push({
      html: `<div class="bigflame">🇰🇷</div><h1 class="pri">Score estimé : <span data-c="${tot}">0</span> / 200</h1><div class="ecards"><div class="ecard t"><small>Niveau</small><b style="font-size:17px">${lvl}</b></div><div class="ecard a"><small>Bonnes réponses</small><b>${L.correct}/${L.correct + L.wrong}</b></div><div class="ecard g"><small>Record</small><b>${S.koBest}</b></div></div><p>Paliers du TOPIK I : 80 points pour le niveau 1, 140 pour le niveau 2.<br><small>Estimation indicative sur 20 questions : le vrai TOPIK I en compte 70 (30 d'écoute, 40 de lecture).</small></p>`,
      after: () => {
        document.querySelectorAll("[data-c]").forEach(e => countUp(e, +e.dataset.c, 1200));
      },
    });
  }
  if (L.mock) {
    const sc = ([a, b]) => (b ? Math.max(5, Math.round(((a / b) * 495) / 5) * 5) : 5);
    const ls = sc(L.lc),
      rs = sc(L.rc),
      tot = ls + rs;
    S.mockBest = Math.max(S.mockBest || 0, tot);
    save();
    scr.push({
      html: `<div class="bigflame">📝</div><h1 class="pri">Score estimé : <span data-c="${tot}">0</span> / 990</h1><div class="ecards"><div class="ecard t"><small>Listening</small><b>${ls}</b></div><div class="ecard a"><small>Reading</small><b>${rs}</b></div><div class="ecard g"><small>Record</small><b>${S.mockBest}</b></div></div><p>${L.lc[0]}/${L.lc[1]} en écoute · ${L.rc[0]}/${L.rc[1]} en lecture.<br><small>Estimation indicative sur 20 questions : le vrai TOEIC en compte 200.</small></p>`,
      after: () => {
        document.querySelectorAll("[data-c]").forEach(e => countUp(e, +e.dataset.c, 1200));
      },
    });
  }
  if (streakUp) {
    const ds = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      ds.push({
        l: (UI === "en" ? "SMTWTFS" : UI === "ko" ? "일월화수목금토" : "DLMMJVS")[d.getDay()],
        on: i < S.streak,
        now: i === 0,
      });
    }
    scr.push({
      html: `<div class="eflame">${FLAME}<span class="espark s1"></span><span class="espark s2"></span><span class="espark s3"></span></div><div class="bignum" data-c="${S.streak}">0</div><h1 class="org">jour${S.streak > 1 ? "s" : ""} de série !</h1><div class="wdots">${ds.map((d, k) => `<div class="${d.now ? "now" : ""}"><i class="${d.on ? "on" : ""}" style="animation-delay:${(0.25 + k * 0.09).toFixed(2)}s">${d.on ? ic("check", 16, "", 3.6) : ""}</i><span class="notr">${d.l}</span></div>`).join("")}</div><p>${S.streak === 1 ? "C'est le début d'une belle série. Reviens demain pour la prolonger !" : "Ne casse pas la chaîne : reviens demain !"}</p>${milGems ? `<p class="milgem">${ic("gem", 20, "", 2.2)}<b>Palier de ${S.streak} jours atteint : +${milGems} gemmes</b></p>` : ""}<button class="btn ghost eshare" onclick="shareProgress()">${ic("share", 20, "", 2.4)}<span>Partager ma série</span></button>`,
      cls: "endstreak",
      after: () => {
        beep("combo");
        document.querySelectorAll("[data-c]").forEach(e => countUp(e, +e.dataset.c, 700));
      },
    });
  }
  let i = 0;
  const el = $("#lesson");
  const show = () => {
    if (i >= scr.length) return closeLesson(true);
    const s = scr[i++];
    el.innerHTML =
      s.cls === "endsum"
        ? `<div class="endwrap endsum"><div class="endin">${s.html}</div><button class="btn big" id="endc">Continuer</button></div>`
        : `<div class="endwrap ${s.cls || ""}">${s.html}<button class="btn big" id="endc">Continuer</button></div>`;
    s.after && s.after();
    const b = $("#endc");
    b.onclick = show;
    setTimeout(() => b.focus(), 50);
  };
  L.state = "end";
  show();
}
