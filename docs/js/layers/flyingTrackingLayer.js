import { baseUrl } from '../config.js';

export const flyingTrackingLayer = {
    id: 'flying-tracking',
    source: 'flying-tracking-source',
    type: 'line',
    layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': 'none'
    },
    paint: {
        'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0, '#E29B05',    // Dark blue at origin
            0.5, '#CBDDED',  // Medium blue in middle
            1, '#004185'     // Light blue at destination
        ],
        'line-width': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0, 1.2,   
            0.5, 0.8, 
            1, 1.2    
        ],
        'line-opacity': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0, 0.8,    // More transparent at origin
            0.5, 0.3,  // Medium opacity in middle
            1, 0.8     // More opaque at destination
        ]
    }
};

// Store original data for filtering
let originalFlightData = null;

// Function to filter flight tracks by destination concert
export function filterFlightTracksByConcert(map, concertId) {
    if (!originalFlightData) {
        console.warn('No original flight data available for filtering');
        return;
    }

    const source = map.getSource('flying-tracking-source');
    if (!source) {
        console.warn('Flight tracking source not found');
        return;
    }

    // Use the concert ID directly as the flight destination city ID
    const flightCityId = concertId;
    
    // Filter flight tracks to only show those going to the selected concert
    const filteredFeatures = originalFlightData.features.filter(feature => {
        return feature.properties.destination.cityId === flightCityId;
    });

    const filteredData = {
        type: 'FeatureCollection',
        features: filteredFeatures
    };

    // Update the source with filtered data
    source.setData(filteredData);
}

// Function to reset flight tracks to show all
export function resetFlightTracks(map) {
    if (!originalFlightData) {
        console.warn('No original flight data available for reset');
        return;
    }

    const source = map.getSource('flying-tracking-source');
    if (!source) {
        console.warn('Flight tracking source not found');
        return;
    }

    // Reset to show all flight tracks
    source.setData(originalFlightData);
}

// Make resetFlightTracks available globally
window.resetFlightTracks = resetFlightTracks;

// Function to show flight tracking layer
export function showFlightTrackingLayer(map) {
    if (map.getLayer('flying-tracking')) {
        map.setLayoutProperty('flying-tracking', 'visibility', 'visible');
    }
}

// Function to hide flight tracking layer
export function hideFlightTrackingLayer(map) {
    if (map.getLayer('flying-tracking')) {
        map.setLayoutProperty('flying-tracking', 'visibility', 'none');
    }
}

// Function to load and process flying tracking data
export async function loadFlyingTrackingData(map) {
    try {
        const response = await fetch('data/flying_tracking.geojson');
        const geoJsonData = await response.json();
        
        if (!geoJsonData || !geoJsonData.features.length) {
            console.warn('No flying tracking data available');
            return;
        }

        // Create curved paths for each feature using shortest distance
        geoJsonData.features.forEach(feature => {
            const [oLng, oLat] = feature.properties.origin.coordinates;
            const [dLng, dLat] = feature.properties.destination.coordinates;
            
            const curvedPath = createCurvedPath([oLat, oLng], [dLat, dLng]);
            feature.geometry.coordinates = curvedPath;
        });

        // Add source to map
        if (map.getSource('flying-tracking-source')) {
            map.getSource('flying-tracking-source').setData(geoJsonData);
        } else {
            map.addSource('flying-tracking-source', {
                type: 'geojson',
                data: geoJsonData,
                lineMetrics: true
            });
        }

        // Add layer if it doesn't exist
        if (!map.getLayer('flying-tracking')) {
            map.addLayer(flyingTrackingLayer);
        }

        // Store original data for filtering
        originalFlightData = geoJsonData;
        
    } catch (error) {
        console.error('Error loading flying tracking data:', error);
    }
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Function to create animated flight paths (for future enhancement)
export function createAnimatedFlightPaths(map) {
    const source = map.getSource('flying-tracking-source');
    if (!source) return;

    const data = source._data;
    if (!data || !data.features) return;

    // Create animated flight paths with arcs
    const animatedFeatures = data.features.map(feature => {
        const [oLat, oLng] = feature.properties.origin.coordinates;
        const [dLat, dLng] = feature.properties.destination.coordinates;
        
        // Create a curved path with more points using shortest distance
        const path = createCurvedPath([oLat, oLng], [dLat, dLng]);
        
        return {
            ...feature,
            geometry: {
                type: 'LineString',
                coordinates: path
            }
        };
    });

    const animatedData = {
        type: 'FeatureCollection',
        features: animatedFeatures
    };

    source.setData(animatedData);
}

// Create a curved flight path using shortest distance
function createCurvedPath(origin, destination, steps = 20) {
    const path = [];
    const [oLat, oLng] = origin;
    const [dLat, dLng] = destination;
    
    // Calculate shortest distance path
    const shortestPath = calculateShortestPath([oLng, oLat], [dLng, dLat]);
    const [shortestDestLng] = shortestPath[1];
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        
        // Linear interpolation using shortest path coordinates
        const lat = oLat + (dLat - oLat) * t;
        const lng = oLng + (shortestDestLng - oLng) * t;
        
        // Add arc (parabolic curve)
        const arcHeight = 0.05; // Adjust for arc height
        const arcOffset = Math.sin(Math.PI * t) * arcHeight;
        const arcLat = lat + arcOffset;
        
        path.push([lng, arcLat]);
    }
    
    return path;
}

// Calculate the shortest path between two points considering the Earth's curvature
function calculateShortestPath(origin, destination) {
    const [oLng, oLat] = origin;
    const [dLng, dLat] = destination;
    
    // Calculate the difference in longitude
    let lngDiff = dLng - oLng;
    
    // Handle cases where the path crosses the 180/-180 meridian
    if (lngDiff > 180) {
        lngDiff -= 360;
    } else if (lngDiff < -180) {
        lngDiff += 360;
    }
    
    // If the absolute longitude difference is greater than 180 degrees,
    // the shorter path goes the other way around the globe
    if (Math.abs(lngDiff) > 180) {
        // Take the longer route but in the opposite direction
        if (lngDiff > 0) {
            lngDiff -= 360;
        } else {
            lngDiff += 360;
        }
    }
    
    // Calculate the destination longitude for the shortest path
    const shortestDestLng = oLng + lngDiff;
    
    return [
        [oLng, oLat],
        [shortestDestLng, dLat]
    ];
} 