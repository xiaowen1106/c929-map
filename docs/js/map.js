import { config, baseUrl } from './config.js';
// Import layer configurations
import { fanWishesLayer, loadStarIcons } from './layers/fanWishesLayer.js';
import { concertsLayer, loadConcertImages } from './layers/concertsLayer.js';
import { loadFlyingTrackingData, showFlightTrackingLayer, hideFlightTrackingLayer } from './layers/flyingTrackingLayer.js';
import { fansActivitiesLayer, loadMiJieIcons, loadFansActivitiesFillData } from './layers/fansActivitiesLayer.js';
import { bonusLayer, loadBonusIcon, loadBonusData } from './layers/bonusLayer.js';
import { cityMarkersLayer } from './layers/fansActivitiesLayer.js';
import { cocoCheckinLayer, loadHeartIcons } from './layers/cocoCheckinLayer.js';
import { loadLayer } from './utils/layerUtils.js';
import { handleMapClick, handleZoomHomeClick } from './utils/eventHandlers.js';

// Import panel handlers and detail panel management
import { panelHandlers, initializeDetailPanel, showDetailPanel } from './panels/index.js';
import { showMessagesPanel, setCurrentMessageIndex } from './panels/messagesPanel.js';
import { showFansActivitiesPanel, setCurrentActivityIndex, setActivityCityFilter } from './panels/fansActivitiesPanel.js';
import { showBonusPanel, setCurrentBonusIndex, closeBonusPanel } from './panels/bonusPanel.js';

// Import edit panel functionality
import { initializeEditPanel } from './header.js';

// Initialize Mapbox
mapboxgl.accessToken = config.mapboxToken;

// Final map configuration (target position)
const finalMapConfig = {
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-98, 42],
    zoom: window.innerWidth > 768 ? 3.2 : 2.2,
    minZoom: 2,
    maxZoom: 18
};

// Make finalMapConfig globally available
window.finalMapConfig = finalMapConfig;

// Initial map configuration (starting from North Pole with globe view)
const initialMapConfig = {
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [90, 90], // North Pole coordinates at 180 longitude
    zoom: window.innerWidth > 768 ? 1.2 : 0.5,
    minZoom: 2,
    maxZoom: 18,
    projection: 'globe' // Enable globe projection for the animation
};

// Create map with initial configuration
const map = new mapboxgl.Map(initialMapConfig);
window.map = map;

// Animation function to rotate around the globe and then move to North America
function animateGlobeToFinalPosition() {
    // Show flight tracking layer during animation
    showFlightTrackingLayer(map);
    
    // Step 1: Rotate around North Pole (fast)
    const rotationDuration = 2000; // 2 seconds for rotation
    const movementDuration = 3000; // 3 seconds for movement to North America
    
    const endCenter = finalMapConfig.center; // Final position in North America
    const startZoom = initialMapConfig.zoom;
    const endZoom = finalMapConfig.zoom;
    const fixedLatitude = 70; // Fixed latitude for the rotation circle
    
    // Step 1: Rotate around North Pole
    const rotateAroundNorthPole = () => {
        // Single continuous rotation animation
        
        // One smooth rotation from 270 to -90 degrees (180° total rotation)
        map.easeTo({
            center: [-90, fixedLatitude],
            zoom: startZoom,
            duration: rotationDuration,
            easing: (t) => t // Linear easing for smooth rotation
        });
        
        // After rotation completes, start Step 2 from the -90° position
        setTimeout(() => {
            moveToNorthAmerica();
        }, rotationDuration);
    };
    
    // Step 2: Move to North America with fast-to-slow transition
    const moveToNorthAmerica = () => {
        // Start from the -90° position and move to North America
        const movementSteps = 80;
        const movementStepDuration = movementDuration / movementSteps;
        
        let currentMovementStep = 0;
        
        const moveToFinalPosition = () => {
            if (currentMovementStep >= movementSteps) {
                // Animation complete - hide flight tracking layer
                hideFlightTrackingLayer(map);
                return;
            }
            
            const progress = currentMovementStep / movementSteps;
            
            // Use ease-out function for fast-to-slow transition
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
            
            // Interpolate center coordinates from -90° to final position
            const currentLng = -90 + (endCenter[0] - (-90)) * easedProgress;
            const currentLat = fixedLatitude + (endCenter[1] - fixedLatitude) * easedProgress;
            
            // Smooth zoom from starting zoom to final position
            const currentZoom = startZoom + (endZoom - startZoom) * easedProgress;
            
            // Update map view
            map.easeTo({
                center: [currentLng, currentLat],
                zoom: currentZoom,
                duration: movementStepDuration,
                easing: (t) => t // Linear easing for smooth movement
            });
            
            currentMovementStep++;
            setTimeout(moveToFinalPosition, movementStepDuration);
        };
        
        // Start movement animation
        moveToFinalPosition();
    };
    
    // Start the rotation animation after a brief delay
    setTimeout(rotateAroundNorthPole, 500);
}

// Make the animation function globally available so it can be called from the loading screen
window.startGlobeAnimation = animateGlobeToFinalPosition;

