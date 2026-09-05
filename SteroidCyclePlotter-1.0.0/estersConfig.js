// ============================================================================
// ⚙️ КОНФІГУРАЦІЯ ЕСТЕРІВ — (ARCHITECTURE: DYNAMIC cM CALCULATION)
// 🔧 molecularWeight: ТІЛЬКИ реальні хімічні значення
// 🔧 concentrationMultiplier: РОЗРАХОВУЄТЬСЯ АВТОМАТИЧНО (base_MW / ester_MW)
// 🔧 normalizationDivisor: ТІЛЬКИ візуальне масштабування графіка
// 🔧 bioavailability: ТІЛЬКИ фармакокінетика (частка дози в крові)
// ============================================================================

// ============================================================================
// ⚙️ КОНФІГУРАЦЯ ЕСТЕРІВ
// ============================================================================
// 📌 Версія цього модуля — ЗМІНЮЙ ТІЛЬКИ ТУТ
const ESTERS_CONFIG_VERSION = '1.0.0';

// 📦 Експорт версії для зовнішнього доступу
window.SteroidPlotter = window.SteroidPlotter || {};
window.SteroidPlotter.estersConfigVersion = ESTERS_CONFIG_VERSION;

/**
 * 🧬 БАЗОВІ МОЛЕКУЛЯРНІ ВАГИ АКТИВНИХ РЕЧОВИН (без ефіру)
 * Використовується для автоматичного розрахунку concentrationMultiplier
 * 
 * Формула: concentrationMultiplier = base_MW / ester_MW
 * Приклад: TestE → 288.43 / 400.59 = 0.720 (72% активного тестостерону в 1 мг енантату)
 */
const BASE_MOLECULAR_WEIGHTS = {
    testosterone: 288.43,   // Testosterone base
    nandrolone: 274.40,     // Nandrolone (19-nor) base
    trenbolone: 270.37,     // Trenbolone base
    boldenone: 286.41,      // Boldenone (EQ) base
    drostanolone: 304.45,   // Drostanolone (Masteron) base
    methenolone: 344.51,    // Methenolone (Primobolan) base
    // 🆕 Додавай нові бази за потреби
};

/**
 * 🔍 Визначає базову молекулярну вагу за назвою сполуки
 * @param {string} compoundName - Назва з estersConfig (напр. "TestosteroneEnanthate")
 * @returns {number|null} Базова MW або null, якщо не знайдено
 */
function getBaseMolecularWeight(compoundName) {
    if (!compoundName || typeof compoundName !== 'string') return null;
    
    const nameLower = compoundName.toLowerCase();
    for (const [baseName, mw] of Object.entries(BASE_MOLECULAR_WEIGHTS)) {
        if (nameLower.includes(baseName.toLowerCase())) {
            return mw;
        }
    }
    return null; // невідома база → концентрація не корегується
}

/**
 * 🔬 Розраховує concentrationMultiplier динамічно
 * Формула: active_base_MW / ester_MW
 * 
 * @param {string} compoundName - Назва сполуки
 * @param {Object} config - Конфігурація з estersConfig
 * @returns {number} concentrationMultiplier (0.0–1.0)
 */
function calculateConcentrationMultiplier(compoundName, config) {
    // ✅ Пріоритет 1: явно задане значення (для винятків)
    if (typeof config?.concentrationMultiplier === 'number' && config.concentrationMultiplier > 0) {
        return config.concentrationMultiplier;
    }
    
    // ✅ Пріоритет 2: сполука без ефіру (оральні, база) або невідомий MW → 1.0
    if (!config?.molecularWeight || config.molecularWeight < 100) {
        return 1.0;
    }
    
    // ✅ Пріоритет 3: розрахунок з MW
    const baseMW = getBaseMolecularWeight(compoundName);
    const esterMW = config.molecularWeight;
    
    // ⚠️ Якщо невідома база або ester_MW ≈ base_MW → 1.0
    if (!baseMW || esterMW <= baseMW * 0.95) {
        return 1.0;
    }
    
    // 🎯 Формула: частка активної речовини в ефірі
    const cM = baseMW / esterMW;
    
    // 🔍 Валідація діапазону (захист від помилок у даних)
    if (cM < 0.5 || cM > 1.0) {
        console.warn(`⚠️ ${compoundName}: підозрілий cM=${cM.toFixed(4)} (base=${baseMW}, ester=${esterMW})`);
    }
    
    return +cM.toFixed(4); // округлення до 4 знаків
}

