// Conversation en situation (v39.2) : l'élève choisit une situation, l'IA joue l'autre personne, réplique après
// réplique (à l'écrit ou au micro), puis corrige la conversation : fautes (rangées dans les erreurs à ancrer),
// tournures plus naturelles et mots utiles (à ajouter aux mots à retenir). Sans IA, la carte invite à connecter Claude.
import { S, save } from "../core/accounts.js";
import { addToday } from "../core/xp.js";
import { dkey, esc, secName, yest } from "../core/util.js";
import { COURSES } from "../content/index.js";
import { NONFR } from "../i18n/locale.js";
import { addMistake } from "../lesson/engine.js";
import { unlockedUnits } from "../lesson/build.js";
import { aiAsk, aiDetect, likesText } from "../services/ai.js";
import { SR, beep, micBroken, say } from "../services/speech.js";
import { streakMilestone, streakReset } from "../screens/streak.js";
import { storyAddWord } from "../screens/stories.js";
import { ic } from "../ui/icons";
import { mascot } from "../ui/mascot.js";
import { curCid, curSec, renderAll } from "../ui/router.js";
import { closeModal, modal, toast } from "../ui/ui.js";
import { likesList } from "./interests";
import { goalId, goalText } from "./personalize";
import { SEC_LANG } from "./word-bank.js";

/** [identifiant, situation, personne jouée par l'IA, emoji] */
export const SCENES: [string, string, string, string][] = [
  ["cafe", "Commander au café", "le serveur ou la serveuse", "☕"],
  ["resto", "Au restaurant", "le serveur ou la serveuse", "🍽️"],
  ["hotel", "Arriver à l'hôtel", "le ou la réceptionniste", "🏨"],
  ["way", "Demander son chemin", "un passant ou une passante", "🗺️"],
  ["airport", "À l'aéroport", "l'agent d'enregistrement", "✈️"],
  ["shop", "Faire les magasins", "le vendeur ou la vendeuse", "🛍️"],
  ["doctor", "Chez le médecin", "le médecin", "🩺"],
  ["friend", "Faire connaissance", "une personne rencontrée à une soirée", "👋"],
  ["plans", "Organiser une sortie", "un ami ou une amie", "🎟️"],
  ["phone", "Appeler un service client", "le conseiller ou la conseillère", "📞"],
  ["interview", "Entretien d'embauche", "le recruteur ou la recruteuse", "💼"],
  ["meeting", "Réunion de travail", "un collègue ou une collègue", "📊"],
];
const FOR_GOAL: Record<string, string[]> = {
  trip: ["hotel", "way", "airport"],
  job: ["interview", "meeting", "phone"],
  exam: ["interview", "phone", "meeting"],
  study: ["friend", "meeting", "phone"],
  people: ["friend", "plans", "resto"],
  fun: ["cafe", "plans", "shop"],
};
export const CHAT_MAX = 8; // répliques de l'élève au plus
const P = (): any => S;
type Turn = ["P" | "E", string];
type Chat = {
  sec: string;
  cid: string;
  lang: string;
  level: string;
  scene: string;
  title: string;
  hist: Turn[];
  tr: string[];
  hint: string;
  busy: boolean;
  done: boolean;
};
let C: Chat | null = null;

const L0 = (lang: string) =>
  (({ "en-US": "anglais", "fr-FR": "français", "ko-KR": "coréen" }) as Record<string, string>)[lang];
const histText = (h: Turn[]) => h.map(([r, t]) => `${r} : ${t}`).join("\n");
const extras = (r: any) =>
  (r.why && goalText() ? "Objectif de l'élève : " + goalText() + ".\n" : "") +
  (r.likes && r.likes.length ? likesText(r.likes) : "");

