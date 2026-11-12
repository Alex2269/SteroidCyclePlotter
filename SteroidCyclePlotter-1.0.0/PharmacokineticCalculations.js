// ============================================================================
// PharmacokineticCalculations.js
// 🔬 Фармакокінетика | 🧬 Інтеграція з estersConfig
// ============================================================================

// 📌 Версія цього модуля — ЗМІНЮЙ ТІЛЬКИ ТУТ
const PK_CALCULATIONS_VERSION = '1.0.0';

// 📦 Експорт версії для зовнішнього доступу
window.SteroidPlotter = window.SteroidPlotter || {};
window.SteroidPlotter.pkCalculationsVersion = PK_CALCULATIONS_VERSION;

// ============================================================================
// 🔢 КОНСТАНТИ
// ============================================================================

const EPSILON = 1e-9;                    // Точність для порівнянь
const KA_MULTIPLIER_MIN = 1.0;           // Мінімальний kaMultiplier
const KA_MULTIPLIER_MAX = 100.0;         // Максимальний kaMultiplier

// ============================================================================
// 🔬 ФАРМАКОКІНЕТИЧНІ РОЗРАХУНКИ
// ============================================================================

/**
 * Розраховує ka з заданого Tmax бінарним пошуком
 * Формула: Tmax = ln(ka/ke) / (ka - ke)
 * @param {number} ke - Константа елімінації (day⁻¹)
 * @param {number} targetTmax - Бажаний час піку (дні)
 * @param {number} [maxIter=50] - Максимум ітерацій
 * @param {Object} [options] - Опції
 * @param {boolean} [options.returnObject=false] - Повернути об'єкт з діагностикою
 * @returns {number|Object} ka (day⁻¹) або об'єкт з деталями
 */
function calculateKaFromTmax(ke, targetTmax, maxIter = 50, options = {}) {
    const EPS = EPSILON;
    const returnObject = options?.returnObject;

    if (!Number.isFinite(ke) || !Number.isFinite(targetTmax) || ke <= EPS || targetTmax <= EPS) {
        const fallback = ke * 4.5;
        return returnObject
            ? { ka: fallback, ratio: 4.5, iterations: 0, converged: false, reason: 'invalid_input' }
            : fallback;
    }

    const targetVal = targetTmax * ke;
    const f = (ratio) => Math.log(ratio) / (ratio - 1);
    let low = 1.0001, high = 2000;

    const fLow = f(low), fHigh = f(high);
    if (!Number.isFinite(fLow) || !Number.isFinite(fHigh)) {
        const fallback = ke * 4.5;
        return returnObject
            ? { ka: fallback, ratio: 4.5, iterations: 0, converged: false, reason: 'endpoint_nonfinite' }
            : fallback;
    }
    if (targetVal >= fLow) {
        const ka = low * ke;
        return returnObject
            ? { ka, ratio: low, iterations: 0, converged: false, reason: 'target_too_large' }
            : ka;
    }
    if (targetVal <= fHigh) {
        const ka = high * ke;
        return returnObject
            ? { ka, ratio: high, iterations: 0, converged: false, reason: 'target_too_small' }
            : ka;
    }

    let mid = (low + high) / 2, converged = false, val = NaN, i;
    for (i = 0; i < maxIter; i++) {
        mid = (low + high) / 2;
        val = f(mid);
        if (!Number.isFinite(val)) break;
        if (Math.abs(val - targetVal) < 1e-9 || (high - low) / low < 1e-9) {
            converged = true;
            break;
        }
        if (val > targetVal) low = mid;
        else high = mid;
    }

    const ratio = mid, ka = ratio * ke;
    if (returnObject) {
        return {
            ka,
            ratio,
            iterations: i + 1,
            converged,
            fAtMid: Number.isFinite(val) ? val : null,
            targetVal,
            bounds: { low, high }
        };
    }
    return ka;
}

/**
 * Отримує ефективний kaMultiplier (пріоритет: targetTmax → kaMultiplier → дефолт)
 * @param {Object} cfg - Конфігурація сполуки
 * @returns {number} kaMultiplier для моделі
 */
