// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import API routes
const geocode = require('./api/geocode');
const analyzeRoof = require('./api/analyze-roof');
const dataLayer = require('./api/data-layer');

// API Routes
app.post('/api/geocode', async (req, res) => {
    try {
        await geocode(req, res);
    } catch (error) {
        console.error('Geocode error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/analyze-roof', async (req, res) => {
    try {
        await analyzeRoof(req, res);
    } catch (error) {
        console.error('Analyze error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/data-layer', async (req, res) => {
    try {
        await dataLayer(req, res);
    } catch (error) {
        console.error('Data layer error:', error);
        res.status(500).json({ error: error.message });
    }
});


// Add ROI Calculator route
app.post('/api/calculate-roi', async (req, res) => {
    try {
        await require('./api/calculate-roi')(req, res);
    } catch (error) {
        console.error('ROI error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ROI Calculator route
app.post('/api/calculate-roi', async (req, res) => {
    try {
        await require('./api/calculate-roi')(req, res);
    } catch (error) {
        console.error('ROI error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving from: ${path.join(__dirname, 'public')}`);
});