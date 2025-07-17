// Import closeMessagesPanel function
import { closeMessagesPanel } from './messagesPanel.js';
import { createVideoCoverFromObject, getImageUrl, createPhotoElement } from '../utils/mediaUtils.js';

import { initDraggablePanel, cleanupDraggablePanel, getDraggablePanelInstance } from '../utils/draggablePanel.js';

// Panel state management for cleanup
class ConcertPanelManager {
    constructor() {
        this.currentCity = null;
        this.currentData = null;
        this.eventListeners = new Map();
        this.messageCache = new Map();
        this.timeoutIds = new Set();
        this.isInitialized = false;
    }

    // Cleanup all resources
    cleanup() {
        this.cleanupEventListeners();
        this.cleanupTimeouts();
        this.resetState();
        cleanupDraggablePanel();
    }

    // Cleanup event listeners
    cleanupEventListeners() {
        this.eventListeners.forEach((listener, element) => {
            if (element && element.removeEventListener) {
                element.removeEventListener('click', listener);
            }
        });
        this.eventListeners.clear();
    }

    // Cleanup timeouts
    cleanupTimeouts() {
        this.timeoutIds.forEach(timeoutId => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        });
        this.timeoutIds.clear();
    }

    // Reset panel state
    resetState() {
        this.currentCity = null;
        this.currentData = null;
        this.isInitialized = false;
    }

    // Track timeout for cleanup
    trackTimeout(timeoutId) {
        if (timeoutId) {
            this.timeoutIds.add(timeoutId);
        }
    }

    // Cache message data
    cacheMessages(city, messages) {
        this.messageCache.set(city, messages);
    }

    // Get cached messages
    getCachedMessages(city) {
        return this.messageCache.get(city);
    }
}

// Global panel manager instance
const panelManager = new ConcertPanelManager();

// Export cleanup function for external use
export const cleanupConcertPanel = () => {
    panelManager.cleanup();
};

// Export panel manager for debugging
export const getPanelManager = () => panelManager;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    panelManager.cleanup();
});

// Cleanup on page visibility change (when user switches tabs)

// Helper function to render fan messages (moved to global scope for reuse)
const renderFanMessages = (messages) => {
    if (!messages || messages.length === 0) {
        return '<p>No fan messages available yet.</p>';
    }

    return `
        <div class="message-wall">
            ${messages.map(message => `
                <div class="message-item">
                    <div class="message-header">
                        <span class="user">${message.from || 'Anonymous'}</span>
                        ${message.date ? `<span class="date">${message.date}</span>` : ''}
                        ${message.likes !== undefined ? `<span class="likes">❤️ ${message.likes}</span>` : ''}
                    </div>
                    <p class="message-text">${message.message ? message.message.replace(/\n/g, '<br>') : ''}</p>
                    <p class="location">${message.location}</p>
                </div>
            `).join('')}
        </div>
    `;
};

// Helper function to handle song title clicks (moved to global scope for reuse)
const handleSongClick = (e) => {
    const songTitle = e.target.closest('.song-title.clickable');
    if (!songTitle) return;

    const songIndex = songTitle.dataset.songIndex;
    
    // Find the song item container
    const songItem = songTitle.closest('.song-item');
    if (!songItem) return;
    
    // Handle mobile video covers - look within the specific song item
    const mobileVideoContainer = songItem.querySelector(`.song-mobile-video[data-song-index="${songIndex}"]`);
    if (mobileVideoContainer) {
        // Toggle visibility of mobile video cover
        const isCurrentlyHidden = mobileVideoContainer.style.display === 'none' || mobileVideoContainer.style.display === '';
        mobileVideoContainer.style.display = isCurrentlyHidden ? 'block' : 'none';
        
        // Update the expand icon - show the action that will happen when clicked
        const expandIcon = songTitle.querySelector('.expand-icon');
        if (expandIcon) {
            expandIcon.classList.toggle('expanded', isCurrentlyHidden);
        }
    }
};

