import { baseUrl } from '../config.js';
import { createVideoCoverFromObject, createPhotoElement } from '../utils/mediaUtils.js';
import { cleanup as cleanupPanel } from '../panels/bonusPanel.js';

// Data manager for bonus items to avoid memory duplication and improve performance
class BonusDataManager {
    constructor() {
        this.data = null;
        this.indexMap = new Map(); // id -> index mapping for O(1) lookups
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
            // Build id index
            const id = feature.properties.id;
            if (id !== undefined) {
                this.indexMap.set(id, index);
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
    
    // O(1) lookup by id
    findById(id) {
        return this.indexMap.get(id) !== undefined ? this.data[this.indexMap.get(id)] : null;
    }
    
    // O(1) lookup by id returning index
    findIndexById(id) {
        return this.indexMap.get(id);
    }
    
    // Get bonus items at specific location efficiently
    getBonusAtLocation(coordinates, tolerance = 0.001) {
        const [lng, lat] = coordinates;
        const spatialKey = `${Math.round(lng * 1000)},${Math.round(lat * 1000)}`;
        const nearbyFeatures = this.spatialMap.get(spatialKey) || [];
        
        return nearbyFeatures.filter(bonus => {
            const latDiff = Math.abs(bonus.geometry.coordinates[1] - lat);
            const lngDiff = Math.abs(bonus.geometry.coordinates[0] - lng);
            return latDiff < tolerance && lngDiff < tolerance;
        });
    }
    
    // Get all bonus items
    getAllBonus() {
        return this.data || [];
    }
    
    // Get total count
    getCount() {
        return this.data ? this.data.length : 0;
    }
    
    // Estimate memory usage
    getMemoryUsage() {
        if (!this.data) return 0;
        
        // Rough estimation: each bonus object ~1-2KB
        const dataSize = this.data.length * 1500; // 1.5KB per bonus
        const indexSize = this.indexMap.size * 20; // ~20 bytes per index entry
        const spatialSize = this.spatialMap.size * 50; // ~50 bytes per spatial entry
        
        return {
            dataSize,
            indexSize,
            spatialSize,
            total: dataSize + indexSize + spatialSize,
            bonus: this.data.length
        };
    }
    
    // Cleanup memory
    cleanup() {
        this.data = null;
        this.indexMap.clear();
        this.spatialMap.clear();
    }
}

// Global variables for bonus navigation
let currentBonusPopup = null;
let currentBonusId = null;
let isNavigating = false; // Flag to prevent reset during navigation

// Create data manager instance
const dataManager = new BonusDataManager();

// Make data manager globally accessible for consistency
window.bonusDataManager = dataManager;

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

// Symbol layer for bonus icons
export const bonusLayer = {
    id: 'bonus',
    type: 'symbol',
    layout: {
        'icon-image': 'bonus-icon',
        'icon-size': 0.012,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'visibility': 'visible'
    },
    paint: {}
};

// Function to process bonus data
function processBonusData(features) {
    return features.map(feature => {
        // Ensure all required properties exist
        const properties = feature.properties || {};
        return {
            ...feature,
            properties: {
                id: properties.id || '',
                title: properties.title || 'Bonus',
                date: properties.date || '',
                city: properties.city || '',
                content: properties.content || '',
                youtube_url: properties.youtube_url || '',
                lat: properties.lat || feature.geometry?.coordinates?.[1] || 0,
                lng: properties.lng || feature.geometry?.coordinates?.[0] || 0,
                ...properties
            }
        };
    });
}

// Function to find bonus index by id
function findBonusIndexById(id) {
    return dataManager.findIndexById(id);
}

// Function to find bonus by id
function findBonusById(id) {
    return dataManager.findById(id);
}



// Function to format date
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}



// Function to show bonus popup
export function showBonusPopup(id, coordinates) {
    try {
        // Close any existing popup
        if (currentBonusPopup) {
            currentBonusPopup.remove();
            currentBonusPopup = null;
        }
        
        // Find the bonus item
        const bonus = findBonusById(id);
        if (!bonus) {
            console.error('Bonus not found:', id);
            return;
        }
        
        // Set current bonus
        currentBonusId = id;
        
        // Create popup content
        const title = bonus.properties.title || 'Bonus';
        const date = formatDate(bonus.properties.date);
        const city = bonus.properties.city || '';
        const content = bonus.properties.content || '';
        
        // Video or photo content
        let mediaContent = '';
        const hasVideo = (bonus.properties.youtube_url && bonus.properties.youtube_url !== 'N/A' && bonus.properties.youtube_url !== '');
        
        if (hasVideo) {
            // Create video object structure for location-based selection
            const videoObject = {
                youtube_url: bonus.properties.youtube_url
            };
            
            // Use createVideoCoverFromObject with location-based URL selection
            const videoCover = createVideoCoverFromObject(videoObject);
            if (videoCover) {
                mediaContent = videoCover;
            }
        }
        
        // If no video, use the photo
        if (!mediaContent && bonus.properties.photo && bonus.properties.photo !== 'N/A' && bonus.properties.photo_names !== '') {
            mediaContent = createPhotoElement(`img/bonus/${bonus.properties.photo}`, 'Bonus Photo', 'bonus-photo');
        }
        
        // Get all bonus items for navigation
        const allBonus = dataManager.getAllBonus();
        const currentIndex = findBonusIndexById(id);
        const hasMultiple = allBonus.length > 1;
        
        // Menu icon or close button based on screen size
        const isMobile = window.innerWidth <= 768;
        let actionButton;
        
        if (isMobile) {
            // Create close button for mobile
            actionButton = `<button class="close-btn" onclick="closeBonusPopup()" title="Close popup">×</button>`;
        } else {
            // Create menu icon for desktop
            actionButton = `<button class="menu-icon" onclick="openBonusPanel()" title="View all bonus"><span></span><span></span><span></span></button>`;
        }

        // Navigation arrows (outside main content) - always enabled for circular navigation
        const leftArrow = `<button class="bonus-nav-arrow left" onclick="navigateToPreviousBonus()" title="Previous bonus">‹</button>`;
        const rightArrow = `<button class="bonus-nav-arrow right" onclick="navigateToNextBonus()" title="Next bonus">›</button>`;

        const popupContent = `
            <div class="popup-card custom-bonus-popup">
                <div class="bonus-popup-header">
                </div>
                <div class="bonus-popup-main">
                    ${leftArrow}
                    <div class="bonus-content-container">
                        <div class="bonus-content-header">
                            <div class="bonus-content-text">
                                <div class="bonus-content-title">${escapeHtml(title)}</div>
                                <div class="bonus-content-subtitle">${date ? escapeHtml(date) : ''} ${city ? `• ${escapeHtml(city)}` : ''}</div>
                            </div>
                            ${actionButton}
                        </div>
                        <div class="bonus-content-separator"></div>
                        <div class="bonus-content-body">
                            <div class="bonus-content-text">${escapeHtml(content)}</div>
                            <div class="bonus-media-container">
                                ${mediaContent}
                            </div>
                        </div>
                    </div>
                    ${rightArrow}
                </div>
            </div>
        `;
        
        // Create and show popup
        currentBonusPopup = new mapboxgl.Popup({
            maxWidth: '500px',
            closeButton: false,
            closeOnClick: true
        })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(window.map);

        // Note: We don't add a close event listener here to avoid circular dependency
        // The popup will be handled by the global closeBonusPopup function
        
        // Check if panel is open and update selection
        const isPanelOpen = document.querySelector('#bonus-panel')?.classList.contains('active');
        if (isPanelOpen && !isNavigating) {
            // Import and call panel selection function
            import('../panels/bonusPanel.js').then(module => {
                module.selectBonusInPanel(id);
            });
        }
        
    } catch (error) {
        console.error('Error showing bonus popup:', error);
    }
}

// Function to set bonus data
export function setBonusData(features) {
    const processedFeatures = processBonusData(features);
    dataManager.setData(processedFeatures);
    window.allBonus = processedFeatures; // For backward compatibility
}

// Function to get current bonus popup
export function getCurrentBonusPopup() {
    return currentBonusPopup;
}

// Function to get current bonus index
export function getCurrentBonusIndex() {
    return currentBonusId ? findBonusIndexById(currentBonusId) : -1;
}

// Function to get current bonus id
export function getCurrentBonusId() {
    return currentBonusId;
}

// Function to reset bonus highlighting
export function resetBonusHighlighting() {
    if (isNavigating) {
        isNavigating = false;
        return;
    }
    
    // Reset current bonus
    currentBonusId = null;
    
    // Note: We don't call popup.remove() here to avoid circular dependency
    // The popup should be closed using closeBonusPopup() instead
    currentBonusPopup = null;
    
    // Reset panel selection if panel is open
    const isPanelOpen = document.querySelector('#bonus-panel')?.classList.contains('active');
    if (isPanelOpen) {
        import('../panels/bonusPanel.js').then(module => {
            module.resetBonusSelection();
        });
    }
}

// Function to navigate to specific bonus
export function navigateToBonus(id) {
    try {
        const bonus = findBonusById(id);
        if (!bonus) {
            console.error('Bonus not found for navigation:', id);
            return;
        }
        
        isNavigating = true;
        
        // Fly to location
        window.map.flyTo({
            center: bonus.geometry.coordinates,
            zoom: 6,
            duration: 2000
        });
        
        // Show popup after animation
        setTimeout(() => {
            showBonusPopup(id, bonus.geometry.coordinates);
            isNavigating = false; // <-- add this line
        }, 2100);
        
    } catch (error) {
        console.error('Error navigating to bonus:', error);
        isNavigating = false;
    }
}

// Function to load bonus data
export async function loadBonusData() {
    try {
        const response = await fetch(`${baseUrl}/data/bonus.geojson`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBonusData(data.features);
        console.log(`Loaded ${data.features.length} bonus items`);
        return data.features;
    } catch (error) {
        console.error('Error loading bonus data:', error);
        return [];
    }
}

// Function to load bonus icon
export function loadBonusIcon(map) {
    // Load bonus icon image
    map.loadImage(`${baseUrl}/img/QuestionMark.png`, (error, image) => {
        if (error) {
            console.error('Error loading bonus icon:', error);
            return;
        }
        
        if (!map.hasImage('bonus-icon')) {
            map.addImage('bonus-icon', image);
        }
    });
}

// Function to cleanup
export function cleanup() {
    // Close popup safely
    if (currentBonusPopup) {
        try {
            currentBonusPopup.remove();
        } catch (e) {
            console.warn('Error removing popup during cleanup:', e);
        }
        currentBonusPopup = null;
    }
    
    // Reset variables
    currentBonusId = null;
    isNavigating = false;
    
    // Cleanup data manager
    dataManager.cleanup();
    
    // Cleanup panel
    cleanupPanel();
}

// Function to log memory usage
export function logMemoryUsage() {
    const usage = dataManager.getMemoryUsage();
    console.log('Bonus Layer Memory Usage:', usage);
    return usage;
}



// Global function to open bonus panel
window.openBonusPanel = function() {
    if (window.showBonusPanel) {
        // Pass the current bonus ID to auto-select it in the panel
        window.showBonusPanel(currentBonusId);
    }
};

// Global function to close bonus popup
window.closeBonusPopup = function() {
    if (currentBonusPopup) {
        // Remove the popup without triggering the close event
        currentBonusPopup.remove();
        // Reset highlighting manually
        if (!isNavigating) {
            currentBonusId = null;
            currentBonusPopup = null;
            
            // Reset panel selection if panel is open
            const isPanelOpen = document.querySelector('#bonus-panel')?.classList.contains('active');
            if (isPanelOpen) {
                import('../panels/bonusPanel.js').then(module => {
                    module.resetBonusSelection();
                });
            }
        }
    }
};

// Navigation functions
window.navigateToPreviousBonus = function() {
    if (!currentBonusId) {
        return;
    }
    
    const currentIndex = findBonusIndexById(currentBonusId);
    const totalBonus = dataManager.getCount();
    
    if (totalBonus > 0) {
        // Calculate new index with wrap-around
        const newIndex = currentIndex > 0 ? currentIndex - 1 : totalBonus - 1;
        const bonus = dataManager.getData()[newIndex];
        
        if (bonus && bonus.geometry && bonus.geometry.coordinates) {
            const coordinates = bonus.geometry.coordinates;
            
            // Get current zoom level and ensure we don't zoom out
            const currentZoom = window.map.getZoom();
            const targetZoom = Math.max(currentZoom, 6);
            
            // Fly to the location with zoom
            window.map.flyTo({
                center: coordinates,
                zoom: targetZoom,
                duration: 1000
            });
            
            // Update the popup with the previous bonus
            showBonusPopup(bonus.properties.id, coordinates);
            
            // Update panel if it's open
            const isPanelOpen = document.querySelector('#bonus-panel')?.classList.contains('active');
            if (isPanelOpen) {
                import('../panels/bonusPanel.js').then(module => {
                    module.selectBonusInPanel(bonus.properties.id);
                });
            }
        }
    }
};

window.navigateToNextBonus = function() {
    if (!currentBonusId) {
        return;
    }
    
    const currentIndex = findBonusIndexById(currentBonusId);
    const totalBonus = dataManager.getCount();
    
    if (totalBonus > 0) {
        // Calculate new index with wrap-around
        const newIndex = currentIndex < totalBonus - 1 ? currentIndex + 1 : 0;
        const bonus = dataManager.getData()[newIndex];
        
        if (bonus && bonus.geometry && bonus.geometry.coordinates) {
            const coordinates = bonus.geometry.coordinates;
            
            // Get current zoom level and ensure we don't zoom out
            const currentZoom = window.map.getZoom();
            const targetZoom = Math.max(currentZoom, 4);
            
            // Fly to the location with zoom
            window.map.flyTo({
                center: coordinates,
                zoom: targetZoom,
                duration: 1000
            });
            
            // Update the popup with the next bonus
            showBonusPopup(bonus.properties.id, coordinates);
            
            // Update panel if it's open
            const isPanelOpen = document.querySelector('#bonus-panel')?.classList.contains('active');
            if (isPanelOpen) {
                import('../panels/bonusPanel.js').then(module => {
                    module.selectBonusInPanel(bonus.properties.id);
                });
            }
        }
    }
}; 