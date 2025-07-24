import { baseUrl } from '../config.js';
import { createVideoCoverFromObject, createPhotoElement, createClickablePhotoElement, createReferenceLinkElement } from '../utils/mediaUtils.js';
import { initBonusDraggablePanel, cleanupBonusDraggablePanel, getBonusDraggablePanelInstance } from '../utils/draggablePanel.js';


// Bonus Panel for displaying current bonus item
let bonusPanel = null;
let currentSelectedBonusId = null;

// Memory management tracking
let eventListeners = new Map();
let activeTimeouts = new Set(); // Track active timeouts for cleanup

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

// Function to handle document clicks for panel closing
const handleDocumentClick = (e) => {
    const panel = document.getElementById('bonus-panel');
    
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
            closeBonusPanel();
        }
    }
};

// Function to cleanup media elements and their resources
function cleanupMediaElements() {
    try {
        // Find all media elements in the panel
        const mediaElements = document.querySelectorAll('#bonus-panel .mobile-video-cover, #bonus-panel .photo-container, #bonus-panel .bonus-photo-panel');
        
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
        const videoElements = document.querySelectorAll('#bonus-panel .video-thumbnail, #bonus-panel .play-button');
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
        
        console.log(`Cleaned up ${mediaElements.length} media elements in bonus panel`);
    } catch (error) {
        console.error('Error during bonus panel media cleanup:', error);
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

// Function to create media content HTML with all available media
async function createMediaContent(bonus) {
    let mediaContent = '';
    
    // Add reference photo first if available (highest priority)
    if (bonus.properties.reference && bonus.properties.reference.photo && bonus.properties.reference.link) {
        const referencePhotoContent = createReferenceLinkElement(
            `img/bonus/${bonus.properties.reference.photo}`, 
            bonus.properties.reference.link, 
            'Reference Photo', 
            'bonus-photo-panel'
        );
        if (referencePhotoContent) {
            mediaContent += `<div class="bonus-video reference-video">${referencePhotoContent}</div>`;
        }
    }
    
    // Check if bonus has video content (YouTube or Bilibili) - second priority
    const hasYouTube = (bonus.properties.youtube_url && bonus.properties.youtube_url !== 'N/A' && bonus.properties.youtube_url !== '');
    const hasBilibili = (bonus.properties.bilibili_url && bonus.properties.bilibili_url !== 'N/A' && bonus.properties.bilibili_url !== '');
    
    // Add YouTube video if available
    if (hasYouTube) {
        const videoObject = {
            youtube_url: bonus.properties.youtube_url
        };
        const videoCover = createVideoCoverFromObject(videoObject);
        if (videoCover) {
            mediaContent += `<div class="bonus-video">${videoCover}</div>`;
        }
    }
    
    // Add Bilibili video if available
    if (hasBilibili) {
        const videoObject = {
            bilibili_url: bonus.properties.bilibili_url
        };
        const videoCover = createVideoCoverFromObject(videoObject);
        if (videoCover) {
            mediaContent += `<div class="bonus-video">${videoCover}</div>`;
        }
    }
    
    // Add photos after videos
    const photos = [];
    
    // Collect all available photos
    if (bonus.properties.photo && bonus.properties.photo !== 'N/A' && bonus.properties.photo !== '') {
        photos.push(bonus.properties.photo);
    }
    
    // Add additional photos if available (photo2, photo3, etc.)
    for (let i = 2; i <= 5; i++) {
        const photoKey = `photo${i}`;
        if (bonus.properties[photoKey] && bonus.properties[photoKey] !== 'N/A' && bonus.properties[photoKey] !== '') {
            photos.push(bonus.properties[photoKey]);
        }
    }
    
    // Add all photos to media content
    photos.forEach((photo, index) => {
        const photoContent = createPhotoElement(`img/bonus/${photo}`, `Bonus Photo ${index + 1}`, 'bonus-photo-panel');
        if (photoContent) {
            mediaContent += `<div class="bonus-photo">${photoContent}</div>`;
        }
    });
    
    return mediaContent;
}

// Function to create the bonus panel
export function createBonusPanel() {
    
    if (bonusPanel) {
        return bonusPanel;
    }

    // Create panel container
    const panel = document.createElement('div');
    panel.id = 'bonus-panel';
    panel.className = 'bonus-panel';
    
    // Create panel content with navigation buttons instead of close button
    panel.innerHTML = `
        <div class="panel-header">
            <div class="panel-header-content">
                <h2 style="font-size: 1.1em; line-height: 1.3; display: flex; align-items: center; justify-content: flex-start; gap: 0.8em; color: white;">
                    <div class="bonus-title">
                        <div class="bonus-location" id="bonus-location" style="color: white;">彩蛋详情</div>
                        <div class="bonus-date" id="bonus-date" style="color: white; opacity: 0.9;">加载中...</div>
                    </div>
                </h2>
            </div>
            <div class="navigation-buttons">
                <button class="nav-btn prev-btn" id="bonus-prev-btn">&lt;</button>
                <button class="nav-btn next-btn" id="bonus-next-btn">&gt;</button>
            </div>
        </div>
        <div class="panel-body">
            <div class="bonus-content" id="bonus-content">
                <div class="loading-bonus">
                    <p>Loading bonus content...</p>
                </div>
            </div>
        </div>
    `;
    
    // Add navigation button event listeners
    const prevBtn = panel.querySelector('#bonus-prev-btn');
    const nextBtn = panel.querySelector('#bonus-next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateToPreviousBonus();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateToNextBonus();
        });
    }

    // Add panel to body
    document.body.appendChild(panel);
    bonusPanel = panel;
    
    return panel;
}

