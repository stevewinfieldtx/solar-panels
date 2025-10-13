// api/calculate-roi.js
const EnergyRateCalculator = require('../lib/EnergyRateCalculator');
const ROICalculator = require('../lib/ROICalculator');
const ROIConfig = require('../lib/ROIConfig');

function parseNumber(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function normalizeCityName(city) {
    return typeof city === 'string' && city.trim().length
        ? city.trim().toLowerCase()
        : null;
}

function filterProgramsForLocation(programs = [], city) {
    if (!Array.isArray(programs)) {
        return [];
    }

    const normalizedCity = normalizeCityName(city);

    return programs.filter(program => {
        if (!Array.isArray(program.cities) || program.cities.length === 0) {
            return true;
        }

        if (!normalizedCity) {
            return false;
        }

        return program.cities.some(c => normalizeCityName(c) === normalizedCity);
    });
}

function estimateProgramValue(program, systemSizeKW, annualProduction) {
    if (!program || !program.valueType) {
        return null;
    }

    const watts = Number.isFinite(systemSizeKW) ? systemSizeKW * 1000 : null;
    let estimate = null;

    switch (program.valueType) {
        case 'perWatt':
            if (watts != null && Number.isFinite(program.value)) {
                estimate = watts * program.value;
            }
            break;
        case 'flat':
            if (Number.isFinite(program.value)) {
                estimate = program.value;
            }
            break;
        case 'billCredit':
            if (Number.isFinite(annualProduction) && Number.isFinite(program.value)) {
                estimate = annualProduction * program.value;
            }
            break;
        case 'perWattHour':
            // Storage-focused incentives are highly configuration-specific; leave as guidance only.
            estimate = null;
            break;
        default:
            estimate = null;
    }

    if (estimate != null && Number.isFinite(program.maxValue)) {
        estimate = Math.min(estimate, program.maxValue);
    }

    return estimate != null && Number.isFinite(estimate)
        ? Math.round(estimate)
        : null;
}

function describeProgram(program, systemSizeKW, annualProduction) {
    if (!program) {
        return null;
    }

    return {
        name: program.name,
        provider: program.provider,
        type: program.type || null,
        description: program.description || null,
        estimatedValue: estimateProgramValue(program, systemSizeKW, annualProduction),
        valueType: program.valueType || null,
        maxValue: program.maxValue || null,
        appliesTo: program.appliesTo || null,
        url: program.url || null,
        cities: Array.isArray(program.cities) ? program.cities : null
    };
}

function selectBestAutomaticProgram(programs, systemSizeKW, annualProduction) {
    if (!Array.isArray(programs) || programs.length === 0) {
        return null;
    }

    let best = null;

    programs.forEach(program => {
        if (!['perWatt', 'flat'].includes(program.valueType)) {
            return;
        }

        const estimate = estimateProgramValue(program, systemSizeKW, annualProduction);
        if (estimate && estimate > 0) {
            if (!best || estimate > best.amount) {
                best = { program, amount: estimate };
            }
        }
    });

    return best;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            systemSizeKW,
            annualProduction,
            zipCode,
            state,
            city,
            selectedSegments,
            userInputs = {}
        } = req.body || {};

        const parsedSystemSize = parseNumber(systemSizeKW);
        const parsedAnnualProduction = parseNumber(annualProduction);

        if (!parsedSystemSize || parsedSystemSize <= 0) {
            return res.status(400).json({
                error: 'Invalid system size',
                message: 'System size must be provided in kW and greater than zero.'
            });
        }

        if (!parsedAnnualProduction || parsedAnnualProduction <= 0) {
            return res.status(400).json({
                error: 'Invalid annual production',
                message: 'Annual production must be provided in kWh and greater than zero.'
            });
        }

        const normalizedState = typeof state === 'string'
            ? state.trim().toUpperCase()
            : null;
        const normalizedCity = typeof city === 'string' ? city : null;
        const normalizedZip = typeof zipCode === 'string' && zipCode.trim().length
            ? zipCode.trim()
            : null;

        const userEnergyRate = parseNumber(userInputs.energyRate);

        console.log(`Calculating ROI for ${parsedSystemSize}kW system in ${normalizedCity || 'Unknown City'}, ${normalizedState || 'Unknown State'}`);

        const energyCalc = new EnergyRateCalculator(process.env.OPENEI_API_KEY);
        let energyRate = await energyCalc.getLocalEnergyRate(normalizedZip, normalizedState, normalizedCity);

        if (!energyRate || !Number.isFinite(energyRate.rate) || energyRate.rate <= 0) {
            const fallbackRate = (userEnergyRate && userEnergyRate > 0) ? userEnergyRate : 0.1399;
            energyRate = {
                rate: fallbackRate,
                source: (userEnergyRate && userEnergyRate > 0)
                    ? 'User supplied rate'
                    : 'National average estimate',
                utility: (userEnergyRate && userEnergyRate > 0) ? 'User input' : 'Local utility',
                isEstimate: true
            };
        }

        const growthData = ROIConfig.historicalGrowth[normalizedState] || ROIConfig.historicalGrowth.DEFAULT;
        const stateIncentive = ROIConfig.incentives.stateIncentives[normalizedState] || null;

        const normalizedCostPerWatt = parseNumber(userInputs.costPerWatt);
        const normalizedCostPerPanel = parseNumber(userInputs.costPerPanel);
        const normalizedPanelWattage = parseNumber(userInputs.panelWattage) || 400;
        const normalizedFederalITC = parseNumber(userInputs.federalITC);
        const normalizedLocalRebate = parseNumber(userInputs.localRebate);
        const normalizedRateIncrease = parseNumber(userInputs.annualRateIncrease);
        const normalizedPanelDegradation = parseNumber(userInputs.panelDegradation);
        const normalizedMaintenance = parseNumber(userInputs.annualMaintenance);
        const normalizedHomeValueMultiplier = parseNumber(userInputs.homeValueMultiplier);
        const normalizedMonthlyBill = parseNumber(userInputs.currentMonthlyBill);
        const normalizedHomeValue = parseNumber(userInputs.currentHomeValue);
        const normalizedLoanRate = parseNumber(userInputs.loanRate);
        const normalizedLoanTerm = parseNumber(userInputs.loanTerm);
        const normalizedShadeLossPercent = parseNumber(userInputs.shadeLossPercent);

        const shadeImpactLevel = typeof userInputs.shadeImpactLevel === 'string'
            ? userInputs.shadeImpactLevel
            : null;

        const shadePeakHours = Array.isArray(userInputs.shadePeakHours)
            ? userInputs.shadePeakHours.slice(0, 5)
            : [];

        const shadeRecommendations = Array.isArray(userInputs.shadeRecommendations)
            ? userInputs.shadeRecommendations.slice(0, 10)
            : [];

        const stateLocalPrograms = ROIConfig.incentives.localRebates[normalizedState] || [];
        const defaultLocalPrograms = ROIConfig.incentives.localRebates.DEFAULT || [];
        let applicableLocalPrograms = filterProgramsForLocation(stateLocalPrograms, normalizedCity);

        if (!applicableLocalPrograms.length && stateLocalPrograms.length) {
            applicableLocalPrograms = stateLocalPrograms.filter(program =>
                !Array.isArray(program.cities) || program.cities.length === 0
            );
        }

        if (!applicableLocalPrograms.length) {
            applicableLocalPrograms = filterProgramsForLocation(defaultLocalPrograms, normalizedCity);
        }

        const automaticLocal = selectBestAutomaticProgram(
            applicableLocalPrograms,
            parsedSystemSize,
            parsedAnnualProduction
        );

        let appliedLocalRebate = normalizedLocalRebate;
        let appliedLocalProgram = null;
        let localRebateSource = null;

        if ((appliedLocalRebate == null || appliedLocalRebate === 0) && automaticLocal) {
            appliedLocalRebate = automaticLocal.amount;
            appliedLocalProgram = automaticLocal.program;
            localRebateSource = automaticLocal.program?.name || null;
        } else if (appliedLocalRebate != null && appliedLocalRebate > 0) {
            localRebateSource = 'User provided rebate';
        }

        if (appliedLocalRebate == null) {
            appliedLocalRebate = 0;
        }

        const vendorProgramsForState = ROIConfig.incentives.vendorPrograms[normalizedState] || [];
        const vendorProgramsFallback = ROIConfig.incentives.vendorPrograms.DEFAULT || [];
        const vendorPrograms = vendorProgramsForState.length
            ? vendorProgramsForState
            : vendorProgramsFallback;

        const config = {
            quality: 'residential',
            costPerWatt: normalizedCostPerWatt,
            costPerPanel: normalizedCostPerPanel,
            panelWattage: normalizedPanelWattage,
            federalITC: normalizedFederalITC,
            stateTaxCredit: stateIncentive?.stateTaxCredit ?? 0,
            maxStateCredit: stateIncentive?.maxCredit ?? null,
            localRebate: normalizedLocalRebate,
            localRebate: appliedLocalRebate,
            annualRateIncrease: normalizedRateIncrease ?? growthData.rate,
            panelDegradation: normalizedPanelDegradation ?? ROIConfig.system.panelDegradation,
            annualMaintenance: normalizedMaintenance ?? ROIConfig.system.annualMaintenance,
            homeValueMultiplier: normalizedHomeValueMultiplier ?? ROIConfig.system.homeValueMultiplier,
            currentMonthlyBill: normalizedMonthlyBill,
            currentHomeValue: normalizedHomeValue,
            financingType: userInputs.financingType || 'loan10',
            loanRate: normalizedLoanRate,
            loanTerm: normalizedLoanTerm
            loanTerm: normalizedLoanTerm,
            localRebateSource,
            shadeLossPercent: normalizedShadeLossPercent,
            shadeImpactLevel,
            shadePeakHours,
            shadeRecommendations
        };

        const roiCalc = new ROICalculator();
        const roi = roiCalc.generateFullROI(
            parsedSystemSize,
            parsedAnnualProduction,
            energyRate.rate,
            config
        );

        const monthlyBreakdown = roiCalc.calculateMonthlyBreakdown(
            roi,
            energyRate.rate,
            parsedAnnualProduction,
            energyRate.rate,
            config
        );

        const monthlyBreakdown = roiCalc.calculateMonthlyBreakdown(
            roi,
            energyRate.rate,
            roi.shading?.adjustedAnnualProduction ?? parsedAnnualProduction,
            config.currentMonthlyBill,
            config
        );

            energyRate.rate,
            config
        );

        const monthlyBreakdown = roiCalc.calculateMonthlyBreakdown(
            roi,
            energyRate.rate,
            roi.shading?.adjustedAnnualProduction ?? parsedAnnualProduction,
            config.currentMonthlyBill,
            config
        );

        const appliedIncentives = [];
        const potentialIncentives = [];
        const incentiveNotes = [];

        if (roi.costs?.federalTaxCredit > 0) {
            appliedIncentives.push({
                name: 'Federal Investment Tax Credit',
                type: 'federal',
                value: roi.costs.federalTaxCredit,
                description: '30% credit applied to eligible solar installation costs.'
            });
        }

        if (roi.costs?.stateTaxCredit > 0) {
            appliedIncentives.push({
                name: stateIncentive?.name || 'State Tax Credit',
                type: 'state',
                value: roi.costs.stateTaxCredit,
                description: stateIncentive?.description || 'State-level credit or exemption applied to system cost.',
                provider: stateIncentive?.name || null
            });
        } else if (stateIncentive?.propertyTaxExempt) {
            incentiveNotes.push('State law exempts qualified solar equipment from property tax assessments.');
        }

        if (appliedLocalRebate > 0) {
            appliedIncentives.push({
                name: localRebateSource || 'Local rebate',
                type: 'local',
                value: appliedLocalRebate,
                description: appliedLocalProgram?.description || 'Local rebate applied to upfront costs.',
                provider: appliedLocalProgram?.provider || null
            });
        }

        const uniqueLocalPrograms = Array.isArray(applicableLocalPrograms)
            ? applicableLocalPrograms.filter(program =>
                !appliedLocalProgram || program.name !== appliedLocalProgram.name
            )
            : [];

        uniqueLocalPrograms.forEach(program => {
            const summary = describeProgram(program, parsedSystemSize, parsedAnnualProduction);
            if (summary) {
                potentialIncentives.push({
                    ...summary,
                    category: 'local'
                });
            }
        });

        vendorPrograms.forEach(program => {
            const summary = {
                name: program.name,
                provider: program.provider,
                type: 'vendor',
                description: program.description || null,
                estimatedValue: null,
                estimatedValuePercent: program.estimatedValuePercent || null,
                estimatedValueFlat: program.estimatedValue || null,
                category: 'vendor'
            };

            if (program.estimatedValuePercent && roi.costs?.grossCost) {
                const percentValue = (program.estimatedValuePercent / 100) * roi.costs.grossCost;
                summary.estimatedValue = Math.round(percentValue);
            } else if (program.estimatedValue && Number.isFinite(program.estimatedValue)) {
                summary.estimatedValue = Math.round(program.estimatedValue);
            }

            potentialIncentives.push(summary);
        });

        if (stateIncentive?.sgipRebate) {
            potentialIncentives.push({
                name: 'California SGIP Bonus',
                provider: 'CPUC',
                type: 'state',
                description: 'Pair storage with solar to unlock Self-Generation Incentive Program rebates.',
                estimatedValue: null,
                category: 'state'
            });
        }

        if (!potentialIncentives.length && incentiveNotes.length === 0) {
            incentiveNotes.push('Check with your utility or installer—many offer seasonal rebates or bill credits.');
        }

        const shadingImpact = {
            lossPercent: roi.shading?.shadingLossPercent ?? (normalizedShadeLossPercent || 0),
            impactLevel: shadeImpactLevel,
            peakHours: shadePeakHours,
            recommendations: shadeRecommendations,
            adjustedAnnualProduction: roi.shading?.adjustedAnnualProduction ?? roi.annualProduction,
            lostKwh: roi.shading?.lostKwh ?? 0,
            productionMultiplier: roi.shading?.shadingMultiplier ?? null
        };

        const incentiveSummary = {
            applied: appliedIncentives,
            potential: potentialIncentives,
            notes: incentiveNotes
        };

        const response = {
            success: true,
            location: { zipCode: normalizedZip, state: normalizedState, city: normalizedCity },
            energyRate: energyRate,
            historicalGrowth: growthData,
            stateIncentive: stateIncentive,
            selectedSegments: selectedSegments,
            config: config,
            roi: roi,
            monthlyBreakdown: monthlyBreakdown,
            incentiveSummary,
            shadingImpact,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('ROI calculation error:', error);
        res.status(500).json({
            error: 'Failed to calculate ROI',
            message: error.message
        });
    }
};
