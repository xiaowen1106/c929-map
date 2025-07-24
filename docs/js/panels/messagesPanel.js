// Messages Panel for displaying all fan messages
let messagesPanel = null;
let currentSelectedMessageFakeId = null;

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

// Function to create the messages panel
export function createMessagesPanel() {
    if (messagesPanel) {
        return messagesPanel;
    }

    // Create panel container
    const panel = document.createElement('div');
    panel.id = 'messages-panel';
    panel.className = 'messages-panel';
    
    // Create panel content
    panel.innerHTML = `
        <div class="panel-header">
            <h2>生米留言</h2>
            <button class="close-panel" onclick="closeMessagesPanel()">&times;</button>
        </div>
        <div class="panel-body">
            <div class="messages-list" id="messages-list">
                <div class="loading-messages">
                    <p>Loading messages...</p>
                </div>
            </div>
        </div>
    `;

    // Add panel to body
    document.body.appendChild(panel);
    messagesPanel = panel;

    // Load messages
    loadAllMessages();

    return panel;
}

// Function to load all messages
async function loadAllMessages() {
    try {
        const messages = window.allFanWishes || [];
        const messagesList = document.getElementById('messages-list');
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<p>No messages available.</p>';
            return;
        }

        const messagesHTML = messages.map((message, index) => {
            const location = message.properties.locationString || 
                           `${message.properties.city || ''}${message.properties.city && message.properties.country ? ', ' : ''}${message.properties.country || ''}`;
            const date = message.properties.date || '';
            return `
                <div class="message-item" data-message-fake-id="${message.properties.fakeId}" onclick="selectMessageInPanel('${message.properties.fakeId}')">
                    <div class="message-header">
                        <span class="user">${escapeHtml(message.properties.displayName || 'Anonymous')}</span>
                        <span class="date">${escapeHtml(date)}</span>
                    </div>
                    <div class="location">@${escapeHtml(location)}</div>
                    <p class="message-text">${escapeHtml(message.properties.message ? message.properties.message : '').replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }).join('');

        messagesList.innerHTML = messagesHTML;
    } catch (error) {
        console.error('Error loading messages:', error);
        const messagesList = document.getElementById('messages-list');
        messagesList.innerHTML = '<p>Error loading messages.</p>';
    }
}

// Function to show the messages panel
export function showMessagesPanel() {
    const panel = createMessagesPanel();
    panel.classList.add('active');
    
    // Scroll to currently selected message if any
    if (currentSelectedMessageFakeId) {
        scrollToMessage(currentSelectedMessageFakeId);
    }
}

// Function to close the messages panel
export function closeMessagesPanel() {
    if (messagesPanel) {
        messagesPanel.classList.remove('active');
    }
}

// Helper function to find message by fakeId
function findMessageByFakeId(fakeId) {
    return window.allFanWishes ? window.allFanWishes.find(message => message.properties.fakeId == fakeId) : null;
}

// Function to select a message in the panel
export function selectMessageInPanel(fakeId) {
    const message = findMessageByFakeId(fakeId);
    if (!message) {
        console.error('Message not found with fakeId:', fakeId);
        return;
    }

    // Update current selected fakeId
    currentSelectedMessageFakeId = fakeId;

    // Remove previous selection
    const previousSelected = document.querySelector('.message-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }

    // Add selection to current item
    const currentItem = document.querySelector(`[data-message-fake-id="${fakeId}"]`);
    if (currentItem) {
        currentItem.classList.add('selected');
        scrollToMessage(fakeId);
    }

    // Locate message on map
    if (message.geometry && message.geometry.coordinates) {
        const coordinates = message.geometry.coordinates;
        
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

        // Show popup for the message using fakeId
        if (window.showFanWishPopup) {
            window.showFanWishPopup(fakeId, coordinates);
        }
    }

    // Close the messages panel after selection (only on mobile)
    if (window.innerWidth < 768) {
        closeMessagesPanel();
    }
}

// Function to scroll to a specific message
function scrollToMessage(fakeId) {
    const messageElement = document.querySelector(`[data-message-fake-id="${fakeId}"]`);
    if (messageElement) {
        messageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// Function to set the currently selected message (called from popup)
export function setCurrentMessageIndex(fakeId) {
    currentSelectedMessageFakeId = fakeId;
    
    // If panel is open, update the selection
    if (messagesPanel && messagesPanel.classList.contains('active') && currentSelectedMessageFakeId) {
        // Remove previous selection
        const previousSelected = document.querySelector('.message-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Add selection to current item
        const currentItem = document.querySelector(`[data-message-fake-id="${currentSelectedMessageFakeId}"]`);
        if (currentItem) {
            currentItem.classList.add('selected');
            scrollToMessage(currentSelectedMessageFakeId);
        }
    }
}

// Make functions globally available
window.showMessagesPanel = showMessagesPanel;
window.closeMessagesPanel = closeMessagesPanel;
window.selectMessageInPanel = selectMessageInPanel; 