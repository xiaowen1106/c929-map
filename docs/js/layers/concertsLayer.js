import { baseUrl } from '../config.js';

export const concertsLayer = {
    id: 'concerts',
    source: `${baseUrl}/data/concerts.geojson`,
    type: 'symbol',
    layout: {
        'icon-image': [
            'case',
            ['has', 'tour'], ['get', 'tour'],
            ['coalesce',
                ['get', 'icon_image'],
                'music-15'
            ]
        ],
        'icon-size': [
            'case',
            ['has', 'tour'], 0.03,
            1.2
        ],
        'icon-rotate': [
            'case',
            ['has', 'tour'], 180,
            0
        ],
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