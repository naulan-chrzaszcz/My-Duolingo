# Historique et décisions de conception

Ce fichier garde le « pourquoi » des choix faits pendant le développement (novembre 2026), pour ne pas les remettre en cause par erreur lors d'une refonte.

## Demandes de départ (à respecter)

- Améliorer l'anglais pour la conversation de tous les jours et pour le TOEIC ; échanges avec Claude en français.
- Site hébergé sur le VPS personnel (dynamique possible) plutôt qu'une application Android native.
- Gestion de comptes simple : chaque compte a sa propre progression.
- Onglet Entraînement : mots utiles pour la conversation, la rédaction pro et le TOEIC, traduction façon Duolingo.
- Synthèse vocale qui lit la bonne phrase après chaque réponse, juste ou fausse.
- Aide à la prononciation au micro façon Duolingo.
- Site attrayant, ludique et addictif (animations, objectifs), difficulté croissante, pas de questions trop simples.
- Sections Anglais, Voltaire (orthographe française) et Coréen avec les mêmes règles.
- Pas de système de vies ; parcours aussi longs que Duolingo, plus des exercices aléatoires générés par l'IA pour consolider.
- Usage principal dans Safari sur iPhone : optimiser pour iPhone et Safari.
- Chaque utilisateur configure sa propre clé API Claude dans son profil.
- Couverture complète des règles et pièges du Certificat Voltaire et du TOEIC ; anglais pro en partie orienté développement logiciel (descriptions de PR, code review…).
- Parcours hybride : toute unité accessible, ordre recommandé ; unités repliables ; test de niveau à l'entrée.
- Interface complète en anglais (Voltaire et coréen enseignés depuis l'anglais) et cours « Learn French » pour anglophones.
- Interface coréenne : anglais (quotidien, pro, TOEIC), FLE et Voltaire expliqués en coréen.
- Ligues stockées sur le serveur : tous les comptes du site voient l'XP de chacun.
- Validation moins stricte, mauvaises réponses plus difficiles à deviner, bouton pour passer les écoutes.

## Décisions techniques

| Décision | Raison |
| --- | --- |
| Un seul fichier index.html, construit par esbuild depuis des modules ES (v26) | Hébergement trivial, cache hors ligne simple, rien à installer sur le serveur ; les modules rendent le code lisible et modifiable par morceaux |
| esbuild plutôt que Vite (v26) | esbuild est le moteur de Vite, sans serveur de développement ni plugins à maintenir ; suffisant pour un fichier unique |
| TypeScript progressif (v26) | Le code existant reste en JavaScript ; le nouveau code peut être en TypeScript (exemple : exercises/hangul.ts), vérifié par npm run check |
| Contenu des cours en JSON (v26) | Les onze fichiers data*.js de correctifs empilés ont été remplacés par un fichier JSON final par cours, plus simple à modifier |
| PHP + SQLite, pas de base externe | Disponible partout sur Fedora/Apache, sauvegarde = copier un fichier |
| Clé Claude par profil, stockée sur l'appareil, relayée par generate.php (en-tête X-User-Key) | Chacun paie sa propre IA ; la clé n'est jamais stockée ni synchronisée côté serveur |
| Prompts construits côté serveur, modes IA en liste blanche | Le relais ne peut pas servir de proxy Claude générique |
| Code écrit en français, traduction du DOM à la volée (i18n/translate.js) | Ajout rapide de l'anglais puis du coréen sans réécrire l'app ; à remplacer par des clés de traduction lors d'une refonte |
| Thème sombre généré (darkgen.py) | Garder une seule source de couleurs |
| Web Push sans contenu chiffré (payload vide) | Pas de bibliothèque de chiffrement à embarquer en PHP ; le service worker affiche un texte fixe |
| Cron horaire remind.php en ligne de commande | Fuseau de chaque utilisateur respecté, pas d'URL publique à protéger |
| Polices auto-hébergées par l'installateur | RGPD (pas d'IP envoyée à Google) et polices disponibles hors ligne |
| En-têtes CSP et X-Frame-Options | Le site ne parle qu'à lui-même et à api.anthropic.com ; il ne peut pas être encadré |
| Dictée du clavier en secours du micro | La reconnaissance vocale n'existe pas dans l'app iPhone installée |
| Retour haptique iPhone par interrupteur caché | navigator.vibrate n'existe pas sur iOS ; astuce fonctionnelle sur iOS 18+ |

## Grandes étapes (versions)

| Version | Apports principaux |
| --- | --- |
| v1 à v16 | Parcours, exercices, entraînements, histoires, boutique, profils, comptes en ligne, IA, TOEIC, Voltaire, coréen, interface anglaise et cours FLE |
| v17 | Compatibilité Android, vérification de la synthèse vocale |
| v18 | Interface coréenne, thème sombre corrigé |
| v19 | Notes « (formal) » retirées des réponses à reconstituer |
| v20 | Ligues stockées sur le serveur, podium et récompenses |
| v21 | Distracteurs plus durs, « I » mieux prononcé, bouton passer l'écoute, validation tolérante, voix EN/KO corrigée, plantage « Pas de son » corrigé |
| v22 | Test complet de production, garde du bouton retour réécrite |
| — | Installateur Fedora : HTTPS (repli webroot), SELinux, cron |
| v23 | Micro iPhone (dictée du clavier), rappels (« Passer en ligne » + « Activer »), vibrations iPhone |
| v24 | Revue mobile iPhone/Android : toasts, zoom des champs, cibles tactiles, contraste, clavier, typographie française, polices auto-hébergées, CSP, liste blanche des modes IA |
| v25 | Deux titres de cartes traduits en coréen ; test complet du site en ligne (147 leçons, toutes les cartes et histoires) |
| v26 | Projet modulaire : 45 modules ES, contenu en JSON, build esbuild + TypeScript, Prettier, tests rapatriés avec lanceur, nom de cache automatique, minuteur du sprint fiabilisé. HTML identique à la v25 sur 430 écrans comparés |
