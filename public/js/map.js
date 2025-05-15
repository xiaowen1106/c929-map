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
                ${properties.link ? `<p><a href="${properties.link}" target="_blank">More Info</a></p>` : ''}
            `;
            break;
            
        case 'fan_meetup':
            popupContent += `
                <h3>🎉 ${properties.title}</h3>
                <p>${properties.notes}</p>
                <p>Location: ${properties.city}, ${properties.country}</p>
                <p>Date: ${properties.date}</p>
                ${properties.media_urls && properties.media_urls.length > 0 ? 
                    `<img src="${properties.media_urls[0]}" alt="Meetup Photo" style="max-width: 100%; margin-top: 10px;">` : 
                    ''}
            `;
            break;
    }
    
    popupContent += '</div>';

    new mapboxgl.Popup(config.popup)
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);
}); 