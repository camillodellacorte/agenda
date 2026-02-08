<?php

require_once __DIR__ . '/../models/Appuntamento.php';
require_once __DIR__ . '/../models/Persona.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validation.php';
require_once __DIR__ . '/../middleware/auth.php';

class AppuntamentiController {

    public function index(): void {
        requireAuth();
        $da = $_GET['da'] ?? date('Y-m-01');
        $a  = $_GET['a']  ?? date('Y-m-t');

        if (!validate_date($da) || !validate_date($a)) {
            error_response('Formato data non valido. Usare YYYY-MM-DD.');
        }

        $appuntamenti = Appuntamento::findInRange(getCurrentUserId(), $da, $a);
        json_response(['appuntamenti' => $appuntamenti]);
    }

    public function show(int $id): void {
        requireAuth();
        $app = Appuntamento::findById($id);

        if (!$app) {
            error_response('Appuntamento non trovato.', 404);
        }

        // Verifica che l'utente sia un partecipante
        $isPartecipante = false;
        foreach ($app['partecipanti'] as $p) {
            if ((int) $p['id'] === getCurrentUserId()) {
                $isPartecipante = true;
                break;
            }
        }

        if (!$isPartecipante) {
            error_response('Non autorizzato.', 403);
        }

        json_response(['appuntamento' => $app]);
    }

    public function create(): void {
        requireAuth();
        $data = get_json_body();

        $err = validate_required($data, ['descrizione', 'data', 'ora']);
        if ($err) error_response($err);

        if (!validate_date($data['data'])) {
            error_response('Formato data non valido. Usare YYYY-MM-DD.');
        }

        if (!validate_time($data['ora'])) {
            error_response('Formato ora non valido. Usare HH:MM.');
        }

        $durata = isset($data['durata_minuti']) && $data['durata_minuti'] > 0
            ? (int) $data['durata_minuti']
            : 60;

        $partecipantiIds = $data['partecipanti_ids'] ?? [];
        $currentUser = getCurrentUserId();
        if (!in_array($currentUser, $partecipantiIds)) {
            $partecipantiIds[] = $currentUser;
        }

        // Verifica disponibilità
        $conflitti = Appuntamento::verificaDisponibilita(
            $partecipantiIds,
            $data['data'],
            $data['ora'],
            $durata
        );

        if (!empty($conflitti)) {
            // Arricchisci con i nomi delle persone
            $conflittiDettagliati = self::arricchisciConflitti($conflitti);
            error_response('Conflitto di disponibilità.', 409, ['conflitti' => $conflittiDettagliati]);
        }

        $data['creato_da'] = $currentUser;
        $data['partecipanti_ids'] = $partecipantiIds;
        $data['durata_minuti'] = $durata;

        $id = Appuntamento::create($data);
        $app = Appuntamento::findById($id);

        json_response(['appuntamento' => $app], 201);
    }

    public function update(int $id): void {
        requireAuth();
        $app = Appuntamento::findById($id);

        if (!$app) {
            error_response('Appuntamento non trovato.', 404);
        }

        if ((int) $app['creato_da'] !== getCurrentUserId()) {
            error_response('Solo il creatore può modificare l\'appuntamento.', 403);
        }

        $data = get_json_body();

        $err = validate_required($data, ['descrizione', 'data', 'ora']);
        if ($err) error_response($err);

        if (!validate_date($data['data'])) {
            error_response('Formato data non valido.');
        }

        if (!validate_time($data['ora'])) {
            error_response('Formato ora non valido.');
        }

        $durata = isset($data['durata_minuti']) && $data['durata_minuti'] > 0
            ? (int) $data['durata_minuti']
            : 60;

        // Se ci sono partecipanti, verifica disponibilità
        if (isset($data['partecipanti_ids'])) {
            $partecipantiIds = $data['partecipanti_ids'];
            $currentUser = getCurrentUserId();
            if (!in_array($currentUser, $partecipantiIds)) {
                $partecipantiIds[] = $currentUser;
            }

            $conflitti = Appuntamento::verificaDisponibilita(
                $partecipantiIds,
                $data['data'],
                $data['ora'],
                $durata,
                $id // escludi l'appuntamento corrente
            );

            if (!empty($conflitti)) {
                $conflittiDettagliati = self::arricchisciConflitti($conflitti);
                error_response('Conflitto di disponibilità.', 409, ['conflitti' => $conflittiDettagliati]);
            }

            $data['partecipanti_ids'] = $partecipantiIds;
        }

        $data['durata_minuti'] = $durata;
        Appuntamento::update($id, $data);
        $updated = Appuntamento::findById($id);

        json_response(['appuntamento' => $updated]);
    }

    public function destroy(int $id): void {
        requireAuth();
        $app = Appuntamento::findById($id);

        if (!$app) {
            error_response('Appuntamento non trovato.', 404);
        }

        if ((int) $app['creato_da'] !== getCurrentUserId()) {
            error_response('Solo il creatore può eliminare l\'appuntamento.', 403);
        }

        Appuntamento::delete($id);
        json_response(['message' => 'Appuntamento eliminato.']);
    }

    public function verificaDisponibilita(): void {
        requireAuth();
        $data = get_json_body();

        $err = validate_required($data, ['data', 'ora', 'partecipanti_ids']);
        if ($err) error_response($err);

        if (!validate_date($data['data'])) {
            error_response('Formato data non valido.');
        }

        if (!validate_time($data['ora'])) {
            error_response('Formato ora non valido.');
        }

        $durata = isset($data['durata_minuti']) && $data['durata_minuti'] > 0
            ? (int) $data['durata_minuti']
            : 60;

        $excludeId = isset($data['exclude_id']) ? (int) $data['exclude_id'] : null;

        $conflitti = Appuntamento::verificaDisponibilita(
            $data['partecipanti_ids'],
            $data['data'],
            $data['ora'],
            $durata,
            $excludeId
        );

        if (empty($conflitti)) {
            json_response(['disponibili' => true]);
        } else {
            $conflittiDettagliati = self::arricchisciConflitti($conflitti);
            json_response(['disponibili' => false, 'conflitti' => $conflittiDettagliati]);
        }
    }

    private static function arricchisciConflitti(array $conflitti): array {
        $result = [];
        foreach ($conflitti as $c) {
            $persona = Persona::findById($c['persona_id']);
            $c['nome'] = $persona ? $persona['nome'] : '?';
            $c['cognome'] = $persona ? $persona['cognome'] : '?';
            $result[] = $c;
        }
        return $result;
    }
}
