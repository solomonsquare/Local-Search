import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import LocationList from './components/LocationList';
import Search from './components/Search';

const App = () => {
  const [boundary, setBoundary] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  // Function to handle location selection
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  // Function to handle search
  const handleSearch = async (searchQuery, boundaryData) => {
    setLoading(true);
    setError(null);
    
    console.log('App - Search initiated with:', {
      query: searchQuery,
      hasBoundary: !!boundaryData,
      boundaryPoints: boundaryData?.length
    });
    
    setBoundary(boundaryData);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          boundary: boundaryData
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      // Handle both possible API response formats
      const locationData = data.locations || data;
      
      console.log('App - Search response:', {
        locationCount: locationData.length,
        hasBoundary: !!boundaryData,
        boundaryPoints: boundaryData?.length,
        firstLocation: locationData[0]
      });
      
      setLocations(locationData);
    } catch (err) {
      setError('Failed to fetch locations. Please try again.');
      console.error('App - Search error:', err);
      setLocations([]);
      setBoundary(null);
    } finally {
      setLoading(false);
    }
  };

  // Debug log when boundary or locations change
  useEffect(() => {
    console.log('App state updated:', {
      hasBoundary: !!boundary,
      boundaryPoints: boundary?.length,
      locationCount: locations.length
    });
  }, [boundary, locations]);

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="search-container">
          <Search onSearch={handleSearch} />
        </div>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : (
          <LocationList
            locations={locations}
            boundary={boundary}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
          />
        )}
      </div>
      <div className="map-container">
        <Map
          boundary={boundary}
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationSelect}
          mapboxToken={mapboxToken}
        />
      </div>

      <style jsx>{`
        .app-container {
          display: flex;
          height: 100vh;
          width: 100vw;
        }

        .sidebar {
          width: 380px;
          min-width: 380px;
          height: 100%;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #e5e7eb;
          background: white;
        }

        .search-container {
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .error-message {
          margin: 16px;
          padding: 12px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
        }

        .loading-state {
          padding: 24px;
          text-align: center;
          color: #6b7280;
        }

        .map-container {
          flex: 1;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default App; 