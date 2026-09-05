// ============================================================================
// script.js — Steroid Cycle Plotter
// ============================================================================

'use strict';

// 📌 Версія додатку
const APP_VERSION = '1.0.0';

// 📦 Експорт версії для зовнішнього доступу
window.SteroidPlotter = window.SteroidPlotter || {};
window.SteroidPlotter.appVersion = APP_VERSION;

// ============================================================================
// 🔢 КОНСТАНТИ
// ============================================================================
const HCG_IU_TO_MG = 0.00033;            // Конвертація HCG: IU → mg
const MS_PER_DAY = 86400000;             // Мілісекунд в добі
const CONVERSION_NG_DL_TO_NMOL_L = 28.8; // ng/dL → nmol/L (для тестостерону)

// 🔗 Глобальний конфіг (з estersConfig.js)
const estersConfig = typeof window.estersConfig !== 'undefined'
    ? window.estersConfig
    : {};

if (typeof window.estersConfig === 'undefined') {
    console.error('❌ estersConfig.js не завантажено!');
}

// ============================================================================
// 🔤 ФОРМАТУВАННЯ НАЗВ (Допоміжна функція)
// ============================================================================
function formatCompoundName(key) {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

// ============================================================================
// 📋 ПЛОСКИЙ СПИСОК ДЛЯ <select> (генерується динамічно з COMPOUND_METADATA)
// ============================================================================
const COMPOUNDS = (() => {
    const result = [];
    // Безпечний доступ до метаданих (fallback на порожній об'єкт)
    const metadata = window.COMPOUND_METADATA || { categories: {}, displayNames: {} };

    for (const [groupLabel, values] of Object.entries(metadata.categories)) {
        result.push({
            value: 'SEPARATOR',
            label: `══ ${groupLabel.trim()} ══\n`,
                    disabled: true
        });
        values.forEach(name => {
            result.push({
                value: name,
                // Пріоритет: спеціальна назва з метаданих, інакше авто-форматування
                label: metadata.displayNames[name] || formatCompoundName(name)
            });
        });
    }
    result.push({ value: 'SEPARATOR', label: '══💉 CUSTOM ══', disabled: true });
    result.push({ value: 'Custom', label: 'Custom (enter half-life)' });
    return result;
})();

// ============================================================================
// 📦 ІНІЦІАЛІЗАЦІЯ SELECT ПРИ ЗАВАНТАЖЕННІ
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    const select = document.getElementById('compound-select');
    if (!select) return;

    // 1. Очищаємо список і додаємо дефолтну підказку
    select.innerHTML = '<option value="" disabled selected>Оберіть сполуку</option>';

    let currentGroup = null;

    // 2. Проходимо по нашому новому динамічному масиву COMPOUNDS
    COMPOUNDS.forEach(item => {
        if (item.value === 'SEPARATOR') {
            // Створюємо нову групу (optgroup) для категорії
            currentGroup = document.createElement('optgroup');
            // Прибираємо символи "═" з назви групи для акуратного вигляду
            currentGroup.label = item.label.replace(/═/g, '').trim();
            select.appendChild(currentGroup);
        } else {
            // Створюємо опцію всередині поточної групи
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            if (item.disabled) option.disabled = true;

            if (currentGroup) {
                currentGroup.appendChild(option);
            } else {
                select.appendChild(option); // Fallback на випадок, якщо групи немає
            }
        }
    });

    console.log('✅ Compound select initialized dynamically from COMPOUNDS array');
});

// ============================================================================
// 🔧 ДОПОМІЖНІ ФУНКЦІЇ
// ============================================================================

// Місяці в родовому відмінку (як у датах: "5 травня")
const MONTHS_UA_GENITIVE = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
];

// Скорочені форми (без крапок, для компактного формату)
const MONTHS_UA_SHORT = [
    'січ', 'лют', 'бер', 'кві', 'тра', 'чер',
    'лип', 'сер', 'вер', 'жов', 'лис', 'гру'
];

/**
Форматує дату з урахуванням локальних конвенцій
• UA: [Пн] 05-травня-2026 (день-місяць-рік, родовий відмінок)
• EN: [Mon] May-05-2026 (місяць-день-рік)
*/
function formatDateLocalized(date, locale, monthStyle = 'long', includeWeekday = false) {
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    let weekday = '';
    if (includeWeekday) {
        weekday = date.toLocaleDateString(locale, { weekday: 'short' }) + ', ';
    }

    let month;
    if (locale.startsWith('uk')) {
        // ✅ Для української використовуємо кастомні масиви (гарантований відмінок)
        const months = monthStyle === 'short' ? MONTHS_UA_SHORT : MONTHS_UA_GENITIVE;
        month = months[date.getMonth()];
    } else {
        // ✅ Для інших мов — стандартна локалізація браузера
        month = date.toLocaleDateString(locale, { month: monthStyle });
    }

    // 🇺🇦 UA: день-місяць-рік | 🇬🇧 EN: місяць-день-рік
    if (locale.startsWith('uk')) {
        return `${weekday}${day}-${month}-${year}`;
    } else {
        return `${weekday}${month}-${day}-${year}`;
    }
}

/*
function formatDateLocalized(date, locale, monthStyle = 'long', includeWeekday = false) {
    const options = {
        day: '2-digit',
        month: monthStyle,
        year: '2-digit'
    };
    if (includeWeekday) options.weekday = 'short';
    // Браузер сам поставить правильний порядок і роздільники
    return date.toLocaleDateString(locale, options);
} */

/**
Санітизація рядка для захисту від XSS
@param {string} str - Вхідний рядок
@returns {string} Очищений рядок
*/
function sanitizeInput(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str.replace(/[<>]/g, '').trim();
}

/**
Валідація імпортованих даних циклу
@param {Object} data - Дані з JSON
@throws {Error} Якщо невалідні
*/
function validateImportData(data) {
    if (!data || typeof data !== 'object') throw new Error('Invalid data structure');
    if (data.compounds !== undefined && !Array.isArray(data.compounds)) {
        throw new Error('compounds must be an array');
    }
    if (data.compounds?.length > 0) {
        data.compounds.forEach((c, idx) => {
            if (!c.name || typeof c.name !== 'string') throw new Error(`Compound #${idx}: invalid name`);
            if (typeof c.dose !== 'number' || c.dose < 0) throw new Error(`Compound #${idx}: invalid dose`);
            const isKnown = estersConfig?.[c.name] && c.name !== 'Custom';
            if (!isKnown && (typeof c.halfLife !== 'number' || c.halfLife <= 0)) {
                throw new Error(`Compound #${idx} "${c.name}": invalid or missing halfLife`);
            }
            if (typeof c.interval !== 'number' || c.interval < 1) throw new Error(`Compound #${idx}: invalid interval`);
            if (typeof c.duration !== 'number' || c.duration < 1) throw new Error(`Compound #${idx}: invalid duration`);
            if (typeof c.startOffset !== 'number' || c.startOffset < 0) throw new Error(`Compound #${idx}: invalid startOffset`);
        });
    }
}

/**
 * Знаходить label для чекбокса (батьківський або через атрибут for)
 * @param {string} id - ID чекбокса
 * @returns {HTMLElement|null}
 */
function findCheckboxLabel(id) {
    const input = document.getElementById(id);
    if (!input) return null;
    return input.closest('label') || document.querySelector(`label[for="${id}"]`);
}

