// Initialize Mapbox
mapboxgl.accessToken = config.mapboxToken;

const map = new mapboxgl.Map({
    container: 'map',
    style: config.map.style,
    center: config.map.initialView.center,
    zoom: config.map.initialView.zoom,
    minZoom: config.map.initialView.minZoom,
    maxZoom: config.map.initialView.maxZoom
});

// Layer management
const layers = {
    fanWishes: {
        id: 'fan-wishes',
        source: config.dataSources.fanWishes,
        type: 'circle'
    },
    singerActivities: {
        id: 'singer-activities',
        source: config.dataSources.singerActivities,
        type: 'symbol'
    },
    fanMeetups: {
        id: 'fan-meetups',
        source: config.dataSources.fanMeetups,
        type: 'symbol'
    }
};

// Add layers when map loads
map.on('style.load', async () => {
    // Wait for icons to load
    await Promise.all([
        new Promise(resolve => {
            if (map.hasImage('music-15')) {
                resolve();
            } else {
                map.loadImage('https://api.mapbox.com/v4/marker/pin-s-music+4ECDC4.png?access_token=' + mapboxgl.accessToken, (error, image) => {
                    if (error) throw error;
                    map.addImage('music-15', image);
                    resolve();
                });
            }
        }),
        new Promise(resolve => {
            if (map.hasImage('meetup-15')) {
                resolve();
            } else {
                map.loadImage('https://api.mapbox.com/v4/marker/pin-s-heart+45B7D1.png?access_token=' + mapboxgl.accessToken, (error, image) => {
                    if (error) throw error;
                    map.addImage('meetup-15', image);
                    resolve();
                });
            }
        })
    ]);

    // Load GeoJSON data
    for (const [key, layer] of Object.entries(layers)) {
        try {
            const response = await fetch(layer.source);
            const data = await response.json();
            
            map.addSource(layer.id, {
                type: 'geojson',
                data: data
            });

            if (layer.type === 'circle') {
                map.addLayer({
                    id: layer.id,
                    type: 'circle',
                    source: layer.id,
                    paint: {
                        'circle-radius': [
                            'coalesce',
                            ['get', 'radius'],
                            config.layers[key].radius || 8
                        ],
                        'circle-color': [
                            'coalesce',
                            ['get', 'display_color'],
                            config.layers[key].color
                        ],
                        'circle-opacity': config.layers[key].opacity,
                        'circle-opacity-transition': { duration: 200 },
                        'circle-color-transition': { duration: 200 }
                    }
                });
            } else {
                map.addLayer({
                    id: layer.id,
                    type: 'symbol',
                    source: layer.id,
                    layout: {
                        'icon-image': config.layers[key].iconImage,
                        'icon-size': config.layers[key].iconSize,
                        'icon-allow-overlap': true,
                        'text-field': ['get', 'emoji'],
                        'text-size': 16,
                        'text-offset': [0, 0.5],
                        'text-anchor': 'top'
                    },
                    paint: {
                        'icon-opacity': 1
                    }
                });
            }
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
        }
    }
});

// Layer toggle functionality
Object.entries(layers).forEach(([key, layer]) => {
    const checkbox = document.getElementById(layer.id);
    if (checkbox) {
        checkbox.addEventListener('change', (e) => {
            const visibility = e.target.checked ? 'visible' : 'none';
            if (map.getLayer(layer.id)) {
                map.setLayoutProperty(layer.id, 'visibility', visibility);
            }
        });
    }
});

// Popup handling
map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point);
    if (!features.length) return;

    const feature = features[0];
    const coordinates = feature.geometry.coordinates.slice();
    const properties = feature.properties;

    // Create popup content based on feature type
    let popupContent = '<div class="popup-content">';
    
    switch(properties.type) {
        case 'fan_wish':
            popupContent += `
                <h3>💌 Fan Wish</h3>
                <p>${properties.message}</p>
                <p>From: ${properties.fan_name || 'Anonymous'}</p>
                <p>Location: ${properties.city}, ${properties.country}</p>
                <p>Date: ${new Date(properties.timestamp).toLocaleDateString()}</p>
            `;
            break;
            
        case 'singer_activity':
            popupContent += `
                <h3>🎤 ${properties.title}</h3>
                <p>Venue: ${properties.venue}</p>
                <p>Location: ${properties.city}, ${properties.country}</p>
                <p>Date: ${properties.date}</p>
                <button class="view-details" onclick="showDetailPanel('activity', ${JSON.stringify(properties).replace(/"/g, '&quot;')})">View Details</button>
            `;
            break;
            
        case 'fan_meetup':
            popupContent += `
                <h3>🎉 ${properties.title}</h3>
                <p>${properties.notes}</p>
                <p>Location: ${properties.city}, ${properties.country}</p>
                <p>Date: ${properties.date}</p>
                <button class="view-details" onclick="showDetailPanel('meetup', ${JSON.stringify(properties).replace(/"/g, '&quot;')})">View Details</button>
            `;
            break;
    }
    
    popupContent += '</div>';

    new mapboxgl.Popup(config.popup)
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);
});

