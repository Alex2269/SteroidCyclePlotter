// ============================================================================
// 🎨 styles.js v2.1.0 — Steroid Cycle Plotter Styles (FULLY DRY)
// 📦 ВСІ стилі тултипів — в ОДНІЙ функції
// 🎯 Принцип DRY: базові стилі + унікальні позиції + контейнери
// 🗓️ Останнє оновлення: 2026
// ============================================================================

// ============================================================================
// 🎨 CSS-ЗМІННІ ДЛЯ ТУЛТИПІВ (динамічна тема від PaletteManager)
// ============================================================================
/**
 * 🎯 Ініціалізує CSS-змінні для тултипів (:root)
 * Оновлюються динамічно через PaletteManager.applyTooltipTheme()
 */
function styleTooltipVariables() {
    // 🗑️ Видаляємо старий <style>, якщо існує (уникаємо дублювання)
    const old = document.getElementById('tooltip-variables');
    if (old) old.remove();
    
    // 🆕 Створюємо новий <style> елемент
    const style = document.createElement('style');
    style.id = 'tooltip-variables';
    
    // 🎨 Визначаємо CSS-змінні для тултипів (дефолтні значення)
    style.textContent = `
        /* 🎨 CSS-змінні для динамічної теми тултипів */
        :root {
            /* 🖼️ Фон тултипа — напівпрозорий сірий (оновлюється PaletteManager) */
            --tooltip-bg: rgba(128, 128, 128, 0.25);
            /* 📝 Колір тексту тултипа — темний */
            --tooltip-text: #1a1a1a;
            /* 🖼️ Колір рамки тултипа — напівпрозорий чорний */
            --tooltip-border: rgba(0, 0, 0, 0.1);
            /* 🌫️ Колір тіні тултипа — напівпрозорий чорний */
            --tooltip-shadow: rgba(0, 0, 0, 0.15);
        }
    `;
    
    // 📎 Додаємо <style> в <head>
    document.head.appendChild(style);
}

// ============================================================================
// 🎯 ЄДИНА ФУНКЦІЯ ДЛЯ ВСІХ ТУЛТИПІВ (FULLY DRY)
// ============================================================================
/**
 * 🎯 ЄДИНЕ МІСЦЕ для всіх тултипів
 * 🏗️ Архітектура: базові стилі + унікальні позиції + контейнери
 */
