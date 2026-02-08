# Gestione Agenda Appuntamenti

Applicazione web per la gestione condivisa di appuntamenti e promemoria personali.

## Funzionalita

- **Registrazione e login** con autenticazione tramite sessioni PHP
- **Promemoria personali** con supporto a ricorrenze (giornaliera, settimanale, mensile, annuale)
- **Appuntamenti condivisi** tra piu partecipanti con verifica automatica della disponibilita
- **Calendario interattivo** con vista mensile, settimanale e giornaliera
- **Dashboard** con riepilogo giornaliero e prossimi impegni
- **Statistiche** con grafici su appuntamenti e promemoria
- **Tema chiaro/scuro** con commutazione manuale

## Stack Tecnologico

| Componente | Tecnologia |
|---|---|
| Backend | PHP 8 (REST API) |
| Database | MySQL (XAMPP) |
| Frontend | HTML, CSS, JavaScript |
| UI Framework | DaisyUI + Tailwind CSS (CDN) |
| Calendario | FullCalendar |
| Grafici | Chart.js |
| Date | Day.js |
| Notifiche | SweetAlert2 |

## Installazione

### Prerequisiti

- [XAMPP](https://www.apachefriends.org/) con Apache e MySQL attivi

### Passi

1. Clona il repository nella cartella `htdocs` di XAMPP:
   ```bash
   cd C:\xampp\htdocs
   git clone https://github.com/camillodellacorte/agenda.git
   ```

2. Apri phpMyAdmin (`http://localhost/phpmyadmin`) e importa lo schema del database:
   - Importa il file `SchemaPerMySQL.sql` (crea il database "Agenda" e le tabelle)
   - Importa il file `public/DatiPerMySQL.sql` (inserisce dati di esempio)

3. Apri il browser e vai a:
   ```
   http://localhost/agenda/public/
   ```

### Credenziali di test (dopo import DatiPerMySQL.sql)

| Email | Password |
|---|---|
| mario.rossi@example.com | password123 |
| laura.bianchi@example.com | password123 |
| giuseppe.verdi@example.com | password123 |

## Struttura del Progetto

```
agenda/
├── api/                    # Backend REST API
│   ├── config/             # Configurazione database
│   ├── controllers/        # Controller (Auth, Promemoria, Appuntamenti)
│   ├── helpers/            # Funzioni helper (response, validation, recurrence)
│   ├── middleware/         # Middleware autenticazione
│   ├── models/             # Modelli dati (Persona, Promemoria, Appuntamento)
│   └── index.php           # Router principale
├── public/                 # Frontend
│   ├── css/                # Stili personalizzati
│   ├── js/                 # JavaScript (un file per pagina + api.js condiviso)
│   ├── login.html          # Pagina di login
│   ├── register.html       # Pagina di registrazione
│   ├── dashboard.html      # Dashboard principale
│   ├── calendario.html     # Calendario interattivo
│   ├── statistiche.html    # Grafici e statistiche
│   ├── promemoria.html     # Dettaglio/modifica promemoria
│   ├── appuntamento.html   # Dettaglio/modifica appuntamento
│   ├── profilo.html        # Profilo utente
│   └── DatiPerMySQL.sql    # Dati di esempio
└── SchemaPerMySQL.sql      # Schema database
```
