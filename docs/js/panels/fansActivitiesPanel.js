import { baseUrl } from '../config.js';
import { createVideoCoverFromObject, createPhotoElement } from '../utils/mediaUtils.js';
import { initFansActivitiesDraggablePanel, getFansActivitiesDraggablePanelInstance } from '../utils/draggablePanel.js';
import { loadCityMarkersData } from '../layers/fansActivitiesLayer.js';

// Fans Activities Panel for displaying all fan activities
let fansActivitiesPanel = null;
let currentSelectedActivityFakeId = null;
let currentFilterCity = null;
let availableCities = []; // Array of unique cities for navigation
let currentCityIndex = 0; // Current city index in the navigation

// Memory management tracking
let eventListeners = new Map();
let activeTimeouts = new Set(); // Track active timeouts for cleanup

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

// Function to format date
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

// Function to cleanup event listeners
function cleanupEventListeners() {
    eventListeners.forEach((listener, element) => {
        if (element && element.removeEventListener) {
            element.removeEventListener('click', listener);
        }
    });
    eventListeners.clear();
    
    // Remove document click listener
    document.removeEventListener('click', handleDocumentClick);
}

// Function to cleanup only activity event listeners (preserves document click listener)
function cleanupActivityEventListeners() {
    eventListeners.forEach((listener, element) => {
        if (element && element.removeEventListener) {
            element.removeEventListener('click', listener);
        }
    });
    eventListeners.clear();
}

