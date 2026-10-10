// ============================================================================
// 🎨 generateSeries.js — PaletteManager Integration
// ============================================================================
(function() {
    if (window._generateSeriesLoaded) return;
    window._generateSeriesLoaded = true;

    // 📌 Версія цього модуля — ЗМІНЮЙ ТІЛЬКО ТУТ
    const GENERATE_SERIES_VERSION = '1.0.0';

    // 📦 Експорт версії для зовнішнього доступу
    window.SteroidPlotter = window.SteroidPlotter || {};
    window.SteroidPlotter.generateSeriesVersion = GENERATE_SERIES_VERSION;

    function _checkDependencies() {
        const missing = [];
        if (typeof concentrationAtTime !== 'function') missing.push('concentrationAtTime');
        if (typeof calculateConversionFactor !== 'function') missing.push('calculateConversionFactor');
        if (typeof getTimeBounds !== 'function') missing.push('getTimeBounds');
        if (typeof window.PaletteManager === 'undefined') missing.push('PaletteManager');
        if (missing.length > 0) {
            console.error(`❌ generateSeries.js: Відсутні залежності: ${missing.join(', ')}`);
            return false;
        }
        return true;
    }

    window.generateSeries = function(compoundsArray, combine, minTime, maxTime, paletteKey = 'palette1') {
        if (!_checkDependencies()) return [];

        const unitSwitchCheckbox = window.unitSwitchCheckbox || { checked: false };
        const estersConfig = window.estersConfig || {};
        const isNmolMode = unitSwitchCheckbox.checked;
        const MIN_VISIBLE_VALUE_NG_DL = 0.1;
        const CONVERSION_FACTOR = 28.8;
        const displayThreshold = isNmolMode
            ? MIN_VISIBLE_VALUE_NG_DL * CONVERSION_FACTOR
            : MIN_VISIBLE_VALUE_NG_DL;
        const ELIMINATION_BUFFER_MULTIPLIER = 5;

        // 🎨 ВИКОРИСТОВУЄМО PaletteManager
        const colors = window.PaletteManager.getColors(paletteKey);
        const EPSILON = 1e-9;

        let compoundsForChart = [...(compoundsArray || [])];
        const editIdx = typeof window.editingIndex !== 'undefined' ? window.editingIndex : -1;
        const editCompound = typeof window.currentEditingCompound !== 'undefined' ? window.currentEditingCompound : null;
        if (editIdx >= 0 && editCompound) {
            compoundsForChart[editIdx] = { ...editCompound };
        }

        if (!compoundsForChart || compoundsForChart.length === 0) return [];

        const bounds = typeof getTimeBounds === 'function'
            ? getTimeBounds(compoundsForChart)
            : { minStartOffset: 0, maxDuration: 30 };
        const { minStartOffset, maxDuration } = bounds;
        const todayTimestamp = window.todayTimestamp || Date.now();
        const fullMinTime = todayTimestamp + minStartOffset * 86400000;
        const fullMaxTime = todayTimestamp + maxDuration * 86400000;
        const useMinTime = minTime ?? fullMinTime;
        const useMaxTime = maxTime ?? fullMaxTime;
        const minStart = (useMinTime - todayTimestamp) / 86400000;
        const maxEnd = (useMaxTime - todayTimestamp) / 86400000;
        const zoomDaysDisplay = maxEnd - minStart;

        let pointsPerDay;
        if (zoomDaysDisplay <= 3) pointsPerDay = 96;
        else if (zoomDaysDisplay <= 10) pointsPerDay = 48;
        else if (zoomDaysDisplay <= 30) pointsPerDay = 24;
        else if (zoomDaysDisplay <= 90) pointsPerDay = 12;
        else if (zoomDaysDisplay <= 180) pointsPerDay = 6;
        else pointsPerDay = 3;

        const step = 1 / pointsPerDay;
        const msInDay = 86400000;
        const globalTimeShiftHours = window.globalTimeShiftHours || 0;

        // ====================================================================
        // 🟠 COMBINE MODE
        // ====================================================================
        if (combine) {
            // 🎯 Дані беруться з estersConfig.js (SSOT)
            const STEROIDS = window.getSteroidCompounds();

            const steroidCompounds = compoundsForChart.filter(c => STEROIDS.includes(c.name));
            const pctCompounds = compoundsForChart.filter(c => !STEROIDS.includes(c.name));

            const steroidData = [];
            const earliestSteroidStart = steroidCompounds.length > 0
                ? Math.min(...steroidCompounds.map(c => c.startOffset))
                : null;

            if (earliestSteroidStart !== null && minStart <= earliestSteroidStart + EPSILON &&
                earliestSteroidStart <= maxEnd + EPSILON) {
                steroidData.push([
                    todayTimestamp + (globalTimeShiftHours * 3600000) + earliestSteroidStart * msInDay,
                    0
                ]);
            }

            const avgSteroidHalfLife = steroidCompounds.length > 0
                ? steroidCompounds.reduce((sum, c) => sum + (c.halfLife || 7), 0) / steroidCompounds.length
                : 7;

            for (let day = minStart; day <= maxEnd; day += step) {
                let totalConc = 0;
                let hasActiveCompound = false;
                let isActivePeriod = false;

                steroidCompounds.forEach(c => {
                    if (!c || typeof c.startOffset !== 'number') return;
                    if (day >= c.startOffset - EPSILON && day < c.startOffset + c.duration + EPSILON) {
                        isActivePeriod = true;
                    }
                    if (day >= c.startOffset - EPSILON) {
                        const timeShiftDays = (c.timeOffsetHours || 0) / 24;
                        const localDay = (day + timeShiftDays) - c.startOffset;
                        for (let doseDay = 0; doseDay < c.duration && doseDay <= localDay; doseDay += c.interval) {
                            const rawFactor = typeof calculateConversionFactor === 'function'
                                ? calculateConversionFactor(c, false) : undefined;
                            const factor = (typeof rawFactor === 'number' && Number.isFinite(rawFactor) && rawFactor > 0)
                                ? rawFactor : CONVERSION_FACTOR;
                            const bio = estersConfig[c.name]?.bioavailability ?? 1.0;
                            const conc = typeof concentrationAtTime === 'function'
                                ? concentrationAtTime(localDay - doseDay, c.dose, c.halfLife,
                                    c.kaMultiplier, c.keModifier, c.concentrationMultiplier || 1,
                                    { normalizeByHalfLife: true, normalizationDivisor: c.normalizationDivisor ?? null, bioavailability: bio })
                                : 0;
                            totalConc += conc * factor;
                            hasActiveCompound = true;
                        }
                    }
                });

                const calculatedValue = hasActiveCompound ? +totalConc.toFixed(3) : 0;
                const displayValue = calculatedValue;
                const daysSinceStart = day - (earliestSteroidStart || 0);
                const eliminationBuffer = avgSteroidHalfLife * ELIMINATION_BUFFER_MULTIPLIER;
                const isPastActivePhase = daysSinceStart > eliminationBuffer;
                const isBelowThreshold = displayValue < displayThreshold && displayValue >= 0;

                const pointValue = (day < earliestSteroidStart - EPSILON)
                    ? null
                    : (isBelowThreshold && isPastActivePhase && !isActivePeriod) ? null : displayValue;

                steroidData.push([
                    todayTimestamp + (globalTimeShiftHours * 3600000) + day * msInDay,
                    pointValue
                ]);
            }
            steroidData.sort((a, b) => a[0] - b[0]);

            const pctGroups = {};
            pctCompounds.forEach(c => {
                const key = (c.groupId === 0 || !c.groupId) ? c.name : `G${c.groupId}`;
                if (!pctGroups[key]) pctGroups[key] = [];
                pctGroups[key].push(c);
            });

            const pctSeries = Object.entries(pctGroups).map(([name, group], index) => {
                const data = [];
                const firstCompound = group[0];
                const rawFactor = typeof calculateConversionFactor === 'function'
                    ? calculateConversionFactor(firstCompound, false) : undefined;
                const factor = (typeof rawFactor === 'number' && Number.isFinite(rawFactor) && rawFactor > 0)
                    ? rawFactor : 1;
                const earliestInGroup = Math.min(...group.map(c => c.startOffset));

                if (minStart <= earliestInGroup + EPSILON && earliestInGroup <= maxEnd + EPSILON) {
                    data.push([
                        todayTimestamp + (globalTimeShiftHours * 3600000) + earliestInGroup * msInDay,
                        0
                    ]);
                }

                const avgGroupHalfLife = group.length > 0
                    ? group.reduce((sum, c) => sum + (c.halfLife || 7), 0) / group.length : 7;

                for (let day = minStart; day <= maxEnd; day += step) {
                    let totalConc = 0;
                    let hasActiveCompound = false;
                    let isActivePeriod = false;

                    group.forEach(c => {
                        if (!c || typeof c.startOffset !== 'number') return;
                        if (day >= c.startOffset - EPSILON && day < c.startOffset + c.duration + EPSILON) {
                            isActivePeriod = true;
                        }
                        if (day >= c.startOffset - EPSILON) {
                            const timeShiftDays = (c.timeOffsetHours || 0) / 24;
                            const localDay = (day + timeShiftDays) - c.startOffset;
                            for (let doseDay = 0; doseDay < c.duration && doseDay <= localDay; doseDay += c.interval) {
                                const ka = c.kaMultiplier || estersConfig[c.name]?.kaMultiplier || 4.5;
                                const ke = c.keModifier || estersConfig[c.name]?.keModifier || 1.0;
                                const bio = estersConfig[c.name]?.bioavailability ?? 1.0;
                                const conc = typeof concentrationAtTime === 'function'
                                    ? concentrationAtTime(localDay - doseDay, c.dose, c.halfLife,
                                        ka, ke, c.concentrationMultiplier || 1,
                                        { normalizeByHalfLife: true, normalizationDivisor: c.normalizationDivisor ?? null, bioavailability: bio })
                                    : 0;
                                totalConc += conc;
                                hasActiveCompound = true;
                            }
                        }
                    });

                    const calculatedValue = hasActiveCompound ? +(totalConc * factor).toFixed(3) : 0;
                    const displayValue = calculatedValue;
                    const daysSinceStart = day - earliestInGroup;
                    const eliminationBuffer = avgGroupHalfLife * ELIMINATION_BUFFER_MULTIPLIER;
                    const isPastActivePhase = daysSinceStart > eliminationBuffer;
                    const isBelowThreshold = displayValue < displayThreshold && displayValue >= 0;

                    const pointValue = (day < earliestInGroup - EPSILON)
                        ? null
                        : (isBelowThreshold && isPastActivePhase && !isActivePeriod) ? null : displayValue;

                    data.push([
                        todayTimestamp + (globalTimeShiftHours * 3600000) + day * msInDay,
                        pointValue
                    ]);
                }
                data.sort((a, b) => a[0] - b[0]);
                return { name: `💊 ${name}`, data, color: colors[(index + 1) % colors.length] };
            });

            return [{ name: '🟠 STEROIDS', data: steroidData, color: colors[0] }, ...pctSeries];
        }

        // ====================================================================
        // 🔥 NORMAL MODE
        // ====================================================================
        const groups = {};
        compoundsForChart.forEach(c => {
            if (!c || !c.name) return;
            let groupKey;
            if (c.groupId === -1) groupKey = `${c.name} #${c.startOffset}d_${c.dose}mg`;
            else if (c.groupId > 0) groupKey = `Group ${c.groupId}`;
            else groupKey = c.name;
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(c);
        });

        return Object.entries(groups).map(([groupName, groupCompounds], index) => {
            const data = [];
            const firstCompound = groupCompounds[0];
            const rawConversionFactor = firstCompound && typeof calculateConversionFactor === 'function'
                ? calculateConversionFactor(firstCompound, false) : undefined;
            const conversionFactor = (typeof rawConversionFactor === 'number' && Number.isFinite(rawConversionFactor) && rawConversionFactor > 0)
                ? rawConversionFactor : CONVERSION_FACTOR;
            const earliestInGroup = Math.min(...groupCompounds.map(c => c.startOffset));

            if (minStart <= earliestInGroup + EPSILON && earliestInGroup <= maxEnd + EPSILON) {
                data.push([
                    todayTimestamp + (globalTimeShiftHours * 3600000) + earliestInGroup * msInDay,
                    0
                ]);
            }

            const avgGroupHalfLife = groupCompounds.length > 0
                ? groupCompounds.reduce((sum, c) => sum + (c.halfLife || 7), 0) / groupCompounds.length : 7;

            for (let day = minStart; day <= maxEnd; day += step) {
                let totalConc = 0;
                let hasActiveCompound = false;
                let isActivePeriod = false;

                groupCompounds.forEach(c => {
                    if (!c || typeof c.startOffset !== 'number') return;
                    if (day >= c.startOffset - EPSILON && day < c.startOffset + c.duration + EPSILON) {
                        isActivePeriod = true;
                    }
                    if (day >= c.startOffset - EPSILON) {
                        const timeShiftDays = (c.timeOffsetHours || 0) / 24;
                        const localDay = (day + timeShiftDays) - c.startOffset;
                        for (let doseDay = 0; doseDay < c.duration && doseDay <= localDay; doseDay += c.interval) {
                            const ka = c.kaMultiplier || estersConfig[c.name]?.kaMultiplier || 4.5;
                            const ke = c.keModifier || estersConfig[c.name]?.keModifier || 1.0;
                            const bio = estersConfig[c.name]?.bioavailability ?? 1.0;
                            const conc = typeof concentrationAtTime === 'function'
                                ? concentrationAtTime(localDay - doseDay, c.dose, c.halfLife,
                                    ka, ke, c.concentrationMultiplier || 1,
                                    { normalizeByHalfLife: true, normalizationDivisor: c.normalizationDivisor ?? null, bioavailability: bio })
                                : 0;
                            totalConc += conc;
                            hasActiveCompound = true;
                        }
                    }
                });

                const calculatedValue = hasActiveCompound
                    ? +(totalConc * conversionFactor).toFixed(3) : 0;
                const displayValue = calculatedValue;
                const daysSinceStart = day - earliestInGroup;
                const eliminationBuffer = avgGroupHalfLife * ELIMINATION_BUFFER_MULTIPLIER;
                const isPastActivePhase = daysSinceStart > eliminationBuffer;
                const isBelowThreshold = displayValue < displayThreshold && displayValue >= 0;

                const pointValue = (day < earliestInGroup - EPSILON)
                    ? null
                    : (isBelowThreshold && isPastActivePhase && !isActivePeriod) ? null : displayValue;

                data.push([
                    todayTimestamp + (globalTimeShiftHours * 3600000) + day * msInDay,
                    pointValue
                ]);
            }
            data.sort((a, b) => a[0] - b[0]);
            return { name: groupName, data, color: colors[index % colors.length] };
        });
    };

    // Helper functions (delegate to PaletteManager)
    window.getColorPalettes = () => window.PaletteManager.getAll();
    window.getPaletteColors = (key) => window.PaletteManager.getColors(key);
    window.addColorPalette = (key, palette) => window.PaletteManager.add(key, palette);

    console.log(`🎨 generateSeries.js v${GENERATE_SERIES_VERSION} loaded! PaletteManager Integration`);
})();
// ============================================================================
// 🏁 EOF generateSeries.js — READY FOR DEPLOYMENT
// ============================================================================
