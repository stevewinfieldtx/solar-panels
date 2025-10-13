// public/roi.js

const PANEL_WATTAGE = 400;
const PURCHASE_SCORE_LABELS = {
    1: { label: '1 • Non-starter', summary: 'Financials are strongly negative; pursue efficiency upgrades before solar.' },
    2: { label: '2 • Very Weak', summary: 'Returns rely on major incentives that are not currently in the model.' },
    3: { label: '3 • Weak', summary: 'Long payback and modest savings make this difficult to justify today.' },
    4: { label: '4 • Borderline', summary: 'Could make sense with better incentives or lower system costs.' },
    5: { label: '5 • Mixed Bag', summary: 'Economics are middling—tune the assumptions to tilt the math in your favor.' },
    6: { label: '6 • Solid', summary: 'Respectable payback and savings; worth serious consideration.' },
    7: { label: '7 • Compelling', summary: 'Strong fundamentals with attractive lifetime value.' },
    8: { label: '8 • Strong Buy', summary: 'Excellent ROI and payback; solar is a smart investment here.' },
    9: { label: '9 • Exceptional', summary: 'Top-tier economics with rapid payback and outsized upside.' }
};

let analysisData = null;
let selectedSegments = [];
let roiConfig = null;

function deriveStateCode() {
    if (analysisData?.location?.state) {
        return analysisData.location.state.toUpperCase();
    }

    const address = analysisData?.address;
    if (!address) return null;

    const stateZipMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?/);
    return stateZipMatch ? stateZipMatch[1] : null;
}

function deriveZipCode() {
    if (analysisData?.location?.zipCode) {
        return analysisData.location.zipCode;
    }

    const address = analysisData?.address;
    if (!address) return null;

    const stateZipMatch = address.match(/,\s*[A-Z]{2}\s+(\d{5})(?:-\d{4})?/);
    return stateZipMatch ? stateZipMatch[1] : null;
}

function deriveCityName() {
    if (analysisData?.location?.city) {
        return analysisData.location.city;
    }

    const address = analysisData?.address;
    if (!address) return null;

    const stateZipMatch = address.match(/,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/);
    if (stateZipMatch) {
        const beforeState = address.slice(0, stateZipMatch.index);
        const parts = beforeState.split(',');
        const candidate = parts[parts.length - 1]?.trim();
        if (candidate) return candidate;
    }

    const parts = address.split(',');
    return parts.length >= 2 ? parts[parts.length - 2].trim() : null;
}

function getShadeLossPercent() {
    const percent = analysisData?.shadingAnalysis?.overallShadePercent;
    if (typeof percent !== 'number' || !Number.isFinite(percent)) {
        return null;
    }
    return Math.max(0, Math.round(percent));
}

function getShadeImpactLevel() {
    const impact = analysisData?.shadingAnalysis?.impactLevel;
    return typeof impact === 'string' ? impact : null;
}

function getShadePeakHours() {
    const peaks = analysisData?.shadingAnalysis?.peakShadingHours;
    if (!Array.isArray(peaks)) {
        return [];
    }

    return peaks.map(peak => ({
        time: peak.time,
        impact: peak.impact,
        averageShadePercent: peak.averageShadePercent
    })).filter(item => typeof item.time === 'string');
}

function getShadeRecommendations() {
    const recs = analysisData?.shadingAnalysis?.recommendations;
    return Array.isArray(recs) ? recs : [];
}

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
    setupCostSync();
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

function setupCostSync() {
    const costPerWattInput = document.getElementById('costPerWatt');
    const costPerPanelInput = document.getElementById('costPerPanel');

    if (!costPerWattInput || !costPerPanelInput) {
        return;
    }

    costPerWattInput.addEventListener('input', () => syncCostInputs('watt'));
    costPerPanelInput.addEventListener('input', () => syncCostInputs('panel'));
    costPerWattInput.addEventListener('change', updateFinancingAmounts);
    costPerPanelInput.addEventListener('change', updateFinancingAmounts);
}