// ============================================================================
// 🌐 МОВНИЙ ПЕРЕКЛАДАЧ
// ============================================================================
const TRANSLATIONS = {
    ua: {
        'cycle-start-date-label': 'Дата початку циклу',
        'compound-label': 'Сполука',
        'compound-select-placeholder': 'Оберіть сполуку',
        'dose-label': 'Доза (мг або МО)',
        'dose-placeholder': 'напр. 100',
        'half-life-label': 'Період напіввиведення (днів)',
        'half-life-placeholder': 'напр. 7',
        'interval-label': 'Інтервал прийому (днів)',
        'duration-label': 'Тривалість курсу (днів)',
        'start-offset-label': 'Зсув старту (днів)',
        'time-shift-label': '⏰ Глобальний зсув часу (год)',
        'time-offset-label': '⏱️ Зсув часу сполуки (год)',
        'group-id-label': 'ID Групи:',
        'submit-btn': 'Додати сполуку',
        'submit-btn-edit': 'Застосувати',
        'header-compound': 'Сполука',
        'header-dose': 'Доза',
        'header-interval': 'Інтервал',
        'header-duration': 'Тривалість',
        'header-start-offset': 'Зсув старту',
        'header-half-life': 'Період напівв.',
        'header-time-offset': 'Зсув часу(год)',
        'header-group-id': 'Група',
        'btn-edit': 'Редагувати',
        'btn-apply': 'Застосувати',
        'btn-remove': 'Видалити',
        'combine-checkbox': '🟠 Об\'єднати стероїди',
        'toggle-list': 'Показати список',
        'unit-switch': 'ng/dL ↔ nmol/L',
        'import-title': 'Імпортувати цикл (JSON)',
        'export-title': 'Експортувати цикл (JSON)',
        'export-schedule-title': 'Експортувати розклад (TXT)',
        'update-chart-title': 'Оновити графік',
        'reset-zoom-title': 'Скинути масштаб та вигляд',
        'tooltip-compound': 'Назва стероїдного препарату',
        'tooltip-dose': 'HCG: МО (125,250,500), інші: мг (250)',
        'tooltip-half-life': 'Період напіввиведення в днях',
        'tooltip-interval': 'Інтервал дозування в днях',
        'tooltip-duration': 'Тривалість сполуки в днях',
        'tooltip-start': 'Зсув від початку циклу в днях',
        'tooltip-shift': 'Зсув графіку в годинах',
        'tooltip-offset': 'Зсув сполуки в годинах',
        'tooltip-group': 'Група для графіку (-1=окремо, 0=за замовчуванням, 1+=разом)',
        'palette1': '🎨 Світла палітра',
        'palette2': '🌑 Темна палітра',
        'palette3': '🌈 Веселка',
        'palette4': '🎭 Монохром',
        'palette5': '🍃 Природні',
        'msg-select-date': 'Виберіть дату циклу для стероїдів!',
        'msg-import-success': '✅ Дані успішно імпортовані!',
        'msg-import-error': '❌ Неправильний формат файлу!',
        'msg-read-error': '❌ Не вдалося прочитати файл!',
        'msg-add-compounds-first': '❌ Спочатку додайте сполуки!',
        'schedule-title': 'РОЗКЛАД ЦИКЛУ',
        'schedule-generated': 'Згенеровано:',
        'schedule-cycle-start': 'Початок циклу:',
        'schedule-end': 'Кінець розкладу.'
    },
    en: {
        'cycle-start-date-label': 'Cycle Start Date',
        'compound-label': 'Compound',
        'compound-select-placeholder': 'Select compound',
        'dose-label': 'Dose (mg or IU)',
        'dose-placeholder': 'e.g. 100',
        'half-life-label': 'Half-life (days)',
        'half-life-placeholder': 'e.g. 7',
        'interval-label': 'Dosing interval (days)',
        'duration-label': 'Cycle duration (days)',
        'start-offset-label': 'Start offset (days)',
        'time-shift-label': '⏰ Global time shift (hours)',
        'time-offset-label': '⏱️ Compound time offset (hours)',
        'group-id-label': 'Group ID:',
        'submit-btn': 'Add Compound',
        'submit-btn-edit': 'Apply',
        'header-compound': 'Compound',
        'header-dose': 'Dose',
        'header-interval': 'Interval',
        'header-duration': 'Duration',
        'header-start-offset': 'Start Offset',
        'header-half-life': 'Half-life',
        'header-time-offset': 'Time Offset(h)',
        'header-group-id': 'Group',
        'btn-edit': 'Edit',
        'btn-apply': 'Apply',
        'btn-remove': 'Remove',
        'combine-checkbox': '🟠 Combine steroids',
        'toggle-list': 'Show list',
        'unit-switch': 'ng/dL ↔ nmol/L',
        'import-title': 'Import cycle (JSON)',
        'export-title': 'Export cycle (JSON)',
        'export-schedule-title': 'Export schedule (TXT)',
        'update-chart-title': 'Update chart',
        'reset-zoom-title': 'Reset zoom and view',
        'tooltip-compound': 'Steroid compound name',
        'tooltip-dose': 'HCG: IU (125,250,500), others: mg (250)',
        'tooltip-half-life': 'Half-life in days',
        'tooltip-interval': 'Dosing interval in days',
        'tooltip-duration': 'Compound duration in days',
        'tooltip-start': 'Offset from cycle start in days',
        'tooltip-shift': 'Chart shift in hours',
        'tooltip-offset': 'Compound offset in hours',
        'tooltip-group': 'Graph group (-1=separate, 0=default, 1+=together)',
        'palette1': '🎨 Light palette (pastel)',
        'palette2': '🌑 Dark palette (neon)',
        'palette3': '🌈 Rainbow (NEW!)',
        'palette4': '🎭 Monochrome (BONUS!)',
        'palette5': '🍃 Natural/Earth (BONUS!)',
        'msg-select-date': 'Select cycle start date for steroids!',
        'msg-import-success': '✅ Data imported successfully!',
        'msg-import-error': '❌ Invalid file format!',
        'msg-read-error': '❌ Failed to read file!',
        'msg-add-compounds-first': '❌ Add compounds first!',
        'schedule-title': 'CYCLE SCHEDULE',
        'schedule-generated': 'Generated:',
        'schedule-cycle-start': 'Cycle Start:',
        'schedule-end': 'End of Schedule.'
    }
};

/**
Перекладає весь інтерфейс на обрану мову
@param {string} lang - Код мови: 'ua' або 'en'
*/
function translateUI(lang = currentLanguage) {
    const t = TRANSLATIONS[lang];
    if (!t) {
        console.warn(`⚠️ Переклад для мови "${lang}" не знайдено`);
        return;
    }

    const dateLabel = document.querySelector('#cycle-date-container label');
    if (dateLabel) dateLabel.textContent = t['cycle-start-date-label'];

    const formFields = {
        'compound-select': { label: 'compound-label', placeholder: 'compound-select-placeholder' },
        'dose-input': { label: 'dose-label', placeholder: 'dose-placeholder' },
        'half-life-input': { label: 'half-life-label', placeholder: 'half-life-placeholder' },
        'interval-input': { label: 'interval-label' },
        'duration-input': { label: 'duration-label' },
        'start-offset-input': { label: 'start-offset-label' },
        'time-shift-input': { label: 'time-shift-label' },
        'time-offset-input': { label: 'time-offset-label' },
        'group-id-input': { label: 'group-id-label' }
    };

    for (const [id, cfg] of Object.entries(formFields)) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (cfg.label) {
            const lbl = document.querySelector(`label[for="${id}"]`);
            if (lbl) lbl.textContent = t[cfg.label];
        }
        if (cfg.placeholder && el.placeholder !== undefined) {
            el.placeholder = t[cfg.placeholder];
        }
    }

    // Оновлюємо текст дефолтного <option> у select
    const selectEl = document.getElementById('compound-select');
    if (selectEl) {
        const defaultOption = selectEl.querySelector('option[value=""]');
        if (defaultOption) {
            defaultOption.textContent = t['compound-select-placeholder'];
        }
    }

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.textContent = (editingIndex >= 0) ? t['submit-btn-edit'] : t['submit-btn'];
    }

    const chkMap = {
        'combine-checkbox': 'combine-checkbox',
        'toggle-compound-list': 'toggle-list',
        'unit-switch': 'unit-switch'
    };

    for (const [id, key] of Object.entries(chkMap)) {
        const lbl = findCheckboxLabel(id);
        const span = lbl ? lbl.querySelector('span[data-i18n]') : null;
        if (span) span.textContent = t[key];
    }

    const btnTitles = {
        'import-button': 'import-title',
        'export-button': 'export-title',
        'export-schedule-button': 'export-schedule-title',
        'update-chart-button': 'update-chart-title',
        'reset-zoom-button': 'reset-zoom-title'
    };
    for (const [id, key] of Object.entries(btnTitles)) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.setAttribute('data-tooltip', sanitizeInput(t[key]));
            btn.removeAttribute('data-translate-ignore');
        }
    }

    const paletteKeys = {
        'use-colors-0': 'palette1',
        'use-colors-1': 'palette2',
        'use-colors-2': 'palette3',
        'use-colors-3': 'palette4',
        'use-colors-4': 'palette5'
    };
    for (const [id, key] of Object.entries(paletteKeys)) {
        const radio = document.getElementById(id);
        if (radio?.parentElement) {
            const tooltip = sanitizeInput(t[key]);
            radio.parentElement.setAttribute('data-tooltip', tooltip);
        }
    }

    window.labelTooltips = {
        'compound': sanitizeInput(t['tooltip-compound']),
        'dose': sanitizeInput(t['tooltip-dose']),
        'half-life': sanitizeInput(t['tooltip-half-life']),
        'interval': sanitizeInput(t['tooltip-interval']),
        'duration': sanitizeInput(t['tooltip-duration']),
        'start': sanitizeInput(t['tooltip-start']),
        'shift': sanitizeInput(t['tooltip-shift']),
        'offset': sanitizeInput(t['tooltip-offset']),
        'toggle-compound-list': 'toggle-list',
        'group': sanitizeInput(t['tooltip-group'])
    };

    setTimeout(() => {
        if (typeof refreshFormTooltips === 'function') refreshFormTooltips();
        if (typeof initCheckboxTooltips === 'function') initCheckboxTooltips();
    }, 100);

    if (typeof renderCompoundList === 'function' && compounds?.length > 0) {
        renderCompoundList();
    }

    updateLanguageToggleButton(lang);
    localStorage.setItem('steroidLanguage', lang);
    console.log(`🌐 Language: ${lang.toUpperCase()}`);
}

/**
Ініціалізує перемикач мови
*/
function initLanguageToggle() {
    const langToggle = document.getElementById('lang-toggle');
    if (!langToggle) {
        console.warn('⚠️ Елемент #lang-toggle не знайдено');
        return;
    }
    if (langToggle.dataset.langListenerAdded === 'true') return;

    langToggle.addEventListener('click', () => {
        currentLanguage = (currentLanguage === 'ua') ? 'en' : 'ua';
        translateUI(currentLanguage);
    });
    langToggle.dataset.langListenerAdded = 'true';
    translateUI(currentLanguage);
    console.log('✅ Language toggle initialized');
}

