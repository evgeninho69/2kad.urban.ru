<?php
/**
 * Telegram notifier for the Tver Master Plan portal.
 *
 * Вызывается из index.php после успешного сохранения анкеты.
 * Конфиг (botToken / chatId) берётся из telegram-config.php, который
 * НЕ коммитится в git и НЕ заливается через деплой.
 *
 * Семантика:
 *  - Любое исключение внутри — глотается, в error_log пишется короткая
 *    запись. Ответ пользователю на опрос НЕ должен ломаться из-за
 *    недоступности Telegram.
 *  - Таймаут HTTP к Telegram — 3 секунды, чтобы не висло в общем
 *    request-budget shared-хостинга.
 */

declare(strict_types=1);

/**
 * Отправляет произвольный текст в Telegram.
 * Возвращает true при ok, false при любой ошибке (и пишет в error_log).
 */
function telegramSend(string $text, ?string $parseMode = 'HTML'): bool {
    static $config = null;
    if ($config === null) {
        $configFile = __DIR__ . '/telegram-config.php';
        if (!is_file($configFile)) {
            error_log('[telegram] telegram-config.php not found, skip');
            return false;
        }
        $loaded = include $configFile;
        if (!is_array($loaded) || empty($loaded['botToken']) || empty($loaded['chatId'])) {
            error_log('[telegram] config incomplete (botToken/chatId missing)');
            return false;
        }
        $config = $loaded;
    }

    $url = 'https://api.telegram.org/bot' . $config['botToken'] . '/sendMessage';

    $payload = http_build_query([
        'chat_id'                  => (string)$config['chatId'],
        'text'                     => $text,
        'parse_mode'               => $parseMode ?? 'HTML',
        'disable_web_page_preview' => 'true',
    ], '', '&');

    $ch = curl_init($url);
    if ($ch === false) {
        error_log('[telegram] curl_init failed');
        return false;
    }
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 3,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $err   = curl_error($ch);
    $code  = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false) {
        error_log("[telegram] curl error $errno: $err");
        return false;
    }
    if ($code < 200 || $code >= 300) {
        error_log("[telegram] http $code: " . substr((string)$body, 0, 300));
        return false;
    }
    return true;
}

/* ------------------------------------------------------------------ */
/* Labels / mappers                                                   */
/* ------------------------------------------------------------------ */

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

function tverTopicLabel(string $key): string {
    static $map = [
        'transport'  => 'Транспорт',
        'ecology'    => 'Экология',
        'landscaping'=> 'Благоустройство',
        'housing'    => 'Жильё и застройка',
        'social'     => 'Соц. инфраструктура',
        'economy'    => 'Экономика',
        'culture'    => 'Культура',
        'mobility'   => 'Пешеходная и вело',
    ];
    return $map[$key] ?? $key;
}

function tverHtmlEscape(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5 | ENT_SUBSTITUTE, 'UTF-8');
}

function tverTruncate(string $s, int $max = 220): string {
    $s = trim($s);
    if (mb_strlen($s, 'UTF-8') <= $max) return $s;
    return mb_substr($s, 0, $max - 1, 'UTF-8') . '…';
}

/* ------------------------------------------------------------------ */
/* Survey summary                                                     */
/* ------------------------------------------------------------------ */

/**
 * $survey — массив только что сохранённой анкеты (формат как в store['surveys'][]).
 * $adminUrl — полный URL админки, обычно берётся из telegram-config.php.
 */
function telegramFormatSurveySummary(array $survey, string $adminUrl): string {
    $id     = (int)($survey['id'] ?? 0);
    $age    = tverAgeLabel((string)($survey['ageGroup'] ?? ''));
    $distr  = (string)($survey['district'] ?? '—');
    $satRaw = (int)($survey['satisfaction'] ?? 0);
    $sat    = $satRaw > 0 ? ($satRaw . '/5') : '—';
    $created= (string)($survey['createdAt'] ?? '');

    $topics = [];
    foreach ((array)($survey['topics'] ?? []) as $t) {
        $topics[] = tverHtmlEscape(tverTopicLabel((string)$t));
    }
    $topicsStr = $topics ? implode(', ', $topics) : '—';

    $comment = isset($survey['comment']) ? tverTruncate((string)$survey['comment'], 280) : '';

    $lines = [];
    $lines[] = '🗳 <b>Новая анонимная анкета #' . $id . '</b>';
    $lines[] = '👤 Возраст: <b>' . tverHtmlEscape($age) . '</b>';
    $lines[] = '📍 Район: <b>' . tverHtmlEscape($distr) . '</b>';
    $lines[] = '🏷 Темы: ' . $topicsStr;
    $lines[] = '⭐ Оценка: <b>' . tverHtmlEscape($sat) . '</b>';
    if ($comment !== '') {
        $lines[] = '💬 «' . tverHtmlEscape($comment) . '»';
    }
    if ($created !== '') {
        $lines[] = '🕒 <i>' . tverHtmlEscape($created) . '</i>';
    }
    $lines[] = '';
    $lines[] = '🔗 <a href="' . tverHtmlEscape($adminUrl) . '">Открыть админку</a>';

    return implode("\n", $lines);
}

function telegramSendSurveySummary(array $survey, string $adminUrl): bool {
    $text = telegramFormatSurveySummary($survey, $adminUrl);
    return telegramSend($text, 'HTML');
}