function syncCostInputs(source) {
    const costPerWattInput = document.getElementById('costPerWatt');
    const costPerPanelInput = document.getElementById('costPerPanel');

    if (!costPerWattInput || !costPerPanelInput) {
        return;
    }

    if (source === 'panel') {
        const costPerPanel = parseFloat(costPerPanelInput.value);
        if (!isNaN(costPerPanel) && costPerPanel > 0) {
            const derivedWatt = costPerPanel / PANEL_WATTAGE;
            costPerWattInput.value = derivedWatt.toFixed(2);
        }
    } else {
        const costPerWatt = parseFloat(costPerWattInput.value);
        if (!isNaN(costPerWatt) && costPerWatt > 0) {
            const derivedPanel = costPerWatt * PANEL_WATTAGE;
            costPerPanelInput.value = Math.round(derivedPanel).toString();
        }
    }

    updateFinancingAmounts();
}

function getCostPerWatt() {
    const costPerWattInput = document.getElementById('costPerWatt');
    const costPerPanelInput = document.getElementById('costPerPanel');

    const costPerWatt = parseFloat(costPerWattInput?.value);
    if (!isNaN(costPerWatt) && costPerWatt > 0) {
        return costPerWatt;
    }

    const costPerPanel = parseFloat(costPerPanelInput?.value);
    if (!isNaN(costPerPanel) && costPerPanel > 0) {
        return costPerPanel / PANEL_WATTAGE;
    }

    return 3.5;
}

function formatCurrency(value) {
    if (!isFinite(value)) {
        return '$0';
    }
    const rounded = Math.round(value);
    return `$${rounded.toLocaleString()}`;
}

function formatSignedCurrency(value) {
    if (!isFinite(value) || value === 0) {
        return '$0';
    }

    const absolute = Math.abs(Math.round(value));
    const formatted = `$${absolute.toLocaleString()}`;
    return value < 0 ? `-${formatted}` : formatted;
}

function formatCredit(value) {
    if (!isFinite(value) || value <= 0) {
        return '$0';
    }
    const rounded = Math.round(value);
    return `-$${rounded.toLocaleString()}`;
}

function formatPercentValue(value, fallback = '—') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return `${Math.round(value)}%`;
}

