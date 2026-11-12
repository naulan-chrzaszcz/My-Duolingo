# Architecture du code (v26)

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
| `content/` | `data.js`, `index.js`, `courses/*.json`, `stories.json`, `sections.json`, `unit-remap.json`, `real-photos.json`, `legacy.json` | Contenu des cours. `index.js` l'adapte à la langue d'interface au chargement |
| `i18n/` | `locale.js`, `translate.js`, `en.json`, `ko.json`, `dict-en.js`, `dict-ko.js` | Langue d'interface, traduction du DOM à la volée, dictionnaires |
| `core/` | `util.js`, `state.js`, `progress.js`, `accounts.js`, `xp.js` | Outils, état `S` du profil, migrations, progression, profils locaux, XP |
| `exercises/` | `generate.js`, `distractors.js`, `validate.js`, `render.js`, `hangul.ts` | `make(type, ctx)`, mauvaises réponses, correction, affichage `R[type]`, hangul |
| `lesson/` | `build.js`, `engine.js`, `writing.js`, `keyboard.js` | Construction et déroulé d'une leçon (`L`), rédactions, clavier |
| `features/` | `placement.js`, `quests.js`, `word-bank.js`, `theme-training.js`, `ai-units.js`, `coach.js` | Test de niveau, quêtes et badges, répétition espacée, thèmes, unités IA, coach |
| `screens/` | `path.js`, `training.js`, `stories.js`, `league.js`, `shop.js`, `profile.js`, `stats.js`, `accounts.js`, `onboarding.js`, `language.js` | Un module par écran ou fenêtre principale |
| `services/` | `cloud.js`, `ai.js`, `reminders.js`, `speech.js` | Comptes en ligne et ligue, IA, rappels push, voix et micro |
| `ui/` | `ui.js`, `router.js`, `platform.js`, `mascot.js`, `back-button.js`, `typography.js` | Toasts et modales, routage par hash, iOS/Android/thème, mascotte, bouton retour, typographie |
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

## Points faibles connus (prochaines étapes)

1. **Traduction par texte exact.** Le code est écrit en français, puis traduit en cherchant chaque texte affiché dans `en.json` et `ko.json`. Une virgule différente suffit à laisser un texte en français. Prochaine étape : des clés `t('cle')`.
2. **Un type d'exercice est réparti sur plusieurs fichiers** (génération, affichage, audio, coach, tests). Prochaine étape : un dossier par type avec `make`, `render` et `solve` réunis.
3. **Rendu par chaînes HTML et état global.** Simple et rapide, mais sans composants. À garder tant que l'app reste de cette taille.