/**
 * 🔍 Валідація estersConfig: перевіряє узгодженість конфігурації
 * Викликається при ініціалізації додатку
 */
function validateEstersConfig() {
    if (typeof window.estersConfig !== 'object') {
        console.error('❌ estersConfig не завантажено!');
        return false;
    }
    
    let warnings = 0, errors = 0;
    
    Object.entries(window.estersConfig).forEach(([name, cfg]) => {
        // 🔹 Перевірка halfLife
        if (cfg.halfLife !== null && (typeof cfg.halfLife !== 'number' || cfg.halfLife <= 0)) {
            console.error(`❌ ${name}: invalid halfLife=${cfg.halfLife}`);
            errors++;
        }
        
        // 🔹 Перевірка molecularWeight
        if (cfg.molecularWeight !== null && (typeof cfg.molecularWeight !== 'number' || cfg.molecularWeight < 100)) {
            console.warn(`⚠️ ${name}: suspicious molecularWeight=${cfg.molecularWeight}`);
            warnings++;
        }
        
        // 🔹 Перевірка узгодженості cM з MW (якщо задано вручну)
        if (cfg.concentrationMultiplier !== undefined && cfg.molecularWeight && cfg.molecularWeight >= 100) {
            const baseMW = getBaseMolecularWeight(name);
            if (baseMW) {
                const calculatedCM = +(baseMW / cfg.molecularWeight).toFixed(4);
                const diff = Math.abs(cfg.concentrationMultiplier - calculatedCM);
                if (diff > 0.001) {
                    console.warn(`⚠️ ${name}: cM=${cfg.concentrationMultiplier} ≠ розрахунок ${calculatedCM} (base=${baseMW}, ester=${cfg.molecularWeight})`);
                    warnings++;
                }
            }
        }
        
        // 🔹 Перевірка normalizationDivisor vs halfLife
        if (cfg.normalizationDivisor !== undefined && cfg.halfLife !== null) {
            const ratio = cfg.normalizationDivisor / cfg.halfLife;
            if (ratio < 0.5 || ratio > 3.0) {
                console.warn(`⚠️ ${name}: normalizationDivisor (${cfg.normalizationDivisor}) сильно відрізняється від halfLife (${cfg.halfLife})`);
                warnings++;
            }
        }
    });
    
    console.log(`✅ estersConfig validated: ${Object.keys(window.estersConfig).length} entries, ${warnings} warnings, ${errors} errors`);
    return errors === 0;
}

// ============================================================================
// 🧪 ЕКСПОРТ ФУНКЦІЙ У ГЛОБАЛЬНИЙ ОБ'ЄКТ
// ============================================================================
window.getBaseMolecularWeight = getBaseMolecularWeight;
window.calculateConcentrationMultiplier = calculateConcentrationMultiplier;
window.validateEstersConfig = validateEstersConfig;
window.BASE_MOLECULAR_WEIGHTS = { ...BASE_MOLECULAR_WEIGHTS };

// ============================================================================
// 📦 КОНФІГУРАЦІЯ СПОЛУК — concentrationMultiplier РОЗРАХОВУЄТЬСЯ АВТОМАТИЧНО
// ============================================================================
/**
 * 🎯 АРХІТЕКТУРА ПАРАМЕТРІВ:
 * 
 * 🔹 molecularWeight:
 *    • Реальна хімічна молекулярна вага ефіру (g/mol)
 *    • Використовується для авто-розрахунку concentrationMultiplier
 *    • Приклад: TestE = 400.59 g/mol
 * 
 * 🔹 concentrationMultiplier (ОПЦІОНАЛЬНО):
 *    • За замовчуванням: base_MW / ester_MW (розраховується автоматично)
 *    • Вказуй вручну ТІЛЬКИ для:
 *      - Оральных сполук без ефіру: 1.0
 *      - Нестандартної хімії
 *      - Тестування/калібрування
 * 
 * 🔹 normalizationDivisor:
 *    • ТІЛЬКИ для візуального масштабування графіка
 *    • Рекомендація: = halfLife для стандартного масштабу
 * 
 * 🔹 bioavailability (F):
 *    • ТІЛЬКИ фармакокінетика (частка дози, що потрапила в кров)
 *    • Діапазон: 0.0–1.0 (1.0 = 100%)
 *    • За замовчуванням: 1.0 (якщо не вказано)
 */