function loadDefaults() {
    console.log('Loading defaults...');

    document.getElementById('costPerWatt').value = '3.50';
    document.getElementById('costPerPanel').value = Math.round(3.50 * PANEL_WATTAGE).toString();
    document.getElementById('federalITC').value = '30';
    document.getElementById('localRebate').value = '0';
    
    const state = deriveStateCode() || 'TX';
    const city = deriveCityName() || 'Unknown';
    
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
    
    const costPerWatt = getCostPerWatt();
    const costPerPanel = parseFloat(document.getElementById('costPerPanel').value) || costPerWatt * PANEL_WATTAGE;
    const federalITC = parseFloat(document.getElementById('federalITC').value) || 30;
    const localRebate = parseFloat(document.getElementById('localRebate').value) || 0;

    const systemSizeW = systemSizeKW * 1000;
    const grossCost = systemSizeW * costPerWatt;
    const taxCredit = grossCost * (federalITC / 100);
    const netCost = Math.max(0, grossCost - taxCredit - localRebate);

    document.getElementById('cashAmount').textContent =
        formatCurrency(netCost);
    document.getElementById('costPerWatt').value = costPerWatt.toFixed(2);
    document.getElementById('costPerPanel').value = Math.round(costPerPanel).toString();

    const loans = [
        { id: 'loan10', rate: 0.0699, term: 10 },
        { id: 'loan15', rate: 0.0799, term: 15 },
        { id: 'loan20', rate: 0.0899, term: 20 }
    ];

    loans.forEach(loan => {
        const monthlyPayment = calculateMonthlyPayment(netCost, loan.rate, loan.term);
        document.getElementById(`${loan.id}Amount`).textContent =
            formatCurrency(monthlyPayment);
    });

    console.log('✅ Financing updated:', { systemSizeKW, netCost, costPerWatt, costPerPanel });
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
            zipCode: deriveZipCode(),
            state: deriveStateCode(),
            city: deriveCityName(),
            selectedSegments: selectedSegments,
            userInputs: {
                costPerWatt: getCostPerWatt(),
                costPerPanel: parseFloat(document.getElementById('costPerPanel').value) || null,
                panelWattage: PANEL_WATTAGE,
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
                loanRate: financingType !== 'cash' ? parseFloat(document.getElementById('customLoanRate').value) / 100 : null,
                shadeLossPercent: getShadeLossPercent(),
                shadeImpactLevel: getShadeImpactLevel(),
                shadePeakHours: getShadePeakHours(),
                shadeRecommendations: getShadeRecommendations()
            }
        };
        
        console.log('📤 Sending ROI request:', requestData);
        
        const response = await fetch('/api/calculate-roi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            let errorMessage = 'ROI calculation failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                console.warn('Failed to parse ROI error response', parseError);
            }
            throw new Error(errorMessage);
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
    roiConfig = data.config || null;

    document.getElementById('duringLoanTitle').textContent =
        breakdown.loanTerm > 0 ? `Years 1-${breakdown.loanTerm} (During Loan)` : 'With Cash Purchase';
    document.getElementById('afterLoanTitle').textContent =
        breakdown.loanTerm > 0 ? `Years ${breakdown.loanTerm + 1}-25 (After Loan Paid Off)` : 'Years 1-25';

    document.getElementById('duringLoanPayment').textContent =
        formatCurrency(breakdown.duringLoan.loanPayment);
    document.getElementById('duringElectricBill').textContent =
        formatCurrency(breakdown.duringLoan.electricBill);
    document.getElementById('duringSolarSavings').textContent =
        formatSignedCurrency(breakdown.duringLoan.solarSavings);
    document.getElementById('duringNetCost').textContent =
        formatCurrency(breakdown.duringLoan.netCost);
    document.getElementById('duringVsNoSolar').textContent =
        `${formatCurrency(breakdown.duringLoan.vsNoSolar)}/month`;
    document.getElementById('duringExtraCost').textContent =
        `${formatSignedCurrency(breakdown.duringLoan.extraCostForSolar)}/month`;

    document.getElementById('afterElectricBill').textContent =
        formatCurrency(breakdown.afterLoan.electricBill);
    document.getElementById('afterSolarSavings').textContent =
        formatSignedCurrency(breakdown.afterLoan.solarSavings);
    document.getElementById('afterNetCost').textContent =
        formatCurrency(breakdown.afterLoan.netCost);
    document.getElementById('afterVsNoSolar').textContent =
        `${formatCurrency(breakdown.afterLoan.vsNoSolar)}/month`;
    document.getElementById('afterMonthlySavings').textContent =
        `${formatSignedCurrency(breakdown.afterLoan.monthlySavings)}/month`;

    const payback = roi.paybackPeriod;
    const paybackLine = payback
        ? `Payback hits in ${payback} years`
        : 'Payback is beyond 25 years at these settings';
    const keyInsight = document.getElementById('keyInsight');
    if (keyInsight) {
        let insightText = `${paybackLine}. Solar production offsets ${formatCurrency(breakdown.monthlySavings)}/month today, ` +
            `so once financing is gone you keep ${formatSignedCurrency(breakdown.afterLoan.monthlySavings)}/month. ` +
            `During the loan your net change is ${formatSignedCurrency(breakdown.duringLoan.extraCostForSolar)}/month versus staying with the utility.`;

        if (data.shadingImpact && Number.isFinite(data.shadingImpact.lossPercent) && data.shadingImpact.lossPercent > 1) {
            insightText += ` Shade trims roughly ${formatPercentValue(data.shadingImpact.lossPercent)} of output, and the ROI above already reflects that loss.`;
        }

        if (Number.isFinite(roi.homeValueIncrease) && roi.homeValueIncrease > 0) {
            insightText += ` Expect roughly ${formatCurrency(roi.homeValueIncrease)} in added property value, and homes with solar tend to sell ~20% faster once buyers see the lower utility bills.`;
        }

        keyInsight.textContent = insightText;
    }

    document.getElementById('grossCost').textContent = formatCurrency(roi.costs.grossCost);
    document.getElementById('federalCredit').textContent = formatCredit(roi.costs.federalTaxCredit);
    document.getElementById('netCost').textContent = formatCurrency(roi.costs.netCost);

    const stateLine = document.getElementById('stateIncentiveLine');
    if (roi.costs.stateTaxCredit > 0) {
        stateLine.style.display = 'flex';
        document.getElementById('stateIncentiveLabel').textContent =
            (data.stateIncentive?.name || 'State Incentive') + ':';
        document.getElementById('stateIncentiveValue').textContent = formatCredit(roi.costs.stateTaxCredit);
    } else {
        stateLine.style.display = 'none';
    }

    const localLine = document.getElementById('localRebateLine');
    if (roi.costs.localRebate > 0) {
        localLine.style.display = 'flex';
        const localLabel = document.getElementById('localRebateLabel');
        if (localLabel) {
            const source = data.config?.localRebateSource || 'Local Rebate';
            localLabel.textContent = `${source}:`;
        }
        document.getElementById('localRebateValue').textContent = formatCredit(roi.costs.localRebate);
    } else {
        localLine.style.display = 'none';
        const localLabel = document.getElementById('localRebateLabel');
        if (localLabel) {
            localLabel.textContent = 'Local Rebate:';
        }
    }

    document.getElementById('totalSavings').textContent = formatCurrency(roi.roi25Year.totalSavings);
    const financingKey = roi.financingType || data.config?.financingType || breakdown.financingType;
    const financingDetails = roi.financingOptions[financingKey] || { totalInterest: 0 };
    document.getElementById('totalInterest').textContent = formatCredit(financingDetails.totalInterest || 0);
    document.getElementById('totalMaintenance').textContent = formatCredit(roi.roi25Year.totalMaintenance);
    document.getElementById('netProfit').textContent = formatCurrency(roi.roi25Year.netProfit);

    document.getElementById('paybackPeriod').textContent =
        payback ? `${payback} years` : 'Not reached in 25 years';
    document.getElementById('roiPercentage').textContent = `${roi.roi25Year.roi}%`;
    document.getElementById('homeValueIncrease').textContent = `+${formatCurrency(roi.homeValueIncrease)}`;

    const carbonOffset = Math.round((roi.annualProduction * 25 * 0.92) / 2000);
    document.getElementById('carbonOffset').textContent = `${carbonOffset} tons`;

    renderHomeValueCard(data);
    renderIncentivesCard(data);
    renderShadingCard(data);
    renderPurchaseScore(data);

    console.log('✅ ROI results displayed');
}