/** Consigne d'une réplique (même texte dans server/api/generate.php, mode « chat »). */
export function chatPrompt(r: any): string {
  const L = L0(r.lang);
  return (
    "Tu joues un personnage dans une conversation d'entraînement d'une application d'apprentissage façon Duolingo. L'élève est francophone et apprend le " +
    L +
    " (niveau : " +
    r.level +
    ").\nSituation : « " +
    r.scene +
    " ». Tu joues l'autre personne de la situation, jamais l'élève.\n" +
    extras(r) +
    (r.hist && r.hist.length
      ? "Conversation jusqu'ici (P = ton personnage, E = l'élève) :\n" + histText(r.hist) + "\n\n"
      : "La conversation commence : écris la première réplique de ton personnage.\n\n") +
    'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n{"r":"ta prochaine réplique en ' +
    L +
    '","fr":"sa traduction française","aide":"une réponse possible de l\'élève en ' +
    L +
    ', simple et naturelle","fin":false}\n' +
    "Règles : une seule réplique courte (1 ou 2 phrases), naturelle et 100 % correcte, adaptée au niveau ; ne corrige pas l'élève pendant la conversation et réponds comme une vraie personne, même si sa phrase contient des fautes ; pose des questions pour le faire parler ; \"fin\" vaut true seulement quand la situation est naturellement terminée, après au moins 5 répliques de l'élève." +
    (r.lang === "fr-FR" ? ' La conversation est en français : "fr" est une chaîne vide.' : "")
  );
}

/** Consigne de la correction finale (même texte dans server/api/generate.php, mode « chatfix »). */
export function chatFixPrompt(r: any): string {
  const L = L0(r.lang);
  return (
    "Tu es professeur de " +
    L +
    ". Voici une conversation d'entraînement entre un personnage (P) et un élève francophone (E) de niveau " +
    r.level +
    ", situation « " +
    r.scene +
    " » :\n" +
    histText(r.hist || []) +
    '\n\nCorrige les répliques de l\'élève. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n{"bilan":"2 phrases bienveillantes en français, au tutoiement","fautes":[["réplique de l\'élève","réplique corrigée","traduction française de la réplique corrigée","explication courte en français"]],"mieux":[["ce que l\'élève a dit","tournure plus naturelle en ' +
    L +
    '"]],"mots":[["mot ou expression utile en ' +
    L +
    ' vu dans la conversation","traduction française"]]}\n' +
    'Règles : dans "fautes", seulement les vraies fautes (8 au plus, liste vide s\'il n\'y en a pas) ; dans "mieux", 2 ou 3 tournures plus naturelles ; dans "mots", 3 à 5 mots ou expressions utiles.'
  );
}

function req(mode: string): any {
  return {
    mode,
    lang: C!.lang,
    level: C!.level,
    scene: C!.scene,
    hist: C!.hist.slice(-20),
    why: goalId(),
    likes: likesList(),
  };
}
const sstr = (x: unknown, n: number) => typeof x === "string" && x.trim().length > 0 && x.length < n;

/** Carte de l'onglet Entraînement : choix de la situation. */
export async function chatPicker(): Promise<void> {
  if ((await aiDetect()) === "local") {
    const m = modal(
      `<div class="mcenter">${mascot("calm")}<h2>Connecte ton Claude</h2><p>La conversation se fait avec l'IA. Ajoute ta clé API Claude dans Paramètres › Mon Claude.</p></div><button class="btn" id="chCl">Ouvrir Mon Claude</button><button class="btn ghost" id="chLater">Plus tard</button>`,
    );
    (m.querySelector("#chCl") as HTMLElement).onclick = () => {
      closeModal();
      location.hash = "reglages/claude";
    };
    (m.querySelector("#chLater") as HTMLElement).onclick = closeModal;
    return;
  }
  const mine = FOR_GOAL[goalId()] || [];
  const order = [...SCENES.filter(s => mine.includes(s[0])), ...SCENES.filter(s => !mine.includes(s[0]))];
  const m = modal(
    `<h2 class="hi">${ic("chat", 22, "", 2.4)}<span>Conversation</span></h2><p>Choisis une situation : Horang joue l'autre personne, tu réponds à l'écrit ou au micro. À la fin, il corrige tes phrases.</p>
    <div class="likes chscenes">${order.map(([id, t, , e]) => `<button class="likechip${mine.includes(id) ? " sel" : ""}" data-sc="${id}"><span class="e">${e}</span><span>${t}</span></button>`).join("")}</div>
    <label class="flabel">Ou décris ta situation</label><input class="finput" id="chOwn" maxlength="100" placeholder="Ex. : rendre un vêtement trop petit">
    <button class="btn" id="chOwnGo">Commencer</button><button class="btn ghost" id="chCancel">Annuler</button>`,
  );
  m.querySelectorAll("[data-sc]").forEach((b: HTMLElement) => {
    b.onclick = () => {
      const s = SCENES.find(x => x[0] === b.dataset.sc)!;
      closeModal();
      startChat(`${s[1]} (l'élève parle avec ${s[2]})`, s[1]);
    };
  });
  (m.querySelector("#chOwnGo") as HTMLElement).onclick = () => {
    const t = ((m.querySelector("#chOwn") as HTMLInputElement).value || "").trim().slice(0, 100);
    if (!t) {
      toast("Choisis une situation ou décris la tienne");
      return;
    }
    closeModal();
    startChat(t, t);
  };
  (m.querySelector("#chCancel") as HTMLElement).onclick = closeModal;
}

