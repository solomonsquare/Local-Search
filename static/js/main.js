// Initialize map
mapboxgl.accessToken = window.MAPBOX_TOKEN;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-74.5, 40],
    zoom: 9
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

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 3) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const results = await searchLocation(query);
        displayResults(results);
    }, 300);
});

// Display search results
function displayResults(results) {
    resultsContainer.innerHTML = '';
    
    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'place-item';
        div.innerHTML = `
            <div class="place-name">${result.text}</div>
            <div class="place-type">${result.place_type.join(', ')}</div>
            <div class="place-details">${result.place_name}</div>
        `;
        
        div.addEventListener('click', () => {
            map.flyTo({
                center: result.center,
                zoom: 14
            });
            
            new mapboxgl.Marker()
                .setLngLat(result.center)
                .addTo(map);
        });
        
        resultsContainer.appendChild(div);
    });
} 