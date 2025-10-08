// public/app.js - Handles UI logic and SECURELY loads the Maps API
const API_BASE = '/api';

let map;
let currentAnalysis = null;
let mapsApiIsLoaded = false;
let googleMapsApiKey = null; 

// -------------------------------------------------------------------------
// CORE FUNCTION: Dynamically load Google Maps API securely
// -------------------------------------------------------------------------
async function loadMapsApi() {
    if (mapsApiIsLoaded) return;

    // 1. Fetch the API key securely from our serverless endpoint
    const configResponse = await fetch(`${API_BASE}/map-config`);
    
    if (!configResponse.ok) {
        const error = await configResponse.json();
        throw new Error(error.error || "Could not load maps key. Please check your .env file or Vercel dashboard.");
    }
    
    const config = await configResponse.json();
    googleMapsApiKey = config.apiKey;

    // 2. Dynamically create the Google Maps script tag with the fetched key
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;
    
    // Set flag once load process starts
    mapsApiIsLoaded = true; 
    document.head.appendChild(script);
}

// -------------------------------------------------------------------------
// Global callback required by Maps API
// -------------------------------------------------------------------------
function initMap() {
    console.log('Google Maps loaded and ready.');
    if (currentAnalysis) {
        initializeMap(currentAnalysis);
    }
}

// -------------------------------------------------------------------------
// MAIN APP STARTUP: Load the Maps API key and script when the page loads
// -------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadMapsApi().catch(error => {
        showError(error.message);
    });
});


// -------------------------------------------------------------------------
// Form Submission Logic
// -------------------------------------------------------------------------
document.getElementById('addressForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const address = document.getElementById('addressInput').value.trim();
    
    if (!address) {
        showError('Please enter a full street address.');
        return;
    }
    
    // Safety check: ensure Maps has fully loaded before analysis continues
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        showError('Maps API is still loading. Please wait a moment and try again.');
        return;
    }
    
    await analyzeRoof(address);
});


