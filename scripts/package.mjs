// Fabrique release/speakeasy-production.zip à partir de dist/ (lancé par npm run zip, après un build minifié).
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REL = path.join(ROOT, 'release');
const STAGE = path.join(REL, 'speakeasy');
fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(REL, { recursive: true });
fs.cpSync(path.join(ROOT, 'dist'), STAGE, { recursive: true });
for (const f of ['api/data/speakeasy.sqlite', 'api/data/vapid.json']) fs.rmSync(path.join(STAGE, f), { force: true });
const zip = path.join(REL, 'speakeasy-production.zip');
fs.rmSync(zip, { force: true });
const r = spawnSync('zip', ['-qr', zip, 'speakeasy'], { cwd: REL, stdio: 'inherit' });
if (r.status) { console.error('La commande zip est introuvable : installe-la (dnf install zip / apt install zip).'); process.exit(1); }
fs.rmSync(STAGE, { recursive: true, force: true });
console.log(`${path.relative(ROOT, zip)} ${(fs.statSync(zip).size / 1024).toFixed(0)} Ko : à décompresser dans /var/www/html/ (voir LISEZ-MOI.txt)`);