function styleAllTooltips() {
    // 🗑️ Видаляємо старий <style>, якщо існує
    const old = document.getElementById('all-tooltips-styles');
    if (old) old.remove();
    
    // 🆕 Створюємо новий <style> елемент
    const style = document.createElement('style');
    style.id = 'all-tooltips-styles';
    
    // 🎨 Визначаємо ВСІ стилі тултипів в одному місці (DRY)
    style.textContent = `
        /* ═══════════════════════════════════════════════════════════
           🎨 БАЗОВІ СТИЛІ ДЛЯ ВСІХ ТУЛТИПІВ (спільні)
           ═══════════════════════════════════════════════════════════ */
        
        /* 📌 Базовий контейнер для всіх тултипів — відносне позиціонування */
        [data-tooltip] {
            position: relative;
        }
        
        /* 🎨 Універсальний стиль тултипа (динамічна тема через CSS-змінні) */
        [data-tooltip]:hover::after {
            /* 📝 Контент тултипа з атрибута data-tooltip */
            content: attr(data-tooltip) !important;
            /* 📍 Абсолютне позиціонування відносно батьківського елемента */
            position: absolute !important;
            
            /* 🎨 Динамічна тема (оновлюється PaletteManager при зміні палітри) */
            background: var(--tooltip-bg) !important;
            backdrop-filter: blur(6px) !important;
            -webkit-backdrop-filter: blur(6px) !important;
            color: var(--tooltip-text) !important;
            border: 1px solid var(--tooltip-border) !important;
            box-shadow: 0 8px 30px var(--tooltip-shadow) !important;
            
            /* 📐 Базова геометрія тултипа */
            border-radius: 8px !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            opacity: 0;
            animation: tooltipFadeIn 0.2s ease forwards !important;
            text-shadow: none !important;
            z-index: 1000 !important;
        }
        
        /* ✨ Анімація плавної появи тултипа */
        @keyframes tooltipFadeIn {
            to { opacity: 1; }
        }
        
        /* ═══════════════════════════════════════════════════════════
           📍 УНІКАЛЬНІ ПОЗИЦІЇ для кожного типу тултипів
           ═══════════════════════════════════════════════════════════ */
        
        /* 📝 Тултипи форми (compound-form) — над лейблами полів вводу */
        form#compound-form label[data-tooltip]:hover::after {
            bottom: 120% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            font-size: 1.0rem !important;
            padding: 0.6rem 0.8rem !important;
            line-height: 1.0 !important;
        }

        /* 📁 Тултипи кнопок IMPORT/EXPORT — по центру над кнопкою */
        #import-button[data-tooltip]:hover::after,
        #export-button[data-tooltip]:hover::after,
        #export-schedule-button[data-tooltip]:hover::after,
        .buttons-group button[data-tooltip]:hover::after {
            bottom: 150% !important;
            left: 50% !important;
            margin-left: -60px !important;
            font-size: 1.0rem !important;
            padding: 0.8rem 1.2rem !important;
            z-index: 2000 !important;
            line-height: 1.0 !important;
        }

        /* 🔄 Тултипи кнопок UPDATE та RESET — по центру над кнопкою */
        #update-chart-button[data-tooltip]:hover::after,
        #reset-zoom-button[data-tooltip]:hover::after {
            bottom: 150% !important;
            left: 50% !important;
            margin-left: -60px !important;
            font-size: 1.0rem !important;
            padding: 0.8rem 1.2rem !important;
            z-index: 2000 !important;
            line-height: 1.0 !important;
        }

        /* ✅ Тултипи чекбоксів (combine, toggle-list, unit-switch) — найбільші */
        .cb-tooltip-label[data-tooltip]:hover::after {
            bottom: 135% !important;
            left: 50% !important;
            transform: translateX(-50%) translateY(0) !important;
            font-size: 1.08rem !important;
            padding: 0.65rem 1.1rem !important;
            border-radius: 10px !important;
            z-index: 10000 !important;
            line-height: 1.35 !important;
            font-weight: 600 !important;
            box-shadow: 0 10px 28px var(--tooltip-shadow), 0 0 0 1px var(--tooltip-border) !important;
            transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1),
                        transform 0.2s cubic-bezier(0.4,0,0.2,1) !important;
        }

        /* 🎨 Тултипи радіо-кнопок (палітри) — ширші, по центру */
        label.radio-tooltip[data-tooltip]:hover::after {
            bottom: 160% !important;
            left: 50% !important;
            margin-left: -140px !important;
            font-size: 1.1rem !important;
            padding: 0.6rem 1rem !important;
            z-index: 3000 !important;
            text-align: center !important;
        }

        /* 🌐 Тултип перемикача мови — ЗМІЩЕНО ВЛІВО (щоб не вилазив за межі) */
        #lang-toggle[data-tooltip]:hover::after {
        bottom: 150% !important;
        left: 30% !important;
        margin-left: -90px !important;
        font-size: 0.95rem !important;
        padding: 0.6rem 1.0rem !important;
        z-index: 2000 !important;
        line-height: 1.0 !important;
        white-space: nowrap !important;
        }
        
        /* ═══════════════════════════════════════════════════════════
           📱 МОБІЛЬНА АДАПТАЦІЯ — менші розміри, перенос тексту
           ═══════════════════════════════════════════════════════════ */
        
        /* 📱 Мобільна версія для екранів < 768px */
        @media (max-width: 768px) {
            /* 🎨 Радіо-кнопки на мобільних — менший розмір, перенос тексту */
            label.radio-tooltip[data-tooltip]:hover::after {
                font-size: 1rem !important;
                margin-left: -120px !important;
                max-width: 240px !important;
                white-space: normal !important;
            }
            
            /* ✅ Чекбокси на мобільних — менший розмір, перенос тексту */
            .cb-tooltip-label[data-tooltip]:hover::after {
                font-size: 1rem !important;
                max-width: 240px !important;
                white-space: normal !important;
                bottom: 115% !important;
                padding: 0.55rem 0.9rem !important;
            }
            
            /* 🌐 Перемикач мови на мобільних — ще більше вліво */
            #lang-toggle[data-tooltip]:hover::after {
                left: 20% !important;
                margin-left: -20px !important;
                font-size: 0.85rem !important;
                max-width: 200px !important;
            }
        }
        
        /* ═══════════════════════════════════════════════════════════
           📦 БАЗОВІ СТИЛІ КОНТЕЙНЕРІВ (для радіо та чекбоксів)
           ═══════════════════════════════════════════════════════════ */
        
        /* 🎨 Контейнер радіо-кнопок палітр — flexbox для вирівнювання */
        label.radio-tooltip {
            display: inline-flex !important;
            align-items: center !important;
            cursor: pointer !important;
            padding: 4px !important;
            border-radius: 4px !important;
        }
        
        /* 🎨 Самі радіо-кнопки — розмір 18x18px, синій акцент */
        label.radio-tooltip input[type="radio"] {
            cursor: pointer !important;
            width: 18px !important;
            height: 18px !important;
            accent-color: #007bff !important;
            margin: 0 !important;
        }
        
        /* ✅ Контейнер чекбоксів — flexbox з gap між елементами */
        .cb-tooltip-label {
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
            cursor: pointer !important;
            user-select: none !important;
        }
    `;
    
    // 📎 Додаємо <style> в <head>
    document.head.appendChild(style);

    // 🛡️ АВТО-ВИДАЛЕННЯ title атрибутів з елементів, що мають data-tooltip
    // Це гарантує, що не буде дублювання тултипів (наш + нативний браузерний)
    document.querySelectorAll('[data-tooltip][title]').forEach(el => {
        el.removeAttribute('title');
    });

    console.log('✅ styleAllTooltips injected (DRY + auto title removal)');
}