/**
Оновлює data-tooltip атрибути для лейблів форми
*/
function refreshFormTooltips() {
    const labels = document.querySelectorAll('form#compound-form label[for]');
    const idMap = {
        'compound-select': 'compound',
        'dose-input': 'dose',
        'half-life-input': 'half-life',
        'interval-input': 'interval',
        'duration-input': 'duration',
        'start-offset-input': 'start',
        'time-shift-input': 'shift',
        'time-offset-input': 'offset',
        'group-id-input': 'group'
    };
    labels.forEach(lbl => {
        const key = idMap[lbl.getAttribute('for')];
        if (key && window.labelTooltips?.[key]) {
            lbl.dataset.tooltip = window.labelTooltips[key];
        }
    });
}

/**
Оновлює текст кнопки перемикання мови
*/
function updateLanguageToggleButton(lang) {
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.textContent = (lang === 'ua') ? '🇺🇦 UA' : '🇬🇧 EN';
        const tooltipText = (lang === 'ua') ? 'Switch to English' : 'Перемкнути на українську';
        langToggle.setAttribute('data-tooltip', tooltipText);
    }
}

// ============================================================================
// 📦 ГЛОБАЛЬНІ ЗМІННІ
// ============================================================================
var cycleStartDate = '';
var compounds = [];
var currentLanguage = localStorage.getItem('steroidLanguage') || 'en';
var chart = null;
var editingIndex = -1;
var currentEditingCompound = null;

const now = new Date();

var todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

window.todayTimestamp = todayTimestamp;

var globalTimeShiftHours = 0;
var fullMinTime, fullMaxTime;
var zoomTimeout;
var protectButtonsInterval = null;
var _lastMousePos = { x: -1000, y: -1000 };

const TOOLTIP_HOVER_RADIUS = 30; // 🔧 Радіус "магніту" тултипа (px)

// ============================================================================
// 🔗 DOM ЕЛЕМЕНТИ
// ============================================================================
var cycleStartDateInput, compoundSelect, doseInput, halfLifeInput, intervalInput, durationInput,
    startOffsetInput, timeShiftInput, timeOffsetInput, groupIdInput, submitButton, compoundListEl,
    toggleListCheckbox, combineCheckbox, unitSwitchCheckbox, importButton, exportButton,
    importFileInput, updateChartButton, resetZoomButton, exportScheduleButton;

// ============================================================================
// 💊💉 ВИЗНАЧЕННЯ ТИПУ ВВЕДЕННЯ
// ============================================================================

/**
Повертає іконку за типом введення
@param {string} compoundName - Назва сполуки
@returns {string} 💊 або 💉
*/
function getCompoundIcon(compoundName) {
    return estersConfig[compoundName]?.route === 'oral' ? '💊' : '💉';
}

// ============================================================================
// 🔧 МАТЕМАТИЧНІ ФУНКЦІЇ
// ============================================================================

/**
Конвертує дату у форматі "YYYY-MM-DD" у timestamp
@param {string} dateStr - Дата
@returns {number|null} Timestamp
*/
function parseDateToTimestamp(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
}

// ============================================================================
// 🎨 ГРАФІК
// ============================================================================
window.currentGenerateSeriesFunc = (c, combine, min, max) =>
    window.generateSeries(c, combine, min, max, 'palette1');

/**
Обробник зміни розміру вікна
*/
window.addEventListener('resize', () => {
    const ctx = document.getElementById('chart-container');
    if (chart && ctx) {
        ctx.style.maxHeight = '400px';
        chart.resize();
    }
});

/**
🧲 Магнітний зум: округлює межі до кратних добам/годинам
@param {number} minTime - Поточний мінімум
@param {number} maxTime - Поточний максимум
@returns {Object} { min, max, size }
*/
function snapToGrid(minTime, maxTime) {
    const daysDiff = (maxTime - minTime) / MS_PER_DAY;
    let snapSize;

    // 📐 Адаптивна кратність за шириною зуму
    if (daysDiff <= 1) snapSize = 1/24;      // 1 година
    else if (daysDiff <= 3) snapSize = 1/12; // 2 години
    else if (daysDiff <= 7) snapSize = 0.5;  // 12 годин
    else if (daysDiff <= 30) snapSize = 1;   // 1 доба
    else if (daysDiff <= 90) snapSize = 3;   // 3 доби
    else snapSize = 7;                       // 1 тиждень

    // 🧲 Округлення до кратних значень
    const snapMin = Math.floor((minTime - todayTimestamp) / (snapSize * MS_PER_DAY)) * snapSize * MS_PER_DAY + todayTimestamp;
    const snapMax = Math.ceil((maxTime - todayTimestamp) / (snapSize * MS_PER_DAY)) * snapSize * MS_PER_DAY + todayTimestamp;
    return { min: snapMin, max: snapMax, size: snapSize };
}

// ============================================================================
// 🎨 ФУНКЦІЇ ДЛЯ РОБОТИ З ПАЛІТРАМИ (через PaletteManager)
// ============================================================================

/**
Стилі графіка для обраної палітри
@param {string} paletteKey - Ключ палітри
@returns {Object} Об'єкт стилів
*/
function getChartBackgroundColor(paletteKey = 'palette1') {
    return window.PaletteManager.getStyles(paletteKey);
}

// ============================================================================
// 🎯 ФУНКЦІЯ ДЛЯ ГЕНЕРАЦІЇ DATASETS (ЄДИНЕ ДЖЕРЕЛО ІСТИНИ)
// ============================================================================

/**
 * Генерує подвійні datasets: кольорова база + центральне освітлення/затемнення (core)
 * 🎯 Логіка побудови шарів (знизу вгору / Painter's algorithm):
 * Спочатку описуємо широку кольорову лінію (order: 1, нижній шар).
 * Потім описуємо тоншу лінію outlineColor (order: 0, верхній шар).
 * Це створює ефект "серцевини" сигналу:
 * На темному фоні outlineColor світлий → візуальне освітлення (світлий core).
 * На світлому фоні outlineColor темний → візуальне затемнення (темний core).
 *
 * 🔑 НОВЕ: _pairIndex для синхронного ховання пари через легенду
 *
 * @param {Array} series - Масив серій даних
 * @param {Object} styles - Стилі з PaletteManager (outlineColor, outlineWidth, lineWidth)
 * @returns {Array} Масив datasets для Chart.js
 */
function createChartDatasets(series, styles) {
    const N = series.length;

    return [
        // 🎯 ШАР 1: Кольорові лінії (НИЖНІЙ шар, order: 1)
        // Малюється ПЕРШИМ (order: 1), слугує широкою кольоровою базою.
        // Товщина 2.5 — ширша за core, тому виступає як основне тіло сигналу.
        ...series.map((s, index) => ({
            label: s.name,
            data: s.data.map(([x, y]) => ({ x, y })),
            borderColor: s.color || `hsl(${index * 60}, 70%, 50%)`,
            backgroundColor: s.color ? `${s.color}33` : `hsla(${index * 60}, 70%, 50%, 0.2)`,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            borderWidth: 2.5,
            spanGaps: true,
            cubicInterpolationMode: 'default',
            order: 1,
            // 🔑 ПОСИЛАННЯ на відповідний outline dataset
            _pairIndex: N + index,
            _isOutline: false
        })),

        // 🎯 ШАР 2: Центральне освітлення/затемнення (ВЕРХНІЙ шар, order: 0)
        // Малюється ЗВЕРХУ (order: 0) поверх кольорової лінії.
        // Товщина 1.25 — тонша за базу, тому створює ефект "серцевини".
        ...series.map((s, index) => ({
            label: '',  // 🔑 Порожній → не показується в legend
            data: s.data.map(([x, y]) => ({ x, y })),
            borderColor: styles.outlineColor,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHitRadius: 0,
            borderWidth: 1.25,
            spanGaps: false,
            cubicInterpolationMode: 'default',
            animation: false,
            order: 0,
            // 🔑 ПОСИЛАННЯ на відповідну кольорову лінію
            _pairIndex: index,
            _isOutline: true
        }))
    ];
}

// ============================================================================
// 🎯 ФУНКЦІЯ ФІЛЬТРАЦІЇ ТУЛТИПА (DRY — використовується в plugin + позиціонер)
// ============================================================================
/**
 * Знаходить найближчу точку до курсора в межах TOOLTIP_HOVER_RADIUS
 * ⚡ Оптимізована: quick filter по X/Y перед обчисленням евклідової відстані
 *
 * @param {Array} elements - Масив елементів Chart.js (dataPoints)
 * @param {Object} eventPosition - Позиція курсора { x, y }
 * @param {number} radius - Радіус пошуку (за замовчуванням TOOLTIP_HOVER_RADIUS)
 * @returns {Object|null} Найближчий елемент або null
 */
function findClosestElementInRange(elements, eventPosition, radius = TOOLTIP_HOVER_RADIUS) {
    if (!elements || elements.length === 0 || !eventPosition) return null;

    let closest = null;
    let minDist = Infinity;

    for (const item of elements) {
        const el = item.element;
        if (!el || el.x == null || el.y == null) continue;

        // ⚡ Пропускаємо outline-шари (вони дублюють точки)
        if (item.dataset?._isOutline) continue;

        // ⚡ QUICK FILTER: тільки точки в квадраті ±radius навколо курсора
        const dx = eventPosition.x - el.x;
        if (Math.abs(dx) > radius) continue; // Швидка відсіювання по X

        const dy = eventPosition.y - el.y;
        if (Math.abs(dy) > radius) continue; // Ще швидше по Y

        // Евклідова відстань (квадрат — швидше за sqrt)
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
            minDist = dist;
            closest = el;
        }

        // ⚡ Early exit: якщо знайшли точку в 0px — далі шукати немає сенсу
        if (dist === 0) break;
    }

    return closest;
}

