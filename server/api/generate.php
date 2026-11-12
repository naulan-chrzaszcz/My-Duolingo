<?php
/*
 * Speakeasy — génération d'exercices par IA (relais vers l'API Claude d'Anthropic)
 *
 * INSTALLATION
 *  1. Dépose ce fichier dans un dossier « api » à côté de index.html :  /index.html  et  /api/generate.php
 *  2. Crée une clé API sur https://console.anthropic.com (l'API est facturée à l'usage, séparément de claude.ai).
 *  3. Mets la clé dans la variable d'environnement ANTHROPIC_API_KEY de ton hébergement
 *     (recommandé), ou à défaut dans $API_KEY ci-dessous. Ne la mets JAMAIS dans index.html.
 *  4. Ouvre https://ton-site/api/generate.php : tu dois voir {"ok":true}.
 *
 * CLÉ PAR PROFIL (recommandé) : chaque personne colle SA clé dans son profil (rubrique « Mon Claude »).
 * L'app appelle alors l'API Claude directement depuis le navigateur ; si le navigateur bloque l'appel,
 * elle passe par ce fichier avec l'en-tête X-User-Key : la clé est utilisée pour cette requête puis oubliée
 * (jamais enregistrée ni journalisée), et la facture reste celle de la personne.
 * La clé commune ci-dessous est FACULTATIVE : laisse-la vide si chacun utilise son propre Claude.
 *
 * Le prompt est construit ICI, côté serveur : le navigateur n'envoie que des données
 * (cours, niveau, éléments vus). Personne ne peut donc utiliser la clé commune pour autre chose.
 * Une limite par adresse IP protège la facture de la clé commune (modifiable ci-dessous).
 * Nécessite PHP 7.4+ avec l'extension cURL.
 */

$API_KEY      = getenv('ANTHROPIC_API_KEY') ?: '';   // FACULTATIF : clé commune (ou 'sk-ant-...')
$MODEL        = 'claude-haiku-5-5';                   // modèle de la clé commune : rapide et économique
$USER_MODELS  = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
$MAX_PER_HOUR = 30;                                   // générations max par heure et par adresse IP

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'GET') { echo json_encode(['ok' => $API_KEY !== '', 'relay' => true]); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok' => false, 'error' => 'method']); exit; }

// ---- Clé du profil (en-tête X-User-Key) ou clé commune ----
$USER_KEY = trim((string)($_SERVER['HTTP_X_USER_KEY'] ?? ''));
if ($USER_KEY !== '' && !preg_match('/^sk-ant-[A-Za-z0-9_\-]{20,250}$/', $USER_KEY)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'bad_key', 'status' => 401]); exit; }
if ($USER_KEY !== '') {
  $KEY = $USER_KEY;
  $um = (string)($_SERVER['HTTP_X_MODEL'] ?? '');
  if (in_array($um, $USER_MODELS, true)) $MODEL = $um;
} else {
  $KEY = $API_KEY;
}
if ($KEY === '') { http_response_code(503); echo json_encode(['ok' => false, 'error' => 'no_key']); exit; }

// ---- Limite par IP (uniquement pour la clé commune) ----
if ($USER_KEY === '') {
$ip   = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$file = sys_get_temp_dir() . '/speakeasy_' . md5($ip) . '.json';
$now  = time();
$hits = is_file($file) ? (json_decode((string)@file_get_contents($file), true) ?: []) : [];
$hits = array_values(array_filter($hits, function ($t) use ($now) { return $t > $now - 3600; }));
if (count($hits) >= $MAX_PER_HOUR) { http_response_code(429); echo json_encode(['ok' => false, 'error' => 'rate_limited']); exit; }
$hits[] = $now;
@file_put_contents($file, json_encode($hits));
}

