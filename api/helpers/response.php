<?php

function json_response($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function error_response(string $message, int $status = 400, array $details = []): void {
    http_response_code($status);
    $response = ['success' => false, 'error' => $message];
    if (!empty($details)) {
        $response['details'] = $details;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function get_json_body(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}