/**
 * Фільтрує елементи тултипа — залишає тільки ті, що в межах радіуса
 * @param {Array} elements - Масив елементів Chart.js
 * @param {Object} eventPosition - Позиція курсора { x, y }
 * @param {number} radius - Радіус пошуку
 * @returns {Array} Відфільтрований масив елементів
 */
function filterElementsInRange(elements, eventPosition, radius = TOOLTIP_HOVER_RADIUS) {
    if (!elements || elements.length === 0 || !eventPosition) return [];

    return elements.filter(item => {
        const el = item.element;
        if (!el || el.x == null || el.y == null) return false;
        if (item.dataset?._isOutline) return false;

        const dx = eventPosition.x - el.x;
        const dy = eventPosition.y - el.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist <= radius;
    });
}

/**
Створює або оновлює графік Chart.js

• Підрахунок totalPoints для адаптивної анімації
• Для важких графіків (>20000 точок) анімація вимикається
• Для легких графіків: duration 400ms замість 800ms, обмежена затримка
• Увімкнено decimation plugin (LTTB алгоритм) для великих наборів даних
• parsing: false — вимикаємо автоматичний парсинг даних
*/
function createProgressiveChart(series, minTime, maxTime, progressive = true) {
    // ⚡ Перевірка наявності Chart.js
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js не завантажено! Перевірте наявність chart.min.js');
        return;
    }
    
    const ctx = document.getElementById('chart-container');
    if (!ctx) {
        console.error('❌ Елемент #chart-container не знайдено');
        return;
    }
    if (chart) chart.destroy();

    const palette = document.querySelector('input[name="colors"]:checked')?.dataset.palette || 'palette1';
    const chartStyles = window.PaletteManager.getStyles(palette);

    // ⚡ OPTIMIZATION: підрахунок загальної кількості точок (×2 бо подвійні datasets)
    // Це дозволяє адаптивно керувати анімацією залежно від навантаження
    const totalPoints = series.reduce((sum, s) => sum + (s.data?.length || 0), 0) * 2;
    const isHeavy = totalPoints > 20000;

    // ⚡ OPTIMIZATION: адаптивна анімація — для важких графіків вимикаємо повністю
    // Це запобігає підвисанню при великому zoom out або багатьох серіях
    let animationConfig;
    if (!progressive || isHeavy) {
        animationConfig = { duration: 0 };  // Миттєво для важких графіків
    } else {
        animationConfig = {
            duration: 400,  // ⚡ зменшено з 800 до 400 (швидший відгук)
            delay: (ctx) => Math.min(ctx.dataIndex * 1, 200),  // ⚡ обмежена затримка (було dataIndex * 2 = нескінченність)
            x: { type: 'number', easing: 'linear', duration: 400, from: NaN }
        };
    }

    if (isHeavy) {
        console.log(`⚡ Heavy chart detected: ${totalPoints} points — animation disabled for performance`);
    }

    // 🆕 КАСТОМНИЙ PLUGIN: обробка позиції миші + фільтрація
    const tooltipDistanceFilterPlugin = {
        id: 'tooltipDistanceFilter',
        beforeEvent(chart, args) {
            const event = args.event;

            // 🖱️ Зберігаємо позицію миші
            if (event.type === 'mousemove' || event.type === 'click') {
                _lastMousePos.x = event.native?.offsetX ?? event.x ?? -1000;
                _lastMousePos.y = event.native?.offsetY ?? event.y ?? -1000;
            } else if (event.type === 'mouseout' || event.type === 'mouseleave') {
                _lastMousePos.x = -1000;
                _lastMousePos.y = -1000;
            }
        },

        // 🎯 Фільтруємо елементи тултипа ПЕРЕД рендерингом
        beforeTooltipDraw(chart, args) {
            const tooltip = args.tooltip;
            if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints) return;

            const mouseX = _lastMousePos.x;
            const mouseY = _lastMousePos.y;

            // Якщо миша поза межами canvas — ховаємо тултип
            if (mouseX < 0 || mouseY < 0) {
                tooltip.opacity = 0;
                return;
            }

            // ✅ Використовуємо DRY функцію
            const filtered = filterElementsInRange(
                tooltip.dataPoints,
                { x: mouseX, y: mouseY },
                TOOLTIP_HOVER_RADIUS
            );

            // 🚫 Якщо жодна сполука не в зоні захоплення — ховаємо тултип
            if (filtered.length === 0) {
                tooltip.opacity = 0;
                return;
            }

            // ✅ Оновлюємо dataPoints — тільки відфільтровані елементи
            tooltip.dataPoints = filtered;

            // ⚡ Перераховуємо розмір тултипа
            if (tooltip._size) {
                tooltip._size = null;
            }
        }
    };

    // 🆕 КАСТОМНИЙ ПОЗИЦІОНЕР: тултип біля найближчої лінії (а не між ними)
    if (!Chart.Tooltip.positioners.nearestLine) {
        Chart.Tooltip.positioners.nearestLine = function(elements, eventPosition) {
            // 🛡️ ЗАХИСТ: порожній масив або відсутні елементи
            if (!elements || elements.length === 0) {
                return eventPosition || { x: 0, y: 0 };
            }

            // ✅ Використовуємо DRY функцію з оптимізацією
            const closest = findClosestElementInRange(elements, eventPosition, TOOLTIP_HOVER_RADIUS);

            // 🛡️ ЗАХИСТ: якщо жодна точка не підійшла — повертаємо позицію курсора
            if (!closest) {
                return eventPosition || { x: 0, y: 0 };
            }

            return { x: closest.x, y: closest.y };
        };
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: createChartDatasets(series, chartStyles)
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            // ⚡ OPTIMIZATION: вимикаємо автоматичний парсинг даних (дані вже в правильному форматі)
            parsing: false,
            plugins: {
                // ⚡ OPTIMIZATION: decimation plugin — зменшує кількість точок для великих наборів
                // LTTB (Largest-Triangle-Three-Buckets) зберігає візуальну форму графіка
                // Працює ТІЛЬКИ коли точок більше threshold (4000)
                decimation: {
                    enabled: true,
                    algorithm: 'lttb',        // Найкращий алгоритм для збереження форми
                    samples: 2000,            // Максимум точок на dataset після decimation
                    threshold: 4000           // Вмикати тільки якщо точок > 4000
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 12, weight: '600' },
                        padding: 15,
                        usePointStyle: true,
                        generateLabels(chart) {
                            const currentPalette = document.querySelector('input[name="colors"]:checked')?.dataset.palette || 'palette1';
                            const contrastColor = window.PaletteManager.getContrastColor(currentPalette);
                            const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            return defaultLabels
                            .filter(item => {
                                const ds = chart.data.datasets[item.datasetIndex];
                                return ds && ds.label !== '';
                            })
                            .map(item => {
                                const dataset = chart.data.datasets[item.datasetIndex];
                                item.fillStyle = dataset.borderColor || dataset.backgroundColor || '#7f7f7f';
                                item.strokeStyle = dataset.borderColor || dataset.backgroundColor || '#7f7f7f';
                                item.fontColor = contrastColor;
                                item.color = contrastColor;
                                return item;
                            });
                        }
                    },
                    // 🆕 ОБРОБНИК КЛІКУ: синхронно ховає/показує пару datasets
                    onClick(evt, legendItem, legend) {
                        const chart = legend.chart;
                        const index = legendItem.datasetIndex;
                        const dataset = chart.data.datasets[index];

                        if (!dataset) return;

                        // Визначаємо новий стан (інвертуємо поточний)
                        const meta = chart.getDatasetMeta(index);
                        const isCurrentlyHidden = meta.hidden === true;
                        const newHidden = !isCurrentlyHidden;

                        // Ховаємо/показуємо поточний dataset
                        chart.getDatasetMeta(index).hidden = newHidden;

                        // 🔑 СИНХРОННО ховаємо/показуємо пару через _pairIndex
                        if (dataset._pairIndex !== undefined && dataset._pairIndex < chart.data.datasets.length) {
                            chart.getDatasetMeta(dataset._pairIndex).hidden = newHidden;
                        }

                        chart.update();
                    }
                },
                tooltip: {
                    // 🆕 КАСТОМНИЙ ПОЗИЦІОНЕР — тултип біля найближчої лінії
                    position: 'nearestLine',

                    backgroundColor: chartStyles.tooltip.backgroundColor,
                    titleColor: chartStyles.tooltip.titleColor,
                    bodyColor: chartStyles.tooltip.bodyColor,
                    borderColor: chartStyles.tooltip.borderColor,
                    borderWidth: chartStyles.tooltip.borderWidth,
                    cornerRadius: 8,
                    displayColors: true,
                    padding: 12,
                    titleFont: { size: 12, family: 'sans-serif', weight: '600' },
                    bodyFont: { size: 14, family: 'Segoe UI, sans-serif', weight: '600' },

                    // 🆕 ФІЛЬТР: показує тільки ті сполуки, що в межах TOOLTIP_HOVER_RADIUS
                    filter: (item) => {
                        // Пропускаємо outline-шари
                        if (item.dataset?._isOutline) return false;

                        const el = item.element;
                        if (!el || el.x == null || el.y == null) return false;

                        // Евклідова відстань від курсора до точки
                        const dx = _lastMousePos.x - el.x;
                        const dy = _lastMousePos.y - el.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        return dist <= TOOLTIP_HOVER_RADIUS;
                    },

                    callbacks: {
                        title(ctx) {
                            // ⚡ ЗАХИСТ: перевірка наявності даних (на випадок порожнього контексту)
                            if (!ctx || ctx.length === 0 || !ctx[0] || !ctx[0].parsed) return '';
                            const d = new Date(ctx[0].parsed.x);

                            // 📅 ОБЧИСЛЕННЯ НОМЕРА ДОБИ ЦИКЛУ
                            // ctx[0].parsed.x — timestamp точки під курсором (мс)
                            // todayTimestamp — дата початку циклу (мс)
                            // MS_PER_DAY — 86400000 (мс у добі)
                            // +1 — щоб перший день був "1", а не "0"
                            // Math.max(1, ...) — захист: якщо курсор до початку циклу, показуємо "1"
                            const dayNum = Math.max(1, Math.floor((ctx[0].parsed.x - todayTimestamp) / MS_PER_DAY) + 1);

                            // 🌐 Локалізація: "день" для UA / "day" для EN
                            const dayLabel = currentLanguage === 'ua' ? 'день' : 'day';

                            // 🕐 Формат дати: "DD.MM HH:MM" (наприклад: "15.08 00:00")
                            // padStart(2, '0') — гарантує двозначний формат (01, 02...15)
                            const dateStr = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

                            // 📊 Фінальний формат тултипа: "DD.MM HH:MM - [день N]"
                            return `${dateStr} - [${dayLabel} ${dayNum}]`;
                        },
                        label(ctx) {
                            // ⚡ ЗАХИСТ: перевірка наявності dataset та даних
                            if (!ctx || !ctx.dataset || ctx.parsed == null) return '';

                            // 💊 Одиниці виміру: цілі (nmol/L) або з 2 знаками (ng/dL)
                            // Перевіряємо стан чекбокса ng/dL ↔ nmol/L
                            const val = unitSwitchCheckbox?.checked ? ctx.parsed.y.toFixed(0) : ctx.parsed.y.toFixed(2);

                            // 🏷️ Формат рядка: "🟠 TestE: 450.23"
                            return `${ctx.dataset.label}: ${val}`;
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: { enabled: true, speed: 0.1 },
                        pinch: { enabled: true },
                        drag: {
                            enabled: true,
                            backgroundColor: 'rgba(255, 107, 53, 0.35)',
                            borderColor: '#FF6B35',
                            borderWidth: 3,
                            animationDuration: 0
                        },
                        mode: 'x',
                        onZoomComplete(context) {
                            clearTimeout(zoomTimeout);
                            zoomTimeout = setTimeout(() => {
                                const xScale = context.chart.scales.x;
                                const snapped = snapToGrid(xScale.min, xScale.max);
                                updateChart(snapped.min, snapped.max);
                            }, 300);
                        }
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                        threshold: 10,
                        onPanComplete(context) {
                            clearTimeout(zoomTimeout);
                            zoomTimeout = setTimeout(() => {
                                const xScale = context.chart.scales.x;
                                const snapped = snapToGrid(xScale.min, xScale.max);
                                updateChart(snapped.min, snapped.max);
                            }, 300);
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day', displayFormats: { day: 'dd MMM' } },
                    adapters: { date: { zone: 'local' } },
                    min: minTime,
                    max: maxTime,
                    ticks: {
                        color: window.PaletteManager.getContrastColor(palette),
                        font: { size: 12 }
                    },
                    grid: {
                        color: chartStyles.gridColor,
                        lineWidth: 1,
                        drawBorder: false
                    }
                },
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    ticks: {
                        callback(value) {
                            const fixed = value.toFixed(2);
                            return Number(fixed) === value ? value.toString() : fixed;
                        },
                        color: window.PaletteManager.getContrastColor(palette),
                        font: { size: 12 }
                    },
                    grid: {
                        color: chartStyles.gridColor,
                        lineWidth: 1,
                        drawBorder: false
                    }
                }
            },
            // ⚡ OPTIMIZATION: використовуємо адаптивну конфігурацію анімації
            animation: animationConfig
        },
        plugins: [tooltipDistanceFilterPlugin]
    });
}

