// Types du modèle de données de Speakeasy.
// Le code existant est en JavaScript ; ces types documentent les données et servent au nouveau code en TypeScript
// (un fichier .ts peut importer les modules .js existants : esbuild compile les deux).

/** Identifiant de cours. */
export type CourseId = "en-daily" | "en-pro" | "en-toeic" | "fr-volt" | "ko" | "fr-fle" | (string & {});
/** Langue de l'interface. */
export type UiLang = "fr" | "en" | "ko";

/** Phrase à traduire : [français, cible, ...variantes acceptées]. Coréen : [fr, ko, romanisation, ...variantes]. */
export type Phrase = [string, string, ...string[]];
/** Mot de vocabulaire : [français, cible]. */
export type Vocab = [string, string];
/** QCM : [question avec ___, options, index de la bonne réponse, explication]. */
export type Mcq = [string, string[], number, string];
/** TOEIC Part 2 : [question, réponses, index de la bonne réponse]. */
export type Part2 = [string, string[], number];
/** TOEIC Part 1 : [emoji ou id de photo, description en français, propositions, index de la bonne]. */
export type Photo = [string, string, string[], number];

/** Unité d'un cours : 18 étapes générées à partir de ces données. */
export interface Unit {
  /** Titre (en français dans les JSON ; traduit à l'exécution selon l'interface). */
  t: string;
  /** Titre d'origine, clé stable (renseigné au chargement). */
  t0?: string;
  /** Niveau : 0 facile, 1 intermédiaire, 2 avancé, 3 expert. */
  lv: number;
  /** Description courte. */
  d: string;
  /** Astuce affichée dans le guide de l'unité. */
  tip?: string;
  p?: Phrase[];
  v?: Vocab[];
  c?: Mcq[];
  l?: Part2[];
  ph?: Photo[];
  /** Dictées (Voltaire). */
  dd?: string[];
  /** Conversations et lectures TOEIC (Parts 3, 4, 7). */
  cv?: unknown[];
  rd?: unknown[];
  /** Thèmes de rédaction. */
  wt?: string[];
  /** Coréen : unité d'alphabet (1 à 4), lettres [jamo, son, exemple], syllabes, paires minimales. */
  hg?: number;
  hj?: [string, string, string][];
  sy?: [string, string][];
  mp?: unknown[];
  /** Unité présente depuis la première version (sert aux migrations de progression). */
  orig?: boolean;
}

export interface Course {
  name: string;
  icon: string;
  /** Langue enseignée, au format BCP 47 (en-US, fr-FR, ko-KR). */
  lang: string;
  /** Famille de cours : trans (traduction), toeic, volt, ko… */
  kind: string;
  units: Unit[];
}

export interface Section {
  id: "en" | "fr" | "ko";
  name: string;
  flag: string;
  tracks: CourseId[];
}

/** Élément d'histoire : réplique (s, t, fr) ou question (q, o, a). */
export type StoryItem = { s: string; t: string; fr?: string } | { q: string; o: string[]; a: number };

export interface Story {
  id: string;
  t: string;
  ic: string;
  lv: number;
  /** Personnages : nom -> [M ou W (voix), emoji]. */
  cast: Record<string, [string, string]>;
  items: StoryItem[];
  /** Histoire du cours « Apprendre le français ». */
  fle?: boolean;
}

/** Exercice généré par make(type, ctx) et affiché par R[type]. */
export interface Exercise {
  /** Type : mc, tiles, type, match, speak, spot… (voir exercises/render.js). */
  t: string;
  /** Langue de l'audio et de la réponse. */
  lang: string;
  answer?: string;
  /** Réponses acceptées en plus de answer. */
  alts?: string[];
  options?: string[];
  [key: string]: unknown;
}

/** État d'un profil (objet S), sauvegardé dans localStorage « speakeasy-v1:<id> ». */
export interface State {
  /** Étapes faites : cours -> unité -> masque de 18 bits. */
  dn: Record<string, Record<number, number>>;
  /** Couronnes (versions extrêmes réussies). */
  ext: Record<string, number[]>;
  place: Record<string, number>;
  sec: "en" | "fr" | "ko";
  track: Record<string, CourseId>;
  xp: number;
  gems: number;
  streak: number;
  lastDay: string | null;
  goal: number;
  week: Record<string, number>;
  freeze: number;
  boostUntil: number;
  owned: string[];
  wear: string;
  bank: Record<string, unknown[]>;
  mist: Record<string, unknown[]>;
  badges: string[];
  set: {
    rate: number;
    sound: boolean;
    auto: boolean;
    haptic: boolean;
    remind: number;
    hideInstall: boolean;
    [k: string]: unknown;
  };
  onb: boolean;
  speakOff: number;
  listenOff: number;
  /** Version du format des données (migrations). */
  pv?: number;
  /** Date de dernière modification (synchronisation). */
  ts: number;
  [key: string]: unknown;
}
