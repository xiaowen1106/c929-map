import { config } from '../config.js';

// Global variable to track if user is in China
export let userInChina = false;

// Function to detect if user is in China with multiple fallback methods
export async function detectUserLocation() {
    try {
        // Only care about mainland China
        const chinaMainland = 'CN';
        
        // Method 1: Try ipapi.co with timeout
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.videoFiltering.geolocationTimeout);
            
            const response = await fetch('https://ipapi.co/json/', {
                signal: controller.signal,
                mode: 'cors'
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data.country_code === chinaMainland) {
                    userInChina = true;
                    console.log('User detected in mainland China via ipapi.co:', data.country_code);
                    return;
                } else {
                    userInChina = false;
                    console.log('User detected outside mainland China via ipapi.co:', data.country_code);
                    return;
                }
            }
        } catch (error) {
            console.warn('ipapi.co failed, trying fallback method:', error.message);
        }
        
        // Method 2: Try ipinfo.io as fallback
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.videoFiltering.geolocationTimeout);
            
            const response = await fetch('https://ipinfo.io/json', {
                signal: controller.signal,
                mode: 'cors'
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data.country === chinaMainland) {
                    userInChina = true;
                    console.log('User detected in mainland China via ipinfo.io:', data.country);
                    return;
                } else {
                    userInChina = false;
                    console.log('User detected outside mainland China via ipinfo.io:', data.country);
                    return;
                }
            }
        } catch (error) {
            console.warn('ipinfo.io failed, trying browser geolocation:', error.message);
        }
        
        // Method 3: Try browser's built-in geolocation (requires user permission)
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => reject(new Error('Geolocation timeout')), config.videoFiltering.geolocationTimeout);
                    
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            clearTimeout(timeoutId);
                            resolve(pos);
                        },
                        (error) => {
                            clearTimeout(timeoutId);
                            reject(error);
                        },
                        { timeout: config.videoFiltering.geolocationTimeout }
                    );
                });
                
                // Use reverse geocoding to get country from coordinates
                const { latitude, longitude } = position.coords;
                const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.countryCode === chinaMainland) {
                        userInChina = true;
                        console.log('User detected in mainland China via browser geolocation:', data.countryCode);
                        return;
                    } else {
                        userInChina = false;
                        console.log('User detected outside mainland China via browser geolocation:', data.countryCode);
                        return;
                    }
                }
            } catch (error) {
                console.warn('Browser geolocation failed:', error.message);
            }
        }
        
        // Method 4: Use default based on config
        userInChina = config.videoFiltering.defaultCountry === 'CN';
        console.log(`All geolocation methods failed, using default: ${userInChina ? 'China' : 'Outside China'}`);
        
    } catch (error) {
        console.warn('Could not detect user location, using default:', error);
        userInChina = config.videoFiltering.defaultCountry === 'CN';
    }
}

// Initialize location detection when the module loads
// Use a small delay to ensure the module is fully loaded
setTimeout(() => {
    detectUserLocation();
}, 100);



// Async function to check if user is in China (for backward compatibility)
export async function isInChina() {
    if (!config.videoFiltering.enabled) {
        return false; // If filtering is disabled, treat as outside China
    }
    
    // If we already have the location detected, return it
    if (userInChina !== undefined) {
        return userInChina;
    }
    
    // Otherwise, try to detect location
    await detectUserLocation();
    return userInChina;
}

// Manually set user location (useful for testing or user override)
export function setUserLocation(inChina) {
    userInChina = inChina;
    console.log(`User location manually set to: ${inChina ? 'China' : 'Outside China'}`);
}

// Retry geolocation detection
export async function retryLocationDetection() {
    console.log('Retrying location detection...');
    await detectUserLocation();
    return userInChina;
}