/**
 * 🎯 УНІФІКОВАНА функція оновлення графіка
 * @param {number} [minTime] - Мінімальний час (timestamp)
 * @param {number} [maxTime] - Максимальний час (timestamp)
 * @param {boolean} [progressive=true] - true = resetZoom (анімація), false = updateChart
 */
function refreshChart(minTime, maxTime, progressive = false) {
    const { minStartOffset, maxDuration } = getTimeBounds(compounds);
    fullMinTime = todayTimestamp + minStartOffset * MS_PER_DAY;
    fullMaxTime = todayTimestamp + maxDuration * MS_PER_DAY;
    minTime = minTime || fullMinTime;
    maxTime = maxTime || fullMaxTime;
    const series = window.currentGenerateSeriesFunc(compounds, combineCheckbox?.checked, minTime, maxTime);
    createProgressiveChart(series, minTime, maxTime, progressive);
    renderCompoundList();
}

// 🔄 Обгортки для зворотної сумісності
function resetZoom(minTime, maxTime) { refreshChart(minTime, maxTime, true); }
function updateChart(minTime, maxTime) { refreshChart(minTime, maxTime, false); }

/**
Оновлює графік, зберігаючи поточний діапазон по осі X (зум)
*/
function updateChartPreservingZoom() {
    if (chart && chart.scales?.x) {
        const currentMin = chart.scales.x.min;
        const currentMax = chart.scales.x.max;
        updateChart(currentMin, currentMax);
    } else {
        // Fallback: якщо графік ще не ініціалізовано
        updateChart();
    }
}

// ============================================================================
// 🔘 ОБРОБНИКИ КНОПОК
// ============================================================================
function protectButtons() {
    [updateChartButton, resetZoomButton].forEach(btn => {
        if (btn) {
            btn.setAttribute('translate', 'no');
            btn.setAttribute('data-translate-ignore', 'true');
        }
    });
}

// ============================================================================
// 📋 РЕНДЕР СПИСКУ СПОЛУК
// ============================================================================
function renderCompoundList() {
    if (!compoundListEl) return;
    compoundListEl.textContent = '';
    if (compounds.length === 0) compoundListEl.classList.remove('has-compounds');
    else compoundListEl.classList.add('has-compounds');

    const showAll = toggleListCheckbox?.checked;
    let firstRowRendered = false;
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

    compounds.forEach((compound, idx) => {
        if (!showAll && idx !== editingIndex) return;
        if (!firstRowRendered) {
            const header = createTableHeader(t);
            compoundListEl.appendChild(header);
            firstRowRendered = true;
        }
        const row = createCompoundRow(compound, idx, t);
        compoundListEl.appendChild(row);
    });
}

function createTableHeader(t) {
    const header = document.createElement('div');
    header.style.cssText = `display: flex; font-weight: bold; font-size: 0.9em; font-family: Arial, sans-serif; background-color: #f0f0f0; border-bottom: 1px solid black; padding: 5px 0; border: 2px solid #ffc107;`;
    const headers = [
        t['header-compound'],
        t['header-dose'],
        t['header-interval'],
        t['header-duration'],
        t['header-start-offset'],
        t['header-half-life'],
        t['header-time-offset'],
        t['header-group-id'],
        ''
    ];
    headers.forEach(text => {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = 'flex: 1; padding: 0 10px;';
        div.setAttribute('translate', 'no');
        header.appendChild(div);
    });
    return header;
}

function createCompoundRow(compound, idx, t) {
    const row = document.createElement('div');
    row.className = 'compound-item';
    row.style.cssText = `display: flex; align-items: center; border-bottom: 1px solid #ddd; padding: 8px 0; gap: 10px;`;

    const c = (idx === editingIndex && currentEditingCompound) ? currentEditingCompound : compound;
    if (idx === editingIndex && currentEditingCompound) {
        row.style.backgroundColor = '#fff3cd';
        row.style.border = '2px solid #ffc107';
    }

    // 🆕 Динамічне отримання короткої назви з COMPOUND_METADATA
    const metadata = window.COMPOUND_METADATA || {};
    const shortName = metadata.displayNames?.[c.name] || formatCompoundName(c.name);
    const isHCG = c.name === 'HCG' || c.name === 'HCG_PCT';
    const displayDose = isHCG ? Math.round(c.dose / HCG_IU_TO_MG) : c.dose;
    const doseUnit = isHCG ? 'IU' : 'mg';
    const timeOffsetDisplay = (c.timeOffsetHours !== undefined && c.timeOffsetHours !== 0)
        ? `${c.timeOffsetHours > 0 ? '+' : ''}${c.timeOffsetHours}h`
        : '—';

    const cells = [
        shortName,
        `${displayDose} ${doseUnit}`,
        `${c.interval}d`,
        `${c.duration}d`,
        `+${c.startOffset}d`,
        `${c.halfLife}d`,
        timeOffsetDisplay,
        `G${c.groupId || 0}`
    ];

    cells.forEach((text, cellIndex) => {
        const cell = document.createElement('div');
        cell.textContent = text;
        cell.style.cssText = `
            flex: 1;
            padding: 0 10px;
            font-size: 0.9em;
            font-family: Arial, sans-serif;
        `;
        cell.setAttribute('translate', 'no');
        if (cellIndex === 0) cell.style.fontWeight = 'bold';
        row.appendChild(cell);
    });

    const editBtn = createEditButton(idx, c, t);
    const removeBtn = createRemoveButton(idx, t);
    row.appendChild(editBtn);
    row.appendChild(removeBtn);
    return row;
}