// ============================================================================
// 📅 КОНТЕЙНЕР ДАТИ
// ============================================================================
/**
 * 📅 Стилізація контейнера дати початку циклу
 * Градієнтний фон, синя рамка, тінь
 */
function styleDateContainer() {
    // 🆕 Створюємо <style> для контейнера дати
    const style = document.createElement('style');
    style.id = 'date-styles';
    
    // 📅 CSS для контейнера дати
    style.textContent = `
        /* 📅 Головний контейнер дати — градієнтний фон, синя рамка */
        #top-settings-container {
            background: linear-gradient(145deg, #e9f1fb, #d4e8f7) !important;
            border: 2px solid #a6b9e3 !important;
            border-radius: 12px !important;
            padding: 1.5rem 2rem !important;
            max-width: 180px !important;
            margin: 0 auto 2rem auto !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 1.5rem !important;
            box-shadow: 0 8px 25px rgba(166,185,227,0.3) !important;
        }
        
        /* 📅 Внутрішній контейнер дати — flexbox колонка */
        #cycle-date-container {
            flex-grow: 1 !important;
            min-width: 160px !important;
            display: flex !important;
            flex-direction: column !important;
        }
        
        /* 📅 Лейбл дати — жирний шрифт, синій колір */
        #cycle-date-container label {
            font-weight: 700 !important;
            margin-bottom: 0.5rem !important;
            color: #2c5282 !important;
            font-size: 1rem !important;
        }
        
        /* 📅 Поле вводу дати — білий фон, синя рамка, тінь */
        #cycle-date-container input {
            padding: 0.75rem !important;
            border: 2px solid #bee3f8 !important;
            border-radius: 8px !important;
            font-size: 1.1rem !important;
            background: white !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
            transition: all 0.3s ease !important;
        }
        
        /* 📅 Фокус на полі дати — яскравіша рамка, масштабування */
        #cycle-date-container input:focus {
            border-color: #4facfe !important;
            box-shadow: 0 0 0 4px rgba(79,172,254,0.2) !important;
            transform: scale(1.02) !important;
        }
    `;
    
    // 📎 Додаємо <style> в <head>
    document.head.appendChild(style);
}

// ============================================================================
// 📝 ФОРМА ДОДАВАННЯ СПОЛУК (тільки layout, БЕЗ тултипів)
// ============================================================================
/**
 * 📝 Layout форми додавання сполук
 * Grid 4 колонки, адаптивний для мобільних
 * Тултипи обробляються в styleAllTooltips()
 */
