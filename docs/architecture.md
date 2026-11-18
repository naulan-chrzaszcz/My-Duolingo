# Architecture du code (v36)

La v26 reprend exactement le comportement de la v25 dans un projet découpé en modules.

- Le HTML de 430 écrans et leçons a été comparé entre la v25 et la v26 avec le même hasard : il est identique.
- Toute la batterie de tests passe.

## Chaîne de construction

```
src/main.js ──esbuild──▶ un seul script (IIFE) ─┐
src/styles/style.css ─┬─────────────────────────┼─▶ dist/index.html (autonome)
scripts/darkgen.mjs ──┘ thème sombre généré      │
src/index.html (squelette) ──────────────────────┘
public/ (sw.js, manifest, icônes, polices) ──────▶ dist/
server/ (api PHP, installateur, LISEZ-MOI) ──────▶ dist/
```

- `scripts/build.mjs` remplace `__CACHE__` dans `sw.js` par `speakeasy-v<version>-<empreinte>`.
  - Chaque build différent force la mise à jour sur les téléphones.
- `npm run zip` produit `release/speakeasy-production.zip`, la même chose que `dist/` mais minifiée.

## Modules

| Dossier | Modules | Rôle |
| --- | --- | --- |
| `content/` | `data.js`, `index.js`, `courses/*.json`, `grammar/*.json`, `stories.json`, `sections.json`, `unit-remap.json`, `real-photos.json`, `pics.json`, `legacy.json` | Contenu des cours, gabarits des notions de grammaire et mots illustrés. `index.js` l'adapte à la langue d'interface au chargement |
| `i18n/` | `locale.js`, `translate.js`, `en.json`, `ko.json`, `dict-en.js`, `dict-ko.js` | Langue d'interface, traduction du DOM à la volée, dictionnaires |
| `core/` | `util.js`, `state.js`, `progress.js`, `accounts.js`, `xp.js` | Outils, état `S` du profil, migrations, progression, profils locaux, XP |
| `exercises/` | `generate.js`, `distractors.js`, `validate.js`, `render.js`, `hangul.ts`, `drills.ts` | `make(type, ctx)`, mauvaises réponses, correction, affichage `R[type]`, hangul, phrases générées par gabarits |
| `lesson/` | `build.js`, `engine.js`, `writing.js`, `keyboard.js` | Construction et déroulé d'une leçon (`L`), rédactions, clavier |
| `features/` | `placement.js`, `quests.js`, `word-bank.js`, `theme-training.js`, `ai-units.js`, `coach.js`, `grammar.js`, `revision.ts` | Test de niveau, quêtes et badges, répétition espacée, thèmes, unités IA, coach, notions de grammaire, révision IA illimitée |
| `screens/` | `path.js` (parcours et chapitres), `training.js`, `stories.js`, `league.js`, `quests.js`, `shop.js`, `profile.js`, `settings.js`, `stats.js`, `streak.js`, `accounts.js`, `onboarding.js`, `language.js` | Un module par écran ou fenêtre principale |
| `services/` | `cloud.js`, `ai.js`, `ai-cache.ts`, `reminders.js`, `speech.js` | Comptes en ligne et ligue, IA, réserve des réponses de l'IA sur l'appareil, rappels push, voix et micro |
| `ui/` | `ui.js`, `router.js`, `platform.js`, `mascot.js`, `scenes.ts`, `icons.ts`, `pics.ts`, `pics/*.ts`, `back-button.js`, `typography.js` | Toasts et modales, routage par hash, iOS/Android/thème, mascotte et scènes de Horang, icônes SVG (drapeaux, coupes, médailles), images de vocabulaire et scènes de la Part 1, bouton retour, typographie |
| racine | `main.js`, `globals.js`, `types.ts` | Démarrage, API globale, types |

## Démarrage (`src/main.js`)

1. Les imports chargent tous les modules. `i18n/locale.js` vient en premier (langue), puis `content/index.js` (contenu traduit).
   - Les modules ne font que déclarer des fonctions et des constantes.
   - Exceptions : `R.type = …` dans `render.js`, et l'adaptation du contenu dans `content/index.js`.
2. `globals.js` expose les exports sur `window` (gestionnaires `onclick` inline, tests, console).
3. Les instructions de démarrage s'exécutent ensuite, dans l'ordre de la v25 :
   - traduction du DOM et thème ;
   - écouteurs, voix ;
   - chargement du profil, rendu, synchronisation ;
   - bouton retour, typographie.

