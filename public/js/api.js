window.App = window.App || {};

App.API_BASE = '/agenda/api';
App.currentUser = null;

// ── Wrapper Fetch ──────────────────────────────────────────────
App.api = {
    async request(endpoint, { method = 'GET', body = null } = {}) {
        var url = App.API_BASE + endpoint;
        var opts = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };
        if (body) opts.body = JSON.stringify(body);

        var res = await fetch(url, opts);
        var json = await res.json();

        if (!json.success) {
            if (res.status === 401) {
                App.currentUser = null;
                window.location.href = 'login.html';
                return;
            }
            var err = new Error(json.error || 'Errore sconosciuto');
            err.status = res.status;
            err.details = json.details || null;
            throw err;
        }
        return json.data;
    },

    get: function (endpoint) { return this.request(endpoint); },
    post: function (endpoint, body) { return this.request(endpoint, { method: 'POST', body: body }); },
    put: function (endpoint, body) { return this.request(endpoint, { method: 'PUT', body: body }); },
    del: function (endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// ── Sessione & Auth Guard ──────────────────────────────────────
App.checkSession = async function () {
    try {
        var data = await App.api.get('/auth/me');
        App.currentUser = data.user;
        return true;
    } catch (e) {
        App.currentUser = null;
        return false;
    }
};

App.requireAuth = async function () {
    var ok = await App.checkSession();
    if (!ok) {
        window.location.href = 'login.html';
        throw new Error('Non autenticato');
    }
};

App.logout = async function () {
    try { await App.api.post('/auth/logout'); } catch (e) { /* ignora */ }
    App.currentUser = null;
    window.location.href = 'login.html';
};

// ── Utility condivise ──────────────────────────────────────────
App.escapeHtml = function (text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// ── Init Navbar (DaisyUI - pagine autenticate) ─────────────────
App.initNavbar = function () {
    // Popola nome utente
    var nameEl = document.getElementById('navbar-user-name');
    if (nameEl && App.currentUser) {
        nameEl.textContent = App.currentUser.nome + ' ' + App.currentUser.cognome;
    }

    // Logout
    var logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            App.logout();
        });
    }

    // DaisyUI dropdown chiude al click su un link
    document.querySelectorAll('.dropdown-content a').forEach(function (link) {
        link.addEventListener('click', function () {
            if (document.activeElement) document.activeElement.blur();
        });
    });
};

// ── Init Theme (dark mode toggle) ──────────────────────────────
App.initTheme = function () {
    var html = document.documentElement;
    var toggleBtn = document.getElementById('btn-theme-toggle');

    if (!toggleBtn) return;

    function updateIcon(theme) {
        var icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    toggleBtn.addEventListener('click', function () {
        var current = html.getAttribute('data-theme') || 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('agenda-theme', next);
        updateIcon(next);
    });

    updateIcon(html.getAttribute('data-theme') || 'light');
};
