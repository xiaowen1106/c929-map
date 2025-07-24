import { baseUrl } from '../config.js';


// Data manager for fan wishes to avoid memory duplication
class FanWishesDataManager {
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
const dataManager = new FanWishesDataManager();

// Global variables for fan wish navigation
let currentPopup = null;
let currentWishFakeId = null;
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

export const fanWishesLayer = {
    id: 'fan-wishes',
    type: 'symbol',
    layout: {
        'icon-image': 'marker-15',
        'icon-size': [
            'case',
            ['has', 'point_count'],
            [
                'interpolate',
                ['linear'],
                ['get', 'point_count'],
                1, 0.4,    // 1 message: small star (reduced from 0.6)
                3, 0.5,    // 5 messages: slightly larger star (reduced from 0.8)
                5, 0.6,   // 10 messages: medium star (reduced from 1.0)
                8, 0.8,   // 20+ messages: larger star (reduced from 1.2)
                10, 1.0    // 50+ messages: largest star (reduced from 1.5)
            ],
            0.4  // Default size for unclustered points (reduced from 0.6)
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
                '#FFEB3B',  // Default color for single points
                10, '#FFC107',  // Orange for clusters with 10+ points
                50, '#FF9800',  // Dark orange for clusters with 50+ points
                100, '#F57C00'  // Red-orange for clusters with 100+ points
            ],
            '#FFEB3B'  // Default color for unclustered points
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
export const fanWishesUnclusteredLayer = {
    id: 'fan-wishes-unclustered',
    type: 'symbol',
    filter: ['!', ['has', 'point_count']],
    layout: {
        'icon-image': 'marker-15',
        'icon-size': [
            'case',
            ['has', 'nearby_count'],
            [
                'interpolate',
                ['linear'],
                ['get', 'nearby_count'],
                1, 0.4,    // Single message
                2, 0.5,    // 2 nearby messages
                3, 0.6,    // 3 nearby messages
                4, 0.7     // 4+ nearby messages
            ],
            0.4  // Default size for isolated points
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,  // Changed from false to allow overlapping icons
        'text-field': '',  // No text for unclustered points
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': true
    },
    paint: {
        'icon-color': '#FFEB3B',  // Consistent color for unclustered points
        'icon-opacity': 1.0,
        'icon-opacity-transition': { duration: 300 },
        'icon-color-transition': { duration: 300 },
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1
    }
};

// Helper function to find message index by fakeId
function findMessageIndexByFakeId(fakeId) {
    const data = dataManager.getData();
    return data ? data.findIndex(wish => wish.properties.fakeId == fakeId) : -1;
}

// Helper function to find message by fakeId
function findMessageByFakeId(fakeId) {
    const data = dataManager.getData();
    return data ? data.find(wish => wish.properties.fakeId == fakeId) : null;
}

// Helper function to create scrollable message content using DOM elements
function createScrollableMessage(message) {
    const container = document.createElement('div');
    container.className = 'message-text-container';
    
    const paragraph = document.createElement('p');
    paragraph.className = 'message-text';
    
    // Handle line breaks properly by converting \n to <br> tags
    const processedMessage = message ? message.replace(/\n/g, '<br>') : '';
    paragraph.innerHTML = processedMessage;
    
    container.appendChild(paragraph);
    return container;
}

// Popup function for fan wishes - accepts fakeId
export function showFanWishPopup(fakeId, coordinates) {
    const wish = findMessageByFakeId(fakeId);
    if (!wish) {
        console.error('Message not found with fakeId:', fakeId);
        return;
    }
    
    const wishIndex = findMessageIndexByFakeId(fakeId);
    currentWishFakeId = fakeId;
    
    // Highlight the selected star
    highlightSelectedStar(fakeId);
    
    // Set the current message index for the messages panel
    if (window.setCurrentMessageIndex) {
        window.setCurrentMessageIndex(fakeId);
    }

    // Group name (location)
    const location = escapeHtml(wish.properties.locationString ? 
        wish.properties.locationString : 
        `${wish.properties.city || ''}${wish.properties.city && wish.properties.country ? ', ' : ''}${wish.properties.country || ''}`
    );
    // Message author name - decode HTML entities for proper display
    const rawAuthorName = wish.properties.displayName || 'Anonymous';
    const temp = document.createElement('div');
    temp.innerHTML = rawAuthorName;
    const messageAuthor = temp.textContent || temp.innerText || rawAuthorName;

    // Create popup content using DOM elements for better memory management
    const popupCard = document.createElement('div');
    popupCard.className = 'popup-card custom-fan-wish-popup';
    
    const header = document.createElement('div');
    header.className = 'fan-wish-popup-header';
    
    const main = document.createElement('div');
    main.className = 'fan-wish-popup-main';
    
    // Navigation arrows
    const leftArrow = document.createElement('button');
    leftArrow.className = 'fan-wish-nav-arrow left';
    leftArrow.title = 'Previous message';
    leftArrow.textContent = '‹';
    leftArrow.onclick = () => window.navigateToPreviousMessage();
    
    const rightArrow = document.createElement('button');
    rightArrow.className = 'fan-wish-nav-arrow right';
    rightArrow.title = 'Next message';
    rightArrow.textContent = '›';
    rightArrow.onclick = () => window.navigateToNextMessage();
    
    // Content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'fan-wish-content-container';
    
    // Content header
    const contentHeader = document.createElement('div');
    contentHeader.className = 'fan-wish-content-header';
    
    const contentText = document.createElement('div');
    contentText.className = 'fan-wish-content-text';
    
    const title = document.createElement('div');
    title.className = 'fan-wish-content-title';
    title.textContent = messageAuthor;
    
    const author = document.createElement('div');
    author.className = 'fan-wish-content-author';
    author.textContent = `@${location}`;
    
    // Menu icon or close button based on screen size
    const isMobile = window.innerWidth <= 768;
    let actionButton;
    
    if (isMobile) {
        // Create close button for mobile
        actionButton = document.createElement('button');
        actionButton.className = 'close-btn';
        actionButton.title = 'Close popup';
        actionButton.textContent = '×';
        actionButton.onclick = () => window.closeFanWishPopup();
    } else {
        // Create menu icon for desktop
        actionButton = document.createElement('button');
        actionButton.className = 'menu-icon';
        actionButton.title = 'View all messages';
        actionButton.onclick = () => window.openMessagesPanel();
        
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            actionButton.appendChild(span);
        }
    }
    
    const separator = document.createElement('div');
    separator.className = 'fan-wish-content-separator';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'fan-wish-message-content';
    
    // Create message content
    const messageContainer = createScrollableMessage(wish.properties.message);
    messageContent.appendChild(messageContainer);
    
    // Assemble the popup
    contentText.appendChild(title);
    contentText.appendChild(author);
    contentHeader.appendChild(contentText);
    contentHeader.appendChild(actionButton);
    
    contentContainer.appendChild(contentHeader);
    contentContainer.appendChild(separator);
    contentContainer.appendChild(messageContent);
    
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

// Make showFanWishPopup globally available
window.showFanWishPopup = showFanWishPopup;

// Make highlighting functions globally available
window.highlightSelectedStar = highlightSelectedStar;
window.resetStarHighlighting = resetStarHighlighting;

// Set fan wishes data
export function setFanWishesData(features) {
    dataManager.setData(features);
    // Keep global access for backward compatibility (single source)
    window.allFanWishes = features;
}

// Get current popup state
export function getCurrentPopup() {
    return currentPopup;
}

export function getCurrentWishIndex() {
    return currentWishFakeId ? findMessageIndexByFakeId(currentWishFakeId) : -1;
}

export function getCurrentWishFakeId() {
    return currentWishFakeId;
}

// Reset popup state when popup is closed
export function resetHighlighting() {
    currentPopup = null;
    currentWishFakeId = null;
    // Reset star highlighting
    resetStarHighlighting();
}

// Function to highlight the selected star
export function highlightSelectedStar(fakeId) {
    if (!window.map) return;
    
    // Reset any existing highlighting first
    resetStarHighlighting();
    
    // Update the unclustered layer to show highlighted icon for the selected point
    window.map.setFilter('fan-wishes-unclustered', [
        'any',
        ['!=', ['get', 'fakeId'], fakeId], // Show normal icon for non-selected points
        ['==', ['get', 'fakeId'], fakeId]  // Show highlighted icon for selected point
    ]);
    
    // Set the icon image based on whether it's the selected point
    window.map.setLayoutProperty('fan-wishes-unclustered', 'icon-image', [
        'case',
        ['==', ['get', 'fakeId'], fakeId],
        'marker-15-highlighted',
        'marker-15'
    ]);
}

// Function to reset star highlighting
export function resetStarHighlighting() {
    if (!window.map) return;
    
    // Reset the filter to show all points
    window.map.setFilter('fan-wishes-unclustered', ['!', ['has', 'point_count']]);
    
    // Reset the icon image to normal
    window.map.setLayoutProperty('fan-wishes-unclustered', 'icon-image', 'marker-15');
}

// Cleanup function for memory management
export function cleanup() {
    resetHighlighting();
    dataManager.cleanup();
    // Clear global references
    if (window.allFanWishes) {
        delete window.allFanWishes;
    }
    if (window.fanWishesData) {
        delete window.fanWishesData;
    }
}

// Global function to open messages panel
window.openMessagesPanel = function() {
    if (window.showMessagesPanel) {
        window.showMessagesPanel();
        // Set the current message index when opening from popup
        if (window.setCurrentMessageIndex && currentWishFakeId) {
            window.setCurrentMessageIndex(currentWishFakeId);
        }
    }
};

// Global function to close fan wish popup
window.closeFanWishPopup = function() {
    if (currentPopup) {
        currentPopup.remove();
        resetHighlighting();
    }
};

// Navigation functions
window.navigateToPreviousMessage = function() {
    if (!currentWishFakeId) {
        return;
    }
    
    const data = dataManager.getData();
    if (!data) return;
    
    const currentIndex = findMessageIndexByFakeId(currentWishFakeId);
    let newIndex;
    
    if (currentIndex > 0) {
        newIndex = currentIndex - 1;
    } else {
        // Loop back to the last message when at the first
        newIndex = data.length - 1;
    }
    
    const wish = data[newIndex];
    const coordinates = wish.geometry.coordinates;
    
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
    
    // Update the popup with the previous message using fakeId
    showFanWishPopup(wish.properties.fakeId, coordinates);
};

window.navigateToNextMessage = function() {
    if (!currentWishFakeId) {
        return;
    }
    
    const data = dataManager.getData();
    if (!data) return;
    
    const currentIndex = findMessageIndexByFakeId(currentWishFakeId);
    let newIndex;
    
    if (currentIndex < data.length - 1) {
        newIndex = currentIndex + 1;
    } else {
        // Loop back to the first message when at the last
        newIndex = 0;
    }
    
    const wish = data[newIndex];
    const coordinates = wish.geometry.coordinates;
    
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
    
    // Update the popup with the next message using fakeId
    showFanWishPopup(wish.properties.fakeId, coordinates);
};

// Helper function to load star icons
export function loadStarIcons(map) {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const checkComplete = () => {
            loadedCount++;
            if (loadedCount === 2) {
                resolve();
            }
        };
        
        // Load normal star icon
        map.loadImage(`${baseUrl}/img/star_normal.png`, (error, image) => {
            if (error) {
                console.warn('Failed to load normal star icon:', error);
                checkComplete();
                return;
            }
            
            if (!map.hasImage('marker-15')) {
                map.addImage('marker-15', image);
            }
            checkComplete();
        });
        
        // Load highlighted star icon
        map.loadImage(`${baseUrl}/img/star_highlighted.png`, (error, image) => {
            if (error) {
                console.warn('Failed to load highlighted star icon:', error);
                checkComplete();
                return;
            }
            
            if (!map.hasImage('marker-15-highlighted')) {
                map.addImage('marker-15-highlighted', image);
            }
            checkComplete();
        });
    });
}



// Helper function to load fan wishes data from GeoJSON
export async function loadFanWishesDataDirect() {
    try {
        const response = await fetch(`${baseUrl}/data/messages_geocoded.geojson`);
        if (response.ok) {
            const data = await response.json();
            
            // Set raw data in data manager
            dataManager.setData(data.features);
            
            // Process features with nearby_count using spatial indexing
            const processedFeatures = dataManager.processFeaturesWithNearbyCount();
            
            // Store processed data globally (single source)
            window.fanWishesData = processedFeatures;
            return processedFeatures;
        } else {
            throw new Error('GeoJSON not found');
        }
    } catch (error) {
        console.error('Error loading fan wishes GeoJSON:', error);
        window.fanWishesData = [];
        return [];
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanup();
}); 