// Function to navigate to previous bonus
function navigateToPreviousBonus() {
    if (!window.bonusDataManager || !currentSelectedBonusId) return;
    
    const allBonuses = window.bonusDataManager.getAllBonus();
    if (!allBonuses || allBonuses.length === 0) return;
    
    const currentIndex = allBonuses.findIndex(bonus => bonus.properties.id === currentSelectedBonusId);
    if (currentIndex === -1) return;
    
    const prevIndex = currentIndex === 0 ? allBonuses.length - 1 : currentIndex - 1;
    const prevBonus = allBonuses[prevIndex];
    
    if (prevBonus) {
        selectBonusInPanel(prevBonus.properties.id);
        
        // Update the current bonus ID in the bonus layer
        import('../layers/bonusLayer.js').then(module => {
            module.setCurrentBonusId(prevBonus.properties.id);
        });
        
        // Center map on the bonus location
        centerMapOnBonus(prevBonus);
    }
}

// Function to navigate to next bonus
function navigateToNextBonus() {
    if (!window.bonusDataManager || !currentSelectedBonusId) return;
    
    const allBonuses = window.bonusDataManager.getAllBonus();
    if (!allBonuses || allBonuses.length === 0) return;
    
    const currentIndex = allBonuses.findIndex(bonus => bonus.properties.id === currentSelectedBonusId);
    if (currentIndex === -1) return;
    
    const nextIndex = currentIndex === allBonuses.length - 1 ? 0 : currentIndex + 1;
    const nextBonus = allBonuses[nextIndex];
    
    if (nextBonus) {
        selectBonusInPanel(nextBonus.properties.id);
        
        // Update the current bonus ID in the bonus layer
        import('../layers/bonusLayer.js').then(module => {
            module.setCurrentBonusId(nextBonus.properties.id);
        });
        
        // Center map on the bonus location
        centerMapOnBonus(nextBonus);
    }
}

// Function to center map on bonus location
function centerMapOnBonus(bonus) {
    if (!window.map || !bonus || !bonus.geometry || !bonus.geometry.coordinates) return;
    
    const coordinates = bonus.geometry.coordinates;
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // On mobile, center on the top 50% of the map
        const mapContainer = window.map.getContainer();
        const mapHeight = mapContainer.offsetHeight;
        const centerOffset = mapHeight * 0.25; // Move center down by 25% of map height
        
        window.map.flyTo({
            center: coordinates,
            zoom: Math.max(window.map.getZoom(), 6),
            duration: 1000,
            offset: [0, -centerOffset] // Negative to move down
        });
    } else {
        // On desktop, center on the left 75% of the map
        const mapContainer = window.map.getContainer();
        const mapWidth = mapContainer.offsetWidth;
        const centerOffset = mapWidth * 0.125; // Move center right by 12.5% of map width (to center on left 75%)
        
        window.map.flyTo({
            center: coordinates,
            zoom: Math.max(window.map.getZoom(), 6),
            duration: 1000,
            offset: [-centerOffset, 0] // Negative to move right
        });
    }
}

