// lib/RoofAnalyzer.js
class RoofAnalyzer {
    analyzeRoofSegments(solarData) {
        if (!solarData.solarPotential?.roofSegmentStats) {
            throw new Error('No roof segment data available');
        }

        const segments = solarData.solarPotential.roofSegmentStats;

        return segments.map((segment, index) => {
            const azimuth = segment.azimuthDegrees;
            const pitch = segment.pitchDegrees;
            
            return {
                id: index,
                name: `Roof Segment ${index + 1}`,
                azimuth: Math.round(azimuth),
                direction: this.getCardinalDirection(azimuth),
                pitch: Math.round(pitch * 10) / 10,
                areaSqFt: Math.round(segment.stats.areaMeters2 * 10.764),
                areaSqM: Math.round(segment.stats.areaMeters2),
                sunshineHours: segment.stats.sunshineQuantiles[2],
                efficiency: this.calculateEfficiency(azimuth, pitch),
                suitability: null,
                panelCapacity: Math.floor(segment.stats.areaMeters2 / 1.7),
                color: null,
                center: segment.center,
                boundingBox: segment.boundingBox
            };
        }).map(segment => {
            segment.suitability = this.getSuitability(segment.efficiency);
            segment.color = this.getEfficiencyColor(segment.efficiency);
            segment.recommendation = this.getSegmentRecommendation(segment);
            return segment;
        });
    }

    getCardinalDirection(azimuth) {
        const directions = [
            { name: 'North', min: 337.5, max: 22.5 },
            { name: 'Northeast', min: 22.5, max: 67.5 },
            { name: 'East', min: 67.5, max: 112.5 },
            { name: 'Southeast', min: 112.5, max: 157.5 },
            { name: 'South', min: 157.5, max: 202.5 },
            { name: 'Southwest', min: 202.5, max: 247.5 },
            { name: 'West', min: 247.5, max: 292.5 },
            { name: 'Northwest', min: 292.5, max: 337.5 }
        ];

        for (const dir of directions) {
            if (dir.name === 'North') {
                if (azimuth >= dir.min || azimuth < dir.max) return dir.name;
            } else {
                if (azimuth >= dir.min && azimuth < dir.max) return dir.name;
            }
        }
        return 'Unknown';
    }

    calculateEfficiency(azimuth, pitch) {
        const azimuthDiff = Math.abs(180 - azimuth);
        let azimuthEfficiency;
        
        if (azimuthDiff <= 15) {
            azimuthEfficiency = 100;
        } else if (azimuthDiff <= 45) {
            azimuthEfficiency = 100 - (azimuthDiff - 15) * 0.5;
        } else if (azimuthDiff <= 90) {
            azimuthEfficiency = 85 - (azimuthDiff - 45) * 0.8;
        } else {
            azimuthEfficiency = Math.max(0, 49 - (azimuthDiff - 90) * 0.5);
        }

        const optimalPitch = 28;
        const pitchDiff = Math.abs(pitch - optimalPitch);
        let pitchEfficiency;
        
        if (pitchDiff <= 5) {
            pitchEfficiency = 100;
        } else if (pitchDiff <= 15) {
            pitchEfficiency = 100 - (pitchDiff - 5) * 1;
        } else {
            pitchEfficiency = Math.max(70, 90 - (pitchDiff - 15) * 0.5);
        }

        const combined = (azimuthEfficiency * 0.75 + pitchEfficiency * 0.25);
        return Math.round(combined);
    }

    getSuitability(efficiency) {
        if (efficiency >= 85) return 'Excellent';
        if (efficiency >= 70) return 'Very Good';
        if (efficiency >= 55) return 'Good';
        if (efficiency >= 40) return 'Fair';
        return 'Poor';
    }

    getEfficiencyColor(efficiency) {
        if (efficiency >= 85) return '#00C853';
        if (efficiency >= 70) return '#64DD17';
        if (efficiency >= 55) return '#FFD600';
        if (efficiency >= 40) return '#FF9100';
        return '#FF3D00';
    }

