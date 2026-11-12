// Affichage de chaque type d'exercice : R[type](ex, conteneur)
import { COURSES, PH_IMG } from "../content/index.js";
import { S } from "../core/accounts.js";
import { PRAISE, SECTION_NAMES, esc, rnd, shuffle } from "../core/util.js";
import { hgCompose } from "./hangul.js";
import { checkText, diffHtml, lcsMark, norm } from "./validate.js";
import { L, check, recordStat, result, setReady, statRule } from "../lesson/engine.js";
import { aiWrite, wc } from "../lesson/writing.js";
import {
  SR,
  VOICES,
  beep,
  cleanSpeak,
  loadVoices,
  micBroken,
  rankVoices,
  say,
  ttsCheck,
  ttsGo,
} from "../services/speech.js";
import { mascot } from "../ui/mascot.js";
import { ANDROID, IOS, STANDALONE } from "../ui/platform.js";

// ===================== TYPES D'EXERCICES =====================
export const R = {};
export const bubble = (html, mood = "happy") =>
  `<div class="prompt">${mascot(mood)}<div class="bubble">${html}</div></div>`;
export function wireSay(root, text, lang) {
  root.querySelectorAll("[data-say]").forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        say(text, lang, { slow: b.dataset.say === "s" });
      }),
  );
}
export const audioBig = () =>
  `<div class="bigaudio"><button class="abtn" data-say="n" aria-label="Écouter">🔊</button><button class="abtn slow" data-say="s" aria-label="Écouter lentement">🐢</button></div>`;
