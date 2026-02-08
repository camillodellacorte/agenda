document.addEventListener('DOMContentLoaded', function () {

    // ── Login ──────────────────────────────────────────────────
    var loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var btn = document.getElementById('btn-login');
            var originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Accesso...';

            try {
                var data = await App.api.post('/auth/login', {
                    username: loginForm.username.value.trim(),
                    password: loginForm.password.value
                });
                App.currentUser = data.user;
                window.location.href = 'dashboard.html';
            } catch (err) {
                Swal.fire('Errore', err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // ── Registrazione ──────────────────────────────────────────
    var registerForm = document.getElementById('form-register');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var btn = document.getElementById('btn-register');
            var originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Registrazione...';

            var body = {
                nome: registerForm.nome.value.trim(),
                cognome: registerForm.cognome.value.trim(),
                email: registerForm.email.value.trim(),
                username: registerForm.username.value.trim(),
                password: registerForm.password.value
            };

            var telefono = registerForm.telefono.value.trim();
            if (telefono) body.telefono = telefono;

            try {
                await App.api.post('/auth/register', body);
                await Swal.fire('Registrazione completata', 'Ora puoi effettuare il login.', 'success');
                window.location.href = 'login.html';
            } catch (err) {
                Swal.fire('Errore', err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }
});
