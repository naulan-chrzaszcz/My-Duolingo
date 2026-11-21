// Sons, synthèse vocale et reconnaissance vocale
import { S } from "../core/accounts.js";
import { BASE_LANG } from "../i18n/locale.js";
import { ANDROID, IOS, STANDALONE, haptic } from "../ui/platform.js";
import { toast } from "../ui/ui.js";

// Contexte audio des effets sonores (créé au premier son, pendant un geste de l'utilisateur, comme l'exige iOS)
let AC = null;
// Petits sons synthétisés : « lvl » monte la note (série de bonnes réponses, paires trouvées…)
export function beep(type, lvl = 0) {
  haptic(type);
  if (!S.set.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    const t0 = AC.currentTime + 0.01;
    const up = Math.pow(2, Math.min(Math.max(0, lvl), 12) / 12);
    // une note : fréquence, départ, durée, volume, forme d'onde
    const note = (f, dt, dur, vol, wave = "triangle") => {
      const o = AC.createOscillator(),
        g = AC.createGain();
      o.type = wave;
      o.frequency.setValueAtTime(f, t0 + dt);
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(vol, t0 + dt + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + dur);
      o.connect(g).connect(AC.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + dur + 0.03);
      return o;
    };
    if (type === "tap" || type === "select") note(560, 0, 0.06, 0.045);
    else if (type === "ok") {
      // « ding-ding » clair, un peu plus aigu à chaque bonne réponse d'affilée
      const k = Math.pow(2, Math.min(lvl, 7) / 12);
      note(784 * k, 0, 0.16, 0.11);
      note(1175 * k, 0.085, 0.24, 0.11);
      note(2350 * k, 0.085, 0.18, 0.025, "sine");
    } else if (type === "combo") {
      [784, 988, 1319, 1568].forEach((f, i) => note(f * up, i * 0.06, 0.2, 0.1));
      note(3136 * up, 0.24, 0.25, 0.02, "sine");
    } else if (type === "bad") {
      // « bwoum » grave et doux (plus de son carré agressif)
      const o = note(240, 0, 0.32, 0.09, "sine");
      o.frequency.exponentialRampToValueAtTime(140, t0 + 0.3);
      note(180, 0.11, 0.24, 0.05);
    } else if (type === "match") note(880 * up, 0, 0.14, 0.08);
    else if (type === "win") {
      [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, 0.22, 0.12));
      [523, 659, 784].forEach(f => note(f * 2, 0.5, 0.6, 0.05, "sine"));
    } else if (type === "pop") note(1320 * up, 0, 0.08, 0.05, "sine");
    else note(600, 0, 0.08, 0.05);
  } catch (e) {}
}
export let VOICES = [];
export function loadVoices() {
  try {
    VOICES = speechSynthesis.getVoices() || [];
  } catch (e) {}
}
export const vlang = v =>
  String(v.lang || "")
    .toLowerCase()
    .replace("_", "-");
