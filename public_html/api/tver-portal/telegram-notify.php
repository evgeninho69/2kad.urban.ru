<?php
/**
 * telegram-notify.php — формирование и отправка уведомлений в Telegram-канал.
 *
 * Используется из index.php (роут surveys POST) и из telegram-publish-history.php
 * (разовая публикация архива).
 *
 * Соглашения:
 *  - Все функции дефенсивные: на любом странном входе возвращают дефолт, а не 500.
 *  - HTML-разметка для Telegram (parse_mode=HTML), все user-строки прогоняются
 *    через tverHtmlEscape().
 *  - Сообщение режется на чанки по 3500 символов (Telegram лимит 4096).
 */

declare(strict_types=1);

// ===== helpers ============================================================

function tverHtmlEscape(string $s): string {
    // Telegram HTML понимает только <b>, <i>, <u>, <s>, <code>, <pre>, <a href>.
    // Безопаснее htmlspecialchars + ручная замена & на &amp; уже после escape.
    $escaped = htmlspecialchars($s, ENT_QUOTES | ENT_HTML5 | ENT_SUBSTITUTE, 'UTF-8');
    return $escaped;
}

function tverTruncate(string $s, int $max = 200): string {
    $s = trim($s);
    if (mb_strlen($s, 'UTF-8') <= $max) return $s;
    return mb_substr($s, 0, $max - 1, 'UTF-8') . '…';
}

function tverField(array $survey, string $name): ?string {
    if (!array_key_exists($name, $survey)) return null;
    $v = $survey[$name];
    if ($v === null) return null;
    if (is_string($v)) {
        $v = trim($v);
        return $v === '' ? null : $v;
    }
    if (is_array($v)) return null; // для list-полей используем tverListField
    return (string)$v;
}

function tverListField(array $survey, string $name): array {
    if (!array_key_exists($name, $survey)) return [];
    $v = $survey[$name];
    if (!is_array($v)) return [];
    $out = [];
    foreach ($v as $item) {
        if (is_string($item)) {
            $item = trim($item);
            if ($item !== '') $out[] = $item;
        }
    }
    return $out;
}

// Маппинг ageGroup → человекочитаемая метка.
function tverAgeLabel(string $key): string {
    static $map = [
        'under_18' => 'до 18',
        '18_30'    => '18–30',
        '31_45'    => '31–45',
        '46_60'    => '46–60',
        '60_plus'  => '60+',
    ];
    return $map[$key] ?? $key;
}

function tverSatisfactionLabel(int $sat): string {
    static $stars = [1 => '★', 2 => '★★', 3 => '★★★', 4 => '★★★★', 5 => '★★★★★'];
    if ($sat < 1 || $sat > 5) return '—';
    return $stars[$sat] . ' (' . $sat . '/5)';
}

// Словарь секций: имя поля → [заголовок, эмодзи]. Один проход по словарю даёт
// чистый список «только непустые секции», без длинных цепочек if/isset.
function tverSections(): array {
    return [
        // [field, title, icon]
        ['priorityProject',         'Главный приоритет',          '🎯'],
        ['participantContext',      'Контекст участия',           '👥'],
        ['transportProblems',       'Проблемы мобильности',       '🚦'],
        ['commuteTime',             'Время в пути',               '⏱'],
        ['carParkingIssues',        'Парковка',                   '🅿️'],
        ['placesLove',              'Любимые места',              '❤️'],
        ['spacesMissing',           'Чего не хватает',            '🟢'],
        ['socialAccessSectors',     'Сложности с соц.объектами',  '🏥'],
        ['socialObjectNeeds',       'Какие объекты нужны',        '🏗'],
        ['ideaReady',               'Готовая идея',               '💡'],
        ['employmentStatus',        'Занятость',                  '💼'],
        ['workLocation',            'Где работаете',              '📍'],
        ['economyPriorities',       'Приоритеты экономики',       '📈'],
        ['businessBarriers',        'Барьеры для бизнеса',        '🚧'],
        ['ecologyProblems',         'Экологические проблемы',     '🌳'],
        ['heritageObjects',         'Объекты наследия',           '🏛'],
        ['naturePlaces',            'Природные территории',       '🌲'],
        ['tourismRoutes',           'Туристические маршруты',     '🗺'],
        ['agglomerationTrips',      'Поездки в агломерации',      '🔄'],
        ['intermunicipalNeeds',     'Межмуниципальные связи',     '🤝'],
        ['topProjects',             'Топ-3 проекта',              '🏆'],
        ['comment',                 'Свободный комментарий',      '💬'],
    ];
}

// Форматирует одну секцию (одно поле) с учётом того, что поле может быть
// скаляром (текст/число/enum) или массивом (multi-select).
function tverRenderSection(array $survey, array $section): ?string {
    [$field, $title, $icon] = $section;
    if (!array_key_exists($field, $survey)) return null;

    $raw = $survey[$field];
    if ($raw === null) return null;

    if (is_array($raw)) {
        $items = tverListField($survey, $field);
        if (count($items) === 0) return null;
        // Длинные списки режем до 6 пунктов + «…и ещё N»
        $shown = array_slice($items, 0, 6);
        $rest  = count($items) - count($shown);
        $body  = implode(', ', array_map('tverHtmlEscape', $shown));
        if ($rest > 0) $body .= ' <i>…и ещё ' . $rest . '</i>';
    } else {
        $str = is_string($raw) ? trim($raw) : (string)$raw;
        if ($str === '') return null;
        // Длинный свободный текст режем в 280 символов
        $body = tverTruncate($str, 280);
        $body = tverHtmlEscape($body);
    }

    return $icon . ' <b>' . tverHtmlEscape($title) . ':</b> ' . $body;
}

