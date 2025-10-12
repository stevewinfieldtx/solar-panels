// api/calculate-roi.js
const EnergyRateCalculator = require('../lib/EnergyRateCalculator');
const ROICalculator = require('../lib/ROICalculator');

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
            quality = 'residential'
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

        // Calculate ROI
        const roiCalc = new ROICalculator();
        const roi = roiCalc.generateFullROI(
            systemSizeKW, 
            annualProduction, 
            energyRate.rate,
            quality
        );

        const response = {
            success: true,
            energyRate: energyRate,
            roi: roi,
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