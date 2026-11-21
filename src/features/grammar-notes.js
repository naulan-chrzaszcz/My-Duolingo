// Repères de grammaire reconnus dans une phrase (bloc « À savoir »), sans réseau.
// v38.2 : module à part, testé sur toutes les phrases des cours (tests/explain_notes.mjs).
// Règle d'or : mieux vaut ne rien dire qu'une note fausse ; chaque repère vérifie donc son contexte.
import { esc } from "../core/util.js";

// limites de mot qui comprennent les lettres accentuées (\b ne les connaît pas)
const B = "(?<![\\p{L}])",
  E = "(?![\\p{L}])";
const rx = s => new RegExp(s.replace(/\\B</g, B).replace(/\\E>/g, E), "u");

// ---------------- anglais ----------------
// mots en -ing qui ne sont pas des verbes après be (adjectifs, pronoms, noms)
const ING_NOT_VERB =
  "nothing|something|anything|everything|interesting|boring|amazing|exciting|surprising|tiring|relaxing|annoying|confusing|disappointing|embarrassing|frightening|shocking|charming|missing|outstanding|willing|morning|evening|thing|king|ring|spring|ceiling|during|wedding|meeting|building|training|parking|shopping|clothing|pudding|living|ongoing|upcoming|pending|existing|following|remaining|leading|challenging|demanding|rewarding|promising|convincing|misleading|appealing";
// mots en -ed qui ne sont pas des verbes au prétérit (noms, adjectifs, participes employés comme adjectifs)
const ED_NOT_PAST =
  "succeed|proceed|exceed|posted|informed|unused|authorized|authorised|furnished|overwhelmed|noted|allowed|bed|need|red|hundred|speed|feed|seed|indeed|weed|shed|sled|reed|greed|deed|bleed|breed|tired|bored|interested|excited|married|retired|worried|surprised|crowded|located|based|required|qualified|experienced|detailed|limited|advanced|skilled|talented|satisfied|disappointed|pleased|delighted|concerned|involved|supposed|used|scheduled|closed|dressed|scared|relaxed|confused|embarrassed|annoyed|amazed|shocked|stressed|organized|organised|complicated|crowded|delayed|included|attached|enclosed|related|united|naked|wicked|sacred|beloved|aged|blessed|ragged|rugged|learned|fixed|mixed|cooked|boiled|fried|baked|grilled|stuffed|canned|frozen|sliced|chopped|unexpected|expected|automated|dedicated|educated|sophisticated";
// après ces mots, un -ed est un participe ou un adjectif, pas un prétérit
const ED_AFTER =
  "am|is|are|was|were|be|been|being|get|gets|got|getting|have|has|had|having|'ve|'s|'re|'m|feel|feels|felt|seem|seems|seemed|look|looks|looked|very|so|too|really|quite|a|an|the|my|your|his|her|our|their|its|this|that|these|those|well|fully|not|n't|become|became|stay|stays|remain|remains|keep|keeps";
const PP_ADV = "almost|just|already|never|ever|not|always|recently|finally|also|still|really|often|been";
const PP =
  "\\w+ed|been|done|gone|seen|made|had|taken|written|eaten|known|given|found|sent|met|left|lost|bought|told|heard|read|said|paid|spent|forgotten|broken|chosen|spoken|driven|flown|grown|thrown|drunk|begun|come|become|run|won|kept|slept|felt|thought|brought|caught|taught|sold|understood";