function styleCompoundForm() {
    // 🗑️ Видаляємо старий <style>, якщо існує
    const oldStyle = document.getElementById('form-styles');
    if (oldStyle) oldStyle.remove();
    // 🎨 Встановлюємо колір кнопки submit (світло-блакитний)
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.style.backgroundColor = 'lightblue';
    
    // 🆕 Створюємо новий <style> для форми
    const style = document.createElement('style');
    style.id = 'form-styles';
    
    // 📝 CSS для форми додавання сполук
    style.textContent = `
        /* 📝 Grid контейнер форми — 4 колонки на десктопі */
        form#compound-form {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0.25rem !important;
            max-width: 900px !important;
            margin: 0 auto 0.75rem auto !important;
            padding: 1rem !important;
            background: #f8f9fa !important;
            border-radius: 8px !important;
        }
        
        /* 📝 Лейбли форми — жирний шрифт, uppercase, курсор help */
        form#compound-form label {
            display: block !important;
            margin-bottom: 0.25rem !important;
            color: #000000 !important;
            font-weight: 700 !important;
            font-size: 0.75rem !important;
            font-family: 'Roboto', 'Helvetica Neue', sans-serif !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
            position: relative !important;
            cursor: help !important;
        }
        
        /* 📝 Поля вводу та селекты — ширина 100%, жирний шрифт */
        form#compound-form input,
        form#compound-form select {
            width: 100% !important;
            padding: 0.4rem 0.5rem !important;
            border: 1px solid #ced4da !important;
            border-radius: 6px !important;
            color: #000000 !important;
            font-weight: 700 !important;
            font-size: 0.9rem !important;
            font-family: 'Roboto', 'Helvetica Neue', sans-serif !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
            height: 36px !important;
            box-sizing: border-box !important;
        }
        
        /* 📱 Мобільна версія форми — 1 колонка для екранів < 768px */
        @media (max-width: 768px) {
            form#compound-form {
                grid-template-columns: 1fr !important;
                gap: 0.5rem !important;
            }
        }
    `;
    
    // 📎 Додаємо <style> в <head>
    document.head.appendChild(style);
    
    // ⏱️ Оновлюємо тултипи форми через 100мс (після рендерингу)
    setTimeout(() => {
        if (typeof labelTooltips !== 'undefined' && labelTooltips) refreshFormTooltips();
    }, 100);
}

// ============================================================================
// 🔘 ГРУПА КНОПОК (тільки layout, БЕЗ тултипів)
// ============================================================================
/**
 * 🔘 Layout групи кнопок управління
 * Flexbox з переносом, синій фон, тіні
 * Тултипи обробляються в styleAllTooltips()
 */
function styleButtonsGroup() {
    // 🗑️ Видаляємо старий <style>, якщо існує
    const oldStyle = document.getElementById('buttons-styles');
    if (oldStyle) oldStyle.remove();
    
    // 🆕 Створюємо новий <style> для кнопок
    const style = document.createElement('style');
    style.id = 'buttons-styles';
    
    // 🔘 CSS для групи кнопок
    style.textContent = `
        /* 🔘 Контейнер групи кнопок — flexbox з переносом */
        .buttons-group {
            display: flex !important;
            align-items: center !important;
            gap: 1rem !important;
            max-width: 900px !important;
            margin: 2rem auto !important;
            padding: 0 1rem !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
        }
        
        /* 🔘 Самі кнопки — синій фон, білий текст, тінь */
        .buttons-group button,
        #update-chart-button,
        #reset-zoom-button,
        #import-button,
        #export-button,
        #export-schedule-button {
            margin-left: 5px !important;
            background: #007bff !important;
            border: 2px solid #0056b3 !important;
            color: white !important;
            padding: 0.125rem 0.125rem !important;
            font-weight: 600 !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 1.75rem !important;
            box-shadow: 0 2px 8px rgba(0,123,255,0.3) !important;
            transition: all 0.2s ease !important;
            min-height: 48px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
        }
        
        /* 🔘 Hover ефект кнопок — темніший фон, підняття вгору */
        .buttons-group button:hover,
        #update-chart-button:hover,
        #reset-zoom-button:hover,
        #import-button:hover,
        #export-button:hover,
        #export-schedule-button:hover {
            background: #0056b3 !important;
            border-color: #004085 !important;
            box-shadow: 0 6px 15px rgba(0,123,255,0.5) !important;
            transform: translateY(-2px);
        }
        
        /* 📱 Мобільна версія кнопок — вертикально для екранів < 768px */
        @media (max-width: 768px) {
            .buttons-group {
                flex-direction: column !important;
                gap: 0.75rem !important;
            }
            
            .buttons-group button,
            #update-chart-button,
            #reset-zoom-button,
            #import-button,
            #export-button,
            #export-schedule-button {
                width: 100% !important;
                max-width: 280px !important;
                margin: 0 auto !important;
            }
        }
    `;
    
    // 📎 Додаємо <style> в <head>
    document.head.appendChild(style);
}

