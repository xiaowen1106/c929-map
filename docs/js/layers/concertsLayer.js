import { baseUrl } from '../config.js';

export const concertsLayer = {
    id: 'concerts',
    source: `${baseUrl}/data/concerts.geojson`,
    type: 'symbol',
    layout: {
        'icon-image': ['get', 'tour'],
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