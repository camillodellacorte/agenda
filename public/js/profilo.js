document.addEventListener('DOMContentLoaded', async function () {

    // ── Auth guard ─────────────────────────────────────────────
    try {
        await App.requireAuth();
    } catch (e) { return; }
    App.initNavbar();
    App.initTheme();
    document.getElementById('loading-overlay').style.display = 'none';

    // ── Popola form ────────────────────────────────────────────
    var form = document.getElementById('form-profilo');
    var user = App.currentUser;

    form.nome.value = user.nome;
    form.cognome.value = user.cognome;
    form.email.value = user.email;
    form.telefono.value = user.telefono || '';
    form.username.value = user.username;

    // ── Salvataggio ────────────────────────────────────────────
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var btn = document.getElementById('btn-save');
        var originalText = btn.innerHTML;

        var body = {
            nome: form.nome.value.trim(),
            cognome: form.cognome.value.trim(),
            email: form.email.value.trim(),
            telefono: form.telefono.value.trim() || null,
            password_corrente: form.password_corrente.value
        };

        if (!body.password_corrente) {
            return Swal.fire('Attenzione', 'Inserisci la password corrente per confermare le modifiche.', 'warning');
        }

        var nuovaPassword = form.nuova_password.value;
        if (nuovaPassword) body.nuova_password = nuovaPassword;

        btn.disabled = true;
        btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Salvataggio...';
        try {
            var data = await App.api.put('/persone/' + App.currentUser.id, body);
            App.currentUser = data.persona;
            document.getElementById('navbar-user-name').textContent = data.persona.nome + ' ' + data.persona.cognome;
            form.password_corrente.value = '';
            form.nuova_password.value = '';
            Swal.fire({ icon: 'success', title: 'Profilo aggiornato!', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire('Errore', err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
});
