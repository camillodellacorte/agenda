-- ============================================================
-- Schema per il database Agenda
-- Gestione Agenda Appuntamenti
-- ============================================================

DROP DATABASE IF EXISTS Agenda;
CREATE DATABASE Agenda
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE Agenda;

-- ------------------------------------------------------------
-- Tabella: persone
-- Utenti registrati nell'applicazione
-- ------------------------------------------------------------
CREATE TABLE persone (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100)    NOT NULL,
    cognome         VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    telefono        VARCHAR(20)     DEFAULT NULL,
    username        VARCHAR(50)     NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_nome_cognome (nome, cognome),
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabella: promemoria
-- Promemoria personali, possono essere ricorrenti
-- ------------------------------------------------------------
CREATE TABLE promemoria (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    persona_id      INT UNSIGNED    NOT NULL,
    descrizione     TEXT            NOT NULL,
    data_inizio     DATE            NOT NULL,
    ora             TIME            DEFAULT NULL,
    durata_minuti   INT UNSIGNED    DEFAULT NULL,
    ricorrenza      ENUM('nessuna','settimanale','mensile','annuale')
                                    NOT NULL DEFAULT 'nessuna',
    ricorrenza_fine DATE            DEFAULT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (persona_id) REFERENCES persone(id) ON DELETE CASCADE,
    INDEX idx_promemoria_persona (persona_id),
    INDEX idx_promemoria_data (data_inizio)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabella: appuntamenti
-- Appuntamenti condivisi tra piu persone, non ricorrenti
-- ------------------------------------------------------------
CREATE TABLE appuntamenti (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    descrizione     TEXT            NOT NULL,
    data            DATE            NOT NULL,
    ora             TIME            NOT NULL,
    durata_minuti   INT UNSIGNED    NOT NULL DEFAULT 60,
    creato_da       INT UNSIGNED    NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creato_da) REFERENCES persone(id) ON DELETE CASCADE,
    INDEX idx_appuntamenti_data (data, ora)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabella: partecipanti
-- Relazione N:M tra appuntamenti e persone
-- Il creatore dell'appuntamento e' anche partecipante
-- ------------------------------------------------------------
CREATE TABLE partecipanti (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appuntamento_id INT UNSIGNED    NOT NULL,
    persona_id      INT UNSIGNED    NOT NULL,
    UNIQUE KEY uk_app_persona (appuntamento_id, persona_id),
    FOREIGN KEY (appuntamento_id) REFERENCES appuntamenti(id) ON DELETE CASCADE,
    FOREIGN KEY (persona_id)      REFERENCES persone(id)      ON DELETE CASCADE
) ENGINE=InnoDB;
