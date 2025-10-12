// lib/EnergyRateCalculator.js
const fetch = require('node-fetch');

class EnergyRateCalculator {
    constructor(apiKey) {
        this.openEIKey = apiKey;
        
        // Fallback state averages (2024 EIA data - $/kWh)
        this.stateAverages = {
            'AL': 0.1424, 'AK': 0.2376, 'AZ': 0.1388, 'AR': 0.1182,
            'CA': 0.2820, 'CO': 0.1389, 'CT': 0.2471, 'DE': 0.1354,
            'FL': 0.1289, 'GA': 0.1354, 'HI': 0.4180, 'ID': 0.1088,
            'IL': 0.1423, 'IN': 0.1407, 'IA': 0.1353, 'KS': 0.1413,
            'KY': 0.1193, 'LA': 0.1159, 'ME': 0.1738, 'MD': 0.1448,
            'MA': 0.2418, 'MI': 0.1781, 'MN': 0.1420, 'MS': 0.1217,
            'MO': 0.1214, 'MT': 0.1171, 'NE': 0.1128, 'NV': 0.1368,
            'NH': 0.2232, 'NJ': 0.1686, 'NM': 0.1398, 'NY': 0.2134,
            'NC': 0.1226, 'ND': 0.1135, 'OH': 0.1416, 'OK': 0.1147,
            'OR': 0.1183, 'PA': 0.1494, 'RI': 0.2446, 'SC': 0.1385,
            'SD': 0.1264, 'TN': 0.1214, 'TX': 0.1399, 'UT': 0.1106,
            'VT': 0.1960, 'VA': 0.1321, 'WA': 0.1039, 'WV': 0.1252,
            'WI': 0.1524, 'WY': 0.1135, 'DC': 0.1392
        };

        // Major utility companies by state
        this.majorUtilities = {
            'TX': ['TXU Energy', 'Reliant Energy', 'Direct Energy', 'Green Mountain Energy'],
            'CA': ['PG&E', 'SCE', 'SDG&E'],
            'NY': ['Con Edison', 'National Grid', 'NYSEG'],
            'FL': ['FPL', 'Duke Energy', 'TECO'],
            'IL': ['ComEd', 'Ameren'],
            'OH': ['AEP Ohio', 'Duke Energy Ohio', 'FirstEnergy']
        };
    }

    async getLocalEnergyRate(zipCode, state, city) {
        try {
            console.log(`Looking up energy rate for ZIP: ${zipCode}, State: ${state}, City: ${city}`);

            // Try OpenEI API first
            if (this.openEIKey && this.openEIKey !== 'YOUR_KEY_HERE') {
                const openEIRate = await this.getOpenEIRate(zipCode);
                if (openEIRate) {
                    return openEIRate;
                }
            }

            // Fallback: Use detailed state/city logic
            return this.getDetailedStateRate(state, city, zipCode);

        } catch (error) {
            console.warn('Energy rate lookup failed:', error.message);
            return this.getFallbackRate(state);
        }
    }

