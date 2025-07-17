import { baseUrl } from '../config.js';
import { createVideoCoverFromObject, createPhotoElement } from '../utils/mediaUtils.js';


// Bonus Panel for displaying all bonus items
let bonusPanel = null;
let currentSelectedBonusId = null;

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

// Function to handle document clicks for panel closing
const handleDocumentClick = (e) => {
    const panel = document.getElementById('bonus-panel');
    
    if (!panel) return;
    
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

// Function to create media content HTML with redirection for videos
async function createMediaContent(bonus) {
    let mediaContent = '';
    
    // Check if bonus has video content (YouTube)
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
    if (!mediaContent && bonus.properties.photo && bonus.properties.photo !== 'N/A' && bonus.properties.photo !== '') {
        mediaContent = createPhotoElement(`img/bonus/${bonus.properties.photo}`, 'Bonus Photo', 'bonus-photo-panel');
    }
    
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
    
    // Create panel content
    panel.innerHTML = `
        <div class="panel-header">
            <div class="header-content">
                <h2>所有彩蛋</h2>
            </div>
            <button class="close-panel" onclick="closeBonusPanel()">&times;</button>
        </div>
        <div class="panel-body">
            <div class="bonus-list" id="bonus-list">
                <div class="loading-bonus">
                    <p>Loading bonus items...</p>
                </div>
            </div>
        </div>
    `;

    // Add panel to body
    document.body.appendChild(panel);
    bonusPanel = panel;

    // Wait for data to be available before loading bonus items
    waitForDataAndLoadBonus();

    return panel;
}

// Function to wait for data to be available and then load bonus items
async function waitForDataAndLoadBonus() {
    let attempts = 0;
    const maxAttempts = 50; // Wait up to 5 seconds (50 * 100ms)
    
    while (attempts < maxAttempts) {
        // Check if data is available
        if (window.bonusDataManager && typeof window.bonusDataManager.getData === 'function' && window.bonusDataManager.getData().length > 0) {
            loadAllBonus();
            return;
        }
        
        if (window.allBonus && window.allBonus.length > 0) {
            loadAllBonus();
            return;
        }
        
        // Wait 100ms before next attempt
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    // If we get here, data still isn't available after max attempts
    loadAllBonus();
}

// Function to load bonus items
async function loadAllBonus() {
    try {
        // Use data manager for consistency with popup function
        let bonusItems = [];
        if (window.bonusDataManager && typeof window.bonusDataManager.getData === 'function') {
            bonusItems = window.bonusDataManager.getData() || [];
        } else {
            // Fallback to window.allBonus if data manager is not available
            bonusItems = window.allBonus || [];
        }
        
        const bonusList = document.getElementById('bonus-list');
        
        if (bonusItems.length === 0) {
            bonusList.innerHTML = '<p>No bonus items available.</p>';
            return;
        }

        // Create bonus items HTML with async media content creation
        const bonusHTMLPromises = bonusItems.map(async (bonus, index) => {
            const location = bonus.properties.city || '';
            const bonusTitle = bonus.properties.title || 'Bonus';
            const bonusDate = formatDate(bonus.properties.date) || '';
            const mediaContent = await createMediaContent(bonus);
            
            return `
                <div class="bonus-item" data-bonus-id="${bonus.properties.id}">
                    <div class="bonus-header">
                        <span class="bonus-title">${escapeHtml(bonusTitle)}</span>
                        <span class="location">${escapeHtml(location)}</span>
                    </div>
                    <div class="bonus-date">${escapeHtml(bonusDate)}</div>
                    ${bonus.properties.content ? `<div class="bonus-content">${escapeHtml(bonus.properties.content)}</div>` : ''}
                    ${mediaContent ? `<div class="bonus-media">${mediaContent}</div>` : ''}
                </div>
            `;
        });

        // Wait for all async operations to complete
        const bonusHTMLArray = await Promise.all(bonusHTMLPromises);
        const bonusHTML = bonusHTMLArray.join('');

        bonusList.innerHTML = bonusHTML;

        // Setup event listeners for bonus items
        setupBonusEventListeners();

    } catch (error) {
        console.error('Error loading bonus items:', error);
        const bonusList = document.getElementById('bonus-list');
        bonusList.innerHTML = '<p>Error loading bonus items.</p>';
    }
}

// Function to setup event listeners for bonus items
function setupBonusEventListeners() {
    // Cleanup existing listeners
    cleanupEventListeners();

    // Add click listeners to bonus items
    document.querySelectorAll('.bonus-item').forEach(item => {
        const bonusId = item.getAttribute('data-bonus-id');
        
        // Main click listener for navigation
        const listener = () => selectBonusInPanel(bonusId);
        item.addEventListener('click', listener);
        eventListeners.set(item, listener);
    });
}

// Function to show bonus panel
export function showBonusPanel(bonusId = null) {
    try {
        // Create panel if it doesn't exist
        if (!bonusPanel) {
            createBonusPanel();
        }
        
        // Show panel
        bonusPanel.classList.add('active');
        
        // Add document click listener for panel closing
        document.addEventListener('click', handleDocumentClick);
        
        // Select specific bonus if provided
        if (bonusId) {
            setTimeout(() => {
                selectBonusInPanel(bonusId);
            }, 100);
        }
        
    } catch (error) {
        console.error('Error showing bonus panel:', error);
    }
}

// Function to close bonus panel
export function closeBonusPanel() {
    if (bonusPanel) {
        bonusPanel.classList.remove('active');
        currentSelectedBonusId = null;
        
        // Remove document click listener
        document.removeEventListener('click', handleDocumentClick);
    }
}

// Function to find bonus by id
function findBonusById(bonusId) {
    // Try data manager first
    if (window.bonusDataManager && typeof window.bonusDataManager.findById === 'function') {
        return window.bonusDataManager.findById(bonusId);
    }
    
    // Fallback to window.allBonus
    if (window.allBonus) {
        return window.allBonus.find(bonus => bonus.properties.id === bonusId);
    }
    
    return null;
}

// Function to select bonus in panel
export function selectBonusInPanel(bonusId) {
    try {
        // Remove previous selection
        const previousSelected = document.querySelector('.bonus-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Add selection to current item
        const currentItem = document.querySelector(`[data-bonus-id="${bonusId}"]`);
        if (currentItem) {
            currentItem.classList.add('selected');
            currentSelectedBonusId = bonusId;
            
            // Scroll to item
            scrollToBonus(bonusId);
            
            // Navigate to bonus on map
            import('../layers/bonusLayer.js').then(module => {
                module.navigateToBonus(bonusId);
            });
        }
        
    } catch (error) {
        console.error('Error selecting bonus in panel:', error);
    }
}

// Function to scroll to bonus item
function scrollToBonus(bonusId) {
    const bonusItem = document.querySelector(`[data-bonus-id="${bonusId}"]`);
    if (bonusItem && bonusPanel) {
        const panelBody = bonusPanel.querySelector('.panel-body');
        if (panelBody) {
            panelBody.scrollTop = bonusItem.offsetTop - panelBody.offsetTop - 20;
        }
    }
}

// Function to set current bonus index
export function setCurrentBonusIndex(bonusId) {
    try {
        if (!bonusId) {
            // Reset selection
            const selectedItem = document.querySelector('.bonus-item.selected');
            if (selectedItem) {
                selectedItem.classList.remove('selected');
            }
            currentSelectedBonusId = null;
            return;
        }
        
        // Find the bonus item
        const bonus = findBonusById(bonusId);
        if (!bonus) {
            console.error('Bonus not found:', bonusId);
            return;
        }
        
        // Remove previous selection
        const previousSelected = document.querySelector('.bonus-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Add selection to current item
        const currentItem = document.querySelector(`[data-bonus-id="${bonusId}"]`);
        if (currentItem) {
            currentItem.classList.add('selected');
            currentSelectedBonusId = bonusId;
            
            // Scroll to item
            scrollToBonus(bonusId);
        }
        
    } catch (error) {
        console.error('Error setting current bonus index:', error);
    }
}

// Function to reset bonus selection
export function resetBonusSelection() {
    const selectedItem = document.querySelector('.bonus-item.selected');
    if (selectedItem) {
        selectedItem.classList.remove('selected');
    }
    currentSelectedBonusId = null;
}

// Function to force cleanup
export function forceCleanup() {
    if (bonusPanel) {
        bonusPanel.remove();
        bonusPanel = null;
    }
    currentSelectedBonusId = null;
    cleanupEventListeners();
    
    // Remove document click listener
    document.removeEventListener('click', handleDocumentClick);
}

// Function to log memory usage
export function logMemoryUsage() {
    const memoryInfo = {
        panel: bonusPanel ? 'exists' : 'null',
        selectedBonus: currentSelectedBonusId,
        eventListeners: eventListeners.size
    };
    console.log('Bonus Panel Memory Usage:', memoryInfo);
    return memoryInfo;
}

// Function to cleanup
export function cleanup() {
    cleanupEventListeners();
    currentSelectedBonusId = null;
}

// Global function for closing panel (needed for onclick)
window.closeBonusPanel = closeBonusPanel; 