// Function to cleanup timeouts
function cleanupTimeouts() {
    activeTimeouts.forEach(timeoutId => {
        if (typeof timeoutId === 'number') {
            clearTimeout(timeoutId);
            clearInterval(timeoutId);
        }
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

// Function to handle document clicks for panel closing
const handleDocumentClick = (e) => {
    const panel = document.getElementById('fans-activities-panel');
    
    if (!panel) return;
    
    // Don't close if we're in the process of opening
    if (panel.dataset.opening === 'true' || panel.dataset.openingNew === 'true') {
        return;
    }
    
    // Don't close if clicking on a marker (this will trigger a new panel to open)
    const isClickOnMarker = e.target.closest('.mapboxgl-marker');
    if (isClickOnMarker) {
        return;
    }
    
    const isClickInsidePanel = panel.contains(e.target);
    const isClickOnPopup = e.target.closest('.mapboxgl-popup');

    if (!isClickInsidePanel && !isClickOnPopup) {
        // Only close if panel is currently active
        if (panel.classList.contains('active')) {
            closeFansActivitiesPanel();
        }
    }
};

// Function to create media content HTML with redirection for videos
async function createMediaContent(activity) {
    let mediaContent = '';
    
    // Check if activity has video content (YouTube or Bilibili)
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
        mediaContent = createPhotoElement(`img/activities/${activity.properties.photo_names}`, 'Activity Photo', 'activity-image-panel');
    }
    
    return mediaContent;
}

// Function to create the fans activities panel
export function createFansActivitiesPanel() {
    if (fansActivitiesPanel) {
        return fansActivitiesPanel;
    }

    // Create panel container
    const panel = document.createElement('div');
    panel.id = 'fans-activities-panel';
    panel.className = 'fans-activities-panel';
    
    // Create panel content
    panel.innerHTML = `
        <div class="panel-header">
            <div class="header-content">
                <h2>粉丝活动${currentFilterCity ? ` - ${escapeHtml(currentFilterCity)}` : ''}</h2>
            </div>
            <div class="navigation-buttons">
                <button class="nav-btn prev-btn" onclick="navigateToPreviousCity()" title="上一个城市">&lt;</button>
                <button class="nav-btn next-btn" onclick="navigateToNextCity()" title="下一个城市">&gt;</button>
            </div>
        </div>
        <div class="panel-body">
            <div class="activities-list" id="activities-list">
                <div class="loading-activities">
                    <p>Loading activities...</p>
                </div>
            </div>
        </div>
    `;

    // Add panel to body
    document.body.appendChild(panel);
    fansActivitiesPanel = panel;

    // Initialize draggable panel functionality
    // Initialize for both mobile and desktop (for testing)
    // The draggable panel initialization is now handled by the panel's init function
    // when it becomes active.

    // Wait for data to be available before loading activities
    waitForDataAndLoadActivities();

    return panel;
}

// Function to wait for data to be available and then load activities
async function waitForDataAndLoadActivities() {
    let attempts = 0;
    const maxAttempts = 50; // Wait up to 5 seconds (50 * 100ms)
    
    while (attempts < maxAttempts) {
        // Check if data is available
        if (window.dataManager && typeof window.dataManager.getData === 'function' && window.dataManager.getData().length > 0) {
            loadAllActivities();
            return;
        }
        
        if (window.allFansActivities && window.allFansActivities.length > 0) {
            loadAllActivities();
            return;
        }
        
        // Wait 100ms before next attempt
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    // If we get here, data still isn't available after max attempts
    loadAllActivities();
}

// Function to load activities filtered by city
async function loadAllActivities() {
    try {
        // Use data manager for consistency with popup function
        let activities = [];
        if (window.dataManager && typeof window.dataManager.getData === 'function') {
            activities = window.dataManager.getData() || [];
        } else {
            // Fallback to window.allFansActivities if data manager is not available
            activities = window.allFansActivities || [];
        }
        
        const activitiesList = document.getElementById('activities-list');
        
        if (activities.length === 0) {
            activitiesList.innerHTML = '<p>No activities available.</p>';
            return;
        }

        // Initialize available cities if not already done
        if (availableCities.length === 0) {
            try {
                availableCities = await getUniqueCitiesFromCityMarkers();
            } catch (error) {
                console.warn('Failed to load cities from markers, falling back to activities data:', error);
                availableCities = getUniqueCitiesFromActivities(activities);
            }
            
            // Set initial city if no city filter is set
            if (!currentFilterCity && availableCities.length > 0) {
                currentFilterCity = availableCities[0];
                currentCityIndex = 0;
            }
        }

        // Filter activities by city if a city filter is set
        let filteredActivities = activities;
        if (currentFilterCity) {
            filteredActivities = activities.filter(activity => 
                currentFilterCity.includes(activity.properties.city)
                || activity.properties.city.includes(currentFilterCity)
            );
        }

        if (filteredActivities.length === 0) {
            const cityText = currentFilterCity ? ` for ${currentFilterCity}` : '';
            activitiesList.innerHTML = `<p>No activities available${cityText}.</p>`;
            return;
        }

        // Update the panel header to show current city filter
        updatePanelHeader();

        // Create activities HTML with async media content creation
        const activitiesHTMLPromises = filteredActivities.map(async (activity, index) => {
            const location = activity.properties.city || '';
            const activityTitle = activity.properties.displayName || 'Activity';
            const activityDate = formatDate(activity.properties.timestamp) || '';
            const mediaContent = await createMediaContent(activity);
            
            return `
                <div class="activity-item" data-activity-fake-id="${activity.properties.fakeId}">
                    <div class="activity-header">
                        <span class="activity-title">${escapeHtml(activityTitle)} / ${escapeHtml(activityDate)}</span>
                    </div>
                    <div class="activity-date">${escapeHtml(location)}</div>
                    <div class="activity-media-container">
                        ${mediaContent}
                    </div>
                </div>
            `;
        });
        
        // Wait for all media content to be created
        const activitiesHTMLArray = await Promise.all(activitiesHTMLPromises);
        const activitiesHTML = activitiesHTMLArray.join('');

        activitiesList.innerHTML = activitiesHTML;
        
        // Setup event listeners for activity items
        setupActivityEventListeners();
        
        // After content is loaded, check if we need to select a current activity
        if (currentSelectedActivityFakeId) {
            // Try both string and number versions of the fakeId
            let currentItem = document.querySelector(`[data-activity-fake-id="${currentSelectedActivityFakeId}"]`);
            if (!currentItem && typeof currentSelectedActivityFakeId === 'number') {
                // Try string version
                currentItem = document.querySelector(`[data-activity-fake-id="${currentSelectedActivityFakeId.toString()}"]`);
            } else if (!currentItem && typeof currentSelectedActivityFakeId === 'string') {
                // Try number version
                const numericFakeId = parseInt(currentSelectedActivityFakeId, 10);
                if (!isNaN(numericFakeId)) {
                    currentItem = document.querySelector(`[data-activity-fake-id="${numericFakeId}"]`);
                }
            }
            
            if (currentItem) {
                // Remove any previous selection
                const previousSelected = document.querySelector('.activity-item.selected');
                if (previousSelected) {
                    previousSelected.classList.remove('selected');
                }
                
                // Add selection to current item
                currentItem.classList.add('selected');
                scrollToActivity(currentSelectedActivityFakeId);
            }
        } else {
            // Auto-select the first activity if no specific activity is selected
            const firstActivity = document.querySelector('.activity-item');
            if (firstActivity) {
                const fakeId = firstActivity.getAttribute('data-activity-fake-id');
                if (fakeId) {
                    selectActivityInPanel(fakeId);
                }
            }
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        const activitiesList = document.getElementById('activities-list');
        activitiesList.innerHTML = '<p>Error loading activities.</p>';
    }
}

// Function to ensure document click listener is attached
function ensureDocumentClickListener() {
    const panel = document.getElementById('fans-activities-panel');
    if (panel && panel.classList.contains('active')) {
        // Remove any existing listener first to prevent duplicates
        document.removeEventListener('click', handleDocumentClick);
        // Add the listener
        document.addEventListener('click', handleDocumentClick);
    }
}

// Function to setup event listeners for activity items
function setupActivityEventListeners() {
    // Cleanup existing activity event listeners first (preserves document click listener)
    cleanupActivityEventListeners();
    
    // Add click listeners to activity items
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        const fakeId = item.getAttribute('data-activity-fake-id');
        if (fakeId) {
            const listener = () => selectActivityInPanel(fakeId);
            item.addEventListener('click', listener);
            eventListeners.set(item, listener);
        }
    });
    
    // Ensure document click listener is attached
    ensureDocumentClickListener();
}

// Function to update the panel header with current city filter
function updatePanelHeader() {
    if (fansActivitiesPanel) {
        const headerContent = fansActivitiesPanel.querySelector('.header-content');
        if (headerContent) {
            const h2Element = headerContent.querySelector('h2');
            if (h2Element) {
                h2Element.innerHTML = `粉丝活动${currentFilterCity ? ` - ${escapeHtml(currentFilterCity)}` : ''}`;
            }
        }
    }
}

// Function to show the fans activities panel
export function showFansActivitiesPanel(city = null, fakeId = null) {
    // Set the city filter if provided
    if (city) {
        currentFilterCity = city;
        // Find the city index in available cities
        if (availableCities.length > 0) {
            const cityIndex = availableCities.indexOf(city);
            if (cityIndex !== -1) {
                currentCityIndex = cityIndex;
            }
        }
    }
    
    // Set the current activity if provided
    if (fakeId) {
        currentSelectedActivityFakeId = fakeId;
    }
    
    const panel = createFansActivitiesPanel();
    
    // Set opening flags to prevent immediate closing
    panel.dataset.opening = 'true';
    panel.dataset.openingNew = 'true';
    
    panel.classList.add('active');
    
    // Initialize draggable panel functionality
    initFansActivitiesDraggablePanel();
    
    // Clear any existing selection first
    const previousSelected = document.querySelector('.activity-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }
    
    // Reload activities to ensure fresh content with correct selection
    loadAllActivities();
    
    // Add document click listener with a delay to prevent interference with opening
    addTrackedTimeout(() => {
        document.addEventListener('click', handleDocumentClick);
    }, 100);
    
    // Remove the flags after a short delay
    addTrackedTimeout(() => {
        if (panel) {
            delete panel.dataset.opening;
            delete panel.dataset.openingNew;
        }
    }, 150);
}

// Function to close the fans activities panel
export function closeFansActivitiesPanel() {
    if (fansActivitiesPanel) {
        // On mobile, use the draggable panel's snap closed functionality
        const draggableInstance = getFansActivitiesDraggablePanelInstance();
        if (window.innerWidth <= 768 && draggableInstance) {
            // Delay cleanup until after animation completes to prevent interference
            draggableInstance.snapClosed();
            
            // Clean up event listeners and other cleanup after animation completes
            addTrackedTimeout(() => {
                cleanupEventListeners();
                cleanupTimeouts(); // Clear tracked timeouts
                cleanupMediaElements(); // Clean up media elements
                
                // Clear highlighting when panel is closed
                if (window.clearActivityHighlight) {
                    window.clearActivityHighlight();
                }
                
                // Log memory usage after cleanup
                logMemoryUsage();
            }, 450); // Slightly longer than the 400ms animation to ensure completion
        } else {
            fansActivitiesPanel.classList.remove('active');
            
            // For desktop, cleanup immediately since there's no animation
            cleanupEventListeners();
            cleanupTimeouts(); // Clear tracked timeouts
            cleanupMediaElements(); // Clean up media elements
            
            // Clear highlighting when panel is closed
            if (window.clearActivityHighlight) {
                window.clearActivityHighlight();
            }
            
            // Log memory usage after cleanup
            logMemoryUsage();
        }
    }
}

// Helper function to find activity by fakeId (uses data manager if available)
function findActivityByFakeId(fakeId) {
    // Use the data manager directly for consistency with popup function
    if (window.dataManager && typeof window.dataManager.findById === 'function') {
        const activity = window.dataManager.findById(fakeId);
        if (activity) {
            return activity;
        }
    }
    
    // Fallback: try to find in window.allFansActivities if data manager is not available
    if (window.allFansActivities && window.allFansActivities.length > 0) {
        const activity = window.allFansActivities.find(activity => activity.properties.fakeId == fakeId);
        if (activity) {
            return activity;
        }
    }
    
    return null;
}

// Function to select an activity in the panel
export function selectActivityInPanel(fakeId) {
    const activity = findActivityByFakeId(fakeId);
    if (!activity) {
        console.error('Activity not found with fakeId:', fakeId);
        return;
    }

    // Update current selected fakeId
    currentSelectedActivityFakeId = fakeId;

    // Remove previous selection
    const previousSelected = document.querySelector('.activity-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }

    // Add selection to current item
    const currentItem = document.querySelector(`[data-activity-fake-id="${fakeId}"]`);
    if (currentItem) {
        currentItem.classList.add('selected');
        scrollToActivity(fakeId);
    }

    // Locate activity on map
    if (activity.geometry && activity.geometry.coordinates) {
        const coordinates = activity.geometry.coordinates;
        
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
        
        // On mobile, center on the top 50% of the map (same as concert/bonus panels)
        if (isMobile) {
            const mapContainer = window.map.getContainer();
            const mapHeight = mapContainer.offsetHeight;
            const centerOffset = mapHeight * 0.25; // Move center down by 25% of map height
            
            flyToOptions.offset = [0, -centerOffset]; // Negative to move down
        }
        
        // Fly to the location with zoom
        window.map.flyTo(flyToOptions);

        // Highlight the activity on the map
        if (window.highlightActivity) {
            window.highlightActivity(fakeId);
        }
    }

    // Keep panel open on mobile - don't close it
    // Panel will stay open for better user experience
}

// Function to scroll to a specific activity
function scrollToActivity(fakeId) {
    const activityElement = document.querySelector(`[data-activity-fake-id="${fakeId}"]`);
    if (activityElement) {
        // Get the activities list container
        const activitiesList = document.getElementById('activities-list');
        if (activitiesList) {
            // Find the activity header within the activity element
            const activityHeader = activityElement.querySelector('.activity-header');
            
            if (activityHeader) {
                // Calculate the scroll position to center the header
                const scrollTop = activitiesList.scrollTop;
                const elementTop = activityElement.offsetTop;
                const headerTop = activityHeader.offsetTop;
                const containerHeight = activitiesList.clientHeight;
                const headerHeight = activityHeader.offsetHeight;
                
                // Calculate the position where the header should be centered
                const headerCenterPosition = elementTop + headerTop + (headerHeight / 2);
                const targetScrollTop = headerCenterPosition - (containerHeight / 2);
                
                // Smooth scroll to the calculated position
                activitiesList.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            } else {
                // Fallback: center the entire activity element if header not found
                const elementTop = activityElement.offsetTop;
                const containerHeight = activitiesList.clientHeight;
                const elementHeight = activityElement.offsetHeight;
                
                const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
                
                activitiesList.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            }
        } else {
            // Fallback to scrollIntoView if container not found
            activityElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
}

// Function to set the currently selected activity (called from popup)
export function setCurrentActivityIndex(fakeId) {
    currentSelectedActivityFakeId = fakeId;
    
    // Get the city from the current activity and update filter if needed
    if (currentSelectedActivityFakeId) {
        const activity = findActivityByFakeId(currentSelectedActivityFakeId);
        if (activity && activity.properties.city) {
            const newCity = activity.properties.city;
            if (newCity !== currentFilterCity) {
                currentFilterCity = newCity;
                
                // Update the city index if available cities are loaded
                if (availableCities.length > 0) {
                    const cityIndex = availableCities.indexOf(newCity);
                    if (cityIndex !== -1) {
                        currentCityIndex = cityIndex;
                    }
                }
                
                // Reload activities with new city filter
                if (fansActivitiesPanel && fansActivitiesPanel.classList.contains('active')) {
                    loadAllActivities();
                    // Don't try to select here as loadAllActivities will handle it
                    return;
                }
            }
        }
    }
    
    // If panel is open and content is loaded, update the selection
    if (fansActivitiesPanel && fansActivitiesPanel.classList.contains('active') && currentSelectedActivityFakeId) {
        
        // Remove previous selection
        const previousSelected = document.querySelector('.activity-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Try both string and number versions of the fakeId
        let currentItem = document.querySelector(`[data-activity-fake-id="${currentSelectedActivityFakeId}"]`);
        if (!currentItem && typeof currentSelectedActivityFakeId === 'number') {
            // Try string version
            currentItem = document.querySelector(`[data-activity-fake-id="${currentSelectedActivityFakeId.toString()}"]`);
        } else if (!currentItem && typeof currentSelectedActivityFakeId === 'string') {
            // Try number version
            const numericFakeId = parseInt(currentSelectedActivityFakeId, 10);
            if (!isNaN(numericFakeId)) {
                currentItem = document.querySelector(`[data-activity-fake-id="${numericFakeId}"]`);
            }
        }
        
        if (currentItem) {
            currentItem.classList.add('selected');
            scrollToActivity(currentSelectedActivityFakeId);
            
            // Also highlight the activity on the map
            if (window.highlightActivity) {
                window.highlightActivity(currentSelectedActivityFakeId);
            }
        } else {
            // Could not find activity item with fakeId
        }
    }
}

// Function to set the city filter and reload activities
export function setActivityCityFilter(city) {
    currentFilterCity = city;
    
    // Update the city index if available cities are loaded
    if (availableCities.length > 0) {
        const cityIndex = availableCities.indexOf(city);
        if (cityIndex !== -1) {
            currentCityIndex = cityIndex;
        }
    }
    
    if (fansActivitiesPanel && fansActivitiesPanel.classList.contains('active')) {
        loadAllActivities();
    }
}

// Make setActivityCityFilter globally available
window.setActivityCityFilter = setActivityCityFilter;

// Function to manually trigger cleanup (for testing/debugging)
export function forceCleanup() {
    cleanupEventListeners();
    cleanupTimeouts(); // Clear tracked timeouts
    cleanupMediaElements(); // Clean up media elements
    logMemoryUsage();
}

// Function to log memory usage for debugging
export function logMemoryUsage() {
    const eventListenerCount = eventListeners.size;
    const timeoutCount = activeTimeouts.size;
    const activityItemsCount = document.querySelectorAll('.activity-item').length;
    const videoCoverCount = document.querySelectorAll('.mobile-video-cover').length;
    const mediaElementsCount = document.querySelectorAll('#fans-activities-panel .mobile-video-cover, #fans-activities-panel .photo-container, #fans-activities-panel .activity-image-panel').length;
    
    // Warn if memory usage is high
    if (eventListenerCount > 50) {
        console.warn(`High event listener count detected: ${eventListenerCount}. Check for memory leaks.`);
    }
    
    if (timeoutCount > 10) {
        console.warn(`High timeout count detected: ${timeoutCount}. Check for memory leaks.`);
    }
    
    if (mediaElementsCount > 20) {
        console.warn(`High media element count detected: ${mediaElementsCount}. Consider cleanup.`);
    }
    
    console.log(`Memory usage - Event listeners: ${eventListenerCount}, Timeouts: ${timeoutCount}, Activities: ${activityItemsCount}, Video covers: ${videoCoverCount}, Media elements: ${mediaElementsCount}`);
}

// Function to get city markers data from the layer if available
async function getCityMarkersDataFromLayer() {
    // Check if the data is already loaded globally
    if (window.cityMarkersData) {
        return window.cityMarkersData;
    }
    
    // If not available, load it using the dedicated function
    return await loadCityMarkersData();
}

// Function to get unique cities from city markers data
async function getUniqueCitiesFromCityMarkers() {
    try {
        // Use the dedicated function to load city markers data
        const cityMarkersData = await getCityMarkersDataFromLayer();
        
        // Extract city names from city markers data
        const cities = cityMarkersData.features
            .map(feature => feature.properties.name)
            .filter(name => name) // Filter out any empty names
            .sort(); // Sort alphabetically
        
        return cities;
    } catch (error) {
        console.error('Error loading city markers data:', error);
        // Fallback to empty array
        return [];
    }
}

// Function to get unique cities from activities data (fallback method)
function getUniqueCitiesFromActivities(activities) {
    const cities = new Set();
    activities.forEach(activity => {
        if (activity.properties.city) {
            cities.add(activity.properties.city);
        }
    });
    const uniqueCities = Array.from(cities).sort(); // Sort alphabetically
    return uniqueCities;
}

// Function to navigate to the next city
function navigateToNextCity() {
    if (availableCities.length === 0) return;
    
    // Move to next city (cycle back to first if at end)
    currentCityIndex = (currentCityIndex + 1) % availableCities.length;
    const nextCity = availableCities[currentCityIndex];
    
    // Update the city filter
    currentFilterCity = nextCity;
    
    // Reload activities with new city filter
    loadAllActivities();
    
    // Ensure document click listener is attached after navigation
    addTrackedTimeout(() => {
        ensureDocumentClickListener();
    }, 50);
    
    // Auto-select the first activity in the new city with proper delay
    addTrackedTimeout(() => {
        const firstActivity = document.querySelector('.activity-item');
        if (firstActivity) {
            const fakeId = firstActivity.getAttribute('data-activity-fake-id');
            if (fakeId) {
                selectActivityInPanel(fakeId);
            }
        }
    }, 200); // Increased delay to ensure activities are loaded
}

// Function to navigate to the previous city
function navigateToPreviousCity() {
    if (availableCities.length === 0) return;
    
    // Move to previous city (cycle to last if at beginning)
    currentCityIndex = currentCityIndex === 0 ? availableCities.length - 1 : currentCityIndex - 1;
    const previousCity = availableCities[currentCityIndex];
    
    // Update the city filter
    currentFilterCity = previousCity;
    
    // Reload activities with new city filter
    loadAllActivities();
    
    // Ensure document click listener is attached after navigation
    addTrackedTimeout(() => {
        ensureDocumentClickListener();
    }, 50);
    
    // Auto-select the first activity in the new city with proper delay
    addTrackedTimeout(() => {
        const firstActivity = document.querySelector('.activity-item');
        if (firstActivity) {
            const fakeId = firstActivity.getAttribute('data-activity-fake-id');
            if (fakeId) {
                selectActivityInPanel(fakeId);
            }
        }
    }, 200); // Increased delay to ensure activities are loaded
}

// Function to preload city data for better performance
export async function preloadCityData() {
    try {
        // Check if data is already available
        if (window.cityMarkersData) {
            // Extract cities immediately
            const cities = window.cityMarkersData.features
                .map(feature => feature.properties.name)
                .filter(name => name)
                .sort();
            console.log('City data loaded from existing data');
            return cities;
        }
        
        // Load if not available
        await getUniqueCitiesFromCityMarkers();
        console.log('City data preloaded successfully');
    } catch (error) {
        console.error('Failed to preload city data:', error);
    }
}

// Function to check city data status (for debugging)
export function getCityDataStatus() {
    return {
        globalCityMarkersData: window.cityMarkersData ? window.cityMarkersData.features.length : 0,
        availableCities: availableCities.length
    };
}

// Cleanup function for memory management
export function cleanup() {
    // Cleanup event listeners
    cleanupEventListeners();
    
    // Cleanup timeouts
    cleanupTimeouts();
    
    // Cleanup media elements before removing panel
    cleanupMediaElements();
    
    // Cleanup draggable panel instance
    if (window.cleanupFansActivitiesDraggablePanel) {
        window.cleanupFansActivitiesDraggablePanel();
    }
    
    // Remove panel from DOM
    if (fansActivitiesPanel) {
        fansActivitiesPanel.remove();
        fansActivitiesPanel = null;
    }
    
    // Reset state variables
    currentSelectedActivityFakeId = null;
    currentFilterCity = null;
    currentCityIndex = 0; // Reset navigation state
    availableCities = []; // Clear available cities
    

    
    // Log memory usage for debugging
    logMemoryUsage();
}

// Function to test document click listener (for debugging)
function testDocumentClickListener() {
    const panel = document.getElementById('fans-activities-panel');
    if (panel && panel.classList.contains('active')) {
        console.log('Panel is active, document click listener should be working');
        console.log('Click outside the panel to test if it closes');
    } else {
        console.log('Panel is not active');
    }
}

// Function to cleanup media elements and their resources
function cleanupMediaElements() {
    try {
        // Find all media elements in the panel
        const mediaElements = document.querySelectorAll('#fans-activities-panel .mobile-video-cover, #fans-activities-panel .photo-container, #fans-activities-panel .activity-image-panel');
        
        mediaElements.forEach(element => {
            // Remove event listeners from media elements
            const clone = element.cloneNode(true);
            if (element.parentNode) {
                element.parentNode.replaceChild(clone, element);
            }
            
            // Clear any cached images by setting src to empty
            const images = element.querySelectorAll('img');
            images.forEach(img => {
                if (img.src) {
                    // Create a new image object to clear the cache
                    const newImg = new Image();
                    newImg.src = img.src;
                    newImg.src = '';
                    img.src = '';
                }
            });
        });
        
        // Clear any video-related elements
        const videoElements = document.querySelectorAll('#fans-activities-panel .video-thumbnail, #fans-activities-panel .play-button');
        videoElements.forEach(element => {
            const clone = element.cloneNode(true);
            if (element.parentNode) {
                element.parentNode.replaceChild(clone, element);
            }
        });
        
        // Force garbage collection hint (optional)
        if (window.gc) {
            window.gc();
        }
        
        console.log(`Cleaned up ${mediaElements.length} media elements`);
    } catch (error) {
        console.error('Error during media cleanup:', error);
    }
}

// Make functions globally available
window.showFansActivitiesPanel = showFansActivitiesPanel;
window.closeFansActivitiesPanel = closeFansActivitiesPanel;
window.selectActivityInPanel = selectActivityInPanel;
window.setCurrentActivityIndex = setCurrentActivityIndex;
window.navigateToNextCity = navigateToNextCity;
window.navigateToPreviousCity = navigateToPreviousCity;
window.forceCleanup = forceCleanup;
window.logFansActivitiesMemory = logMemoryUsage;
window.testDocumentClickListener = testDocumentClickListener;
window.preloadCityData = preloadCityData;
window.getCityDataStatus = getCityDataStatus;
window.cleanupFansActivitiesMedia = cleanupMediaElements;

// Log memory usage when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && fansActivitiesPanel && fansActivitiesPanel.classList.contains('active')) {
        logMemoryUsage();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanup();
}); 