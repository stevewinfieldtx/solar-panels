// public/app.js

let currentAnalysis = null;

document.getElementById('addressForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const address = document.getElementById('addressInput').value.trim();
    
    if (!address) {
        showError('Please enter an address');
        return;
    }

    await analyzeRoof(address);
});

async function analyzeRoof(address) {
    try {
        showLoading();
        hideError();

        updateLoadingStatus('Geocoding address...');
        
        const geoResponse = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        });

        if (!geoResponse.ok) {
            throw new Error('Address not found. Please check and try again.');
        }

        const location = await geoResponse.json();
        console.log('Location:', location);

        updateLoadingStatus('Analyzing roof with satellite imagery...');

        const analysisResponse = await fetch('/api/analyze-roof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: location.formattedAddress,
                lat: location.lat,
                lng: location.lng
            })
        });

        if (!analysisResponse.ok) {
            const error = await analysisResponse.json();
            throw new Error(error.message || 'Failed to analyze roof');
        }

        const analysis = await analysisResponse.json();
        console.log('Analysis:', analysis);

        currentAnalysis = analysis;

        updateLoadingStatus('Generating recommendations...');

        await new Promise(resolve => setTimeout(resolve, 500));

        displayResults(analysis);

    } catch (error) {
        console.error('Analysis error:', error);
        showError(error.message);
        hideLoading();
        document.getElementById('inputSection').style.display = 'block';
    }
}

