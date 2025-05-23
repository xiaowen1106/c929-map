const config = {
    // Load Mapbox token from environment variable
    mapboxToken: 'pk.eyJ1IjoianVzdGFub3RoZXJtaSIsImEiOiJjbWFwMmU1ZnkwZHJ6MmxwdnloemZhY3I0In0.TiHvo3M3CHK0ciLiNC77iQ',
    
    // Map configuration
    map: {
        style: 'mapbox://styles/mapbox/light-v11',  // Light theme base map
        initialView: {
            center: [-98.5795, 39.8283],  // Centered on North America
            zoom: 3,
            minZoom: 2,
            maxZoom: 18
        }
    },
    
    // Layer styling
    layers: {
        fanWishes: {
            color: '#FF6B6B',
            radius: 8,
            opacity: 0.8,
            hoverOpacity: 1
        },
        singerActivities: {
            color: '#4ECDC4',
            iconSize: 1.5,
            iconImage: 'music-15'
        },
        fanMeetups: {
            color: '#45B7D1',
            iconSize: 1.2,
            iconImage: 'meetup-15'
        }
    },

    // Popup configuration
    popup: {
        maxWidth: '300px',
        closeButton: true,
        closeOnClick: true
    }
}; 