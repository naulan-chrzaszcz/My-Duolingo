#!/usr/bin/env bash
# =============================================================================
#  Speakeasy — aperçu d'une pull request sur le VPS Fedora
#
#  Usage (en root, sur le VPS) :
#     bash apercu-fedora.sh deploy <numéro de PR> <speakeasy-production.zip>
#     bash apercu-fedora.sh remove <numéro de PR>
#  Lancé automatiquement par GitHub Actions (.github/workflows/apercu.yml) :
#  à chaque envoi sur une PR (deploy), puis à sa fusion ou sa fermeture (remove).
#
#  L'aperçu est servi à côté de la production, sans jamais la modifier :
#     https://www.naulan-chrzaszcz.fr/speakeasy-apercu/pr-<N>/   (dossier /var/www/html/speakeasy-apercu/pr-<N>)
#  - base : copie de la base de production faite au premier envoi de la PR, puis gardée et migrée
#    à chaque nouvel envoi (abonnements aux rappels retirés : un aperçu n'envoie aucune notification) ;
#  - config.php : seule la clé IA commune (api_key) est reprise, pas la clé des rappels (cron_key) ;
#  - fichiers : remplacés à chaque envoi, api/data/ gardé ;
#  - le site de production (/var/www/html/speakeasy) n'est que lu (copie de la base).
# =============================================================================
set -euo pipefail
ACTION="${1:?Usage : apercu-fedora.sh deploy|remove <numéro de PR> [zip]}"
N="${2:?Numéro de PR manquant}"
ZIP="${3:-}"
ROOT="${APERCU_ROOT:-/var/www/html/speakeasy-apercu}"
PROD="${SITE_DIR:-/var/www/html/speakeasy}"
HOST="${SITE_HOST:-www.naulan-chrzaszcz.fr}"
URLPATH="/${ROOT#/var/www/html/}/pr-$N"
ok(){ printf '\033[32m✔ %s\033[0m\n' "$*"; }
warn(){ printf '\033[33m⚠ %s\033[0m\n' "$*"; }
die(){ printf '\033[31m✘ %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Lance ce script en root (sudo)."
[[ "$N" =~ ^[0-9]{1,6}$ ]] || die "Numéro de PR invalide : $N"
case "$ROOT" in /var/www/html/?*) ;; *) die "APERCU_ROOT doit être sous /var/www/html : $ROOT" ;; esac
DIR="$ROOT/pr-$N"

# un aperçu à la fois (attente, pas d'échec : deux PR peuvent être envoyées en même temps)
exec 9>/run/lock/speakeasy-apercu.lock
flock -w 600 9 || die "Un autre aperçu est en cours d'installation depuis 10 minutes."

reload_web(){
  if command -v systemctl >/dev/null; then
    systemctl is-active -q php-fpm 2>/dev/null && systemctl reload php-fpm
    systemctl is-active -q httpd 2>/dev/null && systemctl reload httpd
  fi
  return 0
}

if [ "$ACTION" = remove ]; then
  if [ -d "$DIR" ]; then rm -rf --one-file-system "$DIR"; ok "Aperçu de la PR $N supprimé ($DIR)"; else ok "Aucun aperçu pour la PR $N : rien à supprimer"; fi
  exit 0
fi
[ "$ACTION" = deploy ] || die "Action inconnue : $ACTION (deploy ou remove)"
[ -f "$ZIP" ] || die "Archive introuvable : $ZIP"
command -v unzip >/dev/null || dnf -y -q install unzip
command -v rsync >/dev/null || dnf -y -q install rsync

# 1. Configuration Apache des aperçus (une seule fois ; mêmes protections que la production + noindex)
CONF=/etc/httpd/conf.d/speakeasy-apercu.conf
WANT="$(cat <<CONFEOF
# Speakeasy — aperçus des pull requests, généré par apercu-fedora.sh
<Directory "$ROOT">
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted
    DirectoryIndex index.html
</Directory>
<DirectoryMatch "^$ROOT/pr-[0-9]+/api/data">
    Require all denied
</DirectoryMatch>
<IfModule mod_headers.c>
    <Directory "$ROOT">
        Header always set X-Robots-Tag "noindex, nofollow"
        Header always set X-Content-Type-Options "nosniff"
        Header always set Referrer-Policy "strict-origin-when-cross-origin"
        Header always set Permissions-Policy "microphone=(self), camera=()"
        Header always set X-Frame-Options "SAMEORIGIN"
        Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self' https://api.anthropic.com; media-src 'self' data: blob:; worker-src 'self'; manifest-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
        <FilesMatch "^(sw\.js|index\.html|fonts\.css)\$">
            Header set Cache-Control "no-cache"
        </FilesMatch>
    </Directory>
