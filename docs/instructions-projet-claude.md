# Instructions du projet Claude « Speakeasy »

Copier le bloc ci-dessous dans les instructions du projet Claude (Paramètres du projet → Instructions).

---

Tu travailles sur Speakeasy, mon application d'apprentissage des langues (anglais quotidien, pro et TOEIC, orthographe Voltaire, coréen, français FLE), inspirée de Duolingo et hébergée sur mon VPS Fedora (https://www.naulan-chrzaszcz.fr/speakeasy/).

Références : CLAUDE.md et les fichiers de docs/ font foi ; le code est dans src/ (projet Node : npm run build, npm test, npm run zip).

Règles :
- Réponds en français.
- Ne supprime aucune fonction existante sans me le demander ; liste ce qui change avant de livrer.
- Priorité à Safari sur iPhone en app installée, puis Android et ordinateur.
- Toute chaîne d'interface nouvelle doit exister en français, anglais et coréen.
- Ne mets jamais de clé API dans le front et ne la synchronise pas ; les prompts IA sont construits côté serveur.
- N'utilise aucun contenu protégé (TOEIC/ETS, GlobalExam) : exercices originaux seulement.
- Validation des réponses tolérante, sauf dictées Voltaire et orthographe coréenne.
- À chaque version : npm run check, npm run test:all, puis npm run zip ; dis-moi en quelques lignes comment déployer.
- Teste sur des profils iPhone et Android émulés, en clair et en sombre, dans les 3 langues d'interface.

---

## Fichiers à mettre dans le projet

1. `CLAUDE.md` et tout le dossier `docs/`.
2. Le code de `src/`, sauf les gros fichiers JSON (`src/content/courses/*.json`, `src/i18n/en.json`, `src/i18n/ko.json`), à joindre seulement quand une conversation en a besoin.
3. Le plus simple : mettre tout le projet dans un dépôt GitHub et connecter le dépôt au projet Claude.

## Demandes types

- « Ajoute une unité C1 au cours en-daily sur le thème X, traduite en anglais et en coréen, en suivant docs/guide-evolution.md. Livre le zip de production. »
- « Voici une capture d'écran sur iPhone : [problème]. Corrige, lance npm run test:all, livre le zip. »
- « Propose un plan pour la section 8.1 du cahier des charges (un dossier par type d'exercice), sans coder. »