    getSegmentRecommendation(segment) {
        const { direction, efficiency } = segment;

        if (efficiency >= 85) {
            return `Excellent choice! This ${direction}-facing roof provides maximum solar production. Prioritize panel placement here for best ROI.`;
        } else if (efficiency >= 70) {
            return `Very good option. This ${direction}-facing section will provide strong energy production year-round.`;
        } else if (efficiency >= 55) {
            return `Usable but not optimal. Consider this ${direction}-facing section only if primary areas are at capacity.`;
        } else if (efficiency >= 40) {
            return `Marginal performance. Only use this ${direction}-facing area if absolutely necessary for system size requirements.`;
        } else {
            return `Not recommended. This ${direction}-facing section receives insufficient sun exposure for cost-effective solar installation.`;
        }
    }

    generateRecommendations(segments, address) {
        const sorted = [...segments].sort((a, b) => b.efficiency - a.efficiency);
        
        const bestSegment = sorted[0];
        const worstSegment = sorted[sorted.length - 1];
        
        const excellent = sorted.filter(s => s.suitability === 'Excellent');
        const veryGood = sorted.filter(s => s.suitability === 'Very Good');
        const usable = sorted.filter(s => s.efficiency >= 55);

        return {
            primaryRecommendation: this.generatePrimaryRecommendation(bestSegment),
            avoidRecommendation: worstSegment.efficiency < 50 
                ? `Avoid placing panels on the ${worstSegment.direction}-facing section (${worstSegment.areaSqFt} sq ft available). It only achieves ${worstSegment.efficiency}% efficiency due to its ${worstSegment.direction} orientation, which would significantly reduce your ROI.`
                : null,
            
            summary: {
                totalSegments: segments.length,
                excellentSegments: excellent.length,
                veryGoodSegments: veryGood.length,
                usableSegments: usable.length,
                totalUsableArea: usable.reduce((sum, s) => sum + s.areaSqFt, 0),
                maxPanelCapacity: usable.reduce((sum, s) => sum + s.panelCapacity, 0)
            },

            optimalConfiguration: this.designOptimalConfiguration(sorted),
            
            detailedAnalysis: sorted.map(segment => ({
                segmentId: segment.id,
                name: segment.name,
                direction: segment.direction,
                efficiency: segment.efficiency,
                suitability: segment.suitability,
                recommendation: segment.recommendation
            }))
        };
    }

    generatePrimaryRecommendation(bestSegment) {
        return `The ${bestSegment.direction}-facing roof segment is your best option, achieving ${bestSegment.efficiency}% efficiency with ${bestSegment.sunshineHours.toLocaleString()} annual sunshine hours. This ${bestSegment.areaSqFt} sq ft section can accommodate approximately ${bestSegment.panelCapacity} solar panels (${bestSegment.panelCapacity * 0.4} kW system).`;
    }

    designOptimalConfiguration(sortedSegments) {
        const usableSegments = sortedSegments.filter(s => s.efficiency >= 55);
        
        if (usableSegments.length === 0) {
            return {
                recommendation: 'Unfortunately, this property may not be suitable for solar installation due to poor roof orientation.',
                segments: []
            };
        }

        const totalCapacity = usableSegments.reduce((sum, s) => sum + s.panelCapacity, 0);
        const totalArea = usableSegments.reduce((sum, s) => sum + s.areaSqFt, 0);

        return {
            recommendation: usableSegments.length === 1
                ? `Install all panels on the ${usableSegments[0].direction}-facing roof for optimal performance.`
                : `For best results, prioritize the ${usableSegments[0].direction}-facing roof, then expand to ${usableSegments[1].direction}-facing section if additional capacity is needed.`,
            
            totalPanelCapacity: totalCapacity,
            estimatedSystemSize: Math.round(totalCapacity * 0.4 * 10) / 10,
            totalUsableArea: totalArea,
            
            segments: usableSegments.map(s => ({
                name: s.name,
                direction: s.direction,
                efficiency: s.efficiency,
                panelCapacity: s.panelCapacity,
                estimatedKW: Math.round(s.panelCapacity * 0.4 * 10) / 10,
                priority: s.efficiency >= 85 ? 'Primary' : s.efficiency >= 70 ? 'Secondary' : 'Tertiary'
            }))
        };
    }

    analyzeMonthlyProduction(solarData, monthlyFluxData) {
        if (monthlyFluxData && monthlyFluxData.monthlyFlux) {
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];

            return months.map((month, index) => {
                const flux = monthlyFluxData.monthlyFlux[index];
                return {
                    month,
                    solarIrradiance: flux ? Math.round(flux) : 0,
                    estimatedProduction: flux ? Math.round(flux * 0.15) : 0
                };
            });
        }

