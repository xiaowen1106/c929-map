// Unified Draggable Panel Utility for Mobile Bottom Sheet
export class UnifiedDraggablePanel {
    constructor(panelElement, options = {}) {
        this.panel = panelElement;
        this.options = {
            panelType: 'concert', // 'concert', 'bonus', or 'fans-activities'
            contentSelectors: {
                panelBody: '.panel-body',
                mainContent: '.concert-panel-content', // for concert panels
                bonusContent: '.bonus-content', // for bonus panels
                fansActivitiesContent: '.activities-list', // for fans activities panels
                messageWall: '.message-wall',
                messageWallOnly: '.message-wall-only',
                playlistContainer: '.playlist-container'
            },
            excludeSelectors: ['.nav-btn'], // elements to exclude from drag handling
            onSnapClosed: null, // callback for when panel closes
            ...options
        };
        
        this.isDragging = false;
        this.startY = 0;
        this.startBottom = 0;
        this.currentBottom = 0;
        this.currentExpansion = 0;
        this.velocity = 0;
        this.lastY = 0;
        this.lastTime = 0;
        this.isExpanded = false;
        this.expandedStateMonitor = null;
        
        // Thresholds for snapping
        this.snapThreshold = 0.3;
        this.velocityThreshold = 0.5;
        this.expansionThreshold = 0.3;
        
        this.init();
    }
    
    init() {
        // Only enable on mobile devices (width <= 768px)
        if (window.innerWidth > 768) return;
        
        // Clear any existing expanded state monitor
        if (this.expandedStateMonitor) {
            clearInterval(this.expandedStateMonitor);
            this.expandedStateMonitor = null;
        }
        
        // Check if panel is already in an expanded state
        const wasExpanded = this.panel.style.height === '70vh' || this.panel.classList.contains('snap-expanded');
        
        // Clear any existing snap classes
        this.panel.classList.remove('snap-open', 'snap-closed', 'snap-expanded');
        
        // Only reset to default state if not already expanded
        if (!wasExpanded) {
            this.isExpanded = false;
            this.panel.style.height = '50vh';
        } else {
            this.isExpanded = true;
            this.panel.style.height = '70vh';
            this.panel.style.bottom = '0px';
        }
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Touch events
        this.panel.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.panel.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.panel.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Mouse events for testing on desktop
        this.panel.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    handleTouchStart(e) {
        // Only handle touches when panel is active
        if (!this.panel.classList.contains('active')) {
            return;
        }
        
        // Don't handle if clicking on excluded elements
        for (const selector of this.options.excludeSelectors) {
            if (e.target.closest(selector)) {
                return;
            }
        }
        
        const touch = e.touches[0];
        const rect = this.panel.getBoundingClientRect();
        const touchY = touch.clientY - rect.top;
        
        // Find the panel-header element
        const panelHeader = this.panel.querySelector('.panel-header');
        if (!panelHeader) {
            return;
        }
        
        const headerRect = panelHeader.getBoundingClientRect();
        const headerTop = headerRect.top - rect.top;
        const headerHeight = headerRect.height;
        
        // Check if touch is within the panel-header area
        if (touchY < headerTop || touchY > headerTop + headerHeight) {
            return;
        }
        
        // Only prevent default if we're actually going to handle the drag
        this.startDrag(touch.clientY);
        e.preventDefault();
    }
    
    handleTouchMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        this.updateDrag(touch.clientY);
    }
    
    handleTouchEnd(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.endDrag();
    }
    
