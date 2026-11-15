<?php
/*
 * Speakeasy — comptes en ligne (progression synchronisée sur tous les appareils + ligues et classement des membres)
 *
 * INSTALLATION : rien à configurer. Nécessite PHP 7.4+ avec PDO SQLite (présent chez la plupart des hébergeurs).
 * La base est créée automatiquement dans api/data/ (protégé par api/data/.htaccess sur Apache).
 * Sur Nginx, ou pour plus de sécurité, place la base HORS du dossier public en modifiant $DB_PATH.
 *
 * Sécurité : mots de passe hachés (password_hash), jetons de session aléatoires stockés hachés,
 * limite de tentatives de connexion par adresse IP, taille de sauvegarde plafonnée.
 */

$DB_PATH = __DIR__ . '/data/speakeasy.sqlite';
$MAX_STATE_BYTES = 600000;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }

try {
  if (!is_dir(dirname($DB_PATH))) @mkdir(dirname($DB_PATH), 0700, true);
  $db = new PDO('sqlite:' . $DB_PATH);
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('PRAGMA journal_mode=WAL');
  $db->exec('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE COLLATE NOCASE, pass TEXT, emoji TEXT, color TEXT, state TEXT DEFAULT "", ts INTEGER DEFAULT 0, wxp INTEGER DEFAULT 0, week TEXT DEFAULT "", xp INTEGER DEFAULT 0, created INTEGER)');
  $db->exec('CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY, uid INTEGER, created INTEGER)');
  $db->exec('CREATE TABLE IF NOT EXISTS attempts(ip TEXT, ts INTEGER)');
  // Ligues : colonnes ajoutées aux bases existantes + historique des semaines et podiums
  $cols = array_column($db->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_ASSOC), 'name');
  if (!in_array('streak', $cols)) $db->exec('ALTER TABLE users ADD COLUMN streak INTEGER DEFAULT 0');
  if (!in_array('seen', $cols))   $db->exec('ALTER TABLE users ADD COLUMN seen INTEGER DEFAULT 0');
  $db->exec('CREATE TABLE IF NOT EXISTS history(uid INTEGER, week TEXT, wxp INTEGER, PRIMARY KEY(uid, week))');
  $db->exec('CREATE TABLE IF NOT EXISTS podiums(week TEXT, uid INTEGER, rank INTEGER, wxp INTEGER, PRIMARY KEY(week, uid))');
  $db->exec('CREATE TABLE IF NOT EXISTS settled(week TEXT PRIMARY KEY)');
} catch (Exception $e) { out(['ok' => false, 'error' => 'db'], 500); }

$a   = $_GET['a'] ?? '';
$now = time();
$ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if ($a === 'ping') out(['ok' => true]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['ok' => false, 'error' => 'method'], 405);
$in = json_decode((string)file_get_contents('php://input'), true) ?: [];

function limited($db, $ip, $now, $max) {
  $db->prepare('DELETE FROM attempts WHERE ts < ?')->execute([$now - 900]);
  $s = $db->prepare('SELECT COUNT(*) FROM attempts WHERE ip = ?'); $s->execute([$ip]);
  if ((int)$s->fetchColumn() >= $max) return true;
  $db->prepare('INSERT INTO attempts VALUES(?, ?)')->execute([$ip, $now]);
  return false;
}
function newToken($db, $uid, $now) {
  $t = bin2hex(random_bytes(32));
  $db->prepare('INSERT INTO tokens VALUES(?, ?, ?)')->execute([hash('sha256', $t), $uid, $now]);
  return $t;
}
function auth($db, $in) {
  $t = (string)($in['token'] ?? '');
  if (strlen($t) !== 64) out(['ok' => false, 'error' => 'auth'], 401);
  $s = $db->prepare('SELECT u.* FROM tokens t JOIN users u ON u.id = t.uid WHERE t.hash = ?');
  $s->execute([hash('sha256', $t)]);
  $u = $s->fetch(PDO::FETCH_ASSOC);
  if (!$u) out(['ok' => false, 'error' => 'auth'], 401);
  return $u;
}

