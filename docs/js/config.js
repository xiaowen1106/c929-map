// Define tokens for different environments
const tokens = {
    localhost: 'pk.eyJ1IjoianVzdGFub3RoZXJtaSIsImEiOiJjbWQ4Znl0M2UwZm50MnFxMnZzNHdoaXd2In0.SSrE0vP6LzznWw_429_hCQ',
    production: 'pk.eyJ1IjoianVzdGFub3RoZXJtaSIsImEiOiJjbWQ4ZnkwdGwwdm1qMmtvazVpZ2NtMjJ5In0.__cF9qE9d-YyEblXZS4mgA'
};

// Determine which token to use based on current URL
const getMapboxToken = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return tokens.localhost;
    } else if (hostname === 'shenmi.world') {
        return tokens.production;
    } else {
        // Fallback to production token for any other domain
        return tokens.production;
    }
};

export const config = {
    // Version number
    version: 'v1.0.11',
    
    // Load Mapbox token based on current URL
    mapboxToken: getMapboxToken(),
    
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