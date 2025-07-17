import { showFanWishPopup } from '../layers/fanWishesLayer.js';
import { showFansActivityPopup } from '../layers/fansActivitiesLayer.js';
import { showBonusPopup } from '../layers/bonusLayer.js';
import { filterFlightTracksByConcert, resetFlightTracks } from '../layers/flyingTrackingLayer.js';
import { handleCityMarkerClick } from '../layers/fansActivitiesLayer.js';
import { showDetailPanel } from '../panels/index.js';
import { closeFansActivitiesPanel } from '../panels/fansActivitiesPanel.js';

// Handle map click events
export function handleMapClick(e, map) {
    const features = map.queryRenderedFeatures(e.point);
    if (!features.length) return;

    // Filter features to only include those from our custom layers
    const relevantFeatures = features.filter(feature => {
        // Only include features from our custom layers
        return feature.layer && (
            feature.layer.id === 'fan-wishes' ||
            feature.layer.id === 'fan-wishes-unclustered' ||
            feature.layer.id === 'concerts' ||
            feature.layer.id === 'flying-tracking' ||
            feature.layer.id === 'fans-activities' ||
            feature.layer.id === 'fans-activities-circles' ||
            feature.layer.id === 'fans-activities-fill' ||
            feature.layer.id === 'bonus' ||
            feature.layer.id === 'city-markers'
        );
    });

    if (!relevantFeatures.length) return;

    const feature = relevantFeatures[0];
    const coordinates = feature.geometry.coordinates.slice();
    const properties = feature.properties;

    // Skip flying track features - no popup for them
    if (properties.type === 'od_track') {
        return;
    }

    // Handle cluster clicks
    if (feature.layer.id === 'fan-wishes' && properties.cluster) {
        // Close fans activities panel if it's open
        if (window.closeFansActivitiesPanel) {
            window.closeFansActivitiesPanel();
        }
        
        // Close messages panel if it's open
        if (window.closeMessagesPanel) {
            window.closeMessagesPanel();
        }
        
        const sourceId = 'fan-wishes-source';
        const source = map.getSource(sourceId);
        
        // Get cluster expansion zoom
        source.getClusterExpansionZoom(properties.cluster_id, (err, zoom) => {
            if (err) return;
            
            // Fly to the cluster with more aggressive zoom
            map.easeTo({
                center: coordinates,
                zoom: Math.min(zoom + 3, 16), // Add 3 zoom levels for very aggressive expansion
                duration: 500
            });
        });
        return;
    }
    
    // Determine feature type based on properties
    let featureType = 'unknown';
    if (properties.fakeId && properties.displayName && properties.category) {
        featureType = 'fan_activity';
    } else if (properties.fakeId && properties.displayName) {
        featureType = 'fan_wish';
    } else if (properties.title && properties.id && properties.id.startsWith('SS')) {
        featureType = 'bonus';
    } else if (properties.title) {
        featureType = 'concert';
    } else if (properties.name && properties.flyToCoords) {
        featureType = 'city_marker';
    }
    
    // For concerts, open detail panel directly
    if (featureType === 'concert') {
        handleConcertClick(map, coordinates, properties);
        return;
    }
    
    // For fans activities, check if there are multiple activities at this location
    if (featureType === 'fan_activity') {
        handleFanActivityClick(coordinates, properties);
        return;
    }
    
    // For fan wishes, check if there are multiple messages at this location
    if (featureType === 'fan_wish') {
        handleFanWishClick(coordinates, properties);
        return;
    }
    
    // For bonus items, show popup directly
    if (featureType === 'bonus') {
        handleBonusClick(coordinates, properties);
        return;
    }
    
    // For city markers, handle click to fly to target coordinates
    if (featureType === 'city_marker') {
        handleCityMarkerClick(coordinates, properties);
        return;
    }
}

