import { config, baseUrl } from './config.js';
// Import layer configurations
import { fanWishesLayer } from './layers/fanWishesLayer.js';
import { singerActivitiesLayer } from './layers/singerActivitiesLayer.js';
import { fanMeetupsLayer } from './layers/fanMeetupsLayer.js';
import { fanAlbumPhotosLayer } from './layers/fanAlbumPhotosLayer.js';
import { concertsLayer } from './layers/concertsLayer.js';
import { processMediaUrl } from './utils/mediaUtils.js';
import { panelHandlers } from './panels/index.js';

// Initialize Mapbox
mapboxgl.accessToken = config.mapboxToken;

// Map configuration
const mapConfig = {
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-98.5795, 39.8283],
    zoom: 3,
    minZoom: 2,
    maxZoom: 18
};

// Popup configuration
const popupConfig = {
    maxWidth: '300px',
    closeButton: true,
    closeOnClick: true
};

// Define tour icons
const tourIcons = {
    '929hz': 'Concert3_929hz.png',
    'SSD': 'Concert4_SSD.png'
};

const map = new mapboxgl.Map(mapConfig);

// Helper function to load a layer
async function loadLayer(layer) {
    try {
        const response = await fetch(layer.source);
        const data = await response.json();
        
        const sourceId = `${layer.id}-source`;
        
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: data
            });
        }

        const layerConfig = {
            ...layer,
            source: sourceId
        };
        delete layerConfig.source;
        layerConfig.source = sourceId;

        map.addLayer(layerConfig);
    } catch (error) {
        console.error(`Error loading ${layer.id}:`, error);
    }
}

// Add layers when map loads
map.on('style.load', async () => {
    // Load icons
    await Promise.all([
        ...Object.entries(tourIcons).map(([tour, iconFile]) => 
            new Promise(resolve => {
                if (map.hasImage(tour)) {
                    resolve();
                } else {
                    map.loadImage(`${baseUrl}/img/${iconFile}`, (error, image) => {
                        if (error) throw error;
                        map.addImage(tour, image);
                        resolve();
                    });
                }
            })
        )
    ]);

    // Load all layers
    await Promise.all([
        loadLayer(concertsLayer),
        loadLayer(fanWishesLayer),
        loadLayer(singerActivitiesLayer),
        loadLayer(fanMeetupsLayer),
        loadLayer(fanAlbumPhotosLayer)
    ]);
});

// Layer toggle functionality
const allLayers = {
    'fan-wishes': fanWishesLayer,
    'concerts': concertsLayer,
    'singer-activities': singerActivitiesLayer,
    'fan-meetups': fanMeetupsLayer,
    'fan-album-photos': fanAlbumPhotosLayer
};

Object.entries(allLayers).forEach(([id, layer]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
        checkbox.addEventListener('change', (e) => {
            const visibility = e.target.checked ? 'visible' : 'none';
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', visibility);
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
                <button class="view-details" onclick="showDetailPanel('${properties.type}', ${JSON.stringify(properties).replace(/"/g, '&quot;')})">View Details</button>
            `;
            break;
            
        case 'singer_activity':
        case 'fan_meetup':
        case 'fan_album_photo':
        case 'concert':
            popupContent += `
                <h3>${properties.type === 'singer_activity' ? '🎤' : 
                      properties.type === 'fan_meetup' ? '🎉' : 
                      properties.type === 'fan_album_photo' ? '📸' : '🎫'} ${properties.title}</h3>
                <p>Location: ${properties.city}, ${properties.country}</p>
                <p>Date: ${properties.date}</p>
                <button class="view-details" onclick="showDetailPanel('${properties.type}', ${JSON.stringify(properties).replace(/"/g, '&quot;')})">View Details</button>
            `;
            break;
    }
    
    popupContent += '</div>';

    new mapboxgl.Popup(popupConfig)
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);
});

// Detail panel functionality
window.showDetailPanel = function(type, properties) {
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

    // Get panel content from handler
    const handler = panelHandlers[type];
    if (!handler) return;

    const content = handler(properties);

    // Set content
    header.innerHTML = content.header;
    info.innerHTML = content.info;
    if (content.carousel) {
        carousel.innerHTML = content.carousel;

        // Add carousel navigation if there are multiple items
        if (content.mediaUrls && content.mediaUrls.length > 1) {
            const nav = document.createElement('div');
            nav.className = 'carousel-nav';
            nav.innerHTML = content.mediaUrls.map((_, index) => 
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
    if (content.links) {
        links.innerHTML = content.links;
    }

    // Show panel
    panel.classList.add('active');
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