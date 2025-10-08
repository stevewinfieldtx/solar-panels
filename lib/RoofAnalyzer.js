// lib/RoofAnalyzer.js
class RoofAnalyzer {
    analyzeRoofSegments(solarData) {
        if (!solarData.solarPotential?.roofSegmentStats) {
            throw new Error('No roof segment data available');
        }

        const segments = solarData.solarPotential.roofSegmentStats;

        return segments.map((segment, index) => {
            const azimuth = segment.azimuthDegrees;
            const pitch = segment.pitchDegrees;
            
            return {
                id: index,
                name: `Roof Segment ${index + 1}`,
                azimuth: Math.round(azimuth),
                direction: this.getCardinalDirection(azimuth),
                pitch: Math.round(pitch * 10) / 10,
                areaSqFt: Math.round(segment.stats.areaMeters2 * 10.764),
                areaSqM: Math.round(segment.stats.areaMeters2),
                sunshineHours: segment.stats.sunshineQuantiles[2],
                efficiency: this.calculateEfficiency(azimuth, pitch),
                suitability: null,
                panelCapacity: Math.floor(segment.stats.areaMeters2 / 1.7),
                color: null,
                center: segment.center,
                boundingBox: segment.boundingBox
            };
        }).map(segment => {
            segment.suitability = this.getSuitability(segment.efficiency);
            segment.color = this.getEfficiencyColor(segment.efficiency);
            segment.recommendation = this.getSegmentRecommendation(segment);
            return segment;
        });
    }

    getCardinalDirection(azimuth) {
        const directions = [
            { name: 'North', min: 337.5, max: 22.5 },
            { name: 'Northeast', min: 22.5, max: 67.5 },
            { name: 'East', min: 67.5, max: 112.5 },
            { name: 'Southeast', min: 112.5, max: 157.5 },
            { name: 'South', min: 157.5, max: 202.5 },
            { name: 'Southwest', min: 202.5, max: 247.5 },
            { name: 'West', min: 247.5, max: 292.5 },
            { name: 'Northwest', min: 292.5, max: 337.5 }
        ];

        for (const dir of directions) {
            if (dir.name === 'North') {
                if (azimuth >= dir.min || azimuth < dir.max) return dir.name;
            } else {
                if (azimuth >= dir.min && azimuth < dir.max) return dir.name;
            }
        }
        return 'Unknown';
    }

    calculateEfficiency(azimuth, pitch) {
        const azimuthDiff = Math.abs(180 - azimuth);
        let azimuthEfficiency;
        
        if (azimuthDiff <= 15) {
            azimuthEfficiency = 100;
        } else if (azimuthDiff <= 45) {
            azimuthEfficiency = 100 - (azimuthDiff - 15) * 0.5;
        } else if (azimuthDiff <= 90) {
            azimuthEfficiency = 85 - (azimuthDiff - 45) * 0.8;
        } else {
            azimuthEfficiency = Math.max(0, 49 - (azimuthDiff - 90) * 0.5);
        }

        const optimalPitch = 28;
        const pitchDiff = Math.abs(pitch - optimalPitch);
        let pitchEfficiency;
        
        if (pitchDiff <= 5) {
            pitchEfficiency = 100;
        } else if (pitchDiff <= 15) {
            pitchEfficiency = 100 - (pitchDiff - 5) * 1;
        } else {
            pitchEfficiency = Math.max(70, 90 - (pitchDiff - 15) * 0.5);
        }

        const combined = (azimuthEfficiency * 0.75 + pitchEfficiency * 0.25);
        return Math.round(combined);
    }

    getSuitability(efficiency) {
        if (efficiency >= 85) return 'Excellent';
        if (efficiency >= 70) return 'Very Good';
        if (efficiency >= 55) return 'Good';
        if (efficiency >= 40) return 'Fair';
        return 'Poor';
    }

    getEfficiencyColor(efficiency) {
        if (efficiency >= 85) return '#00C853';
        if (efficiency >= 70) return '#64DD17';
        if (efficiency >= 55) return '#FFD600';
        if (efficiency >= 40) return '#FF9100';
        return '#FF3D00';
    }

