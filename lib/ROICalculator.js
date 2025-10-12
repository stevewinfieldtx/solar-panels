// lib/ROICalculator.js
class ROICalculator {
    constructor() {
        this.costPerWatt = {
            residential: 3.50,
            premium: 4.00,
            budget: 3.00
        };

        this.federalITC = 0.30;
        this.panelDegradation = 0.005;
        this.annualRateIncrease = 0.03;
        this.annualMaintenance = 150;
        this.homeValueMultiplier = 20;

        this.financingOptions = {
            cash: { rate: 0, term: 0 },
            loan10: { rate: 0.0699, term: 10 },
            loan15: { rate: 0.0799, term: 15 },
            loan20: { rate: 0.0899, term: 20 }
        };
    }

    calculateSystemCost(systemSizeKW, quality = 'residential') {
        const systemSizeW = systemSizeKW * 1000;
        const costPerW = this.costPerWatt[quality];
        
        const grossCost = systemSizeW * costPerW;
        const federalTaxCredit = grossCost * this.federalITC;
        const netCost = grossCost - federalTaxCredit;

        return {
            grossCost: Math.round(grossCost),
            federalTaxCredit: Math.round(federalTaxCredit),
            netCost: Math.round(netCost),
            costPerWatt: costPerW
        };
    }

    calculatePaybackPeriod(netCost, annualSavings, annualMaintenance = 150) {
        const netAnnualSavings = annualSavings - annualMaintenance;
        
        if (netAnnualSavings <= 0) {
            return null;
        }

        const years = netCost / netAnnualSavings;
        return Math.round(years * 10) / 10;
    }

    calculate25YearROI(systemSizeKW, energyRate, annualProduction, quality = 'residential') {
        const costs = this.calculateSystemCost(systemSizeKW, quality);
        
        let totalSavings = 0;
        let currentProduction = annualProduction;
        let currentRate = energyRate;
        let totalMaintenance = 0;

        for (let year = 1; year <= 25; year++) {
            const yearSavings = currentProduction * currentRate;
            totalSavings += yearSavings;
            totalMaintenance += this.annualMaintenance;
            
            currentProduction *= (1 - this.panelDegradation);
            currentRate *= (1 + this.annualRateIncrease);
        }

        const netSavings = totalSavings - totalMaintenance - costs.netCost;
        const roi = (netSavings / costs.netCost) * 100;

        return {
            totalSavings: Math.round(totalSavings),
            totalMaintenance: Math.round(totalMaintenance),
            totalCost: costs.netCost,
            netProfit: Math.round(netSavings),
            roi: Math.round(roi * 10) / 10
        };
    }

    calculateHomeValueIncrease(systemSizeKW) {
        const systemSizeW = systemSizeKW * 1000;
        return Math.round(systemSizeW * this.homeValueMultiplier);
    }

    calculateFinancingOptions(netCost) {
        const options = {};

        for (const [name, terms] of Object.entries(this.financingOptions)) {
            if (terms.term === 0) {
                options[name] = {
                    type: 'Cash',
                    downPayment: netCost,
                    monthlyPayment: 0,
                    totalPaid: netCost,
                    totalInterest: 0
                };
            } else {
                const monthlyRate = terms.rate / 12;
                const numPayments = terms.term * 12;
                
                const monthlyPayment = netCost * 
                    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                    (Math.pow(1 + monthlyRate, numPayments) - 1);
                
                const totalPaid = monthlyPayment * numPayments;
                const totalInterest = totalPaid - netCost;

                options[name] = {
                    type: `${terms.term}-Year Loan`,
                    rate: (terms.rate * 100).toFixed(2) + '%',
                    downPayment: 0,
                    monthlyPayment: Math.round(monthlyPayment),
                    totalPaid: Math.round(totalPaid),
                    totalInterest: Math.round(totalInterest)
                };
            }
        }

        return options;
    }

    calculateMonthlyBreakdown(roi, energyRate, annualProduction, currentMonthlyBill) {
        const monthlyProduction = annualProduction / 12;
        const monthlySavings = Math.round((monthlyProduction * energyRate) * 100) / 100;
        
        const estimatedBill = currentMonthlyBill || Math.round((monthlyProduction * energyRate * 1.15) * 100) / 100;
        
        const selectedFinancing = roi.financingType || 'loan10';
        const financing = roi.financingOptions[selectedFinancing];
        const monthlyPayment = financing.monthlyPayment || 0;
        
        let loanTerm = 0;
        if (financing.type && typeof financing.type === 'string' && financing.type.includes('Year')) {
            loanTerm = parseInt(financing.type);
        }
        
        const duringLoan = {
            loanPayment: monthlyPayment,
            electricBill: estimatedBill,
            solarSavings: -monthlySavings,
            netCost: Math.round(monthlyPayment + estimatedBill - monthlySavings),
            vsNoSolar: estimatedBill,
            extraCostForSolar: Math.round((monthlyPayment + estimatedBill - monthlySavings) - estimatedBill)
        };
        
        const afterLoan = {
            loanPayment: 0,
            electricBill: estimatedBill,
            solarSavings: -monthlySavings,
            netCost: Math.round(estimatedBill - monthlySavings),
            vsNoSolar: estimatedBill,
            monthlySavings: monthlySavings
        };
        
        return {
            duringLoan: duringLoan,
            afterLoan: afterLoan,
            loanTerm: loanTerm,
            monthlySavings: monthlySavings,
            estimatedMonthlyBill: estimatedBill
        };
    }

    generateFullROI(systemSizeKW, annualProduction, energyRate, config = {}) {
        const quality = 'residential';
        const costs = this.calculateSystemCost(systemSizeKW, quality);
        
        // Apply any local rebates
        if (config.localRebate) {
            costs.netCost -= config.localRebate;
        }
        
        const annualSavings = annualProduction * energyRate;
        const paybackPeriod = this.calculatePaybackPeriod(
            costs.netCost, 
            annualSavings, 
            config.annualMaintenance || this.annualMaintenance
        );
        const roi25Year = this.calculate25YearROI(systemSizeKW, energyRate, annualProduction, quality);
        const homeValueIncrease = this.calculateHomeValueIncrease(systemSizeKW);
        const financingOptions = this.calculateFinancingOptions(costs.netCost);

        return {
            systemSize: systemSizeKW,
            costs: costs,
            annualProduction: Math.round(annualProduction),
            annualSavings: Math.round(annualSavings),
            paybackPeriod: paybackPeriod,
            roi25Year: roi25Year,
            homeValueIncrease: homeValueIncrease,
            financingOptions: financingOptions,
            monthlyAverageSavings: Math.round(annualSavings / 12),
            lifetimeSavings: roi25Year.netProfit,
            financingType: config.financingType || 'loan10'
        };
    }
}

module.exports = ROICalculator;