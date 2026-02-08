<?php

function validate_required(array $data, array $fields): ?string {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            return "Il campo '$field' è obbligatorio.";
        }
    }
    return null;
}

function validate_email(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function validate_date(string $date): bool {
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

function validate_time(string $time): bool {
    $t = DateTime::createFromFormat('H:i', $time);
    if ($t && $t->format('H:i') === $time) return true;
    $t = DateTime::createFromFormat('H:i:s', $time);
    return $t && $t->format('H:i:s') === $time;
}

function sanitize_string(string $value): string {
    return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
}
