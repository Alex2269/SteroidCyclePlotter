// ============================================================================
// 🎨 PaletteManager.js — ЄДИНЕ ДЖЕРЕЛО ІСТИНИ для палітр
// 📦 Steroid Cycle Plotter — Централізоване управління палітрами
// 🗓️ Створено: 2026
// ============================================================================

// 📌 Версія цього модуля — ЗМІНЮЙ ТІЛЬКИ ТУТ
const PALETTE_MANAGER_VERSION = '1.0.0';

// 📦 Експорт версії для зовнішнього доступу
window.SteroidPlotter = window.SteroidPlotter || {};
window.SteroidPlotter.paletteManagerVersion = PALETTE_MANAGER_VERSION;

const PaletteManager = (() => {
    'use strict';

    // ========================================================================
    // 🎨 ПАЛІТРИ — ЄДИНЕ ДЖЕРЕЛО ІСТИНИ
    // ========================================================================
    const PALETTES = {
        palette1: {
            name: '🎨 Світла палітра',
            colors: [
                '#FF9500', '#FF6B35', '#FF8A80', '#FFB3BA',
                '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
                '#FF9FF3', '#F368E0', '#A55EEA', '#54A0FF',
                '#5F27CD', '#00D2D3', '#7BED9F', '#FA709A',
                '#141414', '#212F3D', '#2C3E50', '#34495E'
            ],
            styles: {
                backgroundColor: '#f0f0f0',
                axisColor: '#333333',
                gridColor: 'rgba(150, 150, 150, 0.35)',
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    titleColor: '#1a1a1a',
                    bodyColor: '#1a1a1a',
                    borderColor: 'rgba(150, 150, 150, 0.5)',
                    borderWidth: 2
                }
            }
        },
        palette2: {
            name: '🌑 Темна палітра',
            colors: [
                '#0055ff', '#2c5282', '#2b6cb0', '#805ad5',
                '#e94560', '#ee6a7f', '#f18f88', '#f5b7b1',
                '#00f5d4', '#00d4aa', '#0abde3', '#45a247',
                '#ff6b9d', '#c44569', '#f72585', '#d00000',
                '#7209b7', '#b5179e', '#4895ef', '#4cc9f0',
                '#f72585', '#f8961e', '#f15bb5', '#00d4aa'
            ],
            styles: {
                backgroundColor: '#e8e8e8',
                axisColor: '#2c3e50',
                gridColor: 'rgba(100, 120, 140, 0.35)',
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    titleColor: '#2c3e50',
                    bodyColor: '#2c3e50',
                    borderColor: 'rgba(100, 120, 140, 0.5)',
                    borderWidth: 2
                }
            }
        },
        palette3: {
            name: '🌈 Неонова палітра',
            colors: [
                '#00E5FF', '#00F5D4', '#17C948', '#C6FF00', '#FEE440',
                '#7C4DFF', '#FF2BD6', '#00B8D4', '#FF6B6B', '#4ECDC4',
                '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBF49',
                '#00B4D8', '#E71D36', '#2EC4B6', '#FF9F1C', '#A8E6CF'
            ],
            styles: {
                backgroundColor: '#2f2f2f',
                axisColor: '#e0e0e0',
                gridColor: 'rgba(255, 255, 255, 0.50)',
                tooltip: {
                    backgroundColor: 'rgba(40, 40, 40, 0.75)',
                    titleColor: '#ffffff',
                    bodyColor: '#e0e0e0',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    borderWidth: 2
                }
            }
        },
        palette4: {
            name: '🎭 Монохром',
            colors: [
                '#1a1a1a', '#333333', '#4d4d4d', '#666666',
                '#808080', '#999999', '#b3b3b3', '#cccccc',
                '#e6e6e6', '#ffffff', '#0d47a1', '#1976d2',
                '#2196f3', '#64b5f6', '#bbdefb', '#e3f2fd'
            ],
            styles: {
                backgroundColor: '#d0d0d0',
                axisColor: '#4a4a4a',
                gridColor: 'rgba(120, 120, 120, 0.35)',
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    titleColor: '#4a4a4a',
                    bodyColor: '#4a4a4a',
                    borderColor: 'rgba(120, 120, 120, 0.5)',
                    borderWidth: 2
                }
            }
        },
        palette5: {
            name: '🍃 Природні',
            colors: [
                '#2E7D32', '#388E3C', '#43A047', '#4CAF50',
                '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9',
                '#1B5E20', '#2E7D32', '#388E3C', '#43A047',
                '#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8'
            ],
            styles: {
                backgroundColor: '#e0e0e0',
                axisColor: '#2d5016',
                gridColor: 'rgba(100, 130, 80, 0.35)',
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    titleColor: '#2d5016',
                    bodyColor: '#2d5016',
                    borderColor: 'rgba(100, 130, 80, 0.5)',
                    borderWidth: 2
                }
            }
        }
    };

    // ========================================================================
    // 🔧 ДОПОМІЖНІ ФУНКЦІЇ
    // ========================================================================

    /**
     * Автоматично визначає колір обводки на основі яскравості фону
     * @param {string} backgroundColor - Hex колір фону
     * @returns {string} RGBA колір обводки
     */
    function getOutlineColor(backgroundColor) {
        if (!backgroundColor) return 'rgba(0, 0, 0, 0.22)';
        
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Формула яскравості (ITU-R BT.601)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // 🎯 Порог 128: вище = світлий фон, нижче = темний
        return brightness > 128 
            ? 'rgba(0, 0, 0, 0.35)'      // Темна серцевина для світлого фону
            : 'rgba(255, 255, 255, 0.75)'; // Світла серцевина для темного фону
    }

    /**
     * Контрастний колір тексту для заданого hex-кольору
     * @param {string} hexColor - Hex колір
     * @returns {string} Контрастний колір (#2c3e50 або #ffffff)
     */
    function getContrastColor(hexColor) {
        if (!hexColor) return '#2c3e50';
        
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#2c3e50' : '#ffffff';
    }

    // ========================================================================
    // 🎯 ПУБЛІЧНИЙ API
    // ========================================================================

    return {
        /**
         * Отримати кольори для ліній
         * @param {string} paletteKey - Ключ палітри
         * @returns {Array} Масив кольорів
         */
        getColors(paletteKey) {
            const palette = PALETTES[paletteKey] || PALETTES.palette1;
            return [...palette.colors];
        },

        /**
         * Отримати повні стилі (з автоматичним outlineColor)
         * @param {string} paletteKey - Ключ палітри
         * @returns {Object} Об'єкт стилів
         */
        getStyles(paletteKey) {
            const palette = PALETTES[paletteKey] || PALETTES.palette1;
            return {
                ...palette.styles,
                outlineColor: getOutlineColor(palette.styles.backgroundColor)
            };
        },

        /**
         * Отримати назву палітри
         * @param {string} paletteKey - Ключ палітри
         * @returns {string} Назва палітри
         */
        getName(paletteKey) {
            const palette = PALETTES[paletteKey] || PALETTES.palette1;
            return palette.name;
        },

        /**
         * Отримати список всіх палітр
         * @returns {Array} Масив ключів палітр
         */
        list() {
            return Object.keys(PALETTES);
        },

        /**
         * Отримати всі палітри
         * @returns {Object} Об'єкт з усіма палітрами
         */
        getAll() {
            return { ...PALETTES };
        },

        /**
         * Додати нову палітру
         * @param {string} key - Ключ палітри
         * @param {Object} palette - Об'єкт палітри
         */
        add(key, palette) {
            if (!key || !palette || !palette.colors || !palette.styles) {
                console.error('❌ Invalid palette: key, colors, and styles required');
                return false;
            }
            PALETTES[key] = palette;
            console.log(`🎨 Palette "${key}" added`);
            return true;
        },

        /**
         * Перевірити, чи існує палітра
         * @param {string} key - Ключ палітри
         * @returns {boolean}
         */
        exists(key) {
            return key in PALETTES;
        },

        /**
         * Отримати outlineColor для палітри
         * @param {string} paletteKey - Ключ палітри
         * @returns {string} RGBA колір обводки
         */
        getOutlineColor(paletteKey) {
            const styles = this.getStyles(paletteKey);
            return styles.outlineColor;
        },

        /**
         * Отримати contrastColor для палітри
         * @param {string} paletteKey - Ключ палітри
         * @returns {string} Hex колір тексту
         */
        getContrastColor(paletteKey) {
            const styles = this.getStyles(paletteKey);
            return getContrastColor(styles.backgroundColor);
        },

        /**
         * Застосувати палітру до chart (без перестворення)
         * @param {Chart} chart - Chart.js інстанс
         * @param {string} paletteKey - Ключ палітри
         * @param {Array} series - Масив серій даних
         */
        applyToChart(chart, paletteKey, series) {
            if (!chart || !series) return;
            if (typeof createChartDatasets !== 'function') {
                console.error('❌ PaletteManager.applyToChart: createChartDatasets() ще не завантажена (script.js)');
                return;
            }
            const styles = this.getStyles(paletteKey);
            const colors = this.getColors(paletteKey);
            // Оновлюємо datasets
            // 🎯 ВИКОРИСТОВУЄМО СПІЛЬНУ ФУНКЦІЮ
            chart.data.datasets = createChartDatasets(series, styles);

            // Оновлюємо осі, сітку, tooltip
            const opts = chart.options;
            opts.scales.x.ticks.color = getContrastColor(styles.backgroundColor);
            opts.scales.x.grid.color = styles.gridColor;
            opts.scales.y.ticks.color = getContrastColor(styles.backgroundColor);
            opts.scales.y.grid.color = styles.gridColor;
            opts.plugins.tooltip.backgroundColor = styles.tooltip.backgroundColor;
            opts.plugins.tooltip.titleColor = styles.tooltip.titleColor;
            opts.plugins.tooltip.bodyColor = styles.tooltip.bodyColor;
            opts.plugins.tooltip.borderColor = styles.tooltip.borderColor;
            opts.plugins.legend.labels.fontColor = getContrastColor(styles.backgroundColor);

            // Оновлюємо фон контейнера
            const chartContainer = document.getElementById('chart-container');
            if (chartContainer) {
                chartContainer.style.transition = 'background-color 0.5s ease';
                chartContainer.style.backgroundColor = styles.backgroundColor;
            }

            // 🆕 Синхронізуємо тултипи з палітрою
            this.applyTooltipTheme(paletteKey);

            // Запускаємо анімацію
            chart.update({ duration: 600, easing: 'easeInOutCubic' });
        },

        /**
         * 🎨 Застосувати тему тултипів до CSS-змінних (синхронізація з палітрою)
         * Оновлює --tooltip-bg, --tooltip-text, --tooltip-border, --tooltip-shadow
         * @param {string} paletteKey - Ключ палітри
         */
        applyTooltipTheme(paletteKey) {
            const styles = this.getStyles(paletteKey);
            const bg = styles.backgroundColor;
            const textColor = getContrastColor(bg);

            // 🔧 Парсимо hex → RGB
            const hex = bg.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            const root = document.documentElement;
            // 🎯 Фон тултипа — напівпрозорий варіант backgroundColor графіка
            root.style.setProperty('--tooltip-bg', `rgba(${r}, ${g}, ${b}, 0.88)`);
            root.style.setProperty('--tooltip-text', textColor);
            root.style.setProperty('--tooltip-border', `rgba(${r}, ${g}, ${b}, 0.35)`);
            root.style.setProperty('--tooltip-shadow', `rgba(${r}, ${g}, ${b}, 0.45)`);

            console.log(`🎨 Tooltip theme applied: bg=${bg}, text=${textColor}`);
        },

        // Експорт допоміжних функцій
        getOutlineColorFromHex: getOutlineColor,
        getContrastColorFromHex: getContrastColor
    };
})();

// ============================================================================
// 🚀 ЕКСПОРТ У ГЛОБАЛЬНИЙ ОБ'ЄКТ
// ============================================================================
window.PaletteManager = PaletteManager;

// ============================================================================
// 🏁 ІНІЦІАЛІЗАЦІЯ
// ============================================================================
(function init() {
    console.log(`🎨 PaletteManager.js v${PALETTE_MANAGER_VERSION} loaded! 🎨 Палітри: ${PaletteManager.list().length}`);
})();

// ============================================================================
// 🏁 EOF PaletteManager.js — READY FOR DEPLOYMENT
// ============================================================================
