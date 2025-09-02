import { baseUrl } from '../config.js';
import { createPhotoElement } from '../utils/mediaUtils.js';

// Data manager for coco-checkin to avoid memory duplication
class CocoCheckinDataManager {
    constructor() {
        this.data = null;
        this.spatialMap = new Map();
    }
    
    setData(features) {
        this.data = features;
        this.buildSpatialIndex();
    }
    
    getData() {
        return this.data;
    }
    
    // Build spatial index for efficient nearby point lookup
    buildSpatialIndex() {
        this.spatialMap.clear();
        
        this.data.forEach(feature => {
            const [lng, lat] = feature.geometry.coordinates;
            // Round to 3 decimal places (~100m precision) for spatial grouping
            const key = `${Math.round(lng * 1000)},${Math.round(lat * 1000)}`;
            
            if (!this.spatialMap.has(key)) {
                this.spatialMap.set(key, []);
            }
            this.spatialMap.get(key).push(feature);
        });
    }
    
    // Get nearby count efficiently using spatial index
    getNearbyCount(feature) {
        const [lng, lat] = feature.geometry.coordinates;
        const key = `${Math.round(lng * 1000)},${Math.round(lat * 1000)}`;
        const nearbyFeatures = this.spatialMap.get(key) || [];
        
        // Count features within the same spatial cell (excluding self)
        return nearbyFeatures.length - 1;
    }
    
    // Process features with nearby_count using spatial indexing
    processFeaturesWithNearbyCount() {
        if (!this.data) return [];
        
        return this.data.map(feature => ({
            ...feature,
            properties: {
                ...feature.properties,
                nearby_count: this.getNearbyCount(feature)
            }
        }));
    }
    
    cleanup() {
        this.data = null;
        this.spatialMap.clear();
    }
}

// Global data manager instance
const dataManager = new CocoCheckinDataManager();

// Global variables for coco-checkin navigation
let currentPopup = null;
let currentCheckinId = null;
let isNavigating = false; // Flag to prevent reset during navigation

// Function to escape HTML special characters
function escapeHtml(text) {
    if (!text) return text;
    
    // Create a temporary element to decode HTML entities
    const temp = document.createElement('div');
    temp.innerHTML = text;
    const decodedText = temp.textContent || temp.innerText || '';
    
    // Create another element to escape the decoded text
    const div = document.createElement('div');
    div.textContent = decodedText;
    return div.innerHTML;
}

