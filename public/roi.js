// public/roi.js

let analysisData = null;
let selectedSegments = [];
let roiConfig = null;

// Load analysis data from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem('solarAnalysisData');
    
    if (!storedData) {
        alert('No analysis data found. Please complete a roof analysis first.');
        window.location.href = '/';
        return;
    }
    
    analysisData = JSON.parse(storedData);
    console.log('✅ Loaded analysis data:', analysisData);
    
    initializeROIPage();
});

function initializeROIPage() {
    displaySegments();
    preselectSegments();
    loadDefaults();
    updateSelectionSummary();
    
    console.log('✅ ROI page initialized');
}

function displaySegments() {
    const segmentsList = document.getElementById('segmentsList');
    const segments = analysisData.roofSegments;
    
    console.log('Displaying segments:', segments.length);
    
    segmentsList.innerHTML = segments.map(segment => `
        <label class="segment-checkbox" data-segment-id="${segment.id}">
            <input 
                type="checkbox" 
                value="${segment.id}"
                onchange="toggleSegment(${segment.id})"
                ${segment.efficiency >= 70 ? 'checked' : ''}
            >
            <div class="segment-info">
                <div class="segment-name">
                    ${segment.name}
                </div>
                <div class="segment-detail">
                    <span class="label">Direction</span>
                    <span class="value">${segment.direction}</span>
                </div>
                <div class="segment-detail">
                    <span class="label">Efficiency</span>
                    <span class="segment-efficiency" style="background-color: ${segment.color};">
                        ${segment.efficiency}%
                    </span>
                </div>
                <div class="segment-detail">
                    <span class="label">Panels</span>
                    <span class="value">${segment.panelCapacity} panels</span>
                </div>
            </div>
        </label>
    `).join('');
    
    console.log('✅ Segments displayed');
}

function preselectSegments() {
    selectedSegments = analysisData.roofSegments
        .filter(seg => seg.efficiency >= 70)
        .map(seg => seg.id);
    
    console.log('Pre-selected segments:', selectedSegments);
    updateSegmentSelection();
}

function toggleSegment(segmentId) {
    const index = selectedSegments.indexOf(segmentId);
    
    if (index > -1) {
        selectedSegments.splice(index, 1);
    } else {
        selectedSegments.push(segmentId);
    }
    
    updateSegmentSelection();
    updateSelectionSummary();
    updateFinancingAmounts();
}

function updateSegmentSelection() {
    document.querySelectorAll('.segment-checkbox').forEach(checkbox => {
        const segmentId = parseInt(checkbox.dataset.segmentId);
        if (selectedSegments.includes(segmentId)) {
            checkbox.classList.add('selected');
        } else {
            checkbox.classList.remove('selected');
        }
    });
}

function updateSelectionSummary() {
    const selected = analysisData.roofSegments.filter(seg => 
        selectedSegments.includes(seg.id)
    );
    
    const totalPanels = selected.reduce((sum, seg) => sum + seg.panelCapacity, 0);
    const systemSizeKW = Math.round(totalPanels * 0.4 * 10) / 10;
    const annualProduction = calculateAnnualProduction(selected);
    
    document.getElementById('selectedPanels').textContent = totalPanels;
    document.getElementById('selectedSystemSize').textContent = `${systemSizeKW} kW`;
    document.getElementById('selectedProduction').textContent = `${annualProduction.toLocaleString()} kWh`;
    
    console.log(`✅ Summary: ${totalPanels} panels, ${systemSizeKW} kW, ${annualProduction} kWh/year`);
}

function calculateAnnualProduction(segments) {
    const totalProduction = segments.reduce((sum, seg) => {
        const panelOutput = seg.panelCapacity * 400;
        const hoursPerYear = seg.sunshineHours;
        const efficiency = seg.efficiency / 100;
        const production = (panelOutput * hoursPerYear * efficiency) / 1000;
        return sum + production;
    }, 0);
    
    return Math.round(totalProduction);
}

