import { baseUrl } from '../config.js';

// Preloader class to manage resource loading during initial animation
class Preloader {
    constructor() {
        this.loadedResources = new Set();
        this.loadingPromises = [];
        this.cachedData = {}; // Cache for preloaded data
        this.criticalImages = [
            'img/929hz.png',           // 512x512px (432KB) - already optimized
            'img/MiStar_Icon.png',      // 64x64px (4KB) - resized from 1932x1933px
            'img/MiJie_circle.png',     // 64x64px (5KB) - resized from 2084x2084px
            'img/QuestionMark.png',     // 64x64px (5KB) - resized from 1827x1996px
            'img/Journey.png',          // 64x64px (8KB) - resized from 2088x2086px
            'img/star_normal.png',      // 45x45px (366B) - already optimized
            'img/star_highlighted.png', // 45x45px (393B) - already optimized
            'img/MiJie.png',            // 128x128px (10KB) - resized from 2084x2084px
            'img/MiJie_Highlight.png'  // 128x128px (12KB) - resized from 2084x2084px
        ];
        
        this.criticalDataFiles = [
            'data/flying_tracking.geojson',
            'data/us_states.geojson', 
            'data/ca_provinces.geojson',
            'data/fans_activities.geojson',
            'data/messages_geocoded.geojson',
            'data/929_venues.geojson',
            'data/bonus.geojson',
            'data/city_markers.geojson'
        ];
        
        this.concertDataFiles = [
            'data/new_york_concert.json',
            'data/seattle_concert.json',
            'data/toronto_concert.json',
            'data/las_vegas_concert.json',
            'data/kuala_lumpur_concert.json',
            'data/melbourne_concert.json',
            'data/sydney_concert.json',
            'data/london_concert.json'
        ];
        
        this.messageWallFiles = [
            'data/new_york_message_wall.json',
            'data/seattle_message_wall.json',
            'data/toronto_message_wall.json',
            'data/las_vegas_message_wall.json',
            'data/kuala_lumpur_message_wall.json',
            'data/melbourne_message_wall.json',
            'data/sydney_message_wall.json',
            'data/london_message_wall.json'
        ];
    }

    // Preload critical images
    preloadImages() {
        const imagePromises = this.criticalImages.map(src => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.loadedResources.add(src);
                    resolve(src);
                };
                img.onerror = () => {
                    console.warn(`Failed to preload image: ${src}`);
                    resolve(src);
                };
                img.src = `${baseUrl}/${src}`;
            });
        });
        
        this.loadingPromises.push(...imagePromises);
        return Promise.all(imagePromises);
    }

    // Preload critical data files
    preloadCriticalData() {
        const dataPromises = this.criticalDataFiles.map(async url => {
            try {
                const response = await fetch(`${baseUrl}/${url}`);
                if (response.ok) {
                    this.loadedResources.add(url);
                    const data = await response.json();
                    // Cache the data
                    this.cachedData[url] = data;
                    return data;
                } else {
                    console.warn(`Failed to preload data: ${url}`);
                    return null;
                }
            } catch (error) {
                console.warn(`Error preloading data ${url}:`, error);
                return null;
            }
        });
        
        this.loadingPromises.push(...dataPromises);
        return Promise.all(dataPromises);
    }

    // Preload concert data files (lower priority)
    preloadConcertData() {
        const concertPromises = this.concertDataFiles.map(async url => {
            try {
                const response = await fetch(`${baseUrl}/${url}`);
                if (response.ok) {
                    this.loadedResources.add(url);
                    const data = await response.json();
                    // Cache the data
                    this.cachedData[url] = data;
                    return data;
                } else {
                    console.warn(`Failed to preload concert data: ${url}`);
                    return null;
                }
            } catch (error) {
                console.warn(`Error preloading concert data ${url}:`, error);
                return null;
            }
        });
        
        this.loadingPromises.push(...concertPromises);
        return Promise.all(concertPromises);
    }

    // Preload message wall data files (lower priority)
    preloadMessageWallData() {
        const messagePromises = this.messageWallFiles.map(async url => {
            try {
                const response = await fetch(`${baseUrl}/${url}`);
                if (response.ok) {
                    this.loadedResources.add(url);
                    const data = await response.json();
                    // Cache the data
                    this.cachedData[url] = data;
                    return data;
                } else {
                    console.warn(`Failed to preload message wall data: ${url}`);
                    return null;
                }
            } catch (error) {
                console.warn(`Error preloading message wall data ${url}:`, error);
                return null;
            }
        });
        
        this.loadingPromises.push(...messagePromises);
        return Promise.all(messagePromises);
    }

    // Start preloading during animation
    startPreloading() {
        console.log('Starting resource preloading...');
        
        // Start with critical resources
        this.preloadImages();
        this.preloadCriticalData();
        
        // Add lower priority resources after a short delay
        setTimeout(() => {
            this.preloadConcertData();
            this.preloadMessageWallData();
        }, 500);
    }

    // Get loading progress
    getProgress() {
        const total = this.criticalImages.length + this.criticalDataFiles.length + 
                     this.concertDataFiles.length + this.messageWallFiles.length;
        const loaded = this.loadedResources.size;
        return {
            loaded,
            total,
            percentage: Math.round((loaded / total) * 100)
        };
    }

    // Check if a resource is already loaded
    isLoaded(resourcePath) {
        return this.loadedResources.has(resourcePath);
    }

    // Get preloaded data for a specific resource
    getPreloadedData(resourcePath) {
        if (this.loadedResources.has(resourcePath)) {
            // Return the cached data if available
            return this.cachedData ? this.cachedData[resourcePath] : null;
        }
        return null;
    }

    // Wait for all critical resources to load
    async waitForCriticalResources() {
        const criticalPromises = [
            ...this.criticalImages.map(src => `${baseUrl}/${src}`),
            ...this.criticalDataFiles.map(src => `${baseUrl}/${src}`)
        ];
        
        return Promise.all(criticalPromises);
    }
}

// Create global preloader instance
const preloader = new Preloader();
window.preloader = preloader;

export { preloader }; 