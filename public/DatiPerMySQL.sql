-- ============================================================
-- Dati di esempio per il database Agenda
-- ============================================================

USE Agenda;

-- ------------------------------------------------------------
-- Persone (password: password123 per tutti)
-- ------------------------------------------------------------
INSERT INTO persone (nome, cognome, email, telefono, username, password_hash) VALUES
('Mario',    'Rossi',    'mario.rossi@email.it',    '3331234567', 'mrossi',    '$2y$10$ao5bwC.iMP3GjYSs/JBFZuiv8llz.FR.vfWZGf221lGC6fy.4znMO'),
('Laura',    'Bianchi',  'laura.bianchi@email.it',  '3339876543', 'lbianchi',  '$2y$10$ao5bwC.iMP3GjYSs/JBFZuiv8llz.FR.vfWZGf221lGC6fy.4znMO'),
('Giuseppe', 'Verdi',    'giuseppe.verdi@email.it', '3335551234', 'gverdi',    '$2y$10$ao5bwC.iMP3GjYSs/JBFZuiv8llz.FR.vfWZGf221lGC6fy.4znMO'),
('Anna',     'Neri',     'anna.neri@email.it',      '3337778899', 'aneri',     '$2y$10$ao5bwC.iMP3GjYSs/JBFZuiv8llz.FR.vfWZGf221lGC6fy.4znMO'),
('Luca',     'Ferrari',  'luca.ferrari@email.it',   '3332223344', 'lferrari',  '$2y$10$ao5bwC.iMP3GjYSs/JBFZuiv8llz.FR.vfWZGf221lGC6fy.4znMO'),
('Giulia',   'Esposito', 'giulia.esposito@email.it','3336667788', 'gesposito', '$2y$10$ao5bwC.iMP3GjYSs/JBFZuiv8llz.FR.vfWZGf221lGC6fy.4znMO');

-- ------------------------------------------------------------
-- Promemoria
-- ------------------------------------------------------------
INSERT INTO promemoria (persona_id, descrizione, data_inizio, ora, durata_minuti, ricorrenza, ricorrenza_fine) VALUES
-- Mario: promemoria vari
(1, 'Comprare il latte',                  '2026-02-10', NULL,    NULL, 'nessuna',     NULL),
(1, 'Palestra',                            '2026-02-03', '18:00', 60,  'settimanale', '2026-06-30'),
(1, 'Pagamento bollette',                  '2026-02-01', '09:00', 30,  'mensile',     '2026-12-31'),
(1, 'Compleanno mamma',                    '2026-03-15', NULL,    NULL, 'annuale',     NULL),

-- Laura: promemoria vari
(2, 'Riunione staff settimanale',          '2026-02-04', '10:00', 60,  'settimanale', '2026-07-31'),
(2, 'Controllare email importanti',        '2026-02-05', '08:30', 15,  'settimanale', '2026-12-31'),
(2, 'Scadenza progetto X',                 '2026-03-01', '17:00', NULL, 'nessuna',     NULL),

-- Giuseppe: promemoria
(3, 'Lezione di piano',                    '2026-02-06', '16:00', 45,  'settimanale', '2026-06-30'),
(3, 'Visita medica annuale',               '2026-04-20', '10:00', 60,  'annuale',     NULL),

-- Anna: promemoria
(4, 'Corso di yoga',                       '2026-02-03', '07:00', 90,  'settimanale', '2026-08-31'),
(4, 'Rinnovare abbonamento trasporti',     '2026-03-01', NULL,    NULL, 'mensile',     '2026-12-31'),

-- Luca: promemoria
(5, 'Backup settimanale documenti',        '2026-02-07', '22:00', 30,  'settimanale', '2026-12-31'),
(5, 'Anniversario matrimonio',             '2026-06-15', NULL,    NULL, 'annuale',     NULL),

-- Giulia: promemoria
(6, 'Studio per esame',                    '2026-02-10', '14:00', 120, 'nessuna',     NULL),
(6, 'Chiamare la nonna',                   '2026-02-02', '11:00', 30,  'settimanale', '2026-12-31');

-- ------------------------------------------------------------
-- Appuntamenti
-- ------------------------------------------------------------
INSERT INTO appuntamenti (descrizione, data, ora, durata_minuti, creato_da) VALUES
('Riunione di progetto',           '2026-02-12', '09:00', 90,  1),
('Pranzo di lavoro',               '2026-02-14', '12:30', 60,  2),
('Presentazione Q1',               '2026-02-18', '14:00', 120, 1),
('Colloquio nuovo candidato',      '2026-02-20', '11:00', 45,  3),
('Brainstorming nuove idee',       '2026-02-25', '15:00', 90,  4),
('Revisione budget trimestrale',   '2026-03-05', '10:00', 60,  2),
('Team building aperitivo',        '2026-03-10', '18:00', 120, 5);

-- ------------------------------------------------------------
-- Partecipanti (include sempre il creatore)
-- ------------------------------------------------------------
INSERT INTO partecipanti (appuntamento_id, persona_id) VALUES
-- Riunione di progetto (creato da Mario): Mario, Laura, Giuseppe
(1, 1), (1, 2), (1, 3),
-- Pranzo di lavoro (creato da Laura): Laura, Anna
(2, 2), (2, 4),
-- Presentazione Q1 (creato da Mario): Mario, Laura, Giuseppe, Anna
(3, 1), (3, 2), (3, 3), (3, 4),
-- Colloquio nuovo candidato (creato da Giuseppe): Giuseppe, Laura
(4, 3), (4, 2),
-- Brainstorming nuove idee (creato da Anna): Anna, Luca, Giulia
(5, 4), (5, 5), (5, 6),
-- Revisione budget (creato da Laura): Laura, Mario, Luca
(6, 2), (6, 1), (6, 5),
-- Team building (creato da Luca): tutti
(7, 5), (7, 1), (7, 2), (7, 3), (7, 4), (7, 6);