</IfModule>
CONFEOF
)"
if [ ! -f "$CONF" ] || [ "$(cat "$CONF")" != "$WANT" ]; then
  printf '%s\n' "$WANT" > "$CONF"
  if httpd -t >/dev/null 2>&1; then systemctl reload httpd; ok "Configuration Apache des aperçus : $CONF";
  else httpd -t || true; rm -f "$CONF"; die "Configuration Apache des aperçus refusée : retirée."; fi
fi

# 2. Archive : décompressée à part et contrôlée
STAGE="$(mktemp -d /tmp/speakeasy-apercu.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT
unzip -q "$ZIP" -d "$STAGE"
NEW="$STAGE/speakeasy"
[ -f "$NEW/index.html" ] && [ -f "$NEW/api/account.php" ] && [ -f "$NEW/api/migrate.php" ] || die "Archive incomplète (index.html, api/account.php, api/migrate.php attendus)."
grep -q "apercu-pr$N:" "$NEW/index.html" || die "Cette archive n'est pas un aperçu de la PR $N (construire avec PREVIEW_PR=$N)."
for f in "$NEW"/api/data/*.sqlite "$NEW"/api/data/config.php "$NEW"/api/data/vapid.json; do
  [ -e "$f" ] && die "L'archive contient $(basename "$f") : refusé."
done

# 3. Fichiers (api/data gardé d'un envoi à l'autre)
FIRST=0; [ -f "$DIR/api/data/speakeasy.sqlite" ] || FIRST=1
mkdir -p "$DIR/api/data"
rsync -a --delete --exclude='/api/data/' "$NEW/" "$DIR/"
[ -f "$NEW/api/data/.htaccess" ] && cp "$NEW/api/data/.htaccess" "$DIR/api/data/.htaccess"

# 4. Premier envoi : copie de la base de production (lecture seule côté production)
DB="$DIR/api/data/speakeasy.sqlite"
if [ "$FIRST" = 1 ]; then
  if [ -s "$PROD/api/data/speakeasy.sqlite" ]; then
    php -r '$d=new PDO("sqlite:".$argv[1]); $d->exec("VACUUM INTO ".$d->quote($argv[2]));' "$PROD/api/data/speakeasy.sqlite" "$DB" \
      || cp "$PROD/api/data/speakeasy.sqlite" "$DB"
    php -r '$d=new PDO("sqlite:".$argv[1]); try { $d->exec("DELETE FROM subs"); } catch (Exception $e) {}' "$DB"
    ok "Base de production copiée dans l'aperçu (sans les abonnements aux rappels)"
  else
    warn "Pas de base de production à copier : l'aperçu démarre avec une base vide"
  fi
  if [ -f "$PROD/api/data/config.php" ]; then
    php -r '$c=include $argv[1]; $k=is_array($c)?(string)($c["api_key"]??""):""; file_put_contents($argv[2], "<?php\n// Aperçu : seule la clé IA commune est reprise de la production.\nreturn ".var_export(["api_key"=>$k],true).";\n");' \
      "$PROD/api/data/config.php" "$DIR/api/data/config.php"
  fi
fi

# 5. Droits et SELinux (comme la production)
chown -R root:root "$DIR"
find "$DIR" -path "$DIR/api/data" -prune -o -type d -exec chmod 755 {} +
find "$DIR" -path "$DIR/api/data" -prune -o -type f -exec chmod 644 {} +
chown -R apache:apache "$DIR/api/data"; chmod 750 "$DIR/api/data"
chmod 755 "$ROOT"
if command -v selinuxenabled >/dev/null && selinuxenabled 2>/dev/null; then
  command -v semanage >/dev/null && { semanage fcontext -a -t httpd_sys_rw_content_t "$ROOT/pr-[0-9]+/api/data(/.*)?" 2>/dev/null \
    || semanage fcontext -m -t httpd_sys_rw_content_t "$ROOT/pr-[0-9]+/api/data(/.*)?" 2>/dev/null || true; }
  restorecon -R "$ROOT"
fi

# 6. Migration de la base de l'aperçu
[ -f "$DB" ] && { runuser -u apache -- php "$DIR/api/migrate-cli.php" "$DB" || die "Migration de la base de l'aperçu échouée."; }
reload_web
sleep 2

# 7. Vérification
PING=""
for try in 1 2 3; do
  for proto in https http; do
    PING="$(curl -sk -L --max-time 10 -H "Host: $HOST" "$proto://127.0.0.1$URLPATH/api/account.php?a=ping" || true)"
    echo "$PING" | grep -q '"ok":true' && break 2
  done
  sleep 2
done
echo "$PING" | grep -q '"ok":true' || die "L'API de l'aperçu ne répond pas (« $PING »)."
ok "Aperçu de la PR $N en ligne : https://$HOST$URLPATH/ ($(grep -o 'speakeasy-pr[0-9]*-v[0-9]*-[0-9a-f]*' "$DIR/sw.js" | head -1))"
