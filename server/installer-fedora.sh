#!/usr/bin/env bash
# =============================================================================
#  Speakeasy — mise en production sur un serveur Fedora (Apache + PHP)
#
#  Usage (en root, sur le VPS) :
#     sudo bash installer-fedora.sh                      # dossier par défaut /var/www/html/speakeasy
#     sudo bash installer-fedora.sh /chemin/vers/speakeasy
#     EMAIL=moi@exemple.fr sudo -E bash installer-fedora.sh   # + certificat HTTPS automatique
#
#  Ce script peut être relancé sans risque (après chaque mise à jour du site par exemple).
#  Il corrige l'erreur « 403 Forbidden » sur api/ et icons/ (SELinux et droits des dossiers),
#  installe PHP + SQLite, protège la base de données, active le HTTPS et les rappels quotidiens.
# =============================================================================
set -u
DIR="${1:-/var/www/html/speakeasy}"
DOMAINS="${DOMAINS:-naulan-chrzaszcz.fr www.naulan-chrzaszcz.fr}"
EMAIL="${EMAIL:-}"
ok(){ printf '\033[32m✔ %s\033[0m\n' "$*"; }
warn(){ printf '\033[33m⚠ %s\033[0m\n' "$*"; }
die(){ printf '\033[31m✘ %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Lance ce script en root : sudo bash $0"
[ -f "$DIR/index.html" ] && [ -f "$DIR/api/account.php" ] || die "Speakeasy introuvable dans $DIR (index.html et api/account.php attendus)."
ok "Dossier du site : $DIR"

# 1. Paquets : Apache, PHP avec SQLite, cURL et mbstring, outils SELinux, HTTPS
dnf -y -q install httpd mod_ssl php php-pdo php-mbstring php-json php-common \
    policycoreutils-python-utils certbot python3-certbot-apache augeas-libs python3-augeas openssl cronie >/dev/null 2>&1 \
  && ok "Paquets installés (Apache, PHP, SQLite, certbot)" || warn "Installation de paquets incomplète : vérifie dnf"
php -m 2>/dev/null | grep -qi pdo_sqlite && ok "PHP : extension pdo_sqlite présente" || warn "PHP : pdo_sqlite absent (dnf install php-pdo)"
php -m 2>/dev/null | grep -qi '^curl' && ok "PHP : extension curl présente (IA et rappels)" || warn "PHP : curl absent (dnf install php-common)"

# 2. Propriétaire et droits : Apache doit pouvoir lire le site et écrire dans api/data
mkdir -p "$DIR/api/data"
chown -R root:root "$DIR"
find "$DIR" -type d -exec chmod 755 {} +
find "$DIR" -type f -exec chmod 644 {} +
chown -R apache:apache "$DIR/api/data"; chmod 750 "$DIR/api/data"
ok "Droits des fichiers corrigés (dossiers 755, fichiers 644, api/data écrit par Apache)"

# 2b. Polices (Nunito, Noto Sans KR) hébergées sur ton serveur : plus besoin de Google Fonts
#     (pas d'adresse IP des visiteurs envoyée à Google = RGPD, et polices disponibles hors ligne)
mkdir -p "$DIR/fonts"
if python3 - "$DIR/fonts" >/dev/null 2>&1 <<'PY'
import sys,re,os,hashlib,urllib.request
d=sys.argv[1]
URL="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Noto+Sans+KR:wght@500;800&display=swap"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
get=lambda u:urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=30).read()
css=get(URL).decode()
urls=sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)\s]+?\.woff2)\)",css)))
if len(urls)<3: sys.exit(1)
for u in urls:
    n=hashlib.sha1(u.encode()).hexdigest()[:20]+".woff2"; p=os.path.join(d,n)
    if not (os.path.exists(p) and os.path.getsize(p)>0):
        b=get(u)
        if len(b)<100: sys.exit(1)
        open(p+".tmp","wb").write(b); os.replace(p+".tmp",p)
    css=css.replace(u,n)
open(os.path.join(d,"fonts.css.tmp"),"w").write("/* Polices hébergées localement par installer-fedora.sh */\n"+css)
os.replace(os.path.join(d,"fonts.css.tmp"),os.path.join(d,"fonts.css"))
print(len(urls))
PY
then chmod 755 "$DIR/fonts"; chmod 644 "$DIR/fonts/"*; ok "Polices hébergées sur le serveur ($(ls "$DIR/fonts" | grep -c woff2) fichiers)"
else
  [ -s "$DIR/fonts/fonts.css" ] || printf '@import url("https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Noto+Sans+KR:wght@500;800&display=swap");\n' > "$DIR/fonts/fonts.css"
  chmod 644 "$DIR/fonts/fonts.css"; warn "Polices : téléchargement impossible, Google Fonts reste utilisé en secours"
fi

