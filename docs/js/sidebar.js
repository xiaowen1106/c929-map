// Sidebar logic for toggle and layer selection
// Assumes window.map is available

document.addEventListener('DOMContentLoaded', () => {
    // Start collapsed immediately
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
    const LAYERS_DARK_ICON = 'img/layers-dark.png';
    const LAYERS_LIGHT_ICON = 'img/layers-light.png';

    let sidebarOpen = false;

    function setSidebar(open) {
        sidebarOpen = open;
        if (open) {
            sidebar.classList.remove('collapsed');
            sidebarToggleIcon.src = LAYERS_LIGHT_ICON;
        } else {
            sidebar.classList.add('collapsed');
            sidebarToggleIcon.src = LAYERS_DARK_ICON;
        }
    }

    // Ensure sidebar is collapsed on load
    setSidebar(false);

    sidebarToggleBtn.addEventListener('click', () => {
        setSidebar(!sidebarOpen);
    });

    // --- Layer Selection Logic ---
    document.querySelectorAll('.sidebar-item').forEach(item => {
        const layerId = item.getAttribute('data-layer');
        
        // Set initial state based on layer default visibility
        if (layerId === 'flying-tracking' || layerId === 'coco-checkin') {
            // Flying tracking and coco-checkin layers are hidden by default, so start inactive
            item.classList.add('inactive');
            item.classList.remove('active');
        } else {
            // All other layers are visible by default, so start active
            item.classList.add('active');
            item.classList.remove('inactive');
        }

        item.addEventListener('click', (e) => {
            e.preventDefault();
            const isActive = item.classList.contains('active');
            item.classList.toggle('active', !isActive);
            item.classList.toggle('inactive', isActive);

            const layerId = item.getAttribute('data-layer');
            const visibility = isActive ? 'none' : 'visible';
            if (window.map && window.map.getLayer(layerId)) {
                window.map.setLayoutProperty(layerId, 'visibility', visibility);
            }
            if (layerId === 'fan-wishes') {
                if (window.map && window.map.getLayer('fan-wishes-unclustered')) {
                    window.map.setLayoutProperty('fan-wishes-unclustered', 'visibility', visibility);
                }
            }
            if (layerId === 'coco-checkin') {
                if (window.map && window.map.getLayer('coco-checkin-unclustered')) {
                    window.map.setLayoutProperty('coco-checkin-unclustered', 'visibility', visibility);
                }
            }
            if (layerId === 'fans-activities') {
                if (window.map && window.map.getLayer('fans-activities')) {
                    window.map.setLayoutProperty('fans-activities', 'visibility', visibility);
                }
                if (window.map && window.map.getLayer('city-markers')) {
                    window.map.setLayoutProperty('city-markers', 'visibility', visibility);
                }
                if (window.map && window.map.getLayer('fans-activities-fill')) {
                    window.map.setLayoutProperty('fans-activities-fill', 'visibility', visibility);
                }
            }
            if (layerId === 'flying-tracking') {
                if (window.map && window.map.getLayer('flying-tracking')) {
                    window.map.setLayoutProperty('flying-tracking', 'visibility', visibility);
                }
            }
        });
    });
}); 