    getSegmentRecommendation(segment) {
        const { direction, efficiency } = segment;

        if (efficiency >= 85) {
            return `Excellent choice! This ${direction}-facing roof provides maximum solar production. Prioritize panel placement here for best ROI.`;
        } else if (efficiency >= 70) {
            return `Very good option. This ${direction}-facing section will provide strong energy production year-round.`;
        } else if (efficiency >= 55) {
            return `Usable but not optimal. Consider this ${direction}-facing section only if primary areas are at capacity.`;
        } else if (efficiency >= 40) {
            return `Marginal performance. Only use this ${direction}-facing area if absolutely necessary for system size requirements.`;
        } else {
            return `Not recommended. This ${direction}-facing section receives insufficient sun exposure for cost-effective solar installation.`;
        }
    }

    generateRecommendations(segments, address) {
        const sorted = [...segments].sort((a, b) => b.efficiency - a.efficiency);
        
        const bestSegment = sorted[0];
        const worstSegment = sorted[sorted.length - 1];
        
        const excellent = sorted.filter(s => s.suitability === 'Excellent');
        const veryGood = sorted.filter(s => s.suitability === 'Very Good');
        const usable = sorted.filter(s => s.efficiency >= 55);

        return {
            primaryRecommendation: this.generatePrimaryRecommendation(bestSegment),
            avoidRecommendation: worstSegment.efficiency < 50 
                ? `Avoid placing panels on the ${worstSegment.direction}-facing section (${worstSegment.areaSqFt} sq ft available). It only achieves ${worstSegment.efficiency}% efficiency due to its ${worstSegment.direction} orientation, which would significantly reduce your ROI.`
                : null,
            
            summary: {
                totalSegments: segments.length,
                excellentSegments: excellent.length,
                veryGoodSegments: veryGood.length,
                usableSegments: usable.length,
                totalUsableArea: usable.reduce((sum, s) => sum + s.areaSqFt, 0),
                maxPanelCapacity: usable.reduce((sum, s) => sum + s.panelCapacity, 0)
            },

            optimalConfiguration: this.designOptimalConfiguration(sorted),
            
            detailedAnalysis: sorted.map(segment => ({
                segmentId: segment.id,
                name: segment.name,
                direction: segment.direction,
                efficiency: segment.efficiency,
                suitability: segment.suitability,
                recommendation: segment.recommendation
            }))
        };
    }

    generatePrimaryRecommendation(bestSegment) {
        return `The ${bestSegment.direction}-facing roof segment is your best option, achieving ${bestSegment.efficiency}% efficiency with ${bestSegment.sunshineHours.toLocaleString()} annual sunshine hours. This ${bestSegment.areaSqFt} sq ft section can accommodate approximately ${bestSegment.panelCapacity} solar panels (${bestSegment.panelCapacity * 0.4} kW system).`;
    }

    designOptimalConfiguration(sortedSegments) {
        const usableSegments = sortedSegments.filter(s => s.efficiency >= 55);
        
        if (usableSegments.length === 0) {
            return {
                recommendation: 'Unfortunately, this property may not be suitable for solar installation due to poor roof orientation.',
                segments: []
            };
        }

        const totalCapacity = usableSegments.reduce((sum, s) => sum + s.panelCapacity, 0);
        const totalArea = usableSegments.reduce((sum, s) => sum + s.areaSqFt, 0);

        return {
            recommendation: usableSegments.length === 1
                ? `Install all panels on the ${usableSegments[0].direction}-facing roof for optimal performance.`
                : `For best results, prioritize the ${usableSegments[0].direction}-facing roof, then expand to ${usableSegments[1].direction}-facing section if additional capacity is needed.`,
            
            totalPanelCapacity: totalCapacity,
            estimatedSystemSize: Math.round(totalCapacity * 0.4 * 10) / 10,
            totalUsableArea: totalArea,
            
            segments: usableSegments.map(s => ({
                name: s.name,
                direction: s.direction,
                efficiency: s.efficiency,
                panelCapacity: s.panelCapacity,
                estimatedKW: Math.round(s.panelCapacity * 0.4 * 10) / 10,
                priority: s.efficiency >= 85 ? 'Primary' : s.efficiency >= 70 ? 'Secondary' : 'Tertiary'
            }))
        };
    }
}

module.exports = RoofAnalyzer;