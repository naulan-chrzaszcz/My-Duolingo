<?php
/*
 * Speakeasy — envoi des rappels quotidiens.
 *
 * À lancer TOUTES LES HEURES :
 *  - par une tâche cron de ton hébergeur :   php /chemin/vers/api/remind.php
 *  - ou par un service de cron en ligne (ex. cron-job.org) qui appelle :
 *      https://ton-site/api/remind.php?key=TA_CLE
 *    après avoir choisi une clé secrète ci-dessous.
 *
 * Un rappel n'est envoyé qu'une fois par jour, à l'heure choisie par la personne,
 * et seulement si elle n'a pas encore pratiqué ce jour-là.
 */
$CRON_KEY = '';                                  // ex. 'une-longue-cle-secrete' (obligatoire pour l'appel par URL)
$VAPID_SUBJECT = 'mailto:ton-email@exemple.fr';  // ton adresse e-mail (exigée par Apple / Google)
$DB_PATH = __DIR__ . '/data/speakeasy.sqlite';
$VAPID_FILE = __DIR__ . '/data/vapid.json';
// v32 : réglages gardés dans api/data/config.php (écrit par l'installateur), pour qu'une mise à jour du site ne les efface plus
$CFG = is_file(__DIR__ . '/data/config.php') ? (include __DIR__ . '/data/config.php') : [];
if (is_array($CFG)) {
  if (!empty($CFG['vapid_subject'])) $VAPID_SUBJECT = (string)$CFG['vapid_subject'];
  if (!empty($CFG['cron_key'])) $CRON_KEY = (string)$CFG['cron_key'];
}

if (PHP_SAPI !== 'cli') {
  header('Content-Type: text/plain; charset=utf-8');
  if ($CRON_KEY === '' || !hash_equals($CRON_KEY, (string)($_GET['key'] ?? ''))) { http_response_code(403); exit("Clé invalide (définis \$CRON_KEY dans remind.php).\n"); }
}
function b64u($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }

// Signature ES256 (DER -> r||s de 64 octets)
function der2raw($der) {
  $o = 2; if (ord($der[1]) & 0x80) $o += ord($der[1]) & 0x7f;
  $o++; $rl = ord($der[$o++]); $r = substr($der, $o, $rl); $o += $rl;
  $o++; $sl = ord($der[$o++]); $s = substr($der, $o, $sl);
  $r = str_pad(ltrim($r, "\0"), 32, "\0", STR_PAD_LEFT); $s = str_pad(ltrim($s, "\0"), 32, "\0", STR_PAD_LEFT);
  return $r . $s;
}
function vapidJwt($endpoint, $v, $subject) {
  $p = parse_url($endpoint);
  $h = b64u(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
  $c = b64u(json_encode(['aud' => $p['scheme'] . '://' . $p['host'], 'exp' => time() + 12 * 3600, 'sub' => $subject]));
  openssl_sign("$h.$c", $sig, $v['private'], OPENSSL_ALGO_SHA256);
  return "$h.$c." . b64u(der2raw($sig));
}
function sendPush($endpoint, $v, $subject) {
  $ch = curl_init($endpoint);
  curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_POSTFIELDS => '',
    CURLOPT_HTTPHEADER => ['TTL: 43200', 'Urgency: normal', 'Content-Length: 0', 'Authorization: vapid t=' . vapidJwt($endpoint, $v, $subject) . ', k=' . $v['public']]]);
  curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  return $code;
}

if (!is_file($VAPID_FILE)) exit("Aucun abonné pour l'instant.\n");
$v = json_decode((string)file_get_contents($VAPID_FILE), true);
$db = new PDO('sqlite:' . $DB_PATH);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$rows = $db->query('SELECT s.endpoint, s.hour, s.tz, s.last_day, u.state FROM subs s JOIN users u ON u.id = s.uid')->fetchAll(PDO::FETCH_ASSOC);
$sent = 0;
foreach ($rows as $r) {
  $local = time() + 60 * (int)$r['tz'];
  $day = gmdate('Y-m-d', $local);
  if ((int)gmdate('G', $local) !== (int)$r['hour'] || $r['last_day'] === $day) continue;
  $st = json_decode((string)$r['state'], true) ?: [];
  if (($st['lastDay'] ?? '') === $day) continue;               // déjà pratiqué aujourd'hui
  $code = sendPush($r['endpoint'], $v, $VAPID_SUBJECT);
  if ($code === 404 || $code === 410) { $db->prepare('DELETE FROM subs WHERE endpoint = ?')->execute([$r['endpoint']]); continue; }
  if ($code >= 200 && $code < 300) { $db->prepare('UPDATE subs SET last_day = ? WHERE endpoint = ?')->execute([$day, $r['endpoint']]); $sent++; }
}
echo "Rappels envoyés : $sent\n";
