<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/middleware/auth.php';

// Parse request
$method = $_SERVER['REQUEST_METHOD'];

// Handle CORS preflight
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = $_SERVER['REQUEST_URI'];
$basePath = '/agenda/api';
$path = parse_url($uri, PHP_URL_PATH);

// Rimuovi il basePath dall'URI
if (strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}

// Rimuovi slash iniziale e finale
$path = trim($path, '/');
$segments = $path !== '' ? explode('/', $path) : [];

$resource = $segments[0] ?? '';
$param1   = $segments[1] ?? null;
$param2   = $segments[2] ?? null;

try {
    switch ($resource) {

        case 'auth':
            require_once __DIR__ . '/controllers/AuthController.php';
            $controller = new AuthController();
            switch ($param1) {
                case 'register':
                    if ($method !== 'POST') error_response('Metodo non consentito.', 405);
                    $controller->register();
                    break;
                case 'login':
                    if ($method !== 'POST') error_response('Metodo non consentito.', 405);
                    $controller->login();
                    break;
                case 'logout':
                    if ($method !== 'POST') error_response('Metodo non consentito.', 405);
                    $controller->logout();
                    break;
                case 'me':
                    if ($method !== 'GET') error_response('Metodo non consentito.', 405);
                    $controller->me();
                    break;
                default:
                    error_response('Endpoint non trovato.', 404);
            }
            break;

        case 'persone':
            require_once __DIR__ . '/controllers/PersoneController.php';
            $controller = new PersoneController();

            if ($param1 === null) {
                if ($method !== 'GET') error_response('Metodo non consentito.', 405);
                $controller->index();
            } else {
                $id = (int) $param1;
                switch ($method) {
                    case 'GET':
                        $controller->show($id);
                        break;
                    case 'PUT':
                        $controller->update($id);
                        break;
                    default:
                        error_response('Metodo non consentito.', 405);
                }
            }
            break;

        case 'promemoria':
            require_once __DIR__ . '/controllers/PromemoriaController.php';
            $controller = new PromemoriaController();

            if ($param1 === null) {
                switch ($method) {
                    case 'GET':
                        $controller->index();
                        break;
                    case 'POST':
                        $controller->create();
                        break;
                    default:
                        error_response('Metodo non consentito.', 405);
                }
            } else {
                $id = (int) $param1;
                switch ($method) {
                    case 'GET':
                        $controller->show($id);
                        break;
                    case 'PUT':
                        $controller->update($id);
                        break;
                    case 'DELETE':
                        $controller->destroy($id);
                        break;
                    default:
                        error_response('Metodo non consentito.', 405);
                }
            }
            break;

        case 'appuntamenti':
            require_once __DIR__ . '/controllers/AppuntamentiController.php';
            $controller = new AppuntamentiController();

            if ($param1 === null) {
                switch ($method) {
                    case 'GET':
                        $controller->index();
                        break;
                    case 'POST':
                        $controller->create();
                        break;
                    default:
                        error_response('Metodo non consentito.', 405);
                }
            } elseif ($param1 === 'verifica-disponibilita') {
                if ($method !== 'POST') error_response('Metodo non consentito.', 405);
                $controller->verificaDisponibilita();
            } else {
                $id = (int) $param1;
                switch ($method) {
                    case 'GET':
                        $controller->show($id);
                        break;
                    case 'PUT':
                        $controller->update($id);
                        break;
                    case 'DELETE':
                        $controller->destroy($id);
                        break;
                    default:
                        error_response('Metodo non consentito.', 405);
                }
            }
            break;

        default:
            error_response('Endpoint non trovato.', 404);
    }

} catch (PDOException $e) {
    error_response('Errore del database.', 500);
} catch (Exception $e) {
    error_response('Errore interno del server.', 500);
}
