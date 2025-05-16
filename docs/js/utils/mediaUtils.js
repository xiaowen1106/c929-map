// Convert Google Drive URLs to direct access or preview URLs
export function convertGoogleDriveUrl(url) {
    if (!url.includes('drive.google.com')) return url;
    
    let fileId = '';
    
    // Extract file ID from various Google Drive URL formats
    if (url.includes('/file/d/')) {
        fileId = url.split('/file/d/')[1].split('/')[0];
    } else if (url.includes('?id=')) {
        fileId = url.split('?id=')[1].split('&')[0];
    }
    
    if (!fileId) return url;
    
    // Check if it's an image by extension (common image formats)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const isImage = imageExtensions.some(ext => url.toLowerCase().includes(ext));
    
    if (isImage) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    } else {
        // For other files (including videos), use the preview URL
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }
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

// Create a YouTube iframe element
export function createYouTubeEmbed(videoId) {
    return `
        <div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
            <iframe 
                src="https://www.youtube.com/embed/${videoId}"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
            ></iframe>
        </div>
    `;
}

// Process media URL for display
export function processMediaUrl(url, index = 0) {
    const processedUrl = convertGoogleDriveUrl(url);
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = parseYouTubeUrl(url);
        return videoId ? createYouTubeEmbed(videoId) : '';
    } else if (url.includes('drive.google.com')) {
        return `
            <div class="video-container">
                <iframe src="${processedUrl}"
                        frameborder="0"
                        allowfullscreen></iframe>
            </div>
        `;
    } else {
        return `<img src="${processedUrl}" alt="Media ${index + 1}" class="${index === 0 ? 'active' : ''}">`;
    }
} 