export function startChat(scene: string, title: string): void {
  const sec = curSec().id,
    cid = curCid();
  const lv = Math.max(0, ...unlockedUnits(cid).map((u: any) => u.lv || 0));
  C = {
    sec,
    cid,
    lang: SEC_LANG[sec],
    level: secName(cid, lv),
    scene,
    title,
    hist: [],
    tr: [],
    hint: "",
    busy: false,
    done: false,
  };
  openUi();
  next();
}

function openUi(): void {
  closeUi();
  const el = document.createElement("div");
  el.id = "chat";
  el.className = "chat";
  el.innerHTML = `<div class="chathead"><button class="iconbtn" id="chX" aria-label="Fermer">✕</button><div class="chatt"><b>${esc(C!.title)}</b><small>${esc(COURSES[C!.cid].name)}</small></div><button class="btn ghost" id="chEnd" disabled>Terminer</button></div>
  <div class="chatlog" id="chLog"></div>
  <div class="chatbar"><div class="chathint hidden" id="chHint"></div><div class="chattools"><button class="btn ghost" id="chHelp">${ic("spark", 18, "", 2.4)}<span>Aide</span></button><button class="btn ghost" id="chTr">Traduire</button></div>
  <div class="chatin"><textarea class="finput" id="chIn" rows="1" lang="${C!.lang}" placeholder="Écris ta réponse…" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><button class="iconbtn" id="chMic" aria-label="Micro">${ic("mic", 22, "", 2.4)}</button><button class="btn" id="chSend">Envoyer</button></div></div>`;
  document.body.appendChild(el);
  document.body.classList.add("noscroll");
  const q = (s: string) => el.querySelector(s) as HTMLElement;
  q("#chX").onclick = () => {
    if (C && C.hist.some(t => t[0] === "E") && !C.done) {
      if (!confirm("Quitter la conversation ? Elle ne sera pas corrigée.")) return;
    }
    closeUi();
  };
  q("#chEnd").onclick = () => finishChat();
  q("#chSend").onclick = send;
  (q("#chIn") as HTMLTextAreaElement).onkeydown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  q("#chHelp").onclick = () => {
    const h = q("#chHint");
    if (!C || !C.hint) return;
    h.innerHTML = `<button class="chsug">${esc(C.hint)}</button>`;
    h.classList.remove("hidden");
    (h.querySelector(".chsug") as HTMLElement).onclick = () => {
      (q("#chIn") as HTMLTextAreaElement).value = C!.hint;
      h.classList.add("hidden");
    };
  };
  q("#chTr").onclick = () => {
    const last = [...el.querySelectorAll(".chmsg.p")].pop() as HTMLElement | undefined;
    if (last) last.querySelector(".chtr")?.classList.toggle("hidden");
  };
  q("#chMic").onclick = () => listen(q("#chIn") as HTMLTextAreaElement, q("#chMic"));
}

export function closeUi(): void {
  document.querySelector("#chat")?.remove();
  document.body.classList.remove("noscroll");
}

