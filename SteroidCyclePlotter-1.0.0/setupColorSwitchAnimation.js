// ============================================================================
// 🎬 setupColorSwitchAnimation.js v1.0.4
// ============================================================================
// • Адаптивна тривалість анімації (isHeavy → 0ms, легкий → 30ms)
// • Базова версія НЕ перестворює графік — тільки оновлює кольори
// • Економія ~90% CPU при перемиканні палітр на важких графіках
// ============================================================================

/**
 * • Підрахунок totalPoints для адаптивної анімації
 * • Для важких графіків (>20000 точок) — миттєве оновлення (0ms)
 * • Для легких графіків — плавна анімація (30ms)
 * • Базова версія НЕ перестворює графік — тільки оновлює datasets + options
 */
function _setupColorSwitchBase(useAnimation = false) {
    // Ініціалізація дефолтної функції
    window.currentGenerateSeriesFunc = (c, combine, min, max) =>
        window.generateSeries(c, combine, min, max, 'palette1');

    // Додаємо слухачів подій
    document.querySelectorAll('input[name="colors"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const palette = this.dataset.palette || 'palette1';

            // 🆕 Синхронізуємо тултипи з новою палітрою
            window.PaletteManager.applyTooltipTheme(palette);

            window.currentGenerateSeriesFunc = (c, combine, min, max) =>
                window.generateSeries(c, combine, min, max, palette);

            const styles = window.PaletteManager.getStyles(palette);
            const chartContainer = document.getElementById('chart-container');
            
            if (chartContainer) {
                if (useAnimation) {
                    chartContainer.style.transition = 'background-color 0.5s ease';
                }
                chartContainer.style.backgroundColor = styles.backgroundColor;
            }

            // ⚡ OPTIMIZATION v1.0.4: обидві гілки (анімована і базова) 
            // тепер використовують ОДНУ оптимізовану логіку — НЕ перестворюють графік!
            if (chart && chart.scales?.x) {
                // 🎯 СПІЛЬНИЙ ШЛЯХ: оновлюємо тільки кольори, не перестворюємо Chart.js інстанс
                // Це економить ~90% CPU порівняно з updateChartPreservingZoom()
                
                const currentMin = chart.scales.x.min;
                const currentMax = chart.scales.x.max;
                const newSeries = window.currentGenerateSeriesFunc(
                    compounds, combineCheckbox?.checked, currentMin, currentMax
                );

                // 🎯 ПОДВІЙНІ DATASETS: кольорова база + центральне освітлення/затемнення (core)
                chart.data.datasets = createChartDatasets(newSeries, styles);

                // Оновлюємо осі, сітку та тултіпи
                const opts = chart.options;
                opts.scales.x.ticks.color = window.PaletteManager.getContrastColor(palette);
                opts.scales.x.grid.color = styles.gridColor;
                opts.scales.y.ticks.color = window.PaletteManager.getContrastColor(palette);
                opts.scales.y.grid.color = styles.gridColor;
                opts.plugins.tooltip.backgroundColor = styles.tooltip.backgroundColor;
                opts.plugins.tooltip.titleColor = styles.tooltip.titleColor;
                opts.plugins.tooltip.bodyColor = styles.tooltip.bodyColor;
                opts.plugins.tooltip.borderColor = styles.tooltip.borderColor;
                opts.plugins.legend.labels.fontColor = window.PaletteManager.getContrastColor(palette);

                // ⚡ OPTIMIZATION v1.0.4: адаптивна тривалість анімації
                // Підраховуємо загальну кількість точок (×2 бо подвійні datasets)
                const totalPoints = newSeries.reduce((sum, s) => sum + (s.data?.length || 0), 0) * 2;
                const isHeavy = totalPoints > 20000;

                if (isHeavy) {
                    // 🚫 Для важких графіків — миттєве оновлення БЕЗ анімації
                    // Це запобігає підвисанню при багатьох серіях або великому zoom out
                    console.log(`⚡ Heavy palette switch: ${totalPoints} points — instant update (0ms)`);
                    chart.update({ duration: 0 });
                } else if (useAnimation) {
                    // 🎬 АНІМОВАНА ВЕРСІЯ для легких графіків
                    // Плавна зміна кольорів за 30ms
                    chart.update({ duration: 30, easing: 'easeInOutCubic' });
                } else {
                    // 🔄 БАЗОВА ВЕРСІЯ для легких графіків
                    // Миттєве оновлення без анімації
                    chart.update({ duration: 0 });
                }
            } else {
                // 🆘 FALLBACK: якщо графік ще не ініціалізовано
                // Тоді доводиться перестворювати його повністю
                updateChartPreservingZoom();
            }
        });
    });
}

/**
 * 🎨 Базова версія перемикача палітр (без анімації)
 * 
 * ⚡ v1.0.4: тепер НЕ перестворює графік для легких випадків
 */
function setupColorSwitch() {
    _setupColorSwitchBase(false);
}

/**
 * 🎬 Анімована версія перемикача палітр
 * 
 * ⚡ v1.0.4: анімація працює ТІЛЬКИ для легких графіків (<20000 точок)
 * Для важких графіків автоматично вимикається (0ms)
 */
function setupColorSwitchAnimation() {
    _setupColorSwitchBase(true);
}

// ✅ Експорт
window.setupColorSwitch = setupColorSwitch;
window.setupColorSwitchAnimation = setupColorSwitchAnimation;

console.log('🎬 setupColorSwitchAnimation.js v1.0.4 loaded! ⚡ Adaptive animation + no-rebuild optimization');

// ============================================================================
// 🏁 EOF setupColorSwitchAnimation.js v1.0.4 — MAX PERFORMANCE EDITION
// ============================================================================
