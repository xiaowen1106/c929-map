import { baseUrl } from '../config.js';
import { createVideoCoverFromObject, createPhotoElement } from '../utils/mediaUtils.js';
import { cleanup as cleanupPanel } from '../panels/fansActivitiesPanel.js';

// City markers data will be loaded from GeoJSON file
let cityMarkersData = null;

// Convert city markers data to GeoJSON format
function createCityMarkersGeoJSON() {
    if (!cityMarkersData) {
        return {
            type: 'FeatureCollection',
            features: []
        };
    }
    
    // If data is already in GeoJSON format, return it directly
    if (cityMarkersData.type === 'FeatureCollection') {
        return cityMarkersData;
    }
    
    // Convert from old format if needed
    const features = cityMarkersData.map((city, index) => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: city.iconCoords
        },
        properties: {
            name: city.name,
            flyToCoords: city.flyToCoords,
            index: index
        }
    }));

    return {
        type: 'FeatureCollection',
        features: features
    };
}

// City markers layer configuration
export const cityMarkersLayer = {
    id: 'city-markers',
    type: 'symbol',
    minzoom: 0, // Show from zoom level 0
    maxzoom: 6, // Only show before zoom level 6
    layout: {
        'icon-image': 'mijie-icon',
        'icon-size': 0.25, // Increased from 0.018 to compensate for smaller image (128px vs 2084px)
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': '',  // Remove text display
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': true
    },
    paint: {
        'icon-opacity': 1.0,
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1
    }
};

