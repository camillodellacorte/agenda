<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Promemoria.php';

class Appuntamento {

    public static function findById(int $id): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM appuntamenti WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;

        $row['partecipanti'] = self::getPartecipanti($id);
        return $row;
    }

    public static function findInRange(int $personaId, string $da, string $a): array {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT a.* FROM appuntamenti a
             INNER JOIN partecipanti p ON a.id = p.appuntamento_id
             WHERE p.persona_id = ? AND a.data BETWEEN ? AND ?
             ORDER BY a.data, a.ora'
        );
        $stmt->execute([$personaId, $da, $a]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['partecipanti'] = self::getPartecipanti($row['id']);
        }
        return $rows;
    }

    public static function findByPersonaAndDate(int $personaId, string $data, ?int $excludeId = null): array {
        $db = Database::getConnection();
        $sql = 'SELECT a.* FROM appuntamenti a
                INNER JOIN partecipanti p ON a.id = p.appuntamento_id
                WHERE p.persona_id = ? AND a.data = ?';
        $params = [$personaId, $data];

        if ($excludeId !== null) {
            $sql .= ' AND a.id != ?';
            $params[] = $excludeId;
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function getPartecipanti(int $appuntamentoId): array {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT pe.id, pe.nome, pe.cognome, pe.email
             FROM partecipanti pa
             INNER JOIN persone pe ON pa.persona_id = pe.id
             WHERE pa.appuntamento_id = ?
             ORDER BY pe.cognome, pe.nome'
        );
        $stmt->execute([$appuntamentoId]);
        return $stmt->fetchAll();
    }

    public static function create(array $data): int {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare(
                'INSERT INTO appuntamenti (descrizione, data, ora, durata_minuti, creato_da)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $data['descrizione'],
                $data['data'],
                $data['ora'],
                $data['durata_minuti'] ?? 60,
                $data['creato_da'],
            ]);
            $appId = (int) $db->lastInsertId();

            // Inserisci partecipanti
            $partecipanti = $data['partecipanti_ids'] ?? [];
            // Assicurati che il creatore sia tra i partecipanti
            if (!in_array($data['creato_da'], $partecipanti)) {
                $partecipanti[] = $data['creato_da'];
            }

            $stmtP = $db->prepare('INSERT INTO partecipanti (appuntamento_id, persona_id) VALUES (?, ?)');
            foreach ($partecipanti as $pid) {
                $stmtP->execute([$appId, (int) $pid]);
            }

            $db->commit();
            return $appId;

        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function update(int $id, array $data): bool {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare(
                'UPDATE appuntamenti SET descrizione = ?, data = ?, ora = ?, durata_minuti = ? WHERE id = ?'
            );
            $stmt->execute([
                $data['descrizione'],
                $data['data'],
                $data['ora'],
                $data['durata_minuti'] ?? 60,
                $id,
            ]);

            // Aggiorna partecipanti se forniti
            if (isset($data['partecipanti_ids'])) {
                $db->prepare('DELETE FROM partecipanti WHERE appuntamento_id = ?')->execute([$id]);

                $partecipanti = $data['partecipanti_ids'];
                // Recupera il creatore
                $app = $db->prepare('SELECT creato_da FROM appuntamenti WHERE id = ?');
                $app->execute([$id]);
                $creatoDa = (int) $app->fetchColumn();
                if (!in_array($creatoDa, $partecipanti)) {
                    $partecipanti[] = $creatoDa;
                }

                $stmtP = $db->prepare('INSERT INTO partecipanti (appuntamento_id, persona_id) VALUES (?, ?)');
                foreach ($partecipanti as $pid) {
                    $stmtP->execute([$id, (int) $pid]);
                }
            }

            $db->commit();
            return true;

        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function delete(int $id): bool {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM appuntamenti WHERE id = ?');
        return $stmt->execute([$id]);
    }

    /**
     * Verifica la disponibilità di tutti i partecipanti per un appuntamento proposto.
     * Restituisce un array di conflitti (vuoto se tutti sono liberi).
     */
    public static function verificaDisponibilita(
        array $partecipantiIds,
        string $data,
        string $ora,
        int $durata,
        ?int $excludeAppId = null
    ): array {
        $conflitti = [];
        $inizioProposto = new DateTime("$data $ora");
        $fineProposto = (clone $inizioProposto)->modify("+{$durata} minutes");

        foreach ($partecipantiIds as $pid) {
            $pid = (int) $pid;

            // Controlla appuntamenti esistenti
            $appuntamenti = self::findByPersonaAndDate($pid, $data, $excludeAppId);
            foreach ($appuntamenti as $app) {
                $inizioApp = new DateTime("{$app['data']} {$app['ora']}");
                $fineApp = (clone $inizioApp)->modify("+{$app['durata_minuti']} minutes");

                if ($inizioProposto < $fineApp && $inizioApp < $fineProposto) {
                    $conflitti[] = [
                        'persona_id'  => $pid,
                        'tipo'        => 'appuntamento',
                        'conflitto_id' => $app['id'],
                        'descrizione' => $app['descrizione'],
                        'ora'         => $app['ora'],
                    ];
                }
            }

            // Controlla promemoria con ora e durata
            $promemoria = PromemoriaMod::findTimedByPersonaAndDate($pid, $data);
            foreach ($promemoria as $prom) {
                $inizioProm = new DateTime("$data {$prom['ora']}");
                $fineProm = (clone $inizioProm)->modify("+{$prom['durata_minuti']} minutes");

                if ($inizioProposto < $fineProm && $inizioProm < $fineProposto) {
                    $conflitti[] = [
                        'persona_id'  => $pid,
                        'tipo'        => 'promemoria',
                        'conflitto_id' => $prom['id'],
                        'descrizione' => $prom['descrizione'],
                        'ora'         => $prom['ora'],
                    ];
                }
            }
        }

        return $conflitti;
    }
}