// Helper function to handle document clicks for panel closing (moved to global scope for reuse)
const handleDocumentClick = (e) => {
    const panel = document.getElementById('detail-panel');

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
    const isClickOnViewDetailsBtn = e.target.classList.contains('view-details');
    const isClickOnPopup = e.target.closest('.mapboxgl-popup');

    if (!isClickInsidePanel && !isClickOnViewDetailsBtn && !isClickOnPopup) {
        // Only close if panel is currently active
        if (panel.classList.contains('active')) {
            // On mobile, use the draggable panel's snap closed functionality
            const draggableInstance = getDraggablePanelInstance();
            if (window.innerWidth <= 768 && draggableInstance) {
                draggableInstance.snapClosed();
            } else {
                panel.classList.remove('active');
            }
        }
        
        // Cleanup when panel is closed
        panelManager.cleanupEventListeners();
        panelManager.cleanupTimeouts();
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
};

// Helper function to handle tab clicks (moved to global scope for reuse)
const handleTabClick = async (e) => {
    const button = e.target.closest('.tab-button');
    if (!button) return;

    const infoPanel = document.getElementById('detail-info');

    // Handle primary tabs
    if (button.closest('.primary-tabs')) {
        // Remove active class from all primary tabs and content
        infoPanel.querySelectorAll('.primary-tabs .tab-button').forEach(btn => btn.classList.remove('active'));
        infoPanel.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to clicked tab and its content
        button.classList.add('active');
        const targetContent = infoPanel.querySelector(button.dataset.tabTarget);
        if (targetContent) {
            targetContent.classList.add('active');
            
            // If switching to fans panel, load message wall data if it hasn't been loaded yet
            if (button.dataset.tabTarget === '#fans-panel') {
                const messagesContent = targetContent.querySelector('#messages-content');
                if (messagesContent && messagesContent.querySelector('.loading-messages')) {
                    const city = panelManager.currentCity;
                    if (city) {
                        await loadMessageWallDataWithCache(messagesContent, city);
                    } else {
                        messagesContent.innerHTML = '<p>留言墙内容即将到来...</p>';
                    }
                }
            }
        }
    }
    
    // Handle secondary tabs
    else if (button.closest('.secondary-tabs')) {
        const tabContainer = button.closest('.secondary-tabs');
        const tabTarget = button.dataset.secondaryTab;

        // Remove active class from sibling tabs
        tabContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked tab
        button.classList.add('active');

        // Show/hide corresponding content
        const parentTabContent = button.closest('.tab-content');
        if (parentTabContent && tabTarget) {
            // Hide all secondary content in this tab
            const contentContainer = parentTabContent.querySelector('.secondary-tab-content');
            if (contentContainer) {
                contentContainer.querySelectorAll('.secondary-content').forEach(content => {
                    content.classList.remove('active');
                });

                // Show the target content
                const targetContent = contentContainer.querySelector(`#${tabTarget}-content`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    
                    // Load message wall data if this is the messages tab and it hasn't been loaded yet
                    if (tabTarget === 'messages' && targetContent.querySelector('.loading-messages')) {
                        const city = panelManager.currentCity;
                        if (city) {
                            await loadMessageWallDataWithCache(targetContent, city);
                        } else {
                            targetContent.innerHTML = '<p>留言墙内容即将到来...</p>';
                        }
                    }
                }
            }
        }
    }
};

// Helper functions to check if data exists for each tab
const hasShenshenWords = (concertData) => {
    return concertData?.shenshen?.words && concertData.shenshen.words.length > 0;
};

const hasBehindTheScenes = (concertData) => {
    return concertData?.shenshen?.behind_the_scenes && concertData.shenshen.behind_the_scenes.length > 0;
};

const hasMediaInterviews = (concertData) => {
    return concertData?.shenshen?.media_interviews && concertData.shenshen.media_interviews.length > 0;
};

const hasPlaylist = (concertData) => {
    return concertData?.shenshen?.playlist && concertData.shenshen.playlist.length > 0;
};

const hasFanSupport = (concertData) => {
    return concertData?.fans?.fan_support && concertData.fans.fan_support.length > 0;
};

const hasStreetInterviews = (concertData) => {
    return concertData?.fans?.street_interviews && concertData.fans.street_interviews.length > 0;
};

const hasBigScreenCheckin = (concertData) => {
    return concertData?.fans?.big_screen_checkin && concertData.fans.big_screen_checkin.length > 0;
};

// Helper function to generate secondary tabs with data checking
const generateSecondaryTabs = (tabType, concertData) => {
    let tabs = [];
    let activeTab = null;
    
    if (tabType === 'shenshen') {
        if (hasShenshenWords(concertData)) {
            tabs.push({ id: 'words', label: '深深的话' });
            activeTab = 'words';
        }
        if (hasBehindTheScenes(concertData)) {
            tabs.push({ id: 'behind', label: '台前幕后' });
            if (!activeTab) activeTab = 'behind';
        }
        if (hasMediaInterviews(concertData)) {
            tabs.push({ id: 'media', label: '媒体采访' });
            if (!activeTab) activeTab = 'media';
        }
        if (hasPlaylist(concertData)) {
            tabs.push({ id: 'playlist', label: '演出歌单' });
            if (!activeTab) activeTab = 'playlist';
        }
    } else if (tabType === 'fans') {
        // Messages tab is always available (will load data dynamically)
        tabs.push({ id: 'messages', label: '留言墙' });
        activeTab = 'messages';
        
        if (hasFanSupport(concertData)) {
            tabs.push({ id: 'support', label: '米子应援' });
        }
        if (hasStreetInterviews(concertData)) {
            tabs.push({ id: 'interviews', label: '街边采访' });
        }
        if (hasBigScreenCheckin(concertData)) {
            tabs.push({ id: 'checkin', label: '大屏打卡' });
        }
    }
    
    return { tabs, activeTab };
};

export const concertsPanel = async (properties) => {
    // Try to load concert-specific data from JSON
    let concertData = null;
    const city = properties.city;
    
    if (city) {
        try {
            // Try to load city-specific JSON file
            const response = await fetch(`data/${city.toLowerCase().replace(/\s+/g, '_')}_concert.json`);
            if (response.ok) {
                concertData = await response.json();
            }
        } catch (error) {
            // No specific data found for this city, using default structure
        }
    }



    // If no concert data is available, show only message wall
    if (!concertData) {
        return `
            <div class="concert-panel-content">
                <div class="panel-header">
                    <div class="panel-header-content">
                        <h2 style="font-size: 1.1em; line-height: 1.3; display: flex; align-items: center; gap: 0.8em;">
                            <img src="img/929hz.png" alt="929Hz" style="height: 2.4em; flex-shrink: 0;">
                            <div class="concert-title">
                                <div class="concert-location">${properties.tour || 'Concert'} - ${properties.address || properties.venue || 'Unknown Venue'}</div>
                                <div class="concert-date">${(properties.venue || properties.address || 'Unknown Venue')} - ${properties.date || 'Date TBA'}</div>
                            </div>
                        </h2>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="message-wall-only">
                        <div class="loading-messages"><p>正在加载留言墙内容...</p></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate secondary tabs for both sections (only when concert data exists)
    const shenshenTabs = generateSecondaryTabs('shenshen', concertData);
    const fansTabs = generateSecondaryTabs('fans', concertData);

    // Helper function to render video content with location-based filtering
    const renderVideo = (video) => {
        const videoCover = createVideoCoverFromObject(video);
        if (!videoCover) {
            return ''; // Don't render anything if video shouldn't be shown
        }
        return `
            <div class="video-item">
                <h4>${video.title}</h4>
                ${videoCover}
            </div>
        `;
    };

    // Helper function to render media interviews
    const renderMediaInterviews = (interviews) => {
        if (!interviews || interviews.length === 0) {
            return '<p>No media interviews available yet.</p>';
        }

        return interviews.map(interview => renderVideo(interview)).join('');
    };

    // Helper function to render playlist
    const renderPlaylist = (playlist) => {
        if (!playlist || playlist.length === 0) {
            return '<p>No playlist available yet.</p>';
        }

        return `
            <div class="playlist-container">
                ${playlist.map((song, index) => {
                    let hasVideo = false;
                    let mobileVideoCover = '';
                    
                    if (song.links && song.links.youtube_video && song.links.youtube_video !== '#') {
                        // Convert legacy URL structure to new object structure
                        const videoObject = {
                            youtube_url: song.links.youtube_video,
                            bilibili_url: song.links.bilibili_video
                        };
                        mobileVideoCover = createVideoCoverFromObject(videoObject);
                        hasVideo = mobileVideoCover !== null;
                    }
                    
                    return `
                        <div class="song-item">
                            <div class="song-item-header">
                                <h4 class="song-title ${hasVideo ? 'clickable' : ''}" ${hasVideo ? `data-song-index="${index}"` : ''}>
                                    ${hasVideo ? '<span class="expand-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></span>' : '<span class="no-video-icon">| </span>'}${song.song_title}
                                </h4>
                                <div class="song-links">
                                    <span class="music-service-icon ${song.links.spotify !== '#' ? 'active' : 'inactive'}">
                                        ${song.links.spotify !== '#' ? 
                                            `<a href="${song.links.spotify}" target="_blank" class="spotify-link"><img src="img/Spotify_Circle.png" alt="Spotify" style="height: 20px; width: auto; vertical-align: middle;"></a>` : 
                                            `<div style="width: 20px; height: 20px;"></div>`
                                        }
                                    </span>
                                    <span class="music-service-icon ${song.links.apple_music !== '#' ? 'active' : 'inactive'}">
                                        ${song.links.apple_music !== '#' ? 
                                            `<a href="${song.links.apple_music}" target="_blank" class="apple-link"><img src="img/AppleMusic_Circle.png" alt="Apple Music" style="height: 20px; width: auto; vertical-align: middle;"></a>` : 
                                            `<div style="width: 20px; height: 20px;"></div>`
                                        }
                                    </span>
                                    <span class="music-service-icon ${song.links.youtube_music !== '#' ? 'active' : 'inactive'}">
                                        ${song.links.youtube_music !== '#' ? 
                                            `<a href="${song.links.youtube_music}" target="_blank" class="youtube-link"><img src="img/YtbMusic_Circle.png" alt="YouTube Music" style="height: 20px; width: auto; vertical-align: middle;"></a>` : 
                                            `<div style="width: 20px; height: 20px;"></div>`
                                        }
                                    </span>
                                </div>
                            </div>
                            ${mobileVideoCover ? `<div class="song-mobile-video" data-song-index="${index}" style="display: none;">${mobileVideoCover}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    // Helper function to render fan support videos
    const renderFanSupport = (support) => {
        if (!support || support.length === 0) {
            return '<p>No fan support videos available yet.</p>';
        }

        return support.map(video => renderVideo(video)).join('');
    };

    // Helper function to load message wall data
    const loadMessageWallData = async (city) => {
        try {
            const response = await fetch(`data/${city.toLowerCase().replace(/\s+/g, '_')}_message_wall.json`);
            if (response.ok) {
                const data = await response.json();
                return data.messages || [];
            }
        } catch (error) {
            // No message wall data found for this city
        }
        return [];
    };

    return `
        <div class="concert-panel-content">
            <div class="panel-header">
                <div class="panel-header-content">
                    <h2 style="font-size: 1.1em; line-height: 1.3; display: flex; align-items: center; gap: 0.8em;">
                        <img src="img/929hz.png" alt="929Hz" style="height: 2.4em; flex-shrink: 0;">
                        <div class="concert-title">
                            <div class="concert-location">${properties.tour || 'Concert'} - ${properties.address || properties.venue || 'Unknown Venue'}</div>
                            <div class="concert-date">${(properties.venue || properties.address || 'Unknown Venue')} - ${properties.date || 'Date TBA'}</div>
                        </div>
                    </h2>
                </div>
            </div>
            <div class="panel-body">
                <div class="tabs primary-tabs">
                    <button class="tab-button shenshen-primary-tab" data-tab-target="#shenshen-panel">
                        <img src="img/shenshen.png" alt="Shen Shen" class="tab-icon">
                        深深的
                    </button>
                    <button class="tab-button active fans-primary-tab" data-tab-target="#fans-panel">
                        <img src="img/mimi.png" alt="Fans" class="tab-icon">
                        生米
                    </button>
                </div>

                <div id="shenshen-panel" class="tab-content">
                    ${shenshenTabs.tabs.length > 0 ? `
                        <div class="tabs secondary-tabs shenshen-tabs ${shenshenTabs.tabs.length === 1 ? 'single-tab' : ''}">
                            ${shenshenTabs.tabs.map((tab, index) => `
                                <button class="tab-button ${index === 0 ? 'active' : ''}" data-secondary-tab="${tab.id}">${tab.label}</button>
                            `).join('')}
                        </div>
                        <div class="secondary-tab-content">
                            ${shenshenTabs.tabs.map((tab, index) => `
                                <div id="${tab.id}-content" class="secondary-content ${index === 0 ? 'active' : ''}">
                                    ${tab.id === 'words' ? 
                                        (concertData?.shenshen?.words ? 
                                            concertData.shenshen.words.map(item => 
                                                item.type === 'image' ? 
                                                    `<img src="${getImageUrl(item.content)}" alt="Shen Shen Words" style="max-width: 100%; height: auto;">` :
                                                    `<p>${item.content}</p>`
                                            ).join('') : 
                                            '<p>深深的话即将到来...</p>'
                                        ) : ''
                                    }
                                    ${tab.id === 'behind' ? 
                                        (concertData?.shenshen?.behind_the_scenes ? 
                                            concertData.shenshen.behind_the_scenes.map(video => renderVideo(video)).join('') :
                                            '<p>台前幕后内容即将到来...</p>'
                                        ) : ''
                                    }
                                    ${tab.id === 'media' ? 
                                        (concertData?.shenshen?.media_interviews ? 
                                            renderMediaInterviews(concertData.shenshen.media_interviews) :
                                            '<p>媒体采访内容即将到来...</p>'
                                        ) : ''
                                    }
                                    ${tab.id === 'playlist' ? 
                                        (concertData?.shenshen?.playlist ? 
                                            renderPlaylist(concertData.shenshen.playlist) :
                                            '<p>演出歌单即将公布...</p>'
                                        ) : ''
                                    }
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>深深的内容即将到来...</p>'}
                </div>

                <div id="fans-panel" class="tab-content active">
                    ${fansTabs.tabs.length > 0 ? `
                        <div class="tabs secondary-tabs fans-tabs ${fansTabs.tabs.length === 1 ? 'single-tab' : ''}">
                            ${fansTabs.tabs.map((tab, index) => `
                                <button class="tab-button ${index === 0 ? 'active' : ''}" data-secondary-tab="${tab.id}">${tab.label}</button>
                            `).join('')}
                        </div>
                        <div class="secondary-tab-content">
                            ${fansTabs.tabs.map((tab, index) => `
                                <div id="${tab.id}-content" class="secondary-content ${index === 0 ? 'active' : ''}">
                                    ${tab.id === 'messages' ? 
                                        '<div class="loading-messages"><p>正在加载留言墙内容...</p></div>' : ''
                                    }
                                    ${tab.id === 'support' ? 
                                        (concertData?.fans?.fan_support ? 
                                            renderFanSupport(concertData.fans.fan_support) :
                                            '<p>米子应援内容即将到来...</p>'
                                        ) : ''
                                    }
                                    ${tab.id === 'interviews' ? 
                                        (concertData?.fans?.street_interviews && concertData.fans.street_interviews.length > 0 ? 
                                            renderFanSupport(concertData.fans.street_interviews) :
                                            '<p>街边采访内容即将到来...</p>'
                                        ) : ''
                                    }
                                    ${tab.id === 'checkin' ? 
                                        (concertData?.fans?.big_screen_checkin && concertData.fans.big_screen_checkin.length > 0 ? 
                                            renderFanSupport(concertData.fans.big_screen_checkin) :
                                            '<p>大屏打卡内容即将到来...</p>'
                                        ) : ''
                                    }
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>生米的内容即将到来...</p>'}
                </div>
            </div>
        </div>
    `;
};

// Detail panel management functions
export const initializeDetailPanel = () => {
    // Cleanup existing resources before initializing
    panelManager.cleanup();

    // Add event listeners with tracking
    const detailPanel = document.getElementById('detail-panel');
    if (detailPanel) {
        detailPanel.addEventListener('click', handleTabClick);
        detailPanel.addEventListener('click', handleSongClick);
        panelManager.eventListeners.set(detailPanel, handleTabClick);
        panelManager.eventListeners.set(detailPanel, handleSongClick);
    }

    document.addEventListener('click', handleDocumentClick);
    panelManager.eventListeners.set(document, handleDocumentClick);

    panelManager.isInitialized = true;
};

// Helper function to load message wall data with caching
const loadMessageWallDataWithCache = async (contentElement, city) => {
    // Check cache first
    const cachedMessages = panelManager.getCachedMessages(city);
    if (cachedMessages) {
        contentElement.innerHTML = renderFanMessages(cachedMessages);
        return;
    }

    // Add a small delay to show the loading animation
    const timeoutId = setTimeout(async () => {
        try {
            const response = await fetch(`data/${city.toLowerCase().replace(/\s+/g, '_')}_message_wall.json`);
            if (response.ok) {
                const data = await response.json();
                const messages = data.messages || [];
                
                // Cache the messages
                panelManager.cacheMessages(city, messages);
                contentElement.innerHTML = renderFanMessages(messages);
            } else {
                contentElement.innerHTML = '<p>留言墙内容即将到来...</p>';
            }
        } catch (error) {
            contentElement.innerHTML = '<p>留言墙内容即将到来...</p>';
        }
    }, 300);

    panelManager.trackTimeout(timeoutId);
};

// Function to show detail panel
export const showDetailPanel = async (type, properties) => {
    const panel = document.getElementById('detail-panel');
    const info = document.getElementById('detail-info');
    
    if (type === 'concert') {
        // Cleanup existing resources before showing new panel
        panelManager.cleanupEventListeners();
        panelManager.cleanupTimeouts();
        
        // Show flying tracking layer and activate its sidebar item
        if (window.map && window.map.getLayer && window.map.getLayer('flying-tracking')) {
            window.map.setLayoutProperty('flying-tracking', 'visibility', 'visible');
        }
        const flyingTrackingItem = document.querySelector('.sidebar-item[data-layer="flying-tracking"]');
        if (flyingTrackingItem) {
            flyingTrackingItem.classList.add('active');
        }
        
        // Close messages panel if it's open
        closeMessagesPanel();
        
        // Store the current concert city for message wall loading
        panelManager.currentCity = properties.city;
        
        // Handle concert panel
        const panelContent = await concertsPanel(properties);
        
        // Set the content directly to the info div
        info.innerHTML = panelContent;
        
        // Re-attach song click handlers for the new content
        const newSongTitles = info.querySelectorAll('.song-title.clickable');
        newSongTitles.forEach(songTitle => {
            songTitle.addEventListener('click', handleSongClick);
            panelManager.eventListeners.set(songTitle, handleSongClick);
        });
        
        // Re-attach document click listener for panel closing
        document.addEventListener('click', handleDocumentClick);
        panelManager.eventListeners.set(document, handleDocumentClick);
        
        // Re-attach tab click handler for the panel
        const detailPanel = document.getElementById('detail-panel');
        if (detailPanel) {
            detailPanel.addEventListener('click', handleTabClick);
            panelManager.eventListeners.set(detailPanel, handleTabClick);
        }
        
        // Auto-load message wall data since fans tab is now active by default
        const fansPanel = info.querySelector('#fans-panel');
        if (fansPanel) {
            const messagesContent = fansPanel.querySelector('#messages-content');
            if (messagesContent && messagesContent.querySelector('.loading-messages')) {
                const city = properties.city;
                if (city) {
                    await loadMessageWallDataWithCache(messagesContent, city);
                } else {
                    messagesContent.innerHTML = '<p>留言墙内容即将到来...</p>';
                }
            }
        }
        
        // Check if this is a concert without concert.json (message wall only)
        const messageWallOnly = info.querySelector('.message-wall-only');
        if (messageWallOnly && messageWallOnly.querySelector('.loading-messages')) {
            const city = properties.city;
            if (city) {
                await loadMessageWallDataWithCache(messageWallOnly, city);
            } else {
                messageWallOnly.innerHTML = '<p>留言墙内容即将到来...</p>';
            }
        }
        
        // Set a flag to prevent immediate closing and indicate we're opening a new panel
        panel.dataset.opening = 'true';
        panel.dataset.openingNew = 'true';

        // Reset panel state before showing
        panel.classList.remove('snap-open', 'snap-closed', 'snap-expanded');
        panel.style.height = '50vh';
        panel.style.bottom = '-50vh';

        panel.classList.add('active');
        
        // Initialize draggable panel for mobile after a short delay
        const timeoutId2 = setTimeout(() => {
            initDraggablePanel();
        }, 200);
        
        panelManager.trackTimeout(timeoutId2);
        
        // Remove the flags after a short delay
        const timeoutId = setTimeout(() => {
            delete panel.dataset.opening;
            delete panel.dataset.openingNew;
        }, 150);
        
        panelManager.trackTimeout(timeoutId);
    }
}; 