// Load city markers data
export async function loadCityMarkersData() {
    try {
        // Load from GeoJSON file
        const response = await fetch(`${baseUrl}/data/city_markers.geojson`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        cityMarkersData = await response.json();
        
        // Expose globally for reuse by other modules
        window.cityMarkersData = cityMarkersData;
        
        return cityMarkersData;
    } catch (error) {
        console.error('Error loading city markers GeoJSON:', error);
        return {
            type: 'FeatureCollection',
            features: []
        };
    }
}

// Function to get city markers data (for reuse by other modules)
export function getCityMarkersData() {
    return cityMarkersData;
}

// Handle click on city marker
export function handleCityMarkerClick(coordinates, properties) {
    if (!properties || !properties.flyToCoords) {
        console.error('Invalid city marker properties:', properties);
        return;
    }

    let flyToCoords = properties.flyToCoords;
    const cityName = properties.name;

    // Ensure flyToCoords is in the correct format
    if (Array.isArray(flyToCoords)) {
        // If it's already an array, use it directly
        flyToCoords = [flyToCoords[0], flyToCoords[1]];
    } else if (typeof flyToCoords === 'string') {
        // If it's a string, try to parse it as JSON
        try {
            flyToCoords = JSON.parse(flyToCoords);
        } catch (e) {
            console.error('Failed to parse flyToCoords string:', flyToCoords);
            return;
        }
    } else {
        console.error('flyToCoords is not an array or string:', flyToCoords);
        return;
    }

    // Fly to the target coordinates
    if (window.map) {
        window.map.flyTo({
            center: flyToCoords,
            zoom: 10, // Set a reasonable zoom level for city view
            duration: 1000, // 1 seconds animation
            easing: (t) => t // Linear easing
        });
    }
}

// Make the click handler globally available
window.handleCityMarkerClick = handleCityMarkerClick;

// Data manager for fans activities to avoid memory duplication and improve performance
class FansActivitiesDataManager {
    constructor() {
        this.data = null;
        this.indexMap = new Map(); // fakeId -> index mapping for O(1) lookups
        this.spatialMap = new Map(); // spatial index for location-based queries
    }
    
    setData(features) {
        this.data = features;
        this.buildIndexes();
    }
    
    getData() {
        return this.data;
    }
    
    // Build indexes for efficient lookups
    buildIndexes() {
        this.indexMap.clear();
        this.spatialMap.clear();
        
        if (!this.data) return;
        
        this.data.forEach((feature, index) => {
            // Build fakeId index
            const fakeId = feature.properties.fakeId;
            if (fakeId !== undefined) {
                this.indexMap.set(fakeId, index);
            }
            
            // Build spatial index (round to 3 decimal places for ~100m precision)
            if (feature.geometry && feature.geometry.coordinates) {
                const [lng, lat] = feature.geometry.coordinates;
                const spatialKey = `${Math.round(lng * 1000)},${Math.round(lat * 1000)}`;
                
                if (!this.spatialMap.has(spatialKey)) {
                    this.spatialMap.set(spatialKey, []);
                }
                this.spatialMap.get(spatialKey).push(feature);
            }
        });
    }
    
    // O(1) lookup by fakeId
    findById(fakeId) {
        // Try both string and number versions of the fakeId
        let index = this.indexMap.get(fakeId);
        if (index === undefined) {
            // Try converting to number if it's a string
            if (typeof fakeId === 'string') {
                const numericFakeId = parseInt(fakeId, 10);
                index = this.indexMap.get(numericFakeId);
            } else if (typeof fakeId === 'number') {
                // Try converting to string if it's a number
                const stringFakeId = fakeId.toString();
                index = this.indexMap.get(stringFakeId);
            }
        }
        
        return index !== undefined ? this.data[index] : null;
    }
    
    // O(1) lookup by fakeId returning index
    findIndexById(fakeId) {
        // Try both string and number versions of the fakeId
        let index = this.indexMap.get(fakeId);
        if (index === undefined) {
            // Try converting to number if it's a string
            if (typeof fakeId === 'string') {
                const numericFakeId = parseInt(fakeId, 10);
                index = this.indexMap.get(numericFakeId);
            } else if (typeof fakeId === 'number') {
                // Try converting to string if it's a number
                const stringFakeId = fakeId.toString();
                index = this.indexMap.get(stringFakeId);
            }
        }
        
        return index;
    }
    
    // Get activities at specific location efficiently
    getActivitiesAtLocation(coordinates, tolerance = 0.001) {
        const [lng, lat] = coordinates;
        const spatialKey = `${Math.round(lng * 1000)},${Math.round(lat * 1000)}`;
        const nearbyFeatures = this.spatialMap.get(spatialKey) || [];
        
        return nearbyFeatures.filter(activity => {
            const latDiff = Math.abs(activity.geometry.coordinates[1] - lat);
            const lngDiff = Math.abs(activity.geometry.coordinates[0] - lng);
            return latDiff < tolerance && lngDiff < tolerance;
        });
    }
    
    // Get all activities
    getAllActivities() {
        return this.data || [];
    }
    
    // Get total count
    getCount() {
        return this.data ? this.data.length : 0;
    }
    
    // Estimate memory usage
    getMemoryUsage() {
        if (!this.data) return 0;
        
        // Rough estimation: each activity object ~1-2KB
        const dataSize = this.data.length * 1500; // 1.5KB per activity
        const indexSize = this.indexMap.size * 20; // ~20 bytes per index entry
        const spatialSize = this.spatialMap.size * 50; // ~50 bytes per spatial entry
        
        return {
            dataSize,
            indexSize,
            spatialSize,
            total: dataSize + indexSize + spatialSize,
            activities: this.data.length
        };
    }
    
    // Cleanup memory
    cleanup() {
        this.data = null;
        this.indexMap.clear();
        this.spatialMap.clear();
    }
}

// Global variables for fans activities
let currentActivityFakeId = null;
let highlightedActivityId = null; // Track currently highlighted activity

// Create data manager instance
const dataManager = new FansActivitiesDataManager();

// Make data manager globally accessible for consistency
window.dataManager = dataManager;

// Function to escape HTML special characters
function escapeHtml(text) {
    if (!text) return text;
    // First decode any existing HTML entities to get the raw text
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const decodedText = textarea.value;
    
    // Then escape the decoded text properly
    const div = document.createElement('div');
    div.textContent = decodedText;
    return div.innerHTML;
}

// Fill layer for state/province coloring
export const fansActivitiesFillLayer = {
    id: 'fans-activities-fill',
    type: 'fill',
    layout: {
        visibility: 'visible'
    },
    paint: {
        'fill-color': [
            'case',
            // Check if it's a US state (has STATE_NAME property) or Canadian province (has Name_EN property)
            ['any', ['has', 'STATE_NAME'], ['has', 'Name_EN']],
            [
                'interpolate',
                ['linear'],
                ['get', 'count'],
                5, '#eff3ff',    // Very light blue for 0-10 activities
                10, '#bdd7e7',   // Light blue for 10-25 activities
                25, '#6baed6',   // Medium light blue for 25-50 activities
                50, '#3182bd',   // Medium blue for 50-100 activities
                100, '#08519c',  // Dark blue for 100+ activities
            ],
            // Default transparent for any unmatched features
            'rgba(0,0,0,0)'
        ],
        'fill-opacity': 0.5,
        'fill-outline-color': '#1976D2'
    }
};

// Symbol layer for MiJie icons with dynamic icon selection
export const fansActivitiesLayer = {
    id: 'fans-activities',
    type: 'symbol',
    minzoom: 6, // Only show fans activities at zoom level 6 and above
    maxzoom: 24,
    layout: {
        'icon-image': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            'mijie-highlight-icon',
            'mijie-icon'
        ],
        'icon-size': 0.2, // Increased from 0.015 to compensate for smaller image (128px vs 2084px)
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': '',  // Remove text display
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': true
    },
    paint: {
        'icon-opacity': 1.0,
        'icon-opacity-transition': { duration: 300 },
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1
    }
};