// Handle concert click events
function handleConcertClick(map, coordinates, properties) {
    // Close fans activities panel if it's open
    if (window.closeFansActivitiesPanel) {
        window.closeFansActivitiesPanel();
    }
    
    // Close messages panel if it's open
    if (window.closeMessagesPanel) {
        window.closeMessagesPanel();
    }
    
    // Close bonus panel if it's open
    if (window.closeBonusPanel) {
        window.closeBonusPanel();
    }
    
    // Show flying tracking layer and activate its sidebar item
    if (map.getLayer('flying-tracking')) {
        map.setLayoutProperty('flying-tracking', 'visibility', 'visible');
    }
    
    // Activate the flying tracking sidebar item
    const flyingTrackingItem = document.querySelector('.sidebar-item[data-layer="flying-tracking"]');
    if (flyingTrackingItem) {
        flyingTrackingItem.classList.add('active');
    }
    
    // Filter flight tracks to show only those going to this concert
    if (properties.id) {
        filterFlightTracksByConcert(map, properties.id);
    }
    
    // Check if we're on mobile (panel slides up from bottom) or desktop (panel slides in from right)
    const isMobile = window.innerWidth <= 768;
    
    let flyToOptions = {
        center: coordinates,
        zoom: 4, // Zoom level for city view
        duration: 1000,
        easing: (t) => t * (2 - t) // Ease out function for smooth animation
    };
    
    // On desktop, adjust center to account for the 30% detail panel on the right
    if (!isMobile) {
        const mapContainer = map.getContainer();
        const mapWidth = mapContainer.offsetWidth;
        const mapCenterX = mapWidth * 0.35; // Center of the left 70% area (35% from left edge)
        
        flyToOptions.offset = [mapCenterX - mapWidth / 2, 0]; // Offset to center in the left 70% area
    } else {
        // On mobile, center the point on the top half of the window
        const mapContainer = map.getContainer();
        const mapHeight = mapContainer.offsetHeight;
        const mapCenterY = mapHeight * 0.25; // Center of the top half (25% from top edge)
        
        flyToOptions.offset = [0, mapCenterY - mapHeight / 2]; // Offset to center in the top half
    }
    
    // Zoom and center on the concert location
    map.flyTo(flyToOptions);
    
    // Set opening flags immediately to prevent document click from closing the panel
    const panel = document.getElementById('detail-panel');
    if (panel) {
        panel.dataset.opening = 'true';
        panel.dataset.openingNew = 'true';
    }
    
    // Open detail panel after a short delay to allow zoom animation to start
    setTimeout(() => {
        showDetailPanel('concert', properties);
    }, 200);
}

// Handle fan activity click events
function handleFanActivityClick(coordinates, properties) {
    // Close messages panel if it's open
    if (window.closeMessagesPanel) {
        window.closeMessagesPanel();
    }
    
    // Use the data manager for efficient location-based queries
    if (properties.fakeId) {
        showFansActivityPopup(properties.fakeId, coordinates);
    } else {
        console.error('No fakeId found in properties:', properties);
    }
}

// Handle fan wish click events
function handleFanWishClick(coordinates, properties) {
    // Close fans activities panel if it's open
    if (window.closeFansActivitiesPanel) {
        window.closeFansActivitiesPanel();
    }
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;
    
    // Get current zoom level and ensure we don't zoom out
    const currentZoom = window.map.getZoom();
    const targetZoom = Math.max(currentZoom, 6);
    
    // On mobile, center the point in the top 70% of the screen (accounting for 30% bottom sheet)
    if (isMobile) {
        const mapContainer = window.map.getContainer();
        const mapHeight = mapContainer.offsetHeight;
        const mapCenterY = mapHeight * 0.35; // Center of the top 70% area (35% from top edge)
        
        // Fly to the location with offset to center in the top 70%
        window.map.flyTo({
            center: coordinates,
            zoom: targetZoom, // Use current zoom level or minimum of 6
            duration: 1000,
            easing: (t) => t * (2 - t), // Ease out function for smooth animation
            offset: [0, mapCenterY - mapHeight / 2] // Offset to center in the top 70%
        });
    } else {
        // On desktop, just fly to the location without offset
        window.map.flyTo({
            center: coordinates,
            zoom: targetZoom, // Use current zoom level or minimum of 6
            duration: 1000,
            easing: (t) => t * (2 - t) // Ease out function for smooth animation
        });
    }
    
    // Use fakeId directly for message identification
    if (properties.fakeId) {
        showFanWishPopup(properties.fakeId, coordinates);
    } else {
        console.error('No fakeId found in properties:', properties);
    }
}