    handleMouseDown(e) {
        // Only handle clicks when panel is active
        if (!this.panel.classList.contains('active')) {
            return;
        }
        
        // Don't handle if clicking on excluded elements
        for (const selector of this.options.excludeSelectors) {
            if (e.target.closest(selector)) {
                return;
            }
        }
        
        const rect = this.panel.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        
        // Find the panel-header element
        const panelHeader = this.panel.querySelector('.panel-header');
        if (!panelHeader) {
            return;
        }
        
        const headerRect = panelHeader.getBoundingClientRect();
        const headerTop = headerRect.top - rect.top;
        const headerHeight = headerRect.height;
        
        // Check if click is within the panel-header area
        if (clickY < headerTop || clickY > headerTop + headerHeight) {
            return;
        }
        
        e.preventDefault();
        this.startDrag(e.clientY);
    }
    
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.updateDrag(e.clientY);
    }
    
    handleMouseUp(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.endDrag();
    }
    
    startDrag(y) {
        this.isDragging = true;
        this.startY = y;
        this.startBottom = this.getCurrentBottom();
        this.currentBottom = this.startBottom;
        this.velocity = 0;
        this.lastY = y;
        this.lastTime = Date.now();
        
        this.panel.classList.add('dragging');
    }
    
    updateDrag(y) {
        
        if (!this.isDragging) {
            return;
        }
        
        const deltaY = this.startY - y;
        const newBottom = this.startBottom + deltaY;
        
        // Check if this is a desktop panel (uses right positioning) or mobile panel (uses bottom positioning)
        const isDesktopPanel = window.innerWidth > 768;
        
        if (isDesktopPanel) {
            // For desktop panels, we'll use a different approach - just add visual feedback
            // since desktop panels slide in from the right, not up from bottom
            this.panel.classList.add('dragging');
            return;
        }
        
        // Mobile panel logic (bottom positioning)
        // Constrain to reasonable bounds
        const maxBottom = 0; // Fully open
        const minBottom = -window.innerHeight * 0.5; // Fully closed (50vh)
        
        this.currentBottom = Math.max(minBottom, Math.min(maxBottom, newBottom));
        
        // Handle expansion when dragging up beyond the top
        if (newBottom > 0) {
            // Calculate expansion percentage (0 = normal, 1 = fully expanded to 70vh)
            const expansionPercent = Math.min(newBottom / (window.innerHeight * 0.3), 1);
            this.currentExpansion = expansionPercent;
            
            // Apply expansion (50vh to 70vh)
            const newHeight = 50 + (expansionPercent * 20);
            this.panel.style.height = `${newHeight}vh`;
            this.panel.style.bottom = '0px';
            
            // Update content heights dynamically
            this.updateContentHeights(newHeight);
        } else {
            this.currentExpansion = 0;
            this.panel.style.height = '50vh';
            this.panel.style.bottom = `${this.currentBottom}px`;
            
            // Reset content heights
            this.updateContentHeights(50);
        }
        
        // Calculate velocity
        const now = Date.now();
        const timeDelta = now - this.lastTime;
        if (timeDelta > 0) {
            this.velocity = (this.lastY - y) / timeDelta;
        }
        this.lastY = y;
        this.lastTime = now;
    }
    
    endDrag() {
        this.isDragging = false;
        this.panel.classList.remove('dragging');
        
        // Check if this is a desktop panel
        const isDesktopPanel = window.innerWidth > 768;
        if (isDesktopPanel) {
            return;
        }
        
        let snapState = 'closed';
        
        // Check if we should snap to expanded (highest priority)
        if (this.currentExpansion > this.expansionThreshold) {
            snapState = 'expanded';
        }
        // Check velocity-based snapping (second priority)
        else if (Math.abs(this.velocity) > this.velocityThreshold) {
            if (this.velocity > 0) {
                // Swiping up - snap to expanded if we have some expansion, otherwise open
                snapState = this.currentExpansion > 0.2 ? 'expanded' : 'open';
            } else {
                // Swiping down - snap to closed
                snapState = 'closed';
            }
        }
        // Check position-based snapping (lowest priority)
        else {
            const panelHeight = window.innerHeight * 0.5; // 50vh
            const currentPosition = Math.abs(this.currentBottom) / panelHeight;
            
            if (currentPosition < this.snapThreshold) {
                snapState = 'open';
            } else {
                snapState = 'closed';
            }
        }
        
        // Apply snap
        switch (snapState) {
            case 'expanded':
                this.snapExpanded();
                break;
            case 'open':
                this.snapOpen();
                break;
            case 'closed':
                this.snapClosed();
                break;
        }
    }
    
    snapOpen() {
        this.isExpanded = false;
        this.panel.classList.add('snap-open');
        this.panel.classList.remove('snap-closed', 'snap-expanded');
        this.panel.style.bottom = '0px';
        this.panel.style.height = '50vh';
        
        // Update content heights
        this.updateContentHeights(50);
        
        // Remove snap classes after animation
        setTimeout(() => {
            this.panel.classList.remove('snap-open');
        }, 400);
    }
    
    snapExpanded() {
        this.isExpanded = true;
        this.panel.classList.add('snap-expanded');
        this.panel.classList.remove('snap-closed', 'snap-open');
        this.panel.style.bottom = '0px';
        this.panel.style.height = '70vh';
        
        // Update content heights
        this.updateContentHeights(70);
        
        // Remove snap classes after animation but maintain expanded state
        setTimeout(() => {
            this.panel.classList.remove('snap-expanded');
            
            // Ensure the panel stays expanded
            if (this.isExpanded) {
                this.forceExpandedState();
            }
        }, 400);
    }
    
    snapClosed() {
        this.isExpanded = false;
        
        // Clear the expanded state monitor immediately to prevent interference
        if (this.expandedStateMonitor) {
            clearInterval(this.expandedStateMonitor);
            this.expandedStateMonitor = null;
        }
        
        this.panel.classList.add('snap-closed');
        this.panel.classList.remove('snap-open', 'snap-expanded');
        this.panel.style.bottom = '-50vh';
        this.panel.style.height = '50vh';
        
        // Handle special cases for different panel types
        if (this.options.panelType === 'concert') {
            // Hide flying tracking layer and deactivate its sidebar item
            if (window.map && window.map.getLayer && window.map.getLayer('flying-tracking')) {
                window.map.setLayoutProperty('flying-tracking', 'visibility', 'none');
            }
            const flyingTrackingItem = document.querySelector('.sidebar-item[data-layer="flying-tracking"]');
            if (flyingTrackingItem) {
                flyingTrackingItem.classList.remove('active');
            }
            // Reset flight tracks to show all when panel is closed
            if (window.map && window.resetFlightTracks) {
                window.resetFlightTracks(window.map);
            }
        }
        
        // Call custom onSnapClosed callback if provided
        if (this.options.onSnapClosed) {
            this.options.onSnapClosed();
        }
        
        // Remove active class and snap classes after animation
        setTimeout(() => {
            this.panel.classList.remove('active', 'snap-closed');
            // Update content heights after animation completes to prevent interference
            this.updateContentHeights(50);
        }, 400);
    }
    
    getCurrentBottom() {
        // Check if this is a desktop panel (uses right positioning) or mobile panel (uses bottom positioning)
        const isDesktopPanel = window.innerWidth > 768;
        
        if (isDesktopPanel) {
            // For desktop panels, check if the panel is active (visible) or not
            const isActive = this.panel.classList.contains('active');
            return isActive ? 0 : -1000; // Return 0 if active, -1000 if not active
        }
        
        // For mobile panels, check the bottom property
        const bottom = this.panel.style.bottom;
        if (bottom === '') {
            return this.panel.classList.contains('active') ? 0 : -window.innerHeight * 0.5;
        }
        return parseInt(bottom);
    }
    
    updateContentHeights(panelHeight) {
        const { contentSelectors } = this.options;
        
        // Update panel body
        const panelBody = this.panel.querySelector(contentSelectors.panelBody);
        if (panelBody) {
            panelBody.style.setProperty('max-height', `calc(${panelHeight}vh - 40px)`, 'important');
            panelBody.style.setProperty('min-height', `calc(${panelHeight}vh - 40px)`, 'important');
        }

        // Update main content (concert panels)
        const mainContent = this.panel.querySelector(contentSelectors.mainContent);
        if (mainContent) {
            mainContent.style.setProperty('max-height', `${panelHeight}vh`, 'important');
        }

        // Update bonus content (bonus panels)
        const bonusContent = this.panel.querySelector(contentSelectors.bonusContent);
        if (bonusContent) {
            bonusContent.style.setProperty('max-height', `calc(${panelHeight}vh - 80px)`, 'important');
            bonusContent.style.setProperty('min-height', `calc(${panelHeight}vh - 80px)`, 'important');
        }

        // Update fans activities content (fans-activities panels)
        const fansActivitiesContent = this.panel.querySelector(contentSelectors.fansActivitiesContent);
        if (fansActivitiesContent) {
            fansActivitiesContent.style.setProperty('max-height', `calc(${panelHeight}vh - 80px)`, 'important');
            fansActivitiesContent.style.setProperty('min-height', `calc(${panelHeight}vh - 80px)`, 'important');
        }

        // Update message wall elements (concert panels)
        const messageWall = this.panel.querySelector(contentSelectors.messageWall);
        const messageWallOnly = this.panel.querySelector(contentSelectors.messageWallOnly);
        
        if (messageWallOnly) {
            messageWallOnly.style.setProperty('max-height', `calc(${panelHeight}vh - 80px)`, 'important');
            messageWallOnly.style.setProperty('min-height', `calc(${panelHeight}vh - 80px)`, 'important');
        }
        if (messageWall) {
            messageWall.style.setProperty('max-height', `calc(${panelHeight}vh - 60px)`, 'important');
            messageWall.style.setProperty('min-height', `calc(${panelHeight}vh - 60px)`, 'important');
        }

        // Update playlist container (concert panels)
        const playlistContainer = this.panel.querySelector(contentSelectors.playlistContainer);
        if (playlistContainer) {
            playlistContainer.style.setProperty('max-height', `calc(${panelHeight}vh - 60px)`, 'important');
            playlistContainer.style.setProperty('min-height', `calc(${panelHeight}vh - 60px)`, 'important');
        }
    }
    
    forceExpandedState() {
        if (this.isExpanded && this.panel.classList.contains('active')) {
            this.panel.style.height = '70vh';
            this.panel.style.bottom = '0px';
            this.updateContentHeights(70);
            
            // Set up a monitoring interval to ensure the state persists
            if (!this.expandedStateMonitor) {
                this.expandedStateMonitor = setInterval(() => {
                    // Only monitor if panel is still active and expanded
                    if (this.isExpanded && this.panel.classList.contains('active') && !this.panel.classList.contains('snap-closed')) {
                        const currentHeight = this.panel.style.height;
                        const currentBottom = this.panel.style.bottom;
                        
                        if (currentHeight !== '70vh' || currentBottom !== '0px') {
                            this.panel.style.height = '70vh';
                            this.panel.style.bottom = '0px';
                            this.updateContentHeights(70);
                        }
                    } else {
                        // Clear the monitor if no longer expanded or if closing
                        if (this.expandedStateMonitor) {
                            clearInterval(this.expandedStateMonitor);
                            this.expandedStateMonitor = null;
                        }
                    }
                }, 100);
            }
        }
    }
    
    destroy() {
        // Remove event listeners with proper binding
        this.panel.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.panel.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        this.panel.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        this.panel.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Clear monitoring interval
        if (this.expandedStateMonitor) {
            clearInterval(this.expandedStateMonitor);
            this.expandedStateMonitor = null;
        }
        
        // Reset panel state
        this.isDragging = false;
        this.isExpanded = false;
        
        // Remove any snap classes
        this.panel.classList.remove('snap-open', 'snap-closed', 'snap-expanded', 'dragging');
    }
}

