# Speakeasy : consignes pour Claude

Application d'apprentissage des langues façon Duolingo : anglais quotidien, pro et TOEIC, orthographe Voltaire, coréen, français FLE.
C'est une PWA hébergée sur un VPS Fedora : https://www.naulan-chrzaszcz.fr/speakeasy/.
La propriétaire écrit en français : réponds en français.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run build` | Construit `dist/` : `index.html` autonome, `sw.js`, icônes, polices, `api/` |
| `npm run check` | Vérifie que le code se construit et passe TypeScript (`tsc --noEmit`) |
| `npm test` | Tests rapides, environ 5 min (Playwright + serveur PHP local) |
| `npm run test:all` | Toute la batterie, environ 30 min, à lancer avant chaque livraison |
| `node tests/run.mjs <test> [args]` | Un seul test, ex. `node tests/run.mjs play_lessons fr en-daily` |
| `npm run zip` | Build minifié + `release/speakeasy-production.zip` à déployer |
| `npm run serve` | Build + serveur local sur http://localhost:8000 |
| `npm run format` | Met en forme le code (Prettier), à lancer avant de livrer |

## Où est quoi

- `src/main.js` : point d'entrée. Importe tous les modules, puis lance le démarrage dans l'ordre.
- `src/content/` : contenu des cours en JSON (`courses/<id>.json`, `stories.json`, `sections.json`).
  - Importer depuis `content/index.js`, qui applique la langue d'interface.
  - Ne jamais importer `data.js` directement.
- `src/i18n/` :
  - `en.json` et `ko.json` : traductions. Les clés sont le texte français exact affiché par le code.
  - `translate.js` : traduit le DOM à la volée.
- `src/exercises/` : génération (`make`), mauvaises réponses, correction, affichage par type (`R[type]`).
- `src/lesson/` : construction et déroulé des leçons.
- `src/screens/` : un module par écran.
- `src/features/` : fonctions transverses (test de niveau, quêtes, mots à retenir, coach…).
- `src/services/` : réseau (comptes, IA, rappels) et audio.
- `src/core/` : état `S` du profil, progression, XP, outils.
- `src/ui/` : composants, routeur, plateforme, bouton retour.
- `src/types.ts` : types du modèle de données. Le nouveau code peut être écrit en `.ts`.
- `src/globals.js` : expose les exports sur `window`. Sert aux `onclick="…"` inline, aux tests et à la console.
- `public/` : fichiers copiés tels quels (`sw.js`, manifest, icônes, polices).
- `server/` : API PHP, installateur Fedora, LISEZ-MOI de déploiement.
- `tests/` : tests Python Playwright, lanceur `run.mjs`, aide `solver.py` qui répond juste à chaque type d'exercice.
- `docs/` : cahier des charges, architecture, guide d'évolution, catalogue des cours, historique des décisions.

## Règles

- Ne supprime aucune fonction existante sans le demander ; liste ce qui change avant de livrer.
- Priorité à Safari sur iPhone en app installée (écran d'accueil), puis Android et ordinateur.
- Toute chaîne d'interface nouvelle doit avoir sa traduction dans `src/i18n/en.json` et `src/i18n/ko.json` (section `ui`).
  - La clé est le texte français exact, avec `¤` pour une partie variable.
- État global :
  - `S` (profil) et `L` (leçon en cours) se lisent partout.
  - Pour les remplacer entièrement, utiliser `set_S(...)` et `set_L(...)` : un module ES ne peut pas réaffecter un import.
- Jamais de clé API dans le front, jamais synchronisée.
  - Les prompts IA sont construits côté serveur (`server/api/generate.php`, modes en liste blanche).
- Aucun contenu protégé (TOEIC/ETS, GlobalExam) : exercices originaux seulement.
- Validation des réponses tolérante, sauf dictées Voltaire et orthographe coréenne.
- Le nom du cache du service worker est calculé au build (version + empreinte) : rien à changer à la main.
- Avant de livrer :
  - `npm run check` puis `npm run test:all` doivent passer.
  - Le bilan affiche « N/N tests réussis » ; en cas d'échec, le journal est dans `tests/out/`.
  - Livrer `npm run zip` avec deux ou trois lignes sur le déploiement.
- Le guide `docs/guide-evolution.md` donne la marche à suivre pour les ajouts courants.
