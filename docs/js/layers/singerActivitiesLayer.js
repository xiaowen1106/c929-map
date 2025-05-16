import { baseUrl } from '../config.js';

export const singerActivitiesLayer = {
    id: 'singer-activities',
    source: `${baseUrl}/data/singer_activities.geojson`,
    type: 'symbol',
    layout: {
        'icon-image': [
            'coalesce',
            ['get', 'icon_image'],
            `${baseUrl}/img/Pin_Default.png`
        ],
        'icon-size': 1.5,
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