// Make panel functions globally available
window.setCurrentActivityIndex = setCurrentActivityIndex;
window.setActivityCityFilter = setActivityCityFilter;
window.setCurrentBonusIndex = setCurrentBonusIndex;
window.showBonusPanel = showBonusPanel;
window.closeBonusPanel = closeBonusPanel;

// Initialize detail panel functionality
initializeDetailPanel();

// Initialize edit panel functionality
initializeEditPanel();

// Make showDetailPanel globally available
window.showDetailPanel = showDetailPanel;
window.showMessagesPanel = showMessagesPanel;
window.setCurrentMessageIndex = setCurrentMessageIndex;

// Function to protect map icons from dark mode
function protectMapIcons() {
    // Force light color scheme on map container
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.style.colorScheme = 'light only';
    }
    
    // Protect all mapbox elements
    const mapboxElements = document.querySelectorAll('.mapboxgl-canvas, .mapboxgl-marker, .mapboxgl-popup');
    mapboxElements.forEach(element => {
        element.style.colorScheme = 'light only';
        element.style.filter = 'none';
        element.style.webkitFilter = 'none';
        element.style.mozFilter = 'none';
        element.style.msFilter = 'none';
        element.style.oFilter = 'none';
    });
}

// Function to continuously monitor and protect map icons
function setupMapIconProtection() {
    // Use a more efficient approach with debouncing
    let timeoutId = null;
    
    const observer = new MutationObserver((mutations) => {
        // Debounce the protection to avoid excessive calls
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
            let needsProtection = false;
            
            // Quick check if any mapbox elements were added
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && (
                            node.classList.contains('mapboxgl-canvas') ||
                            node.classList.contains('mapboxgl-marker') ||
                            node.classList.contains('mapboxgl-popup')
                        )) {
                            needsProtection = true;
                        }
                        
                        // Only check children if we haven't found a direct match
                        if (!needsProtection && node.querySelectorAll) {
                            const mapboxElements = node.querySelectorAll('.mapboxgl-canvas, .mapboxgl-marker, .mapboxgl-popup');
                            if (mapboxElements.length > 0) {
                                needsProtection = true;
                            }
                        }
                    }
                });
            });
            
            // Only apply protection if mapbox elements were actually added
            if (needsProtection) {
                const mapboxElements = document.querySelectorAll('.mapboxgl-canvas, .mapboxgl-marker, .mapboxgl-popup');
                mapboxElements.forEach(element => {
                    // Only apply if not already protected
                    if (element.style.colorScheme !== 'light only') {
                        element.style.colorScheme = 'light only';
                        element.style.filter = 'none';
                        element.style.webkitFilter = 'none';
                        element.style.mozFilter = 'none';
                        element.style.msFilter = 'none';
                        element.style.oFilter = 'none';
                    }
                });
            }
        }, 100); // 100ms debounce
    });
    
    // Only observe the map container, not the entire document
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        observer.observe(mapContainer, {
            childList: true,
            subtree: true
        });
    }
    
    // Store observer reference for cleanup
    window.mapIconProtectionObserver = observer;
    
    return observer;
}

// Function to cleanup map icon protection
function cleanupMapIconProtection() {
    if (window.mapIconProtectionObserver) {
        window.mapIconProtectionObserver.disconnect();
        window.mapIconProtectionObserver = null;
    }
}

// Add layers when map loads
map.on('style.load', async () => {
    // Small delay to ensure map is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Protect map icons from dark mode
    protectMapIcons();
    
    // Setup continuous protection for map icons
    setupMapIconProtection();
    
    // Load custom concert images
    loadConcertImages(map);
    
    // Load star icons for fan wishes
    await loadStarIcons(map);
    
    // Load MiJie icons for fans activities (regular and highlight)
    await loadMiJieIcons(map);
    
    // Load bonus icon
    await loadBonusIcon(map);
    
            // Load heart icons for coco-checkin
            await loadHeartIcons(map);
    
    // Load layers in specific order: flight first, then others
    try {
        // 1. Load flying tracking layer first (before any other layers)
        await loadFlyingTrackingData(map);
        
        // 2. Load fans activities fill layer (states/provinces)
        await loadFansActivitiesFillData(map);
        
        // 3. Load city markers layer (MiJie icons for cities)
        await loadLayer(cityMarkersLayer, map);
        
        // 4. Load fans activities symbol layer (MiJie icons)
        await loadLayer(fansActivitiesLayer, map);
        
        // 5. Load fan wishes layer
        await loadLayer(fanWishesLayer, map);
        
        // 6. Load coco-checkin layer
        await loadLayer(cocoCheckinLayer, map);
        
        // 7. Load bonus layer
        await loadLayer(bonusLayer, map);
        
        // 8. Load concerts layer last
        await loadLayer(concertsLayer, map);
        
        // Don't start the globe animation immediately - it will be called from the loading screen
        // animateGlobeToFinalPosition();
        
    } catch (error) {
        console.error('Error loading layers:', error);
    }
});

// Popup handling
map.on('click', (e) => handleMapClick(e, map));

// Logo click functionality (replaces zoom home button)
const headerLogo = document.getElementById('header-logo');
if (headerLogo) {
    headerLogo.addEventListener('click', () => handleZoomHomeClick(map));
}
