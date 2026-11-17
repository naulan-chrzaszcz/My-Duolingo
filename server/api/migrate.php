<?php
/*
 * Speakeasy — ouverture de la base et migrations (v37).
 *
 * La version du schéma est rangée dans la base elle-même (PRAGMA user_version).
 * Au premier appel après une mise à jour du serveur, si la base est plus ancienne :
 *   1. une copie de sauvegarde est faite à côté de la base (api/data/speakeasy-avant-v<N>-<date>.sqlite) ;
 *   2. chaque étape manquante est appliquée, dans l'ordre, dans une transaction.
 * Les étapes n'ajoutent que des tables et des colonnes, ne suppriment rien et peuvent être rejouées sans dégât :
 * une base de n'importe quelle version précédente arrive à la version courante avec toutes ses données.
 *
 * POUR UNE NOUVELLE VERSION : ajouter une étape à la fin de speakeasy_migrations() ; ne jamais modifier une étape publiée.
 */
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) { http_response_code(403); exit; }

/** Étapes de migration, indexées par le numéro de version qu'elles atteignent. */
function speakeasy_migrations(): array {
  return [
    // 1 : schéma de la v36 (comptes, ligues, rappels), pour les bases créées avant les migrations numérotées
    1 => function (PDO $db) {
      $db->exec('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE COLLATE NOCASE, pass TEXT, emoji TEXT, color TEXT, state TEXT DEFAULT "", ts INTEGER DEFAULT 0, wxp INTEGER DEFAULT 0, week TEXT DEFAULT "", xp INTEGER DEFAULT 0, created INTEGER)');
      $db->exec('CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY, uid INTEGER, created INTEGER)');
      $db->exec('CREATE TABLE IF NOT EXISTS attempts(ip TEXT, ts INTEGER)');
      speakeasy_add_column($db, 'users', 'streak', 'INTEGER DEFAULT 0');
      speakeasy_add_column($db, 'users', 'seen', 'INTEGER DEFAULT 0');
      $db->exec('CREATE TABLE IF NOT EXISTS history(uid INTEGER, week TEXT, wxp INTEGER, PRIMARY KEY(uid, week))');
      $db->exec('CREATE TABLE IF NOT EXISTS podiums(week TEXT, uid INTEGER, rank INTEGER, wxp INTEGER, PRIMARY KEY(week, uid))');
      $db->exec('CREATE TABLE IF NOT EXISTS settled(week TEXT PRIMARY KEY)');
      $db->exec('CREATE TABLE IF NOT EXISTS subs(endpoint TEXT PRIMARY KEY, uid INTEGER, hour INTEGER, tz INTEGER, last_day TEXT DEFAULT "", created INTEGER)');
    },
  ];
}

/** Ajoute une colonne si elle manque (ALTER TABLE n'a pas de « IF NOT EXISTS » en SQLite). */
function speakeasy_add_column(PDO $db, string $table, string $col, string $def): void {
  $cols = array_column($db->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC), 'name');
  if (!in_array($col, $cols, true)) $db->exec("ALTER TABLE $table ADD COLUMN $col $def");
}

/** Ouvre la base, la crée si besoin et la met à la version courante (sauvegarde d'abord une base existante). */
function speakeasy_db(string $path): PDO {
  if (!is_dir(dirname($path))) @mkdir(dirname($path), 0700, true);
  $existed = is_file($path) && filesize($path) > 0;
  $db = new PDO('sqlite:' . $path);
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->setAttribute(PDO::ATTR_TIMEOUT, 10);
  $db->exec('PRAGMA journal_mode=WAL');
  $steps = speakeasy_migrations();
  $target = max(array_keys($steps));
  $ver = (int)$db->query('PRAGMA user_version')->fetchColumn();
  if ($ver >= $target) return $db;
  if ($existed) speakeasy_backup($db, $path, $ver, $target);
  $db->exec('BEGIN IMMEDIATE');
  try {
    // une autre requête a pu migrer pendant la sauvegarde
    $ver = (int)$db->query('PRAGMA user_version')->fetchColumn();
    foreach ($steps as $n => $step) {
      if ($n <= $ver) continue;
      $step($db);
      $db->exec('PRAGMA user_version = ' . (int)$n);
    }
    $db->exec('COMMIT');
  } catch (Throwable $e) {
    $db->exec('ROLLBACK');
    throw $e;
  }
  return $db;
}

/** Copie de sauvegarde cohérente de la base avant migration (une seule par version de départ). */
function speakeasy_backup(PDO $db, string $path, int $from, int $to): void {
  $bk = dirname($path) . '/speakeasy-avant-v' . $to . '-depuis-v' . $from . '-' . date('Ymd-His') . '.sqlite';
  if (glob(dirname($path) . '/speakeasy-avant-v' . $to . '-depuis-v' . $from . '-*.sqlite')) return;
  try {
    $db->exec('VACUUM INTO ' . $db->quote($bk));
  } catch (Throwable $e) {
    // SQLite trop ancien pour VACUUM INTO : on vide le journal puis on copie le fichier
    $db->exec('PRAGMA wal_checkpoint(TRUNCATE)');
    @copy($path, $bk);
  }
  @chmod($bk, 0600);
}
