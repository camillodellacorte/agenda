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

    // ── Carica dati ────────────────────────────────────────────
    var form = document.getElementById('form-promemoria');
    var promemoria = null;

    try {
        var data = await App.api.get('/promemoria/' + id);
        promemoria = data.promemoria;
    } catch (err) {
        await Swal.fire('Errore', err.message, 'error');
        window.location.href = 'calendario.html';
        return;
    }

    // Popola form
    form.descrizione.value = promemoria.descrizione;
    form.data_inizio.value = promemoria.data_inizio;
    form.ora.value = promemoria.ora ? promemoria.ora.substring(0, 5) : '';
    form.durata_minuti.value = promemoria.durata_minuti || '';
    form.ricorrenza.value = promemoria.ricorrenza || 'nessuna';
    form.ricorrenza_fine.value = promemoria.ricorrenza_fine || '';

    // Toggle ricorrenza_fine
    var fineField = document.querySelector('.field-ricorrenza-fine');
    fineField.style.display = promemoria.ricorrenza !== 'nessuna' ? '' : 'none';

    document.getElementById('prom-ricorrenza').addEventListener('change', function (e) {
        fineField.style.display = e.target.value === 'nessuna' ? 'none' : '';
    });

    // ── Salvataggio ────────────────────────────────────────────
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var btn = document.getElementById('btn-save');
        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Salvataggio...';

        var body = {
            descrizione: form.descrizione.value.trim(),
            data_inizio: form.data_inizio.value,
            ora: form.ora.value || null,
            durata_minuti: form.durata_minuti.value ? parseInt(form.durata_minuti.value) : null,
            ricorrenza: form.ricorrenza.value,
            ricorrenza_fine: form.ricorrenza_fine.value || null
        };

        if (!body.descrizione || !body.data_inizio) {
            btn.disabled = false;
            btn.innerHTML = originalText;
            return Swal.fire('Attenzione', 'Descrizione e data sono obbligatori.', 'warning');
        }

        try {
            await App.api.put('/promemoria/' + id, body);
            Swal.fire({ icon: 'success', title: 'Promemoria aggiornato!', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire('Errore', err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // ── Eliminazione ───────────────────────────────────────────
    document.getElementById('btn-delete').addEventListener('click', async function () {
        var result = await Swal.fire({
            title: 'Sei sicuro?',
            text: 'Il promemoria verrà eliminato definitivamente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f14668',
            confirmButtonText: 'Elimina',
            cancelButtonText: 'Annulla'
        });

        if (result.isConfirmed) {
            try {
                await App.api.del('/promemoria/' + id);
                await Swal.fire({ icon: 'success', title: 'Eliminato!', timer: 1500, showConfirmButton: false });
                window.location.href = 'calendario.html';
            } catch (err) {
                Swal.fire('Errore', err.message, 'error');
            }
        }
    });
});
