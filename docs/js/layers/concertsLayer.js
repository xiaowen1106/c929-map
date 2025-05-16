import { baseUrl } from '../config.js';

export const loadConcertImages = (map) => {
    // Load Concert4_SSD image
    const img1 = new Image();
    img1.src = 'img/Concert4_SSD.png';
    img1.onload = () => {
        map.addImage('img/Concert4_SSD.png', img1);
    };

    // Load Concert3_929hz image
    const img2 = new Image();
    img2.src = 'img/Concert3_929hz.png';
    img2.onload = () => {
        map.addImage('img/Concert3_929hz.png', img2);
    };
};

export const concertsLayer = {
    id: 'concerts',
    source: `${baseUrl}/data/concerts.geojson`,
    type: 'symbol',
    layout: {
        'icon-image': [
            'match',
            ['get', 'tour'],
            'SSD', 'img/Concert4_SSD.png',
            '929hz', 'img/Concert3_929hz.png',
            'meetup-15' // default fallback image
        ],
        'icon-size': 0.03,
        'icon-rotate': 180,
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