    async getOpenEIRate(zipCode) {
        try {
            const url = `https://api.openei.org/utility_rates?version=latest&format=json&api_key=${this.openEIKey}&address=${zipCode}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn('OpenEI API request failed:', response.status);
                return null;
            }

            const data = await response.json();

            if (data.items && data.items.length > 0) {
                // Get residential rates
                const residentialRates = data.items.filter(item => 
                    item.sector && item.sector.toLowerCase().includes('residential')
                );

                if (residentialRates.length > 0) {
                    // Use the first residential rate
                    const rate = residentialRates[0];
                    
                    // Extract rate (energy charge)
                    let rateValue = null;
                    
                    if (rate.energyratestructure && rate.energyratestructure.length > 0) {
                        const structure = rate.energyratestructure[0];
                        if (structure.rate) {
                            rateValue = structure.rate;
                        }
                    }

                    if (rateValue) {
                        return {
                            rate: rateValue,
                            source: 'OpenEI Database',
                            utility: rate.utility || 'Local utility',
                            isEstimate: false,
                            tariffName: rate.name || 'Residential'
                        };
                    }
                }
            }

            return null;

        } catch (error) {
            console.warn('OpenEI lookup error:', error.message);
            return null;
        }
    }

    getDetailedStateRate(state, city, zipCode) {
        // Special handling for deregulated markets
        if (state === 'TX') {
            return this.getTexasRate(city, zipCode);
        }

        // High-population cities with known variations
        const cityRates = {
            // California
            'Los Angeles': { rate: 0.2950, utility: 'LADWP' },
            'San Francisco': { rate: 0.3100, utility: 'PG&E' },
            'San Diego': { rate: 0.3350, utility: 'SDG&E' },
            'Sacramento': { rate: 0.2400, utility: 'SMUD' },
            
            // New York
            'New York': { rate: 0.2300, utility: 'Con Edison' },
            'Buffalo': { rate: 0.1800, utility: 'National Grid' },
            
            // Illinois
            'Chicago': { rate: 0.1550, utility: 'ComEd' },
            
            // Florida
            'Miami': { rate: 0.1320, utility: 'FPL' },
            'Tampa': { rate: 0.1280, utility: 'TECO' },
            'Jacksonville': { rate: 0.1250, utility: 'JEA' }
        };

        if (city && cityRates[city]) {
            return {
                rate: cityRates[city].rate,
                source: `${city} utility average`,
                utility: cityRates[city].utility,
                isEstimate: false
            };
        }

        // Use state average
        return this.getFallbackRate(state);
    }

    getTexasRate(city, zipCode) {
        // Texas is deregulated - rates vary by city and provider
        const cityRates = {
            'Dallas': 0.1450,
            'Fort Worth': 0.1420,
            'Arlington': 0.1430,
            'Houston': 0.1380,
            'Austin': 0.1490,
            'San Antonio': 0.1250,
            'El Paso': 0.1150,
            'Corpus Christi': 0.1280,
            'Plano': 0.1460,
            'Irving': 0.1440,
            'Lubbock': 0.1220,
            'Garland': 0.1450,
            'Frisco': 0.1470,
            'McKinney': 0.1460,
            'Amarillo': 0.1200
        };

        const rate = city && cityRates[city] ? cityRates[city] : this.stateAverages['TX'];
        const utilities = this.majorUtilities['TX'] || ['Various providers'];

        return {
            rate: rate,
            source: city ? `${city}, TX average` : 'Texas state average',
            utility: utilities[0],
            isEstimate: city ? false : true,
            note: 'Deregulated market - rates vary by provider'
        };
    }

    getFallbackRate(state) {
        const rate = this.stateAverages[state] || 0.1399;
        const utilities = this.majorUtilities[state] || ['Local utility'];

        return {
            rate: rate,
            source: `${state} state average (EIA 2024)`,
            utility: utilities[0],
            isEstimate: true
        };
    }

    calculateMonthlyCost(monthlyKWh, rate) {
        return Math.round(monthlyKWh * rate * 100) / 100;
    }

    calculateAnnualSavings(annualProduction, rate) {
        return Math.round(annualProduction * rate * 100) / 100;
    }

    calculate25YearSavings(annualProduction, currentRate) {
        let totalSavings = 0;
        let currentYearProduction = annualProduction;
        let currentYearRate = currentRate;
        
        const annualDegradation = 0.005; // 0.5% per year
        const annualRateIncrease = 0.03; // 3% per year

        for (let year = 1; year <= 25; year++) {
            const yearSavings = currentYearProduction * currentYearRate;
            totalSavings += yearSavings;
            
            // Degrade production
            currentYearProduction *= (1 - annualDegradation);
            
            // Increase rate
            currentYearRate *= (1 + annualRateIncrease);
        }

        return Math.round(totalSavings);
    }
}

module.exports = EnergyRateCalculator;