L'ordre compte : la traduction du DOM doit observer la page avant la typographie, sinon les espaces insécables empêchent de retrouver les clés.

## État partagé

- `S` (profil, `core/accounts.js`) et `L` (leçon, `lesson/engine.js`) sont des liaisons exportées.
  - Les autres modules les lisent toujours à jour.
  - Pour les remplacer : `set_S()` et `set_L()`.
- `ui/back-button.js` enveloppe `modal`, `closeModal`, `openSession`, `closeLesson` et `playStory` avec les `set_…` correspondants.
  - Ainsi, chaque fenêtre ouverte ajoute une entrée d'historique.

## Notions de grammaire (v27)

- `content/grammar/en.json`, `fr.json`, `ko.json` : notions (temps, liaison, modaux, prépositions ou particules, la phrase, les mots), règles, gabarits de QCM et de phrases à traduire, et correspondance avec les unités des cours (`units`). Le n° de règle d'un QCM peut être une liste qui suit le choix lié « 1= » (v38) : la bonne réponse change avec l'indice tiré, l'explication aussi.
- `exercises/drills.ts` développe les gabarits (`genItem`, `genPair`) et mélange des phrases générées aux leçons : `ctxFor` appelle `mixDrills`, sauf avec l'option `noDrill`.
- `features/grammar.js` : fenêtre de choix, mémo d'une règle, séance de 12 exercices (`drillExercises`). L'ordre des exercices est tiré à chaque séance (`planOrder`, v38) ; « Trouve l'erreur » ne prend que les phrases dont le trou est un mot entier (pas 도서관___ ni j'___), ce qui permet de le proposer aussi en coréen.
- Le taux de réussite par règle est gardé dans `S.drill` (`{ id de la règle: [réponses, erreurs] }`), synchronisé avec le profil.

## Points faibles connus (prochaines étapes)