// Function to display current bonus content
async function displayCurrentBonus(bonusId) {
    
    try {
        // Use data manager for consistency with popup function
        let bonus = null;
        if (window.bonusDataManager && typeof window.bonusDataManager.findById === 'function') {
            bonus = window.bonusDataManager.findById(bonusId);
        }
        
        const bonusContent = document.getElementById('bonus-content');
        const bonusLocation = document.getElementById('bonus-location');
        
        if (!bonus) {
            bonusContent.innerHTML = '<p>Bonus not found.</p>';
            return;
        }

        // Update header with bonus information
        const bonusTitle = bonus.properties.title || 'Bonus';
        const bonusLocationText = bonus.properties.location_display || bonus.properties.location_display || '';
        const bonusDate = bonus.properties.date ? formatDate(bonus.properties.date) : '';
        const bonusContentText = bonus.properties.content || '';
        const mediaContent = await createMediaContent(bonus);
        
        // Update header elements
        const bonusLocationElement = document.getElementById('bonus-location');
        const bonusDateElement = document.getElementById('bonus-date');
        
        if (bonusLocationElement) {
            bonusLocationElement.textContent = bonusTitle;
        }
        
        if (bonusDateElement) {
            if (bonusLocationText && bonusDate) {
                bonusDateElement.textContent = `${bonusLocationText} - ${bonusDate}`;
            } else if (bonusLocationText) {
                bonusDateElement.textContent = bonusLocationText;
            } else if (bonusDate) {
                bonusDateElement.textContent = bonusDate;
            } else {
                bonusDateElement.textContent = '';
            }
        }
        
        // Handle line breaks properly by converting \n to <br> tags
        const processedContent = bonusContentText ? escapeHtml(bonusContentText).replace(/\n/g, '<br>') : '';
        
        const bonusHTML = `
            ${processedContent ? `<div class="bonus-content-text">${processedContent}</div>` : ''}
            ${mediaContent ? `<div class="bonus-media">${mediaContent}</div>` : ''}
        `;

        bonusContent.innerHTML = bonusHTML;

    } catch (error) {
        console.error('Error displaying bonus content:', error);
        const bonusContent = document.getElementById('bonus-content');
        bonusContent.innerHTML = '<p>Error loading bonus content.</p>';
    }
}

// Function to show bonus panel
export function showBonusPanel(bonusId = null) {
    try {
        // Cleanup any existing listeners and timeouts first to prevent accumulation
        cleanupEventListeners();
        cleanupTimeouts();
        
        // Create panel if it doesn't exist
        if (!bonusPanel) {
            createBonusPanel();
        }
        
        // Set current bonus ID
        if (bonusId) {
            currentSelectedBonusId = bonusId;
            
            // Update the current bonus ID in the bonus layer
            if (window.bonusDataManager) {
                // Set the current bonus ID in the bonus layer
                import('../layers/bonusLayer.js').then(module => {
                    module.setCurrentBonusId(bonusId);
                });
            }
        }
        
        // Display the current bonus content
        if (currentSelectedBonusId) {
            displayCurrentBonus(currentSelectedBonusId);
        } else {
            const bonusContent = document.getElementById('bonus-content');
            bonusContent.innerHTML = '<p>No bonus selected.</p>';
        }
        
        // Set opening flags to prevent immediate closing
        bonusPanel.dataset.opening = 'true';
        bonusPanel.dataset.openingNew = 'true';
        
        // Show panel
        bonusPanel.classList.add('active');
        
        // Force panel to be visible if CSS transition isn't working
        addTrackedTimeout(() => {
            const panel = document.getElementById('bonus-panel');
            if (panel) {
                const styles = window.getComputedStyle(panel);
                if (styles.right !== '8px') {
                    panel.style.right = '8px';
                }
            }
        }, 50);
        
        // Add document click listener for closing
        document.addEventListener('click', handleDocumentClick);
        
        // Remove the flags after a short delay
        addTrackedTimeout(() => {
            if (bonusPanel) {
                delete bonusPanel.dataset.opening;
                delete bonusPanel.dataset.openingNew;
            }
        }, 150);
        
        // Initialize draggable panel for mobile after a short delay
        addTrackedTimeout(() => {
            initBonusDraggablePanel();
        }, 200);
        
    } catch (error) {
        console.error('Error showing bonus panel:', error);
    }
}

// Function to close bonus panel
export function closeBonusPanel() {
    try {
        if (bonusPanel) {
            // On mobile, use the draggable panel's snap closed functionality
            const draggableInstance = getBonusDraggablePanelInstance();
            if (window.innerWidth <= 768 && draggableInstance) {
                draggableInstance.snapClosed();
                
                // Delay cleanup until after animation completes to prevent interference
                addTrackedTimeout(() => {
                    cleanupEventListeners();
                    cleanupTimeouts();
                    cleanupMediaElements(); // Clean up media elements
                    
                    // Clear highlighting when panel is closed
                    if (window.resetBonusHighlighting) {
                        window.resetBonusHighlighting();
                    }
                    
                    // Log memory usage after cleanup
                    logMemoryUsage();
                }, 450); // Slightly longer than the 400ms animation to ensure completion
            } else {
                bonusPanel.classList.remove('active');
                
                // For desktop, cleanup immediately since there's no animation
                cleanupEventListeners();
                cleanupTimeouts();
                cleanupMediaElements(); // Clean up media elements
                
                // Clear highlighting when panel is closed
                if (window.resetBonusHighlighting) {
                    window.resetBonusHighlighting();
                }
                
                // Log memory usage after cleanup
                logMemoryUsage();
                
                // Reset the right position to ensure panel slides back
                addTrackedTimeout(() => {
                    if (bonusPanel) {
                        bonusPanel.style.right = '';
                    }
                }, 300); // Wait for transition to complete
            }
        }
        
        // Cleanup draggable panel
        cleanupBonusDraggablePanel();
        
    } catch (error) {
        console.error('Error closing bonus panel:', error);
    }
}

