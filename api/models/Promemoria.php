<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/recurrence.php';

class PromemoriaMod {

    public static function findById(int $id): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM promemoria WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findInRange(int $personaId, string $da, string $a): array {
        $db = Database::getConnection();
        // Fetch all reminders for the person that could have occurrences in the range
        $stmt = $db->prepare(
            'SELECT * FROM promemoria
             WHERE persona_id = ?
               AND (
                   (ricorrenza = "nessuna" AND data_inizio BETWEEN ? AND ?)
                   OR (ricorrenza != "nessuna" AND data_inizio <= ?)
               )
             ORDER BY data_inizio, ora'
        );
        $stmt->execute([$personaId, $da, $a, $a]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $row) {
            $occorrenze = espandi_ricorrenza(
                $row['data_inizio'],
                $row['ricorrenza'],
                $row['ricorrenza_fine'],
                $da,
                $a
            );
            if (!empty($occorrenze)) {
                $row['occorrenze'] = $occorrenze;
                $result[] = $row;
            }
        }
        return $result;
    }

    /**
     * Trova promemoria con ora e durata per una persona in una data specifica.
     * Usato per la verifica disponibilità.
     */
    public static function findTimedByPersonaAndDate(int $personaId, string $data): array {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT * FROM promemoria
             WHERE persona_id = ?
               AND ora IS NOT NULL
               AND durata_minuti IS NOT NULL
               AND data_inizio <= ?
             ORDER BY ora'
        );
        $stmt->execute([$personaId, $data]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $row) {
            $occorrenze = espandi_ricorrenza(
                $row['data_inizio'],
                $row['ricorrenza'],
                $row['ricorrenza_fine'],
                $data,
                $data
            );
            if (in_array($data, $occorrenze)) {
                $result[] = $row;
            }
        }
        return $result;
    }

    public static function create(array $data): int {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'INSERT INTO promemoria (persona_id, descrizione, data_inizio, ora, durata_minuti, ricorrenza, ricorrenza_fine)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['persona_id'],
            $data['descrizione'],
            $data['data_inizio'],
            $data['ora'] ?? null,
            $data['durata_minuti'] ?? null,
            $data['ricorrenza'] ?? 'nessuna',
            $data['ricorrenza_fine'] ?? null,
        ]);
        return (int) $db->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'UPDATE promemoria SET descrizione = ?, data_inizio = ?, ora = ?, durata_minuti = ?,
             ricorrenza = ?, ricorrenza_fine = ? WHERE id = ?'
        );
        return $stmt->execute([
            $data['descrizione'],
            $data['data_inizio'],
            $data['ora'] ?? null,
            $data['durata_minuti'] ?? null,
            $data['ricorrenza'] ?? 'nessuna',
            $data['ricorrenza_fine'] ?? null,
            $id,
        ]);
    }

    public static function delete(int $id): bool {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM promemoria WHERE id = ?');
        return $stmt->execute([$id]);
    }
}
