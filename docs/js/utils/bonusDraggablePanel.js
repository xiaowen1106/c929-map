// Draggable Panel Utility for Bonus Panel Mobile Bottom Sheet
class BonusDraggablePanel {
    constructor(panelElement) {
        this.panel = panelElement;
        this.isDragging = false;
        this.startY = 0;
        this.startBottom = 0;
        this.currentBottom = 0;
        this.currentExpansion = 0;
        this.velocity = 0;
        this.lastY = 0;
        this.lastTime = 0;
        this.isExpanded = false; // Track expanded state
        
        // Thresholds for snapping
        this.snapThreshold = 0.3; // 30% of panel height
        this.velocityThreshold = 0.5; // pixels per millisecond
        this.expansionThreshold = 0.3; // 30% expansion to snap to expanded (lowered from 0.5)
        
        this.init();
    }
    
    init() {
        // Only enable on mobile
        if (window.innerWidth > 768) return;
        
        // Clear any existing expanded state monitor
        if (this.expandedStateMonitor) {
            clearInterval(this.expandedStateMonitor);
            this.expandedStateMonitor = null;
        }
        
        // Clear any existing snap classes and reset to default state
        this.panel.classList.remove('snap-open', 'snap-closed', 'snap-expanded');
        this.isExpanded = false;
        
        // Ensure panel is in the correct initial state
        this.panel.style.height = '50vh';
        this.panel.style.bottom = '0px';
        
        // Update content heights to match initial state
        this.updateContentHeights(50);
        
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
        // Only handle touches in the panel-header area and when panel is active
        if (!this.panel.classList.contains('active')) return;
        
        // Don't handle if clicking on close button
        if (e.target.closest('.close-panel')) return;
        
        const touch = e.touches[0];
        const rect = this.panel.getBoundingClientRect();
        const touchY = touch.clientY - rect.top;
        
        // Find the panel-header element
        const panelHeader = this.panel.querySelector('.panel-header');
        if (!panelHeader) return;
        
        const headerRect = panelHeader.getBoundingClientRect();
        const headerTop = headerRect.top - rect.top;
        const headerHeight = headerRect.height;
        
        // Check if touch is within the panel-header area
        if (touchY < headerTop || touchY > headerTop + headerHeight) return;
        
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
        // Only handle clicks in the panel-header area and when panel is active
        if (!this.panel.classList.contains('active')) return;
        
        // Don't handle if clicking on close button
        if (e.target.closest('.close-panel')) return;
        
        const rect = this.panel.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        
        // Find the panel-header element
        const panelHeader = this.panel.querySelector('.panel-header');
        if (!panelHeader) return;
        
        const headerRect = panelHeader.getBoundingClientRect();
        const headerTop = headerRect.top - rect.top;
        const headerHeight = headerRect.height;
        
        // Check if click is within the panel-header area
        if (clickY < headerTop || clickY > headerTop + headerHeight) return;
        
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
        const deltaY = this.startY - y;
        const newBottom = this.startBottom + deltaY;
        
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
        
        console.log('End drag - snapState:', snapState, 'currentExpansion:', this.currentExpansion, 'velocity:', this.velocity);
        
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
        console.log('Snapping to expanded state');
        this.isExpanded = true;
        this.panel.classList.add('snap-expanded');
        this.panel.classList.remove('snap-closed', 'snap-open');
        this.panel.style.bottom = '0px';
        this.panel.style.height = '70vh';
        
        // Update content heights
        this.updateContentHeights(70);
        
        // Remove snap classes after animation but maintain expanded state
        setTimeout(() => {
            console.log('Removing snap-expanded class, isExpanded:', this.isExpanded);
            this.panel.classList.remove('snap-expanded');
            
            // Ensure the panel stays expanded
            if (this.isExpanded) {
                console.log('Maintaining expanded state');
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
        
        // Update content heights
        this.updateContentHeights(50);
        
        // Remove active class and snap classes after animation
        setTimeout(() => {
            this.panel.classList.remove('active', 'snap-closed');
        }, 400);
    }
    
    getCurrentBottom() {
        const bottom = this.panel.style.bottom;
        if (bottom === '') {
            return this.panel.classList.contains('active') ? 0 : -window.innerHeight * 0.5;
        }
        return parseInt(bottom);
    }
    
    updateContentHeights(panelHeight) {
        const panelBody = this.panel.querySelector('.panel-body');
        const bonusContent = this.panel.querySelector('.bonus-content');

        if (panelBody) {
            panelBody.style.setProperty('max-height', `calc(${panelHeight}vh - 40px)`, 'important');
            panelBody.style.setProperty('min-height', `calc(${panelHeight}vh - 40px)`, 'important');
        }

        if (bonusContent) {
            bonusContent.style.setProperty('max-height', `calc(${panelHeight}vh - 80px)`, 'important');
            bonusContent.style.setProperty('min-height', `calc(${panelHeight}vh - 80px)`, 'important');
        }
    }
    
    forceExpandedState() {
        if (this.isExpanded && this.panel.classList.contains('active')) {
            console.log('Forcing expanded state');
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
                            console.log('Correcting expanded state - height:', currentHeight, 'bottom:', currentBottom);
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
        // Remove event listeners
        this.panel.removeEventListener('touchstart', this.handleTouchStart);
        this.panel.removeEventListener('touchmove', this.handleTouchMove);
        this.panel.removeEventListener('touchend', this.handleTouchEnd);
        this.panel.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // Clear monitoring interval
        if (this.expandedStateMonitor) {
            clearInterval(this.expandedStateMonitor);
            this.expandedStateMonitor = null;
        }
    }
}

// Global instance for bonus panel
let bonusDraggablePanelInstance = null;

// Initialize draggable panel for bonus panel
export const initBonusDraggablePanel = () => {
    const panel = document.getElementById('bonus-panel');
    
    if (panel && window.innerWidth <= 768 && panel.classList.contains('active')) {
        // Clean up existing instance
        if (bonusDraggablePanelInstance) {
            bonusDraggablePanelInstance.destroy();
        }
        
        bonusDraggablePanelInstance = new BonusDraggablePanel(panel);
    } else {
        // Clean up if panel is not active
        if (bonusDraggablePanelInstance) {
            bonusDraggablePanelInstance.destroy();
            bonusDraggablePanelInstance = null;
        }
    }
};

// Export the instance for external access
export const getBonusDraggablePanelInstance = () => bonusDraggablePanelInstance;

// Cleanup function for bonus panel
export const cleanupBonusDraggablePanel = () => {
    if (bonusDraggablePanelInstance) {
        bonusDraggablePanelInstance.destroy();
        bonusDraggablePanelInstance = null;
    }
};

// Reinitialize on window resize only if bonus panel is active
window.addEventListener('resize', () => {
    const panel = document.getElementById('bonus-panel');
    if (window.innerWidth <= 768 && panel && panel.classList.contains('active')) {
        initBonusDraggablePanel();
    } else {
        cleanupBonusDraggablePanel();
    }
}); 