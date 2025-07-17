import { baseUrl } from '../config.js';

export const loadConcertImages = (map) => {
    // Load 929hz image for all concerts
    map.loadImage(`${baseUrl}/img/929hz.png`, (error, image) => {
        if (error) {
            console.error('Error loading concert image:', error);
            return;
        }
        
        if (!map.hasImage('img/929hz.png')) {
            map.addImage('img/929hz.png', image);
        }
    });
};

export const concertsLayer = {
    id: 'concerts',
    source: `${baseUrl}/data/929_venues.geojson`,
    type: 'symbol',
    layout: {
        'icon-image': 'img/929hz.png',
        'icon-size': 0.08,
        'icon-allow-overlap': true,
        'text-field': ['get', 'emoji'],
        'text-size': 16,
        'text-offset': [0, 0.5],
        'text-anchor': 'top'
    },
    paint: {
        'icon-opacity': 1
    }
}; 