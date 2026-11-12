// Construit dist/ : index.html autonome (JS + CSS intégrés), service worker, icônes, polices, API PHP.
// Options : --minify (production), --check (vérifie seulement que le code se construit, sans écrire).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import { darkCss } from './darkgen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = new Set(process.argv.slice(2));
const minify = args.has('--minify');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// 1. JavaScript : tous les modules de src/ en un seul script (format IIFE, comme la v25)
const js = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2022', 'safari15'], // iPhone iOS 15+ (le code d'origine n'était pas transpilé)
  charset: 'utf8',
  write: false,
  minifyWhitespace: minify,
  minifySyntax: minify,
  legalComments: 'none',
  logLevel: 'warning',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
let code = js.outputFiles[0].text;
if (args.has('--check')) { console.log('build OK (vérification seule)'); process.exit(0); }
// sécurité : le script est intégré dans une balise <script>
code = code.replace(/<\/script/gi, '<\\/script');

// 2. CSS : thème clair + thème sombre généré
const css = fs.readFileSync(path.join(ROOT, 'src/styles/style.css'), 'utf8');
const fullCss = css + '\n' + darkCss(css);

// 3. index.html
const shell = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
const html = shell.replace('/*CSS*/', () => fullCss).replace('/*JS*/', () => code);

// 4. dist/
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
const copy = (from, to) => fs.cpSync(path.join(ROOT, from), path.join(DIST, to), { recursive: true });
copy('public', '.');
copy('server/api', 'api');
copy('server/installer-fedora.sh', 'installer-fedora.sh');
copy('server/LISEZ-MOI.txt', 'LISEZ-MOI.txt');
fs.rmSync(path.join(DIST, 'api/data/speakeasy.sqlite'), { force: true });
fs.rmSync(path.join(DIST, 'api/data/vapid.json'), { force: true });
// nom du cache : version + empreinte du contenu -> les téléphones se mettent à jour à chaque nouveau build
const hash = crypto.createHash('sha256').update(html).digest('hex').slice(0, 8);
const cache = `speakeasy-v${pkg.version.split('.')[0]}-${hash}`;
const swPath = path.join(DIST, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__CACHE__', cache));

console.log(`dist/index.html ${(html.length / 1024).toFixed(0)} Ko · cache ${cache}${minify ? ' · minifié' : ''}`);
