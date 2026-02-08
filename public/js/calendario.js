document.addEventListener('DOMContentLoaded', async function () {
    dayjs.locale('it');

    // ── Auth guard ─────────────────────────────────────────────
    try {
        await App.requireAuth();
    } catch (e) { return; }
    App.initNavbar();
    App.initTheme();
    document.getElementById('loading-overlay').style.display = 'none';

    // ── Stato locale ───────────────────────────────────────────
    var calendarInstance = null;
    var cachedPromemoria = [];
    var cachedAppuntamenti = [];
    var personeCache = null;
    var selectedPartecipanti = [];
    var disponibilitaTimer = null;

    // ── Check deep link from dashboard ─────────────────────────
    if (window.location.hash === '#new-promemoria') {
        setTimeout(function () { openPromemoriaModal(); }, 500);
        history.replaceState(null, '', window.location.pathname);
    } else if (window.location.hash === '#new-appuntamento') {
        setTimeout(function () { openAppuntamentoModal(); }, 500);
        history.replaceState(null, '', window.location.pathname);
    }

    // ── Init FullCalendar ──────────────────────────────────────
    var calendarEl = document.getElementById('calendar');
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        locale: 'it',
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        height: 'auto',
        firstDay: 1,
        navLinks: true,

        datesSet: function (info) {
            loadEvents(info.startStr, info.endStr);
        },

        dateClick: function (info) {
            handleDateClick(info.dateStr);
        },

        eventClick: function (info) {
            handleEventClick(info.event);
        }
    });
    calendarInstance.render();

    // ── Filtri pannello iniziali ────────────────────────────────
    var now = dayjs();
    document.getElementById('filtro-da').value = now.startOf('month').format('YYYY-MM-DD');
    document.getElementById('filtro-a').value = now.endOf('month').format('YYYY-MM-DD');
    document.getElementById('btn-filtra').addEventListener('click', renderEventsList);

    // ── Bottoni creazione ──────────────────────────────────────
    document.getElementById('btn-new-promemoria').addEventListener('click', function () {
        openPromemoriaModal();
    });
    document.getElementById('btn-new-appuntamento').addEventListener('click', function () {
        openAppuntamentoModal();
    });

    // ── Ricorrenza toggle ──────────────────────────────────────
    document.getElementById('prom-ricorrenza').addEventListener('change', function (e) {
        var fineField = document.querySelector('#modal-promemoria .field-ricorrenza-fine');
        fineField.style.display = e.target.value === 'nessuna' ? 'none' : '';
    });

    // ── Salvataggio promemoria ─────────────────────────────────
    document.getElementById('btn-save-promemoria').addEventListener('click', savePromemoria);

    // ── Salvataggio appuntamento ───────────────────────────────
    document.getElementById('btn-save-appuntamento').addEventListener('click', saveAppuntamento);

    // ── Participant picker ─────────────────────────────────────
    var searchInput = document.getElementById('partecipanti-search');
    searchInput.addEventListener('input', function () {
        filterPersone(searchInput.value);
    });
    searchInput.addEventListener('focus', function () {
        filterPersone(searchInput.value);
    });
    document.addEventListener('click', function (e) {
        var dropdown = document.getElementById('partecipanti-dropdown');
        if (!e.target.closest('#partecipanti-search') && !e.target.closest('#partecipanti-dropdown')) {
            dropdown.style.display = 'none';
        }
    });

    // Verifica disponibilità al cambio campi appuntamento
    var appForm = document.getElementById('form-appuntamento');
    ['data', 'ora', 'durata_minuti'].forEach(function (name) {
        appForm.querySelector('[name="' + name + '"]').addEventListener('change', debounceDisponibilita);
    });

    // ================================================================
    // FUNZIONI
    // ================================================================

    async function loadEvents(startStr, endStr) {
        var da = dayjs(startStr).format('YYYY-MM-DD');
        var a = dayjs(endStr).format('YYYY-MM-DD');

        try {
            var results = await Promise.all([
                App.api.get('/promemoria?da=' + da + '&a=' + a),
                App.api.get('/appuntamenti?da=' + da + '&a=' + a)
            ]);

            cachedPromemoria = results[0].promemoria;
            cachedAppuntamenti = results[1].appuntamenti;

            var events = [];

            // Map promemoria
            cachedPromemoria.forEach(function (p) {
                (p.occorrenze || []).forEach(function (dateStr) {
                    var evt = {
                        id: 'prom-' + p.id + '-' + dateStr,
                        title: p.descrizione,
                        classNames: ['event-promemoria'],
                        extendedProps: { type: 'promemoria', originalId: p.id }
                    };
                    if (p.ora) {
                        evt.start = dateStr + 'T' + p.ora;
                        if (p.durata_minuti) {
                            evt.end = dayjs(dateStr + 'T' + p.ora)
                                .add(p.durata_minuti, 'minute')
                                .format('YYYY-MM-DDTHH:mm:ss');
                        }
                    } else {
                        evt.start = dateStr;
                        evt.allDay = true;
                    }
                    events.push(evt);
                });
            });

            // Map appuntamenti
            cachedAppuntamenti.forEach(function (a) {
                var evt = {
                    id: 'app-' + a.id,
                    title: a.descrizione,
                    start: a.data + 'T' + a.ora,
                    classNames: ['event-appuntamento'],
                    extendedProps: { type: 'appuntamento', originalId: a.id }
                };
                if (a.durata_minuti) {
                    evt.end = dayjs(a.data + 'T' + a.ora)
                        .add(a.durata_minuti, 'minute')
                        .format('YYYY-MM-DDTHH:mm:ss');
                }
                events.push(evt);
            });

            // Replace events
            calendarInstance.removeAllEvents();
            calendarInstance.addEventSource(events);

            // Update list panel
            renderEventsList();

        } catch (err) {
            console.error('Errore caricamento eventi:', err);
        }
    }

    function renderEventsList() {
        var da = document.getElementById('filtro-da').value;
        var a = document.getElementById('filtro-a').value;
        var tipo = document.getElementById('filtro-tipo').value;
        var tbody = document.getElementById('events-table-body');

        var rows = [];

        // Promemoria
        if (tipo === 'tutti' || tipo === 'promemoria') {
            cachedPromemoria.forEach(function (p) {
                (p.occorrenze || []).forEach(function (dateStr) {
                    if (da && dateStr < da) return;
                    if (a && dateStr > a) return;
                    rows.push({
                        type: 'promemoria',
                        id: p.id,
                        descrizione: p.descrizione,
                        data: dateStr,
                        ora: p.ora ? p.ora.substring(0, 5) : '-',
                        durata: p.durata_minuti ? p.durata_minuti + ' min' : '-',
                        sortKey: dateStr + (p.ora || '99:99')
                    });
                });
            });
        }

        // Appuntamenti
        if (tipo === 'tutti' || tipo === 'appuntamenti') {
            cachedAppuntamenti.forEach(function (ap) {
                if (da && ap.data < da) return;
                if (a && ap.data > a) return;
                rows.push({
                    type: 'appuntamento',
                    id: ap.id,
                    descrizione: ap.descrizione,
                    data: ap.data,
                    ora: ap.ora ? ap.ora.substring(0, 5) : '-',
                    durata: ap.durata_minuti ? ap.durata_minuti + ' min' : '-',
                    sortKey: ap.data + (ap.ora || '99:99')
                });
            });
        }

        // Ordina per data/ora
        rows.sort(function (a, b) { return a.sortKey.localeCompare(b.sortKey); });

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-base-content/50">Nessun evento nel periodo selezionato</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (r) {
            var typeIcon = r.type === 'promemoria'
                ? '<span class="badge badge-info badge-sm gap-1"><i class="fas fa-sticky-note"></i> Prom.</span>'
                : '<span class="badge badge-success badge-sm gap-1"><i class="fas fa-users"></i> App.</span>';

            var detailPage = r.type === 'promemoria'
                ? 'promemoria.html?id=' + r.id
                : 'appuntamento.html?id=' + r.id;

            var formattedDate = dayjs(r.data).format('DD/MM/YYYY');

            return '<tr>' +
                '<td>' + typeIcon + '</td>' +
                '<td>' + App.escapeHtml(r.descrizione) + '</td>' +
                '<td>' + formattedDate + '</td>' +
                '<td>' + r.ora + '</td>' +
                '<td>' + r.durata + '</td>' +
                '<td>' +
                    '<a href="' + detailPage + '" class="btn btn-info btn-outline btn-sm" title="Dettaglio">' +
                        '<i class="fas fa-edit"></i>' +
                    '</a>' +
                '</td>' +
            '</tr>';
        }).join('');
    }

    function handleDateClick(dateStr) {
        Swal.fire({
            title: 'Nuovo evento',
            text: dayjs(dateStr).format('DD MMMM YYYY'),
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Promemoria',
            denyButtonText: 'Appuntamento',
            cancelButtonText: 'Annulla',
            confirmButtonColor: '#3b82f6',
            denyButtonColor: '#22c55e'
        }).then(function (result) {
            if (result.isConfirmed) {
                openPromemoriaModal(dateStr);
            } else if (result.isDenied) {
                openAppuntamentoModal(dateStr);
            }
        });
    }

    function handleEventClick(event) {
        var type = event.extendedProps.type;
        var id = event.extendedProps.originalId;
        if (type === 'promemoria') {
            window.location.href = 'promemoria.html?id=' + id;
        } else {
            window.location.href = 'appuntamento.html?id=' + id;
        }
    }

    // ── Modale Promemoria ──────────────────────────────────────

    function openPromemoriaModal(prefilledDate) {
        var modal = document.getElementById('modal-promemoria');
        var form = document.getElementById('form-promemoria');
        form.reset();
        if (prefilledDate) {
            form.data_inizio.value = prefilledDate;
        }
        document.querySelector('#modal-promemoria .field-ricorrenza-fine').style.display = 'none';
        modal.showModal();
    }

    async function savePromemoria() {
        var form = document.getElementById('form-promemoria');
        var btn = document.getElementById('btn-save-promemoria');
        var originalText = btn.innerHTML;

        var body = {
            descrizione: form.descrizione.value.trim(),
            data_inizio: form.data_inizio.value,
            ora: form.ora.value || null,
            durata_minuti: form.durata_minuti.value ? parseInt(form.durata_minuti.value) : null,
            ricorrenza: form.ricorrenza.value,
            ricorrenza_fine: form.ricorrenza_fine.value || null
        };

        if (!body.descrizione || !body.data_inizio) {
            return Swal.fire('Attenzione', 'Descrizione e data sono obbligatori.', 'warning');
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Salvataggio...';
        try {
            await App.api.post('/promemoria', body);
            document.getElementById('modal-promemoria').close();
            refreshCalendar();
            Swal.fire({ icon: 'success', title: 'Promemoria creato!', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire('Errore', err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    // ── Modale Appuntamento ────────────────────────────────────

    async function openAppuntamentoModal(prefilledDate) {
        var modal = document.getElementById('modal-appuntamento');
        var form = document.getElementById('form-appuntamento');
        form.reset();
        form.durata_minuti.value = 60;
        if (prefilledDate) {
            form.data.value = prefilledDate;
        }
        document.getElementById('disponibilita-status').style.display = 'none';

        // Reset partecipanti
        selectedPartecipanti = [];
        addPartecipante({ id: App.currentUser.id, nome: App.currentUser.nome, cognome: App.currentUser.cognome });
        renderPartecipantiTags();

        // Carica persone
        await loadPersone();

        modal.showModal();
    }

    async function loadPersone() {
        if (!personeCache) {
            var data = await App.api.get('/persone');
            personeCache = data.persone;
        }
        return personeCache;
    }

    function addPartecipante(persona) {
        if (selectedPartecipanti.find(function (p) { return p.id === persona.id; })) return;
        selectedPartecipanti.push(persona);
        renderPartecipantiTags();
        debounceDisponibilita();
    }

    function removePartecipante(personaId) {
        if (personaId === App.currentUser.id) return;
        selectedPartecipanti = selectedPartecipanti.filter(function (p) { return p.id !== personaId; });
        renderPartecipantiTags();
        debounceDisponibilita();
    }

    function renderPartecipantiTags() {
        var container = document.getElementById('partecipanti-tags');
        container.innerHTML = '';
        selectedPartecipanti.forEach(function (p) {
            var tag = document.createElement('span');
            tag.className = 'badge badge-info badge-lg gap-1';
            tag.textContent = p.nome + ' ' + p.cognome;
            if (p.id !== App.currentUser.id) {
                var delBtn = document.createElement('button');
                delBtn.className = 'btn btn-ghost btn-xs px-1';
                delBtn.type = 'button';
                delBtn.innerHTML = '&times;';
                delBtn.addEventListener('click', function () { removePartecipante(p.id); });
                tag.appendChild(delBtn);
            }
            container.appendChild(tag);
        });
    }

    function filterPersone(query) {
        var dropdown = document.getElementById('partecipanti-dropdown');
        var q = (query || '').toLowerCase();
        var selectedIds = selectedPartecipanti.map(function (p) { return p.id; });

        var filtered = (personeCache || []).filter(function (p) {
            if (selectedIds.indexOf(p.id) !== -1) return false;
            var fullName = (p.nome + ' ' + p.cognome + ' ' + p.username).toLowerCase();
            return fullName.indexOf(q) !== -1;
        });

        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = '';
        filtered.forEach(function (p) {
            var item = document.createElement('a');
            item.href = '#';
            item.textContent = p.nome + ' ' + p.cognome + ' (' + p.username + ')';
            item.addEventListener('click', function (e) {
                e.preventDefault();
                addPartecipante(p);
                document.getElementById('partecipanti-search').value = '';
                dropdown.style.display = 'none';
            });
            dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
    }

    function debounceDisponibilita() {
        clearTimeout(disponibilitaTimer);
        disponibilitaTimer = setTimeout(checkDisponibilita, 500);
    }

    async function checkDisponibilita() {
        var form = document.getElementById('form-appuntamento');
        var data = form.data.value;
        var ora = form.ora.value;
        var durata = parseInt(form.durata_minuti.value) || 60;
        var partecipantiIds = selectedPartecipanti.map(function (p) { return p.id; });
        var statusEl = document.getElementById('disponibilita-status');

        if (!data || !ora || partecipantiIds.length === 0) {
            statusEl.style.display = 'none';
            return;
        }

        try {
            var result = await App.api.post('/appuntamenti/verifica-disponibilita', {
                data: data,
                ora: ora,
                durata_minuti: durata,
                partecipanti_ids: partecipantiIds
            });

            statusEl.style.display = 'block';
            if (result.disponibili) {
                statusEl.className = 'alert alert-success mt-3';
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Tutti i partecipanti sono disponibili!';
            } else {
                statusEl.className = 'alert alert-error mt-3';
                var html = '<div><strong><i class="fas fa-exclamation-triangle"></i> Conflitti rilevati:</strong><ul class="mt-2 ml-4 list-disc">';
                result.conflitti.forEach(function (c) {
                    html += '<li><strong>' + App.escapeHtml(c.nome) + ' ' + App.escapeHtml(c.cognome) + '</strong>: "' + App.escapeHtml(c.descrizione) + '" alle ' + c.ora.substring(0, 5) + '</li>';
                });
                html += '</ul></div>';
                statusEl.innerHTML = html;
            }
        } catch (err) {
            console.error('Errore verifica disponibilità:', err);
        }
    }

    async function saveAppuntamento() {
        var form = document.getElementById('form-appuntamento');
        var btn = document.getElementById('btn-save-appuntamento');
        var originalText = btn.innerHTML;

        var body = {
            descrizione: form.descrizione.value.trim(),
            data: form.data.value,
            ora: form.ora.value,
            durata_minuti: parseInt(form.durata_minuti.value) || 60,
            partecipanti_ids: selectedPartecipanti.map(function (p) { return p.id; })
        };

        if (!body.descrizione || !body.data || !body.ora) {
            return Swal.fire('Attenzione', 'Descrizione, data e ora sono obbligatori.', 'warning');
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Salvataggio...';
        try {
            await App.api.post('/appuntamenti', body);
            document.getElementById('modal-appuntamento').close();
            refreshCalendar();
            Swal.fire({ icon: 'success', title: 'Appuntamento creato!', timer: 1500, showConfirmButton: false });
        } catch (err) {
            if (err.status === 409 && err.details && err.details.conflitti) {
                var html = '<ul style="text-align:left">';
                err.details.conflitti.forEach(function (c) {
                    html += '<li><strong>' + App.escapeHtml(c.nome) + ' ' + App.escapeHtml(c.cognome) + '</strong>: "' + App.escapeHtml(c.descrizione) + '" alle ' + c.ora.substring(0, 5) + '</li>';
                });
                html += '</ul>';
                Swal.fire({ icon: 'error', title: 'Conflitto di disponibilità', html: html });
            } else {
                Swal.fire('Errore', err.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    // ── Utility ────────────────────────────────────────────────

    function refreshCalendar() {
        var view = calendarInstance.view;
        loadEvents(view.activeStart.toISOString(), view.activeEnd.toISOString());
    }
});