function getEffectiveKaMultiplier(cfg) {
    if (!cfg) return 4.5;
    if (cfg.targetTmax && cfg.halfLife && cfg.halfLife > 0) {
        const ke = Math.LN2 / cfg.halfLife;
        const ka = calculateKaFromTmax(ke, cfg.targetTmax);
        const multiplier = ka / ke;
        return Math.max(KA_MULTIPLIER_MIN, Math.min(KA_MULTIPLIER_MAX, multiplier));
    }
    if (cfg.kaMultiplier && cfg.kaMultiplier >= KA_MULTIPLIER_MIN) {
        return Math.min(KA_MULTIPLIER_MAX, cfg.kaMultiplier);
    }
    return 4.5;
}

/**
 * 🔍 Валідація estersConfig — делегування до estersConfig.js
 * Якщо глобальна функція недоступна — виконує базову перевірку
 */
function validateEstersConfig() {
    // 🔹 Пріоритет: використати розширену валідацію з estersConfig.js
    if (typeof window.validateEstersConfig === 'function' && 
        window.validateEstersConfig !== validateEstersConfig) {
        return window.validateEstersConfig();
    }
    
    // 🔹 Fallback: базова перевірка (якщо estersConfig.js ще не завантажений)
    const estersConfig = typeof window.estersConfig !== 'undefined' 
        ? window.estersConfig 
        : {};
    
    let warnings = 0, errors = 0;
    Object.entries(estersConfig).forEach(([name, cfg]) => {
        if (cfg.targetTmax && cfg.kaMultiplier) {
            console.warn(`⚠️ ${name}: задано і targetTmax, і kaMultiplier — пріоритет у targetTmax`);
            warnings++;
        }
        if (cfg.targetTmax && (!cfg.halfLife || cfg.halfLife <= 0)) {
            console.error(`❌ ${name}: targetTmax вимагає валідного halfLife`);
            errors++;
        }
    });
    console.log(`✅ estersConfig validated (fallback): ${warnings} warnings, ${errors} errors`);
    return errors === 0;
}

/**
 * Розраховує концентрацію речовини у певний момент часу
 * @param {number} t - Час у днях
 * @param {number} dose - Доза (умовні одиниці)
 * @param {number} halfLife - Період напіввиведення (дні)
 * @param {number} kaMultiplier - Множник швидкості всмоктування
 * @param {number} keModifier - Модифікатор швидкості елімінації
 * @param {number} concentrationMultiplier - Множник для rawConc (ester/активність)
 * @param {Object} [options] - Додаткові опції
 * @param {boolean} [options.returnObject=false] - Повернути об'єкт з діагностикою
 * @param {boolean} [options.normalizeByHalfLife=true] - Чи нормалізувати дозу за halfLife
 * @param {number|null} [options.normalizationDivisor=null] - Окремий дільник для масштабування
 * @param {number} [options.bioavailability=1.0] - Біодоступність (0-1)
 * @param {string} [options.compoundName] - Назва сполуки (для авто-підстановки множника)
 * @returns {number|Object} Концентрація або об'єкт з деталями
 */
