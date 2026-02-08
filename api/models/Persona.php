<?php

require_once __DIR__ . '/../config/database.php';

class Persona {

    public static function findById(int $id): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id, nome, cognome, email, telefono, username, created_at, updated_at FROM persone WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findByUsername(string $username): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM persone WHERE username = ?');
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function getAll(): array {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT id, nome, cognome, email, telefono, username FROM persone ORDER BY cognome, nome');
        return $stmt->fetchAll();
    }

    public static function create(array $data): int {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'INSERT INTO persone (nome, cognome, email, telefono, username, password_hash)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['nome'],
            $data['cognome'],
            $data['email'],
            $data['telefono'] ?? null,
            $data['username'],
            password_hash($data['password'], PASSWORD_BCRYPT),
        ]);
        return (int) $db->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $db = Database::getConnection();
        $fields = [];
        $values = [];

        foreach (['nome', 'cognome', 'email', 'telefono'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }

        if (isset($data['nuova_password']) && $data['nuova_password'] !== '') {
            $fields[] = 'password_hash = ?';
            $values[] = password_hash($data['nuova_password'], PASSWORD_BCRYPT);
        }

        if (empty($fields)) {
            return false;
        }

        $values[] = $id;
        $sql = 'UPDATE persone SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        return $stmt->execute($values);
    }

    public static function existsNomeCognome(string $nome, string $cognome, ?int $excludeId = null): bool {
        $db = Database::getConnection();
        $sql = 'SELECT COUNT(*) FROM persone WHERE nome = ? AND cognome = ?';
        $params = [$nome, $cognome];
        if ($excludeId !== null) {
            $sql .= ' AND id != ?';
            $params[] = $excludeId;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn() > 0;
    }

    public static function existsEmail(string $email, ?int $excludeId = null): bool {
        $db = Database::getConnection();
        $sql = 'SELECT COUNT(*) FROM persone WHERE email = ?';
        $params = [$email];
        if ($excludeId !== null) {
            $sql .= ' AND id != ?';
            $params[] = $excludeId;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn() > 0;
    }

    public static function existsUsername(string $username, ?int $excludeId = null): bool {
        $db = Database::getConnection();
        $sql = 'SELECT COUNT(*) FROM persone WHERE username = ?';
        $params = [$username];
        if ($excludeId !== null) {
            $sql .= ' AND id != ?';
            $params[] = $excludeId;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn() > 0;
    }
}