function renderHomeValueCard(data) {
    const card = document.getElementById('homeValueCard');
    if (!card) {
        return;
    }

    const homeValueIncrease = data?.roi?.homeValueIncrease;
    if (!Number.isFinite(homeValueIncrease) || homeValueIncrease <= 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    const headline = document.getElementById('homeValueHeadline');
    if (headline) {
        headline.textContent = formatCurrency(homeValueIncrease);
    }

    const insights = [];
    const currentHomeValue = data?.config?.currentHomeValue;
    if (Number.isFinite(currentHomeValue) && currentHomeValue > 0) {
        const percentBoost = ((homeValueIncrease / currentHomeValue) * 100).toFixed(1);
        insights.push(`Approximately ${formatCurrency(homeValueIncrease)} added to a ${formatCurrency(currentHomeValue)} home (~${percentBoost}% premium).`);
    } else {
        insights.push(`Approximately ${formatCurrency(homeValueIncrease)} in appraisal value based on prevailing $/watt studies.`);
    }

    insights.push('Solar listings typically sell faster—national research shows 20% quicker sales once buyers see lower utility costs.');
    insights.push('Homes with solar also command resale premiums around 4%; share this boost when talking with agents, appraisers, or lenders.');

    const list = document.getElementById('homeValueInsights');
    if (list) {
        list.innerHTML = insights.map(text => `<li>${text}</li>`).join('');
    }
}

function renderIncentivesCard(data) {
    const card = document.getElementById('incentivesCard');
    if (!card) {
        return;
    }

    const summary = data?.incentiveSummary;
    const applied = summary?.applied || [];
    const potential = summary?.potential || [];
    const notes = summary?.notes || [];

    if (!applied.length && !potential.length && !notes.length) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    const intro = document.getElementById('incentivesIntro');
    if (intro) {
        const appliedCount = applied.length;
        const potentialCount = potential.length;
        const appliedLabel = appliedCount === 1 ? 'incentive' : 'incentives';
        intro.textContent = `We locked in ${appliedCount} ${appliedLabel} automatically and surfaced ${potentialCount} more to ask your installer about.`;
    }

    const appliedList = document.getElementById('appliedIncentivesList');
    if (appliedList) {
        appliedList.innerHTML = applied.length
            ? applied.map(renderIncentiveItem).join('')
            : '<li>No automatic incentives applied yet—add known rebates in the assumptions above.</li>';
    }

    const availableList = document.getElementById('availableIncentivesList');
    if (availableList) {
        availableList.innerHTML = potential.length
            ? potential.map(renderIncentiveItem).join('')
            : '<li>No additional programs surfaced—double-check with your installer or utility for local offers.</li>';
    }

    const footnote = document.getElementById('incentiveFootnote');
    if (footnote) {
        footnote.textContent = notes.join(' ');
    }
}

function renderShadingCard(data) {
    const card = document.getElementById('shadingCard');
    if (!card) {
        return;
    }

    const shadingImpact = data?.shadingImpact || {};
    const shadingAnalysis = analysisData?.shadingAnalysis || {};

    const lossPercent = Number.isFinite(shadingImpact.lossPercent)
        ? shadingImpact.lossPercent
        : (Number.isFinite(shadingAnalysis.overallShadePercent)
            ? shadingAnalysis.overallShadePercent
            : null);

    const hasMeaningfulShade = lossPercent != null && lossPercent > 1;
    const hasShadeData = shadingAnalysis && (shadingAnalysis.hasShading || lossPercent != null);
    if (!hasShadeData) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    const impactLevel = shadingImpact.impactLevel || shadingAnalysis.impactLevel || (hasMeaningfulShade ? 'Moderate' : 'Minimal');
    const lostKwh = Number.isFinite(shadingImpact.lostKwh) ? shadingImpact.lostKwh : null;
    const adjustedProduction = Number.isFinite(shadingImpact.adjustedAnnualProduction)
        ? shadingImpact.adjustedAnnualProduction
        : null;

    const headline = document.getElementById('shadeHeadline');
    if (headline) {
        if (hasMeaningfulShade) {
            headline.textContent = `${impactLevel} shading trims about ${formatPercentValue(lossPercent)}`;
        } else {
            headline.textContent = 'Shading impact is minimal';
        }
    }

    const subheadline = document.getElementById('shadeSubheadline');
    if (subheadline) {
        subheadline.textContent = 'Google Solar API used aerial imagery to estimate tree coverage and shade losses.';
    }

    const lossMetric = document.getElementById('shadeLossValue');
    if (lossMetric) {
        if (lossPercent != null) {
            lossMetric.textContent = formatPercentValue(lossPercent);
            if (!hasMeaningfulShade && lossPercent < 1) {
                lossMetric.textContent = '<1%';
            }
        } else {
            lossMetric.textContent = 'Under 1%';
        }
    }

    const lostKwhMetric = document.getElementById('shadeLostKwh');
    if (lostKwhMetric) {
        lostKwhMetric.textContent = hasMeaningfulShade && Number.isFinite(lostKwh) && lostKwh > 0
            ? `${Math.round(lostKwh).toLocaleString()} kWh/yr`
            : 'Negligible';
    }

    const adjustedMetric = document.getElementById('shadeAdjustedProduction');
    if (adjustedMetric) {
        adjustedMetric.textContent = Number.isFinite(adjustedProduction)
            ? `${Math.round(adjustedProduction).toLocaleString()} kWh/yr`
            : '—';
    }

    const peaksContainer = document.getElementById('shadePeaks');
    if (peaksContainer) {
        const peaks = Array.isArray(shadingAnalysis.peakShadingHours) ? shadingAnalysis.peakShadingHours : [];
        if (peaks.length && hasMeaningfulShade) {
            peaksContainer.innerHTML = peaks.map(peak => {
                const impact = peak.impact || '';
                const impactClass = impact ? impact.toLowerCase().replace(/[^a-z]/g, '-') : '';
                return `
                    <div class="shade-peak ${impactClass}">
                        <span class="peak-time">${peak.time || ''}</span>
                        <span class="peak-impact">${impact}</span>
                        <span class="peak-percent">${formatPercentValue(peak.averageShadePercent)}</span>
                    </div>
                `;
            }).join('');
        } else {
            peaksContainer.innerHTML = '<p class="shade-peaks-empty">No pronounced shade windows detected.</p>';
        }
    }

    const recommendationsList = document.getElementById('shadeRecommendations');
    if (recommendationsList) {
        const recommendations = shadingAnalysis.recommendations && shadingAnalysis.recommendations.length
            ? shadingAnalysis.recommendations
            : ['Tree coverage looks manageable—keep branches trimmed to maintain performance.'];
        recommendationsList.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
    }

    const note = document.getElementById('shadeSourceNote');
    if (note) {
        note.textContent = hasMeaningfulShade
            ? 'These losses are baked into the ROI math so savings reflect tree coverage.'
            : 'No meaningful shade detected, so the ROI uses full production from Google’s solar model.';
    }
}

function renderIncentiveItem(item = {}) {
    const name = item.name || 'Incentive';
    const valueLabel = formatIncentiveValue(item);
    const header = `
        <div class="incentive-header">
            <div class="incentive-name">${name}</div>
            ${valueLabel ? `<div class="incentive-value">${valueLabel}</div>` : ''}
        </div>
    `;

    const metaParts = [];
    const type = item.category || item.type;
    if (type) {
        metaParts.push(`<span class="incentive-badge ${type}">${formatIncentiveType(type)}</span>`);
    }
    if (item.provider) {
        metaParts.push(`<span class="incentive-provider">${item.provider}</span>`);
    }
    if (Array.isArray(item.cities) && item.cities.length) {
        metaParts.push(`<span class="incentive-provider">Cities: ${item.cities.join(', ')}</span>`);
    }
    if (item.appliesTo) {
        metaParts.push(`<span class="incentive-provider">Applies to ${item.appliesTo}</span>`);
    }

    const meta = metaParts.length ? `<div class="incentive-meta">${metaParts.join(' ')}</div>` : '';
    const description = item.description ? `<div class="incentive-description">${item.description}</div>` : '';

    return `<li>${header}${meta}${description}</li>`;
}

function formatIncentiveValue(item) {
    if (!item) {
        return '';
    }

    if (Number.isFinite(item.value)) {
        return formatCurrency(item.value);
    }

    if (Number.isFinite(item.estimatedValue)) {
        return `≈ ${formatCurrency(item.estimatedValue)}`;
    }

    if (Number.isFinite(item.estimatedValueFlat)) {
        return `≈ ${formatCurrency(item.estimatedValueFlat)}`;
    }

    if (Number.isFinite(item.estimatedValuePercent)) {
        return `≈ ${item.estimatedValuePercent}%`;
    }

    return '';
}

function formatIncentiveType(type) {
    if (!type) {
        return 'Incentive';
    }

    const normalized = String(type).toLowerCase();
    const mapping = {
        federal: 'Federal',
        state: 'State',
        local: 'Local',
        vendor: 'Installer',
        utility: 'Utility'
    };

    return mapping[normalized] || capitalize(normalized);
}

function capitalize(text) {
    if (!text) {
        return '';
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function renderPurchaseScore(data) {
    const card = document.getElementById('decisionScale');
    if (!card) {
        return;
    }

    if (!data?.roi || !data?.monthlyBreakdown) {
        card.style.display = 'none';
        return;
    }

    const metrics = {
        payback: data.roi.paybackPeriod,
        roiPercent: data.roi.roi25Year?.roi,
        netProfit: data.roi.roi25Year?.netProfit,
        monthlySavings: data.monthlyBreakdown.afterLoan?.monthlySavings,
        extraCostDuringLoan: data.monthlyBreakdown.duringLoan?.extraCostForSolar,
        netCost: data.roi.costs?.netCost
    };

    const scoreData = calculatePurchaseScore(metrics);

    card.style.display = 'block';
    const scoreValue = document.getElementById('purchaseScoreValue');
    const scoreLabel = document.getElementById('purchaseScoreLabel');
    const scoreSummary = document.getElementById('purchaseScoreSummary');
    const indicator = document.getElementById('purchaseScoreIndicator');
    const insightsList = document.getElementById('purchaseScoreInsights');

    if (scoreValue) scoreValue.textContent = scoreData.score;
    if (scoreLabel) scoreLabel.textContent = scoreData.label;
    if (scoreSummary) scoreSummary.textContent = scoreData.summary;
    if (indicator) {
        const rawPercent = ((scoreData.score - 1) / 8) * 100;
        const clampedPercent = Math.min(98, Math.max(2, rawPercent));
        indicator.style.left = `${clampedPercent}%`;
    }
    if (insightsList) {
        insightsList.innerHTML = scoreData.insights.slice(0, 4)
            .map(item => `<li>${item}</li>`)
            .join('');
    }
}

function calculatePurchaseScore(metrics) {
    let score = 5;
    const insights = [];

    const payback = metrics.payback;
    if (payback == null) {
        score -= 2;
        insights.push('Payback is beyond the 25-year analysis window at current settings.');
    } else {
        if (payback <= 7) {
            score += 2;
            insights.push(`Payback in ${payback} years is outstanding for residential solar.`);
        } else if (payback <= 10) {
            score += 1;
            insights.push(`Payback in ${payback} years is comfortably within a typical homeowner horizon.`);
        } else if (payback <= 14) {
            insights.push(`Payback in ${payback} years is workable but not stellar.`);
        } else if (payback <= 18) {
            score -= 1;
            insights.push(`Payback in ${payback} years is on the long side—confirm you will stay in the home.`);
        } else {
            score -= 2;
            insights.push(`Payback in ${payback} years is quite long; consider trimming system size or costs.`);
        }
    }

    const roiPercent = metrics.roiPercent;
    if (roiPercent != null) {
        const roundedROI = Math.round(roiPercent);
        if (roundedROI >= 220) {
            score += 2;
            insights.push(`Lifetime ROI of ${roundedROI}% signals exceptional value.`);
        } else if (roundedROI >= 160) {
            score += 1;
            insights.push(`Lifetime ROI of ${roundedROI}% is very healthy.`);
        } else if (roundedROI >= 120) {
            insights.push(`Lifetime ROI of ${roundedROI}% is solid, though not elite.`);
        } else if (roundedROI >= 80) {
            score -= 1;
            insights.push(`Lifetime ROI of ${roundedROI}% is modest—hunt for rebates or lower pricing.`);
        } else {
            score -= 2;
            insights.push(`Lifetime ROI of ${roundedROI}% is weak without stronger incentives.`);
        }
    }

    const netProfit = metrics.netProfit;
    if (netProfit != null) {
        const roundedProfit = Math.round(netProfit);
        if (roundedProfit >= 60000) {
            score += 1;
            insights.push(`Estimated $${roundedProfit.toLocaleString()} lifetime profit is excellent.`);
        } else if (roundedProfit <= 15000) {
            score -= 1;
            insights.push(`Lifetime profit of $${roundedProfit.toLocaleString()} is relatively small.`);
        }
    }

    const extraCost = metrics.extraCostDuringLoan ?? 0;
    if (extraCost <= -25) {
        score += 1;
        insights.push(`Even with loan payments you save ${formatSignedCurrency(extraCost)}/month versus staying with the utility.`);
    } else if (extraCost <= 40) {
        insights.push(`Loan years are nearly bill-neutral at ${formatSignedCurrency(extraCost)}/month versus no solar.`);
    } else if (extraCost <= 120) {
        score -= 1;
        insights.push(`Expect about ${formatSignedCurrency(extraCost)}/month more during the loan—plan cash flow accordingly.`);
    } else {
        score -= 2;
        insights.push(`High carry cost of ${formatSignedCurrency(extraCost)}/month during the loan hurts near-term cash flow.`);
    }

    const monthlySavings = metrics.monthlySavings ?? 0;
    if (monthlySavings >= 250) {
        score += 1;
        insights.push(`After payoff you pocket ${formatSignedCurrency(monthlySavings)}/month in ongoing savings.`);
    } else if (monthlySavings <= 75) {
        score -= 1;
        insights.push(`Post-loan savings of ${formatSignedCurrency(monthlySavings)}/month are fairly light.`);
    }

    score = Math.max(1, Math.min(9, Math.round(score)));

    const descriptor = PURCHASE_SCORE_LABELS[score] || PURCHASE_SCORE_LABELS[5];

    if (insights.length === 0) {
        insights.push('Adjust pricing, incentives, or utility inflation assumptions to stress-test the outcome.');
    }

    return {
        score,
        label: descriptor.label,
        summary: descriptor.summary,
        insights
    };
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