async function analyzeRoof(address) {
    try {
        showLoading();
        hideError();

        // 1. Geocode address (gets lat/lng)
        updateLoadingStatus('Geocoding address...');
        const geoResponse = await fetch(`${API_BASE}/geocode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        });

        if (!geoResponse.ok) {
            const error = await geoResponse.json();
            throw new Error(error.message || 'Address not found or geocoding failed.');
        }

        const location = await geoResponse.json();

        // 2. Analyze roof (calls Google Solar API)
        updateLoadingStatus(`Analyzing roof for: ${location.formattedAddress}`);
        const analysisResponse = await fetch(`${API_BASE}/analyze-roof`, {
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
            throw new Error(error.message || 'Failed to analyze roof: No satellite data available.');
        }

        const analysis = await analysisResponse.json();
        currentAnalysis = analysis; 

        updateLoadingStatus('Finalizing analysis and rendering...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        displayResults(analysis);

    } catch (error) {
        console.error('Analysis error:', error);
        showError(error.message);
        hideLoading();
        document.getElementById('inputSection').style.display = 'block';
    }
}

// =======================================================
// UI RENDERING FUNCTIONS (Remainder of app.js)
// =======================================================

function displayResults(analysis) {
    hideLoading();
    document.getElementById('inputSection').style.display = 'none';
    
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
    
    document.getElementById('resultAddress').textContent = 
        `Solar Analysis for: ${analysis.address}`;
    
    const date = analysis.buildingInsights.imageryDate;
    document.getElementById('imageryDate').textContent = 
        `${date.month}/${date.year}`;

    displaySummaryStats(analysis);
    displayPrimaryRecommendation(analysis);
    displayRoofSegments(analysis);
    displayOptimalConfiguration(analysis);

    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        initializeMap(analysis);
    }
    
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function displaySummaryStats(analysis) {
    const grid = document.getElementById('summaryGrid');
    const summary = analysis.recommendations.summary;
    const potential = analysis.solarPotential;

    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${summary.totalSegments}</div>
            <div class="stat-label">Total Roof Segments</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.usableSegments}</div>
            <div class="stat-label">Usable for Solar</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${potential.maxArrayAreaSqFt.toLocaleString()}</div>
            <div class="stat-label">Max Usable Area (sq ft)</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${potential.maxArrayPanelsCount}</div>
            <div class="stat-label">Max Panel Capacity</div>
        </div>
    `;
}

function displayPrimaryRecommendation(analysis) {
    const recDiv = document.getElementById('primaryRecText');
    const rec = analysis.recommendations;
    let html = `<p class="rec-primary"><strong>${rec.primaryRecommendation}</strong></p>`;

    if (rec.avoidRecommendation) {
        html += `<p class="rec-avoid">⚠️ ${rec.avoidRecommendation}</p>`;
    }

    recDiv.innerHTML = html;
}

function displayRoofSegments(analysis) {
    const grid = document.getElementById('segmentsGrid');
    const segments = analysis.roofSegments;

    grid.innerHTML = segments.map(segment => `
        <div class="segment-card ${segment.suitability.toLowerCase().replace(' ', '-')}">
            <div class="segment-header">
                <div>
                    <h4>${segment.name}</h4>
                    <span class="direction-badge">${segment.direction}</span>
                </div>
                <span class="efficiency-badge" style="background-color: ${segment.color}">
                    ${segment.efficiency}% Efficient
                </span>
            </div>
            
            <div class="segment-details">
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
                        ${segment.suitability}
                    </span>
                </div>
            </div>

            <div class="segment-recommendation">
                ${getRecommendationIcon(segment.suitability)} ${segment.recommendation}
            </div>
        </div>
    `).join('');
}

function displayOptimalConfiguration(analysis) {
    const configDiv = document.getElementById('configurationContent');
    const config = analysis.recommendations.optimalConfiguration;

    if (config.segments.length === 0) {
        configDiv.innerHTML = `<p class="warning">${config.recommendation}</p>`;
        return;
    }

    let html = `
        <p class="config-summary">${config.recommendation}</p>
        
        <div class="config-stats">
            <div class="config-stat">
                <span class="config-label">Total Panels:</span>
                <span class="config-value">${config.totalPanelCapacity}</span>
            </div>
            <div class="config-stat">
                <span class="config-label">Est. System Size:</span>
                <span class="config-value">${config.estimatedSystemSize} kW</span>
            </div>
            <div class="config-stat">
                <span class="config-label">Total Usable Area:</span>
                <span class="config-value">${config.totalUsableArea.toLocaleString()} sq ft</span>
            </div>
        </div>

        <h4>Recommended Panel Distribution:</h4>
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

function initializeMap(analysis) {
    const mapDiv = document.getElementById('map');
    const center = analysis.location;
    
    map = new google.maps.Map(mapDiv, {
        center: { lat: center.lat, lng: center.lng },
        zoom: 20,
        mapTypeId: 'satellite',
        tilt: 45,
        heading: 0,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true
    });

    // Add property marker
    new google.maps.Marker({
        position: center,
        map: map,
        title: analysis.address,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#FF7043',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
        }
    });

    // Add roof segment markers
    analysis.roofSegments.forEach((segment, index) => {
        if (segment.center) {
            const marker = new google.maps.Marker({
                position: segment.center,
                map: map,
                label: {
                    text: (index + 1).toString(),
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 15,
                    fillColor: segment.color,
                    fillOpacity: 0.9,
                    strokeColor: 'white',
                    strokeWeight: 2
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 10px; min-width: 200px;">
                        <h3 style="margin: 0 0 10px 0;">${segment.direction}-Facing Roof</h3>
                        <p style="margin: 5px 0;"><strong>Efficiency:</strong> ${segment.efficiency}%</p>
                        <p style="margin: 5px 0;"><strong>Area:</strong> ${segment.areaSqFt} sq ft</p>
                        <p style="margin: 5px 0; color: ${segment.color};"><strong>Suitability:</strong> ${segment.suitability}</strong></p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
        }
    });
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
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'block';
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline-block';
}

function hideLoading() {
    document.getElementById('loadingSection').style.display = 'none';
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    if (btnText) btnText.style.display = 'inline-block';
    if (btnLoader) btnLoader.style.display = 'none';
}

function updateLoadingStatus(status) {
    document.getElementById('loadingStatus').textContent = status;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    hideLoading();
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
}