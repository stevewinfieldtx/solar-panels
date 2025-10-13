// lib/ROICalculator.js
const DEFAULT_PANEL_WATTAGE = 400;

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
            cash: { name: 'Cash Purchase', rate: 0, term: 0 },
            loan10: { name: '10-Year Loan', rate: 0.0699, term: 10 },
            loan15: { name: '15-Year Loan', rate: 0.0799, term: 15 },
            loan20: { name: '20-Year Loan', rate: 0.0899, term: 20 }
        };
    }

    normalizeConfig(options = {}) {
        const quality = options.quality || 'residential';
        const panelWattage = options.panelWattage || DEFAULT_PANEL_WATTAGE;

        let costPerWatt = options.costPerWatt;
        if (costPerWatt == null && options.costPerPanel != null) {
            costPerWatt = options.costPerPanel / panelWattage;
        }
        if (costPerWatt == null) {
            costPerWatt = this.costPerWatt[quality] || this.costPerWatt.residential;
        }

        const normalized = {
            __normalized: true,
            quality,
            panelWattage,
            costPerWatt,
            federalITC: options.federalITC ?? this.federalITC,
            stateTaxCredit: options.stateTaxCredit || 0,
            maxStateCredit: options.maxStateCredit || null,
            localRebate: Math.max(0, options.localRebate || 0),
            annualMaintenance: options.annualMaintenance ?? this.annualMaintenance,
            annualRateIncrease: options.annualRateIncrease ?? this.annualRateIncrease,
            panelDegradation: options.panelDegradation ?? this.panelDegradation,
            homeValueMultiplier: options.homeValueMultiplier ?? this.homeValueMultiplier,
            financingType: options.financingType || 'loan10',
            loanRate: options.loanRate,
            loanTerm: options.loanTerm
        };

        if (normalized.loanRate == null || normalized.loanTerm == null) {
            const defaults = this.financingOptions[normalized.financingType];
            if (defaults) {
                if (normalized.loanRate == null) normalized.loanRate = defaults.rate;
                if (normalized.loanTerm == null) normalized.loanTerm = defaults.term;
            }
        }

        normalized.costPerPanel = costPerWatt * panelWattage;
        return normalized;
    }

    calculateSystemCost(systemSizeKW, options = {}) {
        const normalized = options.__normalized ? options : this.normalizeConfig(options);

        const systemSizeW = systemSizeKW * 1000;
        const grossCost = systemSizeW * normalized.costPerWatt;
        const federalTaxCredit = grossCost * normalized.federalITC;

        let stateTaxCredit = grossCost * normalized.stateTaxCredit;
        if (normalized.maxStateCredit) {
            stateTaxCredit = Math.min(stateTaxCredit, normalized.maxStateCredit);
        }

        const netCost = Math.max(0, grossCost - federalTaxCredit - stateTaxCredit - normalized.localRebate);

        return {
            grossCost: Math.round(grossCost),
            federalTaxCredit: Math.round(federalTaxCredit),
            stateTaxCredit: Math.round(stateTaxCredit),
            localRebate: Math.round(normalized.localRebate),
            netCost: Math.round(netCost),
            costPerWatt: Math.round(normalized.costPerWatt * 100) / 100,
            costPerPanel: Math.round(normalized.costPerPanel),
            panelWattage: normalized.panelWattage
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

    calculate25YearROI(systemSizeKW, energyRate, annualProduction, options = {}, precomputedCosts = null) {
        const normalized = options.__normalized ? options : this.normalizeConfig(options);
        const costs = precomputedCosts || this.calculateSystemCost(systemSizeKW, normalized);

        let totalSavings = 0;
        let currentProduction = annualProduction;
        let currentRate = energyRate;
        let totalMaintenance = 0;

        for (let year = 1; year <= 25; year++) {
            const yearSavings = currentProduction * currentRate;
            totalSavings += yearSavings;
            totalMaintenance += normalized.annualMaintenance;

            currentProduction *= (1 - normalized.panelDegradation);
            currentRate *= (1 + normalized.annualRateIncrease);
        }

        const netSavings = totalSavings - totalMaintenance - costs.netCost;
        const roi = costs.netCost === 0 ? 0 : (netSavings / costs.netCost) * 100;

        return {
            totalSavings: Math.round(totalSavings),
            totalMaintenance: Math.round(totalMaintenance),
            totalCost: costs.netCost,
            netProfit: Math.round(netSavings),
            roi: Math.round(roi * 10) / 10
        };
    }

    calculateHomeValueIncrease(systemSizeKW, homeValueMultiplier = this.homeValueMultiplier) {
        const systemSizeW = systemSizeKW * 1000;
        return Math.round(systemSizeW * homeValueMultiplier);
    }

    calculateFinancingOptions(netCost, options = {}) {
        const normalized = options.__normalized ? options : this.normalizeConfig(options);

        const financingOptions = {};
        for (const [name, terms] of Object.entries(this.financingOptions)) {
            financingOptions[name] = { ...terms };
        }

        if (!financingOptions[normalized.financingType]) {
            financingOptions[normalized.financingType] = {
                name: 'Custom Financing',
                rate: normalized.loanRate || 0,
                term: normalized.loanTerm || 0
            };
        } else {
            if (normalized.loanRate != null) {
                financingOptions[normalized.financingType].rate = normalized.loanRate;
            }
            if (normalized.loanTerm != null) {
                financingOptions[normalized.financingType].term = normalized.loanTerm;
            }
        }

        const optionsSummary = {};

        for (const [name, terms] of Object.entries(financingOptions)) {
            const numPayments = terms.term * 12;
            const monthlyRate = terms.rate / 12;

            if (!Number.isFinite(numPayments) || numPayments <= 0) {
                const roundedNetCost = Number.isFinite(netCost) ? Math.round(netCost) : 0;
                optionsSummary[name] = {
                    type: terms.name || 'Cash Purchase',
                    downPayment: roundedNetCost,
                    monthlyPayment: 0,
                    totalPaid: roundedNetCost,
                    totalInterest: 0
                };
            } else {
                const paymentIsFlat = !Number.isFinite(monthlyRate) || Math.abs(monthlyRate) < 1e-8;
                let monthlyPayment;
                if (paymentIsFlat) {
                    monthlyPayment = netCost / numPayments;
                } else {
                    const factor = Math.pow(1 + monthlyRate, numPayments);
                    const denominator = factor - 1;
                    if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-8) {
                        monthlyPayment = netCost / numPayments;
                    } else {
                        monthlyPayment = netCost * ((monthlyRate * factor) / denominator);
                    }
                }

                const totalPaid = monthlyPayment * numPayments;
                const totalInterest = totalPaid - netCost;

                const normalizedMonthlyPayment = Number.isFinite(monthlyPayment) ? Math.round(monthlyPayment) : 0;
                const fallbackTotalPaid = Number.isFinite(netCost) ? Math.round(netCost) : 0;
                const normalizedTotalPaid = Number.isFinite(totalPaid) ? Math.round(totalPaid) : fallbackTotalPaid;
                const normalizedTotalInterest = Number.isFinite(totalInterest) ? Math.round(totalInterest) : 0;

                optionsSummary[name] = {
                    type: terms.name || `${terms.term}-Year Loan`,
                    rate: (terms.rate * 100).toFixed(2) + '%',
                    downPayment: 0,
                    monthlyPayment: normalizedMonthlyPayment,
                    totalPaid: normalizedTotalPaid,
                    totalInterest: normalizedTotalInterest
                };
            }
        }

        return optionsSummary;
    }

    calculateMonthlyBreakdown(roi, energyRate, annualProduction, currentMonthlyBill, options = {}) {
        const normalized = options.__normalized ? options : this.normalizeConfig(options);

        const monthlyProduction = annualProduction / 12;
        const baseSavings = monthlyProduction * energyRate;
        const monthlySavings = Number.isFinite(baseSavings)
            ? Math.round(baseSavings * 100) / 100
            : 0;

        const billEstimate = currentMonthlyBill != null
            ? Number(currentMonthlyBill)
            : monthlyProduction * energyRate * 1.15;
        const estimatedBill = Number.isFinite(billEstimate)
            ? Math.round(billEstimate * 100) / 100
            : 0;

        const financingOptions = (roi && typeof roi.financingOptions === 'object')
            ? roi.financingOptions
            : {};
        const selectedFinancing = normalized.financingType;
        const financing = financingOptions[selectedFinancing]
            || financingOptions.loan10
            || { monthlyPayment: 0 };
        const monthlyPayment = Number.isFinite(financing.monthlyPayment)
            ? financing.monthlyPayment
            : 0;
        const loanTerm = Number.isFinite(normalized.loanTerm)
            ? Math.max(0, Math.round(normalized.loanTerm))
            : 0;
        const maintenanceMonthly = Number.isFinite(normalized.annualMaintenance)
            ? Math.round((normalized.annualMaintenance / 12) * 100) / 100
            : 0;

        const duringLoanNet = Math.round(monthlyPayment + estimatedBill - monthlySavings + maintenanceMonthly);
        const afterLoanNet = Math.round(estimatedBill - monthlySavings + maintenanceMonthly);

        const duringLoan = {
            loanPayment: Math.round(monthlyPayment),
            electricBill: Math.round(estimatedBill),
            solarSavings: -Math.round(monthlySavings),
            maintenance: Math.round(maintenanceMonthly),
            netCost: duringLoanNet,
            vsNoSolar: Math.round(estimatedBill),
            extraCostForSolar: duringLoanNet - Math.round(estimatedBill)
        };

        const afterLoan = {
            loanPayment: 0,
            electricBill: Math.round(estimatedBill),
            solarSavings: -Math.round(monthlySavings),
            maintenance: Math.round(maintenanceMonthly),
            netCost: afterLoanNet,
            vsNoSolar: Math.round(estimatedBill),
            monthlySavings: Math.round(monthlySavings - maintenanceMonthly)
        };

        return {
            duringLoan,
            afterLoan,
            loanTerm,
            monthlySavings: Math.round(monthlySavings - maintenanceMonthly),
            estimatedMonthlyBill: Math.round(estimatedBill),
            maintenanceMonthly: Math.round(maintenanceMonthly),
            financingType: selectedFinancing
        };
    }

    generateFullROI(systemSizeKW, annualProduction, energyRate, config = {}) {
        const normalized = this.normalizeConfig(config);
        const costs = this.calculateSystemCost(systemSizeKW, normalized);

        const annualSavings = annualProduction * energyRate;
        const paybackPeriod = this.calculatePaybackPeriod(
            costs.netCost,
            annualSavings,
            normalized.annualMaintenance
        );
        const roi25Year = this.calculate25YearROI(
            systemSizeKW,
            energyRate,
            annualProduction,
            normalized,
            costs
        );
        const homeValueIncrease = this.calculateHomeValueIncrease(
            systemSizeKW,
            normalized.homeValueMultiplier
        );
        const financingOptions = this.calculateFinancingOptions(costs.netCost, normalized);

        return {
            systemSize: systemSizeKW,
            costs,
            annualProduction: Math.round(annualProduction),
            annualSavings: Math.round(annualSavings),
            paybackPeriod,
            roi25Year,
            homeValueIncrease,
            financingOptions,
            monthlyAverageSavings: Math.round(annualSavings / 12),
            lifetimeSavings: roi25Year.netProfit,
            financingType: normalized.financingType,
            assumptions: {
                costPerWatt: costs.costPerWatt,
                costPerPanel: costs.costPerPanel,
                panelWattage: costs.panelWattage,
                federalITC: normalized.federalITC,
                stateTaxCredit: normalized.stateTaxCredit,
                annualRateIncrease: normalized.annualRateIncrease,
                panelDegradation: normalized.panelDegradation,
                annualMaintenance: normalized.annualMaintenance,
                homeValueMultiplier: normalized.homeValueMultiplier,
                financingType: normalized.financingType,
                loanRate: normalized.loanRate,
                loanTerm: normalized.loanTerm
            }
        };
    }
}

module.exports = ROICalculator;