// Global instances
let draggablePanelInstances = new Map();

// Initialize draggable panel for concert panel
export const initDraggablePanel = () => {
    const panel = document.getElementById('detail-panel');
    
    if (panel && window.innerWidth <= 768 && panel.classList.contains('active')) {
        // Check if panel was previously expanded
        const wasExpanded = panel.style.height === '70vh' || panel.classList.contains('snap-expanded');
        
        // Clean up existing instance
        if (draggablePanelInstances.has('concert')) {
            draggablePanelInstances.get('concert').destroy();
        }
        
        const instance = new UnifiedDraggablePanel(panel, {
            panelType: 'concert',
            contentSelectors: {
                panelBody: '.panel-body',
                mainContent: '.concert-panel-content',
                bonusContent: null,
                messageWall: '.message-wall',
                messageWallOnly: '.message-wall-only',
                playlistContainer: '.playlist-container'
            },
            excludeSelectors: ['.nav-btn']
        });
        
        // If panel was previously expanded, restore the expanded state
        if (wasExpanded) {
            instance.isExpanded = true;
            panel.style.height = '70vh';
            panel.style.bottom = '0px';
            instance.updateContentHeights(70);
            // Don't call forceExpandedState immediately to avoid conflicts
            setTimeout(() => {
                if (instance.isExpanded && panel.classList.contains('active')) {
                    instance.forceExpandedState();
                }
            }, 100);
        }
        
        draggablePanelInstances.set('concert', instance);
    } else {
        // Clean up if panel is not active
        if (draggablePanelInstances.has('concert')) {
            draggablePanelInstances.get('concert').destroy();
            draggablePanelInstances.delete('concert');
        }
    }
};

