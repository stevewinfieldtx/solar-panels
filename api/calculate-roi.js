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

        const config = {
            quality: 'residential',
            costPerWatt: normalizedCostPerWatt,
            costPerPanel: normalizedCostPerPanel,
            panelWattage: normalizedPanelWattage,
            federalITC: normalizedFederalITC,
            stateTaxCredit: stateIncentive?.stateTaxCredit ?? 0,
            maxStateCredit: stateIncentive?.maxCredit ?? null,
            localRebate: normalizedLocalRebate,
            annualRateIncrease: normalizedRateIncrease ?? growthData.rate,
            panelDegradation: normalizedPanelDegradation ?? ROIConfig.system.panelDegradation,
            annualMaintenance: normalizedMaintenance ?? ROIConfig.system.annualMaintenance,
            homeValueMultiplier: normalizedHomeValueMultiplier ?? ROIConfig.system.homeValueMultiplier,
            currentMonthlyBill: normalizedMonthlyBill,
            currentHomeValue: normalizedHomeValue,
            financingType: userInputs.financingType || 'loan10',
            loanRate: normalizedLoanRate,
            loanTerm: normalizedLoanTerm
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
            config.currentMonthlyBill,
            config
        );

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
