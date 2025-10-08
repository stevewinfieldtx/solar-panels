// lib/SolarAnalyzer.js
const fetch = require('node-fetch');

class SolarAnalyzer {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://solar.googleapis.com/v1';
    }

    async getBuildingInsights(lat, lng) {
        const url = `${this.baseUrl}/buildingInsights:findClosest?` +
            `location.latitude=${lat}` +
            `&location.longitude=${lng}` +
            `&requiredQuality=HIGH` +
            `&key=${this.apiKey}`;

        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Solar API request failed');
        }

        return await response.json();
    }

    async geocodeAddress(address) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?` +
            `address=${encodeURIComponent(address)}` +
            `&key=${this.apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' || !data.results.length) {
            throw new Error('Address not found');
        }

        const result = data.results[0];
        return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id
        };
    }

    async getDataLayer(buildingName, layerType) {
        const url = `${this.baseUrl}/${buildingName}/dataLayers:get?` +
            `layerType=${layerType}` +
            `&key=${this.apiKey}`;

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data layer');
        }

        return await response.json();
    }
}

module.exports = SolarAnalyzer;