// Initialize draggable panel for bonus panel
export const initBonusDraggablePanel = () => {
    const panel = document.getElementById('bonus-panel');
    
    if (panel && window.innerWidth <= 768 && panel.classList.contains('active')) {
        // Clean up existing instance
        if (draggablePanelInstances.has('bonus')) {
            draggablePanelInstances.get('bonus').destroy();
        }
        
        const instance = new UnifiedDraggablePanel(panel, {
            panelType: 'bonus',
            contentSelectors: {
                panelBody: '.panel-body',
                mainContent: null,
                bonusContent: '.bonus-content',
                messageWall: null,
                messageWallOnly: null,
                playlistContainer: null
            },
            excludeSelectors: ['.close-panel', '.nav-btn']
        });
        
        draggablePanelInstances.set('bonus', instance);
    } else {
        // Clean up if panel is not active
        if (draggablePanelInstances.has('bonus')) {
            draggablePanelInstances.get('bonus').destroy();
            draggablePanelInstances.delete('bonus');
        }
    }
};

// Initialize draggable panel for fans activities panel
export const initFansActivitiesDraggablePanel = () => {
    const panel = document.getElementById('fans-activities-panel');
    
    if (panel && window.innerWidth <= 768 && panel.classList.contains('active')) {
        // Clean up existing instance first
        if (draggablePanelInstances.has('fans-activities')) {
            const existingInstance = draggablePanelInstances.get('fans-activities');
            existingInstance.destroy();
            draggablePanelInstances.delete('fans-activities');
        }
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            if (panel && panel.classList.contains('active')) {
                const instance = new UnifiedDraggablePanel(panel, {
                    panelType: 'fans-activities',
                    contentSelectors: {
                        panelBody: '.panel-body',
                        mainContent: null,
                        bonusContent: null,
                        fansActivitiesContent: '.activities-list',
                        messageWall: null,
                        messageWallOnly: null,
                        playlistContainer: null
                    },
                    excludeSelectors: ['.nav-btn', '.navigation-buttons']
                });
                
                draggablePanelInstances.set('fans-activities', instance);
            }
        }, 50);
    } else {
        // Clean up if panel is not active
        if (draggablePanelInstances.has('fans-activities')) {
            const existingInstance = draggablePanelInstances.get('fans-activities');
            existingInstance.destroy();
            draggablePanelInstances.delete('fans-activities');
        }
    }
};

