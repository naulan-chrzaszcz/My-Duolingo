<?php
/*
 * Speakeasy — migration de la base en ligne de commande (lancée par deploy-fedora.sh à chaque mise en production).
 *   runuser -u apache -- php api/migrate-cli.php [chemin/vers/speakeasy.sqlite]
 * Affiche la version du schéma avant et après. Code de sortie 0 si la base est à jour, 1 sinon.
 * La copie de sauvegarde et les étapes sont dans migrate.php. Inaccessible depuis le web.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/migrate.php';

$path = $argv[1] ?? __DIR__ . '/data/speakeasy.sqlite';
$target = max(array_keys(speakeasy_migrations()));
$before = 'aucune (base créée)';
if (is_file($path) && filesize($path) > 0) {
  $ro = new PDO('sqlite:' . $path);
  $before = (string)(int)$ro->query('PRAGMA user_version')->fetchColumn();
  $ro = null;
}
try {
  $db = speakeasy_db($path);
  $after = (int)$db->query('PRAGMA user_version')->fetchColumn();
  $users = $db->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")->fetchColumn()
    ? (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn() : 0;
} catch (Throwable $e) {
  fwrite(STDERR, "Migration impossible : " . $e->getMessage() . "\n");
  exit(1);
}
echo "Base $path : version $before -> $after (attendue : $target), $users compte(s)\n";
exit($after === $target ? 0 : 1);
