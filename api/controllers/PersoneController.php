<?php

require_once __DIR__ . '/../models/Persona.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validation.php';
require_once __DIR__ . '/../middleware/auth.php';

class PersoneController {

    public function index(): void {
        requireAuth();
        $persone = Persona::getAll();
        json_response(['persone' => $persone]);
    }

    public function show(int $id): void {
        requireAuth();
        $persona = Persona::findById($id);
        if (!$persona) {
            error_response('Persona non trovata.', 404);
        }
        json_response(['persona' => $persona]);
    }

    public function update(int $id): void {
        requireAuth();

        if (getCurrentUserId() !== $id) {
            error_response('Non puoi modificare il profilo di un altro utente.', 403);
        }

        $data = get_json_body();

        $err = validate_required($data, ['nome', 'cognome', 'email', 'password_corrente']);
        if ($err) error_response($err);

        // Verifica la password corrente
        $userFull = Persona::findByUsername(
            Persona::findById($id)['username']
        );
        if (!password_verify($data['password_corrente'], $userFull['password_hash'])) {
            error_response('Password corrente non corretta.', 401);
        }

        if (!validate_email($data['email'])) {
            error_response('Email non valida.');
        }

        // Controlla unicità nome+cognome (escluso se stesso)
        if (Persona::existsNomeCognome($data['nome'], $data['cognome'], $id)) {
            error_response('Esiste già un utente con questo nome e cognome.', 409);
        }

        if (Persona::existsEmail($data['email'], $id)) {
            error_response('Email già in uso.', 409);
        }

        if (isset($data['nuova_password']) && $data['nuova_password'] !== '' && strlen($data['nuova_password']) < 6) {
            error_response('La nuova password deve avere almeno 6 caratteri.');
        }

        Persona::update($id, $data);
        $persona = Persona::findById($id);
        json_response(['persona' => $persona]);
    }
}