// Склеивает шапку, тело и подвал. Возвращает либо одну строку, либо массив
// строк, если не влезает в 3500 символов.
function telegramFormatSurveySummary(array $survey, string $adminUrl, array $opts = []): string {
    $id       = (int)($survey['id'] ?? 0);
    $age      = tverAgeLabel((string)($survey['ageGroup'] ?? ''));
    $district = (string)($survey['district'] ?? '—');
    $sat      = (int)($survey['satisfaction'] ?? 0);
    $satTxt   = tverSatisfactionLabel($sat);

    $topicsArr = tverListField($survey, 'topics');
    $topics    = count($topicsArr) > 0
        ? implode(', ', array_map('tverHtmlEscape', $topicsArr))
        : '—';

    $isAnon  = !empty($survey['isAnonymous']);
    $badge   = $isAnon ? '🟢 анонимно' : '🟡 с ПДн';
    $suffix  = isset($opts['headerSuffix']) && is_string($opts['headerSuffix']) && $opts['headerSuffix'] !== ''
        ? ' · ' . $opts['headerSuffix']
        : '';

    $headerLines = [
        '🗳 <b>Анкета #' . $id . '</b> ' . $badge . $suffix,
        '👤 Возраст: ' . tverHtmlEscape($age)
            . '   ⭐ ' . tverHtmlEscape($satTxt)
            . '   📍 ' . tverHtmlEscape($district),
        '🏷 Темы: ' . $topics,
    ];

    $bodyLines = [];
    foreach (tverSections() as $section) {
        $line = tverRenderSection($survey, $section);
        if ($line !== null) $bodyLines[] = $line;
    }

    $footerLines = [
        '─────────────',
        '🔗 <a href="' . tverHtmlEscape($adminUrl) . '">Открыть в админке</a>',
    ];

    $all = array_merge($headerLines, $bodyLines, $footerLines);
    return implode("\n", $all);
}

// Режет слишком длинное сообщение на чанки (Telegram лимит 4096, берём 3500 с запасом).
function telegramChunkText(string $text, int $maxChunk = 3500): array {
    if (mb_strlen($text, 'UTF-8') <= $maxChunk) return [$text];

    $chunks = [];
    $lines  = explode("\n", $text);
    $cur    = '';

    foreach ($lines as $line) {
        $candidate = $cur === '' ? $line : ($cur . "\n" . $line);
        if (mb_strlen($candidate, 'UTF-8') > $maxChunk && $cur !== '') {
            $chunks[] = $cur;
            $cur = $line;
        } else {
            $cur = $candidate;
        }
    }
    if ($cur !== '') $chunks[] = $cur;
    return $chunks;
}

// ===== отправка ===========================================================

/**
 * Шлёт одно сообщение в Telegram через Bot API.
 * Возвращает true при успехе, false при любой ошибке (без exception'ов).
 */
function telegramSend(string $text, ?string $parseMode = 'HTML'): bool {
    $configFile = __DIR__ . '/telegram-config.php';
    if (!is_file($configFile)) return false;
    $cfg = include $configFile;
    if (!is_array($cfg) || empty($cfg['botToken']) || empty($cfg['chatId'])) return false;

    $botToken = (string)$cfg['botToken'];
    $chatId   = (string)$cfg['chatId'];
    $url      = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';

    $chunks = telegramChunkText($text, 3500);
    $allOk  = true;

    foreach ($chunks as $i => $chunk) {
        $payload = [
            'chat_id'    => $chatId,
            'text'       => $chunk,
            'parse_mode' => $parseMode ?? 'HTML',
            'disable_web_page_preview' => true,
        ];
        $body = http_build_query($payload, '', '&', PHP_QUERY_RFC3986);

        $ch = curl_init();
        if ($ch === false) { $allOk = false; continue; }
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($resp === false || $code !== 200) {
            error_log('[telegram] send failed: http=' . (int)$code . ' err=' . $err . ' resp=' . (is_string($resp) ? substr($resp, 0, 200) : ''));
            $allOk = false;
        }

        // Пауза между чанками одного сообщения, чтобы не упереться в rate-limit
        if ($i < count($chunks) - 1) usleep(400_000);
    }

    return $allOk;
}

/**
 * Высокоуровневая обёртка: формирует summary и отправляет.
 * Принимает survey-массив, $adminUrl и опционально opts (headerSuffix и т.п.).
 */
function telegramSendSurveySummary(array $survey, string $adminUrl, array $opts = []): bool {
    $text = telegramFormatSurveySummary($survey, $adminUrl, $opts);
    return telegramSend($text, 'HTML');
}