// ============================================================================
// 📊 КОНТЕЙНЕР ГРАФІКА
// ============================================================================
/**
 * 📊 Стилізація контейнера графіка
 * Максимальна ширина 1200px, висота 450px
 * Приховує стандартні елементи Highcharts
 */
function styleChartContainer() {
    // 🆕 Створюємо <style> для контейнера графіка
    const style = document.createElement('style');
    style.id = 'chart-styles';
    
    // 📊 CSS для контейнера графіка
    style.textContent = `
        /* 📊 Контейнер графіка — максимальна ширина 1200px, висота 450px */
        #chart-container {
            max-width: 1200px !important;
            width: 100% !important;
            margin: 0 auto !important;
            height: 450px !important;
            border-radius: 12px !important;
        }
        
        /* 📊 Приховуємо зайві елементи Highcharts (заголовок, кредити) */
        .highcharts-title,
        .highcharts-credits {
            display: none !important;
        }
        
        /* 📊 Приховуємо кнопку скидання зуму Highcharts */
        .highcharts-reset-zoom {
            display: none !important;
        }
        
        /* 📱 Адаптивна висота графіка для екранів < 1200px */
        @media (max-width: 1200px) {
            #chart-container {
                max-width: 100% !important;
                height: 400px !important;
            }
        }
    `;
    
    // 📎 Додаємо <style> в <head>
    document.head.appendChild(style);
}

// ============================================================================
// 📋 СПИСОК СПОЛУК
// ============================================================================
/**
 * 📋 Стилізація списку доданих сполук
 * Білий фон, сіра рамка, тінь
 * Компактний padding для елементів
 */
function styleCompoundList() {
    // 🆕 Створюємо <style> для списку сполук
    const style = document.createElement('style');
    style.id = 'compound-list-styles';
    
    // 📋 CSS для списку сполук
    style.textContent = `
        /* 📋 Контейнер списку сполук — білий фон, сіра рамка, тінь */
        #compound-list {
            max-width: 1200px !important;
            width: 100% !important;
            margin: 0 auto 1rem auto !important;
            padding: 0 1rem !important;
            background: #fff !important;
            border-radius: 8px !important;
            border: 1px solid #dee2e6 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }
        
        /* 📋 Окремий елемент списку — padding, margin, сірий фон */
        .compound-item {
            padding: 12px !important;
            margin: 4px 0 !important;
            border-radius: 6px !important;
            background: #f8f9fa !important;
        }
        
        /* 📱 Адаптивний padding для мобільних екранів < 1200px */
        @media (max-width: 1200px) {
            #compound-list {
                max-width: 100% !important;
                padding: 0 0.5rem !important;
            }
        }
    `;
    
    // 📎 Додаємо <style> в <head>
    document.head.appendChild(style);
}

// ============================================================================
// 🚀 ГОЛОВНА ФУНКЦІЯ — ЗАСТОСУВАННЯ ВСІХ СТИЛІВ
// ============================================================================
/**
 * 🚀 Застосовує всі стилі додатку
 * Порядок викликів важливий для коректної роботи
 */
function applyAllStyles() {
    styleTooltipVariables();   // 🎨 1. CSS-змінні для тултипів
    styleAllTooltips();        // 🎯 2. Єдина функція для ВСІХ тултипів (FULLY DRY)
    styleDateContainer();      // 📅 3. Контейнер дати
    styleCompoundForm();       // 📝 4. Форма (тільки layout)
    if (typeof initRadioTooltipsText === 'function') {
        initRadioTooltipsText();  // Визначена в script-xxx.js
    }   // 🎨 5. Радіо-кнопки (палітри) — текст
    styleButtonsGroup();       // 🔘 6. Кнопки (тільки layout)
    styleChartContainer();     // 📊 7. Графік
    styleCompoundList();       // 📋 8. Список сполук
}

// ============================================================================
// 🆕 ЕКСПОРТ ФУНКЦІЙ У ГЛОБАЛЬНИЙ ОБ'ЄКТ
// ============================================================================
window.styleTooltipVariables = styleTooltipVariables;
window.styleAllTooltips = styleAllTooltips;
window.styleDateContainer = styleDateContainer;
window.styleCompoundForm = styleCompoundForm;
window.styleButtonsGroup = styleButtonsGroup;
window.styleChartContainer = styleChartContainer;
window.styleCompoundList = styleCompoundList;
window.applyAllStyles = applyAllStyles;

// ============================================================================
// 🏁 EOF styles.js v2.1.0 — FULLY DRY REFACTORED
// ============================================================================