// ---- Lecture et nettoyage des données reçues ----
$in    = json_decode((string)file_get_contents('php://input'), true) ?: [];
if (!function_exists('mb_substr')) { function mb_substr($s, $start, $n) { return preg_match('/^.{0,' . (int)$n . '}/us', (string)$s, $m) ? $m[0] : ''; } } // fonctionne aussi sans l'extension mbstring
$clean = function ($s, $n) { $s = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string)$s); return mb_substr(trim($s), 0, $n); };
$kind  = in_array($in['kind'] ?? '', ['trans', 'toeic', 'volt'], true) ? $in['kind'] : 'trans';
$lang  = in_array($in['lang'] ?? '', ['en-US', 'fr-FR', 'ko-KR'], true) ? $in['lang'] : 'en-US';
$course = $clean($in['course'] ?? '', 40);
$level  = $clean($in['level'] ?? '', 40);
$units  = array_slice(array_map(function ($s) use ($clean) { return $clean($s, 80); }, (array)($in['units'] ?? [])), 0, 6);
$seen   = array_slice(array_map(function ($s) use ($clean) { return $clean($s, 160); }, (array)($in['seen'] ?? [])), 0, 40);
$errors = array_slice(array_map(function ($s) use ($clean) { return $clean($s, 300); }, (array)($in['errors'] ?? [])), 0, 25);
$coach  = count($errors) > 0;
$theme  = $clean($in['theme'] ?? '', 80);
$mode = (string)($in['mode'] ?? '');
// Seuls les types de génération de l'application sont acceptés (pas de prompt libre)
if (!in_array($mode, ['', 'exercise', 'word', 'write', 'unit', 'story'], true)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'bad_mode']); exit; }
$wordMode = $mode === 'word';
$words  = array_slice(array_map(function ($s) use ($clean) { return $clean($s, 60); }, (array)($in['words'] ?? [])), 0, 10);

// ---- Prompt (identique à celui de index.html) ----
$L = ['en-US' => 'anglais', 'fr-FR' => 'français', 'ko-KR' => 'coréen'][$lang];
$dg = $coach ? '"diag":"diagnostic","focus":["point faible"],' : '';
if ($kind === 'volt') {
  $schema = '{' . $dg . '"c":[["phrase française avec ___ à la place du mot piège",["bonne orthographe","piège","piège","piège"],0,"règle expliquée en une phrase"]],"d":["phrase de dictée contenant un piège d\'orthographe"]}';
  $rules  = 'Donne 14 éléments dans "c" et 4 dans "d". Pièges comme au Projet Voltaire / Certificat Voltaire : homophones, accords du participe passé, conjugaison, pluriels, orthographe d\'usage, orthotypographie.';
} else {
  $ko = $lang === 'ko-KR'; $toeic = $kind === 'toeic';
  $schema = '{' . $dg . '"p":[["phrase en français","traduction ' . $L . ' principale",' . ($ko ? '"romanisation révisée",' : '') . '"variante correcte acceptée"]],"c":[["phrase en ' . $L . ' avec ___ à la place d\'un mot",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication courte en français"]],"v":[["mot français","traduction ' . $L . '"]]'
    . ($toeic ? ',"l":[["question orale",["meilleure réponse","réponse piège","réponse piège"],0]],"cv":[{"d":[["M","réplique"],["W","réplique"]],"q":[["question",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication en français"]]}],"rd":[{"x":"document (e-mail, annonce, messages…)","q":[["question",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication en français"]]}]' : '') . '}';
  $rules  = 'Donne 8 éléments dans "p" (1 à 3 variantes de traduction correctes par phrase), '
    . ($toeic ? '10 dans "c" (style TOEIC Parts 5-6), 4 dans "l" (Part 2), 2 dans "cv" (Parts 3-4 : conversation de 4 répliques entre M et W, ou annonce d\'un seul locuteur N ; 3 questions chacune), 2 dans "rd" (Part 7, 2 questions chacun), ' : '8 dans "c", ')
    . '6 dans "v" (mots courts).';
}
$prompt = "Tu es le coach d'une application d'apprentissage façon Duolingo. L'élève est francophone.\n"
  . "Cours : $course (langue étudiée : $L). Niveau : $level. Unités étudiées : " . implode(', ', $units) . ".\n"
  . "Éléments déjà vus par l'élève (réutilise ce vocabulaire et ces structures dans des phrases NOUVELLES, jamais identiques) :\n- "
  . implode("\n- ", $seen) . "\n\n"
  . ($theme !== '' ? "Thème imposé par l'élève : « $theme ». TOUS les exercices doivent porter sur ce thème (vocabulaire, situations, phrases), au niveau indiqué, en réutilisant si possible les structures déjà vues.\n\n" : '')
  . ($coach ? "Erreurs récentes de l'élève (exercice | réponse attendue | réponse donnée) :\n- " . implode("\n- ", $errors)
      . "\n\nAnalyse ces erreurs et repère les erreurs RÉCURRENTES : mots ou vocabulaire, construction des phrases, temps et conjugaison, accords, prépositions, orthographe, écoute. Dans \"diag\", écris un diagnostic bienveillant en français (2 à 3 phrases, tutoiement). Dans \"focus\", liste 2 à 4 points faibles courts. Au moins 70 % des exercices doivent cibler ces points faibles, sous des formes variées.\n\n" : '')
  . "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n$schema\n$rules\n"
  . "Règles : langue naturelle et 100 % correcte ; difficulté adaptée au niveau, de la plus facile à la plus difficile ; dans \"c\", une seule bonne réponse sans ambiguïté et des distracteurs plausibles ; varie les thèmes de la vie quotidienne et professionnelle.";

