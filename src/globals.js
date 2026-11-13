// API globale : expose tous les exports des modules sur window, comme dans la v25 (un seul script global).
// Sert aux gestionnaires HTML inline (onclick="closeModal()"), aux tests automatiques et au débogage dans la console.
// Les variables réassignables (S, L…) sont exposées avec un accesseur pour rester à jour.
import * as m_content_index from "./content/index.js";
import * as m_core_accounts from "./core/accounts.js";
import * as m_core_progress from "./core/progress.js";
import * as m_core_state from "./core/state.js";
import * as m_core_util from "./core/util.js";
import * as m_core_xp from "./core/xp.js";
import * as m_exercises_distractors from "./exercises/distractors.js";
import * as m_exercises_drills from "./exercises/drills.js";
import * as m_exercises_generate from "./exercises/generate.js";
import * as m_exercises_hangul from "./exercises/hangul.js";
import * as m_exercises_render from "./exercises/render.js";
import * as m_exercises_validate from "./exercises/validate.js";
import * as m_features_ai_units from "./features/ai-units.js";
import * as m_features_coach from "./features/coach.js";
import * as m_features_grammar from "./features/grammar.js";
import * as m_features_placement from "./features/placement.js";
import * as m_features_quests from "./features/quests.js";
import * as m_features_theme_training from "./features/theme-training.js";
import * as m_features_word_bank from "./features/word-bank.js";
import * as m_i18n_dict_en from "./i18n/dict-en.js";
import * as m_i18n_dict_ko from "./i18n/dict-ko.js";
import * as m_i18n_locale from "./i18n/locale.js";
import * as m_i18n_translate from "./i18n/translate.js";
import * as m_lesson_build from "./lesson/build.js";
import * as m_lesson_engine from "./lesson/engine.js";
import * as m_lesson_writing from "./lesson/writing.js";
import * as m_screens_accounts from "./screens/accounts.js";
import * as m_screens_language from "./screens/language.js";
import * as m_screens_league from "./screens/league.js";
import * as m_screens_onboarding from "./screens/onboarding.js";
import * as m_screens_path from "./screens/path.js";
import * as m_screens_profile from "./screens/profile.js";
import * as m_screens_shop from "./screens/shop.js";
import * as m_screens_stats from "./screens/stats.js";
import * as m_screens_stories from "./screens/stories.js";
import * as m_screens_training from "./screens/training.js";
import * as m_services_ai from "./services/ai.js";
import * as m_services_cloud from "./services/cloud.js";
import * as m_services_reminders from "./services/reminders.js";
import * as m_services_speech from "./services/speech.js";
import * as m_ui_back_button from "./ui/back-button.js";
import * as m_ui_mascot from "./ui/mascot.js";
import * as m_ui_platform from "./ui/platform.js";
import * as m_ui_router from "./ui/router.js";
import * as m_ui_typography from "./ui/typography.js";
import * as m_ui_ui from "./ui/ui.js";

const MODULES = [
  m_content_index,
  m_core_accounts,
  m_core_progress,
  m_core_state,
  m_core_util,
  m_core_xp,
  m_exercises_distractors,
  m_exercises_drills,
  m_exercises_generate,
  m_exercises_hangul,
  m_exercises_render,
  m_exercises_validate,
  m_features_ai_units,
  m_features_coach,
  m_features_grammar,
  m_features_placement,
  m_features_quests,
  m_features_theme_training,
  m_features_word_bank,
  m_i18n_dict_en,
  m_i18n_dict_ko,
  m_i18n_locale,
  m_i18n_translate,
  m_lesson_build,
  m_lesson_engine,
  m_lesson_writing,
  m_screens_accounts,
  m_screens_language,
  m_screens_league,
  m_screens_onboarding,
  m_screens_path,
  m_screens_profile,
  m_screens_shop,
  m_screens_stats,
  m_screens_stories,
  m_screens_training,
  m_services_ai,
  m_services_cloud,
  m_services_reminders,
  m_services_speech,
  m_ui_back_button,
  m_ui_mascot,
  m_ui_platform,
  m_ui_router,
  m_ui_typography,
  m_ui_ui,
];
const SETTERS = {
  UI_ASK: m_i18n_locale.set_UI_ASK,
  S: m_core_accounts.set_S,
  TTS_UNLOCK: m_services_speech.set_TTS_UNLOCK,
  SR: m_services_speech.set_SR,
  L: m_lesson_engine.set_L,
  cloudRef: m_services_cloud.set_cloudRef,
  modal: m_ui_ui.set_modal,
  openSession: m_lesson_engine.set_openSession,
  playStory: m_screens_stories.set_playStory,
  closeModal: m_ui_ui.set_closeModal,
  closeLesson: m_lesson_engine.set_closeLesson,
};
for (const ns of MODULES)
  for (const name of Object.keys(ns)) {
    if (name.startsWith("set_")) continue;
    const d = Object.getOwnPropertyDescriptor(window, name);
    if (d && !d.configurable) continue; // propriété native non remplaçable (location, top…)
    Object.defineProperty(window, name, {
      configurable: true,
      get: () => ns[name],
      set:
        SETTERS[name] ||
        (() => {
          throw new TypeError(name + " est en lecture seule");
        }),
    });
  }
