import { baseUrl } from '../config.js';

export const fanWishesLayer = {
    id: 'fan-wishes',
    source: `${baseUrl}/data/fan_wishes.geojson`,
    type: 'circle',
    paint: {
        'circle-radius': [
            'coalesce',
            ['get', 'radius'],
            8
        ],
        'circle-color': '#87CEEB',
        'circle-opacity': 0.8,
        'circle-opacity-transition': { duration: 200 },
        'circle-color-transition': { duration: 200 }
    }
}; 