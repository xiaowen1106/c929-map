import { processMediaUrl } from '../utils/mediaUtils.js';

export const fanMeetupsPanel = (properties) => {
    const mediaUrls = [];
    if (properties.media_url) mediaUrls.push(properties.media_url);
    if (properties.media_urls) {
        const urls = Array.isArray(properties.media_urls) ? properties.media_urls : 
                    (typeof properties.media_urls === 'string' ? [properties.media_urls] : []);
        mediaUrls.push(...urls);
    }

    return {
        header: `
            <h2>🎉 ${properties.title}</h2>
            <p>${properties.date}</p>
        `,
        carousel: mediaUrls.length > 0 ? mediaUrls.map((url, index) => processMediaUrl(url, index)).join('') : '',
        info: `
            <p><strong>Location:</strong> ${properties.city}, ${properties.country}</p>
            ${properties.notes ? `<p>${properties.notes}</p>` : ''}
        `,
        links: properties.link ? `<a href="${properties.link}" target="_blank">More Information</a>` : '',
        mediaUrls
    };
}; 