import { baseUrl } from '../config.js';
import { loadFanWishesDataDirect, setFanWishesData, fanWishesUnclusteredLayer } from '../layers/fanWishesLayer.js';
import { loadFansActivitiesData, setFansActivitiesData } from '../layers/fansActivitiesLayer.js';
import { loadBonusData, setBonusData } from '../layers/bonusLayer.js';
import { loadCityMarkersData } from '../layers/fansActivitiesLayer.js';
import { loadCocoCheckinDataDirect, setCocoCheckinData, cocoCheckinUnclusteredLayer } from '../layers/cocoCheckinLayer.js';

// Generic layer loading function
export async function loadLayer(layer, map) {
    try {
        let data;
        
        // Check if we have preloaded data available
        const preloadedData = window.preloader && window.preloader.getPreloadedData ? 
            window.preloader.getPreloadedData(layer.source) : null;
        
        if (layer.id === 'fan-wishes') {
            // For fan wishes, load GeoJSON data with clustering
            if (preloadedData) {
                data = preloadedData;
                setFanWishesData(data.features);
            } else {
                await loadFanWishesDataDirect();
                data = {
                    type: 'FeatureCollection',
                    features: window.fanWishesData || []
                };
                // Store all fan wishes for navigation
                setFanWishesData(data.features);
            }
            
            // Add clustered source
            const sourceId = `${layer.id}-source`;
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: data,
                    cluster: true,
                    clusterMaxZoom: 8,  // Very aggressive - clustering stops at zoom level 10
                    clusterRadius: 30,   // Very small clusters that break apart quickly
                    clusterMinPoints: 3, // Cluster even 2 nearby points
                    maxzoom: 18
                });
            }
            
            // Add cluster layer
            const clusterLayerConfig = {
                ...layer,
                source: sourceId
            };
            delete clusterLayerConfig.source;
            clusterLayerConfig.source = sourceId;
            
            map.addLayer(clusterLayerConfig);
            
            // Add unclustered layer
            const unclusteredLayerConfig = {
                ...fanWishesUnclusteredLayer,
                source: sourceId
            };
            delete unclusteredLayerConfig.source;
            unclusteredLayerConfig.source = sourceId;
            
            map.addLayer(unclusteredLayerConfig);
            
            return; // Exit early since we handled the fan wishes layer specially
        } else if (layer.id === 'fans-activities') {
            // For fans activities, load GeoJSON data without clustering
            const features = await loadFansActivitiesData();
            data = {
                type: 'FeatureCollection',
                features: features || []
            };
            // Store all fans activities for navigation (data manager handles this efficiently)
            setFansActivitiesData(features);
            
            // Add simple source without clustering
            const sourceId = `${layer.id}-source`;
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: data
                });
            }
            
            // Add symbol layer for high zoom levels (MiJie icons) only
            const layerConfig = {
                ...layer,
                source: sourceId
            };
            delete layerConfig.source;
            layerConfig.source = sourceId;
            
            map.addLayer(layerConfig);
            
            return; // Exit early since we handled the fans activities layer specially
        } else if (layer.id === 'bonus') {
            // For bonus items, load GeoJSON data without clustering
            const features = await loadBonusData();
            data = {
                type: 'FeatureCollection',
                features: features || []
            };
            // Store all bonus items for navigation (data manager handles this efficiently)
            setBonusData(features);
            
            // Add simple source without clustering
            const sourceId = `${layer.id}-source`;
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: data
                });
            }
            
            // Add layer
            const layerConfig = {
                ...layer,
                source: sourceId
            };
            delete layerConfig.source;
            layerConfig.source = sourceId;
            
            map.addLayer(layerConfig);
            
            return; // Exit early since we handled the bonus layer specially
        } else if (layer.id === 'city-markers') {
            // For city markers, load GeoJSON data without clustering
            const geoJSON = await loadCityMarkersData();
            data = geoJSON;
            
            // Add simple source without clustering
            const sourceId = `${layer.id}-source`;
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: data
                });
            }
            
            // Add layer
            const layerConfig = {
                ...layer,
                source: sourceId
            };
            delete layerConfig.source;
            layerConfig.source = sourceId;
            
            map.addLayer(layerConfig);
            
            return; // Exit early since we handled the city markers layer specially
        } else if (layer.id === 'coco-checkin') {
            // For coco-checkin, load GeoJSON data with clustering
            if (preloadedData) {
                data = preloadedData;
                setCocoCheckinData(data.features);
            } else {
                await loadCocoCheckinDataDirect();
                data = {
                    type: 'FeatureCollection',
                    features: window.cocoCheckinData || []
                };
                // Store all coco-checkins for navigation
                setCocoCheckinData(data.features);
            }
            
            // Add clustered source
            const sourceId = `${layer.id}-source`;
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: data,
                    cluster: true,
                    clusterMaxZoom: 8,  // Very aggressive - clustering stops at zoom level 8
                    clusterRadius: 30,   // Very small clusters that break apart quickly
                    clusterMinPoints: 3, // Cluster even 3 nearby points
                    maxzoom: 18
                });
            }
            
            // Add cluster layer
            const clusterLayerConfig = {
                ...layer,
                source: sourceId
            };
            delete clusterLayerConfig.source;
            clusterLayerConfig.source = sourceId;
            
            map.addLayer(clusterLayerConfig);
            
            // Add unclustered layer
            const unclusteredLayerConfig = {
                ...cocoCheckinUnclusteredLayer,
                source: sourceId
            };
            delete unclusteredLayerConfig.source;
            unclusteredLayerConfig.source = sourceId;
            
            map.addLayer(unclusteredLayerConfig);
            
            return; // Exit early since we handled the coco-checkin layer specially
        } else if (layer.id === 'concerts') {
            // For concerts, load from GeoJSON file and initialize data manager
            const response = await fetch(layer.source);
            data = await response.json();
            
            // Initialize concert data manager for navigation
            if (window.concertDataManager && data.features) {
                window.concertDataManager.setData(data.features);
            }
        } else {
            // For other layers, load from GeoJSON file
            const response = await fetch(layer.source);
            data = await response.json();
        }
        
        const sourceId = `${layer.id}-source`;
        
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: data
            });
        }

        const layerConfig = {
            ...layer,
            source: sourceId
        };
        delete layerConfig.source;
        layerConfig.source = sourceId;

        map.addLayer(layerConfig);
    } catch (error) {
        console.error(`Error loading ${layer.id}:`, error);
    }
} 