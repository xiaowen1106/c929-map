import { baseUrl } from '../config.js';

export const loadSingerActivityImages = (map) => {
    // Load default image
    const img = new Image();
    img.src = 'img/Pin_Default.png';
    img.onload = () => {
        map.addImage('img/Pin_Default.png', img);
    };
};

export const singerActivitiesLayer = {
    id: 'singer-activities',
    source: `${baseUrl}/data/singer_activities.geojson`,
    type: 'symbol',
    layout: {
        'icon-image': [
            'coalesce',
            ['get', 'icon_image'],
            'img/Pin_Default.png'
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