function addMsg(role: "P" | "E", text: string, tr = ""): void {
  const log = document.querySelector("#chLog");
  if (!log) return;
  const d = document.createElement("div");
  d.className = "chmsg " + (role === "P" ? "p" : "e");
  d.innerHTML =
    role === "P"
      ? `<div class="chb"><span class="notr" lang="${C!.lang}">${esc(text)}</span><button class="spk" aria-label="Écouter">${ic("volume", 16, "", 2.4)}</button></div>${tr ? `<div class="chtr hidden notr">${esc(tr)}</div>` : ""}`
      : `<div class="chb notr" lang="${C!.lang}">${esc(text)}</div>`;
  const sp = d.querySelector(".spk") as HTMLElement | null;
  if (sp) sp.onclick = () => say(text, C!.lang);
  log.appendChild(d);
  d.scrollIntoView({ block: "end", behavior: "smooth" });
}
function typing(on: boolean): void {
  const log = document.querySelector("#chLog");
  document.querySelector("#chTyping")?.remove();
  if (on && log)
    log.insertAdjacentHTML(
      "beforeend",
      `<div class="chmsg p" id="chTyping"><div class="chb"><span class="aiload"><i></i><i></i><i></i></span></div></div>`,
    );
  const b = document.querySelector("#chSend") as HTMLButtonElement | null;
  if (b) b.disabled = on;
}

/** Réplique suivante du personnage. */
async function next(): Promise<void> {
  if (!C || C.busy) return;
  C.busy = true;
  typing(true);
  const r = req("chat");
  const raw: any = await aiAsk(chatPrompt(r), r, { tier: "quick", ms: 40000 }).catch(() => null);
  if (!C) return;
  C.busy = false;
  typing(false);
  if (!raw || !sstr(raw.r, 400)) {
    toast("Horang n'a pas pu répondre, réessaie.");
    return;
  }
  const line = raw.r.trim();
  C.hist.push(["P", line]);
  C.tr.push(sstr(raw.fr, 400) ? raw.fr.trim() : "");
  C.hint = sstr(raw.aide, 300) ? raw.aide.trim() : "";
  document.querySelector("#chHint")?.classList.add("hidden");
  addMsg("P", line, C.tr[C.tr.length - 1]);
  say(line, C.lang);
  const n = C.hist.filter(t => t[0] === "E").length;
  if (raw.fin === true && n >= 3) finishChat();
}

function send(): void {
  if (!C || C.busy || C.done) return;
  const inp = document.querySelector("#chIn") as HTMLTextAreaElement;
  const t = (inp.value || "").trim().slice(0, 300);
  if (!t) return;
  inp.value = "";
  C.hist.push(["E", t]);
  addMsg("E", t);
  beep("tap");
  const n = C.hist.filter(x => x[0] === "E").length;
  (document.querySelector("#chEnd") as HTMLButtonElement).disabled = n < 3;
  if (n >= CHAT_MAX) finishChat();
  else next();
}

/** Micro : reconnaissance vocale si elle existe, sinon dictée du clavier (app installée sur iPhone). */
function listen(inp: HTMLTextAreaElement, btn: HTMLElement): void {
  if (!SR) {
    inp.focus();
    toast("Touche le micro du clavier pour dicter ta réponse");
    return;
  }
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  const rec = new (SR as any)();
  rec.lang = C!.lang;
  rec.interimResults = false;
  let got = false;
  btn.classList.add("live");
  rec.onresult = (e: any) => {
    got = true;
    inp.value = ((inp.value ? inp.value + " " : "") + e.results[0][0].transcript).trim();
  };
  rec.onerror = (e: any) => {
    if (e.error === "not-allowed") toast("Micro bloqué : autorise-le dans le navigateur.");
  };
  rec.onend = () => btn.classList.remove("live");
  const dog = setTimeout(() => {
    if (!got) {
      try {
        rec.abort();
      } catch (e) {}
    }
  }, 9000);
  rec.addEventListener("end", () => clearTimeout(dog));
  try {
    rec.start();
  } catch (e) {
    btn.classList.remove("live");
    micBroken();
    listen(inp, btn);
  }
}