function concentrationAtTime(t, dose, halfLife, kaMultiplier = 4.5, keModifier = 1, concentrationMultiplier = 1.0, options = {}) {
    // 🎯 ПАРАМЕТРИ КАЛІБРУВАННЯ
    const CLINICAL_CALIBRATION_FACTOR = 1.0; // ✅ "Чесний" множник (клінічну корекцію робить Vd)

    // 🔬 Об'єм розподілу (нормалізований);
    // 0.73 калібрує під ~1030 ng/dL для енантату 25mg/day
    const Vd = 0.73;

    // ⚙️ КОНСТАНТИ ОБЧИСЛЕНЬ
    const EPS = 1e-12, MAX_KA = 100, MIN_POSITIVE = 1e-300;

    // 📦 РОЗПАКОВКА ОПЦІЙ
    const {
        returnObject = false,
        normalizeByHalfLife = true,
        normalizationDivisor = null,
        bioavailability = 1.0,
        compoundName = ''
    } = options || {};

    // 🔧 АВТО-ПІДСТАНОВКА МНОЖНИКА (fallback)
    // Якщо множник не передано явно (1.0), але є конфіг для сполуки — беремо звідти
    let effectiveConcMultiplier = concentrationMultiplier;
    if (effectiveConcMultiplier === 1.0 && typeof window.estersConfig !== 'undefined') {
        const cfg = window.estersConfig[compoundName];
        if (cfg?.concentrationMultiplier) {
            effectiveConcMultiplier = cfg.concentrationMultiplier;
        }
    }

    // 🛡️ ВАЛІДАЦІЯ ВХІДНИХ ДАНИХ
    const numericInputs = [t, dose, halfLife, kaMultiplier, keModifier, concentrationMultiplier, bioavailability];
    if (!numericInputs.every(x => typeof x === 'number' && Number.isFinite(x))) {
        if (returnObject) return { concentration: 0, reason: 'invalid_input_type' };
        return 0;
    }
    if (t < 0 || halfLife <= 0 || dose < 0) {
        if (returnObject) return { concentration: 0, reason: 'invalid_range' };
        return 0;
    }
    if (kaMultiplier <= 0 || keModifier <= 0) {
        if (returnObject) return { concentration: 0, reason: 'invalid_ka_ke' };
        return 0;
    }
    if (bioavailability < 0 || bioavailability > 1) {
        if (returnObject) return { concentration: 0, reason: 'invalid_bioavailability' };
        return 0;
    }

    // 🧮 РОЗРАХУНОК КОНСТАНТ ШВИДКОСТІ
    const ke = (Math.LN2 / halfLife) * keModifier;
    if (!Number.isFinite(ke) || ke <= 0) {
        if (returnObject) return { concentration: 0, reason: 'invalid_ke' };
        return 0;
    }

    let ka = ke * kaMultiplier;
    if (!Number.isFinite(ka) || ka <= 0) ka = ke;

    let kaWasClamped = false;
    if (ka > MAX_KA) { ka = MAX_KA; kaWasClamped = true; }

    // 📉 НОРМАЛІЗАЦІЯ ДОЗИ
    const effectiveDose = dose * bioavailability;
    const divisor = normalizeByHalfLife
        ? (normalizationDivisor !== null ? normalizationDivisor : halfLife)
        : 1;

    if (!Number.isFinite(divisor) || divisor <= 0) {
        if (returnObject) return { concentration: 0, reason: 'invalid_divisor' };
        return 0;
    }

    const adjustedDose = effectiveDose / divisor;

    // 🧪 РОЗРАХУНОК СИРОЇ КОНЦЕНТРАЦІЇ (one-compartment model з першим порядком всмоктування)
    let rawConc;
    const diff = ka - ke;

    if (Math.abs(diff) < EPS) {
        // Випадок: ka ≈ ke (уникаємо ділення на нуль)
        const expo = Math.exp(-ke * t);
        rawConc = (adjustedDose / Vd) * ka * t * expo;
    } else {
        const a = Math.exp(-ke * t);
        const b = Math.exp(-ka * t);
        const A = Number.isFinite(a) && Math.abs(a) > MIN_POSITIVE ? a : 0;
        const B = Number.isFinite(b) && Math.abs(b) > MIN_POSITIVE ? b : 0;
        rawConc = (adjustedDose * ka) / (Vd * diff) * (A - B);
    }

    if (!Number.isFinite(rawConc) || rawConc < 0) rawConc = 0;

    // 🔧 ЗАСТОСУВАННЯ МНОЖНИКА АКТИВНОСТІ (ester → free testosterone)
    const concentration = rawConc * effectiveConcMultiplier;

    // ⏱️ РОЗРАХУНОК Tₘₐₓ (час досягнення пікової концентрації)
    let Tmax = null;
    if (ka > 0 && ke > 0) {
        if (Math.abs(ka - ke) >= EPS) {
            const ratio = ka / ke;
            const tcalc = Math.log(ratio) / (ka - ke);
            Tmax = Number.isFinite(tcalc) && tcalc >= 0 ? tcalc : null;
        } else {
            Tmax = 1 / ke;
        }
    }

    // 📦 ПОВЕРНЕННЯ РЕЗУЛЬТАТУ
    if (returnObject) {
        const ratio = ka / ke;
        return {
            concentration,
            rawConc,
            ka,
            ke,
            Tmax,
            adjustedDose,
            ratio,
            _meta: {
                halfLife,
                kaMultiplier,
                keModifier,
                normalizeByHalfLife,
                normalizationDivisor,
                bioavailability,
                kaClamped: kaWasClamped,
                clinicalCalibration: CLINICAL_CALIBRATION_FACTOR,
                concentrationMultiplierUsed: effectiveConcMultiplier, // 🔍 для дебагу
                Vd
            }
        };
    }

    return concentration * CLINICAL_CALIBRATION_FACTOR;
}

