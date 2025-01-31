// Initialize map with token from Flask
mapboxgl.accessToken = window.MAPBOX_TOKEN;

// Store selected locations and map state
let selectedLocations = [];
let boundaryLayer = null;
let markers = [];
let currentArea = null;

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-0.127758, 51.507351], // London
    zoom: 10
});

// Add navigation controls
map.addControl(new mapboxgl.NavigationControl());

// Search functionality
async function searchLocation(query) {
    try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Search failed');
        }
        
        return data.features;
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('error-message').textContent = 'Search failed. Please try again.';
        document.getElementById('error-message').style.display = 'block';
        return [];
    }
}

// Get directions
async function getDirections(coordinates) {
    try {
        const response = await fetch(`/api/directions?coordinates=${coordinates}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get directions');
        }
        
        return data;
    } catch (error) {
        console.error('Directions error:', error);
        document.getElementById('error-message').textContent = 'Failed to get directions. Please try again.';
        document.getElementById('error-message').style.display = 'block';
        return null;
    }
}

// Search input handler
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-container');
const exportContainer = document.getElementById('export-container');
const suggestionsContainer = document.getElementById('suggestions');

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 3) {
        resultsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const results = await searchLocation(query);
        showSuggestions(results);
    }, 300);
});

// Show search suggestions
function showSuggestions(results) {
    suggestionsContainer.innerHTML = '';
    
    if (!results || results.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <div class="suggestion-main">${result.text}</div>
            <div class="suggestion-secondary">${result.place_name}</div>
        `;
        
        div.addEventListener('click', () => {
            searchInput.value = result.place_name;
            suggestionsContainer.style.display = 'none';
            addLocation(result);
        });
        
        suggestionsContainer.appendChild(div);
    });
    
    suggestionsContainer.style.display = 'block';
}

// Category search function
async function searchCategory(category) {
    const query = `${category} in ${searchInput.value || 'current area'}`;
    searchInput.value = query;
    const results = await searchLocation(query);
    
    // Clear previous markers and boundary
    clearMap();
    
    // Process results
    if (results && results.length > 0) {
        // First result should be the area if it's a category search
        const areaResult = results[0];
        if (areaResult.geometry) {
            // Draw area boundary
            drawAreaBoundary(areaResult.geometry);
            currentArea = areaResult;
            
            // Add markers for places within the area
            results.slice(1).forEach(result => addLocation(result, false));
            
            // Fit map to area boundary
            if (areaResult.bbox) {
                map.fitBounds([
                    [areaResult.bbox[0], areaResult.bbox[1]],
                    [areaResult.bbox[2], areaResult.bbox[3]]
                ], { padding: 50 });
            }
        }
    }
    
    showSuggestions(results.slice(1)); // Don't show area in suggestions
}

// Clear map
function clearMap() {
    // Clear markers
    markers.forEach(marker => marker.remove());
    markers = [];
    
    // Clear boundary
    if (boundaryLayer) {
        map.removeLayer('boundary');
        map.removeSource('boundary');
        boundaryLayer = null;
    }
    
    // Clear area boundary
    if (map.getLayer('area-boundary')) {
        map.removeLayer('area-boundary');
        map.removeSource('area-boundary');
    }
    
    // Clear selected locations
    selectedLocations = [];
    resultsContainer.innerHTML = '';
    exportContainer.style.display = 'none';
}

// Draw area boundary
function drawAreaBoundary(geometry) {
    if (map.getLayer('area-boundary')) {
        map.removeLayer('area-boundary');
        map.removeSource('area-boundary');
    }
    
    map.addSource('area-boundary', {
        type: 'geojson',
        data: geometry
    });
    
    map.addLayer({
        id: 'area-boundary',
        type: 'line',
        source: 'area-boundary',
        layout: {},
        paint: {
            'line-color': '#2563eb',
            'line-width': 2
        }
    });
}

// Add location to the list and map
function addLocation(location, shouldFly = true) {
    if (!selectedLocations.some(loc => loc.id === location.id)) {
        selectedLocations.push(location);
        
        // Add marker with popup
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
                <strong>${location.text}</strong><br>
                ${location.place_name}
            `);
            
        const marker = new mapboxgl.Marker()
            .setLngLat(location.center)
            .setPopup(popup)
            .addTo(map);
        markers.push(marker);
        
        // Update boundary if not showing area boundary
        if (!currentArea) {
            updateBoundary();
        }
        
        // Show export button if we have locations
        if (selectedLocations.length > 0) {
            exportContainer.style.display = 'block';
        }

        // Add to results list
        const div = document.createElement('div');
        div.className = 'place-item';
        div.innerHTML = `
            <div class="place-name">${location.text}</div>
            <div class="place-type">${location.place_type.join(', ')}</div>
            <div class="place-details">${location.place_name}</div>
        `;
        resultsContainer.appendChild(div);
    }
    
    // Fly to the location if requested
    if (shouldFly) {
        map.flyTo({
            center: location.center,
            zoom: 14
        });
    }
}

// Update boundary box
function updateBoundary() {
    if (selectedLocations.length === 0) {
        if (boundaryLayer) {
            map.removeLayer('boundary');
            map.removeSource('boundary');
            boundaryLayer = null;
        }
        return;
    }

    const coordinates = selectedLocations.map(loc => loc.center);
    const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

    const boundaryGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [bounds.getWest(), bounds.getSouth()],
                [bounds.getEast(), bounds.getSouth()],
                [bounds.getEast(), bounds.getNorth()],
                [bounds.getWest(), bounds.getNorth()],
                [bounds.getWest(), bounds.getSouth()]
            ]]
        }
    };

    if (boundaryLayer) {
        map.removeLayer('boundary');
        map.removeSource('boundary');
    }

    map.addSource('boundary', {
        type: 'geojson',
        data: boundaryGeoJSON
    });

    map.addLayer({
        id: 'boundary',
        type: 'line',
        source: 'boundary',
        layout: {},
        paint: {
            'line-color': '#2563eb',
            'line-width': 2
        }
    });

    boundaryLayer = true;
    map.fitBounds(bounds, { padding: 50 });
}

// Export functionality
document.getElementById('export-button').addEventListener('click', () => {
    const locations = selectedLocations.map(loc => ({
        name: loc.text,
        type: loc.place_type[0],
        coordinates: loc.center,
        address: loc.place_name
    }));
    
    const blob = new Blob([JSON.stringify(locations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-locations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}); 