const ED_NOT = new Set(ED_NOT_PAST.split("|"));
const ED_BEFORE = new Set(ED_AFTER.split("|"));
const ED_EED_OK = new Set(["agreed", "disagreed", "freed", "guaranteed"]);
/** Un verbe régulier au prétérit : un mot en -ed avec un sujet devant, sans be / have / get juste avant. */
function edPast(l) {
  if (/^(am|is|are|was|were|has|have|had)\b/.test(l)) return false; // question au passif ou au present perfect
  const w = l.split(/[^a-z']+/).filter(Boolean);
  for (let i = 1; i < w.length; i++) {
    const x = w[i];
    if (!/^[a-z]{2,}ed$/.test(x) || ED_NOT.has(x) || (/eed$/.test(x) && !ED_EED_OK.has(x))) continue;
    const p1 = w[i - 1];
    if (ED_BEFORE.has(p1) || /'(ve|re|m|d|s)$/.test(p1) || (/ly$/.test(p1) && i > 1 && ED_BEFORE.has(w[i - 2])))
      continue;
    // have / get / keep / be un peu plus tôt : causatif (« had my car repaired »), passif ou « keep me posted »
    if (
      w
        .slice(Math.max(0, i - 4), i - 1)
        .some(q => /^(have|has|had|get|got|gets|keep|keeps|be|been|being|is|are|was|were|am)$|'(ve|re|m)$/.test(q))
    )
      continue;
    return true;
  }
  return false;
}
const PROG = new RegExp(`\\b(am|is|are|was|were|'m|'re|'s)\\s+(not\\s+)?(?!(${ING_NOT_VERB})\\b)\\w+ing\\b`);
const FUT_TIME =
  /\b(tomorrow|tonight|next (week|month|year|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|summer|winter)|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this (weekend|evening|afternoon|summer|winter|friday|saturday)|in (january|february|march|april|month|june|july|august|september|october|november|december)|at the weekend)\b/;
const GOING_NOT_VERB =
  "the|a|an|my|your|his|her|our|their|its|this|that|these|those|school|work|church|bed|town|class|hospital|london|paris|seoul|korea|france|japan|china|it|him|them|me|us";

/** Règles anglaises : [nom, test(phrase en minuscules, phrase d'origine, notes déjà trouvées), texte]. */
const EN = [
  [
    "going",
    l =>
      new RegExp(
        `\\b(am|is|are|was|were|'m|'re|'s|be|being)\\s+(not\\s+)?going to (?!(${GOING_NOT_VERB})\\b)[a-z]+`,
      ).test(l),
    "be going to + verbe : un projet déjà décidé.",
  ],
  [
    "progfut",
    l => PROG.test(l) && FUT_TIME.test(l) && !/\bgoing to\b/.test(l),
    "be + verbe en -ing avec un moment à venir : un projet déjà organisé.",
  ],
  [
    "prog",
    (l, T, got) => !got.has("going") && !got.has("progfut") && PROG.test(l),
    "be + verbe en -ing : action en cours (forme progressive).",
  ],
  [
    "pp",
    l =>
      !/\b(should|could|would|must|might|may|'d)(n't| not)? have\b/.test(l) &&
      (new RegExp(`\\b(have|has|haven't|hasn't|'ve)\\s+((${PP_ADV})\\s+)?(${PP})\\b`).test(l) ||
        new RegExp(`^(have|has|haven't|hasn't)\\s+\\w+\\s+((${PP_ADV}|yet)\\s+)?(${PP})\\b`).test(l)),
    "have / has + participe passé : present perfect (un lien entre le passé et maintenant).",
  ],
  [
    "will",
    l => /\b(will|won't|'ll)\b/.test(l),
    "will + base verbale : futur, décision prise sur le moment ou prédiction.",
  ],
  ["did", l => /\b(did|didn't)\b/.test(l), "did / didn't + base verbale : question ou négation au passé."],
  [
    "do",
    l =>
      /\b(don't|doesn't|do not|does not)\b/.test(l) ||
      (/\?$/.test(l) &&
        /\b(do|does)\s+(i|you|we|they|he|she|it|your|the|my|our|their|his|her|this|these|people|anyone|someone|everyone)\b/.test(
          l,
        )),
    "do / does : auxiliaire des questions et des négations au présent ; le verbe reste à la base verbale.",
  ],
  ["like", l => /\b(would like|'d like)\b/.test(l), "would like : la manière polie de dire « want »."],
  [
    "modal",
    l =>
      /\b(can|can't|could|couldn't|should|shouldn't|must|mustn't|may|might|would(?! like)|wouldn't)\s+(not\s+)?[a-z]+/.test(
        l,
      ),
    "Après un modal (can, should, must, would…), le verbe reste à la base verbale, sans « to ».",
  ],
  [
    "cmp",
    l => /\b(more|less)\s+\w+\s+than\b|\b(?!(rather|other|longer than ever)\b)\w+er\s+than\b/.test(l),
    "Comparatif : adjectif court + -er, adjectif long avec more, puis than.",
  ],
  [
    "there",
    l => /\bthere\s+(is|are|was|were|isn't|aren't|wasn't|weren't)\b|\bthere's\b/.test(l),
    "there is / there are : « il y a », accordé avec le nom qui suit.",
  ],
  [
    "ed",
    (l, T, got) => !got.has("pp") && !got.has("did") && edPast(l),
    "Au prétérit, les verbes réguliers prennent -ed ; les irréguliers s'apprennent par cœur.",
  ],
];

// ---------------- français ----------------
const AUX_AVOIR = "ai|as|a|avons|avez|ont";
const AUX_ETRE = "suis|es|est|sommes|êtes|sont";
const FR_ADV =
  "pas|déjà|bien|jamais|beaucoup|trop|encore|toujours|souvent|vraiment|aussi|enfin|rien|plus|mal|tout|vite|presque";
// participes passés de avoir : terminaisons courantes, sauf les mots qui y ressemblent
const PART_END = "(é|ée|és|ées|i|ie|is|ies|it|ite|its|ert|erte|u|ue|us|ues|ait|aint|eint|uit)";
const NOT_PART =
  "du|au|trois|lieu|quelque|mois|fois|avis|pays|peu|jeu|feu|bleu|menu|bus|lit|plus|tout|prix|ici|aussi|lui|mari|ami|amie|amis|vendredi|lundi|mardi|mercredi|jeudi|samedi|dimanche|midi|souris|paris|nuit|fruit|bruit|huit|lait|petit|petite|petits|produit|circuit|tissu|vue|rue|avenue|salut|début|statut|but|jus|refus|abri|appétit|esprit|crédit|habit|lui|parapluie|pluie|vie|envie|partie|sortie|tête|été|côté|café|thé|bébé|clé|idée|année|journée|soirée|matinée|entrée|musée|lycée|épée|beauté|santé|liberté|qualité|société|université|cité|vérité|activité|réalité|difficulté|nationalité|spécialité|quantité|électricité|publicité|fié|occupé|fatigué|désolé|marié|pressé|fermé|ouvert|compris|situé|né|cassé|blessé|enrhumé|stressé|intéressé|surpris|perdu|assis|rond|connu|inconnu|tordu|aigu|nu|cru|bu|dû|su|vu|lu|eu|pu";
// avec être, le passé composé ne se forme qu'avec les verbes de mouvement (ou un verbe pronominal)
const ETRE_PART =
  "allé|allée|allés|allées|venu|venue|venus|venues|parti|partie|partis|parties|arrivé|arrivée|arrivés|arrivées|entré|entrée|entrés|entrées|sorti|sortie|sortis|sorties|resté|restée|restés|restées|tombé|tombée|tombés|tombées|né|née|nés|nées|mort|morte|morts|mortes|monté|montée|montés|montées|descendu|descendue|descendus|descendues|rentré|rentrée|rentrés|rentrées|retourné|retournée|retournés|retournées|devenu|devenue|devenus|devenues|revenu|revenue|revenus|revenues|passé|passée|passés|passées";
const PARTITIF_VB =
  "veux|veut|voulez|voulons|veulent|voudrais|voudrait|voudrions|voudriez|prends|prend|prenez|prenons|prennent|prendre|mange|manges|mangeons|mangez|mangent|manger|bois|boit|buvons|buvez|boivent|boire|achète|achètes|achetons|achetez|achètent|acheter|ai|as|a|avons|avez|ont|avoir|fais|fait|faisons|faites|font|faire|commande|commandes|commandons|commandez|commander|sers|sert|servez|servir|mets|met|mettez|mettre|avec|sans|reste|encore|vendez|vend|vends|cherche|cherchez|apportez|apporte|donnez|donne|faut";

const FR = [
  [
    "neg",
    l => rx(`\\B<(ne|n')\\s?\\S+(\\s\\S+)?\\s(pas|jamais|plus|rien|personne)\\E>`).test(l),
    "Négation : ne + verbe + pas (ne devient n' devant une voyelle).",
  ],
  [
    "pc",
    l =>
      rx(`\\B<(${AUX_AVOIR})\\s+((${FR_ADV})\\s+)?(?!(${NOT_PART})\\E>)\\p{L}+${PART_END}\\E>`).test(l) ||
      rx(`\\B<(${AUX_ETRE})\\s+((${FR_ADV})\\s+)?(${ETRE_PART})\\E>`).test(l) ||
      rx(
        `\\B<(me|m'|te|t'|se|s'|nous nous|vous vous)\\s?(${AUX_ETRE})\\s+((${FR_ADV})\\s+)?\\p{L}+(é|ée|és|ées|i|ie|is|ies|u|ue|us|ues|it|ite|its)\\E>`,
      ).test(l),
    "Passé composé : avoir ou être au présent + participe passé.",
  ],
  [
    "proche",
    l =>
      rx(
        `\\B<(je|tu|il|elle|on|nous|vous|ils|elles|ça)\\s+(ne\\s+)?(vais|vas|va|allons|allez|vont)\\s+(pas\\s+)?(?!(au|aux|à|en|chez|bien|mal|dans|sur|vers|là|y)\\E>)\\p{L}+(er|ir|re|oir)\\E>`,
      ).test(l),
    "Futur proche : aller au présent + infinitif.",
  ],
  [
    "estce",
    l => /est-ce qu|qu'est-ce/.test(l),
    "est-ce que transforme une phrase en question sans changer l'ordre des mots.",
  ],
  [
    "ilya",
    l => rx(`\\B<il y a\\E>`).test(l),
    "il y a : expression invariable pour dire qu'une chose existe ou se trouve là.",
  ],
  ["au", l => rx(`\\B<(au|aux)\\E>`).test(l) && !rx(`\\B<au revoir\\E>`).test(l), "au = à + le ; aux = à + les."],
  [
    "part",
    l =>
      rx(`\\B<(${PARTITIF_VB})(-vous|-tu|-nous|-il|-elle)?\\s+(du|de la|de l')\\s?\\p{L}`).test(l) ||
      rx(`\\B<(il y a|y a-t-il)\\s+(du|de la|de l')\\s?\\p{L}`).test(l),
    "du, de la, de l' : article partitif, pour une quantité qu'on ne compte pas.",
  ],
  [
    "pron",
    l =>
      rx(`\\B<(je|j'|tu|il|elle|on|nous|vous|ils|elles)\\s?(ne\\s+|n')?(me|m'|te|t'|se|s'|nous|vous)\\s?\\p{L}`).test(
        l.replace(/\bs'il\b/g, ""),
      ) &&
      !rx(`\\B<(nous|vous)\\s+(${AUX_AVOIR}|${AUX_ETRE})\\E>`).test(l) &&
      // « nous nous », « vous vous », « je me »… : le pronom reprend le sujet
      rx(
        `\\B<(je\\s?(ne\\s+|n')?(me\\s|m')|tu\\s?(ne\\s+|n')?(te\\s|t')|(il|elle|on|ils|elles)\\s?(ne\\s+|n')?(se\\s|s')|nous\\s(ne\\s+|n')?nous\\s|vous\\s(ne\\s+|n')?vous\\s)`,
      ).test(l.replace(/\bs'il\b/g, "")),
    "Verbe pronominal : le pronom (me, te, se…) se place avant le verbe.",
  ],
];

// ---------------- coréen ----------------
const KO_END = [
  [/고 싶/, "-고 싶어요 : « vouloir » faire quelque chose."],
  [/주세요[.?!]?$/, "주세요 : « s'il vous plaît », pour demander quelque chose ou un service."],
  [/(으)?세요[.?!]?$/, "-(으)세요 : demande polie ou marque de respect envers la personne."],
  [/[았었했였](어요|습니다)/, "-았/었어요 : le verbe est au passé."],
  [/(을|ㄹ|를)? ?거예요[.?!]?$/, "-(으)ㄹ 거예요 : futur ou intention."],
  [/지 않|(^| )안 /, "안 + verbe, ou verbe + -지 않아요 : la négation."],
  [/(있어요|없어요)[.?!]?$/, "있어요 = il y a, avoir ; 없어요 = il n'y a pas, ne pas avoir."],
  [/니까\?$/, "-(스)ㅂ니까 ? : question en style formel."],
  [/니다[.!]?$/, "-(스)ㅂ니다 : style formel poli (travail, annonces, inconnus)."],
  [/요[.?!]?$/, "La terminaison -요 est le style poli de tous les jours."],
];
// mots qui finissent par une syllabe de particule sans en être une
const KO_NOT_PART = new Set(
  "묵을 식은 심은 밝은 남은 맑은 늙은 젊은 그런데 근데 아까 이따가 같이 가까이 많이 빨리 천천히 깨끗이 아이 오이 누가 어디가 거기가 여기가 저기가 우리가 고양이 강아지가 아버지 어머니 할머니 할아버지 언니 누나 오빠 형이 동생이 친구가 회사 의사 가수 교사 요리사 이사 인사 감사 사이 차이 나이 머리 다리 거리 소리 자리 요리 우리 저희 미국 중국 한국 영국 사과 오후 오전 지금 조금 처음 다음 이름 마음 사람 아침 저녁 점심 가게 시계 무게 내게 제게 은행 영화 전화 대화 노래 내일 매일 주말 시간 공원 병원 학원 식당 이번 저번 지난 다른 같은 좋은 많은 작은 높은 낮은 넓은 좁은 짧은 싫은 붉은 젊은 어린 예쁜 나쁜 바쁜 아픈 슬픈 기쁜 큰 하는 있는 없는 가는 오는 먹는 보는 사는 파는 아는 노는 맛있는 재미있는 멋있는 맛없는 재미없는 그런 이런 저런 어떤 무슨 어느 아는 모르는 좋아하는 싫어하는".split(
    " ",
  ),
);
// syllabe hangul terminée par une consonne (batchim) : 은, 을, 이 s'y attachent ; 는, 를, 가 après une voyelle
const batchim = ch => {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 ? c % 28 !== 0 : null;
};
const okPart = (w, p) => {
  const b = batchim(w.slice(-p.length - 1, -p.length));
  if (b === null) return false;
  return p === "은" || p === "을" || p === "이" ? b : p === "는" || p === "를" || p === "가" ? !b : true;
};
// un verbe à la forme qui qualifie un nom (« 요리하는 걸 », « 식은 죽 ») ou un verbe en -어/아 가다 n'est pas une particule
const KO_VERB_FORM = /(하는|있는|없는|되는|싶은|싶는|[어아러와]가|다가)$/;
// après ces mots, le mot d'avant est un verbe qui qualifie (« 늦을 거예요 », « 만나는 게 », « 받을 수 »)
const KO_AFTER_VERB = /^(거예요|거야|거|것|게|걸|수|때|줄|적|뻔|데|중|사람|곳)/;
const KO_PART = [
  [/^.+에서$/, "에서 indique le lieu où se passe l'action, ou le point de départ.", "에서"],
  [/^.+[은는]$/, "은/는 marque le thème : ce dont on parle."],
  [/^.+[을를]$/, "을/를 marque le complément d'objet du verbe."],
  [/^.+에$/, "에 indique le lieu où l'on va, ou le moment.", "에"],
  [/^.+[이가]$/, "이/가 marque le sujet du verbe."],
];

/** Notes de grammaire (HTML échappé) reconnues dans la phrase T, 2 au plus. */
export function grammarNotes(T, lang) {
  return grammarKeys(T, lang).map(([, txt, w]) =>
    w ? `<span class="notr" lang="ko">${esc(w)}</span> : <span>${esc(txt)}</span>` : esc(txt),
  );
}
/** Même chose en données brutes : [nom de la règle, texte, mot coréen éventuel] (sert aux tests). */
export function grammarKeys(T, lang) {
  const out = [];
  if (!T || !lang) return out;
  if (lang.startsWith("ko")) {
    const toks = T.replace(/[.?!,]/g, "")
      .split(" ")
      .filter(Boolean);
    for (const [re, txt, p] of KO_PART) {
      // le dernier mot est le verbe ; un mot connu qui finit « comme » une particule n'en porte pas
      const w = toks
        .slice(0, -1)
        .find(
          (x, i) =>
            x.length > 1 &&
            re.test(x) &&
            !KO_NOT_PART.has(x) &&
            !KO_VERB_FORM.test(x) &&
            !KO_AFTER_VERB.test(toks[i + 1] || "") &&
            okPart(x, p || x.slice(-1)),
        );
      if (w) {
        out.push(["ko.part", txt, w]);
        break;
      }
    }
    const e = KO_END.find(([re]) => re.test(T));
    if (e) out.push(["ko.end", e[1]]);
    if (!out.length && toks.length >= 2) out.push(["ko.verb", "En coréen, le verbe se place à la fin de la phrase."]);
    return out;
  }
  // « May » en majuscule hors début de phrase : le mois, pas le modal
  const low = T.replace(/(?<!^)\bMay\b/g, "month")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  const got = new Set();
  for (const [name, test, txt] of lang.startsWith("en") ? EN : lang.startsWith("fr") ? FR : []) {
    if (test(low, T, got)) {
      got.add(name);
      out.push([name, txt]);
    }
    if (out.length === 2) break;
  }
  return out;
}

// ---------------- astuce de l'unité : seulement si elle parle de la phrase ----------------
const STOP = new Set(
  (
    "the and for you your are was were his her its our their this that these those with have has had not but can will " +
    "what when where who how why all any one two out from into about there then than them they she him i'm it's don't " +
    "les des une est pas que qui pour avec dans sur son ses mon mes ton tes vous nous elle ils elles sont être avoir " +
    "plus mais comme tout tous très aussi bien fait faire c'est j'ai qu'il n'est cette ces leur leurs"
  ).split(" "),
);
const words = (s, ko) =>
  ko
    ? (String(s).match(/[가-힣]{2,}/g) || [])
        .map(w => w.replace(/(은|는|이|가|을|를|에서|에|요)$/, ""))
        .filter(w => w.length >= 2)
    : (
        String(s)
          .toLowerCase()
          .replace(/[’]/g, "'")
          .match(/[\p{L}']{3,}/gu) || []
      ).filter(w => !STOP.has(w));
/** L'astuce cite-t-elle un mot ou une tournure de la phrase ? (on ne regarde que ses exemples entre « ») */
export function tipFits(tip, T, lang) {
  if (!tip || !T) return false;
  const ko = String(lang).startsWith("ko");
  // exemples entre « » ; en coréen, tout mot en hangul de l'astuce est un exemple
  const quoted = ko ? tip : (String(tip).match(/«([^»]+)»/g) || []).join(" ");
  // sans exemple entre guillemets, l'astuce est trop générale pour être rattachée à une phrase
  if (!quoted) return false;
  const tw = new Set(words(T, ko));
  return words(quoted, ko).some(w => tw.has(w) || (ko && [...tw].some(x => x.includes(w))));
}
