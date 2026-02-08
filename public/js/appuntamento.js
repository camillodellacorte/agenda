document.addEventListener('DOMContentLoaded', async function () {

    // ── Auth guard ─────────────────────────────────────────────
    try {
        await App.requireAuth();
    } catch (e) { return; }
    App.initNavbar();
    App.initTheme();
    document.getElementById('loading-overlay').style.display = 'none';

    // ── Leggi id da query string ───────────────────────────────
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    if (!id) {
        window.location.href = 'calendario.html';
        return;
    }

    // ── Stato locale ───────────────────────────────────────────
    var personeCache = null;
    var selectedPartecipanti = [];
    var disponibilitaTimer = null;
    var isOwner = false;

    // ── Carica dati ────────────────────────────────────────────
    var form = document.getElementById('form-appuntamento');
    var appuntamento = null;

    try {
        var data = await App.api.get('/appuntamenti/' + id);
        appuntamento = data.appuntamento;
    } catch (err) {
        await Swal.fire('Errore', err.message, 'error');
        window.location.href = 'calendario.html';
        return;
    }

    isOwner = parseInt(appuntamento.creato_da) === App.currentUser.id;

    // Popola form
    form.descrizione.value = appuntamento.descrizione;
    form.data.value = appuntamento.data;
    form.ora.value = appuntamento.ora ? appuntamento.ora.substring(0, 5) : '';
    form.durata_minuti.value = appuntamento.durata_minuti || 60;

    // Popola partecipanti
    selectedPartecipanti = (appuntamento.partecipanti || []).map(function (p) {
        return { id: p.id, nome: p.nome, cognome: p.cognome };
    });
    renderPartecipantiTags();

    // ── Read-only per non-creatori ─────────────────────────────
    if (!isOwner) {
        form.descrizione.disabled = true;
        form.data.disabled = true;
        form.ora.disabled = true;
        form.durata_minuti.disabled = true;
        document.getElementById('picker-container').style.display = 'none';
        document.getElementById('action-buttons').style.display = 'none';
        document.getElementById('readonly-badge').style.display = '';
    }

    // ── Carica persone (solo per owner) ────────────────────────
    if (isOwner) {
        await loadPersone();

        // Participant picker
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

        // Verifica disponibilità al cambio campi
        ['data', 'ora', 'durata_minuti'].forEach(function (name) {
            form.querySelector('[name="' + name + '"]').addEventListener('change', debounceDisponibilita);
        });
    }

    // ── Salvataggio ────────────────────────────────────────────
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!isOwner) return;

        var btn = document.getElementById('btn-save');
        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Salvataggio...';

        var body = {
            descrizione: form.descrizione.value.trim(),
            data: form.data.value,
            ora: form.ora.value,
            durata_minuti: parseInt(form.durata_minuti.value) || 60,
            partecipanti_ids: selectedPartecipanti.map(function (p) { return p.id; })
        };

        if (!body.descrizione || !body.data || !body.ora) {
            btn.disabled = false;
            btn.innerHTML = originalText;
            return Swal.fire('Attenzione', 'Descrizione, data e ora sono obbligatori.', 'warning');
        }

        try {
            await App.api.put('/appuntamenti/' + id, body);
            Swal.fire({ icon: 'success', title: 'Appuntamento aggiornato!', timer: 1500, showConfirmButton: false });
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
    });

    // ── Eliminazione ───────────────────────────────────────────
    document.getElementById('btn-delete').addEventListener('click', async function () {
        if (!isOwner) return;

        var result = await Swal.fire({
            title: 'Sei sicuro?',
            text: 'L\'appuntamento verrà eliminato definitivamente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f14668',
            confirmButtonText: 'Elimina',
            cancelButtonText: 'Annulla'
        });

        if (result.isConfirmed) {
            try {
                await App.api.del('/appuntamenti/' + id);
                await Swal.fire({ icon: 'success', title: 'Eliminato!', timer: 1500, showConfirmButton: false });
                window.location.href = 'calendario.html';
            } catch (err) {
                Swal.fire('Errore', err.message, 'error');
            }
        }
    });

    // ================================================================
    // FUNZIONI
    // ================================================================

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
            if (isOwner && p.id !== App.currentUser.id) {
                var delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'btn btn-ghost btn-xs btn-circle';
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
            item.className = 'dropdown-item';
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
        var dataVal = form.data.value;
        var oraVal = form.ora.value;
        var durata = parseInt(form.durata_minuti.value) || 60;
        var partecipantiIds = selectedPartecipanti.map(function (p) { return p.id; });
        var statusEl = document.getElementById('disponibilita-status');

        if (!dataVal || !oraVal || partecipantiIds.length === 0) {
            statusEl.style.display = 'none';
            return;
        }

        try {
            var result = await App.api.post('/appuntamenti/verifica-disponibilita', {
                data: dataVal,
                ora: oraVal,
                durata_minuti: durata,
                partecipanti_ids: partecipantiIds,
                exclude_id: parseInt(id)
            });

            statusEl.style.display = 'block';
            if (result.disponibili) {
                statusEl.className = 'alert alert-success mt-3';
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Tutti i partecipanti sono disponibili!';
            } else {
                statusEl.className = 'alert alert-error mt-3';
                var html = '<div><strong><i class="fas fa-exclamation-triangle"></i> Conflitti rilevati:</strong><ul class="mt-2">';
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
});
