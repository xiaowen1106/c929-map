import { baseUrl } from '../config.js';

export const fanAlbumPhotosLayer = {
    id: 'fan-album-photos',
    source: `${baseUrl}/data/fan_album_photos.geojson`,
    type: 'symbol',
    layout: {
        'icon-image': [
            'coalesce',
            ['get', 'icon_image'],
            'meetup-15'
        ],
        'icon-size': 1.2,
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