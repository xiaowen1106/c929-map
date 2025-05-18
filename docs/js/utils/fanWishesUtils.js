import { baseUrl } from '../config.js';

// Load all fan wishes data
export const loadFanWishesData = async () => {
    try {
        const response = await fetch(`${baseUrl}/data/fan_wishes.geojson`);
        const data = await response.json();
        window.fanWishesData = data.features;
        return data.features;
    } catch (error) {
        console.error('Error loading fan wishes data:', error);
        return [];
    }
};

// Handle fan wish selection
export const selectFanWish = (element) => {
    const timestamp = element.dataset.timestamp;
    const fanName = element.dataset.fanName;
    
    // Find the feature in the map
    const map = window.map;
    if (!map) return;

    const source = map.getSource('fan-wishes-source');
    if (!source) return;

    // Reset all points to default style
    map.setPaintProperty('fan-wishes', 'circle-color', '#87CEEB');
    map.setPaintProperty('fan-wishes', 'circle-radius', 8);

    const features = map.querySourceFeatures('fan-wishes-source');
    const selectedFeature = features.find(f => 
        f.properties.timestamp === timestamp && 
        f.properties.fan_name === fanName
    );

    if (selectedFeature) {
        // Update the selected point style
        map.setPaintProperty('fan-wishes', 'circle-color', [
            'case',
            ['all',
                ['==', ['get', 'timestamp'], timestamp],
                ['==', ['get', 'fan_name'], fanName]
            ],
            '#2196f3', // Selected point color
            '#87CEEB'  // Default color
        ]);

        map.setPaintProperty('fan-wishes', 'circle-radius', [
            'case',
            ['all',
                ['==', ['get', 'timestamp'], timestamp],
                ['==', ['get', 'fan_name'], fanName]
            ],
            12, // Selected point size
            8   // Default size
        ]);

        // Center the map on the selected feature
        map.flyTo({
            center: selectedFeature.geometry.coordinates,
            zoom: 10,
            duration: 1000
        });

        // Show the popup for the selected feature
        new mapboxgl.Popup()
            .setLngLat(selectedFeature.geometry.coordinates)
            .setHTML(`
                <div class="popup-content">
                    <h3>💌 Fan Wish</h3>
                    <p>${selectedFeature.properties.message}</p>
                    <p>From: ${selectedFeature.properties.fan_name || 'Anonymous'}</p>
                    <p>Location: ${selectedFeature.properties.city}, ${selectedFeature.properties.country}</p>
                    <p>Date: ${new Date(selectedFeature.properties.timestamp).toLocaleDateString()}</p>
                </div>
            `)
            .addTo(map);

        // Update all message cards
        document.querySelectorAll('.message-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.timestamp === timestamp && 
                card.dataset.fanName === fanName) {
                card.classList.add('selected');
                // Scroll the selected card into view
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }
}; 