<?php

function requireAuth(): void {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Non autenticato.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function getCurrentUserId(): int {
    return (int) $_SESSION['user_id'];
}