window.estersConfig = {
    // ========================================================================
    // 🔥 TESTOSTERONES (base MW: 288.43 g/mol)
    // ========================================================================
    TestosteronePropionate: {
        halfLife: 1.00,
        normalizationDivisor: 1.0,
        targetTmax: 0.75,                  // 18h
        keModifier: 1.0,
        molecularWeight: 344.48,           // ✅ cM = 288.43/344.48 = 0.837 (авто)
        route: 'injection'
    },
    TestosteroneDipropionate: {
        halfLife: 1.80,
        normalizationDivisor: 1.8,
        targetTmax: 1.2,                   // 28.8h
        keModifier: 1.05,
        molecularWeight: 400.54,           // ✅ cM = 288.43/400.54 = 0.720 (авто)
        route: 'injection'
    },
    TestosteronePhenylpropionate: {
        halfLife: 4.50,
        normalizationDivisor: 4.5,
        targetTmax: 1.8,                   // 43.2h
        keModifier: 1.0,
        molecularWeight: 420.56,           // ✅ cM = 288.43/420.56 = 0.686 (авто)
        route: 'injection'
    },
    TestosteroneEnanthate: {
        halfLife: 5.00,
        normalizationDivisor: 5.0,
        targetTmax: 1.5,                   // 36h
        keModifier: 1.0,
        molecularWeight: 400.59,           // ✅ cM = 288.43/400.59 = 0.720 (авто)
        route: 'injection'
    },
    TestosteroneIsocaproate: {
        halfLife: 8.00,
        normalizationDivisor: 8.0,
        targetTmax: 2.0,                   // 48h
        keModifier: 1.0,
        molecularWeight: 386.56,           // ✅ cM = 288.43/386.56 = 0.746 (авто)
        route: 'injection'
    },
    TestosteroneCaproate: {
        halfLife: 10.0,
        normalizationDivisor: 10.0,
        targetTmax: 2.5,                   // 60h
        keModifier: 1.0,
        molecularWeight: 386.56,           // ✅ cM = 288.43/386.56 = 0.746 (авто)
        route: 'injection'
    },
    TestosteroneCypionate: {
        halfLife: 8.00,
        normalizationDivisor: 8.0,
        targetTmax: 2.3,                   // 55.2h
        keModifier: 1.0,
        molecularWeight: 412.61,           // ✅ cM = 288.43/412.61 = 0.699 (авто)
        route: 'injection'
    },
    TestosteroneDecanoate: {
        halfLife: 12.0,
        normalizationDivisor: 12.0,
        targetTmax: 3.0,                   // 72h
        keModifier: 1.0,
        molecularWeight: 442.66,           // ✅ cM = 288.43/442.66 = 0.652 (авто)
        route: 'injection'
    },
    TestosteroneUndecanoate: {
        halfLife: 25.0,
        normalizationDivisor: 25.0,
        targetTmax: 4.6,                   // 110.4h
        keModifier: 1.0,
        molecularWeight: 456.69,           // ✅ cM = 288.43/456.69 = 0.632 (авто)
        bioavailability: 1.00,
        route: 'injection'
    },

    // ========================================================================
    // 💉 EQ (Boldenone base MW: 286.41 g/mol)
    // ========================================================================
    BoldenoneCypionate: {
        halfLife: 9.00,
        normalizationDivisor: 9.0,
        targetTmax: 3.0,                   // 72h — типове для cypionate ester
        keModifier: 1.0,
        molecularWeight: 452.64,           // ✅ cM = 286.41/452.64 = 0.633 (авто)
        route: 'injection'
    },

    BoldenoneUndecylenate: {
        halfLife: 14.0,
        normalizationDivisor: 14.0,
        targetTmax: 4.0,                   // 96h
        keModifier: 1.0,
        molecularWeight: 452.67,           // ✅ cM = 286.41/452.67 = 0.633 (авто)
        route: 'injection'
    },

    // ========================================================================
    // 💉 DHT DERIVATIVES (Drostanolone base MW: 304.45 g/mol)
    // ========================================================================
    DrostanolonePropionate: {
        halfLife: 2.00,
        normalizationDivisor: 2.0,
        targetTmax: 1.1,                   // 26.4h
        keModifier: 1.0,
        molecularWeight: 360.51,           // ✅ cM = 304.45/360.51 = 0.844 (авто)
        route: 'injection'
    },
    DrostanoloneEnanthate: {
        halfLife: 7.00,
        normalizationDivisor: 7.0,
        targetTmax: 1.9,                   // 45.6h
        keModifier: 1.0,
        molecularWeight: 416.61,           // ✅ cM = 304.45/416.61 = 0.731 (авто)
        route: 'injection'
    },

    // ========================================================================
    // Methenolone base MW: 344.51 g/mol
    // ========================================================================
    MethenoloneEnanthate: {
        halfLife: 10.5,
        normalizationDivisor: 10.5,
        targetTmax: 2.5,                   // 60h
        keModifier: 1.1,
        molecularWeight: 456.67,           // ✅ cM = 344.51/456.67 = 0.754 (авто)
        route: 'injection'
    },
    MethenoloneAcetate: {
        halfLife: 4.50,
        normalizationDivisor: 4.5,
        targetTmax: 0.125,                 // 3h
        keModifier: 1.0,
        molecularWeight: 344.51,           // ✅ cM = 1.0 (оральний, база, ефір мінімальний)
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: oral base, no significant ester
        route: 'oral'
    },

    // ========================================================================
    // 💉 19-NOR (Nandrolone base MW: 274.40 g/mol)
    // ========================================================================
    NandroloneDecanoate: {
        halfLife: 12.0,
        normalizationDivisor: 12.0,
        targetTmax: 3.0,                   // 72h
        keModifier: 1.0,
        molecularWeight: 428.64,           // ✅ cM = 274.40/428.64 = 0.640 (авто)
        route: 'injection'
    },
    NandrolonePhenylpropionate: {
        halfLife: 4.50,
        normalizationDivisor: 4.5,
        targetTmax: 1.8,                   // 43.2h
        keModifier: 0.9,
        molecularWeight: 406.56,           // ✅ cM = 274.40/406.56 = 0.675 (авто)
        route: 'injection'
    },

    // ========================================================================
    // 💉 TRENBOLONE (base MW: 270.37 g/mol)
    // ========================================================================
    TrenboloneAcetate: {
        halfLife: 1.00,
        normalizationDivisor: 1.0,
        targetTmax: 1.0,                   // 24h
        keModifier: 1.0,
        molecularWeight: 312.40,           // ✅ cM = 270.37/312.40 = 0.866 (авто)
        route: 'injection'
    },
    TrenboloneEnanthate: {
        halfLife: 8.00,
        normalizationDivisor: 8.0,
        targetTmax: 2.5,                   // 60h
        keModifier: 1.2,
        molecularWeight: 382.53,           // ✅ cM = 270.37/382.53 = 0.707 (авто)
        route: 'injection'
    },
    TrenboloneHexahydrobenzylcarbonate: {
        halfLife: 10.0,
        normalizationDivisor: 10.0,
        targetTmax: 3.0,                   // 72h
        keModifier: 1.25,
        molecularWeight: 430.50,           // ✅ cM = 270.37/430.50 = 0.628 (авто)
        route: 'injection'
    },

    // ========================================================================
    // 💊 ORAL AAS — concentrationMultiplier = 1.0 (немає ефіру)
    // ========================================================================
    Mesterolone: {
        halfLife: 0.50,
        normalizationDivisor: 0.50,
        bioavailability: 0.70,             // 🧬 F ≈ 70%
        targetTmax: 0.14,                  // 3.4h
        keModifier: 1.0,
        molecularWeight: 304.44,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: oral, no ester
        route: 'oral'
    },
    Stanozolol: {
        halfLife: 0.38,
        normalizationDivisor: 0.38,
        bioavailability: 0.95,             // 🧬 F ≈ 95%
        targetTmax: 0.083,                 // 2h
        keModifier: 1.0,
        molecularWeight: 328.49,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: oral, no ester
        route: 'oral'
    },
    Oxymetholone: {
        halfLife: 0.33,
        normalizationDivisor: 0.33,
        bioavailability: 0.50,             // 🧬 F ≈ 50%
        targetTmax: 0.0625,                // 1.5h
        keModifier: 1.1,
        molecularWeight: 332.48,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: oral, no ester
        route: 'oral'
    },
    Oxandrolone: {
        halfLife: 0.25,
        normalizationDivisor: 0.25,
        bioavailability: 0.97,             // 🧬 F ≈ 97%
        targetTmax: 0.07,                  // 1.7h
        keModifier: 1.0,
        molecularWeight: 306.44,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: oral, no ester
        route: 'oral'
    },
    Methandienone: {
        halfLife: 0.13,
        normalizationDivisor: 0.13,
        bioavailability: 0.55,             // 🧬 F ≈ 55%
        targetTmax: 0.042,                 // 1h
        keModifier: 1.2,
        molecularWeight: 300.44,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: oral, no ester
        route: 'oral'
    },

    // ========================================================================
    // 💊 PCT & АНТАГОНІСТИ (не AAS) — concentrationMultiplier = 1.0
    // ========================================================================
    Clomiphene: {
        halfLife: 5.00,
        normalizationDivisor: 32.0,        // 🎨 візуальне зниження (низькі дози)
        targetTmax: 0.21,                  // 5h
        keModifier: 1.0,
        molecularWeight: 563.64,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Tamoxifen: {
        halfLife: 7.00,
        normalizationDivisor: 32.0,        // 🎨 візуальне зниження (низькі дози)
        targetTmax: 0.25,                  // 6h
        keModifier: 1.0,
        molecularWeight: 563.64,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },

    // ========================================================================
    // 💉 HCG (білок, розрахунок через IU) — concentrationMultiplier = 1.0
    // ========================================================================
    HCG_PCT: {
        halfLife: 2.50,
        normalizationDivisor: 2.5,
        targetTmax: 0.35,                  // 8.4h
        keModifier: 1.2,
        molecularWeight: 26000,            // 🧪 емпірично для візуального балансу
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: білок, не стероїд
        route: 'injection'
    },
    HCG: {
        halfLife: 3.00,
        normalizationDivisor: 3.0,
        targetTmax: 0.42,                  // 10h
        keModifier: 1.0,
        molecularWeight: 21500,            // 🧪 емпірично для візуального балансу
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: білок, не стероїд
        route: 'injection'
    },

    // ========================================================================
    // 💊 AI / ПРОЛАКТИН / ДІУРЕТИКИ / BP / PROSTATE — concentrationMultiplier = 1.0
    // ========================================================================
    Cabergoline: {
        halfLife: 2.71,
        normalizationDivisor: 0.2,         // 🎨 візуальне підвищення (мікродози)
        targetTmax: 0.125,                 // 3h
        keModifier: 0.8,
        molecularWeight: 451.61,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Anastrozole: {
        halfLife: 2.08,
        normalizationDivisor: 0.2,         // 🎨 візуальне підвищення (мікродози)
        targetTmax: 0.083,                 // 2h
        keModifier: 1.0,
        molecularWeight: 293.38,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Exemestane: {
        halfLife: 1.00,
        normalizationDivisor: 32.0,        // 🎨 візуальне зниження
        targetTmax: 0.0625,                // 1.5h
        keModifier: 1.0,
        molecularWeight: 296.41,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Finasteride: {
        halfLife: 0.25,
        normalizationDivisor: 0.025,       // 🎨 візуальне підвищення (мікродози)
        targetTmax: 0.05,                  // 1.2h
        keModifier: 1.0,
        molecularWeight: 372.55,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Spironolactone: {
        halfLife: 0.670,
        normalizationDivisor: 32.0,        // 🎨 візуальне зниження
        targetTmax: 0.125,                 // 3h
        keModifier: 1.0,
        molecularWeight: 416.58,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Furosemide: {
        halfLife: 0.083,
        normalizationDivisor: 64.0,        // 🎨 візуальне зниження
        targetTmax: 0.035,                 // 0.8h
        keModifier: 1.2,
        molecularWeight: 330.74,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Amlodipine: {
        halfLife: 35.0,
        normalizationDivisor: 0.5,         // 🎨 візуальне підвищення
        targetTmax: 0.35,                  // 8.4h
        keModifier: 1.0,
        molecularWeight: 409.00,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Bisoprolol: {
        halfLife: 12.0,
        normalizationDivisor: 0.5,         // 🎨 візуальне підвищення
        targetTmax: 0.125,                 // 3h
        keModifier: 1.0,
        molecularWeight: 767.00,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Tamsulosin: {
        halfLife: 15.0,
        normalizationDivisor: 0.25,        // 🎨 візуальне підвищення
        targetTmax: 0.21,                  // 5h
        keModifier: 1.0,
        molecularWeight: 445.00,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },
    Doxazosin: {
        halfLife: 22.0,
        normalizationDivisor: 0.8,         // 🎨 візуальне підвищення
        targetTmax: 0.104,                 // 2.5h
        keModifier: 1.0,
        molecularWeight: 547.60,
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: нестероїдна сполука
        route: 'oral'
    },

    // ========================================================================
    // 🔁 CUSTOM (дефолтні значення)
    // ========================================================================
    Custom: {
        halfLife: null,                    // 🧩 вказуй вручну
        normalizationDivisor: null,        // 🎨 за замовчуванням = halfLife
        bioavailability: 1.0,              // 🧬 за замовчуванням 100%
        kaMultiplier: 4.5,                 // ⚙️ дефолтна швидкість всмоктування
        keModifier: 1.0,                   // ⚙️ дефолтна швидкість виведення
        molecularWeight: null,             // 🧪 опціонально
        concentrationMultiplier: 1.0,      // 🎯 ВРУЧНУ: дефолт для custom
        route: 'injection'                 // 💊 або 'oral'
    }
};

// ============================================================================
// 🏁 ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ
// ============================================================================
(function init() {
    // 🔧 Експорт у глобальний об'єкт для зовнішнього доступу
    window.SteroidPlotter = window.SteroidPlotter || {};
    
    // 🔍 Авто-валідація при завантаженні (в режимі розробки)
    if (typeof window.addEventListener !== 'undefined') {
        window.addEventListener('load', () => {
            if (typeof validateEstersConfig === 'function') {
                validateEstersConfig();
            }
        });
    }

    // ============================================================================
    // 📦 ЦЕНТРАЛІЗОВАНІ МЕТАДАНІ (Single Source of Truth)
    // ============================================================================
    window.COMPOUND_METADATA = {
        // 🗂️ Категорії для групування в UI
        categories: {
            '🏋️ TESTOSTERONES': [
                'TestosteronePropionate', 'TestosteroneDipropionate', 'TestosteronePhenylpropionate',
                'TestosteroneEnanthate', 'TestosteroneIsocaproate', 'TestosteroneCaproate',
                'TestosteroneCypionate', 'TestosteroneDecanoate', 'TestosteroneUndecanoate'
            ],
            '⚡ EQ': ['BoldenoneCypionate', 'BoldenoneUndecylenate'],
            '🔥 DHT DERIVATIVES': [
                'DrostanolonePropionate', 'DrostanoloneEnanthate',
                'MethenoloneAcetate', 'MethenoloneEnanthate'
            ],
            '💪 19-NOR': [
                'NandroloneDecanoate', 'NandrolonePhenylpropionate',
                'TrenboloneAcetate', 'TrenboloneEnanthate', 'TrenboloneHexahydrobenzylcarbonate'
            ],
            '💊 ORAL STEROIDS': [
                'Mesterolone', 'Stanozolol', 'Oxymetholone', 'Oxandrolone', 'Methandienone'
            ],
            '💊 PCT': [
                'Clomiphene', 'Tamoxifen', 'HCG_PCT', 'HCG'
            ],
            '💊 SUPPORT': [
                'Anastrozole', 'Exemestane', 'Cabergoline', 'Finasteride',
                'Spironolactone', 'Furosemide', 'Amlodipine', 'Bisoprolol', 'Tamsulosin', 'Doxazosin'
            ]
        },

        // 💡 Підказки для поля дози (Placeholders)
        placeholders: {
            'HCG': '125, 250, 500 IU', 'HCG_PCT': '125, 250, 500 IU',
            'Mesterolone': 'e.g. 25 mg', 'Stanozolol': 'e.g. 50 mg',
            'Oxymetholone': 'e.g. 50 mg', 'Oxandrolone': 'e.g. 40 mg',
            'Methandienone': 'e.g. 30 mg', 'Clomiphene': 'e.g. 50 mg',
            'Tamoxifen': 'e.g. 20 mg', 'Anastrozole': 'e.g. 0.25 mg',
            'Exemestane': 'e.g. 25 mg', 'Cabergoline': 'e.g. 0.25 mg',
            'Finasteride': 'e.g. 0.05-0.2 mg', 'Spironolactone': 'e.g. 25 mg',
            'Furosemide': 'e.g. 40 mg', 'Amlodipine': 'e.g. 5-10 mg',
            'Bisoprolol': 'e.g. 2.5-5 mg', 'Tamsulosin': 'e.g. 0.4 mg',
            'Doxazosin': 'e.g. 2-4 mg'
        },

        // 🏷️ Спеціальні назви для відображення (перевизначають авто-форматування)
        displayNames: {
            'TestosteroneUndecanoate': 'Test Undecanoate (Nebido)',
            'BoldenoneCypionate': 'Boldenone Cypionate (EQ-Cyp)',
            'BoldenoneUndecylenate': 'Boldenone Undecylenate (EQ)',
            'DrostanolonePropionate': 'Drostanolone Propionate (Masteron)',
            'DrostanoloneEnanthate': 'Drostanolone Enanthate (Masteron-E)',
            'MethenoloneAcetate': 'Primo Oral',
            'MethenoloneEnanthate': 'Primobolan (Enanthate)',
            'NandroloneDecanoate': 'Nandrolone Decanoate (Deca)',
            'TrenboloneHexahydrobenzylcarbonate': 'Trenbolone Hex (Parabolan)',
            'Mesterolone': 'Mesterolone (Proviron)',
            'Stanozolol': 'Stanozolol (Winstrol)',
            'Oxymetholone': 'Oxymetholone (Anadrol)',
            'Oxandrolone': 'Oxandrolone (Anavar)',
            'Methandienone': 'Methandienone (Dianabol)',
            'Clomiphene': 'Clomid (Clomiphene)',
            'Tamoxifen': 'Nolvadex (Tamoxifen)',
            'HCG_PCT': 'HCG (PCT Protocol)',
            'Cabergoline': 'Cabergoline (Dostinex)',
            'Anastrozole': 'Anastrozole (Arimidex)',
            'Exemestane': 'Exemestane (Aromasin)',
            'Tamsulosin': 'Tamsulosin (Flomax)',
            'Doxazosin': 'Doxazosin (Cardura)'
        }
    };

    /**
     * 🔧 Допоміжна функція: отримати плоский список усіх стероїдних сполук
     * Використовується в generateSeries.js для режиму "Combine"
     */
    window.getSteroidCompounds = function() {
        const steroids = [];
        const steroidCategories = ['🏋️ TESTOSTERONES', '⚡ EQ', '🔥 DHT DERIVATIVES', '💪 19-NOR', '💊 ORAL STEROIDS'];
        steroidCategories.forEach(cat => {
            if (window.COMPOUND_METADATA.categories[cat]) {
                steroids.push(...window.COMPOUND_METADATA.categories[cat]);
            }
        });
        return steroids;
    };

    console.log(`🧬 estersConfig.js v${ESTERS_CONFIG_VERSION} loaded! 🎯 Dynamic cM calculation | ${Object.keys(window.estersConfig).length} compounds`);
})();

// EOF estersConfig.js — REFACTORED: DYNAMIC CONCENTRATION MULTIPLIER
