<?php

require_once __DIR__ . '/../models/Persona.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validation.php';
require_once __DIR__ . '/../middleware/auth.php';

class AuthController {

    public function register(): void {
        $data = get_json_body();

        $err = validate_required($data, ['nome', 'cognome', 'email', 'username', 'password']);
        if ($err) error_response($err);

        if (!validate_email($data['email'])) {
            error_response('Email non valida.');
        }

        if (strlen($data['password']) < 6) {
            error_response('La password deve avere almeno 6 caratteri.');
        }

        if (Persona::existsNomeCognome($data['nome'], $data['cognome'])) {
            error_response('Esiste già un utente con questo nome e cognome.', 409);
        }

        if (Persona::existsEmail($data['email'])) {
            error_response('Email già in uso.', 409);
        }

        if (Persona::existsUsername($data['username'])) {
            error_response('Username già in uso.', 409);
        }

        $id = Persona::create($data);
        $user = Persona::findById($id);

        json_response(['user' => $user], 201);
    }

    public function login(): void {
        $data = get_json_body();

        $err = validate_required($data, ['username', 'password']);
        if ($err) error_response($err);

        $user = Persona::findByUsername($data['username']);

        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            error_response('Credenziali non valide.', 401);
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];

        unset($user['password_hash']);
        json_response(['user' => $user]);
    }

    public function logout(): void {
        session_destroy();
        json_response(['message' => 'Logout effettuato.']);
    }

    public function me(): void {
        requireAuth();
        $user = Persona::findById(getCurrentUserId());

        if (!$user) {
            session_destroy();
            error_response('Utente non trovato.', 401);
        }

        json_response(['user' => $user]);
    }
}