1. **Traduction par texte exact.** Le code est écrit en français, puis traduit en cherchant chaque texte affiché dans `en.json` et `ko.json`. Une virgule différente suffit à laisser un texte en français. Le test `i18n_leaks` parcourt tous les écrans en anglais et en coréen et échoue sur un texte resté en français (v31.1 : il ignorait toute la page à cause de l'attribut `lang` de `<html>`, les textes des chapitres et des quêtes de la v29 étaient passés au travers). Prochaine étape : des clés `t('cle')`.
2. **Un type d'exercice est réparti sur plusieurs fichiers** (génération, affichage, audio, coach, tests). Prochaine étape : un dossier par type avec `make`, `render` et `solve` réunis.
3. **Rendu par chaînes HTML et état global.** Simple et rapide, mais sans composants. À garder tant que l'app reste de cette taille.

## Direction artistique v28

- Icônes : `src/ui/icons.ts` (`ic(nom, taille)`, `flagSvg`, `trophySvg`, `medalSvg`, `COURSE_IC`). Trait en `currentColor` : la couleur vient du CSS.
- Couleurs : variables CSS (`--card`, `--ink`, `--ink2`, `--line`, `--soft`…) ou couleurs claires connues de `scripts/darkgen.mjs`. Les styles en ligne ne passent pas au thème sombre : préférer une classe. `#FFFFFE` sert de blanc qui reste blanc en sombre.
- Barre du haut : `renderTop()` (`ui/router.js`) ; choix de langue : `sectionPicker()` (modale `langdrop`).
- Parcours : pièces `.node.coin` (`stepKind`), bannière d'unité collante (`--toph` = hauteur de la barre du haut), bulle d'étape `placePop()` dans `screens/path.js`.
- Série : `screens/streak.js` (`openStreak`, paliers `MILESTONES`, `streakMilestone`, `streakReset`). Historique : `S.week` garde ~13 mois, `S.frz` les jours protégés par un gel, `S.smil` les paliers déjà payés pour la série en cours.
- Paramètres (v28.1) : `screens/settings.js`, ouvert par la roue dentée du profil. Adresses `#reglages` (menu) et `#reglages/<page>` (`preferences`, `compte`, `notifications`, `claude`, liste `SETTINGS_PAGES`). Les réglages gardent leurs identifiants ; `bindSettings()` ignore ceux qui ne sont pas sur la sous-page affichée.
- Chapitres (v29) : `chapters()`, `curChapter()`, `setChapter()` et `renderChapters()` dans `screens/path.js` ; chapitre choisi dans `S.chap[cours]`, adresse `#chapitres`. Les fonctions de repli des unités restent mais ne sont plus affichées.
- Quêtes (v29, variées en v32) : `screens/quests.js` (adresse `#quetes`) ; `QUEST_POOL` et `todayQuests()` dans `features/quests.js` (3 quêtes tirées par jour, gardées dans `S.q.ids` ; compteurs `S.q.l/c/s/ok/sec/p/a/st/t/m` remis à zéro chaque jour) ; quête du mois `S.qm` (`questMonth`, `QM_GOAL`, `QM_STEPS`). `checkQuests(true)` renvoie ce qui vient d'être gagné sans afficher de bulle : la fin de séance (`finish()` de `lesson/engine.js`) l'affiche elle-même, avec les badges (`BADGE_MEDAL`).
- Réglages du serveur (v32) : `api/data/config.php` (`vapid_subject`, `cron_key`, `api_key`), écrit par l'installateur et lu par `remind.php` et `generate.php` ; il survit aux mises à jour par unzip.
- XP (v32) : `S.xpv = 2` marque le nouveau barème ; `hydrate()` convertit l'ancien objectif et valide les chapitres passés au test de niveau (`placeValidate`).
- Explications (v33) : `features/explain.js` — `explainHtml(ex, res, L)` fabrique le bloc « À savoir » du pied de page (règle `e` de l'exercice, repères de grammaire par expressions régulières `EN`, `FR`, `KO_END`, `KO_PART`, mots clés, astuce d'unité) ; `bindExplain()` branche le bouton IA (prompt `explainPrompt` en direct, mode `explain` de `generate.php` par le relais).
- « Trouve l'erreur » (v33) : un exercice `spot` peut porter `parts` (plusieurs phrases, chacune `faulty` ou non) ; `ctx.spot1` force une seule phrase.
- Séances (v33) : `shorten(T, n)` dans `lesson/build.js` ramène un modèle de leçon à `LESSON_LEN` exercices (9 depuis la v37, plus au plus une erreur passée à revoir). Les repères de thème (`STAGE_AT`, `stageLabel()`) ont été retirés en v35 au profit des titres d'unités.
- Leçon bilan (v33) : `startBilan()` dans `features/coach.js` choisit les unités et lance `startAI(..., { bilan: true, words })`.
- Unités affichées (v34) : `PARTS = 3`, `PSZ = 6`, `partSteps(cours, u, partie)` et `partsDone(cours, u)` dans `core/progress.js`. Une « unité » du contenu (`C.units[u]`, 18 étapes, masque `S.dn`) reste l'unité d'enregistrement ; le parcours (`screens/path.js`) en fait trois sections `#unit<u>`, `#unit<u>p1`, `#unit<u>p2`. Verrouillage, guide, couronnes et `relayout` restent au niveau du thème.
- Unités à sujet propre (v35) : champ `parts` d'un thème (`types.ts`). `partUnit(U, partie)` et `stepTier(U, n)` dans `lesson/build.js` donnent le contenu et le palier d'une étape (chaque liste nommée dans la partie est restreinte à ses index, les autres restent communes ; le bilan, étape 17, et la version extrême prennent tout le thème) ; les bannières des sections sont dessinées en intertitres par le CSS. Depuis la v36, une seule bannière collante `#pathban` (classe `.pathban`) est placée en tête du parcours ; `bannerSync(v, cid)` y recopie la bannière de la dernière section dont l'intertitre est passé sous elle (la première section du chapitre, classe `first`, n'a pas d'intertitre).
- Parcours linéaire (v36) : `stepOpen(cours, u, n)` dans `core/progress.js` n'ouvre que les étapes faites, l'étape conseillée (`nextStep`) et l'étape qui suit une étape faite de la même unité (progression commencée avec l'ancien parcours libre). `unitOpen` garde le verrou du hangul. La fenêtre « Étape verrouillée » renvoie à l'étape conseillée.
- Contenu propre à l'unité (v36) : `partUnit` découpe aussi les images (`pk`) et recopie `P.g` dans `g` ; `mixDrills()` (`exercises/drills.ts`) prend `U.g` s'il existe, sinon les notions du thème (`units[cours][titre]` du fichier de grammaire). Le bilan (étape 17) garde tout le thème.
- Scènes de Horang le long du parcours : `ui/scenes.ts` (`horangScene`).
- IA (v31.1) : la clé se règle dans Paramètres › Mon Claude (`#reglages/claude`), tous les messages y renvoient ; la création d'unité (`genUnit`) envoie aussi `titles`, les titres des unités plus anciennes que les 14 dernières, pour éviter un thème déjà traité.
- IA (v29) : `weakRuleIds()` / `weakRules()` dans `services/ai.js` envoient les règles de grammaire les moins réussies (`weak`) au prompt (`generate.php` et prompt direct) et ajoutent 3 phrases générées par gabarits à chaque séance IA ou locale. Les QCM générés peuvent porter un indice (5ᵉ champ) qui permet l'exercice `fill`.
- Réserve de l'IA (v38.2) : `aiAsk()` passe par `services/ai-cache.ts` (IndexedDB `speakeasy-ai`, sur l'appareil, jamais synchronisée). Clé = empreinte du prompt (jamais le texte). Exercices : 3 versions par demande, puis l'une d'elles au hasard sans appeler Claude ; mots, explications, corrections : 1 version ; histoires et unités créées : jamais (doublons). Réserve valable 30 jours, 60 demandes au plus (`AI_CACHE`). Une réponse n'est gardée que si `o.ok(raw)` l'accepte ; hors ligne, la réserve est resservie même incomplète. Pour que la même séance retrouve sa réserve, `aiRequest()` choisit les phrases vues de façon régulière (`spread`) et `weakRules()` arrondit les pourcentages à la dizaine.
- Révision IA illimitée (v38.2, `features/revision.ts`) : `startAI(..., { rev: true })` appelle l'IA sans réserve (`aiAsk` avec `cache: false`). `revRecord()` garde en fin de séance le taux de réussite (`S.revAcc[cid]`, 5 dernières séances, fusionné entre appareils) ; `revPerf()` en tire `perf` (`up` / `keep` / `down`) et `acc`, envoyés dans la demande ; la consigne est écrite par `revPerfText()` et, à l'identique, par `generate.php`. `revFailed()` reprend jusqu'à 6 exercices ratés du cours (à revoir, ou pas encore réussis depuis l'erreur).
- Entraînement : `TMAP` (titre de carte → rubrique, icône, couleur) dans `screens/training.js`.

