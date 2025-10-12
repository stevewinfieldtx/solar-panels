// api/geocode.js
const SolarAnalyzer = require('../lib/SolarAnalyzer');

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
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        const solarAnalyzer = new SolarAnalyzer(process.env.GOOGLE_MAPS_API_KEY);
        const location = await solarAnalyzer.geocodeAddress(address);

        console.log('Geocoded:', location.formattedAddress);

        res.status(200).json(location);

    } catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({
            error: 'Failed to geocode address',
            message: error.message
        });
    }
};