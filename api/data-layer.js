// api/data-layer.js
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { buildingName, layerType } = req.query;
        if (!buildingName || !layerType) {
            return res.status(400).json({
                error: 'buildingName and layerType are required'
            });
        }

        const SolarAnalyzer = require('../lib/SolarAnalyzer');
        console.log('Lazy-loaded SolarAnalyzer in data-layer:', SolarAnalyzer);
        const analyzer = new SolarAnalyzer(process.env.GOOGLE_SOLAR_API_KEY);
        const dataLayer = await analyzer.getDataLayer(buildingName, layerType);

        res.status(200).json(dataLayer);
    } catch (error) {
        console.error('Data layer error:', error);
        res.status(500).json({
            error: 'Failed to fetch data layer',
            message: error.message
        });
    }
};