// Memory optimization: Enhanced highlighting with minimal data updates
export function highlightActivity(fakeId) {
    if (highlightedActivityId === fakeId) {
        return; // No change needed
    }
    
    highlightedActivityId = fakeId;
    if (window.map && window.map.getSource('fans-activities-source')) {
        const source = window.map.getSource('fans-activities-source');
        const currentData = source._data;
        
        // Only update features that actually need to change
        const updatedFeatures = currentData.features.map(feature => {
            const shouldHighlight = feature.properties.fakeId == fakeId;
            const wasHighlighted = feature.properties.highlighted;
            
            if (shouldHighlight === wasHighlighted) {
                return feature; // No change needed
            }
            
            return {
                ...feature,
                properties: {
                    ...feature.properties,
                    highlighted: shouldHighlight
                }
            };
        });
        
        source.setData({
            type: 'FeatureCollection',
            features: updatedFeatures
        });
    }
}

// Memory optimization: Enhanced clear highlighting
export function clearActivityHighlight() {
    if (highlightedActivityId === null) {
        return; // No change needed
    }
    
    highlightedActivityId = null;
    if (window.map && window.map.getSource('fans-activities-source')) {
        const source = window.map.getSource('fans-activities-source');
        const currentData = source._data;
        
        // Only update features that are currently highlighted
        const updatedFeatures = currentData.features.map(feature => {
            if (!feature.properties.highlighted) {
                return feature; // No change needed
            }
            
            return {
                ...feature,
                properties: {
                    ...feature.properties,
                    highlighted: false
                }
            };
        });
        
        source.setData({
            type: 'FeatureCollection',
            features: updatedFeatures
        });
    }
}

// Function to get currently highlighted activity
export function getHighlightedActivity() {
    return highlightedActivityId;
}

// Function to process fans activities data
function processFansActivitiesData(features) {
    // Store the data globally for reference
    dataManager.setData(features);
    return features;
}

// Helper function to find activity index by fakeId
function findActivityIndexByFakeId(fakeId) {
    return dataManager.findIndexById(fakeId);
}

// Helper function to find activity by fakeId
function findActivityByFakeId(fakeId) {
    return dataManager.findById(fakeId);
}

// Function to handle fans activity click - opens panel instead of popup
export function handleFansActivityClick(fakeId, coordinates) {
    const activity = findActivityByFakeId(fakeId);
    if (!activity) {
        console.error('Activity not found with fakeId:', fakeId);
        return;
    }
    
    currentActivityFakeId = fakeId;
    
    // Highlight the selected activity
    highlightActivity(fakeId);

    // Open the fans activities panel with the selected activity
    if (window.showFansActivitiesPanel) {
        const city = activity.properties.city;
        window.showFansActivitiesPanel(city, fakeId);
    }
}

// Set fans activities data
export function setFansActivitiesData(features) {
    // Add highlighted property to all features
    const featuresWithHighlight = features.map(feature => ({
        ...feature,
        properties: {
            ...feature.properties,
            highlighted: false
        }
    }));
    
    processFansActivitiesData(featuresWithHighlight);
    // Make it globally accessible (single reference to avoid duplication)
    window.allFansActivities = dataManager.getData();
}