// ---- Ligues ----
function week_ok($w) { return is_string($w) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $w) && $w <= gmdate('Y-m-d', time() + 86400); }
// XP d'une semaine pour tous les membres : la semaine en cours est dans users, les précédentes dans history
function week_sql() { return '(SELECT id AS uid, wxp FROM users WHERE week = :w AND wxp > 0 UNION ALL SELECT uid, wxp FROM history WHERE week = :w AND wxp > 0 AND uid NOT IN (SELECT id FROM users WHERE week = :w))'; }
// Une semaine est « clôturée » 12 h après sa fin (tous les fuseaux horaires ont changé de semaine) : son podium est alors figé
function settle($db, $now) {
  $limit = gmdate('Y-m-d', $now - 7 * 86400 - 12 * 3600);
  $s = $db->prepare('SELECT DISTINCT week FROM (SELECT week FROM users WHERE wxp > 0 UNION SELECT week FROM history) WHERE week <> "" AND week <= ? AND week NOT IN (SELECT week FROM settled)');
  $s->execute([$limit]);
  foreach ($s->fetchAll(PDO::FETCH_COLUMN) as $w) {
    $r = $db->prepare('SELECT uid, wxp FROM ' . week_sql() . ' ORDER BY wxp DESC, uid LIMIT 3'); $r->execute([':w' => $w]);
    $db->beginTransaction();
    foreach ($r->fetchAll(PDO::FETCH_ASSOC) as $i => $row) $db->prepare('INSERT OR REPLACE INTO podiums VALUES(?, ?, ?, ?)')->execute([$w, $row['uid'], $i + 1, $row['wxp']]);
    $db->prepare('INSERT OR IGNORE INTO settled VALUES(?)')->execute([$w]);
    $db->commit();
  }
}
function medals($db) {
  $m = [];
  foreach ($db->query('SELECT uid, rank, COUNT(*) AS n FROM podiums GROUP BY uid, rank')->fetchAll(PDO::FETCH_ASSOC) as $r) $m[(int)$r['uid']][(int)$r['rank']] = (int)$r['n'];
  return $m;
}
function pub($r, $med) {
  $m = $med[(int)$r['id']] ?? [];
  return ['name' => $r['name'], 'emoji' => $r['emoji'], 'color' => $r['color'], 'wxp' => (int)($r['wxp'] ?? 0), 'xp' => (int)$r['xp'], 'streak' => (int)$r['streak'], 'm' => [(int)($m[1] ?? 0), (int)($m[2] ?? 0), (int)($m[3] ?? 0)]];
}

// Compatibilité : fonctionne aussi sans l'extension PHP « mbstring »
function u_len($s) { return function_exists('mb_strlen') ? mb_strlen($s) : (int)preg_match_all('/./us', $s); }
function u_sub($s, $n) { if (function_exists('mb_substr')) return mb_substr($s, 0, $n); return preg_match('/^.{0,' . (int)$n . '}/us', $s, $m) ? $m[0] : ''; }

$name  = trim((string)($in['name'] ?? ''));
$emoji = strip_tags(u_sub((string)($in['emoji'] ?? '🐯'), 8));
if ($emoji === '') $emoji = '🐯';
$color = preg_match('/^#[0-9A-Fa-f]{6}$/', (string)($in['color'] ?? '')) ? $in['color'] : '#7C4DFF';

