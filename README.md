# Speakeasy

Application d'apprentissage des langues façon Duolingo, installable sur iPhone et Android (PWA) :

- anglais quotidien, professionnel et TOEIC ;
- orthographe française (Certificat Voltaire) ;
- coréen ;
- français pour anglophones et coréanophones.

L'interface existe en français, en anglais et en coréen. En ligne : https://www.naulan-chrzaszcz.fr/speakeasy/

## Démarrer

Prérequis : Node 20 ou plus.

- Pour les tests : Python 3 avec Playwright (`pip install playwright && playwright install chromium`) et PHP 8 avec SQLite.
- Pour `npm run zip` : la commande `zip`.

```bash
npm install        # esbuild, TypeScript, Prettier
npm run serve      # construit et ouvre http://localhost:8000
npm test           # tests rapides (~5 min)
npm run zip        # release/speakeasy-production.zip, à déployer
```

## Déployer

1. Décompresser `release/speakeasy-production.zip` dans `/var/www/html/` sur le VPS (dossier `speakeasy/`).
2. Lancer, en root :

   ```bash
   EMAIL=<adresse> bash /var/www/html/speakeasy/installer-fedora.sh
   ```

L'installateur et toute l'exploitation sont décrits dans `server/LISEZ-MOI.txt`.

## Organisation

```
src/          code de l'application (modules ES, un dossier par domaine) et contenu des cours (JSON)
public/       fichiers copiés tels quels : service worker, manifest, icônes, polices
server/       API PHP (comptes, ligue, IA, rappels), installateur Fedora, LISEZ-MOI de déploiement
scripts/      build (esbuild), thème sombre, zip de production, serveur local
tests/        tests automatiques Playwright + lanceur (node tests/run.mjs)
docs/         cahier des charges, architecture, guide d'évolution, catalogue des cours, historique
```

## Documents

- [Cahier des charges](docs/cahier-des-charges.md) : ce que fait l'application et pourquoi.
- [Architecture](docs/architecture.md) : modules, démarrage, état partagé, points faibles connus.
- [Guide d'évolution](docs/guide-evolution.md) : ajouter une unité, un cours, un texte traduit, un type d'exercice, un écran.
- [Catalogue des cours](docs/catalogue-des-cours.md) : toutes les unités.
- [Historique et décisions](docs/historique-et-decisions.md) : les demandes d'origine et les choix techniques.
- [CLAUDE.md](CLAUDE.md) : consignes pour travailler sur le projet avec Claude.