export const cocoCheckinLayer = {
    id: 'coco-checkin',
    type: 'symbol',
    layout: {
        'icon-image': 'heart-marker',
        'icon-size': [
            'case',
            ['has', 'point_count'],
            [
                'interpolate',
                ['linear'],
                ['get', 'point_count'],
                1, 0.4,    // 1 checkin: small heart
                3, 0.5,    // 3 checkins: slightly larger heart
                5, 0.6,    // 5 checkins: medium heart
                8, 0.8,    // 8+ checkins: larger heart
                10, 1.0    // 10+ checkins: largest heart
            ],
            0.4  // Default size for unclustered points
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': '',  // Remove text display
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': true
    },
    paint: {
        'icon-color': [
            'case',
            ['has', 'point_count'],
            [
                'step',
                ['get', 'point_count'],
                '#4CAF50',  // Default color for single points
                10, '#8BC34A',  // Light green for clusters with 10+ points
                50, '#CDDC39',  // Lime for clusters with 50+ points
                100, '#FFEB3B'  // Yellow for clusters with 100+ points
            ],
            '#4CAF50'  // Default color for unclustered points
        ],
        'icon-opacity': 1.0,
        'icon-opacity-transition': { duration: 300 },
        'icon-color-transition': { duration: 300 },
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1
    }
};

// Cluster layer for unclustered points
export const cocoCheckinUnclusteredLayer = {
    id: 'coco-checkin-unclustered',
    type: 'symbol',
    filter: ['!', ['has', 'point_count']],
    layout: {
        'icon-image': 'heart-marker',
        'icon-size': [
            'case',
            ['has', 'nearby_count'],
            [
                'interpolate',
                ['linear'],
                ['get', 'nearby_count'],
                1, 0.4,    // Single checkin
                2, 0.5,    // 2 nearby checkins
                3, 0.6,    // 3 nearby checkins
                4, 0.7     // 4+ nearby checkins
            ],
            0.4  // Default size for isolated points
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': '',  // No text for unclustered points
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': true
    },
    paint: {
        'icon-color': '#4CAF50',  // Consistent color for unclustered points
        'icon-opacity': 1.0,
        'icon-opacity-transition': { duration: 300 },
        'icon-color-transition': { duration: 300 },
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1
    }
};

// Helper function to find checkin index by id
function findCheckinIndexById(id) {
    const data = dataManager.getData();
    return data ? data.findIndex(checkin => checkin.properties.id === id) : -1;
}

// Helper function to find checkin by id
function findCheckinById(id) {
    const data = dataManager.getData();
    return data ? data.find(checkin => checkin.properties.id === id) : null;
}

// Popup function for coco-checkin - accepts id
export function showCocoCheckinPopup(id, coordinates) {
    const checkin = findCheckinById(id);
    if (!checkin) {
        console.error('Checkin not found with id:', id);
        return;
    }
    
    const checkinIndex = findCheckinIndexById(id);
    currentCheckinId = id;
    
    // Highlight the selected checkin
    highlightSelectedCheckin(id);
    
    // Set the current checkin index for the checkins panel
    if (window.setCurrentCheckinIndex) {
        window.setCurrentCheckinIndex(id);
    }

    // Location string
    const location = escapeHtml(checkin.properties.location_str || 'Unknown Location');
    
    // Username - decode HTML entities for proper display
    const rawUsername = checkin.properties.username || 'Anonymous';
    const temp = document.createElement('div');
    temp.innerHTML = rawUsername;
    const username = temp.textContent || temp.innerText || rawUsername;

    // Create popup content using DOM elements for better memory management
    const popupCard = document.createElement('div');
    popupCard.className = 'popup-card custom-coco-checkin-popup';
    
    const header = document.createElement('div');
    header.className = 'coco-checkin-popup-header';
    
    const main = document.createElement('div');
    main.className = 'coco-checkin-popup-main';
    
    // Navigation arrows
    const leftArrow = document.createElement('button');
    leftArrow.className = 'coco-checkin-nav-arrow left';
    leftArrow.title = 'Previous checkin';
    leftArrow.textContent = '‹';
    leftArrow.onclick = () => window.navigateToPreviousCheckin();
    
    const rightArrow = document.createElement('button');
    rightArrow.className = 'coco-checkin-nav-arrow right';
    rightArrow.title = 'Next checkin';
    rightArrow.textContent = '›';
    rightArrow.onclick = () => window.navigateToNextCheckin();
    
    // Content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'coco-checkin-content-container';
    
    // Content header
    const contentHeader = document.createElement('div');
    contentHeader.className = 'coco-checkin-content-header';
    
    const contentText = document.createElement('div');
    contentText.className = 'coco-checkin-content-text';
    
    const title = document.createElement('div');
    title.className = 'coco-checkin-content-title';
    title.textContent = username;
    
    const locationElement = document.createElement('div');
    locationElement.className = 'coco-checkin-content-location';
    locationElement.textContent = location;
    
    // Menu icon or close button based on screen size
    const isMobile = window.innerWidth <= 768;
    let actionButton;
    
    if (isMobile) {
        // Create close button for mobile
        actionButton = document.createElement('button');
        actionButton.className = 'close-btn';
        actionButton.title = 'Close popup';
        actionButton.textContent = '×';
        actionButton.onclick = () => window.closeCocoCheckinPopup();
    } else {
        // Create menu icon for desktop
        actionButton = document.createElement('button');
        actionButton.className = 'menu-icon';
        actionButton.title = 'View all checkins';
        actionButton.onclick = () => window.openCheckinsPanel();
        
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            actionButton.appendChild(span);
        }
    }
    
    const separator = document.createElement('div');
    separator.className = 'coco-checkin-content-separator';
    
    const imageContent = document.createElement('div');
    imageContent.className = 'coco-checkin-image-content';
    
    // Create image content using mediaUtils
    const imageContainer = document.createElement('div');
    imageContainer.innerHTML = createPhotoElement(
        checkin.properties.picture_url, 
        `Photo by ${username}`, 
        'coco-checkin-photo'
    );
    imageContent.appendChild(imageContainer);
    
    // Assemble the popup
    contentText.appendChild(title);
    contentText.appendChild(locationElement);
    contentHeader.appendChild(contentText);
    contentHeader.appendChild(actionButton);
    
    contentContainer.appendChild(contentHeader);
    contentContainer.appendChild(separator);
    contentContainer.appendChild(imageContent);
    
    main.appendChild(leftArrow);
    main.appendChild(contentContainer);
    main.appendChild(rightArrow);
    
    popupCard.appendChild(header);
    popupCard.appendChild(main);
    
    // Remove existing popup if any
    if (currentPopup) {
        isNavigating = true;
        currentPopup.remove();
        isNavigating = false;
    }
    
    // Create new popup
    currentPopup = new mapboxgl.Popup({
        maxWidth: '500px',
        closeButton: false,
        closeOnClick: true
    })
        .setLngLat(coordinates)
        .setDOMContent(popupCard)
        .addTo(window.map);
    
    // Add event listener for popup close to reset highlighting
    currentPopup.on('close', () => {
        if (!isNavigating) {
            resetHighlighting();
        }
    });
}

// Make showCocoCheckinPopup globally available
window.showCocoCheckinPopup = showCocoCheckinPopup;

// Make highlighting functions globally available
    window.highlightSelectedCheckin = highlightSelectedCheckin;
    window.resetCheckinHighlighting = resetCheckinHighlighting;

// Set coco-checkin data
export function setCocoCheckinData(features) {
    dataManager.setData(features);
    // Keep global access for backward compatibility (single source)
    window.allCocoCheckins = features;
}

// Get current popup state
export function getCurrentPopup() {
    return currentPopup;
}

export function getCurrentCheckinIndex() {
    return currentCheckinId ? findCheckinIndexById(currentCheckinId) : -1;
}

export function getCurrentCheckinId() {
    return currentCheckinId;
}

// Reset popup state when popup is closed
export function resetHighlighting() {
    currentPopup = null;
    currentCheckinId = null;
    // Reset checkin highlighting
    resetCheckinHighlighting();
}

// Function to highlight the selected checkin
export function highlightSelectedCheckin(id) {
    if (!window.map) return;
    
    // Reset any existing highlighting first
    resetCheckinHighlighting();
    
    // Update the unclustered layer to show highlighted icon for the selected point
    window.map.setFilter('coco-checkin-unclustered', [
        'any',
        ['!=', ['get', 'id'], id], // Show normal icon for non-selected points
        ['==', ['get', 'id'], id]  // Show highlighted icon for selected point
    ]);
    
    // Set the icon image based on whether it's the selected point
    window.map.setLayoutProperty('coco-checkin-unclustered', 'icon-image', [
        'case',
        ['==', ['get', 'id'], id],
        'heart-marker-highlighted',
        'heart-marker'
    ]);
}

// Function to reset checkin highlighting
export function resetCheckinHighlighting() {
    if (!window.map) return;
    
    // Reset the filter to show all points
    window.map.setFilter('coco-checkin-unclustered', ['!', ['has', 'point_count']]);
    
    // Reset the icon image to normal
    window.map.setLayoutProperty('coco-checkin-unclustered', 'icon-image', 'heart-marker');
}

// Cleanup function for memory management
export function cleanup() {
    resetHighlighting();
    dataManager.cleanup();
    // Clear global references
    if (window.allCocoCheckins) {
        delete window.allCocoCheckins;
    }
    if (window.cocoCheckinData) {
        delete window.cocoCheckinData;
    }
}

// Global function to open checkins panel
window.openCheckinsPanel = function() {
    if (window.showCheckinsPanel) {
        window.showCheckinsPanel();
        // Set the current checkin index when opening from popup
        if (window.setCurrentCheckinIndex && currentCheckinId) {
            window.setCurrentCheckinIndex(currentCheckinId);
        }
    }
};

// Global function to close coco-checkin popup
window.closeCocoCheckinPopup = function() {
    if (currentPopup) {
        currentPopup.remove();
        resetHighlighting();
    }
};

// Navigation functions
window.navigateToPreviousCheckin = function() {
    if (!currentCheckinId) {
        return;
    }
    
    const data = dataManager.getData();
    if (!data) return;
    
    const currentIndex = findCheckinIndexById(currentCheckinId);
    let newIndex;
    
    if (currentIndex > 0) {
        newIndex = currentIndex - 1;
    } else {
        // Loop back to the last checkin when at the first
        newIndex = data.length - 1;
    }
    
    const checkin = data[newIndex];
    const coordinates = checkin.geometry.coordinates;
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;
    
    // Get current zoom level and ensure we don't zoom out
    const currentZoom = window.map.getZoom();
    const targetZoom = Math.max(currentZoom, 8);
    
    let flyToOptions = {
        center: coordinates,
        zoom: targetZoom,
        duration: 1000,
        easing: (t) => t * (2 - t) // Ease out function for smooth animation
    };
    
    // On mobile, center the point in the top 70% of the screen (accounting for 30% bottom sheet)
    if (isMobile) {
        const mapContainer = window.map.getContainer();
        const mapHeight = mapContainer.offsetHeight;
        const mapCenterY = mapHeight * 0.35; // Center of the top 70% area (35% from top edge)
        
        flyToOptions.offset = [0, mapCenterY - mapHeight / 2]; // Offset to center in the top 70%
    }
    
    // Fly to the location with zoom
    window.map.flyTo(flyToOptions);
    
    // Update the popup with the previous checkin using id
    showCocoCheckinPopup(checkin.properties.id, coordinates);
};

window.navigateToNextCheckin = function() {
    if (!currentCheckinId) {
        return;
    }
    
    const data = dataManager.getData();
    if (!data) return;
    
    const currentIndex = findCheckinIndexById(currentCheckinId);
    let newIndex;
    
    if (currentIndex < data.length - 1) {
        newIndex = currentIndex + 1;
    } else {
        // Loop back to the first checkin when at the last
        newIndex = 0;
    }
    
    const checkin = data[newIndex];
    const coordinates = checkin.geometry.coordinates;
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;
    
    // Get current zoom level and ensure we don't zoom out
    const currentZoom = window.map.getZoom();
    const targetZoom = Math.max(currentZoom, 8);
    
    let flyToOptions = {
        center: coordinates,
        zoom: targetZoom,
        duration: 1000,
        easing: (t) => t * (2 - t) // Ease out function for smooth animation
    };
    
    // On mobile, center the point in the top 70% of the screen (accounting for 30% bottom sheet)
    if (isMobile) {
        const mapContainer = window.map.getContainer();
        const mapHeight = mapContainer.offsetHeight;
        const mapCenterY = mapHeight * 0.35; // Center of the top 70% area (35% from top edge)
        
        flyToOptions.offset = [0, mapCenterY - mapHeight / 2]; // Offset to center in the top 70%
    }
    
    // Fly to the location with zoom
    window.map.flyTo(flyToOptions);
    
    // Update the popup with the next checkin using id
    showCocoCheckinPopup(checkin.properties.id, coordinates);
};

// Helper function to load heart icons
export function loadHeartIcons(map) {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const checkComplete = () => {
            loadedCount++;
            if (loadedCount === 2) {
                resolve();
            }
        };
        
        // Try to load heart icons, fallback to existing icons if not available
        const loadIcon = (iconName, fallbackIcon, isHighlighted = false) => {
            map.loadImage(`${baseUrl}/img/${iconName}`, (error, image) => {
                if (error) {
                    console.warn(`Failed to load ${iconName}, using fallback:`, error);
                    // Use fallback icon
                    map.loadImage(`${baseUrl}/img/${fallbackIcon}`, (fallbackError, fallbackImage) => {
                        if (fallbackError) {
                            console.warn(`Failed to load fallback icon ${fallbackIcon}:`, fallbackError);
                            checkComplete();
                            return;
                        }
                        
                        const finalIconName = isHighlighted ? 'heart-marker-highlighted' : 'heart-marker';
                        if (!map.hasImage(finalIconName)) {
                            map.addImage(finalIconName, fallbackImage);
                        }
                        checkComplete();
                    });
                } else {
                    const finalIconName = isHighlighted ? 'heart-marker-highlighted' : 'heart-marker';
                    if (!map.hasImage(finalIconName)) {
                        map.addImage(finalIconName, image);
                    }
                    checkComplete();
                }
            });
        };
        
        // Load normal heart icon (try heart_normal.svg, fallback to star_normal.png)
        loadIcon('heart_normal.png', 'star_normal.png', false);
        
        // Load highlighted heart icon (try heart_highlighted.svg, fallback to star_highlighted.png)
        loadIcon('heart_highlighted.png', 'star_highlighted.png', true);
    });
}

// Helper function to load coco-checkin data from API
export async function loadCocoCheckinDataDirect() {
    try {
        const response = await fetch('https://nrg6r1ttfc.execute-api.us-east-1.amazonaws.com/dev/coco-checkin/geojson');
        if (response.ok) {
            const data = await response.json();
            
            // Set raw data in data manager
            dataManager.setData(data.features);
            
            // Process features with nearby_count using spatial indexing
            const processedFeatures = dataManager.processFeaturesWithNearbyCount();
            
            // Store processed data globally (single source)
            window.cocoCheckinData = processedFeatures;
            return processedFeatures;
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        console.error('Error loading coco-checkin data:', error);
        window.cocoCheckinData = [];
        return [];
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanup();
});
