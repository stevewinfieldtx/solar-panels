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
        
        let zipCode = null;
        let city = null;
        let state = null;
        let county = null;
        
        for (const component of result.address_components) {
            if (component.types.includes('postal_code')) {
                zipCode = component.long_name;
            }
            if (component.types.includes('locality')) {
                city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
                state = component.short_name;
            }
            if (component.types.includes('administrative_area_level_2')) {
                county = component.long_name;
            }
        }

        return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id,
            zipCode: zipCode,
            city: city,
            state: state,
            county: county
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

    async getMonthlyFlux(buildingName) {
        return await this.getDataLayer(buildingName, 'MONTHLY_FLUX');
    }

    async getAnnualFlux(buildingName) {
        return await this.getDataLayer(buildingName, 'ANNUAL_FLUX');
    }

    async getHourlyShade(buildingName) {
        return await this.getDataLayer(buildingName, 'HOURLY_SHADE');
    }

    async getAllDataLayers(buildingName) {
        try {
            const [monthlyFlux, annualFlux, hourlyShade] = await Promise.allSettled([
                this.getMonthlyFlux(buildingName),
                this.getAnnualFlux(buildingName),
                this.getHourlyShade(buildingName)
            ]);

            return {
                monthlyFlux: monthlyFlux.status === 'fulfilled' ? monthlyFlux.value : null,
                annualFlux: annualFlux.status === 'fulfilled' ? annualFlux.value : null,
                hourlyShade: hourlyShade.status === 'fulfilled' ? hourlyShade.value : null
            };
        } catch (error) {
            console.warn('Some data layers unavailable:', error.message);
            return {
                monthlyFlux: null,
                annualFlux: null,
                hourlyShade: null
            };
        }
    }
}

module.exports = SolarAnalyzer;