/**
 * Розраховує коефіцієнт конвертації одиниць (ng/dL ↔ nmol/L)
 * 🔧 Інтеграція з estersConfig: cM розраховується динамічно
 * 
 * @param {Object} compound - Об'єкт сполуки
 * @param {boolean} combined - Чи режим об'єднання
 * @returns {number} Коефіцієнт конвертації
 *          • Для стероїдних естерів: 1 (ng/dL) або 28.8 (nmol/L)
 *          • Для нестероїдних: (MW_compound / 288.43) × [1 або 28.8]
 */
function calculateConversionFactor(compound, combined = false) {
    const baseMW = 288.43;  // MW тестостерону — референс для ng/dL ↔ nmol/L
    
    // 🔧 Безпечний доступ до глобальних змінних
    const estersConfig = typeof window.estersConfig !== 'undefined'
        ? window.estersConfig
        : {};
    const unitSwitch = !!(window.unitSwitchCheckbox?.checked);

    const config = estersConfig[compound?.name];
    
    // 🔍 Визначаємо тип сполуки через динамічний cM
    // Якщо cM не задано вручну → розраховуємо (estersConfig)
    let cM = config?.concentrationMultiplier;
    if (cM === undefined && typeof window.calculateConcentrationMultiplier === 'function') {
        cM = window.calculateConcentrationMultiplier(compound?.name, config);
    }
    cM = cM ?? 1.0;
    
    // Стероїдний естер: cM < 1.0 (напр. 0.720 для TestE)
    // Нестероїдна сполука: cM === 1.0 (напр. HCG, оральні)
    const isSteroidEster = (cM < 1.0 && cM > 0);
    
    // ========================================================================
    // 🟠 COMBINED MODE
    // ========================================================================
    if (combined) {
        const globalCompounds = typeof window.compounds !== 'undefined'
            ? window.compounds
            : [];
            
        if (globalCompounds?.length > 0) {
            const cycleAvgMW = globalCompounds
                .map(c => estersConfig[c.name]?.molecularWeight || baseMW)
                .filter(mw => mw > 100)
                .reduce((sum, mw, _, arr) => sum + mw / arr.length, 0) || baseMW;
            
            if (isSteroidEster) {
                // ✅ Для естерів: одиниці на основі базового MW (cM вже застосовано)
                return unitSwitch ? 28.8 : 1;
            } else {
                // ✅ Для нестероїдних: використовуємо середній MW циклу для конвертації
                const ratio = cycleAvgMW / baseMW;
                return unitSwitch ? ratio * 28.8 : ratio;
            }
        }
    }
    
    // ========================================================================
    // 🔥 NORMAL MODE (окрема сполука)
    // ========================================================================
    const compoundMW = config?.molecularWeight || baseMW;
    
    if (isSteroidEster) {
        // ✅ Для естерів: одиниці на основі базового MW (cM вже застосовано в concentrationAtTime)
        return unitSwitch ? 28.8 : 1;
    } else {
        // ✅ Для нестероїдних (HCG, AI, PCT, тощо): використовуємо їхній MW для коректної конвертації
        // Формула: nmol/L = ng/dL × (10000 / MW_compound)
        // Відносно тестостерону: factor = (MW_compound / baseMW) × 28.8
        const ratio = compoundMW / baseMW;
        return unitSwitch ? ratio * 28.8 : ratio;
    }
}

/**
 * Отримує часові межі для всіх сполук
 * @param {Array} compoundsArray - Масив сполук
 * @returns {Object} { minStartOffset, maxDuration }
 */
function getTimeBounds(compoundsArray = []) {
    // 🔧 Безпечний доступ до глобальних змінних
    const compounds = typeof window.compounds !== 'undefined' ? window.compounds : [];
    const editingIndex = typeof window.editingIndex !== 'undefined' ? window.editingIndex : -1;
    const currentEditingCompound = typeof window.currentEditingCompound !== 'undefined' 
        ? window.currentEditingCompound 
        : null;
    
    const compoundsForBounds = [...(compoundsArray.length > 0 ? compoundsArray : compounds)];
    
    if (editingIndex >= 0 && currentEditingCompound && editingIndex < compoundsForBounds.length) {
        compoundsForBounds[editingIndex] = { ...currentEditingCompound };
    }
    
    if (compoundsForBounds.length === 0) {
        return { minStartOffset: 0, maxDuration: 30 };
    }
    
    return {
        minStartOffset: Math.min(...compoundsForBounds.map(c => c.startOffset ?? 0)),
        maxDuration: Math.max(...compoundsForBounds.map(c => (c.startOffset ?? 0) + (c.duration ?? 0)))
    };
}

