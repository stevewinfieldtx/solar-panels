// lib/ROIConfig.js - Centralized ROI Configuration

module.exports = {
    // Tier 1 states with detailed data
    detailedStates: ['TX', 'AZ', 'CA'],
    
    // System cost defaults ($/watt installed)
    costs: {
        residential: 3.50,
        premium: 4.00,
        budget: 3.00
    },
    
    // Federal and state incentives
    incentives: {
        federalITC: 0.30,  // 30% Investment Tax Credit
        
        stateIncentives: {
            TX: {
                name: 'Texas Property Tax Exemption',
                propertyTaxExempt: true,
                stateTaxCredit: 0,
                description: 'Solar equipment is exempt from property taxes'
            },
            AZ: {
                name: 'Arizona Solar Tax Credit',
                propertyTaxExempt: false,
                stateTaxCredit: 0.25,  // 25% up to $1,000
                maxCredit: 1000,
                description: 'State tax credit of 25% of system cost up to $1,000'
            },
            CA: {
                name: 'California SGIP Program',
                propertyTaxExempt: true,
                sgipRebate: 0.15,  // $/watt for battery storage
                description: 'Property tax exemption + SGIP rebates for storage'
            }
        }
    },
    
    // Historical electricity rate growth (from EIA data)
    historicalGrowth: {
        TX: {
            rate: 0.028,  // 2.8% per year
            years: '2015-2024',
            source: 'EIA'
        },
        AZ: {
            rate: 0.031,  // 3.1% per year
            years: '2015-2024',
            source: 'EIA'
        },
        CA: {
            rate: 0.042,  // 4.2% per year
            years: '2015-2024',
            source: 'EIA'
        },
        DEFAULT: {
            rate: 0.030,  // 3.0% per year
            years: '2015-2024',
            source: 'EIA National Average'
        }
    },
    
    // System performance assumptions
    system: {
        panelDegradation: 0.005,      // 0.5% per year
        panelWarranty: 25,            // years
        inverterWarranty: 10,         // years
        inverterReplacement: 2500,    // $ at year 10
        annualMaintenance: 150,       // $/year
        homeValueMultiplier: 20,      // $/watt added to home value
        analysisYears: 25             // years to project
    },
    
    // Financing options
    financing: {
        cash: {
            name: 'Cash Purchase',
            rate: 0,
            term: 0,
            description: 'Pay upfront, no interest'
        },
        loan10: {
            name: '10-Year Loan',
            rate: 0.0699,  // 6.99%
            term: 10,
            description: 'Higher monthly payment, less interest'
        },
        loan15: {
            name: '15-Year Loan',
            rate: 0.0799,  // 7.99%
            term: 15,
            description: 'Balanced payment and interest'
        },
        loan20: {
            name: '20-Year Loan',
            rate: 0.0899,  // 8.99%
            term: 20,
            description: 'Lower monthly payment, more interest'
        }
    },
    
    // City-specific data for Tier 1 states
    cityData: {
        TX: {
            'Dallas': { rate: 0.1450, utility: 'TXU Energy' },
            'Fort Worth': { rate: 0.1420, utility: 'TXU Energy' },
            'Arlington': { rate: 0.1430, utility: 'TXU Energy' },
            'Houston': { rate: 0.1380, utility: 'CenterPoint' },
            'Austin': { rate: 0.1490, utility: 'Austin Energy' },
            'San Antonio': { rate: 0.1250, utility: 'CPS Energy' },
            'El Paso': { rate: 0.1150, utility: 'El Paso Electric' },
            'Plano': { rate: 0.1460, utility: 'TXU Energy' },
            'Irving': { rate: 0.1440, utility: 'TXU Energy' },
            'Lubbock': { rate: 0.1220, utility: 'LP&L' },
            'Mansfield': { rate: 0.1425, utility: 'TXU Energy' }
        },
        AZ: {
            'Phoenix': { rate: 0.1320, utility: 'APS' },
            'Tucson': { rate: 0.1280, utility: 'TEP' },
            'Mesa': { rate: 0.1340, utility: 'SRP' },
            'Chandler': { rate: 0.1340, utility: 'SRP' },
            'Scottsdale': { rate: 0.1320, utility: 'APS' },
            'Glendale': { rate: 0.1320, utility: 'APS' },
            'Tempe': { rate: 0.1340, utility: 'SRP' }
        },
        CA: {
            'Los Angeles': { rate: 0.2950, utility: 'LADWP' },
            'San Francisco': { rate: 0.3100, utility: 'PG&E' },
            'San Diego': { rate: 0.3350, utility: 'SDG&E' },
            'Sacramento': { rate: 0.2400, utility: 'SMUD' },
            'San Jose': { rate: 0.3100, utility: 'PG&E' },
            'Fresno': { rate: 0.3100, utility: 'PG&E' },
            'Long Beach': { rate: 0.2800, utility: 'SCE' },
            'Oakland': { rate: 0.3100, utility: 'PG&E' }
        }
    }
};