function createEditButton(index, compound, t) {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.dataset.index = index;
    editBtn.setAttribute('translate', 'no');
    editBtn.style.cssText = `margin-left: 10px; padding: 4px 8px; border-radius: 3px; cursor: pointer; border: none; color: white;`;
    if (index === editingIndex && currentEditingCompound) {
        editBtn.textContent = t['btn-apply'];
        editBtn.style.backgroundColor = '#28a745';
    } else {
        editBtn.textContent = t['btn-edit'];
        editBtn.style.backgroundColor = '#007bff';
    }
    return editBtn;
}

function createRemoveButton(index, t) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = t['btn-remove'];
    removeBtn.dataset.index = index;
    removeBtn.style.cssText = `margin-left: 5px; padding: 4px 8px; border-radius: 3px; cursor: pointer; background-color: #dc3545; border: none; color: white;`;
    removeBtn.setAttribute('translate', 'no');
    return removeBtn;
}

// ============================================================================
// ✏️ РЕЖИМ РЕДАГУВАННЯ
// ============================================================================
function enterEditMode(index) {
    editingIndex = index;
    const compound = compounds[index];
    currentEditingCompound = { ...compound };
    if (toggleListCheckbox) toggleListCheckbox.checked = false;
    renderCompoundList();
    populateFormWithCompound(compound);
    handleCustomHalfLife(compound);
    updateSubmitButtonForEdit();
    renderCompoundList();

    // 🆕 ЕКСПОРТ + ОНОВЛЕННЯ ГРАФІКА (разом!)
    window.editingIndex = editingIndex;
    window.currentEditingCompound = currentEditingCompound;
    updateChart();
}

function populateFormWithCompound(compound) {
    if (compoundSelect) compoundSelect.value = compound.name;
    const isHCG = compound.name === 'HCG' || compound.name === 'HCG_PCT';
    if (doseInput) doseInput.value = isHCG ? Math.round(compound.dose / HCG_IU_TO_MG) : compound.dose;
    if (halfLifeInput) halfLifeInput.value = compound.halfLife;
    if (intervalInput) intervalInput.value = compound.interval;
    if (durationInput) durationInput.value = compound.duration;
    if (startOffsetInput) startOffsetInput.value = compound.startOffset;
    if (groupIdInput) groupIdInput.value = compound.groupId || 0;
    if (timeOffsetInput) timeOffsetInput.value = compound.timeOffsetHours || 0;
}

function handleCustomHalfLife(compound) {
    const presetHalfLife = estersConfig[compound.name]?.halfLife;
    if (compound.halfLife !== presetHalfLife && compound.halfLife > 0) {
        if (compoundSelect) compoundSelect.value = 'Custom';
        if (currentEditingCompound) currentEditingCompound.name = 'Custom';
    }
    setHalfLifeInputState();
}

function updateSubmitButtonForEdit() {
    if (!submitButton) return;
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    submitButton.textContent = t['submit-btn-edit'];
    submitButton.style.backgroundColor = '#28a745';
}

function applyEditChanges(index) {
    updateCurrentEditingCompoundFields();
    compounds[index] = { ...currentEditingCompound };
    exitEditMode();
}

function exitEditMode() {
    editingIndex = -1;
    currentEditingCompound = null;
    const form = document.getElementById('compound-form');
    if (form) form.reset();
    if (toggleListCheckbox) toggleListCheckbox.checked = true;
    if (submitButton) {
        const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
        submitButton.textContent = t['submit-btn'];
        submitButton.style.backgroundColor = 'lightblue';
    }
    setHalfLifeInputState();
    renderCompoundList();

    // 🆕 ЕКСПОРТ + ОНОВЛЕННЯ ГРАФІКА (разом!)
    window.editingIndex = editingIndex;
    window.currentEditingCompound = currentEditingCompound;
    updateChart();
}

function updateCurrentEditingCompoundFields() {
    if (editingIndex < 0 || !compoundSelect) return;
    const selectedName = compoundSelect.value;
    const isHCG = selectedName === 'HCG' || selectedName === 'HCG_PCT';
    const doseValue = parseFloat(doseInput?.value) || 0;
    const doseMg = isHCG ? doseValue * HCG_IU_TO_MG : doseValue;
    const newHalfLife = parseFloat(halfLifeInput?.value) || 0;
    const presetHalfLife = estersConfig[selectedName]?.halfLife;

    if (newHalfLife !== presetHalfLife && newHalfLife > 0) {
        if (compoundSelect) compoundSelect.value = 'Custom';
        if (currentEditingCompound) currentEditingCompound.name = 'Custom';
    }

    if (currentEditingCompound) {
        const config = estersConfig[selectedName] || {};
        // Динамічний розрахунок concentrationMultiplier (estersConfig)
        let cM = config.concentrationMultiplier;
        if (cM === undefined && typeof calculateConcentrationMultiplier === 'function') {
            cM = calculateConcentrationMultiplier(selectedName, config);
        }
        cM = cM ?? 1.0;

        currentEditingCompound = {
            ...currentEditingCompound,
            name: selectedName,
            dose: doseMg,
            halfLife: newHalfLife,
            interval: parseInt(intervalInput?.value) || 1,
            duration: parseInt(durationInput?.value) || 1,
            startOffset: parseInt(startOffsetInput?.value) || 0,
            timeOffsetHours: parseFloat(timeOffsetInput?.value) || 0,
            groupId: parseInt(groupIdInput?.value) ?? 0,
            kaMultiplier: getEffectiveKaMultiplier(config),
            keModifier: config.keModifier ?? 1.0,
            concentrationMultiplier: cM,
            normalizationDivisor: config.normalizationDivisor ?? null
        };
    }

    // Експорт + оновлення графіка (разом!)
    window.editingIndex = editingIndex;
    window.currentEditingCompound = currentEditingCompound;
    updateChart();
}

function cancelEdit() {
    if (editingIndex < 0) return;
    exitEditMode();
}

// ============================================================================
// ➕ ДОДАВАННЯ НОВОЇ СПОЛУКИ
// ============================================================================
function addNewCompound() {
    const isPCT = [
        'Clomiphene', 'Tamoxifen', 'HCG_PCT', 'HCG',
        'Anastrozole', 'Exemestane', 'Cabergoline', 'Finasteride'
    ].includes(compoundSelect?.value);

    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    if (!cycleStartDate && !isPCT) {
        alert(t['msg-select-date']);
        return;
    }

    if (cycleStartDateInput?.value) cycleStartDate = cycleStartDateInput.value;
    const compoundName = compoundSelect?.value;
    if (!compoundName) return;

    const isHCG = compoundName === 'HCG' || compoundName === 'HCG_PCT';
    const doseValue = parseFloat(doseInput?.value) || 0;
    const doseMg = isHCG ? doseValue * HCG_IU_TO_MG : doseValue;
    const config = estersConfig[compoundName] || {};

    // Динамічний розрахунок concentrationMultiplier
    let cM = config.concentrationMultiplier;
    if (cM === undefined && typeof calculateConcentrationMultiplier === 'function') {
        cM = calculateConcentrationMultiplier(compoundName, config);
    }
    cM = cM ?? 1.0;

    const compound = {
        name: compoundName,
        dose: doseMg,
        halfLife: parseFloat(halfLifeInput?.value) || 0,
        interval: parseInt(intervalInput?.value) || 1,
        duration: parseInt(durationInput?.value) || 1,
        startOffset: parseInt(startOffsetInput?.value) || 0,
        timeOffsetHours: parseFloat(timeOffsetInput?.value) || 0,
        kaMultiplier: getEffectiveKaMultiplier(config),
        keModifier: config.keModifier ?? 1.0,
        concentrationMultiplier: cM,
        normalizationDivisor: config.normalizationDivisor ?? null,
        groupId: parseInt(groupIdInput?.value) ?? 0
    };

    console.log('✅ НОВА СПОЛУКА:', { name: compound.name, cM: compound.concentrationMultiplier });
    compounds.push(compound);
    exitEditMode();
}

function setHalfLifeInputState() {
    if (!halfLifeInput || !compoundSelect) return;
    if (compoundSelect.value === 'Custom') {
        halfLifeInput.disabled = false;
        halfLifeInput.focus();
    } else {
        const dataHalfLife = estersConfig[compoundSelect.value]?.halfLife ?? '';
        halfLifeInput.value = dataHalfLife;
        halfLifeInput.disabled = dataHalfLife !== null && dataHalfLife !== '';
    }
}