// ============================================================================
// 🆕 ЕКСПОРТ ФУНКЦІЙ У ГЛОБАЛЬНИЙ ОБ'ЄКТ
// ============================================================================

window.calculateKaFromTmax = calculateKaFromTmax;
window.getEffectiveKaMultiplier = getEffectiveKaMultiplier;
window.validateEstersConfig = validateEstersConfig;  // ✅ Делегує до estersConfig.js
window.concentrationAtTime = concentrationAtTime;
window.calculateConversionFactor = calculateConversionFactor;
window.getTimeBounds = getTimeBounds;

// ============================================================================
// 🔧 FALLBACK-ХЕЛПЕРИ ДЛЯ ІНТЕГРАЦІЇ З estersConfig
// (Експортуються тільки якщо ще не визначені в estersConfig.js)
// ============================================================================

if (typeof window.calculateConcentrationMultiplier !== 'function') {
    /**
     * 🔧 FALLBACK: Розраховує concentrationMultiplier динамічно
     * Використовується тільки якщо estersConfig.js не завантажений
     */
    window.calculateConcentrationMultiplier = function(compoundName, config) {
        // ✅ Пріоритет: явно задане значення
        if (typeof config?.concentrationMultiplier === 'number' && config.concentrationMultiplier > 0) {
            return config.concentrationMultiplier;
        }
        
        // ✅ Пріоритет 2: сполука без ефіру або невідомий MW → 1.0
        if (!config?.molecularWeight || config.molecularWeight < 100) {
            return 1.0;
        }
        
        // ✅ Пріоритет 3: базовий розрахунок з відомими базами
        const BASE_MW = {
            testosterone: 288.43, nandrolone: 274.40, trenbolone: 270.37,
            boldenone: 286.41, drostanolone: 304.45, methenolone: 344.51
        };
        
        const nameLower = compoundName?.toLowerCase() || '';
        let baseMW = null;
        for (const [key, mw] of Object.entries(BASE_MW)) {
            if (nameLower.includes(key)) { baseMW = mw; break; }
        }
        
        if (!baseMW || config.molecularWeight <= baseMW * 0.95) return 1.0;
        
        const cM = baseMW / config.molecularWeight;
        return (cM >= 0.5 && cM <= 1.0) ? +cM.toFixed(4) : 1.0;
    };
}

if (typeof window.getBaseMolecularWeight !== 'function') {
    /**
     * 🔧 FALLBACK: Визначає базову молекулярну вагу за назвою сполуки
     * Використовується тільки якщо estersConfig.js не завантажений
     */
    window.getBaseMolecularWeight = function(compoundName) {
        const BASE_MW = {
            testosterone: 288.43, nandrolone: 274.40, trenbolone: 270.37,
            boldenone: 286.41, drostanolone: 304.45, methenolone: 344.51
        };
        const nameLower = compoundName?.toLowerCase() || '';
        for (const [key, mw] of Object.entries(BASE_MW)) {
            if (nameLower.includes(key)) return mw;
        }
        return null;
    };
}

// ============================================================================
// 🏁 ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ
// ============================================================================

(function init() {
    // 🔍 Авто-валідація при завантаженні (в режимі розробки)
    if (typeof window.addEventListener !== 'undefined') {
        window.addEventListener('load', () => {
            if (typeof validateEstersConfig === 'function') {
                validateEstersConfig();
            }
        });
    }

    console.log(`🔬 PharmacokineticCalculations.js v${PK_CALCULATIONS_VERSION} loaded! 🧬 estersConfig v${window.SteroidPlotter?.estersConfigVersion || '?'} integration | CAL_FACTOR=1.0 (honest)`);
})();

// ============================================================================
// 🏁 EOF PharmacokineticCalculations.js — PRODUCTION READY
// ============================================================================