// ---- Mode « mots à retenir » : traduction + exemple ----
if ($wordMode) {
  if ($lang === 'fr-FR') $fmt = '{"w":[["mot correctement orthographié","définition courte","phrase d\'exemple naturelle","piège d\'orthographe à retenir"]]}';
  else $fmt = '{"w":[["mot ou expression en ' . $L . '","traduction française courte","phrase d\'exemple simple et naturelle en ' . $L . '","traduction française de l\'exemple"' . ($lang === 'ko-KR' ? ',"romanisation révisée du mot"' : '') . ']]}';
  $prompt = "Tu aides un élève francophone qui apprend le $L. Il a noté ces mots ou expressions (écrits en $L ou en français) :\n- " . implode("\n- ", $words)
    . "\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n$fmt\nUne entrée par mot, dans le même ordre. Si un mot est écrit en français, donne son équivalent en $L. Corrige l'orthographe si besoin.";
}

// ---- Mode « rédaction » : correction d'un texte ----
if ($mode === 'write') {
  $task = $clean($in['task'] ?? '', 500); $text = mb_substr(str_replace("\r", '', (string)($in['text'] ?? '')), 0, 2000); $lvl = $clean($in['level'] ?? '', 40);
  $prompt = "Tu es professeur de $L et tu corriges la rédaction d'un élève francophone. Niveau visé : $lvl.\nConsigne : $task\n\nTexte de l'élève :\n\"\"\"\n$text\n\"\"\"\n\nCorrige toutes les fautes (orthographe, grammaire, conjugaison, vocabulaire, tournures peu naturelles) et vérifie que la consigne est respectée. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n{\"score\":0,\"corrige\":\"texte entièrement corrigé\",\"erreurs\":[[\"extrait fautif\",\"correction\",\"notion courte (ex. accord du participe passé, present perfect, préposition, honorifique)\",\"explication courte en français\"]],\"bilan\":\"2 phrases bienveillantes en français avec un conseil précis\"}\nscore est une note sur 100 (respect de la consigne, correction de la langue, richesse). Si le texte est parfait, erreurs est une liste vide.";
}
// ---- Mode « unité » : création de l'unité suivante ----
if ($mode === 'unit') {
  $done = array_slice(array_map(function ($s) use ($clean) { return $clean($s, 140); }, (array)($in['done'] ?? [])), 0, 14);
  $num = max(1, min(999, (int)($in['num'] ?? 1)));
  $ko = $lang === 'ko-KR';
  $schema = $kind === 'volt'
    ? '{"t":"titre court","d":"notions de l\'unité, séparées par des virgules","tip":"astuce de cours en 2 phrases","c":[["phrase avec ___",["bonne orthographe","piège","piège","piège"],0,"règle"]],"d2":["phrase de dictée"]}'
    : '{"t":"titre court","d":"notions de l\'unité, séparées par des virgules","tip":"astuce de cours en 2 phrases","p":[["phrase en français","traduction ' . $L . '",' . ($ko ? '"romanisation révisée",' : '') . '"variante acceptée"]],"v":[["mot français","traduction ' . $L . '"]],"c":[["phrase en ' . $L . ' avec ___",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication en français"]]'
      . ($kind === 'toeic' ? ',"l":[["question orale",["meilleure réponse","piège","piège"],0]],"cv":[{"d":[["M","réplique"],["W","réplique"]],"q":[["question",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication"]]}],"rd":[{"x":"document","q":[["question",["bonne réponse","distracteur","distracteur","distracteur"],0,"explication"]]}]' : '') . '}';
  $prompt = "Tu conçois la suite d'un parcours d'apprentissage façon Duolingo pour un élève francophone.\nCours : $course (langue : $L). Unités déjà terminées (titre : notions) :\n- " . implode("\n- ", $done)
    . "\n\nCrée l'unité numéro $num : un thème NOUVEAU et des notions NOUVELLES qui prolongent logiquement le parcours, niveau $level (un peu plus difficile que la dernière unité). Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n$schema\n"
    . ($kind === 'volt' ? 'Donne 12 éléments dans "c" et 4 dans "d2".' : 'Donne 10 éléments dans "p" (1 à 3 variantes correctes chacun), 6 dans "v", 6 dans "c"' . ($kind === 'toeic' ? ', 4 dans "l", 2 dans "cv" (3 questions chacun), 2 dans "rd" (2 questions chacun)' : '') . '.')
    . "\nLangue naturelle et 100 % correcte, une seule bonne réponse par question.";
}

