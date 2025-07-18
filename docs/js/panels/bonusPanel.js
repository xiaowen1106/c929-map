import { baseUrl } from '../config.js';
import { createVideoCoverFromObject, createPhotoElement } from '../utils/mediaUtils.js';
import { initBonusDraggablePanel, cleanupBonusDraggablePanel, getBonusDraggablePanelInstance } from '../utils/bonusDraggablePanel.js';


// Bonus Panel for displaying current bonus item
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

// Function to create media content HTML with all available media
async function createMediaContent(bonus) {
    let mediaContent = '';
    
    // Check if bonus has video content (YouTube or Bilibili) - prioritize these
    const hasYouTube = (bonus.properties.youtube_url && bonus.properties.youtube_url !== 'N/A' && bonus.properties.youtube_url !== '');
    const hasBilibili = (bonus.properties.bilibili_url && bonus.properties.bilibili_url !== 'N/A' && bonus.properties.bilibili_url !== '');
    
    // Add YouTube video first if available
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
    
    // Create panel content with updated header format
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
            <button class="close-panel" id="bonus-close-btn">&times;</button>
        </div>
        <div class="panel-body">
            <div class="bonus-content" id="bonus-content">
                <div class="loading-bonus">
                    <p>Loading bonus content...</p>
                </div>
            </div>
        </div>
    `;
    
    // Add close button event listener
    const closeBtn = panel.querySelector('#bonus-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeBonusPanel();
        });
    }

    // Add panel to body
    document.body.appendChild(panel);
    bonusPanel = panel;
    
    return panel;
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
        
        const bonusHTML = `
            ${bonusContentText ? `<div class="bonus-content-text">${escapeHtml(bonusContentText)}</div>` : ''}
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
        setTimeout(() => {
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
        setTimeout(() => {
            if (bonusPanel) {
                delete bonusPanel.dataset.opening;
                delete bonusPanel.dataset.openingNew;
            }
        }, 150);
        
        // Initialize draggable panel for mobile after a short delay
        const timeoutId = setTimeout(() => {
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
            } else {
                bonusPanel.classList.remove('active');
                
                // Reset the right position to ensure panel slides back
                setTimeout(() => {
                    if (bonusPanel) {
                        bonusPanel.style.right = '';
                    }
                }, 300); // Wait for transition to complete
            }
        }
        
        // Cleanup event listeners
        cleanupEventListeners();
        
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
        
        // Cleanup event listeners
        cleanupEventListeners();
        
        // Reset variables
        currentSelectedBonusId = null;
        
    } catch (error) {
        console.error('Error during force cleanup:', error);
    }
}

// Function to log memory usage
export function logMemoryUsage() {
    const usage = {
        panel: bonusPanel ? 1 : 0,
        currentId: currentSelectedBonusId ? 1 : 0,
        eventListeners: eventListeners.size
    };
    console.log('Bonus Panel Memory Usage:', usage);
    return usage;
}

// Function to cleanup
export function cleanup() {
    try {
        // Force cleanup
        forceCleanup();
        
        // Remove panel from DOM
        if (bonusPanel && bonusPanel.parentNode) {
            bonusPanel.parentNode.removeChild(bonusPanel);
            bonusPanel = null;
        }
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

// Global function for closing panel (needed for onclick)
window.closeBonusPanel = closeBonusPanel; 