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
| Phrases de grammaire générées par gabarits (v27) | Avec 4 à 8 QCM fixes par unité, on finissait par retenir la réponse ; un gabarit varie sujets, lieux et moments, et les mauvaises réponses sont toujours de vraies formes (autres temps du même verbe, autres prépositions) |
| Explications rédigées par règle, pas par phrase (v27) | Une règle sert à des centaines de phrases : quelques dizaines de textes seulement à traduire en anglais et en coréen |
| Icônes dessinées en SVG au lieu des emojis (v28) | Rendu identique sur iPhone, Android et ordinateur, couleur réglable, thème sombre ; regroupées dans `ui/icons.ts` |
| Pas de cœurs ni de vies (v28) | Décision du propriétaire : on apprend sans limite ; seules les versions extrêmes et le test hangul gardent leurs 3 erreurs maximum |
| Fiche d'étape en bulle sous la pièce (v28) | Reste une modale (bouton retour, tests, appels directs à `nodeSheet`) mais se place sous la pièce touchée ; si la place manque, elle redevient un panneau |
| Un chapitre = un niveau du cours (v29) | Les unités sont déjà classées par niveau (`lv`) : pas de migration de progression ; seules les unités du chapitre choisi sont affichées |
| Images dessinées en SVG dans le code (v30) | Aucune image à télécharger ni droit d'auteur : les 170 mots illustrés et les scènes de la Part 1 marchent hors ligne, pèsent peu et gardent le même style que les icônes |
| Photos réelles gardées pour la Part 1 (v30) | Plus proches de l'examen ; le dessin de la même scène les remplace hors ligne ou si la photo ne charge pas |
| Nouvelles unités insérées à leur niveau (v31) | La progression est rangée par titre d'unité (`relayout`) : un profil existant garde ses étapes faites, ses couronnes et ses statistiques, recalées sur les nouveaux numéros |
| « Écris le mot qui manque » sans tolérance de faute de frappe (v27) | La forme exacte est le sujet de l'exercice (has / have, allé / allée) ; seuls la casse, la ponctuation, les contractions et, en français, les accents oubliés sont tolérés |

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
| v27 | Notions de grammaire (temps, mots de liaison, modaux, prépositions / particules) en anglais, FLE et coréen : phrases générées par gabarits, nouvel exercice « écris le mot qui manque », environ la moitié des QCM des leçons générés ; 70 QCM d'anglais aux mauvaises réponses plus crédibles ; étiquettes en trop proches de la réponse ; sons réparés (ils ne sortaient plus depuis la v26) et redessinés, motifs de vibration, éclats de couleurs, barre de série ; bouton « S'entraîner » en haut des mots à retenir |
| v28 | Nouvelle direction artistique d'après les maquettes : barre du haut (drapeau + unités terminées, série, gemmes, XP du jour) et barre du bas en icônes dessinées ; menu déroulant du choix de langue ; parcours en pièces 3D avec bannière d'unité collante, bulle d'étape (Commencer, Revoir, Extrême · XP ×2) et bouton de retour à l'étape conseillée ; entraînement en rubriques avec bandeau du coach ; écran Série (calendrier du mois, gels utilisés, paliers 7/14/30/50 jours à +10/+20/+40/+60 gemmes, objectif du jour) ; ligue avec coupes et médailles ; profil avec bannière de Horang, récap, comptes de l'appareil et médaillons de badges ; restes du système de cœurs supprimés |
| v28.1 | Réglages déplacés du profil vers un écran Paramètres façon Duolingo (roue dentée) : menu Préférences, Profil et compte, Notifications, Mon Claude (IA), avec une sous-page par rubrique |
| v31 | Coréen du quotidien : 16 nouvelles unités rangées dans les chapitres 1 à 3 (café, restaurant, supérette, météo ; métro et bus, taxi, pharmacie et hôpital, banque, téléphone, rendez-vous, loisirs ; logement, coiffeur, poste et livraisons, voyage, fêtes 설날 et 추석), soit 30 unités au lieu de 14, chacune avec 8 phrases, 6 mots, 4 QCM, des mots en images et des notions de grammaire liées ; 10 images de la vie coréenne (hanbok, tteokguk, songpyeon, kimbap, bibimbap, tteokbokki, ramyeon, sèche-cheveux, timbre, distributeur) ; textes traduits en anglais |
| v30 | Images : 170 mots du quotidien dessinés (`content/pics.json`, `ui/pics/`), nouveaux exercices « Choisis la bonne image » et « Quel mot correspond à l'image ? » dans les premières étapes des unités d'anglais, de FLE et de coréen qui ont des mots illustrés, rubrique « Mots en images » dans le guide d'unité, carte d'entraînement « Vocabulaire en images » ; les 36 scènes de la Part 1 du TOEIC dessinées (emojis remplacés, dessins de secours des photos) |
| v29 | Parcours rangé en chapitres comme Duolingo (un chapitre = un niveau ; bannière « Chapitre N, unité M », écran des chapitres, bouton Continuer vers le chapitre suivant) ; onglet Quêtes (quête du mois avec paliers +20/+30/+50 gemmes, quêtes du jour avec coffres) à la place de l'onglet Boutique, toujours ouverte par les gemmes ; bulle d'étape épurée ; doublon des onglets de cours retiré (choix par le drapeau) ; scènes de Horang le long du parcours ; Histoires, Boutique et Statistiques harmonisées ; IA : règles de grammaire les moins réussies envoyées au prompt et ajoutées aux séances (avec ou sans IA), exercice « écris le mot qui manque » dans les séances IA |