# 3. SELinux : c'est la cause habituelle du « 403 Forbidden » sur Fedora
if command -v getenforce >/dev/null && [ "$(getenforce)" != "Disabled" ]; then
  semanage fcontext -a -t httpd_sys_content_t "$DIR(/.*)?" 2>/dev/null || semanage fcontext -m -t httpd_sys_content_t "$DIR(/.*)?" 2>/dev/null
  semanage fcontext -a -t httpd_sys_rw_content_t "$DIR/api/data(/.*)?" 2>/dev/null || semanage fcontext -m -t httpd_sys_rw_content_t "$DIR/api/data(/.*)?" 2>/dev/null
  restorecon -R "$DIR"
  setsebool -P httpd_can_network_connect 1   # PHP doit joindre api.anthropic.com et les serveurs de notifications
  ok "SELinux : contextes du site restaurés, api/data accessible en écriture, connexions sortantes autorisées"
else
  ok "SELinux désactivé : rien à faire"
fi

# 4. Configuration Apache dédiée (Fedora ignore les .htaccess par défaut)
URLPATH="/${DIR#/var/www/html/}"; [ "$DIR" = "/var/www/html" ] && URLPATH=""
cat > /etc/httpd/conf.d/speakeasy.conf <<CONF
# Speakeasy — généré par installer-fedora.sh
<Directory "$DIR">
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted
    DirectoryIndex index.html
</Directory>
# La base de données, les clés de notifications et les sources ne sont jamais servies
<Directory "$DIR/api/data">
    Require all denied
</Directory>
<FilesMatch "\.(sqlite|sqlite-journal|sqlite-wal|db|json|py|sh|md|log|bak)\$">
    Require all denied
</FilesMatch>
AddType application/manifest+json .webmanifest
AddType font/woff2 .woff2
# Compression : la page (1,2 Mo) est envoyée en ~300 Ko
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json application/manifest+json image/svg+xml
</IfModule>
<IfModule mod_headers.c>
    <Directory "$DIR">
        Header always set X-Content-Type-Options "nosniff"
        Header always set Referrer-Policy "strict-origin-when-cross-origin"
        Header always set Permissions-Policy "microphone=(self), camera=()"
        Header always set X-Frame-Options "SAMEORIGIN"
        Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self' https://api.anthropic.com; media-src 'self' data: blob:; worker-src 'self'; manifest-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
    </Directory>
    <Files "sw.js">
        Header set Cache-Control "no-cache"
    </Files>
    <Files "index.html">
        Header set Cache-Control "no-cache"
    </Files>
    <Files "fonts.css">
        Header set Cache-Control "no-cache"
    </Files>
    <FilesMatch "\.woff2\$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
</IfModule>
CONF
# mod_ssl attend un certificat provisoire (Fedora le crée d'habitude au premier démarrage d'Apache)
if [ ! -s /etc/pki/tls/certs/localhost.crt ] || [ ! -s /etc/pki/tls/private/localhost.key ]; then
  if [ -x /usr/libexec/httpd-ssl-gencerts ]; then /usr/libexec/httpd-ssl-gencerts >/dev/null 2>&1; fi
  if [ ! -s /etc/pki/tls/certs/localhost.crt ]; then
    mkdir -p /etc/pki/tls/certs /etc/pki/tls/private
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 -subj "/CN=localhost" \
      -keyout /etc/pki/tls/private/localhost.key -out /etc/pki/tls/certs/localhost.crt >/dev/null 2>&1
    chmod 600 /etc/pki/tls/private/localhost.key
  fi
  restorecon /etc/pki/tls/certs/localhost.crt /etc/pki/tls/private/localhost.key 2>/dev/null
  [ -s /etc/pki/tls/certs/localhost.crt ] && ok "Certificat provisoire créé (remplacé par Let's Encrypt juste après)"
fi
httpd -t >/dev/null 2>&1 && ok "Configuration Apache /etc/httpd/conf.d/speakeasy.conf valide" || { httpd -t; die "Erreur dans la configuration Apache"; }

# 5. Pare-feu et démarrage
if command -v firewall-cmd >/dev/null && systemctl is-active -q firewalld; then
  firewall-cmd -q --permanent --add-service=http --add-service=https && firewall-cmd -q --reload && ok "Pare-feu : ports 80 et 443 ouverts"
fi
systemctl enable -q --now httpd && systemctl reload httpd && ok "Apache redémarré"

# 6. HTTPS (obligatoire sur téléphone pour le micro, les rappels, l'installation et le mode hors ligne)
if [ -n "$EMAIL" ]; then
  ARGS=(); for d in $DOMAINS; do ARGS+=(-d "$d"); done
  MAIN="${DOMAINS%% *}"; LIVE="/etc/letsencrypt/live/$MAIN"
  HTTPS_OK=0
  if certbot --apache --non-interactive --agree-tos --redirect --expand -m "$EMAIL" "${ARGS[@]}" 2>/tmp/certbot.err; then
    HTTPS_OK=1; ok "HTTPS activé (module Apache de certbot) pour : $DOMAINS"
  else
    warn "Module Apache de certbot indisponible : méthode « webroot » à la place"
    WEBROOT=$(httpd -S 2>/dev/null | sed -n 's/^Main DocumentRoot: "\(.*\)"$/\1/p'); WEBROOT="${WEBROOT:-/var/www/html}"
    if certbot certonly --webroot -w "$WEBROOT" --non-interactive --agree-tos --keep-until-expiring --expand -m "$EMAIL" "${ARGS[@]}"; then
      ALIASES=""; for d in $DOMAINS; do [ "$d" != "$MAIN" ] && ALIASES="$ALIASES $d"; done
      cat > /etc/httpd/conf.d/speakeasy-ssl.conf <<SSL