export function markOpts(b, right, sel) {
  b.querySelectorAll(".opt").forEach((o, i) => {
    o.disabled = true;
    if (i === right) o.classList.add("right");
    else if (i === sel) o.classList.add("wrong");
  });
}
R.mc = (ex, b) => {
  b.innerHTML = `<h2 class="ltitle">${ex.w ? "Comment dit-on ce mot ?" : "Choisis la bonne traduction"}</h2>${bubble(`« ${esc(ex.prompt)} »`)}<div class="opts">${ex.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
  let sel = -1;
  const os = b.querySelectorAll(".opt");
  os.forEach(
    o =>
      (o.onclick = () => {
        if (L.state !== "answer") return;
        sel = +o.dataset.i;
        os.forEach(x => x.classList.toggle("sel", x === o));
        beep("tap");
        say(ex.options[sel], ex.lang);
        setReady(true);
      }),
  );
  return {
    key: i => os[i] && os[i].click(),
    grade: give => {
      const ok = !give && ex.options[sel] === ex.answer;
      markOpts(b, ex.options.indexOf(ex.answer), sel);
      return { ok, sol: ex.answer, rom: ex.rom, speak: ex.answer, lang: ex.lang };
    },
  };
};
R.tiles = (ex, b) => {
  const rev = ex.t === "tilesRev",
    lis = ex.t === "listenTiles";
  b.innerHTML = `<h2 class="ltitle">${lis ? "Écris ce que tu entends" : "Traduis cette phrase"}</h2>${lis ? audioBig() : bubble(rev ? `<button class="spk" data-say="n" aria-label="Écouter">🔊</button>${esc(ex.tgtText)}` : esc(ex.prompt))}<div class="answer" id="ans"></div><div class="bank" id="bank">${ex.tiles.map((w, i) => `<button class="tile" data-i="${i}">${esc(w)}</button>`).join("")}</div>`;
  const audioText = rev ? ex.tgtText : ex.audio;
  wireSay(b, audioText, ex.lang);
  if (lis || rev) say(audioText, ex.lang);
  const sel = [],
    ans = b.querySelector("#ans"),
    bank = b.querySelector("#bank");
  const draw = () => {
    ans.innerHTML = sel.map((i, k) => `<button class="tile" data-k="${k}">${esc(ex.tiles[i])}</button>`).join("");
    bank.querySelectorAll(".tile").forEach(t => t.classList.toggle("used", sel.includes(+t.dataset.i)));
    ans.querySelectorAll(".tile").forEach(
      t =>
        (t.onclick = () => {
          if (L.state !== "answer") return;
          sel.splice(+t.dataset.k, 1);
          beep("tap");
          draw();
        }),
    );
    setReady(sel.length > 0);
  };
  bank.querySelectorAll(".tile").forEach(
    t =>
      (t.onclick = () => {
        if (L.state !== "answer") return;
        const i = +t.dataset.i;
        if (sel.includes(i)) return;
        sel.push(i);
        beep("tap");
        if (!rev) say(ex.tiles[i], ex.ansLang || ex.lang);
        draw();
      }),
  );
  return {
    grade: give => {
      const built = sel.map(i => ex.tiles[i]).join(" ");
      const al = ex.ansLang || ex.lang;
      const ok = !give && [ex.answer, ...(ex.alts || [])].some(a => norm(a, al) === norm(built, al));
      return {
        ok,
        sol: ex.answer,
        rom: rev ? "" : ex.rom,
        speak: rev ? ex.tgtText : ex.answer,
        lang: ex.lang,
        solHtml: rev ? `${esc(ex.answer)}<div class="rom">🔊 ${esc(ex.tgtText)}</div>` : "",
      };
    },
  };
};
R.tilesRev = R.tiles;
R.listenTiles = R.tiles;
export const FR_CHARS = ["é", "è", "ê", "à", "â", "ç", "ù", "û", "î", "ï", "ô", "œ", "ë", "É"];
R.type = (ex, b) => {
  const lis = ex.t !== "type";
  const ko = ex.lang.startsWith("ko");
  b.innerHTML = `<h2 class="ltitle">${ex.t === "dictee" ? "Dictée : écris la phrase sans aucune faute" : ex.t === "listen" ? "Écris ce que tu entends" : "Traduis cette phrase"}</h2>${lis ? audioBig() : bubble(esc(ex.prompt))}<textarea class="tin" id="tin" enterkeyhint="done" lang="${ex.lang}" placeholder="${ko ? "한국어로 입력하세요" : ex.lang.startsWith("fr") ? "Écris en français…" : "Type in English…"}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>${ex.lang.startsWith("fr") ? `<div class="charbar">${FR_CHARS.map(c => `<button data-ch="${c}">${c}</button>`).join("")}</div>` : ""}`;
  const audioText = ex.audio;
  if (lis) {
    wireSay(b, audioText, ex.lang);
    say(audioText, ex.lang);
  }
  const tin = b.querySelector("#tin");
  tin.oninput = () => setReady(tin.value.trim().length > 0);
  tin.onkeydown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (L.state === "answer") check();
    }
  };
  b.querySelectorAll("[data-ch]").forEach(
    x =>
      (x.onclick = () => {
        const s = tin.selectionStart,
          en = tin.selectionEnd;
        tin.value = tin.value.slice(0, s) + x.dataset.ch + tin.value.slice(en);
        tin.focus();
        tin.selectionStart = tin.selectionEnd = s + 1;
        setReady(true);
      }),
  );
  return {
    grade: give => {
      tin.disabled = true;
      const strict = ex.t === "dictee" && !ex.lang.startsWith("en") && !(L && L.cid === "fr-fle");
      const r = give ? { ok: false } : checkText(tin.value, [ex.answer, ...(ex.alts || [])], ex.lang, strict);
      return {
        ok: r.ok,
        typo: r.typo,
        sol: ex.answer,
        rom: ex.rom,
        speak: ex.answer,
        lang: ex.lang,
        diff: strict && !r.ok && tin.value.trim() ? diffHtml(tin.value, ex.answer, ex.lang) : "",
      };
    },
  };
};
R.listen = R.type;
R.dictee = R.type;
R.choice = (ex, b) => {
  const title =
    ex.kind === "toeic"
      ? "Part 5 — Complète la phrase"
      : ex.kind === "volt"
        ? "Choisis la bonne orthographe"
        : ex.lang.startsWith("ko")
          ? "Choisis la bonne forme"
          : "Complète la phrase";
  const hasBlank = ex.q.includes("___");
  const qh = hasBlank ? esc(ex.q).replace("___", '<span class="blank" id="blk">_____</span>') : esc(ex.q);
  b.innerHTML = `<h2 class="ltitle">${title}</h2><div class="qcard">${qh}</div><div class="opts">${ex.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${"ABCD"[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
  let sel = -1;
  const os = b.querySelectorAll(".opt");
  os.forEach(
    o =>
      (o.onclick = () => {
        if (L.state !== "answer") return;
        sel = +o.dataset.i;
        os.forEach(x => x.classList.toggle("sel", x === o));
        beep("tap");
        const bl = b.querySelector("#blk");
        if (bl) bl.textContent = ex.options[sel];
        setReady(true);
      }),
  );
  const full = hasBlank ? ex.q.replace("___", ex.answer) : ex.answer;
  return {
    key: i => os[i] && os[i].click(),
    grade: give => {
      const ok = !give && ex.options[sel] === ex.answer;
      markOpts(b, ex.options.indexOf(ex.answer), sel);
      const bl = b.querySelector("#blk");
      if (bl) bl.textContent = ex.answer;
      return { ok, sol: cleanSpeak(full) || full, exp: ex.e, speak: full, lang: ex.lang };
    },
  };
};
R.part2 = (ex, b) => {
  b.innerHTML = `<h2 class="ltitle">Part 2 — Écoute la question et choisis la meilleure réponse</h2>${audioBig()}<div class="opts">${ex.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${"ABC"[i]}</span><span>${ex.hidden ? "Réponse " + "ABC"[i] : esc(o)}</span><span class="spk" data-o="${i}" role="button" aria-label="Écouter">🔊</span></button>`).join("")}</div>${ex.hidden ? '<p class="micnote" style="margin-top:14px">Niveau avancé : comme au vrai TOEIC, les réponses ne sont qu\'audio. Touche 🔊 pour les écouter.</p>' : ""}`;
  wireSay(b, ex.q, ex.lang);
  say(ex.q, ex.lang);
  let sel = -1;
  const os = b.querySelectorAll(".opt");
  b.querySelectorAll("[data-o]").forEach(
    s =>
      (s.onclick = e => {
        e.stopPropagation();
        say(ex.options[+s.dataset.o], ex.lang);
      }),
  );
  os.forEach(
    o =>
      (o.onclick = () => {
        if (L.state !== "answer") return;
        sel = +o.dataset.i;
        os.forEach(x => x.classList.toggle("sel", x === o));
        beep("tap");
        if (ex.hidden) say(ex.options[sel], ex.lang);
        setReady(true);
      }),
  );
  return {
    key: i => os[i] && os[i].click(),
    grade: give => {
      const ok = !give && ex.options[sel] === ex.answer;
      markOpts(b, ex.options.indexOf(ex.answer), sel);
      if (ex.hidden) os.forEach((o, i) => (o.children[1].textContent = ex.options[i]));
      return {
        ok,
        solHtml: `Q : ${esc(ex.q)}<br>R : ${esc(ex.answer)}`,
        speak: ex.q,
        speak2: ex.answer,
        lang: ex.lang,
      };
    },
  };
};
// Dialogues : une voix « homme » et une voix « femme » quand l'appareil en a deux, sinon la meilleure voix avec une hauteur différente
export const MALE_RX =
    /\bmale\b|daniel|david|guy|alex\b|arthur|ryan|mark|tom\b|thomas|aaron|evan|nathan|oliver|james|reed|eddy|rocko|minsu|injoon|-x-(iom|iol|tpd|frd|vlf|kod)-/i,
  FEM_RX =
    /female|samantha|aria|jenny|zira|karen|moira|susan|ava|zoe|allison|amélie|audrey|marie|yuna|sora|heami|-x-(sfg|tpc|tpf|fra|frc|ism|kob)-/i;
export function voiceFor(lang, who) {
  const r = rankVoices(lang);
  if (!r.length) return { v: null, pitch: who === "M" ? 0.8 : who === "W" ? 1.15 : 1 };
  const male = r.find(v => MALE_RX.test(v.name) && !/female/i.test(v.name)),
    fem = r.find(v => FEM_RX.test(v.name));
  if (who === "M") {
    if (male) return { v: male, pitch: 1 };
    const alt = r.find(v => v !== (fem || r[0]));
    return alt && !FEM_RX.test(alt.name) ? { v: alt, pitch: 1 } : { v: r[0], pitch: 0.8 };
  }
  if (who === "W") return { v: fem || r[0], pitch: fem ? 1 : 1.12 };
  return { v: r[0], pitch: 1 };
}
export function sayDialog(d, lang, slow) {
  if (!("speechSynthesis" in window)) return;
  try {
    if (!VOICES.length) loadVoices();
    ttsCheck(lang);
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    speechSynthesis.cancel();
    const go = () =>
      d.forEach(([who, txt]) => {
        const u = new SpeechSynthesisUtterance(cleanSpeak(txt));
        u.lang = lang;
        const vv = voiceFor(lang, who);
        if (vv.v) u.voice = vv.v;
        u.pitch = vv.pitch;
        u.rate = Math.max(0.5, (slow ? 0.7 : 1) * S.set.rate);
        ttsGo(u);
      });
    if (busy) setTimeout(go, IOS ? 60 : 40);
    else go();
  } catch (e) {}
}
R.conv = (ex, b) => {
  const talk = ex.d.length === 1;
  b.innerHTML = `<h2 class="ltitle">Part ${talk ? 4 : 3} — Écoute ${talk ? "l'annonce" : "la conversation"}, puis réponds</h2><div class="bigaudio"><button class="abtn" id="dn" aria-label="Écouter">🔊</button><button class="abtn slow" id="ds" aria-label="Lentement">🐢</button></div>${
    ex.g
      ? `<div class="qcard graphic">${ex.g
          .split("\n")
          .map((r, i) => (i ? `<div>${esc(r)}</div>` : `<b>${esc(r)}</b>`))
          .join("")}</div>`
      : ""
  }<div class="qcard" style="font-size:18px">${esc(ex.q)}</div><div class="opts">${ex.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${"ABCD"[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
  b.querySelector("#dn").onclick = () => sayDialog(ex.d, ex.lang);
  b.querySelector("#ds").onclick = () => sayDialog(ex.d, ex.lang, true);
  sayDialog(ex.d, ex.lang);
  let sel = -1;
  const os = b.querySelectorAll(".opt");
  os.forEach(
    o =>
      (o.onclick = () => {
        if (L.state !== "answer") return;
        sel = +o.dataset.i;
        os.forEach(x => x.classList.toggle("sel", x === o));
        beep("tap");
        setReady(true);
      }),
  );
  return {
    key: i => os[i] && os[i].click(),
    grade: give => {
      const ok = !give && ex.options[sel] === ex.answer;
      markOpts(b, ex.options.indexOf(ex.answer), sel);
      const tr = ex.d.map(([w, t]) => `<b>${w === "N" ? "" : w === "M" ? "👨 " : "👩 "}</b>${esc(t)}`).join("<br>");
      return {
        ok,
        title: ok ? undefined : "Réponse correcte :",
        solHtml: `${esc(ex.answer)}<details style="margin-top:6px;color:var(--ink);font-size:14px"><summary style="cursor:pointer">📜 Voir la transcription</summary>${tr}</details>`,
        exp: ex.e,
        speak: ex.answer,
        lang: ex.lang,
      };
    },
  };
};
R.read = (ex, b) => {
  b.innerHTML = `<h2 class="ltitle">Part 7 — Lis le document et réponds</h2><div class="qcard passage">${esc(ex.x).replace(/\n/g, "<br>")}</div><div class="qcard" style="font-size:18px;background:var(--card)">${esc(ex.q)}</div><div class="opts">${ex.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${"ABCD"[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
  let sel = -1;
  const os = b.querySelectorAll(".opt");
  os.forEach(
    o =>
      (o.onclick = () => {
        if (L.state !== "answer") return;
        sel = +o.dataset.i;
        os.forEach(x => x.classList.toggle("sel", x === o));
        beep("tap");
        setReady(true);
      }),
  );
  return {
    key: i => os[i] && os[i].click(),
    grade: give => {
      const ok = !give && ex.options[sel] === ex.answer;
      markOpts(b, ex.options.indexOf(ex.answer), sel);
      return { ok, sol: ex.answer, exp: ex.e, speak: ex.answer, lang: ex.lang };
    },
  };
};
R.spot = (ex, b) => {
  const toks = s => s.split(/\s+/).filter(Boolean);
  const bt = toks(ex.before),
    at = toks(ex.after);
  const w = (x, i, blank) => `<button class="spotw" data-k="${blank ? "B" : i}">${esc(x)}</button>`;
  b.innerHTML = `<h2 class="ltitle">${ex.lang.startsWith("fr") ? "Clique sur la faute" : "Trouve l'erreur"}</h2><p class="micnote" style="text-align:left;margin:-8px 0 16px">Touche le mot fautif… ou « Il n'y a pas de faute ».</p>
  <div class="spotline">${bt.map((x, i) => w(x, "b" + i)).join(" ")} ${w(ex.chunk, 0, true)} ${at.map((x, i) => w(x, "a" + i)).join(" ")}</div>${ex.hint ? `<p class="micnote" style="text-align:left">(${esc(ex.hint)})</p>` : ""}
  <button class="spotw nofault" data-v="none">✓ Il n'y a pas de faute</button>`;
  let pick = null;
  const all = b.querySelectorAll(".spotw");
  all.forEach(
    x =>
      (x.onclick = () => {
        if (L.state !== "answer") return;
        pick = x.dataset.v === "none" ? "none" : x.dataset.k;
        all.forEach(y => y.classList.toggle("sel", y === x));
        beep("tap");
        setReady(true);
      }),
  );
  return {
    grade: give => {
      const ok = !give && ((ex.faulty && pick === "B") || (!ex.faulty && pick === "none"));
      const bl = b.querySelector('[data-k="B"]');
      if (bl) bl.classList.add(ex.faulty ? "bad" : "good");
      const full = (ex.before + ex.right + ex.after).replace(/\s+/g, " ").trim();
      return {
        ok,
        title: ok ? undefined : ex.faulty ? "La faute était ici :" : "Il n'y avait pas de faute :",
        solHtml: ex.faulty
          ? `<s>${esc(ex.chunk)}</s> → <b>${esc(ex.right)}</b><div class="rom" style="font-style:normal">${esc(full)}</div>`
          : esc(full),
        exp: ex.e,
        speak: full,
        lang: ex.lang,
      };
    },
  };
};
R.photo = (ex, b) => {
  b.innerHTML = `<h2 class="ltitle">Part 1 — Quelle phrase décrit le mieux la ${ex.img ? "photo" : "scène"} ?</h2>${ex.img ? `<figure class="pscene"><img src="${PH_IMG(ex.img)}" alt="" decoding="async" onerror="this.closest('figure').outerHTML='<div class=&quot;scene&quot;>${esc(ex.scene)}</div>'"><figcaption>Photo · Unsplash</figcaption></figure>` : `<div class="scene">${ex.scene}</div>`}<div class="opts">${ex.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${"ABCD"[i]}</span><span>${ex.hidden ? "Affirmation " + "ABCD"[i] : esc(o)}</span><span class="spk" data-o="${i}" role="button" aria-label="Écouter">🔊</span></button>`).join("")}</div>${ex.hidden ? '<p class="micnote" style="margin-top:12px">Comme au vrai TOEIC, les affirmations ne sont qu\'audio : touche 🔊 pour les écouter.</p>' : ""}`;
  let sel = -1;
  const os = b.querySelectorAll(".opt");
  b.querySelectorAll("[data-o]").forEach(
    x =>
      (x.onclick = e => {
        e.stopPropagation();
        say(ex.options[+x.dataset.o], ex.lang);
      }),
  );
  if (ex.hidden) {
    const q = [...ex.options];
    say(q[0], ex.lang);
    q.slice(1).forEach(t => say(t, ex.lang, { queue: true }));
  }
  os.forEach(
    o =>
      (o.onclick = () => {
        if (L.state !== "answer") return;
        sel = +o.dataset.i;
        os.forEach(x => x.classList.toggle("sel", x === o));
        beep("tap");
        if (ex.hidden) say(ex.options[sel], ex.lang);
        setReady(true);
      }),
  );
  return {
    key: i => os[i] && os[i].click(),
    grade: give => {
      const ok = !give && ex.options[sel] === ex.answer;
      markOpts(b, ex.options.indexOf(ex.answer), sel);
      if (ex.hidden) os.forEach((o, i) => (o.children[1].textContent = ex.options[i]));
      return { ok, sol: ex.answer, exp: "Scène : " + ex.cap, speak: ex.answer, lang: ex.lang };
    },
  };
};
R.hg = (ex, b) => {
  b.innerHTML = `<h2 class="ltitle">${esc(ex.title)}</h2>${ex.big ? `<div class="hgbig">${esc(ex.big)}</div>${ex.sub ? `<p class="micnote" style="margin:-6px 0 16px">${esc(ex.sub)}</p>` : ""}` : audioBig()}<div class="opts ${ex.letters ? "optgrid" : ""}">${ex.options.map((o, i) => `<button class="opt ${ex.letters ? "hgopt" : ""}" data-i="${i}"><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
  if (!ex.big) {
    wireSay(b, ex.auto, ex.lang);
    say(ex.auto, ex.lang);
  }
  let sel = -1;
  const os = b.querySelectorAll(".opt");
  os.forEach(
    o =>
      (o.onclick = () => {
        if (L.state !== "answer") return;
        sel = +o.dataset.i;
        os.forEach(x => x.classList.toggle("sel", x === o));
        beep("tap");
        if (ex.optAudio) say(ex.optAudio[ex.options[sel]], ex.lang);
        setReady(true);
      }),
  );
  return {
    key: i => os[i] && os[i].click(),
    grade: give => {
      const ok = !give && ex.options[sel] === ex.answer;
      markOpts(b, ex.options.indexOf(ex.answer), sel);
      return {
        ok,
        sol: ex.answer + (ex.big && ex.big !== ex.answer ? "  ·  " + ex.big : ""),
        speak: ex.after,
        lang: ex.lang,
      };
    },
  };
};
R.build = (ex, b) => {
  b.innerHTML = `<h2 class="ltitle">Compose la syllabe</h2>${bubble(`<button class="spk" data-say="n" aria-label="Écouter">🔊</button><b style="font-size:26px">${esc(ex.roman)}</b>`)}<div class="hgbig" id="bprev" style="min-height:120px">·</div><div class="answer" id="ans" style="min-height:64px;justify-content:center"></div><div class="bank" id="bank">${ex.tiles.map((w, i) => `<button class="tile hgt" data-i="${i}">${esc(w)}</button>`).join("")}</div><p class="micnote" style="margin-top:12px">Consonne + voyelle (+ consonne finale). Touche une lettre placée pour la retirer.</p>`;
  wireSay(b, ex.syl, ex.lang);
  say(ex.syl, ex.lang);
  const sel = [];
  const ans = b.querySelector("#ans"),
    bank = b.querySelector("#bank"),
    pv = b.querySelector("#bprev");
  const draw = () => {
    ans.innerHTML = sel.map((i, k) => `<button class="tile hgt" data-k="${k}">${esc(ex.tiles[i])}</button>`).join("");
    bank.querySelectorAll(".tile").forEach(t => t.classList.toggle("used", sel.includes(+t.dataset.i)));
    pv.textContent = sel.length ? hgCompose(sel.map(i => ex.tiles[i])) : "·";
    ans.querySelectorAll(".tile").forEach(
      t =>
        (t.onclick = () => {
          if (L.state !== "answer") return;
          sel.splice(+t.dataset.k, 1);
          beep("tap");
          draw();
        }),
    );
    setReady(sel.length >= 2);
  };
  bank.querySelectorAll(".tile").forEach(
    t =>
      (t.onclick = () => {
        if (L.state !== "answer") return;
        const i = +t.dataset.i;
        if (sel.includes(i) || sel.length >= 3) return;
        sel.push(i);
        beep("tap");
        draw();
      }),
  );
  return {
    grade: give => {
      const got = sel.map(i => ex.tiles[i]);
      const ok = !give && got.join("") === ex.parts.join("");
      return {
        ok,
        given: got.join(" + "),
        solHtml: `${ex.parts.map(esc).join(" + ")} = <b style="font-size:24px">${esc(ex.syl)}</b>`,
        speak: ex.syl,
        lang: ex.lang,
      };
    },
  };
};
R.write = (ex, b) => {
  const ko = ex.lang.startsWith("ko");
  if (ex.mode === "transcribe") {
    b.innerHTML = `<h2 class="ltitle">✍️ ${esc(ex.task)}</h2><div class="wlist">${ex.items.map((x, i) => `<label class="wrow"><span><b>${esc(x.rom)}</b><small>${esc(x.fr)}</small></span><input class="finput" data-i="${i}" lang="ko-KR" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></label>`).join("")}</div><p class="micnote">${ANDROID ? "Passe sur le clavier coréen 🌐 (Gboard : ⚙️ › Langues › Ajouter un clavier : Coréen)." : "Passe sur le clavier coréen 🌐 (Réglages › Général › Clavier › Claviers › Ajouter : Coréen)."}</p>`;
    const ins = [...b.querySelectorAll("input")];
    ins.forEach(i => (i.oninput = () => setReady(ins.some(x => x.value.trim()))));
    return {
      grade: give => {
        let good = 0;
        ins.forEach((inp, i) => {
          const ok = !give && norm(inp.value, "ko-KR") === norm(ex.items[i].ko, "ko-KR");
          if (ok) good++;
          inp.classList.add(ok ? "wok" : "wbad");
          if (!ok) {
            inp.insertAdjacentHTML("afterend", `<small class="wfix">→ ${esc(ex.items[i].ko)}</small>`);
            statRule(
              ex._cid,
              ex._u,
              "h:" + ex.items[i].ko,
              "Écrire " + ex.items[i].ko + " (" + ex.items[i].rom + ")",
              false,
            );
          } else
            statRule(
              ex._cid,
              ex._u,
              "h:" + ex.items[i].ko,
              "Écrire " + ex.items[i].ko + " (" + ex.items[i].rom + ")",
              true,
            );
        });
        const ok = good >= Math.ceil(ex.items.length * 0.6);
        recordStat(ex, ok);
        return {
          ok,
          title: ok ? undefined : "À retravailler :",
          sol: `${good} / ${ex.items.length} mots corrects`,
          speak: ex.items.map(x => x.ko).join(", "),
          lang: ex.lang,
        };
      },
    };
  }
  b.innerHTML = `<h2 class="ltitle">✍️ Rédaction</h2><div class="qcard" style="font-size:17px">${esc(ex.task)}</div>${ex.req && ex.req.length ? `<div class="chips wreq">${ex.req.map(r => `<span data-r="${esc(r)}">${esc(r)}</span>`).join("")}</div>` : ""}
  <textarea class="tin wtxt" id="tin" lang="${ex.lang}" placeholder="${ko ? "여기에 쓰세요…" : ex.lang.startsWith("fr") ? "Écris ton texte ici…" : "Write your text here…"}" autocapitalize="sentences" spellcheck="false"></textarea><div class="wcount" id="wcount">0 ${ko ? "caractère" : "mot"}</div><div id="wres"></div>`;
  const tin = b.querySelector("#tin"),
    cnt = b.querySelector("#wcount");
  const upd = () => {
    const n = wc(tin.value, ex.lang);
    cnt.textContent = `${n} ${ko ? "caractères" : "mots"} · objectif ${ex.min}+`;
    cnt.classList.toggle("okc", n >= ex.min);
    b.querySelectorAll("[data-r]").forEach(c =>
      c.classList.toggle("on", tin.value.toLowerCase().includes(c.dataset.r.toLowerCase())),
    );
    setReady(n >= Math.max(3, Math.floor(ex.min / 2)));
  };
  tin.oninput = upd;
  tin.onkeydown = e => {
    e.stopPropagation();
  };
  return {
    grade: give => {
      tin.disabled = true;
      const text = tin.value.trim();
      const n = wc(text, ex.lang);
      const reqOk = (ex.req || []).filter(r => text.toLowerCase().includes(r.toLowerCase())).length;
      const local = () => {
        const lenOk = n >= ex.min;
        const sc = Math.round(
          ((lenOk ? 1 : n / ex.min) * 0.5 + (ex.need ? Math.min(1, reqOk / ex.need) : 1) * 0.5) * 100,
        );
        recordStat(ex, sc >= 60);
        b.querySelector("#wres").innerHTML =
          `<div class="wbox"><div class="wscore">${sc}<small>/100</small></div><div><b>Vérification automatique</b><ul class="wcheck"><li class="${lenOk ? "y" : "n"}">Longueur : ${n} / ${ex.min} ${ko ? "caractères" : "mots"} minimum</li>${ex.need ? `<li class="${reqOk >= ex.need ? "y" : "n"}">Mots imposés : ${reqOk} / ${ex.need}</li>` : ""}</ul><p class="micnote" style="text-align:left">Sans IA, l'orthographe et la grammaire ne sont pas vérifiées : compare avec ce modèle.</p><div class="wmodel">${esc(ex.model || "").replace(/\n/g, "<br>")}</div></div></div>`;
        return {
          ok: sc >= 60,
          title: sc >= 60 ? undefined : "Presque !",
          sol: `Note : ${sc}/100`,
          speak: ex.model,
          lang: ex.lang,
        };
      };
      if (give || !text)
        return { ok: false, title: "Exemple de réponse :", sol: ex.model || "", speak: ex.model, lang: ex.lang };
      const lv = (COURSES[ex._cid].units[ex._u] || {}).lv || 0;
      return aiWrite({ lang: ex.lang, task: ex.task, text: text.slice(0, 2000), level: SECTION_NAMES[lv] }).then(r => {
        if (!r) return local();
        r.errs.forEach(e => {
          const notion = (e[2] || "Expression").slice(0, 60);
          statRule(ex._cid, ex._u, "n:" + notion.toLowerCase(), "Rédaction · " + notion, false);
          const a = (S.elog[ex._cid] = S.elog[ex._cid] || []);
          a.push({
            t: "write",
            q: e[0],
            a: e[1],
            g: e[0],
            u: ex.unit,
            e: notion + (e[3] ? " — " + e[3] : ""),
            ts: Date.now(),
          });
          if (a.length > 80) a.splice(0, a.length - 80);
        });
        recordStat(ex, r.score >= 60);
        b.querySelector("#wres").innerHTML =
          `<div class="wbox"><div class="wscore">${r.score}<small>/100</small></div><div><b>✨ Correction de l'IA</b>${r.errs.length ? `<ul class="werrs">${r.errs.map(e => `<li><s>${esc(e[0])}</s> → <b>${esc(e[1])}</b>${e[2] ? ` <span class="ntag">${esc(e[2])}</span>` : ""}${e[3] ? `<br><small>${esc(e[3])}</small>` : ""}</li>`).join("")}</ul>` : "<p>Aucune faute, bravo ! 🎉</p>"}${r.corr ? `<div class="wmodel"><b>Texte corrigé :</b><br>${esc(r.corr).replace(/\n/g, "<br>")}</div>` : ""}${r.bilan ? `<p class="wbilan">💬 ${esc(r.bilan)}</p>` : ""}</div></div>`;
        b.querySelector("#wres").scrollIntoView({ behavior: "smooth", block: "start" });
        const th = ex.strict ? 75 : 60;
        return {
          ok: r.score >= th,
          title:
            r.score >= th
              ? `Note : ${r.score}/100 · ${rnd(PRAISE)}`
              : `Note : ${r.score}/100 · à retravailler${ex.strict ? " (75 requis en extrême)" : ""}`,
          sol: r.errs.length ? `${r.errs.length} correction(s) ajoutée(s) à tes statistiques` : "",
          speak: r.corr || text,
          lang: ex.lang,
        };
      });
    },
  };
};
R.match = (ex, b) => {
  const left = shuffle(ex.pairs.map((p, i) => ({ i, t: p[0] }))),
    right = shuffle(ex.pairs.map((p, i) => ({ i, t: p[1] })));
  b.innerHTML = `<h2 class="ltitle">Associe les paires</h2><div class="match"><div class="mcol">${left.map(x => `<button class="mt" data-s="l" data-i="${x.i}">${esc(x.t)}</button>`).join("")}</div><div class="mcol">${right.map(x => `<button class="mt" data-s="r" data-i="${x.i}">${esc(x.t)}</button>`).join("")}</div></div>`;
  let sL = null,
    sR = null,
    done = 0,
    miss = 0;
  b.querySelectorAll(".mt").forEach(
    e =>
      (e.onclick = () => {
        if (L.state !== "answer" || e.classList.contains("ok")) return;
        if (e.dataset.s === "r") say(ex.pairs[+e.dataset.i][1], ex.lang);
        else beep("tap");
        if (e.dataset.s === "l") {
          sL && sL.classList.remove("sel");
          sL = e;
        } else {
          sR && sR.classList.remove("sel");
          sR = e;
        }
        e.classList.add("sel");
        if (sL && sR) {
          const a = sL,
            c = sR;
          sL = sR = null;
          if (a.dataset.i === c.dataset.i) {
            a.classList.remove("sel");
            c.classList.remove("sel");
            a.classList.add("ok");
            c.classList.add("ok");
            done++;
            if (done === ex.pairs.length) setTimeout(() => check(false), 380);
          } else {
            miss++;
            a.classList.add("no");
            c.classList.add("no");
            beep("bad");
            if (L) L.combo = 0;
            setTimeout(() => {
              a.classList.remove("no", "sel");
              c.classList.remove("no", "sel");
            }, 450);
          }
        }
      }),
  );
  return {
    grade: give => ({
      ok: !give,
      title: "Toutes les paires :",
      solHtml: give
        ? ex.pairs.map(p => `${esc(p[0])} = ${esc(p[1])}`).join("<br>")
        : miss
          ? `${miss} erreur(s) d'association`
          : "Sans erreur !",
      lang: ex.lang,
    }),
  };
};
R.speak = (ex, b) => {
  const ko = ex.lang.startsWith("ko");
  b.innerHTML = `<h2 class="ltitle">Lis cette phrase à voix haute</h2>${bubble(`<button class="spk" data-say="n" aria-label="Écouter">🔊</button><button class="spk" data-say="s" aria-label="Lentement" style="background:#8FB9FF">🐢</button><br><span class="heard" id="tgtw">${tokensHtml(ex.text, ex.lang, null)}</span>${ex.rom ? `<div class="rom">${esc(ex.rom)}</div>` : ""}<div class="rom" style="font-style:normal">${esc(ex.prompt)}</div>`)}<div class="mic">${SR ? `<button class="micbtn" id="micb">🎙️ Appuie pour parler</button>` : ""}<div class="micnote" id="micst">${SR ? "Écoute d'abord le modèle 🔊, puis appuie et lis la phrase." : dictHint(ex.lang)}</div>
 <div class="dict ${SR ? "hidden" : ""}" id="dictb"><input class="finput" id="dictin" lang="${ex.lang}" placeholder="🎤 Dicte ici avec le micro du clavier" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><button class="btn" id="dictok">Vérifier ma prononciation</button></div></div>`;
  wireSay(b, ex.text, ex.lang);
  let best = 0,
    tries = 0;
  const st = b.querySelector("#micst"),
    mb = b.querySelector("#micb");
  const judge = txt => {
    if (!txt || !txt.trim() || !L || L.state !== "answer") return;
    tries++;
    const r = scoreSpeech(ex.text, txt, ex.lang);
    best = Math.max(best, r.score);
    b.querySelector("#tgtw").innerHTML = tokensHtml(ex.text, ex.lang, r.hit);
    if (r.score >= 0.65) {
      st.textContent = `Super prononciation ! (${Math.round(r.score * 100)} %)`;
      setTimeout(() => {
        if (L && L.state === "answer") result({ ok: true, sol: ex.text, rom: ex.rom, speak: ex.text, lang: ex.lang });
      }, 500);
    } else {
      st.textContent = `${Math.round(r.score * 100)} % des ${ko ? "syllabes" : "mots"} reconnus (« ${txt.trim()} »). Les mots en rouge sont à retravailler : réécoute 🐢 et réessaie.`;
      setReady(true);
      if (tries >= 3) st.textContent += " (Tu peux aussi valider pour continuer.)";
    }
  };
  const di = b.querySelector("#dictin");
  b.querySelector("#dictok").onclick = () => {
    judge(di.value);
    di.value = "";
  };
  di.onkeydown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      judge(di.value);
      di.value = "";
    }
  };
  if (mb)
    mb.onclick = () => {
      if (!SR || L.state !== "answer") return;
      if (L.rec) {
        try {
          L.rec.stop();
        } catch (e) {}
        return;
      }
      try {
        speechSynthesis.cancel();
      } catch (e) {}
      const rec = new SR();
      L.rec = rec;
      rec.lang = ex.lang;
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.continuous = false;
      let finalTxt = "",
        alive = false,
        heard = false,
        errShown = false;
      const showDict = msg => {
        errShown = true;
        st.textContent = msg;
        const d = b.querySelector("#dictb");
        d.classList.remove("hidden");
        mb.classList.add("hidden");
      };
      const dog1 = setTimeout(() => {
        if (!alive && !heard && L && L.rec === rec) {
          try {
            rec.abort();
          } catch (e) {}
          micBroken();
          showDict(
            "Le micro ne répond pas sur cet appareil. Utilise la dictée du clavier : touche le champ, puis 🎤 sur le clavier, et lis la phrase.",
          );
        }
      }, 5000);
      const dog2 = setTimeout(() => {
        if (!heard && L && L.rec === rec) {
          try {
            rec.abort();
          } catch (e) {}
        }
      }, 12000);
      rec.onaudiostart = () => {
        alive = true;
      };
      rec.onstart = () => {
        alive = true;
      };
      rec.onspeechstart = () => {
        alive = true;
        heard = true;
      };
      mb.classList.add("live");
      mb.textContent = "🔴 J'écoute… (touche pour arrêter)";
      st.textContent = "Parle maintenant…";
      rec.onresult = e => {
        alive = heard = true;
        let t = "";
        for (const r of e.results) t += r[0].transcript + " ";
        st.textContent = "« " + t.trim() + " »";
        const last = e.results[e.results.length - 1];
        if (last.isFinal) {
          let bt = t;
          let bs = -1;
          for (let k = 0; k < last.length; k++) {
            const cand =
              Array.from(e.results)
                .slice(0, -1)
                .map(r => r[0].transcript)
                .join(" ") +
              " " +
              last[k].transcript;
            const sc = scoreSpeech(ex.text, cand, ex.lang).score;
            if (sc > bs) {
              bs = sc;
              bt = cand;
            }
          }
          finalTxt = bt;
        }
      };
      rec.onerror = e => {
        errShown = true;
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
          st.textContent = ANDROID
            ? "Micro indisponible : sur Android, autorise le micro pour ton navigateur (Paramètres › Applications › Chrome › Autorisations) et vérifie que l'app Google est installée. En attendant, utilise la dictée du clavier ci-dessous."
            : IOS
              ? "Micro indisponible : sur iPhone, active Siri et la Dictée (Réglages › Siri, Réglages › Général › Clavier) et autorise le micro pour Safari. En attendant, utilise la dictée du clavier ci-dessous."
              : "Micro bloqué : autorise-le dans le navigateur, ou utilise la dictée ci-dessous.";
          b.querySelector("#dictb").classList.remove("hidden");
        } else
          st.textContent =
            e.error === "no-speech"
              ? "Je n'ai rien entendu, réessaie 🙂"
              : "Petit souci avec le micro (" + e.error + "). Réessaie.";
      };
      rec.onend = () => {
        clearTimeout(dog1);
        clearTimeout(dog2);
        if (L && L.rec === rec) L.rec = null;
        mb.classList.remove("live");
        mb.textContent = "🎙️ Réessayer";
        if (finalTxt) return judge(finalTxt);
        if (!errShown) {
          L.micFail = (L.micFail || 0) + 1;
          st.textContent = "Je n'ai rien entendu, réessaie 🙂";
          if (L.micFail >= 2) b.querySelector("#dictb").classList.remove("hidden");
        }
      };
      try {
        rec.start();
      } catch (e) {
        st.textContent = "Impossible de démarrer le micro ici.";
        mb.classList.remove("live");
        L.rec = null;
      }
    };
  return {
    grade: give => {
      if (L && L.rec)
        try {
          L.rec.abort();
        } catch (e) {}
      return {
        ok: !give && best >= 0.75,
        noHeart: true,
        title: "À retravailler :",
        sol: ex.text,
        rom: ex.rom,
        speak: ex.text,
        lang: ex.lang,
      };
    },
  };
};
export const LANG_FR = { "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" };
export function dictHint(lang) {
  return (
    (IOS && STANDALONE
      ? "Dans l'app de l'écran d'accueil, iOS ne donne pas accès au micro direct. "
      : IOS
        ? "Micro direct indisponible (active Siri et la Dictée dans Réglages). "
        : "Micro direct indisponible dans ce navigateur. ") +
    `Utilise la dictée du clavier : touche le champ, passe sur le clavier ${LANG_FR[lang] || ""} 🌐, touche 🎤 puis lis la phrase.`
  );
}
export function speechUnits(text, lang) {
  if (lang.startsWith("ko")) {
    const out = [];
    for (const w of text.split(/\s+/)) for (const ch of w) out.push({ d: ch, k: norm(ch, lang) });
    return out.filter(x => x.k);
  }
  return text
    .split(/\s+/)
    .map(w => ({ d: w, k: norm(w, lang).replace(/\s+/g, "") }))
    .filter(x => x.d);
}
export function scoreSpeech(target, heard, lang) {
  const T = speechUnits(target, lang).filter(x => x.k);
  let H;
  if (lang.startsWith("ko")) H = Array.from(norm(heard, lang)).map(c => ({ k: c }));
  else
    H = norm(heard, lang)
      .split(" ")
      .filter(Boolean)
      .map(w => ({ k: w }));
  if (lang.startsWith("en")) {
    const Tn = norm(target, lang).split(" ").filter(Boolean);
    const bag = {};
    H.forEach(h => (bag[h.k] = (bag[h.k] || 0) + 1));
    let m = 0;
    Tn.forEach(w => {
      if (bag[w]) {
        bag[w]--;
        m++;
      }
    });
    const hit = T.map(t => {
      const parts = norm(t.d, lang).split(" ").filter(Boolean);
      return parts.every(p => H.some(h => h.k === p));
    });
    return { score: Tn.length ? m / Tn.length : 0, hit };
  }
  const hit = lcsMark(T, H);
  return { score: T.length ? hit.filter(Boolean).length / T.length : 0, hit };
}
export function tokensHtml(text, lang, hit) {
  const U = lang.startsWith("ko") ? null : text.split(/\s+/);
  if (!hit) return esc(text);
  if (U) return U.map((w, i) => `<span class="w ${hit[i] ? "y" : "n"}">${esc(w)}</span>`).join(" ");
  let k = 0;
  return text
    .split(/\s+/)
    .map(w =>
      Array.from(w)
        .map(ch => {
          const h = norm(ch, lang) ? hit[k++] : true;
          return `<span class="w ${h ? "y" : "n"}">${esc(ch)}</span>`;
        })
        .join(""),
    )
    .join(" ");
}