switch ($a) {
  case 'register':
    if (limited($db, $ip, $now, 20)) out(['ok' => false, 'error' => 'rate_limited'], 429);
    if (!preg_match('/^[\p{L}\p{N} _.\-]{2,20}$/u', $name)) out(['ok' => false, 'error' => 'name']);
    $pw = (string)($in['password'] ?? '');
    if (u_len($pw) < 6) out(['ok' => false, 'error' => 'password']);
    $s = $db->prepare('SELECT 1 FROM users WHERE name = ?'); $s->execute([$name]);
    if ($s->fetchColumn()) out(['ok' => false, 'error' => 'taken']);
    $db->prepare('INSERT INTO users(name, pass, emoji, color, created) VALUES(?, ?, ?, ?, ?)')
       ->execute([$name, password_hash($pw, PASSWORD_DEFAULT), $emoji, $color, $now]);
    out(['ok' => true, 'token' => newToken($db, (int)$db->lastInsertId(), $now), 'name' => $name]);

  case 'login':
    if (limited($db, $ip, $now, 10)) out(['ok' => false, 'error' => 'rate_limited'], 429);
    $s = $db->prepare('SELECT * FROM users WHERE name = ?'); $s->execute([$name]);
    $u = $s->fetch(PDO::FETCH_ASSOC);
    if (!$u || !password_verify((string)($in['password'] ?? ''), $u['pass'])) out(['ok' => false, 'error' => 'bad']);
    // les sessions de plus d'un an sont oubliées
    $db->prepare('DELETE FROM tokens WHERE created < ?')->execute([$now - 365 * 86400]);
    out(['ok' => true, 'token' => newToken($db, (int)$u['id'], $now), 'name' => $u['name'], 'emoji' => $u['emoji'], 'color' => $u['color'], 'state' => $u['state'], 'ts' => (int)$u['ts']]);

  case 'load':
    $u = auth($db, $in);
    out(['ok' => true, 'name' => $u['name'], 'emoji' => $u['emoji'], 'color' => $u['color'], 'state' => $u['state'], 'ts' => (int)$u['ts']]);

  case 'save':
    $u = auth($db, $in);
    $st = (string)($in['state'] ?? '');
    if (strlen($st) > $MAX_STATE_BYTES) out(['ok' => false, 'error' => 'size'], 413);
    json_decode($st); if (json_last_error() !== JSON_ERROR_NONE) out(['ok' => false, 'error' => 'json'], 400);
    $week = (string)($in['week'] ?? '');
    if (!week_ok($week)) $week = (string)$u['week'];
    $wxp = min(200000, max(0, (int)($in['wxp'] ?? 0)));
    // changement de semaine : le score de la semaine qui se termine est archivé pour les podiums
    if ($u['week'] !== '' && $u['week'] !== $week && (int)$u['wxp'] > 0)
      $db->prepare('INSERT OR REPLACE INTO history VALUES(?, ?, ?)')->execute([$u['id'], $u['week'], (int)$u['wxp']]);
    // un appareil resté sur une ancienne semaine ne doit pas écraser la semaine en cours
    if ($u['week'] !== '' && $week < $u['week']) {
      if ($wxp > 0) { $db->prepare('INSERT OR IGNORE INTO history VALUES(?, ?, 0)')->execute([$u['id'], $week]); $db->prepare('UPDATE history SET wxp = MAX(wxp, ?) WHERE uid = ? AND week = ?')->execute([$wxp, $u['id'], $week]); }
      $week = (string)$u['week']; $wxp = (int)$u['wxp'];
    }
    $db->prepare('UPDATE users SET state = ?, ts = ?, wxp = ?, week = ?, xp = ?, emoji = ?, color = ?, streak = ?, seen = ? WHERE id = ?')
       ->execute([$st, (int)($in['ts'] ?? 0), $wxp, $week, max(0, (int)($in['xp'] ?? 0)), $emoji, $color, min(100000, max(0, (int)($in['streak'] ?? 0))), $now, $u['id']]);
    out(['ok' => true]);

  case 'board':
    // Classement de tous les membres : semaine en cours, depuis toujours, podium de la semaine dernière
    $week = (string)($in['week'] ?? ''); $prev = (string)($in['prev'] ?? '');
    if (!week_ok($week)) out(['ok' => false, 'error' => 'week'], 400);
    try { settle($db, $now); } catch (Exception $e) {}
    $med = medals($db);
    // v32 : tous les comptes sont classés ; ceux qui n'ont pas joué cette semaine sont à 0 XP, en bas (par XP total)
    $s = $db->prepare("SELECT * FROM (SELECT id, name, emoji, color, (CASE WHEN COALESCE(week, '') = ? AND wxp > 0 THEN wxp ELSE 0 END) AS wxp, xp, streak FROM users) ORDER BY wxp DESC, (CASE WHEN wxp > 0 THEN 0 ELSE xp END) DESC, id LIMIT 50"); $s->execute([$week]);
    $rows = array_map(function ($r) use ($med) { return pub($r, $med); }, $s->fetchAll(PDO::FETCH_ASSOC));
    $all = array_map(function ($r) use ($med) { return pub($r, $med); }, $db->query('SELECT id, name, emoji, color, 0 AS wxp, xp, streak FROM users WHERE xp > 0 ORDER BY xp DESC, id LIMIT 50')->fetchAll(PDO::FETCH_ASSOC));
    $res = ['ok' => true, 'rows' => $rows, 'all' => $all, 'members' => (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn(), 'last' => []];
    if (week_ok($prev) && $prev < $week) {
      $s = $db->prepare('SELECT u.id, u.name, u.emoji, u.color, w.wxp, u.xp, u.streak FROM ' . week_sql() . ' w JOIN users u ON u.id = w.uid ORDER BY w.wxp DESC, u.id LIMIT 3'); $s->execute([':w' => $prev]);
      $res['last'] = array_map(function ($r) use ($med) { return pub($r, $med); }, $s->fetchAll(PDO::FETCH_ASSOC));
    }
    // ma place (même au-delà des 50 premiers) et mon résultat de la semaine dernière
    $t = (string)($in['token'] ?? '');
    if (strlen($t) === 64) {
      $s = $db->prepare('SELECT u.* FROM tokens t JOIN users u ON u.id = t.uid WHERE t.hash = ?'); $s->execute([hash('sha256', $t)]);
      if ($me = $s->fetch(PDO::FETCH_ASSOC)) {
        $m = ['name' => $me['name']];
        if ($me['week'] === $week && (int)$me['wxp'] > 0) { $s = $db->prepare('SELECT COUNT(*) FROM users WHERE week = ? AND (wxp > ? OR (wxp = ? AND id < ?))'); $s->execute([$week, $me['wxp'], $me['wxp'], $me['id']]); $m['wrank'] = 1 + (int)$s->fetchColumn(); }
        else { $s = $db->prepare("SELECT (SELECT COUNT(*) FROM users WHERE week = :w AND wxp > 0) + (SELECT COUNT(*) FROM users WHERE NOT (COALESCE(week, '') = :w AND wxp > 0) AND (xp > :x OR (xp = :x AND id < :i)))"); $s->execute([':w' => $week, ':x' => $me['xp'], ':i' => $me['id']]); $m['wrank'] = 1 + (int)$s->fetchColumn(); }
        $s = $db->prepare('SELECT COUNT(*) FROM users WHERE xp > ? OR (xp = ? AND id < ?)'); $s->execute([$me['xp'], $me['xp'], $me['id']]); $m['arank'] = 1 + (int)$s->fetchColumn();
        if (week_ok($prev) && $prev < $week) {
          $s = $db->prepare('SELECT wxp FROM ' . week_sql() . ' WHERE uid = :u'); $s->execute([':w' => $prev, ':u' => $me['id']]);
          $lw = (int)$s->fetchColumn();
          if ($lw > 0) { $s = $db->prepare('SELECT COUNT(*) FROM ' . week_sql() . ' WHERE wxp > :x OR (wxp = :x AND uid < :u)'); $s->execute([':w' => $prev, ':x' => $lw, ':u' => $me['id']]); $m['lrank'] = 1 + (int)$s->fetchColumn(); $m['lwxp'] = $lw; }
          $s = $db->prepare('SELECT COUNT(*) FROM ' . week_sql()); $s->execute([':w' => $prev]); $m['lcount'] = (int)$s->fetchColumn();
        }
        $res['me'] = $m;
      }
    }
    out($res);

  case 'logout':
    $t = (string)($in['token'] ?? '');
    $db->prepare('DELETE FROM tokens WHERE hash = ?')->execute([hash('sha256', $t)]);
    out(['ok' => true]);

  case 'delete':
    $u = auth($db, $in);
    if (!password_verify((string)($in['password'] ?? ''), $u['pass'])) out(['ok' => false, 'error' => 'bad']);
    $db->prepare('DELETE FROM tokens WHERE uid = ?')->execute([$u['id']]);
    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$u['id']]);
    out(['ok' => true]);

  default:
    out(['ok' => false, 'error' => 'action'], 400);
}
