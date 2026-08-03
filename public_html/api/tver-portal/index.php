<?php
/**
 * urban2kad.ru — Tver Master Plan portal API
 *
 * Маршрутизация: запросы /api/tver-portal/* через .htaccess редиректятся
 * сюда с параметром ?route=<path>. Ответы — JSON.
 *
 * Версия 2026-08-02: анонимный опрос (без ФИО/email/consent/policyVersion),
 * миграционный роут _migrate_anon для разовой очистки ПДн из исторических анкет.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$config = [
    'policyVersion' => '2026-05-19',
    'retentionDays' => 365,
    'contactEmail' => 'info@2kad.ru',
    'adminToken' => 'tver-admin-SJotS1vfiImhTCPpIX-bXd6CIu8ZzrnV',
];

// Telegram-уведомления (бот для алертов в админский канал).
// Файл с конфигом (telegram-config.php) и одноразовый telegram-setup.php
// должны лежать рядом, в gitignore/deployignore.
require_once __DIR__ . '/telegram-notify.php';

$dataDir = __DIR__ . '/data';
$storeFile = $dataDir . '/store.json';
$uploadsDir = __DIR__ . '/uploads';

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0775, true);
}

function nowIso(): string {
    return gmdate('c');
}

function jsonResponse(int $status, array $payload): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function readBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        jsonResponse(400, ['error' => 'Некорректный JSON тела запроса.']);
    }
    return $data;
}

function normalize($value): string {
    if ($value === null) return '';
    return trim((string)$value);
}

function defaultStore(): array {
    return [
        'meta' => [
            'createdAt' => nowIso(),
            'version' => 1,
        ],
        'counters' => [
            'survey' => 0,
            'idea' => 0,
            'pdRequest' => 0,
        ],
        'surveys' => [],
        'ideas' => [],
        'likes' => [],
        'moderationLog' => [],
        'personalDataRequests' => [],
    ];
}

function withStoreLock(string $storeFile, callable $callback, int $retentionDays) {
    if (!file_exists($storeFile)) {
        file_put_contents($storeFile, json_encode(defaultStore(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
    $handle = fopen($storeFile, 'c+');
    if ($handle === false) {
        jsonResponse(500, ['error' => 'Хранилище недоступно.']);
    }
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        jsonResponse(500, ['error' => 'Не удалось заблокировать хранилище.']);
    }
    rewind($handle);
    $raw = stream_get_contents($handle);
    $store = json_decode((string)$raw, true);
    if (!is_array($store)) {
        $store = defaultStore();
    } else {
        // Лечим исторические store.json без некоторых ключей
        // (например, 'likes' добавили позже). Дефолт → текущее, чтобы
        // уже сохранённые данные не затирались, а недостающее дополнялось.
        $store = array_replace_recursive(defaultStore(), $store);
    }
    try {
        $result = $callback($store);
    } catch (Throwable $e) {
        flock($handle, LOCK_UN);
        fclose($handle);
        throw $e;
    }
    $serialized = json_encode($store, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, $serialized);
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    return $result;
}

function requireAdmin(string $token): void {
    $auth = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
    $provided = '';
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m) === 1) {
        $provided = trim($m[1]);
    }
    if ($provided === '') {
        $provided = trim((string)($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ''));
    }
    if (!hash_equals($token, $provided)) {
        jsonResponse(401, ['error' => 'Unauthorized']);
    }
}

function assertPolicyVersion(array $payload, string $policyVersion): void {
    $client = normalize($payload['policyVersion'] ?? '');
    if ($client === '') {
        jsonResponse(400, ['error' => 'Не указана версия политики обработки персональных данных.']);
    }
    if ($client !== $policyVersion) {
        jsonResponse(400, ['error' => 'Версия политики устарела. Обновите страницу и подтвердите согласие повторно.']);
    }
}

function assertConsent(array $payload): void {
    $consent = !empty($payload['consent']);
    if (!$consent) {
        jsonResponse(400, ['error' => 'Необходимо согласие на обработку персональных данных.']);
    }
}

function getClientIpHash(): string {
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    if ($ip === '') return '';
    return hash('sha256', $ip . '|tver-portal-2026');
}

function saveIdeaImage(?string $dataUrl, ?string $originalName, int $ideaId, string $uploadsDir): ?string {
    if ($dataUrl === null || $dataUrl === '') return null;
    if (!preg_match('#^data:image/(jpeg|jpg|png|webp);base64,(.+)$#i', $dataUrl, $m)) {
        jsonResponse(400, ['error' => 'Некорректный формат изображения.']);
    }
    $bin = base64_decode($m[2], true);
    if ($bin === false) {
        jsonResponse(400, ['error' => 'Не удалось декодировать изображение.']);
    }
    if (strlen($bin) === 0) {
        jsonResponse(400, ['error' => 'Файл изображения пустой.']);
    }
    if (strlen($bin) > 3 * 1024 * 1024) {
        jsonResponse(400, ['error' => 'Размер изображения не должен превышать 3 МБ.']);
    }
    $ext = strtolower($m[1]);
    if ($ext === 'jpeg') $ext = 'jpg';
    $filename = sprintf('idea-%d-%d-%s.%s', $ideaId, time(), substr(md5((string)microtime(true)), 0, 8), $ext);
    $filePath = rtrim($uploadsDir, '/\\') . DIRECTORY_SEPARATOR . $filename;
    if (file_put_contents($filePath, $bin) === false) {
        jsonResponse(500, ['error' => 'Не удалось сохранить изображение идеи.']);
    }
    @chmod($filePath, 0644);
    return '/api/tver-portal/uploads/' . $filename;
}

function ideaToPublic(array $idea): array {
    return [
        'id' => (int)($idea['id'] ?? 0),
        'title' => (string)($idea['title'] ?? ''),
        'description' => (string)($idea['description'] ?? ''),
        'theme' => (string)($idea['theme'] ?? ''),
        'latitude' => (float)($idea['latitude'] ?? 0),
        'longitude' => (float)($idea['longitude'] ?? 0),
        'address' => (string)($idea['address'] ?? ''),
        'authorName' => (string)($idea['authorName'] ?? ''),
        'status' => (string)($idea['status'] ?? 'pending'),
        'createdAt' => (string)($idea['createdAt'] ?? ''),
        'likesCount' => (int)($idea['likesCount'] ?? 0),
        'imageUrl' => $idea['imageUrl'] ?? null,
    ];
}

function getRoute(): string {
    $route = normalize($_GET['route'] ?? '');
    if ($route !== '') {
        return trim($route, '/');
    }
    $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
    $path = parse_url($uri, PHP_URL_PATH);
    if (!is_string($path)) return '';
    $prefix = '/api/tver-portal/';
    $pos = strpos($path, $prefix);
    if ($pos === false) {
        return trim(str_replace('/api/tver-portal', '', $path), '/');
    }
    return trim(substr($path, $pos + strlen($prefix)), '/');
}

if ($config['adminToken'] === '') {
    jsonResponse(500, ['error' => 'Admin token не настроен на сервере.']);
}

$route = getRoute();
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

$allowedThemes = ['transport', 'ecology', 'landscaping', 'housing', 'economy', 'culture', 'tourism', 'social', 'mobility', 'safety', 'other'];
$allowedAge = ['under_18', '18_30', '31_45', '46_60', '60_plus'];
$allowedRequestTypes = ['access', 'update', 'delete', 'withdraw_consent', 'block', 'complaint'];
$allowedModerationStatuses = ['pending', 'approved', 'needs_revision', 'rejected'];
$allowedPdStatuses = ['new', 'in_progress', 'completed', 'rejected'];

if ($route === 'privacy-meta' && $method === 'GET') {
    jsonResponse(200, [
        'ok' => true,
        'data' => [
            'policyVersion' => $config['policyVersion'],
            'retentionDays' => $config['retentionDays'],
            'contactEmail' => $config['contactEmail'],
            'legalBasis' => [
                'consent' => '152-ФЗ, статья 9',
                'processing' => '152-ФЗ, статья 6, часть 1, пункт 1',
            ],
            'purposes' => [
                'survey' => 'Сбор общественного мнения по мастер-плану Твери',
                'idea' => 'Сбор и публикация инициатив для мастер-плана Твери',
                'rightsRequest' => 'Обработка запроса субъекта персональных данных',
            ],
        ],
    ]);
}

if ($route === 'analytics' && $method === 'GET') {
    requireAdmin($config['adminToken']);
    $data = withStoreLock($storeFile, static function (array &$store) use ($config): array {
        $surveys = $store['surveys'];
        $now = time();
        $cutoff = $now - ($config['retentionDays'] * 86400);
        $active = 0;
        foreach ($surveys as $s) {
            $ts = strtotime((string)($s['createdAt'] ?? ''));
            if ($ts !== false && $ts >= $cutoff) $active++;
        }
        $byAge = [];
        $byDistrict = [];
        $byTopics = [];
        $satisfactionSum = 0;
        $satisfactionCount = 0;
        foreach ($surveys as $s) {
            $a = (string)($s['ageGroup'] ?? '');
            if ($a !== '') $byAge[$a] = ($byAge[$a] ?? 0) + 1;
            $d = (string)($s['district'] ?? '');
            if ($d !== '') $byDistrict[$d] = ($byDistrict[$d] ?? 0) + 1;
            $t = $s['topics'] ?? [];
            if (is_array($t)) {
                foreach ($t as $topic) {
                    $tk = (string)$topic;
                    if ($tk !== '') $byTopics[$tk] = ($byTopics[$tk] ?? 0) + 1;
                }
            }
            $sat = (int)($s['satisfaction'] ?? 0);
            if ($sat >= 1 && $sat <= 5) {
                $satisfactionSum += $sat;
                $satisfactionCount++;
            }
        }
        $ideasApproved = 0;
        $ideasPending = 0;
        foreach ($store['ideas'] as $idea) {
            $st = (string)($idea['status'] ?? 'pending');
            if ($st === 'approved') $ideasApproved++;
            elseif ($st === 'pending' || $st === 'needs_revision') $ideasPending++;
        }
        return [
            'totalSurveys' => count($surveys),
            'activeSurveys' => $active,
            'averageSatisfaction' => $satisfactionCount > 0 ? round($satisfactionSum / $satisfactionCount, 2) : 0,
            'byAgeGroup' => $byAge,
            'byDistrict' => $byDistrict,
            'byTopics' => $byTopics,
            'ideasTotal' => count($store['ideas']),
            'ideasApproved' => $ideasApproved,
            'ideasPending' => $ideasPending,
            'likesTotal' => is_array($store['likes'] ?? null) ? count($store['likes']) : 0,
        ];
    }, $config['retentionDays']);
    jsonResponse(200, ['ok' => true, 'data' => $data]);
}

if ($route === 'surveys' && $method === 'POST') {
    $payload = readBody();

    if (normalize($payload['website'] ?? '') !== '') {
        jsonResponse(201, ['ok' => true, 'accepted' => true, 'id' => null]);
    }

    // Анонимная анкета: НЕ требуем ФИО/email/consent/policyVersion.
    $ageGroup = normalize($payload['ageGroup'] ?? '');
    $district = normalize($payload['district'] ?? '');

    $topics = isset($payload['topics']) && is_array($payload['topics'])
        ? array_values(array_filter(array_map('strval', $payload['topics'])))
        : [];
    $satisfaction = isset($payload['satisfaction']) ? (int)$payload['satisfaction'] : 0;

    if (
        !in_array($ageGroup, $allowedAge, true)
        || mb_strlen($district) < 2
        || count($topics) < 1
        || count($topics) > 5
        || $satisfaction < 1
        || $satisfaction > 5
    ) {
        jsonResponse(400, ['error' => 'Некорректные данные анкеты.']);
    }

    $readChecked = static function (array $payload, string $name): array {
        if (!isset($payload[$name]) || !is_array($payload[$name])) return [];
        return array_values(array_filter(array_map('strval', $payload[$name])));
    };
    $readOpt = static function (array $payload, string $name): ?string {
        $v = trim((string)($payload[$name] ?? ''));
        return $v === '' ? null : $v;
    };

    $id = withStoreLock($storeFile, static function (array &$store) use ($payload, $ageGroup, $district, $topics, $satisfaction, $readChecked, $readOpt): int {
        $id = (int)$store['counters']['survey'] + 1;
        $store['counters']['survey'] = $id;

        $store['surveys'][] = [
            'id' => $id,
            'isAnonymous' => true,
            'ageGroup' => $ageGroup,
            'districtChoice' => $readOpt($payload, 'districtChoice'),
            'district' => $district,
            'districtOther' => $readOpt($payload, 'districtOther'),
            'topics' => $topics,
            'satisfaction' => $satisfaction,
            'priorityProject' => $readOpt($payload, 'priorityProject'),
            'participantContext' => $readChecked($payload, 'participantContext'),
            'transportProblems' => $readChecked($payload, 'transportProblems'),
            'commuteTime' => $readOpt($payload, 'commuteTime'),
            'carParkingIssues' => $readChecked($payload, 'carParkingIssues'),
            'placesLove' => $readOpt($payload, 'placesLove'),
            'spacesMissing' => $readChecked($payload, 'spacesMissing'),
            'spacesMissingOther' => $readOpt($payload, 'spacesMissingOther'),
            'socialAccessSectors' => $readChecked($payload, 'socialAccessSectors'),
            'socialObjectNeeds' => $readChecked($payload, 'socialObjectNeeds'),
            'socialObjectNeedsOther' => $readOpt($payload, 'socialObjectNeedsOther'),
            'ideaReady' => $readOpt($payload, 'ideaReady'),
            'employmentStatus' => $readOpt($payload, 'employmentStatus'),
            'workLocation' => $readOpt($payload, 'workLocation'),
            'economyPriorities' => $readChecked($payload, 'economyPriorities'),
            'businessBarriers' => $readChecked($payload, 'businessBarriers'),
            'ecologyProblems' => $readChecked($payload, 'ecologyProblems'),
            'heritageObjects' => $readOpt($payload, 'heritageObjects'),
            'naturePlaces' => $readOpt($payload, 'naturePlaces'),
            'tourismRoutes' => $readOpt($payload, 'tourismRoutes'),
            'agglomerationTrips' => $readOpt($payload, 'agglomerationTrips'),
            'intermunicipalNeeds' => $readChecked($payload, 'intermunicipalNeeds'),
            'topProjects' => $readOpt($payload, 'topProjects'),
            'comment' => $readOpt($payload, 'comment'),
            'createdAt' => nowIso(),
        ];

        return $id;
    }, $config['retentionDays']);

    // Уведомление в Telegram-канал админа (best-effort, не ломает ответ).
    try {
        $tgCfgFile = __DIR__ . '/telegram-config.php';
        if (is_file($tgCfgFile)) {
            $tgCfg = include $tgCfgFile;
            if (is_array($tgCfg)) {
                $summaryRecord = [
                    'id'           => $id,
                    'ageGroup'     => $ageGroup,
                    'district'     => $district,
                    'topics'       => $topics,
                    'satisfaction' => $satisfaction,
                    'comment'      => $readOpt($payload, 'comment'),
                ];
                $adminUrl = isset($tgCfg['adminUrl']) && is_string($tgCfg['adminUrl']) && $tgCfg['adminUrl'] !== ''
                    ? $tgCfg['adminUrl']
                    : '/tver-masterplan/admin.html';
                telegramSendSurveySummary($summaryRecord, $adminUrl);
            }
        }
    } catch (Throwable $e) {
        error_log('[survey-notify] ' . $e->getMessage());
    }

    jsonResponse(201, ['ok' => true, 'accepted' => true, 'id' => $id]);
}

if ($route === 'surveys' && $method === 'GET') {
    requireAdmin($config['adminToken']);
    $items = withStoreLock($storeFile, static function (array &$store): array {
        $items = $store['surveys'];
        usort($items, static function ($a, $b) {
            return strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? ''));
        });
        return $items;
    }, $config['retentionDays']);
    jsonResponse(200, ['ok' => true, 'count' => count($items), 'data' => $items]);
}

if ($route === 'ideas' && $method === 'POST') {
    $payload = readBody();

    if (normalize($payload['website'] ?? '') !== '') {
        jsonResponse(201, ['ok' => true, 'accepted' => true, 'id' => null]);
    }

    assertConsent($payload);
    assertPolicyVersion($payload, $config['policyVersion']);

    $title = normalize($payload['title'] ?? '');
    $description = normalize($payload['description'] ?? '');
    $theme = normalize($payload['theme'] ?? '');
    $latitude = isset($payload['latitude']) ? (float)$payload['latitude'] : 0;
    $longitude = isset($payload['longitude']) ? (float)$payload['longitude'] : 0;
    $address = normalize($payload['address'] ?? '');
    $authorName = normalize($payload['authorName'] ?? '');

    if (
        mb_strlen($title) < 5
        || mb_strlen($description) < 20
        || !in_array($theme, $allowedThemes, true)
        || $latitude < -90 || $latitude > 90
        || $longitude < -180 || $longitude > 180
        || mb_strlen($address) < 4
        || mb_strlen($authorName) < 2
    ) {
        jsonResponse(400, ['error' => 'Некорректные данные идеи.']);
    }

    $id = withStoreLock($storeFile, static function (array &$store) use ($payload, $config, $title, $description, $theme, $latitude, $longitude, $address, $authorName, $uploadsDir): int {
        $id = (int)$store['counters']['idea'] + 1;
        $store['counters']['idea'] = $id;

        $timestamp = nowIso();
        $imageUrl = saveIdeaImage(
            isset($payload['ideaImageData']) ? (string)$payload['ideaImageData'] : null,
            isset($payload['ideaImageName']) ? (string)$payload['ideaImageName'] : null,
            $id,
            $uploadsDir
        );

        $store['ideas'][] = [
            'id' => $id,
            'title' => $title,
            'description' => $description,
            'theme' => $theme,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'address' => $address,
            'authorName' => $authorName,
            'authorEmail' => normalize($payload['authorEmail'] ?? ''),
            'authorPhone' => normalize($payload['authorPhone'] ?? ''),
            'ipHash' => getClientIpHash(),
            'userAgent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'consent' => true,
            'policyVersion' => $config['policyVersion'],
            'legalBasis' => '152-ФЗ, статья 6, часть 1, пункт 1',
            'consentLegalBasis' => '152-ФЗ, статья 9',
            'purpose' => 'Сбор и публикация инициатив для мастер-плана Твери',
            'imageUrl' => $imageUrl,
            'status' => 'pending',
            'moderationComment' => null,
            'moderatedBy' => null,
            'moderatedAt' => null,
            'likesCount' => 0,
            'createdAt' => $timestamp,
            'updatedAt' => $timestamp,
        ];

        $store['moderationLog'][] = [
            'id' => (int)($store['counters']['pdRequest'] ?? 0) + 1 + count($store['moderationLog']),
            'entityType' => 'idea',
            'entityId' => $id,
            'action' => 'submitted',
            'operatorId' => 'system',
            'comment' => 'Идея отправлена на модерацию',
            'createdAt' => $timestamp,
        ];

        return $id;
    }, $config['retentionDays']);

    jsonResponse(201, ['ok' => true, 'accepted' => true, 'id' => $id]);
}

if ($route === 'ideas' && $method === 'GET') {
    $themeFilter = normalize($_GET['theme'] ?? '');
    $ideas = withStoreLock($storeFile, static function (array &$store) use ($themeFilter): array {
        $items = $store['ideas'];
        $out = [];
        foreach ($items as $idea) {
            $st = (string)($idea['status'] ?? 'pending');
            if ($st !== 'approved') continue;
            if ($themeFilter !== '' && (string)($idea['theme'] ?? '') !== $themeFilter) continue;
            $out[] = ideaToPublic($idea);
        }
        usort($out, static function ($a, $b) {
            return strcmp((string)$b['createdAt'], (string)$a['createdAt']);
        });
        return $out;
    }, $config['retentionDays']);
    jsonResponse(200, ['ok' => true, 'count' => count($ideas), 'data' => $ideas]);
}

if (preg_match('#^ideas/(\d+)/like$#', $route, $m) === 1 && $method === 'POST') {
    $ideaId = (int)$m[1];
    $fingerprint = trim((string)($_SERVER['HTTP_X_FINGERPRINT'] ?? ''));
    if ($fingerprint === '') {
        jsonResponse(400, ['error' => 'Не указан fingerprint.']);
    }
    $result = withStoreLock($storeFile, static function (array &$store) use ($ideaId, $fingerprint): ?array {
        $found = false;
        foreach ($store['ideas'] as &$idea) {
            if ((int)($idea['id'] ?? 0) === $ideaId) {
                $found = true;
                break;
            }
        }
        unset($idea);
        if (!$found) return null;
        $already = false;
        foreach ($store['likes'] as $lk) {
            if ((int)($lk['ideaId'] ?? 0) === $ideaId && (string)($lk['fingerprint'] ?? '') === $fingerprint) {
                $already = true;
                break;
            }
        }
        if ($already) {
            return ['liked' => false, 'already' => true];
        }
        $store['likes'][] = [
            'ideaId' => $ideaId,
            'fingerprint' => $fingerprint,
            'createdAt' => nowIso(),
        ];
        foreach ($store['ideas'] as &$idea) {
            if ((int)($idea['id'] ?? 0) === $ideaId) {
                $idea['likesCount'] = (int)($idea['likesCount'] ?? 0) + 1;
                $idea['updatedAt'] = nowIso();
                break;
            }
        }
        unset($idea);
        return ['liked' => true, 'already' => false];
    }, $config['retentionDays']);

    if ($result === null) {
        jsonResponse(404, ['error' => 'Идея не найдена или недоступна для лайка.']);
    }
    jsonResponse(200, ['ok' => true, 'data' => $result]);
}

if ($route === 'moderation/ideas' && $method === 'GET') {
    requireAdmin($config['adminToken']);
    $status = normalize($_GET['status'] ?? '');
    $items = withStoreLock($storeFile, static function (array &$store) use ($status): array {
        $out = [];
        foreach ($store['ideas'] as $idea) {
            $st = (string)($idea['status'] ?? 'pending');
            if ($status !== '' && $st !== $status) continue;
            $item = ideaToPublic($idea);
            $item['authorEmail'] = (string)($idea['authorEmail'] ?? '');
            $item['authorPhone'] = (string)($idea['authorPhone'] ?? '');
            $item['ipHash'] = (string)($idea['ipHash'] ?? '');
            $item['moderationComment'] = $idea['moderationComment'] ?? null;
            $item['moderatedBy'] = $idea['moderatedBy'] ?? null;
            $item['moderatedAt'] = $idea['moderatedAt'] ?? null;
            $item['updatedAt'] = (string)($idea['updatedAt'] ?? $idea['createdAt'] ?? '');
            $out[] = $item;
        }
        usort($out, static function ($a, $b) {
            return strcmp((string)$b['createdAt'], (string)$a['createdAt']);
        });
        return $out;
    }, $config['retentionDays']);
    jsonResponse(200, ['ok' => true, 'count' => count($items), 'data' => $items]);
}

if (preg_match('#^moderation/ideas/(\d+)$#', $route, $m) === 1 && $method === 'PATCH') {
    requireAdmin($config['adminToken']);
    $ideaId = (int)$m[1];
    $payload = readBody();
    $status = normalize($payload['status'] ?? '');
    if (!in_array($status, $allowedModerationStatuses, true)) {
        jsonResponse(400, ['error' => 'Некорректный статус модерации.']);
    }
    $comment = normalize($payload['comment'] ?? '');

    $result = withStoreLock($storeFile, static function (array &$store) use ($ideaId, $status, $comment): ?array {
        foreach ($store['ideas'] as &$idea) {
            if ((int)($idea['id'] ?? 0) === $ideaId) {
                $idea['status'] = $status;
                $idea['moderationComment'] = $comment !== '' ? $comment : null;
                $idea['moderatedBy'] = 'admin';
                $idea['moderatedAt'] = nowIso();
                $idea['updatedAt'] = nowIso();

                $store['moderationLog'][] = [
                    'id' => count($store['moderationLog']) + 1,
                    'entityType' => 'idea',
                    'entityId' => $ideaId,
                    'action' => $status,
                    'operatorId' => 'admin',
                    'comment' => $comment,
                    'createdAt' => nowIso(),
                ];

                return ideaToPublic($idea);
            }
        }
        unset($idea);
        return null;
    }, $config['retentionDays']);

    if ($result === null) {
        jsonResponse(404, ['error' => 'Идея не найдена.']);
    }
    jsonResponse(200, ['ok' => true, 'data' => $result]);
}

if ($route === 'moderation/log' && $method === 'GET') {
    requireAdmin($config['adminToken']);
    $items = withStoreLock($storeFile, static function (array &$store): array {
        $out = $store['moderationLog'];
        usort($out, static function ($a, $b) {
            return strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? ''));
        });
        return $out;
    }, $config['retentionDays']);
    jsonResponse(200, ['ok' => true, 'count' => count($items), 'data' => $items]);
}

if ($route === 'personal-data/requests' && $method === 'POST') {
    $payload = readBody();
    assertConsent($payload);
    assertPolicyVersion($payload, $config['policyVersion']);

    $type = normalize($payload['type'] ?? '');
    $subjectName = normalize($payload['subjectName'] ?? '');
    $subjectContact = normalize($payload['subjectContact'] ?? '');
    $details = normalize($payload['details'] ?? '');

    if (
        !in_array($type, $allowedRequestTypes, true)
        || mb_strlen($subjectName) < 2
        || mb_strlen($subjectContact) < 3
        || mb_strlen($details) < 5
    ) {
        jsonResponse(400, ['error' => 'Некорректные данные запроса.']);
    }

    $id = withStoreLock($storeFile, static function (array &$store) use ($payload, $config, $type, $subjectName, $subjectContact, $details): int {
        $id = (int)($store['counters']['pdRequest'] ?? 0) + 1;
        $store['counters']['pdRequest'] = $id;
        $timestamp = nowIso();
        $store['personalDataRequests'][] = [
            'id' => $id,
            'type' => $type,
            'subjectName' => $subjectName,
            'subjectContact' => $subjectContact,
            'details' => $details,
            'consent' => true,
            'policyVersion' => $config['policyVersion'],
            'legalBasis' => '152-ФЗ, статья 9',
            'ipHash' => getClientIpHash(),
            'userAgent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'status' => 'new',
            'operatorComment' => null,
            'resolvedBy' => null,
            'resolvedAt' => null,
            'createdAt' => $timestamp,
            'updatedAt' => $timestamp,
        ];
        return $id;
    }, $config['retentionDays']);

    jsonResponse(201, ['ok' => true, 'accepted' => true, 'id' => $id]);
}

if ($route === 'personal-data/requests' && $method === 'GET') {
    requireAdmin($config['adminToken']);
    $items = withStoreLock($storeFile, static function (array &$store): array {
        $out = $store['personalDataRequests'];
        usort($out, static function ($a, $b) {
            return strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? ''));
        });
        return $out;
    }, $config['retentionDays']);
    jsonResponse(200, ['ok' => true, 'count' => count($items), 'data' => $items]);
}

if (preg_match('#^personal-data/requests/(\d+)$#', $route, $m) === 1 && $method === 'PATCH') {
    requireAdmin($config['adminToken']);
    $requestId = (int)$m[1];
    $payload = readBody();
    $status = normalize($payload['status'] ?? '');
    $operatorComment = normalize($payload['operatorComment'] ?? '');

    if (!in_array($status, $allowedPdStatuses, true)) {
        jsonResponse(400, ['error' => 'Некорректный статус.']);
    }
    $operatorId = 'admin';

    $result = withStoreLock($storeFile, static function (array &$store) use ($requestId, $status, $operatorComment, $operatorId): ?array {
        foreach ($store['personalDataRequests'] as &$item) {
            if (!is_array($item) || (int)($item['id'] ?? 0) !== $requestId) {
                continue;
            }
            $item['status'] = $status;
            $item['operatorComment'] = $operatorComment;
            $item['resolvedBy'] = $operatorId;
            $item['resolvedAt'] = ($status === 'completed' || $status === 'rejected') ? nowIso() : null;
            $item['updatedAt'] = nowIso();
            return $item;
        }
        unset($item);
        return null;
    }, $config['retentionDays']);

    if ($result === null) {
        jsonResponse(404, ['error' => 'Запрос субъекта ПДн не найден.']);
    }
    jsonResponse(200, ['ok' => true, 'data' => $result]);
}

// ===== ВРЕМЕННЫЙ РОУТ: одноразовая миграция (после выполнения можно удалить) =====
if ($route === '_migrate_anon' && $method === 'POST') {
    requireAdmin($config['adminToken']);
    if (!file_exists($storeFile)) {
        jsonResponse(404, ['error' => "store.json не найден: $storeFile"]);
    }
    $backupName = 'store.json.backup-' . date('Ymd-His') . '.json';
    $backupPath = $dataDir . '/' . $backupName;
    if (!@copy($storeFile, $backupPath)) {
        jsonResponse(500, ['error' => 'Не удалось создать бэкап']);
    }
    $raw = @file_get_contents($storeFile);
    $store = json_decode($raw, true);
    if (!is_array($store)) {
        jsonResponse(500, ['error' => 'store.json повреждён']);
    }
    $surveysBefore = $store['surveys'] ?? [];
    $countBefore = count($surveysBefore);
    $piiFields = ['fullName', 'email', 'consent', 'consentGivenAt', 'consentLegalBasis', 'policyVersion', 'legalBasis', 'purpose', 'ipHash', 'userAgent'];
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
        jsonResponse(500, ['error' => 'Не удалось записать store.json', 'backup' => $backupPath]);
    }
    $verified = (@file_get_contents($storeFile) === $serialized);
    jsonResponse(200, [
        'ok' => true,
        'migrated' => ['surveys' => $countBefore, 'piiFieldsStripped' => $piiStrippedTotal],
        'backup' => $backupPath,
        'verified' => $verified,
    ]);
}

// ===== ВРЕМЕННЫЕ РОУТЫ (telegram-preview, telegram-publish-history) удалены после публикации архива =====

jsonResponse(404, ['error' => 'Not found']);
