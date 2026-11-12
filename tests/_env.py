# Chemins communs aux tests (modifiables par variables d'environnement).
#   SPEAKEASY_URL  : page à tester (défaut : dist/index.html construit par npm run build)
#   SPEAKEASY_SITE : serveur PHP de test (défaut : http://127.0.0.1:8765/, lancé par tests/run.mjs)
#   SPEAKEASY_SITE_DIR : dossier servi par ce serveur (copie de dist/)
import os, tempfile
TESTS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TESTS)
APP_URL = os.environ.get('SPEAKEASY_URL', 'file://' + os.path.join(ROOT, 'dist', 'index.html'))
SITE = os.environ.get('SPEAKEASY_SITE', 'http://127.0.0.1:8765/')
SITE_DIR = os.environ.get('SPEAKEASY_SITE_DIR', os.path.join(tempfile.gettempdir(), 'speakeasy-test-site'))
SITE_DB = os.path.join(SITE_DIR, 'api', 'data', 'speakeasy.sqlite')
OUT = os.environ.get('SPEAKEASY_TEST_OUT', os.path.join(TESTS, 'out'))
for d in ('', 'A'):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
