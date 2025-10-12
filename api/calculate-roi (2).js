// api/calculate-roi.js
const EnergyRateCalculator = require('../lib/EnergyRateCalculator');
const ROICalculator = require('../lib/ROICalculator');
const ROIConfig = require('../lib/ROIConfig');

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
        } = req.body;

        if (!systemSizeKW || !annualProduction || !state) {
            return res.status(400).json({ 
                error: 'Missing required parameters' 
            });
        }

        console.log(`Calculating ROI for ${systemSizeKW}kW system in ${city}, ${state}`);

        // Get local energy rate
        const energyCalc = new EnergyRateCalculator(process.env.OPENEI_API_KEY);
        const energyRate = await energyCalc.getLocalEnergyRate(zipCode, state, city);

        // Get historical growth rate for this state
        const growthData = ROIConfig.historicalGrowth[state] || ROIConfig.historicalGrowth.DEFAULT;

        // Get state incentives
        const stateIncentive = ROIConfig.incentives.stateIncentives[state] || null;

        // Merge user inputs with defaults
        const config = {
            costPerWatt: userInputs.costPerWatt || ROIConfig.costs.residential,
            federalITC: userInputs.federalITC || ROIConfig.incentives.federalITC,
            stateTaxCredit: stateIncentive?.stateTaxCredit || 0,
            maxStateCredit: stateIncentive?.maxCredit || 0,
            annualRateIncrease: userInputs.annualRateIncrease || growthData.rate,
            panelDegradation: userInputs.panelDegradation || ROIConfig.system.panelDegradation,
            annualMaintenance: userInputs.annualMaintenance || ROIConfig.system.annualMaintenance,
            homeValueMultiplier: userInputs.homeValueMultiplier || ROIConfig.system.homeValueMultiplier,
            currentMonthlyBill: userInputs.currentMonthlyBill || null,
            currentHomeValue: userInputs.currentHomeValue || null,
            financingType: userInputs.financingType || 'loan10',
            loanRate: userInputs.loanRate || null,
            loanTerm: userInputs.loanTerm || null
        };

        // Calculate ROI
        const roiCalc = new ROICalculator();
        const roi = roiCalc.generateFullROI(
            systemSizeKW,
            annualProduction,
            energyRate.rate,
            config
        );

        // Add monthly breakdown
        const monthlyBreakdown = roiCalc.calculateMonthlyBreakdown(
            roi,
            energyRate.rate,
            annualProduction,
            config.currentMonthlyBill
        );

        const response = {
            success: true,
            location: { zipCode, state, city },
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