// ---- Mode « histoire » : histoire dialoguée inédite avec questions ----
if ($mode === 'story') {
  $fr = $lang === 'fr-FR' && empty($in['fle']);
  $prompt = "Tu écris une courte histoire dialoguée pour une application d'apprentissage façon Duolingo. L'élève est francophone." . ($fr ? " Il prépare le Certificat Voltaire : l'histoire est en français et sert à repérer des pièges d'orthographe et de grammaire." : " Il apprend le $L.")
    . "\nNiveau : $level." . ($theme !== '' ? " Thème : « $theme »." : " Choisis une situation originale de la vie quotidienne ou professionnelle.")
    . "\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :\n"
    . '{"t":"titre court en français","ic":"un emoji","cast":{"Prénom":["M ou W","emoji du personnage"]},"items":[{"s":"Prénom","t":"réplique' . ($fr ? '' : ' en ' . $L) . '","fr":"' . ($fr ? '' : 'traduction française') . '"},{"q":"question","o":["bonne réponse","réponse fausse","réponse fausse"],"a":0}]}'
    . "\nRègles : 2 ou 3 personnages (M = homme, W = femme) ; 8 à 12 répliques naturelles et 100 % correctes, adaptées au niveau ; 3 questions intercalées dans l'histoire, juste après les répliques concernées, avec une seule bonne réponse, toujours en première position dans \"o\" (\"a\":0). "
    . ($fr ? "Les répliques sont en français, \"fr\" est une chaîne vide, et chaque question porte sur un piège d'orthographe ou de grammaire de la réplique qui précède."
      : ($lang === 'ko-KR' ? "Les questions sont en français et vérifient la compréhension ; ajoute la traduction française de chaque réplique dans \"fr\"." : "Les questions sont en anglais et vérifient la compréhension ; ajoute la traduction française de chaque réplique dans \"fr\"."));
}

// ---- Appel à l'API Claude ----
// Interface en anglais ou en coréen : même consigne que dans l'app (i18n.js, EN_SUFFIX / KO_SUFFIX)
if (($in['ui'] ?? '') === 'en') $prompt .= "\n\nIMPORTANT — LANGUAGE OF THE LEARNER: the learner is an English speaker using the app in English (not a French speaker). Ignore the earlier mentions of a French-speaking learner. Every text that would normally be written in French for the learner (sentences to translate, translations in the \"fr\" fields, word meanings, instructions, explanations, tips, feedback, diagnostics, titles, questions about a story) must be written in English instead. Keep the JSON field names exactly as specified. The language being studied stays as specified (French content stays in French when French is the language studied).";
if (($in['ui'] ?? '') === 'ko') $prompt .= "\n\nIMPORTANT — LANGUAGE OF THE LEARNER: the learner is a native Korean speaker using the app in Korean (not a French speaker). Ignore the earlier mentions of a French-speaking learner. Every text that would normally be written in French for the learner (sentences to translate, translations in the \"fr\" fields, word meanings, instructions, explanations, tips, feedback, diagnostics, titles, questions about a story) must be written in natural Korean (polite 해요체) instead. Keep the JSON field names exactly as specified. The language being studied stays as specified (English content stays in English, French content stays in French).";

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 90,
  CURLOPT_HTTPHEADER => [
    'content-type: application/json',
    'x-api-key: ' . $KEY,
    'anthropic-version: 2023-06-01',
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'model' => $MODEL,
    'max_tokens' => 6000,
    'messages' => [['role' => 'user', 'content' => $prompt]],
  ]),
]);
$res  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false || $code >= 400) { $e = json_decode((string)$res, true); http_response_code(502); echo json_encode(['ok' => false, 'error' => 'api', 'status' => $code, 'message' => mb_substr((string)($e['error']['message'] ?? ''), 0, 200)]); exit; }
$j = json_decode($res, true);
$text = $j['content'][0]['text'] ?? '';
echo json_encode(['ok' => $text !== '', 'text' => $text]);
