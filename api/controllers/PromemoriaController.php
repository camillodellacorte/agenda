<?php

require_once __DIR__ . '/../models/Promemoria.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validation.php';
require_once __DIR__ . '/../middleware/auth.php';

class PromemoriaController {

    public function index(): void {
        requireAuth();
        $da = $_GET['da'] ?? date('Y-m-01');
        $a  = $_GET['a']  ?? date('Y-m-t');

        if (!validate_date($da) || !validate_date($a)) {
            error_response('Formato data non valido. Usare YYYY-MM-DD.');
        }

        $promemoria = PromemoriaMod::findInRange(getCurrentUserId(), $da, $a);
        json_response(['promemoria' => $promemoria]);
    }

    public function show(int $id): void {
        requireAuth();
        $promemoria = PromemoriaMod::findById($id);

        if (!$promemoria) {
            error_response('Promemoria non trovato.', 404);
        }

        if ((int) $promemoria['persona_id'] !== getCurrentUserId()) {
            error_response('Non autorizzato.', 403);
        }

        json_response(['promemoria' => $promemoria]);
    }

    public function create(): void {
        requireAuth();
        $data = get_json_body();

        $err = validate_required($data, ['descrizione', 'data_inizio']);
        if ($err) error_response($err);

        if (!validate_date($data['data_inizio'])) {
            error_response('Formato data non valido. Usare YYYY-MM-DD.');
        }

        if (isset($data['ora']) && $data['ora'] !== '' && !validate_time($data['ora'])) {
            error_response('Formato ora non valido. Usare HH:MM.');
        }

        $ricorrenzaValide = ['nessuna', 'settimanale', 'mensile', 'annuale'];
        if (isset($data['ricorrenza']) && !in_array($data['ricorrenza'], $ricorrenzaValide)) {
            error_response('Tipo di ricorrenza non valido.');
        }

        if (isset($data['ricorrenza_fine']) && $data['ricorrenza_fine'] !== '' && !validate_date($data['ricorrenza_fine'])) {
            error_response('Formato data fine ricorrenza non valido.');
        }

        // Pulisci campi vuoti
        if (isset($data['ora']) && $data['ora'] === '') $data['ora'] = null;
        if (isset($data['durata_minuti']) && $data['durata_minuti'] === '') $data['durata_minuti'] = null;
        if (isset($data['ricorrenza_fine']) && $data['ricorrenza_fine'] === '') $data['ricorrenza_fine'] = null;

        $data['persona_id'] = getCurrentUserId();
        $id = PromemoriaMod::create($data);
        $promemoria = PromemoriaMod::findById($id);

        json_response(['promemoria' => $promemoria], 201);
    }

    public function update(int $id): void {
        requireAuth();
        $promemoria = PromemoriaMod::findById($id);

        if (!$promemoria) {
            error_response('Promemoria non trovato.', 404);
        }

        if ((int) $promemoria['persona_id'] !== getCurrentUserId()) {
            error_response('Non autorizzato.', 403);
        }

        $data = get_json_body();

        $err = validate_required($data, ['descrizione', 'data_inizio']);
        if ($err) error_response($err);

        if (!validate_date($data['data_inizio'])) {
            error_response('Formato data non valido.');
        }

        if (isset($data['ora']) && $data['ora'] !== '' && !validate_time($data['ora'])) {
            error_response('Formato ora non valido.');
        }

        // Pulisci campi vuoti
        if (isset($data['ora']) && $data['ora'] === '') $data['ora'] = null;
        if (isset($data['durata_minuti']) && $data['durata_minuti'] === '') $data['durata_minuti'] = null;
        if (isset($data['ricorrenza_fine']) && $data['ricorrenza_fine'] === '') $data['ricorrenza_fine'] = null;

        PromemoriaMod::update($id, $data);
        $updated = PromemoriaMod::findById($id);

        json_response(['promemoria' => $updated]);
    }

    public function destroy(int $id): void {
        requireAuth();
        $promemoria = PromemoriaMod::findById($id);

        if (!$promemoria) {
            error_response('Promemoria non trovato.', 404);
        }

        if ((int) $promemoria['persona_id'] !== getCurrentUserId()) {
            error_response('Non autorizzato.', 403);
        }

        PromemoriaMod::delete($id);
        json_response(['message' => 'Promemoria eliminato.']);
    }
}
