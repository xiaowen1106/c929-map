import { baseUrl } from '../config.js';

export const loadFanAlbumImages = (map) => {
    // Load album1_SDS image
    const img1 = new Image();
    img1.src = 'img/album1_SDS.png';
    img1.onload = () => {
        map.addImage('img/album1_SDS.png', img1);
    };

    // Load album2_Shenself image
    const img2 = new Image();
    img2.src = 'img/album2_Shenself.png';
    img2.onload = () => {
        map.addImage('img/album2_Shenself.png', img2);
    };
};

export const fanAlbumPhotosLayer = {
    id: 'fan-album-photos',
    source: `${baseUrl}/data/fan_album_photos.geojson`,
    type: 'symbol',
    layout: {
        'icon-image': [
            'match',
            ['get', 'album'],
            'shendeshen', 'img/album1_SDS.png',
            'shenself', 'img/album2_Shenself.png',
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