// Function to find bonus by id
function findBonusById(bonusId) {
    if (window.bonusDataManager && typeof window.bonusDataManager.findById === 'function') {
        return window.bonusDataManager.findById(bonusId);
    }
    return null;
}

// Function to select bonus in panel
export function selectBonusInPanel(bonusId) {
    try {
        currentSelectedBonusId = bonusId;
        
        // Update panel content with the selected bonus
        displayCurrentBonus(bonusId);
        
    } catch (error) {
        console.error('Error selecting bonus in panel:', error);
    }
}

// Function to set current bonus index (for compatibility)
export function setCurrentBonusIndex(bonusId) {
    try {
        currentSelectedBonusId = bonusId;
        
        // If panel is open, update the content
        if (bonusPanel && bonusPanel.classList.contains('active')) {
            displayCurrentBonus(bonusId);
        }
        
    } catch (error) {
        console.error('Error setting current bonus index:', error);
    }
}

// Function to reset bonus selection
export function resetBonusSelection() {
    try {
        currentSelectedBonusId = null;
        
        // Clear panel content
        const bonusContent = document.getElementById('bonus-content');
        if (bonusContent) {
            bonusContent.innerHTML = '<p>No bonus selected.</p>';
        }
        
    } catch (error) {
        console.error('Error resetting bonus selection:', error);
    }
}

// Function to force cleanup
export function forceCleanup() {
    try {
        // Close panel
        if (bonusPanel) {
            bonusPanel.classList.remove('active');
        }
        
        // Cleanup event listeners and timeouts
        cleanupEventListeners();
        cleanupTimeouts();
        cleanupMediaElements(); // Clean up media elements
        
        // Reset variables
        currentSelectedBonusId = null;
        
        // Log memory usage for debugging
        logMemoryUsage();
        
    } catch (error) {
        console.error('Error during force cleanup:', error);
    }
}

// Function to log memory usage for debugging
export function logMemoryUsage() {
    const eventListenerCount = eventListeners.size;
    const timeoutCount = activeTimeouts.size;
    const bonusItemsCount = document.querySelectorAll('.bonus-item').length;
    const videoCoverCount = document.querySelectorAll('.mobile-video-cover').length;
    const mediaElementsCount = document.querySelectorAll('#bonus-panel .mobile-video-cover, #bonus-panel .photo-container, #bonus-panel .bonus-photo-panel').length;
    
    // Warn if memory usage is high
    if (eventListenerCount > 50) {
        console.warn(`High event listener count detected: ${eventListenerCount}. Check for memory leaks.`);
    }
    
    if (timeoutCount > 10) {
        console.warn(`High timeout count detected: ${timeoutCount}. Check for memory leaks.`);
    }
    
    if (mediaElementsCount > 10) {
        console.warn(`High media element count detected: ${mediaElementsCount}. Consider cleanup.`);
    }
    
    console.log(`Bonus panel memory usage - Event listeners: ${eventListenerCount}, Timeouts: ${timeoutCount}, Bonus items: ${bonusItemsCount}, Video covers: ${videoCoverCount}, Media elements: ${mediaElementsCount}`);
}

// Function to cleanup
export function cleanup() {
    try {
        // Force cleanup
        forceCleanup();
        
        // Cleanup media elements before removing panel
        cleanupMediaElements();
        
        // Remove panel from DOM
        if (bonusPanel && bonusPanel.parentNode) {
            bonusPanel.parentNode.removeChild(bonusPanel);
            bonusPanel = null;
        }
        
        // Cleanup draggable panel instance
        if (window.cleanupBonusDraggablePanel) {
            window.cleanupBonusDraggablePanel();
        }
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

// Make functions globally available
window.showBonusPanel = showBonusPanel;
window.closeBonusPanel = closeBonusPanel;
window.forceCleanup = forceCleanup;
window.logBonusMemory = logMemoryUsage;
window.cleanupBonusMedia = cleanupMediaElements;

// Log memory usage when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && bonusPanel && bonusPanel.classList.contains('active')) {
        logMemoryUsage();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanup();
}); 