// Helper function to convert Google Drive URLs
function convertGoogleDriveUrl(url) {
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

// Detail panel functionality
function showDetailPanel(type, properties) {
    const panel = document.getElementById('detail-panel');
    const header = document.getElementById('detail-header');
    const carousel = document.getElementById('detail-carousel');
    const info = document.getElementById('detail-info');
    const links = document.getElementById('detail-links');

    // Clear previous content
    header.innerHTML = '';
    carousel.innerHTML = '';
    info.innerHTML = '';
    links.innerHTML = '';

    if (type === 'activity') {
        // Header
        header.innerHTML = `
            <h2>🎤 ${properties.title}</h2>
            <p>${properties.date}</p>
        `;

        // Info
        info.innerHTML = `
            <p><strong>Venue:</strong> ${properties.venue}</p>
            <p><strong>Location:</strong> ${properties.city}, ${properties.country}</p>
            ${properties.description ? `<p>${properties.description}</p>` : ''}
        `;

        // Links
        if (properties.link) {
            links.innerHTML = `
                <a href="${properties.link}" target="_blank">More Information</a>
            `;
        }
    } else if (type === 'meetup') {
        // Header
        header.innerHTML = `
            <h2>🎉 ${properties.title}</h2>
            <p>${properties.date}</p>
        `;

        // Carousel for media
        if (properties.media_urls) {
            // Ensure media_urls is an array
            const mediaUrls = Array.isArray(properties.media_urls) ? properties.media_urls : 
                            (typeof properties.media_urls === 'string' ? [properties.media_urls] : []);
            
            if (mediaUrls.length > 0) {
                const carouselContent = mediaUrls.map((url, index) => {
                    // Convert Google Drive URLs
                    const processedUrl = convertGoogleDriveUrl(url);
                    
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        // Extract video ID and create embed
                        const videoId = url.split('v=')[1] || url.split('/').pop();
                        return `
                            <div class="video-container">
                                <iframe src="https://www.youtube.com/embed/${videoId}" 
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen></iframe>
                            </div>
                        `;
                    } else if (url.includes('drive.google.com')) {
                        return `
                            <div class="video-container">
                                <iframe src="${processedUrl}"
                                        frameborder="0"
                                        allowfullscreen></iframe>
                            </div>
                        `;
                    } else {
                        return `<img src="${processedUrl}" alt="Meetup Photo ${index + 1}" class="${index === 0 ? 'active' : ''}">`;
                    }
                }).join('');

                carousel.innerHTML = carouselContent;

                // Add carousel navigation if there are multiple images
                if (mediaUrls.length > 1) {
                    const nav = document.createElement('div');
                    nav.className = 'carousel-nav';
                    nav.innerHTML = mediaUrls.map((_, index) => 
                        `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`
                    ).join('');
                    carousel.appendChild(nav);

                    // Add carousel navigation functionality
                    nav.addEventListener('click', (e) => {
                        if (e.target.classList.contains('carousel-dot')) {
                            const index = parseInt(e.target.dataset.index);
                            const images = carousel.querySelectorAll('img');
                            const dots = nav.querySelectorAll('.carousel-dot');
                            
                            images.forEach(img => img.classList.remove('active'));
                            dots.forEach(dot => dot.classList.remove('active'));
                            
                            images[index].classList.add('active');
                            e.target.classList.add('active');
                        }
                    });
                }
            }
        }

        // Info
        info.innerHTML = `
            <p><strong>Location:</strong> ${properties.city}, ${properties.country}</p>
            ${properties.notes ? `<p>${properties.notes}</p>` : ''}
        `;
    }

    // Show panel
    panel.classList.add('active');

    // Add close button functionality
    const closeBtn = panel.querySelector('.close-panel');
    closeBtn.onclick = () => panel.classList.remove('active');
}

// Close panel when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('detail-panel');
    const isClickInsidePanel = panel.contains(e.target);
    const isClickOnViewDetailsBtn = e.target.classList.contains('view-details');
    const isClickOnPopup = e.target.closest('.mapboxgl-popup');

    if (!isClickInsidePanel && !isClickOnViewDetailsBtn && !isClickOnPopup) {
        panel.classList.remove('active');
    }
}); 