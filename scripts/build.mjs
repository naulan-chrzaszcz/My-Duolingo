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
// Aperçu d'une pull request (PREVIEW_PR=<numéro>, utilisé par .github/workflows/apercu.yml) :
// même code, mais stockage du navigateur, cache hors ligne et nom de l'app séparés de la production.
const PR = /^[0-9]{1,6}$/.test(process.env.PREVIEW_PR || '') ? process.env.PREVIEW_PR : '';

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
let html = shell.replace('/*CSS*/', () => fullCss).replace('/*JS*/', () => code);
if (PR) html = previewHtml(html, PR);

// 4. dist/
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
const copy = (from, to) => fs.cpSync(path.join(ROOT, from), path.join(DIST, to), { recursive: true });
copy('public', '.');
copy('server/api', 'api');
copy('server/installer-fedora.sh', 'installer-fedora.sh');
copy('server/deploy-fedora.sh', 'deploy-fedora.sh');
copy('server/LISEZ-MOI.txt', 'LISEZ-MOI.txt');
fs.rmSync(path.join(DIST, 'api/data/speakeasy.sqlite'), { force: true });
fs.rmSync(path.join(DIST, 'api/data/vapid.json'), { force: true });
// nom du cache : version + empreinte du contenu -> les téléphones se mettent à jour à chaque nouveau build
const hash = crypto.createHash('sha256').update(html).digest('hex').slice(0, 8);
// la famille (speakeasy-v / speakeasy-pr<N>-v) limite le ménage du service worker à ses propres caches
const family = PR ? `speakeasy-pr${PR}-v` : 'speakeasy-v';
const cache = `${family}${pkg.version.split('.')[0]}-${hash}`;
const swPath = path.join(DIST, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__CACHE__', cache).replace('__FAMILY__', family));
if (PR) {
  const mPath = path.join(DIST, 'manifest.webmanifest');
  const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
  m.name = `Speakeasy PR ${PR} (aperçu)`;
  m.short_name = `SE PR ${PR}`;
  fs.writeFileSync(mPath, JSON.stringify(m, null, 2));
  // pas d'installateur ni de script de production dans un aperçu
  for (const f of ['installer-fedora.sh', 'deploy-fedora.sh']) fs.rmSync(path.join(DIST, f), { force: true });
}

console.log(`dist/index.html ${(html.length / 1024).toFixed(0)} Ko · cache ${cache}${minify ? ' · minifié' : ''}${PR ? ` · aperçu de la PR ${PR}` : ''}`);

// Aperçu : le site est sur le même domaine que la production, donc localStorage est partagé.
// Toutes les clés sont préfixées « apercu-pr<N>: » ; à la première ouverture, les clés speakeasy-* de la
// production sont recopiées (lecture seule) pour retrouver ses profils. La production n'est jamais modifiée.
function previewHtml(h, n) {
  const ns = `apercu-pr${n}:`;
  const storage = `<script>(function(){try{var L=window.localStorage,P=Storage.prototype,g=P.getItem,s=P.setItem,r=P.removeItem,k=P.key,N=${JSON.stringify(ns)};
if(g.call(L,N+"*")!=="1"){var K=[];for(var i=0;i<L.length;i++)K.push(k.call(L,i));K.forEach(function(x){if(x&&x.indexOf("speakeasy-")===0&&g.call(L,N+x)===null)s.call(L,N+x,g.call(L,x));});s.call(L,N+"*","1");}
P.getItem=function(a){return g.call(this,this===L?N+a:a)};P.setItem=function(a,b){return s.call(this,this===L?N+a:a,b)};P.removeItem=function(a){return r.call(this,this===L?N+a:a)};}catch(e){}})();</script>`;
  const banner = `<div id="apercu" aria-hidden="true" style="position:fixed;z-index:9999;top:env(safe-area-inset-top,0);left:50%;transform:translateX(-50%);background:#E8590C;color:#fff;font:700 11px/1.6 Nunito,system-ui,sans-serif;padding:0 10px;border-radius:0 0 8px 8px;pointer-events:none;opacity:.9">Version d'essai · PR ${n}</div>`;
  return h
    .replace('<meta charset="utf-8">', m => m + '\n<meta name="robots" content="noindex, nofollow">\n' + storage)
    .replace(/<title>/, `<title>[PR ${n}] `)
    .replace('content="Speakeasy">', `content="SE PR ${n}">`)
    .replace('<body>', b => b + '\n' + banner);
}