function loadDefaults() {
    console.log('Loading defaults...');
    
    document.getElementById('costPerWatt').value = '3.50';
    document.getElementById('federalITC').value = '30';
    document.getElementById('localRebate').value = '0';
    
    const state = analysisData.location?.state || 'TX';
    const city = analysisData.location?.city || 'Unknown';
    
    const energyRate = getDefaultEnergyRate(state, city);
    document.getElementById('energyRate').value = energyRate.toFixed(3);
    document.getElementById('energyRateHint').textContent = 
        `${city}, ${state} average`;
    
    const annualIncrease = getDefaultRateIncrease(state);
    document.getElementById('annualRateIncrease').value = annualIncrease.toFixed(1);
    document.getElementById('rateIncreaseHint').textContent = 
        `Historical ${state} average (2015-2024)`;
    
    const selected = analysisData.roofSegments.filter(seg => 
        selectedSegments.includes(seg.id)
    );
    const annualProduction = calculateAnnualProduction(selected);
    const estimatedBill = Math.round((annualProduction / 12) * energyRate * 1.15);
    document.getElementById('currentMonthlyBill').value = estimatedBill.toString();
    
    document.getElementById('panelDegradation').value = '0.5';
    document.getElementById('annualMaintenance').value = '150';
    document.getElementById('homeValueMultiplier').value = '20';
    document.getElementById('currentHomeValue').value = '';
    document.getElementById('customLoanRate').value = '6.99';
    
    console.log('✅ Defaults loaded');
    
    updateFinancingAmounts();
}

function getDefaultEnergyRate(state, city) {
    const rates = {
        'TX': {
            'Arlington': 0.1430,
            'Dallas': 0.1450,
            'Fort Worth': 0.1420,
            'Houston': 0.1380,
            'Austin': 0.1490,
            'San Antonio': 0.1250,
            'El Paso': 0.1150,
            'Plano': 0.1460,
            'Irving': 0.1440,
            'Lubbock': 0.1220,
            'Mansfield': 0.1425,
            'default': 0.1399
        },
        'AZ': {
            'Phoenix': 0.1320,
            'Tucson': 0.1280,
            'Mesa': 0.1340,
            'Chandler': 0.1340,
            'Scottsdale': 0.1320,
            'default': 0.1320
        },
        'CA': {
            'Los Angeles': 0.2950,
            'San Francisco': 0.3100,
            'San Diego': 0.3350,
            'Sacramento': 0.2400,
            'San Jose': 0.3100,
            'default': 0.2820
        }
    };
    
    if (rates[state]) {
        return rates[state][city] || rates[state].default;
    }
    
    return 0.1399;
}

function getDefaultRateIncrease(state) {
    const increases = {
        'TX': 2.8,
        'AZ': 3.1,
        'CA': 4.2
    };
    
    return increases[state] || 3.0;
}

function updateFinancingAmounts() {
    const selected = analysisData.roofSegments.filter(seg => 
        selectedSegments.includes(seg.id)
    );
    
    if (selected.length === 0) {
        document.getElementById('cashAmount').textContent = '$0';
        document.getElementById('loan10Amount').textContent = '$0';
        document.getElementById('loan15Amount').textContent = '$0';
        document.getElementById('loan20Amount').textContent = '$0';
        return;
    }
    
    const totalPanels = selected.reduce((sum, seg) => sum + seg.panelCapacity, 0);
    const systemSizeKW = Math.round(totalPanels * 0.4 * 10) / 10;
    
    const costPerWatt = parseFloat(document.getElementById('costPerWatt').value) || 3.50;
    const federalITC = parseFloat(document.getElementById('federalITC').value) || 30;
    const localRebate = parseFloat(document.getElementById('localRebate').value) || 0;
    
    const systemSizeW = systemSizeKW * 1000;
    const grossCost = systemSizeW * costPerWatt;
    const taxCredit = grossCost * (federalITC / 100);
    const netCost = grossCost - taxCredit - localRebate;
    
    document.getElementById('cashAmount').textContent = 
        `$${Math.round(netCost).toLocaleString()}`;
    
    const loans = [
        { id: 'loan10', rate: 0.0699, term: 10 },
        { id: 'loan15', rate: 0.0799, term: 15 },
        { id: 'loan20', rate: 0.0899, term: 20 }
    ];
    
    loans.forEach(loan => {
        const monthlyPayment = calculateMonthlyPayment(netCost, loan.rate, loan.term);
        document.getElementById(`${loan.id}Amount`).textContent = 
            `$${Math.round(monthlyPayment).toLocaleString()}`;
    });
    
    console.log('✅ Financing updated:', { systemSizeKW, netCost });
}

