// Mots à retenir (répétition espacée)
import { COURSES, SECTIONS } from "../content/index.js";
import { S, save, uid } from "../core/accounts.js";
import { $, esc, shuffle } from "../core/util.js";
import { simScore, tooClose } from "../exercises/distractors.js";
import { distract } from "../exercises/generate.js";
import { LANG_FR, scoreSpeech } from "../exercises/render.js";
import { norm, words } from "../exercises/validate.js";
import { NONFR } from "../i18n/locale.js";
import { L, openSession } from "../lesson/engine.js";
import { AI, aiEnrich } from "../services/ai.js";
import { SR, beep, micBroken, say } from "../services/speech.js";
import { curSec } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";

// ---------- Mes mots à retenir (révisions espacées) ----------
export const SEC_LANG = { en: "en-US", fr: "fr-FR", ko: "ko-KR" };
export const BANK_STEPS = [1, 3, 7, 14, 30];
export function bankDue(sec) {
  return (S.bank[sec] || []).filter(w => (w.due || 0) <= Date.now()).length;
}
export function bankView() {
  const s = curSec(),
    lang = SEC_LANG[s.id];
  const list = (S.bank[s.id] = S.bank[s.id] || []);
  const now = Date.now();
  const st = w =>
    (w.due || 0) <= now
      ? '<span class="due">à revoir</span>'
      : `<span class="later">dans ${Math.max(1, Math.round((w.due - now) / 864e5))} j</span>`;
  const m =
    modal(`<h2>📌 Mes mots à retenir ${s.flag}</h2><p>Ajoute un mot ou une expression vu aujourd'hui. Tu t'entraînes dessus tout de suite, puis il revient après 1, 3, 7, 14 et 30 jours tant que tu ne le maîtrises pas.</p>
  <div class="bankadd"><input class="finput" id="bw" maxlength="60" placeholder="${s.id === "ko" ? "Ex. : 감사합니다" : s.id === "fr" ? "Ex. : quoique" : "Ex. : to look forward to"}" lang="${lang}"><input class="finput" id="bt" maxlength="80" placeholder="${s.id === "fr" ? "Définition (facultatif)" : "Traduction (facultatif)"}"><button class="btn" id="badd">Ajouter</button></div>
  <p class="micnote" style="text-align:left;margin:6px 0 0">${AI.mode === "local" ? "Sans IA configurée, pense à écrire la traduction." : "Laisse la traduction vide : l'IA la complète avec un exemple."}</p>
  <div class="vlist" id="blist">${
    list.length
      ? list
          .slice()
          .reverse()
          .map(
            w =>
              `<div class="vitem bitem" data-id="${w.id}"><button class="spk" data-a="n" aria-label="Écouter">🔊</button><button class="spk" data-a="s" style="background:#8FB9FF" aria-label="Lentement">🐢</button><button class="spk" data-a="m" style="background:var(--ok)" aria-label="Prononcer">🎙️</button><div class="tg">${esc(w.w)}${w.rom ? `<div class="rom">${esc(w.rom)}</div>` : ""}<div class="fr">${w.tr ? esc(w.tr) : w.pending ? "⏳ traduction en cours…" : "(sans traduction)"}${w.ex ? `<br><i>${esc(w.ex)}</i>${w.exTr ? ` — ${esc(w.exTr)}` : ""}` : ""}</div><div class="micres"></div></div>${st(w)}<button class="iconbtn" data-a="x" aria-label="Supprimer">🗑️</button></div>`,
          )
          .join("")
      : '<div class="empty">Aucun mot pour l\'instant.</div>'
  }</div>
  <button class="btn goldb" id="btrain" ${list.length ? "" : "disabled"}>S'entraîner · ${bankDue(s.id) || list.length} mot(s)</button><button class="btn ghost" onclick="closeModal()">Fermer</button>`);
  const add = async () => {
    const w = m.querySelector("#bw").value.trim(),
      tr = m.querySelector("#bt").value.trim();
    if (!w) return;
    const item = { id: uid(), w, tr, ex: "", exTr: "", rom: "", added: Date.now(), box: 0, due: Date.now() };
    list.push(item);
    save();
    bankView();
    toast("📌 Mot ajouté : à toi de jouer !");
    if (!tr || !item.ex) {
      item.pending = !tr;
      const r = await aiEnrich(lang, [w]).catch(() => null);
      delete item.pending;
      if (r && r[0]) {
        const x = r[0];
        if (x[0]) item.w = x[0];
        if (!item.tr && x[1]) item.tr = x[1];
        item.ex = x[2] || "";
        item.exTr = x[3] || "";
        item.rom = x[4] || "";
      }
      save();
      if (!$("#modal").classList.contains("hidden") && $("#blist")) bankView();
    }
  };
  m.querySelector("#badd").onclick = add;
  m.querySelector("#bt").onkeydown = e => {
    if (e.key === "Enter") add();
  };
  m.querySelector("#bw").onkeydown = e => {
    if (e.key === "Enter") m.querySelector("#bt").focus();
  };
  m.querySelectorAll(".bitem").forEach(row => {
    const w = list.find(x => x.id === row.dataset.id);
    row.querySelectorAll("[data-a]").forEach(
      b =>
        (b.onclick = () => {
          const a = b.dataset.a;
          if (a === "n") say(w.w, lang);
          if (a === "s") say(w.w, lang, { slow: true });
          if (a === "m") micCheck(w.w, lang, row.querySelector(".micres"), b);
          if (a === "x") {
            S.bank[s.id] = list.filter(x => x !== w);
            save();
            bankView();
          }
        }),
    );
  });
  m.querySelector("#btrain").onclick = () => {
    closeModal();
    bankSession(s.id);
  };
}
export function micCheck(text, lang, out, btn) {
  if (!SR) {
    out.innerHTML = `<div class="dict"><input class="finput" lang="${lang}" placeholder="🎤 Dicte le mot avec le clavier ${LANG_FR[lang] || ""}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><button class="btn">OK</button></div>`;
    const inp = out.querySelector("input"),
      ok = out.querySelector("button");
    inp.focus();
    const go = () => {
      const r = scoreSpeech(text, inp.value, lang);
      const pc = Math.round(r.score * 100);
      out.innerHTML = `${pc >= 75 ? "✅" : "🔁"} ${pc} % · entendu : « ${esc(inp.value)} »`;
      beep(pc >= 75 ? "ok" : "bad");
    };
    ok.onclick = go;
    inp.onkeydown = e => {
      if (e.key === "Enter") go();
    };
    return;
  }
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  out.textContent = "🔴 Parle…";
  btn.classList.add("live");
  rec.onresult = e => {
    alive = true;
    let best = { score: 0 },
      heard = "";
    for (let k = 0; k < e.results[0].length; k++) {
      const t = e.results[0][k].transcript;
      const r = scoreSpeech(text, t, lang);
      if (r.score >= best.score) {
        best = r;
        heard = t;
      }
    }
    const pc = Math.round(best.score * 100);
    out.innerHTML = `${pc >= 75 ? "✅" : "🔁"} ${pc} % · entendu : « ${esc(heard)} »`;
    beep(pc >= 75 ? "ok" : "bad");
  };
  let alive = false,
    done = false;
  rec.onstart = rec.onaudiostart = () => {
    alive = true;
  };
  rec.onspeechstart = () => {
    alive = true;
  };
  const dog = setTimeout(() => {
    if (!alive && !done) {
      try {
        rec.abort();
      } catch (e) {}
      micBroken();
      done = true;
      btn.classList.remove("live");
      micCheck(text, lang, out, btn);
    }
  }, 5000);
  rec.onerror = e => {
    out.textContent =
      e.error === "not-allowed" ? "Micro bloqué : autorise-le dans le navigateur." : "Je n'ai rien entendu, réessaie.";
  };
  rec.onend = () => {
    clearTimeout(dog);
    if (!done) btn.classList.remove("live");
  };
  try {
    rec.start();
  } catch (e) {
    clearTimeout(dog);
    micBroken();
    micCheck(text, lang, out, btn);
  }
}
export function bankSession(sec) {
  const lang = SEC_LANG[sec];
  const all = S.bank[sec] || [];
  if (!all.length) return;
  const due = all.filter(w => (w.due || 0) <= Date.now());
  const pick = shuffle(due.length ? due : all).slice(0, 8);
  const pool = all
    .map(w => w.w)
    .concat(COURSES[SECTIONS.find(x => x.id === sec).tracks[0]].units.flatMap(u => (u.v || []).map(v => v[1])));
  const p1 = [],
    p2 = [],
    p3 = [];
  pick.forEach(w => {
    const b = { lang, _bank: w.id, rom: w.rom || "" };
    const same = !w.tr || norm(w.tr, lang) === norm(w.w, lang);
    if (!same) {
      const lw = w.w.trim().toLowerCase();
      const cands = [...new Set(pool.filter(x => x && x.trim().toLowerCase() !== lw && !tooClose(x, w.w)))]
        .map(x => [simScore(w.w, x) + Math.random() * 2.5, x])
        .sort((p, q) => q[0] - p[0])
        .slice(0, 3)
        .map(x => x[1]);
      p1.push({ ...b, t: "mc", w: true, prompt: w.tr, answer: w.w, options: shuffle([w.w, ...cands]) });
    }
    p1.push(
      sec === "fr"
        ? { ...b, t: "dictee", audio: w.w, answer: w.w, alts: [w.w] }
        : { ...b, t: "listen", audio: w.w, answer: w.w, alts: [w.w] },
    );
    p2.push({ ...b, t: "speak", text: w.w, prompt: same ? "" : w.tr });
    if (w.ex) {
      const ws = words(w.ex);
      p2.push({
        ...b,
        t: "listenTiles",
        audio: w.ex,
        answer: w.ex,
        alts: [w.ex],
        tiles: shuffle([...ws, ...distract(pool.flatMap(words), ws, 2)]),
      });
      if (sec !== "fr" || NONFR) p3.push({ ...b, t: "speak", text: w.ex, prompt: w.exTr || "" });
    }
    if (!same) p3.push({ ...b, t: "type", prompt: w.tr, answer: w.w, alts: [w.w] });
  });
  openSession({
    mode: "train",
    cid: SECTIONS.find(x => x.id === sec).tracks[0],
    exs: [...shuffle(p1), ...shuffle(p2), ...shuffle(p3)],
    bankSec: sec,
    bankRes: {},
  });
}
export function bankApply() {
  if (!L || !L.bankSec) return;
  const list = S.bank[L.bankSec] || [];
  Object.entries(L.bankRes).forEach(([id, ok]) => {
    const w = list.find(x => x.id === id);
    if (!w) return;
    if (ok) {
      w.box = Math.min((w.box || 0) + 1, BANK_STEPS.length);
      w.due = Date.now() + BANK_STEPS[w.box - 1] * 864e5;
    } else {
      w.box = 0;
      w.due = Date.now() + 3 * 3600e3;
    }
  });
}