# Speakeasy — HTTPS (généré par installer-fedora.sh)
<VirtualHost *:80>
    ServerName $MAIN
    ServerAlias$ALIASES
    # Let's Encrypt doit pouvoir joindre ce dossier en HTTP pour renouveler le certificat
    <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^(.*)\$ https://%{HTTP_HOST}\$1 [R=301,L]
    </IfModule>
    DocumentRoot "$WEBROOT"
</VirtualHost>
<VirtualHost *:443>
    ServerName $MAIN
    ServerAlias$ALIASES
    DocumentRoot "$WEBROOT"
    SSLEngine on
    SSLCertificateFile $LIVE/fullchain.pem
    SSLCertificateKeyFile $LIVE/privkey.pem
    Protocols h2 http/1.1
    <IfModule mod_headers.c>
        Header always set Strict-Transport-Security "max-age=31536000"
    </IfModule>
</VirtualHost>
SSL
      mkdir -p /etc/letsencrypt/renewal-hooks/deploy
      printf '#!/bin/sh\nsystemctl reload httpd\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-httpd.sh; chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-httpd.sh
      if httpd -t >/dev/null 2>&1; then systemctl reload httpd; HTTPS_OK=1; ok "HTTPS activé (webroot) pour : $DOMAINS, HTTP redirigé vers HTTPS"
      else httpd -t; rm -f /etc/httpd/conf.d/speakeasy-ssl.conf; systemctl reload httpd; warn "Configuration HTTPS refusée par Apache : retirée, le site reste en HTTP"; fi
    else
      warn "certbot a échoué : vérifie que les enregistrements A de $DOMAINS pointent vers ce serveur et que le port 80 est ouvert (pare-feu OVH compris)"
    fi
  fi
  systemctl enable -q --now certbot-renew.timer 2>/dev/null && ok "Renouvellement automatique du certificat activé"
  sed -i "s#^\$VAPID_SUBJECT = .*#\$VAPID_SUBJECT = 'mailto:$EMAIL';  // adresse exigée par Apple / Google#" "$DIR/api/remind.php"
  if [ "$HTTPS_OK" = 1 ]; then
    c=$(curl -s -o /dev/null -w '%{http_code}' "https://$MAIN$URLPATH/api/account.php?a=ping"); [ "$c" = 200 ] && ok "https://$MAIN$URLPATH/ répond ($c)" || warn "https://$MAIN$URLPATH/ répond $c"
  fi
else
  warn "HTTPS non configuré : relance avec  sudo EMAIL=ton@email.fr bash $0"
fi

# 7. Rappels quotidiens : api/remind.php toutes les heures
CRONLINE="7 * * * * apache /usr/bin/php $DIR/api/remind.php >/dev/null 2>&1"
echo "$CRONLINE" > /etc/cron.d/speakeasy && chmod 644 /etc/cron.d/speakeasy && systemctl enable -q --now crond && ok "Rappels : api/remind.php lancé toutes les heures"

# 8. Vérifications finales
BASE="http://127.0.0.1$URLPATH"
code(){ curl -sk -L -o /dev/null -w '%{http_code}' -H "Host: ${DOMAINS%% *}" "$1"; }
P=$(curl -sk -L -H "Host: ${DOMAINS%% *}" "$BASE/api/account.php?a=ping")
echo "$P" | grep -q '"ok":true' && ok "API des comptes : $P" || warn "API des comptes : réponse inattendue « $P »"
curl -sk -L -o /dev/null -D - -H "Accept-Encoding: gzip" -H "Host: ${DOMAINS%% *}" "$BASE/index.html" | grep -qi 'content-encoding: gzip' && ok "Compression gzip active" || warn "Compression gzip inactive (module mod_deflate)"
[ "$(code "$BASE/icons/icon-192.png")" = 200 ] && ok "Icônes accessibles" || warn "Icônes : code $(code "$BASE/icons/icon-192.png")"
for f in api/data/speakeasy.sqlite api/data/vapid.json api/data/; do c=$(code "$BASE/$f"); [ "$c" = 403 ] || [ "$c" = 404 ] && ok "$f protégé ($c)" || warn "$f accessible ($c) !"; done
sudo -u apache test -w "$DIR/api/data" && ok "api/data accessible en écriture par Apache" || warn "api/data non accessible en écriture"
echo; ok "Terminé. Ouvre https://${DOMAINS%% *}$URLPATH/ sur ton téléphone."
