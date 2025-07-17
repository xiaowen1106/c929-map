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
        'icon-size': 0.018,
        'icon-rotate': 180,
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
        return cityMarkersData;
    } catch (error) {
        console.error('Error loading city markers GeoJSON:', error);
        return {
            type: 'FeatureCollection',
            features: []
        };
    }
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
            zoom: 8, // Set a reasonable zoom level for city view
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

// Global variables for fans activities navigation
let currentActivityPopup = null;
let currentActivityFakeId = null;
let isNavigating = false; // Flag to prevent reset during navigation
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
        'icon-size': 0.015,
        'icon-rotate': 180,
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

// Function to highlight a specific activity
export function highlightActivity(fakeId) {
    highlightedActivityId = fakeId;
    if (window.map && window.map.getSource('fans-activities-source')) {
        const source = window.map.getSource('fans-activities-source');
        const currentData = source._data;
        const updatedFeatures = currentData.features.map(feature => ({
            ...feature,
            properties: {
                ...feature.properties,
                highlighted: feature.properties.fakeId == fakeId
            }
        }));
        source.setData({
            type: 'FeatureCollection',
            features: updatedFeatures
        });
    }
}

// Function to clear activity highlighting
export function clearActivityHighlight() {
    highlightedActivityId = null;
    if (window.map && window.map.getSource('fans-activities-source')) {
        const source = window.map.getSource('fans-activities-source');
        const currentData = source._data;
        const updatedFeatures = currentData.features.map(feature => ({
            ...feature,
            properties: {
                ...feature.properties,
                highlighted: false
            }
        }));
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

// Helper function to truncate text and add expand functionality
function createExpandableDescription(description, maxLength = 150) {
    if (!description || description.length <= maxLength) {
        return description ? `<p class="activity-description">${escapeHtml(description).replace(/\n/g, '<br>')}</p>` : '';
    }
    
    const truncatedText = description.substring(0, maxLength) + '...';
    const fullText = description;
    
    return `
        <div class="description-container">
            <p class="activity-description truncated" data-full-text="${escapeHtml(fullText)}">${escapeHtml(truncatedText).replace(/\n/g, '<br>')}</p>
            <button class="expand-button" onclick="toggleActivityDescription(this)">Show more</button>
        </div>
    `;
}

// Global function to toggle activity description expansion
window.toggleActivityDescription = function(button) {
    const descriptionText = button.previousElementSibling;
    const isExpanded = descriptionText.classList.contains('expanded');
    
    if (isExpanded) {
        // Collapse
        const fullText = descriptionText.getAttribute('data-full-text');
        const truncatedText = fullText.substring(0, 150) + '...';
        descriptionText.innerHTML = escapeHtml(truncatedText).replace(/\n/g, '<br>');
        descriptionText.classList.remove('expanded');
        descriptionText.classList.add('truncated');
        button.textContent = 'Show more';
    } else {
        // Expand
        const fullText = descriptionText.getAttribute('data-full-text');
        descriptionText.innerHTML = escapeHtml(fullText).replace(/\n/g, '<br>');
        descriptionText.classList.remove('truncated');
        descriptionText.classList.add('expanded');
        button.textContent = 'Show less';
    }
};

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        // Parse the date string and extract year, month, day to avoid timezone conversion
        const date = new Date(dateString);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        
        // Create a new date object using local time to avoid timezone shift
        const localDate = new Date(year, month, day);
        
        return localDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// Helper function to create media links HTML
function createMediaLinks(activity) {
    const links = [];
    
    // Check for YouTube or Bilibili URLs
    if (activity.properties.youtube_url && activity.properties.youtube_url !== 'N/A' && activity.properties.youtube_url !== '') {
        links.push(`<a href="${activity.properties.youtube_url}" target="_blank" class="media-link video-link">📹 YouTube</a>`);
    }
    
    if (activity.properties.bilibili_url && activity.properties.bilibili_url !== 'N/A' && activity.properties.bilibili_url !== '') {
        links.push(`<a href="${activity.properties.bilibili_url}" target="_blank" class="media-link video-link">📹 Bilibili</a>`);
    }
    
    const photos = [
        activity.properties.photo2,
        activity.properties.photo3,
        activity.properties.photo4,
        activity.properties.photo5
    ].filter(photo => photo && photo !== 'N/A' && photo !== '');
    
    if (photos.length > 0) {
        links.push(`<a href="${photos[0]}" target="_blank" class="media-link photo-link">📷 Photos (${photos.length})</a>`);
    }
    
    return links.length > 0 ? `<div class="media-links">${links.join(' ')}</div>` : '';
}

// Popup function for fans activities - accepts fakeId
export function showFansActivityPopup(fakeId, coordinates) {
    const activity = findActivityByFakeId(fakeId);
    if (!activity) {
        console.error('Activity not found with fakeId:', fakeId);
        return;
    }
    
    const activityIndex = findActivityIndexByFakeId(fakeId);
    currentActivityFakeId = fakeId;
    
    // Highlight the selected activity
    highlightActivity(fakeId);

    // Check if the fans activities panel is already open
    const isPanelOpen = document.querySelector('#fans-activities-panel')?.classList.contains('active');
    
    // If panel is open, filter it to show only activities from the same city
    if (isPanelOpen && activity.properties.city) {
        if (window.setActivityCityFilter) {
            window.setActivityCityFilter(activity.properties.city);
        }
        // Also set the current activity index to highlight the selected activity
        if (window.setCurrentActivityIndex) {
            window.setCurrentActivityIndex(fakeId);
        }
    }

    // Group name (customize as needed, or use a property if available)
    const groupName = activity.properties.city;
    // Activity name/date
    const activityTitle = escapeHtml(activity.properties.displayName || '活动名称');
    const activityDate = formatDate(activity.properties.timestamp) || '日期';

    // Video or photo content
    let mediaContent = '';
    const hasVideo = (activity.properties.youtube_url && activity.properties.youtube_url !== 'N/A' && activity.properties.youtube_url !== '') || 
                    (activity.properties.bilibili_url && activity.properties.bilibili_url !== 'N/A' && activity.properties.bilibili_url !== '');
    
    if (hasVideo) {
        // Create video object structure for location-based selection
        const videoObject = {
            youtube_url: activity.properties.youtube_url,
            bilibili_url: activity.properties.bilibili_url
        };
        
        // Use createVideoCoverFromObject with location-based URL selection
        const videoCover = createVideoCoverFromObject(videoObject);
        if (videoCover) {
            mediaContent = videoCover;
        }
    }
    
    // If no video, use the photo
    if (!mediaContent && activity.properties.photo_names && activity.properties.photo_names !== 'N/A' && activity.properties.photo_names !== '') {
        mediaContent = createPhotoElement(`img/activities/${activity.properties.photo_names}`, 'Activity Photo', 'activity-photo');
    }

    // Menu icon or close button based on screen size
    const isMobile = window.innerWidth <= 768;
    let actionButton;
    
    if (isMobile) {
        // Create close button for mobile
        actionButton = `<button class="close-btn" onclick="closeActivityPopup()" title="Close popup">×</button>`;
    } else {
        // Create menu icon for desktop
        actionButton = `<button class="menu-icon" onclick="openFansActivitiesPanel()" title="View all activities"><span></span><span></span><span></span></button>`;
    }

    // Navigation arrows (outside main content) - no disabled state due to circular navigation
    const leftArrow = `<button class="activity-nav-arrow left" onclick="navigateToPreviousActivity()" title="Previous activity">‹</button>`;
    const rightArrow = `<button class="activity-nav-arrow right" onclick="navigateToNextActivity()" title="Next activity">›</button>`;

    const popupContent = `
        <div class="popup-card custom-activity-popup">
            <div class="activity-popup-header">
            </div>
            <div class="activity-popup-main">
                ${leftArrow}
                <div class="activity-content-container">
                    <div class="activity-content-header">
                        <div class="activity-content-text">
                            <div class="activity-content-title">${groupName}</div>
                            <div class="activity-content-subtitle">${activityTitle} / ${activityDate}</div>
                        </div>
                        ${actionButton}
                    </div>
                    <div class="activity-content-separator"></div>
                    <div class="activity-content-body">
                        <div class="activity-media-container">
                            ${mediaContent}
                        </div>
                    </div>
                </div>
                ${rightArrow}
            </div>
        </div>
    `;
    


    // Remove existing popup if any
    if (currentActivityPopup) {
        isNavigating = true;
        currentActivityPopup.remove();
        currentActivityPopup = null;
        isNavigating = false;
    }

    // Create new popup
    currentActivityPopup = new mapboxgl.Popup({
        maxWidth: '500px',
        closeButton: false,
        closeOnClick: true
    })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(window.map);

    // Add event listener for popup close to reset highlighting
    currentActivityPopup.on('close', () => {
        if (!isNavigating) {
            resetActivityHighlighting();
        }
    });
}

// Make functions globally available
window.showFansActivityPopup = showFansActivityPopup;
window.highlightActivity = highlightActivity;
window.clearActivityHighlight = clearActivityHighlight;
window.getHighlightedActivity = getHighlightedActivity;

// Test function for highlighting (can be called from browser console)
window.testHighlighting = function() {
    // Get the first activity from the data manager
    const activities = dataManager.getData();
    if (activities && activities.length > 0) {
        const firstActivity = activities[0];
        const fakeId = firstActivity.properties.fakeId;
        highlightActivity(fakeId);
        
        // Clear highlight after 3 seconds
        setTimeout(() => {
            clearActivityHighlight();
        }, 3000);
    }
};

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

// Get current popup state
export function getCurrentActivityPopup() {
    return currentActivityPopup;
}

export function getCurrentActivityIndex() {
    return currentActivityFakeId ? findActivityIndexByFakeId(currentActivityFakeId) : -1;
}

export function getCurrentActivityFakeId() {
    return currentActivityFakeId;
}

// Reset popup state when popup is closed
export function resetActivityHighlighting() {
    currentActivityPopup = null;
    currentActivityFakeId = null;
    clearActivityHighlight();
}

// Global function to open fans activities panel
window.openFansActivitiesPanel = function() {
    if (window.showFansActivitiesPanel) {
        // Get the city from the current activity
        let city = null;
        let fakeId = null;
        
        if (currentActivityFakeId) {
            const activity = findActivityByFakeId(currentActivityFakeId);
            if (activity) {
                city = activity.properties.city;
                fakeId = currentActivityFakeId;
            }
        }
        
        // Pass both city and fakeId to the panel
        // Ensure we pass the current activity's fakeId to properly highlight it
        window.showFansActivitiesPanel(city, fakeId);
    }
};

// Global function to close activity popup
window.closeActivityPopup = function() {
    if (currentActivityPopup) {
        currentActivityPopup.remove();
        resetActivityHighlighting();
    }
};

// Navigation functions
window.navigateToPreviousActivity = function() {
    if (!currentActivityFakeId) {
        return;
    }
    
    const currentIndex = findActivityIndexByFakeId(currentActivityFakeId);
    const totalActivities = dataManager.getCount();
    
    // Calculate new index with circular navigation
    let newIndex;
    if (currentIndex <= 0) {
        // If at the beginning, go to the end
        newIndex = totalActivities - 1;
    } else {
        newIndex = currentIndex - 1;
    }
    
    const activity = dataManager.getData()[newIndex];
    
    if (activity && activity.geometry && activity.geometry.coordinates) {
        const coordinates = activity.geometry.coordinates;
        
        // Check if the fans activities panel is already open and filter it
        const isPanelOpen = document.querySelector('#fans-activities-panel')?.classList.contains('active');
        if (isPanelOpen && activity.properties.city) {
            if (window.setActivityCityFilter) {
                window.setActivityCityFilter(activity.properties.city);
            }
        }
        
        // Get current zoom level and ensure we don't zoom out
        const currentZoom = window.map.getZoom();
        const targetZoom = Math.max(currentZoom, 6);
        
        // Prepare flyTo options
        const flyToOptions = {
            center: coordinates,
            zoom: targetZoom,
            duration: 1000
        };
        
        // On mobile, center the point in the top 70% of the screen (accounting for 30% bottom sheet)
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            const mapContainer = window.map.getContainer();
            const mapHeight = mapContainer.offsetHeight;
            const mapCenterY = mapHeight * 0.35; // Center of the top 70% area (35% from top edge)
            
            flyToOptions.offset = [0, mapCenterY - mapHeight / 2]; // Offset to center in the top 70%
        }
        
        // Fly to the location with zoom
        window.map.flyTo(flyToOptions);
        
        // Update the popup with the previous activity using fakeId
        showFansActivityPopup(activity.properties.fakeId, coordinates);
        
        // Update panel if it's open
        if (window.setCurrentActivityIndex) {
            window.setCurrentActivityIndex(activity.properties.fakeId);
        }
    }
};

window.navigateToNextActivity = function() {
    if (!currentActivityFakeId) {
        return;
    }
    
    const currentIndex = findActivityIndexByFakeId(currentActivityFakeId);
    const totalActivities = dataManager.getCount();
    
    // Calculate new index with circular navigation
    let newIndex;
    if (currentIndex >= totalActivities - 1) {
        // If at the end, go to the beginning
        newIndex = 0;
    } else {
        newIndex = currentIndex + 1;
    }
    
    const activity = dataManager.getData()[newIndex];
    
    if (activity && activity.geometry && activity.geometry.coordinates) {
        const coordinates = activity.geometry.coordinates;
        
        // Check if the fans activities panel is already open and filter it
        const isPanelOpen = document.querySelector('#fans-activities-panel')?.classList.contains('active');
        if (isPanelOpen && activity.properties.city) {
            if (window.setActivityCityFilter) {
                window.setActivityCityFilter(activity.properties.city);
            }
        }
        
        // Get current zoom level and ensure we don't zoom out
        const currentZoom = window.map.getZoom();
        const targetZoom = Math.max(currentZoom, 6);
        
        // Prepare flyTo options
        const flyToOptions = {
            center: coordinates,
            zoom: targetZoom,
            duration: 1000
        };
        
        // On mobile, center the point in the top 70% of the screen (accounting for 30% bottom sheet)
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            const mapContainer = window.map.getContainer();
            const mapHeight = mapContainer.offsetHeight;
            const mapCenterY = mapHeight * 0.35; // Center of the top 70% area (35% from top edge)
            
            flyToOptions.offset = [0, mapCenterY - mapHeight / 2]; // Offset to center in the top 70%
        }
        
        // Fly to the location with zoom
        window.map.flyTo(flyToOptions);
        
        // Update the popup with the next activity using fakeId
        showFansActivityPopup(activity.properties.fakeId, coordinates);
        
        // Update panel if it's open
        if (window.setCurrentActivityIndex) {
            window.setCurrentActivityIndex(activity.properties.fakeId);
        }
    }
};

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

// Cleanup function for memory management
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
    
    // Clear any remaining popup
    if (currentActivityPopup) {
        currentActivityPopup.remove();
        currentActivityPopup = null;
    }
    
    // Clear highlighting
    clearActivityHighlight();
    
    // Cleanup panel
    cleanupPanel();
}

// Function to log memory usage (for debugging)
export function logMemoryUsage() {
    const usage = dataManager.getMemoryUsage();
    return usage;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanup();
}); 