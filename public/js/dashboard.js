document.addEventListener('DOMContentLoaded', async function () {
    dayjs.locale('it');

    // ── Auth guard ─────────────────────────────────────────────
    try {
        await App.requireAuth();
    } catch (e) { return; }
    App.initNavbar();
    App.initTheme();
    document.getElementById('loading-overlay').style.display = 'none';

    // ── Saluto ────────────────────────────────────────────────
    var hour = new Date().getHours();
    var greetText = hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
    document.getElementById('greeting').textContent = greetText + ', ' + App.currentUser.nome + '!';
    document.getElementById('today-date').textContent = dayjs().format('dddd D MMMM YYYY');

    // ── Fetch dati ────────────────────────────────────────────
    var today = dayjs().format('YYYY-MM-DD');
    var weekEnd = dayjs().add(7, 'day').format('YYYY-MM-DD');

    try {
        var results = await Promise.all([
            App.api.get('/promemoria?da=' + today + '&a=' + weekEnd),
            App.api.get('/appuntamenti?da=' + today + '&a=' + weekEnd)
        ]);

        var promemoria = results[0].promemoria;
        var appuntamenti = results[1].appuntamenti;

        // Costruisci lista eventi flat
        var events = [];

        promemoria.forEach(function (p) {
            (p.occorrenze || []).forEach(function (dateStr) {
                events.push({
                    type: 'promemoria',
                    id: p.id,
                    descrizione: p.descrizione,
                    data: dateStr,
                    ora: p.ora ? p.ora.substring(0, 5) : null,
                    durata: p.durata_minuti
                });
            });
        });

        appuntamenti.forEach(function (a) {
            events.push({
                type: 'appuntamento',
                id: a.id,
                descrizione: a.descrizione,
                data: a.data,
                ora: a.ora ? a.ora.substring(0, 5) : null,
                durata: a.durata_minuti
            });
        });

        // Ordina per data + ora
        events.sort(function (a, b) {
            var cmp = a.data.localeCompare(b.data);
            if (cmp !== 0) return cmp;
            return (a.ora || '99:99').localeCompare(b.ora || '99:99');
        });

        // Render "Oggi"
        var todayEvents = events.filter(function (e) { return e.data === today; });
        renderEventList('today-events', todayEvents, 'Nessun evento per oggi');

        // Render "Prossimi 7 giorni" (escludendo oggi)
        var futureEvents = events.filter(function (e) { return e.data > today; });
        renderWeekEvents('week-events', futureEvents);

    } catch (err) {
        console.error('Errore caricamento dashboard:', err);
        document.getElementById('today-events').innerHTML =
            '<div class="alert alert-error"><i class="fas fa-exclamation-triangle mr-2"></i>Errore nel caricamento dei dati</div>';
        document.getElementById('week-events').innerHTML = '';
    }

    // ── Render funzioni ───────────────────────────────────────

    function renderEventCard(e) {
        var accent = e.type === 'promemoria' ? 'promemoria-accent' : 'appuntamento-accent';
        var icon = e.type === 'promemoria' ? 'fa-sticky-note' : 'fa-users';
        var badgeClass = e.type === 'promemoria' ? 'badge-info' : 'badge-success';
        var badgeText = e.type === 'promemoria' ? 'Prom.' : 'App.';
        var link = e.type === 'promemoria'
            ? 'promemoria.html?id=' + e.id
            : 'appuntamento.html?id=' + e.id;
        var timeStr = e.ora ? e.ora : 'Tutto il giorno';
        var duraStr = e.durata ? ' (' + e.durata + ' min)' : '';

        return '<a href="' + link + '" class="card bg-base-100 shadow-sm dashboard-event-card ' + accent + ' hover:shadow-md transition-shadow block">' +
            '<div class="card-body py-3 px-4">' +
                '<div class="flex items-center justify-between">' +
                    '<div class="flex items-center gap-3">' +
                        '<i class="fas ' + icon + ' text-base-content/40"></i>' +
                        '<div>' +
                            '<p class="font-medium">' + App.escapeHtml(e.descrizione) + '</p>' +
                            '<p class="text-sm text-base-content/60">' + timeStr + duraStr + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<span class="badge ' + badgeClass + ' badge-sm">' + badgeText + '</span>' +
                '</div>' +
            '</div>' +
        '</a>';
    }

    function renderEventList(containerId, events, emptyMsg) {
        var container = document.getElementById(containerId);
        if (events.length === 0) {
            container.innerHTML = '<div class="text-center py-6 text-base-content/50">' +
                '<i class="fas fa-calendar-check text-3xl mb-2"></i>' +
                '<p>' + emptyMsg + '</p>' +
            '</div>';
            return;
        }
        container.innerHTML = events.map(renderEventCard).join('');
    }

    function renderWeekEvents(containerId, events) {
        var container = document.getElementById(containerId);
        if (events.length === 0) {
            container.innerHTML = '<div class="text-center py-6 text-base-content/50">' +
                '<i class="fas fa-calendar-check text-3xl mb-2"></i>' +
                '<p>Nessun evento in programma</p>' +
            '</div>';
            return;
        }

        // Raggruppa per data
        var grouped = {};
        events.forEach(function (e) {
            if (!grouped[e.data]) grouped[e.data] = [];
            grouped[e.data].push(e);
        });

        var html = '';
        Object.keys(grouped).sort().forEach(function (date) {
            var dayLabel = dayjs(date).format('dddd D MMMM');
            html += '<div class="mb-4">';
            html += '<h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/50 mb-2">' + dayLabel + '</h3>';
            html += '<div class="space-y-2">';
            grouped[date].forEach(function (e) {
                html += renderEventCard(e);
            });
            html += '</div></div>';
        });
        container.innerHTML = html;
    }
});
