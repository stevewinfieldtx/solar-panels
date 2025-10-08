// api/map-config.js
// Reads the Google Maps API key from the environment securely.

module.exports = async (req, res) => {
    // Enable CORS and handle OPTIONS request method
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
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: GOOGLE_MAPS_API_KEY not set.' });
        }

        // Serve the API key securely as JSON
        res.status(200).json({ apiKey });
    } catch (error) {
        console.error('Map config error:', error);
        res.status(500).json({ error: 'Failed to retrieve map configuration.' });
    }
};