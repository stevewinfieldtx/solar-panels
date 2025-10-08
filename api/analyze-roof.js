// api/analyze-roof.js
const SolarAnalyzer = require('../lib/SolarAnalyzer');
const RoofAnalyzer = require('../lib/RoofAnalyzer');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
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

        // Initialize analyzers
        const solarAnalyzer = new SolarAnalyzer(process.env.GOOGLE_SOLAR_API_KEY);
        const roofAnalyzer = new RoofAnalyzer();

        // Get coordinates if not provided
        let location;
        if (!lat || !lng) {
            location = await solarAnalyzer.geocodeAddress(address);
        } else {
            location = { lat, lng, formattedAddress: address };
        }

        console.log(`Analyzing: ${location.formattedAddress}`);

        // Get solar data
        const solarData = await solarAnalyzer.getBuildingInsights(
            location.lat, 
            location.lng
        );

        // Analyze roof segments
        const segments = roofAnalyzer.analyzeRoofSegments(solarData);

        // Generate recommendations
        const recommendations = roofAnalyzer.generateRecommendations(
            segments, 
            location.formattedAddress
        );

        // Compile response
        const response = {
            success: true,
            address: location.formattedAddress,
            location: {
                lat: location.lat,
                lng: location.lng
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