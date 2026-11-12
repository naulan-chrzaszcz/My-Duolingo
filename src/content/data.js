// Contenu brut des cours, tel qu'enregistré dans les fichiers JSON.
// Ne pas importer directement : utiliser ./index.js (contenu adapté à la langue d'interface).
import en_daily from "./courses/en-daily.json";
import en_pro from "./courses/en-pro.json";
import en_toeic from "./courses/en-toeic.json";
import fr_volt from "./courses/fr-volt.json";
import ko from "./courses/ko.json";
import fr_fle from "./courses/fr-fle.json";
import stories from "./stories.json";
import sections from "./sections.json";
import unitRemap from "./unit-remap.json";
import realPhotos from "./real-photos.json";
import legacy from "./legacy.json";

/** @typedef {import('../types').Course} Course @typedef {import('../types').Section} Section @typedef {import('../types').Story} Story */

/** Niveaux affichés (modifiés selon la langue d'interface). */
export const LEVELS = sections.levels;
/** Sections du sélecteur de cours. @type {Section[]} */
export const SECTIONS = sections.sections;
/** Cours par identifiant. L'ordre des clés est l'ordre d'affichage. @type {Record<string, Course>} */
export const COURSES = {
  "en-daily": en_daily,
  "en-pro": en_pro,
  "en-toeic": en_toeic,
  "fr-volt": fr_volt,
  ko: ko,
  "fr-fle": fr_fle,
};
/** Histoires par section (en, fr, ko). @type {Record<string, Story[]>} */
export const STORIES = stories;
/** Correspondances d'unités pour migrer les anciennes progressions. */
export const UNIT_REMAP = unitRemap;
/** Photos réelles du TOEIC Part 1. */
export const REAL_PH = realPhotos;
/** URL d'une photo Unsplash à partir de son identifiant. */
export const PH_IMG = id => "https://images.unsplash.com/photo-" + id + "?w=900&q=70&auto=format&fit=crop";
/** Anciennes données utilisées seulement par les migrations de progression (core/progress.js : hydrate). */
export const HANGUL_UNITS = legacy.HANGUL_UNITS;
export const V9 = legacy.V9;