/** Fin : correction par l'IA, XP, fautes dans les erreurs à ancrer, mots à ajouter. */
export async function finishChat(): Promise<void> {
  if (!C || C.done) return;
  const n = C.hist.filter(t => t[0] === "E").length;
  if (n < 1) return closeUi();
  C.done = true;
  typing(false);
  const log = document.querySelector("#chLog");
  if (log)
    log.insertAdjacentHTML(
      "beforeend",
      `<div class="chend">${mascot("wow", "dance")}<p>Horang corrige ta conversation…</p><div class="aiload"><i></i><i></i><i></i></div></div>`,
    );
  document.querySelector(".chatbar")?.classList.add("hidden");
  const r = req("chatfix");
  const raw: any = await aiAsk(chatFixPrompt(r), r, { tier: "default", ms: 70000 }).catch(() => null);
  const fautes = (Array.isArray(raw?.fautes) ? raw.fautes : [])
    .filter((f: any) => Array.isArray(f) && sstr(f[0], 400) && sstr(f[1], 400))
    .slice(0, 8)
    .map((f: any[]) => f.map(x => (typeof x === "string" ? x.trim() : "")));
  const mieux = (Array.isArray(raw?.mieux) ? raw.mieux : [])
    .filter((f: any) => Array.isArray(f) && sstr(f[1], 400))
    .slice(0, 3);
  const mots = (Array.isArray(raw?.mots) ? raw.mots : [])
    .filter((f: any) => Array.isArray(f) && sstr(f[0], 60))
    .slice(0, 5);
  // fautes → erreurs à ancrer (« Traduis » : de la traduction française vers la phrase corrigée)
  const fr = C.lang === "fr-FR" && !NONFR;
  if (!fr)
    fautes
      .filter((f: string[]) => f[2])
      .forEach((f: string[]) =>
        addMistake({ t: "type", prompt: f[2], answer: f[1], alts: [f[1]], lang: C!.lang, _cid: C!.cid }),
      );
  // XP : 10 par réplique de l'élève, 20 pour la correction ; la série compte comme pour une leçon
  const gained = Math.min(n, CHAT_MAX) * 10 + 20;
  const st = P();
  st.xp += gained;
  addToday(gained);
  if (st.lastDay !== dkey()) {
    st.streak = st.lastDay === yest() ? st.streak + 1 : 1;
    if (st.streak === 1) streakReset();
    st.lastDay = dkey();
    streakMilestone();
  }
  st.chats = (st.chats || 0) + 1;
  save();
  beep("win");
  const sec = C.sec,
    lang = C.lang;
  const el = document.querySelector("#chat");
  if (!el) return;
  const end = el.querySelector(".chend");
  if (end) end.remove();
  el.querySelector("#chLog")!.insertAdjacentHTML(
    "beforeend",
    `<div class="chres">${mascot("happy", "jump")}<h2>Conversation terminée</h2><p class="chxp">+${gained} XP</p>
    ${sstr(raw?.bilan, 700) ? `<p class="notr">${esc(raw.bilan.trim())}</p>` : raw ? "" : `<p>La correction n'a pas pu être faite cette fois : tes XP sont gagnés.</p>`}
    ${fautes.length ? `<h3>Tes fautes</h3><div class="chfix">${fautes.map((f: string[]) => `<div class="notr"><s>${esc(f[0])}</s><b>${esc(f[1])}</b>${f[3] ? `<small>${esc(f[3])}</small>` : ""}</div>`).join("")}</div>${fr ? "" : `<p class="chnote">Elles reviendront dans tes erreurs à ancrer.</p>`}` : raw ? `<h3>Aucune faute, bravo !</h3>` : ""}
    ${mieux.length ? `<h3>Pour être plus naturel</h3><div class="chfix">${mieux.map((f: string[]) => `<div class="notr">${f[0] ? `<s>${esc(String(f[0]))}</s>` : ""}<b>${esc(f[1])}</b></div>`).join("")}</div>` : ""}
    ${mots.length ? `<h3>Mots utiles</h3><div class="chwords">${mots.map((w: string[], i: number) => `<button class="likechip" data-w="${i}"><span class="notr">${esc(w[0])}</span>${w[1] ? `<small class="notr">${esc(String(w[1]))}</small>` : ""}<span class="e">+</span></button>`).join("")}</div>` : ""}
    <button class="btn" id="chClose">Fermer</button></div>`,
  );
  el.querySelectorAll<HTMLElement>("[data-w]").forEach(b => {
    b.onclick = () => {
      const w = mots[+(b.dataset.w || 0)];
      const it = storyAddWord(sec, w[0], lang, "", "", typeof w[1] === "string" ? w[1] : "");
      b.classList.add("sel");
      (b as HTMLButtonElement).disabled = true;
      toast(it ? "📌 Ajouté à tes mots à retenir" : "Déjà dans tes mots à retenir");
    };
  });
  (el.querySelector("#chClose") as HTMLElement).onclick = () => {
    closeUi();
    C = null;
    renderAll();
  };
  el.querySelector(".chres")!.scrollIntoView({ block: "start", behavior: "smooth" });
}
