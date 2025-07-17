import { baseUrl } from '../config.js';
import { createVideoCoverFromObject, createPhotoElement } from '../utils/mediaUtils.js';


// Fans Activities Panel for displaying all fan activities
let fansActivitiesPanel = null;
let currentSelectedActivityFakeId = null;
let currentFilterCity = null;

// Memory management tracking
let eventListeners = new Map();

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
}

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
            <button class="close-panel" onclick="closeFansActivitiesPanel()">&times;</button>
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
                        <span class="activity-title">${escapeHtml(activityTitle)}</span>
                        <span class="location">${escapeHtml(location)}</span>
                    </div>
                    <div class="activity-date">${escapeHtml(activityDate)}</div>
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
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        const activitiesList = document.getElementById('activities-list');
        activitiesList.innerHTML = '<p>Error loading activities.</p>';
    }
}

// Function to setup event listeners for activity items
function setupActivityEventListeners() {
    // Cleanup existing event listeners first
    cleanupEventListeners();
    
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
    }
    
    // Set the current activity if provided
    if (fakeId) {
        currentSelectedActivityFakeId = fakeId;
    }
    
    const panel = createFansActivitiesPanel();
    panel.classList.add('active');
    
    // Clear any existing selection first
    const previousSelected = document.querySelector('.activity-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }
    
    // Reload activities to ensure fresh content with correct selection
    loadAllActivities();
}

// Function to close the fans activities panel
export function closeFansActivitiesPanel() {
    if (fansActivitiesPanel) {
        fansActivitiesPanel.classList.remove('active');
        
        // Clear highlighting when panel is closed
        if (window.clearActivityHighlight) {
            window.clearActivityHighlight();
        }
        
        // Log memory usage after cleanup
        logMemoryUsage();
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
    
    console.warn(`Activity with fakeId ${fakeId} not found in any data source`);
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
        
        // Get current zoom level and ensure we don't zoom out
        const currentZoom = window.map.getZoom();
        const targetZoom = Math.max(currentZoom, 6);
        
        // Fly to the location with zoom
        window.map.flyTo({
            center: coordinates,
            zoom: targetZoom,
            duration: 1000
        });

        // Show popup for the activity using fakeId
        if (window.showFansActivityPopup) {
            window.showFansActivityPopup(fakeId, coordinates);
        } else {
            console.error('showFansActivityPopup function not found in window object');
        }
        
        // Explicitly highlight the activity on the map
        if (window.highlightActivity) {
            window.highlightActivity(fakeId);
        }
    }

    // Close the activities panel after selection (only on mobile)
    if (window.innerWidth < 768) {
        closeFansActivitiesPanel();
    }
}

// Function to scroll to a specific activity
function scrollToActivity(fakeId) {
    const activityElement = document.querySelector(`[data-activity-fake-id="${fakeId}"]`);
    if (activityElement) {
        // Get the activities list container
        const activitiesList = document.getElementById('activities-list');
        if (activitiesList) {
            // Calculate the scroll position more precisely
            const containerRect = activitiesList.getBoundingClientRect();
            const elementRect = activityElement.getBoundingClientRect();
            
            // Calculate the offset to center the element in the visible area
            const scrollTop = activitiesList.scrollTop;
            const elementTop = activityElement.offsetTop;
            const containerHeight = activitiesList.clientHeight;
            const elementHeight = activityElement.offsetHeight;
            
            // Center the element in the container, accounting for padding
            const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
            
            // Smooth scroll to the calculated position
            activitiesList.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
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
        console.log('setCurrentActivityIndex: Trying to select activity with fakeId:', currentSelectedActivityFakeId, 'type:', typeof currentSelectedActivityFakeId);
        
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
            console.log('setCurrentActivityIndex: Found activity item, selecting it');
            currentItem.classList.add('selected');
            scrollToActivity(currentSelectedActivityFakeId);
            
            // Also highlight the activity on the map
            if (window.highlightActivity) {
                window.highlightActivity(currentSelectedActivityFakeId);
            }
        } else {
            console.warn('setCurrentActivityIndex: Could not find activity item with fakeId:', currentSelectedActivityFakeId);
        }
    }
}

// Function to set the city filter and reload activities
export function setActivityCityFilter(city) {
    currentFilterCity = city;
    if (fansActivitiesPanel && fansActivitiesPanel.classList.contains('active')) {
        loadAllActivities();
    }
}

// Make setActivityCityFilter globally available
window.setActivityCityFilter = setActivityCityFilter;

// Function to manually trigger cleanup (for testing/debugging)
export function forceCleanup() {
    cleanupEventListeners();
    logMemoryUsage();
}

// Function to log memory usage for debugging
export function logMemoryUsage() {
    const eventListenerCount = eventListeners.size;
    const activityItemsCount = document.querySelectorAll('.activity-item').length;
    const videoCoverCount = document.querySelectorAll('.mobile-video-cover').length;
    
    // Warn if memory usage is high
    if (eventListenerCount > 50) {
        console.warn(`High event listener count detected: ${eventListenerCount}. Check for memory leaks.`);
    }
}

// Cleanup function for memory management
export function cleanup() {
    // Cleanup event listeners
    cleanupEventListeners();
    
    // Remove panel from DOM
    if (fansActivitiesPanel) {
        fansActivitiesPanel.remove();
        fansActivitiesPanel = null;
    }
    
    // Reset state variables
    currentSelectedActivityFakeId = null;
    currentFilterCity = null;
    
    // Log memory usage for debugging
    logMemoryUsage();
}

// Make functions globally available
window.showFansActivitiesPanel = showFansActivitiesPanel;
window.closeFansActivitiesPanel = closeFansActivitiesPanel;
window.selectActivityInPanel = selectActivityInPanel;
window.setCurrentActivityIndex = setCurrentActivityIndex;
window.forceCleanup = forceCleanup;
window.logFansActivitiesMemory = logMemoryUsage;

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