// Get current activity fakeId
export function getCurrentActivityFakeId() {
    return currentActivityFakeId;
}

// Reset highlighting when panel is closed
export function resetActivityHighlighting() {
    currentActivityFakeId = null;
    clearActivityHighlight();
}

// Make functions globally available
window.highlightActivity = highlightActivity;
window.clearActivityHighlight = clearActivityHighlight;
window.getHighlightedActivity = getHighlightedActivity;
window.handleFansActivityClick = handleFansActivityClick;

// Load fans activities data from GeoJSON
export async function loadFansActivitiesData() {
    try {
        const response = await fetch(`${baseUrl}/data/fans_activities.geojson`);
        if (response.ok) {
            const data = await response.json();
            // Use data manager to store data efficiently
            setFansActivitiesData(data.features);
            return data.features;
        } else {
            throw new Error('Fans activities GeoJSON not found');
        }
    } catch (error) {
        console.error('Error loading fans activities GeoJSON:', error);
        return [];
    }
}

// Load fans activities fill data (states and provinces)
export async function loadFansActivitiesFillData(map) {
    try {
        // Fetch both US states and Canadian provinces data
        const [usStatesResponse, caProvincesResponse] = await Promise.all([
            fetch(`${baseUrl}/data/us_states.geojson`),
            fetch(`${baseUrl}/data/ca_provinces.geojson`)
        ]);
        
        const usStatesData = await usStatesResponse.json();
        const caProvincesData = await caProvincesResponse.json();
        
        // Combine both datasets directly since data is already prefiltered
        const combinedFeatures = [...usStatesData.features, ...caProvincesData.features];
        
        const combinedData = {
            type: 'FeatureCollection',
            features: combinedFeatures
        };

        // Add the source with combined data
        if (!map.getSource('fans-activities-fill-source')) {
            map.addSource('fans-activities-fill-source', {
                type: 'geojson',
                data: combinedData
            });
        } else {
            // Update existing source with combined data
            const source = map.getSource('fans-activities-fill-source');
            source.setData(combinedData);
        }

        // Add the fill layer
        if (!map.getLayer('fans-activities-fill')) {
            const layerConfig = {
                ...fansActivitiesFillLayer,
                source: 'fans-activities-fill-source'
            };
            
            map.addLayer(layerConfig);
        }


    } catch (error) {
        console.error('Error loading fans activities fill layer:', error);
    }
}

// Helper function to load MiJie icon
export function loadMiJieIcon(map) {
    return new Promise((resolve) => {
        map.loadImage(`${baseUrl}/img/MiJie.png`, (error, image) => {
            if (error) {
                console.error('Error loading MiJie icon:', error);
                resolve();
                return;
            }
            
            if (!map.hasImage('mijie-icon')) {
                map.addImage('mijie-icon', image);
            }
            resolve();
        });
    });
}

// Helper function to load MiJie highlight icon
export function loadMiJieHighlightIcon(map) {
    return new Promise((resolve) => {
        map.loadImage(`${baseUrl}/img/MiJie_Highlight.png`, (error, image) => {
            if (error) {
                console.error('Error loading MiJie highlight icon:', error);
                resolve();
                return;
            }
            
            if (!map.hasImage('mijie-highlight-icon')) {
                map.addImage('mijie-highlight-icon', image);
            }
            resolve();
        });
    });
}

// Helper function to load both MiJie icons (regular and highlight)
export function loadMiJieIcons(map) {
    return Promise.all([
        loadMiJieIcon(map),
        loadMiJieHighlightIcon(map)
    ]);
}

// Enhanced cleanup function for memory management
export function cleanup() {
    resetActivityHighlighting();
    dataManager.cleanup();
    
    // Clear global references
    if (window.allFansActivities) {
        delete window.allFansActivities;
    }
    if (window.fansActivitiesData) {
        delete window.fansActivitiesData;
    }
    
    // Clear highlighting
    clearActivityHighlight();
    
    // Cleanup panel
    cleanupPanel();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanup();
}); 