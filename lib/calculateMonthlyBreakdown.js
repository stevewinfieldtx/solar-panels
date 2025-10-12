calculateMonthlyBreakdown(roi, energyRate, annualProduction, currentMonthlyBill) {
        const monthlyProduction = annualProduction / 12;
        const monthlySavings = Math.round((monthlyProduction * energyRate) * 100) / 100;
        
        // Estimate current bill if not provided
        const estimatedBill = currentMonthlyBill || Math.round((monthlyProduction * energyRate * 1.15) * 100) / 100;
        
        const financing = roi.financingOptions[roi.selectedFinancing || 'loan10'];
        const monthlyPayment = financing.monthlyPayment;
        
        // Years 1-N (during loan)
        const duringLoan = {
            loanPayment: monthlyPayment,
            electricBill: estimatedBill,
            solarSavings: -monthlySavings,
            netCost: monthlyPayment + estimatedBill - monthlySavings,
            vsNoSolar: estimatedBill,
            extraCostForSolar: (monthlyPayment + estimatedBill - monthlySavings) - estimatedBill
        };
        
        // Years N+1 to 25 (after loan)
        const afterLoan = {
            loanPayment: 0,
            electricBill: estimatedBill,
            solarSavings: -monthlySavings,
            netCost: estimatedBill - monthlySavings,
            vsNoSolar: estimatedBill,
            monthlySavings: monthlySavings
        };
        
        return {
            duringLoan: duringLoan,
            afterLoan: afterLoan,
            loanTerm: financing.type.includes('Year') ? parseInt(financing.type) : 0,
            monthlySavings: monthlySavings,
            estimatedMonthlyBill: estimatedBill
        };
    }