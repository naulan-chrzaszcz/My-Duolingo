// Lance les tests automatiques (Playwright + serveur PHP local) et affiche un bilan.
//   node tests/run.mjs quick        tests rapides (~5 min)
//   node tests/run.mjs all          toute la batterie (~40 min)
//   node tests/run.mjs server       tests du serveur PHP (comptes, ligue, rappels, sécurité)
//   node tests/run.mjs <nom> [args] un seul test, ex. : node tests/run.mjs play_lessons fr en-daily
//   RESUME=1 node tests/run.mjs all reprend une série interrompue : les tests déjà réussis (tests/out/*.ok) ne sont pas rejoués
// Prérequis : Python 3 + Playwright (pip install playwright && playwright install chromium), PHP 8 avec SQLite.
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const TESTS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TESTS);
const OUT = path.join(TESTS, 'out');
const SITE_DIR = process.env.SPEAKEASY_SITE_DIR || path.join(os.tmpdir(), 'speakeasy-test-site');
const PORT = 8765;

const QUICK = [
  ['answer_check'], ['grammar_drills'], ['unit_parts'], ['lesson_unique'], ['i18n_cards'], ['back_button'], ['server_sync'], ['server_security'], ['microphone'],
  ['play_lessons', 'fr', 'en-daily'], ['play_lessons', 'ko', 'en-toeic'], ['play_lessons', 'en', 'fr-fle'], ['ai_cache'],
];
const ALL = [
  ['data_integrity'], ['grammar_drills'], ['unit_parts'], ['lesson_unique'], ['answer_check'], ['distractors'], ['i18n_cards'], ['i18n_leaks', 'en'], ['i18n_leaks', 'ko'], ['i18n_flows', 'en'], ['i18n_flows', 'ko'],
  ...['en-daily', 'en-pro', 'en-toeic', 'fr-volt', 'ko'].map(c => ['play_lessons', 'fr', c]),
  ['play_lessons', 'en', 'fr-fle'], ['play_lessons', 'en', 'ko'], ['play_lessons', 'ko', 'fr-fle'], ['play_lessons', 'ko', 'en-pro'],
  ['play_mobile', 'fr', 'en-daily', 'iosapp'], ['play_mobile', 'en', 'fr-fle', 'iossafari'], ['play_mobile', 'ko', 'en-toeic', 'android'],
  ['training_modes', 'fr'], ['training_modes', 'en'], ['training_modes', 'ko'],
  ['layout', 'fr'], ['layout', 'ko'], ['mobile_audit', 'iphoneSE', 'light'], ['mobile_audit', 'galaxy360', 'dark'],
  ['server_sync'], ['server_security'], ['league_server'], ['league_ui'], ['reminders'],
  ['microphone'], ['audio'], ['audio_pause'], ['no_sound'], ['skip_audio'], ['sprint'], ['word_bank'], ['ai_cache'],
  ['back_button'], ['back_button_2'], ['android'],
];
// Une sortie qui contient l'un de ces motifs = échec (les tests affichent leurs anomalies au lieu de s'arrêter)
const FAIL = /Traceback|^!!|NOT OK|PROBLEMES : \[[^\]]|erreurs JS :? ?\[[^\]]|^erreurs \[[^\]]|blocages [1-9]|bloqué|inattendus : [1-9]|anomalies [1-9]|différences [1-9]/m;

const arg = process.argv.slice(2);
const SERVER = [['server_sync'], ['server_security'], ['league_server'], ['league_ui'], ['reminders']];
let list = arg[0] === 'all' ? ALL : arg[0] === 'server' ? SERVER : arg[0] === 'quick' || !arg.length ? QUICK : [arg];
const okFile = t => path.join(OUT, t.join('_') + '.ok');
const jobs = Number(process.env.JOBS || 4);

fs.mkdirSync(OUT, { recursive: true });
let skipped = 0;
if (process.env.RESUME) { const n = list.length; list = list.filter(t => !fs.existsSync(okFile(t))); skipped = n - list.length; if (skipped) console.log(`(reprise : ${skipped} tests déjà réussis)`); }
else for (const f of fs.readdirSync(OUT)) if (f.endsWith('.ok')) fs.rmSync(path.join(OUT, f));
if (!process.env.NO_BUILD) {
  // on teste ce qui sera livré : le build minifié de production
  const b = spawnSync('node', [path.join(ROOT, 'scripts/build.mjs'), '--minify'], { stdio: 'inherit' });
  if (b.status) process.exit(b.status);
}
// copie de dist/ servie par PHP (la base de test y est créée, jamais dans dist/)
fs.rmSync(SITE_DIR, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'dist'), SITE_DIR, { recursive: true });
const php = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', SITE_DIR], { stdio: ['ignore', fs.openSync(path.join(OUT, 'php.log'), 'w'), 'pipe'] });
php.stderr.on('data', d => fs.appendFileSync(path.join(OUT, 'php.log'), d));
await new Promise(r => setTimeout(r, 700));

const env = { ...process.env, SPEAKEASY_SITE_DIR: SITE_DIR, SPEAKEASY_SITE: `http://127.0.0.1:${PORT}/` };
const results = [];
const runOne = t => new Promise(res => {
  const [name, ...a] = t; const label = t.join(' ');
  const log = path.join(OUT, t.join('_') + '.log');
  const t0 = Date.now();
  const p = spawn('python3', [path.join(TESTS, name + '.py'), ...a], { env });
  let out = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  const timer = setTimeout(() => { p.kill('SIGKILL'); out += '\nTIMEOUT'; }, 25 * 60 * 1000);
  p.on('close', code => {
    clearTimeout(timer); fs.writeFileSync(log, out);
    const ok = code === 0 && !FAIL.test(out) && !/TIMEOUT$/.test(out);
    const s = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`${ok ? '✔' : '✘'} ${label}  (${s} s)${ok ? '' : '  → ' + path.relative(ROOT, log)}`);
    if (ok) fs.writeFileSync(okFile(t), ''); else fs.rmSync(okFile(t), { force: true });
    results.push({ label, ok }); res();
  });
});
// les tests du serveur partagent la base et la limite de tentatives par IP : un par un, chacun sur une base neuve
const SERIAL = new Set(['server_sync', 'server_security', 'league_server', 'league_ui', 'reminders']);
const freshDb = () => { for (const f of ['speakeasy.sqlite', 'speakeasy.sqlite-wal', 'speakeasy.sqlite-shm']) fs.rmSync(path.join(SITE_DIR, 'api/data', f), { force: true }); };
const queue = list.filter(t => !SERIAL.has(t[0]));
const serial = list.filter(t => SERIAL.has(t[0]));
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await runOne(queue.shift()); }));
for (const t of serial) { freshDb(); await runOne(t); }
php.kill();
const bad = results.filter(r => !r.ok);
console.log(`\n${results.length - bad.length + skipped}/${results.length + skipped} tests réussis`);
process.exit(bad.length ? 1 : 0);
