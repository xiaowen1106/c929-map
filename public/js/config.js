const config = {
    // Replace this with your actual Mapbox access token from https://account.mapbox.com
    mapboxToken: 'pk.eyJ1IjoianVzdGFub3RoZXJtaSIsImEiOiJjbWFubWR5dXQwMGhrMm5vcHZ4ZzJ4c2I3In0.I6aVS_xznbRjFlFMsOnC_g',
    
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
    
    // GeoJSON data sources
    dataSources: {
        fanWishes: '/data/fan_wishes.geojson',
        singerActivities: '/data/singer_activities.geojson',
        fanMeetups: '/data/fan_meetups.geojson'
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