function displayResults(analysis) {
    hideLoading();
    document.getElementById('inputSection').style.display = 'none';

    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';

    document.getElementById('resultAddress').textContent = 
        `Roof Analysis: ${analysis.address}`;

    const date = analysis.buildingInsights.imageryDate;
    document.getElementById('imageryDate').textContent = 
        `${date.month}/${date.year}`;

    displaySummaryStats(analysis);
    displayPrimaryRecommendation(analysis);
    displayRoofSegments(analysis);
    displayOptimalConfiguration(analysis);
    displayGoogleMap(analysis);
    
    displayMonthlyProduction(analysis);
    displaySeasonalVariation(analysis);
    displayShadingAnalysis(analysis);
    
    // CRITICAL: Add ROI button
    addROIButton();

    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function displayGoogleMap(analysis) {
    const mapDiv = document.getElementById('map');
    
    if (typeof google === 'undefined' || !google.maps) {
        console.log('Google Maps not loaded yet, waiting...');
        const checkGoogleMaps = setInterval(() => {
            if (typeof google !== 'undefined' && google.maps) {
                clearInterval(checkGoogleMaps);
                initializeMap(analysis, mapDiv);
            }
        }, 100);
        return;
    }
    
    initializeMap(analysis, mapDiv);
}

function initializeMap(analysis, mapDiv) {
    const center = {
        lat: analysis.location.lat,
        lng: analysis.location.lng
    };

    const map = new google.maps.Map(mapDiv, {
        center: center,
        zoom: 20,
        mapTypeId: 'satellite',
        tilt: 0
    });

    new google.maps.Marker({
        position: center,
        map: map,
        title: analysis.address
    });

    if (analysis.roofSegments && analysis.roofSegments.length > 0) {
        analysis.roofSegments.forEach(segment => {
            if (segment.boundingBox) {
                const bounds = segment.boundingBox;
                
                new google.maps.Polygon({
                    paths: [
                        { lat: bounds.sw.latitude, lng: bounds.sw.longitude },
                        { lat: bounds.sw.latitude, lng: bounds.ne.longitude },
                        { lat: bounds.ne.latitude, lng: bounds.ne.longitude },
                        { lat: bounds.ne.latitude, lng: bounds.sw.longitude }
                    ],
                    strokeColor: segment.color,
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    fillColor: segment.color,
                    fillOpacity: 0.35,
                    map: map
                });

                new google.maps.Marker({
                    position: {
                        lat: segment.center.latitude,
                        lng: segment.center.longitude
                    },
                    map: map,
                    label: {
                        text: `${segment.efficiency}%`,
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 20,
                        fillColor: segment.color,
                        fillOpacity: 0.9,
                        strokeColor: 'white',
                        strokeWeight: 2
                    }
                });
            }
        });
    }
}

function displaySummaryStats(analysis) {
    const grid = document.getElementById('summaryGrid');
    const summary = analysis.recommendations.summary;

    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${summary.totalSegments}</div>
            <div class="stat-label">Roof Segments</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.usableSegments}</div>
            <div class="stat-label">Usable for Solar</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.totalUsableArea.toLocaleString()}</div>
            <div class="stat-label">Usable Area (sq ft)</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.maxPanelCapacity}</div>
            <div class="stat-label">Max Panel Capacity</div>
        </div>
    `;
}

function displayPrimaryRecommendation(analysis) {
    const recDiv = document.getElementById('primaryRecText');
    const rec = analysis.recommendations;

    let html = `<p class="rec-primary">${rec.primaryRecommendation}</p>`;

    if (rec.avoidRecommendation) {
        html += `<p class="rec-avoid">⚠️ ${rec.avoidRecommendation}</p>`;
    }

    recDiv.innerHTML = html;
}

function displayRoofSegments(analysis) {
    const grid = document.getElementById('segmentsGrid');
    const segments = analysis.roofSegments;

    grid.innerHTML = segments.map(segment => `
        <div class="segment-card ${segment.suitability.toLowerCase().replace(' ', '-')}" data-segment-id="${segment.id}">
            <div class="segment-summary" onclick="toggleSegment(${segment.id})">
                <div class="segment-header-compact">
                    <h4>${segment.name}</h4>
                    <span class="direction-badge">${segment.direction}</span>
                    <span class="efficiency-badge" style="background-color: ${segment.color}; color: white;">
                        ${segment.efficiency}%
                    </span>
                </div>
                <div class="expand-icon">▼</div>
            </div>
            
            <div class="segment-details" style="display: none;">
                <div class="detail-row">
                    <span class="label">Orientation:</span>
                    <span class="value">${segment.azimuth}° (${segment.direction})</span>
                </div>
                <div class="detail-row">
                    <span class="label">Roof Pitch:</span>
                    <span class="value">${segment.pitch}°</span>
                </div>
                <div class="detail-row">
                    <span class="label">Available Area:</span>
                    <span class="value">${segment.areaSqFt.toLocaleString()} sq ft</span>
                </div>
                <div class="detail-row">
                    <span class="label">Panel Capacity:</span>
                    <span class="value">${segment.panelCapacity} panels</span>
                </div>
                <div class="detail-row">
                    <span class="label">Annual Sunshine:</span>
                    <span class="value">${segment.sunshineHours.toLocaleString()} hours</span>
                </div>
                <div class="detail-row">
                    <span class="label">Suitability:</span>
                    <span class="value suitability-${segment.suitability.toLowerCase().replace(' ', '-')}">
                        <strong>${segment.suitability}</strong>
                    </span>
                </div>
                
                <div class="segment-recommendation">
                    ${getRecommendationIcon(segment.suitability)} ${segment.recommendation}
                </div>
            </div>
        </div>
    `).join('');
}

function toggleSegment(segmentId) {
    const card = document.querySelector(`[data-segment-id="${segmentId}"]`);
    const details = card.querySelector('.segment-details');
    const icon = card.querySelector('.expand-icon');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        icon.textContent = '▲';
    } else {
        details.style.display = 'none';
        icon.textContent = '▼';
    }
}

function displayOptimalConfiguration(analysis) {
    const configDiv = document.getElementById('configurationContent');
    const config = analysis.recommendations.optimalConfiguration;

    if (config.segments.length === 0) {
        configDiv.innerHTML = `<p class="warning">${config.recommendation}</p>`;
        return;
    }

    let html = `
        <p class="config-summary"><strong>${config.recommendation}</strong></p>
        
        <div class="config-stats">
            <div class="config-stat">
                <span class="config-label">Total Capacity:</span>
                <span class="config-value">${config.totalPanelCapacity} panels</span>
            </div>
            <div class="config-stat">
                <span class="config-label">System Size:</span>
                <span class="config-value">${config.estimatedSystemSize} kW</span>
            </div>
            <div class="config-stat">
                <span class="config-label">Total Area:</span>
                <span class="config-value">${config.totalUsableArea.toLocaleString()} sq ft</span>
            </div>
        </div>

        <h4>📋 Recommended Panel Distribution:</h4>
        <div class="config-segments">
            ${config.segments.map(seg => `
                <div class="config-segment">
                    <div class="config-segment-header">
                        <strong>${seg.name}</strong>
                        <span class="priority-badge priority-${seg.priority.toLowerCase()}">${seg.priority}</span>
                    </div>
                    <div class="config-segment-details">
                        <span>${seg.direction}-facing</span>
                        <span>•</span>
                        <span>${seg.efficiency}% efficiency</span>
                        <span>•</span>
                        <span>${seg.panelCapacity} panels (${seg.estimatedKW} kW)</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    configDiv.innerHTML = html;
}

// FIX #1: Monthly Production with proper bar heights
function displayMonthlyProduction(analysis) {
    if (!analysis.monthlyProduction) {
        console.log('No monthly production data available');
        return;
    }

    // Remove any existing monthly section
    const existing = document.querySelector('.monthly-production-section');
    if (existing) existing.remove();

    const monthlyDiv = document.createElement('div');
    monthlyDiv.className = 'monthly-production-section';
    
    // Find max production for scaling
    const maxProduction = Math.max(...analysis.monthlyProduction.map(m => m.estimatedProduction));
    console.log('Max monthly production:', maxProduction);
    
    monthlyDiv.innerHTML = `
        <h3>📅 Monthly Solar Production Estimate</h3>
        <div class="monthly-chart">
            ${analysis.monthlyProduction.map(month => {
                const height = maxProduction > 0 ? (month.estimatedProduction / maxProduction) * 100 : 0;
                return `
                    <div class="month-bar">
                        <div class="bar-fill" style="height: ${height}%; background: linear-gradient(180deg, #FFD600 0%, #FF9100 100%);"></div>
                        <div class="month-label">${month.month.substring(0, 3)}</div>
                        <div class="month-value">${month.estimatedProduction} kWh</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    const configCard = document.getElementById('configurationCard');
    if (configCard) {
        configCard.insertAdjacentElement('afterend', monthlyDiv);
        console.log('Monthly production chart added');
    } else {
        console.error('Configuration card not found');
    }
}

function displaySeasonalVariation(analysis) {
    if (!analysis.seasonalVariation) {
        console.log('No seasonal variation data available');
        return;
    }

    // Remove any existing seasonal section
    const existing = document.querySelector('.seasonal-section');
    if (existing) existing.remove();

    const seasonal = analysis.seasonalVariation;
    const seasonalDiv = document.createElement('div');
    seasonalDiv.className = 'seasonal-section';
    seasonalDiv.innerHTML = `
        <h3>🌤️ Seasonal Production Variation</h3>
        <div class="seasonal-grid">
            <div class="season-card winter">
                <h4>❄️ Winter</h4>
                <div class="season-avg">${seasonal.winter.avg} kWh/month</div>
                <div class="season-detail">Dec-Feb</div>
            </div>
            <div class="season-card spring">
                <h4>🌸 Spring</h4>
                <div class="season-avg">${seasonal.spring.avg} kWh/month</div>
                <div class="season-detail">Mar-May</div>
            </div>
            <div class="season-card summer">
                <h4>☀️ Summer</h4>
                <div class="season-avg">${seasonal.summer.avg} kWh/month</div>
                <div class="season-detail">Jun-Aug</div>
            </div>
            <div class="season-card fall">
                <h4>🍂 Fall</h4>
                <div class="season-avg">${seasonal.fall.avg} kWh/month</div>
                <div class="season-detail">Sep-Nov</div>
            </div>
        </div>
    `;

    const monthlySection = document.querySelector('.monthly-production-section');
    if (monthlySection) {
        monthlySection.insertAdjacentElement('afterend', seasonalDiv);
    }
}

function displayShadingAnalysis(analysis) {
    if (!analysis.shadingAnalysis || !analysis.shadingAnalysis.hasShading) {
        console.log('No shading analysis data available');
        return;
    }

    // Remove any existing shading section
    const existing = document.querySelector('.shading-section');
    if (existing) existing.remove();

    const shading = analysis.shadingAnalysis;
    const shadingDiv = document.createElement('div');
    shadingDiv.className = 'shading-section';
    shadingDiv.innerHTML = `
        <h3>🌳 Shading Analysis</h3>
        <div class="shading-card">
            <h4>Time-of-Day Impact:</h4>
            <div class="shading-hours">
                ${shading.peakShadingHours.map(hour => `
                    <div class="shading-hour ${hour.impact.toLowerCase()}">
                        <span class="time">${hour.time}</span>
                        <span class="impact ${hour.impact.toLowerCase()}">${hour.impact}</span>
                    </div>
                `).join('')}
            </div>
            <h4>Recommendations:</h4>
            <ul class="shading-recommendations">
                ${shading.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    `;

    const seasonalSection = document.querySelector('.seasonal-section');
    if (seasonalSection) {
        seasonalSection.insertAdjacentElement('afterend', shadingDiv);
    }
}

// FIX #2: Robust ROI Button Addition
function addROIButton() {
    // Check if button already exists
    if (document.getElementById('roiButton')) {
        console.log('ROI button already exists');
        return;
    }
    
    const ctaSection = document.querySelector('.cta-section');
    if (!ctaSection) {
        console.error('CTA section not found');
        return;
    }
    
    // Create ROI button container
    const roiContainer = document.createElement('div');
    roiContainer.style.textAlign = 'center';
    roiContainer.style.marginBottom = '30px';
    
    // Create ROI button
    const roiButton = document.createElement('button');
    roiButton.id = 'roiButton';
    roiButton.className = 'btn-primary btn-large';
    roiButton.innerHTML = '💰 Calculate My ROI & Financing Options';
    roiButton.onclick = () => {
        console.log('ROI button clicked, saving data:', currentAnalysis);
        // Save analysis data to localStorage
        localStorage.setItem('solarAnalysisData', JSON.stringify(currentAnalysis));
        // Navigate to ROI page
        window.location.href = '/roi.html';
    };
    
    roiContainer.appendChild(roiButton);
    
    // Insert at the beginning of CTA section
    const firstChild = ctaSection.firstChild;
    ctaSection.insertBefore(roiContainer, firstChild);
    
    console.log('✅ ROI button added successfully');
}

function getRecommendationIcon(suitability) {
    switch (suitability) {
        case 'Excellent': return '⭐';
        case 'Very Good': return '✅';
        case 'Good': return '👍';
        case 'Fair': return '⚠️';
        case 'Poor': return '❌';
        default: return '•';
    }
}

function showLoading() {
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingSection').style.display = 'none';
}

function updateLoadingStatus(status) {
    document.getElementById('loadingStatus').textContent = status;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function startOver() {
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('inputSection').style.display = 'block';
    document.getElementById('addressInput').value = '';
    document.getElementById('addressInput').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const dynamicSections = document.querySelectorAll('.monthly-production-section, .seasonal-section, .shading-section');
    dynamicSections.forEach(section => section.remove());
    
    // Remove ROI button
    const roiButton = document.getElementById('roiButton');
    if (roiButton && roiButton.parentElement) {
        roiButton.parentElement.remove();
    }
}