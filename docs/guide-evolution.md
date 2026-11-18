# Guide d'évolution : comment ajouter…

Chaque recette dit quels fichiers toucher. Après toute modification :

```bash
npm run check   # construit et vérifie les types
npm test        # tests rapides ; npm run test:all avant de livrer
```

## Une unité dans un cours existant

1. Ouvrir `src/content/courses/<cours>.json` et ajouter un objet dans `units`.
   - La place dans la liste est l'ordre du parcours ; le champ `lv` donne le niveau (0 à 3).
2. Champs :
   - `t` : titre.
   - `d` : description.
   - `tip` : astuce du guide.
   - `p` : phrases `[français, cible, ...variantes acceptées]`.
   - `v` : vocabulaire `[français, cible]`.
   - `c` : QCM `[question avec ___, options, index de la bonne réponse, explication]`.
   - TOEIC : `l` (Part 2), `ph` (Part 1), `cv` et `rd` (Parts 3, 4 et 7). Voltaire : `dd` (dictées).
   - `pk` : mots illustrés de l'unité (identifiants de `src/content/pics.json`) pour les exercices en images et le guide.
   - Le détail est dans `src/types.ts` (interface `Unit`).
3. Viser au moins 8 phrases et 6 mots : les 18 étapes du thème (affichées comme 3 unités de 6 étapes depuis la v34) sont générées à partir de ces données.
4. Traduire le titre, la description, l'astuce et les phrases françaises :
   - section `content` de `src/i18n/ko.json`, pour les cours anglais et FLE vus depuis l'interface coréenne ;
   - section `content` de `src/i18n/en.json`, pour Voltaire et coréen vus depuis l'interface anglaise.
5. Lancer `node tests/run.mjs data_integrity` puis `node tests/run.mjs play_lessons fr <cours>`.

Unités à sujet propre (v35) : tout thème porte un champ `parts` de trois objets `{ t, p, v, c }` — `t` est le titre-objectif de l'unité affichée (« Commande une boisson »), `p`, `v` et `c` les index des phrases, mots et QCM du thème qui lui reviennent. Les autres listes peuvent être découpées de la même façon (`dd` pour Voltaire, `hj`, `sy`, `mp` pour le hangul, `ph`, `l`, `cv`, `rd` pour le TOEIC) ; une liste absente d'une partie reste commune au thème. Chaque élément d'une liste découpée doit appartenir à une seule unité ; viser au moins 4 phrases, 3 mots et 2 QCM par unité (3 QCM et 1 dictée pour Voltaire, 2 lettres pour le hangul). Traduire les titres dans la section `content` de `ko.json` (et de `en.json` pour Voltaire et le coréen). Depuis la v36, les images (`pk`) se découpent de la même façon, et `g` donne les notions de grammaire générées propres à l'unité (ids de `content/grammar/<langue>.json`, pris parmi ceux du thème ; liste vide = aucune) : sans `g`, l'unité reçoit toutes les notions du thème, ce qui mêle des exercices hors sujet. `node tests/run.mjs unit_parts` vérifie tout cela. Un thème sans `parts` s'affiche avec le titre et la description du thème sur ses trois unités.

Insérer une unité au milieu est possible : la progression des profils est recalée par titre d'unité au chargement (`relayout` dans `core/progress.js`, liste `S.lay`). Garder les unités triées par niveau (`lv` croissant) et ne jamais renommer le titre d'une unité existante (sa progression serait perdue).

## Une image de vocabulaire (v30)

1. Ajouter la ligne `[id, catégorie, français, anglais, coréen, romanisation]` dans `src/content/pics.json` (français avec son article : « la pomme »).
2. Dessiner l'image dans `src/ui/pics/icons-a.ts`, `icons-b.ts` ou `icons-c.ts`, sous la même clé `id` : repère 64 × 64, outils de `kit.ts`, contour automatique.
3. L'ajouter au champ `pk` des unités concernées.
4. Vérifier le rendu : `trainPics("<cours>")` dans la console, puis `node tests/run.mjs data_integrity`.

## Une scène de la Part 1 (v30)