export function rankVoices(lang) {
  const L0 = lang.toLowerCase(),
    p = L0.slice(0, 2);
  const vs = VOICES.filter(v => vlang(v).startsWith(p));
  if (!vs.length) return [];
  const sc = v => {
    const n = v.name;
    let x = 0;
    if (vlang(v) === L0) x += 8;
    if (/premium/i.test(n)) x += 6;
    if (/enhanced|améliorée|amélioré/i.test(n)) x += 5;
    if (/siri/i.test(n)) x += 4;
    if (/natural|neural/i.test(n)) x += 4;
    if (/google/i.test(n)) x += 3;
    if (/samsung/i.test(n)) x += 2;
    if (/-x-[a-z]+-(local|network)$/i.test(n)) x += 1;
    if (/samantha|ava|zoe|evan|aria|jenny|yuna|sora|amélie|thomas|audrey/i.test(n)) x += 2;
    if (
      /eloquence|bad news|bells|bubbles|jester|organ|trinoids|whisper|zarvox|albert|boing|cellos|fred|grandma|grandpa|rocko|shelley|flo|reed|sandy|superstar|wobble|good news/i.test(
        n,
      )
    )
      x -= 20;
    if (v.localService) x += 1;
    return x;
  };
  return vs
    .map(v => [sc(v), v])
    .filter(x => x[0] > -10)
    .sort((a, b) => b[0] - a[0])
    .map(x => x[1]);
}
export function pickVoice(lang) {
  return rankVoices(lang)[0] || null;
}
export const cleanSpeak = t =>
  String(t)
    .replace(/\([^)]*\)/g, " ")
    .replace(/[«»"]/g, " ")
    .replace(/_{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
// Les énoncés en cours sont gardés en mémoire (Chrome / Android peuvent sinon les abandonner en route)
export const TTS_Q = new Set();
export function ttsGo(u) {
  TTS_Q.add(u);
  const done = () => TTS_Q.delete(u);
  u.addEventListener("end", done);
  u.addEventListener("error", e => {
    done();
    if (e && e.error === "synthesis-failed") ttsWarn(u.lang, true);
  });
  try {
    if (speechSynthesis.paused) speechSynthesis.resume();
  } catch (e) {}
  speechSynthesis.speak(u);
}
// Pas de voix installée pour cette langue : on prévient une fois, avec la marche à suivre selon l'appareil
export const TTS_WARNED = {};
export function ttsWarn(lang, failed) {
  const p = String(lang).slice(0, 2);
  if (TTS_WARNED[p] || (failed && TTS_WARNED._f)) return;
  TTS_WARNED[p] = 1;
  if (failed) TTS_WARNED._f = 1;
  const L0 = { en: "anglaise", fr: "française", ko: "coréenne" }[p] || "";
  toast(
    (failed ? "🔇 La synthèse vocale a échoué. " : "🔇 Aucune voix " + L0 + " sur cet appareil. ") +
      (ANDROID
        ? "Android : Paramètres › Système › Langues › Synthèse vocale › moteur Google › Installer les données vocales."
        : IOS
          ? "iPhone : Réglages › Accessibilité › Contenu énoncé › Voix."
          : "Installe une voix " + L0 + " dans les réglages de langue de ton ordinateur."),
  );
}
export function ttsCheck(lang) {
  if (VOICES.length && !pickVoice(lang)) ttsWarn(lang);
}
// Texte bilingue (parcours coréen : consigne en français ou en anglais + coréen) : chaque partie est lue par la voix de sa langue
export function speakParts(text, lang) {
  text = cleanSpeak(text);
  if (!text) return [];
  if (lang.startsWith("en") && /^I[.,!?;:]*$/.test(text)) return [["eye", lang]]; // « I » isolé : certaines voix épellent « capital I »
  // Lettre majuscule seule (tuile « A », « À »…) : iOS lit « capital A » / « A majuscule », on la lit en minuscule
  if (/^\p{Lu}[.,!?;:]*$/u.test(text) && !lang.startsWith("ko")) return [[text.toLowerCase(), lang]];
  if (
    !lang.startsWith("ko") ||
    BASE_LANG.startsWith("ko") ||
    !/[\uAC00-\uD7A3\u3131-\u318E]/.test(text) ||
    !/[A-Za-zÀ-ÿ]{2}/.test(text)
  )
    return [[text, lang]];
  const runs = [];
  for (const tok of text.split(/\s+/)) {
    const k = /[\uAC00-\uD7A3\u3131-\u318E]/.test(tok) ? "ko" : /[A-Za-zÀ-ÿ]/.test(tok) ? "b" : "";
    const last = runs[runs.length - 1];
    if (last && (!k || last[0] === k || !last[0])) {
      last[1].push(tok);
      if (!last[0]) last[0] = k;
    } else runs.push([k, [tok]]);
  }
  // un mot latin isolé dans une phrase coréenne (K-pop, PC…) reste lu par la voix coréenne
  const out = [];
  for (const [k, toks] of runs) {
    const base = k === "b" && toks.filter(t => /[A-Za-zÀ-ÿ]/.test(t)).length >= 2;
    const l = base ? BASE_LANG : lang;
    const t = toks.join(" ");
    if (out.length && out[out.length - 1][1] === l) out[out.length - 1][0] += " " + t;
    else out.push([t, l]);
  }
  return out.filter(p => /[\p{L}\p{N}]/u.test(p[0]));
}
export function say(text, lang, o = {}) {
  if (!text || !("speechSynthesis" in window)) return;
  try {
    if (!VOICES.length) loadVoices();
    const parts = speakParts(text, lang);
    if (!parts.length) return;
    const us = parts.map(([t, l]) => {
      ttsCheck(l);
      const u = new SpeechSynthesisUtterance(t);
      u.lang = l;
      const v = pickVoice(l);
      if (v) u.voice = v;
      u.rate = Math.max(0.5, (o.slow ? 0.6 : 1) * S.set.rate);
      return u;
    });
    const go = () => us.forEach(u => ttsGo(u));
    if (!o.queue && (speechSynthesis.speaking || speechSynthesis.pending)) {
      speechSynthesis.cancel();
      setTimeout(go, IOS ? 60 : 40);
      return;
    }
    go();
  } catch (e) {}
}
// iOS : la synthèse vocale doit être « débloquée » par un premier geste
export let TTS_UNLOCK = false;
export function set_TTS_UNLOCK(v) {
  return (TTS_UNLOCK = v);
}
export const SR0 = window.SpeechRecognition || window.webkitSpeechRecognition;
// Dans l'app installée sur l'écran d'accueil d'iPhone, iOS fournit la reconnaissance vocale mais ne renvoie jamais
// de résultat : on passe directement à la dictée du clavier. Même chose sur un appareil où le micro direct a déjà échoué.
export let SR =
  SR0 &&
  !(IOS && STANDALONE) &&
  !(() => {
    try {
      return localStorage.getItem("speakeasy-micko") === "1";
    } catch (e) {
      return false;
    }
  })()
    ? SR0
    : null;
export function set_SR(v) {
  return (SR = v);
}
export function micBroken() {
  SR = null;
  try {
    localStorage.setItem("speakeasy-micko", "1");
  } catch (e) {}
}
