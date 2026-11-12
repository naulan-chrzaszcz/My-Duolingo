// Construit puis sert dist/ sur http://localhost:8000 avec le serveur PHP intégré (comptes, ligue et IA compris).
// Sans PHP, l'app fonctionne aussi en ouvrant dist/index.html directement (sans comptes ni ligue en ligne).
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b = spawnSync('node', [path.join(ROOT, 'scripts/build.mjs')], { stdio: 'inherit' });
if (b.status) process.exit(b.status);
const port = process.env.PORT || 8000;
console.log(`http://localhost:${port}/  (Ctrl+C pour arrêter)`);
const php = spawn('php', ['-S', `localhost:${port}`, '-t', path.join(ROOT, 'dist')], { stdio: 'inherit' });
php.on('error', () => console.error('PHP introuvable : ouvre dist/index.html directement, ou installe PHP 8 avec SQLite.'));