## Images de vocabulaire et scènes (v30)

- `content/pics.json` : mots illustrés `[id, catégorie, français, anglais, coréen, romanisation]`.
- `ui/pics/kit.ts` : outils de dessin (`ci`, `el`, `re`, `pa`, `li`, `limb`, `star`, `svg`), contour `K` et palette `C`.
- `ui/pics/icons-a.ts`, `icons-b.ts` et `icons-c.ts` (v31, vie coréenne) : un dessin par mot, repère 64 × 64.
- `ui/pics/people.ts` : personnages (`person` : pose, direction, vue, mains…) et décors (`room`, `outside`, `desk`, `chairS`…).
- `ui/pics/scenes-p1.ts` : scènes de la Part 1, repère 160 × 100, indexées par la phrase correcte.
- `ui/pics.ts` : `picSvg(id)`, `picWord(id, langue)`, `hasPic(id)`, `p1Svg(phrase)`, `PIC_WORDS`.
- Unités : champ `pk` (liste d'identifiants). `ctxFor` le charge dans `ctx.pk` ; types d'exercice `pic` (mot → 4 images) et `picw` (image → 4 mots). Sans `pk`, ils retombent sur `mcw` puis `mc`.
- Les cartes d'images gardent un fond blanc (`#FFFFFE`) en thème sombre.
- Contenu propre à chaque leçon (v37) : `lessonFocus(UU, i, k)` dans `lesson/build.js` coupe chaque liste de l'unité (phrases, mots, QCM, Part 2, conversations, textes, dictées, images…) en `k` tranches dans l'ordre de l'auteur ; la leçon `i` ne garde que la sienne (les mots d'une association peuvent être complétés par ceux des leçons précédentes). `ctxFor(..., { cap: 2 })` limite l'usage d'un élément dans une leçon (`make0` passe au type suivant) ; `take()` choisit la phrase à trou la moins utilisée, jamais celle de l'exercice précédent. Le test `lesson_unique` construit toutes les leçons de tous les cours et vérifie qu'aucun élément d'un thème ne revient dans deux leçons.
- Base de données (v37) : `server/api/migrate.php` (`speakeasy_db($chemin)`) ouvre la base, la crée et la met à jour. La version du schéma est `PRAGMA user_version` ; chaque étape de `speakeasy_migrations()` n'ajoute que des tables ou des colonnes. Avant de migrer une base existante, une copie `speakeasy-avant-v<N>-depuis-v<M>-<date>.sqlite` est faite dans `api/data/`. `account.php`, `push.php` et `remind.php` passent tous par cette fonction.
