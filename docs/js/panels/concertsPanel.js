export const concertsPanel = (properties) => {
    return {
        header: `
            <h2>🎫 ${properties.title}</h2>
            <p>${properties.date}</p>
        `,
        info: `
            <p><strong>Location:</strong> ${properties.city}, ${properties.country}</p>
            ${properties.notes ? `<p>${properties.notes}</p>` : ''}
        `
    };
}; 