// ============================================================================
// 🖱️ EVENT LISTENERS
// ============================================================================
function initEventListeners() {
    if (compoundListEl) {
        compoundListEl.addEventListener('click', e => {
            if (e.target.tagName !== 'BUTTON') return;
            const index = parseInt(e.target.dataset.index);
            if (isNaN(index)) return;
            const text = e.target.textContent.trim();
            const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

            if (text === t['btn-edit'] || text === 'Edit') enterEditMode(index);
            else if (text === t['btn-apply'] || text === 'Apply') applyEditChanges(index);
            else if (text === t['btn-remove'] || text === 'Remove') {
                compounds.splice(index, 1);
                if (editingIndex >= index) editingIndex--;
                exitEditMode();
            }
        });
    }

    const compoundForm = document.getElementById('compound-form');
    if (compoundForm) {
        compoundForm.addEventListener('submit', e => {
            e.preventDefault();
            if (editingIndex >= 0) {
                if (submitButton?.textContent === 'Cancel') cancelEdit();
                else applyEditChanges(editingIndex);
            } else {
                addNewCompound();
            }
        });
    }

    if (unitSwitchCheckbox) {
        unitSwitchCheckbox.addEventListener('change', () => {
            // 🎨 Зберігаємо поточний діапазон по X,
            // 🎨 щоб не скидати зум при зміні одиниць концентрації
            updateChartPreservingZoom();
        });
    }

    [doseInput, halfLifeInput, intervalInput, durationInput, startOffsetInput, timeOffsetInput]
        .filter(el => el)
        .forEach(el => el.addEventListener('input', updateCurrentEditingCompoundFields));

    if (timeShiftInput) {
        const savedShift = localStorage.getItem('steroidTimeShift');
        if (savedShift !== null) {
            globalTimeShiftHours = parseFloat(savedShift);
            timeShiftInput.value = globalTimeShiftHours;
        }
        timeShiftInput.addEventListener('input', e => {
            globalTimeShiftHours = parseFloat(e.target.value) || 0;
            localStorage.setItem('steroidTimeShift', globalTimeShiftHours);
            updateChart();
        });
    }

    if (compoundSelect) compoundSelect.addEventListener('change', handleCompoundSelectChange);

    if (cycleStartDateInput) {
        cycleStartDateInput.addEventListener('change', () => {
            if (cycleStartDateInput.value) {
                cycleStartDate = cycleStartDateInput.value;
                todayTimestamp = parseDateToTimestamp(cycleStartDate);
                window.todayTimestamp = todayTimestamp;
                resetZoom();
            }
        });
    }

    if (combineCheckbox) combineCheckbox.addEventListener('change', () => {
        // 🎨 Зберігаємо поточний діапазон по X,
        // 🎨 щоб не скидати зум при об'єднанні та роз'єднанні сполук
        updateChartPreservingZoom();
    });

    if (resetZoomButton) {
        resetZoomButton.addEventListener('click', () => {
            const originalText = resetZoomButton.textContent;
            resetZoomButton.textContent = '🎨 Drawing...';
            resetZoomButton.disabled = true;
            resetZoom(fullMinTime, fullMaxTime);
            setTimeout(() => {
                resetZoomButton.textContent = originalText;
                resetZoomButton.disabled = false;
            }, 850);
        });
    }

    if (updateChartButton) updateChartButton.addEventListener('click', () => updateChart());
}

function handleCompoundSelectChange() {
    if (!compoundSelect || !halfLifeInput || !doseInput) return;

    const selectedValue = compoundSelect.value;
    const config = estersConfig[selectedValue] || estersConfig.Custom;
    const isKnown = selectedValue !== 'Custom' && estersConfig[selectedValue];

    if (config) {
        // 1. Встановлюємо half-life
        halfLifeInput.value = config.halfLife ?? '';

        // 2. Встановлюємо placeholder з централізованого об'єкта
        const placeholders = window.COMPOUND_METADATA?.placeholders || {};
        doseInput.placeholder = placeholders[selectedValue] || 'e.g. 75, 100, 125, ... mg';

        // 3. Блокуємо/розблоковуємо поле half-life
        if (!isKnown && config.halfLife == null) {
            halfLifeInput.disabled = false;
            halfLifeInput.focus();
        } else {
            halfLifeInput.disabled = true;
        }
    }

    setHalfLifeInputState();

    // Оновлюємо графік ТІЛЬКИ якщо активно редагуємо сполуку
    if (editingIndex >= 0 && currentEditingCompound) {
        currentEditingCompound.name = selectedValue;
        currentEditingCompound.halfLife = config.halfLife ?? 0;
        currentEditingCompound.kaMultiplier = getEffectiveKaMultiplier(config);
        currentEditingCompound.keModifier = config.keModifier ?? 1.0;
        currentEditingCompound.normalizationDivisor = config.normalizationDivisor ?? null;

        let cM = config.concentrationMultiplier;
        if (cM === undefined && typeof calculateConcentrationMultiplier === 'function') {
            cM = calculateConcentrationMultiplier(selectedValue, config);
        }
        currentEditingCompound.concentrationMultiplier = cM ?? 1.0;
        updateChart();
    }
}

// ============================================================================
// 📁 ІМПОРТ/ЕКСПОРТ
// ============================================================================
function initImportExport() {
    if (importButton && importFileInput) {
        importButton.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.json')) {
                alert('❌ Оберіть .json файл');
                return;
            }
            if (file.size > 1024 * 1024) {
                alert('❌ Файл >1MB');
                return;
            }

            const reader = new FileReader();
            const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
            reader.onerror = () => alert(t['msg-read-error']);
            reader.onload = () => {
                try {
                    if (!reader.result || reader.result.trim() === '') throw new Error('Порожній файл');
                    const data = JSON.parse(reader.result);
                    validateImportData(data);
                    editingIndex = -1;
                    currentEditingCompound = null;
                    cycleStartDate = data.startDate || '';
                    if (cycleStartDateInput) cycleStartDateInput.value = cycleStartDate;
                    if (cycleStartDate) {
                        todayTimestamp = parseDateToTimestamp(cycleStartDate);
                        window.todayTimestamp = todayTimestamp;
                    }
                    if (combineCheckbox) combineCheckbox.checked = !!data.combine;
                    if (unitSwitchCheckbox) unitSwitchCheckbox.checked = !!data.unitSwitch;
                    compounds.length = 0;
                    compounds.push(...data.compounds);
                    compounds = compounds.map(c => {
                        const isCustom = c.name === 'Custom';
                        const config = isCustom ? {} : (estersConfig[c.name] || {});
                        // Динамічний розрахунок concentrationMultiplier, якщо не задано явно
                        let cM = config.concentrationMultiplier;
                        if (cM === undefined && typeof calculateConcentrationMultiplier === 'function') {
                            cM = calculateConcentrationMultiplier(c.name, config);
                        }
                        cM = cM ?? 1.0;
                        return {
                            ...c,
                            concentrationMultiplier: cM,  // ✅ Тепер правильне значення
                            kaMultiplier: getEffectiveKaMultiplier(config),
                            keModifier: config.keModifier ?? c.keModifier ?? 1.0,
                            halfLife: config.halfLife ?? c.halfLife ?? 0,
                            route: config.route || c.route || '',
                            normalizationDivisor: config.normalizationDivisor ?? null,
                            groupId: c.groupId ?? 0
                        };
                    });
                    console.log('✅ ІМПОРТ:', compounds.map(c => `${c.name}: ka=${c.kaMultiplier.toFixed(2)}, normDiv=${c.normalizationDivisor}`));
                    exitEditMode();
                    const { minStartOffset, maxDuration } = getTimeBounds(compounds);
                    fullMinTime = todayTimestamp + minStartOffset * MS_PER_DAY;
                    fullMaxTime = todayTimestamp + maxDuration * MS_PER_DAY;
                    updateChart(fullMinTime, fullMaxTime);
                    alert(t['msg-import-success']);
                } catch (err) {
                    alert(t['msg-import-error'] + '\n' + err.message);
                    console.error('❌ Import error:', err);
                }
            };
            reader.readAsText(file, 'UTF-8');
            importFileInput.value = '';
        });
    }

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const PK_FIELDS = [
                'concentrationMultiplier', 'kaMultiplier', 'keModifier',
                'halfLife', 'route', 'molecularWeight', 'normalizationDivisor'
            ];
            const cleanCompounds = compounds.map(c => {
                const isKnown = estersConfig[c.name] && c.name !== 'Custom';
                if (isKnown) {
                    const cleaned = { ...c };
                    PK_FIELDS.forEach(field => delete cleaned[field]);
                    return cleaned;
                }
                return c;
            });
            const data = {
                startDate: cycleStartDate,
                combine: combineCheckbox?.checked,
                unitSwitch: unitSwitchCheckbox?.checked,
                compounds: cleanCompounds
            };
            const jsonStr = JSON.stringify(data, null, 2) + '\n';
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `steroid-cycle-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (exportScheduleButton) {
        exportScheduleButton.addEventListener('click', () => {
            if (compounds.length === 0) {
                const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
                alert(t['msg-add-compounds-first']);
                return;
            }
            // Локаль для форматування дат (обчислюємо один раз)
            const exportLocale = currentLanguage === 'ua' ? 'uk-UA' : 'en-US';
            const { minStartOffset, maxDuration } = getTimeBounds(compounds);
            const startTimestamp = todayTimestamp + (minStartOffset * MS_PER_DAY);
            const endTimestamp = todayTimestamp + (maxDuration * MS_PER_DAY);
            let output = '';
            const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

            // Заголовок розкладу
            output += `${t['schedule-title']}\n`;
            // Дата генерації файлу
            output += `${t['schedule-generated']} ${formatDateLocalized(new Date(), exportLocale, 'long', false)}\n`;
            // Дата початку циклу
            const headerStartTimestamp = parseDateToTimestamp(cycleStartDate);
            const headerStartDateObj = new Date(headerStartTimestamp);
            output += `${t['schedule-cycle-start']} ${formatDateLocalized(headerStartDateObj, exportLocale, 'long', false)}\n`;
            output += '========================================\n\n';

            // Генерація щоденних записів
            for (let ts = startTimestamp; ts <= endTimestamp; ts += MS_PER_DAY) {
                const currentDate = new Date(ts);
                const dayOffset = Math.round((ts - todayTimestamp) / MS_PER_DAY);
                // Форматуємо дату з днем тижня для зручного планування
                const dateStr = formatDateLocalized(currentDate, exportLocale, 'long', true);
                const todaysDoses = [];
                compounds.forEach(c => {
                    if (dayOffset >= c.startOffset && dayOffset < (c.startOffset + c.duration)) {
                        const dayInCycle = dayOffset - c.startOffset;
                        if (dayInCycle % c.interval === 0) {
                            const isHCG = c.name === 'HCG' || c.name === 'HCG_PCT';
                            const doseVal = isHCG ? Math.round(c.dose / HCG_IU_TO_MG) : c.dose;
                            const unit = isHCG ? 'IU' : 'mg';
                            let hour = 8;
                            if (c.timeOffsetHours) {
                                hour += c.timeOffsetHours;
                                if (hour >= 24) hour -= 24;
                                if (hour < 0) hour += 24;
                            }
                            const icon = getCompoundIcon(c.name);
                            // 🆕 Динамічне отримання назви для текстового розкладу
                            const metadata = window.COMPOUND_METADATA || {};
                            const compoundName = metadata.displayNames?.[c.name] || formatCompoundName(c.name);
                            todaysDoses.push(`${icon} ${compoundName} — ${doseVal}${unit} @ ${String(hour).padStart(2,'0')}:00`);
                        }
                    }
                });
                if (todaysDoses.length > 0) {
                    output += ` ${dateStr} - [day ${dayOffset + 1}]\n`;
                    todaysDoses.forEach(d => output += `   ${d}\n`);
                    output += '\n';
                }
            }
            output += '========================================\n' + t['schedule-end'];

            const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `schedule-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