function calculateMonthlyPayment(principal, annualRate, years) {
    if (principal <= 0) return 0;
    
    const monthlyRate = annualRate / 12;
    const numPayments = years * 12;
    
    const payment = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return payment;
}

function updateFinancing() {
    console.log('Financing option changed');
}

function resetToDefaults() {
    if (confirm('Reset all values to defaults?')) {
        loadDefaults();
        updateSelectionSummary();
    }
}

async function calculateROI() {
    if (selectedSegments.length === 0) {
        alert('Please select at least one roof segment');
        return;
    }
    
    const button = document.querySelector('.calculate-action button');
    button.disabled = true;
    button.textContent = 'Calculating...';
    
    try {
        const selected = analysisData.roofSegments.filter(seg => 
            selectedSegments.includes(seg.id)
        );
        
        const totalPanels = selected.reduce((sum, seg) => sum + seg.panelCapacity, 0);
        const systemSizeKW = Math.round(totalPanels * 0.4 * 10) / 10;
        const annualProduction = calculateAnnualProduction(selected);
        
        const financingType = document.querySelector('input[name="financing"]:checked').value;
        
        const requestData = {
            systemSizeKW: systemSizeKW,
            annualProduction: annualProduction,
            zipCode: analysisData.location.zipCode,
            state: analysisData.location.state,
            city: analysisData.location.city,
            selectedSegments: selectedSegments,
            userInputs: {
                costPerWatt: parseFloat(document.getElementById('costPerWatt').value),
                federalITC: parseFloat(document.getElementById('federalITC').value) / 100,
                localRebate: parseFloat(document.getElementById('localRebate').value) || 0,
                currentMonthlyBill: parseFloat(document.getElementById('currentMonthlyBill').value),
                energyRate: parseFloat(document.getElementById('energyRate').value),
                annualRateIncrease: parseFloat(document.getElementById('annualRateIncrease').value) / 100,
                panelDegradation: parseFloat(document.getElementById('panelDegradation').value) / 100,
                annualMaintenance: parseFloat(document.getElementById('annualMaintenance').value),
                homeValueMultiplier: parseFloat(document.getElementById('homeValueMultiplier').value),
                currentHomeValue: parseFloat(document.getElementById('currentHomeValue').value) || null,
                financingType: financingType,
                loanRate: financingType !== 'cash' ? parseFloat(document.getElementById('customLoanRate').value) / 100 : null
            }
        };
        
        console.log('📤 Sending ROI request:', requestData);
        
        const response = await fetch('/api/calculate-roi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'ROI calculation failed');
        }
        
        const roiData = await response.json();
        console.log('📥 ROI Response:', roiData);
        
        displayROIResults(roiData);
        
        document.getElementById('roiResults').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ ROI calculation error:', error);
        alert(`Failed to calculate ROI: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = 'Calculate My ROI';
    }
}

function displayROIResults(data) {
    const results = document.getElementById('roiResults');
    results.style.display = 'block';
    
    const breakdown = data.monthlyBreakdown;
    const roi = data.roi;
    
    document.getElementById('duringLoanTitle').textContent = 
        breakdown.loanTerm > 0 ? `Years 1-${breakdown.loanTerm} (During Loan)` : 'With Cash Purchase';
    document.getElementById('afterLoanTitle').textContent = 
        breakdown.loanTerm > 0 ? `Years ${breakdown.loanTerm + 1}-25 (After Loan Paid Off)` : 'Years 1-25';
    
    document.getElementById('duringLoanPayment').textContent = 
        `$${breakdown.duringLoan.loanPayment.toLocaleString()}`;
    document.getElementById('duringElectricBill').textContent = 
        `$${breakdown.duringLoan.electricBill.toLocaleString()}`;
    document.getElementById('duringSolarSavings').textContent = 
        `$${breakdown.duringLoan.solarSavings.toLocaleString()}`;
    document.getElementById('duringNetCost').textContent = 
        `$${breakdown.duringLoan.netCost.toLocaleString()}`;
    document.getElementById('duringVsNoSolar').textContent = 
        `$${breakdown.duringLoan.vsNoSolar.toLocaleString()}/month`;
    document.getElementById('duringExtraCost').textContent = 
        `$${Math.abs(breakdown.duringLoan.extraCostForSolar).toLocaleString()}/month`;
    
    document.getElementById('afterElectricBill').textContent = 
        `$${breakdown.afterLoan.electricBill.toLocaleString()}`;
    document.getElementById('afterSolarSavings').textContent = 
        `$${breakdown.afterLoan.solarSavings.toLocaleString()}`;
    document.getElementById('afterNetCost').textContent = 
        `$${breakdown.afterLoan.netCost.toLocaleString()}`;
    document.getElementById('afterVsNoSolar').textContent = 
        `$${breakdown.afterLoan.vsNoSolar.toLocaleString()}/month`;
    document.getElementById('afterMonthlySavings').textContent = 
        `$${breakdown.afterLoan.monthlySavings.toLocaleString()}/month`;
    
    const payback = roi.paybackPeriod;
    document.getElementById('keyInsight').textContent = 
        `You save $${breakdown.monthlySavings.toLocaleString()}/month from solar production. ` +
        `After ${payback} years, your system is paid off and you pocket $${breakdown.afterLoan.monthlySavings.toLocaleString()}/month in savings!`;
    
    document.getElementById('grossCost').textContent = `$${roi.costs.grossCost.toLocaleString()}`;
    document.getElementById('federalCredit').textContent = `-$${roi.costs.federalTaxCredit.toLocaleString()}`;
    document.getElementById('netCost').textContent = `$${roi.costs.netCost.toLocaleString()}`;
    
    if (data.stateIncentive && data.stateIncentive.stateTaxCredit > 0) {
        const stateCredit = Math.min(
            roi.costs.grossCost * data.stateIncentive.stateTaxCredit,
            data.stateIncentive.maxCredit || 999999
        );
        document.getElementById('stateIncentiveLine').style.display = 'flex';
        document.getElementById('stateIncentiveLabel').textContent = data.stateIncentive.name + ':';
        document.getElementById('stateIncentiveValue').textContent = `-$${stateCredit.toLocaleString()}`;
    }
    
    document.getElementById('totalSavings').textContent = `$${roi.roi25Year.totalSavings.toLocaleString()}`;
    document.getElementById('totalInterest').textContent = 
        `-$${(roi.financingOptions[data.config.financingType].totalInterest || 0).toLocaleString()}`;
    document.getElementById('totalMaintenance').textContent = `-$${roi.roi25Year.totalMaintenance.toLocaleString()}`;
    document.getElementById('netProfit').textContent = `$${roi.roi25Year.netProfit.toLocaleString()}`;
    
    document.getElementById('paybackPeriod').textContent = `${roi.paybackPeriod} years`;
    document.getElementById('roiPercentage').textContent = `${roi.roi25Year.roi}%`;
    document.getElementById('homeValueIncrease').textContent = `+$${roi.homeValueIncrease.toLocaleString()}`;
    
    const carbonOffset = Math.round((roi.annualProduction * 25 * 0.92) / 2000);
    document.getElementById('carbonOffset').textContent = `${carbonOffset} tons`;
    
    console.log('✅ ROI results displayed');
}

function shareResults() {
    const text = `Check out my solar ROI! ${document.getElementById('netProfit').textContent} profit over 25 years!`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Solar ROI',
            text: text,
            url: window.location.href
        });
    } else {
        alert('Sharing not supported. Copy the URL to share!');
    }
}

function goBackToAnalysis() {
    window.location.href = '/';
}