- Dans `src/ui/pics/scenes-p1.ts`, ajouter une entrée dont la clé est exactement la phrase correcte de la scène (`ph` de l'unité).
- Ne dessiner que ce que dit la bonne réponse, pour que les trois autres phrases restent fausses.
- `data_integrity` signale toute scène sans dessin ni photo.

## Un nouveau cours

1. Créer `src/content/courses/<id>.json` sur le modèle d'un cours existant (`name`, `icon`, `lang`, `kind`, `units`).
2. Le déclarer dans `src/content/data.js` (import + entrée dans `COURSES`).
3. L'ajouter aux `tracks` d'une section dans `src/content/sections.json`.
4. `kind` choisit le modèle de leçon dans `TEMPL` (`src/exercises/generate.js`). Un nouveau `kind` demande son propre modèle.
5. Adapter `content/index.js` si le cours doit être masqué ou traduit selon la langue d'interface.

## Un texte d'interface

1. Écrire le texte en français dans le code, comme d'habitude.
2. Ajouter la même clé, au caractère près, dans la section `ui` de `src/i18n/en.json` et de `src/i18n/ko.json`.
3. Une partie variable s'écrit `¤` dans la clé.
   - Exemple : `"Bravo ¤ !": "Well done ¤!"`.
   - `¤1`, `¤2`… changent l'ordre des parties.
4. Vérifier avec `node tests/run.mjs i18n_cards`, `node tests/run.mjs i18n_leaks en` et `node tests/run.mjs i18n_leaks ko` : ce dernier test échoue si un texte d'interface reste en français sur un écran.
5. Nouvel écran ou nouvelle fenêtre : l'ajouter à la liste parcourue par `tests/i18n_leaks.py` ; un texte qui n'apparaît que dans un déroulé (fin de séance, quête, fenêtre) va dans `tests/i18n_flows.py`.

## Une carte d'entraînement

1. `src/screens/training.js`, fonction `renderTrain` : ajouter un `add(icône, titre, description, ...)` à l'endroit voulu.
2. Écrire la fonction qui lance la séance, sur le modèle de `trainDictee` ou `trainChoice` :
   - fabriquer des exercices avec `make(type, ctxFor(cours, unités))` ;
   - les lancer avec `openSession({ mode: 'train', cid, exs })`.
3. Choisir sa rubrique, son icône et sa couleur dans `TMAP` (même fichier) ; sans entrée, la carte va dans « Défis & IA ».
4. Traduire le titre et la description (voir « Un texte d'interface »).

## Un type d'exercice

1. Génération : dans `src/exercises/generate.js`, fonction `make0`, ajouter une branche `if (t === "montype") return { t, lang, answer, ... }`.
2. Affichage : dans `src/exercises/render.js`, ajouter `R.montype = (ex, b) => { ... }`.
   - La fonction remplit le conteneur `b`, appelle `setReady(true)` quand une réponse est prête.
   - Elle renvoie `{ grade: give => ({ ok, ... }), key: i => ... }`. Modèle simple : `R.mc`.
3. Utilisation : l'ajouter dans un modèle de leçon (`TEMPL` dans `generate.js`) ou une carte d'entraînement.
4. Si c'est un exercice d'écoute ou de micro : l'ajouter dans `isAudioEx` et `pauseAudio` (`src/lesson/engine.js`).
5. Libellé du type pour le coach : `TYPE_FR` dans `src/features/coach.js`.
6. Tests : ajouter la bonne réponse automatique dans `tests/solver.py`.
   - Explication après la réponse : renvoyer `exp` (ou `exps`) dans le résultat de `grade`, sinon `features/explain.js` cherche un repère de grammaire dans la phrase ; pour un nouveau repère, ajouter une ligne `[expression régulière, texte]` dans `EN`, `FR`, `KO_END` ou `KO_PART` et traduire le texte.
7. Traduire les nouveaux textes (voir « Un texte d'interface »).

## Une notion de grammaire, une règle ou un gabarit de phrase

1. Ouvrir `src/content/grammar/<langue>.json` (`en` : anglais, textes en français ; `fr` : « Learn French », textes en anglais ; `ko` : coréen, textes en français).
2. Une règle (`subs`) a un `id`, un titre `t`, un niveau `lv`, un mémo `memo`, ses règles `r`, ses QCM `i` et, en anglais et en FLE, des phrases à traduire `p`.
3. QCM : `[question avec ___, options, n° de règle, indice, autres réponses acceptées]`.
   - Le n° de règle peut être une liste, une entrée par choix du lien `{1=…}` : `["{1=Yesterday|So far} I ___ …", ["{1=went|have been}", "{1=have been|went}", …], [0, 1]]`. C'est le meilleur moyen d'empêcher qu'on retienne la réponse d'une phrase : la même phrase demande une autre forme selon l'indice tiré.
   - Viser au moins 8 gabarits par règle, presque tous avec des parties variables, et pas plus de la moitié des phrases avec la même bonne réponse : `grammar_drills` le vérifie.
   - La première option est la bonne ; les autres doivent être de vraies formes fausses dans cette phrase (pas de mots inventés).
   - L'indice (verbe à l'infinitif…) autorise l'exercice « écris le mot qui manque ».
   - `{a|b}` = choix au hasard, `{1=a|b}` = choix lié (même rang dans toute la phrase, options comprises), `{@liste}` = mot du lexique `lex`.
4. Phrase à traduire : `s` (phrase source par langue d'interface : `fr`, `en`, `ko`), `t` (traductions acceptées, la première sert aux étiquettes), `x` (au moins 3 traductions fausses : elles servent de mauvaises réponses et d'étiquettes en trop).
5. Pour mêler la règle aux leçons d'une unité : ajouter son `id` dans `units` > cours > titre exact de l'unité.
6. Traduire titre, mémo et règles : section `content` de `ko.json` (anglais et FLE) ou de `en.json` (coréen).
7. Lancer `node tests/run.mjs grammar_drills` (chaque gabarit est tiré 40 fois), `node tests/run.mjs unit_parts` puis `node tests/run.mjs data_integrity`.

## Un écran

1. Créer `src/screens/<nom>.js` qui exporte `renderXxx(view)`.
2. Dans `src/ui/router.js` :
   - ajouter son nom à la liste des écrans de `route()` ;
   - appeler sa fonction de rendu dans `renderAll()`.
   - S'il a un onglet dans la barre du bas, l'ajouter aussi dans `src/index.html`.
3. Importer le module dans `src/main.js` (liste des imports).

## Un réglage

- Ajouter sa ligne `setrow` dans la sous-page voulue de `src/screens/settings.js` (`pageHtml`) et son gestionnaire dans `bindSettings()` avec `$$("#id")` (sans effet si la ligne n'est pas affichée).
- Nouvelle rubrique : une entrée dans `SETTINGS_PAGES` (identifiant, titre, icône) et sa branche dans `pageHtml`.

## Une quête

- Quête du jour : tableau `QUEST_POOL` de `src/features/quests.js` (`id`, famille `k`, `t`, `cur`, `max`, `g`) ; trois sont tirées chaque jour. Un nouveau compteur se range dans `S.q` et s'incrémente dans `finish()`. Le titre doit être traduit en anglais et en coréen. Chaque quête accomplie donne 1 point à la quête du mois (`QM_GOAL`, paliers `QM_STEPS`).

## Une icône

- Ajouter son tracé (viewBox 24 × 24, trait sans remplissage) dans l'objet `P` de `src/ui/icons.ts`, puis l'utiliser avec `ic("nom", taille)`.
- Couleur : `color` du parent en CSS (thème sombre automatique), pas de couleur en dur dans le tracé.

## Un palier de série

- Tableau `MILESTONES` de `src/screens/streak.js` : `[jours, gemmes]`. L'écran Série et la fin de leçon s'adaptent seuls.

## Un objet de boutique

- Bonus : tableau `items` de `renderShop` (`src/screens/shop.js`), puis son effet dans `buy()`.
- Tenue de la mascotte : objet `ACCS` dans `src/ui/mascot.js`.

## Une route de l'API

1. `server/api/account.php` : ajouter un `case 'monaction':` dans le `switch`.
   - Utiliser `out([...])` pour répondre.
   - Exiger le jeton comme les actions existantes.
2. Côté application : `srv("monaction", {...})` (`src/services/cloud.js`).
3. Ajouter un cas dans `tests/server_security.py` (accès sans jeton refusé).

## Écrire en TypeScript

- Un nouveau module peut être un fichier `.ts` : `src/exercises/hangul.ts` sert d'exemple.
- Les autres modules l'importent avec l'extension `.js` (`import { hgCompose } from './hangul.js'`) : esbuild trouve le `.ts`.
- `npm run check` vérifie les types des fichiers `.ts`. Les types communs sont dans `src/types.ts`.

## Ajouter du contenu à une unité (v37)

Chaque leçon d'une unité travaille sa propre tranche des listes de l'unité : pour que les leçons restent pleines et différentes, il faut environ 3 phrases (cours de traduction), 2 QCM et 1 question Part 2 (TOEIC), 3 à 4 QCM et 1 dictée (Voltaire) par leçon, soit 5, 4 et 3 leçons pour les unités 1, 2 et 3 d'un thème.

1. Écrire les ajouts dans un fichier texte (format décrit en tête de `scripts/add-content.py`).
2. `python3 scripts/add-content.py ajout.txt` : chaque élément est ajouté au thème et rattaché à son unité, avec ses traductions.
3. Pour Voltaire, reprendre mot pour mot une explication existante quand la règle est la même : elle est déjà traduite.
4. Vérifier avec `node tests/run.mjs unit_parts` puis `node tests/run.mjs lesson_unique`.

## Changer la base de données du serveur (v37)

1. Ajouter une étape à la fin de `speakeasy_migrations()` dans `server/api/migrate.php`, numérotée à la suite (2, 3…).
2. N'y mettre que des ajouts : `CREATE TABLE IF NOT EXISTS`, `speakeasy_add_column(...)`, reprise des données. Ne jamais supprimer ni renommer.
3. Ne jamais modifier une étape déjà publiée : une base peut venir de n'importe quelle version précédente.
4. La copie de sauvegarde est faite automatiquement avant la migration. Tester en ouvrant une base de la version précédente (voir l'historique), puis `node tests/run.mjs server`.