function initRadioTooltipsText() {
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    const paletteKeys = {
        'use-colors-0': 'palette1',
        'use-colors-1': 'palette2',
        'use-colors-2': 'palette3',
        'use-colors-3': 'palette4',
        'use-colors-4': 'palette5'
    };
    for (const [id, key] of Object.entries(paletteKeys)) {
        const radio = document.getElementById(id);
        if (radio && radio.parentElement?.classList.contains('radio-tooltip')) {
            radio.parentElement.setAttribute('data-tooltip', t[key]);
            radio.parentElement.removeAttribute('title');
        }
    }
}

// ============================================================================
// 🔧 ДОПОМІЖНІ ФУНКЦІЇ ІНІЦІАЛІЗАЦІЇ
// ============================================================================
function loadSeriesFunctions() {
    if (typeof window.generateSeries !== 'function') {
        console.warn('⚠️ generateSeries.js ще не завантажено');
    }
}

function initButtonTooltips() {
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    const btnTitles = {
        'import-button': t['import-title'],
        'export-button': t['export-title'],
        'export-schedule-button': t['export-schedule-title'],
        'update-chart-button': t['update-chart-title'],
        'reset-zoom-button': t['reset-zoom-title']
    };
    for (const [id, text] of Object.entries(btnTitles)) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.setAttribute('data-tooltip', text);
        }
    }
}

/**
Ініціалізує data-tooltip атрибути для чекбоксів
Використовує TRANSLATIONS + поточну мову
*/
function initCheckboxTooltips() {
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    const map = {
        'combine-checkbox': t['combine-checkbox'],
        'toggle-compound-list': t['toggle-list'],
        'unit-switch': t['unit-switch']
    };
    for (const [id, text] of Object.entries(map)) {
        const label = findCheckboxLabel(id);
        if (label && text) {
            label.setAttribute('data-tooltip', text);
            label.classList.add('cb-tooltip-label');
        }
    }
    console.log('✅ Checkbox tooltips initialized');
}

function clearOldStyles() {
    ['date-styles', 'form-styles', 'buttons-styles', 'chart-styles',
     'compound-list-styles', 'tooltip-variables', 'all-tooltips-styles',
     'radio-tooltip-styles', 'checkbox-tooltip-styles'].forEach(id => {
        const old = document.getElementById(id);
        if (old) old.remove();
    });
}

function initToggleListListener() {
    if (toggleListCheckbox && !toggleListCheckbox.hasAttribute('data-listener-added')) {
        toggleListCheckbox.addEventListener('change', renderCompoundList);
        toggleListCheckbox.setAttribute('data-listener-added', 'true');
    }
}

function loadSeriesFunctionsAndInitChart() {
    loadSeriesFunctions();
    let loadAttempts = 0;

    // 🎯 ВИНОСИМО СПІЛЬНУ ЛОГІКУ (DRY — Don't Repeat Yourself)
    function initPaletteSwitcher() {
        // ✅ Створюємо стрілочну функцію
        window.currentGenerateSeriesFunc = (c, combine, min, max) =>
            window.generateSeries(c, combine, min, max, 'palette1');

        // Пріоритет: анімована версія > базова версія
        if (typeof window.setupColorSwitchAnimation === 'function') {
            window.setupColorSwitchAnimation();
        } else if (typeof window.setupColorSwitch === 'function') {
            window.setupColorSwitch();
        }
        resetZoom();
    }

    const waitForFunctions = setInterval(() => {
        loadAttempts++;
        if (typeof window.generateSeries === 'function') {
            clearInterval(waitForFunctions);
            console.log('✅ УСІ ФУНКЦІЇ ЗАВАНТАЖЕНО! 🎨');
            initPaletteSwitcher();
        } else if (loadAttempts > 20) {
            clearInterval(waitForFunctions);
            console.warn('⚠️ Fallback ініціалізація — generateSeries.js не завантажено');
            initPaletteSwitcher();
        }
    }, 100);
}

function setInitialChartBackground() {
    const initialPalette = document.querySelector('input[name="colors"]:checked')?.dataset.palette || 'palette1';
    const initialStyles = getChartBackgroundColor(initialPalette);
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) chartContainer.style.backgroundColor = initialStyles.backgroundColor;
}

function fixAllElements() {
    cycleStartDateInput = document.getElementById('cycle-start-date');
    compoundSelect = document.getElementById('compound-select');
    doseInput = document.getElementById('dose-input');
    halfLifeInput = document.getElementById('half-life-input');
    intervalInput = document.getElementById('interval-input');
    durationInput = document.getElementById('duration-input');
    startOffsetInput = document.getElementById('start-offset-input');
    timeShiftInput = document.getElementById('time-shift-input');
    timeOffsetInput = document.getElementById('time-offset-input');
    groupIdInput = document.getElementById('group-id-input');
    submitButton = document.getElementById('submit-btn');
    compoundListEl = document.getElementById('compound-list');
    toggleListCheckbox = document.getElementById('toggle-compound-list');
    combineCheckbox = document.getElementById('combine-checkbox');
    unitSwitchCheckbox = document.getElementById('unit-switch');
    window.unitSwitchCheckbox = unitSwitchCheckbox;
    importButton = document.getElementById('import-button');
    exportButton = document.getElementById('export-button');
    importFileInput = document.getElementById('import-file');
    updateChartButton = document.getElementById('update-chart-button');
    resetZoomButton = document.getElementById('reset-zoom-button');
    exportScheduleButton = document.getElementById('export-schedule-button');
    console.log('✅ ВСІ DOM елементи переприсвоєно!');
}

// ============================================================================
// 🚀 ГОЛОВНА ФУНКЦІЯ ІНІЦІАЛІЗАЦІЇ
// ============================================================================
function initializeApp() {
    if (window._appInitialized) {
        console.log('⚠️ Додаток вже ініціалізовано');
        return;
    }
    window._appInitialized = true;
    console.log(`🚀 Steroid Cycle Plotter v${APP_VERSION} loaded! 💎 (PRODUCTION EDITION)`);

    clearOldStyles();
    initToggleListListener();
    loadSeriesFunctionsAndInitChart();
    applyAllStyles();
    protectButtons();
    initEventListeners();
    initImportExport();
    renderCompoundList();
    initLanguageToggle();
    initCheckboxTooltips();
    initButtonTooltips();
    setInitialChartBackground();

    // 🆕 Застосовуємо тему тултипів відповідно до початкової палітри
    const initialPalette = document.querySelector('input[name="colors"]:checked')?.dataset.palette || 'palette1';
    window.PaletteManager.applyTooltipTheme(initialPalette);
    validateEstersConfig();
    protectButtonsInterval = setInterval(protectButtons, 2000);
}

// ============================================================================
// 🧹 CLEANUP ПРИ ЗАКРИТТІ
// ============================================================================
window.addEventListener('beforeunload', () => {
    if (protectButtonsInterval) {
        clearInterval(protectButtonsInterval);
        protectButtonsInterval = null;
        console.log('🧹 protectButtons interval cleared');
    }
    if (zoomTimeout) clearTimeout(zoomTimeout);
    if (chart) {
        chart.destroy();
        chart = null;
    }
});

// ============================================================================
// 🏁 ЗАПУСК ДОДАТКУ
// ============================================================================
setTimeout(fixAllElements, 300);
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        fixAllElements();
        initializeApp();
    }, 50);
});

// ============================================================================
// 🏁 EOF script.js
// ============================================================================
