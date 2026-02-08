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
    var charts = {};
    var currentYear = dayjs().year();

    // Popola selettore anno (da 2024 all'anno corrente +1)
    var selectAnno = document.getElementById('select-anno');
    for (var y = currentYear + 1; y >= 2024; y--) {
        var opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        selectAnno.appendChild(opt);
    }

    document.getElementById('btn-carica').addEventListener('click', function () {
        loadStats(parseInt(selectAnno.value));
    });

    // Carica subito
    loadStats(currentYear);

    // ── Re-render grafici al cambio tema ──────────────────────
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.attributeName === 'data-theme') {
                loadStats(parseInt(selectAnno.value));
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });

    // ================================================================
    // FUNZIONI
    // ================================================================

    function getChartColors() {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            promemoria: isDark ? '#60a5fa' : '#3b82f6',
            appuntamento: isDark ? '#4ade80' : '#22c55e',
            textColor: isDark ? '#a6adba' : '#1f2937',
            gridColor: isDark ? 'rgba(166,173,186,0.15)' : 'rgba(0,0,0,0.1)'
        };
    }

    async function loadStats(anno) {
        var da = anno + '-01-01';
        var a = anno + '-12-31';
        var btn = document.getElementById('btn-carica');
        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Caricamento...';

        try {
            var results = await Promise.all([
                App.api.get('/promemoria?da=' + da + '&a=' + a),
                App.api.get('/appuntamenti?da=' + da + '&a=' + a)
            ]);

            var promemoria = results[0].promemoria;
            var appuntamenti = results[1].appuntamenti;

            // Conteggi CORRETTI
            var uniquePromCount = promemoria.length;
            var totalPromOccorrenze = 0;
            var promPerMonth = new Array(12).fill(0);

            promemoria.forEach(function (p) {
                (p.occorrenze || []).forEach(function (dateStr) {
                    totalPromOccorrenze++;
                    var month = dayjs(dateStr).month(); // 0-11
                    promPerMonth[month]++;
                });
            });

            var totalApp = appuntamenti.length;
            var appPerMonth = new Array(12).fill(0);

            appuntamenti.forEach(function (a) {
                var month = dayjs(a.data).month();
                appPerMonth[month]++;
            });

            // Aggiorna riepilogo - 4 box
            document.getElementById('stat-prom-unique').textContent = uniquePromCount;
            document.getElementById('stat-prom-occurrences').textContent = totalPromOccorrenze;
            document.getElementById('stat-app-count').textContent = totalApp;
            document.getElementById('stat-total-count').textContent = uniquePromCount + totalApp;

            // Renderizza grafici
            renderDistribuzione(totalPromOccorrenze, totalApp);
            renderMensile(promPerMonth, appPerMonth);

        } catch (err) {
            Swal.fire('Errore', 'Impossibile caricare le statistiche: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    function renderDistribuzione(promCount, appCount) {
        if (charts.distribuzione) charts.distribuzione.destroy();

        var colors = getChartColors();
        var ctx = document.getElementById('chart-distribuzione').getContext('2d');
        charts.distribuzione = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Promemoria', 'Appuntamenti'],
                datasets: [{
                    data: [promCount, appCount],
                    backgroundColor: [colors.promemoria, colors.appuntamento],
                    borderWidth: 2,
                    borderColor: 'transparent'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: colors.textColor }
                    }
                }
            }
        });
    }

    function renderMensile(promPerMonth, appPerMonth) {
        if (charts.mensile) charts.mensile.destroy();

        var colors = getChartColors();
        var monthLabels = [];
        for (var i = 0; i < 12; i++) {
            monthLabels.push(dayjs().month(i).format('MMM'));
        }

        var ctx = document.getElementById('chart-mensile').getContext('2d');
        charts.mensile = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [
                    {
                        label: 'Promemoria',
                        data: promPerMonth,
                        backgroundColor: colors.promemoria
                    },
                    {
                        label: 'Appuntamenti',
                        data: appPerMonth,
                        backgroundColor: colors.appuntamento
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: false,
                        ticks: { color: colors.textColor },
                        grid: { color: colors.gridColor }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: colors.textColor },
                        grid: { color: colors.gridColor }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: colors.textColor }
                    }
                }
            }
        });
    }
});