// Get instances for external access
export const getDraggablePanelInstance = () => draggablePanelInstances.get('concert');
export const getBonusDraggablePanelInstance = () => draggablePanelInstances.get('bonus');
export const getFansActivitiesDraggablePanelInstance = () => draggablePanelInstances.get('fans-activities');

// Cleanup functions
export const cleanupDraggablePanel = () => {
    if (draggablePanelInstances.has('concert')) {
        const instance = draggablePanelInstances.get('concert');
        instance.destroy();
        draggablePanelInstances.delete('concert');
    }
};

export const cleanupBonusDraggablePanel = () => {
    if (draggablePanelInstances.has('bonus')) {
        const instance = draggablePanelInstances.get('bonus');
        instance.destroy();
        draggablePanelInstances.delete('bonus');
    }
};

export const cleanupFansActivitiesDraggablePanel = () => {
    if (draggablePanelInstances.has('fans-activities')) {
        const instance = draggablePanelInstances.get('fans-activities');
        instance.destroy();
        draggablePanelInstances.delete('fans-activities');
    }
};

// Reinitialize on window resize
window.addEventListener('resize', () => {
    const concertPanel = document.getElementById('detail-panel');
    const bonusPanel = document.getElementById('bonus-panel');
    const fansActivitiesPanel = document.getElementById('fans-activities-panel');
    
    if (window.innerWidth <= 768) {
        if (concertPanel && concertPanel.classList.contains('active')) {
            initDraggablePanel();
        } else {
            cleanupDraggablePanel();
        }
        
        if (bonusPanel && bonusPanel.classList.contains('active')) {
            initBonusDraggablePanel();
        } else {
            cleanupBonusDraggablePanel();
        }
        
        if (fansActivitiesPanel && fansActivitiesPanel.classList.contains('active')) {
            initFansActivitiesDraggablePanel();
        } else {
            cleanupFansActivitiesDraggablePanel();
        }
    } else {
        cleanupDraggablePanel();
        cleanupBonusDraggablePanel();
        cleanupFansActivitiesDraggablePanel();
    }
}); 