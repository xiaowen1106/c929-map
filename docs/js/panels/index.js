import { fanWishesPanel } from './fanWishesPanel.js';
import { singerActivitiesPanel } from './singerActivitiesPanel.js';
import { fanMeetupsPanel } from './fanMeetupsPanel.js';
import { fanAlbumPhotosPanel } from './fanAlbumPhotosPanel.js';
import { concertsPanel } from './concertsPanel.js';

export const panelHandlers = {
    fan_wish: fanWishesPanel,
    singer_activity: singerActivitiesPanel,
    fan_meetup: fanMeetupsPanel,
    fan_album_photo: fanAlbumPhotosPanel,
    concert: concertsPanel
}; 