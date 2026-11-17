<?php
/*
 * Speakeasy — abonnements aux rappels quotidiens (Web Push, sans contenu chiffré).
 * Les clés VAPID sont générées automatiquement au premier appel dans api/data/vapid.json.
 * Les rappels sont envoyés par api/remind.php (à lancer toutes les heures, voir ce fichier).
 */
$DB_PATH = __DIR__ . '/data/speakeasy.sqlite';
$VAPID_FILE = __DIR__ . '/data/vapid.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }
function b64u($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }

function vapid($file) {
  if (is_file($file)) { $v = json_decode((string)file_get_contents($file), true); if (!empty($v['public']) && !empty($v['private'])) return $v; }
  if (!is_dir(dirname($file))) @mkdir(dirname($file), 0700, true);
  $k = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
  if (!$k) out(['ok' => false, 'error' => 'openssl'], 500);
  openssl_pkey_export($k, $pem);
  $d = openssl_pkey_get_details($k);
  $pub = "\x04" . str_pad($d['ec']['x'], 32, "\0", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\0", STR_PAD_LEFT);
  $v = ['public' => b64u($pub), 'private' => $pem];
  file_put_contents($file, json_encode($v)); @chmod($file, 0600);
  return $v;
}

require_once __DIR__ . '/migrate.php';
try {
  $db = speakeasy_db($DB_PATH);
} catch (Exception $e) { out(['ok' => false, 'error' => 'db'], 500); }

$a = $_GET['a'] ?? '';
if ($a === 'key') { $v = vapid($VAPID_FILE); out(['ok' => true, 'key' => $v['public']]); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['ok' => false, 'error' => 'method'], 405);
$in = json_decode((string)file_get_contents('php://input'), true) ?: [];

// même authentification que account.php
$t = (string)($in['token'] ?? '');
if (strlen($t) !== 64) out(['ok' => false, 'error' => 'auth'], 401);
try { $s = $db->prepare('SELECT uid FROM tokens WHERE hash = ?'); $s->execute([hash('sha256', $t)]); $uid = $s->fetchColumn(); }
catch (Exception $e) { $uid = false; }
if (!$uid) out(['ok' => false, 'error' => 'auth'], 401);

if ($a === 'subscribe') {
  $ep = (string)($in['sub']['endpoint'] ?? '');
  if (!preg_match('#^https://[^\s]+$#', $ep) || strlen($ep) > 600) out(['ok' => false, 'error' => 'endpoint'], 400);
  $hour = max(0, min(23, (int)($in['hour'] ?? 19)));
  $tz = max(-840, min(840, (int)($in['tz'] ?? 60)));
  $db->prepare('INSERT OR REPLACE INTO subs(endpoint, uid, hour, tz, last_day, created) VALUES(?, ?, ?, ?, COALESCE((SELECT last_day FROM subs WHERE endpoint = ?), ""), ?)')
     ->execute([$ep, $uid, $hour, $tz, $ep, time()]);
  out(['ok' => true]);
}
if ($a === 'unsubscribe') {
  $db->prepare('DELETE FROM subs WHERE endpoint = ? AND uid = ?')->execute([(string)($in['endpoint'] ?? ''), $uid]);
  out(['ok' => true]);
}
out(['ok' => false, 'error' => 'action'], 400);
