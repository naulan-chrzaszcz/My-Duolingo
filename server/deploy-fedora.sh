#!/usr/bin/env bash
# =============================================================================
#  Speakeasy — mise à jour du site en production sur le VPS Fedora (v37)
#
#  Usage (en root, sur le VPS) :
#     bash deploy-fedora.sh /tmp/speakeasy-production.zip [/var/www/html/speakeasy]
#  Lancé automatiquement par GitHub Actions (.github/workflows/deploy.yml) à chaque fusion sur main.
#
#  Étapes :
#    1. sauvegarde des fichiers du site et de la base (/var/backups/speakeasy, 10 dernières gardées) ;
#    2. remplacement des fichiers, SANS toucher à api/data/ (base, config.php, clés des rappels) ;
#    3. droits et contextes SELinux ;
#    4. migration de la base (api/migrate-cli.php, qui fait aussi sa propre copie avant de migrer) ;
#    5. vérification de l'API ; en cas d'échec, les fichiers précédents sont remis en place.
#  La première installation (Apache, PHP, HTTPS, rappels) reste faite par installer-fedora.sh.
# =============================================================================
set -euo pipefail
ZIP="${1:?Usage : deploy-fedora.sh <speakeasy-production.zip> [dossier du site]}"
DIR="${2:-${SITE_DIR:-/var/www/html/speakeasy}}"
URLPATH="${URLPATH:-/speakeasy}"
HOST="${SITE_HOST:-www.naulan-chrzaszcz.fr}"
BK="/var/backups/speakeasy"
KEEP=10
STAMP="$(date +%Y%m%d-%H%M%S)"
ok(){ printf '\033[32m✔ %s\033[0m\n' "$*"; }
warn(){ printf '\033[33m⚠ %s\033[0m\n' "$*"; }
die(){ printf '\033[31m✘ %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Lance ce script en root (sudo)."
[ -f "$ZIP" ] || die "Archive introuvable : $ZIP"
[ -f "$DIR/index.html" ] && [ -f "$DIR/api/account.php" ] || die "Speakeasy introuvable dans $DIR : fais d'abord la première installation (installer-fedora.sh)."
command -v unzip >/dev/null || dnf -y -q install unzip
command -v rsync >/dev/null || dnf -y -q install rsync

# une seule mise en production à la fois
exec 9>/run/lock/speakeasy-deploy.lock
flock -n 9 || die "Une autre mise en production est en cours."

# 0. Archive : décompressée à part et contrôlée avant de toucher au site
STAGE="$(mktemp -d /tmp/speakeasy-release.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT
unzip -q "$ZIP" -d "$STAGE"
NEW="$STAGE/speakeasy"
[ -f "$NEW/index.html" ] && [ -f "$NEW/api/account.php" ] && [ -f "$NEW/api/migrate.php" ] || die "Archive incomplète (index.html, api/account.php, api/migrate.php attendus)."
for f in "$NEW"/api/data/*.sqlite "$NEW"/api/data/config.php "$NEW"/api/data/vapid.json; do
  [ -e "$f" ] && die "L'archive contient $(basename "$f") : refusé, elle écraserait les données du serveur."
done
ok "Archive vérifiée : $(du -sh "$NEW" | cut -f1)"

# 1. Sauvegardes : fichiers du site (sans api/data) et copie cohérente de la base
mkdir -p "$BK"; chmod 700 "$BK"
tar -C "$DIR" --exclude='./api/data' -czf "$BK/site-$STAMP.tar.gz" .
DB="$DIR/api/data/speakeasy.sqlite"
if [ -s "$DB" ]; then
  php -r '$d=new PDO("sqlite:".$argv[1]); $d->exec("VACUUM INTO ".$d->quote($argv[2]));' "$DB" "$BK/speakeasy-$STAMP.sqlite" \
    || { cp "$DB" "$BK/speakeasy-$STAMP.sqlite"; warn "VACUUM INTO indisponible : copie simple de la base"; }
  chmod 600 "$BK/speakeasy-$STAMP.sqlite"
fi
ok "Sauvegardes dans $BK (site-$STAMP.tar.gz, speakeasy-$STAMP.sqlite)"
ls -1t "$BK"/site-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$BK"/speakeasy-*.sqlite 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

rollback(){
  warn "Retour aux fichiers précédents…"
  rsync -a --delete --exclude='/api/data/' "$1/" "$DIR/"
  restore_rights
  if command -v systemctl >/dev/null; then
    systemctl is-active -q php-fpm 2>/dev/null && systemctl reload php-fpm
    systemctl is-active -q httpd 2>/dev/null && systemctl reload httpd
  fi
  warn "Fichiers précédents remis en place. La base n'a pas été modifiée si la migration a échoué (transaction annulée) ; copie : $BK/speakeasy-$STAMP.sqlite"
}
restore_rights(){
  chown -R root:root "$DIR"
  find "$DIR" -path "$DIR/api/data" -prune -o -type d -exec chmod 755 {} +
  find "$DIR" -path "$DIR/api/data" -prune -o -type f -exec chmod 644 {} +
  mkdir -p "$DIR/api/data"; chown -R apache:apache "$DIR/api/data"; chmod 750 "$DIR/api/data"
  if command -v restorecon >/dev/null && selinuxenabled 2>/dev/null; then restorecon -R "$DIR"; fi
}

# 2. Nouveaux fichiers : tout est remplacé sauf api/data (seul son .htaccess est mis à jour)
PREV="$(mktemp -d /tmp/speakeasy-prev.XXXXXX)"
tar -C "$PREV" -xzf "$BK/site-$STAMP.tar.gz"
rsync -a --delete --exclude='/api/data/' "$NEW/" "$DIR/"
[ -f "$NEW/api/data/.htaccess" ] && cp "$NEW/api/data/.htaccess" "$DIR/api/data/.htaccess"
# l'adresse des rappels est gardée dans api/data/config.php ; on la remet aussi dans remind.php comme le fait l'installateur
if [ -f "$DIR/api/data/config.php" ]; then
  SUBJ="$(php -r '$c=include $argv[1]; echo is_array($c)?($c["vapid_subject"]??""):"";' "$DIR/api/data/config.php" 2>/dev/null || true)"
  [ -n "$SUBJ" ] && sed -i "s#^\$VAPID_SUBJECT = .*#\$VAPID_SUBJECT = '$SUBJ';  // adresse exigée par Apple / Google#" "$DIR/api/remind.php"
fi
restore_rights
ok "Fichiers mis à jour ($(grep -o 'speakeasy-v[0-9]*-[0-9a-f]*' "$DIR/sw.js" | head -1))"

# 3. Migration de la base, en tant qu'Apache (propriétaire de la base)
if ! runuser -u apache -- php "$DIR/api/migrate-cli.php" "$DB"; then
  rollback "$PREV"; rm -rf "$PREV"; die "Migration de la base échouée : mise en production annulée."
fi
ok "Base de données à jour"

# 4. Vérification : l'API répond en local (HTTPS puis HTTP).
# Le cache de code PHP (opcache) garde l'ancienne version quelques secondes : on le vide en rechargeant PHP, puis on attend.
if command -v systemctl >/dev/null; then
  systemctl is-active -q php-fpm 2>/dev/null && systemctl reload php-fpm
  systemctl is-active -q httpd 2>/dev/null && systemctl reload httpd
fi
sleep 3
PING=""
for try in 1 2 3; do
  for proto in https http; do
    PING="$(curl -sk -L --max-time 10 -H "Host: $HOST" "$proto://127.0.0.1$URLPATH/api/account.php?a=ping" || true)"
    echo "$PING" | grep -q '"ok":true' && break 2
  done
  sleep 2
done
if ! echo "$PING" | grep -q '"ok":true'; then
  rollback "$PREV"; rm -rf "$PREV"; die "L'API ne répond pas après la mise à jour (« $PING ») : fichiers précédents remis en place."
fi
rm -rf "$PREV"
ok "API des comptes : $PING"
ok "Mise en production terminée ($STAMP)."
