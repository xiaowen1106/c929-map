export const config = {
    // Load Mapbox token from environment variable
    mapboxToken: 'pk.eyJ1IjoianVzdGFub3RoZXJtaSIsImEiOiJjbWFwMmU1ZnkwZHJ6MmxwdnloemZhY3I0In0.TiHvo3M3CHK0ciLiNC77iQ',
    
    // Video platform filtering based on geolocation
    videoFiltering: {
        enabled: true, // Enable/disable location-based video filtering
        strictMode: true, // If true, only show preferred platform. If false, show fallback platforms too
        defaultCountry: 'US', // Default country if geolocation fails
        geolocationTimeout: 5000 // Timeout for geolocation requests in milliseconds
    }
};

// Set baseUrl based on environment - empty string for localhost, production URL otherwise
export const baseUrl = ''; 