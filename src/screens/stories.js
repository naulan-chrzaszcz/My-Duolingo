// Écran Histoires
import { flagSvg, ic } from "../ui/icons.ts";
import { LEVELS, SECTIONS, STORIES } from "../content/index.js";
import { S, save, uid } from "../core/accounts.js";
import { $, UCOLORS, esc, shuffle } from "../core/util.js";
import { sayDialog } from "../exercises/render.js";
import { SEC_LANG } from "../features/word-bank.js";
import { NONFR } from "../i18n/locale.js";
import { L, finish, quitAsk, set_L } from "../lesson/engine.js";
import { aiAsk, aiDetect, aiEnrich } from "../services/ai.js";
import { beep, say } from "../services/speech.js";
import { mascot } from "../ui/mascot.js";
import { haptic } from "../ui/platform.js";
import { curSec, renderAll, safeEmoji } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";

// ---------- Histoires ----------
export const STORY_LV = ["Débutant (A1-A2)", "Intermédiaire (B1)", "Avancé (B2)", "Expert (C1)"];
export let STORY_F = "all";
export function allStories(sec) {
  return (STORIES[sec] || [])
    .concat(S.genStories[sec] || [])
    .slice()
    .sort((a, b) => a.lv - b.lv);
}
export function storyOpen(sec, st) {
  if (st.gen || !st.lv) return true;
  const sc = SECTIONS.find(x => x.id === sec);
  if (sc && st.lv <= Math.max(0, ...sc.tracks.map(c => (S.place || {})[c] || 0))) return true;
  const prev = allStories(sec).filter(x => x.lv === st.lv - 1 && !x.gen);
  const d = prev.filter(x => S.stories.includes(x.id)).length;
  return d >= Math.min(2, prev.length) && storyOpen(sec, { lv: st.lv - 1 });
}
export function renderStories(v) {
  const s = curSec();
  const list = allStories(s.id);
  const done = list.filter(x => S.stories.includes(x.id)).length;
  const gen = (S.genStories[s.id] || []).length;
  const F = [
    ["all", "Toutes"],
    [0, LEVELS[0]],
    [1, LEVELS[1]],
    [2, LEVELS[2]],
    [3, LEVELS[3]],
    ["gen", "✨ Mes histoires IA" + (gen ? " (" + gen + ")" : "")],
  ];
  const shown =
    STORY_F === "all"
      ? list
      : STORY_F === "gen"
        ? list.filter(x => x.gen)
        : list.filter(x => x.lv === +STORY_F && !x.gen);
  const card = st => {
    const i = list.indexOf(st),
      dn = S.stories.includes(st.id),
      open = storyOpen(s.id, st);
    return `<button class="story ${open ? "" : "lock"}" data-id="${esc(st.id)}"><div class="scover" style="background:${open ? (st.gen ? "linear-gradient(135deg,#7C4DFF,#FF6FB5)" : UCOLORS[i % 6]) : "var(--lockc,#C9C4DD)"}">${open ? esc(st.ic) : "🔒"}${dn ? '<span class="sdone">✓</span>' : ""}</div><b>${esc(st.t)}</b><small>${st.gen ? "✨ IA · " : ""}${LEVELS[st.lv]}${dn ? " · lue" : ""}</small></button>`;
  };
  const groups = [0, 1, 2, 3]
    .map(lv => {
      const a = shown.filter(x => x.lv === lv && !x.gen);
      if (!a.length) return "";
      const d = a.filter(x => S.stories.includes(x.id)).length;
      const open = storyOpen(s.id, { lv });
      return `<h3 class="slvh">${LEVELS[lv]} <small>${d}/${a.length} lues${open ? "" : ` · 🔒 lis 2 histoires « ${LEVELS[lv - 1]} » pour débloquer`}</small></h3><div class="sgrid2">${a.map(card).join("")}</div>`;
    })
    .join("");
  const gens = shown.filter(x => x.gen);
  v.innerHTML = `<h1 class="sectitle phd"><span>Histoires</span>${flagSvg(s.id, 34, 23, 6)}</h1><p class="secsub">${s.id === "fr" ? "Des textes du quotidien avec des pièges d'orthographe à repérer." : "De courtes scènes à écouter, avec des questions de compréhension."} <b>${list.length} histoires</b> · ${done} lue${done > 1 ? "s" : ""} · +15 XP. 👆 Touche un mot que tu ne comprends pas pour le mettre de côté et le réviser plus tard.</p>
 <div class="tracks sfilt">${F.map(([k, l]) => `<button data-f="${k}" class="${String(STORY_F) === String(k) ? "on" : ""}">${l}</button>`).join("")}</div>
 <button class="btn goldb sgen" id="sgen">✨ Nouvelle histoire inédite (IA)</button>
 ${groups}${gens.length ? `<h3 class="slvh"><span class="slvi">${ic("spark", 20, "", 2.4)}</span><span>Mes histoires IA</span> <small>${gens.length}</small></h3><div class="sgrid2">${gens.map(card).join("")}</div>` : STORY_F === "gen" ? '<div class="empty">Aucune histoire IA pour l\'instant : crée la première avec le bouton ci-dessus !</div>' : ""}`;
  v.querySelectorAll("[data-f]").forEach(
    b =>
      (b.onclick = () => {
        STORY_F = b.dataset.f;
        renderStories(v);
      }),
  );
  $("#sgen").onclick = () => storyGenPicker(s.id);
  v.querySelectorAll(".story").forEach(
    b =>
      (b.onclick = () => {
        const st = list.find(x => x.id === b.dataset.id);
        if (!st) return;
        if (b.classList.contains("lock")) {
          toast(`🔒 Lis 2 histoires « ${LEVELS[st.lv - 1]} » pour débloquer le niveau ${LEVELS[st.lv]}`);
          return;
        }
        playStory(s.id, st);
      }),
  );
}
export function storyPrompt(r) {
  const L0 = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" }[r.lang];
  const fr = r.lang === "fr-FR" && !r.fle;
  return (
    "Tu écris une courte histoire dialoguée pour une application d'apprentissage façon Duolingo. L'élève est francophone." +
    (fr
      ? " Il prépare le Certificat Voltaire : l'histoire est en français et sert à repérer des pièges d'orthographe et de grammaire."
      : " Il apprend le " + L0 + ".") +
    "\nNiveau : " +
    r.level +
    "." +
    (r.theme
      ? " Thème : « " + r.theme + " »."
      : " Choisis une situation originale de la vie quotidienne ou professionnelle.") +
    "\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n" +
    '{"t":"titre court en français","ic":"un emoji","cast":{"Prénom":["M ou W","emoji du personnage"]},"items":[{"s":"Prénom","t":"réplique' +
    (fr ? "" : " en " + L0) +
    '","fr":"' +
    (fr ? "" : "traduction française") +
    '"},{"q":"question","o":["bonne réponse","réponse fausse","réponse fausse"],"a":0}]}' +
    '\nRègles : 2 ou 3 personnages (M = homme, W = femme) ; 8 à 12 répliques naturelles et 100 % correctes, adaptées au niveau ; 3 questions intercalées dans l\'histoire, juste après les répliques concernées, avec une seule bonne réponse, toujours en première position dans "o" ("a":0). ' +
    (fr
      ? 'Les répliques sont en français, "fr" est une chaîne vide, et chaque question porte sur un piège d\'orthographe ou de grammaire de la réplique qui précède.'
      : r.lang === "ko-KR"
        ? 'Les questions sont en français et vérifient la compréhension ; ajoute la traduction française de chaque réplique dans "fr".'
        : 'Les questions sont en anglais et vérifient la compréhension ; ajoute la traduction française de chaque réplique dans "fr".')
  );
}
export function validateStory(raw, sec, lv) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items)) return null;
  const str = (x, n) => typeof x === "string" && x.trim().length > 0 && x.length < (n || 400);
  const cast = {};
  Object.entries(raw.cast && typeof raw.cast === "object" ? raw.cast : {})
    .slice(0, 4)
    .forEach(([n, v]) => {
      if (str(n, 30) && Array.isArray(v))
        cast[n.trim()] = [v[0] === "M" ? "M" : "W", str(v[1], 16) ? v[1].trim() : v[0] === "M" ? "🧑" : "👩"];
    });
  const items = [];
  raw.items.slice(0, 26).forEach(it => {
    if (!it || typeof it !== "object") return;
    if (it.q !== undefined) {
      if (
        str(it.q) &&
        Array.isArray(it.o) &&
        it.o.length >= 2 &&
        it.o.length <= 4 &&
        it.o.every(x => str(x, 200)) &&
        Number.isInteger(it.a) &&
        it.a >= 0 &&
        it.a < it.o.length &&
        new Set(it.o.map(x => x.trim())).size === it.o.length
      )
        items.push({ q: it.q.trim(), o: it.o.map(x => x.trim()), a: it.a });
    } else if (str(it.s, 30) && str(it.t)) {
      const n = it.s.trim();
      if (!cast[n]) cast[n] = ["W", "🙂"];
      items.push({ s: n, t: it.t.trim(), fr: sec === "fr" && !NONFR ? "" : str(it.fr) ? it.fr.trim() : "" });
    }
  });
  while (items.length && items[0].q) items.shift();
  if (items.filter(i => i.s).length < 4 || !items.some(i => i.q)) return null;
  return {
    id: "g" + uid(),
    t: str(raw.t, 80) ? raw.t.trim() : "Histoire inédite",
    ic: str(raw.ic, 16) ? raw.ic.trim() : "✨",
    lv,
    cast,
    items,
    gen: 1,
  };
}
export async function storyGenPicker(sec) {
  const mode = await aiDetect();
  if (mode === "local") {
    modal(
      `<div class="mcenter">${mascot("calm")}<h2>Connecte ton Claude</h2><p>Les histoires inédites sont écrites par l'IA. Ajoute ta clé API Claude dans Paramètres › Mon Claude. En attendant, ${allStories(sec).length} histoires t'attendent déjà !</p><button class="btn" onclick="closeModal();location.hash='reglages/claude'">Ouvrir Mon Claude</button><button class="btn ghost" onclick="closeModal()">Plus tard</button></div>`,
    );
    return;
  }
  const lvDef = Math.min(
    3,
    Math.max(
      0,
      ...allStories(sec)
        .filter(x => S.stories.includes(x.id))
        .map(x => x.lv),
      0,
    ),
  );
  const m =
    modal(`<h2 class="hi">${ic("spark", 22, "", 2.4)}Nouvelle histoire</h2><p>Horang écrit une histoire inédite, avec ses questions, à ton niveau.</p><label class="flabel">Niveau</label><div class="chips pick" id="slv">${STORY_LV.map((l, i) => `<button data-lv="${i}" class="${i === lvDef ? "on" : ""}">${l}</button>`).join("")}</div>
  <label class="flabel">Thème (facultatif)</label><input class="finput" id="sth" maxlength="80" placeholder="${sec === "ko" ? "Ex. : au café à Séoul, un rendez-vous K-pop…" : sec === "fr" ? "Ex. : un mail à un client, une réunion…" : "Ex. : a job interview, a lost suitcase, a code review…"}">
  <button class="btn" id="sgo">Écrire mon histoire</button><button class="btn ghost" onclick="closeModal()">Annuler</button>`);
  let lv = lvDef;
  m.querySelectorAll("[data-lv]").forEach(
    b =>
      (b.onclick = () => {
        lv = +b.dataset.lv;
        m.querySelectorAll("[data-lv]").forEach(x => x.classList.toggle("on", x === b));
      }),
  );
  m.querySelector("#sgo").onclick = async () => {
    const theme = m.querySelector("#sth").value.trim().slice(0, 80);
    modal(
      `<div class="mcenter">${mascot("wow", "dance")}<h2>Horang écrit ton histoire…</h2><p>${STORY_LV[lv]}${theme ? " · " + esc(theme) : ""}</p><div class="aiload"><i></i><i></i><i></i></div></div>`,
      "",
      true,
    );
    const req = { mode: "story", lang: SEC_LANG[sec], level: STORY_LV[lv], theme };
    if (NONFR && sec === "fr") req.fle = 1;
    const raw = await aiAsk(storyPrompt(req), req, { tier: "default", ms: 90000 });
    const st = validateStory(raw, sec, lv);
    closeModal();
    if (!st) {
      toast("L'histoire n'a pas pu être écrite, réessaie dans un instant.");
      return;
    }
    S.genStories[sec] = S.genStories[sec] || [];
    S.genStories[sec].push(st);
    if (S.genStories[sec].length > 60) S.genStories[sec] = S.genStories[sec].slice(-60);
    save();
    STORY_F = "all";
    renderAll();
    playStory(sec, st);
  };
}
// Mot touché dans une histoire → « Mes mots à retenir » (révisions espacées), traduit en arrière-plan par l'IA
export function storyAddWord(sec, w, lang, ex, exTr, tr) {
  const list = (S.bank[sec] = S.bank[sec] || []);
  if (list.some(x => x.w.toLowerCase() === w.toLowerCase())) return null;
  const item = {
    id: uid(),
    w,
    tr: tr || "",
    ex: ex && ex !== w ? ex : "",
    exTr: ex && ex !== w ? exTr || "" : "",
    rom: "",
    added: Date.now(),
    box: 0,
    due: Date.now(),
    src: "story",
    pending: !tr,
  };
  list.push(item);
  save();
  if (L && L.mode === "story") L.saved = (L.saved || 0) + 1;
  if (!tr) {
    aiEnrich(lang, [w])
      .then(r => {
        delete item.pending;
        if (r && r[0]) {
          const x = r[0];
          if (x[1]) item.tr = x[1];
          if (!item.ex && x[2]) item.ex = x[2];
          if (!item.exTr && x[3]) item.exTr = x[3];
          if (typeof x[4] === "string" && x[4]) item.rom = x[4];
          if (x.traps && x.traps.length) item.traps = x.traps;
          if (sec === "fr" && x[3] && !item.exTr) item.exTr = x[3];
        }
        save();
        const o = document.querySelector(".wpop .wtr");
        if (o && o.dataset.id === item.id) o.textContent = item.tr || "";
      })
      .catch(() => {
        delete item.pending;
        save();
      });
  }
  return item;
}
export function wordPop(sp, it, lang, sec) {
  document.querySelectorAll(".wpop").forEach(x => x.remove());
  const w = sp.textContent.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!w) return;
  haptic(1);
  const has = x => (S.bank[sec] || []).find(y => y.w.toLowerCase() === x.toLowerCase());
  const hw = has(w),
    hl = has(it.t);
  const p = document.createElement("div");
  p.className = "wpop";
  p.innerHTML = `<div class="wph"><b lang="${lang}">${esc(w)}</b><button class="spk" data-a="n" aria-label="Écouter">🔊</button><button class="spk" data-a="s" style="background:#8FB9FF" aria-label="Lentement">🐢</button></div><div class="wtr" data-id="${hw ? hw.id : ""}">${hw && hw.tr ? esc(hw.tr) : ""}</div>
  <button class="btn okb" data-a="add" ${hw ? "disabled" : ""}>${hw ? "✓ Déjà dans mes mots" : "📌 À réviser plus tard"}</button>${it.t.trim() !== w ? `<button class="btn ghost" data-a="line" ${hl ? "disabled" : ""}>${hl ? "✓ Phrase enregistrée" : "📌 Toute la phrase"}</button>` : ""}`;
  document.body.appendChild(p);
  const r = sp.getBoundingClientRect(),
    pw = p.offsetWidth,
    ph = p.offsetHeight;
  p.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + "px";
  p.style.top = (r.bottom + ph + 12 < innerHeight ? r.bottom + 8 : Math.max(8, r.top - ph - 8)) + "px";
  const close = e => {
    if (e && p.contains(e.target)) return;
    p.remove();
    document.removeEventListener("pointerdown", close, true);
  };
  setTimeout(() => document.addEventListener("pointerdown", close, true), 0);
  const sw = $("#swrap");
  if (sw) {
    const y0 = sw.scrollTop;
    const onS = () => {
      if (!document.body.contains(p)) {
        sw.removeEventListener("scroll", onS);
        return;
      }
      if (Math.abs(sw.scrollTop - y0) > 80) {
        sw.removeEventListener("scroll", onS);
        close();
      }
    };
    sw.addEventListener("scroll", onS);
  }
  p.querySelectorAll("[data-a]").forEach(
    b =>
      (b.onclick = () => {
        const a = b.dataset.a;
        if (a === "n") say(w, lang);
        if (a === "s") say(w, lang, { slow: true });
        if (a === "add") {
          const item = storyAddWord(sec, w, lang, it.t, it.fr);
          if (item) {
            b.disabled = true;
            b.textContent = "✓ Ajouté à mes mots";
            beep("ok");
            p.querySelector(".wtr").dataset.id = item.id;
            p.querySelector(".wtr").textContent = item.pending ? "⏳ traduction…" : "";
            document.querySelectorAll("#slines .sw").forEach(x => {
              if (x.textContent.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase() === w.toLowerCase())
                x.classList.add("saved");
            });
          }
        }
        if (a === "line") {
          const item = storyAddWord(sec, it.t.trim(), lang, "", "", it.fr || (sec === "fr" ? "Phrase à retenir" : ""));
          if (item) {
            b.disabled = true;
            b.textContent = "✓ Phrase enregistrée";
            beep("ok");
          }
        }
      }),
  );
}
export function swHtml(t, sec) {
  const bank = new Set((S.bank[sec] || []).map(x => x.w.toLowerCase()));
  return t
    .split(/(\s+)/)
    .map(x =>
      /^\s+$/.test(x) || !x
        ? x
        : `<span class="sw ${bank.has(x.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase()) ? "saved" : ""}">${esc(x)}</span>`,
    )
    .join("");
}
export function playStory(sec, st) {
  const lang = sec === "en" ? "en-US" : sec === "fr" ? "fr-FR" : "ko-KR";
  set_L({
    mode: "story",
    story: st,
    lang,
    correct: 0,
    wrong: 0,
    xp: 0,
    start: Date.now(),
    combo: 0,
    maxCombo: 0,
    listenOk: 0,
    spokeOk: 0,
    state: "story",
    q: [],
    done: 0,
    total: st.items.length,
    retries: new Map(),
  });
  const el = $("#lesson");
  el.classList.remove("hidden");
  document.body.classList.add("noscroll");
  el.innerHTML = `<div class="lwrap" id="swrap"><div class="lhead"><button class="iconbtn" id="lx" aria-label="Quitter">✕</button><div class="pbar"><i id="pfill" style="width:0%"></i><span id="pcombo"></span></div><div class="lstat">📖</div></div><div class="lbody"><div class="stitle"><div class="scover" style="background:var(--pri)">${esc(st.ic)}</div><div><h2>${esc(st.t)}</h2><small class="stip">👆 Touche un mot inconnu pour le réviser plus tard</small></div></div><div id="slines"></div></div></div><div class="lfoot" id="lfoot"><div class="fin" style="justify-content:flex-end"><button class="btn" id="snext">Commencer</button></div></div>`;
  $("#lx").onclick = quitAsk;
  let i = 0;
  const box = $("#slines"),
    nb = $("#snext");
  const speakLine = it => {
    const c = st.cast[it.s] || ["W"];
    sayDialog([[c[0], it.t]], lang);
  };
  const step = () => {
    if (!L) return;
    document.querySelectorAll(".wpop").forEach(x => x.remove());
    if (i >= st.items.length) {
      L.xp = 60 + (L.wrong ? 0 : 20); // v32 : 60 à 80 XP
      L.done = L.total;
      if (L.saved)
        toast(`📌 ${L.saved} mot${L.saved > 1 ? "s" : ""} ajouté${L.saved > 1 ? "s" : ""} à « Mes mots à retenir »`);
      return finish();
    }
    const it = st.items[i++];
    L.done = i;
    $("#pfill").style.width = (i / st.items.length) * 100 + "%";
    nb.textContent = i >= st.items.length && !it.q ? "Terminer" : "Continuer";
    if (it.q) {
      nb.disabled = true;
      const d = document.createElement("div");
      d.className = "sq";
      d.innerHTML = `<div class="sqq">❓ ${esc(it.q)}</div><div class="opts">${shuffle(it.o.map((o, k) => [o, k]))
        .map(
          ([o, k], j) =>
            `<button class="opt" data-k="${k}"><span class="k">${j + 1}</span><span>${esc(o)}</span></button>`,
        )
        .join("")}</div>`;
      box.appendChild(d);
      let first = true;
      d.querySelectorAll(".opt").forEach(
        o =>
          (o.onclick = () => {
            if (!nb.disabled) return;
            const k = +o.dataset.k;
            if (k === it.a) {
              o.classList.add("right");
              beep("ok");
              if (first) {
                L.correct++;
                L.combo++;
                L.maxCombo = Math.max(L.maxCombo, L.combo);
              }
              d.querySelectorAll(".opt").forEach(x => (x.disabled = true));
              nb.disabled = false;
              L.listenOk++;
              if (sec === "en") say(it.o[it.a], lang);
              nb.focus();
            } else {
              o.classList.add("wrong");
              o.disabled = true;
              beep("bad");
              if (first) {
                L.wrong++;
                L.combo = 0;
              }
              d.classList.add("shake");
              setTimeout(() => d.classList.remove("shake"), 400);
            }
            first = false;
          }),
      );
    } else {
      const c = st.cast[it.s] || ["W", "🙂"];
      const d = document.createElement("div");
      d.className = "sline";
      d.innerHTML = `<span class="savatar">${safeEmoji(c[1])}</span><div><small>${esc(it.s)}</small><div class="stxt"><button class="spk" aria-label="Écouter">🔊</button><span class="sltxt" lang="${lang}">${swHtml(it.t, sec)}</span>${it.fr ? '<button class="frb" aria-label="Traduction">FR</button>' : ""}</div>${it.fr ? `<div class="sfr">${esc(it.fr)}</div>` : ""}</div>`;
      box.appendChild(d);
      d.querySelector(".spk").onclick = e => {
        e.stopPropagation();
        speakLine(it);
      };
      const fb = d.querySelector(".frb");
      if (fb)
        fb.onclick = () => {
          d.classList.toggle("show");
          fb.classList.toggle("on");
        };
      d.querySelectorAll(".sw").forEach(
        x =>
          (x.onclick = e => {
            e.stopPropagation();
            wordPop(x, it, lang, sec);
          }),
      );
      speakLine(it);
    }
    const w = $("#swrap");
    setTimeout(() => w.scrollTo({ top: w.scrollHeight, behavior: "smooth" }), 30);
  };
  nb.onclick = step;
}
/** Permet d'envelopper playStory (utilisé par ui/back-button.js). */
export function set_playStory(v) {
  return (playStory = v);
}
