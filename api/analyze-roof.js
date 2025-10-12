// api/analyze-roof.js
const SolarAnalyzer = require('../lib/SolarAnalyzer');
const RoofAnalyzer = require('../lib/RoofAnalyzer');

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
        const { address, lat, lng } = req.body;

        if (!address || (!lat && !lng)) {
            return res.status(400).json({ 
                error: 'Address and coordinates are required' 
            });
        }

        const solarAnalyzer = new SolarAnalyzer(process.env.GOOGLE_SOLAR_API_KEY);
        const roofAnalyzer = new RoofAnalyzer();

        let location;
        if (!lat || !lng) {
            location = await solarAnalyzer.geocodeAddress(address);
        } else {
            location = { lat, lng, formattedAddress: address };
        }

        console.log(`Analyzing: ${location.formattedAddress}`);

        const solarData = await solarAnalyzer.getBuildingInsights(
            location.lat, 
            location.lng
        );

        console.log('Fetching enhanced data layers...');
        const dataLayers = await solarAnalyzer.getAllDataLayers(solarData.name);

        const segments = roofAnalyzer.analyzeRoofSegments(solarData);
        const recommendations = roofAnalyzer.generateRecommendations(segments, location.formattedAddress);
        const monthlyProduction = roofAnalyzer.analyzeMonthlyProduction(solarData, dataLayers.monthlyFlux);
        const shadingAnalysis = roofAnalyzer.analyzeShadingImpact(dataLayers.hourlyShade);
        const seasonalVariation = roofAnalyzer.analyzeSeasonalVariation(monthlyProduction);

        const response = {
            success: true,
            address: location.formattedAddress,
            location: {
                lat: location.lat,
                lng: location.lng,
                zipCode: location.zipCode,
                city: location.city,
                state: location.state,
                county: location.county
            },
            buildingInsights: {
                name: solarData.name,
                center: solarData.center,
                imageryDate: solarData.imageryDate,
                imageryQuality: solarData.imageryQuality
            },
            roofSegments: segments,
            recommendations: recommendations,
            solarPotential: {
                maxArrayPanelsCount: solarData.solarPotential.maxArrayPanelsCount,
                maxArrayAreaMeters2: solarData.solarPotential.maxArrayAreaMeters2,
                maxArrayAreaSqFt: Math.round(solarData.solarPotential.maxArrayAreaMeters2 * 10.764),
                maxSunshineHoursPerYear: solarData.solarPotential.maxSunshineHoursPerYear
            },
            monthlyProduction: monthlyProduction,
            shadingAnalysis: shadingAnalysis,
            seasonalVariation: seasonalVariation,
            dataLayersAvailable: {
                monthlyFlux: !!dataLayers.monthlyFlux,
                annualFlux: !!dataLayers.annualFlux,
                hourlyShade: !!dataLayers.hourlyShade
            },
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('Analysis error:', error);
        
        if (error.message.includes('No data available') || 
            error.message.includes('Solar API request failed')) {
            return res.status(404).json({
                error: 'Solar data not available',
                message: 'Google Solar API does not have imagery for this location yet.',
                details: error.message
            });
        }

        res.status(500).json({
            error: 'Failed to analyze roof',
            message: error.message
        });
    }
};