// Handle bonus click events
function handleBonusClick(coordinates, properties) {
    // Close fans activities panel if it's open
    if (window.closeFansActivitiesPanel) {
        window.closeFansActivitiesPanel();
    }
    
    // Close messages panel if it's open
    if (window.closeMessagesPanel) {
        window.closeMessagesPanel();
    }
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;
    
    // Get current zoom level and ensure we don't zoom out
    const currentZoom = window.map.getZoom();
    const targetZoom = Math.max(currentZoom, 6);
    
    // On mobile, center the point in the top 70% of the screen (accounting for 30% bottom sheet)
    if (isMobile) {
        const mapContainer = window.map.getContainer();
        const mapHeight = mapContainer.offsetHeight;
        const mapCenterY = mapHeight * 0.35; // Center of the top 70% area (35% from top edge)
        
        // Fly to the location with offset to center in the top 70%
        window.map.flyTo({
            center: coordinates,
            zoom: targetZoom, // Use current zoom level or minimum of 6
            duration: 1000,
            easing: (t) => t * (2 - t), // Ease out function for smooth animation
            offset: [0, mapCenterY - mapHeight / 2] // Offset to center in the top 70%
        });
    } else {
        // On desktop, just fly to the location without offset
        window.map.flyTo({
            center: coordinates,
            zoom: targetZoom, // Use current zoom level or minimum of 6
            duration: 1000,
            easing: (t) => t * (2 - t) // Ease out function for smooth animation
        });
    }
    
    // Show bonus popup
    if (properties.id) {
        showBonusPopup(properties.id, coordinates);
    } else {
        console.error('No id found in properties:', properties);
    }
}

// Handle zoom home button click
export function handleZoomHomeClick(map) {
    // Close fans activities panel if it's open
    if (window.closeFansActivitiesPanel) {
        window.closeFansActivitiesPanel();
    }
    
    // Close messages panel if it's open
    if (window.closeMessagesPanel) {
        window.closeMessagesPanel();
    }
    
    // Close bonus panel if it's open
    if (window.closeBonusPanel) {
        window.closeBonusPanel();
    }
    
    // Close all popups
    if (window.closeBonusPopup) {
        window.closeBonusPopup();
    }
    
    if (window.closeFanWishPopup) {
        window.closeFanWishPopup();
    }
    
    if (window.closeActivityPopup) {
        window.closeActivityPopup();
    }
    
    // Reset all layers to their initial states
    // 1. Concerts layer - visible by default
    if (map.getLayer('concerts')) {
        map.setLayoutProperty('concerts', 'visibility', 'visible');
    }
    
    // 2. Fan wishes layer - visible by default
    if (map.getLayer('fan-wishes')) {
        map.setLayoutProperty('fan-wishes', 'visibility', 'visible');
    }
    if (map.getLayer('fan-wishes-unclustered')) {
        map.setLayoutProperty('fan-wishes-unclustered', 'visibility', 'visible');
    }
    
    // 3. Fans activities layer - visible by default
    if (map.getLayer('fans-activities')) {
        map.setLayoutProperty('fans-activities', 'visibility', 'visible');
    }
    if (map.getLayer('city-markers')) {
        map.setLayoutProperty('city-markers', 'visibility', 'visible');
    }
    if (map.getLayer('fans-activities-fill')) {
        map.setLayoutProperty('fans-activities-fill', 'visibility', 'visible');
    }
    
    // 4. Bonus layer - visible by default
    if (map.getLayer('bonus')) {
        map.setLayoutProperty('bonus', 'visibility', 'visible');
    }
    
    // 5. Flying tracking layer - hidden by default
    if (map.getLayer('flying-tracking')) {
        map.setLayoutProperty('flying-tracking', 'visibility', 'none');
    }
    
    // Reset all sidebar items to their initial states
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        const layerId = item.getAttribute('data-layer');
        
        if (layerId === 'flying-tracking') {
            // Flying tracking layer is hidden by default, so set inactive
            item.classList.remove('active');
            item.classList.add('inactive');
        } else {
            // All other layers are visible by default, so set active
            item.classList.add('active');
            item.classList.remove('inactive');
        }
    });
    
    // Reset flight tracks to show all
    resetFlightTracks(map);
    
    // Fly to the original map configuration and reset all map properties
    map.flyTo({
        center: [-98.5795, 39.8283], // Original map center
        zoom: window.innerWidth > 768 ? 3.5 : 2.5, // Original zoom levels
        bearing: 0, // Reset rotation to north
        pitch: 0, // Reset pitch to flat view
        duration: 1000,
        easing: (t) => t * (2 - t) // Ease out function for smooth animation
    });
} 