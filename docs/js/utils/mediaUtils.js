// Media utilities for video handling
import { baseUrl } from '../config.js';

// Get YouTube video thumbnail URL
export function getYouTubeThumbnail(videoId, quality = 'standard') {
    // Use local path for thumbnails
    return `${baseUrl}/img/thumbnails/yt_${videoId}.jpg`;
}

// Get image URL
export function getImageUrl(imagePath) {
    if (!imagePath) return '';
    
    // If imagePath is already a full URL, return it as-is
    if (imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // Use the baseUrl (local or GitHub Pages) for relative image paths
    return `${baseUrl}/${imagePath}`;
}

// Create photo element with loading states and error handling
export function createPhotoElement(imagePath, altText = 'Photo', className = 'photo') {
    if (!imagePath) {
        return `
            <div class="photo-container">
                <div class="photo-placeholder no-photo">
                    <span>📷</span>
                    <span>Photo</span>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="photo-container">
            <img class="${className}" 
                 src="${getImageUrl(imagePath)}" 
                 alt="${altText}"
                 onload="this.style.opacity='1'; this.parentElement.querySelector('.photo-placeholder.loading').style.display='none';"
                 onerror="this.style.display='none'; this.parentElement.querySelector('.photo-placeholder.loading').style.display='none'; this.parentElement.querySelector('.photo-placeholder.error').style.display='flex';"
                 style="opacity: 0; transition: opacity 0.3s ease; width: 100%; height: auto; object-fit: contain; border-radius: 8px;">
            <div class="photo-placeholder loading">
                <div class="loading-spinner"></div>
                <span>Loading...</span>
            </div>
            <div class="photo-placeholder error" style="display: none;">
                <span>📷</span>
                <span>Photo</span>
            </div>
        </div>
    `;
}

import { userInChina } from './geoUtils.js';

// New simplified function for video object with youtube_url and bilibili_url
export function createVideoCoverFromObject(videoObject) {
    if (!videoObject || !videoObject.youtube_url) {
        return null; // Return null if no video object or YouTube URL
    }
    
    // If user is in China but no Bilibili URL, return null
    if (userInChina && !videoObject.bilibili_url) {
        return null;
    }
    
    // Always use YouTube URL to get video ID and thumbnail
    const videoId = parseYouTubeUrl(videoObject.youtube_url);
    const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId) : null;
    
    // Determine redirect URL based on user location
    let redirectUrl = '#';
    if (userInChina && videoObject.bilibili_url) {
        redirectUrl = videoObject.bilibili_url;
    } else if (videoObject.youtube_url) {
        redirectUrl = videoObject.youtube_url;
    }
    
    return `
        <div class="mobile-video-cover" onclick="window.open('${redirectUrl}', '_blank')">
            <div class="video-thumbnail">
                ${thumbnailUrl ? `
                    <img src="${thumbnailUrl}" 
                         alt="Video thumbnail" 
                         onload="this.style.opacity='1'; this.parentElement.querySelector('.photo-placeholder.loading').style.display='none';" 
                         onerror="this.style.display='none'; this.parentElement.querySelector('.photo-placeholder.loading').style.display='none'; this.parentElement.querySelector('.photo-placeholder.error').style.display='flex';"
                         style="opacity: 0; transition: opacity 0.3s ease;">
                    <div class="photo-placeholder loading">
                        <div class="loading-spinner"></div>
                        <span>Loading...</span>
                    </div>
                    <div class="photo-placeholder error" style="display: none;">
                        <span>🎵</span>
                        <span>Video</span>
                    </div>
                ` : `
                    <div class="photo-placeholder no-photo">
                        <span>🎵</span>
                        <span>Video</span>
                    </div>
                `}
            </div>
            <div class="play-button youtube-play-button">
                <img src="${baseUrl}/img/PlayButton.png" alt="Play" class="play-icon">
            </div>
        </div>
    `;
}

// Parse YouTube URLs to extract video IDs
export function parseYouTubeUrl(url) {
    if (!url) return null;
    
    try {
        url = url.trim();
        
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            return null;
        }

        // Handle youtu.be URLs
        if (url.includes('youtu.be')) {
            const urlParts = url.split('youtu.be/');
            if (urlParts.length > 1) {
                const videoId = urlParts[1].split(/[?#]/)[0];
                return videoId || null;
            }
            return null;
        }

        // For youtube.com URLs
        if (url.includes('youtube.com')) {
            // Try to get v parameter
            const vParam = url.split('v=')[1];
            if (vParam) {
                const videoId = vParam.split(/[?&#]/)[0];
                return videoId || null;
            }
            
            // Try to get from shorts URL
            if (url.includes('/shorts/')) {
                const shortsParts = url.split('/shorts/');
                if (shortsParts.length > 1) {
                    const videoId = shortsParts[1].split(/[?#]/)[0];
                    return videoId || null;
                }
            }
            
            // Try to get from embed URL
            if (url.includes('/embed/')) {
                const embedParts = url.split('/embed/');
                if (embedParts.length > 1) {
                    const videoId = embedParts[1].split(/[?#]/)[0];
                    return videoId || null;
                }
            }
        }

        // Fallback to URL object
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(fullUrl);
        let videoId = '';

        if (url.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
            if (!videoId && urlObj.pathname.includes('embed')) {
                const pathParts = urlObj.pathname.split('/');
                videoId = pathParts[pathParts.indexOf('embed') + 1];
            }
            if (!videoId && urlObj.pathname.includes('shorts')) {
                const pathParts = urlObj.pathname.split('/');
                videoId = pathParts[pathParts.indexOf('shorts') + 1];
            }
        }

        videoId = videoId ? videoId.split(/[?&#]/)[0] : '';
        return videoId || null;
    } catch (error) {
        console.error('Error parsing YouTube URL:', error);
        // Final fallback with basic string manipulation
        try {
            if (url.includes('v=')) {
                const videoId = url.split('v=')[1].split(/[?&#]/)[0];
                return videoId || null;
            }
        } catch (e) {
            console.error('Final fallback failed:', e);
        }
        return null;
    }
} 

// Create clickable photo element with link redirect (YouTube thumbnail style)
export function createClickablePhotoElement(imagePath, linkUrl, altText = 'Photo', className = 'photo') {
    if (!imagePath) {
        return `
            <div class="photo-container">
                <div class="photo-placeholder no-photo">
                    <span>📷</span>
                    <span>Photo</span>
                </div>
            </div>
        `;
    }
    
    const imageUrl = getImageUrl(imagePath);
    const clickHandler = linkUrl ? `onclick="window.open('${linkUrl}', '_blank')"` : '';
    
    return `
        <div class="mobile-video-cover" ${clickHandler}>
            <div class="video-thumbnail">
                <img src="${imageUrl}" 
                     alt="${altText}" 
                     onload="this.style.opacity='1'; this.parentElement.querySelector('.photo-placeholder.loading').style.display='none';" 
                     onerror="this.style.display='none'; this.parentElement.querySelector('.photo-placeholder.loading').style.display='none'; this.parentElement.querySelector('.photo-placeholder.error').style.display='flex';"
                     style="opacity: 0; transition: opacity 0.3s ease;">
                <div class="photo-placeholder loading">
                    <div class="loading-spinner"></div>
                    <span>Loading...</span>
                </div>
                <div class="photo-placeholder error" style="display: none;">
                    <span>🔗</span>
                    <span>Link</span>
                </div>
            </div>
            <div class="play-button youtube-play-button">
                <img src="${baseUrl}/img/PlayButton.png" alt="Open Link" class="play-icon">
            </div>
        </div>
    `;
}

// Create reference link element with 🔗 icon (specifically for bonus reference links)
export function createReferenceLinkElement(imagePath, linkUrl, altText = 'Reference Photo', className = 'photo') {
    if (!imagePath) {
        return `
            <div class="photo-container">
                <div class="photo-placeholder no-photo">
                    <span>📷</span>
                    <span>Photo</span>
                </div>
            </div>
        `;
    }
    
    const imageUrl = getImageUrl(imagePath);
    const clickHandler = linkUrl ? `onclick="window.open('${linkUrl}', '_blank')"` : '';
    
    return `
        <div class="mobile-video-cover" ${clickHandler}>
            <div class="video-thumbnail">
                <img src="${imageUrl}" 
                     alt="${altText}" 
                     onload="this.style.opacity='1'; this.parentElement.querySelector('.photo-placeholder.loading').style.display='none';" 
                     onerror="this.style.display='none'; this.parentElement.querySelector('.photo-placeholder.loading').style.display='none'; this.parentElement.querySelector('.photo-placeholder.error').style.display='flex';"
                     style="opacity: 0; transition: opacity 0.3s ease;">
                <div class="photo-placeholder loading">
                    <div class="loading-spinner"></div>
                    <span>Loading...</span>
                </div>
                <div class="photo-placeholder error" style="display: none;">
                    <span>🔗</span>
                    <span>Link</span>
                </div>
            </div>
            <div class="play-button youtube-play-button">
                <img src="${baseUrl}/img/refbutton.png" alt="Reference Link" class="play-icon">
            </div>
        </div>
    `;
} 