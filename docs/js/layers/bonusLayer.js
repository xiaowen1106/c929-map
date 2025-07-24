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
let currentBonusId = null;
let isNavigating = false; // Flag to prevent reset during navigation
let activeTimeouts = new Set(); // Track active timeouts for cleanup

// Create data manager instance
const dataManager = new BonusDataManager();

// Make data manager globally accessible for consistency
window.bonusDataManager = dataManager;

// Function to set current bonus ID
export function setCurrentBonusId(id) {
    currentBonusId = id;
    // Also set it globally for consistency
    window.currentBonusId = id;
}

// Function to get current bonus ID
export function getCurrentBonusId() {
    return currentBonusId || window.currentBonusId;
}

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
        'icon-size': 0.35, // Increased from 0.012 to compensate for smaller image (64px vs 1827px)
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

// Function to set bonus data
export function setBonusData(features) {
    const processedFeatures = processBonusData(features);
    dataManager.setData(processedFeatures);
    window.allBonus = processedFeatures; // For backward compatibility
}

// Function to get current bonus index
export function getCurrentBonusIndex() {
    return currentBonusId ? findBonusIndexById(currentBonusId) : -1;
}

// Function to reset bonus highlighting
export function resetBonusHighlighting() {
    if (isNavigating) {
        isNavigating = false;
        return;
    }
    
    // Reset current bonus
    currentBonusId = null;
    
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
        
        // Open panel after animation
        addTrackedTimeout(() => {
            if (window.showBonusPanel) {
                window.showBonusPanel(id);
            }
            isNavigating = false;
        }, 2100);
        
    } catch (error) {
        console.error('Error navigating to bonus:', error);
        isNavigating = false;
    }
}

// Function to cleanup timeouts
function cleanupTimeouts() {
    activeTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
    });
    activeTimeouts.clear();
}

// Function to add timeout with tracking
function addTrackedTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
        callback();
        activeTimeouts.delete(timeoutId);
    }, delay);
    activeTimeouts.add(timeoutId);
    return timeoutId;
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
    // Reset variables
    currentBonusId = null;
    isNavigating = false;
    
    // Cleanup timeouts
    cleanupTimeouts();
    
    // Cleanup data manager
    dataManager.cleanup();
    
    // Cleanup panel
    cleanupPanel();
}

// Function to log memory usage
export function logMemoryUsage() {
    const usage = dataManager.getMemoryUsage();
    const timeoutCount = activeTimeouts.size;
    
    // Warn if timeout count is high
    if (timeoutCount > 5) {
        console.warn(`High timeout count detected: ${timeoutCount}. Check for memory leaks.`);
    }
    
    return usage;
}

// Navigation functions for panel
window.navigateToPreviousBonus = function() {
    const currentId = getCurrentBonusId();
    if (!currentId) {
        return;
    }
    
    const currentIndex = findBonusIndexById(currentId);
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
            
            // Update the panel with the previous bonus
            if (window.showBonusPanel) {
                window.showBonusPanel(bonus.properties.id);
            }
            
            // Update panel content if it's open
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
    const currentId = getCurrentBonusId();
    if (!currentId) {
        return;
    }
    
    const currentIndex = findBonusIndexById(currentId);
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
            
            // Update the panel with the next bonus
            if (window.showBonusPanel) {
                window.showBonusPanel(bonus.properties.id);
            }
            
            // Update panel content if it's open
            const isPanelOpen = document.querySelector('#bonus-panel')?.classList.contains('active');
            if (isPanelOpen) {
                import('../panels/bonusPanel.js').then(module => {
                    module.selectBonusInPanel(bonus.properties.id);
                });
            }
        }
    }
}; 