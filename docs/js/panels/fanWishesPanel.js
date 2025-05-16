export const fanWishesPanel = (properties) => {
    return {
        header: `
            <h2>💌 Fan Wish</h2>
            <p>${new Date(properties.timestamp).toLocaleDateString()}</p>
        `,
        info: `
            <p>${properties.message}</p>
            <p><strong>From:</strong> ${properties.fan_name || 'Anonymous'}</p>
            <p><strong>Location:</strong> ${properties.city}, ${properties.country}</p>
        `
    };
}; 