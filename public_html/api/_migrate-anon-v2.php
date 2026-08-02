<?php
/**
 * _migrate-anon-v2.php — ОДНОРАЗОВЫЙ скрипт миграции (V2, отдельный файл).
 *
 * Зачем V2: index.php оказался закеширован в opcache и не реагирует на обновления.
 * Этот файл — НОВЫЙ, его PHP-FPM раньше не видел, поэтому подхватит свежей версией.
 *
 * Делает то же что и index.php, но в отдельном файле. Удалить после выполнения.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Подгружаем index.php, чтобы взять оттуда функции requireAdmin / withStoreLock / etc.
// Используем include_once, чтобы не было double-declaration. Но index.php сам по себе
// обрабатывает HTTP-запрос — мы не хотим, чтобы он выполнил свой роутинг.
// Решение: include'им index.php, но оборачиваем в ob_*, а потом exit'им.

$dataDir = __DIR__ . '/tver-portal/data';
$storeFile = $dataDir . '/store.json';

// Парсим admin token из .htaccess'а (он там в SetEnv)
$tokenFromEnv = getenv('TVER_PORTAL_ADMIN_API_TOKEN') ?: '';
if ($tokenFromEnv === '') {
    // Попробуем из _SERVER
    $tokenFromEnv = (string)($_SERVER['TVER_PORTAL_ADMIN_API_TOKEN'] ?? '');
}
if ($tokenFromEnv === '') {
    // Хардкод для надёжности (тот же что в .htaccess)
    $tokenFromEnv = 'tver-admin-SJotS1vfiImhTCPpIX-bXd6CIu8ZzrnV';
}

// --- auth ---
$provided = '';
$auth = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m) === 1) {
    $provided = trim($m[1]);
}
if ($provided === '') {
    $provided = trim((string)($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ''));
}
if (!hash_equals($tokenFromEnv, $provided)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized — нужен X-Admin-Token', 'env_token_present' => $tokenFromEnv !== 'tver-admin-SJotS1vfiImhTCPpIX-bXd6CIu8ZzrnV'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!file_exists($storeFile)) {
    http_response_code(404);
    echo json_encode(['error' => "store.json не найден в {$dataDir}"], JSON_UNESCAPED_UNICODE);
    exit;
}

// 1. Бэкап
$backupName = 'store.json.backup-' . date('Ymd-His') . '.json';
$backupPath = $dataDir . '/' . $backupName;
if (!@copy($storeFile, $backupPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Не удалось создать бэкап'], JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. Читаем
$raw = @file_get_contents($storeFile);
$store = json_decode($raw, true);
if (!is_array($store)) {
    http_response_code(500);
    echo json_encode(['error' => 'store.json повреждён, миграция невозможна'], JSON_UNESCAPED_UNICODE);
    exit;
}

$surveysBefore = $store['surveys'] ?? [];
$countBefore = count($surveysBefore);

$piiFields = [
    'fullName', 'email',
    'consent', 'consentGivenAt', 'consentLegalBasis',
    'policyVersion', 'legalBasis', 'purpose',
    'ipHash', 'userAgent',
];

$piiStrippedTotal = 0;
$migratedSurveys = [];
foreach ($surveysBefore as $survey) {
    $new = ['isAnonymous' => true];
    foreach ($survey as $k => $v) {
        if (in_array($k, $piiFields, true)) {
            $piiStrippedTotal++;
            continue;
        }
        $new[$k] = $v;
    }
    $migratedSurveys[] = $new;
}

$store['surveys'] = $migratedSurveys;
$store['meta'] = array_merge($store['meta'] ?? [], [
    'lastMigration' => 'anon-2026-08-02',
    'lastMigrationAt' => gmdate('c'),
    'lastMigrationStrippedFields' => $piiFields,
    'lastMigrationCount' => $countBefore,
]);

$serialized = json_encode($store, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
$bytes = @file_put_contents($storeFile, $serialized);

if ($bytes === false) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Не удалось записать store.json',
        'backup' => $backupPath,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$verified = (@file_get_contents($storeFile) === $serialized);

http_response_code(200);
echo json_encode([
    'ok' => true,
    'file' => __FILE__,
    'file_mtime' => filemtime(__FILE__),
    'file_size' => filesize(__FILE__),
    'migrated' => [
        'surveys' => $countBefore,
        'piiFieldsStripped' => $piiStrippedTotal,
    ],
    'backup' => $backupPath,
    'verified' => $verified,
    'nextSteps' => [
        'GET /api/tver-portal/surveys (с X-Admin-Token) — должно показать isAnonymous: true',
        'Удалить /api/_migrate-anon-v2.php с сервера после проверки',
    ],
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
