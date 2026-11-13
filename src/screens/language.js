// Choix de la langue d'interface
import { KO_READY, UI, set_UI_ASK } from "../i18n/locale.js";
import { mascot } from "../ui/mascot.js";
import { closeModal, modal } from "../ui/ui.js";

// apprenant non francophone (parcours « Apprendre le français ») // langue des phrases à traduire et des explications
export function langPicker(next) {
  const m = modal(
    `<div class="mcenter notr langpick">${mascot("happy", "jump")}<h2>Choisis ta langue<br><small>Choose your language${KO_READY ? " · 언어를 선택하세요" : ""}</small></h2>
 <div class="choices"><button data-l="fr" class="${UI === "fr" ? "sel" : ""}"><span class="e">🇫🇷</span><span>Français<small>Apprendre l'anglais, le coréen, l'orthographe (Voltaire)</small></span></button>
 <button data-l="en" class="${UI === "en" ? "sel" : ""}"><span class="e">🇬🇧</span><span>English<small>Learn French, Korean and French spelling (Voltaire)</small></span></button>
 ${KO_READY ? `<button data-l="ko" class="${UI === "ko" ? "sel" : ""}"><span class="e">🇰🇷</span><span>한국어<small>영어(일상·비즈니스·TOEIC)와 프랑스어 배우기</small></span></button>` : ""}</div>
 <p style="font-size:13px">Modifiable plus tard dans les paramètres · You can change it later in Settings${KO_READY ? " · 나중에 설정에서 바꿀 수 있어요" : ""}</p></div>`,
    "",
    true,
  );
  m.querySelectorAll("[data-l]").forEach(
    b =>
      (b.onclick = () => {
        const v = b.dataset.l;
        if (v !== UI) return setUi(v);
        try {
          localStorage.setItem("speakeasy-ui", v);
        } catch (e) {}
        set_UI_ASK(false);
        closeModal();
        next();
      }),
  );
}
export function setUi(v) {
  try {
    localStorage.setItem("speakeasy-ui", v);
  } catch (e) {}
  location.reload();
}