        if (solarData.solarPotential) {
            const annualSunshine = solarData.solarPotential.maxSunshineHoursPerYear;
            const systemSize = solarData.solarPotential.maxArrayPanelsCount * 0.4;
            
            const monthlyFactors = [
                0.75, 0.80, 0.95, 1.05, 1.15, 1.20,
                1.20, 1.15, 1.05, 0.95, 0.80, 0.75
            ];

            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];

            const avgMonthlyProduction = (annualSunshine / 12) * systemSize * 0.75;

            return months.map((month, index) => ({
                month,
                solarIrradiance: Math.round(annualSunshine / 12 * monthlyFactors[index]),
                estimatedProduction: Math.round(avgMonthlyProduction * monthlyFactors[index])
            }));
        }

        return null;
    }

    analyzeShadingImpact(hourlyShadeData) {
        const samples = this.extractShadeSamples(hourlyShadeData);

        if (!samples.length) {
            return {
                hasShading: false,
                overallShadePercent: 0,
                impactLevel: 'Minimal',
                peakShadingHours: [],
                recommendations: [
                    'Google Solar API did not detect meaningful shading on this roof. Panels should perform near their maximum potential.'
                ],
                hourlyShadeByHour: []
            };
        }

        const hourlyShade = this.aggregateShadeByHour(samples);
        const overallShadePercent = Math.round(
            hourlyShade.reduce((sum, entry) => sum + entry.averageShadePercent, 0) /
            hourlyShade.length
        );

        const periods = [
            { label: '6-9 AM', start: 6, end: 9 },
            { label: '9 AM - 12 PM', start: 9, end: 12 },
            { label: '12-3 PM', start: 12, end: 15 },
            { label: '3-6 PM', start: 15, end: 18 }
        ];

        const periodStats = periods.map(period => {
            const entries = hourlyShade.filter(entry =>
                entry.hour >= period.start && entry.hour < period.end
            );

            const average = entries.length
                ? Math.round(
                    entries.reduce((sum, entry) => sum + entry.averageShadePercent, 0) /
                    entries.length
                )
                : 0;

            return {
                ...period,
                averageShadePercent: average,
                impact: this.classifyShadingImpact(average)
            };
        }).filter(period => period.averageShadePercent > 0);

        const peakShadingHours = periodStats
            .sort((a, b) => b.averageShadePercent - a.averageShadePercent)
            .slice(0, 3)
            .map(period => ({
                time: period.label,
                impact: period.impact,
                averageShadePercent: period.averageShadePercent
            }));

        const impactLevel = this.classifyShadingImpact(overallShadePercent);
        const hasShading = overallShadePercent > 5;

        return {
            hasShading,
            overallShadePercent,
            impactLevel,
            peakShadingHours,
            recommendations: this.buildShadingRecommendations(
                overallShadePercent,
                peakShadingHours,
                hasShading
            ),
            hourlyShadeByHour: hourlyShade
        };
    }

    extractShadeSamples(hourlyShadeData) {
        if (!hourlyShadeData) {
            return [];
        }

        const container = hourlyShadeData.hourlyShade || hourlyShadeData;
        const potentialArrays = [
            container.hourlyShadeValues,
            container.values,
            container.hours,
            container.data,
            container.samples,
            Array.isArray(container) ? container : null
        ].filter(Array.isArray);

        const samples = [];

        potentialArrays.forEach(arr => {
            arr.forEach((entry, index) => {
                const normalized = this.normalizeShadeEntry(entry, index);
                if (normalized) {
                    samples.push(normalized);
                }
            });
        });

        return samples;
    }

    normalizeShadeEntry(entry, fallbackIndex) {
        if (entry == null) {
            return null;
        }

        const getNumber = (value) => {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                const parsed = parseFloat(value);
                return Number.isFinite(parsed) ? parsed : null;
            }
            if (value && typeof value === 'object') {
                if (typeof value.percent === 'number') return value.percent;
                if (typeof value.percentage === 'number') return value.percentage;
                if (typeof value.shadeFraction === 'number') return value.shadeFraction;
                if (typeof value.shadePercent === 'number') return value.shadePercent;
                if (typeof value.value === 'number') return value.value;
            }
            return null;
        };

        const shadeCandidates = [
            entry.shadePercent,
            entry.shadeFraction,
            entry.fractionInShade,
            entry.shade,
            entry.value,
            entry.percentage,
            entry.percent,
            entry
        ];

        let shadeValue = null;
        for (const candidate of shadeCandidates) {
            const number = getNumber(candidate);
            if (number != null) {
                shadeValue = number;
                break;
            }
        }

        if (shadeValue == null) {
            return null;
        }

        let percent = shadeValue;
        if (percent <= 1) {
            percent = percent * 100;
        }

        percent = Math.max(0, Math.min(100, percent));

        let hour = entry.hour ?? entry.hourOfDay ?? entry.localHour ?? entry.hourIndex;

        if (hour == null && typeof entry.timestamp === 'string') {
            const date = new Date(entry.timestamp);
            if (!isNaN(date.getTime())) {
                hour = date.getHours();
            }
        }

        if (hour == null && typeof entry.datetime === 'string') {
            const date = new Date(entry.datetime);
            if (!isNaN(date.getTime())) {
                hour = date.getHours();
            }
        }

        if (hour == null) {
            hour = fallbackIndex % 24;
        }

        hour = Math.max(0, Math.min(23, Math.floor(hour)));

        return {
            hour,
            shadePercent: Math.round(percent * 10) / 10
        };
    }

    aggregateShadeByHour(samples) {
        const hourMap = new Map();

        samples.forEach(sample => {
            const existing = hourMap.get(sample.hour) || [];
            existing.push(sample.shadePercent);
            hourMap.set(sample.hour, existing);
        });

        return Array.from(hourMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([hour, values]) => ({
                hour,
                averageShadePercent: Math.round(
                    values.reduce((sum, value) => sum + value, 0) /
                    values.length
                )
            }));
    }

    classifyShadingImpact(percent) {
        if (percent >= 60) return 'Severe';
        if (percent >= 35) return 'High';
        if (percent >= 15) return 'Moderate';
        if (percent > 0) return 'Low';
        return 'Minimal';
    }

    buildShadingRecommendations(overallShadePercent, peakShadingHours, hasShading) {
        if (!hasShading) {
            return [
                'Maintain current tree trimming practices and keep panels clear of debris to preserve excellent production levels.'
            ];
        }

        const recommendations = [];

        recommendations.push(
            `Average daily shading is approximately ${overallShadePercent}%. Mitigating the identified periods can unlock additional solar production.`
        );

        peakShadingHours.forEach(period => {
            if (period.impact === 'Severe') {
                recommendations.push(
                    `Severe shading detected between ${period.time}. Consider removing or trimming nearby trees or obstructions.`
                );
            } else if (period.impact === 'High') {
                recommendations.push(
                    `High shading during ${period.time}. Strategic panel placement or selective trimming could significantly improve output.`
                );
            } else if (period.impact === 'Moderate') {
                recommendations.push(
                    `Moderate shading around ${period.time}. Prioritize higher-performing roof planes during this window.`
                );
            }
        });

        recommendations.push('Request a professional shade study to validate onsite conditions and finalize panel placement.');

        return Array.from(new Set(recommendations));
    }

    extractFinancialInsights(solarData) {
        const analyses = solarData?.solarPotential?.financialAnalyses;

        if (!Array.isArray(analyses) || analyses.length === 0) {
            return null;
        }

        const scenarios = analyses.map((analysis, index) => {
            const details = analysis.financialDetails || {};

            const scenario = {
                scenarioIndex: analysis.panelConfigIndex ?? index,
                monthlyBillEstimate: this.extractUnits(analysis.monthlyBill),
                solarOffsetPercent: details.solarPercentage ?? null,
                exportedEnergyPercent: details.percentageExportedToGrid ?? null,
                annualProductionKwh: details.initialAcKwhPerYear ?? null,
                lifetimeUtilityCostWithSolar: this.extractUnits(details.remainingLifetimeUtilityCost),
                lifetimeUtilityCostWithoutSolar: this.extractUnits(details.costOfElectricityWithoutSolar),
                federalIncentive: this.extractUnits(details.federalIncentive),
                stateIncentive: this.extractUnits(details.stateIncentive),
                utilityRebate: this.extractUnits(details.utilityRebate),
                otherIncentives: this.extractUnits(details.otherIncentives),
                lifetimeSrecTotal: this.extractUnits(details.lifetimeSrecTotal),
                netMeteringAllowed: details.netMeteringAllowed ?? null,
                paybackYears: typeof details.paybackYears === 'number'
                    ? Math.round(details.paybackYears * 10) / 10
                    : null,
                upfrontCost: this.extractUnits(details.initialInvestment) ??
                    this.extractUnits(details.systemCost) ?? null,
                maintenanceCost: this.extractUnits(details.maintenanceCost) ?? null
            };

            const incentiveValues = [
                scenario.federalIncentive,
                scenario.stateIncentive,
                scenario.utilityRebate,
                scenario.otherIncentives,
                scenario.lifetimeSrecTotal
            ].filter(value => typeof value === 'number');

            scenario.totalIncentives = incentiveValues.reduce((sum, value) => sum + value, 0);

            if (typeof scenario.lifetimeUtilityCostWithoutSolar === 'number' &&
                typeof scenario.lifetimeUtilityCostWithSolar === 'number') {
                scenario.lifetimeSavings = Math.round(
                    scenario.lifetimeUtilityCostWithoutSolar - scenario.lifetimeUtilityCostWithSolar
                );
            } else {
                scenario.lifetimeSavings = null;
            }

            return scenario;
        }).filter(scenario => Object.values(scenario).some(value => value !== null));

        if (!scenarios.length) {
            return null;
        }

        const bestCase = scenarios.reduce((best, current) => {
            if (!best) return current;

            const bestOffset = best.solarOffsetPercent ?? 0;
            const currentOffset = current.solarOffsetPercent ?? 0;

            if (currentOffset !== bestOffset) {
                return currentOffset > bestOffset ? current : best;
            }

            const bestSavings = best.lifetimeSavings ?? -Infinity;
            const currentSavings = current.lifetimeSavings ?? -Infinity;

            if (currentSavings !== bestSavings) {
                return currentSavings > bestSavings ? current : best;
            }

            const bestPayback = best.paybackYears ?? Infinity;
            const currentPayback = current.paybackYears ?? Infinity;

            return currentPayback < bestPayback ? current : best;
        }, null);

        const average = (values) => {
            const numeric = values.filter(value => typeof value === 'number' && !isNaN(value));
            if (!numeric.length) return null;
            const total = numeric.reduce((sum, value) => sum + value, 0);
            return Math.round((total / numeric.length) * 10) / 10;
        };

        return {
            bestCase,
            scenarios: scenarios.sort((a, b) => (b.solarOffsetPercent ?? 0) - (a.solarOffsetPercent ?? 0)),
            summary: {
                scenariosConsidered: scenarios.length,
                averageOffsetPercent: average(scenarios.map(s => s.solarOffsetPercent)),
                typicalPaybackYears: average(scenarios.map(s => s.paybackYears)),
                averageLifetimeSavings: average(scenarios.map(s => s.lifetimeSavings)),
                incentivesAvailable: scenarios.some(s => s.totalIncentives > 0)
            }
        };
    }

    extractUnits(value) {
        if (value == null) {
            return null;
        }

        if (typeof value === 'number') {
            return value;
        }

        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : null;
        }

        if (typeof value === 'object') {
            if (typeof value.units === 'number') {
                return value.units;
            }
            if (typeof value.value === 'number') {
                return value.value;
            }
            if (typeof value.amount === 'number') {
                return value.amount;
            }
        }

        return null;
    }

    analyzeSeasonalVariation(monthlyProduction) {
        if (!monthlyProduction) return null;

        const winter = monthlyProduction.slice(0, 2).concat(monthlyProduction.slice(11));
        const spring = monthlyProduction.slice(2, 5);
        const summer = monthlyProduction.slice(5, 8);
        const fall = monthlyProduction.slice(8, 11);

        const avgProduction = (season) => {
            const total = season.reduce((sum, m) => sum + m.estimatedProduction, 0);
            return Math.round(total / season.length);
        };

        return {
            winter: { avg: avgProduction(winter), months: winter },
            spring: { avg: avgProduction(spring), months: spring },
            summer: { avg: avgProduction(summer), months: summer },
            fall: { avg: avgProduction(fall), months: fall }
        };
    }
}

module.exports = RoofAnalyzer;